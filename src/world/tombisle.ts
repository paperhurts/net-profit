/**
 * Tomb Island, the kid's "Undead Island" (his four drawings and his answers of 2026-11-08, in project.md under his
 * lists): "big big big", in the deep, a maze under fog with a way in and a way out, its walls "Stone with tombs ON THE
 * WALLS", graves and rows of tombstones, coffins, and a castle in the middle where the necromancer lives. The owner's
 * go of 8 November: "tomb island first".
 *
 * This is its first piece, the place: the island in its fog bank, a jetty to tie up at, and ashore the stone maze with
 * tombs set into its walls, a way in and a way out, graves along its corridors, stone coffins in its dead ends, and in
 * the middle a square of rows of tombstones round the castle, its door shut. Nothing lives there yet.
 *
 * Where: every corner of the deep is taken, so it stands on the deep's west side, halfway between islands 3 and 2,
 * as big as fits there with water on both sides (my pick, hers to change: TOMB_ISLE is the one constant to move).
 *
 * Its frame is the world's, shifted to its middle (u along x, v along y), so the maze's walls stay square to the
 * world, as every building's do, and read as the iso diamonds the rest of the game is drawn in.
 */
import { rng } from '../core/math';
import { DEEP, IY, type Point } from './island';

/** Its middle, and how far out its shore can reach. */
export const TOMB_ISLE = { x: -DEEP / 2, y: IY, r: 480 } as const;

export const toTomb = (x: number, y: number): [number, number] => [
  x - TOMB_ISLE.x,
  y - TOMB_ISLE.y,
];
export const fromTomb = (u: number, v: number): Point => [TOMB_ISLE.x + u, TOMB_ISLE.y + v];

/** Its waterline, at an angle round its middle: a rough round of rock and grey sand, never past TOMB_ISLE.r. */
export function shoreR16(a: number): number {
  return 460 + 10 * Math.sin(5 * a + 1) + 6 * Math.sin(9 * a + 0.4);
}
/** How far in from the waterline the figure can walk. */
export const SHORE_IN16 = 12;

/* ---------- the maze ---------- */

/** One cell of the maze, wall line to wall line, and how many across the grid is; the middle cell is (MID, MID). */
export const CELL = 56;
export const GRID = 15;
export const MID = (GRID - 1) / 2;
/** Cells whose middles lie this near the island's middle are the maze. */
export const MAZE_R = 370;
/** The square in the middle, PLAZA cells out from the middle cell every way: open ground round the castle. */
export const PLAZA = 2;
/** A wall's half thickness, and its height; the stone posts at its corners, half as wide and as tall. */
export const WALL_T = 6;
export const WALL_H = 18;
export const POST_T = 8;
export const POST_H = 22;
/** How far round a wall, post, coffin or the castle the figure is kept. */
export const PAD16 = 4;

/** A cell's middle in the island's frame. */
export const cellU = (i: number): number => (i - MID) * CELL;
/** The wall line k (0..GRID) in the island's frame: the near side of cell k. */
export const lineU = (k: number): number => (k - MID - 0.5) * CELL;

const inPlaza = (i: number, j: number) => Math.abs(i - MID) <= PLAZA && Math.abs(j - MID) <= PLAZA;
const inGrid = (i: number, j: number) => i >= 0 && j >= 0 && i < GRID && j < GRID;
/** Whether cell (i, j) is a corridor of the maze (not the square in the middle, not outside). */
export function isMaze(i: number, j: number): boolean {
  return inGrid(i, j) && !inPlaza(i, j) && Math.hypot(cellU(i), cellU(j)) <= MAZE_R;
}
/** Whether cell (i, j) is inside the outer wall at all: the maze or the square. */
const isInside = (i: number, j: number) => inGrid(i, j) && (inPlaza(i, j) || isMaze(i, j));

/** The maze's own seed: the same maze every time, for every player. */
export const MAZE_SEED = 1608;

/**
 * The walls. `vert[k][j]` is the wall along x = lineU(k) beside cell row j (between cells k-1 and k); `horz[i][l]` the
 * wall along y = lineU(l) beside cell column i (between cells l-1 and l).
 */
