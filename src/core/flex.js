// ข้อความ Flex Message ธีม "หมุนตังค์" — ดำ Deep Space + ทอง Cosmic Gold
import { getCategory, categoriesOf, WALLET_MAP, CATEGORY_MAP } from './categories.js';
import { money, pct, truncate } from './format.js';
import { thaiDate } from './dates.js';

export const C = {
  black: '#0D0D0D',
  carbon: '#1A1A1A',
  line: '#2A2A2A',
  gold: '#FFC400',
  amber: '#FFB300',
  white: '#F5F5F5',
  muted: '#9A9A9A',
  red: '#FF6B5B',
  green: '#3DDC97',
};

// ---------- primitives ----------
const text = (t, o = {}) => ({ type: 'text', text: String(t === '' || t == null ? ' ' : t), color: C.white, size: 'sm', wrap: true, ...o });
const box = (layout, contents, o = {}) => ({ type: 'box', layout, contents, ...o });
const sep = (o = {}) => ({ type: 'separator', color: C.line, margin: 'md', ...o });
const btn = (label, action, o = {}) => ({ type: 'button', height: 'sm', style: 'primary', color: C.gold, action: { label, ...action }, ...o });
const postback = (data, displayText) => ({ type: 'postback', data, ...(displayText ? { displayText } : {}) });
const msg = (t) => ({ type: 'message', text: t });
const uri = (u) => ({ type: 'uri', uri: u });

function bar(p, color = C.gold) {
  const w = Math.max(2, Math.min(100, Math.round((p || 0) * 100)));
  return box('vertical', [box('vertical', [{ type: 'filler' }], { width: `${w}%`, backgroundColor: color, height: '6px', cornerRadius: '3px' })], {
    backgroundColor: C.line,
    height: '6px',
    cornerRadius: '3px',
    margin: 'sm',
  });
}

function header(title, subtitle, ctx) {
  const left = [];
  if (ctx?.logoUrl) {
    left.push({ type: 'image', url: ctx.logoUrl, size: '36px', aspectRatio: '1:1', aspectMode: 'cover', flex: 0 });
  }
  return box(
    'horizontal',
    [
      ...left,
      box(
        'vertical',
        [
          text(title, { color: C.gold, weight: 'bold', size: 'md' }),
          ...(subtitle ? [text(subtitle, { color: C.muted, size: 'xxs' })] : []),
        ],
        { paddingStart: left.length ? 'md' : 'none', justifyContent: 'center' }
      ),
    ],
    { backgroundColor: C.black, paddingAll: 'lg', alignItems: 'center' }
  );
}

