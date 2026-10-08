/**
 * The Deep One, the kid's island 6 leviathan, at the surface: huge and slow,
 * asleep in the open sea off island 6's temple. A boat within NOTICE wakes it,
 * and its great back comes up with three tentacles. It wades after the boat,
 * slower than any boat, and fights three ways, each warned:
 *
 * One tentacle grabs. When the boat comes within GRAB_R of its body the water
 * boils where the boat will be, a ring of bubbles, and a moment later the
 * tentacle bursts up there; a boat in it is held fast and squeezed until a
 * harpoon in the tentacle makes it let go (it lets go on its own after a while).
 * Two tentacles shoot: they stand up either side of it and lob driftwood logs
 * at where the boat will be, each landing in a ring shown on the water. And
 * every few seconds its one great eye opens: that is where the harpoon hurts
 * it. Harpoon it down from DEEP_RESOLVE and instead of dying it takes hold of
 * the boat and drags it under; the game takes the figure down to its temple,
 * where it waits as Cthulhu. Sail away from its water, or be sunk, and it sinks
 * back to sleep, whole. Past half it is angry: its eye stays shut less and it
 * shoots more often.
 */

import { angDiff, clamp } from '../core/math';
import { TEMPLE } from '../world/isle6';
import type { DrawView, Entity, Layer, World } from './entity';

/** Where it sleeps: out in the sea off the temple, east of island 6. */
export const LAIR6 = { x: TEMPLE.x + 420, y: TEMPLE.y } as const;
/** A boat this near its lair wakes it; this far off it, it gives up. */
export const NOTICE = 650;
export const LEASH = 1300;
/** Harpoon hits in its eye to beat it. */
export const DEEP_RESOLVE = 10;
/** It wades this fast, and keeps within this of its lair. */
export const WADE = 38;
export const HOME_R = 500;
/** Its body: nothing sails through it. */
export const BODY_R = 80;
/** The grab: within this of its body, bubbles for GRAB_UP at where the boat will be, then the tentacle; it holds at most HOLD_MAX. */
export const GRAB_R = 230;
export const GRAB_UP = 0.9;
export const GRAB_HIT = 40;
export const HOLD_MAX = 2.6;
export const GRAB_EVERY = 5;
/** What the squeeze costs the boat each second it is held. */
export const SQUEEZE = 9;
/** The logs: one every so often from each shooter in turn, within this reach, flying this long; what one costs. */
export const SHOOT_EVERY = 2.3;
export const SHOOT_ANGRY = 1.5;
export const SHOOT_RANGE = 520;
export const LOG_FLIGHT = 0.95;
export const LOG_HIT = 34;
export const LOG = 15;
/** Its eye: open this long, every so often. */
export const EYE_OPEN = 2;
export const EYE_EVERY = 5;
export const EYE_EVERY_ANGRY = 3.6;
/** Seconds to rise, and to drag the boat under once beaten. */
export const RISE_T = 1.4;
export const DRAG_T = 2.4;

export type DeepState = 'sleep' | 'rise' | 'fight' | 'drag' | 'down';

export type Log = {
  x0: number;
  y0: number;
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  t: number;
};

export class DeepOne implements Entity {
  state: DeepState = 'sleep';
  x: number = LAIR6.x;
  y: number = LAIR6.y;
  h = Math.PI;
  t = 0;
  resolve = DEEP_RESOLVE;
  /** How far up out of the water, 0 asleep to 1. */
  up = 0;
  flash = 0;
  /** The eye: open, and seconds on the eye's clock. */
  eye = false;
  private eyeT = 0;
  /** The grab: where it will come up, seconds into it, and whether it has the boat. */
  grab: { x: number; y: number; t: number; held: boolean } | null = null;
  private grabCd = 2;
  /** The logs in the air, and which shooter is next. */
  readonly logs: Log[] = [];
  private shootCd = 1.5;
  private shooter = 1;
  private turn = 0;
  private lastH: number | null = null;
  /** It woke. */
  onRise: (() => void) | null = null;
  /** The bubbles begin where it will grab; a log is thrown. For sounds. */
  onWarn: ((what: 'grab' | 'log') => void) | null = null;
  /** It has the boat: hold it still. The squeeze, each frame it holds, as health lost. */
  onGrab: (() => void) | null = null;
  onSqueeze: ((n: number) => void) | null = null;
  /** A log came down on the boat; one splashed. */
  onLog: (() => void) | null = null;
  onSplash: ((x: number, y: number) => void) | null = null;
  /** Beaten: it takes hold of the boat to drag it under; then it is down, and the game goes after it. */
  onBeaten: (() => void) | null = null;
  onDragged: (() => void) | null = null;

