// สร้าง Rich Menu แล้วตั้งเป็นเมนูหลักของ LINE OA (ดูสเปกภาพใน docs/richmenu-spec.md)
// แบบที่ใช้จริง (ค่าเริ่มต้น layout=duo): 2 เมนู
//   start  ฉบับเริ่มต้น  ผู้ใช้ใหม่ทุกคนเห็น แตะตรงไหนก็ได้ → หน้า "ติดตั้งครั้งแรก"   (richmenu-start.jpg)
//   main   ฉบับใช้งาน   ผูกให้รายคนเมื่อตั้งค่าเสร็จหรือเริ่มจดแล้ว                  (richmenu-main.jpg)
// แบบเมนูเดียว (เลือกด้วย ?layout=): grid · banner · banner4 · main
// ช่องกดกำหนดเป็นพิกเซลบนภาพต้นแบบ (size) แล้วย่อ/ขยายตามขนาดภาพจริงที่อัปโหลด
import { LAYOUTS, ALIAS, scaleAreas, msg } from './core/richmenu-layout.js';

export { LAYOUTS, ALIAS, scaleAreas };
const API = 'https://api.line.me/v2/bot';

/** ไฟล์ภาพที่ใช้กับแต่ละแบบ (ลองตามลำดับ) */
export const imagePaths = (layout) => (layout === 'grid' ? ['/assets/richmenu.png'] : [`/assets/richmenu-${layout}.jpg`, `/assets/richmenu-${layout}.png`]);

/** ขนาดภาพจากหัวไฟล์ PNG / JPEG */
export function imageSize(image) {
  const b = new Uint8Array(image);
  if (b[0] === 0x89 && b[1] === 0x50) {
    const v = new DataView(b.buffer, b.byteOffset);
    return { width: v.getUint32(16), height: v.getUint32(20), type: 'image/png' };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const len = (b[i + 2] << 8) | b[i + 3];
      // SOF0–SOF15 (ยกเว้น DHT/JPG/DAC) เก็บขนาดภาพ
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8], type: 'image/jpeg' };
      }
      i += 2 + len;
    }
  }
  return null;
}

async function call(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`LINE ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

function pageAction(cfg) {
  return (label, view, fallback) => (cfg.liffId ? { type: 'uri', label, uri: `https://liff.line.me/${cfg.liffId}?view=${view}` } : msg(label, fallback));
}

/** สร้างเมนูหนึ่งชุด + อัปโหลดภาพ คืน richMenuId */
async function createMenu(cfg, image, layout) {
  const L = LAYOUTS[layout];
  if (!L) throw new Error(`ไม่รู้จักแบบเมนู "${layout}" (มี ${Object.keys(LAYOUTS).join(', ')}, duo)`);
  const bytes = new Uint8Array(image);
  if (bytes.length > 1024 * 1024) throw new Error(`ภาพ ${layout} ใหญ่เกิน 1MB (${Math.round(bytes.length / 1024)}KB) ลดขนาดไฟล์ก่อน`);
  const dim = imageSize(bytes);
  if (!dim) throw new Error(`อ่านขนาดภาพ ${layout} ไม่ได้ (ต้องเป็น PNG หรือ JPEG)`);
  if (dim.width < 800 || dim.width > 2500 || dim.height < 250 || dim.width / dim.height < 1.45) {
    throw new Error(`ภาพ ${layout} ขนาด ${dim.width}x${dim.height} ใช้ไม่ได้ (กว้าง 800–2500px และกว้าง/สูง ≥ 1.45)`);
  }
  const headers = { Authorization: `Bearer ${cfg.lineAccessToken}` };
  const size = { width: dim.width, height: dim.height };
  const body = {
    size,
    selected: layout !== 'start',
    name: `muntang-${layout}`,
    chatBarText: layout === 'start' ? 'แตะเพื่อเริ่มต้น' : 'เมนูหมุนตังค์',
    areas: scaleAreas(L.areas(pageAction(cfg)), L.size, size),
  };
  const { richMenuId } = await call(`${API}/richmenu`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await call(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': dim.type },
    body: bytes,
  });
  return richMenuId;
}

