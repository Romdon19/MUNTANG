// ข้อความ Flex Message ของ "หมุนตังค์" — โครงแบบป้านวล (หัวการ์ดมีมาสคอตแอบมอง · แท็กประเภท · ปุ่มแก้/ลบ · แถบงบหมวด · คอมเมนต์มาสคอต)
// ในโทนแบรนด์: เหลืองโลโก้ + ดำ บนการ์ดขาวสะอาด
import { getCategory, categoriesOf, CATEGORY_MAP } from './categories.js';
import { decorate, ACCOUNT_TYPES } from './accounts.js';
import { money, pct, truncate } from './format.js';
import { thaiDate } from './dates.js';
import { moodFor } from './mood.js';

export const C = {
  ink: '#1A1A1A',
  head: '#FBDE0A', // สีพื้นโลโก้ — หัวการ์ด (มาสคอตแอบมองกลืนกับพื้น)
  gold: '#FFC400',
  goldText: '#8A5A00', // ทองเข้มสำหรับตัวหนังสือบนพื้นขาว
  tint: '#FFF6D1',
  mint: '#E6F7EE',
  chip: '#F5F1E8',
  card: '#FFFFFF',
  line: '#ECE6DA',
  track: '#F1ECE2',
  muted: '#8A8172',
  red: '#E5484D',
  redTint: '#FDECEC',
  amber: '#D97706',
  green: '#16A34A',
};

// ---------- primitives ----------
const text = (t, o = {}) => ({ type: 'text', text: String(t === '' || t == null ? ' ' : t), color: C.ink, size: 'sm', wrap: true, ...o });
const box = (layout, contents, o = {}) => ({ type: 'box', layout, contents, ...o });
const sep = (o = {}) => ({ type: 'separator', color: C.line, margin: 'md', ...o });
// ปุ่มหลัก: พื้นเหลือง ตัวหนังสือดำ (style secondary ใน LINE = ตัวหนังสือสีดำ)
const btn = (label, action, o = {}) => ({ type: 'button', height: 'sm', style: 'secondary', color: C.gold, action: { label, ...action }, ...o });
const postback = (data, displayText) => ({ type: 'postback', data, ...(displayText ? { displayText } : {}) });
const msg = (t) => ({ type: 'message', text: t });
const uri = (u) => ({ type: 'uri', uri: u });

/** แถบความคืบหน้าบางๆ แบบป้านวล */
function bar(p, color = C.gold, height = 6) {
  const w = Math.max(3, Math.min(100, Math.round((p || 0) * 100)));
  return box('vertical', [box('vertical', [{ type: 'filler' }], { width: `${w}%`, backgroundColor: color, height: `${height}px`, cornerRadius: `${height / 2}px` })], {
    backgroundColor: C.track,
    height: `${height}px`,
    cornerRadius: `${height / 2}px`,
    margin: 'sm',
  });
}

const budgetColor = (p) => (p >= 1 ? C.red : p >= 0.8 ? C.amber : C.gold);

/** ป้ายเล็กมุมโค้ง เช่น [รายจ่าย] */
function tag(label, bg = C.ink, color = C.gold) {
  return box('vertical', [text(label, { size: 'xxs', color, weight: 'bold', wrap: false })], {
    flex: 0,
    backgroundColor: bg,
    cornerRadius: '10px',
    paddingStart: '8px',
    paddingEnd: '8px',
    paddingTop: '2px',
    paddingBottom: '2px',
  });
}

/** ปุ่มไอคอนสี่เหลี่ยมเล็ก (แก้ไข / ลบ) */
function iconBtn(icon, action, bg = C.chip, color = C.ink) {
  return box('vertical', [text(icon, { size: 'sm', align: 'center', color, weight: 'bold' })], {
    flex: 0,
    width: '30px',
    height: '30px',
    cornerRadius: '8px',
    backgroundColor: bg,
    justifyContent: 'center',
    margin: 'sm',
    action,
  });
}

/** หัวการ์ดสีเหลืองโลโก้ มีโลโก้นายหัวหมุนเต็มรูปอยู่ด้านขวา */
function header(title, subtitle, ctx) {
  const contents = [
    box('vertical', [text(title, { weight: 'bold', size: 'lg' }), ...(subtitle ? [text(subtitle, { color: '#5A4A00', size: 'xxs', margin: 'xs' })] : [])], {
      flex: 1,
      justifyContent: 'center',
    }),
  ];
  if (ctx?.logoUrl) {
    contents.push(
      box('vertical', [{ type: 'image', url: ctx.logoUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'cover' }], {
        flex: 0,
        width: '56px',
        height: '56px',
        cornerRadius: '14px',
      })
    );
  }
  return box('horizontal', contents, { backgroundColor: C.head, paddingAll: 'lg', alignItems: 'center', spacing: 'md' });
}

function bubble({ title, subtitle, body, footer, ctx, size = 'mega' }) {
  const b = {
    type: 'bubble',
    size,
    header: header(title, subtitle, ctx),
    body: box('vertical', body, { backgroundColor: C.card, paddingAll: 'lg', spacing: 'sm' }),
    styles: { header: { backgroundColor: C.head }, body: { backgroundColor: C.card }, footer: { backgroundColor: C.card } },
  };
  if (footer?.length) b.footer = box('vertical', footer, { backgroundColor: C.card, paddingAll: 'md', paddingTop: 'none', spacing: 'sm' });
  return b;
}

export function flex(altText, contents, quickReply) {
  const m = { type: 'flex', altText: truncate(altText, 380), contents };
  if (quickReply) m.quickReply = quickReply;
  return m;
}

export function textMsg(t, quickReply) {
  const m = { type: 'text', text: t };
  if (quickReply) m.quickReply = quickReply;
  return m;
}

/** items: { label, text } | { label, data, displayText } | { label, uri } | { label, camera: true } | { label, cameraRoll: true } */
export function quickReplies(items) {
  return {
    items: items.slice(0, 13).map((it) => ({
      type: 'action',
      action: it.camera
        ? { type: 'camera', label: truncate(it.label, 20) }
        : it.cameraRoll
          ? { type: 'cameraRoll', label: truncate(it.label, 20) }
          : it.data
            ? { type: 'postback', label: truncate(it.label, 20), data: it.data, displayText: it.displayText || it.label }
            : it.uri
              ? { type: 'uri', label: truncate(it.label, 20), uri: it.uri }
              : { type: 'message', label: truncate(it.label, 20), text: it.text || it.label },
    })),
  };
}

const row = (left, right, o = {}) =>
  box('horizontal', [text(left, { color: C.muted, flex: 3, ...(o.leftStyle || {}) }), text(right, { align: 'end', flex: 4, weight: 'bold', ...(o.rightStyle || {}) })], {
    margin: o.margin || 'sm',
  });

/** หน้าตาบัญชีของรายการ (ชื่อ สี emoji) จากรายการบัญชีของผู้ใช้ */
function walletOf(id, accounts) {
  const a = (accounts || []).find((x) => x.id === id);
  if (a) return a.emoji && a.color ? a : decorate(a);
  return ACCOUNT_TYPES[id] ? decorate({ id, type: id }) : { id, name: '', short: '', emoji: '', color: C.muted };
}

