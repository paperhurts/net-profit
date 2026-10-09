/**
 * The Skeleton Shark King, the kid's island 5 boss, "like Jaws on the NES": a
 * great shark of bare bones with a crown on his skull and a trident, who rules
 * the reef of bones. Sail within NOTICE of the reef and his fin comes up, the
 * music goes dun-dun, and he comes for the boat. He fights two ways, each with
 * its warning:
 *
 * The charge. His fin stalks round the boat, then stops; the water churns round
 * him and a line shows on the water from him to where the boat will be, turning
 * as it is turning now (CHARGE_UP): then he bursts along that line. He swims
 * faster than any boat, so the counter is to change course off the line, not to
 * run. Charge or miss, he breaches at the end of it, clean out of the water in a
 * leap: that is when the harpoon reaches him.
 *
 * The trident. He surfaces a way off and raises it (the harpoon reaches him
 * then too), and a ring on the water shows where the boat will be, the same
 * way; it lands a moment later. Steer out of the ring.
 *
 * A bite costs the boat a lot of its health and the trident some; the game does
 * the damage and, at none, the eating. Harpoon him down from KING_RESOLVE and
 * he rolls over at the surface and dies, dramatically, as the game tells it.
 * Sail away from the reef, or be eaten, and he sinks back to his reef, whole.
 * Past half beaten he is angry: shorter warnings and less time between.
 */

import { angDiff, clamp } from '../core/math';
import { DEEP, FAR, WS } from '../world/island';
import { ISLE5 } from '../world/isle5';
import type { DrawView, Entity, Layer, World } from './entity';

/** A boat this close to the reef wakes him; this far off it, he gives up. */
export const NOTICE = 700;
export const LEASH = 1400;
/** Harpoon hits to beat him. */
export const KING_RESOLVE = 6;
/** He stalks the boat at about this distance, this fast, for this long between attacks. */
export const STALK_R = 280;
export const STALK_SPEED = 450;
/** He charges only from this close. */
export const CHARGE_FROM = 450;
export const STALK_T = 2.2;
export const STALK_ANGRY = 1.3;
/** The charge: its warning, its speed, and how long it lasts at most. */
export const CHARGE_UP = 0.9;
export const CHARGE_UP_ANGRY = 0.7;
export const CHARGE_SPEED = 600;
export const CHARGE_T = 0.9;
/** He bites a boat this close to his snout, plus the hull. */
export const BITE_R = 34;
/** The leap at the end of a charge, and the dive after. */
export const LEAP_T = 1.4;
export const DIVE_T = 0.6;
/** The trident: raised this long (the warning, the ring shows for the last AIM of it), then in the air this long. */
export const RAISE_T = 1.1;
export const AIM = 0.5;
export const TRIDENT_FLIGHT = 0.7;
/** It lands on a boat this close to the ring's middle, plus the hull. */
export const TRIDENT_HIT = 30;
/** He throws from at least this far, and no further than this. */
export const THROW_NEAR = 220;
export const THROW_FAR = 420;
/** What each costs the boat, of its 100. */
export const BITE = 35;
export const TRIDENT = 20;
/** Seconds of his rising, and of his dying. */
export const RISE_T = 1;
export const DIE_T = 12;
/** His length, head to tail. */
export const KING_LEN = 190;

export type KingState =
  | 'wait'
  | 'rise'
  | 'stalk'
  | 'aim'
  | 'charge'
  | 'leap'
  | 'dive'
  | 'raise'
  | 'throw'
  | 'dying'
  | 'dead';

