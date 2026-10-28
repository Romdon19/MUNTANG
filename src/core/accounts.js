// กระเป๋าเงิน: บัญชีธนาคารหลายเล่ม · e-Wallet · บัตรเครดิต (วงเงิน/ยอดใช้) · เงินสด · หนี้สิน · ค้างรับ
// ทุกรายการ (tx.wallet) ชี้ไปที่ id ของบัญชีในนี้ — id เดิม cash/bank/card ยังใช้ได้กับข้อมูลเก่า
// หนี้สิน/ค้างรับ ไม่ใช้จ่ายตรงๆ แต่เคลื่อนไหวผ่าน "โอน" (ยืม = หนี้→บัญชี, จ่ายหนี้ = บัญชี→หนี้, ให้ยืม = บัญชี→ค้างรับ)
import { todayStr, cycleOf, addDays, addMonths, diffDays } from './dates.js';

export const ACCOUNT_TYPES = {
  cash: { name: 'เงินสด', emoji: '💵' },
  bank: { name: 'บัญชีธนาคาร', emoji: '🏦' },
  ewallet: { name: 'e-Wallet', emoji: '📱' },
  card: { name: 'บัตรเครดิต', emoji: '💳' },
  loan: { name: 'หนี้สิน', emoji: '🧾' },
  receivable: { name: 'ค้างรับ', emoji: '🤝' },
};
/** ประเภทที่เป็นหนี้ (ยอด = ยอดค้างจ่าย) และประเภทที่ใช้จ่ายได้ (เลือกเป็นช่องทางจ่ายของรายการ) */
export const LIABILITY = ['card', 'loan'];
export const SPENDABLE = ['cash', 'bank', 'ewallet', 'card'];

