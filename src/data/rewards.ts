/**
 * The Endless Isle's side rewards, the eleventh piece of the owner's plan (2026-10-23, taken as it stood): things to
 * wear, fly and show for fighting for a side, counted across that side's badges, three roles of three, nine in all;
 * and for the Ninja Slalom, a snow ninja's white outfit for gold on all three runs. A side's outfit at 3 of its badges,
 * its flag for the boat at 6, and its hull paint at all 9.
 */

import type { Side } from '../world/endless';
import { type Battles, badgeOf } from './battle';
import { EMBLEMS, type Flag } from './flag';
import type { OutfitKind } from './look';
import { medalOf, RUN_ORDER, RUNS, type Slalom } from './slalom';

/** A side's outfit takes this many of its badges, its flag this many, and its paint all of them. */
export const OUTFIT_BADGES = 3;
export const FLAG_BADGES = 6;
export const ALL_BADGES = 9;

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

/** The flags won for the boat: the pirates' Jolly Roger, a skull and crossbones on black, and the ninjas' banner, a
 * throwing star on navy. Their emblems are each side's, to put on any flag once won. */
export type WonFlag = 'jolly' | 'banner';
export const WON_FLAGS: Readonly<
  Record<WonFlag, { side: Side; name: string; emblem: (typeof EMBLEMS)[number]; flag: Flag }>
> = {
  jolly: {
    side: 'pirate',
    name: 'the Jolly Roger',
    emblem: 'jolly',
    flag: { field: 8, accent: 2, pattern: 0, emblem: EMBLEMS.indexOf('jolly') },
  },
  banner: {
    side: 'ninja',
    name: 'the ninja banner',
    emblem: 'shuriken',
    flag: { field: 3, accent: 2, pattern: 0, emblem: EMBLEMS.indexOf('shuriken') },
  },
};
export function flagWon(k: WonFlag, w: Won): boolean {
  return sideBadges(w.battles, WON_FLAGS[k].side) >= FLAG_BADGES;
}
/** Whether an emblem can go on your flag: every one but the two won on the Endless Isle, and those once won. */
export function emblemWon(i: number, w: Won): boolean {
  const e = EMBLEMS[i];
  if (e === 'jolly') return flagWon('jolly', w);
  if (e === 'shuriken') return flagWon('banner', w);
  return e !== undefined;
}

/** The two hull paints, for all of a side's badges, by their place in the paints (data/tuning.ts). */
export type WonPaint = 'lord' | 'master';
export const WON_PAINTS: Readonly<Record<WonPaint, { side: Side; name: string }>> = {
  lord: { side: 'pirate', name: 'the Pirate Lord hull paint, black and red' },
  master: { side: 'ninja', name: 'the Grand Master hull paint, midnight blue and silver' },
};
export function paintWon(k: WonPaint, w: Won): boolean {
  return sideBadges(w.battles, WON_PAINTS[k].side) >= ALL_BADGES;
}

/** A reward of either kind, as it is announced. */
export type Reward =
  | { kind: 'outfit'; key: Exclude<OutfitKind, 'none'> }
  | { kind: 'flag'; key: WonFlag }
  | { kind: 'paint'; key: WonPaint };
export function rewardName(r: Reward): string {
  if (r.kind === 'outfit') return OUTFIT_NAME[r.key];
  if (r.kind === 'flag') return WON_FLAGS[r.key].name;
  return WON_PAINTS[r.key].name;
}
/** Every reward won between two moments, outfits first. */
export function newRewards(was: Won, now: Won): Reward[] {
  const out: Reward[] = newOutfits(was, now).map((key) => ({ kind: 'outfit', key }) as const);
  for (const key of ['jolly', 'banner'] as const)
    if (!flagWon(key, was) && flagWon(key, now)) out.push({ kind: 'flag', key });
  for (const key of ['lord', 'master'] as const)
    if (!paintWon(key, was) && paintWon(key, now)) out.push({ kind: 'paint', key });
  return out;
}

/** A side's rewards for its badges, in the order they come. */
const LADDER: Readonly<Record<Side, readonly { at: number; r: Reward }[]>> = {
  pirate: [
    { at: OUTFIT_BADGES, r: { kind: 'outfit', key: 'captain' } },
    { at: FLAG_BADGES, r: { kind: 'flag', key: 'jolly' } },
    { at: ALL_BADGES, r: { kind: 'paint', key: 'lord' } },
  ],
  ninja: [
    { at: OUTFIT_BADGES, r: { kind: 'outfit', key: 'ninja' } },
    { at: FLAG_BADGES, r: { kind: 'flag', key: 'banner' } },
    { at: ALL_BADGES, r: { kind: 'paint', key: 'master' } },
  ],
};

/** The next reward for fighting for a side, while there is one to win: how many badges, and what it is. */
export function nextReward(
  b: Battles | undefined,
  side: Side,
): { at: number; what: string; have: number } | null {
  const have = sideBadges(b, side);
  const next = LADDER[side].find((s) => have < s.at);
  return next ? { at: next.at, what: rewardName(next.r), have } : null;
}
/** The rewards a side's badges have won so far. */
export function rewardsWon(b: Battles | undefined, side: Side): Reward[] {
  const have = sideBadges(b, side);
  return LADDER[side].filter((s) => have >= s.at).map((s) => s.r);
}
