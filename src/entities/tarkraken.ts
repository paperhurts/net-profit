/**
 * The tar kraken, the kid's (his answers in his tab "tar kraken ideas for rowan": a "mix" of three of the four ideas
 * put to him. It is the boss of the whole tar ocean, its arms coming up out of the tar, "but not red": not the red tar
 * tentacles. The evil monkey in the bridge's cage made the tar spread and woke it. And it is so huge you never see all
 * of it: one giant eye in the tar, and its arms all round the boat; harpoon the eye when it opens. Nine hits, "10 dm to
 * boat"; his prize "An tentacle 900 coins").
 *
 * It lies under the middle of the tar ocean, awake once the tar eel is beaten and the monkey caged. Sail the
 * chemistry boat in over it, and:
 *
 *  - its arms come up round the boat, two at a time: each rears back while a red ring on the tar shows where it will
 *    slam, then slams down there, ten off the boat's health if the boat is still in the ring. One harpoon chops one,
 *    and it sinks back. Chop ten,
 *  - and the kraken itself comes up, really mad: the tar heaves, and a giant eye rises out of it ahead of the boat,
 *    with eight of its arms up all round. The eye opens and shuts; while it is open, a harpoon reaches it. The arms
 *    slam at the boat in turns, each with its red ring. Nine harpoons in the eye and it shuts for good and sinks, and
 *    one of its arms is left floating: the prize.
 *
 * Sail off out of its reach and it sinks back down whole, to start over. It is beaten once and for all.
 *
 * On the Battle Barge on the tar it is given a home of its own: awake at once, wherever the boat is, never giving up.
 */

import { rng } from '../core/math';
import { TAR_SEA } from '../world/tarsea';
import type { DrawView, Entity, Layer, World } from './entity';

export const KRAKEN_HP = 9;
/** What an arm's slam takes off the chemistry boat's 100. */
export const KRAKEN_DMG = 10;
/** Coins for beating it. */
export const KRAKEN_PRIZE = 900;
/** Where it lies: under the middle of the tar ocean. It wakes for a boat this near, and gives up on one this far. */
export const LAIR = { x: (TAR_SEA.x0 + TAR_SEA.x1) / 2, y: (TAR_SEA.y0 + TAR_SEA.y1) / 2 } as const;
export const LAIR_R = 700;
export const LAIR_LEASH = 1400;
/** Where it lies, how near a boat wakes it, and how far off it gives up on one. */
export type KrakenHome = { x: number; y: number; wake: number; leash: number };
export const TAR_LAIR: KrakenHome = { ...LAIR, wake: LAIR_R, leash: LAIR_LEASH };
/** Arms to chop before the kraken itself comes up; how many up at once, and how often a new one comes. */
export const ARMS_TO_CHOP = 10;
export const ARMS_UP = 2;
export const ARM_EVERY = 2.2;
/** An arm comes up this far from the boat; it reaches a boat this near; its slam lands over a ring this wide. */
export const ARM_OFF = 170;
export const ARM_REACH = 260;
export const SLAM_R = 52;
/** Seconds: the tar bubbling before it rises; reared back (the warning); the slam; before it can slam again. */
export const ARM_BUBBLE = 1;
export const ARM_WINDUP = 1;
export const ARM_SLAM = 0.3;
export const ARM_RECOVER = 1.4;
/** Seconds it stays up before sinking back on its own; seconds to sink. */
export const ARM_LIFE = 11;
export const ARM_SINK = 0.8;
/** The kraken rising: the tar heaving this long; the eye comes up this far ahead of the boat. */
export const RISE_T = 2.4;
export const EYE_OFF = 230;
/** Its eight arms stand round the boat this far off; one slams every this many seconds. */
export const RING_ARMS = 8;
export const RING_R = 190;
export const RING_EVERY = 2;
/** The eye: shut this long, opening, open this long (a harpoon reaches it), shutting. */
export const EYE_SHUT = 2.4;
export const EYE_OPEN = 2.2;
export const EYE_BLINK = 0.35;
/** Seconds it takes to sink away, beaten; and to sink back whole, given up. */
export const SINK_T = 3;

export type KrakenState = 'sleep' | 'arms' | 'rise' | 'eye' | 'down' | 'sink' | 'gone';
export type ArmState = 'bubble' | 'up' | 'windup' | 'slam' | 'recover' | 'sink' | 'gone';
export type EyeState = 'shut' | 'opening' | 'open' | 'shutting';

export type Arm = {
  x: number;
  y: number;
  state: ArmState;
  t: number;
  life: number;
  /** Where its slam lands. */
  at: { x: number; y: number };
  flash: number;
  seed: number;
  /** One of the eight round the boat once the kraken is up: these do not sink back or get chopped. */
  ring: boolean;
};

type Boat = { x: number; y: number; h: number; v: number };

