// ฐานข้อมูลไฟล์ JSON (1 ไฟล์ต่อผู้ใช้) — ง่ายต่อการเริ่มต้น เปลี่ยนเป็น DB จริงได้โดยคง interface get/save เดิม
import fs from 'node:fs/promises';
import path from 'node:path';

export function createFileStore(dir) {
  const cache = new Map();
  const file = (id) => path.join(dir, `${id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
  const ready = fs.mkdir(dir, { recursive: true });
  // เขียนทีละครั้งต่อผู้ใช้ เพื่อไม่ให้ไฟล์พังเมื่อมีหลาย request พร้อมกัน
  const writing = new Map();

  return {
    async get(id) {
      if (cache.has(id)) return structuredClone(cache.get(id));
      await ready;
      try {
        const user = JSON.parse(await fs.readFile(file(id), 'utf8'));
        cache.set(id, user);
        return structuredClone(user);
      } catch (e) {
        if (e.code === 'ENOENT') return null;
        throw e;
      }
    },
    async save(user) {
      await ready;
      cache.set(user.id, structuredClone(user));
      const prev = writing.get(user.id) || Promise.resolve();
      const next = prev.then(async () => {
        const tmp = `${file(user.id)}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(cache.get(user.id)));
        await fs.rename(tmp, file(user.id));
      });
      writing.set(user.id, next.catch(() => {}));
      return next;
    },
    async delete(id) {
      await ready;
      await (writing.get(id) || Promise.resolve());
      cache.delete(id);
      await fs.rm(file(id), { force: true });
    },
    async list() {
      await ready;
      const names = await fs.readdir(dir);
      return names.filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -5));
    },
  };
}
