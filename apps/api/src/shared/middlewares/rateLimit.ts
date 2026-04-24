import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, RequestHandler } from 'express';
import { RateLimitedError } from '../errors/index.js';

interface Opts {
  windowMs: number;
  max: number;
  keyBy?: (req: Request) => string;
}

export function makeRateLimiter(opts: Opts): RequestHandler {
  const config: Partial<Options> = {
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: opts.keyBy ?? ((req) => req.ip ?? 'unknown'),
    handler: (_req, res, next) => {
      res.setHeader('Retry-After', Math.ceil(opts.windowMs / 1000));
      next(new RateLimitedError(Math.ceil(opts.windowMs / 1000)));
    },
  };
  return rateLimit(config);
}

interface Limiters {
  global: () => RequestHandler;
  loginByEmail: () => RequestHandler;
  loginByIp: () => RequestHandler;
  forgotByEmail: () => RequestHandler;
  forgotByIp: () => RequestHandler;
  refresh: () => RequestHandler;
}

export const limiters: Limiters = {
  global: () => makeRateLimiter({ windowMs: 60_000, max: 300 }),
  loginByEmail: () =>
    makeRateLimiter({
      windowMs: 15 * 60_000,
      max: 10,
      keyBy: (req) => `login:email:${String((req.body as any)?.email ?? '').toLowerCase()}`,
    }),
  loginByIp: () =>
    makeRateLimiter({
      windowMs: 15 * 60_000,
      max: 30,
      keyBy: (req) => `login:ip:${req.ip}`,
    }),
  forgotByEmail: () =>
    makeRateLimiter({
      windowMs: 60 * 60_000,
      max: 3,
      keyBy: (req) => `forgot:email:${String((req.body as any)?.email ?? '').toLowerCase()}`,
    }),
  forgotByIp: () =>
    makeRateLimiter({
      windowMs: 60 * 60_000,
      max: 10,
      keyBy: (req) => `forgot:ip:${req.ip}`,
    }),
  refresh: () => makeRateLimiter({ windowMs: 60_000, max: 60 }),
};
