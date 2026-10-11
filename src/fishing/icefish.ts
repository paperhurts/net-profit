/**
 * Ice fishing, the kid's, like the game he plays: through the hole in the ice
 * floe the line goes down, down, down to the bottom on its own, and on the way
 * back up you steer the hook left and right to hook what it touches. Seen side
 * on: the ice across the top with the hole in its middle, the cold water under
 * it, and the sea floor far below.
 *
 * Going down the hook drops too fast for anything to take it, but it steers, so
 * you can bring it down onto a snow crab walking the bottom. Coming up, every
 * fish it touches is on, up to LINE_MAX. Pale jellies drift in the middle
 * water: brush one and it stings, and the last fish on the line wriggles off
 * and swims away. Near the top the line swings the hook back under the hole.
 *
 * The fish under the hole are a day's worth (icePool): the char up in the
 * light, the cod below them, the glassy icefish down deep and the crabs on the
 * floor. What is caught stays caught until a new day.
 */

import { rng as seeded } from '../core/math';
import { ICE_CHAR, ICEFISH, POLAR_COD, SNOW_CRAB } from '../data/tuning';

/** The water under the hole: how wide it shows, and how deep to the floor. */
export const ICE_W = 360;
export const ICE_D = 1100;
/** The ice's underside, and the hole in the middle of it. */
export const ICE_TOP = 40;
export const HOLE_X = ICE_W / 2;
/** How fast the hook drops and comes up, and steers across. */
export const DROP = 320;
export const REEL = 170;
export const STEER = 240;
/** How many can be on the line at once; how near the hook takes one. */
export const LINE_MAX = 5;
export const HOOK_R = 14;

export type IceKind = 'char' | 'cod' | 'icefish' | 'crab' | 'jelly';

/** Something under the hole: its species (none for a jelly), where, which way and how fast, how big. */
export type IceFish = {
  kind: IceKind;
  sp: number;
  x: number;
  y: number;
  vx: number;
  size: number;
  /** Caught today: not under the hole any more. */
  caught: boolean;
  /** On the line now. */
  on: boolean;
  /** A jelly that has just stung: not again until this runs out. */
  calm: number;
  ph: number;
};

/** What each kind is, how many there are a day, at what depths, how fast and how big. */
const KINDS: readonly {
  kind: IceKind;
  sp: number;
  n: number;
  y0: number;
  y1: number;
  v: number;
  size: number;
}[] = [
  { kind: 'char', sp: ICE_CHAR, n: 5, y0: 90, y1: 380, v: 70, size: 22 },
  { kind: 'cod', sp: POLAR_COD, n: 4, y0: 400, y1: 720, v: 55, size: 24 },
  { kind: 'icefish', sp: ICEFISH, n: 3, y0: 740, y1: 1010, v: 30, size: 26 },
  { kind: 'crab', sp: SNOW_CRAB, n: 3, y0: ICE_D - 18, y1: ICE_D - 18, v: 12, size: 24 },
  { kind: 'jelly', sp: -1, n: 4, y0: 300, y1: 900, v: 10, size: 22 },
];

/** A day's fish under the hole, the same for the same day. */
export function icePool(day: number): IceFish[] {
  const r = seeded(9001 + day * 31);
  const out: IceFish[] = [];
  for (const k of KINDS)
    for (let i = 0; i < k.n; i++) {
      out.push({
        kind: k.kind,
        sp: k.sp,
        x: 20 + r() * (ICE_W - 40),
        y: k.y0 + ((k.y1 - k.y0) * (i + r() * 0.8)) / k.n,
        vx: (r() < 0.5 ? -1 : 1) * k.v * (0.7 + r() * 0.6),
        size: k.size,
        caught: false,
        on: false,
        calm: 0,
        ph: r() * 6,
      });
    }
  return out;
}

/** How many are still to be caught under the hole. */
export function leftToCatch(pool: readonly IceFish[]): number {
  return pool.filter((f) => f.kind !== 'jelly' && !f.caught).length;
}

export type IcePhase = 'ready' | 'drop' | 'reel' | 'up' | 'done';
export type IceEvent = 'bottom' | 'hook' | 'sting' | 'done';

