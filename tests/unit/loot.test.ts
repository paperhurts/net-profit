import { describe, expect, it } from 'vitest';
import { BODY } from '../../src/entities/diver';
import { drawLoot, drawLootGlint } from '../../src/render/loot';
import { type Bounds, parseSave, serializeSave } from '../../src/state/save';
import {
  CLAM,
  foundCount,
  LOOT_ALL,
  LOOT_ONCE,
  LOOT_REACH,
  lootNear,
  pearlReady,
  TRENCH_LOOT,
  taken,
} from '../../src/world/loot';
import { inWater, keepInWater, SUNLIT, zoneAt } from '../../src/world/trench';
import { fakeView } from './helpers/view';

const bounds: Bounds = {
  maxLevel: 5,
  paints: 10,
  stages: 5,
  species: 19,
  worldSize: 4800,
  holdCaps: [12, 20, 32, 50, 80, 120],
};

describe("the trench's treasure", () => {
  it('lies in the water, below the sunlit water, from a ledge in the twilight down to the floor', () => {
    expect(TRENCH_LOOT.length).toBe(6);
    for (const l of TRENCH_LOOT) {
      expect(inWater(l.x, l.y), l.name).toBe(true);
      expect(l.y).toBeGreaterThan(SUNLIT);
      expect(l.coins).toBeGreaterThan(0);
    }
    expect(zoneAt(TRENCH_LOOT[0]?.y ?? 0)).toBe('twilight');
    expect(TRENCH_LOOT.filter((l) => l.on === 'floor').map((l) => l.kind)).toEqual([
      'clam',
      'chest',
    ]);
    // The chest is worth the most.
    const chest = TRENCH_LOOT.find((l) => l.kind === 'chest');
    expect(Math.max(...TRENCH_LOOT.map((l) => l.coins))).toBe(chest?.coins);
  });

  it('can be reached: a diver pressed up against each one is within reach of it', () => {
    for (const l of TRENCH_LOOT) {
      const p = { x: l.x, y: l.y };
      keepInWater(p, BODY);
      expect(Math.hypot(p.x - l.x, p.y - l.y), l.name).toBeLessThan(LOOT_REACH);
    }
  });

  it('is picked up once, all but the clam, whose pearl grows back each new day', () => {
    const chest = TRENCH_LOOT.findIndex((l) => l.kind === 'chest');
    const c = TRENCH_LOOT[chest];
    const clam = TRENCH_LOOT[CLAM];
    if (!c || !clam) throw new Error('no chest or clam');
    expect(lootNear(TRENCH_LOOT, 0, c.x, c.y - 5, true)).toBe(chest);
    // Too far off, nothing.
    expect(lootNear(TRENCH_LOOT, 0, c.x, c.y - LOOT_REACH - 5, true)).toBeNull();
    // Found, it is not picked up again.
    const found = 1 << chest;
    expect(taken(found, chest)).toBe(true);
    expect(lootNear(TRENCH_LOOT, found, c.x, c.y - 5, true)).toBeNull();
    expect(foundCount(found)).toBe(1);
    // The clam: there with a pearl, not without; never counted as found.
    expect(lootNear(TRENCH_LOOT, 0, clam.x, clam.y - 5, true)).toBe(CLAM);
    expect(lootNear(TRENCH_LOOT, 0, clam.x, clam.y - 5, false)).toBeNull();
    expect(taken(0xff, CLAM)).toBe(false);
    expect(foundCount(LOOT_ALL)).toBe(LOOT_ONCE);
    expect(pearlReady(0, 1)).toBe(true);
    expect(pearlReady(3, 3)).toBe(false);
    expect(pearlReady(3, 4)).toBe(true);
  });

  it('is kept in the save, and an older save has found none and a pearl waiting', () => {
    const old = parseSave(JSON.stringify({ coins: 5 }), bounds);
    expect(old.trenchLoot).toBe(0);
    expect(old.pearlDay).toBe(0);
    old.trenchLoot = 0b100101;
    old.pearlDay = 7;
    const back = parseSave(serializeSave(old), bounds);
    expect(back.trenchLoot).toBe(0b100101 & LOOT_ALL);
    expect(back.pearlDay).toBe(7);
    // Bits that are no treasure, or the clam's, are dropped.
    expect(parseSave(JSON.stringify({ trenchLoot: -1, pearlDay: -4 }), bounds)).toMatchObject({
      trenchLoot: LOOT_ALL,
      pearlDay: 0,
    });
  });

  it('draws each one, found or not, with a glint over the dark until it is found', () => {
    TRENCH_LOOT.forEach((l, i) => {
      for (const found of [false, true]) {
        const v = fakeView();
        const X = (x: number) => x;
        drawLoot(v.v.ctx, X, X, 1, l, 2, found, true);
        drawLootGlint(v.v.ctx, X, X, 1, l, i, 2, found, true);
        if (!found) expect(v.calls.fill ?? 0, l.name).toBeGreaterThan(1);
      }
    });
    // A found treasure has no glint; nor has the clam without its pearl.
    const v = fakeView();
    const X = (x: number) => x;
    const clam = TRENCH_LOOT[CLAM];
    if (!clam) throw new Error('no clam');
    drawLootGlint(v.v.ctx, X, X, 1, clam, CLAM, 2, false, false);
    drawLootGlint(v.v.ctx, X, X, 1, TRENCH_LOOT[0] as never, 0, 2, true, true);
    expect(v.calls.fill ?? 0).toBe(0);
  });
});
