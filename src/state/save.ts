/**
 * Reading and writing the netprofit.v1 save, moved verbatim from the prototype
 * script: the same key, the same shape, the same clamping of whatever is found
 * in localStorage. Existing saves must keep loading; tests/unit/save.test.ts
 * holds one. A versioned format with migration is Phase 2.
 */

import { ARMOUR_MAX } from '../data/armour';
import { type Flag, parseFlag } from '../data/flag';
import { type Driven, noDriven, parseDriven } from '../data/harpoon';
import { SPEAR_MAX } from '../data/spear';

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

/** The last of island 3's stages. */
export const ISLE3_STAGES = 4;
/** Island 4's story so far: 1, the Tar Anchorer beaten and the tarling yours. */
export const ISLE4_STAGES = 1;
/** Island 5's story so far: 1, the Skeleton Shark King dead. */
export const ISLE5_STAGES = 1;
/** Island 6's story so far: 1, the Deep One beaten at the surface and its temple open below; 2, Cthulhu beaten. */
export const ISLE6_STAGES = 2;
/**
 * Island 7's story so far: 1, the sorcerer beaten on its tower and the portal awake; 2, the Forgotten One beaten
 * in Gigantis; 3, his bones have given the key to the door behind his throne; 4, the Old One beaten in the ruins.
 */
