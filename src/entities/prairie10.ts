/**
 * Island 10's prairie animals, the kid's ("Prairie has cool frolicking animals"). Four kinds, all out in the golden
 * grass between the pier and the forest, none of them any trouble:
 *
 *  - bunnies, in pairs: they hop about near home, nibbling between hops, and every so often a pair frolics, chasing
 *    each other round and round in a little ring. Come close and they bound away, then wander back;
 *  - prairie dogs, three little towns of burrows: each sits up on its mound and looks about, and one stands tall on
 *    watch. Come near a town and they squeak and duck into their holes, and pop back up once you have gone on by;
 *  - butterflies over the flowers, each fluttering round its patch;
 *  - a little herd of bison, grazing as it drifts slowly across the grass, heads down, with a calf that skips round
 *    its mother. Walk right up to one and it ambles out of the way.
 *
 * A tap on a bunny, a prairie dog or a bison gets a hop, a squeak or a snort (targets, poke). They never leave the prairie,
 * and they are all back where they live each time the island is visited (home). The game draws them among the
 * island's solids and the butterflies over them (render/prairie10.ts).
 */

import { rng } from '../core/math';
import type { Point } from '../world/island';
import {
  CRATES10,
  ISLE10,
  inWater10,
  onIsle10Ground,
  POND,
  regionAt,
  STORE10,
  shoreR10,
} from '../world/isle10';
import type { DrawView, Entity, Layer, World } from './entity';

export type PrairieKind = 'bunny' | 'dog' | 'bison';

/** Far enough from the figure, nothing here moves at all (the boat can be anywhere). */
const AWAKE = 1400;

/** Somewhere a prairie animal may stand: on the grass, out of the water, off the way up from the pier. */
export function onPrairie(x: number, y: number, pad = 0): boolean {
  if (!onIsle10Ground(x, y) || inWater10(x, y, 8 + pad) || regionAt(x, y) !== 'prairie')
    return false;
  const d = Math.hypot(x - ISLE10.x, y - ISLE10.y);
  const a = Math.atan2(y - ISLE10.y, x - ISLE10.x);
  if (d > shoreR10(a) - 46 - pad) return false;
  return (
    Math.hypot(x - CRATES10.x, y - CRATES10.y) > 36 && Math.hypot(x - STORE10.x, y - STORE10.y) > 60
  );
}

/** Points out on the prairie from a seed, each this far from the others. */
function spots(seed: number, n: number, apart: number, pad: number): Point[] {
  const R = rng(seed);
  const out: Point[] = [];
  for (let k = 0; out.length < n && k < n * 600; k++) {
    const a = Math.PI * (0.22 + R() * 0.76);
    const d = 60 + R() * 380;
    const x = ISLE10.x + Math.cos(a) * d;
    const y = ISLE10.y + Math.sin(a) * d;
    if (!onPrairie(x, y, pad)) continue;
    if (Math.abs(x - ISLE10.x) < 40 && y > ISLE10.y + 300) continue;
    if (!out.every(([px, py]) => Math.hypot(x - px, y - py) > apart)) continue;
    out.push([x, y]);
  }
  return out;
}

/* ---------- bunnies ---------- */

/** A hop: this long, this far, this high; slower and shorter just pottering about. */
export const HOP_T = 0.3;
export const HOP_D = 15;
export const BOUND_T = 0.2;
export const BOUND_D = 26;
/** A bunny bounds off from the figure this near, and wanders no further than this from home. */
export const BUNNY_SHY = 70;
export const BUNNY_RANGE = 80;
/** A pair frolics every so often, round a ring this big, for this long. */
export const PLAY_EVERY: readonly [number, number] = [7, 16];
export const PLAY_FOR = 4;
export const PLAY_R = 20;

