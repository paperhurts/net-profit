/**
 * The Heron, the kid's, from his drawing: the leviathan sorcerer's boss, a great
 * grey heron on long black legs, with scalloped wings held up behind him, a tuft
 * on his head and a long sharp beak, an alien gun at his chest and a staff of
 * illusion with a pink gem. Round one is on island 8's tower roof. He stalks the
 * roof on his long legs, keeping his distance; his alien gun draws a thin pink
 * line to where the figure stands, a moment, then a zap down it, so the counter
 * is to step off the line. Every so often he raises the staff: a flash, and
 * there are three of him, and he has swapped places with one. The copies stalk
 * as he does but never fire, so the one that shoots is the real one; a spear
 * pops a copy in a puff of pink, and only the real one can be hurt. Hurt to half
 * he is angry: two zaps at a time, and three copies. Beaten here he does not
 * fall: he screeches and flies off to his nest on island 9, and the game calls
 * it round one. Round two is in that nest, tougher, and while the orb of power
 * is lit he is shielded: a spear, or a helper's blow, glances off him and his
 * copies alike, until the necromancer chained to the orb is beaten. The game
 * does the hearts, the prize, the shield and the way on as callbacks.
 */

import { clamp } from '../core/math';
import type { Solid } from '../render/layers';
import type { DrawView, Entity, Layer, World } from './entity';

export const HERON_HP = 14;
/** Round two, in his nest on island 9. */
export const HERON9_HP = 18;
/** How fast he stalks, and how far from the figure he likes to stand. */
export const STALK = 46;
export const KEEP = 95;
/** The alien gun: the aiming line shows this long, then the zap; how often, how long the zap reaches, and how near its line hurts. */
export const AIM_T = 0.8;
export const ZAP_EVERY = 2.6;
export const ANGRY_ZAP = 2;
export const ZAP_LEN = 300;
export const ZAP_HIT = 10;
/** Seconds from waking to his first aim: long enough to read the toast that warns of it. */
export const FIRST_ZAP = 3.2;
/** Angry, the second zap of a pair follows this soon. */
export const DOUBLE_T = 0.5;
/** The staff of illusion: how often, how many copies, how long they last, and how long a cast takes. */
export const ILLUSION_EVERY = 11;
export const COPIES = 2;
export const ANGRY_COPIES = 3;
export const COPY_T = 9;
export const CAST_T = 0.7;
/** Seconds he takes to fly off once beaten. */
export const FLEE_T = 2.4;
/** How big he is, against the figure. */
export const HERON_SIZE = 1.6;

export type HeronState = 'wait' | 'stalk' | 'aim' | 'cast' | 'flee' | 'gone';
/** A copy, from the staff: where it stands, which way it faces, how long it has left, and its pop. */
export type HeronCopy = { x: number; y: number; h: number; ph: number; t: number; pop: number };
export type Zap = { x0: number; y0: number; x1: number; y1: number; t: number };

type Home = { x: number; y: number; r: number };

/** How far a point is from a line segment. */
export function segDist(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l2 = dx * dx + dy * dy || 1;
  const k = clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1);
  return Math.hypot(px - (x0 + dx * k), py - (y0 + dy * k));
}

export class Heron implements Entity {
  state: HeronState = 'wait';
  hp: number;
  x: number;
  y: number;
  h = Math.PI / 4;
  ph = 0;
  t = 0;
  flash = 0;
  /** Where the gun is aimed while the line shows. */
  aim: { x: number; y: number } | null = null;
  readonly zaps: Zap[] = [];
  readonly copies: HeronCopy[] = [];
  private zapCd = FIRST_ZAP;
  private illusionCd = 5;
  private shots = 0;
  private stunT = 0;
  /** The orb of power's shield is on him: nothing hurts him or pops a copy. The game says, each frame. */
  shielded = false;
  /** He has seen the figure arrive. */
  onWake: (() => void) | null = null;
  /** A zap has hit the figure. */
  onHit: ((by: 'ray') => void) | null = null;
  /** He fired; he cast; a copy popped. For sound. */
  onZap: (() => void) | null = null;
  onCast: (() => void) | null = null;
  onPop: ((x: number, y: number) => void) | null = null;
  /** He was hurt. */
  onHurt: (() => void) | null = null;
  /** A spear or a blow glanced off his shield, here. */
  onBlock: ((x: number, y: number) => void) | null = null;
  /** Beaten: he is flying off. The game is told at once, so leaving mid-flight keeps the win. */
  onBeaten: (() => void) | null = null;

