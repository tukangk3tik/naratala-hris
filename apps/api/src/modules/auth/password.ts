import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { AuthError } from '../../shared/errors/index.js';

export const DUMMY_BCRYPT_HASH =
  '$2b$12$CwTycUXWue0Thq9StjUM0uJ8.lM1vlJxT9mZf8S8D9bQ/6IuHkbUa';

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export function assertPasswordStrong(plain: string): void {
  if (plain.length < 10)
    throw new AuthError('PASSWORD_TOO_WEAK', 'PASSWORD_TOO_WEAK: password too short');
  if (plain.length > 200)
    throw new AuthError('PASSWORD_TOO_WEAK', 'PASSWORD_TOO_WEAK: password too long');
}

type HibpFetcher = (prefix: string) => Promise<string>;

export async function checkPwned(
  plain: string,
  fetcher: HibpFetcher = defaultHibpFetcher,
): Promise<boolean> {
  const sha1 = createHash('sha1').update(plain).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  let body: string;
  try {
    body = await fetcher(prefix);
  } catch {
    return false;
  }
  for (const line of body.split(/\r?\n/)) {
    const [hashSuffix] = line.split(':');
    if (hashSuffix?.trim().toUpperCase() === suffix) return true;
  }
  return false;
}

async function defaultHibpFetcher(prefix: string): Promise<string> {
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
  });
  if (!res.ok) throw new Error(`hibp ${res.status}`);
  return res.text();
}
