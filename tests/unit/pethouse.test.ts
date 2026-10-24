import { describe, expect, it } from 'vitest';
import { RING_R } from '../../src/entities/petfight';
import { blocked } from '../../src/entities/walker';
import { IR, IX, IY } from '../../src/world/island';
import {
  nearPetHouse,
  PET_HOUSE,
  PET_HOUSE_MID,
  PET_RING,
  PET_YARD,
  YARD_MAX,
  yardSpot,
} from '../../src/world/pethouse';
import { PLANTS } from '../../src/world/plants';

describe('the pet house', () => {
  it('stands on the home island, its yard too', () => {
    for (const [x, y] of [
      [PET_HOUSE.x0, PET_HOUSE.y0],
      [PET_HOUSE.x1, PET_HOUSE.y1],
      [PET_YARD.x, PET_YARD.y],
    ] as const)
      expect(Math.hypot(x - IX, y - IY)).toBeLessThan(IR - 40);
  });

  it('is visited from beside it, not from across the island', () => {
    expect(nearPetHouse(PET_HOUSE_MID.x, PET_HOUSE.y1 + 10)).toBe(true);
    expect(nearPetHouse(IX, IY)).toBe(false);
  });

  it('keeps its pets in the yard, apart from each other and out of the house', () => {
    for (let t = 0; t < 200; t += 7.3) {
      const n = YARD_MAX;
      const spots = Array.from({ length: n }, (_, i) => yardSpot(i, n, t));
      for (const s of spots) {
        expect(Math.hypot(s.x - PET_YARD.x, s.y - PET_YARD.y)).toBeLessThanOrEqual(PET_YARD.r);
        const { x0, y0, x1, y1 } = PET_HOUSE;
        expect(
          Math.hypot(Math.max(x0 - s.x, 0, s.x - x1), Math.max(y0 - s.y, 0, s.y - y1)),
        ).toBeGreaterThan(3);
      }
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const a = spots[i];
          const b = spots[j];
          if (a && b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(8);
        }
    }
    // The same time finds them in the same places.
    expect(yardSpot(2, 4, 50)).toEqual(yardSpot(2, 4, 50));
  });

  it('has its battle ring on open ground: on the island, clear of anything built and of the bushes', () => {
    expect(Math.hypot(PET_RING.x - IX, PET_RING.y - IY)).toBeLessThan(IR - RING_R - 20);
    for (let a = 0; a < 24; a++) {
      const q = (a / 24) * Math.PI * 2;
      for (const r of [0, RING_R / 2, RING_R])
        expect(blocked(PET_RING.x + Math.cos(q) * r, PET_RING.y + Math.sin(q) * r, 99)).toBe(false);
    }
    for (const b of PLANTS.filter((p) => p.kind === 'bush'))
      expect(Math.hypot(b.x - PET_RING.x, b.y - PET_RING.y) - b.r).toBeGreaterThan(RING_R - 2);
    const { x0, y0, x1, y1 } = PET_HOUSE;
    const dx = Math.max(x0 - PET_RING.x, 0, PET_RING.x - x1);
    const dy = Math.max(y0 - PET_RING.y, 0, PET_RING.y - y1);
    expect(Math.hypot(dx, dy)).toBeGreaterThan(RING_R + 10);
  });
});