export type Maze = {
  vert: boolean[][];
  horz: boolean[][];
  /** The way in (toward the jetty, +v) and the way out (the far side, -v): the cell, and its gap in the outer wall. */
  wayIn: { i: number; j: number };
  wayOut: { i: number; j: number };
  /** The gap from the maze into the square: the maze cell outside it. */
  gate: { i: number; j: number };
  /** Every dead end: a corridor cell with one way out of it. */
  deadEnds: { i: number; j: number; open: 'n' | 's' | 'e' | 'w' }[];
};

/** Lay out the maze: every corridor joined to every other by exactly one way, carved from the way in. */
export function buildMaze(seed = MAZE_SEED): Maze {
  const R = rng(seed);
  const vert = Array.from({ length: GRID + 1 }, () => Array<boolean>(GRID).fill(false));
  const horz = Array.from({ length: GRID }, () => Array<boolean>(GRID + 1).fill(false));
  // Every edge of a cell inside the outer wall starts as a wall, except between two cells of the square.
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      if (!isInside(i, j)) continue;
      const wallTo = (a: number, b: number) => !(inPlaza(i, j) && inGrid(a, b) && inPlaza(a, b));
      if (wallTo(i - 1, j)) (vert[i] as boolean[])[j] = true;
      if (wallTo(i + 1, j)) (vert[i + 1] as boolean[])[j] = true;
      if (wallTo(i, j - 1)) (horz[i] as boolean[])[j] = true;
      if (wallTo(i, j + 1)) (horz[i] as boolean[])[j + 1] = true;
    }
  let jMax = MID;
  let jMin = MID;
  for (let j = 0; j < GRID; j++)
    if (isMaze(MID, j)) {
      jMax = Math.max(jMax, j);
      jMin = Math.min(jMin, j);
    }
  const wayIn = { i: MID, j: jMax };
  const wayOut = { i: MID, j: jMin };
  const gate = { i: MID, j: MID - PLAZA - 1 };
  // Carve: a walk from the way in that goes on to a cell it has not been to, and backs up when there is none.
  const seen = new Set<number>();
  const key = (i: number, j: number) => i * GRID + j;
  const stack: [number, number][] = [[wayIn.i, wayIn.j]];
  seen.add(key(wayIn.i, wayIn.j));
  while (stack.length) {
    const [i, j] = stack[stack.length - 1] as [number, number];
    const next = (
      [
        [i + 1, j],
        [i - 1, j],
        [i, j + 1],
        [i, j - 1],
      ] as [number, number][]
    ).filter(([a, b]) => isMaze(a, b) && !seen.has(key(a, b)));
    if (!next.length) {
      stack.pop();
      continue;
    }
    const [a, b] = next[Math.floor(R() * next.length)] as [number, number];
    if (a !== i) (vert[Math.max(a, i)] as boolean[])[j] = false;
    else (horz[i] as boolean[])[Math.max(b, j)] = false;
    seen.add(key(a, b));
    stack.push([a, b]);
  }
  // The gaps: the way in through the outer wall toward the jetty, the way out on the far side, and into the square.
  (horz[wayIn.i] as boolean[])[wayIn.j + 1] = false;
  (horz[wayOut.i] as boolean[])[wayOut.j] = false;
  (horz[gate.i] as boolean[])[gate.j + 1] = false;
  const deadEnds: Maze['deadEnds'] = [];
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      if (!isMaze(i, j)) continue;
      const open = {
        w: !vert[i]?.[j],
        e: !vert[i + 1]?.[j],
        n: !horz[i]?.[j],
        s: !horz[i]?.[j + 1],
      };
      const ways = (Object.keys(open) as ('n' | 's' | 'e' | 'w')[]).filter((k) => open[k]);
      if (ways.length === 1) deadEnds.push({ i, j, open: ways[0] as 'n' | 's' | 'e' | 'w' });
    }
  return { vert, horz, wayIn, wayOut, gate, deadEnds };
}

export const MAZE16: Maze = buildMaze();

/** Whether a stone post stands at grid corner (k, l): wherever any wall meets it. */
export function postAt(k: number, l: number, m: Maze = MAZE16): boolean {
  return !!(m.vert[k]?.[l - 1] || m.vert[k]?.[l] || m.horz[k - 1]?.[l] || m.horz[k]?.[l]);
}