// ธนาคาร/ผู้ให้บริการที่เลือกได้ — ไอคอนใช้โลโก้ใน assets-src/bank-logos/<id>.png (npm run icons)
// ตัวไหนไม่มีโลโก้ ใช้ป้ายสีประจำ + ตัวย่อ (mono) ที่วาดเอง
// words = คำที่พิมพ์ในแชทแล้วให้เข้าบัญชีนี้ (ระวังคำกว้างๆ เช่น "ทรู" ที่ชนกับค่าบิลทรู)
export const PROVIDERS = [
  { id: 'kbank', name: 'กสิกรไทย', short: 'กสิกร', color: '#00A950', mono: 'K+', types: ['bank', 'card'], words: ['กสิกร', 'kbank', 'k plus', 'kplus', 'เคแบงก์'] },
  { id: 'scb', name: 'ไทยพาณิชย์', short: 'SCB', color: '#4E2E7F', mono: 'SCB', types: ['bank', 'card'], words: ['ไทยพาณิชย์', 'ไทยพาณิช', 'scb'] },
  { id: 'ktb', name: 'กรุงไทย', short: 'กรุงไทย', color: '#00A6E6', mono: 'KTB', types: ['bank', 'card'], words: ['กรุงไทย', 'ktb'] },
  { id: 'bbl', name: 'กรุงเทพ', short: 'BBL', color: '#1E4598', mono: 'BBL', types: ['bank', 'card'], words: ['bbl', 'บัวหลวง', 'ธนาคารกรุงเทพ', 'แบงก์กรุงเทพ'] },
  { id: 'bay', name: 'กรุงศรี', short: 'กรุงศรี', color: '#C9A100', mono: 'BAY', fg: '#3B2A00', types: ['bank', 'card'], words: ['กรุงศรี', 'krungsri'] },
  { id: 'ttb', name: 'ทีทีบี', short: 'ttb', color: '#0050F0', mono: 'ttb', types: ['bank', 'card'], words: ['ttb', 'ทีทีบี', 'ทหารไทย', 'ธนชาต'] },
  { id: 'gsb', name: 'ออมสิน', short: 'ออมสิน', color: '#EB198D', mono: 'GSB', types: ['bank'], words: ['ออมสิน', 'gsb', 'mymo'] },
  { id: 'baac', name: 'ธ.ก.ส.', short: 'ธ.ก.ส.', color: '#4B9B3D', mono: 'ธกส', types: ['bank'], words: ['ธกส', 'ธ.ก.ส', 'baac'] },
  { id: 'uob', name: 'UOB', short: 'UOB', color: '#0B3B8C', mono: 'UOB', types: ['bank', 'card'], words: ['uob', 'ยูโอบี'] },
  { id: 'kkp', name: 'เกียรตินาคินภัทร', short: 'KKP', color: '#594F74', mono: 'KKP', types: ['bank'], words: ['kkp', 'เกียรตินาคิน'] },
  { id: 'cimb', name: 'ซีไอเอ็มบี', short: 'CIMB', color: '#7E2F36', mono: 'CIMB', types: ['bank'], words: ['cimb', 'ซีไอเอ็มบี'] },
  { id: 'truemoney', name: 'TrueMoney Wallet', short: 'ทรูมันนี่', color: '#FF8300', mono: 'TMN', types: ['ewallet'], words: ['truemoney', 'true money', 'ทรูมันนี่', 'ทรูวอลเล็ท', 'ทรูวอลเลท'] },
  { id: 'shopeepay', name: 'ShopeePay', short: 'ShopeePay', color: '#EE4D2D', mono: 'S', types: ['ewallet'], words: ['shopeepay', 'shopee pay', 'ช้อปปี้เพย์'] },
  { id: 'linepay', name: 'Rabbit LINE Pay', short: 'LINE Pay', color: '#06C755', mono: 'LINE', types: ['ewallet'], words: ['line pay', 'linepay', 'ไลน์เพย์', 'แรบบิท'] },
  { id: 'paotang', name: 'เป๋าตัง', short: 'เป๋าตัง', color: '#1BA5E1', mono: 'เป๋า', types: ['ewallet'], words: ['เป๋าตัง', 'paotang'] },
  { id: 'ktc', name: 'KTC', short: 'KTC', color: '#E2231A', mono: 'KTC', types: ['card'], words: ['ktc', 'เคทีซี'] },
  { id: 'aeon', name: 'AEON', short: 'AEON', color: '#B6007A', mono: 'AEON', types: ['card'], words: ['aeon', 'อิออน'] },
  { id: 'firstchoice', name: 'กรุงศรี เฟิร์สช้อยส์', short: 'FirstChoice', color: '#6D2077', mono: 'FC', types: ['card'], words: ['first choice', 'firstchoice', 'เฟิร์สช้อยส์', 'เฟิร์สช้อย'] },
  { id: 'lhb', name: 'แลนด์ แอนด์ เฮ้าส์', short: 'LH Bank', color: '#6D6E71', mono: 'LH', types: ['bank'], words: ['lh bank', 'lhbank', 'แลนด์แอนด์เฮ้าส์'] },
  { id: 'tisco', name: 'ทิสโก้', short: 'TISCO', color: '#14387F', mono: 'TSC', types: ['bank'], words: ['tisco', 'ทิสโก้'] },
  { id: 'ghb', name: 'อาคารสงเคราะห์', short: 'ธอส.', color: '#F68B1F', mono: 'ธอส', types: ['bank'], words: ['ธอส', 'ghb', 'อาคารสงเคราะห์'] },
  { id: 'tcrb', name: 'ไทยเครดิต', short: 'ไทยเครดิต', color: '#F7941D', mono: 'TCR', types: ['bank'], words: ['ไทยเครดิต', 'tcrb'] },
  { id: 'ibank', name: 'อิสลามแห่งประเทศไทย', short: 'ธอท.', color: '#006A44', mono: 'IB', types: ['bank'], words: ['ibank', 'ธนาคารอิสลาม'] },
  { id: 'icbc', name: 'ICBC (ไทย)', short: 'ICBC', color: '#C7000B', mono: 'ICBC', types: ['bank'], words: ['icbc'] },
  { id: 'citi', name: 'Citi', short: 'Citi', color: '#003B70', mono: 'citi', types: ['bank', 'card'], words: ['citi', 'ซิตี้'] },
  { id: 'hsbc', name: 'HSBC', short: 'HSBC', color: '#DB0011', mono: 'HSBC', types: ['bank', 'card'], words: ['hsbc'] },
  { id: 'cardx', name: 'CardX', short: 'CardX', color: '#5E2CA5', mono: 'CX', types: ['card'], words: ['cardx', 'การ์ดเอ็กซ์'] },
];
export const PROVIDER_MAP = Object.fromEntries(PROVIDERS.map((p) => [p.id, p]));

