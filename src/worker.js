// รันบน Cloudflare Workers + D1 (ดู wrangler.toml)
//   DB     (D1)          ฐานข้อมูลผู้ใช้ — จำเป็น
//   SLIPS  (R2, ถ้ามี)   เก็บรูปสลิป/ใบเสร็จเป็นหลักฐาน
//   AI     (Workers AI)  แปลงข้อความเสียงเป็นตัวอักษร (Whisper)
import { makeConfig } from './settings.js';
import { createD1Store } from './store-d1.js';
import { createApp } from './app.js';
import { runJobs, nextJobAt, jobClock } from './jobs.js';
import { createWorkersAI } from './ai-workers.js';

function r2Files(bucket) {
  if (!bucket) return undefined;
  return {
    put: (key, bytes, contentType) => bucket.put(key, bytes, { httpMetadata: { contentType } }),
    async get(key) {
      const obj = await bucket.get(key);
      return obj ? { body: obj.body, contentType: obj.httpMetadata?.contentType } : null;
    },
    /** ลบรูปทั้งหมดของสมุดบัญชีหนึ่งเล่ม */
    async deletePrefix(prefix) {
      let cursor;
      do {
        const page = await bucket.list({ prefix, cursor });
        if (page.objects.length) await bucket.delete(page.objects.map((o) => o.key));
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
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
  const store = createD1Store(env.DB, { nextJob: (u) => nextJobAt(u) });
  const app = createApp({
    cfg,
    store,
    files: r2Files(env.SLIPS),
    speechToText: whisper(env.AI),
    // AI ฟรีสำหรับอ่านสลิป (ปิดได้ด้วย FREE_AI=off) เปลี่ยนโมเดลได้ด้วย WORKERS_AI_MODEL
    freeAi: env.FREE_AI === 'off' ? null : createWorkersAI(env.AI, env.WORKERS_AI_MODEL || undefined),
    loadAsset: async (p) => {
      const res = await env.ASSETS.fetch(new Request(`https://assets.local${p}`));
      return res.ok ? res.arrayBuffer() : null;
    },
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

  // Cron ทุก 1 นาที: ตรวจผู้ใช้ที่ถึงเวลา (เตือนจดรายจ่าย · รายการประจำ · รายงานประจำเดือน) ตามคิว next_job
  // ทีละไม่เกิน 12 คนต่อนาที เพื่อไม่ให้เกินโควตาคำขอต่อครั้งของ Workers (คนที่เหลือได้ในนาทีถัดไป)
  async scheduled(event, env, ctx) {
    const { store, app } = boot(env);
    if (!app.hasLine) return;
    const now = new Date(event.scheduledTime);
    const ids = await store.nextJobs(jobClock(now), 12);
    if (ids.length) ctx.waitUntil(runJobs({ store, ids, push: app.push, ctxFor: (id) => app.ctxFor(id), now }));
  },
};
