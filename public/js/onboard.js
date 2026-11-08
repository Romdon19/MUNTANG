// หน้า "ติดตั้งครั้งแรก": ยินดีต้อนรับ → รู้จักจากไหน → หมวดรายจ่าย → หมวดรายรับ → รอบเดือน/งบ/เตือน → พร้อมใช้งาน
// mode 'cats' = เปิดจากเมนูเพื่อแก้หมวดอย่างเดียว (ข้ามขั้นอื่น)
import { money } from '../core/format.js';
import { catIcon } from './cat-icons.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// โลโก้ช่องทาง (Simple Icons CC0 + สีแบรนด์) วาดเป็น SVG ในกรอบ 48×48
const TT = 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z';
const IG = 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077';
const SRC_ICON = {
  friend: '<svg viewBox="0 0 48 48" fill="none" stroke="#f5c400" stroke-width="3" stroke-linecap="round"><circle cx="20" cy="17" r="6.5"/><circle cx="30.5" cy="14.5" r="5"/><path d="M8 38c0-7.2 5.4-12 12-12s12 4.8 12 12"/><path d="M29 24.5c6.2-.6 11 3.6 11 10.5"/></svg>',
  tiktok: `<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="11" fill="#161823"/><g transform="translate(12 11.5) scale(1.05)"><path d="${TT}" fill="#25F4EE" transform="translate(-.7 -.5)"/><path d="${TT}" fill="#FE2C55" transform="translate(.7 .5)"/><path d="${TT}" fill="#fff"/></g></svg>`,
  facebook: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="11" fill="#1877F2"/><path fill="#fff" d="M31.5 15.2h-3.4c-1.3 0-1.9.8-1.9 2v3.4h5.2l-.8 5.3h-4.4V42h-5.9V25.9H17v-5.3h3.3v-3.9c0-4.6 2.7-7.3 7-7.3 1.9 0 3.6.2 4.2.3z"/></svg>',
  instagram: `<svg viewBox="0 0 48 48"><defs><radialGradient id="ig-g" cx=".3" cy="1.07" r="1.2"><stop offset="0" stop-color="#FDD86C"/><stop offset=".25" stop-color="#FB8B2E"/><stop offset=".5" stop-color="#E1306C"/><stop offset=".75" stop-color="#C13584"/><stop offset="1" stop-color="#5B51D8"/></radialGradient></defs><rect width="48" height="48" rx="11" fill="url(#ig-g)"/><path d="${IG}" fill="#fff" transform="translate(10 10) scale(1.1667)"/></svg>`,
  google: '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>',
  other: '<svg viewBox="0 0 48 48" fill="none" stroke="#f5c400" stroke-width="3"><circle cx="11" cy="24" r="4.5"/><circle cx="24" cy="24" r="4.5"/><circle cx="37" cy="24" r="4.5"/></svg>',
};

export const HEARD = [
  ['friend', 'คนรู้จัก'],
  ['tiktok', 'TikTok'],
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['google', 'Google'],
  ['other', 'อื่นๆ'],
];
const FALLBACK = { expense: 'other', income: 'other_income' };
const CYCLES = [1, 15, 25, 26, 28, 30];
const BUDGETS = [5000, 10000, 15000, 20000, 30000];
const REMINDERS = ['20:00', '21:00', '22:00'];

const STEPS_FULL = ['welcome', 'heard', 'expense', 'income', 'setup', 'saving', 'done'];
const STEPS_CATS = ['expense', 'income', 'saving', 'done'];

/** สถานะเริ่มต้น จากข้อมูลผู้ใช้ปัจจุบัน */
export function newOnboard(data, mode = 'full') {
  const fresh = !data.settings.onboarded && !data.txs.length;
  const enabled = data.categories.filter((c) => !c.custom && (fresh ? c.recommended : !c.hidden)).map((c) => c.id);
  return {
    mode,
    i: 0,
    heard: data.settings.heardFrom || '',
    enabled: new Set([...enabled, ...Object.values(FALLBACK)]),
    custom: data.categories.filter((c) => c.custom).map(({ id, name, emoji, type }) => ({ id, name, emoji, type })),
    cycle: data.settings.cycleStartDay || 1,
    budget: data.settings.monthlyBudget || 0,
    reminder: data.settings.reminder ?? '21:00',
    adding: false,
  };
}

