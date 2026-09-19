/**
 * Things that float and are worth picking up, moved verbatim from the
 * prototype script: ten crates that pay coins and twenty-two pieces of
 * driftwood that pay wood. Each kind is placed the same way (biased toward
 * a ring inside the boat's range, otherwise anywhere past the shallows),
 * picked up by the net or the hull, and comes back somewhere new after a
 * while. The kind decides the reward and the look. The game keeps the
 * consequences as a callback: the coins or wood, the floating text, the
 * cue, the HUD and the save.
 */
import { clamp } from '../core/math';
import { IX, IY, nearBeach, type Point, WS } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

export type Piece = {
  x: number;
  y: number;
  alive: boolean;
  /** Game time at which a picked piece comes back. */
  resp: number;
  /** Bob phase. */
  ph: number;
  /** Resting rotation; driftwood uses it. */
  rot: number;
};

export type FlotsamKind = {
  count: number;
  /** Chance a placement lands on the ring inside the range rather than anywhere. */
  near: number;
  /** Added to half the net width for the pickup radius. */
  reach: number;
  /** Seconds before a piece comes back: a floor plus a random spread. */
  respawn: readonly [number, number];
  reward(rng: () => number, tier: number): number;
  draw(v: DrawView, f: Piece): void;
};

/** What placing a piece needs to know. */
export type FlotsamWorld = Pick<World, 'rng' | 'range'>;

/** Salvage in a crate, before the tier multiplier. */
export const SALVAGE = [5, 8, 10, 15, 20, 35] as const;

/**
 * Put a piece somewhere fresh. With the given chance it goes on a ring 560
 * to the range's edge (at most 2,300) from the island; otherwise anywhere in
 * the world past the shallows. Either way it stays 160 off the rim.
 */
export function placeFlotsam(f: Piece, near: number, w: FlotsamWorld): void {
  // The prototype's placement, tried again on the rare roll that lands on the beach or the bridge.
  for (let tries = 0; tries < 8; tries++) {
    placeOnce(f, near, w);
    if (!nearBeach(f.x, f.y, 50)) return;
  }
}

function placeOnce(f: Piece, near: number, w: FlotsamWorld): void {
  if (w.rng() < near) {
    const a = w.rng() * 6.28;
    const R = Math.min(w.range - 60, 2300);
    const r = 560 + w.rng() * Math.max(120, R - 560);
    f.x = clamp(IX + Math.cos(a) * r, 160, WS - 160);
    f.y = clamp(IY + Math.sin(a) * r, 160, WS - 160);
    return;
  }
  do {
    f.x = 160 + w.rng() * (WS - 320);
    f.y = 160 + w.rng() * (WS - 320);
  } while (Math.hypot(f.x - IX, f.y - IY) < 560);
}

export const CRATES: FlotsamKind = {
  count: 10,
  near: 0.5,
  reach: 10,
  respawn: [25, 25],
  reward: (rng, tier) => (SALVAGE[Math.floor(rng() * 6)] as number) * (1 + Math.floor(tier / 2)),
  draw(v, f) {
    const { ctx, T } = v;
    const Z = v.zoom;
    const b = Math.sin(T * 1.8 + f.ph) * 1.5;
    v.isoEllipse(f.x + 7, f.y + 7, 13);
    ctx.strokeStyle = v.foam;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5 * Z;
    ctx.stroke();
    ctx.globalAlpha = 1;
    v.box(f.x, f.y, 14, 14, -3 + b, 9 + b, '#B97F45', '#E6B877');
    ctx.fillStyle = v.coin;
    v.isoEllipse(f.x + 7, f.y + 7, 3, 9.5 + b);
    ctx.fill();
  },
};

export const DRIFTWOOD: FlotsamKind = {
  count: 22,
  near: 0.65,
  reach: 12,
  respawn: [18, 22],
  reward: (rng, tier) => 1 + Math.floor(rng() * 3) + tier,
  draw(v, f) {
    const { ctx, T } = v;
    const Z = v.zoom;
    const b = Math.sin(T * 1.6 + f.ph) * 1.2;
    const r = f.rot + Math.sin(T * 0.4 + f.ph) * 0.3;
    const c = Math.cos(r);
    const sn = Math.sin(r);
    const P = (lx: number, ly: number): Point => [f.x + lx * c - ly * sn, f.y + lx * sn + ly * c];
    v.isoEllipse(f.x, f.y, 17);
    ctx.strokeStyle = v.foam;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.5 * Z;
    ctx.stroke();
    ctx.globalAlpha = 1;
    v.extrude([P(-16, -4), P(16, -4), P(16, 4), P(-16, 4)], -2 + b, 5 + b, '#7A5230', '#A9773F');
    const e = P(9, 0);
    ctx.fillStyle = '#C79A5E';
    v.isoEllipse(e[0], e[1], 2.5, 5.4 + b);
    ctx.fill();
  },
};

export class Flotsam implements Entity {
  readonly pieces: Piece[] = [];
  /** A piece was just picked up, worth this much of the kind's currency. The game pays out. */
  onPick: ((f: Piece, amount: number) => void) | null = null;

  constructor(
    readonly kind: FlotsamKind,
    w: FlotsamWorld,
  ) {
    for (let i = 0; i < kind.count; i++) {
      const f: Piece = { x: 0, y: 0, alive: true, resp: 0, ph: w.rng() * 9, rot: w.rng() * 6.28 };
      placeFlotsam(f, kind.near, w);
      this.pieces.push(f);
    }
  }

  update(_dt: number, w: World): void {
    const kind = this.kind;
    const nr = w.netWidth * 0.5 + kind.reach;
    const br = 30 * w.hullScale;
    for (const f of this.pieces) {
      if (!f.alive) {
        if (w.T >= f.resp) {
          placeFlotsam(f, kind.near, w);
          f.alive = true;
        }
        continue;
      }
      if (!w.started) continue;
      if (
        Math.hypot(f.x - w.net.x, f.y - w.net.y) < nr ||
        Math.hypot(f.x - w.boat.x, f.y - w.boat.y) < br
      ) {
        const r = kind.reward(w.rng, w.tier);
        f.alive = false;
        f.resp = w.T + kind.respawn[0] + w.rng() * kind.respawn[1];
        this.onPick?.(f, r);
      }
    }
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer === 'afloat') {
      for (const f of this.pieces) {
        if (!f.alive || !v.onScreen(f.x, f.y, 40)) continue;
        this.kind.draw(v, f);
      }
    } else if (layer === 'mask') {
      for (const f of this.pieces) {
        if (f.alive && v.onScreen(f.x, f.y, 60)) v.light(f.x, f.y, 0, 60, 0.6);
      }
    }
  }
}
