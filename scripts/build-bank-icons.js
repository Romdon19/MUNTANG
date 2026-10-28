// สร้างไอคอนธนาคาร/e-Wallet/ประเภทบัญชีเป็น PNG 160px ที่ public/assets/banks/<key>.png
// - มีโลโก้ใน assets-src/bank-logos/<key>.png → ใช้โลโก้นั้น
// - มีสัญลักษณ์แบรนด์ใน assets-src/brand-glyphs/<glyph>.svg (Simple Icons, CC0) → สัญลักษณ์สีขาวบนสีแบรนด์ + คำบรรยาย (เช่น Pay)
// - ไม่มีทั้งคู่ → วาดป้ายสีประจำ + ชื่อแบรนด์จาก badgeSvg()
// LINE Flex ใช้รูป SVG ไม่ได้ เลยต้องเป็น PNG
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PROVIDERS, PROVIDER_MAP, ACCOUNT_TYPES, badgeSvg } from '../src/core/accounts.js';

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
const glyphDir = path.join(root, 'assets-src/brand-glyphs');
const glyph = (k) => {
  const p = PROVIDER_MAP[k];
  const f = p?.glyph && path.join(glyphDir, `${p.glyph}.svg`);
  if (!f || !fs.existsSync(f)) return null;
  const d = fs.readFileSync(f, 'utf8').match(/ d="([^"]+)"/)[1];
  const cap = p.caption ? `<text x="40" y="61" text-anchor="middle" dominant-baseline="central" font-family="Kanit, Arial, sans-serif" font-weight="700" font-size="15" fill="#fff">${p.caption}</text>` : '';
  const g = p.caption ? 'translate(25 13) scale(1.25)' : 'translate(19 19) scale(1.75)';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80"><circle cx="40" cy="40" r="40" fill="${p.color}"/><path transform="${g}" fill="#fff" d="${d}"/>${cap}</svg>`;
};
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kanit:wght@700&display=block">
<style>body{margin:0;background:transparent} .i{width:160px;height:160px;display:inline-block} .i svg,.i img{width:160px;height:160px;display:block}</style></head>
<body>${keys.map((k) => `<div class="i" id="i-${k}">${logo(k) || glyph(k) || badgeSvg(k)}</div>`).join('')}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
for (const k of keys) await page.locator(`#i-${k}`).screenshot({ path: path.join(outDir, `${k}.png`), omitBackground: true });
await browser.close();
const real = keys.filter((k) => fs.existsSync(path.join(logoDir, `${k}.png`))).length;
const glyphs = keys.filter((k) => !fs.existsSync(path.join(logoDir, `${k}.png`)) && glyph(k)).length;
console.log(`saved ${keys.length} icons (${real} logos, ${glyphs} brand glyphs, ${keys.length - real - glyphs} drawn) to ${outDir}`);
