/**
 * The warlock's merlocks, the kid's: in Gigantis's throne room the warlock
 * calls fish-men up out of a puddle of sea to fight beside the figure. Each has
 * three hit points and a little trident; it goes for the nearest of the dead and
 * jabs it for 1. With nothing to fight it keeps near the figure. Hurt to none, it
 * splashes back into the water. They are all gone when the fight is over. The
 * game finds what they fight, and says what hurts them.
 */

import { clamp } from '../core/math';
import type { DrawView, Entity, Layer, World } from './entity';
import type { PalTarget } from './pals';
import { walkStep } from './walker';

export const MERLOCK_HP = 3;
export const MERLOCK_SPEED = 80;
/** It goes for the dead this near it, jabs from this close, this often, this hard. */
export const MERLOCK_SEEK = 240;
export const MERLOCK_REACH = 22;
export const JAB_EVERY = 1.2;
export const JAB = 1;
/** Seconds to climb out of the water, and to splash back into it. */
export const MERLOCK_RISE = 0.7;
export const MERLOCK_SINK = 0.6;
/** Blinking this long after a hit. */
export const MERLOCK_INVULN = 1;

export type Merlock = {
  x: number;
  y: number;
  h: number;
  hp: number;
  state: 'rise' | 'fight' | 'sink' | 'gone';
  t: number;
  cd: number;
  invuln: number;
  ph: number;
  /** Seconds since its last jab began, for the jab's look. */
  jabT: number;
};

export class Merlocks implements Entity {
  readonly list: Merlock[] = [];
  /** What it can fight, nearest, within reach of a point; the game knows. */
  findTarget: ((x: number, y: number, range: number) => PalTarget | null) | null = null;
  /** It jabbed something. */
  onJab: (() => void) | null = null;
  /** It was hurt; out says it splashed back into the water. */
  onHurt: ((m: Merlock, out: boolean) => void) | null = null;

  /** One called up out of the floor at a point. */
  call(x: number, y: number): Merlock {
    const m: Merlock = {
      x,
      y,
      h: Math.PI / 4,
      hp: MERLOCK_HP,
      state: 'rise',
      t: 0,
      cd: 0.4,
      invuln: 0,
      ph: this.list.length * 1.7,
      jabT: 9,
    };
    this.list.push(m);
    return m;
  }

  /** How many are up and fighting, or on their way. */
  get standing(): number {
    return this.list.filter((m) => m.state === 'rise' || m.state === 'fight').length;
  }

  /** The fight is over: back into the water, every one. */
  clear(): void {
    this.list.length = 0;
  }