/** A box on the ground in the world, and the depth it is drawn at: its middle's x + y. */
export type Box16 = { x0: number; y0: number; x1: number; y1: number; d: number };
const boxAt = (u0: number, v0: number, u1: number, v1: number): Box16 => {
  const [x0, y0] = fromTomb(u0, v0);
  const [x1, y1] = fromTomb(u1, v1);
  return { x0, y0, x1, y1, d: (x0 + x1) / 2 + (y0 + y1) / 2 };
};

/** A wall from post to post: which way it runs, its line and its cell, its box, and its stretch's look (0..5). */
export type Wall16 = Box16 & { along: 'x' | 'y'; k: number; j: number; look: number };
/** A stone post at a corner. */
export type Post16 = Box16 & { k: number; l: number };

function wallsOf(m: Maze): { walls: Wall16[]; posts: Post16[] } {
  const walls: Wall16[] = [];
  const posts: Post16[] = [];
  const look = (a: number, b: number) =>
    Math.floor(((((Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1) + 1) % 1) * 6);
  for (let k = 0; k <= GRID; k++)
    for (let j = 0; j < GRID; j++)
      if (m.vert[k]?.[j])
        walls.push({
          ...boxAt(lineU(k) - WALL_T, lineU(j) + POST_T, lineU(k) + WALL_T, lineU(j + 1) - POST_T),
          along: 'y',
          k,
          j,
          look: look(k, j + 40),
        });
  for (let i = 0; i < GRID; i++)
    for (let l = 0; l <= GRID; l++)
      if (m.horz[i]?.[l])
        walls.push({
          ...boxAt(lineU(i) + POST_T, lineU(l) - WALL_T, lineU(i + 1) - POST_T, lineU(l) + WALL_T),
          along: 'x',
          k: l,
          j: i,
          look: look(i + 80, l),
        });
  for (let k = 0; k <= GRID; k++)
    for (let l = 0; l <= GRID; l++)
      if (postAt(k, l, m))
        posts.push({
          ...boxAt(lineU(k) - POST_T, lineU(l) - POST_T, lineU(k) + POST_T, lineU(l) + POST_T),
          k,
          l,
        });
  return { walls, posts };
}
const BUILT = wallsOf(MAZE16);
export const WALLS16: readonly Wall16[] = BUILT.walls;
export const POSTS16: readonly Post16[] = BUILT.posts;

/** The posts either side of the way in and the way out stand taller, a skull on each, and a sign by each. */
export const GATE_H = 34;
export const WAY_IN16 = { u: cellU(MAZE16.wayIn.i), v: lineU(MAZE16.wayIn.j + 1) } as const;
export const WAY_OUT16 = { u: cellU(MAZE16.wayOut.i), v: lineU(MAZE16.wayOut.j) } as const;
export const GATE_POSTS16: readonly Post16[] = POSTS16.filter(
  (p) =>
    (p.l === MAZE16.wayIn.j + 1 || p.l === MAZE16.wayOut.j) &&
    (p.k === MAZE16.wayIn.i || p.k === MAZE16.wayIn.i + 1),
);

/* ---------- the castle and the square round it ---------- */

/** The castle in the middle: its half width, its walls' height, its corner towers' half width and height. */
export const CASTLE16 = { half: 58, h: 56, tower: 15, towerH: 84 } as const;
export const CASTLE16_BOX: Box16 = boxAt(
  -CASTLE16.half,
  -CASTLE16.half,
  CASTLE16.half,
  CASTLE16.half,
);
/** Its great door, shut, in its face toward the bottom of the screen and the way in; where the figure stands at it. */
export const CASTLE16_DOOR = (() => {
  const [x, y] = fromTomb(0, CASTLE16.half + 12);
  return { x, y };
})();

/** A tombstone: where it stands, which way it leans, and its shape (0 round-topped, 1 a cross, 2 a slab). */
export type Stone16 = { x: number; y: number; lean: number; kind: number };
/** How near a tombstone the figure can stand. */
export const STONE_R = 5;

/**
 * The rows of tombstones round the castle ("with rows of tombstones round it"), in a ring halfway between its walls and
 * the square's, a gap left in the middle of each side to walk through; and two rows each side of the way up from the
 * jetty to the way in.
 */
export const STONES16: readonly Stone16[] = (() => {
  const out: Stone16[] = [];
  const add = (u: number, v: number, n: number) => {
    const [x, y] = fromTomb(u, v);
    out.push({ x, y, lean: Math.sin(n * 2.7) * 0.16, kind: n % 3 });
  };
  const ring = 97;
  let n = 0;
  const along = [25, 49, 73, 97].flatMap((s) => [-s, s]);
  for (const s of along) {
    add(s, -ring, n++);
    add(s, ring, n++);
    if (Math.abs(s) < ring) {
      add(-ring, s, n++);
      add(ring, s, n++);
    }
  }
  const v0 = WAY_IN16.v + 26;
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 3; c++) {
      add(-40 - c * 24, v0 + r * 26, n++);
      add(40 + c * 24, v0 + r * 26, n++);
    }
  return out;
})();

