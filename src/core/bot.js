// สมองของบอท: รับ LINE event แล้วคืน array ของข้อความที่จะตอบ (ไม่ผูกกับ LINE API โดยตรง)
import { parseEntries, looksLikeEntry } from './parser.js';
import { CATEGORIES, getCategory, guessCategory } from './categories.js';
import { guessAccount, guessProvider, accountTotals, PROVIDER_MAP } from './accounts.js';
import { todayStr, rangeFor, shiftCycle, timeStr } from './dates.js';
import { money } from './format.js';
import * as ops from './ops.js';
import * as ui from './flex.js';

const norm = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase();

const SUMMARY_WORDS = {
  today: ['สรุป', 'สรุปวันนี้', 'วันนี้', 'ยอดวันนี้', 'today'],
  yesterday: ['สรุปเมื่อวาน', 'เมื่อวาน'],
  week: ['สรุปสัปดาห์', 'สรุปสัปดาห์นี้', 'สัปดาห์นี้', 'อาทิตย์นี้', 'week'],
  month: ['สรุปเดือน', 'สรุปเดือนนี้', 'เดือนนี้', 'ยอดเดือนนี้', 'month', 'คงเหลือ', 'ยอดคงเหลือ'],
  lastmonth: ['สรุปเดือนที่แล้ว', 'เดือนที่แล้ว', 'เดือนก่อน'],
};

/**
 * deps:
 *   store: { get(userId) -> user|null, save(user) }
 *   ai?: { readSlip(img, today), parseText(text, today), readStatement(pdf, today) }  (ใช้ Claude ถ้ามี API key)
 *   getImage?: (event) -> { data: base64, bytes?: Uint8Array, mediaType }  (รูป/ไฟล์/เสียงจาก LINE)
 *   transcribe?: (event) -> string  แปลงข้อความเสียงเป็นตัวอักษร
 *   files?: { put(key, bytes, contentType), deletePrefix?(prefix) }  เก็บรูปสลิป/ใบเสร็จเป็นหลักฐาน
 *   store.delete?(id)  ใช้ตอนผู้ใช้สั่งลบบัญชี
 *   getMemberName?: (source) -> string  ชื่อสมาชิกในกลุ่ม
 *   getGroupName?: (groupId) -> string
 *   getProfile?: (userId) -> { name, pictureUrl }
 *   links: { dashboard(userId), export(userId), view?(name), edit?(txId) }  (view/edit = หน้าเฉพาะใน LIFF)
 *   moods?: {idle,calm,ok,dizzy,spin}  รูปนายหัวหมุนตามอารมณ์งบ
 *   iconUrl?: (key) -> string  รูปไอคอนธนาคาร/ประเภทบัญชี (PNG) สำหรับการ์ดในแชท
 *   logoUrl?: string
 *   now?: () => Date
 */
