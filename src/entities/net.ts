/**
 * The towed net, moved verbatim from the prototype script. This is the game:
 * the net trails the stern like a trailer on a rope of fixed length, so turning
 * swings it wide and the sweep through a school is the thing that has to feel
 * right. Nothing here may change without a side-by-side check against legacy;
 * tests/unit/net.test.ts evaluates the legacy code itself against this.
 */

export type Net = { x: number; y: number; speed: number; torn: number };

/** Where a hull is and which way it points. */
export type Hull = { x: number; y: number; h: number };

/** The stern sits this many hull-scaled units behind the boat's centre. */
export const STERN = 27;

/** Rope length for a net of the given width. */
export function towLength(netWidth: number): number {
  return 44 + netWidth * 0.28;
}

/** Drop the net straight behind the boat at full rope, as when a trip begins. */
export function placeNetBehind(net: Net, boat: Hull, hullScale: number, towLen: number): void {
  const st = STERN * hullScale;
  net.x = boat.x - Math.cos(boat.h) * (st + towLen);
  net.y = boat.y - Math.sin(boat.h) * (st + towLen);
}

/**
 * One step of trailer physics. The net is pulled to the rope's length when the
 * stern moves away, left alone while the rope is slack, and nudged back behind
 * the stern if it ends up almost on top of it. Its speed is the distance it
 * moved this step over dt, which is what decides whether it is fishing.
 */
export function towNet(net: Net, boat: Hull, hullScale: number, towLen: number, dt: number): void {
  const sx = boat.x - Math.cos(boat.h) * STERN * hullScale;
  const sy = boat.y - Math.sin(boat.h) * STERN * hullScale;
  const pnx = net.x;
  const pny = net.y;
  const ndx = net.x - sx;
  const ndy = net.y - sy;
  const nl = Math.hypot(ndx, ndy);
  if (nl > towLen) {
    net.x = sx + (ndx / nl) * towLen;
    net.y = sy + (ndy / nl) * towLen;
  } else if (nl < 6) {
    net.x = sx - Math.cos(boat.h) * 6;
    net.y = sy - Math.sin(boat.h) * 6;
  }
  net.speed = Math.hypot(net.x - pnx, net.y - pny) / dt;
}
