/**
 * Island 11, the kid's (his sixth list, 2026-10-15): "as big as island 6", with a portal to the Old One's place and a
 * key in its lagoon. The owner's call (2026-10-16) put it past island 10 out in the far far sea, in its north-east
 * corner (+x, -y), where a crow let go from the boat flies to it. The rest is mine, from his answers: a jungle all
 * over, a black lagoon, and old ruins round the portal.
 *
 *  - the jungle: everywhere, close and green, palms along the sand and great broadleaf trees inland;
 *  - the black lagoon on the right (on the screen), inland: still black water ringed with reeds, where the skull key
 *    lies and the lagoon creatures live;
 *  - the ruins on the far side (the top of the screen), so the trees hide them least: a paved plaza of old stone with
 *    broken columns round it and the portal standing at its back, a ring of carved stone, dark for now.
 *
 * The side toward home (+y) is where the pier will come in, and where the crow waits on the sand. Its shore wanders
 * like island 6's. Everything is placed from its centre.
 */

import { rng } from '../core/math';
import { DEEP, FAR, FARFAR, type Point, WS } from './island';

const IN = FARFAR * 0.55;
export const ISLE11 = { x: WS + DEEP + FAR + IN, y: -DEEP - FAR - IN, r: 640 } as const;

/** How far the shore is from the middle, at an angle round it. */
export function shoreR11(a: number): number {
  return ISLE11.r + 45 * Math.sin(3 * a + 2.4) + 30 * Math.cos(5 * a + 0.9);
}

/** The angle of a point round island 11, and how far it is from the middle. */
export function polar11(x: number, y: number): [number, number] {
  return [Math.atan2(y - ISLE11.y, x - ISLE11.x), Math.hypot(x - ISLE11.x, y - ISLE11.y)];
}

/** Dry land stops this far in from the waterline; the sand is this deep, then the jungle. */
export const SHORE_IN11 = 14;
export const BEACH_W11 = 58;

/** The black lagoon, inland on the right of the screen: its middle, and its shore wanders about its radius. */
const LAGOON_A = -0.72;
export const LAGOON11 = {
  x: ISLE11.x + Math.cos(LAGOON_A) * 320,
  y: ISLE11.y + Math.sin(LAGOON_A) * 320,
  r: 150,
} as const;
export function lagoonR11(a: number): number {
  return LAGOON11.r + 16 * Math.sin(3 * a + 0.8) + 10 * Math.cos(5 * a + 2.1);
}
/** In the black lagoon, give or take pad. */
export function inLagoon11(x: number, y: number, pad = 0): boolean {
  const a = Math.atan2(y - LAGOON11.y, x - LAGOON11.x);
  return Math.hypot(x - LAGOON11.x, y - LAGOON11.y) < lagoonR11(a) + pad;
}

/** The ruins on the far side: a square plaza of old paving, square to the world, its middle and half its side. */
const RUINS_A = (-3 * Math.PI) / 4;
export const RUINS11 = {
  x: ISLE11.x + Math.cos(RUINS_A) * 250,
  y: ISLE11.y + Math.sin(RUINS_A) * 250,
  half: 105,
} as const;
/** The portal stands at the plaza's back (its far corner on the screen), facing the viewer. */
export const PORTAL11 = { x: RUINS11.x - 52, y: RUINS11.y - 52, r: 34 } as const;
/** The broken columns round the plaza's edge: where each stands, and how much of it is left standing. */
export const COLUMNS11: readonly { x: number; y: number; h: number }[] = [
  [-1, -0.2],
  [-1, 0.45],
  [-0.2, -1],
  [0.45, -1],
  [-1, 1],
  [1, -1],
  [0.35, 1],
  [1, 0.35],
].map(([u, v], i) => ({
  x: RUINS11.x + (u as number) * RUINS11.half,
  y: RUINS11.y + (v as number) * RUINS11.half,
  h: [44, 18, 38, 26, 12, 30, 22, 9][i] as number,
}));
/** In the ruins' plaza, give or take pad. */
export function inRuins11(x: number, y: number, pad = 0): boolean {
  const h = RUINS11.half + pad;
  return Math.abs(x - RUINS11.x) < h && Math.abs(y - RUINS11.y) < h;
}

/** The pier, out from the beach toward home (+y), square to the world; the boat ties up at its end. */
const PIER_ROOT = ISLE11.y + shoreR11(Math.PI / 2) - 34;
export const PIER11 = {
  x0: ISLE11.x - 10,
  x1: ISLE11.x + 10,
  y0: PIER_ROOT,
  y1: PIER_ROOT + 170,
} as const;
export const PIER11_Z = 7;

export function onPier11(x: number, y: number): boolean {
  return x >= PIER11.x0 && x <= PIER11.x1 && y >= PIER11.y0 && y <= PIER11.y1;
}

