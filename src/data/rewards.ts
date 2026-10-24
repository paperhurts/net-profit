/**
 * The Endless Isle's side rewards, the eleventh piece of the owner's plan (2026-10-23, taken as it stood): things to
 * wear, fly and show for fighting for a side, counted across that side's badges, three roles of three, nine in all;
 * and for the Ninja Slalom, a snow ninja's white outfit for gold on all three runs. A side's outfit at 3 of its badges,
 * its flag for the boat at 6, and at all 9 its hull paint, its title and a stand in your trophy hall; at all nine of
 * both sides', the golden mirror and the title Master of the Endless Isle (the plan said Doom Island, the isle's name
 * then). And the last rung of each place's badges, gold at 20 marks: a title, and no new power.
 */

import type { Side } from '../world/endless';
import { type Battles, badgeOf, GOLD_MARKS, type Role } from './battle';
import { EMBLEMS, type Flag } from './flag';
import { type GoldTitle, type OutfitKind, TITLES, type TitleKind } from './look';
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

/** The titles: Pirate Lord and Grand Master for all of a side's badges, Master of the Endless Isle for both. */
export type WonTitle = Exclude<TitleKind, 'none'>;
export function titleWon(k: TitleKind, w: Won): boolean {
  if (k === 'lord') return sideBadges(w.battles, 'pirate') >= ALL_BADGES;
  if (k === 'master') return sideBadges(w.battles, 'ninja') >= ALL_BADGES;
  if (k === 'endless') return titleWon('lord', w) && titleWon('master', w);
  if (k === 'none') return true;
  const [, side, role] = k.split('-') as [string, Side, Role];
  return goldWon(w.battles, side, role);
}
/** A place's gold badge: its marks at the last rung. */
export function goldWon(b: Battles | undefined, side: Side, role: Role): boolean {
  return (b?.marks[side][role] ?? 0) >= GOLD_MARKS;
}
export const GOLD_TITLES: readonly GoldTitle[] = TITLES.map(([k]) => k).filter(
  (k): k is GoldTitle => k.startsWith('gold-'),
);
export const TITLE_NAME = Object.fromEntries(TITLES) as Readonly<Record<WonTitle, string>>;
/** How much a title outranks another, so a new one goes on only over a lesser one. */
export function titleRank(k: TitleKind): number {
  return k === 'none' ? 0 : k.startsWith('gold-') ? 1 : k === 'endless' ? 3 : 2;
}

/**
 * The trophy hall's three from the Endless Isle, at Gigantis, round the treasure dais: Captain Cappy's cutlass on a
 * stand to its left and Master Sensei's katana on one to its right, as the two isles mirror each other, and the golden
 * mirror behind it, before the way up. Where each stands from the hall's middle, as the boss trophies' stands are.
 */
export type HallKind = 'cutlass' | 'katana' | 'mirror';
export const HALL_KINDS: readonly HallKind[] = ['cutlass', 'katana', 'mirror'];
export const HALL_PIECES: Readonly<
  Record<HallKind, { name: string; story: string; hint: string; angle: number; r: number }>
