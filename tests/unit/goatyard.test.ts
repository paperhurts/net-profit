import { describe, expect, it } from 'vitest';
import { HEADSTONES } from '../../src/data/goatyard';
import {
  CASTLE15,
  GOAT_ISLE,
  GRAVES15,
  HERDS15,
  inHouse15,
  KID_ZONE,
  onIsle15,
  SHORE_IN15,
  SIGNS15,
} from '../../src/world/goatisle';

describe('the Goat-yard', () => {
  it("has a stone for every epitaph the owner approved, three ghosts on them, and the jester's prank", () => {
    expect(GRAVES15).toHaveLength(HEADSTONES.length);
    expect(HEADSTONES.filter((h) => h.ghost)).toHaveLength(3);
    expect(HEADSTONES.filter((h) => h.gotcha)).toHaveLength(1);
    expect(HEADSTONES.filter((h) => h.big)).toHaveLength(1);
  });

  it('stands on the island, clear of the houses, the castle, the Kid Zone, the meadows and the signs', () => {
    const d = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);
    for (const g of GRAVES15) {
      expect(d(g, GOAT_ISLE)).toBeLessThan(GOAT_ISLE.r - SHORE_IN15);
      expect(inHouse15(g.x, g.y, 6)).toBe(false);
      expect(d(g, CASTLE15)).toBeGreaterThan(CASTLE15.r + 8);
      expect(d(g, KID_ZONE)).toBeGreaterThan(KID_ZONE.r + 8);
      for (const m of HERDS15) expect(d(g, m)).toBeGreaterThan(m.r + 8);
      for (const s of SIGNS15) expect(d(g, s)).toBeGreaterThan(14);
    }
  });

  it('can be read from in front of each stone, on dry ground, the stone itself solid', () => {
    GRAVES15.forEach((g, i) => {
      expect(onIsle15(g.rx, g.ry)).toBe(true);
      expect(onIsle15(g.x, g.y)).toBe(false);
      // Its reading spot is nearer it than any other stone's.
      for (const [j, o] of GRAVES15.entries())
        if (j !== i) expect(Math.hypot(g.rx - o.rx, g.ry - o.ry)).toBeGreaterThan(8);
    });
  });
});
