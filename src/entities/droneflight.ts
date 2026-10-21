/**
 * The drone's flight through island 11's jungle, the owner's (2026-10-21, after a short of a man fishing with a drone:
 * "use a drone to fly through the jungle, a cool obstacle course"; "more Star Fighter"; "gentle"). Seen from just
 * behind the drone, flying on into the screen down a corridor of jungle between the island's trees: trunks to weave
 * round, branches to go over or under, curtains of vines hanging from the canopy to duck beneath, fallen logs to hop,
 * and glowing rings to fly through. The thumb steers it left, right, up and down; it flies on by itself.
 *
 * Gentle: a bump costs battery and a moment's speed, nothing more, and it carries on past whatever it hit. The battery
 * runs down as it flies, too. Empty, the drone turns for home and the flight is over; at the course's end it is made.
 *
 * The course is a corridor along z (metres flown), x across it (0 down its middle) and y up from the jungle floor to the
 * canopy. Each gate across it is laid out from the course's seed, so a course is the same every time it is flown, and
 * each leaves a way through.
 */

import { clamp, rng } from '../core/math';

/** Half the corridor's width, and the canopy's height over the floor, in metres. */
export const LANE_HALF = 6;
export const CANOPY = 5;
/** How far round the drone is, for its bumps. */
export const DRONE_R = 0.45;
/** Metres a second: on forward by itself; across and up at most, under the thumb. */
export const CRUISE = 14;
export const SIDE_SPEED = 7;
export const CLIMB_SPEED = 5;
/** How quickly it answers the thumb (per second). */
export const AGILITY = 6;
/** The battery, out of 100: what a second's flying takes, and a bump. */
export const BATTERY = 100;
export const DRAIN = 0.9;
export const BUMP = 8;
/** After a bump, its speed is cut to this much of the cruise for this long. */
export const BUMP_SLOW = 0.55;
export const BUMP_T = 0.7;
/** The course's length in metres, and the gap between its gates. */
export const COURSE = 900;
export const GATE_GAP_MIN = 18;
export const GATE_GAP_MAX = 26;
/** No gates this near the start, so the first moments are for getting the feel of it. */
export const RUN_IN = 40;
/** A ring's radius: fly through its middle. */
export const RING_R = 1.1;

export type Obstacle =
  /** A tree trunk, floor to canopy, this wide either side of x. */
  | { kind: 'trunk'; z: number; x: number; r: number }
  /** A branch across part of the way, at height y, from x0 to x1. */
  | { kind: 'branch'; z: number; y: number; x0: number; x1: number }
  /** Vines hanging from the canopy down to `bottom`, from x0 to x1. */
  | { kind: 'vines'; z: number; bottom: number; x0: number; x1: number }
  /** A fallen log right across, up to `top`. */
  | { kind: 'log'; z: number; top: number }
  /** A glowing ring to fly through, round (x, y). */
  | { kind: 'ring'; z: number; x: number; y: number; got: boolean };

export type FlightState = 'fly' | 'home' | 'done';

/** The thickness of a branch, about its middle. */
const BRANCH_T = 0.35;

/** The gates of a course: from its seed, the same every time. */
export function layCourse(seed: number, len = COURSE): Obstacle[] {
  const R = rng(seed);
  const out: Obstacle[] = [];
  const lo = -LANE_HALF + 1;
  const hi = LANE_HALF - 1;
  for (let z = RUN_IN; z < len - 20; z += GATE_GAP_MIN + R() * (GATE_GAP_MAX - GATE_GAP_MIN)) {
    const pick = R();
    if (pick < 0.24) {
      // A trunk, and a ring beside it in the way round.
      const x = lo + R() * (hi - lo);
      const r = 0.8 + R() * 0.6;
      out.push({ kind: 'trunk', z, x, r });
      const side = x > 0 ? -1 : 1;
      out.push({
        kind: 'ring',
        z,
        x: clamp(x + side * (r + 2), lo, hi),
        y: 1.5 + R() * 2,
        got: false,
      });
    } else if (pick < 0.42) {
      // Two trunks with a gap between them to thread.
      const gap = 2.6 + R() * 1.2;
      const mid = (R() * 2 - 1) * (LANE_HALF - gap);
      const r = 0.9 + R() * 0.5;
      out.push({ kind: 'trunk', z, x: mid - gap / 2 - r, r });
      out.push({ kind: 'trunk', z, x: mid + gap / 2 + r, r });
      out.push({ kind: 'ring', z: z + 0.5, x: mid, y: 1.4 + R() * 2.2, got: false });
    } else if (pick < 0.6) {
      // A branch out from one side, low or high: over it or under it.
      const fromLeft = R() < 0.5;
      const reach = 6 + R() * 4;
      const y = 1.3 + R() * 2.4;
      out.push({
        kind: 'branch',
        z,
        y,
        x0: fromLeft ? -LANE_HALF : LANE_HALF - reach,
        x1: fromLeft ? -LANE_HALF + reach : LANE_HALF,
      });
    } else if (pick < 0.78) {
      // Vines from the canopy over half the way: duck under them, or go round.
      const fromLeft = R() < 0.5;
      const bottom = 2.2 + R() * 1.2;
      out.push({
        kind: 'vines',
        z,
        bottom,
        x0: fromLeft ? -LANE_HALF : 0,
        x1: fromLeft ? 0 : LANE_HALF,
      });
      out.push({ kind: 'ring', z: z + 0.5, x: fromLeft ? 3 : -3, y: 2.6 + R() * 1.4, got: false });
    } else {
      // A fallen log right across: hop it, a ring over it.
      const top = 1.2 + R() * 0.8;
      out.push({ kind: 'log', z, top });
      out.push({ kind: 'ring', z: z + 0.5, x: (R() * 2 - 1) * 3, y: top + 1.4, got: false });
    }
  }
  return out;
}

