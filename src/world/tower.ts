/**
 * Island 2's tower, climbed as a little dungeon: two floors of monkeys and the
 * roof, where the sorcerer waits. The floors are rooms in a pocket of the world
 * far from any sea, so the figure walks, throws and is bonked in them exactly as
 * it does outside; the game draws them as stone rooms lit by torches, and the
 * roof under the sky. The figure arrives at the front of each room, nearest the
 * viewer, and the stairs up appear at the back once the room is beaten.
 */

import { TOWER } from './isle2';

export type Room = { x: number; y: number; r: number; roof: boolean };

export const ROOM_R = 130;
export const ROOMS: readonly Room[] = [
  { x: -6000, y: -6000, r: ROOM_R, roof: false },
  { x: -6000, y: -6900, r: ROOM_R, roof: false },
  { x: -6000, y: -7800, r: ROOM_R + 20, roof: true },
];
/** The roof's index in ROOMS. */
export const ROOF = ROOMS.length - 1;

const D = Math.SQRT1_2;
/** Where the figure arrives on a floor: the front of the room, toward the viewer. */
export function entry(i: number): { x: number; y: number } {
  const r = ROOMS[i] as Room;
  return { x: r.x + r.r * 0.55 * D, y: r.y + r.r * 0.55 * D };
}
/** Where the stairs up stand: the back of the room. */
export function stairs(i: number): { x: number; y: number } {
  const r = ROOMS[i] as Room;
  return { x: r.x - r.r * 0.6 * D, y: r.y - r.r * 0.6 * D };
}

/** The doorstep outside the tower's door, on its face toward the viewer. */
export const DOOR = { x: TOWER.x + 46 * D, y: TOWER.y + 46 * D } as const;
/** How near the doorstep, or the stairs, the figure must be to use them. */
export const STEP = 24;

/** The room a point is in, or -1. */
export function roomAt(x: number, y: number): number {
  return ROOMS.findIndex((r) => Math.hypot(x - r.x, y - r.y) < r.r + 30);
}

/** Dry floor inside a room, kept off its walls. */
export function onFloor(x: number, y: number): boolean {
  return ROOMS.some((r) => Math.hypot(x - r.x, y - r.y) <= r.r - 12);
}
