/**
 * Spears in flight. A throw goes from the figure's hand to its target in a low
 * arc and always lands: it follows a fish as it swims, so a child's throw at a
 * fish in range is a fish. Where it lands the water splashes. The game says
 * what a hit means through the callback the throw carries. A harpoon is a
 * spear fired from the boat: bigger, and on a line back to the bow.
 */

import type { DrawView, Entity, Layer, World } from './entity';

/** How fast a spear flies, world units a second. */
export const SPEAR_SPEED = 420;

export type Target = { x: number; y: number };

type Flight = {
  x0: number;
  y0: number;
  z0: number;
  to: Target;
  /** Where it ends up, in case the target is gone by then. */
  tz: number;
  t: number;
  dur: number;
  hit: () => void;
  /** A harpoon's line runs back to here, which moves with the boat. */
  rope: Target | null;
};

/** How high on the boat a harpoon's line is tied. */
const ROPE_Z = 14;

export class Spears implements Entity {
  readonly flying: Flight[] = [];
  readonly splashes: { x: number; y: number; z: number; age: number }[] = [];

  /** Throw from (x, y) at height z toward a target, which lands at height tz; hit runs when it lands. A rope makes it a harpoon on a line back to that. */
  launch(
    x: number,
    y: number,
    z: number,
    to: Target,
    tz: number,
    hit: () => void,
    rope: Target | null = null,
  ): void {
    const d = Math.hypot(to.x - x, to.y - y);
    this.flying.push({
      x0: x,
      y0: y,
      z0: z,
      to,
      tz,
      t: 0,
      dur: Math.max(0.12, d / SPEAR_SPEED),
      hit,
      rope,
    });
  }

  update(dt: number, _w: World): void {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i] as Flight;
      f.t += dt;
      if (f.t >= f.dur) {
        this.flying.splice(i, 1);
        this.splashes.push({ x: f.to.x, y: f.to.y, z: f.tz, age: 0 });
        f.hit();
      }
    }
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i] as { age: number };
      s.age += dt;
      if (s.age > 0.5) this.splashes.splice(i, 1);
    }
  }

  /** Where a flight is now: along the line, in a low arc. */
  static at(f: Flight): [number, number, number] {
    const k = Math.min(1, f.t / f.dur);
    const x = f.x0 + (f.to.x - f.x0) * k;
    const y = f.y0 + (f.to.y - f.y0) * k;
    const z = f.z0 + (f.tz - f.z0) * k + Math.sin(Math.PI * k) * 14;
    return [x, y, z];
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'air') return;
    const { ctx, px, py } = v;
    const Z = v.zoom;
    ctx.lineCap = 'round';
    for (const f of this.flying) {
      const [x, y, z] = Spears.at(f);
      const dx = f.to.x - f.x0;
      const dy = f.to.y - f.y0;
      const dl = Math.hypot(dx, dy) || 1;
      const long = f.rope ? 26 : 16;
      const bx = x - (dx / dl) * long;
      const by = y - (dy / dl) * long;
      if (f.rope) {
        ctx.strokeStyle = 'rgba(232,220,190,.8)';
        ctx.lineWidth = 1.2 * Z;
        ctx.beginPath();
        ctx.moveTo(px(f.rope.x, f.rope.y), py(f.rope.x, f.rope.y, ROPE_Z));
        ctx.quadraticCurveTo(
          px((f.rope.x + bx) / 2, (f.rope.y + by) / 2),
          py((f.rope.x + bx) / 2, (f.rope.y + by) / 2, (ROPE_Z + z) / 2 - 6),
          px(bx, by),
          py(bx, by, z + 2),
        );
        ctx.stroke();
      }
      ctx.strokeStyle = f.rope ? '#5E3D1C' : '#8A5A2B';
      ctx.lineWidth = (f.rope ? 3 : 2) * Z;
      ctx.beginPath();
      ctx.moveTo(px(bx, by), py(bx, by, z + 2));
      ctx.lineTo(px(x, y), py(x, y, z));
      ctx.stroke();
      ctx.fillStyle = '#D8DEE2';
      ctx.beginPath();
      ctx.arc(px(x, y), py(x, y, z), (f.rope ? 3.2 : 2.2) * Z, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const s of this.splashes) {
      ctx.strokeStyle = `rgba(243,255,251,${1 - s.age / 0.5})`;
      ctx.lineWidth = 2 * Z;
      v.isoEllipse(s.x, s.y, 6 + s.age * 30, s.z);
      ctx.stroke();
    }
  }
}
