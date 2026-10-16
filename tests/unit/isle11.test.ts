import { describe, expect, it } from 'vitest';
import { GUIDE_CALL, GUIDE_HIGH, GuideCrow } from '../../src/entities/crows';
import { dockAt, groundZ, ISLE11_DOCK, onLand, walkable } from '../../src/entities/walker';
import { DEEP, FAR, FARFAR, IX, IY, pastFarFar, seaEdge, WS } from '../../src/world/island';
import { ISLE6 } from '../../src/world/isle6';
import { ISLE10, shoreR10 } from '../../src/world/isle10';
import {
  berth11,
  byLagoon11,
  COLUMNS11,
  CRATES11,
  DOCK11,
  FERNS11,
  ISLE11,
  inLagoon11,
  inRuins11,
  insideIsle11,
  LAGOON11,
  LANDING11,
  lagoonR11,
  nearIsle11,
  onIsle11Ground,
  PALMS11,
  PERCH11,
  PIER11,
  PIER11_Z,
  PORTAL11,
  polar11,
  pushOffIsle11,
  RUINS11,
  SIGHT11,
  shoreR11,
  TREES11,
} from '../../src/world/isle11';
import { baseWorld } from './helpers/world';

/** The furthest the shore gets from the middle, all the way round. */
const widest = () => {
  let m = 0;
  for (let a = 0; a < Math.PI * 2; a += 0.01) m = Math.max(m, shoreR11(a));
  return m;
};

describe('island 11, out in the far far sea', () => {
  it('is past island 10, in the far far sea, with open water all round it inside the edge', () => {
    // North-east of island 10, the way out from home.
    expect(ISLE11.x).toBeGreaterThan(ISLE10.x);
    expect(ISLE11.y).toBeLessThan(ISLE10.y);
    const r = widest();
    // Every bit of it past the far far buoys, with room to sail between it and them.
    const e = DEEP + FAR;
    expect(ISLE11.x - r - (WS + e)).toBeGreaterThan(300);
    expect(-e - (ISLE11.y + r)).toBeGreaterThan(300);
    expect(pastFarFar(ISLE11.x, ISLE11.y)).toBe(true);
    // And short of the far far sea's own end, with room to sail round it there too.
    const end = e + FARFAR - 40;
    expect(WS + end - (ISLE11.x + r)).toBeGreaterThan(250);
    expect(ISLE11.y - r - -end).toBeGreaterThan(250);
    // Well clear of island 10.
    let ten = 0;
    for (let a = 0; a < Math.PI * 2; a += 0.01) ten = Math.max(ten, shoreR10(a));
    expect(Math.hypot(ISLE11.x - ISLE10.x, ISLE11.y - ISLE10.y) - r - ten).toBeGreaterThan(1000);
  });

  it("is as big as island 6, the kid's word", () => {
    expect(ISLE11.r).toBeGreaterThanOrEqual(ISLE6.r - 20);
    expect(ISLE11.r).toBeLessThanOrEqual(ISLE6.r + 20);
  });

  it('can be reached only by a flagship carrying a crow, through the far deep', () => {
    const e = DEEP + FAR;
    expect(seaEdge(true, true, false)).toBe(e);
    expect(seaEdge(true, true, true)).toBeGreaterThan(ISLE11.x - WS + widest());
  });

  it('has its lagoon and its ruins inland, apart, with the portal at the back of the plaza', () => {
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      const x = LAGOON11.x + Math.cos(a) * (lagoonR11(a) + 20);
      const y = LAGOON11.y + Math.sin(a) * (lagoonR11(a) + 20);
      const [b, d] = polar11(x, y);
      expect(d).toBeLessThan(shoreR11(b) - 60);
    }
    for (const [u, v] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      const x = RUINS11.x + u * RUINS11.half;
      const y = RUINS11.y + v * RUINS11.half;
      const [b, d] = polar11(x, y);
      expect(d).toBeLessThan(shoreR11(b) - 80);
      expect(inLagoon11(x, y, 40)).toBe(false);
    }
    expect(inRuins11(PORTAL11.x, PORTAL11.y)).toBe(true);
    // On the screen the portal is behind the plaza's middle (further up), so the plaza is in front of it.
    expect(PORTAL11.x + PORTAL11.y).toBeLessThan(RUINS11.x + RUINS11.y);
    for (const c of COLUMNS11) expect(inRuins11(c.x, c.y, 1)).toBe(true);
    // The lagoon is on the screen's right (+x, -y), the ruins at its top (-x, -y).
    expect(LAGOON11.x - LAGOON11.y).toBeGreaterThan(ISLE11.x - ISLE11.y);
    expect(RUINS11.x + RUINS11.y).toBeLessThan(ISLE11.x + ISLE11.y - 200);
  });

  it('is jungle all over: trees, palms and ferns on its ground, none in the lagoon or the plaza', () => {
    expect(TREES11.length).toBeGreaterThan(50);
    expect(PALMS11.length).toBeGreaterThan(14);
    expect(FERNS11.length).toBeGreaterThan(50);
    for (const [x, y] of [...TREES11, ...PALMS11, ...FERNS11]) {
      expect(onIsle11Ground(x, y)).toBe(true);
      expect(inLagoon11(x, y, 10)).toBe(false);
      expect(inRuins11(x, y, 10)).toBe(false);
    }
    // The palms lean out over the sand.
    for (const [x, y] of PALMS11) {
      const [a, d] = polar11(x, y);
      expect(d).toBeGreaterThan(shoreR11(a) - 90);
    }
  });

  it("keeps the crow's perch on the sand toward home, clear of the trees", () => {
    const [a, d] = polar11(PERCH11.x, PERCH11.y);
    expect(onIsle11Ground(PERCH11.x, PERCH11.y)).toBe(true);
    expect(d).toBeGreaterThan(shoreR11(a) - 58);
    expect(PERCH11.y).toBeGreaterThan(ISLE11.y + ISLE11.r * 0.8);
    for (const [x, y] of [...TREES11, ...PALMS11])
      expect(Math.hypot(x - PERCH11.x, y - PERCH11.y)).toBeGreaterThan(40);
  });

  it('is sighted from out at sea, and keeps a hull off its shore', () => {
    expect(SIGHT11).toBeGreaterThan(500);
    expect(nearIsle11(ISLE11.x, ISLE11.y + ISLE11.r + 200, 200)).toBe(true);
    expect(nearIsle11(IX, IY, SIGHT11)).toBe(false);
    const s = { x: ISLE11.x + 100, y: ISLE11.y + 50, v: 200 };
    pushOffIsle11(s, 20);
    const [a, d] = polar11(s.x, s.y);
    expect(d).toBeCloseTo(shoreR11(a) + 20, 5);
    expect(s.v).toBeLessThan(200);
    expect(insideIsle11(s.x, s.y, 10)).toBe(false);
    expect(insideIsle11(ISLE11.x, ISLE11.y, 0)).toBe(true);
  });
});

