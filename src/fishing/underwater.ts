/**
 * Spearfishing in the trench, the kid's "scuba diving and spear fishing": the
 * throw button throws the diver's spear through the water. It aims itself at
 * the nearest fish worth spearing ahead of the diver and in reach (the
 * lanternfish, the glow squid and the neon dragonfish; the silver fish and the
 * jellies are left be), or straight ahead if there is none, and flies until it
 * hits one or runs out of reach. A speared fish goes into the hold; its place
 * in the shoal stays empty a while and then another swims in.
 */

import { fishIn, type Shoal } from '../world/trench';

/** How fast a spear goes through the water, and how near a fish must pass its tip to be speared. */
export const SPEAR_SPEED = 380;
export const HIT = 11;
/** Seconds before a speared fish's place in its shoal is filled again. */
export const RESPAWN = 30;
/** Underwater a spear goes a little further than it is thrown on land: the trench is roomy. */
export const REACH = 1.4;

export type DiveSpear = { x: number; y: number; vx: number; vy: number; left: number };
/** For each shoal, for each fish, the time it is back: at or before now it is there. */
export type Gone = number[][];
export type FishRef = { si: number; i: number; x: number; y: number };

export function noneGone(shoals: readonly Shoal[]): Gone {
  return shoals.map((s) => new Array<number>(s.n).fill(0));
}

/** Whether fish i of shoal si is there to be speared or drawn at time T. */
export function here(gone: Gone, si: number, i: number, T: number): boolean {
  return (gone[si]?.[i] ?? 0) <= T;
}

/** The nearest fish worth spearing in reach and ahead of the diver (or level with it), or null. */
export function aimAt(
  shoals: readonly Shoal[],
  gone: Gone,
  T: number,
  from: { x: number; y: number; face: number },
  range: number,
): FishRef | null {
  let best: FishRef | null = null;
  let bd = range;
  shoals.forEach((s, si) => {
    if (s.sp === undefined) return;
    for (let i = 0; i < s.n; i++) {
      if (!here(gone, si, i, T)) continue;
      const p = fishIn(s, i, T);
      if ((p.x - from.x) * from.face < -8) continue;
      const d = Math.hypot(p.x - from.x, p.y - from.y);
      if (d < bd) {
        bd = d;
        best = { si, i, x: p.x, y: p.y };
      }
    }
  });
  return best;
}

/** A spear thrown from the diver: at the target if there is one, else straight ahead the way it faces. */
export function throwSpear(
  from: { x: number; y: number; face: number },
  target: { x: number; y: number } | null,
  range: number,
): DiveSpear {
  const dx = target ? target.x - from.x : from.face;
  const dy = target ? target.y - from.y : 0;
  const d = Math.hypot(dx, dy) || 1;
  return {
    x: from.x,
    y: from.y,
    vx: (dx / d) * SPEAR_SPEED,
    vy: (dy / d) * SPEAR_SPEED,
    left: range,
  };
}

/** Distance from a point to the segment a..b. */
function toSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const l = vx * vx + vy * vy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l)) : 0;
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

/**
 * Move a spear on one step: the fish it hit (the whole of this step's path is checked, so a quick
 * spear cannot skip over one), 'spent' once it has gone its reach, or null while it flies on.
 */
export function stepSpear(
  sp: DiveSpear,
  dt: number,
  shoals: readonly Shoal[],
  gone: Gone,
  T: number,
): FishRef | 'spent' | null {
  const x0 = sp.x;
  const y0 = sp.y;
  const step = Math.min(sp.left, SPEAR_SPEED * dt);
  const k = step / SPEAR_SPEED;
  sp.x += sp.vx * k;
  sp.y += sp.vy * k;
  sp.left -= step;
  for (let si = 0; si < shoals.length; si++) {
    const s = shoals[si] as Shoal;
    if (s.sp === undefined) continue;
    for (let i = 0; i < s.n; i++) {
      if (!here(gone, si, i, T)) continue;
      const p = fishIn(s, i, T);
      if (toSegment(p.x, p.y, x0, y0, sp.x, sp.y) < HIT + s.size * 0.4)
        return { si, i, x: p.x, y: p.y };
    }
  }
  return sp.left <= 0 ? 'spent' : null;
}

/** A fish speared: its place stays empty for RESPAWN seconds. */
export function spear(gone: Gone, f: FishRef, T: number): void {
  const row = gone[f.si];
  if (row) row[f.i] = T + RESPAWN;
}
