import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requestId } from './requestId.js';

describe('requestId middleware', () => {
  it('generates an id and echoes it in X-Request-Id', async () => {
    const app = express()
      .use(requestId())
      .get('/', (req, res) => res.json({ id: (req as any).id }));
    const r = await request(app).get('/');
    expect(r.status).toBe(200);
    expect(r.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.headers['x-request-id']).toBe(r.body.id);
  });

  it('honors a client-supplied X-Request-Id if it is a UUID', async () => {
    const client = '11111111-1111-4111-8111-111111111111';
    const app = express()
      .use(requestId())
      .get('/', (req, res) => res.json({ id: (req as any).id }));
    const r = await request(app).get('/').set('X-Request-Id', client);
    expect(r.body.id).toBe(client);
    expect(r.headers['x-request-id']).toBe(client);
  });

  it('ignores a malformed client header and generates its own', async () => {
    const app = express()
      .use(requestId())
      .get('/', (req, res) => res.json({ id: (req as any).id }));
    const r = await request(app).get('/').set('X-Request-Id', 'not-a-uuid');
    expect(r.body.id).not.toBe('not-a-uuid');
    expect(r.body.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
