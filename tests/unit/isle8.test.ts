import { describe, expect, it } from 'vitest';
import { LAIR } from '../../src/entities/cthuluviathan';
import { dockAt, HOP, ISLE8_DOCK, MOOR_TIME, Walker, walkable } from '../../src/entities/walker';
import { drawIsle8Flat, drawIsle8Sea, isle8Glow, isle8Solids } from '../../src/render/isle8';
import { DEEP, FAR, IX, IY, pastFar, WS } from '../../src/world/island';
import { ISLE4 } from '../../src/world/isle4';
import { ISLE5 } from '../../src/world/isle5';
import { ISLE6 } from '../../src/world/isle6';
import { ISLE7 } from '../../src/world/isle7';
import {
  BAR,
  berth8,
  DOCK8,
  DOOR8,
  DOOR9,
  ISLE8,
  ISLE9,
  LANDING8,
  nearTwins,
  onTwins,
  PALMS8,
  POST8,
  pushOffTwins,
  REEDS8,
  ROCKS9,
  SIGHT8,
  SNAGS9,
  TENTS8,
  TOWER8,
  TOWER9,
} from '../../src/world/isle8';
import { createFarSchools } from '../../src/world/schools';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

/** Every grid cell reachable on foot from island 8's landing. */
function reachable(step = 4): Set<string> {
  const key = (i: number, j: number) => `${i},${j}`;
  const start: [number, number] = [Math.round(LANDING8.x / step), Math.round(LANDING8.y / step)];
  const seen = new Set<string>([key(...start)]);
  const queue: [number, number][] = [start];
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
  return seen;
}

const BARRED = { barred8: true, barred9: true, flag8: null, orbLit: true, flag9: null };

