/**
 * The Reaper on land, the kid's: the second of him ("There are two of him, one
 * on land and one in the water"), on island 6, fought on foot, and the owner's
 * call that beating him gives an egg that hatches into a pet. He is the one in
 * the water's shape on his four clawed legs, a little smaller, and he lies
 * curled asleep by his nest on the sand of a cove on the island's north-west
 * shore, his egg in it.
 *
 * Walk up near the nest and he wakes, gets up roaring, and comes for the
 * figure, faster than it walks. He prowls round it, then does one of two
 * things, in turn. His tail sweep is the one in the water's: a red fan shows on
 * the sand across where the figure is going, from where his head will plant,
 * and his tail sweeps through it like a scythe, so step out of it. And on his
 * legs he can charge: he crouches, a red line shows on the sand from his snout
 * through where the figure is going, and he dashes along it jaws first, so step
 * off it. After either he rears up on his hind legs and roars, and only then
 * does a spear get past his scales to his belly. Past half beaten he is angry:
 * shorter warnings, and two sweeps, there and back.
 *
 * Walk off from his cove and he goes back to his nest and lies down, whole;
 * be bonked out, or leave the island, and he is back at it at once. Beaten, he
 * backs off into the sea and swims away, and leaves his egg in the nest. The
 * game does the hearts, the prize and the egg as callbacks.
 */

import { angDiff, clamp } from '../core/math';
import { drawReaperBody, drawReaperFin } from '../render/reaper';
import {
  COVE_OUT,
  HILL,
  ISLE6,
  NEST6,
  onIsle6,
  onIsle6Ground,
  PALMS6,
  ROCKS6,
  shoreR,
} from '../world/isle6';
import type { DrawView, Entity, Layer, World } from './entity';
import { drawFan, type Fan, inSwept } from './reaper';

/** His length on land, head to tail: a good deal smaller than the one in the water, and still huge on foot. */
export const LAND_LEN = 130;
/** Spear hits to beat him. */
export const LAND_HP = 30;
/** The figure this close to his nest wakes him; this far from it, he gives up and goes back to it. */
export const WAKE_R = 190;
export const LEASH_R = 420;
/** Sighted from this far from his nest: a toast, before he wakes. */
export const SIGHT_R = 330;
/** Getting up off the sand, roaring. */
export const RISE_T = 1.3;
/** He prowls round the figure at about this far, this fast (it walks at 85), this long between attacks. */
export const PROWL_R = 125;
export const PROWL_SPEED = 140;
export const PROWL_T = 2;
export const PROWL_ANGRY = 1.3;
/** The sweep: he closes until his head is this near the figure, then plants his head this far from where it will be. */
export const SWEEP_FROM = 100;
export const HUB = 55;
/** The warning: the fan shows this long before his tail sweeps (shorter angry, and for the sweep back). */
export const COIL_T = 1.25;
export const COIL_ANGRY = 1.05;
export const COIL_BACK = 1;
/** He gets his head to the hub this much before the end of the warning, at up to this. */
export const SURGE_LEAD = 0.35;
export const SURGE = 320;
/** The sweep: how long, how far his tail reaches from his head, and how wide each side of where the figure will be. */
export const SWEEP_T = 0.4;
export const REACH = 115;
export const SPAN = 1;
/** The charge: the crouch (its warning, while the line shows), the dash, and how far past where he aimed it runs. */
export const CROUCH_T = 0.8;
export const CROUCH_ANGRY = 0.7;
export const DASH_SPEED = 420;
export const DASH_PAST = 50;
/** He charges only from this far; nearer, he backs off a step first. */
export const CHARGE_FROM = 90;
/** His jaws bite a figure this close to his snout's line as he dashes. */
export const BITE_R = 16;
/** The size of a figure, for the fan and the line. */
export const FIGURE_R = 7;
/** After an attack he closes to this far from the figure, for up to this long, and rears up. */
export const REAR_AT = 85;
export const CLOSE_T = 0.6;
export const CLOSE_SPEED = 240;
/** Reared up on his hind legs, roaring: the spear's chance. Then down on all fours again. */
export const REAR_T = 1.8;
export const DROP_T = 0.4;
/** Nothing walks through his middle. */
export const BODY_R = 24;
/** Beaten: slumped this long, then off to the sea at this pace, and his fin seen going this long in the water. */
export const BEATEN_T = 1;
export const FLEE_SPEED = 120;
export const FLEE_T = 1.6;
/** Back to his nest, at this pace. */
export const HOME_SPEED = 110;

