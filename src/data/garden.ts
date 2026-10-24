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
    9 * M,
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
  /** The weather's marks on each ripe fruit (part six): Wet, Shocked, Moonlit, Twilight. Missing in older saves. */
  mu?: Mutation[][];
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

/**
 * The weather on the garden (part six), Grow a Garden's weather mutations rebuilt on the game's own weather and day.
 * They add, as theirs do: a fruit that is Wet, Moonlit and Shocked sells for 1 + 1 + 1 + 9 = 12 times as much. Only
 * while the game is played: a fruit that ripens while it is closed gets none of them.
 *  - Moonlit, two times: ripening at night, one in three.
 *  - Twilight, three times: ripening at dawn or dusk, one in five, like the koi and the ray.
 *  - Wet, two times: a storm's rain, while the boat is out near the isle (storms only blow while sailing), each ripe
 *    fruit one in four.
 *  - Shocked, ten times (Grow a Garden's is 100; at our prices that would make every storm the best job in the game):
 *    one bolt of a storm's lightning strikes one ripe fruit, the boat out near the isle.
 */
export type Mutation = 'wet' | 'shocked' | 'moonlit' | 'twilight';
export const MUTATIONS: Record<Mutation, { name: string; times: number }> = {
  wet: { name: 'Wet', times: 2 },
  shocked: { name: 'Shocked', times: 10 },
  moonlit: { name: 'Moonlit', times: 2 },
  twilight: { name: 'Twilight', times: 3 },
};
const MUTATION_IDS = Object.keys(MUTATIONS) as Mutation[];
/** One fruit in this many ripening at night is Moonlit; at dawn or dusk, Twilight; in a storm's rain, Wet. */
export const WEATHER_ODDS = { moonlit: 3, twilight: 5, wet: 4 } as const;
/** A fruit ripened this long ago or less was ripened while the game was being played. */
export const LIVE_MS = 5000;

/** What the time of day is, for a fruit ripening now. */
export type Sky = { phase: 'Dawn' | 'Day' | 'Dusk' | 'Night' };

