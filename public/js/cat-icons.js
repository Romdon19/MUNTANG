// ไอคอนหมวดแบบสติกเกอร์ (โทนเดียวกับริชเมนู: เส้นดำ เหลือง/ขาว มีประกายเล็กๆ) — ใช้แทนอีโมจิในแอป
// หมวดที่ผู้ใช้สร้างเอง (ไม่มีในนี้) ใช้อีโมจิตามเดิม
const S = 'stroke="#141414" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const Y = '#FFC400';
const Y2 = '#FFE27A';
const W = '#FFFFFF';
const R = '#F05A4F';
const G = '#7CCB7A';
const B = '#8CC4F2';
const P = '#F7A8C4';
const BR = '#C98B4E';
const GR = '#D9D6CF';
/** ประกาย 3 ขีด (แบบริชเมนู) มุมขวาบน */
const spark = (x = 38, y = 6) => `<path d="M${x} ${y + 4}l2-4M${x + 4} ${y + 7}l4-1M${x + 3} ${y + 2}l3-3" ${S}/>`;
const star = (x, y, r = 3) => `<path d="M${x} ${y - r}l${r * 0.3} ${r * 0.7} ${r * 0.7} ${r * 0.3}-${r * 0.7} ${r * 0.3}-${r * 0.3} ${r * 0.7}-${r * 0.3}-${r * 0.7}-${r * 0.7}-${r * 0.3} ${r * 0.7}-${r * 0.3}z" fill="${Y}" ${S}/>`;

