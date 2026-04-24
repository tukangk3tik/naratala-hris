import { createHash, randomBytes } from 'node:crypto';

export function newOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256Hex(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
