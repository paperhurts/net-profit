/**
 * The tar creatures on the tar island, the kid's (his sixth list's drawing and his answers: "tar humans", "tar beasts",
 * 3 to 5 damage and 15 to 20 hits, the owner's take that each blow is wound up so it can be dodged; and the tar beast
 * "will not fight if knows will lose unless forced to"). Tar humans stand about the shore, black and dripping with
 * yellow eyes; tar beasts prowl the hill on four legs. Come near one and it rises, eyes flaring, and the others near it
 * with it, then comes on. A tar human close enough raises its arms over its head while a ring shows on the ground in
 * front of it (the warning: get out of it), then slams them down there. A tar beast crouches while a line shows along
 * the ground ahead of it, then lunges along it: step off the line. A tar beast losing, and knowing it, runs from the
 * figure, and fights again only when it is cornered, its back to the tar. Beaten, either melts into a puddle, leaving
 * coins. Every landing they are back.
 */

import type { Point } from '../world/island';
import { onIsleRock, onTarIsle, TAR_ISLE } from '../world/tarisle';
import type { DrawView, Entity, Layer, World } from './entity';
import { walkStep } from './walker';

export type TarKind = 'human' | 'beast';

export interface TarSpec {
  /** Hits to beat it, and hearts its blow takes. */
  hp: number;
  dmg: number;
  /** How fast it comes on; the figure walks at 85. */
  speed: number;
  /** It winds up a blow from this near; the blow lands this far ahead of it, over this wide (a ring, or a line's half width). */
  reach: number;
  ahead: number;
  wide: number;
  /** Seconds: the wind-up (the warning), the blow, and the time it is open after. */
  windup: number;
  strike: number;
  recover: number;
  /** Coins one leaves. */
  prize: number;
}

export const TAR_SPEC: Readonly<Record<TarKind, TarSpec>> = {
  human: {
    hp: 15,
    dmg: 3,
    speed: 44,
    reach: 32,
    ahead: 22,
    wide: 26,
    windup: 0.9,
    strike: 0.25,
    recover: 1.1,
    prize: 60,
  },
  beast: {
    hp: 18,
    dmg: 4,
    speed: 54,
    reach: 70,
    ahead: 80,
    wide: 20,
    windup: 1,
    strike: 0.3,
    recover: 1.4,
    prize: 90,
  },
};

/** It wakes for the figure this near, and the others within this of it with it. */
export const TAR_WAKE = 150;
export const TAR_CALL = 220;
/** Seconds of rising up, eyes flaring, before it comes on. */
export const TAR_RISE = 0.8;
/** A tar beast runs once it is down to this share of its hits; cornered, stuck this long, it fights again. */
export const BEAST_FLEE = 0.4;
export const CORNERED_T = 0.5;
/** Seconds it takes to melt into a puddle. */
export const TAR_MELT = 1.4;

export type TarState =
  | 'idle'
  | 'rise'
  | 'chase'
  | 'windup'
  | 'strike'
  | 'recover'
  | 'flee'
  | 'back'
  | 'melt'
  | 'gone';

export type TarFolk = {
  kind: TarKind;
  x: number;
  y: number;
  h: number;
  home: Point;
  hp: number;
  state: TarState;
  t: number;
  flash: number;
  stunT: number;
  /** Where its blow lands: a ring's middle, or a lunge's start and end. */
  from: Point;
  to: Point;
  step: number;
  /** A beast that has been cornered fights on to the end. */
  cornered: boolean;
  stuckT: number;
  /** Called up out of the rock by the tar leader: gone again at the next landing. */
  extra?: boolean;
};

