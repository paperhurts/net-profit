/**
 * Island 10, the kid's (2026-10-13): "a forest a prairie a swamp and a pond". The owner's call put it in the far deep's
 * empty north-east corner (+x, -y), across from the ice floe in the north-west, until the crows open the far far sea
 * beyond for island 11. A big island, a little smaller than island 6, in four parts by the way round it:
 *
 *  - the prairie toward home, round the pier (on the screen, the near side and the left): long golden grass and
 *    wildflowers, where the pier comes in, and in it the pond, round and still, with lily pads and reeds;
 *  - the forest on the far side (the top of the screen), so its trees hide nothing: oaks and pines, close together;
 *  - the swamp on the right: dark mud, pools of black water, reeds, and cypress trees hung with moss.
 *
 * The pond and the swamp's pools are water: the figure walks round them. Its shore wanders like island 6's, and the
 * borders between the parts wander too, so nothing is a straight line. Everything is placed from its centre. The
 * creatures, the old man's store, the tower and the crows come in pieces after the place.
 */

import { rng } from '../core/math';
import { DEEP, FAR, type Point, WS } from './island';

export const ISLE10 = { x: WS + DEEP + FAR * 0.58, y: -DEEP - FAR * 0.58, r: 520 } as const;

/** How far the shore is from the middle, at an angle round it. */
export function shoreR10(a: number): number {
  return ISLE10.r + 40 * Math.sin(3 * a + 1.9) + 28 * Math.cos(4 * a + 0.4);
}

/** The angle of a point round island 10, and how far it is from the middle. */
export function polar10(x: number, y: number): [number, number] {
  return [Math.atan2(y - ISLE10.y, x - ISLE10.x), Math.hypot(x - ISLE10.x, y - ISLE10.y)];
}

/** Dry land stops this far in from the waterline; the sand is this deep, then the land proper. */
export const SHORE_IN10 = 14;
export const BEACH_W10 = 46;

export type Region = 'prairie' | 'forest' | 'swamp' | 'pond';

/**
 * Where the parts meet, as angles round the middle: the forest from FOREST_A to SWAMP_A, the swamp from there to
 * PRAIRIE_A, the prairie the rest of the way round (the pier's side). Each border wanders as it goes out.
 */
export const FOREST_A = -Math.PI * 0.98;
export const SWAMP_A = -Math.PI * 0.36;
export const PRAIRIE_A = Math.PI * 0.2;
/** Within this of the middle it is all prairie: a meadow in the heart of the island. */
export const MEADOW_R = 110;

/** The border's angle this far out: a base angle, wandering by a little. */
export function border(base: number, d: number, k: number): number {
  return base + 0.16 * Math.sin(d / 55 + k) + 0.07 * Math.sin(d / 23 + k * 2);
}

/** The pond, out in the prairie between the pier and the middle. */
const POND_A = Math.PI * 0.62;
export const POND = {
  x: ISLE10.x + Math.cos(POND_A) * 230,
  y: ISLE10.y + Math.sin(POND_A) * 230,
  r: 78,
} as const;

/** Which part of the island a point is in (on the island or not). */
export function regionAt(x: number, y: number): Region {
  if (Math.hypot(x - POND.x, y - POND.y) < POND.r) return 'pond';
  const [a, d] = polar10(x, y);
  if (d < MEADOW_R) return 'prairie';
  const f = border(FOREST_A, d, 0.3);
  // Measured round from the forest's start, so the turn past a half circle never splits a part.
  const t = wrapTurn(a - f);
  if (t < wrapTurn(border(SWAMP_A, d, 1.7) - f)) return 'forest';
  if (t < wrapTurn(border(PRAIRIE_A, d, 2.9) - f)) return 'swamp';
  return 'prairie';
}

/** An angle as a share of a whole turn round, from 0 up to a full turn. */
function wrapTurn(x: number): number {
  const T = Math.PI * 2;
  return ((x % T) + T) % T;
}

/** The pier, out from the beach toward home (+y), square to the world; the boat ties up at its end. */
const PIER_ROOT = ISLE10.y + shoreR10(Math.PI / 2) - 34;
export const PIER10 = {
  x0: ISLE10.x - 10,
  x1: ISLE10.x + 10,
  y0: PIER_ROOT,
  y1: PIER_ROOT + 160,
} as const;
export const PIER10_Z = 7;

export function onPier10(x: number, y: number): boolean {
  return x >= PIER10.x0 && x <= PIER10.x1 && y >= PIER10.y0 && y <= PIER10.y1;
}

/** Entering this ring sells the hold and opens the shop. */
export const DOCK10 = { x: ISLE10.x, y: PIER10.y1 + 70, r: 125 } as const;
/** The boat's berth for a hull of this scale: bow in at the pier's end. */
export function berth10(k: number): { x: number; y: number; h: number } {
  return { x: ISLE10.x, y: PIER10.y1 + 6 + 34 * k, h: -Math.PI / 2 };
}
/** Where the figure lands, at the end of the pier. */
export const LANDING10 = { x: ISLE10.x, y: PIER10.y1 - 10 } as const;
/** A stack of crates and a barrel at the pier's root, to one side: the catch flies there. */
export const CRATES10 = { x: ISLE10.x + 34, y: PIER_ROOT - 12 } as const;

