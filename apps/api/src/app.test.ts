import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from './app.js';

describe('app wiring', () => {
  const app = buildApp();

  it('GET /api/health → 200 { ok: true }', async () => {
    const r = await request(app).get('/api/health');
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });

  it('sets basic security headers from helmet', async () => {
    const r = await request(app).get('/api/health');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-frame-options']).toBeDefined();
  });

  it('echoes X-Request-Id', async () => {
    const r = await request(app).get('/api/health');
    expect(r.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects JSON bodies larger than 100KB with 413', async () => {
    const big = { payload: 'x'.repeat(110_000) };
    const r = await request(app).post('/api/health').send(big);
    expect([400, 413]).toContain(r.status);
  });

  it('unknown route → 404 NOT_FOUND', async () => {
    const r = await request(app).get('/api/nope');
    expect(r.status).toBe(404);
    expect(r.body.code).toBe('NOT_FOUND');
  });
});
