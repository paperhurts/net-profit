/**
 * The Battle Barge, the kid's (his sixth list): "a place called the Battle Barge, free; customize the size of the map
 * in there, and all enemies can be summoned, a maximum of 10"; his answers: open anywhere, on the islands and out at
 * sea; it pays a coin, but it is mostly to get better, and for fun; you spawn in and pick what you fight and how many.
 * Built in stages, the owner's call: the first had the camps' and the undead's on-foot enemies, up to ten at once, in a
 * small, medium or large arena; the second adds the rest of those on foot, island 10's gorillas and gators, island 3's
 * swordsman and his three little demons, and the lancers from the ruins; the third brings the bosses, a few at a time,
 * those that fight in a room of their own first: the leviathan sorcerer, the Forgotten One, the Heron and the giant
 * pelican; then Cthulhu from the drowned temple, and the Old One, who rises out of the sea at the barge's back; then the
 * Reaper on land, off island 6's sand; then the Tar Anchorer, wading in the sea round the barge as it wades in its tar;
 * then island 10's spider, in a web strung between two posts on the deck, whom only bug spray beats. The fourth stage
 * brings the newest on foot: the tar island's tar humans and tar beasts (a tar beast has nowhere to run on the barge, so
 * it fights), and Skull Island's men in bone armour and its displacer beasts; and the fifth, two more bosses, the tar
 * island's: the tar leader, up out of his wait at his spot, and the tar dragon, circling over the deck; then Skrill,
 * off the top of his tower with his five monkeys, last of all.
 *
 * Here: the arena sizes, the enemies to pick from, a pick kept to ten, a saved setup read back, and where the picked
 * enemies stand when the fight starts.
 */

export type ArenaSize = 'small' | 'medium' | 'large';
export const ARENA_SIZES: readonly ArenaSize[] = ['small', 'medium', 'large'];
export const ARENA_NAMES: Readonly<Record<ArenaSize, string>> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

/**
 * The on-foot enemies, in the card's order, island by island: the monkeys' and the hired men's camps, island 10's
 * gorillas and gators, island 3's swordsman and demons, the undead of Gigantis, its lancers and the lagoon's, the tar
 * island's tar humans and tar beasts, and Skull Island's men and displacer beasts.
 */
export type BargeFoe =
  | 'monkey'
  | 'hired'
  | 'gorilla'
  | 'gator'
  | 'swordsman'
  | 'red'
  | 'blue'
  | 'green'
  | 'skeleton'
  | 'archer'
  | 'zombie'
  | 'ghost'
  | 'necro'
  | 'lancer'
  | 'lagoon'
  | 'tarhuman'
  | 'tarbeast'
  | 'boneman'
  | 'displacer'
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
  | 'skrill';
export const BARGE_FOES: readonly BargeFoe[] = [
  'monkey',
  'hired',
  'gorilla',
  'gator',
  'swordsman',
  'red',
  'blue',
  'green',
  'skeleton',
  'archer',
  'zombie',
  'ghost',
  'necro',
  'lancer',
  'lagoon',
  'tarhuman',
  'tarbeast',
  'boneman',
  'displacer',
  'sorcerer',
  'forgotten',
  'heron',
  'pelican',
  'cthulhu',
  'oldone',
  'reaper',
  'anchorer',
  'spider',
  'tarleader',
  'tardragon',
  'skrill',
];
/** The ones that are the undead's (entities/undead.ts). */
export const UNDEAD_FOES: readonly BargeFoe[] = [
  'skeleton',
  'archer',
  'zombie',
  'ghost',
  'necro',
  'lagoon',
];
/** The ones that are island 3's fighters (entities/fighter.ts): the swordsman and the three little demons. */
export const FIGHTER_FOES: readonly BargeFoe[] = ['swordsman', 'red', 'blue', 'green'];
/** The bosses, after the rest on the card, island by island. */
export const BOSS_FOES: readonly BargeFoe[] = [
  'sorcerer',
  'forgotten',
  'heron',
  'pelican',
  'cthulhu',
  'oldone',
  'reaper',
  'anchorer',
  'spider',
  'tarleader',
  'tardragon',
  'skrill',
];
/** What each is called on the card, and a word on how it fights. */
export const FOE_NAMES: Readonly<Record<BargeFoe, readonly [string, string]>> = {
  monkey: ['Monkeys', 'Bonk you and throw coconuts. 2 hits each.'],
  hired: ["The Heron's hired men", 'Punch and throw stones. 3 hits each.'],
  gorilla: ['Gorillas', 'Slam the ground for 3 hearts: get out of the red ring. 7 hits.'],
  gator: ['Gators', 'When the jaws open wide, step away. 10 hits.'],
  swordsman: ['Swordsmen', 'Fast, dash in, and block one spear. 12 hits.'],
  red: ['Red demons', 'Slash, and block one spear. 4 hits.'],
  blue: ['Blue demons', 'Keep back and call up monkeys. 4 hits.'],
  green: ['Green demons', 'Slash and call up monkeys. 4 hits.'],
  skeleton: ['Skeletons', 'Swords and shields: the shield takes the first hit. 4 hits.'],
  archer: ['Skeleton archers', 'Shoot arrows from far off. 3 hits.'],
  zombie: ['Zombies', 'Slow, and tough. 8 hits.'],
  ghost: ['Ghosts', 'Keep back and send cold wisps. 3 hits.'],
  necro: ['Necromancers', 'Raise skeletons out of the floor. 6 hits.'],
  lancer: ['Lancers', 'Slow, with long lances: 2 hearts a thrust. 10 hits.'],
  lagoon: ['Lagoon creatures', 'Quick, with claws. 2 hits.'],
  tarhuman: [
    'Tar humans',
    'Slam their arms down on the red ring: get out of it. 3 hearts. 15 hits.',
  ],
  tarbeast: ['Tar beasts', 'Lunge along the red line: step off it. 4 hearts. 18 hits.'],
  boneman: [
    "Skrill's men",
    'Bone armour and jawblades: get out of the red fan. 2 hearts. 18 hits.',
  ],
  displacer: [
    'Displacer beasts',
    'Never where they look: hit one just after it lashes. 3 hearts. 4 hits.',
  ],
  sorcerer: [
    'The leviathan sorcerer',
    'Flies round throwing purple bolts, and swoops to peck. 8 hits.',
  ],
  forgotten: ['The Forgotten One', 'Skulls, a death ray, and his sword up close. 36 hits.'],
  heron: ['The Heron', 'Zaps down a pink line, and makes copies of himself. 14 hits.'],
  pelican: [
    'The giant pelican',
    'Spits fish and dives at the red ring. Hit it on the ground. 15 hits.',
  ],
  cthulhu: ['Cthulhu', 'Sends tentacles up through the deck: spear them down. 10 hits.'],
  oldone: [
    'The Old One',
    'Rises out of the sea, slams his hand down, and calls up lagoon creatures. 50 hits.',
  ],
  reaper: [
    'The Reaper on land',
    'Sweeps his tail and charges: step out of the red. Spear him when he rears up. 30 hits.',
  ],
  anchorer: [
    'The Tar Anchorer',
    'Wades round the barge and throws its anchor at the red ring; swings it round up close. 80 hits.',
  ],
  spider: [
    'The giant spider',
    'Wraps you up and hangs you in his web. Only bug spray beats him: 3 sprays.',
  ],
  tarleader: [
    'The tar leader',
    'Sweeps his sword through a red fan and leaps into a red ring: 4 hearts each. At half, he calls up tar humans. 25 hits.',
  ],
  tardragon: [
    'The tar dragon',
    'Spits tar into three red rings and swoops down a red lane. Spear it when it lands. 18 hits.',
  ],
  skrill: [
    'Skrill',
    'With his five monkeys. Sweeps his sword through a red fan, drops orb bolts into red rings from up on his wings, and swoops down a red lane: 3 hearts each. Spear him down low. 20 hits.',
  ],
};

