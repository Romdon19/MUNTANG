// "หัวหมุนมิเตอร์": อารมณ์ของนายหัวหมุนตามสถานะงบ ใช้ทั้งในแชทและแดชบอร์ด
import { money } from './format.js';

export const MOOD_LEVELS = ['idle', 'calm', 'ok', 'dizzy', 'spin'];

/** ลิงก์รูปนายหัวหมุนทุกอารมณ์ จากโฟลเดอร์ assets (ไฟล์ mood-<level>.png) */
export function moodPics(assetsBase) {
  return Object.fromEntries(MOOD_LEVELS.map((l) => [l, `${assetsBase}/mood-${l}.png`]));
}

/** budget: ผลจาก ops.budgetStatus() */
export function moodFor(budget) {
  if (!budget?.total) {
    return { level: 'idle', face: '🤔', title: 'ยังไม่ได้ตั้งงบ', line: 'ตั้งงบไว้ หัวจะได้ไม่หมุนตอนสิ้นเดือน' };
  }
  const left = money(Math.max(0, budget.remaining));
  if (budget.pct >= 1) {
    return { level: 'spin', face: '🌀', title: 'หัวหมุนติ้ว!', line: `เกินงบไปแล้ว ${money(-budget.remaining)} เบรกก่อนน้า` };
  }
  if (budget.pct >= 0.8) {
    return { level: 'dizzy', face: '😵‍💫', title: 'เริ่มหัวหมุนแล้ว', line: `เหลือ ${left} ใช้ได้วันละ ~${money(budget.perDayLeft)}` };
  }
  if (budget.pct >= 0.5) {
    return { level: 'ok', face: '🙂', title: 'หมุนกำลังดี', line: `เหลือ ${left} ใช้ได้วันละ ~${money(budget.perDayLeft)}` };
  }
  return { level: 'calm', face: '😎', title: 'หัวยังนิ่ง สบายๆ', line: `งบเหลือเพียบ ${left} ใช้ได้วันละ ~${money(budget.perDayLeft)}` };
}
