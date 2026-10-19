import { describe, expect, it } from 'vitest';
import { dockAt, groundZ, ISLE12_DOCK, onLand, walkable } from '../../src/entities/walker';
import { drawIsle12Flat, drawIsle12Sea, isle12Solids } from '../../src/render/isle12';
import { DEEP, FAR, FARFAR, IX, IY, pastFarFar, WS } from '../../src/world/island';
import { ISLE11, shoreR11 } from '../../src/world/isle11';
import {
  atTower12,
  berth12,
  CRANIUM,
  CRATES12,
  DOCK12,
  EYES,
  fromSkull,
  ISLE12,
  inHole12,
  insideIsle12,
  isle12Outline,
  JAW,
  LANDING12,
  NOSE,
  nearEye12,
  nearIsle12,
  onIsle12Ground,
  onPier12,
  PIER12,
  PIER12_Z,
  PITS12,
  polar12,
  pushOffIsle12,
  SIGHT12,
  SKULL,
  shoreR12,
  TEETH,
  TOWER12,
  TOWER12_DOOR,
  toSkull,
} from '../../src/world/isle12';
import { fakeView } from './helpers/view';

const shore = isle12Outline(360);

describe('Skull Island, in the far far sea', () => {
  it("lies in the far far sea's bottom corner, past the white buoys, with water all round it", () => {
    const e = DEEP + FAR;
    const end = e + FARFAR - 40;
    for (const [x, y] of shore) {
      // Past the white (far far) buoys everywhere, out where they meet at the bottom of the map.
      expect(pastFarFar(x, y)).toBe(true);
      expect(Math.max(x, y) - (WS + e)).toBeGreaterThan(250);
      // And short of the far far sea's own end, room to sail round it.
      expect(WS + end - x).toBeGreaterThan(250);
      expect(WS + end - y).toBeGreaterThan(250);
    }
    // Its dock too, the ring and all, inside the sea.
    expect(WS + end - (DOCK12.x + DOCK12.r)).toBeGreaterThan(150);
    // Straight down the screen from home: its middle on the line through home and the sea's bottom corner.
    expect(SKULL.x - IX).toBeCloseTo(SKULL.y - IY, 5);
  });

  it('is the biggest island yet: wider and longer than island 11, and more than twice its size', () => {
    const us = shore.map(([x, y]) => toSkull(x, y)[0]);
    const vs = shore.map(([x, y]) => toSkull(x, y)[1]);
    expect(Math.max(...us) - Math.min(...us)).toBeGreaterThan(2 * ISLE11.r * 1.4);
    expect(Math.max(...vs) - Math.min(...vs)).toBeGreaterThan(2 * ISLE11.r * 1.6);
    const area = (r: (a: number) => number) => {
      let s = 0;
      for (let a = 0; a < Math.PI * 2; a += 0.005) s += 0.5 * r(a) ** 2 * 0.005;
      return s;
    };
    expect(area(shoreR12)).toBeGreaterThan(2 * area(shoreR11));
    // Far from island 11, across the far far sea.
    expect(Math.hypot(ISLE12.x - ISLE11.x, ISLE12.y - ISLE11.y)).toBeGreaterThan(8000);
  });

  it('is shaped like a skull: a cranium on top, a face with two eyes and a nose, teeth, and a jaw under', () => {
    // The cranium is the widest part and the jaw is narrower, the jaw at the bottom of the screen.
    expect(JAW.half).toBeLessThan(CRANIUM.ru);
    expect(JAW.v1).toBeGreaterThan(CRANIUM.rv);
    const [cx, cy] = fromSkull(0, -CRANIUM.rv + 40);
    const [jx, jy] = fromSkull(0, JAW.v1 - 40);
    expect(jx + jy).toBeGreaterThan(cx + cy);
    // Two eyes, side by side across the screen, and a nose between and under them.
    expect(EYES).toHaveLength(2);
    const [l, r] = EYES as [(typeof EYES)[number], (typeof EYES)[number]];
    expect(l.v).toBe(r.v);
    expect(l.u).toBe(-r.u);
    expect(NOSE.v0).toBeGreaterThan(l.v);
    // Its holes are in its rock, not cut through its edge, and there is no ground down them.
    for (const e of EYES) {
      const [x, y] = fromSkull(e.u, e.v);
      expect(insideIsle12(x, y, -e.ru - 60)).toBe(true);
      expect(inHole12(e.u, e.v)).toBe(true);
      expect(onLand(x, y)).toBe(false);
    }
    const [nx, ny] = fromSkull(0, (NOSE.v0 + NOSE.v1) / 2);
    expect(onLand(nx, ny)).toBe(false);
    // The sea map draws it in its shape: its outline, and three pits.
    expect(PITS12).toHaveLength(3);
  });

  it('is sighted from out at sea, and keeps a hull off its shore', () => {
    expect(SIGHT12).toBeGreaterThan(500);
    const [ax, ay] = fromSkull(0, -CRANIUM.rv - 300);
    expect(nearIsle12(ax, ay, SIGHT12)).toBe(true);
    expect(nearIsle12(IX, IY, SIGHT12)).toBe(false);
    const s = { x: SKULL.x + 100, y: SKULL.y + 50, v: 200 };
    pushOffIsle12(s, 20);
    const [a, d] = polar12(s.x, s.y);
    expect(d).toBeCloseTo(shoreR12(a) + 20, 5);
    expect(s.v).toBeLessThan(200);
    expect(insideIsle12(s.x, s.y, 10)).toBe(false);
  });
});