/** Stopped dead by a jar of honey, shaking, this long before he runs for the sea. */
export const SHY_T = 1.4;

export type LandReaperState =
  | 'sleep'
  | 'rise'
  | 'prowl'
  | 'coil'
  | 'sweep'
  | 'crouch'
  | 'dash'
  | 'close'
  | 'rear'
  | 'drop'
  | 'home'
  | 'beaten'
  | 'flee'
  | 'shy'
  | 'run'
  | 'away'
  | 'gone';

/** The line of a charge: from where he crouched, along to where he will stop. */
export type Dash = { x0: number; y0: number; x1: number; y1: number };

/**
 * Where he lies by his nest, and which way: along the shore at the water's edge, his tail toward the sea, the nest
 * in front of him on the island's side, so the egg shows.
 */
export const REST = {
  x: NEST6.x + COVE_OUT.x * 30,
  y: NEST6.y + COVE_OUT.y * 30,
  h: Math.atan2(COVE_OUT.x, -COVE_OUT.y),
} as const;

/**
 * His ground: where he lies, the nest the figure is measured from (to wake him, and to give up), how near wakes him and
 * how far he gives up, the figure being on his ground at all, keeping him on it, its edge for a charge's line, the sea
 * for him to flee into, and the way to it. Island 6's cove by default; the Battle Barge gives him its deck.
 */
export type Lair = {
  rest: { x: number; y: number; h: number };
  nest: { x: number; y: number };
  wake: number;
  leash: number;
  onGround(x: number, y: number): boolean;
  inLine(x: number, y: number): boolean;
  keep(p: { x: number; y: number }): void;
  inSea(x: number, y: number): boolean;
  seaward(x: number, y: number): number;
};

/** Island 6's: his cove on the north-west shore, the island's sand, off the hill, the palms and the rocks. */
export const ISLE6_LAIR: Lair = {
  rest: REST,
  nest: NEST6,
  wake: WAKE_R,
  leash: LEASH_R,
  onGround: onIsle6,
  inLine: onIsle6Ground,
  keep(p) {
    const a = Math.atan2(p.y - ISLE6.y, p.x - ISLE6.x);
    const r = Math.hypot(p.x - ISLE6.x, p.y - ISLE6.y);
    const max = shoreR(a) - 30;
    if (r > max) {
      p.x = ISLE6.x + Math.cos(a) * max;
      p.y = ISLE6.y + Math.sin(a) * max;
    }
    const off = (cx: number, cy: number, min: number) => {
      const d = Math.hypot(p.x - cx, p.y - cy) || 1;
      if (d < min) {
        p.x = cx + ((p.x - cx) / d) * min;
        p.y = cy + ((p.y - cy) / d) * min;
      }
    };
    off(HILL.x, HILL.y, HILL.r + 30);
    for (const [px, py] of PALMS6) off(px, py, 16);
    for (const [px, py] of ROCKS6) off(px, py, 18);
  },
  inSea(x, y) {
    const a = Math.atan2(y - ISLE6.y, x - ISLE6.x);
    return Math.hypot(x - ISLE6.x, y - ISLE6.y) > shoreR(a) + 10;
  },
  seaward(x, y) {
    return Math.atan2(y - ISLE6.y, x - ISLE6.x);
  },
};

/**
 * A round deck of this middle and radius, him lying at a spot on it facing its middle: the Battle Barge's. He wakes
 * at once and never gives up, and beaten he goes over the side into the sea.
 */
export function deckLair(
  room: { x: number; y: number; r: number },
  at: { x: number; y: number },
): Lair {
  const out = (x: number, y: number) => Math.hypot(x - room.x, y - room.y);
  return {
    rest: { x: at.x, y: at.y, h: Math.atan2(room.y - at.y, room.x - at.x) },
    nest: { x: room.x, y: room.y },
    wake: Number.POSITIVE_INFINITY,
    leash: Number.POSITIVE_INFINITY,
    onGround: (x, y) => out(x, y) < room.r + 20,
    inLine: (x, y) => out(x, y) < room.r - 20,
    keep(p) {
      const d = out(p.x, p.y);
      const max = room.r - 30;
      if (d > max) {
        p.x = room.x + ((p.x - room.x) / d) * max;
        p.y = room.y + ((p.y - room.y) / d) * max;
      }
    },
    inSea: (x, y) => out(x, y) > room.r + 10,
    seaward: (x, y) => Math.atan2(y - room.y, x - room.x),
  };
}

