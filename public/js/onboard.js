// หน้า "ติดตั้งครั้งแรก": ยินดีต้อนรับ → รู้จักจากไหน → หมวดรายจ่าย → หมวดรายรับ → รอบเดือน/งบ/เตือน → พร้อมใช้งาน
// mode 'cats' = เปิดจากเมนูเพื่อแก้หมวดอย่างเดียว (ข้ามขั้นอื่น)
import { money } from '../core/format.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const HEARD = [
  ['friend', 'คนรู้จัก', '👥'],
  ['tiktok', 'TikTok', '🎵'],
  ['facebook', 'Facebook', '📘'],
  ['instagram', 'Instagram', '📸'],
  ['google', 'Google', '🔎'],
  ['other', 'อื่นๆ', '✨'],
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
  return `<button class="ob-cat ${on ? 'is-on' : ''} ${fixed ? 'is-fixed' : ''}" data-act="obcat" data-id="${esc(c.id)}" aria-pressed="${on}" ${fixed ? 'disabled title="หมวดสำรอง เปิดไว้เสมอ"' : ''}>
    ${c.recommended ? '<em class="ob-star" aria-label="แนะนำ">★</em>' : ''}${c.custom ? `<em class="ob-del" data-act="obdelcat" data-id="${esc(c.id)}" aria-label="ลบหมวด ${esc(c.name)}">✕</em>` : ''}
    <span class="ob-emo">${esc(c.emoji)}</span><span class="ob-name">${esc(c.name)}</span></button>`;
}

function catStep(ob, data, type) {
  const inc = type === 'income';
  const base = data.categories.filter((c) => c.type === type && !c.custom);
  const own = ob.custom.filter((c) => c.type === type).map((c) => ({ ...c, custom: true }));
  const list = [...base.filter((c) => c.id !== FALLBACK[type]), ...own, base.find((c) => c.id === FALLBACK[type])];
  const count = list.filter((c) => c.custom || ob.enabled.has(c.id)).length;
  return `${head(ob, inc ? 'เลือกหมวดรายรับ' : 'เลือกหมวดรายจ่าย', `${inc ? 'เงินเข้ามาจากทางไหนบ้าง' : 'ใช้เงินกับอะไรบ่อยๆ'} เลือกได้หลายอัน · ★ = แนะนำ`)}
    <div class="ob-tools"><button class="mt-chip" data-act="obrec" data-v="${type}">★ เลือกที่แนะนำ</button><button class="mt-chip" data-act="obnone" data-v="${type}">ยกเลิกทั้งหมด</button><span class="mt-sub num">เลือกแล้ว ${count}</span></div>
    <div class="ob-cats ${inc ? 'is-inc' : ''}">${list.map((c) => catChip(c, c.custom || ob.enabled.has(c.id), type)).join('')}
      ${
        ob.adding === type
          ? `<form class="ob-add" data-form="obcat"><input name="emoji" aria-label="อีโมจิ" placeholder="${inc ? '💰' : '🏷️'}" maxlength="4"><input name="name" aria-label="ชื่อหมวด" placeholder="ชื่อหมวด เช่น ${inc ? 'ค่าเช่าห้อง' : 'ค่าแมว'}" maxlength="24" required><button class="mt-btn-s" type="submit">เพิ่ม</button></form>`
          : `<button class="ob-cat is-new" data-act="obadd" data-v="${type}"><span class="ob-emo">＋</span><span class="ob-name">เพิ่มหมวดเอง</span></button>`
      }</div>
    <p class="mt-sub ob-note">หมวดที่ไม่ได้เลือกจะซ่อนจากปุ่มเลือกหมวด รายการที่จดไปแล้วไม่หาย · แก้ทีหลังได้ที่ เมนู › หมวดหมู่</p>
    ${foot(inc && ob.mode === 'cats' ? 'บันทึก' : 'ถัดไป')}`;
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
    inner = `${head(ob, 'รู้จักหมุนตังค์จากช่องทางไหน?', 'ช่วยบอกหน่อย จะได้รู้ว่าควรไปทักทายเพื่อนใหม่ที่ไหน')}
      <div class="ob-opts">${HEARD.map(([v, l, e]) => `<button class="ob-opt ${ob.heard === v ? 'is-on' : ''}" data-act="obheard" data-v="${v}" aria-pressed="${ob.heard === v}"><span>${e}</span>${l}</button>`).join('')}</div>
      ${foot('ถัดไป', { disabled: !ob.heard, skip: 'ข้าม' })}`;
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
