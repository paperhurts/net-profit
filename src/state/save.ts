/**
 * Reading and writing the netprofit.v1 save, moved verbatim from the prototype
 * script: the same key, the same shape, the same clamping of whatever is found
 * in localStorage. Existing saves must keep loading; tests/unit/save.test.ts
 * holds one. A versioned format with migration is Phase 2.
 */

import { ARMOUR_MAX } from '../data/armour';
import { type Crew, DEFAULT_CREW, parseCrew } from '../data/crew';
import { type Flag, OLD_START_FLAG, parseFlag, sameFlag } from '../data/flag';
import { type Driven, noDriven, parseDriven } from '../data/harpoon';
import { JUNK_MAX, parseMuffins } from '../data/junk';
import { noSnacks, parseSnacks, parseSprays, type Snacks } from '../data/snacks';
import { SPEAR_MAX } from '../data/spear';
import { CROWS } from '../entities/crows';
import { LEGGY_MAX } from '../entities/leggy';
import { type Charter, parseCharter } from '../fishing/charter';
import { type Pot, parsePots } from '../fishing/pots';
import { type Bases, noBases, parseBases } from '../world/bases';
import { ICE_LOOT_ALL } from '../world/icedive';
import { LOOT_ALL } from '../world/loot';
import { TD } from '../world/trench';

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
/** The Heron's stages: 1, beaten on island 8's tower roof, flown to his nest; 2, beaten for good on island 9's. */
export const HERON_STAGES = 2;
/**
 * The Reaper's egg so far: 1, the Reaper on land beaten and the egg left in his nest; 2, the egg taken, aboard;
 * 3, hatched, and the baby Reaper is yours.
 */