/** Whether a drone at (x, y) is in the way of an obstacle, its blade tips and all. */
export function strikes(o: Obstacle, x: number, y: number): boolean {
  switch (o.kind) {
    case 'trunk':
      return Math.abs(x - o.x) < o.r + DRONE_R;
    case 'branch':
      return x > o.x0 - DRONE_R && x < o.x1 + DRONE_R && Math.abs(y - o.y) < BRANCH_T + DRONE_R;
    case 'vines':
      return x > o.x0 - DRONE_R && x < o.x1 + DRONE_R && y > o.bottom - DRONE_R;
    case 'log':
      return y < o.top + DRONE_R;
    default:
      return false;
  }
}

export class DroneFlight {
  /** Across the corridor, up from the floor, and how far it has come. */
  x = 0;
  y = 1.8;
  z = 0;
  vx = 0;
  vy = 0;
  battery: number;
  state: FlightState = 'fly';
  /** Seconds left of a bump's slowing; for the drawing, a bump's flash. */
  slowT = 0;
  flash = 0;
  /** Rings flown through. */
  rings = 0;
  bumps = 0;
  readonly gates: Obstacle[];
  onBump: ((o: Obstacle) => void) | null = null;
  onRing: ((o: Obstacle) => void) | null = null;
  onEnd: ((state: FlightState) => void) | null = null;

  constructor(
    readonly seed = 1101,
    readonly len = COURSE,
    battery = BATTERY,
  ) {
    this.gates = layCourse(seed, len);
    this.battery = battery;
  }

  /** How many rings the course has. */
  get ringsOut(): number {
    return this.gates.filter((o) => o.kind === 'ring').length;
  }

  /** How far through the course, 0 to 1. */
  get progress(): number {
    return clamp(this.z / this.len, 0, 1);
  }

  /** A step, the thumb's stick at (sx, sy): right and down positive, as on the screen. */
  step(dt: number, sx: number, sy: number): void {
    if (this.state !== 'fly') return;
    this.flash = Math.max(0, this.flash - dt);
    this.slowT = Math.max(0, this.slowT - dt);
    const k = Math.min(1, AGILITY * dt);
    this.vx += (clamp(sx, -1, 1) * SIDE_SPEED - this.vx) * k;
    this.vy += (-clamp(sy, -1, 1) * CLIMB_SPEED - this.vy) * k;
    this.x = clamp(this.x + this.vx * dt, -LANE_HALF + DRONE_R, LANE_HALF - DRONE_R);
    this.y = clamp(this.y + this.vy * dt, DRONE_R + 0.1, CANOPY - DRONE_R - 0.1);
    const was = this.z;
    this.z += CRUISE * (this.slowT > 0 ? BUMP_SLOW : 1) * dt;
    // Whatever it has just passed: a ring flown through, or something in its way.
    for (const o of this.gates) {
      if (o.z <= was || o.z > this.z) continue;
      if (o.kind === 'ring') {
        if (!o.got && Math.hypot(this.x - o.x, this.y - o.y) < RING_R) {
          o.got = true;
          this.rings++;
          this.onRing?.(o);
        }
      } else if (strikes(o, this.x, this.y)) this.bump(o);
    }
    this.battery = Math.max(0, this.battery - DRAIN * dt);
    if (this.z >= this.len) this.end('done');
    else if (this.battery <= 0) this.end('home');
  }

  /** A bump: battery and a moment's speed, and knocked a little clear of what it hit. */
  private bump(o: Obstacle): void {
    this.battery = Math.max(0, this.battery - BUMP);
    this.bumps++;
    this.slowT = BUMP_T;
    this.flash = 0.35;
    if (o.kind === 'trunk') this.vx = Math.sign(this.x - o.x || 1) * SIDE_SPEED;
    else if (o.kind === 'log') this.vy = CLIMB_SPEED;
    else if (o.kind === 'vines') this.vy = -CLIMB_SPEED;
    else if (o.kind === 'branch') this.vy = Math.sign(this.y - o.y || 1) * CLIMB_SPEED;
    this.onBump?.(o);
  }

  private end(state: FlightState): void {
    this.state = state;
    this.onEnd?.(state);
  }
}