export const obStep = (ob) => (ob.mode === 'cats' ? STEPS_CATS : STEPS_FULL)[ob.i];

/** body ที่ส่งให้ saveSettings */
export function onboardPayload(ob) {
  const cats = { enabled: [...ob.enabled], custom: ob.custom };
  if (ob.mode === 'cats') return { categories: cats };
  return { categories: cats, heardFrom: ob.heard, cycleStartDay: ob.cycle, monthlyBudget: ob.budget, reminder: ob.reminder || null, onboarded: true };
}

// ---------------- หน้าตา ----------------
function progress(ob) {
  const steps = ob.mode === 'cats' ? ['expense', 'income'] : ['heard', 'expense', 'income', 'setup'];
  const cur = steps.indexOf(obStep(ob));
  if (cur < 0) return '';
  return `<div class="ob-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${steps.length}" aria-valuenow="${cur + 1}" aria-label="ขั้นที่ ${cur + 1} จาก ${steps.length}">
    ${steps.map((_, k) => `<i class="${k <= cur ? 'is-on' : ''}"></i>`).join('')}<span class="num">${cur + 1}/${steps.length}</span></div>`;
}

function head(ob, title, sub) {
  const back = ob.i > 0 ? `<button class="ob-back" data-act="obback" aria-label="ย้อนกลับ">‹</button>` : ob.mode === 'cats' ? `<button class="ob-back" data-act="obclose" aria-label="ปิด">✕</button>` : '<span></span>';
  return `<header class="ob-head">${back}${progress(ob)}<span></span></header>
    <div class="ob-title"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>`;
}

const foot = (label, { act = 'obnext', disabled = false, skip = '' } = {}) =>
  `<footer class="ob-foot">${skip ? `<button class="ob-skip" data-act="obskip">${skip}</button>` : ''}<button class="mt-btn ob-next" data-act="${act}" ${disabled ? 'disabled' : ''}>${label}</button></footer>`;

/** การ์ดฟีเจอร์หน้าแรก (ตามดีไซน์: การ์ดเหลือง ข้อความขาว สลับซ้าย-ขวา ภาพประกอบอีกฝั่ง) */
const FEATURES = [
  {
    t: 'จดผ่านแชท LINE',
    d: 'พิมพ์ “กาแฟ 50” ส่งเหมือนคุยกับเพื่อน ไม่ต้องโหลดแอปเพิ่ม',
    side: 'right',
    art: `<div class="ob-art-phone"><i class="ob-art-notch"></i>
        <span class="ob-art-bub">กาแฟ 50</span>
        <span class="ob-art-ok"><small>จดสำเร็จ ✅</small><b class="num">฿50</b></span></div>`,
  },
  {
    t: 'ส่งสลิป อ่านให้เอง',
    d: 'ถ่ายรูปสลิปหรือใบเสร็จ ส่งมา นายหัวหมุนอ่านยอดและจัดหมวดให้',
    side: 'left',
    art: `<div class="ob-art-slip"><i></i><i></i><i class="is-s"></i><b class="num">฿1,250</b><i></i><i class="is-s"></i></div>
        <span class="ob-art-scan"></span><span class="ob-art-check">✓</span>`,
  },
  {
    t: 'รู้ทันงบ ทุกบัญชี',
    d: 'งบรายวัน บัตรเครดิต หนี้ผ่อน และกระเป๋าเงินทุกใบ ในที่เดียว',
    side: 'right',
    art: `<div class="ob-art-budget"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="17" class="t"/><circle cx="22" cy="22" r="17" class="v" pathLength="100" stroke-dasharray="62 100"/></svg>
        <span><small>ใช้ได้วันละ</small><b class="num">฿420</b></span></div>
        <span class="ob-art-coins"><i></i><i></i><i></i></span>`,
  },
];

