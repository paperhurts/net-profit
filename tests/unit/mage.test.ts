import { describe, expect, it } from 'vitest';
import {
  BLINK_STEP,
  boltPower,
  CLOCK_DROP,
  CLOCK_HITS,
  clockHeight,
  DECOY_LIFE,
  DECOYS,
  HASTE,
  hasteWaits,
  MAGE_SPECS,
  MAGE_TRICKS,
  mageTrick,
  noTrick,
  SHEEP_TIME,
  SLOW_HOLD,
  SLOW_PULSE,
  SLOW_TIME,
} from '../../src/data/mage';
import { basicPower, eatPepper, freshFury, tickFury } from '../../src/data/warrior';
import { ARMOR_HITS, ARMOR_TIME, MISTY_STEP } from '../../src/data/wizard';
import { ALLY } from '../../src/entities/allies';

describe('the Mage: his numbers', () => {
  it('four tricks in button order, and his waits', () => {
    expect(MAGE_TRICKS).toEqual(['blink', 'sheep', 'slow', 'armor']);
    expect(MAGE_TRICKS.map((t) => MAGE_SPECS[t].every)).toEqual([6, 8, 20, 20]);
  });
  it('the bolt is the Warrior’s blow, from range', () => {
    for (const lv of [1, 5, 10, 20]) expect(boltPower(lv)).toBe(basicPower(lv));
  });
  it('blink leaves three decoys of 2 hits, poking for 1, gone after 8 s, a hop the misty step’s', () => {
    expect([DECOYS, ALLY.decoy.hp, ALLY.decoy.hit, DECOY_LIFE]).toEqual([3, 2, 1, 8]);
    expect(BLINK_STEP).toBe(MISTY_STEP);
  });
  it('a sheep for 5 s (his), never a boss; mage armor the Wizard’s', () => {
    expect(SHEEP_TIME).toBe(5);
    expect([ARMOR_HITS, ARMOR_TIME]).toEqual([2, 10]);
  });
  it('Slow Time: 4 s, the rest held half of every second, the Mage twice as quick', () => {
    expect([SLOW_TIME, SLOW_HOLD / SLOW_PULSE, HASTE]).toEqual([4, 0.5, 2]);
  });
});

describe('the Mage: his tricks', () => {
  it('each waits after use, and the pepper skips the waits', () => {
    const f = freshFury();
    expect(mageTrick(f, 'blink')).toBe(true);
    expect(noTrick(f, 'blink')).toBe('wait');
    expect(mageTrick(f, 'blink')).toBe(false);
    eatPepper(f);
    expect(mageTrick(f, 'blink')).toBe(true);
    expect(f.cd.blink).toBe(0);
  });
  it('in Slow Time his waits run down twice as fast', () => {
    const f = freshFury();
    mageTrick(f, 'sheep');
    tickFury(f, 2);
    hasteWaits(f, 2);
    expect(f.cd.sheep).toBe(MAGE_SPECS.sheep.every - 4);
    tickFury(f, 9);
    hasteWaits(f, 9);
    expect(f.cd.sheep).toBe(0);
  });
});

describe('the grandfather clock', () => {
  it('falls from the sky, lands, bounces twice and stands', () => {
    expect(clockHeight(0)).toBe(CLOCK_DROP);
    const [a, b, c] = CLOCK_HITS;
    expect(clockHeight(a)).toBeCloseTo(0, 6);
    expect(clockHeight((a + b) / 2)).toBeGreaterThan(30);
    expect(clockHeight((b + c) / 2)).toBeGreaterThan(10);
    expect(clockHeight((b + c) / 2)).toBeLessThan(clockHeight((a + b) / 2));
    expect(clockHeight(c + 0.5)).toBe(0);
    for (let t = 0; t < 2; t += 0.05) expect(clockHeight(t)).toBeGreaterThanOrEqual(0);
  });
});
