/**
 * Neil, the owner's seal, on the kid's ice floe: a grey seal hauled out at the
 * floe's edge by the hole, who lifts his head to watch a boat come alongside.
 * Toss him an ice fish from the hold (arctic char, polar cod or icefish) and
 * on the third he is yours, and his name is Neil. From then on he goes where
 * the boat goes, the owner's design: in the water beside it, off the far side
 * from the otter, level with the cabin; and when the boat stops a while he
 * flops up onto the deck at the stern to rest, as seals do on boats, and slips
 * back in once it is under way. Something in the water near the boat (a shark,
 * a leviathan, the lionfish) has him up on the deck too. Ice fishing, he sits
 * on the ice by the hole and now and then goes in after a fish
 * (fishing/icefish.ts). Tap him to pet him. The game says what counts as
 * danger, feeds him from the hold, and saves how many ice fish he has had.
 */

import { clamp } from '../core/math';
import { NEIL_FEEDS } from '../state/save';
import { floeR, ICE_FLOE } from '../world/icefloe';
import type { DrawView, Entity, Layer, World } from './entity';

export { NEIL_FEEDS };

/** Where he lies while wild: at the floe's edge south of east, a little round from the hole. */
const HOME_A = 0.5;
export const NEIL_HOME = {
  x: ICE_FLOE.x + Math.cos(HOME_A) * ICE_FLOE.r * 0.78,
  y: ICE_FLOE.y + Math.sin(HOME_A) * ICE_FLOE.r * 0.78,
} as const;
/** How high the floe's top is, where he lies; and how near the boat must be to toss him a fish. */
export const FLOE_TOP = 7;
export const NEIL_REACH = 170;
/** Where he swims beside the boat, in the hull's units: off the far side from the viewer, level with the cabin. */
export const NEIL_SIDE = 28;
export const NEIL_ALONG = 2;
/** Stopped this long, he flops aboard to rest; under way this long, he slips back in. */
export const REST_T = 2.5;
export const CALM_T = 1.5;
/** Seconds to flop up onto the deck or slide back off it. */
export const FLOP_T = 0.6;
/** Under this speed the boat is stopped. */
export const IDLE_SPEED = 20;
/** How big he is drawn: bigger than life, so a small player finds him. */
export const SEAL_SIZE = 1.5;
export const SEAL_DECK_SIZE = 1.15;

export type NeilState = 'wild' | 'swim' | 'flop' | 'deck' | 'slide';
/** Why he is up on the deck: resting while the boat is stopped, or something in the water. */
export type NeilReason = 'rest' | 'danger';

export class Neil implements Entity {
  state: NeilState = 'wild';
  /** Ice fish he has had; NEIL_FEEDS makes him yours. */
  fed = 0;
  x: number = NEIL_HOME.x;
  y: number = NEIL_HOME.y;
  h = Math.PI * 0.75;
  ph = 0;
  t = 0;
  /** Seconds of hearts after a pet or a fish. */
  love = 0;
  /** Something is in the water near the boat; the game says, each frame. */
  danger = false;
  /** Seconds the boat has been stopped, and under way. */
  private still = 0;
  private moving = 0;
  /** He has flopped aboard, and why. */
  onFlop: ((why: NeilReason) => void) | null = null;

  /** He is yours. */
  get free(): boolean {
    return this.fed >= NEIL_FEEDS;
  }

  /** On the deck, or getting there, so the game draws him at his seat. */
  get aboard(): boolean {
    return this.state === 'deck' || this.state === 'flop';
  }

  /** Back as he was when the game starts over, or from a save. */
  set(fed: number): void {
    this.fed = clamp(Math.floor(fed), 0, NEIL_FEEDS);
    this.state = this.free ? 'swim' : 'wild';
    this.x = NEIL_HOME.x;
    this.y = NEIL_HOME.y;
    this.t = 0;
    this.still = 0;
    this.moving = 0;
  }

  /** An ice fish tossed to him while he is wild. Returns whether that made him yours. */
  feed(): boolean {
    if (this.free) return false;
    this.fed++;
    this.love = 1.6;
    if (!this.free) return false;
    // He flops in off the ice and swims to the boat.
    this.state = 'slide';
    this.t = 0;
    return true;
  }

