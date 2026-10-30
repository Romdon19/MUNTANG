// จุดเริ่มของเดโมไฟล์เดียว: แชทจำลอง + แดชบอร์ด ทำงานในเบราว์เซอร์ทั้งหมด
import { localBackend } from '../../public/js/backend.js';
import { mountSimulator } from '../../public/js/simulator.js';
import { mountDashboard } from '../../public/js/dashboard.js';

const logo = document.getElementById('mt-logo-src').getAttribute('src');
const moods = JSON.parse(document.getElementById('mt-moods').textContent);
const iconMap = JSON.parse(document.getElementById('mt-icons').textContent);
const menuImages = JSON.parse(document.getElementById('mt-menus').textContent);
const backend = localBackend({ logoUrl: logo, moods, iconMap });
const shell = document.querySelector('.demo');

function showPane(name) {
  shell.dataset.pane = name;
  for (const b of document.querySelectorAll('[data-pane-btn]')) b.setAttribute('aria-selected', String(b.dataset.paneBtn === name));
}

backend.authenticate().then(() => {
  const dash = mountDashboard(document.getElementById('demo-dash'), backend, { logoUrl: logo, moods, iconMap });
  const openDash = async (view, editId) => {
    await dash.refresh();
    if (view) dash.show(view, editId);
    showPane('dash');
  };
  mountSimulator(document.getElementById('demo-chat'), backend, {
    logoUrl: logo,
    menuImages,
    moods,
    onChange: () => dash.refresh(),
    onRichUri: (view) => openDash(view),
    onUri: (uri) => {
      const m = uri.match(/^#(view|edit)-(.+)$/);
      if (m) openDash(m[1] === 'view' ? m[2] : 'list', m[1] === 'edit' ? m[2] : null);
      else if (uri === '#dashboard' || uri === 'dashboard') openDash('home');
      else if (uri === '#export') openDash('settings');
      else window.open(uri, '_blank', 'noopener');
    },
  });
  dash.refresh();
  for (const b of document.querySelectorAll('[data-pane-btn]')) b.addEventListener('click', () => showPane(b.dataset.paneBtn));
  for (const b of document.querySelectorAll('[data-try]'))
    b.addEventListener('click', () => {
      showPane('chat');
      document.getElementById('sim-text').value = b.dataset.try;
      document.querySelector('.sim-input').requestSubmit();
    });
});
