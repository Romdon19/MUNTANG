// หมวดหมู่ + คีย์เวิร์ดสำหรับจัดหมวดอัตโนมัติ
// สีประจำหมวดมาจากชุดสี categorical ที่ผ่านการตรวจตาบอดสี (คงที่ต่อหมวด ไม่เปลี่ยนตามอันดับ) (คำที่ยาวที่สุดที่ตรงจะชนะ เช่น "ค่าน้ำ" ชนะ "น้ำ")
export const CATEGORIES = [
  // ---------- รายจ่าย: กินอยู่ประจำวัน ----------
  {
    id: 'food', name: 'อาหาร', emoji: '🍜', type: 'expense', color: '#EDA100',
    keywords: ['ข้าว', 'อาหาร', 'ก๋วยเตี๋ยว', 'หมูกระทะ', 'ชาบู', 'บุฟเฟ่', 'บุฟเฟต์', 'ส้มตำ', 'ไก่', 'ไก่ทอด', 'ผัด', 'แกง', 'กะเพรา', 'กระเพรา',
      'ข้าวมันไก่', 'ข้าวขาหมู', 'โจ๊ก', 'บะหมี่', 'ราเมง', 'ซูชิ', 'มื้อ', 'มื้อเที่ยง', 'มื้อเย็น', 'อาหารเช้า', 'ไข่', 'สเต็ก', 'พิซซ่า', 'pizza',
      'kfc', 'mk', 'mcdonald', 'แมค', 'grabfood', 'lineman', 'ไลน์แมน', 'foodpanda', 'robinhood', 'ข้าวเหนียว', 'หมูปิ้ง', 'ลูกชิ้น', 'ปิ้งย่าง',
      'สุกี้', 'ข้าวผัด', 'ผัดไทย', 'ติ่มซำ', 'ข้าวต้ม', 'ขนมจีน', 'เย็นตาโฟ', 'หมาล่า', 'ยำ', 'กับข้าว', 'ปลา', 'หมู', 'เนื้อ', 'ทะเล'],
  },
  {
    id: 'cafe', name: 'กาแฟ/ขนม', emoji: '☕', type: 'expense', color: '#9C6B30',
    keywords: ['กาแฟ', 'ชา', 'ชานม', 'ชาไทย', 'ชาเขียว', 'โกโก้', 'นม', 'น้ำ', 'น้ำดื่ม', 'น้ำปั่น', 'สมูทตี้', 'ขนม', 'เบเกอรี่', 'เค้ก', 'บิงซู',
      'ไอติม', 'ไอศกรีม', 'ผลไม้', 'โดนัท', 'ครัวซองต์', 'starbucks', 'สตาร์บัค', 'cafe', 'คาเฟ่', 'อเมซอน', 'ไข่มุก', 'มัทฉะ', 'ลาเต้', 'บราวนี่', 'ของหวาน', 'ขนมหวาน', 'คุกกี้', 'ช็อกโกแลต', 'เต้าหู้'],
  },
  {
    id: 'groceries', name: 'ของใช้/ของเข้าบ้าน', emoji: '🧺', type: 'expense', color: '#1BAF7A',
    keywords: ['7-11', 'เซเว่น', 'lotus', 'โลตัส', 'บิ๊กซี', 'bigc', 'makro', 'แม็คโคร', 'tops', 'ท็อปส์', 'ของใช้', 'ของเข้าบ้าน', 'ทิชชู่',
      'ผงซักฟอก', 'น้ำยาล้างจาน', 'สบู่', 'แชมพู', 'ยาสีฟัน', 'ตลาด', 'ซูเปอร์', 'กับข้าวสด', 'ผัก', 'หมูสด', 'แก๊ส', 'น้ำยาปรับผ้านุ่ม'],
  },
  {
    id: 'transport', name: 'เดินทาง', emoji: '🚗', type: 'expense', color: '#2A78D6',
    keywords: ['แท็กซี่', 'แทกซี่', 'taxi', 'grab', 'bolt', 'bts', 'mrt', 'รถไฟฟ้า', 'รถเมล์', 'วิน', 'วินมอไซ', 'มอไซ', 'ทางด่วน', 'ค่ารถ',
      'ค่าทางด่วน', 'ที่จอด', 'ค่าจอด', 'รถตู้', 'เรือ', 'รถไฟ', 'easy pass', 'm-flow', 'ล้างรถ', 'ซ่อมรถ', 'เปลี่ยนน้ำมันเครื่อง', 'ยางรถ', 'สองแถว'],
  },
  {
    id: 'fuel', name: 'น้ำมัน/ชาร์จรถ', emoji: '⛽', type: 'expense', color: '#EB6834',
    keywords: ['น้ำมัน', 'เติมน้ำมัน', 'ค่าน้ำมัน', 'ปตท', 'ptt', 'บางจาก', 'shell', 'เชลล์', 'caltex', 'คาลเท็กซ์', 'พีที', 'ชาร์จรถ', 'ดีเซล', 'แก๊สโซฮอล์', 'เบนซิน'],
  },
  {
    id: 'housing', name: 'ค่าเช่า/ที่อยู่', emoji: '🏠', type: 'expense', color: '#6250D6',
    keywords: ['ค่าห้อง', 'ค่าเช่า', 'ค่าเช่าห้อง', 'ค่าหอ', 'หอ', 'ค่าส่วนกลาง', 'ผ่อนบ้าน', 'ผ่อนคอนโด', 'ค่าบ้าน', 'ซ่อมบ้าน', 'ช่าง'],
  },
  {
    id: 'bills', name: 'ค่าน้ำไฟ/เน็ต', emoji: '💡', type: 'expense', color: '#2A78D6',
    keywords: ['ค่าไฟ', 'ค่าน้ำ', 'ค่าน้ำประปา', 'ค่าเน็ต', 'เน็ต', 'อินเทอร์เน็ต', 'ค่าโทร', 'ค่าโทรศัพท์', 'true', 'ais', 'dtac', 'เติมเงินมือถือ', '3bb', 'ค่าขยะ'],
  },
  {
    id: 'installment', name: 'ผ่อนชำระ', emoji: '💳', type: 'expense', color: '#E34948',
    keywords: ['ผ่อน', 'ค่าผ่อน', 'ผ่อนรถ', 'ค่างวด', 'บัตรเครดิต', 'ค่าบัตร', 'กยศ'],
  },
  {
    id: 'fees', name: 'ดอกเบี้ย/ค่าธรรมเนียม', emoji: '🧾', type: 'expense', color: '#A8A29A',
    keywords: ['ดอกเบี้ยบัตร', 'ดอกเบี้ยเงินกู้', 'ดอกเบี้ยค้างชำระ', 'จ่ายดอกเบี้ย', 'ค่าธรรมเนียม', 'ค่าปรับ', 'ค่าปรับล่าช้า', 'ภาษี', 'ค่าโอน', 'ค่าทำบัตร'],
  },
  {
    id: 'insurance', name: 'ประกัน', emoji: '🛡️', type: 'expense', color: '#008300',
    keywords: ['ประกัน', 'เบี้ยประกัน', 'ประกันรถ', 'ประกันชีวิต', 'ประกันสุขภาพ', 'พรบ', 'พ.ร.บ'],
  },
  // ---------- รายจ่าย: ไลฟ์สไตล์ ----------
  {
    id: 'shopping', name: 'ช้อปปิ้ง', emoji: '🛍️', type: 'expense', color: '#E87BA4',
    keywords: ['ซื้อ', 'shopee', 'ช้อปปี้', 'lazada', 'ลาซาด้า', 'ห้าง', 'tiktok', 'ikea', 'ของแต่งบ้าน', 'ของเล่น', 'ช้อป'],
  },
  {
    id: 'clothing', name: 'เสื้อผ้า', emoji: '👕', type: 'expense', color: '#E87BA4',
    keywords: ['เสื้อ', 'กางเกง', 'รองเท้า', 'กระโปรง', 'ชุด', 'กระเป๋า', 'uniqlo', 'h&m', 'zara', 'ถุงเท้า', 'ชุดชั้นใน', 'หมวก'],
  },
  {
    id: 'gadget', name: 'ไอที/แกดเจ็ต', emoji: '💻', type: 'expense', color: '#3B3934',
    keywords: ['ไอที', 'มือถือ', 'หูฟัง', 'คอม', 'โน้ตบุ๊ก', 'ipad', 'iphone', 'แท็บเล็ต', 'สายชาร์จ', 'เคส', 'ฟิล์ม', 'เมาส์', 'คีย์บอร์ด', 'banana', 'advice'],
  },
  {
    id: 'fun', name: 'บันเทิง', emoji: '🎮', type: 'expense', color: '#EB6834',
    keywords: ['หนัง', 'ดูหนัง', 'เกม', 'game', 'steam', 'เติมเกม', 'คอนเสิร์ต', 'เหล้า', 'เบียร์', 'ปาร์ตี้', 'คาราโอเกะ', 'บาร์', 'ผับ', 'โบว์ลิ่ง'],
  },
  {
    id: 'subscription', name: 'สมาชิก/แอป', emoji: '📺', type: 'expense', color: '#6250D6',
    keywords: ['netflix', 'youtube', 'spotify', 'disney', 'premium', 'icloud', 'chatgpt', 'claude', 'apple music', 'viu', 'wetv', 'line tv', 'ค่าสมาชิก', 'subscription', 'google one'],
  },
  {
    id: 'travel', name: 'ท่องเที่ยว/ที่พัก', emoji: '✈️', type: 'expense', color: '#2A78D6',
    keywords: ['เที่ยว', 'โรงแรม', 'ที่พักเที่ยว', 'รีสอร์ท', 'โฮสเทล', 'ตั๋วเครื่องบิน', 'เครื่องบิน', 'airasia', 'แอร์เอเชีย', 'nok air', 'agoda', 'booking',
      'airbnb', 'hotel', 'resort', 'ทัวร์', 'วีซ่า', 'ค่าเข้าชม', 'ของฝาก', 'ตั๋ว'],
  },
  {
    id: 'health', name: 'สุขภาพ', emoji: '💊', type: 'expense', color: '#1BAF7A',
    keywords: ['ยา', 'หมอ', 'โรงพยาบาล', 'รพ', 'คลินิก', 'ทำฟัน', 'หมอฟัน', 'วิตามิน', 'ตรวจสุขภาพ', 'แว่น', 'คอนแทค'],
  },
  {
    id: 'sport', name: 'กีฬา/ฟิตเนส', emoji: '🏋️', type: 'expense', color: '#008300',
    keywords: ['ฟิตเนส', 'fitness', 'gym', 'ยิม', 'ฟุตบอล', 'บอล', 'แบด', 'สนาม', 'ว่ายน้ำ', 'โยคะ', 'วิ่ง', 'มวย', 'จักรยาน', 'กอล์ฟ'],
  },
  {
    id: 'beauty', name: 'ความสวยงาม', emoji: '💅', type: 'expense', color: '#E34948',
    keywords: ['ตัดผม', 'ทำผม', 'ทำเล็บ', 'สกินแคร์', 'เครื่องสำอาง', 'ครีม', 'สปา', 'ลิป', 'น้ำหอม', 'เซรั่ม', 'นวด', 'ร้านเสริมสวย'],
  },
  {
    id: 'education', name: 'การศึกษา', emoji: '📚', type: 'expense', color: '#008300',
    keywords: ['หนังสือ', 'คอร์ส', 'เรียน', 'ค่าเรียน', 'ค่าเทอม', 'ติว', 'udemy', 'สัมมนา', 'อุปกรณ์การเรียน', 'เครื่องเขียน'],
  },
  // ---------- รายจ่าย: ครอบครัว · สังคม · งาน ----------
  {
    id: 'family', name: 'ครอบครัว/ให้คนอื่น', emoji: '👨‍👩‍👧', type: 'expense', color: '#9C6B30',
    keywords: ['ให้แม่', 'ให้พ่อ', 'ให้แฟน', 'ให้ที่บ้าน', 'ส่งเงินที่บ้าน', 'เลี้ยง', 'เลี้ยงข้าว', 'ค่าขนมน้อง'],
  },
  {
    id: 'kids', name: 'ลูก', emoji: '🧸', type: 'expense', color: '#EDA100',
    keywords: ['ให้ลูก', 'ค่าขนมลูก', 'ค่าเทอมลูก', 'นมผง', 'แพมเพิส', 'ผ้าอ้อม', 'ของเล่นลูก', 'เนอสเซอรี่'],
  },
  {
    id: 'pet', name: 'สัตว์เลี้ยง', emoji: '🐶', type: 'expense', color: '#EDA100',
    keywords: ['อาหารแมว', 'อาหารหมา', 'สัตว์เลี้ยง', 'ทรายแมว', 'หมอหมา', 'หมอแมว', 'อาบน้ำหมา', 'ขนมแมว', 'ขนมหมา', 'วัคซีนหมา', 'วัคซีนแมว'],
  },
  {
    id: 'gift', name: 'ของขวัญ/งานสังคม', emoji: '🎁', type: 'expense', color: '#E87BA4',
    keywords: ['ของขวัญ', 'ใส่ซอง', 'ซองงาน', 'งานแต่ง', 'งานบวช', 'งานศพ', 'วันเกิด', 'ช่อดอกไม้', 'ดอกไม้'],
  },
  {
    id: 'donation', name: 'ทำบุญ/บริจาค', emoji: '🙏', type: 'expense', color: '#EDA100',
    keywords: ['ทำบุญ', 'บริจาค', 'ใส่บาตร', 'วัด', 'ถวาย', 'ไหว้พระ', 'มูลนิธิ'],
  },
  {
    id: 'lottery', name: 'หวย/เสี่ยงโชค', emoji: '🎟️', type: 'expense', color: '#EB6834',
    keywords: ['ซื้อหวย', 'หวย', 'สลาก', 'ลอตเตอรี่', 'สลากดิจิทัล'],
  },
  {
    id: 'business', name: 'งาน/ต้นทุนขาย', emoji: '📦', type: 'expense', color: '#3B3934',
    keywords: ['ต้นทุน', 'สต็อก', 'วัตถุดิบ', 'ค่าส่ง', 'ส่งของ', 'ไปรษณีย์', 'kerry', 'flash', 'j&t', 'ค่าแพ็ค', 'ยิงแอด', 'ค่าโฆษณา', 'อุปกรณ์ทำงาน'],
  },
  { id: 'other', name: 'อื่นๆ', emoji: '🗂️', type: 'expense', color: '#A8A29A', keywords: [] },

  // ---------- รายรับ ----------
  { id: 'salary', name: 'เงินเดือน', emoji: '💼', type: 'income', color: '#008300', keywords: ['เงินเดือน', 'salary', 'เงินเดือนออก'] },
  { id: 'ot', name: 'โอที/ค่าล่วงเวลา', emoji: '⏰', type: 'income', color: '#2A78D6', keywords: ['โอที', 'ค่าล่วงเวลา', 'เบี้ยเลี้ยง', 'ค่ากะ'] },
  { id: 'bonus', name: 'โบนัส', emoji: '🎉', type: 'income', color: '#1BAF7A', keywords: ['โบนัส', 'bonus', 'เงินพิเศษ'] },
  { id: 'sales', name: 'ขายของ', emoji: '🏪', type: 'income', color: '#2A78D6', keywords: ['ขายของ', 'ขาย', 'ยอดขาย', 'ลูกค้าโอน', 'ขายได้'] },
  { id: 'freelance', name: 'ฟรีแลนซ์/ค่าจ้าง', emoji: '🧑‍💻', type: 'income', color: '#6250D6', keywords: ['ฟรีแลนซ์', 'freelance', 'ค่าจ้าง', 'ค่าคอม', 'คอมมิชชั่น', 'ค่าแรง', 'ทิป', 'ได้ค่า', 'งานเสริม'] },
  { id: 'invest', name: 'ลงทุน/ดอกเบี้ย', emoji: '📈', type: 'income', color: '#EB6834', keywords: ['ปันผล', 'ดอกเบี้ย', 'กำไร', 'กำไรหุ้น', 'คริปโต', 'ขายหุ้น', 'กองทุน'] },
  { id: 'rent_in', name: 'ค่าเช่าที่ได้', emoji: '🏘️', type: 'income', color: '#9C6B30', keywords: ['ได้ค่าเช่า', 'รับค่าเช่า', 'ค่าเช่าห้องที่ได้', 'ผู้เช่าโอน'] },
  { id: 'gift_in', name: 'ได้รับ/ของขวัญ', emoji: '🧧', type: 'income', color: '#E34948', keywords: ['แม่ให้', 'พ่อให้', 'ที่บ้านให้', 'อั่งเปา', 'แต๊ะเอีย', 'ได้ซอง', 'ค่าขนม', 'ได้ของขวัญ'] },
  { id: 'refund', name: 'เงินคืน/cashback', emoji: '🔁', type: 'income', color: '#1BAF7A', keywords: ['คืนเงิน', 'เงินคืน', 'cashback', 'แคชแบ็ก', 'refund', 'ได้คืน', 'คืนภาษี'] },
  { id: 'lucky', name: 'ถูกหวย/รางวัล', emoji: '🍀', type: 'income', color: '#008300', keywords: ['ถูกหวย', 'ถูกรางวัล', 'รางวัล', 'จับฉลาก'] },
  { id: 'other_income', name: 'รายรับอื่นๆ', emoji: '💰', type: 'income', color: '#A8A29A', keywords: ['ได้เงิน'] },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

// หมวดที่แนะนำตอนตั้งค่าครั้งแรก (ที่เหลือเลือกเปิดเองได้)
export const RECOMMENDED = ['food', 'cafe', 'groceries', 'transport', 'fuel', 'housing', 'bills', 'shopping', 'fun', 'travel', 'health', 'other', 'salary', 'bonus', 'sales', 'freelance', 'other_income'];
// หมวดสำรองที่ปิดไม่ได้ (รายการที่เดาไม่ออกจะมาอยู่ที่นี่)
export const FALLBACK = { expense: 'other', income: 'other_income' };

/** หมวดที่ผู้ใช้สร้างเอง: รับ user / ctx ({ cats }) / array */
function customOf(src) {
  if (!src) return [];
  if (Array.isArray(src)) return src;
  return src.cats || src.settings?.customCats || [];
}

export function getCategory(id, src) {
  return CATEGORY_MAP[id] || customOf(src).find((c) => c.id === id) || CATEGORY_MAP.other;
}

/** มีหมวดนี้จริง (รวมหมวดของผู้ใช้) */
export function hasCategory(id, src) {
  return !!(CATEGORY_MAP[id] || customOf(src).some((c) => c.id === id));
}

/** หมวดที่ผู้ใช้เปิดใช้ (หมวดตั้งต้นที่ไม่ได้ซ่อน + หมวดที่สร้างเอง) — ส่ง user หรือ ctx */
export function categoriesOf(type, src) {
  const hidden = new Set(src?.settings?.hiddenCats || src?.hiddenCats || []);
  const list = CATEGORIES.filter((c) => c.type === type && (!hidden.has(c.id) || c.id === FALLBACK[type]));
  const own = customOf(src).filter((c) => c.type === type);
  // หมวดสำรองอยู่ท้ายสุดเสมอ
  return [...list.filter((c) => c.id !== FALLBACK[type]), ...own, CATEGORY_MAP[FALLBACK[type]]];
}

/** หมวดทั้งหมดสำหรับแดชบอร์ด พร้อมสถานะ hidden / custom */
export function categoryCatalog(user) {
  const hidden = new Set(user.settings?.hiddenCats || []);
  return [
    ...CATEGORIES.map(({ keywords, ...c }) => ({ ...c, hidden: hidden.has(c.id) && c.id !== FALLBACK[c.type], recommended: RECOMMENDED.includes(c.id) })),
    ...customOf(user).map((c) => ({ ...c, custom: true })),
  ];
}

const CUSTOM_COLORS = ['#2A78D6', '#1BAF7A', '#EB6834', '#6250D6', '#E87BA4', '#9C6B30', '#008300', '#EDA100'];

/** ทำความสะอาดหมวดที่ผู้ใช้สร้าง */
export function cleanCustomCat(input, existing = []) {
  const name = String(input?.name || '').trim().slice(0, 24);
  if (!name) return null;
  const type = input.type === 'income' ? 'income' : 'expense';
  const emoji = [...String(input.emoji || '').trim()].slice(0, 2).join('') || (type === 'income' ? '💰' : '🏷️');
  const id = /^c_[\w-]{1,20}$/.test(input.id || '') ? input.id : `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  return { id, name, emoji, type, color: CUSTOM_COLORS[existing.length % CUSTOM_COLORS.length] };
}

/**
 * เดาหมวดจากข้อความ คืน { id, type, score } หรือ null ถ้าไม่เจอ
 * customKeywords: { [keyword]: categoryId } ที่ผู้ใช้สอนเอง — ชนะคีย์เวิร์ดตั้งต้นเสมอ
 */
export function guessCategory(text, customKeywords = {}, user) {
  const t = text.toLowerCase();
  const own = customOf(user);
  let best = null;
  for (const [kw, id] of Object.entries(customKeywords || {})) {
    const c = CATEGORY_MAP[id] || own.find((x) => x.id === id);
    if (t.includes(kw.toLowerCase()) && c) {
      const score = 1000 + kw.length;
      if (!best || score > best.score) best = { id, type: c.type, score };
    }
  }
  // ชื่อหมวดที่ผู้ใช้สร้างเองก็เป็นคีย์เวิร์ดด้วย ("ค่าแมว 300" → หมวด ค่าแมว)
  for (const c of own) {
    if (c.name.length >= 2 && t.includes(c.name.toLowerCase())) {
      const score = 500 + c.name.length;
      if (!best || score > best.score) best = { id: c.id, type: c.type, score };
    }
  }
  if (best) return best;
  const hidden = new Set(user?.settings?.hiddenCats || []);
  for (const c of CATEGORIES) {
    for (const kw of c.keywords) {
      if (t.includes(kw.toLowerCase())) {
        const score = kw.length;
        if (!best || score > best.score) best = { id: c.id, type: c.type, score };
      }
    }
  }
  // หมวดที่ปิดไว้ → ไปหมวดสำรองของประเภทเดียวกัน
  if (best && hidden.has(best.id)) best = { ...best, id: FALLBACK[best.type] };
  return best;
}

export const WALLETS = [
  { id: 'cash', name: 'เงินสด', short: 'เงินสด', emoji: '💵' },
  { id: 'bank', name: 'โอน/สแกนจ่าย', short: 'โอน', emoji: '🏦' },
  { id: 'card', name: 'บัตรเครดิต', short: 'บัตร', emoji: '💳' },
];

export const WALLET_MAP = Object.fromEntries(WALLETS.map((w) => [w.id, w]));

const WALLET_WORDS = [
  ['card', ['บัตรเครดิต', 'รูดบัตร', 'บัตร', 'credit']],
  ['bank', ['โอน', 'สแกน', 'scan', 'พร้อมเพย์', 'promptpay', 'qr', 'แอปธนาคาร', 'kbank', 'scb', 'ktb', 'bbl', 'ttb', 'กสิกร', 'ไทยพาณิชย์', 'กรุงไทย', 'กรุงเทพ']],
  ['cash', ['เงินสด', 'จ่ายสด']],
];

export function guessWallet(text) {
  const t = text.toLowerCase();
  for (const [id, words] of WALLET_WORDS) {
    if (words.some((w) => t.includes(w))) return id;
  }
  return null;
}
