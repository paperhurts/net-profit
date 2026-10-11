/**
 * The ice floe, the owner's call for the kid's ice fishing: a sheet of old sea
 * ice drifted into the far deep's north-west corner, with a hole cut in it and
 * seals hauled out on it, little chunks of it floating round. Bring the boat
 * alongside, all but stopped, with the Reaper's ice fishing kit, and the fisher
 * drops a line through the hole (fishing/icefish.ts).
 */

import { DEEP, FAR } from './island';

/** Where it lies, and its size: its shore wanders a little either side of r. */
export const ICE_FLOE = { x: -DEEP - FAR * 0.58, y: -DEEP - FAR * 0.58, r: 240 } as const;

/** Its shore, this far from its middle at an angle round it. */
export function floeR(a: number): number {
  return ICE_FLOE.r * (1 + 0.08 * Math.sin(3 * a + 1) + 0.05 * Math.sin(7 * a + 2));
}

/** The farthest its shore reaches: what keeps a hull off it. */
export const FLOE_MAX = ICE_FLOE.r * 1.13;

/** A boat this close to its shore can fish through the ice. */
export const FLOE_REACH = 150;

/** Whether a boat here is alongside the floe, close enough to fish it. */
export function alongsideFloe(x: number, y: number): boolean {
  const d = Math.hypot(x - ICE_FLOE.x, y - ICE_FLOE.y);
  return d < floeR(Math.atan2(y - ICE_FLOE.y, x - ICE_FLOE.x)) + FLOE_REACH;
}

/** Its shore, as points round it. */
export function floeOutline(n = 40): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = floeR(a);
    return { x: ICE_FLOE.x + Math.cos(a) * r, y: ICE_FLOE.y + Math.sin(a) * r };
  });
}

/** The hole cut in it, on the side toward home. */
export const ICE_HOLE = {
  x: ICE_FLOE.x + ICE_FLOE.r * 0.32,
  y: ICE_FLOE.y + ICE_FLOE.r * 0.32,
  r: 16,
} as const;

/** Two seals hauled out on it, at an angle each. */
export const SEALS: readonly { x: number; y: number; a: number }[] = [
  { x: ICE_FLOE.x - ICE_FLOE.r * 0.35, y: ICE_FLOE.y - ICE_FLOE.r * 0.1, a: 0.4 },
  { x: ICE_FLOE.x + ICE_FLOE.r * 0.05, y: ICE_FLOE.y - ICE_FLOE.r * 0.45, a: 2.6 },
];

/** Little chunks of it floating round, at their size and turn. */
export const ICE_CHUNKS: readonly { x: number; y: number; r: number; a: number }[] = Array.from(
  { length: 14 },
  (_, i) => {
    const a = i * 2.39996 + 0.7;
    const d = FLOE_MAX + 40 + ((i * 53) % 230);
    return {
      x: ICE_FLOE.x + Math.cos(a) * d,
      y: ICE_FLOE.y + Math.sin(a) * d,
      r: 10 + ((i * 7) % 14),
      a: i * 1.3,
    };
  },
);
