/**
 * The kid's evil monkeys, in little skull masks, camped on the far side of
 * island 2. They mill about their huts until the figure comes near, then run at
 * it to bonk it; two of them throw coconuts instead, lobbed at where the figure
 * is going, slow enough to step out of the way. All of it is real time: they
 * are slower than the figure walks, so the way to fight is to keep moving and
 * throw the spear. Two spear hits (one with the barbed spear) and a monkey
 * drops its mask and runs off into the trees, back a minute later. Beat the
 * whole camp and its chest opens. The game keeps the hearts, the masks and the
 * coins as callbacks.
 */

import { CAMP } from '../world/isle2';
import type { DrawView, Entity, Layer, World } from './entity';
import { walkStep } from './walker';

export { CAMP };

export const MONKEYS = 5;
/** The last THROWERS of them throw coconuts rather than run in. */
export const THROWERS = 2;
/** Running speed: the figure walks at 85. */
export const MONKEY_SPEED = 60;
/** The figure this near the camp, or a monkey, sets them on it; this far from the camp and they go back. */
export const AGGRO = 150;
export const LEASH = 280;
/** A bonk reaches this far, and comes no faster than this. */
export const BONK_R = 14;
export const BONK_EVERY = 1.2;
/** Hits to beat a monkey with power 1. */
export const MONKEY_HP = 2;
/** A thrower throws from no further than this, this often, at this speed; a coconut within HIT_R of the figure hits it. */
export const THROW_RANGE = 120;
export const THROW_EVERY = 2.4;
export const COCONUT_SPEED = 150;
export const HIT_R = 12;
/** Seconds before a beaten monkey is back, and before a beaten camp fills again. */
export const RETURN = 60;
export const CLEAR_RETURN = 90;

export type MonkeyState = 'idle' | 'chase' | 'flee' | 'gone';

export type Monkey = {
  x: number;
  y: number;
  h: number;
  hp: number;
  state: MonkeyState;
  thrower: boolean;
  /** Seconds until it may bonk or throw again, of the hit flash, until it is back, and to the next idle wander. */
  cd: number;
  flash: number;
  back: number;
  rest: number;
  tx: number;
  ty: number;
  ph: number;
};

export type Coconut = { x0: number; y0: number; tx: number; ty: number; t: number; dur: number };

export class Monkeys implements Entity {
  readonly list: Monkey[] = [];
  readonly nuts: Coconut[] = [];
  /** The chest is open: the camp was beaten, and is empty until it fills again. */
  cleared = false;
  private refill = 0;
  /** The figure was bonked or hit by a coconut. */
  onBonk: ((by: 'bonk' | 'coconut') => void) | null = null;
  /** A monkey was beaten and dropped its mask. */
  onBeat: ((m: Monkey) => void) | null = null;
  /** The whole camp is beaten. */
  onClear: (() => void) | null = null;
  /** A monkey has thrown a coconut. */
  onThrow: (() => void) | null = null;
  /** A monkey has noticed the figure. */
  onSpot: (() => void) | null = null;

  constructor() {
    for (let i = 0; i < MONKEYS; i++) this.list.push(this.spawn(i));
  }

  private spawn(i: number): Monkey {
    const a = (i / MONKEYS) * Math.PI * 2;
    const x = CAMP.x + Math.cos(a) * 30;
    const y = CAMP.y + Math.sin(a) * 30;
    return {
      x,
      y,
      h: a,
      hp: MONKEY_HP,
      state: 'idle',
      thrower: i >= MONKEYS - THROWERS,
      cd: 0,
      flash: 0,
      back: 0,
      rest: i * 0.4,
      tx: x,
      ty: y,
      ph: i,
    };
  }

  /** Everyone home and masked, as when the game starts over. */
  reset(): void {
    this.list.length = 0;
    for (let i = 0; i < MONKEYS; i++) this.list.push(this.spawn(i));
    this.nuts.length = 0;
    this.cleared = false;
  }

  /** The nearest monkey still in the fight within reach of a point. */
  nearest(x: number, y: number, reach: number): Monkey | null {
    let best: Monkey | null = null;
    let bd = reach;
    for (const m of this.list) {
      if (m.state !== 'idle' && m.state !== 'chase') continue;
      const d = Math.hypot(m.x - x, m.y - y);
      if (d <= bd) {
        bd = d;
        best = m;
      }
    }
    return best;
  }