function txRow(t, { withDate = false, deletable = false, accounts } = {}) {
  const cat = getCategory(t.categoryId);
  const isInc = t.type === 'income';
  const contents = [
    box('vertical', [text(cat.emoji, { size: 'md', align: 'center' })], {
      flex: 0,
      width: '34px',
      height: '34px',
      cornerRadius: '10px',
      backgroundColor: isInc ? C.mint : C.tint,
      justifyContent: 'center',
    }),
    box(
      'vertical',
      [
        text(truncate(t.note, 28), { size: 'sm', weight: 'bold' }),
        text(`${cat.name}${withDate ? ` · ${thaiDate(t.date, { year: false })}` : ''} · ${t.by ? `โดย ${t.by}` : walletOf(t.wallet, accounts).name}${t.attachment ? ' · 📎' : ''}`, { size: 'xxs', color: C.muted }),
      ],
      { flex: 5, paddingStart: 'md' }
    ),
    text(money(isInc ? t.amount : -t.amount, { sign: true }), { flex: 3, align: 'end', weight: 'bold', color: isInc ? C.green : C.ink, gravity: 'center' }),
  ];
  if (deletable) contents.push(iconBtn('✕', postback(`action=del&id=${t.id}`, `ลบ ${truncate(t.note, 15)}`), C.redTint, C.red));
  return box('horizontal', contents, { margin: 'md', alignItems: 'center' });
}

// ---------- การ์ด "จดสำเร็จ" ----------
const timeOf = (t) => {
  const d = new Date(new Date(t.createdAt).getTime() + 7 * 3600e3);
  return d.toISOString().slice(11, 16);
};

/** คำพูดนายหัวหมุนหลังจด: ดูงบหมวดก่อน แล้วค่อยดูงบรวม */
export function mascotComment(info, tx) {
  const cs = info.catStatus?.[tx.categoryId];
  const cat = getCategory(tx.categoryId);
  if (tx.type === 'expense' && cs?.limit) {
    const p = cs.spent / cs.limit;
    if (p >= 1) return `หมวด${cat.name} ทะลุงบมา ${Math.round((p - 1) * 100)}% แล้ว หัวหมุนติ้วเลย 🌀`;
    if (p >= 0.8) return `หมวด${cat.name} ใช้ไป ${Math.round(p * 100)}% แล้ว เริ่มหัวหมุนนิดๆ 😵‍💫`;
  }
  if (tx.type === 'income') return `เงินหมุนเข้ามาแล้ว ${money(tx.amount)} เก็บไว้ดีๆ น้า 🪙`;
  const m = moodFor(info.budget);
  return m.level === 'idle' ? `วันนี้ใช้ไป ${money(info.todayExpense)} แล้ว ตั้งงบไว้ด้วยนะ หัวจะได้ไม่หมุน 🙂` : `${m.title} ${m.face} ${m.line}`;
}

/** บรรทัดยอดของบัญชี: "คงเหลือ ฿x" หรือบัตร "ใช้ไป ฿x / วงเงิน ฿y" */
export function balanceText(a) {
  if (!a) return '';
  if (a.type === 'card') {
    if (!a.known) return `รอบนี้รูดไป ${money(a.spent || 0)}`;
    return a.limit ? `ใช้ไป ${money(a.used)} / วงเงิน ${money(a.limit)} · เหลือ ${money(a.available)}` : `ยอดค้างจ่าย ${money(a.used)}`;
  }
  return a.known ? `คงเหลือ ${money(a.balance)}` : `รอบนี้ใช้ไป ${money(a.spent || 0)} (ยังไม่ได้ตั้งยอด)`;
}

/** ชิปเลือกบัญชีใต้การ์ดจดสำเร็จ: 3 บัญชีที่น่าจะใช้ + ปุ่ม "อื่นๆ" ถ้ามีมากกว่านั้น */
function walletChips(tx, accounts = [], defaultWallet) {
  const active = accounts.filter((a) => !a.archived);
  const ordered = [
    ...active.filter((a) => a.id === tx.wallet),
    ...active.filter((a) => a.id === defaultWallet && a.id !== tx.wallet),
    ...[...active].filter((a) => a.id !== tx.wallet && a.id !== defaultWallet).sort((a, b) => (b.count || 0) - (a.count || 0)),
  ];
  const more = ordered.length > 4;
  const shown = ordered.slice(0, more ? 3 : 4);
  // ชิป: จุดสีประจำบัญชี + ชื่อสั้น (ไม่ใส่ emoji ให้ชื่อมีที่พอ)
  const chip = (label, on, action, color) =>
    box('vertical', [text(label, { size: 'xxs', align: 'center', weight: on ? 'bold' : 'regular', wrap: false, ...(color ? { contents: [{ type: 'span', text: '● ', color }, { type: 'span', text: label }] } : {}) })], {
      backgroundColor: on ? C.tint : C.chip,
      cornerRadius: '12px',
      paddingAll: '6px',
      ...(on ? { borderWidth: '1px', borderColor: C.gold } : {}),
      action,
    });
  const cur = walletOf(tx.wallet, accounts);
  return [
    text('👛 จ่ายจากบัญชีไหน? แตะเพื่อเปลี่ยน', { size: 'xxs', color: C.muted, margin: 'md' }),
    box(
      'horizontal',
      [
        ...shown.map((w) => chip(w.short || w.name, w.id === tx.wallet, postback(`action=wallet&id=${tx.id}&w=${w.id}`, `จ่ายด้วย ${w.name}`), w.color)),
        ...(more ? [chip('อื่นๆ ▾', false, postback(`action=wallets&id=${tx.id}`, 'เลือกบัญชีอื่น'))] : []),
      ],
      { spacing: 'sm', margin: 'sm' }
    ),
    ...(cur.name
      ? [
          box('horizontal', [text('●', { flex: 0, size: 'xxs', color: cur.color }), text(`${cur.name} · ${balanceText(cur)}`, { size: 'xxs', color: C.muted, margin: 'sm' })], {
            margin: 'sm',
          }),
        ]
      : []),
  ];
}

/**
 * การ์ดจดสำเร็จแบบป้านวล
 * info: { today, todayExpense, budget, catStatus: { [catId]: { spent, limit } }, cycleStartDay, slip? }
 */
