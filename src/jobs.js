// งานตามเวลา: เตือนจดรายจ่ายตามเวลาที่ผู้ใช้ตั้ง + บันทึกรายการประจำที่ถึงกำหนด
// Node เรียกทุก 1 นาทีด้วย setInterval, Cloudflare เรียกผ่าน Cron Trigger
import { timeStr, todayStr, rangeFor, shiftCycle, addDays, monthKey, addMonths, daysInMonth } from './core/dates.js';
import * as ops from './core/ops.js';
import { reminderMessage, monthlyReportDue, monthlyReportMessages } from './core/bot.js';
import { textMsg } from './core/flex.js';
import { money } from './core/format.js';
import { retryOnConflict } from './core/conflict.js';

/** เวลาที่ต้องตรวจงานของผู้ใช้คนนี้ครั้งถัดไป "YYYY-MM-DD HH:MM" (เวลาไทย) · ไม่มีงาน → '9999' */
export function nextJobAt(user, now = new Date()) {
  const today = todayStr(now);
  const hhmm = timeStr(now);
  const at = [];
  const s = user.settings || {};
  const r = s.reminder;
  if (r) at.push(s.lastReminded === today || toMin(hhmm) - toMin(r) > 30 ? `${addDays(today, 1)} ${r}` : `${today} ${r}`);
  const month = monthKey(today);
  for (const x of user.recurring || []) {
    const m = x.lastRun === month ? addMonths(month, 1) : month;
    const day = String(Math.min(x.day || 1, daysInMonth(m))).padStart(2, '0');
    at.push(`${m}-${day} 07:00`);
  }
  if (s.monthlyReport !== false && user.txs?.length) {
    const cur = rangeFor('month', now, s.cycleStartDay || 1);
    // รายงานส่งเฉพาะวันแรกของรอบ: เลยวันนั้นแล้ว/ส่งแล้ว → รอบหน้า
    const from = s.lastReport === cur.from || today > cur.from ? shiftCycle(cur, 1, s.cycleStartDay || 1).from : cur.from;
    at.push(`${from} 09:00`);
  }
  return at.sort()[0] || '9999';
}

/** เวลาไทยตอนนี้ในรูปเดียวกับ nextJobAt */
export const jobClock = (now = new Date()) => `${todayStr(now)} ${timeStr(now)}`;

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
 * ctxFor(userId): ลิงก์/โลโก้สำหรับรายงานประจำเดือน
 * คืนจำนวนผู้ใช้ที่ได้รับข้อความ
 */
export async function runJobs({ store, ids, push, ctxFor, now = new Date() }) {
  const hhmm = timeStr(now);
  const today = todayStr(now);
  let sent = 0;
  for (const id of ids) {
    let user;
    let messages;
    try {
      // ถ้าผู้ใช้จดรายการพร้อมกับตอนที่งานนี้ทำ → โหลดใหม่แล้วคิดใหม่
      const done = await retryOnConflict(async () => {
        const raw = await store.get(id);
        if (!raw) return null;
        user = ops.normalizeUser(raw);
        messages = await jobFor(user);
        return user;
      });
      if (!done) continue;
      // กันวนตรวจทุกนาที: ทำงานแล้วยังได้เวลาถัดไปเป็นตอนนี้ → เลื่อนไป 1 ชั่วโมง
      if (store.snoozeJob && nextJobAt(user, now) <= jobClock(now)) await store.snoozeJob(id, jobClock(new Date(now.getTime() + 3600_000)));
    } catch (e) {
      console.error('job failed', id, e.message);
      // อย่าให้คนเดียวที่พังขวางคิว: เลื่อนไปตรวจใหม่อีก 1 ชั่วโมง
      await store.snoozeJob?.(id, jobClock(new Date(now.getTime() + 3600_000))).catch(() => {});
      continue;
    }
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

  async function jobFor(user) {
    let changed = false;
    const messages = [];

    const created = ops.runRecurring(user, now);
    if (created.length) {
      changed = true;
      messages.push(textMsg(`🔁 บันทึกรายการประจำให้แล้ว\n${created.map((t) => `• ${t.note} ${money(t.amount)}`).join('\n')}`));
    }
    const cycle = monthlyReportDue(user, now);
    if (cycle) {
      messages.push(...monthlyReportMessages(user, cycle, ctxFor ? await ctxFor(user.id) : {}));
      user.settings.lastReport = rangeForCurrent(user, now);
      changed = true;
    }
    const r = user.settings.reminder;
    if (r && r <= hhmm && user.settings.lastReminded !== today) {
      // ส่งเฉพาะช่วง 30 นาทีหลังเวลาที่ตั้ง (กันส่งย้อนหลังตอนเซิร์ฟเวอร์เพิ่งเปิด)
      if (toMin(hhmm) - toMin(r) <= 30) messages.push(reminderMessage(user, now));
      user.settings.lastReminded = today;
      changed = true;
    }
    // บันทึกเสมอ: อัปเดตเวลาตรวจครั้งถัดไป (next_job) ด้วย
    if (changed || store.nextJobs) await store.save(user);
    return messages;
  }
}

const rangeForCurrent = (user, now) => rangeFor('month', now, user.settings.cycleStartDay).from;
