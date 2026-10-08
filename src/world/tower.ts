/**
 * The towers, climbed as little dungeons: island 2's, two floors of monkeys and
 * the roof, where the sorcerer waits; and island 3's, the same again, where he
 * waits a second time. The floors are rooms in a pocket of the world
 * far from any sea, so the figure walks, throws and is bonked in them exactly as
 * it does outside; the game draws them as stone rooms lit by torches, and the
 * roof under the sky. The figure arrives at the front of each room, nearest the
 * viewer, and the stairs up appear at the back once the room is beaten.
 */

import { TOWER } from './isle2';

export type Room = { x: number; y: number; r: number; roof: boolean };

export const ROOM_R = 130;
export const ROOMS: readonly Room[] = [
  // Island 2's tower.
  { x: -6000, y: -6000, r: ROOM_R, roof: false },
  { x: -6000, y: -6900, r: ROOM_R, roof: false },
  { x: -6000, y: -7800, r: ROOM_R + 20, roof: true },
  // Island 3's.
  { x: -7500, y: -6000, r: ROOM_R, roof: false },
  { x: -7500, y: -6900, r: ROOM_R, roof: false },
  { x: -7500, y: -7800, r: ROOM_R + 20, roof: true },
];
/** Island 2's roof, and island 3's, in ROOMS. */
export const ROOF = 2;
export const ROOF3 = 5;
/** Each tower: its first floor and its roof, in ROOMS. The floors between are climbed in order. */
export const TOWERS: readonly { first: number; roof: number }[] = [
  { first: 0, roof: ROOF },
  { first: 3, roof: ROOF3 },
];

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

/** The doorstep outside island 2's tower door, on its face toward the viewer. Island 3's is DOOR3. */
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
