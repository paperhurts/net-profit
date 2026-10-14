/**
 * Island 10's swamp creatures, the kid's ("swamp things: everything but mosquitoes"). Six kinds, none of them any
 * trouble (the gators are, entities/gators.ts):
 *
 *  - frogs round the three small pools, on the lily pads and on the mud at the edge, puffing their throats out to croak
 *    now and then. Come close and they plop into the water; a while later they peek out and climb back;
 *  - snakes, slithering slowly in long S-curves round the swamp. Come close and one rears up and hisses, then slithers
 *    off the other way;
 *  - swamp panthers, sleek and black with green eyes, prowling slowly between the cypresses with their tails swishing,
 *    and sitting now and then to wash a paw. Come close and they crouch low and slink away;
 *  - tiny bears, three cubs that toddle about, sit, and roll over. Come close and they sit up and wave;
 *  - tiny deer, little spotted ones no bigger than a dog, browsing with their heads down. Come close and they bound
 *    away with their white tails up, then wander back;
 *  - the swamp monster, which looks like a mound of moss and weed until the figure comes near: then it rises up, tall
 *    and dripping, eyes glowing, and roars, arms up. Then it waves. It sinks back down once the figure has gone.
 *
 * A tap on any of them gets its own sound (targets, poke). They all keep to the swamp, and are back where they live
 * each time the island is visited (home). The game draws them among the island's solids (render/swamp10.ts).
 */

import { rng } from '../core/math';
import type { Point } from '../world/island';
import {
  CYPRESS10,
  ISLE10,
  inWater10,
  onIsle10Ground,
  POOLS10,
  PRAIRIE_A,
  padsOf,
  polar10,
  regionAt,
  SWAMP_A,
  shoreR10,
} from '../world/isle10';
import type { DrawView, Entity, Layer, World } from './entity';

export type SwampKind = 'frog' | 'snake' | 'panther' | 'cub' | 'deer' | 'monster';

/** Far enough from the figure, nothing here moves at all (the boat can be anywhere). */
const AWAKE = 1400;

/** Somewhere a swamp creature may be: on the swamp's mud, out of the water, in from the beach. */
export function onSwamp(x: number, y: number, pad = 0): boolean {
  if (!onIsle10Ground(x, y) || inWater10(x, y, 8 + pad) || regionAt(x, y) !== 'swamp') return false;
  const [a, d] = polar10(x, y);
  return d < shoreR10(a) - 46 - pad;
}

/** Points in the swamp from a seed, each this far from the others and clear of the cypresses' trunks. */
function spots(
  seed: number,
  n: number,
  apart: number,
  pad: number,
  dMin = 130,
  dMax = 470,
): Point[] {
  const R = rng(seed);
  const out: Point[] = [];
  for (let k = 0; out.length < n && k < n * 800; k++) {
    const a = SWAMP_A + R() * (PRAIRIE_A - SWAMP_A);
    const d = dMin + R() * (dMax - dMin);
    const x = ISLE10.x + Math.cos(a) * d;
    const y = ISLE10.y + Math.sin(a) * d;
    if (!onSwamp(x, y, pad)) continue;
    if (CYPRESS10.some(([cx, cy]) => Math.hypot(x - cx, y - cy) < 12 + pad)) continue;
    if (!out.every(([px, py]) => Math.hypot(x - px, y - py) > apart)) continue;
    out.push([x, y]);
  }
  return out;
}

/** The first way round from a heading, turning out either side, that stays in the swamp for a step of d. */
function clearWay(x: number, y: number, h: number, d: number): number | null {
  for (const turn of [0, 0.5, -0.5, 1.1, -1.1, 1.8, -1.8, Math.PI]) {
    if (onSwamp(x + Math.cos(h + turn) * d, y + Math.sin(h + turn) * d)) return h + turn;
  }
  return null;
}

/** Which way a heading faces on the screen: 1 right, -1 left. */
function faceOf(dx: number, dy: number, was: number): number {
  const s = dx - dy;
  return Math.abs(s) > 0.01 ? Math.sign(s) : was;
}

/* ---------- frogs ---------- */

