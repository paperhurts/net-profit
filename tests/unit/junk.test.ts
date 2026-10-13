import { describe, expect, it } from 'vitest';
import {
  bakeable,
  JUNK_CHANCE,
  JUNK_KINDS,
  JUNK_MAX,
  JUNK_NAMES,
  junkWith,
  MUFFIN_BOX,
  parseMuffins,
} from '../../src/data/junk';

/** A fixed run of random numbers. */
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length] ?? 0;
};

describe('junk in the net', () => {
  it('comes up with a fish now and then, each kind in turn of the draw', () => {
    expect(junkWith(seq(JUNK_CHANCE + 0.01), 0)).toBeNull();
    JUNK_KINDS.forEach((k, i) => {
      expect(junkWith(seq(0, (i + 0.5) / JUNK_KINDS.length), 0)).toBe(k);
    });
    expect(Object.keys(JUNK_NAMES).sort()).toEqual([...JUNK_KINDS].sort());
  });

  it('about one fish in twenty brings some', () => {
    let rng = 7;
    const r = () => {
      rng = (rng * 16807) % 2147483647;
      return rng / 2147483647;
    };
    let n = 0;
    for (let i = 0; i < 20000; i++) if (junkWith(r, 0)) n++;
    expect(n / 20000).toBeCloseTo(JUNK_CHANCE, 2);
  });

  it('stops once the bucket is full', () => {
    expect(junkWith(seq(0), JUNK_MAX - 1)).not.toBeNull();
    expect(junkWith(seq(0), JUNK_MAX)).toBeNull();
  });
});

describe("the muffin man's baking", () => {
  it('takes a piece of junk for each muffin there is room for in the box of six', () => {
    expect(MUFFIN_BOX).toBe(6);
    expect(bakeable(3, 0)).toBe(3);
    expect(bakeable(10, 0)).toBe(6);
    expect(bakeable(10, 4)).toBe(2);
    expect(bakeable(10, 6)).toBe(0);
    expect(bakeable(0, 2)).toBe(0);
  });

  it('reads a saved box back: times only, at most six, none if missing', () => {
    expect(parseMuffins(undefined)).toEqual([]);
    expect(parseMuffins('3')).toEqual([]);
    expect(parseMuffins([1.5, null, 2, Number.NaN, -1, 3])).toEqual([1.5, 2, 3]);
    expect(parseMuffins([1, 2, 3, 4, 5, 6, 7])).toHaveLength(6);
  });
});
