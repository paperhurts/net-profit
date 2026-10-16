/**
 * The black lagoon's ten creatures, the kid's ("you see the creatures, ten of them"): the Old One's lagoon creatures,
 * the scaly green ones with a fin for a crest and big pale eyes that he raised out of his pool on Gigantis, at home
 * here, swimming, seen side on. Two hit points each, as on land, and a claw.
 *
 * Each keeps to its own place in the water, drifting round it. A diver who comes near is noticed: it swims at the
 * diver, slower than a diver swims, so the diver can get away; close, it raises its claws (the warning), and if the
 * diver is still there it claws the tank, and air bubbles out, then backs off a moment and comes again. A diver far
 * off, or on the way up, it leaves and goes home. A spear hits it, or a friend does; beaten, it does not die, as
 * nothing does in a dive: it gives up and swims off down into the dark, and stays away the rest of the dive. They are
 * all back, whole, the next time.
 *
 * And the friends who can go under water go too (the kid's: "your Reapers and things able to go under water go with
 * you"): the naga and the baby Reaper, if they are with you ashore, swim along behind the diver and go for any
 * creature near it, the naga's trident for 2 and the baby's nip for 1, as ashore.
 */

import { CREATURE_HOMES, keepInLagoon } from '../world/lagoondive';
import { POWER, SWING_EVERY } from './pals';

/** Its hit points, and how far, how fast and how often. */
export const CREATURE_HP = 2;
/** A diver this near is noticed; further than LOSE, it gives up and goes home. */
export const NOTICE = 120;
export const LOSE = 240;
/** Coming for the diver, and drifting at home: slower than the diver swims (115). */
export const COME_SPEED = 72;
export const DRIFT_SPEED = 22;
/** This near, it raises its claws; this long it holds them up before it claws. */
export const CLAW_R = 24;
export const TELL = 0.6;
/** What a claw costs the diver: seconds of air. */
export const CLAW_AIR = 7;
/** After a claw, or a miss, it backs off this long. */
export const OFF_T = 1.6;
/** A spear passing this near its middle hits it. */
export const HIT_R = 18;
/** Beaten, how long it takes to swim off down into the dark. */
export const GONE_T = 1.4;

export type CreatureState = 'home' | 'come' | 'tell' | 'off' | 'beaten' | 'gone';
export type CreatureEvent = 'notice' | 'tell' | 'claw' | 'miss' | null;

/** Distance from a point to the segment a..b. */
function toSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const l = vx * vx + vy * vy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l)) : 0;
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

export class LagoonCreature {
  x: number;
  y: number;
  /** Which way it faces: -1 left, 1 right. */
  face: -1 | 1 = 1;
  hp = CREATURE_HP;
  state: CreatureState = 'home';
  t = 0;
  /** Its strokes, and of a hit's flash. */
  ph: number;
  flash = 0;
  private vx = 0;
  private vy = 0;

  constructor(
    readonly home: { x: number; y: number },
    private readonly seed: number,
  ) {
    this.x = home.x;
    this.y = home.y;
    this.ph = seed * 1.7;
  }

  /** Back at home, whole: a new dive. */
  reset(): void {
    this.x = this.home.x;
    this.y = this.home.y;
    this.vx = 0;
    this.vy = 0;
    this.hp = CREATURE_HP;
    this.state = 'home';
    this.t = 0;
    this.flash = 0;
    this.ph = this.seed * 1.7;
  }

  /** In the water and in the fight: not beaten. */
  get out(): boolean {
    return this.state !== 'beaten' && this.state !== 'gone';
  }

  /** Its claws up, 0 to 1. */
  get claws(): number {
    return this.state === 'tell' ? Math.min(1, (TELL - this.t) / (TELL * 0.5)) : 0;
  }

  /** Whether a spear from (x0, y0) to (x1, y1) passes near enough its middle to hit it. */
  hitBy(x0: number, y0: number, x1: number, y1: number): boolean {
    return this.out && toSegment(this.x, this.y, x0, y0, x1, y1) < HIT_R;
  }

  /** Hit, by a spear or a friend; whether that beat it. */
  hit(n: number): boolean {
    if (!this.out) return false;
    this.hp -= n;
    this.flash = 1;
    if (this.hp > 0) {
      // Knocked back a little, and it backs off before coming again.
      this.state = 'off';
      this.t = OFF_T * 0.6;
      return false;
    }
    this.state = 'beaten';
    this.t = GONE_T;
    return true;
  }

  private swimTo(x: number, y: number, speed: number, dt: number): void {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    const tx = d > 1 ? (dx / d) * Math.min(speed, d * 3) : 0;
    const ty = d > 1 ? (dy / d) * Math.min(speed, d * 3) : 0;
    const k = Math.min(1, dt * 3);
    this.vx += (tx - this.vx) * k;
    this.vy += (ty - this.vy) * k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (Math.abs(this.vx) > 6) this.face = this.vx > 0 ? 1 : -1;
  }

