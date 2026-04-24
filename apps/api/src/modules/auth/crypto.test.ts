import { describe, it, expect } from 'vitest';
import { encryptGcm, decryptGcm } from './crypto.js';

const KEY = Buffer.alloc(32, 7);

describe('AES-256-GCM', () => {
  it('round-trips', () => {
    const ct = encryptGcm(KEY, 'JBSWY3DPEHPK3PXP');
    expect(ct).toBeInstanceOf(Buffer);
    expect(decryptGcm(KEY, ct)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('different encryptions produce different ciphertexts (random IV)', () => {
    const a = encryptGcm(KEY, 'secret');
    const b = encryptGcm(KEY, 'secret');
    expect(a.equals(b)).toBe(false);
  });

  it('wrong key fails', () => {
    const ct = encryptGcm(KEY, 'secret');
    expect(() => decryptGcm(Buffer.alloc(32, 8), ct)).toThrow();
  });

  it('tampered ciphertext fails', () => {
    const ct = encryptGcm(KEY, 'secret');
    ct[ct.length - 1] = (ct[ct.length - 1] ?? 0) ^ 0xff;
    expect(() => decryptGcm(KEY, ct)).toThrow();
  });

  it('rejects a non-32-byte key', () => {
    expect(() => encryptGcm(Buffer.alloc(16), 'x')).toThrow(/32/);
  });
});