function catChip(c, on, type) {
  const fixed = c.id === FALLBACK[type];
  return `<button class="ob-cat ${on ? 'is-on' : ''} ${fixed ? 'is-fixed' : ''}" data-act="obcat" data-id="${esc(c.id)}" aria-pressed="${on}" ${fixed ? 'aria-disabled="true" title="หมวดสำรอง เปิดไว้เสมอ"' : ''}>
    <span class="ob-emo" aria-hidden="true">${catIcon(c, 28)}</span><span class="ob-name">${esc(c.name)}${fixed ? '<small>เปิดเสมอ</small>' : ''}</span>
    ${c.recommended ? '<em class="ob-star" aria-label="แนะนำ">★</em>' : ''}${c.custom ? `<em class="ob-del" data-act="obdelcat" data-id="${esc(c.id)}" role="button" aria-label="ลบหมวด ${esc(c.name)}">✕</em>` : ''}</button>`;
}

function catStep(ob, data, type) {
  const inc = type === 'income';
  const base = data.categories.filter((c) => c.type === type && !c.custom);
  const own = ob.custom.filter((c) => c.type === type).map((c) => ({ ...c, custom: true }));
  const list = [...base.filter((c) => c.id !== FALLBACK[type]), ...own, base.find((c) => c.id === FALLBACK[type])];
  const count = list.filter((c) => c.custom || ob.enabled.has(c.id)).length;
  const last = inc && ob.mode === 'cats';
  return `${head(ob, `เลือก ‘หมวด’ ${inc ? 'รายรับ' : 'รายจ่าย'}`, inc ? 'เลือกหมวดที่เหมาะกับคุณ เพื่อติดตามรายได้' : 'เลือกหมวดที่เหมาะกับคุณ เพื่อวางแผนการใช้จ่าย')}
    <div class="ob-tools"><button class="ob-tool-rec" data-act="obrec" data-v="${type}">เลือกที่แนะนำ</button><button class="ob-tool-none" data-act="obnone" data-v="${type}">ยกเลิกทั้งหมด</button></div>
    <div class="ob-cats ${inc ? 'is-inc' : 'is-exp'}">${list.map((c) => catChip(c, c.custom || ob.enabled.has(c.id), type)).join('')}
      ${
        ob.adding === type
          ? `<form class="ob-add" data-form="obcat"><input name="emoji" aria-label="อีโมจิ" placeholder="${inc ? '💰' : '🏷️'}" maxlength="4"><input name="name" aria-label="ชื่อหมวด" placeholder="ชื่อหมวด เช่น ${inc ? 'ค่าเช่าห้อง' : 'ค่าแมว'}" maxlength="24" required><button class="mt-btn-s" type="submit">เพิ่ม</button></form>`
          : `<button class="ob-cat is-new" data-act="obadd" data-v="${type}"><span class="ob-emo" aria-hidden="true">＋</span><span class="ob-name">เพิ่มหมวดเอง</span></button>`
      }</div>
    <p class="mt-sub ob-note">★ = แนะนำ · หมวดที่ไม่ได้เลือกจะซ่อนจากปุ่มเลือกหมวด รายการเดิมไม่หาย · แก้ทีหลังได้ที่ เมนู › หมวดหมู่</p>
    <footer class="ob-foot"><button class="ob-bigbtn ${inc ? 'is-ink' : 'is-yellow'}" data-act="obnext">${last ? 'บันทึก' : 'ถัดไป'}<small>เลือกแล้ว ${count} หมวด</small></button></footer>`;
}

const chip = (act, v, label, on) => `<button class="mt-chip ${on ? 'is-on' : ''}" data-act="${act}" data-v="${v}">${label}</button>`;

