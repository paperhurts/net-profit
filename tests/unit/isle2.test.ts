import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { DEEP_RINGS, PARROT } from '../../src/data/tuning';
import { lurkAt } from '../../src/entities/anglerfish';
import { LAIR } from '../../src/entities/cthuluviathan';
import {
  dockAt,
  HOME_DOCK,
  HOP,
  ISLE2_DOCK,
  MOOR_TIME,
  Walker,
  walkable,
} from '../../src/entities/walker';
import { DEEP, pastBuoys, WS } from '../../src/world/island';
import {
  berth2,
  CAMP,
  DOCK2,
  HUTS,
  ISLE2,
  LANDING2,
  NAGA_CAGE,
  PALMS2,
  POST,
  TOWER,
} from '../../src/world/isle2';
import { createIsle2Schools } from '../../src/world/schools';
import { baseWorld } from './helpers/world';

const HULLS = [1, 1.1, 1.2, 1.32, 1.45, 1.6];

describe('island 2', () => {
  it('sits in the far corner of the deep, past the buoys and short of its end, away from the sunken city', () => {
    expect(pastBuoys(ISLE2.x, ISLE2.y)).toBe(true);
    const out = Math.max(-ISLE2.x, ISLE2.y - WS);
    expect(out + ISLE2.r).toBeLessThan(DEEP);
    expect(Math.min(-ISLE2.x, ISLE2.y - WS) - ISLE2.r).toBeGreaterThan(300);
    expect(Math.hypot(ISLE2.x - LAIR.x, ISLE2.y - LAIR.y)).toBeGreaterThan(5000);
    // Clear of the mahi-mahi rings, which are measured from home.
    const ring = DEEP_RINGS[0] as { r1: number; rad: number };
    expect(Math.hypot(ISLE2.x - WS / 2, ISLE2.y - WS / 2) - ISLE2.r).toBeGreaterThan(
      ring.r1 + ring.rad,
    );
  });

  it('has a dock facing home, with a berth that runs the bow up the sand for every hull', () => {
    expect(dockAt(DOCK2.x, DOCK2.y)).toBe(ISLE2_DOCK);
    expect(dockAt(HOME_DOCK.x, HOME_DOCK.y)).toBe(HOME_DOCK);
    expect(dockAt(0, 0)).toBeNull();
    for (const k of HULLS) {
      const b = berth2(k);
      expect(Math.hypot(b.x - DOCK2.x, b.y - DOCK2.y)).toBeLessThan(DOCK2.r - 20);
      expect(Math.hypot(b.x - ISLE2.x, b.y - ISLE2.y)).toBeGreaterThan(ISLE2.r + 24 * k);
      const bow = Math.hypot(
        b.x + Math.cos(b.h) * 34 * k - ISLE2.x,
        b.y + Math.sin(b.h) * 34 * k - ISLE2.y,
      );
      expect(bow).toBeLessThan(ISLE2.r);
    }
  });

  it('can be walked from the landing to the far shore, past the trading post and the tower', () => {
    const step = 3;
    const key = (i: number, j: number) => `${i},${j}`;
    const seen = new Set<string>();
    const i0 = Math.round(LANDING2.x / step);
    const j0 = Math.round(LANDING2.y / step);
    expect(walkable(LANDING2.x, LANDING2.y, 0)).toBe(true);
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
    const reach = (x: number, y: number) =>
      seen.has(key(Math.round(x / step), Math.round(y / step)));
    expect(reach(ISLE2.x - 180, ISLE2.y + 60)).toBe(true);
    expect(reach(ISLE2.x - 40, ISLE2.y - 170)).toBe(true);
    expect(reach(ISLE2.x + 20, ISLE2.y + 190)).toBe(true);
    expect(walkable(TOWER.x, TOWER.y, 0)).toBe(false);
    expect(walkable((POST.x0 + POST.x1) / 2, (POST.y0 + POST.y1) / 2, 0)).toBe(false);
    for (const p of PALMS2) expect(walkable(p[0], p[1], 0)).toBe(false);
  });

  it('moors the boat at its own berth and lands the figure on its sand', () => {
    const w = baseWorld({
      docked: true,
      hullScale: 1.6,
      boat: { x: DOCK2.x + 50, y: DOCK2.y - 30, h: 2, v: 80 },
    });
    const p = new Walker();
    expect(p.stepAshore(ISLE2_DOCK)).toBe(true);
    for (let i = 0; i < (MOOR_TIME + HOP + 0.2) * 60; i++) p.update(1 / 60, w);
    const b = berth2(1.6);
    expect(w.boat.x).toBeCloseTo(b.x, 6);
    expect(w.boat.y).toBeCloseTo(b.y, 6);
    expect(p.state).toBe('ashore');
    expect(p.x).toBeCloseTo(LANDING2.x, 6);
    expect(p.y).toBeCloseTo(LANDING2.y, 6);
  });

  it('has its own fish round it, clear of its dock and in the water', () => {
    const schools = createIsle2Schools();
    expect(schools).toHaveLength(3);
    for (const sc of schools) {
      expect(sc.sp).toBe(PARROT);
      expect(Math.hypot(sc.ax - ISLE2.x, sc.ay - ISLE2.y) - sc.r - 60).toBeGreaterThan(
        ISLE2.r + 20,
      );
      expect(Math.hypot(sc.ax - DOCK2.x, sc.ay - DOCK2.y)).toBeGreaterThan(DOCK2.r);
      expect(pastBuoys(sc.ax, sc.ay)).toBe(true);
    }
  });

  it('keeps the anglerfish out of its water', () => {
    const r = rng(9);
    for (let i = 0; i < 2000; i++) {
      const [x, y] = lurkAt(r);
      expect(Math.hypot(x - ISLE2.x, y - ISLE2.y)).toBeGreaterThan(ISLE2.r + 400);
    }
  });
});

describe("the naga's cage at the monkey camp", () => {
  it('stands on the island by the camp, clear of its huts, and is in the way', () => {
    const { x, y, r } = NAGA_CAGE;
    expect(Math.hypot(x - ISLE2.x, y - ISLE2.y)).toBeLessThan(ISLE2.r - r - 20);
    expect(Math.hypot(x - CAMP.x, y - CAMP.y)).toBeLessThan(70);
    for (const [hx, hy] of HUTS) expect(Math.hypot(x - hx, y - hy)).toBeGreaterThan(r + 11 + 8);
    expect(walkable(x, y, 0)).toBe(false);
    // The figure can walk right up to it, as to everything at the camp.
    expect(walkable(x + r + 8, y + r + 8, 0)).toBe(true);
  });
});
