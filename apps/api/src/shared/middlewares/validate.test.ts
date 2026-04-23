import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate } from './validate.js';
import { errorHandlerForTest } from './__errorHandlerForTest.js';

const Body = z.object({ email: z.string().email(), n: z.number().int() }).strict();

const app = express()
  .use(express.json())
  .post('/t', validate({ body: Body }), (req, res) => res.json({ got: (req as any).valid.body }))
  .use(errorHandlerForTest);

describe('validate middleware', () => {
  it('passes a valid body and exposes req.valid.body', async () => {
    const r = await request(app).post('/t').send({ email: 'a@b.co', n: 3 });
    expect(r.status).toBe(200);
    expect(r.body.got).toEqual({ email: 'a@b.co', n: 3 });
  });

  it('rejects invalid body with 400 VALIDATION_FAILED + details', async () => {
    const r = await request(app).post('/t').send({ email: 'bad', n: 'not-int' });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('VALIDATION_FAILED');
    expect(Array.isArray(r.body.details?.issues)).toBe(true);
  });

  it('rejects unknown keys (strict)', async () => {
    const r = await request(app).post('/t').send({ email: 'a@b.co', n: 3, extra: 1 });
    expect(r.status).toBe(400);
  });
});
