import fs from 'node:fs';
import path from 'node:path';

// โหลด .env แบบง่ายๆ (ไม่ต้องติดตั้ง dotenv)
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const env = process.env;

export const config = {
  port: Number(env.PORT || 3000),
  baseUrl: (env.BASE_URL || '').replace(/\/$/, ''),
  lineChannelSecret: env.LINE_CHANNEL_SECRET || '',
  lineAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN || '',
  liffId: env.LIFF_ID || '',
  lineLoginChannelId: env.LINE_LOGIN_CHANNEL_ID || '',
  anthropicApiKey: env.ANTHROPIC_API_KEY || '',
  claudeModel: env.CLAUDE_MODEL || 'claude-opus-5-5',
  appSecret: env.APP_SECRET || env.LINE_CHANNEL_SECRET || 'dev-secret-change-me',
  dataDir: env.DATA_DIR || path.resolve(process.cwd(), 'data'),
  demoMode: env.DEMO_MODE ? env.DEMO_MODE === 'true' : !env.LINE_CHANNEL_SECRET,
};
