import { authenticator } from 'otplib';
import { randomBytes } from 'node:crypto';

authenticator.options = { window: 1, step: 30 };

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function totpOtpauthUrl(secret: string, issuer: string, accountName: string): string {
  return authenticator.keyuri(accountName, issuer, secret);
}

export function verifyTotp(secret: string, code: string): boolean {
  try {
    return authenticator.check(code, secret);
  } catch {
    return false;
  }
}

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function pickChar(b: number): string {
  return ALPHA[b % ALPHA.length]!;
}

export function generateRecoveryCodes(): string[] {
  const out = new Set<string>();
  while (out.size < 10) {
    const buf = randomBytes(8);
    const left = Array.from(buf.subarray(0, 4)).map(pickChar).join('');
    const right = Array.from(buf.subarray(4, 8)).map(pickChar).join('');
    out.add(`${left}-${right}`);
  }
  return [...out];
}