  constructor(
    readonly home: Home,
    readonly hp0 = HERON_HP,
  ) {
    this.hp = hp0;
    this.x = home.x - home.r * 0.3;
    this.y = home.y - home.r * 0.3;
  }

  /** In the fight, to be speared. */
  get up(): boolean {
    return this.state === 'stalk' || this.state === 'aim' || this.state === 'cast';
  }

  get angry(): boolean {
    return this.hp <= this.hp0 / 2;
  }

  reset(): void {
    this.state = 'wait';
    this.hp = this.hp0;
    this.x = this.home.x - this.home.r * 0.3;
    this.y = this.home.y - this.home.r * 0.3;
    this.h = Math.PI / 4;
    this.t = 0;
    this.flash = 0;
    this.aim = null;
    this.zaps.length = 0;
    this.copies.length = 0;
    this.zapCd = FIRST_ZAP;
    this.illusionCd = 5;
    this.shots = 0;
    this.stunT = 0;
  }

  /** Gone from here already, as when he has flown to island 9 before. */
  away(): void {
    this.reset();
    this.state = 'gone';
  }

  /** What a spear can be thrown at: him, and every copy still standing. */
  targets(): ({ x: number; y: number } & object)[] {
    if (!this.up) return [];
    return [this, ...this.copies.filter((c) => c.pop <= 0)];
  }

  /** A spear lands on him, or on a copy. */
  spear(target: { x: number; y: number }, power: number): void {
    if (this.shielded && this.up) {
      this.onBlock?.(target.x, target.y);
      return;
    }
    if (target === this) {
      this.hit(power);
      return;
    }
    const c = this.copies.find((q) => q === target);
    if (c && c.pop <= 0) {
      c.pop = 0.4;
      this.onPop?.(c.x, c.y);
    }
  }

  hit(power: number): void {
    if (!this.up) return;
    if (this.shielded) {
      this.onBlock?.(this.x, this.y);
      return;
    }
    this.hp = Math.max(0, this.hp - power);
    this.flash = 0.2;
    this.onHurt?.();
    if (this.hp > 0) return;
    // Beaten: the copies vanish, and he takes off.
    for (const c of this.copies) c.pop = Math.max(c.pop, 0.4);
    this.aim = null;
    this.state = 'flee';
    this.t = 0;
    this.onBeaten?.();
  }

  /** Tar on his feet: he stands and does nothing, this long. */
  stun(s: number): void {
    if (this.up) this.stunT = Math.max(this.stunT, s);
  }

