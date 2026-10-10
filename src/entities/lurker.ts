/**
 * The lurker, THE DEEP part three, the kid's "something that lurks in the
 * dark": something big that lives in the trench's midnight water. The owner's
 * choice of teeth: it bites air. A diver who stays down in the dark a while
 * sees two eyes come out of it, and it circles just out of the lamp, a long
 * black shape with a row of faint lights down its side. Then its eyes flare
 * and its jaw drops, the warning, and it lunges at where the diver is: still
 * there and it bites the tank, a big gulp of air bubbling out (three bites
 * empty the scuba gear's own tank, more for the big one), then it goes back
 * into the dark a while. Swim aside in the warning and it shoots past. A
 * spear stings it and it flees for good while; swimming up out of the
 * midnight water loses it. Nothing is lost but the dive: run out of air and
 * the diver floats back up to the boat, as ever.
 */

import { keepInWater, TD, TWILIGHT } from '../world/trench';

/** It only lives below the twilight, and gives up on a diver this far above it. */
export const LURK_TOP = TWILIGHT;
export const GIVE_UP = 60;
/** Seconds a diver spends in the midnight water before it comes. */
export const WAKE = 6;
/** How fast it comes out of the dark, and the distance it circles at. */
export const COME = 60;
export const KEEP = 150;
/** Seconds it circles before a lunge, least and most. */
export const STALK_MIN = 2.5;
export const STALK_MAX = 4.5;
/** The warning: eyes flared, jaw down. Then the lunge, how fast and how long. */
export const TELL = 0.85;
export const LUNGE_SPEED = 300;
export const LUNGE_T = 0.75;
/** Its mouth this near the diver in a lunge is a bite, and a bite takes this many seconds of air. */
export const BITE_R = 30;
export const BITE = 25;
/** After a bite it goes back into the dark; stung by a spear it flees, and stays away this long. */
export const BACK_T = 3;
export const FLEE_T = 2;
export const FLEE = 25;
/** A spear passing this near its head, or its middle, stings it. */
export const HIT_R = 30;
/** How long it is, head to tail. */
export const LENGTH = 230;

export type LurkerState = 'hide' | 'come' | 'stalk' | 'tell' | 'lunge' | 'back' | 'flee';
export type LurkerEvent = 'eyes' | 'tell' | 'bite' | 'miss' | null;

/** Distance from a point to the segment a..b. */
function toSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const l = vx * vx + vy * vy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l)) : 0;
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

export class Lurker {
  /** Its head, in the dive scene. */
  x = 380;
  y = TD - 100;
  /** Which way it is heading, radians. */
  a = 0;
  state: LurkerState = 'hide';
  /** Time left in this state. */
  t = 0;
  /** How long the diver has been down in the dark, toward it coming. */
  wait = 0;
  /** Time before it will come again, after being stung. */
  away = 0;
  /** The lunge's way. */
  private dx = 0;
  private dy = 0;
  /** Round which side of the diver it circles. */
  private spin = 1;

  /** Back in the dark, not coming yet: a new dive. */
  reset(): void {
    this.state = 'hide';
    this.t = 0;
    this.wait = 0;
    this.away = 0;
  }

  /** Out where it can be seen and bites: everything but hiding, going back and fleeing. */
  get out(): boolean {
    return (
      this.state === 'come' ||
      this.state === 'stalk' ||
      this.state === 'tell' ||
      this.state === 'lunge'
    );
  }

  /** How far its jaw is open, 0 to 1. */
  get mouth(): number {
    if (this.state === 'tell') return Math.min(1, (TELL - this.t) / (TELL * 0.5));
    if (this.state === 'lunge') return 1;
    return 0.08;
  }

  /** Its middle, for a spear: half its length back along its way. */
  get mid(): { x: number; y: number } {
    return {
      x: this.x - Math.cos(this.a) * LENGTH * 0.45,
      y: this.y - Math.sin(this.a) * LENGTH * 0.45,
    };
  }

  /** Whether a spear going from (x0, y0) to (x1, y1) passes near enough its head or its middle to sting it. */
  hitBy(x0: number, y0: number, x1: number, y1: number): boolean {
    if (!this.out) return false;
    const m = this.mid;
    return (
      toSegment(this.x, this.y, x0, y0, x1, y1) < HIT_R ||
      toSegment(m.x, m.y, x0, y0, x1, y1) < HIT_R
    );
  }

  /** Stung by a spear: off it goes into the dark, and stays away a good while. */
  sting(): void {
    if (!this.out) return;
    this.state = 'flee';
    this.t = FLEE_T;
    this.away = FLEE;
  }

