/**
 * The gulper, the kid's leviathan that eats boats: a giant gulper eel, a long
 * black body with a mouth like a pelican's pouch and a pink light at the tip of
 * its tail, as the real ones have in the dark of the sea. It prowls the east
 * side of the deep, where the mahi-mahi are, deep down and slow. A flagship that
 * comes within NOTICE in its water sets it hunting: it surfaces behind the
 * boat, mouth open, and chases. It is slower than a flagship flat out and turns
 * slower, so the counter is to run, and to turn hard when it closes; heading
 * home across the buoys ends the hunt. A bite costs the boat a third of its
 * health and the gulper lunges on past; three bites and the game has it eaten
 * (the game does the eating, the spitting out in the home shallows and the
 * lost hold). After a hunt it sinks and rests a while. A harpoon in its head
 * makes it flinch and slow; four in one hunt and it is driven off, down into
 * the dark for a good while.
 */

import { rgba } from '../core/color';
import { angDiff, clamp } from '../core/math';
import { AWAY, RESOLVE } from '../data/harpoon';
import { DEEP, pastBuoys, WS } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

/** Its stretch of the deep: the east side, short of both corners. */
export const ZONE = { x0: WS + 180, x1: WS + DEEP - 180, y0: 500, y1: WS - 500 } as const;
/** A boat this near, past the buoys and in or by its water, sets it hunting. */
export const NOTICE = 900;
/** How far outside its water it will follow before it gives up. */
export const LEASH = 600;
/** Hunting speed, and how fast it turns: a flagship at full speed outruns it and outturns it. */
export const HUNT_SPEED = 290;
export const TURN = 1.5;
/** Prowling speed, deep and slow. */
export const PROWL_SPEED = 70;
/** Its jaws reach this far from its head, plus the hull. */
export const JAW = 44;
/** A bite: a third of the boat's health. */
export const BITE = 34;
/** After a bite it lunges straight on this long before it turns again. */
export const LUNGE = 0.9;
/** The longest hunt, and the rest after one before it hunts again. */
export const HUNT_MAX = 14;
export const REST = 20;
/** Its body: links in the chain, and the gap between them. */
export const LINKS = 20;
export const LINK = 20;

export type GulperState = 'prowl' | 'hunt' | 'rest';

/** Whether a point is in its water, or within pad of it. */
export function inZone(x: number, y: number, pad = 0): boolean {
  return x > ZONE.x0 - pad && x < ZONE.x1 + pad && y > ZONE.y0 - pad && y < ZONE.y1 + pad;
}

export class Gulper implements Entity {
  state: GulperState = 'prowl';
  x = (ZONE.x0 + ZONE.x1) / 2;
  y = (ZONE.y0 + ZONE.y1) / 2;
  h = Math.PI / 2;
  v = PROWL_SPEED;
  tx = this.x;
  ty = this.y;
  /** Seconds in this state, of lunge left after a bite, and of rest left. */
  t = 0;
  lunge = 0;
  cool = 0;
  /** How far up it has come, 0 deep to 1 at the surface; how wide its mouth is. */
  up = 0;
  gape = 0;
  /** Harpoon hits left this hunt before it is driven off. */
  resolve = RESOLVE.gulper;
  /** The body, head first. */
  readonly body: { x: number; y: number }[] = [];
  /** It has started hunting the boat. */
  onHunt: (() => void) | null = null;
  /** It has bitten the boat. The game takes the health, and eats the boat at none. */
  onBite: (() => void) | null = null;
  /** It has given up and gone down. */
  onGiveUp: (() => void) | null = null;

  constructor() {
    for (let i = 0; i < LINKS; i++) this.body.push({ x: this.x, y: this.y - i * LINK });
  }

  /** Back to its water and prowling, as when the game starts over or the boat is eaten. */
  reset(): void {
    this.state = 'rest';
    this.cool = REST;
    this.t = 0;
    this.lunge = 0;
  }

