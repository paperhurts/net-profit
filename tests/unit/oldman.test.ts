import { describe, expect, it } from 'vitest';
import {
  DAD_JOKES,
  noSnacks,
  parseSnacks,
  SNACK_KINDS,
  SNACK_MAX,
  SNACKS,
} from '../../src/data/snacks';
import { CHUCKLE_FOR, OLDMAN_REACH, OldMan, WAVE_REACH } from '../../src/entities/oldman';
import { walkable } from '../../src/entities/walker';
import {
  ISLE10,
  inWater10,
  OLDMAN10,
  onIsle10Ground,
  regionAt,
  SHACK10,
  STORE10,
} from '../../src/world/isle10';
import { baseWorld } from './helpers/world';

describe("island 10's old man and his store", () => {
  it('sits on the prairie, by his shack, clear of the water, and the shack stands in the way', () => {
    expect(regionAt(STORE10.x, STORE10.y)).toBe('prairie');
    expect(onIsle10Ground(OLDMAN10.x, OLDMAN10.y)).toBe(true);
    expect(inWater10(OLDMAN10.x, OLDMAN10.y, 20)).toBe(false);
    const mid = { x: (SHACK10.x0 + SHACK10.x1) / 2, y: (SHACK10.y0 + SHACK10.y1) / 2 };
    expect(walkable(mid.x, mid.y, 0)).toBe(false);
    // Up from the pier, in sight as the figure comes ashore.
    expect(OLDMAN10.y).toBeGreaterThan(ISLE10.y + 300);
    // Somewhere a figure can stand within reach of him.
    let reach = false;
    for (let a = 0; a < Math.PI * 2 && !reach; a += 0.2)
      for (const r of [16, 24, 32, 44])
        if (walkable(OLDMAN10.x + Math.cos(a) * r, OLDMAN10.y + Math.sin(a) * r, 0)) {
          expect(r).toBeLessThan(OLDMAN_REACH);
          reach = true;
          break;
        }
    expect(reach).toBe(true);
  });

  it('tells his jokes in turn, each a new one, chuckling, and starts again at the end', () => {
    const m = new OldMan();
    expect(new Set(DAD_JOKES).size).toBe(DAD_JOKES.length);
    expect(DAD_JOKES.length).toBeGreaterThanOrEqual(12);
    const heard = DAD_JOKES.map(() => m.tell());
    expect(heard).toEqual([...DAD_JOKES]);
    expect(m.chuckle).toBe(CHUCKLE_FOR);
    expect(m.tell()).toBe(DAD_JOKES[0]);
    m.update(CHUCKLE_FOR + 0.1, baseWorld({ figure: null }));
    expect(m.chuckle).toBe(0);
  });

  it('waves once as the figure comes up, not again until it has gone and come back', () => {
    const m = new OldMan();
    const at = (d: number) =>
      baseWorld({ figure: { x: OLDMAN10.x + d, y: OLDMAN10.y, vx: 0, vy: 0 } });
    m.update(0.1, at(WAVE_REACH + 40));
    expect(m.wave).toBe(0);
    m.update(0.1, at(WAVE_REACH - 20));
    expect(m.wave).toBeGreaterThan(0);
    for (let t = 0; t < 3; t += 0.1) m.update(0.1, at(WAVE_REACH - 20));
    expect(m.wave).toBe(0);
    m.update(0.1, at(WAVE_REACH + 40));
    m.update(0.1, at(WAVE_REACH - 20));
    expect(m.wave).toBeGreaterThan(0);
    expect(OldMan.reaches(OLDMAN10.x + OLDMAN_REACH - 1, OLDMAN10.y)).toBe(true);
    expect(OldMan.reaches(OLDMAN10.x + OLDMAN_REACH + 1, OLDMAN10.y)).toBe(false);
  });

  it('sells an apple, a carrot and a banana, cheap; the bag keeps whole numbers, nine of each at most', () => {
    expect(SNACK_KINDS.map((k) => SNACKS[k].name)).toEqual(['Apple', 'Carrot', 'Banana']);
    for (const k of SNACK_KINDS) expect(SNACKS[k].price).toBeLessThan(50);
    expect(noSnacks()).toEqual({ apple: 0, carrot: 0, banana: 0 });
    expect(parseSnacks({ apple: 2, carrot: 99, banana: -3 })).toEqual({
      apple: 2,
      carrot: SNACK_MAX,
      banana: 0,
    });
    expect(parseSnacks({ apple: 2.7, carrot: 'x', banana: Number.NaN })).toEqual({
      apple: 2,
      carrot: 0,
      banana: 0,
    });
    for (const bad of [undefined, null, 5, 'apples']) expect(parseSnacks(bad)).toEqual(noSnacks());
  });
});
