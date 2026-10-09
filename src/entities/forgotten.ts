/**
 * The Forgotten One, the kid's king of Gigantis, on his throne at the back of
 * its throne room behind three necromancers. A tall crowned skeleton in black
 * armour with a ragged cape, red eyes and a great sword. He comes on slowly and
 * has three ways to hurt, a heart each, as the kid wrote:
 *
 * - his sword, close in: he raises it (the warning) and sweeps it round in front;
 * - skulls: five at a time, flung in a fan, the middle one aimed to meet the
 *   figure where it is going and the others either side of it, so a straight
 *   walk is hit and the counter is to find a gap between them as they fly;
 * - the death ray: a thin red line shows from him toward the figure for most
 *   of a second, then a beam burns along it. The line does not follow: step off.
 *
 * Further than a sword's reach he takes turns with the skulls and the ray. Hurt
 * to half, he is quicker about it and flings seven. Beaten, he falls apart, and
 * the game raises his bones (the undead's 'bones'), which fight on.
 */

import { angDiff, clamp } from '../core/math';
import type { DrawView, Entity, Layer, World } from './entity';
import { intercept } from './undead';
import { walkStep } from './walker';

export const FORGOTTEN_HP = 36;
/** He walks at this; the figure walks at 85. */
export const STRIDE = 38;
/** His sword: its reach, the warning, the sweep and how long he is open after. */
export const REACH = 36;
export const WINDUP = 0.6;
export const SWING = 0.25;
export const RECOVER = 1;
export const ARC = 1.3;
/** Seconds between a skull volley and a ray, by turns; quicker once angry. */
export const ATTACK_EVERY = 2.6;
export const ANGRY_EVERY = 1.9;
export const FIRST_ATTACK = 1.6;
/** Skulls: how fast, how long, how near the figure to hit, and the fan. */
export const SKULL_SPEED = 115;
export const SKULL_LIFE = 2.2;
export const SKULL_HIT = 11;
export const FAN = [-0.6, -0.3, 0, 0.3, 0.6] as const;
export const ANGRY_FAN = [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9] as const;
/** The death ray: how long the line shows, how long it burns, how long, and how near it burns. */
export const AIM = 0.75;
export const BEAM = 0.3;
export const RAY_LEN = 340;
export const RAY_HIT = 11;
/** Seconds he falls apart once beaten. */
export const FALL = 2;
export const SCALE = 1.8;

export type ForgottenState =
  | 'wait'
  | 'walk'
  | 'windup'
  | 'swing'
  | 'recover'
  | 'aim'
  | 'beam'
  | 'fall'
  | 'gone';
export type Skull = { x: number; y: number; h: number; t: number };

export class Forgotten implements Entity {
  state: ForgottenState = 'wait';
  hp = FORGOTTEN_HP;
  x: number;
  y: number;
  h = Math.PI * 1.25;
  t = 0;
  flash = 0;
  /** Until the next skulls or ray, and which comes next. */
  cd = FIRST_ATTACK;
  rayNext = false;
  /** The ray's line while it shows and burns: its angle from where he stood. */
  ray = { x: 0, y: 0, h: 0 };
  readonly skulls: Skull[] = [];
  ph = 0;
  /** A sword, a skull or the ray hit the figure. */
  onHit: ((by: 'sword' | 'skull' | 'ray') => void) | null = null;
  /** He has seen the figure in his throne room. */
  onWake: (() => void) | null = null;
  /** His sword goes up, the skulls fly, or the line shows: for sounds. */
  onWindup: (() => void) | null = null;
  onSkulls: (() => void) | null = null;
  onAim: (() => void) | null = null;
  /** Fallen apart: where, for the game to raise his bones. */
  onBeaten: ((x: number, y: number) => void) | null = null;

  constructor(
    readonly room: { x: number; y: number; r: number },
    readonly start: { x: number; y: number },
  ) {
    this.x = start.x;
    this.y = start.y;
  }

  get up(): boolean {
    return this.state !== 'wait' && this.state !== 'fall' && this.state !== 'gone';
  }

  get angry(): boolean {
    return this.hp <= FORGOTTEN_HP / 2;
  }

  reset(): void {
    this.state = 'wait';
    this.hp = FORGOTTEN_HP;
    this.x = this.start.x;
    this.y = this.start.y;
    this.h = Math.PI * 1.25;
    this.t = 0;
    this.flash = 0;
    this.cd = FIRST_ATTACK;
    this.rayNext = false;
    this.skulls.length = 0;
  }

  /** Already beaten, on a later visit: nobody on the throne. */
  beaten(): void {
    this.state = 'gone';
    this.skulls.length = 0;
  }

  /** A spear lands with this power. */
  hit(power: number): void {
    if (!this.up) return;
    this.hp = Math.max(0, this.hp - power);
    this.flash = 0.2;
    if (this.hp <= 0) {
      this.state = 'fall';
      this.t = 0;
      this.skulls.length = 0;
    }
  }

