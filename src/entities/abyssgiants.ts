/**
 * The giants of the deep, passing the abyss's cage on the way down: the kid's (his sixth list's answers: 1,000 metres
 * down are "the leviathans, Reapers, the Cthuluviathan, Cthulhu, gulpers"), with the owner's call (2026-10-17): they
 * swim past, scary, huge shapes and glowing eyes in the dark, close enough to be thrilling, and only a few lunge, with
 * a warning. In the cage the diver is safe: a lunge at it slams into its bars, which hold, and the giant turns away.
 *
 * Each ride down, the five come past one after another once the hole's walls have opened out, in an order of the
 * ride's own, and one of the four that swim across lunges. The leviathan, the Reaper, the Cthuluviathan and the pair
 * of gulpers swim across the dark from one side to the other, rising past the cage as it goes down; Cthulhu hangs
 * in the water to one side, tentacles drifting, his eyes going red as the cage sinks past them, then sinks back into
 * the dark.
 */

import { rng } from '../core/math';
import { CAGE_W } from '../world/abyss';

export type GiantKind = 'leviathan' | 'reaper' | 'cthuluviathan' | 'cthulhu' | 'gulper';
export const GIANT_KINDS: readonly GiantKind[] = [
  'leviathan',
  'reaper',
  'cthuluviathan',
  'cthulhu',
  'gulper',
];
/** How long each is, nose to tail (Cthulhu, head to toe), and how fast the swimmers cross. */
export const GIANT_LEN: Readonly<Record<GiantKind, number>> = {
  leviathan: 620,
  reaper: 420,
  cthuluviathan: 520,
  cthulhu: 320,
  gulper: 240,
};
export const GIANT_SPEED: Readonly<Record<GiantKind, number>> = {
  leviathan: 320,
  reaper: 340,
  cthuluviathan: 290,
  cthulhu: 0,
  gulper: 280,
};
/** The cage's depths at which they come past, one each, from where the hole is wider than the screen to near the
 * floor. */
export const PASS_AT: readonly number[] = [700, 1150, 1600, 2050, 2500];
/** How far below the cage a swimmer starts across, and above it by the time it is over; how far to the side the
 * scene is seen from the cage, past which it starts and ends. */
export const RISE = 300;
export const SIDE = 280;
/** Where Cthulhu hangs, his feet: this far to the side of the rope and this far below the cage when he comes; and
 * how tall he is, and how near his eyes the cage passes for them to glare. */
export const CTHULHU_OFF = 170;
export const CTHULHU_BELOW = 520;
export const CTHULHU_TALL = 290;
export const GLARE = 170;
/** Once the cage is past his feet he sinks back into the dark, this long. */
export const CTHULHU_FADE = 2.5;
/** The lunge: its warning, how near across it gives it, how fast it comes, and its head this near the cage's middle
 * is a slam into the bars. */
export const TELL = 0.9;
export const TELL_AT = 160;
export const LUNGE_SPEED = 560;
export const SLAM_R = CAGE_W / 2 + 26;

export type GiantState = 'wait' | 'pass' | 'tell' | 'lunge' | 'back' | 'gone';
export type GiantEvent = 'pass' | 'tell' | 'slam' | null;

export type Giant = {
  kind: GiantKind;
  /** Its head, in the dive scene, and which way it faces (radians: 0 is +x). */
  x: number;
  y: number;
  a: number;
  /** Which way it crosses. */
  dir: -1 | 1;
  state: GiantState;
  /** The cage's depth at which it comes past. */
  at: number;
  /** Whether it is the one that lunges, this ride. */
  lunges: boolean;
  /** Seconds in its state, and its own clock for its tail and tentacles. */
  t: number;
  ph: number;
  /** Cthulhu's eyes gone red as the cage sinks past them. */
  glare: boolean;
};

type Cage = { x: number; y: number; go: 'down' | 'wait' | 'up' };

export class Giants {
  list: Giant[] = [];
  /** The cage shaking from a slam, fading. */
  shake = 0;