  /** A hit on one. Returns whether it hurt. */
  hurt(m: Merlock): boolean {
    if (m.state !== 'fight' || m.invuln > 0) return false;
    m.hp--;
    m.invuln = MERLOCK_INVULN;
    if (m.hp <= 0) {
      m.state = 'sink';
      m.t = 0;
    }
    this.onHurt?.(m, m.hp <= 0);
    return true;
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const m = this.list[i] as Merlock;
      m.t += dt;
      m.ph += dt;
      m.jabT += dt;
      m.invuln = Math.max(0, m.invuln - dt);
      if (m.state === 'rise') {
        if (m.t >= MERLOCK_RISE) {
          m.state = 'fight';
          m.t = 0;
        }
        continue;
      }
      if (m.state === 'sink') {
        if (m.t >= MERLOCK_SINK) this.list.splice(i, 1);
        continue;
      }
      if (m.state !== 'fight') continue;
      m.cd -= dt;
      const tg = this.findTarget?.(m.x, m.y, MERLOCK_SEEK) ?? null;
      let tx = f ? f.x : m.x;
      let ty = f ? f.y : m.y;
      let near = 36;
      if (tg) {
        tx = tg.x;
        ty = tg.y;
        near = MERLOCK_REACH * 0.8;
      }
      const dx = tx - m.x;
      const dy = ty - m.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.5) m.h = Math.atan2(dy, dx);
      if (d > near) {
        const st = Math.min(d - near, MERLOCK_SPEED * dt);
        walkStep(m, (dx / d) * st, (dy / d) * st, 99);
      } else if (tg && m.cd <= 0) {
        m.cd = JAB_EVERY;
        m.jabT = 0;
        tg.hit(JAB);
        this.onJab?.();
      }
    }
  }

  /** Drawn by the game among the room's sorted actors. */
  draw(_v: DrawView, _layer: Layer): void {}

  /** One merlock, at its feet: a little blue-green fish-man with a fin on its head and a trident. */
  drawBody(v: DrawView, m: Merlock): void {
    const { ctx, px, py, T } = v;
    const k = v.zoom;
    const sx = px(m.x, m.y);
    let base = py(m.x, m.y);
    const up =
      m.state === 'rise'
        ? clamp(m.t / MERLOCK_RISE, 0, 1)
        : m.state === 'sink'
          ? 1 - clamp(m.t / MERLOCK_SINK, 0, 1)
          : 1;
    // The puddle it stands in as it comes and goes.
    if (up < 1) {
      ctx.fillStyle = 'rgba(80,170,200,.55)';
      v.isoEllipse(m.x, m.y, 12);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx - 30 * k, base - 50 * k, 60 * k, 50 * k);
      ctx.clip();
      base += (1 - up) * 26 * k;
    } else {
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      v.isoEllipse(m.x, m.y, 7);
      ctx.fill();
    }
    if (m.invuln > 0 && Math.sin(T * 30) > 0) ctx.globalAlpha = 0.5;
    const face = Math.cos(m.h) - Math.sin(m.h) >= 0 ? 1 : -1;
    const stride = m.state === 'fight' ? Math.sin(m.ph * 9) * 2 * k : 0;
    ctx.strokeStyle = '#2F7A74';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.2 * k;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx + side * 1.8 * k, base - 8 * k);
      ctx.lineTo(sx + side * 1.8 * k + stride * side, base);
      ctx.stroke();
    }
    ctx.fillStyle = '#3E9A92';
    ctx.beginPath();
    ctx.ellipse(sx, base - 13 * k, 4.6 * k, 6 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#B8E4D6';
    ctx.beginPath();
    ctx.ellipse(sx + face * 1 * k, base - 12 * k, 2.4 * k, 4 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    // A fish's head with a fin crest and a big round eye.
    const hy = base - 22 * k;
    ctx.fillStyle = '#3E9A92';
    ctx.beginPath();
    ctx.ellipse(sx + face * 1 * k, hy, 4.6 * k, 4 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E2725B';
    ctx.beginPath();
    ctx.moveTo(sx - face * 3 * k, hy - 2 * k);
    ctx.lineTo(sx - face * 1 * k, hy - 8 * k + Math.sin(T * 6 + m.ph) * k);
    ctx.lineTo(sx + face * 2 * k, hy - 3.5 * k);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(sx + face * 2.6 * k, hy - 0.6 * k, 1.6 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1E2227';
    ctx.beginPath();
    ctx.arc(sx + face * 3 * k, hy - 0.6 * k, 0.8 * k, 0, Math.PI * 2);
    ctx.fill();
    // The trident, thrust out as it jabs.
    const out = m.jabT < 0.25 ? Math.sin((m.jabT / 0.25) * Math.PI) * 6 * k : 0;
    const hx = sx + face * (5 * k + out);
    ctx.strokeStyle = '#C9B37A';
    ctx.lineWidth = 1.4 * k;
    ctx.beginPath();
    ctx.moveTo(hx, base - 4 * k);
    ctx.lineTo(hx, base - 26 * k);
    ctx.stroke();
    ctx.beginPath();
    for (const p of [-2, 0, 2]) {
      ctx.moveTo(hx + p * k, base - 26 * k);
      ctx.lineTo(hx + p * k, base - 30 * k);
    }
    ctx.moveTo(hx - 2 * k, base - 26 * k);
    ctx.lineTo(hx + 2 * k, base - 26 * k);
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (up < 1) ctx.restore();
  }
}
