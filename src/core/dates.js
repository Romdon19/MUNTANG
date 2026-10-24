// วันที่ทั้งหมดในระบบเป็นเวลาไทย (UTC+7, ไม่มี DST) เก็บเป็นสตริง YYYY-MM-DD
const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

export const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const TH_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
export const TH_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

/** Date object shifted so its UTC fields read as Bangkok wall-clock time. */
export function bkk(now = new Date()) {
  return new Date(now.getTime() + TZ_OFFSET_MS);
}

export function todayStr(now = new Date()) {
  return bkk(now).toISOString().slice(0, 10);
}

export function timeStr(now = new Date()) {
  return bkk(now).toISOString().slice(11, 16);
}

export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fmt(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(str, n) {
  const d = parseDate(str);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}

export function monthKey(str) {
  return str.slice(0, 7);
}

export function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function weekday(str) {
  return parseDate(str).getUTCDay();
}

/** "24 ต.ค. 69" */
export function thaiDate(str, { year = true } = {}) {
  const [y, m, d] = str.split('-').map(Number);
  const be = String((y + 543) % 100).padStart(2, '0');
  return `${d} ${TH_MONTHS[m - 1]}${year ? ` ${be}` : ''}`;
}

/** "ตุลาคม 2569" */
export function thaiMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return `${TH_MONTHS_FULL[m - 1]} ${y + 543}`;
}

export function rangeFor(name, now = new Date()) {
  const today = todayStr(now);
  const month = monthKey(today);
  switch (name) {
    case 'today':
      return { from: today, to: today, label: `วันนี้ · ${thaiDate(today)}` };
    case 'yesterday': {
      const y = addDays(today, -1);
      return { from: y, to: y, label: `เมื่อวาน · ${thaiDate(y)}` };
    }
    case 'week': {
      // สัปดาห์เริ่มวันจันทร์
      const offset = (weekday(today) + 6) % 7;
      const from = addDays(today, -offset);
      return { from, to: today, label: `สัปดาห์นี้ · ${thaiDate(from, { year: false })} - ${thaiDate(today)}` };
    }
    case 'lastmonth': {
      const lm = addMonths(month, -1);
      return { from: `${lm}-01`, to: `${lm}-${daysInMonth(lm)}`, label: thaiMonth(lm) };
    }
    case 'month':
    default:
      return { from: `${month}-01`, to: `${month}-${daysInMonth(month)}`, label: thaiMonth(month) };
  }
}

export function monthRange(month) {
  return { from: `${month}-01`, to: `${month}-${daysInMonth(month)}`, label: thaiMonth(month) };
}
