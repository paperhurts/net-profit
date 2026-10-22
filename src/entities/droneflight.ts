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
 *
 * Bug traps (the owner's, the same day: "set traps to catch a certain kind of bug"): a few of the rings along the way
 * are big orange flowers instead, where jewel beetles come. Fly through one's middle with a trap aboard and a trap is
 * hung there; by the next day it is full, and flying through again brings the beetles home and the trap back.
 */

import { clamp, rng } from '../core/math';
import { BEETLES_PER_TRAP, TRAP_SPOTS } from '../data/drone';

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
  | { kind: 'ring'; z: number; x: number; y: number; got: boolean }
  /** A flower where a bug trap hangs, round (x, y): the spot'th along the course. */
  | { kind: 'trap'; z: number; x: number; y: number; spot: number };

/** A trap spot: nothing hung there, a trap filling, or a trap full of beetles. */
export type TrapState = 'empty' | 'hung' | 'full';
/** What happened at a trap spot: a trap hung, beetles brought home, one still filling, or no trap aboard to hang. */
export type TrapEvent = 'hung' | 'got' | 'filling' | 'none';

/** Which of the course's rings are trap flowers instead, counting from the first: spread along it, one in seven. */
const TRAP_EVERY = 7;
const TRAP_FIRST = 3;

export type FlightState = 'fly' | 'home' | 'done';

/** The thickness of a branch, about its middle. */
const BRANCH_T = 0.35;

/** The gates of a course: from its seed, the same every time. */
export function layCourse(seed: number, len = COURSE): Obstacle[] {
  const R = rng(seed);
  const out: Obstacle[] = [];
  // Rings, a few of them trap flowers.
  let rings = 0;
  const ring = (z: number, x: number, y: number): Obstacle => {
    const i = rings++;
    const spot = (i - TRAP_FIRST) / TRAP_EVERY;
    return Number.isInteger(spot) && spot >= 0 && spot < TRAP_SPOTS
      ? { kind: 'trap', z, x, y, spot }
      : { kind: 'ring', z, x, y, got: false };
  };
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
      out.push(ring(z, clamp(x + side * (r + 2), lo, hi), 1.5 + R() * 2));
    } else if (pick < 0.42) {
      // Two trunks with a gap between them to thread.
      const gap = 2.6 + R() * 1.2;
      const mid = (R() * 2 - 1) * (LANE_HALF - gap);
      const r = 0.9 + R() * 0.5;
      out.push({ kind: 'trunk', z, x: mid - gap / 2 - r, r });
      out.push({ kind: 'trunk', z, x: mid + gap / 2 + r, r });
      out.push(ring(z + 0.5, mid, 1.4 + R() * 2.2));
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
      out.push(ring(z + 0.5, fromLeft ? 3 : -3, 2.6 + R() * 1.4));
    } else {
      // A fallen log right across: hop it, a ring over it.
      const top = 1.2 + R() * 0.8;
      out.push({ kind: 'log', z, top });
      out.push(ring(z + 0.5, (R() * 2 - 1) * 3, top + 1.4));
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
  /** How it handles (upgradable): how quickly it answers the thumb, and how fast across and up at most. */
  agility = AGILITY;
  side = SIDE_SPEED;
  climb = CLIMB_SPEED;
  /** Its battery's charge when full, for the bar. */
  readonly full: number;
  /** Each trap spot's state, the traps aboard, and the beetles brought home this flight. */
  readonly spots: TrapState[] = Array.from({ length: TRAP_SPOTS }, () => 'empty' as TrapState);
  carry = 0;
  beetles = 0;
  readonly gates: Obstacle[];
  onBump: ((o: Obstacle) => void) | null = null;
  onRing: ((o: Obstacle) => void) | null = null;
  onTrap: ((spot: number, what: TrapEvent) => void) | null = null;
  onEnd: ((state: FlightState) => void) | null = null;

  constructor(
    readonly seed = 1101,
    readonly len = COURSE,
    battery = BATTERY,
  ) {
    this.gates = layCourse(seed, len);
    this.battery = battery;
    this.full = battery;
  }

  /** How it handles, from its rotors' upgrade. */
  setHandling(h: { agility: number; side: number; climb: number }): void {
    this.agility = h.agility;
    this.side = h.side;
    this.climb = h.climb;
  }

  /** Where the traps are along the way, and how many it carries. */
  setTraps(spots: readonly TrapState[], carry: number): void {
    for (let i = 0; i < TRAP_SPOTS; i++) this.spots[i] = spots[i] ?? 'empty';
    this.carry = Math.max(0, carry);
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
    const k = Math.min(1, this.agility * dt);
    this.vx += (clamp(sx, -1, 1) * this.side - this.vx) * k;
    this.vy += (-clamp(sy, -1, 1) * this.climb - this.vy) * k;
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
      } else if (o.kind === 'trap') {
        if (Math.hypot(this.x - o.x, this.y - o.y) < RING_R) this.atTrap(o.spot);
      } else if (strikes(o, this.x, this.y)) this.bump(o);
    }
    this.battery = Math.max(0, this.battery - DRAIN * dt);
    if (this.z >= this.len) this.end('done');
    else if (this.battery <= 0) this.end('home');
  }

  /**
   * After the flight, the moment before it is put down: made, it flies on and up toward the canopy; flat, it slows to a
   * hover, about to turn for home. Nothing is in its way now.
   */
  drift(dt: number): void {
    if (this.state === 'fly') return;
    const k = Math.max(0, 1 - 3 * dt);
    this.flash = Math.max(0, this.flash - dt);
    this.vx *= k;
    this.vy *= k;
    if (this.state === 'done') {
      this.z += CRUISE * 0.6 * dt;
      this.y = Math.min(CANOPY - DRONE_R - 0.1, this.y + 0.8 * dt);
    } else this.z += CRUISE * 0.15 * dt;
  }

  /** Through a trap flower's middle: hang a trap there, or bring its beetles home. */
  private atTrap(spot: number): void {
    const s = this.spots[spot];
    if (s === 'full') {
      this.spots[spot] = 'empty';
      this.carry++;
      this.beetles += BEETLES_PER_TRAP;
      this.onTrap?.(spot, 'got');
    } else if (s === 'hung') this.onTrap?.(spot, 'filling');
    else if (this.carry > 0) {
      this.spots[spot] = 'hung';
      this.carry--;
      this.onTrap?.(spot, 'hung');
    } else this.onTrap?.(spot, 'none');
  }

  /** A bump: battery and a moment's speed, and knocked a little clear of what it hit. */
  private bump(o: Obstacle): void {
    this.battery = Math.max(0, this.battery - BUMP);
    this.bumps++;
    this.slowT = BUMP_T;
    this.flash = 0.35;
    if (o.kind === 'trunk') this.vx = Math.sign(this.x - o.x || 1) * this.side;
    else if (o.kind === 'log') this.vy = this.climb;
    else if (o.kind === 'vines') this.vy = -this.climb;
    else if (o.kind === 'branch') this.vy = Math.sign(this.y - o.y || 1) * this.climb;
    this.onBump?.(o);
  }

  private end(state: FlightState): void {
    this.state = state;
    this.onEnd?.(state);
  }
}
