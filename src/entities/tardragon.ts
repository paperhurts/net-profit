/**
 * The tar dragon, the kid's (his sixth list's drawing: a winged tar dragon with lots of legs; his answers: the tar
 * creatures do 3 to 5 damage and take 15 to 20 hits; the owner's rule that every blow is wound up so it can be dodged).
 * It circles high over the tar island's south-east slope, black and glossy as the tar, bat wings, a row of legs
 * curled under it, a long tail dripping tar. Come near under it and it shrieks and comes for you, and round and round:
 *
 *  - up high it rears back, its throat glowing, while three red rings in a row show where its tar will land, then
 *    spits three balls of tar into them: out of the rings;
 *  - it hangs in the air, wings up, while a red lane shows along the ground through where you stand, then swoops down
 *    it and lands at its end: off the lane;
 *  - down on the ground after a swoop, it pants a moment before it climbs back up.
 *
 * Up high a spear cannot reach it; down low it can. Each blow is three hearts. Beaten, it falls and melts away,
 * leaving coins. Every landing it is back.
 */

import { onTarIsle, TAR_ISLE } from '../world/tarisle';
import type { DrawView, Entity, Layer, World } from './entity';

export const DRAGON_HP = 18;
/** Hearts a ball of tar or its swoop takes. */
export const DRAGON_DMG = 3;
/** Coins it leaves. */
export const DRAGON_PRIZE = 500;
/** Where it circles, over the island's south-east slope, and how wide; it wakes for the figure this near the middle. */
export const DRAGON_ROOST = { x: TAR_ISLE.x + 275, y: TAR_ISLE.y + 245 } as const;
export const ROOST_R = 80;
export const DRAGON_WAKE = 120;
/** It gives up and goes back to circling when the figure is this far from the middle. */
export const DRAGON_LEASH = 330;
/** How high it flies; under this, a spear reaches it. */
export const DRAGON_HIGH = 110;
export const LOW_Z = 34;
/** It flies at this up high; the figure walks at 85. */
export const DRAGON_FLY = 70;
/** Seconds of shrieking as it wakes; of hanging about over the figure, this far off, between blows. */
export const SHRIEK_T = 1;
export const HOVER_T = 1.2;
export const HOVER_OFF = 130;
/** It goes for its next blow when it has got round to its place off the figure, or after this at most. */
export const HOVER_MAX = 2.6;
/** How hard it is drawn round to the figure's far side. */
const FAR_PULL = 1.1;
/** The spit: the warning, the balls' flight, the ring each lands in, three in a row this far apart. */
export const SPIT_WINDUP = 0.8;
export const BALL_T = 0.6;
export const BALL_R = 30;
export const BALL_GAP = 58;
/** The swoop: the warning; the dive along the lane, on past the figure by this; the lane's half width. */
export const AIM_T = 1;
export const SWOOP_T = 0.7;
export const SWOOP_PAST = 90;
export const SWOOP_W = 24;
/** Down on the ground after a swoop, open; the climb back up. */
export const LANDED_T = 2.4;
export const CLIMB_T = 0.9;
/** A stun holds it down this much longer, once a landing. */
export const HOLD_T = 1;
/** Seconds it takes to fall and melt away. */
export const DRAGON_MELT = 1.8;

export type DragonState =
  | 'circle'
  | 'shriek'
  | 'hover'
  | 'spit'
  | 'volley'
  | 'aim'
  | 'swoop'
  | 'landed'
  | 'climb'
  | 'back'
  | 'melt'
  | 'gone';

type Pt = { x: number; y: number };

export class TarDragon implements Entity {
  x: number = DRAGON_ROOST.x + ROOST_R;
  y: number = DRAGON_ROOST.y;
  /** How high it is off the ground. */
  z = DRAGON_HIGH;
  h = Math.PI / 2;
  hp = DRAGON_HP;
  state: DragonState = 'circle';
  t = 0;
  flash = 0;
  /** Whether the figure is on the tar island. */
  here = false;
  /** Round its circle. */
  round = 0;
  /** Where its three balls of tar will land, and where they fly from. */
  balls: Pt[] = [];
  spitFrom: Pt = { x: 0, y: 0 };
  /** The swoop's lane, from where it hangs to where it lands. */
  from: Pt = { x: 0, y: 0 };
  to: Pt = { x: 0, y: 0 };
  /** The blow landing this frame: the balls splatting, or the swoop going by low. */
  blow: 'spit' | 'swoop' | null = null;
  /** Whether its next blow is the spit; whether a stun has held it down this landing. */
  private spitNext = true;
  private held = false;
  /** Whether its swoop has caught the figure, and who else it has, so it catches each once. */
  private figCaught = false;
  private swept = new Set<object>();
  onRise: (() => void) | null = null;
  onSpit: (() => void) | null = null;
  onAim: (() => void) | null = null;
  onSplat: (() => void) | null = null;
  onLand: (() => void) | null = null;
  onHit: ((n: number) => void) | null = null;
  onBeaten: (() => void) | null = null;

