/**
 * The mermaids' rocks, the owner's (2026-10-22: "Let's start mermaids", a surprise for the kid): a little arc of
 * rocks in the shallows off island 2's far shore, the side away from home, between two of its parrotfish schools.
 * Three of them are big and flat-topped, and from dusk until midnight a mermaid sits on each, singing; the rest are
 * small, wet and weedy. Boats go round them, never through.
 *
 * The sirens are to come on the same rocks after midnight, the kid's to design once he has found the mermaids.
 */

import { DAY_END, DUSK_END } from './daycycle';
import { ISLE2 } from './isle2';

/** A rock: where, how wide and how tall; a seat has a mermaid on it in her hours. */
export type Rock = { x: number; y: number; r: number; h: number; seat: boolean };

/** The way round island 2 to the rocks (world radians), and how far out from its middle. */
const AROUND = (80 * Math.PI) / 180;
const OUT = 375;

/** The middle of the rocks, and how far they spread round it. */
export const MER_ROCKS = {
  x: ISLE2.x + Math.cos(AROUND) * OUT,
  y: ISLE2.y + Math.sin(AROUND) * OUT,
  r: 110,
} as const;

/** Each rock as degrees round island 2 from the middle one, a step further out or in, its width and its height. */
const LAYOUT: readonly [deg: number, out: number, r: number, h: number, seat: boolean][] = [
  [-16, 40, 11, 6, false],
  [-12, 10, 28, 18, true],
  [-7, -22, 12, 7, false],
  [0, 30, 32, 24, true],
  [5, -12, 14, 8, false],
  [12, 8, 27, 17, true],
  [17, 36, 10, 5, false],
];

export const ROCKS: readonly Rock[] = LAYOUT.map(([deg, out, r, h, seat]) => {
  const a = AROUND + (deg * Math.PI) / 180;
  const d = OUT + out;
  return { x: ISLE2.x + Math.cos(a) * d, y: ISLE2.y + Math.sin(a) * d, r, h, seat };
});

/** The rocks with a seat on them, in order: the first mermaid's, the second's, the third's. */
export const SEATS: readonly Rock[] = ROCKS.filter((r) => r.seat);

/** Midnight on the day's clock: halfway through the night. */
export const MIDNIGHT = DUSK_END + (1 - DUSK_END) / 2;

/** The mermaids are out on their rocks from the start of dusk until midnight. */
export function merHours(clock: number): boolean {
  return clock >= DAY_END && clock < MIDNIGHT;
}

/** Near enough the rocks that nothing from elsewhere needs to know they are there. */
export function nearMerRocks(x: number, y: number, pad: number): boolean {
  return Math.hypot(x - MER_ROCKS.x, y - MER_ROCKS.y) < MER_ROCKS.r + pad;
}
