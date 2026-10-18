/**
 * Your fish at your headquarters, the kid's ("you keep things there": fish among them). In the first hall of
 * Gigantis, in front of its left window, a tall wooden board stands with a framed place for every kind of fish in the
 * sea, filled in its own colours once you have caught one and dark until then: the field guide on a wall. Look at it
 * and the field guide opens.
 */

/** Where the board stands, from the hall's middle, and how far it runs either side along its face, toward you. */
export const FISH_WALL_AT = { dx: -95, dy: 0 } as const;
export const FISH_WALL_HALF = 48;
/** Its places: this many across, each row this high up the board from the bottom one. */
export const FISH_COLS = 6;
export const FISH_Z0 = 16;
export const FISH_ROW = 15;
/** How near it to look at it, standing in front of it. */
export const FISH_WALL_REACH = 40;

/** A place on the board, the i-th kind of fish: across it from -1 (left) to 1 (right), and its height. */
export function fishSlot(i: number, rows: number): { u: number; z: number } {
  const col = i % FISH_COLS;
  const row = Math.floor(i / FISH_COLS);
  return {
    u: -1 + (2 * (col + 0.5)) / FISH_COLS,
    z: FISH_Z0 + (rows - 1 - row) * FISH_ROW,
  };
}

/** How many rows the board has for so many kinds. */
export function fishRows(kinds: number): number {
  return Math.ceil(kinds / FISH_COLS);
}

/** Where to stand to look at it: just in front, toward the viewer. */
export function fishWallFront(): { dx: number; dy: number } {
  return { dx: FISH_WALL_AT.dx + 18, dy: FISH_WALL_AT.dy + 18 };
}
