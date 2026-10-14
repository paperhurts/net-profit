/**
 * The giant pelican on top of island 10's tower, the kid's: "a giant pelican (15 hp, 3 damage); beaten, it leaves a
 * little bread". It sits on its great nest of sticks at the back of the roof until the figure comes up the stairs.
 * Then, round and round:
 *
 *  - it waddles down off its nest toward the figure, and rears its head back, its pouch swelling, and spits a fan of
 *    three fish at it (a heart each, slow enough to step round);
 *  - it flaps up high and circles over the figure while a ring on the floor follows it about; the ring stops
 *    following (the warning) and the pelican folds its wings and dives into the ring, bill wide: three hearts, a gulp
 *    and a spit, to anyone in it;
 *  - its bill sticks in the floor for a moment after, and it kicks to get it out.
 *
 * Up high it is out of the spear's reach; on the ground it can be hit. Fifteen hits and it flops down and is beaten,
 * and it leaves a little loaf of bread behind. Every climb it is back on its nest.
 */

import type { Room } from '../world/tower';
import type { DrawView, Entity, Layer, World } from './entity';

export const PELICAN_HP = 15;
/** Hearts a dive takes, for anyone in its ring; hearts a spat fish takes. */
export const SCOOP_HIT = 3;
export const FISH_HIT = 1;
/** The dive's ring, and how high it flies. */
export const SCOOP_R = 26;
export const PELICAN_HIGH = 70;
/** It walks at this, and a spat fish flies at this, for this long at most. */
export const PELICAN_WALK = 32;
export const FISH_SPEED = 80;
export const FISH_LIFE = 2.6;
/** A fish within this of someone hits them. */
export const FISH_R = 10;
/** Seconds it stands up flapping on its nest when the figure comes up, before it comes for it. */
export const WAKE_T = 2.4;
/** Seconds of each part of its round. */
export const WADDLE_T = 1.2;
export const SPIT_T = 0.7;
export const RISE_T = 0.7;
export const CIRCLE_T = 1.7;
/** The last part of its circling, when the ring has stopped following: the warning. */
export const LOCK_T = 0.6;
export const DIVE_T = 0.35;
export const STUCK_T = 1.5;
export const PELICAN_FALL = 1.6;

export type PelicanState =
  | 'wait'
  | 'wake'
  | 'waddle'
  | 'spit'
  | 'rise'
  | 'circle'
  | 'dive'
  | 'stuck'
  | 'fall'
  | 'gone';

export type Fish = { x: number; y: number; vx: number; vy: number; t: number };

export class Pelican implements Entity {
  x: number;
  y: number;
  z = 0;
  h = 0;
  face = -1;
  hp = PELICAN_HP;
  state: PelicanState = 'wait';
  t = 0;
  flash = 0;
  stunT = 0;
  /** Where its dive will land: following the figure, then stopped. */
  ringX: number;
  ringY: number;
  readonly fish: Fish[] = [];
  /** Its nest, at the back of the roof. */
  readonly nest: { x: number; y: number };
  /** It woke; spat; locked its ring; dove (whether it caught the figure); was beaten. */
  onWake: (() => void) | null = null;
  onSpit: (() => void) | null = null;
  onLock: (() => void) | null = null;
  onDive: ((caught: boolean) => void) | null = null;
  /** Something hurt the figure, for this many hearts: a dive or a fish. */
  onHit: ((n: number, by: 'scoop' | 'fish') => void) | null = null;
  onBeaten: (() => void) | null = null;

  constructor(readonly room: Room) {
    const D = Math.SQRT1_2;
    this.nest = { x: room.x - room.r * 0.5 * D, y: room.y - room.r * 0.5 * D };
    this.x = this.nest.x;
    this.y = this.nest.y;
    this.ringX = this.x;
    this.ringY = this.y;
  }

  /** Back on its nest, whole. */
  reset(): void {
    this.x = this.nest.x;
    this.y = this.nest.y;
    this.z = 0;
    this.hp = PELICAN_HP;
    this.state = 'wait';
    this.t = 0;
    this.flash = 0;
    this.stunT = 0;
    this.fish.length = 0;
  }

  /** In the fight. */
  get up(): boolean {
    return this.state !== 'wait' && this.state !== 'fall' && this.state !== 'gone';
  }

  /** Down where a spear or a companion can reach it. */
  get low(): boolean {
    return this.state === 'waddle' || this.state === 'spit' || this.state === 'stuck';
  }

