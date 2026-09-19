/**
 * The manta rays, for the owner: a squadron of three to five gliding the
 * middle rings in a loose V, the other way round from the whales. Now and
 * then, when the boat is near enough to see, one of them leaps: it rises off
 * its shadow, hangs, and comes down in a ring of spray with a low whump.
 * The net slides off them. Purely spectacle, logged as a sighting: the kind
 * of thing you point at when someone else is holding the phone.
 */
import { angDiff } from '../core/math';
import { IX, IY } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

export type Manta = {
  x: number;
  y: number;
  /** Heading, world radians. */
  h: number;
  /** Wingspan in world units. */
  span: number;
  /** Wing-beat phase. */
  flap: number;
  /** Seconds into a leap, or -1 when swimming. */
  leap: number;
  /** Seconds since it last came down; the spray lives SPRAY_SECONDS. */
  splash: number;
};

/** How far from the island the leader keeps: the middle rings. */
export const MANTA_BAND: readonly [number, number] = [1200, 1700];
export const MANTA_SPEED = 46;
/** A squadron is this many, fewest and most. */
export const SQUADRON: readonly [number, number] = [3, 5];
/** Seconds between leaps while the boat is near enough to see: floor and spread. */
export const LEAP_EVERY: readonly [number, number] = [14, 16];
export const LEAP_SECONDS = 1.7;
export const LEAP_HEIGHT = 78;
export const SPRAY_SECONDS = 1.1;
/** Leaps are for an audience: the clock only runs with the boat this close to the leader. */
export const AUDIENCE = 750;
/** The boat this close to the leader is a sighting, at most once every SIGHT_EVERY seconds. */
export const SIGHT_RADIUS = 420;
export const SIGHT_EVERY = 90;

/**
 * The heading that circles the island at (ux, uy), the unit vector from it: dir 1 goes
 * anticlockwise and -1 clockwise, leaning outward when too close (e > 0) and inward when too far.
 */
export function orbitHeading(ux: number, uy: number, e: number, dir: 1 | -1): number {
  return Math.atan2(ux * dir + uy * e * 0.9, -uy * dir + ux * e * 0.9);
}

/** Where follower k (1, 2, ...) flies: rows of a V behind the leader, alternating sides. */
export function slot(k: number): { behind: number; beside: number } {
  const row = Math.ceil(k / 2);
  return { behind: 62 * row, beside: (k % 2 ? 1 : -1) * 54 * row };
}

export class Mantas implements Entity {
  readonly mantas: Manta[] = [];
  /** A manta has just come down. The game plays the whump if it is near enough to hear. */
  onWhump: ((m: Manta) => void) | null = null;
  /** The boat has come close to the squadron. The game remembers the sighting and says so the first time. */
  onSight: (() => void) | null = null;
  private leapT: number;
  private sightT = 0;

  constructor(rng: () => number = Math.random) {
    const n = SQUADRON[0] + Math.floor(rng() * (SQUADRON[1] - SQUADRON[0] + 1));
    const a = rng() * 6.28;
    const d = (MANTA_BAND[0] + MANTA_BAND[1]) / 2;
    const x = IX + Math.cos(a) * d;
    const y = IY + Math.sin(a) * d;
    const h = orbitHeading(Math.cos(a), Math.sin(a), 0, -1);
    for (let k = 0; k < n; k++) {
      const s = k === 0 ? { behind: 0, beside: 0 } : slot(k);
      this.mantas.push({
        x: x - Math.cos(h) * s.behind - Math.sin(h) * s.beside,
        y: y - Math.sin(h) * s.behind + Math.cos(h) * s.beside,
        h,
        span: k === 0 ? 78 : 58 + rng() * 10,
        flap: rng() * 6.28,
        leap: -1,
        splash: SPRAY_SECONDS,
      });
    }
    this.leapT = LEAP_EVERY[0] * 0.5 + rng() * LEAP_EVERY[1];
  }

  get leader(): Manta {
    return this.mantas[0] as Manta;
  }

  update(dt: number, w: World): void {
    const lead = this.leader;
    const rx = lead.x - IX;
    const ry = lead.y - IY;
    const d = Math.hypot(rx, ry) || 1;
    const mid = (MANTA_BAND[0] + MANTA_BAND[1]) / 2;
    const half = (MANTA_BAND[1] - MANTA_BAND[0]) / 2;
    const e = Math.max(-1, Math.min(1, (mid - d) / half));
    lead.h +=
      angDiff(orbitHeading(rx / d, ry / d, e, -1), lead.h) * Math.min(1, dt * 0.9) +
      (w.rng() - 0.5) * dt * 0.35;
    lead.x += Math.cos(lead.h) * MANTA_SPEED * dt;
    lead.y += Math.sin(lead.h) * MANTA_SPEED * dt;

    this.mantas.forEach((m, k) => {
      m.flap += dt * (m.leap >= 0 ? 7 : 2.2);
      m.splash += dt;
      if (m.leap >= 0) {
        m.leap += dt;
        if (m.leap >= LEAP_SECONDS) {
          m.leap = -1;
          m.splash = 0;
          this.onWhump?.(m);
        }
      }
      if (k === 0) return;
      const s = slot(k);
      const tx = lead.x - Math.cos(lead.h) * s.behind - Math.sin(lead.h) * s.beside;
      const ty = lead.y - Math.sin(lead.h) * s.behind + Math.cos(lead.h) * s.beside;
      const dx = tx - m.x;
      const dy = ty - m.y;
      const gap = Math.hypot(dx, dy);
      if (gap > 0.5) {
        const st = Math.min(gap, MANTA_SPEED * 1.3 * dt);
        m.x += (dx / gap) * st;
        m.y += (dy / gap) * st;
      }
      m.h += angDiff(lead.h, m.h) * Math.min(1, dt * 1.4);
    });

    const toBoat = Math.hypot(w.boat.x - lead.x, w.boat.y - lead.y);
    if (w.started && toBoat < AUDIENCE) {
      this.leapT -= dt;
      if (this.leapT <= 0 && this.mantas.every((m) => m.leap < 0)) {
        this.leapT = LEAP_EVERY[0] + w.rng() * LEAP_EVERY[1];
        const m = this.mantas[Math.floor(w.rng() * this.mantas.length)];
        if (m) m.leap = 0;
      }
    }

    this.sightT -= dt;
    if (w.started && this.sightT <= 0 && toBoat < SIGHT_RADIUS) {
      this.sightT = SIGHT_EVERY;
      this.onSight?.();
    }
  }

