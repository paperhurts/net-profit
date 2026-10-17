/**
 * The abyss, the kid's 1,000-metre dive at the farthest far buoys (his sixth list: "a dive that goes 1,000 metres
 * down, small on top"; the farthest far buoys being the white ones already in the game, it lies out past them, in the
 * far far sea with island 11). A blue hole: from the boat, a round patch of the brightest blue on the open sea with a
 * small dark middle. Under it, a shelf of pale reef with a hole through it barely wider than the cage, and under that
 * the hole opens into the dark and goes down and down, to a floor of black sand 1,000 metres below the boat.
 *
 * The owner's calls (2026-10-17): you go down in a dive cage on the boat's rope, past the sunlit, twilight and midnight
 * water, breathing from the boat while in it, and step out at the bottom with the scuba gear; the giants of the deep
 * pass the cage on the way, and the deep fish and the Remoro live on the floor (the next pieces).
 *
 * Its scene has its own coordinates, as the other dives do: x across, y down from the surface, METRES to a metre.
 */

import { rng } from '../core/math';
import { GIANT_SQUID } from '../data/tuning';
import type { DiveSite } from './divesite';
import { ISLE11 } from './isle11';
import { type DeepKind, GLOWS, LANTERN, type Plant, type PlantKind, type Shoal } from './trench';

/** Where it is: out past the white buoys, 1,500 west of island 11 in the far far sea's north, too far out to be seen
 * from behind them, and well off the way in to island 11, where the far far sea and the crow have their say; how big
 * its dark middle is, where the boat stops to dive; and how near the boat must come to see it and be told what it is. */
export const ABYSS = { x: ISLE11.x - 1500, y: ISLE11.y + 20, r: 60 } as const;
export const ABYSS_SIGHT = 700;
/** The bright blue round its dark middle, on the sea. */
export const ABYSS_SHELF_R = 150;

/** The scene: its width, the depth of its floor, scene units to a metre, and where the boat's rope goes down. */
export const AW = 1000;
export const AD = 3000;
export const METRES = 3;
export const ABYSS_ENTRY = AW / 2;
/** The reef shelf, from its top to its underside, and half the width of the hole through it. */
export const SHELF_TOP = 170;
export const SHELF_BOT = 330;
export const HOLE = 56;
/** Below the shelf the hole widens until, this deep, it is open water from side to side. */
export const WALL_END = 960;
/** How far up off the floor the diver swims, out of the cage. */
export const FLOOR_ROOM = 700;
/** Where the cage rests on the floor, its middle; and its size, which the diver fits in. */
export const CAGE_REST = AD - 64;
export const CAGE_W = 48;
export const CAGE_H = 64;

/** Half the width of the hole at a depth: the hole through the shelf, then the dark widening under it. */
export function holeHalf(y: number): number {
  if (y <= SHELF_BOT) return HOLE;
  const k = Math.min(1, (y - SHELF_BOT) / (WALL_END - SHELF_BOT));
  return HOLE + (AW / 2 + 80 - HOLE) * k ** 1.6;
}

/** The black sand's depth across the floor: low dunes, and a rise on either side. */
export function abyssFloor(x: number): number {
  const u = x / AW;
  return (
    AD -
    34 -
    Math.sin(x * 0.011) * 14 -
    Math.sin(x * 0.029 + 1) * 7 -
    (u < 0.12 || u > 0.88 ? 30 : 0)
  );
}

/** Whether a point is in the abyss's water, with this much room round it: not in the shelf or the hole's walls, and
 * over the floor. */
export function inAbyssWater(x: number, y: number, pad = 0): boolean {
  if (x < pad || x > AW - pad || y < pad * 0.5 || y > abyssFloor(x) - pad) return false;
  if (y < SHELF_TOP - pad || y > WALL_END) return true;
  return Math.abs(x - ABYSS_ENTRY) < holeHalf(y) - pad;
}

/** Keep the diver, out of the cage, in the open water over the floor: it swims there, and the cage brings it home. */
export function keepInAbyss(p: { x: number; y: number }, pad: number): void {
  p.x = Math.max(pad, Math.min(AW - pad, p.x));
  p.y = Math.max(AD - FLOOR_ROOM, Math.min(abyssFloor(p.x) - pad, p.y));
}