  get fighting(): boolean {
    return this.state === 'rise' || this.state === 'fight';
  }

  get angry(): boolean {
    return this.resolve <= DEEP_RESOLVE / 2;
  }

  /** It has the boat, and the boat cannot sail. */
  get holding(): boolean {
    return !!this.grab?.held || this.state === 'drag';
  }

  /** Back to sleep in its lair, whole, as when the boat sails off or sinks. */
  reset(): void {
    if (this.state === 'down' || this.state === 'drag') return;
    this.state = 'sleep';
    this.t = 0;
    this.up = 0;
    this.resolve = DEEP_RESOLVE;
    this.eye = false;
    this.eyeT = 0;
    this.grab = null;
    this.logs.length = 0;
    this.x = LAIR6.x;
    this.y = LAIR6.y;
  }

  /** Beaten for good at the surface, as a save remembers: it waits below. */
  down(): void {
    this.state = 'down';
    this.grab = null;
    this.logs.length = 0;
    this.up = 0;
  }

  /** Its eye, where a harpoon hurts it. */
  private eyeAt(): { x: number; y: number } {
    return { x: this.x + Math.cos(this.h) * 50, y: this.y + Math.sin(this.h) * 50 };
  }

  /** Where a harpoon would strike now: the tentacle holding the boat first, else the open eye. */
  mark(): { x: number; y: number } | null {
    if (this.state !== 'fight') return null;
    if (this.grab && this.grab.t >= GRAB_UP) return this.grab;
    return this.eye ? this.eyeAt() : null;
  }

  /** A harpoon struck it where mark said. Returns whether that beat it. */
  harpoon(power: number): boolean {
    if (this.state !== 'fight') return false;
    if (this.grab && this.grab.t >= GRAB_UP) {
      // The grabbing tentacle lets go and sinks.
      this.grab = null;
      this.grabCd = GRAB_EVERY;
      this.flash = 0.6;
      return false;
    }
    if (!this.eye) return false;
    this.resolve = Math.max(0, this.resolve - power);
    this.flash = 1;
    this.eye = false;
    this.eyeT = 0;
    if (this.resolve > 0) return false;
    this.state = 'drag';
    this.t = 0;
    this.logs.length = 0;
    this.grab = null;
    this.onBeaten?.();
    return true;
  }

