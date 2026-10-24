/**
 * Reading and writing the netprofit.v1 save, moved verbatim from the prototype
 * script: the same key, the same shape, the same clamping of whatever is found
 * in localStorage. Existing saves must keep loading; tests/unit/save.test.ts
 * holds one. A versioned format with migration is Phase 2.
 */

import { ARMOUR_MAX } from '../data/armour';
import { type Badges, noBadges, parseBadges } from '../data/badges';
import { type BargeSetup, defaultBarge, parseBarge } from '../data/barge';
import { type Battles, parseBattles } from '../data/battle';
import { type Crew, DEFAULT_CREW, parseCrew } from '../data/crew';
import {
  BEETLES_MAX,
  DRONE_COLOURS,
  type DroneUpgrade,
  TRAP_SPOTS,
  UPGRADE_KINDS,
  UPGRADE_MAX,
} from '../data/drone';
import { type Flag, OLD_START_FLAG, parseFlag, sameFlag } from '../data/flag';
import { type Garden, noGarden, parseGarden, untouchedGarden } from '../data/garden';
import { type Driven, noDriven, parseDriven } from '../data/harpoon';
import { type HqBuilt, noHq, parseHq } from '../data/hq';
import { JUNK_MAX, parseMuffins } from '../data/junk';
import { type Look, parseLook, SKIPPER } from '../data/look';
import { noPets, type PetSave, parsePets, petsForSave } from '../data/petsys';
import { isScanKind, type ScanKind } from '../data/scans';
import { parseSlalom, type Slalom } from '../data/slalom';
import { noSnacks, parseHoney, parseSnacks, parseSprays, type Snacks } from '../data/snacks';
import { SPEAR_MAX } from '../data/spear';
import { type Companion, parseStay } from '../data/stay';
import { CROWS } from '../entities/crows';
import { LEGGY_MAX } from '../entities/leggy';
import { type Charter, parseCharter } from '../fishing/charter';
import { type Pot, parsePots } from '../fishing/pots';
import { type Bases, noBases, parseBases } from '../world/bases';
import { ICE_LOOT_ALL } from '../world/icedive';
import { LOOT_ALL } from '../world/loot';
import { noSubFound, parseSubFound, type SubFound } from '../world/subsea';
import { SUNKEN_COUNT } from '../world/sunken';
import { TD } from '../world/trench';
import { readCode } from './cloud';

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
  /** The Skeleton Shark King's last words are still owed to a game the tester skipped past him: they play the next time the boat sails up to island 5. */
  kingOwed: boolean;
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
  /** Jars of honey in the bag, for the Reapers, and the day the forest's bees last gave one, 0 for never. */
  honey: number;
  hiveDay: number;
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
  /** The abyss past the white buoys: seen from the boat, and gone down to its floor in the cage. */
  abyssSeen: boolean;
  abyssDown: boolean;
  /** The kid's metal bridge across the far far sea's north edge, the tar ocean past it: seen from the boat. */
  bridgeSeen: boolean;
  /** In through its door: the first time, the way round it is told. */
  bridgeIn: boolean;
  /** Stealth mission 1 won: the sorcerer kicked off his tower, the chemistry boat yours. */
  stealth1: boolean;
  /** The scientist's invisibility potion, given at the start of stealth mission 1. */
  invis: boolean;
  /** The friends left at your castle at the roll-call board, waiting in its courtyard: not with you, ashore or at sea. */
  stay: Companion[];
  /**
   * The tar ocean's fish (world/tarfish.ts): the day the last was caught, which of that day's dozen are taken (a bit
   * each), how many are in the chemistry boat's tar bucket for the scientist, and how many ever caught.
   */
  tarDay: number;
  tarTaken: number;
  tarBucket: number;
  tarCaught: number;
  /** Ashore on the tar island once (world/tarisle.ts): its arrow at the screen's edge stops pulsing. */
  tarIsleSeen: boolean;
  /** The tar leader beaten on the tar island's high ground (entities/tarleader.ts): he stays beaten. */
  tarLeaderBeaten: boolean;
  /** Mission 2, the tar eel (entities/tareel.ts): 0 not taken, 1 taken and the eel hunting the tar, 2 beaten. */
  eelStage: number;
  /** The day the Remoro was last landed on the abyss's floor: one a day. */
  remoroDay: number;
  /** And the attack nibbler, the hunter of the floor: one a day too. */
  hunterDay: number;
  /** Your headquarters' upgrades built (data/hq.ts), and the day the garden's snack was last picked. */
  hq: HqBuilt;
  gardenDay: number;
  /** Your weapons sharpened at your headquarters' forge. */
  sharp: boolean;
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
  /** Island 11 has been sighted, out in the far far sea past island 10. Missing in old saves and read as not. */
  isle11Seen: boolean;
  /** Skull Island has been sighted, in the far far sea's bottom corner. Missing in old saves and read as not. */
  isle12Seen: boolean;
  /** The Heron's brother has flown from island 11, and Caterman has come out of his workshop to join you. */
  catermanFree: boolean;
  /** The skull key, fetched up from the bottom of island 11's black lagoon (world/lagoondive.ts). Missing in old saves and read as not. */
  skullKey: boolean;
  /** The crypt behind the skull door won: the Forgotten One beaten again, and yielded. Missing in old saves and read as not. */
  cryptWon: boolean;
  /** Skrill beaten at the top of his tower on Skull Island. Missing in old saves and read as not. */
  skrillBeaten: boolean;
  /** The tar kraken beaten, under the middle of the tar ocean. Missing in old saves and read as not. */
  krakenBeaten: boolean;
  /** Round two: the tar kraken beaten again, on foot on the tar island. Missing in old saves and read as not. */
  krakenFoot: boolean;
  /** The Forgotten One has shown you round his castle and given it you: Gigantis is your headquarters, and he is gone,
   *  saving you from the Old One. Missing in old saves and read as not. */
  castleHQ: boolean;
  /** The portable scanner he gave you, by its level: 0 without one. Missing in old saves and read as none. */
  scanner: number;
  /** The kinds of creature scanned with it (data/scans.ts), each once. Missing in old saves and read as none. */
  scanned: ScanKind[];
  /** The game's save code, four words (state/cloud.ts): the game is kept online under it. Missing in old saves, or not
   *  a code, and read as none, and the game makes one. */
  saveCode: string;
  /** When the save code was last shown, to write down (milliseconds, the device's clock); 0 for never. */
  codeTold: number;
  /** The Battle Barge's last setup, its arena and who to fight (data/barge.ts); missing in old saves, read as the start. */
  barge: BargeSetup;
  /** Fights won on the Battle Barge. Missing in old saves and read as none. */
  bargeWins: number;
  /** Island 10's giant pelican has been beaten on top of its tower. Missing in old saves and read as not. */
  pelicanBeaten: boolean;
  /** Little loaves of bread the pelican left, for a birdfeeder. */
  bread: number;
  /** Island 10's birdfeeder has bread in it, so the crows come. Missing in old saves and read as empty. */
  feederFull: boolean;
  /** Crows won at the feeder, each by a science question answered right: they ride on the boat's rail. */
  crows: number;
  /** The old man's treasure submarine is on deck. Missing in old saves and read as not. */
  sub: boolean;
  /** Which treasures the submarine has found today, patch by patch of the far deep. */
  subFound: SubFound;
  /** The badges bought from the old man, and who wears each. Missing in old saves and read as none. */
  badges: Badges;
  /** The old man's treasure finder is fitted to the radar. Missing in old saves and read as not. */
  finder: boolean;
  /** The day the sunken treasure was last looked at, and which of that day's were found, a bit each. */
  sunkenDay: number;
  sunkenFound: number;
  /** Fish tossed to the otter off the home dock: three make him yours. */
  otterFed: number;
  /** Ice fish tossed to Neil, the seal at the ice floe's edge: three make him yours. */
  neilFed: number;
  /** The day the coast guard was last called, 0 for never: one call a day. Missing in old saves and read as never. */
  radioDay: number;
  /** The Heron: 0 not met, 1 beaten on island 8's tower and flown to his nest, 2 beaten for good on island 9's. */
  heronStage: number;
  /** Beaten on island 9, the Heron fell in the sea, the Reaper hunted him and he got away through a portal: that scene
   * has played. Missing in old saves and read as not yet, so a game that beat him before it existed sees it once. */
  heronFled: boolean;
  /** Who the figure is: the character picked on the character screen. Skipper, the old figure, in a save from before. */
  look: Look;
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
  /**
   * The drone (island 11's, the owner's): whether it is yours, its colour (an index into data/drone.ts
   * DRONE_COLOURS), flights flown, and the most rings in one; missing in old saves, read as none. Its bug traps: for
   * each spot along the course, the day a trap was hung there (-1 for none; full the next day), and the jewel beetles
   * brought home; missing in saves from before the traps, read as none hung and no beetles. Its upgrades' levels, 0
   * to 2 each; missing in saves from before them, read as none.
   */
  drone: {
    owned: boolean;
    colour: number;
    flights: number;
    bestRings: number;
    traps: number[];
    beetles: number;
    up: Record<DroneUpgrade, number>;
  };
  /**
   * The mermaids on the rocks off island 2 (the owner's): whether they have been seen, and the pearls they have given
   * for singing their tunes back; missing in old saves, read as not yet and none.
   */
  mer: {
    seen: boolean;
    /** Pearls held, pearls given in all, and the day the last was given (-1 for never): one a night. */
    pearls: number;
    given: number;
    night: number;
    /** Five pearls strung into a charm against the sirens; missing in saves from before it, read as not yet. */
    charm: boolean;
    /** The sirens heard, after midnight on the same rocks; missing in saves from before them, read as not yet. */
    sirens: boolean;
  };
  /**
   * The Endless Isle, island 13, the kid's: whether it has been sighted, out in the far far sea's left corner, and which
   * sides you have joined, the pirates (Jacks Parrow with you) and the ninjas (Bun-San); you can join both. More of it
   * comes in later pieces (battle badges, the mini-games' best runs). Missing in old saves and read as not seen and
   * nobody joined; left out of the save until it is seen, so the copy-my-game link stays short. Its battles fought,
   * won and marked (data/battle.ts) are there once you have fought one, and the Ninja Slalom's runs and best times
   * (data/slalom.ts) once you have skied one.
   */
  endless: {
    seen: boolean;
    pirate: boolean;
    ninja: boolean;
    battles?: Battles;
    slalom?: Slalom;
  };
  /**
   * The pet system (data/petsys.ts): for now the names given in the pet book. Missing in old saves and read as nothing
   * named; left out of the save while it is empty, so the copy-my-game link stays short.
   */
  pets: PetSave;
  /**
   * The Garden Isle, island 14 (data/garden.ts): sighted or not, for now. Missing in old saves and read as not seen;
   * left out of the save until it is seen.
   */
  garden: Garden;
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
    kingOwed: false,
    reaperEgg: 0,
    eggDay: 0,
    crew: { ...DEFAULT_CREW },
    junk: 0,
    muffins: [],
    snacks: noSnacks(),
    bugSpray: 0,
    honey: 0,
    hiveDay: 0,
    leggy: 0,
    iceSeen: false,
    iceRuns: 0,
    lionSeen: false,
    lionCaught: 0,
    aquarium: false,
    bases: noBases(),
    pots: [],
    trenchSeen: false,
    abyssSeen: false,
    abyssDown: false,
    bridgeSeen: false,
    bridgeIn: false,
    stealth1: false,
    invis: false,
    stay: [],
    tarDay: 0,
    tarTaken: 0,
    tarBucket: 0,
    tarCaught: 0,
    tarIsleSeen: false,
    tarLeaderBeaten: false,
    eelStage: 0,
    remoroDay: 0,
    hunterDay: 0,
    hq: noHq(),
    gardenDay: 0,
    sharp: false,
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
    isle11Seen: false,
    isle12Seen: false,
    catermanFree: false,
    skullKey: false,
    cryptWon: false,
    skrillBeaten: false,
    krakenBeaten: false,
    krakenFoot: false,
    castleHQ: false,
    scanner: 0,
    scanned: [],
    saveCode: '',
    codeTold: 0,
    barge: defaultBarge(),
    bargeWins: 0,
    pelicanBeaten: false,
    bread: 0,
    feederFull: false,
    crows: 0,
    sub: false,
    subFound: noSubFound(),
    badges: noBadges(),
    finder: false,
    sunkenDay: 0,
    sunkenFound: 0,
    otterFed: 0,
    neilFed: 0,
    radioDay: 0,
    heronStage: 0,
    heronFled: false,
    look: { ...SKIPPER },
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
    drone: {
      owned: false,
      colour: 0,
      flights: 0,
      bestRings: 0,
      traps: noTraps(),
      beetles: 0,
      up: noUpgrades(),
    },
    mer: { seen: false, pearls: 0, given: 0, night: -1, charm: false, sirens: false },
    endless: { seen: false, pirate: false, ninja: false },
    pets: noPets(),
    garden: noGarden(),
    snook: { casts: 0, landed: 0, kept: 0, giant: 0, best: 0, firstDay: 0 },
    trip: null,
    keys: 'drive',
  };
}

