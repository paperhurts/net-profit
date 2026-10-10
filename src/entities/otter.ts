/**
 * The otter, the kid's most-asked-for pet. He lives wild off the home island,
 * just north of the dock, floating on his back with a shell on his tummy.
 * Stop the boat by him and tap him to toss him a fish from the hold; on the
 * third he is yours. From then on he goes everywhere the boat goes, and the
 * owner's design for where: in the water beside it in home water, swimming
 * along off the bow on the side nearer the viewer, ducking under and popping
 * up as it goes and floating on his back when it stops; and up on the deck
 * whenever the water is not safe, which is out past the buoys, in the deep, or
 * when something is in the water near the boat (a shark, a leviathan, the
 * lionfish). Scrambling aboard is his warning that something is near. Once
 * it has been safe a little while he slips back in. Tap him to pet him. The
 * game says what counts as deep and as something in the water, feeds him from
 * the hold, and saves how many fish he has had.
 */

import { clamp } from '../core/math';
import { OTTER_FEEDS } from '../state/save';
import { DOCK, IY } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

/** Where he floats while wild: open water just north of the home dock. */
export const OTTER_HOME = { x: DOCK.x - 20, y: IY - 250 } as const;
/** Fish to make him yours (the save keeps the count), and how near the boat must be to toss him one. */
export { OTTER_FEEDS };
export const FEED_REACH = 140;
/** Where he swims beside the boat, in the hull's units: off the side nearer the viewer, ahead of the bow. */
export const OTTER_SIDE = 16;
export const OTTER_AHEAD = 30;
/** Seconds to climb aboard or slip back in; and how long it must be safe before he does. */
export const CLIMB_T = 0.45;
export const CALM_T = 3;
/** How big he is drawn, in the water and on the deck: bigger than life, so a small player finds him. */
export const OTTER_SIZE = 1.6;
export const OTTER_DECK_SIZE = 1.25;
/** Under this speed the boat is stopped, and he floats on his back beside it. */
export const IDLE_SPEED = 20;

export type OtterState = 'wild' | 'swim' | 'climb' | 'aboard' | 'hop';
/** Why he is aboard: the deep, or something in the water. */
export type OtterReason = 'deep' | 'danger';

export class Otter implements Entity {
  state: OtterState = 'wild';
  /** Fish he has had; OTTER_FEEDS makes him yours. */
  fed = 0;
  x: number = OTTER_HOME.x;
  y: number = OTTER_HOME.y;
  h = Math.PI;
  ph = 0;
  t = 0;
  /** Seconds of hearts after a pet. */
  love = 0;
  /** Why the game would have him aboard now, or null when the water is safe; it says, each frame. */
  reason: OtterReason | null = null;
  private calm = 0;
  /** He has climbed aboard, and why. */
  onClimb: ((why: OtterReason) => void) | null = null;

  /** He is yours. */
  get free(): boolean {
    return this.fed >= OTTER_FEEDS;
  }

  /** On the deck, or getting there, so the game draws him at his seat. */
  get aboard(): boolean {
    return this.state === 'aboard' || this.state === 'climb';
  }

  /** Back as he was when the game starts over, or from a save. */
  set(fed: number): void {
    this.fed = clamp(Math.floor(fed), 0, OTTER_FEEDS);
    this.state = this.free ? 'swim' : 'wild';
    this.x = OTTER_HOME.x;
    this.y = OTTER_HOME.y;
    this.t = 0;
    this.calm = 0;
  }

