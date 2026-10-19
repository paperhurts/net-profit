/**
 * Skrill's displacer beasts on Skull Island, the kid's (his answers: Skrill "can keep displaser bestes (4hp&3dm)", the
 * ones from Dungeons and Dragons, and in Skrill's tower "displaseres are EVRYWHARE"). A great blue-black cat with six
 * legs and two long tentacles off its shoulders, each ending in a pad of bony spikes. Its trick is its name: it is
 * never quite where it looks to be. What the figure sees is a picture of it, standing a little to one side; the beast
 * itself goes unseen, but for its shadow on the ground. A spear thrown at the picture goes through nothing. Each one
 * prowls round its own den, and when the figure comes near it stalks after it, rears its tentacles back (the warning:
 * a red wedge on the ground, out from where it really is), and lashes them out: three hearts to anyone in the wedge.
 * Lashing shakes its trick loose: for a moment after, it shows where it really is, and that is when a spear lands. A
 * hit shakes it loose again for a little longer. Four hits and it is beaten, leaving coins; every landing they are back.
 */

import type { Point } from '../world/island';
import { fromSkull } from '../world/isle12';
import type { DrawView, Entity, Layer, World } from './entity';
import { walkStep } from './walker';

/** Hits to beat one, and the hearts its lash takes. */
export const DISPLACER_HP = 4;
export const DISPLACER_DMG = 3;
/** It sees the figure this near; it gives up this far from its den. */
export const DISP_SEE = 170;
export const DISP_LEASH = 460;
/** It stalks at this; the figure walks at 85. It prowls round its den at this. */
export const DISP_SPEED = 70;
export const DISP_PROWL = 26;
/** Seconds it snarls, seeing the figure, before it stalks after it. */
export const DISP_SPOT = 0.5;
/** How far to one side of it its picture stands. */
export const DISP_OFF = 38;
/** It rears back from this near; its tentacles reach this far, this far either side of straight ahead. */
export const LASH_FROM = 56;
export const LASH_REACH = 66;
export const LASH_ARC = 0.6;
/** Seconds: reared back (the warning), the lash, and the time it shows where it really is after. */
export const DISP_WINDUP = 0.9;
export const DISP_LASH = 0.3;
export const DISP_RECOVER = 1.4;
/** Seconds a hit shows it where it really is. */
export const DISP_SHOWN = 2;
/** Seconds it takes to go down. */
export const DISP_FALL = 1;
/** Coins one leaves. */
export const DISPLACER_PRIZE = 60;

export type DisplacerState =
  | 'prowl'
  | 'spot'
  | 'stalk'
  | 'windup'
  | 'lash'
  | 'recover'
  | 'back'
  | 'fall'
  | 'gone';

export type Displacer = {
  /** Where it really is. */
  x: number;
  y: number;
  /** Where its picture is, which is what the figure sees. */
  ix: number;
  iy: number;
  /** Which way it faces, and which way the lash goes. */
  h: number;
  home: Point;
  hp: number;
  state: DisplacerState;
  t: number;
  flash: number;
  stunT: number;
  /** Seconds left of showing where it really is, after a hit. */
  shownT: number;
  /** How far out its picture stands, 0 (on it) to 1 (DISP_OFF off), and which way. */
  k: number;
  ia: number;
  /** Its prowl round its den, and its walk. */
  ph: number;
  step: number;
};

/** Their dens, in the skull's own frame: up on the dome either side of the tower, out on both cheeks, on the brow
 * between the eyes, low on both cheeks, and either side of the jaw. */
export const DISP_DENS: readonly [number, number][] = [
  [-460, -430],
  [260, -640],
  [660, 140],
  [-700, 90],
  [0, 110],
  [520, 760],
  [-360, 1190],
  [360, 1190],
];
export const DISP_HOMES: readonly Point[] = DISP_DENS.map(([u, v]) => fromSkull(u, v));

export class DisplacerBeasts implements Entity {
  readonly list: Displacer[] = [];
  /** Whether the figure is ashore where they are: away from it they lie still. */
  here = false;
  /** One saw the figure; reared back; lashed (whether it caught the figure); hit the figure for this many hearts; was
   * beaten; was speared where it was not. */
  onSpot: ((b: Displacer) => void) | null = null;
  onWindup: ((b: Displacer) => void) | null = null;
  onLash: ((b: Displacer, hit: boolean) => void) | null = null;
  onHit: ((n: number) => void) | null = null;
  onBeaten: ((b: Displacer) => void) | null = null;
  onMiss: ((b: Displacer) => void) | null = null;