/** Ten at most, all told; and the prize for beating them all. */
export const BARGE_MAX = 10;
export const BARGE_PRIZE = 1;

/**
 * The camera on the barge, the owner's (2026-10-16: "bc my character is centered on screen I don't get a good view of the
 * fight"): it frames the arena, leaning only this much toward the figure, comes out further than ashore for a bigger
 * arena (its zoom times this, by the arena's radius), and sits the deck this far (of the screen's height) lower, so the
 * bosses that tower up at its back stand clear under the hearts.
 */
export const BARGE_LEAN = 0.3;
export const BARGE_DROP = 0.05;
export function bargeZoom(r: number): number {
  return r <= 150 ? 0.82 : r <= 200 ? 0.7 : 0.6;
}

/**
 * The Battle Barge at sea, the kid's (2026-10-16): the sea bosses get a Battle Barge of their own, "you customize your
 * map of islands and stuff", all the sea bosses, fought from your own boat with the harpoon. Built in stages too: this
 * first one is open water inside a ring of the barge's red and yellow buoys, far out past everything, and three of the
 * sea bosses: Star, the Skeleton Shark King and the Deep One, each made for the fight at its own spot round the ring's
 * back; the second adds the Reaper and the gulper; the third the anglerfish and the Cthuluviathan; the fourth the guard
 * leviathan, which brings every sea boss to the ring. The islands, the tar and the bridge on a map of your own come
 * next.
 */
export type BargeWhere = 'foot' | 'sea' | 'tar';
export type SeaFoe =
  | 'meteor'
  | 'king'
  | 'deep'
  | 'reaper'
  | 'gulper'
  | 'angler'
  | 'cthulu'
  | 'guard';
export const SEA_FOES: readonly SeaFoe[] = [
  'meteor',
  'king',
  'deep',
  'reaper',
  'gulper',
  'angler',
  'cthulu',
  'guard',
];
export const SEA_NAMES: Readonly<Record<SeaFoe, readonly [string, string]>> = {
  meteor: [
    'Star, the meteor serpent',
    'Circles over the boat and dives into the ring: steer out of it. Harpoon him in the water. 4 hits.',
  ],
  king: [
    'The Skeleton Shark King',
    'Charges down his line and throws his trident at the ring. Harpoon him when he leaps. 6 hits.',
  ],
  deep: [
    'The Deep One',
    'Grabs the boat and throws logs. Harpoon the tentacle that holds you, and its eye when it opens. 10 hits.',
  ],
  reaper: [
    'The Reaper',
    'Sweeps his tail through the red fan: turn hard out of it. Harpoon him when he rears up. 5 hits.',
  ],
  gulper: [
    'The gulper',
    'Chases the boat with its mouth wide open: run, and turn hard when it closes. Harpoon its head. 4 hits.',
  ],
  angler: [
    'The anglerfish',
    'Hangs a glowing light in the water: never sail fast straight at it, or its jaws swallow the boat. Harpoon the light. 3 hits.',
  ],
  cthulu: [
    'The Cthuluviathan',
    'Sends a tentacle up where the boat is going: steer off the bubbles. Harpoon the tentacles. 3 hits.',
  ],
  guard: [
    'The guard leviathan',
    'Rises across your way, spines first: turn away, or it shoves you back. Harpoon it while it stands. 3 hits.',
  ],
};
/**
 * Where the ring is: out on open water far west of the farthest buoys, clear of everything and of the barge's rooms;
 * and how far across it is from its middle, by the card's size.
 */
