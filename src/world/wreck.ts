/**
 * The wreck off island 5, the kid's "the wreck's treasure": the fishing boat
 * that came too close to the island of bones lies on the sand at the foot of
 * its rocks, in clear shallow water, and its treasure is still inside. The
 * owner's choice: dive it side on, as the trench, swim into the hull for the
 * chest, and keep the bone sharks off with the spear. The island's rocks rise
 * on the left; ribs and skulls lie on the pale sand; the boat sits upright with
 * its deck torn open over the bow half, so the way in is from above, and the
 * chest is at the back of the hold, under what is left of the deck. Groupers
 * keep to the wreck, as groupers do. The bone sharks never come into the hull:
 * inside, the diver is safe.
 *
 * Its scene has its own coordinates, as the trench's: x across, y down from the
 * surface.
 */

import { GROUPER } from '../data/tuning';
import type { DiveSite } from './divesite';
import type { Loot } from './loot';
import type { Plant, Shoal } from './trench';

/** The scene's width and the depth of its sand. */
export const WW = 760;
export const WD = 320;
/** The diver goes in here, over the open half of the hull. */
export const WRECK_ENTRY = 500;

/** How far out the island's rocks reach from the left at a depth: further the deeper. */
export function reefIn(y: number): number {
  const k = Math.max(0, Math.min(1, y / WD));
  return 70 + Math.sqrt(k) * 80 + Math.sin(y * 0.045) * 14;
}

/** The sand's height across the scene: a gentle swell. */
export function sandAt(x: number): number {
  return WD - 22 - Math.sin(x * 0.017) * 8 - Math.sin(x * 0.041 + 2) * 4;
}

/** A box: from x0 to x1 across, y0 to y1 down. */
export type Box = { x0: number; y0: number; x1: number; y1: number };

/** The wreck itself: its hull from stern to bow, its gunwale and its keel. */
export const HULL = { x0: 300, x1: 560, top: 226, keel: 286 } as const;
/** What is left of the deck, over the back half; the bow half is torn open. */
export const DECK_END = 450;

/** What is solid in the water: the hull's sides and keel, the deck left over the stern half, and the wheelhouse. */
export const SOLIDS: readonly Box[] = [
  { x0: HULL.x0, y0: HULL.top, x1: HULL.x0 + 14, y1: WD },
  { x0: HULL.x1 - 14, y0: HULL.top, x1: HULL.x1, y1: WD },
  { x0: HULL.x0, y0: HULL.keel, x1: HULL.x1, y1: WD },
  { x0: HULL.x0, y0: HULL.top, x1: DECK_END, y1: HULL.top + 10 },
  { x0: 322, y0: 190, x1: 382, y1: HULL.top },
];

/** The hold: inside the hull, under the deck or the open sky. */
export function inHold(x: number, y: number): boolean {
  return x > HULL.x0 + 14 && x < HULL.x1 - 14 && y > HULL.top && y < HULL.keel;
}

/** Push a point out of a box grown by pad, the shortest way. */
function outOf(p: { x: number; y: number }, b: Box, pad: number): void {
  const x0 = b.x0 - pad;
  const x1 = b.x1 + pad;
  const y0 = b.y0 - pad;
  const y1 = b.y1 + pad;
  if (p.x <= x0 || p.x >= x1 || p.y <= y0 || p.y >= y1) return;
  const l = p.x - x0;
  const r = x1 - p.x;
  const u = p.y - y0;
  const d = y1 - p.y;
  const m = Math.min(l, r, u, d);
  if (m === l) p.x = x0;
  else if (m === r) p.x = x1;
  else if (m === u) p.y = y0;
  else p.y = y1;
}

/** Keep a point in the wreck's water: off the rocks, the sand and the sky, and out of the hull's timbers. */
export function keepInWreck(
  p: { x: number; y: number },
  pad: number,
  solids: readonly Box[] = SOLIDS,
): void {
  for (let i = 0; i < 3; i++) {
    p.y = Math.max(pad * 0.5, Math.min(sandAt(p.x) - pad, p.y));
    p.x = Math.max(reefIn(p.y) + pad, Math.min(WW - pad, p.x));
    for (const b of solids) outOf(p, b, pad);
  }
}

/** Whether a point is in the wreck's water with this much room round it. */
export function inWreckWater(x: number, y: number, pad = 0): boolean {
  if (y < pad * 0.5 || y > sandAt(x) - pad) return false;
  if (x < reefIn(y) + pad || x > WW - pad) return false;
  return SOLIDS.every(
    (b) => x <= b.x0 - pad || x >= b.x1 + pad || y <= b.y0 - pad || y >= b.y1 + pad,
  );
}

export const WRECK_SITE: DiveSite = {
  id: 'wreck',
  w: WW,
  d: WD,
  entry: WRECK_ENTRY,
  view: 300,
  keep: keepInWreck,
  inWater: inWreckWater,
};

/** For the sharks, the whole wreck is solid: they cannot get into the hold. */
export const SHARK_SOLIDS: readonly Box[] = [{ x0: HULL.x0, y0: 190, x1: HULL.x1, y1: WD }];

/** The wreck's treasure: the chest at the back of the hold, under the deck. */
export const WRECK_CHEST: Loot = {
  kind: 'chest',
  name: "the wreck's treasure chest",
  x: HULL.x0 + 40,
  y: HULL.keel - 8,
  coins: 1200,
  on: 'floor',
};

/** What grows round it: sea grass on the sand, fans and kelp on the rocks. */
export function wreckPlants(): Plant[] {
  const out: Plant[] = [];
  for (let x = 200; x < WW - 20; x += 38) {
    if (x > HULL.x0 - 16 && x < HULL.x1 + 16) continue;
    out.push({
      kind: 'kelp',
      x,
      y: sandAt(x),
      from: 'floor',
      h: 34 + ((x * 7) % 30),
      c: '#4FA35B',
      glow: false,
      ph: x * 0.1,
    });
  }
  for (let y = 60; y < WD - 40; y += 46) {
    out.push({
      kind: y % 92 < 46 ? 'fan' : 'kelp',
      x: reefIn(y),
      y,
      from: -1,
      h: 22 + (y % 20),
      c: y % 92 < 46 ? '#E07A9E' : '#3E9E5C',
      glow: false,
      ph: y * 0.07,
    });
  }
  return out;
}

/** What swims there: silver fish up in the light, and groupers round the bow, which a spear takes. */
export function wreckShoals(): Shoal[] {
  return [
    {
      kind: 'silver',
      n: 12,
      cx: 560,
      cy: 90,
      rx: 120,
      ry: 30,
      size: 6,
      c: '#E6F2F5',
      glow: false,
      ph: 1,
      pace: 0.12,
    },
    {
      kind: 'grouper',
      n: 4,
      cx: 640,
      cy: 255,
      rx: 40,
      ry: 12,
      size: 15,
      c: '#8C6A4F',
      glow: false,
      sp: GROUPER,
      ph: 2,
      pace: 0.05,
    },
  ];
}

/** Ribs and skulls on the sand, for the look of the place. */
export const WRECK_BONES: readonly { x: number; kind: 'ribs' | 'skull' }[] = [
  { x: 220, kind: 'ribs' },
  { x: 262, kind: 'skull' },
  { x: 610, kind: 'skull' },
  { x: 690, kind: 'ribs' },
];
