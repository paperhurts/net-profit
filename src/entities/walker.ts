/**
 * Off the boat, the kid's ask. Tie up at the pier and step ashore, and a
 * little figure in a yellow sou'wester walks the home island with the same
 * stick that steers the boat: the sand and the grass, the planks of the pier,
 * the Ten Cent Bridge and the beach at its end. The boat waits bow in at the
 * end of the pier; walk back to it and go aboard. There is nothing to do
 * ashore yet, on purpose: walking has to feel right on a phone first, and then
 * the island fills up.
 *
 * Stepping ashore, the boat comes round to its berth over a second or so and
 * the figure hops onto the planks. The island, the pier, the bridge deck and
 * the beach are the dry land; the hut, the palace tree, the palms, the
 * watchtower, the stall, the smokehouse, the crates and the umbrella stand in
 * the way, and the figure slides along whatever it walks into. It leaves
 * footprints in the sand that fade.
 *
 * Sorting it among the solids is most of the work. Every solid on the island is
 * drawn at one depth, and a figure that walks right round them needs to know,
 * for each one near it, whether it stands in front or behind: in front when it
 * is past a face that looks at the viewer, behind when it is past one that
 * looks away. The pier sorts round the boat and the bridge in parts, so those
 * are handled the same way with their own depths.
 */

import { dirToWorld } from '../core/iso';
import { angDiff, clamp } from '../core/math';
import {
  BEACH,
  BRIDGE,
  BRIDGE_PARTS,
  BRIDGE_SOUTH,
  bridgePartDepth,
  IR,
  IX,
  IY,
  PX0,
  SMOKEHOUSE,
  STALL,
  TOLL_SIGN,
  TWX,
  TWY,
  TX,
  TY,
  UMBRELLA,
} from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

/** Walking speed in world units a second, and how quickly a step answers the stick. */
export const WALK_SPEED = 85;
export const WALK_EASE = 12;
/** How much closer the camera comes while ashore: a figure this size wants it. */
export const WALK_ZOOM = 0.6;
/** The boat comes round to its berth in at most this many seconds, easing there and turning this fast. */
export const MOOR_TIME = 1.6;
export const MOOR_EASE = 2.6;
export const MOOR_TURN = 3;
/** Seconds for a hop between the bow and the planks. */
export const HOP = 0.4;
/**
 * Where the figure lands on the pier: past the crates on the open strip in front of them, so the
 * way up the pier is straight ahead. And how near it must be to go back aboard.
 */
export const LANDING = { x: PX0 + 147, y: IY + 12 } as const;
export const BOARD_REACH = 30;
/** Seconds a footprint lasts in the sand, and how far apart they fall. */
export const PRINT_LIFE = 7;
export const STRIDE = 9;
const MAX_PRINTS = 80;

/** The boat's berth for a hull of this scale: bow in at the end of the pier, a hand's width off the planks. */
export function berth(k: number): { x: number; y: number; h: number } {
  return { x: PX0 + 161 + 34 * k, y: IY, h: Math.PI };
}

/**
 * Dry land stops this far in from the waterline, on the island and on the beach. On the far side of
 * the island the sand is squashed to half its depth on screen, and a figure nearer the edge than its
 * own shadow stands over the water behind it and looks as if it is wading.
 */
const SHORE = IR - 12;
const BEACH_IN = BEACH.r - 10;
/** The pier as drawn, and the planks that can be walked: all but the strip behind the crates, closed so nothing hides there. */
const PIER_BOX = { x0: PX0, x1: PX0 + 155, y0: IY - 17, y1: IY + 17 } as const;
export const PIER_WALK = { x0: PX0, x1: PX0 + 152, y0: IY - 12, y1: IY + 16 } as const;
const PIER_TOP = 7;
/** The bridge: its length, its deck's half width, the walkable half width inside the rails, and the deck's height. */
const SPAN = Math.hypot(BRIDGE.bx - BRIDGE.ax, BRIDGE.by - BRIDGE.ay);
const UX = (BRIDGE.bx - BRIDGE.ax) / SPAN;
const UY = (BRIDGE.by - BRIDGE.ay) / SPAN;
const HALF = BRIDGE.w / 2;
const DECK_HALF = HALF - 3;
const DECK_TOP = BRIDGE.z + 4;
/** The figure steps up onto a deck over this far, so it does not pop. */
const RAMP = 14;
/** The way onto the bridge starts this far back on the sand, where the shore's margin would cut it off. */
const APPROACH = 14;

