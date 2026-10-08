import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { lurkAt } from '../../src/entities/anglerfish';
import { LAIR } from '../../src/entities/cthuluviathan';
import { inZone } from '../../src/entities/gulper';
import {
  dockAt,
  HOP,
  MOOR_TIME,
  onLand,
  SWIM_PACE,
  SWIM_SINK,
  tarDock,
  WALK_SPEED,
  Walker,
  walkable,
} from '../../src/entities/walker';
import { Warlock } from '../../src/entities/warlock';
import { drawIsle4Flat, drawIsle4Sea, isle4Solids, mix } from '../../src/render/isle4';
import { DEEP, pastBuoys, WS } from '../../src/world/island';
import { ISLE2 } from '../../src/world/isle2';
import { ISLE3 } from '../../src/world/isle3';
import {
  atTar,
  ISLE4,
  inTar,
  MONSTER,
  onIsle4,
  PALMS4,
  SAND4,
  SUMMONER,
  TAR_IN,
  TAR_R,
  tarWay,
} from '../../src/world/isle4';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const ANGLES = Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2);

/** The stick's screen vector for a world direction, full deflection. */
function stick(wx: number, wy: number): [number, number] {
  const sx = wx - wy;
  const sy = (wx + wy) / 2;
  const n = Math.hypot(sx, sy) || 1;
  return [sx / n, sy / n];
}

/** A boat up against the tar at an angle round it, and the figure stepped off into it. */
function intoTar(a: number, k = 1.6) {
  const d = TAR_R + 24 * k + 20;
  const w = baseWorld({
    hullScale: k,
    boat: { x: ISLE4.x + Math.cos(a) * d, y: ISLE4.y + Math.sin(a) * d, h: a + 2.6, v: 30 },
  });
  const p = new Walker();
  expect(p.stepAshore(tarDock(a))).toBe(true);
  for (let i = 0; i < (MOOR_TIME + HOP + 0.2) / DT; i++) p.update(DT, w);
  return { w, p };
}

