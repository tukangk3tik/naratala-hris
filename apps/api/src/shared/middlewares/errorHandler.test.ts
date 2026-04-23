import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from './errorHandler.js';
import { NotFoundError } from '../errors/index.js';
import { requestId } from './requestId.js';

describe('errorHandler', () => {
  it('maps NotFoundError to 404 body', async () => {
    const app = express()
      .use(requestId())
      .get('/', (_req, _res, next) => next(new NotFoundError('gone')))
      .use(errorHandler());
    const r = await request(app).get('/');
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ code: 'NOT_FOUND', message: 'gone' });
    expect(r.headers['x-request-id']).toBeDefined();
  });

  it('redacts unknown errors to INTERNAL_ERROR (no stack)', async () => {
    const app = express()
      .use(requestId())
      .get('/', (_req, _res, next) => next(new Error('boom — secret stack here')))
      .use(errorHandler());
    const r = await request(app).get('/');
    expect(r.status).toBe(500);
    expect(r.body.code).toBe('INTERNAL_ERROR');
    expect(r.body.message).toBe('internal error');
    expect(JSON.stringify(r.body)).not.toContain('secret stack');
  });
});
