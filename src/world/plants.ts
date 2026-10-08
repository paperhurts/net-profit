/**
 * Plants, for the kid who wants the game to look richer: flowers in the grass,
 * flowering bushes, tufts of beach grass along the sand, and under the water
 * meadows of sea grass in the shallows and kelp further out, all swaying. They
 * are placed once, from a seed, on both islands, kept off the buildings, the
 * landings, the tower's door and the camp, and out of each other's way. None
 * of them stops the figure: the bushes are knee high and it walks through.
 */
import { rng } from '../core/math';
import { blocked, LANDING, PIER_WALK } from '../entities/walker';
import { BEACH, IR, IX, IY } from './island';
import { CAMP, ISLE2, LANDING2 } from './isle2';
import { DOOR } from './tower';

export type PlantKind = 'flowers' | 'bush' | 'tuft' | 'seagrass' | 'kelp';

export type Plant = {
  kind: PlantKind;
  x: number;
  y: number;
  /** Size in world units. */
  r: number;
  /** Which colour of flower, or shade of leaf. */
  tint: number;
  /** Sway phase. */
  ph: number;
};

/** Flower colours: hibiscus red, frangipani cream, bougainvillea pink, plumeria yellow, lavender. */
export const FLOWER_COLORS = ['#E4573E', '#FFF1D6', '#E86FA8', '#F5C23D', '#A98BD8'] as const;

/** Land plants on dry land are wanted at least this far from anything built. */
export const CLEAR = 14;
/** And this far from where the figure lands, the tower's door and the camp's fire. */
export const KEEP_OFF = 34;

type Isle = {
  x: number;
  y: number;
  r: number;
  /** The grassy middle, where flowers and bushes grow. */
  grass: { x: number; y: number; r: number };
  /** Where not to plant: landings, doors, fires. */
  keep: readonly { x: number; y: number; r: number }[];
};

const HOME: Isle = {
  x: IX,
  y: IY,
  r: IR,
  grass: { x: IX - 25, y: IY - 12, r: 150 },
  keep: [
    { x: LANDING.x, y: LANDING.y, r: KEEP_OFF },
    { x: PIER_WALK.x0, y: (PIER_WALK.y0 + PIER_WALK.y1) / 2, r: KEEP_OFF },
  ],
};
const TWO: Isle = {
  x: ISLE2.x,
  y: ISLE2.y,
  r: ISLE2.r,
  grass: { x: ISLE2.x - 30, y: ISLE2.y + 20, r: 165 },
  keep: [
    { x: LANDING2.x, y: LANDING2.y, r: KEEP_OFF * 1.4 },
    { x: DOOR.x, y: DOOR.y, r: KEEP_OFF },
    { x: CAMP.x, y: CAMP.y, r: 46 },
  ],
};

/** Clear of anything built, by CLEAR all round, at the most built the island gets. */
function clearOfBuildings(x: number, y: number): boolean {
  for (let a = 0; a < 8; a++) {
    const q = (a / 8) * Math.PI * 2;
    if (blocked(x + Math.cos(q) * CLEAR, y + Math.sin(q) * CLEAR, 99)) return false;
  }
  return !blocked(x, y, 99);
}

function clearOfKeep(isle: Isle, x: number, y: number): boolean {
  return isle.keep.every((k) => Math.hypot(x - k.x, y - k.y) > k.r);
}

function farFrom(list: Plant[], x: number, y: number, gap: number): boolean {
  return list.every((p) => Math.hypot(p.x - x, p.y - y) > gap);
}

/** Up to n spots that pass ok, at distance lo..hi from (cx, cy), gap apart. */
function scatter(
  r: () => number,
  n: number,
  cx: number,
  cy: number,
  lo: number,
  hi: number,
  gap: number,
  ok: (x: number, y: number) => boolean,
  make: (x: number, y: number) => Plant,
  out: Plant[],
): void {
  let placed = 0;
  for (let tries = 0; placed < n && tries < n * 60; tries++) {
    const a = r() * Math.PI * 2;
    const d = lo + Math.sqrt(r()) * (hi - lo);
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    if (!ok(x, y) || !farFrom(out, x, y, gap)) continue;
    out.push(make(x, y));
    placed++;
  }
}

function plantIsle(isle: Isle, seed: number, beach?: { x: number; y: number; r: number }): Plant[] {
  const r = rng(seed);
  const out: Plant[] = [];
  const land = (x: number, y: number, margin: number) =>
    Math.hypot(x - isle.x, y - isle.y) <= isle.r - margin &&
    clearOfBuildings(x, y) &&
    clearOfKeep(isle, x, y);
  const inGrass = (x: number, y: number) =>
    Math.hypot(x - isle.grass.x, y - isle.grass.y) < isle.grass.r - 12 && land(x, y, 24);
  const plant =
    (kind: PlantKind, size: number, spread: number, tints: number) =>
    (x: number, y: number): Plant => ({
      kind,
      x,
      y,
      r: size + r() * spread,
      tint: Math.floor(r() * tints),
      ph: r() * Math.PI * 2,
    });
  // Bushes first, so the flowers fill in round them.
  scatter(
    r,
    7,
    isle.grass.x,
    isle.grass.y,
    20,
    isle.grass.r - 14,
    34,
    inGrass,
    plant('bush', 9, 4, FLOWER_COLORS.length),
    out,
  );
  scatter(
    r,
    12,
    isle.grass.x,
    isle.grass.y,
    0,
    isle.grass.r - 14,
    22,
    inGrass,
    plant('flowers', 9, 5, FLOWER_COLORS.length),
    out,
  );
  // Tufts of grass round the sandy edge, between the grass and the water.
  const sand = (x: number, y: number) =>
    land(x, y, 14) && Math.hypot(x - isle.grass.x, y - isle.grass.y) > isle.grass.r - 4;
  scatter(r, 16, isle.x, isle.y, isle.r * 0.6, isle.r - 14, 18, sand, plant('tuft', 7, 3, 3), out);
  if (beach) {
    const onBeach = (x: number, y: number) =>
      Math.hypot(x - beach.x, y - beach.y) < beach.r - 14 && clearOfBuildings(x, y);
    scatter(r, 6, beach.x, beach.y, 10, beach.r - 14, 18, onBeach, plant('tuft', 7, 3, 3), out);
  }
  // Under the water: sea grass close in, kelp further out.
  const water = (x: number, y: number) => Math.hypot(x - isle.x, y - isle.y) > isle.r + 30;
  scatter(
    r,
    22,
    isle.x,
    isle.y,
    isle.r + 45,
    isle.r + 150,
    30,
    water,
    plant('seagrass', 10, 6, 3),
    out,
  );
  scatter(
    r,
    12,
    isle.x,
    isle.y,
    isle.r + 220,
    isle.r + 520,
    70,
    water,
    plant('kelp', 22, 10, 3),
    out,
  );
  return out;
}

export const PLANTS: readonly Plant[] = [...plantIsle(HOME, 61, BEACH), ...plantIsle(TWO, 62)];

/** The plants of one kind. */
export function plantsOf(kind: PlantKind): Plant[] {
  return PLANTS.filter((p) => p.kind === kind);
}