describe("island 11's pier, and ashore", () => {
  it('runs a pier out from the sand toward home, its end in the water and its dock in the far far sea', () => {
    expect(onIsle11Ground(ISLE11.x, PIER11.y0 + 2)).toBe(true);
    expect(onIsle11Ground(ISLE11.x, PIER11.y1 - 2)).toBe(false);
    expect(PIER11.y1 - PIER11.y0).toBeGreaterThan(140);
    expect(pastFarFar(DOCK11.x, DOCK11.y)).toBe(true);
    const [a, d] = polar11(DOCK11.x, DOCK11.y);
    expect(d).toBeGreaterThan(shoreR11(a) + 60);
    // The boat's berth is in the dock ring, bow in at the pier's end.
    const b = berth11(1);
    expect(Math.hypot(b.x - DOCK11.x, b.y - DOCK11.y)).toBeLessThan(DOCK11.r);
    expect(b.y).toBeGreaterThan(PIER11.y1);
    expect(dockAt(DOCK11.x, DOCK11.y)).toBe(ISLE11_DOCK);
  });

  it('lands the figure on the pier, up off the water, and lets it walk ashore up the middle', () => {
    expect(onLand(LANDING11.x, LANDING11.y)).toBe(true);
    expect(groundZ(LANDING11.x, LANDING11.y)).toBe(PIER11_Z);
    for (let y = LANDING11.y; y > ISLE11.y + 200; y -= 10)
      expect(walkable(ISLE11.x, y, 0)).toBe(true);
    expect(groundZ(ISLE11.x, ISLE11.y + 300)).toBe(0);
  });

  it("puts the crates at the pier's root, clear of the pier and the crow's perch", () => {
    expect(onIsle11Ground(CRATES11.x, CRATES11.y)).toBe(true);
    expect(CRATES11.x + 19).toBeLessThan(PIER11.x0);
    expect(Math.hypot(CRATES11.x - PERCH11.x, CRATES11.y - PERCH11.y)).toBeGreaterThan(50);
    expect(PERCH11.x).toBeGreaterThan(PIER11.x1 + 8);
  });

  it('keeps the figure out of the lagoon, the trees, the columns and the portal, but walks the plaza', () => {
    expect(onLand(LAGOON11.x, LAGOON11.y)).toBe(false);
    for (const [x, y] of TREES11.slice(0, 10)) expect(walkable(x, y, 0)).toBe(false);
    for (const c of COLUMNS11) expect(walkable(c.x, c.y, 0)).toBe(false);
    expect(walkable(PORTAL11.x, PORTAL11.y, 0)).toBe(false);
    expect(walkable(RUINS11.x + 20, RUINS11.y + 20, 0)).toBe(true);
    // Its rim can be walked, near enough to look in.
    const a = 2.2;
    const r = lagoonR11(a) + 16;
    const x = LAGOON11.x + Math.cos(a) * r;
    const y = LAGOON11.y + Math.sin(a) * r;
    expect(onLand(x, y)).toBe(true);
    expect(byLagoon11(x, y, 40)).toBe(true);
    expect(byLagoon11(ISLE11.x, ISLE11.y + 400, 40)).toBe(false);
  });

  it('keeps a hull off the pier', () => {
    const s = { x: ISLE11.x + 3, y: (PIER11.y0 + PIER11.y1) / 2 + 40, v: 100 };
    pushOffIsle11(s, 20);
    expect(Math.abs(s.x - ISLE11.x)).toBeGreaterThanOrEqual(10);
  });
});

