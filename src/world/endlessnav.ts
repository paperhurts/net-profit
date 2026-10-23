/**
 * Finding the way on the Endless Isle, for the battles' bots: the island as two grids in its own frame (u across the
 * screen, v down it). A fine one says where a fighter can stand and where it wades; a coarse one carries the ways to a
 * place, a field of how far every cell is from it, so a bot heads downhill. Both are laid out the same either side of
 * the channel and either side of the middle line, so the way from the ninjas' fort mirrors the way from the pirates'.
 * Worked out once, on first use.
 */

import { inShallowsAt, onEndlessAt } from './endless';

/** The fine grid: cells this wide, centred on the island's middle. */
const FINE = 8;
const FU = 170;
const FV = 270;
const FU0 = -(FU * FINE) / 2;
const FV0 = -(FV * FINE) / 2;
/** The coarse one, its cells' middles mirrored about both lines too. */
export const NAV = { cell: 20, nu: 68, nv: 108 } as const;
const CU0 = -(NAV.nu * NAV.cell) / 2;
const CV0 = -(NAV.nv * NAV.cell) / 2;

let fine: Uint8Array | null = null;
/** 1 to stand on, 2 to wade, 0 not. */
function fineGrid(): Uint8Array {
  if (fine) return fine;
  const g = new Uint8Array(FU * FV);
  for (let j = 0; j < FV; j++)
    for (let i = 0; i < FU; i++) {
      const u = FU0 + (i + 0.5) * FINE;
      const v = FV0 + (j + 0.5) * FINE;
      if (onEndlessAt(u, v)) g[j * FU + i] = inShallowsAt(u, v) ? 2 : 1;
    }
  fine = g;
  return g;
}

function fineAt(u: number, v: number): number {
  const i = Math.floor((u - FU0) / FINE);
  const j = Math.floor((v - FV0) / FINE);
  if (i < 0 || j < 0 || i >= FU || j >= FV) return 0;
  return fineGrid()[j * FU + i] as number;
}
/** Whether a fighter can stand here. */
export function walkable(u: number, v: number): boolean {
  return fineAt(u, v) > 0;
}
/** Whether it wades here, at half pace. */
export function wading(u: number, v: number): boolean {
  return fineAt(u, v) === 2;
}

/** Whether the straight way between two points is all ground, looked at every few steps. */
export function clearLine(u0: number, v0: number, u1: number, v1: number): boolean {
  const n = Math.ceil(Math.hypot(u1 - u0, v1 - v0) / (FINE * 0.75));
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    if (!walkable(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t)) return false;
  }
  return true;
}

let coarse: Uint8Array | null = null;
/**
 * A coarse cell is ground if all of it is, looked at in a three by three, so a wall thinner than a cell (the forts'
 * are 14) still stands in the way; 2 if its middle wades.
 */
function coarseGrid(): Uint8Array {
  if (coarse) return coarse;
  const g = new Uint8Array(NAV.nu * NAV.nv);
  for (let j = 0; j < NAV.nv; j++)
    for (let i = 0; i < NAV.nu; i++) {
      const [mu, mv] = cellMid(i, j);
      let ok = true;
      for (const a of [-7, 0, 7])
        for (const b of [-7, 0, 7]) if (!fineAt(mu + a, mv + b)) ok = false;
      g[j * NAV.nu + i] = ok ? fineAt(mu, mv) : 0;
    }
  coarse = g;
  return g;
}
function cellMid(i: number, j: number): [number, number] {
  return [CU0 + (i + 0.5) * NAV.cell, CV0 + (j + 0.5) * NAV.cell];
}
function cellOf(u: number, v: number): [number, number] {
  return [Math.floor((u - CU0) / NAV.cell), Math.floor((v - CV0) / NAV.cell)];
}

/** The ground cell nearest a point, within a few cells; -1 if there is none. */
function nearestCell(u: number, v: number): number {
  const g = coarseGrid();
  const [ci, cj] = cellOf(u, v);
  let best = -1;
  let bd = Infinity;
  for (let r = 0; r <= 4 && best < 0; r++)
    for (let j = cj - r; j <= cj + r; j++)
      for (let i = ci - r; i <= ci + r; i++) {
        if (i < 0 || j < 0 || i >= NAV.nu || j >= NAV.nv || !g[j * NAV.nu + i]) continue;
        const [mu, mv] = cellMid(i, j);
        const d = Math.hypot(mu - u, mv - v);
        if (d < bd) {
          bd = d;
          best = j * NAV.nu + i;
        }
      }
  return best;
}

/** How far, walking, every coarse cell is from a place (wading counts double); Infinity where it cannot be reached. */
export type Flow = { readonly dist: Float32Array; readonly goal: readonly [number, number] };

