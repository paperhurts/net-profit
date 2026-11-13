/**
 * The Cosmedic (the owner's name, 2026-11-13; at first the Healer, and still `healer` inside and in saves) in New
 * Dimensions (data/dimension.ts): the kid's ("once a wave or round, 3"), designed by the owner
 * ("since she's mine", 2026-11-11) after a discipline priest: she heals by hurting. Space her theme, every name hers
 * or the game's own:
 *
 * - Shooting Stars, her main attack: sparkly stars at the nearest enemy, from range.
 * - Moonbeams (pew pew): a spray of little silver moon bolts at the enemies near her.
 * - Sunshine, her biggest: a burst of sunlight all round her, and her big heal, 3 hearts, once a round (his number,
 *   her call over a timer). It burns vampires and deep sea creatures twice as hard (hers; not the undead, which are
 *   the Paladin's).
 * - Saturn's Rings, her shield: rings spinning round her like a gyroscope, soaking hits (hers in place of his dog).
 *
 * Every star and moon bolt that lands is starlight toward a heart: a heart back every 3 (hers: "yes").
 *
 * My picks, hers to change: the stars the Warrior's blow from 180, every 0.5 s; Moonbeams 5 bolts at up to 5 of the
 * nearest within 220, each 1 (2 from level 11), every 6 s; Sunshine all within 110 for the Warrior's Slam and 1;
 * Saturn's Rings 3 hits, 10 s, every 15 s; the name Saturn's Rings.
 *
 * Here: the numbers, free of the game. Her waits live in the Warrior's bag (warrior.ts Fury), so the pepper works
 * (but not on Sunshine, which is once a round, not a wait).
 */
import { basicPower, type Fury, peppered, slamPower } from './warrior';

export type Light = 'moon' | 'sun' | 'rings';
/** In the order of her buttons. */
export const LIGHTS: readonly Light[] = ['moon', 'sun', 'rings'];
export const LIGHT_SPECS: Readonly<Record<Light, { name: string; every: number }>> = {
  moon: { name: 'Moonbeams', every: 6 },
  sun: { name: 'Sunshine', every: 0 },
  rings: { name: 'Saturn’s Rings', every: 15 },
};

/** Shooting Stars: how far, how often, how hard (the Warrior's blow). */
export const STAR_RANGE = 180;
export const STAR_RELOAD = 0.5;
export function starPower(lv: number): number {
  return basicPower(lv);
}

/** Starlight: a heart back for every this many star and moon hits. */
export const STARS_PER_HEART = 3;
export function starIn(n: number): { n: number; heart: boolean } {
  const m = n + 1;
  return m >= STARS_PER_HEART ? { n: 0, heart: true } : { n: m, heart: false };
}

/** Moonbeams: how many bolts, how far, how hard each. */
export const MOON_BOLTS = 5;
export const MOON_RANGE = 220;
export function moonPower(lv: number): number {
  return lv >= 11 ? 2 : 1;
}

/** Sunshine: how wide, how hard, twice on vampires and deep sea creatures, and the hearts back. */
export const SUN_R = 110;
export const SUN_HEAL = 3;
export function sunPower(lv: number, sunshy: boolean): number {
  const p = slamPower(lv) + 1;
  return sunshy ? p * 2 : p;
}

/** Saturn's Rings: hits soaked and how long they spin. */
export const RINGS_HITS = 3;
export const RINGS_TIME = 10;

/** Why she cannot, or null: Sunshine once a round, the rest their waits (which the pepper skips). */
export function noLight(f: Fury, l: Light, sunUsed: boolean): 'round' | 'wait' | null {
  if (l === 'sun') return sunUsed ? 'round' : null;
  return (f.cd[l] ?? 0) > 0 && !peppered(f) ? 'wait' : null;
}
export function shine(f: Fury, l: Light, sunUsed: boolean): boolean {
  if (noLight(f, l, sunUsed)) return false;
  if (l === 'sun') return true;
  if (peppered(f)) {
    f.skips--;
    f.cd[l] = 0;
  } else f.cd[l] = LIGHT_SPECS[l].every;
  return true;
}
