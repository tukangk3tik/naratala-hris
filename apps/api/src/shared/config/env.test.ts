import { describe, it, expect } from 'vitest';
import { loadEnv } from './env.js';

const base = {
  NODE_ENV: 'development',
  PORT: '3000',
  WEB_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'mysql://u:p@127.0.0.1:3306/db',
  JWT_ACCESS_SECRET: 'a'.repeat(86),
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL: '30d',
  MFA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  MAIL_FROM: 'Naratala <no-reply@local>',
  INITIAL_ADMIN_EMAIL: 'admin@naratala.local',
  INITIAL_ADMIN_PASSWORD: 'dev-password-12',
  LOG_LEVEL: 'debug',
  SEED_DEV_DATA: 'true',
};

describe('loadEnv', () => {
  it('parses a valid environment', () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.SEED_DEV_DATA).toBe(true);
    expect(env.MFA_ENCRYPTION_KEY).toHaveLength(32);
  });

  it('rejects a short JWT_ACCESS_SECRET', () => {
    expect(() => loadEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects a non-32-byte MFA_ENCRYPTION_KEY', () => {
    expect(() =>
      loadEnv({ ...base, MFA_ENCRYPTION_KEY: Buffer.alloc(16, 1).toString('base64') }),
    ).toThrow(/MFA_ENCRYPTION_KEY/);
  });

  it('rejects an INITIAL_ADMIN_PASSWORD shorter than 12 chars', () => {
    expect(() => loadEnv({ ...base, INITIAL_ADMIN_PASSWORD: 'short' })).toThrow(
      /INITIAL_ADMIN_PASSWORD/,
    );
  });
});
