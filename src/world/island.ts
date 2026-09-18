/**
 * Island 1's geometry and the two rules that keep everything off it, moved
 * verbatim from the prototype script. Anything that roams needs to know the
 * island exists: dolphins and the pirate steer around it with `around`, and
 * `pushOut` is the backstop for them and the boat.
 */

/** World size in units; the island sits at its centre. */
export const WS = 4800;
export const IX = 2400;
export const IY = 2400;
/** Island radius. */
export const IR = 210;
/** Where the pier leaves the beach. */
export const PX0 = IX + IR - 30;

/** The palace tree and the watchtower. */
export const TX = IX - 80;
export const TY = IY + 40;
export const TWX = IX - 32;
export const TWY = IY - 2;

/** Entering this ring opens the shop and sells the hold. */
export const DOCK = { x: PX0 + 165, y: IY, r: 125 } as const;
export const CRATE = { x: PX0 + 129, y: IY } as const;

export type Point = readonly [number, number];

/** The pier as a world polygon. */
export const PIER: readonly Point[] = [
  [PX0, IY - 17],
  [PX0 + 155, IY - 17],
  [PX0 + 155, IY + 17],
  [PX0, IY + 17],
];
/** Circles along the pier that hulls are pushed off. */
export const PIER_BUMPS: readonly Point[] = [
  [PX0 + 45, IY],
  [PX0 + 80, IY],
  [PX0 + 115, IY],
  [PX0 + 142, IY],
];

/**
 * A waypoint for something at (x, y) heading to (tx, ty) that would otherwise
 * cross the island's disc of radius R: a point 200 units to the nearer side
 * and 40 units back. Returns the target itself when the straight line is fine.
 */
export function around(x: number, y: number, tx: number, ty: number, R: number): Point {
  const cx = IX - x;
  const cy = IY - y;
  const dc = Math.hypot(cx, cy);
  if (dc > R + 160) return [tx, ty];
  let dx = tx - x;
  let dy = ty - y;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  if (dx * cx + dy * cy <= 0 || d < dc - R) return [tx, ty];
  const cross = dx * cy - dy * cx;
  if (Math.abs(cross) > R) return [tx, ty];
  const sg = cross >= 0 ? 1 : -1;
  return [x + ((sg * cy) / dc) * 200 - (cx / dc) * 40, y - ((sg * cx) / dc) * 200 - (cy / dc) * 40];
}

/** The point just past the nearest side of the world, for something leaving. */
export function nearestEdgeExit(x: number, y: number): Point {
  const d = [x, WS - x, y, WS - y];
  const m = Math.min(...d);
  if (m === d[0]) return [-260, y];
  if (m === d[1]) return [WS + 260, y];
  if (m === d[2]) return [x, -260];
  return [x, WS + 260];
}

/** Something with a position and a speed that can be shoved. */
export type Body = { x: number; y: number; v: number };

/** Move a body that is inside the circle out to its rim and bleed a little speed. */
export function pushOut(s: Body, cx: number, cy: number, r: number): void {
  const dx = s.x - cx;
  const dy = s.y - cy;
  const d = Math.hypot(dx, dy);
  if (d < r && d > 0) {
    s.x = cx + (dx / d) * r;
    s.y = cy + (dy / d) * r;
    s.v *= 0.94;
  }
}
