import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { CRATES, DRIFTWOOD, type Piece, placeFlotsam } from '../../src/entities/flotsam';
import { rarePoint } from '../../src/entities/rare';
import {
  ABUTMENTS,
  BEACH,
  BRIDGE,
  BRIDGE_BUMPS,
  BRIDGE_SOUTH,
  BRIDGE_SPAN,
  DOCK,
  IR,
  IX,
  IY,
  nearBeach,
} from '../../src/world/island';
import { createSchools } from '../../src/world/schools';
import { baseWorld } from './helpers/world';

const fromIsland = (x: number, y: number) => Math.hypot(x - IX, y - IY);

describe('the Ten Cent Bridge', () => {
  it('runs from the sand of the island to the sand of its beach', () => {
    expect(fromIsland(BRIDGE.ax, BRIDGE.ay)).toBeLessThan(IR);
    expect(Math.hypot(BRIDGE.bx - BRIDGE.ax, BRIDGE.by - BRIDGE.ay)).toBeCloseTo(
      BRIDGE_SPAN + 8,
      6,
    );
    expect(Math.hypot(BRIDGE.bx - BEACH.x, BRIDGE.by - BEACH.y)).toBeLessThan(BEACH.r);
    expect(fromIsland(BEACH.x, BEACH.y) - BEACH.r).toBeGreaterThan(IR + 150);
  });

  it('stands well clear of every school that is out by day, and of the dock', () => {
    for (const sc of createSchools().filter((s) => !s.night)) {
      // A school drifts 60 round its anchor and is r across.
      const reach = sc.r + 60;
      expect(Math.hypot(sc.ax - BEACH.x, sc.ay - BEACH.y) - reach - BEACH.r).toBeGreaterThan(120);
      for (const b of BRIDGE_BUMPS) {
        expect(Math.hypot(sc.ax - b[0], sc.ay - b[1]) - reach).toBeGreaterThan(120);
      }
    }
    expect(Math.hypot(DOCK.x - BEACH.x, DOCK.y - BEACH.y)).toBeGreaterThan(700);
  });

  it('pushes hulls off the whole span, with no gap a boat could slip through', () => {
    const first = BRIDGE_BUMPS[0] as readonly [number, number];
    const last = BRIDGE_BUMPS[BRIDGE_BUMPS.length - 1] as readonly [number, number];
    expect(fromIsland(first[0], first[1])).toBeLessThan(IR + 24);
    expect(Math.hypot(last[0] - BEACH.x, last[1] - BEACH.y)).toBeLessThan(BEACH.r + 24);
    for (let i = 1; i < BRIDGE_BUMPS.length; i++) {
      const a = BRIDGE_BUMPS[i - 1] as readonly [number, number];
      const b = BRIDGE_BUMPS[i] as readonly [number, number];
      // The smallest hull is pushed off at 38; circles 32 apart leave no way through.
      expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeLessThanOrEqual(36);
    }
  });

  it('has two abutments on the span, and a south side that faces the viewer', () => {
    expect(ABUTMENTS).toHaveLength(2);
    for (const a of ABUTMENTS) expect(nearBeach(a[0], a[1], 0)).toBe(true);
    expect(Math.hypot(BRIDGE_SOUTH[0], BRIDGE_SOUTH[1])).toBeCloseTo(1, 9);
    // Toward the viewer is greater x + y.
    expect(BRIDGE_SOUTH[0] + BRIDGE_SOUTH[1]).toBeGreaterThan(0);
    // And it is across the bridge, not along it.
    const along = [
      (BRIDGE.bx - BRIDGE.ax) / (BRIDGE_SPAN + 8),
      (BRIDGE.by - BRIDGE.ay) / (BRIDGE_SPAN + 8),
    ];
    expect(
      (along[0] as number) * BRIDGE_SOUTH[0] + (along[1] as number) * BRIDGE_SOUTH[1],
    ).toBeCloseTo(0, 9);
  });
});

describe('nearBeach', () => {
  it('knows the sand, the span, and a margin round both', () => {
    expect(nearBeach(BEACH.x, BEACH.y, 0)).toBe(true);
    expect(nearBeach(BEACH.x + BEACH.r + 30, BEACH.y, 0)).toBe(false);
    expect(nearBeach(BEACH.x + BEACH.r + 30, BEACH.y, 40)).toBe(true);
    const mx = (BRIDGE.ax + BRIDGE.bx) / 2;
    const my = (BRIDGE.ay + BRIDGE.by) / 2;
    expect(nearBeach(mx, my, 0)).toBe(true);
    expect(nearBeach(mx + BRIDGE_SOUTH[0] * 40, my + BRIDGE_SOUTH[1] * 40, 0)).toBe(false);
    expect(nearBeach(mx + BRIDGE_SOUTH[0] * 40, my + BRIDGE_SOUTH[1] * 40, 50)).toBe(true);
    expect(nearBeach(IX + 1500, IY, 100)).toBe(false);
  });
});

describe('nothing lands on the sand', () => {
  it('keeps crates and driftwood off the beach and the bridge', () => {
    const w = baseWorld({ rng: rng(21), range: 1150 });
    for (const kind of [CRATES, DRIFTWOOD]) {
      for (let i = 0; i < 1500; i++) {
        const f: Piece = { x: 0, y: 0, alive: true, resp: 0, ph: 0, rot: 0 };
        placeFlotsam(f, kind.near, w);
        expect(nearBeach(f.x, f.y, 49)).toBe(false);
      }
    }
  });

  it('keeps the rare fish off it too, spawning and wandering', () => {
    const w = baseWorld({ rng: rng(22), range: 1150 });
    for (let i = 0; i < 1500; i++) {
      const [x, y] = rarePoint(IX + 700, IY, 0, w);
      expect(nearBeach(x, y, 39)).toBe(false);
      const [wx, wy] = rarePoint(BEACH.x + BEACH.r + 120, BEACH.y, 280, w);
      expect(nearBeach(wx, wy, 39)).toBe(false);
    }
  });
});
