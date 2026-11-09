/**
 * The Necromancer in New Dimensions (data/dimension.ts), the kid's favourite, talked through with him by way of the
 * owner (2026-11-09). His lists: skeletons, 1 at level 1, 2 at 3, 4 at 7; a death ball that steals life, 1 at level 1
 * and 4 at 6; the scythe of doom, up close. His answers: a mix of skeletons, staying up until beaten; the death ball
 * BOUNCES; the tank is his skeleton hamster (the companion's, but giant); Grave Burst (a fallen enemy bursts) and the
 * Gorebeast (a giant red brute), his names for the ideas Diablo III calls by others. The owner's: the scythe a sweep,
 * its damage in line with the others; life steal a heart for every 4 death ball hits.
 *
 * My picks, theirs to change: the death ball is his main attack, from range, every 0.8 s, bouncing on to two more
 * close by; its damage his 1 at level 1 and 4 at 6, with 2 at 3 and 3 at 5 between. The scythe sweeps all round him
 * every 4 s for the Warrior's Slam's 2, 3, 4, 5 at levels 1, 6, 11, 16 (his 1, 3, 9 brought in line). Raise Dead,
 * every 8 s, raises those not up: a sword skeleton from level 1, an archer from 3, a mage and the giant hamster from
 * 7. Grave Burst, every 6 s, bursts the nearest of the last enemies to fall, hurting all round it. The Gorebeast from
 * level 5, one at a time, every 20 s, hitting for 2 and giving him a heart back every 3rd hit.
 *
 * Here: the numbers, free of the game. His waits live in the Warrior's bag (warrior.ts Fury), so the pepper works.
 */
import { type Fury, peppered, slamPower } from './warrior';

export type Rite = 'scythe' | 'raise' | 'burst' | 'gorebeast';
/** In the order of his four buttons. */
export const RITES: readonly Rite[] = ['scythe', 'raise', 'burst', 'gorebeast'];
export const RITE_SPECS: Readonly<Record<Rite, { name: string; every: number; from: number }>> = {
  scythe: { name: 'Scythe of doom', every: 4, from: 1 },
  raise: { name: 'Raise Dead', every: 8, from: 1 },
  burst: { name: 'Grave Burst', every: 6, from: 1 },
  gorebeast: { name: 'Gorebeast', every: 20, from: 5 },
};

/** The death ball: how far, how often, how many it bounces on to and how far between, and his damage. */
export const BALL_RANGE = 170;
export const BALL_RELOAD = 0.8;
export const BALL_BOUNCES = 2;
export const BALL_HOP = 90;
export function ballPower(lv: number): number {
  if (lv >= 6) return 4;
  if (lv >= 5) return 3;
  if (lv >= 3) return 2;
  return 1;
}
/** Life steal, the owner's: a heart back for every 4 death ball hits. */
export const SOULS_PER_HEART = 4;

/** The scythe of doom: all round him, the Warrior's Slam's damage. */
export const SCYTHE_R = 72;
export function scythePower(lv: number): number {
  return slamPower(lv);
}

/** His skeletons, in the order they come: how many he may have up by level (his), and which. */
export type Bone = 'skeleton' | 'archer' | 'mage' | 'bighamster';
export const BONES: readonly Bone[] = ['skeleton', 'archer', 'mage', 'bighamster'];
export function bonesAt(lv: number): number {
  if (lv >= 7) return 4;
  if (lv >= 3) return 2;
  return 1;
}
/** Which of his skeletons are his to raise at a level. */
export function bonesFor(lv: number): readonly Bone[] {
  return BONES.slice(0, bonesAt(lv));
}

/** Grave Burst: how far off a fallen enemy can be, how wide it bursts, how long one lies there, and its damage. */
export const BURST_REACH = 220;
export const BURST_R = 70;
export const CORPSE_TIME = 20;
export function burstPower(lv: number): number {
  return slamPower(lv) + 1;
}

/** The Gorebeast gives him a heart back every this many of its hits. */
export const GORE_HEAL_EVERY = 3;

export function noRite(f: Fury, r: Rite, lv: number): 'level' | 'wait' | null {
  if (lv < RITE_SPECS[r].from) return 'level';
  return (f.cd[r] ?? 0) > 0 && !peppered(f) ? 'wait' : null;
}
export function rite(f: Fury, r: Rite, lv: number): boolean {
  if (noRite(f, r, lv)) return false;
  if (peppered(f)) {
    f.skips--;
    f.cd[r] = 0;
  } else f.cd[r] = RITE_SPECS[r].every;
  return true;
}

/** A death ball hit: one more soul, and a heart back when there are 4. */
export function soulIn(souls: number): { souls: number; heart: boolean } {
  const n = souls + 1;
  return n >= SOULS_PER_HEART ? { souls: 0, heart: true } : { souls: n, heart: false };
}
