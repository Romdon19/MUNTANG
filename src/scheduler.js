// ทุก 1 นาที: เตือนจดรายจ่ายตามเวลาที่ผู้ใช้ตั้ง + บันทึกรายการประจำที่ถึงกำหนด
import { timeStr, todayStr } from './core/dates.js';
import * as ops from './core/ops.js';
import { reminderMessage } from './core/bot.js';
import { textMsg } from './core/flex.js';
import { money } from './core/format.js';

export function startScheduler({ store, push }) {
  let running = false;
  async function tick() {
    if (running) return;
    running = true;
    const now = new Date();
    const hhmm = timeStr(now);
    const today = todayStr(now);
    try {
      for (const id of await store.list()) {
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
        if (user.settings.reminder && user.settings.reminder <= hhmm && user.settings.lastReminded !== today) {
          // ส่งเฉพาะช่วง 30 นาทีหลังเวลาที่ตั้ง (กันส่งย้อนหลังตอนเซิร์ฟเวอร์เพิ่งเปิด)
          const [h, m] = user.settings.reminder.split(':').map(Number);
          const [nh, nm] = hhmm.split(':').map(Number);
          if (nh * 60 + nm - (h * 60 + m) <= 30) messages.push(reminderMessage(user, now));
          user.settings.lastReminded = today;
          changed = true;
        }
        if (changed) await store.save(user);
        if (messages.length) await push(user.id, messages).catch((e) => console.error('push failed', id, e.message));
      }
    } catch (e) {
      console.error('scheduler error', e);
    } finally {
      running = false;
    }
  }
  const timer = setInterval(tick, 60_000);
  tick();
  return () => clearInterval(timer);
}
