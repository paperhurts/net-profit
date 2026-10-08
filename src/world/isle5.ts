/**
 * Island 5, the kid's, "like Jaws on the NES": a reef of bleached rock and
 * coral out in the far deep, past the far buoys, on the side of the map toward
 * the top left. Nobody lives on it. At its middle stands the throne of the
 * Skeleton Shark King, a seat of bones under a giant shark's jaw, and a fishing
 * boat that came too close lies wrecked on its rocks. Bone sharks circle it.
 * Hulls are kept off it; there is nowhere to land. Everything is placed from its
 * centre, with the jaw facing home.
 */

import { DEEP, FAR, IY, type Point } from './island';

export const ISLE5 = { x: -DEEP - FAR / 2, y: IY, r: 185 } as const;

/** Toward home from island 5, a unit vector: straight along +x. */
const HX = 1;
const HY = 0;

/** A point on island 5, from an offset off its centre. */
const at = (dx: number, dy: number): Point => [ISLE5.x + dx, ISLE5.y + dy];

/** The sand bar in the middle, bone white. */
export const BAR_R = 110;

/** The rocks round it, a broken ring, each with its radius. */
export const REEF: readonly (readonly [number, number, number])[] = Array.from(
  { length: 13 },
  (_, i) => {
    const a = (i / 13) * Math.PI * 2 + 0.2;
    const d = 128 + ((i * 37) % 5) * 8;
    return [ISLE5.x + Math.cos(a) * d, ISLE5.y + Math.sin(a) * d, 12 + ((i * 53) % 4) * 3] as const;
  },
);

/** The giant jaw, standing on the bar facing home, and the throne under it. */
export const JAW = { x: ISLE5.x + HX * 30, y: ISLE5.y + HY * 30, w: 46 } as const;
export const THRONE = { x: ISLE5.x - 6, y: ISLE5.y - 2 } as const;

/** The wreck on the rocks, on the side away from home, and which way its bow points. */
export const WRECK = { x: ISLE5.x - 150, y: ISLE5.y + 90, h: 2.2 } as const;

/** Bones on the sea floor round it, for the water's colour. */
export const BONES: readonly Point[] = [
  at(-240, -60),
  at(-200, 150),
  at(60, -230),
  at(210, 170),
  at(-60, 250),
  at(250, -120),
];

/** Bone sharks circle it this far out. */
export const CIRCLE_R = 300;

/** Within this of island 5 a boat sees it: a sighting. */
export const SIGHT5 = 900;

/** Further out than this from island 5, nothing needs to know it is there. */
export function nearIsle5(x: number, y: number, pad: number): boolean {
  return Math.hypot(x - ISLE5.x, y - ISLE5.y) < ISLE5.r + pad;
}
