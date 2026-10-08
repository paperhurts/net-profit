/**
 * The two Cthulhu leaves behind when it crumbles, the kid's: a healer cat and
 * a little Cthulhu warrior. Both come along as the warlock does: aboard they
 * ride on the boat (the cat on the cabin roof, the warrior at the stern);
 * ashore they follow the figure everywhere, every island and every room,
 * popping over if left far behind. Each has five hit points; hurt to none, one
 * is worn out and rests aboard until the next landing, mending as it goes. In a
 * fight they go for whatever is near the figure and hit it up close: the
 * warrior for 2, the cat with a swipe for 1. And the cat heals: twice a fight,
 * a moment after the figure loses a heart, it gives one back. Fed a fish from
 * the hold (tap it on the boat, at sea, with fish aboard) it has another heal,
 * up to five, kept for the fights to come. Tap it otherwise to pet it. The game finds what they fight, as for the
 * warlock, and says what hurts them.
 */

import type { DrawView, Entity, Layer, World } from './entity';
import { walkable, walkStep } from './walker';

export type PalKind = 'cat' | 'warrior';

export const PAL_HP = 5;
export const PAL_SPEED = 100;
/** How close each keeps behind the figure, and how far off it pops over. */
export const PAL_HEEL: Readonly<Record<PalKind, number>> = { cat: 24, warrior: 30 };
export const PAL_BLINK = 200;
/** Something this close to the figure is fought; each hits from this close, this often, this hard. */
export const FIGHT_FROM = 130;
export const REACH: Readonly<Record<PalKind, number>> = { cat: 20, warrior: 26 };
export const SWING_EVERY: Readonly<Record<PalKind, number>> = { cat: 1.1, warrior: 1.4 };
export const POWER: Readonly<Record<PalKind, number>> = { cat: 1, warrior: 2 };
/** Blinking this long after a hit; worn out, resting this long. */
export const PAL_INVULN = 1;
export const PAL_REST = 40;
/** The cat's heals: this many each fight, up to this many with fish, given this long after a heart is lost. */
export const HEALS = 2;
export const MAX_HEALS = 5;
export const HEAL_DELAY = 1.2;

export type PalTarget = { x: number; y: number; hit(power: number): void };

export class Pal implements Entity {
  /** Freed from the temple: it is yours. */
  free = false;
  state: 'away' | 'with' | 'resting' = 'away';
  x = 0;
  y = 0;
  h = Math.PI / 4;
  ph = 0;
  gait = 0;
  hp = PAL_HP;
  invuln = 0;
  /** Seconds since its last swing began, for the swing's look. */
  swingT = 9;
  /** The cat's heals left this fight, and the one it is about to give. */
  heals = HEALS;
  private healT = -1;
  /** Seconds of hearts over it after a pet. */
  love = 0;
  private rest = 0;
  private swingCd = 0;
  private hadFigure = false;
  private readonly trail: { x: number; y: number }[] = [];
  /** What it can fight, nearest, within reach of a point; the game knows. */
  findTarget: ((x: number, y: number, range: number) => PalTarget | null) | null = null;
  /** It swung at something. */
  onSwing: (() => void) | null = null;
  /** It was hurt; out says it is worn out. */
  onHurt: ((out: boolean) => void) | null = null;
  /** The cat gives the figure a heart back. */
  onHeal: (() => void) | null = null;

  constructor(readonly kind: PalKind) {}

  /** Beside the figure, ashore. */
  get shown(): boolean {
    return this.state === 'with';
  }

  /** Out of the temple at a point, as Cthulhu crumbles: free, and beside the figure. */
  come(x: number, y: number): void {
    this.free = true;
    this.state = 'with';
    this.hp = PAL_HP;
    this.x = x;
    this.y = y;
    this.trail.length = 0;
    this.hadFigure = true;
  }

  /** A hit on it. Returns whether it hurt. */
  hurt(): boolean {
    if (this.state !== 'with' || this.invuln > 0) return false;
    this.hp--;
    this.invuln = PAL_INVULN;
    if (this.hp <= 0) {
      this.state = 'resting';
      this.rest = PAL_REST;
      this.onHurt?.(true);
    } else this.onHurt?.(false);
    return true;
  }

  /** A fight has begun: the cat has at least its two heals again. */
  newFight(): void {
    this.heals = Math.max(this.heals, HEALS);
  }

