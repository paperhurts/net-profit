/**
 * Steering for ships that are not the player's, moved verbatim from the
 * prototype script. Turn toward the target at a fixed rate, throttle down as
 * the turn gets sharper, ease the speed, move. The pirate uses it today; a
 * coast guard cutter would too.
 */

import { angDiff, clamp } from '../core/math';

export type Ship = { x: number; y: number; h: number; v: number };

/** What a ship looks like to the renderer; the names match the prototype's drawShip options. */
export type ShipLook = {
  scale: number;
  hull: string;
  trim: string;
  deck: string;
  cabin: string;
  roof: string;
  mast: string;
  flag: string;
  sail?: string;
  heap?: number;
};

export function steerShip(
  s: Ship,
  tx: number,
  ty: number,
  maxV: number,
  turn: number,
  dt: number,
): void {
  const diff = angDiff(Math.atan2(ty - s.y, tx - s.x), s.h);
  s.h += clamp(diff, -turn * dt, turn * dt);
  const tv = maxV * Math.max(0.3, Math.cos(diff));
  s.v += (tv - s.v) * Math.min(1, dt * 1.6);
  s.x += Math.cos(s.h) * s.v * dt;
  s.y += Math.sin(s.h) * s.v * dt;
}
