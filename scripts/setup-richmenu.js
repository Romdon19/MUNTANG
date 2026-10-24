// สร้าง Rich Menu แล้วตั้งเป็นเมนูหลักของ LINE OA: node scripts/setup-richmenu.js
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../src/config.js';

if (!config.lineAccessToken) {
  console.error('ต้องตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ใน .env ก่อน');
  process.exit(1);
}
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const headers = { Authorization: `Bearer ${config.lineAccessToken}` };
const dashboardUri = config.liffId ? `https://liff.line.me/${config.liffId}` : null;

const W = 2500, H = 1686, cw = [834, 833, 833], ch = 843;
const area = (col, row, action) => ({
  bounds: { x: cw.slice(0, col).reduce((a, b) => a + b, 0), y: row * ch, width: cw[col], height: ch },
  action,
});
const msg = (label, text) => ({ type: 'message', label, text });

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

async function call(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

const { richMenuId } = await call('https://api.line.me/v2/bot/richmenu', {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
console.log('สร้าง rich menu:', richMenuId);
await call(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'image/png' },
  body: fs.readFileSync(path.join(root, 'public/assets/richmenu.png')),
});
await call(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, { method: 'POST', headers });
console.log('✅ ตั้งเป็นเมนูหลักเรียบร้อย');
