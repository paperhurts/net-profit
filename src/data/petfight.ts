/**
 * Pet battles, the pet system's seventh piece (data/petsys.ts): what a pet brings to a fight and who it fights. The
 * owner's call (2026-10-24): you steer your pet, one on one, in real time, never turn-based (the kid's rule). The fight
 * itself is entities/petfight.ts; this is the numbers and the names.
 *
 * Every pet of your own can battle. A hatched one fights the way its kind does, with its kind's special; a drawn one's
 * owner picks once, at its first battle, how it fights (speedy, strong or tough) and its special, because stats never
 * come from the drawing: a scribble should not lose to a neat one. Levels (data/training.ts) add a little: a heart at
 * levels 4, 7 and 10, and a little speed every level.
 *
 * Health is counted in half hearts: a bite takes a whole heart, a spit half of one. Losing costs nothing (pillar 5):
 * the pet goes back to the house and is fine at once. The trainers and their pets are stand-ins until the kid's.
 */
import { HATCHLING_ART } from './eggs';

/** How a drawn pet fights, picked once. */
export type Build = 'speedy' | 'strong' | 'tough';
export const BUILDS: readonly Build[] = ['speedy', 'strong', 'tough'];
export const BUILD_NAMES: Readonly<Record<Build, string>> = {
  speedy: 'Speedy',
  strong: 'Strong',
  tough: 'Tough',
};
export const BUILD_SAYS: Readonly<Record<Build, string>> = {
  speedy: 'Runs faster.',
  strong: 'Bites harder.',
  tough: 'An extra heart.',
};

/** The specials: a leap at the other pet, a spit from afar, a roar that dazes, a curl that nothing gets through. */
export type Special = 'pounce' | 'spit' | 'roar' | 'curl';
export const SPECIALS: readonly Special[] = ['pounce', 'spit', 'roar', 'curl'];
export const SPECIAL_NAMES: Readonly<Record<Special, string>> = {
  pounce: 'Pounce',
  spit: 'Spit',
  roar: 'Roar',
  curl: 'Curl',
};
export const SPECIAL_SAYS: Readonly<Record<Special, string>> = {
  pounce: 'Leaps at the other pet.',
  spit: 'Spits from far away.',
  roar: 'Dazes the other pet.',
  curl: 'Curls up: nothing gets through, and it is spiky.',
};
/** Seconds before each special can be used again. */
export const SPECIAL_COOL: Readonly<Record<Special, number>> = {
  pounce: 4,
  spit: 2.5,
  roar: 6,
  curl: 5,
};

/** Each hatched kind's way of fighting, and what its special is called. Stand-ins until the kid's. */
export const KIND_FIGHT: Readonly<
  Record<string, { build: Build; special: Special; name: string }>
> = {
  bunny: { build: 'speedy', special: 'pounce', name: 'Hop' },
  frog: { build: 'speedy', special: 'spit', name: 'Spit' },
  ladybird: { build: 'tough', special: 'spit', name: 'Spot shot' },
  hedgehog: { build: 'tough', special: 'curl', name: 'Curl' },
  fox: { build: 'strong', special: 'pounce', name: 'Pounce' },
  moth: { build: 'strong', special: 'roar', name: 'Dazzle' },
};

/** Half hearts. */
export const HEART = 2;
export const BASE_HEARTS = 5;
export const MAX_HEARTS = 8;
/** World units a second; the figure walks at 85. */
export const PET_SPEED = 72;

/** A fighter's numbers. */
export type FightStats = {
  hp: number;
  speed: number;
  bite: number;
  special: Special;
  /** What its special is called on the button. */
  specialName: string;
};

/** A pet of your own's numbers, from how it fights and its level. */
export function petStats(
  build: Build,
  special: Special,
  lv: number,
  specialName?: string,
): FightStats {
  const l = Math.max(1, Math.min(10, Math.floor(lv) || 1));
  const hearts = Math.min(
    MAX_HEARTS,
    BASE_HEARTS +
      (l >= 4 ? 1 : 0) +
      (l >= 7 ? 1 : 0) +
      (l >= 10 ? 1 : 0) +
      (build === 'tough' ? 1 : 0),
  );
  return {
    hp: hearts * HEART,
    speed: PET_SPEED * (1 + (l - 1) * 0.02) * (build === 'speedy' ? 1.2 : 1),
    bite: build === 'strong' ? 3 : 2,
    special,
    specialName: specialName ?? SPECIAL_NAMES[special],
  };
}

/** What a hit of each kind takes, in half hearts, before strong's extra. */
export const HIT = { spit: 1, pounce: 3, spikes: 1, bigSpikes: 3 } as const;

/** The big moves a trainer's pet winds up, shown on the ground in red first. */
export type BigMove = 'slam' | 'charge';

