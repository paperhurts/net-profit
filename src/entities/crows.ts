/**
 * Island 10's crows at the birdfeeder, the kid's: "a birdfeeder, and crows come; each one asks you a science problem,
 * at a third grader's level, and solved, you can pet it, and it's yours", and for the far far sea after island 10,
 * "let one go and it flies toward land". The feeder hangs on its pole past the old man's porch (world/isle10.ts
 * FEEDER10), empty until the giant pelican's little loaf of bread is crumbled into it. Then three crows come flying
 * in from over the forest and settle round it: one up on the feeder's tray, the others hopping about on the grass
 * under it, pecking at what falls. Each visit after, the ones not yet the figure's are already there.
 *
 * Tap one from close by and it turns to the figure, cocks its head and asks one of its questions (data/science.ts);
 * the game shows the question and keeps the answers. Answered right, the figure can pet it: hearts, and it is the
 * figure's, and it flies off to the boat, where it rides on the rail (render/crows.ts) until island 11 needs it.
 * Answered wrong, it says the right answer and a fact, and asks another; nothing is lost.
 */

import { FEEDER10 } from '../world/isle10';
import type { DrawView, Entity, Layer, World } from './entity';

/** The crows there are to win. */
export const CROWS = 3;
/** Tap a crow from this near and it asks; tap the feeder from this near to fill it. */
export const CROW_REACH = 90;
export const FEEDER_REACH = 70;
/** It flies at this, in from this far away out over the forest and this high. */
export const CROW_FLY = 110;
export const FLY_FROM = 520;
export const FLY_HIGH = 150;
/** Seconds between one crow setting off and the next, flying in. */
export const ARRIVE_GAP = 0.7;
/** The tray's height on its pole. */
export const TRAY_Z = 24;
/** Seconds of a hop, and how high it goes; seconds it sits after, give or take. */
export const HOP_T = 0.45;
export const HOP_HIGH = 9;
export const HOP_EVERY = 3.5;
/** Now and then one caws, heard by the figure this near the feeder. */
export const CAW_HEARD = 400;
/** Seconds of hearts while it is petted, before it flies off to the boat. */
export const PETTED_T = 1.4;

export type CrowState = 'wait' | 'fly' | 'peck' | 'hop' | 'ask' | 'petted' | 'leave' | 'gone';

export type Spot = { readonly x: number; readonly y: number; readonly z: number };

/** Where the crows settle: the front of the tray, and the grass round the pole. */
export const CROW_SPOTS: readonly Spot[] = [
  { x: FEEDER10.x + 6, y: FEEDER10.y + 6, z: TRAY_Z },
  ...[0.4, 1.5, 2.5, 3.6, 4.8].map((a, i) => ({
    x: FEEDER10.x + Math.cos(a) * (19 + (i % 2) * 8),
    y: FEEDER10.y + Math.sin(a) * (19 + (i % 2) * 8),
    z: 0,
  })),
];

export type Crow = {
  x: number;
  y: number;
  z: number;
  /** Which way it faces on the screen, -1 or 1. */
  face: number;
  state: CrowState;
  t: number;
  /** The spot it is at, or going to; where a hop or a flight set off from. */
  spot: number;
  fromX: number;
  fromY: number;
  fromZ: number;
  /** Seconds before it next hops (or, waiting, sets off). */
  next: number;
  /** Its wings' beat, and a peck's bob. */
  flap: number;
  peck: number;
  /** Its question has been answered right: it can be petted. */
  solved: boolean;
};

export class Crows implements Entity {
  readonly list: Crow[] = [];
  /** A crow cawed; one arrived at the feeder. */
  onCaw: (() => void) | null = null;
  private cawIn = 4;

  constructor(private readonly r: () => number = Math.random) {}

  /**
   * The crows not yet the figure's, this many of them: at the feeder already, or (`arrive`) flying in to it from out
   * over the forest, one after another.
   */
  come(n: number, arrive: boolean): void {
    this.list.length = 0;
    const from = { x: FEEDER10.x + 60, y: FEEDER10.y - FLY_FROM };
    for (let i = 0; i < n; i++) {
      const s = CROW_SPOTS[i] as Spot;
      const c: Crow = {
        x: s.x,
        y: s.y,
        z: s.z,
        face: i % 2 ? 1 : -1,
        state: 'peck',
        t: 0,
        spot: i,
        fromX: s.x,
        fromY: s.y,
        fromZ: s.z,
        next: 1 + this.r() * HOP_EVERY,
        flap: this.r() * 6,
        peck: this.r() * 6,
        solved: false,
      };
      if (arrive) {
        c.state = 'wait';
        c.next = i * ARRIVE_GAP;
        c.x = from.x + (i - 1) * 40;
        c.y = from.y + (i - 1) * 25;
        c.z = FLY_HIGH;
      }
      this.list.push(c);
    }
  }

  /** None about, for an island without them. */
  clear(): void {
    this.list.length = 0;
  }