  /** One step, the diver at (d.x, d.y), up = on the way back up. What happened worth telling. */
  update(dt: number, d: { x: number; y: number }, up: boolean): CreatureEvent {
    this.t -= dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    this.ph += dt * (this.state === 'come' ? 7 : 3);
    const dist = Math.hypot(d.x - this.x, d.y - this.y);
    let ev: CreatureEvent = null;
    switch (this.state) {
      case 'home': {
        // A slow loop round its place.
        const a = this.ph * 0.18 + this.seed;
        this.swimTo(
          this.home.x + Math.cos(a) * 26,
          this.home.y + Math.sin(a * 1.3) * 10,
          DRIFT_SPEED,
          dt,
        );
        if (!up && dist < NOTICE) {
          this.state = 'come';
          ev = 'notice';
        }
        break;
      }
      case 'come':
        this.swimTo(d.x - Math.sign(d.x - this.x || 1) * 12, d.y, COME_SPEED, dt);
        if (up || dist > LOSE) this.state = 'home';
        else if (dist < CLAW_R) {
          this.state = 'tell';
          this.t = TELL;
          ev = 'tell';
        }
        break;
      case 'tell':
        // Claws up, hanging in the water, facing the diver.
        this.vx *= Math.max(0, 1 - dt * 6);
        this.vy *= Math.max(0, 1 - dt * 6);
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (Math.abs(d.x - this.x) > 2) this.face = d.x > this.x ? 1 : -1;
        if (this.t <= 0) {
          ev = !up && dist < CLAW_R + 14 ? 'claw' : 'miss';
          this.state = 'off';
          this.t = OFF_T;
        }
        break;
      case 'off':
        // Back off away from the diver a moment, then come again (or go home, if the diver is away).
        this.swimTo(this.x + (this.x - d.x), this.y + (this.y - d.y) * 0.5, COME_SPEED, dt);
        if (this.t <= 0) this.state = !up && dist < NOTICE * 1.4 ? 'come' : 'home';
        break;
      case 'beaten':
        // It gives up and swims off down into the dark.
        this.swimTo(this.x + this.face * -60, this.y + 80, COME_SPEED * 1.4, dt);
        if (this.t <= 0) this.state = 'gone';
        break;
      case 'gone':
        return null;
    }
    keepInLagoon(this, 10);
    return ev;
  }
}

/** The ten of them. */
export class LagoonFolk {
  readonly list: LagoonCreature[] = CREATURE_HOMES.map((h, i) => new LagoonCreature(h, i));

  /** All back home, whole: a new dive. */
  reset(): void {
    for (const c of this.list) c.reset();
  }

  /** How many are still about, not beaten. */
  get left(): number {
    return this.list.filter((c) => c.out).length;
  }

  /** The first one a spear's flight passes near. */
  hitBy(x0: number, y0: number, x1: number, y1: number): LagoonCreature | null {
    return this.list.find((c) => c.hitBy(x0, y0, x1, y1)) ?? null;
  }

  /** What the next throw goes for: the nearest one about, in reach and not behind the diver. */
  aim(d: { x: number; y: number; face: number }, range: number): LagoonCreature | null {
    let best: LagoonCreature | null = null;
    let bd = range;
    for (const c of this.list) {
      if (!c.out) continue;
      const dx = c.x - d.x;
      const dd = Math.hypot(dx, c.y - d.y);
      if (dd < bd && dx * d.face >= -8) {
        bd = dd;
        best = c;
      }
    }
    return best;
  }

  /** The nearest one about to a point, within r. */
  nearest(x: number, y: number, r: number): LagoonCreature | null {
    let best: LagoonCreature | null = null;
    let bd = r;
    for (const c of this.list) {
      if (!c.out) continue;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }
}

/** A friend who can go under water: the naga, or the baby Reaper. */
export type DivePalKind = 'naga' | 'baby';
/** How fast they swim, how far from the diver they go after a creature, and how close they hit from. */
export const PAL_SWIM = 150;
export const PAL_FIGHT = 150;
export const PAL_REACH: Readonly<Record<DivePalKind, number>> = { naga: 34, baby: 24 };

export class DivePal {
  x: number;
  y: number;
  face: -1 | 1 = 1;
  ph = 0;
  /** Of a swing or a nip, counting down from when it lands. */
  swingT = 0;
  private cd = 0;
  private vx = 0;
  private vy = 0;

  constructor(
    readonly kind: DivePalKind,
    x: number,
    y: number,
  ) {
    this.x = x;
    this.y = y;
  }

  /** Where it keeps to by the diver: the naga up behind, the baby down behind. */
  private spot(d: { x: number; y: number; face: number }): { x: number; y: number } {
    return this.kind === 'naga'
      ? { x: d.x - d.face * 50, y: d.y - 26 }
      : { x: d.x - d.face * 44, y: d.y + 30 };
  }

  /** One step: after a creature near the diver, else along behind it. The creature it hit, and whether that beat it. */
  update(
    dt: number,
    d: { x: number; y: number; face: number },
    folk: LagoonFolk,
  ): { hit: LagoonCreature; beat: boolean } | null {
    this.ph += dt * 4;
    this.cd -= dt;
    this.swingT = Math.max(0, this.swingT - dt);
    const foe = folk.nearest(d.x, d.y, PAL_FIGHT);
    const reach = PAL_REACH[this.kind];
    const to = foe
      ? { x: foe.x - Math.sign(foe.x - this.x || 1) * reach * 0.7, y: foe.y }
      : this.spot(d);
    const dx = to.x - this.x;
    const dy = to.y - this.y;
    const dist = Math.hypot(dx, dy);
    const sp = Math.min(PAL_SWIM, dist * 2.5);
    const k = Math.min(1, dt * 4);
    this.vx += ((dist > 1 ? dx / dist : 0) * sp - this.vx) * k;
    this.vy += ((dist > 1 ? dy / dist : 0) * sp - this.vy) * k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    keepInLagoon(this, 10);
    // Facing what it goes for; else the way it swims, or, keeping its place, the way the diver faces.
    if (foe) this.face = foe.x >= this.x ? 1 : -1;
    else if (Math.abs(this.vx) > 30) this.face = this.vx > 0 ? 1 : -1;
    else this.face = d.face > 0 ? 1 : -1;
    if (foe && this.cd <= 0 && Math.hypot(foe.x - this.x, foe.y - this.y) < reach + 8) {
      this.cd = SWING_EVERY[this.kind];
      this.swingT = 0.25;
      return { hit: foe, beat: foe.hit(POWER[this.kind]) };
    }
    return null;
  }
}