export type Bunny = {
  x: number;
  y: number;
  home: Point;
  /** Which way it faces on the screen: 1 right, -1 left. */
  face: number;
  /** Through a hop, 0 to 1; 0 sat still. */
  hop: number;
  /** The hop it is on: from, to, and how long it takes. */
  from: Point;
  to: Point;
  hopT: number;
  /** Seconds before the next hop. */
  wait: number;
  /** Fur: 0 brown, 1 grey, 2 white. */
  kind: number;
};

/* ---------- prairie dogs ---------- */

/** A town's dogs duck at the figure this near, and come up once it is this far off and a moment has passed. */
export const DOG_DUCK = 90;
export const DOG_CLEAR = 120;
export const DOG_HIDE = 2.5;

export type PrairieDog = {
  /** Its hole. */
  x: number;
  y: number;
  town: number;
  /** How far out of the hole, 0 down to 1 sat up. */
  up: number;
  /** Seconds still to stay down. */
  hide: number;
  /** Stood tall on watch, 0 to 1, and which way it looks. */
  tall: number;
  look: number;
  t: number;
};

/* ---------- butterflies ---------- */

export type Butterfly = { home: Point; x: number; y: number; z: number; t: number; kind: number };

/* ---------- bison ---------- */

/** The herd drifts at this, a bison walks at up to this to keep its place, and the calf skips round at this. */
export const HERD_SPEED = 9;
export const BISON_WALK = 22;
/** Walk up this near to one and it ambles off. */
export const BISON_SHY = 64;
/** Grazing stops, at least and at most. */
export const GRAZE_FOR: readonly [number, number] = [5, 10];

export type Bison = {
  x: number;
  y: number;
  /** Its place in the herd, from the herd's middle. */
  dx: number;
  dy: number;
  calf: boolean;
  face: number;
  /** Head down grazing, 0 to 1, and how far through a step. */
  graze: number;
  step: number;
};

export class Prairie10 implements Entity {
  readonly bunnies: Bunny[];
  readonly dogs: PrairieDog[];
  readonly flies: Butterfly[];
  readonly bison: Bison[];
  /** The herd's middle, and where it is going; stopped to graze while grazeT runs. */
  herd = { x: 0, y: 0, tx: 0, ty: 0, grazeT: 0 };
  /** Pairs frolicking: the first bunny of the pair, the ring's middle, how far round, seconds left. */
  play: { i: number; x: number; y: number; a: number; t: number; r0: number } | null = null;
  private playWait = PLAY_EVERY[0];
  /** One clock for whose turn it is on watch in each town. */
  private watchT = 0;
  /** A town has just ducked: the game squeaks. */
  onDuck: (() => void) | null = null;

  constructor() {
    const homes = spots(1041, 4, 150, 30);
    this.bunnies = homes.flatMap(([x, y], i) =>
      [-1, 1].map((s, k) => {
        const at: Point = [x + s * 9, y + s * 5];
        return {
          x: at[0],
          y: at[1],
          home: at,
          face: s,
          hop: 0,
          from: at,
          to: at,
          hopT: HOP_T,
          wait: 0.4 + k * 0.7 + i * 0.3,
          kind: (i + k) % 3,
        };
      }),
    );
    const towns = spots(1049, 3, 170, 34);
    this.dogs = towns.flatMap(([x, y], town) =>
      [
        [0, 0],
        [22, 8],
        [-6, 22],
      ].map(([ox, oy], k) => ({
        x: x + (ox ?? 0),
        y: y + (oy ?? 0),
        town,
        up: 1,
        hide: 0,
        tall: k === 0 ? 1 : 0,
        look: k,
        t: town * 1.7 + k,
      })),
    );
    this.flies = spots(1051, 9, 60, 0).map((home, i) => ({
      home,
      x: home[0],
      y: home[1],
      z: 12,
      t: i * 1.3,
      kind: i % 3,
    }));
    const [hx, hy] = spots(1061, 1, 0, 70)[0] ?? [POND.x - 140, POND.y];
    this.herd = { x: hx, y: hy, tx: hx, ty: hy, grazeT: GRAZE_FOR[0] };
    const places: [number, number, boolean][] = [
      [0, 0, false],
      [60, -22, false],
      [-54, 25, false],
      [22, 56, false],
      [-26, -48, true],
    ];
    this.bison = places.map(([dx, dy, calf], i) => ({
      x: hx + dx,
      y: hy + dy,
      dx,
      dy,
      calf,
      face: i % 2 ? 1 : -1,
      graze: 1,
      step: i * 0.4,
    }));
  }

