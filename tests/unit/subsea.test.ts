import { describe, expect, it } from 'vitest';
import { Diver, SUB_BODY } from '../../src/entities/diver';
import { DEEP, FAR, IX, IY, WS } from '../../src/world/island';
import {
  PATCH,
  parseSubFound,
  patchAt,
  SUB_D,
  SUB_ENTRY,
  SUB_LOOT,
  SUB_SHALLOWEST,
  SUB_W,
  seabed,
  subLoot,
  subPlants,
  subShoals,
  subSite,
  subWater,
} from '../../src/world/subsea';

const DT = 1 / 60;

describe("the treasure submarine's sea", () => {
  it('only goes down out in the far deep, inside the edge of the sea', () => {
    expect(subWater(IX, IY)).toBe(false);
    expect(subWater(-DEEP / 2, IY)).toBe(false);
    expect(subWater(-DEEP - FAR / 2, IY)).toBe(true);
    expect(subWater(WS + DEEP + FAR / 2, -DEEP - FAR / 2)).toBe(true);
    expect(subWater(WS + DEEP + FAR + 10, IY)).toBe(false);
  });

  it('cuts the far deep into patches, each the same every time and different from the next', () => {
    const a = patchAt(-2000, 300);
    expect(patchAt(-2000 + 10, 300 + 10)).toEqual(a);
    const b = patchAt(-2000 + PATCH, 300);
    expect(b.key).not.toBe(a.key);
    expect(b.seed).not.toBe(a.seed);
    expect(subLoot(a.seed)).toEqual(subLoot(a.seed));
    expect(subLoot(b.seed)).not.toEqual(subLoot(a.seed));
  });

  it('every patch has a floor with room to dive, and keeps the submarine in the water', () => {
    for (let seed = 1; seed < 40; seed++) {
      const floor = seabed(seed * 7919);
      for (let x = 0; x <= SUB_W; x += 25) {
        expect(floor(x)).toBeGreaterThanOrEqual(SUB_SHALLOWEST);
        expect(floor(x)).toBeLessThanOrEqual(SUB_D);
      }
      const site = subSite(seed * 7919);
      expect(site.id).toBe('sub');
      expect(site.inWater(SUB_ENTRY, 30)).toBe(true);
      const p = { x: SUB_W + 50, y: 5000 };
      site.keep(p, SUB_BODY);
      expect(site.inWater(p.x, p.y, SUB_BODY - 1)).toBe(true);
    }
  });

  it('three treasures on each floor, apart, away from where the submarine goes down', () => {
    for (let seed = 1; seed < 40; seed++) {
      const floor = seabed(seed * 104729);
      const loot = subLoot(seed * 104729);
      expect(loot).toHaveLength(SUB_LOOT);
      for (const l of loot) {
        expect(l.on).toBe('floor');
        expect(l.y).toBeCloseTo(floor(l.x) - 4, 5);
        expect(Math.abs(l.x - SUB_ENTRY)).toBeGreaterThanOrEqual(120);
        expect(l.coins).toBeGreaterThan(0);
        for (const o of loot) if (o !== l) expect(Math.abs(o.x - l.x)).toBeGreaterThan(200);
      }
    }
  });

  it('plants grow on the floor; fish up top always, and the deep ones only where it is deep', () => {
    let deepOnes = 0;
    for (let seed = 1; seed < 60; seed++) {
      const floor = seabed(seed);
      for (const p of subPlants(seed)) {
        expect(p.from).toBe('floor');
        expect(p.y).toBeCloseTo(floor(p.x), 5);
      }
      const shoals = subShoals(seed);
      expect(shoals.filter((s) => s.kind === 'silver').length).toBe(2);
      expect(shoals.some((s) => s.kind === 'jelly')).toBe(true);
      for (const s of shoals) if (s.kind === 'squid' || s.kind === 'dragon') deepOnes++;
    }
    expect(deepOnes).toBeGreaterThan(0);
  });

  it("a save's record keeps only real patches, and only their treasures' bits", () => {
    expect(parseSubFound(undefined)).toEqual({ day: 0, patches: {} });
    expect(
      parseSubFound({ day: 4, patches: { '7,-2': 5, nope: 1, '1,1': 255, '2,2': 0 } }),
    ).toEqual({
      day: 4,
      patches: { '7,-2': 5, '1,1': (1 << SUB_LOOT) - 1 },
    });
  });

  it('the submarine hovers where it is let go, needs no air, and drives slower than the diver swims', () => {
    const d = new Diver();
    d.reset(75, subSite(3), 0, true);
    for (let t = 0; t < 2; t += DT) d.update(DT, 0, 1);
    // It coasts to a stop, heavy as it is, and then stays put.
    for (let t = 0; t < 2.5; t += DT) d.update(DT, 0, 0);
    const y = d.y;
    for (let t = 0; t < 3; t += DT) d.update(DT, 0, 0);
    expect(Math.abs(d.y - y)).toBeLessThan(1);
    expect(d.air).toBe(75);
    for (let t = 0; t < 3; t += DT) d.update(DT, 1, 0);
    expect(d.vx).toBeLessThanOrEqual(101);
    expect(d.vx).toBeGreaterThan(80);
    // The diver, let go, drifts up.
    const v = new Diver();
    v.reset(75);
    for (let t = 0; t < 2; t += DT) v.update(DT, 0, 1);
    for (let t = 0; t < 2.5; t += DT) v.update(DT, 0, 0);
    const vy = v.y;
    for (let t = 0; t < 3; t += DT) v.update(DT, 0, 0);
    expect(v.y).toBeLessThan(vy - 15);
  });
});
