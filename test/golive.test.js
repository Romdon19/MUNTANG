// ตรวจก่อนเปิดให้คนอื่นใช้: ขนาดข้อความไม่เกินที่ LINE รับ, กลุ่มไม่จดแชทคุยเล่น, คำสั่งสรุปที่คนน่าจะพิมพ์
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBot, looksLikeGroupEntry } from '../src/core/bot.js';
import * as ops from '../src/core/ops.js';

const L = 'https://liff.line.me/1234567890-abcdefgh';
const memStore = () => {
  const db = {};
  return { db, get: async (id) => (db[id] ? structuredClone(db[id]) : null), save: async (u) => void (db[u.id] = structuredClone(u)), delete: async () => {} };
};
const mkBot = (store) =>
  createBot({
    store,
    now: () => new Date('2026-11-20T05:00:00Z'),
    links: { dashboard: () => L, export: () => 'https://x/e', view: (n) => `${L}?view=${n}`, edit: (i) => `${L}?view=list&edit=${i}` },
    iconUrl: (k) => `https://muntang.67017078.workers.dev/assets/banks/${k}.png`,
    logoUrl: 'https://muntang.67017078.workers.dev/assets/logo-256.png',
  });
const say = (bot, text, src = { type: 'user', userId: 'U1' }) => bot.handleEvent({ type: 'message', replyToken: 'r', source: src, message: { type: 'text', text } });
const bytes = (o) => new TextEncoder().encode(JSON.stringify(o)).length;

/** ข้อจำกัดของ LINE Messaging API */
function assertLineLimits(messages, label) {
  assert.ok(messages.length <= 5, `${label}: เกิน 5 ข้อความ`);
  for (const m of messages) {
    if (m.type === 'flex') {
      const lim = m.contents.type === 'carousel' ? 50000 : 30000;
      assert.ok(bytes(m.contents) <= lim, `${label}: flex ${bytes(m.contents)} > ${lim}`);
      assert.ok(m.altText.length <= 400, `${label}: altText ยาวเกิน`);
      if (m.contents.type === 'carousel') assert.ok(m.contents.contents.length <= 12, `${label}: carousel เกิน 12`);
    } else if (m.type === 'text') assert.ok(m.text.length <= 5000, `${label}: text ยาวเกิน`);
    assert.ok((m.quickReply?.items?.length || 0) <= 13, `${label}: quick reply เกิน 13`);
    JSON.stringify(m, (k, v) => {
      if (k === 'data' && typeof v === 'string') assert.ok(v.length <= 300, `${label}: postback data ${v.length} > 300`);
      if (k === 'label' && typeof v === 'string') assert.ok(v.length <= 40, `${label}: label ยาวเกิน "${v}"`);
      return v;
    });
  }
}

test('จดหลายรายการในข้อความเดียว: การ์ดไม่เกินขนาด ยกเลิกทั้งชุดได้ และจดไม่เกิน 50 รายการ', async () => {
  const store = memStore();
  const bot = mkBot(store);
  for (const n of [3, 12, 30, 60]) {
    const text = Array.from({ length: n }, (_, i) => `${(i % 19) + 1}/11 ข้าวมันไก่ร้านอร่อยมาก ${50 + i}`).join('\n');
    const { messages } = await say(bot, text, { type: 'user', userId: `U${n}` });
    assertLineLimits(messages, `${n} รายการ`);
    assert.equal(store.db[`U${n}`].txs.length, Math.min(n, 50));
    if (n > 1) {
      const undo = messages[0].quickReply.items.find((x) => x.action.label.includes('ยกเลิก'));
      assert.ok(undo, 'มีปุ่มยกเลิกทั้งหมด');
      await bot.handleEvent({ type: 'postback', replyToken: 'r', source: { type: 'user', userId: `U${n}` }, postback: { data: undo.action.data } });
      assert.equal(store.db[`U${n}`].txs.length, 0, 'ยกเลิกทั้งชุดแล้วรายการหายหมด');
    }
  }
});

test('ผู้ใช้ข้อมูลเต็มที่สุด: ทุกคำสั่งตอบภายในขีดจำกัดของ LINE', async () => {
  const store = memStore();
  const u = ops.newUser('U1');
  for (let i = 0; i < 28; i++) ops.addAccount(u, { name: `บัญชีชื่อยาวมาก ${i}`, type: ['bank', 'ewallet', 'card', 'loan', 'receivable', 'cash'][i % 6], provider: 'kbank', balance: 1000, limit: 5000, principal: 3000, monthlyPayment: 100, installments: 30 });
  for (let i = 0; i < 50; i++) ops.addGoal(u, { name: `เป้าหมายชื่อยาวมากที่ ${i}`, target: 5000 });
  for (let i = 0; i < 100; i++) ops.addRecurring(u, { note: `รายการประจำชื่อยาว ${i}`, amount: 100, day: (i % 28) + 1 });
  for (let i = 0; i < 100; i++) ops.addTrip(u, { name: `ทริปที่ ${i}`, budget: 5000, start: '2026-01-01', end: '2026-01-05' });
  for (let i = 0; i < 2000; i++) ops.addTx(u, { amount: 10 + (i % 300), note: `รายการ ${i}`, date: `2026-11-${String(1 + (i % 19)).padStart(2, '0')}` });
  await store.save(u);
  const bot = mkBot(store);
  for (const cmd of ['สรุป', 'สรุปเดือนนี้', 'สรุปปี', 'บัญชี', 'ทริปทั้งหมด', 'เป้า', 'ประจำ', 'เงินออม', 'หมวด', 'งบ', 'วิธีใช้', 'รายการ', 'ข้าว 50', 'ตั้งค่า']) {
    const { messages } = await say(bot, cmd);
    assert.ok(messages.length, `${cmd}: มีคำตอบ`);
    assertLineLimits(messages, cmd);
  }
});

test('กลุ่ม: ไม่จดตัวเลขที่ไม่ใช่เงิน แต่ยังจดค่าใช้จ่ายจริง', () => {
  for (const t of ['ห้อง 302', 'ชั้น 4', 'ซอย 15', 'บ้านเลขที่ 99', 'น้ำหนัก 65', 'ลูกได้เกรด 4', 'รอ 5 นาที', 'สวัสดีครับ']) assert.equal(looksLikeGroupEntry(t), false, t);
  for (const t of ['ค่าห้อง 4500', 'ค่าไฟ 850', 'กาแฟ 45', 'ห้องพัก 1200 บาท', 'จ่ายค่าเทอม 25000']) assert.equal(looksLikeGroupEntry(t), true, t);
});

test('สรุปปี / สัปดาห์ที่แล้ว เข้าใจ', async () => {
  const store = memStore();
  const bot = mkBot(store);
  await say(bot, 'ข้าว 50');
  assert.match((await say(bot, 'สรุปปี')).messages[0].altText, /ปี 2569/);
  assert.match((await say(bot, 'สัปดาห์ที่แล้ว')).messages[0].altText, /สัปดาห์ที่แล้ว/);
});
