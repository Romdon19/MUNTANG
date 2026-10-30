// LINE Messaging API แบบเรียก HTTP ตรงๆ (ใช้ fetch + Web Crypto จึงรันได้ทั้ง Node และ Workers)
import { b64url, fromB64url } from './auth.js';

const API = 'https://api.line.me/v2/bot';
const DATA_API = 'https://api-data.line.me/v2/bot';

export function createLine(cfg) {
  const enc = new TextEncoder();
  const keyP = cfg.lineChannelSecret
    ? crypto.subtle.importKey('raw', enc.encode(cfg.lineChannelSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    : null;
  const auth = () => ({ Authorization: `Bearer ${cfg.lineAccessToken}` });

  async function call(url, body, method = 'POST') {
    const res = await fetch(url, {
      method,
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`LINE API ${res.status}: ${await res.text()}`);
    const ct = res.headers.get('content-type') || '';
    return ct.includes('json') ? res.json() : null;
  }

  return {
    /** rawBody: Uint8Array | ArrayBuffer, signature: base64 จาก header x-line-signature */
    async verifySignature(rawBody, signature) {
      if (!keyP || !signature) return false;
      try {
        const sig = fromB64url(signature.replace(/\+/g, '-').replace(/\//g, '_'));
        return await crypto.subtle.verify('HMAC', await keyP, sig, rawBody);
      } catch {
        return false;
      }
    },
    /** LINE ID ของบัญชี OA เช่น @123abcd (ใช้ทำลิงก์เชิญเพื่อน) */
    async basicId() {
      const info = await call(`${API}/info`, null, 'GET');
      return info.basicId || null;
    },
    /** ยกเลิกเมนูที่ผูกรายคน → กลับไปเห็นเมนูตั้งต้น */
    unlinkMenu: (userId) => call(`${API}/user/${userId}/richmenu`, null, 'DELETE'),
    reply: (replyToken, messages) => call(`${API}/message/reply`, { replyToken, messages }),
    push: (to, messages) => call(`${API}/message/push`, { to, messages }),
    async profile(userId) {
      const p = await call(`${API}/profile/${userId}`, null, 'GET');
      return { name: p.displayName, pictureUrl: p.pictureUrl };
    },
    loading: (chatId, seconds = 20) => call(`${API}/chat/loading/start`, { chatId, loadingSeconds: seconds }).catch(() => {}),
    async content(messageId) {
      const res = await fetch(`${DATA_API}/message/${messageId}/content`, { headers: auth() });
      if (!res.ok) throw new Error(`LINE content ${res.status}`);
      const buf = await res.arrayBuffer();
      // base64 มาตรฐาน (ไม่ใช่ url-safe) สำหรับส่งให้ Claude / Whisper
      const data = b64url(buf).replace(/-/g, '+').replace(/_/g, '/');
      return {
        data: data + '='.repeat((4 - (data.length % 4)) % 4),
        bytes: new Uint8Array(buf),
        mediaType: res.headers.get('content-type') || 'application/octet-stream',
      };
    },
    /** ชื่อสมาชิกในกลุ่ม/ห้อง */
    async memberName(source) {
      const kind = source.groupId ? 'group' : 'room';
      const id = source.groupId || source.roomId;
      const p = await call(`${API}/${kind}/${id}/member/${source.userId}`, null, 'GET');
      return p.displayName;
    },
    async groupName(groupId) {
      if (!groupId.startsWith('C')) return 'ห้องแชทหมุนตังค์';
      const g = await call(`${API}/group/${groupId}/summary`, null, 'GET');
      return g.groupName;
    },
    /** ตรวจ ID token จาก LIFF แล้วคืน userId */
    async verifyIdToken(idToken) {
      const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id_token: idToken, client_id: cfg.lineLoginChannelId }),
      });
      if (!res.ok) throw new Error(`verify failed ${res.status}`);
      const data = await res.json();
      return { userId: data.sub, name: data.name, pictureUrl: data.picture };
    },
  };
}
