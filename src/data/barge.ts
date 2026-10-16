/**
 * The Battle Barge, the kid's (his sixth list): "a place called the Battle Barge, free; customize the size of the map
 * in there, and all enemies can be summoned, a maximum of 10"; his answers: open anywhere, on the islands and out at
 * sea; it pays a coin, but it is mostly to get better, and for fun; you spawn in and pick what you fight and how many.
 * Built in stages, the owner's call: the first had the camps' and the undead's on-foot enemies, up to ten at once, in a
 * small, medium or large arena; the second adds the rest of those on foot, island 10's gorillas and gators, island 3's
 * swordsman and his three little demons, and the lancers from the ruins; the third brings the bosses, a few at a time,
 * those that fight in a room of their own first: the leviathan sorcerer, the Forgotten One, the Heron and the giant
 * pelican; then Cthulhu from the drowned temple, and the Old One, who rises out of the sea at the barge's back; then the
 * Reaper on land, off island 6's sand; then the Tar Anchorer, wading in the sea round the barge as it wades in its tar;
 * then island 10's spider, in a web strung between two posts on the deck, whom only bug spray beats.
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

/**
 * The on-foot enemies, in the card's order, island by island: the monkeys' and the hired men's camps, island 10's
 * gorillas and gators, island 3's swordsman and demons, and the undead of Gigantis, its lancers and the lagoon's.
 */
export type BargeFoe =
  | 'monkey'
  | 'hired'
  | 'gorilla'
  | 'gator'
  | 'swordsman'
  | 'red'
  | 'blue'
  | 'green'
  | 'skeleton'
  | 'archer'
  | 'zombie'
  | 'ghost'
  | 'necro'
  | 'lancer'
  | 'lagoon'
  | 'sorcerer'
  | 'forgotten'
  | 'heron'
  | 'pelican'
  | 'cthulhu'
  | 'oldone'
  | 'reaper'
  | 'anchorer'
  | 'spider';
export const BARGE_FOES: readonly BargeFoe[] = [
  'monkey',
  'hired',
  'gorilla',
  'gator',
  'swordsman',
  'red',
  'blue',
  'green',
  'skeleton',
  'archer',
  'zombie',
  'ghost',
  'necro',
  'lancer',
  'lagoon',
  'sorcerer',
  'forgotten',
  'heron',
  'pelican',
  'cthulhu',
  'oldone',
  'reaper',
  'anchorer',
  'spider',
];
/** The ones that are the undead's (entities/undead.ts). */
export const UNDEAD_FOES: readonly BargeFoe[] = [
  'skeleton',
  'archer',
  'zombie',
  'ghost',
  'necro',
  'lagoon',
];
/** The ones that are island 3's fighters (entities/fighter.ts): the swordsman and the three little demons. */
export const FIGHTER_FOES: readonly BargeFoe[] = ['swordsman', 'red', 'blue', 'green'];
/** The bosses, after the rest on the card, island by island. */
export const BOSS_FOES: readonly BargeFoe[] = [
  'sorcerer',
  'forgotten',
  'heron',
  'pelican',
  'cthulhu',
  'oldone',
  'reaper',
  'anchorer',
  'spider',
];
/** What each is called on the card, and a word on how it fights. */
export const FOE_NAMES: Readonly<Record<BargeFoe, readonly [string, string]>> = {
  monkey: ['Monkeys', 'Bonk you and throw coconuts. 2 hits each.'],
  hired: ["The Heron's hired men", 'Punch and throw stones. 3 hits each.'],
  gorilla: ['Gorillas', 'Slam the ground for 3 hearts: get out of the red ring. 7 hits.'],
  gator: ['Gators', 'When the jaws open wide, step away. 10 hits.'],
  swordsman: ['Swordsmen', 'Fast, dash in, and block one spear. 12 hits.'],
  red: ['Red demons', 'Slash, and block one spear. 4 hits.'],
  blue: ['Blue demons', 'Keep back and call up monkeys. 4 hits.'],
  green: ['Green demons', 'Slash and call up monkeys. 4 hits.'],
  skeleton: ['Skeletons', 'Swords and shields: the shield takes the first hit. 4 hits.'],
  archer: ['Skeleton archers', 'Shoot arrows from far off. 3 hits.'],
  zombie: ['Zombies', 'Slow, and tough. 8 hits.'],
  ghost: ['Ghosts', 'Keep back and send cold wisps. 3 hits.'],
  necro: ['Necromancers', 'Raise skeletons out of the floor. 6 hits.'],
  lancer: ['Lancers', 'Slow, with long lances: 2 hearts a thrust. 10 hits.'],
  lagoon: ['Lagoon creatures', 'Quick, with claws. 2 hits.'],
  sorcerer: [
    'The leviathan sorcerer',
    'Flies round throwing purple bolts, and swoops to peck. 8 hits.',
  ],
  forgotten: ['The Forgotten One', 'Skulls, a death ray, and his sword up close. 36 hits.'],
  heron: ['The Heron', 'Zaps down a pink line, and makes copies of himself. 14 hits.'],
  pelican: [
    'The giant pelican',
    'Spits fish and dives at the red ring. Hit it on the ground. 15 hits.',
  ],
  cthulhu: ['Cthulhu', 'Sends tentacles up through the deck: spear them down. 10 hits.'],
  oldone: [
    'The Old One',
    'Rises out of the sea, slams his hand down, and calls up lagoon creatures. 50 hits.',
  ],
  reaper: [
    'The Reaper on land',
    'Sweeps his tail and charges: step out of the red. Spear him when he rears up. 30 hits.',
  ],
  anchorer: [
    'The Tar Anchorer',
    'Wades round the barge and throws its anchor at the red ring; swings it round up close. 80 hits.',
  ],
  spider: [
    'The giant spider',
    'Wraps you up and hangs you in his web. Only bug spray beats him: 3 sprays.',
  ],
};

/** Ten at most, all told; and the prize for beating them all. */
export const BARGE_MAX = 10;
export const BARGE_PRIZE = 1;

export type BargePick = Record<BargeFoe, number>;
export type BargeSetup = { size: ArenaSize; pick: BargePick };

/** Nobody picked. */
export function noPick(): BargePick {
  const p = {} as BargePick;
  for (const k of BARGE_FOES) p[k] = 0;
  return p;
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
