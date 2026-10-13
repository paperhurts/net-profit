/**
 * The swamp's gators on island 10, the kid's: "alligators (hostile, 10 hp)". One lies in each of the swamp's four
 * bigger pools of black water, low in it with only its eyes and nostrils showing, drifting slowly round. Come near a
 * pool's edge and its gator surges out at the figure with a splash, and comes on across the mud, slower than the
 * figure walks. Close enough, it opens its jaws wide (the warning: step away) and snaps them shut, for a heart. Ten
 * hits beat one: it rolls over, belly up, and is gone, and it leaves a few coins. Leave its pool far enough behind
 * and it gives up and slides back in. The spear goes for a gator in its pool only when there is nothing else to throw
 * at, and that rouses it. Every visit they are all back in their pools, whole (reset).
 */

import { angDiff } from '../core/math';
import { POOLS10 } from '../world/isle10';
import type { DrawView, Entity, Layer, World } from './entity';
import { walkStep } from './walker';

export const GATOR_HP = 10;
/** The figure this near a pool's edge wakes its gator; this far from the pool's middle, and it goes back. */
export const GATOR_WAKE = 60;
export const GATOR_LEASH = 230;
/** It comes on at this; the figure walks at 85. */
export const GATOR_SPEED = 42;
/** Seconds to surge out of its pool, or to slide back in. */
export const GATOR_RISE = 0.6;
/** The bite: how far it reaches from the gator's middle, its arc, the warning, the snap, and the time it is open after. */
export const GATOR_REACH = 36;
export const GATOR_ARC = 0.7;
export const GATOR_GAPE = 0.8;
export const GATOR_SNAP = 0.15;
export const GATOR_RECOVER = 1.1;
/** Hearts a bite takes. */
export const GATOR_BITE = 1;
/** Seconds it takes to roll over and go. */
export const GATOR_FALL = 1.4;
/** Coins a beaten gator leaves. */
export const GATOR_PRIZE = 30;
/** Its pools: the swamp's bigger ones. */
export const GATOR_POOLS: readonly { x: number; y: number; r: number }[] = POOLS10.filter(
  (p) => p.r >= 35,
);

export type GatorState =
  | 'lurk'
  | 'rise'
  | 'chase'
  | 'gape'
  | 'snap'
  | 'recover'
  | 'back'
  | 'sink'
  | 'fall'
  | 'gone';

export type Gator = {
  x: number;
  y: number;
  /** Its heading, in the world. */
  h: number;
  pool: { x: number; y: number; r: number };
  hp: number;
  state: GatorState;
  t: number;
  flash: number;
  stunT: number;
  /** How far round its pool it has drifted. */
  a: number;
  /** A surge out or a slide back in: from here to there. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Seconds it has been stuck on its way back. */
  stuck: number;
  /** Its walk and its tail's sway. */
  ph: number;
};

/** How far out from its pool's middle it drifts while it lurks. */
const LURK_AT = 0.38;

export class Gators implements Entity {
  readonly list: Gator[];
  /** A snap caught the figure, for this many hearts. */
  onBite: ((n: number) => void) | null = null;
  /** One surged out of its pool. */
  onRise: ((g: Gator) => void) | null = null;
  /** One opened its jaws wide; one snapped them shut. */
  onGape: ((g: Gator) => void) | null = null;
  onSnap: ((g: Gator) => void) | null = null;
  /** One was beaten. */
  onBeaten: ((g: Gator) => void) | null = null;

  constructor(pools: readonly { x: number; y: number; r: number }[] = GATOR_POOLS) {
    this.list = pools.map((pool, i) => {
      const g: Gator = {
        x: pool.x,
        y: pool.y,
        h: 0,
        pool,
        hp: GATOR_HP,
        state: 'lurk',
        t: 0,
        flash: 0,
        stunT: 0,
        a: i * 1.7,
        from: { x: pool.x, y: pool.y },
        to: { x: pool.x, y: pool.y },
        stuck: 0,
        ph: i * 0.9,
      };
      Gators.drift(g, 0);
      return g;
    });
  }