/** Along the bridge from its island end, and across it toward its south side, which faces the viewer. */
export function bridgeFrame(x: number, y: number): [number, number] {
  const dx = x - BRIDGE.ax;
  const dy = y - BRIDGE.ay;
  return [dx * UX + dy * UY, dx * BRIDGE_SOUTH[0] + dy * BRIDGE_SOUTH[1]];
}

function inBox(
  x: number,
  y: number,
  b: { x0: number; y0: number; x1: number; y1: number },
): boolean {
  return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
}

/** Dry land, ignoring what stands on it: the island, the pier, the bridge deck between the rails, the beach. */
export function onLand(x: number, y: number): boolean {
  if (Math.hypot(x - IX, y - IY) <= SHORE) return true;
  if (inBox(x, y, PIER_WALK)) return true;
  const [t, o] = bridgeFrame(x, y);
  if (t >= -APPROACH && t <= SPAN && Math.abs(o) <= DECK_HALF) return true;
  return Math.hypot(x - BEACH.x, y - BEACH.y) <= BEACH_IN;
}

/** The height of what is underfoot: the pier's planks, the bridge's deck, or the sand. */
export function groundZ(x: number, y: number): number {
  if (inBox(x, y, PIER_BOX)) return PIER_TOP * clamp((x - PX0) / 6, 0, 1);
  const [t, o] = bridgeFrame(x, y);
  if (t >= 0 && t <= SPAN && Math.abs(o) <= HALF)
    return DECK_TOP * clamp(Math.min(t, SPAN - t) / RAMP, 0, 1);
  return 0;
}

/**
 * Something that stands on the island: its footprint, the depth the game draws
 * it at, the palace stage that builds it, how far round it the figure is kept,
 * and whether the figure sorts against it (what stands on the pier sorts with
 * the pier).
 */
export type Prop = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  d: number;
  from: number;
  pad: number;
  sort: boolean;
};
const prop = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  d: number,
  from = 0,
  pad = 3,
  sort = true,
): Prop => ({ x0, y0, x1, y1, d, from, pad, sort });
const post = (p: readonly [number, number], r: number, d: number): Prop =>
  prop(p[0] - r, p[1] - r, p[0] + r, p[1] + r, d, 0, 1.5);

/** What stands on the island, at the depths main.js draws it. */
export const PROPS: readonly Prop[] = [
  // The hut on the north shore.
  prop(IX + 20, IY - 120, IX + 80, IY - 70, IX + 80 + (IY - 70)),
  // The palace tree's trunk, and the ladder up to the platform once there is one.
  prop(TX - 10, TY - 10, TX + 10, TY + 10, TX + TY + 30),
  prop(TX + 26, TY + 4, TX + 31, TY + 15, TX + TY + 30, 1, 1.5, false),
  // Three palms.
  ...(
    [
      [IX + 118, IY - 30],
      [IX - 150, IY - 70],
      [IX + 50, IY + 125],
    ] as const
  ).map((p) => post(p, 4, p[0] + p[1])),
  // The watchtower and the fishmonger's stall, with its awnings; then the smokehouse.
  prop(TWX, TWY, TWX + 18, TWY + 18, TWX + TWY + 18, 4),
  prop(STALL.x - 18, STALL.y - 14, STALL.x + 18, STALL.y + 14, STALL.x + STALL.y, 4),
  prop(
    SMOKEHOUSE.x - 16,
    SMOKEHOUSE.y - 12,
    SMOKEHOUSE.x + 16,
    SMOKEHOUSE.y + 12,
    SMOKEHOUSE.x + SMOKEHOUSE.y,
    5,
  ),
  // The crates on the pier, a little inside their fronts so the way past along the front edge is wide enough.
  prop(PX0 + 117, IY - 13, PX0 + 141, IY + 8, 0, 0, 0, false),
  prop(PX0 + 93, IY - 14, PX0 + 111, IY + 2, 0, 0, 0, false),
  // The umbrella's pole, sorted with the beach things; the toll sign's post, with the bridge's last part.
  post(UMBRELLA, 3, BEACH.x + BEACH.y),
  post(TOLL_SIGN, 2.5, bridgePartDepth(BRIDGE_PARTS - 1)),
];

