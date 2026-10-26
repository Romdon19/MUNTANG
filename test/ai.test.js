import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkersAI, extractJSON } from '../src/ai-workers.js';
import { cleanSlip } from '../src/ai-shared.js';
import { createBot } from '../src/core/bot.js';

test('extractJSON handles objects and JSON wrapped in text', () => {
  assert.deepEqual(extractJSON({ response: { a: 1 } }), { a: 1 });
  assert.deepEqual(extractJSON({ response: 'นี่คือผลลัพธ์ ```json\n{"a": 2}\n``` จบ' }), { a: 2 });
  assert.throws(() => extractJSON({ response: 'อ่านไม่ออก' }));
});

test('cleanSlip fixes loose model output', () => {
  const s = cleanSlip({ isSlip: 'true', amount: '1,250.50 บาท', direction: 'expense', categoryId: 'salary', date: '26/10/2569', note: 'ค่าอาหาร' });
  assert.equal(s.isSlip, true);
  assert.equal(s.amount, 1250.5);
  assert.equal(s.categoryId, 'other'); // หมวดรายรับใช้กับรายจ่ายไม่ได้
  assert.equal(s.date, ''); // วันที่ผิดรูปแบบ -> ใช้วันนี้แทน
});

test('free Workers AI reads a slip end to end (mocked model)', async () => {
  const calls = [];
  const fakeAI = {
    run: async (model, input) => {
      calls.push({ model, input });
      return {
        response: '{"isSlip": true, "kind": "transfer", "direction": "expense", "amount": 320, "date": "2026-10-26", "time": "12:05", "bank": "กสิกรไทย", "sender": "ฉัน", "receiver": "ร้านส้มตำ", "ref": "ABC123", "note": "ค่าอาหาร ร้านส้มตำ", "categoryId": "food"}',
      };
    },
  };
  const ai = createWorkersAI(fakeAI);
  assert.equal(ai.readStatement, undefined);
  const db = {};
  const store = { get: async (id) => (db[id] ? structuredClone(db[id]) : null), save: async (u) => void (db[u.id] = structuredClone(u)) };
  const bot = createBot({ store, ai, links: {}, getImage: async () => ({ data: 'aGVsbG8=', mediaType: 'image/jpeg' }) });
  const r = await bot.handleEvent({ type: 'message', source: { type: 'user', userId: 'U9' }, message: { type: 'image', id: '1' } });
  assert.match(r.messages[0].altText, /อ่านสลิป ฿320/);
  assert.equal(db.U9.txs[0].categoryId, 'food');
  const content = calls[0].input.messages[1].content;
  assert.equal(content[1].image_url.url.startsWith('data:image/jpeg;base64,'), true);

  // PDF ต้องใช้ Claude
  const pdf = await bot.handleEvent({ type: 'message', source: { type: 'user', userId: 'U9' }, message: { type: 'file', id: '2', fileName: 'stmt.pdf', fileSize: 10 } });
  assert.match(pdf.messages[0].text, /Claude/);
});
