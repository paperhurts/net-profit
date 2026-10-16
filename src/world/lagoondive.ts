/**
 * Down into island 11's black lagoon, the kid's (his sixth list's answers, 2026-10-15): "a key in the lagoon: when you
 * dive into the lagoon to fetch the key you see the creatures, ten of them, and your Reapers and things able to go
 * underwater go with you". Dived from its bank, ashore, side on as the trench and the wreck are: a bowl of still black
 * water, shallow at its banks and deep in its middle, the jungle's roots hanging down into it along both sides, and on
 * its muddy bottom what fell in from the ruins next to it, broken columns and old bones, among which lies the skull
 * key. It is dark from the top: only the diver's lamp and the glowing fungus light it. Ten lagoon creatures live in it
 * (entities/lagoonfolk.ts), each about its own place in the water, from just under the surface to the bottom.
 *
 * Its scene has its own coordinates, as the others do: x across from the bank the diver goes in at, y down from the
 * surface.
 */

import { rng } from '../core/math';
import type { DiveSite } from './divesite';
import type { Plant } from './trench';

/** The scene's width and the depth of its deepest mud. */
export const LW = 600;
export const LD = 300;
/** The diver goes in here, off the bank on the left. */
export const LAGOON_ENTRY = 64;

/** The mud's depth across the lagoon: a bowl, shallow at both banks, deepest a little right of the middle. */
export function lagoonFloor(x: number): number {
  const u = Math.max(0, Math.min(1, x / LW));
  const bowl = Math.sin(Math.PI * u ** 0.92) ** 0.6;
  return 58 + (LD - 30 - 58) * bowl + Math.sin(x * 0.05) * 6 + Math.sin(x * 0.13 + 1) * 3;
}

/** Keep a point in the lagoon's water: under the surface, over the mud, between the banks. */
export function keepInLagoon(p: { x: number; y: number }, pad: number): void {
  p.x = Math.max(pad, Math.min(LW - pad, p.x));
  p.y = Math.max(pad * 0.5, Math.min(lagoonFloor(p.x) - pad, p.y));
}

/** Whether a point is in the lagoon's water, with this much room round it. */
export function inLagoonWater(x: number, y: number, pad = 0): boolean {
  return x >= pad && x <= LW - pad && y >= pad * 0.5 && y <= lagoonFloor(x) - pad;
}

/** Its water: murky green under the surface, going black long before the bottom. */
const WATER: readonly [number, number, number][] = [
  [0x24, 0x3f, 0x30],
  [0x10, 0x24, 0x1b],
  [0x04, 0x0c, 0x09],
];
export function lagoonWater(y: number): string {
  const k = Math.max(0, Math.min(1, y / LD)) * 2;
  const i = Math.min(1, Math.floor(k));
  const t = k - i;
  const a = WATER[i] as [number, number, number];
  const b = WATER[i + 1] as [number, number, number];
  const c = a.map((v, j) => Math.round(v + ((b[j] as number) - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
/** How dark it is round the diver's lamp: dark from the top, nearly black at the bottom. */
export function lagoonDark(y: number): number {
  return Math.min(0.88, 0.5 + (Math.max(0, y) / LD) * 0.38);
}

export const LAGOON_SITE: DiveSite = {
  id: 'lagoon',
  w: LW,
  d: LD,
  entry: LAGOON_ENTRY,
  view: 300,
  keep: keepInLagoon,
  inWater: inLagoonWater,
  bank: true,
  look: {
    water: lagoonWater,
    dark: lagoonDark,
    sky: '#1E3A24',
    snow: 'rgba(170,210,150,.22)',
  },
};

/** The skull key, on the mud in the deepest part, among the broken stones. */
export const SKULL_KEY = { x: 392, y: lagoonFloor(392) - 5 } as const;
/** How near the diver must come to pick it up. */
export const KEY_REACH = 30;

/** What fell in from the ruins: broken columns lying in the mud, one still standing, and a block or two. */
export const LAGOON_STONES: readonly {
  x: number;
  w: number;
  h: number;
  tilt: number;
  kind: 'drum' | 'block';
}[] = [
  { x: 300, w: 54, h: 16, tilt: 0.12, kind: 'drum' },
  { x: 350, w: 18, h: 40, tilt: -0.08, kind: 'block' },
  { x: 430, w: 46, h: 15, tilt: -0.2, kind: 'drum' },
  { x: 470, w: 26, h: 20, tilt: 0.05, kind: 'block' },
  { x: 205, w: 30, h: 18, tilt: 0.3, kind: 'block' },
];
/** Old bones in the mud. */
export const LAGOON_BONES: readonly { x: number; kind: 'ribs' | 'skull' }[] = [
  { x: 170, kind: 'skull' },
  { x: 262, kind: 'ribs' },
  { x: 372, kind: 'skull' },
  { x: 520, kind: 'ribs' },
];
/** The jungle's roots, hanging down into the water along both banks: where each hangs from, and how far down. */
export const LAGOON_ROOTS: readonly { x: number; len: number; ph: number }[] = (() => {
  const r = rng(1123);
  const out: { x: number; len: number; ph: number }[] = [];
  for (let x = 6; x < LW; x += 14 + r() * 18) {
    const edge = Math.min(x, LW - x);
    if (edge > 130) continue;
    out.push({ x, len: 30 + r() * 90 * (1 - edge / 160), ph: r() * 6 });
  }
  return out;
})();

/** What grows in it: dark weed up off the mud, and pale glowing fungus on the banks, lighting the way down a little. */
export function lagoonPlants(seed = 1129): Plant[] {
  const r = rng(seed);
  const out: Plant[] = [];
  for (let x = 30; x < LW - 20; x += 18 + r() * 26) {
    if (Math.abs(x - SKULL_KEY.x) < 26) continue;
    out.push({
      kind: 'kelp',
      x,
      y: lagoonFloor(x),
      from: 'floor',
      h: 26 + r() * 46,
      c: r() < 0.5 ? '#25472F' : '#2F5536',
      glow: false,
      ph: r() * 6,
    });
  }
  for (const x of [40, 120, 180, 248, 330, 455, 515, 570]) {
    out.push({
      kind: 'strand',
      x,
      y: lagoonFloor(x) - 2,
      from: 'floor',
      h: 10 + r() * 10,
      c: r() < 0.6 ? '#9BE07A' : '#5FF3C8',
      glow: true,
      ph: r() * 6,
    });
  }
  return out;
}

/**
 * Where the ten lagoon creatures keep to, spread through the water so they come at the diver a few at a time on the
 * way down: two near the top by the far bank, more in the middle water, three round the key.
 */
export const CREATURE_HOMES: readonly { x: number; y: number }[] = [
  { x: 250, y: 50 },
  { x: 470, y: 60 },
  { x: 160, y: 120 },
  { x: 330, y: 110 },
  { x: 540, y: 120 },
  { x: 230, y: 190 },
  { x: 450, y: 180 },
  { x: 330, y: 240 },
  { x: 410, y: 215 },
  { x: 480, y: 160 },
];