  /** The gun's muzzle, a little in front of him at his chest. */
  muzzle(): [number, number] {
    return [this.x + Math.cos(this.h) * 14, this.y + Math.sin(this.h) * 14];
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    const R = this.home;
    this.t += dt;
    this.ph += dt;
    this.flash = Math.max(0, this.flash - dt);
    for (const z of this.zaps) z.t += dt;
    while (this.zaps.length && (this.zaps[0]?.t ?? 0) > 0.3) this.zaps.shift();
    for (let i = this.copies.length - 1; i >= 0; i--) {
      const c = this.copies[i] as HeronCopy;
      c.ph += dt;
      if (c.pop > 0) {
        c.pop -= dt;
        if (c.pop <= 0) this.copies.splice(i, 1);
        continue;
      }
      c.t -= dt;
      if (c.t <= 0) c.pop = 0.4;
    }
    const onRoof = f !== null && Math.hypot(f.x - R.x, f.y - R.y) < R.r + 40;
    if (this.state === 'wait') {
      if (onRoof) {
        this.state = 'stalk';
        this.t = 0;
        this.onWake?.();
      }
      return;
    }
    if (this.state === 'flee') {
      if (this.t >= FLEE_T) this.state = 'gone';
      return;
    }
    if (this.state === 'gone') return;
    if (!onRoof || !f) {
      // The figure has gone: he waits for it to come back.
      this.reset();
      return;
    }
    this.stunT = Math.max(0, this.stunT - dt);
    if (this.stunT > 0) return;
    this.h = Math.atan2(f.y - this.y, f.x - this.x);
    // Stalk: keep his distance, him and every copy, each from its own side.
    this.stalk(this, f, 0, dt);
    for (const [i, c] of this.copies.entries())
      if (c.pop <= 0) {
        this.stalk(c, f, ((i + 1) * Math.PI * 2) / (this.copies.length + 1), dt);
        c.h = Math.atan2(f.y - c.y, f.x - c.x);
      }
    if (this.state === 'stalk') {
      this.zapCd -= dt;
      this.illusionCd -= dt;
      if (this.illusionCd <= 0 && this.copies.length === 0) {
        this.state = 'cast';
        this.t = 0;
        this.onCast?.();
      } else if (this.zapCd <= 0) {
        this.state = 'aim';
        this.t = 0;
        this.aim = { x: f.x, y: f.y };
        this.shots = this.angry ? 1 : 0;
      }
    } else if (this.state === 'aim') {
      if (this.t >= (this.shots < 0 ? DOUBLE_T : AIM_T)) this.fire(f);
    } else if (this.state === 'cast' && this.t >= CAST_T) this.illusion();
  }

  private stalk(
    s: { x: number; y: number },
    f: { x: number; y: number },
    turn: number,
    dt: number,
  ): void {
    const R = this.home;
    const a = Math.atan2(s.y - f.y, s.x - f.x) + turn * 0.02;
    let tx = f.x + Math.cos(a) * KEEP;
    let ty = f.y + Math.sin(a) * KEEP;
    // Inside the roof's edge.
    const d = Math.hypot(tx - R.x, ty - R.y);
    const lim = R.r - 24;
    if (d > lim) {
      tx = R.x + ((tx - R.x) / d) * lim;
      ty = R.y + ((ty - R.y) / d) * lim;
    }
    const dx = tx - s.x;
    const dy = ty - s.y;
    const dl = Math.hypot(dx, dy);
    if (dl > 2) {
      const step = Math.min(dl, STALK * (this.angry ? 1.3 : 1) * dt);
      s.x += (dx / dl) * step;
      s.y += (dy / dl) * step;
    }
  }

  private fire(f: { x: number; y: number }): void {
    const aim = this.aim ?? f;
    const [mx, my] = this.muzzle();
    const a = Math.atan2(aim.y - my, aim.x - mx);
    const z: Zap = {
      x0: mx,
      y0: my,
      x1: mx + Math.cos(a) * ZAP_LEN,
      y1: my + Math.sin(a) * ZAP_LEN,
      t: 0,
    };
    this.zaps.push(z);
    this.onZap?.();
    if (segDist(f.x, f.y, z.x0, z.y0, z.x1, z.y1) < ZAP_HIT) this.onHit?.('ray');
    if (this.shots > 0) {
      // Angry: another, at where the figure is now, a moment later.
      this.shots = -1;
      this.t = 0;
      this.aim = { x: f.x, y: f.y };
      return;
    }
    this.aim = null;
    this.state = 'stalk';
    this.zapCd = this.angry ? ANGRY_ZAP : ZAP_EVERY;
  }

