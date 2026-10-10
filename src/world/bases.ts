/**
 * Bases on the other islands, the kid's idea and the husband's backlog in one:
 * each island with a base is built up a stage at a time from its own dock, with
 * driftwood and coins as the palace is at home. The first stage is a hut, and
 * a hut makes the island a home port: when the boat goes down nearer to it than
 * to home, whatever swallowed it spits it out off that island's dock instead of
 * home's. The next stage, a gear shed, opens the island's own way of fishing:
 * island 2's is seining (fishing/seine.ts), and the seine goes everywhere with
 * the boat from then on. Island 2 is the first; the floating town on island 3
 * has a raft kept for its base, and crab pots come with its second stage; the
 * big island, island 6 (charters), comes after them.
 *
 * Later, the kid wants companions to be given jobs at a base. Nothing waits at
 * one yet; a base's stage is one number in the save, and a job would sit beside
 * it there.
 */

import { DOCK2, ISLE2 } from './isle2';
import { DOCK3, ISLE3, PLANK_Z } from './isle3';

export type BaseId = 'isle2' | 'isle3';
export const BASE_IDS: readonly BaseId[] = ['isle2', 'isle3'];

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
  /** Its second building, the same way, and what it keeps: island 2's seine, or island 3's crab pots. */
  shed?: { x: number; y: number; half: number; wall: number; keeps: 'seine' | 'pots' };
  /** What they stand on is this high: the sand, or a raft's planks. */
  z: number;
  /** What the shop says of it once every stage is built. */
  done: string;
  /** Where the boat comes back up when this is the nearest home port: off the dock, facing it. */
  spit: { x: number; y: number; h: number };
  stages: readonly BaseStage[];
};

/** How far off its dock's centre the boat comes back up: as far as home's spot is off home's. */
export const SPIT_OFF = 177;

/** Off a dock along the way it faces, facing back into it. */
function spitOff(dock: { x: number; y: number }, ox: number, oy: number): Base['spit'] {
  return { x: dock.x + ox * SPIT_OFF, y: dock.y + oy * SPIT_OFF, h: Math.atan2(-oy, -ox) };
}

/** Every base's first stage: the hut, and what it makes the island. */
function hutStage(island: string): BaseStage {
  return {
    name: 'hut',
    wood: 30,
    coins: 1500,
    blurb: 'A home port: if your boat goes down nearer here than home, it comes back here.',
    built: `Built your hut on ${island}. It is a home port now: if your boat goes down nearer here than home, it comes back up off this dock.`,
  };
}

export const BASES: readonly Base[] = [
  {
    id: 'isle2',
    island: 'island 2',
    dock: DOCK2,
    // On the open sand beside the tower, on the way up from the landing: in sight from the dock.
    hut: { x: ISLE2.x + 40, y: ISLE2.y - 150, half: 14, wall: 18 },
    // Between the hut and the tower, clear of the way round either.
    shed: { x: ISLE2.x - 5, y: ISLE2.y - 102, half: 12, wall: 15, keeps: 'seine' },
    z: 0,
    done: 'A home port, and the gear shed that keeps your seine.',
    // Its dock faces home, up and to the right.
    spit: spitOff(DOCK2, Math.SQRT1_2, -Math.SQRT1_2),
    stages: [
      hutStage('island 2'),
      {
        name: 'gear shed',
        wood: 50,
        coins: 3000,
        blurb: 'Opens seining: a seine and a buoy for your boat, to loop round a whole school.',
        built:
          'Built the gear shed on island 2. Your boat carries a seine now: at sea, tap the buoy button to drop it, drive a loop round a school, and come back to the buoy to close it.',
      },
    ],
  },
  {
    id: 'isle3',
    island: 'island 3',
    dock: DOCK3,
    // On the base raft (world/isle3.ts), at its far end from the walk out to it.
    hut: { x: ISLE3.x + 120, y: ISLE3.y - 120, half: 12, wall: 16 },
    // Beside it, toward the walk, clear of the hut's flagpole behind them.
    shed: { x: ISLE3.x + 154, y: ISLE3.y - 112, half: 10, wall: 13, keeps: 'pots' },
    z: PLANK_Z,
    done: 'A home port, and the crab shed that keeps your pots.',
    // Its jetty points along x.
    spit: spitOff(DOCK3, 1, 0),
    stages: [
      hutStage('island 3'),
      {
        name: 'crab shed',
        wood: 50,
        coins: 3000,
        blurb:
          'Opens crab pots: three pots to drop in home water and come back to, full of spider crabs.',
        built:
          'Built the crab shed on island 3. Your boat carries three crab pots now: in home water, tap the crab button to drop one, and come back past it later for the crabs.',
      },
    ],
  },
];

/** Island 2's stage that opens seining. */
export const SEINE_STAGE = 2;

/** Whether the boat has a seine: island 2's gear shed is built. */
export function hasSeine(bases: Bases): boolean {
  return bases.isle2 >= SEINE_STAGE;
}

/** Island 3's stage that opens crab pots. */
export const POTS_STAGE = 2;

/** Whether the boat has crab pots: island 3's crab shed is built. */
export function hasPots(bases: Bases): boolean {
  return bases.isle3 >= POTS_STAGE;
}

/** How far each base is built: 0 for nothing yet, then a stage at a time. */
export type Bases = Record<BaseId, number>;

export function noBases(): Bases {
  return { isle2: 0, isle3: 0 };
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
