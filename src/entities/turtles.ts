/**
 * Sea turtles, the kid's: a few green turtles paddling the inner rings round
 * the home island, unhurried, each coming up every so often to breathe, when
 * the shell and head break the water with a little puff. Ease the boat up to
 * one slowly and it swims alongside a while, on the beam, matching the boat;
 * come at one fast and it ducks down and is off. The net never takes one: real
 * fishing nets have a door that lets turtles out, and so does this one. The
 * game logs the first sighting and counts the swims, which the shipwreck will
 * one day lean on: a raft of turtles to carry you home.
 */
import { angDiff, clamp } from '../core/math';
import { IR, IX, IY } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

export type TurtleState = 'cruise' | 'with' | 'dive';

export type Turtle = {
  x: number;
  y: number;
  /** Heading, world radians, and speed, world units a second. */
  h: number;
  v: number;
  /** Shell length in world units. */
  len: number;
  /** Flipper phase. */
  paddle: number;
  /** How far up it is, 0 deep to 1 breathing at the surface. */
  up: number;
  /** Seconds until it next comes up, and seconds left at the surface. */
  breathe: number;
  air: number;
  state: TurtleState;
  /** Seconds in this state, and before it will come to the boat again. */
  t: number;
  cool: number;
  /** Which side of the boat it swims on, 1 or -1. */
  side: number;
  /** Where it is paddling to. */
  tx: number;
  ty: number;
};

/** How far from the island they keep: the inner rings. */
export const TURTLE_BAND: readonly [number, number] = [420, 1150];
export const TURTLES = 5;
/** Cruising speed and how fast it turns. */
export const PADDLE = 18;
export const TURN = 0.8;
/** Seconds between breaths (floor and spread), and how long each lasts at the surface. */
export const BREATHE_EVERY: readonly [number, number] = [9, 10];
export const BREATHE = 2.4;
/** A boat this near and no faster than GENTLE draws a turtle alongside. */
export const FRIENDLY = 150;
export const GENTLE = 110;
/** A boat faster than SPOOK within SPOOK_NEAR sends it diving away. */
export const SPOOK = 170;
export const SPOOK_NEAR = 220;
/** It swims alongside at most this long, this far off the beam, and as fast as this. */
export const WITH_MAX = 25;
export const ALONGSIDE = 58;
export const WITH_SPEED = 150;
/** After a swim, or a fright, it keeps to itself this long. */
export const REST = 40;
/** Seconds it dives for when frightened. */
export const DIVE = 3;
/** A boat this near a turtle at the surface is a sighting. */
export const SIGHT_RADIUS = 320;

/** A spot in the band, at angle a and the given share of the way out. */
function inBand(a: number, k: number): [number, number] {
  const d = TURTLE_BAND[0] + (TURTLE_BAND[1] - TURTLE_BAND[0]) * k;
  return [IX + Math.cos(a) * d, IY + Math.sin(a) * d];
}

export class Turtles implements Entity {
  readonly turtles: Turtle[] = [];
  private sighted = false;
  /** The boat came near a turtle at the surface for the first time. */
  onSight: (() => void) | null = null;
  /** A turtle has come alongside the boat. */
  onJoin: ((t: Turtle) => void) | null = null;
  /** A turtle alongside has swum off; spooked when the boat sped up. */
  onLeave: ((t: Turtle, spooked: boolean) => void) | null = null;
  /** A turtle ducked away from a boat coming at it fast. */
  onSpook: ((t: Turtle) => void) | null = null;

