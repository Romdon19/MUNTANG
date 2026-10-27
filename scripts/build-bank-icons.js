// สร้างไอคอนธนาคาร/e-Wallet/ประเภทบัญชีเป็น PNG 160px ที่ public/assets/banks/<key>.png
// - มีโลโก้ใน assets-src/bank-logos/<key>.png → ใช้โลโก้นั้น
// - ไม่มี → วาดป้ายสีประจำ + ตัวย่อจาก badgeSvg()
// LINE Flex ใช้รูป SVG ไม่ได้ เลยต้องเป็น PNG
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PROVIDERS, ACCOUNT_TYPES, badgeSvg } from '../src/core/accounts.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const logoDir = path.join(root, 'assets-src/bank-logos');
const outDir = path.join(root, 'public/assets/banks');
fs.mkdirSync(outDir, { recursive: true });

const keys = [...PROVIDERS.map((p) => p.id), ...Object.keys(ACCOUNT_TYPES)];
const logo = (k) => {
  const f = path.join(logoDir, `${k}.png`);
  return fs.existsSync(f) ? `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" alt="">` : null;
};
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kanit:wght@700&display=block">
<style>body{margin:0;background:transparent} .i{width:160px;height:160px;display:inline-block} .i svg,.i img{width:160px;height:160px;display:block}</style></head>
<body>${keys.map((k) => `<div class="i" id="i-${k}">${logo(k) || badgeSvg(k)}</div>`).join('')}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
for (const k of keys) await page.locator(`#i-${k}`).screenshot({ path: path.join(outDir, `${k}.png`), omitBackground: true });
await browser.close();
const real = keys.filter((k) => fs.existsSync(path.join(logoDir, `${k}.png`))).length;
console.log(`saved ${keys.length} icons (${real} logos, ${keys.length - real} drawn) to ${outDir}`);