export const SEA_ARENA = { x: -30000, y: 2400 } as const;
export const SEA_RING: Readonly<Record<ArenaSize, number>> = {
  small: 800,
  medium: 1100,
  large: 1500,
};
/** A buoy every so far round the ring. */
export const SEA_BUOY_GAP = 150;
/**
 * The camera at sea, the owner's point, twice (2026-10-16, on the barge: "bc my character is centered on screen I don't
 * get a good view of the fight"; and at sea: the boat still in the middle, a boss half off the side and the bottom of the
 * screen empty). It frames the fight: the boat and every boss still in it within SEA_LOOK, as a box on the screen, the
 * camera on the box's middle and the zoom that fits it into the band between the top bar and the buttons (FRAME_W of
 * the screen's width and FRAME_H of its height, its middle FRAME_MID of the height above the screen's), but never out
 * past SEA_ZOOM_MIN of the sea's zoom nor in past SEA_ZOOM_MAX.
 */
export const SEA_LOOK = 1100;
export const FRAME_W = 0.86;
export const FRAME_H = 0.44;
export const FRAME_MID = 0.015;
export const SEA_ZOOM_MIN = 0.45;
export const SEA_ZOOM_MAX = 0.9;

/** One thing kept in frame, from the boat: where, how high it is, how far round it reaches, and how tall it stands. */
export type FramePoint = { dx: number; dy: number; z?: number; r: number; tall?: number };

/**
 * Where the camera looks (a point on the sea, from the boat) and the zoom (screen pixels to a world unit) that fits all
 * of them into the band on a w by h screen, by the isometric projection (core/iso.ts).
 */
export function seaFrame(
  pts: readonly FramePoint[],
  w: number,
  h: number,
): { dx: number; dy: number; zoom: number } {
  const K = Math.SQRT1_2;
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const p of pts) {
    const sx = (p.dx - p.dy) * K;
    const sy = (p.dx + p.dy) * K * 0.5 - (p.z ?? 0);
    x0 = Math.min(x0, sx - p.r * K);
    x1 = Math.max(x1, sx + p.r * K);
    y0 = Math.min(y0, sy - p.r * K * 0.5 - (p.tall ?? 0));
    y1 = Math.max(y1, sy + p.r * K * 0.5);
  }
  if (!(x1 > x0) || !(y1 > y0)) return { dx: 0, dy: 0, zoom: Number.POSITIVE_INFINITY };
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  // The sea point that projects to the box's middle.
  const a = cx / K;
  const b = (2 * cy) / K;
  return {
    dx: (a + b) / 2,
    dy: (b - a) / 2,
    zoom: Math.min((w * FRAME_W) / (x1 - x0), (h * FRAME_H) / (y1 - y0)),
  };
}

/** The ring's buoys, from its middle, for a ring of radius r. */
export function seaBuoys(r: number): { x: number; y: number }[] {
  const n = Math.max(12, Math.round((Math.PI * 2 * r) / SEA_BUOY_GAP));
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return out;
}

/** Where the boat comes in, from the ring's middle: at its front, toward the viewer, heading in. */
export function seaStart(r: number): { x: number; y: number; h: number } {
  const a = Math.PI / 4;
  return { x: Math.cos(a) * r * 0.78, y: Math.sin(a) * r * 0.78, h: a + Math.PI };
}

/**
 * Where n sea bosses start, from the ring's middle, in a ring of radius r: round its back, away from the boat, three
 * in the nearest row, four in the next, the rest furthest back, each row spread round either side of the middle and
 * neighbours about SEA_GAP apart, for they are big.
 */
export const SEA_GAP = 300;
export function seaSpots(n: number, r: number): { x: number; y: number }[] {
  const back = (-3 * Math.PI) / 4;
  const rows: readonly { at: number; cap: number }[] = [
    { at: 0.32, cap: 3 },
    { at: 0.55, cap: 4 },
    { at: 0.76, cap: BARGE_MAX },
  ];
  const out: { x: number; y: number }[] = [];
  let left = n;
  for (const row of rows) {
    const k = Math.min(left, row.cap);
    const rad = r * row.at;
    const step = Math.min(0.9, SEA_GAP / rad);
    for (let i = 0; i < k; i++) {
      const a = back + (i - (k - 1) / 2) * step;
      out.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
    }
    left -= k;
    if (left <= 0) break;
  }
  return out;
}

/**
 * The kid's map for the ring at sea (2026-10-17), "you make its map": islands where he taps them on a chart of the
 * ring, on the card's At sea side, each where it is from the ring's middle as a share of the ring's radius, so a map
 * fits every size of ring. Up to SEA_ISLES_MAX, each SEA_ISLE_R of the ring across from its middle; each keeps its sand
 * inside the buoys with a way round, clear of where the boat comes in, and apart from the others. In the fight the
 * islands stand in the ring and block the boat and the bosses alike.
 */
export type SeaIsle = { x: number; y: number; who?: SeaIsleWho };
/**
 * Who lives on an island (the kid's "Stars and Reapers on them", 2026-10-17): a Reaper, the land one, who wakes at
 * once and fights whoever comes ashore, and, beaten, goes off into the sea; or Star, who loops high over it and dives
 * at whoever comes ashore, and, driven off, flies away. Tapping an island on the chart puts a Reaper on it, tapping
 * it again Star, and again takes the island away (the kid's "ok" to cycling it).
 */
