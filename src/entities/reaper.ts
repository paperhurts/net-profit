/**
 * The Reaper, the kid's leviathan, from his drawing: a great blue fish with a
 * pointed snout and a jagged mouth, a yellow eye under an angry brow, a
 * yellow-striped fin on his back, a forked tail, and legs underneath, for he
 * is semi-aquatic. "The Reaper... but he doesn't answer to that." There are two
 * of him; this is the one in the water.
 *
 * He roams the deep and the far deep on a long loop, his yellow fin cutting the
 * water, and hunts a boat that comes near him out past the buoys. He stalks
 * round it, then a fan shows on the water across where the boat is going, as
 * far as his tail reaches from where his head will be: he surges there under
 * the water, and his tail sweeps through it like a scythe. He swims faster than
 * any boat, so the counter is to turn hard, away from the fan, not to run on
 * through it. After a sweep he rears up out of the water
 * on his legs and roars, and that is when the harpoon reaches him. Past half
 * beaten he is angry: shorter warnings, and two sweeps, there and back, before
 * he rears.
 *
 * Harpooned down from his resolve, he is driven off for a good while, as the
 * leviathans are; the game gives the prize (the first time, his ice fishing
 * gear). Sail far from where he found you, go back inside the buoys or tie up,
 * and he gives up, whole, and goes back to roaming. He holds off while the game
 * says another great beast is after the boat.
 *
 * His water is something he is given (his loop, how near a boat brings him hunting, how far he follows, and what keeps
 * him off the islands and in the sea), the deep and the far deep by default; the Battle Barge at sea gives each of its
 * copies a little loop round its own spot, where he hunts at once, never gives up, and keeps inside the ring.
 */

import { angDiff, clamp } from '../core/math';
import { AWAY, RESOLVE } from '../data/harpoon';
import { drawReaperBody, drawReaperFin, drawReaperShadow } from '../render/reaper';
import { FLOE_MAX, ICE_FLOE } from '../world/icefloe';
import { DEEP, FAR, IR, IX, IY, pastBuoys, WS } from '../world/island';
import { ISLE2 } from '../world/isle2';
import { ISLE3 } from '../world/isle3';
import { ISLE4 } from '../world/isle4';
import { ISLE5 } from '../world/isle5';
import { ISLE6 } from '../world/isle6';
import { ISLE7 } from '../world/isle7';
import { ISLE8, ISLE9 } from '../world/isle8';
import type { Blipper, DrawView, Entity, Layer, World } from './entity';

/** His loop through the deep and the far deep, clear of every island, past the buoys all the way. */
export const ROUTE: readonly { x: number; y: number }[] = [
  { x: 5600, y: 1600 },
  { x: 5700, y: 3900 },
  { x: 6400, y: 6300 },
  { x: 4300, y: 7200 },
  { x: 2400, y: 5800 },
  { x: 500, y: 7300 },
  { x: -1700, y: 6200 },
  { x: -700, y: 3600 },
  { x: -800, y: 600 },
  { x: -1500, y: -1700 },
  { x: 800, y: -1700 },
  { x: 2400, y: -1000 },
  { x: 4300, y: -1600 },
  { x: 6600, y: -300 },
];
/** How fast he roams it. */
export const ROAM_SPEED = 150;
/** Every island he keeps off, and how far. */
const ISLANDS = [
  { x: IX, y: IY, r: IR },
  ISLE2,
  ISLE3,
  ISLE4,
  ISLE5,
  ISLE6,
  ISLE7,
  ISLE8,
  ISLE9,
  { x: ICE_FLOE.x, y: ICE_FLOE.y, r: FLOE_MAX },
];
const SHORE = 90;

/** A boat past the buoys this close is hunted; this far from where he found it, he gives up. */
export const NOTICE = 650;
export const LEASH = 1600;