export class SharkKing implements Entity {
  state: KingState = 'wait';
  x: number = ISLE5.x + ISLE5.r + 120;
  y: number = ISLE5.y;
  h = Math.PI / 2;
  v = 0;
  t = 0;
  resolve = KING_RESOLVE;
  /** How far up out of the water, 0 under to 1 clear of it. */
  up = 0;
  /** Of a hit's flash. */
  flash = 0;
  /** Where the charge is going; where the trident will land, once aimed; the trident in flight. */
  to: { x: number; y: number } | null = null;
  aim: { x: number; y: number } | null = null;
  trident: { x: number; y: number; z: number } | null = null;
  private from = { x: 0, y: 0 };
  /** How fast the boat is turning, smoothed, to see where it is going. */
  private turn = 0;
  private lastH: number | null = null;
  private side = 1;
  private bit = false;
  private next: 'charge' | 'trident' = 'charge';
  /** He has risen: the fight is on. */
  onRise: (() => void) | null = null;
  /** He bit the boat; the trident hit it. The game does the damage. */
  onBite: (() => void) | null = null;
  onTrident: (() => void) | null = null;
  /** A warning starts: the charge winds up, or the trident goes up. For the dun-dun. */
  onWarn: ((what: 'charge' | 'trident') => void) | null = null;
  /** The trident hit the water, wherever it landed. */
  onSplash: ((x: number, y: number) => void) | null = null;
  /** He is beaten: the dying begins. */
  onBeaten: (() => void) | null = null;
  /** He has died. */
  onDead: (() => void) | null = null;

  /** In the fight. */
  get fighting(): boolean {
    return this.state !== 'wait' && this.state !== 'dying' && this.state !== 'dead';
  }

  get angry(): boolean {
    return this.resolve <= KING_RESOLVE / 2;
  }

  /** Back down under his reef, whole, as when the boat sails off or is eaten. */
  reset(): void {
    if (this.state === 'dead' || this.state === 'dying') return;
    this.state = 'wait';
    this.t = 0;
    this.up = 0;
    this.v = 0;
    this.resolve = KING_RESOLVE;
    this.to = null;
    this.aim = null;
    this.trident = null;
    this.next = 'charge';
  }

  /** Dead for good, as a save remembers. */
  dead(): void {
    this.state = 'dead';
    this.to = null;
    this.aim = null;
    this.trident = null;
  }

  /** Where a harpoon would strike him: only while he is out of the water, leaping or raising the trident. */
  mark(): { x: number; y: number } | null {
    return (this.state === 'leap' || this.state === 'raise') && this.up > 0.4 ? this : null;
  }

  /** A harpoon struck him. Returns whether that beat him. */
  harpoon(power: number): boolean {
    if (!this.mark()) return false;
    this.resolve = Math.max(0, this.resolve - power);
    this.flash = 1;
    if (this.resolve > 0) return false;
    this.state = 'dying';
    this.t = 0;
    this.to = null;
    this.aim = null;
    this.trident = null;
    this.onBeaten?.();
    return true;
  }

