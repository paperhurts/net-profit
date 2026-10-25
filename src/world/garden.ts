/**
 * The Garden Isle, island 14 (2026-10-24, the owner's ask: "a garden isle. We want to replicate this game", Grow a
 * Garden, on an island of its own). The owner took the plan with her calls: it grows in real time, it lies in the far
 * deep's left corner, it may pay about what the boat does, and pets come last and stay in the garden. This is its first
 * piece, the place: a low green island with a pier toward home, a fenced plot of beds by the pier's root, the seed
 * stall, the sell stand and the gear shed standing shut, a windmill, an orchard and a scarecrow. Nothing grows yet.
 *
 * It lies in the far deep's left corner (-x, +y), the last empty corner of the far deep, straight across the map from
 * island 10, a little up the screen from the line between home and the Endless Isle, so the run out to the battles
 * passes its pier. It is laid out in its own frame like Skull Island's: u across the screen (+x -y, toward home), v down
 * it (+x +y). The pier runs out along u, toward home.
 */

import { BEDS_OPEN } from '../data/garden';
import { type Point, WS } from './island';

const R2 = Math.SQRT1_2;
/** How far it is from home along the line to the far deep's left corner, and how far up the screen off that line. */
const ALONG = 6300;
const OFF = -420;
/** Its middle in the world. */
export const GARDEN = {
  x: WS / 2 + (-ALONG + OFF) * R2,
  y: WS / 2 + (OFF + ALONG) * R2,
} as const;

/** From the world to the garden's own frame, and back. */
export function toGarden(x: number, y: number): [number, number] {
  const dx = x - GARDEN.x;
  const dy = y - GARDEN.y;
  return [(dx - dy) * R2, (dx + dy) * R2];
}
export function fromGarden(u: number, v: number): Point {
  return [GARDEN.x + (u + v) * R2, GARDEN.y + (v - u) * R2];
}

/** Its shore: round, give or take a gentle wander. */
export const GARDEN_R = 340;
/** How far its shore is from its middle at an angle round it, in its own frame. */
export function shoreRG(a: number): number {
  return GARDEN_R + 16 * Math.sin(3 * a + 1) + 9 * Math.sin(5 * a + 2);
}
/** The angle round its middle, and how far out, of a point in the world. */
export function polarG(x: number, y: number): [number, number] {
  const [u, v] = toGarden(x, y);
  return [Math.atan2(v, u), Math.hypot(u, v)];
}
/** As a round island, for what only needs one: the sea map, the radar, how big to think of it. */
export const ISLE14 = { x: GARDEN.x, y: GARDEN.y, r: GARDEN_R + 25 } as const;

/** Its shoreline in the world, n points round. */
export function gardenOutline(n: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = shoreRG(a);
    out.push(fromGarden(Math.cos(a) * r, Math.sin(a) * r));
  }
  return out;
}

/** The pier out toward home, its half width, its planks' height, and where the boat ties up past its end. */
export const PIER14 = { v: 40, u0: 285, u1: 495, half: 13 } as const;
export const PIER14_Z = 7;
const [DX, DY] = fromGarden(PIER14.u1 + 72, PIER14.v);
export const DOCK14 = { x: DX, y: DY, r: 125 } as const;
/** Bow in at the pier's end, for a hull of this scale. */
export function berth14(k: number): { x: number; y: number; h: number } {
  const [x, y] = fromGarden(PIER14.u1 + 6 + 34 * k, PIER14.v);
  return { x, y, h: (3 * Math.PI) / 4 };
}
const [LX, LY] = fromGarden(PIER14.u1 - 12, PIER14.v);
/** Where the figure lands, at the pier's end. */
export const LANDING14 = { x: LX, y: LY } as const;
const [CX, CY] = fromGarden(PIER14.u0 - 10, PIER14.v - 42);
/** The crates the hold is sold into, beside the pier's root. */
export const CRATES14 = { x: CX, y: CY } as const;

/** A bed's size, and the gap between beds. */
export const BED = 34;
const BED_GAP = 10;
/**
 * The plot's beds, in its own frame, nearest the pier first: four across and six down, 24 in all, of which the first
 * six are dug. The rest are staked out, for the day the plot grows.
 */
