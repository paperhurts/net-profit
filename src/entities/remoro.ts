/**
 * The Remoro, the kid's (his sixth list's answers: "as big as Star and worth 190"; the wizard books' Ramora, a silver
 * fish, renamed, and named the Remoro by him): one great silver fish on the abyss's floor (world/abyss.ts), as long as
 * Star, cruising slow laps over the floor in the dark, a sucker plate on its head as a real remora has. Spear it and
 * it flashes and darts off from the diver a moment, then cruises on; three spears land it, into the hold, worth 190.
 * Landed, it is gone until the next day.
 */

import { AD, AW } from '../world/abyss';

/** How long it is, nose to tail tip, and how tall, in the dive scene; and how near its middle line a spear must pass. */
export const REMORO_LEN = 180;
export const REMORO_H = 44;
export const REMORO_HIT = 24;
/** Spears to land it. */
export const REMORO_HITS = 3;
/** How fast it cruises, and darts off when speared, for how long. */
export const CRUISE = 45;
export const DART = 170;
export const DART_T = 1.2;
/** The height over the floor it keeps to, give or take; and how far in from the scene's sides it turns. */
export const REMORO_UP = 330;
export const REMORO_SWAY = 60;
export const TURN_IN = 110;
/** How quickly it comes round when it turns. */
const TURN = 2.5;

/** Whether the Remoro is on the floor today, given the day it was last landed. */
export function remoroHere(remoroDay: number, day: number): boolean {
  return day > remoroDay;
}

export type RemoroState = 'swim' | 'dart' | 'gone';

export class Remoro {
  x = AW * 0.3;
  y = AD - REMORO_UP;
  /** Which way it swims: 1 right, -1 left; and which way it faces, coming round through 0 as it turns. */
  dir: -1 | 1 = 1;
  face = 1;
  state: RemoroState = 'swim';
  hits = 0;
  /** A flash of white when a spear strikes, fading. */
  flash = 0;
  t = 0;
  private dartT = 0;

  /** Back on the floor for a dive, or not there today. */
  reset(here: boolean): void {
    this.state = here ? 'swim' : 'gone';
    this.hits = 0;
    this.flash = 0;
    this.dartT = 0;
    this.x = AW * 0.3;
    this.y = AD - REMORO_UP;
    this.dir = 1;
    this.face = 1;
    this.t = 0;
  }

  get here(): boolean {
    return this.state !== 'gone';
  }

  /** Its head, and its tail tip. */
  get head(): { x: number; y: number } {
    return { x: this.x + (this.face * REMORO_LEN) / 2, y: this.y };
  }
  get tailTip(): { x: number; y: number } {
    return { x: this.x - (this.face * REMORO_LEN) / 2, y: this.y };
  }

  update(dt: number): void {
    if (this.state === 'gone') return;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    let sp = CRUISE;
    if (this.state === 'dart') {
      // Off away from the diver, fast, then back to cruising.
      this.dartT -= dt;
      sp = DART;
      if (this.dartT <= 0) this.state = 'swim';
    }
    this.x += this.dir * sp * dt;
    if (this.x > AW - TURN_IN) this.dir = -1;
    else if (this.x < TURN_IN) this.dir = 1;
    this.face += Math.max(-TURN * dt, Math.min(TURN * dt, this.dir - this.face));
    const ty = AD - REMORO_UP + Math.sin(this.t * 0.35) * REMORO_SWAY;
    this.y += (ty - this.y) * Math.min(1, dt * 0.8);
  }

  /** The nearest point along its middle line to (px, py), and how far that is. */
  nearest(px: number, py: number): { x: number; y: number; d: number } {
    const a = this.tailTip;
    const b = this.head;
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const l2 = vx * vx + vy * vy || 1;
    const k = Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / l2));
    const x = a.x + vx * k;
    const y = a.y + vy * k;
    return { x, y, d: Math.hypot(px - x, py - y) };
  }

  /** Where a spear thrown from the diver should go for it: the nearest of it, if it is in reach and not behind. */
  aim(
    from: { x: number; y: number; face: number },
    range: number,
  ): { x: number; y: number } | null {
    if (this.state === 'gone') return null;
    const p = this.nearest(from.x, from.y);
    if (p.d > range || (p.x - from.x) * from.face < -8) return null;
    return { x: p.x, y: p.y };
  }

  /** Whether a spear's step from (x0, y0) to (x1, y1) passed within reach of its body, nose to tail. */
  hitBy(x0: number, y0: number, x1: number, y1: number): boolean {
    if (this.state === 'gone') return false;
    const a = this.tailTip;
    const b = this.head;
    return segSeg(x0, y0, x1, y1, a.x, a.y, b.x, b.y) < REMORO_HIT;
  }

  /** A spear struck it, the diver at dx across: it flashes and darts off away from the diver. Returns whether it is
   * landed. A last spear only lands it if the hold has room; otherwise it shakes the spear off and darts away. */
  spear(dx: number, room: boolean): boolean {
    if (this.state === 'gone') return false;
    if (this.hits + 1 >= REMORO_HITS && !room) {
      this.dart(dx);
      return false;
    }
    this.hits++;
    this.flash = 1;
    if (this.hits >= REMORO_HITS) {
      this.state = 'gone';
      return true;
    }
    this.dart(dx);
    return false;
  }

  private dart(dx: number): void {
    this.state = 'dart';
    this.dartT = DART_T;
    this.dir = this.x >= dx ? 1 : -1;
  }
}

/** The least distance between two segments, a..b and c..d: none if they cross. */
function segSeg(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): number {
  const pt = (px: number, py: number, x0: number, y0: number, x1: number, y1: number) => {
    const vx = x1 - x0;
    const vy = y1 - y0;
    const l2 = vx * vx + vy * vy || 1;
    const k = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / l2));
    return Math.hypot(px - (x0 + vx * k), py - (y0 + vy * k));
  };
  const side = (px: number, py: number, x0: number, y0: number, x1: number, y1: number) =>
    Math.sign((x1 - x0) * (py - y0) - (y1 - y0) * (px - x0));
  if (
    side(ax, ay, cx, cy, dx, dy) * side(bx, by, cx, cy, dx, dy) < 0 &&
    side(cx, cy, ax, ay, bx, by) * side(dx, dy, ax, ay, bx, by) < 0
  )
    return 0;
  return Math.min(
    pt(ax, ay, cx, cy, dx, dy),
    pt(bx, by, cx, cy, dx, dy),
    pt(cx, cy, ax, ay, bx, by),
    pt(dx, dy, ax, ay, bx, by),
  );
}
