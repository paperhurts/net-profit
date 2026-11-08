/**
 * Tomb Island's undead (part four): where they wait in the maze, and what is in each coffin. The kid's "skeletons,
 * ghosts, mummies, zombies and necromancers", his "zzz=3 zombies", and "Coffins hold mummies and vampires".
 *
 * Haunts: small knots of the Gigantis castle's undead (entities/undead.ts), each in its own stretch of corridor, spaced
 * along the maze from the way in so that the way through meets one every so often. Each is a horde of its own with a
 * little room round it: they wake when the figure comes near (they see you in the fog; you do not see them), chase it
 * only so far from where they stood, and are back where they stood on the next landing. Ghosts float through the
 * walls; the rest go round. Necromancers are kept for the elites (part five).
 *
 * Coffins: each one bursts when the figure comes near it, a mummy or a vampire climbing out, turn and turn about.
 *
 * Where and how many are my picks, hers to change.
 */
import type { Spawn, UndeadKind } from '../entities/undead';
import {
  CELL,
  COFFINS16,
  type Coffin16,
  cellU,
  fromTomb,
  GRID,
  isMaze,
  LEVER16,
  MAZE16,
  onIsle16,
  stepsFromWayIn,
} from './tombisle';

/** A haunt's room: how far from its middle its undead chase the figure, and wake to it (plus the horde's own 60). */
export const HAUNT_R = 96;
/** Haunts stand at least this far apart, so two never wake as one. */
const HAUNT_GAP = 170;

/** What each haunt holds, in turn round the maze: the kid's three zombies first. */
const HAUNT_KINDS: readonly (readonly UndeadKind[])[] = [
  ['zombie', 'zombie', 'zombie'],
  ['skeleton', 'skeleton'],
  ['ghost', 'zombie'],
  ['skeleton', 'ghost'],
  ['zombie', 'zombie', 'skeleton'],
  ['ghost', 'ghost'],
];

export type Haunt = { x: number; y: number; r: number; spawns: Spawn[] };

/**
 * The haunts: corridor cells every few steps along the maze from the way in (none in the first few, nor in a dead
 * end, nor in the lever's), each far enough from the last. Its undead stand a little apart in its cell, on the ground.
 */
export const HAUNTS16: readonly Haunt[] = (() => {
  const steps = stepsFromWayIn();
  const cells: { i: number; j: number; s: number }[] = [];
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      const s = steps.get(i * GRID + j);
      if (!isMaze(i, j) || s === undefined || s < 5 || s % 6 !== 5) continue;
      if (MAZE16.deadEnds.some((d) => d.i === i && d.j === j)) continue;
      if (i === LEVER16.i && j === LEVER16.j) continue;
      cells.push({ i, j, s });
    }
  cells.sort((a, b) => a.s - b.s || a.i - b.i || a.j - b.j);
  const out: Haunt[] = [];
  for (const c of cells) {
    const [x, y] = fromTomb(cellU(c.i), cellU(c.j));
    if (out.some((h) => Math.hypot(h.x - x, h.y - y) < HAUNT_GAP)) continue;
    // The gate into the square is the sword mummy's (part five): no haunt beside it.
    const [gx, gy] = fromTomb(cellU(MAZE16.gate.i), cellU(MAZE16.gate.j));
    if (Math.hypot(gx - x, gy - y) < HAUNT_GAP) continue;
    const kinds = HAUNT_KINDS[out.length % HAUNT_KINDS.length] as readonly UndeadKind[];
    const spawns: Spawn[] = kinds.map((kind, n) => {
      const a = (n / kinds.length) * Math.PI * 2 + c.i;
      const sx = x + Math.cos(a) * 12;
      const sy = y + Math.sin(a) * 12;
      return onIsle16(sx, sy) ? { kind, x: sx, y: sy } : { kind, x, y };
    });
    out.push({ x, y, r: HAUNT_R, spawns });
  }
  return out;
})();

/** How near a coffin the figure comes before it bursts. */
export const COFFIN_WAKE = 46;
/** What climbs out of a coffin, turn and turn about. */
export const coffinKind = (i: number): UndeadKind => (i % 2 ? 'vampire' : 'mummy');
/** Where it climbs out: at the coffin's open end, toward the way into its dead end. */
export function coffinRise(c: Coffin16): { x: number; y: number } {
  const mx = (c.x0 + c.x1) / 2;
  const my = (c.y0 + c.y1) / 2;
  const d = MAZE16.deadEnds.find((e) => e.i === c.i && e.j === c.j);
  const off = CELL * 0.42;
  const dx = d?.open === 'e' ? off : d?.open === 'w' ? -off : 0;
  const dy = d?.open === 's' ? off : d?.open === 'n' ? -off : 0;
  return { x: mx + dx, y: my + dy };
}
/** Each coffin's room: its dead end, and a little round it. */
export const COFFIN_ROOMS: readonly { x: number; y: number; r: number }[] = COFFINS16.map((c) => ({
  x: (c.x0 + c.x1) / 2,
  y: (c.y0 + c.y1) / 2,
  r: HAUNT_R,
}));

/**
 * The elites (part five): the sword mummy in the corridor just outside the gate into the square, so the castle is not
 * reached without getting past it; and the big necromancer in the square, before the castle's door. Each is a horde of
 * its own, its room the stretch round it, back at every landing like the rest.
 */
export const ELITES16: readonly Haunt[] = (() => {
  const [mx, my] = fromTomb(cellU(MAZE16.gate.i), cellU(MAZE16.gate.j));
  const [nx, ny] = fromTomb(0, 116);
  return [
    { x: mx, y: my, r: HAUNT_R, spawns: [{ kind: 'mummyElite', x: mx, y: my }] },
    { x: nx, y: ny, r: 120, spawns: [{ kind: 'necroElite', x: nx, y: ny }] },
  ];
})();
/** Coins for beating one. */
export const ELITE_COINS = 100;