  update(dt: number, w: World): void {
    const b = w.boat;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.lastH !== null && dt > 0)
      this.turn += (clamp(angDiff(b.h, this.lastH) / dt, -3, 3) - this.turn) * Math.min(1, dt * 6);
    this.lastH = b.h;
    this.updateLogs(dt, w);
    if (this.state === 'down') return;
    if (this.state === 'drag') {
      this.up = Math.max(0, 1 - this.t / DRAG_T);
      if (this.t >= DRAG_T) {
        this.state = 'down';
        this.onDragged?.();
      }
      return;
    }
    const fromLair = Math.hypot(b.x - LAIR6.x, b.y - LAIR6.y);
    if (this.state === 'sleep') {
      this.up += (0.12 - this.up) * Math.min(1, dt);
      if (w.started && fromLair < NOTICE) {
        this.state = 'rise';
        this.t = 0;
        this.onRise?.();
      }
      return;
    }
    if (fromLair > LEASH) {
      this.reset();
      return;
    }
    if (this.state === 'rise') {
      this.up = Math.min(1, 0.12 + this.t / RISE_T);
      if (this.t >= RISE_T) {
        this.state = 'fight';
        this.t = 0;
      }
      return;
    }
    const dx = b.x - this.x;
    const dy = b.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const hull = 24 * w.hullScale;
    // Slowly after the boat, never far from its lair.
    this.h += clamp(angDiff(Math.atan2(dy, dx), this.h), -0.8 * dt, 0.8 * dt);
    if (!this.grab?.held && d > BODY_R + hull + 30) {
      this.x += (dx / d) * WADE * dt;
      this.y += (dy / d) * WADE * dt;
      const lr = Math.hypot(this.x - LAIR6.x, this.y - LAIR6.y);
      if (lr > HOME_R) {
        this.x = LAIR6.x + ((this.x - LAIR6.x) / lr) * HOME_R;
        this.y = LAIR6.y + ((this.y - LAIR6.y) / lr) * HOME_R;
      }
    }
    // The eye, opening and shutting.
    this.eyeT += dt;
    if (this.eye && this.eyeT >= EYE_OPEN) {
      this.eye = false;
      this.eyeT = 0;
    } else if (!this.eye && this.eyeT >= (this.angry ? EYE_EVERY_ANGRY : EYE_EVERY) - EYE_OPEN) {
      this.eye = true;
      this.eyeT = 0;
    }
    // The grab.
    this.grabCd -= dt;
    if (this.grab) {
      const g = this.grab;
      g.t += dt;
      if (!g.held && g.t >= GRAB_UP && g.t - dt < GRAB_UP) {
        if (Math.hypot(b.x - g.x, b.y - g.y) < GRAB_HIT + hull) {
          g.held = true;
          this.onGrab?.();
        }
      }
      if (g.held) {
        b.v = 0;
        this.onSqueeze?.(SQUEEZE * dt);
      }
      if ((g.held && g.t >= GRAB_UP + HOLD_MAX) || (!g.held && g.t >= GRAB_UP + 0.8)) {
        this.grab = null;
        this.grabCd = GRAB_EVERY;
      }
    } else if (this.grabCd <= 0 && d < GRAB_R + BODY_R) {
      const p = this.ahead(b, GRAB_UP);
      this.grab = { x: p.x, y: p.y, t: 0, held: false };
      this.onWarn?.('grab');
    }
    // The logs, from each shooter in turn.
    this.shootCd -= dt;
    if (this.shootCd <= 0 && d < SHOOT_RANGE && !this.grab?.held) {
      this.shootCd = this.angry ? SHOOT_ANGRY : SHOOT_EVERY;
      this.shooter = -this.shooter;
      const s = this.shooterAt(this.shooter);
      const p = this.ahead(b, LOG_FLIGHT);
      this.logs.push({ x0: s.x, y0: s.y, x: s.x, y: s.y, z: 60, tx: p.x, ty: p.y, t: 0 });
      this.onWarn?.('log');
    }
  }

  private updateLogs(dt: number, w: World): void {
    const b = w.boat;
    for (let i = this.logs.length - 1; i >= 0; i--) {
      const l = this.logs[i] as Log;
      l.t += dt;
      const k = Math.min(1, l.t / LOG_FLIGHT);
      l.x = l.x0 + (l.tx - l.x0) * k;
      l.y = l.y0 + (l.ty - l.y0) * k;
      l.z = 60 * (1 - k) + Math.sin(Math.PI * k) * 90;
      if (k >= 1) {
        this.logs.splice(i, 1);
        if (Math.hypot(b.x - l.tx, b.y - l.ty) < LOG_HIT + 24 * w.hullScale) this.onLog?.();
        this.onSplash?.(l.tx, l.ty);
      }
    }
  }

  /** A shooting tentacle, to one side of it (1 or -1). */
  shooterAt(side: number): { x: number; y: number } {
    const c = Math.cos(this.h);
    const s = Math.sin(this.h);
    return { x: this.x - s * 95 * side - c * 20, y: this.y + c * 95 * side - s * 20 };
  }

  /** Where the boat will be in t seconds, turning as it is now. */
  private ahead(
    b: { x: number; y: number; h: number; v: number },
    t: number,
  ): { x: number; y: number } {
    let x = b.x;
    let y = b.y;
    let h = b.h;
    const n = 10;
    const st = t / n;
    for (let i = 0; i < n; i++) {
      h += this.turn * st;
      x += Math.cos(h) * b.v * st;
      y += Math.sin(h) * b.v * st;
    }
    return { x, y };
  }

  /** The rings where logs and the grab will land, on the water; it, its tentacles and the logs, above. */
  draw(v: DrawView, layer: Layer): void {
    if (this.state === 'down') return;
    if (!v.onScreen(this.x, this.y, 500 * v.zoom)) return;
    if (layer === 'surface') this.drawWater(v);
    else if (layer === 'air') this.drawLogs(v);
  }

  private drawWater(v: DrawView): void {
    const { ctx } = v;
    const Z = v.zoom;
    for (const l of this.logs) {
      const k = Math.min(1, l.t / LOG_FLIGHT);
      v.isoEllipse(l.tx, l.ty, LOG_HIT);
      ctx.fillStyle = `rgba(140,95,50,${0.15 + 0.25 * k})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,180,110,.9)';
      ctx.lineWidth = 2.4 * Z;
      ctx.stroke();
    }
    const g = this.grab;
    if (g && g.t < GRAB_UP) {
      for (let k = 0; k < 3; k++) {
        const t = (v.T * 3 + k / 3) % 1;
        v.isoEllipse(g.x, g.y, 14 + t * 30);
        ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - t)})`;
        ctx.lineWidth = 2 * Z;
        ctx.stroke();
      }
    }
    // A wide swell round its back.
    if (this.up > 0.05) {
      v.isoEllipse(this.x, this.y, BODY_R + 30 + Math.sin(v.T * 1.5) * 6);
      ctx.strokeStyle = `rgba(255,255,255,${0.35 * this.up})`;
      ctx.lineWidth = 3 * Z;
      ctx.stroke();
    }
  }

  private drawLogs(v: DrawView): void {
    const { ctx, px, py } = v;
    const Z = v.zoom;
    for (const l of this.logs) {
      const x = px(l.x, l.y);
      const y = py(l.x, l.y, l.z);
      const a = l.t * 6;
      ctx.strokeStyle = '#7A5230';
      ctx.lineWidth = 7 * Z;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * 14 * Z, y - Math.sin(a) * 6 * Z);
      ctx.lineTo(x + Math.cos(a) * 14 * Z, y + Math.sin(a) * 6 * Z);
      ctx.stroke();
      ctx.fillStyle = '#C69A62';
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(a) * 14 * Z,
        y + Math.sin(a) * 6 * Z,
        3.5 * Z,
        3.5 * Z,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  /** It, for the game's depth-sorted solids: its back, its eye, and the tentacles. */
  drawBody(v: DrawView): void {
    if (this.state === 'down' || this.up <= 0.02) return;
    if (!v.onScreen(this.x, this.y, 500 * v.zoom)) return;
    drawDeepOne(v, this, this.up);
  }
}

