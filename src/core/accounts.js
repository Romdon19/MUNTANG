// กระเป๋าเงิน: บัญชีธนาคารหลายเล่ม · e-Wallet · บัตรเครดิต (วงเงิน/ยอดใช้) · เงินสด · หนี้สิน · ค้างรับ
// ทุกรายการ (tx.wallet) ชี้ไปที่ id ของบัญชีในนี้ — id เดิม cash/bank/card ยังใช้ได้กับข้อมูลเก่า
// หนี้สิน/ค้างรับ ไม่ใช้จ่ายตรงๆ แต่เคลื่อนไหวผ่าน "โอน" (ยืม = หนี้→บัญชี, จ่ายหนี้ = บัญชี→หนี้, ให้ยืม = บัญชี→ค้างรับ)

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

// ธนาคาร/ผู้ให้บริการที่เลือกได้ — ไอคอนเป็นป้ายสีประจำธนาคาร + ตัวย่อ (mono) ที่วาดเอง
// ถ้าอยากใช้โลโก้จริง วางไฟล์ public/assets/banks/<id>.png ทับได้เลย
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

/** ไอคอน SVG ขนาด 80x80: ธนาคาร = พื้นสีประจำ + ตัวย่อ, ประเภท = พื้นสี + ภาพเส้น */
export function badgeSvg(key) {
  const p = PROVIDER_MAP[key];
  const bg = p?.color || TYPE_COLOR[key] || TYPE_COLOR.bank;
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80"><rect width="80" height="80" rx="20" fill="${bg}"/>`;
  if (!p) return `${head}<g fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">${TYPE_GLYPH[key] || TYPE_GLYPH.bank}</g></svg>`;
  const m = p.mono || p.short.slice(0, 3);
  const size = m.length <= 2 ? 34 : m.length === 3 ? 26 : 20;
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
  if (name.length >= 2 && !['บัญชีธนาคาร', 'บัตรเครดิต', 'บัญชี', 'บัตร'].includes(name)) out.push(name);
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

/**
 * ยอดของทุกบัญชี
 * - บัญชี/เงินสด/e-Wallet: balance = ยอดตั้งต้น + เงินเข้า − เงินออก
 * - บัตรเครดิต/หนี้สิน: used = ยอดค้างตั้งต้น + รูด/ยืมเพิ่ม − ชำระ, available = วงเงิน − used
 * - ค้างรับ: balance = ยอดที่คนอื่นติดเราอยู่ (ให้ยืมเพิ่ม = เข้า, ได้คืน = ออก)
 * cycle = { from, to } ใช้หายอดใช้รอบนี้ (spent)
 */
export function accountBalances(user, cycle) {
  const accs = user.accounts || [];
  const flow = Object.fromEntries(accs.map((a) => [a.id, { in: 0, out: 0, spent: 0, count: 0 }]));
  for (const t of user.txs || []) {
    const f = flow[t.wallet];
    if (!f) continue;
    const a = accs.find((x) => x.id === t.wallet);
    f.count++;
    if (cycle && t.type === 'expense' && t.date >= cycle.from && t.date <= cycle.to) f.spent += t.amount;
    if (!counts(a, t)) continue;
    if (t.type === 'income') f.in += t.amount;
    else f.out += t.amount;
  }
  for (const x of user.transfers || []) {
    const from = accs.find((a) => a.id === x.from);
    const to = accs.find((a) => a.id === x.to);
    if (from) {
      flow[from.id].count++;
      if (counts(from, x)) flow[from.id].out += x.amount;
    }
    if (to) {
      flow[to.id].count++;
      if (counts(to, x)) flow[to.id].in += x.amount;
    }
  }
  const round = (n) => Math.round(n * 100) / 100;
  return accs.map((a) => {
    const f = flow[a.id];
    const d = decorate(a);
    const known = !!a.since;
    if (a.type === 'card') {
      const used = round((a.opening || 0) + f.out - f.in);
      const limit = a.limit || 0;
      return { ...d, known, used, limit, available: limit ? round(limit - used) : null, pctUsed: limit ? used / limit : 0, spent: round(f.spent), count: f.count };
    }
    if (a.type === 'loan') {
      const used = round((a.opening || 0) + f.out - f.in);
      const principal = a.principal || 0;
      return { ...d, known, used, principal, pctPaid: principal ? Math.max(0, Math.min(1, 1 - used / principal)) : 0, monthsLeft: payoffMonths(used, a.monthlyPayment, a.rate), spent: 0, count: f.count };
    }
    return { ...d, known, balance: round((a.opening || 0) + f.in - f.out), spent: round(f.spent), count: f.count };
  });
}

/** ผ่อนอีกกี่เดือนหมด (rate = ดอกเบี้ยต่อปี %) คืน null ถ้าไม่รู้ค่างวด หรือค่างวดไม่พอจ่ายดอก */
export function payoffMonths(owed, payment, rate = 0) {
  if (!(owed > 0)) return 0;
  if (!(payment > 0)) return null;
  const i = (Number(rate) || 0) / 1200;
  if (!i) return Math.ceil(owed / payment);
  if (payment <= owed * i) return null;
  return Math.ceil(-Math.log(1 - (i * owed) / payment) / Math.log(1 + i));
}

/**
 * ยอดรวม (เฉพาะบัญชีที่ตั้งยอดแล้ว)
 * cash = เงินที่ใช้ได้ (เงินสด+ธนาคาร+e-Wallet), receivable = ค้างรับ, debt = บัตร + หนี้สิน, net = สินทรัพย์ − หนี้
 */
export function accountTotals(balances) {
  const t = { cash: 0, receivable: 0, cardDebt: 0, loanDebt: 0, limit: 0, monthlyPayments: 0 };
  for (const a of balances) {
    if (a.archived || !a.known) continue;
    if (a.type === 'card') {
      t.cardDebt += a.used;
      t.limit += a.limit || 0;
    } else if (a.type === 'loan') {
      t.loanDebt += a.used;
      if (a.used > 0) t.monthlyPayments += a.monthlyPayment || 0;
    } else if (a.type === 'receivable') t.receivable += a.balance;
    else t.cash += a.balance;
  }
  const r2 = (n) => Math.round(n * 100) / 100;
  const debt = t.cardDebt + t.loanDebt;
  return {
    cash: r2(t.cash),
    receivable: r2(t.receivable),
    cardDebt: r2(t.cardDebt),
    loanDebt: r2(t.loanDebt),
    debt: r2(debt),
    limit: t.limit,
    monthlyPayments: t.monthlyPayments,
    assets: r2(t.cash + t.receivable),
    net: r2(t.cash + t.receivable - debt),
  };
}
