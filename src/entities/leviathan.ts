/**
 * The leviathan, moved verbatim from the prototype script. Something
 * enormous crawls round the island 2,180 units out on a rounded square: a
 * chain of 28 shadows, the odd back breaking the surface, a line of faint
 * lights at night. When the boat comes within 300 of any part of it, the
 * game hears once every fourteen seconds and does the shaking, the low note,
 * the toast and the remembering.
 *
 * It also guards the buoys. The moment a flagship crosses them, going out to
 * the deep or coming home from it, the leviathan leaves its path and rises
 * across the boat's way: spines first, about a second and a half of sailing
 * ahead. It waits for the crossing rather than for a heading, because the
 * lanternfish and goldfin school within 300 of the buoys, and a boat sweeping
 * them points at the buoys all the time. It stays up while the boat keeps
 * coming, and sinks once the boat turns away or stops, which leaves the way
 * open until it is ready again. While it is up it is a wall: a
 * boat that runs into it is shoved back to its own side and the game knocks
 * fish overboard, once; never the boat, never coins. Ramming it gets nothing
 * but the loss, because it stays up while the boat keeps pushing. The tests
 * play the dodge with a person's reaction.
 */

import { rgba } from '../core/color';
import { clamp } from '../core/math';
import { TIER_NAME } from '../data/tuning';
import { IX, IY, type Point, pastBuoys } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

/** Shadows in the chain. */
export const LEV_N = 28;
/** How far out from the island the path runs. */
export const LEV_ORBIT = 2180;
/** Radians per second along the path. */
export const LEV_SPEED = 0.03;
/** The boat this close to any part of it feels it pass. */
export const RUMBLE_RADIUS = 300;
/** Seconds between passes the game hears about. */
export const RUMBLE_EVERY = 14;

/** It rises this many seconds of sailing ahead of the boat, but never nearer than GUARD_NEAR or further than GUARD_FAR. */
export const GUARD_LEAD = 1.6;
export const GUARD_NEAR = 380;
export const GUARD_FAR = 700;
/** Slower than this, a boat on the buoys is drifting, not crossing. */
export const GUARD_SPEED = 20;
/** Seconds to rise, spines first; the least it stays up once the boat backs off; the most it stays up at all; seconds to sink. */
export const RISE = 1.1;
export const UP = 2.4;
export const UP_MAX = 9;
export const SINK = 0.9;
/** A boat can run into it from this far into the rise until it starts to sink. */
export const SOLID_FROM = 0.5;
/** Half its length across the boat's way, and the half width of its back. */
export const BODY_HALF = 380;
export const BODY_R = 46;
/** A boat within this of it, still coming, holds it up. */
export const PRESS_RADIUS = 700;
/** Seconds after it sinks before it will rise again: long enough to cross. */
export const GUARD_COOL = 20;
/** The flagship is the only boat that can cross, so the only one it rises for. */
const FLAGSHIP = TIER_NAME.length - 1;

/** Where it rises: how far ahead of the boat, the middle of the body, along the body, and the boat's way through it. */
export type Across = {
  d: number;
  x: number;
  y: number;
  ux: number;
  uy: number;
  nx: number;
  ny: number;
};

export type Rise = Across & {
  /** Seconds since it began to rise. */
  t: number;
  /** Seconds of standing up left; it waits while the boat keeps coming. */
  up: number;
  /** Seconds into sinking, once up runs out. */
  s: number;
  hit: boolean;
};

export type Lev = {
  /** Where along the path the head is, in radians. */
  th: number;
  x: number;
  y: number;
  /** The head first, then the shadows behind it. */
  trail: Point[];
  rumbleT: number;
  /** Risen at the buoys, or null while it crawls its path. */
  rise: Rise | null;
  /** Seconds before it will rise again. */
  cool: number;
  /** How much of it shows on its path, 0..1; it dives off the path to rise and comes back after. */
  vis: number;
  /** Whether the boat was past the buoys last frame, to see it cross; null before the first. */
  out: boolean | null;
};