/** The way he faces drawn side on, toward screen right (1) or left (-1). */
const SIDE_R = -Math.PI / 4;
const SIDE_L = (3 * Math.PI) / 4;
/** Which way a heading faces on the screen: right or left. */
function screenSide(h: number): number {
  return Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
}
const sideOn = (h: number) => (screenSide(h) > 0 ? SIDE_R : SIDE_L);

/** Distance from a point to a segment. */
function offLine(x: number, y: number, d: Dash): number {
  const vx = d.x1 - d.x0;
  const vy = d.y1 - d.y0;
  const l2 = vx * vx + vy * vy || 1;
  const k = clamp(((x - d.x0) * vx + (y - d.y0) * vy) / l2, 0, 1);
  return Math.hypot(x - (d.x0 + vx * k), y - (d.y0 + vy * k));
}

export class LandReaper implements Entity {
  state: LandReaperState = 'sleep';
  x: number;
  y: number;
  /** His true heading, which the sweep pivots; drawn, he is turned side on but for the sweep. */
  h: number;
  t = 0;
  hp = LAND_HP;
  flash = 0;
  /** How far up on his hind legs, 0 on all fours to 1 reared. */
  up = 0;
  /** The fan of the sweep coming, or under way; the line of the charge coming, or under way. */
  fan: Fan | null = null;
  dash: Dash | null = null;
  /** Seconds left stuck with tar on his face. */
  stunT = 0;
  /** The figure was within sight of his cove. */
  private seen = false;
  private side = 1;
  private back = false;
  private bit = false;
  private swept = false;
  /** Whether the next attack is the charge (else the sweep). The first is. */
  private chargeNext = true;
  /** Fleeing, when he was last on the sand. */
  private wet = 0;
  /** Drawn heading, eased toward side on (or his true heading in a sweep); and his legs' going. */
  private drawH: number;
  private gait = 0;
  /** Sighted, asleep by his nest, the first time. */
  onSight: (() => void) | null = null;
  /** He woke and is getting up. */
  onWake: (() => void) | null = null;
  /** A fan or a line shows: an attack is coming. */
  onWarn: ((what: 'sweep' | 'charge') => void) | null = null;
  /** His tail or his jaws caught the figure. The game takes the heart. */
  onHit: ((by: 'tail' | 'bite') => void) | null = null;
  /**
   * The sweep or the charge has struck: hits says whether a helper at x, y this big was caught in it, so the game
   * can hurt whoever was in the way.
   */
  onBlow: ((hits: (x: number, y: number, r: number) => boolean) => void) | null = null;
  /** Up on his hind legs, roaring: the spear's chance. */
  onRear: (() => void) | null = null;
  /** A spear struck him. */
  onHurt: (() => void) | null = null;
  /** He gave up and went back to his nest. */
  onGiveUp: (() => void) | null = null;
  /** Beaten: he backs off into the sea, and the egg is the figure's. */
  onBeaten: (() => void) | null = null;

  /** On his ground: island 6's, or the Battle Barge's deck. */
  constructor(readonly lair: Lair = ISLE6_LAIR) {
    this.x = lair.rest.x;
    this.y = lair.rest.y;
    this.h = lair.rest.h;
    this.drawH = sideOn(lair.rest.h);
  }

  /** Half beaten or more. */
  get angry(): boolean {
    return this.hp <= LAND_HP / 2;
  }

  /** Awake and after the figure: for the hearts, the helpers and the tarling's tar. */
  get awake(): boolean {
    return (
      this.state !== 'sleep' &&
      this.state !== 'home' &&
      this.state !== 'beaten' &&
      this.state !== 'flee' &&
      this.state !== 'shy' &&
      this.state !== 'run' &&
      this.state !== 'away' &&
      this.state !== 'gone'
    );
  }

  /**
   * A jar of honey held up at him, the kid's (the Reaper is afraid of it): only while he is after the figure. He stops
   * dead and shakes all over for SHY_T, then runs splashing into the sea, and stays away until the figure leaves his
   * ground, when he is back asleep by his nest, whole. It is not a win: no egg for it. Returns whether it took.
   */
  scare(): boolean {
    if (!this.awake) return false;
    this.fan = null;
    this.dash = null;
    this.stunT = 0;
    this.go('shy');
    return true;
  }

  /** Reared up: the only time a spear gets past his scales. */
  get open(): boolean {
    return this.state === 'rear' && this.up > 0.5;
  }

