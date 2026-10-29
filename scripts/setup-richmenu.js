// สร้าง Rich Menu แล้วตั้งเป็นเมนูหลักของ LINE OA: npm run richmenu:setup [-- grid|banner|banner4]
// (หรือเปิด https://<โดเมน>/admin/setup-richmenu?key=<APP_SECRET>&layout=banner4 ในเบราว์เซอร์)
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../src/config.js';
import { setupRichMenu, imagePaths } from '../src/richmenu.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const layout = process.argv[2] || config.richMenuLayout || 'grid';
try {
  const file = imagePaths(layout).map((p) => path.join(root, 'public', p)).find((f) => fs.existsSync(f));
  if (!file) throw new Error(`ไม่เจอไฟล์ภาพ ${imagePaths(layout).join(' หรือ ')} ใน public/`);
  const r = await setupRichMenu(config, fs.readFileSync(file), layout);
  console.log(`✅ ตั้ง Rich Menu แบบ ${r.layout} เรียบร้อย (${r.richMenuId}) ปุ่มแดชบอร์ดเปิดด้วย ${r.dashboard}`);
} catch (e) {
  console.error('❌', e.message);
  process.exit(1);
}