  /** How far a point is from the ray's line, and whether it is along it at all. */
  offRay(x: number, y: number): number {
    const c = Math.cos(this.ray.h);
    const s = Math.sin(this.ray.h);
    const along = (x - this.ray.x) * c + (y - this.ray.y) * s;
    if (along < 0 || along > RAY_LEN) return Infinity;
    return Math.abs(-(x - this.ray.x) * s + (y - this.ray.y) * c);
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    this.t += dt;
    this.ph += dt;
    this.flash = Math.max(0, this.flash - dt);
    const inRoom =
      f !== null && Math.hypot(f.x - this.room.x, f.y - this.room.y) < this.room.r + 60;
    if (this.state === 'wait') {
      if (inRoom) {
        this.state = 'walk';
        this.t = 0;
        this.onWake?.();
      }
      return;
    }
    if (this.state === 'fall') {
      if (this.t >= FALL) {
        this.state = 'gone';
        this.onBeaten?.(this.x, this.y);
      }
      return;
    }
    if (this.state === 'gone' || !inRoom || !f) return;
    const dx = f.x - this.x;
    const dy = f.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    switch (this.state) {
      case 'walk': {
        this.h = Math.atan2(dy, dx);
        if (d < REACH * 0.85) {
          this.state = 'windup';
          this.t = 0;
          this.onWindup?.();
          break;
        }
        this.cd -= dt;
        if (this.cd <= 0 && d > REACH * 1.6) {
          this.cd = this.angry ? ANGRY_EVERY : ATTACK_EVERY;
          if (this.rayNext) {
            this.state = 'aim';
            this.t = 0;
            this.ray = { x: this.x, y: this.y, h: this.h };
            this.onAim?.();
          } else {
            const lead = intercept(dx, dy, f.vx, f.vy, SKULL_SPEED);
            const aim = Math.atan2(dy + f.vy * lead, dx + f.vx * lead);
            for (const k of this.angry ? ANGRY_FAN : FAN)
              this.skulls.push({ x: this.x, y: this.y, h: aim + k, t: 0 });
            this.onSkulls?.();
          }
          this.rayNext = !this.rayNext;
          break;
        }
        const nx = this.x + (dx / d) * STRIDE * dt;
        const ny = this.y + (dy / d) * STRIDE * dt;
        if (Math.hypot(nx - this.room.x, ny - this.room.y) < this.room.r - 24)
          walkStep(this, nx - this.x, ny - this.y, 99);
        break;
      }
      case 'windup':
        if (this.t >= WINDUP) {
          this.state = 'swing';
          this.t = 0;
          if (d < REACH + 6 && Math.abs(angDiff(this.h, Math.atan2(dy, dx))) < ARC)
            this.onHit?.('sword');
        }
        break;
      case 'swing':
        if (this.t >= SWING) {
          this.state = 'recover';
          this.t = 0;
        }
        break;
      case 'recover':
        if (this.t >= RECOVER) {
          this.state = 'walk';
          this.t = 0;
        }
        break;
      case 'aim':
        if (this.t >= AIM) {
          this.state = 'beam';
          this.t = 0;
        }
        break;
      case 'beam':
        // It burns once, as it lights.
        if (this.t <= dt * 1.01 && this.offRay(f.x, f.y) < RAY_HIT) this.onHit?.('ray');
        if (this.t >= BEAM) {
          this.state = 'walk';
          this.t = 0;
        }
        break;
    }
    for (let i = this.skulls.length - 1; i >= 0; i--) {
      const s = this.skulls[i] as Skull;
      s.t += dt;
      s.x += Math.cos(s.h) * SKULL_SPEED * dt;
      s.y += Math.sin(s.h) * SKULL_SPEED * dt;
      if (Math.hypot(s.x - f.x, s.y - f.y) < SKULL_HIT) {
        this.skulls.splice(i, 1);
        this.onHit?.('skull');
      } else if (s.t > SKULL_LIFE) this.skulls.splice(i, 1);
    }
  }