export function createBot(deps) {
  const now = () => (deps.now ? deps.now() : new Date());

  /** โหลดสมุดบัญชี: id ของผู้ใช้ (U...) หรือของกลุ่ม (C.../R...) */
  async function loadUser(userId) {
    let user = await deps.store.get(userId);
    if (!user) {
      let profile = {};
      try {
        if (/^[CR]/.test(userId)) profile = { name: (await deps.getGroupName?.(userId)) || 'กลุ่มหมุนตังค์' };
        else profile = (await deps.getProfile?.(userId)) || {};
      } catch {
        /* ไม่มีโปรไฟล์ก็ไม่เป็นไร */
      }
      user = ops.newUser(userId, profile);
      if (/^[CR]/.test(userId)) user.isGroup = true;
    }
    return ops.normalizeUser(user);
  }

  function ctxFor(user) {
    return {
      logoUrl: deps.logoUrl,
      moods: deps.moods,
      iconUrl: deps.iconUrl,
      accounts: ops.accountList(user, now()),
      links: {
        dashboard: deps.links?.dashboard?.(user.id),
        export: deps.links?.export?.(user.id),
        view: deps.links?.view,
        edit: deps.links?.edit,
      },
    };
  }

  function recordedInfo(user) {
    const n = now();
    return {
      today: todayStr(n),
      todayExpense: ops.summaryFor(user, 'today', n).expense,
      budget: ops.budgetStatus(user, n),
      streak: ops.streak(user, n),
      catStatus: ops.catStatusMap(user, n),
      cycleStartDay: user.settings.cycleStartDay,
      accounts: ops.accountList(user, n),
      defaultWallet: user.settings.defaultWallet,
    };
  }

  /** การ์ด "เก่งมาก! จดมา N วัน" ส่งวันละครั้งเมื่อจดต่อเนื่องตั้งแต่ 2 วัน */
  function streakCard(user, ctx) {
    const n = ops.streak(user, now());
    const today = todayStr(now());
    if (n < 2 || user.settings.lastStreakCard === today) return [];
    user.settings.lastStreakCard = today;
    return [ui.streakMessage(n, ops.tierFor(n), ctx)];
  }

  function afterRecord(user, txs, ctx) {
    const out = [ui.recordedMessage(txs, recordedInfo(user), ctx)];
    const alerts = ops.budgetAlerts(user, now());
    if (alerts.length) out.push(ui.alertMessage(alerts));
    out.push(...streakCard(user, ctx));
    return out;
  }

  // ---------------- กระเป๋าเงิน: บัญชี / บัตร / โอน ----------------
  const ACCOUNT_WORDS = ['บัญชี', 'บัญชีของฉัน', 'บัญชีทั้งหมด', 'กระเป๋า', 'กระเป๋าเงิน', 'ยอดเงิน', 'เงินในบัญชี', 'ยอดในบัญชี', 'บัตร', 'บัตรเครดิต', 'วงเงิน', 'หนี้', 'หนี้สิน', 'ค้างรับ', 'ความมั่งคั่ง', 'ความมั่งคั่งสุทธิ', 'wallet', 'accounts'];
  const HEALTH_WORDS = ['สุขภาพการเงิน', 'คะแนนการเงิน', 'เช็คสุขภาพการเงิน', 'คะแนนสุขภาพการเงิน', 'health'];
  const AMT = '([\\d,]+(?:\\.\\d+)?)\\s*(k|พัน)?';
  const num = (v, k) => Number(String(v).replace(/,/g, '')) * (k ? 1000 : 1);

  function accountsReply(user, ctx, note) {
    const list = ops.accountList(user, now());
    const out = [ui.accountsMessage(list, accountTotals(list), { ...ctx, accounts: list })];
    return note ? [ui.textMsg(note), ...out] : out;
  }

  /** คำสั่งเกี่ยวกับบัญชี คืน null ถ้าไม่ใช่ (ให้ไปจดรายการตามปกติ) */
  function handleAccounts(user, raw, t, ctx) {
    if (ACCOUNT_WORDS.includes(t)) return accountsReply(user, ctx);
    if (HEALTH_WORDS.includes(t)) return [ui.healthMessage(ops.insightsFor(user, now()), ctx)];
    const find = (s, o) => (s ? guessAccount(s, user.accounts, { strict: true, ...o }) : null);
    const accName = (id) => ops.accountName(user, id);
    const line = raw.trim().replace(/\s+/g, ' ');

    // เพิ่มบัญชี / เพิ่มบัตร / เพิ่มวอลเล็ท
    let m = line.match(/^เพิ่ม\s*(บัญชี|บัตรเครดิต|บัตร|วอลเล็ท|วอลเลท|wallet|e-?wallet|อีวอลเล็ท|กระเป๋า|หนี้สิน|หนี้|ค้างรับ|ลูกหนี้)\s*(.*)$/i);
    if (m) {
      const kind = /บัตร/.test(m[1]) ? 'card' : /บัญชี/.test(m[1]) ? 'bank' : /กระเป๋า/.test(m[1]) ? null : /^หนี้/.test(m[1]) ? 'loan' : /ค้างรับ|ลูกหนี้/.test(m[1]) ? 'receivable' : 'ewallet';
      let rest = m[2];
      const pay = rest.match(new RegExp(`(?:ผ่อน|งวดละ|ค่างวด)\\s*${AMT}`, 'i'));
      const rate = rest.match(/ดอก(?:เบี้ย)?\s*([\d.]+)\s*%?/);
      rest = rest.replace(pay?.[0] || '\u0000', ' ').replace(rate?.[0] || '\u0000', ' ');
      const lim = rest.match(new RegExp(`วงเงิน\\s*${AMT}`, 'i'));
      const used = rest.match(new RegExp(`(?:ใช้ไป|ค้าง(?:จ่าย)?|ยอดค้าง)\\s*${AMT}`, 'i'));
      rest = rest.replace(lim?.[0] || '\u0000', ' ').replace(used?.[0] || '\u0000', ' ');
      const bal = rest.match(new RegExp(`(?:ยอด|มี|เหลือ)?\\s*${AMT}\\s*(?:บาท)?\\s*$`, 'i'));
      if (bal) rest = rest.slice(0, bal.index);
      const name = rest.trim();
      const prov = guessProvider(name, kind);
      const type = kind || (prov && PROVIDER_MAP[prov].types[0]) || 'bank';
      if (!name) return [ui.addAccountHelp(type, ctx)];
      if (['loan', 'receivable'].includes(type) && user.accounts.some((x) => !x.archived && x.type === type && x.name === name)) {
        return [ui.textMsg(`มี "${name}" อยู่แล้ว ถ้าจะแก้ยอดพิมพ์ "ยอด ${name} <ยอดใหม่>"`)];
      }
      const a = ops.addAccount(user, {
        type: kind === 'bank' && prov && PROVIDER_MAP[prov].types[0] === 'ewallet' ? 'ewallet' : type,
        name,
        limit: lim ? num(lim[1], lim[2]) : undefined,
        balance: type === 'card' ? (used ? num(used[1], used[2]) : 0) : bal ? num(bal[1], bal[2]) : used ? num(used[1], used[2]) : 0,
        ...(type === 'loan' ? { monthlyPayment: pay ? num(pay[1], pay[2]) : 0, rate: rate ? Number(rate[1]) : 0 } : {}),
      }, now());
      const w = ops.accountList(user, now()).find((x) => x.id === a.id);
      const tip =
        w.type === 'loan'
          ? `จ่ายงวดพิมพ์ "จ่ายหนี้ ${w.name}${w.monthlyPayment ? '' : ' 3000'}"`
          : w.type === 'receivable'
            ? `ได้คืนพิมพ์ "รับคืน ${w.name} <ยอด>"`
            : `จดรายการแล้วใส่ชื่อ "${w.name}" ต่อท้าย เช่น "ข้าว 50 ${w.name}" จะตัดจากบัญชีนี้ให้`;
      return accountsReply(user, ctx, `✅ เพิ่ม ${w.emoji} ${w.name} แล้ว\n${ui.balanceText(w)}\n${tip}`);
    }

    // ตั้งยอด: "ยอด กสิกร 12000"
    m = line.match(new RegExp(`^(?:ตั้งยอด|ยอด|ยอดเงิน|ยอดคงเหลือ)\\s*(.+?)\\s+(-?)${AMT}\\s*(?:บาท)?$`, 'i'));
    if (m) {
      const hit = find(m[1]);
      if (hit) {
        ops.setBalance(user, hit.id, num(m[3], m[4]) * (m[2] ? -1 : 1), now());
        const w = ops.accountList(user, now()).find((x) => x.id === hit.id);
        return accountsReply(user, ctx, `✅ ตั้งยอด ${w.emoji} ${w.name} แล้ว\n${ui.balanceText(w)}`);
      }
      return [ui.textMsg(`ไม่เจอบัญชี "${m[1]}" 🤔 พิมพ์ "บัญชี" เพื่อดูชื่อบัญชีทั้งหมด หรือ "เพิ่มบัญชี ${m[1]} ${m[3]}" เพื่อสร้างใหม่`)];
    }

    // จ่ายบัตร: "จ่ายบัตร ktc 3000 จาก กสิกร" (ไม่ใส่ยอด = จ่ายเต็ม)
    m = line.match(new RegExp(`^(?:จ่ายบัตร(?:เครดิต)?|ชำระบัตร(?:เครดิต)?|โปะบัตร)\\s*(.*?)\\s*(?:${AMT})?\\s*(?:บาท)?\\s*(?:จาก\\s*(.+))?$`, 'i'));
    if (m) {
      const cards = user.accounts.filter((a) => a.type === 'card' && !a.archived);
      const card = (m[1] && cards.find((a) => a.id === find(m[1])?.id)) || (cards.length === 1 ? cards[0] : null);
      if (!card) return [ui.textMsg(cards.length ? `จ่ายบัตรใบไหน? เช่น "จ่ายบัตร ${cards[0].name} 3000"` : 'ยังไม่มีบัตรเครดิต เพิ่มก่อนด้วย "เพิ่มบัตร KTC วงเงิน 20000"')];
      // จ่ายบัตรมักจ่ายจากบัญชีธนาคาร: ใช้บัญชีเริ่มต้นถ้าเป็นธนาคาร ไม่งั้นบัญชีธนาคารแรก
      const def = user.accounts.find((a) => a.id === user.settings.defaultWallet && a.type === 'bank' && !a.archived);
      const from = find(m[4])?.id || def?.id || user.accounts.find((a) => a.type === 'bank' && !a.archived)?.id;
      if (!from || from === card.id) return [ui.textMsg('จ่ายจากบัญชีไหน? เช่น "จ่ายบัตร 3000 จาก กสิกร"')];
      const cur = ops.accountList(user, now()).find((x) => x.id === card.id);
      const amount = m[2] ? num(m[2], m[3]) : cur.known ? cur.used : 0;
      if (!(amount > 0)) return [ui.textMsg(`ใส่ยอดที่จ่ายด้วยนะ เช่น "จ่ายบัตร ${card.name} 3000"`)];
      ops.addTransfer(user, { from, to: card.id, amount }, now());
      return accountsReply(user, ctx, `💳 จ่ายบัตร ${accName(card.id)} ${money(amount)} จาก ${accName(from)} แล้ว\n(ไม่นับเป็นรายจ่ายซ้ำ เพราะตอนรูดจดไปแล้ว)`);
    }

    // กดเงินสด: "กดเงิน 2000 กสิกร"
    m = line.match(new RegExp(`^(?:กดเงิน(?:สด)?|ถอนเงิน(?:สด)?|กด\\s*atm|atm)\\s*(.*?)\\s*${AMT}\\s*(?:บาท)?\\s*(.*)$`, 'i'));
    if (m) {
      const cash = user.accounts.find((a) => a.type === 'cash' && !a.archived);
      const from = find(`${m[1]} ${m[4]}`)?.id || user.accounts.find((a) => a.type === 'bank' && !a.archived)?.id;
      if (cash && from && from !== cash.id) {
        const amount = num(m[2], m[3]);
        ops.addTransfer(user, { from, to: cash.id, amount, note: 'กดเงินสด' }, now());
        return accountsReply(user, ctx, `🏧 กดเงินสด ${money(amount)} จาก ${accName(from)} แล้ว`);
      }
    }

    // โอนระหว่างบัญชี: "โอน 500 กสิกร ไป ทรู", "โอนจาก scb ไป กสิกร 2000", "เติมทรู 500"
    m =
      line.match(new RegExp(`^(?:โอน(?:เงิน)?|ย้ายเงิน|เติมเงิน|เติม)\\s*${AMT}\\s*(?:บาท)?\\s*(?:จาก\\s*)?(.+?)\\s*(?:ไป|เข้า|→|->)\\s*(.+)$`, 'i'))?.slice(1, 5) ||
      (() => {
        const x = line.match(new RegExp(`^(?:โอน(?:เงิน)?|ย้ายเงิน|เติมเงิน|เติม)\\s*(?:จาก\\s*)?(.+?)\\s*(?:ไป|เข้า|→|->)\\s*(.+?)\\s+${AMT}\\s*(?:บาท)?$`, 'i'));
        return x ? [x[3], x[4], x[1], x[2]] : null;
      })();
    if (m) {
      const from = find(m[2]);
      const to = find(m[3]);
      if (from && to && from.id !== to.id) {
        const amount = num(m[0], m[1]);
        ops.addTransfer(user, { from: from.id, to: to.id, amount }, now());
        return accountsReply(user, ctx, `🔁 โอน ${money(amount)} จาก ${accName(from.id)} ไป ${accName(to.id)} แล้ว\n(ย้ายเงินระหว่างบัญชี ไม่นับเป็นรายรับรายจ่าย)`);
      }
    }
    // เติม e-Wallet: "เติมทรู 500" / "เติม truemoney 500 จาก กสิกร"
    m = line.match(new RegExp(`^เติม(?:เงิน)?\\s*(.+?)\\s*${AMT}\\s*(?:บาท)?(?:\\s*จาก\\s*(.+))?$`, 'i'));
    if (m) {
      const to = find(m[1]);
      if (to && to.id) {
        const toAcc = user.accounts.find((a) => a.id === to.id);
        if (toAcc.type === 'ewallet') {
          const def = user.accounts.find((a) => a.id === user.settings.defaultWallet && ['bank', 'ewallet'].includes(a.type) && a.id !== to.id);
          const from = find(m[4])?.id || def?.id || user.accounts.find((a) => a.type === 'bank' && !a.archived)?.id;
          if (from && from !== to.id) {
            const amount = num(m[2], m[3]);
            ops.addTransfer(user, { from, to: to.id, amount }, now());
            return accountsReply(user, ctx, `📱 เติม ${accName(to.id)} ${money(amount)} จาก ${accName(from)} แล้ว`);
          }
        }
      }
    }
    // หนี้สิน / ค้างรับ
    // บัญชีที่เงินเข้า/ออก: ที่พิมพ์มา > บัญชีเริ่มต้น (preferBank = จ่ายหนี้มักจ่ายจากธนาคาร)
    const spendFrom = (text, preferBank = false) => {
      const hit = find(text, { types: ['cash', 'bank', 'ewallet'] });
      if (hit) return hit.id;
      const live = user.accounts.filter((a) => !a.archived);
      const def = live.find((a) => a.id === user.settings.defaultWallet && (preferBank ? ['bank', 'ewallet'] : ['cash', 'bank', 'ewallet']).includes(a.type));
      return def?.id || live.find((a) => a.type === 'bank')?.id || live.find((a) => a.type === 'cash')?.id;
    };
    const namedOf = (type, name) => find(name, { types: [type] }) || (user.accounts.find((a) => !a.archived && a.type === type && a.name === name.trim()) ? { id: user.accounts.find((a) => !a.archived && a.type === type && a.name === name.trim()).id } : null);
    // ยืมเงิน: "ยืม แม่ 5000 เข้า กสิกร" → หนี้ "แม่" เพิ่ม, เงินเข้าบัญชี
    m = line.match(new RegExp(`^ยืม(?:เงิน)?\\s*(.+?)\\s*${AMT}\\s*(?:บาท)?(?:\\s*(?:เข้า|ใส่)\\s*(.+))?$`, 'i'));
    if (m) {
      const name = m[1].replace(/^จาก\s*/, '').trim();
      const amount = num(m[2], m[3]);
      const to = spendFrom(m[4]);
      let loan = namedOf('loan', name);
      if (!loan) loan = ops.addAccount(user, { type: 'loan', name, balance: 0, principal: amount }, now());
      ops.addTransfer(user, { from: loan.id, to, amount }, now());
      return accountsReply(user, ctx, `🧾 ยืม ${accName(loan.id)} ${money(amount)} เข้า ${accName(to)} แล้ว\nคืนเมื่อไรพิมพ์ "จ่ายหนี้ ${accName(loan.id)} ${amount}"`);
    }
    // จ่ายหนี้: "จ่ายหนี้ ผ่อนรถ 6500 จาก กสิกร" (ไม่ใส่ยอด = ค่างวด)
    m = line.match(new RegExp(`^(?:จ่ายหนี้|ชำระหนี้|คืนเงิน|คืนหนี้|ผ่อน|จ่ายงวด)\\s*(.+?)\\s*(?:${AMT})?\\s*(?:บาท)?(?:\\s*จาก\\s*(.+))?$`, 'i'));
    if (m) {
      // ชื่อหนี้อาจขึ้นต้นด้วยคำสั่งเอง เช่น หนี้ชื่อ "ผ่อนบ้าน" + พิมพ์ "ผ่อนบ้าน 8000"
      const loan = namedOf('loan', m[1]) || find(line.replace(/จาก.*$/, ''), { types: ['loan'] });
      if (loan) {
        const acc = user.accounts.find((a) => a.id === loan.id);
        const amount = m[2] ? num(m[2], m[3]) : acc.monthlyPayment || 0;
        if (!(amount > 0)) return [ui.textMsg(`ใส่ยอดที่จ่ายด้วยนะ เช่น "จ่ายหนี้ ${acc.name} 3000"`)];
        const from = spendFrom(m[4], true);
        ops.addTransfer(user, { from, to: loan.id, amount }, now());
        const w = ops.accountList(user, now()).find((x) => x.id === loan.id);
        return accountsReply(user, ctx, `✅ จ่ายหนี้ ${w.name} ${money(amount)} จาก ${accName(from)} แล้ว\nคงเหลือ ${money(w.used)}${w.monthsLeft ? ` · อีก ${w.monthsLeft} งวด` : w.used <= 0 ? ' 🎉 ปลดหนี้แล้ว!' : ''}`);
      }
    }
    // ให้ยืม: "ให้ยืม ต้น 500" / "ให้ ต้น ยืม 500"
    m = line.match(new RegExp(`^ให้ยืม(?:เงิน)?\\s*(.+?)\\s*${AMT}\\s*(?:บาท)?(?:\\s*จาก\\s*(.+))?$`, 'i')) || line.match(new RegExp(`^ให้\\s*(.+?)\\s*ยืม(?:เงิน)?\\s*${AMT}\\s*(?:บาท)?(?:\\s*จาก\\s*(.+))?$`, 'i'));
    if (m) {
      const name = m[1].trim();
      const amount = num(m[2], m[3]);
      const from = spendFrom(m[4]);
      let rec = namedOf('receivable', name);
      if (!rec) rec = ops.addAccount(user, { type: 'receivable', name, balance: 0 }, now());
      ops.addTransfer(user, { from, to: rec.id, amount }, now());
      return accountsReply(user, ctx, `🤝 ให้ ${accName(rec.id)} ยืม ${money(amount)} จาก ${accName(from)} แล้ว\nได้คืนเมื่อไรพิมพ์ "รับคืน ${accName(rec.id)} ${amount}"`);
    }
    // ได้เงินคืน: "รับคืน ต้น 500 เข้า กสิกร" / "ต้น คืน 500"
    m = line.match(new RegExp(`^(?:รับคืน|ได้คืน|ได้เงินคืน)\\s*(?:จาก\\s*)?(.+?)\\s*${AMT}\\s*(?:บาท)?(?:\\s*เข้า\\s*(.+))?$`, 'i')) || line.match(new RegExp(`^(.+?)\\s*คืน(?:เงิน)?\\s*${AMT}\\s*(?:บาท)?(?:\\s*เข้า\\s*(.+))?$`, 'i'));
    if (m) {
      const rec = namedOf('receivable', m[1]);
      if (rec) {
        const amount = num(m[2], m[3]);
        const to = spendFrom(m[4]);
        ops.addTransfer(user, { from: rec.id, to, amount }, now());
        const w = ops.accountList(user, now()).find((x) => x.id === rec.id);
        return accountsReply(user, ctx, `💚 ${w.name} คืน ${money(amount)} เข้า ${accName(to)} แล้ว${w.balance > 0 ? `\nยังค้างอีก ${money(w.balance)}` : '\nคืนครบแล้ว 🎉'}`);
      }
    }
    return null;
  }

  // ---------------- text commands ----------------
  async function handleText(user, raw, sess = {}) {
    const ctx = ctxFor(user);
    const t = norm(raw);
    const by = sess.by ? { by: sess.by } : {};

    if (['ตั้งค่า', 'ตั้งค่าเริ่มต้น', 'setup'].includes(t)) return [ui.setupMessage('cycle', user)];
    if (['จด', 'จดรายการ', 'จดรายรับรายจ่าย', 'บันทึก'].includes(t)) return [ui.recordPromptMessage()];
    if (['ลบข้อมูล', 'ลบข้อมูลทั้งหมด', 'ล้างข้อมูล', 'ลบบัญชี', 'ลบทั้งหมด', 'delete my data'].includes(t)) {
      if (sess.isGroup) return [ui.textMsg('การลบข้อมูลของกลุ่มทำได้จากแดชบอร์ดของกลุ่ม (หน้า ตั้งค่า) เพื่อกันการกดพลาดในแชทกลุ่มนะ')];
      return [ui.wipeConfirmMessage(user.txs.length, Date.now())];
    }
    if (['วิเคราะห์', 'analysis'].includes(t)) {
      const link = ctx.links.view ? ctx.links.view('analysis') : ctx.links.dashboard;
      return [ui.textMsg(link ? `🔍 ดูการวิเคราะห์การใช้เงินของคุณ\n${link}` : 'ยังไม่ได้ตั้งค่าแดชบอร์ด')];
    }
    let m = t.match(/^(?:รอบบัญชี|รอบงบ|เริ่มงบ(?:วันที่)?|วันเงินเดือนออก|เงินเดือนออก(?:วันที่)?)\s*(?:วันที่)?\s*(\d{1,2})?$/);
    if (m) {
      if (!m[1]) return [ui.setupMessage('cycle', user)];
      user.settings.cycleStartDay = Math.min(31, Math.max(1, Number(m[1])));
      const c = rangeFor('month', now(), user.settings.cycleStartDay);
      return [ui.textMsg(`📅 ตั้งรอบบัญชีเริ่มทุกวันที่ ${user.settings.cycleStartDay} แล้ว\nรอบนี้: ${c.label}\nสรุปเดือน งบ และรายงานประจำเดือนจะนับตามรอบนี้`)];
    }
    if (['ปิดรายงาน', 'ปิดรายงานประจำเดือน'].includes(t)) {
      user.settings.monthlyReport = false;
      return [ui.textMsg('ปิดรายงานสรุปประจำเดือนอัตโนมัติแล้ว')];
    }
    if (['เปิดรายงาน', 'เปิดรายงานประจำเดือน', 'รายงานประจำเดือน'].includes(t)) {
      user.settings.monthlyReport = true;
      return [ui.textMsg(`📬 เปิดรายงานประจำเดือนแล้ว จะส่งสรุปให้ทุกวันที่ ${user.settings.cycleStartDay} เวลา 09:00 น.`)];
    }

    if (['ช่วยเหลือ', 'วิธีใช้', 'help', '?', 'เมนู', 'menu', 'คู่มือ'].includes(t)) return [ui.helpMessage(ctx)];
    if (['สวัสดี', 'หวัดดี', 'hello', 'hi', 'เริ่ม', 'start'].includes(t)) return [ui.welcomeMessage(user.name, ctx)];

    const acctOut = handleAccounts(user, raw, t, ctx);
    if (acctOut) return acctOut;

    for (const [range, words] of Object.entries(SUMMARY_WORDS)) {
      if (words.includes(t)) {
        const s = ops.summaryFor(user, range, now());
        return [ui.summaryMessage(s, ctx, { budget: range === 'month' ? ops.budgetStatus(user, now()) : null })];
      }
    }

    if (['วันนี้ไม่ได้ใช้เงิน', 'ไม่ได้ใช้เงิน', 'no spend'].includes(t)) {
      return [ui.textMsg('สุดยอด! วันนี้เป็น No-Spend Day 🏆 เงินไม่หมุนออกเลย เก่งมาก')];
    }

    if (['รายการ', 'ล่าสุด', 'รายการล่าสุด', 'ประวัติ', 'history'].includes(t)) {
      const txs = [...user.txs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 10);
      return [ui.listMessage(txs, ctx)];
    }

    if (['ลบ', 'ยกเลิก', 'undo', 'ลบล่าสุด', 'ลบรายการล่าสุด'].includes(t)) {
      const last = ops.lastTx(user);
      if (!last) return [ui.textMsg('ยังไม่มีรายการให้ลบเลย 🙂')];
      ops.deleteTx(user, last.id);
      return [ui.textMsg(`ลบ "${last.note}" ${money(last.amount)} แล้ว 🗑`)];
    }

    if (['แดชบอร์ด', 'dashboard', 'เว็บ', 'แอป', 'app', 'กราฟ'].includes(t)) {
      return ctx.links.dashboard
        ? [ui.textMsg(`📱 เปิดแดชบอร์ดของคุณได้ที่นี่\n${ctx.links.dashboard}`)]
        : [ui.textMsg('ยังไม่ได้ตั้งค่า BASE_URL ของแดชบอร์ด')];
    }

    if (['ส่งออก', 'export', 'excel', 'csv', 'ดาวน์โหลด'].includes(t)) {
      return ctx.links.export
        ? [ui.textMsg(`📥 ดาวน์โหลดรายการทั้งหมด (${user.txs.length} รายการ) เป็นไฟล์ CSV เปิดด้วย Excel / Google Sheets ได้เลย\n${ctx.links.export}`)]
        : [ui.textMsg('ยังไม่ได้ตั้งค่า BASE_URL สำหรับดาวน์โหลด')];
    }

    if (['หมวด', 'หมวดหมู่', 'category'].includes(t)) return [ui.categoriesMessage(ctx)];

    // งบ / งบ 15000 / งบ อาหาร 5000 / ลบงบ
    if (t === 'ลบงบ' || t === 'ยกเลิกงบ') {
      user.settings.monthlyBudget = 0;
      user.settings.catBudgets = {};
      return [ui.textMsg('ลบงบประมาณทั้งหมดแล้ว')];
    }
    m = t.match(/^งบ(?:ประมาณ)?\s*(.*)$/);
    if (m) {
      const arg = m[1].trim();
      if (!arg) return [ui.budgetMessage(ops.budgetStatus(user, now()), ctx)];
      const mm = arg.match(/^(.*?)\s*([\d,]+(?:\.\d+)?)\s*(k|พัน)?$/i);
      if (!mm) return [ui.textMsg('พิมพ์แบบนี้นะ: "งบ 15000" หรือ "งบ อาหาร 5000"')];
      let amount = Number(mm[2].replace(/,/g, ''));
      if (mm[3]) amount *= 1000;
      const catName = mm[1].trim();
      if (!catName) {
        user.settings.monthlyBudget = amount;
        clearAlerts(user, 'total');
      } else {
        const cat = findCategoryByName(catName, user);
        if (!cat || cat.type !== 'expense') return [ui.textMsg(`ไม่รู้จักหมวด "${catName}" ลองพิมพ์ "หมวด" เพื่อดูรายชื่อ`)];
        if (amount) user.settings.catBudgets[cat.id] = amount;
        else delete user.settings.catBudgets[cat.id];
        clearAlerts(user, cat.id);
      }
      return [ui.budgetMessage(ops.budgetStatus(user, now()), ctx)];
    }

    // เตือน 21:00 / ปิดเตือน
    if (['ปิดเตือน', 'ยกเลิกเตือน', 'ไม่ต้องเตือน'].includes(t)) {
      user.settings.reminder = null;
      return [ui.textMsg('ปิดการเตือนจดรายจ่ายแล้ว 🔕')];
    }
    m = t.match(/^เตือน\s*(\d{1,2})(?:[:.](\d{2}))?\s*(น\.?)?$/);
    if (m) {
      const hh = Math.min(23, Number(m[1]));
      const mi = Math.min(59, Number(m[2] || 0));
      user.settings.reminder = `${String(hh).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
      return [ui.textMsg(`⏰ ตั้งเตือนทุกวันเวลา ${user.settings.reminder} น. แล้ว\nถ้าวันไหนยังไม่ได้จด นายหัวหมุนจะทักไปเตือนนะ`)];
    }
    if (t === 'เตือน') {
      return [
        ui.textMsg(
          user.settings.reminder ? `ตอนนี้เตือนทุกวันเวลา ${user.settings.reminder} น.\nพิมพ์ "ปิดเตือน" เพื่อยกเลิก` : 'ยังไม่ได้ตั้งเตือน พิมพ์ "เตือน 21:00" เพื่อให้ช่วยเตือนจดทุกวัน',
          ui.quickReplies([
            { label: '⏰ 20:00', text: 'เตือน 20:00' },
            { label: '⏰ 21:00', text: 'เตือน 21:00' },
            { label: '⏰ 22:00', text: 'เตือน 22:00' },
            { label: '🔕 ปิดเตือน', text: 'ปิดเตือน' },
          ])
        ),
      ];
    }

    // หาร 900 3
    m = t.match(/^หาร\s*([\d,]+(?:\.\d+)?)\s*(?:บาท)?\s*(\d+)\s*(?:คน)?$/);
    if (m) {
      const total = Number(m[1].replace(/,/g, ''));
      const people = Math.max(1, Number(m[2]));
      const each = Math.ceil((total / people) * 100) / 100;
      return [
        ui.textMsg(`🧮 ${money(total)} หาร ${people} คน = คนละ ${money(each)}`, ui.quickReplies([{ label: `จดส่วนของฉัน ${money(each)}`, text: `หารบิล ${each}` }])),
      ];
    }

    // เป้าหมายการออม
    if (['เป้า', 'เป้าหมาย', 'ออม', 'กระปุก', 'goal'].includes(t)) return [ui.goalsMessage(user.goals, ctx)];
    m = raw.trim().match(/^เป้า(?:หมาย)?\s+(.+?)\s+([\d,]+(?:\.\d+)?)\s*(k|พัน)?$/i);
    if (m) {
      let target = Number(m[2].replace(/,/g, ''));
      if (m[3]) target *= 1000;
      ops.addGoal(user, { name: m[1], target });
      return [ui.goalsMessage(user.goals, ctx)];
    }
    m = raw.trim().match(/^(ออม|ถอน)\s+(.+?)\s+([\d,]+(?:\.\d+)?)$/);
    if (m) {
      const goal = ops.findGoal(user, m[2]);
      if (!goal) return [ui.textMsg(`ไม่เจอเป้าหมาย "${m[2]}" สร้างก่อนด้วย "เป้า ${m[2]} 10000"`)];
      const amt = Number(m[3].replace(/,/g, '')) * (m[1] === 'ถอน' ? -1 : 1);
      ops.depositGoal(user, goal.id, amt);
      const done = goal.saved >= goal.target;
      return [ui.goalsMessage(user.goals, ctx), ...(done ? [ui.textMsg(`🎉 เป้าหมาย "${goal.name}" สำเร็จแล้ว! หมุนเงินเก่งสุดๆ`)] : [])];
    }
    m = raw.trim().match(/^ลบเป้า(?:หมาย)?\s+(.+)$/);
    if (m) {
      const goal = ops.findGoal(user, m[1]);
      if (!goal) return [ui.textMsg('ไม่เจอเป้าหมายนี้')];
      ops.deleteGoal(user, goal.id);
      return [ui.textMsg(`ลบเป้าหมาย "${goal.name}" แล้ว`)];
    }

    // รายการประจำ
    if (['ประจำ', 'รายการประจำ', 'บิลประจำ'].includes(t)) return [ui.recurringMessage(user.recurring, ctx)];
    m = raw.trim().match(/^ประจำ\s+(.+?)\s+([\d,]+(?:\.\d+)?)\s*(?:บาท)?\s*(?:ทุก)?\s*(?:วันที่)?\s*(\d{1,2})?$/);
    if (m) {
      const note = m[1].replace(/^\+/, '').trim();
      const isIncome = /^\+/.test(m[1]) || guessCategory(note, user.settings.customKeywords)?.type === 'income';
      const guess = guessCategory(note, user.settings.customKeywords);
      const type = isIncome ? 'income' : 'expense';
      const day = Number(m[3] || todayStr(now()).slice(8, 10));
      const r = ops.addRecurring(user, {
        note,
        amount: Number(m[2].replace(/,/g, '')),
        type,
        categoryId: guess?.type === type ? guess.id : undefined,
        day,
        wallet: guessAccount(note, user.accounts, { strict: true })?.id || 'bank',
      });
      return [ui.textMsg(`🔁 ตั้ง "${r.note}" ${money(r.amount)} ทุกวันที่ ${r.day} แล้ว ระบบจะบันทึกให้อัตโนมัติ`), ui.recurringMessage(user.recurring, ctx)];
    }
    m = t.match(/^ลบประจำ\s*(\d+)$/);
    if (m) {
      const r = user.recurring[Number(m[1]) - 1];
      if (!r) return [ui.textMsg('ไม่เจอรายการประจำลำดับนี้')];
      ops.deleteRecurring(user, r.id);
      return [ui.textMsg(`ลบรายการประจำ "${r.note}" แล้ว`), ui.recurringMessage(user.recurring, ctx)];
    }

    // ---------- จดรายการ ----------
    // ในกลุ่ม: จดเฉพาะข้อความที่หน้าตาเหมือนรายการเงิน หรือขึ้นต้นด้วย "จด" กันบอทจดข้อความคุยเล่น
    let text = raw;
    if (sess.isGroup) {
      const forced = /^จด\s+/.test(raw.trim());
      text = raw.trim().replace(/^จด\s+/, '');
      if (!forced && !looksLikeGroupEntry(text)) return [];
    }
    const parsed = parseEntries(text.replace(/^หารบิล/, 'หารบิล '), {
      now: now(),
      customKeywords: user.settings.customKeywords,
      defaultWallet: user.settings.defaultWallet,
      accounts: user.accounts,
    });
    // ประโยคยาว/กำกวมให้ AI ช่วยอ่าน (ถ้าตั้งค่า API key ไว้)
    const complex = text.length > 25 && /(แล้ว|กับ|และ|ไป|มา|อีก)/.test(text);
    if (deps.ai && (complex || (!parsed.items.length && looksLikeEntry(text)) || parsed.unparsed.length)) {
      try {
        const aiItems = await deps.ai.parseText(text, todayStr(now()));
        if (aiItems?.length) {
          // ชื่อบัญชีที่พิมพ์มา (เช่น "กสิกร") ชนะประเภทที่ AI เดา (cash/bank/card)
          const named = guessAccount(text, user.accounts, { strict: true })?.id;
          const txs = aiItems.map((it) => ops.addTx(user, { ...it, ...by, wallet: named || it.wallet || user.settings.defaultWallet }, 'ai'));
          return afterRecord(user, txs, ctx);
        }
      } catch (e) {
        console.error('AI parse failed:', e.message);
      }
    }
    if (parsed.items.length) {
      const txs = parsed.items.map((it) => ops.addTx(user, { ...it, ...by }, 'chat'));
      return afterRecord(user, txs, ctx);
    }

    if (sess.isGroup) return [];
    return [
      ui.textMsg(
        'หัวหมุนนิดนึง 😵‍💫 ไม่เข้าใจข้อความนี้\nลองพิมพ์แบบ "ข้าว 50" หรือ "+เงินเดือน 25000" ได้เลย หรือส่งรูปสลิปมาก็ได้นะ',
        ui.quickReplies([
          { label: '📖 วิธีใช้', text: 'วิธีใช้' },
          { label: '📊 สรุปวันนี้', text: 'สรุปวันนี้' },
          { label: '🎯 งบ', text: 'งบ' },
        ])
      ),
    ];
  }

  function clearAlerts(user, key) {
    for (const k of Object.keys(user.alerts)) if (k.includes(`:${key}:`)) delete user.alerts[k];
  }

  function findCategoryByName(name, user) {
    const q = name.toLowerCase();
    return (
      CATEGORIES.find((c) => c.name.toLowerCase() === q || c.id === q) ||
      CATEGORIES.find((c) => c.name.toLowerCase().includes(q)) ||
      (guessCategory(q, user.settings.customKeywords) && getCategory(guessCategory(q, user.settings.customKeywords).id))
    );
  }

  // ---------------- images (slips/receipts) ----------------
  /** เก็บรูปเป็นหลักฐานแนบกับรายการ (ถ้ามีที่เก็บไฟล์) */
  async function attach(user, tx, img) {
    if (!deps.files || !img?.bytes) return false;
    const ext = (img.mediaType || '').includes('png') ? 'png' : 'jpg';
    const key = `${user.id.replace(/[^\w-]/g, '_')}/${tx.id}.${ext}`;
    await deps.files.put(key, img.bytes, img.mediaType || 'image/jpeg');
    tx.attachment = key;
    return true;
  }

  /** รายการล่าสุดที่จดภายใน 15 นาทีและยังไม่มีรูปแนบ */
  function recentTxForAttach(user) {
    const last = ops.lastTx(user);
    if (!last || last.attachment) return null;
    return Date.now() - new Date(last.createdAt).getTime() < 15 * 60 * 1000 ? last : null;
  }

  async function handleImage(user, event, sess = {}) {
    const ctx = ctxFor(user);
    const img = deps.getImage ? await deps.getImage(event) : null;
    let slip = null;
    if (deps.ai && img) {
      slip = await deps.ai.readSlip(img, todayStr(now()));
    }
    if (!slip || !slip.isSlip || !(slip.amount > 0)) {
      // ไม่ใช่สลิป: แนบเป็นหลักฐานให้รายการล่าสุดแทน
      const recent = recentTxForAttach(user);
      if (recent && (await attach(user, recent, img))) {
        return [ui.textMsg(`📎 แนบรูปเป็นหลักฐานให้ "${recent.note}" ${money(recent.amount)} แล้ว ดูได้ในแดชบอร์ด`)];
      }
      if (sess.isGroup) return [];
      if (!deps.ai) {
        return [ui.textMsg('ระบบอ่านสลิปด้วย AI ยังไม่เปิดใช้งาน\nพิมพ์ยอดแทนได้เลย เช่น "โอนค่าห้อง 4500"\n(ถ้าจดรายการก่อนแล้วส่งรูปตามภายใน 15 นาที จะแนบรูปเป็นหลักฐานให้)')];
      }
      return [ui.textMsg('อ่านรูปนี้ไม่ออก 😵‍💫 ต้องเป็นสลิปโอนเงินหรือใบเสร็จที่เห็นยอดชัดๆ นะ\nหรือพิมพ์ยอดเองได้เลย เช่น "ค่าอาหาร 250"')];
    }
    if (ops.isDuplicateSlip(user, slip.ref)) {
      return [ui.textMsg(`สลิปนี้เคยบันทึกไปแล้วนะ (${money(slip.amount)}) ไม่บันทึกซ้ำให้ ✋`)];
    }
    const counterpart = slip.direction === 'income' ? slip.sender : slip.receiver;
    const tx = ops.addTx(
      user,
      {
        type: slip.direction === 'income' ? 'income' : 'expense',
        amount: slip.amount,
        categoryId: slip.categoryId,
        note: slip.note || (counterpart ? `${slip.direction === 'income' ? 'รับจาก' : 'โอนให้'} ${counterpart}` : 'สลิป'),
        date: slip.date || todayStr(now()),
        wallet: guessAccount(slip.bank || '', user.accounts, { strict: true })?.id || (slip.kind === 'receipt' && !slip.bank ? 'cash' : 'bank'),
        ref: slip.ref,
        meta: { bank: slip.bank, receiver: slip.receiver, sender: slip.sender, time: slip.time },
        ...(sess.by ? { by: sess.by } : {}),
      },
      'slip'
    );
    ops.rememberSlip(user, slip.ref);
    await attach(user, tx, img).catch((e) => console.error('attach failed', e.message));
    const out = [ui.slipMessage(tx, slip, recordedInfo(user), ctx)];
    const alerts = ops.budgetAlerts(user, now());
    if (alerts.length) out.push(ui.alertMessage(alerts));
    out.push(...streakCard(user, ctx));
    return out;
  }

  // ---------------- voice ----------------
  async function handleAudio(user, event, sess) {
    if (!deps.transcribe) {
      return sess.isGroup ? [] : [ui.textMsg('ตอนนี้ยังฟังเสียงไม่ได้ 🙉 พิมพ์ข้อความหรือส่งรูปสลิปมาแทนนะ')];
    }
    const heard = String((await deps.transcribe(event)) || '').trim();
    if (!heard) return sess.isGroup ? [] : [ui.textMsg('ฟังไม่ค่อยชัดเลย 🙉 ลองพูดใหม่อีกครั้ง หรือพิมพ์มาแทนนะ')];
    const out = await handleText(user, heard, sess);
    if (!out.length) return [];
    return [ui.textMsg(`🎤 ได้ยินว่า: "${heard}"`), ...out].slice(0, 5);
  }

  // ---------------- PDF statement ----------------
  async function handleFile(user, event, sess) {
    const name = event.message.fileName || '';
    if (!/\.pdf$/i.test(name)) return sess.isGroup ? [] : [ui.textMsg('ตอนนี้รับไฟล์ PDF Statement ธนาคารเท่านั้นนะ 📄')];
    if (!deps.ai?.readStatement) return [ui.textMsg('การนำเข้า PDF Statement ต้องใช้ AI ของ Claude (ตั้งค่า ANTHROPIC_API_KEY)\nAI ฟรีอ่านได้เฉพาะรูปสลิป/ใบเสร็จนะ')];
    if (event.message.fileSize > 15 * 1024 * 1024) return [ui.textMsg('ไฟล์ใหญ่เกินไป (เกิน 15MB) ลองส่งทีละเดือนนะ')];
    const pdf = await deps.getImage(event);
    const items = await deps.ai.readStatement(pdf, todayStr(now()));
    if (!items?.length) {
      return [ui.textMsg('อ่าน PDF นี้ไม่ออก 😵‍💫 ถ้าไฟล์มีรหัสผ่าน (Statement ธนาคารส่วนใหญ่ล็อกด้วยวันเกิด) ให้ปลดล็อกก่อนส่งนะ')];
    }
    const batch = ops.newId('b');
    const txs = items.map((it) => ops.addTx(user, { ...it, wallet: it.wallet || 'bank', batch, ...(sess.by ? { by: sess.by } : {}) }, 'pdf'));
    return [ui.importedMessage(txs, batch, name, ctxFor(user))];
  }
  // ---------------- postback ----------------
  async function handlePostback(user, data) {
    const ctx = ctxFor(user);
    const p = Object.fromEntries(new URLSearchParams(data));
    switch (p.action) {
      case 'del': {
        const tx = ops.deleteTx(user, p.id);
        return [ui.textMsg(tx ? `ลบ "${tx.note}" ${money(tx.amount)} แล้ว 🗑` : 'รายการนี้ถูกลบไปแล้ว')];
      }
      case 'undo': {
        const removed = (p.ids || '').split(',').map((id) => ops.deleteTx(user, id)).filter(Boolean);
        return [ui.textMsg(removed.length ? `ยกเลิก ${removed.length} รายการแล้ว 🗑` : 'รายการถูกลบไปแล้ว')];
      }
      case 'cat': {
        const tx = user.txs.find((x) => x.id === p.id);
        if (!tx) return [ui.textMsg('ไม่เจอรายการนี้แล้ว')];
        const cat = getCategory(p.c);
        ops.updateTx(user, tx.id, { categoryId: cat.id, type: cat.type });
        if (tx.source !== 'slip') ops.learnKeyword(user, tx.note, cat.id);
        return [ui.textMsg(`ย้าย "${tx.note}" ไปหมวด ${cat.emoji} ${cat.name} แล้ว${tx.source !== 'slip' ? '\n(จำไว้แล้ว ครั้งหน้าจัดหมวดให้อัตโนมัติ)' : ''}`)];
      }
      case 'wipe': {
        // ยืนยันได้ภายใน 10 นาทีหลังขอ กันกดปุ่มเก่าย้อนหลัง
        if (!p.t || Date.now() - Number(p.t) > 10 * 60 * 1000) return [ui.textMsg('ปุ่มนี้หมดอายุแล้ว พิมพ์ "ลบข้อมูล" ใหม่อีกครั้งนะ')];
        if (p.mode === 'all') {
          user._wipe = 'all';
          return [ui.textMsg('🗑 ลบบัญชีและข้อมูลทั้งหมดแล้ว รวมรูปสลิปที่แนบไว้\nถ้าพิมพ์จดอะไรอีก ระบบจะเริ่มสมุดบัญชีเล่มใหม่ให้ หรือบล็อกบัญชีนี้ได้เลยถ้าไม่ใช้แล้ว')];
        }
        const n = ops.clearData(user);
        user._wipe = 'files';
        return [ui.textMsg(`🧹 ล้างรายการแล้ว ${n} รายการ (รวมเป้าหมายและรายการประจำ)\nการตั้งค่า งบ รอบบัญชี และเวลาเตือนยังอยู่เหมือนเดิม`)];
      }
      case 'wallet': {
        const tx = user.txs.find((x) => x.id === p.id);
        if (!tx) return [ui.textMsg('ไม่เจอรายการนี้แล้ว')];
        const acc = user.accounts.find((a) => a.id === p.w && !a.archived);
        if (!acc) return [ui.textMsg('ไม่พบบัญชีนี้แล้ว พิมพ์ "บัญชี" เพื่อดูบัญชีทั้งหมด')];
        ops.updateTx(user, tx.id, { wallet: acc.id });
        const w = ops.accountList(user, now()).find((a) => a.id === acc.id);
        return [ui.textMsg(`เปลี่ยน "${tx.note}" เป็น ${w.emoji} ${w.name} แล้ว\n${ui.balanceText(w)}`)];
      }
      case 'wallets': {
        const tx = user.txs.find((x) => x.id === p.id);
        if (!tx) return [ui.textMsg('ไม่เจอรายการนี้แล้ว')];
        return [ui.walletPickMessage(tx, ops.accountList(user, now()))];
      }
      case 'edit': {
        const tx = user.txs.find((x) => x.id === p.id);
        return tx ? [ui.editMenuMessage(tx)] : [ui.textMsg('ไม่เจอรายการนี้แล้ว')];
      }
      case 'flip': {
        const tx = user.txs.find((x) => x.id === p.id);
        if (!tx) return [ui.textMsg('ไม่เจอรายการนี้แล้ว')];
        const type = tx.type === 'income' ? 'expense' : 'income';
        ops.updateTx(user, tx.id, { type, categoryId: type === 'income' ? 'other_income' : 'other' });
        return [ui.textMsg(`เปลี่ยน "${tx.note}" เป็น${type === 'income' ? 'รายรับ' : 'รายจ่าย'}แล้ว`)];
      }
      case 'undobatch': {
        const ids = user.txs.filter((t) => t.batch === p.b).map((t) => t.id);
        ids.forEach((id) => ops.deleteTx(user, id));
        return [ui.textMsg(ids.length ? `ยกเลิกการนำเข้า ${ids.length} รายการแล้ว 🗑` : 'รายการชุดนี้ถูกลบไปแล้ว')];
      }
      case 'setup': {
        if (p.step === 'cycle') {
          user.settings.cycleStartDay = Math.min(31, Math.max(1, Number(p.v) || 1));
          return [ui.setupMessage('budget', user)];
        }
        if (p.step === 'budget') {
          user.settings.monthlyBudget = Math.max(0, Number(p.v) || 0);
          return [ui.setupMessage('reminder', user)];
        }
        if (p.step === 'reminder') {
          user.settings.reminder = /^\d{2}:\d{2}$/.test(p.v) ? p.v : null;
          user.settings.onboarded = true;
          return [ui.setupMessage('done', user)];
        }
        return [];
      }
      case 'summary': {
        const s = ops.summaryFor(user, p.range || 'today', now());
        return [ui.summaryMessage(s, ctx, { budget: p.range === 'month' ? ops.budgetStatus(user, now()) : null })];
      }
      default:
        return [];
    }
  }

  /** จุดเข้าหลัก: คืน { userId, messages } — ในกลุ่ม userId คือ id ของกลุ่ม (สมุดบัญชีร่วม) */
  async function handleEvent(event) {
    const src = event.source || {};
    const ledgerId = src.groupId || src.roomId || src.userId;
    if (!ledgerId) return { userId: null, messages: [] };
    const isGroup = !!(src.groupId || src.roomId);
    const user = await loadUser(ledgerId);
    const sess = { isGroup };
    if (isGroup && src.userId) {
      user.members ||= {};
      if (!user.members[src.userId]) {
        try {
          user.members[src.userId] = (await deps.getMemberName?.(src)) || 'สมาชิก';
        } catch {
          user.members[src.userId] = 'สมาชิก';
        }
      }
      sess.by = user.members[src.userId];
    }
    let messages = [];
    try {
      if (event.type === 'follow') {
        messages = [ui.welcomeMessage(user.name, ctxFor(user)), ...(user.settings.onboarded ? [] : [ui.setupMessage('cycle', user)])];
      } else if (event.type === 'join') {
        messages = [ui.groupWelcomeMessage(ctxFor(user))];
      } else if (event.type === 'postback') {
        messages = await handlePostback(user, event.postback?.data || '');
      } else if (event.type === 'message') {
        const m = event.message;
        if (m.type === 'text') messages = await handleText(user, m.text, sess);
        else if (m.type === 'image') messages = await handleImage(user, event, sess);
        else if (m.type === 'audio') messages = await handleAudio(user, event, sess);
        else if (m.type === 'file') messages = await handleFile(user, event, sess);
        else if (m.type === 'sticker' && !isGroup) messages = [ui.textMsg('น่ารักกก 😆 พิมพ์ "ข้าว 50" เพื่อจดรายจ่าย หรือ "สรุป" ดูยอดวันนี้ได้เลย')];
      }
    } catch (e) {
      console.error('handleEvent error', e);
      messages = [ui.textMsg('ขอโทษที เกิดข้อผิดพลาดนิดหน่อย ลองใหม่อีกครั้งนะ 🙏')];
    }
    if (user._wipe) {
      const mode = user._wipe;
      delete user._wipe;
      await deps.files?.deletePrefix?.(ops.filesPrefix(user.id)).catch((e) => console.error('delete files failed', e.message));
      if (mode === 'all' && deps.store.delete) {
        await deps.store.delete(user.id);
        return { userId: ledgerId, messages };
      }
    }
    await deps.store.save(user);
    return { userId: ledgerId, messages: messages.slice(0, 5) };
  }

  return { handleEvent, loadUser };
}

/** ข้อความเตือนรายวัน (ใช้กับ scheduler) */
export function reminderMessage(user, now = new Date()) {
  const s = ops.summaryFor(user, 'today', now);
  const text = s.count
    ? `⏰ สรุปก่อนนอน: วันนี้จ่ายไป ${money(s.expense)} (${s.count} รายการ)\nมีอะไรลืมจดอีกไหม? พิมพ์มาได้เลย`
    : '⏰ วันนี้ยังไม่ได้จดอะไรเลยนะ ใช้เงินไปกับอะไรบ้าง? พิมพ์มาได้เลย เช่น "ข้าว 50"';
  return ui.textMsg(
    text,
    ui.quickReplies([
      { label: '📊 สรุปวันนี้', text: 'สรุปวันนี้' },
      { label: '🙅 วันนี้ไม่ได้ใช้เงิน', text: 'วันนี้ไม่ได้ใช้เงิน' },
    ])
  );
}

/** ข้อความในกลุ่มที่ "หน้าตาเหมือนรายการเงิน" เช่น "ข้าว 50", "+ค่าขนม 100", "50 ค่ารถ" (ทุกบรรทัด) */
export function looksLikeGroupEntry(text) {
  const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length || lines.length > 10) return false;
  const AMT = '[\\d,]+(?:\\.\\d{1,2})?\\s*(?:k|K|บาท|บ\\.|฿)?';
  const a = new RegExp(`^[+\\-]?\\s*[^\\d\\n]{1,40}?\\s*${AMT}$`);
  const b = new RegExp(`^${AMT}\\s+[^\\d\\n]{1,40}$`);
  return lines.every((l) => a.test(l) || b.test(l));
}

/** ถึงเวลาส่งรายงานประจำรอบหรือยัง (วันแรกของรอบ หลัง 09:00 และยังไม่เคยส่งรอบนี้) */
export function monthlyReportDue(user, now = new Date()) {
  if (!user.settings.monthlyReport || !user.txs.length) return null;
  const cur = rangeFor('month', now, user.settings.cycleStartDay);
  if (todayStr(now) !== cur.from || timeStr(now) < '09:00' || user.settings.lastReport === cur.from) return null;
  return shiftCycle(cur, -1, user.settings.cycleStartDay);
}

/** รายงานสรุปรอบที่แล้ว (ใช้กับ scheduler) */
export function monthlyReportMessages(user, cycle, ctx) {
  const txs = ops.txInRange(user, cycle.from, cycle.to);
  const s = { range: { ...cycle, label: `รอบ ${cycle.label}` }, txs, ...ops.summarize(txs) };
  return [ui.textMsg(`📬 รายงานประจำเดือนมาแล้ว! รอบ ${cycle.label}\nใช้ไป ${money(s.expense)} · รับ ${money(s.income)} · คงเหลือ ${money(s.net, { sign: true })}`), ui.summaryMessage(s, ctx)];
}
