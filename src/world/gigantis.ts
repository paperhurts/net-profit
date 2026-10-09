/**
 * Gigantis, the kid's castle standing on the sea, reached through island 7's
 * portal once the sorcerer is beaten there. Its rooms are in the tower's pocket
 * of the world (world/tower.ts): a courtyard inside the gate, open to the green
 * sky, then two halls, each full of the undead (entities/undead.ts), and the
 * throne room beyond them. The figure comes through the portal at the front of
 * the courtyard, nearest the viewer; each room's door is at its back and opens
 * when everyone in the room is beaten. The way home is back through the portal.
 */

import type { Spawn } from '../entities/undead';
import { PORTAL7 } from './isle7';
import { GATE, HALL_A, HALL_B, ROOMS, type Room } from './tower';

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
};

/** The castle's rooms, in the order they are walked. */
export const CASTLE_ROOMS: readonly number[] = [GATE, HALL_A, HALL_B];

/** Where the figure comes out on island 7, back through the portal: just in front of the ring. */
export const PORTAL_OUT = { x: PORTAL7.x + 26, y: PORTAL7.y + 26 } as const;