describe('the crow let go in the far far sea', () => {
  const START = { x: ISLE10.x + 900, y: ISLE10.y - 900 };
  const fly = (g: GuideCrow, boat: { x: number; y: number }, s: number, each?: () => void) => {
    const w = baseWorld({ boat: { ...boat, h: 0, v: 0 } });
    for (let t = 0; t < s; t += 1 / 60) {
      g.update(1 / 60, w);
      each?.();
    }
  };

  it('starts on the rail, and goes only from it', () => {
    const g = new GuideCrow(PERCH11);
    expect(g.away).toBe(false);
    expect(g.letGo({ ...START, z: 9 })).toBe(true);
    expect(g.away).toBe(true);
    expect(g.letGo({ ...START, z: 9 })).toBe(false);
    g.reset();
    expect(g.state).toBe('aboard');
  });

  it('flies straight for land, climbs, and comes down on the sand where it waits', () => {
    const g = new GuideCrow(PERCH11);
    let arrived = 0;
    g.onArrive = () => arrived++;
    g.letGo({ ...START, z: 9 });
    let top = 0;
    let d = Math.hypot(PERCH11.x - g.x, PERCH11.y - g.y);
    fly(g, START, 2, () => {
      const n = Math.hypot(PERCH11.x - g.x, PERCH11.y - g.y);
      expect(n).toBeLessThan(d + 1e-6);
      d = n;
      top = Math.max(top, g.z);
    });
    expect(top).toBeGreaterThan(GUIDE_HIGH * 0.6);
    fly(g, START, 30);
    expect(g.state).toBe('perch');
    expect(arrived).toBe(1);
    expect(g.x).toBeCloseTo(PERCH11.x, 5);
    expect(g.z).toBeCloseTo(0, 5);
    // It waits while the boat is far off.
    fly(g, START, 5);
    expect(g.state).toBe('perch');
  });

  it('flies back to the boat once it comes close, and is on the rail again', () => {
    const g = new GuideCrow(PERCH11);
    let back = 0;
    g.onBack = () => back++;
    g.letGo({ ...START, z: 9 });
    fly(g, START, 40);
    expect(g.state).toBe('perch');
    const near = { x: PERCH11.x, y: PERCH11.y + GUIDE_CALL - 20 };
    fly(g, near, 0.2);
    expect(g.state).toBe('back');
    fly(g, near, 10);
    expect(g.state).toBe('aboard');
    expect(back).toBe(1);
  });
});
