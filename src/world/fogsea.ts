/**
 * The fog sea (2026-11-08), the kid's "a new THE DEEP area", "a NEW OCEAN AREA" where Tomb Island lives, and his
 * "MORE fog", with the owner's answers to what they mean: a sea of its own, as the tar ocean is its own place, reached
 * through a wall of fog; the whole of it fog; Tomb Island in its middle, much bigger than it was. The wall stood in the
 * deep's west at first, where Tomb Island used to stand; the kid's word through the owner the same evening was that
 * Tomb Island is past the white buoys, so the wall stands out there now, due west of home in the far far sea.
 *
 * It is a pocket of the world far out past the far far sea's west edge, where nothing else is, so everything that
 * works at sea works in it. Sail into the fog wall in the far far sea and you come out at its east end; sail into the
 * fog wall there and you are back beside the first. Its other edges are fog for ever: the boat is held in.
 */
import { DEEP, FAR, FARFAR, IY } from './island';

/** Its bounds in the world: west of the far far sea's edge by a good margin, with home's latitude through its middle. */
export const FOG_SEA = { x0: -11400, x1: -6800, y0: IY - 2200, y1: IY + 2200 } as const;
/** Its middle, where Tomb Island stands. */
export const FOG_MID = {
  x: (FOG_SEA.x0 + FOG_SEA.x1) / 2,
  y: (FOG_SEA.y0 + FOG_SEA.y1) / 2,
} as const;

/** In the fog sea, give or take pad. */
export function inFogSea(x: number, y: number, pad = 0): boolean {
  return (
    x > FOG_SEA.x0 - pad && x < FOG_SEA.x1 + pad && y > FOG_SEA.y0 - pad && y < FOG_SEA.y1 + pad
  );
}

/**
 * The fog wall past the white buoys: due west of home, beyond island 5, halfway across the far far sea, in open water
 * (the kid's "past the white buoys", 2026-11-08). So it is reached once the far far sea is open, as island 11 is.
 */
export const FOG_GATE = { x: -(DEEP + FAR) - FARFAR / 2, y: IY, r: 110 } as const;
/** The fog wall at the fog sea's east end, the way back. */
export const FOG_EXIT = { x: FOG_SEA.x1 - 120, y: IY, r: 110 } as const;
/** Where the boat comes out: just inside the fog sea, heading in; and beside the first wall, clear of it, heading home. */
export const FOG_IN = { x: FOG_EXIT.x - 260, y: IY, h: Math.PI } as const;
export const FOG_OUT = { x: FOG_GATE.x + 260, y: IY, h: 0 } as const;
/** How far round the boat is seen in the fog sea. */
export const SIGHT_SEA = 260;

/** Hold a hull inside the fog sea; returns whether it was held. */
export function holdInFogSea(s: { x: number; y: number; v: number }, edge = 40): boolean {
  const x = Math.min(FOG_SEA.x1 - edge, Math.max(FOG_SEA.x0 + edge, s.x));
  const y = Math.min(FOG_SEA.y1 - edge, Math.max(FOG_SEA.y0 + edge, s.y));
  const held = x !== s.x || y !== s.y;
  s.x = x;
  s.y = y;
  if (held) s.v *= 0.9;
  return held;
}

/** Far past everything else in the world, so nothing at sea there reaches it. */
export const FOG_SEA_CLEAR = -(DEEP + FAR + FARFAR) - FOG_SEA.x1;