/** Rising d ahead of a boat at x, y heading h, lying square across its way. */
export function across(x: number, y: number, h: number, d: number): Across {
  const nx = Math.cos(h);
  const ny = Math.sin(h);
  return { d, x: x + nx * d, y: y + ny * d, ux: -ny, uy: nx, nx, ny };
}

/** How far a point is from the risen body, a line BODY_HALF each way of its middle. */
export function bodyDistance(r: Across, x: number, y: number): number {
  const a = clamp((x - r.x) * r.ux + (y - r.y) * r.uy, -BODY_HALF, BODY_HALF);
  return Math.hypot(x - (r.x + r.ux * a), y - (r.y + r.uy * a));
}

/** How far ahead it rises for a boat at this speed. */
export function guardAt(v: number): number {
  return clamp(v * GUARD_LEAD, GUARD_NEAR, GUARD_FAR);
}

/** How far it has risen, 0..1, for the drawing. */
export function risen(r: Rise): number {
  if (r.t < RISE) return r.t / RISE;
  if (r.up > 0) return 1;
  return Math.max(0, 1 - r.s / SINK);
}

/** A point on the path: a square with rounded corners, pulled in at the sides. */
export function levPos(th: number): Point {
  const A = LEV_ORBIT;
  const c = Math.cos(th);
  const sn = Math.sin(th);
  return [
    IX + A * Math.sign(c) * Math.sqrt(Math.abs(c)),
    IY + A * Math.sign(sn) * Math.sqrt(Math.abs(sn)),
  ];
}

export function createLev(rng: () => number = Math.random): Lev {
  const lev: Lev = {
    th: rng() * 6.28,
    x: 0,
    y: 0,
    trail: [],
    rumbleT: 0,
    rise: null,
    cool: 0,
    vis: 1,
    out: null,
  };
  for (let i = 0; i < LEV_N; i++) lev.trail.push(levPos(lev.th - i * 0.016));
  const head = lev.trail[0] as Point;
  lev.x = head[0];
  lev.y = head[1];
  return lev;
}

export class Leviathan implements Entity {
  readonly lev: Lev;
  /** It has just passed within RUMBLE_RADIUS of the boat. The game shakes, sounds the note, toasts and remembers the sighting. */
  onPass: (() => void) | null = null;
  /** It has begun to rise across the boat's way. The game shakes, growls and warns. */
  onRise: ((r: Rise) => void) | null = null;
  /** The boat ran into it and has been shoved back. The game knocks fish overboard. */
  onHit: (() => void) | null = null;
  /** It sank without touching the boat: the crossing is open. */
  onMiss: (() => void) | null = null;

  constructor(rng: () => number = Math.random) {
    this.lev = createLev(rng);
  }

  update(dt: number, w: World): void {
    const lev = this.lev;
    lev.th += dt * LEV_SPEED;
    const p = levPos(lev.th);
    lev.x = p[0];
    lev.y = p[1];
    const h = lev.trail[0] as Point;
    if (Math.hypot(p[0] - h[0], p[1] - h[1]) > 30) {
      lev.trail.unshift(p);
      lev.trail.length = LEV_N;
    }
    lev.rumbleT -= dt;
    lev.vis = lev.rise ? Math.max(0, lev.vis - dt * 2) : Math.min(1, lev.vis + dt * 0.7);
    const out = pastBuoys(w.boat.x, w.boat.y);
    const crossed = lev.out !== null && out !== lev.out;
    lev.out = out;
    if (lev.rise) this.guard(dt, w, lev.rise);
    else this.watch(dt, w, crossed);
    if (lev.vis < 0.9) return;
    let near = 1e9;
    for (let i = 0; i < LEV_N; i += 3) {
      const t = lev.trail[i] as Point;
      near = Math.min(near, Math.hypot(t[0] - w.boat.x, t[1] - w.boat.y));
    }
    if (w.started && near < RUMBLE_RADIUS && lev.rumbleT <= 0) {
      lev.rumbleT = RUMBLE_EVERY;
      this.onPass?.();
    }
  }

