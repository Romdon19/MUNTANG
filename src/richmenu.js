// สร้าง Rich Menu 6 ช่อง แล้วตั้งเป็นเมนูหลักของ LINE OA
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';

const IMAGE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/assets/richmenu.png');
const W = 2500, H = 1686, cw = [834, 833, 833], ch = 843;

const area = (col, row, action) => ({
  bounds: { x: cw.slice(0, col).reduce((a, b) => a + b, 0), y: row * ch, width: cw[col], height: ch },
  action,
});
const msg = (label, text) => ({ type: 'message', label, text });

async function call(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`LINE ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

export async function setupRichMenu() {
  if (!config.lineAccessToken) throw new Error('ต้องตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ก่อน');
  const headers = { Authorization: `Bearer ${config.lineAccessToken}` };
  const dashboardUri = config.liffId ? `https://liff.line.me/${config.liffId}` : null;
  const body = {
    size: { width: W, height: H },
    selected: true,
    name: 'muntang-main',
    chatBarText: 'เมนูหมุนตังค์',
    areas: [
      area(0, 0, msg('สรุปวันนี้', 'สรุปวันนี้')),
      area(1, 0, dashboardUri ? { type: 'uri', label: 'แดชบอร์ด', uri: dashboardUri } : msg('แดชบอร์ด', 'แดชบอร์ด')),
      area(2, 0, msg('สรุปเดือนนี้', 'สรุปเดือนนี้')),
      area(0, 1, msg('งบประมาณ', 'งบ')),
      area(1, 1, msg('รายการล่าสุด', 'รายการ')),
      area(2, 1, msg('วิธีใช้', 'วิธีใช้')),
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
    body: fs.readFileSync(IMAGE),
  });
  await call(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, { method: 'POST', headers });
  return { richMenuId, dashboard: dashboardUri ? 'LIFF' : 'ข้อความ "แดชบอร์ด"' };
}
