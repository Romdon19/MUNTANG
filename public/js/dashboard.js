// แดชบอร์ดหมุนตังค์ (LIFF) — mountDashboard(root, backend, { logoUrl })
import { money } from '../core/format.js';
import { todayStr, thaiDate, TH_DAYS, weekday, cycleOf, shiftCycle, diffDays, addDays } from '../core/dates.js';
import { summarize } from '../core/ops.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const SOURCE_LABEL = { chat: 'แชท', slip: 'สลิป', app: 'แอป', ai: 'AI', recurring: 'ประจำ', pdf: 'PDF' };

export function mountDashboard(root, backend, opts = {}) {
  const st = {
    data: null,
    tab: 'home',
    cycle: null, // รอบบัญชีที่กำลังดู { from, to, label }
    q: '',
    type: 'all',
    cat: '',
    sheet: null, // { kind: 'tx', tx? } | { kind: 'goal' } ...
    toast: '',
    error: '',
  };

  root.classList.add('mt-app');
  root.innerHTML = `<div class="mt-loading"><img src="${esc(opts.logoUrl || '')}" alt=""><span>กำลังหมุน...</span></div>`;

  const cat = (id) => st.data.categories.find((c) => c.id === id) || st.data.categories.find((c) => c.id === 'other');
  const wallet = (id) => st.data.wallets.find((w) => w.id === id) || st.data.wallets[0];

  async function refresh() {
    try {
      st.data = await backend.state();
      st.error = '';
      const startDay = st.data.settings.cycleStartDay || 1;
      if (!st.cycle || st.cycle.startDay !== startDay) st.cycle = { ...cycleOf(todayStr(), startDay), startDay };
    } catch (e) {
      st.error = e.message;
    }
    render();
  }

  function toast(msg) {
    st.toast = msg;
    render();
    clearTimeout(toast.t);
    toast.t = setTimeout(() => {
      st.toast = '';
      render();
    }, 2200);
  }

  async function act(fn, msg) {
    try {
      await fn();
      st.sheet = null;
      await refresh();
      if (msg) toast(msg);
    } catch (e) {
      toast(`ทำรายการไม่สำเร็จ: ${e.message}`);
    }
  }

  // ---------------- views ----------------
  function monthTxs() {
    return st.data.txs.filter((t) => t.date >= st.cycle.from && t.date <= st.cycle.to);
  }

  function header() {
    const u = st.data.user;
    return `
      <header class="mt-top">
        <div class="mt-brand">
          ${opts.logoUrl ? `<img src="${esc(opts.logoUrl)}" alt="">` : ''}
          <div><strong>หมุนตังค์</strong><span>${/^[CR]/.test(u.id) ? '👥 สมุดบัญชีกลุ่ม' : 'สวัสดี'} ${esc(u.name)}</span></div>
        </div>
        ${st.data.streak >= 1 ? `<div class="mt-streak" title="จดต่อเนื่อง">🔥 <b class="num">${st.data.streak}</b> วัน</div>` : ''}
      </header>`;
  }

  function monthSwitch() {
    const cur = cycleOf(todayStr(), st.cycle.startDay);
    return `
      <div class="mt-month">
        <button data-act="month" data-d="-1" aria-label="รอบก่อน">‹</button>
        <span>${st.cycle.label}</span>
        <button data-act="month" data-d="1" aria-label="รอบถัดไป" ${st.cycle.from >= cur.from ? 'disabled' : ''}>›</button>
      </div>`;
  }

  function dailyChart(s) {
    const dim = diffDays(st.cycle.from, st.cycle.to) + 1;
    const today = todayStr();
    const dates = Array.from({ length: dim }, (_, i) => addDays(st.cycle.from, i));
    const lastDay = today >= st.cycle.from && today <= st.cycle.to ? diffDays(st.cycle.from, today) + 1 : dim;
    const vals = dates.map((d) => s.byDay[d] || 0);
    const max = Math.max(...vals, 1);
    const nice = niceMax(max);
    const avg = vals.slice(0, lastDay).reduce((a, b) => a + b, 0) / Math.max(1, lastDay);
    const W = 340, H = 150, L = 34, R = 6, T = 12, B = 20;
    const bw = (W - L - R) / dim;
    const y = (v) => T + (H - T - B) * (1 - v / nice);
    const bars = vals
      .map((v, i) => {
        const x = L + i * bw + 1;
        const w = Math.max(2, bw - 2);
        const h = (H - T - B) * (v / nice);
        const date = dates[i];
        const future = i + 1 > lastDay;
        return `<g class="mt-bar${future ? ' is-future' : ''}" data-tip="${thaiDate(date, { year: false })} (${TH_DAYS[weekday(date)]}) · ${money(v)}">
          <rect x="${x - 1}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent"></rect>
          ${v > 0 ? `<path d="${roundTop(x, y(v), w, h)}" fill="var(--gold)"></path>` : ''}
        </g>`;
      })
      .join('');
    const ticks = [0, nice / 2, nice]
      .map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="mt-grid"></line><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="mt-axis">${short(v)}</text>`)
      .join('');
    const xl = [0, 7, 14, 21, dim - 1]
      .map((i) => `<text x="${L + (i + 0.5) * bw}" y="${H - 5}" text-anchor="middle" class="mt-axis">${Number(dates[i].slice(8, 10))}</text>`)
      .join('');
    const avgLine = avg > 0 ? `<line x1="${L}" x2="${W - R}" y1="${y(avg)}" y2="${y(avg)}" class="mt-avg"></line>` : '';
    return `
      <section class="mt-card">
        <div class="mt-card-h"><h3>รายจ่ายรายวัน</h3><span class="mt-sub">เฉลี่ย <b class="num">${money(Math.round(avg))}</b>/วัน</span></div>
        <div class="mt-chart">
          <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="กราฟรายจ่ายรายวัน ${st.cycle.label}">${ticks}${avgLine}${bars}${xl}</svg>
          <div class="mt-tip" hidden></div>
        </div>
      </section>`;
  }

  function catList(s, limit = 99) {
    if (!s.cats.length) return `<p class="mt-empty">ยังไม่มีรายจ่ายเดือนนี้</p>`;
    const max = s.cats[0].total;
    return `<ul class="mt-cats">${s.cats
      .slice(0, limit)
      .map((c) => {
        const k = cat(c.id);
        return `<li><button data-act="filtercat" data-id="${c.id}">
          <span class="mt-emoji">${k.emoji}</span>
          <span class="mt-cat-main"><span class="mt-cat-row"><span>${esc(k.name)}</span><span class="num">${money(c.total)}</span></span>
          <span class="mt-track"><span style="width:${Math.max(2, (c.total / max) * 100)}%"></span></span></span>
          <span class="mt-pct num">${Math.round(c.pct * 100)}%</span>
        </button></li>`;
      })
      .join('')}</ul>`;
  }

  function budgetCard() {
    const b = st.data.budget;
    if (st.cycle.from !== b.from) return '';
    if (!b.total)
      return `<section class="mt-card mt-cta"><div><h3>ยังไม่ได้ตั้งงบเดือนนี้</h3><p class="mt-sub">ตั้งงบแล้วบอทจะเตือนเมื่อใช้ถึง 80% และ 100%</p></div><button class="mt-btn" data-act="tab" data-tab="plan">ตั้งงบ</button></section>`;
    const state = b.pct >= 1 ? 'bad' : b.pct >= 0.8 ? 'warn' : 'good';
    const label = { bad: 'เกินงบ', warn: 'ใกล้เต็ม', good: 'อยู่ในงบ' }[state];
    return `
      <section class="mt-card">
        <div class="mt-card-h"><h3>งบเดือนนี้</h3><span class="mt-pill is-${state}">${label}</span></div>
        <div class="mt-budget-n"><span class="num">${money(b.spent)}</span><span class="mt-sub">/ ${money(b.total)}</span></div>
        <div class="mt-track is-lg is-${state}"><span style="width:${Math.min(100, Math.max(2, b.pct * 100))}%"></span></div>
        <p class="mt-sub">${b.remaining >= 0 ? `เหลือ <b class="num">${money(b.remaining)}</b> · ใช้ได้อีกวันละ ~<b class="num">${money(b.perDayLeft)}</b> (${b.daysLeft} วัน)` : `เกินงบไป <b class="num">${money(-b.remaining)}</b>`}</p>
      </section>`;
  }

  function txItem(t) {
    const k = cat(t.categoryId);
    const inc = t.type === 'income';
    return `<li><button class="mt-tx" data-act="edit" data-id="${t.id}">
      <span class="mt-emoji">${k.emoji}</span>
      <span class="mt-tx-main"><span class="mt-tx-note">${esc(t.note)}</span><span class="mt-sub">${esc(k.name)} · ${t.by ? `โดย ${esc(t.by)}` : esc(wallet(t.wallet).name)} · ${SOURCE_LABEL[t.source] || ''}${t.attachment ? ' · 📎' : ''}</span></span>
      <span class="num mt-amt ${inc ? 'is-inc' : ''}">${inc ? '+' : '-'}${money(t.amount)}</span>
    </button></li>`;
  }

  function homeView() {
    const txs = monthTxs();
    const s = summarize(txs);
    const recent = [...txs].sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1)).slice(0, 6);
    return `
      ${monthSwitch()}
      <section class="mt-hero">
        <span class="mt-eyebrow">คงเหลือสุทธิ</span>
        <div class="mt-hero-n num ${s.net < 0 ? 'is-neg' : ''}">${money(s.net, { sign: true })}</div>
        <div class="mt-hero-split">
          <div><span>รายรับ</span><b class="num is-inc">${money(s.income)}</b></div>
          <div><span>รายจ่าย</span><b class="num">${money(s.expense)}</b></div>
          <div><span>รายการ</span><b class="num">${s.count}</b></div>
        </div>
      </section>
      ${budgetCard()}
      ${dailyChart(s)}
      <section class="mt-card">
        <div class="mt-card-h"><h3>ใช้ไปกับอะไร</h3><span class="mt-sub">แตะเพื่อดูรายการ</span></div>
        ${catList(s, 6)}
      </section>
      <section class="mt-card">
        <div class="mt-card-h"><h3>ล่าสุด</h3><button class="mt-link" data-act="tab" data-tab="list">ดูทั้งหมด</button></div>
        ${recent.length ? `<ul class="mt-txs">${recent.map(txItem).join('')}</ul>` : '<p class="mt-empty">ยังไม่มีรายการ ลองพิมพ์ "ข้าว 50" ในแชท</p>'}
      </section>`;
  }

  function listView() {
    let txs = monthTxs();
    if (st.type !== 'all') txs = txs.filter((t) => t.type === st.type);
    if (st.cat) txs = txs.filter((t) => t.categoryId === st.cat);
    if (st.q) {
      const q = st.q.toLowerCase();
      txs = txs.filter((t) => t.note.toLowerCase().includes(q) || cat(t.categoryId).name.includes(q));
    }
    txs.sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1));
    const groups = {};
    for (const t of txs) (groups[t.date] ||= []).push(t);
    const s = summarize(txs);
    const chip = (v, l) => `<button class="mt-chip ${st.type === v ? 'is-on' : ''}" data-act="type" data-v="${v}">${l}</button>`;
    return `
      ${monthSwitch()}
      <div class="mt-filters">
        <input id="mt-search" type="search" placeholder="ค้นหา เช่น กาแฟ" value="${esc(st.q)}" autocomplete="off">
        <div class="mt-chips">${chip('all', 'ทั้งหมด')}${chip('expense', 'รายจ่าย')}${chip('income', 'รายรับ')}
          ${st.cat ? `<button class="mt-chip is-on" data-act="filtercat" data-id="">${cat(st.cat).emoji} ${esc(cat(st.cat).name)} ✕</button>` : ''}
        </div>
      </div>
      <p class="mt-sub mt-list-sum">${txs.length} รายการ · จ่าย <b class="num">${money(s.expense)}</b> · รับ <b class="num is-inc">${money(s.income)}</b></p>
      ${
        txs.length
          ? Object.entries(groups)
              .map(([d, list]) => {
                const dayExp = list.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
                return `<section class="mt-day"><h4><span>${TH_DAYS[weekday(d)]} ${thaiDate(d)}</span><span class="num">${dayExp ? `-${money(dayExp)}` : ''}</span></h4><ul class="mt-txs">${list.map(txItem).join('')}</ul></section>`;
              })
              .join('')
          : '<p class="mt-empty">ไม่พบรายการ</p>'
      }`;
  }

  function planView() {
    const d = st.data;
    const b = d.budget;
    const expenseCats = d.categories.filter((c) => c.type === 'expense');
    return `
      <section class="mt-card">
        <div class="mt-card-h"><h3>งบประมาณรายเดือน</h3>${b.total ? `<span class="mt-sub num">${Math.round((b.pct || 0) * 100)}% ใช้แล้ว</span>` : ''}</div>
        <form class="mt-form" data-form="budget">
          <label for="mt-budget-total">งบรวมต่อเดือน (บาท)</label>
          <input id="mt-budget-total" name="monthlyBudget" type="number" inputmode="numeric" min="0" step="100" value="${d.settings.monthlyBudget || ''}" placeholder="เช่น 15000">
          <details ${Object.keys(d.settings.catBudgets || {}).length ? 'open' : ''}>
            <summary>งบรายหมวด</summary>
            <div class="mt-catbudgets">
              ${expenseCats
                .map((c) => {
                  const cb = b.cats.find((x) => x.id === c.id);
                  return `<div class="mt-cb"><label for="mt-cb-${c.id}">${c.emoji} ${esc(c.name)}</label>
                    <input id="mt-cb-${c.id}" name="cat-${c.id}" type="number" inputmode="numeric" min="0" step="100" value="${d.settings.catBudgets?.[c.id] || ''}" placeholder="-">
                    ${cb ? `<div class="mt-track is-${cb.pct >= 1 ? 'bad' : cb.pct >= 0.8 ? 'warn' : 'good'}"><span style="width:${Math.min(100, Math.max(2, cb.pct * 100))}%"></span></div><span class="mt-sub num">${money(cb.spent)} / ${money(cb.limit)}</span>` : ''}
                  </div>`;
                })
                .join('')}
            </div>
          </details>
          <button class="mt-btn" type="submit">บันทึกงบ</button>
        </form>
      </section>

      <section class="mt-card">
        <div class="mt-card-h"><h3>เป้าหมายการออม</h3><button class="mt-link" data-act="newgoal">+ เพิ่มเป้าหมาย</button></div>
        ${
          d.goals.length
            ? `<ul class="mt-goals">${d.goals
                .map((g) => {
                  const p = g.saved / g.target;
                  return `<li>
                  <div class="mt-goal-h"><span class="mt-emoji">${esc(g.emoji)}</span><div><b>${esc(g.name)}</b><span class="mt-sub num">${money(g.saved)} / ${money(g.target)}</span></div><span class="num mt-goal-p">${Math.round(p * 100)}%</span></div>
                  <div class="mt-track is-lg ${p >= 1 ? 'is-good' : ''}"><span style="width:${Math.min(100, Math.max(2, p * 100))}%"></span></div>
                  <div class="mt-goal-a">
                    <button class="mt-chip" data-act="deposit" data-id="${g.id}" data-v="100">+100</button>
                    <button class="mt-chip" data-act="deposit" data-id="${g.id}" data-v="500">+500</button>
                    <button class="mt-chip" data-act="deposit" data-id="${g.id}" data-v="1000">+1,000</button>
                    <button class="mt-chip" data-act="depositcustom" data-id="${g.id}">ระบุเอง</button>
                    <button class="mt-chip is-ghost" data-act="delgoal" data-id="${g.id}">ลบ</button>
                  </div></li>`;
                })
                .join('')}</ul>`
            : '<p class="mt-empty">ยังไม่มีเป้าหมาย ลองสร้าง "เที่ยวญี่ปุ่น 50,000"</p>'
        }
      </section>

      <section class="mt-card">
        <div class="mt-card-h"><h3>รายการประจำ</h3><button class="mt-link" data-act="newrec">+ เพิ่ม</button></div>
        <p class="mt-sub">บันทึกให้อัตโนมัติทุกเดือน เช่น ค่าห้อง ค่าเน็ต เงินเดือน</p>
        ${
          d.recurring.length
            ? `<ul class="mt-txs">${d.recurring
                .map((r) => {
                  const k = cat(r.categoryId);
                  return `<li><div class="mt-tx"><span class="mt-emoji">${k.emoji}</span><span class="mt-tx-main"><span class="mt-tx-note">${esc(r.note)}</span><span class="mt-sub">ทุกวันที่ ${r.day} · ${esc(k.name)}</span></span>
                  <span class="num mt-amt ${r.type === 'income' ? 'is-inc' : ''}">${money(r.amount)}</span><button class="mt-x" data-act="delrec" data-id="${r.id}" aria-label="ลบ ${esc(r.note)}">✕</button></div></li>`;
                })
                .join('')}</ul>`
            : '<p class="mt-empty">ยังไม่มีรายการประจำ</p>'
        }
      </section>`;
  }

  function settingsView() {
    const s = st.data.settings;
    const cmd = [
      ['ข้าว 50', 'จดรายจ่าย'],
      ['กาแฟ 45 ขนม 30', 'หลายรายการในข้อความเดียว'],
      ['+เงินเดือน 25000', 'จดรายรับ'],
      ['เมื่อวาน แท็กซี่ 120', 'จดย้อนหลัง'],
      ['ส่งรูปสลิป', 'AI อ่านยอดให้'],
      ['ส่งข้อความเสียง', 'พูดแทนพิมพ์'],
      ['ส่งไฟล์ PDF Statement', 'นำเข้าทั้งเดือน'],
      ['ส่งรูปตามหลังรายการ', 'แนบเป็นหลักฐาน'],
      ['รอบบัญชี 25', 'เริ่มรอบวันเงินเดือนออก'],
      ['ตั้งค่า', 'ตั้งค่าเริ่มต้นใหม่'],
      ['เชิญบอทเข้ากลุ่ม', 'จดบัญชีร่วมกับครอบครัว'],
      ['สรุป / สรุปเดือนนี้', 'ดูสรุป'],
      ['งบ 15000', 'ตั้งงบทั้งเดือน'],
      ['งบ อาหาร 5000', 'ตั้งงบรายหมวด'],
      ['เป้า เที่ยวญี่ปุ่น 50000', 'สร้างเป้าหมาย'],
      ['ออม เที่ยวญี่ปุ่น 1000', 'หยอดกระปุก'],
      ['ประจำ ค่าเน็ต 599 ทุกวันที่ 5', 'รายการประจำ'],
      ['เตือน 21:00', 'เตือนจดทุกวัน'],
      ['หาร 900 3', 'หารบิล'],
      ['ลบ', 'ลบรายการล่าสุด'],
      ['ส่งออก', 'ดาวน์โหลด CSV'],
    ];
    return `
      <section class="mt-card">
        <h3>ตั้งค่า</h3>
        <form class="mt-form" data-form="settings">
          <label for="mt-name">ชื่อที่ให้บอทเรียก</label>
          <input id="mt-name" name="name" value="${esc(st.data.user.name)}" maxlength="40">
          <label for="mt-reminder">เตือนจดรายจ่ายทุกวัน</label>
          <div class="mt-row"><input id="mt-reminder" name="reminder" type="time" value="${s.reminder || ''}"><span class="mt-sub">${s.reminder ? 'เปิดอยู่' : 'ปิดอยู่ (เว้นว่าง = ไม่เตือน)'}</span></div>
          <label for="mt-cycle">รอบเดือนเริ่มวันที่ (เช่น วันเงินเดือนออก)</label>
          <select id="mt-cycle" name="cycleStartDay">${Array.from({ length: 31 }, (_, i) => i + 1)
            .map((d) => `<option value="${d}" ${(s.cycleStartDay || 1) === d ? 'selected' : ''}>วันที่ ${d}${d === 1 ? ' (ต้นเดือน)' : ''}</option>`)
            .join('')}</select>
          <label class="mt-check"><input type="checkbox" id="mt-report" name="monthlyReport" ${s.monthlyReport !== false ? 'checked' : ''}> ส่งรายงานสรุปให้ทุกวันแรกของรอบ 09:00 น.</label>
          <label for="mt-wallet">ช่องทางจ่ายเริ่มต้น</label>
          <select id="mt-wallet" name="defaultWallet">${st.data.wallets.map((w) => `<option value="${w.id}" ${s.defaultWallet === w.id ? 'selected' : ''}>${w.emoji} ${esc(w.name)}</option>`).join('')}</select>
          <button class="mt-btn" type="submit">บันทึกการตั้งค่า</button>
        </form>
      </section>
      <section class="mt-card">
        <div class="mt-card-h"><h3>ข้อมูลของฉัน</h3><span class="mt-sub num">${st.data.txs.length} รายการ</span></div>
        <button class="mt-btn is-ghost" data-act="export">ดาวน์โหลด CSV (เปิดด้วย Excel ได้)</button>
        ${backend.reset ? '<button class="mt-btn is-ghost" data-act="reset">รีเซ็ตข้อมูลเดโม</button>' : ''}
      </section>
      <section class="mt-card">
        <h3>คำสั่งในแชท LINE</h3>
        <dl class="mt-cmds">${cmd.map(([c, d]) => `<div><dt>${esc(c)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>
      </section>`;
  }

  function sheetView() {
    const sh = st.sheet;
    if (!sh) return '';
    let inner = '';
    if (sh.kind === 'tx') {
      const t = sh.tx || { type: 'expense', amount: '', categoryId: 'food', note: '', date: todayStr(), wallet: st.data.settings.defaultWallet };
      const type = sh.type || t.type;
      const cats = st.data.categories.filter((c) => c.type === type);
      const curCat = sh.cat || (cat(t.categoryId).type === type ? t.categoryId : cats[0].id);
      inner = `
        <form class="mt-form" data-form="tx">
          <div class="mt-seg">
            <button type="button" class="${type === 'expense' ? 'is-on' : ''}" data-act="sheettype" data-v="expense">รายจ่าย</button>
            <button type="button" class="${type === 'income' ? 'is-on' : ''}" data-act="sheettype" data-v="income">รายรับ</button>
          </div>
          <label for="mt-amount" class="mt-vh">จำนวนเงิน</label>
          <div class="mt-amount"><span>฿</span><input id="mt-amount" name="amount" type="number" inputmode="decimal" step="0.01" min="0" required value="${sh.amount ?? t.amount}" placeholder="0"></div>
          <label for="mt-note">รายการ</label>
          <input id="mt-note" name="note" value="${esc(sh.note ?? t.note)}" placeholder="เช่น ข้าวมันไก่" maxlength="120">
          <span class="mt-label">หมวด</span>
          <div class="mt-catgrid">${cats.map((c) => `<button type="button" class="${c.id === curCat ? 'is-on' : ''}" data-act="sheetcat" data-v="${c.id}"><span>${c.emoji}</span>${esc(c.name)}</button>`).join('')}</div>
          <input type="hidden" name="categoryId" value="${curCat}">
          <input type="hidden" name="type" value="${type}">
          <div class="mt-row2">
            <div><label for="mt-date">วันที่</label><input id="mt-date" name="date" type="date" value="${sh.date ?? t.date}" max="${todayStr()}"></div>
            <div><label for="mt-txwallet">ช่องทาง</label><select id="mt-txwallet" name="wallet">${st.data.wallets.map((w) => `<option value="${w.id}" ${(sh.wallet ?? t.wallet) === w.id ? 'selected' : ''}>${w.emoji} ${esc(w.name)}</option>`).join('')}</select></div>
          </div>
          ${sh.tx?.by ? `<p class="mt-sub">จดโดย ${esc(sh.tx.by)}</p>` : ''}
          ${sh.tx?.attachment && backend.fileUrl ? `<a class="mt-attach" href="${esc(backend.fileUrl(sh.tx.attachment))}" target="_blank" rel="noopener"><img src="${esc(backend.fileUrl(sh.tx.attachment))}" alt="รูปหลักฐานของรายการนี้" loading="lazy"><span>📎 หลักฐาน · แตะเพื่อดูเต็ม</span></a>` : ''}
          <button class="mt-btn" type="submit">${sh.tx ? 'บันทึกการแก้ไข' : 'บันทึก'}</button>
          ${sh.tx ? (sh.confirmDel ? `<button class="mt-btn is-danger" type="button" data-act="deltx" data-id="${sh.tx.id}">ยืนยันลบรายการนี้</button>` : `<button class="mt-btn is-ghost" type="button" data-act="askdel">ลบรายการ</button>`) : ''}
        </form>`;
    } else if (sh.kind === 'goal') {
      inner = `<form class="mt-form" data-form="goal">
        <label for="mt-goal-name">ชื่อเป้าหมาย</label><input id="mt-goal-name" name="name" required placeholder="เช่น เที่ยวญี่ปุ่น" maxlength="40">
        <label for="mt-goal-target">ยอดเป้าหมาย (บาท)</label><input id="mt-goal-target" name="target" type="number" inputmode="numeric" min="1" required placeholder="50000">
        <label for="mt-goal-emoji">ไอคอน</label><select id="mt-goal-emoji" name="emoji">${['🎯', '🗾', '✈️', '🏠', '🚗', '💍', '🛟', '📱', '🎓'].map((e) => `<option>${e}</option>`).join('')}</select>
        <button class="mt-btn" type="submit">สร้างเป้าหมาย</button></form>`;
    } else if (sh.kind === 'deposit') {
      inner = `<form class="mt-form" data-form="deposit"><input type="hidden" name="id" value="${sh.id}">
        <label for="mt-dep">จำนวนเงิน (ใส่ลบเพื่อถอน)</label><input id="mt-dep" name="amount" type="number" inputmode="decimal" step="0.01" required placeholder="1000">
        <button class="mt-btn" type="submit">หยอดกระปุก</button></form>`;
    } else if (sh.kind === 'rec') {
      inner = `<form class="mt-form" data-form="rec">
        <div class="mt-seg"><label><input type="radio" name="type" value="expense" checked> รายจ่าย</label><label><input type="radio" name="type" value="income"> รายรับ</label></div>
        <label for="mt-rec-note">รายการ</label><input id="mt-rec-note" name="note" required placeholder="เช่น ค่าเน็ต" maxlength="60">
        <div class="mt-row2"><div><label for="mt-rec-amount">จำนวนเงิน</label><input id="mt-rec-amount" name="amount" type="number" inputmode="decimal" min="1" required placeholder="599"></div>
        <div><label for="mt-rec-day">ทุกวันที่</label><input id="mt-rec-day" name="day" type="number" min="1" max="31" required value="1"></div></div>
        <label for="mt-rec-cat">หมวด</label><select id="mt-rec-cat" name="categoryId">${st.data.categories.map((c) => `<option value="${c.id}">${c.emoji} ${esc(c.name)} (${c.type === 'income' ? 'รับ' : 'จ่าย'})</option>`).join('')}</select>
        <button class="mt-btn" type="submit">เพิ่มรายการประจำ</button></form>`;
    }
    else if (sh.kind === 'csv') {
      inner = `<p class="mt-sub">ในเดโมนี้ดาวน์โหลดไฟล์ไม่ได้ คัดลอกข้อความด้านล่างไปวางใน Excel หรือ Google Sheets แทนได้ (ตัวจริงบนเซิร์ฟเวอร์ดาวน์โหลดเป็นไฟล์ .csv)</p>
        <textarea id="mt-csv" class="mt-csv" readonly rows="10">${esc(sh.csv.replace(/^\uFEFF/, ''))}</textarea>
        <button class="mt-btn" type="button" data-act="copycsv">คัดลอกทั้งหมด</button>`;
    }
    const titles = { csv: 'ส่งออกข้อมูล (CSV)', tx: sh.tx ? 'แก้ไขรายการ' : 'เพิ่มรายการ', goal: 'เป้าหมายใหม่', deposit: 'หยอดกระปุก', rec: 'รายการประจำใหม่' };
    return `<div class="mt-scrim" data-act="close"></div>
      <div class="mt-sheet" role="dialog" aria-modal="true" aria-label="${titles[sh.kind]}">
        <div class="mt-sheet-h"><h3>${titles[sh.kind]}</h3><button class="mt-x" data-act="close" aria-label="ปิด">✕</button></div>${inner}</div>`;
  }

  function nav() {
    const item = (tab, icon, label) => `<button class="${st.tab === tab ? 'is-on' : ''}" data-act="tab" data-tab="${tab}" aria-label="${label}"><span aria-hidden="true">${icon}</span>${label}</button>`;
    return `<nav class="mt-nav">
      ${item('home', '◉', 'ภาพรวม')}${item('list', '☰', 'รายการ')}
      <button class="mt-fab" data-act="add" aria-label="เพิ่มรายการ">+</button>
      ${item('plan', '◎', 'งบ & เป้า')}${item('settings', '⚙', 'ตั้งค่า')}
    </nav>`;
  }

  function render() {
    if (st.error && !st.data) {
      root.innerHTML = `<div class="mt-loading"><p>${esc(st.error)}</p></div>`;
      return;
    }
    if (!st.data) return;
    const searchFocused = document.activeElement?.id === 'mt-search';
    const scroller = root.querySelector('.mt-main');
    const scrollTop = scroller?.scrollTop || 0;
    const views = { home: homeView, list: listView, plan: planView, settings: settingsView };
    root.innerHTML = `${header()}<main class="mt-main">${views[st.tab]()}</main>${nav()}${sheetView()}${st.toast ? `<div class="mt-toast" role="status">${esc(st.toast)}</div>` : ''}`;
    const main = root.querySelector('.mt-main');
    if (main && root.dataset.tab === st.tab) main.scrollTop = scrollTop;
    root.dataset.tab = st.tab;
    if (searchFocused) {
      const s = root.querySelector('#mt-search');
      s.focus();
      s.setSelectionRange(s.value.length, s.value.length);
    }
  }

  // ---------------- events ----------------
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !root.contains(b)) return;
    const a = b.dataset.act;
    const sh = st.sheet;
    const keepForm = () => {
      // เก็บค่าที่พิมพ์ไว้ก่อน re-render ชีต
      const f = root.querySelector('form[data-form="tx"]');
      if (!f) return;
      const fd = new FormData(f);
      Object.assign(sh, { amount: fd.get('amount'), note: fd.get('note'), date: fd.get('date'), wallet: fd.get('wallet') });
    };
    switch (a) {
      case 'tab':
        st.tab = b.dataset.tab;
        st.sheet = null;
        render();
        root.querySelector('.mt-main')?.scrollTo(0, 0);
        break;
      case 'month':
        st.cycle = { ...shiftCycle(st.cycle, Number(b.dataset.d), st.cycle.startDay), startDay: st.cycle.startDay };
        render();
        break;
      case 'filtercat':
        st.cat = b.dataset.id;
        st.tab = 'list';
        render();
        break;
      case 'type':
        st.type = b.dataset.v;
        render();
        break;
      case 'add':
        st.sheet = { kind: 'tx' };
        render();
        root.querySelector('#mt-amount')?.focus();
        break;
      case 'edit':
        st.sheet = { kind: 'tx', tx: st.data.txs.find((t) => t.id === b.dataset.id) };
        render();
        break;
      case 'sheettype':
        keepForm();
        sh.type = b.dataset.v;
        sh.cat = null;
        render();
        break;
      case 'sheetcat':
        keepForm();
        sh.cat = b.dataset.v;
        render();
        break;
      case 'askdel':
        keepForm();
        sh.confirmDel = true;
        render();
        break;
      case 'deltx':
        act(() => backend.deleteTx(b.dataset.id), 'ลบรายการแล้ว');
        break;
      case 'close':
        st.sheet = null;
        render();
        break;
      case 'newgoal':
        st.sheet = { kind: 'goal' };
        render();
        break;
      case 'newrec':
        st.sheet = { kind: 'rec' };
        render();
        break;
      case 'deposit':
        act(() => backend.deposit(b.dataset.id, Number(b.dataset.v)), `หยอดกระปุก ${money(Number(b.dataset.v))} แล้ว`);
        break;
      case 'depositcustom':
        st.sheet = { kind: 'deposit', id: b.dataset.id };
        render();
        break;
      case 'delgoal':
        if (b.dataset.confirm) act(() => backend.deleteGoal(b.dataset.id), 'ลบเป้าหมายแล้ว');
        else {
          b.dataset.confirm = '1';
          b.textContent = 'ยืนยันลบ?';
          b.classList.add('is-danger');
        }
        break;
      case 'delrec':
        act(() => backend.deleteRecurring(b.dataset.id), 'ลบรายการประจำแล้ว');
        break;
      case 'export': {
        if (backend.exportCSV) {
          st.sheet = { kind: 'csv', csv: await backend.exportCSV() };
          render();
          break;
        }
        const url = await backend.exportUrl();
        const link = document.createElement('a');
        link.href = url;
        link.download = `muntang-${todayStr()}.csv`;
        link.target = '_blank';
        link.rel = 'noopener';
        document.body.append(link);
        link.click();
        link.remove();
        toast('เริ่มดาวน์โหลดไฟล์แล้ว');
        break;
      }
      case 'copycsv': {
        const ta = root.querySelector('#mt-csv');
        try {
          await navigator.clipboard.writeText(ta.value);
          toast('คัดลอกแล้ว');
        } catch {
          ta.select();
          toast('เลือกข้อความแล้ว กดคัดลอกได้เลย');
        }
        break;
      }
      case 'reset':
        if (b.dataset.confirm) act(() => backend.reset(), 'รีเซ็ตข้อมูลเดโมแล้ว');
        else {
          b.dataset.confirm = '1';
          b.textContent = 'แตะอีกครั้งเพื่อยืนยันรีเซ็ต';
        }
        break;
    }
  });

  root.addEventListener('input', (e) => {
    if (e.target.id === 'mt-search') {
      st.q = e.target.value;
      render();
    }
  });

  root.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const fd = Object.fromEntries(new FormData(f));
    switch (f.dataset.form) {
      case 'tx': {
        const body = { ...fd, amount: Number(fd.amount) };
        if (st.sheet.tx) act(() => backend.updateTx(st.sheet.tx.id, body), 'บันทึกการแก้ไขแล้ว');
        else act(() => backend.addTx(body), `บันทึก ${money(body.amount)} แล้ว`);
        break;
      }
      case 'budget': {
        const catBudgets = {};
        for (const [k, v] of Object.entries(fd)) if (k.startsWith('cat-') && Number(v) > 0) catBudgets[k.slice(4)] = Number(v);
        act(() => backend.saveSettings({ monthlyBudget: Number(fd.monthlyBudget) || 0, catBudgets }), 'บันทึกงบแล้ว');
        break;
      }
      case 'settings':
        act(
          () =>
            backend.saveSettings({
              name: fd.name,
              reminder: fd.reminder || null,
              defaultWallet: fd.defaultWallet,
              cycleStartDay: Number(fd.cycleStartDay),
              monthlyReport: fd.monthlyReport === 'on',
            }),
          'บันทึกการตั้งค่าแล้ว'
        );
        break;
      case 'goal':
        act(() => backend.addGoal({ name: fd.name, target: Number(fd.target), emoji: fd.emoji }), 'สร้างเป้าหมายแล้ว');
        break;
      case 'deposit':
        act(() => backend.deposit(fd.id, Number(fd.amount)), 'อัปเดตกระปุกแล้ว');
        break;
      case 'rec':
        act(() => backend.addRecurring({ ...fd, amount: Number(fd.amount), day: Number(fd.day) }), 'เพิ่มรายการประจำแล้ว');
        break;
    }
  });

  // tooltip กราฟ
  root.addEventListener('pointerover', (e) => {
    const g = e.target.closest?.('.mt-bar');
    const tip = root.querySelector('.mt-tip');
    if (!tip) return;
    if (!g) {
      tip.hidden = true;
      return;
    }
    tip.textContent = g.dataset.tip;
    tip.hidden = false;
    const chart = tip.parentElement.getBoundingClientRect();
    const r = g.getBoundingClientRect();
    const x = Math.min(chart.width - 90, Math.max(90, r.left - chart.left + r.width / 2));
    tip.style.left = `${x}px`;
  });
  root.addEventListener('pointerleave', () => {
    const tip = root.querySelector('.mt-tip');
    if (tip) tip.hidden = true;
  });

  return {
    refresh,
    show(tab) {
      st.tab = tab;
      render();
    },
  };
}

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
function short(v) {
  return v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(Math.round(v));
}
// แท่งกราฟมุมบนโค้ง 4px ฐานตรง
function roundTop(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
