/**
 * Goat Isle, the owner's (2026-11-03): "a surprise island for fainting goats", with Sir Bucksworth XIV the goat king,
 * goat jokes and milk puns, goats on roofs, and a goat cave to explore, "jump the shark cheese camp fun". Her calls on
 * its plan: a surprise for her kid, so nothing in the guide gives it away; it rises out of the sea in the deep the first
 * dawn after the flagship is bought, hidden in a fog bank until the boat comes close. Only the flagship crosses the
 * buoys, so it is in reach the day it appears. The plan put it in the deep's top corner, which turned out to be the
 * Cthuluviathan's sunken city; it stands instead in the open water of the deep above home, between the trench and
 * that city, well out of the Cthuluviathan's waking reach.
 *
 * This is its first piece: the island, its beach where the boat runs up onto the sand as at island 2, and a village of
 * little houses with goats on every roof and pun signs. The landing faces home, the side a boat arrives from, and the
 * village is laid out as offsets from the centre, turned with it (at15).
 */
import { DEEP, IX, IY } from './island';

/** Its centre and radius. */
export const GOAT_ISLE = { x: IX + 1200, y: -DEEP / 2, r: 240 } as const;

/** The way home from the island, a unit vector: the landing faces it. */
const HX = (IX - GOAT_ISLE.x) / Math.hypot(IX - GOAT_ISLE.x, IY - GOAT_ISLE.y);
const HY = (IY - GOAT_ISLE.y) / Math.hypot(IX - GOAT_ISLE.x, IY - GOAT_ISLE.y);

/** The ring the boat ties up in. */
export const DOCK15 = {
  x: GOAT_ISLE.x + HX * (GOAT_ISLE.r + 100),
  y: GOAT_ISLE.y + HY * (GOAT_ISLE.r + 100),
  r: 125,
} as const;

/** The boat's berth for a hull of this scale: bow run up onto the sand, just outside what pushes a hull off. */
export function berth15(k: number): { x: number; y: number; h: number } {
  const d = GOAT_ISLE.r + 24 * k + 4;
  return { x: GOAT_ISLE.x + HX * d, y: GOAT_ISLE.y + HY * d, h: Math.atan2(-HY, -HX) };
}

/** Where the figure lands on the sand, off the bow. */
export const LANDING15 = {
  x: GOAT_ISLE.x + HX * (GOAT_ISLE.r - 22),
  y: GOAT_ISLE.y + HY * (GOAT_ISLE.r - 22),
} as const;

/**
 * A point on the island, from an offset off its centre in the village's own layout, where home lies off to (-1, 1):
 * turned so that the side toward home is toward home wherever the island stands.
 */
const ROT = Math.atan2(HY, HX) - (3 * Math.PI) / 4;
const RC = Math.cos(ROT);
const RS = Math.sin(ROT);
export const at15 = (dx: number, dy: number): [number, number] => [
  GOAT_ISLE.x + dx * RC - dy * RS,
  GOAT_ISLE.y + dx * RS + dy * RC,
];

/** A little house: its footprint, how tall its walls stand, its colours, and how many goats live on its roof. */
export type GoatHouse = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  wall: number;
  walls: string;
  roof: string;
  goats: number;
  /** The pun over its door, if it has one. */
  name?: string;
};

const house = (
  dx0: number,
  dy0: number,
  dx1: number,
  dy1: number,
  wall: number,
  walls: string,
  roof: string,
  goats: number,
  name?: string,
): GoatHouse => {
  // Its middle is turned with the layout; its walls stay square to the world, as every building's do.
  const [cx, cy] = at15((dx0 + dx1) / 2, (dy0 + dy1) / 2);
  const hw = (dx1 - dx0) / 2;
  const hh = (dy1 - dy0) / 2;
  return {
    x0: cx - hw,
    y0: cy - hh,
    x1: cx + hw,
    y1: cy + hh,
    wall,
    walls,
    roof,
    goats,
    ...(name ? { name } : {}),
  };
};

/**
 * The village, clear of the way up from the landing: the harbourmaster's hut by the beach, the Baa-kery, Billy's Goat
 * Gruff Repairs, and two cottages. The back of the island (up the screen) is kept for the hill, the castle and the
 * cave, which come later.
 */
export const HOUSES15: readonly GoatHouse[] = [
  house(-200, 66, -172, 98, 13, '#F3E3C3', '#3F7D8C', 1, 'Harbourmaster'),
  house(-118, -44, -76, -6, 16, '#FBEFD9', '#C9553B', 2, 'The Baa-kery'),
  house(34, 58, 78, 98, 15, '#E9D7B4', '#5F7A3A', 3, "Billy's Goat Gruff Repairs"),
  house(74, -92, 112, -58, 14, '#F6E7CF', '#A4473A', 1),
  house(118, -18, 156, 16, 13, '#EBDDC2', '#7A5A3A', 2),
];

/** Sir Bucksworth's cheese-wheel castle on the hill at the back (part three, world/goatcastle.ts): middle, radius, height. */
export const CASTLE15 = { x: at15(-30, -130)[0], y: at15(-30, -130)[1], r: 44, h: 40 } as const;

/**
 * The goat cave's mouth on the hill beside the castle (part four, data/goatcave.ts): a mound of rock, not ground to
 * stand on, its dark doorway toward the viewer and the doorstep in front of it, and its sign.
 */