function bubble({ title, subtitle, body, footer, ctx, size = 'mega' }) {
  const b = {
    type: 'bubble',
    size,
    header: header(title, subtitle, ctx),
    body: box('vertical', body, { backgroundColor: C.carbon, paddingAll: 'lg', spacing: 'sm' }),
    styles: { header: { backgroundColor: C.black }, body: { backgroundColor: C.carbon }, footer: { backgroundColor: C.carbon } },
  };
  if (footer?.length) b.footer = box('vertical', footer, { backgroundColor: C.carbon, paddingAll: 'md', paddingTop: 'none', spacing: 'sm' });
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

export function quickReplies(items) {
  return {
    items: items.slice(0, 13).map((it) => ({
      type: 'action',
      action: it.data
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

function txRow(t, { withDate = false, deletable = false } = {}) {
  const cat = getCategory(t.categoryId);
  const isInc = t.type === 'income';
  const contents = [
    text(cat.emoji, { flex: 0, size: 'md' }),
    box(
      'vertical',
      [
        text(truncate(t.note, 28), { size: 'sm', weight: 'bold' }),
        text(`${cat.name}${withDate ? ` · ${thaiDate(t.date, { year: false })}` : ''} · ${WALLET_MAP[t.wallet]?.name || ''}`, { size: 'xxs', color: C.muted }),
      ],
      { flex: 5, paddingStart: 'md' }
    ),
    text(money(isInc ? t.amount : -t.amount, { sign: true }), { flex: 3, align: 'end', weight: 'bold', color: isInc ? C.green : C.white, gravity: 'center' }),
  ];
  if (deletable) {
    contents.push(
      box('vertical', [text('✕', { color: C.muted, size: 'xs', align: 'center' })], {
        flex: 0,
        width: '24px',
        justifyContent: 'center',
        action: postback(`action=del&id=${t.id}`, `ลบ ${truncate(t.note, 15)}`),
      })
    );
  }
  return box('horizontal', contents, { margin: 'md', alignItems: 'center' });
}

// ---------- messages ----------

export function recordedMessage(txs, info, ctx) {
  const total = txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
  const body = [text('บันทึกแล้ว ✓', { color: C.green, size: 'xs', weight: 'bold' }), ...txs.map((t) => txRow(t, { withDate: t.date !== info.today }))];
  if (txs.length > 1) body.push(sep(), row('รวม', money(total, { sign: true }), { rightStyle: { color: C.gold } }));
  body.push(sep({ margin: 'lg' }));
  body.push(row('จ่ายวันนี้', money(info.todayExpense), { margin: 'md' }));
  if (info.budget?.total) {
    const b = info.budget;
    body.push(row('งบเดือนนี้เหลือ', money(b.remaining), { rightStyle: { color: b.remaining < 0 ? C.red : C.gold } }));
    body.push(bar(b.pct, b.pct >= 1 ? C.red : b.pct >= 0.8 ? C.amber : C.gold));
    if (b.perDayLeft != null && b.remaining > 0) body.push(text(`ใช้ได้อีกวันละ ~${money(b.perDayLeft)} (${b.daysLeft} วัน)`, { size: 'xxs', color: C.muted, margin: 'sm' }));
  }
  if (info.streak >= 2) body.push(text(`🔥 จดต่อเนื่อง ${info.streak} วัน หมุนเก่งมาก!`, { size: 'xs', color: C.amber, margin: 'md' }));

  const t = txs[txs.length - 1];
  const others = categoriesOf(t.type)
    .filter((c) => c.id !== t.categoryId)
    .slice(0, 8);
  const qr = quickReplies([
    ...(txs.length === 1 ? others.map((c) => ({ label: `${c.emoji} ${c.name}`, data: `action=cat&id=${t.id}&c=${c.id}`, displayText: `ย้ายไปหมวด ${c.name}` })) : []),
    { label: '🗑 ยกเลิกรายการ', data: `action=undo&ids=${txs.map((x) => x.id).join(',')}`, displayText: 'ยกเลิกรายการล่าสุด' },
    { label: '📊 สรุปวันนี้', text: 'สรุปวันนี้' },
  ]);
  const alt = txs.map((x) => `${x.note} ${money(x.amount)}`).join(', ');
  return flex(`บันทึกแล้ว: ${alt}`, bubble({ title: 'หมุนตังค์', subtitle: 'จดให้แล้วนะ', body, ctx, size: 'kilo' }), qr);
}

export function slipMessage(tx, slip, info, ctx) {
  const cat = getCategory(tx.categoryId);
  const body = [
    text('อ่านสลิปแล้ว ✓', { color: C.green, size: 'xs', weight: 'bold' }),
    text(money(tx.amount), { size: 'xxl', weight: 'bold', color: C.gold, margin: 'sm' }),
    text(`${cat.emoji} ${cat.name}`, { size: 'sm', color: C.white }),
    sep(),
    row('ผู้รับ', slip.receiver || '-'),
    row('ผู้โอน', slip.sender || '-'),
    row('ธนาคาร', slip.bank || '-'),
    row('วันที่', `${thaiDate(tx.date)}${slip.time ? ` ${slip.time}` : ''}`),
    ...(slip.ref ? [row('เลขอ้างอิง', truncate(slip.ref, 22), { rightStyle: { size: 'xxs', color: C.muted } })] : []),
    sep({ margin: 'lg' }),
    row('จ่ายวันนี้', money(info.todayExpense), { margin: 'md' }),
  ];
  const others = categoriesOf(tx.type).filter((c) => c.id !== tx.categoryId).slice(0, 9);
  const qr = quickReplies([
    ...others.map((c) => ({ label: `${c.emoji} ${c.name}`, data: `action=cat&id=${tx.id}&c=${c.id}`, displayText: `ย้ายไปหมวด ${c.name}` })),
    { label: tx.type === 'income' ? '↔ เป็นรายจ่าย' : '↔ เป็นรายรับ', data: `action=flip&id=${tx.id}` },
    { label: '🗑 ยกเลิก', data: `action=undo&ids=${tx.id}`, displayText: 'ยกเลิกสลิปนี้' },
  ]);
  return flex(`อ่านสลิป ${money(tx.amount)} ${tx.note}`, bubble({ title: 'หมุนตังค์ · สลิป', subtitle: truncate(tx.note, 40), body, ctx, size: 'kilo' }), qr);
}

export function summaryMessage(s, ctx, { budget } = {}) {
  const body = [
    text(s.range.label, { color: C.muted, size: 'xs' }),
    box(
      'horizontal',
      [
        box('vertical', [text('รายจ่าย', { size: 'xxs', color: C.muted }), text(money(s.expense), { size: 'xl', weight: 'bold', color: C.gold })], { flex: 1 }),
        box('vertical', [text('รายรับ', { size: 'xxs', color: C.muted }), text(money(s.income), { size: 'xl', weight: 'bold', color: C.green })], { flex: 1 }),
      ],
      { margin: 'md' }
    ),
    row('คงเหลือสุทธิ', money(s.net, { sign: true }), { margin: 'md', rightStyle: { color: s.net < 0 ? C.red : C.green } }),
    sep(),
  ];
  if (!s.cats.length) {
    body.push(text('ยังไม่มีรายจ่ายในช่วงนี้ ลองพิมพ์ "ข้าว 50" ดูสิ', { color: C.muted, size: 'xs', margin: 'md' }));
  } else {
    body.push(text('ใช้ไปกับอะไรบ้าง', { size: 'xs', color: C.muted, margin: 'md' }));
    for (const c of s.cats.slice(0, 6)) {
      const cat = getCategory(c.id);
      body.push(
        box(
          'vertical',
          [
            box('horizontal', [text(`${cat.emoji} ${cat.name}`, { flex: 5, size: 'sm' }), text(`${money(c.total)} · ${pct(c.pct)}`, { flex: 4, align: 'end', size: 'xs', color: C.muted })]),
            bar(c.pct),
          ],
          { margin: 'md' }
        )
      );
    }
  }
  if (budget?.total) {
    body.push(sep({ margin: 'lg' }));
    body.push(row('งบเดือนนี้', `${money(budget.spent)} / ${money(budget.total)}`, { margin: 'md' }));
    body.push(bar(budget.pct, budget.pct >= 1 ? C.red : budget.pct >= 0.8 ? C.amber : C.gold));
  }
  body.push(text(`ทั้งหมด ${s.count} รายการ`, { size: 'xxs', color: C.muted, margin: 'md', align: 'end' }));
  const footer = [];
  if (ctx?.links?.dashboard) footer.push(btn('เปิดแดชบอร์ด', uri(ctx.links.dashboard)));
  const qr = quickReplies([
    { label: '☀️ วันนี้', text: 'สรุปวันนี้' },
    { label: '📅 สัปดาห์นี้', text: 'สรุปสัปดาห์' },
    { label: '🗓 เดือนนี้', text: 'สรุปเดือนนี้' },
    { label: '⏮ เดือนที่แล้ว', text: 'สรุปเดือนที่แล้ว' },
    { label: '🧾 รายการล่าสุด', text: 'รายการ' },
  ]);
  return flex(`สรุป ${s.range.label}: จ่าย ${money(s.expense)} รับ ${money(s.income)}`, bubble({ title: 'สรุปการหมุนเงิน', subtitle: 'หมุนตังค์ report', body, footer, ctx }), qr);
}

export function listMessage(txs, ctx) {
  const body = txs.length
    ? [text('แตะ ✕ เพื่อลบรายการ', { size: 'xxs', color: C.muted }), ...txs.map((t) => txRow(t, { withDate: true, deletable: true }))]
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
    body.push(text(`${money(b.spent)} / ${money(b.total)}`, { size: 'lg', weight: 'bold', color: b.pct >= 1 ? C.red : C.gold }));
    body.push(bar(b.pct, b.pct >= 1 ? C.red : b.pct >= 0.8 ? C.amber : C.gold));
    body.push(
      text(b.remaining >= 0 ? `เหลือ ${money(b.remaining)} · ใช้ได้วันละ ~${money(b.perDayLeft)}` : `เกินงบไปแล้ว ${money(-b.remaining)} 😵‍💫`, {
        size: 'xs',
        color: C.muted,
        margin: 'sm',
      })
    );
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
            bar(c.pct, c.pct >= 1 ? C.red : c.pct >= 0.8 ? C.amber : C.gold),
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
        box('horizontal', [text(`${g.emoji} ${g.name}`, { weight: 'bold', flex: 5 }), text(pct(g.saved / g.target), { align: 'end', flex: 2, color: C.gold, weight: 'bold' })], { margin: 'md' }),
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
            text(money(r.amount), { flex: 3, align: 'end', color: C.gold, weight: 'bold' }),
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
      ['🧾', 'ส่งรูปสลิปโอนเงิน อ่านให้อัตโนมัติ'],
      ['💰', 'รายรับ ใส่ + นำหน้า "+เงินเดือน 25000"'],
      ['📊', 'พิมพ์ "สรุป" ดูยอดวันนี้ / "สรุปเดือนนี้"'],
      ['🎯', 'ตั้งงบ "งบ 15000" แจ้งเตือนเมื่อใกล้เกิน'],
    ].map(([e, t]) => box('horizontal', [text(e, { flex: 0 }), text(t, { size: 'sm', margin: 'md' })], { margin: 'md' })),
  ];
  const footer = [btn('ลองจดรายการแรก', msg('กาแฟ 45')), btn('วิธีใช้ทั้งหมด', msg('วิธีใช้'), { style: 'secondary', color: '#333333' })];
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
        card('💬 จดด้วยแชท', ['• ข้าวมันไก่ 50', '• กาแฟ 45 ขนม 30 (หลายรายการ)', '• เมื่อวาน แท็กซี่ 120', '• 12/10 ค่าไฟ 850', '• ชาบู 459 บัตร (ระบุช่องทาง)', '• พิมพ์หลายบรรทัดได้'], 'ข้าวมันไก่ 50'),
        card('💰 รายรับ', ['• +เงินเดือน 25000', '• รับ ขายของ 1.2k', '• ถูกหวย 2000', 'ใส่ + หรือ "รับ" นำหน้า', 'หรือใช้คำอย่าง เงินเดือน/โบนัส'], '+เงินเดือน 25000'),
        card('🧾 สลิป & AI', ['• ส่งรูปสลิปโอนเงิน/ใบเสร็จ', '• AI อ่านยอด วันที่ ผู้รับ', '• กันสลิปซ้ำอัตโนมัติ', '• พิมพ์ประโยคยาวๆ ก็เข้าใจ'], 'วันนี้กินข้าวกับแฟน 350 แล้วเติมน้ำมัน 500'),
        card('📊 สรุป', ['• สรุป / สรุปวันนี้', '• สรุปสัปดาห์ / สรุปเดือนนี้', '• สรุปเดือนที่แล้ว', '• รายการ (ดู/ลบรายการล่าสุด)', '• ลบ (ลบรายการล่าสุด)', '• ส่งออก (ไฟล์ Excel/CSV)'], 'สรุปเดือนนี้'),
        card('🎯 งบ & เป้าหมาย', ['• งบ 15000 (งบทั้งเดือน)', '• งบ อาหาร 5000 (รายหมวด)', '• เป้า เที่ยวญี่ปุ่น 50000', '• ออม เที่ยวญี่ปุ่น 1000', '• เป้า (ดูความคืบหน้า)'], 'งบ'),
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

export { CATEGORY_MAP };
