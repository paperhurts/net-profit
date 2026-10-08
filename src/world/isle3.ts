/**
 * Island 3, the sunken island: the owner's design, round her kid's boss. It
 * went under long ago. Its old town lies on the sea floor, roofs and streets
 * seen through the water, and nothing stands above the waves but its tower and
 * a shanty town of shacks on rafts lashed together beside it. Seaweed has
 * gathered round the tower's foot thick enough to stand on, and the town's
 * planks reach it, so the tower's door can be walked to. It is out in the north
 * corner of the deep, the last empty one, as far from home as island 2.
 *
 * Everything is placed from its centre, which is the tower. The rafts and their
 * walks are boxes square to the world, like the pier at home, and the town lies
 * on the side toward home, with its jetty pointing that way: the boat ties up
 * at the jetty's end, bow in, as it does at the pier.
 */

import { rng } from '../core/math';
import { DEEP, type Point } from './island';

/** Its centre (the tower) and the radius of the drowned island on the sea floor. */
export const ISLE3 = { x: -DEEP / 2, y: -DEEP / 2, r: 300 } as const;

/** A point on island 3, from an offset off its centre. */
export const at3 = (dx: number, dy: number): Point => [ISLE3.x + dx, ISLE3.y + dy];

export type Box = { x0: number; y0: number; x1: number; y1: number };
const box = (x0: number, y0: number, x1: number, y1: number): Box => ({
  x0: ISLE3.x + x0,
  y0: ISLE3.y + y0,
  x1: ISLE3.x + x1,
  y1: ISLE3.y + y1,
});

/** The tower, standing out of the sea in the middle: its centre, radius and height. */
export const TOWER3 = { x: ISLE3.x, y: ISLE3.y, r: 30, h: 190 } as const;
/** The seaweed gathered round its foot, thick enough to stand on. */
export const MAT = { x: ISLE3.x, y: ISLE3.y, r: 82 } as const;

/** The rafts: the net loft, the trader's at the corner, and the bait shack. */
export const RAFTS: readonly Box[] = [
  box(-36, 96, 36, 158),
  box(90, 90, 172, 172),
  box(96, -36, 158, 36),
];
/** Plank walks from the seaweed to the rafts and between them, each lapping what it joins. */
export const WALKS: readonly Box[] = [
  box(6, 56, 22, 104),
  box(56, 6, 104, 22),
  box(30, 140, 98, 156),
  box(140, 30, 156, 98),
];
/** The jetty, out from the trader's raft toward home. The boat ties up at its end. */
export const JETTY = box(164, 134, 276, 154);
/** Everything with planks, as drawn. */
export const PLANKS: readonly Box[] = [...RAFTS, ...WALKS, JETTY];

/** The shacks, each at the back of its raft so the planks in front stay clear. */
export const SHACKS: readonly (Box & { roof: string; wall: string })[] = [
  { ...box(-32, 100, -4, 136), wall: '#C7B08A', roof: '#8E9A9C' },
  { ...box(96, 96, 136, 132), wall: '#E2CFA4', roof: '#B5643C' },
  { ...box(100, -32, 136, -4), wall: '#7FA8A3', roof: '#8E9A9C' },
];
/** The trader's shack, which buys the catch. Fish sold here fly to it. */
export const TRADER = SHACKS[1] as Box;
export const TRADER_MID = {
  x: (TRADER.x0 + TRADER.x1) / 2,
  y: (TRADER.y0 + TRADER.y1) / 2,
} as const;
/** Lamps on poles at the rafts' outer corners and halfway down the jetty. */
export const LAMPS: readonly Point[] = [at3(-30, 152), at3(166, 166), at3(152, -30), at3(222, 150)];

/** Entering this ring sells the hold, as the dock at home does. */
export const DOCK3 = { x: ISLE3.x + 292, y: ISLE3.y + 144, r: 125 } as const;
/** The boat's berth for a hull of this scale: heading in along the jetty, bow a hand's width off its end. */
export function berth3(k: number): { x: number; y: number; h: number } {
  return { x: JETTY.x1 + 6 + 34 * k, y: (JETTY.y0 + JETTY.y1) / 2, h: Math.PI };
}
/** Where the figure lands, near the end of the jetty. */
export const LANDING3 = { x: JETTY.x1 - 10, y: (JETTY.y0 + JETTY.y1) / 2 } as const;

const D = Math.SQRT1_2;
/** The doorstep outside the tower's door, on its face toward the viewer, on the seaweed. */
export const DOOR3 = { x: TOWER3.x + 52 * D, y: TOWER3.y + 52 * D } as const;

/** A gap in the seaweed round the tower from its door, where deep water shows: with scuba gear, the way down. */
export const DIVE3 = { x: TOWER3.x - 56 * D, y: TOWER3.y + 56 * D } as const;

/** Planks and seaweed are walked this far in from their edges. */
const EDGE = 3;
/** How far in from the seaweed's ragged rim it holds the figure. */
const MAT_IN = 12;

const inBox = (x: number, y: number, b: Box, m = 0): boolean =>
  x >= b.x0 + m && x <= b.x1 - m && y >= b.y0 + m && y <= b.y1 - m;

/** On the planks, as drawn. */
export function onPlanks(x: number, y: number): boolean {
  return PLANKS.some((b) => inBox(x, y, b));
}

/** Somewhere the figure can stand: the planks, or the seaweed. What stands on them is the walker's business. */
export function onIsle3(x: number, y: number): boolean {
  if (Math.hypot(x - MAT.x, y - MAT.y) <= MAT.r - MAT_IN) return true;
  return PLANKS.some((b) => inBox(x, y, b, EDGE));
}