export type SeaIsleWho = 'reaper' | 'star';
const SEA_WHO: readonly (SeaIsleWho | undefined)[] = [undefined, 'reaper', 'star'];
export const SEA_ISLES_MAX = 5;
export const SEA_ISLE_R = 0.15;
/** Its middle no further out than this, which leaves a way round between its sand and the buoys. */
export const SEA_ISLE_REACH = 0.7;
/** Its middle no nearer than this to where the boat comes in. */
export const SEA_ISLE_CLEAR = 0.38;
/** Water at least this wide between two islands' sand. */
export const SEA_ISLE_GAP = 0.06;
/** Why an island cannot go here: too near the boat, too far out, too near another island, or the map is full. */
export type SeaIsleNo = 'edge' | 'boat' | 'near' | 'full';
export function seaIsleNo(
  isles: readonly SeaIsle[],
  p: SeaIsle,
  tar: readonly SeaIsle[] = [],
  bridges: readonly SeaIsle[] = [],
): SeaIsleNo | null {
  const st = seaStart(1);
  if (Math.hypot(p.x - st.x, p.y - st.y) < SEA_ISLE_CLEAR) return 'boat';
  if (Math.hypot(p.x, p.y) > SEA_ISLE_REACH) return 'edge';
  for (const i of isles)
    if (Math.hypot(p.x - i.x, p.y - i.y) < SEA_ISLE_R * 2 + SEA_ISLE_GAP) return 'near';
  for (const t of tar)
    if (Math.hypot(p.x - t.x, p.y - t.y) < SEA_ISLE_R + SEA_TAR_R + SEA_ISLE_GAP) return 'near';
  for (const b of bridges)
    if (bridgeShare(b, p.x, p.y) < SEA_ISLE_R + SEA_BRIDGE_REACH) return 'near';
  if (isles.length >= SEA_ISLES_MAX) return 'full';
  return null;
}
/** How far round the shore from the boat's bow, either way, the figure may land, in radians. */
export const SEA_LAND_ROUND = 0.5;
/**
 * The way ashore on one of the kid's islands, in the ring, for a boat at a point off its sand: the boat tied up there
 * bow in, and where the figure lands just up the beach. Straight in from the bow if that is in front of the boat on
 * the screen; or else a little way round the shore, on the side in front of it or, failing that, the most to one side
 * of it, so the boat never stands between the figure and the camera. Coming in from below on the screen, as the boat
 * does, the bow-on boat hid it.
 */
export function seaIsleWay(
  i: { x: number; y: number; r: number },
  at: { x: number; y: number },
): { berth(k: number): { x: number; y: number; h: number }; landing: { x: number; y: number } } {
  const a = Math.atan2(at.y - i.y, at.x - i.x);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const on = (d: number) => ({
    x: i.x + Math.cos(a + d) * (i.r - 18),
    y: i.y + Math.sin(a + d) * (i.r - 18),
  });
  // Down the screen is x + y, across it x - y.
  const ways = [0, SEA_LAND_ROUND, -SEA_LAND_ROUND].map(on);
  const front = ways.find((p) => p.x + p.y > at.x + at.y + 10);
  const side = (p: { x: number; y: number }) => Math.abs(p.x - p.y - (at.x - at.y));
  const landing = front ?? ways.reduce((b, p) => (side(p) > side(b) ? p : b));
  return {
    berth: (k) => ({
      x: i.x + c * (i.r + 24 * k + 6),
      y: i.y + s * (i.r + 24 * k + 6),
      h: a + Math.PI,
    }),
    landing,
  };
}
/** A tap on the chart: on an island, the next who on it (nobody, a Reaper, Star), and after Star it takes the island
 * away; on open water it adds an island there, if one may go there. */
export function seaIsleTap(
  isles: readonly SeaIsle[],
  p: SeaIsle,
  tar: readonly SeaIsle[] = [],
  bridges: readonly SeaIsle[] = [],
): SeaIsle[] {
  const hit = isles.findIndex((i) => Math.hypot(p.x - i.x, p.y - i.y) <= SEA_ISLE_R);
  const next = hit >= 0 ? SEA_WHO[SEA_WHO.indexOf(isles[hit]?.who) + 1] : undefined;
  if (next) return isles.map((i, k) => (k === hit ? { ...i, who: next } : i));
  if (hit >= 0) return isles.filter((_, k) => k !== hit);
  if (seaIsleNo(isles, p, tar, bridges)) return [...isles];
  return [...isles, { x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 }];
}

/**
 * Tar on the kid's map too (Rowan, 2026-10-17: "ok" to slow patches the boat can push through and the bosses cannot
 * go in): round patches of it, SEA_TAR_R of the ring across from their middles, up to SEA_TARS_MAX. A patch may go
 * nearer the buoys than an island, since the boat can push through it, but not over where the boat comes in, nor
 * on an island or another patch.
 */