> = {
  cutlass: {
    name: "Captain Cappy's cutlass",
    story:
      'Captain Cappy\'s own cutlass, its hilt all gold, for the Pirate Lord. "Only the finest pirate on the seven seas gets to hang this on a wall. Arr, that\'s you!"',
    hint: 'Win all nine pirate badges on the Endless Isle.',
    angle: Math.PI * 0.75,
    r: 72,
  },
  katana: {
    name: "Master Sensei's katana",
    story:
      'Master Sensei\'s katana, in its black and silver, for the Grand Master. "It remembers every lesson. Now it will remember yours."',
    hint: 'Win all nine ninja badges on the Endless Isle.',
    angle: Math.PI * 1.75,
    r: 72,
  },
  mirror: {
    name: 'the golden mirror',
    story:
      'The golden mirror, for the Master of the Endless Isle. Look in it and two of everything look back, the way the two isles do.',
    hint: 'Win all nine badges on both sides of the Endless Isle.',
    angle: Math.PI * 1.25,
    r: 62,
  },
};
export function hallWon(k: HallKind, w: Won): boolean {
  if (k === 'cutlass') return titleWon('lord', w);
  if (k === 'katana') return titleWon('master', w);
  return titleWon('endless', w);
}
/** Where a piece stands, from the hall's middle; how near to look at it, and how near it stops you. */
export function hallAt(k: HallKind): { dx: number; dy: number } {
  const h = HALL_PIECES[k];
  return { dx: Math.cos(h.angle) * h.r, dy: Math.sin(h.angle) * h.r };
}
export const HALL_REACH = 22;
export const HALL_SOLID = 10;
/** The piece within reach of a point in the hall, or null. */
export function nearHall(dx: number, dy: number): HallKind | null {
  let best: HallKind | null = null;
  let bestD = HALL_REACH;
  for (const k of HALL_KINDS) {
    const p = hallAt(k);
    const d = Math.hypot(dx - p.dx, dy - p.dy);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

/** A reward of any kind, as it is announced. */
export type Reward =
  | { kind: 'outfit'; key: Exclude<OutfitKind, 'none'> }
  | { kind: 'flag'; key: WonFlag }
  | { kind: 'paint'; key: WonPaint }
  | { kind: 'title'; key: WonTitle }
  | { kind: 'hall'; key: HallKind };
export function rewardName(r: Reward): string {
  if (r.kind === 'outfit') return OUTFIT_NAME[r.key];
  if (r.kind === 'flag') return WON_FLAGS[r.key].name;
  if (r.kind === 'paint') return WON_PAINTS[r.key].name;
  if (r.kind === 'title') return `the title ${TITLE_NAME[r.key]}`;
  return r.key === 'mirror'
    ? HALL_PIECES.mirror.name
    : `${HALL_PIECES[r.key].name} for your trophy hall`;
}
export function rewardWon(r: Reward, w: Won): boolean {
  if (r.kind === 'outfit') return outfitWon(r.key, w);
  if (r.kind === 'flag') return flagWon(r.key, w);
  if (r.kind === 'paint') return paintWon(r.key, w);
  if (r.kind === 'title') return titleWon(r.key, w);
  return hallWon(r.key, w);
}
const ALL_REWARDS: readonly Reward[] = [
  { kind: 'outfit', key: 'captain' },
  { kind: 'outfit', key: 'ninja' },
  { kind: 'outfit', key: 'snow' },
  { kind: 'flag', key: 'jolly' },
  { kind: 'flag', key: 'banner' },
  { kind: 'paint', key: 'lord' },
  { kind: 'paint', key: 'master' },
  { kind: 'title', key: 'lord' },
  { kind: 'title', key: 'master' },
  { kind: 'hall', key: 'cutlass' },
  { kind: 'hall', key: 'katana' },
  { kind: 'title', key: 'endless' },
  { kind: 'hall', key: 'mirror' },
  ...GOLD_TITLES.map((key): Reward => ({ kind: 'title', key })),
];
/** Every reward won between two moments, in the order they are said. */
export function newRewards(was: Won, now: Won): Reward[] {
  return ALL_REWARDS.filter((r) => !rewardWon(r, was) && rewardWon(r, now));
}

/** A side's rewards for its badges, a step at a time. */
const LADDER: Readonly<Record<Side, readonly { at: number; rs: readonly Reward[] }[]>> = {
  pirate: [
    { at: OUTFIT_BADGES, rs: [{ kind: 'outfit', key: 'captain' }] },
    { at: FLAG_BADGES, rs: [{ kind: 'flag', key: 'jolly' }] },
    {
      at: ALL_BADGES,
      rs: [
        { kind: 'paint', key: 'lord' },
        { kind: 'title', key: 'lord' },
        { kind: 'hall', key: 'cutlass' },
      ],
    },
  ],
  ninja: [
    { at: OUTFIT_BADGES, rs: [{ kind: 'outfit', key: 'ninja' }] },
    { at: FLAG_BADGES, rs: [{ kind: 'flag', key: 'banner' }] },
    {
      at: ALL_BADGES,
      rs: [
        { kind: 'paint', key: 'master' },
        { kind: 'title', key: 'master' },
        { kind: 'hall', key: 'katana' },
      ],
    },
  ],
};
/** Names in a list: a, b and c. */
export function listOf(names: readonly string[]): string {
  return names.length < 2
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The next reward for fighting for a side, while there is one to win: how many badges, and what it is. */
export function nextReward(
  b: Battles | undefined,
  side: Side,
): { at: number; what: string; have: number } | null {
  const have = sideBadges(b, side);
  const next = LADDER[side].find((s) => have < s.at);
  return next ? { at: next.at, what: listOf(next.rs.map(rewardName)), have } : null;
}
/** The rewards a side's badges have won so far. */
export function rewardsWon(b: Battles | undefined, side: Side): Reward[] {
  const have = sideBadges(b, side);
  return LADDER[side].filter((s) => have >= s.at).flatMap((s) => s.rs);
}