const TYPE_COLOR = { cash: '#2F9E44', bank: '#475569', ewallet: '#F97316', card: '#1A1A1A', loan: '#E5484D', receivable: '#0EA5A4' };

/** key ของไอคอน: ธนาคาร (kbank, scb, ...) หรือประเภท (cash, bank, ...) ถ้าไม่ระบุธนาคาร */
export const iconKey = (a) => (PROVIDER_MAP[a.provider] ? a.provider : ACCOUNT_TYPES[a.type] ? a.type : 'bank');

// รูปทรงไอคอนประเภทบัญชี (เส้นขาวบนพื้นสี)
const TYPE_GLYPH = {
  cash: '<rect x="14" y="26" width="52" height="30" rx="5"/><circle cx="40" cy="41" r="7"/><path d="M22 34v14M58 34v14"/>',
  bank: '<path d="M14 32 40 18l26 14M18 36v18M30 36v18M50 36v18M62 36v18M12 60h56"/>',
  ewallet: '<rect x="24" y="14" width="32" height="52" rx="6"/><path d="M36 58h8"/>',
  card: '<rect x="12" y="22" width="56" height="38" rx="6"/><path d="M12 32h56M20 50h14"/>',
  loan: '<path d="M24 14h32v52l-8-6-8 6-8-6-8 6z"/><path d="M32 28h16M32 38h16M32 48h10"/>',
  receivable: '<circle cx="48" cy="44" r="16"/><path d="M48 36v16M12 32h20M26 25l7 7-7 7"/>',
};

/** ไอคอน SVG วงกลม 80x80 (ทรงเดียวกับโลโก้ธนาคาร): ธนาคาร = พื้นสีประจำ + ตัวย่อ, ประเภท = พื้นสี + ภาพเส้น */
export function badgeSvg(key) {
  const p = PROVIDER_MAP[key];
  const bg = p?.color || TYPE_COLOR[key] || TYPE_COLOR.bank;
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80"><circle cx="40" cy="40" r="40" fill="${bg}"/>`;
  if (!p) return `${head}<g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" transform="translate(12 12) scale(0.7)">${TYPE_GLYPH[key] || TYPE_GLYPH.bank}</g></svg>`;
  const m = p.mono || p.short.slice(0, 3);
  const size = m.length <= 2 ? 30 : m.length === 3 ? 23 : 18;
  return `${head}<text x="40" y="41" dominant-baseline="central" text-anchor="middle" font-family="Kanit, 'Noto Sans Thai', Arial, sans-serif" font-weight="700" font-size="${size}" fill="${p.fg || '#fff'}">${m}</text></svg>`;
}

export function defaultAccounts() {
  return [
    { id: 'cash', type: 'cash', name: 'เงินสด' },
    { id: 'bank', type: 'bank', name: 'บัญชีธนาคาร' },
    { id: 'card', type: 'card', name: 'บัตรเครดิต' },
  ];
}

/** หน้าตาของบัญชี: emoji สีประจำ ชื่อย่อ (ไว้ทำชิปเล็กๆ ในแชท) */
export function decorate(a) {
  const p = PROVIDER_MAP[a.provider];
  const t = ACCOUNT_TYPES[a.type] || ACCOUNT_TYPES.bank;
  const name = a.name || p?.name || t.name;
  return {
    ...a,
    name,
    emoji: t.emoji,
    color: p?.color || TYPE_COLOR[a.type] || TYPE_COLOR.bank,
    short: name.length <= 7 ? name : p?.short || name.slice(0, 7),
    typeName: t.name,
    icon: iconKey(a),
    liability: LIABILITY.includes(a.type),
  };
}

export const activeAccounts = (user) => (user.accounts || []).filter((a) => !a.archived);
export const findAccount = (user, id) => (user.accounts || []).find((a) => a.id === id) || null;