  update(dt: number, w: World): void {
    const b = w.boat;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 4);
    if (this.state === 'dead') return;
    if (this.state === 'dying') {
      // Rolled over at the surface, drifting, then sinking.
      this.up += ((this.t < DIE_T - 2 ? 0.5 : 0) - this.up) * Math.min(1, dt * 1.5);
      if (this.t >= DIE_T) {
        this.state = 'dead';
        this.onDead?.();
      }
      return;
    }
    if (this.lastH !== null && dt > 0)
      this.turn += (clamp(angDiff(b.h, this.lastH) / dt, -3, 3) - this.turn) * Math.min(1, dt * 6);
    this.lastH = b.h;
    const fromReef = Math.hypot(b.x - ISLE5.x, b.y - ISLE5.y);
    if (this.state === 'wait') {
      this.up += (0 - this.up) * Math.min(1, dt * 2);
      // Round and round the reef, deep down.
      const a = Math.atan2(this.y - ISLE5.y, this.x - ISLE5.x) + dt * 0.25;
      this.x = ISLE5.x + Math.cos(a) * (ISLE5.r + 120);
      this.y = ISLE5.y + Math.sin(a) * (ISLE5.r + 120);
      this.h = a + Math.PI / 2;
      if (w.started && fromReef < NOTICE) {
        this.state = 'rise';
        this.t = 0;
        this.onRise?.();
      }
      return;
    }
    if (fromReef > LEASH) {
      this.reset();
      return;
    }
    const dx = b.x - this.x;
    const dy = b.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const hull = 24 * w.hullScale;
    switch (this.state) {
      case 'rise':
        this.up = Math.min(0.3, this.t / RISE_T);
        if (this.t >= RISE_T) this.go('stalk');
        break;
      case 'stalk': {
        // Round the boat at STALK_R, closing or opening to it, his fin cutting the water.
        this.up += (0.3 - this.up) * Math.min(1, dt * 3);
        // Further out when the trident is next, to throw from.
        const sr = this.next === 'trident' ? (THROW_NEAR + THROW_FAR) / 2 : STALK_R;
        const a = Math.atan2(this.y - b.y, this.x - b.x) + this.side * 0.6;
        const tx = b.x + Math.cos(a) * sr;
        const ty = b.y + Math.sin(a) * sr;
        this.swim(tx, ty, STALK_SPEED, 3, dt);
        const stalkT = this.angry ? STALK_ANGRY : STALK_T;
        if (this.t >= stalkT && this.next === 'trident') {
          // Into throwing range first; if the boat will not let him, he charges instead.
          if (d > THROW_NEAR && d < THROW_FAR) {
            this.next = 'charge';
            this.go('raise');
            this.onWarn?.('trident');
          } else if (this.t > stalkT + 2.5) this.next = 'charge';
        } else if (this.t >= stalkT) {
          if (d < CHARGE_FROM) {
            this.next = 'trident';
            this.go('aim');
            // The line is set now: to where the boat will be when he gets there, as it is turning.
            const up = this.angry ? CHARGE_UP_ANGRY : CHARGE_UP;
            let p = this.ahead(b, up);
            for (let i = 0; i < 2; i++)
              p = this.ahead(b, up + Math.hypot(p.x - this.x, p.y - this.y) / CHARGE_SPEED);
            const l = Math.hypot(p.x - this.x, p.y - this.y) || 1;
            this.to = { x: p.x + ((p.x - this.x) / l) * 60, y: p.y + ((p.y - this.y) / l) * 60 };
            this.onWarn?.('charge');
          }
        }
        break;
      }
      case 'aim': {
        // Stopped, turned along his line, the water churning.
        this.v *= Math.max(0, 1 - dt * 4);
        const to = this.to ?? { x: b.x, y: b.y };
        this.h += clamp(angDiff(Math.atan2(to.y - this.y, to.x - this.x), this.h), -5 * dt, 5 * dt);
        if (this.t >= (this.angry ? CHARGE_UP_ANGRY : CHARGE_UP)) {
          this.h = Math.atan2(to.y - this.y, to.x - this.x);
          this.bit = false;
          this.go('charge');
        }
        break;
      }
      case 'charge': {
        const to = this.to ?? { x: b.x, y: b.y };
        const tx = to.x - this.x;
        const ty = to.y - this.y;
        const td = Math.hypot(tx, ty);
        const st = Math.min(td, CHARGE_SPEED * dt);
        if (td > 1) {
          this.x += (tx / td) * st;
          this.y += (ty / td) * st;
        }
        this.v = CHARGE_SPEED;
        this.up += (0.35 - this.up) * Math.min(1, dt * 6);
        const sx = this.x + Math.cos(this.h) * KING_LEN * 0.45;
        const sy = this.y + Math.sin(this.h) * KING_LEN * 0.45;
        if (!this.bit && Math.hypot(b.x - sx, b.y - sy) < BITE_R + hull) {
          this.bit = true;
          this.onBite?.();
        }
        if (td < 4 || this.t >= CHARGE_T + 0.4) {
          this.to = null;
          this.go('leap');
        }
        break;
      }
      case 'leap': {
        // Clear of the water in an arc, carried on along the charge.
        const k = this.t / LEAP_T;
        this.up = 0.4 + Math.sin(Math.PI * Math.min(1, k)) * 0.6;
        this.x += Math.cos(this.h) * 90 * dt;
        this.y += Math.sin(this.h) * 90 * dt;
        if (this.t >= LEAP_T) this.go('dive');
        break;
      }
      case 'dive':
        this.up += (0.3 - this.up) * Math.min(1, dt * 5);
        this.x += Math.cos(this.h) * 120 * dt;
        this.y += Math.sin(this.h) * 120 * dt;
        if (this.t >= DIVE_T) {
          this.side = -this.side;
          this.go('stalk');
        }
        break;
      case 'raise': {
        // Up out of the water, facing the boat, the trident going up.
        this.h = Math.atan2(dy, dx);
        this.v *= Math.max(0, 1 - dt * 4);
        this.up = Math.min(0.9, 0.3 + this.t * 1.5);
        if (!this.aim && this.t >= RAISE_T - AIM) this.aim = this.ahead(b, AIM + TRIDENT_FLIGHT);
        if (this.t >= RAISE_T) {
          this.from = { x: this.x, y: this.y };
          this.go('throw');
        }
        break;
      }
      case 'throw': {
        const a = this.aim ?? { x: b.x, y: b.y };
        const k = Math.min(1, this.t / TRIDENT_FLIGHT);
        this.trident = {
          x: this.from.x + (a.x - this.from.x) * k,
          y: this.from.y + (a.y - this.from.y) * k,
          z: 70 * (1 - k) + Math.sin(Math.PI * k) * 60,
        };
        this.up += (0.3 - this.up) * Math.min(1, dt * 3);
        if (this.t >= TRIDENT_FLIGHT) {
          if (Math.hypot(b.x - a.x, b.y - a.y) < TRIDENT_HIT + hull) this.onTrident?.();
          this.onSplash?.(a.x, a.y);
          this.trident = null;
          this.aim = null;
          this.go('stalk');
        }
        break;
      }
    }
    this.keepOff();
  }

  /** Where the boat will be in t seconds if it keeps going as it is, turning as it is turning now. */
  private ahead(
    b: { x: number; y: number; h: number; v: number },
    t: number,
  ): { x: number; y: number } {
    let x = b.x;
    let y = b.y;
    let h = b.h;
    const n = 12;
    const st = t / n;
    for (let i = 0; i < n; i++) {
      h += this.turn * st;
      x += Math.cos(h) * b.v * st;
      y += Math.sin(h) * b.v * st;
    }
    return { x, y };
  }

  private go(s: KingState): void {
    this.state = s;
    this.t = 0;
  }

  private swim(tx: number, ty: number, speed: number, rate: number, dt: number): void {
    const want = Math.atan2(ty - this.y, tx - this.x);
    this.h += clamp(angDiff(want, this.h), -rate * dt, rate * dt);
    this.v += (speed - this.v) * Math.min(1, dt * 2);
    this.x += Math.cos(this.h) * this.v * dt;
    this.y += Math.sin(this.h) * this.v * dt;
  }

  /** Never on the reef, never past the far deep's end. */
  private keepOff(): void {
    const r = Math.hypot(this.x - ISLE5.x, this.y - ISLE5.y) || 1;
    const min = ISLE5.r + 40;
    if (r < min) {
      this.x = ISLE5.x + ((this.x - ISLE5.x) / r) * min;
      this.y = ISLE5.y + ((this.y - ISLE5.y) / r) * min;
    }
    const lo = 40 - DEEP - FAR;
    const hi = WS + DEEP + FAR - 40;
    this.x = clamp(this.x, lo, hi);
    this.y = clamp(this.y, lo, hi);
  }

  /** The ring where the trident will land and the churn of a charge, on the water; the fin or the whole of him, and the trident, above it. */
  draw(v: DrawView, layer: Layer): void {
    if (this.state === 'wait' && this.up < 0.02) return;
    if (this.state === 'dead') return;
    if (!v.onScreen(this.x, this.y, 300 * v.zoom)) return;
    if (layer === 'surface') this.drawWater(v);
    else if (layer === 'air') this.drawAir(v);
  }

  private drawWater(v: DrawView): void {
    const { ctx } = v;
    const Z = v.zoom;
    const T = v.T;
    // The churn while he winds up a charge, and the line he will charge along.
    if (this.state === 'aim' && this.to) {
      const { px, py } = v;
      ctx.strokeStyle = 'rgba(255,120,90,.8)';
      ctx.lineWidth = 3 * Z;
      ctx.setLineDash?.([8 * Z, 6 * Z]);
      ctx.beginPath();
      ctx.moveTo(px(this.x, this.y), py(this.x, this.y));
      ctx.lineTo(px(this.to.x, this.to.y), py(this.to.x, this.to.y));
      ctx.stroke();
      ctx.setLineDash?.([]);
    }
    if (this.state === 'aim') {
      for (let k = 0; k < 3; k++) {
        const t = (T * 2.5 + k / 3) % 1;
        v.isoEllipse(this.x, this.y, 20 + t * 40);
        ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - t)})`;
        ctx.lineWidth = 2 * Z;
        ctx.stroke();
      }
    }
    // The wake behind his fin.
    if (this.state === 'stalk' || this.state === 'charge' || this.state === 'rise') {
      const len = this.state === 'charge' ? 90 : 50;
      for (const side of [-1, 1]) {
        const bx = this.x - Math.cos(this.h + side * 0.35) * len;
        const by = this.y - Math.sin(this.h + side * 0.35) * len;
        ctx.strokeStyle = 'rgba(255,255,255,.4)';
        ctx.lineWidth = 2.2 * Z;
        ctx.beginPath();
        ctx.moveTo(v.px(this.x, this.y), v.py(this.x, this.y));
        ctx.lineTo(v.px(bx, by), v.py(bx, by));
        ctx.stroke();
      }
    }
    // Where the trident will land.
    const a = this.aim;
    if (a && (this.state === 'raise' || this.state === 'throw')) {
      const k = this.state === 'throw' ? Math.min(1, this.t / TRIDENT_FLIGHT) : 0;
      v.isoEllipse(a.x, a.y, TRIDENT_HIT + 10);
      ctx.fillStyle = `rgba(240,197,68,${0.15 + 0.2 * k})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,215,90,.95)';
      ctx.lineWidth = 2.6 * Z;
      ctx.stroke();
      v.isoEllipse(a.x, a.y, (TRIDENT_HIT + 10) * (1.8 - 0.8 * k));
      ctx.strokeStyle = 'rgba(255,215,90,.45)';
      ctx.lineWidth = 1.4 * Z;
      ctx.stroke();
    }
    // A splash ring where he breaks the water.
    if (this.state === 'leap' || this.state === 'raise' || this.state === 'dying') {
      v.isoEllipse(this.x, this.y, 36 + Math.sin(T * 4) * 4);
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 2 * Z;
      ctx.stroke();
    }
  }

  private drawAir(v: DrawView): void {
    const s = this.state;
    if (
      s === 'stalk' ||
      s === 'rise' ||
      s === 'aim' ||
      s === 'charge' ||
      s === 'dive' ||
      s === 'wait'
    )
      drawKingFin(v, this.x, this.y, this.h, Math.min(1, this.up / 0.3), this.angry);
    else if (s === 'leap') {
      const k = Math.min(1, this.t / LEAP_T);
      drawKingBones(
        v,
        this.x,
        this.y,
        this.up * 70,
        this.h,
        (0.5 - k) * 1.4,
        false,
        this.flash,
        this.angry,
      );
    } else if (s === 'raise' || s === 'throw')
      drawKingBones(
        v,
        this.x,
        this.y,
        this.up * 40,
        this.h,
        1.1,
        s === 'raise',
        this.flash,
        this.angry,
      );
    else if (s === 'dying')
      drawKingBones(v, this.x, this.y, this.up * 10, this.h, 0, false, 0, false, true, this.t);
    if (this.trident) {
      const { px, py } = v;
      drawTrident(
        v,
        px(this.trident.x, this.trident.y),
        py(this.trident.x, this.trident.y, this.trident.z),
        0.6,
      );
    }
  }
}

