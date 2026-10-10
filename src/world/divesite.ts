/**
 * A place to dive, side on: how wide and deep its scene is, where the diver
 * goes in under the boat, and how its water is kept to (walls, floor, and
 * anything solid in it). The trench in the deep is one; the wreck off island
 * 5 is the other (world/wreck.ts).
 */

import { ENTRY, inWater, keepInWater, TD, TW } from './trench';

export type DiveSiteId = 'trench' | 'wreck';

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