/**
 * แปลงค่าที่ส่งมาเป็น id บัญชีจริง:
 * id บัญชี → ใช้เลย, ชื่อประเภท (cash/bank/card/ewallet จาก AI หรือข้อมูลเก่า) → บัญชีแรกของประเภทนั้น
 */
export function resolveWallet(user, w) {
  const acc = findAccount(user, w);
  if (acc && SPENDABLE.includes(acc.type)) return acc.id;
  const active = activeAccounts(user).filter((a) => SPENDABLE.includes(a.type));
  if (ACCOUNT_TYPES[w]) {
    const hit = active.find((a) => a.type === w) || (w === 'bank' ? active.find((a) => a.type === 'ewallet') : null);
    if (hit) return hit.id;
  }
  const def = active.find((a) => a.id === user.settings?.defaultWallet);
  return (def || active[0] || user.accounts?.find((a) => SPENDABLE.includes(a.type)) || { id: 'cash' }).id;
}

const CARD_WORDS = /บัตร|รูด|credit/;
const CASH_WORDS = /เงินสด|จ่ายสด/;
const XFER_WORDS = /โอน|สแกน|พร้อมเพย์|promptpay|qr|แอปธนาคาร/;

/** คำที่ใช้เรียกบัญชีนี้ในแชท: ชื่อที่ตั้งเอง + คำของธนาคาร */
function wordsOf(a) {
  const out = [...(PROVIDER_MAP[a.provider]?.words || [])];
  const name = String(a.name || '').toLowerCase().trim();
  // ชื่อสั้นเกินหรือเป็นชื่อกลางๆ จะชนกับข้อความทั่วไป
  const stop = ['บัญชีธนาคาร', 'บัตรเครดิต', 'บัญชี', 'บัตร', 'เงิน', 'เงินเก็บ', 'ออมทรัพย์', 'ผ่อน', 'card', 'bank'];
  if (name.length >= 2 && !stop.includes(name)) out.push(name);
  // แต่ละคำในชื่อก็ใช้เรียกได้ เช่น "Express กสิกร" → "express" (คำสั้น/คำกลางๆ ไม่นับ)
  for (const w of name.split(/\s+/)) if (w !== name && w.length >= 3 && !stop.includes(w)) out.push(w);
  return out;
}

/**
 * เดาบัญชีจากข้อความ เช่น "ข้าว 50 กสิกร", "ชาบู 459 บัตร ktc", "ค่าไฟ 850 โอน"
 * คืน { id, word } (word = คำที่เจอ ไว้ตัดออกจากชื่อรายการ) หรือ null
 * strict = ต้องเจอชื่อ/ธนาคารจริงๆ (ไม่เดาจากคำว่า บัตร/โอน/เงินสด)
 * types = จำกัดประเภทบัญชี (ตอนจดรายการใช้ SPENDABLE กันชื่อหนี้อย่าง "แม่" ไปชนกับ "ซื้อของให้แม่")
 */
export function guessAccount(text, accounts, { strict = false, defaultWallet, types } = {}) {
  const t = String(text || '').toLowerCase();
  const list = (accounts || []).filter((a) => !a.archived && (!types || types.includes(a.type)));
  const wantsCard = CARD_WORDS.test(t);
  let best = null;
  for (const a of list) {
    for (const w of wordsOf(a)) {
      if (!w || !t.includes(w)) continue;
      const score = w.length + (wantsCard === (a.type === 'card') ? 0.5 : 0);
      if (!best || score > best.score) best = { id: a.id, word: w, score };
    }
  }
  if (best) return { id: best.id, word: best.word };
  if (strict) return null;
  const firstOf = (...types) => list.find((a) => types.includes(a.type));
  let hit = null;
  if (wantsCard) hit = firstOf('card');
  else if (CASH_WORDS.test(t)) hit = firstOf('cash');
  else if (XFER_WORDS.test(t)) {
    const def = list.find((a) => a.id === defaultWallet);
    hit = def && (def.type === 'bank' || def.type === 'ewallet') ? def : firstOf('bank', 'ewallet');
  }
  return hit ? { id: hit.id, word: null } : null;
}

