import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBot } from '../src/core/bot.js';
import { categoriesOf } from '../src/core/categories.js';
import * as ops from '../src/core/ops.js';

const now = new Date('2026-10-24T05:00:00Z');
const U = { type: 'user', userId: 'U1' };

test('onboarding picks categories, adds custom ones and saves the setup', () => {
  const u = ops.newUser('U1');
  ops.applySettings(u, {
    categories: { enabled: ['food', 'transport', 'salary'], custom: [{ name: 'ค่าแมว', emoji: '🐱', type: 'expense' }, { name: 'ค่าเช่าห้อง', type: 'income' }] },
    heardFrom: 'tiktok',
    cycleStartDay: 25,
    monthlyBudget: 12000,
    reminder: '21:00',
    onboarded: true,
  });
  const exp = categoriesOf('expense', u).map((c) => c.name);
  assert.deepEqual(exp, ['อาหาร/เครื่องดื่ม', 'เดินทาง', 'ค่าแมว', 'อื่นๆ']);
  assert.equal(categoriesOf('income', u).at(-1).id, 'other_income');
  assert.equal(u.settings.onboarded, true);
  assert.equal(u.settings.heardFrom, 'tiktok');
  assert.equal(u.settings.cycleStartDay, 25);
  const pub = ops.publicState(u, now);
  assert.equal(pub.categories.find((c) => c.id === 'shopping').hidden, true);
  assert.ok(pub.categories.some((c) => c.custom && c.name === 'ค่าแมว'));
});

test('custom category names are recognised in chat; hidden ones fall back to อื่นๆ; removing moves txs back', async () => {
  const db = {};
  const store = { get: async (id) => (db[id] ? structuredClone(db[id]) : null), save: async (u) => void (db[u.id] = structuredClone(u)) };
  const bot = createBot({ store, now: () => now, links: {} });
  await bot.handleEvent({ type: 'message', source: U, message: { type: 'text', text: 'ข้าว 50' } });
  const u = db.U1;
  ops.setCategories(u, { enabled: ['food'], custom: [{ name: 'ค่าแมว', emoji: '🐱', type: 'expense' }] });
  await store.save(u);
  await bot.handleEvent({ type: 'message', source: U, message: { type: 'text', text: 'ค่าแมว 300' } });
  await bot.handleEvent({ type: 'message', source: U, message: { type: 'text', text: 'ตัดผม 200' } });
  const [cat, hair] = db.U1.txs.slice(-2);
  const own = db.U1.settings.customCats[0];
  assert.equal(cat.categoryId, own.id);
  assert.equal(hair.categoryId, 'other'); // หมวดความสวยงามถูกปิด
  const r = await bot.handleEvent({ type: 'message', source: U, message: { type: 'text', text: 'วันนี้' } });
  assert.ok(r.messages.length);
  ops.setCategories(db.U1, { custom: [] });
  assert.equal(db.U1.txs.find((t) => t.id === cat.id).categoryId, 'other');
});

test('follow event offers the LIFF onboarding when the app link exists', async () => {
  const store = { get: async () => null, save: async () => {} };
  const bot = createBot({ store, now: () => now, links: { view: (v) => `https://liff.line.me/x?view=${v}`, dashboard: () => 'https://liff.line.me/x' } });
  const r = await bot.handleEvent({ type: 'follow', source: U });
  const card = r.messages.find((m) => m.altText === 'ติดตั้งครั้งแรก');
  assert.ok(card);
  assert.match(JSON.stringify(card), /view=onboard/);
});