function entryCard({ title, subtitle, txs, info, ctx, extra = [] }) {
  const body = [];
  // จัดกลุ่มตามประเภท + หมวด
  const groups = [];
  for (const t of txs) {
    const key = `${t.type}:${t.categoryId}`;
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, type: t.type, categoryId: t.categoryId, txs: [] }));
    g.txs.push(t);
  }
  groups.forEach((g, gi) => {
    const cat = getCategory(g.categoryId);
    const inc = g.type === 'income';
    body.push(
      box('horizontal', [tag(inc ? 'รายรับ' : 'รายจ่าย', inc ? C.green : C.ink, inc ? '#FFFFFF' : C.gold), text(`- ${cat.emoji} ${cat.name}`, { weight: 'bold', margin: 'sm', gravity: 'center' })], {
        alignItems: 'center',
        margin: gi ? 'xl' : 'none',
      })
    );
    for (const t of g.txs) {
      const w = walletOf(t.wallet, info.accounts || ctx?.accounts);
      body.push(
        box(
          'horizontal',
          [
            text(`${thaiDate(t.date)} ${timeOf(t)}${t.by ? ` · โดย ${t.by}` : ''}`, { size: 'xxs', color: C.muted, flex: 0, wrap: false, gravity: 'center' }),
            box('vertical', [text(`${w.emoji} ${w.name}`, { size: 'xxs', wrap: false })], {
              flex: 0,
              backgroundColor: C.chip,
              cornerRadius: '6px',
              paddingStart: '6px',
              paddingEnd: '6px',
              margin: 'sm',
            }),
          ],
          { margin: 'md', alignItems: 'center' }
        )
      );
      const editAction = ctx?.links?.edit ? uri(ctx.links.edit(t.id)) : postback(`action=edit&id=${t.id}`, `แก้ไข ${truncate(t.note, 15)}`);
      body.push(
        box(
          'horizontal',
          [
            text(`${t.attachment ? '📎 ' : ''}${truncate(t.note, 30)}`, { flex: 5, gravity: 'center' }),
            text(money(t.amount), { flex: 3, align: 'end', weight: 'bold', size: 'md', color: inc ? C.green : C.ink, gravity: 'center' }),
            iconBtn('✏️', editAction),
            iconBtn('✕', postback(`action=del&id=${t.id}`, `ลบ ${truncate(t.note, 15)}`), C.redTint, C.red),
          ],
          { alignItems: 'center', margin: 'xs' }
        )
      );
    }
  });

  body.push(...extra);

  // แถบงบของหมวด (แบบป้านวล)
  const main = txs[txs.length - 1];
  const cat = getCategory(main.categoryId);
  const cs = info.catStatus?.[main.categoryId];
  body.push(sep({ color: C.ink, margin: 'lg' }));
  if (main.type === 'expense' && cs) {
    const over = cs.limit && cs.spent > cs.limit;
    body.push(
      box('horizontal', [text(cat.name, { weight: 'bold', flex: 4 }), text(cs.limit ? `${money(cs.spent)} / ${money(cs.limit)}` : money(cs.spent), { flex: 6, align: 'end', weight: 'bold', color: over ? C.red : C.ink })], {
        margin: 'lg',
      })
    );
    body.push(bar(cs.limit ? cs.spent / cs.limit : 1, cs.limit ? budgetColor(cs.spent / cs.limit) : C.gold));
  } else {
    body.push(row('จ่ายวันนี้', money(info.todayExpense), { margin: 'lg' }));
  }
  body.push(text(`รอบงบ: รายเดือน (วันที่ ${info.cycleStartDay || 1})`, { size: 'xxs', color: C.muted, align: 'end', margin: 'sm' }));

  // คอมเมนต์นายหัวหมุน
  body.push(
    box('horizontal', [text('👦', { flex: 0 }), text(mascotComment(info, main), { size: 'xs', margin: 'sm' })], {
      margin: 'lg',
      paddingTop: 'md',
      borderWidth: 'none',
    })
  );
  if (txs.length === 1) body.push(sep({ margin: 'md' }), ...walletChips(main, info.accounts || ctx?.accounts, info.defaultWallet));

  return bubble({ title, subtitle, body, ctx });
}

function entryQuickReplies(txs) {
  const t = txs[txs.length - 1];
  const others = categoriesOf(t.type).filter((c) => c.id !== t.categoryId).slice(0, 8);
  return quickReplies([
    ...(txs.length === 1 ? others.map((c) => ({ label: `${c.emoji} ${c.name}`, data: `action=cat&id=${t.id}&c=${c.id}`, displayText: `ย้ายไปหมวด ${c.name}` })) : []),
    { label: '🗑 ยกเลิกทั้งหมด', data: `action=undo&ids=${txs.map((x) => x.id).join(',')}`, displayText: 'ยกเลิกรายการที่เพิ่งจด' },
    { label: '📊 สรุปวันนี้', text: 'สรุปวันนี้' },
  ]);
}

const SUBTITLES = ['อย่าลืมตรวจสอบรายการที่จดด้วยนะ', 'จดแล้ว หัวไม่หมุนแน่นอน', 'เงินไปไหน หมุนตังค์รู้หมด'];

export function recordedMessage(txs, info, ctx) {
  const alt = txs.map((x) => `${x.note} ${money(x.amount)}`).join(', ');
  const sub = info.budget?.pct >= 1 ? 'อื้อหือ ใช้เงินเกินงบแล้วนะ' : SUBTITLES[txs[0].amount % SUBTITLES.length | 0] || SUBTITLES[0];
  return flex(`จดสำเร็จ: ${alt}`, entryCard({ title: 'จดสำเร็จ ✅', subtitle: sub, txs, info, ctx }), entryQuickReplies(txs));
}

export function slipMessage(tx, slip, info, ctx) {
  const extra = [
    box(
      'vertical',
      [
        ...(slip.receiver ? [row('ผู้รับ', slip.receiver)] : []),
        ...(slip.sender ? [row('ผู้โอน', slip.sender)] : []),
        ...(slip.bank ? [row('ธนาคาร', slip.bank)] : []),
        ...(slip.ref ? [row('เลขอ้างอิง', truncate(slip.ref, 22), { rightStyle: { size: 'xxs', color: C.muted } })] : []),
      ],
      { backgroundColor: C.chip, cornerRadius: '10px', paddingAll: 'md', margin: 'md' }
    ),
  ];
  return flex(`อ่านสลิป ${money(tx.amount)} ${tx.note}`, entryCard({ title: 'อ่านสลิปสำเร็จ 🧾', subtitle: 'ตรวจยอดกับสลิปอีกทีนะ', txs: [tx], info, ctx, extra }), entryQuickReplies([tx]));
}

// ---------- การ์ดสถิติจดต่อเนื่อง ----------
export function streakMessage(n, tier, ctx) {
  const left = ctx?.logoUrl
    ? [box('vertical', [{ type: 'image', url: ctx.logoUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'cover' }], { width: '84px', height: '84px', cornerRadius: '42px', flex: 0 })]
    : [];
  const right = [
    text('เก่งมาก!', { color: C.muted, size: 'sm' }),
    text(`จดมา ${n} วัน 🔥`, { weight: 'bold', size: 'xl' }),
    text(`${tier.emoji} ${tier.name}`, { weight: 'bold', color: C.goldText }),
    bar(tier.progress, C.gold, 8),
    text(tier.next ? `อีก ${tier.next.min - n} วันเป็น ${tier.next.name}` : 'สูงสุดแล้ว หัวไม่หมุนเลยสักนิด', { size: 'xxs', color: C.muted, margin: 'sm' }),
  ];
  return flex(`เก่งมาก! จดต่อเนื่อง ${n} วัน`, {
    type: 'bubble',
    size: 'kilo',
    body: box('horizontal', [...left, box('vertical', right, { paddingStart: left.length ? 'lg' : 'none', justifyContent: 'center' })], { paddingAll: 'lg', alignItems: 'center' }),
  });
}