/* ---------- graves and coffins in the maze ---------- */

/**
 * A grave along a corridor: a mound of earth with a headstone at its head against a wall. Only the headstone is in
 * the way; the mound is walked over. Every so often a corridor cell with a wall on its far side has one.
 */
export type Grave16 = {
  x: number;
  y: number;
  hx: number;
  hy: number;
  along: 'x' | 'y';
  lean: number;
};
export const GRAVES16: readonly Grave16[] = (() => {
  const out: Grave16[] = [];
  const m = MAZE16;
  let n = 0;
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      if (!isMaze(i, j) || (i * 7 + j * 3) % 5 !== 0) continue;
      if (m.deadEnds.some((d) => d.i === i && d.j === j)) continue;
      const u = cellU(i);
      const v = cellU(j);
      // Its head against the wall on the far side of the cell (up the screen), so the stone faces the viewer.
      if (m.horz[i]?.[j]) {
        const [x, y] = fromTomb(u, v - 6);
        const [hx, hy] = fromTomb(u, lineU(j) + WALL_T + 5);
        out.push({ x, y, hx, hy, along: 'y', lean: Math.sin(n++ * 1.9) * 0.15 });
      } else if (m.vert[i]?.[j]) {
        const [x, y] = fromTomb(u - 6, v);
        const [hx, hy] = fromTomb(lineU(i) + WALL_T + 5, v);
        out.push({ x, y, hx, hy, along: 'x', lean: Math.sin(n++ * 1.9) * 0.15 });
      }
    }
  return out;
})();

/** A stone coffin, its lid shut, at the closed end of a dead end, lying along it: its box, and which way it opens. */
export type Coffin16 = Box16 & { along: 'x' | 'y'; i: number; j: number };
/** A coffin's half length and half width. */
export const COFFIN_L = 14;
export const COFFIN_W = 7;
/** How many steps along the maze's corridors each corridor cell is from the way in. */
export function stepsFromWayIn(m: Maze = MAZE16): Map<number, number> {
  const out = new Map<number, number>();
  const key = (i: number, j: number) => i * GRID + j;
  const todo: [number, number][] = [[m.wayIn.i, m.wayIn.j]];
  out.set(key(m.wayIn.i, m.wayIn.j), 0);
  while (todo.length) {
    const [i, j] = todo.shift() as [number, number];
    const d = out.get(key(i, j)) as number;
    const ways: [number, number, boolean][] = [
      [i - 1, j, !m.vert[i]?.[j]],
      [i + 1, j, !m.vert[i + 1]?.[j]],
      [i, j - 1, !m.horz[i]?.[j]],
      [i, j + 1, !m.horz[i]?.[j + 1]],
    ];
    for (const [a, b, open] of ways)
      if (open && isMaze(a, b) && !out.has(key(a, b))) {
        out.set(key(a, b), d + 1);
        todo.push([a, b]);
      }
  }
  return out;
}

/**
 * The lever that clears the fog (part two, the kid's "A maze to lever"): in the dead end furthest from the way in along
 * the corridors, against its closed end, a green lamp on top that shows through the fog. It stands in the way; the
 * figure pulls it from in front.
 */
export const LEVER16 = (() => {
  const steps = stepsFromWayIn();
  let best = MAZE16.deadEnds[0] as Maze['deadEnds'][number];
  for (const d of MAZE16.deadEnds)
    if ((steps.get(d.i * GRID + d.j) ?? 0) > (steps.get(best.i * GRID + best.j) ?? 0)) best = d;
  const back = CELL / 2 - WALL_T - 8;
  const du = best.open === 'e' ? -back : best.open === 'w' ? back : 0;
  const dv = best.open === 's' ? -back : best.open === 'n' ? back : 0;
  const [x, y] = fromTomb(cellU(best.i) + du, cellU(best.j) + dv);
  const [fx, fy] = fromTomb(cellU(best.i) + du * 0.1, cellU(best.j) + dv * 0.1);
  return {
    x,
    y,
    i: best.i,
    j: best.j,
    open: best.open,
    front: { x: fx, y: fy },
    steps: steps.get(best.i * GRID + best.j) ?? 0,
  };
})();
/** How near the lever's base the figure is kept, and how near it can pull it. */
export const LEVER_R = 5;
export const LEVER_REACH = 26;

