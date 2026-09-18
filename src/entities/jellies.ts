/**
 * A jellyfish bloom: twenty to forty jellies drifting together on the water,
 * pulsing, glowing at night, the prettiest thing out there and the one thing
 * the sweep has to respect. Tow the net through it and the net fills with
 * jellies, and nothing else will stay in it until they are shaken out at the
 * dock. The entity owns the bloom and the count in the net; the game gates
 * its sweep on that count, tells the player, and shakes them out on docking.
 */
import { rgba } from '../core/color';
import { angDiff, clamp } from '../core/math';
import { IR, IX, IY, pushOut, WS } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

export type Jelly = {
  /** Offset from the bloom's centre. */
  ox: number;
  oy: number;
  /** Pulse phase. */
  ph: number;
  alive: boolean;
  /** Game time at which a scooped jelly is back in the bloom. */
  resp: number;
};

export type Bloom = {
  x: number;
  y: number;
  /** Drift heading; wanders. */
  h: number;
  /** Unused by the bloom itself; pushOut expects a body with speed. */
  v: number;
  r: number;
  jellies: Jelly[];
};

/** How many jellies a bloom has, at least and at most. */
export const BLOOM_SIZE: readonly [number, number] = [20, 40];
export const BLOOM_RADIUS = 200;
/** Units per second the bloom drifts. */
export const DRIFT_SPEED = 14;
/** A moving, whole net this far beyond half its width scoops a jelly. */
export const SCOOP_REACH = 6;
/** A scooped jelly is back in the bloom after this long. */
export const REGROW_SECONDS = 60;
/** The bloom starts about this far from the island. */
export const BLOOM_START = 1000;
/** The bloom keeps this far off the island and the world's rim. */
export const ISLAND_BERTH = IR + 240;
export const RIM = 300;

export function createBloom(rng: () => number = Math.random): Bloom {
  const a = rng() * 6.28;
  const d = BLOOM_START - 200 + rng() * 400;
  const n = BLOOM_SIZE[0] + Math.floor(rng() * (BLOOM_SIZE[1] - BLOOM_SIZE[0] + 1));
  const jellies: Jelly[] = [];
  for (let i = 0; i < n; i++) {
    const t = rng() * 6.28;
    const q = Math.sqrt(rng()) * BLOOM_RADIUS * 0.9;
    jellies.push({
      ox: Math.cos(t) * q,
      oy: Math.sin(t) * q,
      ph: rng() * 6.28,
      alive: true,
      resp: 0,
    });
  }
  return {
    x: clamp(IX + Math.cos(a) * d, RIM, WS - RIM),
    y: clamp(IY + Math.sin(a) * d, RIM, WS - RIM),
    h: rng() * 6.28,
    v: DRIFT_SPEED,
    r: BLOOM_RADIUS,
    jellies,
  };
}

/** Where a jelly is right now: its place in the bloom, bobbing a little. */
export function jellyAt(b: Bloom, j: Jelly): [number, number] {
  return [b.x + j.ox + Math.cos(j.ph * 0.37) * 5, b.y + j.oy + Math.sin(j.ph * 0.41) * 5];
}

export class Jellies implements Entity {
  readonly bloom: Bloom;
  /** Jellies in the net right now. Nothing else stays in the net while this is above zero. */
  inNet = 0;
  /** The net has just scooped its first jelly. The game tells the player. */
  onFoul: (() => void) | null = null;

  constructor(rng: () => number = Math.random) {
    this.bloom = createBloom(rng);
  }

  /** Shake the jellies out at the dock; how many there were. */
  shakeOut(): number {
    const n = this.inNet;
    this.inNet = 0;
    return n;
  }

  /** A clean net and a whole bloom, as when the game starts over. */
  reset(): void {
    this.inNet = 0;
    for (const j of this.bloom.jellies) j.alive = true;
  }

