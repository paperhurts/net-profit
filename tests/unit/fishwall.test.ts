import { describe, expect, it } from 'vitest';
import {
  FISH_COLS,
  FISH_WALL_AT,
  FISH_WALL_HALF,
  FISH_WALL_REACH,
  fishRows,
  fishSlot,
  fishWallFront,
} from '../../src/data/fishwall';
import { SPECIES } from '../../src/data/tuning';
import { drawFishWall } from '../../src/render/fishwall';
import { entry, HALL_A, ROOMS, STEP, stairs } from '../../src/world/tower';
import { fakeView } from './helpers/view';

describe('the fish board', () => {
  it('has a place for every kind of fish, rows of six, each its own', () => {
    const rows = fishRows(SPECIES.length);
    expect(rows * FISH_COLS).toBeGreaterThanOrEqual(SPECIES.length);
    expect((rows - 1) * FISH_COLS).toBeLessThan(SPECIES.length);
    const seen = new Set<string>();
    SPECIES.forEach((_, i) => {
      const s = fishSlot(i, rows);
      expect(Math.abs(s.u)).toBeLessThan(1);
      expect(s.z).toBeGreaterThan(0);
      seen.add(`${s.u.toFixed(3)},${s.z}`);
    });
    expect(seen.size).toBe(SPECIES.length);
    // The first kind at the top left, reading along.
    expect(fishSlot(0, rows).z).toBeGreaterThan(fishSlot(FISH_COLS, rows).z);
    expect(fishSlot(0, rows).u).toBeLessThan(fishSlot(1, rows).u);
  });

  it('stands on the first hall floor, clear of the way up, the way in and the bed, and is looked at from in front', () => {
    const hall = ROOMS[HALL_A];
    if (!hall) throw new Error('no hall');
    const D = Math.SQRT1_2;
    for (const u of [-1, 1]) {
      const x = FISH_WALL_AT.dx + u * FISH_WALL_HALF * D;
      const y = FISH_WALL_AT.dy - u * FISH_WALL_HALF * D;
      expect(Math.hypot(x, y)).toBeLessThan(hall.r - 12);
      const st = stairs(HALL_A);
      expect(Math.hypot(x - (st.x - hall.x), y - (st.y - hall.y))).toBeGreaterThan(STEP + 6);
    }
    const f = fishWallFront();
    const st = stairs(HALL_A);
    const way = entry(HALL_A);
    expect(Math.hypot(f.dx - (st.x - hall.x), f.dy - (st.y - hall.y))).toBeGreaterThan(
      STEP + 6 + FISH_WALL_REACH - 10,
    );
    expect(Math.hypot(f.dx - (way.x - hall.x), f.dy - (way.y - hall.y))).toBeGreaterThan(
      FISH_WALL_REACH,
    );
    // The bed is at the hall's back right (main.js HQ_BED, 52 and -58 from its middle).
    expect(Math.hypot(f.dx - 52, f.dy + 58)).toBeGreaterThan(FISH_WALL_REACH + 46);
  });

  it('draws every kind, coloured once caught', () => {
    const none = fakeView();
    drawFishWall(
      none.v,
      0,
      0,
      SPECIES,
      SPECIES.map(() => false),
    );
    const crabs = SPECIES.filter((S) => S.crab).length;
    // Each kind but the crabs as a fish, and the gold fish on its name plank.
    expect(none.calls.fishShape).toBe(SPECIES.length - crabs + 1);
    const all = fakeView();
    drawFishWall(
      all.v,
      0,
      0,
      SPECIES,
      SPECIES.map(() => true),
    );
    // Their markings too, where they have them.
    expect((all.calls.fillRect ?? 0) - (none.calls.fillRect ?? 0)).toBe(
      SPECIES.filter((S) => S.mark).length,
    );
  });
});
