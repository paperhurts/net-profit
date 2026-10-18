import { describe, expect, it } from 'vitest';
import {
  GARDEN_AT,
  gardenReady,
  HQ,
  HQ_KINDS,
  noHq,
  PICK_REACH,
  PLANS_AT,
  PLANS_REACH,
  parseHq,
} from '../../src/data/hq';
import { SCOPE_AT } from '../../src/data/observatory';
import { drawGardenPlant, drawPlans } from '../../src/render/hq';
import { GATE, ROOMS } from '../../src/world/tower';
import { fakeView } from './helpers/view';

describe("your headquarters' upgrades", () => {
  it("are the kid's four, each 2,000 to 10,000, the owner's call", () => {
    expect([...HQ_KINDS].sort()).toEqual(['dock', 'forge', 'garden', 'tower']);
    for (const k of HQ_KINDS) {
      expect(HQ[k].price).toBeGreaterThanOrEqual(2000);
      expect(HQ[k].price).toBeLessThanOrEqual(10000);
      expect(HQ[k].blurb.length).toBeGreaterThan(30);
    }
    expect(HQ.garden.ready).toBe(true);
  });

  it('come out of a save as built only where it plainly says so', () => {
    expect(parseHq(undefined)).toEqual(noHq());
    expect(parseHq({ garden: true, forge: 'yes', dock: 1, tower: true })).toEqual({
      garden: true,
      dock: false,
      forge: false,
      tower: true,
    });
  });

  it('give one snack from the garden a day', () => {
    expect(gardenReady(0, 1)).toBe(true);
    expect(gardenReady(5, 5)).toBe(false);
    expect(gardenReady(5, 6)).toBe(true);
  });

  it('stand in the courtyard, on its floor and clear of the flag, the telescope, the stairs, the way in and the portal', () => {
    const court = ROOMS[GATE];
    if (!court) throw new Error('no courtyard');
    const spots = [PLANS_AT, ...Object.values(GARDEN_AT)];
    const taken = [
      { dx: -70, dy: 10 },
      SCOPE_AT,
      { dx: -72, dy: -72 },
      { dx: 66, dy: 66 },
      { dx: 75, dy: -75 },
    ];
    for (const p of spots) {
      expect(Math.hypot(p.dx, p.dy)).toBeLessThan(court.r - 12 - PICK_REACH / 2);
      for (const t of taken) expect(Math.hypot(p.dx - t.dx, p.dy - t.dy)).toBeGreaterThan(40);
    }
    // Each plant picked on its own, and none from the plans' table.
    for (let i = 0; i < spots.length; i++)
      for (let j = i + 1; j < spots.length; j++) {
        const a = spots[i] as { dx: number; dy: number };
        const b = spots[j] as { dx: number; dy: number };
        expect(Math.hypot(a.dx - b.dx, a.dy - b.dy)).toBeGreaterThan(
          PICK_REACH + Math.min(PICK_REACH, PLANS_REACH),
        );
      }
  });

  it('are drawn: the plans on their table, and each plant, with a star while there is a snack to pick', () => {
    const v = fakeView();
    drawPlans(v.v, 0, 0);
    expect(v.calls.fill ?? 0).toBeGreaterThan(8);
    for (const k of ['apple', 'carrot', 'banana'] as const) {
      const ready = fakeView();
      drawGardenPlant(ready.v, k, 0, 0, true);
      const picked = fakeView();
      drawGardenPlant(picked.v, k, 0, 0, false);
      expect((picked.calls.fill ?? 0) + (picked.calls.stroke ?? 0)).toBeGreaterThan(3);
      expect(ready.calls.star ?? 0).toBe(1);
      expect(picked.calls.star ?? 0).toBe(0);
    }
  });
});
