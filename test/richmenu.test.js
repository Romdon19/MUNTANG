import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LAYOUTS, imageSize, scaleAreas, createMenuLinker } from '../src/richmenu.js';
import { createBot } from '../src/core/bot.js';

const tiles = (areas, size) => {
  const covered = areas.reduce((a, { bounds: b }) => a + b.width * b.height, 0);
  assert.equal(covered, size.width * size.height);
  for (const { bounds: b } of areas) assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= size.width && b.y + b.height <= size.height);
};

test('rich menu layouts tile the whole image without overlap, at any image size', () => {
  for (const L of Object.values(LAYOUTS)) {
    const areas = L.areas((label, view) => ({ type: 'uri', label, uri: `x?view=${view}` }));
    tiles(areas, L.size);
    tiles(scaleAreas(areas, L.size, { width: 2500, height: 1686 }), { width: 2500, height: 1686 });
  }
});

test('the designed menu images are valid for LINE', () => {
  for (const f of ['public/assets/richmenu-start.jpg', 'public/assets/richmenu-main.jpg']) {
    const bytes = fs.readFileSync(f);
    const d = imageSize(bytes);
    assert.equal(d.type, 'image/jpeg', f);
    assert.ok(d.width >= 800 && d.width <= 2500 && d.width / d.height >= 1.45, `${f} ${d.width}x${d.height}`);
    assert.ok(bytes.length <= 1024 * 1024, f);
  }
});

test('users switch to the main menu once they record something, and again after the menu is rebuilt', async () => {
  const calls = [];
  let alias = 'rm-1';
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    calls.push(`${opts.method || 'GET'} ${url}`);
    if (url.endsWith('/richmenu/alias/muntang-main')) return new Response(JSON.stringify({ richMenuId: alias }), { status: 200 });
    return new Response('{}', { status: 200 });
  };
  try {
    const link = createMenuLinker({ lineAccessToken: 't' });
    const db = {};
    const store = { get: async (id) => (db[id] ? structuredClone(db[id]) : null), save: async (u) => void (db[u.id] = structuredClone(u)) };
    const bot = createBot({ store, now: () => new Date('2026-10-24T05:00:00Z'), links: {}, linkMenu: link });
    const say = (text) => bot.handleEvent({ type: 'message', source: { type: 'user', userId: 'U1' }, message: { type: 'text', text } });
    await say('วิธีใช้');
    assert.equal(calls.filter((c) => c.includes('/user/U1/richmenu/')).length, 0); // ยังเป็นผู้ใช้ใหม่
    await say('ข้าว 50');
    assert.equal(db.U1.settings.menuId, 'rm-1');
    await say('กาแฟ 45');
    assert.equal(calls.filter((c) => c.includes('/user/U1/richmenu/')).length, 1); // ไม่ผูกซ้ำ
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('PRO and invite buttons reply with cards', async () => {
  const store = { get: async () => null, save: async () => {} };
  const bot = createBot({ store, now: () => new Date(), links: {}, oaId: '@muntang' });
  const say = (text) => bot.handleEvent({ type: 'message', source: { type: 'user', userId: 'U1' }, message: { type: 'text', text } });
  const invite = await say('เชิญเพื่อน');
  assert.match(JSON.stringify(invite.messages), /recommendOA\/%40muntang/);
  const pro = await say('PRO');
  assert.equal(pro.messages[0].altText, 'หมุนตังค์ PRO');
});
