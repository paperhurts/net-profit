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
 * ashore, or with their station up on the land by a shore, they drift and hold where they are. Ashore the rider steps
 * off and walks with the army, and the craft waits; back aboard, each is on its craft again. Who rides which is the
 * kid's to choose (crew, in the shop's Boats card), one rider to a craft; the game says who is free and whether each
 * is on the water, and draws them.
 *
 * And, the kid's: the airboat tows the banana boat. With both out, the banana takes no station of its own but rides a
 * rope's length behind the airboat's stern, swinging in behind it like a trailer; with the airboat ashore or unmanned,
 * the banana runs on its own little outboard.
 *
 * The fifth, the kid's too (2026-10-16): a swan paddle boat for two, "two friends pedal it together", Caterman's, who
 * comes with you after island 11's heron. It takes the next station free, as the others do; the seat beside him is
 * the kid's to fill or leave empty, and it is out on the water with either seat taken.
 */

import { angDiff, clamp } from '../core/math';
import {
  CRAFTS,
  type CraftKind,
  type Crew,
  craftOfSeat,
  DEFAULT_CREW,
  type Rider,
  SEATS,
  type Seat,
  seatsOf,
} from '../data/crew';
import type { Blipper, DrawView, Entity, Layer, World } from './entity';
import { steerShip } from './ship';

export {
  CRAFTS,
  type CraftKind,
  type Crew,
  DEFAULT_CREW,
  RIDERS,
  type Rider,
  SEATS,
  type Seat,
  seatsOf,
} from '../data/crew';

/** How big the craft are drawn and reckoned, against the hull's units. */
export const CRAFT_SCALE = 1.15;
/**
 * The tow: the airboat's stern this far behind its middle, the rope this long, and the banana this long from its
 * middle to its nose, in the craft's own units (the banana is as long as the warlock's boat, and no fatter).
 */
export const AIR_STERN = 15;
export const ROPE = 22;
export const BANANA_HALF = 23;

/**
 * The stations, in the hull's units: this far ahead of the boat's middle, this far out to its side (right +). Four
 * are enough for five craft: with all five out the airboat tows the banana, which takes none.
 */
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
  /** Towed: the airboat's stern, the other end of the rope; null when it runs on its own. */
  tow: { x: number; y: number } | null = null;
  constructor(readonly kind: CraftKind) {}
}

export class Flotilla implements Entity {
  readonly crafts: readonly Craft[] = CRAFTS.map((k) => new Craft(k));
  /** Who rides which: one rider to a seat, or nobody. */
  crew: Crew = { ...DEFAULT_CREW };
  /** Whether a rider is yours yet; the game knows. */
  free: (r: Rider) => boolean = () => false;
  /** Whether a rider is on its craft now, rather than ashore with the figure; the game knows. */
  riding: (r: Rider) => boolean = () => true;
  /** Whether a point is land (an island, a pier): a station there is not sailed to; the game knows. */
  onLand: (x: number, y: number) => boolean = () => false;

  /** The craft a rider sails, if it has one. */
  craftOf(r: Rider): Craft | null {
    for (const s of SEATS)
      if (this.crew[s] === r) return this.crafts.find((c) => c.kind === craftOfSeat(s)) ?? null;
    return null;
  }

  /** Who is on a craft's seats and yours, seat by seat (null for an empty one): the swan has two. */
  ridersOf(kind: CraftKind): (Rider | null)[] {
    return seatsOf(kind).map((s) => {
      const r = this.crew[s];
      return r && this.free(r) ? r : null;
    });
  }

  /**
   * Put a rider on a seat, or nobody (the rider goes back to the deck). One the rider leaves gets whoever was on this
   * seat, so the two swap and nobody is left out.
   */
  assign(seat: Seat, r: Rider | null): void {
    const was = this.crew[seat];
    if (r) for (const k of SEATS) if (k !== seat && this.crew[k] === r) this.crew[k] = was;
    this.crew[seat] = r;
  }

  /** The craft out on the water: with a rider who is yours on a seat. */
  active(): Craft[] {
    return this.crafts.filter((c) => this.ridersOf(c.kind).some((r) => r));
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

  /** The airboat is out and so is the banana: it tows it. */
  towing(): boolean {
    const on = this.active().map((c) => c.kind);
    return on.includes('airboat') && on.includes('banana');
  }

  update(dt: number, w: World): void {
    const on = this.active();
    for (const c of this.crafts) {
      if (!on.includes(c)) c.placed = false;
      c.tow = null;
    }
    const b = w.boat;
    const k = w.hullScale;
    const towing = this.towing();
    const free = towing ? on.filter((c) => c.kind !== 'banana') : on;
    free.forEach((c, i) => {
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
    if (towing) this.towBanana(dt);
  }

  /** The banana on its rope behind the airboat, swinging in behind it like a trailer. */
  private towBanana(dt: number): void {
    const air = this.crafts.find((c) => c.kind === 'airboat') as Craft;
    const ban = this.crafts.find((c) => c.kind === 'banana') as Craft;
    const s = CRAFT_SCALE;
    const sx = air.x - Math.cos(air.h) * AIR_STERN * s;
    const sy = air.y - Math.sin(air.h) * AIR_STERN * s;
    const reach = (ROPE + BANANA_HALF) * s;
    if (!ban.placed || Math.hypot(sx - ban.x, sy - ban.y) > CATCH_UP) {
      ban.x = sx - Math.cos(air.h) * reach;
      ban.y = sy - Math.sin(air.h) * reach;
      ban.h = air.h;
      ban.v = 0;
      ban.placed = true;
    } else {
      const dx = sx - ban.x;
      const dy = sy - ban.y;
      const d = Math.hypot(dx, dy) || 1;
      const x0 = ban.x;
      const y0 = ban.y;
      // Taut, it is pulled along the rope; slack, it coasts. It always points along the rope.
      if (d > reach) {
        ban.x = sx - (dx / d) * reach;
        ban.y = sy - (dy / d) * reach;
      }
      ban.h = Math.atan2(dy, dx);
      ban.v = dt > 0 ? Math.hypot(ban.x - x0, ban.y - y0) / dt : 0;
    }
    ban.tow = { x: sx, y: sy };
  }

  /** The game sorts each craft among its solids itself (drawCraft); nothing here. */
  draw(_v: DrawView, _layer: Layer): void {}

  /** On the radar, each craft on the water. */
  radar(blip: Blipper): void {
    for (const c of this.crafts) if (c.placed) blip(c.x, c.y, 'other');
  }
}
