import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBot } from '../src/core/bot.js';
import { guessAccount } from '../src/core/accounts.js';
import { parseEntries } from '../src/core/parser.js';
import * as ops from '../src/core/ops.js';

const now = new Date('2026-10-24T05:00:00Z');

function memStore() {
  const db = {};
  return { get: async (id) => (db[id] ? structuredClone(db[id]) : null), save: async (u) => void (db[u.id] = structuredClone(u)), db };
}
const U = { type: 'user', userId: 'U1' };
const say = (bot, text) => bot.handleEvent({ type: 'message', source: U, message: { type: 'text', text } });
const bal = (user, id) => ops.accountList(user, now).find((a) => a.id === id);

test('first real bank/card replaces the generic placeholder accounts', () => {
  const u = ops.newUser('U1');
  const k = ops.addAccount(u, { type: 'bank', name: 'กสิกร', balance: 12000 }, now);
  assert.equal(k.id, 'bank');
  assert.equal(k.provider, 'kbank');
  const s = ops.addAccount(u, { type: 'bank', name: 'SCB เงินเก็บ', balance: 50000 }, now);
  assert.notEqual(s.id, 'bank');
  assert.equal(s.provider, 'scb');
  assert.equal(ops.addAccount(u, { type: 'card', name: 'KTC', limit: 20000 }, now).id, 'card');
  assert.equal(u.accounts.length, 4);
});

test('chat picks the account from its name and strips it from the note', () => {
  const u = ops.newUser('U1');
  ops.addAccount(u, { type: 'bank', name: 'กสิกร' }, now);
  ops.addAccount(u, { type: 'ewallet', name: 'TrueMoney' }, now);
  ops.addAccount(u, { type: 'card', name: 'KTC', limit: 20000 }, now);
  const p = (t) => parseEntries(t, { now, accounts: u.accounts, defaultWallet: 'cash' }).items[0];
  assert.deepEqual([p('กาแฟ 45 กสิกร').wallet, p('กาแฟ 45 กสิกร').note], ['bank', 'กาแฟ']);
  assert.equal(p('ชาบู 459 บัตร ktc').wallet, 'card');
  assert.equal(p('ชาบู 459 บัตร').wallet, 'card');
  assert.equal(p('ค่าไฟ 850 โอน').wallet, 'bank');
  assert.equal(p('ขนม 30 ทรูมันนี่').wallet, u.accounts.find((a) => a.type === 'ewallet').id);
  assert.equal(p('ข้าว 50').wallet, 'cash');
  // ชื่อกลางๆ ไม่ชนกับข้อความทั่วไป
  assert.equal(guessAccount('ค่าบิลทรู 599', u.accounts, { strict: true }), null);
});

test('balances, credit card usage and transfers', async () => {
  const store = memStore();
  const bot = createBot({ store, now: () => now, links: {} });
  await say(bot, 'เพิ่มบัญชี กสิกร 10000');
  await say(bot, 'เพิ่มบัตร KTC วงเงิน 20000 ใช้ไป 3000');
  await say(bot, 'ยอด เงินสด 1000');
  await say(bot, 'ข้าว 50'); // เงินสด (ค่าเริ่มต้น)
  await say(bot, 'ค่าไฟ 850 กสิกร');
  await say(bot, 'ชาบู 1200 บัตร ktc');
  await say(bot, '+ขายของ 500 กสิกร');
  let u = store.db.U1;
  assert.equal(bal(u, 'cash').balance, 950);
  assert.equal(bal(u, 'bank').balance, 9650);
  assert.equal(bal(u, 'card').used, 4200);
  assert.equal(bal(u, 'card').available, 15800);

  // จ่ายบัตร / กดเงิน / โอน ไม่นับเป็นรายจ่าย
  const before = ops.summaryFor(u, 'today', now).expense;
  await say(bot, 'จ่ายบัตร ktc 4200 จาก กสิกร');
  await say(bot, 'กดเงิน 2000 กสิกร');
  const r = await say(bot, 'บัญชี');
  assert.match(r.messages[0].altText, /กระเป๋าเงิน/);
  u = store.db.U1;
  assert.equal(ops.summaryFor(u, 'today', now).expense, before);
  assert.equal(bal(u, 'card').used, 0);
  assert.equal(bal(u, 'bank').balance, 9650 - 4200 - 2000);
  assert.equal(bal(u, 'cash').balance, 2950);

  // "เติมน้ำมัน" ไม่ใช่การเติม e-Wallet → จดเป็นรายจ่ายตามปกติ
  await say(bot, 'เติมน้ำมัน 500');
  assert.equal(store.db.U1.txs.at(-1).note, 'เติมน้ำมัน');
});

test('deleting a used account hides it but keeps history', () => {
  const u = ops.newUser('U1');
  const a = ops.addAccount(u, { type: 'bank', name: 'SCB', balance: 100 }, now);
  ops.addTx(u, { amount: 20, note: 'ขนม', wallet: a.id });
  ops.deleteAccount(u, a.id);
  assert.equal(ops.accountList(u, now).find((x) => x.id === a.id).archived, true);
  const b = ops.addAccount(u, { type: 'ewallet', name: 'ShopeePay' }, now);
  ops.deleteAccount(u, b.id);
  assert.equal(u.accounts.some((x) => x.id === b.id), false);
});