  /** On its path: rise across the way of a flagship that has just crossed the buoys, once it is ready. */
  private watch(dt: number, w: World, crossed: boolean): void {
    const lev = this.lev;
    const b = w.boat;
    lev.cool = Math.max(0, lev.cool - dt);
    if (
      !crossed ||
      lev.cool > 0 ||
      !w.started ||
      w.docked ||
      w.tier < FLAGSHIP ||
      b.v < GUARD_SPEED
    )
      return;
    lev.rise = { ...across(b.x, b.y, b.h, guardAt(b.v)), t: 0, up: UP, s: 0, hit: false };
    this.onRise?.(lev.rise);
  }

  /** Risen: wait while the boat keeps coming, stop it if it runs in, then sink. */
  private guard(dt: number, w: World, r: Rise): void {
    const lev = this.lev;
    const b = w.boat;
    r.t += dt;
    const side =
      Math.sign((b.x - r.x) * r.nx + (b.y - r.y) * r.ny) ||
      -Math.sign(Math.cos(b.h) * r.nx + Math.sin(b.h) * r.ny) ||
      -1;
    const coming = (Math.cos(b.h) * r.nx + Math.sin(b.h) * r.ny) * side < -0.2 && b.v > 30;
    const pressing = coming && bodyDistance(r, b.x, b.y) < PRESS_RADIUS;
    if (r.t > RISE + UP_MAX) r.up = 0;
    else if (r.t > RISE && r.up > 0 && !pressing) r.up -= dt;
    const reach = BODY_R + 24 * w.hullScale;
    if (r.up > 0 && r.t >= SOLID_FROM && bodyDistance(r, b.x, b.y) < reach) {
      // A wall while it is up: the first touch shoves the boat well back, stops it and costs fish;
      // after that it only holds the boat on its own side.
      const first = !r.hit;
      const a = (b.x - r.x) * r.ux + (b.y - r.y) * r.uy;
      const off = reach + (first ? 50 : 1);
      b.x = r.x + r.ux * a + r.nx * side * off;
      b.y = r.y + r.uy * a + r.ny * side * off;
      b.v = first ? 0 : b.v * 0.5;
      if (first) {
        r.hit = true;
        this.onHit?.();
      }
    }
    if (r.up > 0) return;
    r.s += dt;
    if (r.s < SINK) return;
    lev.rise = null;
    lev.cool = GUARD_COOL;
    if (!r.hit) this.onMiss?.();
  }

