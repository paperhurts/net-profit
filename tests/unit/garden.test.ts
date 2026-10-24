import { describe, expect, it } from 'vitest';
import { parseGarden, untouchedGarden } from '../../src/data/garden';
import { dockAt, GARDEN_DOCK, groundZ, onLand, walkable } from '../../src/entities/walker';
import { drawGardenFlat, drawGardenSea, gardenSolids } from '../../src/render/garden';
import { ENDLESS13 } from '../../src/world/endless';
import {
  BED,
  BEDS,
  BEDS_START,
  berth14,
  CRATES14,
  DOCK14,
  fromGarden,
  GARDEN,
  gardenOutline,
  ISLE14,
  inPlot14,
  insideIsle14,
  LANDING14,
  nearIsle14,
  onIsle14Ground,
  onPier14,
  PIER14,
  PIER14_Z,
  PLOT14,
  pushOffIsle14,
  SIGHT14,
  STALLS,
  shoreRG,
  stallAt,
  TREES14,
  toGarden,
  WINDMILL,
} from '../../src/world/garden';
import { DEEP, FAR, IX, IY, pastFar, WS } from '../../src/world/island';
import { ISLE2 } from '../../src/world/isle2';
import { ISLE5 } from '../../src/world/isle5';
import { ISLE7 } from '../../src/world/isle7';
import { ISLE10 } from '../../src/world/isle10';
import { createFarSchools } from '../../src/world/schools';
import { fakeView } from './helpers/view';

const shore = gardenOutline(360);

describe('the Garden Isle: where it is', () => {
  it("lies in the far deep's left corner, inside the far far buoys, with water all round it", () => {
    const edge = DEEP + FAR;
    for (const [x, y] of shore) {
      // Past the far buoys, out in the far deep, where the flagship sails once the far deep is open.
      expect(pastFar(x, y)).toBe(true);
      // And well short of the far far buoys, with room to sail round it.
      expect(x - -edge).toBeGreaterThan(150);
      expect(WS + edge - y).toBeGreaterThan(150);
    }
    // In the left corner: west of home and south of it, as island 10 is east and north.
    expect(GARDEN.x).toBeLessThan(-DEEP);
    expect(GARDEN.y).toBeGreaterThan(WS + DEEP);
    // Straight across the map from island 10, give or take its step up the screen off the line to the Endless Isle.
    expect(Math.hypot(GARDEN.x + ISLE10.x - 2 * IX, GARDEN.y + ISLE10.y - 2 * IY)).toBeLessThan(
      900,
    );
  });

  it('is clear of every island near it, and of the run from home to the Endless Isle', () => {
    for (const o of [ISLE2, ISLE5, ISLE7])
      expect(Math.hypot(o.x - GARDEN.x, o.y - GARDEN.y)).toBeGreaterThan(ISLE14.r + o.r + 600);
    // The straight run from home to the Endless Isle passes below it, clear of its shore, its pier and its dock.
    const off = (x: number, y: number) =>
      Math.abs((x - IX) * (ENDLESS13.y - IY) - (y - IY) * (ENDLESS13.x - IX)) /
      Math.hypot(ENDLESS13.x - IX, ENDLESS13.y - IY);
    for (const [x, y] of shore) expect(off(x, y)).toBeGreaterThan(40);
    expect(off(DOCK14.x, DOCK14.y)).toBeLessThan(500);
  });

  it("keeps clear of the far deep's schools, so a sweep round the corner never runs aground", () => {
    for (const sc of createFarSchools()) {
      const [a, d] = polar(sc.ax, sc.ay);
      expect(d - shoreRG(a)).toBeGreaterThan(sc.r + 30);
    }
  });

  it('is sighted from out at sea, before the boat is on it', () => {
    const [x, y] = fromGarden(GARDEN_R_PAD + SIGHT14 - 50, 0);
    expect(nearIsle14(x, y, SIGHT14)).toBe(true);
    const [fx, fy] = fromGarden(GARDEN_R_PAD + SIGHT14 + 300, 0);
    expect(nearIsle14(fx, fy, SIGHT14)).toBe(false);
  });
});

