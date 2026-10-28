// แดชบอร์ดหมุนตังค์ (LIFF): สรุป · กระเป๋า · ข้อมูลเชิงลึก · งบ · รายการ (ปฏิทิน/สลิป) · เมนู
// mountDashboard(root, backend, { logoUrl, moods, view, edit, acct })
import { money } from '../core/format.js';
import { todayStr, thaiDate, TH_DAYS, TH_MONTHS, weekday, cycleOf, shiftCycle, diffDays, addDays } from '../core/dates.js';
import { summarize } from '../core/ops.js';
import { moodFor } from '../core/mood.js';
import { badgeSvg } from '../core/accounts.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const SOURCE_LABEL = { chat: 'แชท', slip: 'สลิป', app: 'แอป', ai: 'AI', recurring: 'ประจำ', pdf: 'PDF' };
const TABS = ['home', 'analysis', 'budget', 'list', 'settings', 'wallets', 'report'];
const DAY_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

// ไอคอนเส้นแบบแอปป้านวล
const ICON = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  analysis: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  report: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M14 3.2A9 9 0 0 1 20.8 10H14z"/>',
  wallets: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="3" y="8" width="18" height="12" rx="2.5"/><path d="M16 14h2"/>',
  budget: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M14 3.2A9 9 0 0 1 20.8 10H14z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
};
const icon = (name, cls = '') => `<svg class="mt-ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

export function mountDashboard(root, backend, opts = {}) {
  const st = {
    data: null,
    tab: TABS.includes(opts.view) ? opts.view : 'home',
    cycle: null, // รอบบัญชีที่กำลังดู { from, to, label, startDay }
    q: '',
    type: 'all',
    cat: '',
    side: 'expense', // หน้า หมวด/งบ: รายจ่าย | รายรับ
    more: false, // ดูเพิ่มในหน้าสรุป
    sheet: null,
    toast: '',
    error: '',
    pendingEdit: opts.edit || null,
    pendingAcct: opts.acct || null,
    wallet: '', // กรองรายการตามบัญชี
    listMode: 'list', // รายการ | ปฏิทิน | สลิป
    rp: { period: 'cycle', offset: 0, tab: 'overview', chart: 'donut', show: { income: true, expense: true, transfer: true, debt: false } }, // หน้ารายงาน
    day: '', // วันที่เลือกในปฏิทิน
  };

  root.classList.add('mt-app');
  root.innerHTML = `<div class="mt-loading"><img src="${esc(opts.logoUrl || '')}" alt=""><span>กำลังหมุน...</span></div>`;

  // รูปนายหัวหมุนตามอารมณ์ (ถ้าไม่มีรูป ใช้โลโก้แทน)
  const moodImg = (level) => opts.moods?.[level] || opts.logoUrl || '';
  const cat = (id) => st.data.categories.find((c) => c.id === id) || st.data.categories.find((c) => c.id === 'other');
  const wallet = (id) => st.data.wallets.find((w) => w.id === id) || st.data.wallets[0];
  const acctById = (id) => st.data.accounts.find((a) => a.id === id);
  const activeAccts = () => st.data.accounts.filter((a) => !a.archived);
  // ตัวเลือกบัญชีในฟอร์ม (บัญชีที่ซ่อนแล้วแสดงเฉพาะถ้ารายการนั้นใช้อยู่)
  const walletOptions = (cur) =>
    st.data.accounts
      .filter((a) => (!a.archived && ['cash', 'bank', 'ewallet', 'card'].includes(a.type)) || a.id === cur)
      .map((a) => `<option value="${a.id}" ${a.id === cur ? 'selected' : ''}>${a.emoji} ${esc(a.name)}</option>`)
      .join('');
  const isCurrentCycle = () => st.cycle.from === st.data.budget.from;

  async function refresh() {
    try {
      st.data = await backend.state();
      st.error = '';
      const startDay = st.data.settings.cycleStartDay || 1;
      if (!st.cycle || st.cycle.startDay !== startDay) st.cycle = { ...cycleOf(todayStr(), startDay), startDay };
      if (st.pendingEdit) {
        const tx = st.data.txs.find((t) => t.id === st.pendingEdit);
        if (tx) st.sheet = { kind: 'tx', tx };
        st.pendingEdit = null;
      }
      if (st.pendingAcct) {
        if (acctById(st.pendingAcct)) st.sheet = { kind: 'acct', id: st.pendingAcct };
        st.pendingAcct = null;
      }
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

  /** เหรียญทองเด้งขึ้นตอนบันทึก */
  function coinBurst() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const wrap = document.createElement('div');
    wrap.className = 'mt-coins';
    for (let i = 0; i < 9; i++) {
      const c = document.createElement('i');
      c.style.setProperty('--x', `${Math.round((Math.random() - 0.5) * 220)}px`);
      c.style.setProperty('--y', `${-Math.round(140 + Math.random() * 220)}px`);
      c.style.animationDelay = `${i * 40}ms`;
      wrap.append(c);
    }
    root.append(wrap);
    setTimeout(() => wrap.remove(), 1400);
  }

  async function act(fn, msg) {
    try {
      await fn();
      st.sheet = null;
      await refresh();
      if (msg) toast(msg);
      return true;
    } catch (e) {
      toast(`ทำรายการไม่สำเร็จ: ${e.message}`);
      return false;
    }
  }

  // ---------------- helpers ----------------
  function cycleTxs(cycle = st.cycle) {
    return st.data.txs.filter((t) => t.date >= cycle.from && t.date <= cycle.to);
  }
  const byNewest = (a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1);

  function cycleSwitch() {
    const cur = cycleOf(todayStr(), st.cycle.startDay);
    return `
      <div class="mt-range">
        <button data-act="month" data-d="-1" aria-label="รอบก่อน">‹</button>
        <span class="num">${st.cycle.label}</span>
        <button data-act="month" data-d="1" aria-label="รอบถัดไป" ${st.cycle.from >= cur.from ? 'disabled' : ''}>›</button>
      </div>`;
  }

  function bar(p, color = 'var(--gold)', cls = '') {
    return `<span class="mt-bar-t ${cls}"><span style="width:${Math.min(100, Math.max(2, (p || 0) * 100))}%;background:${color}"></span></span>`;
  }
  const budgetTone = (p) => (p >= 1 ? 'var(--red)' : p >= 0.8 ? 'var(--amber)' : 'var(--gold)');

  function txItem(t) {
    const k = cat(t.categoryId);
    const inc = t.type === 'income';
    return `<li><button class="mt-tx" data-act="edit" data-id="${t.id}">
      <span class="mt-dot" style="background:${k.color}"></span>
      <span class="mt-tx-main"><span class="mt-tx-note">${t.attachment ? '📎 ' : ''}${esc(t.note)}</span><span class="mt-sub">${esc(k.name)} · ${t.by ? `โดย ${esc(t.by)}` : `${wallet(t.wallet).emoji} ${esc(wallet(t.wallet).name)}`} · ${SOURCE_LABEL[t.source] || ''}</span></span>
      <span class="num mt-amt ${inc ? 'is-inc' : ''}">${inc ? '+' : ''}${money(t.amount)}</span>
    </button></li>`;
  }

  // ---------------- สรุป ----------------
  function profileCard() {
    const u = st.data.user;
    const tier = st.data.tier;
    const avatar = u.pictureUrl || opts.logoUrl;
    return `
      <section class="mt-card mt-profile">
        ${avatar ? `<img src="${esc(avatar)}" alt="">` : ''}
        <div class="mt-profile-main">
          <b>${esc(u.name)}</b>
          <span class="mt-sub">${/^[CR]/.test(u.id) ? '👥 สมุดบัญชีกลุ่ม' : 'สมาชิกหมุนตังค์'}</span>
        </div>
        <span class="mt-tier" title="ระดับการจดต่อเนื่อง">${tier.emoji} ${esc(tier.name)}</span>
      </section>`;
  }

  /** โดนัทสัดส่วนรายจ่าย: 5 หมวดแรก + อื่นๆ */
  function donut(s) {
    const top = s.cats.slice(0, 5);
    const rest = s.cats.slice(5).reduce((a, c) => a + c.total, 0);
    const parts = top.map((c) => ({ v: c.total, color: cat(c.id).color, label: cat(c.id).name }));
    if (rest > 0) parts.push({ v: rest, color: 'var(--faint)', label: 'อื่นๆ' });
    return donutParts(parts, 'รายจ่าย', short(s.expense), 'สัดส่วนรายจ่ายตามหมวด');
  }

  /** โดนัททั่วไป: parts = [{ v, color, label }] */
  function donutParts(parts, centerLabel, centerValue, aria, big = false) {
    parts = parts.filter((p) => p.v > 0);
    const total = parts.reduce((a, p) => a + p.v, 0);
    const R = 52, r = 34, cx = 64, cy = 64;
    let a0 = -Math.PI / 2;
    const gap = parts.length > 1 ? 0.025 : 0;
    const arcs = total
      ? parts
          .map((p) => {
            const a1 = a0 + (p.v / total) * Math.PI * 2;
            const s0 = a0 + gap / 2, s1 = Math.max(s0 + 0.001, a1 - gap / 2);
            const large = s1 - s0 > Math.PI ? 1 : 0;
            const pt = (rad, ang) => `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`;
            a0 = a1;
            if (parts.length === 1) return `<circle cx="${cx}" cy="${cy}" r="${(R + r) / 2}" fill="none" stroke="${p.color}" stroke-width="${R - r}"><title>${esc(p.label)} ${money(p.v)}</title></circle>`;
            return `<path d="M${pt(R, s0)}A${R},${R} 0 ${large} 1 ${pt(R, s1)}L${pt(r, s1)}A${r},${r} 0 ${large} 0 ${pt(r, s0)}Z" fill="${p.color}"><title>${esc(p.label)} ${money(p.v)} (${Math.round((p.v / total) * 100)}%)</title></path>`;
          })
          .join('')
      : `<circle cx="${cx}" cy="${cy}" r="${(R + r) / 2}" fill="none" stroke="var(--track)" stroke-width="${R - r}"></circle>`;
    return `<svg class="mt-donut ${big ? 'is-big' : ''}" viewBox="0 0 128 128" role="img" aria-label="${esc(aria)}">${arcs}
      <text x="64" y="60" text-anchor="middle" class="mt-donut-l">${esc(centerLabel)}</text>
      <text x="64" y="78" text-anchor="middle" class="mt-donut-v">${esc(centerValue)}</text></svg>`;
  }

  function homeView() {
    const txs = cycleTxs();
    const s = summarize(txs);
    const b = st.data.budget;
    const cur = isCurrentCycle();
    const recent = [...txs].sort(byNewest).slice(0, 5);
    const m = moodFor(b);
    const budgetSub = cur && b.total ? (b.remaining >= 0 ? `เหลือ ${money(b.remaining)} จากงบ` : `เกิน ${money(-b.remaining)} จากงบ`) : '';
    const stats = [
      ['จดติดต่อมา', `🔥 ${st.data.streak} วัน`],
      ['จำนวนรายการ', `${s.count}`],
      ['งบที่ตั้งไว้', b.total ? money(b.total) : '-'],
      ['งบคงเหลือ', cur && b.total ? money(b.remaining) : '-', cur && b.remaining < 0 ? 'is-bad' : ''],
      ['รอบงบ', `รายเดือน (วันที่ ${st.cycle.startDay})`],
    ];
    return `
      ${profileCard()}
      <div class="mt-row-h"><h2>สรุป</h2>${cycleSwitch()}</div>
      <section class="mt-card mt-summary">
        <div class="mt-keep"><span>เหลือเก็บ</span><span class="mt-chip-s">${cur ? 'รอบงบนี้' : 'รอบที่เลือก'}</span></div>
        <div class="mt-keep-n num ${s.net < 0 ? 'is-neg' : ''}">${money(s.net)}</div>
        <div class="mt-tiles">
          <div class="mt-tile is-exp ${cur && b.total && b.remaining < 0 ? 'is-over' : ''}">
            <span>รายจ่าย</span><b class="num">${money(s.expense)}</b>
            ${budgetSub ? `<small>${budgetSub}</small>${bar(b.pct, budgetTone(b.pct))}` : ''}
          </div>
          <div class="mt-tile is-inc"><span>รายรับ</span><b class="num">${money(s.income)}</b></div>
        </div>
        <div class="mt-donut-row">
          ${donut(s)}
          <dl class="mt-stats">${stats.map(([k, v, cls]) => `<div><dt>${k}</dt><dd class="num ${cls || ''}">${esc(v)}</dd></div>`).join('')}</dl>
        </div>
        ${
          st.more
            ? `<ul class="mt-legend">${s.cats
                .map((c) => `<li><button data-act="filtercat" data-id="${c.id}"><span class="mt-dot" style="background:${cat(c.id).color}"></span><span>${cat(c.id).emoji} ${esc(cat(c.id).name)}</span><span class="mt-sub num">${Math.round(c.pct * 100)}%</span><b class="num">${money(c.total)}</b></button></li>`)
                .join('') || '<li class="mt-empty">ยังไม่มีรายจ่าย</li>'}</ul>`
            : ''
        }
        <button class="mt-more" data-act="more">${st.more ? 'ย่อ ⌃' : 'ดูเพิ่ม ⌄'}</button>
      </section>
      ${walletStrip()}
      ${
        cur
          ? `<section class="mt-says" data-level="${m.level}">
              ${moodImg(m.level) ? `<img src="${esc(moodImg(m.level))}" alt="">` : ''}
              <div><b>${esc(m.title)} ${m.face}</b><span>${esc(m.line)}</span></div>
            </section>`
          : ''
      }
      <section class="mt-card">
        <div class="mt-card-h"><h3>ล่าสุด</h3><button class="mt-link" data-act="tab" data-tab="list">ดูทั้งหมด</button></div>
        ${recent.length ? `<ul class="mt-txs">${recent.map(txItem).join('')}</ul>` : '<p class="mt-empty">ยังไม่มีรายการ ลองพิมพ์ "ข้าว 50" ในแชท</p>'}
        <button class="mt-btn" data-act="add">+ จดรายการ</button>
      </section>`;
  }

  // ---------------- วิเคราะห์ ----------------
  function dailyChart(s) {
    const dim = diffDays(st.cycle.from, st.cycle.to) + 1;
    const today = todayStr();
    const dates = Array.from({ length: dim }, (_, i) => addDays(st.cycle.from, i));
    const lastDay = today >= st.cycle.from && today <= st.cycle.to ? diffDays(st.cycle.from, today) + 1 : dim;
    const vals = dates.map((d) => s.byDay[d] || 0);
    const nice = niceMax(Math.max(...vals, 1));
    const avg = vals.slice(0, lastDay).reduce((a, b) => a + b, 0) / Math.max(1, lastDay);
    const W = 340, H = 150, L = 34, R = 6, T = 12, B = 20;
    const bw = (W - L - R) / dim;
    const y = (v) => T + (H - T - B) * (1 - v / nice);
    const bars = vals
      .map((v, i) => {
        const x = L + i * bw + 1;
        const w = Math.max(2, bw - 2);
        const h = (H - T - B) * (v / nice);
        return `<g class="mt-bar${i + 1 > lastDay ? ' is-future' : ''}" data-tip="${thaiDate(dates[i], { year: false })} (${TH_DAYS[weekday(dates[i])]}) · ${money(v)}">
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
    return { avg, svg: `<div class="mt-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="กราฟรายจ่ายรายวัน ${st.cycle.label}">${ticks}${avgLine}${bars}${xl}</svg><div class="mt-tip" hidden></div></div>` };
  }

  // ---------------- ข้อมูลเชิงลึก ----------------
  /** วงแหวนคะแนน 0-100 */
  function gauge(score, color) {
    const R = 44;
    const C = 2 * Math.PI * R;
    return `<svg class="mt-gauge" viewBox="0 0 110 110" role="img" aria-label="คะแนน ${score} จาก 100">
      <circle cx="55" cy="55" r="${R}" fill="none" stroke="var(--track)" stroke-width="10"/>
      <circle cx="55" cy="55" r="${R}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(C * score) / 100} ${C}" transform="rotate(-90 55 55)"/>
      <text x="55" y="52" text-anchor="middle" class="mt-gauge-v">${score}</text><text x="55" y="72" text-anchor="middle" class="mt-gauge-l">/ 100</text></svg>`;
  }
  const gradeColor = (g) => ({ A: 'var(--green)', B: 'var(--green)', C: 'var(--amber)', D: 'var(--amber)', F: 'var(--red)' })[g];

  /** เดือน (YYYY-MM) ย้อนหลัง n เดือนจาก month */
  const monthsBack = (month, n) =>
    Array.from({ length: n }, (_, i) => {
      const [y, m] = month.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1)).toISOString().slice(0, 7);
    });

  /** แท่งคู่รายรับ-รายจ่าย: buckets = [{ label, tip, inc, exp }] */
  function barsChart(buckets, aria) {
    const n = buckets.length;
    const max = niceMax(Math.max(1, ...buckets.map((b) => Math.max(b.inc, b.exp))));
    const W = 340, H = 150, L = 34, B = 20, T = 8;
    const cw = (W - L) / n;
    const y = (v) => T + (H - T - B) * (1 - v / max);
    const every = Math.ceil(n / 12);
    const bars = buckets
      .map((v, i) => {
        const bw = Math.max(1.5, cw * 0.36);
        const x = L + i * cw + (cw - bw * 2 - 1) / 2;
        return `<g class="mt-bar" data-tip="${esc(v.tip)} · รับ ${money(v.inc)} · จ่าย ${money(v.exp)}">
          <rect x="${L + i * cw}" y="${T}" width="${cw}" height="${H - T - B}" fill="transparent"/>
          ${v.inc ? `<path d="${roundTop(x, y(v.inc), bw, H - B - y(v.inc))}" fill="var(--green)"/>` : ''}
          ${v.exp ? `<path d="${roundTop(x + bw + 1, y(v.exp), bw, H - B - y(v.exp))}" fill="var(--gold)"/>` : ''}
          ${i % every === 0 ? `<text x="${L + i * cw + cw / 2}" y="${H - 5}" text-anchor="middle" class="mt-axis">${esc(v.label)}</text>` : ''}</g>`;
      })
      .join('');
    const grid = [0, 0.5, 1].map((f) => `<line x1="${L}" x2="${W}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="var(--border)"/><text x="${L - 4}" y="${y(max * f) + 3}" text-anchor="end" class="mt-axis">${short(max * f)}</text>`).join('');
    return `<div class="mt-chart"><svg viewBox="0 0 ${W} ${H}" class="mt-svg" role="img" aria-label="${esc(aria)}">${grid}${bars}</svg><div class="mt-tip" hidden></div></div>
      <div class="mt-legend-i"><span><i style="background:var(--green)"></i>รายรับ</span><span><i style="background:var(--gold)"></i>รายจ่าย</span></div>`;
  }

  /** รายรับ-รายจ่าย 12 เดือนล่าสุด */
  function yearChart() {
    const months = monthsBack(todayStr().slice(0, 7), 12);
    const sums = Object.fromEntries(months.map((k) => [k, { inc: 0, exp: 0 }]));
    for (const t of st.data.txs) {
      const k = t.date.slice(0, 7);
      if (sums[k]) sums[k][t.type === 'income' ? 'inc' : 'exp'] += t.amount;
    }
    return barsChart(
      months.map((k) => ({ ...sums[k], label: TH_MONTHS[Number(k.slice(5)) - 1].replace('.', '').slice(0, 3), tip: thaiMonthOf(k) })),
      'รายรับรายจ่าย 12 เดือน'
    );
  }
  const thaiMonthOf = (k) => `${TH_MONTHS[Number(k.slice(5)) - 1]} ${String(Number(k.slice(0, 4)) + 543).slice(2)}`;

  // ---------------- รายงาน ----------------
  const PERIODS = [
    ['all', 'ทั้งหมด'],
    ['day', 'วัน'],
    ['week', 'สัปดาห์'],
    ['cycle', 'เดือน'],
    ['quarter', 'ไตรมาส'],
    ['year', 'ปี'],
  ];

  /** ช่วงเวลาของรายงาน (offset = เลื่อนย้อน/ไปข้างหน้า) */
  function periodRange(period, offset) {
    const today = todayStr();
    const startDay = st.data.settings.cycleStartDay || 1;
    if (period === 'day') {
      const d = addDays(today, offset);
      return { from: d, to: d, label: `${TH_DAYS[weekday(d)]} ${thaiDate(d)}` };
    }
    if (period === 'week') {
      const mon = addDays(today, -((weekday(today) + 6) % 7) + offset * 7);
      const sun = addDays(mon, 6);
      return { from: mon, to: sun, label: `${thaiDate(mon, { year: false })} - ${thaiDate(sun)}` };
    }
    if (period === 'cycle') {
      const c = shiftCycle(cycleOf(today, startDay), offset, startDay);
      return { from: c.from, to: c.to, label: c.label };
    }
    if (period === 'quarter') {
      const [y, m] = today.split('-').map(Number);
      const qi = Math.floor((m - 1) / 3) + offset;
      const yy = y + Math.floor(qi / 4);
      const q = ((qi % 4) + 4) % 4;
      const from = `${yy}-${String(q * 3 + 1).padStart(2, '0')}-01`;
      const end = new Date(Date.UTC(yy, q * 3 + 3, 0)).toISOString().slice(0, 10);
      return { from, to: end, label: `ไตรมาส ${q + 1}/${yy + 543}` };
    }
    if (period === 'year') {
      const yy = Number(today.slice(0, 4)) + offset;
      return { from: `${yy}-01-01`, to: `${yy}-12-31`, label: `ปี ${yy + 543}` };
    }
    const dates = [...st.data.txs.map((t) => t.date), ...st.data.transfers.map((x) => x.date)].sort();
    return { from: dates[0] || today, to: today, label: 'ทั้งหมด' };
  }

  /** ประเภทการโอน: จ่ายบัตร / จ่ายหนี้ / ยืม / ให้ยืม / ได้คืน / โอนระหว่างบัญชี */
  function transferKind(x) {
    const f = wallet(x.from)?.type;
    const t = wallet(x.to)?.type;
    if (t === 'card') return 'จ่ายบัตรเครดิต';
    if (t === 'loan') return 'จ่ายหนี้';
    if (f === 'loan') return 'ยืมเงิน';
    if (t === 'receivable') return 'ให้ยืม';
    if (f === 'receivable') return 'ได้เงินคืน';
    if (t === 'cash') return 'กดเงินสด';
    return 'โอนระหว่างบัญชี';
  }

  /** แท่งตามช่วงเวลา: วัน/สัปดาห์/เดือน = รายวัน, ไตรมาส/ปี/ทั้งหมด = รายเดือน */
  function periodBuckets(range, txs) {
    const daily = diffDays(range.from, range.to) <= 31;
    const keys = [];
    if (daily) for (let i = 0; i <= diffDays(range.from, range.to); i++) keys.push(addDays(range.from, i));
    else {
      let k = range.from.slice(0, 7);
      while (k <= range.to.slice(0, 7) && keys.length < 120) {
        keys.push(k);
        const [y, m] = k.split('-').map(Number);
        k = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
      }
    }
    const sums = Object.fromEntries(keys.map((k) => [k, { inc: 0, exp: 0 }]));
    for (const t of txs) {
      const k = daily ? t.date : t.date.slice(0, 7);
      if (sums[k]) sums[k][t.type === 'income' ? 'inc' : 'exp'] += t.amount;
    }
    return keys.map((k) => ({ ...sums[k], label: daily ? String(Number(k.slice(8))) : TH_MONTHS[Number(k.slice(5)) - 1].replace('.', '').slice(0, 3), tip: daily ? thaiDate(k) : thaiMonthOf(k) }));
  }

  const TYPE_COLOR = { income: 'var(--green)', expense: 'var(--gold)', transfer: '#5B8DEF', debt: 'var(--red)' };

  function reportView() {
    const rp = st.rp;
    const range = periodRange(rp.period, rp.offset);
    const txs = st.data.txs.filter((t) => t.date >= range.from && t.date <= range.to);
    const xfers = st.data.transfers.filter((x) => x.date >= range.from && x.date <= range.to);
    const s = summarize(txs);
    const xferTotal = xfers.reduce((a, x) => a + x.amount, 0);
    const t = st.data.accountTotals;
    const debtAccts = st.data.accounts.filter((a) => !a.archived && a.known && isLiab(a) && a.used > 0);
    const incCount = txs.filter((x) => x.type === 'income').length;
    const expCount = txs.length - incCount;
    const tabBtn = (v, l, dot) => `<button class="mt-pill ${rp.tab === v ? 'is-on' : ''}" data-act="rptab" data-v="${v}"><i style="background:${dot}"></i>${l}</button>`;
    const toggle = (k, l) => `<button class="mt-check-chip ${rp.show[k] ? 'is-on' : ''}" data-act="rpshow" data-v="${k}" style="--c:${TYPE_COLOR[k]}"><i></i>${l}</button>`;
    const nav = rp.period === 'all' ? '' : `<div class="mt-range"><button data-act="rpnav" data-d="-1" aria-label="ก่อนหน้า">‹</button><span>${esc(range.label)}</span><button data-act="rpnav" data-d="1" aria-label="ถัดไป" ${rp.offset >= 0 ? 'disabled' : ''}>›</button></div>`;
    const head = `
      <div class="mt-row-h"><h2>รายงาน</h2>${nav}</div>
      <div class="mt-pills">${PERIODS.map(([v, l]) => `<button class="mt-pill ${rp.period === v ? 'is-on' : ''}" data-act="rpperiod" data-v="${v}">${l}</button>`).join('')}</div>
      <div class="mt-pills is-tabs">${tabBtn('overview', 'ทั่วไป', 'var(--ink)')}${tabBtn('expense', 'รายจ่าย', TYPE_COLOR.expense)}${tabBtn('income', 'รายรับ', TYPE_COLOR.income)}${tabBtn('account', 'บัญชี', '#8A5A00')}${tabBtn('transfer', 'โอน', TYPE_COLOR.transfer)}</div>`;

    if (rp.tab === 'expense' || rp.tab === 'income') {
      const inc = rp.tab === 'income';
      const list = (inc ? s.incomeCats : s.cats).map((c) => ({ ...c, n: txs.filter((x) => x.categoryId === c.id).length }));
      const total = inc ? s.income : s.expense;
      const parts = list.slice(0, 6).map((c) => ({ v: c.total, color: cat(c.id).color, label: cat(c.id).name }));
      const rest = list.slice(6).reduce((a, c) => a + c.total, 0);
      if (rest) parts.push({ v: rest, color: 'var(--faint)', label: 'อื่นๆ' });
      return `${head}
        <section class="mt-card">
          <div class="mt-card-h"><h3>${inc ? 'รายรับ' : 'รายจ่าย'}ตามหมวด</h3><span class="mt-sub">${inc ? incCount : expCount} รายการ</span></div>
          <div class="mt-rp-donut">${donutParts(parts, inc ? 'รายรับ' : 'รายจ่าย', short(total), `${inc ? 'รายรับ' : 'รายจ่าย'}ตามหมวด`, true)}</div>
          ${
            list.length
              ? `<ul class="mt-rp-list">${list
                  .map((c) => `<li><button data-act="filtercat" data-id="${c.id}"><span class="mt-catic" style="background:${cat(c.id).color}22">${cat(c.id).emoji}</span><span class="mt-tx-main"><b>${esc(cat(c.id).name)}</b><span class="mt-sub">${c.n} รายการ · ${Math.round((c.total / (total || 1)) * 100)}%</span>${bar(c.total / (list[0].total || 1), cat(c.id).color)}</span><b class="num ${inc ? 'is-inc' : ''}">${money(c.total)}</b></button></li>`)
                  .join('')}</ul>`
              : '<p class="mt-empty">ไม่มีรายการในช่วงนี้</p>'
          }
        </section>`;
    }

    if (rp.tab === 'account') {
      const rows = st.data.accounts
        .filter((a) => ['cash', 'bank', 'ewallet', 'card'].includes(a.type))
        .map((a) => {
          const own = txs.filter((x) => x.wallet === a.id);
          const out = own.filter((x) => x.type === 'expense').reduce((v, x) => v + x.amount, 0);
          const inn = own.filter((x) => x.type === 'income').reduce((v, x) => v + x.amount, 0);
          return { a, out, inn, n: own.length };
        })
        .filter((r) => r.n)
        .sort((x, y) => y.out - x.out);
      const maxOut = Math.max(1, ...rows.map((r) => r.out));
      return `${head}
        <section class="mt-card">
          <div class="mt-card-h"><h3>ใช้จ่ายจากบัญชีไหน</h3><span class="mt-sub">${esc(range.label)}</span></div>
          ${
            rows.length
              ? `<ul class="mt-rp-list">${rows
                  .map((r) => `<li><button data-act="acctlist" data-id="${r.a.id}">${acctImg(r.a.icon)}<span class="mt-tx-main"><b>${esc(r.a.name)}</b><span class="mt-sub">${r.n} รายการ${r.inn ? ` · รับ ${money(r.inn)}` : ''}</span>${bar(r.out / maxOut, r.a.color)}</span><b class="num">${money(r.out)}</b></button></li>`)
                  .join('')}</ul>`
              : '<p class="mt-empty">ไม่มีรายการในช่วงนี้</p>'
          }
        </section>`;
    }

    if (rp.tab === 'transfer') {
      const kinds = {};
      for (const x of xfers) (kinds[transferKind(x)] ||= { total: 0, n: 0 }).total += x.amount, kinds[transferKind(x)].n++;
      return `${head}
        <section class="mt-card">
          <div class="mt-card-h"><h3>โอน · จ่ายบัตร · จ่ายหนี้</h3><span class="mt-sub">ไม่นับเป็นรายรับรายจ่าย</span></div>
          <div class="mt-big"><b class="num" style="color:${TYPE_COLOR.transfer}">${money(xferTotal)}</b><span class="mt-sub">${xfers.length} รายการ</span></div>
          ${Object.keys(kinds).length ? `<dl class="mt-kv">${Object.entries(kinds).sort((a, b) => b[1].total - a[1].total).map(([k, v]) => `<div><dt>${k} (${v.n})</dt><dd class="num">${money(v.total)}</dd></div>`).join('')}</dl>` : '<p class="mt-empty">ไม่มีการโอนในช่วงนี้</p>'}
        </section>
        ${
          xfers.length
            ? `<section class="mt-card"><ul class="mt-txs">${[...xfers]
                .sort(byNewest)
                .map((x) => `<li><div class="mt-tx"><span class="mt-xfer">${acctImg(wallet(x.from).icon || 'bank', 'is-xs')}<i>→</i>${acctImg(wallet(x.to).icon || 'bank', 'is-xs')}</span><span class="mt-tx-main"><span class="mt-tx-note">${esc(x.note)}</span><span class="mt-sub">${thaiDate(x.date)} · ${esc(transferKind(x))}</span></span><span class="num mt-amt">${money(x.amount)}</span></div></li>`)
                .join('')}</ul></section>`
            : ''
        }`;
    }

    // ทั่วไป
    const segs = [];
    if (rp.show.income) segs.push({ v: s.income, color: TYPE_COLOR.income, label: 'รายรับ' });
    if (rp.show.expense) segs.push({ v: s.expense, color: TYPE_COLOR.expense, label: 'รายจ่าย' });
    if (rp.show.transfer) segs.push({ v: xferTotal, color: TYPE_COLOR.transfer, label: 'โอน (เป็นกลาง)' });
    if (rp.show.debt) segs.push({ v: t.debt, color: TYPE_COLOR.debt, label: 'หนี้สิน' });
    const segTotal = segs.reduce((a, x) => a + x.v, 0);
    const card = (k, title, n, v, extra = '') => `<div class="mt-rp-card is-${k}"><div><b>${title}</b><span>${n}</span></div><b class="num">${v}</b>${extra}</div>`;
    return `${head}
      <section class="mt-card">
        <div class="mt-card-h"><h3>${esc(range.label)}</h3>
          <div class="mt-seg-ic"><button class="${rp.chart === 'donut' ? 'is-on' : ''}" data-act="rpchart" data-v="donut" aria-label="แผนภูมิวงกลม">${icon('report')}</button><button class="${rp.chart === 'bar' ? 'is-on' : ''}" data-act="rpchart" data-v="bar" aria-label="กราฟแท่ง">${icon('analysis')}</button></div></div>
        <div class="mt-chips"><span class="mt-chip-s">${txs.length} รายการ</span><span class="mt-chip-s num ${s.net < 0 ? 'is-bad' : 'is-good'}">${s.net >= 0 ? '+' : ''}${money(s.net)}</span></div>
        <div class="mt-chips">${toggle('income', 'รายรับ')}${toggle('expense', 'รายจ่าย')}${toggle('transfer', 'โอน')}${toggle('debt', 'หนี้สิน')}</div>
        ${
          rp.chart === 'bar' && rp.period !== 'day'
            ? barsChart(periodBuckets(range, txs), `รายรับรายจ่าย ${range.label}`)
            : `<div class="mt-rp-donut">${donutParts(segs, 'สุทธิ', short(s.net), 'สัดส่วนรายรับรายจ่าย', true)}
              <ul class="mt-rp-legend">${segs.map((x) => `<li><i style="background:${x.color}"></i><span>${x.label}</span><b class="num">${segTotal ? Math.round((x.v / segTotal) * 1000) / 10 : 0}%</b></li>`).join('')}</ul></div>`
        }
      </section>
      <section class="mt-rp-cards">
        ${card('income', 'รายรับ', `${incCount} รายการ`, money(s.income))}
        ${card('expense', 'รายจ่าย', `${expCount} รายการ`, money(s.expense))}
        ${card('transfer', 'โอน · จ่ายบัตร · จ่ายหนี้', `${xfers.length} รายการ`, money(xferTotal))}
        ${card('debt', 'หนี้สินคงค้าง (ตอนนี้)', `${debtAccts.length} บัญชี`, money(t.debt))}
      </section>
      <section class="mt-card">
        <div class="mt-card-h"><h3>สรุปตามช่วงเวลา</h3></div>
        <div class="mt-quick">${[
          ['day', 'สรุปรายวัน', '#F97316'],
          ['week', 'สรุปรายสัปดาห์', '#16A34A'],
          ['cycle', 'สรุปรายเดือน', '#2563EB'],
          ['quarter', 'สรุปรายไตรมาส', '#6366F1'],
          ['year', 'สรุปรายปี', '#9333EA'],
        ]
          .map(([v, l, c]) => `<button data-act="rpperiod" data-v="${v}" style="--c:${c}"><i>${icon('analysis')}</i>${l}</button>`)
          .join('')}<button data-act="opencal" style="--c:#8A5A00"><i>${icon('cal')}</i>ปฏิทิน</button></div>
      </section>`;
  }

  function insightsBlock() {
    const ins = st.data.insights;
    const h = ins.health;
    const gc = gradeColor(h.grade);
    const pic = opts.moods?.[h.mood] || opts.logoUrl;
    const sv = ins.savings;
    const svMax = Math.max(0.5, ...sv.series.map((x) => x.rate || 0));
    const pace = ins.pace;
    return `
      <section class="mt-card mt-health">
        <div class="mt-health-top">
          ${gauge(h.score, gc)}
          <div class="mt-health-g"><span class="mt-grade" style="background:${gc}">${h.grade}</span><b>${esc(h.label)}</b><span class="mt-sub">คะแนนสุขภาพการเงิน · จากรายรับ รายจ่าย งบ บัตร และหนี้</span></div>
          ${pic ? `<img class="mt-health-pic" src="${esc(pic)}" alt="">` : ''}
        </div>
        <ul class="mt-parts">${h.parts
          .map((x) => `<li><span>${esc(x.label)}</span><b class="num">${x.score}/${x.max}</b>${bar(x.score / x.max, x.score / x.max >= 0.7 ? 'var(--green)' : x.score / x.max >= 0.4 ? 'var(--amber)' : 'var(--red)')}<small>${esc(x.detail)}</small></li>`)
          .join('')}</ul>
      </section>
      <section class="mt-insights">
        <div class="mt-insight"><span>วันนี้ใช้ได้อีก</span><b class="num">${ins.allowance ? money(ins.allowance.perDay) : '-'}</b><small>${ins.allowance ? `เหลืออีก ${ins.allowance.daysLeft} วันในรอบ` : 'ตั้งงบก่อนเพื่อคำนวณ'}</small></div>
        <div class="mt-insight"><span>คาดว่าใช้ทั้งรอบ</span><b class="num ${pace.pace > 1.1 ? 'is-bad' : ''}">${money(pace.forecast)}</b><small>${pace.pace == null ? 'ยังไม่มีข้อมูลรอบก่อน' : `${Math.round(pace.pace * 100)}% ของค่าเฉลี่ย`}</small></div>
      </section>
      <section class="mt-card">
        <div class="mt-card-h"><h3>การใช้จ่ายรอบนี้</h3><span class="mt-sub">ผ่านไป ${Math.round(pace.elapsedPct * 100)}% ของรอบ</span></div>
        <div class="mt-pace">${bar(pace.avg ? Math.min(1, pace.spent / pace.avg) : 0, pace.pace > 1.1 ? 'var(--red)' : 'var(--gold)', 'is-lg')}<i style="left:${Math.round(pace.elapsedPct * 100)}%" title="วันนี้"></i></div>
        <dl class="mt-kv">
          <div><dt>ใช้ไปแล้ว</dt><dd class="num">${money(pace.spent)}</dd></div>
          <div><dt>คาดการณ์ทั้งรอบ</dt><dd class="num">${money(pace.forecast)}</dd></div>
          <div><dt>ค่าเฉลี่ยต่อรอบ (3 รอบก่อน)</dt><dd class="num">${pace.avg ? money(pace.avg) : '-'}</dd></div>
          <div><dt>Pace = คาดการณ์ ÷ ค่าเฉลี่ย</dt><dd class="num ${pace.pace > 1.1 ? 'is-bad' : 'is-inc'}">${pace.pace == null ? '-' : `${Math.round(pace.pace * 100)}%`}</dd></div>
        </dl>
      </section>
      <section class="mt-card">
        <div class="mt-card-h"><h3>อัตราการออม</h3><span class="mt-sub">เฉลี่ย 6 รอบที่จบแล้ว</span></div>
        <div class="mt-big ${sv.rate != null && sv.rate < sv.target ? 'is-bad' : 'is-inc'}"><b class="num">${sv.rate == null ? '-' : `${Math.round(sv.rate * 100)}%`}</b><span class="mt-sub">${sv.rate == null ? 'ยังไม่มีรายรับให้คำนวณ' : sv.rate >= sv.target ? 'ถึงเป้า 20% แล้ว เก่งมาก 🎉' : `ต่ำกว่าเป้า 20% อยู่ ${Math.round((sv.target - sv.rate) * 100)} จุด`}</span></div>
        <div class="mt-sbars"><span class="mt-sbars-line" style="bottom:${Math.round((sv.target / svMax) * 100)}%"><span>เป้า 20%</span></span>${sv.series
          .map((x) => `<div><i style="height:${x.rate == null ? 0 : Math.max(2, Math.round((Math.max(0, x.rate) / svMax) * 100))}%;background:${x.rate != null && x.rate < 0 ? 'var(--red)' : x.rate >= sv.target ? 'var(--green)' : 'var(--gold)'}"><span class="num">${x.rate == null ? '' : `${Math.round(x.rate * 100)}%`}</span></i></div>`)
          .join('')}</div>
        <div class="mt-sbars-x">${sv.series.map((x) => `<span>${esc(x.label)}</span>`).join('')}</div>
        ${sv.gapPerMonth ? `<p class="mt-sub">🚩 ออมเพิ่มอีกประมาณ <b class="num">${money(sv.gapPerMonth)}</b> ต่อเดือน จะถึงเป้า 20%</p>` : ''}
      </section>
      ${
        ins.cards.length
          ? `<section class="mt-card">
        <div class="mt-card-h"><h3>วงเงินบัตรเครดิต</h3><span class="mt-sub">ไม่ควรใช้เกิน 30%</span></div>
        <ul class="mt-util">${ins.cards
          .map((c) => `<li>${acctImg(c.icon, 'is-sm')}<div><div class="mt-util-h"><b>${esc(c.name)}</b><span class="num ${c.pct >= 0.7 ? 'is-bad' : 'is-inc'}">${Math.round(c.pct * 100)}%</span></div>${bar(c.pct, cardTone(c.pct))}<div class="mt-util-h mt-sub"><span class="num">${money(c.used)} / ${money(c.limit)}</span><span class="num">เหลือ ${money(c.available)}</span></div></div></li>`)
          .join('')}</ul></section>`
          : ''
      }
      ${
        ins.debts.length
          ? `<section class="mt-card">
        <div class="mt-card-h"><h3>นับถอยหลังปลดหนี้</h3><span class="mt-sub">${ins.debtFreeMonths ? `อีก ${ins.debtFreeMonths} เดือน` : 'ใส่ค่างวดเพื่อคำนวณ'}</span></div>
        <ul class="mt-util">${ins.debts
          .map((d) => `<li>${acctImg(d.icon, 'is-sm')}<div><div class="mt-util-h"><b>${esc(d.name)}</b><span class="num is-bad">${money(d.used)}</span></div>${d.principal ? bar(d.pctPaid, 'var(--green)') : ''}<div class="mt-util-h mt-sub"><span>${d.monthlyPayment ? `ผ่อน ${money(d.monthlyPayment)}/เดือน${d.rate ? ` · ดอก ${d.rate}%` : ''}` : 'ยังไม่ใส่ค่างวด'}</span><span>${d.monthsLeft ? `อีก ${d.monthsLeft} งวด` : ''}</span></div></div></li>`)
          .join('')}</ul></section>`
          : ''
      }
      <section class="mt-card">
        <div class="mt-card-h"><h3>รายรับ-รายจ่าย 12 เดือน</h3></div>
        ${yearChart()}
      </section>
      <div class="mt-row-h"><h2>วิเคราะห์รอบนี้</h2>${cycleSwitch()}</div>`;
  }

  function analysisView() {
    const txs = cycleTxs();
    const s = summarize(txs);
    const exp = txs.filter((t) => t.type === 'expense');
    const prev = summarize(cycleTxs(shiftCycle(st.cycle, -1, st.cycle.startDay)));
    const daily = dailyChart(s);

    // ค่าเฉลี่ยตามวันในสัปดาห์ (เริ่มวันจันทร์)
    const order = [1, 2, 3, 4, 5, 6, 0];
    const wk = Object.fromEntries(order.map((d) => [d, { sum: 0, days: new Set() }]));
    for (const t of exp) {
      const d = weekday(t.date);
      wk[d].sum += t.amount;
      wk[d].days.add(t.date);
    }
    const wkAvg = order.map((d) => ({ d, v: wk[d].days.size ? wk[d].sum / wk[d].days.size : 0 }));
    const wkMax = Math.max(...wkAvg.map((x) => x.v), 1);
    const peak = wkAvg.reduce((a, b) => (b.v > a.v ? b : a), wkAvg[0]);

    // รายการที่ใช้เงินมากที่สุด (รวมตามชื่อ)
    const byNote = {};
    for (const t of exp) {
      const k = t.note.trim();
      (byNote[k] ||= { note: k, total: 0, n: 0, categoryId: t.categoryId }).total += t.amount;
      byNote[k].n++;
    }
    const topNotes = Object.values(byNote).sort((a, b) => b.total - a.total).slice(0, 5);
    const biggest = [...exp].sort((a, b) => b.amount - a.amount)[0];
    const spendDays = new Set(exp.map((t) => t.date)).size;
    const elapsed = Math.min(diffDays(st.cycle.from, todayStr()) + 1, diffDays(st.cycle.from, st.cycle.to) + 1);
    const noSpend = Math.max(0, elapsed - spendDays);
    const diff = prev.expense ? (s.expense - prev.expense) / prev.expense : null;

    // เทียบหมวดกับรอบก่อน
    const deltas = s.cats
      .map((c) => ({ id: c.id, now: c.total, before: prev.cats.find((p) => p.id === c.id)?.total || 0 }))
      .map((x) => ({ ...x, d: x.now - x.before }))
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
      .slice(0, 4);

    return `
      <div class="mt-row-h"><h2>ข้อมูลเชิงลึก</h2></div>
      ${insightsBlock()}
      <section class="mt-insights">
        <div class="mt-insight"><span>เทียบรอบก่อน</span><b class="num ${diff > 0 ? 'is-bad' : 'is-inc'}">${diff == null ? '-' : `${diff > 0 ? '▲' : '▼'} ${Math.abs(Math.round(diff * 100))}%`}</b><small>${diff == null ? 'ยังไม่มีข้อมูลรอบก่อน' : diff > 0 ? 'ใช้มากขึ้น' : 'ใช้น้อยลง เก่งมาก'}</small></div>
        <div class="mt-insight"><span>เฉลี่ยต่อวัน</span><b class="num">${money(Math.round(daily.avg))}</b><small>ตลอดรอบนี้</small></div>
        <div class="mt-insight"><span>วันไม่ใช้เงิน</span><b class="num">${noSpend} วัน</b><small>No-Spend Day 🏆</small></div>
        <div class="mt-insight"><span>จ่ายก้อนใหญ่สุด</span><b class="num">${biggest ? money(biggest.amount) : '-'}</b><small>${biggest ? esc(biggest.note) : '-'}</small></div>
      </section>
      <section class="mt-card">
        <div class="mt-card-h"><h3>รายจ่ายรายวัน</h3><span class="mt-sub">เส้นประ = ค่าเฉลี่ย</span></div>
        ${daily.svg}
      </section>
      <section class="mt-card">
        <div class="mt-card-h"><h3>ใช้เงินวันไหนเยอะ</h3><span class="mt-sub">เฉลี่ยต่อวัน</span></div>
        <ul class="mt-week">${wkAvg
          .map((x) => `<li class="${x.d === peak.d && x.v > 0 ? 'is-peak' : ''}"><span>${TH_DAYS[x.d]}</span>${bar(x.v / wkMax, x.d === peak.d ? 'var(--gold)' : 'var(--gold-soft)')}<b class="num">${money(Math.round(x.v))}</b></li>`)
          .join('')}</ul>
        ${peak.v > 0 ? `<p class="mt-sub">👦 วัน${DAY_FULL[peak.d]}เงินหมุนออกเยอะสุด ลองวางแผนวันนี้ดีๆ นะ</p>` : ''}
      </section>
      <section class="mt-card">
        <div class="mt-card-h"><h3>จ่ายอะไรบ่อย</h3><span class="mt-sub">5 อันดับ</span></div>
        ${
          topNotes.length
            ? `<ol class="mt-rank">${topNotes
                .map((n, i) => `<li><span class="mt-rank-i num">${i + 1}</span><span class="mt-rank-n"><b>${esc(n.note)}</b><span class="mt-sub">${n.n} ครั้ง · ${esc(cat(n.categoryId).name)}</span></span><b class="num">${money(n.total)}</b></li>`)
                .join('')}</ol>`
            : '<p class="mt-empty">ยังไม่มีรายจ่าย</p>'
        }
      </section>
      <section class="mt-card">
        <div class="mt-card-h"><h3>เทียบกับรอบก่อน</h3><span class="mt-sub num">${money(prev.expense)} → ${money(s.expense)}</span></div>
        ${
          deltas.length
            ? `<ul class="mt-delta">${deltas
                .map((x) => `<li><span class="mt-dot" style="background:${cat(x.id).color}"></span><span>${esc(cat(x.id).name)}</span><b class="num ${x.d > 0 ? 'is-bad' : 'is-inc'}">${x.d > 0 ? '+' : ''}${money(x.d)}</b></li>`)
                .join('')}</ul>`
            : '<p class="mt-empty">ยังไม่มีข้อมูลให้เทียบ</p>'
        }
      </section>`;
  }

  // ---------------- หมวด/งบ ----------------
  function budgetView() {
    const d = st.data;
    const b = d.budget;
    const cur = isCurrentCycle();
    const s = summarize(cycleTxs());
    const seg = `<div class="mt-seg2">
      <button class="${st.side === 'expense' ? 'is-on is-exp' : ''}" data-act="side" data-v="expense">รายจ่าย</button>
      <button class="${st.side === 'income' ? 'is-on is-inc' : ''}" data-act="side" data-v="income">รายรับ</button>
    </div>`;
    if (st.side === 'income') {
      const inc = d.categories.filter((c) => c.type === 'income');
      return `${seg}
        <div class="mt-row-h"><h2>รายรับ</h2>${cycleSwitch()}</div>
        <section class="mt-card"><div class="mt-big-l">รายรับรอบนี้</div><div class="mt-big num is-inc">${money(s.income)}</div></section>
        <ul class="mt-catlist">${inc
          .map((c) => {
            const v = s.incomeCats.find((x) => x.id === c.id)?.total || 0;
            return `<li><div class="mt-catrow"><span class="mt-dot" style="background:${c.color}"></span><span class="mt-catname">${c.emoji} ${esc(c.name)}</span><b class="num">${money(v)}</b></div></li>`;
          })
          .join('')}</ul>`;
    }
    const expCats = d.categories.filter((c) => c.type === 'expense');
    const limits = d.settings.catBudgets || {};
    const sumCat = Object.values(limits).reduce((a, v) => a + v, 0);
    const stack = sumCat
      ? `<div class="mt-stack" role="img" aria-label="สัดส่วนงบรายหมวด">${expCats
          .filter((c) => limits[c.id])
          .map((c) => `<span style="flex:${limits[c.id]};background:${c.color}" title="${esc(c.name)} ${money(limits[c.id])}"></span>`)
          .join('')}</div>`
      : b.total
        ? bar(b.pct, budgetTone(b.pct), 'is-lg')
        : '';
    return `${seg}
      <section class="mt-card mt-budget">
        <div class="mt-budget-top">
          <div><span class="mt-big-l">งบที่ตั้งไว้</span>
            <button class="mt-big num" data-act="edittotal" ${b.mode === 'category' ? 'disabled' : ''}>${b.total ? money(b.total) : 'ตั้งงบ'}</button></div>
          <label class="mt-mode"><span>ชนิดงบ</span>
            <select id="mt-mode" data-change="mode"><option value="total" ${b.mode !== 'category' ? 'selected' : ''}>รวมทั้งเดือน</option><option value="category" ${b.mode === 'category' ? 'selected' : ''}>แยกหมวด</option></select></label>
        </div>
        ${stack}
        ${cur && b.total ? `<p class="mt-sub">ใช้ไป <b class="num">${money(b.spent)}</b> · ${b.remaining >= 0 ? `เหลือ <b class="num">${money(b.remaining)}</b> ใช้ได้วันละ ~<b class="num">${money(b.perDayLeft)}</b>` : `<b class="is-bad">เกินงบ ${money(-b.remaining)}</b>`}</p>` : ''}
        <div class="mt-cycle-row">
          <span class="mt-cycle-ic">${icon('cal')}</span>
          <div><b>รอบงบ</b><span class="mt-sub">รายเดือน (วันที่ ${st.cycle.startDay})</span></div>
          <button class="mt-btn-s" data-act="editcycle">${icon('settings')} ตั้งค่า</button>
        </div>
      </section>
      <ul class="mt-catlist">${expCats
        .map((c) => {
          const spent = s.cats.find((x) => x.id === c.id)?.total || 0;
          const lim = limits[c.id] || 0;
          return `<li><button class="mt-catrow" data-act="editcat" data-id="${c.id}">
            <span class="mt-dot" style="background:${c.color}"></span>
            <span class="mt-catname">${c.emoji} ${esc(c.name)}<small class="mt-sub num">ใช้ไป ${money(spent)}</small></span>
            <span class="mt-catlim"><span class="mt-sub">งบ</span> <b class="num">${lim ? lim.toLocaleString('en-US') : '-'}</b></span>
            <span class="mt-chev">›</span>
          </button>${lim ? bar(spent / lim, budgetTone(spent / lim)) : ''}</li>`;
        })
        .join('')}</ul>
      ${goalsCard()}
      ${recurringCard()}`;
  }

  function goalsCard() {
    const d = st.data;
    return `<section class="mt-card">
      <div class="mt-card-h"><h3>กระปุกออม 🐷</h3><button class="mt-link" data-act="newgoal">+ เพิ่มเป้าหมาย</button></div>
      ${
        d.goals.length
          ? `<ul class="mt-goals">${d.goals
              .map((g) => {
                const p = g.saved / g.target;
                return `<li>
                <div class="mt-goal-h">${ring(p, g.emoji)}<div><b>${esc(g.name)}</b><span class="mt-sub num">${money(g.saved)} / ${money(g.target)}</span><span class="mt-sub">${p >= 1 ? '🎉 ครบเป้าแล้ว!' : `ขาดอีก ${money(g.target - g.saved)}`}</span></div><span class="num mt-goal-p">${Math.round(p * 100)}%</span></div>
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
    </section>`;
  }

  function recurringCard() {
    const d = st.data;
    return `<section class="mt-card">
      <div class="mt-card-h"><h3>รายการประจำ</h3><button class="mt-link" data-act="newrec">+ เพิ่ม</button></div>
      <p class="mt-sub">บันทึกให้อัตโนมัติทุกเดือน เช่น ค่าห้อง ค่าเน็ต เงินเดือน</p>
      ${
        d.recurring.length
          ? `<ul class="mt-txs">${d.recurring
              .map((r) => {
                const k = cat(r.categoryId);
                return `<li><div class="mt-tx"><span class="mt-dot" style="background:${k.color}"></span><span class="mt-tx-main"><span class="mt-tx-note">${esc(r.note)}</span><span class="mt-sub">ทุกวันที่ ${r.day} · ${esc(k.name)}</span></span>
                <span class="num mt-amt ${r.type === 'income' ? 'is-inc' : ''}">${money(r.amount)}</span><button class="mt-x" data-act="delrec" data-id="${r.id}" aria-label="ลบ ${esc(r.note)}">✕</button></div></li>`;
              })
              .join('')}</ul>`
          : '<p class="mt-empty">ยังไม่มีรายการประจำ</p>'
      }
    </section>`;
  }

  // ---------------- รายการ ----------------
  function listView() {
    let txs = cycleTxs();
    if (st.type !== 'all') txs = txs.filter((t) => t.type === st.type);
    if (st.cat) txs = txs.filter((t) => t.categoryId === st.cat);
    if (st.wallet) txs = txs.filter((t) => t.wallet === st.wallet);
    if (st.q) {
      const q = st.q.toLowerCase();
      txs = txs.filter((t) => t.note.toLowerCase().includes(q) || cat(t.categoryId).name.includes(q));
    }
    txs.sort(byNewest);
    const groups = {};
    for (const t of txs) (groups[t.date] ||= []).push(t);
    const s = summarize(txs);
    const chip = (v, l) => `<button class="mt-chip ${st.type === v ? 'is-on' : ''}" data-act="type" data-v="${v}">${l}</button>`;
    const mode = (v, l) => `<button class="${st.listMode === v ? 'is-on' : ''}" data-act="listmode" data-v="${v}">${l}</button>`;
    const modes = `<div class="mt-seg3">${mode('list', 'รายการ')}${mode('cal', 'ปฏิทิน')}${mode('slip', 'สลิป · ใบเสร็จ')}</div>`;
    if (st.listMode === 'cal') return `<div class="mt-row-h"><h2>ปฏิทิน</h2>${cycleSwitch()}</div>${modes}${calendarView(txs)}`;
    if (st.listMode === 'slip') return `<div class="mt-row-h"><h2>สลิป · ใบเสร็จ</h2>${cycleSwitch()}</div>${modes}${slipView(txs)}`;
    return `
      <div class="mt-row-h"><h2>รายการ</h2>${cycleSwitch()}</div>
      ${modes}
      <div class="mt-filters">
        <input id="mt-search" type="search" placeholder="ค้นหา เช่น กาแฟ" value="${esc(st.q)}" autocomplete="off">
        <div class="mt-chips">${chip('all', 'ทั้งหมด')}${chip('expense', 'รายจ่าย')}${chip('income', 'รายรับ')}
          ${st.cat ? `<button class="mt-chip is-on" data-act="filtercat" data-id="">${cat(st.cat).emoji} ${esc(cat(st.cat).name)} ✕</button>` : ''}
          ${st.wallet ? `<button class="mt-chip is-on" data-act="acctlist" data-id="">${wallet(st.wallet).emoji} ${esc(wallet(st.wallet).name)} ✕</button>` : ''}
        </div>
      </div>
      <div class="mt-list-sum"><span class="mt-sub">${txs.length} รายการ · จ่าย <b class="num">${money(s.expense)}</b> · รับ <b class="num is-inc">${money(s.income)}</b></span><button class="mt-btn-s" data-act="add">+ จดรายการ</button></div>
      ${
        txs.length
          ? Object.entries(groups)
              .map(([d, list]) => {
                const dayExp = list.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
                return `<section class="mt-day"><h4><span>${TH_DAYS[weekday(d)]} ${thaiDate(d)}</span><span class="num">${dayExp ? money(dayExp) : ''}</span></h4><ul class="mt-txs">${list.map(txItem).join('')}</ul></section>`;
              })
              .join('')
          : '<p class="mt-empty">ไม่พบรายการ</p>'
      }`;
  }

  // ---------------- กระเป๋าเงิน ----------------
  const GROUPS = [
    { key: 'cash', label: 'เงินสด', types: ['cash'] },
    { key: 'bank', label: 'บัญชีธนาคาร', types: ['bank'] },
    { key: 'ewallet', label: 'e-Wallet', types: ['ewallet'] },
    { key: 'receivable', label: 'ค้างรับ', types: ['receivable'] },
    { key: 'loan', label: 'หนี้สิน', types: ['loan'] },
    { key: 'card', label: 'บัตรเครดิต', types: ['card'] },
  ];
  const isLiab = (a) => a.type === 'card' || a.type === 'loan';
  /** ไอคอนธนาคาร: PNG จาก /assets/banks (โลโก้จริง) · เดโมใช้รูปที่ฝังไว้ (iconMap) · ไม่มีทั้งคู่ใช้ SVG ที่วาดเอง */
  const acctImg = (key, cls = '') => {
    const src = opts.iconMap?.[key] || (opts.iconBase ? `${opts.iconBase}/${key}.png` : '');
    return src ? `<img class="mt-ico ${cls}" src="${esc(src)}" alt="" loading="lazy">` : `<span class="mt-ico ${cls}">${badgeSvg(key)}</span>`;
  };

  /** ตัวเลขหลักของบัญชี: ยอดคงเหลือ / บัตร-หนี้ = ยอดค้าง */
  function acctFigure(a) {
    if (a.type === 'card') return a.known ? money(a.totalUsed) : money(a.spent || 0);
    if (isLiab(a)) return a.known ? money(a.used) : money(a.spent || 0);
    return a.known ? money(a.balance) : 'ตั้งยอด';
  }
  function acctSub(a) {
    if (a.type === 'card') {
      if (!a.known) return 'รอบนี้รูดไป · ยังไม่ตั้งยอด';
      return [a.limit ? `เหลือ ${money(a.available)}` : 'ยอดค้างจ่าย', a.installments?.length ? `ผ่อน ${a.installments.length} รายการ` : '', a.payNow ? `ต้องจ่าย ${money(a.payNow)}${a.cycle?.due ? ` (${thaiDate(a.cycle.due, { year: false })})` : ''}` : ''].filter(Boolean).join(' · ');
    }
    if (a.type === 'loan') return [a.monthlyPayment ? `ผ่อน ${money(a.monthlyPayment)}/เดือน` : 'ยอดค้างจ่าย', a.rate ? `ดอก ${a.rate}%` : '', a.installments ? `งวด ${a.paidInstallments}/${a.installments}` : a.monthsLeft ? `อีก ${a.monthsLeft} งวด` : '', a.viaCard ? `ผ่านบัตร ${wallet(a.viaCard).name}` : ''].filter(Boolean).join(' · ');
    if (a.type === 'receivable') return 'ยังไม่ได้คืน';
    return `รอบนี้ใช้ ${money(a.spent || 0)}`;
  }
  const cardTone = (p) => (p >= 0.9 ? 'var(--red)' : p >= 0.7 ? 'var(--amber)' : 'var(--ink)');
  const groupTotal = (list) => list.reduce((x, a) => x + (a.known ? (a.type === 'card' ? a.totalUsed : isLiab(a) ? a.used : a.balance) : 0), 0);
  // หนี้ที่ผ่อนผ่านบัตร แสดงอยู่ใต้บัตรใบนั้น ไม่แยกในกลุ่มหนี้สิน (กันนับซ้ำ)
  const inGroup = (g, a) => g.types.includes(a.type) && !(a.type === 'loan' && a.viaCard);

  /** แถบวงเงินบัตร: รูดค้าง | ผ่อน | เหลือ */
  function cardBar(a, lg = false) {
    if (!a.limit) return '';
    const w = (v) => `${Math.max(0, Math.min(100, (v / a.limit) * 100)).toFixed(1)}%`;
    return `<span class="mt-cbar ${lg ? 'is-lg' : ''}"><i style="width:${w(Math.max(0, a.used))}"></i><i class="is-inst" style="width:${w(a.instOwed || 0)}"></i></span>`;
  }

  /** รายละเอียดบัตร: วงเงิน รอบบิล ผ่อน งบรูด */
  function cardDetail(a) {
    const c = a.cycle;
    return `
      <div class="mt-card-big"><span class="mt-sub">วงเงินคงเหลือ</span><b class="num ${a.available < 0 ? 'is-neg' : ''}">${a.limit ? money(a.available) : '-'}</b><span class="mt-sub">จากวงเงิน ${a.limit ? money(a.limit) : '(ยังไม่ใส่)'}</span></div>
      ${cardBar(a, true)}
      <div class="mt-legend-i is-left"><span><i style="background:var(--ink)"></i>รูดค้าง ${money(Math.max(0, a.used))}</span><span><i style="background:#8B5CF6"></i>ผ่อน ${money(a.instOwed || 0)}</span><span><i style="background:var(--track)"></i>เหลือ</span></div>
      <dl class="mt-kv">
        ${c ? `<div><dt>รูดรอบใหม่ (${thaiDate(c.from, { year: false })} - ${thaiDate(c.to, { year: false })}) · ไปบิลหน้า</dt><dd class="num">${money(a.cycleSpent || 0)}</dd></div>` : ''}
        <div><dt>ต้องจ่ายบิล${c?.due ? ` ภายใน ${thaiDate(c.due)}` : ''}</dt><dd class="num is-bad">${money(a.payNow || 0)}</dd></div>
        ${a.instDue ? `<div><dt>· ในนั้นเป็นค่างวดผ่อน</dt><dd class="num">${money(a.instDue)}</dd></div>` : ''}
        ${
          a.cycleBudget
            ? `<div><dt>งบรูดรอบนี้ ${money(a.cycleBudget)} · เหลือ</dt><dd class="num ${a.budgetLeft < 0 ? 'is-bad' : 'is-inc'}">${money(a.budgetLeft)}</dd></div>
               <div><dt>ใช้ได้อีกวันละ (${c?.daysLeft || 0} วันถึงวันตัดรอบ)</dt><dd class="num">${money(a.perDay || 0)}</dd></div>`
            : ''
        }
      </dl>
      ${a.cycleBudget ? bar(Math.min(1, (a.cycleSpent || 0) / a.cycleBudget), budgetTone((a.cycleSpent || 0) / a.cycleBudget)) : !c ? '<p class="mt-sub">ใส่ "วันตัดรอบบัญชี" ด้านล่าง เพื่อดูยอดรูดแต่ละรอบบิล</p>' : ''}
      <div class="mt-card-h"><h3>ผ่อนผ่านบัตรนี้</h3><button class="mt-link" type="button" data-act="newinst" data-id="${a.id}">+ เพิ่มผ่อนสินค้า</button></div>
      ${
        a.installments?.length
          ? `<ul class="mt-txs">${a.installments
              .map((l) => `<li><button class="mt-acct-row" type="button" data-act="acct" data-id="${l.id}">${acctImg('loan', 'is-sm')}<span class="mt-tx-main"><span class="mt-tx-note">${esc(l.name)}</span><span class="mt-sub">งวดละ ${money(l.monthlyPayment)}${l.installments ? ` · งวด ${l.paidInstallments}/${l.installments}` : ''}${l.monthsLeft ? ` · อีก ${l.monthsLeft} งวด` : ''}</span>${l.installments ? bar(l.paidInstallments / l.installments, '#8B5CF6') : ''}</span><span class="num mt-amt">${money(l.used)}</span></button></li>`)
              .join('')}</ul>`
          : '<p class="mt-empty">ไม่มี · ผ่อนสินค้า 0% ผ่านบัตร เพิ่มที่นี่ ระบบจะกันวงเงินและตัดค่างวดตอนจ่ายบัตรให้เอง</p>'
      }`;
  }

  /** การ์ดความมั่งคั่งสุทธิ (ดำ-ทอง) */
  function worthCard() {
    const t = st.data.accountTotals;
    return `<section class="mt-worth">
      <div class="mt-worth-top"><span>ความมั่งคั่งสุทธิ</span>${opts.logoUrl ? `<img src="${esc(opts.logoUrl)}" alt="">` : ''}</div>
      <b class="num ${t.net < 0 ? 'is-neg' : ''}">${money(t.net)}</b>
      <div class="mt-worth-row">
        <div><span>เงินในบัญชี</span><b class="num">${money(t.cash)}</b></div>
        <div><span>ค้างรับ</span><b class="num">${money(t.receivable)}</b></div>
        <div><span>หนี้รวม</span><b class="num is-debt">${money(t.debt)}</b></div>
      </div>
    </section>`;
  }

  /** ภาพรวมบัญชีแยกกลุ่ม (หน้าสรุป) */
  function walletStrip() {
    const list = activeAccts();
    const rows = GROUPS.map((g) => ({ ...g, list: list.filter((a) => inGroup(g, a)) })).filter((g) => g.list.length);
    return `${worthCard()}
    <section class="mt-card">
      <div class="mt-card-h"><h3>กระเป๋าเงิน</h3><button class="mt-link" data-act="tab" data-tab="wallets">ดูทั้งหมด</button></div>
      <ul class="mt-groups">${rows
        .map(
          (g) => `<li><button class="mt-group is-${g.key}" data-act="tab" data-tab="wallets">
            ${acctImg(g.key)}
            <span class="mt-group-n">${g.label}<small>${g.list.length > 1 ? ` (${g.list.length})` : g.list[0].name === g.label ? '' : ` · ${esc(g.list[0].name)}`}</small></span>
            <span class="mt-group-icons">${g.list.slice(0, 4).map((a) => acctImg(a.icon, 'is-xs')).join('')}</span>
            <b class="num">${g.key === 'loan' || g.key === 'card' ? '−' : ''}${money(groupTotal(g.list))}</b>
          </button></li>`
        )
        .join('')}</ul>
      <button class="mt-btn is-ghost" data-act="newacct">＋ เพิ่มบัญชี · บัตร · หนี้</button>
    </section>`;
  }

  function acctRow(a) {
    const neg = !isLiab(a) && a.known && a.balance < 0;
    return `<li><button class="mt-acct-row" data-act="acct" data-id="${a.id}">
      ${acctImg(a.icon)}
      <span class="mt-tx-main"><span class="mt-tx-note">${esc(a.name)}</span><span class="mt-sub">${esc(acctSub(a))}${a.type === 'card' && a.dueDay ? ` · จ่ายวันที่ ${a.dueDay}` : ''}</span>
        ${a.type === 'card' && a.known && a.limit ? cardBar(a) : ''}
        ${a.type === 'loan' && a.principal ? `${bar(a.pctPaid, 'var(--green)')}<span class="mt-sub">จ่ายแล้ว ${Math.round(a.pctPaid * 100)}% ของ ${money(a.principal)}</span>` : ''}</span>
      <span class="num mt-amt ${!a.known && !isLiab(a) ? 'is-unset' : ''} ${neg || a.type === 'loan' ? 'is-neg' : ''}">${acctFigure(a)}</span>
    </button></li>`;
  }

  /** สรุปหนี้: บัตร (รูดค้าง) · ผ่อนผ่านบัตร · หนี้อื่น · ต้องจ่ายเดือนนี้ */
  function debtCard() {
    const t = st.data.accountTotals;
    if (!t.debt && !t.payThisMonth) return '';
    const parts = [
      ['บัตรเครดิต (รูดค้าง)', t.cardDebt, 'var(--ink)'],
      ['ผ่อนสินค้าผ่านบัตร', t.instDebt, '#8B5CF6'],
      ['หนี้อื่น (ผ่อนรถ ยืม ฯลฯ)', t.loanDebt, 'var(--red)'],
    ].filter((x) => x[1] > 0);
    return `<section class="mt-card">
      <div class="mt-card-h"><h3>หนี้สินของฉัน</h3><b class="num is-bad">${money(t.debt)}</b></div>
      <span class="mt-stack">${parts.map(([, v, c]) => `<i style="width:${((v / (t.debt || 1)) * 100).toFixed(1)}%;background:${c}"></i>`).join('')}</span>
      <dl class="mt-kv">${parts.map(([l, v, c]) => `<div><dt><i class="mt-dot" style="background:${c}"></i> ${l}</dt><dd class="num">${money(v)}</dd></div>`).join('')}
        <div class="is-total"><dt>ต้องจ่ายเดือนนี้ (บิลบัตร + ค่างวด)</dt><dd class="num">${money(t.payThisMonth)}</dd></div></dl>
    </section>`;
  }

  function walletsView() {
    const t = st.data.accountTotals;
    const list = activeAccts();
    const hidden = st.data.accounts.filter((a) => a.archived);
    const xfers = [...st.data.transfers].sort(byNewest).slice(0, 8);
    const unset = list.filter((a) => !a.known).length;
    const sections = GROUPS.map((g) => ({ ...g, list: list.filter((a) => inGroup(g, a)) }));
    const addLabel = { cash: '+ เพิ่ม', bank: '+ เพิ่มบัญชี', ewallet: '+ เพิ่ม e-Wallet', receivable: '+ ให้ยืม', loan: '+ เพิ่มหนี้', card: '+ เพิ่มบัตร' };
    return `
      <div class="mt-row-h"><h2>กระเป๋าเงิน</h2><button class="mt-btn-s" data-act="xfer">⇄ โอน / จ่าย</button></div>
      ${worthCard()}
      ${debtCard()}
      ${unset ? `<p class="mt-sub mt-note">มี ${unset} บัญชีที่ยังไม่ได้ตั้งยอด แตะบัญชีแล้วใส่ยอดตอนนี้ ระบบจะคิดยอดให้ทุกครั้งที่จด</p>` : ''}
      ${sections
        .filter((g) => g.list.length || ['bank', 'card', 'loan'].includes(g.key))
        .map(
          (g) => `<section class="mt-card mt-gsec is-${g.key}">
        <div class="mt-card-h"><h3>${acctImg(g.key, 'is-sm')} ${g.label}</h3><span class="mt-sub num">${g.list.length ? money(groupTotal(g.list)) : ''}</span></div>
        ${g.list.length ? `<ul class="mt-txs">${g.list.map(acctRow).join('')}</ul>` : `<p class="mt-empty">${g.key === 'loan' ? 'ไม่มีหนี้ 🎉' : 'ยังไม่มี'}</p>`}
        <button class="mt-link" data-act="newacct" data-type="${g.key}">${addLabel[g.key]}</button>
      </section>`
        )
        .join('')}
      <section class="mt-card">
        <div class="mt-card-h"><h3>โอน · จ่ายบัตร · จ่ายหนี้</h3><button class="mt-link" data-act="xfer">+ เพิ่ม</button></div>
        ${
          xfers.length
            ? `<ul class="mt-txs">${xfers
                .map(
                  (x) => `<li><div class="mt-tx">
                    <span class="mt-xfer">${acctImg(wallet(x.from).icon || 'bank', 'is-xs')}<i>→</i>${acctImg(wallet(x.to).icon || 'bank', 'is-xs')}</span>
                    <span class="mt-tx-main"><span class="mt-tx-note">${esc(x.note)}</span><span class="mt-sub">${thaiDate(x.date)} · ${esc(wallet(x.from).name)} → ${esc(wallet(x.to).name)}</span></span>
                    <span class="num mt-amt">${money(x.amount)}</span>
                    <button class="mt-x" data-act="delxfer" data-id="${x.id}" aria-label="ลบรายการนี้">✕</button></div></li>`
                )
                .join('')}</ul>`
            : '<p class="mt-empty">ย้ายเงินระหว่างบัญชี เติม e-Wallet จ่ายบัตร จ่ายหนี้ ให้ยืม — ไม่นับเป็นรายรับรายจ่าย</p>'
        }
      </section>
      ${hidden.length ? `<p class="mt-sub">บัญชีที่ซ่อนไว้: ${hidden.map((a) => esc(a.name)).join(', ')} (ยังเก็บประวัติรายการไว้)</p>` : ''}`;
  }

  // ---------------- ปฏิทิน ----------------
  function calendarView(txs) {
    const by = {};
    for (const t of txs) {
      const d = (by[t.date] ||= { inc: 0, exp: 0, n: 0 });
      d[t.type === 'income' ? 'inc' : 'exp'] += t.amount;
      d.n++;
    }
    const s = summarize(txs);
    const days = diffDays(st.cycle.from, st.cycle.to) + 1;
    const lead = (weekday(st.cycle.from) + 6) % 7; // เริ่มวันจันทร์
    const today = todayStr();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<span class="is-pad"></span>');
    for (let i = 0; i < days; i++) {
      const d = addDays(st.cycle.from, i);
      const v = by[d];
      cells.push(`<button class="${d === st.day ? 'is-on' : ''} ${d === today ? 'is-today' : ''} ${d > today ? 'is-future' : ''}" data-act="day" data-v="${d}">
        <b>${Number(d.slice(8))}</b>${v?.exp ? `<small class="num is-exp">${short(v.exp)}</small>` : ''}${v?.inc ? `<small class="num is-inc">+${short(v.inc)}</small>` : ''}</button>`);
    }
    const sel = st.day && st.day >= st.cycle.from && st.day <= st.cycle.to ? st.day : '';
    const dayTxs = sel ? txs.filter((t) => t.date === sel).sort(byNewest) : [];
    return `
      <section class="mt-card">
        <dl class="mt-kv is-row"><div><dt>รายรับ</dt><dd class="num is-inc">${money(s.income)}</dd></div><div><dt>รายจ่าย</dt><dd class="num">${money(s.expense)}</dd></div><div><dt>คงเหลือ</dt><dd class="num ${s.net < 0 ? 'is-bad' : ''}">${money(s.net)}</dd></div></dl>
        <div class="mt-cal-h">${['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="mt-cal">${cells.join('')}</div>
      </section>
      ${
        sel
          ? `<section class="mt-card"><div class="mt-card-h"><h3>${TH_DAYS[weekday(sel)]} ${thaiDate(sel)}</h3><button class="mt-btn-s" data-act="add" data-date="${sel}">+ จด</button></div>
          ${dayTxs.length ? `<ul class="mt-txs">${dayTxs.map(txItem).join('')}</ul>` : '<p class="mt-empty">วันนี้ไม่ได้ใช้เงิน 🏆</p>'}</section>`
          : '<p class="mt-sub mt-note">แตะวันที่เพื่อดูรายการของวันนั้น</p>'
      }`;
  }

  // ---------------- สลิป / ใบเสร็จ ----------------
  function slipView(txs) {
    const list = txs.filter((t) => t.attachment || t.source === 'slip').sort(byNewest);
    if (!list.length) return '<section class="mt-card"><p class="mt-empty">ยังไม่มีสลิปในรอบนี้ · ส่งรูปสลิปโอนเงินหรือใบเสร็จในแชท LINE ระบบจะอ่านยอดและเก็บรูปไว้ที่นี่</p></section>';
    return `<p class="mt-sub">${list.length} รายการจากสลิป · รวม <b class="num">${money(list.reduce((a, t) => a + (t.type === 'income' ? 0 : t.amount), 0))}</b></p>
      <div class="mt-slips">${list
        .map((t) => {
          const img = t.attachment && backend.fileUrl ? backend.fileUrl(t.attachment) : '';
          return `<button class="mt-slip" data-act="edit" data-id="${t.id}">
            ${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<span class="mt-slip-ph">🧾<small>${t.meta?.bank ? esc(t.meta.bank) : 'สลิป'}</small></span>`}
            <span class="mt-slip-b"><b class="num ${t.type === 'income' ? 'is-inc' : ''}">${t.type === 'income' ? '+' : ''}${money(t.amount)}</b><small>${esc(t.note)}</small><small>${thaiDate(t.date)}</small></span>
          </button>`;
        })
        .join('')}</div>`;
  }

  // ---------------- ตั้งค่า ----------------
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
      ['บัญชี', 'ดูยอดทุกบัญชีและบัตร'],
      ['ข้าว 50 กสิกร', 'ระบุบัญชีที่จ่าย'],
      ['ยอด กสิกร 12000', 'ตั้งยอดเงินในบัญชี'],
      ['โอน 500 กสิกร ไป ทรู', 'โอนระหว่างบัญชี'],
      ['จ่ายบัตร ktc 3000', 'ชำระบัตรเครดิต'],
      ['กดเงิน 2000 กสิกร', 'กดเงินสด'],
      ['งบ 15000', 'ตั้งงบทั้งเดือน'],
      ['งบ อาหาร 5000', 'ตั้งงบรายหมวด'],
      ['เป้า เที่ยวญี่ปุ่น 50000', 'สร้างเป้าหมาย'],
      ['ออม เที่ยวญี่ปุ่น 1000', 'หยอดกระปุก'],
      ['ประจำ ค่าเน็ต 599 ทุกวันที่ 5', 'รายการประจำ'],
      ['เตือน 21:00', 'เตือนจดทุกวัน'],
      ['หาร 900 3', 'หารบิล'],
      ['ลบ', 'ลบรายการล่าสุด'],
      ['ส่งออก', 'ดาวน์โหลด CSV'],
      ['ลบข้อมูล', 'ล้างรายการ / ลบบัญชี'],
    ];
    const menu = [
      ['tab', 'budget', 'budget', 'งบประมาณ', 'งบรวม · งบรายหมวด'],
      ['tab', 'budget', 'cal', 'เป้าหมายออม', 'กระปุก · รายการประจำ'],
      ['tab', 'wallets', 'wallets', 'กระเป๋าเงิน', 'บัญชี · บัตร · หนี้'],
      ['tab', 'report', 'report', 'รายงาน', 'วัน · เดือน · ไตรมาส · ปี'],
      ['opencal', '', 'cal', 'ปฏิทิน', 'รายรับรายจ่ายรายวัน'],
      ['tab', 'analysis', 'analysis', 'ข้อมูลเชิงลึก', 'สุขภาพการเงิน'],
      ['export', '', 'list', 'ส่งออกข้อมูล', 'CSV · Excel'],
    ];
    return `
      <div class="mt-row-h"><h2>เมนู</h2></div>
      <section class="mt-menu">${menu
        .map(([act, tab, ic, title, sub]) => `<button data-act="${act}" ${tab ? `data-tab="${tab}"` : ''}><i>${icon(ic)}</i><span><b>${title}</b><small>${sub}</small></span></button>`)
        .join('')}</section>
      <div class="mt-row-h"><h2>ตั้งค่า</h2></div>
      <section class="mt-card">
        <form class="mt-form" data-form="settings">
          <label for="mt-name">ชื่อที่ให้บอทเรียก</label>
          <input id="mt-name" name="name" value="${esc(st.data.user.name)}" maxlength="40">
          <label for="mt-reminder">เตือนจดรายจ่ายทุกวัน</label>
          <div class="mt-row"><input id="mt-reminder" name="reminder" type="time" value="${s.reminder || ''}"><span class="mt-sub">${s.reminder ? 'เปิดอยู่' : 'ปิดอยู่ (เว้นว่าง = ไม่เตือน)'}</span></div>
          <label for="mt-cycle">รอบงบเริ่มวันที่ (เช่น วันเงินเดือนออก)</label>
          <select id="mt-cycle" name="cycleStartDay">${Array.from({ length: 31 }, (_, i) => i + 1)
            .map((d) => `<option value="${d}" ${(s.cycleStartDay || 1) === d ? 'selected' : ''}>วันที่ ${d}${d === 1 ? ' (ต้นเดือน)' : ''}</option>`)
            .join('')}</select>
          <label class="mt-check"><input type="checkbox" id="mt-report" name="monthlyReport" ${s.monthlyReport !== false ? 'checked' : ''}> ส่งรายงานสรุปให้ทุกวันแรกของรอบ 09:00 น.</label>
          <label for="mt-wallet">บัญชีที่ใช้จ่ายบ่อยที่สุด (ค่าเริ่มต้น)</label>
          <select id="mt-wallet" name="defaultWallet">${walletOptions(s.defaultWallet)}</select>
          <span class="mt-sub">จดในแชทโดยไม่บอกบัญชี จะตัดจากบัญชีนี้ · <button type="button" class="mt-link" data-act="tab" data-tab="wallets">จัดการบัญชีและบัตร</button></span>
          <button class="mt-btn" type="submit">บันทึกการตั้งค่า</button>
        </form>
      </section>
      <section class="mt-card">
        <div class="mt-card-h"><h3>ข้อมูลของฉัน</h3><span class="mt-sub num">${st.data.txs.length} รายการ</span></div>
        <button class="mt-btn is-ghost" data-act="export">ส่งออก CSV (เปิดด้วย Excel ได้)</button>
        ${backend.reset ? '<button class="mt-btn is-ghost" data-act="reset">รีเซ็ตข้อมูลเดโม</button>' : ''}
      </section>
      ${
        backend.clearData
          ? `<section class="mt-card mt-danger">
        <div class="mt-card-h"><h3>ลบข้อมูล</h3></div>
        <p class="mt-sub">ลบแล้วกู้คืนไม่ได้ แนะนำให้ส่งออก CSV เก็บไว้ก่อน</p>
        <button class="mt-btn is-ghost" data-act="wipe" data-v="tx">🧹 ล้างรายการทั้งหมด (เก็บการตั้งค่าไว้)</button>
        <button class="mt-btn is-ghost is-danger-text" data-act="wipe" data-v="all">🗑 ลบบัญชีและข้อมูลทั้งหมด</button>
      </section>`
          : ''
      }
      <section class="mt-card">
        <h3>คำสั่งในแชท LINE</h3>
        <dl class="mt-cmds">${cmd.map(([c, d]) => `<div><dt>${esc(c)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>
      </section>`;
  }

  // ---------------- sheets ----------------
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
          <div class="mt-seg2">
            <button type="button" class="${type === 'expense' ? 'is-on is-exp' : ''}" data-act="sheettype" data-v="expense">รายจ่าย</button>
            <button type="button" class="${type === 'income' ? 'is-on is-inc' : ''}" data-act="sheettype" data-v="income">รายรับ</button>
          </div>
          <label for="mt-amount" class="mt-vh">จำนวนเงิน</label>
          <div class="mt-amount"><span>฿</span><input id="mt-amount" name="amount" type="number" step="any" inputmode="decimal" min="0" required value="${sh.amount ?? t.amount}" placeholder="0"></div>
          <label for="mt-note">รายการ</label>
          <input id="mt-note" name="note" value="${esc(sh.note ?? t.note)}" placeholder="เช่น ข้าวมันไก่" maxlength="120">
          <span class="mt-label">หมวด</span>
          <div class="mt-catgrid">${cats.map((c) => `<button type="button" class="${c.id === curCat ? 'is-on' : ''}" data-act="sheetcat" data-v="${c.id}"><span>${c.emoji}</span>${esc(c.name)}</button>`).join('')}</div>
          <input type="hidden" name="categoryId" value="${curCat}">
          <input type="hidden" name="type" value="${type}">
          <div class="mt-row2">
            <div><label for="mt-date">วันที่</label><input id="mt-date" name="date" type="date" value="${sh.date ?? t.date}" max="${todayStr()}"></div>
            <div><label for="mt-txwallet">${type === 'income' ? 'เข้าบัญชี' : 'จ่ายจากบัญชี'}</label><select id="mt-txwallet" name="wallet">${walletOptions(sh.wallet ?? t.wallet)}</select></div>
          </div>
          ${sh.tx?.by ? `<p class="mt-sub">จดโดย ${esc(sh.tx.by)}</p>` : ''}
          ${sh.tx?.attachment && backend.fileUrl ? `<a class="mt-attach" href="${esc(backend.fileUrl(sh.tx.attachment))}" target="_blank" rel="noopener"><img src="${esc(backend.fileUrl(sh.tx.attachment))}" alt="รูปหลักฐานของรายการนี้" loading="lazy"><span>📎 หลักฐาน · แตะเพื่อดูเต็ม</span></a>` : ''}
          <button class="mt-btn" type="submit">${sh.tx ? 'บันทึกการแก้ไข' : 'บันทึก'}</button>
          ${sh.tx ? (sh.confirmDel ? `<button class="mt-btn is-danger" type="button" data-act="deltx" data-id="${sh.tx.id}">ยืนยันลบรายการนี้</button>` : `<button class="mt-btn is-ghost" type="button" data-act="askdel">ลบรายการ</button>`) : ''}
        </form>`;
    } else if (sh.kind === 'acct' || sh.kind === 'newacct') {
      const a = sh.kind === 'acct' ? acctById(sh.id) : null;
      const type = sh.type || a?.type || 'bank';
      const isCard = type === 'card';
      const isLoan = type === 'loan';
      const liab = isCard || isLoan;
      const provs = st.data.providers.filter((p) => (type === 'loan' ? p.types.includes('bank') || p.types.includes('card') : p.types.includes(type)));
      const prov = sh.provider ?? a?.provider ?? '';
      const figure = a ? (a.known ? (liab ? a.used : a.balance) : '') : '';
      const txs = a ? st.data.txs.filter((t) => t.wallet === a.id).sort(byNewest).slice(0, 6) : [];
      const typeBtn = (v, l) => `<button type="button" class="${type === v ? 'is-on' : ''}" data-act="accttype" data-v="${v}">${l}</button>`;
      inner = `
        ${
          a
            ? `<div class="mt-acct-head">${acctImg(a.icon, 'is-lg')}
                <div><b class="num ${a.type === 'loan' ? 'is-neg' : ''}">${acctFigure(a)}</b><span class="mt-sub">${esc(a.type === 'loan' || a.type === 'receivable' ? acctSub(a) : a.type === 'card' ? (a.known ? 'ยอดใช้รวม (รูดค้าง + ผ่อน)' : 'รูดรอบนี้ (ยังไม่ตั้งยอด)') : `${a.known ? 'ยอดคงเหลือ' : 'ยังไม่ได้ตั้งยอด'} · รอบนี้ใช้ ${money(a.spent || 0)}`)}</span></div></div>
              ${a.type === 'card' && a.known ? cardDetail(a) : ''}
              ${a.type === 'loan' && a.principal ? bar(a.pctPaid, 'var(--green)', 'is-lg') : ''}`
            : ''
        }
        <form class="mt-form" data-form="acct">
          <span class="mt-label">ประเภท</span>
          <div class="mt-seg4">${typeBtn('bank', 'ธนาคาร')}${typeBtn('ewallet', 'e-Wallet')}${typeBtn('card', 'บัตรเครดิต')}${typeBtn('cash', 'เงินสด')}${typeBtn('loan', 'หนี้สิน')}${typeBtn('receivable', 'ค้างรับ')}</div>
          <input type="hidden" name="type" value="${type}">
          ${
            type === 'cash' || type === 'receivable'
              ? ''
              : `<span class="mt-label">${isCard ? 'ธนาคาร/ผู้ออกบัตร' : type === 'ewallet' ? 'ผู้ให้บริการ' : isLoan ? 'กู้กับธนาคาร (ถ้ามี)' : 'ธนาคาร'}</span>
          <div class="mt-provs" role="radiogroup">${[{ id: '', short: 'อื่นๆ' }, ...provs]
            .map((p) => `<button type="button" role="radio" aria-checked="${p.id === prov}" class="${p.id === prov ? 'is-on' : ''}" data-act="acctprov" data-v="${p.id}">${acctImg(p.id || type)}<span>${esc(p.short || p.name)}</span></button>`)
            .join('')}</div>
          <input type="hidden" name="provider" value="${esc(prov)}">`
          }
          <label for="mt-acctname">ชื่อที่ใช้เรียก (พิมพ์ชื่อนี้ในแชทเพื่อเลือกบัญชี)</label>
          <input id="mt-acctname" name="name" value="${esc(sh.name ?? a?.name ?? '')}" placeholder="${isCard ? 'เช่น KTC, บัตรกสิกร' : type === 'ewallet' ? 'เช่น TrueMoney' : type === 'cash' ? 'เช่น เงินสด' : isLoan ? 'เช่น ผ่อนรถ, กยศ, ยืมแม่' : type === 'receivable' ? 'เช่น ต้น (ยืมไป)' : 'เช่น กสิกร, SCB เงินเก็บ'}" maxlength="30">
          <label for="mt-bal">${isCard ? 'ยอดรูดที่ยังไม่ได้จ่าย (ไม่รวมยอดผ่อนสินค้า)' : isLoan ? 'ยอดหนี้คงค้างตอนนี้' : type === 'receivable' ? 'ยอดที่เขายังติดเราอยู่' : 'ยอดเงินตอนนี้'}</label>
          <div class="mt-amount is-sm"><span>฿</span><input id="mt-bal" name="balance" type="number" inputmode="decimal" step="0.01" value="${sh.balance ?? figure}" placeholder="0"></div>
          ${
            isCard
              ? `<div class="mt-row2">
            <div><label for="mt-limit">วงเงินบัตร</label><input id="mt-limit" name="limit" type="number" step="any" inputmode="decimal" min="0" value="${sh.limit ?? a?.limit ?? ''}" placeholder="เช่น 20000"></div>
            <div><label for="mt-cbud">งบรูดต่อรอบ (ไม่ใส่ก็ได้)</label><input id="mt-cbud" name="cycleBudget" type="number" step="any" inputmode="decimal" min="0" value="${sh.cycleBudget ?? a?.cycleBudget ?? ''}" placeholder="เช่น 5000"></div>
          </div>
          <div class="mt-row2">
            <div><label for="mt-sday">วันตัดรอบบัญชี</label><input id="mt-sday" name="statementDay" type="number" inputmode="numeric" min="1" max="28" value="${sh.statementDay ?? a?.statementDay ?? ''}" placeholder="เช่น 18"></div>
            <div><label for="mt-due">ชำระภายในวันที่</label><input id="mt-due" name="dueDay" type="number" inputmode="numeric" min="1" max="31" value="${sh.dueDay ?? a?.dueDay ?? ''}" placeholder="เช่น 1"></div>
          </div>`
              : ''
          }
          ${
            isLoan
              ? `<div class="mt-row2">
            <div><label for="mt-pay">ค่างวดต่อเดือน</label><input id="mt-pay" name="monthlyPayment" type="number" step="any" inputmode="decimal" min="0" value="${sh.monthlyPayment ?? a?.monthlyPayment ?? ''}" placeholder="เช่น 6500"></div>
            <div><label for="mt-rate">ดอกเบี้ยต่อปี (%)</label><input id="mt-rate" name="rate" type="number" inputmode="decimal" min="0" step="0.01" value="${sh.rate ?? a?.rate ?? ''}" placeholder="เช่น 3.5"></div>
          </div>
          <div class="mt-row2">
            <div><label for="mt-principal">ยอดกู้ตั้งต้น</label><input id="mt-principal" name="principal" type="number" step="any" inputmode="decimal" min="0" value="${sh.principal ?? a?.principal ?? ''}" placeholder="ไว้ดู % ที่จ่ายแล้ว"></div>
            <div><label for="mt-due">จ่ายทุกวันที่</label><input id="mt-due" name="dueDay" type="number" inputmode="numeric" min="1" max="31" value="${sh.dueDay ?? a?.dueDay ?? ''}" placeholder="เช่น 5"></div>
          </div>
          <div class="mt-inst">
            <b>ผ่อนเป็นงวด (เช่น ผ่อนสินค้า 0%)</b>
            <label for="mt-via">ผ่อนผ่านบัตรเครดิต</label>
            <select id="mt-via" name="viaCard"><option value="">ไม่ผ่านบัตร (ผ่อนกับร้าน/ไฟแนนซ์/ธนาคาร)</option>${st.data.accounts
              .filter((c) => c.type === 'card' && !c.archived)
              .map((c) => `<option value="${c.id}" ${(sh.viaCard ?? a?.viaCard ?? '') === c.id ? 'selected' : ''}>💳 ${esc(c.name)}</option>`)
              .join('')}</select>
            <div class="mt-row2">
              <div><label for="mt-ninst">จำนวนงวดทั้งหมด</label><input id="mt-ninst" name="installments" type="number" inputmode="numeric" min="0" max="360" value="${sh.installments ?? a?.installments ?? ''}" placeholder="เช่น 36"></div>
              <div><label for="mt-billinst">งวดบนบิลล่าสุด</label><input id="mt-billinst" name="billInstallment" type="number" inputmode="numeric" min="0" max="360" value="${sh.billInstallment ?? (a?.installments ? Math.min(a.installments, (a.paidInstallments || 0) + 1) : '')}" placeholder="เช่น 12 (จาก 12/36)"></div>
            </div>
            <label class="mt-check"><input type="checkbox" name="billPaid" ${sh.billPaid ? 'checked' : ''}> จ่ายบิลงวดนั้นไปแล้ว</label>
            <span class="mt-sub">ใส่ ค่างวด + จำนวนงวด + งวดบนบิล ระบบคิดยอดคงเหลือให้เอง (ไม่ต้องกรอกยอดหนี้ด้านบน)</span>
          </div>`
              : ''
          }
          <p class="mt-sub">${a ? 'แก้ยอดเมื่อไรก็ได้ ระบบจะนับรายการต่อจากยอดใหม่' : 'ใส่ยอดตอนนี้ แล้วทุกรายการที่จดจะตัด/เพิ่มยอดให้อัตโนมัติ'}</p>
          <button class="mt-btn" type="submit">${a ? 'บันทึก' : 'เพิ่มบัญชี'}</button>
        </form>
        ${
          a
            ? `<div class="mt-card-h"><h3>รายการล่าสุดของบัญชีนี้</h3>${txs.length ? `<button class="mt-link" data-act="acctlist" data-id="${a.id}">ดูทั้งหมด</button>` : ''}</div>
              ${txs.length ? `<ul class="mt-txs">${txs.map(txItem).join('')}</ul>` : '<p class="mt-empty">ยังไม่มีรายการ</p>'}
              <button class="mt-btn is-ghost" type="button" data-act="xfer" data-id="${a.id}">${{ card: '💳 จ่ายบัตรนี้', loan: '🧾 จ่ายหนี้ / ผ่อนงวด', receivable: '💚 บันทึกการได้เงินคืน' }[a.type] || '⇄ โอนเงินจากบัญชีนี้'}</button>
              ${
                sh.confirmDel
                  ? `<button class="mt-btn is-danger" type="button" data-act="delacct" data-id="${a.id}">ยืนยันลบ${a.count ? ' (ซ่อนไว้ ประวัติยังอยู่)' : ''}</button>`
                  : `<button class="mt-btn is-ghost is-danger-text" type="button" data-act="askdelacct">ลบบัญชีนี้</button>`
              }`
            : ''
        }`;
    } else if (sh.kind === 'xfer') {
      const list = activeAccts();
      const to = sh.to ?? (list.find((a) => a.type === 'card')?.id || list[1]?.id || '');
      const from = sh.from ?? (list.find((a) => a.type === 'bank' && a.id !== to)?.id || list.find((a) => a.id !== to)?.id || '');
      const toAcc = acctById(to);
      const opt = (cur) => list.map((a) => `<option value="${a.id}" ${a.id === cur ? 'selected' : ''}>${a.emoji} ${esc(a.name)}</option>`).join('');
      const suggest = toAcc?.type === 'card' && toAcc.known && toAcc.payNow > 0 ? toAcc.payNow : toAcc?.type === 'loan' ? toAcc.monthlyPayment || '' : '';
      inner = `
        <form class="mt-form" data-form="xfer">
          <p class="mt-sub">ย้ายเงินระหว่างบัญชีของเรา เช่น โอนเข้าบัญชีเก็บ เติม e-Wallet กดเงินสด หรือจ่ายบัตรเครดิต · ไม่นับเป็นรายรับรายจ่าย</p>
          <div class="mt-row2">
            <div><label for="mt-xfrom">จากบัญชี</label><select id="mt-xfrom" name="from" data-change="xfer">${opt(from)}</select></div>
            <div><label for="mt-xto">ไปบัญชี</label><select id="mt-xto" name="to" data-change="xfer">${opt(to)}</select></div>
          </div>
          <label for="mt-xamt" class="mt-vh">จำนวนเงิน</label>
          <div class="mt-amount"><span>฿</span><input id="mt-xamt" name="amount" type="number" step="any" inputmode="decimal" min="0" required value="${sh.amount ?? suggest}" placeholder="0"></div>
          ${toAcc && isLiab(toAcc) ? `<p class="mt-sub">${esc(toAcc.name)} ${toAcc.known ? (toAcc.type === 'card' ? `ต้องจ่ายบิล ${money(toAcc.payNow)}${toAcc.instDue ? ` (รวมค่างวดผ่อน ${money(toAcc.instDue)} ระบบตัดให้เอง)` : ''}` : `ยอดค้างจ่าย ${money(toAcc.used)}`) : 'ยังไม่ได้ตั้งยอด'}</p>` : ''}
          <div class="mt-row2">
            <div><label for="mt-xdate">วันที่</label><input id="mt-xdate" name="date" type="date" value="${sh.date ?? todayStr()}" max="${todayStr()}"></div>
            <div><label for="mt-xnote">บันทึก</label><input id="mt-xnote" name="note" value="${esc(sh.note ?? '')}" placeholder="ไม่ใส่ก็ได้" maxlength="80"></div>
          </div>
          <button class="mt-btn" type="submit">${toAcc?.type === 'card' ? 'บันทึกการจ่ายบัตร' : toAcc?.type === 'loan' ? 'บันทึกการจ่ายหนี้' : 'บันทึกการโอน'}</button>
        </form>`;
    } else if (sh.kind === 'catbudget') {
      const c = cat(sh.id);
      const spent = summarize(cycleTxs()).cats.find((x) => x.id === c.id)?.total || 0;
      const lim = st.data.settings.catBudgets?.[c.id] || '';
      inner = `<form class="mt-form" data-form="catbudget"><input type="hidden" name="id" value="${c.id}">
        <p class="mt-sub">รอบนี้ใช้ไป <b class="num">${money(spent)}</b>${lim ? ` จากงบ <b class="num">${money(lim)}</b>` : ''}</p>
        ${lim ? bar(spent / lim, budgetTone(spent / lim), 'is-lg') : ''}
        <label for="mt-catlim">งบหมวดนี้ต่อเดือน (เว้นว่าง = ไม่ตั้ง)</label>
        <input id="mt-catlim" name="limit" type="number" step="any" inputmode="numeric" min="0" value="${lim}" placeholder="เช่น 5000">
        <button class="mt-btn" type="submit">บันทึกงบ</button>
        <button class="mt-btn is-ghost" type="button" data-act="filtercat" data-id="${c.id}">ดูรายการในหมวดนี้</button></form>`;
    } else if (sh.kind === 'total') {
      inner = `<form class="mt-form" data-form="total">
        <label for="mt-total">งบรวมต่อเดือน (บาท)</label>
        <input id="mt-total" name="total" type="number" step="any" inputmode="numeric" min="0" value="${st.data.settings.monthlyBudget || ''}" placeholder="เช่น 15000">
        <div class="mt-chips">${[10000, 15000, 20000, 30000].map((v) => `<button type="button" class="mt-chip" data-act="preset" data-v="${v}">${money(v)}</button>`).join('')}</div>
        <button class="mt-btn" type="submit">บันทึกงบ</button></form>`;
    } else if (sh.kind === 'cycle') {
      inner = `<form class="mt-form" data-form="cycle">
        <p class="mt-sub">สรุป งบ และรายงานประจำเดือนจะนับตามรอบนี้ แนะนำให้ตั้งเป็นวันที่เงินเดือนออก</p>
        <label for="mt-cycle2">รอบงบเริ่มวันที่</label>
        <select id="mt-cycle2" name="day">${Array.from({ length: 31 }, (_, i) => i + 1)
          .map((d) => `<option value="${d}" ${(st.data.settings.cycleStartDay || 1) === d ? 'selected' : ''}>วันที่ ${d}</option>`)
          .join('')}</select>
        <button class="mt-btn" type="submit">บันทึกรอบงบ</button></form>`;
    } else if (sh.kind === 'goal') {
      inner = `<form class="mt-form" data-form="goal">
        <label for="mt-goal-name">ชื่อเป้าหมาย</label><input id="mt-goal-name" name="name" required placeholder="เช่น เที่ยวญี่ปุ่น" maxlength="40">
        <label for="mt-goal-target">ยอดเป้าหมาย (บาท)</label><input id="mt-goal-target" name="target" type="number" step="any" inputmode="numeric" min="1" required placeholder="50000">
        <label for="mt-goal-emoji">ไอคอน</label><select id="mt-goal-emoji" name="emoji">${['🎯', '🗾', '✈️', '🏠', '🚗', '💍', '🛟', '📱', '🎓'].map((e) => `<option>${e}</option>`).join('')}</select>
        <button class="mt-btn" type="submit">สร้างเป้าหมาย</button></form>`;
    } else if (sh.kind === 'deposit') {
      inner = `<form class="mt-form" data-form="deposit"><input type="hidden" name="id" value="${sh.id}">
        <label for="mt-dep">จำนวนเงิน (ใส่ลบเพื่อถอน)</label><input id="mt-dep" name="amount" type="number" step="any" inputmode="decimal" required placeholder="1000">
        <button class="mt-btn" type="submit">หยอดกระปุก</button></form>`;
    } else if (sh.kind === 'rec') {
      inner = `<form class="mt-form" data-form="rec">
        <div class="mt-seg"><label><input type="radio" name="type" value="expense" checked> รายจ่าย</label><label><input type="radio" name="type" value="income"> รายรับ</label></div>
        <label for="mt-rec-note">รายการ</label><input id="mt-rec-note" name="note" required placeholder="เช่น ค่าเน็ต" maxlength="60">
        <div class="mt-row2"><div><label for="mt-rec-amount">จำนวนเงิน</label><input id="mt-rec-amount" name="amount" type="number" step="any" inputmode="decimal" min="1" required placeholder="599"></div>
        <div><label for="mt-rec-day">ทุกวันที่</label><input id="mt-rec-day" name="day" type="number" min="1" max="31" required value="1"></div></div>
        <label for="mt-rec-cat">หมวด</label><select id="mt-rec-cat" name="categoryId">${st.data.categories.map((c) => `<option value="${c.id}">${c.emoji} ${esc(c.name)} (${c.type === 'income' ? 'รับ' : 'จ่าย'})</option>`).join('')}</select>
        <label for="mt-rec-wallet">บัญชี</label><select id="mt-rec-wallet" name="wallet">${walletOptions(st.data.settings.defaultWallet)}</select>
        <button class="mt-btn" type="submit">เพิ่มรายการประจำ</button></form>`;
    } else if (sh.kind === 'wipe') {
      const all = sh.mode === 'all';
      inner = `<form class="mt-form" data-form="wipe">
        <p class="mt-sub">${
          all
            ? 'จะลบทุกอย่างของบัญชีนี้: รายรับรายจ่าย เป้าหมาย รายการประจำ การตั้งค่า และรูปสลิปที่แนบไว้'
            : `จะลบรายรับรายจ่าย ${st.data.txs.length} รายการ เป้าหมาย และรายการประจำ แต่เก็บงบ รอบบัญชี และเวลาเตือนไว้`
        }</p>
        <label for="mt-wipe">พิมพ์คำว่า <b>ลบ</b> เพื่อยืนยัน</label>
        <input id="mt-wipe" name="confirm" autocomplete="off" placeholder="ลบ" required>
        <button class="mt-btn is-danger" type="submit">${all ? 'ลบบัญชีถาวร' : 'ล้างรายการทั้งหมด'}</button>
        <button class="mt-btn is-ghost" type="button" data-act="close">ยกเลิก</button></form>`;
    } else if (sh.kind === 'csv') {
      inner = `<p class="mt-sub">ในเดโมนี้ดาวน์โหลดไฟล์ไม่ได้ คัดลอกข้อความด้านล่างไปวางใน Excel หรือ Google Sheets แทนได้ (ตัวจริงบนเซิร์ฟเวอร์ดาวน์โหลดเป็นไฟล์ .csv)</p>
        <textarea id="mt-csv" class="mt-csv" readonly rows="10">${esc(sh.csv.replace(/^﻿/, ''))}</textarea>
        <button class="mt-btn" type="button" data-act="copycsv">คัดลอกทั้งหมด</button>`;
    }
    const titles = {
      acct: sh.kind === 'acct' ? acctById(sh.id)?.name || 'บัญชี' : '',
      newacct: 'เพิ่มบัญชี · บัตร · หนี้',
      xfer: 'โอนระหว่างบัญชี / จ่ายบัตร',
      csv: 'ส่งออกข้อมูล (CSV)',
      wipe: sh.mode === 'all' ? 'ลบบัญชีและข้อมูลทั้งหมด' : 'ล้างรายการทั้งหมด',
      tx: sh.tx ? 'แก้ไขรายการ' : 'จดรายการ',
      catbudget: sh.id ? `งบหมวด${cat(sh.id).name}` : '',
      total: 'งบรวมต่อเดือน',
      cycle: 'รอบงบ',
      goal: 'เป้าหมายใหม่',
      deposit: 'หยอดกระปุก',
      rec: 'รายการประจำใหม่',
    };
    return `<div class="mt-scrim" data-act="close"></div>
      <div class="mt-sheet" role="dialog" aria-modal="true" aria-label="${esc(titles[sh.kind])}">
        <div class="mt-sheet-h"><h3>${esc(titles[sh.kind])}</h3><button class="mt-x" data-act="close" aria-label="ปิด">✕</button></div>${inner}</div>`;
  }

  function nav() {
    const on = st.tab === 'budget' ? 'settings' : st.tab;
    const item = (tab, label) => `<button class="${on === tab ? 'is-on' : ''}" data-act="tab" data-tab="${tab}" aria-label="${label}">${icon(tab)}<span>${label}</span></button>`;
    return `<nav class="mt-nav">${item('home', 'สรุป')}${item('wallets', 'กระเป๋า')}${item('report', 'รายงาน')}${item('analysis', 'เชิงลึก')}${item('list', 'รายการ')}${item('settings', 'เมนู')}</nav>`;
  }

  function render() {
    if (st.error && !st.data) {
      root.innerHTML = '<div class="mt-loading"><p></p></div>';
      root.querySelector('p').textContent = st.error;
      return;
    }
    if (!st.data) return;
    const searchFocused = document.activeElement?.id === 'mt-search';
    const scroller = root.querySelector('.mt-main');
    const scrollTop = scroller?.scrollTop || 0;
    const views = { home: homeView, analysis: analysisView, budget: budgetView, list: listView, settings: settingsView, wallets: walletsView, report: reportView };
    root.innerHTML = `<main class="mt-main">${views[st.tab]()}</main>${nav()}${sheetView()}${st.toast ? `<div class="mt-toast" role="status">${esc(st.toast)}</div>` : ''}`;
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
      case 'more':
        st.more = !st.more;
        render();
        break;
      case 'side':
        st.side = b.dataset.v;
        render();
        break;
      case 'filtercat':
        st.cat = b.dataset.id;
        st.tab = 'list';
        st.sheet = null;
        render();
        break;
      case 'type':
        st.type = b.dataset.v;
        render();
        break;
      case 'rptab':
        st.rp.tab = b.dataset.v;
        render();
        break;
      case 'rpperiod':
        st.rp.period = b.dataset.v;
        st.rp.offset = 0;
        if (b.closest('.mt-quick')) {
          st.rp.tab = 'overview';
          root.querySelector('.mt-main')?.scrollTo(0, 0);
        }
        render();
        break;
      case 'rpnav':
        st.rp.offset = Math.min(0, st.rp.offset + Number(b.dataset.d));
        render();
        break;
      case 'rpshow':
        st.rp.show[b.dataset.v] = !st.rp.show[b.dataset.v];
        render();
        break;
      case 'rpchart':
        st.rp.chart = b.dataset.v;
        render();
        break;
      case 'opencal':
        st.tab = 'list';
        st.listMode = 'cal';
        render();
        root.querySelector('.mt-main')?.scrollTo(0, 0);
        break;
      case 'listmode':
        st.listMode = b.dataset.v;
        render();
        break;
      case 'day':
        st.day = st.day === b.dataset.v ? '' : b.dataset.v;
        render();
        break;
      case 'acct':
        st.sheet = { kind: 'acct', id: b.dataset.id };
        render();
        break;
      case 'newacct':
        st.sheet = { kind: 'newacct', type: b.dataset.type === 'cash' || !b.dataset.type ? b.dataset.type || 'bank' : b.dataset.type };
        render();
        break;
      case 'acctprov': {
        const f = root.querySelector('form[data-form="acct"]');
        if (f) {
          const fd = new FormData(f);
          for (const k of ['name', 'balance', 'limit', 'cycleBudget', 'statementDay', 'dueDay', 'monthlyPayment', 'rate', 'principal', 'installments', 'billInstallment', 'viaCard']) if (fd.has(k)) sh[k] = fd.get(k);
          // ชื่อยังว่าง → ใช้ชื่อธนาคารที่เลือก
          const p = st.data.providers.find((x) => x.id === b.dataset.v);
          if (p && !String(sh.name || '').trim()) sh.name = p.short;
        }
        sh.provider = b.dataset.v;
        render();
        break;
      }
      case 'accttype': {
        const f = root.querySelector('form[data-form="acct"]');
        if (f) {
          const fd = new FormData(f);
          Object.assign(sh, { name: fd.get('name'), balance: fd.get('balance') });
        }
        // ชื่อที่เติมให้อัตโนมัติจากธนาคารเดิม ล้างทิ้งเมื่อเปลี่ยนประเภท
        const autoName = st.data.providers.find((x) => x.id === (sh.provider ?? ''))?.short;
        if (autoName && sh.name === autoName) sh.name = '';
        sh.type = b.dataset.v;
        sh.provider = '';
        render();
        break;
      }
      case 'newinst':
        st.sheet = { kind: 'newacct', type: 'loan', viaCard: b.dataset.id };
        render();
        break;
      case 'askdelacct':
        sh.confirmDel = true;
        render();
        break;
      case 'delacct':
        act(() => backend.deleteAccountItem(b.dataset.id), 'ลบบัญชีแล้ว');
        break;
      case 'xfer': {
        const a = b.dataset.id ? acctById(b.dataset.id) : null;
        st.sheet = { kind: 'xfer', ...(a ? (isLiab(a) ? { to: a.id, amount: a.type === 'loan' && a.monthlyPayment ? a.monthlyPayment : undefined } : { from: a.id }) : {}) };
        render();
        break;
      }
      case 'delxfer':
        act(() => backend.deleteTransfer(b.dataset.id), 'ลบรายการโอนแล้ว');
        break;
      case 'acctlist':
        st.wallet = b.dataset.id || '';
        st.tab = 'list';
        st.sheet = null;
        render();
        root.querySelector('.mt-main')?.scrollTo(0, 0);
        break;
      case 'add':
        st.sheet = { kind: 'tx', ...(b.dataset.date ? { date: b.dataset.date } : {}) };
        render();
        root.querySelector('#mt-amount')?.focus();
        break;
      case 'edit':
        st.sheet = { kind: 'tx', tx: st.data.txs.find((t) => t.id === b.dataset.id) };
        render();
        break;
      case 'editcat':
        st.sheet = { kind: 'catbudget', id: b.dataset.id };
        render();
        break;
      case 'edittotal':
        st.sheet = { kind: 'total' };
        render();
        break;
      case 'editcycle':
        st.sheet = { kind: 'cycle' };
        render();
        break;
      case 'preset':
        root.querySelector('#mt-total').value = b.dataset.v;
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
        act(() => backend.deposit(b.dataset.id, Number(b.dataset.v)), `🐷 หยอดกระปุก ${money(Number(b.dataset.v))} แล้ว`).then((ok) => ok && coinBurst());
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
      case 'wipe':
        st.sheet = { kind: 'wipe', mode: b.dataset.v };
        render();
        break;
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

  root.addEventListener('change', (e) => {
    if (e.target.dataset.change === 'xfer' && st.sheet?.kind === 'xfer') {
      const fd = Object.fromEntries(new FormData(e.target.form));
      Object.assign(st.sheet, { from: fd.from, to: fd.to, amount: e.target.name === 'to' ? undefined : fd.amount, date: fd.date, note: fd.note });
      render();
      return;
    }
    if (e.target.dataset.change === 'mode') act(() => backend.saveSettings({ budgetMode: e.target.value }), e.target.value === 'category' ? 'ใช้งบแยกหมวดแล้ว' : 'ใช้งบรวมทั้งเดือนแล้ว');
  });

  root.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const fd = Object.fromEntries(new FormData(f));
    switch (f.dataset.form) {
      case 'tx': {
        const body = { ...fd, amount: Number(fd.amount) };
        if (st.sheet.tx) act(() => backend.updateTx(st.sheet.tx.id, body), 'บันทึกการแก้ไขแล้ว');
        else act(() => backend.addTx(body), `🪙 จดแล้ว ${money(body.amount)}`).then((ok) => ok && coinBurst());
        break;
      }
      case 'catbudget': {
        const catBudgets = { ...(st.data.settings.catBudgets || {}) };
        if (Number(fd.limit) > 0) catBudgets[fd.id] = Number(fd.limit);
        else delete catBudgets[fd.id];
        act(() => backend.saveSettings({ catBudgets }), 'บันทึกงบหมวดแล้ว');
        break;
      }
      case 'total':
        act(() => backend.saveSettings({ monthlyBudget: Number(fd.total) || 0 }), 'บันทึกงบรวมแล้ว');
        break;
      case 'wipe':
        if (fd.confirm.trim() !== 'ลบ') {
          toast('พิมพ์คำว่า "ลบ" ให้ตรงก่อนนะ');
          break;
        }
        if (st.sheet.mode === 'all') {
          backend
            .deleteAccount()
            .then(() => {
              if (backend.reset) return act(() => Promise.resolve(), 'ลบบัญชีแล้ว (เดโมเริ่มข้อมูลตัวอย่างใหม่)');
              st.data = null;
              root.innerHTML = `<div class="mt-loading">${opts.logoUrl ? `<img src="${esc(opts.logoUrl)}" alt="">` : ''}<p>ลบบัญชีและข้อมูลทั้งหมดแล้ว<br>ขอบคุณที่ใช้หมุนตังค์ 🙏</p></div>`;
            })
            .catch((e) => toast(`ลบไม่สำเร็จ: ${e.message}`));
        } else act(() => backend.clearData(), '🧹 ล้างรายการทั้งหมดแล้ว');
        break;
      case 'cycle':
        act(() => backend.saveSettings({ cycleStartDay: Number(fd.day) }), 'บันทึกรอบงบแล้ว');
        break;
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
      case 'acct': {
        const body = { type: fd.type, name: fd.name, provider: fd.provider ?? '' };
        if (fd.balance !== '') body.balance = Number(fd.balance);
        if (fd.type === 'card') Object.assign(body, { limit: Number(fd.limit) || 0, dueDay: fd.dueDay ? Number(fd.dueDay) : null, statementDay: fd.statementDay ? Number(fd.statementDay) : null, cycleBudget: Number(fd.cycleBudget) || 0 });
        if (fd.type === 'loan') {
          Object.assign(body, { monthlyPayment: Number(fd.monthlyPayment) || 0, rate: Number(fd.rate) || 0, principal: Number(fd.principal) || 0, dueDay: fd.dueDay ? Number(fd.dueDay) : null, viaCard: fd.viaCard || null, installments: Number(fd.installments) || 0 });
          // งวดบนบิล 12/36 ที่ยังไม่จ่าย = จ่ายไปแล้ว 11 งวด
          if (Number(fd.installments) > 0 && fd.billInstallment !== '') body.paidInstallments = Math.max(0, Number(fd.billInstallment) - (fd.billPaid ? 0 : 1));
        }
        if (st.sheet.kind === 'acct') act(() => backend.updateAccount(st.sheet.id, body), 'บันทึกบัญชีแล้ว');
        else act(() => backend.addAccount(body), `เพิ่ม${fd.name ? ` ${fd.name}` : 'บัญชี'}แล้ว`);
        break;
      }
      case 'xfer':
        act(() => backend.addTransfer({ ...fd, amount: Number(fd.amount) }), fd.to && acctById(fd.to)?.type === 'card' ? '💳 บันทึกการจ่ายบัตรแล้ว' : '⇄ บันทึกการโอนแล้ว');
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
    tip.style.left = `${Math.min(chart.width - 90, Math.max(90, r.left - chart.left + r.width / 2))}px`;
  });
  root.addEventListener('pointerleave', () => {
    const tip = root.querySelector('.mt-tip');
    if (tip) tip.hidden = true;
  });

  return {
    refresh,
    show(view, editId) {
      // view อาจมีพารามิเตอร์ต่อท้าย เช่น "wallets&acct=<id>" (ลิงก์จากการ์ดบัญชีในแชท)
      const [tab, ...rest] = String(view || '').split('&');
      const acct = new URLSearchParams(rest.join('&')).get('acct');
      if (TABS.includes(tab)) st.tab = tab;
      if (acct && st.data && acctById(acct)) st.sheet = { kind: 'acct', id: acct };
      if (editId) {
        const tx = st.data?.txs.find((t) => t.id === editId);
        if (tx) st.sheet = { kind: 'tx', tx };
      }
      render();
    },
  };
}

/** วงแหวนกระปุกออมสิน */
function ring(p, emoji) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, p)));
  return `<div class="mt-ring" aria-hidden="true"><svg viewBox="0 0 62 62">
    <circle cx="31" cy="31" r="${r}" fill="none" stroke="var(--track)" stroke-width="7"></circle>
    <circle cx="31" cy="31" r="${r}" fill="none" stroke="var(--gold)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"></circle>
  </svg><span>${esc(emoji)}</span></div>`;
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
