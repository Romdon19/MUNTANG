import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEntries } from '../src/core/parser.js';
import { createBot } from '../src/core/bot.js';
import * as ops from '../src/core/ops.js';

const now = new Date('2026-10-24T05:00:00Z'); // 12:00 เวลาไทย
const p = (t) => parseEntries(t, { now }).items.map((i) => [i.note, i.amount, i.type, i.categoryId, i.date, i.wallet]);

test('parse single and multiple items', () => {
  assert.deepEqual(p('ข้าวมันไก่ 50'), [['ข้าวมันไก่', 50, 'expense', 'food', '2026-10-24', 'cash']]);
  assert.deepEqual(p('กาแฟ 45 ขนม 30').map((x) => x[1]), [45, 30]);
  assert.deepEqual(p('50 ค่ารถ'), [['ค่ารถ', 50, 'expense', 'transport', '2026-10-24', 'cash']]);
  assert.deepEqual(p('ข้าว 40\nน้ำ 15').length, 2);
});

test('parse income, amounts and wallets', () => {
  assert.deepEqual(p('+เงินเดือน 25,000')[0].slice(1, 4), [25000, 'income', 'salary']);
  assert.deepEqual(p('รับ ขายของ 1.2k')[0].slice(1, 4), [1200, 'income', 'sales']);
  assert.equal(p('ชาบู 459 บาท บัตร')[0][5], 'card');
  assert.equal(p('โอนค่าห้อง 4500')[0][5], 'bank');
  assert.deepEqual(p('ค่าเน็ต 3BB 599')[0].slice(0, 2), ['ค่าเน็ต 3BB', 599]);
  assert.deepEqual(p('ข้าว 60 บาท 12:30')[0].slice(0, 2), ['ข้าว', 60]);
  assert.deepEqual(p('สวัสดี'), []);
});

test('parse dates', () => {
  assert.equal(p('เมื่อวาน แท็กซี่ 120')[0][4], '2026-10-23');
  assert.equal(p('12/10 ค่าไฟ 850')[0][4], '2026-10-12');
  assert.equal(p('25/12 ของขวัญ 500')[0][4], '2025-12-25'); // อนาคต -> ปีที่แล้ว
  assert.equal(p('1/10/69 ค่าห้อง 4500')[0][4], '2026-10-01'); // พ.ศ. 2 หลัก
  assert.equal(p('เมื่อวาน\nข้าว 40')[0][4], '2026-10-23');
});

function memStore() {
  const db = {};
  return { get: async (id) => (db[id] ? structuredClone(db[id]) : null), save: async (u) => void (db[u.id] = structuredClone(u)), db };
}

test('bot records, summarizes, budgets and undoes', async () => {
  const store = memStore();
  const bot = createBot({ store, now: () => now, links: {} });
  const say = (text) => bot.handleEvent({ type: 'message', source: { userId: 'U1' }, message: { type: 'text', text } });

  let r = await say('กาแฟ 45 ขนม 30');
  assert.equal(r.messages[0].type, 'flex');
  assert.equal(store.db.U1.txs.length, 2);

  r = await say('งบ 100');
  assert.equal(store.db.U1.settings.monthlyBudget, 100);
  r = await say('ข้าว 20');
  assert.ok(r.messages.some((m) => m.type === 'text' && m.text.includes('งบรวมเดือนนี้ ใช้ไปแล้ว 95%')));

  r = await say('ลบ');
  assert.equal(store.db.U1.txs.length, 2);

  r = await say('สรุปวันนี้');
  assert.match(r.messages[0].altText, /จ่าย ฿75/);

  r = await say('เตือน 21:30');
  assert.equal(store.db.U1.settings.reminder, '21:30');

  r = await say('เป้า เที่ยวญี่ปุ่น 50000');
  r = await say('ออม เที่ยวญี่ปุ่น 1000');
  assert.equal(store.db.U1.goals[0].saved, 1000);

  r = await say('ประจำ ค่าเน็ต 599 ทุกวันที่ 5');
  assert.equal(store.db.U1.recurring[0].day, 5);
  assert.equal(store.db.U1.recurring[0].categoryId, 'bills');

  r = await say('หาร 900 3');
  assert.match(r.messages[0].text, /คนละ ฿300/);
});

test('changing category teaches the keyword', async () => {
  const store = memStore();
  const bot = createBot({ store, now: () => now, links: {} });
  await bot.handleEvent({ type: 'message', source: { userId: 'U2' }, message: { type: 'text', text: 'แมวเหมียว 300' } });
  const tx = store.db.U2.txs[0];
  assert.equal(tx.categoryId, 'other');
  await bot.handleEvent({ type: 'postback', source: { userId: 'U2' }, postback: { data: `action=cat&id=${tx.id}&c=family` } });
  await bot.handleEvent({ type: 'message', source: { userId: 'U2' }, message: { type: 'text', text: 'แมวเหมียว 120' } });
  assert.equal(store.db.U2.txs[1].categoryId, 'family');
});

test('recurring items run once per month', () => {
  const u = ops.newUser('U3');
  ops.addRecurring(u, { note: 'ค่าเน็ต', amount: 599, categoryId: 'bills', day: 5 });
  ops.addRecurring(u, { note: 'ค่าห้อง', amount: 4500, categoryId: 'bills', day: 31 });
  assert.equal(ops.runRecurring(u, now).length, 1); // 24 ต.ค. -> ค่าเน็ตถึงกำหนดแล้ว ค่าห้องยัง
  assert.equal(ops.runRecurring(u, now).length, 0);
  assert.equal(ops.runRecurring(u, new Date('2026-10-31T05:00:00Z')).length, 1);
});