export const ISLE7_STAGES = 4;

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
  /** The manta rays have been sighted. */
  mantaSeen: boolean;
  /** The Cthuluviathan seen asleep in its sunken city. */
  cthuluSeen: boolean;
  /** The anglerfish's jaws seen opening, out in the deep at night. */
  anglerSeen: boolean;
  /** The dog has been patted at least once: the game stops saying how. */
  petted: boolean;
  /** Island 2 has been sighted, out in the far corner of the deep. */
  isle2Seen: boolean;
  /** Island 3, the sunken island, has been sighted, out in the north corner of the deep. */
  isle3Seen: boolean;
  /** Island 5, the Skeleton Shark King's reef, has been sighted, out in the far deep. */
  isle5Seen: boolean;
  /** Island 6, the big island, has been sighted, and which of its treasure chests are opened, one bit each. */
  isle6Seen: boolean;
  /** How far through island 6's story: 0 not begun; 1 the Deep One dragged the boat under; 2 Cthulhu beaten. */
  isle6Stage: number;
  chests6: number;
  /** Island 7, the monkeys' island with the alien portal, has been sighted. */
  isle7Seen: boolean;
  /** Soul armour, from the Old One's ruins: it heals the figure as it hits. */
  soulArmour: boolean;
  /** How far through island 7's story: 0 not begun; 1 the sorcerer beaten a third time, the portal awake; 2 the Forgotten One beaten. */
  isle7Stage: number;
  /** How far through island 5's story: 0 not begun; 1 the Skeleton Shark King dead. */
  isle5Stage: number;
  /** The flag designed in the shop, or null for the pennant in the hull's paint. */
  flag: Flag | null;
  /** The gulper has hunted the boat. */
  gulperSeen: boolean;
  /** Star, the meteor serpent, has been sighted over island 6. */
  meteorSeen: boolean;
  /** The spear's level from the shipwright: 0 for none. */
  spear: number;
  /** The armour's level from the shipwright: 0 for none, then leather, diamond, gold, space. */
  armour: number;
  /** Skull masks dropped by beaten monkeys. */
  masks: number;
  /** The sorcerer on island 2's tower has been beaten: the tower flies the player's flag. */
  towerTaken: boolean;
  /**
   * How far through island 3's story: 0 not begun; 1 its tower taken and the scuba gear found; 2 the
   * swordsman under it beaten; 3 the demons beaten and the warlock free; 4 the tar island seen. Each
   * stage stays done.
   */
  isle3Stage: number;
  /** How far through island 4's story: 0 not begun; 1 the Tar Anchorer beaten and the tarling yours. */
  isle4Stage: number;
  /** How many times the harpoon has driven off each leviathan. */
  driven: Driven;
  /** A sea turtle has been sighted, and how many times one has swum with the boat. */
  turtleSeen: boolean;
  turtleSwims: number;
  /** What the shipwright has fitted. */
  gear: { mesh: boolean; strongbox: boolean; suit: boolean };
  /** The snook: casts made, fish landed, kept, giants, the best in inches, and the day of the first. */
  snook: {
    casts: number;
    landed: number;
    kept: number;
    giant: number;
    best: number;
    firstDay: number;
  };
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
  /** How far past the buoys a boat can be; a flagship saved out in the deep stays there. */
  deep?: number;
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
    mantaSeen: false,
    cthuluSeen: false,
    anglerSeen: false,
    petted: false,
    isle2Seen: false,
    isle3Seen: false,
    isle5Seen: false,
    isle6Seen: false,
    isle6Stage: 0,
    chests6: 0,
    isle7Seen: false,
    soulArmour: false,
    isle7Stage: 0,
    isle5Stage: 0,
    flag: null,
    gulperSeen: false,
    meteorSeen: false,
    spear: 0,
    armour: 0,
    masks: 0,
    towerTaken: false,
    isle3Stage: 0,
    isle4Stage: 0,
    driven: noDriven(),
    turtleSeen: false,
    turtleSwims: 0,
    gear: { mesh: false, strongbox: false, suit: false },
    snook: { casts: 0, landed: 0, kept: 0, giant: 0, best: 0, firstDay: 0 },
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
    const deep = b.deep ?? 0;
    trip.x = between(x, 160 - deep, b.worldSize - 160 + deep);
    trip.y = between(y, 160 - deep, b.worldSize - 160 + deep);
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
  d.mantaSeen = !!o.mantaSeen;
  d.cthuluSeen = !!o.cthuluSeen;
  d.anglerSeen = !!o.anglerSeen;
  d.petted = !!o.petted;
  d.isle2Seen = !!o.isle2Seen;
  d.isle3Seen = !!o.isle3Seen;
  d.isle5Seen = !!o.isle5Seen;
  d.isle6Seen = !!o.isle6Seen;
  d.isle6Stage = Math.max(0, Math.min(ISLE6_STAGES, int(o.isle6Stage)));
  d.chests6 = Math.max(0, Math.min(255, int(o.chests6)));
  d.isle7Seen = !!o.isle7Seen;
  d.soulArmour = !!o.soulArmour;
  d.isle7Stage = Math.max(0, Math.min(ISLE7_STAGES, int(o.isle7Stage)));
  d.isle5Stage = Math.max(0, Math.min(ISLE5_STAGES, int(o.isle5Stage)));
  d.flag = parseFlag(o.flag);
  d.gulperSeen = !!o.gulperSeen;
  d.meteorSeen = !!o.meteorSeen;
  d.spear = o.spear === undefined ? 0 : between(int(o.spear), 0, SPEAR_MAX);
  d.armour = between(int(o.armour), 0, ARMOUR_MAX);
  d.masks = Math.max(0, int(o.masks));
  d.towerTaken = !!o.towerTaken;
  d.isle3Stage = Math.max(0, Math.min(ISLE3_STAGES, int(o.isle3Stage)));
  d.isle4Stage = Math.max(0, Math.min(ISLE4_STAGES, int(o.isle4Stage)));
  d.driven = parseDriven(o.driven);
  d.turtleSeen = !!o.turtleSeen;
  d.turtleSwims = Math.max(0, int(o.turtleSwims));
  if (o.gear && typeof o.gear === 'object') {
    const g = o.gear as Record<string, unknown>;
    d.gear = { mesh: !!g.mesh, strongbox: !!g.strongbox, suit: !!g.suit };
  }
  if (o.snook && typeof o.snook === 'object') {
    const k = o.snook as Record<string, unknown>;
    for (const f of ['casts', 'landed', 'kept', 'giant', 'best', 'firstDay'] as const) {
      d.snook[f] = Math.max(0, int(k[f]));
    }
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
    mantaSeen: d.mantaSeen,
    cthuluSeen: d.cthuluSeen,
    anglerSeen: d.anglerSeen,
    petted: d.petted,
    isle2Seen: d.isle2Seen,
    isle3Seen: d.isle3Seen,
    isle5Seen: d.isle5Seen,
    isle6Seen: d.isle6Seen,
    isle6Stage: d.isle6Stage,
    chests6: d.chests6,
    isle7Seen: d.isle7Seen,
    soulArmour: d.soulArmour,
    isle7Stage: d.isle7Stage,
    isle5Stage: d.isle5Stage,
    flag: d.flag,
    gulperSeen: d.gulperSeen,
    meteorSeen: d.meteorSeen,
    spear: d.spear,
    armour: d.armour,
    masks: d.masks,
    towerTaken: d.towerTaken,
    isle3Stage: d.isle3Stage,
    isle4Stage: d.isle4Stage,
    driven: d.driven,
    turtleSeen: d.turtleSeen,
    turtleSwims: d.turtleSwims,
    gear: d.gear,
    snook: d.snook,
    trip: d.trip ?? undefined,
    keys: d.keys,
  });
}
