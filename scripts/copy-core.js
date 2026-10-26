// คัดลอก src/core ไปไว้ที่ public/core เพื่อให้หน้าเว็บ import ได้เมื่อรันบน Cloudflare (เรียกอัตโนมัติจาก wrangler.toml)
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const from = path.join(root, 'src/core');
const to = path.join(root, 'public/core');
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log('copied src/core -> public/core');