  /** The skulls and the ray, over everyone. */
  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'air' || this.state === 'gone' || !v.onScreen(this.room.x, this.room.y, 500))
      return;
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    if (this.state === 'aim' || this.state === 'beam') {
      const ex = this.ray.x + Math.cos(this.ray.h) * RAY_LEN;
      const ey = this.ray.y + Math.sin(this.ray.h) * RAY_LEN;
      const burn = this.state === 'beam';
      ctx.lineCap = 'round';
      if (burn) {
        ctx.strokeStyle = 'rgba(255,80,60,.45)';
        ctx.lineWidth = 16 * Z;
        ctx.beginPath();
        ctx.moveTo(px(this.ray.x, this.ray.y), py(this.ray.x, this.ray.y, 26));
        ctx.lineTo(px(ex, ey), py(ex, ey, 26));
        ctx.stroke();
      }
      ctx.strokeStyle = burn
        ? '#FFE0D8'
        : `rgba(255,70,60,${0.35 + 0.4 * clamp(this.t / AIM, 0, 1)})`;
      ctx.lineWidth = (burn ? 5 : 1.6 + Math.sin(T * 30) * 0.4) * Z;
      ctx.beginPath();
      ctx.moveTo(px(this.ray.x, this.ray.y), py(this.ray.x, this.ray.y, 26));
      ctx.lineTo(px(ex, ey), py(ex, ey, 26));
      ctx.stroke();
    }
    for (const s of this.skulls) {
      const sx = px(s.x, s.y);
      const sy = py(s.x, s.y, 20);
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      v.isoEllipse(s.x, s.y, 5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,90,70,.35)';
      ctx.beginPath();
      ctx.arc(sx, sy, 8 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EDE8DA';
      ctx.beginPath();
      ctx.arc(sx, sy, 4.4 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(sx - 2.4 * Z, sy + 2.6 * Z, 4.8 * Z, 2.2 * Z);
      ctx.fillStyle = '#C8322B';
      for (const e of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(sx + e * 1.6 * Z, sy - 0.3 * Z, 1.1 * Z, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** The Forgotten One himself, at his feet, for the room's sorted actors. */
  drawBody(v: DrawView): void {
    if (this.state === 'gone') return;
    const { ctx, px, py, T } = v;
    const k = SCALE * v.zoom;
    const fall = this.state === 'fall' ? clamp(this.t / FALL, 0, 1) : 0;
    const sx = px(this.x, this.y);
    const base = py(this.x, this.y) + fall * 8 * k;
    const face = Math.cos(this.h) - Math.sin(this.h) >= 0 ? 1 : -1;
    const W = (c: string) => (this.flash > 0 ? '#FFFFFF' : c);
    ctx.globalAlpha = 1 - fall * 0.7;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    v.isoEllipse(this.x, this.y, 9 * SCALE);
    ctx.fill();
    const stride = this.state === 'walk' ? Math.sin(this.ph * 6) * 2.4 * k : 0;
    // A ragged cape behind.
    ctx.fillStyle = W('#2A1820');
    ctx.beginPath();
    ctx.moveTo(sx - 5 * k, base - 22 * k);
    ctx.lineTo(sx + 5 * k, base - 22 * k);
    ctx.lineTo(sx + 8 * k - face * 5 * k + Math.sin(T * 3) * 1.5 * k, base);
    for (let i = 0; i < 4; i++)
      ctx.lineTo(sx + (6 - i * 4.5) * k - face * 5 * k, base - (i % 2 ? 3 : 0) * k);
    ctx.closePath();
    ctx.fill();
    // Legs in black armour.
    ctx.strokeStyle = W('#22262C');
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.6 * k;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx + side * 2 * k, base - 10 * k);
      ctx.lineTo(sx + side * 2 * k + stride * side, base);
      ctx.stroke();
    }
    // The breastplate, and ribs showing through a rent in it.
    ctx.fillStyle = W('#30353D');
    ctx.beginPath();
    ctx.ellipse(sx, base - 16 * k, 5.4 * k, 7 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = W('#EDE8DA');
    ctx.lineWidth = 1 * k;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(sx, base - 15 * k - i * 2.2 * k, 2.6 * k, 0.9 * k, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    // The skull, its red eyes, and the crown.
    const hy = base - 26.5 * k;
    ctx.fillStyle = W('#EDE8DA');
    ctx.beginPath();
    ctx.arc(sx, hy, 4.4 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(sx - 2.4 * k, hy + 2.8 * k, 4.8 * k, 2.4 * k);
    const glow = this.state === 'aim' ? 1 : 0.7 + 0.3 * Math.sin(T * 4);
    ctx.fillStyle = `rgba(255,70,60,${glow})`;
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx + face * 0.8 * k + e * 1.6 * k, hy - 0.2 * k, 1.2 * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = W('#C9A13A');
    ctx.beginPath();
    ctx.moveTo(sx - 4.6 * k, hy - 3 * k);
    for (let i = 0; i <= 4; i++) ctx.lineTo(sx - 4.6 * k + i * 2.3 * k, hy - (i % 2 ? 5 : 8.5) * k);
    ctx.lineTo(sx + 4.6 * k, hy - 3 * k);
    ctx.closePath();
    ctx.fill();
    // The great sword: up for the warning, swept round in the swing.
    const hx = sx + face * 6 * k;
    const hyy = base - 15 * k;
    let a = -face * 0.4;
    if (this.state === 'windup') a = -face * (1.3 + Math.sin(T * 30) * 0.05);
    else if (this.state === 'swing') a = face * (0.5 + (this.t / SWING) * 1.6);
    else if (this.state === 'aim' || this.state === 'beam') a = face * 1.4;
    const len = 20 * k;
    ctx.strokeStyle = W('#B9C2C8');
    ctx.lineWidth = 2.4 * k;
    ctx.beginPath();
    ctx.moveTo(hx, hyy);
    ctx.lineTo(hx + Math.sin(a) * len * face, hyy - Math.cos(a) * len);
    ctx.stroke();
    ctx.strokeStyle = W('#8A6A2A');
    ctx.lineWidth = 2.6 * k;
    ctx.beginPath();
    ctx.moveTo(hx - 3 * k, hyy + 0.6 * k);
    ctx.lineTo(hx + 3 * k, hyy - 0.6 * k);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
