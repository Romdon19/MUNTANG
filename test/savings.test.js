import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ops from '../src/core/ops.js';

const now = new Date('2026-11-21T05:00:00Z');
const at = (d, h = 5) => new Date(`${d}T0${h}:00:00Z`);

test('savings account: monthly deposits, spending from savings, borrowing and paying back', () => {
  const u = ops.newUser('U1');
  const main = ops.addAccount(u, { type: 'bank', name: 'K+ PLUS', balance: 20000 }, at('2026-09-01', 1));
  const term = ops.addAccount(u, { type: 'bank', name: 'SCB ค่าเทอม', balance: 0, isSavings: true, goal: 30000, purpose: 'ค่าเทอม' }, at('2026-09-01', 1));
  ops.addTransfer(u, { from: main.id, to: term.id, amount: 5000, date: '2026-09-25' }, at('2026-09-25'));
  ops.addTransfer(u, { from: main.id, to: term.id, amount: 5000, date: '2026-10-25' }, at('2026-10-25'));
  // เดือนนี้เงินไม่พอ ยืมเงินออมไปหมุน 3000 แล้วคืน 2000 + ฝากเพิ่ม 5000 (โอนก้อนเดียว 7000)
  ops.addTransfer(u, { from: term.id, to: main.id, amount: 3000, date: '2026-11-05' }, at('2026-11-05'));
  ops.addTx(u, { amount: 1200, note: 'ค่าหนังสือ', categoryId: 'education', wallet: term.id, date: '2026-11-10' });
  ops.addTransfer(u, { from: main.id, to: term.id, amount: 2000, date: '2026-11-15' }, at('2026-11-15'));
  const s = ops.savingsInfo(u, term.id, now);
  assert.equal(s.balance, 5000 + 5000 - 3000 - 1200 + 2000);
  assert.equal(s.owed, 1000); // ยืม 3000 คืน 2000
  assert.equal(s.goal, 30000);
  assert.equal(s.purpose, 'ค่าเทอม');
  assert.equal(s.month.borrow, 3000);
  assert.equal(s.month.spend, 1200);
  assert.equal(s.month.repay, 2000);
  assert.equal(s.months.find((m) => m.month === '2026-10').deposit, 5000);
  assert.deepEqual(s.outflows.map((o) => o.kind), ['spend', 'borrow']);
  // เบิกแบบไม่ต้องคืน → ไม่นับเป็นยอดค้าง
  const x = u.transfers.find((t) => t.from === term.id);
  ops.updateTransfer(u, x.id, { noRepay: true });
  assert.equal(ops.savingsInfo(u, term.id, now).owed, 0);
  assert.equal(ops.publicState(u, { now }).savings.length, 1);
});

test('a normal account is not a savings account until marked', () => {
  const u = ops.newUser('U1');
  const a = ops.addAccount(u, { type: 'bank', name: 'กสิกร เงินเก็บ', balance: 1000 }, now);
  assert.equal(ops.savingsInfo(u, a.id, now), null);
  ops.updateAccount(u, a.id, { isSavings: true, goal: 50000 }, now);
  assert.equal(ops.savingsInfo(u, a.id, now).pct, 0.02);
  ops.updateAccount(u, a.id, { isSavings: false }, now);
  assert.equal(u.accounts.find((x) => x.id === a.id).goal, undefined);
});

test('chat: set a savings account, borrow from it and pay back', async () => {
  const { createBot } = await import('../src/core/bot.js');
  const db = {};
  const store = { get: async (id) => (db[id] ? structuredClone(db[id]) : null), save: async (u) => void (db[u.id] = structuredClone(u)) };
  const bot = createBot({ store, now: () => now, links: {} });
  const say = (text) => bot.handleEvent({ type: 'message', source: { type: 'user', userId: 'U1' }, message: { type: 'text', text } });
  await say('เพิ่มบัญชี กสิกร 5000');
  await say('เพิ่มบัญชี SCB 10000');
  const r = await say('ตั้งออม SCB เป้า 30000 ค่าเทอม');
  assert.match(r.messages[0].altText, /เงินออมรวม ฿10,000/);
  await say('โอน 3000 SCB ไป กสิกร');
  let s = (await import('../src/core/ops.js')).savingsList(db.U1, now)[0];
  assert.equal(s.owed, 3000);
  assert.equal(s.purpose, 'ค่าเทอม');
  const card = await say('เงินออม');
  const payBack = JSON.stringify(card.messages[0]).match(/"text":"(โอน 3000 ไป [^"]+)"/)[1];
  await say(payBack);
  s = (await import('../src/core/ops.js')).savingsList(db.U1, now)[0];
  assert.equal(s.owed, 0);
  assert.equal(s.balance, 10000);
});

test('savings plan: how much to save per month to reach the goal by a date', () => {
  const u = ops.newUser('U1');
  const main = ops.addAccount(u, { type: 'bank', name: 'K+ PLUS', balance: 50000 }, at('2026-11-01', 1));
  const term = ops.addAccount(u, { type: 'bank', name: 'SCB RBAC', balance: 5629.14, isSavings: true, goal: 50556.25, goalDate: '2027-05-31', purpose: 'ค่าเทอม' }, at('2026-11-01', 1));
  let s = ops.savingsInfo(u, term.id, now); // 21 พ.ย. 69 → พ.ค. 70 = 7 เดือน (พ.ย.–พ.ค.)
  assert.equal(s.plan.monthsLeft, 7);
  assert.equal(s.plan.perMonth, Math.ceil((50556.25 - 5629.14) / 7));
  assert.equal(s.plan.needThisMonth, s.plan.perMonth);
  ops.addTransfer(u, { from: main.id, to: term.id, amount: 3000, date: '2026-11-21' }, at('2026-11-21'));
  s = ops.savingsInfo(u, term.id, now);
  assert.equal(s.plan.perMonth, Math.ceil((50556.25 - 5629.14) / 7)); // ฝากเดือนนี้ไม่ทำให้เป้าต่อเดือนเปลี่ยน
  assert.equal(s.plan.needThisMonth, Math.ceil((50556.25 - 5629.14) / 7 - 3000));
});

test('chat: set a savings goal with a date', async () => {
  const { createBot } = await import('../src/core/bot.js');
  for (const [text, date] of [['ตั้งออม SCB เป้า 50556.25 ภายใน 31/5/2570 ค่าเทอม', '2027-05-31'], ['ตั้งออม SCB เป้า 50000 ก่อน 31 พ.ค. ค่าเทอม', '2027-05-31']]) {
    const db = {};
    const store = { get: async (id) => (db[id] ? structuredClone(db[id]) : null), save: async (u) => void (db[u.id] = structuredClone(u)) };
    const bot = createBot({ store, now: () => now, links: {} });
    const say = (t) => bot.handleEvent({ type: 'message', source: { type: 'user', userId: 'U1' }, message: { type: 'text', text: t } });
    await say('เพิ่มบัญชี SCB RBAC 5629.14');
    await say(text);
    const s = ops.savingsList(db.U1, now)[0];
    assert.equal(s.plan?.goalDate, date, text);
    assert.equal(s.purpose, 'ค่าเทอม', text);
    assert.ok(s.plan.perMonth > 0);
  }
});
