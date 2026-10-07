/**
 * Island 2's shallows: parrotfish nosing along its shore, close enough to the
 * sand to spear. They swim slowly round the island, each at its own distance
 * out and its own pace, and come back a while after they are taken. The net
 * leaves them alone; they are the spear's.
 */

import { PARROT, SPECIES } from '../data/tuning';
import { ISLE2 } from '../world/isle2';
import type { DrawView, Entity, Layer, World } from './entity';

/** How many there are, how near the sand and how far out they swim, and how long before a taken one is back. */
export const SHORE_FISH = 10;
export const SHORE_IN = 20;
export const SHORE_OUT = 70;
export const COME_BACK = 25;

export type ShoreFish = {
  /** Angle round the island, radians, and how fast it changes. */
  a: number;
  da: number;
  /** Distance out from the shore. */
  out: number;
  ph: number;
  alive: boolean;
  /** Game time at which a taken fish is back. */
  back: number;
  x: number;
  y: number;
  h: number;
};

export class Shallows implements Entity {
  readonly fish: ShoreFish[] = [];
  private T = 0;

  constructor(rng: () => number) {
    for (let i = 0; i < SHORE_FISH; i++) {
      const f: ShoreFish = {
        a: (i / SHORE_FISH) * Math.PI * 2 + rng() * 0.4,
        da: (rng() < 0.5 ? -1 : 1) * (0.03 + rng() * 0.04),
        out: SHORE_IN + rng() * (SHORE_OUT - SHORE_IN),
        ph: rng() * 9,
        alive: true,
        back: 0,
        x: 0,
        y: 0,
        h: 0,
      };
      this.place(f, 0);
      this.fish.push(f);
    }
  }

  private place(f: ShoreFish, T: number): void {
    const r = ISLE2.r + f.out + Math.sin(T * 0.7 + f.ph) * 6;
    f.x = ISLE2.x + Math.cos(f.a) * r;
    f.y = ISLE2.y + Math.sin(f.a) * r;
    f.h = f.a + (f.da > 0 ? Math.PI / 2 : -Math.PI / 2);
  }

  update(dt: number, w: World): void {
    this.T = w.T;
    for (const f of this.fish) {
      if (!f.alive) {
        if (w.T >= f.back) f.alive = true;
        else continue;
      }
      f.a += f.da * dt;
      this.place(f, w.T);
    }
  }

  /** The nearest fish still in the water within reach of a point, if any. */
  nearest(x: number, y: number, reach: number): ShoreFish | null {
    let best: ShoreFish | null = null;
    let bd = reach;
    for (const f of this.fish) {
      if (!f.alive) continue;
      const d = Math.hypot(f.x - x, f.y - y);
      if (d <= bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  /** A fish speared: out of the water until it comes back. */
  take(f: ShoreFish): void {
    f.alive = false;
    f.back = this.T + COME_BACK;
  }

  /** Every fish back, as when the game starts over. */
  reset(): void {
    for (const f of this.fish) f.alive = true;
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'surface' || !v.onScreen(ISLE2.x, ISLE2.y, (ISLE2.r + SHORE_OUT + 60) * v.zoom))
      return;
    const S = SPECIES[PARROT];
    if (!S) return;
    const { ctx, px, py, T } = v;
    for (const f of this.fish) {
      if (!f.alive) continue;
      const sx = px(f.x, f.y);
      const sy = py(f.x, f.y);
      // A shadow in the clear water, then the fish.
      ctx.fillStyle = 'rgba(10,50,60,.18)';
      ctx.beginPath();
      ctx.ellipse(
        sx + 2 * v.zoom,
        sy + 3 * v.zoom,
        S.s * v.zoom,
        S.s * 0.4 * v.zoom,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      const ang = Math.atan2((Math.cos(f.h) + Math.sin(f.h)) / 2, Math.cos(f.h) - Math.sin(f.h));
      ctx.fillStyle = S.c;
      v.fishShape(sx, sy, S.s * v.zoom, S, ang, Math.sin(T * 6 + f.ph) * 0.3);
    }
  }
}
