import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBot } from '../src/core/bot.js';
import * as ops from '../src/core/ops.js';

const U = { type: 'user', userId: 'U1' };
function setup(clock) {
  const db = {};
  const store = { get: async (id) => (db[id] ? structuredClone(db[id]) : null), save: async (u) => void (db[u.id] = structuredClone(u)) };
  const bot = createBot({ store, now: () => clock.t, links: {} });
  const say = (text) => bot.handleEvent({ type: 'message', source: U, message: { type: 'text', text } });
  return { db, bot, say };
}

test('a trip separates travel spending from daily spending', async () => {
  const clock = { t: new Date('2026-11-05T05:00:00Z') };
  const { db, say } = setup(clock);
  await say('ข้าว 50');
  const r = await say('เริ่มทริป เชียงใหม่ งบ 8000');
  assert.match(r.messages[0].altText, /เริ่มทริป 🧳 เชียงใหม่/);
  await say('ค่าน้ำมัน 800');
  await say('โรงแรม 1500');
  await say('+เงินเดือน 25000'); // รายรับไม่ติดป้ายทริป
  clock.t = new Date('2026-11-07T05:00:00Z');
  await say('ข้าวซอย 80');
  const end = await say('จบทริป');
  assert.match(end.messages[0].altText, /ใช้ไป ฿2,380/);
  await say('กาแฟ 45'); // หลังจบทริป = ประจำวัน
  await say('ของฝาก 300 #เชียงใหม่'); // ติดป้ายเอง
  const u = db.U1;
  const trip = ops.tripList(u, clock.t)[0];
  assert.equal(trip.expense, 2680);
  assert.equal(trip.days, 3);
  assert.equal(trip.budgetLeft, 8000 - 2680);
  const s = ops.summaryFor(u, 'month', clock.t);
  assert.equal(s.tripExpense, 2680);
  assert.equal(s.dailyExpense, 95);
});

test('"ทริป เชียงใหม่" shows a summary instead of starting a trip, and untagging works', async () => {
  const clock = { t: new Date('2026-11-05T05:00:00Z') };
  const { db, bot, say } = setup(clock);
  await say('เริ่มทริป เชียงใหม่');
  const rec = await say('ข้าว 60');
  const untrip = rec.messages[0].quickReply.items.find((i) => /ไม่ใช่ค่าทริป/.test(i.action.label));
  await bot.handleEvent({ type: 'postback', source: U, postback: { data: untrip.action.data } });
  assert.equal(db.U1.txs.at(-1).trip, undefined);
  await say('ทริป เชียงใหม่');
  assert.equal(db.U1.trips.length, 1);
});