  /** The staff's trick: copies round the roof, and he swaps places with one of them. */
  private illusion(): void {
    const R = this.home;
    const n = this.angry ? ANGRY_COPIES : COPIES;
    const spots: [number, number][] = [[this.x, this.y]];
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(this.y - R.y, this.x - R.x) + ((i + 1) * Math.PI * 2) / (n + 1);
      spots.push([R.x + Math.cos(a) * R.r * 0.55, R.y + Math.sin(a) * R.r * 0.55]);
    }
    // Which spot is his: a different one each time.
    const mine = 1 + (Math.floor(this.ph * 7) % n);
    const [mx, my] = spots[mine] as [number, number];
    for (const [i, [x, y]] of spots.entries()) {
      if (i === mine) continue;
      this.copies.push({ x, y, h: this.h, ph: this.ph + i, t: COPY_T, pop: 0 });
    }
    this.x = mx;
    this.y = my;
    this.state = 'stalk';
    this.illusionCd = ILLUSION_EVERY;
    this.zapCd = Math.max(this.zapCd, 1.2);
  }

  /** Him and his copies, for the game's depth-sorted solids in the room. */
  solids(v: DrawView): Solid[] {
    if (this.state === 'wait' || this.state === 'gone') {
      return this.state === 'wait'
        ? [
            {
              d: this.x + this.y,
              f: () => drawHeron(v, this.x, this.y, this.h, this.ph, { shield: this.shielded }),
            },
          ]
        : [];
    }
    const out: Solid[] = [];
    if (this.state === 'flee') {
      const k = this.t / FLEE_T;
      out.push({
        d: this.x + this.y,
        f: () =>
          drawHeron(v, this.x - k * 80, this.y - k * 80, Math.PI * 1.25, this.ph * 4, {
            lift: k * k * 220,
            fly: true,
          }),
      });
      return out;
    }
    out.push({
      d: this.x + this.y,
      f: () =>
        drawHeron(v, this.x, this.y, this.h, this.ph, {
          flash: this.flash > 0,
          aiming: this.state === 'aim',
          cast: this.state === 'cast' ? this.t / CAST_T : 0,
          shield: this.shielded,
        }),
    });
    for (const c of this.copies)
      out.push({
        d: c.x + c.y,
        f: () =>
          drawHeron(v, c.x, c.y, c.h, c.ph, {
            copy: true,
            pop: c.pop > 0 ? 1 - c.pop / 0.4 : 0,
            shield: this.shielded,
          }),
      });
    return out;
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'air' || !v.onScreen(this.home.x, this.home.y, 400)) return;
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    const s = HERON_SIZE;
    // The aiming line: thin, flickering pink, brighter as the zap comes.
    if (this.state === 'aim' && this.aim) {
      const [mx, my] = this.muzzle();
      const a = Math.atan2(this.aim.y - my, this.aim.x - mx);
      const k = clamp(this.t / (this.shots < 0 ? DOUBLE_T : AIM_T), 0, 1);
      ctx.strokeStyle = `rgba(255,120,220,${0.25 + 0.6 * k * (0.7 + 0.3 * Math.sin(T * 40))})`;
      ctx.lineWidth = (1 + k) * Z;
      ctx.setLineDash([6 * Z, 5 * Z]);
      ctx.beginPath();
      ctx.moveTo(px(mx, my), py(mx, my, 30 * s));
      ctx.lineTo(
        px(mx + Math.cos(a) * ZAP_LEN, my + Math.sin(a) * ZAP_LEN),
        py(mx + Math.cos(a) * ZAP_LEN, my + Math.sin(a) * ZAP_LEN, 8),
      );
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // The zaps: a bright beam, fading.
    for (const z of this.zaps) {
      const a = 1 - z.t / 0.3;
      ctx.strokeStyle = `rgba(255,90,210,${0.5 * a})`;
      ctx.lineWidth = 9 * Z;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px(z.x0, z.y0), py(z.x0, z.y0, 30 * s));
      ctx.lineTo(px(z.x1, z.y1), py(z.x1, z.y1, 8));
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,240,255,${a})`;
      ctx.lineWidth = 3 * Z;
      ctx.stroke();
    }
  }
}

type HeronLook = {
  flash?: boolean;
  aiming?: boolean;
  /** How far into raising the staff, 0 to 1. */
  cast?: number;
  copy?: boolean;
  /** A copy popping, 0 to 1. */
  pop?: number;
  fly?: boolean;
  lift?: number;
  /** The orb of power's shield round him: a pink bubble. */
  shield?: boolean;
};

/**
 * The Heron at a world point: long black legs, a grey body with a pale belly, scalloped wings held up behind
 * (spread and beating in flight), a long grey neck and head with a tuft, a long yellow beak, a fierce eye,
 * the alien gun at his chest and the staff of illusion with its pink gem.
 */
export function drawHeron(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  ph: number,
  o: HeronLook,
): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom * HERON_SIZE;
  const sx = px(x, y);
  const sy = py(x, y, o.lift ?? 0);
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  const X = (dx: number) => sx + dx * dir * Z;
  const Y = (dy: number) => sy + dy * Z;
  ctx.save();
  if (o.copy) {
    // A copy shimmers, just a little.
    ctx.globalAlpha = 0.86 + 0.1 * Math.sin(T * 9 + ph);
  }
  if (o.pop) {
    ctx.globalAlpha = 1 - o.pop;
    ctx.fillStyle = `rgba(255,140,230,${0.6 * (1 - o.pop)})`;
    ctx.beginPath();
    ctx.arc(sx, sy - 34 * Z, (14 + o.pop * 30) * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  const grey = o.flash ? '#FFFFFF' : '#9AA2AE';
  const dark = o.flash ? '#FFFFFF' : '#6E7682';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // His shadow on the roof.
  if (!o.lift) {
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    v.isoEllipse(x, y, 16 * HERON_SIZE);
    ctx.fill();
  }
  // Wings: held up behind, scalloped at their tops; spread wide and beating in flight.
  const beat = o.fly ? Math.sin(ph * 2.2) : 0;
  for (const side of [-1, 1]) {
    const spread = o.fly ? 1.7 : 1;
    const bx = X(-4 + side * 3);
    const by = Y(-40);
    const tipX = bx + (side * 18 - 8 * dir) * spread * Z;
    const tipY = by - (34 - beat * 14) * Z;
    ctx.fillStyle = side > 0 ? dark : grey;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tipX - side * 14 * spread * Z, tipY + 6 * Z);
    // Three rounded lobes along the top.
    for (let k = 0; k < 3; k++) {
      const lx = tipX - side * (14 - k * 7) * spread * Z;
      const ly = tipY + (k === 1 ? -4 : 0) * Z;
      ctx.quadraticCurveTo(
        lx + side * 3.5 * spread * Z,
        ly - 7 * Z,
        lx + side * 7 * spread * Z,
        ly + 2 * Z,
      );
    }
    ctx.lineTo(bx + side * 6 * Z, by + 8 * Z);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3A3F48';
    ctx.lineWidth = 0.8 * Z;
    ctx.stroke();
  }
  // Long black legs, a knee bend, and long toes.
  if (!o.fly) {
    ctx.strokeStyle = o.flash ? '#FFFFFF' : '#1E2227';
    ctx.lineWidth = 2.2 * Z;
    for (const side of [-1, 1]) {
      const step = Math.sin(ph * 3 + side) * 2;
      ctx.beginPath();
      ctx.moveTo(X(side * 3), Y(-30));
      ctx.lineTo(X(side * 3 + 3 + step), Y(-16));
      ctx.lineTo(X(side * 3 + step * 0.5), Y(0));
      ctx.stroke();
      ctx.lineWidth = 1.4 * Z;
      for (const t of [-4, 0, 5]) {
        ctx.beginPath();
        ctx.moveTo(X(side * 3 + step * 0.5), Y(0));
        ctx.lineTo(X(side * 3 + step * 0.5 + t), Y(1.2));
        ctx.stroke();
      }
      ctx.lineWidth = 2.2 * Z;
    }
  } else {
    // Trailing behind him in flight.
    ctx.strokeStyle = '#1E2227';
    ctx.lineWidth = 2 * Z;
    ctx.beginPath();
    ctx.moveTo(X(-6), Y(-32));
    ctx.lineTo(X(-26), Y(-24));
    ctx.stroke();
  }
  // Body, and a pale belly.
  ctx.fillStyle = grey;
  ctx.beginPath();
  ctx.ellipse(X(0), Y(-38), 13 * Z, 9 * Z, -0.25 * dir, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = o.flash ? '#FFFFFF' : '#D9DDE3';
  ctx.beginPath();
  ctx.ellipse(X(3), Y(-35), 8 * Z, 5 * Z, -0.25 * dir, 0, Math.PI * 2);
  ctx.fill();
  // The staff of illusion, in front, its pink gem bright as he casts.
  const cast = o.cast ?? 0;
  if (!o.fly) {
    const lift = cast * 10;
    ctx.strokeStyle = '#5A4128';
    ctx.lineWidth = 1.8 * Z;
    ctx.beginPath();
    ctx.moveTo(X(18), Y(-4 - lift));
    ctx.lineTo(X(18), Y(-64 - lift));
    ctx.stroke();
    const gx = X(18);
    const gy = Y(-68 - lift);
    if (cast > 0) {
      ctx.fillStyle = `rgba(255,140,230,${0.5 * cast})`;
      ctx.beginPath();
      ctx.arc(gx, gy, (8 + cast * 14) * Z, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#FF5FC8';
    ctx.beginPath();
    ctx.moveTo(gx, gy - 5 * Z);
    ctx.lineTo(gx + 3.4 * Z, gy);
    ctx.lineTo(gx, gy + 5 * Z);
    ctx.lineTo(gx - 3.4 * Z, gy);
    ctx.closePath();
    ctx.fill();
  }
  // The long neck, curving up to the head.
  ctx.strokeStyle = grey;
  ctx.lineWidth = 5 * Z;
  ctx.beginPath();
  ctx.moveTo(X(8), Y(-42));
  ctx.quadraticCurveTo(X(2), Y(-54), X(10), Y(-64));
  ctx.stroke();
  // Head, shaded grey, with a tuft at the back.
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(X(12), Y(-66), 6 * Z, 4.2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3A3F48';
  ctx.lineWidth = 1.2 * Z;
  for (const t of [0, 1, 2]) {
    ctx.beginPath();
    ctx.moveTo(X(8), Y(-68));
    ctx.lineTo(X(1 - t * 2), Y(-74 + t * 2));
    ctx.stroke();
  }
  // The long sharp beak.
  ctx.fillStyle = o.flash ? '#FFFFFF' : '#D9C27A';
  ctx.beginPath();
  ctx.moveTo(X(16), Y(-68));
  ctx.lineTo(X(38), Y(-65));
  ctx.lineTo(X(16), Y(-63.5));
  ctx.closePath();
  ctx.fill();
  // A fierce yellow eye.
  ctx.fillStyle = '#FFD24A';
  ctx.beginPath();
  ctx.arc(X(13), Y(-67), 1.4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#14222A';
  ctx.beginPath();
  ctx.arc(X(13.4), Y(-67), 0.7 * Z, 0, Math.PI * 2);
  ctx.fill();
  // The alien gun at his chest: angular grey-green metal with a glowing tip, raised as he aims.
  if (!o.fly) {
    const up = o.aiming ? -4 : 0;
    ctx.fillStyle = '#5E6E66';
    ctx.beginPath();
    ctx.moveTo(X(6), Y(-34 + up));
    ctx.lineTo(X(20), Y(-36 + up));
    ctx.lineTo(X(22), Y(-32 + up));
    ctx.lineTo(X(12), Y(-30 + up));
    ctx.lineTo(X(11), Y(-25 + up));
    ctx.lineTo(X(7), Y(-26 + up));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = o.aiming ? '#FF7AD8' : '#B05FA0';
    ctx.beginPath();
    ctx.arc(X(22), Y(-34 + up), (o.aiming ? 2.2 : 1.4) * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  if (o.shield) {
    // The orb's shield: a pink bubble round him, shimmering.
    const r = 46 * Z;
    const cy = sy - 40 * Z;
    ctx.fillStyle = `rgba(255,120,220,${0.12 + 0.05 * Math.sin(T * 4 + ph)})`;
    ctx.beginPath();
    ctx.ellipse(sx, cy, r * 0.8, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,160,235,${0.55 + 0.25 * Math.sin(T * 6 + ph)})`;
    ctx.lineWidth = 1.6 * v.zoom;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,255,.5)';
    ctx.beginPath();
    ctx.ellipse(sx, cy, r * 0.8, r, 0, Math.PI * 1.15, Math.PI * 1.45);
    ctx.stroke();
  }
  ctx.restore();
}