export const SEA_TARS_MAX = 5;
export const SEA_TAR_R = 0.13;
export const SEA_TAR_REACH = 0.8;
/** Its middle no nearer than this to where the boat comes in, so the boat starts in clear water. */
export const SEA_TAR_CLEAR = 0.3;
export function seaTarNo(
  tar: readonly SeaIsle[],
  p: SeaIsle,
  isles: readonly SeaIsle[] = [],
  bridges: readonly SeaIsle[] = [],
): SeaIsleNo | null {
  const st = seaStart(1);
  if (Math.hypot(p.x - st.x, p.y - st.y) < SEA_TAR_CLEAR) return 'boat';
  if (Math.hypot(p.x, p.y) > SEA_TAR_REACH) return 'edge';
  for (const i of isles)
    if (Math.hypot(p.x - i.x, p.y - i.y) < SEA_ISLE_R + SEA_TAR_R + SEA_ISLE_GAP) return 'near';
  for (const t of tar) if (Math.hypot(p.x - t.x, p.y - t.y) < SEA_TAR_R * 2) return 'near';
  for (const b of bridges)
    if (bridgeShare(b, p.x, p.y) < SEA_TAR_R + SEA_BRIDGE_REACH) return 'near';
  if (tar.length >= SEA_TARS_MAX) return 'full';
  return null;
}
/** A tap on the chart with tar in hand: on a patch it takes it away; on open water it adds one, if one may go there. */
export function seaTarTap(
  tar: readonly SeaIsle[],
  p: SeaIsle,
  isles: readonly SeaIsle[] = [],
  bridges: readonly SeaIsle[] = [],
): SeaIsle[] {
  const hit = tar.findIndex((t) => Math.hypot(p.x - t.x, p.y - t.y) <= SEA_TAR_R);
  if (hit >= 0) return tar.filter((_, k) => k !== hit);
  if (seaTarNo(tar, p, isles, bridges)) return [...tar];
  return [...tar, { x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 }];
}
/** The share of its top speed a boat keeps in tar: it crawls through. */
export const SEA_TAR_SLOW = 0.35;

/**
 * Bridges on the kid's map (the owner, 2026-10-17: "do the bridge next and it is a dock on it", a short span anywhere;
 * the kid: "bosses can't get under but you don't go under it"). Each a short span on the open water, wherever it is
 * tapped, up to SEA_BRIDGES_MAX, lying across the screen (BRIDGE_U) so it is always seen side on, with a dock on its
 * side toward the viewer (BRIDGE_N). Its middle is where it is as a share of the ring's radius; it is
 * SEA_BRIDGE_HALF of the ring each way along. On the map it keeps SEA_BRIDGE_REACH clear all round, for itself and its
 * dock, from the islands, the tar and the other bridges, and its ends and dock inside the buoys.
 */
export const SEA_BRIDGES_MAX = 3;
export const SEA_BRIDGE_HALF = 0.2;
export const SEA_BRIDGE_REACH = 0.14;
/** Its ends no further out than this, its dock's end no further than SEA_BRIDGE_DOCK_OUT, and clear of the boat's way in. */
export const SEA_BRIDGE_OUT = 0.82;
export const SEA_BRIDGE_DOCK_OUT = 0.9;
export const SEA_BRIDGE_CLEAR = 0.3;
/** Along every bridge, across the screen; and across it, toward the viewer, where its dock is. */
export const BRIDGE_U = { x: Math.SQRT1_2, y: -Math.SQRT1_2 } as const;
export const BRIDGE_N = { x: Math.SQRT1_2, y: Math.SQRT1_2 } as const;
/** How far from a point a bridge's deck is, in shares, its middle at b. */
export function bridgeShare(b: SeaIsle, x: number, y: number): number {
  const t = Math.max(
    -SEA_BRIDGE_HALF,
    Math.min(SEA_BRIDGE_HALF, (x - b.x) * BRIDGE_U.x + (y - b.y) * BRIDGE_U.y),
  );
  return Math.hypot(x - (b.x + BRIDGE_U.x * t), y - (b.y + BRIDGE_U.y * t));
}
export function seaBridgeNo(
  bridges: readonly SeaIsle[],
  p: SeaIsle,
  isles: readonly SeaIsle[] = [],
  tar: readonly SeaIsle[] = [],
): SeaIsleNo | null {
  if (bridgeShare(p, seaStart(1).x, seaStart(1).y) < SEA_BRIDGE_CLEAR) return 'boat';
  const ends = [-1, 1].map((k) => ({
    x: p.x + BRIDGE_U.x * SEA_BRIDGE_HALF * k,
    y: p.y + BRIDGE_U.y * SEA_BRIDGE_HALF * k,
  }));
  if (ends.some((e) => Math.hypot(e.x, e.y) > SEA_BRIDGE_OUT)) return 'edge';
  const dx = p.x + BRIDGE_N.x * SEA_BRIDGE_REACH;
  const dy = p.y + BRIDGE_N.y * SEA_BRIDGE_REACH;
  if (Math.hypot(dx, dy) > SEA_BRIDGE_DOCK_OUT) return 'edge';
  for (const i of isles)
    if (bridgeShare(p, i.x, i.y) < SEA_ISLE_R + SEA_BRIDGE_REACH) return 'near';
  for (const t of tar) if (bridgeShare(p, t.x, t.y) < SEA_TAR_R + SEA_BRIDGE_REACH) return 'near';
  // All lie the same way, so two are as near as either's middle or ends are to the other.
  for (const b of bridges) {
    const near = [p, ...ends].some((q) => bridgeShare(b, q.x, q.y) < SEA_BRIDGE_REACH * 2);
    if (near || bridgeShare(p, b.x, b.y) < SEA_BRIDGE_REACH * 2) return 'near';
  }
  if (bridges.length >= SEA_BRIDGES_MAX) return 'full';
  return null;
}
/** A tap on the chart with a bridge in hand: on one it takes it away; on open water it puts one there, if it fits. */
export function seaBridgeTap(
  bridges: readonly SeaIsle[],
  p: SeaIsle,
  isles: readonly SeaIsle[] = [],
  tar: readonly SeaIsle[] = [],
): SeaIsle[] {
  const hit = bridges.findIndex((b) => bridgeShare(b, p.x, p.y) <= SEA_BRIDGE_REACH * 0.6);
  if (hit >= 0) return bridges.filter((_, k) => k !== hit);
  if (seaBridgeNo(bridges, p, isles, tar)) return [...bridges];
  return [...bridges, { x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 }];
}

