/**
 * Under the ice floe, the owner's addition to the kid's ice fishing: the third
 * place to dive, side on as the trench and the wreck are. In through the hole,
 * and the ice is a roof overhead: its underside hangs down in two ridges, the
 * left one with a cave cut into it and the right one with a tunnel right
 * through, and things lie frozen in the ice to be chipped out (once each, for
 * coins). Cod and char swim in the blue under it, which a spear takes; seals
 * swim loops past; and down below is the dark stony floor. The only way up is
 * the hole, so a rope ties the diver to it: out of air, too cold, or Swim back
 * up, the rope pulls the diver back along it and up through the hole. The
 * water is freezing: without the shipwright's white scuba suit a diver gets
 * cold fast and is pulled up; in it, the diver stays down as long as the air
 * lasts.
 *
 * Its scene has its own coordinates: x across, y down from the water in the
 * hole.
 */

import { ICE_CHAR, ICEFISH, POLAR_COD } from '../data/tuning';
import type { DiveSite } from './divesite';
import type { Loot } from './loot';
import type { Plant, Shoal } from './trench';

/** The scene's width and the depth of its floor. */
export const IW = 760;
export const ID = 400;
/** The hole, across the scene, and its half width: the way in, and the only way up. */
export const IHOLE = 380;
export const IHOLE_R = 26;
/** The ice's top, a little above the water, and its underside away from the ridges. */
export const ICE_TOPY = -8;
export const ICE_UNDER = 28;
/** Without the white suit, seconds to get too cold; and the share of that at which the game warns. */
export const COLD_T = 15;
export const COLD_WARN = 0.6;

/** A ridge of ice hanging down from the underside: where, how wide either way, how deep its lowest point. */
export type Ridge = { x: number; half: number; deep: number };
export const RIDGES: readonly Ridge[] = [
  { x: 200, half: 150, deep: 240 },
  { x: 600, half: 110, deep: 200 },
];

/** A box of water cut into the ice: from x0 to x1 across, y0 to y1 down. */
export type Cave = { x0: number; y0: number; x1: number; y1: number };
/** The cave in the left ridge, open on its right; the tunnel through the right ridge, open at both ends. */
export const CAVES: readonly Cave[] = [
  { x0: 132, y0: 96, x1: 312, y1: 156 },
  { x0: 505, y0: 92, x1: 695, y1: 136 },
];

/** How deep the ice's underside is at a place across: the ridges hang below the rest. */
export function iceUnder(x: number): number {
  let y = ICE_UNDER + Math.sin(x * 0.031) * 3;
  for (const r of RIDGES) {
    const t = (x - r.x) / r.half;
    if (Math.abs(t) < 1) y = Math.max(y, ICE_UNDER + (r.deep - ICE_UNDER) * (1 - t * t) ** 1.2);
  }
  return y;
}

/** The floor's height across the scene: stones and gravel, a gentle swell. */
export function iceFloor(x: number): number {
  return ID - 18 - Math.sin(x * 0.019) * 10 - Math.sin(x * 0.053 + 1) * 4;
}

/** Whether a place across is under the hole, with this much room either side. */
export function underHole(x: number, pad = 0): boolean {
  return Math.abs(x - IHOLE) <= IHOLE_R - pad;
}

function inCave(c: Cave, x: number, y: number, pad: number): boolean {
  return x >= c.x0 + pad && x <= c.x1 - pad && y >= c.y0 + pad && y <= c.y1 - pad;
}

/** Whether a point is in the water under the ice, with this much room round it. */
export function inIceWater(x: number, y: number, pad = 0): boolean {
  if (x < pad || x > IW - pad || y > iceFloor(x) - pad) return false;
  if (underHole(x, pad) && y >= pad * 0.5) return true;
  if (y >= iceUnder(x) + pad) return true;
  return CAVES.some((c) => inCave(c, x, y, pad));
}