/** They plop in from the figure this near; hop this long; stay under at least and at most this long. */
export const FROG_SHY = 45;
export const FROG_HOP = 0.35;
export const FROG_UNDER: readonly [number, number] = [3, 5];
/** A croak every so often, this long; the game only hears the ones this near the figure. */
export const CROAK_EVERY: readonly [number, number] = [6, 14];
export const CROAK_FOR = 0.7;
export const CROAK_NEAR = 170;

export type Frog = {
  x: number;
  y: number;
  home: Point;
  pool: { x: number; y: number; r: number };
  /** On a lily pad, not the bank. */
  pad: boolean;
  state: 'sit' | 'dive' | 'under' | 'climb';
  t: number;
  /** Seconds to the next croak, or under the water. */
  wait: number;
  /** Seconds of croak left: its throat puffed out. */
  croak: number;
  face: number;
  from: Point;
  to: Point;
  /** Green, brown or bright. */
  kind: number;
};

/* ---------- snakes ---------- */

/** It slithers at this, and flees at this; rears at the figure this near; keeps within this of home. */
export const SNAKE_SPEED = 13;
export const SNAKE_FLEE = 38;
export const SNAKE_SHY = 50;
export const SNAKE_RANGE = 80;
export const REAR_FOR = 1.3;
export const FLEE_FOR = 2;
/** Its body: this many points along its trail, this far apart. */
export const SNAKE_SEGS = 13;
export const SNAKE_SEG = 3;

export type Snake = {
  x: number;
  y: number;
  h: number;
  home: Point;
  /** Where its body has been, nearest the head first. */
  trail: Point[];
  state: 'slither' | 'rear' | 'flee';
  t: number;
  /** Seconds before it will rear again. */
  calm: number;
  wig: number;
  kind: number;
};

/* ---------- panthers ---------- */

/** It prowls at this, slinks off at this from the figure this near, and keeps within this of home. */
export const PANTHER_WALK = 16;
export const PANTHER_SLINK = 60;
export const PANTHER_SHY = 85;
export const PANTHER_RANGE = 110;
export const PANTHER_SIT: readonly [number, number] = [3, 6];
export const SLINK_FOR = 1.6;

export type Panther = {
  x: number;
  y: number;
  home: Point;
  tx: number;
  ty: number;
  h: number;
  state: 'prowl' | 'sit' | 'slink';
  t: number;
  wait: number;
  face: number;
  step: number;
  /** A yawn, after a tap, this many seconds left. */
  yawn: number;
};

/* ---------- tiny bears ---------- */

/** A cub toddles at this within this of home; sits up and waves at the figure this near; rolls over this long. */
export const CUB_WALK = 11;
export const CUB_RANGE = 45;
export const CUB_CURIOUS = 80;
export const ROLL_FOR = 0.9;

export type Cub = {
  x: number;
  y: number;
  home: Point;
  tx: number;
  ty: number;
  state: 'toddle' | 'sit' | 'roll' | 'wave';
  t: number;
  wait: number;
  face: number;
  step: number;
};

/* ---------- tiny deer ---------- */

/** A deer wanders at this within this of home; bounds off from the figure this near until it is this far. */
export const DEER_WALK = 10;
export const DEER_RANGE = 60;
export const DEER_SHY = 75;
export const DEER_CLEAR = 110;
export const DEER_BOUND_T = 0.32;
export const DEER_BOUND_D = 30;

export type Deer = {
  x: number;
  y: number;
  home: Point;
  tx: number;
  ty: number;
  state: 'browse' | 'walk' | 'bound';
  t: number;
  wait: number;
  face: number;
  step: number;
  /** Through a bound, from where to where. */
  from: Point;
  to: Point;
  /** Its head, 0 down browsing to 1 up. */
  head: number;
};

/* ---------- the swamp monster ---------- */

/** It wakes at the figure this near and sinks back once it is this far for a while; how long each part takes. */
export const MONSTER_WAKE = 90;
export const MONSTER_LEAVE = 170;
export const MONSTER_RISE = 1;
export const MONSTER_ROAR = 1.5;
export const MONSTER_SINK = 1.4;

export type Monster = {
  x: number;
  y: number;
  state: 'sleep' | 'rise' | 'roar' | 'wave' | 'sink';
  t: number;
  face: number;
  /** Seconds the figure has been far off. */
  far: number;
};