/** เดาธนาคารจากชื่อที่ผู้ใช้ตั้ง เช่น "กสิกร เงินเดือน" → kbank */
export function guessProvider(text, type) {
  const t = String(text || '').toLowerCase();
  const hits = PROVIDERS.filter((p) => p.words.some((w) => t.includes(w)) || t.includes(p.name.toLowerCase()));
  return (hits.find((p) => !type || p.types.includes(type)) || hits[0])?.id || null;
}

/** รายการนี้นับรวมในยอดบัญชีไหม (นับเฉพาะหลังวันที่ตั้งยอดล่าสุด) */
function counts(a, item) {
  if (!a.since) return true;
  if (item.date !== a.since) return item.date > a.since;
  return (item.createdAt || '') >= (a.balanceAt || '');
}

/** รอบบัตร: ตัดรอบวันที่ statementDay, ชำระวันที่ dueDay → { from, to, due, lastDue } */
export function cardCycle(statementDay, dueDay, today) {
  if (!(Number(statementDay) >= 1)) return null;
  const sd = Math.min(28, Number(statementDay));
  const c = cycleOf(today, sd + 1 > 28 ? 1 : sd + 1);
  const dueIn = (endDate) => {
    if (!dueDay) return null;
    const d = Math.min(Number(dueDay), 28);
    // วันชำระอยู่หลังวันตัดรอบเสมอ: ถ้าวันชำระ ≤ วันตัดรอบ = เดือนถัดไป
    const month = d > Number(endDate.slice(8)) ? endDate.slice(0, 7) : addMonths(endDate.slice(0, 7), 1);
    return `${month}-${String(d).padStart(2, '0')}`;
  };
  const prevEnd = addDays(c.from, -1);
  const due = dueIn(prevEnd); // บิลที่ตัดไปล่าสุด ต้องจ่ายภายในวันนี้
  const nextDue = dueIn(c.to);
  return { from: c.from, to: c.to, statementDate: prevEnd, due: due && due >= today ? due : nextDue, daysLeft: diffDays(today, c.to) + 1 };
}

/**
 * ยอดของทุกบัญชี
 * - บัญชี/เงินสด/e-Wallet: balance = ยอดตั้งต้น + เงินเข้า − เงินออก
 * - บัตรเครดิต/หนี้สิน: used = ยอดค้างตั้งต้น + รูด/ยืมเพิ่ม − ชำระ, available = วงเงิน − used − ยอดผ่อนที่ผูกกับบัตร
 * - ค้างรับ: balance = ยอดที่คนอื่นติดเราอยู่ (ให้ยืมเพิ่ม = เข้า, ได้คืน = ออก)
 * - หนี้ที่ "ผ่อนผ่านบัตร" (loan.viaCard): จ่ายบัตรเมื่อไร ระบบตัดค่างวดเดือนนั้นจากยอดจ่ายให้หนี้ก่อน ที่เหลือเข้าบัตร
 * cycle = { from, to } ใช้หายอดใช้รอบนี้ (spent)
 */