  /** Beaten for good, as a save remembers: gone, the nest left to the figure. */
  beatenForGood(): void {
    this.state = 'gone';
    this.fan = null;
    this.dash = null;
  }

  /** Back asleep by his nest for a rematch, whole, whatever happened before: the tester panel's. */
  rematch(): void {
    this.state = 'sleep';
    this.reset();
  }

  /** Back asleep by his nest, whole, as when the figure is bonked out or leaves the island. */
  reset(): void {
    if (this.state === 'gone' || this.state === 'beaten' || this.state === 'flee') return;
    this.state = 'sleep';
    this.t = 0;
    const r = this.lair.rest;
    this.x = r.x;
    this.y = r.y;
    this.h = r.h;
    this.drawH = sideOn(r.h);
    this.hp = LAND_HP;
    this.up = 0;
    this.flash = 0;
    this.fan = null;
    this.dash = null;
    this.stunT = 0;
    this.back = false;
    this.chargeNext = true;
  }

  /**
   * A spear, a bolt or a blow struck him with this power. It counts while he is reared up, or if it was let go
   * while he was (fired), though he is down by the time it lands; otherwise it glances off his scales.
   */
  hit(power: number, fired = false): boolean {
    if (!this.open && !(fired && this.awake)) return false;
    this.hp = Math.max(0, this.hp - power);
    this.flash = 1;
    this.onHurt?.();
    if (this.hp <= 0) {
      this.fan = null;
      this.dash = null;
      this.go('beaten');
    }
    return true;
  }

  /**
   * Tar on his face. Only reared up does anything reach his face (the helpers go for him only then), and it holds
   * him there, stuck and pawing at it, this many seconds longer: more time for the spear. Tar that cancelled his
   * sweeps and charges would have had the tarling, which everyone here has, stop him ever rearing at all.
   */
  stun(s: number): void {
    if (this.state !== 'rear') return;
    this.stunT = Math.max(this.stunT, s);
  }

  /** His head: the front of him, where a sweep pivots. */
  get head(): { x: number; y: number } {
    return {
      x: this.x + (Math.cos(this.h) * LAND_LEN) / 2,
      y: this.y + (Math.sin(this.h) * LAND_LEN) / 2,
    };
  }

  private go(s: LandReaperState): void {
    this.state = s;
    this.t = 0;
  }

  update(dt: number, w: World): void {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    if (this.state === 'gone') return;
    if (this.state === 'beaten') {
      this.up = Math.max(0, this.up - dt * 3);
      this.ease(dt);
      if (this.t >= BEATEN_T) {
        this.go('flee');
        this.onBeaten?.();
      }
      return;
    }
    if (this.state === 'shy') {
      this.up = Math.max(0, this.up - dt * 3);
      this.ease(dt);
      if (this.t >= SHY_T) this.go('run');
      return;
    }
    if (this.state === 'run') {
      // As he flees when beaten: down the sand, into the water, splashing, and away under it.
      const a = this.lair.seaward(this.x, this.y);
      this.walk(this.x + Math.cos(a) * 200, this.y + Math.sin(a) * 200, FLEE_SPEED, dt, false);
      if (!this.inSea) this.wet = this.t;
      this.ease(dt);
      if (this.t - this.wet >= FLEE_T || this.t >= 12) this.go('away');
      return;
    }
    if (this.state === 'flee') {
      // Off down the sand to the nearest water, into the sea, and away under it.
      const a = this.lair.seaward(this.x, this.y);
      this.walk(this.x + Math.cos(a) * 200, this.y + Math.sin(a) * 200, FLEE_SPEED, dt, false);
      if (!this.inSea) this.wet = this.t;
      this.ease(dt);
      if (this.t - this.wet >= FLEE_T || this.t >= 12) this.go('gone');
      return;
    }
    const L = this.lair;
    const f = w.figure && L.onGround(w.figure.x, w.figure.y) ? w.figure : null;
    const fromNest = f ? Math.hypot(f.x - L.nest.x, f.y - L.nest.y) : Number.POSITIVE_INFINITY;
    if (!this.seen && f && fromNest < SIGHT_R) {
      this.seen = true;
      this.onSight?.();
    }
    if (!f) {
      this.reset();
      return;
    }
    if (this.state === 'away') return;
    if (this.state === 'sleep') {
      if (fromNest < L.wake) {
        this.go('rise');
        this.onWake?.();
      }
      this.ease(dt);
      return;
    }
    if (this.state === 'home') {
      if (fromNest < L.wake) {
        this.go('prowl');
        return;
      }
      if (Math.hypot(L.rest.x - this.x, L.rest.y - this.y) < 6) {
        this.reset();
        return;
      }
      this.walk(L.rest.x, L.rest.y, HOME_SPEED, dt, false);
      this.ease(dt);
      return;
    }
    if (fromNest > L.leash && this.state !== 'sweep' && this.state !== 'dash') {
      this.fan = null;
      this.dash = null;
      this.back = false;
      this.up = 0;
      this.hp = LAND_HP;
      this.go('home');
      this.onGiveUp?.();
      return;
    }
    if (this.stunT > 0) {
      // Stuck: his clock waits too, so he stays up as long again.
      this.stunT -= dt;
      this.t -= dt;
      this.ease(dt);
      return;
    }
    this.fight(dt, f);
    // Pivoting on his head, or dashing along his line, he goes where the move takes him.
    if (this.state !== 'coil' && this.state !== 'sweep' && this.state !== 'dash') this.keepOn();
    this.ease(dt);
  }

