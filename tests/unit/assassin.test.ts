import { describe, expect, it } from 'vitest';
import {
  behind,
  daggerPower,
  knifePower,
  noTrick,
  SHADOW_BEHIND,
  sneakPower,
  TRICK_SPECS,
  TRICKS,
  trick,
  VANISH_TIME,
} from '../../src/data/assassin';
import { eatPepper, freshFury, tickFury } from '../../src/data/warrior';

describe('the Assassin', () => {
  it('four buttons: Vanish, throwing knives, a smoke bomb and shadow step', () => {
    expect(TRICKS).toEqual(['vanish', 'knives', 'smoke', 'shadow']);
  });
  it('his sneak attack: 2, 4 and 5 (his), then 7 and 9', () => {
    expect([1, 2, 3, 4, 5, 8, 9, 15, 16, 20].map(sneakPower)).toEqual([
      2, 2, 4, 4, 5, 5, 7, 7, 9, 9,
    ]);
  });
  it('quick daggers 1 to 4; a knife a dagger less one, at least 1', () => {
    expect([1, 6, 11, 16].map(daggerPower)).toEqual([1, 2, 3, 4]);
    expect([1, 6, 11, 16].map(knifePower)).toEqual([1, 1, 2, 3]);
  });
  it('the loop broken: Vanish waits 6 s and lasts 5 s at most', () => {
    expect(TRICK_SPECS.vanish.every).toBe(6);
    expect(VANISH_TIME).toBe(5);
    expect(VANISH_TIME).toBeLessThan(TRICK_SPECS.vanish.every);
    const f = freshFury();
    expect(trick(f, 'vanish')).toBe(true);
    expect(noTrick(f, 'vanish')).toBe('wait');
    tickFury(f, 6);
    expect(noTrick(f, 'vanish')).toBe(null);
  });
  it('a hot pepper skips his waits too', () => {
    const f = freshFury();
    trick(f, 'smoke');
    eatPepper(f);
    expect(trick(f, 'smoke')).toBe(true);
    expect(f.cd.smoke).toBe(0);
  });
  it('shadow step lands just behind, kept on the floor', () => {
    const floor = { x: 0, y: 0, r: 300 };
    expect(behind({ x: 0, y: 0 }, { x: 100, y: 0 }, floor)).toEqual({
      x: 100 + SHADOW_BEHIND,
      y: 0,
    });
    const edge = behind({ x: 0, y: 0 }, { x: 270, y: 0 }, floor);
    expect(edge.x).toBeLessThanOrEqual(278);
  });
});
