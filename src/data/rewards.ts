/**
 * The Endless Isle's side rewards, the eleventh piece of the owner's plan (2026-10-23, taken as it stood): things to
 * wear, fly and show for fighting for a side, counted across that side's badges, three roles of three, nine in all;
 * and for the Ninja Slalom, a snow ninja's white outfit for gold on all three runs. This part: the outfits.
 */

import type { Side } from '../world/endless';
import { type Battles, badgeOf } from './battle';
import type { OutfitKind } from './look';
import { medalOf, RUN_ORDER, RUNS, type Slalom } from './slalom';

/** A side's outfit takes this many of its badges. */
export const OUTFIT_BADGES = 3;

/** The badges you have won for a side: a role's Badge I once you have fought in it, and each one after. */
export function sideBadges(b: Battles | undefined, side: Side): number {
  if (!b) return 0;
  return Object.values(b.marks[side]).reduce((n, m) => n + (m > 0 ? badgeOf(m) : 0), 0);
}

/** Gold on every run of the Ninja Slalom. */
export function allGold(s: Slalom | undefined): boolean {
  return RUN_ORDER.every((k) => {
    const t = s?.best[k];
    return t !== undefined && medalOf(RUNS[k], t) === 'gold';
  });
}

/** What the rewards are counted from: the endless save's battles and ski runs. */
export type Won = { battles?: Battles | undefined; slalom?: Slalom | undefined };

/** Whether an outfit has been won; your own clothes always are. */
export function outfitWon(k: OutfitKind, w: Won): boolean {
  if (k === 'captain') return sideBadges(w.battles, 'pirate') >= OUTFIT_BADGES;
  if (k === 'ninja') return sideBadges(w.battles, 'ninja') >= OUTFIT_BADGES;
  if (k === 'snow') return allGold(w.slalom);
  return true;
}

/** How each is won, in a few words. */
export const OUTFIT_HOW: Readonly<Record<Exclude<OutfitKind, 'none'>, string>> = {
  captain: `${OUTFIT_BADGES} pirate badges`,
  ninja: `${OUTFIT_BADGES} ninja badges`,
  snow: 'gold on all three ski runs',
};
/** Each, as it is announced. */
export const OUTFIT_NAME: Readonly<Record<Exclude<OutfitKind, 'none'>, string>> = {
  captain: "the captain's coat and tricorn",
  ninja: 'the ninja garb and mask',
  snow: "the snow ninja's whites",
};

/** The outfits won between two moments: to announce, and to put on. */
export function newOutfits(was: Won, now: Won): Exclude<OutfitKind, 'none'>[] {
  return (['captain', 'ninja', 'snow'] as const).filter(
    (k) => !outfitWon(k, was) && outfitWon(k, now),
  );
}

/** The next reward for fighting for a side, while there is one to win: how many badges, and what it is. */
export function nextReward(
  b: Battles | undefined,
  side: Side,
): { at: number; what: string; have: number } | null {
  const have = sideBadges(b, side);
  if (have >= OUTFIT_BADGES) return null;
  return { at: OUTFIT_BADGES, what: OUTFIT_NAME[side === 'pirate' ? 'captain' : 'ninja'], have };
}
