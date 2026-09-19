/**
 * Balance tables, moved verbatim from the prototype script. Values, order and
 * array indices are unchanged: species are still coupled by index (shark is 7,
 * the night glowers are 8 and 9, the sparkle rares 10 and 11) until Phase 2
 * gives them string ids. project.md's tuning tables are authoritative, and
 * tests/unit/tuning.test.ts checks these against them.
 */

/** Highest upgrade level index; levels run 0..5, six in all. */
export const MAXLV = 5;

/** Net width in world units per level. */
export const NETW = [52, 68, 88, 112, 140, 170] as const;
/** Hold capacity in fish per level. */
export const HOLD = [12, 20, 32, 50, 80, 120] as const;
/** Top speed in world units per second per level. */
export const SPEED = [175, 205, 240, 275, 315, 350] as const;
/** Coin cost of buying level n+1, indexed by the level you have. */
export const COST = {
  net: [8, 20, 45, 100, 220],
  hold: [6, 16, 40, 90, 200],
  engine: [10, 25, 60, 130, 280],
} as const;

export type Species = {
  name: string;
  /** Plural, for orders and toasts. */
  pl: string;
  /** Sale value in coins before the palace bonus. */
  v: number;
  /** Body colour. */
  c: string;
  /** Body length in world units. */
  s: number;
  /** Body height as a fraction of length. */
  fat: number;
  /** Tail size relative to the body. */
  tail: number;
  /** Stripe or marking colour, if any. */
  mark?: string;
  /** Draw a spot on the flank. */
  dot?: boolean;
  /** Glows at night. */
  glow?: boolean;
  /** A dawn or dusk sparkle rare. */
  rare?: boolean;
};

export const SPECIES: readonly Species[] = [
  { name: 'sardine', pl: 'sardines', v: 1, c: '#DCEBEE', s: 6, fat: 0.4, tail: 0.8 },
  {
    name: 'mackerel',
    pl: 'mackerel',
    v: 2,
    c: '#6FC3D6',
    s: 8,
    fat: 0.34,
    tail: 0.85,
    mark: '#2C5F7C',
  },
  { name: 'snapper', pl: 'snapper', v: 4, c: '#FF8E7E', s: 8.5, fat: 0.52, tail: 0.8 },
  {
    name: 'pufferfish',
    pl: 'pufferfish',
    v: 6,
    c: '#F1D77A',
    s: 6.5,
    fat: 0.86,
    tail: 0.5,
    mark: '#B98F3A',
    dot: true,
  },
  { name: 'tuna', pl: 'tuna', v: 9, c: '#2C4A7C', s: 13, fat: 0.4, tail: 0.95, mark: '#9FB6D9' },
  { name: 'goldfin', pl: 'goldfin', v: 14, c: '#FFD24A', s: 9, fat: 0.45, tail: 0.9 },
  {
    name: 'lanternfish',
    pl: 'lanternfish',
    v: 22,
    c: '#7CF5E6',
    s: 6.5,
    fat: 0.45,
    tail: 0.7,
    mark: '#FFFFFF',
    dot: true,
    glow: true,
  },
  { name: 'shark', pl: 'sharks', v: 40, c: '#7D8C9A', s: 12, fat: 0.35, tail: 1 },
  {
    name: 'moonfish',
    pl: 'moonfish',
    v: 10,
    c: '#B9A6FF',
    s: 8,
    fat: 0.58,
    tail: 0.8,
    mark: '#FFFFFF',
    dot: true,
    glow: true,
  },
  {
    name: 'starfin',
    pl: 'starfin',
    v: 18,
    c: '#8CFFB0',
    s: 8.5,
    fat: 0.4,
    tail: 0.95,
    mark: '#FFFFFF',
    dot: true,
    glow: true,
  },
  {
    name: 'sunrise koi',
    pl: 'sunrise koi',
    v: 60,
    c: '#FFB36B',
    s: 14,
    fat: 0.45,
    tail: 1.1,
    rare: true,
  },
  {
    name: 'dusk ray',
    pl: 'dusk rays',
    v: 90,
    c: '#E58CFF',
    s: 15,
    fat: 0.72,
    tail: 0.6,
    rare: true,
  },
];

/** Index of the shark in SPECIES. */
export const SHARK = 7;

/** Inner radius of each day species' ring of schools, by species index. */
export const RING_R = [560, 900, 1260, 1620, 1960, 2280, 2850] as const;