/** The planks ride this high on their barrels; the seaweed only just clears the water. */
export const PLANK_Z = 4;
export const MAT_Z = 1;
export function groundZ3(x: number, y: number): number {
  return onPlanks(x, y) ? PLANK_Z : MAT_Z;
}

/** Something with a position and a speed that can be shoved. */
type Body = { x: number; y: number; v: number };

/** The convex hull of a set of points, anticlockwise in the world's x and y (monotone chain). */
function hull(pts: Point[]): Point[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point[] = [];
  for (const q of p) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2] as Point, lower[lower.length - 1] as Point, q) <= 0
    )
      lower.pop();
    lower.push(q);
  }
  const upper: Point[] = [];
  for (const q of p.reverse()) {
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2] as Point, upper[upper.length - 1] as Point, q) <= 0
    )
      upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * What a hull is kept off: one outline round the seaweed and every plank, with
 * no hollows in it. The water inside it, between the rafts and the seaweed, is
 * too narrow for any hull anyway, and a hollow corner would have a boat pushed
 * back and forth between two things at once.
 */
export const TOWN_HULL: readonly Point[] = hull([
  ...Array.from({ length: 32 }, (_, i): Point => {
    const a = (i / 32) * Math.PI * 2;
    // Round the outside of the seaweed's disc, so the outline's flats never cut into it.
    const r = MAT.r / Math.cos(Math.PI / 32);
    return [MAT.x + Math.cos(a) * r, MAT.y + Math.sin(a) * r];
  }),
  ...PLANKS.flatMap((b): Point[] => [
    [b.x0, b.y0],
    [b.x1, b.y0],
    [b.x1, b.y1],
    [b.x0, b.y1],
  ]),
]);

/**
 * Keep a hull pad clear of the town and the seaweed, bleeding a little speed:
 * out along the nearest point of the outline, or, from inside it, out through
 * its nearest side. The water over the drowned town is open; only what floats
 * on it is in the way.
 */
export function pushOffTown(s: Body, pad: number): void {
  if (Math.abs(s.x - ISLE3.x) > 400 || Math.abs(s.y - ISLE3.y) > 400) return;
  const n = TOWN_HULL.length;
  let best = Infinity;
  let bx = 0;
  let by = 0;
  let inside = true;
  let shallow = Infinity;
  let ox = 0;
  let oy = 0;
  for (let i = 0; i < n; i++) {
    const a = TOWN_HULL[i] as Point;
    const b = TOWN_HULL[(i + 1) % n] as Point;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len = Math.hypot(ex, ey) || 1;
    // Anticlockwise in x and y, so the outward normal is (ey, -ex).
    const nx = ey / len;
    const ny = -ex / len;
    const out = (s.x - a[0]) * nx + (s.y - a[1]) * ny;
    if (out > 0) inside = false;
    if (-out < shallow) {
      shallow = -out;
      ox = nx;
      oy = ny;
    }
    const t = Math.max(0, Math.min(1, ((s.x - a[0]) * ex + (s.y - a[1]) * ey) / (len * len)));
    const qx = a[0] + ex * t;
    const qy = a[1] + ey * t;
    const d = Math.hypot(s.x - qx, s.y - qy);
    if (d < best) {
      best = d;
      bx = qx;
      by = qy;
    }
  }
  if (inside) {
    s.x += ox * (shallow + pad);
    s.y += oy * (shallow + pad);
  } else if (best < pad && best > 0) {
    s.x = bx + ((s.x - bx) / best) * pad;
    s.y = by + ((s.y - by) / best) * pad;
  } else return;
  s.v *= 0.94;
}

/** Further out than this from island 3, nothing from home needs to know it is there. */
export function nearIsle3(x: number, y: number, pad: number): boolean {
  return Math.hypot(x - ISLE3.x, y - ISLE3.y) < ISLE3.r + pad;
}

/** A house of the drowned town: where, how big, which way it is turned, and what is left of it. */
export type Ruin = {
  x: number;
  y: number;
  w: number;
  d: number;
  a: number;
  /** 0 walls only, 1 a roof still on, 2 a roof fallen in at a slant. */
  roof: 0 | 1 | 2;
  /** How tall the walls still stand. */
  h: number;
};

/** The old streets: from the tower's foot out to the old shore, as angles. */
export const STREETS: readonly number[] = [0.35, 1.9, 3.3, 4.6];

/**
 * The drowned town's houses, placed once from a seed along the old streets and
 * between them, inside the old shore, kept off each other and mostly out from
 * under the rafts so they can be seen.
 */
export const RUINS: readonly Ruin[] = (() => {
  const r = rng(71);
  const out: Ruin[] = [];
  for (let tries = 0; out.length < 16 && tries < 2000; tries++) {
    const a = r() * Math.PI * 2;
    const d = 115 + r() * (ISLE3.r - 150);
    const x = ISLE3.x + Math.cos(a) * d;
    const y = ISLE3.y + Math.sin(a) * d;
    const w = 26 + r() * 18;
    const dd = 22 + r() * 14;
    if (PLANKS.some((b) => x > b.x0 - 30 && x < b.x1 + 30 && y > b.y0 - 30 && y < b.y1 + 30))
      continue;
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < (o.w + w) * 0.62 + 14)) continue;
    const roll = r();
    out.push({
      x,
      y,
      w,
      d: dd,
      a: a + (r() - 0.5) * 0.5,
      roof: roll < 0.35 ? 1 : roll < 0.7 ? 2 : 0,
      h: 8 + r() * 14,
    });
  }
  return out;
})();
