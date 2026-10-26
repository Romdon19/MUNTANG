// ค่าตั้งค่าฝั่ง Node: โหลด .env แบบง่ายๆ (ไม่ต้องติดตั้ง dotenv)
import fs from 'node:fs';
import path from 'node:path';
import { makeConfig } from './settings.js';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export const config = {
  ...makeConfig(process.env),
  port: Number(process.env.PORT || 3000),
  dataDir: process.env.DATA_DIR || path.resolve(process.cwd(), 'data'),
};