  /** Everyone back where they live, as when the island is left and visited again. */
  home(): void {
    for (const b of this.bunnies) {
      [b.x, b.y] = b.home;
      b.from = b.home;
      b.to = b.home;
      b.hop = 0;
    }
    for (const d of this.dogs) {
      d.up = 1;
      d.hide = 0;
    }
    this.play = null;
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    if (!f || Math.hypot(f.x - ISLE10.x, f.y - ISLE10.y) > AWAKE) return;
    this.updateBunnies(dt, w, f);
    this.updateDogs(dt, f);
    for (const b of this.flies) {
      b.t += dt;
      // A lazy loop round its flowers, rising and dipping.
      b.x = b.home[0] + Math.sin(b.t * 0.7 + b.kind) * 22 + Math.sin(b.t * 1.9) * 6;
      b.y = b.home[1] + Math.cos(b.t * 0.55 + b.kind * 2) * 18 + Math.cos(b.t * 2.3) * 5;
      b.z = 10 + Math.sin(b.t * 1.3) * 5 + Math.sin(b.t * 3.1) * 2;
    }
    this.updateBison(dt, w, f);
  }

  private updateBunnies(dt: number, w: World, f: { x: number; y: number }): void {
    // A frolic: the pair chase round a little ring, one just behind the other.
    if (this.play) {
      const p = this.play;
      p.t -= dt;
      p.a += dt * 3.2;
      for (const [k, b] of [this.bunnies[p.i], this.bunnies[p.i + 1]].entries()) {
        if (!b) continue;
        // From where they sat, across from each other, they ease out onto the ring and into the chase.
        const ease = Math.min(1, (PLAY_FOR - p.t) / 0.8);
        const a = p.a - k * (Math.PI + (1.1 - Math.PI) * ease);
        const r = p.r0 + (PLAY_R - p.r0) * ease;
        const nx = p.x + Math.cos(a) * r;
        const ny = p.y + Math.sin(a) * r;
        b.face = nx - ny - (b.x - b.y) >= 0 ? 1 : -1;
        b.x = nx;
        b.y = ny;
        b.hop = (p.a * 1.6 + k * 0.5) % 1;
      }
      const near = Math.hypot(f.x - p.x, f.y - p.y) < BUNNY_SHY;
      if (p.t <= 0 || near) {
        for (const b of [this.bunnies[p.i], this.bunnies[p.i + 1]]) if (b) this.settle(b);
        this.play = null;
        this.playWait = PLAY_EVERY[0] + w.rng() * (PLAY_EVERY[1] - PLAY_EVERY[0]);
      }
    } else {
      this.playWait -= dt;
      if (this.playWait <= 0) {
        const i = Math.floor(w.rng() * (this.bunnies.length / 2)) * 2;
        const a = this.bunnies[i];
        const b = this.bunnies[i + 1];
        if (a && b && a.hop === 0 && b.hop === 0 && Math.hypot(a.x - b.x, a.y - b.y) < PLAY_R * 3) {
          const x = (a.x + b.x) / 2;
          const y = (a.y + b.y) / 2;
          const ring = [0, 1, 2, 3].every((q) =>
            onPrairie(x + Math.cos(q * 1.57) * PLAY_R, y + Math.sin(q * 1.57) * PLAY_R),
          );
          if (ring && Math.hypot(f.x - x, f.y - y) > BUNNY_SHY * 1.5)
            this.play = {
              i,
              x,
              y,
              a: Math.atan2(a.y - y, a.x - x),
              t: PLAY_FOR,
              r0: Math.hypot(a.x - x, a.y - y),
            };
        }
        if (!this.play) this.playWait = 1.5;
      }
    }
    const playing = this.play;
    for (const [i, b] of this.bunnies.entries()) {
      if (playing && (i === playing.i || i === playing.i + 1)) continue;
      const fd = Math.hypot(f.x - b.x, f.y - b.y);
      if (b.hop > 0) {
        b.hop += dt / b.hopT;
        const t = Math.min(1, b.hop);
        b.x = b.from[0] + (b.to[0] - b.from[0]) * t;
        b.y = b.from[1] + (b.to[1] - b.from[1]) * t;
        if (b.hop >= 1) {
          b.hop = 0;
          b.wait = fd < BUNNY_SHY ? 0.05 : 0.3 + w.rng() * 1.4;
        }
        continue;
      }
      b.wait -= dt;
      if (b.wait > 0 && fd >= BUNNY_SHY) continue;
      // Away from the figure in bounds, or a potter about home.
      let a: number;
      let d: number;
      let t: number;
      if (fd < BUNNY_SHY) {
        a = Math.atan2(b.y - f.y, b.x - f.x) + (w.rng() - 0.5) * 0.8;
        d = BOUND_D;
        t = BOUND_T;
      } else {
        const back = Math.hypot(b.home[0] - b.x, b.home[1] - b.y) > BUNNY_RANGE * 0.6;
        a = back
          ? Math.atan2(b.home[1] - b.y, b.home[0] - b.x) + (w.rng() - 0.5) * 0.9
          : w.rng() * Math.PI * 2;
        d = HOP_D * (0.6 + w.rng() * 0.5);
        t = HOP_T;
      }
      this.hopTo(b, a, d, t);
    }
  }

