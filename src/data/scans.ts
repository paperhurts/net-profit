/**
 * The portable scanner, the kid's (the Forgotten One's gift, island 11): point it at a creature and it tells you how to
 * beat it, and what it is afraid of. "Yes, and tells weakness of it, like Star: he is afraid of bigger stuff, or the
 * Reaper: afraid of honey." What it says of each, here, is what the game does: the warning to watch for, when it can be
 * hit, and with what. The two weaknesses the kid gave are his, ahead of the game (asked: where honey comes from, and
 * what bigger stuff Star fears).
 */

/** Everything the scanner knows: the sea's beasts by the harpoon's names for them, then those met on foot. */
export const SCAN_KINDS = [
  'guard',
  'cthulu',
  'angler',
  'gulper',
  'meteor',
  'reaper',
  'king',
  'deep',
  'hired',
  'monkey',
  'hiredman',
  'gorilla',
  'gator',
  'spider',
  'pelican',
  'sorcerer',
  'heron',
  'orb',
  'swordsman',
  'red',
  'blue',
  'green',
  'anchorer',
  'cthulhu',
  'reaperland',
  'skeleton',
  'archer',
  'zombie',
  'ghost',
  'necro',
  'lagoon',
  'lancer',
  'forgotten',
  'oldone',
  'brother',
] as const;
export type ScanKind = (typeof SCAN_KINDS)[number];

export type Scan = {
  /** What it is called. */
  name: string;
  /** How to beat it. */
  beat: string;
  /** What it is afraid of, or weak to, when there is something. */
  weak?: string;
};

export const isScanKind = (k: unknown): k is ScanKind =>
  typeof k === 'string' && (SCAN_KINDS as readonly string[]).includes(k);

/** How long a scan takes, its beam out to the creature and back. */
export const SCAN_TIME = 0.9;
/** How far the scanner reaches from the boat. On foot it reaches as far as the spear. */
export const SCAN_SEA = 260;

/** What the scanner says of each. Work in progress: stand-ins until each is checked against the game. */
export const SCANS: Record<ScanKind, Scan> = Object.fromEntries(
  SCAN_KINDS.map((k) => [
    k,
    { name: k, beat: 'Scanned. Its secrets are still being written down.' },
  ]),
) as Record<ScanKind, Scan>;
