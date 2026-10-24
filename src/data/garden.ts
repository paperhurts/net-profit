/**
 * The Garden Isle's rules and its part of the save (world/garden.ts lays the island out). Grow a Garden's loop, the
 * owner's ask: buy seeds at the stall, plant them in your beds, and they grow in real time, closed or open, from saved
 * timestamps; pick the fruit into your basket and sell it at the stand. A single-harvest crop is picked once and the bed
 * is free again; a multi-harvest one stays and keeps fruiting, holding a few ripe fruit and then waiting to be picked,
 * so time away is never lost and a week away pays no more than a night (the owner's call, 2026-10-24).
 *
 * The stall's stock (part three): every crop in six tiers, common to divine, the rarer the less often in. It restocks at
 * every dawn, every five minutes of play, as Grow a Garden's does every five minutes; the stock is rolled once a day and
 * saved, so a reload cannot reroll it. The numbers are the owner's call, "rival the boat": a full plot of the best crop
 * left overnight pays three to five holds of abyss fish, and tended by hand about what the boat pays a minute, never more
 * (GUARD below, held by a test). The throttle is the stall: the rarest seeds are in once in a hundred days or so.
 *
 * Every function here takes the time as an argument (milliseconds since 1970, Date.now()'s), so the game and the tests
 * say when "now" is.
 */

export type CropId =
  | 'carrot'
  | 'strawberry'
  | 'blueberry'
  | 'sweetpotato'
  | 'tomato'
  | 'sweetcorn'
  | 'pineapple'
  | 'papaya'
  | 'coconut'
  | 'dragonfruit'
  | 'lantern'
  | 'kraken';

export type Tier = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic' | 'divine';
export const TIERS: readonly Tier[] = [
  'common',
  'uncommon',
  'rare',
  'legendary',
  'mythic',
  'divine',
];

export type Crop = {
  id: CropId;
  /** The plant, and its seed: "coconut palm". */
  name: string;
  /** One of its fruit, picked: "coconut". */
  fruit: string;
  /** More than one fruit, for messages: "3 coconuts". */
  plural: string;
  tier: Tier;
  /** What a seed costs at the stall, and what one ripe fruit sells for at the stand. */
  seed: number;
  sell: number;
  /** Seconds from planting to the first ripe fruit. */
  grow: number;
  /** Seconds between fruit once it is grown; absent for a crop picked once. */
  regrow?: number;
  /** Ripe fruit it holds before it waits to be picked: 1 for a crop picked once. */
  holds: number;
  /** In stock at a dawn one time in this many (1: always), and how many seeds come in, least and most. */
  odds: number;
  /** What a normal-sized fruit weighs, in kilos. */
  kg: number;
  stock: readonly [number, number];
};

const M = 60;
/** What a normal-sized fruit of each crop weighs, in kilos. */
const KG: Record<CropId, number> = {
  carrot: 0.2,
  strawberry: 0.03,
  blueberry: 0.01,
  sweetpotato: 0.4,
  tomato: 0.2,
  sweetcorn: 0.35,
  pineapple: 1.5,
  papaya: 1,
  coconut: 1.4,
  dragonfruit: 0.5,
  lantern: 2.5,
  kraken: 9,
};
/** Where one fruit is not called what its plant is. */
const FRUIT: Partial<Record<CropId, string>> = {
  sweetcorn: 'cob of sweetcorn',
  coconut: 'coconut',
};
/** One crop: picked once when regrow is 0. */
function crop(
  id: CropId,
  name: string,
  plural: string,
  tier: Tier,
  seed: number,
  sell: number,
  grow: number,
  regrow: number,
  holds: number,
  odds: number,
  stock: readonly [number, number],
): Crop {
  const fruit = FRUIT[id] ?? name;
  return {
    id,
    name,
    fruit,
    plural,
    tier,
    seed,
    sell,
    grow,
    ...(regrow ? { regrow } : {}),
    holds,
    odds,
    kg: KG[id],
    stock,
  };
}

