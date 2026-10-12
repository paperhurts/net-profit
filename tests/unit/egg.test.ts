import { describe, expect, it } from 'vitest';
import {
  CRACK_WORDS,
  CRACKS,
  crackJolt,
  EGG_CINE,
  EGG_IN,
  EGG_OUT,
  eggCrackAt,
  eggDue,
  eggLook,
  HATCH_WAIT,
  INTO_SEA,
  POP_T,
} from '../../src/entities/egg';

describe("the Reaper's egg aboard", () => {
  it('hatches at the first dawn after it came aboard, and only while it is aboard', () => {
    expect(eggDue(2, 5, 5)).toBe(false);
    expect(eggDue(2, 5, 6)).toBe(true);
    expect(eggDue(2, 5, 9)).toBe(true);
    // In his nest, or hatched already: no.
    expect(eggDue(1, 0, 9)).toBe(false);
    expect(eggDue(3, 0, 9)).toBe(false);
    // A save from before it could hatch reads its day as 0: an egg already aboard is due at once.
    expect(eggDue(2, 0, 1)).toBe(true);
  });

  it('wobbles a little now and then until it hatches', () => {
    let most = 0;
    for (let T = 0; T < 11; T += 0.01) {
      const r = eggLook(T, null);
      most = Math.max(most, Math.abs(r.wob));
      expect([r.crack, r.hop, r.swell]).toEqual([0, 0, 0]);
    }
    expect(most).toBeGreaterThan(0.1);
    expect(most).toBeLessThan(0.2);
  });
});

describe('the hatching, a cutscene', () => {
  it('goes in order: in, Crack! Crack! Crrrrack!, out, over the side, and out again, in ten seconds', () => {
    const beats = [EGG_IN, ...CRACKS, POP_T, INTO_SEA, EGG_OUT, EGG_CINE];
    expect([...beats].sort((a, b) => a - b)).toEqual(beats);
    expect(CRACK_WORDS).toEqual(['Crack!', 'Crack!', 'Crrrrack!']);
    expect(EGG_CINE).toBeLessThanOrEqual(10);
    expect(HATCH_WAIT).toBeGreaterThan(0);
    // Each beat holds long enough to read.
    for (let i = 1; i < CRACKS.length; i++)
      expect((CRACKS[i] ?? 0) - (CRACKS[i - 1] ?? 0)).toBeGreaterThan(0.8);
    expect(INTO_SEA - POP_T).toBeGreaterThan(2.5);
  });

  it('cracks a step at a time, all the way round at the last, and jumps at each', () => {
    expect(eggCrackAt(0)).toBe(0);
    expect(eggCrackAt((CRACKS[0] ?? 0) + 0.01)).toBeCloseTo(1 / 3);
    expect(eggCrackAt((CRACKS[1] ?? 0) + 0.01)).toBeCloseTo(2 / 3);
    expect(eggCrackAt(POP_T)).toBe(1);
    for (const c of CRACKS) {
      expect(crackJolt(c)).toBe(1);
      expect(crackJolt(c + 0.31)).toBe(0);
      expect(eggLook(1, c).hop).toBe(1);
    }
    expect(crackJolt(0.5)).toBe(0);
  });

  it('shakes harder and swells toward the pop', () => {
    const shake = (from: number, to: number) => {
      let m = 0;
      for (let t = from; t < to; t += 0.01) m = Math.max(m, Math.abs(eggLook(t * 3.1, t).wob));
      return m;
    };
    expect(shake(4.4, POP_T)).toBeGreaterThan(shake(0, 1.2) * 2);
    expect(eggLook(0, 4.5).swell).toBeGreaterThan(eggLook(0, 0.5).swell);
  });
});
