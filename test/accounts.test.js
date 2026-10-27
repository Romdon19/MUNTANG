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