  /** A hit: only on the ground. Whether it hurt. */
  hit(power: number): boolean {
    if (!this.low) return false;
    this.hp -= power;
    this.flash = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.set('fall');
      this.z = 0;
      this.fish.length = 0;
      this.onBeaten?.();
    }
    return true;
  }

  /** Tar on its bill: it stands this many seconds, and a spit it was winding up comes to nothing. */
  stun(s: number): void {
    if (!this.low) return;
    this.stunT = Math.max(this.stunT, s);
    if (this.state === 'spit') this.set('waddle');
  }

  /** Whether a dive coming down now catches whoever is at (x, y). */
  catches(x: number, y: number): boolean {
    return Math.hypot(x - this.ringX, y - this.ringY) < SCOOP_R;
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.moveFish(dt, f);
    if (this.state === 'gone') return;
    if (this.state === 'fall') {
      if (this.t >= PELICAN_FALL) this.state = 'gone';
      return;
    }
    if (this.state === 'wait') {
      if (f && Math.hypot(f.x - this.room.x, f.y - this.room.y) < this.room.r + 40) {
        this.set('wake');
        this.onWake?.();
      }
      return;
    }
    if (this.state === 'wake') {
      if (this.t >= WAKE_T) this.set('waddle');
      return;
    }
    if (!f) return;
    if (this.stunT > 0) {
      this.stunT -= dt;
      return;
    }
    const dx = f.x - this.x;
    const dy = f.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    if (this.state !== 'dive' && Math.abs(dx - dy) > 2) this.face = Math.sign(dx - dy);
    switch (this.state) {
      case 'waddle':
        this.h = Math.atan2(dy, dx);
        if (d > 50) this.step((dx / d) * PELICAN_WALK * dt, (dy / d) * PELICAN_WALK * dt);
        if (this.t >= WADDLE_T) this.set('spit');
        return;
      case 'spit':
        this.h = Math.atan2(dy, dx);
        if (this.t >= SPIT_T) {
          // A fan of three fish at the figure.
          for (const turn of [-0.35, 0, 0.35]) {
            const a = this.h + turn;
            this.fish.push({
              x: this.x + Math.cos(a) * 14,
              y: this.y + Math.sin(a) * 14,
              vx: Math.cos(a) * FISH_SPEED,
              vy: Math.sin(a) * FISH_SPEED,
              t: 0,
            });
          }
          this.onSpit?.();
          this.set('rise');
        }
        return;
      case 'rise':
        this.z = PELICAN_HIGH * Math.min(1, this.t / RISE_T);
        if (this.t >= RISE_T) {
          this.set('circle');
          this.ringX = f.x;
          this.ringY = f.y;
        }
        return;
      case 'circle': {
        // Over the figure, a little behind it, and the ring following it about until it stops.
        const locked = this.t >= CIRCLE_T - LOCK_T;
        if (!locked) {
          const k = Math.min(1, dt * 4);
          this.ringX += (f.x - this.ringX) * k;
          this.ringY += (f.y - this.ringY) * k;
        } else if (this.t - dt < CIRCLE_T - LOCK_T) this.onLock?.();
        const a = this.t * 2.4;
        this.step(
          (this.ringX + Math.cos(a) * 30 - this.x) * Math.min(1, dt * 3),
          (this.ringY + Math.sin(a) * 30 - this.y) * Math.min(1, dt * 3),
        );
        this.z = PELICAN_HIGH + Math.sin(this.t * 5) * 3;
        if (this.t >= CIRCLE_T) {
          this.set('dive');
          this.h = Math.atan2(this.ringY - this.y, this.ringX - this.x);
          this.fromX = this.x;
          this.fromY = this.y;
        }
        return;
      }
      case 'dive': {
        const k = Math.min(1, this.t / DIVE_T);
        this.x = this.fromX + (this.ringX - this.fromX) * k;
        this.y = this.fromY + (this.ringY - this.fromY) * k;
        this.z = PELICAN_HIGH * (1 - k * k);
        if (k >= 1) {
          this.z = 0;
          const caught = this.catches(f.x, f.y);
          this.onDive?.(caught);
          if (caught) this.onHit?.(SCOOP_HIT, 'scoop');
          this.set('stuck');
        }
        return;
      }
      case 'stuck':
        if (this.t >= STUCK_T) this.set('waddle');
        return;
    }
  }

  private fromX = 0;
  private fromY = 0;

  private set(s: PelicanState): void {
    this.state = s;
    this.t = 0;
  }

  /** A step, kept on the roof. */
  private step(dx: number, dy: number): void {
    const R = this.room;
    const x = this.x + dx;
    const y = this.y + dy;
    const d = Math.hypot(x - R.x, y - R.y);
    const max = R.r - 22;
    const k = d > max ? max / d : 1;
    this.x = R.x + (x - R.x) * k;
    this.y = R.y + (y - R.y) * k;
  }

  private moveFish(dt: number, f: { x: number; y: number } | null): void {
    for (let i = this.fish.length - 1; i >= 0; i--) {
      const q = this.fish[i] as Fish;
      q.t += dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      const gone =
        q.t > FISH_LIFE || Math.hypot(q.x - this.room.x, q.y - this.room.y) > this.room.r + 10;
      if (f && Math.hypot(f.x - q.x, f.y - q.y) < FISH_R) {
        this.fish.splice(i, 1);
        this.onHit?.(FISH_HIT, 'fish');
      } else if (gone) this.fish.splice(i, 1);
    }
  }

  /** The game draws it on its roof (render/pelican.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}
