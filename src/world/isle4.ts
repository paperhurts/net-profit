/**
 * Island 4, in the south corner of the deep, the last empty one, nearest the
 * viewer. Until the kid's cutscene it is a plain little island nobody lands
 * on: sand, palms, rocks. Then an evil monkey on its beach summons a tar
 * monster out of the sea, the water round it turns black, and the island turns
 * to tar. No hull goes into the black water. In the chemistry suit, the
 * kid's, the figure can: the boat stops wherever it meets the tar and ties up
 * there, bow in, and the figure steps off and swims through the black water to
 * the island, and walks it. Everything is placed from its centre, with the
 * monster and the monkey on the side toward home.
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

/** The walker keeps this far inside the tar's edge, and walks the sand this far inside the shore. */
export const TAR_IN = TAR_R - 12;
export const SAND4 = ISLE4.r - 12;
/** A boat this near the tar's edge, all but stopped, can be stepped off into it. */
export const TAR_STEP = 70;
export const TAR_STOP = 60;

/** Inside the tar's edge: the black water and the island in it, all of it ground for a suited figure. */
export function onIsle4(x: number, y: number): boolean {
  return Math.hypot(x - ISLE4.x, y - ISLE4.y) <= TAR_IN;
}

/** In the black water itself, off the sand: swimming. */
export function inTar(x: number, y: number): boolean {
  const d = Math.hypot(x - ISLE4.x, y - ISLE4.y);
  return d <= TAR_IN && d > SAND4;
}

/** A boat is up against the tar's edge, with this much hull. */
export function atTar(x: number, y: number, k: number): boolean {
  return Math.hypot(x - ISLE4.x, y - ISLE4.y) < TAR_R + 24 * k + TAR_STEP;
}

/**
 * The way into the tar at an angle round island 4: where a boat of a hull scale ties up, just outside
 * the black water and facing in, and where the figure lands in it off the bow.
 */
export function tarWay(a: number): {
  berth: (k: number) => { x: number; y: number; h: number };
  landing: { x: number; y: number };
} {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return {
    berth: (k) => {
      const d = TAR_R + 26 * k + 4;
      return { x: ISLE4.x + c * d, y: ISLE4.y + s * d, h: a + Math.PI };
    },
    landing: { x: ISLE4.x + c * (TAR_IN - 6), y: ISLE4.y + s * (TAR_IN - 6) },
  };
}
