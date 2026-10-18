/**
 * The tar ocean, the kid's (his tab 17, 2026-10-18: "I want the tar ocean now the size of this oceane", and his
 * answers in his tab "tar ocean for rowan"): past the metal bridge, as big as the whole sea out to the white buoys,
 * black tar from side to side, and only the chemistry boat goes on it ("only tar boat chemichcstrey"). It lies north
 * of the bridge, across the same width as the sea and as deep again; you sail out from the tar dock at the bridge's
 * back, where the chemistry boat is kept, and back in there. Its fish, its island with the tower, the tar eel and the
 * tar creatures come after ("all").
 */

import { DEEP, FAR, FARFAR, WS } from './island';
import { METAL_BRIDGE, NORTH_EDGE } from './metalbridge';

/** How far the whole sea runs, side to side and top to bottom, out to the white buoys. */
export const SEA_SPAN = WS + 2 * (DEEP + FAR + FARFAR);

/** The tar ocean: as wide as the sea, and as deep again, north of its edge; a hull stays this far inside it. */
export const TAR_SEA = {
  x0: -(DEEP + FAR + FARFAR),
  x1: WS + DEEP + FAR + FARFAR,
  y0: NORTH_EDGE - SEA_SPAN,
  y1: NORTH_EDGE,
} as const;
export const TAR_MARGIN = 40;

/**
 * Where the chemistry boat is kept, at the end of a jetty out from the tar dock on the bridge's back (far enough out
 * that the building does not hide the boat), and how near and slow to go in there.
 */
export const TAR_BERTH = { x: METAL_BRIDGE.x, y: NORTH_EDGE - 240 } as const;
export const BERTH_REACH = 140;
export const BERTH_STOP = 25;

/** The chemistry boat's top speed: about the flagship's middle engine, light and quick on the tar. */
export const CHEM_SPEED = 240;

/** Something sailing on the tar: kept inside it, its speed taken off where it runs into an edge. */
export function keepOnTar(b: { x: number; y: number; v: number }): void {
  const x = Math.min(TAR_SEA.x1 - TAR_MARGIN, Math.max(TAR_SEA.x0 + TAR_MARGIN, b.x));
  const y = Math.min(TAR_SEA.y1 - TAR_MARGIN, Math.max(TAR_SEA.y0 + TAR_MARGIN, b.y));
  if (x !== b.x || y !== b.y) b.v *= 0.6;
  b.x = x;
  b.y = y;
}

/** The chemistry boat stopped at its berth. */
export function atBerth(b: { x: number; y: number; v: number }): boolean {
  return (
    Math.abs(b.v) < BERTH_STOP && Math.hypot(b.x - TAR_BERTH.x, b.y - TAR_BERTH.y) < BERTH_REACH
  );
}

/** Whether a point is out on the tar ocean. */
export function onTar(x: number, y: number): boolean {
  return x >= TAR_SEA.x0 && x <= TAR_SEA.x1 && y >= TAR_SEA.y0 && y <= TAR_SEA.y1;
}

/** The hazard buoys along the tar ocean's three open edges, this far apart. */
export const EDGE_BUOY_GAP = 320;
