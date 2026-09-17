/**
 * The boat's steering, moved verbatim from the prototype script. The input is
 * a screen-space vector from the joystick or the keys; the boat turns toward
 * its world direction, throttles by how hard and how straight it points, eases
 * its speed, and moves. This is half of the feel (the net is the other half),
 * so tests/unit/boat.test.ts evaluates the legacy code itself against this.
 */

import { dirToWorld } from '../core/iso';
import { angDiff, clamp } from '../core/math';

export type Boat = { x: number; y: number; h: number; v: number };

/** Turn rate in radians per second at full speed... */
export const TURN_BASE = 2.6;
/** ...plus this much more when stopped, fading out as speed rises. */
export const TURN_SLOW_BONUS = 1.2;
/** How quickly speed eases up toward the throttle, and down away from it. */
export const ACCEL = 2.4;
export const DECEL = 1.3;
/** Even pointing straight astern keeps a quarter throttle, so a U-turn does not stall. */
export const MIN_THROTTLE = 0.25;

/**
 * One step: turn toward the input, set the throttle, ease the speed, move.
 * An input of zero coasts to a stop. maxV is the engine's top speed.
 */
export function steerBoat(boat: Boat, ix: number, iy: number, maxV: number, dt: number): void {
  const mag = Math.hypot(ix, iy);
  let targetV = 0;
  if (mag > 0) {
    const w = dirToWorld(ix, iy);
    const diff = angDiff(Math.atan2(w[1], w[0]), boat.h);
    const turn = (TURN_BASE + TURN_SLOW_BONUS * (1 - boat.v / maxV)) * dt;
    boat.h += clamp(diff, -turn, turn);
    targetV = maxV * mag * Math.max(MIN_THROTTLE, Math.cos(diff));
  }
  boat.v += (targetV - boat.v) * Math.min(1, dt * (targetV > boat.v ? ACCEL : DECEL));
  boat.x += Math.cos(boat.h) * boat.v * dt;
  boat.y += Math.sin(boat.h) * boat.v * dt;
}
