// รันบน Cloudflare Workers + D1 (ดู wrangler.toml)
//   DB     (D1)          ฐานข้อมูลผู้ใช้ — จำเป็น
//   SLIPS  (R2, ถ้ามี)   เก็บรูปสลิป/ใบเสร็จเป็นหลักฐาน
//   AI     (Workers AI)  แปลงข้อความเสียงเป็นตัวอักษร (Whisper)
import { makeConfig } from './settings.js';
import { createD1Store } from './store-d1.js';
import { createApp } from './app.js';
import { runJobs, windowStart } from './jobs.js';
import { timeStr } from './core/dates.js';

function r2Files(bucket) {
  if (!bucket) return undefined;
  return {
    put: (key, bytes, contentType) => bucket.put(key, bytes, { httpMetadata: { contentType } }),
    async get(key) {
      const obj = await bucket.get(key);
      return obj ? { body: obj.body, contentType: obj.httpMetadata?.contentType } : null;
    },
  };
}

function whisper(ai) {
  if (!ai) return undefined;
  return async (base64) => {
    const res = await ai.run('@cf/openai/whisper-large-v3-turbo', { audio: base64, language: 'th', task: 'transcribe' });
    return res?.text || '';
  };
}

function boot(env) {
  if (!env.DB) throw new Error('ยังไม่ได้ผูกฐานข้อมูล D1 ชื่อ DB (ดู wrangler.toml)');
  const cfg = makeConfig(env);
  const store = createD1Store(env.DB);
  const app = createApp({
    cfg,
    store,
    files: r2Files(env.SLIPS),
    speechToText: whisper(env.AI),
    loadAsset: async (p) => (await env.ASSETS.fetch(new Request(`https://assets.local${p}`))).arrayBuffer(),
  });
  return { cfg, store, app };
}

export default {
  async fetch(request, env, ctx) {
    try {
      const { app } = boot(env);
      const res = await app.handle(request, (p) => ctx.waitUntil(p));
      return res || env.ASSETS.fetch(request);
    } catch (e) {
      return new Response(`❌ ${e.message}`, { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  },

  // Cron ทุก 1 นาที: เตือนจดรายจ่าย · ต้นชั่วโมง: รายการประจำ · 09:00: ตรวจทุกคนเพื่อส่งรายงานประจำเดือน
  async scheduled(event, env, ctx) {
    const { store, app } = boot(env);
    if (!app.hasLine) return;
    const now = new Date(event.scheduledTime);
    const hhmm = timeStr(now);
    const ids = hhmm === '09:00' ? await store.allIds() : await store.dueIds(hhmm, windowStart(hhmm), hhmm.endsWith(':00'));
    if (ids.length) ctx.waitUntil(runJobs({ store, ids, push: app.push, ctxFor: (id) => app.ctxFor(id), now }));
  },
};
