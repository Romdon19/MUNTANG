// สร้าง Rich Menu แล้วตั้งเป็นเมนูหลักของ LINE OA: npm run richmenu:setup
// (หรือเปิด https://<โดเมน>/admin/setup-richmenu?key=<APP_SECRET> ในเบราว์เซอร์)
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../src/config.js';
import { setupRichMenu } from '../src/richmenu.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
try {
  const r = await setupRichMenu(config, fs.readFileSync(path.join(root, 'public/assets/richmenu.png')));
  console.log(`✅ ตั้ง Rich Menu เรียบร้อย (${r.richMenuId}) ปุ่มแดชบอร์ดเปิดด้วย ${r.dashboard}`);
} catch (e) {
  console.error('❌', e.message);
  process.exit(1);
}
