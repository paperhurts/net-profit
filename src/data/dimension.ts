/**
 * New Dimensions, the kid's (his lists of 2026-11-07 and his answers of 2026-11-08), the first of the owner's eleven
 * pieces: a portal gun takes you into a new dimension, an arena of its own, where you fight round after round of the
 * Battle Barge's enemies (data/barge.ts), each round more of them, never more than ten on the field at once. Leave
 * any time; bonked out, you are back where you fired it with nothing lost. Behind the Experimental switch
 * (data/experimental.ts) until the whole mode is done.
 *
 * My picks, hers to change: the shipwright sells the portal gun for 5,000 coins once you have a spear; a round pays
 * 10 coins, a boss round 100; every 5th round brings a boss; companions stay home, as in Capture the Flag.
 *
 * Part two (2026-11-08), his answers through the owner: levels from enemies beaten (every one, the adds a boss or a
 * necromancer calls up too), hearts by level, and his "ENAMEYS ARE STRONGER" table as hits added on top of what each
 * enemy takes today, by the enemy's level. The enemy's level rises with the round, inside a band set by the
 * difficulty picked going in: Easy 1 to 3, Tolerable 3 to 4, Medium 5 to 9, Hard 10 to 20. An elite every 5th round,
 * a boss every 10th. Ten on the field at once, not counting what a boss calls up.
 *
 * Here: the gun's price, who comes each round, what a round pays, levels, hearts, difficulties, how much tougher each
 * enemy is, and the saved block.
 */
import { BARGE_MAX, type BargeFoe, type BargePick, noPick } from './barge';
import { PEPPER_MAX } from './warrior';

/** The portal gun, from the shipwright, once there is a spear. */
export const GUN_COST = 5000;
export const GUN_NAME = 'Portal gun';
export const GUN_BLURB = 'Fire it to step into a new dimension and fight.';
export const GUN_BOUGHT =
  'A portal gun! Ashore or at sea, tap the portal button by the crossed swords to step into a new dimension.';

/** Never more than this on the field at once, not counting what they call up: the Battle Barge's ten. */
export const DIM_MAX = BARGE_MAX;
/** A round's pay, and an elite or boss round's. */
export const ROUND_PAY = 10;
export const BOSS_PAY = 100;
/** Every this many rounds an elite comes; every BOSS_EVERY, a boss instead. */
export const ELITE_EVERY = 5;
export const BOSS_EVERY = 10;
/** The pause between a round beaten and the next, in seconds. */
export const ROUND_GAP = 3;

/**
 * The enemies on foot a round can bring, and the round each first comes in. What they call up (the demons' monkeys,
 * the necromancers' skeletons) does not count toward the ten.
 */
export const DIM_FOES: readonly (readonly [BargeFoe, number])[] = [
  ['monkey', 1],
  ['hired', 2],
  ['skeleton', 3],
  ['archer', 4],
  ['zombie', 4],
  ['ghost', 6],
  ['gorilla', 7],
  ['lancer', 8],
  ['red', 9],
  ['necro', 10],
  ['gator', 11],
  ['lagoon', 12],
  ['swordsman', 13],
  ['tarhuman', 14],
  ['blue', 15],
  ['boneman', 16],
  ['green', 17],
  ['displacer', 18],
  ['tarbeast', 19],
];

/**
 * The bosses a boss round brings, one at a time, in turn. Left out: the spider (only bug spray beats him), and those
 * that fight from off the deck or rise out of the sea round it (Cthulhu, the Old One, the Tar Anchorer, the tar
 * dragon), which a floor floating among the stars has no sea for.
 */
export const DIM_BOSSES: readonly BargeFoe[] = [
  'sorcerer',
  'pelican',
  'heron',
  'reaper',
  'forgotten',
  'tarleader',
  'skrill',
];

/** How many come in round n: three in the first, one more a round, ten at most. */
export function roundSize(n: number): number {
  return Math.max(1, Math.min(DIM_MAX, Math.floor(n) + 2));
}

/** Whether round n brings a boss: every 10th. */
export function bossRound(n: number): boolean {
  return n > 0 && n % BOSS_EVERY === 0;
}

/** Whether round n brings an elite: every 5th that is not a boss round. */
export function eliteRound(n: number): boolean {
  return n > 0 && n % ELITE_EVERY === 0 && !bossRound(n);
}

/** What beating round n pays. */
export function roundPay(n: number): number {
  return bossRound(n) || eliteRound(n) ? BOSS_PAY : ROUND_PAY;
}

/** The boss round n brings, or null. */
export function roundBoss(n: number): BargeFoe | null {
  if (!bossRound(n)) return null;
  return DIM_BOSSES[(n / BOSS_EVERY - 1) % DIM_BOSSES.length] ?? null;
}

