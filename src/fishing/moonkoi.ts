/**
 * The Moonkoi's fight, in the Garden Isle's lily pond (part nine): the snook's own fight (fishing/snook.ts Fight), a
 * keeper's, played on foot from the pond's edge. Hold the button to pull while it sulks; let go when it shakes its head,
 * because a run on a tight line parts it. It runs for the reeds on the far side of the pond: let it reach them and it is
 * gone. A tell before every run but the first, as the snook has, so a person's thumb can play it.
 */

import { Fight, MAX_DISTANCE } from './snook';

/** What it is played as: a keeper snook, the owner's "snook-level, a fair fight". */
export const KOI_KIND = 'keeper' as const;

/** A fresh fight on the Moonkoi. */
export function koiFight(rng: () => number): Fight {
  return new Fight(rng, KOI_KIND);
}

/**
 * Where the hooked Moonkoi is in the pond, with the figure at fx, fy on its edge: on the line from the reeds across the
 * pond (d 0) to just short of the figure (d at its most), swinging a little as it fights.
 */
export function koiSpot(
  pond: { x: number; y: number; r: number },
  fx: number,
  fy: number,
  d: number,
  sway = 0,
): { x: number; y: number } {
  const dx = fx - pond.x;
  const dy = fy - pond.y;
  const n = Math.hypot(dx, dy) || 1;
  const ux = dx / n;
  const uy = dy / n;
  // From the far rim to a little inside the near one.
  const far = pond.r - 6;
  const near = pond.r - 14;
  const k = Math.max(0, Math.min(1, d / MAX_DISTANCE));
  const along = -far + k * (far + near);
  return { x: pond.x + ux * along - uy * sway, y: pond.y + uy * along + ux * sway };
}

/** The words over it as it goes, lost: the line parted, or into the reeds. */
export function koiLostWords(lost: 'snap' | 'piling' | null): string {
  return lost === 'snap' ? 'The line parted' : 'Into the reeds';
}