export const COFFINS16: readonly Coffin16[] = MAZE16.deadEnds
  .filter((d) => !(d.i === LEVER16.i && d.j === LEVER16.j))
  .filter((d) => !(d.i === MAZE16.wayIn.i && d.j === MAZE16.wayIn.j))
  .filter((d) => !(d.i === MAZE16.wayOut.i && d.j === MAZE16.wayOut.j))
  .filter((d) => !(d.i === MAZE16.gate.i && d.j === MAZE16.gate.j))
  .map((d) => {
    // Pushed toward the closed end, away from the way in to it.
    const off = CELL / 2 - WALL_T - COFFIN_L - 6;
    const du = d.open === 'e' ? -off : d.open === 'w' ? off : 0;
    const dv = d.open === 's' ? -off : d.open === 'n' ? off : 0;
    const u = cellU(d.i) + du;
    const v = cellU(d.j) + dv;
    const along: 'x' | 'y' = d.open === 'e' || d.open === 'w' ? 'x' : 'y';
    const hu = along === 'x' ? COFFIN_L : COFFIN_W;
    const hv = along === 'x' ? COFFIN_W : COFFIN_L;
    return { ...boxAt(u - hu, v - hv, u + hu, v + hv), along, i: d.i, j: d.j };
  });

/* ---------- the jetty ---------- */

/** The jetty, out from the beach below the way in, toward the bottom of the screen: its half width, its two ends. */
export const JETTY16 = {
  half: 11,
  v0: shoreR16(Math.PI / 2) - 26,
  v1: shoreR16(Math.PI / 2) + 120,
} as const;
export const JETTY16_Z = 6;
export function onJetty16(x: number, y: number): boolean {
  const [u, v] = toTomb(x, y);
  return Math.abs(u) <= JETTY16.half && v >= JETTY16.v0 && v <= JETTY16.v1;
}
/** Entering this ring ties the boat up. */
export const DOCK16 = (() => {
  const [x, y] = fromTomb(0, JETTY16.v1 + 70);
  return { x, y, r: 125 };
})();
/** The boat's berth for a hull of this scale: bow in at the jetty's end. */
export function berth16(k: number): { x: number; y: number; h: number } {
  const [x, y] = fromTomb(0, JETTY16.v1 + 6 + 34 * k);
  return { x, y, h: -Math.PI / 2 };
}
/** Where the figure lands, at the end of the jetty. */
export const LANDING16 = (() => {
  const [x, y] = fromTomb(0, JETTY16.v1 - 10);
  return { x, y };
})();

/* ---------- where the figure can go ---------- */

const inBox = (x: number, y: number, b: Box16, pad: number) =>
  x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad;

/** Whether the island's stonework (a wall, a post, the castle or a coffin) stands at (x, y), give or take pad. */
export function inStone16(x: number, y: number, pad = PAD16): boolean {
  const [u, v] = toTomb(x, y);
  const m = MAZE16;
  // The nearest wall lines across and down, and the cells either side.
  const k = Math.round(u / CELL + MID + 0.5);
  const l = Math.round(v / CELL + MID + 0.5);
  const nu = Math.abs(u - lineU(k));
  const nv = Math.abs(v - lineU(l));
  if (nu < POST_T + pad && nv < POST_T + pad && postAt(k, l)) return true;
  const i = Math.floor(u / CELL + MID + 0.5);
  const j = Math.floor(v / CELL + MID + 0.5);
  if (nu < WALL_T + pad && m.vert[k]?.[j]) return true;
  if (nv < WALL_T + pad && m.horz[i]?.[l]) return true;
  if (inBox(x, y, CASTLE16_BOX, pad)) return true;
  return COFFINS16.some((c) => inBox(x, y, c, pad - 1));
}