  /** The figure has lost a heart: the cat will give one back, if it has a heal and is with it. */
  noticeHurt(): void {
    if (this.kind !== 'cat' || this.state !== 'with' || this.heals <= 0 || this.healT >= 0) return;
    this.healT = HEAL_DELAY;
  }

  /** Fed a fish: another heal, up to the most it holds. Returns whether it would eat. */
  feed(): boolean {
    if (this.kind !== 'cat' || this.heals >= MAX_HEALS) return false;
    this.heals++;
    this.love = 1.6;
    return true;
  }

  /** A pat. */
  pet(): void {
    this.love = 1.6;
  }

  private arrive(f: { x: number; y: number }): void {
    this.x = f.x;
    this.y = f.y;
    const off = this.kind === 'cat' ? [16, 12] : [-16, 14];
    for (const [dx, dy] of [
      off,
      [-(off[0] as number), off[1] as number],
      [0, 18],
      [18, 0],
    ] as const) {
      if (walkable(f.x + (dx as number), f.y + (dy as number), 99)) {
        this.x = f.x + (dx as number);
        this.y = f.y + (dy as number);
        break;
      }
    }
    this.trail.length = 0;
  }

  update(dt: number, w: World): void {
    this.invuln = Math.max(0, this.invuln - dt);
    this.love = Math.max(0, this.love - dt);
    this.swingT += dt;
    if (this.healT >= 0) {
      this.healT -= dt;
      if (this.healT < 0 && this.heals > 0 && this.state === 'with') {
        this.heals--;
        this.onHeal?.();
      }
    }
    if (!this.free) return;
    const f = w.figure;
    const landed = !!f && !this.hadFigure;
    this.hadFigure = !!f;
    if (this.state === 'resting') {
      this.rest -= dt;
      if (landed) this.rest = 0;
      if (this.rest > 0) return;
      this.state = 'away';
      this.hp = PAL_HP;
    }
    if (!f) {
      if (this.state === 'with') this.state = 'away';
      this.hp = PAL_HP;
      return;
    }
    if (this.state === 'away' || Math.hypot(f.x - this.x, f.y - this.y) > PAL_BLINK) {
      this.state = 'with';
      this.arrive(f);
      return;
    }
    this.gait = Math.max(0, this.gait - dt * 4);
    // Something to fight, near the figure?
    const foe = this.findTarget?.(f.x, f.y, FIGHT_FROM) ?? null;
    this.swingCd -= dt;
    if (foe) {
      const dx = foe.x - this.x;
      const dy = foe.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.h = Math.atan2(dy, dx);
      if (d > REACH[this.kind]) this.step(dx / d, dy / d, PAL_SPEED, dt);
      else if (this.swingCd <= 0) {
        this.swingCd = SWING_EVERY[this.kind];
        this.swingT = 0;
        foe.hit(POWER[this.kind]);
        this.onSwing?.();
      }
      this.trail.length = 0;
      return;
    }
    // Otherwise at the figure's heel, along the way it walked.
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(f.x - last.x, f.y - last.y) >= 5) {
      this.trail.push({ x: f.x, y: f.y });
      if (this.trail.length > 80) this.trail.shift();
    }
    const d = Math.hypot(f.x - this.x, f.y - this.y);
    if (d > PAL_HEEL[this.kind]) {
      while (this.trail.length > 1) {
        const c = this.trail[0] as { x: number; y: number };
        if (Math.hypot(c.x - this.x, c.y - this.y) >= 4) break;
        this.trail.shift();
      }
      const t = this.trail[0] ?? f;
      const dx = t.x - this.x;
      const dy = t.y - this.y;
      const dl = Math.hypot(dx, dy);
      if (dl > 0.5)
        this.step(dx / dl, dy / dl, Math.min(PAL_SPEED, 30 + (d - PAL_HEEL[this.kind]) * 5), dt);
    } else this.h = Math.atan2(f.y - this.y, f.x - this.x);
  }

  private step(ux: number, uy: number, sp: number, dt: number): void {
    const moved = walkStep(this, ux * sp * dt, uy * sp * dt, 99);
    if (moved > 0) {
      this.h = Math.atan2(uy, ux);
      this.ph += moved * 0.3;
      this.gait = 1;
    }
  }

  draw(_v: DrawView, _layer: Layer): void {}

  /** It, at its feet, for the game's sorted solids. */
  drawBody(v: DrawView): void {
    if (this.state !== 'with') return;
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2) return;
    const sx = v.px(this.x, this.y);
    const sy = v.py(this.x, this.y, Math.abs(Math.sin(this.ph)) * 2 * this.gait);
    if (this.kind === 'cat') drawCat(v, sx, sy, this.h, this.ph, this.gait, this.swingT < 0.25, 1);
    else drawWarrior(v, sx, sy, this.h, this.ph, this.gait, this.swingT < 0.3, 1);
    this.drawOver(v, sx, sy);
  }

  /** Its hit points when hurt, and hearts when petted, over it. */
  private drawOver(v: DrawView, sx: number, sy: number): void {
    const { ctx } = v;
    const Z = v.zoom;
    const top = sy - (this.kind === 'cat' ? 20 : 30) * Z;
    if (this.hp < PAL_HP) {
      for (let i = 0; i < PAL_HP; i++) {
        ctx.fillStyle = i < this.hp ? '#3FB37A' : 'rgba(128,128,128,.4)';
        ctx.fillRect(sx + (i - PAL_HP / 2) * 5 * Z, top, 4 * Z, 3 * Z);
      }
    }
    if (this.love > 0) {
      ctx.fillStyle = `rgba(255,105,140,${Math.min(1, this.love)})`;
      for (let i = 0; i < 2; i++) {
        const hx = sx + (i ? 6 : -6) * Z;
        const hy = top - 6 * Z - (1.6 - this.love) * 14 * Z;
        ctx.beginPath();
        ctx.arc(hx - 1.5 * Z, hy, 1.8 * Z, 0, Math.PI * 2);
        ctx.arc(hx + 1.5 * Z, hy, 1.8 * Z, 0, Math.PI * 2);
        ctx.moveTo(hx - 3.2 * Z, hy + 0.4 * Z);
        ctx.lineTo(hx, hy + 3.6 * Z);
        ctx.lineTo(hx + 3.2 * Z, hy + 0.4 * Z);
        ctx.fill();
      }
    }
  }

  /** Where it rides on a boat of this hull scale: the cat on the cabin roof, the warrior at the stern. */
  seat(b: { x: number; y: number; h: number }, k: number): { x: number; y: number; z: number } {
    const c = Math.cos(b.h);
    const s = Math.sin(b.h);
    return this.kind === 'cat'
      ? { x: b.x - c * 4 * k, y: b.y - s * 4 * k, z: 26 * k }
      : { x: b.x - c * 22 * k - s * 5 * k, y: b.y - s * 22 * k + c * 5 * k, z: 9 * k + 1 };
  }

  /** Riding along on a boat of this hull scale while the figure is aboard. */
  drawAboard(v: DrawView, b: { x: number; y: number; h: number }, k: number): void {
    if (!this.free || this.state === 'with') return;
    if (this.kind === 'cat') {
      // On the cabin roof, curled up.
      const p = this.seat(b, k);
      const sx = v.px(p.x, p.y);
      const sy = v.py(p.x, p.y, p.z);
      drawCat(v, sx, sy, b.h, 0, 0, false, 0.8);
      this.drawOver(v, sx, sy);
    } else {
      const p = this.seat(b, k);
      drawWarrior(v, v.px(p.x, p.y), v.py(p.x, p.y, p.z), b.h, 0, 0, false, 0.8);
    }
  }
}

