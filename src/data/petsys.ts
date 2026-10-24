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

import { decode, encode, type Stroke } from './doodle';
import { type Egg, parseEggs } from './eggs';
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
export function nameable(k: EntryKey): boolean {
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

/** A pet drawn on the pad (data/doodle.ts): its number, the name given it, the drawing, and when it was drawn. */
export type DrawnPet = { id: number; nm: string; d: string; got: number };
/** The most drawn pets kept at once; another means letting one go. It keeps the save, and the link, small. */
export const DRAWN_MAX = 4;
/** A drawn pet's place in the book: d and its number. */
export type DrawnKey = `d${number}`;
/** Anyone in the book: one of the pets and companions the game has, or one you drew. */
export type EntryKey = BookKey | DrawnKey;

export const drawnKey = (id: number): DrawnKey => `d${id}`;
export function isDrawnKey(k: string): k is DrawnKey {
  return /^d\d+$/.test(k);
}

/** What the pet system keeps: the names given, the pets drawn, the one walking with you, and eggs. */
export type PetSave = {
  /** The names you have given, by who; one renamed back to nothing is dropped. */
  nm: Partial<Record<BookKey, string>>;
  /** The pets you drew, oldest first. */
  drawn: DrawnPet[];
  /** The one pet that walks with you, ashore and aboard, if any: a pet you drew, for now. */
  walk: EntryKey | null;
  /** Eggs waiting to hatch (data/eggs.ts), three at most. */
  eggs: Egg[];
};

export function noPets(): PetSave {
  return { nm: {}, drawn: [], walk: null, eggs: [] };
}

const isBookKey = (v: string): v is BookKey => (BOOK_KEYS as readonly string[]).includes(v);
const whole = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;

/** The pet system's part of a save: missing in old saves, and read as nothing named or drawn. What is odd is dropped. */
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
  const drawn = (v as { drawn?: unknown }).drawn;
  if (Array.isArray(drawn)) {
    for (const o of drawn) {
      if (p.drawn.length >= DRAWN_MAX) break;
      if (!o || typeof o !== 'object') continue;
      const r = o as Record<string, unknown>;
      const strokes = decode(r.d);
      const id = whole(r.id);
      if (!strokes.length || p.drawn.some((q) => q.id === id)) continue;
      p.drawn.push({
        id,
        nm: cleanName(r.nm) || DRAWN_NAME,
        d: encode(strokes),
        got: whole(r.got),
      });
    }
  }
  const walk = (v as { walk?: unknown }).walk;
  if (typeof walk === 'string' && isDrawnKey(walk) && drawnOf(p, walk)) p.walk = walk;
  p.eggs = parseEggs((v as { eggs?: unknown }).eggs);
  return p;
}

/** For the save: left out while there is nothing in it, so the copy-my-game link stays short. */
export function petsForSave(p: PetSave): Partial<PetSave> | undefined {
  const out: Partial<PetSave> = {};
  if (Object.keys(p.nm).length) out.nm = p.nm;
  if (p.drawn.length) out.drawn = p.drawn;
  if (p.walk) out.walk = p.walk;
  if (p.eggs.length) out.eggs = p.eggs;
  return Object.keys(out).length ? out : undefined;
}

/** A drawn pet with no name given. */
export const DRAWN_NAME = 'Doodle';

export function drawnOf(p: PetSave, k: EntryKey): DrawnPet | undefined {
  return isDrawnKey(k) ? p.drawn.find((d) => drawnKey(d.id) === k) : undefined;
}

/** What it is called now: the name you gave it, or the one it came with. */
export function nameOf(p: PetSave, k: EntryKey): string {
  if (isDrawnKey(k)) return drawnOf(p, k)?.nm ?? DRAWN_NAME;
  return p.nm[k] ?? defaultName(k);
}

/**
 * Give it a name; an empty one gives it back the name it came with (a drawn pet keeps the one it has). Says whether
 * anything changed.
 */
export function rename(p: PetSave, k: EntryKey, name: unknown): boolean {
  const n = cleanName(name);
  if (isDrawnKey(k)) {
    const d = drawnOf(p, k);
    if (!d || !n || n === d.nm) return false;
    d.nm = n;
    return true;
  }
  if (!nameable(k)) return false;
  const was = p.nm[k];
  if (n && n !== defaultName(k)) p.nm[k] = n;
  else delete p.nm[k];
  return p.nm[k] !== was;
}

/** Whether there is room for another drawn pet. */
export function canDraw(p: PetSave): boolean {
  return p.drawn.length < DRAWN_MAX;
}

/** A drawing kept as a pet, with its name; none if it is empty or there is no room. */
export function addDrawn(
  p: PetSave,
  strokes: readonly Stroke[],
  name: unknown,
  now: number,
): DrawnPet | null {
  if (!strokes.length || !canDraw(p)) return null;
  const d: DrawnPet = {
    id: p.drawn.reduce((m, q) => Math.max(m, q.id + 1), 1),
    nm: cleanName(name) || DRAWN_NAME,
    d: encode(strokes),
    got: Math.max(0, Math.floor(now)),
  };
  p.drawn.push(d);
  return d;
}

/** A drawn pet let go, to live on the island. Says whether there was one. */
export function letGo(p: PetSave, k: EntryKey): boolean {
  const n = p.drawn.length;
  p.drawn = p.drawn.filter((d) => drawnKey(d.id) !== k);
  if (p.walk === k) p.walk = null;
  return p.drawn.length < n;
}

/** Take a pet along, the one that walks with you; or, already walking, leave it in the book. Says whether it walks now. */
export function toggleWalk(p: PetSave, k: EntryKey): boolean {
  if (!isDrawnKey(k) || !drawnOf(p, k)) return false;
  p.walk = p.walk === k ? null : k;
  return p.walk === k;
}

/** One card in the book: who, on which shelf, called what, and where it is now. */
export type BookEntry = {
  key: EntryKey;
  shelf: Shelf;
  name: string;
  /** The name it came with, when it has been given another. */
  was: string | null;
  from: string;
  where: string;
  /** A drawn pet's drawing, as saved. */
  doodle?: string;
  /** The one walking with you. */
  walking?: boolean;
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

/** Everyone who is yours: the pets, then the pets you drew, then the companions in the order they join you. */
export function bookEntries(p: PetSave, f: BookFacts): BookEntry[] {
  const fixed = BOOK_KEYS.filter((k) => f.has(k)).map((k): BookEntry => {
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
  const drawn = p.drawn.map(
    (d): BookEntry => ({
      key: drawnKey(d.id),
      shelf: 'pets',
      name: d.nm,
      was: null,
      from: 'You drew this one.',
      where:
        p.walk === drawnKey(d.id)
          ? 'Walks with you, ashore and aboard. Tap it to pet it.'
          : 'In your pet book. Take it along and it walks with you.',
      walking: p.walk === drawnKey(d.id),
      doodle: d.d,
    }),
  );
  const at = fixed.findIndex((e) => e.shelf === 'companions');
  return at < 0 ? [...fixed, ...drawn] : [...fixed.slice(0, at), ...drawn, ...fixed.slice(at)];
}
