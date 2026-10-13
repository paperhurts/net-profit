/**
 * The flotilla, the kid's (2026-10-13). With the whole army along the deck was a pile, and four of them have nothing
 * to do at sea (the cat feeds on the cabin roof, the otter's climbing aboard is a warning, Neil flops on deck and goes
 * ice fishing, the warlock sails his own boat, the naga and the baby Reaper swim): the Cthulhu warrior, the Forgotten
 * One's bones, the necromancer and the tarling. "Those four get their own boats," the kid said, and named them: an
 * airboat with a great fan, a little catamaran, a windsurfer, and a banana boat.
 *
 * Each crewed craft keeps a station round the boat, ahead of it and out to either side, never behind it where the
 * net is: the first two out ahead off either bow, the next two abeam further out, clear of the otter and the baby
 * off the bows and the naga and Neil alongside. Under way they keep up at any speed; tied up, with the figure
 * ashore, or with their station up on the land by a shore, they drift and hold where they are. Ashore the rider steps off and walks with the army, and the craft
 * waits; back aboard, each is on its craft again. Who rides which is the kid's to choose (crew), one rider to a craft;
 * the game says who is free and whether each is on the water, and draws them.
 */

import { angDiff, clamp } from '../core/math';
import type { Blipper, DrawView, Entity, Layer, World } from './entity';
import { steerShip } from './ship';

export type CraftKind = 'airboat' | 'catamaran' | 'windsurf' | 'banana';
export type Rider = 'warrior' | 'bones' | 'necro' | 'tarling';

/** The craft, in the order they take stations, and those who may ride them. */
export const CRAFTS: readonly CraftKind[] = ['airboat', 'catamaran', 'windsurf', 'banana'];
export const RIDERS: readonly Rider[] = ['warrior', 'bones', 'necro', 'tarling'];
/** Who rides which until the kid says otherwise. */
export const DEFAULT_CREW: Readonly<Record<CraftKind, Rider>> = {
  airboat: 'warrior',
  catamaran: 'necro',
  windsurf: 'bones',
  banana: 'tarling',
};

/** The stations, in the hull's units: this far ahead of the boat's middle, this far out to its side (right +). */
export const STATIONS: readonly { along: number; across: number }[] = [
  { along: 75, across: 52 },
  { along: 75, across: -52 },
  { along: 12, across: 88 },
  { along: 12, across: -88 },
];
/** They turn this fast and never go faster than this; further than CATCH_UP from station, they are there at once. */
export const TURN = 2.6;
export const TOP_SPEED = 430;
export const CATCH_UP = 1200;

export class Craft {
  x = 0;
  y = 0;
  h = 0;
  v = 0;
  /** On the water, sailing with the boat. */
  placed = false;
  constructor(readonly kind: CraftKind) {}
}

export class Flotilla implements Entity {
  readonly crafts: readonly Craft[] = CRAFTS.map((k) => new Craft(k));
  /** Who rides which: one rider to a craft, or nobody. */
  crew: Record<CraftKind, Rider | null> = { ...DEFAULT_CREW };
  /** Whether a rider is yours yet; the game knows. */
  free: (r: Rider) => boolean = () => false;
  /** Whether a rider is on its craft now, rather than ashore with the figure; the game knows. */
  riding: (r: Rider) => boolean = () => true;
  /** Whether a point is land (an island, a pier): a station there is not sailed to; the game knows. */
  onLand: (x: number, y: number) => boolean = () => false;

  /** The craft a rider sails, if it has one. */
  craftOf(r: Rider): Craft | null {
    for (const c of this.crafts) if (this.crew[c.kind] === r) return c;
    return null;
  }

  /** Put a rider on a craft: whoever was on it is left without one, and the rider leaves any other. */
  assign(kind: CraftKind, r: Rider | null): void {
    if (r) for (const k of CRAFTS) if (this.crew[k] === r) this.crew[k] = null;
    this.crew[kind] = r;
  }

  /** The craft out on the water: crewed by a rider who is yours. */
  active(): Craft[] {
    return this.crafts.filter((c) => {
      const r = this.crew[c.kind];
      return !!r && this.free(r);
    });
  }

  /** A station off a boat at this heading and hull scale. */
  static station(
    i: number,
    b: { x: number; y: number; h: number },
    k: number,
  ): { x: number; y: number } {
    const s = STATIONS[i] ?? STATIONS[STATIONS.length - 1] ?? { along: 0, across: 0 };
    const c = Math.cos(b.h);
    const n = Math.sin(b.h);
    return {
      x: b.x + c * s.along * k - n * s.across * k,
      y: b.y + n * s.along * k + c * s.across * k,
    };
  }

  update(dt: number, w: World): void {
    const on = this.active();
    for (const c of this.crafts) if (!on.includes(c)) c.placed = false;
    const b = w.boat;
    const k = w.hullScale;
    on.forEach((c, i) => {
      const st = Flotilla.station(i, b, k);
      const d = Math.hypot(st.x - c.x, st.y - c.y);
      if (!c.placed || d > CATCH_UP) {
        c.x = st.x;
        c.y = st.y;
        c.h = b.h;
        c.v = 0;
        c.placed = true;
        return;
      }
      // Tied up, ashore, or with their station up on the land by a shore, they drift and hold where they are;
      // under way, they keep station.
      const hold = w.docked || !!w.figure || this.onLand(st.x, st.y);
      if (d < 8 || hold) {
        c.v *= Math.max(0, 1 - dt * 2);
        c.h += clamp(angDiff(b.h, c.h), -dt, dt);
        c.x += Math.cos(c.h) * c.v * dt;
        c.y += Math.sin(c.h) * c.v * dt;
      } else
        steerShip(
          c,
          st.x,
          st.y,
          Math.min(TOP_SPEED, Math.max(Math.abs(b.v) * 1.15, d * 1.8)),
          TURN,
          dt,
        );
    });
  }

  /** The game sorts each craft among its solids itself (drawCraft); nothing here. */
  draw(_v: DrawView, _layer: Layer): void {}

  /** On the radar, each craft on the water. */
  radar(blip: Blipper): void {
    for (const c of this.crafts) if (c.placed) blip(c.x, c.y, 'other');
  }
}