/** The healer cat: white, with a pink nose, a swishing tail and a red cross on its collar. */
export function drawCat(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  ph: number,
  gait: number,
  swipe: boolean,
  size: number,
): void {
  const { ctx, T } = v;
  const Z = v.zoom * size;
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  const step = Math.sin(ph * 2) * 1.5 * gait;
  // Tail, curling up behind.
  ctx.strokeStyle = '#F2EEE6';
  ctx.lineWidth = 2.4 * Z;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 6 * Z * dir, y - 5 * Z);
  ctx.quadraticCurveTo(
    x - 12 * Z * dir,
    y - 8 * Z,
    x - 10 * Z * dir,
    y - 15 * Z + Math.sin(T * 3) * 2 * Z,
  );
  ctx.stroke();
  // Legs.
  ctx.strokeStyle = '#E3DDD2';
  ctx.lineWidth = 1.8 * Z;
  for (const lx of [-4, 3]) {
    ctx.beginPath();
    ctx.moveTo(x + lx * Z * dir, y - 4 * Z);
    ctx.lineTo(x + (lx + step) * Z * dir, y);
    ctx.stroke();
  }
  // Body and head.
  ctx.fillStyle = '#F7F4EE';
  ctx.beginPath();
  ctx.ellipse(x, y - 6 * Z, 7 * Z, 4.2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  const hx = x + 6 * Z * dir;
  const hy = y - 10 * Z;
  ctx.beginPath();
  ctx.arc(hx, hy, 4 * Z, 0, Math.PI * 2);
  ctx.fill();
  // Ears.
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + (e * 3.4 - 0.4) * Z, hy - 2 * Z);
    ctx.lineTo(hx + e * 2.6 * Z, hy - 6.4 * Z);
    ctx.lineTo(hx + e * 0.6 * Z, hy - 3.4 * Z);
    ctx.closePath();
    ctx.fill();
  }
  // Eyes, nose, and the red cross on its collar.
  ctx.fillStyle = '#3A6E52';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(hx + (e * 1.5 + dir) * Z, hy - 0.4 * Z, 0.8 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#F08AA0';
  ctx.beginPath();
  ctx.arc(hx + 2 * Z * dir, hy + 1.2 * Z, 0.7 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E4572E';
  ctx.fillRect(hx - 1.6 * Z * dir - 1.6 * Z, hy + 3 * Z, 3.2 * Z, 1.2 * Z);
  ctx.fillRect(hx - 1.6 * Z * dir - 0.6 * Z, hy + 2 * Z, 1.2 * Z, 3.2 * Z);
  if (swipe) {
    // A swipe: three quick claw lines out in front.
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 1.2 * Z;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + 5 * Z * dir, hy - 3 * Z + i * 2.5 * Z);
      ctx.lineTo(hx + 11 * Z * dir, hy - 5 * Z + i * 2.5 * Z);
      ctx.stroke();
    }
  }
}