describe('islands 8 and 9, the twins', () => {
  it('sit out in the far deep east of home, the side nothing else is on, short of its end', () => {
    for (const isle of [ISLE8, ISLE9]) {
      expect(pastFar(isle.x, isle.y)).toBe(true);
      expect(isle.x + isle.r + 150).toBeLessThan(WS + DEEP + FAR);
      expect(isle.x - isle.r - 100).toBeGreaterThan(WS + DEEP);
      for (const o of [ISLE4, ISLE5, ISLE6, ISLE7, LAIR])
        expect(Math.hypot(isle.x - o.x, isle.y - o.y)).toBeGreaterThan(isle.r + SIGHT8 + 600);
      for (const sc of createFarSchools())
        expect(Math.hypot(sc.ax - isle.x, sc.ay - isle.y)).toBeGreaterThan(isle.r + sc.r + 400);
    }
    // Straight east of home, either side of its line.
    expect(ISLE8.x).toBe(ISLE9.x);
    expect(ISLE8.y).toBeLessThan(IY);
    expect(ISLE9.y).toBeGreaterThan(IY);
    expect(ISLE8.x).toBeGreaterThan(IX);
  });

  it('have a dock toward home on island 8, a berth on its sand clear of the shove, and a landing on dry land', () => {
    expect(dockAt(DOCK8.x, DOCK8.y)).toBe(ISLE8_DOCK);
    expect(DOCK8.x).toBeLessThan(ISLE8.x);
    for (const k of [1, 1.6]) {
      const b = berth8(k);
      const s = { x: b.x, y: b.y, v: 0 };
      pushOffTwins(s, 24 * k);
      expect(s.x).toBeCloseTo(b.x, 6);
      expect(s.y).toBeCloseTo(b.y, 6);
      expect(Math.hypot(b.x - DOCK8.x, b.y - DOCK8.y)).toBeLessThan(DOCK8.r);
      // Bow toward the island.
      expect(Math.cos(b.h)).toBeCloseTo(1, 6);
    }
    expect(walkable(LANDING8.x, LANDING8.y, 0)).toBe(true);
  });

  it('moors on island 8 and lands the figure', () => {
    const w = baseWorld({
      docked: true,
      hullScale: 1.6,
      boat: { x: DOCK8.x, y: DOCK8.y + 30, h: 0, v: 60 },
    });
    const p = new Walker();
    expect(p.stepAshore(ISLE8_DOCK)).toBe(true);
    for (let i = 0; i < (MOOR_TIME + HOP + 0.2) * 60; i++) p.update(1 / 60, w);
    const b = berth8(1.6);
    expect(w.boat.x).toBeCloseTo(b.x, 6);
    expect(w.boat.y).toBeCloseTo(b.y, 6);
    expect(p.state).toBe('ashore');
  });

  it('can be walked from the landing over the sandbar to both towers and round island 9', () => {
    const cells = reachable();
    const near = (x: number, y: number, r: number) => {
      for (let a = 0; a < 16; a++) {
        const k = `${Math.round((x + Math.cos(a) * r) / 4)},${Math.round((y + Math.sin(a) * r) / 4)}`;
        if (cells.has(k)) return true;
      }
      return false;
    };
    expect(near(DOOR8.x, DOOR8.y, 4)).toBe(true);
    expect(near(DOOR9.x, DOOR9.y, 4)).toBe(true);
    expect(near((BAR.x0 + BAR.x1) / 2, (BAR.y0 + BAR.y1) / 2, 4)).toBe(true);
    expect(near(ISLE9.x - 150, ISLE9.y + 120, 8)).toBe(true);
    // Off the bar's sides is the sea.
    expect(onTwins(BAR.x0 - 10, (BAR.y0 + BAR.y1) / 2)).toBe(false);
    // What stands there is in the way, and all of it is on the sand.
    for (const t of [TOWER8, TOWER9]) expect(walkable(t.x, t.y, 0)).toBe(false);
    expect(walkable((POST8.x0 + POST8.x1) / 2, (POST8.y0 + POST8.y1) / 2, 0)).toBe(false);
    for (const p of [...PALMS8, ...SNAGS9, ...ROCKS9]) {
      expect(walkable(p[0], p[1], 0)).toBe(false);
      expect(onTwins(p[0], p[1])).toBe(true);
    }
    for (const r of REEDS8) expect(nearTwins(r[0], r[1], 0)).toBe(true);
  });

  it('keep hulls off both islands and the sandbar, so no boat sails through the strait', () => {
    const s = { x: ISLE9.x + 20, y: ISLE9.y - 30, v: 100 };
    pushOffTwins(s, 38);
    expect(Math.hypot(s.x - ISLE9.x, s.y - ISLE9.y)).toBeCloseTo(ISLE9.r + 38, 6);
    expect(s.v).toBeLessThan(100);
    // A hull sailing east down the strait is stopped at the bar.
    const b = { x: BAR.x0 - 200, y: (BAR.y0 + BAR.y1) / 2, v: 300 };
    for (let i = 0; i < 120; i++) {
      b.x += 300 / 60;
      pushOffTwins(b, 30);
    }
    expect(b.x).toBeLessThan(BAR.x0 - 29);
  });

  it('draw their water, their ground, what stands on them, and the light over the nest', () => {
    const f = fakeView();
    f.v.onScreen = () => true;
    drawIsle8Sea(f.v);
    drawIsle8Flat(f.v);
    const solids = isle8Solids(f.v, BARRED);
    for (const s of solids) s.f();
    // The post, both towers, both camps' fires, and everything else that stands there.
    expect(solids).toHaveLength(
      5 + PALMS8.length + SNAGS9.length + ROCKS9.length + REEDS8.length + TENTS8.length,
    );
    expect(f.calls.fill ?? 0).toBeGreaterThan(40);
    isle8Glow(f.v);
    expect(f.calls.glow ?? 0).toBeGreaterThan(0);
    // Beaten for good: the orb is dark, its light is out, and the flag stands in the nest.
    const glows = f.calls.glow ?? 0;
    isle8Glow(f.v, false);
    expect(f.calls.glow).toBe(glows);
    let flags = 0;
    const won = { ...BARRED, barred9: false, orbLit: false, flag9: () => flags++ };
    for (const s of isle8Solids(f.v, won)) s.f();
    expect(flags).toBe(1);
    f.v.onScreen = () => false;
    expect(isle8Solids(f.v, BARRED)).toHaveLength(0);
  });
});
