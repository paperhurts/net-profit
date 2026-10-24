/**
 * The Garden Isle's rules and its part of the save (world/garden.ts lays the island out). Grow a Garden's loop, the
 * owner's ask: buy seeds at the stall, plant them in your beds, and they grow in real time, closed or open, from saved
 * timestamps; pick the fruit into your basket and sell it at the stand. A single-harvest crop is picked once and the bed
 * is free again; a multi-harvest one stays and keeps fruiting, holding a few ripe fruit and then waiting to be picked,
 * so time away is never lost and a week away pays no more than a night (the owner's call, 2026-10-24).
 *
 * Part two, the first harvest, has the three crops the stall always has: carrot, strawberry and blueberry. Every
 * function here takes the time as an argument (milliseconds since 1970, Date.now()'s), so the game and the tests say
 * when "now" is.
 */

export type CropId = 'carrot' | 'strawberry' | 'blueberry';

export type Crop = {
  id: CropId;
  name: string;
  /** More than one, for messages: "3 strawberries". */
  plural: string;
  tier: 'common' | 'uncommon';
  /** What a seed costs at the stall, and what one ripe fruit sells for at the stand. */
  seed: number;
  sell: number;
  /** Seconds from planting to the first ripe fruit. */
  grow: number;
  /** Seconds between fruit once it is grown; absent for a crop picked once. */
  regrow?: number;
  /** Ripe fruit it holds before it waits to be picked: 1 for a crop picked once. */
  holds: number;
};

/** The crops, in the order the stall shows them. The commons as the plan has them; later pieces add the rest. */
export const CROPS: Record<CropId, Crop> = {
  carrot: {
    id: 'carrot',
    name: 'carrot',
    plural: 'carrots',
    tier: 'common',
    seed: 10,
    sell: 16,
    grow: 60,
    holds: 1,
  },
  strawberry: {
    id: 'strawberry',
    name: 'strawberry',
    plural: 'strawberries',
    tier: 'common',
    seed: 40,
    sell: 5,
    grow: 120,
    regrow: 60,
    holds: 4,
  },
  blueberry: {
    id: 'blueberry',
    name: 'blueberry',
    plural: 'blueberries',
    tier: 'uncommon',
    seed: 120,
    sell: 14,
    grow: 240,
    regrow: 120,
    holds: 4,
  },
};
export const CROP_IDS: readonly CropId[] = ['carrot', 'strawberry', 'blueberry'];
export function isCrop(k: unknown): k is CropId {
  return typeof k === 'string' && (CROP_IDS as readonly string[]).includes(k);
}

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
export type Bed = { crop: CropId; planted: number; ripe: number; next: number };

/** The garden's part of the save. Everything past seen is optional, so saves made before it still load. */
export type Garden = {
  /** The Garden Isle has been sighted, in the far deep's left corner. */
  seen: boolean;
  /** The beds, in BEDS order: null where nothing is planted. Missing means none planted. */
  beds?: (Bed | null)[];
  /** Seeds held, by crop. */
  seeds?: Partial<Record<CropId, number>>;
  /** Fruit in the basket, by crop. */
  basket?: Partial<Record<CropId, number>>;
};

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
    b.ripe++;
    b.next = b.ripe < c.holds && c.regrow ? b.next + c.regrow * S : 0;
  }
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
  return CROP_IDS.reduce((n, k) => n + (g.basket?.[k] ?? 0), 0);
}

/** What the basket would sell for at the stand. */
export function basketValue(g: Garden): number {
  return CROP_IDS.reduce((n, k) => n + (g.basket?.[k] ?? 0) * CROPS[k].sell, 0);
}

/** Buy n seeds of a crop with the coins held: what it costs, or 0 when it cannot be bought. */
export function buySeeds(g: Garden, k: CropId, n: number, coins: number): number {
  const have = seedsOf(g, k);
  const m = Math.min(n, SEEDS_MAX - have);
  const cost = m * CROPS[k].seed;
  if (m <= 0 || cost > coins) return 0;
  g.seeds = { ...g.seeds, [k]: have + m };
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
export function pick(g: Garden, i: number, now: number): number {
  const b = bedAt(g, i);
  if (!b) return 0;
  growBed(b, now);
  const n = Math.min(b.ripe, BASKET_MAX - basketCount(g));
  if (n <= 0) return 0;
  const c = CROPS[b.crop];
  g.basket = { ...g.basket, [b.crop]: (g.basket?.[b.crop] ?? 0) + n };
  b.ripe -= n;
  if (!c.regrow) {
    if (b.ripe === 0 && g.beds) g.beds[i] = null;
  } else if (b.next === 0) b.next = now + c.regrow * S;
  return n;
}

/** Sell the whole basket at the stand: the coins, and how many fruit. */
export function sellBasket(g: Garden): { coins: number; n: number } {
  const out = { coins: basketValue(g), n: basketCount(g) };
  g.basket = {};
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
  return { crop: k.crop, planted, ripe: count(k.ripe, CROPS[k.crop].holds), next };
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
  const basket = parseCounts(k.basket, BASKET_MAX);
  if (basket) {
    // Never more than the basket carries, whatever the save says.
    let room = BASKET_MAX;
    for (const c of CROP_IDS) {
      const n = Math.min(basket[c] ?? 0, room);
      room -= n;
      if (n) basket[c] = n;
      else delete basket[c];
    }
    g.basket = basket;
  }
  return g;
}

/** Nothing about it worth keeping, so the save can leave it out and the copy-my-game link stays short. */
export function untouchedGarden(g: Garden): boolean {
  return !g.seen && !g.beds?.some((b) => b) && !g.seeds && !g.basket;
}
