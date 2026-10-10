/**
 * Bases on the other islands, the kid's idea and the husband's backlog in one:
 * each island with a base is built up a stage at a time from its own dock, with
 * driftwood and coins as the palace is at home. The first stage is a hut, and
 * a hut makes the island a home port: when the boat goes down nearer to it than
 * to home, whatever swallowed it spits it out off that island's dock instead of
 * home's. The next stage opens the island's own way of fishing (island 2's is
 * seining, still to come). Island 2 is the first; the floating town on island 3
 * (crab pots) and the big island, island 6 (charters), come after it.
 *
 * Later, the kid wants companions to be given jobs at a base. Nothing waits at
 * one yet; a base's stage is one number in the save, and a job would sit beside
 * it there.
 */

import { DOCK2, ISLE2 } from './isle2';

export type BaseId = 'isle2';
export const BASE_IDS: readonly BaseId[] = ['isle2'];

/** One stage of a base: what it is called, what it costs, and what the shop says before and after. */
export type BaseStage = { name: string; wood: number; coins: number; blurb: string; built: string };

export type Base = {
  id: BaseId;
  /** The island's name as the shop says it. */
  island: string;
  /** The dock it is built from: the shop shows its card only in this ring. */
  dock: { x: number; y: number; r: number };
  /** The hut: its centre, the half width of its footprint, and the height of its walls. */
  hut: { x: number; y: number; half: number; wall: number };
  /** Where the boat comes back up when this is the nearest home port: off the dock, facing it. */
  spit: { x: number; y: number; h: number };
  stages: readonly BaseStage[];
};

/** How far off its dock's centre the boat comes back up: as far as home's spot is off home's. */
export const SPIT_OFF = 177;

/** Island 2's way home, the way its dock faces. */
const OUT2 = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };

export const BASES: readonly Base[] = [
  {
    id: 'isle2',
    island: 'island 2',
    dock: DOCK2,
    // On the open sand beside the tower, on the way up from the landing: in sight from the dock.
    hut: { x: ISLE2.x + 40, y: ISLE2.y - 150, half: 14, wall: 18 },
    spit: {
      x: DOCK2.x + OUT2.x * SPIT_OFF,
      y: DOCK2.y + OUT2.y * SPIT_OFF,
      h: Math.atan2(-OUT2.y, -OUT2.x),
    },
    stages: [
      {
        name: 'hut',
        wood: 30,
        coins: 1500,
        blurb: 'A home port: if your boat goes down nearer here than home, it comes back here.',
        built:
          'Built your hut on island 2. It is a home port now: if your boat goes down nearer here than home, it comes back up off this dock.',
      },
    ],
  },
];

/** How far each base is built: 0 for nothing yet, then a stage at a time. */
export type Bases = Record<BaseId, number>;

export function noBases(): Bases {
  return { isle2: 0 };
}

/** The stages from a save, each missing or broken one read as nothing built, and none past the last. */
export function parseBases(o: unknown): Bases {
  const d = noBases();
  if (!o || typeof o !== 'object') return d;
  const r = o as Record<string, unknown>;
  for (const b of BASES) {
    const v = r[b.id];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0)
      d[b.id] = Math.min(b.stages.length, Math.floor(v));
  }
  return d;
}

/** The foot of the hut's flagpole, off its back corner on the dock's side. */
export function polePoint(b: Base): { x: number; y: number } {
  const { x, y, half } = b.hut;
  return { x: x + half + 6, y: y - half - 4 };
}

/** The base whose dock ring a point is in, if any. */
export function baseAtDock(x: number, y: number): Base | null {
  for (const b of BASES) if (Math.hypot(x - b.dock.x, y - b.dock.y) < b.dock.r) return b;
  return null;
}

/** The next stage to build at a base, or null when it is finished. */
export function nextStage(b: Base, bases: Bases): BaseStage | null {
  return b.stages[bases[b.id]] ?? null;
}

/**
 * Where the boat comes back up after going down at (x, y): the nearest base with its hut built, if
 * one is nearer than home's dock; otherwise null, and it comes back at home as it always has.
 */
export function homePort(
  bases: Bases,
  x: number,
  y: number,
  home: { x: number; y: number },
): Base | null {
  let best: Base | null = null;
  let bd = Math.hypot(x - home.x, y - home.y);
  for (const b of BASES) {
    if (bases[b.id] < 1) continue;
    const d = Math.hypot(x - b.dock.x, y - b.dock.y);
    if (d < bd) {
      best = b;
      bd = d;
    }
  }
  return best;
}