/** One drop of the line, from the hole to the floor and back. */
export class IceRun {
  phase: IcePhase = 'ready';
  x = HOLE_X;
  y = ICE_TOP - 24;
  /** What is on the line, in the order it was hooked. */
  line: IceFish[] = [];
  T = 0;
  constructor(readonly pool: IceFish[]) {}

  /** Let the line go. */
  drop(): void {
    if (this.phase !== 'ready' && this.phase !== 'done') return;
    this.phase = 'drop';
    this.x = HOLE_X;
    this.y = ICE_TOP - 24;
    this.line = [];
  }

  /** One step. ix: the stick across, -1 to 1. What happened, if anything. */
  update(dt: number, ix: number): IceEvent | null {
    this.T += dt;
    this.swim(dt);
    let ev: IceEvent | null = null;
    switch (this.phase) {
      case 'drop':
        this.y += DROP * dt;
        this.steer(dt, ix);
        if (this.y >= ICE_D - 18) {
          this.y = ICE_D - 18;
          this.phase = 'reel';
          ev = 'bottom';
        }
        break;
      case 'reel': {
        this.y -= REEL * dt;
        this.steer(dt, ix);
        // Near the top the line, hanging from the hole, swings the hook back under it.
        const pull = Math.max(0, Math.min(1, (300 - this.y) / 260));
        this.x += (HOLE_X - this.x) * Math.min(1, pull * dt * 3);
        ev = this.touch() ?? ev;
        if (this.y <= ICE_TOP + 6) this.phase = 'up';
        break;
      }
      case 'up':
        this.x += (HOLE_X - this.x) * Math.min(1, dt * 10);
        this.y -= REEL * dt;
        if (this.y <= ICE_TOP - 24) {
          this.y = ICE_TOP - 24;
          this.phase = 'done';
          for (const f of this.line) {
            f.on = false;
            f.caught = true;
          }
          ev = 'done';
        }
        break;
    }
    // What is on the line hangs under the hook.
    this.line.forEach((f, i) => {
      f.x = this.x + Math.sin(this.T * 4 + i) * 4;
      f.y = this.y + 14 + i * 16;
    });
    return ev;
  }

  private steer(dt: number, ix: number): void {
    const v = Math.max(-1, Math.min(1, ix));
    this.x = Math.max(14, Math.min(ICE_W - 14, this.x + v * STEER * dt));
  }

  /** The hook against what is about: a fish takes it, a jelly stings. */
  private touch(): IceEvent | null {
    for (const f of this.pool) {
      if (f.caught || f.on) continue;
      if (Math.hypot(f.x - this.x, f.y - this.y) > HOOK_R + f.size / 2) continue;
      if (f.kind === 'jelly') {
        if (f.calm > 0) continue;
        f.calm = 1.5;
        const off = this.line.pop();
        if (off) {
          // It wriggles off and swims away, under the hole still.
          off.on = false;
          off.vx = (off.x < this.x ? -1 : 1) * Math.abs(off.vx || 40);
          off.x += off.vx > 0 ? 30 : -30;
          return 'sting';
        }
        continue;
      }
      if (this.line.length >= LINE_MAX) continue;
      f.on = true;
      this.line.push(f);
      return 'hook';
    }
    return null;
  }

  /** Everything not on the line swims across the hole's water, round from one side to the other. */
  private swim(dt: number): void {
    for (const f of this.pool) {
      f.calm = Math.max(0, f.calm - dt);
      if (f.caught || f.on) continue;
      f.x += f.vx * dt;
      if (f.x < -30) f.x = ICE_W + 30;
      if (f.x > ICE_W + 30) f.x = -30;
      if (f.kind === 'jelly') f.y += Math.sin(this.T * 0.6 + f.ph) * 8 * dt;
    }
  }
}

/**
 * Neil, the owner's seal (entities/seal.ts), ice fishing with you: he sits on the ice to the right of the
 * bucket, and now and then, when the line has gone down, slips into the hole after a fish of his own. He goes
 * for the nearest char, cod or icefish that is not on the line, takes it in his mouth, and brings it up onto
 * the ice for your hold. One that the hook takes first, he gives up on, and comes back up empty-mouthed.
 */
/** Where he sits on the ice; how fast he swims; how near a fish must be to take it; how long he chases. */
export const SEAL_X = HOLE_X + 92;
export const SEAL_ICE = -6;
export const SEAL_SWIM = 230;
export const SEAL_BITE = 16;
export const SEAL_CHASE = 6;
/** He goes in after one about this often when the line reaches the bottom. */
export const SEAL_CHANCE = 0.4;