  /** How high a leaping manta is right now, in world units; zero when swimming. */
  static height(m: Manta): number {
    return m.leap < 0 ? 0 : LEAP_HEIGHT * Math.sin((Math.PI * m.leap) / LEAP_SECONDS);
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'underwater' && layer !== 'surface' && layer !== 'air') return;
    const { ctx, px, py } = v;
    const Z = v.zoom;
    for (const m of this.mantas) {
      if (!v.onScreen(m.x, m.y, 200)) continue;
      const z = Mantas.height(m);
      if (layer === 'underwater') {
        // The shadow stays on the water while the ray is in the air, fainter the higher it goes.
        this.kite(v, m, 0, `rgba(12,32,50,${0.5 - 0.25 * (z / LEAP_HEIGHT)})`, null);
      } else if (layer === 'surface') {
        if (m.splash >= SPRAY_SECONDS) continue;
        const t = m.splash / SPRAY_SECONDS;
        const x = px(m.x, m.y);
        const y = py(m.x, m.y);
        ctx.strokeStyle = v.foam;
        ctx.lineWidth = 2.4 * Z * (1 - t);
        ctx.globalAlpha = 0.9 * (1 - t);
        ctx.beginPath();
        ctx.ellipse(x, y, (18 + 60 * t) * Z, (8 + 26 * t) * Z, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + 0.3;
          const r = (14 + 52 * t) * Z;
          const up = Math.sin(Math.PI * Math.min(1, t * 1.4)) * 22 * Z;
          ctx.beginPath();
          ctx.arc(
            x + Math.cos(a) * r,
            y + Math.sin(a) * r * 0.45 - up,
            (2.4 - 1.6 * t) * Z,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (z > 0) {
        this.kite(v, m, z, '#2B3F52', '#E8EEF2');
      }
    }
  }

  /**
   * A manta from above: curved leading edges out to swept wingtips that beat, a scooped
   * trailing edge, the two horn-like fins at the mouth, and a whip of a tail. In the air
   * the pale belly shows as it banks.
   */
  private kite(v: DrawView, m: Manta, z: number, fill: string, belly: string | null): void {
    const { ctx, px, py } = v;
    const c = Math.cos(m.h);
    const s = Math.sin(m.h);
    const beat = Math.sin(m.flap);
    const S = m.span;
    const reach = 0.5 * (0.84 + 0.16 * beat);
    const sweep = -0.08 - 0.05 * beat;
    const P = (along: number, across: number, k = 1): [number, number] => {
      const wx = m.x + (c * along - s * across) * S * k;
      const wy = m.y + (s * along + c * across) * S * k;
      return [px(wx, wy), py(wx, wy, z)];
    };
    const outline = (k: number): void => {
      const nose = P(0.3, 0, k);
      const base = P(-0.3, 0, k);
      const left = [P(0.22, 0.26, k), P(sweep, reach, k), P(-0.1, 0.14, k)] as const;
      const right = [P(0.22, -0.26, k), P(sweep, -reach, k), P(-0.1, -0.14, k)] as const;
      ctx.beginPath();
      ctx.moveTo(nose[0], nose[1]);
      ctx.quadraticCurveTo(left[0][0], left[0][1], left[1][0], left[1][1]);
      ctx.quadraticCurveTo(left[2][0], left[2][1], base[0], base[1]);
      ctx.quadraticCurveTo(right[2][0], right[2][1], right[1][0], right[1][1]);
      ctx.quadraticCurveTo(right[0][0], right[0][1], nose[0], nose[1]);
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = fill;
    outline(1);
    ctx.strokeStyle = fill;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.4 * v.zoom;
    for (const side of [1, -1] as const) {
      const from = P(0.27, 0.06 * side);
      const to = P(0.4, 0.1 * side);
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.stroke();
    }
    const base = P(-0.3, 0);
    const end = P(-0.74, Math.sin(m.flap * 0.7) * 0.08);
    ctx.lineWidth = 1.6 * v.zoom;
    ctx.beginPath();
    ctx.moveTo(base[0], base[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
    if (belly) {
      ctx.fillStyle = belly;
      ctx.globalAlpha = 0.4 + 0.4 * Math.max(0, beat);
      outline(0.58);
      ctx.globalAlpha = 1;
    }
  }
}
