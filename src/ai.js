// ใช้ Claude อ่านสลิป/ใบเสร็จ และแปลประโยคยาวๆ เป็นรายการ
import Anthropic from '@anthropic-ai/sdk';
import { CATEGORIES } from './core/categories.js';

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
const CATEGORY_GUIDE = CATEGORIES.map((c) => `${c.id} (${c.type}): ${c.name}`).join('\n');

const SLIP_SCHEMA = {
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

const TEXT_SCHEMA = {
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

const SYSTEM = `You are the bookkeeping engine of "หมุนตังค์" (Muntang), a Thai personal expense tracker in LINE.
Extract money transactions exactly as shown. Never invent amounts. Notes must be short and in Thai.
Categories (id (type): name):
${CATEGORY_GUIDE}
Pick the category whose type matches the transaction type. Use "other"/"other_income" when unsure.`;

export function createAI(config) {
  if (!config.anthropicApiKey) return null;
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  async function ask(content, schema) {
    const res = await client.beta.messages.create({
      model: config.claudeModel,
      max_tokens: 4000,
      system: SYSTEM,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content }],
    });
    if (res.stop_reason === 'refusal') throw new Error('model refused');
    const textBlock = res.content.find((b) => b.type === 'text');
    if (!textBlock) throw new Error('no text in response');
    return JSON.parse(textBlock.text);
  }

  return {
    /** img: { data: base64, mediaType } */
    async readSlip(img, today) {
      return ask(
        [
          { type: 'image', source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.data } },
          {
            type: 'text',
            text: `Today is ${today} (Asia/Bangkok). Read this image. If it is a Thai bank transfer slip / e-wallet payment / receipt, extract the transaction.
The user sent this slip to log their own money, so direction is "expense" unless the slip clearly shows money received by the user (e.g. a "รับเงิน" notification).
If the image is not a slip or receipt, return isSlip=false and amount=0.`,
          },
        ],
        SLIP_SCHEMA
      );
    },

    async parseText(text, today) {
      const out = await ask(
        `Today is ${today} (Asia/Bangkok). Words like เมื่อวาน mean yesterday. Default wallet is "cash" unless the text mentions โอน/สแกน (bank) or บัตร (card).
Extract every income/expense item from this LINE message. Return an empty list if there is no money amount.

Message:
"""${text.slice(0, 1000)}"""`,
        TEXT_SCHEMA
      );
      return (out.items || []).filter((i) => i.amount > 0);
    },
  };
}