  pet(): void {
    this.love = 1.6;
  }

  update(dt: number, w: World): void {
    this.ph += dt;
    this.t += dt;
    this.love = Math.max(0, this.love - dt);
    if (this.state === 'wild') {
      // He turns his head to a boat that comes near.
      const d = Math.hypot(w.boat.x - this.x, w.boat.y - this.y);
      if (d < 600) this.h = Math.atan2(w.boat.y - this.y, w.boat.x - this.x);
      return;
    }
    const stopped = Math.abs(w.boat.v) < IDLE_SPEED;
    this.still = stopped ? this.still + dt : 0;
    this.moving = stopped ? 0 : this.moving + dt;
    const why: NeilReason | null = this.danger ? 'danger' : this.still >= REST_T ? 'rest' : null;
    if (this.state === 'flop') {
      if (this.t >= FLOP_T) this.state = 'deck';
      return;
    }
    if (this.state === 'deck') {
      if (!this.danger && this.moving >= CALM_T) {
        this.state = 'slide';
        this.t = 0;
        this.place(w, true, dt);
      }
      return;
    }
    if (why && this.state === 'swim') {
      this.state = 'flop';
      this.t = 0;
      this.onFlop?.(why);
      return;
    }
    if (this.state === 'slide' && this.t >= FLOP_T) this.state = 'swim';
    this.place(w, false, dt);
  }

  /** In the water beside the boat: over at once if far behind, else keeping up. */
  private place(w: World, snap: boolean, dt: number): void {
    const b = w.boat;
    const k = w.hullScale;
    const c = Math.cos(b.h);
    const s = Math.sin(b.h);
    // The far side from the viewer, level with the cabin: the otter has the near side, off the bow.
    const side = c - s >= 0 ? -1 : 1;
    const tx = b.x + c * NEIL_ALONG * k - s * NEIL_SIDE * k * side;
    const ty = b.y + s * NEIL_ALONG * k + c * NEIL_SIDE * k * side;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (snap || d > 260) {
      this.x = tx;
      this.y = ty;
    } else if (d > 0.5) {
      const sp = Math.min(d * 5, Math.abs(b.v) * 1.3 + 110);
      const st = Math.min(d, sp * dt);
      this.x += (dx / d) * st;
      this.y += (dy / d) * st;
    }
    if (Math.abs(b.v) > IDLE_SPEED) this.h = b.v > 0 ? b.h : b.h + Math.PI;
  }

  /** Under the water just now, between breaths, as he swims along. */
  under(v: number): boolean {
    return this.state === 'swim' && Math.abs(v) > IDLE_SPEED && Math.sin(this.ph * 1.3) > 0.8;
  }

  draw(_v: DrawView, _layer: Layer): void {}

  /** Wild on the floe's edge, or swimming beside the boat. */
  drawOut(v: DrawView, boatV: number): void {
    if (this.aboard) return;
    if (this.state === 'wild') {
      const sx = v.px(this.x, this.y);
      const sy = v.py(this.x, this.y, FLOE_TOP);
      // Now and then he lifts his head right up.
      const lift = Math.max(0, Math.sin(this.ph * 0.8)) * 3;
      drawSealLie(v.ctx, sx, sy, dirOf(this.h), this.ph, lift, v.zoom * SEAL_SIZE);
      this.drawLove(v, sx, sy - 22 * v.zoom);
      return;
    }
    const sx = v.px(this.x, this.y);
    const sy = v.py(this.x, this.y, 0);
    if (this.state === 'slide') {
      // A splash as he slips in.
      const k = clamp(this.t / FLOP_T, 0, 1);
      v.ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
      v.ctx.lineWidth = 1.4 * v.zoom;
      v.ctx.beginPath();
      v.ctx.ellipse(sx, sy, (8 + k * 14) * v.zoom, (4 + k * 7) * v.zoom, 0, 0, Math.PI * 2);
      v.ctx.stroke();
    }
    if (this.under(boatV)) return;
    drawSealSwim(
      v.ctx,
      sx,
      sy,
      dirOf(this.h),
      this.ph,
      Math.abs(boatV) > IDLE_SPEED,
      v.zoom * SEAL_SIZE,
    );
    this.drawLove(v, sx, sy - 14 * v.zoom);
  }

