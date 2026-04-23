import { createHash } from 'node:crypto';

export function hueFromName(name: string): number {
  const digest = createHash('sha256').update(name.trim().toLowerCase()).digest();
  const n = digest.readUInt16BE(0);
  return n % 360;
}
