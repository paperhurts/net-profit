/**
 * The Heron's nest on top of island 9's tower, round two of his fight, from the
 * kid's drawing: the orb of power, a great magenta ball hung in the air on blue
 * chains, two running up out of sight and one down into the sticks, and a
 * fourth to a little pink necromancer in a pointed hat, chained to it at the
 * nest's edge. While he is chained the orb is lit, and its shield is on the
 * Heron: nothing hurts him. The necromancer fights for him as he must, raising
 * skeletons out of the sticks, one at a time, two at most. Beat him and his
 * chain snaps: the orb goes dark, the shield goes with it, and he kneels where
 * he was, free. The game owns the skeletons (they are a horde like Gigantis's)
 * and what freeing him means, through callbacks.
 */

import { clamp } from '../core/math';
import type { Solid } from '../render/layers';
import type { DrawView, Entity, Layer, World } from './entity';

/** Hits to beat the chained necromancer. */
export const NECRO9_HP = 8;
/** Seconds between the skeletons he raises, the first a little sooner, and how many may stand at once. */
export const RAISE_EVERY = 6;
export const FIRST_RAISE = 3;
export const RAISE_MAX = 2;
/** How high the orb hangs over the nest, and how big it is. */
export const ORB_Z = 95;
export const ORB_R = 16;
/** Seconds the chain takes to snap and fall. */
export const SNAP_T = 1.2;

export type NestState = 'wait' | 'chained' | 'snap' | 'free';

type Room = { x: number; y: number; r: number };

