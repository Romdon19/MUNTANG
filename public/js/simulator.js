// หน้าแชทจำลอง LINE — mountSimulator(root, backend, { logoUrl, onUri, onRichUri, onChange })
import { renderFlex } from './flex-render.js';

const HISTORY_KEY = 'muntang-sim-history-v1';

// ริชเมนูแบบป้านวล: ช่องใหญ่ "จด" + ช่องเล็กที่เปิดหน้าต่างๆ ใน LIFF (view) หรือส่งข้อความ (text)
export const RICH_MENU = [
  { id: 'rec', text: 'จด' },
  { id: 'home', icon: '🏠', label: 'สรุป', view: 'home', text: 'สรุปเดือนนี้' },
  { id: 'analysis', icon: '🔍', label: 'วิเคราะห์', view: 'analysis', text: 'วิเคราะห์' },
  { id: 'budget', icon: '🥧', label: 'หมวด/งบ', view: 'budget', text: 'งบ' },
  { id: 'list', icon: '☰', label: 'รายการ', view: 'list', text: 'รายการ' },
  { id: 'goal', icon: '🐷', label: 'ออมเงิน', text: 'เป้า' },
  { id: 'settings', icon: '⚙️', label: 'ตั้งค่า', view: 'settings', text: 'ตั้งค่า' },
  { id: 'help', icon: '❓', label: 'Help', text: 'วิธีใช้' },
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
        ? `<button type="button" class="is-rec" data-rich="${i}"><b>จด</b><em>รายรับ/รายจ่าย</em><small>ง่ายๆ แค่ไลน์บอก<br>นายหัวหมุน</small>${opts.peekUrl ? `<img src="${opts.peekUrl}" alt="">` : ''}</button>`
        : `<button type="button" class="${m.id === 'goal' ? 'is-goal' : ''}" style="grid-area:${m.id}" data-rich="${i}"><span>${m.icon}</span>${m.label}</button>`
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
