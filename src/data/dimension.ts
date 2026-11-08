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
 * Here: the gun's price, who comes each round, what a round pays, and the saved block.
 */
import { BARGE_MAX, type BargeFoe, type BargePick, noPick } from './barge';

/** The portal gun, from the shipwright, once there is a spear. */
export const GUN_COST = 5000;
export const GUN_NAME = 'Portal gun';
export const GUN_BLURB = 'Fire it to step into a new dimension and fight.';
export const GUN_BOUGHT =
  'A portal gun! Ashore or at sea, tap the portal button by the crossed swords to step into a new dimension.';

/** Never more than this on the field at once: the Battle Barge's ten. */
export const DIM_MAX = BARGE_MAX;
/** A round's pay, and a boss round's. */
export const ROUND_PAY = 10;
export const BOSS_PAY = 100;
/** Every this many rounds, a boss comes too. */
export const BOSS_EVERY = 5;
/** The pause between a round beaten and the next, in seconds. */
export const ROUND_GAP = 3;

/**
 * The enemies on foot a round can bring, and the round each first comes in. Left out: those that call up more of
 * their own (the blue and green demons' monkeys, the necromancers' skeletons), which would take the field past ten.
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
  ['gator', 11],
  ['lagoon', 12],
  ['swordsman', 13],
  ['tarhuman', 14],
  ['boneman', 16],
  ['displacer', 18],
  ['tarbeast', 19],
];

/**
 * The bosses a boss round brings, one at a time, in turn. Left out: those that call up more (the Old One, the tar
 * leader, Skrill and his monkeys), those that need something you may not have (the spider's bug spray), and those
 * that fight from off the deck (Cthulhu, the Tar Anchorer, the tar dragon).
 */
export const DIM_BOSSES: readonly BargeFoe[] = [
  'sorcerer',
  'pelican',
  'heron',
  'reaper',
  'forgotten',
];

/** How many come in round n: three in the first, one more a round, ten at most. */
export function roundSize(n: number): number {
  return Math.max(1, Math.min(DIM_MAX, Math.floor(n) + 2));
}

/** Whether round n brings a boss. */
export function bossRound(n: number): boolean {
  return n > 0 && n % BOSS_EVERY === 0;
}

/** What beating round n pays. */
export function roundPay(n: number): number {
  return bossRound(n) ? BOSS_PAY : ROUND_PAY;
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

/** The saved block: the portal gun bought, and the best round beaten. */
export type DimSave = { gun: boolean; best: number };

export function noDims(): DimSave {
  return { gun: false, best: 0 };
}

/** Read back: missing in old saves, read as neither. */
export function parseDims(o: unknown): DimSave {
  if (!o || typeof o !== 'object') return noDims();
  const s = o as { gun?: unknown; best?: unknown };
  const best = typeof s.best === 'number' && s.best > 0 ? Math.min(9999, Math.floor(s.best)) : 0;
  return { gun: s.gun === true, best };
}

/** Untouched, it stays out of the save: the save travels in a link (state/share.ts), kept short. */
export function untouchedDims(d: DimSave): boolean {
  return !d.gun && !d.best;
}