export function accountBalances(user, cycle, now = new Date()) {
  const accs = user.accounts || [];
  const byId = Object.fromEntries(accs.map((a) => [a.id, a]));
  const today = todayStr(now);
  const flow = Object.fromEntries(accs.map((a) => [a.id, { in: 0, out: 0, spent: 0, count: 0, cardCycle: 0 }]));
  const cyc = Object.fromEntries(accs.filter((a) => a.type === 'card').map((a) => [a.id, cardCycle(a.statementDay, a.dueDay, today)]));
  for (const t of user.txs || []) {
    const f = flow[t.wallet];
    if (!f) continue;
    const a = byId[t.wallet];
    f.count++;
    if (cycle && t.type === 'expense' && t.date >= cycle.from && t.date <= cycle.to) f.spent += t.amount;
    const cc = cyc[t.wallet];
    if (cc && t.type === 'expense' && t.date >= cc.from && t.date <= cc.to) f.cardCycle += t.amount;
    if (!counts(a, t)) continue;
    if (t.type === 'income') f.in += t.amount;
    else f.out += t.amount;
  }

  // ยอดหนี้ผ่อนแบบสะสม (ไว้รู้ว่ายังเหลือให้ตัดค่างวดไหม) + เดือนที่จ่ายงวดแล้ว
  const linked = accs.filter((a) => a.type === 'loan' && a.viaCard && byId[a.viaCard]);
  const owedNow = Object.fromEntries(linked.map((l) => [l.id, l.opening || 0]));
  const paidOn = Object.fromEntries(linked.map((l) => [l.id, []]));
  const xs = [...(user.transfers || [])].sort((a, b) => (a.date === b.date ? ((a.createdAt || '') < (b.createdAt || '') ? -1 : 1) : a.date < b.date ? -1 : 1));
  for (const x of xs) {
    const from = byId[x.from];
    const to = byId[x.to];
    let amount = x.amount;
    if (from) {
      flow[from.id].count++;
      if (counts(from, x)) flow[from.id].out += x.amount;
      if (owedNow[from.id] !== undefined && counts(from, x)) owedNow[from.id] += x.amount;
    }
    if (!to) continue;
    flow[to.id].count++;
    if (owedNow[to.id] !== undefined && counts(to, x)) {
      owedNow[to.id] -= x.amount;
      paidOn[to.id].push(x.date);
    }
    // จ่ายบัตร → ตัดค่างวดผ่อนของเดือนนั้นก่อน (เดือนละครั้งต่อรายการผ่อน)
    if (to.type === 'card' && from?.type !== 'loan') {
      for (const l of linked.filter((l) => l.viaCard === to.id)) {
        if (!(amount > 0) || !(owedNow[l.id] > 0) || !counts(l, x)) continue;
        if (paidOn[l.id].some((d) => d.slice(0, 7) === x.date.slice(0, 7))) continue;
        const part = Math.min(amount, l.monthlyPayment || 0, owedNow[l.id]);
        if (!(part > 0)) continue;
        owedNow[l.id] -= part;
        paidOn[l.id].push(x.date);
        flow[l.id].in += part;
        amount -= part;
      }
    }
    if (counts(to, x)) flow[to.id].in += amount;
  }

  const round = (n) => Math.round(n * 100) / 100;
  const loans = accs
    .filter((a) => a.type === 'loan')
    .map((a) => {
      const f = flow[a.id];
      const used = round((a.opening || 0) + f.out - f.in);
      const principal = a.principal || 0;
      const total = a.installments || 0;
      const monthsLeft = payoffMonths(used, a.monthlyPayment, a.rate);
      const card = cyc[a.viaCard];
      // งวดนี้จ่ายแล้วหรือยัง: จ่ายหลังวันตัดรอบล่าสุด (ไม่มีวันตัดรอบ = จ่ายในเดือนนี้)
      const paidThis = (paidOn[a.id] || []).some((d) => (card ? d > card.statementDate : d.slice(0, 7) === today.slice(0, 7)));
      return {
        ...decorate(a),
        known: !!a.since,
        used,
        principal,
        pctPaid: principal ? Math.max(0, Math.min(1, 1 - used / principal)) : 0,
        monthsLeft,
        installments: total || null,
        paidInstallments: total && monthsLeft != null ? Math.max(0, total - monthsLeft) : null,
        dueThisBill: used > 0 && !paidThis ? Math.min(used, a.monthlyPayment || 0) : 0,
        viaCard: byId[a.viaCard] ? a.viaCard : null,
        spent: 0,
        count: f.count,
      };
    });
  return accs.map((a) => {
    const f = flow[a.id];
    const d = decorate(a);
    const known = !!a.since;
    if (a.type === 'card') {
      const used = round((a.opening || 0) + f.out - f.in);
      const limit = a.limit || 0;
      const inst = loans.filter((l) => l.viaCard === a.id && !l.archived && l.used > 0);
      const instOwed = round(inst.reduce((v, l) => v + l.used, 0));
      const instDue = round(inst.reduce((v, l) => v + l.dueThisBill, 0));
      const totalUsed = round(used + instOwed);
      const cc = cyc[a.id];
      const budget = a.cycleBudget || 0;
      const budgetLeft = budget && cc ? round(budget - f.cardCycle) : null;
      return {
        ...d,
        known,
        used,
        limit,
        installments: inst.map((l) => ({ id: l.id, name: l.name, used: l.used, monthlyPayment: l.monthlyPayment || 0, installments: l.installments, paidInstallments: l.paidInstallments, monthsLeft: l.monthsLeft })),
        instOwed,
        instDue,
        totalUsed,
        available: limit ? round(limit - totalUsed) : null,
        pctUsed: limit ? totalUsed / limit : 0,
        pctRevolving: limit ? Math.max(0, used) / limit : 0,
        // ยอดที่ต้องจ่ายบิลนี้ = รูดก่อนวันตัดรอบที่ยังไม่จ่าย + ค่างวดผ่อน (รูดหลังวันตัดรอบไปอยู่บิลหน้า)
        payNow: round(Math.max(0, cc ? used - f.cardCycle : used) + instDue),
        unbilled: cc ? round(Math.min(Math.max(0, used), f.cardCycle)) : 0,
        cycle: cc,
        cycleSpent: round(f.cardCycle),
        cycleBudget: budget || null,
        budgetLeft,
        perDay: budgetLeft != null && cc ? Math.max(0, Math.floor(budgetLeft / cc.daysLeft)) : null,
        spent: round(f.spent),
        count: f.count,
      };
    }
    if (a.type === 'loan') return loans.find((l) => l.id === a.id);
    return { ...d, known, balance: round((a.opening || 0) + f.in - f.out), spent: round(f.spent), count: f.count };
  });
}

