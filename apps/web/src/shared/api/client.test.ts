import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { apiFetch, configureClient } from './client.js';
import { tokenStore } from './tokenStore.js';
import { ApiError } from './ApiError.js';
import { z } from 'zod';

describe('apiFetch', () => {
  beforeEach(() => {
    tokenStore.set(null);
    configureClient({ onSignOut: vi.fn() });
  });

  it('attaches Bearer when token present and parses with schema', async () => {
    tokenStore.set('access-1');
    server.use(
      http.get('/api/test', ({ request }) => {
        if (request.headers.get('authorization') !== 'Bearer access-1') {
          return new HttpResponse(null, { status: 500 });
        }
        return HttpResponse.json({ ok: true });
      }),
    );
    const result = await apiFetch('/api/test', { schema: z.object({ ok: z.boolean() }) });
    expect(result).toEqual({ ok: true });
  });

  it('on 401 calls /refresh once, retries, then succeeds', async () => {
    let firstCall = true;
    let refreshes = 0;
    server.use(
      http.get('/api/test', () => {
        if (firstCall) {
          firstCall = false;
          return new HttpResponse(JSON.stringify({ code: 'TOKEN_EXPIRED', message: '' }), {
            status: 401,
          });
        }
        return HttpResponse.json({ ok: true });
      }),
      http.post('/api/auth/refresh', () => {
        refreshes++;
        return HttpResponse.json({ accessToken: 'fresh' });
      }),
    );
    const r = await apiFetch('/api/test', { schema: z.object({ ok: z.boolean() }) });
    expect(r).toEqual({ ok: true });
    expect(refreshes).toBe(1);
    expect(tokenStore.get()).toBe('fresh');
  });

  it('two concurrent 401s share a single refresh', async () => {
    let refreshes = 0;
    let first = true;
    let second = true;
    server.use(
      http.get('/api/a', () => {
        if (first) {
          first = false;
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ tag: 'a' });
      }),
      http.get('/api/b', () => {
        if (second) {
          second = false;
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ tag: 'b' });
      }),
      http.post('/api/auth/refresh', async () => {
        refreshes++;
        await new Promise((r) => setTimeout(r, 20));
        return HttpResponse.json({ accessToken: 'shared' });
      }),
    );
    const [a, b] = await Promise.all([
      apiFetch('/api/a', { schema: z.object({ tag: z.string() }) }),
      apiFetch('/api/b', { schema: z.object({ tag: z.string() }) }),
    ]);
    expect(a).toEqual({ tag: 'a' });
    expect(b).toEqual({ tag: 'b' });
    expect(refreshes).toBe(1);
  });

  it('refresh failure → calls onSignOut', async () => {
    const onSignOut = vi.fn();
    configureClient({ onSignOut });
    server.use(
      http.get('/api/test', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),
    );
    await expect(
      apiFetch('/api/test', { schema: z.object({ ok: z.boolean() }) }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(onSignOut).toHaveBeenCalled();
  });

  it('400 with details.fields populates ApiError.fields', async () => {
    server.use(
      http.post('/api/test', () =>
        HttpResponse.json(
          {
            code: 'VALIDATION_FAILED',
            message: 'invalid',
            details: { fields: { email: ['required'] } },
          },
          { status: 400 },
        ),
      ),
    );
    try {
      await apiFetch('/api/test', { method: 'POST', body: {} });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.code).toBe('VALIDATION_FAILED');
      expect(err.status).toBe(400);
      expect(err.fields).toEqual({ email: ['required'] });
    }
  });
});
