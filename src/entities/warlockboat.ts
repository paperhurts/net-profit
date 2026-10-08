/**
 * The warlock's own boat, the kid's: once he is free he sails it beside yours,
 * keeping station off your port quarter, slowing as you slow and holding off
 * when you tie up. He helps with the fishing: every so often, when a school is
 * within reach of his boat, he points his staff, a green flash goes out, and a
 * grown fish leaps from the water into your hold. When the figure goes ashore
 * he goes too and the boat waits where it is; worn out in a fight, he comes
 * back to rest on it. The game finds the fish and does the catching.
 */

import { angDiff, clamp } from '../core/math';
import { drawWarlock } from '../render/warlock';
import type { DrawView, Entity, Layer, World } from './entity';
import { type ShipLook, steerShip } from './ship';

/** Deep-water green with a gold trim, a dark cabin and a purple sail. */
export const WB_LOOK: ShipLook = {
  scale: 0.85,
  hull: '#2E6E64',
  trim: '#E3B341',
  deck: '#C9A06A',
  cabin: '#3B3550',
  roof: '#2A2440',
  mast: '#5E3D1C',
  flag: '#7FE08A',
  sail: '#4B2E83',
  heap: 0,
};
/** Where he keeps station: this far behind your boat and this far off to one side, scaled by your hull. */
export const BACK = 70;
export const SIDE = 62;
/** He turns this fast and never sails faster than this. */
export const TURN = 2.2;
export const TOP_SPEED = 420;
/** Further than this from his station (you were swallowed and spat out at home), he catches up at once. */
export const CATCH_UP = 1200;
/** His fishing: how often, and how far from his boat a fish may be. */
export const FISH_EVERY = 2.4;
export const FISH_REACH = 140;

/** A fish he can take, as the game finds it. */
export type Catch = { x: number; y: number };

export class WarlockBoat implements Entity {
  /** The warlock is free, so his boat is on the water. */
  free = false;
  /** He is aboard it rather than ashore with the figure; the game knows. */
  crewed = true;
  x = 0;
  y = 0;
  h = 0;
  v = 0;
  private placed = false;
  private cd = FISH_EVERY;
  /** Fish he has caught for you since the game was opened. */
  catches = 0;
  /** The green flash from his staff to a fish, and how long it has left. */
  zap: { x: number; y: number; t: number } | null = null;
  /** The nearest grown fish within reach of a point, if the hold has room. */
  findFish: ((x: number, y: number, reach: number) => Catch | null) | null = null;
  /** He takes that fish for you. */
  onFish: ((c: Catch) => void) | null = null;
  /** His boat has come alongside, the first time. */
  onArrive: (() => void) | null = null;

  /** His station off your boat, for this hull scale. */
  station(b: { x: number; y: number; h: number }, k: number): { x: number; y: number } {
    const c = Math.cos(b.h);
    const s = Math.sin(b.h);
    return { x: b.x - c * BACK * k - s * SIDE * k, y: b.y - s * BACK * k + c * SIDE * k };
  }

  update(dt: number, w: World): void {
    if (this.zap) {
      this.zap.t -= dt;
      if (this.zap.t <= 0) this.zap = null;
    }
    if (!this.free) {
      this.placed = false;
      return;
    }
    const b = w.boat;
    const k = w.hullScale;
    const st = this.station(b, k);
    const d = Math.hypot(st.x - this.x, st.y - this.y);
    // He first comes alongside once the figure is back aboard.
    if (!this.placed && w.figure) return;
    if (!this.placed || d > CATCH_UP) {
      this.x = st.x;
      this.y = st.y;
      this.h = b.h;
      this.v = 0;
      if (!this.placed) this.onArrive?.();
      this.placed = true;
      return;
    }
    // Tied up or ashore, he drifts in and holds off; under way, he keeps station.
    const hold = w.docked || !!w.figure;
    if (d < 8 || (hold && d < 50)) {
      this.v *= Math.max(0, 1 - dt * 2);
      this.h += clamp(angDiff(b.h, this.h), -dt, dt);
      this.x += Math.cos(this.h) * this.v * dt;
      this.y += Math.sin(this.h) * this.v * dt;
    } else {
      const top = hold ? 60 : Math.min(TOP_SPEED, Math.max(Math.abs(b.v) * 1.1, d * 1.6));
      steerShip(this, st.x, st.y, top, TURN, dt);
    }
    // Fishing, from his boat, while he is on it and you are both at sea.
    if (!this.crewed || w.figure) return;
    this.cd -= dt;
    if (this.cd > 0) return;
    this.cd = FISH_EVERY;
    const c = this.findFish?.(this.x, this.y, FISH_REACH) ?? null;
    if (!c) {
      this.cd = 0.5;
      return;
    }
    this.zap = { x: c.x, y: c.y, t: 0.35 };
    this.catches++;
    this.onFish?.(c);
  }

  /** Among the solids, like any ship. */
  depth(): number {
    return this.x + this.y;
  }

  draw(v: DrawView, layer: Layer): void {
    if (!this.free || !this.placed || !v.onScreen(this.x, this.y, 120)) return;
    if (layer === 'solids') {
      v.ship(this, WB_LOOK);
      if (this.crewed) {
        // At the stern, facing ahead.
        const s = WB_LOOK.scale;
        drawWarlock(
          v,
          this.x - Math.cos(this.h) * 14 * s,
          this.y - Math.sin(this.h) * 14 * s,
          10 * s,
          {
            h: this.h,
            ph: 0,
            gait: 0,
            cast: this.zap ? 0.35 - this.zap.t : 9,
            hurt: false,
          },
        );
      }
    } else if (layer === 'air' && this.zap) {
      const { ctx, px, py } = v;
      const a = this.zap.t / 0.35;
      ctx.strokeStyle = `rgba(140,255,160,${0.8 * a})`;
      ctx.lineWidth = 2.5 * v.zoom;
      ctx.beginPath();
      ctx.moveTo(px(this.x, this.y), py(this.x, this.y, 40));
      ctx.quadraticCurveTo(
        px((this.x + this.zap.x) / 2, (this.y + this.zap.y) / 2),
        py((this.x + this.zap.x) / 2, (this.y + this.zap.y) / 2, 50),
        px(this.zap.x, this.zap.y),
        py(this.zap.x, this.zap.y, 2),
      );
      ctx.stroke();
    } else if (layer === 'mask') v.light(this.x, this.y, 14, 140, 0.7);
  }
}