export function onboardHTML(ob, data, { logoUrl = '', moods = {} } = {}) {
  const step = obStep(ob);
  const mascot = (lvl = 'calm') => `<img class="ob-mascot" src="${esc(moods[lvl] || logoUrl)}" alt="">`;
  let inner = '';
  if (step === 'welcome') {
    inner = `<div class="ob-hello ob-hello-w">${mascot('spin')}<h1>ยินดีต้อนรับสู่หมุนตังค์</h1><p>ผู้ช่วยจัดการเรื่องเงินของคุณ</p></div>
      <div class="ob-feats">${FEATURES.map((f) => `<article class="ob-feat is-${f.side}"><div class="ob-feat-art" aria-hidden="true">${f.art}</div><div class="ob-feat-t"><h2>${f.t}</h2><p>${f.d}</p></div></article>`).join('')}</div>
      ${foot('เริ่มตั้งค่า →')}`;
  } else if (step === 'heard') {
    inner = `<div class="ob-panel">${head(ob, 'รู้จักหมุนตังค์ช่องไหน?', 'ช่วยบอกหน่อยจะได้หมุนตังค์ไปพร้อมกัน')}
      <div class="ob-opts">${HEARD.map(([v, l]) => `<button class="ob-opt ${ob.heard === v ? 'is-on' : ''}" data-act="obheard" data-v="${v}" aria-pressed="${ob.heard === v}"><span class="ob-opt-ic" aria-hidden="true">${SRC_ICON[v]}</span>${l}</button>`).join('')}</div>
      ${foot('ถัดไป', { disabled: !ob.heard, skip: 'ข้าม' })}</div>`;
  } else if (step === 'expense' || step === 'income') {
    inner = catStep(ob, data, step);
  } else if (step === 'setup') {
    const customBudget = ob.budget && !BUDGETS.includes(ob.budget);
    inner = `${head(ob, 'รอบเดือน · งบ · เตือน', 'ตั้งให้ตรงกับชีวิตจริง สรุปและงบจะนับตามรอบนี้')}
      <section class="ob-sec"><h3>รอบเดือนเริ่มวันที่</h3><p class="mt-sub">แนะนำวันเงินเดือนออก</p>
        <div class="mt-chips">${CYCLES.map((d) => chip('obcycle', d, d === 30 ? 'สิ้นเดือน (30)' : `วันที่ ${d}`, ob.cycle === d)).join('')}
          <select class="mt-chip ob-sel ${CYCLES.includes(ob.cycle) ? '' : 'is-on'}" data-change="obcycle" aria-label="วันอื่น">${CYCLES.includes(ob.cycle) ? '<option value="" selected disabled>วันอื่น ▾</option>' : ''}${Array.from({ length: 31 }, (_, k) => k + 1)
            .filter((d) => !CYCLES.includes(d))
            .map((d) => `<option value="${d}" ${ob.cycle === d ? 'selected' : ''}>วันที่ ${d}</option>`)
            .join('')}</select></div></section>
      <section class="ob-sec"><h3>งบใช้จ่ายต่อเดือน</h3><p class="mt-sub">ใกล้หมดงบจะเตือนให้ · ตั้งงบรายหมวดเพิ่มได้ทีหลัง</p>
        <div class="mt-chips">${BUDGETS.map((v) => chip('obbudget', v, money(v), ob.budget === v)).join('')}${chip('obbudget', 0, 'ยังไม่ตั้ง', !ob.budget)}</div>
        <div class="mt-amount ob-amt ${customBudget ? 'is-on' : ''}"><span>฿</span><input id="ob-budget" type="number" step="any" inputmode="decimal" min="0" placeholder="ใส่เอง" value="${customBudget ? ob.budget : ''}" data-change="obbudget" aria-label="งบต่อเดือน ใส่เอง"></div></section>
      <section class="ob-sec"><h3>เตือนจดรายจ่ายทุกวัน</h3>
        <div class="mt-chips">${REMINDERS.map((v) => chip('obremind', v, `⏰ ${v}`, ob.reminder === v)).join('')}${chip('obremind', '', '🔕 ไม่ต้องเตือน', !ob.reminder)}</div></section>
      ${foot('เสร็จสิ้น')}`;
  } else if (step === 'saving') {
    inner = `<div class="ob-loading">${mascot('ok')}<p>กำลังหมุนตั้งค่าให้...</p></div>`;
  } else {
    const nExp = [...data.categories.filter((c) => c.type === 'expense' && !c.hidden)].length;
    const nInc = [...data.categories.filter((c) => c.type === 'income' && !c.hidden)].length;
    const rows =
      ob.mode === 'cats'
        ? [['หมวดรายจ่าย', `${nExp} หมวด`], ['หมวดรายรับ', `${nInc} หมวด`]]
        : [
            ['หมวดรายจ่าย', `${nExp} หมวด`],
            ['หมวดรายรับ', `${nInc} หมวด`],
            ['รอบเดือน', `เริ่มวันที่ ${data.settings.cycleStartDay}`],
            ['งบต่อเดือน', data.settings.monthlyBudget ? money(data.settings.monthlyBudget) : 'ยังไม่ตั้ง'],
            ['เตือนจด', data.settings.reminder ? `${data.settings.reminder} น.` : 'ปิด'],
          ];
    inner = `<div class="ob-hello ob-done">${mascot('calm')}<h1>${ob.mode === 'cats' ? 'บันทึกหมวดแล้ว!' : 'พร้อมใช้งานแล้ว!'}</h1>
        <p>${ob.mode === 'cats' ? 'ปุ่มเลือกหมวดในแชทและแอปจะแสดงตามนี้' : 'ลองพิมพ์ "ข้าว 50" ในแชท LINE หรือกด ＋ จดรายการ ได้เลย'}</p></div>
      <dl class="ob-sum">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${foot(ob.mode === 'cats' ? 'กลับไปเมนู' : 'เริ่มต้นใช้งาน', { act: 'obfinish' })}`;
  }
  return `<div class="ob ob-${step}">${inner}</div>`;
}

