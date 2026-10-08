/**
 * Island 4, in the south corner of the deep, the last empty one, nearest the
 * viewer. Until the kid's cutscene it is a plain little island nobody lands
 * on: sand, palms, rocks. Then an evil monkey on its beach summons a tar
 * monster out of the sea, the water round it turns black, and the island turns
 * to tar. No hull goes into the black water; going there will need a
 * chemistry suit, which is the next island's story. Everything is placed from
 * its centre, with the monster and the monkey on the side toward home.
 */

import { DEEP, type Point, WS } from './island';

export const ISLE4 = { x: WS + DEEP / 2, y: WS + DEEP / 2, r: 200 } as const;

/** Toward home from island 4, a unit vector. */
const HX = -Math.SQRT1_2;
const HY = -Math.SQRT1_2;

/** Once it is tar, the black water reaches this far from its centre, and no hull goes in. */
export const TAR_R = ISLE4.r + 240;

/** Where the tar monster rose, half out of the sea off the shore toward home. */
export const MONSTER = {
  x: ISLE4.x + HX * (ISLE4.r + 70),
  y: ISLE4.y + HY * (ISLE4.r + 70),
} as const;
/** Where the evil monkey stood on the beach to summon it. */
export const SUMMONER = {
  x: ISLE4.x + HX * (ISLE4.r - 30),
  y: ISLE4.y + HY * (ISLE4.r - 30),
} as const;

/** Its palms and rocks, as points. */
export const PALMS4: readonly Point[] = [
  [ISLE4.x + 40, ISLE4.y - 60],
  [ISLE4.x - 70, ISLE4.y + 30],
  [ISLE4.x + 90, ISLE4.y + 70],
  [ISLE4.x - 20, ISLE4.y + 120],
];
export const ROCKS4: readonly Point[] = [
  [ISLE4.x + 120, ISLE4.y - 20],
  [ISLE4.x - 110, ISLE4.y - 60],
  [ISLE4.x + 10, ISLE4.y + 40],
];

/** Further out than this from island 4, nothing needs to know it is there. */
export function nearIsle4(x: number, y: number, pad: number): boolean {
  return Math.hypot(x - ISLE4.x, y - ISLE4.y) < ISLE4.r + pad;
}
