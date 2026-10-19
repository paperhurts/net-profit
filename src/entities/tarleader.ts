/**
 * The tar leader, the kid's boss of the tar island (his sixth list's drawing, a tar man with a sword, 25 hits; his
 * answers: the tar island's boss is "tar leader", up on the "higher area", the tar creatures doing 3 to 5 damage; the
 * owner's rule that every blow is wound up so it can be dodged). He waits up on the high ground beside the sorcerer's
 * old tower, a head taller than his tar humans, a crown of tar spikes, a dripping cape and a long black sword. Come
 * near and he roars and comes down at you. Close in, he draws his sword back while a red fan shows where it will
 * sweep, then sweeps it: out of the fan. From further off he crouches while a red ring shows where he will land, then
 * leaps there: out of the ring. Each is four hearts. Hurt to half, he roars for help and two tar humans rise out of
 * the rock. Beaten, he melts away, leaving his sword. He stays beaten.
 */

import { angDiff } from '../core/math';
import { onTarIsle, TAR_ISLE } from '../world/tarisle';
import type { DrawView, Entity, Layer, World } from './entity';
import { type Fan, inSwept } from './reaper';
import { walkStep } from './walker';

export const LEADER_HP = 25;
/** Hearts his sword or his landing takes. */
export const LEADER_DMG = 4;
/** Where he waits: the high ground, on the hilltop beside the tower, on its side toward the viewer. */
export const LEADER_HOME = { x: TAR_ISLE.x + 88, y: TAR_ISLE.y - 15 } as const;
/** He wakes for the figure this near. */
export const LEADER_WAKE = 190;
/** He walks at this; the figure at 85. */
export const LEADER_SPEED = 40;
/** Seconds of roaring as he wakes. */
export const LEADER_RISE = 1;
/** The sweep: from this near, a fan this far out and this wide; the warning, the swing, the time he is open after. */
export const SWEEP_FROM = 50;
export const SWEEP_REACH = 64;
export const SWEEP_HALF = 1.15;
export const SWEEP_WINDUP = 1;
export const SWEEP_T = 0.3;
export const SWEEP_RECOVER = 1;
/** The leap: from this far to this far, no sooner than this after the last; the ring; the crouch, the flight, after. */
export const LEAP_NEAR = 95;
export const LEAP_FAR = 250;
export const LEAP_EVERY = 5;
export const LEAP_R = 38;
export const CROUCH_T = 1.1;
export const LEAP_T = 0.45;
export const LEAP_RECOVER = 1.2;
/** Seconds of roaring for help, at half his hits. */
export const CALL_T = 1.2;
/** Seconds he takes to melt away. */
export const LEADER_MELT = 2;
/** Coins he leaves. */
export const LEADER_PRIZE = 3000;

export type LeaderState =
  | 'wait'
  | 'rise'
  | 'chase'
  | 'windup'
  | 'sweep'
  | 'crouch'
  | 'leap'
  | 'recover'
  | 'call'
  | 'back'
  | 'melt'
  | 'gone';

export class TarLeader implements Entity {
  x: number = LEADER_HOME.x;
  y: number = LEADER_HOME.y;
  h = Math.PI * 0.75;
  hp = LEADER_HP;
  state: LeaderState = 'wait';
  t = 0;
  flash = 0;
  stunT = 0;
  /** Whether the figure is on the tar island, and whether he has been beaten for good. */
  here = false;
  beaten = false;
  /** The sweep's fan; the leap's start and where it lands. */
  fan: Fan | null = null;
  from = { x: LEADER_HOME.x, y: LEADER_HOME.y };
  to = { x: LEADER_HOME.x, y: LEADER_HOME.y };
  /** Seconds since his last leap; whether he has called for help yet. */
  sinceLeap = LEAP_EVERY;
  called = false;
  step = 0;
  /** The blow that landed this frame, if one did; how long he is open after the last. */
  blow: 'sweep' | 'land' | null = null;
  private openFor = SWEEP_RECOVER;
  onRise: (() => void) | null = null;
  onWindup: (() => void) | null = null;
  onCrouch: (() => void) | null = null;
  onStrike: ((hit: boolean) => void) | null = null;
  onHit: ((n: number) => void) | null = null;
  onCall: ((x: number, y: number) => void) | null = null;
  onBeaten: (() => void) | null = null;

