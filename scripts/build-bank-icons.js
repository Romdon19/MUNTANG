// สร้างไอคอนธนาคาร/e-Wallet/ประเภทบัญชีเป็น PNG (public/assets/banks/<key>.png) จาก badgeSvg()
// LINE Flex ใช้รูป SVG ไม่ได้ เลยต้องเป็น PNG — อยากใช้โลโก้จริงก็วางไฟล์ชื่อเดียวกันทับ
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PROVIDERS, ACCOUNT_TYPES, badgeSvg } from '../src/core/accounts.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'public/assets/banks');
fs.mkdirSync(outDir, { recursive: true });

const keys = [...PROVIDERS.map((p) => p.id), ...Object.keys(ACCOUNT_TYPES)];
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kanit:wght@700&display=block">
<style>body{margin:0;background:transparent} .i{width:160px;height:160px;display:inline-block} .i svg{width:160px;height:160px;display:block}</style></head>
<body>${keys.map((k) => `<div class="i" id="i-${k}">${badgeSvg(k)}</div>`).join('')}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
for (const k of keys) await page.locator(`#i-${k}`).screenshot({ path: path.join(outDir, `${k}.png`), omitBackground: true });
await browser.close();
console.log(`saved ${keys.length} icons to ${outDir}`);
