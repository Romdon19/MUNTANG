// ตัวเชื่อมระหว่างหน้าเว็บกับข้อมูล:
//   remoteBackend — คุยกับเซิร์ฟเวอร์ (ใช้งานจริง / LIFF)
//   localBackend  — รันสมองบอททั้งหมดในเบราว์เซอร์ เก็บใน localStorage (ใช้ทำเดโมแบบไม่มีเซิร์ฟเวอร์)
import { createBot } from '../core/bot.js';
import * as ops from '../core/ops.js';
import { seedDemo } from '../core/demo.js';
import { badgeSvg } from '../core/accounts.js';

const cfg = () => window.MUNTANG_CONFIG || {};

// ---------------- remote ----------------
export function remoteBackend() {
  let token = null;

  async function authenticate() {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get('t');
    if (fromUrl) {
      token = fromUrl;
      try { sessionStorage.setItem('muntang-token', token); } catch {}
      history.replaceState(null, '', location.pathname);
      return;
    }
    try { token = sessionStorage.getItem('muntang-token'); } catch {}
    if (token) return;
    if (cfg().liffId && window.liff) {
      await window.liff.init({ liffId: cfg().liffId });
      if (!window.liff.isLoggedIn()) {
        window.liff.login({ redirectUri: location.href });
        await new Promise(() => {}); // รอ redirect
      }
      const r = await post('/api/auth/liff', { idToken: window.liff.getIDToken() }, false);
      token = r.token;
    } else if (cfg().demoMode) {
      token = (await post('/api/auth/demo', {}, false)).token;
    } else {
      throw new Error('กรุณาเปิดผ่าน LINE หรือจากลิงก์ที่บอทส่งให้');
    }
    try { sessionStorage.setItem('muntang-token', token); } catch {}
  }

  async function req(method, url, body, withAuth = true) {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(withAuth && token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401 && withAuth) {
      try { sessionStorage.removeItem('muntang-token'); } catch {}
      throw new Error('ลิงก์หมดอายุ กรุณาพิมพ์ "แดชบอร์ด" ในแชทเพื่อรับลิงก์ใหม่');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }
  const post = (u, b, a) => req('POST', u, b, a);

  // id ผู้ใช้จำลองของเบราว์เซอร์นี้ (หน้าแชทจำลอง)
  function simUserId() {
    let id = null;
    try { id = localStorage.getItem('muntang-sim-id'); } catch {}
    if (!id) {
      id = 'sim-' + Math.random().toString(36).slice(2, 12);
      try { localStorage.setItem('muntang-sim-id', id); } catch {}
    }
    return id;
  }

  return {
    mode: 'remote',
    authenticate,
    sendEvent: (event) => post('/api/sim/event', { userId: simUserId(), event }, false),
    state: () => req('GET', '/api/state'),
    addTx: (b) => post('/api/tx', b),
    updateTx: (id, b) => req('PATCH', `/api/tx/${id}`, b),
    deleteTx: (id) => req('DELETE', `/api/tx/${id}`),
    saveSettings: (b) => req('PUT', '/api/settings', b),
    addAccount: (b) => post('/api/accounts', b),
    updateAccount: (id, b) => req('PATCH', `/api/accounts/${id}`, b),
    deleteAccountItem: (id) => req('DELETE', `/api/accounts/${id}`),
    addTransfer: (b) => post('/api/transfers', b),
    deleteTransfer: (id) => req('DELETE', `/api/transfers/${id}`),
    addGoal: (b) => post('/api/goals', b),
    deposit: (id, amount) => post(`/api/goals/${id}/deposit`, { amount }),
    deleteGoal: (id) => req('DELETE', `/api/goals/${id}`),
    addRecurring: (b) => post('/api/recurring', b),
    deleteRecurring: (id) => req('DELETE', `/api/recurring/${id}`),
    exportUrl: () => `/api/export.csv?t=${encodeURIComponent(token)}`,
    fileUrl: (key) => `/api/file/${key}?t=${encodeURIComponent(token)}`,
    clearData: () => post('/api/me/clear', {}),
    async deleteAccount() {
      await req('DELETE', '/api/me');
      try { sessionStorage.removeItem('muntang-token'); } catch {}
    },
  };
}

// ---------------- local (in-browser) ----------------
const LS_KEY = 'muntang-local-v1';
const LOCAL_USER = 'local-user';

export function localBackend({ logoUrl, moods, onOpenDashboard } = {}) {
  let mem = null;
  const load = () => {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch {}
    if (!mem) mem = { users: {} };
    return mem;
  };
  const persist = () => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(mem)); } catch {}
  };
  const store = {
    async get(id) {
      const u = load().users[id];
      return u ? structuredClone(u) : null;
    },
    async save(user) {
      load().users[user.id] = structuredClone(user);
      persist();
    },
  };

  async function getUser() {
    let u = await store.get(LOCAL_USER);
    if (!u) {
      u = seedDemo(ops.newUser(LOCAL_USER));
      await store.save(u);
    }
    return ops.normalizeUser(u);
  }

  const bot = createBot({
    store,
    ai: null,
    logoUrl,
    moods,
    iconUrl: (k) => `data:image/svg+xml,${encodeURIComponent(badgeSvg(k))}`,
    links: { dashboard: () => '#dashboard', export: () => '#export', view: (name) => `#view-${name}`, edit: (id) => `#edit-${id}` },
  });

  const mutate = async (fn) => {
    const u = await getUser();
    const r = fn(u);
    await store.save(u);
    return r;
  };

  return {
    mode: 'local',
    async authenticate() {
      await getUser();
    },
    async sendEvent(event) {
      await getUser();
      return bot.handleEvent({ ...event, source: { type: 'user', userId: LOCAL_USER } });
    },
    state: async () => ops.publicState(await getUser()),
    addTx: (b) => mutate((u) => ({ tx: ops.addTx(u, b, 'app') })),
    updateTx: (id, b) => mutate((u) => ({ tx: ops.updateTx(u, id, b) })),
    deleteTx: (id) => mutate((u) => ({ tx: ops.deleteTx(u, id) })),
    saveSettings: (b) =>
      mutate((u) => {
        ops.applySettings(u, b);
        return ops.publicState(u);
      }),
    addAccount: (b) => mutate((u) => ({ account: ops.addAccount(u, b) })),
    updateAccount: (id, b) => mutate((u) => ({ account: ops.updateAccount(u, id, b) })),
    deleteAccountItem: (id) => mutate((u) => ({ account: ops.deleteAccount(u, id) })),
    addTransfer: (b) => mutate((u) => ({ transfer: ops.addTransfer(u, b) })),
    deleteTransfer: (id) => mutate((u) => ({ transfer: ops.deleteTransfer(u, id) })),
    addGoal: (b) => mutate((u) => ({ goal: ops.addGoal(u, b) })),
    deposit: (id, amount) => mutate((u) => ({ goal: ops.depositGoal(u, id, amount) })),
    deleteGoal: (id) => mutate((u) => ({ goal: ops.deleteGoal(u, id) })),
    addRecurring: (b) => mutate((u) => ({ recurring: ops.addRecurring(u, b) })),
    deleteRecurring: (id) => mutate((u) => ({ recurring: ops.deleteRecurring(u, id) })),
    exportCSV: async () => ops.toCSV(await getUser()),
    clearData: () => mutate((u) => ({ cleared: ops.clearData(u) })),
    async deleteAccount() {
      delete load().users[LOCAL_USER];
      persist();
    },
    async reset() {
      mem = { users: {} };
      persist();
      await getUser();
    },
    onOpenDashboard,
  };
}