/** Whether something built at this palace stage stands in the way of a point. */
export function blocked(x: number, y: number, build: number): boolean {
  for (const p of PROPS) {
    if (build < p.from) continue;
    if (x > p.x0 - p.pad && x < p.x1 + p.pad && y > p.y0 - p.pad && y < p.y1 + p.pad) return true;
  }
  return false;
}

export function walkable(x: number, y: number, build: number): boolean {
  return onLand(x, y) && !blocked(x, y, build);
}

/**
 * Straight on, then turned a little either way and shortened to match, then along x or y alone, then
 * turned further: how a step slides along what it meets. The square walls want the straight slides.
 */
const SLIDES = [0, 0.4, -0.4, 0.8, -0.8, 'x', 'y', 1.2, -1.2] as const;

/** Take one step of (dx, dy), sliding along whatever is in the way. Returns how far it went. */
export function walkStep(
  p: { x: number; y: number },
  dx: number,
  dy: number,
  build: number,
): number {
  if (dx === 0 && dy === 0) return 0;
  for (const a of SLIDES) {
    let mx = a === 'y' ? 0 : dx;
    let my = a === 'x' ? 0 : dy;
    if (typeof a === 'number') {
      const c = Math.cos(a);
      const s = Math.sin(a);
      mx = (dx * c - dy * s) * c;
      my = (dx * s + dy * c) * c;
    }
    if ((mx !== 0 || my !== 0) && walkable(p.x + mx, p.y + my, build)) {
      p.x += mx;
      p.y += my;
      return Math.hypot(mx, my);
    }
  }
  return 0;
}

/** Something else that stands on the pier and is sorted there: the dog. */
export type Rider = { x: number; y: number; d: number };
/** Only solids this near can overlap the figure on screen. */
const SORT_REACH = 110;

/**
 * The depth to sort the figure at among the solids, standing at (x, y) with the
 * palace at this stage, the pier sorted at pierD and the dog, if there is one,
 * on the planks. Riding means in the air between the bow and the pier.
 */
export function walkerDepth(
  x: number,
  y: number,
  build: number,
  pierD: number,
  dog: Rider | null,
  riding = false,
): number {
  // On the planks, or hopping to or from them: over the pier and the boat, and before or after the dog.
  if (riding || inBox(x, y, PIER_BOX))
    return dog ? dog.d + (x + y > dog.x + dog.y ? 0.25 : -0.25) : pierD + 2.5;
  const [t, o] = bridgeFrame(x, y);
  const seg = SPAN / BRIDGE_PARTS;
  const deck = t >= 0 && t <= SPAN && Math.abs(o) <= HALF;
  const base = deck
    ? bridgePartDepth(Math.min(BRIDGE_PARTS - 1, Math.floor(t / seg))) + 0.25
    : x + y;
  let lo = -Infinity;
  let hi = Infinity;
  const order = (front: boolean, behind: boolean, d: number) => {
    if (front && !behind) lo = Math.max(lo, d);
    else if (behind && !front) hi = Math.min(hi, d);
  };
  // A box on the ground: its +x and +y faces look at the viewer.
  const box = (x0: number, y0: number, x1: number, y1: number, d: number) => {
    if (Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)) >= SORT_REACH) return;
    order(x > x1 || y > y1, x < x0 || y < y0, d);
  };
  for (const p of PROPS) if (p.sort && build >= p.from) box(p.x0, p.y0, p.x1, p.y1, p.d);
  box(PIER_BOX.x0, PIER_BOX.y0, PIER_BOX.x1, PIER_BOX.y1, pierD);
  if (dog) box(dog.x - 9, dog.y - 9, dog.x + 9, dog.y + 9, dog.d);
  // The bridge's parts: their south sides and island ends look at the viewer.
  for (let i = 0; i < BRIDGE_PARTS; i++) {
    const t0 = i * seg;
    const t1 = t0 + seg;
    if (Math.hypot(Math.max(t0 - t, 0, t - t1), Math.max(Math.abs(o) - HALF, 0)) >= SORT_REACH)
      continue;
    order(o > HALF || t < t0, o < -HALF || t > t1, bridgePartDepth(i));
  }
  if (lo >= hi) return (lo + hi) / 2;
  if (base <= lo) return Math.min(lo + 0.5, (lo + hi) / 2);
  if (base >= hi) return Math.max(hi - 0.5, (lo + hi) / 2);
  return base;
}

