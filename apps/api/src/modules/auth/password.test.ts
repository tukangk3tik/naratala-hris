import { describe, it, expect, vi } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  assertPasswordStrong,
  checkPwned,
  DUMMY_BCRYPT_HASH,
} from './password.js';

describe('password', () => {
  it('hashes and verifies', async () => {
    const h = await hashPassword('correct-horse-battery');
    expect(await verifyPassword('correct-horse-battery', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });

  it('verifyPassword is safe when the hash is the dummy hash', async () => {
    expect(await verifyPassword('anything', DUMMY_BCRYPT_HASH)).toBe(false);
  });

  it('rejects passwords below 10 chars', () => {
    expect(() => assertPasswordStrong('short')).toThrow(/PASSWORD_TOO_WEAK/);
  });

  it('rejects passwords reported as pwned', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue('AAAAA0005AD76BD555C1D6D771DE417A4B87E4B4:9\n0000AABBBBCCCCC:2\n');
    // sha1("P@ssw0rd") = 21BD12DC183F740EE76F27B78EB39C8AD972A757
    await expect(checkPwned('P@ssw0rd', fetcher)).resolves.toBe(false);

    const pwnedFetcher = vi.fn().mockResolvedValue('2DC183F740EE76F27B78EB39C8AD972A757:42\n');
    await expect(checkPwned('P@ssw0rd', pwnedFetcher)).resolves.toBe(true);
  });
});