/** His water: the loop he roams, how near a boat sets him hunting, how far he follows it, and what keeps him in. */
export type ReaperWater = {
  route: readonly { x: number; y: number }[];
  notice: number;
  leash: number;
  keep(p: { x: number; y: number }): void;
};
/** The deep and the far deep, off every island and never past the far deep's end, as he always was. */
export const DEEP_WATER: ReaperWater = {
  route: ROUTE,
  notice: NOTICE,
  leash: LEASH,
  keep(p) {
    for (const i of ISLANDS) {
      const r = Math.hypot(p.x - i.x, p.y - i.y) || 1;
      const min = i.r + SHORE;
      if (r < min) {
        p.x = i.x + ((p.x - i.x) / r) * min;
        p.y = i.y + ((p.y - i.y) / r) * min;
      }
    }
    const lo = 60 - DEEP - FAR;
    const hi = WS + DEEP + FAR - 60;
    p.x = clamp(p.x, lo, hi);
    p.y = clamp(p.y, lo, hi);
  },
};
/** A little loop round a spot in a ring of open sea, for the Battle Barge: hunting at once, never giving up, kept in. */
export const SEA_LOOP = 260;
export function seaWater(
  at: { x: number; y: number },
  ring: { x: number; y: number; r: number },
): ReaperWater {
  const route = [0, 1, 2, 3].map((i) => ({
    x: at.x + Math.cos((i * Math.PI) / 2) * SEA_LOOP,
    y: at.y + Math.sin((i * Math.PI) / 2) * SEA_LOOP,
  }));
  return {
    route,
    notice: Number.POSITIVE_INFINITY,
    leash: Number.POSITIVE_INFINITY,
    keep(p) {
      const dx = p.x - ring.x;
      const dy = p.y - ring.y;
      const d = Math.hypot(dx, dy);
      const max = ring.r - 60;
      if (d > max) {
        p.x = ring.x + (dx / d) * max;
        p.y = ring.y + (dy / d) * max;
      }
    },
  };
}
/** Seconds after he gives up before he will hunt again. */
export const CALM = 25;
/** Sighted from this far: about a phone's screen. */
export const SIGHT = 700;
/** He stalks the boat at about this distance, this fast, for this long between sweeps. */
export const STALK_R = 300;
export const STALK_SPEED = 420;
export const STALK_T = 2.4;
export const STALK_ANGRY = 1.5;
/** He sweeps only once his head is this close to the boat. */
export const SWEEP_FROM = 190;
/** The warning: the fan shows this long before the sweep (shorter angry; shorter again for the sweep back). */
export const COIL_T = 1.4;
export const COIL_ANGRY = 1.1;
export const COIL_BACK = 0.9;
/** The sweep: how long, how far his tail reaches from his head, and how wide each side of where the boat will be. */
export const SWEEP_T = 0.45;
export const REACH = 230;
export const SPAN = 1.1;
/** Where the boat will be is this far into the fan from his head; and he surges to his head's place at up to this. */
export const HUB = 125;
export const SURGE = 900;
/** What a sweep costs the boat, of its 100. */
export const SWEEP_HIT = 25;
/** After a sweep he lunges at the boat under the water, to rear up this far from it, for this long at most. */
export const REAR_AT = 260;
export const LUNGE_T = 1;
/** Reared up out of the water, roaring (the harpoon's chance); then sinking back. */
export const REAR_T = 1.6;
export const SINK_T = 0.6;
/** His length, head to tail. */
export const REAPER_LEN = 240;

/** Stopped dead by a jar of honey, shaking the boat, this long before he runs. */
export const SHY_T = 1.6;

export type ReaperState =
  | 'roam'
  | 'stalk'
  | 'coil'
  | 'sweep'
  | 'lunge'
  | 'rear'
  | 'sink'
  | 'shy'
  | 'away';

/** The fan his tail will sweep: from his head, the tail's angle from a0 round to a1. */
export type Fan = { x: number; y: number; a0: number; a1: number };

export class Reaper implements Entity {
  state: ReaperState = 'roam';
  x: number;
  y: number;
  h = Math.PI / 2;
  v = ROAM_SPEED;
  t = 0;
  resolve = RESOLVE.reaper;
  /** How far up out of the water, 0 under to 1 reared up. */
  up = 0.3;
  flash = 0;
  /** The fan of the sweep coming, or under way. */
  fan: Fan | null = null;
  /** The way along his loop he is heading. */
  leg = 0;
  /** Off and away from a jar of honey, not a harpoon: the game splashes after him, and gives no prize. */
  fled = false;
  /** Where he found the boat, which the leash is from. */
  private from = { x: 0, y: 0 };
  private calm = 0;
  private side = 1;
  private back = false;
  private hit = false;
  private seen = false;
  /** Reared up, which way he faces on the screen: toward the boat, 1 right or -1 left. */
  private face = 1;
  private turn = 0;
  private lastH: number | null = null;
  /** Sighted the first time. */
  onSight: (() => void) | null = null;
  /** He has found the boat and is coming. */
  onHunt: (() => void) | null = null;
  /** The fan shows: a sweep is coming. */
  onWarn: (() => void) | null = null;
  /** His tail hit the boat. The game does the damage. */
  onSweep: (() => void) | null = null;
  /** Up out of the water, roaring. */
  onRear: (() => void) | null = null;
  /** He gave up on the boat. */
  onGiveUp: (() => void) | null = null;
  /** Whether he must hold off: the game says while another great beast is after the boat. */
  holdOff: (() => boolean) | null = null;