/** The crops, in the order the stall shows them (data for the table under Tuning tables in project.md). */
export const CROPS: Record<CropId, Crop> = {
  carrot: crop('carrot', 'carrot', 'carrots', 'common', 10, 16, M, 0, 1, 1, [8, 12]),
  strawberry: crop(
    'strawberry',
    'strawberry',
    'strawberries',
    'common',
    40,
    5,
    2 * M,
    M,
    4,
    1,
    [6, 10],
  ),
  blueberry: crop(
    'blueberry',
    'blueberry',
    'blueberries',
    'uncommon',
    120,
    14,
    4 * M,
    2 * M,
    4,
    1,
    [4, 6],
  ),
  sweetpotato: crop(
    'sweetpotato',
    'sweet potato',
    'sweet potatoes',
    'uncommon',
    300,
    450,
    5 * M,
    0,
    1,
    3,
    [2, 4],
  ),
  tomato: crop('tomato', 'tomato', 'tomatoes', 'rare', 800, 60, 6 * M, 3 * M, 3, 1, [2, 3]),
  sweetcorn: crop(
    'sweetcorn',
    'sweetcorn',
    'cobs of sweetcorn',
    'rare',
    1300,
    95,
    8 * M,
    4 * M,
    3,
    6,
    [1, 3],
  ),
  pineapple: crop(
    'pineapple',
    'pineapple',
    'pineapples',
    'legendary',
    3000,
    4200,
    15 * M,
    0,
    1,
    8,
    [1, 2],
  ),
  papaya: crop('papaya', 'papaya', 'papayas', 'legendary', 4500, 190, 10 * M, 5 * M, 3, 12, [1, 2]),
  coconut: crop(
    'coconut',
    'coconut palm',
    'coconuts',
    'mythic',
    9000,
    300,
    15 * M,
    7 * M,
    3,
    25,
    [1, 1],
  ),
  dragonfruit: crop(
    'dragonfruit',
    'dragon fruit',
    'dragon fruit',
    'mythic',
    15000,
    420,
    20 * M,
    8 * M,
    3,
    40,
    [1, 1],
  ),
  lantern: crop(
    'lantern',
    'lantern gourd',
    'lantern gourds',
    'divine',
    30000,
    500,
    30 * M,
    10 * M,
    3,
    80,
    [1, 1],
  ),
  kraken: crop(
    'kraken',
    'kraken squash',
    'kraken squashes',
    'divine',
    45000,
    60000,
    45 * M,
    0,
    1,
    120,
    [1, 1],
  ),
};
export const CROP_IDS: readonly CropId[] = Object.keys(CROPS) as CropId[];
export function isCrop(k: unknown): k is CropId {
  return typeof k === 'string' && (CROP_IDS as readonly string[]).includes(k);
}

/**
 * The owner's "rival the boat" (2026-10-24), in numbers: a full plot (BEDS_ALL beds) of the best crop that keeps
 * fruiting, left overnight, pays between these; and tended by hand it pays at most this a minute. A test holds the crop
 * table to them.
 */
export const GUARD = { overnightMin: 30000, overnightMax: 50000, perMinuteMax: 2000 } as const;
/** Beds in the whole plot, staked out and dug, once it has grown. */
export const BEDS_ALL = 24;

/** How many fruit the basket carries; it sells at the isle's stand. */
export const BASKET_MAX = 50;
/** The most seeds of one kind kept at once. */
export const SEEDS_MAX = 99;
/** Beds in the plot that can be planted. More are staked out for later. */
export const BEDS_OPEN = 6;

/**
 * A planted bed: what is in it, when it was planted, how many fruit are ripe on it, and when the next one ripens (0
 * while it holds all it can and waits to be picked).
 */
export type Bed = {
  crop: CropId;
  planted: number;
  ripe: number;
  next: number;
  /** The size of each ripe fruit on it (1 is normal), and how many it has ripened in all. Missing in saves from before
   * sizes: their ripe fruit are normal-sized. */
  w?: number[];
  born?: number;
  /** Gold or Rainbow, for each ripe fruit that is; '' for one that is not. Missing in saves from before them. */
  v?: Variant[];
};

/**
 * Fruit size (part four): each fruit, as it ripens, is somewhere between 0.8 and 1.2 of normal, and one in 200 is a
 * giant, three to four times normal. What it sells for goes with the square of its size, as in Grow a Garden, never
 * under 0.9 squared. Grow a Garden's sizes run 0.7 to 1.4; ours are narrower so that size adds about a tenth to what a
 * plot earns and the owner's guardrails still hold (a test checks them with sizes in).
 */
export const SIZE = {
  min: 0.8,
  max: 1.2,
  floor: 0.9,
  giant: 200,
  giantMin: 3,
  giantMax: 4,
} as const;

