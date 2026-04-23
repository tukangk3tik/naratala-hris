import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'password',
      'newPassword',
      'currentPassword',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'cookie',
      'Cookie',
      'headers.authorization',
      'headers.cookie',
      'mfa_secret',
      'mfaSecret',
      'salary_amount',
      'salaryAmount',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    remove: true,
  },
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
