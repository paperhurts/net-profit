/**
 * Islands 8 and 9, the kid's, where the Heron lives: twin islands out in the far
 * deep off its east side, the side nothing else is on, straight across the map
 * from island 5. A sandbar joins them across the strait between, so the boat
 * ties up at island 8 and the figure walks over to island 9. Island 8 is the
 * nearer, with the dock facing home, a trading post by the landing and a tower
 * in its middle; island 9 is the Heron's own, darker, with dead trees and rocks
 * and a taller tower crowned with a great nest of sticks, where something huge
 * sits under a purple light. Reeds grow at both shores, as herons like. Both
 * towers stand barred for now. Everything is placed from each island's centre.
 */

import { DEEP, FAR, IY, type Point, WS } from './island';

/** Where the twins sit: midway out across the far deep, east of home. */
const CX = WS + DEEP + FAR / 2;
/** Island 8, the northern twin, and island 9, the southern. */
export const ISLE8 = { x: CX, y: IY - 330, r: 240 } as const;
export const ISLE9 = { x: CX, y: IY + 330, r: 240 } as const;

/** The sandbar across the strait: dry land the figure walks over and no hull crosses. */
export const BAR = {
  x0: CX - 22,
  x1: CX + 22,
  y0: ISLE8.y + ISLE8.r - 24,
  y1: ISLE9.y - ISLE9.r + 24,
} as const;

/** The way home from island 8, a unit vector: the dock and the landing face it. */
const HX = -1;
const HY = 0;

/** Entering this ring sells the hold, as the dock at home does. */
export const DOCK8 = {
  x: ISLE8.x + HX * (ISLE8.r + 100),
  y: ISLE8.y + HY * (ISLE8.r + 100),
  r: 125,
} as const;

/** The boat's berth for a hull of this scale: bow run up onto the sand, just outside what pushes a hull off. */
export function berth8(k: number): { x: number; y: number; h: number } {
  const d = ISLE8.r + 24 * k + 4;
  return { x: ISLE8.x + HX * d, y: ISLE8.y + HY * d, h: Math.atan2(-HY, -HX) };
}

/** Where the figure lands on the sand, off the bow. */
export const LANDING8 = {
  x: ISLE8.x + HX * (ISLE8.r - 22),
  y: ISLE8.y + HY * (ISLE8.r - 22),
} as const;

/** Points on each island, from an offset off its centre. */
export const at8 = (dx: number, dy: number): Point => [ISLE8.x + dx, ISLE8.y + dy];
export const at9 = (dx: number, dy: number): Point => [ISLE9.x + dx, ISLE9.y + dy];

/** Dry land stops this far in from the waterline, as on the other islands. */
export const SHORE8 = ISLE8.r - 12;

/** On either twin's sand, or on the sandbar between. */
export function onTwins(x: number, y: number): boolean {
  if (Math.hypot(x - ISLE8.x, y - ISLE8.y) <= SHORE8) return true;
  if (Math.hypot(x - ISLE9.x, y - ISLE9.y) <= SHORE8) return true;
  return x >= BAR.x0 + 6 && x <= BAR.x1 - 6 && y >= BAR.y0 && y <= BAR.y1;
}

/** Further out than this from the twins, nothing needs to know they are there. */
export function nearTwins(x: number, y: number, pad: number): boolean {
  return (
    Math.hypot(x - ISLE8.x, y - ISLE8.y) < ISLE8.r + pad ||
    Math.hypot(x - ISLE9.x, y - ISLE9.y) < ISLE9.r + pad
  );
}

/** The boat this near either twin sights them. */
export const SIGHT8 = 700;

/** The trading post on island 8, north of the way up from the landing. Fish sold here fly to it. */
export const POST8 = {
  x0: ISLE8.x - 176,
  y0: ISLE8.y - 118,
  x1: ISLE8.x - 120,
  y1: ISLE8.y - 74,
} as const;
export const POST8_MID = { x: (POST8.x0 + POST8.x1) / 2, y: (POST8.y0 + POST8.y1) / 2 } as const;

const D = Math.SQRT1_2;
/** Island 8's tower: its centre, radius and height, and the doorstep outside its door, toward the viewer. */
export const TOWER8 = { x: ISLE8.x + 30, y: ISLE8.y - 10, r: 28, h: 170 } as const;
export const DOOR8 = { x: TOWER8.x + 50 * D, y: TOWER8.y + 50 * D } as const;
/** Island 9's tower, the Heron's: wider and taller, with the nest on top. */
export const TOWER9 = { x: ISLE9.x + 10, y: ISLE9.y + 20, r: 34, h: 205 } as const;
export const DOOR9 = { x: TOWER9.x + 56 * D, y: TOWER9.y + 56 * D } as const;

/** Island 8's palms, clear of the post, the tower, the landing and the sandbar. */
export const PALMS8: readonly Point[] = [
  at8(-60, -170),
  at8(120, -150),
  at8(175, 60),
  at8(-150, 120),
  at8(60, 150),
];
/** Island 9's dead trees, and its rocks. */
export const SNAGS9: readonly Point[] = [
  at9(-140, -60),
  at9(150, -40),
  at9(-90, 140),
  at9(110, 150),
];
export const ROCKS9: readonly Point[] = [at9(-170, 50), at9(60, -150), at9(180, 80), at9(-40, 190)];

/** Clumps of reeds at the twins' shores, all round but where the boat lands and the sandbar meets them. */
export const REEDS8: readonly Point[] = (() => {
  const out: Point[] = [];
  for (const [isle, skip] of [
    [ISLE8, [Math.PI, Math.PI / 2]],
    [ISLE9, [-Math.PI / 2]],
  ] as const) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.2;
      if (skip.some((s) => Math.abs(Math.atan2(Math.sin(a - s), Math.cos(a - s))) < 0.35)) continue;
      out.push([isle.x + Math.cos(a) * (isle.r - 4), isle.y + Math.sin(a) * (isle.r - 4)]);
    }
  }
  return out;
})();

/** Something with a position and a speed that can be shoved: a hull is kept off both twins and the sandbar. */
export function pushOffTwins(s: { x: number; y: number; v: number }, pad: number): void {
  for (const isle of [ISLE8, ISLE9]) {
    const dx = s.x - isle.x;
    const dy = s.y - isle.y;
    const d = Math.hypot(dx, dy);
    const r = isle.r + pad;
    if (d < r && d > 0) {
      s.x = isle.x + (dx / d) * r;
      s.y = isle.y + (dy / d) * r;
      s.v *= 0.6;
    }
  }
  // The sandbar: out the nearer side.
  if (s.y > BAR.y0 && s.y < BAR.y1 && s.x > BAR.x0 - pad && s.x < BAR.x1 + pad) {
    s.x = s.x < CX ? BAR.x0 - pad : BAR.x1 + pad;
    s.v *= 0.6;
  }
}

/**
 * The Heron's hired men camp on both twins: on island 8 by its tower's door, round a fire between two
 * tents; on island 9 a smaller guard by the Heron's door, one tent and a fire.
 */
export const CAMP8 = { x: ISLE8.x + 95, y: ISLE8.y + 70 } as const;
export const CAMP9 = { x: ISLE9.x - 70, y: ISLE9.y + 70 } as const;
export const TENTS8: readonly Point[] = [at8(55, 95), at8(140, 100), at9(-115, 95)];