/** Where they stand: tar humans round the shore, tar beasts up the hill, none near the jetty. */
export const TAR_HOMES: readonly { kind: TarKind; at: Point }[] = [
  { kind: 'human', at: [TAR_ISLE.x - 300, TAR_ISLE.y + 160] },
  { kind: 'human', at: [TAR_ISLE.x + 320, TAR_ISLE.y - 60] },
  { kind: 'human', at: [TAR_ISLE.x + 60, TAR_ISLE.y - 360] },
  { kind: 'human', at: [TAR_ISLE.x - 340, TAR_ISLE.y - 140] },
  { kind: 'beast', at: [TAR_ISLE.x - 170, TAR_ISLE.y - 210] },
  { kind: 'beast', at: [TAR_ISLE.x + 210, TAR_ISLE.y - 170] },
];

export class TarFolks implements Entity {
  readonly list: TarFolk[] = [];
  /** Whether the figure is on the tar island: away from it they stand still, and are no fight. */
  here = false;
  /** One rose up; wound up a blow; struck (for this many hearts, if the figure was in it); ran; was beaten. */
  onRise: ((f: TarFolk) => void) | null = null;
  onWindup: ((f: TarFolk) => void) | null = null;
  onStrike: ((f: TarFolk, hit: boolean) => void) | null = null;
  onHit: ((n: number) => void) | null = null;
  onFlee: ((f: TarFolk) => void) | null = null;
  onBeaten: ((f: TarFolk) => void) | null = null;

  /**
   * Their ground: the tar island, or, on the Battle Barge, its deck (ground). A tar beast lunges only as far as it goes,
   * and runs only over it.
   */
  constructor(
    at: readonly { kind: TarKind; at: Point }[] = TAR_HOMES,
    readonly ground: (x: number, y: number) => boolean = onTarIsle,
  ) {
    this.place(at);
  }

  /** These ones standing here, in place of any before. */
  place(at: readonly { kind: TarKind; at: Point }[]): void {
    this.list.length = 0;
    at.forEach((o, i) => {
      this.list.push({
        kind: o.kind,
        x: o.at[0],
        y: o.at[1],
        h: 0,
        home: o.at,
        hp: TAR_SPEC[o.kind].hp,
        state: 'idle',
        t: 0,
        flash: 0,
        stunT: 0,
        from: o.at,
        to: o.at,
        step: i * 1.7,
        cornered: false,
        stuckT: 0,
      });
    });
  }

  /** All of them up at once, as on the Battle Barge. */
  wake(): void {
    for (const f of this.list) {
      if (f.state !== 'idle') continue;
      this.set(f, 'rise');
      this.onRise?.(f);
    }
  }

  /** Tar humans called up out of the rock round (x, y), rising at once: the tar leader's help. */
  summon(at: readonly Point[]): void {
    for (const p of at) {
      const f: TarFolk = {
        kind: 'human',
        x: p[0],
        y: p[1],
        h: 0,
        home: p,
        hp: TAR_SPEC.human.hp,
        state: 'rise',
        t: 0,
        flash: 0,
        stunT: 0,
        from: p,
        to: p,
        step: 0,
        cornered: false,
        stuckT: 0,
        extra: true,
      };
      this.list.push(f);
      this.onRise?.(f);
    }
  }

