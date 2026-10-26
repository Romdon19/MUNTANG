// รันบน Cloudflare Workers + D1 (ดู wrangler.toml)
import { makeConfig } from './settings.js';
import { createD1Store } from './store-d1.js';
import { createApp } from './app.js';
import { runJobs, windowStart } from './jobs.js';
import { timeStr } from './core/dates.js';

function boot(env) {
  if (!env.DB) throw new Error('ยังไม่ได้ผูกฐานข้อมูล D1 ชื่อ DB (ดู wrangler.toml)');
  const cfg = makeConfig(env);
  const store = createD1Store(env.DB);
  const app = createApp({
    cfg,
    store,
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

  // Cron Trigger ทุก 1 นาที: เตือนจดรายจ่าย / ทุกต้นชั่วโมง: รายการประจำ
  async scheduled(event, env, ctx) {
    const { store, app } = boot(env);
    if (!app.hasLine) return;
    const now = new Date(event.scheduledTime);
    const hhmm = timeStr(now);
    const ids = await store.dueIds(hhmm, windowStart(hhmm), hhmm.endsWith(':00'));
    if (ids.length) ctx.waitUntil(runJobs({ store, ids, push: app.push, now }));
  },
};
