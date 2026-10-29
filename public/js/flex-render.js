// แสดง LINE Flex Message เป็น HTML (รองรับเฉพาะส่วนที่หมุนตังค์ใช้) — ใช้ในหน้าจำลองแชท
const SP = { none: 0, xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 20 };
const FS = { xxs: 11, xs: 13, sm: 14, md: 16, lg: 19, xl: 22, xxl: 29, '3xl': 35, '4xl': 48, '5xl': 74 };
const IMG = { xxs: 40, xs: 60, sm: 80, md: 100, lg: 120, xl: 140, xxl: 160, '3xl': 180, '4xl': 200, '5xl': 240 };
const BUBBLE_W = { nano: 120, micro: 160, deca: 220, hecto: 241, kilo: 260, mega: 300, giga: 386 };

const px = (v, table = SP) => (v == null ? null : v in table ? `${table[v]}px` : v);

export function renderFlex(contents, onAction) {
  if (contents.type === 'carousel') {
    const wrap = el('div', 'fx-carousel');
    for (const b of contents.contents) wrap.append(renderBubble(b, onAction));
    return wrap;
  }
  return renderBubble(contents, onAction);
}

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function renderBubble(b, onAction) {
  const root = el('div', 'fx-bubble');
  root.style.width = `${BUBBLE_W[b.size || 'mega'] || 300}px`;
  for (const part of ['header', 'hero', 'body', 'footer']) {
    if (!b[part]) continue;
    const node = renderNode(b[part], onAction, 'vertical');
    const bg = b.styles?.[part]?.backgroundColor;
    if (bg && !b[part].backgroundColor) node.style.backgroundColor = bg;
    // separator: เส้นคั่นด้านบนของบล็อก
    const st = b.styles?.[part];
    if (st?.separator && part !== 'header') node.style.borderTop = `2px solid ${st.separatorColor || '#ddd'}`;
    root.append(node);
  }
  return root;
}

function applyCommon(node, n, parentLayout, isFirst, onAction) {
  const s = node.style;
  if (n.position === 'absolute') {
    s.position = 'absolute';
    if (n.offsetTop) s.top = px(n.offsetTop);
    if (n.offsetBottom) s.bottom = px(n.offsetBottom);
    if (n.offsetStart) s.left = px(n.offsetStart);
    if (n.offsetEnd) s.right = px(n.offsetEnd);
    if (n.action) node.classList.add('fx-tap');
    return;
  }
  // flex: ในแนวนอนค่าเริ่มต้น = 1, ในแนวตั้ง = 0
  const f = n.flex ?? (parentLayout === 'vertical' ? 0 : 1);
  s.flex = f > 0 ? `${f} ${f} 0` : '0 0 auto';
  if (parentLayout === 'vertical' && f > 0) s.minHeight = '0';
  if (parentLayout !== 'vertical') s.minWidth = '0';
  if (n.margin && !isFirst) {
    if (parentLayout === 'vertical') s.marginTop = px(n.margin);
    else s.marginLeft = px(n.margin);
  }
  if (n.action) {
    node.classList.add('fx-tap');
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      onAction?.(n.action);
    });
  }
}

