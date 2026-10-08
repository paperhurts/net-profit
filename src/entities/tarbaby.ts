/**
 * The tarbaby, the kid's: what is left of the Tar Anchorer once it is beaten,
 * a little blob of tar with its yellow eyes, and it comes with you. Aboard it
 * rides on the deck by the stern. Ashore it hops along at the figure's heel,
 * every island and every room, along the way the figure walked, and pops up
 * beside it if it falls far behind. In a fight it spits a blob of tar at
 * whatever the figure is fighting every couple of seconds, one hit each.
 * Nothing hurts it. The game finds what it spits at, as for the warlock.
 */

import type { DrawView, Entity, Layer, World } from './entity';
import { walkable, walkStep } from './walker';

/** It keeps this close behind the figure, hops this fast, and further off than BLINK it pops over. */
export const TB_HEEL = 18;
export const TB_SPEED = 100;
export const TB_BLINK = 200;
/** A spit every so often at something this close, landing with this power. */
export const SPIT_EVERY = 2.4;
export const SPIT_RANGE = 120;
export const SPIT_POWER = 1;
export const SPIT_SPEED = 240;

export type SpitTarget = { x: number; y: number; hit(power: number): void };

type Spit = { x0: number; y0: number; to: SpitTarget; t: number; dur: number };

export class Tarbaby implements Entity {
  /** Freed: it is yours. */
  free = false;
  /** Beside the figure, ashore. */
  with = false;
  x = 0;
  y = 0;
  h = Math.PI / 4;
  /** The hop: its phase, and how much it is hopping. */
  ph = 0;
  gait = 0;
  readonly spits: Spit[] = [];
  private spitCd = 1;
  private readonly trail: { x: number; y: number }[] = [];
  /** What it can spit at, nearest, within reach; the game knows. */
  findTarget: ((x: number, y: number, range: number) => SpitTarget | null) | null = null;
  /** It spat. */
  onSpit: (() => void) | null = null;

  /** Out of the tar at a point, as the Anchorer melts: yours, and beside the figure. */
  come(x: number, y: number): void {
    this.free = true;
    this.with = true;
    this.x = x;
    this.y = y;
    this.trail.length = 0;
  }

  /** Beside the figure, now, on ground it can stand on. */
  private arrive(f: { x: number; y: number }): void {
    this.x = f.x;
    this.y = f.y;
    for (const [dx, dy] of [
      [-14, 10],
      [10, -14],
      [-14, -6],
      [12, 8],
    ] as const) {
      if (walkable(f.x + dx, f.y + dy, 99)) {
        this.x = f.x + dx;
        this.y = f.y + dy;
        break;
      }
    }
    this.trail.length = 0;
  }

