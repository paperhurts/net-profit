/**
 * The Assassin in New Dimensions (data/dimension.ts), the kid's (his lists of 2026-11-07: "one sneak attack, then
 * invisible; 2, 4 and 5 damage by level"), talked through with the owner before building (2026-11-09): quick daggers
 * while he is seen, and the rest my suggestions she took whole, cooldowns and all, the damage hers to leave to me.
 *
 * The loop a kid would find (strike, vanish, strike, vanish, never seen, never hit) is broken by Vanish waiting 6 s
 * and lasting 5 s at most, or until he strikes: a second or so seen each time round, when he can be hit. While he is
 * unseen, nothing can hurt him (the dimension's enemies swing at where he was and miss). His sneak attack from it is
 * his damage (2 at levels 1 to 2, 4 at 3 to 4, 5 at 5 to 8; 7 at 9 to 15 and 9 at 16 to 20 my fill, so he keeps
 * growing) and dazes what it hits for a second. Throwing knives: three at the three nearest, every 3 s. Smoke bomb:
 * everything round him dazed 2 s, every 10 s. Shadow step: behind the nearest, every 6 s.
 *
 * Here: the numbers, free of the game. His waits live in the Warrior's bag (warrior.ts Fury), so the pepper works.
 */
import { type Fury, peppered } from './warrior';

export type Trick = 'vanish' | 'knives' | 'smoke' | 'shadow';
/** In the order of his four buttons. */
export const TRICKS: readonly Trick[] = ['vanish', 'knives', 'smoke', 'shadow'];
export const TRICK_SPECS: Readonly<Record<Trick, { name: string; every: number }>> = {
  vanish: { name: 'Vanish', every: 6 },
  knives: { name: 'Throwing knives', every: 3 },
  smoke: { name: 'Smoke bomb', every: 10 },
  shadow: { name: 'Shadow step', every: 6 },
};

/** His daggers: quick, up close; 1, 2, 3, 4 at levels 1, 6, 11, 16. */
export const DAGGER_REACH = 48;
export const DAGGER_RELOAD = 0.3;
export function daggerPower(lv: number): number {
  if (lv >= 16) return 4;
  if (lv >= 11) return 3;
  if (lv >= 6) return 2;
  return 1;
}
/** His sneak attack, from Vanish: his 2, 4 and 5, then 7 and 9 (mine). */
export function sneakPower(lv: number): number {
  if (lv >= 16) return 9;
  if (lv >= 9) return 7;
  if (lv >= 5) return 5;
  if (lv >= 3) return 4;
  return 2;
}
export const SNEAK_DAZE = 1;
/** Vanish lasts this long at most. */
export const VANISH_TIME = 5;
/** Throwing knives: how many, how far, and each a dagger less one (1 at least). */
export const KNIVES = 3;
export const KNIFE_RANGE = 200;
export function knifePower(lv: number): number {
  return Math.max(1, daggerPower(lv) - 1);
}
/** Smoke bomb: how wide, and how long it dazes. */
export const SMOKE_R = 90;
export const SMOKE_DAZE = 2;
/** Shadow step: how far it reaches, and how far behind it lands. */
export const SHADOW_RANGE = 200;
export const SHADOW_BEHIND = 26;

export function noTrick(f: Fury, t: Trick): 'wait' | null {
  return (f.cd[t] ?? 0) > 0 && !peppered(f) ? 'wait' : null;
}
export function trick(f: Fury, t: Trick): boolean {
  if (noTrick(f, t)) return false;
  if (peppered(f)) {
    f.skips--;
    f.cd[t] = 0;
  } else f.cd[t] = TRICK_SPECS[t].every;
  return true;
}

/** Where Shadow step lands: just behind the one it is aimed at, as seen from where he stands, kept on the floor. */
export function behind(
  from: { x: number; y: number },
  to: { x: number; y: number },
  floor: { x: number; y: number; r: number },
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy) || 1;
  let x = to.x + (dx / d) * SHADOW_BEHIND;
  let y = to.y + (dy / d) * SHADOW_BEHIND;
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
