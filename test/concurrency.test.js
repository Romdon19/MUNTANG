// บันทึกพร้อมกันหลายคำขอ (ส่งสลิปหลายรูปพร้อมกัน / หลายคนในกลุ่ม) ต้องไม่ทำให้รายการหาย
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createD1Store } from '../src/store-d1.js';
import { createBot } from '../src/core/bot.js';
import { runJobs } from '../src/jobs.js';
import * as ops from '../src/core/ops.js';

/** D1 จำลองบน SQLite ของ Node (prepare/bind/first/all/run/batch) */
function fakeD1() {
  const db = new DatabaseSync(':memory:');
  const tick = () => new Promise((r) => setTimeout(r, Math.random() * 15));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async first() {
      await tick();
      return db.prepare(sql).get(...args) ?? null;
    },
    async all() {
      await tick();
      return { results: db.prepare(sql).all(...args) };
    },
    async run() {
      await tick();
      const r = db.prepare(sql).run(...args);
      return { meta: { changes: Number(r.changes) } };
    },
  });
  return { prepare: (sql) => stmt(sql), batch: async (list) => { const out = []; for (const s of list) out.push(await s.run()); return out; }, raw: db };
}

const clock = () => new Date('2026-11-20T05:00:00Z');

test('ส่งข้อความจด 8 รายการพร้อมกัน → บันทึกครบทั้ง 8', async () => {
  const d1 = fakeD1();
  const store = createD1Store(d1);
  const bot = createBot({ store, now: clock });
  await bot.handleEvent({ type: 'message', source: { type: 'user', userId: 'U1' }, message: { type: 'text', text: 'ข้าว 10' } });
  const sends = Array.from({ length: 8 }, (_, i) =>
    createBot({ store, now: clock }).handleEvent({ type: 'message', source: { type: 'user', userId: 'U1' }, message: { type: 'text', id: `m${i}`, text: `กาแฟ ${i + 1}` } })
  );
  await Promise.all(sends);
  const u = await store.get('U1');
  assert.equal(u.txs.length, 9);
  assert.equal(u.txs.filter((t) => t.note.startsWith('กาแฟ')).length, 8);
  assert.ok(!('_v' in JSON.parse(d1.raw.prepare('SELECT data FROM users').get().data)), 'ไม่เก็บ _v ลง JSON');
});

test('ผู้ใช้ใหม่ส่งพร้อมกันครั้งแรก → ไม่ทับกันตอนสร้าง', async () => {
  const store = createD1Store(fakeD1());
  await Promise.all(
    [1, 2, 3, 4].map((i) => createBot({ store, now: clock }).handleEvent({ type: 'message', source: { type: 'group', groupId: 'C9', userId: `U${i}` }, message: { type: 'text', text: `ข้าว ${i * 10}` } }))
  );
  const g = await store.get('C9');
  assert.equal(g.txs.length, 4);
  assert.equal(Object.keys(g.members).length, 4);
});

test('สลิปที่บันทึกชน → ทำซ้ำโดยไม่เรียก AI อ่านสลิปซ้ำ', async () => {
  const store = createD1Store(fakeD1());
  let reads = 0;
  const ai = {
    provider: 'test',
    async readSlip() {
      reads++;
      await new Promise((r) => setTimeout(r, 5));
      return { isSlip: true, amount: 120, date: '2026-11-20', note: 'ร้านค้า', direction: 'expense', bank: 'kbank', ref: 'R1' };
    },
  };
  const getImage = async (ev) => ({ data: 'AAAA', bytes: new Uint8Array([1]), mediaType: 'image/jpeg', id: ev.message.id });
  await createBot({ store, now: clock }).handleEvent({ type: 'message', source: { type: 'user', userId: 'U2' }, message: { type: 'text', text: 'ข้าว 10' } });
  const bot = createBot({ store, now: clock, ai, getImage });
  // คำขออื่นแทรกบันทึกระหว่างที่อ่านสลิป
  const other = createBot({ store, now: clock });
  const p = bot.handleEvent({ type: 'message', source: { type: 'user', userId: 'U2' }, message: { type: 'image', id: 'img1' } });
  await other.handleEvent({ type: 'message', source: { type: 'user', userId: 'U2' }, message: { type: 'text', text: 'น้ำ 15' } });
  await p;
  const u = await store.get('U2');
  assert.equal(u.txs.length, 3);
  assert.equal(reads, 1);
});

test('งานตามเวลา (รายการประจำ) ชนกับการจดรายการ → ไม่หายทั้งคู่', async () => {
  const store = createD1Store(fakeD1());
  const u = ops.newUser('U3');
  ops.addRecurring(u, { type: 'expense', amount: 99, note: 'Netflix', category: 'subscription', day: 20 });
  await store.save(u);
  const now = new Date('2026-11-20T03:00:00Z');
  await Promise.all([
    runJobs({ store, ids: ['U3'], push: async () => {}, now }),
    createBot({ store, now: () => now }).handleEvent({ type: 'message', source: { type: 'user', userId: 'U3' }, message: { type: 'text', text: 'ข้าว 45' } }),
  ]);
  const got = await store.get('U3');
  assert.ok(got.txs.some((t) => t.note === 'Netflix'));
  assert.ok(got.txs.some((t) => t.amount === 45));
});