/**
 * The old man's store: a little wooden shack on the prairie, up and to the left of the pier as the figure comes
 * ashore, with a porch out front where he sits in his rocking chair. The shack stands in the way; the chair too.
 */
export const STORE10 = { x: ISLE10.x - 120, y: ISLE10.y + 440 } as const;
export const SHACK10 = {
  x0: STORE10.x - 28,
  x1: STORE10.x + 10,
  y0: STORE10.y - 28,
  y1: STORE10.y + 6,
} as const;
/** His rocking chair, along the porch from the shack's door, so the sign over it shows. */
export const OLDMAN10 = { x: STORE10.x + 24, y: STORE10.y + 22 } as const;

/** Things placed once from a seed in one part of the island, each this far from the others and from `from`. */
function scatter(
  seed: number,
  n: number,
  near: number,
  where: Region,
  from: readonly Point[] = [],
  clearOf = 26,
): Point[] {
  const R = rng(seed);
  const out: Point[] = [];
  for (let tries = 0; out.length < n && tries < n * 400; tries++) {
    const a = R() * Math.PI * 2;
    const d = Math.sqrt(R()) * (shoreR10(a) - BEACH_W10 - 18);
    const x = ISLE10.x + Math.cos(a) * d;
    const y = ISLE10.y + Math.sin(a) * d;
    if (regionAt(x, y) !== where) continue;
    if (Math.hypot(x - POND.x, y - POND.y) < POND.r + 30) continue;
    // Keep the way up from the pier, and the crates, open.
    if (Math.abs(x - ISLE10.x) < 46 && y > ISLE10.y + 160) continue;
    if (Math.hypot(x - CRATES10.x, y - CRATES10.y) < 40) continue;
    if (Math.hypot(x - STORE10.x, y - STORE10.y) < 80) continue;
    if (!from.every(([px, py]) => Math.hypot(x - px, y - py) > clearOf)) continue;
    if (!out.every(([px, py]) => Math.hypot(x - px, y - py) > near)) continue;
    out.push([x, y]);
  }
  return out;
}

/** The swamp's pools of black water: a point and a radius each. */
export const POOLS10: readonly { x: number; y: number; r: number }[] = scatter(
  1003,
  7,
  95,
  'swamp',
).map(([x, y], i) => ({ x, y, r: 26 + (i % 3) * 9 }));
const POOL_PTS: Point[] = POOLS10.map((p) => [p.x, p.y]);
/** The forest's trees: oaks and pines, close. */
export const TREES10: readonly Point[] = scatter(1011, 46, 34, 'forest');
/** The swamp's cypresses, clear of the pools' edges. */
export const CYPRESS10: readonly Point[] = scatter(1019, 18, 52, 'swamp', POOL_PTS, 50).filter(
  ([x, y]) => !POOLS10.some((p) => Math.hypot(x - p.x, y - p.y) < p.r + 22),
);
/** A few lone trees and rocks out on the prairie. */
export const OAKS10: readonly Point[] = scatter(1027, 5, 150, 'prairie');
export const ROCKS10: readonly Point[] = scatter(1031, 7, 110, 'prairie', OAKS10);

/** In the pond or one of the swamp's pools, give or take pad. */
export function inWater10(x: number, y: number, pad = 0): boolean {
  if (Math.hypot(x - POND.x, y - POND.y) < POND.r + pad) return true;
  return POOLS10.some((p) => Math.hypot(x - p.x, y - p.y) < p.r + pad);
}

/** On island 10's ground, the pier aside: inside the shore and out of the water. */
export function onIsle10Ground(x: number, y: number): boolean {
  const [a, d] = polar10(x, y);
  return d < shoreR10(a) - SHORE_IN10 && !inWater10(x, y, 4);
}

/** Island 10 underfoot: its ground or its pier. */
export function onIsle10(x: number, y: number): boolean {
  return onIsle10Ground(x, y) || onPier10(x, y);
}

/** The height of what is underfoot on island 10: the pier's planks, or the ground. */
export function groundZ10(x: number, y: number): number {
  return onPier10(x, y) && !onIsle10Ground(x, y) ? PIER10_Z : 0;
}

/** Within this of its shore a boat sees it: a sighting. */
export const SIGHT10 = 900;

/** Further out than this from island 10, nothing needs to know it is there. */
export function nearIsle10(x: number, y: number, pad: number): boolean {
  return Math.hypot(x - ISLE10.x, y - ISLE10.y) < ISLE10.r + 90 + pad;
}

/** Keep a hull off island 10's shore, wherever it is round it, and off the pier. */
export function pushOffIsle10(s: { x: number; y: number; v: number }, pad: number): void {
  const [a, d] = polar10(s.x, s.y);
  const r = shoreR10(a) + pad;
  if (d < r && d > 0) {
    s.x = ISLE10.x + Math.cos(a) * r;
    s.y = ISLE10.y + Math.sin(a) * r;
    s.v *= 0.6;
  }
  const half = 10 + pad * 0.6;
  if (s.y > PIER10.y0 && s.y < PIER10.y1 + pad * 0.4 && Math.abs(s.x - ISLE10.x) < half) {
    s.x = ISLE10.x + (s.x >= ISLE10.x ? half : -half);
    s.v *= 0.6;
  }
}