// ---------- ปุ่ม "จด" ในเมนู ----------
export function recordPromptMessage() {
  return textMsg(
    '📝 จดได้ 3 แบบเลย\n1) พิมพ์ เช่น "ข้าวมันไก่ 50" หรือ "+เงินเดือน 25000"\n2) ถ่ายรูปสลิป/ใบเสร็จ ส่งมาได้เลย\n3) กดไมค์ แล้วพูดว่าจ่ายอะไรไป',
    quickReplies([
      { label: '📷 ถ่ายสลิป/ใบเสร็จ', camera: true },
      { label: '🖼 เลือกรูปสลิป', cameraRoll: true },
      { label: '☕ กาแฟ 45', text: 'กาแฟ 45' },
      { label: '🍚 ข้าว 50', text: 'ข้าว 50' },
      { label: '💰 +เงินเดือน', text: '+เงินเดือน 25000' },
    ])
  );
}

/** เมนูแก้ไขรายการ (เมื่อไม่มี LIFF) */
export function editMenuMessage(tx) {
  const others = categoriesOf(tx.type).filter((c) => c.id !== tx.categoryId).slice(0, 9);
  return textMsg(
    `✏️ แก้ "${tx.note}" ${money(tx.amount)}\nเลือกหมวดใหม่ หรือพิมพ์ใหม่แล้วลบอันเดิมก็ได้นะ`,
    quickReplies([
      ...others.map((c) => ({ label: `${c.emoji} ${c.name}`, data: `action=cat&id=${tx.id}&c=${c.id}`, displayText: `ย้ายไปหมวด ${c.name}` })),
      { label: tx.type === 'income' ? '↔ เป็นรายจ่าย' : '↔ เป็นรายรับ', data: `action=flip&id=${tx.id}` },
      { label: '🗑 ลบรายการนี้', data: `action=del&id=${tx.id}`, displayText: `ลบ ${truncate(tx.note, 15)}` },
    ])
  );
}

/** รูปนายหัวหมุนตามอารมณ์ (ถ้าไม่มีรูป ใช้โลโก้แทน) */
function moodPic(level, ctx) {
  return ctx?.moods?.[level] || ctx?.logoUrl || '';
}

/** บรรทัดคำพูดนายหัวหมุนตามสถานะงบ */
function moodPill(budget, ctx) {
  const m = moodFor(budget);
  const pic = moodPic(m.level, ctx);
  const face = pic
    ? box('vertical', [{ type: 'image', url: pic, size: 'full', aspectRatio: '1:1', aspectMode: 'fit' }], { flex: 0, width: '44px', height: '44px' })
    : text('👦', { flex: 0 });
  return box('horizontal', [face, box('vertical', [text(`${m.title} ${m.face}`, { weight: 'bold', size: 'xs' }), text(m.line, { size: 'xxs', color: C.muted })], { margin: 'sm' })], {
    backgroundColor: m.level === 'spin' ? C.redTint : C.tint,
    alignItems: 'center',
    cornerRadius: '12px',
    paddingAll: 'md',
    margin: 'lg',
  });
}

/** ช่องสรุปแบบป้านวล (รายจ่าย / รายรับ) */
function statTile(label, amount, { bg, color, sub, barPct, barColor } = {}) {
  return box(
    'vertical',
    [
      text(label, { size: 'xxs', color: C.muted }),
      text(money(amount), { size: 'lg', weight: 'bold', color, wrap: false }),
      ...(sub ? [text(sub, { size: 'xxs', color: barColor === C.red ? C.red : C.muted })] : []),
      ...(barPct != null ? [bar(barPct, barColor, 5)] : []),
    ],
    { flex: 1, backgroundColor: bg, cornerRadius: '12px', paddingAll: 'md' }
  );
}

export function summaryMessage(s, ctx, { budget } = {}) {
  const body = [
    text(s.range.label, { color: C.muted, size: 'xs', align: 'center' }),
    text('เหลือเก็บ', { size: 'xs', color: C.muted, align: 'center', margin: 'md' }),
    text(money(s.net), { size: '3xl', weight: 'bold', align: 'center', color: s.net < 0 ? C.red : C.green }),
    box(
      'horizontal',
      [
        statTile('รายจ่าย', s.expense, {
          bg: C.tint,
          color: C.ink,
          ...(budget?.total
            ? {
                sub: budget.remaining >= 0 ? `เหลือ ${money(budget.remaining)} จากงบ` : `เกิน ${money(-budget.remaining)} จากงบ`,
                barPct: budget.pct,
                barColor: budgetColor(budget.pct),
              }
            : {}),
        }),
        statTile('รายรับ', s.income, { bg: C.mint, color: C.green }),
      ],
      { spacing: 'sm', margin: 'lg' }
    ),
  ];
  if (!s.cats.length) {
    body.push(text('ยังไม่มีรายจ่ายในช่วงนี้ ลองพิมพ์ "ข้าว 50" ดูสิ', { color: C.muted, size: 'xs', margin: 'lg' }));
  } else {
    body.push(sep({ margin: 'lg' }));
    for (const c of s.cats.slice(0, 6)) {
      const cat = getCategory(c.id);
      body.push(
        box(
          'horizontal',
          [
            box('vertical', [{ type: 'filler' }], { width: '10px', height: '10px', cornerRadius: '5px', backgroundColor: cat.color, flex: 0 }),
            text(cat.name, { flex: 5, margin: 'md', size: 'sm' }),
            text(pct(c.pct), { flex: 2, align: 'end', size: 'xs', color: C.muted }),
            text(money(c.total), { flex: 3, align: 'end', size: 'sm', weight: 'bold' }),
          ],
          { margin: 'md', alignItems: 'center' }
        )
      );
    }
  }
  if (budget?.total) body.push(moodPill(budget, ctx));
  body.push(text(`ทั้งหมด ${s.count} รายการ`, { size: 'xxs', color: C.muted, margin: 'md', align: 'end' }));
  const footer = [];
  if (ctx?.links?.dashboard) footer.push(btn('ดูสรุปเต็มๆ', uri(ctx.links.view ? ctx.links.view('home') : ctx.links.dashboard)));
  const qr = quickReplies([
    { label: '☀️ วันนี้', text: 'สรุปวันนี้' },
    { label: '📅 สัปดาห์นี้', text: 'สรุปสัปดาห์' },
    { label: '🗓 เดือนนี้', text: 'สรุปเดือนนี้' },
    { label: '⏮ เดือนที่แล้ว', text: 'สรุปเดือนที่แล้ว' },
    { label: '🧾 รายการล่าสุด', text: 'รายการ' },
  ]);
  return flex(`สรุป ${s.range.label}: จ่าย ${money(s.expense)} รับ ${money(s.income)}`, bubble({ title: 'สรุป 📊', subtitle: 'เงินหมุนไปไหนบ้าง', body, footer, ctx }), qr);
}