export type SealPhase = 'sit' | 'in' | 'chase' | 'back' | 'out';

export class IceSeal {
  phase: SealPhase = 'sit';
  x = SEAL_X;
  y = SEAL_ICE;
  /** The way he faces: 1 right, -1 left. */
  dir = -1;
  /** The fish he is after, or has in his mouth. */
  prey: IceFish | null = null;
  /** He has it in his mouth. */
  has = false;
  private t = 0;

  /** In after a fish, if he is sitting and there is one to go for. */
  dive(pool: readonly IceFish[]): boolean {
    if (this.phase !== 'sit') return false;
    let best: IceFish | null = null;
    let bd = Number.POSITIVE_INFINITY;
    for (const f of pool) {
      if (f.caught || f.on || f.kind === 'jelly' || f.kind === 'crab') continue;
      const d = Math.hypot(f.x - HOLE_X, f.y - ICE_TOP);
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    if (!best) return false;
    this.prey = best;
    this.has = false;
    this.phase = 'in';
    this.t = 0;
    return true;
  }

  /** One step: the fish he has brought up, the moment he is back on the ice with it, else null. */
  update(dt: number): IceFish | null {
    this.t += dt;
    switch (this.phase) {
      case 'sit':
        return null;
      case 'in':
        // Along the ice to the hole's edge, and down through it.
        if (this.y < 0 && Math.abs(this.x - (HOLE_X + 6)) > 2)
          this.toward(HOLE_X + 6, SEAL_ICE, dt, 140);
        else if (this.toward(HOLE_X, ICE_TOP + 30, dt, SEAL_SWIM)) this.phase = 'chase';
        return null;
      case 'chase': {
        const f = this.prey;
        if (!f || f.on || f.caught || this.t > SEAL_CHASE) {
          this.letGo();
          return null;
        }
        this.toward(f.x, f.y, dt, SEAL_SWIM);
        if (Math.hypot(f.x - this.x, f.y - this.y) <= SEAL_BITE) {
          f.on = true;
          this.has = true;
          this.phase = 'back';
        }
        return null;
      }
      case 'back':
        if (this.toward(HOLE_X, ICE_TOP - 4, dt, SEAL_SWIM)) this.phase = 'out';
        this.carry();
        return null;
      case 'out': {
        // Up out of the hole and back along the ice to where he sits.
        if (this.y > SEAL_ICE) this.toward(HOLE_X + 8, SEAL_ICE, dt, 160);
        else if (this.toward(SEAL_X, SEAL_ICE, dt, 120)) {
          this.phase = 'sit';
          this.dir = -1;
          const f = this.prey;
          this.prey = null;
          if (f && this.has) {
            this.has = false;
            f.on = false;
            f.caught = true;
            return f;
          }
          return null;
        }
        this.carry();
        return null;
      }
    }
  }

  /** Off the ice for good (the fisher goes back aboard): the fish in his mouth, if any, is his to give. */
  finish(): IceFish | null {
    const f = this.has ? this.prey : null;
    if (f) {
      f.on = false;
      f.caught = true;
    }
    this.phase = 'sit';
    this.x = SEAL_X;
    this.y = SEAL_ICE;
    this.dir = -1;
    this.prey = null;
    this.has = false;
    return f;
  }

  private letGo(): void {
    this.prey = null;
    this.has = false;
    this.phase = 'back';
  }

  /** The fish in his mouth goes where he goes. */
  private carry(): void {
    const f = this.prey;
    if (!f || !this.has) return;
    // At his mouth: out in front as he swims, up by his raised head on the ice.
    f.x = this.x + this.dir * 17;
    f.y = this.y + (this.y < 0 ? -12 : 1);
  }

  /** A step toward (x, y) at this speed; true once there. */
  private toward(x: number, y: number, dt: number, speed: number): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.5) this.dir = dx > 0 ? 1 : -1;
    if (d <= speed * dt) {
      this.x = x;
      this.y = y;
      return true;
    }
    this.x += (dx / d) * speed * dt;
    this.y += (dy / d) * speed * dt;
    return false;
  }
}
