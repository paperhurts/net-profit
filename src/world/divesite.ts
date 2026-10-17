/**
 * A place to dive, side on: how wide and deep its scene is, where the diver
 * goes in under the boat, and how its water is kept to (walls, floor, and
 * anything solid in it). The trench in the deep is one; the wreck off island
 * 5 is another (world/wreck.ts), under the ice floe the third
 * (world/icedive.ts), the submarine's patches of the far deep the rest (world/subsea.ts), island 11's black lagoon,
 * dived from its bank (world/lagoondive.ts), and the abyss past the white buoys, gone down in a cage (world/abyss.ts).
 */

import { ENTRY, inWater, keepInWater, TD, TW } from './trench';

export type DiveSiteId = 'trench' | 'wreck' | 'ice' | 'sub' | 'lagoon' | 'abyss';

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
  /** Dived from a bank ashore, not from the boat: no hull overhead. */
  bank?: boolean;
  /** Gone down in a cage on the boat's rope, which rests on the floor with its middle this deep (the abyss's). */
  cage?: number;
  /** Its depth told in metres, this many scene units to one, rather than in the trench's plain units. */
  metres?: number;
  /** How far past its floor the view may go, so the floor sits up the screen, clear of the buttons (40 unless said). */
  below?: number;
  /**
   * Its own water, for a site that is not the open sea's: its colour at a depth, how dark round the lamp, the colour
   * over the surface, and the specks drifting in it; no sun shafts unless it says.
   */
  look?: {
    water: (y: number) => string;
    dark: (y: number) => number;
    sky: string;
    snow: string;
    /** Sun shafts down from the surface after all: the abyss's top is the open sea's sunlit water. */
    shafts?: boolean;
  };
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
