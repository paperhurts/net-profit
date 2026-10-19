/**
 * The tar eel, the kid's (his answers in his tab "tar eel for rowan": twice the leviathan; all over the tar ocean; it
 * "bites and wraps", "bringing under, which brings you to the nearest area"; 6 hits and "20 dm"; fought with "a
 * harpoon on boat"; the owner's call that the chemistry boat gets a health bar, a bite taking 20 of its 100). Its
 * hologram turns over the table in the bridge's missions room, and beating it is mission 2.
 *
 * Out on the tar it finds the chemistry boat before long: a long shadow comes up under the tar beside it, and it
 * surfaces, black and glossy as the tar, a great finned head on a long neck and its back breaking the tar in humps
 * behind, twice the length of a leviathan. It swims round the boat, head up, and in turns:
 *
 *  - it rears its head back while a red ring on the tar shows where it will strike, then bites there: out of the ring,
 *    or the bite takes 20 of the boat's 100;
 *  - it dives and throws its coils round the boat in a red ring on the tar that closes in: out through the ring before
 *    it closes, or it wraps the boat and pulls it under, and it comes up again at the nearest dock, the tar dock or
 *    the tar island's jetty. The boat's health run out to bites does the same.
 *
 * While it is up, the harpoon reaches its head. Six hits and it thrashes and sinks into the tar for good. Near the tar
 * dock and the tar island's jetty it leaves the boat alone.
 */

import type { DrawView, Entity, Layer, World } from './entity';

export const EEL_HP = 6;
/** What a bite takes of the chemistry boat's 100. */
export const EEL_BITE = 20;
/** Its length: twice the guard leviathan's (two BODY_HALFs of 380). */
export const EEL_LEN = 1520;
/** Seconds out on the open tar before it finds the boat. */
export const EEL_FIND = 7;
/** It leaves a boat this near a dock alone, and goes off under. */
export const EEL_CALM = 600;
/** Seconds of its shadow coming up under the tar before it surfaces; how far off the boat it comes up. */
export const EEL_RISE_T = 1.6;
export const EEL_RISE_OFF = 340;
/** It swims round the boat this far off, this fast, and this long between blows; it catches up at EEL_CHASE. */
export const EEL_RING = 250;
export const EEL_SWIM = 150;
export const EEL_CHASE = 280;
export const EEL_CIRCLE_T = 2.8;
/** The bite: the ring, the warning, the strike. */
export const BITE_R = 70;
export const BITE_WINDUP = 1.1;
export const BITE_T = 0.35;
/** The wrap: the ring of its coils, from this round to this, over this long; a boat outside it gets away. */
export const WRAP_R0 = 230;
export const WRAP_R1 = 60;
export const WRAP_T = 2.4;
/** Its coils follow the boat this fast: a boat drifting along is caught, a boat sailing hard away gets out. */
export const WRAP_FOLLOW = 90;
/** Seconds to sink out of sight; seconds it stays away after pulling the boat under. */
export const EEL_DIVE_T = 1.2;
export const EEL_AWAY = 20;
/** Seconds it thrashes and sinks, beaten. */
export const EEL_SINK = 2.6;
/** Coins for beating it. */
export const EEL_PRIZE = 4000;

export type EelState =
  | 'away'
  | 'rise'
  | 'circle'
  | 'aim'
  | 'strike'
  | 'wrap'
  | 'dive'
  | 'sink'
  | 'gone';

type Pt = { x: number; y: number };

export class TarEel implements Entity {
  /** Its head, on the tar. */
  x = 0;
  y = 0;
  h = 0;
  hp = EEL_HP;
  state: EelState = 'away';
  t = 0;
  flash = 0;
  /** Whether it is out hunting (mission 2 taken, not yet beaten). */
  on = false;
  /** Seconds the boat has been out on the open tar; seconds it stays away. */
  found = 0;
  awayFor = 0;
  /** Round the boat. */
  private round = 0;
  /** Its blows in turn: the bite first. */
  private wrapNext = false;
  /** Harpooned, it has gone under, and comes back up with its next blow; a short swim round before it. */
  private back = false;
  private quick = false;
  /** Where its bite strikes, and where it strikes from; the middle of its coils. */
  ring: Pt = { x: 0, y: 0 };
  from: Pt = { x: 0, y: 0 };
  /** Where its head has been, newest first, for its back behind it. */
  readonly trail: Pt[] = [];
  onRise: (() => void) | null = null;
  onAim: (() => void) | null = null;
  onBite: ((hit: boolean) => void) | null = null;
  onWrap: (() => void) | null = null;
  onPull: (() => void) | null = null;
  onFree: (() => void) | null = null;
  onBeaten: (() => void) | null = null;