const GARDEN_R_PAD = 380;

function polar(x: number, y: number): [number, number] {
  const [u, v] = toGarden(x, y);
  return [Math.atan2(v, u), Math.hypot(u, v)];
}

describe("the Garden Isle's pier, and ashore", () => {
  it('runs a pier out toward home, its end in the water and its dock past it', () => {
    const [x0, y0] = fromGarden(PIER14.u0, PIER14.v);
    const [x1, y1] = fromGarden(PIER14.u1, PIER14.v);
    expect(insideIsle14(x0, y0, 0)).toBe(true);
    expect(insideIsle14(x1, y1, 0)).toBe(false);
    // Toward home: its end nearer home than its root, and the dock nearer still.
    const home = (x: number, y: number) => Math.hypot(x - IX, y - IY);
    expect(home(x1, y1)).toBeLessThan(home(x0, y0));
    expect(home(DOCK14.x, DOCK14.y)).toBeLessThan(home(x1, y1));
    expect(insideIsle14(DOCK14.x, DOCK14.y, 40)).toBe(false);
    // The boat ties up bow in, inside the dock ring, and the dock is found from there.
    const b = berth14(1.6);
    expect(Math.hypot(b.x - DOCK14.x, b.y - DOCK14.y)).toBeLessThan(DOCK14.r);
    expect(dockAt(b.x, b.y)).toBe(GARDEN_DOCK);
    const [hx, hy] = [Math.cos(b.h), Math.sin(b.h)];
    const [px, py] = fromGarden(PIER14.u1, PIER14.v);
    expect(hx * (px - b.x) + hy * (py - b.y)).toBeGreaterThan(0);
  });

  it('lands the figure on the pier, up off the water, and lets it walk ashore to every stall and the plot', () => {
    expect(onPier14(LANDING14.x, LANDING14.y)).toBe(true);
    expect(onLand(LANDING14.x, LANDING14.y)).toBe(true);
    expect(groundZ(LANDING14.x, LANDING14.y)).toBe(PIER14_Z);
    const ashore = fromGarden(PIER14.u0 - 30, PIER14.v);
    expect(onIsle14Ground(...ashore)).toBe(true);
    expect(groundZ(...ashore)).toBe(0);
    // Walk from the landing, in steps a figure takes, to the front of each stall and into the plot.
    const reach = flood(LANDING14.x, LANDING14.y);
    for (const s of STALLS) {
      const [x, y] = fromGarden(s.front.u, s.front.v);
      expect(reach(x, y)).toBe(true);
      expect(stallAt(x, y)).toBe(s);
    }
    for (const b of BEDS) expect(reach(...fromGarden(b.u, b.v))).toBe(true);
  });

  it('keeps the figure out of the stalls, the windmill and the trees, and off the water', () => {
    for (const s of STALLS) expect(walkable(...fromGarden(s.u, s.v), 0)).toBe(false);
    expect(walkable(...fromGarden(WINDMILL.u, WINDMILL.v), 0)).toBe(false);
    for (const t of TREES14) expect(walkable(...fromGarden(t.u, t.v), 0)).toBe(false);
    expect(onLand(...fromGarden(shoreRG(1) + 30, 0))).toBe(false);
  });

  it('lays out 24 beds in the plot, the first six nearest the pier, none overlapping, all on dry land', () => {
    expect(BEDS).toHaveLength(24);
    expect(BEDS_START).toBe(6);
    // The first six are a block of two by three in the corner by the pier: the two columns nearest it, and the three
    // rows nearest its line.
    const cols = [...new Set(BEDS.map((b) => b.u))].sort((a, b) => b - a).slice(0, 2);
    const rows = [...new Set(BEDS.map((b) => b.v))]
      .sort((a, b) => Math.abs(a - PIER14.v) - Math.abs(b - PIER14.v))
      .slice(0, 3);
    for (const b of BEDS.slice(0, BEDS_START)) {
      expect(cols).toContain(b.u);
      expect(rows).toContain(b.v);
    }
    for (let i = 0; i < BEDS.length; i++) {
      const a = BEDS[i] as { u: number; v: number };
      expect(inPlot14(...fromGarden(a.u, a.v))).toBe(true);
      expect(onIsle14Ground(...fromGarden(a.u, a.v))).toBe(true);
      for (let j = i + 1; j < BEDS.length; j++) {
        const b = BEDS[j] as { u: number; v: number };
        expect(Math.max(Math.abs(a.u - b.u), Math.abs(a.v - b.v))).toBeGreaterThanOrEqual(BED);
      }
    }
    // The plot stays clear of the stalls and the pier.
    for (const s of STALLS) expect(inPlot14(...fromGarden(s.u, s.v))).toBe(false);
    expect(PLOT14.u1).toBeLessThan(PIER14.u0);
  });

  it('puts the crates by the pier root on dry land', () => {
    expect(insideIsle14(CRATES14.x, CRATES14.y, -20)).toBe(true);
  });

  it('keeps a hull off its shore and off the pier', () => {
    const s = { x: GARDEN.x, y: GARDEN.y + 10, v: 100 };
    pushOffIsle14(s, 24);
    const [a, d] = polar(s.x, s.y);
    expect(d).toBeGreaterThanOrEqual(shoreRG(a) + 23);
    const [x, y] = fromGarden((PIER14.u0 + PIER14.u1) / 2 + 60, PIER14.v + 2);
    const h = { x, y, v: 100 };
    pushOffIsle14(h, 24);
    const [, hv] = toGarden(h.x, h.y);
    expect(Math.abs(hv - PIER14.v)).toBeGreaterThanOrEqual(PIER14.half + 23);
    expect(h.v).toBeLessThan(100);
  });
});

