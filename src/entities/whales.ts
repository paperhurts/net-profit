/**
 * The whales, for the kid: a mother and her calf cruising the far water,
 * round and round the island between 1,750 and 2,250 out. They travel as
 * shadows and come up to breathe, each on its own clock, with a spout and
 * a slate back above the foam. Nothing catches them and nothing harms them;
 * the net slides over. Sail close and the game hears of the sighting; the
 * song itself is the ambience's, which reads where they are.
 */
import { angDiff } from '../core/math';
import { IX, IY } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

export type Whale = {
  x: number;
  y: number;
  /** Heading, world radians. */
  h: number;
  /** Body length in world units. */
  len: number;
  /** Seconds until it next comes up. */
  dive: number;
  /** Seconds left at the surface; zero while under. */
  up: number;
  /** Seconds since the current spout began; past SPOUT_SECONDS it is over. */
  spout: number;
};

/** How far from the island the mother keeps, near edge and far. */
export const WHALE_BAND: readonly [number, number] = [1750, 2250];
export const WHALE_SPEED = 24;
/** A dive lasts this long, floor and spread; the calf's are shorter by CALF_BREATH. */
export const DIVE_SECONDS: readonly [number, number] = [11, 7];
export const CALF_BREATH = 0.6;
export const SURFACE_SECONDS = 4.5;
export const SPOUT_SECONDS = 1.6;
/** The boat this close to the mother counts as a sighting, at most once every SIGHT_EVERY seconds. */
export const SIGHT_RADIUS = 450;
export const SIGHT_EVERY = 90;
/** Where the calf swims: this far behind its mother and this far to her side. */
export const CALF_BEHIND = 46;
export const CALF_BESIDE = 34;

function makeWhale(x: number, y: number, h: number, len: number, dive: number): Whale {
  return { x, y, h, len, dive, up: 0, spout: SPOUT_SECONDS };
}

export class Whales implements Entity {
  readonly mother: Whale;
  readonly calf: Whale;
  /** The boat has come close to the mother. The game remembers the sighting and says so the first time. */
  onSight: (() => void) | null = null;
  private sightT = 0;

  constructor(rng: () => number = Math.random) {
    const a = rng() * 6.28;
    const d = (WHALE_BAND[0] + WHALE_BAND[1]) / 2;
    const x = IX + Math.cos(a) * d;
    const y = IY + Math.sin(a) * d;
    const h = a + Math.PI / 2;
    this.mother = makeWhale(x, y, h, 58, 4 + rng() * 6);
    this.calf = makeWhale(
      x - Math.cos(h) * CALF_BEHIND - Math.sin(h) * CALF_BESIDE,
      y - Math.sin(h) * CALF_BEHIND + Math.cos(h) * CALF_BESIDE,
      h,
      30,
      2 + rng() * 5,
    );
  }

  /** Mother first, then calf. */
  get all(): readonly [Whale, Whale] {
    return [this.mother, this.calf];
  }

  update(dt: number, w: World): void {
    const m = this.mother;
    // Round the island, easing back into the band when she strays, with a little wander.
    const rx = m.x - IX;
    const ry = m.y - IY;
    const d = Math.hypot(rx, ry) || 1;
    const mid = (WHALE_BAND[0] + WHALE_BAND[1]) / 2;
    const half = (WHALE_BAND[1] - WHALE_BAND[0]) / 2;
    const e = Math.max(-1, Math.min(1, (mid - d) / half));
    m.h +=
      angDiff(wantHeading(rx / d, ry / d, e), m.h) * Math.min(1, dt * 0.8) +
      (w.rng() - 0.5) * dt * 0.3;
    m.x += Math.cos(m.h) * WHALE_SPEED * dt;
    m.y += Math.sin(m.h) * WHALE_SPEED * dt;

    // The calf keeps station behind and beside her, a little quicker when it falls back.
    const c = this.calf;
    const tx = m.x - Math.cos(m.h) * CALF_BEHIND - Math.sin(m.h) * CALF_BESIDE;
    const ty = m.y - Math.sin(m.h) * CALF_BEHIND + Math.cos(m.h) * CALF_BESIDE;
    const dx = tx - c.x;
    const dy = ty - c.y;
    const cd = Math.hypot(dx, dy);
    if (cd > 0.5) {
      const st = Math.min(cd, WHALE_SPEED * 1.35 * dt);
      c.x += (dx / cd) * st;
      c.y += (dy / cd) * st;
    }
    c.h += angDiff(m.h, c.h) * Math.min(1, dt * 1.5);

    this.breathe(m, dt, w.rng, 1);
    this.breathe(c, dt, w.rng, CALF_BREATH);

    this.sightT -= dt;
    if (
      w.started &&
      this.sightT <= 0 &&
      Math.hypot(w.boat.x - m.x, w.boat.y - m.y) < SIGHT_RADIUS
    ) {
      this.sightT = SIGHT_EVERY;
      this.onSight?.();
    }
  }