// ---------------- การกด ----------------
/** คืน 'save' เมื่อถึงขั้นบันทึก, 'finish' เมื่อกดปุ่มสุดท้าย, 'close' เมื่อปิด, ไม่งั้น re-render */
export function onboardAction(ob, act, el, data, root) {
  const step = obStep(ob);
  const next = () => {
    ob.i++;
    ob.adding = false;
    return obStep(ob) === 'saving' ? 'save' : 'render';
  };
  switch (act) {
    case 'obnext':
      if (step === 'setup') {
        const v = Number(root.querySelector('#ob-budget')?.value);
        if (v > 0) ob.budget = Math.round(v * 100) / 100;
      }
      return next();
    case 'obskip':
      ob.heard = '';
      return next();
    case 'obback':
      ob.i = Math.max(0, ob.i - 1);
      ob.adding = false;
      return 'render';
    case 'obclose':
      return 'close';
    case 'obfinish':
      return 'finish';
    case 'obheard':
      ob.heard = el.dataset.v;
      return 'render';
    case 'obcat': {
      const id = el.dataset.id;
      if (Object.values(FALLBACK).includes(id) || id.startsWith('c_')) return 'render';
      if (ob.enabled.has(id)) ob.enabled.delete(id);
      else ob.enabled.add(id);
      return 'render';
    }
    case 'obdelcat':
      ob.custom = ob.custom.filter((c) => c.id !== el.dataset.id);
      return 'render';
    case 'obrec':
    case 'obnone':
      for (const c of data.categories.filter((x) => x.type === el.dataset.v && !x.custom && x.id !== FALLBACK[x.type])) {
        if (act === 'obrec' ? c.recommended : true) ob.enabled.add(c.id);
        if (act === 'obnone' || !c.recommended) ob.enabled.delete(c.id);
      }
      if (act === 'obnone') ob.custom = ob.custom.filter((c) => c.type !== el.dataset.v);
      return 'render';
    case 'obadd':
      ob.adding = el.dataset.v;
      return 'focus';
    case 'obcycle':
      ob.cycle = Number(el.dataset.v);
      return 'render';
    case 'obbudget':
      ob.budget = Number(el.dataset.v);
      return 'render';
    case 'obremind':
      ob.reminder = el.dataset.v;
      return 'render';
    default:
      return null;
  }
}

/** ฟอร์มเพิ่มหมวดเอง */
export function onboardAddCat(ob, fd) {
  const name = String(fd.name || '').trim();
  if (!name || !ob.adding) return;
  const type = ob.adding;
  if (!ob.custom.some((c) => c.name === name && c.type === type)) ob.custom.push({ id: `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name, emoji: String(fd.emoji || '').trim() || (type === 'income' ? '💰' : '🏷️'), type });
  ob.adding = false;
}