  private fight(dt: number, f: { x: number; y: number; vx: number; vy: number }): void {
    const dx = f.x - this.x;
    const dy = f.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    switch (this.state) {
      case 'rise':
        this.up = Math.sin(Math.min(1, this.t / RISE_T) * Math.PI) * 0.6;
        this.h += clamp(angDiff(Math.atan2(dy, dx), this.h), -2 * dt, 2 * dt);
        if (this.t >= RISE_T) {
          this.up = 0;
          this.go('prowl');
        }
        break;
      case 'prowl': {
        // Round the figure at PROWL_R, then in for the sweep, or crouching where he is for the charge.
        this.up = Math.max(0, this.up - dt * 3);
        const ready = this.t >= (this.angry ? PROWL_ANGRY : PROWL_T);
        // Too close to charge, he backs off a step first; kept close, he sweeps instead.
        if (ready && this.chargeNext && this.t > (this.angry ? PROWL_ANGRY : PROWL_T) + 1.2)
          this.chargeNext = false;
        if (ready && this.chargeNext) {
          if (d >= CHARGE_FROM) this.crouch(f);
          else this.walk(this.x - (dx / d) * 60, this.y - (dy / d) * 60, PROWL_SPEED, dt);
          break;
        }
        const hd = this.head;
        if (ready && Math.hypot(f.x - hd.x, f.y - hd.y) < SWEEP_FROM) {
          this.coil(f, false);
          break;
        }
        const a = Math.atan2(this.y - f.y, this.x - f.x) + this.side * 0.5;
        const r = ready ? 0 : PROWL_R;
        this.walk(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, PROWL_SPEED, dt);
        break;
      }
      case 'coil': {
        // Surging to plant his head at the hub, then pivoting on it to bring his tail round to the fan's edge.
        const fan = this.fan as Fan;
        const warn = this.warnT;
        const left = warn - this.t;
        const hd = this.head;
        const gx = fan.x - hd.x;
        const gy = fan.y - hd.y;
        const gd = Math.hypot(gx, gy);
        if (gd > 4 && left > SURGE_LEAD) {
          const sp = Math.min(SURGE, gd / Math.max(0.05, left - SURGE_LEAD));
          this.h += clamp(angDiff(Math.atan2(gy, gx), this.h), -6 * dt, 6 * dt);
          const st = Math.min(gd, sp * dt);
          this.x += (gx / gd) * st;
          this.y += (gy / gd) * st;
          this.gait += dt * 2;
        } else this.pivot(fan, angDiff(fan.a0 - Math.PI, this.h), 7 * dt);
        if (this.t >= warn) {
          this.pivot(fan, angDiff(fan.a0 - Math.PI, this.h), Math.PI);
          this.swept = false;
          this.go('sweep');
        }
        break;
      }
      case 'sweep': {
        // His tail round through the fan, the scythe.
        const fan = this.fan as Fan;
        const k = clamp(this.t / SWEEP_T, 0, 1);
        const e = k * k * (3 - 2 * k);
        const ta = fan.a0 + angDiff(fan.a1, fan.a0) * e;
        this.pivot(fan, angDiff(ta - Math.PI, this.h), Math.PI);
        if (!this.swept && inSwept(fan, ta, f.x, f.y, FIGURE_R, REACH)) {
          this.swept = true;
          this.onHit?.('tail');
        }
        if (k >= 1) {
          const done = { ...fan };
          this.onBlow?.((x, y, r) => inSwept(done, done.a1, x, y, r, REACH));
          if (this.angry && !this.back) this.coil(f, true);
          else {
            this.fan = null;
            this.back = false;
            this.chargeNext = true;
            this.go('close');
          }
        }
        break;
      }
      case 'crouch': {
        // Low, his eye on the end of the line; the line does not follow.
        const ln = this.dash as Dash;
        this.h += clamp(angDiff(Math.atan2(ln.y1 - ln.y0, ln.x1 - ln.x0), this.h), -5 * dt, 5 * dt);
        if (this.t >= (this.angry ? CROUCH_ANGRY : CROUCH_T)) {
          this.h = Math.atan2(ln.y1 - ln.y0, ln.x1 - ln.x0);
          this.bit = false;
          this.go('dash');
        }
        break;
      }
      case 'dash': {
        // Along the line, jaws first: the snout from where it started to the line's end.
        const ln = this.dash as Dash;
        const len = Math.hypot(ln.x1 - ln.x0, ln.y1 - ln.y0) || 1;
        const run = Math.min(len, this.t * DASH_SPEED);
        const sx = ln.x0 + ((ln.x1 - ln.x0) / len) * run;
        const sy = ln.y0 + ((ln.y1 - ln.y0) / len) * run;
        this.x = sx - (Math.cos(this.h) * LAND_LEN) / 2;
        this.y = sy - (Math.sin(this.h) * LAND_LEN) / 2;
        this.gait += dt * 4;
        const so = { x0: ln.x0, y0: ln.y0, x1: sx, y1: sy };
        if (!this.bit && offLine(f.x, f.y, so) < BITE_R + FIGURE_R) {
          this.bit = true;
          this.onHit?.('bite');
        }
        if (run >= len) {
          const done = { ...ln };
          this.onBlow?.((x, y, r) => offLine(x, y, done) < BITE_R + r);
          this.dash = null;
          this.chargeNext = false;
          this.go('close');
        }
        break;
      }
      case 'close':
        // A quick scuttle to near the figure, then up.
        if (d > REAR_AT && this.t < CLOSE_T) this.walk(f.x, f.y, CLOSE_SPEED, dt);
        else {
          this.go('rear');
          this.onRear?.();
        }
        break;
      case 'rear':
        this.h += clamp(angDiff(Math.atan2(dy, dx), this.h), -3 * dt, 3 * dt);
        this.up =
          this.t < REAR_T - 0.25
            ? Math.min(1, this.t * 4)
            : Math.max(0, 1 - (this.t - (REAR_T - 0.25)) / 0.25);
        if (this.t >= REAR_T) this.go('drop');
        break;
      case 'drop':
        this.up = Math.max(0, this.up - dt * 4);
        if (this.t >= DROP_T) {
          this.side = -this.side;
          this.go('prowl');
        }
        break;
    }
  }

