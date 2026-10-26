// การจัดการข้อมูลผู้ใช้ (ทำงานกับ user document ตรงๆ — ใช้ร่วมกันทั้งเซิร์ฟเวอร์และโหมดเดโมในเบราว์เซอร์)
import { CATEGORIES, CATEGORY_MAP, WALLETS, WALLET_MAP } from './categories.js';
import { todayStr, monthKey, rangeFor, daysInMonth, addDays, diffDays } from './dates.js';

export function newId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function newUser(id, profile = {}) {
  return {
    id,
    name: profile.name || 'เพื่อนหมุนตังค์',
    pictureUrl: profile.pictureUrl || null,
    createdAt: new Date().toISOString(),
    settings: {
      reminder: null,
      defaultWallet: 'cash',
      monthlyBudget: 0,
      catBudgets: {},
      customKeywords: {},
      lastReminded: null,
      // วันเริ่มรอบบัญชี (1 = ต้นเดือน, 25 = วันเงินเดือนออก ฯลฯ)
      cycleStartDay: 1,
      monthlyReport: true,
      // 'total' = งบรวมก้อนเดียว, 'category' = งบรวม = ผลรวมงบรายหมวด
      budgetMode: 'total',
      lastStreakCard: null,
      lastReport: null,
      onboarded: false,
    },
    txs: [],
    goals: [],
    recurring: [],
    slipRefs: [],
    alerts: {},
  };
}

/** เติมฟิลด์ที่ขาดให้ user เก่า (เผื่อเพิ่มฟีเจอร์ภายหลัง) */
export function normalizeUser(u) {
  const base = newUser(u.id);
  return { ...base, ...u, settings: { ...base.settings, ...(u.settings || {}) } };
}

function sanitizeTx(input) {
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!(amount > 0)) throw new Error('จำนวนเงินไม่ถูกต้อง');
  const type = input.type === 'income' ? 'income' : 'expense';
  let categoryId = CATEGORY_MAP[input.categoryId] ? input.categoryId : type === 'income' ? 'other_income' : 'other';
  if (CATEGORY_MAP[categoryId].type !== type) categoryId = type === 'income' ? 'other_income' : 'other';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date || '') ? input.date : todayStr();
  return {
    type,
    amount,
    categoryId,
    note: String(input.note || '').slice(0, 120) || CATEGORY_MAP[categoryId].name,
    date,
    wallet: WALLET_MAP[input.wallet] ? input.wallet : 'cash',
  };
}

export function addTx(user, input, source = 'chat') {
  const tx = {
    id: newId('t'),
    ...sanitizeTx(input),
    source,
    createdAt: new Date().toISOString(),
  };
  if (input.ref) tx.ref = String(input.ref);
  if (input.by) tx.by = String(input.by).slice(0, 40);
  if (input.batch) tx.batch = String(input.batch);
  if (input.meta) tx.meta = input.meta;
  user.txs.push(tx);
  return tx;
}

export function updateTx(user, id, patch) {
  const tx = user.txs.find((t) => t.id === id);
  if (!tx) return null;
  const merged = sanitizeTx({ ...tx, ...patch });
  Object.assign(tx, merged, { updatedAt: new Date().toISOString() });
  return tx;
}

export function deleteTx(user, id) {
  const i = user.txs.findIndex((t) => t.id === id);
  if (i < 0) return null;
  return user.txs.splice(i, 1)[0];
}

export function lastTx(user) {
  return [...user.txs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] || null;
}

/** สอนหมวด: ครั้งหน้าคำนี้จะเข้าหมวดนี้เสมอ */
export function learnKeyword(user, note, categoryId) {
  const kw = String(note || '').trim().toLowerCase();
  if (!kw || kw.length > 30 || !CATEGORY_MAP[categoryId]) return;
  user.settings.customKeywords[kw] = categoryId;
}

export function txInRange(user, from, to) {
  return user.txs.filter((t) => t.date >= from && t.date <= to);
}

export function summarize(txs) {
  let income = 0;
  let expense = 0;
  const byCat = {};
  const byDay = {};
  const byWallet = {};
  for (const t of txs) {
    if (t.type === 'income') income += t.amount;
    else {
      expense += t.amount;
      byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount;
      byDay[t.date] = (byDay[t.date] || 0) + t.amount;
      byWallet[t.wallet] = (byWallet[t.wallet] || 0) + t.amount;
    }
  }
  const incomeByCat = {};
  for (const t of txs) if (t.type === 'income') incomeByCat[t.categoryId] = (incomeByCat[t.categoryId] || 0) + t.amount;
  const cats = Object.entries(byCat)
    .map(([id, total]) => ({ id, total, pct: expense ? total / expense : 0 }))
    .sort((a, b) => b.total - a.total);
  const incomeCats = Object.entries(incomeByCat)
    .map(([id, total]) => ({ id, total }))
    .sort((a, b) => b.total - a.total);
  return { income, expense, net: income - expense, count: txs.length, cats, incomeCats, byDay, byWallet };
}

