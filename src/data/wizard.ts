/**
 * The Wizard in New Dimensions (data/dimension.ts), the kid's (his lists of 2026-11-07: "fireball 1 damage at levels
 * 1 to 3, 3 at 3 to 4, 4 at 5 to 9, 5 at 10 to 20; magic missile 10 at level 7, 13 at 11"), with three more spells
 * through the owner (2026-11-08): misty step, mage armor (the Mage gets it too) and GREASE, "a fireball on grease sets
 * an aoe fire".
 *
 * My picks, hers to change: fireball is his main attack, from range, with a little splash; magic missile is three
 * homing bolts at the three nearest, from level 7, every 5 s; grease is a slick puddle on the biggest crowd for 8 s,
 * every 8 s, whose slipping slows what stands in it; a fireball landing in it sets it alight for 4 s, burning what
 * stands in it every half second (fire never hurts you); misty step is a short hop where the stick points, or away
 * from the nearest enemy, every 4 s; mage armor soaks the next 2 hits within 20 s, every 15 s. The hot pepper (data/
 * warrior.ts) skips his waits too.
 *
 * Here: the numbers, and the rules that use them, free of the game. His waits live in the same bag as the Warrior's
 * (warrior.ts Fury), so the pepper works for both.
 */
import { type Fury, peppered } from './warrior';

export type Spell = 'missile' | 'grease' | 'misty' | 'armor';
/** In the order of the buttons round the throw button. */
export const SPELLS: readonly Spell[] = ['missile', 'grease', 'misty', 'armor'];
export type SpellSpec = { name: string; every: number; from: number };
export const SPELL_SPECS: Readonly<Record<Spell, SpellSpec>> = {
  missile: { name: 'Magic missile', every: 5, from: 7 },
  grease: { name: 'Grease', every: 8, from: 1 },
  misty: { name: 'Misty step', every: 4, from: 1 },
  armor: { name: 'Mage armor', every: 15, from: 1 },
};

/** Fireball: how far, how often, how fast it flies, and its splash. */
export const FIRE_RANGE = 170;
export const FIRE_RELOAD = 0.7;
export const FIRE_SPEED = 520;
export const FIRE_SPLASH = 34;
/** His fireball damage: 1 at levels 1 to 2, 3 at 3 to 4, 4 at 5 to 9, 5 from 10. */
export function fireballPower(lv: number): number {
  if (lv <= 2) return 1;
  if (lv <= 4) return 3;
  if (lv <= 9) return 4;
  return 5;
}
/** His magic missile: none before level 7, 10 from 7, 13 from 11; three bolts. */
export const MISSILES = 3;
export const MISSILE_RANGE = 240;
export function missilePower(lv: number): number {
  if (lv < 7) return 0;
  if (lv < 11) return 10;
  return 13;
}

/** Grease: where it can go, how wide, how long, and how often what stands in it slips, and for how long. */
export const GREASE_RANGE = 220;
export const GREASE_R = 60;
export const GREASE_TIME = 8;
export const SLIP_EVERY = 1.2;
export const SLIP_STUN = 0.5;
/** Set alight: how long it burns, how often, and for how much (half a fireball, at least 1). */
export const BURN_TIME = 4;
export const BURN_EVERY = 0.5;
export function burnPower(lv: number): number {
  return Math.max(1, Math.round(fireballPower(lv) / 2));
}

/** Misty step: how far. */
export const MISTY_STEP = 130;
/** Mage armor: hits it soaks, and how long it lasts. */
export const ARMOR_HITS = 2;
export const ARMOR_TIME = 20;

/** Why a spell cannot be cast now, or null if it can. */
export type NoSpell = 'wait' | 'level';
export function noSpell(f: Fury, s: Spell, lv: number): NoSpell | null {
  if (lv < SPELL_SPECS[s].from) return 'level';
  if ((f.cd[s] ?? 0) > 0 && !peppered(f)) return 'wait';
  return null;
}
/** Cast it: its wait begun, unless a pepper skips it. False if it cannot. */
export function cast(f: Fury, s: Spell, lv: number): boolean {
  if (noSpell(f, s, lv)) return false;
  if (peppered(f)) {
    f.skips--;
    f.cd[s] = 0;
  } else f.cd[s] = SPELL_SPECS[s].every;
  return true;
}

/** A grease puddle: where, how long left, and whether (and how long) it burns. */
export type Puddle = {
  x: number;
  y: number;
  t: number;
  fire: number;
  slipT: number;
  burnT: number;
};
export function puddle(x: number, y: number): Puddle {
  return { x, y, t: GREASE_TIME, fire: 0, slipT: 0, burnT: 0 };
}
/** A fireball landing at (x, y) sets alight any puddle it lands in; true if it did. */
export function ignite(ps: Puddle[], x: number, y: number): boolean {
  let lit = false;
  for (const p of ps)
    if (!p.fire && p.t > 0 && Math.hypot(p.x - x, p.y - y) <= GREASE_R) {
      p.fire = BURN_TIME;
      p.burnT = 0;
      lit = true;
    }
  return lit;
}
/** What happens to a puddle this step: whether what is in it slips, and whether it burns. */
export type PuddleBeat = { slip: boolean; burn: boolean };
export function tickPuddle(p: Puddle, dt: number): PuddleBeat {
  const out: PuddleBeat = { slip: false, burn: false };
  if (p.fire > 0) {
    p.fire = Math.max(0, p.fire - dt);
    p.burnT -= dt;
    if (p.burnT <= 0) {
      p.burnT = BURN_EVERY;
      out.burn = true;
    }
    // Burnt off: the grease is gone with the fire.
    if (p.fire <= 0) p.t = 0;
    return out;
  }
  p.t = Math.max(0, p.t - dt);
  p.slipT -= dt;
  if (p.t > 0 && p.slipT <= 0) {
    p.slipT = SLIP_EVERY;
    out.slip = true;
  }
  return out;
}

/** Where misty step lands: along the stick if pushed, else away from the nearest enemy, kept inside the floor. */
export function mistyTo(
  from: { x: number; y: number },
  push: { x: number; y: number } | null,
  nearest: { x: number; y: number } | null,
  floor: { x: number; y: number; r: number },
): { x: number; y: number } {
  let dx = push ? push.x : nearest ? from.x - nearest.x : 1;
  let dy = push ? push.y : nearest ? from.y - nearest.y : 0;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  let x = from.x + dx * MISTY_STEP;
  let y = from.y + dy * MISTY_STEP;
  const fx = x - floor.x;
  const fy = y - floor.y;
  const fd = Math.hypot(fx, fy);
  const max = floor.r - 22;
  if (fd > max) {
    x = floor.x + (fx / fd) * max;
    y = floor.y + (fy / fd) * max;
  }
  return { x, y };
}
