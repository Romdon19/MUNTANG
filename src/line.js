// LINE Messaging API แบบเรียก HTTP ตรงๆ
import crypto from 'node:crypto';
import { config } from './config.js';

const API = 'https://api.line.me/v2/bot';
const DATA_API = 'https://api-data.line.me/v2/bot';

export function verifySignature(rawBody, signature) {
  if (!config.lineChannelSecret || !signature) return false;
  const expected = crypto.createHmac('sha256', config.lineChannelSecret).update(rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function call(url, body, method = 'POST') {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${config.lineAccessToken}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE API ${res.status}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

export const line = {
  reply: (replyToken, messages) => call(`${API}/message/reply`, { replyToken, messages }),
  push: (to, messages) => call(`${API}/message/push`, { to, messages }),
  profile: async (userId) => {
    const p = await call(`${API}/profile/${userId}`, null, 'GET');
    return { name: p.displayName, pictureUrl: p.pictureUrl };
  },
  loading: (chatId, seconds = 20) => call(`${API}/chat/loading/start`, { chatId, loadingSeconds: seconds }).catch(() => {}),
  async content(messageId) {
    const res = await fetch(`${DATA_API}/message/${messageId}/content`, {
      headers: { Authorization: `Bearer ${config.lineAccessToken}` },
    });
    if (!res.ok) throw new Error(`LINE content ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { data: buf.toString('base64'), mediaType: res.headers.get('content-type') || 'image/jpeg' };
  },
  /** ตรวจ ID token จาก LIFF แล้วคืน userId */
  async verifyIdToken(idToken) {
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: config.lineLoginChannelId }),
    });
    if (!res.ok) throw new Error(`verify failed ${res.status}`);
    const data = await res.json();
    return { userId: data.sub, name: data.name, pictureUrl: data.picture };
  },
};
