/**
 * The towers, climbed as little dungeons: island 2's, two floors of monkeys and
 * the roof, where the sorcerer waits; island 3's, the same again, where he
 * waits a second time; island 7's, where he waits a third; and island 8's, where
 * his master the Heron waits behind two floors of hired men. The floors are
 * rooms in a pocket of the world far from any sea, so the figure walks, throws
 * and is bonked in them exactly as it does outside; the game draws them as
 * stone rooms lit by torches, and the roof under the sky. The figure arrives at the front of each room, nearest the
 * viewer, and the stairs up appear at the back once the room is beaten.
 */

import { TOWER } from './isle2';

/**
 * A stone floor, a roof under the sky, the hall under island 3's tower, the demon dimension, the drowned
 * temple, or Gigantis: its courtyard under the green sky, its halls, its throne room, and the ruins behind it.
 */
export type RoomKind =
  | 'floor'
  | 'roof'
  | 'hall'
  | 'demon'
  | 'temple'
  | 'court'
  | 'castle'
  | 'throne'
  | 'ruins';
export type Room = { x: number; y: number; r: number; roof: boolean; kind: RoomKind };

export const ROOM_R = 130;
export const ROOMS: readonly Room[] = [
  // Island 2's tower.
  { x: -6000, y: -6000, r: ROOM_R, roof: false, kind: 'floor' },
  { x: -6000, y: -6900, r: ROOM_R, roof: false, kind: 'floor' },
  { x: -6000, y: -7800, r: ROOM_R + 20, roof: true, kind: 'roof' },
  // Island 3's.
  { x: -7500, y: -6000, r: ROOM_R, roof: false, kind: 'floor' },
  { x: -7500, y: -6900, r: ROOM_R, roof: false, kind: 'floor' },
  { x: -7500, y: -7800, r: ROOM_R + 20, roof: true, kind: 'roof' },
  // Under island 3's tower, dived to: the swordsman's hall; and where he takes you, the demon dimension.
  { x: -9000, y: -6000, r: ROOM_R + 30, roof: false, kind: 'hall' },
  { x: -9000, y: -7000, r: ROOM_R + 40, roof: false, kind: 'demon' },
  // Under island 6, where the Deep One drags the boat: its drowned temple.
  { x: -10500, y: -6000, r: ROOM_R + 50, roof: false, kind: 'temple' },
  // Island 7's tower, where the sorcerer waits a third time.
  { x: -12000, y: -6000, r: ROOM_R, roof: false, kind: 'floor' },
  { x: -12000, y: -6900, r: ROOM_R, roof: false, kind: 'floor' },
  { x: -12000, y: -7800, r: ROOM_R + 20, roof: true, kind: 'roof' },
  // Gigantis, through island 7's portal: the courtyard inside its gate, and two halls.
  { x: -13500, y: -6000, r: ROOM_R + 40, roof: false, kind: 'court' },
  { x: -13500, y: -6900, r: ROOM_R + 30, roof: false, kind: 'castle' },
  { x: -13500, y: -7800, r: ROOM_R + 30, roof: false, kind: 'castle' },
  // And its throne room, where the Forgotten One waits.
  { x: -13500, y: -8800, r: ROOM_R + 60, roof: false, kind: 'throne' },
  // Behind the throne's locked door: the ruins.
  { x: -13500, y: -10000, r: ROOM_R + 90, roof: false, kind: 'ruins' },
  // Island 8's tower: two floors of the Heron's hired men, and the roof, where he waits.
  { x: -15000, y: -6000, r: ROOM_R, roof: false, kind: 'floor' },
  { x: -15000, y: -6900, r: ROOM_R, roof: false, kind: 'floor' },
  { x: -15000, y: -7800, r: ROOM_R + 30, roof: true, kind: 'roof' },
];
/** Island 2's roof, island 3's, island 7's and island 8's, in ROOMS. */
export const ROOF = 2;
export const ROOF3 = 5;
export const ROOF7 = 11;
export const ROOF8 = 19;
/** The hall under island 3's tower, and the demon dimension. */
export const HALL = 6;
export const DEMON = 7;
/** The drowned temple under island 6. */
export const TEMPLE6 = 8;
/** Gigantis: its courtyard, then its two halls, then its throne room, in order. */
export const GATE = 12;
export const HALL_A = 13;
export const HALL_B = 14;
export const THRONE = 15;
/** The ruins behind the throne, through its door once the Forgotten One's bones have given the key. */
export const RUINS = 16;
/** Each tower: its first floor and its roof, in ROOMS. The floors between are climbed in order. */
export const TOWERS: readonly { first: number; roof: number }[] = [
  { first: 0, roof: ROOF },
  { first: 3, roof: ROOF3 },
  { first: 9, roof: ROOF7 },
  { first: 17, roof: ROOF8 },
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

/** The demon dimension's cage, at the back of it, where the warlock is kept: its middle and half its width. */
export const CAGE = {
  x: (ROOMS[DEMON] as Room).x - 70,
  y: (ROOMS[DEMON] as Room).y - 70,
  r: 16,
} as const;
