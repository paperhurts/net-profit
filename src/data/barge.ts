/**
 * The Battle Barge, the kid's (his sixth list): "a place called the Battle Barge, free; customize the size of the map
 * in there, and all enemies can be summoned, a maximum of 10"; his answers: open anywhere, on the islands and out at
 * sea; it pays a coin, but it is mostly to get better, and for fun; you spawn in and pick what you fight and how many.
 * Built in stages, the owner's call: this first one has the on-foot enemies, up to ten at once, in a small, medium or
 * large arena, and the bosses come after.
 *
 * Here: the arena sizes, the enemies to pick from, a pick kept to ten, a saved setup read back, and where the picked
 * enemies stand when the fight starts.
 */

export type ArenaSize = 'small' | 'medium' | 'large';
export const ARENA_SIZES: readonly ArenaSize[] = ['small', 'medium', 'large'];
export const ARENA_NAMES: Readonly<Record<ArenaSize, string>> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

/** The on-foot enemies: the monkeys' and the hired men's camps, and the undead of Gigantis and the lagoon. */
export type BargeFoe =
  | 'monkey'
  | 'hired'
  | 'skeleton'
  | 'archer'
  | 'zombie'
  | 'ghost'
  | 'necro'
  | 'lagoon';
export const BARGE_FOES: readonly BargeFoe[] = [
  'monkey',
  'hired',
  'skeleton',
  'archer',
  'zombie',
  'ghost',
  'necro',
  'lagoon',
];
/** The ones that are the undead's (entities/undead.ts); the rest are camps (entities/monkeys.ts). */
export const UNDEAD_FOES: readonly BargeFoe[] = [
  'skeleton',
  'archer',
  'zombie',
  'ghost',
  'necro',
  'lagoon',
];
/** What each is called on the card, and a word on how it fights. */
export const FOE_NAMES: Readonly<Record<BargeFoe, readonly [string, string]>> = {
  monkey: ['Monkeys', 'Bonk you and throw coconuts. 2 hits each.'],
  hired: ["The Heron's hired men", 'Punch and throw stones. 3 hits each.'],
  skeleton: ['Skeletons', 'Swords and shields: the shield takes the first hit. 4 hits.'],
  archer: ['Skeleton archers', 'Shoot arrows from far off. 3 hits.'],
  zombie: ['Zombies', 'Slow, and tough. 8 hits.'],
  ghost: ['Ghosts', 'Keep back and send cold wisps. 3 hits.'],
  necro: ['Necromancers', 'Raise skeletons out of the floor. 6 hits.'],
  lagoon: ['Lagoon creatures', 'Quick, with claws. 2 hits.'],
};

/** Ten at most, all told; and the prize for beating them all. */
export const BARGE_MAX = 10;
export const BARGE_PRIZE = 1;

export type BargePick = Record<BargeFoe, number>;
export type BargeSetup = { size: ArenaSize; pick: BargePick };

/** Nobody picked. */
export function noPick(): BargePick {
  return { monkey: 0, hired: 0, skeleton: 0, archer: 0, zombie: 0, ghost: 0, necro: 0, lagoon: 0 };
}
/** To start: a medium arena, three monkeys and two skeletons. */
export function defaultBarge(): BargeSetup {
  return { size: 'medium', pick: { ...noPick(), monkey: 3, skeleton: 2 } };
}

/** How many are picked, all told. */
export function bargeTotal(p: BargePick): number {
  return BARGE_FOES.reduce((n, k) => n + p[k], 0);
}

/** One more of a kind, or one fewer: never under none, and never past ten all told. */
export function bargeAdd(p: BargePick, k: BargeFoe, d: number): BargePick {
  const out = { ...p };
  if (d > 0) out[k] = p[k] + Math.min(d, BARGE_MAX - bargeTotal(p));
  else out[k] = Math.max(0, p[k] + d);
  return out;
}

/** A saved setup read back: a size it knows, counts that are whole and not below none, ten at most; missing, the start. */
export function parseBarge(o: unknown): BargeSetup {
  if (!o || typeof o !== 'object') return defaultBarge();
  const src = o as { size?: unknown; pick?: unknown };
  const size = (ARENA_SIZES as readonly unknown[]).includes(src.size)
    ? (src.size as ArenaSize)
    : 'medium';
  let pick = noPick();
  const p = (src.pick && typeof src.pick === 'object' ? src.pick : {}) as Record<string, unknown>;
  for (const k of BARGE_FOES) {
    const n = p[k];
    if (typeof n === 'number' && Number.isFinite(n) && n > 0)
      pick = bargeAdd(pick, k, Math.floor(n));
  }
  return { size, pick };
}

/**
 * Where n enemies stand when the fight starts, from the arena's middle, in an arena of radius r: in rows round its
 * back, away from where the figure comes in at its front, three in the nearest row, four in the next, the rest at the
 * back, each row spread round either side of the middle.
 */
export function arenaSpots(n: number, r: number): { x: number; y: number }[] {
  const back = (-3 * Math.PI) / 4;
  const rows: readonly { at: number; cap: number }[] = [
    { at: 0.38, cap: 3 },
    { at: 0.58, cap: 4 },
    { at: 0.78, cap: BARGE_MAX },
  ];
  const out: { x: number; y: number }[] = [];
  let left = n;
  for (const row of rows) {
    const k = Math.min(left, row.cap);
    const rad = r * row.at;
    // Spread so neighbours are about 40 apart, and never wider than round the back half.
    const step = Math.min(0.55, 40 / rad);
    for (let i = 0; i < k; i++) {
      const a = back + (i - (k - 1) / 2) * step;
      out.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
    }
    left -= k;
    if (left <= 0) break;
  }
  return out;
}