test('loans and receivables move through transfers and count in net worth', async () => {
  const store = memStore();
  const bot = createBot({ store, now: () => now, links: {} });
  await say(bot, 'เพิ่มบัญชี กสิกร 20000');
  await say(bot, 'เพิ่มหนี้ ผ่อนรถ 100000 ผ่อน 5000');
  await say(bot, 'จ่ายหนี้ ผ่อนรถ'); // ค่างวดจากธนาคาร
  await say(bot, 'ยืม แม่ 3000');
  await say(bot, 'ให้ยืม ต้น 800');
  await say(bot, 'ต้น คืน 300');
  await say(bot, 'ข้าว 50 ให้แม่'); // ชื่อหนี้ "แม่" ต้องไม่กลายเป็นช่องทางจ่าย
  const u = store.db.U1;
  const list = ops.accountList(u, now);
  const by = (name) => list.find((a) => a.name === name);
  assert.equal(by('ผ่อนรถ').used, 95000);
  assert.equal(by('ผ่อนรถ').monthsLeft, 19);
  assert.equal(by('กสิกร').balance, 15000);
  assert.equal(by('แม่').used, 3000);
  assert.equal(by('ต้น').balance, 500);
  assert.notEqual(u.txs.at(-1).wallet, by('แม่').id);
  assert.equal(ops.summaryFor(u, 'today', now).expense, 50);
  const ins = ops.insightsFor(u, now);
  assert.ok(ins.health.score >= 0 && ins.health.score <= 100);
  assert.equal(ins.debts.length, 2);
  const r = await say(bot, 'สุขภาพการเงิน');
  assert.match(r.messages[0].altText, /สุขภาพการเงิน \d+\/100/);
});

test('installments through a credit card hold the limit and are paid with the card bill', async () => {
  const store = memStore();
  let clock = new Date('2026-10-28T05:00:00Z');
  const bot = createBot({ store, now: () => clock, links: {} });
  const say2 = (text) => bot.handleEvent({ type: 'message', source: U, message: { type: 'text', text } });
  await say2('เพิ่มบัญชี กสิกร 20000');
  await say2('เพิ่มบัตร Express วงเงิน 40000');
  await say2('ตั้งบัตร express ตัดรอบ 18 จ่าย 1 งบ 5000');
  await say2('เพิ่มผ่อน iPhone 15 580.56 งวด 12/36 บัตร express');
  await say2('ชาบู 459 express'); // หลังวันตัดรอบ → ไปบิลหน้า
  let card = ops.accountList(store.db.U1, clock).find((a) => a.name === 'Express');
  let inst = ops.accountList(store.db.U1, clock).find((a) => a.name === 'iPhone 15');
  assert.equal(inst.used, 14514); // 25 งวด × 580.56 (งวด 12 ยังไม่จ่าย)
  assert.equal(inst.paidInstallments, 11);
  assert.equal(card.instOwed, 14514);
  assert.equal(card.available, 40000 - 459 - 14514);
  assert.equal(card.payNow, 580.56);
  assert.equal(card.cycle.due, '2026-11-01');
  assert.equal(card.budgetLeft, 5000 - 459);
  // หนี้ไม่ถูกนับซ้ำ
  const t = (await import('../src/core/accounts.js')).accountTotals(ops.accountList(store.db.U1, clock));
  assert.equal(t.debt, 459 + 14514);
  clock = new Date('2026-11-01T03:00:00Z');
  await say2('จ่ายบัตร express');
  card = ops.accountList(store.db.U1, clock).find((a) => a.name === 'Express');
  inst = ops.accountList(store.db.U1, clock).find((a) => a.name === 'iPhone 15');
  assert.equal(inst.paidInstallments, 12);
  assert.equal(inst.used, 13933.44);
  assert.equal(card.used, 459); // ยอดรูดหลังตัดรอบยังอยู่ รอบิลหน้า
  assert.equal(card.payNow, 0);
});

test('backdated entries before the set balance are flagged and can be counted in', async () => {
  const store = memStore();
  const bot = createBot({ store, now: () => now, links: {} });
  await say(bot, 'เพิ่มบัญชี กสิกร 10000');
  const r = await say(bot, '20/9 +ขายของ 2000 กสิกร');
  const note = r.messages.find((m) => m.type === 'text' && /ก่อนวันที่ตั้งยอด/.test(m.text));
  assert.ok(note, 'should explain why the balance did not change');
  assert.equal(bal(store.db.U1, 'bank').balance, 10000);
  const data = note.quickReply.items[0].action.data;
  await bot.handleEvent({ type: 'postback', source: U, postback: { data } });
  assert.equal(bal(store.db.U1, 'bank').balance, 12000);
});

test('minimum card payment keeps the rest as card debt; card interest is an expense', async () => {
  const store = memStore();
  const bot = createBot({ store, now: () => now, links: {} });
  await say(bot, 'เพิ่มบัญชี กสิกร 10000');
  await say(bot, 'เพิ่มบัตร KTC วงเงิน 20000 ใช้ไป 7000');
  await say(bot, 'จ่ายบัตร ktc 550 จาก กสิกร');
  let u = store.db.U1;
  assert.equal(bal(u, 'card').used, 6450);
  assert.equal(bal(u, 'bank').balance, 9450);
  await say(bot, 'ดอกเบี้ยบัตร 85 ktc');
  u = store.db.U1;
  assert.equal(u.txs.at(-1).type, 'expense');
  assert.equal(bal(u, 'card').used, 6535);
});
