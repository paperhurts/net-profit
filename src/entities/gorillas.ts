/**
 * The gorillas in island 10's forest, the kid's: "gorillas, which hit hard", 7 hp and 3 damage, with the owner's word
 * that each slam is wound up so it can be dodged. A troop of three, one of them a silverback, sitting about among the
 * trees, munching. Come near one and it rears up beating its chest (the troop with it), then comes on through the trees
 * on its knuckles, slower than the figure walks. Close enough, it rears up with both fists over its head while a ring
 * on the ground shows where they will come down (the warning: get out of it), then slams them into the ground there:
 * three hearts to anyone in the ring. Seven hits and it has had enough: it tumbles over and runs off into the trees,
 * dropping a few coins. Leave its patch far behind and it goes back and sits down. Every visit the troop is back.
 */

import { rng } from '../core/math';
import type { Point } from '../world/island';
import { ISLE10, onIsle10Ground, regionAt, TREES10 } from '../world/isle10';
import type { DrawView, Entity, Layer, World } from './entity';
import { walkStep } from './walker';

export const GORILLA_HP = 7;
/** Hearts a slam takes, for anyone in its ring. */
export const GORILLA_SLAM = 3;
/** It wakes for the figure this near, and the troop with it within this of it; it gives up this far from home. */
export const GORILLA_WAKE = 110;
export const TROOP_CALL = 170;
export const GORILLA_LEASH = 240;
/** It knuckle-walks at this; the figure walks at 85. */
export const GORILLA_SPEED = 46;
/** Seconds of chest-beating before it comes on. */
export const GORILLA_WARN = 0.9;
/** It rears up for a slam from this near; the fists come down this far in front of it, over a ring this wide. */
export const GORILLA_REACH = 34;
export const SLAM_AHEAD = 22;
export const SLAM_R = 30;
/** Seconds: fists up (the warning), the slam, and the time it is open after. */
export const GORILLA_WINDUP = 1;
export const GORILLA_POUND = 0.25;
export const GORILLA_RECOVER = 1.3;
/** Seconds it takes to tumble and run off. */
export const GORILLA_FALL = 1.4;
/** Coins one leaves. */
export const GORILLA_PRIZE = 40;

export type GorillaState =
  | 'sit'
  | 'warn'
  | 'chase'
  | 'windup'
  | 'slam'
  | 'recover'
  | 'back'
  | 'fall'
  | 'gone';

export type Gorilla = {
  x: number;
  y: number;
  h: number;
  face: number;
  home: Point;
  hp: number;
  state: GorillaState;
  t: number;
  flash: number;
  stunT: number;
  /** Where its fists will come down. */
  slamAt: Point;
  /** Its walk, and its munching. */
  step: number;
  silver: boolean;
};

/** Somewhere in the forest clear of the trees: where the troop sits. */
function homes(): Point[] {
  const R = rng(1201);
  const out: Point[] = [];
  for (let k = 0; out.length < 3 && k < 4000; k++) {
    const a = R() * Math.PI * 2;
    const d = 230 + R() * 200;
    const x = ISLE10.x + Math.cos(a) * d;
    const y = ISLE10.y + Math.sin(a) * d;
    if (regionAt(x, y) !== 'forest' || !onIsle10Ground(x, y)) continue;
    if (TREES10.some(([tx, ty]) => Math.hypot(x - tx, y - ty) < 18)) continue;
    // A troop: each within reach of the first, not on top of each other.
    const first = out[0];
    if (first && Math.hypot(x - first[0], y - first[1]) > 120) continue;
    if (!out.every(([px, py]) => Math.hypot(x - px, y - py) > 50)) continue;
    out.push([x, y]);
  }
  return out;
}

export const GORILLA_HOMES: readonly Point[] = homes();

export class Gorillas implements Entity {
  readonly list: Gorilla[];
  /** One rose up beating its chest; reared up for a slam; slammed (for this many hearts, if the figure was in it). */
  onWarn: ((g: Gorilla) => void) | null = null;
  onWindup: ((g: Gorilla) => void) | null = null;
  onSlam: ((g: Gorilla, hit: boolean) => void) | null = null;
  onHit: ((n: number) => void) | null = null;
  /** One was beaten. */
  onBeaten: ((g: Gorilla) => void) | null = null;

  constructor(at: readonly Point[] = GORILLA_HOMES) {
    this.list = at.map((home, i) => ({
      x: home[0],
      y: home[1],
      h: 0,
      face: i % 2 ? 1 : -1,
      home,
      hp: GORILLA_HP,
      state: 'sit',
      t: 0,
      flash: 0,
      stunT: 0,
      slamAt: home,
      step: i * 1.3,
      silver: i === 0,
    }));
  }

  /** All back where they sit, whole. */
  reset(): void {
    for (const g of this.list) {
      [g.x, g.y] = g.home;
      g.hp = GORILLA_HP;
      g.state = 'sit';
      g.t = 0;
      g.flash = 0;
      g.stunT = 0;
    }
  }

  /** Up and after the figure (its chest-beating included). */
  static up(g: Gorilla): boolean {
    return (
      g.state === 'warn' ||
      g.state === 'chase' ||
      g.state === 'windup' ||
      g.state === 'slam' ||
      g.state === 'recover'
    );
  }

  get roused(): boolean {
    return this.list.some((g) => Gorillas.up(g));
  }