const SKIN = '#2F4A45';
const SKIN_LIGHT = '#4E7A6E';

/** A tentacle from the water at a world point, up to height h, curling, suckers on its inside. */
export function drawTentacle(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  phase: number,
  thick = 1,
): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const sy = py(x, y);
  const sway = Math.sin(T * 2.2 + phase) * 10 * Z;
  ctx.strokeStyle = SKIN;
  ctx.lineCap = 'round';
  ctx.lineWidth = 13 * Z * thick;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.bezierCurveTo(
    sx + sway,
    sy - h * 0.4 * Z,
    sx - sway * 1.4,
    sy - h * 0.75 * Z,
    sx + sway * 0.6 + 8 * Z,
    sy - h * Z,
  );
  ctx.stroke();
  ctx.strokeStyle = SKIN_LIGHT;
  ctx.lineWidth = 4 * Z * thick;
  ctx.stroke();
  ctx.fillStyle = '#C9B9A0';
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    ctx.beginPath();
    ctx.arc(sx + sway * (0.5 - t) * 0.6, sy - h * t * Z, 2 * Z * thick, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The Deep One: a great barnacled back out of the sea, its eye, and its tentacles. */
export function drawDeepOne(v: DrawView, d: DeepOne, up: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const sx = px(d.x, d.y);
  const sy = py(d.x, d.y);
  const w = 110 * Z;
  const h = 70 * Z * up;
  // The shooters, either side, and the grab, wherever it is.
  for (const side of [-1, 1]) {
    const s = d.shooterAt(side);
    drawTentacle(v, s.x, s.y, 80 * up, side, 0.9);
  }
  // Its back: a dome, mottled, with barnacles.
  ctx.fillStyle = d.flash > 0 ? '#5E8F84' : SKIN;
  ctx.beginPath();
  ctx.moveTo(sx - w, sy);
  ctx.bezierCurveTo(sx - w, sy - h * 1.3, sx + w, sy - h * 1.3, sx + w, sy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(200,220,200,.25)';
  for (let i = 0; i < 9; i++) {
    const bx = sx + Math.sin(i * 7.1) * w * 0.7;
    const by = sy - h * (0.3 + ((i * 37) % 50) / 80);
    ctx.beginPath();
    ctx.arc(bx, by, (2 + (i % 3)) * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // The eye, on the side toward the boat: shut, a fold; open, huge and gold.
  const ex = sx + (Math.cos(d.h) - Math.sin(d.h)) * 26 * Z;
  const ey = sy - h * 0.7;
  if (d.eye) {
    ctx.fillStyle = 'rgba(255,220,90,.35)';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 22 * Z, 14 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F5D45A';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 14 * Z, 9 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1A1408';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 2.4 * Z, 8 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#1E302C';
    ctx.lineWidth = 2.5 * Z;
    ctx.beginPath();
    ctx.moveTo(ex - 12 * Z, ey);
    ctx.quadraticCurveTo(ex, ey + 4 * Z + Math.sin(T) * Z, ex + 12 * Z, ey);
    ctx.stroke();
  }
  const g = d.grab;
  if (g && g.t >= GRAB_UP) drawTentacle(v, g.x, g.y, g.held ? 70 : 90, 0.3, 1.2);
}
