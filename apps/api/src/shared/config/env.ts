import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.string().url(),

  DATABASE_URL: z.string().min(10),

  JWT_ACCESS_SECRET: z
    .string()
    .refine(
      (v) => Buffer.from(v, 'base64').length >= 64 || v.length >= 64,
      'JWT_ACCESS_SECRET must decode to ≥64 bytes (or be ≥64 chars)',
    ),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('30d'),

  MFA_ENCRYPTION_KEY: z.string().transform((v, ctx) => {
    const buf = Buffer.from(v, 'base64');
    if (buf.length !== 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MFA_ENCRYPTION_KEY must decode to exactly 32 bytes (base64)',
      });
      return z.NEVER;
    }
    return buf;
  }),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().min(1),

  INITIAL_ADMIN_EMAIL: z.string().email(),
  INITIAL_ADMIN_PASSWORD: z.string().min(12, 'INITIAL_ADMIN_PASSWORD must be ≥12 chars'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SEED_DEV_DATA: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .transform((v) => v === true || v === 'true' || v === '1')
    .default(false),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv | Record<string, unknown> = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Invalid environment:\n${msg}`);
  }
  return parsed.data;
}
