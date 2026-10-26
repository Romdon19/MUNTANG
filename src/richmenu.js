// สร้าง Rich Menu 6 ช่อง แล้วตั้งเป็นเมนูหลักของ LINE OA
const W = 2500, H = 1686;

// ช่องบนภาพ (ต้องตรงกับ scripts/richmenu.html): ซ้าย 1000px, ขวา 2 คอลัมน์ x 750px, 3 แถว x 562px
const rect = (x, y, width, height) => ({ x, y, width, height });
const msg = (label, text) => ({ type: 'message', label, text });

async function call(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`LINE ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

/** cfg: ค่าตั้งค่า, image: ไบต์ของ public/assets/richmenu.png */
export async function setupRichMenu(cfg, image) {
  if (!cfg.lineAccessToken) throw new Error('ต้องตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ก่อน');
  const headers = { Authorization: `Bearer ${cfg.lineAccessToken}` };
  const dashboardUri = cfg.liffId ? `https://liff.line.me/${cfg.liffId}` : null;
  // ปุ่มที่เปิดหน้าใน LIFF ได้ (ถ้ายังไม่ตั้ง LIFF จะส่งข้อความแทน)
  const page = (label, view, fallback) => (cfg.liffId ? { type: 'uri', label, uri: `https://liff.line.me/${cfg.liffId}?view=${view}` } : msg(label, fallback));
  const body = {
    size: { width: W, height: H },
    selected: true,
    name: 'muntang-main',
    chatBarText: 'เมนูหมุนตังค์',
    areas: [
      { bounds: rect(0, 0, 1000, 1124), action: msg('จด', 'จด') },
      { bounds: rect(0, 1124, 1000, 562), action: msg('ออมเงิน', 'เป้า') },
      { bounds: rect(1000, 0, 750, 562), action: page('สรุป', 'home', 'สรุปเดือนนี้') },
      { bounds: rect(1750, 0, 750, 562), action: page('วิเคราะห์', 'analysis', 'วิเคราะห์') },
      { bounds: rect(1000, 562, 750, 562), action: page('หมวด/งบ', 'budget', 'งบ') },
      { bounds: rect(1750, 562, 750, 562), action: page('รายการ', 'list', 'รายการ') },
      { bounds: rect(1000, 1124, 750, 562), action: page('ตั้งค่า', 'settings', 'ตั้งค่า') },
      { bounds: rect(1750, 1124, 750, 562), action: msg('Help', 'วิธีใช้') },
    ],
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
    headers: { ...headers, 'Content-Type': 'image/png' },
    body: image,
  });
  await call(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, { method: 'POST', headers });
  return { richMenuId, dashboard: dashboardUri ? 'LIFF' : 'ข้อความ "แดชบอร์ด"' };
}