  constructor(rng: () => number = Math.random, n = TURTLES) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng() * 0.8;
      const [x, y] = inBand(a, 0.15 + rng() * 0.7);
      const [tx, ty] = inBand(a + 0.6, rng());
      this.turtles.push({
        x,
        y,
        h: rng() * Math.PI * 2,
        v: PADDLE,
        len: 40 + rng() * 8,
        paddle: rng() * 6.28,
        up: 0,
        breathe: BREATHE_EVERY[0] * rng() + 1,
        air: 0,
        state: 'cruise',
        t: 0,
        cool: 0,
        side: 1,
        tx,
        ty,
      });
    }
  }

  /** The turtle swimming with the boat, if one is. */
  get companion(): Turtle | null {
    return this.turtles.find((t) => t.state === 'with') ?? null;
  }

  update(dt: number, w: World): void {
    const b = w.boat;
    for (const t of this.turtles) {
      t.t += dt;
      t.cool = Math.max(0, t.cool - dt);
      t.paddle += dt * (1.6 + t.v / 40);
      const d = Math.hypot(b.x - t.x, b.y - t.y);
      if (t.state === 'cruise') this.cruise(t, dt, w, d);
      else if (t.state === 'with') this.alongside(t, dt, w);
      else this.dive(t, dt, w);
      this.breathing(t, dt, w);
      // Never up onto the island.
      const fx = t.x - IX;
      const fy = t.y - IY;
      const fd = Math.hypot(fx, fy) || 1;
      if (fd < IR + 50) {
        t.x = IX + (fx / fd) * (IR + 50);
        t.y = IY + (fy / fd) * (IR + 50);
      }
      if (!this.sighted && w.started && t.up > 0.6 && d < SIGHT_RADIUS) {
        this.sighted = true;
        this.onSight?.();
      }
    }
  }

  private cruise(t: Turtle, dt: number, w: World, d: number): void {
    const b = w.boat;
    if (Math.hypot(t.tx - t.x, t.ty - t.y) < 40) {
      const a = Math.atan2(t.y - IY, t.x - IX) + 0.3 + w.rng() * 0.9;
      [t.tx, t.ty] = inBand(a, w.rng());
    }
    this.steer(t, t.tx, t.ty, PADDLE, TURN, dt);
    if (!w.started || w.docked) return;
    if (d < SPOOK_NEAR && b.v > SPOOK) {
      t.state = 'dive';
      t.t = 0;
      t.cool = REST;
      t.h = Math.atan2(t.y - b.y, t.x - b.x);
      t.air = 0;
      this.onSpook?.(t);
      return;
    }
    if (t.cool <= 0 && d < FRIENDLY && b.v <= GENTLE && !this.companion) {
      t.state = 'with';
      t.t = 0;
      // The side of the boat it is already on.
      const cross = Math.cos(b.h) * (t.y - b.y) - Math.sin(b.h) * (t.x - b.x);
      t.side = cross >= 0 ? 1 : -1;
      this.onJoin?.(t);
    }
  }

  private alongside(t: Turtle, dt: number, w: World): void {
    const b = w.boat;
    const off = ALONGSIDE * w.hullScale;
    const tx = b.x - Math.sin(b.h) * off * t.side - Math.cos(b.h) * 6;
    const ty = b.y + Math.cos(b.h) * off * t.side - Math.sin(b.h) * 6;
    const gap = Math.hypot(tx - t.x, ty - t.y);
    const want = clamp(b.v + gap * 1.5, PADDLE, WITH_SPEED);
    if (gap > 6) this.steer(t, tx, ty, want, 3, dt);
    else {
      t.h += angDiff(b.h, t.h) * Math.min(1, dt * 3);
      t.v += (b.v - t.v) * Math.min(1, dt * 3);
      t.x += Math.cos(t.h) * t.v * dt;
      t.y += Math.sin(t.h) * t.v * dt;
    }
    // Close under the surface, so you can see it beside you.
    t.up = Math.max(t.up, 0.75);
    const fromIsland = Math.hypot(t.x - IX, t.y - IY);
    const spooked = b.v > SPOOK;
    if (spooked || t.t > WITH_MAX || w.docked || fromIsland > TURTLE_BAND[1] + 500 || gap > 260) {
      // Frightened off, it ducks away from the boat; otherwise it peels off home.
      t.state = spooked ? 'dive' : 'cruise';
      t.t = 0;
      t.cool = REST;
      if (spooked) t.h = Math.atan2(t.y - b.y, t.x - b.x) + t.side * 0.6;
      const [x, y] = inBand(Math.atan2(t.y - IY, t.x - IX), w.rng());
      t.tx = x;
      t.ty = y;
      this.onLeave?.(t, spooked);
    }
  }

  private dive(t: Turtle, dt: number, w: World): void {
    t.v += (PADDLE * 3 - t.v) * Math.min(1, dt * 3);
    t.x += Math.cos(t.h) * t.v * dt;
    t.y += Math.sin(t.h) * t.v * dt;
    if (t.t > DIVE) {
      t.state = 'cruise';
      t.t = 0;
      const [x, y] = inBand(Math.atan2(t.y - IY, t.x - IX) + 0.5, w.rng());
      t.tx = x;
      t.ty = y;
    }
  }

  /** Up for a breath every so often while cruising, and down again; deep while diving. */
  private breathing(t: Turtle, dt: number, w: World): void {
    let want = 0.15;
    if (t.state === 'dive') want = 0;
    else if (t.air > 0) {
      t.air -= dt;
      want = 1;
    } else {
      t.breathe -= dt;
      if (t.breathe <= 0) {
        t.breathe = BREATHE_EVERY[0] + w.rng() * BREATHE_EVERY[1];
        t.air = BREATHE;
      }
      if (t.state === 'with') want = 0.75;
    }
    t.up += (want - t.up) * Math.min(1, dt * 2.2);
  }

  /** Turn toward a point at no more than rate radians a second, and swim at speed. */
  private steer(t: Turtle, tx: number, ty: number, speed: number, rate: number, dt: number): void {
    const want = Math.atan2(ty - t.y, tx - t.x);
    t.h += clamp(angDiff(want, t.h), -rate * dt, rate * dt);
    t.v += (speed - t.v) * Math.min(1, dt * 2);
    t.x += Math.cos(t.h) * t.v * dt;
    t.y += Math.sin(t.h) * t.v * dt;
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'underwater' && layer !== 'afloat') return;
    for (const t of this.turtles) {
      if (!v.onScreen(t.x, t.y, 120)) continue;
      if (layer === 'underwater') {
        // Deep, a soft shape in the water; nearer the surface, darker and sharper.
        if (t.up > 0.7) continue;
        this.body(v, t, 0, `rgba(10,46,40,${0.22 + 0.4 * t.up})`, null, null);
      } else if (t.up > 0.45) {
        const k = clamp((t.up - 0.45) / 0.4, 0, 1);
        v.ctx.globalAlpha = k;
        this.body(v, t, 1, '#4E7A3A', '#6E9B4F', '#9DB27A');
        v.ctx.globalAlpha = 1;
        if (t.air > BREATHE - 0.5) this.puff(v, t, (BREATHE - t.air) / 0.5);
      }
    }
  }

  /**
   * A turtle from above: four flippers paddling (the front pair long, sweeping),
   * an oval shell with a ring of plates, and a blunt head ahead of it.
   */
  private body(
    v: DrawView,
    t: Turtle,
    z: number,
    shell: string,
    plates: string | null,
    skin: string | null,
  ): void {
    const { ctx, px, py } = v;
    const c = Math.cos(t.h);
    const s = Math.sin(t.h);
    const L = t.len;
    const P = (along: number, across: number): [number, number] => {
      const wx = t.x + (c * along - s * across) * L;
      const wy = t.y + (s * along + c * across) * L;
      return [px(wx, wy), py(wx, wy, z)];
    };
    const stroke = Math.sin(t.paddle);
    ctx.fillStyle = skin ?? shell;
    for (const side of [1, -1] as const) {
      // Front flipper: a long blade sweeping back and forth.
      const root = P(0.22, 0.3 * side);
      const tip = P(0.08 - 0.28 * stroke, 0.82 * side);
      const trail = P(0.0 - 0.2 * stroke, 0.5 * side);
      ctx.beginPath();
      ctx.moveTo(root[0], root[1]);
      ctx.quadraticCurveTo(tip[0], tip[1], trail[0], trail[1]);
      ctx.closePath();
      ctx.fill();
      // Back flipper: short and paddling out of time with the front.
      const broot = P(-0.32, 0.22 * side);
      const btip = P(-0.52 + 0.06 * stroke, 0.4 * side);
      ctx.beginPath();
      ctx.moveTo(broot[0], broot[1]);
      ctx.lineTo(btip[0], btip[1]);
      ctx.lineTo(P(-0.42, 0.12 * side)[0], P(-0.42, 0.12 * side)[1]);
      ctx.closePath();
      ctx.fill();
    }
    // The head, nodding a little with the stroke.
    const head = P(0.6 + 0.02 * stroke, 0);
    ctx.beginPath();
    ctx.ellipse(head[0], head[1], 0.15 * L * v.zoom, 0.11 * L * v.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    // The shell.
    ctx.fillStyle = shell;
    const ring = (k: number): void => {
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const p = P(Math.cos(a) * 0.48 * k, Math.sin(a) * 0.36 * k);
        if (i === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      }
      ctx.closePath();
    };
    ring(1);
    ctx.fill();
    if (plates) {
      ctx.fillStyle = plates;
      ring(0.62);
      ctx.fill();
      ctx.strokeStyle = shell;
      ctx.lineWidth = 1.2 * v.zoom;
      const spine = [P(0.28, 0), P(0.08, 0), P(-0.12, 0), P(-0.3, 0)];
      ctx.beginPath();
      for (const [i, p] of spine.entries()) {
        if (i === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
      for (const along of [0.1, -0.12]) {
        const l = P(along, 0.2);
        const r = P(along, -0.2);
        ctx.beginPath();
        ctx.moveTo(l[0], l[1]);
        ctx.lineTo(r[0], r[1]);
        ctx.stroke();
      }
    }
  }

  /** A breath: a little puff of spray off its nose as it comes up. */
  private puff(v: DrawView, t: Turtle, k: number): void {
    const { ctx, px, py } = v;
    const hx = t.x + Math.cos(t.h) * t.len * 0.65;
    const hy = t.y + Math.sin(t.h) * t.len * 0.65;
    ctx.fillStyle = v.foam;
    ctx.globalAlpha = 0.9 * (1 - k);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7;
      ctx.beginPath();
      ctx.arc(
        px(hx, hy) + Math.cos(a) * 5 * k * v.zoom,
        py(hx, hy, 4 + 10 * k) + Math.sin(a) * 2 * k * v.zoom,
        (2.2 - 1.2 * k) * v.zoom,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
