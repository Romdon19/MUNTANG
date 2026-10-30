// สร้าง Rich Menu แล้วตั้งเป็นเมนูหลักของ LINE OA: npm run richmenu:setup [-- duo|main|grid|banner|banner4]
// (หรือเปิด https://<โดเมน>/admin/setup-richmenu?key=<APP_SECRET> ในเบราว์เซอร์ ค่าเริ่มต้นคือ duo)
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../src/config.js';
import { setupRichMenu, imagePaths } from '../src/richmenu.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const layout = process.argv[2] || config.richMenuLayout || 'duo';
const load = async (name) => {
  const file = imagePaths(name).map((p) => path.join(root, 'public', p)).find((f) => fs.existsSync(f));
  return file ? fs.readFileSync(file) : null;
};
try {
  const r = await setupRichMenu(config, load, layout);
  console.log(`✅ ตั้ง Rich Menu แบบ ${r.layout} เรียบร้อย`, r.ids, `ปุ่มแดชบอร์ดเปิดด้วย ${r.dashboard}`);
} catch (e) {
  console.error('❌', e.message);
  process.exit(1);
}
