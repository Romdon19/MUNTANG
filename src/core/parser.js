// แปลงข้อความแชทภาษาไทยเป็นรายการรายรับ-รายจ่าย
// ตัวอย่างที่รองรับ:
//   "ข้าวมันไก่ 50"            "กาแฟ 45 ขนม 30"         "50 ค่ารถ"
//   "+เงินเดือน 25,000"         "รับ ขายของ 1.2k"        "เมื่อวาน แท็กซี่ 120"
//   "12/10 ค่าไฟ 850"           "ชาบู 459 บาท บัตร"      (หลายบรรทัด = หลายรายการ)
import { guessCategory, guessWallet } from './categories.js';
import { todayStr, addDays } from './dates.js';

const AMOUNT_RE = /(?<![a-zA-Z\d.,])(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s*(k|K|พัน|หมื่น)?(?![\d/:a-zA-Z])/g;
const DATE_NUM_RE = /(?<![\d.])(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?![\d])/;
const TIME_RE = /\b\d{1,2}[:.]\d{2}\s*(น\.|นาฬิกา)?/g;
const CURRENCY_RE = /(บาท|บ\.|฿|thb)/gi;
const INCOME_PREFIX_RE = /^\s*(\+|รับ\s|รายรับ|ได้รับ|income\b)/i;
const EXPENSE_PREFIX_RE = /^\s*(-|จ่าย\s|รายจ่าย|expense\b)/i;
const WALLET_STRIP_RE = /(บัตรเครดิต|รูดบัตร|เงินสด|จ่ายสด|โอนจ่าย|สแกนจ่าย|พร้อมเพย์)/g;

function toAmount(intPart, dec, mult) {
  let n = Number(intPart.replace(/,/g, '') + (dec ? `.${dec}` : ''));
  if (mult === 'k' || mult === 'K' || mult === 'พัน') n *= 1000;
  if (mult === 'หมื่น') n *= 10000;
  return Math.round(n * 100) / 100;
}

/** ดึงวันที่ออกจากข้อความ คืน { date, rest } */
export function extractDate(text, now = new Date()) {
  const today = todayStr(now);
  let rest = text;
  let date = null;
  const rel = [
    ['เมื่อวานซืน', -2],
    ['เมื่อวาน', -1],
    ['วันนี้', 0],
  ];
  for (const [word, offset] of rel) {
    if (rest.includes(word)) {
      date = addDays(today, offset);
      rest = rest.replace(word, ' ');
      break;
    }
  }
  const m = rest.match(DATE_NUM_RE);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      let y = m[3] ? Number(m[3]) : Number(today.slice(0, 4));
      if (y < 100) y += y > 50 ? 2500 : 2000; // 69 -> 2569 (พ.ศ.), 26 -> 2026
      if (y > 2400) y -= 543;
      let candidate = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      // ไม่ระบุปีแล้ววันที่อยู่ในอนาคต = หมายถึงปีที่แล้ว
      if (!m[3] && candidate > today) candidate = `${y - 1}${candidate.slice(4)}`;
      date = candidate;
      rest = rest.replace(m[0], ' ');
    }
  }
  return { date, rest };
}

function cleanNote(s) {
  return s
    .replace(CURRENCY_RE, ' ')
    .replace(WALLET_STRIP_RE, ' ')
    .replace(INCOME_PREFIX_RE, ' ')
    .replace(EXPENSE_PREFIX_RE, ' ')
    .replace(/[+=:,]/g, ' ')
    .replace(/^\s*[-–]\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/(\S+)( \1)+/g, '$1')
    .trim();
}

/**
 * แยก 1 บรรทัดออกเป็นหลายรายการ "กาแฟ 45 ขนม 30" -> [กาแฟ 45, ขนม 30]
 * ข้อความก่อนตัวเลขคือชื่อรายการ ถ้าไม่มี ใช้ข้อความหลังตัวเลขแทน ("50 ค่ารถ")
 */
function splitLine(line) {
  const matches = [...line.matchAll(AMOUNT_RE)];
  if (!matches.length) return [];
  const out = [];
  let cursor = 0;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const before = line.slice(cursor, m.index);
    const nextStart = i + 1 < matches.length ? matches[i + 1].index : line.length;
    let note = cleanNote(before);
    let end = m.index + m[0].length;
    if (!note) {
      const after = line.slice(end, nextStart);
      // ถ้าหลังตัวเลขมีข้อความ และรายการถัดไปมีชื่อของตัวเองอยู่แล้ว ก็ยืมได้
      note = cleanNote(after);
      if (note) end = nextStart;
    }
    out.push({ note, amount: toAmount(m[1], m[2], m[3]) });
    cursor = end;
  }
  // ข้อความท้ายที่เหลือ (เช่น "ชาบู 459 บาท") ถูกตัดไปแล้วใน cleanNote; ถ้ารายการสุดท้ายไม่มีชื่อให้ใช้ส่วนท้าย
  const tail = cleanNote(line.slice(cursor));
  if (tail && out.length && !out[out.length - 1].note) out[out.length - 1].note = tail;
  return out;
}

/**
 * parseEntries(text, { now, customKeywords, defaultWallet })
 * คืน { items: [{ note, amount, type, categoryId, date, wallet }], unparsed: [lines] }
 */
export function parseEntries(text, opts = {}) {
  const { now = new Date(), customKeywords = {}, defaultWallet = 'cash' } = opts;
  const lines = String(text)
    .split(/\n|;/)
    .map((l) => l.trim())
    .filter(Boolean);
  const items = [];
  const unparsed = [];
  const today = todayStr(now);

  // วันที่ที่บรรทัดแรกระบุไว้ (เช่น "เมื่อวาน" บรรทัดเดียว) ใช้กับบรรทัดถัดไปด้วย
  let carryDate = null;
  for (const raw of lines) {
    const { date, rest } = extractDate(raw, now);
    const lineDate = date || carryDate || today;
    if (date && !AMOUNT_RE.test(rest)) {
      carryDate = date;
      AMOUNT_RE.lastIndex = 0;
      continue;
    }
    AMOUNT_RE.lastIndex = 0;
    const withoutTime = rest.replace(TIME_RE, ' ').replace(/7-?(11|eleven)/gi, 'เซเว่น');
    const isIncome = INCOME_PREFIX_RE.test(withoutTime);
    const isExpense = EXPENSE_PREFIX_RE.test(withoutTime);
    const wallet = guessWallet(withoutTime) || defaultWallet;
    const parts = splitLine(withoutTime);
    if (!parts.length) {
      unparsed.push(raw);
      continue;
    }
    for (const p of parts) {
      if (!(p.amount > 0) || p.amount > 100_000_000) continue;
      const guess = guessCategory(p.note || withoutTime, customKeywords);
      let type = guess ? guess.type : 'expense';
      if (isIncome) type = 'income';
      if (isExpense) type = 'expense';
      let categoryId = guess && guess.type === type ? guess.id : type === 'income' ? 'other_income' : 'other';
      items.push({
        note: p.note || (type === 'income' ? 'รายรับ' : 'รายจ่าย'),
        amount: p.amount,
        type,
        categoryId,
        date: lineDate,
        wallet,
      });
    }
  }
  return { items, unparsed };
}

/** แค่เช็คว่าข้อความน่าจะเป็นการจดเงิน (มีตัวเลข) */
export function looksLikeEntry(text) {
  AMOUNT_RE.lastIndex = 0;
  const ok = AMOUNT_RE.test(text);
  AMOUNT_RE.lastIndex = 0;
  return ok;
}
