/**
 * The pet system, the owner's (2026-10-24): "pet battles and pet boarding and a more structured pet system", and pets
 * the kid draws on the phone. One system for every pet. Its plan has nine pieces; this is the first, the pet book.
 *
 * The book is one home for everyone who is yours, on two shelves: the pets (cosy, never in a fight beside you) and the
 * companions (who fight beside you, as ever). The owner's call was to index the companions rather than rebuild them, so
 * nothing about how anyone is won, or what the save says about it, changes: the game says who is yours (the same
 * checks the roll-call board makes), and the book shows them, where each came from, where each is now, and the name
 * you have given it. A name is the one new thing saved, under `pets` (missing in old saves and read as none).
 *
 * Staying outside the book: what a companion summons mid-fight (the hamster, the ghost, the merlocks), the flotilla and
 * the hired boats, which are not friends you keep. The leggy muffins are in it, the owner's call, but they stay as they
 * are: they already follow you.
 */

import { COMPANION_NAMES, COMPANIONS, type Companion } from './stay';

/** The pets, as the book has them. The crows and the muffins have one card each, however many there are. */
export const PET_KEYS = ['dog', 'otter', 'neil', 'crows', 'muffins'] as const;
export type PetKey = (typeof PET_KEYS)[number];
/** Everyone in the book, pets first. */
export type BookKey = PetKey | Companion;
export const BOOK_KEYS: readonly BookKey[] = [...PET_KEYS, ...COMPANIONS];
export type Shelf = 'pets' | 'companions';

export const PET_NAMES: Readonly<Record<PetKey, string>> = {
  dog: 'The dog',
  otter: 'The otter',
  neil: 'Neil the seal',
  crows: 'The crows',
  muffins: 'The leggy muffins',
};

/** Where each came from, in a line. */
export const BOOK_FROM: Readonly<Record<BookKey, string>> = {
  dog: 'Came to live on the pier when you built the tree platform.',
  otter: 'Fed three fish off the home dock.',
  neil: 'Fed three ice fish at the edge of the ice floe.',
  crows: "Won with science questions at island 10's birdfeeder.",
  muffins: 'Fish muffins left in the box too long. They grew legs.',
  warlock: 'Freed from his cage under island 3, after the demons.',
  tarling: 'Your prize for beating the Tar Anchorer on island 4.',
  cat: 'Left behind when Cthulhu crumbled, under island 6.',
  warrior: 'Left behind when Cthulhu crumbled, under island 6.',
  bones: 'Got up and knelt to you when the Forgotten One fell.',
  naga: "Let out of the bamboo cage at island 2's monkey camp.",
  necro: 'Came away with you when the Heron was beaten for good.',
  baby: 'Hatched from the Reaper on land’s egg.',
  caterman: 'Came out of his workshop on island 11 once the Heron’s brother had gone.',
  parrot: 'Joined you when you signed on with the pirates.',
  bun: 'Joined you when you bowed to the ninjas.',
};

export function shelfOf(k: BookKey): Shelf {
  return (PET_KEYS as readonly string[]).includes(k) ? 'pets' : 'companions';
}

/** The name it had before you gave it one. */
export function defaultName(k: BookKey): string {
  return shelfOf(k) === 'pets' ? PET_NAMES[k as PetKey] : COMPANION_NAMES[k as Companion];
}

/** Whether a name can be given: one each, and not to the crows or the muffins, who are several. */
export function nameable(k: BookKey): boolean {
  return k !== 'crows' && k !== 'muffins';
}

/** A name is at most this long, which fits a card at 390 wide. */
export const NAME_MAX = 16;

/**
 * A name as typed, made fit to keep: control characters and angle brackets out, spaces squeezed, trimmed, cut to
 * NAME_MAX (by characters, so an emoji is never split). Empty means no name.
 */