/** A trainer and their pet. */
export type Trainer = {
  id: string;
  name: string;
  /** A line, on the card. */
  says: string;
  pet: string;
  /** The pet's drawing, in the pad's strokes. */
  art: string;
  hp: number;
  speed: number;
  /** Its nip, in half hearts, and how long it winds it up. */
  nip: number;
  nipWind: number;
  /** Its big moves, how long each is shown in red first, what they take, and seconds between them. */
  moves: readonly BigMove[];
  wind: number;
  big: number;
  every: number;
  /** How wide its slam's ring is. */
  slamR: number;
  /** For a win: experience, and coins. */
  xp: number;
  coins: number;
  /** The level it is meant for: a person's hand at this level beats it every time, with any build and special. */
  lv: number;
  /** Its ribbon's colour; the champion gives a cup instead. */
  ribbon: string;
  cup?: boolean;
};

/** A drawing in another colour: every stroke of colour `from` drawn in `to` (data/doodle.ts letters). */
export function recolour(art: string, from: string, to: string): string {
  return art
    .split('.')
    .map((s) => (s.startsWith(from) ? to + s.slice(1) : s))
    .join('.');
}

/**
 * The trainers who come to the pet house's ring, easiest first. Only the first so far; the ladder (the plan's next
 * piece) adds the rest and the champion. Stand-ins until the kid's.
 */
export const TRAINERS: readonly Trainer[] = [
  {
    id: 't1',
    name: 'Pip',
    says: 'Pip and her sea fox Scamp. Your first trainer: Scamp is slow, and shows you every slam.',
    pet: 'Scamp',
    art: recolour(HATCHLING_ART.fox ?? '', 'B', 'E'),
    hp: 30,
    speed: 46,
    nip: 1,
    nipWind: 0.45,
    moves: ['slam'],
    wind: 1.1,
    big: 4,
    every: 3.5,
    slamR: 24,
    xp: 80,
    coins: 60,
    lv: 1,
    ribbon: '#3D7DD8',
  },
  {
    id: 't2',
    name: 'Moss',
    says: 'Moss and his hedgehog Bramble. Bramble never slams: it rolls at you in a straight line. Step off the red lane.',
    pet: 'Bramble',
    art: recolour(HATCHLING_ART.hedgehog ?? '', 'A', 'D'),
    hp: 36,
    speed: 46,
    nip: 1,
    nipWind: 0.45,
    moves: ['charge'],
    wind: 1.05,
    big: 4,
    every: 3.4,
    slamR: 24,
    xp: 110,
    coins: 80,
    lv: 2,
    ribbon: '#4C9A45',
  },
  {
    id: 't3',
    name: 'Wren',
    says: 'Wren and her bunny Gusty. Gusty slams, then rolls, then slams: watch which red it is.',
    pet: 'Gusty',
    art: recolour(HATCHLING_ART.bunny ?? '', 'A', 'C'),
    hp: 38,
    speed: 52,
    nip: 1,
    nipWind: 0.4,
    moves: ['slam', 'charge'],
    wind: 1,
    big: 4,
    every: 3.2,
    slamR: 24,
    xp: 140,
    coins: 100,
    lv: 3,
    ribbon: '#F2B233',
  },
  {
    id: 't4',
    name: 'Ida',
    says: 'Ida and her frog Pebble. Pebble is quick: its red comes and goes faster than anyone else so far.',
    pet: 'Pebble',
    art: recolour(HATCHLING_ART.frog ?? '', 'D', 'F'),
    hp: 40,
    speed: 54,
    nip: 1,
    nipWind: 0.35,
    moves: ['slam', 'charge'],
    wind: 0.9,
    big: 4,
    every: 3,
    slamR: 24,
    xp: 180,
    coins: 130,
    lv: 4,
    ribbon: '#F28DB2',
  },
  {
    id: 't5',
    name: 'Fen',
    says: 'Old Fen and his moth Dusk. Dusk is slow, but its slam covers a lot more ground. Go early.',
    pet: 'Dusk',
    art: recolour(recolour(HATCHLING_ART.moth ?? '', 'E', 'A'), 'F', 'D'),
    hp: 44,
    speed: 48,
    nip: 1,
    nipWind: 0.45,
    moves: ['slam'],
    wind: 1.05,
    big: 5,
    every: 3,
    slamR: 30,
    xp: 220,
    coins: 160,
    lv: 5,
    ribbon: '#8E6CC9',
  },
  {
    id: 'champ',
    name: 'Cora',
    says: 'Cora the champion, and her ladybird Ember. Ember does it all, and fast. Beat her and the cup is yours.',
    pet: 'Ember',
    art: HATCHLING_ART.ladybird ?? '',
    hp: 50,
    speed: 58,
    nip: 1,
    nipWind: 0.35,
    moves: ['slam', 'charge'],
    wind: 0.9,
    big: 5,
    every: 2.8,
    slamR: 28,
    xp: 300,
    coins: 250,
    lv: 7,
    ribbon: '#E2B33C',
    cup: true,
  },
];

/** Whether a trainer will fight you yet: the first always, each after once the one before is beaten. */
export function trainerOpen(i: number, won: readonly string[]): boolean {
  const before = TRAINERS[i - 1];
  return i === 0 || (!!before && won.includes(before.id));
}

export function trainerOf(id: string): Trainer | undefined {
  return TRAINERS.find((t) => t.id === id);
}