  update(dt: number, w: World): void {
    for (let i = this.spits.length - 1; i >= 0; i--) {
      const s = this.spits[i] as Spit;
      s.t += dt;
      if (s.t >= s.dur) {
        this.spits.splice(i, 1);
        s.to.hit(SPIT_POWER);
      }
    }
    if (!this.free) return;
    const f = w.figure;
    if (!f) {
      this.with = false;
      this.spits.length = 0;
      return;
    }
    if (!this.with || Math.hypot(f.x - this.x, f.y - this.y) > TB_BLINK) {
      this.with = true;
      this.arrive(f);
      return;
    }
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(f.x - last.x, f.y - last.y) >= 5) {
      this.trail.push({ x: f.x, y: f.y });
      if (this.trail.length > 80) this.trail.shift();
    }
    const d = Math.hypot(f.x - this.x, f.y - this.y);
    this.gait = Math.max(0, this.gait - dt * 4);
    if (d > TB_HEEL) {
      while (this.trail.length > 1) {
        const c = this.trail[0] as { x: number; y: number };
        if (Math.hypot(c.x - this.x, c.y - this.y) >= 4) break;
        this.trail.shift();
      }
      const t = this.trail[0] ?? f;
      const dx = t.x - this.x;
      const dy = t.y - this.y;
      const dl = Math.hypot(dx, dy);
      if (dl > 0.5) {
        const sp = Math.min(TB_SPEED, 30 + (d - TB_HEEL) * 5);
        const moved = walkStep(this, (dx / dl) * sp * dt, (dy / dl) * sp * dt, 99);
        if (moved > 0) {
          this.h = Math.atan2(dy, dx);
          this.ph += moved * 0.35;
          this.gait = 1;
        }
      }
    }
    // Spit at whatever is in reach.
    this.spitCd -= dt;
    if (this.spitCd <= 0) {
      const to = this.findTarget?.(this.x, this.y, SPIT_RANGE) ?? null;
      if (to) {
        this.spitCd = SPIT_EVERY;
        this.h = Math.atan2(to.y - this.y, to.x - this.x);
        const dur = Math.max(0.15, Math.hypot(to.x - this.x, to.y - this.y) / SPIT_SPEED);
        this.spits.push({ x0: this.x, y0: this.y, to, t: 0, dur });
        this.onSpit?.();
      } else this.spitCd = 0.3;
    }
  }

  /** It, at its feet, for the game's sorted solids. */
  drawBody(v: DrawView): void {
    if (!this.with) return;
    const hop = Math.abs(Math.sin(this.ph)) * 5 * this.gait;
    drawTarblob(v, v.px(this.x, this.y), v.py(this.x, this.y, hop), this.h, 1, v.T);
    // Its shadow, small, under it while it hops.
    if (hop > 0.5) {
      v.isoEllipse(this.x, this.y, 5);
      v.ctx.fillStyle = 'rgba(0,0,0,.18)';
      v.ctx.fill();
    }
  }

  /** On the deck by the stern of a boat of this hull scale, while the figure is aboard. */
  drawAboard(v: DrawView, b: { x: number; y: number; h: number }, k: number): void {
    if (!this.free || this.with) return;
    const c = Math.cos(b.h);
    const s = Math.sin(b.h);
    const x = b.x - c * 15 * k + s * 4 * k;
    const y = b.y - s * 15 * k - c * 4 * k;
    drawTarblob(v, v.px(x, y), v.py(x, y, 9 * k + 1), b.h, 0.9, v.T);
  }

  /** Its spits, in the air. */
  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'air') return;
    const { ctx, px, py } = v;
    const Z = v.zoom;
    for (const s of this.spits) {
      const k = s.t / s.dur;
      const x = s.x0 + (s.to.x - s.x0) * k;
      const y = s.y0 + (s.to.y - s.y0) * k;
      const z = 8 + Math.sin(Math.PI * k) * 22;
      ctx.fillStyle = '#1C1719';
      ctx.beginPath();
      ctx.ellipse(px(x, y), py(x, y, z), 3.2 * Z, 2.6 * Z, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(185,150,230,.6)';
      ctx.beginPath();
      ctx.arc(px(x, y) - 1 * Z, py(x, y, z) - 1 * Z, 0.9 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A tarbaby at a screen point: a glossy black drop with yellow eyes toward where it faces. */
export function drawTarblob(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  size: number,
  T: number,
): void {
  const { ctx } = v;
  const Z = v.zoom * size;
  const wob = Math.sin(T * 5) * 0.4 * Z;
  ctx.fillStyle = '#1C1719';
  ctx.beginPath();
  ctx.moveTo(x - 7 * Z, y);
  ctx.bezierCurveTo(x - 8 * Z, y - 9 * Z, x - 2 * Z + wob, y - 15 * Z, x + wob, y - 16 * Z);
  ctx.bezierCurveTo(x + 2 * Z + wob, y - 15 * Z, x + 8 * Z, y - 9 * Z, x + 7 * Z, y);
  ctx.closePath();
  ctx.fill();
  // A purple sheen on it.
  ctx.strokeStyle = 'rgba(170,130,230,.5)';
  ctx.lineWidth = 1 * Z;
  ctx.beginPath();
  ctx.moveTo(x - 4 * Z, y - 10 * Z);
  ctx.quadraticCurveTo(x - 5.5 * Z, y - 6 * Z, x - 4.5 * Z, y - 2.5 * Z);
  ctx.stroke();
  // Its eyes, when it looks toward the viewer at all.
  const c = Math.cos(h);
  const s = Math.sin(h);
  const fx = c - s;
  const fy = (c + s) / 2;
  if (fy > -0.4) {
    for (const e of [-1, 1]) {
      ctx.fillStyle = '#FFE36A';
      ctx.beginPath();
      ctx.ellipse(x + (fx * 1.8 + e * 2.4) * Z, y - 8 * Z, 1.7 * Z, 1.2 * Z, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
