/** Small numeric helpers moved verbatim from the prototype script. */

/** v held between a and b. */
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

/** Signed difference between two angles in radians, in -π..π. */
export function angDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Hermite ease for k in 0..1. */
export const smoothstep = (k: number): number => k * k * (3 - 2 * k);

/**
 * mulberry32: a tiny seeded generator returning numbers in [0, 1). School
 * placement is seeded with it, so its sequence must never change.
 */
export function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