export const CAVE15 = { x: at15(-125, -140)[0], y: at15(-125, -140)[1], r: 24 } as const;
export const CAVE15_DOOR = {
  x: CAVE15.x + (CAVE15.r + 10) * Math.SQRT1_2,
  y: CAVE15.y + (CAVE15.r + 10) * Math.SQRT1_2,
} as const;
export const CAVE15_REACH = 20;

/** Inside the castle's walls, with a little room round them: not ground to stand on. */
export function inCastle15(x: number, y: number, pad = 3): boolean {
  return Math.hypot(x - CASTLE15.x, y - CASTLE15.y) < CASTLE15.r + pad;
}

/** The harbourmaster's crates, by the landing, where the catch is sold. */
export const CRATES15 = { x: at15(-150, 112)[0], y: at15(-150, 112)[1] } as const;

/** The pun signs on posts about the island, each where it makes the joke: The Udder Side on the far shore. */
export const SIGNS15: readonly { x: number; y: number; text: string }[] = [
  { x: at15(135, -85)[0], y: at15(135, -85)[1], text: 'The Udder Side' },
  { x: at15(-40, 46)[0], y: at15(-40, 46)[1], text: 'The Kid Zone' },
  { x: at15(-100, -128)[0], y: at15(-100, -128)[1], text: 'No Kidding Allowed' },
  { x: at15(-120, 150)[0], y: at15(-120, 150)[1], text: 'Welcome to Goat Isle' },
];

/**
 * The Goat-yard's headstones (data/goatyard.ts), behind The Udder Side's sign along the far shore: in two crooked rows
 * round the shore, a little out of line each. Each stone's middle, which way it leans, and where the figure stands to
 * read it, in front of it toward the middle of the island.
 */
export const GRAVES15: readonly { x: number; y: number; lean: number; rx: number; ry: number }[] =
  Array.from({ length: 18 }, (_, i) => {
    const a = (-84 + (i * 96) / 17) * (Math.PI / 180);
    const r = i % 2 ? 200 : 182;
    const [x, y] = at15(Math.cos(a) * r, Math.sin(a) * r);
    const [rx, ry] = at15(Math.cos(a) * (r - 16), Math.sin(a) * (r - 16));
    return { x, y, lean: Math.sin(i * 2.7) * 0.18, rx, ry };
  });
/** How near a headstone the figure can stand. */
export const GRAVE_R = 5;

/** The Kid Zone: a little fenced pen where the kids (the baby goats) play, its middle and how far its fence runs. */
export const KID_ZONE = { x: at15(-12, 70)[0], y: at15(-12, 70)[1], r: 30 } as const;

/**
 * The fainting goats' meadows (part two): where each herd grazes, how far from there it wanders, and how many goats
 * it has. One on the open grass to the right of the village, one by the harbourmaster's below the path.
 */
export const HERDS15: readonly { x: number; y: number; r: number; n: number }[] = [
  { x: at15(70, -10)[0], y: at15(70, -10)[1], r: 46, n: 6 },
  { x: at15(-150, 20)[0], y: at15(-150, 20)[1], r: 34, n: 4 },
];

/** How far in from the waterline the figure can walk. */
export const SHORE_IN15 = 12;

/** Inside a house's walls, with a little room round them. */
export function inHouse15(x: number, y: number, pad = 3): boolean {
  return HOUSES15.some((h) => x > h.x0 - pad && x < h.x1 + pad && y > h.y0 - pad && y < h.y1 + pad);
}

/** Ground the figure can stand on: the island's sand and grass, round the houses and the Kid Zone's fence. */
export function onIsle15(x: number, y: number): boolean {
  if (Math.hypot(x - GOAT_ISLE.x, y - GOAT_ISLE.y) > GOAT_ISLE.r - SHORE_IN15) return false;
  if (inHouse15(x, y)) return false;
  if (inCastle15(x, y)) return false;
  if (Math.hypot(x - CAVE15.x, y - CAVE15.y) < CAVE15.r + 3) return false;
  if (GRAVES15.some((g) => Math.hypot(x - g.x, y - g.y) < GRAVE_R)) return false;
  const k = Math.hypot(x - KID_ZONE.x, y - KID_ZONE.y);
  return k < KID_ZONE.r - 4 || k > KID_ZONE.r + 4;
}

/** Further out than this from its shore, nothing needs to know the island is there. */
export function nearIsle15(x: number, y: number, pad: number): boolean {
  return Math.hypot(x - GOAT_ISLE.x, y - GOAT_ISLE.y) < GOAT_ISLE.r + pad;
}

/** How near its shore the boat sails before the fog lifts and the island is seen: just into the fog's edge. */
export const SIGHT15 = 340;
/** The fog bank round the hidden island: how far out from its shore it lies. */
export const FOG15 = 280;
/** Seconds the fog takes to lift once the island is sighted, and the camera's look at it then. */
export const LIFT15 = 3.5;
export const REVEAL15 = { x: GOAT_ISLE.x - 20, y: GOAT_ISLE.y - 20 } as const;
export const REVEAL15_T = 5.5;
/** How far the view pulls back to take in the whole island, for a screen this wide at this zoom. */
export function revealZoom15(width: number, zoom: number): number {
  const across = (GOAT_ISLE.r + 120) * 2 * 1.4 * zoom;
  return Math.min(1, (width * 0.9) / across);
}
