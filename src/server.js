import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { createFileStore } from './store.js';
import { line, verifySignature } from './line.js';
import { createAI } from './ai.js';
import { makeToken, readToken } from './auth.js';
import { startScheduler } from './scheduler.js';
import { setupRichMenu } from './richmenu.js';
import { createBot } from './core/bot.js';
import * as ops from './core/ops.js';
import { seedDemo } from './core/demo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const store = createFileStore(config.dataDir);
const ai = createAI();
const hasLine = !!(config.lineChannelSecret && config.lineAccessToken);

const links = {
  dashboard(userId) {
    if (config.liffId) return `https://liff.line.me/${config.liffId}`;
    if (config.baseUrl) return `${config.baseUrl}/app/?t=${makeToken(userId)}`;
    return config.demoMode ? `/app/?t=${makeToken(userId)}` : undefined;
  },
  export(userId) {
    const base = config.baseUrl || (config.demoMode ? '' : null);
    return base == null ? undefined : `${base}/api/export.csv?t=${makeToken(userId, 1)}`;
  },
};

const bot = createBot({
  store,
  ai,
  links,
  logoUrl: config.baseUrl ? `${config.baseUrl}/assets/logo-192.jpg` : config.demoMode ? '/assets/logo-192.jpg' : undefined,
  getProfile: hasLine ? (id) => (id.startsWith('U') ? line.profile(id) : null) : undefined,
  getImage: (event) => (event.message.imageData ? event.message.imageData : line.content(event.message.id)),
});

const app = express();
app.disable('x-powered-by');
app.use(
  express.json({
    limit: '12mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// ---------------- LINE webhook ----------------
app.post('/webhook', (req, res) => {
  if (!verifySignature(req.rawBody, req.get('x-line-signature'))) return res.status(401).send('bad signature');
  res.sendStatus(200); // ตอบ LINE ทันที แล้วค่อยประมวลผล
  for (const event of req.body.events || []) {
    (async () => {
      if (event.type === 'message' && event.message.type === 'image' && event.source?.userId) line.loading(event.source.userId, 30);
      const { messages } = await bot.handleEvent(event);
      if (messages.length && event.replyToken) await line.reply(event.replyToken, messages);
    })().catch((e) => console.error('webhook event failed:', e.message));
  }
});

// ---------------- static ----------------
app.get('/config.js', (_req, res) => {
  res.type('application/javascript').send(
    `window.MUNTANG_CONFIG=${JSON.stringify({ liffId: config.liffId, demoMode: config.demoMode, aiEnabled: !!ai })};`
  );
});
app.use('/core', express.static(path.join(__dirname, 'core')));
app.use(express.static(path.join(ROOT, 'public')));

// ---------------- auth ----------------
const DEMO_USER = 'demo-user';

app.post('/api/auth/liff', async (req, res) => {
  try {
    const { userId, name, pictureUrl } = await line.verifyIdToken(req.body.idToken);
    const user = await bot.loadUser(userId);
    if (name && user.name === 'เพื่อนหมุนตังค์') user.name = name;
    if (pictureUrl) user.pictureUrl = pictureUrl;
    await store.save(user);
    res.json({ token: makeToken(userId) });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

app.post('/api/auth/demo', async (_req, res) => {
  if (!config.demoMode) return res.status(403).json({ error: 'demo disabled' });
  let user = await store.get(DEMO_USER);
  if (!user) {
    user = seedDemo(ops.newUser(DEMO_USER));
    await store.save(user);
  }
  res.json({ token: makeToken(DEMO_USER) });
});

function auth(req, res, next) {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '') || req.query.t;
  const userId = readToken(token);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  req.userId = userId;
  next();
}

// โหลด user -> ทำงาน -> บันทึก
const withUser = (fn) => async (req, res) => {
  try {
    const user = await bot.loadUser(req.userId);
    const result = await fn(user, req, res);
    await store.save(user);
    if (result !== undefined) res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

const publicState = (user) => ops.publicState(user, { aiEnabled: !!ai });

app.get('/api/state', auth, withUser((u) => publicState(u)));
app.post('/api/tx', auth, withUser((u, req) => ({ tx: ops.addTx(u, req.body, 'app') })));
app.patch('/api/tx/:id', auth, withUser((u, req) => ({ tx: ops.updateTx(u, req.params.id, req.body) })));
app.delete('/api/tx/:id', auth, withUser((u, req) => ({ tx: ops.deleteTx(u, req.params.id) })));
app.put(
  '/api/settings',
  auth,
  withUser((u, req) => {
    ops.applySettings(u, req.body);
    return publicState(u);
  })
);
app.post('/api/goals', auth, withUser((u, req) => ({ goal: ops.addGoal(u, req.body) })));
app.post('/api/goals/:id/deposit', auth, withUser((u, req) => ({ goal: ops.depositGoal(u, req.params.id, req.body.amount) })));
app.delete('/api/goals/:id', auth, withUser((u, req) => ({ goal: ops.deleteGoal(u, req.params.id) })));
app.post('/api/recurring', auth, withUser((u, req) => ({ recurring: ops.addRecurring(u, req.body) })));
app.delete('/api/recurring/:id', auth, withUser((u, req) => ({ recurring: ops.deleteRecurring(u, req.params.id) })));

app.get(
  '/api/export.csv',
  auth,
  withUser((u, _req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="muntang-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(ops.toCSV(u));
  })
);

// ---------------- simulator (โหมดเดโม) ----------------
app.post('/api/sim/event', async (req, res) => {
  if (!config.demoMode) return res.status(403).json({ error: 'demo disabled' });
  const { userId, event } = req.body || {};
  if (!/^sim-[a-z0-9]{4,24}$/i.test(userId || '')) return res.status(400).json({ error: 'bad userId' });
  try {
    const result = await bot.handleEvent({ ...event, source: { type: 'user', userId } });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ตั้ง Rich Menu จากเบราว์เซอร์: /admin/setup-richmenu?key=<APP_SECRET>
app.get('/admin/setup-richmenu', async (req, res) => {
  if (!process.env.APP_SECRET || req.query.key !== process.env.APP_SECRET) return res.status(403).send('ต้องใส่ ?key= ให้ตรงกับ APP_SECRET');
  try {
    const r = await setupRichMenu();
    res.type('text/plain; charset=utf-8').send(`✅ ตั้ง Rich Menu เรียบร้อย (${r.richMenuId})\nปุ่มแดชบอร์ดเปิดด้วย ${r.dashboard}\nปิดแอป LINE แล้วเปิดใหม่เพื่อดูเมนู`);
  } catch (e) {
    res.status(500).type('text/plain; charset=utf-8').send(`❌ ${e.message}`);
  }
});

app.get('/healthz', (_req, res) => res.json({ ok: true, line: hasLine, ai: !!ai, demo: config.demoMode }));

app.listen(config.port, () => {
  console.log(`🌀 หมุนตังค์ พร้อมแล้วที่ http://localhost:${config.port}`);
  console.log(`   LINE: ${hasLine ? 'เชื่อมต่อแล้ว' : 'ยังไม่ได้ตั้งค่า'} · AI: ${ai ? config.claudeModel : 'ปิด'} · Demo: ${config.demoMode ? 'เปิด' : 'ปิด'}`);
  if (config.demoMode) console.log(`   ลองแชทจำลองที่ http://localhost:${config.port}/simulator/`);
});

if (hasLine) startScheduler({ store, push: (to, messages) => line.push(to, messages) });
