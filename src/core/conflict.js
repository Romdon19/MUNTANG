// ข้อผิดพลาดเมื่อบันทึกชนกัน: มีอีกคำขอแก้สมุดบัญชีเล่มเดียวกันไปก่อน (ต้องโหลดใหม่แล้วทำซ้ำ)
export class ConflictError extends Error {
  constructor(id) {
    super(`บันทึกชนกัน (${id}) ลองใหม่`);
    this.code = 'CONFLICT';
  }
}

export const isConflict = (e) => e?.code === 'CONFLICT';

/** ทำ fn ซ้ำเมื่อบันทึกชนกัน (สูงสุด tries ครั้ง) */
export async function retryOnConflict(fn, tries = 6) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!isConflict(e) || attempt >= tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 30 + Math.random() * 120 * (attempt + 1)));
    }
  }
}
