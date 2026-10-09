import { describe, expect, it } from 'vitest';
import {
  ARMOUR_MAX,
  ARMOURS,
  armourAt,
  BASE_HEARTS,
  heartsFor,
  nextArmour,
  SPACE_ARMOUR,
} from '../../src/data/armour';
import { HOP, MOOR_TIME, Walker } from '../../src/entities/walker';
import { DOCK } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

describe('armour', () => {
  it("comes in the kid's order, leather, diamond, gold, space, each a heart more and dearer", () => {
    expect(ARMOURS.map((a) => a.name)).toEqual([
      'Leather armour',
      'Diamond armour',
      'Gold armour',
      'Space armour',
    ]);
    expect(BASE_HEARTS).toBe(3);
    let hearts = BASE_HEARTS;
    let cost = 0;
    for (const a of ARMOURS) {
      expect(a.hearts).toBe(hearts + 1);
      expect(a.cost).toBeGreaterThan(cost);
      hearts = a.hearts;
      cost = a.cost;
    }
  });

  it('gives the hearts of the level worn, three with none', () => {
    expect(heartsFor(0)).toBe(3);
    expect(heartsFor(1)).toBe(4);
    expect(heartsFor(ARMOUR_MAX)).toBe(7);
    expect(heartsFor(ARMOUR_MAX + 3)).toBe(7);
    expect(armourAt(0)).toBeNull();
    expect(armourAt(2)).toBe(ARMOURS[1]);
  });

  it('is sold a level at a time, space armour only once the portal is awake', () => {
    expect(nextArmour(0, false)).toBe(ARMOURS[0]);
    expect(nextArmour(2, false)).toBe(ARMOURS[2]);
    expect(nextArmour(SPACE_ARMOUR - 1, false)).toBeNull();
    expect(nextArmour(SPACE_ARMOUR - 1, true)).toBe(ARMOURS[SPACE_ARMOUR - 1]);
    expect(nextArmour(ARMOUR_MAX, true)).toBeNull();
  });

  it('shows on the figure: a plate over the shirt, and a helmet above leather', () => {
    const w = baseWorld({ docked: true, boat: { x: DOCK.x + 40, y: DOCK.y + 60, h: 0.8, v: 0 } });
    const p = new Walker();
    p.stepAshore();
    for (let i = 0; i < (MOOR_TIME + HOP + 0.2) * 60; i++) p.update(1 / 60, w);
    expect(p.shown).toBe(true);
    const fills = (look: (typeof ARMOURS)[number]['look'] | null) => {
      p.armour = look;
      const { v, calls } = fakeView();
      p.draw(v, 'solids');
      return (calls.fill ?? 0) + (calls.stroke ?? 0);
    };
    const bare = fills(null);
    for (const a of ARMOURS) expect(fills(a.look), a.name).toBeGreaterThan(bare);
  });
});