/**
 * A bridge in the ring, in the world: its middle, and half its length. Its deck is BRIDGE_W each side of the line
 * along it and BRIDGE_Z over the water, with glass rails; its dock goes out from the middle of its near side,
 * DOCK_HALF each side and DOCK_LEN long from the deck's edge, steps going down from the deck for STAIR and then
 * planks DOCK_Z over the water, where the boat ties up at its end.
 */
export type BridgeAt = { x: number; y: number; half: number };
export const BRIDGE_W = 22;
export const BRIDGE_RAIL = 4;
export const BRIDGE_Z = 26;
export const DOCK_HALF = 26;
export const DOCK_LEN = 64;
export const DOCK_Z = 6;
export const STAIR = 22;
/** A point along the bridge from its middle, and across it toward the dock's side. */
export function bridgeFrame(b: BridgeAt, x: number, y: number): [number, number] {
  const dx = x - b.x;
  const dy = y - b.y;
  return [dx * BRIDGE_U.x + dy * BRIDGE_U.y, dx * BRIDGE_N.x + dy * BRIDGE_N.y];
}
/** Somewhere the figure can stand: the deck inside the rails, the steps, and the dock's planks. */
export function onSeaBridge(b: BridgeAt, x: number, y: number): boolean {
  const [t, o] = bridgeFrame(b, x, y);
  if (Math.abs(t) <= b.half && Math.abs(o) <= BRIDGE_W - BRIDGE_RAIL) return true;
  return Math.abs(t) <= DOCK_HALF - BRIDGE_RAIL && o > 0 && o <= BRIDGE_W + DOCK_LEN - BRIDGE_RAIL;
}
/** The height underfoot there: the deck; the steps going down from it; the dock's planks. */
export function seaBridgeZ(b: BridgeAt, x: number, y: number): number {
  const [, o] = bridgeFrame(b, x, y);
  if (o <= BRIDGE_W) return BRIDGE_Z;
  const f = Math.min(1, (o - BRIDGE_W) / STAIR);
  return BRIDGE_Z + (DOCK_Z - BRIDGE_Z) * f;
}
/** The dock's end, where the boat's bow comes in. */
export function bridgeDockEnd(b: BridgeAt): { x: number; y: number } {
  const o = BRIDGE_W + DOCK_LEN;
  return { x: b.x + BRIDGE_N.x * o, y: b.y + BRIDGE_N.y * o };
}
/** Where the boat ties up at the dock for a hull of this scale: bow in at its end, heading for the bridge. */
export function bridgeBerth(b: BridgeAt, k: number): { x: number; y: number; h: number } {
  const e = bridgeDockEnd(b);
  const off = 24 * k + 4;
  return {
    x: e.x + BRIDGE_N.x * off,
    y: e.y + BRIDGE_N.y * off,
    h: Math.atan2(-BRIDGE_N.y, -BRIDGE_N.x),
  };
}
/** Where the figure lands on the dock's planks, just in from its end. */
export function bridgeLanding(b: BridgeAt): { x: number; y: number } {
  const e = bridgeDockEnd(b);
  return { x: e.x - BRIDGE_N.x * 14, y: e.y - BRIDGE_N.y * 14 };
}
/** What the water is walled off by, as lengths of a given thickness: the deck end to end, and the dock out to near its end. */
export type Capsule = { ax: number; ay: number; bx: number; by: number; r: number };
export function bridgeWalls(b: BridgeAt): Capsule[] {
  const d0 = { x: b.x + BRIDGE_N.x * BRIDGE_W, y: b.y + BRIDGE_N.y * BRIDGE_W };
  const o1 = BRIDGE_W + DOCK_LEN - DOCK_HALF;
  return [
    {
      ax: b.x - BRIDGE_U.x * b.half,
      ay: b.y - BRIDGE_U.y * b.half,
      bx: b.x + BRIDGE_U.x * b.half,
      by: b.y + BRIDGE_U.y * b.half,
      r: BRIDGE_W,
    },
    { ax: d0.x, ay: d0.y, bx: b.x + BRIDGE_N.x * o1, by: b.y + BRIDGE_N.y * o1, r: DOCK_HALF },
  ];
}
/** The nearest point of a capsule's line to a point. */
export function capsuleNear(c: Capsule, x: number, y: number): { x: number; y: number } {
  const dx = c.bx - c.ax;
  const dy = c.by - c.ay;
  const len = dx * dx + dy * dy;
  const t = len > 0 ? Math.max(0, Math.min(1, ((x - c.ax) * dx + (y - c.ay) * dy) / len)) : 0;
  return { x: c.ax + dx * t, y: c.ay + dy * t };
}
/** Water this wide is kept between a boss's spot and an island's sand: the Deep One, the biggest that stays put, clear of it. */
export const SEA_SHORE = 110;
/**
 * The bosses' spots (seaSpots) kept off the islands, and off the tar, in a ring of radius r: one on an island or too
 * near its sand is moved straight out from the island's middle to clear water, or, where that would take it out to
 * the buoys, across to the island's far side. Each is an island unless it says how far it reaches (a share of r).
 */
