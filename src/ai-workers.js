// AI ฟรีผ่าน Cloudflare Workers AI (ใช้โควตาฟรีรายวันของบัญชี Cloudflare ไม่ต้องมี API key)
// รองรับ: อ่านสลิป/ใบเสร็จจากรูป + แปลประโยคยาว · ไม่รองรับ PDF (ใช้ Claude แทน)
import { SYSTEM, SLIP_SCHEMA, TEXT_SCHEMA, slipPrompt, textPrompt, cleanSlip, cleanItems } from './ai-shared.js';

export const DEFAULT_WORKERS_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

/** ดึง JSON ออกจากคำตอบ (บางครั้งได้เป็น object บางครั้งเป็นข้อความที่มี JSON อยู่ข้างใน) */
export function extractJSON(res) {
  const v = res?.response ?? res?.result?.response ?? res;
  if (v && typeof v === 'object') return v;
  const s = String(v || '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no JSON in model output');
  return JSON.parse(s.slice(start, end + 1));
}

export function createWorkersAI(ai, model = DEFAULT_WORKERS_MODEL) {
  if (!ai) return null;

  async function ask(content, schema) {
    const res = await ai.run(model, {
      messages: [
        { role: 'system', content: `${SYSTEM}\nReply with JSON only, matching this JSON schema:\n${JSON.stringify(schema)}` },
        { role: 'user', content },
      ],
      response_format: { type: 'json_schema', json_schema: schema },
      max_tokens: 1500,
      temperature: 0,
    });
    return extractJSON(res);
  }

  return {
    provider: 'workers-ai',
    /** img: { data: base64, mediaType } */
    async readSlip(img, today) {
      const out = await ask(
        [
          { type: 'text', text: slipPrompt(today) },
          { type: 'image_url', image_url: { url: `data:${img.mediaType || 'image/jpeg'};base64,${img.data}` } },
        ],
        SLIP_SCHEMA
      );
      return cleanSlip(out);
    },
    async parseText(text, today) {
      const out = await ask(textPrompt(text, today), TEXT_SCHEMA);
      return cleanItems(out.items);
    },
    // readStatement: ไม่มี — โมเดลฟรีอ่าน PDF ไม่ได้
  };
}
