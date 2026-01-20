import { config as dotenvConfig } from 'dotenv';

// Load .env file if it exists
dotenvConfig();

const parseNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const port = parseNumber(process.env.PORT, 3000);
const webappUrl = process.env.WEBAPP_URL || `http://localhost:${port}/app`;

export const config = {
  port,
  botToken: requireEnv('BOT_TOKEN'),
  webappUrl,
  uploadTtlMs: parseNumber(process.env.UPLOAD_TTL_MS, 60 * 60 * 1000)
};