  /** Out of sight and starting over, whole: each sail out. */
  reset(): void {
    this.hp = EEL_HP;
    this.state = this.state === 'gone' || this.state === 'sink' ? 'gone' : 'away';
    this.t = 0;
    this.found = 0;
    this.awayFor = 0;
    this.flash = 0;
    this.wrapNext = false;
    this.back = false;
    this.quick = false;
    this.trail.length = 0;
  }

  /** Its head up out of the tar, where the harpoon reaches it: not while its coils are round the boat. */
  get up(): boolean {
    return this.state === 'circle' || this.state === 'aim' || this.state === 'strike';
  }

  /** How far up out of the tar it is, 0 to 1, for the drawing. */
  get out(): number {
    if (this.state === 'rise') return Math.min(1, this.t / EEL_RISE_T) * 0.25;
    if (this.state === 'dive') return Math.max(0, 1 - this.t / EEL_DIVE_T);
    if (this.state === 'sink') return Math.max(0, 1 - this.t / EEL_SINK);
    if (this.state === 'wrap') return 0.7;
    return this.up ? 1 : 0;
  }

  /** How far its coils have closed, as their ring's radius. */
  get wrapR(): number {
    return WRAP_R0 + (WRAP_R1 - WRAP_R0) * Math.min(1, this.t / WRAP_T);
  }

  /** A harpoon in its head: whether it hurt. Six and it sinks for good. */
  harpoon(power: number): boolean {
    if (!this.up) return false;
    this.hp = Math.max(0, this.hp - power);
    this.flash = 0.2;
    if (this.hp <= 0) {
      this.set('sink');
      this.onBeaten?.();
      return true;
    }
    // Hurt, it goes under, and comes back up with its next blow.
    this.back = true;
    this.set('dive');
    return true;
  }

  /** The boat went under and came up somewhere else: it goes off under the tar for a while. */
  pulled(): void {
    if (this.state === 'gone' || this.state === 'sink') return;
    this.awayFor = EEL_AWAY;
    this.found = 0;
    this.back = false;
    this.set(this.up || this.state === 'rise' || this.state === 'wrap' ? 'dive' : 'away');
  }

