/**
 * The treasure submarine's sea, the kid's, with the owner's yes (2026-10-13): "a treasure submarine: it dives anywhere
 * in the far deep into the side-on underwater view, with its own fish and treasure". The old man on island 10 sells
 * it. Stopped anywhere out in the far deep's open water, it goes down from under the boat into the dive view, side on.
 *
 * The far deep is cut into patches; each patch has its own sea floor, laid out from its own seed so the same patch is
 * always the same place and the next one along is different: rolling sand at its own depth, with a hill or a hollow
 * somewhere across it; kelp on the shallower rises, fans and strands in the twilight, glowing things down in the dark;
 * silver fish near the top, jellies, and lanternfish, glowing squid and dragonfish lower down where it is deep enough;
 * and three treasures lying on the bottom, each found once a day.
 *
 * The dive scene has its own coordinates, as the trench's: x across, y down from the surface.
 */

import { rng } from '../core/math';
import { DRAGONFISH, GLOW_SQUID } from '../data/tuning';
import type { DiveSite } from './divesite';
import { DEEP, FAR, pastFar, WS } from './island';
import type { Loot, LootKind } from './loot';
import { GLOWS, LANTERN, type Plant, type PlantKind, type Shoal, SUNLIT, TWILIGHT } from './trench';

/** The scene: its width, and the deepest its floor goes. */
export const SUB_W = 1500;
export const SUB_D = 1250;
/** The submarine goes down from under the boat, in the middle. */
export const SUB_ENTRY = SUB_W / 2;
/** The floor never comes up higher than this, so there is always room to go down. */
export const SUB_SHALLOWEST = 400;
/** The far deep is cut into square patches this big. */
export const PATCH = 900;
/** Treasures on each patch's floor. */
export const SUB_LOOT = 3;

/** The patch of sea a point is in, and its seed. */
export function patchAt(x: number, y: number): { key: string; seed: number } {
  const cx = Math.floor(x / PATCH);
  const cy = Math.floor(y / PATCH);
  const seed = (Math.imul(cx + 1000, 73856093) ^ Math.imul(cy + 1000, 19349663)) >>> 0;
  return { key: `${cx},${cy}`, seed };
}

/** Whether the submarine can go down here: out in the far deep, inside the edge of the sea. */
export function subWater(x: number, y: number): boolean {
  const edge = DEEP + FAR - 60;
  return pastFar(x, y) && x > -edge && x < WS + edge && y > -edge && y < WS + edge;
}

/** A patch's sea floor: how deep it is across the scene. */
export function seabed(seed: number): (x: number) => number {
  const r = rng(seed);
  const base = 820 + r() * 320;
  const a1 = 50 + r() * 80;
  const f1 = 0.004 + r() * 0.004;
  const p1 = r() * 6;
  const a2 = 20 + r() * 30;
  const f2 = 0.013 + r() * 0.01;
  const p2 = r() * 6;
  // A hill rising off the bottom, or a hollow going down, somewhere across it.
  const hx = 250 + r() * (SUB_W - 500);
  const hw = 110 + r() * 150;
  const hh = (r() < 0.55 ? 1 : -0.6) * (160 + r() * 240);
  return (x: number) => {
    const y =
      base +
      a1 * Math.sin(x * f1 + p1) +
      a2 * Math.sin(x * f2 + p2) -
      hh * Math.exp(-(((x - hx) / hw) ** 2));
    return Math.max(SUB_SHALLOWEST, Math.min(SUB_D - 20, y));
  };
}

/** A patch's dive site: open water from the surface to its floor, across the scene. */
export function subSite(seed: number): DiveSite {
  const floor = seabed(seed);
  return {
    id: 'sub',
    w: SUB_W,
    d: SUB_D,
    entry: SUB_ENTRY,
    view: 560,
    floor,
    keep(p, pad) {
      p.x = Math.max(pad, Math.min(SUB_W - pad, p.x));
      p.y = Math.max(pad * 0.5, Math.min(floor(p.x) - pad, p.y));
    },
    inWater(x, y, pad = 0) {
      return x > pad && x < SUB_W - pad && y > pad && y < floor(x) - pad;
    },
  };
}

/** What grows on a patch's floor: kelp on the shallow rises, fans and strands in the twilight, glowing things below. */
export function subPlants(seed: number): Plant[] {
  const r = rng(seed + 11);
  const floor = seabed(seed);
  const out: Plant[] = [];
  for (let x = 20; x < SUB_W - 20; x += 26 + r() * 40) {
    const y = floor(x);
    const kelp = y < 560;
    const twilight = y < TWILIGHT;
    const kind: PlantKind = kelp
      ? 'kelp'
      : twilight
        ? r() < 0.65
          ? 'fan'
          : 'strand'
        : ((['tube', 'anemone', 'pen', 'strand'] as const)[Math.floor(r() * 4)] as PlantKind);
    const glow = !kelp && (!twilight || kind === 'strand');
    out.push({
      kind,
      x,
      y,
      from: 'floor',
      h: kelp ? 80 + r() * 90 : 18 + r() * 30,
      c: glow ? (GLOWS[Math.floor(r() * GLOWS.length)] as string) : kelp ? '#3E9E5C' : '#C46A7E',
      glow,
      ph: r() * 6,
    });
  }
  return out;
}