  constructor(readonly water: ReaperWater = DEEP_WATER) {
    const p = water.route[0] as { x: number; y: number };
    this.x = p.x;
    this.y = p.y;
  }

  get angry(): boolean {
    return this.resolve <= RESOLVE.reaper / 2;
  }

  /** After the boat. */
  get hunting(): boolean {
    return this.state !== 'roam' && this.state !== 'away';
  }

  /** His head: the front of him, where the sweep pivots. */
  get head(): { x: number; y: number } {
    return {
      x: this.x + (Math.cos(this.h) * REAPER_LEN) / 2,
      y: this.y + (Math.sin(this.h) * REAPER_LEN) / 2,
    };
  }

  /** Back to roaming, whole, as when the boat sails off or is eaten. */
  reset(): void {
    if (this.state === 'away') return;
    this.giveUp(true);
  }

  /** Where a harpoon would strike him: only while he is reared up out of the water. */
  mark(): { x: number; y: number } | null {
    return this.state === 'rear' && this.up > 0.4 ? this : null;
  }

  /**
   * A harpoon struck him. Returns whether that drove him off. fired: it was fired while he was up, so it
   * counts though he has gone back under by the time it lands, as the Shark King's does.
   */
  harpoon(power: number, _at: unknown = null, fired = false): boolean {
    if (!this.mark() && !(fired && this.hunting)) return false;
    this.resolve = Math.max(0, this.resolve - power);
    this.flash = 1;
    if (this.resolve > 0) return false;
    this.fan = null;
    this.go('away');
    return true;
  }

  /**
   * A jar of honey held up at him, the kid's: "he stops and shakes your boat and runs splashing". Only while he is after
   * the boat. He stops dead, shakes it for SHY_T, then is off and away as if driven off, but with no prize, and back to
   * roaming after the same while. Returns whether it took.
   */
  scare(): boolean {
    if (!this.hunting || this.state === 'shy') return false;
    this.fan = null;
    this.fled = true;
    this.go('shy');
    return true;
  }

  private go(s: ReaperState): void {
    this.state = s;
    this.t = 0;
  }

  private giveUp(whole: boolean): void {
    this.fled = false;
    if (whole) this.resolve = RESOLVE.reaper;
    this.fan = null;
    this.calm = CALM;
    this.leg = this.nearestLeg();
    this.go('roam');
  }