  update(dt: number, w: World): void {
    const b = w.boat;
    this.t += dt;
    const d = Math.hypot(b.x - this.x, b.y - this.y);
    if (this.state === 'prowl') {
      if (Math.hypot(this.tx - this.x, this.ty - this.y) < 60) {
        this.tx = ZONE.x0 + w.rng() * (ZONE.x1 - ZONE.x0);
        this.ty = ZONE.y0 + w.rng() * (ZONE.y1 - ZONE.y0);
      }
      this.steer(this.tx, this.ty, PROWL_SPEED, 0.8, dt);
      this.up += (0 - this.up) * Math.min(1, dt * 1.5);
      if (w.started && d < NOTICE && pastBuoys(b.x, b.y) && inZone(b.x, b.y, LEASH * 0.5)) {
        this.state = 'hunt';
        this.t = 0;
        this.lunge = 0;
        this.resolve = RESOLVE.gulper;
        this.onHunt?.();
      }
    } else if (this.state === 'hunt') {
      const lead = clamp(d / 600, 0, 0.5);
      const px = b.x + Math.cos(b.h) * b.v * lead;
      const py = b.y + Math.sin(b.h) * b.v * lead;
      if (this.lunge > 0) {
        this.lunge -= dt;
        this.steer(
          this.x + Math.cos(this.h) * 100,
          this.y + Math.sin(this.h) * 100,
          HUNT_SPEED,
          0,
          dt,
        );
      } else {
        // It slows to turn, so a boat inside its turning circle cannot keep it circling.
        const off = Math.abs(angDiff(Math.atan2(py - this.y, px - this.x), this.h));
        this.steer(px, py, HUNT_SPEED * clamp(0.35 + 0.65 * Math.cos(off), 0.35, 1), TURN, dt);
      }
      this.up += (1 - this.up) * Math.min(1, dt * 2);
      if (this.lunge <= 0 && d < JAW + 24 * w.hullScale) {
        this.lunge = LUNGE;
        this.onBite?.();
      }
      const gone =
        !pastBuoys(b.x, b.y) || !inZone(b.x, b.y, LEASH) || d > NOTICE * 1.8 || this.t > HUNT_MAX;
      if (gone) {
        this.state = 'rest';
        this.cool = REST;
        this.t = 0;
        this.onGiveUp?.();
      }
    } else {
      this.cool -= dt;
      this.steer((ZONE.x0 + ZONE.x1) / 2, (ZONE.y0 + ZONE.y1) / 2, PROWL_SPEED * 1.6, 0.9, dt);
      this.up += (0 - this.up) * Math.min(1, dt * 1.2);
      if (this.cool <= 0 && inZone(this.x, this.y)) {
        this.state = 'prowl';
        this.t = 0;
      }
    }
    const want = this.state === 'hunt' ? clamp(1 - (d - 60) / 260, 0, 1) : 0;
    this.gape += (want - this.gape) * Math.min(1, dt * 6);
    // The chain follows the head.
    const head = this.body[0] as { x: number; y: number };
    head.x = this.x;
    head.y = this.y;
    for (let i = 1; i < this.body.length; i++) {
      const p = this.body[i - 1] as { x: number; y: number };
      const q = this.body[i] as { x: number; y: number };
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const dl = Math.hypot(dx, dy) || 1;
      if (dl > LINK) {
        q.x = p.x + (dx / dl) * LINK;
        q.y = p.y + (dy / dl) * LINK;
      }
    }
  }

  /** Where a harpoon would strike it: its head, while it is up and hunting. */
  mark(): { x: number; y: number } | null {
    return this.state === 'hunt' && this.up > 0.5
      ? (this.body[0] as { x: number; y: number })
      : null;
  }

  /** A harpoon struck its head: it flinches and slows, and at no resolve left it is driven off. */
  harpoon(power: number): boolean {
    if (this.state !== 'hunt') return false;
    this.resolve = Math.max(0, this.resolve - power);
    this.v *= 0.35;
    if (this.resolve > 0) return false;
    this.state = 'rest';
    this.cool = AWAY;
    this.t = 0;
    return true;
  }

