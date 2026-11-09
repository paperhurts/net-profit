import { describe, expect, it } from 'vitest';
import { CLASSES, parseClass } from '../../src/data/classes';
import { eatPepper, freshFury, tickFury } from '../../src/data/warrior';
import {
  ARMOR_HITS,
  ARMOR_TIME,
  BURN_EVERY,
  BURN_TIME,
  burnPower,
  cast,
  fireballPower,
  GREASE_R,
  GREASE_TIME,
  ignite,
  MISTY_STEP,
  missilePower,
  mistyTo,
  noSpell,
  puddle,
  SPELL_SPECS,
  tickPuddle,
} from '../../src/data/wizard';

describe('the classes', () => {
  it('the classes so far; anything else reads as the Warrior', () => {
    expect(CLASSES).toEqual(['warrior', 'wizard', 'paladin', 'assassin', 'necromancer']);
    expect(parseClass('wizard')).toBe('wizard');
    expect(parseClass('druid')).toBe('warrior');
  });
});

describe('the Wizard: his numbers', () => {
  it('fireball 1 at levels 1 to 2, 3 at 3 to 4, 4 at 5 to 9, 5 from 10', () => {
    expect([1, 2, 3, 4, 5, 9, 10, 20].map(fireballPower)).toEqual([1, 1, 3, 3, 4, 4, 5, 5]);
  });
  it('magic missile: none before level 7, 10 from 7, 13 from 11', () => {
    expect([1, 6, 7, 10, 11, 20].map(missilePower)).toEqual([0, 0, 10, 10, 13, 13]);
  });
});

describe('the Wizard: casting', () => {
  it('magic missile waits for level 7; each spell waits after casting', () => {
    const f = freshFury();
    expect(noSpell(f, 'missile', 6)).toBe('level');
    expect(cast(f, 'missile', 7)).toBe(true);
    expect(noSpell(f, 'missile', 7)).toBe('wait');
    tickFury(f, SPELL_SPECS.missile.every);
    expect(noSpell(f, 'missile', 7)).toBe(null);
  });
  it('the owner’s mage armor: 2 hits, 10 s, every 20 s', () => {
    expect([ARMOR_HITS, ARMOR_TIME, SPELL_SPECS.armor.every]).toEqual([2, 10, 20]);
  });
  it('a hot pepper skips his waits too', () => {
    const f = freshFury();
    cast(f, 'grease', 1);
    eatPepper(f);
    expect(cast(f, 'grease', 1)).toBe(true);
    expect(cast(f, 'misty', 1)).toBe(true);
    expect(f.cd.grease).toBe(0);
    expect(f.skips).toBe(2);
  });
});

describe('the Wizard: grease, and a fireball on it', () => {
  it('slips what stands in it, then dries up', () => {
    const p = puddle(0, 0);
    expect(tickPuddle(p, 0.01).slip).toBe(true);
    expect(tickPuddle(p, 0.5).slip).toBe(false);
    let t = 0.51;
    while (t < GREASE_TIME + 1) {
      tickPuddle(p, 0.25);
      t += 0.25;
    }
    expect(p.t).toBe(0);
  });
  it('a fireball landing in it sets it alight: once a second for 4 s (the owner’s), then it is gone', () => {
    const ps = [puddle(0, 0)];
    expect(ignite(ps, GREASE_R + 1, 0)).toBe(false);
    expect(ignite(ps, 10, 10)).toBe(true);
    const p = ps[0];
    if (!p) throw new Error('no puddle');
    expect(BURN_EVERY).toBe(1);
    let burns = 0;
    for (let t = 0; t < BURN_TIME + 0.5; t += 0.1) if (tickPuddle(p, 0.1).burn) burns++;
    expect(burns).toBe(4);
    expect(p.fire).toBe(0);
    expect(p.t).toBe(0);
    expect([1, 3, 5, 10].map(burnPower)).toEqual([1, 2, 2, 3]);
  });
});

describe('the Wizard: misty step', () => {
  const floor = { x: 0, y: 0, r: 200 };
  it('goes where the stick points, else away from the nearest, kept on the floor', () => {
    expect(mistyTo({ x: 0, y: 0 }, { x: 1, y: 0 }, null, floor)).toEqual({ x: MISTY_STEP, y: 0 });
    expect(mistyTo({ x: 0, y: 0 }, null, { x: 0, y: 30 }, floor)).toEqual({ x: 0, y: -MISTY_STEP });
    const edge = mistyTo({ x: 150, y: 0 }, { x: 1, y: 0 }, null, floor);
    expect(Math.hypot(edge.x, edge.y)).toBeLessThanOrEqual(floor.r - 22 + 1e-9);
  });
});
