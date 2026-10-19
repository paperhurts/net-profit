/**
 * Inside Skrill's tower on Skull Island (world/tower.ts SKULL_FLOORS), the kid's ("5 flores and displaseres are
 * EVRYWHARE"): who holds each of its four floors. Skrill's men stand guard either side of the stairs at the back, and
 * his displacer beasts prowl the rest; one floor is all beasts. Each from the middle of its room. Beat everyone on a
 * floor and its stairs open; at the top of the last, Skrill's own door is shut fast.
 */

import type { Point } from './island';
import { ROOMS, type Room, SKULL_FLOORS } from './tower';

export type SkullHold = {
  /** Where his men stand guard, and where his beasts have their dens. */
  men: readonly [number, number][];
  beasts: readonly [number, number][];
};

export const SKULL_HOLD: readonly SkullHold[] = [
  // The first floor: two of his men by the stairs, and a beast.
  {
    men: [
      [-60, -25],
      [-25, -60],
    ],
    beasts: [[55, -50]],
  },
  // The second: all beasts.
  {
    men: [],
    beasts: [
      [-80, 5],
      [5, -80],
      [60, -45],
    ],
  },
  // The third: two men, two beasts.
  {
    men: [
      [-65, -20],
      [-20, -65],
    ],
    beasts: [
      [60, -40],
      [-40, 60],
    ],
  },
  // The last, under Skrill's own room: two men, three beasts.
  {
    men: [
      [-65, -20],
      [-20, -65],
    ],
    beasts: [
      [60, -40],
      [-40, 60],
      [-95, 10],
    ],
  },
];

/** Which of the tower's floors room i is, 0 to 3, or -1. */
export function skullFloor(i: number): number {
  return SKULL_FLOORS.indexOf(i);
}

const at = (k: number, list: readonly [number, number][]): Point[] => {
  const r = ROOMS[SKULL_FLOORS[k] as number] as Room;
  return list.map(([dx, dy]) => [r.x + dx, r.y + dy]);
};
/** Where his men stand on floor k, and where his beasts' dens are, in the world. */
export function skullMenAt(k: number): Point[] {
  return at(k, (SKULL_HOLD[k] as SkullHold).men);
}
export function skullBeastsAt(k: number): Point[] {
  return at(k, (SKULL_HOLD[k] as SkullHold).beasts);
}