export type WalkState = 'aboard' | 'mooring' | 'off' | 'ashore' | 'on';
/** A footprint: where, which way the foot pointed, which foot, and when. */
export type Print = { x: number; y: number; h: number; side: number; t: number };

/** The figure's colours: a navy pair of trousers, a sou'wester, and skin. */
const TROUSERS = '#2E3A4A';
const HAT = '#F5C531';
const BRIM = '#D9A21C';
const SKIN = '#E2AE84';

export class Walker implements Entity {
  state: WalkState = 'aboard';
  x: number = LANDING.x;
  y: number = LANDING.y;
  z = 0;
  /** Facing, in world radians. */
  h = Math.PI;
  vx = 0;
  vy = 0;
  /** Seconds in the current state. */
  t = 0;
  /** The gait: its phase, and how much of a stride the legs are taking, 0..1. */
  ph = 0;
  gait = 0;
  readonly prints: Print[] = [];
  /** The shirt, which the game keeps in the boat's paint. */
  shirt = '#E4572E';
  /** The figure has hopped onto the pier. */
  onLand: (() => void) | null = null;
  /** The figure is back aboard. */
  onBoard: (() => void) | null = null;
  /** A hop has begun, either way. */
  onHop: (() => void) | null = null;
  private ix = 0;
  private iy = 0;
  /** Off the end of the pier since landing: the way back aboard is offered only after a walk. */
  private wandered = false;
  private stride = 0;
  private side = 1;
  private now = 0;
  private bow = { x: 0, y: 0, z: 0 };
  private hop = { fx: 0, fy: 0, fz: 0, tx: 0, ty: 0, tz: 0 };

  /** Aboard and at the wheel: the stick steers the boat. */
  get aboard(): boolean {
    return this.state === 'aboard';
  }

  /** Ashore, or hopping between: the figure is drawn and the camera follows it. */
  get shown(): boolean {
    return this.state === 'off' || this.state === 'ashore' || this.state === 'on';
  }

  /**
   * Near enough the end of the pier to go back aboard, having been for a walk. Not straight after
   * landing: the button sits where a thumb lands to start walking.
   */
  get nearBoat(): boolean {
    return (
      this.state === 'ashore' &&
      this.wandered &&
      Math.hypot(this.x - LANDING.x, this.y - LANDING.y) < BOARD_REACH
    );
  }

  /** Tie up and go ashore. The game asks only while docked. */
  stepAshore(): boolean {
    if (this.state !== 'aboard') return false;
    this.state = 'mooring';
    this.t = 0;
    return true;
  }

  /** Hop back aboard, from the end of the pier. */
  goAboard(): boolean {
    if (!this.nearBoat) return false;
    this.hop = {
      fx: this.x,
      fy: this.y,
      fz: this.z,
      tx: this.bow.x,
      ty: this.bow.y,
      tz: this.bow.z,
    };
    this.h = Math.atan2(this.bow.y - this.y, this.bow.x - this.x);
    this.state = 'on';
    this.t = 0;
    this.onHop?.();
    return true;
  }

  /** The stick or the keys, as a screen-space vector of magnitude 0..1. */
  intent(ix: number, iy: number): void {
    this.ix = ix;
    this.iy = iy;
  }

  /** Aboard, as when the game starts over. */
  reset(): void {
    this.state = 'aboard';
    this.t = 0;
    this.vx = 0;
    this.vy = 0;
    this.gait = 0;
    this.prints.length = 0;
  }

  /** Where the figure sorts among the solids; the game draws it in its own sorted list. */
  sortDepth(build: number, pierD: number, dog: Rider | null): number {
    return walkerDepth(
      this.x,
      this.y,
      build,
      pierD,
      dog,
      this.state === 'off' || this.state === 'on',
    );
  }