export const BEDS: readonly { u: number; v: number }[] = (() => {
  const out: { u: number; v: number }[] = [];
  const cols = [172, 128, 84, 40];
  const rows = [30, -14, -58, -102, -146, -190];
  // Nearest the pier first: the two columns by it, from the bottom row up, then outward.
  for (const pair of [
    [0, 1],
    [2, 3],
  ] as const)
    for (const r of rows) for (const c of pair) out.push({ u: cols[c] as number, v: r });
  return out;
})();
/** The beds dug from the start: those that can be planted (data/garden.ts). */
export const BEDS_START = BEDS_OPEN;
/** The plot round all its beds, edged with low planks: a step over, not a wall. */
export const PLOT14 = {
  u0: 40 - BED / 2 - BED_GAP,
  u1: 172 + BED / 2 + BED_GAP,
  v0: -190 - BED / 2 - BED_GAP,
  v1: 30 + BED / 2 + BED_GAP,
} as const;

/** The three stalls, each a box in its own frame (middle and half sizes), with where to stand to use it. */
export type Stall = {
  u: number;
  v: number;
  hu: number;
  hv: number;
  front: { u: number; v: number };
};
export const SEED_STALL: Stall = { u: 232, v: -112, hu: 22, hv: 16, front: { u: 232, v: -84 } };
export const SELL_STAND: Stall = { u: 222, v: 112, hu: 20, hv: 14, front: { u: 222, v: 86 } };
export const GEAR_SHED: Stall = { u: -50, v: -168, hu: 26, hv: 20, front: { u: -50, v: -136 } };
/** The compost bin (part ten), on the grass by the pier's root across from the crates: it keeps fish from the hold
 * for the beds. */
export const COMPOST_BIN: Stall = {
  u: PIER14.u0 - 14,
  v: PIER14.v + 46,
  hu: 12,
  hv: 10,
  front: { u: PIER14.u0 - 14, v: PIER14.v + 24 },
};
export const STALLS: readonly Stall[] = [SEED_STALL, SELL_STAND, GEAR_SHED, COMPOST_BIN];
/** The windmill, round, and how tall. */
export const WINDMILL = { u: -205, v: -30, r: 30, h: 150 } as const;
/** Just outside the plot's far corner, keeping watch over it: once every bed can be dug (part eleven), not on one. */
export const SCARECROW = { u: 0, v: -222 } as const;
/** The orchard, round the back of the island. */
export const TREES14: readonly { u: number; v: number; r: number }[] = [
  { u: -150, v: -210, r: 20 },
  { u: -215, v: -150, r: 22 },
  { u: -105, v: -255, r: 18 },
  { u: -250, v: 70, r: 20 },
  { u: -185, v: 135, r: 22 },
  { u: -110, v: 190, r: 19 },
  { u: 40, v: 230, r: 20 },
  { u: 120, v: 205, r: 18 },
];

/**
 * The lily pond (part eight), round, out on the grass between the plot and the windmill: fished from its edge with a
 * fruit from the basket for bait. Where it is in the isle's frame, and in the world (the frame only turns, so it is as
 * round there).
 */
export const LILY14 = { u: -95, v: 40, r: 48 } as const;
const [PX, PY] = fromGarden(LILY14.u, LILY14.v);
export const LILY_POND = { x: PX, y: PY, r: LILY14.r } as const;

/** Dry land stops this far in from the waterline. */
export const SHORE_IN14 = 14;

/** In a box of the frame, give or take pad. */
function inStall(u: number, v: number, s: Stall, pad: number): boolean {
  return Math.abs(u - s.u) <= s.hu + pad && Math.abs(v - s.v) <= s.hv + pad;
}

/** On the pier. */
export function onPier14(x: number, y: number): boolean {
  const [u, v] = toGarden(x, y);
  return Math.abs(v - PIER14.v) <= PIER14.half - 3 && u >= PIER14.u0 && u <= PIER14.u1;
}

/** Its ground underfoot, not into a stall, the windmill, a tree or the lily pond. The plot's edging is stepped over. */
export function onIsle14Ground(x: number, y: number): boolean {
  const [a, d] = polarG(x, y);
  if (d >= shoreRG(a) - SHORE_IN14) return false;
  const [u, v] = toGarden(x, y);
  if (STALLS.some((s) => inStall(u, v, s, 4))) return false;
  if (Math.hypot(u - WINDMILL.u, v - WINDMILL.v) <= WINDMILL.r + 6) return false;
  if (Math.hypot(u - LILY14.u, v - LILY14.v) <= LILY14.r + 2) return false;
  return !TREES14.some((t) => Math.hypot(u - t.u, v - t.v) <= t.r * 0.45 + 6);
}

