/**
 * Treasure in the trench, THE DEEP part three, the kid's: things lost down the
 * crack over the years, lying on its ledges and its floor in the dark. Each one
 * glints, so a diver can spot it from a way off even where nothing else shows,
 * and swimming up to one picks it up for coins: an old spyglass on a ledge in
 * the twilight, a gold crown, a ship's bell and a glowing gem down the walls in
 * the midnight water, and on the floor a treasure chest and a giant clam. Each
 * is found once, the chest left open and empty, except the clam, whose pearl
 * grows back every dawn, so the floor is worth coming back to.
 */

import { floorAt, type Plant, TW, wallIn } from './trench';

export type LootKind = 'spyglass' | 'crown' | 'bell' | 'gem' | 'clam' | 'chest';
/** A treasure: what it is, what the game calls it, where it lies, what it is worth, and what it lies on. */
export type Loot = {
  kind: LootKind;
  name: string;
  x: number;
  y: number;
  coins: number;
  on: 'floor' | -1 | 1;
};

/** How near the diver must come to pick one up. */
export const LOOT_REACH = 30;
/** What the giant clam's pearl is worth, every dawn. */
export const PEARL_COINS = 150;

/** On a ledge of the wall on one side, at a depth: just out from the rock. */
function onWall(kind: LootKind, name: string, y: number, side: -1 | 1, coins: number): Loot {
  const x = side < 0 ? wallIn(y, -1) + 6 : TW - wallIn(y, 1) - 6;
  return { kind, name, x, y, coins, on: side };
}

/** On the floor, at a place across it. */
function onFloor(kind: LootKind, name: string, x: number, coins: number): Loot {
  return { kind, name, x, y: floorAt(x) - 4, coins, on: 'floor' };
}

/** Everything lying in the trench, from the shallowest to the floor. */
export const TRENCH_LOOT: readonly Loot[] = [
  onWall('spyglass', 'an old spyglass', 700, 1, 200),
  onWall('crown', 'a gold crown', 1100, -1, 500),
  onWall('bell', "a ship's bell", 1250, 1, 250),
  onWall('gem', 'a glowing gem', 1320, -1, 400),
  onFloor('clam', 'a giant clam', 310, PEARL_COINS),
  onFloor('chest', 'a treasure chest', 450, 600),
];

/** The giant clam, the one that comes back. */
export const CLAM = TRENCH_LOOT.findIndex((l) => l.kind === 'clam');
/** How many are found once: all but the clam. */
export const LOOT_ONCE = TRENCH_LOOT.length - 1;
/** Every bit of the found mask that can be set. */
export const LOOT_ALL = ((1 << TRENCH_LOOT.length) - 1) & ~(1 << CLAM);

/** Whether treasure i has been found (the clam never is: its pearl comes and goes). */
export function taken(found: number, i: number): boolean {
  return i !== CLAM && (found & (1 << i)) !== 0;
}

/** How many of the found-once treasures have been found. */
export function foundCount(found: number): number {
  let n = 0;
  for (let i = 0; i < TRENCH_LOOT.length; i++) if (taken(found, i)) n++;
  return n;
}

/** The clam has a pearl in it if it was last opened before today (a new save's pearl is there). */
export function pearlReady(pearlDay: number, day: number): boolean {
  return day > pearlDay;
}

/** The plants, but none growing over a treasure, which would hide it. */
export function clearOfLoot(
  plants: readonly Plant[],
  loot: readonly Loot[] = TRENCH_LOOT,
): Plant[] {
  return plants.filter((p) => !loot.some((l) => Math.hypot(p.x - l.x, p.y - l.y) < 34));
}

/** The treasure in reach of the diver to pick up, if any: one not yet found, or the clam with a pearl in it. */
export function lootNear(
  loot: readonly Loot[],
  found: number,
  x: number,
  y: number,
  pearl: boolean,
): number | null {
  let best: number | null = null;
  let bd = LOOT_REACH;
  loot.forEach((l, i) => {
    if (l.kind === 'clam' ? !pearl : taken(found, i)) return;
    const d = Math.hypot(l.x - x, l.y - y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}