  /** A spear lands on a monkey with this power, from (fx, fy). */
  hit(m: Monkey, power: number, fx: number, fy: number): void {
    if (m.state !== 'idle' && m.state !== 'chase') return;
    m.hp -= power;
    m.flash = 0.18;
    const d = Math.hypot(m.x - fx, m.y - fy) || 1;
    walkStep(m, ((m.x - fx) / d) * 16, ((m.y - fy) / d) * 16, 5);
    if (m.hp > 0) {
      m.state = 'chase';
      return;
    }
    m.state = 'flee';
    m.cd = 1.4;
    m.h = Math.atan2(m.y - fy, m.x - fx);
    this.onBeat?.(m);
    if (!this.cleared && this.list.every((q) => q.state === 'flee' || q.state === 'gone')) {
      this.cleared = true;
      this.refill = CLEAR_RETURN;
      this.onClear?.();
    }
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    if (this.cleared) {
      this.refill -= dt;
      if (this.refill <= 0) this.reset();
    }
    for (const m of this.list) {
      m.cd = Math.max(0, m.cd - dt);
      m.flash = Math.max(0, m.flash - dt);
      m.ph += dt * 10;
      if (m.state === 'gone') {
        m.back -= dt;
        if (m.back <= 0 && !this.cleared) Object.assign(m, this.spawn(this.list.indexOf(m)));
        continue;
      }
      if (m.state === 'flee') {
        // Off into the trees, maskless, and gone.
        walkStep(
          m,
          Math.cos(m.h) * MONKEY_SPEED * 1.6 * dt,
          Math.sin(m.h) * MONKEY_SPEED * 1.6 * dt,
          5,
        );
        if (m.cd <= 0) {
          m.state = 'gone';
          m.back = RETURN;
        }
        continue;
      }
      const d = f ? Math.hypot(f.x - m.x, f.y - m.y) : Infinity;
      const near = f !== null && Math.hypot(f.x - CAMP.x, f.y - CAMP.y) < AGGRO;
      if (m.state === 'idle' && f && (near || d < AGGRO * 0.7)) {
        m.state = 'chase';
        this.onSpot?.();
      }
      if (m.state === 'chase' && (!f || Math.hypot(f.x - CAMP.x, f.y - CAMP.y) > LEASH))
        m.state = 'idle';
      if (m.state === 'idle') {
        m.rest -= dt;
        if (m.rest <= 0) {
          const a = w.rng() * Math.PI * 2;
          const r = 20 + w.rng() * 40;
          m.tx = CAMP.x + Math.cos(a) * r;
          m.ty = CAMP.y + Math.sin(a) * r;
          m.rest = 1.5 + w.rng() * 3;
        }
        this.toward(m, m.tx, m.ty, MONKEY_SPEED * 0.5, dt);
        continue;
      }
      if (!f) continue;
      if (m.thrower) {
        // Keep a throw away, and lob coconuts at where the figure is going.
        if (d > THROW_RANGE * 0.8) this.toward(m, f.x, f.y, MONKEY_SPEED, dt);
        else if (d < THROW_RANGE * 0.45)
          this.toward(m, 2 * m.x - f.x, 2 * m.y - f.y, MONKEY_SPEED * 0.8, dt);
        m.h = Math.atan2(f.y - m.y, f.x - m.x);
        if (m.cd <= 0 && d < THROW_RANGE) {
          // Thrown at where the figure stands, so one that keeps moving is never there when it lands.
          const tx = f.x;
          const ty = f.y;
          this.nuts.push({
            x0: m.x,
            y0: m.y,
            tx,
            ty,
            t: 0,
            dur: Math.hypot(tx - m.x, ty - m.y) / COCONUT_SPEED,
          });
          m.cd = THROW_EVERY;
          this.onThrow?.();
        }
      } else {
        if (d > BONK_R * 0.8) this.toward(m, f.x, f.y, MONKEY_SPEED, dt);
        if (d < BONK_R && m.cd <= 0) {
          m.cd = BONK_EVERY;
          this.onBonk?.('bonk');
        }
      }
    }
    for (let i = this.nuts.length - 1; i >= 0; i--) {
      const n = this.nuts[i] as Coconut;
      n.t += dt;
      if (n.t >= n.dur) {
        this.nuts.splice(i, 1);
        if (f && Math.hypot(f.x - n.tx, f.y - n.ty) < HIT_R) this.onBonk?.('coconut');
      }
    }
  }

