// สร้างรูป Rich Menu (2500x1686) จาก scripts/richmenu.html ด้วย Playwright
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2500, height: 1686 } });
await page.goto(`file://${path.join(root, 'scripts/richmenu.html')}`);
await page.waitForTimeout(1500);
const out = path.join(root, 'public/assets/richmenu.png');
await page.screenshot({ path: out, type: 'png' });
await browser.close();
console.log('saved', out);
