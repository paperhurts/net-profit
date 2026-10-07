/**
 * The boat's health, out in the deep. It only goes down past the buoys, where
 * the leviathans are; home water mends it and a dock makes it good. At none,
 * whatever did it swallows the boat, and the game spits it out in the home
 * shallows without its catch: never coins, never upgrades, never the boat.
 */

export const HP_MAX = 100;
/** What each thing that bites takes. The anglerfish needs no number: it swallows the boat whole. */
export const HURT = { leviathan: 30, tentacle: 20, gulper: 34 } as const;
/** Health a second mended inside the buoys. */
export const MEND = 15;
/** Seconds inside whatever swallowed the boat before it is spat out. */
export const SWALLOW = 1.6;
/** Seconds for the view to open again once it has been spat out. */
export const SPIT = 0.7;

/** Health after a hit, never below none. */
export function hurt(hp: number, n: number): number {
  return Math.max(0, hp - n);
}

/** Health after dt seconds: made good at a dock, mended in home water, left alone in the deep. */
export function mend(hp: number, dt: number, home: boolean, docked: boolean): number {
  if (docked) return HP_MAX;
  return home ? Math.min(HP_MAX, hp + MEND * dt) : hp;
}
