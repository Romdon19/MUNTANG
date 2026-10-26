// ตัวจัดการ HTTP กลาง (Request -> Response) ใช้ร่วมกันทั้ง Node และ Cloudflare Workers
// คืน null เมื่อไม่ใช่เส้นทาง API เพื่อให้ฝั่ง platform เสิร์ฟไฟล์ static ต่อ
import { createLine } from './line.js';
import { createAI } from './ai.js';
import { createAuth } from './auth.js';
import { setupRichMenu } from './richmenu.js';
import { createBot } from './core/bot.js';
import * as ops from './core/ops.js';
import { seedDemo } from './core/demo.js';

const DEMO_USER = 'demo-user';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
const text = (body, status = 200, type = 'text/plain; charset=utf-8') => new Response(body, { status, headers: { 'Content-Type': type } });

/**
 * deps:
 *   cfg        ค่าตั้งค่าจาก makeConfig()
 *   store      { get, save }
 *   loadAsset  (path) -> Promise<ArrayBuffer|Uint8Array>  ใช้อ่านรูป rich menu
 */
export function createApp({ cfg, store, loadAsset }) {
  const line = createLine(cfg);
  const ai = createAI(cfg);
  const auth = createAuth(cfg.appSecret);
  const hasLine = !!(cfg.lineChannelSecret && cfg.lineAccessToken);

  /** สร้างบอทสำหรับผู้ใช้หนึ่งคน (ลิงก์ในข้อความต้องมีโทเคนของคนนั้น) */
  async function botFor(userId, origin) {
    const base = cfg.baseUrl || origin;
    const dashToken = userId ? await auth.makeToken(userId) : '';
    const exportToken = userId ? await auth.makeToken(userId, 1) : '';
    return createBot({
      store,
      ai,
      logoUrl: `${base}/assets/logo-192.jpg`,
      links: {
        dashboard: () => (cfg.liffId ? `https://liff.line.me/${cfg.liffId}` : `${base}/app/?t=${dashToken}`),
        export: () => `${base}/api/export.csv?t=${exportToken}`,
      },
      getProfile: hasLine ? (id) => (id.startsWith('U') ? line.profile(id) : null) : undefined,
      getImage: (event) => (event.message.imageData ? event.message.imageData : line.content(event.message.id)),
    });
  }

  async function userFromRequest(req, url) {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || url.searchParams.get('t');
    return auth.readToken(token);
  }

  /** โหลดผู้ใช้ -> ทำงาน -> บันทึก */
  async function withUser(userId, origin, fn) {
    const bot = await botFor(userId, origin);
    const user = await bot.loadUser(userId);
    const result = await fn(user);
    await store.save(user);
    return result;
  }

  const publicState = (u) => ops.publicState(u, { aiEnabled: !!ai });

  // ---------------- routes ----------------
  const routes = [
    ['POST', /^\/webhook$/, webhook],
    ['GET', /^\/config\.js$/, () =>
      text(`window.MUNTANG_CONFIG=${JSON.stringify({ liffId: cfg.liffId, demoMode: cfg.demoMode, aiEnabled: !!ai })};`, 200, 'application/javascript; charset=utf-8')],
    ['GET', /^\/healthz$/, () => json({ ok: true, line: hasLine, ai: !!ai, liff: !!cfg.liffId, demo: cfg.demoMode })],
    ['GET', /^\/admin\/setup-richmenu$/, adminRichMenu],
    ['POST', /^\/api\/auth\/liff$/, authLiff],
    ['POST', /^\/api\/auth\/demo$/, authDemo],
    ['POST', /^\/api\/sim\/event$/, simEvent],
    ['GET', /^\/api\/state$/, api((u) => publicState(u))],
    ['POST', /^\/api\/tx$/, api((u, b) => ({ tx: ops.addTx(u, b, 'app') }))],
    ['PATCH', /^\/api\/tx\/([\w-]+)$/, api((u, b, id) => ({ tx: ops.updateTx(u, id, b) }))],
    ['DELETE', /^\/api\/tx\/([\w-]+)$/, api((u, _b, id) => ({ tx: ops.deleteTx(u, id) }))],
    ['PUT', /^\/api\/settings$/, api((u, b) => (ops.applySettings(u, b), publicState(u)))],
    ['POST', /^\/api\/goals$/, api((u, b) => ({ goal: ops.addGoal(u, b) }))],
    ['POST', /^\/api\/goals\/([\w-]+)\/deposit$/, api((u, b, id) => ({ goal: ops.depositGoal(u, id, b.amount) }))],
    ['DELETE', /^\/api\/goals\/([\w-]+)$/, api((u, _b, id) => ({ goal: ops.deleteGoal(u, id) }))],
    ['POST', /^\/api\/recurring$/, api((u, b) => ({ recurring: ops.addRecurring(u, b) }))],
    ['DELETE', /^\/api\/recurring\/([\w-]+)$/, api((u, _b, id) => ({ recurring: ops.deleteRecurring(u, id) }))],
    ['GET', /^\/api\/export\.csv$/, exportCsv],
  ];

  function api(fn) {
    return async (req, url, params) => {
      const userId = await userFromRequest(req, url);
      if (!userId) return json({ error: 'unauthorized' }, 401);
      const body = req.method === 'GET' || req.method === 'DELETE' ? {} : await req.json().catch(() => ({}));
      try {
        return json(await withUser(userId, url.origin, (u) => fn(u, body || {}, params[0])));
      } catch (e) {
        return json({ error: e.message }, 400);
      }
    };
  }

  async function webhook(req, url, _p, waitUntil) {
    const raw = new Uint8Array(await req.arrayBuffer());
    if (!(await line.verifySignature(raw, req.headers.get('x-line-signature')))) return text('bad signature', 401);
    let body;
    try {
      body = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      return text('bad json', 400);
    }
    // ตอบ LINE ทันที แล้วค่อยประมวลผลเบื้องหลัง
    for (const event of body.events || []) {
      waitUntil(
        (async () => {
          const userId = event.source?.userId;
          if (event.type === 'message' && event.message.type === 'image' && userId) await line.loading(userId, 30);
          const bot = await botFor(userId, url.origin);
          const { messages } = await bot.handleEvent(event);
          if (messages.length && event.replyToken) await line.reply(event.replyToken, messages);
        })().catch((e) => console.error('webhook event failed:', e.message))
      );
    }
    return text('ok');
  }

  async function adminRichMenu(_req, url) {
    if (!cfg.adminKey || url.searchParams.get('key') !== cfg.adminKey) return text('ต้องใส่ ?key= ให้ตรงกับ APP_SECRET', 403);
    try {
      const r = await setupRichMenu(cfg, await loadAsset('/assets/richmenu.png'));
      return text(`✅ ตั้ง Rich Menu เรียบร้อย (${r.richMenuId})\nปุ่มแดชบอร์ดเปิดด้วย ${r.dashboard}\nปิดแอป LINE แล้วเปิดใหม่เพื่อดูเมนู`);
    } catch (e) {
      return text(`❌ ${e.message}`, 500);
    }
  }

  async function authLiff(req, url) {
    try {
      const { idToken } = await req.json();
      const { userId, name, pictureUrl } = await line.verifyIdToken(idToken);
      await withUser(userId, url.origin, (user) => {
        if (name && user.name === 'เพื่อนหมุนตังค์') user.name = name;
        if (pictureUrl) user.pictureUrl = pictureUrl;
      });
      return json({ token: await auth.makeToken(userId) });
    } catch (e) {
      return json({ error: e.message }, 401);
    }
  }

  async function authDemo() {
    if (!cfg.demoMode) return json({ error: 'demo disabled' }, 403);
    if (!(await store.get(DEMO_USER))) await store.save(seedDemo(ops.newUser(DEMO_USER)));
    return json({ token: await auth.makeToken(DEMO_USER) });
  }

  async function simEvent(req, url) {
    if (!cfg.demoMode) return json({ error: 'demo disabled' }, 403);
    const { userId, event } = await req.json().catch(() => ({}));
    if (!/^sim-[a-z0-9]{4,24}$/i.test(userId || '')) return json({ error: 'bad userId' }, 400);
    try {
      const bot = await botFor(userId, url.origin);
      return json(await bot.handleEvent({ ...event, source: { type: 'user', userId } }));
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  async function exportCsv(req, url) {
    const userId = await userFromRequest(req, url);
    if (!userId) return json({ error: 'unauthorized' }, 401);
    const bot = await botFor(userId, url.origin);
    const csv = ops.toCSV(await bot.loadUser(userId));
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="muntang-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return {
    hasLine,
    push: (to, messages) => line.push(to, messages),
    /** คืน Response หรือ null (ให้ platform เสิร์ฟไฟล์ static แทน) */
    async handle(req, waitUntil = (p) => p) {
      const url = new URL(req.url);
      for (const [method, re, fn] of routes) {
        const m = url.pathname.match(re);
        if (m && req.method === method) return fn(req, url, m.slice(1), waitUntil);
      }
      if (/^\/(api|admin|webhook)(\/|$)/.test(url.pathname)) return json({ error: 'not found' }, 404);
      return null;
    },
  };
}
