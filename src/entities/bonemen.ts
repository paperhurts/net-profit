/**
 * Skrill's men on Skull Island, the kid's (his sixth list: "men in skeleton armour", 18 hits and 2 damage, the skeleton
 * guy in his second drawing with a bone weapon; his answers: they are bad guys, Skull Island's men, and their bone
 * weapons are jawblades; Skrill "yells at his men"). Men in armour made of bones, a skull for a helmet, each with a
 * jawblade, a great jawbone with its teeth along the edge. They stand guard in pairs about the skull: on its jaw above
 * the pier, out on its cheeks, up on its dome, and at Skrill's tower door. Come near one and he raises his jawblade and
 * comes on, his partner with him. Close enough, he draws it back while a red fan shows on the ground in front of him
 * (the warning: get out of it), then sweeps it across: two hearts to anyone in the fan. Eighteen hits and his armour
 * falls apart into a heap of bones, leaving coins. Every landing they are back.
 */

import type { Point } from '../world/island';
import { fromSkull } from '../world/isle12';
import type { DrawView, Entity, Layer, World } from './entity';
import { walkStep } from './walker';

/** Hits to beat one, and the hearts his sweep takes. */
export const BONEMAN_HP = 18;
export const BONEMAN_DMG = 2;
/** He wakes for the figure this near, and his partner within this of him with him; he gives up this far from home. */
export const BONE_WAKE = 150;
export const BONE_CALL = 220;
export const BONE_LEASH = 420;
/** He comes on at this; the figure walks at 85. */
export const BONE_SPEED = 50;
/** Seconds raising his jawblade before he comes on. */
export const BONE_RISE = 0.6;
/** He draws back from this near; the sweep reaches this far in front of him, this far either side of straight ahead. */
export const BONE_REACH = 40;
export const SWEEP_R = 48;
export const SWEEP_ARC = 1.1;
/** Seconds: drawn back (the warning), the sweep, and the time he is open after. */
export const BONE_WINDUP = 0.85;
export const BONE_SWEEP = 0.25;
export const BONE_RECOVER = 1;
/** Seconds his armour takes to fall apart. */
export const BONE_FALL = 1.2;
/** Coins one leaves. */
export const BONEMAN_PRIZE = 70;

export type BoneState =
  | 'guard'
  | 'rise'
  | 'chase'
  | 'windup'
  | 'sweep'
  | 'recover'
  | 'back'
  | 'fall'
  | 'gone';

export type BoneMan = {
  x: number;
  y: number;
  /** Which way he faces, and which way the sweep goes. */
  h: number;
  home: Point;
  hp: number;
  state: BoneState;
  t: number;
  flash: number;
  stunT: number;
  /** His walk. */
  step: number;
};

/** Where they stand guard in pairs, in the skull's own frame: on the jaw above the pier, out on the left cheek, up on
 * the dome, and either side of the tower door. */
export const BONE_POSTS: readonly [number, number][] = [
  [-90, 1160],
  [90, 1160],
  [-610, 500],
  [-600, 640],
  [420, -300],
  [520, -200],
  [-85, -350],
  [85, -350],
];
export const BONE_HOMES: readonly Point[] = BONE_POSTS.map(([u, v]) => fromSkull(u, v));

export class BoneMen implements Entity {
  readonly list: BoneMan[] = [];
  /** Whether the figure is ashore on Skull Island: away from it they stand still. */
  here = false;
  /** One raised his jawblade; drew it back; swept it (for this many hearts, if the figure was in it); was beaten. */
  onRise: ((m: BoneMan) => void) | null = null;
  onWindup: ((m: BoneMan) => void) | null = null;
  onSweep: ((m: BoneMan, hit: boolean) => void) | null = null;
  onHit: ((n: number) => void) | null = null;
  onBeaten: ((m: BoneMan) => void) | null = null;

  constructor(at: readonly Point[] = BONE_HOMES) {
    this.place(at);
  }

  /** These men on guard here, in place of any before. */
  place(at: readonly Point[]): void {
    this.list.length = 0;
    at.forEach((p, i) => {
      this.list.push({
        x: p[0],
        y: p[1],
        h: Math.PI / 4,
        home: p,
        hp: BONEMAN_HP,
        state: 'guard',
        t: 0,
        flash: 0,
        stunT: 0,
        step: i * 1.3,
      });
    });
  }

  /** All of them up at once, as on the Battle Barge. */
  wake(): void {
    for (const m of this.list) {
      if (m.state !== 'guard') continue;
      this.set(m, 'rise');
      this.onRise?.(m);
    }
  }

  /** All back at their posts, whole. */
  reset(): void {
    for (const m of this.list) {
      [m.x, m.y] = m.home;
      m.h = Math.PI / 4;
      m.hp = BONEMAN_HP;
      m.state = 'guard';
      m.t = 0;
      m.flash = 0;
      m.stunT = 0;
    }
  }

  /** Up and after the figure. */
  static up(m: BoneMan): boolean {
    return (
      m.state === 'rise' ||
      m.state === 'chase' ||
      m.state === 'windup' ||
      m.state === 'sweep' ||
      m.state === 'recover'
    );
  }

