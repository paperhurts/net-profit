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
/** The fishmonger's stall, on the beach just south of the pier root; opens with the watchtower. */
export const STALL = { x: IX + 150, y: IY + 35 } as const;
/**
 * The Ten Cent Bridge, named for a bridge the owner's family crossed to reach the beach. It
 * leaves the island's west shore at 200 degrees, in the gap between two sardine schools, and
 * ends at a little beach of its own. Hulls are pushed off it, as off the pier.
 */
export const BRIDGE_ANGLE = (200 * Math.PI) / 180;
const BU = Math.cos(BRIDGE_ANGLE);
const BV = Math.sin(BRIDGE_ANGLE);
/** How far the span runs from the shore to the beach. */
export const BRIDGE_SPAN = 232;
export const BRIDGE = {
  ax: IX + BU * (IR - 8),
  ay: IY + BV * (IR - 8),
  bx: IX + BU * (IR + BRIDGE_SPAN),
  by: IY + BV * (IR + BRIDGE_SPAN),
  /** Deck width and height off the water. */
  w: 22,
  z: 12,
} as const;
export const BEACH = {
  x: IX + BU * (IR + BRIDGE_SPAN + 74),
  y: IY + BV * (IR + BRIDGE_SPAN + 74),
  r: 86,
} as const;
/** Circles along the span that hulls are pushed off. */
export const BRIDGE_BUMPS: readonly Point[] = Array.from({ length: 7 }, (_, i): Point => {
  const r = IR + 14 + i * 32;
  return [IX + BU * r, IY + BV * r];
});
/** The two large stone abutments, a third and two thirds of the way across. */
export const ABUTMENTS: readonly Point[] = [0.36, 0.7].map((t): Point => {
  const r = IR + BRIDGE_SPAN * t;
  return [IX + BU * r, IY + BV * r];
});
/** The unit vector across the bridge toward its south side, which faces the viewer. */
export const BRIDGE_SOUTH: Point = [BV, -BU];

/** Where the snook holds: in the shadow of the far abutment, on the south side. */
export const SNOOK_SPOT: Point = [
  (ABUTMENTS[1] as Point)[0] + BRIDGE_SOUTH[0] * 30,
  (ABUTMENTS[1] as Point)[1] + BRIDGE_SOUTH[1] * 30,
];

/** Whether a point is on the beach or the bridge, or within pad of either: no place for flotsam or fish. */
export function nearBeach(x: number, y: number, pad: number): boolean {
  if (Math.hypot(x - BEACH.x, y - BEACH.y) < BEACH.r + pad) return true;
  const dx = BRIDGE.bx - BRIDGE.ax;
  const dy = BRIDGE.by - BRIDGE.ay;
  const t = Math.max(
    0,
    Math.min(1, ((x - BRIDGE.ax) * dx + (y - BRIDGE.ay) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(x - (BRIDGE.ax + dx * t), y - (BRIDGE.ay + dy * t)) < BRIDGE.w / 2 + pad;
}

/** The smokehouse, further down the beach; opens with the palace dome. */
export const SMOKEHOUSE = { x: IX + 130, y: IY + 100 } as const;

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
