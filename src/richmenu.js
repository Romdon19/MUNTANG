// สร้าง Rich Menu แล้วตั้งเป็นเมนูหลักของ LINE OA
// มี 3 แบบ (ดูสเปกภาพใน docs/richmenu-spec.md) เลือกด้วย ?layout= หรือ RICHMENU_LAYOUT
//   grid    2500x1686  ช่อง "จด" ใหญ่ซ้าย + 6 ช่อง (ภาพ public/assets/richmenu.png)
//   banner  2500x843   แบนเนอร์เดียวแบบป้านวล: ซ้าย = จด · ขวา = ปุ่ม "เริ่มต้น" เปิดแอป (richmenu-banner.png/.jpg)
//   banner4 2500x1686  แบนเนอร์บน + ทางลัด 4 ช่องล่าง (richmenu-banner4.png/.jpg)
const rect = (x, y, width, height) => ({ x, y, width, height });
const msg = (label, text) => ({ type: 'message', label, text });

/** ช่องกดของแต่ละแบบ: page(label, view, ข้อความสำรองถ้าไม่มี LIFF) */
export const LAYOUTS = {
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

/** ไฟล์ภาพที่ใช้กับแต่ละแบบ (ลองตามลำดับ) */
export const imagePaths = (layout) => (layout === 'grid' ? ['/assets/richmenu.png'] : [`/assets/richmenu-${layout}.png`, `/assets/richmenu-${layout}.jpg`]);

async function call(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`LINE ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

/** cfg: ค่าตั้งค่า, image: ไบต์ของภาพเมนู (PNG/JPEG ไม่เกิน 1MB), layout: grid | banner | banner4 */
export async function setupRichMenu(cfg, image, layout = 'grid') {
  if (!cfg.lineAccessToken) throw new Error('ต้องตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ก่อน');
  const L = LAYOUTS[layout];
  if (!L) throw new Error(`ไม่รู้จักแบบเมนู "${layout}" (มี ${Object.keys(LAYOUTS).join(', ')})`);
  const bytes = new Uint8Array(image);
  if (bytes.length > 1024 * 1024) throw new Error(`ภาพใหญ่เกิน 1MB (${Math.round(bytes.length / 1024)}KB) ลดขนาดไฟล์ก่อน`);
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  const headers = { Authorization: `Bearer ${cfg.lineAccessToken}` };
  const dashboardUri = cfg.liffId ? `https://liff.line.me/${cfg.liffId}` : null;
  // ปุ่มที่เปิดหน้าใน LIFF ได้ (ถ้ายังไม่ตั้ง LIFF จะส่งข้อความแทน)
  const page = (label, view, fallback) => (cfg.liffId ? { type: 'uri', label, uri: `https://liff.line.me/${cfg.liffId}?view=${view}` } : msg(label, fallback));
  const body = {
    size: L.size,
    selected: true,
    name: 'muntang-main',
    chatBarText: 'เมนูหมุนตังค์',
    areas: L.areas(page),
  };

  // ลบเมนูเก่าของหมุนตังค์ก่อน เผื่อกดตั้งค่าซ้ำ
  const { richmenus = [] } = await call('https://api.line.me/v2/bot/richmenu/list', { headers });
  for (const m of richmenus.filter((m) => m.name === body.name)) {
    await call(`https://api.line.me/v2/bot/richmenu/${m.richMenuId}`, { method: 'DELETE', headers });
  }

  const { richMenuId } = await call('https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await call(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': isPng ? 'image/png' : 'image/jpeg' },
    body: image,
  });
  await call(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, { method: 'POST', headers });
  return { richMenuId, layout, dashboard: dashboardUri ? 'LIFF' : 'ข้อความ "แดชบอร์ด"' };
}