  /** Where he lies on a boat of this hull scale: on the deck at the stern, on the far side from the otter's seat. */
  seat(b: { x: number; y: number; h: number }, k: number): { x: number; y: number; z: number } {
    const c = Math.cos(b.h);
    const s = Math.sin(b.h);
    return { x: b.x - c * 13 * k - s * 5 * k, y: b.y - s * 13 * k + c * 5 * k, z: 9 * k + 1 };
  }

  /** On the deck, lying along it; flopping, coming up over the side. */
  drawAboard(v: DrawView, b: { x: number; y: number; h: number }, k: number): void {
    if (!this.aboard) return;
    const p = this.seat(b, k);
    const up = this.state === 'flop' ? clamp(this.t / FLOP_T, 0, 1) : 1;
    const sx = v.px(p.x, p.y);
    const sy = v.py(p.x, p.y, p.z * up);
    const alarm = this.danger ? 3 : 0;
    drawSealLie(v.ctx, sx, sy, dirOf(b.h), this.ph, alarm, v.zoom * SEAL_DECK_SIZE);
    this.drawLove(v, sx, sy - 20 * v.zoom);
  }

  private drawLove(v: DrawView, sx: number, top: number): void {
    if (this.love <= 0) return;
    const { ctx } = v;
    const Z = v.zoom;
    ctx.fillStyle = `rgba(255,105,140,${Math.min(1, this.love)})`;
    const hy = top - (1.6 - this.love) * 12 * Z;
    ctx.beginPath();
    ctx.arc(sx - 1.5 * Z, hy, 1.8 * Z, 0, Math.PI * 2);
    ctx.arc(sx + 1.5 * Z, hy, 1.8 * Z, 0, Math.PI * 2);
    ctx.moveTo(sx - 3.2 * Z, hy + 0.4 * Z);
    ctx.lineTo(sx, hy + 3.6 * Z);
    ctx.lineTo(sx + 3.2 * Z, hy + 0.4 * Z);
    ctx.fill();
  }
}

/** Which way he faces on the screen, left or right, for a heading. */
function dirOf(h: number): number {
  return Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
}

export const SEAL_GREY = '#8D9AA3';
const SEAL_BACK = '#6E7C86';
const SEAL_BELLY = '#B9C3C9';
const SEAL_DARK = '#1F282E';