export function cleanName(s: unknown): string {
  if (typeof s !== 'string') return '';
  const kept = [...s].filter((c) => {
    const n = c.codePointAt(0) ?? 0;
    return n >= 32 && n !== 127 && c !== '<' && c !== '>';
  });
  const t = kept.join('').replace(/\s+/g, ' ').trim();
  return [...t].slice(0, NAME_MAX).join('').trim();
}

/** What the pet system keeps. Names only, for now; the drawn pets, eggs and the pet house come in later pieces. */
export type PetSave = {
  /** The names you have given, by who; one renamed back to nothing is dropped. */
  nm: Partial<Record<BookKey, string>>;
};

export function noPets(): PetSave {
  return { nm: {} };
}

const isBookKey = (v: string): v is BookKey => (BOOK_KEYS as readonly string[]).includes(v);

/** The pet system's part of a save: missing in old saves, and read as nothing named. Whatever is odd is dropped. */
export function parsePets(v: unknown): PetSave {
  const p = noPets();
  if (!v || typeof v !== 'object' || Array.isArray(v)) return p;
  const nm = (v as { nm?: unknown }).nm;
  if (nm && typeof nm === 'object' && !Array.isArray(nm)) {
    for (const [k, name] of Object.entries(nm as Record<string, unknown>)) {
      const n = cleanName(name);
      if (isBookKey(k) && nameable(k) && n) p.nm[k] = n;
    }
  }
  return p;
}

/** For the save: left out while there is nothing in it, so the copy-my-game link stays short. */
export function petsForSave(p: PetSave): PetSave | undefined {
  return Object.keys(p.nm).length ? p : undefined;
}

/** What it is called now: the name you gave it, or the one it came with. */
export function nameOf(p: PetSave, k: BookKey): string {
  return p.nm[k] ?? defaultName(k);
}

/** Give it a name; an empty one gives it back the name it came with. Says whether anything changed. */
export function rename(p: PetSave, k: BookKey, name: unknown): boolean {
  if (!nameable(k)) return false;
  const n = cleanName(name);
  const was = p.nm[k];
  if (n && n !== defaultName(k)) p.nm[k] = n;
  else delete p.nm[k];
  return p.nm[k] !== was;
}

/** One card in the book: who, on which shelf, called what, and where it is now. */
export type BookEntry = {
  key: BookKey;
  shelf: Shelf;
  name: string;
  /** The name it came with, when it has been given another. */
  was: string | null;
  from: string;
  where: string;
};

/** What the game tells the book: whether each is yours, where it is, and how many crows and muffins there are. */
export type BookFacts = {
  has(k: BookKey): boolean;
  /** For a companion: left at the castle by the roll-call board. */
  atCastle(k: Companion): boolean;
  crows: number;
  muffins: number;
};

const PET_WHERE: Readonly<Record<PetKey, (f: BookFacts) => string>> = {
  dog: () => 'On the home pier. He follows you about when you walk the home island.',
  otter: () => 'Swims beside your boat, and climbs aboard when something is in the water.',
  neil: () => 'Swims beside your boat and rests on deck.',
  crows: (f) => `On your boat's rail: ${f.crows} of 3.`,
  muffins: (f) => `Following you about: ${f.muffins} of 6, and a cloud of stink.`,
};

/** Everyone who is yours, pets first, then the companions in the order they join you. */
export function bookEntries(p: PetSave, f: BookFacts): BookEntry[] {
  return BOOK_KEYS.filter((k) => f.has(k)).map((k) => {
    const shelf = shelfOf(k);
    const name = nameOf(p, k);
    const where =
      shelf === 'pets'
        ? PET_WHERE[k as PetKey](f)
        : f.atCastle(k as Companion)
          ? 'Waiting at the castle. The roll-call board in the courtyard calls them back.'
          : 'Comes with you.';
    return {
      key: k,
      shelf,
      name,
      was: name === defaultName(k) ? null : defaultName(k),
      from: BOOK_FROM[k],
      where,
    };
  });
}
