/**
 * The Warrior in New Dimensions (data/dimension.ts), the kid's, through the owner (2026-11-08): "warrior shouldn't be
 * boring warrior should be AWESOME". Up close with a sword and a shield ("board"): a stab and a bash as his basic
 * attacks, each one that lands worth a rage; a rage meter of angry faces; a Charge that costs nothing and makes 3
 * rage; a Slam that costs 2 and hits all round him; and his special, a Leap, costing 3, into the thick of them with
 * a BANG that stuns everything for a second "from his sheer WARRIORNESS". And the owner's hot pepper, so that with
 * planning he can be "a ping pong warrior, if only for a few seconds": eaten, it skips his next 4 cooldowns.
 *
 * My picks, hers to change: rage tops out at 5; one button going stab, stab, bash; Charge waits 6 s, so it cannot be
 * chained without a pepper; a boss is stunned half a second at most, and not again for 2 s; no spear in the
 * dimension; the damage by level below; the pepper lasts 8 s, an elite round drops one, the shipwright sells them
 * at 200, three held at most.
 *
 * Here: the numbers, and the rules that use them, free of the game.
 */

export const RAGE_MAX = 5;

/** The basic attack: how far it reaches, how often, and its turn of blows. */
export const BASIC_REACH = 52;
export const BASIC_RELOAD = 0.42;
export type Blow = 'stab' | 'bash';
export const COMBO: readonly Blow[] = ['stab', 'stab', 'bash'];
/** A bash shoves and dazes for this long. */
export const BASH_STUN = 0.5;

export type Ability = 'charge' | 'slam' | 'leap';
export const ABILITIES: readonly Ability[] = ['charge', 'slam', 'leap'];
export type AbilitySpec = {
  name: string;
  /** Rage it costs, and rage it makes. */
  cost: number;
  gain: number;
  /** Seconds before it can be used again. */
  every: number;
};
export const ABILITY_SPECS: Readonly<Record<Ability, AbilitySpec>> = {
  charge: { name: 'Charge', cost: 0, gain: 3, every: 6 },
  slam: { name: 'Slam', cost: 2, gain: 0, every: 1 },
  leap: { name: 'Leap', cost: 3, gain: 0, every: 1 },
};

/** How far Charge looks for something to run at, and how fast he goes. */
export const CHARGE_RANGE = 220;
export const CHARGE_SPEED = 760;
/** Slam's reach all round him. */
export const SLAM_R = 72;
/** How far Leap can go, how wide its BANG, and how long it is in the air. */
export const LEAP_RANGE = 280;
export const LEAP_R = 86;
export const LEAP_TIME = 0.5;
export const LEAP_HIGH = 70;
/** His BANG's stun, on everything round where he lands (the owner's: "warrior shouldn't be able to stun the map"):
 * 1 s; a boss half that, and not again for 2 s. */
export const LEAP_STUN = 1;
export const BOSS_STUN = 0.5;
export const BOSS_STUN_EVERY = 2;

/** Damage by your level: basic (and Charge's hit), Slam, Leap; each up at levels 6, 11 and 16. */
const STEPS = [1, 6, 11, 16] as const;
const tier = (lv: number): number => STEPS.filter((s) => lv >= s).length - 1;
export function basicPower(lv: number): number {
  return [1, 2, 3, 4][Math.max(0, tier(lv))] ?? 1;
}
export function slamPower(lv: number): number {
  return [2, 3, 4, 5][Math.max(0, tier(lv))] ?? 2;
}
export function leapPower(lv: number): number {
  return [3, 5, 7, 9][Math.max(0, tier(lv))] ?? 3;
}

/** The Warrior in a fight: his rage, each ability's wait, where he is in his turn of blows, and the pepper's skips. */
export type Fury = {
  rage: number;
  cd: Record<Ability, number>;
  combo: number;
  skips: number;
  pepperT: number;
  bossStunT: number;
};

export function freshFury(): Fury {
  return {
    rage: 0,
    cd: { charge: 0, slam: 0, leap: 0 },
    combo: 0,
    skips: 0,
    pepperT: 0,
    bossStunT: 0,
  };
}

export function addRage(f: Fury, n: number): void {
  f.rage = Math.max(0, Math.min(RAGE_MAX, f.rage + n));
}

/** Why an ability cannot be used now, or null if it can. */
export type NotNow = 'wait' | 'rage';
export function notNow(f: Fury, a: Ability): NotNow | null {
  // Fired up on a pepper, a wait still running does not hold him back either: that is a cooldown skipped too.
  if (f.cd[a] > 0 && !peppered(f)) return 'wait';
  if (f.rage < ABILITY_SPECS[a].cost) return 'rage';
  return null;
}

/** Use an ability: its rage spent and made, and its wait begun, unless a pepper skips it. False if it cannot. */
export function useAbility(f: Fury, a: Ability): boolean {
  if (notNow(f, a)) return false;
  const s = ABILITY_SPECS[a];
  addRage(f, s.gain - s.cost);
  if (peppered(f)) {
    f.skips--;
    f.cd[a] = 0;
  } else f.cd[a] = s.every;
  return true;
}

/** The next blow in his turn, moving the turn on. */
export function nextBlow(f: Fury): Blow {
  const b = COMBO[f.combo % COMBO.length] ?? 'stab';
  f.combo = (f.combo + 1) % COMBO.length;
  return b;
}

/** Time passing: waits run down, the pepper wears off. */
export function tickFury(f: Fury, dt: number): void {
  for (const a of ABILITIES) f.cd[a] = Math.max(0, f.cd[a] - dt);
  f.bossStunT = Math.max(0, f.bossStunT - dt);
  f.pepperT = Math.max(0, f.pepperT - dt);
  if (f.pepperT <= 0) f.skips = 0;
}

/** A boss's share of a stun: half a second at most, and nothing if one was stunned in the last 2 s. */
export function bossStun(f: Fury, s: number): number {
  if (f.bossStunT > 0) return 0;
  f.bossStunT = BOSS_STUN_EVERY;
  return Math.min(s, BOSS_STUN);
}

/* ---------- The hot pepper ---------- */

export const PEPPER_SKIPS = 4;
export const PEPPER_TIME = 8;
export const PEPPER_COST = 200;
export const PEPPER_MAX = 3;
export const PEPPER_NAME = 'Hot pepper';
export const PEPPER_BLURB = 'In a new dimension, eat one to skip your next 4 cooldowns. Hot!';

/** Eaten: the next 4 cooldowns skipped, for 8 s at most. */
export function eatPepper(f: Fury): void {
  f.skips = PEPPER_SKIPS;
  f.pepperT = PEPPER_TIME;
}

/** Whether he is fired up on a pepper just now. */
export function peppered(f: Fury): boolean {
  return f.pepperT > 0 && f.skips > 0;
}

/**
 * Where Leap lands: on the one with the most others round it within the BANG, of those in reach; nearer breaks a tie.
 * Null with nobody in reach.
 */
export function leapSpot(
  from: { x: number; y: number },
  foes: readonly { x: number; y: number }[],
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestN = -1;
  let bestD = Infinity;
  for (const f of foes) {
    const d = Math.hypot(f.x - from.x, f.y - from.y);
    if (d > LEAP_RANGE) continue;
    const n = foes.filter((g) => Math.hypot(g.x - f.x, g.y - f.y) <= LEAP_R).length;
    if (n > bestN || (n === bestN && d < bestD)) {
      best = f;
      bestN = n;
      bestD = d;
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}
