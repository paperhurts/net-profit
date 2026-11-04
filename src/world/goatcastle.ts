/**
 * Sir Bucksworth XIV's castle on Goat Isle (part three of the owner's plan, her "cheese wheel castle"): a giant wheel
 * of cheese standing on the hill at the back of the island, windows cut in it and a wedge cut out of its front for a
 * gate, flags on top. Through its gate is the Hall of Portraits, the thirteen Bucksworths before him and the court
 * round its back wall; through the door at the back of the hall, his throne room, where he sits and tells jokes
 * (data/bucksworth.ts). The two rooms are GOAT_HALL and GOAT_THRONE in world/tower.ts's ROOMS; this says where the
 * castle stands, where its gate is, and where everything inside stands.
 */
import { PORTRAITS } from '../data/bucksworth';
import { CASTLE15 } from './goatisle';
import { GOAT_HALL, GOAT_THRONE, ROOMS, type Room } from './tower';

const D = Math.SQRT1_2;

/** Its gate, cut into the front toward the viewer, and the doorstep before it. */
export const CASTLE15_GATE = {
  x: CASTLE15.x + CASTLE15.r * D,
  y: CASTLE15.y + CASTLE15.r * D,
} as const;
export const CASTLE15_DOOR = {
  x: CASTLE15.x + (CASTLE15.r + 12) * D,
  y: CASTLE15.y + (CASTLE15.r + 12) * D,
} as const;
/** How near the doorstep the figure must be to go in. */
export const CASTLE15_REACH = 22;

const room = (i: number): Room => ROOMS[i] as Room;

/** A point at angle a round room i, d in from its wall. */
export function onWall15(i: number, a: number, d: number): { x: number; y: number } {
  const r = room(i);
  return { x: r.x + Math.cos(a) * (r.r - d), y: r.y + Math.sin(a) * (r.r - d) };
}

/**
 * The portraits round the hall's back wall, oldest at the left, hung in two staggered rows the way a crowded gallery
 * hangs them, so all nineteen fit across a phone's narrow screen. Spaced evenly across the screen rather than round the
 * wall, which would bunch them up at the sides; the middle of the back is left for the door to the throne room.
 * Each is an angle round the wall and a height on it.
 */
const SPREAD = 0.86;
const DOOR_GAP = 0.13;
export const PORTRAIT_AT: readonly number[] = (() => {
  const n = PORTRAITS.length;
  return PORTRAITS.map((_, i) => {
    // Across the screen from -SPREAD to SPREAD, the door's gap left out of the middle.
    let u = -SPREAD + ((2 * SPREAD - 2 * DOOR_GAP) * i) / (n - 1);
    if (u > -DOOR_GAP) u += 2 * DOOR_GAP;
    // On the back half of the wall, the point whose x - y (the screen's across) is u of the way out.
    return 2 * Math.PI - Math.acos(u) - Math.PI / 4;
  });
})();
/** How high each portrait hangs: the two rows, by turns. */
export const PORTRAIT_Z: readonly number[] = PORTRAITS.map((_, i) => (i % 2 ? 22 : 46));
/** The door at the back of the hall into the throne room: the middle of the back wall. */
export const HALL_DOOR_A = (5 * Math.PI) / 4;
/** The throne, at the back of the throne room, and where Sir Bucksworth is asked for a joke. */
export const THRONE_AT = (): { x: number; y: number } => onWall15(GOAT_THRONE, Math.PI * 1.25, 34);

/** How near a portrait, a door or the king the figure must be for the button. */
export const PLAQUE_REACH = 26;
export const DOOR15_REACH = 34;
export const KING_REACH = 50;

/** What the button does inside the castle, from where the figure stands: read a plaque, go through, or ask a joke. */
export function castleAction(i: number, x: number, y: number): string | null {
  const near = (p: { x: number; y: number }, r: number) => Math.hypot(x - p.x, y - p.y) < r;
  if (i === GOAT_HALL) {
    // Whatever is nearest of the door and the portraits, within its reach: the door stands between two of them.
    const door = onWall15(GOAT_HALL, HALL_DOOR_A, 14);
    let best: string | null = null;
    let bd = Number.POSITIVE_INFINITY;
    const dd = Math.hypot(x - door.x, y - door.y);
    if (dd < DOOR15_REACH) {
      best = 'gthrone';
      bd = dd;
    }
    PORTRAIT_AT.forEach((a, k) => {
      const p = onWall15(GOAT_HALL, a, 16);
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < PLAQUE_REACH && d < bd) {
        bd = d;
        best = `gplaque-${k}`;
      }
    });
    return best;
  }
  if (i === GOAT_THRONE) {
    if (near(THRONE_AT(), KING_REACH)) return 'gjoke';
  }
  return null;
}