export const CAT_ICONS = {
  // ---------- รายจ่าย ----------
  food: `<path d="M30 6l-4 14M36 8l-7 13" ${S}/><path d="M14 19c2-2 4 2 6 0s4 2 6 0 4 2 6 0" fill="none" ${S}/><path d="M6 22h36c0 9-7 16-18 16S6 31 6 22z" fill="${Y}" ${S}/><path d="M16 38h16" ${S}/><path d="M12 27c3 2 6 2 9 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  cafe: `<path d="M17 4c-2 3 2 4 0 7M23 4c-2 3 2 4 0 7" fill="none" ${S}/><path d="M9 16h24v12a10 10 0 0 1-10 10h-4A10 10 0 0 1 9 28z" fill="${W}" ${S}/><path d="M9 16h24v4H9z" fill="${BR}" ${S}/><path d="M33 20h3a5 5 0 0 1 0 10h-3" fill="none" ${S}/><path d="M5 42h34" ${S}/>${spark(36, 4)}`,
  groceries: `<path d="M16 16l3-8M32 16l-3-8" ${S}/><path d="M22 10c0-4 6-4 6 0" fill="${G}" ${S}/><path d="M5 16h38l-4 22a3 3 0 0 1-3 2H12a3 3 0 0 1-3-2z" fill="${Y}" ${S}/><path d="M16 22v12M24 22v12M32 22v12" ${S}/>`,
  transport: `<path d="M7 30v-6l5-9a4 4 0 0 1 3-2h18a4 4 0 0 1 3 2l5 9v6a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3z" fill="${R}" ${S}/><path d="M13 23l3-6h16l3 6z" fill="${B}" ${S}/><circle cx="15" cy="33" r="4.5" fill="#141414" ${S}/><circle cx="33" cy="33" r="4.5" fill="#141414" ${S}/><path d="M9 27h3M36 27h3" ${S}/>`,
  fuel: `<rect x="8" y="10" width="20" height="30" rx="3" fill="${R}" ${S}/><rect x="12" y="14" width="12" height="8" rx="1.5" fill="${W}" ${S}/><path d="M28 18h4l4 4v12a2.5 2.5 0 0 1-5 0v-6h-3" fill="none" ${S}/><path d="M5 40h26" ${S}/><path d="M18 28c-2 3-2 5 0 6 2-1 2-3 0-6z" fill="${Y}" ${S}/>`,
  housing: `<path d="M6 22L24 7l18 15" fill="${R}" ${S}/><path d="M10 20v18h28V20" fill="${Y}" ${S}/><rect x="20" y="27" width="8" height="11" rx="1.5" fill="${W}" ${S}/><rect x="13" y="24" width="5" height="5" fill="${B}" ${S}/>`,
  bills: `<path d="M24 6a12 12 0 0 1 7 22v4H17v-4a12 12 0 0 1 7-22z" fill="${Y}" ${S}/><path d="M17 36h14M19 40h10" ${S}/><path d="M21 18l3 4 3-4" fill="none" ${S}/><path d="M5 16h4M39 16h4M9 6l3 3M39 6l-3 3" ${S}/>`,
  installment: `<rect x="4" y="12" width="32" height="22" rx="4" fill="${Y}" ${S}/><path d="M4 19h32" stroke="#141414" stroke-width="4"/><circle cx="34" cy="32" r="9" fill="${W}" ${S}/><path d="M34 27v5l3 2" ${S}/>`,
  fees: `<path d="M10 5h28v36l-4-3-4 3-4-3-4 3-4-3-4 3-4-3z" fill="${W}" ${S}/><circle cx="18" cy="16" r="2.5" fill="${R}" ${S}/><circle cx="29" cy="27" r="2.5" fill="${R}" ${S}/><path d="M30 14L17 29" ${S}/>`,
  insurance: `<path d="M24 5l15 6v10c0 10-7 17-15 21C16 38 9 31 9 21V11z" fill="${B}" ${S}/><path d="M17 23l5 5 9-10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${spark(37, 2)}`,
  shopping: `<path d="M9 16h30l-2 24H11z" fill="${P}" ${S}/><path d="M17 20v-6a7 7 0 0 1 14 0v6" fill="none" ${S}/><path d="M33 16h6l-2 24h-4" fill="${R}" ${S}/>${spark(36, 2)}`,
  clothing: `<path d="M17 7l-11 6 4 9 4-2v20h20V20l4 2 4-9-11-6c-1 4-4 6-7 6s-6-2-7-6z" fill="${Y}" ${S}/><path d="M18 30h12" ${S}/>`,
  gadget: `<rect x="5" y="9" width="30" height="20" rx="2.5" fill="${W}" ${S}/><rect x="9" y="13" width="22" height="12" fill="${B}" ${S}/><path d="M2 33h36l-3 4H5z" fill="${GR}" ${S}/><rect x="33" y="17" width="11" height="22" rx="2.5" fill="${Y}" ${S}/><path d="M37 35h3" ${S}/>`,
  fun: `<path d="M14 15h20a9 9 0 0 1 9 9v4a7 7 0 0 1-12 5l-2-2H19l-2 2A7 7 0 0 1 5 28v-4a9 9 0 0 1 9-9z" fill="${Y}" ${S}/><path d="M14 20v8M10 24h8" ${S}/><circle cx="32" cy="22" r="2" fill="${R}" ${S}/><circle cx="36" cy="27" r="2" fill="${B}" ${S}/>${spark(36, 2)}`,
  subscription: `<rect x="5" y="11" width="38" height="24" rx="4" fill="${W}" ${S}/><path d="M21 18v10l9-5z" fill="${R}" ${S}/><path d="M17 41h14M24 35v6M18 5l6 6 6-6" ${S}/>`,
  travel: `<path d="M5 26l14-2 9-15a3 3 0 0 1 4 1l-5 14 12-1 4-5h3l-2 9 2 9h-3l-4-5-12-1 5 14a3 3 0 0 1-4 1l-9-15-14-2z" fill="${W}" ${S}/><path d="M28 9l-5 15 0 0" fill="none"/><circle cx="12" cy="10" r="4" fill="${Y}" ${S}/>`,
  health: `<g transform="rotate(-40 24 24)"><rect x="8" y="17" width="32" height="14" rx="7" fill="${W}" ${S}/><path d="M24 17h9a7 7 0 0 1 0 14h-9z" fill="${R}" ${S}/></g><path d="M38 6v8M34 10h8" stroke="${R}" stroke-width="2.6" stroke-linecap="round"/>`,
  sport: `<rect x="4" y="18" width="6" height="12" rx="2" fill="${Y}" ${S}/><rect x="10" y="14" width="6" height="20" rx="2" fill="${Y}" ${S}/><rect x="32" y="14" width="6" height="20" rx="2" fill="${Y}" ${S}/><rect x="38" y="18" width="6" height="12" rx="2" fill="${Y}" ${S}/><path d="M16 24h16" stroke="#141414" stroke-width="3.5"/>`,
  beauty: `<rect x="10" y="26" width="12" height="16" rx="2" fill="${Y}" ${S}/><path d="M12 26v-9l6-5v14" fill="${R}" ${S}/><rect x="27" y="22" width="12" height="20" rx="3" fill="${P}" ${S}/><rect x="30" y="14" width="6" height="8" fill="#141414" ${S}/>${spark(36, 3)}`,
  education: `<path d="M8 30h30v8H8a4 4 0 0 1 0-8z" fill="${B}" ${S}/><path d="M10 20h30v10H10a5 5 0 0 1 0-10z" fill="${Y}" ${S}/><path d="M8 34h28M12 25h26" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M14 6l14 5-14 5-14-5z" transform="translate(10 0)" fill="#141414" ${S}/>`,
  family: `<circle cx="17" cy="15" r="6" fill="${Y}" ${S}/><circle cx="32" cy="17" r="5" fill="${Y2}" ${S}/><path d="M6 40c0-8 5-13 11-13s11 5 11 13z" fill="${Y}" ${S}/><path d="M26 40c0-7 3-11 7-11s9 4 9 11z" fill="${P}" ${S}/>`,
  kids: `<circle cx="13" cy="13" r="5" fill="${BR}" ${S}/><circle cx="35" cy="13" r="5" fill="${BR}" ${S}/><circle cx="24" cy="25" r="15" fill="${BR}" ${S}/><ellipse cx="24" cy="30" rx="6" ry="4.5" fill="${Y2}" ${S}/><circle cx="18.5" cy="22" r="1.6" fill="#141414"/><circle cx="29.5" cy="22" r="1.6" fill="#141414"/><path d="M24 28v2" ${S}/>`,
  pet: `<ellipse cx="24" cy="31" rx="10" ry="8.5" fill="${BR}" ${S}/><ellipse cx="11" cy="21" rx="4" ry="5" fill="${BR}" ${S}/><ellipse cx="19" cy="12" rx="4" ry="5" fill="${BR}" ${S}/><ellipse cx="29" cy="12" rx="4" ry="5" fill="${BR}" ${S}/><ellipse cx="37" cy="21" rx="4" ry="5" fill="${BR}" ${S}/>`,
  gift: `<rect x="7" y="19" width="34" height="21" rx="2" fill="${Y}" ${S}/><rect x="5" y="13" width="38" height="8" rx="2" fill="${Y2}" ${S}/><path d="M24 13v27" stroke="${R}" stroke-width="5"/><path d="M24 13v27M5 21h38" ${S}/><path d="M24 13c-3-7-11-7-10-2 1 3 7 2 10 2zM24 13c3-7 11-7 10-2-1 3-7 2-10 2z" fill="${R}" ${S}/>`,
  donation: `<path d="M24 40c-9 0-16-4-18-10 6-1 12 2 18 10z" fill="${P}" ${S}/><path d="M24 40c9 0 16-4 18-10-6-1-12 2-18 10z" fill="${P}" ${S}/><path d="M24 40c-6-5-8-12-5-20 3 3 5 6 5 10 0-4 2-7 5-10 3 8 1 15-5 20z" fill="#FBD3E2" ${S}/><path d="M24 8v6" ${S}/><circle cx="24" cy="6" r="1.2" fill="${Y}" ${S}/>`,
  lottery: `<path d="M4 14h40v6a4 4 0 0 0 0 8v6H4v-6a4 4 0 0 0 0-8z" fill="${Y}" ${S}/><path d="M30 14v20" stroke="#141414" stroke-width="2" stroke-dasharray="3 3"/>${star(17, 24, 6)}`,
  business: `<path d="M6 16l18-8 18 8v20l-18 8-18-8z" fill="${BR}" ${S}/><path d="M6 16l18 8 18-8M24 24v20" fill="none" ${S}/><path d="M15 12l18 8v7" fill="none" ${S}/>`,
  other: `<path d="M5 13a3 3 0 0 1 3-3h10l4 4h18a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="${Y}" ${S}/><path d="M5 19h38" ${S}/><circle cx="17" cy="29" r="1.6" fill="#141414"/><circle cx="24" cy="29" r="1.6" fill="#141414"/><circle cx="31" cy="29" r="1.6" fill="#141414"/>`,

  // ---------- รายรับ ----------
  salary: `<rect x="5" y="15" width="38" height="25" rx="4" fill="${BR}" ${S}/><path d="M17 15v-4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" fill="none" ${S}/><path d="M5 25h38" ${S}/><rect x="20" y="22" width="8" height="6" rx="1.5" fill="${Y}" ${S}/>`,
  ot: `<circle cx="24" cy="26" r="15" fill="${W}" ${S}/><path d="M9 11l6-4M39 11l-6-4" ${S}/><path d="M24 17v9l6 4" ${S}/><path d="M13 41l3-3M35 41l-3-3" ${S}/>`,
  bonus: `<path d="M6 42l8-24 16 16z" fill="${Y}" ${S}/><path d="M10 30l8 8M12 24l12 12" ${S}/><path d="M26 16c2-4 6-4 8-8M30 22c4-1 7 1 10-1" fill="none" ${S}/>${star(38, 10, 4)}<circle cx="22" cy="8" r="2" fill="${R}" ${S}/><circle cx="40" cy="30" r="2" fill="${B}" ${S}/>`,
  sales: `<path d="M6 18l4-10h28l4 10z" fill="${R}" ${S}/><path d="M6 18a4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0 9 0 4.5 4.5 0 0 0 9 0" fill="${W}" ${S}/><path d="M9 23v17h30V23" fill="${Y}" ${S}/><rect x="14" y="28" width="9" height="12" fill="${W}" ${S}/><rect x="27" y="28" width="8" height="6" fill="${B}" ${S}/>`,
  freelance: `<rect x="7" y="9" width="34" height="22" rx="2.5" fill="${W}" ${S}/><path d="M17 16l-4 4 4 4M31 16l4 4-4 4M26 14l-4 12" fill="none" ${S}/><path d="M3 35h42l-3 4H6z" fill="${Y}" ${S}/>`,
  invest: `<path d="M6 40h36" ${S}/><rect x="9" y="28" width="7" height="12" rx="1.5" fill="${Y2}" ${S}/><rect x="20" y="22" width="7" height="18" rx="1.5" fill="${Y}" ${S}/><rect x="31" y="15" width="7" height="25" rx="1.5" fill="${G}" ${S}/><path d="M8 22l10-8 7 5 12-11" fill="none" ${S}/><path d="M31 7h7v7" fill="none" ${S}/>`,
  rent_in: `<path d="M5 22L20 9l15 13" fill="${R}" ${S}/><path d="M9 20v18h22V20" fill="${Y2}" ${S}/><rect x="16" y="27" width="7" height="11" fill="${W}" ${S}/><circle cx="36" cy="33" r="8" fill="${Y}" ${S}/><path d="M36 29v8M34 31h4" ${S}/>`,
  gift_in: `<rect x="10" y="5" width="28" height="38" rx="3" fill="${R}" ${S}/><path d="M10 15l14 8 14-8" fill="none" ${S}/><circle cx="24" cy="24" r="5" fill="${Y}" ${S}/>`,
  refund: `<circle cx="24" cy="24" r="10" fill="${Y}" ${S}/><path d="M24 19v10M21 21h4.5" ${S}/><path d="M8 20a16 16 0 0 1 28-9l3 3M40 28a16 16 0 0 1-28 9l-3-3" fill="none" ${S}/><path d="M40 7v8h-8M8 41v-8h8" fill="none" ${S}/>`,
  lucky: `<circle cx="18" cy="16" r="7" fill="${G}" ${S}/><circle cx="30" cy="16" r="7" fill="${G}" ${S}/><circle cx="18" cy="28" r="7" fill="${G}" ${S}/><circle cx="30" cy="28" r="7" fill="${G}" ${S}/><path d="M24 22c2 8 6 14 10 20" fill="none" ${S}/>${spark(38, 2)}`,
  other_income: `<path d="M18 12h12l-3-6h-6z" fill="${Y2}" ${S}/><path d="M18 12c-8 6-12 13-12 19 0 7 6 11 18 11s18-4 18-11c0-6-4-13-12-19z" fill="${Y}" ${S}/><path d="M24 22v14M20.5 25h5a2.5 2.5 0 0 1 0 5h-5" fill="none" ${S}/>`,
};

/** ไอคอนของหมวด: สติกเกอร์ถ้ามี ไม่งั้นอีโมจิ */
export function catIcon(c, size = 28) {
  const body = c && CAT_ICONS[c.id];
  if (!body) return `<span class="mt-emo-i">${String(c?.emoji ?? '').replace(/[<>&"]/g, '')}</span>`;
  return `<svg class="mt-cat-i" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
}
