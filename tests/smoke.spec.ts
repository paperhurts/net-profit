/**
 * Smoke test for Net Profit.
 *
 * Drives the real game at phone size through the window.__np debug hook:
 *   1. core loop  - sail to a sardine school, fill the hold, return, sell
 *   2. range gate - a dinghy is held inside its range ring
 *   3. day cycle  - dawn spawns a sparkle rare; night activates glowing schools
 *
 * Ported from the prototype smoke_test.py. Timings and thresholds are the
 * same so the port can be checked against legacy/net-profit.html.
 */
import { type BrowserContext, expect, type Page, test } from '@playwright/test';

/** The slice of window.__np the smoke test touches. */
type CtfFighter = {
  side: 'pirate' | 'ninja';
  role: string;
  bot: boolean;
  u: number;
  v: number;
  hp: number;
  cd: number;
  state: string;
  downT: number;
  carrying: boolean;
  abCd: number[];
  stunT: number;
};
type Ctf = {
  phase: string;
  gateT: number;
  you: CtfFighter;
  fighters: CtfFighter[];
  score: Record<'pirate' | 'ninja', number>;
  flags: Record<'pirate' | 'ninja', { at: string; u: number; v: number }>;
  mode: 'flag' | 'forts';
  holds: {
    key: string;
    u: number;
    v: number;
    r: number;
    owner: string | null;
    by: string | null;
  }[];
};
/** The Ninja Slalom's run, as far as the smoke test looks at it. */
type SkiFeature = { kind: string; z: number; x: number; x0: number; x1: number };
type Ski = {
  howTo: boolean;
  state: 'ready' | 'ski' | 'tumble' | 'done';
  course: SkiFeature[];
  run: { len: number; name: string };
  x: number;
  z: number;
  v: number;
  vx: number;
  air: boolean;
  trick: 'flip' | 'spin' | null;
  tricks: number;
  bonus: number;
  lanterns: number;
  yetiZ: number;
  yetiRoar: number;
  swiped: number;
};
/** The Treehouse Climb, as far as the smoke test looks at it. */
type Climb = {
  howTo: boolean;
  phase: 'ready' | 'climb' | 'down' | 'clear';
  x: number;
  y: number;
  plank: number;
  air: boolean;
  ladder: { x: number; lo: number } | null;
  nextRoll: number;
  coins: number;
  safeT: number;
  rope: number;
  ropeAngle(i: number): number;
  bucket: { lift: number; k: number } | null;
  pulled: boolean[];
  lowered: number[];
  pegs: { out: number }[];
  nextToss: number;
  stage: {
    name: string;
    ladders: { x: number; lo: number }[];
    ropes?: { amp: number }[];
  };
};
type Np = {
  boat: { x: number; y: number; h: number; v: number };
  keys: 'drive' | 'point';
  schools: { cx: number; cy: number; sp: number; r: number }[];
  DOCK: { x: number; y: number };
  rare: { on: boolean };
  hold: number;
  coins: number;
  clock: number;
  phase: string;
  walker: {
    armour: unknown;
    speedK: number;
    state: string;
    x: number;
    y: number;
    nearBoat: boolean;
    sink: number;
    z: number;
    dock: { landing: { x: number; y: number } };
    knockOut(): void;
  };
  dogAt: [number, number] | null;
  petted: boolean;
  muffin: { line: number; near: boolean; saying(): string | null };
  bakerAt: [number, number];
  isle10Seen: boolean;
  isle11Seen: boolean;
  isle12Seen: boolean;
  endless: {
    seen: boolean;
    pirate: boolean;
    ninja: boolean;
    slalom?: { runs: number; best: { bunny?: number; fox?: number; doom?: number } };
    climbs?: { climbs: number; top: number; best: Record<number, number> };
  };
  ctf: Ctf | null;
  ski: Ski | null;
  LIFT13: { x: number; y: number };
  th: Climb | null;
  TREE13: { x: number; y: number };
  thAt(x: number, y: number): [number, number];
  DOCK13: Record<'pirate' | 'ninja', { x: number; y: number; r: number }>;
  camAt: { x: number; y: number };
  LEADER13: Record<'pirate' | 'ninja', { x: number; y: number }>;
  jacks: { shown: boolean; free: boolean; x: number; y: number; z: number };
  bunSan: { shown: boolean; free: boolean; poofT: number; hurt(): boolean };
  squawk: { line: number; t: number; quiet: number };
  poofs: unknown[];
  endlessTalk: string | null;
  fromEndless(u: number, v: number): [number, number];
  toEndless(x: number, y: number): [number, number];
  boneMen: {
    list: { x: number; y: number; hp: number; state: string; t: number }[];
    hit: (m: unknown, power: number) => boolean;
  };
  skullMen: { list: { state: string }[]; hit: (m: unknown, power: number) => boolean }[];
  bargeTar: { list: { state: string }[]; hit: (f: unknown, power: number) => boolean };
  bargeMen: { list: { state: string }[]; hit: (m: unknown, power: number) => boolean };
  bargeBeasts: {
    list: { state: string; shownT: number }[];
    hit: (b: unknown, power: number) => boolean;
  };
  skullBeasts: {
    list: { state: string; shownT: number }[];
    hit: (b: unknown, power: number) => boolean;
  }[];
  displacers: {
    list: {
      x: number;
      y: number;
      ix: number;
      iy: number;
      hp: number;
      state: string;
      t: number;
      shownT: number;
    }[];
  };
  revealView: number;
  DOCK12: { x: number; y: number; r: number };
  TOWER12_DOOR: { x: number; y: number };
  fromSkull: (u: number, v: number) => [number, number];
  gardenIsle: {
    seen: boolean;
    seeds?: Record<string, number>;
    bag?: { c: string; m: number }[];
    beds?: ({ crop: string; ripe: number; mu?: string[][] } | null)[];
    stock?: { day: number; n: Record<string, number> };
    gear?: Record<string, number>;
    gearStock?: { day: number; n: Record<string, number> };
    koi?: { night: number; n: number };
  };
  gardenSkew: number;
  gardenSeed: string | null;
  gardenTool: string | null;
  LILY_POND: { x: number; y: number; r: number };
  lilyLine: { state: string; t: number; sp: number };
  koiNow: { state: string; stamina: number; wait: number } | null;
  koiPull: boolean;
  DOCK14: { x: number; y: number; r: number };
  fromGarden: (u: number, v: number) => [number, number];
  farFarOpen: boolean;
  crowGoShown: boolean;
  guide: { state: string; x: number; y: number };
  PERCH11: { x: number; y: number };
  DOCK11: { x: number; y: number };
  ISLE11: { x: number; y: number; r: number };
  CLEARING11: { x: number; y: number; r: number };
  brother: {
    up: boolean;
    hp: number;
    state: string;
    copies: { pop: number }[];
    hit(n: number): void;
  };
  caterman: { shown: boolean; free: boolean; x: number; y: number };
  catermanFree: boolean;
  SHOP_DOOR11: { x: number; y: number };
  droneFly: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    battery: number;
    rings: number;
    ringsOut: number;
    state: string;
    spots: string[];
    carry: number;
    beetles: number;
    full: number;
    side: number;
    gates: { kind: string; z: number; [k: string]: unknown }[];
  } | null;
  drone: {
    owned: boolean;
    colour: number;
    flights: number;
    bestRings: number;
    traps: number[];
    beetles: number;
    up: Record<string, number>;
  };
  droneOpen: boolean;
  mermaids: { list: { state: string }[]; dist: number };
  mer: { seen: boolean; pearls: number; given: number; night: number; charm: boolean };
  merSong: { state: string; tune: number[]; wrongs: number } | null;
  sirens: { list: { state: string }[]; perched: unknown[]; pull: number; dist: number };
  hpNow: number;
  paint: number;
  MER_ROCKS: { x: number; y: number; r: number };
  ROCKS: { x: number; y: number; r: number }[];
  droneFish: {
    x: number;
    z: number;
    state: string;
    beetles: number;
    caught: number[];
    rises: { x: number; z: number; sp: number; taken: boolean }[];
  } | null;
  lagoonFolk: {
    list: { x: number; y: number; state: string; hp: number; out: boolean }[];
    left: number;
  };
  divePals: { kind: string; x: number; y: number }[];
  skullKey: boolean;
  SKULL_KEY: { x: number; y: number };
  diveThrow(): void;
  PORTAL11: { x: number; y: number; r: number };
  first: number[];
  pondLine: { state: string; sp: number };
  pondShown: boolean;
  POND: { x: number; y: number; r: number };
  prairie10: {
    bunnies: { x: number; y: number; hop: number; wait: number }[];
    play: { i: number; t: number } | null;
    dogs: { x: number; y: number; up: number; hide: number; town: number }[];
    bison: { x: number; y: number }[];
  };
  prairieAt(k: 'bunny' | 'dog' | 'bison', i: number): [number, number] | null;
  junk: number;
  flotsam: { x: number; y: number }[];
  muffins: number[];
  leggy: { count: number; list: { x: number; y: number; hop: number }[] };
  leggyAt(i: number): [number, number] | null;
  hearts: number;
  setHearts(n: number): void;
  spider10: { state: string };
  pelican: { state: string; hp: number };
  DOOR10: { x: number; y: number };
  pelicanBeaten: boolean;
  bread: number;
  crows: { list: { x: number; y: number; state: string }[]; flying: number };
  FEEDER10: { x: number; y: number };
  feederFull: boolean;
  crowsOwned: number;
  feederAt(): [number, number];
  crowAt(i: number): [number, number] | null;
  crowCard: number;
  finder: boolean;
  sub: boolean;
  diveShown: string | null;
  subDive: { key: string; loot: { x: number; y: number; coins: number }[] };
  subFound: { day: number; patches: Record<string, number> };
  badges: { shield: number; damage: boolean; heal: boolean; on: Record<string, string | null> };
  WEARER: Record<
    string,
    { hp?: number; hearts?: number; invuln: number; worn: { shield: number }; hurt(): boolean }
  >;
  sunkenFound: number;
  sunken: { on: boolean; list: { x: number; y: number; coins: number }[] };
  talkToOldMan(): void;
  honey: number;
  screenOf(x: number, y: number): [number, number];
  viewSize: [number, number];
  scope: { i: number; name: string } | null;
  openScope(): void;
  closeScope(): void;
  HQ_SCOPE: { x: number; y: number };
  HQ_BED: { x: number; y: number };
  hq: { garden: boolean; dock: boolean; forge: boolean; tower: boolean };
  gardenDay: number;
  HQ_PLANS: { x: number; y: number };
  HQ_ROSTER: { x: number; y: number };
  trophyStand(i: number): { x: number; y: number };
  HQ_FISH_FRONT: { x: number; y: number };
  armouryAt(id: string): { x: number; y: number };
  HQ_HEAP: { x: number; y: number };
  tarSail: { x: number; y: number; h: number; v: number } | null;
  TAR_BERTH: { x: number; y: number };
  tarFish: {
    schools: { x: number; y: number }[];
    taken: number;
    bucket: number;
    caught: number;
    day: number;
  };
  tarRod: { state: string };
  tarAshore: boolean;
  tarLeader: {
    state: string;
    hp: number;
    x: number;
    y: number;
    up: boolean;
    hit(n: number): boolean;
  };
  tarLeaderBeaten: boolean;
  skrill: {
    state: string;
    t: number;
    z: number;
    hp: number;
    low: boolean;
    hornAt: { x: number; y: number } | null;
    hit(n: number): boolean;
  };
  prison: { open: number; men: { x: number; y: number; job: string }[] };
  kraken: {
    state: string;
    hp: number;
    chopped: number;
    eyeOpen: boolean;
    eye: { x: number; y: number; state: string };
    arms: { x: number; y: number; state: string }[];
    chop(a: unknown): boolean;
    harpoonEye(n: number): boolean;
  };
  KRAKEN_LAIR: { x: number; y: number };
  krakenAshore: {
    state: string;
    hp: number;
    chopped: number;
    up: boolean;
    eyeOpen: boolean;
    eye: { x: number; y: number; state: string };
    arms: { x: number; y: number; state: string; ring: boolean }[];
    chop(a: unknown): boolean;
    harpoonEye(n: number): boolean;
  };
  krakenFoot: boolean;
  TAR_ARENA: { x: number; y: number };
  tarRing: {
    r: number;
    won: boolean;
    eels: {
      state: string;
      hp: number;
      mark(): { x: number; y: number } | null;
      harpoon(n: number): boolean;
      onBite: ((hit: boolean) => void) | null;
    }[];
    tents: {
      left: number;
      list: { state: string }[];
      nearest(x: number, y: number, r: number): unknown;
      harpoon(t: unknown, n: number): boolean;
    } | null;
    krakens: {
      state: string;
      up: boolean;
      chopped: number;
      hp: number;
      eyeOpen: boolean;
      nearestArm(x: number, y: number, r: number): unknown;
      chop(a: unknown): boolean;
      harpoonEye(n: number): boolean;
    }[];
  } | null;
  krakenBeaten: boolean;
  setChemHp?: (n: number) => void;
  skrillBeaten: boolean;
  openMap(): void;
  tarEel: {
    state: string;
    hp: number;
    x: number;
    y: number;
    up: boolean;
    found: number;
    awayFor: number;
    onPull: (() => void) | null;
  };
  eelStage: number;
  chemHp: number;
  tarTents: { list: { x: number; y: number; state: string; hp: number }[] };
  tarDragon: {
    state: string;
    hp: number;
    x: number;
    y: number;
    z: number;
    up: boolean;
    low: boolean;
    hit(n: number): boolean;
  };
  tarFolk: {
    list: { kind: string; state: string; hp: number; x: number; y: number }[];
    hit(f: unknown, n: number): boolean;
  };
  tarIsleSeen: boolean;
  TAR_ISLE: { x: number; y: number; r: number };
  ISLE_BERTH: { x: number; y: number };
  JETTY_END: { x: number; y: number };
  TOWER_DOOR: { x: number; y: number };
  fishCaught: number;
  trophiesWon: number;
  HQ_WAIT: Record<string, { x: number; y: number }>;
  stay: string[];
  rosterOpen: boolean;
  friendsHad: string[];
  HQ_GARDEN: Record<'apple' | 'carrot' | 'banana', { x: number; y: number }>;
  hqOpen: boolean;
  sharp: boolean;
  HQ_FORGE: { x: number; y: number };
  HQ_TOWER_DOOR: { x: number; y: number };
  mapFishN: number;
  CASTLE_LANDING: { x: number; y: number };
  METAL_BRIDGE: { x: number; len: number; face: number; depth: number };
  BRIDGE_DOOR: { x: number; y: number };
  bridgeSeen: boolean;
  bridgeIn: boolean;
  enterTunnels(): void;
  tunnels: {
    guards: { x: number; y: number; look: number; down: boolean }[];
    roof: boolean;
    kickT: number;
  } | null;
  STEALTH_START: { x: number; y: number };
  STEALTH_GOAL: { x: number; y: number };
  ROOF_START: { x: number; y: number };
  SORC_AT: { x: number; y: number };
  BRIDGE_MISSIONS: number;
  BRIDGE_TARDOCK: number;
  stealth1: boolean;
  invis: boolean;
  invisT: number;
  BRIDGE_OBS: number;
  BRIDGE_ROOF: number;
  orbOpen: boolean;
  BRIDGE_HUB: { to: number; x: number; y: number }[];
  bridgeBack(i: number): { x: number; y: number };
  BRIDGE_THINGS: { room: number; at: { x: number; y: number }; act: string }[];
  viaLanding: boolean;
  walkerAt: [number, number];
  toast(msg: string, ms?: number, pri?: number): void;
  seaTarK: number;
  seaDock: boolean;
  seaIsle: boolean;
  seaReapers: {
    state: string;
    awake: boolean;
    hp: number;
    hit(p: number, fired?: boolean): boolean;
  }[];
  seaStars: { state: string; resolve: number; harpoon(p: number): boolean }[];
  seaFight: {
    x: number;
    y: number;
    h: number;
    r: number;
    isles: { x: number; y: number; r: number; who?: string }[];
    tar: { x: number; y: number; r: number }[];
    bridges: {
      x: number;
      y: number;
      half: number;
      dock: { berth(k: number): { x: number; y: number; h: number } };
    }[];
  } | null;
  seaWon: boolean;
  seaBoss: Record<
    'meteor' | 'king' | 'deep' | 'reaper' | 'gulper' | 'angler' | 'cthulu' | 'guard',
    {
      state: string;
      x: number;
      y: number;
      t: number;
      up: number;
      resolve: number;
      eye: boolean;
      eyeT: number;
      grab: unknown;
      grabCd: number;
      holding: boolean;
      glow: number;
      tx: number;
      ty: number;
      done: boolean;
      strikeT: number;
      tentacles: unknown[];
      gone: boolean;
      seaHid: boolean;
      seaGhost: { x: number; y: number } | null;
      onSweep(): void;
      lev: {
        rise: { x: number; y: number; nx: number; ny: number; t: number; up: number } | null;
        cool: number;
      };
    }[]
  >;
  endSea(sunk: boolean): void;
  SEA_ARENA: { x: number; y: number };
  mapBeasts(): { x: number; y: number; name: string }[];
  hiveDay: number;
  HIVE10: { x: number; y: number; z: number };
  hiveAt(): [number, number];
  tapHive(): void;
  honeyNow(): void;
  honeyAt: 'sea' | 'land' | null;
  crowAsk: { q: { q: string; right: string } } | null;
  gorillas: { roused: boolean; list: { x: number; y: number; state: string; hp: number }[] };
  WEB: { x: number; y: number };
  webT: number;
  bugSpray: number;
  sprayShown: boolean;
  swamp10: {
    monster: { x: number; y: number; state: string };
    cubs: { x: number; y: number; state: string }[];
  };
  swampAt(k: string, i: number): [number, number] | null;
  gators: {
    roused: boolean;
    list: { state: string; hp: number; pool: { x: number; y: number; r: number } }[];
  };
  swallowing: boolean;
  swallow(by: string): void;
  bases: Record<string, number>;
  BASES: { spit: { x: number; y: number }; dock: { x: number; y: number; r: number } }[];
  FLOE_BASE: { spit: { x: number; y: number } };
  day: number;
  seine: { state: string };
  pots: { x: number; y: number; crabs: number }[];
  diving: boolean;
  diver: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    sub: boolean;
    cage: { x: number; y: number; go: string } | null;
    inCage: boolean;
    air: number;
    airMax: number;
    face: number;
    cold: number;
    chill: number;
    state: string;
  };
  iceLoot: number;
  trenchSh: {
    kind: string;
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    ph: number;
    pace: number;
  }[];
  diveT: number;
  diveAim: { si: number } | null;
  trenchSeen: boolean;
  trenchDeep: number;
  trenchLoot: number;
  pearlDay: number;
  TRENCH_LOOT: { kind: string; x: number; y: number }[];
  lurker: { x: number; y: number; a: number; state: string; t: number; wait: number };
  lurkerSeen: boolean;
  lurkerStung: number;
  storm: { phase: string; t: number; flash: number; bring(): void };
  stormE: number;
  stormSeen: boolean;
  wreckChest: boolean;
  diveSite: string;
  ABYSS: { x: number; y: number; r: number };
  abyssSh: {
    kind: string;
    deep?: string;
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    ph: number;
    pace: number;
  }[];
  abyssSeen: boolean;
  abyssDown: boolean;
  remoro: {
    x: number;
    y: number;
    dir: number;
    state: string;
    hits: number;
    here: boolean;
    reset(here: boolean): void;
  };
  remoroDay: number;
  giants: {
    list: { kind: string; state: string; at: number; lunges: boolean; x: number; y: number }[];
    shake: number;
  };
  floorGulper: { x: number; y: number; state: string; wait: number; away: number; out: boolean };
  hunter: {
    x: number;
    y: number;
    dx: number;
    state: string;
    hits: number;
    here: boolean;
    reset(here: boolean): void;
  };
  hunterDay: number;
  boneSharks: { x: number; y: number; state: string; t: number }[];
  WRECK_CHEST: { x: number; y: number };
  charter: { wants: string[]; seen: string[]; shirts: number[] } | null;
  charterOffer: { wants: string[]; shirts: number[] } | null;
  chartersRun: number;
  whales: { mother: { x: number; y: number; up: number } };
  haulLeft: number;
  hp: number;
  shallows: { fish: { x: number; y: number }[] };
  masks: number;
  floor: number;
  towerTaken: boolean;
  isle3Seen: boolean;
  isle3Stage: number;
  boss3: { up: boolean; hit(power: number): void };
  swordsman: { up: boolean; state: string; hit(power: number): boolean };
  demons: { up: boolean; state: string; hit(power: number): boolean }[];
  warlock: { shown: boolean; x: number; y: number; hearts: number; bolts: unknown[] };
  wboat: { free: boolean; x: number; y: number; catches: number };
  cine: { t: number; kind: string } | null;
  floors: {
    list: { x: number; y: number; state: string }[];
    hit(m: unknown, power: number, fx: number, fy: number): void;
  }[];
  boss: { up: boolean; hit(power: number): void };
  driven: Record<string, number>;
  turtles: { turtles: { x: number; y: number; up: number }[]; companion: unknown };
  turtleSwims: number;
  harpoonTarget: string | null;
  gulper: { resolve: number };
  serpent: { state: string; resolve: number };
  reaper: {
    state: string;
    hunting: boolean;
    resolve: number;
    x: number;
    y: number;
    holdOff: (() => boolean) | null;
  };
  reaperSeen: boolean;
  icing: boolean;
  iceSeen: boolean;
  iceRuns: number;
  iceRun: {
    phase: string;
    x: number;
    y: number;
    line: unknown[];
    pool: { kind: string; x: number; y: number; vx: number; caught: boolean; on: boolean }[];
  } | null;
  armour: number;
  maxHearts: number;
  sailedShare: number;
  mapOpen: boolean;
  helpOpen: boolean;
  mapMarks(): { x: number; y: number; name: string }[];
  lionSeen: boolean;
  netCut: boolean;
  mending: boolean;
  lionCaught: number;
  aquarium: boolean;
  nagaFree: boolean;
  isle8Seen: boolean;
  hiredBoats: {
    here: boolean;
    chasing: boolean;
    boats: { x: number; y: number; state: string }[];
  };
  hired8: {
    home: { x: number; y: number };
    list: unknown[];
    hit(m: unknown, power: number, fx: number, fy: number): void;
  };
  hired9: { list: { state: string; back: number }[] };
  BAR: { x0: number; x1: number; y0: number; y1: number };
  DOOR9: { x: number; y: number };
  DOOR8: { x: number; y: number };
  heronStage: number;
  heronFled: boolean;
  charLook: {
    skin: number;
    hair: string;
    hat: string;
    face: string;
    honorGuard: boolean;
    hideArmour: boolean;
    outfit: string;
    title: string;
  };
  charOpen: boolean;
  heron9: { up: boolean; hp: number; shielded: boolean; hit(power: number): void };
  nest: { up: boolean; state: string; hit(power: number): void };
  nestHorde: { list: { state: string }[] };
  necroPal: { shown: boolean; free: boolean };
  otter: { state: string; fed: number; free: boolean; reason: string | null };
  tapOtter(): void;
  neil: { state: string; fed: number; free: boolean; aboard: boolean };
  neilAt: [number, number] | null;
  iceSeal: { phase: string; dive(pool: unknown[]): boolean } | null;
  heron: {
    up: boolean;
    hp: number;
    state: string;
    copies: { pop: number }[];
    hit(power: number): void;
  };
  NAGA_CAGE: { x: number; y: number; r: number };
  naga: { shown: boolean; swimming: boolean; x: number; y: number };
  AQUARIUM: { x0: number; y0: number; x1: number; y1: number };
  tankView: { fish: unknown[]; eaten: number };
  rod: { state: string };
  gear: {
    mesh: boolean;
    strongbox: boolean;
    suit: boolean;
    tank: boolean;
    white: boolean;
    radar: boolean;
  };
  pirate: { state: string; x: number; y: number };
  coastGuard: { out: boolean; ship: { state: string; x: number; y: number }; reset(): void };
  radioDay: number;
  checkForUpdate(force?: boolean): Promise<boolean>;
  updateReady: boolean;
  radarOn: boolean;
  radarBlips(): { x: number; y: number; kind: 'fish' | 'threat' | 'other' }[];
  anchorer: { state: string; up: boolean; hit(power: number): void };
  tarling: { with: boolean; free: boolean };
  isle4Stage: number;
  isle5Seen: boolean;
  isle5Stage: number;
  isle6Seen: boolean;
  chests6: number;
  CHESTS6: [number, number][];
  isle6Stage: number;
  landReaper: {
    state: string;
    awake: boolean;
    open: boolean;
    hp: number;
    t: number;
    up: number;
    hit(power: number, fired?: boolean): boolean;
  };
  reaperLandSeen: boolean;
  reaperEgg: number;
  reaperRematch: boolean;
  oldOwed: boolean;
  kingOwed: boolean;
  ISLE5_REEF: { x: number; y: number; notice: number };
  OLDMAN10: { x: number; y: number };
  oldManAt: [number, number];
  storeOpen: boolean;
  snacks: { apple: number; carrot: number; banana: number };
  appleT: number;
  carrotT: number;
  DAD_JOKES: string[];
  eggDay: number;
  hatchT: number;
  eggT: number | null;
  flotilla: {
    crafts: {
      kind: string;
      placed: boolean;
      x: number;
      y: number;
      tow: { x: number; y: number } | null;
    }[];
    crew: Record<string, string | null>;
    riding(r: string): boolean;
  };
  warriorPal: { shown: boolean };
  baby: {
    shown: boolean;
    swimming: boolean;
    free: boolean;
    x: number;
    y: number;
    leapT: number;
    love: number;
  };
  babyAt: [number, number] | null;
  NEST6: { x: number; y: number; r: number };
  isle7Seen: boolean;
  isle7Stage: number;
  portalOpen: number;
  monkeys7: { list: { state: string }[] };
  monkeys: { list: unknown[]; hit(m: unknown, power: number, fx: number, fy: number): void };
  boss7: { up: boolean; hp: number; hit(power: number): void };
  roofMonkeys: { list: { state: string }[] };
  hordes: Record<
    number,
    {
      list: { x: number; y: number; guard: boolean; kind: string; state: string; hp: number }[];
      cleared: boolean;
      hit(u: unknown, power: number, fx: number, fy: number): boolean;
    }
  >;
  forgotten: { up: boolean; state: string; hit(power: number): void };
  forgotten2: {
    up: boolean;
    state: string;
    hp: number;
    x: number;
    y: number;
    hit(power: number): void;
  };
  barge: {
    size: string;
    pick: Record<string, number>;
    where: string;
    sea: Record<string, number>;
    isles: { x: number; y: number; who?: string }[];
    tar: { x: number; y: number }[];
    bridges: { x: number; y: number }[];
  };
  bargeWins: number;
  bargeOn: boolean;
  ARENAS: Record<string, number>;
  bargeCamps: Record<
    number,
    Record<
      string,
      { list: { x: number; y: number }[]; hit(m: unknown, p: number, x: number, y: number): void }
    >
  >;
  bargeGorillas: Band;
  bargeGators: Band;
  bargeLancers: Band;
  bargeFighters: { spec: { look: string }; state: string; hit(power: number): boolean }[];
  bargeBoss: Record<
    | 'sorcerer'
    | 'forgotten'
    | 'heron'
    | 'pelican'
    | 'cthulhu'
    | 'oldone'
    | 'reaper'
    | 'anchorer'
    | 'spider'
    | 'tarleader'
    | 'tardragon'
    | 'skrill',
    {
      up: boolean;
      low?: boolean;
      open?: boolean;
      state: string;
      x: number;
      y: number;
      hit(power: number): unknown;
    }[]
  >;
  cryptWon: boolean;
  castleHQ: boolean;
  scanner: number;
  scanned: string[];
  scanAt: string | null;
  saveCode: string;
  cloudState: string;
  fgScene: { t: number; cap: string; flag: number } | null;
  CRYPT: number;
  SKULL_DOOR: { x: number; y: number };
  PORTAL11_FRONT: { x: number; y: number };
  allies: { list: { kind: string }[] };
  bonesPal: { shown: boolean; free: boolean };
  lancers: { list: { state: string }[] };
  oldOne: { state: string; up: boolean; hit(power: number): boolean };
  soulArmour: boolean;
  deep: { fighting: boolean; state: string; resolve: number };
  cth: { state: string; hit(power: number): void };
  cat: { shown: boolean; heals: number; tuna: boolean; x: number; y: number };
  warrior: { shown: boolean; hp: number; maxHp: number; invuln: number; hurt(): boolean };
  catAt: [number, number] | null;
  king: { fighting: boolean; state: string; t: number; resolve: number };
  fireHarpoon(): void;
  /** The pet system (data/petsys.ts): what it saves, and whether the pet book is open. */
  pets: {
    save: {
      nm: Record<string, string>;
      drawn: { id: number; nm: string; d: string; got: number; xp?: number }[];
      walk: string | null;
      eggs: { k: string; sp: string; at: number; due: number }[];
      hatched: { id: number; sp: string; nm: string; from: string; xp?: number }[];
      house?: boolean;
      tr?: number;
    };
    PET_HOUSE: { x0: number; y0: number; x1: number; y1: number };
    yard: { key: string; x: number; y: number }[];
    open: boolean;
    padOpen: boolean;
    hatching: unknown;
    walker: { on: boolean; ashore: boolean; x: number; y: number; love: number };
    walkAt: [number, number] | null;
    pad: { strokes: unknown[]; inkLeft: number };
  };
};

/** One of the Battle Barge's own groups: its gorillas, its gators or its lancers. */
type Band = { list: { state: string }[]; hit(u: unknown, power: number): boolean };

declare global {
  interface Window {
    __np: Np;
    /** Junk the net brings up with the next fish, for a test. */
    __npJunk?: string;
  }
}

/** Joystick anchor in CSS pixels at 390x780. */
const CX = 195;
const CY = 420;

/** World centre and dinghy range, from the tuning tables. */
const ISLAND = 2400;
const DINGHY_RANGE = 1150;

/** Seed a save, load the game, press Go, and return the page-error log. */
async function boot(
  context: BrowserContext,
  page: Page,
  save: Record<string, unknown>,
  path = './',
) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await context.addInitScript((s: string) => {
    try {
      // Seed once; a reload inside a test must keep what the game saved.
      if (!localStorage.getItem('netprofit.v1')) localStorage.setItem('netprofit.v1', s);
    } catch {
      // Storage can be unavailable in some contexts; the game copes.
    }
  }, JSON.stringify(save));
  await page.goto(path);
  await page.waitForTimeout(400);
  await page.click('#go');
  return errors;
}

/**
 * Tap a spot on the screen as a player would: a message showing over it is tapped away first, since a tap on a
 * message sends it away rather than reaching what is under it.
 */
async function tap(page: Page, x: number, y: number) {
  for (let i = 0; i < 3; i++) {
    const over = await page.evaluate(
      ([px, py]) => document.elementFromPoint(px, py)?.id === 'toast',
      [x, y] as const,
    );
    if (!over) break;
    await page.mouse.click(x, y);
    await page.waitForTimeout(300);
  }
  await page.mouse.click(x, y);
}

/**
 * Point the joystick at a world position. Returns the remaining distance.
 * The wobble alternates a sideways offset so the net sweeps through a school
 * instead of parking in its middle.
 */
async function steerTo(page: Page, tx: number, ty: number, wobble = 0, i = 0) {
  const [bx, by] = await page.evaluate((): [number, number] => [
    window.__np.boat.x,
    window.__np.boat.y,
  ]);
  const dx = tx - bx + (i % 20 < 10 ? wobble : -wobble);
  const dy = ty - by + (i % 14 < 7 ? wobble : -wobble);
  // World to screen direction (isometric, 2:1).
  const sx = dx - dy;
  const sy = (dx + dy) / 2;
  const n = Math.hypot(sx, sy) || 1;
  await page.mouse.move(CX + (sx / n) * 60, CY + (sy / n) * 60);
  return Math.hypot(dx, dy);
}

// The game puts itself online (state/cloud.ts). No test reaches the real project: each turns it off before the page
// loads (a flag, not a route, which would take the service worker's requests out of the offline test's hands), and the
// one about it answers for it.
const cloudOff = (on: boolean) => {
  (window as unknown as { __npCloudOff: boolean }).__npCloudOff = on;
};
test.beforeEach(async ({ context }) => {
  await context.addInitScript(cloudOff, true);
});

test('core loop: fill the hold at a sardine school, dock, sell', async ({ context, page }) => {
  const errors = await boot(context, page, { muted: true });
  const [sx, sy] = await page.evaluate((): [number, number] => {
    const s = window.__np.schools[0];
    if (!s) throw new Error('no schools');
    return [s.cx, s.cy];
  });

  await page.mouse.move(CX, CY);
  await page.mouse.down();
  let hold = 0;
  for (let i = 0; i < 80 && hold < 12; i++) {
    await steerTo(page, sx, sy, 40, i);
    await page.waitForTimeout(150);
    hold = await page.evaluate(() => window.__np.hold);
  }
  expect(hold, 'hold never filled').toBeGreaterThanOrEqual(12);

  const [dx, dy] = await page.evaluate((): [number, number] => [
    window.__np.DOCK.x + 15,
    window.__np.DOCK.y + 45,
  ]);
  for (let i = 0; i < 80; i++) {
    if ((await steerTo(page, dx, dy)) < 40) break;
    await page.waitForTimeout(150);
  }
  await page.mouse.up();
  await page.waitForTimeout(1800);

  expect(await page.evaluate(() => window.__np.hold), 'catch was not sold').toBe(0);
  expect(await page.evaluate(() => window.__np.coins), 'no coins earned').toBeGreaterThanOrEqual(
    12,
  );

  // The shop is open in the dock. A drag on its wood steers the boat straight through it.
  const title = await page.locator('#shop h2').boundingBox();
  if (!title) throw new Error('shop title not visible');
  const tx = title.x + 8;
  const ty = title.y + title.height / 2;
  await page.mouse.move(tx, ty);
  await page.mouse.down();
  await page.mouse.move(tx + 60, ty - 60, { steps: 5 });
  await page.waitForTimeout(500);
  expect(
    await page.evaluate(() => window.__np.boat.v),
    'drag on the shop did not steer',
  ).toBeGreaterThan(20);
  expect(await page.locator('#shop').getAttribute('class')).toContain('steer');
  await page.mouse.up();
  await page.waitForTimeout(100);
  expect(await page.locator('#shop').getAttribute('class')).not.toContain('steer');
  expect(errors).toEqual([]);
});

test('range gate: a dinghy is held inside its range ring', async ({ context, page }) => {
  const errors = await boot(context, page, { muted: true });
  await page.evaluate(
    ([x, y]) => {
      window.__np.boat.x = x;
      window.__np.boat.y = y;
    },
    [ISLAND + DINGHY_RANGE - 50, ISLAND] as const,
  );

  await page.mouse.move(CX, CY);
  await page.mouse.down();
  await page.mouse.move(CX + 55, CY + 28);
  await page.waitForTimeout(4000);

  const d = await page.evaluate(
    (c) => Math.hypot(window.__np.boat.x - c, window.__np.boat.y - c),
    ISLAND,
  );
  expect(d, `dinghy escaped its range: ${d.toFixed(0)}`).toBeLessThanOrEqual(DINGHY_RANGE + 1);
  expect(errors).toEqual([]);
});

test('day cycle: dawn spawns a rare, night follows', async ({ context, page }) => {
  const errors = await boot(context, page, { muted: true });

  await page.evaluate(() => {
    window.__np.clock = 0.999;
  });
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.__np.phase)).toBe('Dawn');
  expect(await page.evaluate(() => window.__np.rare.on), 'no rare at dawn').toBe(true);

  await page.evaluate(() => {
    window.__np.clock = 0.8;
  });
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__np.phase)).toBe('Night');
  expect(errors).toEqual([]);
});

test('keyboard: drive mode steers the hull, point mode aims it', async ({ context, page }) => {
  const errors = await boot(context, page, { muted: true });
  // Drive, the default: W holds the heading and builds speed, D turns to starboard, S brakes.
  const h0 = await page.evaluate(() => window.__np.boat.h);
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  const afterW = await page.evaluate(() => ({ v: window.__np.boat.v, h: window.__np.boat.h }));
  expect(afterW.v, 'W did not drive').toBeGreaterThan(80);
  expect(Math.abs(afterW.h - h0), 'W alone turned the hull').toBeLessThan(0.01);
  await page.keyboard.down('d');
  await page.waitForTimeout(500);
  const afterD = await page.evaluate(() => window.__np.boat.h);
  expect(afterD - afterW.h, 'D did not turn to starboard').toBeGreaterThan(0.5);
  await page.keyboard.up('d');
  await page.keyboard.up('w');
  await page.keyboard.down('s');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__np.boat.v), 'S did not brake').toBeLessThan(
    afterW.v * 0.5,
  );
  await page.keyboard.up('s');
  // Point: W aims the hull at screen-up and it goes; the button reflects the switch.
  await page.evaluate(() => {
    window.__np.keys = 'point';
  });
  expect(await page.locator('#keys').textContent()).toContain('point');
  const hBefore = await page.evaluate(() => window.__np.boat.h);
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  const afterPoint = await page.evaluate(() => ({ v: window.__np.boat.v, h: window.__np.boat.h }));
  await page.keyboard.up('w');
  expect(afterPoint.v, 'point mode did not move').toBeGreaterThan(40);
  expect(Math.abs(afterPoint.h - hBefore), 'point mode did not aim the hull').toBeGreaterThan(0.3);
  expect(errors).toEqual([]);
});

test('trip: hold, position and clock survive the tab being discarded', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, { muted: true });
  const [sx, sy] = await page.evaluate((): [number, number] => {
    const s = window.__np.schools[0];
    if (!s) throw new Error('no schools');
    return [s.cx, s.cy];
  });

  await page.mouse.move(CX, CY);
  await page.mouse.down();
  let hold = 0;
  for (let i = 0; i < 80 && hold < 6; i++) {
    await steerTo(page, sx, sy, 40, i);
    await page.waitForTimeout(150);
    hold = await page.evaluate(() => window.__np.hold);
  }
  await page.mouse.up();
  expect(hold, 'hold never filled').toBeGreaterThanOrEqual(6);
  // Let the boat coast to a stop so the net cannot catch anything more.
  await page.waitForFunction(() => window.__np.boat.v < 1);
  await page.evaluate(() => {
    window.__np.clock = 0.42;
  });

  // What a phone does right before it discards the tab.
  const before = await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    return { x: window.__np.boat.x, y: window.__np.boat.y, hold: window.__np.hold };
  });
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  await page.waitForTimeout(300);

  const after = await page.evaluate(() => ({
    x: window.__np.boat.x,
    y: window.__np.boat.y,
    hold: window.__np.hold,
    clock: window.__np.clock,
  }));
  expect(after.hold, 'hold was lost').toBe(before.hold);
  expect(Math.hypot(after.x - before.x, after.y - before.y), 'boat moved').toBeLessThan(40);
  expect(after.clock, 'clock was lost').toBeGreaterThan(0.41);
  expect(after.clock).toBeLessThan(0.45);
  expect(errors).toEqual([]);
});

test('ashore: step off at the dock, pet the dog, walk up the pier onto the island, and back aboard', async ({
  context,
  page,
}) => {
  // Tied up in the dock ring, as a trip saved there comes back.
  const errors = await boot(context, page, {
    muted: true,
    build: 1,
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible();
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  expect(await page.locator('#shop').getAttribute('class')).not.toContain('open');
  // The way back is not offered under the thumb that lands to start walking.
  await expect(page.locator('#aboard')).toBeHidden();

  // The dog comes to say hello; a tap on it pets it.
  await page.waitForTimeout(3000);
  const dog = await page.evaluate(() => window.__np.dogAt);
  if (!dog) throw new Error('no dog');
  await tap(page, dog[0], dog[1]);
  expect(await page.evaluate(() => window.__np.petted), 'the tap did not pet the dog').toBe(true);

  /** Hold the stick in a world direction. */
  const stick = async (wx: number, wy: number) => {
    const sx = wx - wy;
    const sy = (wx + wy) / 2;
    const n = Math.hypot(sx, sy);
    await page.mouse.move(CX, CY);
    await page.mouse.down();
    await page.mouse.move(CX + (sx / n) * 60, CY + (sy / n) * 60, { steps: 3 });
  };
  // Up the pier, past the crates, onto the sand.
  await stick(-1, 0);
  await page.waitForTimeout(2600);
  await page.mouse.up();
  const there = await page.evaluate(() => window.__np.walker.x);
  expect(there, 'did not walk up the pier onto the island').toBeLessThan(ISLAND + 200);

  // And back down it to the boat.
  await stick(1, 0);
  await page.waitForFunction(() => window.__np.walker.nearBoat, null, { timeout: 6000 });
  await page.mouse.up();
  await expect(page.locator('#aboard')).toBeVisible();
  await page.click('#aboard');
  await page.waitForFunction(() => window.__np.walker.state === 'aboard', null, { timeout: 2000 });
  await expect(page.locator('#shop')).toHaveClass(/open/);
  expect(errors).toEqual([]);
});

test('the muffin man: a tap from far off asks you to walk up; close by, his loop goes round and never resolves', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // From the end of the pier he is out of reach: a word says to walk up, and he says nothing.
  await page.waitForTimeout(600);
  let at = await page.evaluate(() => window.__np.bakerAt);
  await tap(page, at[0], at[1]);
  await expect(page.locator('#toast')).toContainText('Walk up to the baker');
  expect(await page.evaluate(() => window.__np.muffin.line)).toBe(-1);

  // In front of his counter, a "..." says he would talk, and each tap is the next line, round and round.
  await page.evaluate(() => {
    window.__np.walker.x = 2580 + 46;
    window.__np.walker.y = 2400 + 2;
  });
  await page.waitForFunction(() => window.__np.muffin.near, null, { timeout: 2000 });
  await page.waitForTimeout(2500);
  const said: string[] = [];
  for (let i = 0; i < 4; i++) {
    at = await page.evaluate(() => window.__np.bakerAt);
    await tap(page, at[0], at[1]);
    said.push((await page.evaluate(() => window.__np.muffin.saying())) ?? '');
  }
  expect(said).toEqual([
    'Do you know the muffin man?',
    'I AM the muffin man.',
    'Do you know him?',
    'Do you know the muffin man?',
  ]);
  expect(errors).toEqual([]);
});

test('junk: now and then the net brings up junk with the fish, into a bucket on deck, not the hold', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, { muted: true });
  await page.evaluate(() => {
    window.__npJunk = 'boot';
  });
  const [sx, sy] = await page.evaluate((): [number, number] => {
    const s = window.__np.schools[0];
    if (!s) throw new Error('no schools');
    return [s.cx, s.cy];
  });
  await expect(page.locator('#junk')).toBeHidden();
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  for (let i = 0; i < 80 && (await page.evaluate(() => window.__np.junk)) < 2; i++) {
    await steerTo(page, sx, sy, 40, i);
    await page.waitForTimeout(150);
  }
  await page.mouse.up();
  await page.evaluate(() => {
    window.__npJunk = undefined;
  });
  await page.waitForTimeout(300);
  const { junk, hold } = await page.evaluate(() => ({
    junk: window.__np.junk,
    hold: window.__np.hold,
  }));
  expect(junk, 'no junk came up').toBeGreaterThanOrEqual(2);
  // The hold has only the fish in it.
  expect(hold).toBeGreaterThanOrEqual(junk);
  await expect(page.locator('#junk')).toBeVisible();
  // The bucket's chip shows what is in it: the net, still towing, may bring up one more after the count above.
  await expect
    .poll(() =>
      page.evaluate(() =>
        (document.querySelector('#junk')?.textContent ?? '').includes(String(window.__np.junk)),
      ),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});

test('fish muffins: the muffin man bakes your junk into muffins, kept on reload, and one eaten gives a heart back', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    junk: 3,
    // Turtles already seen: their first sighting's toast would otherwise cover the muffin man's.
    turtleSeen: true,
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#junk')).toContainText('3');
  await expect(page.locator('#muffinBtn')).toBeHidden();
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2580 + 46;
    window.__np.walker.y = 2400 + 2;
  });
  await page.waitForTimeout(2500);
  const at = await page.evaluate(() => window.__np.bakerAt);
  await tap(page, at[0], at[1]);
  // He still says his line, and takes the junk for muffins.
  expect(await page.evaluate(() => window.__np.muffin.saying())).toBe(
    'Do you know the muffin man?',
  );
  expect(
    await page.evaluate(() => ({ junk: window.__np.junk, muffins: window.__np.muffins.length })),
  ).toEqual({
    junk: 0,
    muffins: 3,
  });
  await expect(page.locator('#junk')).toBeHidden();
  await expect(page.locator('#muffinBtn')).toContainText('3');

  // Full hearts: he says to keep it. Hurt, ashore: one is eaten, a heart comes back.
  await page.click('#muffinBtn');
  await expect(page.locator('#toast')).toContainText('Keep it for a fight');
  expect(await page.evaluate(() => window.__np.muffins.length)).toBe(3);
  await page.evaluate(() => window.__np.setHearts(1));
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => window.__np.hearts);
  await page.click('#muffinBtn');
  expect(await page.evaluate(() => window.__np.hearts)).toBe(before + 1);
  await expect(page.locator('#muffinBtn')).toContainText('2');

  // Kept on reload.
  await page.reload();
  await page.click('#go');
  await expect(page.locator('#muffinBtn')).toContainText('2');
  expect(errors).toEqual([]);
});

test('leggy muffins: a day in the box and they grow legs, six at most, and follow the figure ashore in a line', async ({
  context,
  page,
}) => {
  // Five already, and two muffins left in the box more than a day: both grow legs, and the oldest wanders off.
  const errors = await boot(context, page, {
    muted: true,
    day: 5,
    leggy: 5,
    muffins: [3.2, 3.9],
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.muffins.length === 0, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.leggy.count)).toBe(6);
  await expect(page.locator('#muffinBtn')).toBeHidden();

  // Ashore, they tumble out and trot after the figure in a line.
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForFunction(() => window.__np.leggy.list.length === 6, null, { timeout: 2000 });
  const sx = -1;
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  await page.mouse.move(CX + sx * 54, CY - 27, { steps: 3 });
  await page.waitForTimeout(2600);
  await page.mouse.up();
  await page.waitForTimeout(600);
  const d = await page.evaluate(() => {
    const w = window.__np.walker;
    return window.__np.leggy.list.map((m) => Math.hypot(m.x - w.x, m.y - w.y));
  });
  expect(d).toHaveLength(6);
  expect(d[0], 'the first is not just behind').toBeLessThan(45);
  expect(d[5] ?? 0, 'they are not in a line').toBeGreaterThan((d[0] ?? 0) + 40);

  // A tap on one: it hops.
  const [mx, my] = (await page.evaluate(() => window.__np.leggyAt(2))) ?? [0, 0];
  await tap(page, mx, my);
  expect(await page.evaluate(() => window.__np.leggy.list[2]?.hop ?? 0)).toBeGreaterThan(0.5);

  // Kept on reload: six, riding in their crate.
  await page.reload();
  await page.click('#go');
  expect(await page.evaluate(() => window.__np.leggy.count)).toBe(6);
  expect(errors).toEqual([]);
});

test('shop: the shipwright keeps the spear back until island 2 is found', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 900,
    lv: { net: 2, hold: 2, engine: 2 },
  });
  await page.waitForTimeout(300);
  await expect(page.locator('#gear [data-g]').first()).toBeAttached();
  await expect(page.locator('#gear [data-s]')).toHaveCount(0);
  // Nor is there a big air tank before the scuba gear.
  await expect(page.locator('#gear [data-g="tank"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('shop: once there is scuba gear the shipwright sells a big air tank', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 4000,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    lv: { net: 2, hold: 2, engine: 2 },
  });
  const card = page.locator('#gear [data-g="tank"]');
  await expect(card).toContainText('Big air tank');
  await card.dispatchEvent('click');
  await page.waitForFunction(() => window.__np.gear.tank, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(500);
  // Bought, it leaves the shelf for the Yours row.
  await expect(card).toHaveCount(0);
  await expect(page.locator('#yours')).toContainText('Big air tank');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').gear.tank),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('shop: once the ice floe is found, with scuba gear, the shipwright sells a white scuba suit', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 7000,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    iceSeen: true,
    lv: { net: 2, hold: 2, engine: 2 },
  });
  const card = page.locator('#gear [data-g="white"]');
  await expect(card).toContainText('White scuba suit');
  await card.dispatchEvent('click');
  await page.waitForFunction(() => window.__np.gear.white, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(1000);
  await expect(page.locator('#yours')).toContainText('White scuba suit');
  expect(errors).toEqual([]);
});

test('the radar: the shipwright sells it, and at sea it shows the fish and a pirate coming; docked, it is put away', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 3500,
    lv: { net: 2, hold: 2, engine: 2 },
  });
  const card = page.locator('#gear [data-g="radar"]');
  await expect(card).toContainText('Radar');
  await card.dispatchEvent('click');
  await page.waitForFunction(() => window.__np.gear.radar, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(500);
  // Tied up at the dock, the shop has the corner; the radar waits. (A new game starts just off it.)
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.DOCK.x;
    n.boat.y = n.DOCK.y;
    n.boat.v = 0;
  });
  await expect(page.locator('#radar')).toBeHidden({ timeout: 3000 });
  // Out at sea it shows, with the schools round about on it as fish.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 3300;
    b.y = 1500;
    b.v = 0;
  });
  await expect(page.locator('#radar')).toBeVisible({ timeout: 3000 });
  const kinds = async () =>
    page.evaluate(() => [...new Set(window.__np.radarBlips().map((b) => b.kind))].sort());
  expect(await kinds()).toContain('fish');
  // A pirate coming: a threat on it.
  await page.evaluate(() => {
    const n = window.__np;
    n.pirate.state = 'chase';
    n.pirate.x = n.boat.x + 600;
    n.pirate.y = n.boat.y - 200;
  });
  expect(await kinds()).toContain('threat');
  // Back at the dock, put away again.
  await page.evaluate(() => {
    const n = window.__np;
    n.pirate.state = 'away';
    n.boat.x = n.DOCK.x;
    n.boat.y = n.DOCK.y;
  });
  await expect(page.locator('#radar')).toBeHidden({ timeout: 3000 });
  expect(errors).toEqual([]);
});

test('the coast guard: with the radio, a call when pirates come brings their boat out, the pirates run, and the call is spent for the day', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 500,
    earned: 5000,
    lv: { net: 2, hold: 2, engine: 2 },
    gear: { radio: true },
    trip: { x: 3300, y: 1500, h: 0, clock: 0.3, hold: [6] },
  });
  await page.waitForTimeout(300);
  // No pirate about, no call to make.
  await page.evaluate(() => {
    window.__np.pirate.state = 'away';
  });
  await expect(page.locator('#radioBtn')).toBeHidden();
  // A pirate comes for the boat: the button.
  await page.evaluate(() => {
    const n = window.__np;
    n.pirate.state = 'chase';
    n.pirate.x = n.boat.x + 700;
    n.pirate.y = n.boat.y;
  });
  const button = page.locator('#radioBtn');
  await expect(button).toBeVisible({ timeout: 2000 });
  await button.click();
  await page.waitForFunction(() => window.__np.coastGuard.out, null, { timeout: 2000 });
  // The pirate turns tail, and the call is spent for today, in the save too.
  await page.waitForFunction(() => ['leave', 'away'].includes(window.__np.pirate.state), null, {
    timeout: 2000,
  });
  const day = await page.evaluate(() => window.__np.day);
  expect(await page.evaluate(() => window.__np.radioDay)).toBe(day);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').radioDay),
  ).toBe(day);
  await expect(button).toBeHidden();
  // Its boat comes alongside.
  await page.waitForFunction(() => window.__np.coastGuard.ship.state === 'escort', null, {
    timeout: 10000,
  });
  // Home again, and pirates later the same day: no second call. Tomorrow, there is.
  await page.evaluate(() => {
    const n = window.__np;
    n.coastGuard.reset();
    n.pirate.state = 'chase';
    n.pirate.x = n.boat.x + 700;
    n.pirate.y = n.boat.y;
  });
  await page.waitForTimeout(400);
  await expect(button).toBeHidden();
  await page.evaluate(() => {
    window.__np.radioDay = 0;
  });
  await expect(button).toBeVisible({ timeout: 2000 });
  expect(errors).toEqual([]);
});

test.describe('a new version', () => {
  // Playwright cannot serve a page's fetches while a service worker is in charge of them, so this one runs
  // without it; that the worker lets the game's check through to the network is in the installable test.
  test.use({ serviceWorkers: 'block' });

  test('found when the game is checked mid-trip, the shop offers it at the dock', async ({
    context,
    page,
  }) => {
    const errors = await boot(context, page, {
      muted: true,
      coins: 300,
      trip: { x: 3300, y: 1500, h: 0, clock: 0.3, hold: [] },
    });
    // Nothing new yet.
    expect(await page.evaluate(() => window.__np.checkForUpdate(true))).toBe(false);
    // Then the server has a newer build.
    await page.route('**/', async (route) => {
      if (route.request().resourceType() !== 'fetch') return route.continue();
      const res = await route.fetch();
      const body = (await res.text()).replace(/assets\/index-[^"]+\.js/, 'assets/index-NEWER.js');
      return route.fulfill({ response: res, body });
    });
    expect(await page.evaluate(() => window.__np.checkForUpdate(true))).toBe(true);
    expect(await page.evaluate(() => window.__np.updateReady)).toBe(true);
    // At sea nothing is cut short; tied up, the shop offers it.
    await page.evaluate(() => {
      const n = window.__np;
      n.boat.x = n.DOCK.x;
      n.boat.y = n.DOCK.y;
      n.boat.v = 0;
    });
    await expect(page.locator('#updateBtn')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#updateBtn')).toContainText('A new version is ready');
    expect(errors).toEqual([]);
  });
});

test('armour: once there is a spear the shipwright sells leather armour, and it is a fourth heart', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 2000,
    isle2Seen: true,
    spear: 1,
    lv: { net: 2, hold: 2, engine: 2 },
  });
  const card = page.locator('#gear [data-a]');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Leather armour');
  await card.dispatchEvent('click');
  await page.waitForFunction(() => window.__np.armour === 1, null, { timeout: 2000 });
  expect(await page.evaluate(() => [window.__np.maxHearts, window.__np.coins])).toEqual([4, 800]);
  // Next on the shelf: diamond.
  await expect(card).toContainText('Diamond armour');
  expect(errors).toEqual([]);
});

test('choose your character: from the start, pick Hank or make your own, and it is kept', async ({
  context,
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await context.addInitScript(
    (s: string) => {
      if (!localStorage.getItem('netprofit.v1')) localStorage.setItem('netprofit.v1', s);
    },
    JSON.stringify({ muted: true, coins: 100 }),
  );
  await page.goto('./');
  await page.waitForTimeout(400);
  // An old save is the figure as it always was.
  expect(await page.evaluate(() => window.__np.charLook.hat)).toBe('souwester');
  await page.click('#charIntro');
  await expect(page.locator('#charCard')).toBeVisible();
  await expect(page.locator('#charName')).toHaveText('Skipper');
  await page.click('#charPresets [data-preset="hank"]');
  await expect(page.locator('#charName')).toHaveText('Hank');
  expect(await page.evaluate(() => window.__np.charLook.hat)).toBe('cowboy');
  // Change one thing and it is your own.
  await page.click('#charOptions [data-key="face"][data-val="freckles"]');
  await expect(page.locator('#charName')).toHaveText('Your own');
  await page.click('#charOptions [data-key="honorGuard"]');
  expect(await page.evaluate(() => window.__np.charLook.honorGuard)).toBe(true);
  await page.click('#charClose');
  await expect(page.locator('#charCard')).toBeHidden();
  // Kept: a reload is still the same figure, and the shop opens the card too.
  await page.reload();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__np.charLook)).toMatchObject({
    hat: 'cowboy',
    face: 'freckles',
    honorGuard: true,
  });
  await page.click('#go');
  await page.locator('#charBtn').dispatchEvent('click');
  await expect(page.locator('#charCard')).toBeVisible();
  await expect(page.locator('#charName')).toHaveText('Your own');
  await page.click('#charPresets [data-preset="skipper"]');
  await page.click('#charClose');
  expect(await page.evaluate(() => [window.__np.charLook.hat, window.__np.charOpen])).toEqual([
    'souwester',
    false,
  ]);
  expect(errors).toEqual([]);
});

test("choose your character: the shipwright's armour can be hidden, so the look you picked shows, hearts and all", async ({
  context,
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await context.addInitScript(
    (s: string) => {
      if (!localStorage.getItem('netprofit.v1')) localStorage.setItem('netprofit.v1', s);
    },
    JSON.stringify({ muted: true, coins: 100, spear: 1, armour: 4 }),
  );
  await page.goto('./');
  await page.waitForTimeout(400);
  await page.click('#go');
  await page.waitForTimeout(300);
  // In space armour the figure wears its helmet over everything.
  expect(await page.evaluate(() => window.__np.walker.armour !== null)).toBe(true);
  await page.locator('#charBtn').dispatchEvent('click');
  await expect(page.locator('#charCard')).toBeVisible();
  await expect(page.locator('#charOptions')).toContainText('Space armour');
  await page.click('#charOptions [data-key="hideArmour"][data-val="1"]');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__np.charLook.hideArmour)).toBe(true);
  expect(await page.evaluate(() => window.__np.walker.armour)).toBeNull();
  // Picking a preset keeps it hidden; the hearts are the armour's still.
  await page.click('#charPresets [data-preset="coral"]');
  expect(await page.evaluate(() => window.__np.charLook.hideArmour)).toBe(true);
  expect(await page.evaluate(() => window.__np.maxHearts)).toBe(7);
  // Shown again, it is back on.
  await page.click('#charOptions [data-key="hideArmour"][data-val=""]');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__np.walker.armour !== null)).toBe(true);
  await page.click('#charClose');
  expect(errors).toEqual([]);
});

test("the player's guide: opens over the game from the start and from the shop, every answer folded away", async ({
  context,
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await context.addInitScript(
    (s: string) => {
      if (!localStorage.getItem('netprofit.v1')) localStorage.setItem('netprofit.v1', s);
    },
    JSON.stringify({ muted: true, coins: 100 }),
  );
  await page.goto('./');
  await page.waitForTimeout(400);
  await page.click('#helpIntro');
  await expect(page.locator('#help')).toBeVisible();
  const guide = page.frameLocator('#helpFrame');
  await expect(guide.locator('h1')).toContainText("Player's guide");
  // Over the game it has the game's close button, not a link that would load a second game.
  await expect(guide.locator('.back')).toBeHidden();
  // What a kid reads without opening anything gives nothing away: no answers, and the secrets stay secret.
  const shown = await guide.locator('main').innerText();
  expect(shown).not.toMatch(/mermaid|siren|drone|beetle|pearl|grampy/i);
  const places = guide.locator('main > section details.place');
  expect(await places.count()).toBeGreaterThan(10);
  const place = places.first();
  const answer = place.locator('details.answer').first();
  await expect(answer).toBeHidden();
  // A place opens to its hint, and the answer under it is a second tap.
  await place.locator('> summary').click();
  await expect(answer.locator('> summary')).toBeVisible();
  await expect(answer.locator('.in')).toBeHidden();
  await answer.locator('> summary').click();
  await expect(answer.locator('.in')).toBeVisible();
  await expect(guide.locator('details.secrets .in').first()).toBeHidden();
  await page.click('#helpClose');
  await expect(page.locator('#help')).toBeHidden();
  // And from the shop, once playing (its row sits down the shop's planks, past what a click can scroll to).
  await page.click('#go');
  await page.locator('#helpBtn').dispatchEvent('click');
  await expect(page.locator('#help')).toBeVisible();
  await expect(guide.locator('h1')).toBeVisible();
  // The game waits while it is read, as for the sea map: the day stands still.
  expect(await page.evaluate(() => window.__np.helpOpen)).toBe(true);
  const clock = await page.evaluate(() => window.__np.clock);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__np.clock)).toBe(clock);
  await page.click('#helpClose');
  await expect(page.locator('#help')).toBeHidden();
  await page.waitForFunction((c) => window.__np.clock !== c, clock, { timeout: 2000 });
  // Escape closes it too.
  await page.locator('#helpBtn').dispatchEvent('click');
  await expect(page.locator('#help')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#help')).toBeHidden();
  // On its own, it has its way back to the game.
  await page.goto('./guide.html');
  await expect(page.locator('.back')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Honor Guard: the shipwright has it once the Heron is beaten on island 9, and it is nine hearts', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 16000,
    isle2Seen: true,
    isle7Stage: 1,
    heronStage: 1,
    spear: 3,
    armour: 4,
    lv: { net: 2, hold: 2, engine: 2 },
  });
  // Space armour on, the Heron not yet beaten in his nest: nothing more on the shelf.
  const card = page.locator('#gear [data-a]');
  await expect(card).toHaveCount(0);
  // His escape already seen, so its scene does not start over the shop and clear the toast.
  await page.evaluate(() => {
    window.__np.heronFled = true;
    window.__np.heronStage = 2;
    window.__np.coins = 16000;
  });
  await expect(card).toContainText('Honor Guard armour');
  await card.dispatchEvent('click');
  await page.waitForFunction(() => window.__np.armour === 5, null, { timeout: 2000 });
  expect(await page.evaluate(() => [window.__np.maxHearts, window.__np.coins])).toEqual([9, 1000]);
  await expect(card).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the sea map: sailing opens the fog, the map shows it, and the game waits while it is open', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 4000, y: 2400, h: 0, clock: 0.3, hold: [] },
  });
  // The boat opens the water round it on its first frame under way, which may come after Cast off returns.
  await page.waitForFunction(() => window.__np.sailedShare > 0, null, { timeout: 3000 });
  const before = await page.evaluate(() => window.__np.sailedShare);
  // Sail east a while: more of the sea is open.
  await page.evaluate(() => {
    window.__np.boat.v = 300;
  });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => window.__np.sailedShare);
  expect(after).toBeGreaterThan(before);
  // No scuba gear and no trench found: nothing marked yet.
  expect(await page.evaluate(() => window.__np.mapMarks())).toEqual([]);
  await page.locator('#mapBtn').click();
  await expect(page.locator('#seamap')).toBeVisible();
  await expect(page.locator('#mapNote')).toContainText('of the sea');
  // While it is open, nothing moves.
  const at = await page.evaluate(() => [window.__np.boat.x, window.__np.boat.y]);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => [window.__np.boat.x, window.__np.boat.y])).toEqual(at);
  await page.locator('#mapClose').click();
  await expect(page.locator('#seamap')).toBeHidden();
  expect(errors).toEqual([]);
});

test('the sea map: with scuba gear the trench is marked to dive, and not before', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 4000, y: 2400, h: 0, clock: 0.3, hold: [] },
  });
  expect(await page.evaluate(() => window.__np.mapMarks())).toEqual([
    { x: 1250, y: -620, name: 'Trench: dive here' },
  ]);
  await page.locator('#mapBtn').click();
  await expect(page.locator('#seamap')).toBeVisible();
  await page.locator('#mapClose').click();
  expect(errors).toEqual([]);
});

test('the aquarium: built at the shop, walked up to ashore, and its fish eat what is dropped in', async ({
  context,
  page,
}) => {
  // Tied up at home with the tree platform built, wood and coins to spare, and three kinds caught.
  const log = new Array(16).fill(0);
  log[0] = 12;
  log[3] = 2;
  log[4] = 1;
  const errors = await boot(context, page, {
    muted: true,
    build: 1,
    coins: 1500,
    wood: 30,
    log,
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  const card = page.locator('#aquaBtn');
  await expect(card).toContainText('Build an aquarium');
  await card.dispatchEvent('click');
  await page.waitForFunction(() => window.__np.aquarium === true, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(500);
  await expect(card).toContainText('3 kinds of fish');
  // Ashore and up to its glass, where it can be looked into.
  await expect(page.locator('#ashore')).toBeVisible();
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    const w = window.__np.walker;
    const A = window.__np.AQUARIUM;
    w.x = A.x1 + 10;
    w.y = (A.y0 + A.y1) / 2;
  });
  await expect(page.locator('#climb')).toHaveText('Look in the aquarium');
  await page.locator('#climb').click();
  await expect(page.locator('#aquarium')).toBeVisible();
  await expect(page.locator('#tankNote')).toContainText('3 kinds of fish');
  // Three sardines, both pufferfish caught, one tuna.
  expect(await page.evaluate(() => window.__np.tankView.fish.length)).toBe(6);
  // The tank fits a phone.
  const box = await page.locator('#tankCanvas').boundingBox();
  if (!box) throw new Error('no tank');
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  // While it is open, the game waits.
  const clock = await page.evaluate(() => window.__np.clock);
  // A tap at the very top of the water, over every fish: food, and they eat it.
  await tap(page, box.x + box.width / 2, box.y + 5);
  await page.waitForFunction(() => window.__np.tankView.eaten > 0, null, { timeout: 8000 });
  expect(await page.evaluate(() => window.__np.clock)).toBe(clock);
  await page.locator('#tankClose').click();
  await expect(page.locator('#aquarium')).toBeHidden();
  expect(errors).toEqual([]);
});

test('lionfish: towed through, their spines cut the net, and the mending kit mends it at sea', async ({
  context,
  page,
}) => {
  // A cutter just short of the first group, round the outer sea, with fish aboard and the kit.
  const gx = 2400 + Math.cos(0.8) * 1700;
  const gy = 2400 + Math.sin(0.8) * 1700;
  const errors = await boot(context, page, {
    muted: true,
    lv: { net: 3, hold: 3, engine: 3 },
    gear: { kit: true },
    trip: { x: gx - 160, y: gy - 160, h: Math.PI / 4, clock: 0.3, hold: [3, 3] },
  });
  await page.waitForFunction(() => window.__np.lionSeen, null, { timeout: 3000 });
  // Sail through them, holding the stick the way the boat points (straight down the screen).
  await page.mouse.move(195, 600);
  await page.mouse.down();
  await page.mouse.move(195, 700, { steps: 5 });
  await page.waitForFunction(() => window.__np.netCut, null, { timeout: 5000 });
  await page.mouse.up();
  const mend = page.locator('#mend');
  await expect(mend).toBeVisible();
  await page.waitForFunction(() => window.__np.boat.v < 40, null, { timeout: 8000 });
  await mend.click();
  await page.waitForFunction(() => window.__np.mending, null, { timeout: 1000 });
  await page.waitForFunction(() => !window.__np.netCut, null, { timeout: 4000 });
  await expect(mend).toBeHidden();
  expect(errors).toEqual([]);
});

test('the fishing rod: stopped by some lionfish, cast, reel in when the float goes under, and the bounty pays', async ({
  context,
  page,
}) => {
  const gx = 2400 + Math.cos(0.8) * 1700;
  const gy = 2400 + Math.sin(0.8) * 1700;
  const errors = await boot(context, page, {
    muted: true,
    coins: 100,
    lionSeen: true,
    lv: { net: 3, hold: 3, engine: 3 },
    gear: { rod: true },
    trip: { x: gx - 130, y: gy - 60, h: 0, clock: 0.3, hold: [] },
  });
  // A salvage crate that happens to be under the boat or the net pays too: none near, for this.
  await page.evaluate(() => {
    for (const f of window.__np.flotsam) {
      f.x = -50000;
      f.y = -50000;
    }
  });
  const before = await page.evaluate(() => window.__np.coins);
  const rod = page.locator('#rodcast');
  await expect(rod).toHaveText('Cast for lionfish', { timeout: 3000 });
  await rod.click();
  await expect(rod).toHaveText(/Wait/);
  await page.waitForFunction(() => window.__np.rod.state === 'bite', null, { timeout: 4000 });
  // The button pulses while the float is under; a finger does not wait for it to be still.
  await rod.click({ force: true });
  await page.waitForFunction(() => window.__np.lionCaught === 1, null, { timeout: 1000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(before + 40);
  expect(errors).toEqual([]);
});

test('the lionfish net: towed through them it is not cut, and sweeps them up for the bounty', async ({
  context,
  page,
}) => {
  const gx = 2400 + Math.cos(0.8) * 1700;
  const gy = 2400 + Math.sin(0.8) * 1700;
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    lionSeen: true,
    lv: { net: 3, hold: 3, engine: 3 },
    gear: { lionnet: true },
    trip: { x: gx - 160, y: gy - 160, h: Math.PI / 4, clock: 0.3, hold: [] },
  });
  await page.mouse.move(195, 600);
  await page.mouse.down();
  await page.mouse.move(195, 700, { steps: 5 });
  await page.waitForFunction(() => window.__np.lionCaught > 0, null, { timeout: 5000 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.__np.netCut)).toBe(false);
  expect(await page.evaluate(() => window.__np.coins)).toBeGreaterThanOrEqual(40);
  expect(errors).toEqual([]);
});

test('island 2: sell at the trading post and step ashore on its sand', async ({
  context,
  page,
}) => {
  // A flagship already out in the deep by island 2, with mahi-mahi in the hold.
  const hold = new Array(14).fill(0);
  hold[12] = 6;
  const errors = await boot(context, page, {
    muted: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -600 + 330 * Math.SQRT1_2, y: 5400 - 330 * Math.SQRT1_2, h: 2.36, clock: 0.3, hold },
  });
  await page.waitForFunction(() => window.__np.hold === 0, null, { timeout: 4000 });
  expect(
    await page.evaluate(() => window.__np.coins),
    'the trading post paid nothing',
  ).toBeGreaterThan(100);
  // Found, island 2 brings the spear into the shipwright's shop.
  await expect(page.locator('#gear [data-s]')).toHaveCount(1);
  await expect(page.locator('#ashore')).toBeVisible();
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  const at = await page.evaluate(() => [window.__np.walker.x, window.__np.walker.y]);
  expect(Math.hypot((at[0] ?? 0) + 600, (at[1] ?? 0) - 5400), 'not on island 2').toBeLessThan(230);
  // The ashore message clears the bubbles top right, which are tallest here: hearts, the hull, the time of day.
  await expect(page.locator('#toast')).toHaveClass(/show/);
  const [toastTop, chipsBottom] = await page.evaluate(() => [
    (document.getElementById('toast') as HTMLElement).getBoundingClientRect().top,
    (document.getElementById('rchips') as HTMLElement).getBoundingClientRect().bottom,
  ]);
  expect(toastTop, 'the message covers the bubbles').toBeGreaterThanOrEqual(chipsBottom);
  expect(errors).toEqual([]);
});

test('island 2: with a late-game shop, Step ashore is still on the screen, and the long shop scrolls', async ({
  context,
  page,
}) => {
  // Everything bought, on a short phone: a shop taller than the screen, which once grew off the top and took
  // Step ashore with it.
  await page.setViewportSize({ width: 390, height: 440 });
  const errors = await boot(context, page, {
    muted: true,
    coins: 29474,
    build: 5,
    aquarium: true,
    lionSeen: true,
    gear: {
      mesh: true,
      strongbox: true,
      kit: true,
      rod: true,
      lionnet: true,
      suit: true,
      tank: true,
    },
    spear: 4,
    armour: 3,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    bases: { isle2: 2 },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -600 + 330 * Math.SQRT1_2,
      y: 5400 - 330 * Math.SQRT1_2,
      h: 2.36,
      clock: 0.3,
      hold: [],
    },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.waitForTimeout(500);
  // Visible is not enough: off the top of the screen counts as visible. On the screen, above the shop, which scrolls.
  const [pill, planks] = await page.evaluate(() => {
    const a = (document.getElementById('ashore') as HTMLElement).getBoundingClientRect();
    const p = document.querySelector('#shop .planks') as HTMLElement;
    return [
      { top: a.top, bottom: a.bottom },
      { top: p.getBoundingClientRect().top, more: p.scrollHeight - p.clientHeight },
    ];
  });
  expect(pill.top, 'Step ashore is off the top of the screen').toBeGreaterThanOrEqual(0);
  expect(pill.bottom).toBeLessThanOrEqual(planks.top);
  expect(planks.more, 'the shop is too short to test this').toBeGreaterThan(0);
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  expect(errors).toEqual([]);
});

test("bases: island 6's hut is built from its pier, a home port out in the far deep", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 2000,
    wood: 40,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: -1322 + 40, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  const card = page.locator('#baseBtn');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Build a hut here');
  await card.click();
  // Built, the card goes on to its next stage: the charter office.
  await expect(card).toContainText('Build a charter office here');
  expect(await page.evaluate(() => [window.__np.coins, window.__np.bases.isle6])).toEqual([500, 1]);
  expect(errors).toEqual([]);
});

test('charters: at island 6 passengers board, see the whales, and pay at the next dock', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    bases: { isle2: 0, isle3: 0, isle6: 2 },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: -1322 + 40, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  const card = page.locator('#charterBtn');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Take a charter');
  // One passenger, who wants the whales; and Star, who haunts island 6, off on a long flight.
  await page.evaluate(() => {
    window.__np.serpent.state = 'away';
    const o = window.__np.charterOffer;
    if (!o) return;
    o.wants = ['whales'];
    o.shirts = [1];
  });
  await card.click();
  await page.waitForFunction(() => window.__np.charter !== null, null, { timeout: 2000 });
  await expect(page.locator('#charter')).toBeVisible();
  await expect(page.locator('#charter')).toContainText('the whales');
  // Out to the whales, and one comes up beside the boat.
  await page.evaluate(() => {
    const np = window.__np;
    const m = np.whales.mother;
    np.boat.x = m.x + 200;
    np.boat.y = m.y;
    np.boat.v = 0;
    m.up = 3;
  });
  await page.waitForFunction(() => window.__np.charter?.seen.includes('whales'), null, {
    timeout: 3000,
  });
  await expect(page.locator('#charter')).toContainText('\u2713');
  // Back at island 6's pier: they pay, the trip, the whales and a tip for seeing it all; half that if a
  // shark circling a school by the whales happened to charge close and frighten them.
  const scared = await page.evaluate(() => !!(window.__np.charter as { scared?: boolean }).scared);
  await page.evaluate(() => {
    const np = window.__np;
    np.boat.x = 2400;
    np.boat.y = -1322 + 40;
    np.boat.v = 0;
  });
  await page.waitForFunction(() => window.__np.charter === null, null, { timeout: 3000 });
  // The fare, said as they step off. The purse may hold a little more: the net can sweep a fish on the way
  // out to the whales, and tying up sells it.
  const paid = scared ? 300 : 600;
  await expect(page.locator('#toast')).toContainText(`+${paid} coins`);
  expect(await page.evaluate(() => window.__np.chartersRun)).toBe(1);
  expect(await page.evaluate(() => window.__np.coins)).toBeGreaterThanOrEqual(paid);
  await expect(page.locator('#charter')).toBeHidden();
  expect(errors).toEqual([]);
});

test('bases: build a hut on island 2 from its dock, and the boat comes back up there after a sinking nearby', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 2000,
    wood: 40,
    isle2Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -600 + 330 * Math.SQRT1_2,
      y: 5400 - 330 * Math.SQRT1_2,
      h: 2.36,
      clock: 0.3,
      hold: [],
    },
  });
  const card = page.locator('#baseBtn');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Build a hut here');
  await card.click();
  // Built, the card goes on to the base's next stage.
  await expect(card).toContainText('Build a gear shed here');
  expect(await page.evaluate(() => [window.__np.coins, window.__np.bases.isle2])).toEqual([500, 1]);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').bases),
  ).toEqual({ isle2: 1, isle3: 0, isle6: 0, floe: 0 });
  // Out past island 2's dock, nearer it than home, the boat goes down; it comes back up off that dock.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = -600 + 900 * Math.SQRT1_2;
    b.y = 5400 - 900 * Math.SQRT1_2;
    b.v = 0;
  });
  await page.evaluate(() => window.__np.swallow('log'));
  await page.waitForFunction(() => !window.__np.swallowing, null, { timeout: 4000 });
  const [at, spit] = await page.evaluate(() => [
    [window.__np.boat.x, window.__np.boat.y],
    window.__np.BASES[0]?.spit,
  ]);
  expect(
    Math.hypot((at?.[0] ?? 0) - (spit?.x ?? 0), (at?.[1] ?? 0) - (spit?.y ?? 0)),
    'not off island 2',
  ).toBeLessThan(40);
  await expect(page.locator('#toast')).toContainText('your hut on island 2');
  expect(errors).toEqual([]);
});

test("seining: island 2's gear shed puts a seine aboard, and a loop round a school hauls it in", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 4000,
    wood: 60,
    isle2Seen: true,
    bases: { isle2: 1 },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -600 + 330 * Math.SQRT1_2,
      y: 5400 - 330 * Math.SQRT1_2,
      h: 2.36,
      clock: 0.3,
      hold: [],
    },
  });
  const card = page.locator('#baseBtn');
  await expect(card).toContainText('Build a gear shed here');
  await card.click();
  // Built, the base is a chip in the Yours row.
  await expect(card).toBeHidden();
  await expect(page.locator('#yours')).toContainText('Your base on island 2');
  expect(await page.evaluate(() => window.__np.bases.isle2)).toBe(2);
  // Out to the parrotfish school farthest from the dock, the boat on a circle round it, going round.
  const sc = await page.evaluate(() => {
    const d = window.__np.BASES[0]?.dock ?? { x: 0, y: 0 };
    let best = { cx: 0, cy: 0, r: 0 };
    let bd = -1;
    for (const s of window.__np.schools) {
      const k = Math.hypot(s.cx - d.x, s.cy - d.y);
      if (s.sp === 13 && k > bd) {
        bd = k;
        best = { cx: s.cx, cy: s.cy, r: s.r };
      }
    }
    return best;
  });
  const R = sc.r + 40;
  const at = (a: number) =>
    page.evaluate(
      ([cx, cy, r, a]) => {
        const b = window.__np.boat;
        b.x = cx + Math.cos(a) * r;
        b.y = cy + Math.sin(a) * r;
        b.h = a + Math.PI / 2;
        b.v = 0;
      },
      [sc.cx, sc.cy, R, a] as const,
    );
  await at(0);
  const button = page.locator('#seineBtn');
  await expect(button).toBeVisible();
  await button.click();
  expect(await page.evaluate(() => window.__np.seine.state)).toBe('out');
  await expect(button).toHaveAttribute('aria-label', 'Haul the seine in');
  for (let i = 1; i <= 140; i++) {
    if ((await page.evaluate(() => window.__np.seine.state)) !== 'out') break;
    await at((i / 120) * Math.PI * 2);
    await page.waitForTimeout(30);
  }
  expect(await page.evaluate(() => window.__np.seine.state)).toBe('stowed');
  await expect(page.locator('#toast')).toContainText('Seine closed round');
  await page.waitForFunction(() => window.__np.haulLeft === 0 && window.__np.hold >= 10, null, {
    timeout: 4000,
  });
  expect(errors).toEqual([]);
});

test("crab pots: island 3's crab shed puts three aboard; one dropped in home water fills with spider crabs that come aboard", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 4000,
    wood: 60,
    isle2Seen: true,
    isle3Seen: true,
    // Met already, so his first sighting does not talk over the pots at the buoys.
    reaperSeen: true,
    bases: { isle2: 0, isle3: 1 },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -600 + 322, y: -600 + 154, h: Math.PI, clock: 0.3, hold: [] },
  });
  const card = page.locator('#baseBtn');
  await expect(card).toContainText('Build a crab shed here');
  await card.click();
  await expect(card).toBeHidden();
  await expect(page.locator('#yours')).toContainText('Your base on island 3');
  // Home water, stopped: the crab button drops a pot astern.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 3500;
    b.y = 2300;
    b.h = 0;
    b.v = 0;
  });
  const button = page.locator('#potBtn');
  await expect(button).toBeVisible();
  await expect(page.locator('#potN')).toHaveText('3');
  await button.click();
  await page.waitForFunction(() => window.__np.pots.length === 1, null, { timeout: 2000 });
  await expect(page.locator('#potN')).toHaveText('\u2191');
  // Away, and the crabs climb in; back past it, they come aboard.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 3800;
    b.y = 2000;
    const p = window.__np.pots[0];
    if (p) p.crabs = 4;
  });
  await expect(page.locator('#potN')).toHaveText('2');
  // The towed net may land a fish or two on the way, so count from here, and wait for the pot itself to empty.
  const before = await page.evaluate(() => window.__np.hold);
  await page.evaluate(() => {
    const b = window.__np.boat;
    const p = window.__np.pots[0];
    if (!p) return;
    b.x = p.x + 20;
    b.y = p.y;
  });
  await page.waitForFunction(() => window.__np.pots[0]?.crabs === 0, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.hold)).toBeGreaterThanOrEqual(before + 4);
  // Past the buoys, no pots. The Reaper roams out there: held off, so his hunt does not talk over it.
  await page.evaluate(() => {
    window.__np.reaper.holdOff = () => true;
    const b = window.__np.boat;
    b.x = 5100;
    b.y = 2300;
  });
  await button.click();
  await expect(page.locator('#toast')).toContainText('No crab pots past the buoys');
  expect(await page.evaluate(() => window.__np.pots.length)).toBe(1);
  expect(errors).toEqual([]);
});

test('the trench: the Dive button shows anywhere on its dark water, and a boat still under way is told to stop', async ({
  context,
  page,
}) => {
  // Reported from the owner's phone: stopped on the bubbles, no Dive button. The dark patch is drawn out to 180 from
  // the trench's middle, and the button used to want 150 and a boat all but stopped.
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    trenchSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 1250 + 165, y: -620, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#diveBtn')).toBeVisible();
  // Under way over it: no button yet, and how to dive here.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 1250 - 120;
    b.y = -620;
    b.h = 0;
    b.v = 300;
  });
  await expect(page.locator('#toast')).toContainText('Let go of the stick');
  expect(errors).toEqual([]);
});

test('the trench: stopped over it with scuba gear, dive; down in the dark, then swim back up to the boat', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    gear: { tank: true },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 1250 + 60, y: -620 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#diveBtn')).toBeVisible();
  expect(await page.evaluate(() => window.__np.trenchSeen)).toBe(true);
  await page.click('#diveBtn');
  await page.waitForFunction(() => window.__np.diving, null, { timeout: 2000 });
  // The big air tank from the shipwright: more air in it.
  expect(await page.evaluate(() => window.__np.diver.airMax)).toBe(120);
  expect(await page.evaluate(() => window.__np.diver.air)).toBeGreaterThan(100);
  // The sea's own buttons stand down; the way back up shows.
  await expect(page.locator('#mapBtn')).toBeHidden();
  await expect(page.locator('#surfaceBtn')).toBeVisible();
  // The stick swims it down.
  await page.mouse.move(195, 400);
  await page.mouse.down();
  await page.mouse.move(195, 520, { steps: 4 });
  await page.waitForFunction(() => window.__np.diver.y > 150, null, { timeout: 4000 });
  await page.mouse.up();
  // Deep down, then back up on purpose.
  await page.evaluate(() => {
    window.__np.diver.y = 1100;
  });
  await page.waitForTimeout(200);
  await page.click('#surfaceBtn');
  await page.waitForFunction(() => !window.__np.diving, null, { timeout: 10000 });
  expect(await page.evaluate(() => window.__np.trenchDeep)).toBeGreaterThan(1000);
  await expect(page.locator('#toast')).toContainText('Back aboard');
  await expect(page.locator('#mapBtn')).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').trenchDeep),
  ).toBeGreaterThan(1000);
  expect(errors).toEqual([]);
});

test('spearfishing: down in the trench with a spear, a glow squid in reach is aimed at, and a throw takes it into the hold', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    trenchSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 1250 + 60, y: -620 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await page.click('#diveBtn');
  await page.waitForFunction(() => window.__np.diving, null, { timeout: 2000 });
  await expect(page.locator('#throw')).toBeVisible();
  // Just short of the squid, facing them: held there while the aim settles on one.
  const squid = await page.evaluate(() =>
    window.__np.trenchSh.findIndex((s) => s.kind === 'squid'),
  );
  const put = () =>
    page.evaluate((si) => {
      const np = window.__np;
      const s = np.trenchSh[si];
      if (!s) return;
      const a = s.ph + np.diveT * s.pace;
      const d = np.diver;
      d.x = s.cx + Math.sin(a) * s.rx - 80;
      d.y = s.cy + Math.sin(a * 1.7 + 1) * s.ry;
      d.vx = 0;
      d.vy = 0;
      d.face = 1;
    }, squid);
  await put();
  await page.waitForFunction((si) => window.__np.diveAim?.si === si, squid, { timeout: 2000 });
  await put();
  await page.click('#throw');
  await page.waitForFunction(() => window.__np.hold >= 1, null, { timeout: 3000 });
  // On a phone the other thumb is on the stick, and an iPhone makes no click of the tap: the press alone throws.
  await page.waitForFunction(
    () => !document.getElementById('throw')?.classList.contains('wait'),
    null,
    {
      timeout: 3000,
    },
  );
  await put();
  await page.waitForFunction((si) => window.__np.diveAim?.si === si, squid, { timeout: 2000 });
  await put();
  await page.dispatchEvent('#throw', 'pointerdown', {
    button: 0,
    pointerType: 'touch',
    isPrimary: false,
  });
  await page.waitForFunction(() => window.__np.hold >= 2, null, { timeout: 3000 });
  expect(errors).toEqual([]);
});

test('trench treasure: swim up to the chest on the floor and it is yours, once; the clam has a pearl', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    trenchSeen: true,
    trenchDeep: 900,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 1250 + 60, y: -620 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await page.click('#diveBtn');
  await page.waitForFunction(() => window.__np.diving, null, { timeout: 2000 });
  const at = (kind: string) =>
    page.evaluate((k) => {
      const np = window.__np;
      const l = np.TRENCH_LOOT.find((t) => t.kind === k);
      if (!l) return;
      np.diver.x = l.x;
      np.diver.y = l.y - 14;
      np.diver.vx = 0;
      np.diver.vy = 0;
    }, kind);
  await at('chest');
  await page.waitForFunction(() => window.__np.trenchLoot !== 0, null, { timeout: 2000 });
  await expect(page.locator('#toast')).toContainText('treasure chest');
  const after = await page.evaluate(() => window.__np.coins);
  expect(after).toBe(600);
  // Not twice.
  await at('chest');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__np.coins)).toBe(600);
  // The giant clam's pearl.
  await at('clam');
  await page.waitForFunction(() => window.__np.pearlDay > 0, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(750);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').trenchLoot),
  ).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('the lurker: deep in the dark its eyes come, it bites air out of a diver who stays put, and a spear stings it off', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    trenchSeen: true,
    trenchDeep: 900,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 1250 + 60, y: -620 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await page.click('#diveBtn');
  await page.waitForFunction(() => window.__np.diving, null, { timeout: 2000 });
  // Down in the midnight water, and it has nearly made up its mind.
  await page.evaluate(() => {
    const d = window.__np.diver;
    d.x = 380;
    d.y = 1100;
    d.vx = 0;
    d.vy = 0;
    window.__np.lurker.wait = 5.8;
  });
  await page.waitForFunction(() => window.__np.lurkerSeen, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('Two eyes in the dark');
  // Its warning, a little way off a diver who stays put: the bite takes air.
  const air = await page.evaluate(() => {
    const np = window.__np;
    const d = np.diver;
    const l = np.lurker;
    d.vx = 0;
    d.vy = 0;
    l.x = d.x - 90;
    l.y = d.y;
    l.a = 0;
    l.state = 'tell';
    l.t = 0.05;
    return d.air;
  });
  await page.waitForFunction((a) => window.__np.diver.air < a - 20, air, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('bit your tank');
  // Out again, ahead of the diver: the throw goes for it, and the spear stings it off.
  const put = () =>
    page.evaluate(() => {
      const np = window.__np;
      const d = np.diver;
      const l = np.lurker;
      d.x = 380;
      d.y = 1100;
      d.vx = 0;
      d.vy = 0;
      d.face = 1;
      l.state = 'stalk';
      l.t = 5;
      l.x = d.x + 110;
      l.y = d.y;
    });
  await put();
  await page.waitForFunction(() => window.__np.diveAim !== null, null, { timeout: 2000 });
  await put();
  await page.click('#throw');
  await page.waitForFunction(() => window.__np.lurkerStung === 1, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.lurker.state)).toBe('flee');
  expect(errors).toEqual([]);
});

test('the wreck: stopped beside it at island 5, dive to it, find its treasure, and spear a bone shark off', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    spear: 2,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -2306, y: 2523, h: 0, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  const btn = page.locator('#diveBtn');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText('Dive to the wreck');
  await btn.click();
  await page.waitForFunction(() => window.__np.diving && window.__np.diveSite === 'wreck', null, {
    timeout: 2000,
  });
  // Into the hold to the chest.
  await page.evaluate(() => {
    const np = window.__np;
    for (const b of np.boneSharks) {
      b.state = 'stung';
      b.t = 60;
    }
    np.diver.x = np.WRECK_CHEST.x + 8;
    np.diver.y = np.WRECK_CHEST.y - 10;
    np.diver.vx = 0;
    np.diver.vy = 0;
  });
  await page.waitForFunction(() => window.__np.wreckChest, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(1200);
  await expect(page.locator('#toast')).toContainText("wreck's treasure");
  // Out in the open, a bone shark ahead: the throw goes for it and stings it off.
  const put = () =>
    page.evaluate(() => {
      const np = window.__np;
      const d = np.diver;
      d.x = 450;
      d.y = 110;
      d.vx = 0;
      d.vy = 0;
      d.face = 1;
      const b = np.boneSharks[0];
      if (!b) return;
      b.state = 'cruise';
      b.t = 0;
      b.x = 560;
      b.y = 110;
    });
  await put();
  await page.waitForFunction(() => window.__np.diveAim !== null, null, { timeout: 2000 });
  await put();
  await page.click('#throw');
  await page.waitForFunction(() => window.__np.boneSharks[0]?.state === 'stung', null, {
    timeout: 3000,
  });
  // Back up: the treasure is saved.
  await page.click('#surfaceBtn');
  await page.waitForFunction(() => !window.__np.diving, null, { timeout: 10000 });
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').wreckChest),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('storms: out past the buoys a storm warns, comes, slows the boat, and the fish boil up after', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    isle2Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 1250 + 60, y: -620 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const st = window.__np.storm;
    st.bring();
  });
  await expect(page.locator('#toast')).toContainText('a storm is coming');
  // Hurried on from its warning.
  await page.evaluate(() => {
    window.__np.storm.t = 0.2;
  });
  await page.waitForFunction(() => window.__np.storm.phase === 'storm', null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('The storm is here');
  await page.waitForFunction(() => window.__np.stormE > 0.9, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.stormSeen)).toBe(true);
  // Full ahead in it, the boat makes less than its top speed.
  await page.evaluate(() => {
    window.__np.keys = 'drive';
  });
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(2500);
  const v = await page.evaluate(() => window.__np.boat.v);
  await page.keyboard.up('ArrowUp');
  expect(v).toBeLessThan(350 * 0.8);
  expect(v).toBeGreaterThan(350 * 0.5);
  // It passes, and the fish boil up.
  await page.evaluate(() => {
    window.__np.storm.t = 0.1;
  });
  await page.waitForFunction(() => window.__np.storm.phase === 'boil', null, { timeout: 2000 });
  await expect(page.locator('#toast')).toContainText('boiling up');
  expect(errors).toEqual([]);
});

test('the abyss: a blue hole past the white buoys, down 1,000 metres in the cage, out on the floor, and back up', async ({
  context,
  page,
}) => {
  // A flagship with the scuba gear and a spear, stopped over the abyss's dark middle, off island 11.
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7620, y: -4300, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#toast')).toContainText('A blue hole!', { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.abyssSeen)).toBe(true);
  await expect(page.locator('#diveBtn')).toHaveText('Dive into the abyss', { timeout: 4000 });
  await page.locator('#diveBtn').click();
  await page.waitForFunction(() => window.__np.diving && window.__np.diveSite === 'abyss', null, {
    timeout: 3000,
  });
  // The giants passing the cage have a test of their own; jumping the cage down would bring them all at once.
  await page.evaluate(() => {
    window.__np.giants.list = [];
    window.__np.floorGulper.away = 1e9;
    window.__np.hunter.reset(false);
  });
  // In the cage, going down: no spear, and the way back is the cage.
  expect(await page.evaluate(() => window.__np.diver.cage?.go)).toBe('down');
  await expect(page.locator('#surfaceBtn')).toHaveText('Ride the cage up');
  await expect(page.locator('#throw')).toBeHidden();
  // Past the depth of the trench's treasure, none of which is down here.
  await page.evaluate(() => {
    const c = window.__np.diver.cage;
    if (c) c.y = 1150;
  });
  await page.waitForFunction(() => window.__np.diver.y > 1400, null, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(0);
  // Most of the way down at once, then down to the floor.
  await page.evaluate(() => {
    const c = window.__np.diver.cage;
    if (c) c.y = 2800;
  });
  await page.waitForFunction(() => window.__np.abyssDown, null, { timeout: 6000 });
  await expect(page.locator('#toast')).toContainText('1,000 metres down');
  await expect(page.locator('#throw')).toBeVisible();
  // Out over the floor, just short of the kid's nibblers, facing them: the aim settles on one, and a throw takes it.
  // (The Remoro, off today, is not in the way.)
  await page.evaluate(() => window.__np.remoro.reset(false));
  const nib = await page.evaluate(() => window.__np.abyssSh.findIndex((s) => s.deep === 'nibbler'));
  expect(nib).toBeGreaterThan(0);
  // The viper fish swim just over the nibblers and can cross the spear's way first: every other shoal goes up out of it.
  await page.evaluate((si) => {
    window.__np.abyssSh.forEach((s, i) => {
      if (i !== si) s.cy -= 3000;
    });
  }, nib);
  const put = () =>
    page.evaluate((si) => {
      const np = window.__np;
      const s = np.abyssSh[si];
      if (!s) return;
      const a = s.ph + np.diveT * s.pace;
      const d = np.diver;
      d.x = s.cx + Math.sin(a) * s.rx - 80;
      d.y = s.cy + Math.sin(a * 1.7 + 1) * s.ry;
      d.vx = 0;
      d.vy = 0;
      d.face = 1;
    }, nib);
  await put();
  await page.waitForFunction((si) => window.__np.diveAim?.si === si, nib, { timeout: 2000 });
  await put();
  await page.click('#throw');
  await page.waitForFunction(() => window.__np.hold >= 1, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('A nibbler!');
  // Out of the cage the air runs; Ride the cage up pulls the diver back in, and up it goes.
  await page.evaluate(() => {
    window.__np.diver.x += 120;
  });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__np.diver.inCage)).toBe(false);
  await page.locator('#surfaceBtn').click();
  await page.waitForFunction(() => window.__np.diver.cage?.go === 'up', null, { timeout: 4000 });
  await page.evaluate(() => {
    const c = window.__np.diver.cage;
    if (c) c.y = 60;
  });
  await page.waitForFunction(() => !window.__np.diving, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('1,000 metres down and back');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect([saved.abyssSeen, saved.abyssDown]).toEqual([true, true]);
  expect(errors).toEqual([]);
});

test("the abyss: the kid's Remoro cruises over the floor, three spears land it, and it is gone till tomorrow", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    abyssSeen: true,
    abyssDown: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7620, y: -4300, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#diveBtn')).toHaveText('Dive into the abyss', { timeout: 4000 });
  await page.locator('#diveBtn').click();
  await page.waitForFunction(() => window.__np.diving && window.__np.diveSite === 'abyss', null, {
    timeout: 3000,
  });
  expect(await page.evaluate(() => window.__np.remoro.here)).toBe(true);
  await page.evaluate(() => {
    window.__np.giants.list = [];
    window.__np.floorGulper.away = 1e9;
    window.__np.hunter.reset(false);
    const c = window.__np.diver.cage;
    if (c) c.y = 2800;
  });
  await expect(page.locator('#throw')).toBeVisible({ timeout: 6000 });
  // Close under it, and throw: each spear sends it darting off; the third lands it. A deep fish in the way may take a
  // spear first, so throw until it is landed.
  for (let i = 0; i < 20; i++) {
    if (await page.evaluate(() => window.__np.remoro.state === 'gone')) break;
    await page.waitForFunction(
      () => !document.querySelector('#throw')?.classList.contains('wait'),
      null,
      {
        timeout: 3000,
      },
    );
    const hits = await page.evaluate(() => {
      const { diver: d, remoro: r } = window.__np;
      d.x = r.x;
      d.y = r.y + 40;
      d.vx = 0;
      d.vy = 0;
      d.face = r.dir;
      return r.hits;
    });
    await page.click('#throw');
    await page
      .waitForFunction(
        (h) => window.__np.remoro.hits !== h || window.__np.remoro.state === 'gone',
        hits,
        {
          timeout: 1500,
        },
      )
      .catch(() => {});
    if (hits === 0 && (await page.evaluate(() => window.__np.remoro.hits)) === 1)
      await expect(page.locator('#toast')).toContainText('The Remoro darts off');
  }
  expect(await page.evaluate(() => window.__np.remoro.state)).toBe('gone');
  await expect(page.locator('#toast')).toContainText('You landed the Remoro!');
  const day = await page.evaluate(() => window.__np.day);
  expect(await page.evaluate(() => window.__np.remoroDay)).toBe(day);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect([saved.remoroDay, saved.log[37]]).toEqual([day, 1]);
  // Up, and down again the same day: it is gone till tomorrow.
  await page.locator('#surfaceBtn').click();
  await page.waitForFunction(() => window.__np.diver.cage?.go === 'up', null, { timeout: 4000 });
  await page.evaluate(() => {
    const c = window.__np.diver.cage;
    if (c) c.y = 60;
  });
  await page.waitForFunction(() => !window.__np.diving, null, { timeout: 4000 });
  await expect(page.locator('#diveBtn')).toHaveText('Dive into the abyss', { timeout: 4000 });
  await page.locator('#diveBtn').click();
  await page.waitForFunction(() => window.__np.diving, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.remoro.here)).toBe(false);
  await page.evaluate(() => {
    window.__np.giants.list = [];
    const c = window.__np.diver.cage;
    if (c) c.y = 2800;
  });
  await expect(page.locator('#toast')).toContainText('The Remoro is gone for today', {
    timeout: 6000,
  });
  expect(errors).toEqual([]);
});

test('the abyss: giants pass the cage on the way down, and one slams into it, but the bars hold', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    abyssSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7620, y: -4300, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#diveBtn')).toHaveText('Dive into the abyss', { timeout: 4000 });
  await page.locator('#diveBtn').click();
  await page.waitForFunction(() => window.__np.diving && window.__np.diveSite === 'abyss', null, {
    timeout: 3000,
  });
  // All five the kid named are coming, and one of them will lunge.
  const kinds = await page.evaluate(() => window.__np.giants.list.map((g) => g.kind).sort());
  expect(kinds).toEqual(['cthulhu', 'cthuluviathan', 'gulper', 'leviathan', 'reaper']);
  const air = await page.evaluate(() => window.__np.diver.air);
  // Down to where the one that lunges comes past: it swims across, warns, and slams into the cage.
  await page.evaluate(() => {
    const np = window.__np;
    const g = np.giants.list.find((x) => x.lunges);
    const c = np.diver.cage;
    if (g && c) c.y = g.at;
  });
  await page.waitForFunction(() => window.__np.giants.list.some((g) => g.state === 'pass'), null, {
    timeout: 2000,
  });
  await expect(page.locator('#toast')).toContainText('slams into the cage! The bars hold', {
    timeout: 5000,
  });
  // In the cage nothing gets you: the air is as it was, and the cage goes on down.
  expect(await page.evaluate(() => window.__np.diver.air)).toBe(air);
  expect(await page.evaluate(() => window.__np.diver.cage?.go)).toBe('down');
  expect(errors).toEqual([]);
});

test('the abyss: out of the cage a gulper comes and bites air, and back in the cage it cannot reach you', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    abyssSeen: true,
    abyssDown: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7620, y: -4300, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#diveBtn')).toHaveText('Dive into the abyss', { timeout: 4000 });
  await page.locator('#diveBtn').click();
  await page.waitForFunction(() => window.__np.diving && window.__np.diveSite === 'abyss', null, {
    timeout: 3000,
  });
  await page.evaluate(() => {
    window.__np.giants.list = [];
    window.__np.hunter.reset(false);
    const c = window.__np.diver.cage;
    if (c) c.y = 2800;
  });
  await page.waitForFunction(() => window.__np.diver.cage?.go === 'wait', null, { timeout: 6000 });
  // Waiting in the cage, nothing comes, however long it has been.
  await page.evaluate(() => {
    window.__np.floorGulper.wait = 100;
  });
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__np.floorGulper.state)).toBe('hide');
  // Out over the floor, and held there, a while: it comes, and bites.
  const hold = () =>
    page.evaluate(() => {
      const { diver: d } = window.__np;
      d.x = 300;
      d.y = 2700;
      d.vx = 0;
      d.vy = 0;
    });
  await hold();
  await page.evaluate(() => {
    window.__np.floorGulper.wait = 13.5;
  });
  await expect(page.locator('#toast')).toContainText('A gulper, out of the dark!', {
    timeout: 3000,
  });
  const air = await page.evaluate(() => window.__np.diver.air);
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => window.__np.floorGulper.state === 'back')) break;
    await hold();
    await page.waitForTimeout(200);
  }
  await expect(page.locator('#toast')).toContainText('Gulp! The gulper bit your tank');
  expect(await page.evaluate(() => window.__np.diver.air)).toBeLessThan(air - 20);
  // Back in the cage, it lets you be, and the tank fills again.
  await page.evaluate(() => {
    const { diver: d } = window.__np;
    const c = d.cage;
    if (c) {
      d.x = c.x;
      d.y = c.y;
    }
    window.__np.floorGulper.wait = 100;
  });
  await page.waitForTimeout(3500);
  expect(await page.evaluate(() => window.__np.floorGulper.state)).toBe('hide');
  expect(await page.evaluate(() => window.__np.diver.inCage)).toBe(true);
  expect(errors).toEqual([]);
});

test("the abyss: the kid's attack nibbler hunts the floor, and three spears land it, one a day", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    abyssSeen: true,
    abyssDown: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7620, y: -4300, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#diveBtn')).toHaveText('Dive into the abyss', { timeout: 4000 });
  await page.locator('#diveBtn').click();
  await page.waitForFunction(() => window.__np.diving && window.__np.diveSite === 'abyss', null, {
    timeout: 3000,
  });
  expect(await page.evaluate(() => window.__np.hunter.here)).toBe(true);
  await page.evaluate(() => {
    const np = window.__np;
    np.giants.list = [];
    np.floorGulper.away = 1e9;
    np.remoro.reset(false);
    const c = np.diver.cage;
    if (c) c.y = 2800;
  });
  await expect(page.locator('#throw')).toBeVisible({ timeout: 6000 });
  // Close under it, and throw until it is landed (a deep fish in the way may take a spear first).
  for (let i = 0; i < 20; i++) {
    if (await page.evaluate(() => window.__np.hunter.state === 'gone')) break;
    await page.waitForFunction(
      () => !document.querySelector('#throw')?.classList.contains('wait'),
      null,
      {
        timeout: 3000,
      },
    );
    const hits = await page.evaluate(() => {
      const { diver: d, hunter: h } = window.__np;
      d.x = h.x;
      d.y = h.y + 36;
      d.vx = 0;
      d.vy = 0;
      d.face = h.dx >= 0 ? 1 : -1;
      return h.hits;
    });
    await page.click('#throw');
    await page
      .waitForFunction(
        (n) => window.__np.hunter.hits !== n || window.__np.hunter.state === 'gone',
        hits,
        {
          timeout: 1500,
        },
      )
      .catch(() => {});
    if (hits === 0 && (await page.evaluate(() => window.__np.hunter.hits)) === 1)
      await expect(page.locator('#toast')).toContainText('The attack nibbler darts off');
  }
  expect(await page.evaluate(() => window.__np.hunter.state)).toBe('gone');
  await expect(page.locator('#toast')).toContainText('You landed the attack nibbler!');
  const day = await page.evaluate(() => window.__np.day);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect([saved.hunterDay, saved.log[38]]).toEqual([day, 1]);
  expect(errors).toEqual([]);
});

test('the trench: without the scuba gear there is no diving, and the game says where to get it', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 1250 + 60, y: -620 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#toast')).toContainText('scuba gear');
  await page.waitForTimeout(500);
  await expect(page.locator('#diveBtn')).toBeHidden();
  expect(errors).toEqual([]);
});

test('island 3: sell at the floating town, step onto the jetty, walk to the tower door', async ({
  context,
  page,
}) => {
  // A flagship already at the floating town's jetty, with grouper in the hold.
  const hold = new Array(15).fill(0);
  hold[14] = 5;
  const errors = await boot(context, page, {
    muted: true,
    lv: { net: 5, hold: 5, engine: 5 },
    isle2Seen: true,
    trip: { x: -600 + 322, y: -600 + 154, h: Math.PI, clock: 0.3, hold },
  });
  await page.waitForFunction(() => window.__np.hold === 0, null, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.coins), 'the trader paid nothing').toBeGreaterThan(
    200,
  );
  expect(await page.evaluate(() => window.__np.isle3Seen)).toBe(true);
  await expect(page.locator('#log')).toContainText('Sunken island found');
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  const at = await page.evaluate(() => [window.__np.walker.x, window.__np.walker.y]);
  // On the jetty, near its end.
  expect(Math.hypot((at[0] ?? 0) + 334, (at[1] ?? 0) + 456), 'not on the jetty').toBeLessThan(12);
  // Over the planks and the seaweed to the tower's door, where it can be climbed.
  await page.evaluate(() => {
    const w = window.__np.walker;
    w.x = -600 + 37;
    w.y = -600 + 40;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower');
  expect(errors).toEqual([]);
});

test('turtles: one swims alongside a boat that comes up slowly, and the log counts it', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    lv: { net: 3, hold: 3, engine: 3 },
    trip: { x: 2400 + 700, y: 2400, h: Math.PI / 2, clock: 0.3, hold: new Array(14).fill(0) },
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const np = window.__np;
    const t = np.turtles.turtles[0];
    if (!t) throw new Error('no turtles');
    t.x = np.boat.x + 40;
    t.y = np.boat.y + 90;
    t.up = 1;
  });
  await page.waitForFunction(() => window.__np.turtleSwims === 1, null, { timeout: 4000 });
  expect(await page.evaluate(() => !!window.__np.turtles.companion)).toBe(true);
  await expect(page.locator('#log')).toContainText('Turtle swims 1');
  expect(errors).toEqual([]);
});

test('flag: design one in the shop and the boat flies it', async ({ context, page }) => {
  const errors = await boot(context, page, {
    muted: true,
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#flagBtn')).toBeVisible();
  await page.click('#flagBtn');
  await expect(page.locator('#flagger')).toBeVisible();
  await page.click('#fEmblem button:nth-child(4)');
  await page.click('#fField button:nth-child(9)');
  await page.click('#flagDone');
  await expect(page.locator('#flagger')).toBeHidden();
  const flag = await page.evaluate(
    () => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').flag,
  );
  // Black with a skull, the second colour still the first flag's navy.
  expect(flag).toEqual({ field: 8, accent: 3, pattern: 0, emblem: 3 });
  expect(errors).toEqual([]);
});

test('health: the gulper eats a boat that sits still, and spits it out at home without its catch', async ({
  context,
  page,
}) => {
  const hold = new Array(14).fill(0);
  hold[12] = 20;
  const errors = await boot(context, page, {
    muted: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 4800 + 900, y: 2700, h: Math.PI, clock: 0.3, hold },
  });
  await expect(page.locator('#hull')).toBeVisible();
  await page.waitForFunction(() => window.__np.swallowing, null, { timeout: 20000 });
  await page.waitForFunction(() => !window.__np.swallowing, null, { timeout: 4000 });
  const after = await page.evaluate(() => ({
    hold: window.__np.hold,
    x: window.__np.boat.x,
    y: window.__np.boat.y,
    hp: window.__np.hp,
  }));
  expect(after.hold, 'the catch came back with the boat').toBe(0);
  expect(Math.hypot(after.x - 2400, after.y - 2400), 'not spat out at home').toBeLessThan(700);
  expect(after.hp).toBe(100);
  expect(errors).toEqual([]);
});

test('harpoon: the gulper comes up, the button fires the harpoon, and driven off it pays and leaves a tooth', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    lv: { net: 5, hold: 5, engine: 5 },
    spear: 4,
    trip: { x: 4800 + 900, y: 2700, h: Math.PI, clock: 0.3, hold: new Array(14).fill(0) },
  });
  await page.waitForFunction(() => window.__np.harpoonTarget === 'gulper', null, {
    timeout: 20000,
  });
  const fire = page.locator('#throw');
  await expect(fire).toBeVisible();
  await expect(fire).toHaveClass(/harpoon/);
  await expect(fire).toHaveAttribute('aria-label', 'Fire the harpoon');
  await fire.click();
  await page.waitForFunction(() => window.__np.gulper.resolve < 4, null, { timeout: 3000 });
  // One more hit drives it off: the unit tests play the whole fight.
  await page.evaluate(() => {
    window.__np.gulper.resolve = 1;
  });
  await page.waitForTimeout(1300);
  await page.waitForFunction(() => window.__np.harpoonTarget === 'gulper', null, { timeout: 3000 });
  await fire.click();
  await page.waitForFunction(() => window.__np.driven.gulper === 1, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(1000);
  await expect(page.locator('#log')).toContainText('Gulper tooth');
  expect(errors).toEqual([]);
});

test('Star, the meteor serpent: over island 6 it dives at the boat, and harpooned in the water it is driven off', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: -1000, h: Math.PI, clock: 0.3, hold: [] },
  });
  // It comes for the boat, circles, and dives into its ring.
  await page.waitForFunction(() => window.__np.serpent.state === 'hunt', null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('hunting you', { timeout: 3000 });
  await page.waitForFunction(() => window.__np.serpent.state === 'down', null, { timeout: 12000 });
  // One hit from driven off: the unit tests play the whole fight.
  await page.evaluate(() => {
    window.__np.serpent.resolve = 1;
  });
  await page.waitForFunction(() => window.__np.harpoonTarget === 'meteor', null, { timeout: 2000 });
  await page.locator('#throw').click();
  await page.waitForFunction(() => window.__np.driven.meteor === 1, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.serpent.state)).toBe('away');
  expect(await page.evaluate(() => window.__np.coins)).toBe(1000);
  await expect(page.locator('#log')).toContainText('Meteor shard');
  expect(errors).toEqual([]);
});

test('spear: ashore on island 2, a parrotfish in range brings the throw button, and a throw pays', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 100,
    spear: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -600 + 330 * Math.SQRT1_2,
      y: 5400 - 330 * Math.SQRT1_2,
      h: 2.36,
      clock: 0.3,
      hold: [],
    },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // Stand on the sand straight in from a fish.
  await page.evaluate(() => {
    const f = window.__np.shallows.fish[0];
    if (!f) return;
    const a = Math.atan2(f.y - 5400, f.x + 600);
    window.__np.walker.x = -600 + Math.cos(a) * 214;
    window.__np.walker.y = 5400 + Math.sin(a) * 214;
  });
  await expect(page.locator('#throw')).toBeVisible();
  const before = await page.evaluate(() => window.__np.coins);
  await page.click('#throw');
  await page.waitForFunction((c) => window.__np.coins > c, before, { timeout: 2000 });
  expect(errors).toEqual([]);
});

test('monkeys: a barbed spear beats a skull-mask monkey and its mask is kept', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -600 + 330 * Math.SQRT1_2,
      y: 5400 - 330 * Math.SQRT1_2,
      h: 2.36,
      clock: 0.3,
      hold: [],
    },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = -600 - 115 + 70;
    window.__np.walker.y = 5400 + 105 - 30;
  });
  await expect(page.locator('#hearts')).toBeVisible();
  await expect(page.locator('#throw')).toBeVisible();
  await page.click('#throw');
  await page.waitForFunction(() => window.__np.masks > 0, null, { timeout: 3000 });
  expect(errors).toEqual([]);
});

test('the naga: beat the monkey camp and his cage opens; he fights beside you, and swims beside the boat', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -600 + 330 * Math.SQRT1_2,
      y: 5400 - 330 * Math.SQRT1_2,
      h: 2.36,
      clock: 0.3,
      hold: [],
    },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.nagaFree)).toBe(false);
  // Beat the whole camp.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const C = window.__np.NAGA_CAGE;
    w.x = C.x + 30;
    w.y = C.y + 30;
    const M = window.__np.monkeys;
    for (const m of M.list) M.hit(m, 9, w.x, w.y);
  });
  await page.waitForFunction(() => window.__np.nagaFree, null, { timeout: 2000 });
  await expect(page.locator('#toast')).toContainText('naga');
  await page.waitForFunction(() => window.__np.naga.shown, null, { timeout: 2000 });
  // It is kept: a reload finds him free.
  await page.waitForTimeout(5200);
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  expect(await page.evaluate(() => window.__np.nagaFree)).toBe(true);
  // Back aboard at the berth, he is in the water beside the boat.
  await page.waitForFunction(() => window.__np.naga.swimming, null, { timeout: 3000 });
  await page.waitForTimeout(800);
  const gap = await page.evaluate(() =>
    Math.hypot(window.__np.naga.x - window.__np.boat.x, window.__np.naga.y - window.__np.boat.y),
  );
  expect(gap).toBeLessThan(80);
  expect(errors).toEqual([]);
});

test("the Reaper's egg hatches at dawn: the baby swims and leaps by the boat, and walks ashore", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    day: 3,
    reaperLandSeen: true,
    reaperEgg: 2,
    eggDay: 3,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  // Taken aboard today: it waits for the morning.
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => [window.__np.reaperEgg, window.__np.hatchT])).toEqual([2, -1]);
  // A new day: a moment for the dawn, then the cutscene. The little egg shakes on deck, Crack! Crack! Crrrrack!,
  // he is out, and over the side he goes.
  await page.evaluate(() => {
    window.__np.eggDay = 0;
  });
  await page.waitForFunction(() => window.__np.cine?.kind === 'egg', null, { timeout: 5000 });
  await expect(page.locator('body')).toHaveClass(/cine/);
  // A tap as it begins does not skip it.
  await tap(page, 195, 600);
  expect(await page.evaluate(() => window.__np.cine?.kind)).toBe('egg');
  await page.waitForFunction(() => (window.__np.eggT ?? 0) > 5.4, null, { timeout: 8000 });
  expect(await page.evaluate(() => window.__np.reaperEgg)).toBe(2);
  await page.waitForFunction(() => window.__np.reaperEgg === 3, null, { timeout: 5000 });
  await page.waitForFunction(() => window.__np.cine === null, null, { timeout: 4000 });
  await expect(page.locator('body')).not.toHaveClass(/cine/);
  await expect(page.locator('#toast')).toContainText('baby Reaper');
  await page.waitForFunction(() => window.__np.baby.swimming && window.__np.baby.leapT < 0, null, {
    timeout: 3000,
  });
  const gap = await page.evaluate(() =>
    Math.hypot(window.__np.baby.x - window.__np.boat.x, window.__np.baby.y - window.__np.boat.y),
  );
  expect(gap).toBeLessThan(90);
  // Tap him: a pat, and a leap.
  const at = await page.evaluate(() => window.__np.babyAt);
  expect(at).not.toBeNull();
  await tap(page, at?.[0] ?? 0, at?.[1] ?? 0);
  await page.waitForFunction(() => window.__np.baby.love > 0, null, { timeout: 2000 });
  // Kept: a reload finds him hatched and swimming.
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  expect(await page.evaluate(() => window.__np.reaperEgg)).toBe(3);
  await page.waitForFunction(() => window.__np.baby.swimming, null, { timeout: 3000 });
  // Ashore at island 2's berth, he walks with the figure.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = -600 + 330 * Math.SQRT1_2;
    b.y = 5400 - 330 * Math.SQRT1_2;
    b.h = 2.36;
    b.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForFunction(() => window.__np.baby.shown, null, { timeout: 3000 });
  expect(errors).toEqual([]);
});

test('the flotilla: the warrior, the bones, the necromancer and the tarling sail their own craft, and step off them ashore', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    isle7Seen: true,
    isle7Stage: 4,
    soulArmour: true,
    isle8Seen: true,
    heronStage: 2,
    heronFled: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  // Out at sea, each on its craft, the four of them round the boat; the swan waits for Caterman.
  await page.waitForFunction(
    () => window.__np.flotilla.crafts.every((c) => c.placed === (c.kind !== 'swan')),
    null,
    { timeout: 3000 },
  );
  const sea = await page.evaluate(() => {
    const { flotilla: f, boat: b } = window.__np;
    return {
      kinds: f.crafts.map((c) => c.kind),
      gaps: f.crafts.map((c) => Math.hypot(c.x - b.x, c.y - b.y)),
      riding: ['warrior', 'bones', 'necro', 'tarling'].map((r) => f.riding(r)),
    };
  });
  expect(sea.kinds).toEqual(['airboat', 'catamaran', 'windsurf', 'banana', 'swan']);
  for (const g of sea.gaps.slice(0, 4)) expect(g).toBeLessThan(260);
  expect(sea.riding).toEqual([true, true, true, true]);
  // Ashore at island 2's berth: they step off and walk with the figure; the craft wait.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = -600 + 330 * Math.SQRT1_2;
    b.y = 5400 - 330 * Math.SQRT1_2;
    b.h = 2.36;
    b.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForFunction(() => window.__np.warriorPal.shown, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.flotilla.riding('warrior'))).toBe(false);
  expect(
    await page.evaluate(() => window.__np.flotilla.crafts.filter((c) => c.placed).length),
  ).toBe(4);
  expect(errors).toEqual([]);
});

test('the Boats card: the kid puts a friend on a boat, the two swap, and it is kept', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    isle7Seen: true,
    isle7Stage: 4,
    soulArmour: true,
    isle8Seen: true,
    heronStage: 2,
    heronFled: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => document.getElementById('boatsBtn')?.hidden === false, null, {
    timeout: 3000,
  });
  await page.locator('#boatsBtn').dispatchEvent('click');
  await expect(page.locator('#boats')).toBeVisible();
  // Four boats, each offering the four friends and Nobody; the warrior has the airboat to start.
  await expect(page.locator('#boatsList .boat')).toHaveCount(4);
  await expect(page.locator('#boatsList .rchip.on[data-craft="airboat"]')).toHaveText('Warrior');
  // The tarling onto the airboat: the warrior takes his banana boat.
  await page.locator('#boatsList [data-craft="airboat"][data-rider="tarling"]').click();
  await expect(page.locator('#boatsList .rchip.on[data-craft="airboat"]')).toHaveText('Tarling');
  await expect(page.locator('#boatsList .rchip.on[data-craft="banana"]')).toHaveText('Warrior');
  // Nobody on the catamaran: the necromancer goes back to the deck.
  await page.locator('#boatsList [data-craft="catamaran"][data-rider=""]').click();
  expect(await page.evaluate(() => window.__np.flotilla.crew)).toEqual({
    airboat: 'tarling',
    catamaran: null,
    windsurf: 'bones',
    banana: 'warrior',
    swan: 'caterman',
    swan2: null,
  });
  await page.locator('#boatsClose').click();
  await expect(page.locator('#boats')).toBeHidden();
  // Kept: a reload finds the same crew, and the airboat towing the banana.
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  expect(await page.evaluate(() => window.__np.flotilla.crew.airboat)).toBe('tarling');
  await page.waitForFunction(
    () => window.__np.flotilla.crafts.find((c) => c.kind === 'banana')?.tow,
    null,
    {
      timeout: 3000,
    },
  );
  expect(errors).toEqual([]);
});

test('tower: in at the door, up both floors, beat the sorcerer, and the tower is taken', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -600 + 330 * Math.SQRT1_2,
      y: 5400 - 330 * Math.SQRT1_2,
      h: 2.36,
      clock: 0.3,
      hold: [],
    },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // To the tower's door.
  await page.evaluate(() => {
    window.__np.walker.x = -590 + 46 * Math.SQRT1_2;
    window.__np.walker.y = 5410 + 46 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower');
  await expect(page.locator('#order')).toBeVisible();
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 0);
  // Inside, the boat's bubbles are put away; the hearts stay.
  for (const id of ['#order', '#holdPill', '#hull', '#wood'])
    await expect(page.locator(id)).toBeHidden();
  await expect(page.locator('#hearts')).toBeVisible();
  for (const f of [0, 1]) {
    // Beat the floor, step onto its stairs, climb.
    await page.evaluate((i) => {
      const fl = window.__np.floors[i];
      if (!fl) return;
      for (const m of fl.list) fl.hit(m, 9, m.x + 50, m.y);
      window.__np.walker.x = -6000 - 130 * 0.6 * Math.SQRT1_2;
      window.__np.walker.y = (i ? -6900 : -6000) - 130 * 0.6 * Math.SQRT1_2;
    }, f);
    await expect(page.locator('#climb')).toBeVisible();
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, f + 1);
  }
  await page.waitForFunction(() => window.__np.boss.up, null, { timeout: 3000 });
  await page.evaluate(() => window.__np.boss.hit(99));
  await page.waitForFunction(() => window.__np.towerTaken, null, { timeout: 4000 });
  await expect(page.locator('#leave')).toHaveText('Back to the boat');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.walker.state === 'aboard');
  await expect(page.locator('#order')).toBeVisible();
  await expect(page.locator('#holdPill')).toBeVisible();
  expect(errors).toEqual([]);
});

test('island 3 tower: up the sunken tower, beat the sorcerer again, and find the scuba gear', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -600 + 322, y: -600 + 154, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // Across the planks and the seaweed to the door.
  await page.evaluate(() => {
    window.__np.walker.x = -600 + 52 * Math.SQRT1_2;
    window.__np.walker.y = -600 + 52 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 3);
  for (const f of [3, 4]) {
    await page.evaluate((i) => {
      const fl = window.__np.floors[i];
      if (!fl) return;
      for (const m of fl.list) fl.hit(m, 9, m.x + 50, m.y);
      window.__np.walker.x = -7500 - 130 * 0.6 * Math.SQRT1_2;
      window.__np.walker.y = (i === 4 ? -6900 : -6000) - 130 * 0.6 * Math.SQRT1_2;
    }, f);
    await expect(page.locator('#climb')).toBeVisible();
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, f + 1);
  }
  await page.waitForFunction(() => window.__np.boss3.up, null, { timeout: 3000 });
  await page.evaluate(() => window.__np.boss3.hit(99));
  await page.waitForFunction(() => window.__np.isle3Stage === 1, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('scuba gear');
  await expect(page.locator('#leave')).toHaveText('Back to the boat');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.walker.state === 'aboard');
  expect(errors).toEqual([]);
});

test('the dive: down to the swordsman, into the demon dimension, and the warlock freed', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -600 + 322, y: -600 + 154, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // To the gap in the seaweed, round from the door.
  await page.evaluate(() => {
    window.__np.walker.x = -600 - 56 * Math.SQRT1_2;
    window.__np.walker.y = -600 + 56 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Dive');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 6);
  await expect(page.locator('#leave')).toHaveText('Swim up');
  await page.waitForFunction(() => window.__np.swordsman.up, null, { timeout: 3000 });
  // His one block, then the rest.
  expect(await page.evaluate(() => window.__np.swordsman.hit(2))).toBe(true);
  await page.evaluate(() => window.__np.swordsman.hit(99));
  await page.waitForFunction(() => window.__np.isle3Stage === 2, null, { timeout: 4000 });
  // He heals you, and the floor opens into the demon dimension.
  await page.waitForFunction(() => window.__np.floor === 7, null, { timeout: 6000 });
  await page.waitForFunction(() => window.__np.demons.every((d) => d.up), null, { timeout: 3000 });
  await page.evaluate(() => {
    for (const d of window.__np.demons) {
      d.hit(9);
      d.hit(9);
    }
  });
  await page.waitForFunction(() => window.__np.isle3Stage === 3, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('warlock is free');
  await expect(page.locator('#leave')).toHaveText('Back to the boat');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.walker.state === 'aboard');
  expect(errors).toEqual([]);
});

test('the warlock: freed, he comes ashore with the figure and casts at the monkeys', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 3,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -600 + 330 * Math.SQRT1_2,
      y: 5400 - 330 * Math.SQRT1_2,
      h: 2.36,
      clock: 0.3,
      hold: [],
    },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForFunction(() => window.__np.warlock.shown, null, { timeout: 2000 });
  const d = await page.evaluate(() => {
    const { walker, warlock } = window.__np;
    return Math.hypot(walker.x - warlock.x, walker.y - warlock.y);
  });
  expect(d, 'the warlock is not beside the figure').toBeLessThan(40);
  // His three hearts show beside the figure's.
  await expect(page.locator('#hearts svg')).toHaveCount(6);
  // Into the monkey camp: he casts at them.
  await page.evaluate(() => {
    window.__np.walker.x = -600 - 115 + 60;
    window.__np.walker.y = 5400 + 105 - 30;
  });
  await page.waitForFunction(() => window.__np.warlock.bolts.length > 0, null, { timeout: 6000 });
  expect(errors).toEqual([]);
});

test("the warlock's boat: it sails beside yours and catches fish for you", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 3,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400 + 900, y: 2400 + 900, h: 0, clock: 0.3, hold: [] },
  });
  // Lie still with his station right on a school of sardines: your net catches nothing standing still.
  await page.evaluate(() => {
    const np = window.__np;
    const sc = np.schools[0];
    if (!sc) throw new Error('no schools');
    np.boat.x = sc.cx + 70 * 1.6;
    np.boat.y = sc.cy - 62 * 1.6;
    np.boat.h = 0;
    np.boat.v = 0;
  });
  await page.waitForFunction(() => window.__np.wboat.free, null, { timeout: 3000 });
  await page.waitForFunction(() => window.__np.wboat.catches > 0, null, { timeout: 8000 });
  expect(await page.evaluate(() => window.__np.hold)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('the cutscene: back aboard with the warlock free, island 4 turns to tar, and a tap skips it', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 3,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400 + 900, y: 2400 + 900, h: 0, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.cine !== null, null, { timeout: 5000 });
  // A tap at once does not skip it: it may be one still steering the boat as it began.
  await tap(page, 200, 400);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__np.cine?.kind)).toBe('tar');
  // A tap once it has been on a moment skips to the end.
  await page.waitForTimeout(1100);
  await tap(page, 200, 400);
  await page.waitForFunction(() => window.__np.isle3Stage === 4, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('turned to tar');
  // No boat goes into the black water.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 5400 - 200;
    b.y = 5400 - 200;
  });
  await page.waitForTimeout(200);
  const d = await page.evaluate(() =>
    Math.hypot(window.__np.boat.x - 5400, window.__np.boat.y - 5400),
  );
  expect(d).toBeGreaterThan(200 + 240);
  expect(errors).toEqual([]);
});

test('the chemistry suit: from the shipwright, then into the tar off the bow, swimming', async ({
  context,
  page,
}) => {
  const a = (-3 * Math.PI) / 4 + 0.55;
  const r = 440 + 24 * 1.6 + 25;
  const errors = await boot(context, page, {
    muted: true,
    coins: 9000,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: 5400 + Math.cos(a) * r,
      y: 5400 + Math.sin(a) * r,
      h: a + Math.PI,
      clock: 0.3,
      hold: [],
    },
  });
  // Without the suit, no way in.
  await page.waitForTimeout(800);
  await expect(page.locator('#climb')).toBeHidden();
  // The shipwright has it now the tar has been seen; buy it as if from the shop.
  await page.evaluate(() => {
    window.__np.gear.suit = true;
  });
  await expect(page.locator('#climb')).toHaveText('Into the tar');
  await page.locator('#climb').click();
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForFunction(() => window.__np.walker.sink > 10, null, { timeout: 3000 });
  // The boat waits outside the black water.
  const d = await page.evaluate(() =>
    Math.hypot(window.__np.boat.x - 5400, window.__np.boat.y - 5400),
  );
  expect(d).toBeGreaterThan(440);
  expect(errors).toEqual([]);
});

test('the Tar Anchorer: it rises when the figure reaches the sand, and beaten, leaves a tarling', async ({
  context,
  page,
}) => {
  const a = (-3 * Math.PI) / 4 + 0.55;
  const r = 440 + 24 * 1.6 + 25;
  const errors = await boot(context, page, {
    muted: true,
    coins: 9000,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    spear: 3,
    gear: { mesh: false, strongbox: false, suit: true },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: 5400 + Math.cos(a) * r,
      y: 5400 + Math.sin(a) * r,
      h: a + Math.PI,
      clock: 0.3,
      hold: [],
    },
  });
  await expect(page.locator('#climb')).toHaveText('Into the tar');
  await page.locator('#climb').click();
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.anchorer.state)).toBe('lurk');
  // Onto the sand: it wakes.
  await page.evaluate(() => {
    const w = window.__np.walker;
    w.x = 5400 - 95;
    w.y = 5400 - 75;
  });
  await page.waitForFunction(() => window.__np.anchorer.up, null, { timeout: 2000 });
  await expect(page.locator('#toast')).toContainText('Tar Anchorer');
  // The spear reaches it.
  await expect(page.locator('#throw')).toBeVisible({ timeout: 4000 });
  await page.evaluate(() => window.__np.anchorer.hit(200));
  await page.waitForFunction(() => window.__np.isle4Stage === 1, null, { timeout: 4000 });
  // The far deep opening is said, the first time.
  await expect(page.locator('#toast')).toContainText('far deep is open');
  await page.waitForFunction(() => window.__np.tarling.with, null, { timeout: 2000 });
  // Back aboard, it rides along.
  await page.evaluate(() => {
    const w = window.__np.walker;
    w.x = w.dock.landing.x;
    w.y = w.dock.landing.y;
  });
  expect(await page.evaluate(() => window.__np.tarling.free)).toBe(true);
  expect(errors).toEqual([]);
});

test('the far deep: an anchor chain holds the far buoys until the Tar Anchorer is beaten', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    // Along the deep's end well away from island 5, whose sighting would clear the toasts.
    trip: { x: -1000, y: 700, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__np.boat.x = -1500;
  });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__np.boat.x)).toBeGreaterThan(-1200);
  await expect(page.locator('#toast')).toContainText('anchor chain', { timeout: 9000 });
  // Beaten, the chain sinks and the far deep opens.
  await page.evaluate(() => {
    window.__np.isle4Stage = 1;
    window.__np.boat.x = -1500;
  });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__np.boat.x)).toBeLessThan(-1400);
  await expect(page.locator('#toast')).toContainText('far deep', { timeout: 9000 });
  expect(errors).toEqual([]);
});

test('island 5: out in the far deep, a reef of bones is found and logged', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    // Inside sighting distance but short of where the King wakes.
    trip: { x: -1260, y: 2400, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.isle5Seen, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('bones', { timeout: 9000 });
  // No hull runs onto it.
  await page.evaluate(() => {
    window.__np.boat.x = -2100 + 60;
    window.__np.boat.y = 2400;
  });
  await page.waitForTimeout(200);
  const d = await page.evaluate(() =>
    Math.hypot(window.__np.boat.x + 2100, window.__np.boat.y - 2400),
  );
  expect(d).toBeGreaterThan(185);
  expect(errors).toEqual([]);
});

test('the Skeleton Shark King: he rises at the reef, and harpooned down, dies with his secret', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -1500, y: 2400, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.king.fighting, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('Skeleton Shark King');
  // A harpoon fired while he is up counts, though he has gone back under by the time it lands.
  const fired = await page.waitForFunction(
    () => {
      const np = window.__np;
      if (np.harpoonTarget !== 'king') return false;
      const r = np.king.resolve;
      np.fireHarpoon();
      np.king.state = 'dive';
      np.king.t = 0;
      return r;
    },
    null,
    { timeout: 30000, polling: 50 },
  );
  const r0 = Number(await fired.jsonValue());
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.__np.king.resolve)).toBe(r0 - 1);
  // Nearly beaten; then the harpoon, whenever he is up and in reach.
  await page.evaluate(() => {
    window.__np.king.resolve = 1;
  });
  await page.waitForFunction(
    () => {
      window.__np.fireHarpoon();
      return window.__np.king.state === 'dying';
    },
    null,
    { timeout: 30000, polling: 100 },
  );
  // A tap skips his speech, once it has been on a moment.
  await page.waitForTimeout(1300);
  await tap(page, 200, 400);
  await page.waitForFunction(() => window.__np.isle5Stage === 1, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('portal', { timeout: 6000 });
  expect(errors).toEqual([]);
});

test('the Reaper: he hunts a boat out in the deep, sweeps, rears, and harpooned off leaves his ice fishing kit', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 5500, h: Math.PI, clock: 0.3, hold: [] },
  });
  // Out in the deep south of home, by day, away from the gulper and the anglerfish; he swims up from the south.
  await page.evaluate(() => {
    window.__np.reaper.x = 2400;
    window.__np.reaper.y = 5900;
  });
  await page.waitForFunction(() => window.__np.reaper.hunting, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('Reaper');
  expect(await page.evaluate(() => window.__np.reaperSeen)).toBe(true);
  // Nearly beaten; then the harpoon, whenever he is reared up and in reach.
  await page.evaluate(() => {
    window.__np.reaper.resolve = 1;
  });
  await page.waitForFunction(
    () => {
      window.__np.fireHarpoon();
      return window.__np.reaper.state === 'away';
    },
    null,
    { timeout: 30000, polling: 100 },
  );
  await expect(page.locator('#toast')).toContainText('ice fishing kit', { timeout: 9000 });
  expect(await page.evaluate(() => window.__np.driven.reaper)).toBe(1);
  expect(errors).toEqual([]);
});

test("ice fishing: alongside the floe with the Reaper's kit, drop the line and land what it hooks", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    spear: 4,
    driven: { reaper: 1 },
    reaperSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -2244 + 340 * Math.SQRT1_2,
      y: -2244 + 340 * Math.SQRT1_2,
      h: 3.9,
      clock: 0.3,
      hold: [],
    },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#iceBtn')).toBeVisible({ timeout: 4000 });
  expect(await page.evaluate(() => window.__np.iceSeen)).toBe(true);
  await page.click('#iceBtn');
  await page.waitForFunction(() => window.__np.icing, null, { timeout: 2000 });
  await page.click('#iceDrop');
  // Down to the floor, and on the way up a char swims into the hook.
  await page.waitForFunction(() => window.__np.iceRun?.phase === 'reel', null, { timeout: 8000 });
  await page.evaluate(() => {
    const r = window.__np.iceRun;
    const f = r?.pool.find((f) => f.kind === 'char' && !f.caught && !f.on);
    if (r && f) {
      f.vx = 0;
      f.x = r.x;
      f.y = 300;
    }
  });
  await page.waitForFunction(() => window.__np.iceRun?.phase === 'done', null, { timeout: 12000 });
  expect(await page.evaluate(() => window.__np.iceRuns)).toBe(1);
  expect(await page.evaluate(() => window.__np.hold)).toBeGreaterThanOrEqual(1);
  await expect(page.locator('#toast')).toContainText('arctic char');
  await page.click('#iceLeave');
  await page.waitForFunction(() => !window.__np.icing, null, { timeout: 2000 });
  expect(errors).toEqual([]);
});

test('ice fishing: without the kit there is no fishing the floe, and the game says who has one', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -2244 + 340 * Math.SQRT1_2,
      y: -2244 + 340 * Math.SQRT1_2,
      h: 3.9,
      clock: 0.3,
      hold: [],
    },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#toast')).toContainText('Reaper', { timeout: 4000 });
  await expect(page.locator('#iceBtn')).toBeHidden();
  expect(errors).toEqual([]);
});

test('Neil: three ice fish tossed to the seal at the floe make him yours, and he swims along with the boat', async ({
  context,
  page,
}) => {
  const hold = new Array(23).fill(0);
  hold[20] = 3;
  const a = 0.5;
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    iceSeen: true,
    driven: { reaper: 1 },
    reaperSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -2244 + Math.cos(a) * 316,
      y: -2244 + Math.sin(a) * 316,
      h: a + Math.PI / 2,
      clock: 0.3,
      hold,
    },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#toast')).toContainText('looks like a Neil', { timeout: 4000 });
  // A tap on him, three times: each tosses him a polar cod from the hold.
  for (let i = 1; i <= 3; i++) {
    const at = await page.evaluate(() => window.__np.neilAt);
    expect(at, 'Neil is not on the screen').not.toBeNull();
    await tap(page, at?.[0] ?? 0, at?.[1] ?? 0);
    await page.waitForFunction((n) => window.__np.neil.fed === n, i, { timeout: 2000 });
  }
  expect(await page.evaluate(() => [window.__np.neil.free, window.__np.hold])).toEqual([true, 0]);
  await expect(page.locator('#toast')).toContainText('his name is Neil');
  // Off the ice and into the water by the boat; under way he keeps up.
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await page.waitForFunction(() => window.__np.neil.state === 'swim', null, { timeout: 3000 });
  await page.waitForTimeout(1500);
  const d = await page.evaluate(() => {
    const { boat, neil } = window.__np as unknown as {
      boat: { x: number; y: number };
      neil: { x: number; y: number };
    };
    return Math.hypot(neil.x - boat.x, neil.y - boat.y);
  });
  expect(d).toBeLessThan(80);
  expect(errors).toEqual([]);
});

test('Neil ice fishing: he sits by the hole, goes in after a fish, and it goes in the hold', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    iceSeen: true,
    neilFed: 3,
    driven: { reaper: 1 },
    reaperSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -2244 + 340 * Math.SQRT1_2,
      y: -2244 + 340 * Math.SQRT1_2,
      h: 3.9,
      clock: 0.3,
      hold: [],
    },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#iceBtn')).toBeVisible({ timeout: 4000 });
  await page.click('#iceBtn');
  await page.waitForFunction(() => window.__np.icing, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.iceSeal?.phase)).toBe('sit');
  // He goes in after one (the game sends him now and then; here, at once).
  expect(
    await page.evaluate(() => {
      const np = window.__np;
      return np.iceSeal?.dive(np.iceRun?.pool ?? []) ?? false;
    }),
  ).toBe(true);
  await page.waitForFunction(() => window.__np.hold >= 1, null, { timeout: 15000 });
  await expect(page.locator('#toast')).toContainText('Neil caught');
  expect(await page.evaluate(() => window.__np.iceSeal?.phase)).toBe('sit');
  await page.click('#iceLeave');
  await page.waitForFunction(() => !window.__np.icing, null, { timeout: 2000 });
  expect(errors).toEqual([]);
});

test('under the ice without the white suit: a dive through the hole gets too cold, and the rope pulls you back up', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    iceSeen: true,
    driven: { reaper: 1 },
    reaperSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -2244 + 340 * Math.SQRT1_2,
      y: -2244 + 340 * Math.SQRT1_2,
      h: 3.9,
      clock: 0.3,
      hold: [],
    },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  const btn = page.locator('#diveBtn');
  await expect(btn).toHaveText('Dive under the ice', { timeout: 4000 });
  await btn.click();
  await page.waitForFunction(() => window.__np.diving, null, { timeout: 2000 });
  await expect(page.locator('#toast')).toContainText('freezing');
  expect(await page.evaluate(() => window.__np.diver.chill)).toBeGreaterThan(0);
  // Down under the ice, all but too cold: it tips over, and the rope pulls the diver back up the hole.
  await page.evaluate(() => {
    const d = window.__np.diver;
    d.x = 200;
    d.y = 300;
    d.cold = 0.97;
  });
  await expect(page.locator('#toast')).toContainText('Too cold', { timeout: 3000 });
  await page.waitForFunction(() => !window.__np.diving, null, { timeout: 6000 });
  await expect(page.locator('#toast')).toContainText('Up through the hole');
  expect(errors).toEqual([]);
});

test('under the ice in the white suit: warm, and a thing frozen in the ice is chipped out for coins', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    coins: 0,
    gear: { white: true },
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    iceSeen: true,
    driven: { reaper: 1 },
    reaperSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -2244 + 340 * Math.SQRT1_2,
      y: -2244 + 340 * Math.SQRT1_2,
      h: 3.9,
      clock: 0.3,
      hold: [],
    },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#diveBtn')).toHaveText('Dive under the ice', { timeout: 4000 });
  await page.click('#diveBtn');
  await page.waitForFunction(() => window.__np.diving, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.diver.chill)).toBe(0);
  // Just under the explorer's spyglass, frozen in the ice by the hole.
  await page.evaluate(() => {
    const d = window.__np.diver;
    d.x = 345;
    d.y = 50;
  });
  await page.waitForFunction(() => window.__np.iceLoot === 1, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(200);
  await expect(page.locator('#toast')).toContainText('out of the ice');
  await page.click('#surfaceBtn');
  await page.waitForFunction(() => !window.__np.diving, null, { timeout: 6000 });
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').iceLoot),
  ).toBe(1);
  expect(errors).toEqual([]);
});

test('the igloo: built from the boat alongside the floe, a bed till morning, and a home port', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 2000,
    wood: 40,
    day: 3,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    iceSeen: true,
    driven: { reaper: 1 },
    reaperSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -2244 + 340 * Math.SQRT1_2,
      y: -2244 + 340 * Math.SQRT1_2,
      h: 3.9,
      clock: 0.3,
      hold: [],
    },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  const btn = page.locator('#iglooBtn');
  await expect(btn).toHaveText('Build an igloo', { timeout: 4000 });
  await btn.click();
  await expect(btn).toHaveText('Sleep till morning');
  expect(await page.evaluate(() => [window.__np.coins, window.__np.bases.floe])).toEqual([500, 1]);
  await expect(page.locator('#toast')).toContainText('Built an igloo');
  // A night in it: the next morning.
  await btn.click();
  await page.waitForFunction(() => window.__np.day === 4, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.phase)).toBe('Dawn');
  await expect(page.locator('#toast')).toContainText('A night in the igloo');
  // Not again while it is morning.
  await expect(btn).toBeHidden();
  // Lost out by the floe, the boat comes back up off it.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = -2244 + 600;
    b.y = -2244 + 200;
    b.v = 0;
  });
  await page.evaluate(() => window.__np.swallow('log'));
  await page.waitForFunction(() => !window.__np.swallowing, null, { timeout: 4000 });
  const [at, spit] = await page.evaluate(() => [
    [window.__np.boat.x, window.__np.boat.y],
    window.__np.FLOE_BASE.spit,
  ]);
  expect(Math.hypot((at?.[0] ?? 0) - (spit?.x ?? 0), (at?.[1] ?? 0) - (spit?.y ?? 0))).toBeLessThan(
    40,
  );
  await expect(page.locator('#toast')).toContainText('your igloo on the ice floe');
  expect(errors).toEqual([]);
});

test('island 6: dock at the big island, step ashore, and find a treasure chest', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 100,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: -1150, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.isle6Seen, null, { timeout: 4000 });
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 2400;
    b.y = -1320;
    b.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.locator('#ashore').click();
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 5000 });
  // Straight to the first chest.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const [x, y] = window.__np.CHESTS6[0] as [number, number];
    w.x = x + 10;
    w.y = y + 10;
  });
  await page.waitForFunction(() => window.__np.chests6 > 0, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.coins)).toBeGreaterThanOrEqual(400);
  expect(errors).toEqual([]);
});

test('the Reaper on land: he wakes by his nest on island 6, and beaten, his egg is yours and rides aboard', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 100,
    spear: 3,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: -1320, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 2400;
    b.y = -1320;
    b.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.locator('#ashore').click();
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__np.landReaper.state)).toBe('sleep');
  // Up the beach toward his cove: sighted asleep first, then he wakes.
  await page.evaluate(() => {
    const { walker: w, NEST6: n } = window.__np;
    w.x = n.x + 200;
    w.y = n.y + 180;
  });
  await page.waitForFunction(() => window.__np.reaperLandSeen, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.landReaper.state)).toBe('sleep');
  await page.evaluate(() => {
    const { walker: w, NEST6: n } = window.__np;
    w.x = n.x + 110;
    w.y = n.y + 90;
  });
  await page.waitForFunction(() => window.__np.landReaper.awake, null, { timeout: 3000 });
  await expect(page.locator('#hearts')).toBeVisible();
  // His scales turn a spear until he rears up; then the throw button shows.
  expect(await page.evaluate(() => window.__np.landReaper.hit(2))).toBe(false);
  await page.waitForFunction(() => window.__np.landReaper.open, null, { timeout: 20000 });
  await expect(page.locator('#throw')).toBeVisible({ timeout: 2000 });
  // Beat him: he backs off into the sea, and the egg waits in his nest.
  await page.evaluate(() => window.__np.landReaper.hit(99, true));
  await page.waitForFunction(() => window.__np.reaperEgg === 1, null, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.coins)).toBeGreaterThanOrEqual(1100);
  await page.evaluate(() => {
    const { walker: w, NEST6: n } = window.__np;
    w.x = n.x + 6;
    w.y = n.y + 6;
  });
  await page.waitForFunction(() => window.__np.reaperEgg === 2, null, { timeout: 3000 });
  // It is kept, and he stays beaten.
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => [window.__np.reaperEgg, window.__np.landReaper.state])).toEqual([
    2,
    'gone',
  ]);
  expect(errors).toEqual([]);
});

test('island 7: sight it, run up on its sand, and the monkeys come for you', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 5950, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.isle7Seen, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('Island 7', { timeout: 3000 });
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 2400;
    b.y = 6500;
    b.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.locator('#ashore').click();
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 5000 });
  await expect(page.locator('#hearts')).toBeVisible();
  // Over to the camp on the far side.
  await page.evaluate(() => {
    const w = window.__np.walker;
    w.x = 2400 - 70 + 60;
    w.y = 6900 + 170 - 70;
  });
  await page.waitForFunction(
    () => window.__np.monkeys7.list.some((m) => m.state === 'chase'),
    null,
    { timeout: 4000 },
  );
  expect(errors).toEqual([]);
});

test("island 7's tower: up two floors of monkeys, the sorcerer a third time, and the portal wakes", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    isle7Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 52 * Math.SQRT1_2;
    window.__np.walker.y = 6900 + 52 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 9);
  for (const f of [9, 10]) {
    await page.evaluate((i) => {
      const fl = window.__np.floors[i];
      if (!fl) return;
      for (const m of fl.list) fl.hit(m, 9, m.x + 50, m.y);
      window.__np.walker.x = -12000 - 130 * 0.6 * Math.SQRT1_2;
      window.__np.walker.y = (i === 10 ? -6900 : -6000) - 130 * 0.6 * Math.SQRT1_2;
    }, f);
    await expect(page.locator('#climb')).toBeVisible();
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, f + 1);
  }
  await page.waitForFunction(() => window.__np.boss7.up, null, { timeout: 3000 });
  // Hurt to half, it calls monkeys up onto the roof.
  await page.evaluate(() => window.__np.boss7.hit(window.__np.boss7.hp / 2));
  await page.waitForFunction(() => window.__np.roofMonkeys.list.length >= 2, null, {
    timeout: 3000,
  });
  await page.evaluate(() => window.__np.boss7.hit(99));
  await page.waitForFunction(() => window.__np.isle7Stage === 1, null, { timeout: 4000 });
  await expect(page.locator('#leave')).toHaveText('Down to the portal');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.floor === -1 && window.__np.portalOpen >= 1, null, {
    timeout: 5000,
  });
  // Into the ring, and it is the way through.
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await expect(page.locator('#climb')).toHaveText('Into the portal', { timeout: 3000 });
  expect(errors).toEqual([]);
});

test("islands 8 and 9: sight the twins, tie up at island 8, walk the sandbar, and island 9's tower is barred", async ({
  context,
  page,
}) => {
  // A flagship out in the far deep, west of island 8's dock, sailing for it.
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 6300, y: 2070, h: 0, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.isle8Seen, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('Islands 8 and 9');
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // Over the sandbar to island 9, and up to its tower's door.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const B = window.__np.BAR;
    w.x = (B.x0 + B.x1) / 2;
    w.y = (B.y0 + B.y1) / 2;
  });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__np.walker.state)).toBe('ashore');
  // The Heron's hired men camp by that door; this is about the door, so they are away.
  await page.evaluate(() => {
    for (const m of window.__np.hired9.list) {
      m.state = 'gone';
      m.back = 999;
    }
    const w = window.__np.walker;
    const D = window.__np.DOOR9;
    w.x = D.x + 4;
    w.y = D.y + 4;
  });
  // After the landing's own message, which is still up.
  await expect(page.locator('#toast')).toContainText('Barred', { timeout: 9000 });
  await expect(page.locator('#log')).toContainText('Islands 8 and 9 found');
  expect(errors).toEqual([]);
});

test('island 10: sight it in the far corner, tie up at its pier, and walk onto the prairie', async ({
  context,
  page,
}) => {
  // A flagship out in the far deep, south of island 10's pier, sailing for it.
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1250, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.isle10Seen, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('Island 10');
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  const y0 = await page.evaluate(() => window.__np.walker.y);
  // Up the pier (north, -y) and onto the prairie.
  const sx = 1;
  const sy = -0.5;
  const n = Math.hypot(sx, sy);
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  await page.mouse.move(CX + (sx / n) * 60, CY + (sy / n) * 60, { steps: 3 });
  await page.waitForTimeout(2600);
  await page.mouse.up();
  const y1 = await page.evaluate(() => window.__np.walker.y);
  expect(y0 - y1, 'did not walk up the pier onto the island').toBeGreaterThan(150);
  expect(await page.evaluate(() => window.__np.walker.state)).toBe('ashore');
  await expect(page.locator('#log')).toContainText('Island 10 found');
  expect(errors).toEqual([]);
});

test("island 10's prairie: prairie dogs duck as you come, bunnies hop when tapped, and a herd of bison grazes", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForTimeout(1200);
  const herd = await page.evaluate(() => window.__np.prairie10.bison.length);
  expect(herd).toBeGreaterThanOrEqual(4);
  // A prairie dog town, from off its edge: all up. A tap on one and it ducks.
  const put = (x: number, y: number) =>
    page.evaluate(
      (p) => {
        window.__np.walker.x = p.x;
        window.__np.walker.y = p.y;
      },
      { x, y },
    );
  const d0 = await page.evaluate(() => {
    const d = window.__np.prairie10.dogs[0];
    return d ? [d.x, d.y, d.town] : [0, 0, 0];
  });
  await put((d0[0] ?? 0) + 110, (d0[1] ?? 0) + 110);
  await page.waitForTimeout(1500);
  const town = (n: number) =>
    page.evaluate(
      (n) => window.__np.prairie10.dogs.filter((d) => d.town === n).map((d) => d.up),
      n,
    );
  expect(await town(d0[2] ?? 0)).toEqual([1, 1, 1]);
  const at = await page.evaluate(() => window.__np.prairieAt('dog', 0));
  if (!at) throw new Error('no dog on the screen');
  await tap(page, at[0], at[1]);
  await page.waitForFunction(() => (window.__np.prairie10.dogs[0]?.up ?? 1) === 0, null, {
    timeout: 1500,
  });
  // Walk right up to the town: every dog in it goes down its hole.
  await put((d0[0] ?? 0) + 30, (d0[1] ?? 0) + 30);
  await page.waitForTimeout(500);
  expect(Math.max(...(await town(d0[2] ?? 0)))).toBe(0);
  // A bunny, tapped, hops.
  const b = await page.evaluate(() => {
    const b = window.__np.prairie10.bunnies[4];
    return b ? [b.x, b.y] : [0, 0];
  });
  await put((b[0] ?? 0) + 100, (b[1] ?? 0) + 100);
  await page.waitForTimeout(1500);
  // Sat still for the tap: one mid-hop or mid-frolic rightly ignores it, and could land before the look.
  await page.evaluate(() => {
    const p = window.__np.prairie10;
    if (p.play && (p.play.i === 4 || p.play.i + 1 === 4)) p.play.t = 0;
  });
  await page.waitForFunction(() => {
    const p = window.__np.prairie10;
    const b = p.bunnies[4];
    if (b?.hop !== 0 || (p.play && (p.play.i === 4 || p.play.i + 1 === 4))) return false;
    b.wait = 10;
    return true;
  });
  const bat = await page.evaluate(() => window.__np.prairieAt('bunny', 4));
  if (!bat) throw new Error('no bunny on the screen');
  await tap(page, bat[0], bat[1]);
  expect(await page.evaluate(() => window.__np.prairie10.bunnies[4]?.hop ?? 0)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("island 10's pond: cast from its edge, too soon changes nothing, and reeled in when the float goes under, the fish is landed and sold", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForTimeout(1200);
  const cast = page.locator('#pondcast');
  await expect(cast).toBeHidden();
  // To the pond's edge: the cast shows.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.POND.x + (n.POND.r + 12) * 0.6;
    n.walker.y = n.POND.y + (n.POND.r + 12) * 0.8;
  });
  await expect(cast).toHaveText('Cast into the pond', { timeout: 3000 });
  const coins = await page.evaluate(() => window.__np.coins);
  await cast.dispatchEvent('click');
  expect(await page.evaluate(() => window.__np.pondLine.state)).toBe('wait');
  // Too soon: nothing changes, and the game says to wait.
  await cast.dispatchEvent('click');
  expect(await page.evaluate(() => window.__np.pondLine.state)).toBe('wait');
  await expect(page.locator('#toast')).toContainText('Wait for the float');
  // The float goes under: reel in, and the fish is landed, and sold at the crates since the boat is tied up.
  await page.waitForFunction(() => window.__np.pondLine.state === 'bite', null, { timeout: 9000 });
  await expect(cast).toHaveText('Reel in!');
  const sp = await page.evaluate(() => window.__np.pondLine.sp);
  await cast.dispatchEvent('click');
  expect(await page.evaluate(() => window.__np.pondLine.state)).toBe('idle');
  expect(await page.evaluate((sp) => window.__np.first[sp], sp)).toBeGreaterThan(0);
  await expect(page.locator('#toast')).toContainText('Four kinds of fish');
  await page.waitForFunction((c) => window.__np.coins > c, coins, { timeout: 3000 });
  // Cast again and walk off: the line comes in and the button goes.
  await cast.dispatchEvent('click');
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.POND.x + 200;
    n.walker.y = n.POND.y + 160;
  });
  await expect(cast).toBeHidden({ timeout: 3000 });
  expect(await page.evaluate(() => window.__np.pondLine.state)).toBe('idle');
  expect(errors).toEqual([]);
});

test("island 10's old man: a dad joke and his store; snacks bought, kept, and eaten ashore for speed, strength and hearts", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 200,
    spear: 2,
    isle4Stage: 1,
    isle10Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForTimeout(1200);
  // Too far off: walk up to him.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.OLDMAN10.x + 140;
    n.walker.y = n.OLDMAN10.y + 100;
  });
  await page.waitForTimeout(800);
  let at = await page.evaluate(() => window.__np.oldManAt);
  await tap(page, at[0], at[1]);
  await expect(page.locator('#toast')).toContainText('Walk up to the old man');
  expect(await page.evaluate(() => window.__np.storeOpen)).toBe(false);
  // Up on his porch: a joke, and his shelf.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.OLDMAN10.x + 30;
    n.walker.y = n.OLDMAN10.y + 24;
  });
  await page.waitForTimeout(800);
  at = await page.evaluate(() => window.__np.oldManAt);
  await tap(page, at[0], at[1]);
  await expect(page.locator('#store10')).toBeVisible();
  const joke = await page.evaluate(() => window.__np.DAD_JOKES[0] ?? '');
  await expect(page.locator('#store10Joke')).toContainText(joke);
  for (const k of ['apple', 'apple', 'carrot', 'banana'])
    await page.locator(`#store10Shelf [data-buy="${k}"]`).click();
  expect(await page.evaluate(() => [window.__np.coins, window.__np.snacks])).toEqual([
    200 - 25 * 2 - 40 - 30,
    { apple: 2, carrot: 1, banana: 1 },
  ]);
  await page.locator('#store10Close').click();
  await expect(page.locator('#store10')).toBeHidden();
  // The bag by the hearts. A banana with full hearts is kept; hurt, it gives two back.
  await expect(page.locator('#snackBanana')).toBeVisible();
  await page.click('#snackBanana');
  await expect(page.locator('#toast')).toContainText('Keep the banana');
  await page.evaluate(() => window.__np.setHearts(1));
  await page.click('#snackBanana');
  expect(await page.evaluate(() => [window.__np.hearts, window.__np.snacks.banana])).toEqual([
    3, 0,
  ]);
  // An apple: faster legs for a while; a carrot: a harder spear.
  await page.click('#snackApple');
  await page.click('#snackCarrot');
  expect(
    await page.evaluate(() => [
      window.__np.walker.speedK,
      window.__np.appleT > 25,
      window.__np.carrotT > 25,
    ]),
  ).toEqual([1.5, true, true]);
  await expect(page.locator('#snackApple')).toContainText('s');
  // What is left in the bag is kept on reload.
  await page.reload();
  await page.click('#go');
  expect(await page.evaluate(() => window.__np.snacks)).toEqual({ apple: 1, carrot: 0, banana: 0 });
  expect(errors).toEqual([]);
});

test("the Heron's hired boats go home once he is beaten for good", async ({ context, page }) => {
  // The same water as above, a flagship sitting in it, but the Heron beaten on island 9.
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    heronStage: 2,
    heronFled: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 6300, y: 2070, h: 0, clock: 0.3, hold: [] },
  });
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__np.hiredBoats.here)).toBe(false);
  expect(await page.evaluate(() => window.__np.hiredBoats.chasing)).toBe(false);
  expect(await page.evaluate(() => window.__np.hp)).toBe(100);
  expect(errors).toEqual([]);
});

test("the Heron's hired men: boats chase and ram at sea and the harpoon sinks one; ashore, a beaten man drops his pay", async ({
  context,
  page,
}) => {
  // Island 7's sorcerer beaten, so the Heron has hired them; a flagship with a harpoon off island 8.
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 6300, y: 2070, h: 0, clock: 0.3, hold: [] },
  });
  // One comes for the boat: a chase, and a ram that costs hull.
  await page.evaluate(() => {
    const b = window.__np.boat;
    const s = window.__np.hiredBoats.boats[0];
    if (!s) return;
    s.x = b.x + 220;
    s.y = b.y - 120;
  });
  await page.waitForFunction(() => window.__np.hiredBoats.chasing, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('hired boats');
  await page.waitForFunction(() => window.__np.hp < 100, null, { timeout: 6000 });
  // The harpoon aims at the nearest; enough hits sink it, for the bounty.
  const coins = await page.evaluate(() => window.__np.coins);
  await page.waitForFunction(() => window.__np.harpoonTarget === 'hired', null, { timeout: 3000 });
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.__np.fireHarpoon());
    await page.waitForTimeout(1300);
    if (await page.evaluate(() => window.__np.hiredBoats.boats.some((s) => s.state === 'sunk')))
      break;
  }
  expect(
    await page.evaluate(() => window.__np.hiredBoats.boats.some((s) => s.state === 'sunk')),
  ).toBe(true);
  expect(await page.evaluate(() => window.__np.coins)).toBeGreaterThan(coins);
  // Ashore on island 8, by their camp: a beaten man drops his pay.
  await page.evaluate(() => {
    for (const s of window.__np.hiredBoats.boats) s.state = 'sunk';
    const b = window.__np.boat;
    b.x = 6560;
    b.y = 2070;
    b.v = 0;
    b.h = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  const before = await page.evaluate(() => window.__np.coins);
  await page.evaluate(() => {
    const w = window.__np.walker;
    const c = window.__np.hired8;
    w.x = c.home.x - 70;
    w.y = c.home.y - 30;
    const m = c.list[0];
    if (m) c.hit(m, 9, w.x, w.y);
  });
  await page.waitForFunction((b) => window.__np.coins > b, before, { timeout: 2000 });
  await expect(page.locator('#hearts')).toBeVisible();
  expect(errors).toEqual([]);
});

test("the Heron: up island 8's tower past his hired men, and on the roof he splits into copies; beaten, he flies off", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    armour: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 6560, y: 2070, h: 0, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    for (const s of window.__np.hiredBoats.boats) s.state = 'sunk';
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // Island 8's camp is away; up to its tower's door, which is open now.
  await page.evaluate(() => {
    for (const m of window.__np.hired9.list) {
      m.state = 'gone';
      m.back = 999;
    }
    for (const m of window.__np.hired8.list as { state: string; back: number }[]) {
      m.state = 'gone';
      m.back = 999;
    }
    const w = window.__np.walker;
    const D = window.__np.DOOR8;
    w.x = D.x;
    w.y = D.y;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 17);
  await expect(page.locator('#toast')).toContainText('hold the floors', { timeout: 9000 });
  for (const f of [17, 18]) {
    await page.evaluate((i) => {
      const fl = window.__np.floors[i];
      if (!fl) return;
      for (const m of fl.list) fl.hit(m, 9, m.x + 50, m.y);
      window.__np.walker.x = -15000 - 130 * 0.6 * Math.SQRT1_2;
      window.__np.walker.y = (i === 18 ? -6900 : -6000) - 130 * 0.6 * Math.SQRT1_2;
    }, f);
    await expect(page.locator('#climb')).toBeVisible();
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, f + 1);
  }
  await page.waitForFunction(() => window.__np.heron.up, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('The Heron');
  // His staff: copies of him. A spear thrown pops one or hurts him. The tarling's tar holds him up now and then.
  await page.waitForFunction(() => window.__np.heron.copies.length >= 2, null, { timeout: 18000 });
  await expect(page.locator('#throw')).toBeVisible();
  await page.click('#throw');
  await page.waitForFunction(
    () => window.__np.heron.hp < 14 || window.__np.heron.copies.some((c) => c.pop > 0),
    null,
    { timeout: 3000 },
  );
  await page.evaluate(() => window.__np.heron.hit(99));
  await page.waitForFunction(() => window.__np.heronStage === 1, null, { timeout: 5000 });
  await expect(page.locator('#toast')).toContainText('island 9');
  await expect(page.locator('#leave')).toHaveText('Back to the boat');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.floor === -1, null, { timeout: 3000 });
  await expect(page.locator('#log')).toContainText('Heron driven off');
  expect(errors).toEqual([]);
});

test("the Heron's nest: up island 9's tower, the orb shields him until the necromancer's chain snaps, and he is beaten for good", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    armour: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    heronStage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 6560, y: 2070, h: 0, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    for (const s of window.__np.hiredBoats.boats) s.state = 'sunk';
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // Island 9's camp is away; up to the Heron's own door, open now he has fled to it.
  await page.evaluate(() => {
    for (const m of window.__np.hired9.list) {
      m.state = 'gone';
      m.back = 999;
    }
    const w = window.__np.walker;
    const D = window.__np.DOOR9;
    w.x = D.x;
    w.y = D.y;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 20);
  for (const f of [20, 21]) {
    await page.evaluate((i) => {
      const fl = window.__np.floors[i];
      if (!fl) return;
      for (const m of fl.list) fl.hit(m, 9, m.x + 50, m.y);
      window.__np.walker.x = -16500 - 130 * 0.6 * Math.SQRT1_2;
      window.__np.walker.y = (i === 21 ? -6900 : -6000) - 130 * 0.6 * Math.SQRT1_2;
    }, f);
    await expect(page.locator('#climb')).toBeVisible();
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, f + 1);
  }
  // The nest: the necromancer wakes, chained to the orb, and the Heron is shielded.
  await page.waitForFunction(() => window.__np.nest.up, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('orb of power');
  expect(await page.evaluate(() => window.__np.heron9.shielded)).toBe(true);
  const hp = await page.evaluate(() => window.__np.heron9.hp);
  await page.waitForFunction(() => window.__np.heron9.up, null, { timeout: 3000 });
  await page.evaluate(() => window.__np.heron9.hit(5));
  expect(await page.evaluate(() => window.__np.heron9.hp)).toBe(hp);
  // He raises a skeleton out of the sticks.
  await page.waitForFunction(() => window.__np.nestHorde.list.length >= 1, null, { timeout: 6000 });
  // Beaten, his chain snaps: the shield is down and what he raised falls.
  await page.evaluate(() => window.__np.nest.hit(99));
  await page.waitForFunction(() => !window.__np.heron9.shielded, null, { timeout: 2000 });
  await expect(page.locator('#toast')).toContainText('chain snaps');
  expect(
    await page.evaluate(() =>
      window.__np.nestHorde.list.every((u) => u.state === 'fall' || u.state === 'gone'),
    ),
  ).toBe(true);
  await page.evaluate(() => window.__np.heron9.hit(99));
  await page.waitForFunction(() => window.__np.heronStage === 2, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('hired boats sail home');
  // The necromancer is free, and comes with you.
  expect(await page.evaluate(() => window.__np.necroPal.shown)).toBe(true);
  await expect(page.locator('#leave')).toHaveText('Back to the boat');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.floor === -1, null, { timeout: 3000 });
  await expect(page.locator('#log')).toContainText('Heron beaten');
  // Back aboard, his escape: out over the sea he falls in, the Reaper comes for him, and a portal takes him away.
  await page.waitForFunction(() => window.__np.cine?.kind === 'heron', null, { timeout: 6000 });
  await expect(page.locator('body')).toHaveClass(/cine/);
  expect(await page.evaluate(() => window.__np.heronFled)).toBe(false);
  await page.waitForTimeout(1300);
  await tap(page, CX, CY);
  await page.waitForFunction(() => window.__np.cine === null, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.heronFled)).toBe(true);
  await expect(page.locator('#toast')).toContainText('portal of his own');
  await expect(page.locator('#log')).toContainText('fled by portal');
  // Once only: it does not come round again.
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => window.__np.cine)).toBeNull();
  expect(errors).toEqual([]);
});

test('the necromancer: with the Heron beaten for good he comes along, and in a fight raises his skeleton hamster', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    armour: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    heronStage: 2,
    heronFled: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 6560, y: 2070, h: 0, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    for (const s of window.__np.hiredBoats.boats) s.state = 'sunk';
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.necroPal.shown, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('necromancer walks with you', {
    timeout: 9000,
  });
  // Up to island 8's camp of hired men: a fight, and he raises his hamster.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const c = window.__np.hired8;
    w.x = c.home.x - 70;
    w.y = c.home.y - 30;
  });
  await page.waitForFunction(
    () => window.__np.allies.list.some((a) => a.kind === 'hamster'),
    null,
    { timeout: 6000 },
  );
  expect(errors).toEqual([]);
});

test('the otter: three fish off the dock make him yours, he swims along, and climbs aboard past the buoys', async ({
  context,
  page,
}) => {
  const hold = new Array(16).fill(0);
  hold[0] = 5;
  const errors = await boot(context, page, {
    muted: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2700, y: 2210, h: -0.5, clock: 0.3, hold },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#toast')).toContainText('otter', { timeout: 4000 });
  await expect(page.locator('#log')).toContainText('Something off the dock?');
  for (let i = 0; i < 3; i++) await page.evaluate(() => window.__np.tapOtter());
  expect(await page.evaluate(() => window.__np.otter.free)).toBe(true);
  expect(await page.evaluate(() => window.__np.hold)).toBe(2);
  await expect(page.locator('#toast')).toContainText('The otter is yours');
  await expect(page.locator('#log')).toContainText('Otter befriended');
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').otterFed,
  );
  expect(saved).toBe(3);
  // Out past the buoys, he climbs up on deck.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 5100;
    b.y = 2400;
    b.v = 0;
  });
  await page.waitForFunction(() => window.__np.otter.state === 'aboard', null, { timeout: 3000 });
  expect(errors).toEqual([]);
});

test('Gigantis: through the portal, beat the courtyard, on through the door, and back home', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    isle7Seen: true,
    isle7Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await expect(page.locator('#climb')).toHaveText('Into the portal');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  await expect(page.locator('#leave')).toHaveText('Back through the portal');
  await expect(page.locator('#toast')).toContainText('Skeletons', { timeout: 3000 });
  // Everyone in the courtyard down, then to the door at its back.
  await page.evaluate(() => {
    const h = window.__np.hordes[12];
    if (!h) return;
    for (const u of h.list) {
      u.guard = false;
      h.hit(u, 99, u.x + 40, u.y);
    }
    window.__np.walker.x = -13500 - 170 * 0.6 * Math.SQRT1_2;
    window.__np.walker.y = -6000 - 170 * 0.6 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Through the door');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 13);
  await expect(page.locator('#toast')).toContainText('Zombies', { timeout: 3000 });
  await page.click('#leave');
  await page.waitForFunction(
    () => window.__np.floor === -1 && window.__np.walker.state === 'ashore',
  );
  expect(errors).toEqual([]);
});

test('the Forgotten One: through the halls to his throne room, his bones join you and give the key, into the ruins', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    isle7Seen: true,
    isle7Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  const rooms: [number, number, number][] = [
    [12, -6000, 170],
    [13, -6900, 160],
    [14, -7800, 160],
  ];
  for (const [i, y, r] of rooms) {
    await page.waitForFunction(
      (n) => window.__np.hordes[n]?.list.some((u) => u.state !== 'wait'),
      i,
    );
    await page.evaluate(
      ([n, ry, rr]) => {
        const h = window.__np.hordes[n];
        if (!h) return;
        for (const u of h.list) {
          u.guard = false;
          h.hit(u, 99, u.x + 40, u.y);
        }
        window.__np.walker.x = -13500 - rr * 0.6 * Math.SQRT1_2;
        window.__np.walker.y = ry - rr * 0.6 * Math.SQRT1_2;
      },
      [i, y, r] as const,
    );
    await expect(page.locator('#climb')).toHaveText('Through the door');
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, i + 1);
  }
  await page.waitForFunction(() => window.__np.forgotten.up, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('Forgotten One');
  // The warlock calls his merlocks.
  await page.waitForFunction(
    () => window.__np.allies.list.some((a) => a.kind === 'merlock'),
    null,
    { timeout: 4000 },
  );
  // The necromancers down, then him.
  await page.evaluate(() => {
    const h = window.__np.hordes[15];
    if (h) for (const u of h.list) h.hit(u, 99, u.x + 40, u.y);
    window.__np.forgotten.hit(99);
  });
  // He falls apart, and his bones get up on your side.
  await page.waitForFunction(() => window.__np.bonesPal.shown, null, { timeout: 5000 });
  await expect(page.locator('#toast')).toContainText('bones');
  await page.waitForFunction(() => window.__np.isle7Stage === 2, null, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.bonesPal.free)).toBe(true);
  await expect(page.locator('#toast')).toContainText('locked');
  // At the door behind the throne, his bones give the key.
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__np.walker.x = -13500 - 158 * Math.SQRT1_2;
    window.__np.walker.y = -8800 - 158 * Math.SQRT1_2;
  });
  await page.waitForFunction(() => window.__np.isle7Stage === 3, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('key');
  await expect(page.locator('#climb')).toHaveText('Through the door');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 16);
  await expect(page.locator('#toast')).toContainText('Lancers');
  expect(
    await page.evaluate(() => window.__np.lancers.list.every((l) => l.state === 'guard')),
  ).toBe(true);
  await expect(page.locator('#leave')).toHaveText('Back through the portal');
  expect(errors).toEqual([]);
});

test('Star is afraid of anything bigger: the Deep One rises, and Star shoots up into space until it has gone', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3700, y: -1600, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.deep.fighting, null, { timeout: 4000 });
  await page.waitForFunction(() => window.__np.serpent.state === 'scared', null, { timeout: 3000 });
  await page.waitForFunction(() => window.__np.serpent.state === 'space', null, { timeout: 5000 });
  // Told once the Deep One's own warning has had its turn.
  await expect(page.locator('#toast')).toContainText('into space', { timeout: 6000 });
  // Away from the Deep One's water: it sinks back to sleep, and Star falls back to its loop.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 2400;
    b.y = -400;
    b.v = 0;
  });
  await page.waitForFunction(() => window.__np.serpent.state === 'drop', null, { timeout: 8000 });
  await page.waitForFunction(() => window.__np.serpent.state === 'haunt', null, { timeout: 4000 });
  expect(errors).toEqual([]);
});

test('the Deep One: harpooned down, it drags the boat under to its temple, where Cthulhu waits', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3700, y: -1600, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.deep.fighting, null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.deep.resolve = 1;
  });
  await page.waitForFunction(
    () => {
      window.__np.fireHarpoon();
      return window.__np.deep.state === 'drag';
    },
    null,
    { timeout: 30000, polling: 100 },
  );
  // Under, in the temple.
  await page.waitForFunction(() => window.__np.floor === 8 && window.__np.isle6Stage === 1, null, {
    timeout: 5000,
  });
  await page.waitForFunction(() => window.__np.cth.state === 'fight', null, { timeout: 3000 });
  await page.evaluate(() => window.__np.cth.hit(99));
  await page.waitForFunction(() => window.__np.isle6Stage === 2, null, { timeout: 5000 });
  await expect(page.locator('#toast')).toContainText('rare fish', { timeout: 6000 });
  expect(errors).toEqual([]);
});

test('the Old One: through the door behind the throne, he rises, you get soul armour, and he is beaten', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    isle7Seen: true,
    isle7Stage: 3,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  for (const [i, y, r] of [
    [12, -6000, 170],
    [13, -6900, 160],
    [14, -7800, 160],
  ] as const) {
    await page.waitForFunction(
      (n) => window.__np.hordes[n]?.list.some((u) => u.state !== 'wait'),
      i,
    );
    await page.evaluate(
      ([n, ry, rr]) => {
        const h = window.__np.hordes[n];
        if (!h) return;
        for (const u of h.list) {
          u.guard = false;
          h.hit(u, 99, u.x + 40, u.y);
        }
        window.__np.walker.x = -13500 - rr * 0.6 * Math.SQRT1_2;
        window.__np.walker.y = ry - rr * 0.6 * Math.SQRT1_2;
      },
      [i, y, r] as const,
    );
    await expect(page.locator('#climb')).toHaveText('Through the door');
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, i + 1);
  }
  // The throne room is empty, and the door behind it open: through it.
  await page.evaluate(() => {
    window.__np.walker.x = -13500 - 158 * Math.SQRT1_2;
    window.__np.walker.y = -8800 - 158 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Through the door');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 16);
  // He rises, the skeleton is knocked flying, and soul armour is yours.
  await page.waitForFunction(() => window.__np.oldOne.state === 'rise', null, { timeout: 5000 });
  await page.waitForFunction(() => window.__np.soulArmour, null, { timeout: 12000 });
  await expect(page.locator('#toast')).toContainText('soul armour');
  await page.waitForFunction(() => window.__np.oldOne.up, null, { timeout: 8000 });
  await page.waitForFunction(
    () => window.__np.hordes[16]?.list.filter((u) => u.kind === 'lagoon').length === 5,
    null,
    { timeout: 3000 },
  );
  await page.evaluate(() => window.__np.oldOne.hit(999));
  await page.waitForFunction(() => window.__np.isle7Stage === 4, null, { timeout: 8000 });
  await expect(page.locator('#toast')).toContainText('Old One');
  expect(errors).toEqual([]);
});

test("the Old One's rising, owed to a game the tester skipped past him: it plays in full in the ruins, and he sinks back", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    coins: 500,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    isle7Seen: true,
    isle7Stage: 4,
    soulArmour: true,
    oldOwed: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  for (const [i, y, r] of [
    [12, -6000, 170],
    [13, -6900, 160],
    [14, -7800, 160],
  ] as const) {
    await page.waitForFunction(
      (n) => window.__np.hordes[n]?.list.some((u) => u.state !== 'wait'),
      i,
    );
    await page.evaluate(
      ([n, ry, rr]) => {
        const h = window.__np.hordes[n];
        if (!h) return;
        for (const u of h.list) {
          u.guard = false;
          h.hit(u, 99, u.x + 40, u.y);
        }
        window.__np.walker.x = -13500 - rr * 0.6 * Math.SQRT1_2;
        window.__np.walker.y = ry - rr * 0.6 * Math.SQRT1_2;
      },
      [i, y, r] as const,
    );
    await expect(page.locator('#climb')).toHaveText('Through the door');
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, i + 1);
  }
  await page.evaluate(() => {
    window.__np.walker.x = -13500 - 158 * Math.SQRT1_2;
    window.__np.walker.y = -8800 - 158 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Through the door');
  const coins = await page.evaluate(() => window.__np.coins);
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 16);
  // The whole scene, soul armour and all, as if for the first time; then down he goes, and no fight.
  await page.waitForFunction(() => window.__np.oldOne.state === 'rise', null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__np.oldOwed)).toBe(false);
  await expect(page.locator('#toast')).toContainText('soul armour', { timeout: 12000 });
  await page.waitForFunction(() => window.__np.oldOne.state === 'sink', null, { timeout: 8000 });
  await expect(page.locator('#toast')).toContainText('long ago');
  await page.waitForFunction(() => window.__np.oldOne.state === 'gone', null, { timeout: 8000 });
  expect(await page.evaluate(() => [window.__np.isle7Stage, window.__np.coins])).toEqual([
    4,
    coins,
  ]);
  expect(errors).toEqual([]);
});

test('the healer cat and the Cthulhu warrior: the cat eats a fish aboard for a heal, and both come ashore', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: -1100, h: -Math.PI / 2, clock: 0.3, hold: [3] },
  });
  // At sea, the cat rides on the cabin roof: tap it to feed it a fish.
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => window.__np.cat.heals);
  const [x, y] = (await page.evaluate(() => window.__np.catAt)) as [number, number];
  await tap(page, x, y);
  await page.waitForFunction((b) => window.__np.cat.heals > b, before, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.hold)).toBe(2);
  // Into the dock and ashore: both come along.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 2400;
    b.y = -1320;
    b.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.locator('#ashore').click();
  await page.waitForFunction(() => window.__np.cat.shown && window.__np.warrior.shown, null, {
    timeout: 5000,
  });
  expect(errors).toEqual([]);
});

test('the tuna cat: it eats the tuna first, and then heals a hurt companion ashore as well as you', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    lv: { net: 5, hold: 5, engine: 5 },
    // Three sardines and a tuna.
    trip: { x: 2400, y: -1100, h: -Math.PI / 2, clock: 0.3, hold: [3, 0, 0, 0, 1] },
  });
  await page.waitForTimeout(600);
  const [x, y] = (await page.evaluate(() => window.__np.catAt)) as [number, number];
  await tap(page, x, y);
  await page.waitForFunction(() => window.__np.cat.tuna, null, { timeout: 2000 });
  await expect(page.locator('#toast')).toContainText('heals your companions');
  // It took the tuna, not a sardine.
  expect(await page.evaluate(() => window.__np.hold)).toBe(3);

  // Ashore, the warrior takes a hit, and the cat gives it back.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 2400;
    b.y = -1320;
    b.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.locator('#ashore').click();
  await page.waitForFunction(() => window.__np.cat.shown && window.__np.warrior.shown, null, {
    timeout: 5000,
  });
  await page.waitForTimeout(800);
  const full = await page.evaluate(() => window.__np.warrior.maxHp);
  expect(
    await page.evaluate(() => {
      window.__np.warrior.invuln = 0;
      return window.__np.warrior.hurt();
    }),
  ).toBe(true);
  expect(await page.evaluate(() => window.__np.warrior.hp)).toBe(full - 1);
  await page.waitForFunction((f) => window.__np.warrior.hp === f, full, { timeout: 3000 });
  expect(errors).toEqual([]);
});

test('tester: the #tester link shows a Tester button in the shop, and skipping to the Shark King marks him and all before him beaten', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, { muted: true, coins: 300 }, './#tester');
  // The link's end is tidied away, and the button is there from now on.
  expect(new URL(page.url()).hash).toBe('');
  expect(await page.evaluate(() => document.getElementById('testerBtn')?.hidden)).toBe(false);
  await page.locator('#testerBtn').dispatchEvent('click');
  await expect(page.locator('#tester')).toBeVisible();
  await expect(page.locator('#testerSteps .tstep.done')).toHaveCount(0);
  // An extra: coins, straight away.
  await page.locator('#testerExtras [data-extra="coins"]').click();
  expect(await page.evaluate(() => window.__np.coins)).toBe(10300);
  // The button itself says it worked, since the toasts are behind the panel; then it goes back to Add.
  await expect(page.locator('#testerExtras [data-extra="coins"]')).toContainText('Added');
  await expect(page.locator('#testerExtras [data-extra="coins"]')).not.toContainText('Added', {
    timeout: 3000,
  });
  // The sea map, all its fog cleared at once.
  expect(await page.evaluate(() => window.__np.sailedShare)).toBeLessThan(1);
  await page.locator('#testerExtras [data-extra="unfog"]').click();
  expect(await page.evaluate(() => window.__np.sailedShare)).toBe(1);
  await expect(page.locator('#testerExtras [data-extra="unfog"]')).toContainText('Have it', {
    timeout: 3000,
  });
  // The pets: the otter and Neil, and the naga, each once.
  for (const k of ['otter', 'neil', 'naga']) {
    await page.locator(`#testerExtras [data-extra="${k}"]`).click();
    await expect(page.locator(`#testerExtras [data-extra="${k}"]`)).toContainText('Have it', {
      timeout: 3000,
    });
  }
  expect(
    await page.evaluate(() => [
      window.__np.otter.free,
      window.__np.neil.free,
      window.__np.nagaFree,
    ]),
  ).toEqual([true, true, true]);
  // A step: the game saves and starts again, past the Shark King.
  await Promise.all([
    page.waitForEvent('load'),
    page.locator('#testerSteps .tstep', { hasText: 'Skeleton Shark King' }).click(),
  ]);
  await page.waitForTimeout(400);
  await page.click('#go');
  expect(
    await page.evaluate(() => {
      const n = window.__np;
      return [n.isle3Stage, n.isle4Stage, n.isle5Seen, n.isle5Stage, n.isle6Stage, n.coins];
    }),
    // Island 3 at stage 3: the tar monster's scene is still to come, the next time the boat is out (a skip never skips one).
  ).toEqual([3, 1, true, 1, 0, 10300]);
  expect(await page.evaluate(() => document.getElementById('testerBtn')?.hidden)).toBe(false);
  await page.locator('#testerBtn').dispatchEvent('click');
  await expect(page.locator('#testerSteps .tstep.done')).toHaveCount(3);
  // And #tester-off, typed onto the page already open, puts it away again.
  await page.locator('#testerClose').click();
  await page.evaluate(() => {
    location.hash = 'tester-off';
  });
  await page.waitForFunction(() => document.getElementById('testerBtn')?.hidden === true, null, {
    timeout: 2000,
  });
  expect(new URL(page.url()).hash).toBe('');
  expect(errors).toEqual([]);
});

test("tester: the story goes on past the Heron, to the tar eel, leaving the places to find and the Forgotten One's castle tour to play", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, { muted: true, coins: 300 }, './#tester');
  await page.locator('#testerBtn').dispatchEvent('click');
  await expect(page.locator('#tester')).toBeVisible();
  const steps = await page.locator('#testerSteps .tstep').count();
  await Promise.all([
    page.waitForEvent('load'),
    page.locator('#testerSteps .tstep', { hasText: 'tar eel' }).click(),
  ]);
  await page.waitForTimeout(400);
  await page.click('#go');
  expect(
    await page.evaluate(() => {
      const n = window.__np;
      return {
        heron: n.heronStage,
        pelican: n.pelicanBeaten,
        crows: n.crowsOwned,
        caterman: n.catermanFree,
        key: n.skullKey,
        crypt: n.cryptWon,
        mission1: n.stealth1,
        invis: n.invis,
        leader: n.tarLeaderBeaten,
        eel: n.eelStage,
        // His cutscene is still to come: he kneels in the crypt, waiting to show you his castle.
        tour: n.castleHQ,
      };
    }),
  ).toEqual({
    heron: 2,
    pelican: true,
    crows: 3,
    caterman: true,
    key: true,
    crypt: true,
    mission1: true,
    invis: true,
    leader: true,
    eel: 2,
    tour: false,
  });
  await page.locator('#testerBtn').dispatchEvent('click');
  // Every step done but the two after the eel's: Skrill and the tar kraken.
  await expect(page.locator('#testerSteps .tstep.done')).toHaveCount(steps - 2);
  expect(errors).toEqual([]);
});

test('tester: the egg buttons leave a Reaper on land never beaten asleep by his nest, and a button brings him back for a rematch', async ({
  context,
  page,
}) => {
  // A game restored from the tester: the egg given, the Reaper on land never fought.
  const errors = await boot(
    context,
    page,
    { muted: true, coins: 300, isle6Seen: true },
    './#tester',
  );
  await page.locator('#testerBtn').dispatchEvent('click');
  await page.locator('#testerExtras [data-extra="hatch"]').click();
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => [window.__np.reaperEgg, window.__np.reaperRematch])).toEqual([
    2,
    true,
  ]);
  await page.waitForFunction(() => window.__np.landReaper.state !== 'gone', null, {
    timeout: 2000,
  });
  // Still there after a reload.
  await page.reload();
  await page.click('#go');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__np.landReaper.state)).toBe('sleep');
  expect(errors).toEqual([]);
});

test('tester: a Reaper on land already beaten comes back by his nest for a rematch, and stays for it after a reload', async ({
  context,
  page,
}) => {
  const errors = await boot(
    context,
    page,
    { muted: true, coins: 300, isle6Seen: true, reaperEgg: 3 },
    './#tester',
  );
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__np.landReaper.state)).toBe('gone');
  await page.locator('#testerBtn').dispatchEvent('click');
  const b = page.locator('#testerExtras [data-extra="reaperland"]');
  await expect(b).toContainText('Add');
  await b.click();
  await expect(b).toContainText('Have it', { timeout: 3000 });
  expect(
    await page.evaluate(() => [window.__np.landReaper.state, window.__np.reaperRematch]),
  ).toEqual(['sleep', true]);
  await page.reload();
  await page.click('#go');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__np.landReaper.state)).toBe('sleep');
  expect(await page.evaluate(() => window.__np.reaperEgg)).toBe(3);
  expect(errors).toEqual([]);
});

test("tester: a skip never skips a cutscene: the tar monster rises the next time the boat is out, and the Old One's scene is owed", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, { muted: true, coins: 300 }, './#tester');
  await page.locator('#testerBtn').dispatchEvent('click');
  await Promise.all([
    page.waitForEvent('load'),
    page.locator('#testerSteps .tstep', { hasText: 'Old One beaten' }).click(),
  ]);
  await page.waitForTimeout(400);
  await page.click('#go');
  expect(await page.evaluate(() => [window.__np.isle7Stage, window.__np.oldOwed])).toEqual([
    4,
    true,
  ]);
  // Out on the water: the tar monster's scene, and then island 4 is tar, as in the story.
  await page.waitForFunction(() => window.__np.cine?.kind === 'tar', null, { timeout: 6000 });
  expect(await page.evaluate(() => window.__np.isle3Stage)).toBe(3);
  await page.waitForTimeout(1500);
  await tap(page, CX, CY);
  await page.waitForFunction(() => window.__np.isle3Stage === 4, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.cine)).toBeNull();
  expect(errors).toEqual([]);
});

test('tester: skipping past the Shark King leaves his last words owed: the panel says where, and they play at island 5', async ({
  context,
  page,
}) => {
  // A game stuck at the King: the tar monster's scene long seen, the Anchorer beaten.
  const errors = await boot(
    context,
    page,
    {
      muted: true,
      coins: 300,
      isle2Seen: true,
      isle3Seen: true,
      isle3Stage: 4,
      isle4Stage: 1,
      isle5Seen: true,
      lv: { net: 5, hold: 5, engine: 5 },
    },
    './#tester',
  );
  await page.locator('#testerBtn').dispatchEvent('click');
  await expect(page.locator('#tester')).toBeVisible();
  await expect(page.locator('#testerOwed')).toBeEmpty();
  await Promise.all([
    page.waitForEvent('load'),
    page.locator('#testerSteps .tstep', { hasText: 'Skeleton Shark King' }).click(),
  ]);
  await page.waitForTimeout(400);
  await page.click('#go');
  expect(await page.evaluate(() => [window.__np.isle5Stage, window.__np.kingOwed])).toEqual([
    1,
    true,
  ]);
  await page.locator('#testerBtn').dispatchEvent('click');
  await expect(page.locator('#testerOwed')).toContainText("The Skeleton Shark King's last words");
  await expect(page.locator('#testerOwed')).toContainText('island 5');
  await page.locator('#testerClose').click();
  // Up to his reef: he is up dying ahead of the boat, and a tap at once (still steering) does not lose it.
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.ISLE5_REEF.x + 600;
    n.boat.y = n.ISLE5_REEF.y;
    n.boat.v = 0;
  });
  await page.waitForFunction(() => window.__np.king.state === 'dying', null, { timeout: 4000 });
  await tap(page, CX, CY);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.__np.king.state)).toBe('dying');
  expect(await page.evaluate(() => window.__np.king.t)).toBeLessThan(2);
  // On a moment, a tap skips to his end: dead, owed no more, and no prize again.
  await page.waitForTimeout(1200);
  await tap(page, CX, CY);
  await page.waitForFunction(() => window.__np.king.state === 'dead', null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('portal', { timeout: 4000 });
  expect(await page.evaluate(() => [window.__np.kingOwed, window.__np.coins])).toEqual([
    false,
    300,
  ]);
  expect(errors).toEqual([]);
});

test('tester: without the link there is no Tester button', async ({ context, page }) => {
  const errors = await boot(context, page, { muted: true, coins: 300 });
  expect(await page.evaluate(() => document.getElementById('testerBtn')?.hidden)).toBe(true);
  expect(errors).toEqual([]);
});

test('another device: the shop copies a link to the game, and opened elsewhere it asks, then loads it', async ({
  browser,
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 4321,
    day: 7,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    lv: { net: 3, hold: 2, engine: 2 },
  });
  await page.locator('#carryBtn').dispatchEvent('click');
  await expect(page.locator('#carry')).toBeVisible();
  await expect(page.locator('#carryLink')).toHaveValue(/#game=z/);
  const link = await page.locator('#carryLink').inputValue();
  expect(link.length).toBeLessThan(2000);

  // The other device, with a game of its own.
  const other = await browser.newContext({ viewport: { width: 390, height: 780 } });
  await other.addInitScript(cloudOff, true);
  await other.addInitScript(
    (s: string) => {
      if (!localStorage.getItem('netprofit.v1')) localStorage.setItem('netprofit.v1', s);
    },
    JSON.stringify({ muted: true, coins: 50, day: 2 }),
  );
  const p2 = await other.newPage();
  p2.on('pageerror', (e) => errors.push(String(e)));
  await p2.goto(link);
  await expect(p2.locator('#carryAsk')).toBeVisible();
  await expect(p2.locator('#carryThere')).toHaveText('day 7, 4,321 coins, past island 3');
  await expect(p2.locator('#carryHere')).toHaveText('day 2, 50 coins');
  expect(new URL(p2.url()).hash).toBe('');
  await Promise.all([p2.waitForEvent('load'), p2.locator('#carryYes').click()]);
  await p2.waitForTimeout(400);
  await p2.click('#go');
  expect(
    await p2.evaluate(() => [window.__np.coins, window.__np.day, window.__np.isle3Stage]),
  ).toEqual([4321, 7, 4]);

  // Pasted in, it asks too; kept, nothing changes.
  await p2.locator('#carryBtn').dispatchEvent('click');
  await p2.locator('#carryIn').fill(link.replace(/#game=.*/, '#game=zNOTAGAMEATALL'));
  await p2.locator('#carryLoad').click();
  await expect(p2.locator('#carryAsk')).toBeHidden();
  await p2.locator('#carryIn').fill(`  ${link}\n`);
  await p2.locator('#carryLoad').click();
  await expect(p2.locator('#carryAsk')).toBeVisible();
  await p2.locator('#carryNo').click();
  await expect(p2.locator('#carryAsk')).toBeHidden();
  expect(await p2.evaluate(() => window.__np.coins)).toBe(4321);
  await other.close();
  expect(errors).toEqual([]);
});

test('online: the game keeps itself under a save code, the code brings it to another device, and a newer one is offered', async ({
  context,
  page,
}) => {
  // A stand-in for the online saves (supabase/migrations), with their rule: a game that has earned less is refused.
  const store = new Map<string, { game: string; earned: number }>();
  const plain = (o: Record<string, unknown>) =>
    `j${btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
  const seal = 'seal-pine-moon-kite';
  store.set(seal, {
    game: plain({ muted: true, coins: 4321, earned: 9000, day: 7, saveCode: seal }),
    earned: 9000,
  });
  const puts: { p_code: string; p_earned: number }[] = [];
  await context.addInitScript(cloudOff, false);
  await page.route(/rpc\/np_(save|load)_game/, async (route) => {
    const b = route.request().postDataJSON();
    const had = store.get(b.p_code);
    let out: unknown = had
      ? { game: had.game, earned: had.earned, at: '2026-10-16T16:00:00Z' }
      : null;
    if (route.request().url().includes('np_save_game')) {
      puts.push(b);
      const saved = !had || had.earned <= b.p_earned;
      if (saved) store.set(b.p_code, { game: b.p_game, earned: b.p_earned });
      out = { saved, earned: saved ? b.p_earned : had?.earned };
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(out) });
  });
  const errors = await boot(context, page, {
    muted: true,
    coins: 300,
    earned: 1200,
    day: 3,
    saveCode: 'otter-maple-reef-cove',
  });
  // Played here before: it goes online at once, under its code.
  await expect.poll(() => puts.length).toBeGreaterThan(0);
  expect(puts[0]).toMatchObject({ p_code: 'otter-maple-reef-cove', p_earned: 1200 });
  await page.locator('#carryBtn').dispatchEvent('click');
  await expect(page.locator('#codeOut')).toHaveValue('otter-maple-reef-cove');
  await expect(page.locator('#cloudSay')).toHaveText(/Saved online just now/);
  // Another game's code, typed any old way: it asks, then loads it, code and all.
  await page.locator('#carryIn').fill('Seal Pine  moon KITE');
  await page.locator('#carryLoad').click();
  await expect(page.locator('#carryAsk')).toBeVisible();
  await expect(page.locator('#carryFrom')).toHaveText('Saved online under that code');
  await expect(page.locator('#carryThere')).toHaveText('day 7, 4,321 coins');
  await Promise.all([page.waitForEvent('load'), page.locator('#carryYes').click()]);
  await page.waitForTimeout(400);
  await page.click('#go');
  expect(await page.evaluate(() => [window.__np.coins, window.__np.saveCode])).toEqual([
    4321,
    seal,
  ]);
  // Its code, to write down: a game from before it had heard it hears it now.
  await expect(page.locator('#toast')).toContainText(seal, { timeout: 9000 });
  // Played on further on another device: this one's copy is refused, and that one offered.
  store.set(seal, {
    game: plain({ muted: true, coins: 7777, earned: 12000, day: 9, saveCode: seal }),
    earned: 12000,
  });
  await page.evaluate(() => {
    window.__np.coins = 4322;
    window.dispatchEvent(new Event('pagehide'));
  });
  await expect(page.locator('#carryAsk')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#carryFrom')).toHaveText('Played on further on another device');
  await expect(page.locator('#carryThere')).toHaveText('day 9, 7,777 coins');
  await page.locator('#carryNo').click();
  expect(await page.evaluate(() => window.__np.cloudState)).toBe('behind');
  // Its own code typed in: nothing to load.
  await page.locator('#carryBtn').dispatchEvent('click');
  await expect(page.locator('#cloudSay')).toContainText('played on further');
  await page.locator('#carryIn').fill(seal);
  await page.locator('#carryLoad').click();
  await expect(page.locator('#carryNote')).toContainText('own code');
  expect(errors).toEqual([]);
});

test('the scanner: a zombie on the Battle Barge, scanned, says how to beat it, and is kept', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    armour: 4,
    scanner: 1,
    barge: { size: 'small', pick: { zombie: 1 } },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => window.__np.floor === window.__np.ARENAS.small, null, {
    timeout: 3000,
  });
  // Near it, the scanner aims at what the spear would.
  await page.evaluate(() => {
    const n = window.__np;
    const z = n.hordes[n.ARENAS.small ?? -1]?.list[0];
    if (!z) return;
    n.walker.x = z.x + 45;
    n.walker.y = z.y + 45;
    n.setHearts(9);
  });
  await page.waitForFunction(() => window.__np.scanAt === 'zombie', null, { timeout: 3000 });
  await expect(page.locator('#scanBtn')).toBeVisible();
  await page.locator('#scanBtn').click();
  await expect(page.locator('#scanOut')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#scanName')).toHaveText('A zombie');
  await expect(page.locator('#scanBeat')).toContainText('winds up');
  await expect(page.locator('#scanWeak')).toContainText('slow');
  await expect(page.locator('#scanCount')).toHaveText('New! 1 kind of creature scanned.');
  expect(await page.evaluate(() => window.__np.scanned)).toEqual(['zombie']);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').scanned,
  );
  expect(saved).toEqual(['zombie']);
  // A tap puts it away; without a scanner there is no button.
  await page.locator('#scanOut').click();
  await expect(page.locator('#scanOut')).toBeHidden();
  await page.evaluate(() => {
    window.__np.scanner = 0;
  });
  await expect(page.locator('#scanBtn')).toBeHidden();
  expect(errors).toEqual([]);
});

test('the scanner gets better: it scans the egg aboard, and at 18 kinds shows hit points', async ({
  context,
  page,
}) => {
  // Sixteen kinds scanned already: a scanner of an older game is brought up to the eggs level on load.
  const kinds = ['guard', 'cthulu', 'angler', 'gulper', 'meteor', 'reaper', 'king', 'deep'];
  kinds.push('hired', 'monkey', 'hiredman', 'gorilla', 'gator', 'spider', 'pelican', 'sorcerer');
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    armour: 4,
    scanner: 1,
    scanned: kinds,
    day: 3,
    reaperEgg: 2,
    eggDay: 3,
    barge: { size: 'small', pick: { zombie: 1 } },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  expect(await page.evaluate(() => window.__np.scanner)).toBe(3);
  // The Reaper's egg aboard, with nothing else about, is what it scans at sea.
  await page.waitForFunction(() => window.__np.scanAt === 'egg', null, { timeout: 3000 });
  await page.locator('#scanBtn').click();
  await expect(page.locator('#scanName')).toHaveText("The Reaper's egg");
  await expect(page.locator('#scanBeat')).toContainText('hatches');
  await expect(page.locator('#scanUp')).toBeHidden();
  await page.locator('#scanOut').click();
  // Once scanned it is not scanned again.
  await page.waitForFunction(() => window.__np.scanAt === null, null, { timeout: 3000 });
  await page.locator('#bargeBtn').click();
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => window.__np.floor === window.__np.ARENAS.small, null, {
    timeout: 3000,
  });
  await page.evaluate(() => {
    const n = window.__np;
    const z = n.hordes[n.ARENAS.small ?? -1]?.list[0];
    if (!z) return;
    n.walker.x = z.x + 45;
    n.walker.y = z.y + 45;
    n.setHearts(9);
  });
  // The eighteenth kind: it says it got better, and from the next scan on it shows hit points.
  await page.waitForFunction(() => window.__np.scanAt === 'zombie', null, { timeout: 3000 });
  await page.locator('#scanBtn').click();
  await expect(page.locator('#scanName')).toHaveText('A zombie');
  await expect(page.locator('#scanUp')).toContainText('hit points');
  await expect(page.locator('#scanHpP')).toBeHidden();
  expect(await page.evaluate(() => window.__np.scanner)).toBe(4);
  await page.locator('#scanOut').click();
  await page.waitForFunction(() => window.__np.scanAt === 'zombie', null, { timeout: 3000 });
  await page.locator('#scanBtn').click();
  await expect(page.locator('#scanHpP')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#scanHpL')).toHaveText('Hit points');
  const hp = await page.evaluate(
    () => window.__np.hordes[window.__np.ARENAS.small ?? -1]?.list[0]?.hp,
  );
  await expect(page.locator('#scanHp')).toHaveText(String(Math.ceil(hp ?? 0)));
  await expect(page.locator('#scanUp')).toBeHidden();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect([saved.scanner, saved.scanned.length]).toEqual([4, 18]);
  expect(errors).toEqual([]);
});

test('installable: a manifest with its icons, a service worker, and with no signal the game still opens', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, { muted: true, coins: 777 });
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const app = await page.evaluate(async (h) => {
    const m = await (await fetch(h as string)).json();
    const sizes: string[] = [];
    for (const i of m.icons)
      if ((await fetch(new URL(i.src, new URL(h as string, location.href)))).ok)
        sizes.push(i.sizes);
    return { name: m.name, display: m.display, start: m.start_url, sizes };
  }, href);
  expect(app).toMatchObject({ name: 'Net Profit', display: 'standalone', start: './' });
  expect(app.sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  // The service worker takes over and keeps the page and its script.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.waitForFunction(
    async () => {
      const keys = await (await caches.open('netprofit')).keys();
      return (
        keys.some((r) => r.url.includes('/assets/')) &&
        keys.some((r) => r.url.endsWith('/')) &&
        keys.some((r) => r.url.endsWith('/guide.html'))
      );
    },
    null,
    { timeout: 5000, polling: 200 },
  );
  // No signal: the game opens from what was kept, the save with it.
  await context.setOffline(true);
  // The game's own check for a new version is not answered from what was kept: it goes to the network, and fails.
  expect(
    await page.evaluate(async () => {
      const got = async (init?: RequestInit) => {
        try {
          return (await fetch('./', init)).ok;
        } catch {
          return 'failed';
        }
      };
      return [await got(), await got({ cache: 'no-store' })];
    }),
  ).toEqual([true, 'failed']);
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  await page.waitForFunction(() => window.__np?.coins === 777, null, { timeout: 3000 });
  // The player's guide was kept with it.
  await page.locator('#helpBtn').dispatchEvent('click');
  await expect(page.frameLocator('#helpFrame').locator('h1')).toContainText("Player's guide");
  await page.click('#helpClose');
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test("island 10's gators: one surges out of its pool, bites with its jaws wide, and ten hits beat it for coins", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 100,
    spear: 2,
    isle4Stage: 1,
    isle10Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.__np.gators.list.map((g) => g.state))).toEqual([
    'lurk',
    'lurk',
    'lurk',
    'lurk',
  ]);
  // Up to the edge of a pool: its gator comes out at you.
  await page.evaluate(() => {
    const n = window.__np;
    const p = n.gators.list[0]?.pool ?? { x: 0, y: 0, r: 0 };
    n.walker.x = p.x - (p.r + 40);
    n.walker.y = p.y + 10;
  });
  await page.waitForFunction(() => window.__np.gators.roused, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('A gator!');
  // Stood still, it opens its jaws and bites.
  const full = await page.evaluate(() => window.__np.hearts);
  await page.waitForFunction((h) => window.__np.hearts < h, full, { timeout: 8000 });
  // The spear, until it rolls over: hearts kept up so the figure stays ashore for it.
  for (let i = 0; i < 30; i++) {
    const st = await page.evaluate(() => window.__np.gators.list[0]?.state);
    if (st === 'fall' || st === 'gone') break;
    await page.evaluate(() => window.__np.setHearts(window.__np.maxHearts));
    await page.dispatchEvent('#throw', 'pointerdown', {
      button: 0,
      pointerType: 'touch',
      isPrimary: false,
    });
    await page.waitForTimeout(500);
  }
  await page.waitForFunction(() => window.__np.coins === 130, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('You beat a gator!');
  await page.waitForFunction(() => window.__np.gators.list[0]?.state === 'gone', null, {
    timeout: 4000,
  });
  expect(await page.evaluate(() => window.__np.gators.roused)).toBe(false);
  expect(errors).toEqual([]);
});

test("island 10's swamp: the swamp monster wakes with a roar and waves; a bear cub tapped rolls over", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 100,
    isle4Stage: 1,
    isle10Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForTimeout(1200);
  // Near enough to see it, not near enough to wake it: a mossy mound. A tap wakes it.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.swamp10.monster.x - 130;
    n.walker.y = n.swamp10.monster.y + 20;
  });
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__np.swamp10.monster.state)).toBe('sleep');
  let at = await page.evaluate(() => window.__np.swampAt('monster', 0));
  if (!at) throw new Error('no monster');
  await tap(page, at[0], at[1]);
  await page.waitForFunction(() => window.__np.swamp10.monster.state === 'roar', null, {
    timeout: 3000,
  });
  await expect(page.locator('#toast')).toContainText('The swamp monster!');
  await page.waitForFunction(() => window.__np.swamp10.monster.state === 'wave', null, {
    timeout: 3000,
  });
  // Over to the cubs, not too close: a tap and one rolls over.
  await page.evaluate(() => {
    const n = window.__np;
    const c = n.swamp10.cubs[0] ?? { x: 0, y: 0 };
    n.walker.x = c.x - 110;
    n.walker.y = c.y - 30;
  });
  await page.waitForTimeout(1500);
  at = await page.evaluate(() => window.__np.swampAt('cub', 0));
  if (!at) throw new Error('no cub');
  await tap(page, at[0], at[1]);
  await page.waitForFunction(() => window.__np.swamp10.cubs[0]?.state === 'roll', null, {
    timeout: 2000,
  });
  expect(errors).toEqual([]);
});

test('ashore with a tall column of bubbles, the message goes beside it and the figure stands low, clear of both', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    armour: 5,
    junk: 12,
    isle4Stage: 1,
    isle10Seen: true,
    snacks: { apple: 9, carrot: 9, banana: 9 },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const n = window.__np;
    const a = Math.atan2(n.OLDMAN10.y - n.WEB.y, n.OLDMAN10.x - n.WEB.x);
    n.walker.x = n.WEB.x + Math.cos(a) * 60;
    n.walker.y = n.WEB.y + Math.sin(a) * 60;
  });
  await expect(page.locator('#toast')).toContainText('hung you in his web', { timeout: 8000 });
  await page.waitForTimeout(1200);
  const at = await page.evaluate(() => {
    const t = document.querySelector('#toast')?.getBoundingClientRect();
    const r = document.querySelector('#rchips')?.getBoundingClientRect();
    return {
      side: document.querySelector('#toast')?.classList.contains('side'),
      right: t ? t.right : 0,
      bottom: t ? t.bottom : 0,
      column: r ? r.left : 0,
      walker: window.__np.walkerAt,
      h: innerHeight,
    };
  });
  expect(at.side).toBe(true);
  // Beside the column, not under it.
  expect(at.right).toBeLessThanOrEqual(at.column);
  // The figure low on the screen, below the message.
  expect(at.walker[1]).toBeGreaterThan(at.h * 0.55);
  expect(at.walker[1]).toBeGreaterThan(at.bottom);
  expect(errors).toEqual([]);
});

test("island 10's spider: he hangs you in his web without bug spray; the old man's spray beats him for coins", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 200,
    isle4Stage: 1,
    isle10Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForTimeout(1200);
  // Toward his web from the pier's side, close enough to wake him, with no spray: he catches you and hangs you up.
  const toWeb = () =>
    page.evaluate(() => {
      const n = window.__np;
      const a = Math.atan2(n.OLDMAN10.y - n.WEB.y, n.OLDMAN10.x - n.WEB.x);
      n.walker.x = n.WEB.x + Math.cos(a) * 60;
      n.walker.y = n.WEB.y + Math.sin(a) * 60;
    });
  await toWeb();
  await page.waitForFunction(() => window.__np.webT > 0, null, { timeout: 8000 });
  await expect(page.locator('#toast')).toContainText('hung you in his web');
  await page.waitForFunction(() => window.__np.webT === 0, null, { timeout: 5000 });
  // Off to the old man for a can of bug spray.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.OLDMAN10.x + 30;
    n.walker.y = n.OLDMAN10.y + 24;
  });
  await page.waitForTimeout(800);
  const at = await page.evaluate(() => window.__np.oldManAt);
  await tap(page, at[0], at[1]);
  await expect(page.locator('#store10')).toBeVisible();
  await page.locator('#store10Shelf [data-buy="spray"]').click();
  expect(await page.evaluate(() => [window.__np.coins, window.__np.bugSpray])).toEqual([150, 6]);
  await page.locator('#store10Close').click();
  // Back to his web: the spray can shows, and three sprays beat him.
  await toWeb();
  await page.waitForFunction(() => window.__np.sprayShown, null, { timeout: 8000 });
  for (let i = 0; i < 12; i++) {
    const st = await page.evaluate(() => window.__np.spider10.state);
    if (st === 'fall' || st === 'gone') break;
    if (await page.evaluate(() => window.__np.sprayShown))
      await page.dispatchEvent('#sprayBtn', 'pointerdown', { button: 0, pointerType: 'touch' });
    await page.waitForTimeout(700);
  }
  await page.waitForFunction(() => window.__np.coins === 250, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('curls up');
  expect(await page.evaluate(() => window.__np.bugSpray)).toBe(3);
  expect(errors).toEqual([]);
});

test("island 10's gorillas: the troop beats its chests, one slams for three hearts, and seven spear hits beat it", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 100,
    spear: 2,
    armour: 4,
    isle4Stage: 1,
    isle10Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const n = window.__np;
    const g = n.gorillas.list[0] ?? { x: 0, y: 0 };
    n.walker.x = g.x + 80;
    n.walker.y = g.y;
  });
  await page.waitForFunction(() => window.__np.gorillas.roused, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('Gorillas!');
  // Stood still in its ring, a slam lands: three hearts.
  const full = await page.evaluate(() => window.__np.hearts);
  await page.waitForFunction((h) => window.__np.hearts <= h - 3, full, { timeout: 8000 });
  // The spear, hearts kept up, until one has had enough.
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => window.__np.coins >= 140)) break;
    await page.evaluate(() => window.__np.setHearts(window.__np.maxHearts));
    await page.dispatchEvent('#throw', 'pointerdown', {
      button: 0,
      pointerType: 'touch',
      isPrimary: false,
    });
    await page.waitForTimeout(450);
  }
  await page.waitForFunction(() => window.__np.coins === 140, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('runs off into the trees');
  expect(errors).toEqual([]);
});

test('the survival knife: right up close it stabs, a little further off it is thrown, four a blow', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 100,
    spear: 3,
    armour: 5,
    heronStage: 2,
    heronFled: true,
    isle4Stage: 1,
    isle7Stage: 1,
    isle10Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.maxHearts)).toBe(9);
  // Right beside a gorilla, the button shows the knife; a stab takes four at once.
  await page.evaluate(() => {
    const n = window.__np;
    const g = n.gorillas.list[0] ?? { x: 0, y: 0 };
    n.walker.x = g.x + 22;
    n.walker.y = g.y + 6;
  });
  await expect(page.locator('#throw')).toHaveClass(/knife/, { timeout: 2000 });
  await expect(page.locator('#throw')).toHaveAttribute('aria-label', 'Use the knife');
  const before = await page.evaluate(() => window.__np.gorillas.list[0]?.hp ?? 0);
  await page.dispatchEvent('#throw', 'pointerdown', {
    button: 0,
    pointerType: 'touch',
    isPrimary: false,
  });
  const after = await page.evaluate(() => window.__np.gorillas.list[0]?.hp ?? 0);
  expect(before - after).toBeGreaterThanOrEqual(4);
  // A little further off it is thrown, and that finishes it.
  await page.evaluate(() => {
    const n = window.__np;
    n.setHearts(n.maxHearts);
    const g = n.gorillas.list[0] ?? { x: 0, y: 0 };
    n.walker.x = g.x + 80;
    n.walker.y = g.y + 6;
  });
  await page.waitForTimeout(700);
  await expect(page.locator('#throw')).toHaveClass(/knife/);
  await page.dispatchEvent('#throw', 'pointerdown', {
    button: 0,
    pointerType: 'touch',
    isPrimary: false,
  });
  await page.waitForFunction(() => window.__np.coins === 140, null, { timeout: 3000 });
  expect(errors).toEqual([]);
});

test("island 10's tower: up to the roof, the giant pelican dives and spits, and beaten it leaves a little bread", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 100,
    spear: 3,
    armour: 4,
    isle4Stage: 1,
    isle10Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.DOOR10.x;
    n.walker.y = n.DOOR10.y;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('The giant pelican!', { timeout: 4000 });
  // Stood still, something gets the figure: a fish or a dive.
  const full = await page.evaluate(() => window.__np.hearts);
  await page.waitForFunction((h) => window.__np.hearts < h, full, { timeout: 12000 });
  // The spear whenever it is down, hearts kept up, until it is beaten.
  for (let i = 0; i < 120; i++) {
    if (await page.evaluate(() => window.__np.pelicanBeaten)) break;
    await page.evaluate(() => window.__np.setHearts(window.__np.maxHearts));
    await page.dispatchEvent('#throw', 'pointerdown', {
      button: 0,
      pointerType: 'touch',
      isPrimary: false,
    });
    await page.waitForTimeout(300);
  }
  await page.waitForFunction(() => window.__np.pelicanBeaten, null, { timeout: 4000 });
  expect(await page.evaluate(() => [window.__np.coins, window.__np.bread])).toEqual([1600, 1]);
  await expect(page.locator('#toast')).toContainText('little loaf of bread');
  // The bread and the win are saved.
  await page.waitForTimeout(600);
  await page.reload();
  await page.waitForFunction(() => window.__np?.bread === 1, null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__np.pelicanBeaten)).toBe(true);
  expect(errors).toEqual([]);
});

test("island 10's birdfeeder: the bread brings the crows, and one answered right is petted and yours", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 100,
    spear: 3,
    isle4Stage: 1,
    isle10Seen: true,
    pelicanBeaten: true,
    bread: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.FEEDER10.x + 30;
    n.walker.y = n.FEEDER10.y + 30;
  });
  await page.waitForTimeout(600);
  // A tap on the feeder crumbles the bread into it, and the crows come.
  const f = await page.evaluate(() => window.__np.feederAt());
  await tap(page, f[0], f[1]);
  await expect(page.locator('#toast')).toContainText('Here come the crows', { timeout: 3000 });
  expect(await page.evaluate(() => [window.__np.bread, window.__np.feederFull])).toEqual([0, true]);
  await page.waitForFunction(
    () =>
      window.__np.crows.list.length === 3 &&
      window.__np.crows.list.every((c) => c.state === 'peck' || c.state === 'hop'),
    null,
    { timeout: 15000 },
  );
  // A tap on a crow, still at the feeder, asks a question.
  await page.waitForFunction(() => window.__np.crows.list.some((c) => c.state === 'peck'), null, {
    timeout: 5000,
  });
  const c = await page.evaluate(() => {
    const n = window.__np;
    return n.crowAt(n.crows.list.findIndex((k) => k.state === 'peck'));
  });
  if (!c) throw new Error('no crow');
  await tap(page, c[0], c[1]);
  await expect(page.locator('#crowCard')).toBeVisible({ timeout: 2000 });
  // Wrong: it says the right answer, and asks another.
  const right = await page.evaluate(() => window.__np.crowAsk?.q.right ?? '');
  await page.locator('#crowAnswers .answer').filter({ hasNotText: right }).first().click();
  await expect(page.locator('#crowFact')).toContainText('Not quite');
  await expect(page.locator('#crowPet')).toBeHidden();
  await page.click('#crowNext');
  // Right: pet it, and it is yours.
  const right2 = await page.evaluate(() => window.__np.crowAsk?.q.right ?? '');
  await page.locator('#crowAnswers .answer').filter({ hasText: right2 }).first().click();
  await expect(page.locator('#crowFact')).toContainText('right!');
  await page.click('#crowPet');
  await expect(page.locator('#crowCard')).toBeHidden();
  await expect(page.locator('#toast')).toContainText('The crow is yours!');
  expect(await page.evaluate(() => window.__np.crowsOwned)).toBe(1);
  // It flies off to the boat; the other two stay at the feeder.
  await page.waitForFunction(() => window.__np.crows.flying === 0, null, { timeout: 8000 });
  expect(
    await page.evaluate(() => window.__np.crows.list.filter((k) => k.state !== 'gone').length),
  ).toBe(2);
  // The crow and the full feeder are saved.
  await page.waitForTimeout(600);
  await page.reload();
  await page.waitForFunction(() => window.__np?.crowsOwned === 1, null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__np.feederFull)).toBe(true);
  expect(errors).toEqual([]);
});

test("honey: the old man sells a jar, and the forest's bees give one a day", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 3000,
    spear: 3,
    day: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle6Seen: true,
    isle7Seen: true,
    isle8Seen: true,
    isle10Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.OLDMAN10.x + 30;
    n.walker.y = n.OLDMAN10.y + 24;
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__np.talkToOldMan());
  await expect(page.locator('#store10')).toBeVisible();
  await expect(page.locator('#store10Shelf [data-buy="honey"]')).toContainText('3000');
  await page.locator('#store10Shelf [data-buy="honey"]').click();
  expect(await page.evaluate(() => [window.__np.honey, window.__np.coins])).toEqual([1, 0]);
  await expect(page.locator('#toast')).toContainText('bees in the forest');
  await page.locator('#store10Close').click();
  // Up to the beehive under its oak at the forest's edge: a jar from the bees.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.HIVE10.x + 24;
    n.walker.y = n.HIVE10.y + 24;
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__np.tapHive());
  expect(await page.evaluate(() => [window.__np.honey, window.__np.hiveDay])).toEqual([2, 4]);
  await expect(page.locator('#toast')).toContainText('afraid of honey');
  // Only one a day: a tap right on the hive says so.
  const [hx, hy] = await page.evaluate(() => window.__np.hiveAt());
  await tap(page, hx, hy);
  await expect(page.locator('#toast')).toContainText('tomorrow');
  expect(await page.evaluate(() => window.__np.honey)).toBe(2);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect([saved.honey, saved.hiveDay]).toEqual([2, 4]);
  expect(errors).toEqual([]);
});

test('honey: the Reaper at sea stops dead, shakes the boat and runs off splashing, for no prize', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 50,
    honey: 1,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 5500, h: Math.PI, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#honeyBtn')).toBeHidden();
  await page.evaluate(() => {
    window.__np.reaper.x = 2400;
    window.__np.reaper.y = 5900;
  });
  await page.waitForFunction(() => window.__np.honeyAt === 'sea', null, { timeout: 4000 });
  await expect(page.locator('#honeyBtn')).toBeVisible();
  await expect(page.locator('#honeyBtn b')).toHaveText('1');
  await page.locator('#honeyBtn').click();
  expect(await page.evaluate(() => [window.__np.reaper.state, window.__np.honey])).toEqual([
    'shy',
    0,
  ]);
  await expect(page.locator('#toast')).toContainText('shakes your boat');
  await expect(page.locator('#honeyBtn')).toBeHidden();
  await page.waitForFunction(() => window.__np.reaper.state === 'away', null, { timeout: 4000 });
  expect(await page.evaluate(() => [window.__np.driven.reaper ?? 0, window.__np.coins])).toEqual([
    0, 50,
  ]);
  expect(errors).toEqual([]);
});

test('honey: the Reaper on land stops dead, shakes, runs into the sea, and is back asleep when you go: no egg', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    honey: 2,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: -1320, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 2400;
    b.y = -1320;
    b.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.locator('#ashore').click();
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 5000 });
  const landed = await page.evaluate(() => [window.__np.walker.x, window.__np.walker.y]);
  await page.evaluate(() => {
    const { walker: w, NEST6: n } = window.__np;
    w.x = n.x + 110;
    w.y = n.y + 90;
  });
  await page.waitForFunction(() => window.__np.landReaper.awake, null, { timeout: 3000 });
  await page.waitForFunction(() => window.__np.honeyAt === 'land', null, { timeout: 3000 });
  await page.locator('#honeyBtn').click();
  expect(await page.evaluate(() => [window.__np.landReaper.state, window.__np.honey])).toEqual([
    'shy',
    1,
  ]);
  await expect(page.locator('#toast')).toContainText('beat him to win his egg');
  await page.waitForFunction(() => window.__np.landReaper.state === 'away', null, {
    timeout: 15000,
  });
  expect(await page.evaluate(() => window.__np.reaperEgg)).toBe(0);
  // Back aboard: he is asleep by his nest again.
  await page.evaluate(([x, y]) => {
    const { walker: w } = window.__np;
    w.x = x ?? w.x;
    w.y = y ?? w.y;
  }, landed);
  await page.locator('#aboard').click({ timeout: 8000 });
  await page.waitForFunction(() => window.__np.landReaper.state === 'sleep', null, {
    timeout: 4000,
  });
  expect(errors).toEqual([]);
});

test("island 10's treasure finder: bought from the old man, it shows sunken treasure on the radar, and the net hauls it up", async ({
  context,
  page,
}) => {
  // The far islands already seen, so no first-sighting toast lands over the snag's while the boat tows.
  const errors = await boot(context, page, {
    muted: true,
    coins: 2100,
    spear: 3,
    isle4Stage: 1,
    isle5Seen: true,
    isle6Seen: true,
    isle7Seen: true,
    isle8Seen: true,
    isle10Seen: true,
    gear: { radar: true },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  // Without the finder there is nothing to see or snag.
  expect(await page.evaluate(() => window.__np.sunken.on)).toBe(false);
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.OLDMAN10.x + 30;
    n.walker.y = n.OLDMAN10.y + 24;
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__np.talkToOldMan());
  await expect(page.locator('#store10')).toBeVisible();
  await page.locator('#store10Shelf [data-buy="finder"]').click();
  await expect(page.locator('#toast')).toContainText('treasure finder is fitted');
  expect(await page.evaluate(() => [window.__np.finder, window.__np.coins])).toEqual([true, 100]);
  await expect(page.locator('#store10Shelf [data-buy="finder"]')).toContainText('Fitted');
  await page.locator('#store10Close').click();
  // Back aboard and out to sea, the day's treasure is on the radar.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.walker.dock.landing.x;
    n.walker.y = n.walker.dock.landing.y - 5;
    (n.walker as unknown as { wandered: boolean }).wandered = true;
  });
  await page.locator('#aboard').click({ timeout: 8000 });
  await page.waitForFunction(
    () => window.__np.sunken.on && window.__np.sunken.list.length === 8,
    null,
    {
      timeout: 4000,
    },
  );
  // Tow the net over one: it snags it, for coins.
  const t = await page.evaluate(() => {
    const n = window.__np;
    const s = n.sunken.list[7];
    if (!s) throw new Error('no treasure');
    n.boat.x = s.x - 260;
    n.boat.y = s.y;
    n.boat.h = 0;
    n.boat.v = 0;
    n.keys = 'drive';
    return s.coins;
  });
  await page.waitForTimeout(400);
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => window.__np.sunkenFound !== 0, null, { timeout: 12000 });
  await page.keyboard.up('ArrowUp');
  await expect(page.locator('#toast')).toContainText('Your net snagged');
  expect(await page.evaluate(() => window.__np.coins)).toBe(100 + t);
  // What was found today is saved.
  await page.waitForTimeout(600);
  await page.reload();
  await page.waitForFunction(() => window.__np?.sunkenFound === 1 << 7, null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__np.finder)).toBe(true);
  expect(errors).toEqual([]);
});

test("island 10's badges: bought from the old man, pinned on companions, a shield takes the hits, and moved in the card", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 10000,
    spear: 3,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    isle10Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.OLDMAN10.x + 30;
    n.walker.y = n.OLDMAN10.y + 24;
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__np.talkToOldMan());
  await expect(page.locator('#store10')).toBeVisible();
  // Each badge goes on a friend without one; the shield's upgrade is the shield again.
  for (const k of ['shield', 'damage', 'heal', 'shield'])
    await page.locator(`#store10Shelf [data-buy="badge-${k}"]`).click();
  await expect(page.locator('#toast')).toContainText('takes 6 hits');
  const b = await page.evaluate(() => window.__np.badges);
  expect([b.shield, b.damage, b.heal, b.on]).toEqual([
    2,
    true,
    true,
    { shield: 'warlock', damage: 'cat', heal: 'warrior' },
  ]);
  expect(await page.evaluate(() => window.__np.coins)).toBe(10000 - 1500 - 2000 - 2000 - 2500);
  await page.locator('#store10Close').click();
  // The warlock's shield takes his hits.
  await page.waitForTimeout(1000);
  const hurt = await page.evaluate(() => {
    const k = window.__np.WEARER.warlock;
    if (!k) throw new Error('no warlock');
    const before = k.hearts;
    k.invuln = 0;
    k.hurt();
    return [before, k.hearts, k.worn.shield];
  });
  expect(hurt).toEqual([hurt[0], hurt[0], 5]);
  // Back aboard: the Badges card moves the healing badge to the cat, taking the damage badge off her.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.walker.dock.landing.x;
    n.walker.y = n.walker.dock.landing.y - 5;
    (n.walker as unknown as { wandered: boolean }).wandered = true;
  });
  await page.locator('#aboard').click({ timeout: 8000 });
  await expect(page.locator('#badgesBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#badgesBtn').click();
  await expect(page.locator('#badges')).toBeVisible();
  await page.locator('[data-badge="heal"][data-wearer="cat"]').click();
  expect(await page.evaluate(() => window.__np.badges.on)).toEqual({
    shield: 'warlock',
    damage: null,
    heal: 'cat',
  });
  await page.locator('#badgesClose').click();
  // Kept.
  await page.waitForTimeout(600);
  await page.reload();
  await page.waitForFunction(() => window.__np?.badges?.on.heal === 'cat', null, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test("island 10's treasure submarine: bought from the old man, it dives in the far deep and its claw picks up treasure", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 6100,
    spear: 3,
    isle4Stage: 1,
    isle10Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7044, y: -1440, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.OLDMAN10.x + 30;
    n.walker.y = n.OLDMAN10.y + 24;
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__np.talkToOldMan());
  await page.locator('#store10Shelf [data-buy="sub"]').click();
  await expect(page.locator('#toast')).toContainText('treasure submarine is yours');
  expect(await page.evaluate(() => [window.__np.sub, window.__np.coins])).toEqual([true, 100]);
  await page.locator('#store10Close').click();
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.walker.dock.landing.x;
    n.walker.y = n.walker.dock.landing.y - 5;
    (n.walker as unknown as { wandered: boolean }).wandered = true;
  });
  await page.locator('#aboard').click({ timeout: 8000 });
  // Out in the far deep's open water, stopped: Dive in the submarine.
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = 6300;
    n.boat.y = -1400;
    n.boat.v = 0;
  });
  await expect(page.locator('#diveBtn')).toHaveText('Dive in the submarine', { timeout: 4000 });
  await page.click('#diveBtn');
  await expect(page.locator('#toast')).toContainText('Down in the submarine');
  expect(await page.evaluate(() => window.__np.diver.sub)).toBe(true);
  await expect(page.locator('#surfaceBtn')).toHaveText('Back up to the boat');
  // Up to a treasure on the floor: the claw takes it.
  const t = await page.evaluate(() => {
    const n = window.__np;
    const l = n.subDive.loot[0];
    if (!l) throw new Error('no treasure');
    n.diver.x = l.x - 6;
    n.diver.y = l.y - 14;
    n.diver.vx = 0;
    n.diver.vy = 0;
    return l.coins;
  });
  await expect(page.locator('#toast')).toContainText('The claw grabs', { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(100 + t);
  const key = await page.evaluate(() => window.__np.subDive.key);
  expect(await page.evaluate((k) => window.__np.subFound.patches[k], key)).toBe(1);
  await page.click('#surfaceBtn');
  await page.waitForFunction(() => !window.__np.diving, null, { timeout: 8000 });
  await page.waitForTimeout(600);
  await page.reload();
  await page.waitForFunction(() => window.__np?.sub === true, null, { timeout: 5000 });
  expect(await page.evaluate((k) => window.__np.subFound.patches[k], key)).toBe(1);
  expect(errors).toEqual([]);
});

test('the far far sea: held at its buoys without a crow; with one, let it go and it flies for island 11', async ({
  context,
  page,
}) => {
  // A flagship in the far deep's north-east corner, past island 10, sailing out to the far far buoys.
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    pelicanBeaten: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7700, y: -2700, h: 0, clock: 0.3, hold: [] },
  });
  expect(await page.evaluate(() => window.__np.farFarOpen)).toBe(false);
  await page.evaluate(() => {
    window.__np.boat.v = 250;
  });
  await expect(page.locator('#toast')).toContainText('far far buoys', { timeout: 6000 });
  // Held at them: the far deep ends at 7800 here.
  expect(await page.evaluate(() => window.__np.boat.x)).toBeLessThanOrEqual(7760);
  await expect(page.locator('#crowGo')).toBeHidden();
  // With one of island 10's crows on the rail the way is open; out past the buoys, it can be let go.
  await page.evaluate(() => {
    window.__np.crowsOwned = 3;
    const b = window.__np.boat;
    b.x = 8050;
    b.y = -3250;
    b.v = 0;
  });
  expect(await page.evaluate(() => window.__np.farFarOpen)).toBe(true);
  await expect(page.locator('#toast')).toContainText('far far sea', { timeout: 4000 });
  await expect(page.locator('#crowGo')).toBeVisible({ timeout: 3000 });
  await page.click('#crowGo');
  expect(await page.evaluate(() => window.__np.guide.state)).toBe('out');
  await expect(page.locator('#crowGo')).toBeHidden();
  await expect(page.locator('#toast')).toContainText('flies for land');
  // It flies for island 11 and waits on its sand.
  await page.waitForFunction(() => window.__np.guide.state === 'perch', null, { timeout: 12000 });
  const off = await page.evaluate(() => {
    const g = window.__np.guide;
    const q = window.__np.PERCH11;
    return Math.hypot(g.x - q.x, g.y - q.y);
  });
  expect(off).toBeLessThan(1);
  // The boat comes close, off to the side of the pier's dock: island 11 is sighted, and the crow flies back to the rail.
  await page.evaluate(() => {
    const b = window.__np.boat;
    const q = window.__np.PERCH11;
    b.x = q.x + 250;
    b.y = q.y + 120;
  });
  await page.waitForFunction(() => window.__np.isle11Seen, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('island 11');
  await page.waitForFunction(() => window.__np.guide.state === 'aboard', null, { timeout: 8000 });
  await expect(page.locator('#log')).toContainText('Island 11 found');
  // Found, it stays found (sighting saves), and the far far sea stays open.
  await page.reload();
  await page.waitForFunction(() => window.__np?.isle11Seen === true, null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__np.farFarOpen)).toBe(true);
  expect(errors).toEqual([]);
});

test('island 11: tie up at its pier, walk up into the jungle, and look at the portal and the black lagoon', async ({
  context,
  page,
}) => {
  // A flagship out in the far far sea, south of island 11's pier, sailing for it.
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 9120, y: -3250, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('island 11');
  const y0 = await page.evaluate(() => window.__np.walker.y);
  // Up the pier (north, -y) and in among the trees.
  const sx = 1;
  const sy = -0.5;
  const n = Math.hypot(sx, sy);
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  await page.mouse.move(CX + (sx / n) * 60, CY + (sy / n) * 60, { steps: 3 });
  await page.waitForTimeout(2600);
  await page.mouse.up();
  const y1 = await page.evaluate(() => window.__np.walker.y);
  expect(y1).toBeLessThan(y0 - 100);
  // By the portal it says what it is; by the lagoon too.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const p = window.__np.PORTAL11;
    w.x = p.x + 50;
    w.y = p.y + 50;
  });
  await expect(page.locator('#toast')).toContainText('portal', { timeout: 6000 });
  // A message waits behind another for 4 seconds at most, and the portal's shows for longer: let it go first, as
  // walking from the portal to the lagoon would.
  await expect(page.locator('#toast')).not.toHaveClass(/show/, { timeout: 8000 });
  await page.evaluate(() => {
    const w = window.__np.walker;
    const i = window.__np.ISLE11;
    // On the lagoon's rim, on the side toward the middle of the island.
    w.x = i.x + 102;
    w.y = i.y - 89;
  });
  await expect(page.locator('#toast')).toContainText('black lagoon', { timeout: 9000 });
  await expect(page.locator('#log')).toContainText('Island 11 found');
  expect(errors).toEqual([]);
});

test('Skull Island: sighted, the camera takes in the whole skull, tie up off its chin and walk up through its teeth', async ({
  context,
  page,
}) => {
  // A flagship out past the white buoys' bottom corner, sailing down on the top of the skull.
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7600, y: 7600, h: Math.PI / 4, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 150;
  });
  await expect(page.locator('#toast')).toContainText('Skull Island', { timeout: 8000 });
  expect(await page.evaluate(() => window.__np.isle12Seen)).toBe(true);
  // The camera pulls right back to show the whole skull, then comes back in to the boat.
  await page.waitForFunction(() => window.__np.revealView > 0.6, null, { timeout: 4000 });
  await page.waitForFunction(() => window.__np.revealView < 0.1, null, { timeout: 9000 });
  // Round to its chin, stopped in the dock ring off the end of its pier.
  await page.evaluate(() => {
    const n = window.__np;
    const [x, y] = n.fromSkull(0, 1610);
    n.boat.x = x;
    n.boat.y = y;
    n.boat.v = 0;
    n.boat.h = (-3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('Ashore on Skull Island');
  // Skrill's men have a test of their own: here only the walk.
  await page.evaluate(() => {
    for (const m of window.__np.boneMen.list) m.state = 'gone';
  });
  // Straight up the screen: off the pier, up the jaw, and through the gap where its front teeth were.
  const along = () =>
    page.evaluate(() => {
      const n = window.__np;
      const dx = n.walker.x - n.fromSkull(0, 0)[0];
      const dy = n.walker.y - n.fromSkull(0, 0)[1];
      return [(dx - dy) * Math.SQRT1_2, (dx + dy) * Math.SQRT1_2] as const;
    });
  const [, v0] = await along();
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  await page.mouse.move(CX, CY - 60, { steps: 3 });
  await page.waitForTimeout(9500);
  await page.mouse.up();
  const [u1, v1] = await along();
  expect(v0).toBeGreaterThan(1400);
  expect(v1).toBeLessThan(900);
  expect(Math.abs(u1)).toBeLessThan(45);
  // At the rim of an eye socket it says what it is; at the tower's door, that the door is shut and someone laughs.
  await page.evaluate(() => {
    const n = window.__np;
    const [x, y] = n.fromSkull(-360, 645);
    n.walker.x = x;
    n.walker.y = y;
  });
  // A message's words stay in the element after it goes, and the landing one's say "Mind its eye sockets": matched on
  // those, both checks pass before the game has had a frame, the figure is at the tower as the eye's message goes up,
  // and the tower's waits behind it longer than a message waits. So the eye's own words.
  await expect(page.locator('#toast')).toContainText('An eye socket', { timeout: 8000 });
  await expect(page.locator('#toast')).not.toHaveClass(/show/, { timeout: 8000 });
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.TOWER12_DOOR.x;
    n.walker.y = n.TOWER12_DOOR.y + 8;
  });
  await expect(page.locator('#toast')).toContainText('mwa ha ha', { timeout: 9000 });
  await expect(page.locator('#log')).toContainText('Skull Island found');
  expect(errors).toEqual([]);
});

test("the Endless Isle: sighted, the camera takes in both halves; tie up at the pirates' pier, cross a bridge to the ninjas' half, and wade the shallows at half pace", async ({
  context,
  page,
}) => {
  // A flagship at the far deep's corner, sailing out into the far far sea's left corner.
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -2980, y: 7780, h: (3 * Math.PI) / 4, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 150;
  });
  await expect(page.locator('#toast')).toContainText('Endless Isle', { timeout: 8000 });
  await expect(page.locator('#toast')).toContainText('stimulate the economy');
  expect(await page.evaluate(() => window.__np.endless.seen)).toBe(true);
  // The camera pulls right back to show both halves, then comes back in to the boat.
  await page.waitForFunction(() => window.__np.revealView > 0.6, null, { timeout: 4000 });
  await page.waitForFunction(() => window.__np.revealView < 0.1, null, { timeout: 9000 });
  // Stopped in the dock ring off the end of the pirates' pier.
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.DOCK13.pirate;
    n.boat.x = d.x;
    n.boat.y = d.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  // Tied up, the camera leans a little toward the pier's crates, as at every island, not off across the sea toward home.
  await page.waitForTimeout(2500);
  const lean = await page.evaluate(() => {
    const n = window.__np;
    return Math.hypot(n.camAt.x - n.boat.x, n.camAt.y - n.boat.y);
  });
  expect(lean).toBeLessThan(250);
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText("the pirates' half");
  const at = () =>
    page.evaluate(() => window.__np.toEndless(window.__np.walker.x, window.__np.walker.y));
  // At the pirates' end of a rope bridge, walked straight up the screen: over the channel to the ninjas' half.
  await page.evaluate(() => {
    const n = window.__np;
    const [x, y] = n.fromEndless(330, 190);
    n.walker.x = x;
    n.walker.y = y;
  });
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  await page.mouse.move(CX, CY - 60, { steps: 3 });
  await page.waitForTimeout(6000);
  await page.mouse.up();
  const [bu, bv] = await at();
  expect(bv).toBeLessThan(-200);
  expect(Math.abs(bu - 330)).toBeLessThan(30);
  // From the ninjas' shore beside the sandbar, walked down the screen into the shallows: slower, and in to the knees.
  await page.evaluate(() => {
    const n = window.__np;
    const [x, y] = n.fromEndless(200, -175);
    n.walker.x = x;
    n.walker.y = y;
  });
  const [, w0] = await at();
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  await page.mouse.move(CX, CY + 60, { steps: 3 });
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.__np.walker.sink)).toBeGreaterThan(2);
  await page.waitForTimeout(1500);
  await page.mouse.up();
  const [, w1] = await at();
  // Down the screen through the shallows at about half pace: well short of a full walk's distance.
  expect(w1 - w0).toBeGreaterThan(40);
  expect(w1 - w0).toBeLessThan(85 * 2.7 * 0.7);
  await expect(page.locator('#log')).toContainText('Endless Isle found');
  expect(errors).toEqual([]);
});

test("the Endless Isle's leaders: Captain Cappy gives you Jacks Parrow, who swears in bleeps; Master Sensei, though you are a pirate, gives you Bun-San, who vanishes in smoke when hit", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    endless: { seen: true },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -2980, y: 7780, h: (3 * Math.PI) / 4, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.DOCK13.pirate;
    n.boat.x = d.x;
    n.boat.y = d.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('Captain Cappy is at the foot of the pier');
  // Up to Captain Cappy.
  const toLeader = (side: 'pirate' | 'ninja') =>
    page.evaluate((side) => {
      const n = window.__np;
      const L = n.LEADER13[side];
      n.walker.x = L.x + 16;
      n.walker.y = L.y + 16;
    }, side);
  await toLeader('pirate');
  await expect(page.locator('#climb')).toHaveText('Talk to Captain Cappy', { timeout: 4000 });
  await page.click('#climb');
  await expect(page.locator('#endlessCard')).toBeVisible();
  await expect(page.locator('#endlessSay')).toContainText('Sign the articles');
  await page.click('#endlessWhy');
  await expect(page.locator('#endlessSay')).toContainText('stimulate the economy');
  await expect(page.locator('#endlessWho')).toHaveText('Captain Cappy');
  await page.click('#endlessJoin');
  await expect(page.locator('#endlessGot')).toHaveText('Jacks Parrow is yours!');
  await expect(page.locator('#endlessJoin')).toBeHidden();
  expect(await page.evaluate(() => window.__np.endless.pirate)).toBe(true);
  // Done talking: he flies to the figure's shoulder and squawks his first word.
  await page.click('#endlessClose');
  await expect(page.locator('#toast')).toContainText('Jacks Parrow flies to your shoulder');
  await page.waitForFunction(() => window.__np.jacks.shown && window.__np.squawk.t > 0, null, {
    timeout: 3000,
  });
  expect(await page.evaluate(() => window.__np.squawk.line)).toBe(0);
  await page.waitForFunction(
    () => {
      const n = window.__np;
      return Math.hypot(n.jacks.x - n.walker.x, n.jacks.y - n.walker.y) < 8 && n.jacks.z > 15;
    },
    null,
    { timeout: 4000 },
  );
  // Over the channel to Master Sensei, a pirate now.
  await toLeader('ninja');
  await expect(page.locator('#climb')).toHaveText('Bow to Master Sensei', { timeout: 4000 });
  await page.click('#climb');
  await expect(page.locator('#endlessSay')).toContainText('You are a pirate');
  await page.click('#endlessJoin');
  await expect(page.locator('#endlessGot')).toHaveText('Bun-San is yours!');
  await page.click('#endlessClose');
  await expect(page.locator('#toast')).toContainText('Bun-San appears in a puff of smoke');
  await page.waitForFunction(() => window.__np.bunSan.shown, null, { timeout: 3000 });
  // Hit, he goes up in smoke and is back a moment later.
  expect(await page.evaluate(() => window.__np.bunSan.hurt())).toBe(true);
  expect(await page.evaluate(() => window.__np.bunSan.poofT)).toBeGreaterThanOrEqual(0);
  await page.waitForFunction(() => window.__np.bunSan.poofT < 0, null, { timeout: 3000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect(saved.endless).toEqual({ seen: true, pirate: true, ninja: true });
  expect(errors).toEqual([]);
});

test('Capture the Flag on the Endless Isle: the badge card, behind the gates, your strike and your Flintlock, their flag brought home three times for the win, its pay and marks; then the Quartermaster, his hearts as a bar and his shout, left early for nothing', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    endless: { seen: true, pirate: true, ninja: true },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -2980, y: 7780, h: (3 * Math.PI) / 4, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.DOCK13.pirate;
    n.boat.x = d.x;
    n.boat.y = d.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  const toCappy = () =>
    page.evaluate(() => {
      const n = window.__np;
      const L = n.LEADER13.pirate;
      n.walker.x = L.x + 16;
      n.walker.y = L.y + 16;
    });
  await toCappy();
  await expect(page.locator('#climb')).toHaveText('Talk to Captain Cappy', { timeout: 4000 });
  const before = await page.evaluate(() => ({
    coins: window.__np.coins,
    hearts: window.__np.hearts,
  }));
  await page.click('#climb');
  await page.click('#endlessFight');
  // The badge card: the three places in the crew, each with its Badge I ability.
  await expect(page.locator('#endlessRoles')).toBeVisible();
  await expect(page.locator('#endlessRoles [data-role="tank"]')).toContainText('Quartermaster');
  await expect(page.locator('#endlessRoles [data-role="tank"]')).toContainText('Oi! Over here!');
  await expect(page.locator('#endlessRoles [data-role="healer"]')).toContainText('Sea Biscuit');
  await expect(page.locator('#endlessRoles [data-role="damage"]')).toContainText('Flintlock');
  await page.click('#endlessRoles [data-role="damage"]');
  // In the pirates' fort, behind the gates: a Swashbuckler's eight hearts, and only Jacks Parrow fights with you.
  await expect(page.locator('#ctfBar')).toBeVisible();
  await expect(page.locator('#ctfWhat')).toContainText('Gates drop in');
  // Leaving is up in the score bar, out of the walking thumb's way, not the pill down at the bottom.
  await expect(page.locator('#ctfLeave')).toBeVisible();
  await expect(page.locator('#leave')).toBeHidden();
  await expect(page.locator('#hearts')).toBeVisible();
  expect(
    await page.evaluate(() => {
      const n = window.__np;
      const c = n.ctf as Ctf;
      return {
        role: c.you.role,
        hearts: n.hearts,
        pirates: c.fighters.filter((f) => f.side === 'pirate').length,
        ninjas: c.fighters.filter((f) => f.side === 'ninja').length,
        jacks: n.jacks.free,
        bun: n.bunSan.free,
      };
    }),
  ).toEqual({ role: 'damage', hearts: 8, pirates: 5, ninjas: 5, jacks: true, bun: false });
  // Out of the fort before the gates drop, and you are back inside it.
  await page.evaluate(() => {
    const n = window.__np;
    const [x, y] = n.fromEndless(0, 500);
    n.walker.x = x;
    n.walker.y = y;
  });
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => {
      const n = window.__np;
      const [u, v] = n.toEndless(n.walker.x, n.walker.y);
      const f = (n.ctf as Ctf).flags.pirate;
      return Math.hypot(u - f.u, v - f.v);
    }),
  ).toBeLessThan(80);
  // The gates down, and everyone else sent out of the way, but for one of theirs beside you to strike.
  await page.evaluate(() => {
    (window.__np.ctf as Ctf).gateT = 0.05;
  });
  await page.waitForFunction(() => window.__np.ctf?.phase === 'fight', null, { timeout: 3000 });
  await page.evaluate(() => {
    const c = window.__np.ctf as Ctf;
    for (const f of c.fighters)
      if (f.bot) {
        f.state = 'down';
        f.downT = 9999;
      }
    const foe = c.fighters.find((f) => f.side === 'ninja' && f.role === 'damage') as CtfFighter;
    foe.state = 'live';
    foe.cd = 99;
    foe.u = c.you.u + 24;
    foe.v = c.you.v;
  });
  await expect(page.locator('#throw')).toBeVisible({ timeout: 3000 });
  await page.dispatchEvent('#throw', 'pointerdown', { button: 0 });
  await expect(page.locator('#throw')).toHaveClass(/wait/);
  await page.waitForFunction(
    () =>
      (
        (window.__np.ctf as Ctf).fighters.find(
          (f) => f.side === 'ninja' && f.role === 'damage',
        ) as CtfFighter
      ).hp <= 6,
    null,
    { timeout: 3000 },
  );
  // The Flintlock: the foe stepped back out of the sword's reach, still in the shot's, takes four.
  await expect(page.locator('#ability')).toBeVisible();
  const shotAt = await page.evaluate(() => {
    const c = window.__np.ctf as Ctf;
    const foe = c.fighters.find((f) => f.side === 'ninja' && f.role === 'damage') as CtfFighter;
    foe.u = c.you.u + 200;
    foe.v = c.you.v;
    return foe.hp;
  });
  await page.dispatchEvent('#ability', 'pointerdown', { button: 0 });
  await page.waitForFunction(
    (hp) =>
      (
        (window.__np.ctf as Ctf).fighters.find(
          (f) => f.side === 'ninja' && f.role === 'damage',
        ) as CtfFighter
      ).hp <=
      hp - 4,
    shotAt,
    { timeout: 3000 },
  );
  await page.evaluate(() => {
    const foe = (window.__np.ctf as Ctf).fighters.find(
      (f) => f.side === 'ninja' && f.role === 'damage',
    ) as CtfFighter;
    foe.state = 'down';
    foe.downT = 9999;
  });
  // Their flag, three times, from their fort to yours.
  const stand = (side: 'pirate' | 'ninja') =>
    page.evaluate((side) => {
      const n = window.__np;
      const f = (n.ctf as Ctf).flags[side];
      const [x, y] = n.fromEndless(f.u, f.v + (side === 'ninja' ? 14 : -14));
      n.walker.x = x;
      n.walker.y = y;
    }, side);
  for (let i = 1; i <= 3; i++) {
    await stand('ninja');
    await page.waitForFunction(() => (window.__np.ctf as Ctf).you.carrying, null, {
      timeout: 3000,
    });
    if (i === 1) {
      await expect(page.locator('#ctfWhat')).toContainText('You have their flag');
      expect(await page.evaluate(() => window.__np.walker.speedK)).toBeCloseTo(0.85);
    }
    await stand('pirate');
    if (i < 3) {
      await page.waitForFunction((i) => window.__np.ctf?.score.pirate === i, i, { timeout: 3000 });
      await expect(page.locator('#ctfBarP')).toHaveText(String(i));
      await expect(page.locator('#toast')).toContainText('You scored!');
    }
  }
  // Won: the card, the pay, and marks for a pirate Swashbuckler, kept in the save.
  await expect(page.locator('#ctfCard')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#ctfTitle')).toHaveText('The pirates win!');
  await expect(page.locator('#ctfP')).toHaveText('3');
  await expect(page.locator('#ctfGot')).toHaveText('+500 coins');
  await expect(page.locator('#ctfStats')).toContainText('Flags you scored3');
  expect(await page.evaluate(() => window.__np.coins)).toBe(before.coins + 500);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect(saved.endless.battles).toEqual({
    fought: 1,
    won: 1,
    marks: { pirate: { tank: 0, damage: 2, healer: 0 }, ninja: { tank: 0, damage: 0, healer: 0 } },
  });
  // Done: back by Captain Cappy, as you were, Bun-San with you again.
  await page.click('#ctfDone');
  await expect(page.locator('#ctfCard')).toBeHidden();
  await expect(page.locator('#ctfBar')).toBeHidden();
  expect(await page.evaluate(() => window.__np.ctf)).toBeNull();
  await page.waitForFunction(
    (h) => window.__np.hearts === h && window.__np.bunSan.free,
    before.hearts,
    {
      timeout: 3000,
    },
  );
  // Another, as the Quartermaster: fourteen hearts as a bar, and the shout that makes a foe come at you; left early,
  // nothing paid.
  await expect(page.locator('#climb')).toHaveText('Talk to Captain Cappy', { timeout: 4000 });
  await page.click('#climb');
  await page.click('#endlessFight');
  await page.click('#endlessRoles [data-role="tank"]');
  // Leaving is up in the score bar, out of the walking thumb's way, not the pill down at the bottom.
  await expect(page.locator('#ctfLeave')).toBeVisible();
  await expect(page.locator('#leave')).toBeHidden();
  await expect(page.locator('#hearts .hbar')).toBeVisible();
  expect(await page.evaluate(() => window.__np.hearts)).toBe(14);
  await page.evaluate(() => {
    (window.__np.ctf as Ctf).gateT = 0.05;
  });
  await page.waitForFunction(() => window.__np.ctf?.phase === 'fight', null, { timeout: 3000 });
  await page.evaluate(() => {
    const c = window.__np.ctf as Ctf;
    const foe = c.fighters.find((f) => f.side === 'ninja' && f.role === 'damage') as CtfFighter;
    foe.u = c.you.u + 60;
    foe.v = c.you.v;
  });
  await page.dispatchEvent('#ability', 'pointerdown', { button: 0 });
  await page.waitForFunction(
    () => {
      const c = window.__np.ctf as Ctf & { you: { abCd: number[] } };
      return (c.you.abCd[0] ?? 0) > 0;
    },
    null,
    { timeout: 3000 },
  );
  // One tap only asks; the second leaves.
  await page.click('#ctfLeave');
  await expect(page.locator('#ctfLeave')).toHaveText('Leave? Tap again');
  expect(await page.evaluate(() => !!window.__np.ctf)).toBe(true);
  await page.click('#ctfLeave');
  await expect(page.locator('#toast')).toContainText('A battle left early pays nothing');
  expect(await page.evaluate(() => [window.__np.ctf, window.__np.coins])).toEqual([
    null,
    before.coins + 500,
  ]);
  expect(errors).toEqual([]);
});

test('Badges II and III: the badge card counts your marks, a Swashbuckler at Badge II swings in, a win to 8 marks brings the badge ceremony and Badge III, and the Powder Keg goes off on F', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    endless: {
      seen: true,
      pirate: true,
      ninja: true,
      battles: {
        fought: 5,
        won: 3,
        marks: {
          pirate: { tank: 0, damage: 6, healer: 2 },
          ninja: { tank: 0, damage: 0, healer: 0 },
        },
      },
    },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -2980, y: 7780, h: (3 * Math.PI) / 4, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.DOCK13.pirate;
    n.boat.x = d.x;
    n.boat.y = d.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  const toCappy = async () => {
    await page.evaluate(() => {
      const n = window.__np;
      const L = n.LEADER13.pirate;
      n.walker.x = L.x + 16;
      n.walker.y = L.y + 16;
    });
    await expect(page.locator('#climb')).toHaveText('Talk to Captain Cappy', { timeout: 4000 });
    await page.click('#climb');
    await page.click('#endlessFight');
  };
  const toFight = async () => {
    await page.evaluate(() => {
      (window.__np.ctf as Ctf).gateT = 0.05;
    });
    await page.waitForFunction(() => window.__np.ctf?.phase === 'fight', null, { timeout: 3000 });
    // Their bots out of it, so nobody but the one placed is in reach.
    await page.evaluate(() => {
      for (const f of (window.__np.ctf as Ctf).fighters)
        if (f.bot) {
          f.state = 'down';
          f.downT = 9999;
        }
    });
  };
  // Stood still and stunned where the test puts it, out from you.
  const placeFoe = (role: string, du: number, dv: number) =>
    page.evaluate(
      ([role, du, dv]) => {
        const c = window.__np.ctf as Ctf;
        const f = c.fighters.find(
          (f) => f.bot && f.side === 'ninja' && f.role === role && f.state === 'down',
        ) as CtfFighter;
        f.state = 'live';
        f.hp = 8;
        f.u = c.you.u + (du as number);
        f.v = c.you.v + (dv as number);
        f.stunT = 99;
        f.cd = 99;
        f.abCd = f.abCd.map(() => 99);
        return c.fighters.indexOf(f);
      },
      [role, du, dv] as const,
    );
  await toCappy();
  // The badge card: each place's badge from its marks, its abilities so far, and what the next takes.
  const damage = page.locator('#endlessRoles [data-role="damage"]');
  await expect(damage).toContainText('Badge II');
  await expect(damage).toContainText('Flintlock · Swing In');
  await expect(damage).toContainText('Badge III, Powder Keg, at 8 marks. You have 6.');
  await expect(page.locator('#endlessRoles [data-role="healer"]')).toContainText(
    'Badge II, Lime Ration, at 3 marks. You have 2.',
  );
  await damage.click();
  // Badge II: two buttons, not three.
  await expect(page.locator('#ability')).toBeVisible();
  await expect(page.locator('#ability2')).toBeVisible();
  await expect(page.locator('#ability3')).toBeHidden();
  await toFight();
  // Your armour: a 1 on you is half a heart, and the heart row shows the half.
  await page.evaluate(() => {
    const c = window.__np.ctf as Ctf & { hurt(f: CtfFighter, n: number): void };
    c.hurt(c.you, 1);
  });
  await page.waitForFunction(() => window.__np.hearts === 7.5, null, { timeout: 3000 });
  await expect(page.locator('#hearts svg')).toHaveCount(8);
  await expect(page.locator('#hearts path[d$="V13z"]')).toHaveCount(1);
  // Swing In: over to a foe out of the blade's reach, and the walker goes with you.
  const tank = await placeFoe('tank', -110, 20);
  const from = await page.evaluate(() => [window.__np.walker.x, window.__np.walker.y]);
  await page.dispatchEvent('#ability2', 'pointerdown', { button: 0 });
  await page.waitForFunction(() => ((window.__np.ctf as Ctf).you.abCd[1] ?? 0) > 0, null, {
    timeout: 3000,
  });
  const swung = await page.evaluate((i) => {
    const c = window.__np.ctf as Ctf;
    const foe = c.fighters[i] as CtfFighter;
    return {
      d: Math.hypot(c.you.u - foe.u, c.you.v - foe.v),
      hp: foe.hp,
      wx: window.__np.walker.x,
      wy: window.__np.walker.y,
    };
  }, tank);
  expect(swung.d).toBeLessThan(40);
  // Its 3, less a heart for a tank's armour.
  expect(swung.hp).toBeLessThanOrEqual(6);
  expect(
    Math.hypot(swung.wx - (from[0] as number), swung.wy - (from[1] as number)),
  ).toBeGreaterThan(60);
  // A win at the bell: two marks, eight in all, and Badge III's ceremony before the results.
  await page.evaluate(() => {
    const c = window.__np.ctf as Ctf & { clock: number };
    c.score.pirate = 1;
    c.clock = 0.01;
  });
  await expect(page.locator('#ctfCard')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#ctfBadge')).toBeVisible();
  await expect(page.locator('#ctfResults')).toBeHidden();
  await expect(page.locator('#ctfBadgeTitle')).toHaveText('Badge III!');
  await expect(page.locator('#ctfMedal')).toHaveText('III');
  await expect(page.locator('#ctfBadgeRole')).toHaveText('Swashbuckler of the pirates');
  await expect(page.locator('#ctfBadgeSay')).toContainText('Captain Cappy:');
  await expect(page.locator('#ctfBadgeAb')).toContainText('Powder Keg');
  await expect(page.locator('#ctfBadgeAb')).toContainText('or F.');
  // The little show sits in the card, not over it.
  const show = await page.locator('#ctfBadgeShow').boundingBox();
  expect(show?.height ?? 0).toBeGreaterThan(60);
  expect(show?.height ?? 999).toBeLessThan(200);
  await page.click('#ctfBadgeOn');
  await expect(page.locator('#ctfBadge')).toBeHidden();
  await expect(page.locator('#ctfResults')).toBeVisible();
  await expect(page.locator('#ctfTitle')).toHaveText('The pirates win!');
  await expect(page.locator('#ctfStats')).toContainText(
    'Marks, as a Swashbuckler8 of 20 for the gold badge',
  );
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect(saved.endless.battles.marks.pirate).toEqual({ tank: 0, damage: 8, healer: 2 });
  await page.click('#ctfDone');
  await expect(page.locator('#ctfCard')).toBeHidden();
  // Badge III on the card; and three buttons.
  await toCappy();
  await expect(damage).toContainText('Badge III');
  await expect(damage).toContainText('Flintlock · Swing In · Powder Keg');
  // Nothing more to earn there but the gold, the last rung.
  await expect(damage.locator('.next')).toHaveText(
    'Gold at 20 marks: no new power, but a gold badge and a title. You have 8.',
  );
  await damage.click();
  await expect(page.locator('#ability3')).toBeVisible();
  await toFight();
  // The Powder Keg on F, at two foes stood together: thrown, a ring, then the burst for 5 on both (the parrot may
  // have had a peck too).
  const a = await placeFoe('damage', 120, 0);
  const b = await placeFoe('damage', 130, 15);
  await page.keyboard.press('f');
  await page.waitForFunction(() => ((window.__np.ctf as Ctf).you.abCd[2] ?? 0) > 0, null, {
    timeout: 3000,
  });
  await page.waitForFunction(
    ([a, b]) => {
      const c = window.__np.ctf as Ctf;
      return (c.fighters[a as number]?.hp ?? 9) <= 3 && (c.fighters[b as number]?.hp ?? 9) <= 3;
    },
    [a, b],
    { timeout: 4000 },
  );
  await page.click('#ctfLeave');
  await page.click('#ctfLeave');
  await expect(page.locator('#ability3')).toBeHidden();
  expect(await page.evaluate(() => window.__np.ctf)).toBeNull();
  expect(errors).toEqual([]);
});

test("the healer's throw in Capture the Flag: its own button, not the blade's, and it reaches a foe 200 away", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    endless: { seen: true, pirate: true, ninja: true },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -2980, y: 7780, h: (3 * Math.PI) / 4, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.DOCK13.pirate;
    n.boat.x = d.x;
    n.boat.y = d.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    const n = window.__np;
    const L = n.LEADER13.pirate;
    n.walker.x = L.x + 16;
    n.walker.y = L.y + 16;
  });
  await expect(page.locator('#climb')).toHaveText('Talk to Captain Cappy', { timeout: 4000 });
  await page.click('#climb');
  await page.click('#endlessFight');
  await page.click('#endlessRoles [data-role="healer"]');
  await page.evaluate(() => {
    (window.__np.ctf as Ctf).gateT = 0.05;
  });
  await page.waitForFunction(() => window.__np.ctf?.phase === 'fight', null, { timeout: 3000 });
  // Nobody else up; one foe, stood still 200 away, far past a blade.
  await page.evaluate(() => {
    const c = window.__np.ctf as Ctf;
    for (const f of c.fighters)
      if (f.bot) {
        f.state = 'down';
        f.downT = 9999;
      }
    const foe = c.fighters.find((f) => f.side === 'ninja' && f.role === 'damage') as CtfFighter;
    foe.state = 'live';
    foe.cd = 99;
    foe.stunT = 99;
    foe.abCd = foe.abCd.map(() => 99);
    foe.u = c.you.u + 200;
    foe.v = c.you.v;
  });
  await expect(page.locator('#throw')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#throw')).toHaveClass(/fling/);
  await expect(page.locator('#throw')).not.toHaveClass(/knife/);
  await expect(page.locator('#throw')).toHaveAttribute('aria-label', 'Throw');
  await page.dispatchEvent('#throw', 'pointerdown', { button: 0 });
  await page.waitForFunction(
    () =>
      (
        (window.__np.ctf as Ctf).fighters.find(
          (f) => f.side === 'ninja' && f.role === 'damage',
        ) as CtfFighter
      ).hp < 8,
    null,
    { timeout: 3000 },
  );
  // Out past 220, no throw.
  await page.evaluate(() => {
    const c = window.__np.ctf as Ctf;
    const foe = c.fighters.find((f) => f.side === 'ninja' && f.role === 'damage') as CtfFighter;
    foe.u = c.you.u + 260;
  });
  await expect(page.locator('#throw')).toBeHidden({ timeout: 3000 });
  await page.click('#ctfLeave');
  await page.click('#ctfLeave');
  await expect(page.locator('#throw')).toBeHidden();
  expect(errors).toEqual([]);
});

test('Hold the Forts: the leader offers it, the three bases neutral, the Cannon Battery taken by standing in its ring, points for it, and the win', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    endless: { seen: true, pirate: true, ninja: true },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -2980, y: 7780, h: (3 * Math.PI) / 4, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.DOCK13.pirate;
    n.boat.x = d.x;
    n.boat.y = d.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    const n = window.__np;
    const L = n.LEADER13.pirate;
    n.walker.x = L.x + 16;
    n.walker.y = L.y + 16;
  });
  await expect(page.locator('#climb')).toHaveText('Talk to Captain Cappy', { timeout: 4000 });
  await page.click('#climb');
  // Both battles on offer; this one's own word on picking.
  await expect(page.locator('#endlessFight')).toBeVisible();
  await expect(page.locator('#endlessForts')).toHaveText('Fight: Hold the Forts');
  await page.click('#endlessForts');
  await expect(page.locator('#endlessSay')).toContainText('Hold the forts');
  const before = await page.evaluate(() => window.__np.coins);
  await page.click('#endlessRoles [data-role="damage"]');
  await expect(page.locator('#ctfHolds')).toBeVisible();
  await expect(page.locator('#ctfHolds span')).toHaveText(['Cannon', 'Wreck', 'Bell']);
  expect(
    await page.evaluate(() => {
      const c = window.__np.ctf as Ctf;
      return [c.mode, c.holds.map((h) => h.owner)];
    }),
  ).toEqual(['forts', [null, null, null]]);
  await page.evaluate(() => {
    (window.__np.ctf as Ctf).gateT = 0.05;
  });
  await page.waitForFunction(() => window.__np.ctf?.phase === 'fight', null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('take the bases');
  // Everyone else out of it; into the Cannon Battery's ring, and stay five seconds.
  await page.evaluate(() => {
    const n = window.__np;
    const c = n.ctf as Ctf;
    for (const f of c.fighters)
      if (f.bot) {
        f.state = 'down';
        f.downT = 9999;
      }
    const h = c.holds[0] as Ctf['holds'][number];
    const [x, y] = n.fromEndless(h.u + 26, h.v);
    n.walker.x = x;
    n.walker.y = y;
  });
  await expect(page.locator('#ctfWhat')).toContainText('Taking it', { timeout: 3000 });
  await page.waitForFunction(() => (window.__np.ctf as Ctf).holds[0]?.owner === 'pirate', null, {
    timeout: 8000,
  });
  await expect(page.locator('#toast')).toContainText(
    'You took the Cannon Battery! We hold 1 of 3.',
  );
  await expect(page.locator('#ctfHolds span').first()).toHaveClass(/pirate/);
  await expect(page.locator('#ctfWhat')).toHaveText('Holding it');
  // A point a second for it.
  await page.waitForFunction(() => (window.__np.ctf as Ctf).score.pirate >= 2, null, {
    timeout: 4000,
  });
  await expect(page.locator('#ctfBarP')).not.toHaveText('0');
  // Near the total, and over it: the win, its pay, and the bases you took.
  await page.evaluate(() => {
    (window.__np.ctf as Ctf).score.pirate = 399;
  });
  await expect(page.locator('#ctfCard')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#ctfTitle')).toHaveText('The pirates win!');
  await expect(page.locator('#ctfP')).toHaveText('400');
  await expect(page.locator('#ctfStats')).toContainText('Bases you took1');
  expect(await page.evaluate(() => window.__np.coins)).toBe(before + 500);
  await page.click('#ctfDone');
  await expect(page.locator('#ctfBar')).toBeHidden();
  expect(errors).toEqual([]);
});

test('the Ninja Slalom: the chairlift at the peak, how it goes, a lantern sliced and a flip off a jump, over the finish for its time, its medal and coins, opening the Fox Run; then the run card, down the Fox Run, opening the Doom Drop; down it, the yeti after you and swiping you once, stopped early, its time not kept', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    endless: { seen: true, pirate: true, ninja: false },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -2980, y: 7780, h: (3 * Math.PI) / 4, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.DOCK13.ninja;
    n.boat.x = d.x;
    n.boat.y = d.y;
    n.boat.v = 0;
    n.boat.h = -Math.PI / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // Open to anyone who has landed, the ninjas joined or not.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.LIFT13.x + 4;
    n.walker.y = n.LIFT13.y + 4;
  });
  await expect(page.locator('#climb')).toHaveText('Ride the chairlift', { timeout: 4000 });
  const before = await page.evaluate(() => window.__np.coins);
  await page.click('#climb');
  await page.waitForFunction(() => !!window.__np.ski);
  // How it goes first, on the first run; the trick button skips it.
  expect(await page.evaluate(() => (window.__np.ski as Ski).howTo)).toBe(true);
  await expect(page.locator('#leave')).toHaveText('Stop the run');
  await expect(page.locator('#skiTrick')).toBeVisible();
  await expect(page.locator('#climb')).toBeHidden();
  await page.dispatchEvent('#skiTrick', 'pointerdown', { button: 0 });
  expect(await page.evaluate(() => (window.__np.ski as Ski).howTo)).toBe(false);
  await page.waitForFunction(() => (window.__np.ski as Ski).state === 'ski', null, {
    timeout: 4000,
  });
  // A lantern, right on the skier's line: sliced on the way past.
  await page.evaluate(() => {
    const s = window.__np.ski as Ski;
    const l = s.course.find((f) => f.kind === 'lantern') as SkiFeature;
    s.z = l.z - 12;
    s.x = l.x;
    s.vx = 0;
  });
  await page.waitForFunction(() => (window.__np.ski as Ski).lanterns === 1, null, {
    timeout: 4000,
  });
  // A jump, its middle, and a flip tapped as it takes off: landed for a second off.
  await page.evaluate(() => {
    const s = window.__np.ski as Ski;
    const j = s.course.find((f) => f.kind === 'jump') as SkiFeature;
    s.z = j.z - 10;
    s.x = (j.x0 + j.x1) / 2;
    s.vx = 0;
    s.v = 12;
  });
  await page.waitForFunction(() => (window.__np.ski as Ski).air, null, { timeout: 4000 });
  await page.dispatchEvent('#skiTrick', 'pointerdown', { button: 0 });
  expect(await page.evaluate(() => (window.__np.ski as Ski).trick)).toBe('flip');
  await page.waitForFunction(() => !(window.__np.ski as Ski).air, null, { timeout: 4000 });
  const mid = await page.evaluate(() => {
    const s = window.__np.ski as Ski;
    return { tricks: s.tricks, state: s.state, bonus: s.bonus };
  });
  expect(mid).toEqual({ tricks: 1, state: 'ski', bonus: 1 });
  // On to the finish: its time kept, the lantern paid for, and back at the chairlift.
  await page.evaluate(() => {
    const s = window.__np.ski as Ski;
    s.z = s.run.len - 15;
    s.x = 0;
  });
  await page.waitForFunction(() => window.__np.ski?.state === 'done', null, { timeout: 4000 });
  await page.waitForFunction(() => !window.__np.ski, null, { timeout: 6000 });
  const after = await page.evaluate(() => ({
    coins: window.__np.coins,
    slalom: window.__np.endless.slalom,
  }));
  expect(after.coins).toBe(before + 10);
  expect(after.slalom?.runs).toBe(1);
  expect(after.slalom?.best.bunny).toBeGreaterThan(0);
  // That quick, a gold medal; and the run after it opened.
  await expect(page.locator('#toast')).toContainText('A gold medal!');
  await expect(page.locator('#toast')).toContainText('The Fox Run is open');
  await expect(page.locator('#skiTrick')).toBeHidden();
  await expect(page.locator('#leave')).toBeHidden();
  await expect(page.locator('#climb')).toHaveText('Ride the chairlift', { timeout: 4000 });
  // Again: now a card of the runs, the Doom Drop shut till the Fox Run is done; down the Fox Run, with no how it goes
  // this time, to its end, and that opens the Doom Drop.
  await page.click('#climb');
  await expect(page.locator('#skiCard')).toBeVisible();
  await expect(page.locator('#skiRuns [data-run="bunny"]')).toContainText('Gold');
  await expect(page.locator('#skiRuns [data-run="fox"]')).toBeEnabled();
  await expect(page.locator('#skiRuns [data-run="doom"]')).toBeDisabled();
  await expect(page.locator('#skiRuns [data-run="doom"]')).toContainText('Ski the Fox Run');
  await page.click('#skiRuns [data-run="fox"]');
  await expect(page.locator('#skiCard')).toBeHidden();
  await page.waitForFunction(() => window.__np.ski?.run.name === 'Fox Run');
  expect(await page.evaluate(() => (window.__np.ski as Ski).howTo)).toBe(false);
  await page.waitForFunction(() => (window.__np.ski as Ski).state === 'ski', null, {
    timeout: 4000,
  });
  await page.evaluate(() => {
    const s = window.__np.ski as Ski;
    s.z = s.run.len - 15;
    s.x = 0;
  });
  await page.waitForFunction(() => !window.__np.ski, null, { timeout: 8000 });
  await expect(page.locator('#toast')).toContainText('The Doom Drop is open');
  const fox = await page.evaluate(() => window.__np.endless.slalom);
  expect(fox?.runs).toBe(2);
  expect(fox?.best.fox).toBeGreaterThan(0);
  // Down the Doom Drop: the yeti roars at the go and sets off after you; caught, a swipe into a tumble.
  await expect(page.locator('#climb')).toHaveText('Ride the chairlift', { timeout: 4000 });
  await page.click('#climb');
  await expect(page.locator('#skiRuns [data-run="doom"]')).toBeEnabled();
  await page.click('#skiRuns [data-run="doom"]');
  await page.waitForFunction(() => window.__np.ski?.run.name === 'Doom Drop');
  await page.waitForFunction(() => (window.__np.ski as Ski).state === 'ski', null, {
    timeout: 4000,
  });
  await page.waitForFunction(() => (window.__np.ski as Ski).yetiRoar <= 0, null, {
    timeout: 4000,
  });
  await page.evaluate(() => {
    const s = window.__np.ski as Ski;
    s.yetiZ = s.z - 0.5;
  });
  await page.waitForFunction(() => (window.__np.ski as Ski).swiped === 1, null, {
    timeout: 4000,
  });
  expect(await page.evaluate(() => (window.__np.ski as Ski).state)).toBe('tumble');
  // Stopped partway, the run is not kept.
  await page.click('#leave');
  expect(await page.evaluate(() => window.__np.ski)).toBeNull();
  expect(await page.evaluate(() => window.__np.endless.slalom)).toEqual(fox);
  await expect(page.locator('#leave')).toBeHidden();
  expect(errors).toEqual([]);
});

test("the side rewards' outfits: a third pirate badge wins the captain's coat and tricorn, put straight on; the character card offers it, the ninja garb still to win; and gold on the last ski run wins the snow ninja's whites", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    endless: {
      seen: true,
      pirate: true,
      ninja: true,
      battles: {
        fought: 2,
        won: 1,
        marks: {
          pirate: { tank: 0, damage: 3, healer: 0 },
          ninja: { tank: 0, damage: 0, healer: 0 },
        },
      },
      slalom: { runs: 2, best: { bunny: 43, fox: 53 } },
    },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -2980, y: 7780, h: (3 * Math.PI) / 4, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.DOCK13.pirate;
    n.boat.x = d.x;
    n.boat.y = d.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  const toCappy = async () => {
    await page.evaluate(() => {
      const n = window.__np;
      const L = n.LEADER13.pirate;
      n.walker.x = L.x + 16;
      n.walker.y = L.y + 16;
    });
    await expect(page.locator('#climb')).toHaveText('Talk to Captain Cappy', { timeout: 4000 });
    await page.click('#climb');
    await page.click('#endlessFight');
  };
  // Two pirate badges so far (Badge II as a Swashbuckler): the card names the next reward.
  await toCappy();
  await expect(page.locator('#endlessRoles .reward')).toContainText(
    "At 3 badges as a pirate, all three roles counted: the captain's coat and tricorn. You have 2.",
  );
  expect(await page.evaluate(() => window.__np.charLook.outfit)).toBe('none');
  // A first battle as a healer, lost at the bell: Badge I there, the third badge.
  await page.click('#endlessRoles [data-role="healer"]');
  await page.evaluate(() => {
    (window.__np.ctf as Ctf).gateT = 0.05;
  });
  await page.waitForFunction(() => window.__np.ctf?.phase === 'fight', null, { timeout: 3000 });
  await page.evaluate(() => {
    const c = window.__np.ctf as Ctf & { clock: number };
    c.score.ninja = 1;
    c.clock = 0.01;
  });
  await expect(page.locator('#ctfResults')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#ctfReward')).toContainText('3 badges as a pirate!');
  await expect(page.locator('#ctfReward')).toContainText("the captain's coat and tricorn");
  expect(await page.evaluate(() => window.__np.charLook.outfit)).toBe('captain');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect(saved.look.outfit).toBe('captain');
  await page.click('#ctfDone');
  // The card at the leader says it is won.
  await toCappy();
  await expect(page.locator('#endlessRoles .reward')).toContainText(
    "Won so far: the captain's coat and tricorn. At 6 badges as a pirate, all three roles counted: the Jolly Roger. You have 3.",
  );
  await page.click('#endlessClose');
  // The character card: your own clothes, the coat on, the ninja garb still to win, and how.
  await page.locator('#charBtn').dispatchEvent('click');
  const outfit = (k: string) => page.locator(`#charOptions [data-key="outfit"][data-val="${k}"]`);
  await expect(outfit('captain')).toHaveClass(/on/);
  await expect(outfit('none')).toBeEnabled();
  await expect(outfit('ninja')).toBeDisabled();
  await expect(outfit('snow')).toBeDisabled();
  await expect(page.locator('#charOptions')).toContainText(
    'Ninja garb: win it with 3 ninja badges.',
  );
  await expect(page.locator('#charOptions')).toContainText(
    'Snow ninja: win it with gold on all three ski runs.',
  );
  await outfit('none').click();
  expect(await page.evaluate(() => window.__np.charLook.outfit)).toBe('none');
  // A preset keeps the outfit chosen.
  await outfit('captain').click();
  await page.click('#charPresets [data-preset="finn"]');
  expect(await page.evaluate(() => window.__np.charLook.outfit)).toBe('captain');
  await page.click('#charClose');
  // Gold on the Doom Drop, the last of the three: the snow ninja's whites, put straight on.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.LIFT13.x + 4;
    n.walker.y = n.LIFT13.y + 4;
  });
  await expect(page.locator('#climb')).toHaveText('Ride the chairlift', { timeout: 4000 });
  await page.click('#climb');
  await page.click('#skiRuns [data-run="doom"]');
  await page.waitForFunction(() => window.__np.ski?.run.name === 'Doom Drop');
  await page.dispatchEvent('#skiTrick', 'pointerdown', { button: 0 });
  await page.waitForFunction(() => (window.__np.ski as Ski).state === 'ski', null, {
    timeout: 4000,
  });
  await page.evaluate(() => {
    const s = window.__np.ski as Ski;
    s.z = s.run.len - 15;
    s.x = 0;
  });
  await page.waitForFunction(() => !window.__np.ski, null, { timeout: 8000 });
  expect(await page.evaluate(() => window.__np.charLook.outfit)).toBe('snow');
  await expect(page.locator('#toast')).toContainText('A gold medal!');
  await page.click('#toast');
  await expect(page.locator('#toast')).toContainText('Gold on all three runs!', { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText("the snow ninja's whites");
  expect(errors).toEqual([]);
});

test("the side rewards' flags, paints and titles: the Jolly Roger at six pirate badges, flown with a tap and its emblem for any flag; a ninth badge wins the Pirate Lord hull paint, the title Pirate Lord and the cutlass", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    endless: {
      seen: true,
      pirate: true,
      ninja: true,
      battles: {
        fought: 14,
        won: 9,
        marks: {
          pirate: { tank: 8, damage: 8, healer: 6 },
          ninja: { tank: 0, damage: 0, healer: 0 },
        },
      },
    },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -2980, y: 7780, h: (3 * Math.PI) / 4, clock: 0.3, hold: [] },
  });
  // Eight pirate badges: the Jolly Roger is won, flown from the flag designer, and the ninjas' still to win.
  await page.locator('#flagBtn').dispatchEvent('click');
  const won = (k: string) => page.locator(`#fWon [data-won="${k}"]`);
  await expect(won('jolly')).toBeEnabled();
  await expect(won('banner')).toBeDisabled();
  await expect(page.locator('#fWon')).toContainText('Ninja banner: win it with 6 ninja badges.');
  // Its emblem joins the rest; the ninjas' star does not, yet.
  await expect(page.locator('#fEmblem [aria-label="jolly"]')).toHaveCount(1);
  await expect(page.locator('#fEmblem [aria-label="shuriken"]')).toHaveCount(0);
  await won('jolly').click();
  await page.click('#flagDone');
  const flag = await page.evaluate(
    () => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').flag,
  );
  expect(flag).toEqual({ field: 8, accent: 2, pattern: 0, emblem: 7 });
  // Not yet the paint: the tiers' ten.
  expect(await page.locator('#paints .sw').count()).toBe(10);
  // A win as a healer, to Badge III there: the ninth badge, and the Pirate Lord hull paint.
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.DOCK13.pirate;
    n.boat.x = d.x;
    n.boat.y = d.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    const n = window.__np;
    const L = n.LEADER13.pirate;
    n.walker.x = L.x + 16;
    n.walker.y = L.y + 16;
  });
  await expect(page.locator('#climb')).toHaveText('Talk to Captain Cappy', { timeout: 4000 });
  await page.click('#climb');
  await page.click('#endlessFight');
  await expect(page.locator('#endlessRoles .reward')).toContainText(
    "At 9 badges as a pirate, all three roles counted: the Pirate Lord hull paint, black and red, the title Pirate Lord and Captain Cappy's cutlass for your trophy hall. You have 8.",
  );
  await page.click('#endlessRoles [data-role="healer"]');
  await page.evaluate(() => {
    (window.__np.ctf as Ctf).gateT = 0.05;
  });
  await page.waitForFunction(() => window.__np.ctf?.phase === 'fight', null, { timeout: 3000 });
  await page.evaluate(() => {
    const c = window.__np.ctf as Ctf & { clock: number };
    c.score.pirate = 1;
    c.clock = 0.01;
  });
  await expect(page.locator('#ctfBadge')).toBeVisible({ timeout: 4000 });
  await page.click('#ctfBadgeOn');
  await expect(page.locator('#ctfReward')).toContainText('9 badges as a pirate!');
  await expect(page.locator('#ctfReward')).toContainText(
    "You've won the Pirate Lord hull paint, black and red: paint your boat with it in the shop.",
  );
  // The title, under your name now, and the cutlass for a trophy hall.
  await expect(page.locator('#ctfReward')).toContainText(
    "You're the Pirate Lord! It's under your name on Your character.",
  );
  await expect(page.locator('#ctfReward')).toContainText(
    "Captain Cappy's cutlass is yours, for your trophy hall, when you have one.",
  );
  expect(await page.evaluate(() => window.__np.charLook.title)).toBe('lord');
  await page.click('#ctfDone');
  expect(await page.locator('#paints .sw').count()).toBe(11);
  await page.locator('#paints [aria-label="Pirate Lord"]').dispatchEvent('click');
  await page.waitForFunction(() => window.__np.paint === 11, null, { timeout: 2000 });
  // All nine: Captain Cappy greets you by your title, and the card at the leader lists what is yours.
  await page.click('#climb');
  await expect(page.locator('#endlessSay')).toContainText('Ahoy, Pirate Lord!');
  await page.click('#endlessFight');
  await expect(page.locator('#endlessRoles .reward')).toContainText(
    "All 9 badges as a pirate! Yours: the captain's coat and tricorn, the Jolly Roger, the Pirate Lord hull paint, black and red, the title Pirate Lord and Captain Cappy's cutlass for your trophy hall.",
  );
  await page.click('#endlessClose');
  // On the character card, under the name, and to pick from.
  await page.locator('#charBtn').dispatchEvent('click');
  await expect(page.locator('#charName')).toContainText('Pirate Lord');
  await page.click('#charOptions [data-key="title"][data-val="none"]');
  await expect(page.locator('#charName')).not.toContainText('Pirate Lord');
  await expect(page.locator('#charOptions [data-key="title"][data-val="master"]')).toHaveCount(0);
  await page.click('#charClose');
  expect(errors).toEqual([]);
});

test("the side rewards in your trophy hall: Captain Cappy's cutlass and Master Sensei's katana either side of the treasure dais, and the golden mirror behind it, for all nine badges of both sides", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 1000,
    spear: 4,
    day: 5,
    towerTaken: true,
    isle4Stage: 1,
    isle5Stage: 1,
    isle7Seen: true,
    isle7Stage: 4,
    cryptWon: true,
    castleHQ: true,
    scanner: 1,
    endless: {
      seen: true,
      pirate: true,
      ninja: true,
      battles: {
        fought: 40,
        won: 30,
        marks: {
          pirate: { tank: 8, damage: 8, healer: 8 },
          ninja: { tank: 8, damage: 8, healer: 3 },
        },
      },
    },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  for (const [floor, y, r] of [
    [12, -6000, 170],
    [13, -6900, 160],
  ] as const) {
    await page.evaluate(
      ([y0, r0]) => {
        window.__np.walker.x = -13500 - r0 * 0.6 * Math.SQRT1_2 + 6;
        window.__np.walker.y = y0 - r0 * 0.6 * Math.SQRT1_2 + 6;
      },
      [y, r] as const,
    );
    await expect(page.locator('#climb')).toHaveText('Through the door', { timeout: 3000 });
    await page.click('#climb');
    await page.waitForFunction((f) => window.__np.floor === f + 1, floor);
  }
  // The hall's middle, from the dais, and each piece by its place round it.
  const mid = await page.evaluate(() => window.__np.HQ_HEAP);
  const at = async (dx: number, dy: number) => {
    await page.evaluate(
      ([x, y]) => {
        window.__np.walker.x = x as number;
        window.__np.walker.y = y as number;
      },
      [mid.x + dx, mid.y + dy] as const,
    );
  };
  const k = Math.SQRT1_2;
  // All nine pirate badges: the cutlass on its stand to the left of the dais.
  await at(-72 * k + 14, 72 * k);
  await expect(page.locator('#climb')).toHaveText("Look at Captain Cappy's cutlass", {
    timeout: 3000,
  });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('Pirate Lord');
  // Not yet the ninjas': an empty stand that says how; nor the mirror, for both.
  await at(72 * k - 14, -72 * k);
  await expect(page.locator('#climb')).toHaveText('Look at the empty stand', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText(
    'Win all nine ninja badges on the Endless Isle.',
  );
  await at(-62 * k - 14, -62 * k);
  await expect(page.locator('#climb')).toHaveText('Look at the empty stand', { timeout: 3000 });
  // A stand stops you walking through it.
  await at(-72 * k + 2, 72 * k);
  await page.waitForTimeout(200);
  const pushed = await page.evaluate(
    ([x, y]) =>
      Math.hypot(window.__np.walker.x - (x as number), window.__np.walker.y - (y as number)),
    [mid.x - 72 * k, mid.y + 72 * k] as const,
  );
  expect(pushed).toBeGreaterThanOrEqual(9);
  // All nine on both sides: the katana, and the golden mirror.
  await page.evaluate(() => {
    const n = window.__np;
    const e = n.endless as unknown as { battles: { marks: { ninja: { healer: number } } } };
    e.battles.marks.ninja.healer = 8;
  });
  await at(-62 * k - 14, -62 * k);
  await expect(page.locator('#climb')).toHaveText('Look at the golden mirror', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('two of everything look back');
  expect(errors).toEqual([]);
});

test("gold badges: the last rung, a place's Badge III gone gold at 20 marks, its ceremony with no new power, a title, and gold trim on the ability buttons", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    endless: {
      seen: true,
      pirate: true,
      ninja: true,
      battles: {
        fought: 12,
        won: 8,
        marks: {
          pirate: { tank: 0, damage: 19, healer: 0 },
          ninja: { tank: 0, damage: 0, healer: 0 },
        },
      },
    },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -2980, y: 7780, h: (3 * Math.PI) / 4, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.DOCK13.pirate;
    n.boat.x = d.x;
    n.boat.y = d.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  const toCappy = async () => {
    await page.evaluate(() => {
      const n = window.__np;
      const L = n.LEADER13.pirate;
      n.walker.x = L.x + 16;
      n.walker.y = L.y + 16;
    });
    await expect(page.locator('#climb')).toHaveText('Talk to Captain Cappy', { timeout: 4000 });
    await page.click('#climb');
    await page.click('#endlessFight');
  };
  await toCappy();
  const damage = page.locator('#endlessRoles [data-role="damage"]');
  await expect(damage).toContainText('Badge III');
  await expect(damage).toContainText(
    'Gold at 20 marks: no new power, but a gold badge and a title. You have 19.',
  );
  await damage.click();
  // No gold yet: no trim.
  expect(await page.evaluate(() => document.body.classList.contains('goldBadge'))).toBe(false);
  await page.evaluate(() => {
    (window.__np.ctf as Ctf).gateT = 0.05;
  });
  await page.waitForFunction(() => window.__np.ctf?.phase === 'fight', null, { timeout: 3000 });
  await page.evaluate(() => {
    const c = window.__np.ctf as Ctf & { clock: number };
    c.score.pirate = 1;
    c.clock = 0.01;
  });
  // A win: 21 marks, and the gold badge's ceremony, with no new ability to show.
  await expect(page.locator('#ctfBadge')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#ctfBadgeTitle')).toHaveText('A gold badge!');
  await expect(page.locator('#ctfMedal')).toHaveAttribute('data-gold', '1');
  await expect(page.locator('#ctfBadgeSay')).toContainText('Gold!');
  await expect(page.locator('#ctfBadgeAb')).toContainText(
    "No new power: your badge is gold, and you're the Golden Swashbuckler.",
  );
  await expect(page.locator('#ctfBadgeShow')).toBeHidden();
  expect(await page.evaluate(() => window.__np.charLook.title)).toBe('gold-pirate-damage');
  await page.click('#ctfBadgeOn');
  await expect(page.locator('#ctfStats')).toContainText('21, a gold badge');
  await page.click('#ctfDone');
  // The card says gold; and the next battle in that place has the gold trim on its buttons.
  await toCappy();
  await expect(damage).toContainText('Gold badge');
  await expect(damage).toHaveClass(/gold/);
  await damage.click();
  expect(await page.evaluate(() => document.body.classList.contains('goldBadge'))).toBe(true);
  expect(errors).toEqual([]);
});

test("the Treehouse Climb: in at the foot of the great tree, how it goes, the arrows and the jump, up the Barrel Planks, on up the Rope Swings, a rope swung on, on up the Bucket Lifts, a lift ridden and a lever pulled, and on up the Crow's Nest, its pegs knocked out and the pirates' treasure won, for the coins and times; then the stage card, and a climb left early, not kept", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    endless: { seen: true, pirate: false, ninja: true },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -2980, y: 7780, h: (3 * Math.PI) / 4, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.DOCK13.pirate;
    n.boat.x = d.x;
    n.boat.y = d.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // Open to anyone who has landed, the pirates joined or not.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.TREE13.x + 4;
    n.walker.y = n.TREE13.y + 4;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the great tree', { timeout: 4000 });
  const before = await page.evaluate(() => window.__np.coins);
  await page.click('#climb');
  await page.waitForFunction(() => !!window.__np.th);
  // How it goes first, on the first climb; the jump button skips it.
  expect(await page.evaluate(() => (window.__np.th as Climb).howTo)).toBe(true);
  await expect(page.locator('#leave')).toHaveText('Climb down');
  await expect(page.locator('#thPad')).toBeVisible();
  await expect(page.locator('#thJump')).toBeVisible();
  await expect(page.locator('#climb')).toBeHidden();
  await page.dispatchEvent('#thJump', 'pointerdown', { button: 0 });
  expect(await page.evaluate(() => (window.__np.th as Climb).howTo)).toBe(false);
  await page.waitForFunction(() => window.__np.th?.phase === 'climb', null, { timeout: 4000 });
  await page.evaluate(() => {
    (window.__np.th as Climb).nextRoll = 1e9;
  });
  // A thumb on the arrows' right: along the bottom plank, and the climber stays clear of the arrows on the screen.
  const x0 = await page.evaluate(() => (window.__np.th as Climb).x);
  const pad = await page.locator('#thPad').boundingBox();
  if (!pad) throw new Error('no arrows');
  await page.mouse.move(pad.x + pad.width - 12, pad.y + pad.height / 2);
  await page.mouse.down();
  await page.waitForFunction((x0) => (window.__np.th as Climb).x > x0 + 20, x0, { timeout: 4000 });
  await expect(page.locator('#thPad i[data-d="r"]')).toHaveClass(/on/);
  await page.mouse.up();
  const feet = await page.evaluate(() => {
    const c = window.__np.th as Climb;
    return window.__np.thAt(c.x, c.y);
  });
  expect(feet[1]).toBeLessThan(pad.y);
  await page.dispatchEvent('#thJump', 'pointerdown', { button: 0 });
  await page.waitForFunction(() => (window.__np.th as Climb).air, null, { timeout: 2000 });
  await page.waitForFunction(() => !(window.__np.th as Climb).air, null, { timeout: 3000 });
  // Up the last ladder to the ledge with the door: the stage climbed.
  await page.evaluate(() => {
    const c = window.__np.th as Climb;
    const L = c.stage.ladders.find((l) => l.lo === 5) as { x: number; lo: number };
    c.ladder = L;
    c.plank = -1;
    c.x = L.x;
    c.y = 372;
  });
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => window.__np.th?.phase === 'clear', null, { timeout: 4000 });
  await page.keyboard.up('ArrowUp');
  // Its time kept at once; then in at the door and on up to the Rope Swings, its own how it goes first.
  expect(await page.evaluate(() => window.__np.endless.climbs?.best[1] ?? 0)).toBeGreaterThan(0);
  await page.waitForFunction(() => window.__np.th?.stage.name === 'Rope Swings', null, {
    timeout: 8000,
  });
  expect(await page.evaluate(() => (window.__np.th as Climb).howTo)).toBe(true);
  await page.dispatchEvent('#thJump', 'pointerdown', { button: 0 });
  await page.waitForFunction(() => window.__np.th?.phase === 'climb', null, { timeout: 4000 });
  // Off the first platform onto the rope as it swings near, for its coins.
  await page.evaluate(() => {
    const c = window.__np.th as Climb;
    c.x = 144;
    c.plank = 1;
    c.y = 80;
    c.safeT = 99;
  });
  await page.waitForFunction(
    () => {
      const c = window.__np.th as Climb;
      return c.ropeAngle(0) > (c.stage.ropes?.[0]?.amp ?? 0) * 0.88;
    },
    null,
    { timeout: 6000 },
  );
  await page.dispatchEvent('#thJump', 'pointerdown', { button: 0 });
  await page.waitForFunction(() => (window.__np.th as Climb).rope === 0, null, { timeout: 2000 });
  expect(await page.evaluate(() => (window.__np.th as Climb).coins)).toBe(5);
  // Up its last ladder: the Rope Swings climbed, and on up to the Bucket Lifts.
  await page.evaluate(() => {
    const c = window.__np.th as Climb;
    const L = c.stage.ladders.find((l) => l.lo === 6) as { x: number; lo: number };
    c.rope = -1;
    c.ladder = L;
    c.plank = -1;
    c.x = L.x;
    c.y = 352;
  });
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => window.__np.th?.phase === 'clear', null, { timeout: 4000 });
  await page.keyboard.up('ArrowUp');
  expect(await page.evaluate(() => window.__np.endless.climbs?.best[2] ?? 0)).toBeGreaterThan(0);
  await page.waitForFunction(() => window.__np.th?.stage.name === 'Bucket Lifts', null, {
    timeout: 8000,
  });
  expect(await page.evaluate(() => (window.__np.th as Climb).howTo)).toBe(true);
  await page.dispatchEvent('#thJump', 'pointerdown', { button: 0 });
  await page.waitForFunction(() => window.__np.th?.phase === 'climb', null, { timeout: 4000 });
  // Stood under the lift going up, the next bucket round scoops the climber up.
  await page.evaluate(() => {
    const c = window.__np.th as Climb;
    c.safeT = 99;
    c.x = 36;
  });
  await page.waitForFunction(() => !!(window.__np.th as Climb).bucket, null, { timeout: 8000 });
  // Along the first ledge into its lever: the bridge beyond comes down, for its coins.
  await page.evaluate(() => {
    const c = window.__np.th as Climb;
    c.bucket = null;
    c.air = false;
    c.plank = 1;
    c.x = 80;
    c.y = 120;
  });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => (window.__np.th as Climb).pulled[0], null, { timeout: 3000 });
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => (window.__np.th as Climb).coins)).toBe(10);
  // The top ledge's bridge down too, and over it to the door, on up to the very top.
  await page.evaluate(() => {
    const c = window.__np.th as Climb;
    c.pulled[1] = true;
    c.lowered[1] = 1;
    c.plank = 5;
    c.x = 80;
    c.y = 290;
  });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__np.th?.phase === 'clear', null, { timeout: 4000 });
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.__np.endless.climbs?.best[3] ?? 0)).toBeGreaterThan(0);
  await page.waitForFunction(() => window.__np.th?.stage.name === "Crow's Nest", null, {
    timeout: 8000,
  });
  expect(await page.evaluate(() => (window.__np.th as Climb).howTo)).toBe(true);
  await page.dispatchEvent('#thJump', 'pointerdown', { button: 0 });
  await page.waitForFunction(() => window.__np.th?.phase === 'climb', null, { timeout: 4000 });
  // The gorilla holding on to its monkeys, and every peg out but the last; over that one, and the crow's nest gives
  // way, the gorilla into the sea, and down from the tree with the treasure.
  await page.evaluate(() => {
    const c = window.__np.th as Climb;
    c.nextToss = 1e9;
    c.pegs.forEach((g, i) => {
      if (i < 7) g.out = 0;
    });
    c.plank = 4;
    c.x = 150;
    c.y = 290;
    c.safeT = 99;
  });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__np.th?.phase === 'clear', null, { timeout: 4000 });
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => (window.__np.th as Climb).coins)).toBe(10 + 100);
  await page.waitForFunction(() => !window.__np.th, null, { timeout: 10000 });
  const after = await page.evaluate(() => ({
    coins: window.__np.coins,
    climbs: window.__np.endless.climbs,
  }));
  expect(after.coins).toBe(before + 100 + 5 + 100 + 10 + 100 + 10 + 100 + 1000);
  expect(after.climbs?.climbs).toBe(1);
  expect(after.climbs?.top).toBe(4);
  expect(after.climbs?.best[4]).toBeGreaterThan(0);
  await expect(page.locator('#toast')).toContainText("the pirates' treasure among them");
  await expect(page.locator('#thPad')).toBeHidden();
  await expect(page.locator('#thJump')).toBeHidden();
  await expect(page.locator('#leave')).toBeHidden();
  await expect(page.locator('#climb')).toHaveText('Climb the great tree', { timeout: 4000 });
  // Again: now a card to pick where to start, the stages above still being built shut; then down again straight
  // away, with no how it goes this time, and the climb is not kept.
  await page.click('#climb');
  await expect(page.locator('#treeCard')).toBeVisible();
  await expect(page.locator('#treeStages [data-stage="1"]')).toBeEnabled();
  await expect(page.locator('#treeStages [data-stage="4"]')).toBeEnabled();
  await page.click('#treeStages [data-stage="4"]');
  await expect(page.locator('#treeCard')).toBeHidden();
  await page.waitForFunction(() => window.__np.th?.stage.name === "Crow's Nest");
  expect(await page.evaluate(() => (window.__np.th as Climb).howTo)).toBe(false);
  await page.click('#leave');
  expect(await page.evaluate(() => window.__np.th)).toBeNull();
  expect(await page.evaluate(() => window.__np.endless.climbs)).toEqual(after.climbs);
  await expect(page.locator('#leave')).toBeHidden();
  expect(errors).toEqual([]);
});

test("Skull Island: Skrill's men in bone armour come on in pairs, sweep a red fan, and fall apart into bones", async ({
  context,
  page,
}) => {
  // Ashore off its chin, in the Honor Guard armour, with a spear.
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    armour: 5,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    isle12Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 9700, y: 9700, h: (-3 * Math.PI) / 4, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    const [x, y] = n.fromSkull(0, 1610);
    n.boat.x = x;
    n.boat.y = y;
    n.boat.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // All on guard at the landing; up the jaw, the pair guarding it raise their jawblades and come on.
  expect(
    await page.evaluate(() => window.__np.boneMen.list.every((m) => m.state === 'guard')),
  ).toBe(true);
  await page.evaluate(() => {
    const n = window.__np;
    const [x, y] = n.fromSkull(0, 1260);
    n.walker.x = x;
    n.walker.y = y;
  });
  await expect(page.locator('#toast')).toContainText('bone armour', { timeout: 4000 });
  expect(
    await page.evaluate(() => window.__np.boneMen.list.filter((m) => m.state !== 'guard').length),
  ).toBe(2);
  // Standing still, a sweep lands: two hearts.
  const h0 = await page.evaluate(() => window.__np.hearts);
  await page.waitForFunction((h) => window.__np.hearts <= h - 2, h0, { timeout: 8000 });
  // Seventeen hits on each of the pair, and a throw lands the eighteenth: his armour falls apart, and 70 coins.
  const c0 = await page.evaluate(() => window.__np.coins);
  await page.evaluate(() => {
    const n = window.__np;
    for (const m of n.boneMen.list.filter((o) => o.state !== 'guard')) n.boneMen.hit(m, 17);
  });
  await page.waitForFunction(() => window.__np.boneMen.list.some((m) => m.hp === 1), null, {
    timeout: 2000,
  });
  await page.click('#throw');
  await page.waitForFunction(
    () => window.__np.boneMen.list.some((m) => m.state === 'fall' || m.state === 'gone'),
    null,
    {
      timeout: 4000,
    },
  );
  await expect.poll(() => page.evaluate(() => window.__np.coins)).toBeGreaterThanOrEqual(c0 + 70);
  await expect(page.locator('#toast')).toContainText('falls apart', { timeout: 8000 });
  expect(errors).toEqual([]);
});

test("Skull Island's displacer beasts: never where they look, a spear goes through, a lash takes three hearts, and just after it a spear lands", async ({
  context,
  page,
}) => {
  // Ashore off its chin, in the Honor Guard armour, whose knife hits for 4: a displacer beast's four hits.
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    armour: 5,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    isle12Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 9700, y: 9700, h: (-3 * Math.PI) / 4, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    const [x, y] = n.fromSkull(0, 1610);
    n.boat.x = x;
    n.boat.y = y;
    n.boat.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // Skrill's men out of the way; over to the beast prowling the left of the jaw.
  await page.evaluate(() => {
    const n = window.__np;
    for (const m of n.boneMen.list) m.state = 'gone';
    const [x, y] = n.fromSkull(-270, 1110);
    n.walker.x = x;
    n.walker.y = y;
  });
  await expect(page.locator('#toast')).toContainText('displacer beast', { timeout: 4000 });
  // Its picture stands off to one side of it; a throw at it goes straight through.
  expect(
    await page.evaluate(() => {
      const b = window.__np.displacers.list.find((o) => o.state !== 'prowl');
      return b ? Math.hypot(b.ix - b.x, b.iy - b.y) : 0;
    }),
  ).toBeGreaterThan(20);
  await page.click('#throw');
  await expect(page.locator('#toast')).toContainText('not really there', { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.displacers.list.every((b) => b.hp === 4))).toBe(
    true,
  );
  // Standing still, a lash lands: three hearts.
  const h0 = await page.evaluate(() => window.__np.hearts);
  await page.waitForFunction((h) => window.__np.hearts <= h - 3, h0, { timeout: 8000 });
  // Just after, it shows where it really is, and the knife lands: beaten, and 60 coins.
  await page.waitForFunction(
    () => window.__np.displacers.list.some((b) => b.state === 'recover'),
    null,
    { timeout: 2000 },
  );
  const c0 = await page.evaluate(() => window.__np.coins);
  await page.click('#throw');
  await page.waitForFunction(
    () => window.__np.displacers.list.some((b) => b.state === 'fall' || b.state === 'gone'),
    null,
    { timeout: 4000 },
  );
  await expect.poll(() => page.evaluate(() => window.__np.coins)).toBeGreaterThanOrEqual(c0 + 60);
  await expect(page.locator('#toast')).toContainText('beaten', { timeout: 8000 });
  expect(errors).toEqual([]);
});

/** Ashore on Skull Island, in at the tower's door, and up its four floors, each beaten: at the top of the fourth. */
async function upSkrillsTower(
  context: BrowserContext,
  page: Page,
  extra: Record<string, unknown> = {},
) {
  const errors = await boot(context, page, {
    ...extra,
    muted: true,
    spear: 2,
    armour: 5,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    isle12Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 9700, y: 9700, h: (-3 * Math.PI) / 4, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    const [x, y] = n.fromSkull(0, 1610);
    n.boat.x = x;
    n.boat.y = y;
    n.boat.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // Up to the tower door, past its guards.
  await page.evaluate(() => {
    const n = window.__np;
    for (const m of n.boneMen.list) m.state = 'gone';
    for (const b of n.displacers.list) b.state = 'gone';
    n.walker.x = n.TOWER12_DOOR.x + 6;
    n.walker.y = n.TOWER12_DOOR.y + 6;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction((f) => window.__np.floor === f, 34, { timeout: 3000 });
  // Each floor: no stairs until all of them are beaten, then up.
  for (const [k, f] of [34, 35, 36, 37].entries()) {
    expect(await page.evaluate(() => window.__np.floor)).toBe(f);
    await page.evaluate(
      ([k, y]) => {
        const n = window.__np;
        n.walker.x = -23500 - 170 * 0.6 * Math.SQRT1_2;
        n.walker.y = (y as number) - 170 * 0.6 * Math.SQRT1_2;
        // All but one beaten: still no way up.
        const men = n.skullMen[k as number];
        const beasts = n.skullBeasts[k as number];
        if (!men || !beasts) return;
        for (const m of men.list) men.hit(m, 99);
        for (const b of beasts.list.slice(1)) {
          b.shownT = 5;
          beasts.hit(b, 99);
        }
      },
      [k, -6000 - 900 * k],
    );
    await page.waitForTimeout(300);
    await expect(page.locator('#climb')).toBeHidden();
    await page.evaluate((k) => {
      const n = window.__np;
      const beasts = n.skullBeasts[k];
      const b = beasts?.list[0];
      if (!beasts || !b) return;
      b.shownT = 5;
      beasts.hit(b, 99);
    }, k);
    if (f === 37) break;
    await expect(page.locator('#climb')).toHaveText('Climb the stairs', { timeout: 3000 });
    await page.click('#climb');
    await page.waitForFunction((f) => window.__np.floor === f, f + 1, { timeout: 3000 });
  }
  return errors;
}

test("Skrill's tower: in at its door, up four floors held by his men and his beasts, and his own door open at the top", async ({
  context,
  page,
}) => {
  const errors = await upSkrillsTower(context, page);
  // The top of the fourth: no stairs, only Skrill's own door, creaking open, and him laughing up beyond it.
  await expect(page.locator('#toast')).toContainText('mwa ha ha', { timeout: 4000 });
  await expect(page.locator('#climb')).toHaveText("Through Skrill's door", { timeout: 3000 });
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.floor === -1, null, { timeout: 3000 });
  expect(errors).toEqual([]);
});

test("Skrill: up through his door, his spell opens a portal and the Heron's men run out after him, a spear reaches him only down low, and beaten they drag him off to prison and his horn goes to the trophy hall", async ({
  context,
  page,
}) => {
  const errors = await upSkrillsTower(context, page);
  await expect(page.locator('#climb')).toHaveText("Through Skrill's door", { timeout: 4000 });
  await page.click('#climb');
  await page.waitForFunction((f) => window.__np.floor === f, 39, { timeout: 3000 });
  expect(
    await page.evaluate(() => [
      window.__np.skrill.state,
      (window.__np.floors[39]?.list ?? []).length,
    ]),
  ).toEqual(['wait', 5]);
  // A step in, and he wakes: his laugh, and his monkeys come.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = -23500 + 20;
    n.walker.y = -9700 + 20;
  });
  await expect(page.locator('#toast')).toContainText('The spell worked!', { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('hehe ha ha mwa ha ha');
  await expect(page.locator('#toast')).toContainText('GET SKRILL AND PRIZON HIM');
  // His portal opens, and the Heron's men come out of it.
  await page.waitForFunction(
    () => window.__np.prison.open === 1 && window.__np.prison.men.length > 0,
    null,
    {
      timeout: 4000,
    },
  );
  await page.waitForFunction(
    () => (window.__np.floors[39]?.list ?? []).some((m) => m.state === 'chase'),
    null,
    { timeout: 3000 },
  );
  const trophies = await page.evaluate(() => window.__np.trophiesWon);
  // Up on his wings, a spear can't reach him.
  const high = await page.evaluate(() => {
    const n = window.__np;
    n.setHearts(9);
    n.skrill.state = 'hover';
    n.skrill.t = 0;
    n.skrill.z = 100;
    return [n.skrill.low, n.skrill.hit(1), n.skrill.hp];
  });
  expect(high).toEqual([false, false, 20]);
  // Landed after a swoop: open. Beaten: coins, his horn, and his monkeys run.
  const c0 = await page.evaluate(() => window.__np.coins);
  await page.evaluate(() => {
    const n = window.__np;
    n.skrill.state = 'landed';
    n.skrill.t = 0;
    n.skrill.z = 0;
    n.skrill.hit(99);
  });
  await expect(page.locator('#toast')).toContainText('You beat Skrill!', { timeout: 3000 });
  expect(
    await page.evaluate(() => [
      window.__np.skrillBeaten,
      window.__np.coins,
      window.__np.trophiesWon,
    ]),
  ).toEqual([true, c0 + 8000, trophies + 1]);
  await page.waitForFunction(
    () =>
      (window.__np.floors[39]?.list ?? []).every((m) => m.state === 'flee' || m.state === 'gone'),
    null,
    { timeout: 3000 },
  );
  // The Heron's men take him, and drag him off through the portal to prison. His horn stays.
  await page.waitForFunction(() => window.__np.skrill.state === 'gone', null, { timeout: 15000 });
  await expect(page.locator('#toast')).toContainText('to prison', { timeout: 3000 });
  expect(await page.evaluate(() => !!window.__np.skrill.hornAt)).toBe(true);
  // Out, and up again: he stays beaten, his throne empty.
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.floor === -1, null, { timeout: 3000 });
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').skrillBeaten,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("island 11's black lagoon: dive in off its bank, its creatures come for you, the naga swims down too, and the skull key is on the bottom", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    armour: 4,
    isle3Stage: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    nagaFree: true,
    isle10Seen: true,
    isle11Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 9120, y: -3250, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // On the lagoon's rim with the scuba gear: it can be dived.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const i = window.__np.ISLE11;
    w.x = i.x + 102;
    w.y = i.y - 89;
  });
  await expect(page.locator('#diveBtn')).toHaveText('Dive into the lagoon', { timeout: 4000 });
  await page.waitForFunction(() => window.__np.naga.shown, null, { timeout: 4000 });
  await page.click('#diveBtn');
  await page.waitForFunction(() => window.__np.diving, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.diveSite)).toBe('lagoon');
  await expect(page.locator('#toast')).toContainText('black lagoon');
  expect(await page.evaluate(() => window.__np.divePals.map((p) => p.kind))).toEqual(['naga']);
  expect(await page.evaluate(() => window.__np.lagoonFolk.left)).toBe(10);
  // Down among them: one comes for the diver, and between the spear and the naga, they are beaten.
  await page.evaluate(() => {
    const d = window.__np.diver;
    const c = window.__np.lagoonFolk.list[3];
    if (!c) return;
    d.x = c.x - 60;
    d.y = c.y;
    d.face = 1;
  });
  await page.waitForFunction(
    () => window.__np.lagoonFolk.list.some((c) => c.state === 'come' || c.state === 'tell'),
    null,
    { timeout: 3000 },
  );
  await expect(page.locator('#toast')).toContainText('lagoon creature');
  await page.waitForFunction(
    () => {
      window.__np.diver.air = window.__np.diver.airMax;
      window.__np.diveThrow();
      return window.__np.lagoonFolk.left < 10;
    },
    null,
    { timeout: 8000, polling: 300 },
  );
  // The skull key, on the bottom.
  await page.evaluate(() => {
    const d = window.__np.diver;
    const k = window.__np.SKULL_KEY;
    d.x = k.x;
    d.y = k.y - 12;
    d.vx = 0;
    d.vy = 0;
  });
  await page.waitForFunction(() => window.__np.skullKey, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('skull key');
  // Back up onto the bank.
  await page.click('#surfaceBtn');
  await page.waitForFunction(() => !window.__np.diving, null, { timeout: 8000 });
  expect(await page.evaluate(() => window.__np.walker.state)).toBe('ashore');
  await expect(page.locator('#toast')).toContainText('onto its bank');
  await expect(page.locator('#log')).toContainText('Skull key found');
  // Kept.
  await page.reload();
  await page.waitForFunction(() => window.__np?.skullKey === true, null, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test("island 11's old portal: into the Old One's ruins, the skull key opens the crypt, and the Forgotten One yields", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    armour: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 4,
    soulArmour: true,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    skullKey: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 9120, y: -3250, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // The Old One beaten, the portal is awake: walk into it.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const p = window.__np.PORTAL11_FRONT;
    w.x = p.x;
    w.y = p.y;
  });
  await expect(page.locator('#climb')).toHaveText('Into the portal', { timeout: 4000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 16, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('Old One');
  // The skull door at the back of his ruins, and the key opens it.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const d = window.__np.SKULL_DOOR;
    w.x = d.x + 22;
    w.y = d.y + 22;
  });
  await expect(page.locator('#climb')).toHaveText('Open the skull door', { timeout: 4000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.CRYPT, null, {
    timeout: 3000,
  });
  await expect(page.locator('#toast')).toContainText('fooled you', { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.hordes[window.__np.CRYPT]?.list.length)).toBe(15);
  await page.waitForFunction(() => window.__np.forgotten2.up, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.forgotten2.hp)).toBe(9);
  // Beaten, he yields, alive; with his crypt clear it is won.
  await page.evaluate(() => {
    const n = window.__np;
    n.setHearts(9);
    const h = n.hordes[n.CRYPT];
    // Twice: a skeleton's shield takes the first.
    if (h) for (const k of [0, 1]) for (const u of h.list) h.hit(u, 99 + k, n.walker.x, n.walker.y);
    n.forgotten2.hit(99);
  });
  await page.waitForFunction(() => window.__np.cryptWon, null, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.forgotten2.state)).toBe('yield');
  await expect(page.locator('#toast')).toContainText('something to show you');
  // Home through the portal, out on island 11 in front of it.
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.floor === -1, null, { timeout: 3000 });
  const out = await page.evaluate(() => {
    const w = window.__np.walker;
    const p = window.__np.PORTAL11_FRONT;
    return Math.hypot(w.x - p.x, w.y - p.y);
  });
  expect(out).toBeLessThan(5);
  await expect(page.locator('#log')).toContainText('The Forgotten One again');
  expect(errors).toEqual([]);
});

test("the Forgotten One's ending: he shows you round, gives you Gigantis and his scanner, and saves you from the Old One", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    armour: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 4,
    soulArmour: true,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    skullKey: true,
    cryptWon: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 9120, y: -3250, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    const w = window.__np.walker;
    const p = window.__np.PORTAL11_FRONT;
    w.x = p.x;
    w.y = p.y;
  });
  await expect(page.locator('#climb')).toHaveText('Into the portal', { timeout: 4000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 16, null, { timeout: 3000 });
  await page.evaluate(() => {
    const w = window.__np.walker;
    const d = window.__np.SKULL_DOOR;
    w.x = d.x + 22;
    w.y = d.y + 22;
  });
  await expect(page.locator('#climb')).toHaveText('Open the skull door', { timeout: 4000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.CRYPT, null, {
    timeout: 3000,
  });
  // He kneels where he was beaten, with something to show you: go to him.
  await expect(page.locator('#toast')).toContainText('Go to him', { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.forgotten2.state)).toBe('yield');
  await expect(page.locator('#climb')).toBeHidden();
  await page.evaluate(() => {
    const w = window.__np.walker;
    const g = window.__np.forgotten2;
    w.x = g.x + 30;
    w.y = g.y + 30;
  });
  await expect(page.locator('#climb')).toHaveText('Go with him', { timeout: 3000 });
  const start = await page.evaluate(() => [window.__np.forgotten2.x, window.__np.forgotten2.y]);
  await page.click('#climb');
  // A cutscene: no buttons, and the figure walks with him by itself.
  await page.waitForFunction(() => (window.__np.fgScene?.t ?? 0) >= 3, null, { timeout: 6000 });
  expect(await page.evaluate(() => window.__np.forgotten2.state)).toBe('guide');
  await expect(page.locator('#climb')).toBeHidden();
  await expect(page.locator('#leave')).toBeHidden();
  await expect(page.locator('#throw')).toBeHidden();
  const walked = await page.evaluate(([x0, y0]) => {
    const n = window.__np;
    const g = n.forgotten2;
    return {
      near: Math.hypot(g.x - n.walker.x, g.y - n.walker.y),
      gone: Math.hypot(g.x - (x0 ?? 0), g.y - (y0 ?? 0)),
    };
  }, start);
  expect(walked.gone).toBeGreaterThan(40);
  expect(walked.near).toBeLessThan(80);
  // On through his castle to its courtyard, where he gives it you, and your flag goes up.
  await page.evaluate(() => {
    const sc = window.__np.fgScene;
    if (sc) sc.t = 15.6;
  });
  await page.waitForFunction(
    () => window.__np.floor === 12 && (window.__np.fgScene?.flag ?? -1) >= 0,
    null,
    {
      timeout: 3000,
    },
  );
  expect(await page.evaluate(() => window.__np.fgScene?.cap)).toContain('headquarters');
  expect(
    await page.evaluate(() => [12, 13, 14, 15].every((r) => window.__np.hordes[r]?.cleared)),
  ).toBe(true);
  // Back through the ruins: the Old One rises, and he bursts into bones and blows him apart.
  await page.evaluate(() => {
    const sc = window.__np.fgScene;
    if (sc) sc.t = 33;
  });
  await page.waitForFunction(() => window.__np.forgotten2.state === 'gone', null, {
    timeout: 3000,
  });
  expect(await page.evaluate(() => [window.__np.floor, window.__np.oldOne.state])).toEqual([
    16,
    'gone',
  ]);
  expect(await page.evaluate(() => window.__np.fgScene?.cap)).toContain('bones');
  await page.evaluate(() => {
    const sc = window.__np.fgScene;
    if (sc) sc.t = 38.6;
  });
  await page.waitForFunction(() => window.__np.fgScene === null, null, { timeout: 3000 });
  expect(await page.evaluate(() => [window.__np.castleHQ, window.__np.scanner])).toEqual([true, 1]);
  await expect(page.locator('#toast')).toContainText('headquarters');
  await expect(page.locator('#leave')).toHaveText('Back through the portal');
  // Kept: through the skull door again, the crypt is empty.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const d = window.__np.SKULL_DOOR;
    w.x = d.x + 22;
    w.y = d.y + 22;
  });
  await expect(page.locator('#climb')).toHaveText('Open the skull door', { timeout: 4000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.CRYPT, null, {
    timeout: 3000,
  });
  await expect(page.locator('#toast')).toContainText('empty', { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.forgotten2.state)).toBe('gone');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect([saved.castleHQ, saved.scanner]).toEqual([true, 1]);
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.floor === -1, null, { timeout: 3000 });
  await expect(page.locator('#log')).toContainText('your headquarters');
  await expect(page.locator('#log')).toContainText('Portable scanner');
  expect(errors).toEqual([]);
});

test("the observatory: your headquarters' telescope turns to each leviathan, live, and they are all on the sea map", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 4,
    cryptWon: true,
    castleHQ: true,
    scanner: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  expect(await page.evaluate(() => window.__np.mapBeasts().map((b) => b.name))).toEqual([
    'Leviathan',
    'Cthuluviathan',
    'Anglerfish',
    'Gulper',
    'Shark King',
    'Reaper',
    'Star',
    'Deep One',
  ]);
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  // Up to the telescope by the courtyard's wall, and look through it.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.HQ_SCOPE.x - 18;
    n.walker.y = n.HQ_SCOPE.y + 18;
  });
  await expect(page.locator('#climb')).toHaveText('Look through the telescope', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#scope')).toBeVisible();
  await expect(page.locator('#scopeName')).toHaveText('The leviathan at the buoys');
  await expect(page.locator('#scopeWhere')).toContainText('home water');
  await expect(page.locator('#scopeCount')).toHaveText('1 of 8');
  await page.locator('#scopeNext').click();
  await expect(page.locator('#scopeName')).toHaveText('The Cthuluviathan');
  await expect(page.locator('#scopeWhere')).toContainText('Asleep in its sunken city');
  // A tap on the lens turns it on too; back the other way with the arrow.
  await tap(page, 195, 200);
  await expect(page.locator('#scopeName')).toHaveText('The anglerfish');
  await page.locator('#scopePrev').click();
  await expect(page.locator('#scopeName')).toHaveText('The Cthuluviathan');
  await page.locator('#scopeDone').click();
  await expect(page.locator('#scope')).toBeHidden();
  expect(await page.evaluate(() => window.__np.scope)).toBeNull();
  expect(errors).toEqual([]);
});

test('your headquarters: a bed in the first hall, slept in till morning with every heart back', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    day: 5,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 4,
    cryptWon: true,
    castleHQ: true,
    scanner: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  // Through the courtyard's door, into the first hall.
  await page.evaluate(() => {
    window.__np.walker.x = -13500 - 170 * 0.6 * Math.SQRT1_2;
    window.__np.walker.y = -6000 - 170 * 0.6 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Through the door');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 13);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.HQ_BED.x + 22;
    n.walker.y = n.HQ_BED.y + 22;
    n.setHearts(1);
  });
  await expect(page.locator('#climb')).toHaveText('Sleep till morning', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('safe and sound', { timeout: 3000 });
  await page.waitForFunction(() => window.__np.day === 6 && window.__np.phase === 'Dawn', null, {
    timeout: 4000,
  });
  expect(await page.evaluate(() => window.__np.hearts === window.__np.maxHearts)).toBe(true);
  // Morning already: nothing to sleep through.
  await expect(page.locator('#climb')).toBeHidden();
  expect(errors).toEqual([]);
});

test("your headquarters' plans: build the garden, and pick a snack from it once a day", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 3000,
    spear: 4,
    day: 5,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 4,
    cryptWon: true,
    castleHQ: true,
    scanner: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  // The plans, on their table near the way in.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.HQ_PLANS.x + 16;
    n.walker.y = n.HQ_PLANS.y - 16;
  });
  await expect(page.locator('#climb')).toHaveText('Look at the castle plans', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#hqCard')).toBeVisible();
  const items = page.locator('#hqShelf .item');
  await expect(items).toHaveCount(4);
  await expect(items.nth(0)).toContainText('Garden');
  await expect(items.nth(0)).toHaveAttribute('aria-disabled', 'false');
  // All four are on the plans now, each with its price.
  for (const i of [1, 2, 3]) await expect(items.nth(i)).not.toContainText('Soon');
  await items.nth(0).click();
  await expect(page.locator('#hqCard')).toBeHidden();
  await expect(page.locator('#toast')).toContainText('The garden is planted!');
  expect(await page.evaluate(() => [window.__np.hq.garden, window.__np.coins])).toEqual([
    true,
    1000,
  ]);
  // Today's snack, off the apple tree.
  const apples = await page.evaluate(() => window.__np.snacks.apple);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.HQ_GARDEN.apple.x + 14;
    n.walker.y = n.HQ_GARDEN.apple.y + 14;
  });
  await expect(page.locator('#climb')).toHaveText('Pick an apple', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('fresh off your own tree');
  expect(await page.evaluate(() => [window.__np.snacks.apple, window.__np.gardenDay])).toEqual([
    apples + 1,
    5,
  ]);
  // Only one a day: nothing more to pick, here or at the carrots.
  await expect(page.locator('#climb')).toBeHidden();
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.HQ_GARDEN.carrot.x + 14;
    n.walker.y = n.HQ_GARDEN.carrot.y - 14;
  });
  await page.waitForTimeout(300);
  await expect(page.locator('#climb')).toBeHidden();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect([saved.hq.garden, saved.gardenDay]).toEqual([true, 5]);
  expect(errors).toEqual([]);
});

test("your headquarters' roll-call board: leave the warlock at the castle, and call him back", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 1000,
    spear: 4,
    day: 5,
    isle3Stage: 4,
    isle4Stage: 1,
    isle6Stage: 2,
    isle7Seen: true,
    isle7Stage: 4,
    cryptWon: true,
    castleHQ: true,
    scanner: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  const intoCourtyard = async () => {
    await page.click('#ashore');
    await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, {
      timeout: 4000,
    });
    await page.evaluate(() => {
      window.__np.walker.x = 2400 + 150;
      window.__np.walker.y = 6900 + 95;
    });
    await page.click('#climb');
    await page.waitForFunction(() => window.__np.floor === 12);
    await page.evaluate(() => {
      const n = window.__np;
      n.walker.x = n.HQ_ROSTER.x - 22;
      n.walker.y = n.HQ_ROSTER.y + 10;
    });
    await expect(page.locator('#climb')).toHaveText('Choose who comes with you', { timeout: 3000 });
    await page.click('#climb');
    await expect(page.locator('#stayCard')).toBeVisible();
  };
  await intoCourtyard();
  // Everyone you have, each coming with you, as ever.
  expect(await page.evaluate(() => window.__np.friendsHad)).toEqual([
    'warlock',
    'tarling',
    'cat',
    'warrior',
    'bones',
  ]);
  await expect(page.locator('#stayList .boat')).toHaveCount(5);
  await expect(page.locator('#stayList .rchip.on')).toHaveText(Array(5).fill('Comes with you'));
  await page.waitForFunction(() => window.__np.warlock.shown, null, { timeout: 3000 });
  // The warlock stays: gone from your side, and his boat with him.
  await page.click('#stayList [data-friend="warlock"][data-stay="1"]');
  expect(await page.evaluate(() => window.__np.stay)).toEqual(['warlock']);
  await expect(page.locator('#stayList [data-friend="warlock"].on')).toHaveText(
    'Stays at the castle',
  );
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => [
      window.__np.warlock.shown,
      window.__np.wboat.free,
      window.__np.cat.shown,
    ]),
  ).toEqual([false, false, true]);
  await page.click('#stayClose');
  await expect(page.locator('#stayCard')).toBeHidden();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').stay),
  ).toEqual(['warlock']);
  // Still at the castle the next time the game is played, and nowhere at sea.
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => [window.__np.stay, window.__np.wboat.free])).toEqual([
    ['warlock'],
    false,
  ]);
  await intoCourtyard();
  await page.click('#stayList [data-friend="warlock"][data-stay=""]');
  expect(await page.evaluate(() => window.__np.stay)).toEqual([]);
  await page.waitForFunction(() => window.__np.warlock.shown && window.__np.wboat.free, null, {
    timeout: 3000,
  });
  expect(errors).toEqual([]);
});

test("your headquarters' trophy hall: a trophy for each boss beaten, and empty stands say who to beat", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 1000,
    spear: 4,
    day: 5,
    towerTaken: true,
    isle4Stage: 1,
    isle5Stage: 1,
    isle7Seen: true,
    isle7Stage: 4,
    cryptWon: true,
    castleHQ: true,
    scanner: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  // Up through the courtyard and the first hall, to the second.
  for (const [floor, y, r] of [
    [12, -6000, 170],
    [13, -6900, 160],
  ] as const) {
    await page.evaluate(
      ([y0, r0]) => {
        window.__np.walker.x = -13500 - r0 * 0.6 * Math.SQRT1_2 + 6;
        window.__np.walker.y = y0 - r0 * 0.6 * Math.SQRT1_2 + 6;
      },
      [y, r] as const,
    );
    await expect(page.locator('#climb')).toHaveText('Through the door', { timeout: 3000 });
    await page.click('#climb');
    await page.waitForFunction((f) => window.__np.floor === f + 1, floor);
  }
  // The island 2 sorcerer, the Tar Anchorer, the Shark King, island 7's sorcerer, the Forgotten One twice, the Old One.
  await expect(page.locator('#toast')).toContainText('Your trophy hall! 7 of 25 stands', {
    timeout: 3000,
  });
  expect(await page.evaluate(() => window.__np.trophiesWon)).toBe(7);
  await page.evaluate(() => {
    const n = window.__np;
    const s = n.trophyStand(4);
    n.walker.x = s.x + 10;
    n.walker.y = s.y + 8;
  });
  await expect(page.locator('#climb')).toHaveText("Look at the Shark King's jaws", {
    timeout: 3000,
  });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('every tooth still sharp');
  // The Heron's stand, empty: where to go to fill it.
  await page.evaluate(() => {
    const n = window.__np;
    const s = n.trophyStand(10);
    n.walker.x = s.x + 10;
    n.walker.y = s.y + 8;
  });
  await expect(page.locator('#climb')).toHaveText('Look at the empty stand', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('An empty stand. Beat the Heron for good');
  expect(errors).toEqual([]);
});

test("your headquarters' fish board: every kind you've caught on it, and the field guide from it", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 1000,
    spear: 4,
    day: 5,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 4,
    cryptWon: true,
    castleHQ: true,
    scanner: 1,
    log: [4, 0, 2, 0, 1],
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  await page.evaluate(() => {
    window.__np.walker.x = -13500 - 170 * 0.6 * Math.SQRT1_2 + 6;
    window.__np.walker.y = -6000 - 170 * 0.6 * Math.SQRT1_2 + 6;
  });
  await expect(page.locator('#climb')).toHaveText('Through the door', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 13);
  expect(await page.evaluate(() => window.__np.fishCaught)).toBe(3);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.HQ_FISH_FRONT.x;
    n.walker.y = n.HQ_FISH_FRONT.y;
  });
  await expect(page.locator('#climb')).toHaveText(/^Look at your fish \(3 of \d+\)$/, {
    timeout: 3000,
  });
  await page.click('#climb');
  await expect(page.locator('#guide')).toBeVisible();
  expect(errors).toEqual([]);
});

test("your headquarters' armoury: the armour and weapons you've had, on stands in the throne room", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 1000,
    spear: 2,
    armour: 3,
    day: 5,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 4,
    cryptWon: true,
    castleHQ: true,
    scanner: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  // Up through the courtyard and both halls, to the throne room.
  for (const [floor, y, r] of [
    [12, -6000, 170],
    [13, -6900, 160],
    [14, -7800, 160],
  ] as const) {
    await page.evaluate(
      ([y0, r0]) => {
        window.__np.walker.x = -13500 - r0 * 0.6 * Math.SQRT1_2 + 6;
        window.__np.walker.y = y0 - r0 * 0.6 * Math.SQRT1_2 + 6;
      },
      [y, r] as const,
    );
    await expect(page.locator('#climb')).toHaveText('Through the door', { timeout: 3000 });
    await page.click('#climb');
    await page.waitForFunction((f) => window.__np.floor === f + 1, floor);
  }
  const lookAt = async (id: string) =>
    page.evaluate((i) => {
      const n = window.__np;
      const s = n.armouryAt(i);
      n.walker.x = s.x + 6;
      n.walker.y = s.y + 6;
    }, id);
  // The gold armour, the best of the three: worn, and one like it on its stand.
  await lookAt('a2');
  await expect(page.locator('#climb')).toHaveText('Look at the gold armour', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText("It's the best you have");
  // The leather, outgrown.
  await lookAt('a0');
  await expect(page.locator('#climb')).toHaveText('Look at the leather armour', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText("You've got better now");
  // No harpoon yet: its rack is empty.
  await lookAt('w3');
  await expect(page.locator('#climb')).toHaveText('Look at the empty rack', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('An empty rack, for the harpoon');
  expect(errors).toEqual([]);
});

test("your headquarters' treasure: a heap of it in the trophy hall, everything you've found, too big to walk through", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 1000,
    spear: 4,
    day: 5,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 4,
    cryptWon: true,
    castleHQ: true,
    scanner: 1,
    wreckChest: true,
    chests6: 3,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  for (const [floor, y, r] of [
    [12, -6000, 170],
    [13, -6900, 160],
  ] as const) {
    await page.evaluate(
      ([y0, r0]) => {
        window.__np.walker.x = -13500 - r0 * 0.6 * Math.SQRT1_2 + 6;
        window.__np.walker.y = y0 - r0 * 0.6 * Math.SQRT1_2 + 6;
      },
      [y, r] as const,
    );
    await expect(page.locator('#climb')).toHaveText('Through the door', { timeout: 3000 });
    await page.click('#climb');
    await page.waitForFunction((f) => window.__np.floor === f + 1, floor);
  }
  // Stood in the heap, the figure is pushed out of it.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.HQ_HEAP.x + 4;
    n.walker.y = n.HQ_HEAP.y + 4;
  });
  await page.waitForFunction(
    () => {
      const n = window.__np;
      return Math.hypot(n.walker.x - n.HQ_HEAP.x, n.walker.y - n.HQ_HEAP.y) > 20;
    },
    null,
    { timeout: 3000 },
  );
  // The wreck's chest and two of island 6's.
  await expect(page.locator('#climb')).toHaveText('Look at your treasure (3 of 17)', {
    timeout: 3000,
  });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('Still out there: 5 from the trench');
  await expect(page.locator('#toast')).toContainText('4 from the chests on island 6');
  expect(errors).toEqual([]);
});

test("your headquarters' forge: built from the plans, and your weapons sharpened at it for good", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 7000,
    spear: 4,
    day: 5,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 4,
    cryptWon: true,
    castleHQ: true,
    scanner: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.HQ_PLANS.x + 16;
    n.walker.y = n.HQ_PLANS.y - 16;
  });
  await expect(page.locator('#climb')).toHaveText('Look at the castle plans', { timeout: 3000 });
  await page.click('#climb');
  const forge = page.locator('#hqShelf .item').nth(2);
  await expect(forge).toContainText('Forge');
  await forge.click();
  await expect(page.locator('#toast')).toContainText('The forge is built');
  expect(
    await page.evaluate(() => [window.__np.hq.forge, window.__np.coins, window.__np.sharp]),
  ).toEqual([true, 1000, false]);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.HQ_FORGE.x - 20;
    n.walker.y = n.HQ_FORGE.y + 24;
  });
  await expect(page.locator('#climb')).toHaveText('Sharpen your weapons', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('your weapons are sharpened');
  expect(await page.evaluate(() => window.__np.sharp)).toBe(true);
  // Once is for good: nothing more to do at it.
  await expect(page.locator('#climb')).toBeHidden();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect([saved.hq.forge, saved.sharp]).toEqual([true, true]);
  expect(errors).toEqual([]);
});

test("your headquarters' tower: built from the plans, climbed, and every fish school on the sea map", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 11000,
    spear: 4,
    day: 5,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 4,
    cryptWon: true,
    castleHQ: true,
    scanner: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  // Nothing on the map yet without the tower.
  expect(await page.evaluate(() => window.__np.mapFishN)).toBe(0);
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.HQ_PLANS.x + 16;
    n.walker.y = n.HQ_PLANS.y - 16;
  });
  await expect(page.locator('#climb')).toHaveText('Look at the castle plans', { timeout: 3000 });
  await page.click('#climb');
  const tower = page.locator('#hqShelf .item').nth(3);
  await expect(tower).toContainText('Bigger tower');
  await tower.click();
  await expect(page.locator('#toast')).toContainText('The tower is built');
  expect(await page.evaluate(() => [window.__np.hq.tower, window.__np.coins])).toEqual([
    true,
    1000,
  ]);
  expect(await page.evaluate(() => window.__np.mapFishN)).toBeGreaterThan(10);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.HQ_TOWER_DOOR.x + 6;
    n.walker.y = n.HQ_TOWER_DOOR.y + 8;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#seamap')).toBeVisible();
  await expect(page.locator('#mapNote')).toContainText('From your tower you see every fish school');
  await page.click('#mapClose');
  await expect(page.locator('#seamap')).toBeHidden();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect(saved.hq.tower).toBe(true);
  expect(errors).toEqual([]);
});

test("your headquarters' dock: built from the plans, a castle landing by island 7, in through its gate and back aboard", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 5000,
    spear: 4,
    day: 5,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 4,
    cryptWon: true,
    castleHQ: true,
    scanner: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.HQ_PLANS.x + 16;
    n.walker.y = n.HQ_PLANS.y - 16;
  });
  await expect(page.locator('#climb')).toHaveText('Look at the castle plans', { timeout: 3000 });
  await page.click('#climb');
  const dock = page.locator('#hqShelf .item').nth(1);
  await expect(dock).toContainText('Dock');
  await dock.click();
  await expect(page.locator('#toast')).toContainText('The dock is built');
  expect(await page.evaluate(() => [window.__np.hq.dock, window.__np.coins])).toEqual([true, 1000]);
  // Back through the portal to island 7, aboard, and round to the landing.
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.floor === -1);
  await page.evaluate(() => window.__np.walker.knockOut());
  await page.waitForFunction(() => window.__np.walker.state === 'aboard', null, { timeout: 4000 });
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.CASTLE_LANDING.x;
    n.boat.y = n.CASTLE_LANDING.y + 130;
    n.boat.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('Through the castle gate', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  expect(await page.evaluate(() => window.__np.viaLanding)).toBe(true);
  await expect(page.locator('#toast')).toContainText('In through your own gate');
  // And out again, back aboard where the boat was left.
  await expect(page.locator('#leave')).toHaveText('Back to your boat');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.floor === -1);
  expect(await page.evaluate(() => window.__np.walker.state)).toBe('aboard');
  const at = await page.evaluate(() => {
    const n = window.__np;
    return Math.hypot(n.boat.x - n.CASTLE_LANDING.x, n.boat.y - n.CASTLE_LANDING.y);
  });
  expect(at).toBeLessThan(200);
  expect(await page.evaluate(() => window.__np.viaLanding)).toBe(false);
  expect(errors).toEqual([]);
});

test('Gigantis as your headquarters: through the portal, your flag over the courtyard and nobody to fight', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 4,
    cryptWon: true,
    castleHQ: true,
    scanner: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await expect(page.locator('#climb')).toHaveText('Into the portal');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  await expect(page.locator('#toast')).toContainText('your headquarters', { timeout: 3000 });
  expect(
    await page.evaluate(() => [12, 13, 14, 15].every((r) => window.__np.hordes[r]?.cleared)),
  ).toBe(true);
  // The door at the courtyard's back is open, nobody to beat first.
  await page.evaluate(() => {
    window.__np.walker.x = -13500 - 170 * 0.6 * Math.SQRT1_2;
    window.__np.walker.y = -6000 - 170 * 0.6 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Through the door');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__np.hearts)).toBeGreaterThan(0);
  await expect(page.locator('#throw')).toBeHidden();
  expect(errors).toEqual([]);
});

test('the Battle Barge from the boat: pick a fight, beat them all for a coin, and back aboard', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    armour: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await expect(page.locator('#bargeCard')).toBeVisible();
  // To start: three monkeys and two skeletons. Make it a small arena, and one ghost more.
  await expect(page.locator('#bargeTotal')).toHaveText('5 of 10 picked.');
  await page.locator('#bargeSize [data-size="small"]').click();
  await page.locator('#bargeList [data-foe="ghost"][data-d="1"]').click();
  await expect(page.locator('#bargeTotal')).toHaveText('6 of 10 picked.');
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => window.__np.floor === window.__np.ARENAS.small, null, {
    timeout: 3000,
  });
  expect(await page.evaluate(() => window.__np.walker.state)).toBe('ashore');
  await expect(page.locator('#leave')).toHaveText('Leave the barge');
  // Beat them all: a coin.
  const coins = await page.evaluate(() => window.__np.coins);
  await page.evaluate(() => {
    const n = window.__np;
    n.setHearts(9);
    const f = n.floor;
    const h = n.hordes[f];
    if (h) for (const k of [0, 1]) for (const u of h.list) h.hit(u, 99 + k, n.walker.x, n.walker.y);
    for (const c of Object.values(n.bargeCamps[f] ?? {}))
      for (const m of c.list) c.hit(m, 99, n.walker.x, n.walker.y);
  });
  await page.waitForFunction(() => window.__np.bargeWins === 1, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(coins + 1);
  await expect(page.locator('#toast')).toContainText('beat them all');
  // Back aboard, where the boat was.
  await page.locator('#leave').click();
  await page.waitForFunction(() => window.__np.floor === -1, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.walker.state)).toBe('aboard');
  expect(await page.evaluate(() => window.__np.bargeOn)).toBe(false);
  await expect(page.locator('#log')).toContainText('Battle Barge: 1 won');
  // The setup is kept.
  await page.reload();
  await page.waitForFunction(() => window.__np?.barge?.size === 'small', null, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test("the Battle Barge: the tar island's tar creatures and Skull Island's men and displacer beasts, picked and beaten", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    armour: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await expect(page.locator('#bargeCard')).toBeVisible();
  // Off with the start's monkeys and skeletons; one of each of the newest instead.
  for (let i = 0; i < 3; i++)
    await page.locator('#bargeList [data-foe="monkey"][data-d="-1"]').click();
  for (let i = 0; i < 2; i++)
    await page.locator('#bargeList [data-foe="skeleton"][data-d="-1"]').click();
  for (const k of ['tarhuman', 'tarbeast', 'boneman', 'displacer'])
    await page.locator(`#bargeList [data-foe="${k}"][data-d="1"]`).click();
  await expect(page.locator('#bargeTotal')).toHaveText('4 of 10 picked.');
  await expect(page.locator('#bargeList')).toContainText('Displacer beasts');
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => window.__np.floor === window.__np.ARENAS.medium, null, {
    timeout: 3000,
  });
  // All four on the deck and up at once.
  expect(
    await page.evaluate(() => {
      const n = window.__np;
      return [
        n.bargeTar.list.map((f) => f.state).join(','),
        n.bargeMen.list.map((m) => m.state).join(','),
        n.bargeBeasts.list.map((b) => b.state).join(','),
      ];
    }),
  ).toEqual(['rise,rise', 'rise', 'spot']);
  // Beat them all: a coin.
  const coins = await page.evaluate(() => window.__np.coins);
  await page.evaluate(() => {
    const n = window.__np;
    n.setHearts(9);
    for (const f of n.bargeTar.list) n.bargeTar.hit(f, 99);
    for (const m of n.bargeMen.list) n.bargeMen.hit(m, 99);
    for (const b of n.bargeBeasts.list) {
      b.shownT = 5;
      n.bargeBeasts.hit(b, 99);
    }
  });
  await page.waitForFunction(() => window.__np.bargeWins === 1, null, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(coins + 1);
  expect(errors).toEqual([]);
});

test('the Battle Barge at sea: out to a ring of buoys, the Deep One and the Shark King harpooned, and back', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [3, 0, 0, 0, 0, 0, 0, 0] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  // At sea: Star to start; make it the Deep One and the Shark King, in a small ring.
  await page.locator('#bargeWhere [data-where="sea"]').click();
  await expect(page.locator('#bargeList')).toContainText('The Skeleton Shark King');
  await expect(page.locator('#bargeTotal')).toHaveText('1 of 10 picked.');
  await page.locator('#bargeSize [data-size="small"]').click();
  await page.locator('#bargeList [data-sea="meteor"][data-d="-1"]').click();
  await page.locator('#bargeList [data-sea="deep"][data-d="1"]').click();
  await page.locator('#bargeList [data-sea="king"][data-d="1"]').click();
  await expect(page.locator('#bargeTotal')).toHaveText('2 of 10 picked.');
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => !!window.__np.seaFight, null, { timeout: 3000 });
  // Out in the ring, still aboard; the way home is the leave button.
  const out = await page.evaluate(() => {
    const n = window.__np;
    return {
      d: Math.hypot(n.boat.x - n.SEA_ARENA.x, n.boat.y - n.SEA_ARENA.y),
      state: n.walker.state,
    };
  });
  expect(out.d).toBeLessThan(800);
  expect(out.state).toBe('aboard');
  await expect(page.locator('#leave')).toHaveText('Leave the Battle Barge');
  // Both wake at once.
  await page.waitForFunction(
    () =>
      window.__np.seaBoss.deep[0]?.state === 'fight' &&
      window.__np.seaBoss.king[0]?.state !== 'wait',
    null,
    { timeout: 4000 },
  );
  // The camera frames the fight: up beside the Deep One, both it and the boat stand in the band between the top bar
  // and the buttons, the boat no longer in the middle.
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.seaBoss.deep[0];
    if (!d) return;
    n.boat.x = d.x + 330;
    n.boat.y = d.y + 330;
    n.boat.v = 0;
  });
  await page.waitForTimeout(2500);
  const framed = await page.evaluate(() => {
    const n = window.__np;
    const d = n.seaBoss.deep[0] ?? { x: 0, y: 0 };
    return { deep: n.screenOf(d.x, d.y), boat: n.screenOf(n.boat.x, n.boat.y), size: n.viewSize };
  });
  for (const [x, y] of [framed.deep, framed.boat]) {
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(framed.size[0]);
    expect(y).toBeGreaterThan(framed.size[1] * 0.25);
    expect(y).toBeLessThan(framed.size[1] * 0.72);
  }
  expect(framed.boat[1]).toBeGreaterThan(framed.size[1] * 0.52);
  // The Shark King up out of the water by the bow with his trident, one hit from beaten.
  const coins = await page.evaluate(() => window.__np.coins);
  await page.evaluate(() => {
    const n = window.__np;
    const k = n.seaBoss.king[0];
    if (!k) return;
    k.x = n.boat.x + Math.cos(n.boat.h) * 120;
    k.y = n.boat.y + Math.sin(n.boat.h) * 120;
    k.resolve = 1;
    k.state = 'raise';
    k.t = 0.2;
    k.up = 0.9;
  });
  await page.waitForFunction(() => window.__np.harpoonTarget === 'king', null, { timeout: 2000 });
  await page.evaluate(() => window.__np.fireHarpoon());
  await page.waitForFunction(() => window.__np.seaBoss.king[0]?.state === 'dying', null, {
    timeout: 3000,
  });
  expect(await page.evaluate(() => window.__np.seaWon)).toBe(false);
  // Up beside the Deep One with its eye open, one hit from beaten: the harpoon sinks it, the boat free, and it is won.
  // The harpoon reloads (HARPOON_RELOAD, 1.2 s) from the shot at the King first, and only then the eye opens, so it is
  // still open when the harpoon lands, however slow the machine. (With nothing in reach the throw button is hidden and
  // says nothing of the reload, so this waits the time out.)
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.seaBoss.deep[0];
    if (!d) return;
    n.boat.x = d.x + 180;
    n.boat.y = d.y + 40;
    n.boat.v = 0;
    d.grab = null;
    d.grabCd = 99;
    d.resolve = 1;
    d.eye = true;
    d.eyeT = 0;
  });
  await page.waitForFunction(() => window.__np.harpoonTarget === 'deep', null, { timeout: 2000 });
  await page.evaluate(() => window.__np.fireHarpoon());
  await page.waitForFunction(() => window.__np.seaWon, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.seaBoss.deep[0]?.state)).toBe('sink');
  expect(await page.evaluate(() => window.__np.seaBoss.deep[0]?.holding)).toBe(false);
  expect(await page.evaluate(() => window.__np.coins)).toBe(coins + 1);
  expect(await page.evaluate(() => window.__np.bargeWins)).toBe(1);
  await expect(page.locator('#toast')).toContainText('beat them all');
  // Saved meanwhile where the boat came from, not out in the ring.
  const trip = await page.evaluate(
    () => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').trip,
  );
  expect(Math.abs(trip.x - 3000)).toBeLessThan(2);
  // Another fight straight away from the crossed swords, then sunk: back where it was, the hull whole, the catch kept.
  await expect(page.locator('#bargeBtn')).toBeVisible();
  await page.locator('#bargeBtn').click();
  await expect(page.locator('#bargeWhereRow')).toBeHidden();
  await page.locator('#bargeGo').click();
  await page.waitForFunction(
    () => !window.__np.seaWon && window.__np.seaBoss.king.length === 1,
    null,
    {
      timeout: 3000,
    },
  );
  await page.evaluate(() => window.__np.swallow('king'));
  await page.waitForFunction(() => !window.__np.seaFight, null, { timeout: 6000 });
  await expect(page.locator('#toast')).toContainText('Sunk!');
  const home = await page.evaluate(() => ({
    x: window.__np.boat.x,
    y: window.__np.boat.y,
    hp: window.__np.hp,
    hold: window.__np.hold,
  }));
  expect(Math.abs(home.x - 3000)).toBeLessThan(40);
  expect(Math.abs(home.y - 2900)).toBeLessThan(40);
  expect(home.hp).toBe(100);
  expect(home.hold).toBe(3);
  expect(await page.evaluate(() => window.__np.harpoonTarget)).toBeNull();
  // The setup is kept, at sea.
  await page.reload();
  await page.waitForFunction(() => window.__np?.barge?.where === 'sea', null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__np.barge.sea)).toEqual({
    meteor: 0,
    king: 1,
    deep: 1,
    reaper: 0,
    gulper: 0,
    angler: 0,
    cthulu: 0,
    guard: 0,
  });
  expect(errors).toEqual([]);
});

test('the Battle Barge at sea: the Reaper run off with honey, and the gulper harpooned', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    honey: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
    barge: { size: 'small', pick: {}, where: 'sea', sea: { reaper: 1, gulper: 1 } },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await expect(page.locator('#bargeList')).toContainText('The Reaper');
  await expect(page.locator('#bargeList')).toContainText('The gulper');
  await expect(page.locator('#bargeTotal')).toHaveText('2 of 10 picked.');
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => !!window.__np.seaFight, null, { timeout: 3000 });
  // Both come for the boat at once.
  await page.waitForFunction(
    () => {
      const n = window.__np;
      return n.seaBoss.reaper[0]?.state !== 'roam' && n.seaBoss.gulper[0]?.state === 'hunt';
    },
    null,
    { timeout: 4000 },
  );
  // The honey: he stops, shakes the boat, and is off out of the fight.
  await expect(page.locator('#honeyBtn')).toBeVisible({ timeout: 2000 });
  await page.locator('#honeyBtn').click();
  await page.waitForFunction(() => window.__np.seaBoss.reaper[0]?.state === 'shy', null, {
    timeout: 2000,
  });
  expect(await page.evaluate(() => window.__np.honey)).toBe(0);
  await page.waitForFunction(() => window.__np.seaBoss.reaper[0]?.state === 'away', null, {
    timeout: 4000,
  });
  expect(await page.evaluate(() => window.__np.seaWon)).toBe(false);
  // The gulper up at the surface ahead of the bow, one hit from driven off.
  await page.evaluate(() => {
    const n = window.__np;
    const g = n.seaBoss.gulper[0];
    if (!g) return;
    g.x = n.boat.x + Math.cos(n.boat.h) * 160;
    g.y = n.boat.y + Math.sin(n.boat.h) * 160;
    g.up = 1;
    g.resolve = 1;
  });
  await page.waitForFunction(() => window.__np.harpoonTarget === 'gulper', null, { timeout: 2000 });
  await page.evaluate(() => window.__np.fireHarpoon());
  await page.waitForFunction(() => window.__np.seaWon, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.seaBoss.gulper[0]?.state)).toBe('away');
  await expect(page.locator('#toast')).toContainText('beat them all');
  // Home again.
  await page.locator('#leave').click();
  await page.waitForFunction(() => !window.__np.seaFight, null, { timeout: 2000 });
  expect(Math.abs((await page.evaluate(() => window.__np.boat.x)) - 3000)).toBeLessThan(40);
  expect(errors).toEqual([]);
});

test("the Battle Barge at sea: the anglerfish's light harpooned, and the Cthuluviathan's tentacles", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
    barge: { size: 'small', pick: {}, where: 'sea', sea: { angler: 1, cthulu: 1 } },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await expect(page.locator('#bargeList')).toContainText('The anglerfish');
  await expect(page.locator('#bargeList')).toContainText('The Cthuluviathan');
  await page.locator('#bargeGo').click();
  // By day, the Cthuluviathan awake at once and the anglerfish's light coming up.
  await page.waitForFunction(() => window.__np.seaBoss.cthulu[0]?.state === 'awake', null, {
    timeout: 3000,
  });
  // The light ahead of the bow, one hit from driven off; the tentacles held back for it.
  await page.evaluate(() => {
    const n = window.__np;
    const a = n.seaBoss.angler[0];
    const c = n.seaBoss.cthulu[0];
    if (!a || !c) return;
    c.strikeT = 99;
    c.tentacles = [];
    n.boat.v = 0;
    a.x = a.tx = n.boat.x + Math.cos(n.boat.h) * 250;
    a.y = a.ty = n.boat.y + Math.sin(n.boat.h) * 250;
    a.glow = 1;
    a.resolve = 1;
  });
  await page.waitForFunction(() => window.__np.harpoonTarget === 'angler', null, { timeout: 2000 });
  await page.evaluate(() => window.__np.fireHarpoon());
  await page.waitForFunction(() => window.__np.seaBoss.angler[0]?.done, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.seaWon)).toBe(false);
  // The Cthuluviathan, one hit from driven off: its next tentacle comes up by the boat, and the harpoon takes it.
  await page.waitForTimeout(1500);
  const coins = await page.evaluate(() => window.__np.coins);
  await page.evaluate(() => {
    const c = window.__np.seaBoss.cthulu[0];
    if (!c) return;
    c.resolve = 1;
    c.strikeT = 0;
  });
  await page.waitForFunction(() => window.__np.harpoonTarget === 'cthulu', null, { timeout: 5000 });
  await page.evaluate(() => window.__np.fireHarpoon());
  await page.waitForFunction(() => window.__np.seaWon, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.seaBoss.cthulu[0]?.done)).toBe(true);
  expect(await page.evaluate(() => window.__np.coins)).toBe(coins + 1);
  expect(errors).toEqual([]);
});

test('the Battle Barge at sea: Star, down in the water after a dive, is still in the fight, and is harpooned there', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
    barge: { size: 'small', pick: {}, where: 'sea', sea: { meteor: 1 } },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => !!window.__np.seaFight, null, { timeout: 3000 });
  // He dives, and thrashes in the water: not beaten, and his clock runs on.
  await page.waitForFunction(() => window.__np.seaBoss.meteor[0]?.state === 'down', null, {
    timeout: 12000,
  });
  await page.waitForFunction(() => (window.__np.seaBoss.meteor[0]?.t ?? 0) > 0.3, null, {
    timeout: 2000,
  });
  expect(await page.evaluate(() => window.__np.seaWon)).toBe(false);
  // The harpoon has him while he is down, and counts.
  await page.waitForFunction(() => window.__np.harpoonTarget === 'meteor', null, { timeout: 2000 });
  const before = await page.evaluate(() => window.__np.seaBoss.meteor[0]?.resolve ?? 0);
  await page.evaluate(() => window.__np.fireHarpoon());
  await expect
    .poll(() => page.evaluate(() => window.__np.seaBoss.meteor[0]?.resolve ?? 0), { timeout: 2000 })
    .toBeLessThan(before);
  // Up and off again, after the boat.
  await page.waitForFunction(() => window.__np.seaBoss.meteor[0]?.state === 'hunt', null, {
    timeout: 5000,
  });
  expect(await page.evaluate(() => window.__np.seaWon)).toBe(false);
  expect(errors).toEqual([]);
});

test('the Battle Barge at sea: the guard leviathan rises across your way, shoves you back, and is harpooned', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [3] },
    barge: { size: 'small', pick: {}, where: 'sea', sea: { guard: 1 } },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await expect(page.locator('#bargeList')).toContainText('The guard leviathan');
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => !!window.__np.seaFight, null, { timeout: 3000 });
  // Any boat under way, not only a flagship crossing the buoys: it rises across its way.
  const hold = await page.evaluate(() => window.__np.hold);
  await page.evaluate(() => {
    window.__np.boat.v = 120;
  });
  await page.waitForFunction(() => !!window.__np.seaBoss.guard[0]?.lev.rise, null, {
    timeout: 3000,
  });
  // Run into it once it stands: shoved back, the boat's health takes it, and no fish go overboard.
  await page.waitForFunction(() => (window.__np.seaBoss.guard[0]?.lev.rise?.t ?? 0) > 0.6, null, {
    timeout: 2000,
  });
  await page.evaluate(() => {
    const n = window.__np;
    const r = n.seaBoss.guard[0]?.lev.rise;
    if (!r) return;
    n.boat.x = r.x - r.nx * 40;
    n.boat.y = r.y - r.ny * 40;
    n.boat.h = Math.atan2(r.ny, r.nx);
    n.boat.v = 60;
  });
  await page.waitForFunction(() => window.__np.hp < 100, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.hold)).toBe(hold);
  // One hit from driven off, and in reach: the harpoon drives it off, for good, and the fight is won.
  await page.evaluate(() => {
    const g = window.__np.seaBoss.guard[0];
    if (g) g.resolve = 1;
  });
  await page.waitForFunction(() => window.__np.harpoonTarget === 'guard', null, { timeout: 3000 });
  await page.evaluate(() => window.__np.fireHarpoon());
  await page.waitForFunction(() => window.__np.seaWon, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.seaBoss.guard[0]?.done)).toBe(true);
  await page.waitForFunction(() => window.__np.seaBoss.guard[0]?.gone, null, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test("the Battle Barge at sea: the kid's map, islands tapped onto the ring, that block the boat and the bosses", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
    barge: { size: 'small', pick: {}, where: 'sea', sea: { king: 1 } },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  const map = page.locator('#seaMap');
  await expect(map).toBeVisible();
  // The chart is turned the way the game is: a point of the ring, as a share of its radius, on the chart.
  const tap = async (x: number, y: number) => {
    const box = await map.boundingBox();
    if (!box) throw new Error('no chart');
    const cx = (x - y) * Math.SQRT1_2;
    const cy = (x + y) * Math.SQRT1_2;
    await map.click({
      position: { x: ((cx / 1.12 + 1) / 2) * box.width, y: ((cy / 1.12 + 1) / 2) * box.height },
    });
  };
  await tap(-0.35, -0.35);
  await expect.poll(() => page.evaluate(() => window.__np.barge.isles.length)).toBe(1);
  // Tapped again, a Reaper is on it; again, Star; again, it goes; and back.
  await tap(-0.35, -0.35);
  await expect
    .poll(() => page.evaluate(() => window.__np.barge.isles.map((i) => i.who ?? null)))
    .toEqual(['reaper']);
  await tap(-0.35, -0.35);
  await expect
    .poll(() => page.evaluate(() => window.__np.barge.isles.map((i) => i.who ?? null)))
    .toEqual(['star']);
  await tap(-0.35, -0.35);
  await expect.poll(() => page.evaluate(() => window.__np.barge.isles.length)).toBe(0);
  await tap(-0.35, -0.35);
  await expect.poll(() => page.evaluate(() => window.__np.barge.isles.length)).toBe(1);
  // Not where the boat comes in: the card says why.
  await tap(0.5, 0.5);
  await expect(page.locator('#seaMapWhy')).toContainText('where your boat comes in');
  expect(await page.evaluate(() => window.__np.barge.isles.length)).toBe(1);
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => !!window.__np.seaFight, null, { timeout: 3000 });
  const isle = await page.evaluate(() => window.__np.seaFight?.isles[0]);
  if (!isle) throw new Error('no island in the ring');
  expect(isle.r).toBeCloseTo(120, 6);
  // Put the boat, and the Shark King, on its sand: each is back in the water by the next frame.
  await page.evaluate((i) => {
    const n = window.__np;
    n.boat.x = i.x + 30;
    n.boat.y = i.y;
    const k = n.seaBoss.king[0];
    if (k) {
      k.x = i.x - 30;
      k.y = i.y;
    }
  }, isle);
  await page.waitForTimeout(200);
  const at = await page.evaluate(() => {
    const n = window.__np;
    const k = n.seaBoss.king[0];
    return { bx: n.boat.x, by: n.boat.y, kx: k?.x ?? 0, ky: k?.y ?? 0 };
  });
  expect(Math.hypot(at.bx - isle.x, at.by - isle.y)).toBeGreaterThanOrEqual(isle.r);
  expect(Math.hypot(at.kx - isle.x, at.ky - isle.y)).toBeGreaterThanOrEqual(isle.r);
  expect(errors).toEqual([]);
});

test('the Battle Barge at sea: hidden behind an island, the Reaper loses the boat and his blows miss it', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
    barge: { size: 'small', pick: {}, where: 'sea', sea: { reaper: 1 }, isles: [{ x: 0, y: 0 }] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => !!window.__np.seaFight, null, { timeout: 3000 });
  // The boat right across the island from him: he cannot see it, says so, and makes for where he saw it last.
  await page.evaluate(() => {
    const n = window.__np;
    const r = n.seaBoss.reaper[0];
    const f = n.SEA_ARENA;
    if (!r) return;
    const a = Math.atan2(r.y - f.y, r.x - f.x);
    n.boat.x = f.x - Math.cos(a) * 400;
    n.boat.y = f.y - Math.sin(a) * 400;
    n.boat.v = 0;
  });
  // Hidden, he says so; and a sweep that lands while he cannot see the boat misses it. (He makes for where he saw it
  // last, so he soon comes round the island and finds it.)
  const hidden = await page.waitForFunction(
    () => {
      const n = window.__np;
      const r = n.seaBoss.reaper[0];
      if (r?.seaHid !== true || !r.seaGhost) return false;
      const hp = n.hp;
      r.onSweep();
      return n.hp === hp ? 'missed' : 'hit';
    },
    null,
    { timeout: 3000 },
  );
  expect(await hidden.jsonValue()).toBe('missed');
  await expect(page.locator('#toast')).toContainText('Hidden behind the island');
  // Round beside him, in plain sight: he sees it again, and a sweep lands.
  await page.evaluate(() => {
    const n = window.__np;
    const r = n.seaBoss.reaper[0];
    const f = n.SEA_ARENA;
    if (!r) return;
    const a = Math.atan2(r.y - f.y, r.x - f.x);
    n.boat.x = r.x + Math.cos(a + Math.PI / 2) * 160;
    n.boat.y = r.y + Math.sin(a + Math.PI / 2) * 160;
  });
  await page.waitForFunction(() => window.__np.seaBoss.reaper[0]?.seaHid === false, null, {
    timeout: 3000,
  });
  await page.evaluate(() => window.__np.seaBoss.reaper[0]?.onSweep());
  expect(await page.evaluate(() => window.__np.hp)).toBeLessThan(100);
  expect(errors).toEqual([]);
});

test('messages: a tap sends one away, a flick slides it off, and the same one keeps away a while', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  const toast = page.locator('#toast');
  /** Whether this message of ours is the one showing: the sea's own (a turtle, say) may come and go meanwhile. */
  const showing = (text: string) =>
    page.evaluate((t) => {
      const el = document.querySelector('#toast');
      return !!el && el.classList.contains('show') && el.textContent === t;
    }, text);
  // Let the game's own first messages pass, so only ours shows.
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__np.toast('A message to tap away.', 20000, 2));
  await expect(toast).toHaveText('A message to tap away.');
  await expect(toast).toHaveClass(/show/);
  const v0 = await page.evaluate(() => window.__np.boat.v);
  await toast.click();
  await expect.poll(() => showing('A message to tap away.')).toBe(false);
  // The press did not steer.
  expect(await page.evaluate(() => window.__np.boat.v)).toBeLessThanOrEqual(v0);
  // Flicked sideways, it slides off and goes.
  await page.evaluate(() => window.__np.toast('A message to flick away.', 20000, 2));
  await expect(toast).toHaveText('A message to flick away.');
  await expect(toast).toHaveClass(/show/);
  const box = await toast.boundingBox();
  if (!box) throw new Error('no message');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 60, cy, { steps: 4 });
  await page.mouse.move(cx + 120, cy, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => showing('A message to flick away.')).toBe(false);
  // Said again straight away, it keeps away.
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__np.toast('A message to flick away.', 20000, 2));
  await page.waitForTimeout(300);
  expect(await showing('A message to flick away.')).toBe(false);
  // A short drag is not a flick: it goes back and stays.
  await page.evaluate(() => window.__np.toast('A message to keep.', 20000, 2));
  await expect(toast).toHaveText('A message to keep.');
  await expect(toast).toHaveClass(/show/);
  const b2 = await toast.boundingBox();
  if (!b2) throw new Error('no message');
  await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2);
  await page.mouse.down();
  await page.mouse.move(b2.x + b2.width / 2 + 20, b2.y + b2.height / 2, { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  await expect(toast).toHaveClass(/show/);
  await expect(toast).toHaveText('A message to keep.');
  expect(errors).toEqual([]);
});

test('the Battle Barge on the tar: from the chemistry boat, the eel, a tentacle and the kraken in a ring of tar, beaten for the coin', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    stealth1: true,
    invis: true,
    eelStage: 2,
    barge: { size: 'small', where: 'tar', tarFoes: { eel: 1, tentacle: 1, kraken: 1 } },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await expect(page.locator('#bargeWhere')).toContainText('On the tar');
  await expect(page.locator('#bargeList')).toContainText('The tar kraken');
  await page.locator('#bargeGo').click();
  // Out in the chemistry boat, in the ring of tar, its health bar up, the sea's order put away.
  await page.waitForFunction(() => !!window.__np.tarRing && !!window.__np.tarSail, null, {
    timeout: 3000,
  });
  const at = await page.evaluate(() => {
    const n = window.__np;
    const b = n.tarSail as { x: number; y: number };
    return Math.hypot(b.x - n.TAR_ARENA.x, b.y - n.TAR_ARENA.y) < (n.tarRing?.r ?? 0);
  });
  expect(at).toBe(true);
  await expect(page.locator('#leave')).toHaveText('Leave the barge');
  await expect(page.locator('#hull')).toBeVisible();
  // Fought through: the eel's head when it is up, the kraken's arms and then its eye, and the tentacle once the
  // kraken is down, sailing round the ring.
  // Most of the way through already, so the test is quick: the eel one hit off, the kraken one arm and two hits.
  await page.evaluate(() => {
    for (const e of window.__np.tarRing?.eels ?? []) e.hp = 1;
    for (const k of window.__np.tarRing?.krakens ?? []) {
      k.chopped = 9;
      k.hp = 2;
    }
  });
  for (let i = 0; i < 160; i++) {
    const done = await page.evaluate(() => {
      const n = window.__np;
      const r = n.tarRing;
      if (!r || r.won) return true;
      n.setChemHp?.(100);
      const b = n.tarSail as { x: number; y: number; h: number; v: number };
      b.v = 150;
      b.h += 0.2;
      for (const k of r.krakens) {
        if (!k.up) continue;
        if (k.eyeOpen) k.harpoonEye(1);
        const a = k.nearestArm(b.x, b.y, 1e4);
        if (a) k.chop(a);
      }
      for (const e of r.eels) if (e.mark()) e.harpoon(1);
      const t = r.tents?.nearest(b.x, b.y, 1e4);
      if (t) r.tents?.harpoon(t, 1);
      return false;
    });
    if (done) break;
    await page.waitForTimeout(300);
  }
  await page.waitForFunction(() => window.__np.bargeWins === 1, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('beat them all');
  // Off the barge: back aboard the flagship where it waited.
  await page.locator('#leave').click();
  await page.waitForFunction(() => window.__np.tarSail === null, null, { timeout: 3000 });
  expect(
    await page.evaluate(() => [
      window.__np.tarRing,
      window.__np.walker.state,
      Math.round(window.__np.boat.x),
      Math.round(window.__np.boat.y),
    ]),
  ).toEqual([null, 'aboard', 3000, 2900]);
  expect(errors).toEqual([]);
});

test('the Battle Barge on the tar: bitten to nothing, the chemistry boat is pulled under and you are back, nothing lost', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 50,
    spear: 3,
    stealth1: true,
    invis: true,
    eelStage: 1,
    barge: { size: 'medium', where: 'tar', tarFoes: { eel: 1, kraken: 1 } },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  // A salvage crate that happens to be under the boat or the net pays too: none near, for this. One can pay out in
  // the first frames, before they are moved, so what is held is counted from here.
  const held = await page.evaluate(() => {
    for (const f of window.__np.flotsam) {
      f.x = -50000;
      f.y = -50000;
    }
    return window.__np.coins;
  });
  await page.locator('#bargeBtn').click();
  // The kraken is not on the card until it is awake, after the tar eel.
  await expect(page.locator('#bargeList')).toContainText('The tar eel');
  await expect(page.locator('#bargeList')).not.toContainText('The tar kraken');
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => !!window.__np.tarRing, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.tarRing?.krakens.length)).toBe(0);
  await page.evaluate(() => {
    const n = window.__np;
    n.setChemHp?.(5);
    n.tarRing?.eels[0]?.onBite?.(true);
  });
  await page.waitForFunction(() => window.__np.tarRing === null, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('Pulled under the tar');
  expect(
    await page.evaluate(() => [
      window.__np.bargeWins,
      window.__np.coins,
      window.__np.walker.state,
      window.__np.chemHp,
    ]),
  ).toEqual([0, held, 'aboard', 100]);
  expect(errors).toEqual([]);
});

test("the Battle Barge at sea: the kid's tar, tapped onto the map, slows the boat and keeps the bosses out", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
    barge: { size: 'small', pick: {}, where: 'sea', sea: { king: 1 } },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  const map = page.locator('#seaMap');
  await expect(map).toBeVisible();
  await page.locator('#seaTools [data-tool="tar"]').click();
  await expect(page.locator('#seaTools [data-tool="tar"]')).toHaveClass(/on/);
  const box = await map.boundingBox();
  if (!box) throw new Error('no chart');
  // The point of the ring, as a share of its radius, on the chart turned the way the game is.
  const [x, y] = [-0.35, -0.35];
  const cx = (x - y) * Math.SQRT1_2;
  const cy = (x + y) * Math.SQRT1_2;
  await map.click({
    position: { x: ((cx / 1.12 + 1) / 2) * box.width, y: ((cy / 1.12 + 1) / 2) * box.height },
  });
  await expect.poll(() => page.evaluate(() => window.__np.barge.tar.length)).toBe(1);
  expect(await page.evaluate(() => window.__np.barge.isles.length)).toBe(0);
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => !!window.__np.seaFight, null, { timeout: 3000 });
  const tar = await page.evaluate(() => window.__np.seaFight?.tar[0]);
  if (!tar) throw new Error('no tar in the ring');
  // Out of it the boat has its full speed; in it, it crawls.
  expect(await page.evaluate(() => window.__np.seaTarK)).toBe(1);
  // Into the tar the boat goes, and so does the Shark King: the boat stays in it, crawling, and he is put out.
  await page.evaluate((t) => {
    const n = window.__np;
    n.boat.x = t.x + 20;
    n.boat.y = t.y;
    n.boat.v = 0;
    const k = n.seaBoss.king[0];
    if (k) {
      k.x = t.x - 20;
      k.y = t.y;
    }
  }, tar);
  await page.waitForTimeout(200);
  const at = await page.evaluate(() => {
    const n = window.__np;
    const k = n.seaBoss.king[0];
    return { bx: n.boat.x, by: n.boat.y, kx: k?.x ?? 0, ky: k?.y ?? 0, slow: n.seaTarK };
  });
  expect(Math.hypot(at.bx - tar.x, at.by - tar.y)).toBeLessThan(tar.r);
  expect(at.slow).toBeLessThan(0.5);
  expect(Math.hypot(at.kx - tar.x, at.ky - tar.y)).toBeGreaterThanOrEqual(tar.r);
  expect(errors).toEqual([]);
});

test("the Battle Barge at sea: the kid's bridge, its dock, onto it and back, and the bosses kept off it", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
    barge: { size: 'small', pick: {}, where: 'sea', sea: { king: 1 } },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await page.locator('#seaTools [data-tool="bridge"]').click();
  const map = page.locator('#seaMap');
  const box = await map.boundingBox();
  if (!box) throw new Error('no chart');
  const [x, y] = [0, -0.2];
  const cx = (x - y) * Math.SQRT1_2;
  const cy = (x + y) * Math.SQRT1_2;
  await map.click({
    position: { x: ((cx / 1.12 + 1) / 2) * box.width, y: ((cy / 1.12 + 1) / 2) * box.height },
  });
  await expect.poll(() => page.evaluate(() => window.__np.barge.bridges.length)).toBe(1);
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => !!window.__np.seaFight, null, { timeout: 3000 });
  // Up to its dock, stopped: onto the bridge.
  expect(await page.evaluate(() => window.__np.seaDock)).toBe(false);
  await page.evaluate(() => {
    const n = window.__np;
    const br = n.seaFight?.bridges[0];
    if (!br) return;
    const q = br.dock.berth(1.6);
    n.boat.x = q.x;
    n.boat.y = q.y;
    n.boat.h = q.h;
    n.boat.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('Onto the bridge', { timeout: 3000 });
  await page.locator('#climb').click();
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('On the bridge');
  // Up the steps and onto the deck.
  await page.evaluate(() => {
    const n = window.__np;
    const br = n.seaFight?.bridges[0];
    if (!br) return;
    n.walker.x = br.x;
    n.walker.y = br.y;
  });
  await expect.poll(() => page.evaluate(() => window.__np.walker.z)).toBe(26);
  // The Shark King put on it is back in the water by the next frame.
  await page.evaluate(() => {
    const n = window.__np;
    const br = n.seaFight?.bridges[0];
    const k = n.seaBoss.king[0];
    if (!br || !k) return;
    k.x = br.x + 40 * Math.SQRT1_2;
    k.y = br.y - 40 * Math.SQRT1_2;
  });
  await page.waitForTimeout(200);
  const kd = await page.evaluate(() => {
    const n = window.__np;
    const br = n.seaFight?.bridges[0];
    const k = n.seaBoss.king[0];
    if (!br || !k) return 0;
    // Across the bridge from its line.
    return Math.abs((k.x - br.x) * Math.SQRT1_2 + (k.y - br.y) * Math.SQRT1_2);
  });
  expect(kd).toBeGreaterThanOrEqual(22);
  // Leaving the fight from the bridge, the figure is back aboard.
  await page.evaluate(() => window.__np.endSea(false));
  expect(await page.evaluate(() => [!!window.__np.seaFight, window.__np.walker.state])).toEqual([
    false,
    'aboard',
  ]);
  expect(errors).toEqual([]);
});

test("the Battle Barge at sea: ashore on the kid's island, its Reaper fought on foot, and the fight won", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
    barge: {
      size: 'small',
      pick: {},
      where: 'sea',
      sea: {},
      isles: [{ x: -0.3, y: -0.3, who: 'reaper' }],
    },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  // A Reaper on an island and nothing else is a fight.
  await expect(page.locator('#bargeTotal')).toHaveText('Just a Reaper on an island.');
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => !!window.__np.seaFight, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.seaReapers.map((r) => r.state))).toEqual(['sleep']);
  // Up against its sand, on the ring's side, stopped: ashore.
  expect(await page.evaluate(() => window.__np.seaIsle)).toBe(false);
  await page.evaluate(() => {
    const n = window.__np;
    const i = n.seaFight?.isles[0];
    if (!i) return;
    const a = Math.atan2(n.SEA_ARENA.y - i.y, n.SEA_ARENA.x - i.x);
    n.boat.x = i.x + Math.cos(a) * (i.r + 50);
    n.boat.y = i.y + Math.sin(a) * (i.r + 50);
    n.boat.h = a + Math.PI;
    n.boat.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('Step ashore', { timeout: 3000 });
  await page.locator('#climb').click();
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // He is up at once, the hearts show, and the message says how to fight him.
  await page.waitForFunction(() => !!window.__np.seaReapers[0]?.awake, null, { timeout: 2000 });
  await expect(page.locator('#hearts')).toBeVisible();
  await expect(page.locator('#toast')).toContainText("this island's Reaper is up");
  // A walk up the beach and back, and back aboard where it landed: he lies down again, whole.
  await page.evaluate(() => {
    const n = window.__np;
    const i = n.seaFight?.isles[0];
    if (!i) return;
    const l = n.walker.dock.landing;
    n.walker.x = l.x + (i.x - l.x) * 0.4;
    n.walker.y = l.y + (i.y - l.y) * 0.4;
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.walker.dock.landing.x;
    n.walker.y = n.walker.dock.landing.y;
  });
  await expect(page.locator('#aboard')).toBeVisible({ timeout: 2000 });
  await page.locator('#aboard').click();
  await page.waitForFunction(() => window.__np.walker.state === 'aboard', null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.seaReapers.map((r) => [r.state, r.hp]))).toEqual([
    ['sleep', 30],
  ]);
  // Ashore again; and beaten (as if by every spear at once), he goes off into the sea, and the fight is won.
  await expect(page.locator('#climb')).toHaveText('Step ashore', { timeout: 3000 });
  await page.locator('#climb').click();
  await page.waitForFunction(() => !!window.__np.seaReapers[0]?.awake, null, { timeout: 4000 });
  await page.evaluate(() => window.__np.seaReapers[0]?.hit(30, true));
  await page.waitForFunction(() => window.__np.seaWon, null, { timeout: 15000 });
  expect(['flee', 'gone']).toContain(await page.evaluate(() => window.__np.seaReapers[0]?.state));
  expect(errors).toEqual([]);
});

test("the Battle Barge at sea: Star over the kid's island dives at the figure ashore, is speared on the sand, and driven off", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    armour: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
    barge: {
      size: 'small',
      pick: {},
      where: 'sea',
      sea: {},
      isles: [{ x: -0.3, y: -0.3, who: 'star' }],
    },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await expect(page.locator('#bargeTotal')).toHaveText('Just Star on an island.');
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => !!window.__np.seaFight, null, { timeout: 3000 });
  // Up on his loop over the island while the boat is at sea.
  expect(await page.evaluate(() => window.__np.seaStars.map((m) => m.state))).toEqual(['haunt']);
  await page.evaluate(() => {
    const n = window.__np;
    const i = n.seaFight?.isles[0];
    if (!i) return;
    const a = Math.atan2(n.SEA_ARENA.y - i.y, n.SEA_ARENA.x - i.x);
    n.boat.x = i.x + Math.cos(a) * (i.r + 50);
    n.boat.y = i.y + Math.sin(a) * (i.r + 50);
    n.boat.h = a + Math.PI;
    n.boat.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('Step ashore', { timeout: 3000 });
  await page.locator('#climb').click();
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('Star is coming for you');
  // He comes for the figure, dives, and is down on the sand: the throw button is up, and a spear counts.
  await page.waitForFunction(() => window.__np.seaStars[0]?.state === 'down', null, {
    timeout: 10000,
  });
  const before = await page.evaluate(() => window.__np.seaStars[0]?.resolve ?? 0);
  await expect(page.locator('#throw')).toBeVisible({ timeout: 1000 });
  await page.locator('#throw').click();
  await expect
    .poll(() => page.evaluate(() => window.__np.seaStars[0]?.resolve ?? 0), { timeout: 2000 })
    .toBeLessThan(before);
  // The rest at once: driven off, and the fight is won.
  await page.evaluate(() => {
    const m = window.__np.seaStars[0];
    if (m) m.harpoon(10);
  });
  await page.waitForFunction(() => window.__np.seaWon, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.seaStars[0]?.state)).toBe('away');
  expect(errors).toEqual([]);
});

test('the Battle Barge, stage 2: gorillas, gators, a lancer, the swordsman and the three demons, all beaten', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    armour: 4,
    barge: {
      size: 'small',
      pick: { gorilla: 1, gator: 1, lancer: 1, swordsman: 1, red: 1, blue: 1, green: 1 },
    },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await expect(page.locator('#bargeTotal')).toHaveText('7 of 10 picked.');
  // The list scrolls inside the card; the last of it can still be picked, and Fight! is always in reach.
  await page.locator('#bargeList [data-foe="lancer"][data-d="1"]').click();
  await expect(page.locator('#bargeTotal')).toHaveText('8 of 10 picked.');
  await page.locator('#bargeList [data-foe="lancer"][data-d="-1"]').click();
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => window.__np.floor === window.__np.ARENAS.small, null, {
    timeout: 3000,
  });
  const band = await page.evaluate(() => {
    const n = window.__np;
    return {
      gorillas: n.bargeGorillas.list.map((g) => g.state),
      gators: n.bargeGators.list.map((g) => g.state),
      lancers: n.bargeLancers.list.map((l) => l.state),
      fighters: n.bargeFighters.map((f) => f.spec.look),
    };
  });
  // All of them coming from the start: the gorilla beating its chest, the lancer roused, the gator out on the deck.
  expect(band.gorillas).toEqual(['warn']);
  expect(band.gators).toEqual(['chase']);
  expect(band.lancers).toEqual(['walk']);
  expect(band.fighters).toEqual(['swordsman', 'red', 'blue', 'green']);
  // The blue demon and the green call up their monkeys.
  await page.evaluate(() => window.__np.setHearts(9));
  await page.waitForFunction(
    () => (window.__np.bargeCamps[window.__np.floor]?.imps?.list.length ?? 0) >= 2,
    null,
    { timeout: 4000 },
  );
  await page.evaluate(() => {
    const n = window.__np;
    n.setHearts(9);
    for (const g of n.bargeGorillas.list) n.bargeGorillas.hit(g, 99);
    for (const g of n.bargeGators.list) n.bargeGators.hit(g, 99);
    for (const l of n.bargeLancers.list) n.bargeLancers.hit(l, 99);
    // The swordsman and the red and the green demons block the first.
    for (const f of n.bargeFighters) for (const k of [0, 1]) f.hit(99 + k);
    const imps = n.bargeCamps[n.floor]?.imps;
    for (const m of imps?.list ?? []) imps?.hit(m, 99, n.walker.x, n.walker.y);
  });
  // Won once the last has fallen.
  await page.waitForFunction(() => window.__np.bargeWins === 1, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('beat them all');
  await page.locator('#leave').click();
  await page.waitForFunction(() => window.__np.floor === -1, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.bargeFighters.length)).toBe(0);
  expect(await page.evaluate(() => window.__np.walker.state)).toBe('aboard');
  expect(errors).toEqual([]);
});

test('the Battle Barge, stage 3: the sorcerer, the Forgotten One, the Heron and the pelican, all beaten', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    armour: 4,
    barge: { size: 'medium', pick: { sorcerer: 1, forgotten: 1, heron: 1, pelican: 1 } },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  // The bosses have their own heading, at the bottom of the list.
  await expect(page.locator('#bargeList')).toContainText('Bosses');
  await expect(page.locator('#bargeTotal')).toHaveText('4 of 10 picked.');
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => window.__np.floor === window.__np.ARENAS.medium, null, {
    timeout: 3000,
  });
  // All four come for the figure at once; the pelican after its flapping, down off its nest.
  await page.evaluate(() => window.__np.setHearts(9));
  await page.waitForFunction(
    () => {
      const b = window.__np.bargeBoss;
      return (
        b.sorcerer[0]?.up && b.forgotten[0]?.up && b.heron[0]?.up && b.pelican[0]?.low === true
      );
    },
    null,
    { timeout: 6000 },
  );
  await page.evaluate(() => {
    const n = window.__np;
    n.setHearts(9);
    const b = n.bargeBoss;
    for (const k of ['sorcerer', 'forgotten', 'heron', 'pelican'] as const)
      for (const q of b[k]) q.hit(99);
  });
  await page.waitForFunction(() => window.__np.bargeWins === 1, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('beat them all');
  await page.locator('#leave').click();
  await page.waitForFunction(() => window.__np.floor === -1, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.bargeBoss.heron.length)).toBe(0);
  expect(errors).toEqual([]);
});

test('the Battle Barge: Cthulhu, and the Old One rising out of the sea with his lagoon creatures, all beaten', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    armour: 4,
    barge: { size: 'large', pick: { cthulhu: 1, oldone: 1 } },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await expect(page.locator('#bargeTotal')).toHaveText('2 of 10 picked.');
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => window.__np.floor === window.__np.ARENAS.large, null, {
    timeout: 3000,
  });
  // The Old One comes up out of the sea, and calls his creatures up onto the deck.
  await page.evaluate(() => window.__np.setHearts(9));
  await page.waitForFunction(
    () => {
      const n = window.__np;
      return (
        n.bargeBoss.oldone[0]?.up &&
        n.bargeBoss.cthulhu[0]?.up &&
        (n.hordes[n.floor]?.list.length ?? 0) >= 5
      );
    },
    null,
    { timeout: 6000 },
  );
  await page.evaluate(() => {
    const n = window.__np;
    n.setHearts(9);
    for (const k of ['cthulhu', 'oldone'] as const) for (const q of n.bargeBoss[k]) q.hit(99);
  });
  // Then his creatures, as they finish climbing aboard; won once the last is down.
  await page.waitForFunction(
    () => {
      const n = window.__np;
      n.setHearts(9);
      const h = n.hordes[n.floor];
      if (h) for (const u of h.list) h.hit(u, 99, n.walker.x, n.walker.y);
      return n.bargeWins === 1;
    },
    null,
    { timeout: 8000, polling: 200 },
  );
  await expect(page.locator('#toast')).toContainText('beat them all');
  expect(errors).toEqual([]);
});

test('the Battle Barge: the Reaper on land, speared when he rears up, and off over the side', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    armour: 4,
    barge: { size: 'medium', pick: { reaper: 1 } },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => window.__np.floor === window.__np.ARENAS.medium, null, {
    timeout: 3000,
  });
  // He wakes at once on the deck, and only reared up does a spear get past his scales.
  await page.waitForFunction(
    () => {
      const n = window.__np;
      n.setHearts(9);
      return n.bargeBoss.reaper[0]?.open === true;
    },
    null,
    { timeout: 20000, polling: 50 },
  );
  await page.evaluate(() => {
    for (const r of window.__np.bargeBoss.reaper) r.hit(99);
  });
  await page.waitForFunction(() => window.__np.bargeWins === 1, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('beat them all');
  expect(errors).toEqual([]);
});

test('the Battle Barge: the Tar Anchorer wades round the barge, throws its anchor, and melts away', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    armour: 4,
    barge: { size: 'medium', pick: { anchorer: 1 } },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => window.__np.floor === window.__np.ARENAS.medium, null, {
    timeout: 3000,
  });
  // It rises off the far side and wades round the rail to throw: from across the deck, it comes round.
  await page.waitForFunction(
    () => {
      const n = window.__np;
      n.setHearts(9);
      return n.bargeBoss.anchorer[0]?.state === 'whirl';
    },
    null,
    { timeout: 15000, polling: 100 },
  );
  await page.evaluate(() => {
    for (const a of window.__np.bargeBoss.anchorer) a.hit(99);
  });
  await page.waitForFunction(() => window.__np.bargeWins === 1, null, { timeout: 5000 });
  await expect(page.locator('#toast')).toContainText('beat them all');
  expect(errors).toEqual([]);
});

test('the Battle Barge: the giant spider in a web on the deck, beaten only by bug spray', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    armour: 4,
    bugSpray: 6,
    barge: { size: 'medium', pick: { spider: 1 } },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => window.__np.floor === window.__np.ARENAS.medium, null, {
    timeout: 3000,
  });
  // Down he comes at once; up close, the spray can shows, and three sprays beat him.
  for (let i = 0; i < 30; i++) {
    const done = await page.evaluate(() => {
      const n = window.__np;
      n.setHearts(9);
      const sd = n.bargeBoss.spider[0];
      if (!sd || sd.state === 'fall' || sd.state === 'gone') return true;
      if (sd.state === 'chase' || sd.state === 'hurt') {
        n.walker.x = sd.x + 30;
        n.walker.y = sd.y + 30;
      }
      return false;
    });
    if (done) break;
    if (await page.evaluate(() => window.__np.sprayShown))
      await page.dispatchEvent('#sprayBtn', 'pointerdown', { button: 0, pointerType: 'touch' });
    await page.waitForTimeout(400);
  }
  await page.waitForFunction(() => window.__np.bargeWins === 1, null, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.bugSpray)).toBe(3);
  // With no bug spray left in the bag, the card will not add him.
  await page.evaluate(() => {
    window.__np.bugSpray = 0;
  });
  await page.locator('#bargeBtn').click();
  await expect(page.locator('#bargeList')).toContainText('You have no bug spray');
  await expect(page.locator('#bargeList [data-foe="spider"][data-d="1"]')).toBeDisabled();
  expect(errors).toEqual([]);
});

test("the Battle Barge: the tar island's bosses, the tar leader on the deck and the tar dragon circling over it, both beaten", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    armour: 4,
    barge: { size: 'large', pick: { tarleader: 1, tardragon: 1 } },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await expect(page.locator('#bargeList')).toContainText('The tar leader');
  await expect(page.locator('#bargeList')).toContainText('The tar dragon');
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => window.__np.floor === window.__np.ARENAS.large, null, {
    timeout: 3000,
  });
  // Both there; the dragon up off its circle at once, over the deck.
  await page.waitForFunction(
    () => {
      const b = window.__np.bargeBoss;
      return b.tarleader.length === 1 && b.tardragon.length === 1 && b.tardragon[0]?.up;
    },
    null,
    { timeout: 4000 },
  );
  // The leader beaten, calling up two tar humans at half; the dragon only once it is down low, after a swoop: then
  // the fight's coin.
  await page.evaluate(() => {
    const n = window.__np;
    n.setHearts(9);
    for (const b of n.bargeBoss.tarleader) for (let i = 0; i < 4; i++) b.hit(9);
  });
  expect(await page.evaluate(() => window.__np.bargeTar.list.length)).toBe(2);
  for (let i = 0; i < 60; i++) {
    const done = await page.evaluate(() => {
      const n = window.__np;
      n.setHearts(9);
      const d = n.bargeBoss.tardragon[0];
      // The tar humans he called up at half, as on his island.
      for (const f of n.bargeTar.list) n.bargeTar.hit(f, 99);
      if (!d || d.state === 'melt' || d.state === 'gone') return true;
      if (d.low) d.hit(9);
      return false;
    });
    if (done) break;
    await page.waitForTimeout(250);
  }
  await page.waitForFunction(() => window.__np.bargeWins === 1, null, { timeout: 6000 });
  expect(errors).toEqual([]);
});

test('the Battle Barge: Skrill, laughing at once, with his five monkeys; beaten first, he lies there while they are', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    armour: 4,
    barge: { size: 'large', pick: { skrill: 1 } },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await expect(page.locator('#bargeList')).toContainText('With his five monkeys');
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => window.__np.floor === window.__np.ARENAS.large, null, {
    timeout: 3000,
  });
  // There, laughing at once, and his five monkeys round him.
  await page.waitForFunction(
    () => {
      const n = window.__np;
      return (
        n.bargeBoss.skrill.length === 1 &&
        n.bargeBoss.skrill[0]?.up &&
        (n.bargeCamps[n.floor]?.imps?.list.length ?? 0) === 5
      );
    },
    null,
    { timeout: 4000 },
  );
  // Speared down low until he crashes down, his monkeys still up: not won yet.
  for (let i = 0; i < 60; i++) {
    const done = await page.evaluate(() => {
      const n = window.__np;
      n.setHearts(9);
      const sk = n.bargeBoss.skrill[0];
      if (!sk?.up) return true;
      if (sk.low) sk.hit(9);
      return false;
    });
    if (done) break;
    await page.waitForTimeout(250);
  }
  await page.waitForFunction(() => window.__np.bargeBoss.skrill[0]?.state === 'down', null, {
    timeout: 4000,
  });
  expect(await page.evaluate(() => window.__np.bargeWins)).toBe(0);
  // Then the monkeys, and the fight's coin: lying there beaten, he counts as beaten.
  await page.evaluate(() => {
    const n = window.__np;
    n.setHearts(9);
    const imps = n.bargeCamps[n.floor]?.imps;
    for (const m of imps?.list ?? []) imps?.hit(m, 99, n.walker.x, n.walker.y);
  });
  await page.waitForFunction(() => window.__np.bargeWins === 1, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('beat them all');
  expect(errors).toEqual([]);
});

test('the Battle Barge camera frames the arena, not the figure, so the fight at its back is in view', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    armour: 4,
    barge: { size: 'large', pick: { zombie: 1 } },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => window.__np.floor === window.__np.ARENAS.large, null, {
    timeout: 3000,
  });
  // Out at the deck's front edge: the camera stays on the arena's middle, leaning only a little toward the figure.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = -19500 + 150;
    n.walker.y = -8200 + 150;
    n.setHearts(9);
  });
  await page.waitForTimeout(2500);
  const [mid, me, size] = await page.evaluate(() => [
    window.__np.screenOf(-19500, -8200),
    window.__np.screenOf(window.__np.walker.x, window.__np.walker.y),
    window.__np.viewSize,
  ]);
  const [w, h] = size;
  expect(Math.abs(mid[0] - w / 2)).toBeLessThan(w * 0.12);
  expect(mid[1]).toBeGreaterThan(h * 0.4);
  expect(mid[1]).toBeLessThan(h * 0.62);
  // The figure is on the screen, but well off its middle.
  expect(me[1]).toBeLessThan(h * 0.85);
  expect(Math.hypot(me[0] - w / 2, me[1] - h / 2)).toBeGreaterThan(40);
  expect(errors).toEqual([]);
});

test('the Battle Barge from ashore: bonked out, back on the spot you stood on, nothing lost', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    barge: { size: 'medium', pick: { lagoon: 4 } },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 9120, y: -3250, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    const w = window.__np.walker;
    const i = window.__np.ISLE11;
    w.x = i.x + 40;
    w.y = i.y + 200;
  });
  const at = await page.evaluate(() => ({ x: window.__np.walker.x, y: window.__np.walker.y }));
  await expect(page.locator('#bargeBtn')).toBeVisible({ timeout: 4000 });
  await page.locator('#bargeBtn').click();
  await expect(page.locator('#bargeTotal')).toHaveText('4 of 10 picked.');
  await page.locator('#bargeGo').click();
  await page.waitForFunction(() => window.__np.floor === window.__np.ARENAS.medium, null, {
    timeout: 3000,
  });
  // One heart left, and four lagoon creatures coming: bonked out.
  await page.evaluate(() => window.__np.setHearts(1));
  await page.waitForFunction(() => window.__np.floor === -1, null, { timeout: 15000 });
  await expect(page.locator('#toast')).toContainText('Bonked out');
  const back = await page.evaluate(() => ({
    state: window.__np.walker.state,
    x: window.__np.walker.x,
    y: window.__np.walker.y,
    hearts: window.__np.hearts,
    max: window.__np.maxHearts,
  }));
  expect(back.state).toBe('ashore');
  expect(Math.hypot(back.x - at.x, back.y - at.y)).toBeLessThan(2);
  expect(back.hearts).toBe(back.max);
  expect(errors).toEqual([]);
});

test("island 11's heron: the Heron's brother zaps in his clearing, can't be beaten, says goodbye, and Caterman joins you", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    armour: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 9120, y: -3250, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('ZAP');
  // Into his clearing: he wakes, two hands and all.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const c = window.__np.CLEARING11;
    w.x = c.x + 40;
    w.y = c.y + 40;
  });
  await page.waitForFunction(() => window.__np.brother.up, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('two hands');
  await expect(page.locator('#throw')).toBeVisible();
  await page.click('#throw');
  await page.waitForFunction(
    () => window.__np.brother.hp < 14 || window.__np.brother.copies.some((c) => c.pop > 0),
    null,
    { timeout: 3000 },
  );
  // Got the better of, he stops, says goodbye and flies off; Caterman comes out of his workshop.
  await page.evaluate(() => window.__np.brother.hit(99));
  await page.waitForFunction(() => window.__np.catermanFree, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('challengers');
  await page.waitForFunction(() => window.__np.caterman.shown, null, { timeout: 8000 });
  await expect(page.locator('#toast')).toContainText('Caterman joins you');
  // And he comes along: walk off, and he follows.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const c = window.__np.CLEARING11;
    w.x = c.x + 10;
    w.y = c.y + 160;
  });
  await page.waitForFunction(
    () => {
      const c = window.__np.caterman;
      const w = window.__np.walker;
      return Math.hypot(c.x - w.x, c.y - w.y) < 80;
    },
    null,
    { timeout: 6000 },
  );
  await expect(page.locator('#log')).toContainText('Caterman joined you');
  // He stays yours, and the brother stays gone.
  await page.reload();
  await page.waitForFunction(() => window.__np?.catermanFree === true, null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__np.brother.up)).toBe(false);
  expect(errors).toEqual([]);
});

test("Caterman's swan paddle boat: he pedals it at sea, and the kid puts a friend in the seat beside him", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle8Seen: true,
    heronStage: 2,
    heronFled: true,
    isle10Seen: true,
    isle11Seen: true,
    catermanFree: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  // Out at sea, Caterman on his swan and the necromancer on his catamaran.
  await page.waitForFunction(
    () => window.__np.flotilla.crafts.find((c) => c.kind === 'swan')?.placed,
    null,
    { timeout: 3000 },
  );
  expect(await page.evaluate(() => window.__np.flotilla.riding('caterman'))).toBe(true);
  const gap = await page.evaluate(() => {
    const { flotilla: f, boat: b } = window.__np;
    const s = f.crafts.find((c) => c.kind === 'swan');
    return s ? Math.hypot(s.x - b.x, s.y - b.y) : 1e9;
  });
  expect(gap).toBeLessThan(260);
  // The Boats card has the swan, with its two seats side by side.
  await page.waitForFunction(() => document.getElementById('boatsBtn')?.hidden === false, null, {
    timeout: 3000,
  });
  await page.locator('#boatsBtn').dispatchEvent('click');
  await expect(page.locator('#boats')).toBeVisible();
  await expect(page.locator('#boatsList .boat')).toHaveCount(5);
  const swan = page.locator('#boatsList .boat').last();
  await expect(swan).toContainText('Swan paddle boat');
  await expect(swan.locator('.seat')).toHaveText(['Right seat', 'Left seat']);
  await expect(page.locator('#boatsList .rchip.on[data-craft="swan"]')).toHaveText('Caterman');
  await expect(page.locator('#boatsList .rchip.on[data-craft="swan2"]')).toHaveText('Nobody');
  // The necromancer beside him: his catamaran is left empty.
  await page.locator('#boatsList [data-craft="swan2"][data-rider="necro"]').click();
  await expect(page.locator('#boatsList .rchip.on[data-craft="swan2"]')).toHaveText('Necromancer');
  await expect(page.locator('#boatsList .rchip.on[data-craft="catamaran"]')).toHaveText('Nobody');
  await page.locator('#boatsClose').click();
  await page.waitForFunction(
    () => !window.__np.flotilla.crafts.find((c) => c.kind === 'catamaran')?.placed,
    null,
    { timeout: 3000 },
  );
  // Kept: a reload finds the two of them on the swan.
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  expect(await page.evaluate(() => window.__np.flotilla.crew)).toMatchObject({
    catamaran: null,
    swan: 'caterman',
    swan2: 'necro',
  });
  expect(errors).toEqual([]);
});

test("Caterman's drone: bought at his workshop door in a colour of your own, flown on into the jungle, rings paid for", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 3500,
    isle3Stage: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    heronStage: 2,
    heronFled: true,
    isle10Seen: true,
    isle11Seen: true,
    catermanFree: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 9120, y: -3250, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // At his workshop's door: in to see him.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const d = window.__np.SHOP_DOOR11;
    w.x = d.x - 14;
    w.y = d.y;
  });
  await expect(page.locator('#climb')).toHaveText("Caterman's workshop", { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#droneCard')).toBeVisible();
  await expect(page.locator('#droneGo')).toBeHidden();
  await expect(page.locator('#droneColours .swatch')).toHaveCount(9);
  // The colour first, then bought: 3,000 coins.
  await page.locator('#droneColours [data-col="5"]').click();
  await expect(page.locator('#droneColours [data-col="5"]')).toHaveClass(/on/);
  await page.locator('#droneShelf [data-buy="drone"]').click();
  await expect(page.locator('#droneGo')).toBeVisible();
  expect(await page.evaluate(() => [window.__np.coins, window.__np.drone])).toEqual([
    500,
    {
      owned: true,
      colour: 5,
      flights: 0,
      bestRings: 0,
      traps: [-1, -1, -1, -1, -1],
      beetles: 0,
      up: { battery: 0, handling: 0, traps: 0, line: 0 },
    },
  ]);
  // Up it goes: the whole screen is the flight, steered with the keys as with a thumb.
  await page.click('#droneGo');
  await page.waitForFunction(() => window.__np.droneFly?.state === 'fly', null, { timeout: 3000 });
  await expect(page.locator('#droneCard')).toBeHidden();
  // The way out is up top, out of the steering thumb's way.
  await expect(page.locator('#leave')).toHaveText('Land the drone');
  await expect(page.locator('#climb')).toBeHidden();
  await expect(page.locator('#hearts')).toBeHidden();
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => (window.__np.droneFly?.x ?? 0) > 2, null, { timeout: 3000 });
  await page.keyboard.up('ArrowRight');
  // A ring set right in its way, and through it.
  await page.evaluate(() => {
    const f = window.__np.droneFly;
    if (f) f.gates.push({ kind: 'ring', z: f.z + 6, x: f.x, y: f.y, got: false });
  });
  await page.waitForFunction(() => (window.__np.droneFly?.rings ?? 0) >= 1, null, {
    timeout: 3000,
  });
  // Its battery run flat: it turns for home, and is put down at the door, its rings paid for.
  const rings = await page.evaluate(() => {
    const f = window.__np.droneFly;
    if (f) f.battery = 0.2;
    return f?.rings ?? 0;
  });
  await page.waitForFunction(() => window.__np.droneFly?.state === 'home', null, { timeout: 3000 });
  await page.waitForFunction(() => window.__np.droneFly === null, null, { timeout: 5000 });
  await expect(page.locator('#toast')).toContainText('battery ran flat');
  await expect(page.locator('#leave')).toBeHidden();
  await expect(page.locator('#climb')).toHaveText("Caterman's workshop");
  const after = await page.evaluate(() => [
    window.__np.coins,
    window.__np.drone.flights,
    window.__np.drone.bestRings,
  ]);
  expect(after[0]).toBeGreaterThanOrEqual(500 + rings * 10);
  expect(after[1]).toBe(1);
  expect(after[2]).toBeGreaterThanOrEqual(rings);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').drone),
  ).toMatchObject({ owned: true, colour: 5, flights: 1, bestRings: after[2] });
  // Again, and landed early with the button.
  await page.click('#climb');
  await page.click('#droneGo');
  await page.waitForFunction(() => window.__np.droneFly?.state === 'fly', null, { timeout: 3000 });
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.droneFly === null, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.drone.flights)).toBe(2);
  expect(errors).toEqual([]);
});

test("the drone's bug traps: one hung in a flower, a full one's jewel beetles brought home, a filling one left be", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    heronStage: 2,
    heronFled: true,
    isle10Seen: true,
    isle11Seen: true,
    catermanFree: true,
    // A trap hung in the second flower on an earlier day: full of beetles by now.
    drone: {
      owned: true,
      colour: 2,
      flights: 1,
      bestRings: 5,
      traps: [-1, 0, -1, -1, -1],
      beetles: 0,
    },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 9120, y: -3250, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    const w = window.__np.walker;
    const d = window.__np.SHOP_DOOR11;
    w.x = d.x - 14;
    w.y = d.y;
  });
  await expect(page.locator('#climb')).toHaveText("Caterman's workshop", { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#droneSay')).toContainText('full of jewel beetles');
  await expect(page.locator('#droneStats')).toContainText(
    '2 aboard, 1 hung in the jungle (1 full)',
  );
  await page.click('#droneGo');
  await page.waitForFunction(() => window.__np.droneFly?.state === 'fly', null, { timeout: 3000 });
  expect(
    await page.evaluate(() => [window.__np.droneFly?.spots, window.__np.droneFly?.carry]),
  ).toEqual([['empty', 'full', 'empty', 'empty', 'empty'], 2]);
  /** Line the drone up just short of a flower's middle, straight and level. */
  const lineUp = (spot: number) =>
    page.evaluate((spot) => {
      const f = window.__np.droneFly;
      const t = f?.gates.find((o) => o.kind === 'trap' && o.spot === spot);
      if (!f || !t) return;
      f.x = t.x as number;
      f.y = t.y as number;
      f.vx = 0;
      f.vy = 0;
      f.z = t.z - 6;
    }, spot);
  // Through the first flower: a trap hung there, today.
  await lineUp(0);
  await page.waitForFunction(() => window.__np.drone.traps[0] === window.__np.day, null, {
    timeout: 3000,
  });
  await expect(page.locator('#toast')).toContainText('Trap hung');
  // Through the second: its beetles brought home, and the trap back aboard.
  await lineUp(1);
  await page.waitForFunction(() => window.__np.drone.beetles === 3, null, { timeout: 3000 });
  expect(
    await page.evaluate(() => [window.__np.drone.traps[1], window.__np.droneFly?.carry]),
  ).toEqual([-1, 2]);
  await expect(page.locator('#toast')).toContainText('Jewel beetles');
  // The first again, its trap still filling: left be.
  await lineUp(0);
  await expect(page.locator('#toast')).toContainText('still filling', { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.droneFly?.spots[0])).toBe('hung');
  // Down at the door, and all of it kept.
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.droneFly === null, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('3 jewel beetles brought home');
  const day = await page.evaluate(() => window.__np.day);
  expect(
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').drone;
      return [d.traps, d.beetles];
    }),
  ).toEqual([[day, -1, -1, -1, -1], 3]);
  expect(errors).toEqual([]);
});

test('fishing from the drone: out over the black lagoon, a beetle dropped on a rise, the fish reeled in', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    heronStage: 2,
    heronFled: true,
    isle10Seen: true,
    isle11Seen: true,
    catermanFree: true,
    drone: {
      owned: true,
      colour: 3,
      flights: 1,
      bestRings: 5,
      traps: [-1, -1, -1, -1, -1],
      beetles: 2,
    },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 9120, y: -3250, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    const w = window.__np.walker;
    const d = window.__np.SHOP_DOOR11;
    w.x = d.x - 14;
    w.y = d.y;
  });
  await expect(page.locator('#climb')).toHaveText("Caterman's workshop", { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#droneFish')).toHaveText('Fish the lagoon (2 beetles)');
  await page.click('#droneFish');
  await page.waitForFunction(() => window.__np.droneFish?.state === 'fly', null, { timeout: 3000 });
  await expect(page.locator('#droneDrop')).toHaveText('Drop the beetle');
  // Over the first rise, and down goes the beetle: the fish strikes, then it is the moment to reel it in.
  const sp = await page.evaluate(() => {
    const f = window.__np.droneFish;
    const r = f?.rises[0];
    if (!f || !r) return -1;
    f.x = r.x;
    f.z = r.z - 0.5;
    return r.sp;
  });
  expect([39, 40]).toContain(sp);
  await page.locator('#droneDrop').dispatchEvent('click');
  await page.waitForFunction(() => window.__np.droneFish?.state === 'reel', null, {
    timeout: 3000,
  });
  await expect(page.locator('#droneDrop')).toHaveText('Reel it in!');
  await page.locator('#droneDrop').dispatchEvent('click');
  await page.waitForFunction(() => window.__np.drone.beetles === 1, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.droneFish?.caught)).toEqual([sp]);
  await expect(page.locator('#toast')).toContainText('field guide');
  expect(
    await page.evaluate(
      (sp) => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').log[sp],
      sp,
    ),
  ).toBe(1);
  // Dropped on empty water, the beetle comes back up.
  await page.evaluate(() => {
    const f = window.__np.droneFish;
    if (f) f.x = f.x > 0 ? f.x - 5 : f.x + 5;
  });
  await page.locator('#droneDrop').dispatchEvent('click');
  await expect(page.locator('#toast')).toContainText('Nothing there', { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.droneFish?.beetles)).toBe(1);
  // Home, and what it caught said.
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.droneFish === null, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('Back from the black lagoon with');
  await expect(page.locator('#droneDrop')).toBeHidden();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').drone.beetles,
    ),
  ).toBe(1);
  expect(errors).toEqual([]);
});

test("the drone's upgrades at Caterman's: a bigger battery twice, another trap, and they go up with it", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 6500,
    isle3Stage: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    heronStage: 2,
    heronFled: true,
    isle10Seen: true,
    isle11Seen: true,
    catermanFree: true,
    drone: { owned: true, colour: 0, flights: 0, bestRings: 0 },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 9120, y: -3250, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    const w = window.__np.walker;
    const d = window.__np.SHOP_DOOR11;
    w.x = d.x - 14;
    w.y = d.y;
  });
  await expect(page.locator('#climb')).toHaveText("Caterman's workshop", { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#droneUps .item')).toHaveCount(4);
  // The battery, twice: 1,500 then 3,000, and then it is as good as it gets.
  const battery = page.locator('#droneUps [data-up="battery"]');
  await expect(battery.locator('.buy')).toHaveText('1500');
  await battery.click();
  await expect(page.locator('#droneUps [data-up="battery"] .buy')).toHaveText('3000');
  await page.locator('#droneUps [data-up="battery"]').click();
  await expect(page.locator('#droneUps [data-up="battery"] .buy')).toHaveText('Best');
  expect(await page.evaluate(() => [window.__np.coins, window.__np.drone.up.battery])).toEqual([
    2000, 2,
  ]);
  // Another trap: four aboard.
  await page.locator('#droneUps [data-up="traps"]').click();
  await expect(page.locator('#droneStats')).toContainText('Traps: 4 aboard');
  // Then not enough left for the rotors.
  await page.locator('#droneUps [data-up="handling"]').dispatchEvent('click');
  expect(await page.evaluate(() => [window.__np.coins, window.__np.drone.up.handling])).toEqual([
    500, 0,
  ]);
  // Up it goes with them: its battery holds 160, and it carries four traps.
  await page.click('#droneGo');
  await page.waitForFunction(() => window.__np.droneFly?.state === 'fly', null, { timeout: 3000 });
  expect(
    await page.evaluate(() => [window.__np.droneFly?.full, window.__np.droneFly?.carry]),
  ).toEqual([160, 4]);
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.droneFly === null, null, { timeout: 3000 });
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').drone.up),
  ).toEqual({
    battery: 2,
    handling: 0,
    traps: 1,
    line: 0,
  });
  expect(errors).toEqual([]);
});

test("the bridge's orb: up the ladder to the roof, a hand in the orb, and it shows your boats, the past and what's next", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    towerTaken: true,
    isle3Stage: 3,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7140, y: -4790, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.bridgeSeen, null, { timeout: 6000 });
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.BRIDGE_DOOR.x + 30;
    n.boat.y = n.BRIDGE_DOOR.y + 110;
    n.boat.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('In through the door', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_OBS);
  // The ladder in the observatory, up to the roof.
  await page.evaluate(() => {
    const n = window.__np;
    const t = n.BRIDGE_THINGS.find((k) => k.act === `bdoor-${n.BRIDGE_ROOF}`);
    if (t) {
      n.walker.x = t.at.x;
      n.walker.y = t.at.y;
    }
  });
  await expect(page.locator('#climb')).toHaveText('Up the ladder to the roof', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_ROOF);
  await expect(page.locator('#toast')).toContainText('the orb', { timeout: 3000 });
  // A hand in the orb: the boats, the past and what's next.
  await page.evaluate(() => {
    const n = window.__np;
    const t = n.BRIDGE_THINGS.find((k) => k.act === 'borb');
    if (t) {
      n.walker.x = t.at.x;
      n.walker.y = t.at.y;
    }
  });
  await expect(page.locator('#climb')).toHaveText('Put your hand in the orb', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#orbCard')).toBeVisible();
  await expect(page.locator('#orbBoats')).toContainText('flagship');
  await expect(page.locator('#orbPast')).toContainText("The sorcerer's staff");
  await expect(page.locator('#orbPast')).toContainText("A demon's horns");
  await expect(page.locator('#orbNext')).toContainText('Shark King');
  await page.click('#orbClose');
  await expect(page.locator('#orbCard')).toBeHidden();
  expect(await page.evaluate(() => window.__np.orbOpen)).toBe(false);
  // And back down the ladder.
  await page.evaluate(() => {
    const n = window.__np;
    const t = n.BRIDGE_THINGS.find(
      (k) => k.room === n.BRIDGE_ROOF && k.act === `bdoor-${n.BRIDGE_OBS}`,
    );
    if (t) {
      n.walker.x = t.at.x;
      n.walker.y = t.at.y;
    }
  });
  await expect(page.locator('#climb')).toHaveText('Back to the observatory', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_OBS);
  expect(errors).toEqual([]);
});

test('the metal bridge: seen across the far far sea, the tar ocean past it, and in through its door', async ({
  context,
  page,
}) => {
  // Island 11 found, sailing north of it toward the sea's north edge.
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7140, y: -4790, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#toast')).toContainText('A huge metal building', { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.bridgeSeen)).toBe(true);
  // A boat driven at its sea face is kept off it.
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.METAL_BRIDGE.x - 500;
    n.boat.y = n.METAL_BRIDGE.face - 40;
    n.boat.v = 0;
  });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__np.boat.y > window.__np.METAL_BRIDGE.face)).toBe(true);
  // Stopped at the door, in: the observatory, the way round it told the first time.
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.BRIDGE_DOOR.x + 30;
    n.boat.y = n.BRIDGE_DOOR.y + 110;
    n.boat.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('In through the door', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_OBS);
  await expect(page.locator('#toast')).toContainText('this round room is the observatory');
  expect(await page.evaluate(() => window.__np.bridgeIn)).toBe(true);
  // Through the science room's door, and talk to the scientist.
  const sci = await page.evaluate(() => {
    const n = window.__np;
    const d = n.BRIDGE_HUB[1] as { to: number; x: number; y: number };
    n.walker.x = d.x;
    n.walker.y = d.y;
    return d.to;
  });
  await expect(page.locator('#climb')).toHaveText('Into the science room', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction((to) => window.__np.floor === to, sci);
  await expect(page.locator('#climb')).toBeHidden();
  await page.evaluate((to) => {
    const n = window.__np;
    const t = n.BRIDGE_THINGS.find((k) => k.room === to && k.act === 'bsci');
    if (t) {
      n.walker.x = t.at.x;
      n.walker.y = t.at.y;
    }
  }, sci);
  await expect(page.locator('#climb')).toHaveText('Talk to the scientist', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('The scientist: "Oh! A visitor!');
  // Back to the observatory by its door, and out from anywhere, aboard where the boat was left.
  await page.evaluate((to) => {
    const n = window.__np;
    const p = n.bridgeBack(to);
    n.walker.x = p.x;
    n.walker.y = p.y;
  }, sci);
  await expect(page.locator('#climb')).toHaveText('Back to the observatory', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_OBS);
  await expect(page.locator('#leave')).toHaveText('Back to your boat');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.floor === -1);
  expect(await page.evaluate(() => window.__np.walker.state)).toBe('aboard');
  const at = await page.evaluate(() =>
    Math.hypot(
      window.__np.boat.x - window.__np.BRIDGE_DOOR.x,
      window.__np.boat.y - window.__np.BRIDGE_DOOR.y,
    ),
  );
  expect(at).toBeLessThan(200);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect([saved.bridgeSeen, saved.bridgeIn]).toEqual([true, true]);
  expect(errors).toEqual([]);
});

test('the tar ocean: out from the tar dock in the chemistry boat, sailed, and back in, the flagship waiting at the door', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    bridgeSeen: true,
    bridgeIn: true,
    stealth1: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7430, y: -5200, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.BRIDGE_DOOR.x + 30;
    n.boat.y = n.BRIDGE_DOOR.y + 110;
    n.boat.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('In through the door', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_OBS);
  const parked = await page.evaluate(() => [window.__np.boat.x, window.__np.boat.y]);
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.BRIDGE_HUB.find((h) => h.to === n.BRIDGE_TARDOCK);
    if (d) {
      n.walker.x = d.x;
      n.walker.y = d.y;
    }
  });
  await expect(page.locator('#climb')).toHaveText('Out to the tar dock', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_TARDOCK);
  await page.evaluate(() => {
    const n = window.__np;
    const t = n.BRIDGE_THINGS.find((t) => t.act === 'bboat');
    if (t) {
      n.walker.x = t.at.x;
      n.walker.y = t.at.y;
    }
  });
  await expect(page.locator('#climb')).toHaveText('Sail the chemistry boat', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('Out onto the tar ocean');
  await expect(page.locator('#leave')).toHaveText('Back to the bridge');
  // Away north over the tar, the keys driving.
  const y0 = await page.evaluate(() => window.__np.tarSail?.y ?? 0);
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction((y) => (window.__np.tarSail?.y ?? 0) < y - 200, y0, { timeout: 6000 });
  await page.keyboard.up('ArrowUp');
  await expect(page.locator('#climb')).toBeHidden();
  // Back to the berth, stopped: in at the tar dock.
  await page.evaluate(() => {
    const n = window.__np;
    if (!n.tarSail) return;
    n.tarSail.x = n.TAR_BERTH.x + 20;
    n.tarSail.y = n.TAR_BERTH.y - 30;
    n.tarSail.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('Into the tar dock', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('Back in at the tar dock');
  expect(
    await page.evaluate(() => [
      window.__np.tarSail,
      window.__np.floor === window.__np.BRIDGE_TARDOCK,
    ]),
  ).toEqual([null, true]);
  // Out again, and straight back with the leave button.
  await page.evaluate(() => {
    const n = window.__np;
    const t = n.BRIDGE_THINGS.find((t) => t.act === 'bboat');
    if (t) {
      n.walker.x = t.at.x;
      n.walker.y = t.at.y;
    }
  });
  await expect(page.locator('#climb')).toHaveText('Sail the chemistry boat', { timeout: 3000 });
  await page.click('#climb');
  await page.click('#leave');
  expect(await page.evaluate(() => window.__np.tarSail)).toBeNull();
  // The flagship never moved from the door.
  expect(await page.evaluate(() => [window.__np.boat.x, window.__np.boat.y])).toEqual(parked);
  expect(errors).toEqual([]);
});

test('tar fish: cast for from the chemistry boat by a school, kept in the tar bucket, and bought by the scientist', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    bridgeSeen: true,
    bridgeIn: true,
    stealth1: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7430, y: -5200, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  // In at the bridge's door, through to the tar dock, and out in the chemistry boat.
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.BRIDGE_DOOR.x + 30;
    n.boat.y = n.BRIDGE_DOOR.y + 110;
    n.boat.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('In through the door', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_OBS);
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.BRIDGE_HUB.find((h) => h.to === n.BRIDGE_TARDOCK);
    if (d) {
      n.walker.x = d.x;
      n.walker.y = d.y;
    }
  });
  await expect(page.locator('#climb')).toHaveText('Out to the tar dock', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_TARDOCK);
  await page.evaluate(() => {
    const n = window.__np;
    const t = n.BRIDGE_THINGS.find((t) => t.act === 'bboat');
    if (t) {
      n.walker.x = t.at.x;
      n.walker.y = t.at.y;
    }
  });
  await expect(page.locator('#climb')).toHaveText('Sail the chemistry boat', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('tar fish');
  // Nowhere near a school at the berth: no rod.
  const cast = page.locator('#tarcast');
  await expect(cast).toBeHidden();
  // Stopped by the day's first school: cast, wait for the float to go under, reel in.
  await page.evaluate(() => {
    const n = window.__np;
    const s = n.tarFish.schools[0];
    if (!n.tarSail || !s) return;
    n.tarSail.x = s.x + 130;
    n.tarSail.y = s.y;
    n.tarSail.v = 0;
  });
  await expect(cast).toHaveText('Cast for tar fish', { timeout: 3000 });
  await cast.click();
  await expect(cast).toHaveText(/Wait/);
  await page.waitForFunction(() => window.__np.tarRod.state === 'bite', null, { timeout: 4000 });
  await cast.click({ force: true });
  await page.waitForFunction(() => window.__np.tarFish.bucket === 1, null, { timeout: 1000 });
  await expect(page.locator('#toast')).toContainText('Nobody buys them but the scientist');
  await expect(page.locator('#tarBucket')).toHaveText('1');
  expect(await page.evaluate(() => [window.__np.tarFish.taken !== 0, window.__np.coins])).toEqual([
    true,
    0,
  ]);
  // Back to the bridge, through to the science room, and the scientist buys it.
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.tarSail === null);
  await expect(cast).toBeHidden();
  await page.evaluate(() => {
    const n = window.__np;
    const p = n.bridgeBack(n.BRIDGE_TARDOCK);
    n.walker.x = p.x;
    n.walker.y = p.y;
  });
  await expect(page.locator('#climb')).toHaveText('Back to the observatory', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_OBS);
  const sci = await page.evaluate(() => {
    const n = window.__np;
    const d = n.BRIDGE_HUB[1] as { to: number; x: number; y: number };
    n.walker.x = d.x;
    n.walker.y = d.y;
    return d.to;
  });
  await expect(page.locator('#climb')).toHaveText('Into the science room', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction((to) => window.__np.floor === to, sci);
  await page.evaluate((to) => {
    const n = window.__np;
    const t = n.BRIDGE_THINGS.find((k) => k.room === to && k.act === 'bsci');
    if (t) {
      n.walker.x = t.at.x;
      n.walker.y = t.at.y;
    }
  }, sci);
  await expect(page.locator('#climb')).toHaveText('Talk to the scientist', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('You sell a tar fish for 250 coins');
  expect(await page.evaluate(() => [window.__np.coins, window.__np.tarFish.bucket])).toEqual([
    250, 0,
  ]);
  await expect(page.locator('#tarBucket')).toBeHidden();
  expect(errors).toEqual([]);
});

/** In at the bridge's door, through to the tar dock, and out on the tar ocean in the chemistry boat. */
async function outOnTheTar(page: Page): Promise<void> {
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.BRIDGE_DOOR.x + 30;
    n.boat.y = n.BRIDGE_DOOR.y + 110;
    n.boat.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('In through the door', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_OBS);
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.BRIDGE_HUB.find((h) => h.to === n.BRIDGE_TARDOCK);
    if (d) {
      n.walker.x = d.x;
      n.walker.y = d.y;
    }
  });
  await expect(page.locator('#climb')).toHaveText('Out to the tar dock', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_TARDOCK);
  await page.evaluate(() => {
    const n = window.__np;
    const t = n.BRIDGE_THINGS.find((t) => t.act === 'bboat');
    if (t) {
      n.walker.x = t.at.x;
      n.walker.y = t.at.y;
    }
  });
  await expect(page.locator('#climb')).toHaveText('Sail the chemistry boat', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.tarSail !== null);
}

test('the tar kraken, round two: beaten at sea, it comes back for the tar island; its arms slam the beach, six chopped and its eye rises off the shore, nine in it beat it for good', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    bridgeSeen: true,
    bridgeIn: true,
    stealth1: true,
    eelStage: 2,
    krakenBeaten: true,
    tarLeaderBeaten: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7430, y: -5200, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await outOnTheTar(page);
  const land = async () => {
    await page.evaluate(() => {
      const n = window.__np;
      if (!n.tarSail) return;
      n.tarSail.x = n.ISLE_BERTH.x + 20;
      n.tarSail.y = n.ISLE_BERTH.y + 50;
      n.tarSail.v = 0;
    });
    await expect(page.locator('#climb')).toHaveText('Step ashore', { timeout: 3000 });
    await page.click('#climb');
    await page.waitForFunction(() => window.__np.tarAshore);
  };
  await land();
  await expect(page.locator('#toast')).toContainText('the tar kraken is back', { timeout: 4000 });
  // Out on the east beach, its arms come up off the shore.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.TAR_ISLE.x + 400;
    n.walker.y = n.TAR_ISLE.y;
    n.setHearts(99);
  });
  await page.waitForFunction(
    () => window.__np.krakenAshore.arms.some((a) => a.state === 'up' || a.state === 'windup'),
    null,
    { timeout: 6000 },
  );
  // A spear chops one.
  await expect(page.locator('#throw')).toBeVisible({ timeout: 3000 });
  await page.locator('#throw').dispatchEvent('pointerdown');
  await page.waitForFunction(() => window.__np.krakenAshore.chopped >= 1, null, { timeout: 4000 });
  // Five more, and the kraken itself comes up off the shore.
  await page.waitForFunction(
    () => {
      const k = window.__np.krakenAshore;
      window.__np.setHearts(99);
      for (const a of k.arms)
        if (
          k.state === 'arms' &&
          (a.state === 'up' || a.state === 'windup' || a.state === 'recover')
        )
          k.chop(a);
      return k.state === 'rise' || k.state === 'eye';
    },
    null,
    { timeout: 30000, polling: 200 },
  );
  await expect(page.locator('#toast')).toContainText('The kraken itself!', { timeout: 3000 });
  await page.waitForFunction(() => window.__np.krakenAshore.eyeOpen, null, { timeout: 10000 });
  const hp0 = await page.evaluate(() => window.__np.krakenAshore.hp);
  await page.evaluate(() => window.__np.setHearts(99));
  await page.locator('#throw').dispatchEvent('pointerdown');
  await page.waitForFunction((h) => window.__np.krakenAshore.hp < h, hp0, { timeout: 4000 });
  // The rest: beaten for good, 900 coins and its eye for the trophy hall.
  const coins = await page.evaluate(() => window.__np.coins);
  const trophies = await page.evaluate(() => window.__np.trophiesWon);
  await page.evaluate(() => {
    const k = window.__np.krakenAshore;
    while (k.state === 'eye') {
      k.eye.state = 'open';
      k.harpoonEye(1);
    }
  });
  await expect(page.locator('#toast')).toContainText('You beat the tar kraken on foot!', {
    timeout: 3000,
  });
  expect(
    await page.evaluate(() => [window.__np.krakenFoot, window.__np.coins, window.__np.trophiesWon]),
  ).toEqual([true, coins + 900, trophies + 1]);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').krakenFoot),
  ).toBe(true);
  // Back aboard and ashore again: the tar is still.
  await page.click('#leave');
  await page.waitForFunction(() => !window.__np.tarAshore);
  await land();
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__np.krakenAshore.state)).toBe('gone');
  expect(errors).toEqual([]);
});

test('the tar kraken: under the middle of the tar once the eel is beaten, its arms come up round the boat, ten chopped and its giant eye rises, nine harpoons in it beat it', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    bridgeSeen: true,
    bridgeIn: true,
    stealth1: true,
    eelStage: 2,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7430, y: -5200, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await outOnTheTar(page);
  // Out over the middle of the tar ocean: the tar boils, and its arms come up.
  await page.evaluate(() => {
    const n = window.__np;
    if (!n.tarSail) return;
    n.tarSail.x = n.KRAKEN_LAIR.x;
    n.tarSail.y = n.KRAKEN_LAIR.y;
    n.tarSail.v = 0;
  });
  await expect(page.locator('#toast')).toContainText('the tar kraken!', { timeout: 4000 });
  await page.waitForFunction(
    () => window.__np.kraken.arms.some((a) => a.state === 'up' || a.state === 'windup'),
    null,
    { timeout: 6000 },
  );
  // The harpoon chops one.
  await expect(page.locator('#throw')).toBeVisible({ timeout: 3000 });
  await page.locator('#throw').dispatchEvent('pointerdown');
  await page.waitForFunction(() => window.__np.kraken.chopped >= 1, null, { timeout: 4000 });
  await expect(page.locator('#hull')).toBeVisible();
  // Nine more, and the kraken itself comes up: its eye, and its arms all round.
  await page.waitForFunction(
    () => {
      const k = window.__np.kraken;
      window.__np.setChemHp?.(100);
      for (const a of k.arms)
        if (
          k.state === 'arms' &&
          (a.state === 'up' || a.state === 'windup' || a.state === 'recover')
        )
          k.chop(a);
      return k.state === 'rise' || k.state === 'eye';
    },
    null,
    { timeout: 30000, polling: 200 },
  );
  await expect(page.locator('#toast')).toContainText('The kraken itself', { timeout: 3000 });
  await page.waitForFunction(() => window.__np.kraken.eyeOpen, null, { timeout: 10000 });
  const hp0 = await page.evaluate(() => window.__np.kraken.hp);
  await page.locator('#throw').dispatchEvent('pointerdown');
  await page.waitForFunction((h) => window.__np.kraken.hp < h, hp0, { timeout: 4000 });
  // The rest, each while the eye is open: beaten.
  const coins = await page.evaluate(() => window.__np.coins);
  const trophies = await page.evaluate(() => window.__np.trophiesWon);
  await page.evaluate(() => {
    const k = window.__np.kraken;
    while (k.state === 'eye') {
      k.eye.state = 'open';
      k.harpoonEye(1);
    }
  });
  await expect(page.locator('#toast')).toContainText('You beat the tar kraken!', { timeout: 3000 });
  expect(
    await page.evaluate(() => [
      window.__np.krakenBeaten,
      window.__np.coins - 0,
      window.__np.trophiesWon,
    ]),
  ).toEqual([true, coins + 900, trophies + 1]);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').krakenBeaten,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('finding the tar island: the sail-out message and the tar map show the way', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    bridgeSeen: true,
    bridgeIn: true,
    stealth1: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7430, y: -5200, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await outOnTheTar(page);
  await expect(page.locator('#toast')).toContainText('follow the arrow with the tower on it');
  // The map button, out on the tar, shows the tar ocean, not the sea.
  await page.click('#mapBtn');
  await expect(page.locator('#seamap')).toBeVisible();
  await expect(page.locator('#mapTitle')).toHaveText('Tar map');
  await expect(page.locator('#mapNote')).toContainText('The tar island');
  await page.click('#mapClose');
  await expect(page.locator('#seamap')).toBeHidden();
  // Back in at the bridge, the sea map again.
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.tarSail === null);
  await page.evaluate(() => window.__np.openMap());
  await expect(page.locator('#mapTitle')).toHaveText('Sea map');
  expect(errors).toEqual([]);
});

test('the tar island: tied up at its jetty, ashore, up the hill to the tower door, and back aboard', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    bridgeSeen: true,
    bridgeIn: true,
    stealth1: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7430, y: -5200, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await outOnTheTar(page);
  // Stopped alongside the island's jetty: ashore.
  await page.evaluate(() => {
    const n = window.__np;
    if (!n.tarSail) return;
    n.tarSail.x = n.ISLE_BERTH.x + 20;
    n.tarSail.y = n.ISLE_BERTH.y + 50;
    n.tarSail.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('Step ashore', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('Ashore on the tar island');
  expect(
    await page.evaluate(() => [
      window.__np.tarAshore,
      window.__np.walker.state,
      window.__np.tarIsleSeen,
    ]),
  ).toEqual([true, 'ashore', true]);
  await expect(page.locator('#leave')).toHaveText('Back to the chemistry boat');
  await expect(page.locator('#bargeBtn')).toBeHidden();
  // Up the jetty on foot, and no further than its planks and the rock.
  const y0 = await page.evaluate(() => window.__np.walker.y);
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction((y) => window.__np.walker.y < y - 40, y0, { timeout: 4000 });
  await page.keyboard.up('ArrowUp');
  // At the tower's door on the hilltop: barred.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.TOWER_DOOR.x + 4;
    n.walker.y = n.TOWER_DOOR.y + 4;
  });
  await expect(page.locator('#climb')).toHaveText('Try the tower door', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('barred from inside');
  // Back down to the jetty's end, and aboard again: sailing, the walk's buttons put away.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.JETTY_END.x;
    n.walker.y = n.JETTY_END.y;
  });
  await expect(page.locator('#climb')).toHaveText('Back aboard', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => !window.__np.tarAshore);
  expect(
    await page.evaluate(() => [
      !!window.__np.tarSail,
      window.__np.floor === window.__np.BRIDGE_TARDOCK,
    ]),
  ).toEqual([true, true]);
  await expect(page.locator('#leave')).toHaveText('Back to the bridge');
  await expect(page.locator('#throw')).toBeHidden();
  await expect(page.locator('#bargeBtn')).toBeHidden();
  // Ashore again, and straight back aboard with the leave button.
  await expect(page.locator('#climb')).toHaveText('Step ashore', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.tarAshore);
  await page.click('#leave');
  await page.waitForFunction(() => !window.__np.tarAshore);
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.tarSail === null);
  expect(errors).toEqual([]);
});

test('tar creatures: they rise on the tar island, take spears, melt for coins, a beast runs, and a slam bonks you back aboard', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    bridgeSeen: true,
    bridgeIn: true,
    stealth1: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7430, y: -5200, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await outOnTheTar(page);
  await page.evaluate(() => {
    const n = window.__np;
    if (!n.tarSail) return;
    n.tarSail.x = n.ISLE_BERTH.x + 20;
    n.tarSail.y = n.ISLE_BERTH.y + 50;
    n.tarSail.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('Step ashore', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.tarAshore);
  // Up to the first tar human: it rises, and its friends with it.
  await page.evaluate(() => {
    const n = window.__np;
    const g = n.tarFolk.list[0];
    if (!g) return;
    n.walker.x = g.x + 110;
    n.walker.y = g.y + 10;
  });
  await page.waitForFunction(() => window.__np.tarFolk.list[0]?.state !== 'idle', null, {
    timeout: 3000,
  });
  await expect(page.locator('#toast')).toContainText('Tar creatures!');
  // A spear from the throw button hurts it.
  await expect(page.locator('#throw')).toBeVisible({ timeout: 3000 });
  await page.locator('#throw').dispatchEvent('pointerdown');
  await page.waitForFunction(() => (window.__np.tarFolk.list[0]?.hp ?? 15) < 15, null, {
    timeout: 3000,
  });
  // Beaten, it melts and leaves 60 coins.
  const c0 = await page.evaluate(() => window.__np.coins);
  await page.evaluate(() => {
    const n = window.__np;
    const g = n.tarFolk.list[0];
    if (g) n.tarFolk.hit(g, 99);
  });
  expect(await page.evaluate(() => window.__np.tarFolk.list[0]?.state)).toBe('melt');
  expect(await page.evaluate(() => window.__np.coins)).toBe(c0 + 60);
  // A tar beast losing runs, and says so.
  await page.evaluate(() => {
    const n = window.__np;
    const b = n.tarFolk.list[4];
    if (!b) return;
    n.walker.x = b.x + 120;
    n.walker.y = b.y;
  });
  await page.waitForFunction(() => window.__np.tarFolk.list[4]?.state === 'chase', null, {
    timeout: 4000,
  });
  await page.evaluate(() => {
    const n = window.__np;
    const b = n.tarFolk.list[4];
    if (b) n.tarFolk.hit(b, 12);
  });
  expect(await page.evaluate(() => window.__np.tarFolk.list[4]?.state)).toBe('flee');
  await expect(page.locator('#toast')).toContainText('it runs');
  // One heart left, stood in front of a tar human: slammed, and back aboard the chemistry boat, nothing lost.
  await page.evaluate(() => {
    const n = window.__np;
    const g = n.tarFolk.list[1];
    if (!g) return;
    n.walker.x = g.x + 26;
    n.walker.y = g.y;
    n.setHearts(1);
  });
  await page.waitForFunction(() => !window.__np.tarAshore, null, { timeout: 10000 });
  await expect(page.locator('#toast')).toContainText('aboard the chemistry boat');
  expect(await page.evaluate(() => [!!window.__np.tarSail, window.__np.hearts > 1])).toEqual([
    true,
    true,
  ]);
  await expect(page.locator('#climb')).toHaveText('Step ashore', { timeout: 3000 });
  await expect(page.locator('#leave')).toHaveText('Back to the bridge');
  expect(errors).toEqual([]);
});

test('the tar leader: comes down off the high ground, calls for help at half, is beaten for a trophy, and stays beaten', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    bridgeSeen: true,
    bridgeIn: true,
    stealth1: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7430, y: -5200, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await outOnTheTar(page);
  const land = async () => {
    await page.evaluate(() => {
      const n = window.__np;
      if (!n.tarSail) return;
      n.tarSail.x = n.ISLE_BERTH.x + 20;
      n.tarSail.y = n.ISLE_BERTH.y + 50;
      n.tarSail.v = 0;
    });
    await expect(page.locator('#climb')).toHaveText('Step ashore', { timeout: 3000 });
    await page.click('#climb');
    await page.waitForFunction(() => window.__np.tarAshore);
  };
  await land();
  // Up the hill toward him: he roars and comes down.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.tarLeader.x + 60;
    n.walker.y = n.tarLeader.y + 140;
  });
  await page.waitForFunction(() => window.__np.tarLeader.up, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('The tar leader!');
  const trophies = await page.evaluate(() => window.__np.trophiesWon);
  // Hurt to half: he roars for help, and two tar humans rise.
  await page.evaluate(() => {
    const n = window.__np;
    n.setHearts(9);
    n.tarLeader.hit(13);
  });
  await expect(page.locator('#toast')).toContainText('roars for help');
  expect(await page.evaluate(() => window.__np.tarFolk.list.length)).toBe(8);
  // Beaten: 3,000 coins, his sword for the trophy hall, and he stays beaten.
  const c0 = await page.evaluate(() => window.__np.coins);
  await page.evaluate(() => window.__np.tarLeader.hit(99));
  await expect(page.locator('#toast')).toContainText('The tar leader is beaten!');
  expect(
    await page.evaluate(() => [
      window.__np.tarLeaderBeaten,
      window.__np.coins,
      window.__np.trophiesWon,
    ]),
  ).toEqual([true, c0 + 3000, trophies + 1]);
  await page.click('#leave');
  await page.waitForFunction(() => !window.__np.tarAshore);
  await land();
  expect(
    await page.evaluate(() => [window.__np.tarLeader.state, window.__np.tarFolk.list.length]),
  ).toEqual(['gone', 6]);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.TOWER_DOOR.x + 4;
    n.walker.y = n.TOWER_DOOR.y + 4;
  });
  await expect(page.locator('#climb')).toHaveText('Try the tower door', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('All is quiet up on the high ground');
  expect(errors).toEqual([]);
});

test('the tar eel: mission 2 at the hologram, it finds the chemistry boat, the harpoon hits it, it pulls you under, and six sink it', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    bridgeSeen: true,
    bridgeIn: true,
    stealth1: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7430, y: -5200, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  // In through the bridge's door to the missions room's table: mission 2.
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.BRIDGE_DOOR.x + 30;
    n.boat.y = n.BRIDGE_DOOR.y + 110;
    n.boat.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('In through the door', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_OBS);
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.BRIDGE_HUB.find((h) => h.to === n.BRIDGE_MISSIONS);
    if (d) {
      n.walker.x = d.x;
      n.walker.y = d.y;
    }
  });
  await expect(page.locator('#climb')).toHaveText('Into the missions room', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_MISSIONS);
  await page.evaluate(() => {
    const n = window.__np;
    const t = n.BRIDGE_THINGS.find((k) => k.act === 'bmission');
    if (t) {
      n.walker.x = t.at.x;
      n.walker.y = t.at.y;
    }
  });
  await expect(page.locator('#climb')).toHaveText('Mission 2: the tar eel', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('Mission 2: the tar eel!');
  expect(await page.evaluate(() => window.__np.eelStage)).toBe(1);
  await expect(page.locator('#leave')).toHaveText('Back to your boat');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.walker.state === 'aboard');
  // Out on the tar, away from the dock: before long it finds you, and the boat's health shows.
  await outOnTheTar(page);
  await expect(page.locator('#hull')).toBeVisible();
  await page.evaluate(() => {
    const n = window.__np;
    if (!n.tarSail) return;
    n.tarSail.y -= 1400;
    n.tarSail.v = 0;
  });
  await page.waitForFunction(() => window.__np.tarEel.up, null, { timeout: 15000 });
  await expect(page.locator('#toast')).toContainText('The tar eel!');
  await expect(page.locator('#throw')).toBeVisible();
  await page.click('#throw');
  await page.waitForFunction(() => window.__np.tarEel.hp < 6, null, { timeout: 4000 });
  // Pulled under: up again at the nearest dock, the boat whole.
  await page.evaluate(() => window.__np.tarEel.onPull?.());
  await expect(page.locator('#toast')).toContainText('pulled it under the tar');
  expect(await page.evaluate(() => window.__np.chemHp)).toBe(100);
  // Down to its last, then the last harpoon: it sinks for good, mission 2 done.
  await page.evaluate(() => {
    const n = window.__np;
    if (!n.tarSail) return;
    n.tarSail.y -= 1400;
    n.tarEel.hp = 1;
    n.tarEel.awayFor = 0;
    n.tarEel.found = 6;
  });
  await page.waitForFunction(() => window.__np.tarEel.up, null, { timeout: 30000 });
  const c0 = await page.evaluate(() => window.__np.coins);
  await page.click('#throw');
  await expect(page.locator('#toast')).toContainText('You beat the tar eel!', { timeout: 4000 });
  expect(await page.evaluate(() => [window.__np.eelStage, window.__np.coins])).toEqual([
    2,
    c0 + 4000,
  ]);
  expect(errors).toEqual([]);
});

test("red tar tentacles: up in the chemistry boat's way, a slap takes four off, and two harpoons sink one", async ({
  context,
  page,
}) => {
  // The tar eel beaten, so the boat has its harpoon and the eel is gone.
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    bridgeSeen: true,
    bridgeIn: true,
    stealth1: true,
    eelStage: 2,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7430, y: -5200, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await outOnTheTar(page);
  // Out on the open tar and under way: before long one comes up ahead.
  await page.evaluate(() => {
    const n = window.__np;
    if (!n.tarSail) return;
    n.tarSail.y -= 1400;
    n.tarSail.h = -Math.PI / 2;
    // Kept going, as a sailor holding the stick forward would.
    const keep = setInterval(() => {
      if (!n.tarSail || n.tarTents.list.length > 0) {
        clearInterval(keep);
        return;
      }
      n.tarSail.v = 200;
    }, 50);
  });
  await page.waitForFunction(() => window.__np.tarTents.list.length > 0, null, { timeout: 12000 });
  await page.waitForFunction(() => window.__np.tarTents.list.some((t) => t.state === 'up'), null, {
    timeout: 4000,
  });
  await expect(page.locator('#toast')).toContainText('red tar tentacle');
  // Stopped right beside it: it slaps, four off the boat's health.
  await page.evaluate(() => {
    const n = window.__np;
    const t = n.tarTents.list.find((o) => o.state === 'up');
    if (!n.tarSail || !t) return;
    n.tarSail.x = t.x + 60;
    n.tarSail.y = t.y;
    n.tarSail.v = 0;
  });
  await page.waitForFunction(() => window.__np.chemHp <= 96, null, { timeout: 4000 });
  await expect(page.locator('#hull')).toBeVisible();
  // Two harpoons, and it sinks for good: 50 coins.
  await expect(page.locator('#throw')).toBeVisible();
  await page.click('#throw');
  await page.waitForFunction(() => window.__np.tarTents.list.some((t) => t.hp === 1), null, {
    timeout: 4000,
  });
  await page.waitForTimeout(1300);
  await page.click('#throw');
  await expect.poll(() => page.evaluate(() => window.__np.coins), { timeout: 4000 }).toBe(50);
  expect(errors).toEqual([]);
});

test('the evil monkey: caged in the science room once the tar eel is beaten, and the scientist says do not let it out', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    bridgeSeen: true,
    bridgeIn: true,
    stealth1: true,
    eelStage: 2,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7430, y: -5200, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  // In through the bridge's door, and through to the science room.
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.BRIDGE_DOOR.x + 30;
    n.boat.y = n.BRIDGE_DOOR.y + 110;
    n.boat.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('In through the door', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_OBS);
  const sci = await page.evaluate(() => {
    const n = window.__np;
    const d = n.BRIDGE_HUB[1] as { to: number; x: number; y: number };
    n.walker.x = d.x;
    n.walker.y = d.y;
    return d.to;
  });
  await expect(page.locator('#climb')).toHaveText('Into the science room', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction((to) => window.__np.floor === to, sci);
  // Its cage, in the far corner: look, and it rattles the bars; the scientist will not have it let out.
  const goCage = () =>
    page.evaluate((to) => {
      const n = window.__np;
      const t = n.BRIDGE_THINGS.find((k) => k.room === to && k.act === 'bcage');
      if (t) {
        n.walker.x = t.at.x;
        n.walker.y = t.at.y;
      }
    }, sci);
  await goCage();
  await expect(page.locator('#climb')).toHaveText('Look at the monkey', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('DO NOT LET IT OUT');
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('let it out');
  // Before the tar eel is beaten, there is no cage.
  await page.evaluate(() => {
    window.__np.eelStage = 1;
  });
  await goCage();
  await expect(page.locator('#climb')).toBeHidden({ timeout: 3000 });
  expect(errors).toEqual([]);
});

test('the tar dragon: circles over the tar island, out of reach up high, speared when it lands, and back next landing', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    bridgeSeen: true,
    bridgeIn: true,
    stealth1: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7430, y: -5200, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await outOnTheTar(page);
  // Seen from the boat, round and round over the island.
  const at0 = await page.evaluate(() => ({
    x: window.__np.tarDragon.x,
    y: window.__np.tarDragon.y,
  }));
  await page.waitForTimeout(600);
  const moved = await page.evaluate(
    (a) => Math.hypot(window.__np.tarDragon.x - a.x, window.__np.tarDragon.y - a.y),
    at0,
  );
  expect(moved).toBeGreaterThan(5);
  expect(await page.evaluate(() => window.__np.tarDragon.state)).toBe('circle');
  const land = async () => {
    await page.evaluate(() => {
      const n = window.__np;
      if (!n.tarSail) return;
      n.tarSail.x = n.ISLE_BERTH.x + 20;
      n.tarSail.y = n.ISLE_BERTH.y + 50;
      n.tarSail.v = 0;
    });
    await expect(page.locator('#climb')).toHaveText('Step ashore', { timeout: 3000 });
    await page.click('#climb');
    await page.waitForFunction(() => window.__np.tarAshore);
  };
  await land();
  // Under it on the south-east slope: it shrieks and comes, and up there no spear reaches it.
  await page.evaluate(() => {
    const n = window.__np;
    n.setHearts(20);
    n.walker.x = n.TAR_ISLE.x + 210;
    n.walker.y = n.TAR_ISLE.y + 190;
  });
  await page.waitForFunction(() => window.__np.tarDragon.up, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('The tar dragon!');
  await expect(page.locator('#throw')).toBeHidden();
  // It swoops and lands: now the spear reaches it.
  await page.waitForFunction(() => window.__np.tarDragon.state === 'landed', null, {
    timeout: 12000,
  });
  await expect(page.locator('#throw')).toBeVisible();
  await page.click('#throw');
  await page.waitForFunction(() => window.__np.tarDragon.hp < 18, null, { timeout: 3000 });
  // Beaten while it is down: coins, and it melts away.
  const c0 = await page.evaluate(() => window.__np.coins);
  await page.waitForFunction(() => window.__np.tarDragon.low, null, { timeout: 12000 });
  expect(await page.evaluate(() => window.__np.tarDragon.hit(99))).toBe(true);
  await expect(page.locator('#toast')).toContainText('You beat the tar dragon!');
  expect(await page.evaluate(() => window.__np.coins)).toBe(c0 + 500);
  // Gone while you sail; back circling the next landing.
  await page.click('#leave');
  await page.waitForFunction(() => !window.__np.tarAshore);
  expect(await page.evaluate(() => window.__np.tarDragon.state)).toBe('gone');
  await land();
  expect(
    await page.evaluate(() => [window.__np.tarDragon.state, window.__np.tarDragon.hp]),
  ).toEqual(['circle', 18]);
  expect(errors).toEqual([]);
});

test('stealth mission 1: from the missions room, spotted, a backstab, invisible, the sorcerer kicked off, the chemistry boat won', async ({
  context,
  page,
}) => {
  // Stopped at the bridge's door, in, and through to the missions room's table.
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle3Stage: 1,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    isle10Seen: true,
    isle11Seen: true,
    bridgeSeen: true,
    bridgeIn: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 7430, y: -5200, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.BRIDGE_DOOR.x + 30;
    n.boat.y = n.BRIDGE_DOOR.y + 110;
    n.boat.v = 0;
  });
  await expect(page.locator('#climb')).toHaveText('In through the door', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_OBS);
  await page.evaluate(() => {
    const n = window.__np;
    const d = n.BRIDGE_HUB.find((h) => h.to === n.BRIDGE_MISSIONS);
    if (d) {
      n.walker.x = d.x;
      n.walker.y = d.y;
    }
  });
  await expect(page.locator('#climb')).toHaveText('Into the missions room', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === window.__np.BRIDGE_MISSIONS);
  await page.evaluate(() => {
    const n = window.__np;
    const t = n.BRIDGE_THINGS.find((k) => k.act === 'bmission');
    if (t) {
      n.walker.x = t.at.x;
      n.walker.y = t.at.y;
    }
  });
  await expect(page.locator('#climb')).toHaveText('Start mission 1', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('Mission 1!');
  expect(await page.evaluate(() => [!!window.__np.tunnels, window.__np.invis])).toEqual([
    true,
    true,
  ]);
  await expect(page.locator('#leave')).toHaveText('Leave the tunnels');
  await expect(page.locator('#bargeBtn')).toBeHidden();
  // Stood in a guard's light: seen, and the mission starts over.
  await page.evaluate(() => {
    const n = window.__np;
    const g = n.tunnels?.guards[0];
    if (!g) return;
    n.walker.x = g.x + Math.cos(g.look) * 40;
    n.walker.y = g.y + Math.sin(g.look) * 40;
  });
  await expect(page.locator('#toast')).toContainText('Spotted!', { timeout: 3000 });
  const back = await page.evaluate(() => {
    const n = window.__np;
    return Math.hypot(n.walker.x - n.STEALTH_START.x, n.walker.y - n.STEALTH_START.y);
  });
  expect(back).toBeLessThan(40);
  // Close behind a guard: backstab.
  await page.evaluate(() => {
    const n = window.__np;
    const g = n.tunnels?.guards[0];
    if (!g) return;
    n.walker.x = g.x - Math.cos(g.look) * 20;
    n.walker.y = g.y - Math.sin(g.look) * 20;
  });
  await expect(page.locator('#climb')).toHaveText('Backstab!', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('Backstab!');
  expect(await page.evaluate(() => window.__np.tunnels?.guards[0]?.down)).toBe(true);
  // Invisible for a few seconds.
  await expect(page.locator('#invisBtn')).toBeVisible();
  await page.locator('#invisBtn').click();
  expect(await page.evaluate(() => window.__np.invisT)).toBeGreaterThan(0);
  // Up the ladder at the top: the tower top and the sorcerer.
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.STEALTH_GOAL.x;
    n.walker.y = n.STEALTH_GOAL.y;
  });
  await expect(page.locator('#toast')).toContainText('out on top of the tower', { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.tunnels?.roof)).toBe(true);
  await page.evaluate(() => {
    const n = window.__np;
    n.walker.x = n.SORC_AT.x + 20;
    n.walker.y = n.SORC_AT.y + 20;
  });
  await expect(page.locator('#climb')).toHaveText('Kick him off!', { timeout: 3000 });
  await page.click('#climb');
  await expect(page.locator('#toast')).toContainText('You kick the sorcerer off');
  await expect(page.locator('#toast')).toContainText('"Come on!"', { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('Tada!', { timeout: 6000 });
  expect(
    await page.evaluate(() => [window.__np.tunnels, window.__np.stealth1, window.__np.floor]),
  ).toEqual([null, true, await page.evaluate(() => window.__np.BRIDGE_TARDOCK)]);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect([saved.stealth1, saved.invis]).toEqual([true, true]);
  expect(errors).toEqual([]);
});

test('the mermaids: heard at dusk off island 2, seen on their rocks, gone under from a fast boat, and boats go round the rocks', async ({
  context,
  page,
}) => {
  // Out along the shore from their rocks, in earshot but not yet in sight, at the start of dusk.
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 154, y: 5647, h: Math.PI, clock: 0.552, hold: [] },
  });
  await page.waitForFunction(
    () => window.__np.mermaids.list.every((m) => m.state === 'sit'),
    null,
    {
      timeout: 12000,
    },
  );
  await expect(page.locator('#toast')).toContainText('Singing, out on the water');
  expect(await page.evaluate(() => window.__np.mer.seen)).toBe(false);
  // Up close, gently: there they are.
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.MER_ROCKS.x + 180;
    n.boat.y = n.MER_ROCKS.y - 60;
    n.boat.v = 0;
  });
  await page.waitForFunction(() => window.__np.mer.seen, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('Mermaids!');
  await expect(page.locator('#log')).toContainText('Mermaids found');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect(saved.mer).toEqual({
    seen: true,
    pearls: 0,
    given: 0,
    night: -1,
    charm: false,
    sirens: false,
  });
  expect(await page.evaluate(() => window.__np.mapMarks().map((m) => m.name))).toContain(
    'Mermaid rocks',
  );
  // Coming on fast, they are gone under the water.
  await page.evaluate(() => {
    window.__np.boat.v = 320;
  });
  await page.waitForFunction(
    () => window.__np.mermaids.list.every((m) => m.state !== 'sit'),
    null,
    {
      timeout: 3000,
    },
  );
  await expect(page.locator('#toast')).toContainText('too fast');
  // A boat put on a rock is pushed off it.
  const off = await page.evaluate(async () => {
    const n = window.__np;
    const r = n.ROCKS[3];
    if (!r) throw new Error('no rocks');
    n.boat.x = r.x + 2;
    n.boat.y = r.y + 1;
    n.boat.v = 0;
    await new Promise((res) => setTimeout(res, 200));
    return Math.hypot(n.boat.x - r.x, n.boat.y - r.y) - r.r;
  });
  expect(off).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('singing with the mermaids: stopped by them at dusk, a tune sung back on the shells for a pearl, one a night, and their paint', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    mer: { seen: true },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -387, y: 5743, h: Math.PI, clock: 0.6, hold: [] },
  });
  await page.waitForFunction(
    () => window.__np.mermaids.list.every((m) => m.state === 'sit'),
    null,
    {
      timeout: 12000,
    },
  );
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#merSing')).toBeVisible();
  // The tiers' ten paints, and not yet the mermaids'.
  expect(await page.locator('#paints .sw').count()).toBe(10);
  await page.click('#merSing');
  await expect(page.locator('#shells')).toBeVisible();
  await expect(page.locator('#shellSay')).toContainText('sings');
  await page.waitForFunction(() => window.__np.merSong?.state === 'yours', null, { timeout: 8000 });
  await expect(page.locator('#shellSay')).toContainText('Your turn');
  const tune = await page.evaluate(() => [...(window.__np.merSong?.tune ?? [])]);
  expect(tune).toHaveLength(3);
  // A wrong note: she sings it again, and it is yours again after.
  await page.locator(`#shells [data-n="${((tune[0] ?? 0) + 1) % 4}"]`).click();
  await expect(page.locator('#shellSay')).toContainText('Not quite');
  await page.waitForFunction(() => window.__np.merSong?.state === 'yours', null, {
    timeout: 10000,
  });
  for (const n of tune) await page.locator(`#shells [data-n="${n}"]`).click();
  await page.waitForFunction(() => window.__np.mer.given === 1, null, { timeout: 5000 });
  await expect(page.locator('#toast')).toContainText('gave you a pearl');
  await expect(page.locator('#shells')).toBeHidden();
  const day = await page.evaluate(() => window.__np.day);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect(saved.mer).toEqual({
    seen: true,
    pearls: 1,
    given: 1,
    night: day,
    charm: false,
    sirens: false,
  });
  // One a night: no more singing tonight.
  await page.waitForTimeout(300);
  await expect(page.locator('#merSing')).toBeHidden();
  await expect(page.locator('#log')).toContainText('Mermaid pearls 1');
  // Their paint, Mermaid scales, now with the rest.
  expect(await page.locator('#paints .sw').count()).toBe(11);
  await page.locator('#paints [data-i="10"]').dispatchEvent('click');
  await page.waitForFunction(() => window.__np.paint === 10, null, { timeout: 2000 });
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').paint),
  ).toBe(10);
  expect(errors).toEqual([]);
});

test('the siren charm: the fifth pearl, and the mermaids string all five into a charm the boat wears', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    mer: { seen: true, pearls: 4, given: 4, night: -1 },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -387, y: 5743, h: Math.PI, clock: 0.6, hold: [] },
  });
  await page.waitForFunction(
    () => window.__np.mermaids.list.every((m) => m.state === 'sit'),
    null,
    {
      timeout: 12000,
    },
  );
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await page.click('#merSing');
  await page.waitForFunction(() => window.__np.merSong?.state === 'yours', null, {
    timeout: 12000,
  });
  // Four pearls given: a tune of seven notes.
  const tune = await page.evaluate(() => [...(window.__np.merSong?.tune ?? [])]);
  expect(tune).toHaveLength(7);
  for (const n of tune) await page.locator(`#shells [data-n="${n}"]`).click();
  await page.waitForFunction(() => window.__np.mer.charm, null, { timeout: 5000 });
  await expect(page.locator('#toast')).toContainText('into a charm');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect(saved.mer).toMatchObject({ pearls: 0, given: 5, charm: true });
  await expect(page.locator('#log')).toContainText('Siren charm');
  await expect(page.locator('#yours')).toContainText('Siren charm');
  expect(errors).toEqual([]);
});

test("the sirens: after midnight on the mermaids' rocks, their song pulls a boat onto the rocks, which knock the hull, and a broken hull washes up", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    mer: { seen: true },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -230, y: 5720, h: Math.PI, clock: 0.844, hold: [] },
  });
  await page.waitForFunction(() => window.__np.sirens.perched.length === 3, null, {
    timeout: 15000,
  });
  await expect(page.locator('#toast')).toContainText('sirens fly in');
  expect(await page.evaluate(() => window.__np.sirens.pull)).toBeGreaterThan(0);
  // Left to their song, the boat ends up on the rocks and the hull takes a knock.
  await page.waitForFunction(() => window.__np.hpNow < 100, null, { timeout: 10000 });
  await expect(page.locator('#log')).toContainText('Sirens heard');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}'));
  expect(saved.mer.sirens).toBe(true);
  // A hull at its last: the next knock breaks it, and the boat washes up, without its catch.
  await page.evaluate(() => {
    window.__np.hpNow = 5;
  });
  await expect(page.locator('#toast')).toContainText('sang your boat onto the rocks', {
    timeout: 6000,
  });
  await expect(page.locator('#toast')).toContainText('Washed up', { timeout: 6000 });
  expect(errors).toEqual([]);
});

test('the sirens and the charm: their song cannot pull a boat that wears it, and they shriek off into the dark', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    mer: { seen: true, pearls: 0, given: 5, night: -1, charm: true },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -60, y: 5640, h: Math.PI, clock: 0.844, hold: [] },
  });
  await page.waitForFunction(() => window.__np.sirens.perched.length === 3, null, {
    timeout: 15000,
  });
  await expect(page.locator('#toast')).toContainText('charm glows');
  expect(await page.evaluate(() => window.__np.sirens.pull)).toBe(0);
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.MER_ROCKS.x + 200;
    n.boat.y = n.MER_ROCKS.y - 80;
    n.boat.v = 0;
  });
  await page.waitForFunction(
    () => window.__np.sirens.list.every((s) => s.state !== 'perch'),
    null,
    { timeout: 4000 },
  );
  await expect(page.locator('#toast')).toContainText('shriek');
  expect(await page.evaluate(() => window.__np.hpNow)).toBe(100);
  expect(errors).toEqual([]);
});

test('the pet book: everyone who is yours on two shelves, drawn, and a name kept for the Baby Reaper', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    build: 1,
    isle6Stage: 2,
    reaperEgg: 3,
    crows: 2,
    feederFull: true,
    leggy: 3,
    stay: ['cat'],
  });
  await page.waitForFunction(() => document.getElementById('petsBtn')?.hidden === false, null, {
    timeout: 4000,
  });
  await page.locator('#petsBtn').dispatchEvent('click');
  await expect(page.locator('#petBook')).toBeVisible();
  const cards = page.locator('#petBookList .pet');
  await expect(cards).toHaveCount(6);
  expect(await cards.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.pet))).toEqual([
    'dog',
    'crows',
    'muffins',
    'cat',
    'warrior',
    'baby',
  ]);
  await expect(page.locator('[data-pet="cat"] .now')).toContainText('castle');
  await expect(page.locator('[data-pet="crows"] [data-rename]')).toHaveCount(0);
  // Every picture is drawn: something on each canvas.
  await page.waitForTimeout(300);
  const inked = await page.locator('#petBookList .petpic').evaluateAll((els) =>
    els.map((el) => {
      const c = el as HTMLCanvasElement;
      const d = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data ?? [];
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if ((d[i] ?? 0) > 0) n++;
      return n > 50;
    }),
  );
  expect(inked).toEqual([true, true, true, true, true, true]);
  // A name, typed: the keys go to the name, not the boat.
  await page.locator('[data-rename="baby"]').click();
  const box = page.locator('#petName');
  await expect(box).toBeFocused();
  const h0 = await page.evaluate(() => window.__np.boat.h);
  await box.fill('');
  await box.pressSequentially('Chomp');
  await box.press('Enter');
  await expect(page.locator('[data-pet="baby"] b')).toHaveText('Chomp');
  await expect(page.locator('[data-pet="baby"] .was')).toContainText('Baby Reaper');
  expect(await page.evaluate(() => window.__np.pets.save.nm)).toEqual({ baby: 'Chomp' });
  expect(await page.evaluate(() => window.__np.boat.h)).toBeCloseTo(h0, 5);
  await page.locator('#petBookClose').click();
  await expect(page.locator('#petBook')).toBeHidden();
  // Kept.
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => window.__np?.pets?.save.nm.baby === 'Chomp', null, {
    timeout: 5000,
  });
  expect(errors).toEqual([]);
});

test('the Garden Isle: sighted in the far deep, tie up at its pier, walk ashore to the plot and the stalls', async ({
  context,
  page,
}) => {
  // A flagship with the far deep open, sailing in on the island from the side toward home.
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -1200, y: 5600, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  expect(await page.evaluate(() => window.__np.gardenIsle.seen)).toBe(false);
  await page.evaluate(() => {
    const n = window.__np;
    const [x, y] = n.fromGarden(1150, 40);
    n.boat.x = x;
    n.boat.y = y;
    n.boat.h = (3 * Math.PI) / 4;
    n.boat.v = 120;
  });
  await expect(page.locator('#toast')).toContainText('the Garden Isle', { timeout: 8000 });
  expect(await page.evaluate(() => window.__np.gardenIsle.seen)).toBe(true);
  // Stopped in the dock ring off the end of its pier.
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.DOCK14.x;
    n.boat.y = n.DOCK14.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('Ashore on the Garden Isle');
  // Walk off the pier toward the island, as a thumb would: left along the pier, across the screen.
  const u = () =>
    page.evaluate(() => {
      const n = window.__np;
      const [x0, y0] = n.fromGarden(0, 0);
      return (n.walker.x - x0 - (n.walker.y - y0)) * Math.SQRT1_2;
    });
  const u0 = await u();
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  await page.mouse.move(CX - 60, CY, { steps: 3 });
  await page.waitForTimeout(2500);
  await page.mouse.up();
  expect(u0 - (await u())).toBeGreaterThan(120);
  // Into the plot: it says what it is. Then to the seed stall: shut, for now.
  await expect(page.locator('#toast')).not.toHaveClass(/show/, { timeout: 8000 });
  await page.evaluate(() => {
    const n = window.__np;
    const [x, y] = n.fromGarden(150, 8);
    n.walker.x = x;
    n.walker.y = y;
  });
  await expect(page.locator('#toast')).toContainText('Your plot', { timeout: 6000 });
  await expect(page.locator('#toast')).not.toHaveClass(/show/, { timeout: 8000 });
  await page.evaluate(() => {
    const n = window.__np;
    const [x, y] = n.fromGarden(232, -84);
    n.walker.x = x;
    n.walker.y = y;
  });
  await expect(page.locator('#toast')).toContainText('The seed stall', { timeout: 6000 });
  await expect(page.locator('#log')).toContainText('Garden Isle found');
  // Found, it keeps.
  await page.waitForTimeout(300);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('netprofit.v1') || '{}').garden,
  );
  expect(saved).toEqual({ seen: true });
  expect(errors).toEqual([]);
});

test('the drawing pad: a pet drawn with a finger, named, kept in the book walking, and let go', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, { muted: true });
  // Nobody is yours yet, and the book is still there to draw in.
  await page.locator('#petsBtn').dispatchEvent('click');
  await expect(page.locator('#petBook')).toBeVisible();
  await expect(page.locator('#petBookList .pet')).toHaveCount(0);
  await page.locator('#petDraw').click();
  await expect(page.locator('#petPad')).toBeVisible();
  await expect(page.locator('#padDone')).toHaveAttribute('aria-disabled', 'true');
  const box = await page.locator('#padCanvas').boundingBox();
  if (!box) throw new Error('no pad');
  const at = (u: number, v: number) => [box.x + u * box.width, box.y + v * box.height] as const;
  const line = async (pts: readonly (readonly [number, number])[]) => {
    const [x0, y0] = at(...(pts[0] as [number, number]));
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    for (const p of pts.slice(1)) {
      const [x, y] = at(...p);
      await page.mouse.move(x, y, { steps: 6 });
    }
    await page.mouse.up();
  };
  // A body, round; a red stroke undone; then three legs.
  const ring = Array.from({ length: 17 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return [0.5 + Math.cos(a) * 0.3, 0.45 + Math.sin(a) * 0.2] as const;
  });
  await line(ring);
  await page.locator('[data-colour="1"]').click();
  await line([
    [0.1, 0.1],
    [0.9, 0.12],
  ]);
  expect(await page.evaluate(() => window.__np.pets.pad.strokes.length)).toBe(2);
  await page.locator('#padUndo').click();
  await page.locator('[data-colour="0"]').click();
  for (const x of [0.32, 0.5, 0.68])
    await line([
      [x, 0.63],
      [x, 0.85],
    ]);
  expect(await page.evaluate(() => window.__np.pets.pad.strokes.length)).toBe(4);
  expect(await page.evaluate(() => window.__np.pets.pad.inkLeft)).toBeLessThan(1);
  await page.locator('#padDone').click();
  await expect(page.locator('#padName')).toBeVisible();
  // The name, typed: the keys go to the name, not the boat.
  const h0 = await page.evaluate(() => window.__np.boat.h);
  await page.locator('#padNameIn').pressSequentially('Wiggles');
  await page.locator('#padKeep').click();
  await expect(page.locator('#petPad')).toBeHidden();
  expect(await page.evaluate(() => window.__np.boat.h)).toBeCloseTo(h0, 5);
  const drawn = await page.evaluate(() => window.__np.pets.save.drawn);
  expect(drawn.map((d) => [d.id, d.nm])).toEqual([[1, 'Wiggles']]);
  expect(drawn[0]?.d.length).toBeLessThan(120);
  // In the book, walking on its card.
  const card = page.locator('[data-pet="d1"]');
  await expect(card.locator('b')).toHaveText('Wiggles');
  await page.waitForTimeout(300);
  const inked = await card.locator('canvas').evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const d = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data ?? [];
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if ((d[i] ?? 0) > 0) n++;
    return n;
  });
  expect(inked).toBeGreaterThan(200);
  // Kept.
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => window.__np?.pets?.save.drawn.length === 1, null, {
    timeout: 5000,
  });
  await page.click('#go');
  // Let go, after a second tap.
  await page.locator('#petsBtn').dispatchEvent('click');
  await page.locator('[data-letgo="d1"]').click();
  await expect(page.locator('[data-pet="d1"] .ask')).toContainText('Let Wiggles go');
  await page.locator('[data-gone="d1"]').click();
  await expect(page.locator('[data-pet="d1"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__np.pets.save.drawn)).toEqual([]);
  expect(errors).toEqual([]);
});

test("the Garden Isle's first harvest: buy seeds, plant, it grows while you wait, pick it and sell the basket", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 500,
    isle4Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    garden: { seen: true },
    trip: { x: -1200, y: 5600, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.DOCK14.x;
    n.boat.y = n.DOCK14.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  const standAt = (u: number, v: number) =>
    page.evaluate(
      ([a, b]) => {
        const n = window.__np;
        const [x, y] = n.fromGarden(a, b);
        n.walker.x = x;
        n.walker.y = y;
      },
      [u, v] as const,
    );
  const climb = page.locator('#climb');
  // The seed stall: two carrot seeds and a strawberry seed.
  await standAt(232, -84);
  await expect(climb).toHaveText('Look at the seeds', { timeout: 4000 });
  await climb.dispatchEvent('click');
  await expect(page.locator('#gardenCard')).toBeVisible();
  await expect(page.locator('#gardenShelf [data-seed]')).toHaveCount(12);
  // Today's stock was rolled as the stall opened, and saved at once: a reload cannot roll it again.
  const day = await page.evaluate(() => window.__np.gardenIsle.stock?.day);
  expect(day).toBeGreaterThanOrEqual(1);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('netprofit.v1') || '{}').garden.stock.day,
    ),
  ).toBe(day);
  await page.locator('[data-seed="carrot"]').dispatchEvent('click');
  await page.locator('[data-seed="carrot"]').dispatchEvent('click');
  await page.locator('[data-seed="strawberry"]').dispatchEvent('click');
  expect(await page.evaluate(() => [window.__np.coins, window.__np.gardenIsle.seeds])).toEqual([
    500 - 10 - 10 - 40,
    { carrot: 2, strawberry: 1 },
  ]);
  await page.click('#gardenClose');
  await expect(page.locator('#gardenCard')).toBeHidden();
  // The tray shows the seeds held, carrot chosen; plant one in the bed nearest the pier.
  await expect(page.locator('#seedTray')).toBeVisible();
  await expect(page.locator('#seedTray .seed')).toHaveCount(2);
  await standAt(172, 30);
  await expect(climb).toHaveText('Plant a carrot', { timeout: 4000 });
  await climb.dispatchEvent('click');
  await expect(climb).toHaveText(/Carrot: ripe in \d+ s/, { timeout: 4000 });
  // Choose the strawberry in the tray and plant it next door.
  await page.locator('#seedTray [data-pick="strawberry"]').dispatchEvent('click');
  await standAt(128, 30);
  await expect(climb).toHaveText('Plant a strawberry', { timeout: 4000 });
  await climb.dispatchEvent('click');
  // A minute later, as if the game had been closed: the carrot is ripe.
  await page.evaluate(() => {
    window.__np.gardenSkew = 61_000;
  });
  await standAt(172, 30);
  await expect(climb).toHaveText('Pick a carrot', { timeout: 4000 });
  await climb.dispatchEvent('click');
  expect(await page.evaluate(() => window.__np.gardenIsle.bag?.map((f) => f.c))).toEqual([
    'carrot',
  ]);
  // Its size is its own, so is its price: a carrot's 16, by the square of its size.
  const m = await page.evaluate(() => window.__np.gardenIsle.bag?.[0]?.m ?? 0);
  const worth = Math.round(16 * Math.max(0.9, m) ** 2);
  await expect(page.locator('#seedTray .basket')).toContainText('1/50');
  // Sold at the stand.
  await standAt(222, 86);
  await expect(climb).toHaveText(`Sell your basket for ${worth}`, { timeout: 4000 });
  await climb.dispatchEvent('click');
  await page.waitForFunction((w) => window.__np.coins === 440 + w, worth, { timeout: 3000 });
  // The strawberry plant is kept through a reload, and has grown on.
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  const beds = await page.evaluate(() => window.__np.gardenIsle.beds?.map((b) => b?.crop ?? null));
  expect(beds?.slice(0, 2)).toEqual([null, 'strawberry']);
  expect(errors).toEqual([]);
});

test('your walking pet: taken along from the book, it rides the boat, follows you ashore, and is petted', async ({
  context,
  page,
}) => {
  // Tied up in the dock ring, with a pet drawn.
  const errors = await boot(context, page, {
    muted: true,
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
    pets: { drawn: [{ id: 1, nm: 'Wiggles', d: 'EUUsUyetoUoOeOU.EYoYv.EgpWv.Ekpkv', got: 1 }] },
  });
  expect(await page.evaluate(() => window.__np.pets.walker.on)).toBe(false);
  await page.locator('#petsBtn').dispatchEvent('click');
  await page.locator('[data-walk="d1"]').click();
  await expect(page.locator('[data-walk="d1"]')).toHaveText('Walking with you');
  await expect(page.locator('[data-pet="d1"] .now')).toContainText('Walks with you');
  expect(
    await page.evaluate(() => [window.__np.pets.save.walk, window.__np.pets.walker.on]),
  ).toEqual(['d1', true]);
  await page.locator('#petBookClose').click();
  // Aboard, it rides the boat: there is somewhere to tap it.
  expect(await page.evaluate(() => window.__np.pets.walkAt)).not.toBeNull();
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // On foot, it hops out and keeps at the figure's heel as the figure walks.
  await page.waitForFunction(() => window.__np.pets.walker.ashore, null, { timeout: 3000 });
  await page.keyboard.down('a');
  await page.waitForTimeout(1200);
  await page.keyboard.up('a');
  await page.waitForTimeout(800);
  const gap = await page.evaluate(() => {
    const n = window.__np;
    return Math.hypot(n.pets.walker.x - n.walker.x, n.pets.walker.y - n.walker.y);
  });
  expect(gap).toBeLessThan(60);
  // A tap on it: hearts.
  const at = await page.evaluate(() => window.__np.pets.walkAt);
  if (!at) throw new Error('no pet to tap');
  await page.mouse.click(at[0], at[1]);
  expect(await page.evaluate(() => window.__np.pets.walker.love)).toBeGreaterThan(0);
  // Kept: after a reload it still walks with you.
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => window.__np?.pets?.walker.on === true, null, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('the Garden Isle in a storm: out near it, the rain makes ripe fruit Wet and a bolt makes one Shocked', async ({
  context,
  page,
}) => {
  const now = Date.now();
  const bed = {
    crop: 'strawberry',
    planted: now - 1e9,
    ripe: 4,
    next: 0,
    w: [1, 1, 1, 1],
    born: 4,
  };
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    garden: { seen: true, beds: [bed, bed, bed, null, null, null] },
    trip: { x: -1200, y: 5600, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  // Out on the water by the isle, not tied up.
  await page.evaluate(() => {
    const n = window.__np;
    const [x, y] = n.fromGarden(700, 260);
    n.boat.x = x;
    n.boat.y = y;
    n.boat.v = 0;
    n.storm.bring();
  });
  // Its warning, hurried on.
  await page.waitForFunction(() => window.__np.storm.phase === 'warn', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.storm.t = 0.2;
  });
  await page.waitForFunction(() => window.__np.storm.phase === 'storm', null, { timeout: 4000 });
  // Then a flash of lightning: the first one strikes the garden.
  await page.evaluate(() => {
    window.__np.storm.flash = 0;
  });
  await expect(page.locator('#toast')).toContainText('Lightning struck your strawberry', {
    timeout: 4000,
  });
  const marks = await page.evaluate(
    () => window.__np.gardenIsle.beds?.flatMap((b) => b?.mu ?? []) ?? [],
  );
  expect(marks.filter((m) => m.includes('shocked'))).toHaveLength(1);
  // The rain's Wet ones are the garden's own count, each at most once.
  for (const m of marks) expect(m.filter((x) => x === 'wet').length).toBeLessThanOrEqual(1);
  // A second flash in the same storm strikes nothing more.
  await page.evaluate(() => {
    window.__np.storm.flash = 0;
  });
  await page.waitForTimeout(600);
  const again = await page.evaluate(
    () => window.__np.gardenIsle.beds?.flatMap((b) => b?.mu ?? []) ?? [],
  );
  expect(again.filter((m) => m.includes('shocked'))).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('typing a save code into the Play on another device card does not steer the boat', async ({
  context,
  page,
}) => {
  // Out on the water and still, so any turn or throttle shows.
  const errors = await boot(context, page, {
    muted: true,
    trip: { x: 2400, y: 2100, h: 0.6, clock: 0.3, hold: [] },
  });
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => ({ h: window.__np.boat.h, v: window.__np.boat.v }));
  await page.locator('#carryBtn').dispatchEvent('click');
  const box = page.locator('#carryIn');
  await box.focus();
  // A code is four words from the game's world; these are all steering letters.
  await box.pressSequentially('swaddddwwwaaaa', { delay: 60 });
  await box.press('ArrowLeft');
  await expect(box).toHaveValue('swaddddwwwaaaa');
  const after = await page.evaluate(() => ({ h: window.__np.boat.h, v: window.__np.boat.v }));
  expect(after.h).toBeCloseTo(before.h, 5);
  expect(Math.abs(after.v)).toBeLessThan(1);
  expect(errors).toEqual([]);
});

test('eggs: one due hatches aboard with its reveal and a name, and one still waiting shows its time in the book', async ({
  context,
  page,
}) => {
  const now = Date.now();
  // Out at sea, calm, with a frog's egg long since due and a rare one laid just now.
  const errors = await boot(context, page, {
    muted: true,
    trip: { x: 2400, y: 2100, h: 0.6, clock: 0.3, hold: [] },
    pets: {
      eggs: [
        { k: 'common', sp: 'frog', from: 'garden', at: now - 3_600_000, due: now - 3_000_000 },
        { k: 'rare', sp: 'fox', from: 'garden', at: now, due: now + 3_600_000 },
      ],
    },
  });
  // It hatches a moment after all is calm: the egg shakes, cracks, and out it pops.
  await expect(page.locator('#hatchCard')).toBeVisible({ timeout: 6000 });
  expect(await page.evaluate(() => window.__np.pets.save.hatched.map((h) => h.sp))).toEqual([
    'frog',
  ]);
  await expect(page.locator('#hatchWord')).toHaveText("It's a frog!", { timeout: 6000 });
  await expect(page.locator('#hatchName')).toBeVisible({ timeout: 3000 });
  await page.locator('#hatchNameIn').pressSequentially('Hoppy');
  await page.locator('#hatchKeep').click();
  await expect(page.locator('#hatchCard')).toBeHidden();
  const p = await page.evaluate(() => window.__np.pets.save);
  expect(p.hatched.map((h) => [h.id, h.sp, h.nm])).toEqual([[1, 'frog', 'Hoppy']]);
  expect(p.eggs.map((e) => e.k)).toEqual(['rare']);
  // In the book: the frog, walking on its card, and the rare egg with its wait.
  await page.locator('#petsBtn').dispatchEvent('click');
  await expect(page.locator('[data-pet="h1"] b')).toHaveText('Hoppy');
  await expect(page.locator('[data-pet="h1"] .was')).toContainText('Frog');
  await expect(page.locator('#petBookList .egg')).toHaveCount(1);
  await expect(page.locator('#petBookList .egg')).toContainText(/Hatches in (1 hour|59 minutes)/);
  // It can walk with you, as a drawn one can.
  await page.locator('[data-walk="h1"]').click();
  expect(await page.evaluate(() => window.__np.pets.save.walk)).toBe('h1');
  // Kept.
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => window.__np?.pets?.save.hatched.length === 1, null, {
    timeout: 5000,
  });
  expect(errors).toEqual([]);
});

test('the pet house: built from the shop by the hut, its keeper gives an egg, and your pets play in its yard', async ({
  context,
  page,
}) => {
  // Tied up at home with the tree platform built, the wood and coins for it, a drawn pet and a hatched one.
  const errors = await boot(context, page, {
    muted: true,
    build: 1,
    coins: 1600,
    wood: 30,
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
    pets: {
      drawn: [{ id: 1, nm: 'Wiggles', d: 'EUUsUyetoUoOeOU.EYoYv.EgpWv.Ekpkv', got: 1 }],
      hatched: [{ id: 1, sp: 'frog', nm: 'Frog', got: 1, from: 'garden' }],
    },
  });
  const card = page.locator('#petHouseBtn');
  await expect(card).toContainText('Build a pet house');
  expect(await page.evaluate(() => window.__np.pets.yard.length)).toBe(0);
  await card.dispatchEvent('click');
  await page.waitForFunction(() => window.__np.pets.save.house === true, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(100);
  // Its keeper's egg, a common one, in the nest crate.
  const eggs = await page.evaluate(() => window.__np.pets.save.eggs);
  expect(eggs.map((e) => e.k)).toEqual(['common']);
  await expect(card).toContainText('2 of your pets live there');
  // Both play in the yard; one taken along leaves it.
  expect(await page.evaluate(() => window.__np.pets.yard.map((y) => y.key))).toEqual(['d1', 'h1']);
  // Ashore, up to the house, and in to visit them: the book, where each lives at the house.
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    const w = window.__np.walker;
    const H = window.__np.pets.PET_HOUSE;
    w.x = (H.x0 + H.x1) / 2;
    w.y = H.y1 + 10;
  });
  await expect(page.locator('#climb')).toHaveText('Visit your pets', { timeout: 4000 });
  await page.locator('#climb').click();
  await expect(page.locator('#petBook')).toBeVisible();
  await expect(page.locator('[data-pet="d1"] .now')).toContainText('pet house');
  await page.locator('[data-walk="h1"]').click();
  expect(await page.evaluate(() => window.__np.pets.yard.map((y) => y.key))).toEqual(['d1']);
  // Kept.
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => window.__np?.pets?.save.house === true, null, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('training: pets at the pet house level up while you are away, the one walking with you does not, and the book shows it', async ({
  context,
  page,
}) => {
  const now = Date.now();
  // Two and a half hours since training was last counted; the frog walks with you, the drawn one stays at the house.
  const errors = await boot(context, page, {
    muted: true,
    build: 1,
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
    pets: {
      drawn: [{ id: 1, nm: 'Wiggles', d: 'EUUsUyetoUoOeOU.EYoYv.EgpWv.Ekpkv', got: 1 }],
      hatched: [{ id: 1, sp: 'frog', nm: 'Hoppy', got: 1, from: 'garden' }],
      walk: 'h1',
      house: true,
      tr: now - 150 * 60_000,
    },
  });
  const p = await page.evaluate(() => window.__np.pets.save);
  expect(p.drawn[0]?.xp).toBe(150);
  expect(p.hatched[0]?.xp).toBeUndefined();
  await expect(page.locator('#toast')).toContainText(
    'While you were away, Wiggles trained up to level 2!',
    { timeout: 8000 },
  );
  // In the book: its level, the bar toward the next, and that it is training; the frog, walking, is not.
  await page.locator('#petsBtn').dispatchEvent('click');
  await expect(page.locator('[data-pet="d1"] .lvl')).toContainText('Level 2');
  await expect(page.locator('[data-pet="d1"] .lvl')).toContainText('Training');
  await expect(page.locator('[data-pet="h1"] .lvl')).toContainText('Level 1');
  await expect(page.locator('[data-pet="h1"] .lvl')).not.toContainText('Training');
  // The level row fits a card at phone width.
  const bar = await page.locator('[data-pet="d1"] .xpbar').boundingBox();
  if (!bar) throw new Error('no bar');
  expect(bar.x + bar.width).toBeLessThanOrEqual(390);
  // Kept.
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForFunction(() => window.__np?.pets?.save.drawn[0]?.xp === 150, null, {
    timeout: 5000,
  });
  expect(errors).toEqual([]);
});

test("the Garden Isle's gear shed: buy a can, a sprinkler and a shovel, water a bed, set the sprinkler down, dig one up", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 5000,
    isle4Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    garden: { seen: true, seeds: { pineapple: 2 } },
    trip: { x: -1200, y: 5600, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.DOCK14.x;
    n.boat.y = n.DOCK14.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  const standAt = (u: number, v: number) =>
    page.evaluate(
      ([a, b]) => {
        const n = window.__np;
        const [x, y] = n.fromGarden(a, b);
        n.walker.x = x;
        n.walker.y = y;
      },
      [u, v] as const,
    );
  const climb = page.locator('#climb');
  // The shed is open now: a can, a sprinkler and the shovel, from a stock that always has the can and the shovel.
  await standAt(-50, -136);
  await expect(climb).toHaveText('Look at the gear', { timeout: 4000 });
  await climb.dispatchEvent('click');
  await expect(page.locator('#gardenCard')).toBeVisible();
  await expect(page.locator('#gardenTitle')).toHaveText('The gear shed');
  await expect(page.locator('#gardenShelf [data-gear]')).toHaveCount(4);
  await page.evaluate(() => {
    const g = window.__np.gardenIsle;
    g.gearStock = { day: g.gearStock?.day ?? 1, n: { can: 2, sprinkler: 1, shovel: 1 } };
  });
  for (const k of ['can', 'sprinkler', 'shovel'])
    await page.locator(`[data-gear="${k}"]`).dispatchEvent('click');
  expect(await page.evaluate(() => [window.__np.coins, window.__np.gardenIsle.gear])).toEqual([
    5000 - 400 - 900 - 100,
    { can: 10, sprinkler: 1, shovel: 1 },
  ]);
  await page.click('#gardenClose');
  // Plant a pineapple, then take the can from the tray and water it: half a minute off.
  await standAt(172, 30);
  await expect(climb).toHaveText('Plant a pineapple', { timeout: 4000 });
  await climb.dispatchEvent('click');
  await page.locator('#seedTray [data-tool="can"]').dispatchEvent('click');
  await expect(climb).toHaveText(/^Water the pineapple: ripe in (15:00|14:5\d)$/, {
    timeout: 4000,
  });
  await climb.dispatchEvent('click');
  await expect(climb).toHaveText(/^Water the pineapple: ripe in 14:[23]\d$/, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.gardenIsle.gear?.can)).toBe(9);
  // The sprinkler, set down on the bed: it runs, saved, with the bed in its reach.
  await page.locator('#seedTray [data-tool="sprinkler"]').dispatchEvent('click');
  await expect(climb).toHaveText('Set your sprinkler down here', { timeout: 4000 });
  await climb.dispatchEvent('click');
  const spr = await page.evaluate(
    () => JSON.parse(localStorage.getItem('netprofit.v1') || '{}').garden.spr,
  );
  expect(spr).toHaveLength(1);
  expect(spr[0].beds).toContain(0);
  expect(await page.evaluate(() => window.__np.gardenTool)).toBeNull();
  // The shovel: two taps, and the bed is free.
  await page.locator('#seedTray [data-tool="shovel"]').dispatchEvent('click');
  await expect(climb).toHaveText('Dig up the pineapple', { timeout: 4000 });
  await climb.dispatchEvent('click');
  expect(await page.evaluate(() => window.__np.gardenIsle.beds?.[0])).not.toBeNull();
  await climb.dispatchEvent('click');
  await expect.poll(() => page.evaluate(() => window.__np.gardenIsle.beds?.[0] ?? null)).toBeNull();
  await expect(climb).toHaveText('Plant a pineapple', { timeout: 4000 });
  expect(errors).toEqual([]);
});

test("the Garden Isle's lily pond: cast with a fruit from the basket, a carp bites, reel it in to the hold", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    garden: {
      seen: true,
      bag: [
        { c: 'tomato', m: 1, v: 'gold' },
        { c: 'strawberry', m: 1 },
      ],
    },
    trip: { x: -1200, y: 5600, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.DOCK14.x;
    n.boat.y = n.DOCK14.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // At the pond's edge, on the side toward the plot: the cheapest fruit, the strawberry, is the bait.
  await page.evaluate(() => {
    const n = window.__np;
    const p = n.LILY_POND;
    const [cx, cy] = n.fromGarden(-95 + 48 + 12, 40);
    const k = (p.r + 12) / Math.hypot(cx - p.x, cy - p.y);
    n.walker.x = p.x + (cx - p.x) * k;
    n.walker.y = p.y + (cy - p.y) * k;
  });
  const cast = page.locator('#lilycast');
  await expect(cast).toHaveText('Cast with a strawberry', { timeout: 4000 });
  await cast.dispatchEvent('click');
  await expect(cast).toHaveText('Wait for it\u2026');
  expect(await page.evaluate(() => window.__np.gardenIsle.bag)).toEqual([
    { c: 'tomato', m: 1, v: 'gold' },
  ]);
  // A common carp takes it and the float goes under: reel in.
  await page.evaluate(() => {
    const l = window.__np.lilyLine;
    l.state = 'bite';
    l.t = 0;
    l.sp = 41;
  });
  await expect(cast).toHaveText('Reel in!');
  await cast.dispatchEvent('click');
  // Into the hold, and with the boat tied up at the pier, straight to the crates and sold.
  await expect(page.locator('#toast')).toContainText('Your first common carp');
  await expect.poll(() => page.evaluate(() => window.__np.coins)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__np.hold)).toBe(0);
  // The Gold tomato is all that is left, and would be the next bait.
  await expect(cast).toHaveText('Cast with a tomato');
  expect(errors).toEqual([]);
});

test("the Garden Isle's Moonkoi: after dark, a Moonlit dragon fruit on the hook, the fight held and let go, landed for its seed", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    garden: {
      seen: true,
      bag: [
        { c: 'strawberry', m: 1 },
        { c: 'dragonfruit', m: 1, mu: ['moonlit'] },
      ],
    },
    trip: { x: -1200, y: 5600, h: Math.PI / 2, clock: 0.8, hold: [] },
  });
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.DOCK14.x;
    n.boat.y = n.DOCK14.y;
    n.boat.v = 0;
    n.boat.h = (3 * Math.PI) / 4;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    const n = window.__np;
    n.clock = 0.8;
    const p = n.LILY_POND;
    const [cx, cy] = n.fromGarden(-95 + 48 + 12, 40);
    const k = (p.r + 12) / Math.hypot(cx - p.x, cy - p.y);
    n.walker.x = p.x + (cx - p.x) * k;
    n.walker.y = p.y + (cy - p.y) * k;
  });
  // At night, with a Moonlit dragon fruit in the basket, the cast is for the Moonkoi; the strawberry stays.
  const cast = page.locator('#lilycast');
  await expect(cast).toHaveText('Cast a Moonlit dragon fruit', { timeout: 4000 });
  await cast.dispatchEvent('click');
  expect(await page.evaluate(() => window.__np.gardenIsle.bag)).toEqual([
    { c: 'strawberry', m: 1 },
  ]);
  await expect(page.locator('#toast')).toContainText('Something huge and pale');
  // It strikes; the button says what to do.
  await page.evaluate(() => {
    const k = window.__np.koiNow;
    if (k) k.wait = 0;
  });
  await expect(page.locator('#toast')).toContainText('The Moonkoi!', { timeout: 4000 });
  await expect(cast).toHaveText(/Hold to pull|Let go!/);
  // Played out: it tires and is landed.
  await page.evaluate(() => {
    const k = window.__np.koiNow;
    if (k) k.stamina = 0.0001;
    window.__np.koiPull = true;
  });
  await expect.poll(() => page.evaluate(() => window.__np.koiNow)).toBeNull();
  await expect(page.locator('#toast')).toContainText('moonpetal vine', { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.gardenIsle.seeds)).toEqual({ moonpetal: 1 });
  expect(await page.evaluate(() => window.__np.gardenIsle.koi?.n)).toBe(1);
  // Once a night: the Moonlit fruit cast is gone until tomorrow night, and the strawberry is for carp.
  await expect(cast).toHaveText('Cast with a strawberry');
  expect(errors).toEqual([]);
});