  update(dt: number, w: World): void {
    const b = this.bloom;
    // The heading wanders; the island and the rim turn it back, gently.
    b.h += (w.rng() - 0.5) * dt * 0.8;
    const dIsl = Math.hypot(b.x - IX, b.y - IY);
    let want = b.h;
    if (dIsl < ISLAND_BERTH + 150) want = Math.atan2(b.y - IY, b.x - IX);
    else if (b.x < RIM + 150) want = 0;
    else if (b.x > WS - RIM - 150) want = Math.PI;
    else if (b.y < RIM + 150) want = Math.PI / 2;
    else if (b.y > WS - RIM - 150) want = -Math.PI / 2;
    b.h += angDiff(want, b.h) * Math.min(1, dt * 1.5);
    b.x = clamp(b.x + Math.cos(b.h) * DRIFT_SPEED * dt, RIM, WS - RIM);
    b.y = clamp(b.y + Math.sin(b.h) * DRIFT_SPEED * dt, RIM, WS - RIM);
    pushOut(b, IX, IY, ISLAND_BERTH);
    for (const j of b.jellies) {
      j.ph += dt * 1.6;
      if (!j.alive && w.T >= j.resp) j.alive = true;
    }
    const net = w.net;
    if (!w.started || net.speed <= 22 || net.torn > 0) return;
    const reach = w.netWidth * 0.5 + SCOOP_REACH;
    if (Math.hypot(net.x - b.x, net.y - b.y) > b.r + reach) return;
    for (const j of b.jellies) {
      if (!j.alive) continue;
      const [jx, jy] = jellyAt(b, j);
      if (Math.hypot(jx - net.x, jy - net.y) < reach) {
        j.alive = false;
        j.resp = w.T + REGROW_SECONDS;
        if (this.inNet++ === 0) this.onFoul?.();
      }
    }
  }

  draw(v: DrawView, layer: Layer): void {
    const b = this.bloom;
    const { ctx, px, py } = v;
    const Z = v.zoom;
    if (layer === 'surface') {
      if (!v.onScreen(b.x, b.y, b.r + 40)) return;
      const back = b.h + Math.PI;
      for (const j of b.jellies) {
        if (!j.alive) continue;
        const [x, y] = jellyAt(b, j);
        if (!v.onScreen(x, y, 30)) continue;
        const pulse = Math.sin(j.ph);
        ctx.strokeStyle = 'rgba(222,190,255,.45)';
        ctx.lineWidth = 1 * Z;
        for (let k = 0; k < 3; k++) {
          const a = back + (k - 1) * 0.35 + Math.sin(j.ph + k) * 0.2;
          const len = 10 + 3 * Math.sin(j.ph * 1.3 + k);
          ctx.beginPath();
          ctx.moveTo(px(x, y), py(x, y));
          ctx.lineTo(
            px(x + Math.cos(a) * len, y + Math.sin(a) * len),
            py(x + Math.cos(a) * len, y + Math.sin(a) * len, -2),
          );
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(222,190,255,.55)';
        v.isoEllipse(x, y, 7 + 2 * pulse);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.stroke();
      }
    } else if (layer === 'mask') {
      if (v.onScreen(b.x, b.y, b.r + 80)) v.light(b.x, b.y, 0, b.r + 60, 0.45);
    } else if (layer === 'glow') {
      if (v.dark <= 0.05 || !v.onScreen(b.x, b.y, b.r + 80)) return;
      ctx.globalCompositeOperation = 'screen';
      v.glow(b.x, b.y, 0, b.r + 40, rgba('#C9A7FF', 0.18 * v.dark));
      ctx.fillStyle = rgba('#E2CCFF', 0.6 * v.dark);
      for (const j of b.jellies) {
        if (!j.alive) continue;
        const [x, y] = jellyAt(b, j);
        ctx.beginPath();
        ctx.arc(px(x, y), py(x, y), (2.6 + 1.2 * Math.sin(j.ph)) * Z, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
