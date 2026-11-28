// ฐานข้อมูล Cloudflare D1: 1 แถวต่อผู้ใช้ (เก็บ JSON) + คอลัมน์สำหรับค้นหางานตามเวลา
// ตารางถูกสร้างอัตโนมัติในครั้งแรก ไม่ต้องรัน migration เอง
// คอลัมน์ version กันบันทึกทับกัน: โหลดได้ version ไหน ต้องบันทึกทับ version นั้นเท่านั้น
// ถ้ามีคำขออื่นบันทึกไปก่อน → ConflictError แล้วผู้เรียกโหลดใหม่ทำซ้ำ (ดู core/conflict.js)
import { ConflictError } from './core/conflict.js';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    reminder TEXT,
    has_recurring INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 0,
    next_job TEXT
  )`,
  'CREATE INDEX IF NOT EXISTS users_reminder ON users (reminder)',
  'CREATE INDEX IF NOT EXISTS users_recurring ON users (has_recurring)',
];

/** คอลัมน์ที่เพิ่มทีหลัง (ตารางเก่าต้อง ALTER เพิ่ม) */
const ADDED = { version: 'INTEGER NOT NULL DEFAULT 0', next_job: 'TEXT' };

// JSON ที่ยาวมาก (ผู้ใช้จดมาหลายปี) บีบอัดก่อนเก็บ: แถวหนึ่งของ D1 เก็บได้ไม่เกิน ~2MB
const PACK_FROM = 150_000;
const MAX_ROW = 1_900_000;

async function streamBytes(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}
function toB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const fromB64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

export async function pack(json) {
  if (json.length < PACK_FROM) return json;
  const z = await streamBytes(new TextEncoder().encode(json), new CompressionStream('gzip'));
  return `z:${toB64(z)}`;
}
export async function unpack(data) {
  if (!data.startsWith('z:')) return data;
  return new TextDecoder().decode(await streamBytes(fromB64(data.slice(2)), new DecompressionStream('gzip')));
}

/**
 * db: D1 binding
 * nextJob?: (user) -> "YYYY-MM-DD HH:MM" เวลาที่ต้องตรวจงานตามเวลาของผู้ใช้ครั้งถัดไป (คอลัมน์ next_job)
 */
export function createD1Store(db, { nextJob } = {}) {
  let ready = null;
  const init = () =>
    (ready ||= (async () => {
      await db.batch(SCHEMA.map((s) => db.prepare(s)));
      // ตารางเก่าที่สร้างก่อนมีคอลัมน์ version
      const { results } = await db.prepare('PRAGMA table_info(users)').all();
      for (const [col, type] of Object.entries(ADDED)) {
        if (results.some((c) => c.name === col)) continue;
        await db.prepare(`ALTER TABLE users ADD COLUMN ${col} ${type}`).run().catch((e) => {
          if (!/duplicate column/i.test(e.message)) throw e;
        });
      }
      await db.prepare('CREATE INDEX IF NOT EXISTS users_next_job ON users (next_job)').run();
    })().catch((e) => {
      ready = null;
      throw e;
    }));

  return {
    async get(id) {
      await init();
      const row = await db.prepare('SELECT data, version FROM users WHERE id = ?1').bind(id).first();
      if (!row) return null;
      const user = JSON.parse(await unpack(row.data));
      user._v = row.version || 0;
      return user;
    },
    /** บันทึก: ผู้ใช้ที่โหลดมา (มี _v) ต้องยังเป็น version เดิม · ผู้ใช้ใหม่ต้องยังไม่มีในตาราง */
    async save(user) {
      await init();
      const { _v, ...data } = user;
      const body = await pack(JSON.stringify(data));
      if (body.length > MAX_ROW) throw new Error('ข้อมูลในสมุดบัญชีนี้เต็มแล้ว ลองดาวน์โหลด CSV เก็บไว้แล้วลบรายการเก่าออกบางส่วน');
      const next = nextJob ? nextJob(data) : null;
      const args = [user.id, body, user.settings?.reminder || null, user.recurring?.length ? 1 : 0, new Date().toISOString(), next];
      const res =
        _v == null
          ? await db
              .prepare(
                `INSERT INTO users (id, data, reminder, has_recurring, updated_at, next_job, version) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)
                 ON CONFLICT(id) DO NOTHING`
              )
              .bind(...args)
              .run()
          : await db
              .prepare(
                `UPDATE users SET data = ?2, reminder = ?3, has_recurring = ?4, updated_at = ?5, next_job = ?6, version = version + 1
                 WHERE id = ?1 AND version = ?7`
              )
              .bind(...args, _v)
              .run();
      if (!res.meta?.changes) throw new ConflictError(user.id);
      user._v = (_v ?? 0) + 1;
    },
    async delete(id) {
      await init();
      await db.prepare('DELETE FROM users WHERE id = ?1').bind(id).run();
    },
    /** ผู้ใช้ที่ถึงเวลาตรวจงานแล้ว (ยังไม่เคยคำนวณ = NULL ถือว่าถึงเวลา) ทีละไม่เกิน limit คน */
    async nextJobs(clock, limit = 12) {
      await init();
      const { results } = await db
        .prepare('SELECT id FROM users WHERE next_job IS NULL OR next_job <= ?1 ORDER BY next_job LIMIT ?2')
        .bind(clock, limit)
        .all();
      return results.map((r) => r.id);
    },
    async snoozeJob(id, at) {
      await init();
      await db.prepare('UPDATE users SET next_job = ?2 WHERE id = ?1').bind(id, at).run();
    },
    async allIds() {
      await init();
      const { results } = await db.prepare('SELECT id FROM users').all();
      return results.map((r) => r.id);
    },
    /** ผู้ใช้ที่อาจต้องได้รับการเตือนตอนนี้ (+ ผู้มีรายการประจำ เมื่อ includeRecurring) */
    async dueIds(hhmm, fromHhmm, includeRecurring) {
      await init();
      const sql = `SELECT id FROM users WHERE (reminder IS NOT NULL AND reminder <= ?1 AND reminder >= ?2)${includeRecurring ? ' OR has_recurring = 1' : ''}`;
      const { results } = await db.prepare(sql).bind(hhmm, fromHhmm).all();
      return results.map((r) => r.id);
    },
  };
}
