import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { makeRateLimiter } from './rateLimit.js';
import { errorHandler } from './errorHandler.js';

describe('makeRateLimiter', () => {
  it('allows up to `max` requests, then 429 with Retry-After', async () => {
    const app = express()
      .use(makeRateLimiter({ windowMs: 60_000, max: 2, keyBy: () => 'k' }))
      .get('/', (_req, res) => res.json({ ok: true }))
      .use(errorHandler());

    expect((await request(app).get('/')).status).toBe(200);
    expect((await request(app).get('/')).status).toBe(200);
    const r = await request(app).get('/');
    expect(r.status).toBe(429);
    expect(r.body.code).toBe('RATE_LIMITED');
    expect(Number(r.headers['retry-after'])).toBeGreaterThanOrEqual(0);
  });
});
