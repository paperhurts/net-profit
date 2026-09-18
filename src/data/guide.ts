/**
 * The field guide: the catch log grown into a book you can open and read
 * on the phone. A page per species with a line about it, where its schools
 * ring the island and what boat reaches them, when it is about, what it is
 * worth, how many you have landed and the day you landed the first. A
 * species you have not caught keeps its name and its line to itself but
 * still tells you where to look. Line-caught fish, sizes and the legendary
 * pages come with the bridge and the second verb.
 */
import { RANGE, SPECIES, TIER_NAME } from './tuning';

/** Where a species' schools sit: the ring's near and far edge, and whether they only rise at night. */
export type Habitat = { r0: number; r1: number; night?: boolean };

/** The rings, straight from the world builder's ringOf calls; a test holds them to it. */
export const HABITAT: Readonly<Record<number, Habitat>> = {
  0: { r0: 560, r1: 700 },
  1: { r0: 900, r1: 1060 },
  2: { r0: 1260, r1: 1440 },
  3: { r0: 1620, r1: 1780 },
  4: { r0: 1960, r1: 2120 },
  5: { r0: 2280, r1: 2440 },
  6: { r0: 2850, r1: 3150 },
  8: { r0: 950, r1: 1450, night: true },
  9: { r0: 1900, r1: 2450, night: true },
};

/** Species index of the shark, the dawn rare and the dusk rare. */
export const SHARK_SP = 7;
export const DAWN_SP = 10;
export const DUSK_SP = 11;

/** One line per species, in the game's voice. */
export const BLURBS: readonly string[] = [
  'Small, quick and everywhere near the shore. The first thing in every net.',
  'Striped and fast. Schools just past the shallows, where the water turns.',
  'Red as a buoy. Likes the middle rings and a net towed straight.',
  'Round, slow, and worth the trip out. Sells well; no one asks why.',
  'Big, silver and deep. The smokehouse pays half again for them.',
  'A flash of gold at the far ring. Sharks keep them company.',
  'Farthest out of all, and they glow after dark. Bring a boat that can get there.',
  'Charges a moving net. A wide enough net holds one; a lesser one tears. Sells for plenty.',
  'Rises after dark, pale and glowing, in the middle water. Gone by morning.',
  'Night fish of the far rings, each one a small light. Worth the dark.',
  'Once a dawn, somewhere inside your range, sparkling. Eighty seconds, then gone.',
  'Once a dusk, the same, and worth even more. The prettiest thing you will land.',
];

/** The smallest boat whose range reaches a ring's near edge, by the orders' own rule. */
export function boatFor(r0: number): string {
  const t = RANGE.findIndex((r) => r >= r0 + 120);
  return TIER_NAME[t < 0 ? TIER_NAME.length - 1 : t] as string;
}

const cap = (s: string): string => s[0]?.toUpperCase() + s.slice(1);

export function whereText(sp: number): string {
  const h = HABITAT[sp];
  if (h) return `Schools ${h.r0} to ${h.r1} out. ${cap(boatFor(h.r0))} range.`;
  if (sp === SHARK_SP) return 'Circling the tuna, goldfin and lanternfish schools.';
  if (sp === DAWN_SP || sp === DUSK_SP) return 'Anywhere inside your range, past the shallows.';
  return 'Out there somewhere.';
}

export function whenText(sp: number): string {
  const h = HABITAT[sp];
  if (h?.night) return 'At night. Glows.';
  if (h) return SPECIES[sp]?.glow ? 'By day; glows after dark.' : 'By day.';
  if (sp === SHARK_SP) return 'Day and night. A net of level 3 holds one.';
  if (sp === DAWN_SP) return 'Dawn, for eighty seconds.';
  if (sp === DUSK_SP) return 'Dusk, for eighty seconds.';
  return '';
}

export type GuidePage = {
  name: string;
  known: boolean;
  blurb: string;
  where: string;
  when: string;
  worth: string;
  caught: string;
};

/** A species' page, given how many the player has landed and the day of the first. */
export function guidePage(sp: number, count: number, firstDay: number): GuidePage {
  const S = SPECIES[sp];
  if (!S) throw new Error(`no species ${sp}`);
  const known = count > 0;
  const times = count === 1 ? 'Caught once' : `Caught ${count} times`;
  return {
    name: known ? cap(S.name) : '?',
    known,
    blurb: known ? (BLURBS[sp] ?? '') : 'Not caught yet.',
    where: whereText(sp),
    when: whenText(sp),
    worth: `${S.v} coins`,
    caught: known ? `${times}${firstDay > 0 ? `, first on day ${firstDay}` : ''}` : 'None yet',
  };
}