function renderNode(n, onAction, parentLayout = 'vertical', isFirst = false) {
  switch (n.type) {
    case 'box': {
      const node = el('div', `fx-box fx-${n.layout}`);
      const s = node.style;
      if (n.backgroundColor) s.backgroundColor = n.backgroundColor;
      if (n.cornerRadius) s.borderRadius = px(n.cornerRadius);
      if (n.borderWidth) {
        const bw = { none: '0', light: '0.5px', normal: '1px', medium: '2px', 'semi-bold': '3px', bold: '4px' }[n.borderWidth] || n.borderWidth;
        s.border = `${bw} solid ${n.borderColor || '#000'}`;
      }
      if (n.cornerRadius || n.borderWidth) s.overflow = 'hidden';
      if (n.width) s.width = n.width;
      if (n.height) s.height = n.height;
      if (n.paddingAll) s.padding = px(n.paddingAll);
      if (n.paddingTop) s.paddingTop = px(n.paddingTop);
      if (n.paddingBottom) s.paddingBottom = px(n.paddingBottom);
      if (n.paddingStart) s.paddingLeft = px(n.paddingStart);
      if (n.paddingEnd) s.paddingRight = px(n.paddingEnd);
      if (n.justifyContent) s.justifyContent = n.justifyContent.replace('flex-', '');
      if (n.alignItems) s.alignItems = n.alignItems.replace('flex-', '');
      const gap = n.spacing ? SP[n.spacing] ?? parseInt(n.spacing, 10) : 0;
      n.contents.forEach((c, i) => {
        const child = renderNode(c, onAction, n.layout, i === 0);
        if (i > 0 && gap && !c.margin) {
          if (n.layout === 'vertical') child.style.marginTop = `${gap}px`;
          else child.style.marginLeft = `${gap}px`;
        }
        node.append(child);
      });
      applyCommon(node, n, parentLayout, isFirst, onAction);
      if (n.width) s.flex = '0 0 auto';
      return node;
    }
    case 'text': {
      const node = el('div', 'fx-text');
      if (Array.isArray(n.contents) && n.contents.length) {
        // span: ข้อความหลายสีในบรรทัดเดียว
        for (const sp of n.contents) {
          const span = el('span');
          span.textContent = sp.text;
          if (sp.color) span.style.color = sp.color;
          if (sp.weight === 'bold') span.style.fontWeight = '700';
          if (sp.size) span.style.fontSize = `${FS[sp.size] || parseInt(sp.size, 10) || 16}px`;
          node.append(span);
        }
      } else node.textContent = n.text;
      const s = node.style;
      s.fontSize = `${FS[n.size || 'md'] || parseInt(n.size, 10) || 16}px`;
      if (n.color) s.color = n.color;
      if (n.weight === 'bold') s.fontWeight = '700';
      if (n.align) s.textAlign = n.align === 'start' ? 'left' : n.align === 'end' ? 'right' : 'center';
      if (!n.wrap) node.classList.add('fx-nowrap');
      if (n.gravity) s.alignSelf = n.gravity === 'center' ? 'center' : n.gravity === 'bottom' ? 'flex-end' : 'flex-start';
      applyCommon(node, n, parentLayout, isFirst, onAction);
      return node;
    }
    case 'image': {
      const node = el('div', 'fx-image');
      const img = el('img');
      img.src = n.url;
      img.alt = '';
      const w = n.size === 'full' ? '100%' : px(n.size || 'md', IMG);
      img.style.width = w;
      if (n.aspectRatio) {
        const [a, b] = n.aspectRatio.split(':').map(Number);
        img.style.aspectRatio = `${a} / ${b}`;
      }
      img.style.objectFit = n.aspectMode === 'cover' ? 'cover' : 'contain';
      node.append(img);
      applyCommon(node, n, parentLayout, isFirst, onAction);
      return node;
    }
    case 'button': {
      const node = el('button', `fx-button fx-${n.style || 'link'}`);
      node.type = 'button';
      node.textContent = n.action?.label || '';
      if (n.style === 'link') node.style.color = n.color || '#42659a';
      else if (n.color) node.style.backgroundColor = n.color;
      if (n.style === 'primary' && n.color && isLight(n.color)) node.style.color = '#111';
      if (n.height === 'sm') node.style.height = '40px';
      applyCommon(node, { ...n, action: n.action }, parentLayout, isFirst, onAction);
      return node;
    }
    case 'separator': {
      const node = el('div', 'fx-sep');
      if (n.color) node.style.backgroundColor = n.color;
      if (n.margin && !isFirst) {
        if (parentLayout === 'vertical') node.style.marginTop = px(n.margin);
        else node.style.marginLeft = px(n.margin);
      }
      if (parentLayout !== 'vertical') node.classList.add('fx-sep-v');
      return node;
    }
    case 'filler':
      return Object.assign(el('div', 'fx-filler'), {});
    case 'spacer': {
      const node = el('div');
      node.style.height = px(n.size || 'md');
      return node;
    }
    default:
      return el('div');
  }
}

function isLight(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}
