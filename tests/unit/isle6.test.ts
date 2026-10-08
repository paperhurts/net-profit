import { describe, expect, it } from 'vitest';
import { LAIR } from '../../src/entities/cthuluviathan';
import { dockAt, HOP, ISLE6_DOCK, MOOR_TIME, Walker, walkable } from '../../src/entities/walker';
import { drawIsle6Flat, drawIsle6Sea, isle6Solids } from '../../src/render/isle6';
import { DEEP, FAR, pastFar, WS } from '../../src/world/island';
import { ISLE3 } from '../../src/world/isle3';
import { ISLE5 } from '../../src/world/isle5';
import {
  berth6,
  CHESTS6,
  DOCK6,
  HILL,
  ISLE6,
  LANDING6,
  onIsle6,
  PALMS6,
  PIER6,
  POST6,
  pushOffIsle6,
  ROCKS6,
  SIGHT6,
  shoreR,
  TEMPLE,
} from '../../src/world/isle6';
import { createFarSchools } from '../../src/world/schools';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

describe('island 6, the big island', () => {
  it('is far bigger than any island before it, out in the far deep with sea all round', () => {
    expect(ISLE6.r).toBeGreaterThanOrEqual(600);
    expect(pastFar(ISLE6.x, ISLE6.y)).toBe(true);
    // Its whole shore, and its pier and dock, between the far buoys and the far deep's end.
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const y = ISLE6.y + Math.sin(a) * shoreR(a);
      expect(y).toBeGreaterThan(-DEEP - FAR + 150);
      expect(y).toBeLessThan(-DEEP - 150);
      expect(shoreR(a)).toBeGreaterThan(ISLE6.r - 100);
    }
    expect(DOCK6.y + DOCK6.r).toBeLessThan(-DEEP + 30);
    for (const o of [ISLE3, ISLE5, LAIR])
      expect(Math.hypot(ISLE6.x - o.x, ISLE6.y - o.y)).toBeGreaterThan(ISLE6.r + SIGHT6 + 900);
    for (const sc of createFarSchools())
      expect(Math.hypot(sc.ax - ISLE6.x, sc.ay - ISLE6.y)).toBeGreaterThan(ISLE6.r + sc.r + 400);
    expect(ISLE6.x).toBe(WS / 2);
  });

  it('has a pier toward home with its dock ring at the end, the berth clear of the shore and the pier', () => {
    expect(dockAt(DOCK6.x, DOCK6.y)).toBe(ISLE6_DOCK);
    for (const k of [1, 1.6]) {
      const b = berth6(k);
      const s = { x: b.x, y: b.y, v: 0 };
      pushOffIsle6(s, 24 * k);
      expect(s.x).toBeCloseTo(b.x, 6);
      expect(s.y).toBeCloseTo(b.y, 6);
      expect(Math.hypot(b.x - DOCK6.x, b.y - DOCK6.y)).toBeLessThan(DOCK6.r);
    }
    expect(onIsle6(LANDING6.x, LANDING6.y)).toBe(true);
    expect(walkable(LANDING6.x, LANDING6.y, 0)).toBe(true);
    // A hull is pushed off the shore and off the pier.
    const s = { x: ISLE6.x + 40, y: ISLE6.y, v: 100 };
    pushOffIsle6(s, 38);
    expect(Math.hypot(s.x - ISLE6.x, s.y - ISLE6.y)).toBeGreaterThan(ISLE6.r - 100);
    const p = { x: PIER6.x0 + 4, y: (PIER6.y0 + PIER6.y1) / 2 + 40, v: 100 };
    pushOffIsle6(p, 38);
    expect(Math.abs(p.x - ISLE6.x)).toBeGreaterThan(10);
  });

  it('moors at the pier end and lands the figure on its planks', () => {
    const w = baseWorld({
      docked: true,
      hullScale: 1.6,
      boat: { x: DOCK6.x + 30, y: DOCK6.y, h: 0, v: 60 },
    });
    const p = new Walker();
    expect(p.stepAshore(ISLE6_DOCK)).toBe(true);
    for (let i = 0; i < (MOOR_TIME + HOP + 0.2) * 60; i++) p.update(1 / 60, w);
    const b = berth6(1.6);
    expect(w.boat.x).toBeCloseTo(b.x, 6);
    expect(w.boat.y).toBeCloseTo(b.y, 6);
    expect(p.state).toBe('ashore');
    expect(p.z).toBeGreaterThan(0);
  });

  it('can be walked from the pier to every chest, round the hill, the trading post and the temple', () => {
    const step = 6;
    const key = (i: number, j: number) => `${i},${j}`;
    const seen = new Set<string>();
    const i0 = Math.round(LANDING6.x / step);
    const j0 = Math.round(LANDING6.y / step);
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
        const ni = i + di;
        const nj = j + dj;
        const k = key(ni, nj);
        if (seen.has(k) || !walkable(ni * step, nj * step, 0)) continue;
        seen.add(k);
        queue.push([ni, nj]);
      }
    }
    expect(CHESTS6.length).toBe(6);
    const near = (x: number, y: number, r: number) => {
      for (let a = 0; a < 16; a++) {
        const i = Math.round((x + Math.cos(a) * r) / step);
        const j = Math.round((y + Math.sin(a) * r) / step);
        if (seen.has(key(i, j))) return true;
      }
      return false;
    };
    for (const [x, y] of CHESTS6) expect(near(x, y, 16), `chest at ${x}, ${y}`).toBe(true);
    // The hill, the post and the temple stand in the way.
    expect(walkable(HILL.x, HILL.y, 0)).toBe(false);
    expect(walkable((POST6.x0 + POST6.x1) / 2, (POST6.y0 + POST6.y1) / 2, 0)).toBe(false);
    expect(walkable(TEMPLE.x, TEMPLE.y, 0)).toBe(false);
    for (const [x, y] of [...PALMS6, ...ROCKS6]) expect(onIsle6(x, y)).toBe(true);
    // Chests a good walk apart.
    for (const a of CHESTS6)
      for (const b of CHESTS6)
        if (a !== b) expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(250);
  });

  it('draws its water, its ground and what stands on it, chests shut and open', () => {
    const f = fakeView();
    f.v.onScreen = () => true;
    drawIsle6Sea(f.v);
    drawIsle6Flat(f.v);
    const shut = isle6Solids(f.v, () => false);
    for (const s of shut) s.f();
    for (const s of isle6Solids(f.v, () => true)) s.f();
    expect(shut.length).toBe(PALMS6.length + ROCKS6.length + CHESTS6.length + 4);
    const drawn = ['fill', 'stroke', 'box', 'extrude'].reduce((n, k) => n + (f.calls[k] ?? 0), 0);
    expect(drawn).toBeGreaterThan(100);
  });
});
