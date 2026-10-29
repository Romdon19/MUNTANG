// หน้าแชทจำลอง LINE — mountSimulator(root, backend, { logoUrl, onUri, onRichUri, onChange })
import { renderFlex } from './flex-render.js';

const HISTORY_KEY = 'muntang-sim-history-v1';

// ไอคอนเส้นชุดเดียวกับแอป (ใช้ทั้งในเดโมและรูปริชเมนู scripts/richmenu.html)
export const MENU_ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  analysis: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8M8 13v-2M10.5 13V8M13 13v-3.5"/>',
  budget: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M14 3.2A9 9 0 0 1 20.8 10H14z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  wallets: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="3" y="8" width="18" height="12" rx="2.5"/><path d="M16 14h2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.4-2.8 4M12 17.5h.01"/>',
  // กองเหรียญ (ออมเงิน)
  goal: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4M5 9.5v4.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V9.5M5 14v4.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V14"/>',
};
const menuIcon = (id) => `<svg class="sim-ic" viewBox="0 0 24 24" aria-hidden="true">${MENU_ICONS[id]}</svg>`;

// ริชเมนูมินิมอล: ช่องใหญ่ "จด" (เหลือง) + ช่องเล็กสีขาว เปิดหน้าใน LIFF (view) หรือส่งข้อความ (text)
export const RICH_MENU = [
  { id: 'rec', text: 'จด' },
  { id: 'home', label: 'สรุป', view: 'home', text: 'สรุปเดือนนี้' },
  { id: 'analysis', label: 'วิเคราะห์', view: 'analysis', text: 'วิเคราะห์' },
  { id: 'budget', label: 'งบประมาณ', view: 'budget', text: 'งบ' },
  { id: 'list', label: 'รายการ', view: 'list', text: 'รายการ' },
  { id: 'goal', label: 'ออมเงิน', text: 'เป้า' },
  { id: 'wallets', label: 'กระเป๋า', view: 'wallets', text: 'บัญชี' },
  { id: 'help', label: 'Help', text: 'วิธีใช้' },
];