  /** The nearest within range: those up only, or, with quiet, those sitting or going home too. */
  nearest(x: number, y: number, range: number, quiet = false): Gorilla | null {
    let best: Gorilla | null = null;
    let bd = range;
    for (const g of this.list) {
      if (!(Gorillas.up(g) || (quiet && (g.state === 'sit' || g.state === 'back')))) continue;
      const d = Math.hypot(g.x - x, g.y - y);
      if (d <= bd) {
        bd = d;
        best = g;
      }
    }
    return best;
  }

  /** A hit: one sitting or going home is roused, and the troop with it; at none it is beaten. Whether it hurt. */
  hit(g: Gorilla, power: number): boolean {
    if (g.state === 'fall' || g.state === 'gone') return false;
    if (g.state === 'sit' || g.state === 'back') this.rouse(g);
    g.hp -= power;
    g.flash = 0.15;
    if (g.hp <= 0) {
      g.hp = 0;
      g.state = 'fall';
      g.t = 0;
      this.onBeaten?.(g);
    }
    return true;
  }

  /** Tar in its face: it stands this many seconds, and fists it had up come down on nothing. */
  stun(g: Gorilla, s: number): void {
    if (!Gorillas.up(g) || g.state === 'slam') return;
    g.stunT = Math.max(g.stunT, s);
    if (g.state === 'windup') {
      g.state = 'chase';
      g.t = 0;
    }
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    for (const g of this.list) {
      g.t += dt;
      g.flash = Math.max(0, g.flash - dt);
      if (g.state === 'gone') continue;
      if (g.state === 'fall') {
        if (g.t >= GORILLA_FALL) g.state = 'gone';
        continue;
      }
      if (g.state === 'sit') {
        g.step += dt;
        if (f && Math.hypot(f.x - g.x, f.y - g.y) < GORILLA_WAKE) this.rouse(g);
        continue;
      }
      if (g.state === 'warn') {
        if (f) g.face = faceTo(f.x - g.x, f.y - g.y, g.face);
        if (g.t >= GORILLA_WARN) this.set(g, 'chase');
        continue;
      }
      if (g.stunT > 0) {
        g.stunT -= dt;
        continue;
      }
      if (g.state === 'windup') {
        if (g.t >= GORILLA_WINDUP) {
          this.set(g, 'slam');
          const hit = !!f && Math.hypot(f.x - g.slamAt[0], f.y - g.slamAt[1]) < SLAM_R;
          this.onSlam?.(g, hit);
          if (hit) this.onHit?.(GORILLA_SLAM);
        }
        continue;
      }
      if (g.state === 'slam') {
        if (g.t >= GORILLA_POUND) this.set(g, 'recover');
        continue;
      }
      const far = !f || Math.hypot(f.x - g.home[0], f.y - g.home[1]) > GORILLA_LEASH;
      if (g.state === 'recover') {
        if (g.t >= GORILLA_RECOVER) this.set(g, far ? 'back' : 'chase');
        continue;
      }
      if (far && g.state === 'chase') this.set(g, 'back');
      if (g.state === 'back') {
        if (this.toward(g, g.home[0], g.home[1], GORILLA_SPEED * 0.7, dt)) this.set(g, 'sit');
        continue;
      }
      if (!f) continue;
      const d = Math.hypot(f.x - g.x, f.y - g.y);
      if (d > GORILLA_REACH - 4) this.toward(g, f.x, f.y, GORILLA_SPEED, dt);
      else {
        // Up on its legs, fists high: they will come down just in front of it, where the figure is now.
        const a = Math.atan2(f.y - g.y, f.x - g.x);
        g.h = a;
        g.face = faceTo(f.x - g.x, f.y - g.y, g.face);
        g.slamAt = [g.x + Math.cos(a) * SLAM_AHEAD, g.y + Math.sin(a) * SLAM_AHEAD];
        this.set(g, 'windup');
        this.onWindup?.(g);
      }
    }
  }

  /** Whether a slam coming down now catches whoever is at (x, y). */
  static catches(g: Gorilla, x: number, y: number): boolean {
    return Math.hypot(x - g.slamAt[0], y - g.slamAt[1]) < SLAM_R;
  }

  /** It and the troop near it rise up beating their chests. */
  private rouse(g: Gorilla): void {
    for (const o of this.list) {
      if (o !== g && (o.state !== 'sit' || Math.hypot(o.x - g.x, o.y - g.y) > TROOP_CALL)) continue;
      this.set(o, 'warn');
      this.onWarn?.(o);
    }
  }

  private set(g: Gorilla, s: GorillaState): void {
    g.state = s;
    g.t = 0;
  }

  /** A knuckle-walk toward (x, y), round the trees; whether it has got there. */
  private toward(g: Gorilla, x: number, y: number, speed: number, dt: number): boolean {
    const dx = x - g.x;
    const dy = y - g.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) return true;
    const s = Math.min(d, speed * dt);
    walkStep(g, (dx / d) * s, (dy / d) * s, 99);
    g.h = Math.atan2(dy, dx);
    g.face = faceTo(dx, dy, g.face);
    g.step += dt * speed * 0.18;
    return false;
  }

  /** The game draws them among the island's solids (render/gorillas.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}

/** Which way a heading faces on the screen, keeping the old way when it is straight up or down. */
function faceTo(dx: number, dy: number, was: number): number {
  const s = dx - dy;
  return Math.abs(s) > 2 ? Math.sign(s) : was;
}