export function seaSpotsClear(
  spots: readonly { x: number; y: number }[],
  isles: readonly (SeaIsle & { r?: number; x2?: number; y2?: number })[],
  r: number,
): { x: number; y: number }[] {
  return spots.map((s) => {
    let p = { ...s };
    for (let pass = 0; pass < 2; pass++)
      for (const i of isles) {
        const reach = (i.r ?? SEA_ISLE_R) * r + SEA_SHORE;
        // A length (a bridge) is kept clear of all along it: from the nearest point of its line.
        const near = capsuleNear(
          { ax: i.x * r, ay: i.y * r, bx: (i.x2 ?? i.x) * r, by: (i.y2 ?? i.y) * r, r: 0 },
          p.x,
          p.y,
        );
        const cx = near.x;
        const cy = near.y;
        const d = Math.hypot(p.x - cx, p.y - cy);
        if (d >= reach) continue;
        const a = d > 0 ? Math.atan2(p.y - cy, p.x - cx) : Math.atan2(-cy, -cx);
        p = { x: cx + Math.cos(a) * reach, y: cy + Math.sin(a) * reach };
        if (Math.hypot(p.x, p.y) > r * 0.85)
          p = { x: cx - Math.cos(a) * reach, y: cy - Math.sin(a) * reach };
      }
    return p;
  });
}

/**
 * The islands hide the boat too: a boss that chases it round the ring cannot see it with an island in the way, so
 * it makes for where it last saw it, and finds it again once the way between is clear. An island is in the way when
 * the line between them passes within SEA_HIDE of its sand's reach from its middle; once hidden, the boat stays hidden
 * until the line is clear by SEA_SEEN, so it does not flicker at an island's edge.
 */
export const SEA_HIDE = 0.75;
export const SEA_SEEN = 0.9;
export function seaBlocked(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  isles: readonly { x: number; y: number; r: number }[],
  k = SEA_HIDE,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  for (const i of isles) {
    const t = len > 0 ? Math.max(0, Math.min(1, ((i.x - ax) * dx + (i.y - ay) * dy) / len)) : 0;
    if (Math.hypot(ax + dx * t - i.x, ay + dy * t - i.y) < i.r * k) return true;
  }
  return false;
}

export type SeaPick = Record<SeaFoe, number>;

/** No sea boss picked. */
export function noSeaPick(): SeaPick {
  return { meteor: 0, king: 0, deep: 0, reaper: 0, gulper: 0, angler: 0, cthulu: 0, guard: 0 };
}

/** How many sea bosses are picked, all told. */
export function seaTotal(p: SeaPick): number {
  return SEA_FOES.reduce((n, k) => n + p[k], 0);
}

/** One more sea boss of a kind, or one fewer: never under none, and never past ten all told. */
export function seaAdd(p: SeaPick, k: SeaFoe, d: number): SeaPick {
  const out = { ...p };
  if (d > 0) out[k] = p[k] + Math.min(d, BARGE_MAX - seaTotal(p));
  else out[k] = Math.max(0, p[k] + d);
  return out;
}

/**
 * The Battle Barge on the tar, the owner's (2026-10-21, "tar version of the ring"): the tar ocean's own, fought from the
 * chemistry boat with its harpoon and its health bar of 100, as out on the tar ocean, in a ring of the barge's buoys on
 * a sea of tar of its own: the tar eel, the red tar tentacles and the tar kraken.
 */
export type TarFoe = 'eel' | 'tentacle' | 'kraken';
export const TAR_FOES: readonly TarFoe[] = ['eel', 'tentacle', 'kraken'];
export const TAR_NAMES: Readonly<Record<TarFoe, readonly [string, string]>> = {
  eel: [
    'The tar eel',
    'Bites at a red ring, and wraps you in a red ring of coils: sail out through it, or it pulls you under. Harpoon its head when it is up. 6 hits.',
  ],
  tentacle: [
    'Red tar tentacles',
    'Up in your way as you sail: out of the red ring before one slaps, 4 off the boat. 2 hits each.',
  ],
  kraken: [
    'The tar kraken',
    'Its arms slam at red rings, 10 off the boat: chop 10, and its giant eye rises. Harpoon the eye when it opens. 9 hits.',
  ],
};
/**
 * Where the ring of tar is: out past everything, north of the sea where the tar is drawn as on the tar ocean, clear of
 * the tar ocean itself and of the barge's rooms. Its size is the sea ring's, by the card's size.
 */
export const TAR_ARENA = { x: -30000, y: -14000 } as const;

export type TarPick = Record<TarFoe, number>;

/** Nobody picked on the tar. */
export function noTarPick(): TarPick {
  return { eel: 0, tentacle: 0, kraken: 0 };
}

/** How many are picked on the tar, all told. */
export function tarTotal(p: TarPick): number {
  return TAR_FOES.reduce((n, k) => n + p[k], 0);
}

/** One more on the tar of a kind, or one fewer: never under none, and never past ten all told. */
export function tarAdd(p: TarPick, k: TarFoe, d: number): TarPick {
  const out = { ...p };
  if (d > 0) out[k] = p[k] + Math.min(d, BARGE_MAX - tarTotal(p));
  else out[k] = Math.max(0, p[k] + d);
  return out;
}

export type BargePick = Record<BargeFoe, number>;
/**
 * The arena's size, on foot, at sea or on the tar, who to fight on foot, who at sea, the kid's map of islands there,
 * and who on the tar.
 */
export type BargeSetup = {
  size: ArenaSize;
  pick: BargePick;
  where: BargeWhere;
  sea: SeaPick;
  isles: SeaIsle[];
  tar: SeaIsle[];
  bridges: SeaIsle[];
  tarFoes: TarPick;
};

