/**
 * The lancers, the kid's (his "lancets": 10 hp, slow, 2 damage, "they DO NOT engage you"): tall knights in
 * old green-black armour standing guard round the ruins behind the Forgotten One's throne, each with a long
 * lance and a ragged pennant. They leave the figure alone, and nobody on its side goes for them; the spear
 * only goes for one when there is nothing else to throw at. Hit one and it is roused: it comes on slowly,
 * draws its lance back (the warning) and thrusts along it, for two hearts. Ten hits put one down. Every
 * visit they stand at their posts again, whole and quiet.
 */

import { angDiff, clamp } from '../core/math';
import type { DrawView, Entity, Layer, World } from './entity';
import { walkStep } from './walker';

export const LANCER_HP = 10;
/** It walks at this; the figure walks at 85. */
export const LANCER_SPEED = 30;
/** The lance: how far it reaches, the warning, the thrust, how long it is open after, and its arc. */
export const LANCE_REACH = 46;
export const LANCE_WINDUP = 0.9;
export const LANCE_THRUST = 0.2;
export const LANCE_RECOVER = 1.2;
export const LANCE_ARC = 0.55;
/** Hearts a thrust takes, as the kid wrote. */
export const LANCE_HIT = 2;
/** Seconds it takes to fall. */
export const LANCER_FALL = 1.2;
export const LANCER_SCALE = 1.5;

export type LancerState = 'guard' | 'walk' | 'windup' | 'thrust' | 'recover' | 'fall' | 'gone';

export type Lancer = {
  x: number;
  y: number;
  h: number;
  post: { x: number; y: number; h: number };
  hp: number;
  state: LancerState;
  t: number;
  flash: number;
  stunT: number;
  ph: number;
};

export class Lancers implements Entity {
  readonly list: Lancer[];
  /** A thrust hit the figure, for this many hearts. */
  onHit: ((n: number) => void) | null = null;
  /** One was roused by a hit. */
  onRouse: ((l: Lancer) => void) | null = null;
  /** One drew its lance back. */
  onWindup: (() => void) | null = null;

  /** At their posts, each facing the middle of its room. */
  constructor(
    posts: readonly { x: number; y: number }[],
    readonly room: { x: number; y: number },
  ) {
    this.list = posts.map((p, i) => {
      const h = Math.atan2(room.y - p.y, room.x - p.x);
      return {
        x: p.x,
        y: p.y,
        h,
        post: { x: p.x, y: p.y, h },
        hp: LANCER_HP,
        state: 'guard',
        t: 0,
        flash: 0,
        stunT: 0,
        ph: i * 1.3,
      };
    });
  }

  /** Back at their posts, whole and quiet. */
  reset(): void {
    for (const l of this.list) {
      l.x = l.post.x;
      l.y = l.post.y;
      l.h = l.post.h;
      l.hp = LANCER_HP;
      l.state = 'guard';
      l.t = 0;
      l.flash = 0;
      l.stunT = 0;
    }
  }

  /** Roused and still standing. */
  static up(l: Lancer): boolean {
    return (
      l.state === 'walk' || l.state === 'windup' || l.state === 'thrust' || l.state === 'recover'
    );
  }

  /** Any roused and standing. */
  get roused(): boolean {
    return this.list.some((l) => Lancers.up(l));
  }

  /** The nearest within range: roused ones only, or, with quiet, those standing guard too. */
  nearest(x: number, y: number, range: number, quiet = false): Lancer | null {
    let best: Lancer | null = null;
    let bd = range;
    for (const l of this.list) {
      if (!(Lancers.up(l) || (quiet && l.state === 'guard'))) continue;
      const d = Math.hypot(l.x - x, l.y - y);
      if (d <= bd) {
        bd = d;
        best = l;
      }
    }
    return best;
  }

  /** A hit: it is roused, and at none it falls. Returns whether it hurt. */
  hit(l: Lancer, power: number): boolean {
    if (l.state === 'fall' || l.state === 'gone') return false;
    if (l.state === 'guard') {
      l.state = 'walk';
      l.t = 0;
      this.onRouse?.(l);
    }
    l.hp -= power;
    l.flash = 0.15;
    if (l.hp <= 0) {
      l.state = 'fall';
      l.t = 0;
    }
    return true;
  }

  /** Tar on its face: it stands this many seconds, and a lance it was drawing back comes to nothing. */
  stun(l: Lancer, s: number): void {
    if (!Lancers.up(l) || l.state === 'thrust') return;
    l.stunT = Math.max(l.stunT, s);
    if (l.state === 'windup') {
      l.state = 'walk';
      l.t = 0;
    }
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    for (const l of this.list) {
      l.t += dt;
      l.ph += dt;
      l.flash = Math.max(0, l.flash - dt);
      if (l.state === 'gone' || l.state === 'guard') continue;
      if (l.state === 'fall') {
        if (l.t >= LANCER_FALL) l.state = 'gone';
        continue;
      }
      if (l.stunT > 0) {
        l.stunT -= dt;
        continue;
      }
      if (!f) continue;
      const dx = f.x - l.x;
      const dy = f.y - l.y;
      const d = Math.hypot(dx, dy) || 1;
      if (l.state === 'walk') {
        l.h = Math.atan2(dy, dx);
        if (d > LANCE_REACH - 6)
          walkStep(l, (dx / d) * LANCER_SPEED * dt, (dy / d) * LANCER_SPEED * dt, 99);
        else {
          l.state = 'windup';
          l.t = 0;
          this.onWindup?.();
        }
      } else if (l.state === 'windup') {
        if (l.t >= LANCE_WINDUP) {
          l.state = 'thrust';
          l.t = 0;
          if (d < LANCE_REACH + 4 && Math.abs(angDiff(l.h, Math.atan2(dy, dx))) < LANCE_ARC)
            this.onHit?.(LANCE_HIT);
        }
      } else if (l.state === 'thrust') {
        if (l.t >= LANCE_THRUST) {
          l.state = 'recover';
          l.t = 0;
        }
      } else if (l.state === 'recover' && l.t >= LANCE_RECOVER) {
        l.state = 'walk';
        l.t = 0;
      }
    }
  }