  /** All back in their pools, whole and lurking. */
  reset(): void {
    for (const g of this.list) {
      g.hp = GATOR_HP;
      g.state = 'lurk';
      g.t = 0;
      g.flash = 0;
      g.stunT = 0;
      g.stuck = 0;
      Gators.drift(g, 0);
    }
  }

  /** Out of the water and after the figure (the surge out included). */
  static up(g: Gator): boolean {
    return (
      g.state === 'rise' ||
      g.state === 'chase' ||
      g.state === 'gape' ||
      g.state === 'snap' ||
      g.state === 'recover'
    );
  }

  /** In its pool, or on its way back there: quiet, but a spear will rouse it. */
  static quiet(g: Gator): boolean {
    return g.state === 'lurk' || g.state === 'back' || g.state === 'sink';
  }

  /** Any up. */
  get roused(): boolean {
    return this.list.some((g) => Gators.up(g));
  }

  /** The nearest within range: those up only, or, with quiet, those in their pools too. */
  nearest(x: number, y: number, range: number, quiet = false): Gator | null {
    let best: Gator | null = null;
    let bd = range;
    for (const g of this.list) {
      if (!(Gators.up(g) || (quiet && Gators.quiet(g)))) continue;
      const d = Math.hypot(g.x - x, g.y - y);
      if (d <= bd) {
        bd = d;
        best = g;
      }
    }
    return best;
  }

  /** A hit, from (x, y): a quiet gator comes for whoever threw, and at none it is beaten. Returns whether it hurt. */
  hit(g: Gator, power: number, x = g.pool.x, y = g.pool.y): boolean {
    if (g.state === 'fall' || g.state === 'gone') return false;
    if (g.state === 'lurk' || g.state === 'sink') this.surge(g, x, y);
    else if (g.state === 'back') {
      g.state = 'chase';
      g.t = 0;
    }
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

  /** Tar on its snout: it lies still this many seconds, and jaws it was opening shut again on nothing. */
  stun(g: Gator, s: number): void {
    if (!Gators.up(g) || g.state === 'snap' || g.state === 'rise') return;
    g.stunT = Math.max(g.stunT, s);
    if (g.state === 'gape') {
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
        if (g.t >= GATOR_FALL) g.state = 'gone';
        continue;
      }
      const p = g.pool;
      if (g.state === 'lurk') {
        Gators.drift(g, dt);
        if (f && Math.hypot(f.x - p.x, f.y - p.y) < p.r + GATOR_WAKE) this.surge(g, f.x, f.y);
        continue;
      }
      if (g.state === 'rise' || g.state === 'sink') {
        const k = Math.min(1, g.t / GATOR_RISE);
        const e = k * (2 - k);
        g.x = g.from.x + (g.to.x - g.from.x) * e;
        g.y = g.from.y + (g.to.y - g.from.y) * e;
        g.ph += dt * 6;
        if (k >= 1) {
          g.state = g.state === 'rise' ? 'chase' : 'lurk';
          g.t = 0;
          if (g.state === 'lurk') g.a = Math.atan2(g.y - p.y, g.x - p.x);
        }
        continue;
      }
      if (g.stunT > 0) {
        g.stunT -= dt;
        continue;
      }
      // Too far from home, or nobody ashore to chase: back to the water.
      const far = !f || Math.hypot(f.x - p.x, f.y - p.y) > GATOR_LEASH;
      if (far && (g.state === 'chase' || g.state === 'recover')) {
        g.state = 'back';
        g.t = 0;
        g.stuck = 0;
      }
      if (g.state === 'back') {
        this.goBack(g, dt);
        continue;
      }
      // The jaws: open wide, then shut, whether or not there is anyone left there to bite.
      if (g.state === 'gape') {
        if (g.t >= GATOR_GAPE) {
          g.state = 'snap';
          g.t = 0;
          this.onSnap?.(g);
          if (f && Gators.bites(g, f.x, f.y)) this.onBite?.(GATOR_BITE);
        }
        continue;
      }
      if (g.state === 'snap') {
        if (g.t >= GATOR_SNAP) {
          g.state = 'recover';
          g.t = 0;
        }
        continue;
      }
      if (g.state === 'recover') {
        if (g.t >= GATOR_RECOVER) {
          g.state = 'chase';
          g.t = 0;
        }
        continue;
      }
      if (!f) continue;
      const dx = f.x - g.x;
      const dy = f.y - g.y;
      const d = Math.hypot(dx, dy) || 1;
      g.h = turn(g.h, Math.atan2(dy, dx), dt * 5);
      if (d > GATOR_REACH - 4) {
        walkStep(g, (dx / d) * GATOR_SPEED * dt, (dy / d) * GATOR_SPEED * dt, 99);
        g.ph += dt * 7;
      } else {
        g.state = 'gape';
        g.t = 0;
        g.h = Math.atan2(dy, dx);
        this.onGape?.(g);
      }
    }
  }