/** Ground the figure can stand on: the jetty, and the island inside its waterline, off its stonework and stones. */
export function onIsle16(x: number, y: number): boolean {
  if (onJetty16(x, y)) return true;
  const [u, v] = toTomb(x, y);
  const d = Math.hypot(u, v);
  if (d > shoreR16(Math.atan2(v, u)) - SHORE_IN16) return false;
  if (inStone16(x, y)) return false;
  if (Math.hypot(x - LEVER16.x, y - LEVER16.y) < LEVER_R) return false;
  if (STONES16.some((s) => Math.hypot(x - s.x, y - s.y) < STONE_R)) return false;
  return !GRAVES16.some((g) => Math.hypot(x - g.hx, y - g.hy) < STONE_R);
}

/** The height underfoot: the jetty's planks, and the ground. */
export function groundZ16(x: number, y: number): number {
  if (!onJetty16(x, y)) return 0;
  const [, v] = toTomb(x, y);
  return JETTY16_Z * Math.min(1, Math.max(0, (v - JETTY16.v0) / 10));
}

/**
 * The island's boxes near (x, y), for sorting whatever walks among them: a figure is in front of a box when it is past
 * its +x or +y face, behind it when it is short of its -x or -y face.
 */
export function boxesNear16(x: number, y: number, reach: number): Box16[] {
  const [u, v] = toTomb(x, y);
  if (Math.hypot(u, v) > TOMB_ISLE.r + reach) return [];
  const out: Box16[] = [];
  // Only what can overlap it on the screen: near, and in the same column of the screen (which runs with x - y).
  const sx = x - y;
  const near = (b: Box16) =>
    b.x0 - b.y1 < sx + 16 &&
    b.x1 - b.y0 > sx - 16 &&
    Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1)) < reach;
  for (const w of WALLS16) if (near(w)) out.push(w);
  for (const p of POSTS16) if (near(p)) out.push(p);
  for (const c of COFFINS16) if (near(c)) out.push(c);
  if (near(CASTLE16_BOX)) out.push(CASTLE16_BOX);
  return out;
}

/** Keep a hull off its shore, and off the jetty's sides. */
export function pushOffIsle16(s: { x: number; y: number; v: number }, pad: number): void {
  const [u, v] = toTomb(s.x, s.y);
  const d = Math.hypot(u, v);
  const r = TOMB_ISLE.r + pad;
  if (d < r && d > 0) {
    [s.x, s.y] = fromTomb((u / d) * r, (v / d) * r);
    s.v *= 0.6;
  }
  const [u2, v2] = toTomb(s.x, s.y);
  if (v2 > JETTY16.v0 && v2 < JETTY16.v1 + pad * 0.3 && Math.abs(u2) < JETTY16.half + pad) {
    [s.x, s.y] = fromTomb(Math.sign(u2 || 1) * (JETTY16.half + pad), v2);
    s.v *= 0.6;
  }
}

/** Further out than this from its shore, nothing needs to know the island is there. */
export function nearIsle16(x: number, y: number, pad: number): boolean {
  return Math.hypot(x - TOMB_ISLE.x, y - TOMB_ISLE.y) < TOMB_ISLE.r + pad;
}

/** The fog bank it lies in: how far out from its shore. The boat sights it this far into the fog. */
export const FOG16 = 440;
export const SIGHT16 = 340;
/** How far the fog thins round whoever is looking: aboard the boat, and ashore. */
export const CLEAR_SEA16 = 230;
export const CLEAR_LAND16 = 320;
/**
 * Ashore in the fog, before the lever is pulled (part two, the kid's "in the fog the player sees very little"): this
 * far round the figure is clear, a corridor and a bit; past it the fog closes in to nothing seen.
 */
export const SIGHT_LAND16 = 72;
/** Seconds the fog takes to roll back off the island once the lever is pulled. */
export const FOG_LIFT16 = 3;
/** The camera's look at the island once it is sighted, and for how long. */
export const REVEAL16 = { x: TOMB_ISLE.x + 40, y: TOMB_ISLE.y + 40 } as const;
export const REVEAL16_T = 5.5;
/** How far the view pulls back to take in the whole island, for a screen this wide at this zoom. */
export function revealZoom16(width: number, zoom: number): number {
  const across = (TOMB_ISLE.r + 60) * 2 * 1.4 * zoom;
  return Math.min(1, (width * 0.95) / across);
}