const int = (v: unknown): number => Number(v) | 0;
/** More pearls than anyone will string. */
const PEARLS_MAX = 999;
const between = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** No drone traps hung anywhere along the course. */
export const noTraps = (): number[] => Array.from({ length: TRAP_SPOTS }, () => -1);

/** A drone not bought, no colour picked: what a game starts with, and reads back when its save has none. */
function untouchedDrone(dr: SaveData['drone']): boolean {
  return (
    !dr.owned &&
    dr.colour === 0 &&
    dr.flights === 0 &&
    dr.bestRings === 0 &&
    dr.beetles === 0 &&
    dr.traps.every((t) => t < 0) &&
    UPGRADE_KINDS.every((k) => dr.up[k] === 0)
  );
}

/** No drone upgrades bought. */
export const noUpgrades = (): Record<DroneUpgrade, number> => ({
  battery: 0,
  handling: 0,
  traps: 0,
  line: 0,
});

function parseUpgrades(v: unknown): Record<DroneUpgrade, number> {
  const out = noUpgrades();
  if (!v || typeof v !== 'object') return out;
  const o = v as Record<string, unknown>;
  for (const k of UPGRADE_KINDS) out[k] = between(int(o[k]), 0, UPGRADE_MAX);
  return out;
}

/** The days the drone's traps were hung, by spot: a day, or -1 for none, never more than there are spots for. */
function parseTraps(v: unknown): number[] {
  const out = noTraps();
  if (!Array.isArray(v)) return out;
  let hung = 0;
  for (let i = 0; i < TRAP_SPOTS; i++) {
    const d = v[i];
    if (typeof d === 'number' && Number.isFinite(d) && d >= 0 && hung < TRAP_SPOTS) {
      out[i] = d | 0;
      hung++;
    }
  }
  return out;
}

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
  d.kingOwed = !!o.kingOwed;
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
  // Missing in a save from before honey, read as none and the hive never visited.
  d.honey = parseHoney(o.honey);
  d.hiveDay = Math.max(0, int(o.hiveDay));
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
  d.abyssSeen = !!o.abyssSeen;
  d.abyssDown = !!o.abyssDown;
  d.bridgeSeen = !!o.bridgeSeen;
  d.bridgeIn = !!o.bridgeIn;
  d.stealth1 = !!o.stealth1;
  d.invis = !!o.invis;
  d.stay = parseStay(o.stay);
  d.tarDay = Math.max(0, int(o.tarDay));
  d.tarTaken = int(o.tarTaken) & 0xfff;
  d.tarBucket = Math.max(0, int(o.tarBucket));
  d.tarCaught = Math.max(d.tarBucket, int(o.tarCaught));
  d.tarIsleSeen = o.tarIsleSeen === true;
  d.tarLeaderBeaten = o.tarLeaderBeaten === true;
  d.eelStage = Math.min(2, Math.max(0, int(o.eelStage)));
  d.remoroDay = Math.max(0, int(o.remoroDay));
  d.hunterDay = Math.max(0, int(o.hunterDay));
  d.hq = parseHq(o.hq);
  d.gardenDay = Math.max(0, int(o.gardenDay));
  d.sharp = o.sharp === true;
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
  d.isle11Seen = !!o.isle11Seen;
  d.isle12Seen = !!o.isle12Seen;
  d.catermanFree = !!o.catermanFree;
  d.skullKey = !!o.skullKey;
  d.cryptWon = !!o.cryptWon;
  d.skrillBeaten = !!o.skrillBeaten;
  d.krakenBeaten = !!o.krakenBeaten;
  d.krakenFoot = !!o.krakenFoot;
  d.castleHQ = !!o.castleHQ;
  d.scanner = typeof o.scanner === 'number' && o.scanner > 0 ? Math.floor(o.scanner) : 0;
  d.scanned = Array.isArray(o.scanned) ? [...new Set(o.scanned.filter(isScanKind))] : [];
  d.saveCode =
    typeof o.saveCode === 'string' && readCode(o.saveCode) === o.saveCode ? o.saveCode : '';
  d.codeTold =
    typeof o.codeTold === 'number' && Number.isFinite(o.codeTold) && o.codeTold > 0
      ? Math.floor(o.codeTold)
      : 0;
  d.barge = parseBarge(o.barge);
  d.bargeWins = typeof o.bargeWins === 'number' && o.bargeWins > 0 ? Math.floor(o.bargeWins) : 0;
  d.pelicanBeaten = !!o.pelicanBeaten;
  d.bread = Math.max(0, Math.min(9, int(o.bread)));
  d.feederFull = !!o.feederFull;
  d.crows = between(int(o.crows), 0, CROWS);
  d.sub = !!o.sub;
  d.subFound = parseSubFound(o.subFound);
  d.badges = parseBadges(o.badges);
  d.finder = !!o.finder;
  d.sunkenDay = Math.max(0, int(o.sunkenDay));
  d.sunkenFound = between(int(o.sunkenFound), 0, (1 << SUNKEN_COUNT) - 1);
  d.otterFed = Math.max(0, Math.min(OTTER_FEEDS, int(o.otterFed)));
  d.neilFed = Math.max(0, Math.min(NEIL_FEEDS, int(o.neilFed)));
  d.radioDay = Math.max(0, int(o.radioDay));
  d.heronStage = Math.max(0, Math.min(HERON_STAGES, int(o.heronStage)));
  d.heronFled = d.heronStage >= HERON_STAGES && !!o.heronFled;
  d.look = parseLook(o.look);
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
  if (o.drone && typeof o.drone === 'object') {
    const k = o.drone as Record<string, unknown>;
    d.drone = {
      owned: !!k.owned,
      colour: between(int(k.colour), 0, DRONE_COLOURS.length - 1),
      flights: Math.max(0, int(k.flights)),
      bestRings: Math.max(0, int(k.bestRings)),
      traps: parseTraps(k.traps),
      beetles: between(int(k.beetles), 0, BEETLES_MAX),
      up: parseUpgrades(k.up),
    };
  }
  if (o.mer && typeof o.mer === 'object') {
    const k = o.mer as Record<string, unknown>;
    const given = between(int(k.given), 0, PEARLS_MAX);
    d.mer = {
      seen: !!k.seen || given > 0,
      pearls: between(int(k.pearls), 0, given),
      given,
      night: k.night === undefined ? -1 : Math.max(-1, int(k.night)),
      charm: !!k.charm,
      sirens: !!k.sirens,
    };
  }
  // Its key was doom the day it was built, before the rename; doom is never to be used again, for the new Doom Island.
  const endless = o.endless ?? o.doom;
  if (endless && typeof endless === 'object') {
    const k = endless as Record<string, unknown>;
    d.endless = { seen: !!k.seen, pirate: k.pirate === true, ninja: k.ninja === true };
    const battles = parseBattles(k.battles);
    if (battles) d.endless.battles = battles;
    const slalom = parseSlalom(k.slalom);
    if (slalom) d.endless.slalom = slalom;
  }
  d.pets = parsePets(o.pets);
  d.garden = parseGarden(o.garden);
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
    kingOwed: d.kingOwed,
    reaperEgg: d.reaperEgg,
    eggDay: d.eggDay,
    crew: d.crew,
    junk: d.junk,
    muffins: d.muffins,
    snacks: d.snacks,
    bugSpray: d.bugSpray,
    honey: d.honey,
    hiveDay: d.hiveDay,
    leggy: d.leggy,
    iceSeen: d.iceSeen,
    iceRuns: d.iceRuns,
    lionSeen: d.lionSeen,
    lionCaught: d.lionCaught,
    aquarium: d.aquarium,
    bases: d.bases,
    pots: d.pots,
    trenchSeen: d.trenchSeen,
    abyssSeen: d.abyssSeen,
    abyssDown: d.abyssDown,
    bridgeSeen: d.bridgeSeen,
    bridgeIn: d.bridgeIn,
    stealth1: d.stealth1,
    invis: d.invis,
    stay: d.stay,
    tarDay: d.tarDay,
    tarTaken: d.tarTaken,
    tarBucket: d.tarBucket,
    tarCaught: d.tarCaught,
    tarIsleSeen: d.tarIsleSeen,
    tarLeaderBeaten: d.tarLeaderBeaten,
    eelStage: d.eelStage,
    remoroDay: d.remoroDay,
    hunterDay: d.hunterDay,
    hq: d.hq,
    gardenDay: d.gardenDay,
    sharp: d.sharp,
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
    isle11Seen: d.isle11Seen,
    isle12Seen: d.isle12Seen,
    catermanFree: d.catermanFree,
    skullKey: d.skullKey,
    cryptWon: d.cryptWon,
    skrillBeaten: d.skrillBeaten,
    krakenBeaten: d.krakenBeaten,
    krakenFoot: d.krakenFoot,
    castleHQ: d.castleHQ,
    scanner: d.scanner,
    scanned: d.scanned,
    saveCode: d.saveCode,
    codeTold: d.codeTold,
    barge: d.barge,
    bargeWins: d.bargeWins,
    pelicanBeaten: d.pelicanBeaten,
    bread: d.bread,
    feederFull: d.feederFull,
    crows: d.crows,
    sub: d.sub,
    subFound: d.subFound,
    badges: d.badges,
    finder: d.finder,
    sunkenDay: d.sunkenDay,
    sunkenFound: d.sunkenFound,
    otterFed: d.otterFed,
    neilFed: d.neilFed,
    radioDay: d.radioDay,
    heronStage: d.heronStage,
    heronFled: d.heronFled,
    look: d.look,
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
    // Left out while untouched, as most games' is: the save travels in a link (state/share.ts), kept short.
    drone: untouchedDrone(d.drone) ? undefined : d.drone,
    mer: d.mer.seen || d.mer.given || d.mer.sirens ? d.mer : undefined,
    endless: d.endless.seen || d.endless.pirate || d.endless.ninja ? d.endless : undefined,
    pets: petsForSave(d.pets),
    garden: untouchedGarden(d.garden) ? undefined : d.garden,
    snook: d.snook,
    trip: d.trip ?? undefined,
    keys: d.keys,
  });
}
