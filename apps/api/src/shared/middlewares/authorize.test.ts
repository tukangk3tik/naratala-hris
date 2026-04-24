import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { authorize } from './authorize.js';
import { errorHandler } from './errorHandler.js';
import type { Role } from '@naratala/shared';

function appFor(role: Role) {
  const app = express();
  app.use((req, _res, next) => {
    (req as any).user = { sub: 1, role, jti: 'x' };
    next();
  });
  app.get('/x', authorize('audit:read'), (_req, res) => res.json({ ok: true }));
  app.use(errorHandler());
  return app;
}

describe('authorize', () => {
  it('admin passes audit:read', async () => {
    const r = await request(appFor('admin')).get('/x');
    expect(r.status).toBe(200);
  });

  it('hr fails audit:read with 403 INSUFFICIENT_ROLE', async () => {
    const r = await request(appFor('hr')).get('/x');
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('INSUFFICIENT_ROLE');
  });

  it('unauthenticated request fails 401', async () => {
    const app = express();
    app.get('/x', authorize('audit:read'), (_req, res) => res.json({ ok: true }));
    app.use(errorHandler());
    const r = await request(app).get('/x');
    expect(r.status).toBe(401);
  });
});
