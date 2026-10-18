/**
 * Your friends at your headquarters, the kid's ("i meant you chose companions there": the headquarters is where you pick
 * which companions come with you). At the roll-call board in Gigantis's courtyard, each friend you have can come with
 * you, as they always have, or stay at the castle: then they come nowhere with you, not ashore and not on the boats,
 * and wait for you in the courtyard, until you call them back at the board.
 */

/** Everyone who walks with you, in the order they join you. */
export const COMPANIONS = [
  'warlock',
  'tarling',
  'cat',
  'warrior',
  'bones',
  'naga',
  'necro',
  'baby',
  'caterman',
] as const;
export type Companion = (typeof COMPANIONS)[number];

export const COMPANION_NAMES: Readonly<Record<Companion, string>> = {
  warlock: 'Warlock',
  tarling: 'Tarling',
  cat: 'Cat',
  warrior: 'Warrior',
  bones: 'Skeleton',
  naga: 'Naga',
  necro: 'Necromancer',
  baby: 'Baby Reaper',
  caterman: 'Caterman',
};

/** What each does for you, on the roll-call board. */
export const COMPANION_BLURBS: Readonly<Record<Companion, string>> = {
  warlock: 'Throws his bolts at whatever you fight, and his boat sails with yours.',
  tarling: 'Spits tar at whatever you fight, sticking it there a moment.',
  cat: 'Heals you twice a fight, and more after a fish.',
  warrior: 'Goes in close and hits for 2.',
  bones: 'Hit for 2, and raise a ghost and a skeleton to fight for you.',
  naga: 'Has the longest reach, and swims beside the boat at sea.',
  necro: 'Raises his skeleton hamster to fight for you.',
  baby: 'Nips whatever you fight, and swims off the bow at sea.',
  caterman: 'Zaps from further off, with the blaster he built.',
};

const isCompanion = (v: unknown): v is Companion => COMPANIONS.includes(v as Companion);

/** Who stays at the castle, out of a save: missing in old saves, and read as nobody. */
export function parseStay(v: unknown): Companion[] {
  return Array.isArray(v) ? [...new Set(v.filter(isCompanion))] : [];
}

/** The roll-call board, at the courtyard's right, past the telescope and clear of the portal; how near to use it. */
export const ROSTER_AT = { dx: 140, dy: 15 } as const;
export const ROSTER_REACH = 30;

/**
 * Where each friend left at the castle waits, about the courtyard: clear of everything in it and of each other, none
 * behind the portal's ring or the telescope where it could not be seen, the tall ones toward the back.
 */
export const WAIT_AT: Readonly<Record<Companion, { dx: number; dy: number }>> = {
  bones: { dx: -28, dy: -96 },
  necro: { dx: -100, dy: -32 },
  warlock: { dx: -32, dy: -36 },
  caterman: { dx: 36, dy: -32 },
  warrior: { dx: -24, dy: 52 },
  cat: { dx: -68, dy: 64 },
  naga: { dx: 16, dy: 44 },
  baby: { dx: 40, dy: 20 },
  tarling: { dx: 100, dy: 32 },
};
