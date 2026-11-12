import { describe, expect, it } from 'vitest';
import {
  LIGHT_SPECS,
  LIGHTS,
  MOON_BOLTS,
  moonPower,
  noLight,
  RINGS_HITS,
  RINGS_TIME,
  STARS_PER_HEART,
  SUN_HEAL,
  shine,
  starIn,
  starPower,
  sunPower,
} from '../../src/data/healer';
import { basicPower, eatPepper, freshFury, slamPower } from '../../src/data/warrior';

describe('the Healer: her numbers', () => {
  it('three buttons in order: Moonbeams, Sunshine, Saturn’s Rings', () => {
    expect(LIGHTS).toEqual(['moon', 'sun', 'rings']);
    expect([LIGHT_SPECS.moon.every, LIGHT_SPECS.rings.every]).toEqual([6, 15]);
  });
  it('Shooting Stars are the Warrior’s blow; Moonbeams five little bolts, 1 each, 2 from level 11', () => {
    for (const lv of [1, 5, 10, 20]) expect(starPower(lv)).toBe(basicPower(lv));
    expect(MOON_BOLTS).toBe(5);
    expect([1, 10, 11, 20].map(moonPower)).toEqual([1, 1, 2, 2]);
  });
  it('Sunshine: a Slam and 1, twice on vampires and deep sea creatures, and 3 hearts back', () => {
    expect(sunPower(1, false)).toBe(slamPower(1) + 1);
    expect(sunPower(1, true)).toBe((slamPower(1) + 1) * 2);
    expect(SUN_HEAL).toBe(3);
  });
  it('Saturn’s Rings soak 3 hits for 10 s', () => {
    expect([RINGS_HITS, RINGS_TIME]).toEqual([3, 10]);
  });
});

describe('the Healer: starlight', () => {
  it('a heart back every 3 hits', () => {
    expect(STARS_PER_HEART).toBe(3);
    let n = 0;
    const hearts: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      const r = starIn(n);
      n = r.n;
      hearts.push(r.heart);
    }
    expect(hearts).toEqual([false, false, true, false, false, true]);
  });
});

describe('the Healer: her waits', () => {
  it('Sunshine is once a round, and the pepper does not bring it back', () => {
    const f = freshFury();
    expect(noLight(f, 'sun', false)).toBe(null);
    expect(shine(f, 'sun', false)).toBe(true);
    eatPepper(f);
    expect(noLight(f, 'sun', true)).toBe('round');
    expect(shine(f, 'sun', true)).toBe(false);
  });
  it('the others wait, and the pepper skips their waits', () => {
    const f = freshFury();
    expect(shine(f, 'moon', false)).toBe(true);
    expect(noLight(f, 'moon', false)).toBe('wait');
    eatPepper(f);
    expect(shine(f, 'moon', false)).toBe(true);
    expect(f.cd.moon).toBe(0);
  });
});