/** Its water: the blue hole's brightest blue at the top, deep blue in the hole, then black long before the floor. */
const WATER: readonly [number, number, number, number][] = [
  [0, 0x3f, 0xc6, 0xd8],
  [SHELF_TOP, 0x2a, 0x9f, 0xc0],
  [SHELF_BOT, 0x1a, 0x5f, 0x96],
  [WALL_END, 0x0a, 0x23, 0x46],
  [1800, 0x04, 0x0c, 0x1c],
  [AD, 0x02, 0x06, 0x0e],
];
export function abyssWater(y: number): string {
  let i = 1;
  while (i < WATER.length - 1 && y > (WATER[i] as readonly [number, number, number, number])[0])
    i++;
  const [ya, ...a] = WATER[i - 1] as readonly [number, number, number, number];
  const [yb, ...b] = WATER[i] as readonly [number, number, number, number];
  const t = Math.max(0, Math.min(1, (y - ya) / (yb - ya)));
  const c = a.map((v, j) => Math.round(v + ((b[j] as number) - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
/** How dark round the diver's lamp: none over the shelf, closing in down the hole, all but black below. */
export function abyssDark(y: number): number {
  return Math.max(0, Math.min(0.9, ((y - 260) / (1300 - 260)) * 0.9));
}

export const ABYSS_SITE: DiveSite = {
  id: 'abyss',
  w: AW,
  d: AD,
  entry: ABYSS_ENTRY,
  view: 440,
  keep: keepInAbyss,
  inWater: inAbyssWater,
  cage: CAGE_REST,
  metres: METRES,
  // The floor is where the diver plays: up the screen, clear of the buttons along the bottom.
  below: 150,
  look: {
    water: abyssWater,
    dark: abyssDark,
    sky: '#CFEFF6',
    snow: 'rgba(220,240,255,.3)',
    shafts: true,
  },
};

/** What grows: coral and sea fans on the shelf's top, fans and glowing strands down the hole, and a glowing garden
 * across the floor, all from one seed. */
export function abyssPlants(seed = 1000): Plant[] {
  const r = rng(seed);
  const out: Plant[] = [];
  // On the shelf's top, either side of the hole.
  for (let x = 20; x < AW - 20; x += 26 + r() * 34) {
    if (Math.abs(x - ABYSS_ENTRY) < HOLE + 14) continue;
    const kelp = r() < 0.35;
    out.push({
      kind: kelp ? 'kelp' : 'fan',
      x,
      y: SHELF_TOP,
      from: 'floor',
      h: kelp ? 50 + r() * 50 : 16 + r() * 22,
      c: kelp
        ? '#3E9E5C'
        : ((['#E07A8C', '#F2B24A', '#C46A7E'] as const)[Math.floor(r() * 3)] as string),
      glow: false,
      ph: r() * 6,
    });
  }
  // Down the hole's walls, either side.
  for (let y = SHELF_TOP + 30; y < WALL_END - 60; y += 40 + r() * 40) {
    const side: -1 | 1 = r() < 0.5 ? -1 : 1;
    const deep = y > SHELF_BOT + 120;
    out.push({
      kind: deep ? 'strand' : 'fan',
      x: ABYSS_ENTRY + side * holeHalf(y),
      y,
      from: side,
      h: 14 + r() * 22,
      c: deep ? (GLOWS[Math.floor(r() * GLOWS.length)] as string) : '#C46A7E',
      glow: deep,
      ph: r() * 6,
    });
  }
  // Across the floor, glowing.
  for (let x = 16; x < AW - 16; x += 20 + r() * 30) {
    out.push({
      kind: (['tube', 'anemone', 'pen', 'tube'] as const)[Math.floor(r() * 4)] as PlantKind,
      x,
      y: abyssFloor(x),
      from: 'floor',
      h: 16 + r() * 34,
      c: GLOWS[Math.floor(r() * GLOWS.length)] as string,
      glow: true,
      ph: r() * 6,
    });
  }
  return out;
}

/** What swims: silver fish over the shelf, jellies in the hole, lanternfish in the dark on the way down and over the
 * floor, and over the floor, where the spear reaches, the kid's ten deep fish (data/tuning.ts ABYSS_FISH). */
export function abyssShoals(): Shoal[] {
  // A deep fish's shoal over the floor: what it is, how many, where across and how high, how big, its colour and light.
  const deep = (
    kind: DeepKind,
    sp: number,
    n: number,
    cx: number,
    up: number,
    size: number,
    c: string,
    light?: string,
  ): Shoal => ({
    kind: 'deep',
    deep: kind,
    n,
    cx,
    cy: AD - up,
    rx: 140,
    ry: 26,
    size,
    c,
    glow: !!light,
    sp,
    ...(light ? { light } : {}),
    ph: sp * 0.9,
    pace: 0.05 + (sp % 3) * 0.01,
  });
  return [
    {
      kind: 'silver',
      n: 16,
      cx: AW * 0.4,
      cy: 90,
      rx: 300,
      ry: 50,
      size: 7,
      c: '#CFE3EA',
      glow: false,
      ph: 0,
      pace: 0.1,
    },
    {
      kind: 'silver',
      n: 10,
      cx: AW * 0.62,
      cy: 130,
      rx: 220,
      ry: 30,
      size: 6,
      c: '#E6D27A',
      glow: false,
      ph: 2,
      pace: 0.13,
    },
    {
      kind: 'jelly',
      n: 6,
      cx: ABYSS_ENTRY,
      cy: 640,
      rx: 160,
      ry: 180,
      size: 11,
      c: '#FF9ED8',
      glow: true,
      ph: 1,
      pace: 0.05,
    },
    {
      kind: 'lantern',
      n: 14,
      cx: ABYSS_ENTRY,
      cy: 1600,
      rx: 300,
      ry: 260,
      size: 6,
      c: '#5FF3FF',
      glow: true,
      ph: 3,
      pace: 0.07,
    },
    {
      kind: 'lantern',
      n: 10,
      cx: AW * 0.5,
      cy: AD - 560,
      rx: 330,
      ry: 50,
      size: 6,
      c: '#5FF3FF',
      glow: true,
      sp: LANTERN,
      ph: 4,
      pace: 0.06,
    },
    // The kid's deep fish, over the floor, each kind keeping to its own height.
    {
      kind: 'gsquid',
      n: 2,
      cx: AW * 0.5,
      cy: AD - 470,
      rx: 300,
      ry: 30,
      size: 22,
      c: '#3FCFC0',
      glow: true,
      sp: GIANT_SQUID,
      light: '#5FF3E0',
      ph: 1.3,
      pace: 0.04,
    },
    deep('loosejaw', 31, 3, AW * 0.3, 400, 9, '#1A1418', '#FF3B3B'),
    deep('frilled', 36, 2, AW * 0.7, 380, 18, '#5A4636'),
    deep('viper', 32, 3, AW * 0.62, 320, 9, '#23303A', '#9FE8FF'),
    deep('owl', 33, 3, AW * 0.22, 300, 7, '#C9C0B4'),
    deep('nibbler', 30, 5, AW * 0.45, 260, 5, '#8A5A34'),
    deep('coelacanth', 35, 2, AW * 0.75, 230, 18, '#2E4E7A'),
    deep('clown', 29, 4, AW * 0.35, 200, 6, '#F2762E'),
    deep('chimaera', 34, 2, AW * 0.58, 160, 14, '#B8C2CC'),
    deep('gloomer', 28, 3, AW * 0.3, 140, 13, '#6B4A7A', '#FF7AB8'),
  ];
}

/** Whether the boat is over the abyss's dark middle, near enough to dive; and near enough to see it. */
export function overAbyss(x: number, y: number): boolean {
  return Math.hypot(x - ABYSS.x, y - ABYSS.y) < ABYSS.r * 1.5;
}
export function nearAbyss(x: number, y: number): boolean {
  return Math.hypot(x - ABYSS.x, y - ABYSS.y) < ABYSS_SHELF_R + ABYSS_SIGHT;
}