  /** All back where they stand, whole; any called up are gone. */
  reset(): void {
    for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i]?.extra) this.list.splice(i, 1);
    for (const f of this.list) {
      [f.x, f.y] = f.home;
      f.hp = TAR_SPEC[f.kind].hp;
      f.state = 'idle';
      f.t = 0;
      f.flash = 0;
      f.stunT = 0;
      f.cornered = false;
      f.stuckT = 0;
    }
  }

  /** Up and after the figure, or running from it. */
  static up(f: TarFolk): boolean {
    return (
      f.state === 'rise' ||
      f.state === 'chase' ||
      f.state === 'windup' ||
      f.state === 'strike' ||
      f.state === 'recover' ||
      f.state === 'flee'
    );
  }

  get roused(): boolean {
    return this.here && this.list.some((f) => TarFolks.up(f));
  }

  /** The nearest within range: those up only, or, with quiet, those standing about or going home too. */
  nearest(x: number, y: number, range: number, quiet = false): TarFolk | null {
    let best: TarFolk | null = null;
    let bd = range;
    for (const f of this.list) {
      if (!(TarFolks.up(f) || (quiet && (f.state === 'idle' || f.state === 'back')))) continue;
      const d = Math.hypot(f.x - x, f.y - y);
      if (d <= bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  /** A hit: one standing about is roused, and the others near it; a beast losing runs; at none it melts. Whether it hurt. */
  hit(f: TarFolk, power: number): boolean {
    if (f.state === 'melt' || f.state === 'gone') return false;
    if (f.state === 'idle' || f.state === 'back') this.rouse(f);
    f.hp -= power;
    f.flash = 0.15;
    if (f.hp <= 0) {
      f.hp = 0;
      this.set(f, 'melt');
      this.onBeaten?.(f);
      return true;
    }
    if (
      f.kind === 'beast' &&
      !f.cornered &&
      f.hp <= TAR_SPEC.beast.hp * BEAST_FLEE &&
      f.state !== 'flee' &&
      f.state !== 'strike'
    ) {
      this.set(f, 'flee');
      f.stuckT = 0;
      this.onFlee?.(f);
    }
    return true;
  }

  /** Tar in its face, or a stun: it stands this many seconds, and a blow it was winding up comes to nothing. */
  stun(f: TarFolk, s: number): void {
    if (!TarFolks.up(f) || f.state === 'strike') return;
    f.stunT = Math.max(f.stunT, s);
    if (f.state === 'windup') this.set(f, 'chase');
  }

  update(dt: number, w: World): void {
    if (!this.here) return;
    const fig = w.figure;
    for (const f of this.list) {
      f.t += dt;
      f.flash = Math.max(0, f.flash - dt);
      f.step += dt;
      if (f.state === 'gone') continue;
      if (f.state === 'melt') {
        if (f.t >= TAR_MELT) f.state = 'gone';
        continue;
      }
      const spec = TAR_SPEC[f.kind];
      if (!fig) {
        // The figure is away: whoever was up goes back to where it stands.
        if (TarFolks.up(f)) this.set(f, 'back');
      }
      if (f.state === 'idle') {
        if (fig && Math.hypot(fig.x - f.x, fig.y - f.y) < TAR_WAKE) this.rouse(f);
        continue;
      }
      if (f.state === 'back') {
        if (this.toward(f, f.home[0], f.home[1], spec.speed * 0.7, dt)) this.set(f, 'idle');
        continue;
      }
      if (!fig) continue;
      if (f.state === 'rise') {
        f.h = Math.atan2(fig.y - f.y, fig.x - f.x);
        if (f.t >= TAR_RISE) this.set(f, 'chase');
        continue;
      }
      if (f.stunT > 0) {
        f.stunT -= dt;
        continue;
      }
      if (f.state === 'windup') {
        if (f.kind === 'beast') f.h = Math.atan2(f.to[1] - f.from[1], f.to[0] - f.from[0]);
        if (f.t >= spec.windup) {
          this.set(f, 'strike');
          if (f.kind === 'beast') this.lunge(f);
          const hit = TarFolks.catches(f, fig.x, fig.y);
          this.onStrike?.(f, hit);
          if (hit) this.onHit?.(spec.dmg);
        }
        continue;
      }
      if (f.state === 'strike') {
        if (f.t >= spec.strike) this.set(f, 'recover');
        continue;
      }
      if (f.state === 'recover') {
        if (f.t >= spec.recover) this.set(f, 'chase');
        continue;
      }
      if (f.state === 'flee') {
        // Away from the figure, until its back is to the tar: then, cornered, it fights.
        const dx = f.x - fig.x;
        const dy = f.y - fig.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > TAR_WAKE * 2) continue;
        // Straight away; round a rock, a tree or the tower, well to either side; at the tar's edge only a little,
        // not along the shore, so the tar corners it.
        const sp = spec.speed * 1.1 * dt;
        const away = Math.atan2(dy, dx);
        const ahead = onIsleRock(f.x + Math.cos(away) * sp * 4, f.y + Math.sin(away) * sp * 4);
        let moved = false;
        for (const da of ahead ? [0, 0.6, -0.6, 1.2, -1.2, 1.6, -1.6] : [0, 0.6, -0.6]) {
          const nx = f.x + Math.cos(away + da) * sp;
          const ny = f.y + Math.sin(away + da) * sp;
          if (!this.ground(nx, ny)) continue;
          f.x = nx;
          f.y = ny;
          f.h = away + da;
          moved = true;
          break;
        }
        f.stuckT = moved ? 0 : f.stuckT + dt;
        if (f.stuckT >= CORNERED_T) {
          f.cornered = true;
          this.set(f, 'chase');
        }
        continue;
      }
      // Chasing: on toward the figure, and from near enough, wind up a blow aimed where it is.
      const d = Math.hypot(fig.x - f.x, fig.y - f.y);
      if (d > spec.reach - 4) {
        this.toward(f, fig.x, fig.y, spec.speed, dt);
        continue;
      }
      const a = Math.atan2(fig.y - f.y, fig.x - f.x);
      f.h = a;
      if (f.kind === 'human') {
        f.from = [f.x + Math.cos(a) * spec.ahead, f.y + Math.sin(a) * spec.ahead];
        f.to = f.from;
      } else {
        f.from = [f.x, f.y];
        f.to = [f.x + Math.cos(a) * spec.ahead, f.y + Math.sin(a) * spec.ahead];
      }
      this.set(f, 'windup');
      this.onWindup?.(f);
    }
  }

  /** Whether a blow landing now catches whoever is at (x, y): in a tar human's ring, or on a tar beast's line. */
  static catches(f: TarFolk, x: number, y: number): boolean {
    const spec = TAR_SPEC[f.kind];
    if (f.kind === 'human') return Math.hypot(x - f.from[0], y - f.from[1]) < spec.wide;
    const ex = f.to[0] - f.from[0];
    const ey = f.to[1] - f.from[1];
    const L2 = ex * ex + ey * ey || 1;
    const k = Math.max(0, Math.min(1, ((x - f.from[0]) * ex + (y - f.from[1]) * ey) / L2));
    return Math.hypot(x - (f.from[0] + ex * k), y - (f.from[1] + ey * k)) < spec.wide;
  }

  /** The lunge: along its line, as far as the island lets it. */
  private lunge(f: TarFolk): void {
    const n = 8;
    for (let i = 1; i <= n; i++) {
      const x = f.from[0] + ((f.to[0] - f.from[0]) * i) / n;
      const y = f.from[1] + ((f.to[1] - f.from[1]) * i) / n;
      if (!this.ground(x, y)) break;
      f.x = x;
      f.y = y;
    }
  }

  /** It and the others near it rise up. */
  private rouse(f: TarFolk): void {
    for (const o of this.list) {
      if (o !== f && (o.state !== 'idle' || Math.hypot(o.x - f.x, o.y - f.y) > TAR_CALL)) continue;
      this.set(o, 'rise');
      this.onRise?.(o);
    }
  }

  private set(f: TarFolk, s: TarState): void {
    f.state = s;
    f.t = 0;
  }

  /** A step toward (x, y) over the island; whether it has got there. */
  private toward(f: TarFolk, x: number, y: number, speed: number, dt: number): boolean {
    const dx = x - f.x;
    const dy = y - f.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) return true;
    const s = Math.min(d, speed * dt);
    walkStep(f, (dx / d) * s, (dy / d) * s, 99);
    f.h = Math.atan2(dy, dx);
    return false;
  }

  /** The game draws them among the island's solids (render/tarfolk.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}