/** How many times as much a fruit with these marks sells for: they add. */
export function mutationTimes(mu: readonly Mutation[] | undefined): number {
  return 1 + (mu ?? []).reduce((n, k) => n + MUTATIONS[k].times - 1, 0);
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
export function fruitValue(k: CropId, m: number, v?: Variant, mu?: readonly Mutation[]): number {
  return Math.min(
    FRUIT_MAX,
    Math.round(CROPS[k].sell * Math.max(SIZE.floor, m) ** 2 * variantTimes(v) * mutationTimes(mu)),
  );
}

/** What a fruit of a crop, this size, weighs, in kilos, to two places (three for the smallest). */
export function fruitKg(k: CropId, m: number): string {
  const kg = CROPS[k].kg * m;
  return kg < 0.1 ? kg.toFixed(3) : kg.toFixed(2);
}

/** A fruit in the basket: its crop and its size. */
export type Fruit = { c: CropId; m: number; v?: Variant; mu?: Mutation[] };

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
  /** Gear held (part seven): waterings left in the can, sprinklers of each kind, and the shovel (1 once bought). */
  gear?: Partial<Record<GearId, number>>;
  /** The gear shed's stock, and the day it came in. */
  gearStock?: { day: number; n: Partial<Record<GearId, number>> };
  /** The sprinklers set down in the plot, running. */
  spr?: Sprinkler[];
  /** When the beds were last brought up to now, while a sprinkler runs, so its growing is counted once. */
  at?: number;
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

/**
 * The gear shed (part seven), Grow a Garden's gear shop, on the same dawn restock as the seed stall. The watering can
 * comes with ten waterings, each taking half a minute off a bed's wait. A sprinkler set down in the plot waters the beds
 * in its reach for five minutes, so they grow half as fast again; a gold sprinkler runs for ten, they grow twice as fast,
 * and a fruit ripening in its spray is Wet one time in four. The shovel digs a plant up, to free its bed: bought once,
 * kept for good.
 *
 * On a crop that keeps fruiting, gear about pays for itself and no more; it is worth it on a big one picked once (a
 * pineapple, a kraken squash). The owner's guardrails hold with all the gear the shed has in a day put to use (a test,
 * tests/unit/gardengear.test.ts, checks them).
 */
export type GearId = 'can' | 'sprinkler' | 'goldsprinkler' | 'shovel';
export type Gear = {
  id: GearId;
  name: string;
  price: number;
  /** In one day in odds, and how many when it is in. */
  odds: number;
  stock: readonly [number, number];
};
export const GEAR: Record<GearId, Gear> = {
  can: { id: 'can', name: 'watering can', price: 400, odds: 1, stock: [1, 3] },
  sprinkler: { id: 'sprinkler', name: 'sprinkler', price: 900, odds: 2, stock: [1, 3] },
  goldsprinkler: {
    id: 'goldsprinkler',
    name: 'gold sprinkler',
    price: 6000,
    odds: 6,
    stock: [1, 1],
  },
  shovel: { id: 'shovel', name: 'shovel', price: 100, odds: 1, stock: [1, 1] },
};
export const GEAR_IDS: readonly GearId[] = Object.keys(GEAR) as GearId[];
export function isGear(k: unknown): k is GearId {
  return typeof k === 'string' && k in GEAR;
}
/** A can's waterings, how much each takes off a bed's wait, and the most the can holds. */
export const WATER = { per: 10, ms: 30 * 1000, max: 99 } as const;
/** Sprinklers of a kind held, at most. */
export const GEAR_MAX = 9;
export type SprinklerId = 'sprinkler' | 'goldsprinkler';
/** How much faster the beds in its reach grow, for how long, and the odds of Wet in a gold one's spray. */
export const SPRINKLERS: Record<SprinklerId, { speed: number; ms: number; wet: number }> = {
  sprinkler: { speed: 1.5, ms: 5 * 60 * 1000, wet: 0 },
  goldsprinkler: { speed: 2, ms: 10 * 60 * 1000, wet: 4 },
};
/** Sprinklers running in the plot at once, at most. */
export const SPRINKLERS_MAX = 6;
/** A sprinkler set down: its kind, where in the isle's frame, the beds in its reach, and when it runs from and to. */
export type Sprinkler = {
  k: SprinklerId;
  u: number;
  v: number;
  beds: number[];
  from: number;
  to: number;
};

/** A day's gear: each in on its odds, with so many. */
export function rollGear(day: number, rnd: () => number = Math.random): Garden['gearStock'] & {} {
  const n: Partial<Record<GearId, number>> = {};
  for (const k of GEAR_IDS) {
    const c = GEAR[k];
    if (c.odds > 1 && rnd() * c.odds >= 1) continue;
    const [lo, hi] = c.stock;
    n[k] = lo + Math.floor(rnd() * (hi - lo + 1));
  }
  return { day, n };
}

/** The shed's stock today, rolled fresh the first time it is asked for on a new day. */
export function gearToday(
  g: Garden,
  day: number,
  rnd: () => number = Math.random,
): Garden['gearStock'] & {} {
  if (!g.gearStock || g.gearStock.day !== day) g.gearStock = rollGear(day, rnd);
  return g.gearStock;
}

/** Gear held: waterings left, sprinklers of a kind, or 1 for the shovel. */
export function gearOf(g: Garden, k: GearId): number {
  return g.gear?.[k] ?? 0;
}

/** Of a piece of gear, left in the shed today. */
export function gearInStock(g: Garden, k: GearId): number {
  return g.gearStock?.n[k] ?? 0;
}

/** Whether one more can be bought, stock and money aside: room in the can, a sprinkler's place, no shovel yet. */
export function gearRoom(g: Garden, k: GearId): boolean {
  if (k === 'can') return gearOf(g, k) + WATER.per <= WATER.max;
  if (k === 'shovel') return gearOf(g, k) === 0;
  return gearOf(g, k) < GEAR_MAX;
}

/** Buy one from today's stock with the coins held: what it costs, or 0 when it cannot be bought. */
export function buyGear(g: Garden, k: GearId, coins: number): number {
  const c = GEAR[k];
  if (gearInStock(g, k) <= 0 || !gearRoom(g, k) || c.price > coins || !g.gearStock) return 0;
  g.gear = { ...g.gear, [k]: gearOf(g, k) + (k === 'can' ? WATER.per : 1) };
  g.gearStock = { ...g.gearStock, n: { ...g.gearStock.n, [k]: gearInStock(g, k) - 1 } };
  return c.price;
}

/** Whether a bed can be watered: planted, and growing toward its next fruit (not waiting full). */
export function canWater(g: Garden, i: number): boolean {
  const b = bedAt(g, i);
  return !!b && b.next > 0 && gearOf(g, 'can') > 0;
}

/** Water bed i: half a minute off its wait, never earlier than now. */
export function water(g: Garden, i: number, now: number): boolean {
  const b = bedAt(g, i);
  if (!b || !canWater(g, i)) return false;
  b.next = Math.max(now, b.next - WATER.ms);
  g.gear = { ...g.gear, can: gearOf(g, 'can') - 1 };
  return true;
}

/** Set a sprinkler down at (u, v), watering the beds given (the plot's layout is world/garden.ts's to know). */
export function setSprinkler(
  g: Garden,
  k: SprinklerId,
  u: number,
  v: number,
  beds: number[],
  now: number,
): boolean {
  const spr = g.spr ?? [];
  if (gearOf(g, k) <= 0 || spr.length >= SPRINKLERS_MAX) return false;
  // Bring the beds up to now first, so its growing counts from now.
  growAll(g, now);
  g.spr = [...(g.spr ?? []), { k, u, v, beds, from: now, to: now + SPRINKLERS[k].ms }];
  g.at = now;
  g.gear = { ...g.gear, [k]: gearOf(g, k) - 1 };
  return true;
}

/** Dig up what is in bed i with the shovel, ripe fruit and all: the bed is empty again. */
export function dig(g: Garden, i: number): boolean {
  if (!bedAt(g, i) || gearOf(g, 'shovel') <= 0 || !g.beds) return false;
  g.beds[i] = null;
  return true;
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
export function growBed(b: Bed, now: number, sky?: Sky, wetAt?: (t: number) => boolean): void {
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
    // Ripening now, with the game open, the time of day may mark it.
    const mu = mutationsOn(b);
    const marks: Mutation[] = [];
    // Ripening under a gold sprinkler's spray, it may come up Wet, open or closed.
    if (wetAt?.(b.next) && hash01(b.planted + 29, n * 11 + 5) < 1 / SPRINKLERS.goldsprinkler.wet)
      marks.push('wet');
    if (sky && now - b.next < LIVE_MS) {
      const r = hash01(b.planted + 13, n * 7 + 1);
      if (sky.phase === 'Night' && r < 1 / WEATHER_ODDS.moonlit) marks.push('moonlit');
      if ((sky.phase === 'Dawn' || sky.phase === 'Dusk') && r < 1 / WEATHER_ODDS.twilight)
        marks.push('twilight');
    }
    mu.push(marks);
    b.mu = mu;
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

/** The weather's marks on each ripe fruit on a bed (none for any saved before them). */
export function mutationsOn(b: Bed): Mutation[][] {
  const mu = (b.mu ?? []).slice(0, b.ripe).map((x) => [...x]);
  while (mu.length < b.ripe) mu.push([]);
  return mu;
}

/**
 * Every bed brought up to now; with the time of day when the game is being played. A bed in a sprinkler's reach gains
 * the extra growing it gave since the garden was last brought up, open or closed (g.at is saved with the beds), and the
 * sprinklers that have run out are taken up.
 */
export function growAll(g: Garden, now: number, sky?: Sky): void {
  const from = Math.min(g.at ?? now, now);
  const spr = g.spr ?? [];
  (g.beds ?? []).forEach((b, i) => {
    if (!b) return;
    const over = spr.filter((s) => s.beds.includes(i));
    if (b.next > 0) {
      let extra = 0;
      for (const s of over)
        extra +=
          Math.max(0, Math.min(now, s.to) - Math.max(from, s.from)) * (SPRINKLERS[s.k].speed - 1);
      b.next -= extra;
    }
    const gold = over.filter((s) => s.k === 'goldsprinkler');
    growBed(
      b,
      now,
      sky,
      gold.length ? (t) => gold.some((s) => t >= s.from && t <= s.to) : undefined,
    );
  });
  // Only while a sprinkler runs is it worth keeping when they were last grown.
  const left = spr.filter((s) => s.to > now);
  if (left.length < spr.length) g.spr = left;
  if (left.length) g.at = now;
  else delete g.at;
}

/** A storm's rain over the isle: each ripe fruit not yet Wet, one in four, gets Wet. How many did. */
export function wetGarden(g: Garden, rnd: () => number = Math.random): number {
  let n = 0;
  for (const b of g.beds ?? []) {
    if (!b) continue;
    const mu = mutationsOn(b);
    for (const m of mu)
      if (!m.includes('wet') && rnd() * WEATHER_ODDS.wet < 1) {
        m.push('wet');
        n++;
      }
    b.mu = mu;
  }
  return n;
}

/** A bolt of lightning on the isle: one ripe fruit not yet Shocked is. Which bed it struck, or -1 if none was ripe. */
export function shockGarden(g: Garden, rnd: () => number = Math.random): number {
  const ripe: [number, number][] = [];
  (g.beds ?? []).forEach((b, i) => {
    if (!b) return;
    mutationsOn(b).forEach((m, j) => {
      if (!m.includes('shocked')) ripe.push([i, j]);
    });
  });
  const hit = ripe[Math.floor(rnd() * ripe.length)];
  if (!hit) return -1;
  const b = g.beds?.[hit[0]];
  if (!b) return -1;
  const mu = mutationsOn(b);
  mu[hit[1]]?.push('shocked');
  b.mu = mu;
  return hit[0];
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
  return (g.bag ?? []).reduce((n, f) => n + fruitValue(f.c, f.m, f.v, f.mu), 0);
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
  const ms = mutationsOn(b);
  const got: Fruit[] = w.slice(0, n).map((m, j) => {
    const f: Fruit = { c: b.crop, m };
    const v = vs[j];
    if (v) f.v = v;
    const mu = ms[j];
    if (mu?.length) f.mu = mu;
    return f;
  });
  g.bag = [...(g.bag ?? []), ...got];
  b.w = w.slice(n);
  b.v = vs.slice(n);
  b.mu = ms.slice(n);
  b.ripe -= n;
  if (!c.regrow) {
    if (b.ripe === 0 && g.beds) g.beds[i] = null;
  } else if (b.next === 0) b.next = now + c.regrow * S;
  return got;
}

/** The fruit a cast into the lily pond would take for bait (part eight): the one in the basket worth least, so a
 * Gold or a giant is never thrown in by mistake. Null with the basket empty. */
export function baitOf(g: Garden): Fruit | null {
  let best: Fruit | null = null;
  for (const f of g.bag ?? [])
    if (!best || fruitValue(f.c, f.m, f.v, f.mu) < fruitValue(best.c, best.m, best.v, best.mu))
      best = f;
  return best;
}

/** Take that fruit out of the basket, onto the hook: the fruit, or null with none to take. */
export function takeBait(g: Garden): Fruit | null {
  const f = baitOf(g);
  if (!f || !g.bag) return null;
  const i = g.bag.indexOf(f);
  g.bag = [...g.bag.slice(0, i), ...g.bag.slice(i + 1)];
  return f;
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

/** How far a bed's plant has grown, 0 just planted to 1 full grown: from when its first fruit is due, so watering and
 * sprinklers grow it on. */
export function grownOf(b: Bed, now: number): number {
  if (b.ripe > 0 || (b.born ?? 0) > 0 || b.next === 0) return 1;
  return Math.max(0, Math.min(1, 1 - (b.next - now) / (CROPS[b.crop].grow * S)));
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

/** The weather's marks from the save: each known one once. */
function marks(v: unknown): Mutation[] {
  if (!Array.isArray(v)) return [];
  return MUTATION_IDS.filter((k) => v.includes(k));
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
  if (Array.isArray(k.mu)) b.mu = k.mu.slice(0, b.ripe).map(marks);
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
        const fruit: Fruit = { c: (f as Fruit).c, m: size((f as Fruit).m) };
        const v = variant((f as Fruit).v);
        if (v) fruit.v = v;
        const mu = marks((f as Fruit).mu);
        if (mu.length) fruit.mu = mu;
        bag.push(fruit);
      }
  if (k.gear && typeof k.gear === 'object') {
    const gear: Partial<Record<GearId, number>> = {};
    for (const id of GEAR_IDS) {
      const n = count(
        (k.gear as Record<string, unknown>)[id],
        id === 'can' ? WATER.max : id === 'shovel' ? 1 : GEAR_MAX,
      );
      if (n) gear[id] = n;
    }
    if (Object.keys(gear).length) g.gear = gear;
  }
  if (k.gearStock && typeof k.gearStock === 'object') {
    const st = k.gearStock as Record<string, unknown>;
    if (typeof st.day === 'number' && Number.isFinite(st.day) && st.day >= 0) {
      const n: Partial<Record<GearId, number>> = {};
      const raw = st.n && typeof st.n === 'object' ? (st.n as Record<string, unknown>) : {};
      for (const c of GEAR_IDS) if (c in raw) n[c] = count(raw[c], GEAR_MAX);
      g.gearStock = { day: Math.floor(st.day), n };
    }
  }
  if (Array.isArray(k.spr)) {
    const spr: Sprinkler[] = [];
    for (const s of k.spr.slice(0, SPRINKLERS_MAX)) {
      if (!s || typeof s !== 'object') continue;
      const r = s as Record<string, unknown>;
      const from = time(r.from);
      const to = time(r.to);
      if (r.k !== 'sprinkler' && r.k !== 'goldsprinkler') continue;
      if (from === null || to === null || to < from || to - from > SPRINKLERS[r.k].ms) continue;
      if (typeof r.u !== 'number' || typeof r.v !== 'number' || !Array.isArray(r.beds)) continue;
      if (!Number.isFinite(r.u) || !Number.isFinite(r.v)) continue;
      const beds = r.beds.filter(
        (i): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < BEDS_ALL,
      );
      spr.push({ k: r.k, u: r.u, v: r.v, beds, from, to });
    }
    if (spr.length) g.spr = spr;
  }
  const at = time(k.at);
  if (at !== null) g.at = at;
  const old = parseCounts(k.basket, BASKET_MAX);
  for (const c of CROP_IDS) for (let n = old?.[c] ?? 0; n > 0; n--) bag.push({ c, m: 1 });
  if (bag.length) g.bag = bag.slice(0, BASKET_MAX);
  return g;
}

/** Nothing about it worth keeping, so the save can leave it out and the copy-my-game link stays short. */
export function untouchedGarden(g: Garden): boolean {
  return (
    !g.seen &&
    !g.beds?.some((b) => b) &&
    !g.seeds &&
    !g.bag?.length &&
    !g.stock &&
    !g.gear &&
    !g.gearStock &&
    !g.spr?.length
  );
}