async function setAlias(cfg, aliasId, richMenuId) {
  const headers = { Authorization: `Bearer ${cfg.lineAccessToken}`, 'Content-Type': 'application/json' };
  await fetch(`${API}/richmenu/alias/${aliasId}`, { method: 'DELETE', headers }).catch(() => {});
  await call(`${API}/richmenu/alias`, { method: 'POST', headers, body: JSON.stringify({ richMenuAliasId: aliasId, richMenuId }) });
}

/**
 * cfg: ค่าตั้งค่า, load(layout) -> Promise<bytes|null> อ่านภาพของแบบนั้น
 * layout: duo (เริ่มต้น + ใช้งาน) หรือชื่อแบบเดียว
 */
export async function setupRichMenu(cfg, load, layout = 'duo') {
  if (!cfg.lineAccessToken) throw new Error('ต้องตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ก่อน');
  const headers = { Authorization: `Bearer ${cfg.lineAccessToken}` };
  const names = layout === 'duo' ? ['start', 'main'] : [layout];
  const images = {};
  for (const n of names) {
    images[n] = await load(n);
    if (!images[n]) throw new Error(`ไม่เจอไฟล์ภาพ ${imagePaths(n).join(' หรือ ')}`);
  }

  // ลบเมนูเก่าของหมุนตังค์ทั้งหมดก่อน เผื่อกดตั้งค่าซ้ำ
  const { richmenus = [] } = await call(`${API}/richmenu/list`, { headers });
  for (const m of richmenus.filter((m) => m.name.startsWith('muntang-'))) {
    await call(`${API}/richmenu/${m.richMenuId}`, { method: 'DELETE', headers });
  }

  const ids = {};
  for (const n of names) ids[n] = await createMenu(cfg, images[n], n);
  if (layout === 'duo') {
    await setAlias(cfg, ALIAS.start, ids.start);
    await setAlias(cfg, ALIAS.main, ids.main);
  }
  // เมนูตั้งต้นของทุกคน: ฉบับเริ่มต้น (ถ้าเป็น duo) ไม่งั้นเมนูเดียวนั้น
  const def = ids.start || ids[names[0]];
  await call(`${API}/user/all/richmenu/${def}`, { method: 'POST', headers });
  return { ids, layout, dashboard: cfg.liffId ? 'LIFF' : 'ข้อความ "แดชบอร์ด"' };
}

/**
 * ผูกเมนู "ฉบับใช้งาน" ให้ผู้ใช้คนเดียว (คนที่ตั้งค่าเสร็จ/เริ่มจดแล้ว)
 * จำ id เมนูที่ผูกไว้ใน user.settings.menuId — ถ้าตั้งเมนูใหม่ (id เปลี่ยน) จะผูกให้ใหม่เอง
 */
export function createMenuLinker(cfg) {
  let mainId = null;
  let checkedAt = 0;
  const headers = () => ({ Authorization: `Bearer ${cfg.lineAccessToken}` });
  async function currentMain() {
    // อ่าน alias ใหม่ทุก 10 นาที (เผื่อเพิ่งกดตั้งเมนูใหม่)
    if (Date.now() - checkedAt > 10 * 60 * 1000) {
      checkedAt = Date.now();
      const res = await fetch(`${API}/richmenu/alias/${ALIAS.main}`, { headers: headers() });
      mainId = res.ok ? (await res.json()).richMenuId : null;
    }
    return mainId;
  }
  return async function linkMain(user) {
    if (!cfg.lineAccessToken || !/^U/.test(user.id || '')) return false;
    const id = await currentMain();
    if (!id || user.settings.menuId === id) return false;
    const res = await fetch(`${API}/user/${user.id}/richmenu/${id}`, { method: 'POST', headers: headers() });
    if (!res.ok) {
      checkedAt = 0;
      return false;
    }
    user.settings.menuId = id;
    return true;
  };
}
