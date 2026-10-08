/**
 * Island 6, the kid's big island, out in the far deep off its top-right side.
 * He asked for fifty boats wide; the owner's call is still open, and until she
 * makes it it is about eighteen (the whole island is ISLE6.r across from the
 * middle, one number to change), several screens of walking and three times
 * island 3. It is the leviathan's island: an old temple of green stone stands
 * half in the sea on its east side, where there is open water for a fight, and
 * the leviathan sleeps off it. On the side
 * toward home a long pier runs out from the beach with a trading post at its
 * root; a rocky hill rises in the middle, and palms and boulders cover the rest.
 * Treasure chests lie hidden round it for whoever walks it all.
 *
 * Its shore is not a circle: the radius wanders with the angle round it, so the
 * outline has bays and points. Everything is placed from its centre.
 */

import { rng } from '../core/math';
import { DEEP, FAR, IX, type Point } from './island';

export const ISLE6 = { x: IX, y: -DEEP - FAR / 2, r: 650 } as const;

/** How far the shore is from the middle, at an angle round it. */
export function shoreR(a: number): number {
  return ISLE6.r + 50 * Math.sin(3 * a + 0.7) + 35 * Math.cos(5 * a + 1.3);
}

/** The angle of a point round island 6, and how far it is from the middle. */
function polar(x: number, y: number): [number, number] {
  return [Math.atan2(y - ISLE6.y, x - ISLE6.x), Math.hypot(x - ISLE6.x, y - ISLE6.y)];
}

/** The sand: everything inside the shore, walked up to this far in from the water. */
export const SHORE_IN = 14;
/** The grass starts this far in from the shore. */
export const BEACH_W = 70;

/** On island 6's ground, the pier aside. */
export function onIsle6Ground(x: number, y: number): boolean {
  const [a, d] = polar(x, y);
  return d < shoreR(a) - SHORE_IN;
}

/** The pier, out from the beach toward home (+y), as a box square to the world; the boat ties up at its end. */
const PIER_ROOT = ISLE6.y + shoreR(Math.PI / 2) - 40;
export const PIER6 = {
  x0: ISLE6.x - 10,
  x1: ISLE6.x + 10,
  y0: PIER_ROOT,
  y1: PIER_ROOT + 170,
} as const;
export const PIER6_Z = 7;

export function onPier6(x: number, y: number): boolean {
  return x >= PIER6.x0 && x <= PIER6.x1 && y >= PIER6.y0 && y <= PIER6.y1;
}

/** Island 6 underfoot: its ground or its pier. */
export function onIsle6(x: number, y: number): boolean {
  return onIsle6Ground(x, y) || onPier6(x, y);
}

/** The height of what is underfoot on island 6: the pier's planks, or the sand. */
export function groundZ6(x: number, y: number): number {
  return onPier6(x, y) && !onIsle6Ground(x, y) ? PIER6_Z : 0;
}

/** Entering this ring sells the hold and opens the shop. */
export const DOCK6 = { x: ISLE6.x, y: PIER6.y1 + 70, r: 125 } as const;
/** The boat's berth for a hull of this scale: bow in at the pier's end. */
export function berth6(k: number): { x: number; y: number; h: number } {
  return { x: ISLE6.x, y: PIER6.y1 + 6 + 34 * k, h: -Math.PI / 2 };
}
/** Where the figure lands, at the end of the pier. */
export const LANDING6 = { x: ISLE6.x, y: PIER6.y1 - 10 } as const;

/** The trading post at the pier's root, to one side; the catch flies to it. */
export const POST6 = {
  x0: ISLE6.x + 34,
  y0: PIER_ROOT - 96,
  x1: ISLE6.x + 92,
  y1: PIER_ROOT - 44,
} as const;
export const POST6_MID = { x: (POST6.x0 + POST6.x1) / 2, y: (POST6.y0 + POST6.y1) / 2 } as const;

/** The hill in the middle: rock, too steep to climb. */
export const HILL = { x: ISLE6.x - 30, y: ISLE6.y - 40, r: 120 } as const;

/** The leviathan's temple on the east side (+x), half in the sea: its middle and half its width. */
export const TEMPLE = {
  x: ISLE6.x + shoreR(0) - 50,
  y: ISLE6.y + 20,
  w: 70,
} as const;

/**
 * Palms, boulders and the chests, placed once from a seed on open grass: each this far from the others
 * of its kind, and 30 from what was placed before it.
 */
function scatter(seed: number, n: number, near: number, from: readonly Point[] = []): Point[] {
  const R = rng(seed);
  const out: Point[] = [];
  const clear = (x: number, y: number) =>
    Math.hypot(x - HILL.x, y - HILL.y) > HILL.r + 30 &&
    Math.hypot(x - TEMPLE.x, y - TEMPLE.y) > TEMPLE.w + 50 &&
    !(x > POST6.x0 - 40 && x < POST6.x1 + 40 && y > POST6.y0 - 40 && y < POST6.y1 + 40) &&
    // Keep the way up from the pier open.
    !(Math.abs(x - ISLE6.x) < 50 && y > ISLE6.y + 200) &&
    from.every(([px, py]) => Math.hypot(x - px, y - py) > 30) &&
    out.every(([px, py]) => Math.hypot(x - px, y - py) > near);
  for (let tries = 0; out.length < n && tries < n * 200; tries++) {
    const a = R() * Math.PI * 2;
    const d = Math.sqrt(R()) * (shoreR(a) - BEACH_W - 20);
    const x = ISLE6.x + Math.cos(a) * d;
    const y = ISLE6.y + Math.sin(a) * d;
    if (clear(x, y)) out.push([x, y]);
  }
  return out;
}

export const PALMS6: readonly Point[] = scatter(83, 34, 46);
export const ROCKS6: readonly Point[] = scatter(89, 16, 50, PALMS6);
/** The treasure chests, far enough apart to need finding, and their coins each. */
export const CHESTS6: readonly Point[] = scatter(97, 6, 260, [...PALMS6, ...ROCKS6]);
export const CHEST_COINS = 300;
/** Close enough to a chest to open it. */
export const CHEST_REACH = 22;

/** Within this of its shore a boat sees it: a sighting. */
export const SIGHT6 = 900;

/** Further out than this from island 6, nothing needs to know it is there. */
export function nearIsle6(x: number, y: number, pad: number): boolean {
  return Math.hypot(x - ISLE6.x, y - ISLE6.y) < ISLE6.r + 90 + pad;
}

/** Keep a hull off island 6's shore, wherever it is round it, and off the pier. */
export function pushOffIsle6(s: { x: number; y: number; v: number }, pad: number): void {
  const [a, d] = polar(s.x, s.y);
  const r = shoreR(a) + pad;
  if (d < r && d > 0) {
    s.x = ISLE6.x + Math.cos(a) * r;
    s.y = ISLE6.y + Math.sin(a) * r;
    s.v *= 0.6;
  }
  // The pier: a thin box sticking out; push across it, to the nearer side.
  const half = 10 + pad * 0.6;
  if (s.y > PIER6.y0 && s.y < PIER6.y1 + pad * 0.4 && Math.abs(s.x - ISLE6.x) < half) {
    s.x = ISLE6.x + (s.x >= ISLE6.x ? half : -half);
    s.v *= 0.6;
  }
}
