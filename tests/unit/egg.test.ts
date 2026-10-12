import { describe, expect, it } from 'vitest';
import { eggDue, eggRock, HATCH_T, HATCH_WAIT } from '../../src/entities/egg';

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

  it('wobbles a little now and then until it hatches, then rocks harder and cracks all the way round', () => {
    let most = 0;
    for (let T = 0; T < 11; T += 0.01) {
      const r = eggRock(T, 0);
      most = Math.max(most, Math.abs(r.wob));
      expect(r.crack).toBe(0);
      expect(r.hop).toBe(0);
    }
    expect(most).toBeGreaterThan(0.1);
    expect(most).toBeLessThan(0.2);
    let hard = 0;
    for (let T = 0; T < 2; T += 0.01) hard = Math.max(hard, Math.abs(eggRock(T, 0.9).wob));
    expect(hard).toBeGreaterThan(most);
    expect(eggRock(1, 0.2).crack).toBeLessThan(eggRock(1, 0.5).crack);
    expect(eggRock(1, 1).crack).toBe(1);
    expect(eggRock(1, 0.3).hop).toBe(0);
    expect(HATCH_WAIT + HATCH_T).toBeLessThan(10);
  });
});
