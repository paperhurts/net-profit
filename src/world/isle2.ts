/**
 * Island 2, the first island past the leviathans: out in the far corner of the
 * deep opposite the Cthuluviathan's city, straight across the screen from home.
 * Only the flagship reaches it. It has its own fish, a trading post to sell at
 * with the boat run up on the sand, palms, and a tall stone tower nobody has
 * climbed yet. Everything here is placed relative to its centre, and its dock
 * faces home, the side a boat arrives from.
 */

import { DEEP, WS } from './island';

/** Its centre and radius. */
export const ISLE2 = { x: -DEEP / 2, y: WS + DEEP / 2, r: 230 } as const;

/** The way home from island 2, a unit vector: the dock and the landing face it. */
const HX = Math.SQRT1_2;
const HY = -Math.SQRT1_2;

/** Entering this ring sells the hold, as the dock at home does. */
export const DOCK2 = {
  x: ISLE2.x + HX * (ISLE2.r + 100),
  y: ISLE2.y + HY * (ISLE2.r + 100),
  r: 125,
} as const;

/** The boat's berth for a hull of this scale: bow run up onto the sand, just outside what pushes a hull off. */
export function berth2(k: number): { x: number; y: number; h: number } {
  const d = ISLE2.r + 24 * k + 4;
  return { x: ISLE2.x + HX * d, y: ISLE2.y + HY * d, h: Math.atan2(-HY, -HX) };
}

/** Where the figure lands on the sand, off the bow. */
export const LANDING2 = {
  x: ISLE2.x + HX * (ISLE2.r - 22),
  y: ISLE2.y + HY * (ISLE2.r - 22),
} as const;

/** A point on island 2, from an offset off its centre. */
export const at2 = (dx: number, dy: number): [number, number] => [ISLE2.x + dx, ISLE2.y + dy];

/** The trading post: a footprint, beside the way up from the landing. Fish sold here fly to it. */
export const POST = {
  x0: ISLE2.x + 60,
  y0: ISLE2.y - 10,
  x1: ISLE2.x + 116,
  y1: ISLE2.y + 34,
} as const;
/** The tower in the middle of the island: its centre, radius and height. */
export const TOWER = { x: ISLE2.x - 10, y: ISLE2.y + 20, r: 26, h: 150 } as const;
/** Palms, as offsets would read: placed clear of the post, the tower and the landing. */
export const PALMS2: readonly [number, number][] = [
  at2(130, 40),
  at2(-150, -40),
  at2(30, 165),
  at2(-100, -150),
  at2(-170, 80),
];

/** Further out than this from island 2, nothing from home needs to know it is there. */
export function nearIsle2(x: number, y: number, pad: number): boolean {
  return Math.hypot(x - ISLE2.x, y - ISLE2.y) < ISLE2.r + pad;
}