  /** A fish tossed to him while he is wild. Returns whether that made him yours. */
  feed(): boolean {
    if (this.free) return false;
    this.fed++;
    this.love = 1.6;
    if (!this.free) return false;
    this.state = 'swim';
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
      // A slow lazy circle on his back where he lives.
      this.x = OTTER_HOME.x + Math.cos(this.ph * 0.15) * 14;
      this.y = OTTER_HOME.y + Math.sin(this.ph * 0.15) * 9;
      this.h = this.ph * 0.15 + Math.PI / 2;
      return;
    }
    const why = this.reason;
    this.calm = why ? 0 : this.calm + dt;
    if (this.state === 'climb') {
      if (this.t >= CLIMB_T) this.state = 'aboard';
      return;
    }
    if (this.state === 'aboard') {
      if (!why && this.calm >= CALM_T) {
        this.state = 'hop';
        this.t = 0;
        this.place(w, true, dt);
      }
      return;
    }
    if (why) {
      this.state = 'climb';
      this.t = 0;
      this.onClimb?.(why);
      return;
    }
    if (this.state === 'hop' && this.t >= CLIMB_T) this.state = 'swim';
    this.place(w, false, dt);
  }

  /** In the water beside the boat: over at once if far behind, else keeping up. */
  private place(w: World, snap: boolean, dt: number): void {
    const b = w.boat;
    const k = w.hullScale;
    const c = Math.cos(b.h);
    const s = Math.sin(b.h);
    // The side nearer the viewer, as the naga; ahead of the bow, clear of him and of the net.
    const side = c - s >= 0 ? 1 : -1;
    const tx = b.x + c * OTTER_AHEAD * k - s * OTTER_SIDE * k * side;
    const ty = b.y + s * OTTER_AHEAD * k + c * OTTER_SIDE * k * side;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (snap || d > 200) {
      this.x = tx;
      this.y = ty;
    } else if (d > 0.5) {
      const sp = Math.min(d * 6, Math.abs(b.v) * 1.3 + 90);
      const st = Math.min(d, sp * dt);
      this.x += (dx / d) * st;
      this.y += (dy / d) * st;
    }
    if (Math.abs(b.v) > IDLE_SPEED) this.h = b.v > 0 ? b.h : b.h + Math.PI;
  }

  /** Under the water just now, between breaths, as he swims along. */
  under(v: number): boolean {
    return this.state === 'swim' && Math.abs(v) > IDLE_SPEED && Math.sin(this.ph * 1.7) > 0.72;
  }

  draw(_v: DrawView, _layer: Layer): void {}

  /** In the water, wild or swimming: on his back when still, swimming along when the boat moves. */
  drawWater(v: DrawView, boatV: number): void {
    if (this.aboard) return;
    const sx = v.px(this.x, this.y);
    const sy = v.py(this.x, this.y, 0);
    const still = this.state === 'wild' || Math.abs(boatV) <= IDLE_SPEED;
    ripple(v, sx, sy, this.ph);
    if (this.state === 'hop') {
      // A splash as he slips back in.
      const k = clamp(this.t / CLIMB_T, 0, 1);
      v.ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
      v.ctx.lineWidth = 1.4 * v.zoom;
      v.ctx.beginPath();
      v.ctx.ellipse(sx, sy, (6 + k * 12) * v.zoom, (3 + k * 6) * v.zoom, 0, 0, Math.PI * 2);
      v.ctx.stroke();
    }
    if (this.under(boatV)) return;
    if (still) drawOtterBack(v, sx, sy, this.h, this.ph);
    else drawOtterSwim(v, sx, sy, this.h, this.ph);
    this.drawLove(v, sx, sy - 12 * v.zoom);
  }

  /** Where he sits on a boat of this hull scale: on the cabin roof, at its front edge. */
  seat(b: { x: number; y: number; h: number }, k: number): { x: number; y: number; z: number } {
    const c = Math.cos(b.h);
    const s = Math.sin(b.h);
    return { x: b.x + c * 5 * k + s * 3 * k, y: b.y + s * 5 * k - c * 3 * k, z: 26 * k };
  }

  /** On the deck, sitting up; climbing, coming up over the side. */
  drawAboard(v: DrawView, b: { x: number; y: number; h: number }, k: number): void {
    if (!this.aboard) return;
    const p = this.seat(b, k);
    const up = this.state === 'climb' ? clamp(this.t / CLIMB_T, 0, 1) : 1;
    const sx = v.px(p.x, p.y);
    const sy = v.py(p.x, p.y, p.z * up);
    drawOtterSit(v, sx, sy, b.h, this.ph, this.reason === 'danger');
    this.drawLove(v, sx, sy - 16 * v.zoom);
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

const FUR = '#6B4A2E';
const DARK = '#4A321F';
const FACE = '#D9C4A0';

function ripple(v: DrawView, sx: number, sy: number, ph: number): void {
  const { ctx } = v;
  const Z = v.zoom * OTTER_SIZE;
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 1.1 * Z;
  ctx.beginPath();
  ctx.ellipse(
    sx,
    sy,
    (11 + Math.sin(ph * 3) * 1.5) * Z,
    (5 + Math.sin(ph * 3) * 0.7) * Z,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
}

/** Face, as seen from the front or the side: a cream face, two dark eyes, a dark nose and whiskers. */
function face(
  v: DrawView,
  x: number,
  y: number,
  r: number,
  dir: number,
  sleepy: boolean,
  Z: number,
): void {
  const { ctx } = v;
  ctx.fillStyle = FACE;
  ctx.beginPath();
  ctx.arc(x, y, r * Z, 0, Math.PI * 2);
  ctx.fill();
  // Little round ears.
  ctx.fillStyle = DARK;
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + e * r * 0.75 * Z, y - r * 0.7 * Z, r * 0.3 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1E1610';
  ctx.strokeStyle = '#1E1610';
  ctx.lineWidth = 0.7 * Z;
  for (const e of [-1, 1]) {
    const ex = x + (e * 0.38 + dir * 0.12) * r * Z;
    const ey = y - 0.15 * r * Z;
    if (sleepy) {
      ctx.beginPath();
      ctx.arc(ex, ey, 0.22 * r * Z, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(ex, ey, 0.17 * r * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.ellipse(
    x + dir * 0.12 * r * Z,
    y + 0.25 * r * Z,
    0.2 * r * Z,
    0.14 * r * Z,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = 0.5 * Z;
  for (const e of [-1, 1])
    for (const w of [-0.15, 0.1]) {
      ctx.beginPath();
      ctx.moveTo(x + e * 0.3 * r * Z, y + (0.32 + w) * r * Z);
      ctx.lineTo(x + e * 1.15 * r * Z, y + (0.28 + w * 2) * r * Z);
      ctx.stroke();
    }
}

/** On his back in the water: tummy up, a shell on it in his paws, feet and tail poking up. */
export function drawOtterBack(v: DrawView, sx: number, sy: number, h: number, ph: number): void {
  const { ctx } = v;
  const Z = v.zoom * OTTER_SIZE;
  const bob = Math.sin(ph * 2) * 0.8 * Z;
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  ctx.save();
  // Body, lying along the water.
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 2 * Z + bob, 11 * Z, 4.2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8A6644';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 3.2 * Z + bob, 7 * Z, 2.6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // Feet and tail up at one end.
  ctx.fillStyle = DARK;
  for (const f of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx - dir * 10 * Z, sy - (4 + f) * Z + bob, 2 * Z, 1.4 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(sx - dir * 13 * Z, sy - 1.5 * Z + bob, 3.6 * Z, 1.2 * Z, -dir * 0.3, 0, Math.PI * 2);
  ctx.fill();
  // The shell on his tummy, held in his paws.
  ctx.fillStyle = '#F2A7B8';
  ctx.beginPath();
  ctx.arc(sx + dir * 1 * Z, sy - 5 * Z + bob, 2.2 * Z, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = DARK;
  for (const p of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx + dir * 1 * Z + p * 2.4 * Z, sy - 5 * Z + bob, 1.1 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  face(v, sx + dir * 10 * Z, sy - 5 * Z + bob, 3.8, dir, true, Z);
  ctx.restore();
}

/** Swimming along, tummy down: his head up and his back above the water, a little wake behind. */
export function drawOtterSwim(v: DrawView, sx: number, sy: number, h: number, ph: number): void {
  const { ctx } = v;
  const Z = v.zoom * OTTER_SIZE;
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  const bob = Math.sin(ph * 6) * 0.8 * Z;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 1 * Z;
  ctx.beginPath();
  ctx.moveTo(sx + dir * 4 * Z, sy);
  ctx.lineTo(sx - dir * 14 * Z, sy - 3 * Z);
  ctx.moveTo(sx + dir * 4 * Z, sy);
  ctx.lineTo(sx - dir * 14 * Z, sy + 3 * Z);
  ctx.stroke();
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.ellipse(sx - dir * 3 * Z, sy - 1.5 * Z + bob, 7 * Z, 2.6 * Z, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  face(v, sx + dir * 5 * Z, sy - 4 * Z + bob, 3.6, dir, false, Z);
  ctx.restore();
}

/** Sitting up on the deck, paws together; on his toes and wide-eyed when something is in the water. */
export function drawOtterSit(
  v: DrawView,
  sx: number,
  sy: number,
  h: number,
  ph: number,
  alarm: boolean,
): void {
  const { ctx } = v;
  const Z = v.zoom * OTTER_DECK_SIZE;
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  const lift = alarm ? 2 * Z : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 6 * Z, 2.4 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tail curled round.
  ctx.fillStyle = DARK;
  ctx.beginPath();
  ctx.ellipse(sx - dir * 6 * Z, sy - 1 * Z, 4 * Z, 1.6 * Z, dir * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 7 * Z - lift, 5 * Z, 7.5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8A6644';
  ctx.beginPath();
  ctx.ellipse(sx + dir * 0.8 * Z, sy - 6 * Z - lift, 3 * Z, 5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = DARK;
  for (const p of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx + p * 1.6 * Z + dir * Z, sy - 9 * Z - lift, 1.1 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  face(
    v,
    sx + dir * 0.6 * Z,
    sy - 15 * Z - lift + Math.sin(ph * 1.3) * 0.3 * Z,
    3.8,
    dir,
    false,
    Z,
  );
  if (alarm) {
    ctx.fillStyle = '#FFE38A';
    ctx.font = `bold ${9 * Z}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('!', sx, sy - 24 * Z);
  }
  ctx.restore();
}

/** Near where he lives, off the home island: close enough to toss him a fish, by default. */
export function nearOtterHome(x: number, y: number, r = FEED_REACH): boolean {
  return Math.hypot(x - OTTER_HOME.x, y - OTTER_HOME.y) <= r;
}
