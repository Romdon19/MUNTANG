// ช่องกดของริชเมนูแต่ละแบบ (ใช้ร่วมกันทั้งตอนตั้งเมนูจริงและริชเมนูจำลองในเดโม)
// พิกัดเป็นพิกเซลบนภาพต้นแบบ (size) — ภาพจริงขนาดอื่นใช้ scaleAreas ย่อ/ขยาย
export const rect = (x, y, width, height) => ({ x, y, width, height });
export const msg = (label, text) => ({ type: 'message', label, text });
export const ALIAS = { start: 'muntang-start', main: 'muntang-main' };

/** ช่องกดของแต่ละแบบ: page(label, view, ข้อความสำรองถ้าไม่มี LIFF) */
export const LAYOUTS = {
  // ฉบับเริ่มต้น: ทั้งภาพเป็นปุ่ม "เริ่มต้น"
  start: {
    size: { width: 2000, height: 1349 },
    areas: (page) => [{ bounds: rect(0, 0, 2000, 1349), action: page('เริ่มต้น', 'onboard', 'ตั้งค่า') }],
  },
  // ฉบับใช้งาน: จด (แบนเนอร์) · 5 ช่องกลาง · เชิญเพื่อน + ตั้งค่า + Help
  main: {
    size: { width: 2000, height: 1349 },
    areas: (page) => [
      { bounds: rect(0, 0, 2000, 585), action: msg('จด', 'จด') },
      { bounds: rect(0, 585, 446, 324), action: page('สรุป', 'home', 'สรุปเดือนนี้') },
      { bounds: rect(446, 585, 374, 324), action: page('วิเคราะห์', 'analysis', 'วิเคราะห์') },
      { bounds: rect(820, 585, 372, 324), action: page('หมวด/งบ', 'budget', 'งบ') },
      { bounds: rect(1192, 585, 374, 324), action: page('รายการ', 'list', 'รายการ') },
      { bounds: rect(1566, 585, 434, 324), action: msg('PRO', 'PRO') },
      { bounds: rect(0, 909, 1192, 440), action: msg('เชิญเพื่อน', 'เชิญเพื่อน') },
      { bounds: rect(1192, 909, 374, 440), action: page('ตั้งค่า', 'settings', 'ตั้งค่า') },
      { bounds: rect(1566, 909, 434, 440), action: msg('Help', 'วิธีใช้') },
    ],
  },
  grid: {
    size: { width: 2500, height: 1686 },
    areas: (page) => [
      { bounds: rect(0, 0, 1000, 1124), action: msg('จด', 'จด') },
      { bounds: rect(0, 1124, 1000, 562), action: msg('ออมเงิน', 'เป้า') },
      { bounds: rect(1000, 0, 750, 562), action: page('สรุป', 'home', 'สรุปเดือนนี้') },
      { bounds: rect(1750, 0, 750, 562), action: page('วิเคราะห์', 'analysis', 'วิเคราะห์') },
      { bounds: rect(1000, 562, 750, 562), action: page('งบประมาณ', 'budget', 'งบ') },
      { bounds: rect(1750, 562, 750, 562), action: page('รายการ', 'list', 'รายการ') },
      { bounds: rect(1000, 1124, 750, 562), action: page('กระเป๋า', 'wallets', 'บัญชี') },
      { bounds: rect(1750, 1124, 750, 562), action: msg('Help', 'วิธีใช้') },
    ],
  },
  banner: {
    size: { width: 2500, height: 843 },
    areas: (page) => [
      { bounds: rect(0, 0, 1700, 843), action: msg('จด', 'จด') },
      { bounds: rect(1700, 0, 800, 843), action: page('เริ่มต้น', 'home', 'แดชบอร์ด') },
    ],
  },
  banner4: {
    size: { width: 2500, height: 1686 },
    areas: (page) => [
      { bounds: rect(0, 0, 1700, 843), action: msg('จด', 'จด') },
      { bounds: rect(1700, 0, 800, 843), action: page('เริ่มต้น', 'home', 'แดชบอร์ด') },
      { bounds: rect(0, 843, 625, 843), action: page('สรุป', 'home', 'สรุปเดือนนี้') },
      { bounds: rect(625, 843, 625, 843), action: page('วิเคราะห์', 'analysis', 'วิเคราะห์') },
      { bounds: rect(1250, 843, 625, 843), action: page('กระเป๋า', 'wallets', 'บัญชี') },
      { bounds: rect(1875, 843, 625, 843), action: page('งบประมาณ', 'budget', 'งบ') },
    ],
  },
};

/** ย่อ/ขยายช่องกดจากภาพต้นแบบให้พอดีภาพจริง (ช่องสุดท้ายชนขอบพอดี ไม่มีรอยต่อ) */
export function scaleAreas(areas, from, to) {
  const sx = (v) => Math.round((v * to.width) / from.width);
  const sy = (v) => Math.round((v * to.height) / from.height);
  return areas.map((a) => {
    const { x, y, width, height } = a.bounds;
    const nx = sx(x);
    const ny = sy(y);
    return { ...a, bounds: { x: nx, y: ny, width: sx(x + width) - nx, height: sy(y + height) - ny } };
  });
}
