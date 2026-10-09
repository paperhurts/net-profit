/**
 * The Forgotten One, the kid's king of Gigantis, on his throne at the back of
 * its throne room behind three necromancers. Drawn as the kid drew him: long
 * black hair, a pale face screaming, a black cloak over long thin legs, and a
 * sword with a cross-guard. He comes on slowly and has three ways to hurt, a
 * heart each, as the kid wrote:
 *
 * - his sword, close in: he raises it (the warning) and sweeps it round in front;
 * - skulls, blue and trailing purple fire: five at a time, flung in a fan,
 *   the middle one aimed to meet the figure where it is going and the others
 *   either side of it, so a straight walk is hit and the counter is to find a
 *   gap between them as they fly;
 * - the death ray, orange: a thin line shows from him toward the figure for most
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
  /** Seconds left stuck with tar on his face. */
  stunT = 0;
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
    this.stunT = 0;
    this.skulls.length = 0;
  }

  /**
   * Tar on his face: he stands this many seconds, and a sword he was raising, or a ray he was aiming,
   * comes to nothing. A sweep or a beam already going finishes.
   */
  stun(s: number): void {
    if (!this.up || this.state === 'swing' || this.state === 'beam') return;
    this.stunT = Math.max(this.stunT, s);
    if (this.state === 'windup' || this.state === 'aim') {
      this.state = 'walk';
      this.t = 0;
    }
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
    if (this.stunT > 0) this.stunT -= dt;
    const dx = f.x - this.x;
    const dy = f.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    switch (this.stunT > 0 ? 'stunned' : this.state) {
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
        ctx.strokeStyle = 'rgba(255,140,40,.45)';
        ctx.lineWidth = 16 * Z;
        ctx.beginPath();
        ctx.moveTo(px(this.ray.x, this.ray.y), py(this.ray.x, this.ray.y, 26));
        ctx.lineTo(px(ex, ey), py(ex, ey, 26));
        ctx.stroke();
      }
      ctx.strokeStyle = burn
        ? '#FFEBC0'
        : `rgba(255,140,40,${0.4 + 0.45 * clamp(this.t / AIM, 0, 1)})`;
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
      // A trail of purple fire behind it, rising as it goes.
      for (let i = 4; i >= 1; i--) {
        const bx = s.x - Math.cos(s.h) * i * 5;
        const by = s.y - Math.sin(s.h) * i * 5;
        ctx.fillStyle = `rgba(170,95,235,${0.55 - i * 0.11})`;
        ctx.beginPath();
        ctx.arc(px(bx, by), py(bx, by, 20) - i * 2.6 * Z, (5.6 - i * 0.7) * Z, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(195,130,255,.6)';
      for (const e of [-1, 0, 1]) {
        const lick = Math.sin(T * 18 + s.t * 7 + e * 2);
        ctx.beginPath();
        ctx.moveTo(sx + (e * 2.6 - 2) * Z, sy - 1.5 * Z);
        ctx.lineTo(sx + (e * 2.6 + lick * 1.2) * Z, sy - (10 + lick * 2 - Math.abs(e) * 3) * Z);
        ctx.lineTo(sx + (e * 2.6 + 2) * Z, sy - 1.5 * Z);
        ctx.fill();
      }
      // The skull, blue.
      ctx.fillStyle = 'rgba(110,165,255,.35)';
      ctx.beginPath();
      ctx.arc(sx, sy, 8 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7FB6FF';
      ctx.beginPath();
      ctx.arc(sx, sy, 4.4 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(sx - 2.4 * Z, sy + 2.6 * Z, 4.8 * Z, 2.2 * Z);
      ctx.fillStyle = '#1A2350';
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
    const sway = Math.sin(T * 3) * 1.5 * k;
    // Long thin legs below the cloak, as the kid drew them.
    ctx.strokeStyle = W('#1A161D');
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.8 * k;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx + side * 2 * k, base - 10 * k);
      ctx.lineTo(sx + side * 2 * k + stride * side, base);
      ctx.stroke();
    }
    // A black cloak from the shoulders, ragged at the hem and blowing back a little.
    ctx.fillStyle = W('#141117');
    ctx.strokeStyle = W('#3A3340');
    ctx.lineWidth = 0.8 * k;
    ctx.beginPath();
    ctx.moveTo(sx - 4 * k, base - 24 * k);
    ctx.lineTo(sx + 4 * k, base - 24 * k);
    for (let i = 0; i <= 6; i++) {
      const ex = sx + (7.5 - i * 2.5) * k - face * 1.5 * k + sway * (1 - i / 6);
      ctx.lineTo(ex, base - (i % 2 ? 10.5 : 8) * k);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // His hair, long and black, down past his shoulders behind his face.
    const hy = base - 26.5 * k;
    const fx = sx + face * 0.8 * k;
    ctx.fillStyle = W('#0E0C10');
    ctx.beginPath();
    ctx.arc(sx, hy - 0.5 * k, 5.4 * k, Math.PI, 0);
    ctx.lineTo(sx + 6.4 * k + sway * 0.4, hy + 11 * k);
    for (let i = 1; i <= 5; i++)
      ctx.lineTo(sx + (6.4 - i * 2.56) * k + sway * 0.4, hy + (i % 2 ? 8.5 : 11.5) * k);
    ctx.closePath();
    ctx.fill();
    // A pale face, screaming: dark eyes that burn orange as he aims, and a mouth wide open.
    ctx.fillStyle = W('#E8E0D2');
    ctx.beginPath();
    ctx.ellipse(fx, hy + 0.4 * k, 3.3 * k, 4.4 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    const aiming = this.state === 'aim' || this.state === 'beam';
    ctx.fillStyle = aiming ? '#FF9A2A' : W('#1A1216');
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(fx + e * 1.4 * k, hy - 0.9 * k, 0.95 * k, 0.6 * k, e * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    const open = aiming || this.state === 'windup' ? 1 : 0.55 + 0.15 * Math.sin(T * 2.2);
    ctx.fillStyle = W('#2A0E12');
    ctx.beginPath();
    ctx.ellipse(fx, hy + 2.1 * k, 1.5 * k, (1 + 1.3 * open) * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = W('#B8323A');
    ctx.beginPath();
    ctx.ellipse(fx, hy + (2.4 + open) * k, 0.9 * k, 0.6 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    // Its fringe hangs either side of the face.
    ctx.fillStyle = W('#0E0C10');
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(fx + e * 0.4 * k, hy - 4.5 * k);
      ctx.quadraticCurveTo(fx + e * 4.4 * k, hy - 4.6 * k, fx + e * 3.8 * k, hy + 5.5 * k);
      ctx.lineTo(fx + e * 2.6 * k, hy + 2 * k);
      ctx.quadraticCurveTo(fx + e * 2.8 * k, hy - 2.8 * k, fx + e * 0.4 * k, hy - 4.5 * k);
      ctx.fill();
    }
    // The great sword: up for the warning, swept round in the swing.
    const hx = sx + face * 6 * k;
    const hyy = base - 15 * k;
    let a = -face * 0.4;
    if (this.state === 'windup') a = -face * (1.3 + Math.sin(T * 30) * 0.05);
    else if (this.state === 'swing') a = face * (0.5 + (this.t / SWING) * 1.6);
    else if (this.state === 'aim' || this.state === 'beam') a = face * 1.4;
    ctx.strokeStyle = W('#1A161D');
    ctx.lineWidth = 1.6 * k;
    ctx.beginPath();
    ctx.moveTo(sx + face * 3.5 * k, base - 21.5 * k);
    ctx.lineTo(hx, hyy);
    ctx.stroke();
    const len = 20 * k;
    ctx.strokeStyle = W('#B9C2C8');
    ctx.lineWidth = 2.4 * k;
    ctx.beginPath();
    ctx.moveTo(hx, hyy);
    ctx.lineTo(hx + Math.sin(a) * len * face, hyy - Math.cos(a) * len);
    ctx.stroke();
    // Its cross-guard, as he drew it.
    ctx.strokeStyle = W('#5A5560');
    ctx.lineWidth = 2.2 * k;
    ctx.beginPath();
    ctx.moveTo(hx - 3.6 * k, hyy + 0.7 * k);
    ctx.lineTo(hx + 3.6 * k, hyy - 0.7 * k);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
