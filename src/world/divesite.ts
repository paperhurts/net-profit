/**
 * A place to dive, side on: how wide and deep its scene is, where the diver
 * goes in under the boat, and how its water is kept to (walls, floor, and
 * anything solid in it). The trench in the deep is one; the wreck off island
 * 5 is another (world/wreck.ts), under the ice floe the third
 * (world/icedive.ts), and the submarine's patches of the far deep the rest (world/subsea.ts).
 */

import { ENTRY, inWater, keepInWater, TD, TW } from './trench';

export type DiveSiteId = 'trench' | 'wreck' | 'ice' | 'sub';

export type DiveSite = {
  id: DiveSiteId;
  /** The scene's width and the depth of its floor. */
  w: number;
  d: number;
  /** Where the diver goes in, across the scene, under the boat. */
  entry: number;
  /** How much of the scene shows across the screen: a shallow site is seen closer. */
  view: number;
  /** Push a point back into the water, this much room round it. */
  keep(p: { x: number; y: number }, pad: number): void;
  /** Whether a point is in the water, with this much room round it. */
  inWater(x: number, y: number, pad?: number): boolean;
  /** A roof of ice overhead: the only way up is where the diver went in, and a rope back to it. */
  ceiling?: boolean;
  /** A sea floor across it, for a site that is open water down to the bottom (the submarine's). */
  floor?: (x: number) => number;
};

export const TRENCH_SITE: DiveSite = {
  id: 'trench',
  w: TW,
  d: TD,
  entry: ENTRY,
  view: 420,
  keep: keepInWater,
  inWater,
};