/** His face side on: a round grey head, a pale muzzle, a big dark eye with a glint, a dark nose, whiskers. */
export function sealHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  Z: number,
): void {
  ctx.fillStyle = SEAL_GREY;
  ctx.beginPath();
  ctx.arc(x, y, 4.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SEAL_BELLY;
  ctx.beginPath();
  ctx.ellipse(x + dir * 3.2 * Z, y + 1 * Z, 2.6 * Z, 2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SEAL_DARK;
  ctx.beginPath();
  ctx.arc(x + dir * 1 * Z, y - 1.4 * Z, 1.35 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + dir * 5.2 * Z, y + 0.3 * Z, 1 * Z, 0.75 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x + dir * 1.4 * Z, y - 1.9 * Z, 0.45 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 0.45 * Z;
  for (const w of [-0.5, 0.4]) {
    ctx.beginPath();
    ctx.moveTo(x + dir * 3.8 * Z, y + (1.4 + w) * Z);
    ctx.lineTo(x + dir * 7.6 * Z, y + (1.2 + w * 2.2) * Z);
    ctx.stroke();
  }
}

/** Lying out on the ice or the deck: a long grey body with dapples, hind flippers fanned, chest and head up. */
export function drawSealLie(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  dir: number,
  ph: number,
  lift: number,
  Z: number,
): void {
  const up = lift * Z;
  ctx.save();
  ctx.fillStyle = 'rgba(40,60,70,.22)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 1 * Z, 15 * Z, 4 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hind flippers, fanned at the tail, and waving now and then.
  ctx.fillStyle = SEAL_BACK;
  const wave = Math.sin(ph * 2.2) * 0.25;
  for (const f of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(
      sx - dir * 15 * Z,
      sy - (3 + f * 1.6) * Z,
      3.4 * Z,
      1.4 * Z,
      dir * (0.5 * f + wave),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // The body, and its dappled back.
  ctx.fillStyle = SEAL_GREY;
  ctx.beginPath();
  ctx.ellipse(sx - dir * 3 * Z, sy - 4.5 * Z, 12.5 * Z, 5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SEAL_BELLY;
  ctx.beginPath();
  ctx.ellipse(sx - dir * 2 * Z, sy - 2.4 * Z, 9 * Z, 2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SEAL_BACK;
  for (const [dx, dy, r] of [
    [-8, -7, 1.2],
    [-3, -8, 1],
    [1, -6.8, 0.9],
    [-11, -5.5, 0.8],
  ] as const) {
    ctx.beginPath();
    ctx.arc(sx + dir * dx * Z, sy + dy * Z, r * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // Chest up, and a fore flipper under it.
  ctx.fillStyle = SEAL_GREY;
  ctx.beginPath();
  ctx.ellipse(sx + dir * 6.5 * Z, sy - 6.5 * Z - up * 0.5, 5 * Z, 5.5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SEAL_BACK;
  ctx.beginPath();
  ctx.ellipse(sx + dir * 5 * Z, sy - 1.6 * Z, 2.6 * Z, 1.1 * Z, dir * 0.4, 0, Math.PI * 2);
  ctx.fill();
  sealHead(ctx, sx + dir * 9.5 * Z, sy - 11 * Z - up, dir, Z);
  ctx.restore();
}

/** Swimming: his round head and a bit of back out of the water, a wake behind when the boat is under way. */
export function drawSealSwim(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  dir: number,
  ph: number,
  under: boolean,
  Z: number,
): void {
  const bob = Math.sin(ph * 4) * 0.7 * Z;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 1 * Z;
  ctx.beginPath();
  if (under) {
    ctx.moveTo(sx + dir * 3 * Z, sy);
    ctx.lineTo(sx - dir * 16 * Z, sy - 3.5 * Z);
    ctx.moveTo(sx + dir * 3 * Z, sy);
    ctx.lineTo(sx - dir * 16 * Z, sy + 3.5 * Z);
  } else ctx.ellipse(sx, sy, 10 * Z, 4 * Z, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = SEAL_BACK;
  ctx.beginPath();
  ctx.ellipse(sx - dir * 4 * Z, sy - 0.5 * Z + bob, 8 * Z, 2.6 * Z, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  sealHead(ctx, sx + dir * 4 * Z, sy - 3.6 * Z + bob, dir, Z);
  ctx.restore();
}

/** Under the water, side on, swimming: a long grey body, flippers back, head out in front. */
export function drawSealDive(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  dir: number,
  ph: number,
  Z: number,
): void {
  const kick = Math.sin(ph * 10) * 0.4;
  ctx.save();
  ctx.fillStyle = SEAL_BACK;
  for (const f of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(
      sx - dir * 14 * Z,
      sy + f * 1.6 * Z,
      3.6 * Z,
      1.3 * Z,
      dir * (0.35 * f + kick),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = SEAL_GREY;
  ctx.beginPath();
  ctx.ellipse(sx - dir * 1 * Z, sy, 12 * Z, 4.6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SEAL_BELLY;
  ctx.beginPath();
  ctx.ellipse(sx - dir * 1 * Z, sy + 2 * Z, 9 * Z, 1.8 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SEAL_BACK;
  ctx.beginPath();
  ctx.ellipse(sx + dir * 3 * Z, sy + 3 * Z, 2.8 * Z, 1.1 * Z, dir * (0.6 - kick), 0, Math.PI * 2);
  ctx.fill();
  sealHead(ctx, sx + dir * 10 * Z, sy - 0.5 * Z, dir, Z);
  ctx.restore();
}

/** Close enough to where he lies, while wild, to toss him a fish. */
export function nearNeil(x: number, y: number, r = NEIL_REACH): boolean {
  return Math.hypot(x - NEIL_HOME.x, y - NEIL_HOME.y) <= r;
}

/** He lies on the floe: inside its edge. */
export function onFloe(x: number, y: number): boolean {
  const a = Math.atan2(y - ICE_FLOE.y, x - ICE_FLOE.x);
  return Math.hypot(x - ICE_FLOE.x, y - ICE_FLOE.y) < floeR(a) - 8;
}
