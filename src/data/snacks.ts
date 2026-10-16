/**
 * The old man's store on island 10's prairie, the kid's: "a little old man with a beard and cowboy hat in a rocking
 * chair who tells dad jokes", and "snacks that give speed buff (apple) attack buff (carrots) on a time limit and a
 * banana that gives you heals". He sells them cheap; they go in a snack bag and are eaten from the hearts' row when
 * wanted, as the fish muffins are. The radar upgrade, the badges, the bug spray and the submarine join his shelf
 * later. His jokes come round in order, a new one each time he is tapped.
 */

export type SnackKind = 'apple' | 'carrot' | 'banana';
export const SNACK_KINDS: readonly SnackKind[] = ['apple', 'carrot', 'banana'];

export type Snack = {
  name: string;
  /** Coins, from the old man. */
  price: number;
  /** What it says on his shelf. */
  blurb: string;
};

export const SNACKS: Readonly<Record<SnackKind, Snack>> = {
  apple: { name: 'Apple', price: 25, blurb: 'Crunch! You walk half again as fast for 30 seconds.' },
  carrot: { name: 'Carrot', price: 40, blurb: 'Your spear hits twice as hard for 30 seconds.' },
  banana: { name: 'Banana', price: 30, blurb: 'Two hearts back, right away.' },
};

/** Seconds an apple or a carrot lasts; how much faster an apple walks you; how much harder a carrot hits. */
export const SNACK_FOR = 30;
export const APPLE_PACE = 1.5;
export const CARROT_POWER = 2;
/** Hearts a banana gives back. */
export const BANANA_HEARTS = 2;
/** Most of each kind the bag holds. */
export const SNACK_MAX = 9;

/**
 * Bug spray, on his shelf too: the only thing that beats the swamp's giant spider (entities/spider10.ts). A can is so
 * many sprays; the bag holds so many at most.
 */
export const BUG_SPRAY = {
  name: 'Bug spray',
  price: 50,
  sprays: 6,
  blurb: "Six sprays. The only thing that beats the swamp's giant spider.",
} as const;
export const SPRAY_MAX = 30;

/** Sprays of bug spray from the save, a whole number 0..SPRAY_MAX; anything else is none. */
export function parseSprays(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n)
    ? Math.max(0, Math.min(SPRAY_MAX, Math.floor(n)))
    : 0;
}

/**
 * Honey, the kid's: both Reapers are afraid of it ("he stops and shakes your boat and runs splashing"). The owner's
 * call (2026-10-16): the old man sells it, a jar for 3,000, and the bees in the forest make it too, a jar a day from
 * their hive. A jar is used up each time; the bag holds so many.
 */
export const HONEY = {
  name: 'Honey',
  price: 3000,
  blurb: 'A jar of honey. The Reaper is afraid of it! Tap the jar near him and he runs off.',
} as const;
export const HONEY_MAX = 5;
/** At sea a jar works whenever the Reaper is after the boat, wherever he is circling; ashore, this near the figure. */
export const HONEY_LAND = 170;
/** How near the forest's beehive the figure must be to take a jar. */
export const HIVE_REACH = 60;

/** Jars of honey from the save, a whole number 0..HONEY_MAX; anything else is none. */
export function parseHoney(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n)
    ? Math.max(0, Math.min(HONEY_MAX, Math.floor(n)))
    : 0;
}

export type Snacks = Record<SnackKind, number>;

export function noSnacks(): Snacks {
  return { apple: 0, carrot: 0, banana: 0 };
}

/** A snack bag from the save, whole numbers 0..SNACK_MAX of each; anything else is none. */
export function parseSnacks(o: unknown): Snacks {
  const out = noSnacks();
  if (!o || typeof o !== 'object') return out;
  for (const k of SNACK_KINDS) {
    const n = (o as Record<string, unknown>)[k];
    if (typeof n === 'number' && Number.isFinite(n))
      out[k] = Math.max(0, Math.min(SNACK_MAX, Math.floor(n)));
  }
  return out;
}

/** His jokes, in the order he tells them. Some are about what lives on his island. */
export const DAD_JOKES: readonly string[] = [
  "Why don't fish play basketball? They're afraid of the net!",
  'What do you call an alligator in a vest? An investigator!',
  'Why did the scarecrow win an award? He was outstanding in his field!',
  'What do you call a fish with no eyes? A fsh!',
  'Why do gorillas have big nostrils? Because they have big fingers!',
  'What does a pelican eat? Anything that fits the bill!',
  'Why are fish so smart? They live in schools!',
  'What do you call a sleeping bull? A bulldozer!',
  'Why did the banana go to the doctor? It wasn’t peeling well!',
  'Why did the crow sit on the telephone wire? To make a long-distance caw!',
  'What do you call a bear with no teeth? A gummy bear!',
  'What did the ocean say to the beach? Nothing. It just waved!',
  'Why don’t eggs tell jokes? They’d crack each other up!',
  'I used to hate facial hair. But then it grew on me.',
  'What do you call an apple that plays the trumpet? A tooty fruity!',
  'Why couldn’t the bicycle stand up? It was two tired!',
  'What did one hat say to the other? You stay here. I’ll go on ahead!',
  'What kind of horse goes out after dark? A nightmare!',
];