/** Keep a point in the water: out of the ice, off the floor, inside the scene; the nearest way back. */
export function keepUnderIce(p: { x: number; y: number }, pad: number): void {
  p.x = Math.max(pad, Math.min(IW - pad, p.x));
  p.y = Math.min(iceFloor(p.x) - pad, p.y);
  if (inIceWater(p.x, p.y, pad)) return;
  const tries: { x: number; y: number }[] = [{ x: p.x, y: iceUnder(p.x) + pad }];
  if (underHole(p.x, pad)) tries.push({ x: p.x, y: Math.max(p.y, pad * 0.5) });
  for (const c of CAVES)
    tries.push({
      x: Math.max(c.x0 + pad, Math.min(c.x1 - pad, p.x)),
      y: Math.max(c.y0 + pad, Math.min(c.y1 - pad, p.y)),
    });
  let best: { x: number; y: number } | null = null;
  let bd = Number.POSITIVE_INFINITY;
  for (const t of tries) {
    if (!inIceWater(t.x, t.y, pad - 0.01)) continue;
    const d = Math.hypot(t.x - p.x, t.y - p.y);
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  if (best) {
    p.x = best.x;
    p.y = best.y;
  }
}

export const ICE_SITE: DiveSite = {
  id: 'ice',
  w: IW,
  d: ID,
  entry: IHOLE,
  view: 330,
  keep: keepUnderIce,
  inWater: inIceWater,
  ceiling: true,
};

/** A frozen thing, set in the ice: in a cave's back wall or a tunnel's roof, or a ridge's tip. */
function frozen(kind: Loot['kind'], name: string, x: number, y: number, coins: number): Loot {
  return { kind, name, x, y, coins, on: 'floor' };
}

/** The things frozen in the ice, each chipped out once. */
export const ICE_LOOT: readonly Loot[] = [
  frozen('spyglass', "an explorer's spyglass", 345, 28, 200),
  frozen('chest', 'a chest frozen in the ice', 122, 128, 800),
  frozen('gem', 'a blue gem', 200, 234, 400),
  frozen('crown', 'a gold crown', 600, 84, 500),
  frozen('bell', "a ship's bell", 600, 194, 250),
];
/** Every bit of the found mask. */
export const ICE_LOOT_ALL = (1 << ICE_LOOT.length) - 1;
/** How near the diver must come to chip one out. */
export const ICE_REACH = 30;

/** Whether frozen thing i has been chipped out. */
export function iceTaken(found: number, i: number): boolean {
  return (found & (1 << i)) !== 0;
}

/** How many of the frozen things have been chipped out. */
export function iceFound(found: number): number {
  let n = 0;
  for (let i = 0; i < ICE_LOOT.length; i++) if (iceTaken(found, i)) n++;
  return n;
}

/** The frozen thing in reach of the diver to chip out, if any not yet found. */
export function iceLootNear(found: number, x: number, y: number): number | null {
  let best: number | null = null;
  let bd = ICE_REACH;
  ICE_LOOT.forEach((l, i) => {
    if (iceTaken(found, i)) return;
    const d = Math.hypot(l.x - x, l.y - y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

/** What swims under the ice: polar cod in the blue, char lower down, and glassy icefish by the right ridge. */
export function iceShoals(): Shoal[] {
  return [
    {
      kind: 'cod',
      n: 10,
      cx: 400,
      cy: 290,
      rx: 150,
      ry: 30,
      size: 9,
      c: '#B8C7D0',
      glow: false,
      sp: POLAR_COD,
      ph: 0.4,
      pace: 0.1,
    },
    {
      kind: 'char',
      n: 6,
      cx: 300,
      cy: 315,
      rx: 150,
      ry: 12,
      size: 11,
      c: '#D9866A',
      glow: false,
      sp: ICE_CHAR,
      ph: 2.1,
      pace: 0.07,
    },
    {
      kind: 'icefish',
      n: 4,
      cx: 470,
      cy: 230,
      rx: 50,
      ry: 22,
      size: 12,
      c: '#DCEFF4',
      glow: false,
      sp: ICEFISH,
      ph: 4,
      pace: 0.06,
    },
  ];
}

/** What grows on the floor: kelp, and pale anemones on the stones. */
export function icePlants(): Plant[] {
  const out: Plant[] = [];
  for (let x = 30; x < IW - 20; x += 46) {
    const kelp = x % 92 < 46;
    out.push({
      kind: kelp ? 'kelp' : 'anemone',
      x,
      y: iceFloor(x),
      from: 'floor',
      h: kelp ? 40 + ((x * 7) % 34) : 12,
      c: kelp ? '#5E8C55' : '#F2C7D2',
      glow: false,
      ph: x * 0.09,
    });
  }
  return out;
}

/** The seals swimming loops under the ice: where each is at a time, and which way it faces. */
export function swimmingSeals(T: number): { x: number; y: number; dir: number }[] {
  return [0, 1].map((i) => {
    const a = T * (0.28 + i * 0.07) + i * 2.6;
    const x = IHOLE + Math.sin(a) * (230 - i * 50);
    const y = 280 + i * 40 + Math.sin(a * 2) * 25;
    return { x, y, dir: Math.cos(a) >= 0 ? 1 : -1 };
  });
}
