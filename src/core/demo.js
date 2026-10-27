// ข้อมูลตัวอย่างสำหรับโหมดเดโม (สุ่มแบบคงที่ เพื่อให้แดชบอร์ดมีอะไรให้ดู)
import { todayStr, addDays, monthKey } from './dates.js';
import * as ops from './ops.js';

const DAILY = [
  ['กาแฟ', 'food', 45, 75],
  ['ข้าวมันไก่', 'food', 50, 60],
  ['ข้าวกะเพรา', 'food', 55, 70],
  ['ชานมไข่มุก', 'food', 40, 65],
  ['BTS', 'transport', 32, 59],
  ['วินมอไซ', 'transport', 20, 40],
  ['เซเว่น', 'shopping', 35, 120],
  ['ส้มตำ', 'food', 60, 90],
];
const OCCASIONAL = [
  ['หมูกระทะ', 'food', 299, 459],
  ['Grab', 'transport', 89, 180],
  ['Shopee', 'shopping', 199, 890],
  ['ดูหนัง', 'fun', 220, 360],
  ['เติมน้ำมัน', 'transport', 500, 800],
  ['ตัดผม', 'beauty', 150, 300],
  ['ยาแก้ปวด', 'health', 60, 150],
  ['ทำบุญ', 'family', 100, 300],
];

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function seedDemo(user, now = new Date()) {
  const rand = rng(42);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const between = (a, b) => Math.round((a + rand() * (b - a)) / 5) * 5;
  const today = todayStr(now);
  user.name = 'นายหัวหมุน';
  user.txs = [];
  user.transfers = [];
  // กระเป๋าเงินตัวอย่าง: เงินสด · กสิกร · SCB เงินเก็บ · TrueMoney · บัตร KTC วงเงิน 20,000
  user.accounts = [
    { id: 'cash', type: 'cash', name: 'เงินสด' },
    { id: 'bank', type: 'bank', name: 'กสิกร', provider: 'kbank' },
    { id: 'scb', type: 'bank', name: 'SCB เงินเก็บ', provider: 'scb' },
    { id: 'tmw', type: 'ewallet', name: 'TrueMoney', provider: 'truemoney' },
    { id: 'card', type: 'card', name: 'KTC', provider: 'ktc', limit: 20000, dueDay: 25 },
    { id: 'kcard', type: 'card', name: 'บัตรกสิกร', provider: 'kbank', limit: 30000, dueDay: 12 },
    { id: 'car', type: 'loan', name: 'ผ่อนรถ', provider: 'kbank', principal: 120000, monthlyPayment: 6500, rate: 3.5, dueDay: 5 },
    { id: 'ton', type: 'receivable', name: 'ต้น (ยืมไป)' },
  ];
  user.settings.defaultWallet = 'cash';
  const DAYS = 184;
  const start = addDays(today, -DAYS);
  const startAt = new Date(`${start}T00:00:00.000Z`);
  for (const [id, v] of [['cash', 3000], ['bank', 15000], ['scb', 30000], ['tmw', 300], ['card', 0], ['kcard', 0], ['car', 72000], ['ton', 0]]) ops.setBalance(user, id, v, startAt);
  const walletOf = (r) => (r < 0.4 ? 'cash' : r < 0.78 ? 'bank' : 'tmw');
  const add = (date, note, categoryId, amount, type = 'expense', wallet) =>
    ops.addTx(user, { date, note, categoryId, amount, type, wallet: wallet || walletOf(rand()) }, rand() > 0.85 ? 'slip' : 'chat');
  const move = (date, from, to, amount) => (ops.addTransfer(user, { from, to, amount, date }).createdAt = `${date}T12:00:00.000Z`);

  for (let i = DAYS - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const n = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const [note, cat, a, b] = pick(DAILY);
      add(d, note, cat, between(a, b));
    }
    if (rand() > 0.72) {
      const [note, cat, a, b] = pick(OCCASIONAL);
      add(d, note, cat, between(a, b), 'expense', rand() > 0.35 ? 'card' : 'kcard');
    }
    const day = Number(d.slice(8, 10));
    if (day === 1) add(d, 'ค่าห้อง', 'bills', 4500, 'expense', 'bank');
    if (day === 5) add(d, 'ค่าเน็ต', 'bills', 599, 'expense', 'bank');
    if (day === 1) add(d, 'เงินเดือน', 'salary', 21000, 'income', 'bank');
    if (day === 20) add(d, 'งานฟรีแลนซ์', 'freelance', between(2000, 4000), 'income', 'bank');
    if (day === 15) add(d, 'ขายของออนไลน์', 'sales', between(1500, 3500), 'income', 'bank');
    if (day === 2) move(d, 'bank', 'scb', 3000);
    if (day === 5) move(d, 'bank', 'car', 6500);
    if (i === 20) move(d, 'bank', 'ton', 1500);
    if (i === 6) move(d, 'ton', 'cash', 500);
    // กดเงินสด/เติม TrueMoney เมื่อเหลือน้อย · จ่ายบัตรทุกวันที่ 25
    const bal = Object.fromEntries(ops.accountList(user, now).map((x) => [x.id, x]));
    if (bal.cash.balance < 600) move(d, 'bank', 'cash', 2000);
    if (bal.tmw.balance < 150) move(d, 'bank', 'tmw', 500);
    if (day === 25 && bal.card.used > 0) move(d, 'bank', 'card', bal.card.used);
    if (day === 12 && bal.kcard.used > 0) move(d, 'bank', 'kcard', Math.round(bal.kcard.used * 0.3));
  }
  // createdAt ให้ตรงกับวันที่ (สำหรับนับ streak)
  for (const t of user.txs) t.createdAt = `${t.date}T12:00:00.000Z`;
  user.settings.monthlyBudget = 18000;
  user.settings.catBudgets = { food: 5000, shopping: 4500 };
  user.settings.reminder = '21:00';
  user.goals = [];
  const g1 = ops.addGoal(user, { name: 'เที่ยวญี่ปุ่น', target: 50000, emoji: '🗾' });
  ops.depositGoal(user, g1.id, 18500);
  const g2 = ops.addGoal(user, { name: 'เงินสำรองฉุกเฉิน', target: 30000, emoji: '🛟' });
  ops.depositGoal(user, g2.id, 21000);
  user.recurring = [];
  const month = monthKey(today);
  ops.addRecurring(user, { note: 'ค่าห้อง', amount: 4500, categoryId: 'bills', day: 1, wallet: 'bank' }).lastRun = month;
  ops.addRecurring(user, { note: 'ค่าเน็ต', amount: 599, categoryId: 'bills', day: 5, wallet: 'bank' }).lastRun = month;
  ops.addRecurring(user, { note: 'Netflix', amount: 419, categoryId: 'fun', day: 12, wallet: 'card' });
  user.alerts = {};
  return user;
}
