// กระเป๋าเงิน: บัญชีธนาคารหลายเล่ม · e-Wallet · บัตรเครดิต (วงเงิน/ยอดใช้) · เงินสด
// ทุกรายการ (tx.wallet) ชี้ไปที่ id ของบัญชีในนี้ — id เดิม cash/bank/card ยังใช้ได้กับข้อมูลเก่า

export const ACCOUNT_TYPES = {
  cash: { name: 'เงินสด', emoji: '💵' },
  bank: { name: 'บัญชีธนาคาร', emoji: '🏦' },
  ewallet: { name: 'e-Wallet', emoji: '📱' },
  card: { name: 'บัตรเครดิต', emoji: '💳' },
};

// ธนาคาร/ผู้ให้บริการที่เลือกได้ (สีไว้ทำจุดสีแยกบัญชี ไม่ได้ใช้โลโก้จริง)
// words = คำที่พิมพ์ในแชทแล้วให้เข้าบัญชีนี้ (ระวังคำกว้างๆ เช่น "ทรู" ที่ชนกับค่าบิลทรู)
export const PROVIDERS = [
  { id: 'kbank', name: 'กสิกรไทย', short: 'กสิกร', color: '#00A950', types: ['bank', 'card'], words: ['กสิกร', 'kbank', 'k plus', 'kplus', 'เคแบงก์'] },
  { id: 'scb', name: 'ไทยพาณิชย์', short: 'SCB', color: '#4E2E7F', types: ['bank', 'card'], words: ['ไทยพาณิชย์', 'ไทยพาณิช', 'scb'] },
  { id: 'ktb', name: 'กรุงไทย', short: 'กรุงไทย', color: '#00A6E6', types: ['bank', 'card'], words: ['กรุงไทย', 'ktb'] },
  { id: 'bbl', name: 'กรุงเทพ', short: 'BBL', color: '#1E4598', types: ['bank', 'card'], words: ['bbl', 'บัวหลวง', 'ธนาคารกรุงเทพ', 'แบงก์กรุงเทพ'] },
  { id: 'bay', name: 'กรุงศรี', short: 'กรุงศรี', color: '#C9A100', types: ['bank', 'card'], words: ['กรุงศรี', 'krungsri'] },
  { id: 'ttb', name: 'ทีทีบี', short: 'ttb', color: '#0050F0', types: ['bank', 'card'], words: ['ttb', 'ทีทีบี', 'ทหารไทย', 'ธนชาต'] },
  { id: 'gsb', name: 'ออมสิน', short: 'ออมสิน', color: '#EB198D', types: ['bank'], words: ['ออมสิน', 'gsb', 'mymo'] },
  { id: 'baac', name: 'ธ.ก.ส.', short: 'ธ.ก.ส.', color: '#4B9B3D', types: ['bank'], words: ['ธกส', 'ธ.ก.ส', 'baac'] },
  { id: 'uob', name: 'UOB', short: 'UOB', color: '#0B3B8C', types: ['bank', 'card'], words: ['uob', 'ยูโอบี'] },
  { id: 'kkp', name: 'เกียรตินาคินภัทร', short: 'KKP', color: '#594F74', types: ['bank'], words: ['kkp', 'เกียรตินาคิน'] },
  { id: 'cimb', name: 'ซีไอเอ็มบี', short: 'CIMB', color: '#7E2F36', types: ['bank'], words: ['cimb', 'ซีไอเอ็มบี'] },
  { id: 'truemoney', name: 'TrueMoney Wallet', short: 'ทรูมันนี่', color: '#FF8300', types: ['ewallet'], words: ['truemoney', 'true money', 'ทรูมันนี่', 'ทรูวอลเล็ท', 'ทรูวอลเลท'] },
  { id: 'shopeepay', name: 'ShopeePay', short: 'ShopeePay', color: '#EE4D2D', types: ['ewallet'], words: ['shopeepay', 'shopee pay', 'ช้อปปี้เพย์'] },
  { id: 'linepay', name: 'Rabbit LINE Pay', short: 'LINE Pay', color: '#06C755', types: ['ewallet'], words: ['line pay', 'linepay', 'ไลน์เพย์', 'แรบบิท'] },
  { id: 'paotang', name: 'เป๋าตัง', short: 'เป๋าตัง', color: '#1BA5E1', types: ['ewallet'], words: ['เป๋าตัง', 'paotang'] },
  { id: 'ktc', name: 'KTC', short: 'KTC', color: '#E2231A', types: ['card'], words: ['ktc', 'เคทีซี'] },
  { id: 'aeon', name: 'AEON', short: 'AEON', color: '#B6007A', types: ['card'], words: ['aeon', 'อิออน'] },
  { id: 'cardx', name: 'CardX', short: 'CardX', color: '#5E2CA5', types: ['card'], words: ['cardx', 'การ์ดเอ็กซ์'] },
];
export const PROVIDER_MAP = Object.fromEntries(PROVIDERS.map((p) => [p.id, p]));

const TYPE_COLOR = { cash: '#2F9E44', bank: '#475569', ewallet: '#F97316', card: '#1A1A1A' };

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
  if (acc) return acc.id;
  const active = activeAccounts(user);
  if (ACCOUNT_TYPES[w]) {
    const hit = active.find((a) => a.type === w) || (w === 'bank' ? active.find((a) => a.type === 'ewallet') : null);
    if (hit) return hit.id;
  }
  const def = active.find((a) => a.id === user.settings?.defaultWallet);
  return (def || active[0] || user.accounts?.[0] || { id: 'cash' }).id;
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
 */
export function guessAccount(text, accounts, { strict = false, defaultWallet } = {}) {
  const t = String(text || '').toLowerCase();
  const list = (accounts || []).filter((a) => !a.archived);
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
 * - บัตรเครดิต: used = ยอดค้างตั้งต้น + รูด − คืนเงิน/ชำระบัตร, available = วงเงิน − used
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
    return { ...d, known, balance: round((a.opening || 0) + f.in - f.out), spent: round(f.spent), count: f.count };
  });
}

/** ยอดรวม: เงินที่มีจริง (เฉพาะบัญชีที่ตั้งยอดแล้ว) และยอดค้างบัตร */
export function accountTotals(balances) {
  let cash = 0;
  let debt = 0;
  let limit = 0;
  for (const a of balances) {
    if (a.archived || !a.known) continue;
    if (a.type === 'card') {
      debt += a.used;
      limit += a.limit || 0;
    } else cash += a.balance;
  }
  return { cash: Math.round(cash * 100) / 100, debt: Math.round(debt * 100) / 100, limit, net: Math.round((cash - debt) * 100) / 100 };
}