export class Swamp10 implements Entity {
  readonly frogs: Frog[];
  readonly snakes: Snake[];
  readonly panthers: Panther[];
  readonly cubs: Cub[];
  readonly deer: Deer[];
  readonly monster: Monster;
  /** A frog croaked near the figure; one plopped in; a snake hissed; the monster roared. */
  onCroak: ((f: Frog) => void) | null = null;
  onPlop: ((f: Frog) => void) | null = null;
  onHiss: ((s: Snake) => void) | null = null;
  onRoar: ((m: Monster) => void) | null = null;
  private readonly R = rng(1091);

  constructor() {
    const small = POOLS10.filter((p) => p.r < 35);
    this.frogs = small.flatMap((pool, n) => {
      const homes: [Point, boolean][] = [[padsOf(pool)[0] ?? [pool.x, pool.y], true]];
      // Two on the bank, round from the pad, wherever there is mud to sit on.
      for (let k = 0; k < 24 && homes.length < 3; k++) {
        const a = n * 1.3 + k * 0.9;
        const x = pool.x + Math.cos(a) * (pool.r + 10);
        const y = pool.y + Math.sin(a) * (pool.r + 10);
        if (onSwamp(x, y) && homes.every(([[hx, hy]]) => Math.hypot(x - hx, y - hy) > 22))
          homes.push([[x, y], false]);
      }
      return homes.map(([home, pad], i) => ({
        x: home[0],
        y: home[1],
        home,
        pool,
        pad,
        state: 'sit' as const,
        t: 0,
        wait: 1 + n * 1.7 + i * 2.3,
        croak: 0,
        face: i % 2 ? 1 : -1,
        from: home,
        to: home,
        kind: (n + i) % 3,
      }));
    });
    this.snakes = spots(1093, 3, 140, 10).map(([x, y], i) => ({
      x,
      y,
      h: i * 2.1,
      home: [x, y] as Point,
      trail: Array.from(
        { length: SNAKE_SEGS },
        (_, k): Point => [
          x - Math.cos(i * 2.1) * SNAKE_SEG * (k + 1),
          y - Math.sin(i * 2.1) * SNAKE_SEG * (k + 1),
        ],
      ),
      state: 'slither' as const,
      t: 0,
      calm: 0,
      wig: i * 1.7,
      kind: i % 3,
    }));
    this.panthers = spots(1097, 2, 180, 16).map(([x, y], i) => ({
      x,
      y,
      home: [x, y] as Point,
      tx: x,
      ty: y,
      h: 0,
      state: 'sit' as const,
      t: 0,
      wait: 1 + i * 2,
      face: i % 2 ? 1 : -1,
      step: 0,
      yawn: 0,
    }));
    const den = spots(1103, 1, 0, 30)[0] ?? [ISLE10.x + 260, ISLE10.y - 60];
    this.cubs = [
      [0, 0],
      [16, 10],
      [-12, 14],
    ].map(([dx, dy], i) => {
      const x = den[0] + (dx ?? 0);
      const y = den[1] + (dy ?? 0);
      return {
        x,
        y,
        home: [x, y] as Point,
        tx: x,
        ty: y,
        state: 'sit' as const,
        t: 0,
        wait: 0.5 + i,
        face: i % 2 ? 1 : -1,
        step: 0,
      };
    });
    this.deer = spots(1109, 4, 70, 20).map(([x, y], i) => ({
      x,
      y,
      home: [x, y] as Point,
      tx: x,
      ty: y,
      state: 'browse' as const,
      t: 0,
      wait: 1 + i * 1.3,
      face: i % 2 ? 1 : -1,
      step: 0,
      from: [x, y] as Point,
      to: [x, y] as Point,
      head: 0,
    }));
    const lair = spots(1117, 1, 0, 30, 300, 440)[0] ?? [ISLE10.x + 380, ISLE10.y - 120];
    this.monster = { x: lair[0], y: lair[1], state: 'sleep', t: 0, face: -1, far: 0 };
  }

