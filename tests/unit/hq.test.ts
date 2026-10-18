import { describe, expect, it } from 'vitest';
import { HARPOON_RELOAD } from '../../src/data/harpoon';
import {
  BIG_TOWER_AT,
  BIG_TOWER_DOOR,
  BIG_TOWER_REACH,
  CASTLE_LANDING,
  FORGE_AT,
  GARDEN_AT,
  gardenReady,
  HQ,
  HQ_KINDS,
  LANDING_R,
  LANDING_REACH,
  LANDING_STOP,
  noHq,
  PICK_REACH,
  PLANS_AT,
  PLANS_REACH,
  parseHq,
  SHARP_RELOAD,
  sharpened,
} from '../../src/data/hq';
import { SCOPE_AT } from '../../src/data/observatory';
import {
  drawForge,
  drawGardenPlant,
  drawHqTower,
  drawLanding,
  drawPlans,
  TOWER_TALL,
} from '../../src/render/hq';
import { ICE_FLOE } from '../../src/world/icefloe';
import { pastBuoys, pastFar } from '../../src/world/island';
import { ISLE2 } from '../../src/world/isle2';
import { ISLE3 } from '../../src/world/isle3';
import { ISLE4 } from '../../src/world/isle4';
import { ISLE5 } from '../../src/world/isle5';
import { ISLE6 } from '../../src/world/isle6';
import { ISLE7 } from '../../src/world/isle7';
import { ISLE8, ISLE9 } from '../../src/world/isle8';
import { ISLE10 } from '../../src/world/isle10';
import { ISLE11 } from '../../src/world/isle11';
import { GATE, ROOMS, STEP, stairs } from '../../src/world/tower';
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
    expect(HQ.forge.ready).toBe(true);
    expect(HQ.dock.ready).toBe(true);
    expect(HQ.tower.ready).toBe(true);
  });

  it("sharpen at the forge: the spear and the knife one harder, the harpoon faster but no harder (the owner's call)", () => {
    expect(sharpened(1, false)).toBe(1);
    expect(sharpened(1, true)).toBe(2);
    expect(sharpened(4, true)).toBe(5);
    expect(SHARP_RELOAD).toBeLessThan(HARPOON_RELOAD);
    expect(SHARP_RELOAD / HARPOON_RELOAD).toBeGreaterThan(0.6);
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
    const spots = [PLANS_AT, FORGE_AT, ...Object.values(GARDEN_AT)];
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
    // The forge's chimney is tall: on the screen it stands clear of the telescope's column, not in front of it.
    expect(Math.abs(FORGE_AT.dx - FORGE_AT.dy - (SCOPE_AT.dx - SCOPE_AT.dy))).toBeGreaterThan(40);
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
    const forge = fakeView();
    drawForge(forge.v, 0, 0, false, 0);
    expect(forge.calls.star ?? 0).toBe(1);
    const done = fakeView();
    drawForge(done.v, 0, 0, true, 0.5);
    expect(done.calls.star ?? 0).toBe(0);
    expect((done.calls.fill ?? 0) + (done.calls.fillRect ?? 0)).toBeGreaterThan(10);
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

  it('put the bigger tower on the back wall, its door on the floor and used on its own, clear of the portal', () => {
    const court = ROOMS[GATE];
    if (!court) throw new Error('no courtyard');
    // On the wall: its middle just outside the floor, round the back half where the wall stands.
    const r = Math.hypot(BIG_TOWER_AT.dx, BIG_TOWER_AT.dy);
    expect(r).toBeGreaterThan(court.r - 12);
    expect(r).toBeLessThan(court.r + 20);
    const a = Math.atan2(BIG_TOWER_AT.dy, BIG_TOWER_AT.dx) + Math.PI * 2;
    expect(a).toBeGreaterThan(Math.PI * 0.75);
    expect(a).toBeLessThan(Math.PI * 1.75);
    // Its door can be reached from the floor, and not from where the stairs up are used.
    expect(Math.hypot(BIG_TOWER_DOOR.dx, BIG_TOWER_DOOR.dy) - BIG_TOWER_REACH).toBeLessThan(
      court.r - 12,
    );
    const st = stairs(GATE);
    const sx = st.x - court.x;
    const sy = st.y - court.y;
    expect(Math.hypot(BIG_TOWER_DOOR.dx - sx, BIG_TOWER_DOOR.dy - sy)).toBeGreaterThan(
      STEP + 6 + BIG_TOWER_REACH,
    );
    // On the screen it stands clear of the portal's ring and of the way up into the castle.
    const col = BIG_TOWER_AT.dx - BIG_TOWER_AT.dy;
    expect(Math.abs(col - (75 - -75))).toBeGreaterThan(80);
    expect(Math.abs(col - (sx - sy))).toBeGreaterThan(40);
    const v = fakeView();
    drawHqTower(v.v, 0, 0);
    expect((v.calls.fill ?? 0) + (v.calls.stroke ?? 0)).toBeGreaterThan(20);
    expect(TOWER_TALL).toBeGreaterThan(120);
  });

  it('put the castle landing at sea by island 7, clear of every island and the ice floe, and reachable by a stopped boat', () => {
    const near7 = Math.hypot(CASTLE_LANDING.x - ISLE7.x, CASTLE_LANDING.y - ISLE7.y);
    expect(near7).toBeLessThan(ISLE7.r + 500);
    for (const isle of [
      ISLE2,
      ISLE3,
      ISLE4,
      ISLE5,
      ISLE6,
      ISLE7,
      ISLE8,
      ISLE9,
      ISLE10,
      ISLE11,
      ICE_FLOE,
    ])
      expect(Math.hypot(CASTLE_LANDING.x - isle.x, CASTLE_LANDING.y - isle.y)).toBeGreaterThan(
        isle.r + LANDING_REACH + 60,
      );
    // Out past the buoys, in the far deep with island 7, not in home water.
    expect(pastBuoys(CASTLE_LANDING.x, CASTLE_LANDING.y)).toBe(true);
    expect(pastFar(CASTLE_LANDING.x, CASTLE_LANDING.y)).toBe(true);
    // A hull kept off the quay can still stop within reach of the gate: the quay's edge, a hull's half length, and room.
    expect(LANDING_REACH).toBeGreaterThan(LANDING_R + 24 * 1.6 + 60);
    expect(LANDING_STOP).toBeGreaterThan(0);
    const v = fakeView();
    drawLanding(v.v, 0, 0);
    expect((v.calls.fill ?? 0) + (v.calls.stroke ?? 0)).toBeGreaterThan(30);
  });
});
