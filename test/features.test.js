import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBot, looksLikeGroupEntry, monthlyReportDue } from '../src/core/bot.js';
import { cycleOf } from '../src/core/dates.js';
import * as ops from '../src/core/ops.js';

const now = new Date('2026-10-24T05:00:00Z'); // 12:00 เวลาไทย

function memStore() {
  const db = {};
  return { get: async (id) => (db[id] ? structuredClone(db[id]) : null), save: async (u) => void (db[u.id] = structuredClone(u)), db };
}
const textEvent = (source, text) => ({ type: 'message', source, message: { type: 'text', text } });

test('budget cycle starting on the 25th', async () => {
  assert.deepEqual(cycleOf('2026-10-24', 25).from, '2026-09-25');
  assert.deepEqual(cycleOf('2026-10-25', 25).to, '2026-11-24');
  const store = memStore();
  const bot = createBot({ store, now: () => now, links: {} });
  const U = { type: 'user', userId: 'U1' };
  await bot.handleEvent(textEvent(U, 'รอบบัญชี 25'));
  assert.equal(store.db.U1.settings.cycleStartDay, 25);
  await bot.handleEvent(textEvent(U, '20/10 ค่าห้อง 4500'));
  await bot.handleEvent(textEvent(U, '20/9 ค่าห้อง 4500')); // อยู่รอบที่แล้ว
  const r = await bot.handleEvent(textEvent(U, 'สรุปเดือนนี้'));
  assert.match(r.messages[0].altText, /จ่าย ฿4,500/);
});

test('onboarding flow through postbacks', async () => {
  const store = memStore();
  const bot = createBot({ store, now: () => now, links: {} });
  const U = { type: 'user', userId: 'U2' };
  const follow = await bot.handleEvent({ type: 'follow', source: U });
  assert.equal(follow.messages.length, 2);
  const pb = (data) => bot.handleEvent({ type: 'postback', source: U, postback: { data } });
  await pb('action=setup&step=cycle&v=25');
  await pb('action=setup&step=budget&v=15000');
  const done = await pb('action=setup&step=reminder&v=21:00');
  assert.match(done.messages[0].text, /ตั้งค่าเสร็จแล้ว/);
  assert.deepEqual(
    [store.db.U2.settings.cycleStartDay, store.db.U2.settings.monthlyBudget, store.db.U2.settings.reminder, store.db.U2.settings.onboarded],
    [25, 15000, '21:00', true]
  );
});

test('group chat: shared ledger, records who logged, ignores chatter', async () => {
  assert.ok(looksLikeGroupEntry('ค่าข้าวเย็น 450'));
  assert.ok(looksLikeGroupEntry('50 ค่ารถ'));
  assert.ok(!looksLikeGroupEntry('เดี๋ยวไปกิน 7 โมงนะ'));
  assert.ok(!looksLikeGroupEntry('ใครว่างบ้าง'));
  const store = memStore();
  const bot = createBot({ store, now: () => now, links: {}, getMemberName: async (s) => (s.userId === 'Ua' ? 'แม่' : 'พ่อ') });
  const G = (userId) => ({ type: 'group', groupId: 'Cfamily', userId });
  let r = await bot.handleEvent(textEvent(G('Ua'), 'เดี๋ยวไปกิน 7 โมงนะ'));
  assert.equal(r.messages.length, 0);
  r = await bot.handleEvent(textEvent(G('Ua'), 'ค่าข้าวเย็น 450'));
  assert.equal(r.messages[0].type, 'flex');
  await bot.handleEvent(textEvent(G('Ub'), 'จด วันนี้ซื้อของเข้าบ้าน 820'));
  assert.deepEqual(store.db.Cfamily.txs.map((t) => [t.by, t.amount]), [['แม่', 450], ['พ่อ', 820]]);
  assert.equal(store.db.Ua, undefined);
});

test('voice notes are transcribed then recorded', async () => {
  const store = memStore();
  const bot = createBot({ store, now: () => now, links: {}, getImage: async () => ({ data: 'x' }), transcribe: async () => 'ข้าวมันไก่ 50' });
  const r = await bot.handleEvent({ type: 'message', source: { type: 'user', userId: 'U3' }, message: { type: 'audio', id: '1' } });
  assert.match(r.messages[0].text, /ได้ยินว่า/);
  assert.equal(store.db.U3.txs[0].amount, 50);
});

test('PDF statement import and undo as a batch', async () => {
  const store = memStore();
  const ai = {
    readStatement: async () => [
      { note: 'โอนให้ สมชาย', amount: 500, type: 'expense', categoryId: 'other', date: '2026-10-02', wallet: 'bank' },
      { note: 'เงินเดือน', amount: 30000, type: 'income', categoryId: 'salary', date: '2026-10-01', wallet: 'bank' },
    ],
  };
  const bot = createBot({ store, ai, now: () => now, links: {}, getImage: async () => ({ data: 'pdf' }) });
  const U = { type: 'user', userId: 'U4' };
  const r = await bot.handleEvent({ type: 'message', source: U, message: { type: 'file', id: '1', fileName: 'statement.pdf', fileSize: 1000 } });
  assert.match(r.messages[0].altText, /นำเข้า 2 รายการ/);
  const batch = store.db.U4.txs[0].batch;
  await bot.handleEvent({ type: 'postback', source: U, postback: { data: `action=undobatch&b=${batch}` } });
  assert.equal(store.db.U4.txs.length, 0);
});

test('image after a text entry is attached as evidence', async () => {
  const store = memStore();
  const saved = {};
  const files = { put: async (k, b) => void (saved[k] = b) };
  const bot = createBot({ store, files, links: {}, getImage: async () => ({ data: 'x', bytes: new Uint8Array([1, 2]), mediaType: 'image/jpeg' }) });
  const U = { type: 'user', userId: 'U5' };
  await bot.handleEvent(textEvent(U, 'ค่าซ่อมรถ 1200'));
  const r = await bot.handleEvent({ type: 'message', source: U, message: { type: 'image', id: '1' } });
  assert.match(r.messages[0].text, /แนบรูปเป็นหลักฐาน/);
  const tx = store.db.U5.txs[0];
  assert.ok(saved[tx.attachment]);
});

test('monthly report is due on the first day of the cycle after 09:00, once', () => {
  const u = ops.newUser('U6');
  u.settings.cycleStartDay = 25;
  ops.addTx(u, { note: 'ข้าว', amount: 50, date: '2026-10-20' });
  assert.equal(monthlyReportDue(u, new Date('2026-10-25T01:00:00Z')), null); // 08:00
  const due = monthlyReportDue(u, new Date('2026-10-25T03:00:00Z')); // 10:00
  assert.equal(due.from, '2026-09-25');
  u.settings.lastReport = '2026-10-25';
  assert.equal(monthlyReportDue(u, new Date('2026-10-25T04:00:00Z')), null);
});