describe('drawing the Garden Isle', () => {
  it('draws its shallows, its ground, plot and pier, and its stalls, windmill, trees, scarecrow and crates', () => {
    const f = fakeView();
    drawGardenSea(f.v);
    drawGardenFlat(f.v);
    const solids = gardenSolids(f.v);
    expect(solids).toHaveLength(STALLS.length + 1 + TREES14.length + 1 + 1);
    for (const s of solids) s.f();
    expect(f.calls.fill ?? 0).toBeGreaterThan(40);
  });

  it('draws nothing when it is far off the screen', () => {
    const f = fakeView();
    f.onScreen = false;
    drawGardenSea(f.v);
    drawGardenFlat(f.v);
    expect(gardenSolids(f.v)).toHaveLength(0);
    expect(f.calls.fill ?? 0).toBe(0);
  });
});

describe("the Garden Isle's save", () => {
  it('reads anything odd as not seen, and is left out until it is seen', () => {
    expect(parseGarden(undefined)).toEqual({ seen: false });
    expect(parseGarden({ seen: true })).toEqual({ seen: true });
    expect(parseGarden({ seen: 'true' })).toEqual({ seen: false });
    expect(untouchedGarden({ seen: false })).toBe(true);
    expect(untouchedGarden({ seen: true })).toBe(false);
  });
});

/** Whether the figure could walk from here to there, in 6-unit steps over walkable ground. */
function flood(x0: number, y0: number): (x: number, y: number) => boolean {
  const S = 6;
  const seen = new Set<string>();
  const key = (i: number, j: number) => `${i},${j}`;
  const q: [number, number][] = [[0, 0]];
  seen.add(key(0, 0));
  while (q.length) {
    const [i, j] = q.pop() as [number, number];
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const ni = i + di;
      const nj = j + dj;
      const k = key(ni, nj);
      if (seen.has(k) || Math.abs(ni) > 200 || Math.abs(nj) > 200) continue;
      if (!walkable(x0 + ni * S, y0 + nj * S, 0)) continue;
      seen.add(k);
      q.push([ni, nj]);
    }
  }
  return (x, y) => {
    const i = Math.round((x - x0) / S);
    const j = Math.round((y - y0) / S);
    for (let di = -1; di <= 1; di++)
      for (let dj = -1; dj <= 1; dj++) if (seen.has(key(i + di, j + dj))) return true;
    return false;
  };
}
