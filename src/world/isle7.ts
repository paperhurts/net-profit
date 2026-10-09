/**
 * Island 7, the kid's last island before Gigantis: out in the far deep off its
 * bottom-left side, straight down the map from home. In his words, the same
 * monkeys and the same leviathan sorcerer as island 2, but with an alien
 * portal. So it is island 2 again, a little bigger: a beach toward home where
 * the boat runs up onto the sand, a trading post beside it, a monkey camp on
 * the far side, a tower in the middle with the sorcerer on its roof, and on the
 * side toward the viewer a ring of alien metal standing on a scorched patch of
 * grass. The portal is dead until the sorcerer is beaten; the Skeleton Shark
 * King knew of it, and died before he could say. Everything is placed from its
 * centre, and its dock faces home, the side a boat arrives from.
 */

import { DEEP, FAR, IX, type Point, WS } from './island';

/** Its centre and radius. */
export const ISLE7 = { x: IX, y: WS + DEEP + FAR / 2, r: 300 } as const;

/** The way home from island 7, a unit vector: the dock and the landing face it. */
const HX = 0;
const HY = -1;

/** Entering this ring sells the hold, as the dock at home does. */
export const DOCK7 = {
  x: ISLE7.x + HX * (ISLE7.r + 100),
  y: ISLE7.y + HY * (ISLE7.r + 100),
  r: 125,
} as const;

/** The boat's berth for a hull of this scale: bow run up onto the sand, just outside what pushes a hull off. */
export function berth7(k: number): { x: number; y: number; h: number } {
  const d = ISLE7.r + 24 * k + 4;
  return { x: ISLE7.x + HX * d, y: ISLE7.y + HY * d, h: Math.atan2(-HY, -HX) };
}

/** Where the figure lands on the sand, off the bow. */
export const LANDING7 = {
  x: ISLE7.x + HX * (ISLE7.r - 22),
  y: ISLE7.y + HY * (ISLE7.r - 22),
} as const;

/** A point on island 7, from an offset off its centre. */
export const at7 = (dx: number, dy: number): Point => [ISLE7.x + dx, ISLE7.y + dy];

/** Dry land stops this far in from the waterline, as on island 2. */
export const SHORE7 = ISLE7.r - 12;

/** On island 7's sand. */
export function onIsle7(x: number, y: number): boolean {
  return Math.hypot(x - ISLE7.x, y - ISLE7.y) <= SHORE7;
}

/** Further out than this from island 7, nothing needs to know it is there. */
export function nearIsle7(x: number, y: number, pad: number): boolean {
  return Math.hypot(x - ISLE7.x, y - ISLE7.y) < ISLE7.r + pad;
}

/** The boat this near sights it. */
export const SIGHT7 = 700;

/** The trading post: a footprint, to the east of the way up from the landing. Fish sold here fly to it. */
export const POST7 = {
  x0: ISLE7.x + 52,
  y0: ISLE7.y - 204,
  x1: ISLE7.x + 108,
  y1: ISLE7.y - 160,
} as const;
export const POST7_MID = { x: (POST7.x0 + POST7.x1) / 2, y: (POST7.y0 + POST7.y1) / 2 } as const;

/** The tower in the middle: its centre, radius and height. Taller than island 2's. */
export const TOWER7 = { x: ISLE7.x, y: ISLE7.y, r: 30, h: 176 } as const;
const D = Math.SQRT1_2;
/** The doorstep outside its door, on its face toward the viewer. */
export const DOOR7 = { x: TOWER7.x + 52 * D, y: TOWER7.y + 52 * D } as const;

/** The monkey camp, on the far side of the island from the landing, west of south. */
export const CAMP7 = { x: ISLE7.x - 70, y: ISLE7.y + 170 } as const;
/** Its three huts, round the fire. */
export const HUTS7: readonly Point[] = [
  [CAMP7.x - 50, CAMP7.y - 14],
  [CAMP7.x + 16, CAMP7.y + 50],
  [CAMP7.x - 36, CAMP7.y + 42],
];
/** The fire in the middle, the totem and the chest that opens when the camp is beaten. */
export const FIRE7 = { x: CAMP7.x, y: CAMP7.y } as const;
export const TOTEM7 = { x: CAMP7.x + 30, y: CAMP7.y - 20 } as const;
export const CHEST7 = { x: CAMP7.x - 14, y: CAMP7.y + 12 } as const;

/**
 * The alien portal: a ring of strange metal standing upright on three feet, facing the viewer, on the
 * island's side toward the viewer. Its middle, the ring's radius, and the scorched grass round it.
 */
export const PORTAL7 = { x: ISLE7.x + 150, y: ISLE7.y + 95, r: 42 } as const;
export const SCORCH7 = 72;
/** Its feet stand along the ring's width, which runs across the screen: along (1, -1) in the world. */
export const PORTAL_FEET: readonly Point[] = [-1, 1].map(
  (s): Point => [PORTAL7.x + s * PORTAL7.r * D, PORTAL7.y - s * PORTAL7.r * D],
);

/** Palms, clear of the post, the tower, the camp, the portal and the way up from the landing. */
export const PALMS7: readonly Point[] = [
  at7(-150, -150),
  at7(170, -90),
  at7(-225, -20),
  at7(215, 40),
  at7(60, 240),
  at7(-205, 120),
  at7(-80, -235),
];

/** Something with a position and a speed that can be shoved: a hull is kept off the sand. */
export function pushOffIsle7(s: { x: number; y: number; v: number }, pad: number): void {
  const dx = s.x - ISLE7.x;
  const dy = s.y - ISLE7.y;
  const d = Math.hypot(dx, dy);
  const r = ISLE7.r + pad;
  if (d < r && d > 0) {
    s.x = ISLE7.x + (dx / d) * r;
    s.y = ISLE7.y + (dy / d) * r;
    s.v *= 0.6;
  }
}