  /** Everyone back where they live, as when the island is left and visited again. */
  home(): void {
    for (const f of this.frogs) {
      [f.x, f.y] = f.home;
      f.state = 'sit';
      f.croak = 0;
    }
    for (const s of this.snakes) {
      s.state = 'slither';
      s.calm = 0;
    }
    for (const p of this.panthers) {
      [p.x, p.y] = p.home;
      p.state = 'sit';
      p.wait = 2;
    }
    for (const c of this.cubs) {
      [c.x, c.y] = c.home;
      c.state = 'sit';
      c.wait = 1;
    }
    for (const d of this.deer) {
      [d.x, d.y] = d.home;
      d.state = 'browse';
      d.wait = 1;
    }
    this.monster.state = 'sleep';
    this.monster.far = 0;
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    if (!f || Math.hypot(f.x - ISLE10.x, f.y - ISLE10.y) > AWAKE) return;
    for (const fr of this.frogs) this.updateFrog(fr, dt, f);
    for (const s of this.snakes) this.updateSnake(s, dt, f);
    for (const p of this.panthers) this.updatePanther(p, dt, w, f);
    for (const c of this.cubs) this.updateCub(c, dt, w, f);
    for (const d of this.deer) this.updateDeer(d, dt, w, f);
    this.updateMonster(dt, f);
  }

  private rand(lo: number, hi: number): number {
    return lo + this.R() * (hi - lo);
  }

  /** Somewhere new within range of home, on the mud. */
  private wander(home: Point, range: number, at: { x: number; y: number }): Point {
    for (let k = 0; k < 12; k++) {
      const a = this.R() * Math.PI * 2;
      const r = range * Math.sqrt(this.R());
      const x = home[0] + Math.cos(a) * r;
      const y = home[1] + Math.sin(a) * r;
      if (onSwamp(x, y)) return [x, y];
    }
    return [at.x, at.y];
  }

