/**
 * The leviathan sorcerer on the tower's roof: the kid's chimera, a serpent's
 * finned tail coiled under a feathered body, two wide wings and a bird's head
 * with a hooked beak and glowing eyes. The shapes are a stand-in until his
 * drawing arrives, the way the dog's were. It flies a ring round the roof and
 * throws slow purple bolts at where the figure stands, so moving is the
 * counter; every so often it swoops at the figure to peck, which is when it
 * comes within a spear's throw. Hurt to half, it gets angry: faster, and its
 * bolts come three at a time. Beaten, it falls in a burst of feathers. The game
 * does the hearts, the prize, the flag and the way home as callbacks.
 */

import { rgba } from '../core/color';
import { clamp } from '../core/math';
import type { DrawView, Entity, Layer, World } from './entity';

export const BOSS_HP = 8;
/** The ring it flies, out from the roof's middle, and how fast. */
export const RING = 105;
export const FLY = 0.7;
/** Its bolts: how often, how fast, how long they last, and how near the figure they must pass to hit. */
export const CAST_EVERY = 2;
export const ANGRY_CAST = 1.4;
export const BOLT_SPEED = 120;
export const BOLT_LIFE = 1.8;
export const BOLT_HIT = 10;
/** A swoop: how often, how fast, and how near the figure to peck it. */
export const SWOOP_EVERY = 5;
export const SWOOP_SPEED = 190;
export const PECK = 16;
/** Seconds it falls once beaten, before the game is told. */
export const FALL = 1.6;

export type SorcererState = 'wait' | 'fly' | 'swoop' | 'back' | 'fall' | 'gone';
export type Bolt = { x: number; y: number; vx: number; vy: number; t: number };

export class Sorcerer implements Entity {
  state: SorcererState = 'wait';
  hp = BOSS_HP;
  x: number;
  y: number;
  /** Angle round its ring, seconds in this state, until it casts and swoops, and of the hit flash. */
  a = 0;
  t = 0;
  cast = 1.5;
  swoop = SWOOP_EVERY;
  flash = 0;
  readonly bolts: Bolt[] = [];
  /** A bolt or a peck hit the figure. */
  onHit: ((by: 'bolt' | 'peck') => void) | null = null;
  /** It has noticed the figure on its roof. */
  onWake: (() => void) | null = null;
  /** It is beaten and has fallen. */
  onBeaten: (() => void) | null = null;
  /** It cast a bolt. */
  onCast: (() => void) | null = null;

  constructor(readonly home: { x: number; y: number }) {
    this.x = home.x;
    this.y = home.y - RING;
  }

  get angry(): boolean {
    return this.hp <= BOSS_HP / 2;
  }

  /** In the fight: there to be speared. */
  get up(): boolean {
    return this.state === 'fly' || this.state === 'swoop' || this.state === 'back';
  }

  reset(): void {
    this.state = 'wait';
    this.hp = BOSS_HP;
    this.t = 0;
    this.a = -Math.PI / 2;
    this.x = this.home.x;
    this.y = this.home.y - RING;
    this.cast = 1.5;
    this.swoop = SWOOP_EVERY;
    this.bolts.length = 0;
  }

