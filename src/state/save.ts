/**
 * Reading and writing the netprofit.v1 save, moved verbatim from the prototype
 * script: the same key, the same shape, the same clamping of whatever is found
 * in localStorage. Existing saves must keep loading; tests/unit/save.test.ts
 * holds one. A versioned format with migration is Phase 2.
 */

export const SAVE_KEY = 'netprofit.v1';

export type Levels = { net: number; hold: number; engine: number };

/** The standing order on the HUD: n of species sp, have caught so far, pays a bonus. */
export type Order = { sp: number; n: number; have: number; pay: number };

/**
 * An interrupted trip. Every field is optional because the restore applies
 * each one only if the save had it and it made sense.
 */
export type Trip = {
  x?: number;
  y?: number;
  h?: number;
  clock?: number;
  hold?: number[];
};

export type SaveData = {
  coins: number;
  earned: number;
  muted: boolean;
  lv: Levels;
  paint: number;
  /** Lifetime catches per species index. */
  log: number[];
  order: Order;
  wood: number;
  build: number;
  /** The fishmonger's pick of the day, a species index, or -1 when there is none. */
  market: number;
  /** Dawns seen, counting from 1; the field guide dates first catches by it. */
  day: number;
  /** The day each species was first landed, 0 for never. */
  first: number[];
  levSeen: boolean;
  /** The whales have been sighted. */
  whaleSeen: boolean;
  /** What the shipwright has fitted. */
  gear: { mesh: boolean; strongbox: boolean };
  trip: Trip | null;
  /** How the keyboard steers: drive the boat (A/D turn, W throttle) or point it like the stick. */
  keys: KeyMode;
};

export type KeyMode = 'drive' | 'point';

/** What a save is clamped against; all from the tuning tables and the world. */
export type Bounds = {
  maxLevel: number;
  paints: number;
  stages: number;
  species: number;
  worldSize: number;
  /** Hold capacity per hold level, to trim a restored hold that no longer fits. */
  holdCaps: readonly number[];
};

export const DEFAULT_ORDER: Order = { sp: 0, n: 8, have: 0, pay: 15 };

export function defaultSave(b: Bounds): SaveData {
  return {
    coins: 0,
    earned: 0,
    muted: false,
    lv: { net: 0, hold: 0, engine: 0 },
    paint: 0,
    log: new Array<number>(b.species).fill(0),
    order: { ...DEFAULT_ORDER },
    wood: 0,
    build: 0,
    market: -1,
    day: 1,
    first: new Array<number>(b.species).fill(0),
    levSeen: false,
    whaleSeen: false,
    gear: { mesh: false, strongbox: false },
    trip: null,
    keys: 'drive',
  };
}

const int = (v: unknown): number => Number(v) | 0;
const between = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

function parseTrip(raw: unknown, b: Bounds, holdLevel: number): Trip | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  const trip: Trip = {};
  const x = Number(t.x);
  const y = Number(t.y);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    trip.x = between(x, 160, b.worldSize - 160);
    trip.y = between(y, 160, b.worldSize - 160);
  }
  const h = Number(t.h);
  if (Number.isFinite(h)) trip.h = h;
  const clock = Number(t.clock);
  if (Number.isFinite(clock)) trip.clock = between(clock, 0, 0.999);
  if (Array.isArray(t.hold)) {
    const hold = new Array<number>(b.species).fill(0);
    t.hold.forEach((n, i) => {
      if (i < hold.length) hold[i] = Math.max(0, int(n));
    });
    // Trim from the cheapest species until the hold fits its capacity.
    const cap = b.holdCaps[holdLevel] ?? 0;
    let total = hold.reduce((a, n) => a + n, 0);
    for (let sp = 0; total > cap && sp < hold.length; sp++) {
      const k = Math.min(hold[sp] ?? 0, total - cap);
      hold[sp] = (hold[sp] ?? 0) - k;
      total -= k;
    }
    trip.hold = hold;
  }
  return trip;
}

/**
 * Turn whatever localStorage held into save data the game can trust. Missing
 * or malformed input gives the defaults; every number is coerced and clamped
 * the way the prototype did it.
 */
export function parseSave(raw: string | null, b: Bounds): SaveData {
  const d = defaultSave(b);
  let s: unknown;
  try {
    s = JSON.parse(raw || 'null');
  } catch {
    return d;
  }
  if (!s || typeof s !== 'object') return d;
  const o = s as Record<string, unknown>;
  d.coins = int(o.coins);
  d.earned = int(o.earned);
  d.muted = !!o.muted;
  const lv = (o.lv && typeof o.lv === 'object' ? o.lv : {}) as Record<string, unknown>;
  for (const k of ['net', 'hold', 'engine'] as const) d.lv[k] = between(int(lv[k]), 0, b.maxLevel);
  d.paint = between(int(o.paint), 0, b.paints - 1);
  d.levSeen = !!o.levSeen;
  d.whaleSeen = !!o.whaleSeen;
  if (o.gear && typeof o.gear === 'object') {
    const g = o.gear as Record<string, unknown>;
    d.gear = { mesh: !!g.mesh, strongbox: !!g.strongbox };
  }
  d.wood = Math.max(0, int(o.wood));
  d.build = between(int(o.build), 0, b.stages);
  d.market = o.market === undefined ? -1 : between(int(o.market), -1, b.species - 1);
  d.day = o.day === undefined ? 1 : Math.max(1, int(o.day));
  if (Array.isArray(o.first)) {
    o.first.forEach((n, i) => {
      if (i < d.first.length) d.first[i] = Math.max(0, int(n));
    });
  }
  if (Array.isArray(o.log)) {
    o.log.forEach((n, i) => {
      if (i < d.log.length) d.log[i] = int(n);
    });
  }
  if (o.order && typeof o.order === 'object') {
    const r = o.order as Record<string, unknown>;
    const sp = Number(r.sp);
    if (Number.isInteger(sp) && sp >= 0 && sp < b.species && Number(r.n) > 0) {
      d.order = { sp, n: int(r.n), have: int(r.have), pay: int(r.pay) };
    }
  }
  d.trip = parseTrip(o.trip, b, d.lv.hold);
  d.keys = o.keys === 'point' ? 'point' : 'drive';
  return d;
}

/** The string to put in localStorage. A null trip is left out, as before. */
export function serializeSave(d: SaveData): string {
  return JSON.stringify({
    coins: d.coins,
    earned: d.earned,
    muted: d.muted,
    lv: d.lv,
    paint: d.paint,
    log: d.log,
    order: d.order,
    wood: d.wood,
    build: d.build,
    market: d.market,
    day: d.day,
    first: d.first,
    levSeen: d.levSeen,
    whaleSeen: d.whaleSeen,
    gear: d.gear,
    trip: d.trip ?? undefined,
    keys: d.keys,
  });
}