export function mountSimulator(root, backend, opts = {}) {
  const logo = opts.logoUrl || '';
  root.classList.add('sim');
  root.innerHTML = `
    <header class="sim-top">
      <img src="${logo}" alt="">
      <div><strong>หมุนตังค์</strong><span>บัญชีทางการ · ผู้ช่วยจดเงิน</span></div>
    </header>
    <div class="sim-log" role="log" aria-live="polite"></div>
    <div class="sim-qr" hidden></div>
    <form class="sim-input">
      <label class="sim-icon" title="ส่งรูปสลิป">
        <input type="file" accept="image/*" id="sim-file" hidden>
        <span aria-hidden="true">🖼</span><span class="sim-vh">ส่งรูปสลิป</span>
      </label>
      <label for="sim-text" class="sim-vh">ข้อความ</label>
      <input id="sim-text" type="text" placeholder="พิมพ์ เช่น ข้าวมันไก่ 50" autocomplete="off" enterkeyhint="send">
      <button type="submit" class="sim-send" aria-label="ส่ง">➤</button>
    </form>
    <button class="sim-menu-toggle" type="button" aria-expanded="true">เมนู ▾</button>
    <nav class="sim-rich">${RICH_MENU.map((m, i) =>
      m.id === 'rec'
        ? `<button type="button" class="is-rec" data-rich="${i}"><b>จด</b><em>รายรับ · รายจ่าย</em>${logo ? `<img src="${logo}" alt="">` : ''}</button>`
        : m.id === 'goal'
          ? `<button type="button" class="is-goal" data-rich="${i}">${menuIcon(m.id)}<span class="sim-goal-t"><b>ออมเงิน</b><small>เป้าหมาย</small></span></button>`
          : `<button type="button" style="grid-area:${m.id}" data-rich="${i}">${menuIcon(m.id)}${m.label}</button>`
    ).join('')}</nav>`;

  const log = root.querySelector('.sim-log');
  const qr = root.querySelector('.sim-qr');
  const input = root.querySelector('#sim-text');
  const rich = root.querySelector('.sim-rich');
  const toggle = root.querySelector('.sim-menu-toggle');
  let history = [];
  let busy = false;

  try {
    history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {}

  const save = () => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-40)));
    } catch {}
  };

  function scroll() {
    log.scrollTop = log.scrollHeight;
  }

  function addUser(content, { image } = {}) {
    const row = document.createElement('div');
    row.className = 'sim-row is-me';
    const b = document.createElement('div');
    b.className = 'sim-bubble';
    if (image) {
      const img = document.createElement('img');
      img.src = image;
      img.alt = 'รูปที่ส่ง';
      img.className = 'sim-photo';
      b.append(img);
      b.classList.add('is-photo');
    } else b.textContent = content;
    row.append(b);
    log.append(row);
  }

  function addBot(message) {
    const row = document.createElement('div');
    row.className = 'sim-row';
    const av = document.createElement('img');
    av.src = logo;
    av.alt = '';
    av.className = 'sim-avatar';
    row.append(av);
    if (message.type === 'flex') {
      const w = document.createElement('div');
      w.className = 'sim-flex';
      w.append(renderFlex(message.contents, onAction));
      row.append(w);
    } else {
      const b = document.createElement('div');
      b.className = 'sim-bubble';
      b.innerHTML = linkify(message.text || '');
      row.append(b);
    }
    log.append(row);
  }

  function showQuickReply(m) {
    qr.innerHTML = '';
    const items = m?.quickReply?.items || [];
    qr.hidden = !items.length;
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = it.action.label;
      b.addEventListener('click', () => onAction(it.action));
      qr.append(b);
    }
  }

  function typing(on) {
    let t = log.querySelector('.sim-typing');
    if (on && !t) {
      t = document.createElement('div');
      t.className = 'sim-row sim-typing';
      t.innerHTML = `<img class="sim-avatar" src="${logo}" alt=""><div class="sim-bubble"><i></i><i></i><i></i></div>`;
      log.append(t);
      scroll();
    } else if (!on && t) t.remove();
  }

  async function send(event, echo) {
    if (busy) return;
    busy = true;
    if (echo) {
      addUser(echo.text, echo);
      if (!echo.image) history.push({ who: 'me', text: echo.text });
    }
    showQuickReply(null);
    scroll();
    typing(true);
    try {
      const [{ messages }] = await Promise.all([backend.sendEvent(event), new Promise((r) => setTimeout(r, 350))]);
      typing(false);
      for (const m of messages) {
        addBot(m);
        history.push({ who: 'bot', m });
      }
      showQuickReply(messages[messages.length - 1]);
      save();
      opts.onChange?.();
    } catch (e) {
      typing(false);
      addBot({ type: 'text', text: `⚠️ ${e.message}` });
    } finally {
      busy = false;
      scroll();
    }
  }

  function sendText(text) {
    text = text.trim();
    if (!text) return;
    send({ type: 'message', message: { type: 'text', text } }, { text });
  }

  function onAction(a) {
    if (a.type === 'message') sendText(a.text);
    else if (a.type === 'postback') send({ type: 'postback', postback: { data: a.data } }, a.displayText ? { text: a.displayText } : null);
    else if (a.type === 'uri') opts.onUri ? opts.onUri(a.uri) : window.open(a.uri, '_blank', 'noopener');
    else if (a.type === 'camera' || a.type === 'cameraRoll') root.querySelector('#sim-file').click();
  }

  root.querySelector('.sim-input').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    sendText(v);
  });

  root.querySelector('#sim-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const dataUrl = await downscale(file);
    const data = dataUrl.split(',')[1];
    send({ type: 'message', message: { type: 'image', id: `sim-${Date.now()}`, imageData: { data, mediaType: 'image/jpeg' } } }, { image: dataUrl });
  });

  log.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-uri]');
    if (a && opts.onUri) {
      e.preventDefault();
      opts.onUri(a.dataset.uri);
    }
  });

  rich.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rich]');
    if (!b) return;
    const m = RICH_MENU[Number(b.dataset.rich)];
    if (m.view && opts.onRichUri) opts.onRichUri(m.view);
    else sendText(m.text);
  });

  toggle.addEventListener('click', () => {
    const open = rich.hidden;
    rich.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'เมนู ▾' : 'เมนู ▴';
  });

  // แสดงประวัติเดิม หรือเริ่มด้วยข้อความต้อนรับ
  if (history.length) {
    for (const h of history) h.who === 'me' ? addUser(h.text) : addBot(h.m);
    const lastBot = [...history].reverse().find((h) => h.who === 'bot');
    showQuickReply(lastBot?.m);
    requestAnimationFrame(scroll);
  } else {
    send({ type: 'follow' });
  }

  return {
    sendText,
    clear() {
      history = [];
      save();
      log.innerHTML = '';
      send({ type: 'follow' });
    },
  };
}

function linkify(text) {
  const esc = text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  return esc.replace(/(https?:\/\/[^\s]+|\/(?:app|api)\/[^\s]+|#(?:dashboard|export))/g, (u) => `<a href="${u}" data-uri="${u}" target="_blank" rel="noopener">${u.startsWith('#') ? 'เปิดลิงก์' : u}</a>`);
}

function downscale(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
