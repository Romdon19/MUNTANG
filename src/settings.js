// สร้างค่าตั้งค่าจาก environment (ใช้ได้ทั้ง Node และ Cloudflare Workers)
export function makeConfig(env = {}) {
  return {
    baseUrl: (env.BASE_URL || '').replace(/\/$/, ''),
    lineChannelSecret: env.LINE_CHANNEL_SECRET || '',
    lineAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN || '',
    liffId: env.LIFF_ID || '',
    lineLoginChannelId: env.LINE_LOGIN_CHANNEL_ID || '',
    anthropicApiKey: env.ANTHROPIC_API_KEY || '',
    claudeModel: env.CLAUDE_MODEL || 'claude-opus-5-5',
    // APP_SECRET ที่ผู้ใช้ตั้งเอง (ใช้กับลิงก์ admin) — ถ้าไม่ตั้ง ลิงก์ admin จะถูกปิด
    adminKey: env.APP_SECRET || '',
    appSecret: env.APP_SECRET || env.LINE_CHANNEL_SECRET || 'dev-secret-change-me',
    demoMode: env.DEMO_MODE ? env.DEMO_MODE === 'true' : !env.LINE_CHANNEL_SECRET,
  };
}