  /** The charge: the line from his snout through where the figure will be when he gets there, and a little past. */
  private crouch(f: { x: number; y: number; vx: number; vy: number }): void {
    const hd = this.head;
    const warn = this.angry ? CROUCH_ANGRY : CROUCH_T;
    const far = Math.hypot(f.x - hd.x, f.y - hd.y);
    const lead = warn + far / DASH_SPEED;
    const px = f.x + f.vx * lead;
    const py = f.y + f.vy * lead;
    const a = Math.atan2(py - hd.y, px - hd.x);
    const len = Math.hypot(px - hd.x, py - hd.y) + DASH_PAST;
    let x1 = hd.x + Math.cos(a) * len;
    let y1 = hd.y + Math.sin(a) * len;
    // Not off the island: the line stops at its sand.
    for (let i = 0; i < 20 && !this.lair.inLine(x1, y1); i++) {
      x1 -= Math.cos(a) * 10;
      y1 -= Math.sin(a) * 10;
    }
    this.dash = { x0: hd.x, y0: hd.y, x1, y1 };
    this.go('crouch');
    this.onWarn?.('charge');
  }

  /**
   * The fan for a sweep: across where the figure will be when his tail gets there, from a point on his side of it.
   * The second, angry, sweeps back from a new hub, at where the figure will be then.
   */
  private coil(f: { x: number; y: number; vx: number; vy: number }, back: boolean): void {
    const warn = back ? COIL_BACK : this.angry ? COIL_ANGRY : COIL_T;
    const lead = warn + SWEEP_T / 2;
    const p = { x: f.x + f.vx * lead, y: f.y + f.vy * lead };
    const hd = this.head;
    const l = Math.hypot(hd.x - p.x, hd.y - p.y) || 1;
    const hub = { x: p.x + ((hd.x - p.x) / l) * HUB, y: p.y + ((hd.y - p.y) / l) * HUB };
    const ab = Math.atan2(p.y - hub.y, p.x - hub.x);
    // Round from the side his tail is on now, or, sweeping back, from where the last one ended.
    const tail = this.h + Math.PI;
    const s = back ? -this.side : angDiff(tail, ab) >= 0 ? -1 : 1;
    this.side = s;
    this.fan = { x: hub.x, y: hub.y, a0: ab - s * SPAN, a1: ab + s * SPAN };
    this.back = back;
    this.go('coil');
    this.onWarn?.('sweep');
  }