/** Nobody picked. */
export function noPick(): BargePick {
  const p = {} as BargePick;
  for (const k of BARGE_FOES) p[k] = 0;
  return p;
}
/** To start: a medium arena, three monkeys and two skeletons on foot; at sea, Star. */
export function defaultBarge(): BargeSetup {
  return {
    size: 'medium',
    pick: { ...noPick(), monkey: 3, skeleton: 2 },
    where: 'foot',
    sea: { ...noSeaPick(), meteor: 1 },
    isles: [],
    tar: [],
    bridges: [],
    tarFoes: { ...noTarPick(), eel: 1 },
  };
}

/** How many are picked, all told. */
export function bargeTotal(p: BargePick): number {
  return BARGE_FOES.reduce((n, k) => n + p[k], 0);
}

/** One more of a kind, or one fewer: never under none, and never past ten all told. */
export function bargeAdd(p: BargePick, k: BargeFoe, d: number): BargePick {
  const out = { ...p };
  if (d > 0) out[k] = p[k] + Math.min(d, BARGE_MAX - bargeTotal(p));
  else out[k] = Math.max(0, p[k] + d);
  return out;
}

/**
 * A saved setup read back: a size it knows, counts that are whole and not below none, ten at most; missing, the start.
 * One saved before the sea's is on foot, with the sea's start; one saved before the map has open water, and one
 * saved before the tar has none, nor bridges; one saved before the Battle Barge on the tar has its start there.
 */
export function parseBarge(o: unknown): BargeSetup {
  if (!o || typeof o !== 'object') return defaultBarge();
  const src = o as {
    size?: unknown;
    pick?: unknown;
    where?: unknown;
    sea?: unknown;
    isles?: unknown;
    tar?: unknown;
    bridges?: unknown;
    tarFoes?: unknown;
  };
  const size = (ARENA_SIZES as readonly unknown[]).includes(src.size)
    ? (src.size as ArenaSize)
    : 'medium';
  let pick = noPick();
  const p = (src.pick && typeof src.pick === 'object' ? src.pick : {}) as Record<string, unknown>;
  for (const k of BARGE_FOES) {
    const n = p[k];
    if (typeof n === 'number' && Number.isFinite(n) && n > 0)
      pick = bargeAdd(pick, k, Math.floor(n));
  }
  const where: BargeWhere = src.where === 'sea' || src.where === 'tar' ? src.where : 'foot';
  let sea = noSeaPick();
  if (src.sea && typeof src.sea === 'object') {
    const q = src.sea as Record<string, unknown>;
    for (const k of SEA_FOES) {
      const n = q[k];
      if (typeof n === 'number' && Number.isFinite(n) && n > 0) sea = seaAdd(sea, k, Math.floor(n));
    }
  } else sea = defaultBarge().sea;
  // The map: each island, then each patch of tar, kept only where one may go, in order, and no more than the most.
  const points = (a: unknown): { x: number; y: number; who: unknown }[] =>
    (Array.isArray(a) ? a : []).flatMap((i) => {
      const q = (i && typeof i === 'object' ? i : {}) as {
        x?: unknown;
        y?: unknown;
        who?: unknown;
      };
      if (typeof q.x !== 'number' || typeof q.y !== 'number') return [];
      return Number.isFinite(q.x) && Number.isFinite(q.y) ? [{ x: q.x, y: q.y, who: q.who }] : [];
    });
  let isles: SeaIsle[] = [];
  for (const p of points(src.isles))
    if (!seaIsleNo(isles, { x: p.x, y: p.y })) {
      isles = seaIsleTap(isles, { x: p.x, y: p.y });
      for (let k = SEA_WHO.indexOf(p.who as SeaIsleWho); k > 0; k--)
        isles = seaIsleTap(isles, { x: p.x, y: p.y });
    }
  const at = (p: { x: number; y: number }) => ({ x: p.x, y: p.y });
  let tar: SeaIsle[] = [];
  for (const p of points(src.tar).map(at))
    if (!seaTarNo(tar, p, isles)) tar = seaTarTap(tar, p, isles);
  let bridges: SeaIsle[] = [];
  for (const p of points(src.bridges).map(at))
    if (!seaBridgeNo(bridges, p, isles, tar)) bridges = seaBridgeTap(bridges, p, isles, tar);
  let tarFoes = noTarPick();
  if (src.tarFoes && typeof src.tarFoes === 'object') {
    const q = src.tarFoes as Record<string, unknown>;
    for (const k of TAR_FOES) {
      const n = q[k];
      if (typeof n === 'number' && Number.isFinite(n) && n > 0)
        tarFoes = tarAdd(tarFoes, k, Math.floor(n));
    }
  } else tarFoes = defaultBarge().tarFoes;
  return { size, pick, where, sea, isles, tar, bridges, tarFoes };
}

/**
 * Where n enemies stand when the fight starts, from the arena's middle, in an arena of radius r: in rows round its
 * back, away from where the figure comes in at its front, three in the nearest row, four in the next, the rest at the
 * back, each row spread round either side of the middle.
 */
export function arenaSpots(n: number, r: number): { x: number; y: number }[] {
  const back = (-3 * Math.PI) / 4;
  const rows: readonly { at: number; cap: number }[] = [
    { at: 0.38, cap: 3 },
    { at: 0.58, cap: 4 },
    { at: 0.78, cap: BARGE_MAX },
  ];
  const out: { x: number; y: number }[] = [];
  let left = n;
  for (const row of rows) {
    const k = Math.min(left, row.cap);
    const rad = r * row.at;
    // Spread so neighbours are about 40 apart, and never wider than round the back half.
    const step = Math.min(0.55, 40 / rad);
    for (let i = 0; i < k; i++) {
      const a = back + (i - (k - 1) / 2) * step;
      out.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
    }
    left -= k;
    if (left <= 0) break;
  }
  return out;
}
