import { describe, it, expect } from 'vitest';
import { createJwtService } from './jwt.js';

const secret = 'a'.repeat(86);

describe('jwt service', () => {
  const jwt = createJwtService({ secret, accessTtl: '1h', issuer: 'naratala' });

  it('signs and verifies an access token', () => {
    const tok = jwt.signAccess({ sub: 42, role: 'hr' });
    const payload = jwt.verifyAccess(tok);
    expect(payload.sub).toBe(42);
    expect(payload.role).toBe('hr');
    expect(payload.jti).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects tampered tokens', () => {
    const tok = jwt.signAccess({ sub: 1, role: 'admin' });
    expect(() => jwt.verifyAccess(tok.slice(0, -2) + 'aa')).toThrow();
  });

  it('signs and verifies a short-lived mfaToken with scope=mfa', () => {
    const tok = jwt.signMfaToken({ sub: 7 });
    const p = jwt.verifyMfaToken(tok);
    expect(p.sub).toBe(7);
    expect(p.scope).toBe('mfa');
  });

  it('access-token verifier rejects mfaToken', () => {
    const mfa = jwt.signMfaToken({ sub: 7 });
    expect(() => jwt.verifyAccess(mfa)).toThrow();
  });
});
