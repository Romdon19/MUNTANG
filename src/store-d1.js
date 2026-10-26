// ฐานข้อมูล Cloudflare D1: 1 แถวต่อผู้ใช้ (เก็บ JSON) + คอลัมน์สำหรับค้นหางานตามเวลา
// ตารางถูกสร้างอัตโนมัติในครั้งแรก ไม่ต้องรัน migration เอง
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    reminder TEXT,
    has_recurring INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS users_reminder ON users (reminder)',
  'CREATE INDEX IF NOT EXISTS users_recurring ON users (has_recurring)',
];

export function createD1Store(db) {
  let ready = null;
  const init = () => (ready ||= db.batch(SCHEMA.map((s) => db.prepare(s))));

  return {
    async get(id) {
      await init();
      const row = await db.prepare('SELECT data FROM users WHERE id = ?1').bind(id).first();
      return row ? JSON.parse(row.data) : null;
    },
    async save(user) {
      await init();
      await db
        .prepare(
          `INSERT INTO users (id, data, reminder, has_recurring, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
           ON CONFLICT(id) DO UPDATE SET data = excluded.data, reminder = excluded.reminder,
             has_recurring = excluded.has_recurring, updated_at = excluded.updated_at`
        )
        .bind(user.id, JSON.stringify(user), user.settings?.reminder || null, user.recurring?.length ? 1 : 0, new Date().toISOString())
        .run();
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
