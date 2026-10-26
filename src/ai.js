// ใช้ Claude อ่านสลิป/ใบเสร็จ, Statement PDF และแปลประโยคยาวๆ เป็นรายการ (ต้องมี ANTHROPIC_API_KEY)
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM, SLIP_SCHEMA, TEXT_SCHEMA, slipPrompt, textPrompt, statementPrompt, cleanSlip, cleanItems } from './ai-shared.js';

export function createAI(config) {
  if (!config.anthropicApiKey) return null;
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  async function ask(content, schema, maxTokens = 4000) {
    const res = await client.beta.messages.create({
      model: config.claudeModel,
      max_tokens: maxTokens,
      system: SYSTEM,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content }],
    });
    if (res.stop_reason === 'refusal') throw new Error('model refused');
    if (res.stop_reason === 'max_tokens') throw new Error('response too long');
    const textBlock = res.content.find((b) => b.type === 'text');
    if (!textBlock) throw new Error('no text in response');
    return JSON.parse(textBlock.text);
  }

  return {
    provider: 'claude',
    /** img: { data: base64, mediaType } */
    async readSlip(img, today) {
      const out = await ask(
        [
          { type: 'image', source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.data } },
          {
            type: 'text',
            text: slipPrompt(today),
          },
        ],
        SLIP_SCHEMA
      );
      return cleanSlip(out);
    },

    async parseText(text, today) {
      const out = await ask(
        textPrompt(text, today),
        TEXT_SCHEMA
      );
      return cleanItems(out.items);
    },

    /** pdf: { data: base64 } — Statement ธนาคาร/บัตรเครดิต */
    async readStatement(pdf, today) {
      const out = await ask(
        [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.data } },
          {
            type: 'text',
            text: statementPrompt(today),
          },
        ],
        TEXT_SCHEMA,
        16000
      );
      return cleanItems(out.items);
    },
  };
}