export function summaryFor(user, rangeName, now = new Date()) {
  const range = rangeFor(rangeName, now, user.settings.cycleStartDay);
  const txs = txInRange(user, range.from, range.to);
  return { range, txs, ...summarize(txs) };
}

/** สถานะงบประมาณของรอบบัญชีปัจจุบัน */
export function budgetStatus(user, now = new Date()) {
  const today = todayStr(now);
  const cycle = rangeFor('month', now, user.settings.cycleStartDay);
  const s = summarize(txInRange(user, cycle.from, cycle.to));
  const daysLeft = diffDays(today, cycle.to) + 1;
  const catSum = Object.values(user.settings.catBudgets || {}).reduce((a, v) => a + (Number(v) || 0), 0);
  const total = user.settings.budgetMode === 'category' ? catSum : user.settings.monthlyBudget || 0;
  const result = {
    mode: user.settings.budgetMode || 'total',
    month: cycle.key,
    from: cycle.from,
    to: cycle.to,
    label: cycle.label,
    spent: s.expense,
    total,
    remaining: total ? total - s.expense : null,
    pct: total ? s.expense / total : null,
    perDayLeft: total ? Math.max(0, Math.floor((total - s.expense) / daysLeft)) : null,
    daysLeft,
    cats: [],
  };
  for (const [id, limit] of Object.entries(user.settings.catBudgets || {})) {
    if (!limit) continue;
    const spent = s.cats.find((c) => c.id === id)?.total || 0;
    result.cats.push({ id, limit, spent, pct: spent / limit, remaining: limit - spent });
  }
  result.cats.sort((a, b) => b.pct - a.pct);
  return result;
}

/**
 * เช็คว่าหลังบันทึกรายการแล้วงบแตะ 80% / 100% หรือยัง — แจ้งเตือนครั้งเดียวต่อระดับต่อเดือน
 * คืน array ของข้อความเตือน
 */
export function budgetAlerts(user, now = new Date()) {
  const b = budgetStatus(user, now);
  const out = [];
  const check = (key, pct, label) => {
    for (const level of [1, 0.8]) {
      if (pct >= level) {
        const k = `${b.month}:${key}:${level}`;
        if (!user.alerts[k]) {
          user.alerts[k] = true;
          out.push({ level, label, pct });
        }
        break;
      }
    }
  };
  if (b.total) check('total', b.pct, 'งบรวมเดือนนี้');
  for (const c of b.cats) check(c.id, c.pct, `งบหมวด${CATEGORY_MAP[c.id]?.name || c.id}`);
  return out;
}

/** ใช้ไปเท่าไรในแต่ละหมวด (รอบปัจจุบัน) + งบของหมวด */
export function catStatusMap(user, now = new Date()) {
  const cycle = rangeFor('month', now, user.settings.cycleStartDay);
  const s = summarize(txInRange(user, cycle.from, cycle.to));
  const out = {};
  for (const c of s.cats) out[c.id] = { spent: c.total, limit: user.settings.catBudgets?.[c.id] || 0 };
  for (const [id, limit] of Object.entries(user.settings.catBudgets || {})) out[id] ||= { spent: 0, limit };
  return out;
}

// ระดับความต่อเนื่องในการจด (ยิ่งจดนาน ยิ่งหัวไม่หมุน)
export const TIERS = [
  { min: 365, name: 'God Tier', emoji: '👑' },
  { min: 100, name: 'เทพแห่งการหมุน', emoji: '🌟' },
  { min: 30, name: 'เซียนหมุนตังค์', emoji: '💎' },
  { min: 7, name: 'หมุนคล่องมือ', emoji: '🔥' },
  { min: 3, name: 'มือใหม่หัดหมุน', emoji: '🌱' },
  { min: 0, name: 'เริ่มหมุน', emoji: '🪙' },
];

export function tierFor(n) {
  const t = TIERS.find((x) => n >= x.min);
  const next = [...TIERS].reverse().find((x) => x.min > n) || null;
  return { ...t, next, progress: next ? (n - t.min) / (next.min - t.min) : 1 };
}

