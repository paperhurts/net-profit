/**
 * The attack nibbler, the kid's drawing (2026-10-17): big and shark-shaped, a fin on its back, two clawed fins under
 * it and a mouth full of teeth, biting a gloomer's tail. The owner's call (2026-10-18): it hunts the deep fish, and
 * is speared as the Remoro is, a few spears and worth a lot; it leaves the diver alone unless the diver gets in its
 * way. On the abyss's floor it prowls, picks out a gloomer or a nibbler, chases it down and snaps it up (gone a while,
 * as a speared fish is), then rests. A diver in front of its mouth as it chases gets bitten, air out of the tank, and
 * it turns off. Three spears land it, each sending it darting off; landed, it is gone until the next day.
 */

import { AD, AW } from '../world/abyss';
import { segSeg } from './remoro';

/** How long it is, nose to tail, and how tall; how near its middle line a spear must pass. */
export const HUNTER_LEN = 120;
export const HUNTER_H = 42;
export const HUNTER_HIT = 20;
/** Spears to land it. */
export const HUNTER_HITS = 3;
/** Its prowl and its chase, how fast; how far it sees prey; how long it prowls before it looks, and chases before it
 * gives up; its snap's reach; how long it rests after. */
export const PROWL = 40;
export const CHASE = 150;
export const SIGHT = 340;
export const PROWL_T = 5;
export const CHASE_T = 6;
export const SNAP_R = 24;
export const REST_T = 4;
/** A diver this near its mouth as it chases is in its way, and bitten; it darts off after a bite or a spear. */
export const IN_WAY = 34;
export const DART = 180;
export const DART_T = 1.2;
/** The height over the floor it prowls at, give or take, and how far in from the sides it turns. */
export const HUNTER_UP = 250;
const SWAY = 50;
const TURN_IN = 90;
const TURN = 2.5;

/** A fish it could hunt: which shoal and which fish, and where it is now. */
export type Prey = { si: number; i: number; x: number; y: number };
export type HunterState = 'prowl' | 'chase' | 'rest' | 'dart' | 'gone';
export type HunterEvent = 'chase' | 'snap' | 'bite' | null;

/** Whether it is on the floor today, given the day it was last landed. */
export function hunterHere(hunterDay: number, day: number): boolean {
  return day > hunterDay;
}

export class AttackNibbler {
  x = AW * 0.7;
  y = AD - HUNTER_UP;
  /** Which way it swims and faces, as the Remoro does: facing comes round through 0 as it turns. */
  dx = -1;
  dy = 0;
  face = -1;
  state: HunterState = 'prowl';
  hits = 0;
  flash = 0;
  /** Its own clock, and the time left in its state. */
  ph = 0;
  t = PROWL_T;
  /** The fish it is after, and the last it snapped up. */
  target: { si: number; i: number } | null = null;
  ate: Prey | null = null;

  reset(here: boolean): void {
    this.state = here ? 'prowl' : 'gone';
    this.x = AW * 0.7;
    this.y = AD - HUNTER_UP;
    this.dx = -1;
    this.dy = 0;
    this.face = -1;
    this.hits = 0;
    this.flash = 0;
    this.ph = 0;
    this.t = PROWL_T;
    this.target = null;
    this.ate = null;
  }

  get here(): boolean {
    return this.state !== 'gone';
  }
  /** Its mouth, and its tail tip. */
  get head(): { x: number; y: number } {
    return { x: this.x + (this.face * HUNTER_LEN) / 2, y: this.y };
  }
  get tailTip(): { x: number; y: number } {
    return { x: this.x - (this.face * HUNTER_LEN) / 2, y: this.y };
  }
  /** Whether its jaws are open: chasing, or just snapped. */
  get jaws(): boolean {
    return this.state === 'chase' || (this.state === 'rest' && this.t > REST_T - 0.5);
  }

  /** Swim toward (tx, ty) at sp, turning to face the way it goes. */
  private swim(tx: number, ty: number, sp: number, dt: number): void {
    const vx = tx - this.x;
    const vy = ty - this.y;
    const d = Math.hypot(vx, vy) || 1;
    this.dx = vx / d;
    this.dy = vy / d;
    const step = Math.min(d, sp * dt);
    this.x += this.dx * step;
    this.y += this.dy * step;
  }