  update(dt: number, w: World): void {
    const b = w.boat;
    const k = w.hullScale;
    this.now = w.T;
    this.t += dt;
    const first = this.prints[0];
    if (first && this.now - first.t > PRINT_LIFE) this.prints.shift();
    if (this.state === 'mooring') {
      const to = berth(k);
      const e = Math.min(1, dt * MOOR_EASE);
      const turn = MOOR_TURN * dt;
      b.x += (to.x - b.x) * e;
      b.y += (to.y - b.y) * e;
      b.h += clamp(angDiff(to.h, b.h), -turn, turn);
      b.v = 0;
      const there = Math.hypot(to.x - b.x, to.y - b.y) < 2 && Math.abs(angDiff(to.h, b.h)) < 0.05;
      if (this.t >= MOOR_TIME || there) {
        b.x = to.x;
        b.y = to.y;
        b.h = to.h;
        this.bowOf(b, k);
        this.hop = {
          fx: this.bow.x,
          fy: this.bow.y,
          fz: this.bow.z,
          tx: LANDING.x,
          ty: LANDING.y,
          tz: groundZ(LANDING.x, LANDING.y),
        };
        this.h = Math.PI;
        this.state = 'off';
        this.t = 0;
        this.onHop?.();
      }
      return;
    }
    this.bowOf(b, k);
    if (this.state === 'off' || this.state === 'on') {
      const f = Math.min(1, this.t / HOP);
      const hp = this.hop;
      this.x = hp.fx + (hp.tx - hp.fx) * f;
      this.y = hp.fy + (hp.ty - hp.fy) * f;
      this.z = hp.fz + (hp.tz - hp.fz) * f + Math.sin(Math.PI * f) * 12;
      this.gait = 0;
      if (f >= 1) {
        this.t = 0;
        this.vx = 0;
        this.vy = 0;
        if (this.state === 'off') {
          this.state = 'ashore';
          this.wandered = false;
          this.onLand?.();
        } else {
          this.state = 'aboard';
          this.onBoard?.();
        }
      }
      return;
    }
    if (this.state !== 'ashore') return;
    // The stick points where to walk; how far it is pushed is how fast, the same in every direction.
    const mag = Math.min(1, Math.hypot(this.ix, this.iy));
    let tx = 0;
    let ty = 0;
    if (mag > 0) {
      const d = dirToWorld(this.ix, this.iy);
      const n = Math.hypot(d[0], d[1]) || 1;
      tx = (d[0] / n) * WALK_SPEED * mag;
      ty = (d[1] / n) * WALK_SPEED * mag;
    }
    const e = Math.min(1, dt * WALK_EASE);
    this.vx += (tx - this.vx) * e;
    this.vy += (ty - this.vy) * e;
    const moved = walkStep(this, this.vx * dt, this.vy * dt, w.build);
    if (Math.hypot(this.vx, this.vy) > 8) this.h = Math.atan2(this.vy, this.vx);
    const speed = dt > 0 ? moved / dt : 0;
    this.gait += (Math.min(1, speed / (WALK_SPEED * 0.6)) - this.gait) * Math.min(1, dt * 10);
    this.ph += moved * 0.42;
    this.z = groundZ(this.x, this.y);
    if (Math.hypot(this.x - LANDING.x, this.y - LANDING.y) > BOARD_REACH + 10) this.wandered = true;
    this.stride += moved;
    if (this.stride >= STRIDE) {
      this.stride -= STRIDE;
      this.side = -this.side;
      if (this.z === 0) {
        this.prints.push({ x: this.x, y: this.y, h: this.h, side: this.side, t: this.now });
        if (this.prints.length > MAX_PRINTS) this.prints.shift();
      }
    }
  }

