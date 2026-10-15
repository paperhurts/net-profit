import { describe, expect, it } from 'vitest';
import {
  ARMOUR_MAX,
  ARMOURS,
  armourAt,
  BASE_HEARTS,
  HONOR_GUARD,
  hasKnife,
  heartsFor,
  KNIFE,
  knifeUse,
  nextArmour,
  SPACE_ARMOUR,
} from '../../src/data/armour';
import { SPEARS } from '../../src/data/spear';
import { HOP, MOOR_TIME, Walker } from '../../src/entities/walker';
import { DOCK } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

describe('armour', () => {
  it("comes in the kid's order, leather, diamond, gold, space, then his Honor Guard, each more hearts and dearer", () => {
    expect(ARMOURS.map((a) => a.name)).toEqual([
      'Leather armour',
      'Diamond armour',
      'Gold armour',
      'Space armour',
      'Honor Guard armour',
    ]);
    expect(BASE_HEARTS).toBe(3);
    let hearts = BASE_HEARTS;
    let cost = 0;
    for (const a of ARMOURS) {
      expect(a.hearts).toBe(a.name === 'Honor Guard armour' ? 9 : hearts + 1);
      expect(a.cost).toBeGreaterThan(cost);
      hearts = a.hearts;
      cost = a.cost;
    }
    expect(ARMOURS[SPACE_ARMOUR - 1]?.name).toBe('Space armour');
    expect(ARMOURS[HONOR_GUARD - 1]?.name).toBe('Honor Guard armour');
  });

  it('gives the hearts of the level worn, three with none', () => {
    expect(heartsFor(0)).toBe(3);
    expect(heartsFor(1)).toBe(4);
    expect(heartsFor(SPACE_ARMOUR)).toBe(7);
    expect(heartsFor(ARMOUR_MAX)).toBe(9);
    expect(heartsFor(ARMOUR_MAX + 3)).toBe(9);
    expect(armourAt(0)).toBeNull();
    expect(armourAt(2)).toBe(ARMOURS[1]);
  });

  it('is sold a level at a time, space armour only once the portal is awake', () => {
    expect(nextArmour(0, false)).toBe(ARMOURS[0]);
    expect(nextArmour(2, false)).toBe(ARMOURS[2]);
    expect(nextArmour(SPACE_ARMOUR - 1, false)).toBeNull();
    expect(nextArmour(SPACE_ARMOUR - 1, true)).toBe(ARMOURS[SPACE_ARMOUR - 1]);
    expect(nextArmour(ARMOUR_MAX, true, true)).toBeNull();
  });

  it('has Honor Guard only once the Heron is beaten on island 9', () => {
    expect(nextArmour(HONOR_GUARD - 1, true)).toBeNull();
    expect(nextArmour(HONOR_GUARD - 1, true, false)).toBeNull();
    expect(nextArmour(HONOR_GUARD - 1, true, true)).toBe(ARMOURS[HONOR_GUARD - 1]);
  });

  it("brings the survival knife: 4 a blow, stabbed up close, thrown a little further, the spear's past that", () => {
    expect(hasKnife(SPACE_ARMOUR)).toBe(false);
    expect(hasKnife(HONOR_GUARD)).toBe(true);
    expect(KNIFE.power).toBe(4);
    expect(knifeUse(SPACE_ARMOUR, 10)).toBeNull();
    expect(knifeUse(HONOR_GUARD, 10)).toBe('stab');
    expect(knifeUse(HONOR_GUARD, KNIFE.reach)).toBe('stab');
    expect(knifeUse(HONOR_GUARD, KNIFE.reach + 1)).toBe('throw');
    expect(knifeUse(HONOR_GUARD, KNIFE.range)).toBe('throw');
    expect(knifeUse(HONOR_GUARD, KNIFE.range + 1)).toBeNull();
    // It hits harder than any spear; the spears still reach further, so they still have a use.
    for (const sp of SPEARS) expect(KNIFE.power).toBeGreaterThan(sp.power);
    expect(Math.max(...SPEARS.map((sp) => sp.range))).toBeGreaterThan(KNIFE.range);
    expect(KNIFE.stabReload).toBeLessThan(KNIFE.reload);
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
    // Honor Guard's plume and cape are more than gold armour's helmet; the knife shows at the belt.
    const gold = ARMOURS[2]?.look ?? null;
    const honor = ARMOURS[HONOR_GUARD - 1]?.look ?? null;
    expect(fills(honor)).toBeGreaterThan(fills(gold));
    p.knife = true;
    const withKnife = fills(honor);
    p.knife = false;
    expect(withKnife).toBeGreaterThan(fills(honor));
  });
});
