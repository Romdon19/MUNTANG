// งานตามเวลา: เตือนจดรายจ่ายตามเวลาที่ผู้ใช้ตั้ง + บันทึกรายการประจำที่ถึงกำหนด
// Node เรียกทุก 1 นาทีด้วย setInterval, Cloudflare เรียกผ่าน Cron Trigger
import { timeStr, todayStr } from './core/dates.js';
import * as ops from './core/ops.js';
import { reminderMessage } from './core/bot.js';
import { textMsg } from './core/flex.js';
import { money } from './core/format.js';

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** เวลา HH:MM ย้อนหลัง n นาที (ไม่ข้ามวัน) */
export function windowStart(hhmm, n = 30) {
  const t = Math.max(0, toMin(hhmm) - n);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/**
 * store: { get, save }, ids: รายชื่อผู้ใช้ที่ต้องตรวจ, push(userId, messages)
 * คืนจำนวนผู้ใช้ที่ได้รับข้อความ
 */
export async function runJobs({ store, ids, push, now = new Date() }) {
  const hhmm = timeStr(now);
  const today = todayStr(now);
  let sent = 0;
  for (const id of ids) {
    const raw = await store.get(id);
    if (!raw) continue;
    const user = ops.normalizeUser(raw);
    let changed = false;
    const messages = [];

    const created = ops.runRecurring(user, now);
    if (created.length) {
      changed = true;
      messages.push(textMsg(`🔁 บันทึกรายการประจำให้แล้ว\n${created.map((t) => `• ${t.note} ${money(t.amount)}`).join('\n')}`));
    }
    const r = user.settings.reminder;
    if (r && r <= hhmm && user.settings.lastReminded !== today) {
      // ส่งเฉพาะช่วง 30 นาทีหลังเวลาที่ตั้ง (กันส่งย้อนหลังตอนเซิร์ฟเวอร์เพิ่งเปิด)
      if (toMin(hhmm) - toMin(r) <= 30) messages.push(reminderMessage(user, now));
      user.settings.lastReminded = today;
      changed = true;
    }
    if (changed) await store.save(user);
    if (messages.length) {
      try {
        await push(user.id, messages);
        sent++;
      } catch (e) {
        console.error('push failed', id, e.message);
      }
    }
  }
  return sent;
}