  /**
   * One step, given the boat on the tar (null while the figure is ashore) and whether it is near a dock, where it is
   * left alone.
   */
  step(dt: number, boat: (Pt & { h?: number }) | null, safe: boolean): void {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    if (this.state === 'gone') return;
    if (this.state === 'sink') {
      if (this.t >= EEL_SINK) this.state = 'gone';
      return;
    }
    if (this.state === 'dive') {
      this.swimOn(dt, EEL_SWIM);
      if (this.t < EEL_DIVE_T) return;
      if (!this.back || !boat || safe) {
        this.back = false;
        this.set('away');
        return;
      }
      // Back up with its next blow: its coils round the boat from under the tar, or up beside it to bite.
      this.back = false;
      const wrap = this.wrapNext;
      this.wrapNext = !wrap;
      if (wrap) {
        this.ring = { x: boat.x, y: boat.y };
        this.set('wrap');
        this.onWrap?.();
        return;
      }
      this.round = Math.atan2(this.y - boat.y, this.x - boat.x);
      this.quick = true;
      this.set('rise');
      return;
    }
    if (this.state === 'away') {
      this.awayFor = Math.max(0, this.awayFor - dt);
      if (!this.on || !boat || safe || this.awayFor > 0) {
        this.found = 0;
        return;
      }
      this.found += dt;
      if (this.found >= EEL_FIND) {
        // It comes up a way off ahead of the boat, to one side of its bow, so it is seen coming.
        this.round = (boat.h ?? 0) + 0.9;
        this.x = boat.x + Math.cos(this.round) * EEL_RISE_OFF;
        this.y = boat.y + Math.sin(this.round) * EEL_RISE_OFF;
        this.h = this.round + Math.PI / 2;
        // All its length lies out behind its head under the tar, so its back breaks the tar all along at once.
        this.trail.length = 0;
        for (let s = 0; s <= EEL_LEN; s += 12)
          this.trail.push({ x: this.x - Math.cos(this.h) * s, y: this.y - Math.sin(this.h) * s });
        this.set('rise');
        this.onRise?.();
      }
      return;
    }
    if (!boat || safe) {
      // Ashore, or near a dock: it lets go and goes off under.
      if (this.state === 'wrap') this.onFree?.();
      this.found = 0;
      this.set('dive');
      return;
    }
    if (this.state === 'rise') {
      this.toward(
        boat.x + Math.cos(this.round) * EEL_RING,
        boat.y + Math.sin(this.round) * EEL_RING,
        EEL_SWIM,
        dt,
      );
      if (this.t >= EEL_RISE_T) this.set('circle');
      return;
    }
    if (this.state === 'circle') {
      this.round += (EEL_SWIM / EEL_RING) * dt;
      this.toward(
        boat.x + Math.cos(this.round) * EEL_RING,
        boat.y + Math.sin(this.round) * EEL_RING,
        EEL_CHASE,
        dt,
      );
      if (this.quick) {
        // Back up beside the boat to bite: straight into it.
        this.quick = false;
      } else {
        if (this.t < EEL_CIRCLE_T) return;
        if (this.wrapNext) {
          this.wrapNext = false;
          this.ring = { x: boat.x, y: boat.y };
          this.set('wrap');
          this.onWrap?.();
          return;
        }
        this.wrapNext = true;
      }
      this.ring = { x: boat.x, y: boat.y };
      this.from = { x: this.x, y: this.y };
      this.h = Math.atan2(boat.y - this.y, boat.x - this.x);
      this.set('aim');
      this.onAim?.();
      return;
    }
    if (this.state === 'aim') {
      if (this.t >= BITE_WINDUP) this.set('strike');
      return;
    }
    if (this.state === 'strike') {
      // Its head lunges out over the ring, and back.
      const k = Math.min(1, this.t / BITE_T);
      const reach = Math.sin(k * Math.PI);
      this.x = this.from.x + (this.ring.x - this.from.x) * reach;
      this.y = this.from.y + (this.ring.y - this.from.y) * reach;
      if (k >= 0.5 && this.t - dt < BITE_T * 0.5) {
        this.onBite?.(Math.hypot(boat.x - this.ring.x, boat.y - this.ring.y) < BITE_R);
      }
      if (k >= 1) {
        this.round = Math.atan2(this.y - boat.y, this.x - boat.x);
        this.set('circle');
      }
      return;
    }
    if (this.state === 'wrap') {
      // Its head goes round the ring as its coils close.
      {
        const dx = boat.x - this.ring.x;
        const dy = boat.y - this.ring.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.5) {
          const m = Math.min(d, WRAP_FOLLOW * dt);
          this.ring = { x: this.ring.x + (dx / d) * m, y: this.ring.y + (dy / d) * m };
        }
      }
      const r = this.wrapR;
      const a = this.t * 2.4;
      this.x = this.ring.x + Math.cos(a) * r;
      this.y = this.ring.y + Math.sin(a) * r;
      this.h = a + Math.PI / 2;
      this.note();
      if (Math.hypot(boat.x - this.ring.x, boat.y - this.ring.y) > r + 10) {
        this.onFree?.();
        this.round = Math.atan2(this.y - boat.y, this.x - boat.x);
        this.set('circle');
        return;
      }
      if (this.t >= WRAP_T) {
        this.onPull?.();
        this.pulled();
      }
    }
  }

  update(_dt: number, _w: World): void {}

  /** Where its head is to strike at with the harpoon, while it is up. */
  mark(): Pt | null {
    return this.up ? { x: this.x, y: this.y } : null;
  }

  private set(s: EelState): void {
    this.state = s;
    this.t = 0;
  }

  /** On toward (x, y), no faster than speed. */
  private toward(x: number, y: number, speed: number, dt: number): void {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const s = Math.min(d, speed * dt);
      this.x += (dx / d) * s;
      this.y += (dy / d) * s;
      this.h = Math.atan2(dy, dx);
    }
    this.note();
  }

  /** Straight on the way it faces. */
  private swimOn(dt: number, speed: number): void {
    this.x += Math.cos(this.h) * speed * dt;
    this.y += Math.sin(this.h) * speed * dt;
    this.note();
  }

  /** Where its head is, onto the trail its back follows, every so far; as long as it is, no more. */
  private note(): void {
    const last = this.trail[0];
    if (last && Math.hypot(last.x - this.x, last.y - this.y) < 12) return;
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > EEL_LEN / 12 + 2) this.trail.pop();
  }

  /** The game draws it in the tar ocean's scene (render/tareel.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}
