import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { DEEP_RINGS, GROUPER } from '../../src/data/tuning';
import { lurkAt } from '../../src/entities/anglerfish';
import { LAIR } from '../../src/entities/cthuluviathan';
import {
  dockAt,
  groundZ,
  HOP,
  ISLE3_DOCK,
  MOOR_TIME,
  Walker,
  walkable,
} from '../../src/entities/walker';
import { DEEP, pastBuoys, WS } from '../../src/world/island';
import { ISLE2 } from '../../src/world/isle2';
import {
  berth3,
  DOCK3,
  DOOR3,
  ISLE3,
  JETTY,
  LAMPS,
  LANDING3,
  MAT,
  onPlanks,
  PLANK_Z,
  PLANKS,
  pushOffTown,
  RAFTS,
  RUINS,
  SHACKS,
  TOWER3,
} from '../../src/world/isle3';
import { createIsle3Schools } from '../../src/world/schools';
import { baseWorld } from './helpers/world';

const HULLS = [1, 1.1, 1.2, 1.32, 1.45, 1.6];

/** Every point the figure can reach from (x, y), on a grid of this step. */
function reachable(x: number, y: number, step = 3): (x: number, y: number) => boolean {
  const key = (i: number, j: number) => `${i},${j}`;
  const seen = new Set<string>();
  const i0 = Math.round(x / step);
  const j0 = Math.round(y / step);
  const queue: [number, number][] = [[i0, j0]];
  seen.add(key(i0, j0));
  while (queue.length) {
    const [i, j] = queue.pop() as [number, number];
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const k = key(i + di, j + dj);
      if (seen.has(k) || !walkable((i + di) * step, (j + dj) * step, 0)) continue;
      seen.add(k);
      queue.push([i + di, j + dj]);
    }
  }
  return (px, py) => seen.has(key(Math.round(px / step), Math.round(py / step)));
}

