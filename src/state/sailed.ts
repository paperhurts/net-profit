/**
 * Everywhere the boat has sailed, for the sea map, the kid's: the whole sea, the
 * far far sea included, cut into square cells, one bit each. Wherever the boat goes
 * it opens the cells round it, as far as a sailor can see; the map shows the
 * sea there and fog everywhere else. It goes in the save as base64, about a
 * thousand characters; a save from before the map has none, and the game fills
 * in the water such a player must already know (see seedSailed). A save from
 * before the far far sea has a smaller square, out to the far deep's edge, and
 * keeps every cell of it (see decodeSailed).
 */

import { DEEP, FAR, FARFAR, WS } from '../world/island';

/** A cell's side, in world units. */
export const SAILED_CELL = 200;
/** The sea runs from here to SEA_MIN + SEA_SPAN on both axes: the far far sea's edge all round. */
export const SEA_MIN = -DEEP - FAR - FARFAR;
export const SEA_SPAN = WS + 2 * (DEEP + FAR + FARFAR);
/** Cells along each side. */
export const SAILED_N = Math.ceil(SEA_SPAN / SAILED_CELL);
/** The square a save from before the far far sea kept: out to the far deep's edge, this many cells a side. */
export const OLD_N = Math.ceil((WS + 2 * (DEEP + FAR)) / SAILED_CELL);
/** How many cells in from the new square's edge the old one starts. */
export const OLD_AT = Math.round(FARFAR / SAILED_CELL);
/** How far round the boat is seen and opened on the map. */
export const SAILED_SIGHT = 450;

export type Sailed = Uint8Array;

const BYTES = Math.ceil((SAILED_N * SAILED_N) / 8);
const OLD_BYTES = Math.ceil((OLD_N * OLD_N) / 8);

export function noSailed(): Sailed {
  return new Uint8Array(BYTES);
}

/** The cell a world point is in, or null off the sea. */
export function cellAt(x: number, y: number): [number, number] | null {
  const i = Math.floor((x - SEA_MIN) / SAILED_CELL);
  const j = Math.floor((y - SEA_MIN) / SAILED_CELL);
  return i >= 0 && j >= 0 && i < SAILED_N && j < SAILED_N ? [i, j] : null;
}

/** A cell's middle, in world units. */
export function cellMiddle(i: number, j: number): [number, number] {
  return [SEA_MIN + (i + 0.5) * SAILED_CELL, SEA_MIN + (j + 0.5) * SAILED_CELL];
}

export function isSailed(s: Sailed, i: number, j: number): boolean {
  if (i < 0 || j < 0 || i >= SAILED_N || j >= SAILED_N) return false;
  const n = j * SAILED_N + i;
  return ((s[n >> 3] ?? 0) & (1 << (n & 7))) !== 0;
}

/** Open every cell whose middle is within r of a point; how many were new. */
export function sail(s: Sailed, x: number, y: number, r = SAILED_SIGHT): number {
  const reach = Math.ceil(r / SAILED_CELL) + 1;
  const c = cellAt(x, y) ?? [
    Math.floor((x - SEA_MIN) / SAILED_CELL),
    Math.floor((y - SEA_MIN) / SAILED_CELL),
  ];
  let opened = 0;
  for (let j = c[1] - reach; j <= c[1] + reach; j++) {
    for (let i = c[0] - reach; i <= c[0] + reach; i++) {
      if (i < 0 || j < 0 || i >= SAILED_N || j >= SAILED_N) continue;
      const [mx, my] = cellMiddle(i, j);
      if (Math.hypot(mx - x, my - y) > r) continue;
      const n = j * SAILED_N + i;
      const b = 1 << (n & 7);
      const byte = s[n >> 3] ?? 0;
      if (byte & b) continue;
      s[n >> 3] = byte | b;
      opened++;
    }
  }
  return opened;
}

/** Open a whole rectangle of the sea, world units. */
export function sailBox(s: Sailed, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0 + SAILED_CELL / 2; y < y1; y += SAILED_CELL)
    for (let x = x0 + SAILED_CELL / 2; x < x1; x += SAILED_CELL) {
      const c = cellAt(x, y);
      if (!c) continue;
      const n = c[1] * SAILED_N + c[0];
      s[n >> 3] = (s[n >> 3] ?? 0) | (1 << (n & 7));
    }
}

/** Open the whole sea at once, for the tester panel: every cell, and no bit past the last one. */
export function sailAll(s: Sailed): void {
  for (let n = 0; n < SAILED_N * SAILED_N; n++) s[n >> 3] = (s[n >> 3] ?? 0) | (1 << (n & 7));
}

/** How many cells have been sailed, and the share of the sea that is. */
export function sailedCount(s: Sailed): number {
  let n = 0;
  for (const b of s) {
    let v = b;
    while (v) {
      n += v & 1;
      v >>= 1;
    }
  }
  return n;
}

/**
 * The share of the sea sailed: all of it, or (`farFar` false, before the far far sea is open) the sea out to the far
 * deep's edge, the square the map shows until then.
 */
export function sailedShare(s: Sailed, farFar = true): number {
  if (farFar) return sailedCount(s) / (SAILED_N * SAILED_N);
  let n = 0;
  for (let j = OLD_AT; j < OLD_AT + OLD_N; j++)
    for (let i = OLD_AT; i < OLD_AT + OLD_N; i++) if (isSailed(s, i, j)) n++;
  return n / (OLD_N * OLD_N);
}

export function encodeSailed(s: Sailed): string {
  let bin = '';
  for (const b of s) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** A map from the save, or none if it is missing or broken. */
export function decodeSailed(v: unknown): Sailed {
  const s = noSailed();
  if (typeof v !== 'string' || !v) return s;
  let bin: string;
  try {
    bin = atob(v);
  } catch {
    return s;
  }
  if (bin.length === BYTES) {
    for (let k = 0; k < BYTES; k++) s[k] = bin.charCodeAt(k) & 255;
    return s;
  }
  // A save from before the far far sea: its square, out to the far deep's edge, moved in to where it now sits.
  if (bin.length !== OLD_BYTES) return s;
  for (let j = 0; j < OLD_N; j++)
    for (let i = 0; i < OLD_N; i++) {
      const o = j * OLD_N + i;
      if (!((bin.charCodeAt(o >> 3) >> (o & 7)) & 1)) continue;
      const n = (j + OLD_AT) * SAILED_N + i + OLD_AT;
      s[n >> 3] = (s[n >> 3] ?? 0) | (1 << (n & 7));
    }
  return s;
}

/** Places a player must already know, for a save from before the map: the sea round home, and each island found. */
export function seedSailed(s: Sailed, found: readonly { x: number; y: number; r: number }[]): void {
  sailBox(s, 0, 0, WS, WS);
  for (const f of found) sail(s, f.x, f.y, f.r + SAILED_SIGHT);
}
