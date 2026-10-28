// หมวดหมู่ + คีย์เวิร์ดสำหรับจัดหมวดอัตโนมัติ
// สีประจำหมวดมาจากชุดสี categorical ที่ผ่านการตรวจตาบอดสี (คงที่ต่อหมวด ไม่เปลี่ยนตามอันดับ) (คำที่ยาวที่สุดที่ตรงจะชนะ เช่น "ค่าน้ำ" ชนะ "น้ำ")
export const CATEGORIES = [
  {
    id: 'food', name: 'อาหาร/เครื่องดื่ม', emoji: '🍜', type: 'expense', color: '#EDA100',
    keywords: ['ข้าว', 'กาแฟ', 'ชา', 'ชานม', 'อาหาร', 'ก๋วยเตี๋ยว', 'หมูกระทะ', 'ชาบู', 'บุฟเฟ่', 'บุฟเฟต์', 'ขนม', 'น้ำ', 'น้ำดื่ม', 'นม',
      'ส้มตำ', 'ไก่', 'ไก่ทอด', 'ผัด', 'แกง', 'กะเพรา', 'กระเพรา', 'ข้าวมันไก่', 'ข้าวขาหมู', 'โจ๊ก', 'บะหมี่', 'ราเมง', 'ซูชิ', 'มื้อ',
      'มื้อเที่ยง', 'มื้อเย็น', 'อาหารเช้า', 'เบเกอรี่', 'เค้ก', 'บิงซู', 'ไอติม', 'ไอศกรีม', 'ผลไม้', 'ไข่', 'สเต็ก', 'พิซซ่า', 'pizza',
      'kfc', 'mk', 'mcdonald', 'แมค', 'starbucks', 'สตาร์บัค', 'cafe', 'คาเฟ่', 'อเมซอน', 'grabfood', 'lineman', 'ไลน์แมน', 'foodpanda',
      'ข้าวเหนียว', 'หมูปิ้ง', 'ลูกชิ้น', 'ปิ้งย่าง', 'สุกี้', 'โกโก้', 'ชาไทย', 'น้ำปั่น', 'สมูทตี้', 'ข้าวผัด', 'ผัดไทย', 'ติ่มซำ'],
  },
  {
    id: 'transport', name: 'เดินทาง', emoji: '🚗', type: 'expense', color: '#2A78D6',
    keywords: ['แท็กซี่', 'แทกซี่', 'taxi', 'grab', 'bolt', 'bts', 'mrt', 'รถไฟฟ้า', 'รถเมล์', 'วิน', 'วินมอไซ', 'มอไซ', 'น้ำมัน', 'เติมน้ำมัน',
      'ทางด่วน', 'ค่ารถ', 'ค่าทางด่วน', 'ที่จอด', 'ค่าจอด', 'ปตท', 'ptt', 'บางจาก', 'shell', 'รถตู้', 'เรือ', 'ตั๋ว', 'ตั๋วเครื่องบิน',
      'เครื่องบิน', 'airasia', 'รถไฟ', 'easy pass', 'm-flow', 'ชาร์จรถ', 'ล้างรถ', 'ซ่อมรถ'],
  },
  {
    id: 'shopping', name: 'ช้อปปิ้ง', emoji: '🛍️', type: 'expense', color: '#E87BA4',
    keywords: ['ซื้อ', 'เสื้อ', 'กางเกง', 'รองเท้า', 'shopee', 'ช้อปปี้', 'lazada', 'ลาซาด้า', '7-11', 'เซเว่น', 'ห้าง', 'lotus', 'โลตัส',
      'บิ๊กซี', 'bigc', 'makro', 'แม็คโคร', 'ของใช้', 'สบู่', 'แชมพู', 'tiktok', 'กระเป๋า', 'ไอที', 'มือถือ', 'หูฟัง', 'ของเข้าบ้าน',
      'ทิชชู่', 'ผงซักฟอก', 'uniqlo', 'ikea', 'tops', 'ท็อปส์'],
  },
  {
    id: 'bills', name: 'บิล/ที่พัก', emoji: '🧾', type: 'expense', color: '#6250D6',
    keywords: ['ค่าไฟ', 'ค่าน้ำ', 'ค่าน้ำประปา', 'ค่าเน็ต', 'เน็ต', 'อินเทอร์เน็ต', 'ค่าโทร', 'ค่าโทรศัพท์', 'true', 'ais', 'dtac', 'ค่าห้อง',
      'ค่าเช่า', 'ค่าเช่าห้อง', 'ค่าหอ', 'หอ', 'ค่าส่วนกลาง', 'ผ่อน', 'ค่าผ่อน', 'ผ่อนรถ', 'ผ่อนบ้าน', 'บัตรเครดิต', 'ประกัน', 'ภาษี', 'ค่าบัตร',
      'ดอกเบี้ยบัตร', 'ดอกเบี้ยเงินกู้', 'ดอกเบี้ยค้างชำระ', 'จ่ายดอกเบี้ย', 'ค่าธรรมเนียม', 'ค่าปรับ', 'ค่าปรับล่าช้า'],
  },
  {
    id: 'fun', name: 'บันเทิง', emoji: '🎮', type: 'expense', color: '#EB6834',
    keywords: ['หนัง', 'ดูหนัง', 'netflix', 'youtube', 'spotify', 'เกม', 'game', 'steam', 'เติมเกม', 'คอนเสิร์ต', 'เหล้า', 'เบียร์', 'ปาร์ตี้',
      'คาราโอเกะ', 'disney', 'เที่ยว', 'โรงแรม', 'ที่พักเที่ยว', 'ซื้อหวย', 'หวย', 'สลาก', 'premium', 'icloud', 'chatgpt', 'claude'],
  },
  {
    id: 'health', name: 'สุขภาพ', emoji: '💊', type: 'expense', color: '#1BAF7A',
    keywords: ['ยา', 'หมอ', 'โรงพยาบาล', 'รพ', 'คลินิก', 'ฟิตเนส', 'fitness', 'gym', 'ยิม', 'ทำฟัน', 'หมอฟัน', 'วิตามิน', 'นวด', 'ตรวจสุขภาพ'],
  },
  {
    id: 'beauty', name: 'ความสวยงาม', emoji: '💅', type: 'expense', color: '#E34948',
    keywords: ['ตัดผม', 'ทำผม', 'ทำเล็บ', 'สกินแคร์', 'เครื่องสำอาง', 'ครีม', 'สปา', 'ลิป', 'น้ำหอม', 'เซรั่ม'],
  },
  {
    id: 'education', name: 'การศึกษา', emoji: '📚', type: 'expense', color: '#008300',
    keywords: ['หนังสือ', 'คอร์ส', 'เรียน', 'ค่าเรียน', 'ค่าเทอม', 'ติว', 'udemy', 'สัมมนา', 'อุปกรณ์การเรียน'],
  },
  {
    id: 'family', name: 'ครอบครัว/ให้คนอื่น', emoji: '🎁', type: 'expense', color: '#9C6B30',
    keywords: ['ให้แม่', 'ให้พ่อ', 'ให้ลูก', 'ให้แฟน', 'ของขวัญ', 'ทำบุญ', 'บริจาค', 'ใส่ซอง', 'ซองงาน', 'งานแต่ง', 'งานบวช', 'ค่าขนมลูก',
      'เลี้ยง', 'เลี้ยงข้าว', 'อาหารแมว', 'อาหารหมา', 'สัตว์เลี้ยง'],
  },
  { id: 'other', name: 'อื่นๆ', emoji: '📦', type: 'expense', color: '#A8A29A', keywords: [] },

  { id: 'salary', name: 'เงินเดือน', emoji: '💼', type: 'income', color: '#008300', keywords: ['เงินเดือน', 'salary', 'เงินเดือนออก'] },
  { id: 'bonus', name: 'โบนัส', emoji: '🎉', type: 'income', color: '#1BAF7A', keywords: ['โบนัส', 'bonus'] },
  { id: 'sales', name: 'ขายของ', emoji: '🏪', type: 'income', color: '#2A78D6', keywords: ['ขายของ', 'ขาย', 'ยอดขาย', 'ลูกค้าโอน', 'ขายได้'] },
  { id: 'freelance', name: 'ฟรีแลนซ์/ค่าจ้าง', emoji: '💻', type: 'income', color: '#6250D6', keywords: ['ฟรีแลนซ์', 'freelance', 'ค่าจ้าง', 'ค่าคอม', 'คอมมิชชั่น', 'ค่าแรง', 'ทิป', 'ได้ค่า'] },
  { id: 'invest', name: 'ลงทุน/ดอกเบี้ย', emoji: '📈', type: 'income', color: '#EB6834', keywords: ['ปันผล', 'ดอกเบี้ย', 'กำไร', 'กำไรหุ้น', 'คริปโต'] },
  { id: 'other_income', name: 'รายรับอื่นๆ', emoji: '💰', type: 'income', color: '#A8A29A', keywords: ['ถูกหวย', 'คืนเงิน', 'เงินคืน', 'cashback', 'แม่ให้', 'พ่อให้', 'ได้เงิน', 'อั่งเปา'] },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id) {
  return CATEGORY_MAP[id] || CATEGORY_MAP.other;
}

export function categoriesOf(type) {
  return CATEGORIES.filter((c) => c.type === type);
}

/**
 * เดาหมวดจากข้อความ คืน { id, type, score } หรือ null ถ้าไม่เจอ
 * customKeywords: { [keyword]: categoryId } ที่ผู้ใช้สอนเอง — ชนะคีย์เวิร์ดตั้งต้นเสมอ
 */
export function guessCategory(text, customKeywords = {}) {
  const t = text.toLowerCase();
  let best = null;
  for (const [kw, id] of Object.entries(customKeywords)) {
    if (t.includes(kw.toLowerCase()) && CATEGORY_MAP[id]) {
      const score = 1000 + kw.length;
      if (!best || score > best.score) best = { id, type: CATEGORY_MAP[id].type, score };
    }
  }
  if (best) return best;
  for (const c of CATEGORIES) {
    for (const kw of c.keywords) {
      if (t.includes(kw.toLowerCase())) {
        const score = kw.length;
        if (!best || score > best.score) best = { id: c.id, type: c.type, score };
      }
    }
  }
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
