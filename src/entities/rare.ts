/**
 * The rare fish, moved verbatim from the prototype script. Dawn and dusk
 * each put one on the water, out past the shallows but inside the boat's
 * range, sparkling and wandering, for eighty seconds. A moving net lands it
 * if the hold has room. The game owns the consequences through callbacks:
 * the toast when it slips away, the nudge when the hold is full, and the
 * catch itself with its fireworks and the save.
 */
import { clamp } from '../core/math';
import { SPECIES } from '../data/tuning';
import { IX, IY, type Point, WS } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

export type RareFish = {
  on: boolean;
  /** Index into SPECIES. */
  sp: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  /** Seconds left before it slips away. */
  t: number;
  /** Screen-space heading for the renderer. */
  ang: number;
};

/** How long a rare fish stays on the water. */
export const RARE_SECONDS = 80;
export const RARE_SPEED = 58;
/** Each new wander target is within this distance of the fish. */
export const WANDER = 280;
/** The hold-full nudge repeats no more often than this while the net is on the fish. */
export const FULL_EVERY = 5;

/** What picking a point needs to know. */
export type RareWorld = Pick<World, 'rng' | 'boat' | 'range'>;

/**
 * A point for the rare fish. With a spread, within that distance of (cx, cy);
 * without, anywhere past the shallows and away from the boat. Either way it
 * stays 480 to the range's edge from the island and off the world's rim, and
 * gives up on the clamped centre after twenty tries.
 */
export function rarePoint(cx: number, cy: number, spread: number, w: RareWorld): Point {
  const R = Math.min(w.range - 140, 2250);
  for (let i = 0; i < 20; i++) {
    const a = w.rng() * 6.28;
    const r = spread ? w.rng() * spread : 520 + w.rng() * Math.max(100, R - 520);
    const x = (spread ? cx : IX) + Math.cos(a) * r;
    const y = (spread ? cy : IY) + Math.sin(a) * r;
    const d = Math.hypot(x - IX, y - IY);
    if (
      d > 480 &&
      d < R &&
      x > 150 &&
      x < WS - 150 &&
      y > 150 &&
      y < WS - 150 &&
      (spread || Math.hypot(x - w.boat.x, y - w.boat.y) > 420)
    )
      return [x, y];
  }
  return [clamp(cx, 150, WS - 150), clamp(cy, 150, WS - 150)];
}

export class Rare implements Entity {
  readonly rare: RareFish = { on: false, sp: 10, x: 0, y: 0, tx: 0, ty: 0, t: 0, ang: 0 };
  /** Seconds until the hold-full nudge may repeat. */
  fullT = 0;
  /** The fish's time ran out. The game says so. */
  onSlip: ((sp: number) => void) | null = null;
  /** The net is on the fish but the hold is full. The game nudges the player to sell. */
  onFull: ((sp: number) => void) | null = null;
  /** The net landed it. The game puts it in the hold, celebrates and saves. */
  onCatch: ((sp: number) => void) | null = null;

  /** Put a fresh fish of this species on the water for RARE_SECONDS. */
  spawn(sp: number, w: RareWorld): void {
    const r = this.rare;
    const pt = rarePoint(IX + 700, IY, 0, w);
    r.on = true;
    r.sp = sp;
    r.x = pt[0];
    r.y = pt[1];
    r.tx = pt[0];
    r.ty = pt[1];
    r.t = RARE_SECONDS;
  }

  /** Take it off the water, as when the game starts over. */
  reset(): void {
    this.rare.on = false;
  }

  update(dt: number, w: World): void {
    const r = this.rare;
    this.fullT -= dt;
    if (!r.on) return;
    r.t -= dt;
    if (r.t <= 0) {
      r.on = false;
      this.onSlip?.(r.sp);
      return;
    }
    if (Math.hypot(r.tx - r.x, r.ty - r.y) < 30) {
      const pt = rarePoint(r.x, r.y, WANDER, w);
      r.tx = pt[0];
      r.ty = pt[1];
    }
    const dx = r.tx - r.x;
    const dy = r.ty - r.y;
    const d = Math.hypot(dx, dy) || 1;
    r.x += (dx / d) * RARE_SPEED * dt;
    r.y += (dy / d) * RARE_SPEED * dt;
    r.ang = Math.atan2((dx + dy) * 0.5, dx - dy);
    const net = w.net;
    if (
      w.started &&
      net.speed > 22 &&
      net.torn <= 0 &&
      Math.hypot(r.x - net.x, r.y - net.y) < w.netWidth * 0.5 + 12
    ) {
      if (w.holdTotal >= w.holdCap) {
        if (this.fullT <= 0) {
          this.fullT = FULL_EVERY;
          this.onFull?.(r.sp);
        }
        return;
      }
      r.on = false;
      this.onCatch?.(r.sp);
    }
  }

  draw(v: DrawView, layer: Layer): void {
    const r = this.rare;
    if (!r.on) return;
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    const S = SPECIES[r.sp];
    if (!S) return;
    if (layer === 'surface') {
      if (!v.onScreen(r.x, r.y, 60)) return;
      ctx.fillStyle = S.c;
      ctx.globalAlpha = 0.95;
      v.fishShape(px(r.x, r.y), py(r.x, r.y), S.s * Z, S, r.ang, Math.sin(T * 7) * 0.35);
      ctx.globalAlpha = 1;
    } else if (layer === 'mask') {
      v.light(r.x, r.y, 0, 130, 0.85);
    } else if (layer === 'glow') {
      if (!v.onScreen(r.x, r.y, 80)) return;
      const c = S.c;
      for (let i = 0; i < 7; i++) {
        const a = T * 1.4 + i * 0.9;
        const rad = 16 + 10 * Math.sin(T * 2 + i * 2);
        const tw = 0.5 + 0.5 * Math.sin(T * 6 + i * 1.7);
        ctx.globalAlpha = tw;
        ctx.fillStyle = i % 2 ? '#FFFFFF' : c;
        v.star(
          px(r.x + Math.cos(a) * rad, r.y + Math.sin(a) * rad),
          py(r.x + Math.cos(a) * rad, r.y + Math.sin(a) * rad, 4 + 6 * tw),
          (3 + 3 * tw) * Z,
        );
      }
      ctx.globalAlpha = 1;
    } else if (layer === 'overlay') {
      v.indicator(r.x, r.y, '#FFF3C4', S.c, true);
    }
  }
}
