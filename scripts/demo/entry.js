// จุดเริ่มของเดโมไฟล์เดียว: แชทจำลอง + แดชบอร์ด ทำงานในเบราว์เซอร์ทั้งหมด
import { localBackend } from '../../public/js/backend.js';
import { mountSimulator } from '../../public/js/simulator.js';
import { mountDashboard } from '../../public/js/dashboard.js';

const logo = document.getElementById('mt-logo-src').getAttribute('src');
const backend = localBackend({ logoUrl: logo });
const shell = document.querySelector('.demo');

function showPane(name) {
  shell.dataset.pane = name;
  for (const b of document.querySelectorAll('[data-pane-btn]')) b.setAttribute('aria-selected', String(b.dataset.paneBtn === name));
}

backend.authenticate().then(() => {
  const dash = mountDashboard(document.getElementById('demo-dash'), backend, { logoUrl: logo });
  const openDash = () => {
    dash.refresh();
    showPane('dash');
  };
  mountSimulator(document.getElementById('demo-chat'), backend, {
    logoUrl: logo,
    onChange: () => dash.refresh(),
    onRichUri: openDash,
    onUri: (uri) => {
      if (uri === '#dashboard' || uri === 'dashboard') openDash();
      else if (uri === '#export') {
        openDash();
        dash.show('settings');
      } else window.open(uri, '_blank', 'noopener');
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