  /**
   * Where he stands, up on the tar island's high ground, and the ground he leaps onto: the island's; or, on the Battle
   * Barge, his spot on its deck and the deck.
   */
  constructor(
    readonly home: { x: number; y: number } = LEADER_HOME,
    readonly ground: (x: number, y: number) => boolean = onTarIsle,
  ) {
    this.x = home.x;
    this.y = home.y;
    this.from = { ...home };
    this.to = { ...home };
  }

  /** Up out of his wait and after the figure at once, as on the Battle Barge. */
  wake(): void {
    if (this.state !== 'wait') return;
    this.set('rise');
    this.onRise?.();
  }

  /** Back up on the high ground, whole: each landing, until he is beaten. */
  reset(): void {
    this.x = this.home.x;
    this.y = this.home.y;
    this.h = Math.PI * 0.75;
    this.hp = LEADER_HP;
    this.state = this.beaten ? 'gone' : 'wait';
    this.t = 0;
    this.flash = 0;
    this.stunT = 0;
    this.fan = null;
    this.sinceLeap = LEAP_EVERY;
    this.called = false;
  }

  /** Awake and fighting. */
  get up(): boolean {
    return (
      this.here &&
      this.state !== 'wait' &&
      this.state !== 'back' &&
      this.state !== 'melt' &&
      this.state !== 'gone'
    );
  }

  /** Something to throw at: awake, or waiting up there to be woken by a spear. */
  get there(): boolean {
    return this.here && this.state !== 'melt' && this.state !== 'gone';
  }

