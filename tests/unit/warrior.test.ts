import { describe, expect, it } from 'vitest';
import {
  ABILITY_SPECS,
  addRage,
  BOSS_STUN,
  basicPower,
  bossStun,
  COMBO,
  eatPepper,
  freshFury,
  LEAP_R,
  LEAP_RANGE,
  leapPower,
  leapSpot,
  nextBlow,
  notNow,
  PEPPER_COST,
  PEPPER_MAX,
  PEPPER_SKIPS,
  PEPPER_TIME,
  peppered,
  RAGE_MAX,
  slamPower,
  tickFury,
  useAbility,
} from '../../src/data/warrior';

describe('the Warrior: rage', () => {
  it('tops out at 5 faces and never goes below none', () => {
    const f = freshFury();
    expect(RAGE_MAX).toBe(5);
    addRage(f, 9);
    expect(f.rage).toBe(5);
    addRage(f, -9);
    expect(f.rage).toBe(0);
  });
  it('his: Charge is free and makes 3; Slam costs 2; Leap costs 3', () => {
    expect(ABILITY_SPECS.charge).toMatchObject({ cost: 0, gain: 3 });
    expect(ABILITY_SPECS.slam).toMatchObject({ cost: 2, gain: 0 });
    expect(ABILITY_SPECS.leap).toMatchObject({ cost: 3, gain: 0 });
    const f = freshFury();
    expect(notNow(f, 'slam')).toBe('rage');
    expect(useAbility(f, 'charge')).toBe(true);
    expect(f.rage).toBe(3);
    expect(useAbility(f, 'leap')).toBe(true);
    expect(f.rage).toBe(0);
  });
  it('a basic blow goes stab, stab, bash', () => {
    const f = freshFury();
    expect(COMBO).toEqual(['stab', 'stab', 'bash']);
    expect([nextBlow(f), nextBlow(f), nextBlow(f), nextBlow(f)]).toEqual([
      'stab',
      'stab',
      'bash',
      'stab',
    ]);
  });
});

describe('the Warrior: cooldowns and the bounce', () => {
  it('Charge waits 6 s, so Charge, Leap, Charge cannot be chained', () => {
    const f = freshFury();
    useAbility(f, 'charge');
    useAbility(f, 'leap');
    tickFury(f, 1);
    expect(notNow(f, 'charge')).toBe('wait');
    tickFury(f, 5);
    expect(notNow(f, 'charge')).toBe(null);
  });
  it('the hot pepper: Charge, Leap, Charge, Leap, then the waits are back', () => {
    const f = freshFury();
    useAbility(f, 'charge');
    tickFury(f, 0.5);
    eatPepper(f);
    expect(peppered(f)).toBe(true);
    // A Charge already waiting does not hold him back.
    expect(notNow(f, 'charge')).toBe(null);
    for (const a of ['leap', 'charge', 'leap'] as const) {
      expect(useAbility(f, a)).toBe(true);
      tickFury(f, 0.6);
    }
    expect(useAbility(f, 'charge')).toBe(true);
    expect(f.skips).toBe(0);
    expect(peppered(f)).toBe(false);
    expect(f.cd.charge).toBe(0);
    // Spent: the next Charge waits as ever.
    expect(useAbility(f, 'leap')).toBe(true);
    expect(f.cd.leap).toBeGreaterThan(0);
  });
  it('a pepper skips 4 at most, lasts 8 s at most, and still costs rage', () => {
    expect([PEPPER_SKIPS, PEPPER_TIME, PEPPER_COST, PEPPER_MAX]).toEqual([4, 8, 200, 3]);
    const f = freshFury();
    eatPepper(f);
    expect(notNow(f, 'leap')).toBe('rage');
    tickFury(f, 8.1);
    expect(peppered(f)).toBe(false);
    expect(f.skips).toBe(0);
  });
  it('a boss is stunned half a second at most, and not again for 2 s', () => {
    const f = freshFury();
    expect(bossStun(f, 1)).toBe(BOSS_STUN);
    expect(bossStun(f, 1)).toBe(0);
    tickFury(f, 2.1);
    expect(bossStun(f, 1)).toBe(0.5);
  });
});

describe('the Warrior: damage by level', () => {
  it('basic 1, 2, 3, 4; Slam 2 to 5; Leap 3, 5, 7, 9; up at 6, 11 and 16', () => {
    expect([1, 5, 6, 10, 11, 15, 16, 20].map(basicPower)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    expect([1, 6, 11, 16].map(slamPower)).toEqual([2, 3, 4, 5]);
    expect([1, 6, 11, 16].map(leapPower)).toEqual([3, 5, 7, 9]);
  });
});

describe('the Warrior: where Leap lands', () => {
  it('on the biggest crowd in reach, nobody out of reach', () => {
    const me = { x: 0, y: 0 };
    const lone = { x: 40, y: 0 };
    const crowd = [
      { x: 200, y: 0 },
      { x: 220, y: 20 },
      { x: 210, y: -30 },
    ];
    // Each of the crowd has all three in its BANG: the nearest of them, never the lone one.
    expect(leapSpot(me, [lone, ...crowd])).toEqual({ x: 200, y: 0 });
    expect(leapSpot(me, [{ x: LEAP_RANGE + 1, y: 0 }])).toBe(null);
    expect(leapSpot(me, [])).toBe(null);
    expect(LEAP_R).toBeGreaterThan(0);
  });
});
