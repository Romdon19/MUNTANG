// การจัดการข้อมูลผู้ใช้ (ทำงานกับ user document ตรงๆ — ใช้ร่วมกันทั้งเซิร์ฟเวอร์และโหมดเดโมในเบราว์เซอร์)
import { CATEGORIES, CATEGORY_MAP } from './categories.js';
import { ACCOUNT_TYPES, PROVIDER_MAP, LIABILITY, SPENDABLE, defaultAccounts, activeAccounts, findAccount, resolveWallet, accountBalances, accountTotals, decorate, guessProvider } from './accounts.js';
import { insights } from './insights.js';
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
    accounts: defaultAccounts(),
    transfers: [],
    goals: [],
    recurring: [],
    slipRefs: [],
    alerts: {},
  };
}

/** เติมฟิลด์ที่ขาดให้ user เก่า (เผื่อเพิ่มฟีเจอร์ภายหลัง) */
export function normalizeUser(u) {
  const base = newUser(u.id);
  const out = { ...base, ...u, settings: { ...base.settings, ...(u.settings || {}) } };
  if (!Array.isArray(out.accounts) || !out.accounts.length) out.accounts = defaultAccounts();
  if (!Array.isArray(out.transfers)) out.transfers = [];
  return out;
}

function sanitizeTx(input, user) {
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
    wallet: resolveWallet(user, input.wallet),
  };
}

