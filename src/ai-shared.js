// ส่วนกลางของ AI: schema และคำสั่ง (ใช้ร่วมกันระหว่าง Claude และ Cloudflare Workers AI)
import { CATEGORIES, CATEGORY_MAP } from './core/categories.js';

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export const CATEGORY_GUIDE = CATEGORIES.map((c) => `${c.id} (${c.type}): ${c.name}`).join('\n');

export const SLIP_SCHEMA = {
  type: 'object',
  properties: {
    isSlip: { type: 'boolean', description: 'true if the image is a bank transfer slip, payment confirmation, or a receipt with a readable total' },
    kind: { type: 'string', enum: ['transfer', 'receipt', 'other'] },
    direction: { type: 'string', enum: ['expense', 'income'] },
    amount: { type: 'number', description: 'Total amount in THB. 0 if unreadable.' },
    date: { type: 'string', description: 'Transaction date as YYYY-MM-DD in the Gregorian calendar (convert Buddhist Era years: subtract 543). Empty string if not visible.' },
    time: { type: 'string', description: 'HH:MM or empty string' },
    bank: { type: 'string', description: 'Bank or wallet name in Thai, e.g. กสิกรไทย, ไทยพาณิชย์, พร้อมเพย์, TrueMoney. Empty string if none.' },
    sender: { type: 'string' },
    receiver: { type: 'string', description: 'Recipient or merchant name' },
    ref: { type: 'string', description: 'Transaction reference / ref no. Empty string if none.' },
    note: { type: 'string', description: 'Short Thai description, e.g. "ค่าอาหาร ร้านส้มตำ" or "โอนให้ สมชาย". Use the memo on the slip when present.' },
    categoryId: { type: 'string', enum: CATEGORY_IDS },
  },
  required: ['isSlip', 'kind', 'direction', 'amount', 'date', 'time', 'bank', 'sender', 'receiver', 'ref', 'note', 'categoryId'],
  additionalProperties: false,
};

export const TEXT_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          note: { type: 'string' },
          amount: { type: 'number' },
          type: { type: 'string', enum: ['expense', 'income'] },
          categoryId: { type: 'string', enum: CATEGORY_IDS },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          wallet: { type: 'string', enum: ['cash', 'bank', 'card'] },
        },
        required: ['note', 'amount', 'type', 'categoryId', 'date', 'wallet'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

export const SYSTEM = `You are the bookkeeping engine of "หมุนตังค์" (Muntang), a Thai personal expense tracker in LINE.
Extract money transactions exactly as shown. Never invent amounts. Notes must be short and in Thai.
Categories (id (type): name):
${CATEGORY_GUIDE}
Pick the category whose type matches the transaction type. Use "other"/"other_income" when unsure.`;

export const slipPrompt = (today) => `Today is ${today} (Asia/Bangkok). Read this image. If it is a Thai bank transfer slip / e-wallet payment / receipt, extract the transaction.
The user sent this slip to log their own money, so direction is "expense" unless the slip clearly shows money received by the user (e.g. a "รับเงิน" notification).
If the image is not a slip or receipt, return isSlip=false and amount=0.`;

export const textPrompt = (text, today) => `Today is ${today} (Asia/Bangkok). Words like เมื่อวาน mean yesterday. Default wallet is "cash" unless the text mentions โอน/สแกน (bank) or บัตร (card).
Extract every income/expense item from this LINE message. Return an empty list if there is no money amount.

Message:
"""${text.slice(0, 1000)}"""`;

export const statementPrompt = (today) => `Today is ${today} (Asia/Bangkok). This is a Thai bank account or credit card statement owned by the user.
Extract every transaction row. Money leaving the account is "expense", money coming in is "income".
Skip balance-only rows, opening/closing balance lines and totals. Use the description/memo for "note" (short Thai, e.g. "โอนให้ สมชาย", "ชำระ 7-Eleven").
Use wallet "card" for credit card statements, otherwise "bank". Dates must be YYYY-MM-DD in the Gregorian calendar.
Return an empty list if this is not a statement.`;

/** ตรวจ/เติมค่าผลลัพธ์จาก AI ให้ปลอดภัยก่อนบันทึก (โมเดลฟรีบางตัวไม่ยึด schema เป๊ะ) */
export function cleanSlip(o) {
  if (!o || typeof o !== 'object') return null;
  const amount = Number(String(o.amount ?? 0).replace(/[^\d.]/g, '')) || 0;
  const direction = o.direction === 'income' ? 'income' : 'expense';
  let categoryId = CATEGORY_MAP[o.categoryId] ? o.categoryId : direction === 'income' ? 'other_income' : 'other';
  if (CATEGORY_MAP[categoryId].type !== direction) categoryId = direction === 'income' ? 'other_income' : 'other';
  const str = (v) => (v == null ? '' : String(v).slice(0, 80));
  return {
    isSlip: o.isSlip === true || o.isSlip === 'true',
    kind: ['transfer', 'receipt', 'other'].includes(o.kind) ? o.kind : 'other',
    direction,
    amount,
    date: /^\d{4}-\d{2}-\d{2}$/.test(o.date || '') ? o.date : '',
    time: /^\d{1,2}:\d{2}$/.test(o.time || '') ? o.time : '',
    bank: str(o.bank),
    sender: str(o.sender),
    receiver: str(o.receiver),
    ref: str(o.ref),
    note: str(o.note),
    categoryId,
  };
}

export function cleanItems(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((i) => {
      const type = i?.type === 'income' ? 'income' : 'expense';
      const categoryId = CATEGORY_MAP[i?.categoryId]?.type === type ? i.categoryId : type === 'income' ? 'other_income' : 'other';
      return {
        note: String(i?.note || '').slice(0, 120),
        amount: Number(String(i?.amount ?? 0).replace(/[^\d.]/g, '')) || 0,
        type,
        categoryId,
        date: /^\d{4}-\d{2}-\d{2}$/.test(i?.date || '') ? i.date : '',
        wallet: ['cash', 'bank', 'card'].includes(i?.wallet) ? i.wallet : 'cash',
      };
    })
    .filter((i) => i.amount > 0);
}