  /** Whether its jaws, shutting now, catch whoever is at (x, y): in reach, and in front of it. */
  static bites(g: Gator, x: number, y: number): boolean {
    return (
      Math.hypot(x - g.x, y - g.y) < GATOR_REACH + 4 &&
      Math.abs(angDiff(g.h, Math.atan2(y - g.y, x - g.x))) < GATOR_ARC
    );
  }

  /** Out of its pool with a splash, onto the bank toward (x, y). */
  private surge(g: Gator, x: number, y: number): void {
    const p = g.pool;
    const a = Math.atan2(y - p.y, x - p.x);
    g.state = 'rise';
    g.t = 0;
    g.from = { x: g.x, y: g.y };
    g.to = { x: p.x + Math.cos(a) * (p.r + 12), y: p.y + Math.sin(a) * (p.r + 12) };
    g.h = a;
    this.onRise?.(g);
  }

  /** Walking back to the edge of its pool, then sliding in; stuck on the way, it slides in from where it is. */
  private goBack(g: Gator, dt: number): void {
    const p = g.pool;
    const a = Math.atan2(g.y - p.y, g.x - p.x);
    const bx = p.x + Math.cos(a) * (p.r + 10);
    const by = p.y + Math.sin(a) * (p.r + 10);
    const dx = bx - g.x;
    const dy = by - g.y;
    const d = Math.hypot(dx, dy);
    if (d > 4) {
      g.h = turn(g.h, Math.atan2(dy, dx), dt * 5);
      const step = Math.min(d, GATOR_SPEED * dt);
      const went = walkStep(g, (dx / d) * step, (dy / d) * step, 99);
      g.ph += dt * 7;
      g.stuck = went > 0 ? 0 : g.stuck + dt;
      if (g.stuck < 1) return;
    }
    g.state = 'sink';
    g.t = 0;
    g.from = { x: g.x, y: g.y };
    g.to = { x: p.x + Math.cos(a) * p.r * LURK_AT, y: p.y + Math.sin(a) * p.r * LURK_AT };
    g.h = a + Math.PI;
  }

  /** Lying low, drifting slowly round its pool. */
  private static drift(g: Gator, dt: number): void {
    const p = g.pool;
    g.a += dt * 0.12;
    g.ph += dt;
    g.x = p.x + Math.cos(g.a) * p.r * LURK_AT;
    g.y = p.y + Math.sin(g.a) * p.r * LURK_AT;
    g.h = g.a + Math.PI / 2;
  }

  /** The game draws them among the island's solids (render/gators.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}

/** An angle turned toward another by no more than step. */
function turn(h: number, to: number, step: number): number {
  const d = angDiff(to, h);
  return Math.abs(d) <= step ? to : h + Math.sign(d) * step;
}