  /** The way along his loop nearest him. */
  private nearestLeg(): number {
    let best = 0;
    let bd = Number.POSITIVE_INFINITY;
    this.water.route.forEach((p, i) => {
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }

  update(dt: number, w: World): void {
    const b = w.boat;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 4);
    this.calm = Math.max(0, this.calm - dt);
    if (this.lastH !== null && dt > 0)
      this.turn += (clamp(angDiff(b.h, this.lastH) / dt, -3, 3) - this.turn) * Math.min(1, dt * 6);
    this.lastH = b.h;
    const d = Math.hypot(b.x - this.x, b.y - this.y);
    if (!this.seen && w.started && d < SIGHT) {
      this.seen = true;
      this.onSight?.();
    }
    const hold = this.holdOff?.() ?? false;
    if (this.state === 'roam') {
      this.roam(dt);
      if (
        w.started &&
        !w.docked &&
        !hold &&
        this.calm <= 0 &&
        d < this.water.notice &&
        pastBuoys(b.x, b.y)
      ) {
        this.from = { x: this.x, y: this.y };
        this.side = angDiff(Math.atan2(b.y - this.y, b.x - this.x), this.h) >= 0 ? 1 : -1;
        this.go('stalk');
        this.onHunt?.();
      }
      this.keepOff();
      return;
    }
    if (this.state === 'shy') {
      // Stopped dead, up out of the water, staring at the honey; the game shakes the boat.
      this.up += (0.6 - this.up) * Math.min(1, dt * 3);
      if (this.t >= SHY_T) this.go('away');
      this.keepOff();
      return;
    }
    if (this.state === 'away') {
      // Off and away under the water, fast at first, and back to roaming after a good while.
      this.up += (0 - this.up) * Math.min(1, dt * 2);
      const a = Math.atan2(this.y - b.y, this.x - b.x);
      this.swim(
        this.x + Math.cos(a) * 400,
        this.y + Math.sin(a) * 400,
        this.t < 6 ? 320 : 60,
        2,
        dt,
      );
      if (this.t >= AWAY) {
        this.resolve = RESOLVE.reaper;
        this.up = 0.3;
        this.giveUp(true);
        this.calm = 0;
      }
      this.keepOff();
      return;
    }
    if (
      w.docked ||
      !pastBuoys(b.x, b.y) ||
      Math.hypot(b.x - this.from.x, b.y - this.from.y) > this.water.leash
    ) {
      this.giveUp(true);
      this.onGiveUp?.();
      return;
    }
    if (hold) {
      this.giveUp(false);
      return;
    }
    this.fight(dt, b, 24 * w.hullScale);
    this.keepOff();
  }

  private roam(dt: number): void {
    this.up += (0.3 - this.up) * Math.min(1, dt * 2);
    const route = this.water.route;
    const p = route[this.leg] as { x: number; y: number };
    if (Math.hypot(p.x - this.x, p.y - this.y) < 150) this.leg = (this.leg + 1) % route.length;
    this.swim(p.x, p.y, ROAM_SPEED, 1.2, dt);
  }

  private fight(dt: number, b: { x: number; y: number; h: number; v: number }, hull: number): void {
    const hd = this.head;
    switch (this.state) {
      case 'stalk': {
        // Round the boat at STALK_R, his fin cutting the water; then in at it.
        this.up += (0.3 - this.up) * Math.min(1, dt * 3);
        const closing = this.t >= (this.angry ? STALK_ANGRY : STALK_T);
        const a = Math.atan2(this.y - b.y, this.x - b.x) + this.side * 0.6;
        const r = closing ? 0 : STALK_R;
        this.swim(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, STALK_SPEED, 3, dt);
        if (closing && Math.hypot(b.x - hd.x, b.y - hd.y) < SWEEP_FROM) this.coil(b, false);
        break;
      }
      case 'coil': {
        // Surging under the water to where his head will be, then pivoting on it to bring his tail round.
        const f = this.fan as Fan;
        const warn = this.warnT;
        const left = warn - this.t;
        const gx = f.x - hd.x;
        const gy = f.y - hd.y;
        const gd = Math.hypot(gx, gy);
        if (gd > 6 && left > 0.3) {
          const sp = Math.min(SURGE, gd / Math.max(0.05, left - 0.3));
          this.h += clamp(angDiff(Math.atan2(gy, gx), this.h), -6 * dt, 6 * dt);
          const st = Math.min(gd, sp * dt);
          this.x += (gx / gd) * st;
          this.y += (gy / gd) * st;
          this.v = sp;
        } else {
          this.v *= Math.max(0, 1 - dt * 5);
          this.pivot(f, angDiff(f.a0 - Math.PI, this.h), 6 * dt);
        }
        if (this.t >= warn) {
          this.pivot(f, angDiff(f.a0 - Math.PI, this.h), Math.PI);
          this.hit = false;
          this.go('sweep');
        }
        break;
      }
      case 'sweep': {
        // His tail sweeps round the fan, the scythe.
        const f = this.fan as Fan;
        const k = clamp(this.t / SWEEP_T, 0, 1);
        const e = k * k * (3 - 2 * k);
        const ta = f.a0 + angDiff(f.a1, f.a0) * e;
        this.pivot(f, angDiff(ta - Math.PI, this.h), Math.PI);
        if (!this.hit && inSwept(f, ta, b.x, b.y, hull)) {
          this.hit = true;
          this.onSweep?.();
        }
        if (k >= 1) {
          if (this.angry && !this.back) {
            this.coil(b, true);
          } else {
            this.fan = null;
            this.back = false;
            this.go('lunge');
          }
        }
        break;
      }
      case 'lunge': {
        // Under the water at the boat, to come up roaring in front of it.
        const gx = b.x - this.x;
        const gy = b.y - this.y;
        if (Math.hypot(gx, gy) > REAR_AT && this.t < LUNGE_T)
          this.swim(b.x, b.y, SURGE * 0.7, 5, dt);
        else {
          this.go('rear');
          this.onRear?.();
        }
        break;
      }
      case 'rear': {
        // Up on his legs out of the water, roaring at the boat.
        const want = Math.atan2(b.y - this.y, b.x - this.x);
        this.face = b.x - b.y >= this.x - this.y ? 1 : -1;
        this.h += clamp(angDiff(want, this.h), -2.5 * dt, 2.5 * dt);
        this.v *= Math.max(0, 1 - dt * 4);
        this.up =
          this.t < REAR_T - 0.3
            ? Math.min(1, 0.3 + this.t * 3)
            : Math.max(0.3, 1 - ((this.t - (REAR_T - 0.3)) / 0.3) * 0.7);
        if (this.t >= REAR_T) this.go('sink');
        break;
      }
      case 'sink':
        this.up += (0.3 - this.up) * Math.min(1, dt * 5);
        if (this.t >= SINK_T) {
          this.side = -this.side;
          this.go('stalk');
        }
        break;
    }
  }

  /**
   * The fan for a sweep: across where the boat will be when his tail gets there, from beside its way on his
   * side of it. The second, angry, sweeps back from where the first one was, at where the boat will be then.
   */
  private coil(b: { x: number; y: number; h: number; v: number }, back: boolean): void {
    const hd = this.head;
    const warn = back ? COIL_BACK : this.angry ? COIL_ANGRY : COIL_T;
    const p = this.ahead(b, warn + SWEEP_T / 2);
    let hub = { x: hd.x, y: hd.y };
    if (!back || !this.fan) {
      // Beside the boat's way at that point, on his side of it.
      let nx = -Math.sin(p.h);
      let ny = Math.cos(p.h);
      if (b.v < 60) {
        const l = Math.hypot(hd.x - p.x, hd.y - p.y) || 1;
        nx = (hd.x - p.x) / l;
        ny = (hd.y - p.y) / l;
      } else if (nx * (hd.x - p.x) + ny * (hd.y - p.y) < 0) {
        nx = -nx;
        ny = -ny;
      }
      hub = { x: p.x + nx * HUB, y: p.y + ny * HUB };
    } else hub = { x: this.fan.x, y: this.fan.y };
    const ab = Math.atan2(p.y - hub.y, p.x - hub.x);
    // Round from the side his tail is on now, or, sweeping back, from where the last one ended.
    const tail = this.h + Math.PI;
    const s = back ? -this.side : angDiff(tail, ab) >= 0 ? -1 : 1;
    this.side = s;
    this.fan = { x: hub.x, y: hub.y, a0: ab - s * SPAN, a1: ab + s * SPAN };
    this.back = back;
    this.go('coil');
    this.onWarn?.();
  }

  /** Turn by up to most, about his head. */
  private pivot(f: Fan, by: number, most: number): void {
    this.h += clamp(by, -most, most);
    this.x = f.x - (Math.cos(this.h) * REAPER_LEN) / 2;
    this.y = f.y - (Math.sin(this.h) * REAPER_LEN) / 2;
  }

  /** Where the boat will be in t seconds if it keeps going as it is, turning as it is turning now. */
  private ahead(
    b: { x: number; y: number; h: number; v: number },
    t: number,
  ): { x: number; y: number; h: number } {
    let x = b.x;
    let y = b.y;
    let h = b.h;
    const n = 12;
    const st = t / n;
    for (let i = 0; i < n; i++) {
      h += this.turn * st;
      x += Math.cos(h) * b.v * st;
      y += Math.sin(h) * b.v * st;
    }
    return { x, y, h };
  }

  private swim(tx: number, ty: number, speed: number, rate: number, dt: number): void {
    const want = Math.atan2(ty - this.y, tx - this.x);
    this.h += clamp(angDiff(want, this.h), -rate * dt, rate * dt);
    this.v += (speed - this.v) * Math.min(1, dt * 2);
    this.x += Math.cos(this.h) * this.v * dt;
    this.y += Math.sin(this.h) * this.v * dt;
  }

  /** Never on an island, never out of his water. */
  private keepOff(): void {
    this.water.keep(this);
  }

  /** On the radar while he is about. */
  radar(blip: Blipper): void {
    if (this.state !== 'away') blip(this.x, this.y, 'threat');
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer === 'overlay') {
      if (this.hunting) v.indicator(this.x, this.y, '#2F6FB0', 'pirate', this.state === 'coil');
      return;
    }
    if (!v.onScreen(this.x, this.y, 400 * v.zoom)) return;
    const s = this.state;
    const out = s === 'sweep' || s === 'rear' || s === 'shy';
    if (layer === 'surface') {
      if (this.fan)
        drawFan(
          v,
          this.fan,
          s === 'coil' ? this.t / this.warnT : 1,
          s === 'sweep' ? this.t / SWEEP_T : 0,
        );
      if (!out)
        drawReaperShadow(v, this.x, this.y, this.h, Math.max(0.25, 1 - this.up), REAPER_LEN);
      if (out) {
        // Where he breaks the water.
        v.isoEllipse(this.x, this.y, REAPER_LEN * 0.4 + Math.sin(v.T * 5) * 4);
        v.ctx.strokeStyle = 'rgba(255,255,255,.5)';
        v.ctx.lineWidth = 2 * v.zoom;
        v.ctx.stroke();
      }
      return;
    }
    if (layer !== 'air') return;
    const o = { T: v.T, flash: this.flash, angry: this.angry, len: REAPER_LEN };
    // Reared up he is drawn side on, toward the boat's side of the screen, so his whole shape shows.
    if (s === 'rear')
      drawReaperBody(
        v,
        this.x,
        this.y,
        10 + this.up * 26,
        this.face > 0 ? -Math.PI / 4 : (3 * Math.PI) / 4,
        0.1 + this.up * 0.32,
        {
          ...o,
          mouth: 0.4 + Math.abs(Math.sin(this.t * 6)) * 0.6,
          legs: 'rear',
        },
      );
    else if (s === 'sweep')
      drawReaperBody(v, this.x, this.y, 4, this.h, 0, { ...o, mouth: 0.8, legs: 'swim' });
    // Stopped dead by the honey: up at the surface, jaw shut, shaking all over.
    else if (s === 'shy')
      drawReaperBody(v, this.x + Math.sin(this.t * 38) * 3, this.y, 6, this.h, 0, {
        ...o,
        mouth: 0.1,
        legs: 'swim',
      });
    else drawReaperFin(v, this.x, this.y, this.h, this.up / 0.3, this.angry, v.T, REAPER_LEN);
  }

