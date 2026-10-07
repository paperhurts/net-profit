import { describe, expect, it } from 'vitest';
import { HP_MAX, HURT, hurt, MEND, mend } from '../../src/data/health';

describe('the boat’s health', () => {
  it('takes three gulper bites to run out, and never goes below none', () => {
    let hp = HP_MAX;
    hp = hurt(hp, HURT.gulper);
    hp = hurt(hp, HURT.gulper);
    expect(hp).toBeGreaterThan(0);
    hp = hurt(hp, HURT.gulper);
    expect(hp).toBe(0);
    expect(hurt(5, 30)).toBe(0);
  });

  it('survives a leviathan and a tentacle or two', () => {
    expect(hurt(hurt(hurt(HP_MAX, HURT.leviathan), HURT.tentacle), HURT.tentacle)).toBeGreaterThan(
      0,
    );
  });

  it('is made good at a dock, mended at home, and left alone in the deep', () => {
    expect(mend(10, 0.1, false, true)).toBe(HP_MAX);
    expect(mend(10, 1, true, false)).toBe(10 + MEND);
    expect(mend(99, 1, true, false)).toBe(HP_MAX);
    expect(mend(10, 1, false, false)).toBe(10);
  });
});