  /** Turn by up to most, about his head. */
  private pivot(f: Fan, by: number, most: number): void {
    this.h += clamp(by, -most, most);
    this.x = f.x - (Math.cos(this.h) * LAND_LEN) / 2;
    this.y = f.y - (Math.sin(this.h) * LAND_LEN) / 2;
  }

  /** Walk toward a point on his legs. keep: stay on the island's sand. */
  private walk(tx: number, ty: number, speed: number, dt: number, keep = true): void {
    const gx = tx - this.x;
    const gy = ty - this.y;
    const gd = Math.hypot(gx, gy);
    if (gd < 1) return;
    this.h += clamp(angDiff(Math.atan2(gy, gx), this.h), -5 * dt, 5 * dt);
    const st = Math.min(gd, speed * dt);
    this.x += (gx / gd) * st;
    this.y += (gy / gd) * st;
    this.gait += (st / 40) * Math.PI;
    if (keep) this.keepOn();
  }

  /** On his ground, well in from the water, off whatever stands on it. */
  private keepOn(): void {
    this.lair.keep(this);
  }

  /** Ease the way he is drawn: side on, toward the way he goes (or faces), but in a sweep, as he truly lies. */
  private ease(dt: number): void {
    const s = this.state;
    if (s === 'sweep' || s === 'coil') {
      const k = s === 'sweep' ? 1 : Math.min(1, dt * 10);
      this.drawH += angDiff(this.h, this.drawH) * k;
      return;
    }
    const want = screenSide(this.h) > 0 ? SIDE_R : SIDE_L;
    this.drawH += clamp(angDiff(want, this.drawH), -9 * dt, 9 * dt);
  }

  private get warnT(): number {
    return this.back ? COIL_BACK : this.angry ? COIL_ANGRY : COIL_T;
  }

