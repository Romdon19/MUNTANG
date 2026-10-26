// แดชบอร์ดหมุนตังค์ (LIFF) — โครงแบบป้านวล: สรุป · วิเคราะห์ · หมวด/งบ · รายการ · ตั้งค่า
// mountDashboard(root, backend, { logoUrl, peekUrl })
import { money } from '../core/format.js';
import { todayStr, thaiDate, TH_DAYS, weekday, cycleOf, shiftCycle, diffDays, addDays } from '../core/dates.js';
import { summarize } from '../core/ops.js';
import { moodFor } from '../core/mood.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const SOURCE_LABEL = { chat: 'แชท', slip: 'สลิป', app: 'แอป', ai: 'AI', recurring: 'ประจำ', pdf: 'PDF' };
const TABS = ['home', 'analysis', 'budget', 'list', 'settings'];
const DAY_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

// ไอคอนเส้นแบบแอปป้านวล
const ICON = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  analysis: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
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
  };

  root.classList.add('mt-app');
  root.innerHTML = `<div class="mt-loading"><img src="${esc(opts.logoUrl || '')}" alt=""><span>กำลังหมุน...</span></div>`;

  const cat = (id) => st.data.categories.find((c) => c.id === id) || st.data.categories.find((c) => c.id === 'other');
  const wallet = (id) => st.data.wallets.find((w) => w.id === id) || st.data.wallets[0];
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
    return `<svg class="mt-donut" viewBox="0 0 128 128" role="img" aria-label="สัดส่วนรายจ่ายตามหมวด">${arcs}
      <text x="64" y="60" text-anchor="middle" class="mt-donut-l">รายจ่าย</text>
      <text x="64" y="78" text-anchor="middle" class="mt-donut-v">${short(s.expense)}</text></svg>`;
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
      ${
        cur
          ? `<section class="mt-says" data-level="${m.level}">
              ${opts.peekUrl ? `<img src="${esc(opts.peekUrl)}" alt="">` : ''}
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
      <div class="mt-row-h"><h2>วิเคราะห์</h2>${cycleSwitch()}</div>
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
    if (st.q) {
      const q = st.q.toLowerCase();
      txs = txs.filter((t) => t.note.toLowerCase().includes(q) || cat(t.categoryId).name.includes(q));
    }
    txs.sort(byNewest);
    const groups = {};
    for (const t of txs) (groups[t.date] ||= []).push(t);
    const s = summarize(txs);
    const chip = (v, l) => `<button class="mt-chip ${st.type === v ? 'is-on' : ''}" data-act="type" data-v="${v}">${l}</button>`;
    return `
      <div class="mt-row-h"><h2>รายการ</h2>${cycleSwitch()}</div>
      <div class="mt-filters">
        <input id="mt-search" type="search" placeholder="ค้นหา เช่น กาแฟ" value="${esc(st.q)}" autocomplete="off">
        <div class="mt-chips">${chip('all', 'ทั้งหมด')}${chip('expense', 'รายจ่าย')}${chip('income', 'รายรับ')}
          ${st.cat ? `<button class="mt-chip is-on" data-act="filtercat" data-id="">${cat(st.cat).emoji} ${esc(cat(st.cat).name)} ✕</button>` : ''}
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
    return `
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
          <label for="mt-wallet">ช่องทางจ่ายเริ่มต้น</label>
          <select id="mt-wallet" name="defaultWallet">${st.data.wallets.map((w) => `<option value="${w.id}" ${s.defaultWallet === w.id ? 'selected' : ''}>${w.emoji} ${esc(w.name)}</option>`).join('')}</select>
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
          <div class="mt-amount"><span>฿</span><input id="mt-amount" name="amount" type="number" inputmode="decimal" step="0.01" min="0" required value="${sh.amount ?? t.amount}" placeholder="0"></div>
          <label for="mt-note">รายการ</label>
          <input id="mt-note" name="note" value="${esc(sh.note ?? t.note)}" placeholder="เช่น ข้าวมันไก่" maxlength="120">
          <span class="mt-label">หมวด</span>
          <div class="mt-catgrid">${cats.map((c) => `<button type="button" class="${c.id === curCat ? 'is-on' : ''}" data-act="sheetcat" data-v="${c.id}"><span>${c.emoji}</span>${esc(c.name)}</button>`).join('')}</div>
          <input type="hidden" name="categoryId" value="${curCat}">
          <input type="hidden" name="type" value="${type}">
          <div class="mt-row2">
            <div><label for="mt-date">วันที่</label><input id="mt-date" name="date" type="date" value="${sh.date ?? t.date}" max="${todayStr()}"></div>
            <div><label for="mt-txwallet">ช่องทางชำระ</label><select id="mt-txwallet" name="wallet">${st.data.wallets.map((w) => `<option value="${w.id}" ${(sh.wallet ?? t.wallet) === w.id ? 'selected' : ''}>${w.emoji} ${esc(w.name)}</option>`).join('')}</select></div>
          </div>
          ${sh.tx?.by ? `<p class="mt-sub">จดโดย ${esc(sh.tx.by)}</p>` : ''}
          ${sh.tx?.attachment && backend.fileUrl ? `<a class="mt-attach" href="${esc(backend.fileUrl(sh.tx.attachment))}" target="_blank" rel="noopener"><img src="${esc(backend.fileUrl(sh.tx.attachment))}" alt="รูปหลักฐานของรายการนี้" loading="lazy"><span>📎 หลักฐาน · แตะเพื่อดูเต็ม</span></a>` : ''}
          <button class="mt-btn" type="submit">${sh.tx ? 'บันทึกการแก้ไข' : 'บันทึก'}</button>
          ${sh.tx ? (sh.confirmDel ? `<button class="mt-btn is-danger" type="button" data-act="deltx" data-id="${sh.tx.id}">ยืนยันลบรายการนี้</button>` : `<button class="mt-btn is-ghost" type="button" data-act="askdel">ลบรายการ</button>`) : ''}
        </form>`;
    } else if (sh.kind === 'catbudget') {
      const c = cat(sh.id);
      const spent = summarize(cycleTxs()).cats.find((x) => x.id === c.id)?.total || 0;
      const lim = st.data.settings.catBudgets?.[c.id] || '';
      inner = `<form class="mt-form" data-form="catbudget"><input type="hidden" name="id" value="${c.id}">
        <p class="mt-sub">รอบนี้ใช้ไป <b class="num">${money(spent)}</b>${lim ? ` จากงบ <b class="num">${money(lim)}</b>` : ''}</p>
        ${lim ? bar(spent / lim, budgetTone(spent / lim), 'is-lg') : ''}
        <label for="mt-catlim">งบหมวดนี้ต่อเดือน (เว้นว่าง = ไม่ตั้ง)</label>
        <input id="mt-catlim" name="limit" type="number" inputmode="numeric" min="0" step="100" value="${lim}" placeholder="เช่น 5000">
        <button class="mt-btn" type="submit">บันทึกงบ</button>
        <button class="mt-btn is-ghost" type="button" data-act="filtercat" data-id="${c.id}">ดูรายการในหมวดนี้</button></form>`;
    } else if (sh.kind === 'total') {
      inner = `<form class="mt-form" data-form="total">
        <label for="mt-total">งบรวมต่อเดือน (บาท)</label>
        <input id="mt-total" name="total" type="number" inputmode="numeric" min="0" step="100" value="${st.data.settings.monthlyBudget || ''}" placeholder="เช่น 15000">
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
    const item = (tab, label) => `<button class="${st.tab === tab ? 'is-on' : ''}" data-act="tab" data-tab="${tab}" aria-label="${label}">${icon(tab)}<span>${label}</span></button>`;
    return `<nav class="mt-nav">${item('home', 'สรุป')}${item('analysis', 'วิเคราะห์')}${item('budget', 'หมวด / งบ')}${item('list', 'รายการ')}${item('settings', 'ตั้งค่า')}</nav>`;
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
    const views = { home: homeView, analysis: analysisView, budget: budgetView, list: listView, settings: settingsView };
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
      case 'add':
        st.sheet = { kind: 'tx' };
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
    show(tab, editId) {
      if (TABS.includes(tab)) st.tab = tab;
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
