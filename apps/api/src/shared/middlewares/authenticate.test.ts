import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createJwtService } from '../../modules/auth/jwt.js';
import { makeAuthenticate } from './authenticate.js';
import { errorHandler } from './errorHandler.js';

const jwt = createJwtService({ secret: 'a'.repeat(86), accessTtl: '15m' });
const app = express()
  .use(makeAuthenticate(jwt))
  .get('/me', (req, res) =>
    res.json({ sub: (req as any).user?.sub, role: (req as any).user?.role }),
  )
  .use(errorHandler());

describe('authenticate', () => {
  it('401 TOKEN_EXPIRED when no Authorization header', async () => {
    const r = await request(app).get('/me');
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('TOKEN_EXPIRED');
  });

  it('401 TOKEN_EXPIRED on malformed token', async () => {
    const r = await request(app).get('/me').set('Authorization', 'Bearer garbage');
    expect(r.status).toBe(401);
  });

  it('200 with req.user on valid token', async () => {
    const token = jwt.signAccess({ sub: 11, role: 'manager' });
    const r = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ sub: 11, role: 'manager' });
  });

  it('rejects an MFA-scope token on access routes', async () => {
    const tok = jwt.signMfaToken({ sub: 1 });
    const r = await request(app).get('/me').set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(401);
  });
});