export const EGG_STAGES = 3;
/** Fish that make the otter yours. */
export const OTTER_FEEDS = 3;
/** Ice fish that make Neil, the seal on the ice floe, yours. */
export const NEIL_FEEDS = 3;

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
  /** The Reaper, the kid's leviathan with legs, has been sighted in the deep. */
  reaperSeen: boolean;
  /** The Reaper on land, the second of him, has been sighted asleep by his nest on island 6. */
  reaperLandSeen: boolean;
  /** The Reaper on land is back by his nest for a rematch (the tester panel's), though his egg has been had. */
  reaperRematch: boolean;
  /** The Old One's rising is still owed to a game the tester skipped past him: it plays the next time the figure goes into the ruins. */
  oldOwed: boolean;
  /** His egg: 0 he is not beaten; 1 beaten, the egg waiting in his nest; 2 the egg is yours, aboard; 3 hatched. */
  reaperEgg: number;
  /** The day the egg was taken aboard: it hatches at the next dawn. */
  eggDay: number;
  /** Who rides which craft of the flotilla, the kid's choice (data/crew.ts). */
  crew: Crew;
  /** Junk the net brought up, in the bucket on deck for the muffin man (data/junk.ts). */
  junk: number;
  /** The fish muffins in the box, each the time it was baked, in game days. */
  muffins: number[];
  /** Island 10's old man's snacks in the bag: apples, carrots and bananas. */
  snacks: Snacks;
  /** Sprays of his bug spray left, for the swamp's spider. */
  bugSpray: number;
  /** Muffins left uneaten that grew legs and follow you (entities/leggy.ts), six at most. */
  leggy: number;
  /** The ice floe in the far deep found, and how many times the line has gone down through its hole. */
  iceSeen: boolean;
  iceRuns: number;
  /** Lionfish have been seen in the outer sea. */
  lionSeen: boolean;
  /** Lionfish caught on the rod, for the bounty. */
  lionCaught: number;
  /** The aquarium on the home island is built. */
  aquarium: boolean;
  /** How far each base on the other islands is built: 0 nothing, 1 its hut, and so on. */
  bases: Bases;
  /** The crab pots out in the water, where each is, its crabs and how far toward the next. */
  pots: Pot[];
  /** The trench in the deep has been found, and the deepest the diver has been in it. */
  trenchSeen: boolean;
  trenchDeep: number;
  /** The trench's treasures found, one bit each, and the day the giant clam's pearl was last taken. */
  trenchLoot: number;
  /** The things frozen in the ice under the floe that have been chipped out, a bit each. */
  iceLoot: number;
  pearlDay: number;
  /** The treasure chest in the wreck off island 5 has been found. */
  wreckChest: boolean;
  /** A storm has been met out past the buoys, which puts ballast on the shipwright's shelf. */
  stormSeen: boolean;
  /** The lurker in the trench's dark has been met, and how many times a spear has stung it off. */
  lurkerSeen: boolean;
  lurkerStung: number;
  /** Charter passengers aboard, if any, and how many charters have paid. */
  charter: Charter | null;
  chartersRun: number;
  /** The naga, freed from the monkeys' cage on island 2, is yours. */
  nagaFree: boolean;
  /** Islands 8 and 9, the Heron's twins, have been sighted. */
  isle8Seen: boolean;
  /** Island 10 has been sighted, in the far deep's north-east corner. Missing in old saves and read as not. */
  isle10Seen: boolean;
  /** Island 10's giant pelican has been beaten on top of its tower. Missing in old saves and read as not. */
  pelicanBeaten: boolean;
  /** Little loaves of bread the pelican left, for a birdfeeder. */
  bread: number;
  /** Island 10's birdfeeder has bread in it, so the crows come. Missing in old saves and read as empty. */
  feederFull: boolean;
  /** Crows won at the feeder, each by a science question answered right: they ride on the boat's rail. */
  crows: number;
  /** Fish tossed to the otter off the home dock: three make him yours. */
  otterFed: number;
  /** Ice fish tossed to Neil, the seal at the ice floe's edge: three make him yours. */
  neilFed: number;
  /** The day the coast guard was last called, 0 for never: one call a day. Missing in old saves and read as never. */
  radioDay: number;
  /** The Heron: 0 not met, 1 beaten on island 8's tower and flown to his nest, 2 beaten for good on island 9's. */
  heronStage: number;
  /** The spear's level from the shipwright: 0 for none. */
  spear: number;
  /** The armour's level from the shipwright: 0 for none, then leather, diamond, gold, space. */
  armour: number;
  /** Everywhere the boat has sailed, for the sea map (state/sailed.ts), as base64; empty before the map. */
  sailed: string;
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
  gear: {
    mesh: boolean;
    strongbox: boolean;
    suit: boolean;
    kit: boolean;
    rod: boolean;
    lionnet: boolean;
    tank: boolean;
    ballast: boolean;
    /** The white scuba suit: warm under the ice. */
    white: boolean;
    /** The radar: fish, threats and the rest round the boat; missing in old saves and read as not bought. */
    radar: boolean;
    /** The coast guard radio; missing in old saves and read as not bought. */
    radio: boolean;
  };
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
    reaperSeen: false,
    reaperLandSeen: false,
    reaperRematch: false,
    oldOwed: false,
    reaperEgg: 0,
    eggDay: 0,
    crew: { ...DEFAULT_CREW },
    junk: 0,
    muffins: [],
    snacks: noSnacks(),
    bugSpray: 0,
    leggy: 0,
    iceSeen: false,
    iceRuns: 0,
    lionSeen: false,
    lionCaught: 0,
    aquarium: false,
    bases: noBases(),
    pots: [],
    trenchSeen: false,
    trenchDeep: 0,
    trenchLoot: 0,
    iceLoot: 0,
    pearlDay: 0,
    wreckChest: false,
    stormSeen: false,
    lurkerSeen: false,
    lurkerStung: 0,
    charter: null,
    chartersRun: 0,
    nagaFree: false,
    isle8Seen: false,
    isle10Seen: false,
    pelicanBeaten: false,
    bread: 0,
    feederFull: false,
    crows: 0,
    otterFed: 0,
    neilFed: 0,
    radioDay: 0,
    heronStage: 0,
    spear: 0,
    armour: 0,
    sailed: '',
    masks: 0,
    towerTaken: false,
    isle3Stage: 0,
    isle4Stage: 0,
    driven: noDriven(),
    turtleSeen: false,
    turtleSwims: 0,
    gear: {
      mesh: false,
      strongbox: false,
      suit: false,
      kit: false,
      rod: false,
      lionnet: false,
      tank: false,
      ballast: false,
      white: false,
      radar: false,
      radio: false,
    },
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
  // The old first flag, which the designer saved the moment it opened: back to none, so the new first flag
  // shows. A player who meant it can pick it again in a tap.
  if (d.flag && sameFlag(d.flag, OLD_START_FLAG)) d.flag = null;
  d.gulperSeen = !!o.gulperSeen;
  d.meteorSeen = !!o.meteorSeen;
  d.reaperSeen = !!o.reaperSeen;
  d.reaperLandSeen = !!o.reaperLandSeen;
  d.reaperRematch = !!o.reaperRematch;
  d.oldOwed = !!o.oldOwed;
  d.reaperEgg = Math.max(0, Math.min(EGG_STAGES, int(o.reaperEgg)));
  // Missing in a save from before the egg could hatch, read as day 0: an egg already aboard hatches at once.
  d.eggDay = Math.max(0, int(o.eggDay));
  // Missing in a save from before the Boats card, read as the crew they started with.
  d.crew = parseCrew(o.crew);
  // Missing in a save from before the muffin man baked, read as none.
  d.junk = between(int(o.junk), 0, JUNK_MAX);
  d.muffins = parseMuffins(o.muffins);
  // Missing in a save from before the old man's store, read as an empty bag.
  d.snacks = parseSnacks(o.snacks);
  d.bugSpray = parseSprays(o.bugSpray);
  // Missing in a save from before muffins grew legs, read as none.
  d.leggy = between(int(o.leggy), 0, LEGGY_MAX);
  d.iceSeen = !!o.iceSeen;
  d.iceRuns =
    typeof o.iceRuns === 'number' && Number.isFinite(o.iceRuns) && o.iceRuns > 0
      ? Math.floor(o.iceRuns)
      : 0;
  d.lionSeen = !!o.lionSeen;
  d.lionCaught = Math.max(0, int(o.lionCaught));
  d.aquarium = !!o.aquarium;
  d.bases = parseBases(o.bases);
  d.pots = parsePots(o.pots);
  d.trenchSeen = !!o.trenchSeen;
  d.trenchDeep = Math.max(0, Math.min(TD, int(o.trenchDeep)));
  d.trenchLoot = int(o.trenchLoot) & LOOT_ALL;
  d.iceLoot = int(o.iceLoot) & ICE_LOOT_ALL;
  d.pearlDay = Math.max(0, int(o.pearlDay));
  d.wreckChest = !!o.wreckChest;
  d.stormSeen = !!o.stormSeen;
  d.lurkerSeen = !!o.lurkerSeen;
  d.lurkerStung = Math.max(0, int(o.lurkerStung));
  d.charter = parseCharter(o.charter);
  d.chartersRun = Math.max(0, int(o.chartersRun));
  d.nagaFree = !!o.nagaFree;
  d.isle8Seen = !!o.isle8Seen;
  d.isle10Seen = !!o.isle10Seen;
  d.pelicanBeaten = !!o.pelicanBeaten;
  d.bread = Math.max(0, Math.min(9, int(o.bread)));
  d.feederFull = !!o.feederFull;
  d.crows = between(int(o.crows), 0, CROWS);
  d.otterFed = Math.max(0, Math.min(OTTER_FEEDS, int(o.otterFed)));
  d.neilFed = Math.max(0, Math.min(NEIL_FEEDS, int(o.neilFed)));
  d.radioDay = Math.max(0, int(o.radioDay));
  d.heronStage = Math.max(0, Math.min(HERON_STAGES, int(o.heronStage)));
  d.spear = o.spear === undefined ? 0 : between(int(o.spear), 0, SPEAR_MAX);
  d.armour = between(int(o.armour), 0, ARMOUR_MAX);
  d.sailed = typeof o.sailed === 'string' && o.sailed.length < 4096 ? o.sailed : '';
  d.masks = Math.max(0, int(o.masks));
  d.towerTaken = !!o.towerTaken;
  d.isle3Stage = Math.max(0, Math.min(ISLE3_STAGES, int(o.isle3Stage)));
  d.isle4Stage = Math.max(0, Math.min(ISLE4_STAGES, int(o.isle4Stage)));
  d.driven = parseDriven(o.driven);
  d.turtleSeen = !!o.turtleSeen;
  d.turtleSwims = Math.max(0, int(o.turtleSwims));
  if (o.gear && typeof o.gear === 'object') {
    const g = o.gear as Record<string, unknown>;
    d.gear = {
      mesh: !!g.mesh,
      strongbox: !!g.strongbox,
      suit: !!g.suit,
      kit: !!g.kit,
      rod: !!g.rod,
      lionnet: !!g.lionnet,
      tank: !!g.tank,
      ballast: !!g.ballast,
      white: !!g.white,
      radar: !!g.radar,
      radio: !!g.radio,
    };
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
    reaperSeen: d.reaperSeen,
    reaperLandSeen: d.reaperLandSeen,
    reaperRematch: d.reaperRematch,
    oldOwed: d.oldOwed,
    reaperEgg: d.reaperEgg,
    eggDay: d.eggDay,
    crew: d.crew,
    junk: d.junk,
    muffins: d.muffins,
    snacks: d.snacks,
    bugSpray: d.bugSpray,
    leggy: d.leggy,
    iceSeen: d.iceSeen,
    iceRuns: d.iceRuns,
    lionSeen: d.lionSeen,
    lionCaught: d.lionCaught,
    aquarium: d.aquarium,
    bases: d.bases,
    pots: d.pots,
    trenchSeen: d.trenchSeen,
    trenchDeep: d.trenchDeep,
    trenchLoot: d.trenchLoot,
    iceLoot: d.iceLoot,
    pearlDay: d.pearlDay,
    wreckChest: d.wreckChest,
    stormSeen: d.stormSeen,
    lurkerSeen: d.lurkerSeen,
    lurkerStung: d.lurkerStung,
    charter: d.charter,
    chartersRun: d.chartersRun,
    nagaFree: d.nagaFree,
    isle8Seen: d.isle8Seen,
    isle10Seen: d.isle10Seen,
    pelicanBeaten: d.pelicanBeaten,
    bread: d.bread,
    feederFull: d.feederFull,
    crows: d.crows,
    otterFed: d.otterFed,
    neilFed: d.neilFed,
    radioDay: d.radioDay,
    heronStage: d.heronStage,
    spear: d.spear,
    armour: d.armour,
    sailed: d.sailed,
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