const STEPS: readonly (readonly [number, number, number])[] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

/** The ways worked out, by the cell they lead to; the oldest let go past this many, chases making new ones. */
const flows = new Map<number, Flow>();
const FLOWS_KEPT = 96;
/** The way to a place, worked out once for each cell it can be in. */
export function flowTo(u: number, v: number): Flow {
  const g = coarseGrid();
  const start = nearestCell(u, v);
  const cached = flows.get(start);
  if (cached) {
    flows.delete(start);
    flows.set(start, cached);
    return cached;
  }
  const n = NAV.nu * NAV.nv;
  const dist = new Float32Array(n).fill(Infinity);
  if (start >= 0) {
    // Dijkstra, on a little binary heap of cells.
    const heap: number[] = [start];
    dist[start] = 0;
    const less = (a: number, b: number) => (dist[a] as number) < (dist[b] as number);
    const push = (c: number) => {
      heap.push(c);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (!less(heap[k] as number, heap[p] as number)) break;
        [heap[k], heap[p]] = [heap[p] as number, heap[k] as number];
        k = p;
      }
    };
    const pop = (): number => {
      const top = heap[0] as number;
      const last = heap.pop() as number;
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1;
          const r = l + 1;
          let m = k;
          if (l < heap.length && less(heap[l] as number, heap[m] as number)) m = l;
          if (r < heap.length && less(heap[r] as number, heap[m] as number)) m = r;
          if (m === k) break;
          [heap[k], heap[m]] = [heap[m] as number, heap[k] as number];
          k = m;
        }
      }
      return top;
    };
    const done = new Uint8Array(n);
    while (heap.length) {
      const c = pop();
      if (done[c]) continue;
      done[c] = 1;
      const ci = c % NAV.nu;
      const cj = (c - ci) / NAV.nu;
      for (const [di, dj, w] of STEPS) {
        const i = ci + di;
        const j = cj + dj;
        if (i < 0 || j < 0 || i >= NAV.nu || j >= NAV.nv) continue;
        const k = j * NAV.nu + i;
        if (!g[k] || done[k]) continue;
        // No cutting a corner past ground that is not there.
        if (di && dj && (!g[cj * NAV.nu + i] || !g[j * NAV.nu + ci])) continue;
        const nd = (dist[c] as number) + w * NAV.cell * (g[k] === 2 ? 2 : 1);
        if (nd < (dist[k] as number)) {
          dist[k] = nd;
          push(k);
        }
      }
    }
  }
  const f: Flow = { dist, goal: [u, v] };
  flows.set(start, f);
  if (flows.size > FLOWS_KEPT) flows.delete(flows.keys().next().value as number);
  return f;
}

/** How far, walking, a point is from a flow's place (Infinity if it cannot get there). */
export function distOf(f: Flow, u: number, v: number): number {
  const c = nearestCell(u, v);
  return c < 0 ? Infinity : (f.dist[c] as number);
}

/**
 * Which way to walk from a point to get to a flow's place: downhill, aiming a few cells ahead where the way there is
 * clear, so a bot cuts across open ground rather than zig-zagging cell by cell. Straight at the place once it is in
 * sight and near; null when there is no way.
 */
export function steer(f: Flow, u: number, v: number): [number, number] | null {
  const [gu, gv] = f.goal;
  const near = Math.hypot(gu - u, gv - v);
  if (near < 1) return [0, 0];
  if (near < NAV.cell * 4 && clearLine(u, v, gu, gv)) return [(gu - u) / near, (gv - v) / near];
  let c = nearestCell(u, v);
  if (c < 0 || !Number.isFinite(f.dist[c] as number)) return null;
  let aim: [number, number] = cellMid(c % NAV.nu, Math.floor(c / NAV.nu));
  for (let s = 0; s < 4; s++) {
    const ci = c % NAV.nu;
    const cj = (c - ci) / NAV.nu;
    let next = c;
    for (const [di, dj] of STEPS) {
      const i = ci + di;
      const j = cj + dj;
      if (i < 0 || j < 0 || i >= NAV.nu || j >= NAV.nv) continue;
      const k = j * NAV.nu + i;
      if ((f.dist[k] as number) < (f.dist[next] as number)) next = k;
    }
    if (next === c) break;
    const m = cellMid(next % NAV.nu, Math.floor(next / NAV.nu));
    if (s > 0 && !clearLine(u, v, m[0], m[1])) break;
    aim = m;
    c = next;
  }
  const du = aim[0] - u;
  const dv = aim[1] - v;
  const d = Math.hypot(du, dv);
  if (d < 1) {
    const dg = Math.hypot(gu - u, gv - v);
    return dg < 1 ? [0, 0] : [(gu - u) / dg, (gv - v) / dg];
  }
  return [du / d, dv / d];
}