  /** Turn toward a point at no more than rate radians a second (0 for straight on), and swim at speed. */
  private steer(tx: number, ty: number, speed: number, rate: number, dt: number): void {
    const want = Math.atan2(ty - this.y, tx - this.x);
    if (rate > 0) this.h += clamp(angDiff(want, this.h), -rate * dt, rate * dt);
    this.v += (speed - this.v) * Math.min(1, dt * 2);
    this.x += Math.cos(this.h) * this.v * dt;
    this.y += Math.sin(this.h) * this.v * dt;
    // Never past the deep's end or into the home water.
    this.x = clamp(this.x, WS + 40, WS + DEEP - 40);
    this.y = clamp(this.y, -DEEP + 40, WS + DEEP - 40);
  }

  draw(v: DrawView, layer: Layer): void {
    const head = this.body[0] as { x: number; y: number };
    if (!v.onScreen(head.x, head.y, 600)) {
      if (layer === 'overlay' && this.state === 'hunt')
        v.indicator(head.x, head.y, '#5B1E2D', 'pirate', true);
      return;
    }
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    const n = this.body.length;
    if (layer === 'underwater') {
      // A long black body, thinning to a whip of a tail.
      for (let i = n - 1; i >= 0; i--) {
        const p = this.body[i] as { x: number; y: number };
        const r = 7 + 24 * (1 - i / n) ** 1.3;
        ctx.fillStyle = `rgba(4,10,16,${0.35 + 0.4 * this.up})`;
        v.isoEllipse(p.x, p.y, r);
        ctx.fill();
      }
      return;
    }
    if (layer === 'afloat' && this.up > 0.3) {
      // The mouth at the surface: a great dark pouch opening, rimmed with teeth.
      const c = Math.cos(this.h);
      const s = Math.sin(this.h);
      const mx = head.x + c * 22;
      const my = head.y + s * 22;
      const r = 26 + 34 * this.gape;
      ctx.globalAlpha = Math.min(1, (this.up - 0.3) / 0.4);
      ctx.fillStyle = '#0B0F14';
      v.isoEllipse(mx, my, r);
      ctx.fill();
      ctx.fillStyle = '#5A1F2E';
      v.isoEllipse(mx, my, r * 0.62);
      ctx.fill();
      ctx.fillStyle = '#F4F1E6';
      const teeth = 14;
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        const tx = mx + Math.cos(a) * r * 0.86;
        const ty = my + Math.sin(a) * r * 0.86;
        const sx = px(tx, ty);
        const sy = py(tx, ty);
        ctx.beginPath();
        ctx.moveTo(sx - 2.5 * Z, sy);
        ctx.lineTo(sx, sy - (4 + 3 * this.gape) * Z);
        ctx.lineTo(sx + 2.5 * Z, sy);
        ctx.closePath();
        ctx.fill();
      }
      // Its back breaking the water behind the head.
      ctx.fillStyle = '#121A22';
      for (let i = 2; i < 9; i += 2) {
        const p = this.body[i] as { x: number; y: number };
        const sx = px(p.x, p.y);
        const sy = py(p.x, p.y);
        const hump = (6 + Math.sin(T * 3 - i) * 2) * Z;
        ctx.beginPath();
        ctx.ellipse(sx, sy - hump * 0.3, (14 - i) * Z, hump, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }
    if (layer === 'mask') {
      const tail = this.body[n - 1] as { x: number; y: number };
      v.light(tail.x, tail.y, 0, 60, 0.7);
      return;
    }
    if (layer === 'glow') {
      // The pink light at the tip of its tail: by night it is how you see it coming.
      const tail = this.body[n - 1] as { x: number; y: number };
      ctx.globalCompositeOperation = 'screen';
      v.glow(tail.x, tail.y, 2, 34, rgba('#FF6FB0', 0.35 + 0.45 * v.dark));
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
