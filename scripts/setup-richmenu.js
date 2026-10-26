// สร้าง Rich Menu แล้วตั้งเป็นเมนูหลักของ LINE OA: npm run richmenu:setup
// (หรือเปิด https://<โดเมน>/admin/setup-richmenu?key=<APP_SECRET> ในเบราว์เซอร์)
import { setupRichMenu } from '../src/richmenu.js';

try {
  const r = await setupRichMenu();
  console.log(`✅ ตั้ง Rich Menu เรียบร้อย (${r.richMenuId}) ปุ่มแดชบอร์ดเปิดด้วย ${r.dashboard}`);
} catch (e) {
  console.error('❌', e.message);
  process.exit(1);
}