  get roused(): boolean {
    return this.here && this.list.some((m) => BoneMen.up(m));
  }

  /** The nearest within range: those up only, or, with quiet, those on guard or going back too. */
  nearest(x: number, y: number, range: number, quiet = false): BoneMan | null {
    let best: BoneMan | null = null;
    let bd = range;
    for (const m of this.list) {
      if (!(BoneMen.up(m) || (quiet && (m.state === 'guard' || m.state === 'back')))) continue;
      const d = Math.hypot(m.x - x, m.y - y);
      if (d <= bd) {
        bd = d;
        best = m;
      }
    }
    return best;
  }

  /** A hit: one on guard is roused, and his partner; at none his armour falls apart. Whether it hurt. */
  hit(m: BoneMan, power: number): boolean {
    if (m.state === 'fall' || m.state === 'gone') return false;
    if (m.state === 'guard' || m.state === 'back') this.rouse(m);
    m.hp -= power;
    m.flash = 0.15;
    if (m.hp <= 0) {
      m.hp = 0;
      this.set(m, 'fall');
      this.onBeaten?.(m);
    }
    return true;
  }

  /** Tar in his face, or a stun: he stands this many seconds, and a sweep he was drawing back comes to nothing. */
  stun(m: BoneMan, s: number): void {
    if (!BoneMen.up(m) || m.state === 'sweep') return;
    m.stunT = Math.max(m.stunT, s);
    if (m.state === 'windup') this.set(m, 'chase');
  }

  update(dt: number, w: World): void {
    if (!this.here) return;
    const fig = w.figure;
    for (const m of this.list) {
      m.t += dt;
      m.flash = Math.max(0, m.flash - dt);
      m.step += dt;
      if (m.state === 'gone') continue;
      if (m.state === 'fall') {
        if (m.t >= BONE_FALL) m.state = 'gone';
        continue;
      }
      // The figure away, or led too far from his post: back he goes.
      if (BoneMen.up(m) && (!fig || Math.hypot(m.x - m.home[0], m.y - m.home[1]) > BONE_LEASH))
        this.set(m, 'back');
      if (m.state === 'guard') {
        if (fig && Math.hypot(fig.x - m.x, fig.y - m.y) < BONE_WAKE) this.rouse(m);
        continue;
      }
      if (m.state === 'back') {
        if (this.toward(m, m.home[0], m.home[1], BONE_SPEED * 0.8, dt)) this.set(m, 'guard');
        continue;
      }
      if (!fig) continue;
      if (m.state === 'rise') {
        m.h = Math.atan2(fig.y - m.y, fig.x - m.x);
        if (m.t >= BONE_RISE) this.set(m, 'chase');
        continue;
      }
      if (m.stunT > 0) {
        m.stunT -= dt;
        continue;
      }
      if (m.state === 'windup') {
        if (m.t >= BONE_WINDUP) {
          this.set(m, 'sweep');
          const hit = BoneMen.catches(m, fig.x, fig.y);
          this.onSweep?.(m, hit);
          if (hit) this.onHit?.(BONEMAN_DMG);
        }
        continue;
      }
      if (m.state === 'sweep') {
        if (m.t >= BONE_SWEEP) this.set(m, 'recover');
        continue;
      }
      if (m.state === 'recover') {
        if (m.t >= BONE_RECOVER) this.set(m, 'chase');
        continue;
      }
      // Chasing: on toward the figure, and from near enough, draw back a sweep aimed at it.
      const d = Math.hypot(fig.x - m.x, fig.y - m.y);
      if (d > BONE_REACH - 4) {
        this.toward(m, fig.x, fig.y, BONE_SPEED, dt);
        continue;
      }
      m.h = Math.atan2(fig.y - m.y, fig.x - m.x);
      this.set(m, 'windup');
      this.onWindup?.(m);
    }
  }

  /** Whether a sweep now catches whoever is at (x, y): in the fan in front of him. */
  static catches(m: BoneMan, x: number, y: number): boolean {
    const d = Math.hypot(x - m.x, y - m.y);
    if (d > SWEEP_R) return false;
    if (d < 8) return true;
    const a = Math.atan2(y - m.y, x - m.x) - m.h;
    return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <= SWEEP_ARC;
  }

  /** He and his partner, near him on guard, raise their jawblades. */
  private rouse(m: BoneMan): void {
    for (const o of this.list) {
      if (o !== m && (o.state !== 'guard' || Math.hypot(o.x - m.x, o.y - m.y) > BONE_CALL))
        continue;
      this.set(o, 'rise');
      this.onRise?.(o);
    }
  }

  private set(m: BoneMan, s: BoneState): void {
    m.state = s;
    m.t = 0;
  }

  /** A step toward (x, y) over the island; whether he has got there. */
  private toward(m: BoneMan, x: number, y: number, speed: number, dt: number): boolean {
    const dx = x - m.x;
    const dy = y - m.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) return true;
    const s = Math.min(d, speed * dt);
    walkStep(m, (dx / d) * s, (dy / d) * s, 99);
    m.h = Math.atan2(dy, dx);
    return false;
  }

  /** The game draws them among the island's solids (render/bonemen.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}