  /** A step toward (tx, ty) at speed; whether it has got there. */
  private static walk(
    a: { x: number; y: number; face: number; step: number },
    tx: number,
    ty: number,
    speed: number,
    dt: number,
  ): boolean {
    const dx = tx - a.x;
    const dy = ty - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) return true;
    const s = Math.min(d, speed * dt);
    const nx = a.x + (dx / d) * s;
    const ny = a.y + (dy / d) * s;
    if (!onSwamp(nx, ny)) return true;
    a.x = nx;
    a.y = ny;
    a.face = faceOf(dx, dy, a.face);
    a.step += dt * speed * 0.35;
    return false;
  }

  private updateFrog(fr: Frog, dt: number, f: { x: number; y: number }): void {
    fr.t += dt;
    const fd = Math.hypot(f.x - fr.x, f.y - fr.y);
    if (fr.state === 'sit') {
      fr.croak = Math.max(0, fr.croak - dt);
      fr.wait -= dt;
      if (fr.wait <= 0) {
        fr.croak = CROAK_FOR;
        fr.wait = this.rand(CROAK_EVERY[0], CROAK_EVERY[1]);
        if (fd < CROAK_NEAR) this.onCroak?.(fr);
      }
      if (fd < FROG_SHY) {
        // Into the water: a pad frog straight down off its pad, a bank frog out into the pool.
        const p = fr.pool;
        const a = Math.atan2(fr.y - p.y, fr.x - p.x);
        fr.state = 'dive';
        fr.t = 0;
        fr.croak = 0;
        fr.from = [fr.x, fr.y];
        fr.to = fr.pad
          ? [fr.x, fr.y]
          : [p.x + Math.cos(a) * p.r * 0.5, p.y + Math.sin(a) * p.r * 0.5];
        fr.face = faceOf(fr.to[0] - fr.x, fr.to[1] - fr.y, fr.face);
      }
      return;
    }
    if (fr.state === 'dive' || fr.state === 'climb') {
      const k = Math.min(1, fr.t / FROG_HOP);
      fr.x = fr.from[0] + (fr.to[0] - fr.from[0]) * k;
      fr.y = fr.from[1] + (fr.to[1] - fr.from[1]) * k;
      if (k < 1) return;
      fr.t = 0;
      if (fr.state === 'dive') {
        fr.state = 'under';
        fr.wait = this.rand(FROG_UNDER[0], FROG_UNDER[1]);
        this.onPlop?.(fr);
      } else {
        fr.state = 'sit';
        fr.wait = this.rand(1, 4);
      }
      return;
    }
    // Under: up again once the figure has gone on a little way.
    fr.wait -= dt;
    if (fr.wait > 0) return;
    if (Math.hypot(f.x - fr.home[0], f.y - fr.home[1]) < FROG_SHY + 25) {
      fr.wait = 0.5;
      return;
    }
    fr.state = 'climb';
    fr.t = 0;
    fr.from = [fr.x, fr.y];
    fr.to = fr.home;
    fr.face = faceOf(fr.to[0] - fr.x, fr.to[1] - fr.y, fr.face);
  }

  private updateSnake(s: Snake, dt: number, f: { x: number; y: number }): void {
    s.t += dt;
    s.calm = Math.max(0, s.calm - dt);
    const fd = Math.hypot(f.x - s.x, f.y - s.y);
    if (s.state === 'slither' && fd < SNAKE_SHY && s.calm <= 0) {
      s.state = 'rear';
      s.t = 0;
      s.h = Math.atan2(f.y - s.y, f.x - s.x);
      this.onHiss?.(s);
    }
    if (s.state === 'rear') {
      if (s.t >= REAR_FOR) {
        s.state = 'flee';
        s.t = 0;
        s.h = Math.atan2(s.y - f.y, s.x - f.x);
      }
      return;
    }
    let speed = SNAKE_SPEED;
    if (s.state === 'flee') {
      speed = SNAKE_FLEE;
      if (s.t >= FLEE_FOR) {
        s.state = 'slither';
        s.t = 0;
        s.calm = 3;
      }
    } else {
      // A slow wander, steered back home when it has gone far enough.
      s.h += Math.sin(s.wig * 0.7) * 0.9 * dt;
      const hx = s.home[0] - s.x;
      const hy = s.home[1] - s.y;
      if (Math.hypot(hx, hy) > SNAKE_RANGE) {
        const want = Math.atan2(hy, hx);
        const diff = Math.atan2(Math.sin(want - s.h), Math.cos(want - s.h));
        s.h += Math.sign(diff) * Math.min(Math.abs(diff), 1.2 * dt);
      }
    }
    s.wig += dt * (speed / SNAKE_SPEED);
    const way = clearWay(s.x, s.y, s.h, Math.max(2, speed * dt));
    if (way === null) return;
    s.h = way;
    s.x += Math.cos(s.h) * speed * dt;
    s.y += Math.sin(s.h) * speed * dt;
    const [lx, ly] = s.trail[0] ?? [s.x, s.y];
    if (Math.hypot(s.x - lx, s.y - ly) >= SNAKE_SEG) {
      s.trail.unshift([s.x, s.y]);
      s.trail.length = SNAKE_SEGS;
    }
  }

  private updatePanther(p: Panther, dt: number, w: World, f: { x: number; y: number }): void {
    p.t += dt;
    p.yawn = Math.max(0, p.yawn - dt);
    const fd = Math.hypot(f.x - p.x, f.y - p.y);
    if (fd < PANTHER_SHY && p.state !== 'slink') {
      p.state = 'slink';
      p.t = 0;
      p.yawn = 0;
      p.h = Math.atan2(p.y - f.y, p.x - f.x);
    }
    if (p.state === 'slink') {
      const way = clearWay(p.x, p.y, p.h, PANTHER_SLINK * dt + 1);
      if (way !== null) {
        p.h = way;
        p.x += Math.cos(p.h) * PANTHER_SLINK * dt;
        p.y += Math.sin(p.h) * PANTHER_SLINK * dt;
        p.face = faceOf(Math.cos(p.h), Math.sin(p.h), p.face);
        p.step += dt * PANTHER_SLINK * 0.3;
      }
      if (p.t >= SLINK_FOR) {
        p.state = 'prowl';
        p.t = 0;
        [p.tx, p.ty] = this.wander(p.home, PANTHER_RANGE, p);
      }
      return;
    }
    if (p.state === 'sit') {
      p.wait -= dt;
      if (p.wait <= 0) {
        p.state = 'prowl';
        [p.tx, p.ty] = this.wander(p.home, PANTHER_RANGE, p);
      }
      return;
    }
    if (Swamp10.walk(p, p.tx, p.ty, PANTHER_WALK, dt)) {
      if (w.rng() < 0.45) {
        p.state = 'sit';
        p.wait = this.rand(PANTHER_SIT[0], PANTHER_SIT[1]);
      } else [p.tx, p.ty] = this.wander(p.home, PANTHER_RANGE, p);
    }
  }

  private updateCub(c: Cub, dt: number, w: World, f: { x: number; y: number }): void {
    c.t += dt;
    const fd = Math.hypot(f.x - c.x, f.y - c.y);
    if (c.state === 'roll') {
      if (c.t >= ROLL_FOR) {
        c.state = 'sit';
        c.t = 0;
        c.wait = 1.5;
      }
      return;
    }
    if (fd < CUB_CURIOUS) {
      if (c.state !== 'wave') {
        c.state = 'wave';
        c.t = 0;
      }
      c.face = faceOf(f.x - c.x, f.y - c.y, c.face);
      return;
    }
    if (c.state === 'wave') {
      if (fd < CUB_CURIOUS + 20) return;
      c.state = 'sit';
      c.wait = 1;
    }
    if (c.state === 'sit') {
      c.wait -= dt;
      if (c.wait > 0) return;
      c.state = 'toddle';
      [c.tx, c.ty] = this.wander(c.home, CUB_RANGE, c);
      return;
    }
    if (Swamp10.walk(c, c.tx, c.ty, CUB_WALK, dt)) {
      const r = w.rng();
      c.t = 0;
      if (r < 0.5) {
        c.state = 'sit';
        c.wait = this.rand(2, 4);
      } else if (r < 0.7) c.state = 'roll';
      else [c.tx, c.ty] = this.wander(c.home, CUB_RANGE, c);
    }
  }

  private updateDeer(d: Deer, dt: number, w: World, f: { x: number; y: number }): void {
    d.t += dt;
    const fd = Math.hypot(f.x - d.x, f.y - d.y);
    if (d.state === 'bound') {
      const k = Math.min(1, d.t / DEER_BOUND_T);
      d.x = d.from[0] + (d.to[0] - d.from[0]) * k;
      d.y = d.from[1] + (d.to[1] - d.from[1]) * k;
      d.step += dt * 10;
      if (k < 1) return;
      if (fd < DEER_CLEAR) this.bound(d, Math.atan2(d.y - f.y, d.x - f.x) + (w.rng() - 0.5) * 0.7);
      else {
        d.state = 'browse';
        d.wait = this.rand(1, 3);
      }
      return;
    }
    if (fd < DEER_SHY) {
      this.bound(d, Math.atan2(d.y - f.y, d.x - f.x) + (w.rng() - 0.5) * 0.7);
      return;
    }
    if (d.state === 'browse') {
      d.head = Math.max(0, d.head - dt * 2);
      d.wait -= dt;
      if (d.wait <= 0) {
        d.state = 'walk';
        [d.tx, d.ty] = this.wander(d.home, DEER_RANGE, d);
      }
      return;
    }
    d.head = Math.min(1, d.head + dt * 2);
    if (Swamp10.walk(d, d.tx, d.ty, DEER_WALK, dt)) {
      d.state = 'browse';
      d.wait = this.rand(3, 7);
    }
  }

  /** A bound that way (or turned a little), staying in the swamp and not too far from home. */
  private bound(d: Deer, a: number): void {
    for (const turn of [0, 0.6, -0.6, 1.2, -1.2, 2, -2]) {
      const x = d.x + Math.cos(a + turn) * DEER_BOUND_D;
      const y = d.y + Math.sin(a + turn) * DEER_BOUND_D;
      if (!onSwamp(x, y) || Math.hypot(x - d.home[0], y - d.home[1]) > DEER_RANGE * 3) continue;
      d.state = 'bound';
      d.t = 0;
      d.head = 1;
      d.from = [d.x, d.y];
      d.to = [x, y];
      d.face = faceOf(x - d.x, y - d.y, d.face);
      return;
    }
    d.state = 'browse';
    d.wait = 0.5;
  }

  private updateMonster(dt: number, f: { x: number; y: number }): void {
    const m = this.monster;
    m.t += dt;
    const fd = Math.hypot(f.x - m.x, f.y - m.y);
    if (m.state !== 'sleep' && m.state !== 'sink') m.face = faceOf(f.x - m.x, f.y - m.y, m.face);
    if (m.state === 'sleep') {
      if (fd < MONSTER_WAKE) this.wake();
    } else if (m.state === 'rise') {
      if (m.t >= MONSTER_RISE) this.roar();
    } else if (m.state === 'roar') {
      if (m.t >= MONSTER_ROAR) {
        m.state = 'wave';
        m.t = 0;
      }
    } else if (m.state === 'wave') {
      m.far = fd > MONSTER_LEAVE ? m.far + dt : 0;
      if (m.far > 2) {
        m.state = 'sink';
        m.t = 0;
      }
    } else if (m.t >= MONSTER_SINK) {
      m.state = 'sleep';
      m.t = 0;
    }
  }

  private wake(): void {
    this.monster.state = 'rise';
    this.monster.t = 0;
    this.monster.far = 0;
  }

  private roar(): void {
    this.monster.state = 'roar';
    this.monster.t = 0;
    this.onRoar?.(this.monster);
  }

  /** How far up the monster stands, 0 a mound to 1 at its full height. */
  static monsterUp(m: Monster): number {
    if (m.state === 'sleep') return 0;
    if (m.state === 'rise') return Math.min(1, m.t / MONSTER_RISE);
    if (m.state === 'sink') return 1 - Math.min(1, m.t / MONSTER_SINK);
    return 1;
  }

  /** What a tap can land on, and the height its middle is at: frogs out of the water, and all the rest. */
  targets(): { k: SwampKind; i: number; x: number; y: number; z: number }[] {
    const m = this.monster;
    return [
      ...this.frogs
        .map((f, i) => ({
          k: 'frog' as const,
          i,
          x: f.x,
          y: f.y,
          z: 3,
          under: f.state === 'under',
        }))
        .filter((f) => !f.under),
      ...this.snakes.map((s, i) => ({
        k: 'snake' as const,
        i,
        x: s.x,
        y: s.y,
        z: s.state === 'rear' ? 12 : 2,
      })),
      ...this.panthers.map((p, i) => ({ k: 'panther' as const, i, x: p.x, y: p.y, z: 8 })),
      ...this.cubs.map((c, i) => ({ k: 'cub' as const, i, x: c.x, y: c.y, z: 5 })),
      ...this.deer.map((d, i) => ({ k: 'deer' as const, i, x: d.x, y: d.y, z: 9 })),
      { k: 'monster' as const, i: 0, x: m.x, y: m.y, z: 6 + Swamp10.monsterUp(m) * 22 },
    ];
  }

  /**
   * A tap on one: a frog croaks, a snake rears up, a panther sits and yawns, a cub rolls over, a deer bounds off, and
   * the monster wakes, or roars again.
   */
  poke(k: SwampKind, i: number): void {
    if (k === 'frog') {
      const f = this.frogs[i];
      if (f && f.state === 'sit') f.croak = CROAK_FOR;
    } else if (k === 'snake') {
      const s = this.snakes[i];
      if (s && s.state !== 'rear') {
        s.state = 'rear';
        s.t = 0;
      }
    } else if (k === 'panther') {
      const p = this.panthers[i];
      if (p && p.state !== 'slink') {
        p.state = 'sit';
        p.wait = Math.max(p.wait, 2.5);
        p.yawn = 1.2;
      }
    } else if (k === 'cub') {
      const c = this.cubs[i];
      if (c && c.state !== 'roll') {
        c.state = 'roll';
        c.t = 0;
      }
    } else if (k === 'deer') {
      const d = this.deer[i];
      if (d && d.state !== 'bound') this.bound(d, this.R() * Math.PI * 2);
    } else if (k === 'monster') {
      const m = this.monster;
      if (m.state === 'sleep' || m.state === 'sink') this.wake();
      else if (m.state === 'wave') this.roar();
    }
  }

  /** The game draws them (render/swamp10.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}