export class TarKraken implements Entity {
  /** Awake: the eel beaten and the monkey caged, and the kraken not yet beaten. */
  on = false;
  state: KrakenState = 'sleep';
  t = 0;
  hp = KRAKEN_HP;
  /** Arms chopped so far, toward its coming up. */
  chopped = 0;
  readonly arms: Arm[] = [];
  /** The eye, once it is up. */
  eye = { x: 0, y: 0, state: 'shut' as EyeState, t: 0, flash: 0 };
  /** Where the arm left floating lies, once beaten. */
  prize: { x: number; y: number } | null = null;
  private wait = 0;
  private turn = 0;
  private readonly R: () => number;
  onWake: (() => void) | null = null;
  onArm: ((a: Arm) => void) | null = null;
  onWindup: ((a: Arm) => void) | null = null;
  /** A slam landed, and whether the boat was in it. */
  onSlam: ((a: Arm, hit: boolean) => void) | null = null;
  onChop: ((a: Arm, left: number) => void) | null = null;
  onRise: (() => void) | null = null;
  onOpen: (() => void) | null = null;
  onHit: ((left: number) => void) | null = null;
  onBeaten: (() => void) | null = null;
  onGiveUp: (() => void) | null = null;

  constructor(
    seed = 7319,
    readonly home: KrakenHome = TAR_LAIR,
  ) {
    this.R = rng(seed);
  }

  /** Back down under the tar, whole, nothing up. */
  reset(): void {
    this.state = this.state === 'gone' ? 'gone' : 'sleep';
    this.t = 0;
    this.hp = KRAKEN_HP;
    this.chopped = 0;
    this.arms.length = 0;
    this.eye = { x: 0, y: 0, state: 'shut', t: 0, flash: 0 };
    this.prize = null;
    this.wait = 0;
    this.turn = 0;
  }

  /** Beaten once and for all: the game says so from the save. */
  beatenForGood(): void {
    this.reset();
    this.state = 'gone';
  }

  /** Fighting the boat: its arms up, or the kraken itself. */
  get up(): boolean {
    return this.state === 'arms' || this.state === 'rise' || this.state === 'eye';
  }

  /** Whether a harpoon reaches the eye now: up, and open. */
  get eyeOpen(): boolean {
    return this.state === 'eye' && this.eye.state === 'open';
  }

  /** An arm up out of the tar, where a harpoon can chop it: not one of the eight round the boat. */
  static choppable(a: Arm): boolean {
    return (
      !a.ring &&
      (a.state === 'up' || a.state === 'windup' || a.state === 'slam' || a.state === 'recover')
    );
  }

  /** The nearest arm a harpoon can chop within range of (x, y). */
  nearestArm(x: number, y: number, range: number): Arm | null {
    let best: Arm | null = null;
    let bd = range;
    for (const a of this.arms) {
      if (!TarKraken.choppable(a)) continue;
      const d = Math.hypot(a.x - x, a.y - y);
      if (d <= bd) {
        bd = d;
        best = a;
      }
    }
    return best;
  }

  /** A harpoon in an arm: chopped, and it sinks; whether it hurt. Ten chopped and the kraken comes up. */
  chop(a: Arm): boolean {
    if (this.state !== 'arms' || !TarKraken.choppable(a)) return false;
    a.flash = 0.2;
    this.set(a, 'sink');
    this.chopped++;
    this.onChop?.(a, Math.max(0, ARMS_TO_CHOP - this.chopped));
    return true;
  }

  /** A harpoon in the eye: only while it is open. Whether it hurt; at none, it is beaten. */
  harpoonEye(power: number): boolean {
    if (!this.eyeOpen) return false;
    this.hp -= power;
    this.eye.flash = 0.25;
    if (this.hp <= 0) {
      this.hp = 0;
      this.prize = { x: this.eye.x, y: this.eye.y };
      for (const a of this.arms) if (a.state !== 'gone') this.set(a, 'sink');
      this.state = 'down';
      this.t = 0;
      this.onBeaten?.();
      return true;
    }
    this.onHit?.(this.hp);
    return true;
  }

  /** Whether a slam landing now catches a boat at (x, y). */
  static catches(a: Arm, x: number, y: number): boolean {
    return Math.hypot(x - a.at.x, y - a.at.y) < SLAM_R;
  }

