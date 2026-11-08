/**
 * Inside the castle in the middle of Tomb Island (part six), the kid's: his castle has "all": rooms, floors, traps.
 * It is climbed the way the towers are (world/tower.ts): in through its great door once the big necromancer before it
 * is beaten, then three floors of the undead, each opening its stairs at the back once everyone on it is down, and at
 * the top the necromancer's own hall, empty for now but for his throne and a great tomb (part seven brings him).
 *
 * The first floor is a hall of skeletons and zombies; the second has spike traps in its floor that shoot up in turn,
 * a heart if you are standing on one, and ghosts; the third a mummy, a vampire and a necromancer. What holds each floor
 * and how the traps run are my picks, hers to change.
 */
import type { Spawn } from '../entities/undead';
import { ROOMS, type Room, TOMB_FLOORS, TOMB_TOP } from './tower';

const room = (i: number): Room => ROOMS[i] as Room;
/** A point in room i, at an offset from its middle. */
const at = (i: number, dx: number, dy: number) => ({ x: room(i).x + dx, y: room(i).y + dy });

/** Who holds each floor, standing toward its back, away from where the figure comes in at its front. */
export const TOMB_SPAWNS: Readonly<Record<number, readonly Spawn[]>> = {
  [TOMB_FLOORS[0] as number]: [
    { kind: 'skeleton', ...at(TOMB_FLOORS[0] as number, -70, -20) },
    { kind: 'skeleton', ...at(TOMB_FLOORS[0] as number, -20, -70) },
    { kind: 'zombie', ...at(TOMB_FLOORS[0] as number, -90, -80) },
    { kind: 'zombie', ...at(TOMB_FLOORS[0] as number, 10, -20) },
  ],
  [TOMB_FLOORS[1] as number]: [
    { kind: 'ghost', ...at(TOMB_FLOORS[1] as number, -90, -40) },
    { kind: 'ghost', ...at(TOMB_FLOORS[1] as number, -40, -90) },
    { kind: 'skeleton', ...at(TOMB_FLOORS[1] as number, -50, -50) },
  ],
  [TOMB_FLOORS[2] as number]: [
    { kind: 'mummy', ...at(TOMB_FLOORS[2] as number, -80, -20) },
    { kind: 'vampire', ...at(TOMB_FLOORS[2] as number, -20, -80) },
    { kind: 'necro', ...at(TOMB_FLOORS[2] as number, -95, -95) },
  ],
};

/** The trap floor: spike plates set in its floor, a 3 by 3 grid across its middle, two sets taking turns. */
export const TRAP_FLOOR = TOMB_FLOORS[1] as number;
export const SPIKE_R = 15;
export const SPIKES: readonly { x: number; y: number; set: number }[] = (() => {
  const out: { x: number; y: number; set: number }[] = [];
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++) {
      // Not the corners where the figure comes in (the front) and where the stairs up stand (the back).
      if (i === j && i !== 0) continue;
      out.push({ ...at(TRAP_FLOOR, i * 52, j * 52), set: (i + j + 2) % 2 });
    }
  return out;
})();
/** One cycle of the traps, and how long a set's spikes stand up in it; the second set half a cycle after the first. */
export const SPIKE_CYCLE = 2.4;
export const SPIKE_UP = 0.8;
/** How far up a set's spikes are at time t (0 down, 1 up), with a short rise and fall at either end. */
export function spikesUp(set: number, t: number): number {
  const p = (((t + (set * SPIKE_CYCLE) / 2) % SPIKE_CYCLE) + SPIKE_CYCLE) % SPIKE_CYCLE;
  if (p > SPIKE_UP) return 0;
  return Math.min(1, p / 0.1, (SPIKE_UP - p) / 0.1);
}
/** The plate a point stands on, if any. */
export function spikeAt(x: number, y: number): { x: number; y: number; set: number } | null {
  return SPIKES.find((s) => Math.abs(x - s.x) < SPIKE_R && Math.abs(y - s.y) < SPIKE_R) ?? null;
}

/** The top: the necromancer's throne at its back, and the great tomb before it. */
export const TOP_THRONE = at(TOMB_TOP, -95, -95);
export const TOP_TOMB = at(TOMB_TOP, -30, -30);