  /**
   * What it circles over, the tar island's roost, and the ground its swoop lands on: the island; or, on the Battle
   * Barge, a spot over its deck, and the deck.
   */
  constructor(
    readonly roost: { x: number; y: number } = DRAGON_ROOST,
    readonly ground: (x: number, y: number) => boolean = onTarIsle,
  ) {
    this.x = roost.x + ROOST_R;
    this.y = roost.y;
  }

  /** Off its circle and after the figure at once, as on the Battle Barge. */
  wake(): void {
    if (this.state !== 'circle') return;
    this.set('shriek');
    this.onRise?.();
  }

  /** Back up circling, whole: each landing. */
  reset(): void {
    this.round = 0;
    this.x = this.roost.x + ROOST_R;
    this.y = this.roost.y;
    this.z = DRAGON_HIGH;
    this.h = Math.PI / 2;
    this.hp = DRAGON_HP;
    this.state = 'circle';
    this.t = 0;
    this.flash = 0;
    this.balls = [];
    this.blow = null;
    this.spitNext = true;
    this.held = false;
    this.swept.clear();
  }

  /** The figure has gone back aboard: up circling again, unless it was beaten, which keeps it gone till next landing. */
  away(): void {
    this.here = false;
    if (this.state === 'melt' || this.state === 'gone') this.state = 'gone';
    else this.reset();
  }

  /** Awake and fighting. */
  get up(): boolean {
    return (
      this.here &&
      this.state !== 'circle' &&
      this.state !== 'back' &&
      this.state !== 'melt' &&
      this.state !== 'gone'
    );
  }

  /** Down where a spear can reach it. */
  get low(): boolean {
    return this.up && this.z < LOW_Z;
  }