test('คิวงานตามเวลา: next_job ตามเวลาเตือน/รายการประจำ/รายงาน และหยิบทีละไม่เกิน limit', async () => {
  const { nextJobAt, jobClock } = await import('../src/jobs.js');
  const now = new Date('2026-11-20T05:00:00Z'); // 12:00 เวลาไทย
  const u = ops.newUser('U5');
  assert.equal(nextJobAt(u, now), '9999');
  u.settings.reminder = '20:30';
  assert.equal(nextJobAt(u, now), '2026-11-20 20:30');
  u.settings.lastReminded = '2026-11-20';
  assert.equal(nextJobAt(u, now), '2026-11-21 20:30');
  ops.addRecurring(u, { type: 'expense', amount: 99, note: 'Netflix', categoryId: 'subscription', day: 31 });
  assert.equal(nextJobAt(u, now), '2026-11-21 20:30');
  u.recurring[0].day = 5; // เลยวันแล้วยังไม่ได้บันทึก → ถึงเวลาแล้ว
  assert.equal(nextJobAt(u, now), '2026-11-05 07:00');
  u.recurring[0].lastRun = '2026-11';
  assert.equal(nextJobAt(u, now), '2026-11-21 20:30');
  u.settings.reminder = null;
  assert.equal(nextJobAt(u, now), '2026-12-05 07:00');
  ops.addTx(u, { amount: 10, note: 'ข้าว' });
  assert.equal(nextJobAt(u, now), '2026-12-01 09:00');

  const d1 = fakeD1();
  const store = createD1Store(d1, { nextJob: (x) => nextJobAt(x, now) });
  for (let i = 0; i < 20; i++) {
    const x = ops.newUser(`U${100 + i}`);
    if (i < 15) x.settings.reminder = '11:50';
    await store.save(x);
  }
  const due = await store.nextJobs(jobClock(now), 12);
  assert.equal(due.length, 12);
  let pushed = 0;
  await runJobs({ store, ids: due, push: async () => void pushed++, now });
  assert.equal(pushed, 12);
  const rest = await store.nextJobs(jobClock(now), 12);
  assert.equal(rest.length, 3, 'คนที่เตือนแล้วเลื่อนไปพรุ่งนี้ เหลือ 3 คนในนาทีถัดไป');
});

test('ข้อมูลใหญ่ถูกบีบอัดตอนเก็บ และอ่านกลับได้เหมือนเดิม', async () => {
  const d1 = fakeD1();
  const store = createD1Store(d1);
  const u = ops.newUser('U6');
  for (let i = 0; i < 3000; i++) ops.addTx(u, { amount: 10 + (i % 90), note: `ข้าวมันไก่ร้านป้า ${i}`, date: '2026-11-01' });
  await store.save(u);
  const raw = d1.raw.prepare('SELECT data FROM users').get().data;
  assert.ok(raw.startsWith('z:'));
  const back = await store.get('U6');
  assert.equal(back.txs.length, 3000);
  assert.equal(back.txs[2999].note, 'ข้าวมันไก่ร้านป้า 2999');
  const plain = JSON.stringify(u).length;
  assert.ok(raw.length < plain / 3, `บีบได้ ${plain} → ${raw.length}`);
});

test('ตรวจค่าที่รับเข้า: ยอดเกิน วันที่ไม่มีจริง เวลาเตือนผิด', () => {
  const u = ops.newUser('U7');
  assert.throws(() => ops.addTx(u, { amount: '1e20' }), /มากเกินไป/);
  assert.throws(() => ops.addTx(u, { amount: 'abc' }), /ไม่ถูกต้อง/);
  assert.throws(() => ops.addTx(u, { amount: Infinity }), /ไม่ถูกต้อง/);
  assert.equal(ops.addTx(u, { amount: '1,250.5', date: '9999-99-99' }).date.length, 10);
  assert.notEqual(ops.addTx(u, { amount: 5, date: '2026-02-30' }).date, '2026-02-30');
  assert.equal(ops.addTx(u, { amount: 5, date: '2026-02-28' }).date, '2026-02-28');
  ops.applySettings(u, { reminder: '25:99', monthlyBudget: '1e30' });
  assert.equal(u.settings.reminder, null);
  assert.ok(u.settings.monthlyBudget <= ops.MAX_AMOUNT);
  ops.applySettings(u, { reminder: '20:05' });
  assert.equal(u.settings.reminder, '20:05');
});
