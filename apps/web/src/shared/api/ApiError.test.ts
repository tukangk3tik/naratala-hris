import { describe, it, expect } from 'vitest';
import { ApiError } from './ApiError.js';

describe('ApiError', () => {
  it('captures code, message, status, and fields', () => {
    const e = new ApiError('VALIDATION_FAILED', 'bad', 400, { name: ['required'] });
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('VALIDATION_FAILED');
    expect(e.message).toBe('bad');
    expect(e.status).toBe(400);
    expect(e.fields).toEqual({ name: ['required'] });
    expect(e.name).toBe('ApiError');
  });

  it('works without status / fields', () => {
    const e = new ApiError('NETWORK', 'offline');
    expect(e.status).toBeUndefined();
    expect(e.fields).toBeUndefined();
  });
});