export function listMessage(txs, ctx) {
  const body = txs.length
    ? [text('แตะ ✕ เพื่อลบรายการ', { size: 'xxs', color: C.muted }), ...txs.map((t) => txRow(t, { withDate: true, deletable: true, accounts: ctx?.accounts }))]
    : [text('ยังไม่มีรายการเลย เริ่มจดด้วยการพิมพ์ "กาแฟ 45"', { color: C.muted })];
  const footer = ctx?.links?.dashboard ? [btn('ดูทั้งหมด / แก้ไข', uri(ctx.links.dashboard))] : [];
  return flex('รายการล่าสุด', bubble({ title: 'รายการล่าสุด', subtitle: `${txs.length} รายการ`, body, footer, ctx }));
}

export function budgetMessage(b, ctx) {
  const body = [];
  if (!b.total && !b.cats.length) {
    body.push(text('ยังไม่ได้ตั้งงบเลย', { weight: 'bold' }));
    body.push(text('พิมพ์ "งบ 15000" เพื่อตั้งงบทั้งเดือน\nหรือ "งบ อาหาร 5000" เพื่อตั้งงบรายหมวด', { color: C.muted, size: 'xs', margin: 'md' }));
  }
  if (b.total) {
    body.push(text('งบรวมเดือนนี้', { size: 'xs', color: C.muted }));
    body.push(text(`${money(b.spent)} / ${money(b.total)}`, { size: 'lg', weight: 'bold', color: b.pct >= 1 ? C.red : C.ink }));
    body.push(bar(b.pct, budgetColor(b.pct)));
    body.push(
      text(b.remaining >= 0 ? `เหลือ ${money(b.remaining)} · ใช้ได้วันละ ~${money(b.perDayLeft)}` : `เกินงบไปแล้ว ${money(-b.remaining)} 😵‍💫`, {
        size: 'xs',
        color: C.muted,
        margin: 'sm',
      })
    );
    body.push(moodPill(b, ctx));
  }
  if (b.cats.length) {
    body.push(sep({ margin: 'lg' }));
    for (const c of b.cats) {
      const cat = getCategory(c.id);
      body.push(
        box(
          'vertical',
          [
            box('horizontal', [text(`${cat.emoji} ${cat.name}`, { flex: 5 }), text(`${money(c.spent)} / ${money(c.limit)}`, { flex: 5, align: 'end', size: 'xs', color: C.muted })]),
            bar(c.pct, budgetColor(c.pct)),
          ],
          { margin: 'md' }
        )
      );
    }
  }
  const qr = quickReplies([
    { label: 'งบ 10,000', text: 'งบ 10000' },
    { label: 'งบ 15,000', text: 'งบ 15000' },
    { label: 'งบ 20,000', text: 'งบ 20000' },
    { label: 'งบอาหาร 5,000', text: 'งบ อาหาร 5000' },
  ]);
  return flex('งบประมาณเดือนนี้', bubble({ title: 'งบประมาณ', subtitle: 'คุมงบให้หัวไม่หมุน', body, ctx }), qr);
}

export function alertMessage(alerts) {
  const lines = alerts.map((a) => (a.level >= 1 ? `🚨 ${a.label} ใช้ครบ ${pct(a.pct)} แล้ว! เบรกก่อนนะ` : `⚠️ ${a.label} ใช้ไปแล้ว ${pct(a.pct)} ระวังหัวหมุน~`));
  return textMsg(lines.join('\n'));
}

export function goalsMessage(goals, ctx) {
  const body = goals.length
    ? goals.flatMap((g, i) => [
        ...(i ? [sep()] : []),
        box('horizontal', [text(`${g.emoji} ${g.name}`, { weight: 'bold', flex: 5 }), text(pct(g.saved / g.target), { align: 'end', flex: 2, color: C.goldText, weight: 'bold' })], { margin: 'md' }),
        text(`${money(g.saved)} / ${money(g.target)}`, { size: 'xs', color: C.muted }),
        bar(g.saved / g.target),
      ])
    : [text('ยังไม่มีเป้าหมายการออม', { weight: 'bold' }), text('พิมพ์ "เป้า เที่ยวญี่ปุ่น 50000" เพื่อสร้าง\nแล้ว "ออม เที่ยวญี่ปุ่น 1000" เพื่อหยอดกระปุก', { size: 'xs', color: C.muted, margin: 'md' })];
  return flex('เป้าหมายการออม', bubble({ title: 'เป้าหมายการออม', subtitle: 'หมุนเงินเข้ากระปุก', body, ctx }));
}

export function recurringMessage(items, ctx) {
  const body = items.length
    ? items.map((r, i) => {
        const cat = getCategory(r.categoryId);
        return box(
          'horizontal',
          [
            text(`${i + 1}.`, { flex: 0, color: C.muted }),
            box('vertical', [text(`${cat.emoji} ${r.note}`, { weight: 'bold' }), text(`ทุกวันที่ ${r.day} · ${r.type === 'income' ? 'รายรับ' : 'รายจ่าย'}`, { size: 'xxs', color: C.muted })], { flex: 6, paddingStart: 'sm' }),
            text(money(r.amount), { flex: 3, align: 'end', color: C.goldText, weight: 'bold' }),
          ],
          { margin: 'md' }
        );
      })
    : [text('ยังไม่มีรายการประจำ', { weight: 'bold' })];
  body.push(text('เพิ่ม: "ประจำ ค่าเน็ต 599 ทุกวันที่ 5"\nลบ: "ลบประจำ 1"', { size: 'xs', color: C.muted, margin: 'lg' }));
  return flex('รายการประจำ', bubble({ title: 'รายการประจำเดือน', subtitle: 'บันทึกให้อัตโนมัติทุกเดือน', body, ctx }));
}

export function welcomeMessage(name, ctx) {
  const body = [
    text(`สวัสดี ${name} 👋`, { weight: 'bold', size: 'lg' }),
    text('ผม "นายหัวหมุน" จะช่วยจดรายรับรายจ่ายให้คุณ ไม่ต้องโหลดแอปเพิ่ม แค่แชทมาเหมือนคุยกับเพื่อน', { color: C.muted, size: 'sm', margin: 'md' }),
    sep({ margin: 'lg' }),
    ...[
      ['💬', 'พิมพ์ "ข้าว 50" หรือ "กาแฟ 45 ขนม 30"'],
      ['🧾', 'ส่งรูปสลิป หรือข้อความเสียง 🎤 ก็ได้'],
      ['💰', 'รายรับ ใส่ + นำหน้า "+เงินเดือน 25000"'],
      ['📊', 'พิมพ์ "สรุป" ดูยอดวันนี้ / "สรุปเดือนนี้"'],
      ['🎯', 'ตั้งงบ "งบ 15000" แจ้งเตือนเมื่อใกล้เกิน'],
    ].map(([e, t]) => box('horizontal', [text(e, { flex: 0 }), text(t, { size: 'sm', margin: 'md' })], { margin: 'md' })),
  ];
  const footer = [btn('ลองจดรายการแรก', msg('กาแฟ 45')), btn('วิธีใช้ทั้งหมด', msg('วิธีใช้'), { style: 'primary', color: C.ink })];
  return flex('ยินดีต้อนรับสู่หมุนตังค์', bubble({ title: 'หมุนตังค์', subtitle: 'ผู้ช่วยจดเงินใน LINE', body, footer, ctx }));
}

