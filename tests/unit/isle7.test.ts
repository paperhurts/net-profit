import { describe, expect, it } from 'vitest';
import { LAIR } from '../../src/entities/cthuluviathan';
import { AGGRO, Monkeys } from '../../src/entities/monkeys';
import { dockAt, HOP, ISLE7_DOCK, MOOR_TIME, Walker, walkable } from '../../src/entities/walker';
import {
  drawIsle7Flat,
  drawIsle7Sea,
  isle7Glow,
  isle7Solids,
  ringAt,
} from '../../src/render/isle7';
import { DEEP, FAR, pastFar, WS } from '../../src/world/island';
import { ISLE5 } from '../../src/world/isle5';
import { ISLE6 } from '../../src/world/isle6';
import {
  berth7,
  CAMP7,
  CHEST7,
  DOCK7,
  DOOR7,
  HUTS7,
  ISLE7,
  LANDING7,
  onIsle7,
  PALMS7,
  PORTAL_FEET,
  PORTAL7,
  POST7,
  pushOffIsle7,
  SIGHT7,
  TOTEM7,
  TOWER7,
} from '../../src/world/isle7';
import { createFarSchools } from '../../src/world/schools';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

describe('island 7, the monkeys and the portal', () => {
  it('sits out in the far deep straight down from home, wholly short of its end, far from the other islands', () => {
    expect(pastFar(ISLE7.x, ISLE7.y)).toBe(true);
    expect(ISLE7.x).toBe(WS / 2);
    expect(DOCK7.y - DOCK7.r).toBeGreaterThan(WS + DEEP + 30);
    expect(ISLE7.y + ISLE7.r + 150).toBeLessThan(WS + DEEP + FAR);
    for (const o of [ISLE5, ISLE6, LAIR])
      expect(Math.hypot(ISLE7.x - o.x, ISLE7.y - o.y)).toBeGreaterThan(ISLE7.r + SIGHT7 + 1500);
    for (const sc of createFarSchools())
      expect(Math.hypot(sc.ax - ISLE7.x, sc.ay - ISLE7.y)).toBeGreaterThan(ISLE7.r + sc.r + 400);
  });

  it('has its dock ring toward home, a berth on the sand clear of the shove, and a landing on dry land', () => {
    expect(dockAt(DOCK7.x, DOCK7.y)).toBe(ISLE7_DOCK);
    expect(DOCK7.y).toBeLessThan(ISLE7.y);
    for (const k of [1, 1.6]) {
      const b = berth7(k);
      const s = { x: b.x, y: b.y, v: 0 };
      pushOffIsle7(s, 24 * k);
      expect(s.x).toBeCloseTo(b.x, 6);
      expect(s.y).toBeCloseTo(b.y, 6);
      expect(Math.hypot(b.x - DOCK7.x, b.y - DOCK7.y)).toBeLessThan(DOCK7.r);
      // Bow toward the island.
      expect(Math.sin(b.h)).toBeCloseTo(1, 6);
    }
    expect(walkable(LANDING7.x, LANDING7.y, 0)).toBe(true);
    const s = { x: ISLE7.x + 20, y: ISLE7.y - 30, v: 100 };
    pushOffIsle7(s, 38);
    expect(Math.hypot(s.x - ISLE7.x, s.y - ISLE7.y)).toBeCloseTo(ISLE7.r + 38, 6);
    expect(s.v).toBeLessThan(100);
  });

  it('moors on the sand and lands the figure', () => {
    const w = baseWorld({
      docked: true,
      hullScale: 1.6,
      boat: { x: DOCK7.x + 30, y: DOCK7.y, h: 0, v: 60 },
    });
    const p = new Walker();
    expect(p.stepAshore(ISLE7_DOCK)).toBe(true);
    for (let i = 0; i < (MOOR_TIME + HOP + 0.2) * 60; i++) p.update(1 / 60, w);
    const b = berth7(1.6);
    expect(w.boat.x).toBeCloseTo(b.x, 6);
    expect(w.boat.y).toBeCloseTo(b.y, 6);
    expect(p.state).toBe('ashore');
  });

  it('can be walked from the landing to the tower door, the camp, its chest and round the portal', () => {
    const step = 4;
    const key = (i: number, j: number) => `${i},${j}`;
    const seen = new Set<string>();
    const i0 = Math.round(LANDING7.x / step);
    const j0 = Math.round(LANDING7.y / step);
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
    const near = (x: number, y: number, r: number) => {
      for (let a = 0; a < 16; a++) {
        const i = Math.round((x + Math.cos(a) * r) / step);
        const j = Math.round((y + Math.sin(a) * r) / step);
        if (seen.has(key(i, j))) return true;
      }
      return false;
    };
    expect(near(DOOR7.x, DOOR7.y, 4)).toBe(true);
    expect(near(CHEST7.x, CHEST7.y, 14)).toBe(true);
    expect(near(CAMP7.x, CAMP7.y, 14)).toBe(true);
    // Right through the ring, between its feet.
    expect(near(PORTAL7.x, PORTAL7.y, 4)).toBe(true);
    // What stands there is in the way, and all of it is on the sand.
    expect(walkable(TOWER7.x, TOWER7.y, 0)).toBe(false);
    expect(walkable((POST7.x0 + POST7.x1) / 2, (POST7.y0 + POST7.y1) / 2, 0)).toBe(false);
    for (const p of [...HUTS7, ...PORTAL_FEET]) expect(walkable(p[0], p[1], 0)).toBe(false);
    for (const p of [...PALMS7, ...HUTS7, ...PORTAL_FEET, [TOTEM7.x, TOTEM7.y] as const])
      expect(onIsle7(p[0], p[1])).toBe(true);
  });

  it("keeps the camp's monkeys off the landing and the tower door, and on the island", () => {
    expect(Math.hypot(LANDING7.x - CAMP7.x, LANDING7.y - CAMP7.y)).toBeGreaterThan(AGGRO + 150);
    expect(Math.hypot(DOOR7.x - CAMP7.x, DOOR7.y - CAMP7.y)).toBeGreaterThan(AGGRO);
    expect(Math.hypot(PORTAL7.x - CAMP7.x, PORTAL7.y - CAMP7.y)).toBeGreaterThan(AGGRO + 50);
    const camp = new Monkeys(CAMP7, 6, 2);
    const w = baseWorld({ figure: null });
    for (let i = 0; i < 20 * 60; i++) camp.update(1 / 60, w);
    for (const m of camp.list) expect(walkable(m.x, m.y, 0)).toBe(true);
  });

  it('draws its water, its ground, what stands on it, and the portal dead and awake', () => {
    const f = fakeView();
    f.v.onScreen = () => true;
    drawIsle7Sea(f.v);
    drawIsle7Flat(f.v);
    const fills = (look: Parameters<typeof isle7Solids>[1]) => {
      const n0 = f.calls.clip ?? 0;
      const solids = isle7Solids(f.v, look);
      for (const s of solids) s.f();
      return { n: solids.length, clips: (f.calls.clip ?? 0) - n0 };
    };
    let flown = 0;
    const dead = fills({ cleared: false, flag: null, open: 0 });
    const awake = fills({ cleared: true, flag: () => flown++, open: 1 });
    expect(flown).toBe(1);
    expect(dead.n).toBe(PALMS7.length + HUTS7.length + 6);
    // Only an awake portal has light inside its ring.
    expect(dead.clips).toBe(0);
    expect(awake.clips).toBe(1);
    isle7Glow(f.v, { cleared: false, flag: null, open: 1 });
    expect(f.calls.glow ?? 0).toBeGreaterThan(0);
    // The ring stands upright on its feet, facing the viewer: its width runs across the screen.
    const [lx, ly, lz] = ringAt(Math.PI);
    const [rx, ry, rz] = ringAt(0);
    expect(lx + ly).toBeCloseTo(rx + ry, 6);
    expect(lz).toBeCloseTo(rz, 6);
    expect(ringAt(-Math.PI / 2)[2]).toBeGreaterThan(0);
  });
});