  draw(_v: DrawView, _layer: Layer): void {}

  /** One lancer, at its feet, for the room's sorted actors. */
  drawBody(v: DrawView, l: Lancer): void {
    if (l.state === 'gone') return;
    const { ctx, px, py, T } = v;
    const k = LANCER_SCALE * v.zoom;
    const fall = l.state === 'fall' ? clamp(l.t / LANCER_FALL, 0, 1) : 0;
    const sx = px(l.x, l.y);
    const base = py(l.x, l.y) + fall * 6 * k;
    const face = Math.cos(l.h) - Math.sin(l.h) >= 0 ? 1 : -1;
    const W = (c: string) => (l.flash > 0 ? '#FFFFFF' : c);
    ctx.globalAlpha = 1 - fall * 0.8;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    v.isoEllipse(l.x, l.y, 8 * LANCER_SCALE);
    ctx.fill();
    const stride = l.state === 'walk' ? Math.sin(l.ph * 5) * 2 * k : 0;
    // Armoured legs.
    ctx.strokeStyle = W('#1E2A26');
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.6 * k;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx + side * 2 * k, base - 10 * k);
      ctx.lineTo(sx + side * 2 * k + stride * side, base);
      ctx.stroke();
    }
    // A tabard over the armour, ragged at the hem.
    ctx.fillStyle = W('#2B3D35');
    ctx.beginPath();
    ctx.moveTo(sx - 5 * k, base - 22 * k);
    ctx.lineTo(sx + 5 * k, base - 22 * k);
    ctx.lineTo(sx + 5.5 * k, base - 9 * k);
    for (let i = 1; i <= 4; i++)
      ctx.lineTo(sx + (5.5 - i * 2.75) * k, base - (i % 2 ? 10.5 : 8.5) * k);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = W('#7E8F86');
    ctx.fillRect(sx - 4 * k, base - 23 * k, 8 * k, 2.4 * k);
    // The helm: a bucket with a slit, and a little crest.
    const hy = base - 28 * k;
    ctx.fillStyle = W('#6E7C76');
    ctx.fillRect(sx - 3.6 * k, hy - 4 * k, 7.2 * k, 8.5 * k);
    ctx.beginPath();
    ctx.arc(sx, hy - 4 * k, 3.6 * k, Math.PI, 0);
    ctx.fill();
    const roused = Lancers.up(l);
    ctx.fillStyle = roused ? '#8CFFA8' : '#141A18';
    ctx.fillRect(sx - 2.6 * k + face * 0.6 * k, hy - 1.2 * k, 5.2 * k, 1.3 * k);
    ctx.fillStyle = W('#4E2A36');
    ctx.beginPath();
    ctx.moveTo(sx - 1 * k, hy - 7.4 * k);
    ctx.quadraticCurveTo(
      sx - face * 6 * k,
      hy - 10 * k + Math.sin(T * 3 + l.ph) * k,
      sx - face * 7 * k,
      hy - 4 * k,
    );
    ctx.lineTo(sx + 1 * k, hy - 7.4 * k);
    ctx.closePath();
    ctx.fill();
    // The lance: upright on guard, levelled when roused, drawn back in the warning and driven out in the thrust.
    let back = 0;
    if (l.state === 'windup') back = clamp(l.t / LANCE_WINDUP, 0, 1) * 8;
    else if (l.state === 'thrust') back = -10;
    const hx = sx + face * 5 * k;
    const hyy = base - 16 * k;
    ctx.strokeStyle = W('#8A6A43');
    ctx.lineWidth = 1.8 * k;
    ctx.beginPath();
    if (roused || l.state === 'fall') {
      const tip = (36 - back) * k;
      ctx.moveTo(hx - face * (10 + back) * k, hyy + 1 * k);
      ctx.lineTo(hx + face * tip, hyy - 1 * k);
      ctx.stroke();
      ctx.fillStyle = W('#C9D2D6');
      ctx.beginPath();
      ctx.moveTo(hx + face * tip, hyy - 3 * k);
      ctx.lineTo(hx + face * (tip + 7 * k), hyy - 1 * k);
      ctx.lineTo(hx + face * tip, hyy + 1 * k);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.moveTo(hx, base - 2 * k);
      ctx.lineTo(hx, base - 46 * k);
      ctx.stroke();
      ctx.fillStyle = W('#C9D2D6');
      ctx.beginPath();
      ctx.moveTo(hx - 1.6 * k, base - 46 * k);
      ctx.lineTo(hx, base - 53 * k);
      ctx.lineTo(hx + 1.6 * k, base - 46 * k);
      ctx.closePath();
      ctx.fill();
      // A ragged pennant just under the point, stirring.
      ctx.fillStyle = W('#4E2A36');
      ctx.beginPath();
      ctx.moveTo(hx, base - 44 * k);
      ctx.lineTo(hx + face * (9 + Math.sin(T * 2 + l.ph) * 1.5) * k, base - 42 * k);
      ctx.lineTo(hx + face * 5 * k, base - 40.5 * k);
      ctx.lineTo(hx + face * (8 + Math.sin(T * 2.3 + l.ph) * 1.5) * k, base - 38.5 * k);
      ctx.lineTo(hx, base - 38 * k);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
