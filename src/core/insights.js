// ข้อมูลเชิงลึก: คะแนนสุขภาพการเงิน · อัตราการออม · ความเร็วการใช้เงิน · วงเงินบัตร · นับถอยหลังปลดหนี้
// ไม่ import ops.js (ops เรียกไฟล์นี้) — รับงบ/ยอดบัญชีที่คำนวณแล้วเข้ามา
import { todayStr, cycleOf, shiftCycle, diffDays, TH_MONTHS } from './dates.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const round = (n) => Math.round(n);

function sumRange(txs, from, to) {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.date < from || t.date > to) continue;
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense };
}

export const GRADES = [
  { min: 80, grade: 'A', label: 'แข็งแรงมาก', mood: 'calm' },
  { min: 65, grade: 'B', label: 'ดี', mood: 'calm' },
  { min: 50, grade: 'C', label: 'พอใช้', mood: 'ok' },
  { min: 35, grade: 'D', label: 'ต้องระวัง', mood: 'dizzy' },
  { min: 0, grade: 'F', label: 'เสี่ยง', mood: 'spin' },
];

/**
 * user, now, { budget: ops.budgetStatus(), balances: accountBalances(), totals: accountTotals() }
 */
export function insights(user, now = new Date(), { budget, balances = [], totals = {} } = {}) {
  const today = todayStr(now);
  const startDay = user.settings?.cycleStartDay || 1;
  const txs = user.txs || [];
  const cur = cycleOf(today, startDay);

  // รอบที่จบแล้ว 6 รอบล่าสุด (เก่า → ใหม่)
  const past = [];
  for (let i = 6; i >= 1; i--) {
    const c = shiftCycle(cur, -i, startDay);
    const s = sumRange(txs, c.from, c.to);
    past.push({ key: c.from, label: TH_MONTHS[Number(c.from.slice(5, 7)) - 1], ...s, rate: s.income ? (s.income - s.expense) / s.income : null });
  }
  const withData = past.filter((p) => p.income || p.expense);
  const recent = withData.slice(-3);
  const avgIncome = recent.length ? recent.reduce((a, p) => a + p.income, 0) / recent.length : 0;
  const avgExpense = recent.length ? recent.reduce((a, p) => a + p.expense, 0) / recent.length : 0;
  const rated = withData.filter((p) => p.rate !== null);
  const savingsRate = rated.length ? rated.reduce((a, p) => a + p.rate, 0) / rated.length : null;
  const target = 0.2;
  const gapPerMonth = savingsRate !== null && savingsRate < target ? round((target - savingsRate) * avgIncome) : 0;

  // ความเร็วการใช้เงินรอบนี้
  const curSum = sumRange(txs, cur.from, today);
  const days = diffDays(cur.from, cur.to) + 1;
  const elapsed = Math.min(days, diffDays(cur.from, today) + 1);
  const elapsedPct = elapsed / days;
  const forecast = elapsed ? (curSum.expense / elapsed) * days : 0;
  const pace = avgExpense ? forecast / avgExpense : null;

  // บัตรเครดิต / หนี้
  const active = balances.filter((a) => !a.archived && a.known);
  const cards = active.filter((a) => a.type === 'card' && a.limit).map((a) => ({ id: a.id, name: a.name, icon: a.icon, color: a.color, used: a.used, limit: a.limit, pct: a.used / a.limit, available: a.available }));
  const debts = active.filter((a) => a.type === 'loan' && a.used > 0).map((a) => ({ id: a.id, name: a.name, icon: a.icon, color: a.color, used: a.used, principal: a.principal, pctPaid: a.pctPaid, monthlyPayment: a.monthlyPayment || 0, rate: a.rate || 0, monthsLeft: a.monthsLeft }));
  const debtFreeMonths = debts.length && debts.every((d) => d.monthsLeft != null) ? Math.max(...debts.map((d) => d.monthsLeft)) : null;

  // ---- คะแนนสุขภาพการเงิน (เต็ม 100) ----
  const parts = [];
  const add = (key, label, max, ratio, detail) => parts.push({ key, label, max, score: Math.round(max * clamp01(ratio)), detail });
  if (savingsRate === null) add('save', 'อัตราการออม', 30, 0.5, 'ยังไม่มีรายรับให้คำนวณ');
  else add('save', 'อัตราการออม', 30, savingsRate / target, `เก็บได้ ${Math.round(savingsRate * 100)}% ของรายรับ (เป้า 20%)`);
  if (budget?.total) {
    const bp = forecast / budget.total;
    add('budget', 'คุมงบ', 20, (1.5 - bp) / 0.5, bp <= 1 ? 'ใช้ตามงบ' : `คาดว่าเกินงบ ${Math.round((bp - 1) * 100)}%`);
  } else add('budget', 'คุมงบ', 20, 0.5, 'ยังไม่ได้ตั้งงบ');
  const limitSum = cards.reduce((a, c) => a + c.limit, 0);
  const util = limitSum ? cards.reduce((a, c) => a + Math.max(0, c.used), 0) / limitSum : 0;
  add('card', 'ใช้วงเงินบัตร', 20, cards.length ? (0.9 - util) / 0.6 : 1, cards.length ? `ใช้ไป ${Math.round(util * 100)}% ของวงเงิน (ไม่ควรเกิน 30%)` : 'ไม่มียอดบัตรค้าง');
  const burden = avgIncome ? (totals.monthlyPayments || 0) / avgIncome : totals.monthlyPayments ? 1 : 0;
  add('debt', 'ภาระหนี้', 15, debts.length ? (0.5 - burden) / 0.3 : 1, debts.length ? `ค่างวด ${Math.round(burden * 100)}% ของรายได้` : 'ไม่มีหนี้ผ่อน');
  const known = active.some((a) => ['cash', 'bank', 'ewallet'].includes(a.type));
  const emergencyMonths = avgExpense ? (totals.cash || 0) / avgExpense : null;
  if (!known) add('emergency', 'เงินสำรอง', 15, 0.3, 'ตั้งยอดเงินในบัญชีก่อน');
  else add('emergency', 'เงินสำรอง', 15, emergencyMonths == null ? 0.5 : emergencyMonths / 6, emergencyMonths == null ? 'ยังไม่มีข้อมูลรายจ่าย' : `พอใช้ ${emergencyMonths.toFixed(1)} เดือน (เป้า 6 เดือน)`);
  const score = parts.reduce((a, p) => a + p.score, 0);
  const g = GRADES.find((x) => score >= x.min);

  return {
    health: { score, ...g, parts },
    savings: { series: past, rate: savingsRate, target, gapPerMonth },
    pace: { spent: curSum.expense, elapsedPct, forecast: round(forecast), avg: round(avgExpense), pace },
    allowance: budget?.total ? { perDay: budget.perDayLeft, remaining: budget.remaining, daysLeft: budget.daysLeft } : null,
    cards,
    debts,
    debtFreeMonths,
    emergencyMonths,
    avgIncome: round(avgIncome),
    avgExpense: round(avgExpense),
  };
}