describe('island 3, the sunken island', () => {
  it('sits in the north corner of the deep, short of its end, far from the sunken city and island 2', () => {
    expect(pastBuoys(ISLE3.x, ISLE3.y)).toBe(true);
    expect(Math.max(-ISLE3.x, -ISLE3.y) + ISLE3.r).toBeLessThan(DEEP);
    expect(Math.min(-ISLE3.x, -ISLE3.y) - ISLE3.r).toBeGreaterThan(250);
    expect(Math.hypot(ISLE3.x - LAIR.x, ISLE3.y - LAIR.y)).toBeGreaterThan(5000);
    expect(Math.hypot(ISLE3.x - ISLE2.x, ISLE3.y - ISLE2.y)).toBeGreaterThan(5000);
    // As far from home as island 2, and clear of the mahi-mahi rings.
    expect(Math.hypot(ISLE3.x - WS / 2, ISLE3.y - WS / 2)).toBeCloseTo(
      Math.hypot(ISLE2.x - WS / 2, ISLE2.y - WS / 2),
      6,
    );
    const ring = DEEP_RINGS[0] as { r1: number; rad: number };
    expect(Math.hypot(ISLE3.x - WS / 2, ISLE3.y - WS / 2) - ISLE3.r).toBeGreaterThan(
      ring.r1 + ring.rad,
    );
  });

  it('has its town on the side toward home, with the jetty pointing that way', () => {
    for (const b of [...RAFTS, JETTY]) {
      const mx = (b.x0 + b.x1) / 2 - ISLE3.x;
      const my = (b.y0 + b.y1) / 2 - ISLE3.y;
      // Home is down and to the right of it, +x +y.
      expect(mx + my).toBeGreaterThan(0);
    }
    expect(Math.hypot(JETTY.x1 - ISLE3.x, JETTY.y1 - ISLE3.y)).toBeLessThan(ISLE3.r + 20);
  });

  it('ties the boat up bow in at the end of the jetty, for every hull, without the town pushing it off', () => {
    expect(dockAt(DOCK3.x, DOCK3.y)).toBe(ISLE3_DOCK);
    for (const k of HULLS) {
      const b = berth3(k);
      expect(Math.hypot(b.x - DOCK3.x, b.y - DOCK3.y)).toBeLessThan(DOCK3.r - 20);
      const bow = [b.x + Math.cos(b.h) * 34 * k, b.y + Math.sin(b.h) * 34 * k] as const;
      expect(bow[0] - JETTY.x1).toBeGreaterThan(0);
      expect(bow[0] - JETTY.x1).toBeLessThan(10);
      expect(bow[1]).toBeGreaterThan(JETTY.y0);
      expect(bow[1]).toBeLessThan(JETTY.y1);
      const s = { ...b, v: 10 };
      pushOffTown(s, 4 + 20 * k);
      expect(s.x).toBe(b.x);
      expect(s.y).toBe(b.y);
      expect(s.v).toBe(10);
    }
  });

  it('keeps a boat off the planks and the seaweed, but lets it sail over the drowned town', () => {
    const r = rng(5);
    const pad = 4 + 20 * 1.6;
    for (let i = 0; i < 3000; i++) {
      const s = {
        x: ISLE3.x - 100 + r() * 460,
        y: ISLE3.y - 100 + r() * 460,
        v: 100,
      };
      // One push is enough: the outline has no hollows to be caught between.
      pushOffTown(s, pad);
      expect(onPlanks(s.x, s.y)).toBe(false);
      expect(Math.hypot(s.x - MAT.x, s.y - MAT.y)).toBeGreaterThan(MAT.r + pad - 1e-6);
      const again = { ...s };
      pushOffTown(again, pad);
      expect(again.x).toBeCloseTo(s.x, 9);
      expect(again.y).toBeCloseTo(s.y, 9);
    }
    // Over the old streets on the far side from the town, the water is open.
    for (const a of [Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2]) {
      const s = { x: ISLE3.x + Math.cos(a) * 180, y: ISLE3.y + Math.sin(a) * 180, v: 100 };
      pushOffTown(s, pad);
      expect(s.v).toBe(100);
    }
  });

  it('can be walked from the jetty across every raft to the tower door, and the water between is not', () => {
    expect(walkable(LANDING3.x, LANDING3.y, 0)).toBe(true);
    const reach = reachable(LANDING3.x, LANDING3.y);
    expect(reach(DOOR3.x, DOOR3.y)).toBe(true);
    for (const b of RAFTS) {
      // Somewhere on every raft, in front of its shack.
      expect(reach((b.x0 + b.x1) / 2, b.y1 - 6)).toBe(true);
    }
    // All the way round the tower on the seaweed.
    for (let a = 0; a < 8; a++) {
      const q = (a / 8) * Math.PI * 2;
      expect(reach(MAT.x + Math.cos(q) * 60, MAT.y + Math.sin(q) * 60)).toBe(true);
    }
    expect(walkable(TOWER3.x, TOWER3.y, 0)).toBe(false);
    for (const s of SHACKS) expect(walkable((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, 0)).toBe(false);
    for (const p of LAMPS) expect(walkable(p[0], p[1], 0)).toBe(false);
    // Between the rafts, and out past the seaweed, is sea.
    expect(walkable(ISLE3.x + 70, ISLE3.y + 70, 0)).toBe(false);
    expect(walkable(ISLE3.x - 100, ISLE3.y, 0)).toBe(false);
    expect(walkable(ISLE3.x + 200, ISLE3.y + 100, 0)).toBe(false);
    // The planks ride higher than the seaweed.
    expect(groundZ(LANDING3.x, LANDING3.y)).toBe(PLANK_Z);
    expect(groundZ(DOOR3.x, DOOR3.y)).toBeLessThan(PLANK_Z);
  });

  it('moors the boat at its berth and lands the figure on the jetty', () => {
    const w = baseWorld({
      docked: true,
      hullScale: 1.6,
      boat: { x: DOCK3.x + 40, y: DOCK3.y + 30, h: 3, v: 80 },
    });
    const p = new Walker();
    expect(p.stepAshore(ISLE3_DOCK)).toBe(true);
    for (let i = 0; i < (MOOR_TIME + HOP + 0.2) * 60; i++) p.update(1 / 60, w);
    const b = berth3(1.6);
    expect(w.boat.x).toBeCloseTo(b.x, 6);
    expect(w.boat.y).toBeCloseTo(b.y, 6);
    expect(p.state).toBe('ashore');
    expect(p.x).toBeCloseTo(LANDING3.x, 6);
    expect(p.y).toBeCloseTo(LANDING3.y, 6);
  });

  it('has a drowned town under the water: houses inside the old shore, apart, and not hidden under the rafts', () => {
    expect(RUINS.length).toBeGreaterThanOrEqual(12);
    for (const h of RUINS) {
      expect(Math.hypot(h.x - ISLE3.x, h.y - ISLE3.y) + h.w / 2).toBeLessThan(ISLE3.r);
      expect(Math.hypot(h.x - MAT.x, h.y - MAT.y)).toBeGreaterThan(MAT.r + 20);
      for (const b of PLANKS) {
        const inside = h.x > b.x0 - 30 && h.x < b.x1 + 30 && h.y > b.y0 - 30 && h.y < b.y1 + 30;
        expect(inside).toBe(false);
      }
    }
    for (const a of RUINS)
      for (const b of RUINS)
        if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan((a.w + b.w) * 0.5);
  });

  it('has grouper over its old shore, round the far side from the town', () => {
    const schools = createIsle3Schools();
    expect(schools).toHaveLength(3);
    for (const sc of schools) {
      expect(sc.sp).toBe(GROUPER);
      const d = Math.hypot(sc.ax - ISLE3.x, sc.ay - ISLE3.y);
      expect(d).toBeGreaterThan(ISLE3.r + 40);
      expect(Math.hypot(sc.ax - DOCK3.x, sc.ay - DOCK3.y) - sc.r).toBeGreaterThan(DOCK3.r + 40);
      for (const b of PLANKS) {
        const nx = Math.max(b.x0, Math.min(sc.ax, b.x1));
        const ny = Math.max(b.y0, Math.min(sc.ay, b.y1));
        expect(Math.hypot(sc.ax - nx, sc.ay - ny)).toBeGreaterThan(sc.r + 60);
      }
      expect(pastBuoys(sc.ax, sc.ay)).toBe(true);
      expect(sc.ax - sc.r).toBeGreaterThan(-DEEP + 40);
      expect(sc.ay - sc.r).toBeGreaterThan(-DEEP + 40);
    }
  });

  it('keeps the anglerfish out of its water', () => {
    const r = rng(9);
    for (let i = 0; i < 2000; i++) {
      const [x, y] = lurkAt(r);
      expect(Math.hypot(x - ISLE3.x, y - ISLE3.y)).toBeGreaterThan(ISLE3.r + 400);
    }
  });
});
