import { describe, expect, it } from 'vitest';
import { walkable } from '../../src/entities/walker';
import { ICE_FLOE } from '../../src/world/icefloe';
import { DEEP, FAR, IX, IY, WS } from '../../src/world/island';
import { ISLE6 } from '../../src/world/isle6';
import { ISLE8, ISLE9 } from '../../src/world/isle8';
import {
  CYPRESS10,
  DOCK10,
  ISLE10,
  inWater10,
  LANDING10,
  nearIsle10,
  onIsle10,
  onIsle10Ground,
  POND,
  POOLS10,
  pushOffIsle10,
  regionAt,
  shoreR10,
  TREES10,
} from '../../src/world/isle10';

const at = (a: number, d: number): [number, number] => [
  ISLE10.x + Math.cos(a) * d,
  ISLE10.y + Math.sin(a) * d,
];

describe('island 10: where it is', () => {
  it("sits in the far deep's north-east corner, inside its edge and clear of every other island", () => {
    const far = { x0: -DEEP - FAR, x1: WS + DEEP + FAR, y0: -DEEP - FAR, y1: WS + DEEP + FAR };
    expect(ISLE10.x).toBeGreaterThan(WS + DEEP);
    expect(ISLE10.y).toBeLessThan(-DEEP);
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      const [x, y] = at(a, shoreR10(a) + 120);
      expect(x).toBeLessThan(far.x1);
      expect(y).toBeGreaterThan(far.y0);
    }
    for (const o of [ISLE6, ISLE8, ISLE9, { ...ICE_FLOE }])
      expect(Math.hypot(o.x - ISLE10.x, o.y - ISLE10.y)).toBeGreaterThan(ISLE10.r + o.r + 600);
    // Its dock faces home.
    expect(Math.hypot(DOCK10.x - IX, DOCK10.y - IY)).toBeLessThan(
      Math.hypot(ISLE10.x - IX, ISLE10.y - IY),
    );
  });
});

describe("island 10's parts", () => {
  it('prairie round the pier and the middle, forest on the far side, swamp on the right, and the pond', () => {
    expect(regionAt(...at(Math.PI / 2, 380))).toBe('prairie');
    expect(regionAt(ISLE10.x, ISLE10.y)).toBe('prairie');
    expect(regionAt(...at((-3 * Math.PI) / 4, 380))).toBe('forest');
    expect(regionAt(...at(-Math.PI / 2, 380))).toBe('forest');
    expect(regionAt(...at(-0.2, 380))).toBe('swamp');
    expect(regionAt(POND.x, POND.y)).toBe('pond');
  });

  it('each part is a good piece of the island', () => {
    const n = { prairie: 0, forest: 0, swamp: 0, pond: 0 };
    for (let x = ISLE10.x - 600; x < ISLE10.x + 600; x += 15)
      for (let y = ISLE10.y - 600; y < ISLE10.y + 600; y += 15)
        if (onIsle10Ground(x, y) || inWater10(x, y)) n[regionAt(x, y)]++;
    const all = n.prairie + n.forest + n.swamp + n.pond;
    expect(n.prairie / all).toBeGreaterThan(0.3);
    expect(n.forest / all).toBeGreaterThan(0.2);
    expect(n.swamp / all).toBeGreaterThan(0.15);
  });

  it('trees stand in the forest, cypresses in the swamp, and none in the water', () => {
    expect(TREES10.length).toBeGreaterThan(35);
    for (const [x, y] of TREES10) expect(regionAt(x, y)).toBe('forest');
    for (const [x, y] of CYPRESS10) {
      expect(regionAt(x, y)).toBe('swamp');
      expect(inWater10(x, y, 20)).toBe(false);
    }
    expect(POOLS10.length).toBeGreaterThanOrEqual(5);
    for (const p of POOLS10) expect(regionAt(p.x, p.y)).toBe('swamp');
  });
});

describe('walking island 10', () => {
  it('the pond and the pools are water, the rest is land', () => {
    expect(onIsle10(POND.x, POND.y)).toBe(false);
    for (const p of POOLS10) expect(onIsle10(p.x, p.y)).toBe(false);
    expect(onIsle10(LANDING10.x, LANDING10.y)).toBe(true);
    expect(walkable(LANDING10.x, LANDING10.y, 0)).toBe(true);
  });

  it('every part can be walked to from the end of the pier', () => {
    const step = 8;
    const key = (i: number, j: number) => `${i},${j}`;
    const seen = new Set<string>();
    const i0 = Math.round(LANDING10.x / step);
    const j0 = Math.round(LANDING10.y / step);
    const q: [number, number][] = [[i0, j0]];
    seen.add(key(i0, j0));
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
        if (seen.has(key(ni, nj)) || !walkable(ni * step, nj * step, 0)) continue;
        if (!nearIsle10(ni * step, nj * step, 200)) continue;
        seen.add(key(ni, nj));
        q.push([ni, nj]);
      }
    }
    const reached = (x: number, y: number) =>
      [...seen].some((k) => {
        const [i, j] = k.split(',').map(Number) as [number, number];
        return Math.hypot(i * step - x, j * step - y) < 24;
      });
    expect(reached(...at((-3 * Math.PI) / 4, 380))).toBe(true);
    expect(reached(...at(-0.2, 400))).toBe(true);
    expect(reached(ISLE10.x, ISLE10.y)).toBe(true);
    expect(reached(POND.x + POND.r + 20, POND.y)).toBe(true);
  });

  it('a hull is kept off the shore and the pier', () => {
    const s = { x: ISLE10.x + 100, y: ISLE10.y, v: 100 };
    pushOffIsle10(s, 20);
    expect(Math.hypot(s.x - ISLE10.x, s.y - ISLE10.y)).toBeGreaterThan(shoreR10(0) + 19);
    const p = { x: ISLE10.x + 2, y: DOCK10.y - 120, v: 100 };
    pushOffIsle10(p, 20);
    expect(Math.abs(p.x - ISLE10.x)).toBeGreaterThan(10);
  });
});