  /** Start a hop that way, or a turn on the spot if there is no grass there. */
  private hopTo(b: Bunny, a: number, d: number, t: number): void {
    for (const turn of [0, 0.7, -0.7, 1.4, -1.4]) {
      const x = b.x + Math.cos(a + turn) * d;
      const y = b.y + Math.sin(a + turn) * d;
      if (!onPrairie(x, y) || Math.hypot(x - b.home[0], y - b.home[1]) > BUNNY_RANGE * 2.2)
        continue;
      b.from = [b.x, b.y];
      b.to = [x, y];
      b.hopT = t;
      b.hop = 0.001;
      const sx = x - y - (b.x - b.y);
      if (Math.abs(sx) > 0.5) b.face = sx > 0 ? 1 : -1;
      return;
    }
    b.wait = 0.3;
  }

  private settle(b: Bunny): void {
    b.hop = 0;
    b.from = [b.x, b.y];
    b.to = [b.x, b.y];
    b.wait = 0.5;
  }

  private updateDogs(dt: number, f: { x: number; y: number }): void {
    const ducked = new Set<number>();
    this.watchT += dt;
    for (const d of this.dogs) {
      d.t += dt;
      const fd = Math.hypot(f.x - d.x, f.y - d.y);
      if (fd < DOG_DUCK) {
        // One squeak a town, as they go down.
        if (d.hide <= 0 && d.up > 0.5) ducked.add(d.town);
        d.hide = DOG_HIDE;
      } else if (fd > DOG_CLEAR) d.hide = Math.max(0, d.hide - dt);
      const want = d.hide > 0 ? 0 : 1;
      // Down fast, up slowly, peeking.
      d.up = want === 0 ? Math.max(0, d.up - dt * 7) : Math.min(1, d.up + dt * 0.9);
      d.look = Math.sin(d.t * 0.8 + d.x) * 1.2;
    }
    // Whose turn on watch: one in each town at a time, round them every few seconds.
    for (const d of this.dogs) {
      const turn = Math.floor((this.watchT + d.town * 1.7) / 6) % 3;
      const mine = this.dogs.filter((o) => o.town === d.town).indexOf(d) === ((turn % 3) + 3) % 3;
      d.tall = Math.max(0, Math.min(1, d.tall + (mine ? dt : -dt) * 2));
    }
    if (ducked.size > 0) this.onDuck?.();
  }

