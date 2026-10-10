/**
 * The two Cthulhu leaves behind when it crumbles, the kid's: a healer cat and
 * a little Cthulhu warrior; and the Forgotten One's bones, which get up when
 * he falls and are on your side, as the kid wrote. All come along as the
 * warlock does: aboard they ride on the boat (the cat on the cabin roof, the
 * warrior at the stern, the bones at the bow);
 * ashore they follow the figure everywhere, every island and every room,
 * popping over if left far behind. The cat and the warrior have five hit
 * points and the bones four; hurt to none, one is worn out and rests aboard
 * until the next landing, mending as it goes. In a fight they go for whatever
 * is near the figure and hit it up close: the warrior and the bones for 2, the
 * cat with a swipe for 1. The bones also raise a ghost and a skeleton to fight
 * for you (the game calls them up). And the cat heals: twice a fight,
 * a moment after the figure loses a heart, it gives one back. Fed a fish from
 * the hold (tap it on the boat, at sea, with fish aboard) it has another heal,
 * up to five, kept for the fights to come. Tap it otherwise to pet it. The game finds what they fight, as for the
 * warlock, and says what hurts them.
 *
 * And the naga, the kid's blue sea-warrior: a fish-headed fighter with a snake's tail for legs, red spines down
 * his back and a long pole with a great orange fin-blade on it, kept in a cage at island 2's monkey camp until
 * the camp is beaten. Ashore he is one of these, with the longest reach of them and five hit points; at sea he
 * does not ride the boat but swims beside it, keeping up however fast it goes, and rests there when worn out.
 */

import type { DrawView, Entity, Layer, World } from './entity';
import { walkable, walkStep } from './walker';

export type PalKind = 'cat' | 'warrior' | 'bones' | 'naga';

export const PAL_HP = 5;
export const BONES_HP = 4;
export const PAL_SPEED = 100;
/** How close each keeps behind the figure, and how far off it pops over. */
export const PAL_HEEL: Readonly<Record<PalKind, number>> = {
  cat: 24,
  warrior: 30,
  bones: 36,
  naga: 34,
};
export const PAL_BLINK = 200;
/** Something this close to the figure is fought; each hits from this close, this often, this hard. */
export const FIGHT_FROM = 130;
export const REACH: Readonly<Record<PalKind, number>> = {
  cat: 20,
  warrior: 26,
  bones: 28,
  naga: 36,
};
export const SWING_EVERY: Readonly<Record<PalKind, number>> = {
  cat: 1.1,
  warrior: 1.4,
  bones: 1.5,
  naga: 1.3,
};
export const POWER: Readonly<Record<PalKind, number>> = { cat: 1, warrior: 2, bones: 2, naga: 2 };
/**
 * Where the naga swims at sea, in the hull's units: this far off the boat's right side, this far ahead of
 * amidships, alongside the cabin and clear of the net's lines off the stern.
 */
