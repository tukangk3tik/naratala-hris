import { describe, it, expect } from 'vitest';
import { authenticator } from 'otplib';
import { generateTotpSecret, totpOtpauthUrl, verifyTotp, generateRecoveryCodes } from './mfa.js';

describe('totp', () => {
  it('generates a base32 secret and a verifiable code', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    const code = authenticator.generate(secret);
    expect(verifyTotp(secret, code)).toBe(true);
    expect(verifyTotp(secret, '000000')).toBe(false);
  });

  it('builds an otpauth URL', () => {
    const url = totpOtpauthUrl('JBSWY3DPEHPK3PXP', 'Naratala HRIS', 'alice@naratala.local');
    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain('issuer=Naratala%20HRIS');
  });

  it('generates 10 unique recovery codes with a delimiter', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });
});