/** ผ่อนอีกกี่เดือนหมด (rate = ดอกเบี้ยต่อปี %) คืน null ถ้าไม่รู้ค่างวด หรือค่างวดไม่พอจ่ายดอก */
export function payoffMonths(owed, payment, rate = 0) {
  if (!(owed > 0)) return 0;
  if (!(payment > 0)) return null;
  const i = (Number(rate) || 0) / 1200;
  if (!i) return Math.ceil(owed / payment - 1e-9);
  if (payment <= owed * i) return null;
  return Math.ceil(-Math.log(1 - (i * owed) / payment) / Math.log(1 + i));
}

/**
 * ยอดรวม (เฉพาะบัญชีที่ตั้งยอดแล้ว)
 * cash = เงินที่ใช้ได้ (เงินสด+ธนาคาร+e-Wallet), receivable = ค้างรับ, debt = บัตร + หนี้สิน, net = สินทรัพย์ − หนี้
 */
export function accountTotals(balances) {
  const t = { cash: 0, receivable: 0, cardDebt: 0, instDebt: 0, loanDebt: 0, limit: 0, monthlyPayments: 0, payThisMonth: 0 };
  for (const a of balances) {
    if (a.archived || !a.known) continue;
    if (a.type === 'card') {
      t.cardDebt += Math.max(0, a.used);
      t.limit += a.limit || 0;
      t.payThisMonth += a.payNow || 0;
    } else if (a.type === 'loan') {
      if (a.viaCard) t.instDebt += a.used;
      else {
        t.loanDebt += a.used;
        if (a.used > 0) t.payThisMonth += Math.min(a.used, a.monthlyPayment || 0);
      }
      if (a.used > 0) t.monthlyPayments += a.monthlyPayment || 0;
    } else if (a.type === 'receivable') t.receivable += a.balance;
    else t.cash += a.balance;
  }
  const r2 = (n) => Math.round(n * 100) / 100;
  const debt = t.cardDebt + t.instDebt + t.loanDebt;
  return {
    cash: r2(t.cash),
    receivable: r2(t.receivable),
    cardDebt: r2(t.cardDebt),
    instDebt: r2(t.instDebt),
    loanDebt: r2(t.loanDebt),
    debt: r2(debt),
    limit: t.limit,
    monthlyPayments: r2(t.monthlyPayments),
    payThisMonth: r2(t.payThisMonth),
    assets: r2(t.cash + t.receivable),
    net: r2(t.cash + t.receivable - debt),
  };
}
