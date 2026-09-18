/**
 * The vendors on the island, which the last two palace stages open. The
 * fishmonger (the watchtower) pays double for one species a day, picked at
 * dawn from what the boat can reach; the smokehouse (the palace dome) pays
 * half again for the oily fish: tuna, goldfin and shark. Both stack with the
 * palace's own bonus. They are what stages 4 and 5 were missing: past stage
 * 3 the base grew nothing, so the palace trailed the boat by construction,
 * and the endgame had no reason to choose one school over another.
 */

/** The stage that opens each vendor. */
export const FISHMONGER_STAGE = 4;
export const SMOKEHOUSE_STAGE = 5;
/** What each vendor pays, as a multiple of the dock. */
export const FISHMONGER_BONUS = 2;
export const SMOKEHOUSE_BONUS = 1.5;
/** Species the smokehouse takes: tuna, goldfin and shark. */
export const SMOKED: readonly number[] = [4, 5, 7];
/** The fishmonger's pick when there is none: he is closed, or has not asked yet. */
export const NO_PICK = -1;
/** Each palace stage adds this much to every sale. */
export const STAGE_BONUS = 0.15;

export type Vendors = { fishmonger: boolean; smokehouse: boolean };
export type Buyer = 'fishmonger' | 'smokehouse' | 'dock';

export function vendorsOpen(build: number): Vendors {
  return { fishmonger: build >= FISHMONGER_STAGE, smokehouse: build >= SMOKEHOUSE_STAGE };
}

/** Who takes this fish: the fishmonger if it is his pick, else the smokehouse if it is oily, else the dock. */
export function buyer(build: number, sp: number, pick: number): Buyer {
  const v = vendorsOpen(build);
  if (v.fishmonger && pick !== NO_PICK && sp === pick) return 'fishmonger';
  if (v.smokehouse && SMOKED.includes(sp)) return 'smokehouse';
  return 'dock';
}

/** What one fish fetches: its value, the palace bonus, then every vendor that wants it. */
export function salePrice(base: number, build: number, sp: number, pick: number): number {
  const v = vendorsOpen(build);
  let m = 1 + STAGE_BONUS * build;
  if (v.fishmonger && pick !== NO_PICK && sp === pick) m *= FISHMONGER_BONUS;
  if (v.smokehouse && SMOKED.includes(sp)) m *= SMOKEHOUSE_BONUS;
  return base * m;
}

/**
 * The fishmonger's pick for the day: a species from 0 to top, leaning deeper
 * (the better of two draws), and never yesterday's while there is a choice.
 * The same lean the standing orders use.
 */
export function pickMarket(top: number, prev: number, rng: () => number): number {
  let sp = Math.max(Math.floor(rng() * (top + 1)), Math.floor(rng() * (top + 1)));
  if (sp === prev && top > 0) sp = (sp + 1) % (top + 1);
  return sp;
}