/** One ring of schools round the island. */
export type Ring = {
  /** Schools in the ring. */
  n: number;
  /** Near and far edge, from the island. */
  r0: number;
  r1: number;
  /** Species index. */
  sp: number;
  /** Fish per school, and the school's radius. */
  count: number;
  rad: number;
  /** Angle of the first school, radians. */
  base: number;
  /** Rises only at night. */
  night?: boolean;
};

/** Where the fish are, in the order the world is built; the order matters, because the builder draws from one seeded stream. */
export const RINGS: readonly Ring[] = [
  { n: 5, r0: 560, r1: 700, sp: 0, count: 46, rad: 105, base: 0.3 },
  { n: 5, r0: 900, r1: 1060, sp: 1, count: 42, rad: 105, base: 1.1 },
  { n: 5, r0: 1260, r1: 1440, sp: 2, count: 40, rad: 100, base: 0.6 },
  { n: 4, r0: 1620, r1: 1780, sp: 3, count: 20, rad: 80, base: 2.0 },
  { n: 4, r0: 1960, r1: 2120, sp: 4, count: 26, rad: 110, base: 0.2 },
  { n: 4, r0: 2280, r1: 2440, sp: 5, count: 26, rad: 85, base: 1.4 },
  { n: 2, r0: 2850, r1: 3150, sp: 6, count: 24, rad: 80, base: Math.PI / 4 },
  { n: 4, r0: 950, r1: 1450, sp: 8, count: 30, rad: 95, base: 0.9, night: true },
  { n: 3, r0: 1900, r1: 2450, sp: 9, count: 26, rad: 90, base: 2.6, night: true },
];

/** Sailing range from the island per boat tier; the flagship is unlimited. */
export const RANGE = [1150, 1600, 2000, 2400, 2900, 1e9] as const;

/** Seconds in a full day cycle. */
export const DAY_LEN = 300;

export type Stage = { name: string; wood: number; coins: number };

/** The palace, one stage at a time. */
export const STAGES: readonly Stage[] = [
  { name: 'tree platform', wood: 8, coins: 0 },
  { name: 'treehouse', wood: 20, coins: 0 },
  { name: 'second storey', wood: 40, coins: 100 },
  { name: 'watchtower', wood: 70, coins: 2000 },
  { name: 'palace dome', wood: 120, coins: 5000 },
];

export const TIER_NAME = ['dinghy', 'skiff', 'cutter', 'trawler', 'seiner', 'flagship'] as const;
/** Hull scale per tier. */
export const TIER_SCALE = [1, 1.1, 1.2, 1.32, 1.45, 1.6] as const;

export type Paint = { name: string; hull: string; trim: string; roof: string; flag: string };

export const PAINTS: readonly Paint[] = [
  { name: 'Buoy red', hull: '#E4572E', trim: '#FFF6E5', roof: '#1F6B7A', flag: '#FFC53D' },
  { name: 'Harbor teal', hull: '#1F8A8C', trim: '#FFF6E5', roof: '#E4572E', flag: '#FFC53D' },
  { name: 'Marigold', hull: '#F2B233', trim: '#FFF6E5', roof: '#2C4A7C', flag: '#E4572E' },
  { name: 'Cobalt', hull: '#3D6FD9', trim: '#FFF6E5', roof: '#F2B233', flag: '#FFF6E5' },
  { name: 'Kelp', hull: '#2FA36B', trim: '#FFF6E5', roof: '#8F5F2C', flag: '#FFC53D' },
  { name: 'Coral', hull: '#E86FA3', trim: '#FFF6E5', roof: '#7A4FC9', flag: '#FFF6E5' },
  { name: 'Violet', hull: '#7A4FC9', trim: '#FFF6E5', roof: '#F2B233', flag: '#FFC53D' },
  { name: 'Whitewash', hull: '#F4EFE6', trim: '#1F8A8C', roof: '#E4572E', flag: '#1F8A8C' },
  { name: 'Pitch', hull: '#23252E', trim: '#C9A227', roof: '#C9A227', flag: '#E4572E' },
  { name: 'Gold leaf', hull: '#D4A82A', trim: '#FFF6E5', roof: '#23252E', flag: '#E4572E' },
];

/** Lifetime coins that wake the pirate, and its speed. */
export const PIRATE_UNLOCK = 60;
export const PIRATE_SPEED = 188;