/** A blue chain from one screen point to another: links like the kid's, ovals turned alternately. */
export function drawChain(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  Z: number,
  color = '#5B7FD6',
): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.round(len / (7 * Z)));
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5 * Z;
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * k;
    const y = y0 + (y1 - y0) * k;
    ctx.beginPath();
    ctx.ellipse(x, y, 4.4 * Z, (i % 2 ? 1.4 : 2.6) * Z, a, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export class Nest implements Entity {
  state: NestState = 'wait';
  hp = NECRO9_HP;
  t = 0;
  ph = 0;
  flash = 0;
  /** Where the necromancer stands, chained, at the nest's right-hand edge; and where the orb hangs, over the back. */
  readonly necro: { x: number; y: number };
  readonly orb: { x: number; y: number };
  /** Arms up as he raises one, counting down. */
  raising = 0;
  private raiseCd = FIRST_RAISE;
  private stunT = 0;
  /** He has seen the figure arrive. */
  onWake: (() => void) | null = null;
  /** He raises a skeleton here; the game makes it. */
  onRaise: ((x: number, y: number) => void) | null = null;
  /** How many of what he raised still stand; the game knows. */
  standing: (() => number) | null = null;
  /** He was hurt. */
  onHurt: (() => void) | null = null;
  /** His chain has snapped: the orb is dark and the shield is down. */
  onFree: (() => void) | null = null;

  constructor(readonly room: Room) {
    const a = -Math.PI / 4 - 0.25;
    this.necro = {
      x: room.x + Math.cos(a) * room.r * 0.68,
      y: room.y + Math.sin(a) * room.r * 0.68,
    };
    this.orb = { x: room.x - room.r * 0.38, y: room.y - room.r * 0.38 };
  }

  /** The orb is lit, and its shield is on the Heron. */
  get lit(): boolean {
    return this.state === 'wait' || this.state === 'chained';
  }

  /** In the fight, to be speared. */
  get up(): boolean {
    return this.state === 'chained';
  }

  get x(): number {
    return this.necro.x;
  }

  get y(): number {
    return this.necro.y;
  }

  reset(): void {
    this.state = 'wait';
    this.hp = NECRO9_HP;
    this.t = 0;
    this.flash = 0;
    this.raising = 0;
    this.raiseCd = FIRST_RAISE;
    this.stunT = 0;
  }

  /** Already free, as once the Heron is beaten for good: the orb dark, the necromancer kneeling. */
  freed(): void {
    this.reset();
    this.state = 'free';
  }

  hit(power: number): void {
    if (!this.up) return;
    this.hp = Math.max(0, this.hp - power);
    this.flash = 0.2;
    this.onHurt?.();
    if (this.hp > 0) return;
    this.state = 'snap';
    this.t = 0;
    this.raising = 0;
    this.onFree?.();
  }

  /** Tar on him: he raises nothing for a while. */
  stun(s: number): void {
    if (this.up) this.stunT = Math.max(this.stunT, s);
  }

  update(dt: number, w: World): void {
    this.t += dt;
    this.ph += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.raising = Math.max(0, this.raising - dt);
    const f = w.figure;
    const R = this.room;
    const onRoof = f !== null && Math.hypot(f.x - R.x, f.y - R.y) < R.r + 40;
    if (this.state === 'wait') {
      if (onRoof) {
        this.state = 'chained';
        this.t = 0;
        this.onWake?.();
      }
      return;
    }
    if (this.state === 'snap') {
      if (this.t >= SNAP_T) this.state = 'free';
      return;
    }
    if (this.state !== 'chained') return;
    if (!onRoof || !f) {
      this.reset();
      return;
    }
    this.stunT = Math.max(0, this.stunT - dt);
    if (this.stunT > 0) return;
    // He raises one while fewer than two stand, out of the sticks between him and the figure.
    if ((this.standing?.() ?? 0) >= RAISE_MAX) return;
    this.raiseCd -= dt;
    if (this.raiseCd > 0) return;
    this.raiseCd = RAISE_EVERY;
    this.raising = 0.6;
    const dx = f.x - this.necro.x;
    const dy = f.y - this.necro.y;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(40, d * 0.5);
    this.onRaise?.(this.necro.x + (dx / d) * k, this.necro.y + (dy / d) * k);
  }

  /** The orb and its chains, and the necromancer, for the room's depth-sorted actors. */
  solids(v: DrawView): Solid[] {
    return [
      { d: this.orb.x + this.orb.y, f: () => this.drawOrb(v) },
      { d: this.necro.x + this.necro.y, f: () => this.drawNecro(v) },
    ];
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'air' || !this.lit || !v.onScreen(this.orb.x, this.orb.y, 300)) return;
    // The orb's light, over everything.
    v.glow(
      this.orb.x,
      this.orb.y,
      ORB_Z,
      70,
      `rgba(255,90,210,${0.25 + 0.1 * Math.sin(this.ph * 3)})`,
    );
  }

  private drawOrb(v: DrawView): void {
    const { ctx, px, py } = v;
    const Z = v.zoom;
    const o = this.orb;
    const sx = px(o.x, o.y);
    const sy = py(o.x, o.y, ORB_Z);
    const lit = this.lit;
    ctx.save();
    ctx.lineCap = 'round';
    // Its shadow on the sticks, and the chains: two up out of sight, one down into the nest.
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    v.isoEllipse(o.x, o.y, 14);
    ctx.fill();
    drawChain(ctx, sx - 10 * Z, sy - 10 * Z, sx - 110 * Z, sy - 260 * Z, Z);
    drawChain(ctx, sx + 10 * Z, sy - 10 * Z, sx + 120 * Z, sy - 250 * Z, Z);
    drawChain(ctx, sx, sy + ORB_R * Z, px(o.x, o.y), py(o.x, o.y, 0), Z);
    // The necromancer's: whole while he is chained; snapped, its end falls to the sticks.
    const n = this.necro;
    const hx = px(n.x, n.y);
    const hy = py(n.x, n.y, 20);
    if (this.state === 'wait' || this.state === 'chained')
      drawChain(ctx, sx + 12 * Z, sy + 4 * Z, hx, hy, Z);
    else {
      const k = this.state === 'snap' ? clamp(this.t / SNAP_T, 0, 1) : 1;
      const mx = sx + (hx - sx) * 0.55;
      const my = sy + (hy - sy) * 0.55;
      drawChain(ctx, sx + 12 * Z, sy + 4 * Z, mx, my + k * (py(o.x, o.y, 0) - my) * 0.7, Z);
    }
    // The orb: magenta, scribbled round like the kid's, glowing while it is lit; dark and cracked after.
    ctx.fillStyle = lit ? '#C21E9E' : '#4A3550';
    ctx.beginPath();
    ctx.arc(sx, sy, ORB_R * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = lit ? 'rgba(255,120,230,.8)' : 'rgba(120,90,130,.7)';
    ctx.lineWidth = 1.4 * Z;
    for (let i = 0; i < 6; i++) {
      const a0 = this.ph * (lit ? 1.4 : 0) + i * 1.05;
      ctx.beginPath();
      ctx.arc(sx, sy, (ORB_R - 3 - (i % 3) * 3) * Z, a0, a0 + 1.6);
      ctx.stroke();
    }
    ctx.fillStyle = lit ? 'rgba(255,220,250,.7)' : 'rgba(200,180,210,.25)';
    ctx.beginPath();
    ctx.arc(sx - 5 * Z, sy - 6 * Z, 3.6 * Z, 0, Math.PI * 2);
    ctx.fill();
    if (!lit) {
      ctx.strokeStyle = '#1E1424';
      ctx.lineWidth = 1.2 * Z;
      ctx.beginPath();
      ctx.moveTo(sx + 2 * Z, sy - ORB_R * Z);
      ctx.lineTo(sx - 2 * Z, sy - 5 * Z);
      ctx.lineTo(sx + 4 * Z, sy + 2 * Z);
      ctx.lineTo(sx, sy + 10 * Z);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawNecro(v: DrawView): void {
    drawNecromancer(v, this.necro.x, this.necro.y, this.ph, {
      flash: this.flash > 0,
      raising: this.raising > 0,
      kneel: this.state === 'snap' || this.state === 'free',
      chained: this.state === 'wait' || this.state === 'chained',
    });
  }
}

type NecroLook = { flash?: boolean; raising?: boolean; kneel?: boolean; chained?: boolean };

/**
 * The necromancer, as the kid drew him in pink: a pointed hat, a pale face with dark eyes, a pink robe, and a
 * purple cape that flares at his sides like little wings. Chained, an iron cuff on his wrist; raising one, both
 * arms up and green light in his hands; freed, kneeling.
 */
export function drawNecromancer(v: DrawView, x: number, y: number, ph: number, o: NecroLook): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const sy = py(x, y, 0);
  const drop = o.kneel ? 7 : 0;
  const Y = (dy: number) => sy + (dy + drop) * Z;
  const sway = o.kneel ? 0 : Math.sin(ph * 2) * 0.8;
  const pink = o.flash ? '#FFFFFF' : '#E05BC4';
  const deep = o.flash ? '#FFFFFF' : '#A83A92';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  v.isoEllipse(x, y, 9);
  ctx.fill();
  // The cape, flaring out at his sides.
  ctx.fillStyle = o.flash ? '#FFFFFF' : '#6E3A8E';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx + side * 2 * Z, Y(-24));
    ctx.lineTo(sx + side * (13 + sway) * Z, Y(-20));
    ctx.lineTo(sx + side * 10 * Z, Y(-12));
    ctx.lineTo(sx + side * 12 * Z, Y(-5));
    ctx.lineTo(sx + side * 3 * Z, Y(-8));
    ctx.closePath();
    ctx.fill();
  }
  // The robe, to the floor.
  ctx.fillStyle = pink;
  ctx.beginPath();
  ctx.moveTo(sx - 4 * Z, Y(-24));
  ctx.lineTo(sx + 4 * Z, Y(-24));
  ctx.lineTo(sx + 7 * Z, Y(0));
  ctx.lineTo(sx - 7 * Z, Y(0));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = deep;
  ctx.lineWidth = 1 * Z;
  ctx.beginPath();
  ctx.moveTo(sx, Y(-22));
  ctx.lineTo(sx, Y(-1));
  ctx.stroke();
  // Arms: up as he raises, down at his sides otherwise, a cuff on the chained one.
  ctx.strokeStyle = pink;
  ctx.lineWidth = 2.2 * Z;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx + side * 3.5 * Z, Y(-21));
    if (o.raising) ctx.lineTo(sx + side * 9 * Z, Y(-34));
    else ctx.lineTo(sx + side * 7 * Z, Y(-11));
    ctx.stroke();
  }
  if (o.raising) {
    ctx.fillStyle = 'rgba(140,255,168,.8)';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx + side * 9 * Z, Y(-36), 2.6 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = o.chained ? '#3B4A78' : '#5A5A66';
  ctx.fillRect(sx + (o.raising ? 7 : 5.6) * Z, Y(o.raising ? -31 : -13), 3.2 * Z, 2.4 * Z);
  // Head: a pale face with dark eyes, under a tall pointed hat that bends at its tip.
  ctx.fillStyle = o.flash ? '#FFFFFF' : '#F2E3EC';
  ctx.beginPath();
  ctx.arc(sx, Y(-28), 4.4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2A1530';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx + side * 1.6 * Z, Y(-28.4), 0.9 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = deep;
  ctx.beginPath();
  ctx.moveTo(sx - 7 * Z, Y(-31));
  ctx.lineTo(sx + 7 * Z, Y(-31));
  ctx.lineTo(sx + 2 * Z, Y(-42));
  ctx.lineTo(sx + 6 * Z + sway * Z, Y(-46));
  ctx.lineTo(sx - 2 * Z, Y(-41));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