export function addTx(user, input, source = 'chat') {
  const tx = {
    id: newId('t'),
    ...sanitizeTx(input, user),
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
  const merged = sanitizeTx({ ...tx, ...patch }, user);
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
    ...sanitizeTx({ note, amount, type, categoryId, wallet }, user),
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
  const head = ['วันที่', 'ประเภท', 'หมวด', 'รายการ', 'จำนวนเงิน', 'บัญชี', 'ที่มา'];
  const rows = [...user.txs]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((t) => [
      t.date,
      t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
      CATEGORY_MAP[t.categoryId]?.name || t.categoryId,
      t.note,
      t.amount.toFixed(2),
      accountName(user, t.wallet),
      t.source,
    ]);
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  // BOM เพื่อให้ Excel เปิดภาษาไทยได้
  return '﻿' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}

/** ล้างรายการทั้งหมด แต่เก็บการตั้งค่า (งบ รอบบัญชี เวลาเตือน คำที่สอนไว้) */
export function clearData(user) {
  const n = user.txs.length;
  user.txs = [];
  user.transfers = [];
  for (const a of user.accounts || []) delete a.since;
  user.goals = [];
  user.recurring = [];
  user.slipRefs = [];
  user.alerts = {};
  user.settings.lastStreakCard = null;
  return n;
}

/** โฟลเดอร์รูปหลักฐานของสมุดบัญชี */
export const filesPrefix = (userId) => `${String(userId).replace(/[^\w-]/g, '_')}/`;

/** ข้อมูลที่ส่งให้แดชบอร์ด */
export function publicState(user, { aiEnabled = false, now = new Date() } = {}) {
  const budget = budgetStatus(user, now);
  const balances = accountBalances(user, budget, now);
  const totals = accountTotals(balances);
  return {
    user: { id: user.id, name: user.name, pictureUrl: user.pictureUrl },
    settings: { ...user.settings, customKeywords: undefined },
    txs: user.txs,
    goals: user.goals,
    recurring: user.recurring,
    budget,
    streak: streak(user, now),
    tier: tierFor(streak(user, now)),
    catStatus: catStatusMap(user, now),
    categories: CATEGORIES.map(({ keywords, ...c }) => c),
    wallets: (user.accounts || []).map(decorate),
    accounts: balances,
    accountTotals: totals,
    insights: insights(user, now, { budget, balances, totals }),
    accountTypes: ACCOUNT_TYPES,
    providers: Object.values(PROVIDER_MAP).map(({ words, ...p }) => p),
    transfers: user.transfers,
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
  if (b.defaultWallet && activeAccounts(user).some((a) => a.id === b.defaultWallet && SPENDABLE.includes(a.type))) user.settings.defaultWallet = b.defaultWallet;
  if (b.name) user.name = String(b.name).slice(0, 40);
  if (b.cycleStartDay !== undefined) user.settings.cycleStartDay = Math.min(31, Math.max(1, Number(b.cycleStartDay) || 1));
  if (b.monthlyReport !== undefined) user.settings.monthlyReport = !!b.monthlyReport;
  if (b.budgetMode === 'total' || b.budgetMode === 'category') user.settings.budgetMode = b.budgetMode;
  user.alerts = {};
}

// ---------------- กระเป๋าเงิน (บัญชีธนาคาร / e-Wallet / บัตรเครดิต / เงินสด) ----------------

const money2 = (v) => Math.round((Number(String(v ?? '').replace(/,/g, '')) || 0) * 100) / 100;

export function accountName(user, id) {
  const a = findAccount(user, id);
  return a ? decorate(a).name : ACCOUNT_TYPES[id]?.name || id || '';
}

export function accountList(user, now = new Date()) {
  return accountBalances(user, budgetStatus(user, now), now);
}

function cleanAccount(input, prev = {}) {
  const type = ACCOUNT_TYPES[input.type] ? input.type : prev.type || 'bank';
  const name = String(input.name ?? prev.name ?? '').trim().slice(0, 30);
  // provider: ส่งมา '' = ไม่ระบุธนาคาร, ไม่ส่งมา = เดาจากชื่อ เช่น "กสิกร เงินเดือน"
  let provider = 'provider' in input ? input.provider : prev.provider;
  if (provider && !PROVIDER_MAP[provider]) provider = null;
  if (!provider && !('provider' in input)) provider = guessProvider(name, type);
  const out = { ...prev, type, name: name || PROVIDER_MAP[provider]?.name || ACCOUNT_TYPES[type].name, provider: provider || null };
  const day = (v) => (Number(v) >= 1 && Number(v) <= 31 ? Number(v) : null);
  if (type === 'card' && input.limit !== undefined) out.limit = Math.max(0, money2(input.limit));
  if (type === 'card' && input.statementDay !== undefined) out.statementDay = day(input.statementDay);
  if (type === 'card' && input.cycleBudget !== undefined) out.cycleBudget = Math.max(0, money2(input.cycleBudget)) || null;
  if (LIABILITY.includes(type) && input.dueDay !== undefined) out.dueDay = day(input.dueDay);
  if (type === 'loan') {
    // หนี้: ยอดกู้ตั้งต้น (ไว้ดู % ที่จ่ายไปแล้ว) ค่างวดต่อเดือน ดอกเบี้ยต่อปี
    if (input.principal !== undefined) out.principal = Math.max(0, money2(input.principal));
    if (input.monthlyPayment !== undefined) out.monthlyPayment = Math.max(0, money2(input.monthlyPayment));
    if (input.rate !== undefined) out.rate = Math.max(0, Math.min(100, Number(input.rate) || 0));
    // ผ่อนสินค้าเป็นงวด: จำนวนงวดทั้งหมด + ผ่อนผ่านบัตรใบไหน
    if (input.installments !== undefined) out.installments = Math.max(0, Math.min(360, Math.round(Number(input.installments) || 0))) || null;
    if (input.viaCard !== undefined) out.viaCard = input.viaCard || null;
  }
  if (type !== 'card') for (const k of ['limit', 'statementDay', 'cycleBudget']) delete out[k];
  if (!LIABILITY.includes(type)) delete out.dueDay;
  if (type !== 'loan') for (const k of ['principal', 'monthlyPayment', 'rate', 'installments', 'viaCard']) delete out[k];
  return out;
}

/** ผ่อนเป็นงวด: ใส่ งวดทั้งหมด + จ่ายแล้วกี่งวด + ค่างวด → คิดยอดคงเหลือ/ยอดตั้งต้นให้ */
function installmentPlan(input) {
  const n = Number(input.installments) || 0;
  const pay = money2(input.monthlyPayment);
  if (!(n > 0 && pay > 0) || input.paidInstallments === undefined || input.paidInstallments === '') return null;
  const k = Math.max(0, Math.min(n, Math.round(Number(input.paidInstallments) || 0)));
  return { principal: money2(pay * n), balance: money2(pay * (n - k)) };
}

function checkViaCard(user, a) {
  if (a.viaCard && findAccount(user, a.viaCard)?.type !== 'card') a.viaCard = null;
}

/** ตั้งยอดปัจจุบันของบัญชี (บัตรเครดิต = ยอดที่ใช้ไป/ค้างจ่าย) นับรายการต่อจากนี้ */
export function setBalance(user, id, value, now = new Date()) {
  const a = findAccount(user, id);
  if (!a) return null;
  a.opening = money2(value);
  a.since = todayStr(now);
  a.balanceAt = now.toISOString();
  return a;
}

export function addAccount(user, input = {}, now = new Date()) {
  if (activeAccounts(user).length >= 30) throw new Error('มีบัญชีได้สูงสุด 30 บัญชี');
  const plan = input.type === 'loan' ? installmentPlan(input) : null;
  const clean = cleanAccount({ ...input, ...(plan ? { principal: plan.principal } : {}) });
  // บัญชีแรกของประเภทนั้น: ใช้แทนบัญชีกลางๆ ที่สร้างไว้ให้ (บัญชีธนาคาร/บัตรเครดิต) รายการเก่าจะตามมาด้วย
  const generic = defaultAccounts().find((d) => d.id === clean.type);
  const holder = generic && user.accounts.find((x) => x.id === generic.id && x.name === generic.name && !x.provider && !x.since && !x.archived);
  if (holder) {
    Object.assign(holder, clean, { updatedAt: now.toISOString() });
    setBalance(user, holder.id, input.balance ?? input.used ?? 0, now);
    return holder;
  }
  const a = { id: newId('a'), ...clean, createdAt: now.toISOString() };
  checkViaCard(user, a);
  if (a.type === 'loan' && !a.principal) a.principal = money2(input.balance ?? input.used ?? 0);
  user.accounts.push(a);
  setBalance(user, a.id, plan ? plan.balance : input.balance ?? input.used ?? 0, now);
  return a;
}

export function updateAccount(user, id, input = {}, now = new Date()) {
  const a = findAccount(user, id);
  if (!a) return null;
  const plan = (input.type || a.type) === 'loan' ? installmentPlan({ ...a, ...input }) : null;
  Object.assign(a, cleanAccount({ ...input, ...(plan ? { principal: plan.principal } : {}) }, a), { updatedAt: now.toISOString() });
  checkViaCard(user, a);
  const bal = plan ? plan.balance : input.balance ?? input.used;
  if (bal !== undefined && bal !== '' && bal !== null) {
    const cur = accountBalances(user, null, now).find((x) => x.id === id);
    const curVal = LIABILITY.includes(a.type) ? cur.used : cur.balance;
    if (!a.since || money2(bal) !== curVal) setBalance(user, id, bal, now);
  }
  return a;
}

/** ลบบัญชี: ถ้ามีรายการผูกอยู่จะซ่อนไว้แทน (ประวัติยังดูได้) */
export function deleteAccount(user, id) {
  const a = findAccount(user, id);
  if (!a) return null;
  if (SPENDABLE.includes(a.type) && !activeAccounts(user).some((x) => x.id !== id && SPENDABLE.includes(x.type))) throw new Error('ต้องมีบัญชีที่ใช้จ่ายอย่างน้อย 1 บัญชี');
  const used = user.txs.some((t) => t.wallet === id) || user.transfers.some((x) => x.from === id || x.to === id) || user.recurring.some((r) => r.wallet === id);
  if (used) a.archived = true;
  else user.accounts.splice(user.accounts.indexOf(a), 1);
  if (user.settings.defaultWallet === id) user.settings.defaultWallet = activeAccounts(user).find((x) => SPENDABLE.includes(x.type)).id;
  return a;
}

function transferNote(fromAcc, toAcc) {
  const n = (a) => decorate(a).name;
  if (toAcc.type === 'card') return `จ่ายบัตร ${n(toAcc)}`;
  if (toAcc.type === 'loan') return `จ่ายหนี้ ${n(toAcc)}`;
  if (fromAcc.type === 'loan') return `ยืมเงิน ${n(fromAcc)}`;
  if (toAcc.type === 'receivable') return `ให้ ${n(toAcc)} ยืม`;
  if (fromAcc.type === 'receivable') return `${n(fromAcc)} คืนเงิน`;
  if (toAcc.type === 'cash') return 'กดเงินสด';
  return `โอนเข้า ${n(toAcc)}`;
}

/** โอนเงินระหว่างบัญชี / จ่ายบัตรเครดิต / เติม e-Wallet (ไม่นับเป็นรายรับรายจ่าย) */
export function addTransfer(user, { from, to, amount, date, note } = {}, now = new Date()) {
  const amt = money2(amount);
  if (!(amt > 0)) throw new Error('จำนวนเงินไม่ถูกต้อง');
  if (!findAccount(user, from) || !findAccount(user, to)) throw new Error('ไม่พบบัญชี');
  if (from === to) throw new Error('เลือกบัญชีต้นทางและปลายทางต่างกัน');
  const toAcc = findAccount(user, to);
  const x = {
    id: newId('x'),
    from,
    to,
    amount: amt,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : todayStr(now),
    note: String(note || transferNote(findAccount(user, from), toAcc)).slice(0, 80),
    createdAt: now.toISOString(),
  };
  user.transfers.push(x);
  return x;
}

export function deleteTransfer(user, id) {
  const i = user.transfers.findIndex((x) => x.id === id);
  return i < 0 ? null : user.transfers.splice(i, 1)[0];
}

/** ข้อมูลเชิงลึก (ใช้ในแชท "สุขภาพการเงิน") */
export function insightsFor(user, now = new Date()) {
  const budget = budgetStatus(user, now);
  const balances = accountBalances(user, budget, now);
  return insights(user, now, { budget, balances, totals: accountTotals(balances) });
}