  /** A hit, only down low; at none it falls and melts. Whether it hurt. */
  hit(power: number): boolean {
    if (!this.low) return false;
    this.hp -= power;
    this.flash = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.balls = [];
      this.set('melt');
      this.onBeaten?.();
    }
    return true;
  }

  /** A stun on the ground holds it down a moment longer, once a landing. */
  stun(_s: number): void {
    if (this.state !== 'landed' || this.held) return;
    this.held = true;
    this.t = Math.max(0, this.t - HOLD_T);
  }

  update(dt: number, w: World): void {
    this.blow = null;
    if (!this.here) {
      // Seen from the boat, it goes round and round over the island.
      if (this.state === 'circle') this.circle(dt);
      return;
    }
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    if (this.state === 'gone') return;
    if (this.state === 'melt') {
      this.z = Math.max(0, this.z - 220 * dt);
      if (this.t >= DRAGON_MELT) this.state = 'gone';
      return;
    }
    const fig = w.figure;
    const far = !fig || Math.hypot(fig.x - this.roost.x, fig.y - this.roost.y) > DRAGON_LEASH;
    if (this.state === 'circle') {
      this.circle(dt);
      if (fig && Math.hypot(fig.x - this.roost.x, fig.y - this.roost.y) < DRAGON_WAKE) {
        this.set('shriek');
        this.onRise?.();
      }
      return;
    }
    if (this.state === 'back') {
      if (!far && fig && Math.hypot(fig.x - this.roost.x, fig.y - this.roost.y) < DRAGON_WAKE) {
        this.set('shriek');
        this.onRise?.();
        return;
      }
      const a = Math.atan2(this.y - this.roost.y, this.x - this.roost.x);
      this.z = Math.min(DRAGON_HIGH, this.z + 60 * dt);
      if (
        this.fly(this.roost.x + Math.cos(a) * ROOST_R, this.roost.y + Math.sin(a) * ROOST_R, dt)
      ) {
        this.round = a;
        this.set('circle');
      }
      return;
    }
    if (this.state === 'landed') {
      if (this.t >= LANDED_T) this.set('climb');
      return;
    }
    if (this.state === 'climb') {
      this.z = Math.min(DRAGON_HIGH, (DRAGON_HIGH * this.t) / CLIMB_T);
      if (this.t >= CLIMB_T) this.set(far ? 'back' : 'hover');
      return;
    }
    if (this.state === 'volley') {
      if (this.t >= BALL_T) {
        this.blow = 'spit';
        this.onSplat?.();
        if (fig && this.catches(fig.x, fig.y)) this.onHit?.(DRAGON_DMG);
        this.balls = [];
        this.set('hover');
      }
      return;
    }
    if (this.state === 'swoop') {
      const k = Math.min(1, this.t / SWOOP_T);
      this.x = this.from.x + (this.to.x - this.from.x) * k;
      this.y = this.from.y + (this.to.y - this.from.y) * k;
      this.z = DRAGON_HIGH * (1 - k) ** 1.5;
      if (this.z < LOW_Z) {
        this.blow = 'swoop';
        if (fig && !this.figCaught && Math.hypot(fig.x - this.x, fig.y - this.y) < SWOOP_W) {
          this.figCaught = true;
          this.onHit?.(DRAGON_DMG);
        }
      }
      if (k >= 1) {
        this.z = 0;
        this.held = false;
        this.set('landed');
        this.onLand?.();
      }
      return;
    }
    if (!fig) return;
    if (this.state === 'shriek') {
      this.h = Math.atan2(fig.y - this.y, fig.x - this.x);
      if (this.t >= SHRIEK_T) this.set('hover');
      return;
    }
    if (this.state === 'spit') {
      const mid = this.balls[1];
      if (mid) this.h = Math.atan2(mid.y - this.y, mid.x - this.x);
      if (this.t >= SPIT_WINDUP) {
        this.spitFrom = { x: this.x, y: this.y };
        this.set('volley');
      }
      return;
    }
    if (this.state === 'aim') {
      if (this.t >= AIM_T) {
        this.swept.clear();
        this.figCaught = false;
        this.set('swoop');
      }
      return;
    }
    // Hovering: hang about off the figure, then the next blow; off home if the figure has gone too far.
    if (far) {
      this.set('back');
      return;
    }
    const dx = this.x - fig.x;
    const dy = this.y - fig.y;
    const d = Math.hypot(dx, dy) || 1;
    // Off the figure on the far side from the viewer, so up high it is seen out beyond the figure, not over it.
    const sx = dx / d - FAR_PULL;
    const sy = dy / d - FAR_PULL;
    const s = Math.hypot(sx, sy) || 1;
    const hx = fig.x + (sx / s) * HOVER_OFF;
    const hy = fig.y + (sy / s) * HOVER_OFF;
    this.fly(hx, hy, dt);
    const there = Math.hypot(hx - this.x, hy - this.y) < 24;
    this.h = Math.atan2(-dy, -dx);
    if (this.t < HOVER_T || (!there && this.t < HOVER_MAX)) return;
    const ad = Math.hypot(fig.x - this.x, fig.y - this.y) || 1;
    const ux = (fig.x - this.x) / ad;
    const uy = (fig.y - this.y) / ad;
    if (this.spitNext) {
      this.spitNext = false;
      this.balls = [-1, 0, 1].map((i) => ({
        x: fig.x - uy * BALL_GAP * i,
        y: fig.y + ux * BALL_GAP * i,
      }));
      this.set('spit');
      this.onSpit?.();
      return;
    }
    this.spitNext = true;
    this.from = { x: this.x, y: this.y };
    this.to = { x: fig.x, y: fig.y };
    for (const past of [SWOOP_PAST, 60, 30]) {
      const p = { x: fig.x + ux * past, y: fig.y + uy * past };
      if (this.ground(p.x, p.y)) {
        this.to = p;
        break;
      }
    }
    this.h = Math.atan2(uy, ux);
    this.set('aim');
    this.onAim?.();
  }

  /** Whether the balls splatting this frame catch whoever is at (x, y). */
  catches(x: number, y: number): boolean {
    return this.balls.some((b) => Math.hypot(x - b.x, y - b.y) < BALL_R);
  }

  /** Whether its swoop, going by low this frame, catches whoever is at (x, y), someone it has not caught this swoop. */
  sweeps(x: number, y: number, who: object): boolean {
    if (this.blow !== 'swoop' || this.swept.has(who)) return false;
    if (Math.hypot(x - this.x, y - this.y) >= SWOOP_W) return false;
    this.swept.add(who);
    return true;
  }

  /** Whether (x, y) is in the swoop's lane, for the drawing and for the tests. */
  inLane(x: number, y: number): boolean {
    const vx = this.to.x - this.from.x;
    const vy = this.to.y - this.from.y;
    const l2 = vx * vx + vy * vy || 1;
    const k = Math.max(0, Math.min(1, ((x - this.from.x) * vx + (y - this.from.y) * vy) / l2));
    return Math.hypot(x - this.from.x - vx * k, y - this.from.y - vy * k) < SWOOP_W;
  }

  /** Where a ball of tar is in its flight, k from 0 to 1, and how high. */
  ballAt(b: Pt, k: number): { x: number; y: number; z: number } {
    return {
      x: this.spitFrom.x + (b.x - this.spitFrom.x) * k,
      y: this.spitFrom.y + (b.y - this.spitFrom.y) * k,
      z: DRAGON_HIGH * (1 - k) + Math.sin(k * Math.PI) * 30,
    };
  }

  private circle(dt: number): void {
    this.round += dt * 0.5;
    this.x = this.roost.x + Math.cos(this.round) * ROOST_R;
    this.y = this.roost.y + Math.sin(this.round) * ROOST_R;
    this.h = this.round + Math.PI / 2;
  }

  private set(s: DragonState): void {
    this.state = s;
    this.t = 0;
  }

  /** A stretch of flying toward (x, y), over rock or tar; whether it has got there. */
  private fly(x: number, y: number, dt: number): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) return true;
    const s = Math.min(d, DRAGON_FLY * dt);
    this.x += (dx / d) * s;
    this.y += (dy / d) * s;
    this.h = Math.atan2(dy, dx);
    return false;
  }

  /** The game draws it among the island's solids, or over them up high (render/tardragon.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}
