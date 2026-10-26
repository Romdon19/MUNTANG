// รันบน Node.js (เครื่องตัวเอง / Railway / Docker): node src/server.js
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { config } from './config.js';
import { createFileStore } from './store.js';
import { createApp } from './app.js';
import { runJobs } from './jobs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const store = createFileStore(config.dataDir);
const filesDir = path.join(config.dataDir, 'files');
const app = createApp({
  cfg: config,
  store,
  loadAsset: (p) => fs.readFile(path.join(ROOT, 'public', p)),
  // รูปหลักฐานเก็บเป็นไฟล์ใน DATA_DIR/files
  files: {
    async put(key, bytes) {
      await fs.mkdir(path.dirname(path.join(filesDir, key)), { recursive: true });
      await fs.writeFile(path.join(filesDir, key), bytes);
    },
    async get(key) {
      try {
        return { body: await fs.readFile(path.join(filesDir, key)), contentType: key.endsWith('.png') ? 'image/png' : 'image/jpeg' };
      } catch {
        return null;
      }
    },
    deletePrefix: (prefix) => fs.rm(path.join(filesDir, prefix), { recursive: true, force: true }),
  },
});

const server = express();
server.disable('x-powered-by');

// แปลง request ของ Express เป็น Web Request แล้วส่งให้ app.handle
server.use(async (req, res, next) => {
  try {
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const hasBody = !['GET', 'HEAD'].includes(req.method);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? 'half' : undefined,
    });
    const response = await app.handle(request, (p) => p);
    if (!response) return next();
    res.status(response.status);
    response.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    next(e);
  }
});
server.use('/core', express.static(path.join(__dirname, 'core')));
server.use(express.static(path.join(ROOT, 'public')));

server.listen(config.port, () => {
  console.log(`🌀 หมุนตังค์ พร้อมแล้วที่ http://localhost:${config.port}`);
  console.log(`   LINE: ${app.hasLine ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้ตั้งค่า'} · AI: ${config.anthropicApiKey ? config.claudeModel : 'ปิด'} · Demo: ${config.demoMode ? 'เปิด' : 'ปิด'}`);
  if (config.demoMode) console.log(`   ลองแชทจำลองที่ http://localhost:${config.port}/simulator/`);
});

if (app.hasLine) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runJobs({ store, ids: await store.list(), push: app.push, ctxFor: (id) => app.ctxFor(id) });
    } catch (e) {
      console.error('jobs error', e);
    } finally {
      running = false;
    }
  };
  setInterval(tick, 60_000);
  tick();
}