  /** A spear lands with this power. */
  hit(power: number): void {
    if (!this.up) return;
    this.hp = Math.max(0, this.hp - power);
    this.flash = 0.2;
    if (this.hp <= 0) {
      this.state = 'fall';
      this.t = 0;
      this.bolts.length = 0;
    } else if (this.state === 'swoop') {
      // Hit on the way in, it pulls out.
      this.state = 'back';
      this.t = 0;
    }
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    const onRoof = f !== null && Math.hypot(f.x - this.home.x, f.y - this.home.y) < RING + 60;
    if (this.state === 'wait') {
      if (onRoof) {
        this.state = 'fly';
        this.t = 0;
        this.onWake?.();
      }
      return;
    }
    if (this.state === 'fall') {
      if (this.t >= FALL) {
        this.state = 'gone';
        this.onBeaten?.();
      }
      return;
    }
    if (this.state === 'gone') return;
    if (!onRoof || !f) {
      // The figure has gone: it waits for the next one.
      this.reset();
      return;
    }
    const speed = this.angry ? 1.6 : 1;
    if (this.state === 'fly') {
      this.a += FLY * speed * dt;
      this.x += (this.home.x + Math.cos(this.a) * RING - this.x) * Math.min(1, dt * 3);
      this.y += (this.home.y + Math.sin(this.a) * RING - this.y) * Math.min(1, dt * 3);
      this.cast -= dt;
      if (this.cast <= 0) {
        this.cast = this.angry ? ANGRY_CAST : CAST_EVERY;
        const base = Math.atan2(f.y - this.y, f.x - this.x);
        for (const k of this.angry ? [-0.3, 0, 0.3] : [0]) {
          const ang = base + k;
          this.bolts.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(ang) * BOLT_SPEED,
            vy: Math.sin(ang) * BOLT_SPEED,
            t: 0,
          });
        }
        this.onCast?.();
      }
      this.swoop -= dt;
      if (this.swoop <= 0) {
        this.state = 'swoop';
        this.t = 0;
      }
    } else if (this.state === 'swoop') {
      const dx = f.x - this.x;
      const dy = f.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const st = Math.min(d, SWOOP_SPEED * speed * dt);
      this.x += (dx / d) * st;
      this.y += (dy / d) * st;
      if (d < PECK) {
        this.onHit?.('peck');
        this.state = 'back';
        this.t = 0;
      } else if (this.t > 2.5) {
        this.state = 'back';
        this.t = 0;
      }
    } else if (this.state === 'back') {
      const tx = this.home.x + Math.cos(this.a) * RING;
      const ty = this.home.y + Math.sin(this.a) * RING;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const d = Math.hypot(dx, dy);
      const st = Math.min(d, SWOOP_SPEED * 0.8 * dt);
      if (d > 1) {
        this.x += (dx / d) * st;
        this.y += (dy / d) * st;
      }
      if (d < 4 || this.t > 2) {
        this.state = 'fly';
        this.t = 0;
        this.swoop = SWOOP_EVERY * (this.angry ? 0.6 : 1);
      }
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i] as Bolt;
      b.t += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (Math.hypot(b.x - f.x, b.y - f.y) < BOLT_HIT) {
        this.bolts.splice(i, 1);
        this.onHit?.('bolt');
      } else if (b.t > BOLT_LIFE) this.bolts.splice(i, 1);
    }
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'air' || this.state === 'gone' || !v.onScreen(this.home.x, this.home.y, 400))
      return;
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    for (const b of this.bolts) {
      ctx.fillStyle = rgba('#B98AFF', 0.35);
      ctx.beginPath();
      ctx.arc(px(b.x, b.y), py(b.x, b.y, 14), 7 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E8D9FF';
      ctx.beginPath();
      ctx.arc(px(b.x, b.y), py(b.x, b.y, 14), 3.4 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      v.isoEllipse(b.x, b.y, 5);
      ctx.fill();
    }
    this.drawBody(v, T, Z);
  }

  /** The chimera: a finned serpent tail, a feathered body, wings and a bird's head. Stand-in shapes. */
  private drawBody(v: DrawView, T: number, Z: number): void {
    const { ctx, px, py } = v;
    const fall = this.state === 'fall' ? clamp(this.t / FALL, 0, 1) : 0;
    const z = 34 + Math.sin(T * 2.2) * 4 - fall * 30;
    const sx = px(this.x, this.y);
    const sy = py(this.x, this.y, z);
    ctx.globalAlpha = 1 - fall * 0.8;
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    v.isoEllipse(this.x, this.y, 16);
    ctx.fill();
    const hurt = this.flash > 0;
    const scale = Z * (this.angry ? 1.08 : 1);
    // The serpent's tail, coiling down, with a fin.
    ctx.strokeStyle = hurt ? '#FFFFFF' : '#2E8B7A';
    ctx.lineWidth = 7 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy + 8 * scale);
    ctx.bezierCurveTo(
      sx + 18 * scale,
      sy + 22 * scale + Math.sin(T * 3) * 4 * scale,
      sx - 20 * scale,
      sy + 28 * scale,
      sx - 6 * scale + Math.sin(T * 3 + 1) * 5 * scale,
      sy + 38 * scale,
    );
    ctx.stroke();
    ctx.fillStyle = hurt ? '#FFFFFF' : '#5FD0B8';
    ctx.beginPath();
    ctx.moveTo(sx - 6 * scale, sy + 36 * scale);
    ctx.lineTo(sx - 16 * scale, sy + 44 * scale);
    ctx.lineTo(sx + 2 * scale, sy + 44 * scale);
    ctx.closePath();
    ctx.fill();
    // Wings, beating.
    const flap = Math.sin(T * 7) * 10 * scale;
    ctx.fillStyle = hurt ? '#FFFFFF' : '#4B2E83';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx, sy - 2 * scale);
      ctx.lineTo(sx + side * 30 * scale, sy - 16 * scale - flap);
      ctx.lineTo(sx + side * 24 * scale, sy - 2 * scale - flap * 0.4);
      ctx.lineTo(sx + side * 14 * scale, sy + 6 * scale);
      ctx.closePath();
      ctx.fill();
    }
    // The body, feathered purple over teal scales.
    ctx.fillStyle = hurt ? '#FFFFFF' : '#6A3FB0';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 10 * scale, 13 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    // The bird's head: a crest, a hooked beak and two glowing eyes.
    const hy = sy - 16 * scale;
    ctx.fillStyle = hurt ? '#FFFFFF' : '#7E52C4';
    ctx.beginPath();
    ctx.arc(sx, hy, 7.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hurt ? '#FFFFFF' : '#F2B33A';
    ctx.beginPath();
    ctx.moveTo(sx + 5 * scale, hy - 1 * scale);
    ctx.lineTo(sx + 15 * scale, hy + 3 * scale);
    ctx.lineTo(sx + 5 * scale, hy + 4 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hurt ? '#FFFFFF' : '#C83D7A';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(sx - 3 * scale + i * 3 * scale, hy - 6 * scale);
      ctx.lineTo(sx - 6 * scale + i * 3 * scale, hy - 15 * scale);
      ctx.lineTo(sx + i * 3 * scale, hy - 7 * scale);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = this.angry ? '#FF5A6A' : '#C8F56A';
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx + 1.5 * scale + e * 2.6 * scale, hy - 1 * scale, 1.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