export const SWIM_SIDE = 28;
export const SWIM_AHEAD = 6;
/** The bones raise their ghost and skeleton once a fight is on, and again this long after, if those are gone. */
export const RAISE_EVERY = 12;
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
  /** The naga is in the water beside the boat, on this side of it: 1 its right, -1 its left. */
  swimming = false;
  side = 1;
  private readonly trail: { x: number; y: number }[] = [];
  /** What it can fight, nearest, within reach of a point; the game knows. */
  findTarget: ((x: number, y: number, range: number) => PalTarget | null) | null = null;
  /** It swung at something. */
  onSwing: (() => void) | null = null;
  /** It was hurt; out says it is worn out. */
  onHurt: ((out: boolean) => void) | null = null;
  /** The cat gives the figure a heart back. */
  onHeal: (() => void) | null = null;
  /** The bones raise a ghost and a skeleton here; the game calls them up. */
  onRaise: ((x: number, y: number) => void) | null = null;
  /** Whether the bones may raise them now: the game says whether the last ones are gone. */
  canRaise: (() => boolean) | null = null;
  private raiseCd = 0;

  constructor(readonly kind: PalKind) {
    this.hp = this.maxHp;
  }

  /** Beside the figure, ashore. */
  get shown(): boolean {
    return this.state === 'with';
  }

  /** Its hit points when whole. */
  get maxHp(): number {
    return this.kind === 'bones' ? BONES_HP : PAL_HP;
  }

  /** Out of the temple at a point, as Cthulhu crumbles: free, and beside the figure. */
  come(x: number, y: number): void {
    this.free = true;
    this.state = 'with';
    this.hp = this.maxHp;
    this.x = x;
    this.y = y;
    this.trail.length = 0;
    this.hadFigure = true;
    this.swimming = false;
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

  /** Knocked flying, as by the Old One: back to the boat to rest, without a word. */
  knockOut(): void {
    if (this.state !== 'with') return;
    this.state = 'resting';
    this.rest = PAL_REST;
    this.hp = 0;
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
    const off =
      this.kind === 'cat'
        ? [16, 12]
        : this.kind === 'warrior'
          ? [-16, 14]
          : this.kind === 'naga'
            ? [-14, -18]
            : [14, -16];
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
    this.raiseCd = Math.max(0, this.raiseCd - dt);
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
      if (this.rest > 0) {
        this.swim(dt, w);
        return;
      }
      this.state = 'away';
      this.hp = this.maxHp;
    }
    if (!f) {
      if (this.state === 'with') this.state = 'away';
      this.hp = this.maxHp;
      this.swim(dt, w);
      return;
    }
    if (this.state === 'away' || Math.hypot(f.x - this.x, f.y - this.y) > PAL_BLINK) {
      this.state = 'with';
      this.swimming = false;
      this.arrive(f);
      return;
    }
    this.gait = Math.max(0, this.gait - dt * 4);
    // Something to fight, near the figure?
    const foe = this.findTarget?.(f.x, f.y, FIGHT_FROM) ?? null;
    this.swingCd -= dt;
    if (foe) {
      if (this.kind === 'bones' && this.raiseCd <= 0 && (this.canRaise?.() ?? true)) {
        this.raiseCd = RAISE_EVERY;
        this.onRaise?.(this.x, this.y);
      }
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

  /**
   * The naga at sea: beside the boat on the side nearer the viewer, so the hull never hides him, ducking
   * under to the other side once a turn has clearly put him behind it; keeping up; over at once if far behind.
   */
  private swim(dt: number, w: World): void {
    if (this.kind !== 'naga') return;
    const b = w.boat;
    const k = w.hullScale;
    const c = Math.cos(b.h);
    const s = Math.sin(b.h);
    // The boat's right side faces the viewer when it points down the screen's +x+y.
    const near = c - s;
    if (near > 0.35) this.side = 1;
    else if (near < -0.35) this.side = -1;
    const tx = b.x + c * SWIM_AHEAD * k - s * SWIM_SIDE * k * this.side;
    const ty = b.y + s * SWIM_AHEAD * k + c * SWIM_SIDE * k * this.side;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (!this.swimming || d > PAL_BLINK) {
      this.swimming = true;
      this.x = tx;
      this.y = ty;
      this.h = b.h;
      return;
    }
    // As fast as the boat and more, so he keeps his place beside it rather than trailing into the net.
    const sp = Math.min(d * 8, Math.abs(b.v) * 1.3 + 120);
    if (d > 0.5) {
      this.x += (dx / d) * sp * dt;
      this.y += (dy / d) * sp * dt;
    }
    if (Math.abs(b.v) > 12) this.h = b.v > 0 ? b.h : b.h + Math.PI;
    this.ph += dt * (2.5 + Math.abs(b.v) / 30);
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
    else if (this.kind === 'warrior')
      drawWarrior(v, sx, sy, this.h, this.ph, this.gait, this.swingT < 0.3, 1);
    else if (this.kind === 'naga')
      drawNaga(v, sx, sy, this.h, this.ph, this.gait, this.swingT < 0.3, 1, false);
    else drawBones(v, sx, sy, this.h, this.ph, this.gait, this.swingT < 0.3, 1);
    this.drawOver(v, sx, sy);
  }

  /** Its hit points when hurt, and hearts when petted, over it. */
  private drawOver(v: DrawView, sx: number, sy: number): void {
    const { ctx } = v;
    const Z = v.zoom;
    const top =
      sy -
      (this.kind === 'cat' ? 20 : this.kind === 'warrior' ? 30 : this.kind === 'naga' ? 36 : 40) *
        Z;
    const max = this.maxHp;
    if (this.hp < max) {
      for (let i = 0; i < max; i++) {
        ctx.fillStyle = i < this.hp ? '#3FB37A' : 'rgba(128,128,128,.4)';
        ctx.fillRect(sx + (i - max / 2) * 5 * Z, top, 4 * Z, 3 * Z);
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

  /** Where it rides on a boat of this hull scale: the cat on the cabin roof, the warrior at the stern, the bones at the bow. */
  seat(b: { x: number; y: number; h: number }, k: number): { x: number; y: number; z: number } {
    const c = Math.cos(b.h);
    const s = Math.sin(b.h);
    if (this.kind === 'cat') return { x: b.x - c * 4 * k, y: b.y - s * 4 * k, z: 26 * k };
    if (this.kind === 'bones') return { x: b.x + c * 20 * k, y: b.y + s * 20 * k, z: 9 * k + 1 };
    return { x: b.x - c * 22 * k - s * 5 * k, y: b.y - s * 22 * k + c * 5 * k, z: 9 * k + 1 };
  }

  /** Riding along on a boat of this hull scale while the figure is aboard. */
  drawAboard(v: DrawView, b: { x: number; y: number; h: number }, k: number): void {
    if (!this.free || this.state === 'with' || this.kind === 'naga') return;
    if (this.kind === 'cat') {
      // On the cabin roof, curled up.
      const p = this.seat(b, k);
      const sx = v.px(p.x, p.y);
      const sy = v.py(p.x, p.y, p.z);
      drawCat(v, sx, sy, b.h, 0, 0, false, 0.8);
      this.drawOver(v, sx, sy);
    } else {
      const p = this.seat(b, k);
      const draw = this.kind === 'warrior' ? drawWarrior : drawBones;
      draw(v, v.px(p.x, p.y), v.py(p.x, p.y, p.z), b.h, 0, 0, false, 0.8);
    }
  }
}

/** The naga can be drawn swimming: free and not ashore with the figure. */
export function nagaSwims(p: Pal): boolean {
  return p.kind === 'naga' && p.free && p.state !== 'with' && p.swimming;
}

/** The naga in the water beside the boat: his tail under the surface, a ripple round him. */
export function drawSwimming(v: DrawView, p: Pal): void {
  if (!nagaSwims(p)) return;
  const { ctx } = v;
  const Z = v.zoom;
  const sx = v.px(p.x, p.y);
  const sy = v.py(p.x, p.y, 0);
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 1.2 * Z;
  ctx.beginPath();
  ctx.ellipse(
    sx,
    sy,
    (10 + Math.sin(v.T * 3) * 1.5) * Z,
    (5 + Math.sin(v.T * 3) * 0.7) * Z,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  drawNaga(v, sx, sy, p.h, p.ph, 1, false, 1, true);
}

/**
 * The Forgotten One's bones, on your side now: a tall skeleton with his long black hair still on the
 * skull, green where his eyes were red, and his great sword.
 */
export function drawBones(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  ph: number,
  gait: number,
  swing: boolean,
  size: number,
): void {
  const { ctx } = v;
  const Z = v.zoom * size * 1.3;
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  const step = Math.sin(ph) * 2.4 * gait;
  const bone = '#EDE8DA';
  const hy = y - 25 * Z;
  // His hair, hanging down behind the skull.
  ctx.fillStyle = '#0E0C10';
  ctx.beginPath();
  ctx.arc(x, hy - 0.4 * Z, 4.8 * Z, Math.PI, 0);
  ctx.lineTo(x + 5.4 * Z, hy + 9.5 * Z);
  for (let i = 1; i <= 4; i++) ctx.lineTo(x + (5.4 - i * 2.7) * Z, hy + (i % 2 ? 7 : 10) * Z);
  ctx.closePath();
  ctx.fill();
  // Legs, spine, hips and ribs.
  ctx.strokeStyle = bone;
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.8 * Z;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + s * 2 * Z, y - 10 * Z);
    ctx.lineTo(x + (s * 2 + step * s) * Z, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x, y - 10 * Z);
  ctx.lineTo(x, y - 21 * Z);
  ctx.stroke();
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  ctx.moveTo(x - 3 * Z, y - 10 * Z);
  ctx.lineTo(x + 3 * Z, y - 10 * Z);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(x, y - 14 * Z - i * 2.4 * Z, (4 - i * 0.4) * Z, 1.2 * Z, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  // The skull, with green eyes now.
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.arc(x, hy, 4.2 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 2.4 * Z, hy + 2.6 * Z, 4.8 * Z, 2.4 * Z);
  ctx.fillStyle = '#5BE08E';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + dir * 0.8 * Z + e * 1.6 * Z, hy - 0.2 * Z, 1.1 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // And the fringe of his hair either side of it.
  ctx.fillStyle = '#0E0C10';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + e * 0.4 * Z, hy - 4.3 * Z);
    ctx.quadraticCurveTo(x + e * 4.8 * Z, hy - 4.4 * Z, x + e * 4.4 * Z, hy + 5 * Z);
    ctx.lineTo(x + e * 3.2 * Z, hy + 1.5 * Z);
    ctx.quadraticCurveTo(x + e * 3.2 * Z, hy - 2.6 * Z, x + e * 0.4 * Z, hy - 4.3 * Z);
    ctx.fill();
  }
  // His great sword, with its cross-guard: up, then down as he strikes.
  const a = swing ? -0.2 : -1.1;
  const hx = x + 5 * Z * dir;
  const hyy = y - 16 * Z;
  ctx.strokeStyle = '#B9C2C8';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(hx, hyy);
  ctx.lineTo(hx + Math.cos(a) * 16 * Z * dir, hyy + Math.sin(a) * 16 * Z);
  ctx.stroke();
  ctx.strokeStyle = '#5A5560';
  ctx.lineWidth = 1.8 * Z;
  ctx.beginPath();
  ctx.moveTo(hx - 2.6 * Z, hyy + 0.6 * Z);
  ctx.lineTo(hx + 2.6 * Z, hyy - 0.6 * Z);
  ctx.stroke();
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

const NAGA = {
  blue: '#3A78C8',
  dark: '#24508F',
  spot: '#1B3A6B',
  pale: '#8FC4F0',
  fin: '#8A4FC9',
  spine: '#C8323C',
  orange: '#E07A2E',
  blade: '#F08A3A',
  edge: '#B5521E',
} as const;

/**
 * The naga, the kid's blue sea-warrior: a fish head with its jaws open, an orange crest with red spines, orange
 * shoulder plates, a blue body on a long spotted snake's tail that ends in a purple fin, and a long pole with a
 * great serrated orange fin-blade, held up and brought down as he strikes. In the water his tail is under the
 * surface and only his top half shows.
 */
export function drawNaga(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  ph: number,
  gait: number,
  swing: boolean,
  size: number,
  inWater: boolean,
): void {
  const { ctx, T } = v;
  const Z = v.zoom * size;
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  const X = (dx: number) => x + dx * dir * Z;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The tail: curled on the ground behind him ashore, stretched out under the surface at sea.
  const wave = (i: number) => Math.sin(ph * 2 + i * 1.3) * (inWater ? 1.6 : 1.1 * gait);
  const tail: [number, number][] = inWater
    ? [
        [0, 0],
        [-7, 1],
        [-15, 1],
        [-23, 0],
        [-30, -1],
      ]
    : [
        [0, -8],
        [-6, -1],
        [-14, 0],
        [-20, -3],
        [-22, -10],
      ];
  const pts = tail.map(([tx, ty], i): [number, number] => [X(tx), y + (ty + wave(i)) * Z]);
  ctx.globalAlpha = inWater ? 0.45 : 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i] as [number, number];
    const b = pts[i + 1] as [number, number];
    ctx.strokeStyle = NAGA.blue;
    ctx.lineWidth = (6.2 - i * 1.1) * Z;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.fillStyle = NAGA.spot;
    ctx.beginPath();
    ctx.arc((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.6 * Z, 0.8 * Z, 0, Math.PI * 2);
    ctx.fill();
    if (!inWater) {
      // Red spines along the top of the tail.
      ctx.strokeStyle = NAGA.spine;
      ctx.lineWidth = 0.8 * Z;
      ctx.beginPath();
      ctx.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - (2.6 - i * 0.4) * Z);
      ctx.lineTo((a[0] + b[0]) / 2 - dir * 1.5 * Z, (a[1] + b[1]) / 2 - (5.4 - i * 0.6) * Z);
      ctx.stroke();
    }
  }
  // The purple fin at its end.
  const end = pts[pts.length - 1] as [number, number];
  const fx = end[0];
  const fy = end[1];
  ctx.fillStyle = NAGA.fin;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx - dir * 5 * Z, fy - 4.5 * Z);
  ctx.lineTo(fx - dir * 3.5 * Z, fy);
  ctx.lineTo(fx - dir * 5 * Z, fy + 3.5 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // Above the water, or standing on his tail: he bobs a little at sea.
  const by = inWater ? y + Math.sin(T * 2.2) * 0.8 * Z - 2 * Z : y - 8 * Z;
  if (inWater) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 40 * Z, y - 70 * Z, 80 * Z, 70 * Z + 0.5);
    ctx.clip();
  }
  const Y = (dy: number) => by + dy * Z;
  // The pole, held behind him first so the far arm and the body go over it.
  const a = swing ? -0.2 : -1.2;
  const ux = Math.cos(a) * dir;
  const uy = Math.sin(a);
  const hx = X(4);
  const hy = Y(-7);
  const back = [hx - ux * 11 * Z, hy - uy * 11 * Z] as const;
  const front = [hx + ux * 19 * Z, hy + uy * 19 * Z] as const;
  ctx.strokeStyle = '#3A2E28';
  ctx.lineWidth = 1.6 * Z;
  ctx.beginPath();
  ctx.moveTo(back[0], back[1]);
  ctx.lineTo(front[0], front[1]);
  ctx.stroke();
  // A spike on its back end, and the great serrated fin-blade on the front.
  ctx.fillStyle = NAGA.blade;
  ctx.beginPath();
  ctx.moveTo(back[0] - ux * 3.5 * Z, back[1] - uy * 3.5 * Z);
  ctx.lineTo(back[0] - uy * 1.2 * Z * dir, back[1] + ux * 1.2 * Z * dir);
  ctx.lineTo(back[0] + uy * 1.2 * Z * dir, back[1] - ux * 1.2 * Z * dir);
  ctx.closePath();
  ctx.fill();
  // Across the pole, on the side away from him.
  const nx = uy * dir;
  const ny = -ux * dir;
  const side = ny > 0 ? 1 : -1;
  const at = (t: number, w: number): [number, number] => [
    front[0] + ux * t * Z + nx * side * w * Z,
    front[1] + uy * t * Z + ny * side * w * Z,
  ];
  const blade: [number, number][] = [
    at(-3, 0),
    at(10, 0),
    at(8, 3.2),
    at(6, 2.2),
    at(4, 4.6),
    at(2, 3.2),
    at(0, 5.2),
    at(-2, 3.4),
  ];
  ctx.beginPath();
  for (const [i, [bx, by]] of blade.entries()) {
    if (i) ctx.lineTo(bx, by);
    else ctx.moveTo(bx, by);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = NAGA.edge;
  ctx.lineWidth = 0.7 * Z;
  ctx.stroke();
  // The far arm, onto the pole behind his hand.
  ctx.strokeStyle = NAGA.dark;
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(X(-3), Y(-11));
  ctx.lineTo(hx - ux * 5 * Z, hy - uy * 5 * Z);
  ctx.stroke();
  // His body, its belly paler, and red spines down his back.
  ctx.fillStyle = NAGA.blue;
  ctx.beginPath();
  ctx.ellipse(x, Y(-6), 4.6 * Z, 7 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = NAGA.pale;
  ctx.beginPath();
  ctx.ellipse(X(1.6), Y(-5), 2.2 * Z, 5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = NAGA.spine;
  ctx.lineWidth = 0.8 * Z;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(X(-4), Y(-11 + i * 3));
    ctx.lineTo(X(-7.5), Y(-12.5 + i * 3));
    ctx.stroke();
  }
  // Orange shoulder plates, a red swirl on the near one.
  ctx.fillStyle = NAGA.orange;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(X(s * 4.2), Y(-11.5), 2.8 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = NAGA.spine;
  ctx.beginPath();
  ctx.arc(X(4.2), Y(-11.5), 1.2 * Z, 0, Math.PI * 2);
  ctx.fill();
  // The near arm, a grey bracer at the wrist, onto the pole.
  ctx.strokeStyle = NAGA.blue;
  ctx.lineWidth = 2.2 * Z;
  ctx.beginPath();
  ctx.moveTo(X(4.2), Y(-11));
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.strokeStyle = '#B8BEC6';
  ctx.lineWidth = 2.6 * Z;
  ctx.beginPath();
  ctx.moveTo(hx + (X(4.2) - hx) * 0.35, hy + (Y(-11) - hy) * 0.35);
  ctx.lineTo(hx + (X(4.2) - hx) * 0.15, hy + (Y(-11) - hy) * 0.15);
  ctx.stroke();
  // The orange crest behind his head, with red spines fanning back.
  ctx.fillStyle = NAGA.orange;
  ctx.beginPath();
  ctx.moveTo(X(1), Y(-21));
  ctx.lineTo(X(-6), Y(-24));
  ctx.lineTo(X(-7), Y(-16));
  ctx.lineTo(X(-1), Y(-15));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = NAGA.spine;
  ctx.lineWidth = 0.9 * Z;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(X(1.5 - i * 1.6), Y(-20.5 + i * 0.6));
    ctx.lineTo(X(-0.5 - i * 2.3), Y(-27 + i * 1.6));
    ctx.stroke();
  }
  // The fish head, its jaws open on little teeth, a yellow eye.
  ctx.fillStyle = NAGA.blue;
  ctx.beginPath();
  ctx.ellipse(X(1.5), Y(-17.5), 4.6 * Z, 4 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(X(5.5), Y(-16.5), 3 * Z, 2.3 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#16233A';
  ctx.beginPath();
  ctx.moveTo(X(8.6), Y(-16));
  ctx.lineTo(X(3.5), Y(-15.6));
  ctx.lineTo(X(8.2), Y(-14));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  for (const t of [5, 7]) {
    ctx.beginPath();
    ctx.moveTo(X(t), Y(-15.9));
    ctx.lineTo(X(t + 0.6), Y(-15.1));
    ctx.lineTo(X(t + 1.2), Y(-15.9));
    ctx.fill();
  }
  ctx.fillStyle = '#F2D04A';
  ctx.beginPath();
  ctx.arc(X(3.4), Y(-19), 1.3 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#14222A';
  ctx.beginPath();
  ctx.arc(X(3.7), Y(-19), 0.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  if (inWater) ctx.restore();
}

/** The cage at the monkey camp: bamboo bars lashed with rope under a thatch, the naga in it until he is freed. */
export function drawNagaCage(
  v: DrawView,
  x: number,
  y: number,
  r: number,
  open: number,
  nagaIn: boolean,
): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const H = 36;
  v.box(x - r, y - r, r * 2, r * 2, 0, 2, '#6B5136', '#7E6040');
  const bars = (front: boolean) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const bx = x + Math.cos(a) * r;
      const by = y + Math.sin(a) * r;
      if (Math.cos(a) + Math.sin(a) > 0 !== front) continue;
      const lift = open * (H - 6);
      ctx.strokeStyle = '#9C7A3E';
      ctx.lineWidth = 1.8 * Z;
      ctx.beginPath();
      ctx.moveTo(px(bx, by), py(bx, by, 2 + lift));
      ctx.lineTo(px(bx, by), py(bx, by, H));
      ctx.stroke();
    }
    // Rope lashings round the bars.
    ctx.strokeStyle = '#D8C38E';
    ctx.lineWidth = 1 * Z;
    for (const z of [H * 0.35, H * 0.75]) {
      if (z < 2 + open * (H - 6)) continue;
      ctx.beginPath();
      ctx.ellipse(
        px(x, y),
        py(x, y, z),
        r * Z,
        r * Z * 0.5,
        0,
        front ? 0 : Math.PI,
        front ? Math.PI : Math.PI * 2,
      );
      ctx.stroke();
    }
  };
  bars(false);
  if (nagaIn) drawNaga(v, px(x, y), py(x, y, 2), Math.PI / 4, 0, 0, false, 0.85, false);
  bars(true);
  // A thatch over it.
  ctx.fillStyle = '#B4934F';
  ctx.beginPath();
  ctx.moveTo(px(x - r - 3, y), py(x - r - 3, y, H));
  ctx.lineTo(px(x, y - r - 3), py(x, y - r - 3, H));
  ctx.lineTo(px(x + r + 3, y), py(x + r + 3, y, H));
  ctx.lineTo(px(x, y + r + 3), py(x, y + r + 3, H));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#C9A960';
  ctx.beginPath();
  ctx.moveTo(px(x - r - 3, y), py(x - r - 3, y, H));
  ctx.lineTo(px(x, y), py(x, y, H + 9));
  ctx.lineTo(px(x + r + 3, y), py(x + r + 3, y, H));
  ctx.lineTo(px(x, y + r + 3), py(x, y + r + 3, H));
  ctx.closePath();
  ctx.fill();
}
