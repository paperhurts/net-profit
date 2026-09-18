/**
 * The leviathan, moved verbatim from the prototype script. Something
 * enormous crawls round the island 2,180 units out on a rounded square: a
 * chain of 28 shadows, the odd back breaking the surface, a line of faint
 * lights at night. When the boat comes within 300 of any part of it, the
 * game hears once every fourteen seconds and does the shaking, the low note,
 * the toast and the remembering.
 */
import { rgba } from '../core/color';
import { IX, IY, type Point } from '../world/island';
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

export type Lev = {
  /** Where along the path the head is, in radians. */
  th: number;
  x: number;
  y: number;
  /** The head first, then the shadows behind it. */
  trail: Point[];
  rumbleT: number;
};

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
  const lev: Lev = { th: rng() * 6.28, x: 0, y: 0, trail: [], rumbleT: 0 };
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

  draw(v: DrawView, layer: Layer): void {
    const lev = this.lev;
    if (!v.onScreen(lev.x, lev.y, 700)) return;
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
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
  }
}