  /** A step: the boat on the tar, or none (ashore, docked, or off the tar). */
  step(dt: number, boat: Boat | null): void {
    this.t += dt;
    this.eye.flash = Math.max(0, this.eye.flash - dt);
    for (const a of this.arms) this.stepArm(a, dt, boat);
    for (let i = this.arms.length - 1; i >= 0; i--)
      if (this.arms[i]?.state === 'gone') this.arms.splice(i, 1);
    if (this.state === 'gone') return;
    if (this.state === 'down') {
      if (this.t >= SINK_T) this.state = 'gone';
      return;
    }
    if (this.state === 'sink') {
      if (this.t >= SINK_T) this.reset();
      return;
    }
    const d = boat ? Math.hypot(boat.x - this.home.x, boat.y - this.home.y) : Infinity;
    if (this.state === 'sleep') {
      if (this.on && boat && d < this.home.wake) {
        this.state = 'arms';
        this.t = 0;
        this.wait = 0.6;
        this.onWake?.();
      }
      return;
    }
    // Sailed off out of its reach, or gone ashore: it sinks back, whole.
    if (!boat || d > this.home.leash) {
      for (const a of this.arms) if (a.state !== 'gone' && a.state !== 'sink') this.set(a, 'sink');
      this.state = 'sink';
      this.t = 0;
      this.onGiveUp?.();
      return;
    }
    if (this.state === 'arms') {
      if (this.chopped >= ARMS_TO_CHOP) {
        this.state = 'rise';
        this.t = 0;
        for (const a of this.arms)
          if (a.state !== 'gone' && a.state !== 'sink') this.set(a, 'sink');
        this.eye = {
          x: boat.x + Math.cos(boat.h) * EYE_OFF,
          y: boat.y + Math.sin(boat.h) * EYE_OFF,
          state: 'shut',
          t: 0,
          flash: 0,
        };
        this.onRise?.();
        return;
      }
      this.wait -= dt;
      const up = this.arms.filter((a) => a.state !== 'sink' && a.state !== 'gone').length;
      if (this.wait <= 0 && up < ARMS_UP) {
        this.wait = ARM_EVERY * (0.8 + this.R() * 0.4);
        const a = this.R() * Math.PI * 2;
        this.raise(boat.x + Math.cos(a) * ARM_OFF, boat.y + Math.sin(a) * ARM_OFF, false);
      }
      return;
    }
    if (this.state === 'rise') {
      if (this.t >= RISE_T) {
        this.state = 'eye';
        this.t = 0;
        this.eye.state = 'shut';
        this.eye.t = 0;
        this.turn = RING_EVERY;
        // Eight arms all round the boat.
        for (let i = 0; i < RING_ARMS; i++) {
          const a = (i / RING_ARMS) * Math.PI * 2 + 0.2;
          this.raise(boat.x + Math.cos(a) * RING_R, boat.y + Math.sin(a) * RING_R, true);
        }
      }
      return;
    }
    // Up: the eye opens and shuts; the arms slam at the boat in turns.
    const e = this.eye;
    e.t += dt;
    if (e.state === 'shut' && e.t >= EYE_SHUT) {
      e.state = 'opening';
      e.t = 0;
    } else if (e.state === 'opening' && e.t >= EYE_BLINK) {
      e.state = 'open';
      e.t = 0;
      this.onOpen?.();
    } else if (e.state === 'open' && e.t >= EYE_OPEN) {
      e.state = 'shutting';
      e.t = 0;
    } else if (e.state === 'shutting' && e.t >= EYE_BLINK) {
      e.state = 'shut';
      e.t = 0;
    }
    this.turn -= dt;
    if (this.turn <= 0) {
      this.turn = RING_EVERY;
      // The nearest of the eight that is ready slams at the boat.
      let best: Arm | null = null;
      let bd = Infinity;
      for (const a of this.arms) {
        if (!a.ring || a.state !== 'up') continue;
        const ad = Math.hypot(a.x - boat.x, a.y - boat.y);
        if (ad < bd) {
          bd = ad;
          best = a;
        }
      }
      if (best && bd < ARM_REACH * 1.6) this.windup(best, boat);
    }
  }

  private raise(x: number, y: number, ring: boolean): void {
    const a: Arm = {
      x,
      y,
      state: ring ? 'up' : 'bubble',
      t: 0,
      life: 0,
      at: { x, y },
      flash: 0,
      seed: this.R() * 10,
      ring,
    };
    this.arms.push(a);
    if (!ring) this.onArm?.(a);
  }

  private windup(a: Arm, boat: Boat): void {
    a.at = { x: boat.x, y: boat.y };
    this.set(a, 'windup');
    this.onWindup?.(a);
  }

  private stepArm(a: Arm, dt: number, boat: Boat | null): void {
    a.t += dt;
    a.flash = Math.max(0, a.flash - dt);
    if (a.state === 'gone') return;
    if (a.state === 'sink') {
      if (a.t >= ARM_SINK) a.state = 'gone';
      return;
    }
    if (a.state === 'bubble') {
      if (a.t >= ARM_BUBBLE) this.set(a, 'up');
      return;
    }
    a.life += dt;
    if (a.state === 'windup') {
      if (a.t >= ARM_WINDUP) {
        this.set(a, 'slam');
        const hit = !!boat && TarKraken.catches(a, boat.x, boat.y);
        this.onSlam?.(a, hit);
      }
      return;
    }
    if (a.state === 'slam') {
      if (a.t >= ARM_SLAM) this.set(a, 'recover');
      return;
    }
    if (a.state === 'recover' && a.t < ARM_RECOVER) return;
    if (a.state === 'recover') this.set(a, 'up');
    // The eight round the boat slam only in their turn; the others on their own, at a boat in reach.
    if (a.ring) return;
    if (a.life >= ARM_LIFE) {
      this.set(a, 'sink');
      return;
    }
    if (boat && Math.hypot(boat.x - a.x, boat.y - a.y) < ARM_REACH) this.windup(a, boat);
  }

  private set(a: Arm, s: ArmState): void {
    a.state = s;
    a.t = 0;
  }

  /** The game draws it on the tar (render/tarkraken.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
  update(_dt: number, _w: World): void {}
}