/** Who comes in round n: the same every time, the newest kind always among them, a boss on a boss round. */
export function roundPick(n: number): BargePick {
  const p = noPick();
  const round = Math.max(1, Math.floor(n));
  const pool = DIM_FOES.filter(([, from]) => from <= round).map(([k]) => k);
  const boss = roundBoss(round);
  let left = roundSize(round);
  if (boss) {
    p[boss] = 1;
    left--;
  }
  // The newest first, then round the rest in a turn that shifts each round.
  const newest = pool[pool.length - 1];
  if (left > 0 && newest) {
    p[newest]++;
    left--;
  }
  for (let i = 0; i < left; i++) {
    const k = pool[(i + round) % pool.length];
    if (k) p[k]++;
  }
  return p;
}

/* ---------- Levels: his, from enemies beaten ---------- */

export const LEVEL_MAX = 20;
/** Enemies to beat for the next level, from level lv: 10 for 2, 35 for 3, 50 each to 6, 195 each to 20. */
export function killsToNext(lv: number): number {
  if (lv >= LEVEL_MAX) return 0;
  if (lv <= 1) return 10;
  if (lv === 2) return 35;
  if (lv <= 5) return 50;
  return 195;
}

/** A level, how far into it, and how many more it takes; at level 20, need is 0. */
export type DimLevel = { lv: number; into: number; need: number };

export function levelOf(kills: number): DimLevel {
  let left = Math.max(0, Math.floor(kills) || 0);
  let lv = 1;
  while (lv < LEVEL_MAX && left >= killsToNext(lv)) {
    left -= killsToNext(lv);
    lv++;
  }
  return { lv, into: lv >= LEVEL_MAX ? 0 : left, need: killsToNext(lv) };
}

/** Your hearts by level, his: 3 at 1 to 2, 4 at 3 to 5, 7 at 6 to 8, 10 from 9 (16 to 20 my fill). */
export function heartsAt(lv: number): number {
  if (lv <= 2) return 3;
  if (lv <= 5) return 4;
  if (lv <= 8) return 7;
  return 10;
}

/* ---------- Difficulty and the enemies' level ---------- */

export type Difficulty = 'easy' | 'tolerable' | 'medium' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'tolerable', 'medium', 'hard'];
/** His names, and the enemies' levels each runs between. */
export const DIFF_NAMES: Readonly<Record<Difficulty, string>> = {
  easy: 'Easy',
  tolerable: 'Tolerable',
  medium: 'Medium',
  hard: 'Hard',
};
export const DIFF_BANDS: Readonly<Record<Difficulty, readonly [number, number]>> = {
  easy: [1, 3],
  tolerable: [3, 4],
  medium: [5, 9],
  hard: [10, 20],
};
/** The enemies go up a level every this many rounds, until the top of the band (my pick). */
export const LEVEL_ROUNDS = 5;

/** The enemies' level in round n at a difficulty: the bottom of its band, one more every 5 rounds, up to its top. */
export function enemyLevel(d: Difficulty, n: number): number {
  const [lo, hi] = DIFF_BANDS[d];
  return Math.min(hi, lo + Math.floor((Math.max(1, Math.floor(n)) - 1) / LEVEL_ROUNDS));
}

/** His table: hits added to a mob, and to a boss or an elite, on top of what it takes today, by its level. */
export function mobAdds(level: number): number {
  if (level <= 2) return 6;
  if (level <= 5) return 8;
  if (level <= 10) return 11;
  return 25;
}
export function bossAdds(level: number): number {
  if (level <= 2) return 8;
  if (level <= 5) return 11;
  if (level <= 10) return 16;
  if (level <= 18) return 40;
  return 100;
}

/* ---------- The saved block ---------- */

/** The portal gun bought, the best round beaten, enemies beaten all told, and the difficulty last picked. */
export type DimSave = {
  gun: boolean;
  best: number;
  kills: number;
  diff: Difficulty;
  /** Hot peppers held (data/warrior.ts), three at most. */
  peppers: number;
};

export function noDims(): DimSave {
  return { gun: false, best: 0, kills: 0, diff: 'easy', peppers: 0 };
}

const count = (v: unknown, max: number): number =>
  typeof v === 'number' && v > 0 ? Math.min(max, Math.floor(v)) : 0;

/** Read back: missing in old saves, read as nothing, on Easy. */
export function parseDims(o: unknown): DimSave {
  if (!o || typeof o !== 'object') return noDims();
  const s = o as {
    gun?: unknown;
    best?: unknown;
    kills?: unknown;
    diff?: unknown;
    peppers?: unknown;
  };
  const diff = (DIFFICULTIES as readonly unknown[]).includes(s.diff)
    ? (s.diff as Difficulty)
    : 'easy';
  return {
    gun: s.gun === true,
    best: count(s.best, 9999),
    kills: count(s.kills, 9_999_999),
    diff,
    peppers: count(s.peppers, PEPPER_MAX),
  };
}

/** Untouched, it stays out of the save: the save travels in a link (state/share.ts), kept short. */
export function untouchedDims(d: DimSave): boolean {
  return !d.gun && !d.best && !d.kills && d.diff === 'easy' && !d.peppers;
}
