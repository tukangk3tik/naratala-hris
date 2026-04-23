import { describe, it, expect } from 'vitest';
import { hueFromName } from './avatarHue.js';

describe('hueFromName', () => {
  it('is deterministic', () => {
    expect(hueFromName('Ayu Wulan')).toBe(hueFromName('Ayu Wulan'));
  });
  it('yields 0..359', () => {
    for (const n of ['A', 'Ayu', 'Budi Santoso', 'Zoë']) {
      const h = hueFromName(n);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(359);
    }
  });
});