/** จำนวนวันติดต่อกันที่มีการจด (นับถึงวันนี้หรือเมื่อวาน) */
export function streak(user, now = new Date()) {
  const days = new Set(user.txs.map((t) => (t.createdAt ? todayStr(new Date(t.createdAt)) : t.date)));
  let d = todayStr(now);
  if (!days.has(d)) d = addDays(d, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

// ---------- เป้าหมายการออม ----------
export function addGoal(user, { name, target, emoji }) {
  const goal = {
    id: newId('g'),
    name: String(name || 'เป้าหมาย').slice(0, 40),
    target: Math.max(1, Number(target) || 0),
    saved: 0,
    emoji: emoji || '🎯',
    history: [],
    createdAt: new Date().toISOString(),
  };
  user.goals.push(goal);
  return goal;
}

export function findGoal(user, nameOrId) {
  const q = String(nameOrId || '').trim().toLowerCase();
  return (
    user.goals.find((g) => g.id === nameOrId) ||
    user.goals.find((g) => g.name.toLowerCase() === q) ||
    user.goals.find((g) => g.name.toLowerCase().includes(q) || q.includes(g.name.toLowerCase()))
  );
}

export function depositGoal(user, goalId, amount) {
  const g = user.goals.find((x) => x.id === goalId);
  if (!g) return null;
  const n = Math.round(Number(amount) * 100) / 100;
  if (!n) return g;
  g.saved = Math.max(0, Math.round((g.saved + n) * 100) / 100);
  g.history.push({ amount: n, date: todayStr(), at: new Date().toISOString() });
  return g;
}

export function deleteGoal(user, id) {
  const i = user.goals.findIndex((g) => g.id === id);
  return i < 0 ? null : user.goals.splice(i, 1)[0];
}

// ---------- รายการประจำ (ค่าเน็ต ค่าห้อง เงินเดือน ฯลฯ) ----------
export function addRecurring(user, { note, amount, type, categoryId, day, wallet }) {
  const r = {
    id: newId('r'),
    ...sanitizeTx({ note, amount, type, categoryId, wallet }),
    day: Math.min(31, Math.max(1, Number(day) || 1)),
    lastRun: null,
    createdAt: new Date().toISOString(),
  };
  delete r.date;
  user.recurring.push(r);
  return r;
}

export function deleteRecurring(user, id) {
  const i = user.recurring.findIndex((r) => r.id === id);
  return i < 0 ? null : user.recurring.splice(i, 1)[0];
}

/** บันทึกรายการประจำที่ถึงกำหนดแล้ว (วันที่เกินจำนวนวันของเดือนจะใช้วันสุดท้ายแทน) */
export function runRecurring(user, now = new Date()) {
  const today = todayStr(now);
  const month = monthKey(today);
  const day = Number(today.slice(8, 10));
  const created = [];
  for (const r of user.recurring) {
    if (r.lastRun === month) continue;
    const due = Math.min(r.day, daysInMonth(month));
    if (day >= due) {
      const date = `${month}-${String(due).padStart(2, '0')}`;
      created.push(addTx(user, { ...r, date }, 'recurring'));
      r.lastRun = month;
    }
  }
  return created;
}

export function isDuplicateSlip(user, ref) {
  return !!ref && user.slipRefs.includes(ref);
}

export function rememberSlip(user, ref) {
  if (!ref) return;
  user.slipRefs.push(ref);
  if (user.slipRefs.length > 500) user.slipRefs.splice(0, user.slipRefs.length - 500);
}

export function toCSV(user) {
  const head = ['วันที่', 'ประเภท', 'หมวด', 'รายการ', 'จำนวนเงิน', 'ช่องทาง', 'ที่มา'];
  const rows = [...user.txs]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((t) => [
      t.date,
      t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
      CATEGORY_MAP[t.categoryId]?.name || t.categoryId,
      t.note,
      t.amount.toFixed(2),
      WALLET_MAP[t.wallet]?.name || t.wallet,
      t.source,
    ]);
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  // BOM เพื่อให้ Excel เปิดภาษาไทยได้
  return '﻿' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}

/** ข้อมูลที่ส่งให้แดชบอร์ด */
export function publicState(user, { aiEnabled = false, now = new Date() } = {}) {
  return {
    user: { id: user.id, name: user.name, pictureUrl: user.pictureUrl },
    settings: { ...user.settings, customKeywords: undefined },
    txs: user.txs,
    goals: user.goals,
    recurring: user.recurring,
    budget: budgetStatus(user, now),
    streak: streak(user, now),
    tier: tierFor(streak(user, now)),
    catStatus: catStatusMap(user, now),
    categories: CATEGORIES.map(({ keywords, ...c }) => c),
    wallets: WALLETS,
    aiEnabled,
  };
}

/** อัปเดตการตั้งค่าจากแดชบอร์ด */
export function applySettings(user, b = {}) {
  if (b.monthlyBudget !== undefined) user.settings.monthlyBudget = Math.max(0, Number(b.monthlyBudget) || 0);
  if (b.catBudgets && typeof b.catBudgets === 'object') {
    user.settings.catBudgets = Object.fromEntries(
      Object.entries(b.catBudgets)
        .filter(([k, v]) => CATEGORY_MAP[k] && Number(v) > 0)
        .map(([k, v]) => [k, Number(v)])
    );
  }
  if (b.reminder !== undefined) user.settings.reminder = /^\d{2}:\d{2}$/.test(b.reminder || '') ? b.reminder : null;
  if (b.defaultWallet && WALLET_MAP[b.defaultWallet]) user.settings.defaultWallet = b.defaultWallet;
  if (b.name) user.name = String(b.name).slice(0, 40);
  if (b.cycleStartDay !== undefined) user.settings.cycleStartDay = Math.min(31, Math.max(1, Number(b.cycleStartDay) || 1));
  if (b.monthlyReport !== undefined) user.settings.monthlyReport = !!b.monthlyReport;
  if (b.budgetMode === 'total' || b.budgetMode === 'category') user.settings.budgetMode = b.budgetMode;
  user.alerts = {};
}