  /** Turn toward a heading, no faster than this much a second. */
  private turn(to: number, rate: number, dt: number): void {
    let d = to - this.a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.a += Math.max(-rate * dt, Math.min(rate * dt, d));
  }

  /** Swim toward a point at a speed, turning as it goes. */
  private swimTo(x: number, y: number, speed: number, dt: number): void {
    this.turn(Math.atan2(y - this.y, x - this.x), 2.4, dt);
    this.x += Math.cos(this.a) * speed * dt;
    this.y += Math.sin(this.a) * speed * dt;
  }

  /** Out of the dark, off the screen, on the side of the diver with the most midnight water. */
  private emerge(d: { x: number; y: number }, rnd: () => number): void {
    const below = d.y + 460;
    this.y = below <= TD - 70 ? below : Math.max(LURK_TOP - 120, d.y - 460);
    this.x = d.x + (rnd() - 0.5) * 120;
    keepInWater(this, 24);
    this.a = Math.atan2(d.y - this.y, d.x - this.x);
    this.spin = rnd() < 0.5 ? -1 : 1;
  }

  /**
   * One step, with the diver at (d.x, d.y), and up = it is on its way back to the boat. What happened worth telling:
   * its eyes coming out of the dark, its warning, a bite, or a lunge that missed.
   */
  update(
    dt: number,
    d: { x: number; y: number },
    up: boolean,
    rnd: () => number = Math.random,
  ): LurkerEvent {
    this.t -= dt;
    this.away = Math.max(0, this.away - dt);
    const dist = Math.hypot(d.x - this.x, d.y - this.y);
    const lost = up || d.y < LURK_TOP - GIVE_UP;
    // A diver gone up out of the dark, or on the way up, is let be.
    if (lost && (this.state === 'come' || this.state === 'stalk' || this.state === 'tell')) {
      this.state = 'back';
      this.t = BACK_T;
    }
    let ev: LurkerEvent = null;
    switch (this.state) {
      case 'hide':
        this.wait = d.y > LURK_TOP && !up ? this.wait + dt : 0;
        if (this.wait >= WAKE && this.away <= 0) {
          this.emerge(d, rnd);
          this.state = 'come';
          ev = 'eyes';
        }
        break;
      case 'come':
        this.swimTo(d.x, d.y, COME, dt);
        if (dist < KEEP + 30) {
          this.state = 'stalk';
          this.t = STALK_MIN + rnd() * (STALK_MAX - STALK_MIN);
        }
        break;
      case 'stalk': {
        // Round the diver at arm's length, just out of the lamp's best light.
        const ang = Math.atan2(this.y - d.y, this.x - d.x) + this.spin * 0.6;
        this.swimTo(d.x + Math.cos(ang) * KEEP, d.y + Math.sin(ang) * KEEP, 70, dt);
        if (this.t <= 0) {
          this.state = 'tell';
          this.t = TELL;
          ev = 'tell';
        }
        break;
      }
      case 'tell':
        // It turns its head to the diver and holds, jaw dropping.
        this.turn(Math.atan2(d.y - this.y, d.x - this.x), 4, dt);
        if (this.t <= 0) {
          this.state = 'lunge';
          this.t = LUNGE_T;
          const l = dist || 1;
          this.dx = (d.x - this.x) / l;
          this.dy = (d.y - this.y) / l;
          this.a = Math.atan2(this.dy, this.dx);
        }
        break;
      case 'lunge':
        this.x += this.dx * LUNGE_SPEED * dt;
        this.y += this.dy * LUNGE_SPEED * dt;
        if (Math.hypot(d.x - this.x, d.y - this.y) < BITE_R && !up) {
          this.state = 'back';
          this.t = BACK_T;
          ev = 'bite';
        } else if (this.t <= 0) {
          this.state = 'stalk';
          this.t = STALK_MIN + rnd() * (STALK_MAX - STALK_MIN);
          this.spin = -this.spin;
          ev = 'miss';
        }
        break;
      case 'back':
      case 'flee': {
        // Away from the diver and down, into the dark; then hidden, and the wait begins again.
        const fast = this.state === 'flee' ? 220 : 110;
        this.swimTo(this.x + (this.x - d.x), Math.min(TD, this.y + 200), fast, dt);
        if (this.t <= 0) {
          this.state = 'hide';
          this.wait = 0;
        }
        break;
      }
    }
    if (this.state !== 'hide') keepInWater(this, 24);
    return ev;
  }
}