  private breathe(wh: Whale, dt: number, rng: () => number, scale: number): void {
    wh.spout += dt;
    if (wh.up > 0) {
      wh.up -= dt;
      if (wh.up <= 0) {
        wh.up = 0;
        wh.dive = (DIVE_SECONDS[0] + rng() * DIVE_SECONDS[1]) * scale;
      }
      return;
    }
    wh.dive -= dt;
    if (wh.dive <= 0) {
      wh.up = SURFACE_SECONDS;
      wh.spout = 0;
    }
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'underwater' && layer !== 'surface') return;
    const { ctx, px, py } = v;
    const Z = v.zoom;
    for (const wh of this.all) {
      if (!v.onScreen(wh.x, wh.y, 140)) continue;
      const c = Math.cos(wh.h);
      const s = Math.sin(wh.h);
      const ang = Math.atan2((c + s) * 0.5, c - s);
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const x = px(wh.x, wh.y);
      const y = py(wh.x, wh.y);
      const len = wh.len * Z;
      if (layer === 'underwater') {
        ctx.fillStyle = 'rgba(10,30,48,.42)';
        ctx.beginPath();
        ctx.ellipse(x, y, len, len * 0.27, ang, 0, Math.PI * 2);
        ctx.fill();
        const tx = x - ca * len * 0.92;
        const ty = y - sa * len * 0.92;
        const sway = ang + Math.sin(v.T * 1.2 + wh.len) * 0.22;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(
          tx - Math.cos(sway - 0.75) * len * 0.42,
          ty - Math.sin(sway - 0.75) * len * 0.42,
        );
        ctx.lineTo(
          tx - Math.cos(sway + 0.75) * len * 0.42,
          ty - Math.sin(sway + 0.75) * len * 0.42,
        );
        ctx.closePath();
        ctx.fill();
        continue;
      }
      if (wh.up <= 0) continue;
      // Up for air: how far out of the water, eased in and out over the surfacing.
      const k = Math.sin(Math.PI * Math.min(1, 1 - wh.up / SURFACE_SECONDS));
      ctx.strokeStyle = v.foam;
      ctx.globalAlpha = 0.6 * k;
      ctx.lineWidth = 1.6 * Z;
      ctx.beginPath();
      ctx.ellipse(x, y, len * 0.78, len * 0.28, ang, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#4E6A7D';
      ctx.beginPath();
      ctx.ellipse(
        x,
        y - 3 * Z * k,
        len * 0.62 * (0.6 + 0.4 * k),
        len * 0.19 * k + 0.1,
        ang,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = '#6F8A9C';
      ctx.beginPath();
      ctx.ellipse(
        x + ca * len * 0.08,
        y - 5 * Z * k,
        len * 0.36 * k + 0.1,
        len * 0.075 * k + 0.1,
        ang,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      if (wh.spout < SPOUT_SECONDS) {
        // The blow: a fan of spray that rises fast and hangs as mist before it goes.
        const t = wh.spout / SPOUT_SECONDS;
        const bx = x + ca * len * 0.3;
        const by = y + sa * len * 0.3 - 4 * Z;
        const rise = wh.len * 0.9 * Z * Math.sin(Math.PI * 0.5 * Math.min(1, t * 1.6));
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.6 * Z;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.9 * (1 - t);
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + i * rise * 0.17, by - rise * (1 - Math.abs(i) * 0.13));
          ctx.stroke();
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.55 * (1 - t);
        for (let i = -1; i <= 1; i++) {
          const mx = bx + i * rise * 0.22;
          const my = by - rise * (1.02 - Math.abs(i) * 0.1);
          ctx.beginPath();
          ctx.arc(mx, my, (3 + 5 * t) * Z, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  }
}

/**
 * The heading that circles the island: the tangent at (ux, uy), the unit vector from the
 * island, leaning outward when she is too close (e > 0) and inward when too far.
 */
export function wantHeading(ux: number, uy: number, e: number): number {
  return Math.atan2(ux + uy * e * 0.9, -uy + ux * e * 0.9);
}