  /** A new ride down: the five in an order of its own from the seed, and one swimmer to lunge. */
  reset(seed: number): void {
    const r = rng(seed);
    const kinds = [...GIANT_KINDS];
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [kinds[i], kinds[j]] = [kinds[j] as GiantKind, kinds[i] as GiantKind];
    }
    // Cthulhu is never last: he would be standing in the floor.
    if (kinds[kinds.length - 1] === 'cthulhu') {
      const j = Math.floor(r() * (kinds.length - 1));
      [kinds[kinds.length - 1], kinds[j]] = [kinds[j] as GiantKind, 'cthulhu'];
    }
    // The lunger is a swimmer, and not the last: its slam is over well before the floor.
    const swimmers = kinds.slice(0, -1).filter((k) => k !== 'cthulhu');
    const lunger = swimmers[Math.floor(r() * swimmers.length)];
    this.list = kinds.map((kind, i) => ({
      kind,
      x: 0,
      y: 0,
      a: 0,
      dir: r() < 0.5 ? -1 : 1,
      state: 'wait',
      at: PASS_AT[i] as number,
      lunges: kind === lunger,
      t: 0,
      ph: r() * 6,
      glare: false,
    }));
    this.shake = 0;
  }

  /** Move them on, given the cage; what happened, if anything. */
  update(dt: number, cage: Cage | null): GiantEvent {
    this.shake = Math.max(0, this.shake - dt * 2.2);
    if (!cage) return null;
    let ev: GiantEvent = null;
    for (const g of this.list) {
      g.ph += dt;
      if (g.state === 'gone') continue;
      g.t += dt;
      if (g.state === 'wait') {
        // Each comes when the cage reaches its depth on the way down; ridden back up first, it never does.
        if (cage.go !== 'down' || cage.y < g.at) continue;
        g.state = 'pass';
        g.t = 0;
        if (g.kind === 'cthulhu') {
          g.x = cage.x + g.dir * CTHULHU_OFF;
          g.y = cage.y + CTHULHU_BELOW;
          g.a = -Math.PI / 2;
        } else {
          g.x = cage.x - g.dir * SIDE;
          g.y = cage.y + RISE;
          g.a = g.dir > 0 ? 0 : Math.PI;
        }
        ev = ev ?? 'pass';
        continue;
      }
      if (g.kind === 'cthulhu') {
        // He hangs where he is, glaring as the cage sinks past his eyes; past his feet, he sinks back into the dark.
        g.y += Math.sin(g.ph * 0.8) * 6 * dt;
        g.glare = Math.abs(cage.y - (g.y - CTHULHU_TALL * 0.73)) < GLARE;
        if (g.state === 'pass' && cage.y > g.y + 60) {
          g.state = 'back';
          g.t = 0;
        } else if (g.state === 'back' && g.t > CTHULHU_FADE) g.state = 'gone';
        continue;
      }
      const sp = GIANT_SPEED[g.kind];
      if (g.state === 'pass') {
        // Across, rising past the cage as it goes down: from below it at one side to above it at the other.
        g.x += g.dir * sp * dt;
        const across = Math.max(
          0,
          Math.min(1, (g.x - (cage.x - g.dir * SIDE)) / (g.dir * 2 * SIDE)),
        );
        g.y = cage.y + RISE - across * 2 * RISE;
        g.a = g.dir > 0 ? 0 : Math.PI;
        if (
          g.lunges &&
          cage.go === 'down' &&
          (cage.x - g.x) * g.dir > 0 &&
          Math.abs(cage.x - g.x) < TELL_AT
        ) {
          g.state = 'tell';
          g.t = 0;
          ev = 'tell';
        } else if ((g.x - cage.x) * g.dir > SIDE + GIANT_LEN[g.kind]) g.state = 'gone';
        continue;
      }
      if (g.state === 'tell') {
        // It stops and turns its head to the cage, eyes flaring: then it comes.
        g.a = turnTo(g.a, Math.atan2(cage.y - g.y, cage.x - g.x), dt * 3);
        if (g.t >= TELL) {
          g.state = 'lunge';
          g.t = 0;
        }
        continue;
      }
      if (g.state === 'lunge') {
        const dx = cage.x - g.x;
        const dy = cage.y - g.y;
        const d = Math.hypot(dx, dy) || 1;
        g.a = Math.atan2(dy, dx);
        g.x += (dx / d) * LUNGE_SPEED * dt;
        g.y += (dy / d) * LUNGE_SPEED * dt;
        if (d < SLAM_R || g.t > 1.6) {
          g.state = 'back';
          g.t = 0;
          this.shake = 1;
          ev = 'slam';
        }
        continue;
      }
      // Back: off the way it was going, and away into the dark.
      g.a = turnTo(g.a, g.dir > 0 ? -0.3 : Math.PI + 0.3, dt * 2);
      g.x += Math.cos(g.a) * sp * dt;
      g.y += Math.sin(g.a) * sp * dt;
      if (Math.hypot(g.x - cage.x, g.y - cage.y) > 900) g.state = 'gone';
    }
    return ev;
  }

  /** The one coming at the cage, warning or lunging, if any. */
  get lunging(): Giant | null {
    return this.list.find((g) => g.state === 'tell' || g.state === 'lunge') ?? null;
  }
}

/** Turn angle a toward b by at most k. */
function turnTo(a: number, b: number, k: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + Math.max(-k, Math.min(k, d));
}