  draw(v: DrawView, layer: Layer): void {
    const lev = this.lev;
    if (lev.rise) this.drawRise(v, layer, lev.rise);
    if (lev.vis <= 0 || !v.onScreen(lev.x, lev.y, 700)) return;
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    ctx.globalAlpha = lev.vis;
    if (layer === 'underwater') {
      for (let i = LEV_N - 1; i >= 0; i--) {
        const p = lev.trail[i] as Point;
        const r = 10 + 52 * Math.sin((Math.PI * (i + 1.6)) / (LEV_N + 2));
        const wob = Math.sin(T * 1.1 - i * 0.55) * 14;
        const nx = lev.trail[Math.max(0, i - 1)] as Point;
        const dx = nx[0] - p[0];
        const dy = nx[1] - p[1];
        const dl = Math.hypot(dx, dy) || 1;
        const x = p[0] - (dy / dl) * wob;
        const y = p[1] + (dx / dl) * wob;
        ctx.fillStyle = 'rgba(6,20,34,.5)';
        v.isoEllipse(x, y, r);
        ctx.fill();
        if (i % 3 === 1 && Math.sin(T * 1.1 - i * 0.55) > 0.15) {
          const sx = px(x, y);
          const sy = py(x, y);
          const hgt = r * 0.55 * Z * Math.sin(T * 1.1 - i * 0.55);
          ctx.fillStyle = '#2E4558';
          ctx.beginPath();
          ctx.moveTo(sx - r * 0.35 * Z, sy);
          ctx.lineTo(sx, sy - hgt);
          ctx.lineTo(sx + r * 0.35 * Z, sy);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (layer === 'glow') {
      if (v.dark <= 0.05) return;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = rgba('#7CF5E6', 0.55 * v.dark);
      for (let i = 0; i < LEV_N; i += 2) {
        const p = lev.trail[i] as Point;
        ctx.beginPath();
        ctx.arc(px(p[0], p[1]), py(p[0], p[1]), (2 + Math.sin(T * 2 + i) * 1) * Z, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  /** Risen along the buoys: the shadow under the water, then spines, backs and foam on top. */
  private drawRise(v: DrawView, layer: Layer, r: Rise): void {
    if (!v.onScreen(r.x, r.y, BODY_HALF + 200)) return;
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    const k = risen(r);
    const N = 26;
    const seg = (i: number) => {
      const a = -BODY_HALF + ((i + 0.5) / N) * BODY_HALF * 2;
      const wob = Math.sin(T * 1.4 - i * 0.5) * 10 * k;
      const rad = BODY_R * (0.4 + 0.6 * Math.sin((Math.PI * (i + 0.8)) / (N + 1)));
      return { x: r.x + r.ux * a + r.nx * wob, y: r.y + r.uy * a + r.ny * wob, rad };
    };
    if (layer === 'underwater') {
      ctx.fillStyle = `rgba(6,20,34,${0.6 * Math.max(0.25, k)})`;
      for (let i = N - 1; i >= 0; i--) {
        const p = seg(i);
        v.isoEllipse(p.x, p.y, p.rad);
        ctx.fill();
      }
    } else if (layer === 'afloat') {
      // Foam boiling along both flanks as it comes up.
      ctx.strokeStyle = v.foam;
      ctx.lineWidth = 2.4 * Z;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.globalAlpha = 0.6 * k;
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          const p = seg(i);
          const o = (p.rad + 10 + Math.sin(T * 5 + i * 1.7) * 4) * side;
          const x = p.x + r.nx * o;
          const y = p.y + r.ny * o;
          if (i) ctx.lineTo(px(x, y), py(x, y));
          else ctx.moveTo(px(x, y), py(x, y));
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < N; i++) {
        const p = seg(i);
        const sx = px(p.x, p.y);
        const sy = py(p.x, p.y);
        if (i % 5 === 2 && k > 0.6) {
          // A back breaking the surface.
          ctx.fillStyle = '#23384A';
          ctx.beginPath();
          ctx.ellipse(
            sx,
            sy - 3 * Z * k,
            p.rad * 0.7 * Z,
            p.rad * 0.28 * Z * k,
            0,
            Math.PI,
            Math.PI * 2,
          );
          ctx.fill();
        }
        if (i % 2 === 1) {
          const hgt = p.rad * 0.95 * Z * k;
          ctx.fillStyle = '#2E4558';
          ctx.beginPath();
          ctx.moveTo(sx - p.rad * 0.32 * Z, sy);
          ctx.lineTo(sx, sy - hgt);
          ctx.lineTo(sx + p.rad * 0.32 * Z, sy);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#4F6B80';
          ctx.beginPath();
          ctx.moveTo(sx - p.rad * 0.1 * Z, sy - hgt * 0.35);
          ctx.lineTo(sx, sy - hgt);
          ctx.lineTo(sx + p.rad * 0.06 * Z, sy - hgt * 0.4);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (layer === 'mask') {
      // Its own light at night: the spines are what the player has to see to turn away.
      for (let i = 2; i < N; i += 5) {
        const p = seg(i);
        v.light(p.x, p.y, 10, 190, 0.7 * k);
      }
    } else if (layer === 'glow') {
      if (v.dark <= 0.05) return;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = rgba('#7CF5E6', 0.7 * v.dark * k);
      for (let i = 1; i < N; i += 2) {
        const p = seg(i);
        ctx.beginPath();
        ctx.arc(px(p.x, p.y), py(p.x, p.y, 2), (2.4 + Math.sin(T * 2 + i)) * Z, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