  constructor(at: readonly Point[] = DISP_HOMES) {
    this.place(at);
  }

  /** These beasts in their dens here, in place of any before. */
  place(at: readonly Point[]): void {
    this.list.length = 0;
    at.forEach((p, i) => {
      const ia = i * 2.4;
      this.list.push({
        x: p[0],
        y: p[1],
        ix: p[0] + Math.cos(ia) * DISP_OFF,
        iy: p[1] + Math.sin(ia) * DISP_OFF,
        h: Math.PI / 4,
        home: p,
        hp: DISPLACER_HP,
        state: 'prowl',
        t: 0,
        flash: 0,
        stunT: 0,
        shownT: 0,
        k: 1,
        ia,
        ph: i * 1.7,
        step: i * 0.9,
      });
    });
  }

  /** All of them after the figure at once, as on the Battle Barge. */
  wake(): void {
    for (const b of this.list) {
      if (b.state !== 'prowl') continue;
      this.set(b, 'spot');
      this.onSpot?.(b);
    }
  }

  /** All back in their dens, whole, and their trick back on. */
  reset(): void {
    this.list.forEach((b, i) => {
      [b.x, b.y] = b.home;
      b.h = Math.PI / 4;
      b.hp = DISPLACER_HP;
      b.state = 'prowl';
      b.t = 0;
      b.flash = 0;
      b.stunT = 0;
      b.shownT = 0;
      b.k = 1;
      b.ia = i * 2.4;
      b.ph = i * 1.7;
      this.picture(b);
    });
  }

  /** After the figure. */
  static up(b: Displacer): boolean {
    return (
      b.state === 'spot' ||
      b.state === 'stalk' ||
      b.state === 'windup' ||
      b.state === 'lash' ||
      b.state === 'recover'
    );
  }

  /** Showing where it really is: just after a lash, for a little after a hit, and going down. */
  static shown(b: Displacer): boolean {
    return b.state === 'recover' || b.shownT > 0 || b.state === 'fall' || b.state === 'gone';
  }

  get roused(): boolean {
    return this.here && this.list.some((b) => DisplacerBeasts.up(b));
  }