  private bowOf(b: { x: number; y: number; h: number }, k: number): void {
    this.bow.x = b.x + Math.cos(b.h) * 24 * k;
    this.bow.y = b.y + Math.sin(b.h) * 24 * k;
    this.bow.z = 9 * k + 1;
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer === 'surface') {
      this.drawPrints(v);
      return;
    }
    if (!this.shown) return;
    if (layer === 'solids') this.drawFigure(v);
    else if (layer === 'mask') v.light(this.x, this.y, this.z + 14, 160, 0.9);
    else if (layer === 'glow' && v.dark > 0.05) {
      const [hx, hy] = this.hand(-1);
      v.glow(hx, hy, this.z + 8, 36, `rgba(255,217,138,${0.55 * v.dark})`);
    }
  }

  /** Where a hand is, on this side (1 or -1 across the facing), as the arm swings against the legs. */
  private hand(side: number): [number, number] {
    const c = Math.cos(this.h);
    const s = Math.sin(this.h);
    const sw = -Math.sin(this.ph) * this.gait * side * 3;
    return [this.x + c * sw - s * 4.6 * side, this.y + s * sw + c * 4.6 * side];
  }

  private drawPrints(v: DrawView): void {
    const { ctx, px, py } = v;
    const Z = v.zoom;
    for (const p of this.prints) {
      if (!v.onScreen(p.x, p.y, 20)) continue;
      const a = 1 - (this.now - p.t) / PRINT_LIFE;
      if (a <= 0) continue;
      const c = Math.cos(p.h);
      const s = Math.sin(p.h);
      const x = p.x - s * 2.4 * p.side;
      const y = p.y + c * 2.4 * p.side;
      ctx.fillStyle = `rgba(122,86,44,${0.3 * a})`;
      ctx.beginPath();
      ctx.ellipse(
        px(x, y),
        py(x, y),
        2.3 * Z,
        1.2 * Z,
        Math.atan2((c + s) / 2, c - s),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  private drawFigure(v: DrawView): void {
    const { ctx, px, py } = v;
    const Z = v.zoom;
    const { x, y, z } = this;
    const c = Math.cos(this.h);
    const s = Math.sin(this.h);
    const swing = Math.sin(this.ph) * this.gait;
    // A shadow on whatever is beneath, the water too while hopping.
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    v.isoEllipse(x, y, 6, Math.min(z, groundZ(x, y)));
    ctx.fill();
    ctx.lineCap = 'round';
    // Legs: the forward foot lifts a little.
    ctx.strokeStyle = TROUSERS;
    ctx.lineWidth = 2.6 * Z;
    for (const side of [-1, 1]) {
      const f = swing * side * 3.5;
      const hx = x - s * 1.7 * side;
      const hy = y + c * 1.7 * side;
      const fx = hx + c * f;
      const fy = hy + s * f;
      ctx.beginPath();
      ctx.moveTo(px(hx, hy), py(hx, hy, z + 9));
      ctx.lineTo(px(fx, fy), py(fx, fy, z + Math.max(0, f) * 0.5));
      ctx.stroke();
    }
    // The body, in the boat's colour.
    const bx = px(x, y);
    const by = py(x, y, z + 13);
    ctx.fillStyle = this.shirt;
    ctx.beginPath();
    ctx.ellipse(bx, by, 4.6 * Z, 5.8 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    // Arms, swinging against the legs; at night one hand carries a lantern.
    ctx.strokeStyle = this.shirt;
    ctx.lineWidth = 2.2 * Z;
    for (const side of [-1, 1]) {
      const [hx, hy] = this.hand(side);
      const sx = x - s * 4.2 * side;
      const sy = y + c * 4.2 * side;
      ctx.beginPath();
      ctx.moveTo(px(sx, sy), py(sx, sy, z + 16));
      ctx.lineTo(px(hx, hy), py(hx, hy, z + 9));
      ctx.stroke();
    }
    if (v.dark > 0.2) {
      const [hx, hy] = this.hand(-1);
      ctx.fillStyle = '#FFE9A8';
      ctx.fillRect(px(hx, hy) - 1.8 * Z, py(hx, hy, z + 8) - 1.5 * Z, 3.6 * Z, 4 * Z);
    }
    // The head, a face when it looks toward the viewer, and the sou'wester.
    const hx = bx;
    const hy = py(x, y, z + 21);
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(hx, hy, 3.8 * Z, 0, Math.PI * 2);
    ctx.fill();
    const fx = c - s;
    const fy = (c + s) / 2;
    if (fy > -0.1) {
      ctx.fillStyle = '#2A1A08';
      for (const e of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(hx + (fx * 1.6 + e * 1.4) * Z, hy + 0.6 * Z, 0.65 * Z, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = BRIM;
    ctx.beginPath();
    ctx.ellipse(hx, hy - 2.2 * Z, 6.2 * Z, 2.6 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = HAT;
    ctx.beginPath();
    ctx.ellipse(hx, hy - 2.6 * Z, 4 * Z, 3.6 * Z, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }
}