/** A number from 0 to 1 that is always the same for the same two numbers. */
function hash01(a: number, b: number): number {
  let h =
    Math.imul((a % 2147483647) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The size of the n-th fruit a plant planted at this time ripens: the same every time it is worked out. */
export function sizeOf(planted: number, n: number): number {
  const m = SIZE.min + (SIZE.max - SIZE.min) * hash01(planted, n * 3);
  if (hash01(planted, n * 3 + 1) * SIZE.giant >= 1) return m;
  return m * (SIZE.giantMin + (SIZE.giantMax - SIZE.giantMin) * hash01(planted, n * 3 + 2));
}

/**
 * Gold and Rainbow (part five), rolled as each fruit ripens, at Grow a Garden's own numbers, the owner's call: one in
 * 100 is Gold and sells for 20 times as much, one in 1,000 Rainbow and 50 times; never both. Worked out like its size,
 * from its plant and its count, so a reload cannot roll it again.
 */
export type Variant = '' | 'gold' | 'rainbow';
export const VARIANTS = {
  gold: { odds: 100, times: 20 },
  rainbow: { odds: 1000, times: 50 },
} as const;

/** Gold, Rainbow, or neither, for the n-th fruit a plant planted at this time ripens. */
export function variantOf(planted: number, n: number): Variant {
  const r = hash01(planted + 7, n * 5 + 3);
  if (r < 1 / VARIANTS.rainbow.odds) return 'rainbow';
  if (r < 1 / VARIANTS.rainbow.odds + 1 / VARIANTS.gold.odds) return 'gold';
  return '';
}

/** How many times as much a fruit of this variant sells for. */
export function variantTimes(v: Variant | undefined): number {
  return v ? VARIANTS[v].times : 1;
}

/** Is this size a giant's. */
export function isGiant(m: number): boolean {
  return m >= SIZE.giantMin * SIZE.min;
}

/**
 * The most one fruit sells for, twice the dearest seed: without it a giant kraken squash, 60,000 by up to 23 for its
 * size, would pay more than a million and make every price in the game nothing.
 */
export const FRUIT_MAX = 100000;

/** What a fruit of a crop, this size, sells for. */
export function fruitValue(k: CropId, m: number, v?: Variant): number {
  return Math.min(
    FRUIT_MAX,
    Math.round(CROPS[k].sell * Math.max(SIZE.floor, m) ** 2 * variantTimes(v)),
  );
}

/** What a fruit of a crop, this size, weighs, in kilos, to two places (three for the smallest). */
export function fruitKg(k: CropId, m: number): string {
  const kg = CROPS[k].kg * m;
  return kg < 0.1 ? kg.toFixed(3) : kg.toFixed(2);
}

/** A fruit in the basket: its crop and its size. */
export type Fruit = { c: CropId; m: number; v?: Variant };

/** The garden's part of the save. Everything past seen is optional, so saves made before it still load. */
export type Garden = {
  /** The Garden Isle has been sighted, in the far deep's left corner. */
  seen: boolean;
  /** The beds, in BEDS order: null where nothing is planted. Missing means none planted. */
  beds?: (Bed | null)[];
  /** Seeds held, by crop. */
  seeds?: Partial<Record<CropId, number>>;
  /** The fruit in the basket, each with its size. */
  bag?: Fruit[];
  /** The seed stall's stock, and the day it came in. */
  stock?: Stock;
};

/** What the seed stall has, rolled at a dawn: the game's day it came in, and seeds left of each crop. */
export type Stock = { day: number; n: Partial<Record<CropId, number>> };

/** A day's stock: each crop in on its odds, with so many seeds. */
export function rollStock(day: number, rnd: () => number = Math.random): Stock {
  const n: Partial<Record<CropId, number>> = {};
  for (const k of CROP_IDS) {
    const c = CROPS[k];
    if (c.odds > 1 && rnd() * c.odds >= 1) continue;
    const [lo, hi] = c.stock;
    n[k] = lo + Math.floor(rnd() * (hi - lo + 1));
  }
  return { day, n };
}

/** The stall's stock today, rolled fresh the first time it is asked for on a new day. */
export function stockToday(g: Garden, day: number, rnd: () => number = Math.random): Stock {
  if (!g.stock || g.stock.day !== day) g.stock = rollStock(day, rnd);
  return g.stock;
}

/** A game that has never been near it. */
export function noGarden(): Garden {
  return { seen: false };
}

const S = 1000;

/** The bed at i, or null. */
export function bedAt(g: Garden, i: number): Bed | null {
  return g.beds?.[i] ?? null;
}

/**
 * Bring a bed up to now: each fruit that has come due ripens, up to what the plant holds, and then it waits. A clock
 * that has gone backwards (a phone's time set back) never makes a fruit take longer than its full growing time.
 */
export function growBed(b: Bed, now: number): void {
  const c = CROPS[b.crop];
  if (b.ripe >= c.holds) {
    b.next = 0;
    return;
  }
  // The first fruit is always the longest wait.
  if (b.next > now + c.grow * S) b.next = now + c.grow * S;
  if (b.planted > now) b.planted = now;
  while (b.next > 0 && b.next <= now && b.ripe < c.holds) {
    const w = sizesOn(b);
    const n = b.born ?? b.ripe;
    w.push(sizeOf(b.planted, n));
    b.w = w;
    const v = variantsOn(b);
    v.push(variantOf(b.planted, n));
    b.v = v;
    b.born = n + 1;
    b.ripe++;
    b.next = b.ripe < c.holds && c.regrow ? b.next + c.regrow * S : 0;
  }
}

/** The sizes of the fruit ripe on a bed, one for each (a save from before sizes has its ripe fruit at 1). */
export function sizesOn(b: Bed): number[] {
  const w = (b.w ?? []).slice(0, b.ripe);
  while (w.length < b.ripe) w.push(1);
  return w;
}

/** Gold or Rainbow for each ripe fruit on a bed ('' where it is neither, and for any saved before them). */
export function variantsOn(b: Bed): Variant[] {
  const v = (b.v ?? []).slice(0, b.ripe);
  while (v.length < b.ripe) v.push('');
  return v;
}

/** Every bed brought up to now. */
export function growAll(g: Garden, now: number): void {
  for (const b of g.beds ?? []) if (b) growBed(b, now);
}

/** Seeds of a crop held. */
export function seedsOf(g: Garden, k: CropId): number {
  return g.seeds?.[k] ?? 0;
}

/** Fruit in the basket, in all. */
export function basketCount(g: Garden): number {
  return g.bag?.length ?? 0;
}

/** What the basket would sell for at the stand. */
export function basketValue(g: Garden): number {
  return (g.bag ?? []).reduce((n, f) => n + fruitValue(f.c, f.m, f.v), 0);
}

/** Seeds of a crop left at the stall today. */
export function inStock(g: Garden, k: CropId): number {
  return g.stock?.n[k] ?? 0;
}

/** Buy n seeds of a crop from today's stock with the coins held: what it costs, or 0 when it cannot be bought. */
export function buySeeds(g: Garden, k: CropId, n: number, coins: number): number {
  const have = seedsOf(g, k);
  const m = Math.min(n, SEEDS_MAX - have, inStock(g, k));
  const cost = m * CROPS[k].seed;
  if (m <= 0 || cost > coins || !g.stock) return 0;
  g.seeds = { ...g.seeds, [k]: have + m };
  g.stock = { ...g.stock, n: { ...g.stock.n, [k]: inStock(g, k) - m } };
  return cost;
}

/** Plant a seed of a crop in bed i, if the bed is open and empty and there is a seed. */
export function plant(g: Garden, i: number, k: CropId, now: number): boolean {
  if (i < 0 || i >= BEDS_OPEN || bedAt(g, i) || seedsOf(g, k) <= 0) return false;
  const beds = g.beds ? [...g.beds] : [];
  while (beds.length < BEDS_OPEN) beds.push(null);
  beds[i] = { crop: k, planted: now, ripe: 0, next: now + CROPS[k].grow * S };
  g.beds = beds;
  g.seeds = { ...g.seeds, [k]: seedsOf(g, k) - 1 };
  return true;
}

/**
 * Pick what is ripe on bed i into the basket, as much as it has room for: how many were picked. A crop picked once
 * leaves the bed empty; one that keeps fruiting starts its next fruit if it had been waiting, full.
 */
export function pick(g: Garden, i: number, now: number): Fruit[] {
  const b = bedAt(g, i);
  if (!b) return [];
  growBed(b, now);
  const n = Math.min(b.ripe, BASKET_MAX - basketCount(g));
  if (n <= 0) return [];
  const c = CROPS[b.crop];
  const w = sizesOn(b);
  const vs = variantsOn(b);
  const got: Fruit[] = w.slice(0, n).map((m, j) => {
    const v = vs[j];
    return v ? { c: b.crop, m, v } : { c: b.crop, m };
  });
  g.bag = [...(g.bag ?? []), ...got];
  b.w = w.slice(n);
  b.v = vs.slice(n);
  b.ripe -= n;
  if (!c.regrow) {
    if (b.ripe === 0 && g.beds) g.beds[i] = null;
  } else if (b.next === 0) b.next = now + c.regrow * S;
  return got;
}

/** Sell the whole basket at the stand: the coins, and how many fruit. */
export function sellBasket(g: Garden): { coins: number; n: number } {
  const out = { coins: basketValue(g), n: basketCount(g) };
  g.bag = [];
  return out;
}

/** Seconds until a bed's next fruit is ripe; 0 when something is ripe now or it is waiting full. */
export function secondsLeft(b: Bed, now: number): number {
  if (b.ripe > 0 || b.next === 0) return 0;
  return Math.max(0, Math.ceil((b.next - now) / S));
}

/** How far a bed's plant has grown, 0 just planted to 1 full grown. */
export function grownOf(b: Bed, now: number): number {
  return Math.max(0, Math.min(1, (now - b.planted) / (CROPS[b.crop].grow * S)));
}

/** A count from the save: a whole number from 0 to max, or 0. */
function count(v: unknown, max: number): number {
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.max(0, Math.min(max, Math.floor(v)))
    : 0;
}

/** A size from the save: a finite number from 0.5 to 5, or 1. */
function size(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0.5, Math.min(5, v)) : 1;
}

/** Gold or Rainbow from the save, or neither. */
function variant(v: unknown): Variant {
  return v === 'gold' || v === 'rainbow' ? v : '';
}

/** A time from the save: a finite number of milliseconds from 0, or null. */
function time(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

function parseBed(v: unknown): Bed | null {
  if (!v || typeof v !== 'object') return null;
  const k = v as Record<string, unknown>;
  if (!isCrop(k.crop)) return null;
  const planted = time(k.planted);
  const next = time(k.next);
  if (planted === null || next === null) return null;
  const b: Bed = { crop: k.crop, planted, ripe: count(k.ripe, CROPS[k.crop].holds), next };
  if (Array.isArray(k.w)) b.w = k.w.slice(0, b.ripe).map(size);
  if (Array.isArray(k.v)) b.v = k.v.slice(0, b.ripe).map(variant);
  if (typeof k.born === 'number' && Number.isFinite(k.born) && k.born >= b.ripe)
    b.born = Math.floor(k.born);
  return b;
}

function parseCounts(v: unknown, max: number): Partial<Record<CropId, number>> | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const out: Partial<Record<CropId, number>> = {};
  for (const k of CROP_IDS) {
    const n = count((v as Record<string, unknown>)[k], max);
    if (n) out[k] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Whatever was found under the save's garden key, made sensible: anything missing or odd reads as not yet. */
export function parseGarden(raw: unknown): Garden {
  const g = noGarden();
  if (!raw || typeof raw !== 'object') return g;
  const k = raw as Record<string, unknown>;
  g.seen = k.seen === true;
  if (Array.isArray(k.beds)) {
    const beds = k.beds.slice(0, BEDS_OPEN).map(parseBed);
    if (beds.some((b) => b)) g.beds = beds;
  }
  const seeds = parseCounts(k.seeds, SEEDS_MAX);
  if (seeds) g.seeds = seeds;
  if (k.stock && typeof k.stock === 'object') {
    const st = k.stock as Record<string, unknown>;
    if (typeof st.day === 'number' && Number.isFinite(st.day) && st.day >= 0) {
      // Kept with its zeros, so a crop sold out today still reads as sold out.
      const n: Partial<Record<CropId, number>> = {};
      const raw = st.n && typeof st.n === 'object' ? (st.n as Record<string, unknown>) : {};
      for (const c of CROP_IDS) if (c in raw) n[c] = count(raw[c], SEEDS_MAX);
      g.stock = { day: Math.floor(st.day), n };
    }
  }
  // The fruit in the basket, each with its size, never more than it carries. A save from before sizes has its basket
  // as a count of each crop: those come in normal-sized.
  const bag: Fruit[] = [];
  if (Array.isArray(k.bag))
    for (const f of k.bag)
      if (f && typeof f === 'object' && isCrop((f as Fruit).c)) {
        const v = variant((f as Fruit).v);
        bag.push(
          v
            ? { c: (f as Fruit).c, m: size((f as Fruit).m), v }
            : { c: (f as Fruit).c, m: size((f as Fruit).m) },
        );
      }
  const old = parseCounts(k.basket, BASKET_MAX);
  for (const c of CROP_IDS) for (let n = old?.[c] ?? 0; n > 0; n--) bag.push({ c, m: 1 });
  if (bag.length) g.bag = bag.slice(0, BASKET_MAX);
  return g;
}

/** Nothing about it worth keeping, so the save can leave it out and the copy-my-game link stays short. */
export function untouchedGarden(g: Garden): boolean {
  return !g.seen && !g.beds?.some((b) => b) && !g.seeds && !g.bag?.length && !g.stock;
}