export function helpMessage(ctx) {
  const card = (title, lines, example) =>
    bubble({
      title,
      ctx,
      size: 'kilo',
      body: [...lines.map((l) => text(l, { size: 'sm', margin: 'sm' })), sep({ margin: 'lg' }), text('ลองแตะ 👇', { size: 'xxs', color: C.muted, margin: 'md' })],
      footer: [btn(example, msg(example))],
    });
  return flex(
    'วิธีใช้หมุนตังค์',
    {
      type: 'carousel',
      contents: [
        card('💬 จดด้วยแชท', ['• ข้าวมันไก่ 50', '• กาแฟ 45 ขนม 30 (หลายรายการ)', '• เมื่อวาน แท็กซี่ 120', '• 12/10 ค่าไฟ 850', '• ชาบู 459 บัตร ktc (ระบุบัญชี)', '• พิมพ์หลายบรรทัดได้'], 'ข้าวมันไก่ 50'),
        card('💰 รายรับ', ['• +เงินเดือน 25000', '• รับ ขายของ 1.2k', '• ถูกหวย 2000', 'ใส่ + หรือ "รับ" นำหน้า', 'หรือใช้คำอย่าง เงินเดือน/โบนัส'], '+เงินเดือน 25000'),
        card('🧾 สลิป & AI', ['• ส่งรูปสลิปโอนเงิน/ใบเสร็จ', '• AI อ่านยอด วันที่ ผู้รับ', '• กันสลิปซ้ำอัตโนมัติ', '• พิมพ์ประโยคยาวๆ ก็เข้าใจ', '• ส่งรูปตามหลังรายการ = แนบหลักฐาน'], 'วันนี้กินข้าวกับแฟน 350 แล้วเติมน้ำมัน 500'),
        card('🎤 เสียง & PDF', ['• กดไมค์ พูด "ข้าวมันไก่ห้าสิบบาท"', '• ส่งไฟล์ PDF Statement ธนาคาร', '  นำเข้าทั้งเดือนในครั้งเดียว', '• ยกเลิกทั้งชุดได้ปุ่มเดียว', '• PDF ที่มีรหัสผ่าน ปลดล็อกก่อนส่ง'], 'รายการ'),
        card('👥 กลุ่ม & รอบบัญชี', ['• เชิญบอทเข้ากลุ่ม LINE', '  = สมุดบัญชีร่วมของครอบครัว', '• ระบบจำว่าใครจด', '• รอบบัญชี 25 (เริ่มวันเงินเดือนออก)', '• รายงานสรุปส่งให้ทุกต้นรอบ'], 'รอบบัญชี'),
        card('📊 สรุป', ['• สรุป / สรุปวันนี้', '• สรุปสัปดาห์ / สรุปเดือนนี้', '• สรุปเดือนที่แล้ว', '• รายการ (ดู/ลบรายการล่าสุด)', '• ลบ (ลบรายการล่าสุด)', '• ส่งออก (ไฟล์ Excel/CSV)'], 'สรุปเดือนนี้'),
        card('🎯 งบ & เป้าหมาย', ['• งบ 15000 (งบทั้งเดือน)', '• งบ อาหาร 5000 (รายหมวด)', '• เป้า เที่ยวญี่ปุ่น 50000', '• ออม เที่ยวญี่ปุ่น 1000', '• เป้า (ดูความคืบหน้า)'], 'งบ'),
        card('👛 บัญชี & บัตร', ['• บัญชี (ดูยอดทุกบัญชี/บัตร)', '• ข้าว 50 กสิกร (จ่ายจากบัญชีไหน)', '• ยอด กสิกร 12000 (ตั้งยอดเงิน)', '• โอน 500 กสิกร ไป ทรู', '• จ่ายบัตร ktc 3000', '• เพิ่มบัตร KTC วงเงิน 20000'], 'บัญชี'),
        card('⏰ อัตโนมัติ', ['• เตือน 21:00 (เตือนจดทุกวัน)', '• ปิดเตือน', '• ประจำ ค่าเน็ต 599 ทุกวันที่ 5', '• หาร 900 3 (หารบิล)', '• หมวด (ดูหมวดทั้งหมด)'], 'เตือน 21:00'),
      ],
    },
    quickReplies([
      { label: '📊 สรุป', text: 'สรุป' },
      { label: '🎯 งบ', text: 'งบ' },
      { label: '🧾 รายการ', text: 'รายการ' },
      ...(ctx?.links?.dashboard ? [{ label: '📱 แดชบอร์ด', uri: ctx.links.dashboard }] : []),
    ])
  );
}

export function categoriesMessage(ctx) {
  const list = (type) =>
    categoriesOf(type).map((c) =>
      box('horizontal', [text(c.emoji, { flex: 0 }), box('vertical', [text(c.name, { weight: 'bold', size: 'sm' }), text(c.keywords.slice(0, 6).join(', ') || '-', { size: 'xxs', color: C.muted })], { paddingStart: 'md' })], { margin: 'md' })
    );
  return flex('หมวดหมู่ทั้งหมด', {
    type: 'carousel',
    contents: [
      bubble({ title: 'หมวดรายจ่าย', ctx, body: list('expense') }),
      bubble({ title: 'หมวดรายรับ', ctx, body: [...list('income'), sep({ margin: 'lg' }), text('จัดหมวดผิด? แตะปุ่มหมวดใต้ข้อความ ระบบจะจำคำนั้นไว้ให้ครั้งหน้า', { size: 'xs', color: C.muted, margin: 'md' })] }),
    ],
  });
}