  private get warnT(): number {
    return this.back ? COIL_BACK : this.angry ? COIL_ANGRY : COIL_T;
  }
}

/** Whether a boat at x, y, this big, is in the part of the fan his tail has swept so far (round to ta). */
export function inSwept(
  f: Fan,
  ta: number,
  x: number,
  y: number,
  hull: number,
  reach = REACH,
): boolean {
  const d = Math.hypot(x - f.x, y - f.y);
  if (d > reach + hull) return false;
  const s = Math.sign(angDiff(f.a1, f.a0)) || 1;
  const pad = d < hull ? Math.PI : Math.asin(Math.min(1, hull / d));
  const rel = angDiff(Math.atan2(y - f.y, x - f.x), f.a0) * s;
  const swept = Math.abs(angDiff(ta, f.a0));
  return rel >= -pad && rel <= swept + pad;
}

/** The fan on the water: filling red as the sweep comes (k), and white spray where the tail has been (sweep). */
export function drawFan(v: DrawView, f: Fan, k: number, sweep: number, reach = REACH): void {
  const { ctx } = v;
  const Z = v.zoom;
  const kk = clamp(k, 0, 1);
  const span = angDiff(f.a1, f.a0);
  const path = (to: number) => {
    ctx.beginPath();
    ctx.moveTo(v.px(f.x, f.y), v.py(f.x, f.y));
    const n = 18;
    for (let i = 0; i <= n; i++) {
      const a = f.a0 + span * to * (i / n);
      const x = f.x + Math.cos(a) * reach;
      const y = f.y + Math.sin(a) * reach;
      ctx.lineTo(v.px(x, y), v.py(x, y));
    }
    ctx.closePath();
  };
  path(1);
  ctx.fillStyle = `rgba(255,74,58,${0.22 + 0.3 * kk})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(255,150,120,${0.7 + 0.3 * kk})`;
  ctx.lineWidth = (2.6 + Math.sin(v.T * 14) * 0.6) * Z;
  ctx.stroke();
  if (sweep > 0) {
    const e = clamp(sweep, 0, 1);
    path(e * e * (3 - 2 * e));
    ctx.fillStyle = 'rgba(240,250,255,.35)';
    ctx.fill();
  }
}
