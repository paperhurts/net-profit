/**
 * The red tar tentacles, the kid's (his answers in his tab "monkey and tentacles for rowan": they are on "all" the tar,
 * "tar tentacles that do 4dm and 2hp"). Out on the tar ocean they come up in the chemistry boat's way as it sails: first
 * the tar bubbles in a red ring ahead of it, then a red tentacle, pale-suckered, rises out of the black and sways. A boat
 * that comes near, it draws back over while a red ring shows on the tar where the boat is, then slaps down there: four
 * off the boat's health, if the boat is still in the ring. Two harpoons and it sinks for good; left alone, it sinks
 * back after a while. None come up for a boat that is sitting still, so fishing stays fishing.
 */

import { rng } from '../core/math';

/** Harpoons to sink one, and what its slap takes off the boat's health (out of 100). */
export const TENT_HP = 2;
export const TENT_DMG = 4;
/** Seconds between risings while the boat is under way; at most this many up at once. */
export const TENT_EVERY = 12;
export const TENT_MAX = 2;
/** It rises this far ahead of the boat, give or take this to the side; only for a boat going at least this fast. */
export const TENT_AHEAD = 260;
export const TENT_SIDE = 120;
export const TENT_UNDER_WAY = 40;
/** Seconds the tar bubbles before it rises; seconds it stays up before it sinks back. */
export const TENT_BUBBLE = 1.2;
export const TENT_LIFE = 10;
export const TENT_SINK = 0.8;
/** It slaps at a boat this near; the slap lands over a ring this wide where the boat was. */
export const TENT_REACH = 110;
export const SLAP_R = 46;
/** Seconds: drawn back over (the warning), the slap, and the time before it can slap again. */
export const TENT_WINDUP = 0.9;
export const TENT_SLAP = 0.3;
export const TENT_RECOVER = 1.4;
/** Coins for one harpooned. */
export const TENT_PRIZE = 50;

export type TentState = 'bubble' | 'up' | 'windup' | 'slap' | 'recover' | 'sink' | 'gone';

export type Tentacle = {
  x: number;
  y: number;
  hp: number;
  state: TentState;
  t: number;
  /** Seconds since it came up. */
  life: number;
  /** Where its slap lands. */
  at: { x: number; y: number };
  flash: number;
  /** Its own sway. */
  seed: number;
  /** Harpooned to nothing, not just sunk back. */
  beaten: boolean;
};

type Boat = { x: number; y: number; h: number; v: number };

export class TarTentacles {
  readonly list: Tentacle[] = [];
  /** Whether they come up at all: the boat out on the open tar. */
  on = false;
  private wait = TENT_EVERY * 0.5;
  private readonly R: () => number;
  onRise: ((t: Tentacle) => void) | null = null;
  onWindup: ((t: Tentacle) => void) | null = null;
  /** A slap landed, and whether the boat was in it. */
  onSlap: ((t: Tentacle, hit: boolean) => void) | null = null;
  onBeaten: ((t: Tentacle) => void) | null = null;

  constructor(seed = 4021) {
    this.R = rng(seed);
  }

  /** None up, and the next a while off. */
  reset(): void {
    this.list.length = 0;
    this.wait = TENT_EVERY * 0.5;
  }

  /** Up out of the tar, where a harpoon can reach it. */
  static up(t: Tentacle): boolean {
    return t.state === 'up' || t.state === 'windup' || t.state === 'slap' || t.state === 'recover';
  }

  /** The nearest one up within range of (x, y). */
  nearest(x: number, y: number, range: number): Tentacle | null {
    let best: Tentacle | null = null;
    let bd = range;
    for (const t of this.list) {
      if (!TarTentacles.up(t)) continue;
      const d = Math.hypot(t.x - x, t.y - y);
      if (d <= bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  }

  /** A harpoon in it: whether it hurt; at none it sinks for good. */
  harpoon(t: Tentacle, power: number): boolean {
    if (!TarTentacles.up(t)) return false;
    t.hp -= power;
    t.flash = 0.2;
    if (t.hp <= 0) {
      t.hp = 0;
      t.beaten = true;
      this.set(t, 'sink');
      this.onBeaten?.(t);
    }
    return true;
  }

  /**
   * A step: the boat (or none, ashore or gone), and where one may come up (on the open tar, away from the docks).
   */
  step(dt: number, boat: Boat | null, may: (x: number, y: number) => boolean): void {
    for (const t of this.list) this.stepOne(t, dt, boat);
    for (let i = this.list.length - 1; i >= 0; i--)
      if (this.list[i]?.state === 'gone') this.list.splice(i, 1);
    if (!this.on || !boat) return;
    if (Math.abs(boat.v) < TENT_UNDER_WAY) return;
    this.wait -= dt;
    if (this.wait > 0 || this.list.length >= TENT_MAX) return;
    // In its way: ahead of the boat, off to one side or the other.
    const side = (this.R() * 2 - 1) * TENT_SIDE;
    const ahead = TENT_AHEAD * (0.8 + this.R() * 0.4);
    const x = boat.x + Math.cos(boat.h) * ahead - Math.sin(boat.h) * side;
    const y = boat.y + Math.sin(boat.h) * ahead + Math.cos(boat.h) * side;
    if (!may(x, y)) {
      this.wait = 1;
      return;
    }
    this.wait = TENT_EVERY * (0.8 + this.R() * 0.4);
    const t: Tentacle = {
      x,
      y,
      hp: TENT_HP,
      state: 'bubble',
      t: 0,
      life: 0,
      at: { x, y },
      flash: 0,
      seed: this.R() * 10,
      beaten: false,
    };
    this.list.push(t);
  }

  /** Whether a slap landing now catches a boat at (x, y). */
  static catches(t: Tentacle, x: number, y: number): boolean {
    return Math.hypot(x - t.at.x, y - t.at.y) < SLAP_R;
  }

  private stepOne(t: Tentacle, dt: number, boat: Boat | null): void {
    t.t += dt;
    t.flash = Math.max(0, t.flash - dt);
    if (t.state === 'gone') return;
    if (t.state === 'sink') {
      if (t.t >= TENT_SINK) t.state = 'gone';
      return;
    }
    if (t.state === 'bubble') {
      if (t.t >= TENT_BUBBLE) {
        this.set(t, 'up');
        this.onRise?.(t);
      }
      return;
    }
    t.life += dt;
    if (t.state === 'windup') {
      if (t.t >= TENT_WINDUP) {
        this.set(t, 'slap');
        const hit = !!boat && TarTentacles.catches(t, boat.x, boat.y);
        this.onSlap?.(t, hit);
      }
      return;
    }
    if (t.state === 'slap') {
      if (t.t >= TENT_SLAP) this.set(t, 'recover');
      return;
    }
    if (t.state === 'recover' && t.t < TENT_RECOVER) return;
    if (t.state === 'recover') this.set(t, 'up');
    // Up: sinking back once it has been up long enough, else slapping at a boat in reach.
    if (t.life >= TENT_LIFE || !this.on) {
      this.set(t, 'sink');
      return;
    }
    if (boat && Math.hypot(boat.x - t.x, boat.y - t.y) < TENT_REACH) {
      t.at = { x: boat.x, y: boat.y };
      this.set(t, 'windup');
      this.onWindup?.(t);
    }
  }

  private set(t: Tentacle, s: TentState): void {
    t.state = s;
    t.t = 0;
  }
}