  /** Crows still to be won, at the feeder or on the way to it. */
  get wild(): Crow[] {
    return this.list.filter(
      (c) => c.state !== 'petted' && c.state !== 'leave' && c.state !== 'gone',
    );
  }

  /** Crows that are the figure's but still on their way to the boat: not on its rail yet. */
  get flying(): number {
    return this.list.filter((c) => c.state === 'petted' || c.state === 'leave').length;
  }

  /** The crow that can be asked nearest (x, y) within range: settled at the feeder, not flying in. */
  nearest(x: number, y: number, range: number): number {
    let best = -1;
    let bd = range;
    this.list.forEach((c, i) => {
      if (c.state !== 'peck' && c.state !== 'hop' && c.state !== 'ask') return;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d <= bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }

  /** It turns to the figure with its head cocked, asking, until calmed. */
  ask(i: number): boolean {
    const c = this.list[i];
    if (!c || (c.state !== 'peck' && c.state !== 'hop' && c.state !== 'ask')) return false;
    this.land(c);
    c.state = 'ask';
    c.t = 0;
    this.onCaw?.();
    return true;
  }

  /** Back to pecking, any that were asking. */
  calm(): void {
    for (const c of this.list) {
      if (c.state !== 'ask') continue;
      c.state = 'peck';
      c.t = 0;
      c.next = 1 + this.r() * HOP_EVERY;
    }
  }

  /** Petted: hearts, then off it flies to the boat. Whether there was a crow to pet. */
  pet(i: number): boolean {
    const c = this.list[i];
    if (!c || (c.state !== 'peck' && c.state !== 'hop' && c.state !== 'ask')) return false;
    this.land(c);
    c.state = 'petted';
    c.t = 0;
    return true;
  }

  update(dt: number, w: World): void {
    if (!this.list.length) return;
    const f = w.figure;
    this.cawIn -= dt;
    if (this.cawIn <= 0) {
      this.cawIn = 4 + this.r() * 6;
      const near = !!f && Math.hypot(f.x - FEEDER10.x, f.y - FEEDER10.y) < CAW_HEARD;
      if (near && this.wild.some((c) => c.state === 'peck')) this.onCaw?.();
    }
    for (const c of this.list) {
      c.t += dt;
      c.flap += dt * (c.state === 'fly' || c.state === 'leave' ? 14 : 2);
      c.peck += dt * 5;
      switch (c.state) {
        case 'wait':
          c.next -= dt;
          if (c.next <= 0) this.go(c, 'fly');
          break;
        case 'fly': {
          const s = CROW_SPOTS[c.spot] as Spot;
          if (this.flyTo(c, s.x, s.y, s.z, dt)) {
            this.land(c);
            c.state = 'peck';
            c.next = 1 + this.r() * HOP_EVERY;
            this.onCaw?.();
          }
          break;
        }
        case 'peck':
          c.next -= dt;
          if (c.next <= 0) {
            const free = CROW_SPOTS.map((_, k) => k).filter(
              (k) =>
                k !== c.spot &&
                !this.list.some(
                  (o) => o !== c && o.spot === k && o.state !== 'gone' && o.state !== 'leave',
                ),
            );
            const k = free[Math.floor(this.r() * free.length)];
            if (k === undefined) c.next = HOP_EVERY;
            else {
              c.spot = k;
              this.go(c, 'hop');
            }
          }
          break;
        case 'hop': {
          const s = CROW_SPOTS[c.spot] as Spot;
          const k = Math.min(1, c.t / HOP_T);
          this.turn(c, s.x - c.x, s.y - c.y);
          c.x = c.fromX + (s.x - c.fromX) * k;
          c.y = c.fromY + (s.y - c.fromY) * k;
          c.z = c.fromZ + (s.z - c.fromZ) * k + Math.sin(k * Math.PI) * HOP_HIGH;
          if (k >= 1) {
            this.land(c);
            c.state = 'peck';
            c.t = 0;
            c.next = HOP_EVERY * (0.6 + this.r() * 0.8);
          }
          break;
        }
        case 'ask':
          if (f) this.turn(c, f.x - c.x, f.y - c.y);
          break;
        case 'petted':
          if (c.t >= PETTED_T) this.go(c, 'leave');
          break;
        case 'leave': {
          // Up and over to the boat, landing on its rail.
          const b = w.boat;
          const d = Math.hypot(b.x - c.x, b.y - c.y);
          const up = Math.min(60, d * 0.4);
          if (this.flyTo(c, b.x, b.y, 12 + up, dt) || d < 10) c.state = 'gone';
          break;
        }
      }
    }
  }

  private go(c: Crow, s: CrowState): void {
    c.state = s;
    c.t = 0;
    c.fromX = c.x;
    c.fromY = c.y;
    c.fromZ = c.z;
  }

  /** Settled right on its spot. */
  private land(c: Crow): void {
    if (c.state !== 'hop') return;
    const s = CROW_SPOTS[c.spot] as Spot;
    c.x = s.x;
    c.y = s.y;
    c.z = s.z;
  }

  /** A wingbeat's flying toward (x, y, z); whether it is there. */
  private flyTo(c: Crow, x: number, y: number, z: number, dt: number): boolean {
    const dx = x - c.x;
    const dy = y - c.y;
    const dz = z - c.z;
    const d = Math.hypot(dx, dy, dz);
    const step = CROW_FLY * dt;
    this.turn(c, dx, dy);
    if (d <= step) {
      c.x = x;
      c.y = y;
      c.z = z;
      return true;
    }
    c.x += (dx / d) * step;
    c.y += (dy / d) * step;
    c.z += (dz / d) * step;
    return false;
  }

  /** It faces along (dx, dy) on the screen, unless that is nearly straight up or down it. */
  private turn(c: Crow, dx: number, dy: number): void {
    if (Math.abs(dx - dy) > 2) c.face = Math.sign(dx - dy);
  }

  /** The game draws them at the feeder (render/crows.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}

/**
 * The crow let go in the far far sea, the owner's call for the kid's "the crows are needed for island 11": out there
 * no land is in sight any way you look, and, as sailors once did with ravens, a crow let go from the boat flies for
 * land. It sets off from the rail, climbs, and flies straight for island 11; there it comes down on the sand where
 * the pier will be and waits, pecking about, until the boat comes close, then flies back out to its place on the rail.
 */
export type GuideState = 'aboard' | 'out' | 'perch' | 'back';
/** It flies for land at this, faster than round the feeder: a long way to go. */
export const GUIDE_FLY = 230;
/** How high it flies out there, and how near land it starts coming down. */
export const GUIDE_HIGH = 80;
export const GUIDE_DOWN = 320;
/** The boat this near its perch calls it back. */
export const GUIDE_CALL = 300;

export class GuideCrow implements Entity {
  state: GuideState = 'aboard';
  x = 0;
  y = 0;
  z = 0;
  face = 1;
  flap = 0;
  peck = 0;
  t = 0;
  /** It reached land; it came back to the boat. */
  onArrive: (() => void) | null = null;
  onBack: (() => void) | null = null;

  constructor(private readonly perch: { readonly x: number; readonly y: number }) {}

  /** Off it goes from this seat on the rail. Whether it went (it can only go from the rail). */
  letGo(from: { x: number; y: number; z: number }): boolean {
    if (this.state !== 'aboard') return false;
    this.state = 'out';
    this.t = 0;
    this.x = from.x;
    this.y = from.y;
    this.z = from.z;
    return true;
  }

  /** Not out: back on the rail, as after a reload. */
  reset(): void {
    this.state = 'aboard';
    this.t = 0;
  }

  /** Away from the boat: flying out, waiting on land, or flying back. */
  get away(): boolean {
    return this.state !== 'aboard';
  }

  update(dt: number, w: World): void {
    if (this.state === 'aboard') return;
    this.t += dt;
    this.flap += dt * (this.state === 'perch' ? 2 : 14);
    this.peck += dt * 5;
    const b = w.boat;
    switch (this.state) {
      case 'out': {
        const d = Math.hypot(this.perch.x - this.x, this.perch.y - this.y);
        // Up off the rail to its height, and down again over the last of the way.
        const z = d < GUIDE_DOWN ? (GUIDE_HIGH * d) / GUIDE_DOWN : GUIDE_HIGH;
        if (this.fly(this.perch.x, this.perch.y, z, dt, d < GUIDE_DOWN ? 4 : 1.2)) {
          this.z = 0;
          this.state = 'perch';
          this.t = 0;
          this.onArrive?.();
        }
        break;
      }
      case 'perch':
        if (Math.hypot(b.x - this.perch.x, b.y - this.perch.y) < GUIDE_CALL) {
          this.state = 'back';
          this.t = 0;
        }
        break;
      case 'back': {
        const d = Math.hypot(b.x - this.x, b.y - this.y);
        if (this.fly(b.x, b.y, 12 + Math.min(60, d * 0.4), dt) || d < 10) {
          this.state = 'aboard';
          this.t = 0;
          this.onBack?.();
        }
        break;
      }
    }
  }

  /** A wingbeat's flying toward (x, y), rising or falling toward z at this rate; whether it is there. */
  private fly(x: number, y: number, z: number, dt: number, rise = 3): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    const step = GUIDE_FLY * dt;
    if (Math.abs(dx - dy) > 2) this.face = Math.sign(dx - dy);
    this.z += (z - this.z) * Math.min(1, dt * rise);
    if (d <= step) {
      this.x = x;
      this.y = y;
      this.z = z;
      return true;
    }
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    return false;
  }

  /** The game draws it (render/crows.ts drawGuide). */
  draw(_v: DrawView, _layer: Layer): void {}
}