// ---------- ตั้งค่าครั้งแรก ----------
export function setupMessage(step, user) {
  const pb = (label, v, displayText) => ({ label, data: `action=setup&step=${step}&v=${v}`, displayText: displayText || label });
  if (step === 'cycle') {
    return textMsg(
      '⚙️ ตั้งค่าเริ่มต้น (1/3)\nรอบเดือนของคุณเริ่มวันที่เท่าไร?\nแนะนำให้ตั้งเป็นวันที่เงินเดือนออก สรุปและงบจะนับตามรอบนี้',
      quickReplies([
        pb('📅 วันที่ 1', 1, 'เริ่มรอบวันที่ 1'),
        pb('วันที่ 15', 15, 'เริ่มรอบวันที่ 15'),
        pb('วันที่ 25', 25, 'เริ่มรอบวันที่ 25'),
        pb('วันที่ 26', 26, 'เริ่มรอบวันที่ 26'),
        pb('วันที่ 28', 28, 'เริ่มรอบวันที่ 28'),
        pb('สิ้นเดือน (30)', 30, 'เริ่มรอบวันที่ 30'),
      ])
    );
  }
  if (step === 'budget') {
    return textMsg(
      `👍 รอบเดือนเริ่มวันที่ ${user.settings.cycleStartDay}\n\n⚙️ ตั้งค่าเริ่มต้น (2/3)\nอยากตั้งงบใช้จ่ายต่อเดือนเท่าไร? ใช้ใกล้หมดจะเตือนให้\n(หรือพิมพ์เองทีหลัง เช่น "งบ 12000")`,
      quickReplies([
        pb('฿5,000', 5000),
        pb('฿10,000', 10000),
        pb('฿15,000', 15000),
        pb('฿20,000', 20000),
        pb('฿30,000', 30000),
        pb('ยังไม่ตั้งงบ', 0),
      ])
    );
  }
  if (step === 'reminder') {
    return textMsg(
      `${user.settings.monthlyBudget ? `👍 งบเดือนละ ${money(user.settings.monthlyBudget)}\n\n` : ''}⚙️ ตั้งค่าเริ่มต้น (3/3)\nให้นายหัวหมุนเตือนจดรายจ่ายทุกวันกี่โมง?`,
      quickReplies([pb('⏰ 20:00', '20:00'), pb('⏰ 21:00', '21:00'), pb('⏰ 22:00', '22:00'), pb('🔕 ไม่ต้องเตือน', 'off')])
    );
  }
  return textMsg(
    `✅ ตั้งค่าเสร็จแล้ว!\n• รอบเดือนเริ่มวันที่ ${user.settings.cycleStartDay}\n• งบ ${user.settings.monthlyBudget ? money(user.settings.monthlyBudget) : 'ยังไม่ตั้ง'}\n• เตือน ${user.settings.reminder ? `${user.settings.reminder} น.` : 'ปิด'}\n• รายงานประจำเดือน ส่งทุกวันแรกของรอบ 09:00 น.\n\nลองจดรายการแรกเลย พิมพ์ "ข้าว 50" หรือส่งรูปสลิป/ข้อความเสียงมาก็ได้ 🌀\n(แก้ทีหลังได้ พิมพ์ "ตั้งค่า")`,
    quickReplies([
      { label: '☕ กาแฟ 45', text: 'กาแฟ 45' },
      { label: '📖 วิธีใช้', text: 'วิธีใช้' },
    ])
  );
}

export function groupWelcomeMessage(ctx) {
  const body = [
    text('สวัสดีทุกคน 👋', { weight: 'bold', size: 'lg' }),
    text('กลุ่มนี้มีสมุดบัญชีร่วมแล้ว ใครจ่ายอะไรพิมพ์บอกได้เลย ระบบจะจำว่าใครจด', { color: C.muted, size: 'sm', margin: 'md' }),
    sep({ margin: 'lg' }),
    ...[
      ['💬', 'ค่าข้าวเย็น 450 (ชื่อ + ยอด)'],
      ['📝', 'จด วันนี้ซื้อของเข้าบ้าน 820 (ประโยคยาวใส่ "จด" นำหน้า)'],
      ['🧾', 'ส่งรูปสลิปมาในกลุ่ม'],
      ['📊', 'สรุปเดือนนี้ / งบ 20000 / หาร 900 3'],
    ].map(([e, t]) => box('horizontal', [text(e, { flex: 0 }), text(t, { size: 'sm', margin: 'md' })], { margin: 'md' })),
    text('ข้อความคุยกันทั่วไปจะไม่ถูกจดนะ', { size: 'xxs', color: C.muted, margin: 'lg' }),
  ];
  const footer = ctx?.links?.dashboard ? [btn('แดชบอร์ดของกลุ่ม', uri(ctx.links.dashboard))] : [];
  return flex('หมุนตังค์พร้อมจดให้กลุ่มนี้แล้ว', bubble({ title: 'หมุนตังค์ · กลุ่ม', subtitle: 'สมุดบัญชีร่วม', body, footer, ctx }));
}

export function importedMessage(txs, batch, fileName, ctx) {
  const exp = txs.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const inc = txs.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const dates = txs.map((t) => t.date).sort();
  const body = [
    text('นำเข้า Statement แล้ว ✓', { color: C.green, size: 'xs', weight: 'bold' }),
    text(`${txs.length} รายการ`, { size: 'xxl', weight: 'bold', color: C.goldText, margin: 'sm' }),
    text(`${thaiDate(dates[0])} - ${thaiDate(dates[dates.length - 1])}`, { size: 'xs', color: C.muted }),
    sep(),
    row('รายจ่าย', money(exp)),
    row('รายรับ', money(inc), { rightStyle: { color: C.green } }),
    sep(),
    ...txs.slice(0, 5).map((t) => txRow(t, { withDate: true, accounts: ctx?.accounts })),
    ...(txs.length > 5 ? [text(`และอีก ${txs.length - 5} รายการ`, { size: 'xxs', color: C.muted, margin: 'md', align: 'end' })] : []),
  ];
  const footer = [btn('ยกเลิกการนำเข้าทั้งหมด', postback(`action=undobatch&b=${batch}`, 'ยกเลิกการนำเข้า'), { style: 'primary', color: C.ink })];
  if (ctx?.links?.dashboard) footer.unshift(btn('ตรวจในแดชบอร์ด', uri(ctx.links.dashboard)));
  return flex(`นำเข้า ${txs.length} รายการจาก ${fileName}`, bubble({ title: 'หมุนตังค์ · PDF', subtitle: truncate(fileName, 40), body, footer, ctx }));
}

/** ขอยืนยันก่อนลบข้อมูล (ปุ่มใช้ได้ 10 นาที) */
export function wipeConfirmMessage(count, now) {
  return textMsg(
    `⚠️ ลบข้อมูลแล้วกู้คืนไม่ได้นะ (ตอนนี้มี ${count} รายการ)\nแนะนำให้พิมพ์ "ส่งออก" เก็บไฟล์ไว้ก่อน\n\nเลือกได้ 2 แบบ:\n🧹 ล้างรายการ = ลบรายรับรายจ่าย เป้าหมาย รายการประจำ แต่เก็บการตั้งค่าไว้\n🗑 ลบบัญชี = ลบทุกอย่าง รวมรูปสลิป เหมือนเริ่มใหม่`,
    quickReplies([
      { label: '🧹 ยืนยันล้างรายการ', data: `action=wipe&mode=tx&t=${now}`, displayText: 'ยืนยันล้างรายการทั้งหมด' },
      { label: '🗑 ยืนยันลบบัญชี', data: `action=wipe&mode=all&t=${now}`, displayText: 'ยืนยันลบบัญชีและข้อมูลทั้งหมด' },
      { label: '📥 ส่งออกก่อน', text: 'ส่งออก' },
      { label: '❌ ไม่ลบแล้ว', text: 'สรุป' },
    ])
  );
}