  /** A hit; at half he roars for help, at none he melts. Whether it hurt. */
  hit(power: number): boolean {
    if (!this.there) return false;
    if (this.state === 'wait' || this.state === 'back') {
      this.set('rise');
      this.onRise?.();
    }
    this.hp -= power;
    this.flash = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.beaten = true;
      this.fan = null;
      this.set('melt');
      this.onBeaten?.();
      return true;
    }
    if (!this.called && this.hp <= LEADER_HP / 2 && this.state !== 'leap') {
      this.called = true;
      this.fan = null;
      this.set('call');
      this.onCall?.(this.x, this.y);
    }
    return true;
  }

  /** A stun stops a blow being wound up, not one already coming or a leap in the air. */
  stun(s: number): void {
    if (!this.up || this.state === 'sweep' || this.state === 'leap') return;
    this.stunT = Math.max(this.stunT, s);
    if (this.state === 'windup' || this.state === 'crouch') {
      this.fan = null;
      this.set('chase');
    }
  }

  update(dt: number, w: World): void {
    if (!this.here) return;
    this.blow = null;
    this.t += dt;
    this.step += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.sinceLeap += dt;
    const fig = w.figure;
    if (this.state === 'gone') return;
    if (this.state === 'melt') {
      if (this.t >= LEADER_MELT) this.state = 'gone';
      return;
    }
    if (!fig && this.up) this.set('back');
    if (this.state === 'wait') {
      if (fig && Math.hypot(fig.x - this.x, fig.y - this.y) < LEADER_WAKE) {
        this.set('rise');
        this.onRise?.();
      }
      return;
    }
    if (this.state === 'back') {
      if (fig && Math.hypot(fig.x - this.x, fig.y - this.y) < LEADER_WAKE) {
        this.set('rise');
        this.onRise?.();
        return;
      }
      if (this.toward(this.home.x, this.home.y, LEADER_SPEED * 0.8, dt)) this.set('wait');
      return;
    }
    if (!fig) return;
    if (this.state === 'rise') {
      this.h = Math.atan2(fig.y - this.y, fig.x - this.x);
      if (this.t >= LEADER_RISE) this.set('chase');
      return;
    }
    if (this.state === 'call') {
      if (this.t >= CALL_T) this.set('chase');
      return;
    }
    if (this.stunT > 0) {
      this.stunT -= dt;
      return;
    }
    if (this.state === 'windup') {
      if (this.t >= SWEEP_WINDUP) {
        this.set('sweep');
        this.blow = 'sweep';
        const hit = !!this.fan && TarLeader.inFan(this.fan, fig.x, fig.y);
        this.onStrike?.(hit);
        if (hit) this.onHit?.(LEADER_DMG);
      }
      return;
    }
    if (this.state === 'sweep') {
      if (this.t >= SWEEP_T) {
        this.fan = null;
        this.openFor = SWEEP_RECOVER;
        this.set('recover');
      }
      return;
    }
    if (this.state === 'crouch') {
      if (this.t >= CROUCH_T) {
        this.from = { x: this.x, y: this.y };
        this.set('leap');
      }
      return;
    }
    if (this.state === 'leap') {
      const k = Math.min(1, this.t / LEAP_T);
      this.x = this.from.x + (this.to.x - this.from.x) * k;
      this.y = this.from.y + (this.to.y - this.from.y) * k;
      if (k >= 1) {
        this.sinceLeap = 0;
        this.openFor = LEAP_RECOVER;
        this.set('recover');
        this.blow = 'land';
        const hit = Math.hypot(fig.x - this.to.x, fig.y - this.to.y) < LEAP_R;
        this.onStrike?.(hit);
        if (hit) this.onHit?.(LEADER_DMG);
      }
      return;
    }
    if (this.state === 'recover') {
      if (this.t >= this.openFor) this.set('chase');
      return;
    }
    // Chasing: close in, sweep from near, leap from further off.
    const dx = fig.x - this.x;
    const dy = fig.y - this.y;
    const d = Math.hypot(dx, dy);
    const a = Math.atan2(dy, dx);
    if (d <= SWEEP_FROM) {
      this.h = a;
      this.fan = { x: this.x, y: this.y, a0: a - SWEEP_HALF, a1: a + SWEEP_HALF };
      this.set('windup');
      this.onWindup?.();
      return;
    }
    if (
      d >= LEAP_NEAR &&
      d <= LEAP_FAR &&
      this.sinceLeap >= LEAP_EVERY &&
      this.ground(fig.x, fig.y)
    ) {
      this.h = a;
      this.to = { x: fig.x, y: fig.y };
      this.set('crouch');
      this.onCrouch?.();
      return;
    }
    this.toward(fig.x, fig.y, LEADER_SPEED, dt);
  }

  /** Whether the sweep's fan catches whoever is at (x, y). */
  static inFan(f: Fan, x: number, y: number): boolean {
    return inSwept(f, f.a1, x, y, 6, SWEEP_REACH);
  }

  /** Whether the blow landing this frame catches whoever is at (x, y): the sweep's fan, or the leap's ring. */
  catches(x: number, y: number): boolean {
    if (this.blow === 'sweep' && this.fan) return TarLeader.inFan(this.fan, x, y);
    if (this.blow === 'land') return Math.hypot(x - this.to.x, y - this.to.y) < LEAP_R;
    return false;
  }

  /** How far through the sweep's swing, for the drawing. */
  get swing(): number {
    if (this.state === 'windup') return -Math.min(1, this.t / SWEEP_WINDUP);
    if (this.state === 'sweep') return Math.min(1, this.t / SWEEP_T);
    return 0;
  }

  private set(s: LeaderState): void {
    this.state = s;
    this.t = 0;
  }

  /** A step toward (x, y) over the island; whether he has got there. */
  private toward(x: number, y: number, speed: number, dt: number): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) return true;
    const s = Math.min(d, speed * dt);
    walkStep(this, (dx / d) * s, (dy / d) * s, 99);
    this.h = Math.atan2(dy, dx);
    return false;
  }

  /** Which way he faces on the screen, for the drawing: right of the screen or left. */
  static faces(h: number): number {
    return Math.abs(angDiff(h, Math.PI / 4)) < Math.PI / 2 ? 1 : -1;
  }

  /** The game draws him among the island's solids (render/tarleader.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}