const BONE = '#EDE6D3';
const BONE_DARK = '#B9AF97';
const GOLD = '#F0C544';

/** His fin, cutting the water: tall and bony, with a gold band where the crown would be. */
export function drawKingFin(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  up: number,
  angry: boolean,
): void {
  if (up <= 0.02) return;
  const { ctx, px, py } = v;
  // A big fin: he is bigger than the boat.
  const Z = v.zoom * up * 1.8;
  const sx = px(x, y);
  const sy = py(x, y);
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  ctx.fillStyle = BONE;
  ctx.beginPath();
  ctx.moveTo(sx - 14 * Z * dir, sy);
  ctx.quadraticCurveTo(sx - 4 * Z * dir, sy - 22 * Z, sx + 10 * Z * dir, sy - 34 * Z);
  ctx.lineTo(sx + 12 * Z * dir, sy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = BONE_DARK;
  ctx.lineWidth = 1.4 * Z;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(sx + (-8 + i * 5) * Z * dir, sy);
    ctx.lineTo(sx + (2 + i * 2.5) * Z * dir, sy - (16 + i * 5) * Z);
    ctx.stroke();
  }
  ctx.strokeStyle = angry ? '#E4572E' : GOLD;
  ctx.lineWidth = 2.4 * Z;
  ctx.beginPath();
  ctx.moveTo(sx - 6 * Z * dir, sy - 10 * Z);
  ctx.lineTo(sx + 9 * Z * dir, sy - 12 * Z);
  ctx.stroke();
}

