import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  AuthError,
  RateLimitedError,
  toHttp,
} from './index.js';

describe('AppError hierarchy', () => {
  it('NotFoundError → 404 NOT_FOUND', () => {
    const err = new NotFoundError('missing');
    const http = toHttp(err);
    expect(http.status).toBe(404);
    expect(http.body.code).toBe('NOT_FOUND');
  });

  it('ForbiddenError → 403 INSUFFICIENT_ROLE', () => {
    const http = toHttp(new ForbiddenError());
    expect(http.status).toBe(403);
    expect(http.body.code).toBe('INSUFFICIENT_ROLE');
  });

  it('ValidationError → 400 VALIDATION_FAILED with details', () => {
    const http = toHttp(new ValidationError('bad', { fields: ['email'] }));
    expect(http.status).toBe(400);
    expect(http.body.code).toBe('VALIDATION_FAILED');
    expect(http.body.details).toEqual({ fields: ['email'] });
  });

  it('AuthError INVALID_CREDENTIALS → 401', () => {
    const http = toHttp(new AuthError('INVALID_CREDENTIALS', 'nope'));
    expect(http.status).toBe(401);
    expect(http.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('RateLimitedError → 429 with retryAfter detail', () => {
    const http = toHttp(new RateLimitedError(45));
    expect(http.status).toBe(429);
    expect(http.body.code).toBe('RATE_LIMITED');
    expect(http.body.details).toEqual({ retryAfter: 45 });
  });

  it('unknown errors → 500 INTERNAL_ERROR', () => {
    const http = toHttp(new Error('boom'));
    expect(http.status).toBe(500);
    expect(http.body.code).toBe('INTERNAL_ERROR');
  });

  it('AppError is the base class', () => {
    expect(new NotFoundError('x') instanceof AppError).toBe(true);
  });
});
