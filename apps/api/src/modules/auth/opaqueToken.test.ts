import { describe, it, expect } from 'vitest';
import { newOpaqueToken, sha256Hex } from './opaqueToken.js';

describe('opaque tokens', () => {
  it('generates 32 bytes as url-safe base64 (>=43 chars)', () => {
    const t = newOpaqueToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThanOrEqual(43);
    expect(t.length).toBeLessThanOrEqual(64);
  });

  it('new tokens differ', () => {
    expect(newOpaqueToken()).not.toBe(newOpaqueToken());
  });

  it('sha256Hex produces 64 hex chars', () => {
    const h = sha256Hex('hello');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });
});