/** His trident: a gold staff with three barbed prongs, at a screen point, a size of him. */
export function drawTrident(v: DrawView, x: number, y: number, size: number): void {
  const { ctx } = v;
  const Z = v.zoom * size;
  ctx.strokeStyle = GOLD;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3 * Z;
  ctx.beginPath();
  ctx.moveTo(x, y + 40 * Z);
  ctx.lineTo(x, y - 14 * Z);
  ctx.moveTo(x - 12 * Z, y - 14 * Z);
  ctx.lineTo(x + 12 * Z, y - 14 * Z);
  for (const px of [-12, 0, 12]) {
    ctx.moveTo(x + px * Z, y - 14 * Z);
    ctx.lineTo(x + px * Z, y - 32 * Z);
  }
  ctx.stroke();
  ctx.fillStyle = GOLD;
  for (const px of [-12, 0, 12]) {
    ctx.beginPath();
    ctx.moveTo(x + (px - 3) * Z, y - 28 * Z);
    ctx.lineTo(x + px * Z, y - 36 * Z);
    ctx.lineTo(x + (px + 3) * Z, y - 28 * Z);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * The whole of him, out of the water: a spine of round vertebrae from tail to skull, ribs down from it,
 * the forked tail, the long skull with its teeth and crown, and a fin with the trident in it. z is how
 * high his middle is; pitch tips his nose up. Dying, he lies rolled over and still, his eyes going out.
 */
export function drawKingBones(
  v: DrawView,
  x: number,
  y: number,
  z: number,
  h: number,
  pitch: number,
  raising: boolean,
  flash: number,
  angry: boolean,
  dying = false,
  t = 0,
): void {
  const { ctx, px, py } = v;
  // Drawn big: he is half again the boat's length.
  const Z = v.zoom * 1.7;
  const c = Math.cos(h);
  const s = Math.sin(h);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  // A point along him, from -1 at the tail to 1 at the nose.
  const at = (k: number, dz = 0): [number, number] => {
    const l = (k * KING_LEN) / 2;
    const wx = x + c * l * cp;
    const wy = y + s * l * cp;
    return [px(wx, wy), py(wx, wy, Math.max(-6, z + l * sp + dz))];
  };
  const bone = flash > 0 ? '#FFFFFF' : BONE;
  ctx.lineCap = 'round';
  // The tail, forked.
  const [tx, ty] = at(-1);
  const [t2x, t2y] = at(-0.85);
  ctx.strokeStyle = bone;
  ctx.lineWidth = 3 * Z;
  ctx.beginPath();
  ctx.moveTo(t2x, t2y);
  ctx.lineTo(tx, ty - 18 * Z);
  ctx.moveTo(t2x, t2y);
  ctx.lineTo(tx, ty + 12 * Z);
  ctx.stroke();
  // Ribs, down from the spine (up, rolled over and dying).
  ctx.strokeStyle = BONE_DARK;
  ctx.lineWidth = 2 * Z;
  for (let i = 0; i < 9; i++) {
    const k = -0.55 + i * 0.12;
    const [rx, ry] = at(k);
    const len = (14 - Math.abs(k + 0.05) * 10) * Z;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.quadraticCurveTo(
      rx + 4 * Z,
      ry + (dying ? -len * 0.6 : len * 0.6),
      rx + 1 * Z,
      ry + (dying ? -len : len),
    );
    ctx.stroke();
  }
  // The spine.
  ctx.fillStyle = bone;
  for (let i = 0; i <= 16; i++) {
    const [vx, vy] = at(-0.85 + i * 0.09);
    ctx.beginPath();
    ctx.arc(vx, vy, (2.6 + (i > 8 ? 1 : 0)) * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // The dorsal fin's bones, on top (underneath, dying).
  const [fx, fy] = at(0.05);
  ctx.strokeStyle = bone;
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(fx - 6 * Z, fy);
  ctx.lineTo(fx + 4 * Z, fy + (dying ? 22 : -22) * Z);
  ctx.lineTo(fx + 8 * Z, fy);
  ctx.stroke();
  // The skull: long, with a jaw of teeth, and a crown.
  const [hx, hy] = at(0.82);
  const dir = (c - s) * cp >= 0 ? 1 : -1;
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.ellipse(hx, hy, 15 * Z, 9 * Z, -sp * 0.6 * dir, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFBEF';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(hx + (-8 + i * 4) * Z * dir, hy + 4 * Z);
    ctx.lineTo(hx + (-6 + i * 4) * Z * dir, hy + 9 * Z);
    ctx.lineTo(hx + (-4 + i * 4) * Z * dir, hy + 4 * Z);
    ctx.fill();
  }
  // His eye: red when angry, going out as he dies.
  const eye = dying ? Math.max(0, 1 - (t - 8) / 1.5) : 1;
  ctx.fillStyle = `rgba(${angry ? '255,70,40' : '120,230,255'},${eye})`;
  ctx.beginPath();
  ctx.arc(hx + 4 * Z * dir, hy - 2 * Z, 2.4 * Z, 0, Math.PI * 2);
  ctx.fill();
  if (dying && t > 9.5) {
    // X for an eye.
    ctx.strokeStyle = '#2B2A26';
    ctx.lineWidth = 1.6 * Z;
    const ex = hx + 4 * Z * dir;
    const ey = hy - 2 * Z;
    ctx.beginPath();
    ctx.moveTo(ex - 3 * Z, ey - 3 * Z);
    ctx.lineTo(ex + 3 * Z, ey + 3 * Z);
    ctx.moveTo(ex + 3 * Z, ey - 3 * Z);
    ctx.lineTo(ex - 3 * Z, ey + 3 * Z);
    ctx.stroke();
  }
  // The crown on top of the skull.
  const cy = hy + (dying ? 10 : -8) * Z;
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(hx - 8 * Z, cy);
  ctx.lineTo(hx - 8 * Z, cy - 7 * Z);
  ctx.lineTo(hx - 4 * Z, cy - 3 * Z);
  ctx.lineTo(hx, cy - 9 * Z);
  ctx.lineTo(hx + 4 * Z, cy - 3 * Z);
  ctx.lineTo(hx + 8 * Z, cy - 7 * Z);
  ctx.lineTo(hx + 8 * Z, cy);
  ctx.closePath();
  ctx.fill();
  // A pectoral fin, holding the trident high while he raises it, or across him.
  const [px0, py0] = at(0.5);
  if (raising) {
    ctx.strokeStyle = bone;
    ctx.lineWidth = 2.6 * Z;
    ctx.beginPath();
    ctx.moveTo(px0, py0);
    ctx.lineTo(px0 + 10 * Z * dir, py0 - 26 * Z);
    ctx.stroke();
    drawTrident(v, px0 + 10 * Z * dir, py0 - 40 * Z, 0.8);
  } else if (!dying) drawTrident(v, px0 - 6 * Z * dir, py0 + 4 * Z, 0.55);
}