  update(dt: number, diver: { x: number; y: number }, prey: readonly Prey[]): HunterEvent {
    if (this.state === 'gone') return null;
    this.ph += dt;
    this.t -= dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    let ev: HunterEvent = null;
    const cruiseY = AD - HUNTER_UP + Math.sin(this.ph * 0.4) * SWAY;
    switch (this.state) {
      case 'prowl':
      case 'rest': {
        // Slow laps over the floor; prowling, it looks for a fish to hunt now and then.
        if (this.x > AW - TURN_IN) this.dx = -1;
        else if (this.x < TURN_IN) this.dx = 1;
        const sx = Math.sign(this.dx) || 1;
        this.swim(this.x + sx * 40, cruiseY, this.state === 'rest' ? PROWL * 0.5 : PROWL, dt);
        this.dx = sx;
        if (this.t <= 0) {
          if (this.state === 'rest') {
            this.state = 'prowl';
            this.t = PROWL_T;
            break;
          }
          const near = nearest(prey, this.head, SIGHT);
          if (near) {
            this.state = 'chase';
            this.target = { si: near.si, i: near.i };
            this.t = CHASE_T;
            ev = 'chase';
          } else this.t = PROWL_T * 0.5;
        }
        break;
      }
      case 'chase': {
        const tg = this.target;
        const p = tg ? prey.find((q) => q.si === tg.si && q.i === tg.i) : undefined;
        if (!p || this.t <= 0) {
          this.state = 'prowl';
          this.t = PROWL_T;
          this.target = null;
          break;
        }
        // Its mouth at the fish: aim the middle so that the head gets there.
        const h = this.head;
        this.swim(p.x - (h.x - this.x), p.y, CHASE, dt);
        const h2 = this.head;
        if (Math.hypot(diver.x - h2.x, diver.y - h2.y) < IN_WAY) {
          this.dart(diver.x);
          ev = 'bite';
        } else if (Math.hypot(p.x - h2.x, p.y - h2.y) < SNAP_R) {
          this.ate = p;
          this.target = null;
          this.state = 'rest';
          this.t = REST_T;
          ev = 'snap';
        }
        break;
      }
      case 'dart':
        this.swim(this.x + Math.sign(this.dx) * 60, cruiseY, DART, dt);
        if (this.t <= 0) {
          this.state = 'prowl';
          this.t = PROWL_T;
        }
        break;
    }
    // Kept over the floor, in the water.
    this.x = Math.max(HUNTER_LEN / 2, Math.min(AW - HUNTER_LEN / 2, this.x));
    this.y = Math.max(AD - 680, Math.min(AD - 70, this.y));
    const want = this.dx >= 0 ? 1 : -1;
    this.face += Math.max(-TURN * dt, Math.min(TURN * dt, want - this.face));
    return ev;
  }

  /** The nearest point along its middle line to (px, py), and how far. */
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

  /** Where a spear from the diver should go for it, if it is in reach and not behind. */
  aim(
    from: { x: number; y: number; face: number },
    range: number,
  ): { x: number; y: number } | null {
    if (this.state === 'gone') return null;
    const p = this.nearest(from.x, from.y);
    if (p.d > range || (p.x - from.x) * from.face < -8) return null;
    return { x: p.x, y: p.y };
  }

  hitBy(x0: number, y0: number, x1: number, y1: number): boolean {
    if (this.state === 'gone') return false;
    const a = this.tailTip;
    const b = this.head;
    return segSeg(x0, y0, x1, y1, a.x, a.y, b.x, b.y) < HUNTER_HIT;
  }

  /** A spear struck it: it flashes and darts off; the last spear lands it, if the hold has room. */
  spear(dx: number, room: boolean): boolean {
    if (this.state === 'gone') return false;
    if (this.hits + 1 >= HUNTER_HITS && !room) {
      this.dart(dx);
      return false;
    }
    this.hits++;
    this.flash = 1;
    if (this.hits >= HUNTER_HITS) {
      this.state = 'gone';
      return true;
    }
    this.dart(dx);
    return false;
  }

  private dart(dx: number): void {
    this.state = 'dart';
    this.t = DART_T;
    this.target = null;
    this.dx = this.x >= dx ? 1 : -1;
    this.dy = 0;
  }
}

function nearest(
  prey: readonly Prey[],
  from: { x: number; y: number },
  range: number,
): Prey | null {
  let best: Prey | null = null;
  let bd = range;
  for (const p of prey) {
    const d = Math.hypot(p.x - from.x, p.y - from.y);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}