describe('island 4', () => {
  it('sits in the south corner of the deep, its black water inside the deep, far from the other islands', () => {
    expect(pastBuoys(ISLE4.x, ISLE4.y)).toBe(true);
    expect(Math.max(ISLE4.x, ISLE4.y) - WS + TAR_R).toBeLessThan(DEEP);
    for (const o of [ISLE2, ISLE3, LAIR])
      expect(Math.hypot(ISLE4.x - o.x, ISLE4.y - o.y)).toBeGreaterThan(4000);
    // Clear of the gulper's water.
    expect(inZone(ISLE4.x, ISLE4.y, TAR_R)).toBe(false);
  });

  it('has its monster in the water and the evil monkey on the beach, both on the side toward home', () => {
    const toHome = (p: { x: number; y: number }) => p.x - ISLE4.x + (p.y - ISLE4.y);
    expect(toHome(MONSTER)).toBeLessThan(0);
    expect(toHome(SUMMONER)).toBeLessThan(0);
    expect(Math.hypot(MONSTER.x - ISLE4.x, MONSTER.y - ISLE4.y)).toBeGreaterThan(ISLE4.r + 20);
    expect(Math.hypot(MONSTER.x - ISLE4.x, MONSTER.y - ISLE4.y)).toBeLessThan(TAR_R - 60);
    expect(Math.hypot(SUMMONER.x - ISLE4.x, SUMMONER.y - ISLE4.y)).toBeLessThan(ISLE4.r);
    for (const p of PALMS4)
      expect(Math.hypot(p[0] - ISLE4.x, p[1] - ISLE4.y)).toBeLessThan(ISLE4.r - 20);
  });

  it('keeps the anglerfish out of its water', () => {
    const r = rng(11);
    for (let i = 0; i < 2000; i++) {
      const [x, y] = lurkAt(r);
      expect(Math.hypot(x - ISLE4.x, y - ISLE4.y)).toBeGreaterThan(ISLE4.r + 400);
    }
  });

  it('draws every moment of the change without a negative size, the black water just starting too', () => {
    for (const k of [0.001, 0.01, 0.05, 0.2, 0.5, 0.9]) {
      const f = fakeView();
      f.v.onScreen = () => true;
      for (let t = 0; t < 7; t += 0.37) {
        f.v.T = t;
        const look = { tar: k, spread: k, rise: k, summon: k };
        drawIsle4Sea(f.v, look);
        drawIsle4Flat(f.v, look);
        for (const s of isle4Solids(f.v, look)) s.f();
      }
    }
  });

  it('draws plain before the tar, and black water, a dead island and the monster after', () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mix('#FF0000', '#0000FF', 1)).toBe('#0000ff');
    const none = { tar: 0, spread: 0, rise: 0, summon: 0 };
    const all = { tar: 1, spread: 1, rise: 1, summon: 1 };
    const view = () => {
      const f = fakeView();
      // Look at island 4 rather than wherever the helper looks.
      f.v.onScreen = () => true;
      return f;
    };
    const before = view();
    drawIsle4Sea(before.v, none);
    drawIsle4Flat(before.v, none);
    const plain = isle4Solids(before.v, none);
    expect(plain).toHaveLength(PALMS4.length + 3);
    const after = view();
    drawIsle4Sea(after.v, all);
    const tarred = isle4Solids(after.v, all);
    // The monster and the monkey join the palms and rocks.
    expect(tarred.length).toBe(PALMS4.length + 3 + 2);
    for (const s of tarred) s.f();
    expect((after.calls.fill ?? 0) + (after.calls.stroke ?? 0)).toBeGreaterThan(
      (before.calls.fill ?? 0) + (before.calls.stroke ?? 0),
    );
  });

  describe('in the chemistry suit', () => {
    it('ties the boat up wherever it meets the tar, just outside it and bow in, and lands the figure in it', () => {
      for (const a of ANGLES)
        for (const k of [1, 1.6]) {
          const way = tarWay(a);
          const b = way.berth(k);
          const d = Math.hypot(b.x - ISLE4.x, b.y - ISLE4.y);
          // Clear of what keeps hulls out of the black water, so the berth holds.
          expect(d).toBeGreaterThan(TAR_R + 24 * k);
          expect(d).toBeLessThan(TAR_R + 24 * k + 12);
          expect(atTar(b.x, b.y, k)).toBe(true);
          // The bow points at the island and the landing is a hop off it, in the tar, where the figure can be.
          const bow = { x: b.x + Math.cos(b.h) * 24 * k, y: b.y + Math.sin(b.h) * 24 * k };
          expect(Math.hypot(bow.x - ISLE4.x, bow.y - ISLE4.y)).toBeLessThan(d);
          expect(Math.hypot(bow.x - way.landing.x, bow.y - way.landing.y)).toBeLessThan(40);
          expect(inTar(way.landing.x, way.landing.y)).toBe(true);
          expect(walkable(way.landing.x, way.landing.y, 0)).toBe(true);
          // None of it is a dock: nothing is sold at the tar.
          expect(dockAt(b.x, b.y)).toBeNull();
        }
      expect(atTar(ISLE4.x + TAR_R + 200, ISLE4.y, 1.6)).toBe(false);
    });

    it('is ground from the tar edge in, swum in the black water and walked on the sand', () => {
      expect(onIsle4(ISLE4.x, ISLE4.y)).toBe(true);
      expect(onLand(ISLE4.x + TAR_IN - 1, ISLE4.y)).toBe(true);
      expect(onLand(ISLE4.x + TAR_R + 5, ISLE4.y)).toBe(false);
      expect(inTar(ISLE4.x + SAND4 + 5, ISLE4.y)).toBe(true);
      expect(inTar(ISLE4.x + SAND4 - 5, ISLE4.y)).toBe(false);
      // The tar monster stands in the way, and so does the monkey on the beach.
      expect(walkable(MONSTER.x, MONSTER.y, 0)).toBe(false);
      expect(walkable(SUMMONER.x, SUMMONER.y, 0)).toBe(false);
    });

    it('moors, hops in, sinks to swim, and swims slower than it walks', () => {
      const { w, p } = intoTar(0.4);
      const b = tarWay(0.4).berth(1.6);
      expect(w.boat.x).toBeCloseTo(b.x, 6);
      expect(w.boat.y).toBeCloseTo(b.y, 6);
      expect(p.state).toBe('ashore');
      const [ix, iy] = stick(ISLE4.x - p.x, ISLE4.y - p.y);
      for (let i = 0; i < 0.6 / DT; i++) {
        p.intent(ix, iy);
        p.update(DT, w);
      }
      expect(p.sink).toBeGreaterThan(SWIM_SINK * 0.9);
      const a = { x: p.x, y: p.y };
      for (let i = 0; i < 0.5 / DT; i++) {
        p.intent(ix, iy);
        p.update(DT, w);
      }
      expect(Math.hypot(p.x - a.x, p.y - a.y) / 0.5).toBeCloseTo(WALK_SPEED * SWIM_PACE, -1);
      // No footprints in the tar.
      expect(p.prints).toHaveLength(0);
    });

    it('swims in from wherever the boat stopped and climbs out onto the sand, then back to the boat', () => {
      for (const a of ANGLES) {
        const { w, p } = intoTar(a);
        let t = 0;
        while (Math.hypot(p.x - ISLE4.x, p.y - ISLE4.y) > SAND4 - 20 && t < 14) {
          // A person heads for the middle, and round whatever is in the way.
          const [ix, iy] = stick(ISLE4.x - p.x, ISLE4.y - p.y);
          p.intent(ix, iy);
          p.update(DT, w);
          t += DT;
        }
        expect(t, `stuck swimming in from ${a.toFixed(2)}`).toBeLessThan(14);
        expect(inTar(p.x, p.y)).toBe(false);
        for (let i = 0; i < 1 / DT; i++) p.update(DT, w);
        expect(p.sink).toBeLessThan(1);
        // And back out to the landing, to go aboard.
        const home = tarDock(a).landing;
        t = 0;
        while (!p.nearBoat && t < 14) {
          const [ix, iy] = stick(home.x - p.x, home.y - p.y);
          p.intent(ix, iy);
          p.update(DT, w);
          t += DT;
        }
        expect(p.nearBoat, `no way back to the boat at ${a.toFixed(2)}`).toBe(true);
        expect(p.goAboard()).toBe(true);
        for (let i = 0; i < (HOP + 0.1) / DT; i++) p.update(DT, w);
        expect(p.aboard).toBe(true);
        expect(p.sink).toBe(0);
      }
    });

    it('draws the figure in its suit, sunk in the tar, and the warlock floating over it', () => {
      const { w, p } = intoTar(1);
      for (let i = 0; i < 1 / DT; i++) p.update(DT, w);
      const f = fakeView();
      f.v.onScreen = () => true;
      p.draw(f.v, 'solids');
      expect(f.calls.clip).toBe(1);
      expect(f.calls.restore).toBe(f.calls.save);
      const wl = new Warlock();
      wl.free = true;
      wl.come(p.x, p.y);
      const g = fakeView();
      wl.drawBody(g.v);
      expect(g.calls.stroke ?? 0).toBeGreaterThan(0);
    });
  });
});