/** What swims over a patch: silver fish up top and jellies always; lanternfish, squid and dragonfish if it is deep. */
export function subShoals(seed: number): Shoal[] {
  const r = rng(seed + 23);
  const floor = seabed(seed);
  const deepest = Math.max(...[0.2, 0.4, 0.6, 0.8].map((k) => floor(SUB_W * k)));
  const at = (k: number) => SUB_W * (0.2 + r() * 0.6) * k + SUB_W * (1 - k) * 0.5;
  const out: Shoal[] = [
    {
      kind: 'silver',
      n: 10 + Math.floor(r() * 8),
      cx: at(1),
      cy: 120 + r() * 120,
      rx: 260,
      ry: 70,
      size: 7,
      c: '#CFE3EA',
      glow: false,
      ph: r() * 6,
      pace: 0.1,
    },
    {
      kind: 'silver',
      n: 8 + Math.floor(r() * 6),
      cx: at(1),
      cy: 240 + r() * 100,
      rx: 220,
      ry: 60,
      size: 6,
      c: '#E6D27A',
      glow: false,
      ph: r() * 6,
      pace: 0.13,
    },
    {
      kind: 'jelly',
      n: 4 + Math.floor(r() * 4),
      cx: at(1),
      cy: SUNLIT + 80 + r() * 120,
      rx: 260,
      ry: 110,
      size: 11,
      c: r() < 0.5 ? '#FF9ED8' : '#9EE6FF',
      glow: true,
      ph: r() * 6,
      pace: 0.05,
    },
  ];
  if (deepest > TWILIGHT + 60)
    out.push({
      kind: 'lantern',
      n: 10 + Math.floor(r() * 6),
      cx: at(1),
      cy: TWILIGHT - 40 + r() * 80,
      rx: 240,
      ry: 70,
      size: 6,
      c: '#5FF3FF',
      glow: true,
      sp: LANTERN,
      ph: r() * 6,
      pace: 0.09,
    });
  if (deepest > 1000)
    out.push({
      kind: 'squid',
      n: 2 + Math.floor(r() * 3),
      cx: at(0.6),
      cy: 960 + r() * 60,
      rx: 160,
      ry: 40,
      size: 13,
      c: '#B98AFF',
      glow: true,
      sp: GLOW_SQUID,
      ph: r() * 6,
      pace: 0.07,
    });
  if (deepest > 1100)
    out.push({
      kind: 'dragon',
      n: 2 + Math.floor(r() * 2),
      cx: at(0.5),
      cy: 1080 + r() * 40,
      rx: 120,
      ry: 25,
      size: 14,
      c: '#1A2238',
      glow: true,
      sp: DRAGONFISH,
      light: '#4FC3FF',
      ph: r() * 6,
      pace: 0.06,
    });
  return out;
}

/** What lies on the bottom, what it is called, and what it is worth. */
const SUB_KINDS: readonly [LootKind, string, number][] = [
  ['chest', 'a treasure chest', 300],
  ['crown', 'a gold crown', 250],
  ['gem', 'a glowing gem', 200],
  ['bell', "a ship's bell", 150],
  ['spyglass', 'an old spyglass', 150],
];

/** A patch's treasure: three on its floor, apart, away from where the submarine goes down. */
export function subLoot(seed: number): Loot[] {
  const r = rng(seed + 37);
  const floor = seabed(seed);
  const out: Loot[] = [];
  for (let tries = 0; out.length < SUB_LOOT && tries < 200; tries++) {
    const x = 60 + r() * (SUB_W - 120);
    if (Math.abs(x - SUB_ENTRY) < 120) continue;
    if (!out.every((l) => Math.abs(l.x - x) > 200)) continue;
    const [kind, name, coins] = SUB_KINDS[Math.floor(r() * SUB_KINDS.length)] as [
      LootKind,
      string,
      number,
    ];
    out.push({ kind, name, x, y: floor(x) - 4, coins, on: 'floor' });
  }
  return out;
}

/** Which of a patch's treasures have been found today: kept a day, at most so many patches. */
export type SubFound = { day: number; patches: Record<string, number> };
export const SUB_PATCHES_KEPT = 120;

export function noSubFound(): SubFound {
  return { day: 0, patches: {} };
}

/** A save's record, kept within range: today's only, a patch's bits no more than its treasures. */
export function parseSubFound(o: unknown): SubFound {
  const f = noSubFound();
  if (!o || typeof o !== 'object') return f;
  const r = o as { day?: unknown; patches?: unknown };
  f.day = Math.max(0, Math.floor(Number(r.day) || 0));
  const p =
    r.patches && typeof r.patches === 'object' ? (r.patches as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(p).slice(0, SUB_PATCHES_KEPT)) {
    if (!/^-?\d+,-?\d+$/.test(k)) continue;
    const bits = Math.floor(Number(v) || 0) & ((1 << SUB_LOOT) - 1);
    if (bits) f.patches[k] = bits;
  }
  return f;
}

/** The submarine, on the old man's shelf. */
export const SUBMARINE = {
  name: 'Treasure submarine',
  price: 6000,
  blurb:
    'It rides on deck. Stop anywhere out in the far deep and dive in it: every patch of sea floor has its own treasure and fish.',
} as const;
