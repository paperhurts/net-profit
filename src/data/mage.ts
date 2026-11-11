/**
 * The Mage in New Dimensions (data/dimension.ts), the kid's ("polymorph, blink, slow fall"), with the owner's answers
 * (2026-11-09): the trickster, not a second Wizard.
 *
 * - The Mage bolt is his main attack: quick and weak, the Warrior's blow from range.
 * - Blink leaves three decoys behind him, each with a boring little poke and few hits.
 * - Polymorph turns an enemy into a SHEEP.
 * - Slow Time, in place of slow fall (nothing falls in this game): a grandfather clock drops from the sky, bounces
 *   and GONGS, and for a while everyone else takes twice as long to do a thing and the Mage does everything twice as
 *   fast.
 * - Mage armor, as the Wizard's (data/wizard.ts).
 *
 * My picks, theirs to change: decoys 2 hits each, poking for 1, gone after 8 s; blink every 6 s, a hop of 130;
 * polymorph on the nearest, every 8 s; Slow Time 4 s, every 20 s, the enemies held in half-second
 * pulses so they move and swing at half speed (a boss on the stun limit, so only a little slowed); the Mage's
 * walking, blows and waits all twice as quick while it runs.
 *
 * Here: the numbers, free of the game. His waits live in the Warrior's bag (warrior.ts Fury), so the pepper works.
 */
import { basicPower, type Fury, peppered } from './warrior';

export type Trick = 'blink' | 'sheep' | 'slow' | 'armor';
/** In the order of his four buttons. */
export const MAGE_TRICKS: readonly Trick[] = ['blink', 'sheep', 'slow', 'armor'];
export const MAGE_SPECS: Readonly<Record<Trick, { name: string; every: number }>> = {
  blink: { name: 'Blink', every: 6 },
  sheep: { name: 'Polymorph', every: 8 },
  slow: { name: 'Slow Time', every: 20 },
  armor: { name: 'Mage armor', every: 20 },
};

/** The Mage bolt: how far, how often, and the Warrior's blow. */
export const BOLT_RANGE = 170;
export const BOLT_RELOAD = 0.5;
export function boltPower(lv: number): number {
  return basicPower(lv);
}

/** Blink: how far, and the decoys left behind. */
export const BLINK_STEP = 130;
export const DECOYS = 3;
export const DECOY_LIFE = 8;

/** Polymorph: how far it reaches, and how long a sheep stays a sheep. His answers (2026-11-10): 5 s, and never a boss. */
export const SHEEP_RANGE = 200;
export const SHEEP_TIME = 5;

/** Slow Time: how long, and how the enemies are held: this long in every PULSE. */
export const SLOW_TIME = 4;
export const SLOW_PULSE = 1;
export const SLOW_HOLD = 0.5;
/** The Mage's own speed while it runs. */
export const HASTE = 2;

export function noTrick(f: Fury, t: Trick): 'wait' | null {
  return (f.cd[t] ?? 0) > 0 && !peppered(f) ? 'wait' : null;
}
export function mageTrick(f: Fury, t: Trick): boolean {
  if (noTrick(f, t)) return false;
  if (peppered(f)) {
    f.skips--;
    f.cd[t] = 0;
  } else f.cd[t] = MAGE_SPECS[t].every;
  return true;
}

/** The grandfather clock's fall: its height above the floor at time t since it was summoned, landing and bouncing
 * twice in 1.2 s; and the moments it hits the floor. */
export const CLOCK_DROP = 220;
export const CLOCK_HITS = [0.45, 0.8, 1.05] as const;
export function clockHeight(t: number): number {
  if (t < 0) return CLOCK_DROP;
  const [a, b, c] = CLOCK_HITS;
  if (t < a) return CLOCK_DROP * (1 - (t / a) ** 2);
  if (t < b) return 40 * Math.sin(((t - a) / (b - a)) * Math.PI);
  if (t < c) return 14 * Math.sin(((t - b) / (c - b)) * Math.PI);
  return 0;
}

/** While Slow Time runs his waits run down twice as fast: this much more off each, on top of the usual tick. */
export function hasteWaits(f: Fury, dt: number): void {
  for (const k of Object.keys(f.cd)) f.cd[k] = Math.max(0, (f.cd[k] ?? 0) - dt * (HASTE - 1));
}