  /** The fan or the line on the sand, and his shadow. */
  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'surface' || this.state === 'gone' || this.state === 'away') return;
    if (!v.onScreen(this.x, this.y, 300 * v.zoom)) return;
    const { ctx } = v;
    if (this.fan)
      drawFan(
        v,
        this.fan,
        this.state === 'coil' ? this.t / this.warnT : 1,
        this.state === 'sweep' ? this.t / SWEEP_T : 0,
        REACH,
      );
    if (this.dash) this.drawLine(v, this.dash);
    if (this.inSea) return;
    // His shadow on the sand, along him as he is drawn.
    const c = Math.cos(this.drawH);
    const sn = Math.sin(this.drawH);
    ctx.fillStyle = 'rgba(60,40,20,.22)';
    for (let i = -2; i <= 2; i++) {
      const l = (i / 2) * LAND_LEN * 0.38;
      v.isoEllipse(this.x + c * l, this.y + sn * l, 20 - Math.abs(i) * 4);
      ctx.fill();
    }
  }

  /** Gone down the sand into the water, fleeing or running from honey. */
  private get inSea(): boolean {
    if (this.state !== 'flee' && this.state !== 'run') return false;
    return this.lair.inSea(this.x, this.y);
  }

  private drawLine(v: DrawView, ln: Dash): void {
    const { ctx, px, py } = v;
    const Z = v.zoom;
    const k =
      this.state === 'crouch' ? clamp(this.t / (this.angry ? CROUCH_ANGRY : CROUCH_T), 0, 1) : 1;
    const a = Math.atan2(ln.y1 - ln.y0, ln.x1 - ln.x0);
    const nx = -Math.sin(a) * BITE_R;
    const ny = Math.cos(a) * BITE_R;
    ctx.beginPath();
    ctx.moveTo(px(ln.x0 + nx, ln.y0 + ny), py(ln.x0 + nx, ln.y0 + ny));
    ctx.lineTo(px(ln.x1 + nx, ln.y1 + ny), py(ln.x1 + nx, ln.y1 + ny));
    ctx.lineTo(px(ln.x1 - nx, ln.y1 - ny), py(ln.x1 - nx, ln.y1 - ny));
    ctx.lineTo(px(ln.x0 - nx, ln.y0 - ny), py(ln.x0 - nx, ln.y0 - ny));
    ctx.closePath();
    ctx.fillStyle = `rgba(255,74,58,${0.22 + 0.3 * k})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,150,120,${0.7 + 0.3 * k})`;
    ctx.lineWidth = (2.4 + Math.sin(v.T * 14) * 0.6) * Z;
    ctx.stroke();
  }

  /** Him, for the game's sorted solids: asleep, getting up, prowling, sweeping, charging, reared up, or going. */
  drawBody(v: DrawView): void {
    if (this.state === 'gone' || this.state === 'away' || !v.onScreen(this.x, this.y, 260 * v.zoom))
      return;
    const s = this.state;
    const size = LAND_LEN / 240;
    // Standing, his middle is this high off the sand, so his feet are on it.
    const stand = 50 * size;
    const T = this.gait / 6;
    const o = { T, flash: this.flash, angry: this.awake && this.angry, len: LAND_LEN };
    if ((s === 'flee' || s === 'run') && this.inSea) {
      // Under the water, only his fin, going.
      const k = clamp(1 - (this.t - this.wet) / FLEE_T, 0, 1);
      drawReaperFin(v, this.x, this.y, this.h, k, false, v.T, LAND_LEN);
      return;
    }
    if (s === 'sleep') {
      const breathe = Math.sin(v.T * 1.4) * 1.2;
      drawReaperBody(v, this.x, this.y, stand * 0.45 + breathe, this.drawH, 0, {
        ...o,
        T: 0,
        legs: 'lie',
        asleep: true,
      });
      this.drawZs(v);
      return;
    }
    if (s === 'shy') {
      // Stopped dead by the honey, shaking all over, jaw shut.
      drawReaperBody(v, this.x + Math.sin(this.t * 38) * 2.5, this.y, stand, this.drawH, 0, {
        ...o,
        mouth: 0.1,
        legs: 'walk',
      });
      return;
    }
    if (s === 'beaten') {
      drawReaperBody(v, this.x, this.y, stand * 0.5, this.drawH, -0.05, { ...o, legs: 'lie' });
      return;
    }
    const roar = 0.4 + Math.abs(Math.sin(this.t * 6)) * 0.6;
    if (s === 'rise' || s === 'rear' || s === 'drop') {
      // Up on his hind legs, nose to the sky, roaring, drawn side on so all of him shows.
      drawReaperBody(v, this.x, this.y, stand + this.up * 26, this.drawH, this.up * 0.5, {
        ...o,
        mouth: s === 'drop' ? 0.2 : roar,
        legs: this.up > 0.3 ? 'rear' : 'walk',
      });
      return;
    }
    if (s === 'sweep' || s === 'coil') {
      drawReaperBody(v, this.x, this.y, stand * 0.8, this.drawH, 0, {
        ...o,
        mouth: s === 'sweep' ? 0.8 : 0.35,
        legs: 'walk',
      });
      return;
    }
    if (s === 'crouch') {
      // Low on his legs, jaw dropping, ready to go.
      drawReaperBody(v, this.x, this.y, stand * 0.7, this.drawH, -0.06, {
        ...o,
        T: this.t * 2,
        mouth: Math.min(1, this.t * 1.5),
        legs: 'walk',
      });
      return;
    }
    drawReaperBody(v, this.x, this.y, stand, this.drawH, 0, {
      ...o,
      mouth: s === 'dash' ? 1 : 0.1,
      legs: 'walk',
    });
  }

  /** Zs rising off him, asleep. */
  private drawZs(v: DrawView): void {
    const { ctx, px, py } = v;
    const Z = v.zoom;
    const hd = {
      x: this.x + (Math.cos(this.drawH) * LAND_LEN) / 2,
      y: this.y + (Math.sin(this.drawH) * LAND_LEN) / 2,
    };
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const k = (v.T * 0.45 + i / 3) % 1;
      ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.font = `800 ${Math.round((9 + k * 6) * Z)}px Grandstander, ui-rounded, system-ui, sans-serif`;
      ctx.fillText('z', px(hd.x, hd.y) + k * 16 * Z, py(hd.x, hd.y, 40 + k * 36));
    }
    ctx.globalAlpha = 1;
  }
}
