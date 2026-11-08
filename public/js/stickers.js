// ไอคอนสติกเกอร์ (เส้นดำหนา สีเหลือง/ขาว ตามดีไซน์ริชเมนู) ใช้หัวการ์ดและช่องสรุปในแอป
const K = 'stroke="#141414" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const Y = '#FFC400';
const Y2 = '#FFE27A';

const SVG = {
  wallet: `<path d="M8 17c0-3 2-5 5-5h20l3 5" fill="${Y2}" ${K}/><rect x="6" y="16" width="34" height="24" rx="5" fill="${Y}" ${K}/><path d="M30 25h10v8H30a4 4 0 0 1 0-8z" fill="#fff" ${K}/><circle cx="31.5" cy="29" r="1.6" fill="#141414"/>`,
  doc: `<path d="M10 6h20l8 8v24a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z" fill="#fff" ${K}/><path d="M30 6v8h8" fill="${Y2}" ${K}/><path d="M13 17h14M13 23h18M13 29h10" ${K}/><circle cx="35" cy="36" r="8" fill="${Y}" ${K}/><path d="M35 32v4l2.6 2" ${K}/>`,
  cash: `<rect x="6" y="18" width="34" height="18" rx="3" fill="#7CCB7A" ${K}/><rect x="9" y="12" width="34" height="18" rx="3" fill="#A8E2A0" ${K}/><circle cx="26" cy="21" r="4.5" fill="#fff" ${K}/><path d="M14 16v10M38 16v10" ${K}/>`,
  debt: `<path d="M10 6h18l7 7v25a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z" fill="#fff" ${K}/><path d="M13 16h12M13 22h14M13 28h8" ${K}/><circle cx="34" cy="34" r="8" fill="#F05A4F" ${K}/><path d="M30 34h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  growth: `<path d="M6 40h36" ${K}/><rect x="9" y="28" width="7" height="12" rx="1.5" fill="${Y2}" ${K}/><rect x="20" y="22" width="7" height="18" rx="1.5" fill="${Y}" ${K}/><rect x="31" y="15" width="7" height="25" rx="1.5" fill="#141414" ${K}/><path d="M8 22l10-8 7 5 12-11" fill="none" ${K}/><path d="M31 7h7v7" fill="none" ${K}/>`,
  pie: `<path d="M10 6h20l8 8v24a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z" fill="#fff" ${K}/><circle cx="20" cy="22" r="8" fill="${Y2}" ${K}/><path d="M20 14v8h8a8 8 0 0 0-8-8z" fill="#141414" ${K}/><path d="M13 34h18" ${K}/>`,
  trip: `<rect x="8" y="15" width="32" height="24" rx="5" fill="${Y}" ${K}/><path d="M18 15v-4a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v4" fill="none" ${K}/><path d="M8 25h32" ${K}/><rect x="21" y="22" width="6" height="6" rx="1.5" fill="#fff" ${K}/>`,
  card: `<rect x="5" y="12" width="38" height="25" rx="5" fill="${Y}" ${K}/><path d="M5 20h38" stroke="#141414" stroke-width="5"/><rect x="10" y="27" width="10" height="5" rx="1.5" fill="#fff" ${K}/>`,
  coin: `<ellipse cx="24" cy="32" rx="14" ry="6" fill="#E3A700" ${K}/><path d="M10 26v6M38 26v6" ${K}/><ellipse cx="24" cy="26" rx="14" ry="6" fill="${Y}" ${K}/><path d="M24 23v6M21.5 24.5h4" ${K}/>`,
  target: `<circle cx="24" cy="24" r="17" fill="#fff" ${K}/><circle cx="24" cy="24" r="11" fill="${Y}" ${K}/><circle cx="24" cy="24" r="4.5" fill="#141414" ${K}/>`,
  bank: `<path d="M6 18L24 7l18 11z" fill="${Y}" ${K}/><path d="M10 20v14M18 20v14M30 20v14M38 20v14" ${K}/><path d="M6 38h36" stroke="#141414" stroke-width="3.2" stroke-linecap="round"/>`,
  repeat: `<circle cx="24" cy="24" r="17" fill="${Y2}" ${K}/><path d="M16 21a8.5 8.5 0 0 1 15-4l2 2M32 27a8.5 8.5 0 0 1-15 4l-2-2" fill="none" ${K}/><path d="M33 13v6h-6M15 35v-6h6" fill="none" ${K}/>`,
  home: `<path d="M6 22L24 7l18 15" fill="#F05A4F" ${K}/><path d="M10 20v19h28V20" fill="${Y}" ${K}/><rect x="20" y="27" width="8" height="12" rx="1.5" fill="#fff" ${K}/>`,
  cal: `<rect x="6" y="9" width="36" height="32" rx="5" fill="#fff" ${K}/><path d="M6 18h36" stroke="#141414" stroke-width="2"/><path d="M6 14a5 5 0 0 1 5-5h26a5 5 0 0 1 5 5v4H6z" fill="#F05A4F" ${K}/><path d="M15 5v8M33 5v8" ${K}/><rect x="13" y="24" width="6" height="5" rx="1" fill="${Y}" ${K}/><path d="M25 26.5h9M13 34h20" ${K}/>`,
  heart: `<path d="M24 39S8 30 8 19a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 11-16 20-16 20z" fill="#F05A4F" ${K}/>`,
  gear: `<path d="M24 6l3 4 5-1 1 5 5 2-2 5 3 4-4 3 1 5-5 1-2 5-5-2-4 3-3-4-5 1-1-5-5-2 2-5-3-4 4-3-1-5 5-1 2-5 5 2z" fill="#D9D6CF" ${K}/><circle cx="24" cy="24" r="6" fill="#fff" ${K}/>`,
};

/** สติกเกอร์ขนาด size px (ค่าเริ่มต้น 40) */
export function sticker(name, size = 40) {
  const body = SVG[name];
  if (!body) return '';
  return `<svg class="mt-stk" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
}
