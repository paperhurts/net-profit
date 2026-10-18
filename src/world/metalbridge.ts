/**
 * The metal bridge, the kid's (his Part 6, 2026-10-15, and his drawings, 2026-10-18): "tar ocan splat by the metal
 * bridge ... not the bridges, more like a facility". A long metal building standing on legs in the sea, windows in
 * rows, a flag at each end and the orb on top, across the far far sea's north edge: the sea on this side, the tar
 * ocean on the other. With the owner's call (2026-10-18), a new edge past island 11 and the abyss. Inside (to come):
 * your room, the observatory, the scientist's science room, the missions room with a hologram of the tar eel, the
 * news room with a tentacle for testing, and a dock on the tar side where a tar animal with tentacles stays in the
 * water. You get in by your boat stopping at its door on the sea side.
 */
import { DEEP, FAR, FARFAR, WS } from './island';

/** Where the sea ends to the north, and the tar ocean begins. */
export const NORTH_EDGE = -(DEEP + FAR + FARFAR);

/**
 * The building: its middle along the edge (west of island 11, north of the abyss), its length along x, and its sea
 * face, the side the boat comes to, a little inside the edge so the boat can reach the door; its depth toward the tar.
 */
export const METAL_BRIDGE = {
  x: WS + DEEP + FAR - 400,
  len: 1800,
  face: NORTH_EDGE + 90,
  depth: 80,
} as const;

/** The door, in the middle of the sea face; how near a boat must stop to it, and how slow it must be. */
export const BRIDGE_DOOR = { x: METAL_BRIDGE.x, y: METAL_BRIDGE.face } as const;
export const DOOR_REACH = 170;
export const DOOR_STOP = 25;

/** Within this of the bridge, it is seen: the sighting, and its mark on the sea map; short of the abyss and island
 * 11's dock, so their own sightings are not talked over. */
export const BRIDGE_SIGHT = 700;

/** How far the tar ocean is drawn past the edge. */
export const TAR_OCEAN = 1600;

/** Something with a position and a speed that can be shoved: a hull is kept off the bridge's sea face. */
export function pushOffMetalBridge(s: { x: number; y: number; v: number }, pad: number): void {
  const x0 = METAL_BRIDGE.x - METAL_BRIDGE.len / 2 - pad;
  const x1 = METAL_BRIDGE.x + METAL_BRIDGE.len / 2 + pad;
  const y1 = METAL_BRIDGE.face + pad;
  if (s.x < x0 || s.x > x1 || s.y > y1) return;
  s.y = y1;
  s.v *= 0.6;
}

/** How far a point is from the bridge, along and across it. */
export function bridgeDistance(x: number, y: number): number {
  const dx = Math.max(0, Math.abs(x - METAL_BRIDGE.x) - METAL_BRIDGE.len / 2);
  const dy = Math.max(0, y - METAL_BRIDGE.face);
  return Math.hypot(dx, dy);
}

/** A boat stopped at the door. */
export function atBridgeDoor(x: number, y: number, v: number): boolean {
  return Math.abs(v) < DOOR_STOP && Math.hypot(x - BRIDGE_DOOR.x, y - BRIDGE_DOOR.y) < DOOR_REACH;
}