  private updateBison(dt: number, w: World, f: { x: number; y: number }): void {
    const h = this.herd;
    if (h.grazeT > 0) h.grazeT -= dt;
    else {
      const dx = h.tx - h.x;
      const dy = h.ty - h.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        // Somewhere new to graze, not far, still on the grass with room for the herd.
        h.grazeT = GRAZE_FOR[0] + w.rng() * (GRAZE_FOR[1] - GRAZE_FOR[0]);
        for (let k = 0; k < 20; k++) {
          const a = w.rng() * Math.PI * 2;
          const tx = h.x + Math.cos(a) * 90;
          const ty = h.y + Math.sin(a) * 90;
          if (this.bison.every((b) => onPrairie(tx + b.dx, ty + b.dy, 6))) {
            h.tx = tx;
            h.ty = ty;
            break;
          }
        }
      } else {
        h.x += (dx / d) * Math.min(d, HERD_SPEED * dt);
        h.y += (dy / d) * Math.min(d, HERD_SPEED * dt);
      }
    }
    const mom = this.bison.find((b) => !b.calf);
    for (const b of this.bison) {
      let tx = h.x + b.dx;
      let ty = h.y + b.dy;
      let speed = BISON_WALK;
      if (b.calf && mom) {
        // The calf skips round its mother, a little ring that wanders.
        const a = w.T * 1.3;
        tx = mom.x + Math.cos(a) * 26;
        ty = mom.y + Math.sin(a) * 18;
        speed = 46;
      }
      const fd = Math.hypot(f.x - b.x, f.y - b.y);
      if (fd < BISON_SHY && fd > 0) {
        // Ambles off out of the way, then drifts back to its place.
        tx = b.x + ((b.x - f.x) / fd) * 30;
        ty = b.y + ((b.y - f.y) / fd) * 30;
      }
      const dx = tx - b.x;
      const dy = ty - b.y;
      const d = Math.hypot(dx, dy);
      const moving = d > 3;
      if (moving) {
        const s = Math.min(d, speed * dt);
        const nx = b.x + (dx / d) * s;
        const ny = b.y + (dy / d) * s;
        if (onPrairie(nx, ny)) {
          b.x = nx;
          b.y = ny;
        }
        const sx = dx - dy;
        if (Math.abs(sx) > 1) b.face = sx > 0 ? 1 : -1;
        b.step += dt * (b.calf ? 9 : 4);
      }
      const grazing = !moving && h.grazeT > 0 && !b.calf;
      b.graze = Math.max(0, Math.min(1, b.graze + (grazing ? dt : -dt) * 1.5));
    }
  }

  /** What a tap can land on: each bunny, each dog that is up, each bison, and the height its middle is at. */
  targets(): { k: PrairieKind; i: number; x: number; y: number; z: number }[] {
    return [
      ...this.bunnies.map((b, i) => ({ k: 'bunny' as const, i, x: b.x, y: b.y, z: 4 })),
      ...this.dogs
        .map((d, i) => ({ k: 'dog' as const, i, x: d.x, y: d.y, z: 5, up: d.up }))
        .filter((d) => d.up > 0.5),
      ...this.bison.map((b, i) => ({ k: 'bison' as const, i, x: b.x, y: b.y, z: b.calf ? 5 : 9 })),
    ];
  }

  /** A tap on one: a bunny hops on the spot, a dog ducks down a moment; a bison just snorts. */
  poke(k: PrairieKind, i: number): void {
    if (k === 'bunny') {
      const b = this.bunnies[i];
      const p = this.play;
      if (b && b.hop === 0 && !(p && (i === p.i || i === p.i + 1)))
        this.hopTo(b, Math.PI * 0.25, 1, 0.45);
    } else if (k === 'dog') {
      const d = this.dogs[i];
      if (d) d.hide = 1.2;
    }
  }

  /** The game draws them (render/prairie10.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}
