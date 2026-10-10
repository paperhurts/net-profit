/**
 * Crab pots, the husband's "drop, leave, return", opened by the crab shed on
 * island 3's base raft. The boat carries three. Dropped anywhere in home water
 * (never past the buoys: the owner's rule, "no crab traps in the deep"), a pot
 * sits on the bottom under a little buoy and spider crabs climb in for the bait,
 * one at a time, until it is full; pots further from home fill faster, which is
 * the route to plan. Come back past a pot and its crabs are hauled into the
 * hold, and it is baited and left to fill again; stop by it and lift it to move
 * it somewhere else.
 */

import { BEACH, BRIDGE_BUMPS, DOCK, IR, IX, IY, pastBuoys } from '../world/island';

/** Pots the crab shed gives the boat, and the most crabs one holds. */
export const POTS = 3;
export const POT_MAX = 6;
/** Seconds between crabs: near home, and at the buoys; between, by how far out. */
export const POT_SLOW = 60;
export const POT_FAST = 25;
/** How far from home's centre that runs between: the first ring, and well out toward the buoys. */
const NEAR = 600;
const FAR_OUT = 2200;
/** The boat this near a pot hauls its crabs, or with the button lifts it. */
export const POT_REACH = 55;
/** Pots keep this far apart, and this far off the island and the beach. */
export const POT_GAP = 90;
export const POT_SHORE = 170;

export type Pot = { x: number; y: number; crabs: number; t: number };

/** Why a pot may not go here, or null when it may. */
export type PotRefusal = 'deep' | 'shore' | 'dock' | 'near';

/** Seconds between crabs for a pot this far from home's centre. */
export function potEvery(d: number): number {
  const k = Math.max(0, Math.min(1, (d - NEAR) / (FAR_OUT - NEAR)));
  return POT_SLOW + (POT_FAST - POT_SLOW) * k;
}

/** Whether a pot may be dropped at (x, y), with the others where they are. */
export function canDrop(pots: readonly Pot[], x: number, y: number): PotRefusal | null {
  if (pastBuoys(x, y)) return 'deep';
  if (Math.hypot(x - IX, y - IY) < IR + POT_SHORE) return 'shore';
  if (Math.hypot(x - BEACH.x, y - BEACH.y) < BEACH.r + POT_SHORE * 0.6) return 'shore';
  for (const b of BRIDGE_BUMPS) if (Math.hypot(x - b[0], y - b[1]) < 60) return 'shore';
  if (Math.hypot(x - DOCK.x, y - DOCK.y) < DOCK.r) return 'dock';
  for (const p of pots) if (Math.hypot(x - p.x, y - p.y) < POT_GAP) return 'near';
  return null;
}

/** Crabs climb in: each pot gains one every potEvery seconds, until it is full. */
export function fillPots(pots: readonly Pot[], dt: number): void {
  for (const p of pots) {
    if (p.crabs >= POT_MAX) {
      p.t = 0;
      continue;
    }
    p.t += dt;
    const every = potEvery(Math.hypot(p.x - IX, p.y - IY));
    while (p.t >= every && p.crabs < POT_MAX) {
      p.t -= every;
      p.crabs++;
    }
    if (p.crabs >= POT_MAX) p.t = 0;
  }
}

/** The nearest pot within reach of (x, y), or null. */
export function potNear(pots: readonly Pot[], x: number, y: number, reach = POT_REACH): Pot | null {
  let best: Pot | null = null;
  let bd = reach;
  for (const p of pots) {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bd) {
      best = p;
      bd = d;
    }
  }
  return best;
}

/** The pots from a save: at most POTS, each in home water, its crabs and time within bounds. */
export function parsePots(o: unknown): Pot[] {
  if (!Array.isArray(o)) return [];
  const out: Pot[] = [];
  for (const v of o) {
    if (out.length >= POTS || !v || typeof v !== 'object') continue;
    const r = v as Record<string, unknown>;
    const x = Number(r.x);
    const y = Number(r.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || pastBuoys(x, y)) continue;
    const crabs = Number(r.crabs);
    const t = Number(r.t);
    out.push({
      x,
      y,
      crabs: Number.isFinite(crabs) ? Math.max(0, Math.min(POT_MAX, Math.floor(crabs))) : 0,
      t: Number.isFinite(t) ? Math.max(0, Math.min(POT_SLOW, t)) : 0,
    });
  }
  return out;
}