  /** The nearest within range by where it looks to be: those after the figure only, or, with quiet, those prowling or
   * going back too. */
  nearest(x: number, y: number, range: number, quiet = false): Displacer | null {
    let best: Displacer | null = null;
    let bd = range;
    for (const b of this.list) {
      if (!(DisplacerBeasts.up(b) || (quiet && (b.state === 'prowl' || b.state === 'back'))))
        continue;
      const d = Math.hypot(b.ix - x, b.iy - y);
      if (d <= bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }

  /**
   * A spear lands where it looks to be: if it is showing where it really is, a hit, and it shows itself a little longer;
   * if not, the spear goes through its picture, and it comes for whoever threw it. Whether it hurt.
   */
  hit(b: Displacer, power: number): boolean {
    if (b.state === 'fall' || b.state === 'gone') return false;
    if (b.state === 'prowl' || b.state === 'back') {
      this.set(b, 'spot');
      this.onSpot?.(b);
    }
    if (!DisplacerBeasts.shown(b)) {
      this.onMiss?.(b);
      return false;
    }
    b.hp -= power;
    b.flash = 0.15;
    b.shownT = Math.max(b.shownT, DISP_SHOWN);
    if (b.hp <= 0) {
      b.hp = 0;
      this.set(b, 'fall');
      this.onBeaten?.(b);
    }
    return true;
  }

  /** Tar in its face, or a stun: it stands this many seconds, and a lash it was rearing back comes to nothing. */
  stun(b: Displacer, s: number): void {
    if (!DisplacerBeasts.up(b) || b.state === 'lash') return;
    b.stunT = Math.max(b.stunT, s);
    if (b.state === 'windup') this.set(b, 'stalk');
  }

  update(dt: number, w: World): void {
    if (!this.here) return;
    const fig = w.figure;
    for (const b of this.list) {
      b.t += dt;
      b.flash = Math.max(0, b.flash - dt);
      b.shownT = Math.max(0, b.shownT - dt);
      if (b.state === 'gone') continue;
      if (b.state === 'fall') {
        if (b.t >= DISP_FALL) b.state = 'gone';
        this.picture(b, dt);
        continue;
      }
      this.act(b, fig, dt);
      this.picture(b, dt);
    }
  }

  /** Whether a lash now catches whoever is at (x, y): in the wedge out from where it really is. */
  static catches(b: Displacer, x: number, y: number): boolean {
    const d = Math.hypot(x - b.x, y - b.y);
    if (d > LASH_REACH) return false;
    if (d < 10) return true;
    const a = Math.atan2(y - b.y, x - b.x) - b.h;
    return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <= LASH_ARC;
  }

  private act(b: Displacer, fig: World['figure'], dt: number): void {
    // The figure away, or led too far from its den: back it goes.
    if (
      DisplacerBeasts.up(b) &&
      (!fig || Math.hypot(b.x - b.home[0], b.y - b.home[1]) > DISP_LEASH)
    )
      this.set(b, 'back');
    if (b.state === 'prowl') {
      // Slowly round its den, a loop as wide as a room.
      b.ph += dt * 0.35;
      const tx = b.home[0] + Math.cos(b.ph) * 46;
      const ty = b.home[1] + Math.sin(b.ph) * 46;
      this.toward(b, tx, ty, DISP_PROWL, dt);
      if (fig && Math.hypot(fig.x - b.x, fig.y - b.y) < DISP_SEE) {
        this.set(b, 'spot');
        this.onSpot?.(b);
      }
      return;
    }
    if (b.state === 'back') {
      if (this.toward(b, b.home[0], b.home[1], DISP_SPEED * 0.8, dt)) this.set(b, 'prowl');
      return;
    }
    if (!fig) return;
    if (b.state === 'spot') {
      b.h = Math.atan2(fig.y - b.y, fig.x - b.x);
      if (b.t >= DISP_SPOT) this.set(b, 'stalk');
      return;
    }
    if (b.stunT > 0) {
      b.stunT -= dt;
      return;
    }
    if (b.state === 'windup') {
      if (b.t >= DISP_WINDUP) {
        this.set(b, 'lash');
        const hit = DisplacerBeasts.catches(b, fig.x, fig.y);
        this.onLash?.(b, hit);
        if (hit) this.onHit?.(DISPLACER_DMG);
      }
      return;
    }
    if (b.state === 'lash') {
      if (b.t >= DISP_LASH) this.set(b, 'recover');
      return;
    }
    if (b.state === 'recover') {
      if (b.t >= DISP_RECOVER) this.set(b, 'stalk');
      return;
    }
    // Stalking: on toward the figure, and from near enough, rear back for a lash aimed at it.
    const d = Math.hypot(fig.x - b.x, fig.y - b.y);
    if (d > LASH_FROM) {
      this.toward(b, fig.x, fig.y, DISP_SPEED, dt);
      return;
    }
    b.h = Math.atan2(fig.y - b.y, fig.x - b.x);
    this.set(b, 'windup');
    this.onWindup?.(b);
  }

  /** Its picture: off to one side, drifting slowly round it, and drawn in onto it while it shows where it is. */
  private picture(b: Displacer, dt = 0): void {
    const want = DisplacerBeasts.shown(b) ? 0 : 1;
    b.k += Math.sign(want - b.k) * Math.min(Math.abs(want - b.k), dt * 5);
    b.ia += dt * 0.5;
    b.ix = b.x + Math.cos(b.ia) * DISP_OFF * b.k;
    b.iy = b.y + Math.sin(b.ia) * DISP_OFF * b.k;
  }

  private set(b: Displacer, s: DisplacerState): void {
    b.state = s;
    b.t = 0;
  }

  /** A step toward (x, y) over the island; whether it has got there. */
  private toward(b: Displacer, x: number, y: number, speed: number, dt: number): boolean {
    const dx = x - b.x;
    const dy = y - b.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) return true;
    const s = Math.min(d, speed * dt);
    walkStep(b, (dx / d) * s, (dy / d) * s, 99);
    b.h = Math.atan2(dy, dx);
    b.step += dt;
    return false;
  }

  /** The game draws them among the island's solids (render/displacers.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}