/** The Garden Isle underfoot: its ground or its pier. */
export function onIsle14(x: number, y: number): boolean {
  return onIsle14Ground(x, y) || onPier14(x, y);
}

/** The height of what is underfoot: the pier's planks, or the ground. */
export function groundZ14(x: number, y: number): number {
  return onPier14(x, y) && !onIsle14Ground(x, y) ? PIER14_Z : 0;
}

/** Sighted from this far off its shore. */
export const SIGHT14 = 800;

/** Inside its shore, give or take pad. */
export function insideIsle14(x: number, y: number, pad: number): boolean {
  const [a, d] = polarG(x, y);
  return d < shoreRG(a) + pad;
}

/** Further out than this from it, nothing needs to know it is there. */
export function nearIsle14(x: number, y: number, pad: number): boolean {
  return insideIsle14(x, y, 90 + pad);
}

/** Keep a hull off its shore, wherever it is round it, and off the pier. */
export function pushOffIsle14(s: { x: number; y: number; v: number }, pad: number): void {
  const [a, d] = polarG(s.x, s.y);
  const r = shoreRG(a) + pad;
  if (d < r && d > 0) {
    const [x, y] = fromGarden(Math.cos(a) * r, Math.sin(a) * r);
    s.x = x;
    s.y = y;
    s.v *= 0.6;
  }
  const [u, v] = toGarden(s.x, s.y);
  if (u > PIER14.u0 && u < PIER14.u1 + pad * 0.3 && Math.abs(v - PIER14.v) < PIER14.half + pad) {
    const [x, y] = fromGarden(u, PIER14.v + Math.sign(v - PIER14.v || 1) * (PIER14.half + pad));
    s.x = x;
    s.y = y;
    s.v *= 0.6;
  }
}

/** Which stall the figure is standing in front of, if any. */
export function stallAt(x: number, y: number): Stall | null {
  const [u, v] = toGarden(x, y);
  return STALLS.find((s) => Math.hypot(u - s.front.u, v - s.front.v) < 26) ?? null;
}

/**
 * Where your companions wait while you work the plot (the owner's "very harassed by all my companions"): out on the
 * lawn below it, short of the two trees, so the beds are yours. They gather round it, never in the plot, and come
 * back to you once you step out of it.
 */
export const LAWN14 = { u: 80, v: 170 } as const;
/** How much closer the camera comes while the figure works the plot, on top of the usual ashore zoom. */
export const PLOT_ZOOM = 0.5;
/** And how far the view lifts then, as a share of the screen's height, so the beds near you clear the seed tray. */
export const PLOT_LIFT = 0.1;

/** In the plot, inside its edging. */
export function inPlot14(x: number, y: number): boolean {
  const [u, v] = toGarden(x, y);
  return u >= PLOT14.u0 && u <= PLOT14.u1 && v >= PLOT14.v0 && v <= PLOT14.v1;
}

/** The open bed the figure is standing on, as its index in BEDS, or -1. A little give round each, so a step onto its
 * edge counts. */
export function bedUnder(x: number, y: number, open: number = BEDS_START): number {
  const i = bedSpot(x, y);
  return i < open ? i : -1;
}

/** The bed the figure is standing on, dug or only staked out, as its index in BEDS, or -1. */
export function bedSpot(x: number, y: number): number {
  const [u, v] = toGarden(x, y);
  const h = BED / 2 + 4;
  for (let i = 0; i < BEDS.length; i++) {
    const b = BEDS[i] as { u: number; v: number };
    if (Math.abs(u - b.u) <= h && Math.abs(v - b.v) <= h) return i;
  }
  return -1;
}

/** How far a sprinkler's spray reaches: set on a bed, that bed and the four next to it; between beds, the four round it. */
export const SPRINKLER_REACH = 50;
/** The beds a sprinkler set down at (u, v) in the isle's frame waters, open or staked out, as indices in BEDS. */
export function bedsInReach(u: number, v: number): number[] {
  const out: number[] = [];
  BEDS.forEach((b, i) => {
    if (Math.hypot(b.u - u, b.v - v) <= SPRINKLER_REACH) out.push(i);
  });
  return out;
}