  private toward(m: Monkey, tx: number, ty: number, speed: number, dt: number): void {
    const dx = tx - m.x;
    const dy = ty - m.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    const st = Math.min(d, speed * dt);
    walkStep(m, (dx / d) * st, (dy / d) * st, 5);
    m.h = Math.atan2(dy, dx);
  }

  /** Whether a monkey is drawn at all. */
  static shown(m: Monkey): boolean {
    return m.state !== 'gone';
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer === 'air') {
      // Coconuts in flight, and a shadow where each will land.
      const { ctx, px, py } = v;
      const Z = v.zoom;
      for (const n of this.nuts) {
        const k = Math.min(1, n.t / n.dur);
        const x = n.x0 + (n.tx - n.x0) * k;
        const y = n.y0 + (n.ty - n.y0) * k;
        const z = 14 + Math.sin(Math.PI * k) * 40 - 14 * k;
        ctx.fillStyle = 'rgba(0,0,0,.2)';
        v.isoEllipse(n.tx, n.ty, 6 * (0.5 + k * 0.5));
        ctx.fill();
        ctx.fillStyle = '#6B4423';
        ctx.beginPath();
        ctx.arc(px(x, y), py(x, y, z), 3.6 * Z, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** One monkey, for the game's sorted solids. */
  drawMonkey(v: DrawView, m: Monkey, z: number): void {
    if (!v.onScreen(m.x, m.y, 40)) return;
    const { ctx, px, py } = v;
    const Z = v.zoom;
    const moving = m.state === 'chase' || m.state === 'flee';
    const bob = moving ? Math.abs(Math.sin(m.ph)) * 2 : 0;
    const c = Math.cos(m.h);
    const s = Math.sin(m.h);
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    v.isoEllipse(m.x, m.y, 6, z);
    ctx.fill();
    const fur = m.flash > 0 ? '#FFFFFF' : '#7A4A28';
    // A curled tail behind.
    ctx.strokeStyle = fur;
    ctx.lineWidth = 2 * Z;
    ctx.lineCap = 'round';
    const tx = m.x - c * 6;
    const ty = m.y - s * 6;
    ctx.beginPath();
    ctx.moveTo(px(tx, ty), py(tx, ty, z + 6));
    ctx.quadraticCurveTo(
      px(tx - c * 8, ty - s * 8),
      py(tx - c * 8, ty - s * 8, z + 16 + bob),
      px(tx - c * 4, ty - s * 4),
      py(tx - c * 4, ty - s * 4, z + 18 + bob),
    );
    ctx.stroke();
    // Body and belly.
    const bx = px(m.x, m.y);
    const by = py(m.x, m.y, z + 8 + bob);
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(bx, by, 4.4 * Z, 5.2 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = m.flash > 0 ? '#FFFFFF' : '#C89A6B';
    ctx.beginPath();
    ctx.ellipse(bx + (c - s) * 0.8 * Z, by + 1 * Z, 2.6 * Z, 3.4 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head, and the skull mask, unless it has dropped it.
    const hy = py(m.x, m.y, z + 16 + bob);
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.arc(bx, hy, 4 * Z, 0, Math.PI * 2);
    ctx.fill();
    const facing = (c + s) / 2 > -0.15;
    if (m.state !== 'flee' && facing) {
      const mx = bx + (c - s) * 0.9 * Z;
      ctx.fillStyle = '#F4F1E6';
      ctx.beginPath();
      ctx.arc(mx, hy, 3.4 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(mx - 1.8 * Z, hy + 1.6 * Z, 3.6 * Z, 2.2 * Z);
      ctx.fillStyle = '#1E2227';
      for (const e of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(mx + e * 1.3 * Z, hy - 0.3 * Z, 0.95 * Z, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // A thrower holds a coconut ready.
    if (m.thrower && m.state === 'chase' && m.cd < 1) {
      ctx.fillStyle = '#6B4423';
      ctx.beginPath();
      ctx.arc(bx + (c - s) * 4 * Z, py(m.x, m.y, z + 20 + bob), 2.6 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
