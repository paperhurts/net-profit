/**
 * The bone sharks at the wreck off island 5: the same skeleton sharks whose
 * fins circle the island, seen under the water, all ribs and grin. They cruise
 * a slow loop over the wreck. A diver out in the open water near one is
 * noticed: it turns, its jaw opens (the warning), and it rushes where the
 * diver is; still there, it bites the tank and a gulp of air bubbles out, as
 * the lurker's bite does, then it swims off and comes round again. A spear
 * stings it off for a good while. They cannot get into the wreck's hold, so
 * inside it the diver is safe.
 */

import { type Box, inHold, keepInWreck, SHARK_SOLIDS, WW } from '../world/wreck';
import { BITE } from './lurker';

export { BITE };

/** The loop they cruise over the wreck, its middle and reach. */
export const LOOP = { x: 450, y: 130, rx: 230, ry: 50 } as const;
/** How near a diver in the open must come to be noticed. */
export const NOTICE = 170;
/** Its warning, then its rush: how fast and how long. */
export const TELL = 0.7;
export const RUSH_SPEED = 300;
export const RUSH_T = 0.6;
/** Its mouth this near the diver in a rush is a bite. */
export const BITE_R = 26;
/** After a bite it swims off this long; stung, it stays away this long. */
export const OFF_T = 4;
export const STUNG_T = 20;
/** A spear passing this near it stings it. */
export const HIT_R = 24;
/** How long it is, nose to tail. */
export const LENGTH = 70;

export type SharkState = 'cruise' | 'tell' | 'rush' | 'off' | 'stung';
export type SharkEvent = 'tell' | 'bite' | 'miss' | null;

/** Distance from a point to the segment a..b. */
function toSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const l = vx * vx + vy * vy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l)) : 0;
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

export class BoneShark {
  /** Its nose, in the wreck's scene. */
  x: number;
  y: number;
  /** Its heading, radians. */
  a = 0;
  state: SharkState = 'cruise';
  t = 0;
  /** Where it is round its loop. */
  private ph: number;
  private dx = 0;
  private dy = 0;
  private solids: readonly Box[];

  constructor(ph: number, solids: readonly Box[] = SHARK_SOLIDS) {
    this.ph = ph;
    this.solids = solids;
    this.x = LOOP.x + Math.cos(ph) * LOOP.rx;
    this.y = LOOP.y + Math.sin(ph) * LOOP.ry;
  }

  /** Back on its loop: a new dive. */
  reset(ph: number): void {
    this.ph = ph;
    this.state = 'cruise';
    this.t = 0;
    this.x = LOOP.x + Math.cos(ph) * LOOP.rx;
    this.y = LOOP.y + Math.sin(ph) * LOOP.ry;
  }

  /** Out where it can bite, or be stung: everything but going off and being stung. */
  get out(): boolean {
    return this.state === 'cruise' || this.state === 'tell' || this.state === 'rush';
  }

  /** How far its jaw is open, 0 to 1. */
  get mouth(): number {
    return this.state === 'tell'
      ? Math.min(1, (TELL - this.t) / (TELL * 0.5))
      : this.state === 'rush'
        ? 1
        : 0.1;
  }

  /** Whether a spear from (x0, y0) to (x1, y1) passes near enough to sting it: its nose or its middle. */
  hitBy(x0: number, y0: number, x1: number, y1: number): boolean {
    if (!this.out) return false;
    const mx = this.x - Math.cos(this.a) * LENGTH * 0.45;
    const my = this.y - Math.sin(this.a) * LENGTH * 0.45;
    return (
      toSegment(this.x, this.y, x0, y0, x1, y1) < HIT_R || toSegment(mx, my, x0, y0, x1, y1) < HIT_R
    );
  }

  /** Stung by a spear: off it goes, and stays away a good while. */
  sting(): void {
    if (!this.out) return;
    this.state = 'stung';
    this.t = STUNG_T;
  }

  private turn(to: number, rate: number, dt: number): void {
    let d = to - this.a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.a += Math.max(-rate * dt, Math.min(rate * dt, d));
  }

  private swimTo(x: number, y: number, speed: number, dt: number): void {
    this.turn(Math.atan2(y - this.y, x - this.x), 2.6, dt);
    this.x += Math.cos(this.a) * speed * dt;
    this.y += Math.sin(this.a) * speed * dt;
  }

  /** Back to cruising, joining its loop where it is nearest. */
  private backToLoop(): void {
    this.state = 'cruise';
    this.ph = Math.atan2((this.y - LOOP.y) / LOOP.ry, (this.x - LOOP.x) / LOOP.rx);
  }

  /** One step, the diver at (d.x, d.y), up = on the way back to the boat. What happened worth telling. */
  update(dt: number, d: { x: number; y: number }, up: boolean): SharkEvent {
    this.t -= dt;
    const dist = Math.hypot(d.x - this.x, d.y - this.y);
    const safe = up || inHold(d.x, d.y);
    let ev: SharkEvent = null;
    switch (this.state) {
      case 'cruise': {
        this.ph += dt * 0.25;
        this.swimTo(
          LOOP.x + Math.cos(this.ph) * LOOP.rx,
          LOOP.y + Math.sin(this.ph) * LOOP.ry,
          70,
          dt,
        );
        if (!safe && dist < NOTICE) {
          this.state = 'tell';
          this.t = TELL;
          ev = 'tell';
        }
        break;
      }
      case 'tell':
        this.turn(Math.atan2(d.y - this.y, d.x - this.x), 5, dt);
        if (safe) {
          this.state = 'cruise';
          break;
        }
        if (this.t <= 0) {
          const l = dist || 1;
          this.dx = (d.x - this.x) / l;
          this.dy = (d.y - this.y) / l;
          this.a = Math.atan2(this.dy, this.dx);
          this.state = 'rush';
          this.t = RUSH_T;
        }
        break;
      case 'rush':
        this.x += this.dx * RUSH_SPEED * dt;
        this.y += this.dy * RUSH_SPEED * dt;
        if (!safe && Math.hypot(d.x - this.x, d.y - this.y) < BITE_R) {
          this.state = 'off';
          this.t = OFF_T;
          ev = 'bite';
        } else if (this.t <= 0) {
          this.state = 'off';
          this.t = OFF_T * 0.4;
          ev = 'miss';
        }
        break;
      case 'off':
        // Away from the diver and up a little, then round again.
        this.swimTo(this.x + (this.x - d.x) * 2, Math.max(30, this.y - 40), 110, dt);
        if (this.t <= 0 || dist > 300) this.backToLoop();
        break;
      case 'stung':
        // Off out of the scene, over the open water away from the island, until it has got over it.
        this.swimTo(WW + 400, 70, 190, dt);
        if (this.t <= 0) this.backToLoop();
        break;
    }
    if (this.state !== 'stung') keepInWreck(this, 16, this.solids);
    return ev;
  }
}