describe("Skull Island's pier, and ashore", () => {
  it('runs a pier out off its chin, its end in the water and its dock past it', () => {
    const [rx, ry] = fromSkull(0, PIER12.v0 + 4);
    expect(onIsle12Ground(rx, ry)).toBe(true);
    const [ex, ey] = fromSkull(0, PIER12.v1 - 4);
    expect(onIsle12Ground(ex, ey)).toBe(false);
    expect(onPier12(ex, ey)).toBe(true);
    expect(PIER12.v1 - JAW.v1).toBeGreaterThan(140);
    const [a, d] = polar12(DOCK12.x, DOCK12.y);
    expect(d).toBeGreaterThan(shoreR12(a) + 60);
    // The boat's berth is in the dock ring, bow in at the pier's end, pointing up the screen.
    const b = berth12(1);
    expect(Math.hypot(b.x - DOCK12.x, b.y - DOCK12.y)).toBeLessThan(DOCK12.r);
    expect(toSkull(b.x, b.y)[1]).toBeGreaterThan(PIER12.v1);
    expect(Math.cos(b.h)).toBeCloseTo(Math.sin(b.h), 5);
    expect(Math.cos(b.h)).toBeLessThan(0);
    expect(dockAt(DOCK12.x, DOCK12.y)).toBe(ISLE12_DOCK);
  });

  it('lands the figure on the pier, up off the water, and lets it walk up the jaw through the gap in its teeth', () => {
    expect(onLand(LANDING12.x, LANDING12.y)).toBe(true);
    expect(groundZ(LANDING12.x, LANDING12.y)).toBe(PIER12_Z);
    const [jx, jy] = fromSkull(0, JAW.v1 - 120);
    expect(groundZ(jx, jy)).toBe(0);
    // Straight up the middle, from the pier's end over the chin, through the gap where its front teeth were, and up
    // its face between the eyes to the cranium.
    for (let w = PIER12.v1 - 12; w > -300; w -= 6) {
      const [x, y] = fromSkull(0, w);
      if (inHole12(0, w, 6)) continue;
      expect(onLand(x, y)).toBe(true);
    }
    // Either side of the gap, the teeth stand in the way.
    for (const t of TEETH) {
      const [x, y] = fromSkull(t.u, t.v);
      expect(walkable(x, y, 0)).toBe(false);
    }
    expect(Math.min(...TEETH.map((t) => Math.abs(t.u) - t.w / 2))).toBeGreaterThan(30);
  });

  it("puts the crates at the pier's root, on the rock, and stops the figure at them", () => {
    expect(onIsle12Ground(CRATES12.x, CRATES12.y)).toBe(true);
    expect(walkable(CRATES12.x, CRATES12.y, 0)).toBe(false);
    expect(onPier12(CRATES12.x, CRATES12.y)).toBe(false);
  });

  it("stands Skrill's tower on the crown, its door walkable and the tower itself not", () => {
    expect(TOWER12.v).toBeLessThan(0);
    const [x, y] = fromSkull(TOWER12.u, TOWER12.v);
    expect(onLand(x, y)).toBe(false);
    expect(onLand(TOWER12_DOOR.x, TOWER12_DOOR.y)).toBe(true);
    expect(atTower12(TOWER12_DOOR.x, TOWER12_DOOR.y)).toBe(true);
    expect(atTower12(LANDING12.x, LANDING12.y)).toBe(false);
  });

  it('knows when the figure is at the rim of an eye socket', () => {
    const e = EYES[0] as (typeof EYES)[number];
    const [x, y] = fromSkull(e.u, e.v + e.rv + 25);
    expect(onLand(x, y)).toBe(true);
    expect(nearEye12(x, y)).toBe(true);
    expect(nearEye12(LANDING12.x, LANDING12.y)).toBe(false);
  });

  it('keeps a hull off the pier', () => {
    const [x, y] = fromSkull(3, (PIER12.v0 + PIER12.v1) / 2 + 40);
    const s = { x, y, v: 100 };
    pushOffIsle12(s, 20);
    expect(Math.abs(toSkull(s.x, s.y)[0])).toBeGreaterThanOrEqual(PIER12.half + 19);
  });
});

describe('drawing Skull Island', () => {
  it('draws its shallows, its rock and holes, and its teeth, tower and crates as solids', () => {
    const f = fakeView();
    drawIsle12Sea(f.v);
    drawIsle12Flat(f.v);
    const solids = isle12Solids(f.v);
    expect(solids.length).toBe(TEETH.length + 2);
    for (const s of solids) s.f();
    expect(f.calls.fill ?? 0).toBeGreaterThan(20);
  });

  it('draws nothing when it is far off the screen', () => {
    const f = fakeView();
    f.onScreen = false;
    drawIsle12Sea(f.v);
    drawIsle12Flat(f.v);
    expect(isle12Solids(f.v)).toHaveLength(0);
    expect(f.calls.fill ?? 0).toBe(0);
  });
});