/** Entering this ring sells the hold and opens the shop. */
export const DOCK11 = { x: ISLE11.x, y: PIER11.y1 + 70, r: 125 } as const;
/** The boat's berth for a hull of this scale: bow in at the pier's end. */
export function berth11(k: number): { x: number; y: number; h: number } {
  return { x: ISLE11.x, y: PIER11.y1 + 6 + 34 * k, h: -Math.PI / 2 };
}
/** Where the figure lands, at the end of the pier. */
export const LANDING11 = { x: ISLE11.x, y: PIER11.y1 - 10 } as const;
/** A stack of crates and a barrel at the pier's root, on the side away from the crow's perch: the catch flies there. */
export const CRATES11 = { x: ISLE11.x - 42, y: PIER_ROOT - 14 } as const;

/** Where the crow let go from the boat waits for it: on the sand toward home, beside the pier's root. */
export const PERCH11 = {
  x: ISLE11.x + 26,
  y: ISLE11.y + shoreR11(Math.PI / 2) - 24,
} as const;

/**
 * Things placed once from a seed, each this far from the others and from `from`: between lo and hi from the middle,
 * each worked out from how far the shore is that way.
 */
function scatter(
  seed: number,
  n: number,
  near: number,
  lo: (shore: number) => number,
  hi: (shore: number) => number,
  from: readonly Point[] = [],
  clearOf = 26,
): Point[] {
  const R = rng(seed);
  const out: Point[] = [];
  for (let tries = 0; out.length < n && tries < n * 400; tries++) {
    const a = R() * Math.PI * 2;
    const s = shoreR11(a);
    const d0 = lo(s);
    const d = Math.sqrt(d0 * d0 + R() * (hi(s) ** 2 - d0 * d0));
    const x = ISLE11.x + Math.cos(a) * d;
    const y = ISLE11.y + Math.sin(a) * d;
    if (inLagoon11(x, y, 26) || inRuins11(x, y, 22)) continue;
    // Keep the way up from where the pier will be, and the crow's perch, open.
    if (Math.abs(x - ISLE11.x) < 54 && y > ISLE11.y + 180) continue;
    if (Math.hypot(x - PERCH11.x, y - PERCH11.y) < 50) continue;
    if (!from.every(([px, py]) => Math.hypot(x - px, y - py) > clearOf)) continue;
    if (!out.every(([px, py]) => Math.hypot(x - px, y - py) > near)) continue;
    out.push([x, y]);
  }
  return out;
}

/** The jungle's great trees, inland and close together, and the palms along the sand. */
export const TREES11: readonly Point[] = scatter(
  1103,
  64,
  46,
  () => 30,
  (s) => s - BEACH_W11 - 26,
);
export const PALMS11: readonly Point[] = scatter(
  1109,
  22,
  60,
  (s) => s - BEACH_W11 - 24,
  (s) => s - 16,
  TREES11,
  34,
);
/** Ferns and big-leaved plants on the jungle floor, low enough to see over. */
export const FERNS11: readonly Point[] = scatter(
  1117,
  70,
  34,
  () => 20,
  (s) => s - BEACH_W11 - 8,
  TREES11,
  18,
);

/** On island 11's ground: inside the shore, out of the lagoon. */
export function onIsle11Ground(x: number, y: number): boolean {
  const [a, d] = polar11(x, y);
  return d < shoreR11(a) - SHORE_IN11 && !inLagoon11(x, y, 4);
}

/** Island 11 underfoot: its ground or its pier. */
export function onIsle11(x: number, y: number): boolean {
  return onIsle11Ground(x, y) || onPier11(x, y);
}

/** The height of what is underfoot on island 11: the pier's planks, or the ground. */
export function groundZ11(x: number, y: number): number {
  return onPier11(x, y) && !onIsle11Ground(x, y) ? PIER11_Z : 0;
}

/** Near enough the lagoon's edge to look in, from its dry ground. */
export function byLagoon11(x: number, y: number, reach: number): boolean {
  return inLagoon11(x, y, reach) && !inLagoon11(x, y, 4);
}

/** Within this of its shore a boat sees it: a sighting. */
export const SIGHT11 = 760;

/** Further out than this from island 11, nothing needs to know it is there. */
export function nearIsle11(x: number, y: number, pad: number): boolean {
  return Math.hypot(x - ISLE11.x, y - ISLE11.y) < ISLE11.r + 90 + pad;
}

/** Keep a hull off island 11's shore, wherever it is round it, and off the pier. */
export function pushOffIsle11(s: { x: number; y: number; v: number }, pad: number): void {
  const [a, d] = polar11(s.x, s.y);
  const r = shoreR11(a) + pad;
  if (d < r && d > 0) {
    s.x = ISLE11.x + Math.cos(a) * r;
    s.y = ISLE11.y + Math.sin(a) * r;
    s.v *= 0.6;
  }
  const half = 10 + pad * 0.6;
  if (s.y > PIER11.y0 && s.y < PIER11.y1 + pad * 0.4 && Math.abs(s.x - ISLE11.x) < half) {
    s.x = ISLE11.x + (s.x >= ISLE11.x ? half : -half);
    s.v *= 0.6;
  }
}

/** Inside island 11's shore, pushed out by pad: for the sea's glints to keep off it. */
export function insideIsle11(x: number, y: number, pad: number): boolean {
  const [a, d] = polar11(x, y);
  return d < shoreR11(a) + pad;
}
