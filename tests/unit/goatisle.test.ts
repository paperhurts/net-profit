import { describe, expect, it } from 'vitest';
import { LAIR, SIGHT_RADIUS } from '../../src/entities/cthuluviathan';
import { DOCKS, GOAT_DOCK, onLand } from '../../src/entities/walker';
import {
  at15,
  berth15,
  CRATES15,
  DOCK15,
  FOG15,
  GOAT_ISLE,
  HOUSES15,
  inHouse15,
  KID_ZONE,
  LANDING15,
  onIsle15,
  SHORE_IN15,
  SIGHT15,
  SIGNS15,
} from '../../src/world/goatisle';
import { DEEP, IX, IY, pastBuoys } from '../../src/world/island';
import { ISLE6 } from '../../src/world/isle6';
import { TRENCH } from '../../src/world/trench';

const from = (x: number, y: number) => Math.hypot(x - GOAT_ISLE.x, y - GOAT_ISLE.y);

describe('Goat Isle', () => {
  it('stands in the deep, past the buoys and short of the far buoys, clear of everything else out there', () => {
    expect(pastBuoys(GOAT_ISLE.x, GOAT_ISLE.y)).toBe(true);
    expect(GOAT_ISLE.y - GOAT_ISLE.r - FOG15).toBeGreaterThan(-DEEP - 200);
    // Out of sight of the Cthuluviathan's city, so a goat visit never wakes it, and clear of island 6 and the trench.
    expect(Math.hypot(LAIR.x - GOAT_ISLE.x, LAIR.y - GOAT_ISLE.y)).toBeGreaterThan(
      SIGHT_RADIUS + GOAT_ISLE.r,
    );
    expect(Math.hypot(ISLE6.x - GOAT_ISLE.x, ISLE6.y - GOAT_ISLE.y)).toBeGreaterThan(
      ISLE6.r + GOAT_ISLE.r + 400,
    );
    expect(Math.hypot(TRENCH.x - GOAT_ISLE.x, TRENCH.y - GOAT_ISLE.y)).toBeGreaterThan(1000);
  });

  it('is sighted at the edge of its fog, before the boat could run into it', () => {
    expect(SIGHT15).toBeGreaterThan(FOG15);
    expect(SIGHT15).toBeGreaterThan(40);
  });

  it('has its beach toward home: the dock, the berth and the landing on that side, the landing on dry land', () => {
    const home = Math.atan2(IY - GOAT_ISLE.y, IX - GOAT_ISLE.x);
    const at = (p: { x: number; y: number }) => Math.atan2(p.y - GOAT_ISLE.y, p.x - GOAT_ISLE.x);
    for (const p of [DOCK15, LANDING15, berth15(1)])
      expect(Math.abs(at(p) - home)).toBeLessThan(1e-9);
    expect(onIsle15(LANDING15.x, LANDING15.y)).toBe(true);
    expect(onLand(LANDING15.x, LANDING15.y)).toBe(true);
    for (const k of [0.6, 1, 1.4]) {
      const b = berth15(k);
      expect(from(b.x, b.y)).toBeGreaterThan(GOAT_ISLE.r + 20 * k);
      expect(from(b.x, b.y)).toBeLessThan(DOCK15.r + from(DOCK15.x, DOCK15.y));
    }
    expect(DOCKS).toContain(GOAT_DOCK);
  });

  it('has every house, sign, the crates and the pen on the grass or sand, none on another', () => {
    for (const h of HOUSES15)
      for (const [x, y] of [
        [h.x0, h.y0],
        [h.x1, h.y1],
        [h.x0, h.y1],
        [h.x1, h.y0],
      ] as const)
        expect(from(x, y)).toBeLessThan(GOAT_ISLE.r - SHORE_IN15);
    HOUSES15.forEach((a, i) => {
      HOUSES15.forEach((b, j) => {
        if (i < j) expect(a.x1 < b.x0 || b.x1 < a.x0 || a.y1 < b.y0 || b.y1 < a.y0).toBe(true);
      });
    });
    for (const s of SIGNS15) {
      expect(from(s.x, s.y)).toBeLessThan(GOAT_ISLE.r - 15);
      expect(inHouse15(s.x, s.y, 6)).toBe(false);
    }
    expect(inHouse15(CRATES15.x, CRATES15.y, 8)).toBe(false);
    expect(inHouse15(KID_ZONE.x, KID_ZONE.y, KID_ZONE.r)).toBe(false);
  });

  it('can be walked round its houses and into the Kid Zone, but not through a wall or into the sea', () => {
    for (const h of HOUSES15) expect(onIsle15((h.x0 + h.x1) / 2, (h.y0 + h.y1) / 2)).toBe(false);
    expect(onIsle15(KID_ZONE.x, KID_ZONE.y)).toBe(true);
    expect(onIsle15(KID_ZONE.x + KID_ZONE.r, KID_ZONE.y)).toBe(false);
    expect(onIsle15(GOAT_ISLE.x + GOAT_ISLE.r, GOAT_ISLE.y)).toBe(false);
    // The path up from the landing into the village is all ground.
    for (const [dx, dy] of [
      [-120, 110],
      [-50, 30],
      [20, 10],
    ] as const) {
      const [x, y] = at15(dx, dy);
      expect(onIsle15(x, y)).toBe(true);
    }
  });
});

describe('the goats on the roofs', () => {
  it('each keeps its own coat as it walks, so none of them blinks from colour to colour', async () => {
    const { roofGoats } = await import('../../src/render/goatisle');
    HOUSES15.forEach((h, i) => {
      const coats = (T: number) => roofGoats(h, i, T).map((g) => g.coat);
      const first = coats(0);
      for (const T of [0.05, 0.13, 1.7, 9.4, 61]) expect(coats(T)).toEqual(first);
    });
  });
});
