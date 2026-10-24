// โทเคนสำหรับลิงก์แดชบอร์ด/ดาวน์โหลด: userId.expiry.hmac
import crypto from 'node:crypto';
import { config } from './config.js';

const sign = (s) => crypto.createHmac('sha256', config.appSecret).update(s).digest('base64url').slice(0, 32);

export function makeToken(userId, days = 30) {
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const payload = Buffer.from(`${userId}.${exp}`).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  const [userId, exp] = Buffer.from(payload, 'base64url').toString().split('.');
  if (!userId || Number(exp) < Date.now() / 1000) return null;
  return userId;
}
