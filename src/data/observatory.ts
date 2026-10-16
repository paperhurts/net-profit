/**
 * The observatory at your headquarters, the kid's ("observatories where every leviathan can be spotted"; asked whether
 * it is looked through or puts them on the map: "both"). A telescope in Gigantis's courtyard looks at each leviathan in
 * turn, live, wherever it is, and once Gigantis is yours every one of them shows on the sea map. Which beasts, in the
 * order the telescope turns to them, by what names; and how the telescope says where one is.
 */

import { pastBuoys, pastFar, pastFarFar } from '../world/island';

export const LEVIATHANS = [
  { k: 'guard', name: 'The leviathan at the buoys', short: 'Leviathan' },
  { k: 'cthulu', name: 'The Cthuluviathan', short: 'Cthuluviathan' },
  { k: 'angler', name: 'The anglerfish', short: 'Anglerfish' },
  { k: 'gulper', name: 'The gulper', short: 'Gulper' },
  { k: 'king', name: 'The Skeleton Shark King', short: 'Shark King' },
  { k: 'reaper', name: 'The Reaper', short: 'Reaper' },
  { k: 'meteor', name: 'Star, the meteor serpent', short: 'Star' },
  { k: 'deep', name: 'The Deep One', short: 'Deep One' },
] as const;
export type LeviathanKind = (typeof LEVIATHANS)[number]['k'];

/** Where the telescope stands in the courtyard, from the courtyard's middle: to the right, clear of the flagpole,
 * the gate, the stairs and the portal. How near it the figure must be to look through it. */
export const SCOPE_AT = { dx: 80, dy: -5 } as const;
export const SCOPE_REACH = 40;
/** How fast the telescope swings from one to the next, and how big its lens is on the screen. */
export const SCOPE_SWING = 2.6;
export const LENS = 0.44;

/** Which part of the sea a point is in, as the telescope says it. */
export function seaZone(x: number, y: number): string {
  if (!pastBuoys(x, y)) return 'in home water';
  if (pastFarFar(x, y)) return 'in the far far sea';
  if (pastFar(x, y)) return 'in the far deep';
  return 'out in the deep';
}

/** The next one along, or back, round the list of those that can be seen. */
export function nextSeen(i: number, step: 1 | -1, n: number): number {
  return n <= 0 ? 0 : (((i + step) % n) + n) % n;
}