// ---------- กระเป๋าเงิน ----------
function accountRow(a, ctx) {
  const isCard = a.type === 'card';
  const right = isCard ? (a.known || a.spent ? money(a.known ? a.used : a.spent) : '-') : a.known ? money(a.balance) : 'ตั้งยอด';
  const sub = isCard
    ? a.known && a.limit
      ? `วงเงิน ${money(a.limit)} · เหลือ ${money(a.available)}${a.dueDay ? ` · จ่ายทุกวันที่ ${a.dueDay}` : ''}`
      : a.known
        ? 'ยอดค้างจ่าย'
        : 'รอบนี้รูดไป (ยังไม่ได้ตั้งยอด)'
    : `${a.typeName} · รอบนี้ใช้ ${money(a.spent || 0)}`;
  const tap = ctx?.links?.view ? { action: uri(ctx.links.view(`wallets&acct=${a.id}`)) } : {};
  const out = [
    box(
      'horizontal',
      [
        box('vertical', [{ type: 'filler' }], { flex: 0, width: '10px', height: '10px', cornerRadius: '5px', backgroundColor: a.color }),
        box('vertical', [text(`${a.emoji} ${a.name}`, { weight: 'bold', size: 'sm' }), text(sub, { size: 'xxs', color: C.muted })], { flex: 6, paddingStart: 'md' }),
        text(right, { flex: 4, align: 'end', weight: 'bold', color: !a.known && !isCard ? C.goldText : isCard && a.pctUsed >= 0.8 ? C.red : a.balance < 0 ? C.red : C.ink, gravity: 'center', size: right === 'ตั้งยอด' ? 'xs' : 'sm' }),
      ],
      { alignItems: 'center', margin: 'lg', ...tap }
    ),
  ];
  if (isCard && a.known && a.limit) out.push(bar(a.pctUsed, budgetColor(a.pctUsed)));
  return out;
}

/** สรุปยอดทุกบัญชี/บัตร (พิมพ์ "บัญชี") */
export function accountsMessage(accs, totals, ctx) {
  const active = accs.filter((a) => !a.archived);
  const money_ = active.filter((a) => a.type !== 'card');
  const cards = active.filter((a) => a.type === 'card');
  const body = [
    text('เงินในบัญชีรวม', { size: 'xs', color: C.muted }),
    text(money(totals.cash), { size: 'xxl', weight: 'bold', color: totals.cash < 0 ? C.red : C.ink }),
    ...(totals.debt ? [text(`ยอดบัตรเครดิตค้างจ่าย ${money(totals.debt)} · สุทธิ ${money(totals.net)}`, { size: 'xxs', color: C.muted })] : []),
  ];
  if (money_.length) body.push(sep({ margin: 'lg' }), text('บัญชี / เงินสด / e-Wallet', { size: 'xs', weight: 'bold', color: C.goldText, margin: 'lg' }), ...money_.flatMap((a) => accountRow(a, ctx)));
  if (cards.length) body.push(sep({ margin: 'lg' }), text('บัตรเครดิต', { size: 'xs', weight: 'bold', color: C.goldText, margin: 'lg' }), ...cards.flatMap((a) => accountRow(a, ctx)));
  if (active.some((a) => !a.known)) {
    body.push(text('บัญชีที่ขึ้น "ตั้งยอด" พิมพ์ยอดปัจจุบันก่อน เช่น "ยอด กสิกร 12000" แล้วระบบจะคิดยอดคงเหลือให้ทุกครั้งที่จด', { size: 'xxs', color: C.muted, margin: 'lg' }));
  }
  body.push(sep({ margin: 'lg' }), text('โอนระหว่างบัญชี: "โอน 500 กสิกร ไป ทรู"\nจ่ายบัตร: "จ่ายบัตร ktc 3000 จาก กสิกร"\nกดเงินสด: "กดเงิน 2000 กสิกร"', { size: 'xxs', color: C.muted, margin: 'md' }));
  const footer = ctx?.links?.view ? [btn('จัดการบัญชีและบัตร', uri(ctx.links.view('wallets')))] : [];
  return flex(
    `กระเป๋าเงิน: รวม ${money(totals.cash)}`,
    bubble({ title: 'กระเป๋าเงิน', subtitle: 'ยอดแต่ละบัญชีและบัตรเครดิต', body, footer, ctx }),
    quickReplies([
      { label: '🏦 เพิ่มบัญชี', text: 'เพิ่มบัญชี' },
      { label: '💳 เพิ่มบัตร', text: 'เพิ่มบัตร' },
      { label: '📱 เพิ่ม e-Wallet', text: 'เพิ่มวอลเล็ท' },
      { label: '📊 สรุปเดือนนี้', text: 'สรุปเดือนนี้' },
    ])
  );
}

/** เลือกบัญชีอื่นทั้งหมด (ปุ่ม "อื่นๆ" ใต้การ์ดจดสำเร็จ) */
export function walletPickMessage(tx, accounts) {
  const list = accounts.filter((a) => !a.archived);
  return textMsg(
    `"${tx.note}" ${money(tx.amount)} จ่ายจากบัญชีไหน?`,
    quickReplies(list.map((a) => ({ label: `${a.emoji} ${a.name}`, data: `action=wallet&id=${tx.id}&w=${a.id}`, displayText: `จ่ายด้วย ${a.name}` })))
  );
}

/** วิธีเพิ่มบัญชี (พิมพ์ "เพิ่มบัญชี" เฉยๆ) */
export function addAccountHelp(kind, ctx) {
  const ex = {
    bank: ['เพิ่มบัญชี กสิกร 12000', 'เพิ่มบัญชี SCB เงินเก็บ 50000'],
    card: ['เพิ่มบัตร KTC วงเงิน 20000', 'เพิ่มบัตร กสิกร วงเงิน 30000 ใช้ไป 4500'],
    ewallet: ['เพิ่มวอลเล็ท TrueMoney 500', 'เพิ่มวอลเล็ท ShopeePay 200'],
  }[kind] || ['เพิ่มบัญชี กสิกร 12000'];
  const what = { bank: 'บัญชีธนาคาร', card: 'บัตรเครดิต', ewallet: 'e-Wallet' }[kind] || 'บัญชี';
  const lines =
    kind === 'card'
      ? 'พิมพ์ชื่อบัตร + วงเงิน (ถ้ามียอดที่ใช้ไปแล้ว ใส่ "ใช้ไป" ต่อท้าย)'
      : 'พิมพ์ชื่อบัญชี + ยอดเงินตอนนี้ (ใส่ชื่อธนาคารในชื่อได้เลย เช่น กสิกร, SCB, กรุงไทย)';
  return textMsg(
    `➕ เพิ่ม${what}\n${lines}\n\nตัวอย่าง:\n${ex.map((e) => `• ${e}`).join('\n')}${ctx?.links?.view ? `\n\nหรือเพิ่มในแอป: ${ctx.links.view('wallets')}` : ''}`,
    quickReplies(ex.map((e) => ({ label: truncate(e, 20), text: e })))
  );
}

export { CATEGORY_MAP };