/** The Cthulhu warrior: small, an octopus for a head with a beard of tentacles, a sword and a round shield. */
export function drawWarrior(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  ph: number,
  gait: number,
  swing: boolean,
  size: number,
): void {
  const { ctx, T } = v;
  const Z = v.zoom * size;
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  const step = Math.sin(ph) * 2.5 * gait;
  ctx.lineCap = 'round';
  // Legs.
  ctx.strokeStyle = '#2C4C3F';
  ctx.lineWidth = 2.6 * Z;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + s * 2 * Z, y - 8 * Z);
    ctx.lineTo(x + (s * 2 + step * s) * Z, y);
    ctx.stroke();
  }
  // Body, armoured.
  ctx.fillStyle = '#6A4E8C';
  ctx.beginPath();
  ctx.ellipse(x, y - 13 * Z, 5 * Z, 6.5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // Shield on the far arm.
  ctx.fillStyle = '#8E7AB0';
  ctx.beginPath();
  ctx.arc(x - 5 * Z * dir, y - 13 * Z, 4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#C9B8E8';
  ctx.lineWidth = 1 * Z;
  ctx.stroke();
  // Sword in the near hand, up and swinging down when it strikes.
  const a = swing ? -0.2 : -1.1;
  const hx = x + 5 * Z * dir;
  const hy = y - 13 * Z;
  ctx.strokeStyle = '#D9DEE3';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx + Math.cos(a) * 13 * Z * dir, hy + Math.sin(a) * 13 * Z);
  ctx.stroke();
  // The octopus head and its beard.
  const gx = x;
  const gy = y - 24 * Z;
  ctx.fillStyle = '#4E8A6E';
  ctx.beginPath();
  ctx.ellipse(gx, gy, 5.5 * Z, 6.5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3E6B57';
  ctx.lineWidth = 1.4 * Z;
  for (let i = 0; i < 4; i++) {
    const bx = gx + (-3 + i * 2) * Z;
    ctx.beginPath();
    ctx.moveTo(bx, gy + 4 * Z);
    ctx.quadraticCurveTo(bx + Math.sin(T * 3 + i) * 1.5 * Z, gy + 7 * Z, bx, gy + 10 * Z);
    ctx.stroke();
  }
  ctx.fillStyle = '#B8FF7A';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(gx + (e * 2 + dir) * Z, gy - 0.5 * Z, 1 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}
