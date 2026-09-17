import { describe, expect, it } from 'vitest';
import { hullScale, levelCap, paintsUnlocked, rangeOf, tierOf } from '../../src/data/progression';
import { num, tableRows } from './doc';

describe('tierOf', () => {
  it('is the floor of the mean level, capped at flagship', () => {
    expect(tierOf({ net: 0, hold: 0, engine: 0 })).toBe(0);
    expect(tierOf({ net: 1, hold: 1, engine: 0 })).toBe(0);
    expect(tierOf({ net: 1, hold: 1, engine: 1 })).toBe(1);
    expect(tierOf({ net: 5, hold: 5, engine: 4 })).toBe(4);
    expect(tierOf({ net: 5, hold: 5, engine: 5 })).toBe(5);
  });
});

describe('tier table', () => {
  const rows = tableRows('0 | dinghy');
  it('matches hull scale, range and paints unlocked for every tier', () => {
    expect(rows).toHaveLength(6);
    rows.forEach((r, i) => {
      expect(hullScale(i)).toBeCloseTo(num(r[2]));
      if (r[3] === 'unlimited') expect(rangeOf(i)).toBeGreaterThan(1e8);
      else expect(rangeOf(i)).toBe(num(r[3]));
      expect(paintsUnlocked(i)).toBe(num(r[4]));
    });
  });
});

describe('levelCap', () => {
  it('is min(5, 2 + stage)', () => {
    expect([0, 1, 2, 3, 4, 5].map(levelCap)).toEqual([2, 3, 4, 5, 5, 5]);
  });
  it('matches the caps the palace table promises', () => {
    const rows = tableRows('1 | tree platform');
    let promised = 0;
    rows.forEach((r, i) => {
      const m = /cap → (\d+)/.exec(r[4] ?? '');
      if (!m) return;
      promised++;
      // The table counts levels from 1; the code indexes them from 0.
      expect(levelCap(i + 1) + 1).toBe(Number(m[1]));
    });
    expect(promised).toBe(3);
  });
});
