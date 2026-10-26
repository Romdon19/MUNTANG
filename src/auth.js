// โทเคนสำหรับลิงก์แดชบอร์ด/ดาวน์โหลด: base64url(userId.expiry).hmac — ใช้ Web Crypto
const enc = new TextEncoder();

export function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(str) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export function createAuth(secret) {
  const keyP = crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return {
    async makeToken(userId, days = 30) {
      const exp = Math.floor(Date.now() / 1000) + days * 86400;
      const payload = b64url(enc.encode(`${userId}.${exp}`));
      const sig = await crypto.subtle.sign('HMAC', await keyP, enc.encode(payload));
      return `${payload}.${b64url(sig)}`;
    },
    async readToken(token) {
      if (!token || typeof token !== 'string') return null;
      const [payload, sig] = token.split('.');
      if (!payload || !sig) return null;
      try {
        const ok = await crypto.subtle.verify('HMAC', await keyP, fromB64url(sig), enc.encode(payload));
        if (!ok) return null;
        const [userId, exp] = new TextDecoder().decode(fromB64url(payload)).split('.');
        return userId && Number(exp) > Date.now() / 1000 ? userId : null;
      } catch {
        return null;
      }
    },
  };
}
