/**
 * Gigantis, the kid's castle standing on the sea, reached through island 7's
 * portal once the sorcerer is beaten there. Its rooms are in the tower's pocket
 * of the world (world/tower.ts): a courtyard inside the gate, open to the green
 * sky, then two halls, each full of the undead (entities/undead.ts), and the
 * throne room beyond them, where three necromancers stand round the Forgotten
 * One (entities/forgotten.ts) in front of his throne, and behind the throne a
 * locked door the kid left for next time. The figure comes through the portal at the front of
 * the courtyard, nearest the viewer; each room's door is at its back and opens
 * when everyone in the room is beaten. The way home is back through the portal.
 */

import type { Spawn } from '../entities/undead';
import { PORTAL7 } from './isle7';
import { GATE, HALL_A, HALL_B, ROOMS, type Room, THRONE } from './tower';

const at = (room: number, dx: number, dy: number): { x: number; y: number } => {
  const r = ROOMS[room] as Room;
  return { x: r.x + dx, y: r.y + dy };
};

/** Who stands in each room when the figure comes in: toward the back, a fair way off the way in. */
export const CASTLE_SPAWNS: Readonly<Record<number, readonly Spawn[]>> = {
  [GATE]: [
    { kind: 'skeleton', ...at(GATE, -40, -75) },
    { kind: 'skeleton', ...at(GATE, -75, -40) },
    { kind: 'skeleton', ...at(GATE, -10, -100) },
    { kind: 'archer', ...at(GATE, -95, -95) },
    { kind: 'archer', ...at(GATE, -115, -20) },
  ],
  [HALL_A]: [
    { kind: 'zombie', ...at(HALL_A, -30, -65) },
    { kind: 'zombie', ...at(HALL_A, -65, -30) },
    { kind: 'zombie', ...at(HALL_A, -85, -85) },
    { kind: 'ghost', ...at(HALL_A, -105, -45) },
    { kind: 'ghost', ...at(HALL_A, -45, -105) },
  ],
  [HALL_B]: [
    { kind: 'necro', ...at(HALL_B, -90, -90) },
    { kind: 'necro', ...at(HALL_B, -110, 10) },
    { kind: 'skeleton', ...at(HALL_B, -40, -40) },
    { kind: 'archer', ...at(HALL_B, -105, -45) },
    { kind: 'archer', ...at(HALL_B, -25, -105) },
  ],
  [THRONE]: [
    { kind: 'necro', ...at(THRONE, -135, 10) },
    { kind: 'necro', ...at(THRONE, 10, -135) },
    { kind: 'necro', ...at(THRONE, -140, -70) },
  ],
};

const D = Math.SQRT1_2;
const throne = ROOMS[THRONE] as Room;
/** The throne, at the back of its room: its middle and half its width. */
export const SEAT = {
  x: throne.x - throne.r * 0.44 * D,
  y: throne.y - throne.r * 0.44 * D,
  r: 16,
} as const;
/** Where the Forgotten One stands when the figure comes in: in front of his throne. */
export const FORGOTTEN_START = { x: SEAT.x + 34, y: SEAT.y + 34 } as const;
/** The locked door in the back wall behind the throne, for next time, and how near it must be to try it. */
export const LOCKED = {
  x: throne.x - (throne.r - 4) * D,
  y: throne.y - (throne.r - 4) * D,
} as const;
export const LOCKED_REACH = 40;

/** The castle's rooms, in the order they are walked. */
export const CASTLE_ROOMS: readonly number[] = [GATE, HALL_A, HALL_B, THRONE];

/** Where the figure comes out on island 7, back through the portal: just in front of the ring. */
export const PORTAL_OUT = { x: PORTAL7.x + 26, y: PORTAL7.y + 26 } as const;
