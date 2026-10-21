/**
 * The Heron's men, the kid's (his answers about Skrill: the spell is a portal, it opens "When it starts", and the men
 * out of it screaming "GET SKRILL AND PRIZON HIM" are "THE herons men"). Skrill's spell works, and backfires: as he
 * wakes he opens a portal on his floor, and out of it come the Heron's hired men, in his midnight blue with their
 * clubs, after Skrill, not after the figure. One comes every few seconds, four at most at a time.
 *
 *  - They run at Skrill. Up on his wings they wait under him, shaking their clubs; down on his floor, the one who
 *    reaches him grabs him and holds him a moment (a stun: a chance for the figure's spear) until he throws them off.
 *  - Skrill's own blows knock them flat, his sword, his bolts and his swoop alike; up again after a moment, they go
 *    straight back at him.
 *  - Beaten, he lies on his floor, and they have him: two of them take hold and drag him back through the portal to
 *    prison, and it shuts behind them.
 *
 * They are drawn as the hired men are (entities/monkeys.ts), each one a Monkey to the drawing.
 */

import type { Room } from '../world/tower';
import type { DrawView, Entity, Layer, World } from './entity';
import type { Monkey } from './monkeys';
import { LOW_Z, type Skrill } from './skrill';

/** At most this many out at a time, one every this many seconds while he fights. */
export const PARTY_MAX = 4;
export const PARTY_EVERY = 3;
/** They run at this; the figure walks at 85. */
export const PARTY_SPEED = 62;
/** The portal takes this long to open, or to shut. */
export const OPEN_T = 1.2;
/** From this near a man grabs Skrill, down on his floor, and holds him this long, stunned, before being thrown off. */
export const GRAB_R = 22;
export const GRAB_T = 0.8;
/** Knocked flat by one of his blows, or thrown off, this long. */
export const KNOCK_T = 1.4;
/** Up on his wings, they wait this far from under him. */
export const UNDER_R = 30;
/** Beaten, he is dragged to the portal by this many of them, at this. */
export const HAULERS = 2;
export const HAUL_SPEED = 44;

export type ManJob = 'run' | 'grab' | 'knocked' | 'haul';
export type HeronMan = Monkey & { job: ManJob; jt: number };

const D = Math.SQRT1_2;

export class PrisonParty implements Entity {
  /** Where the portal stands, on the left of his floor as seen. */
  readonly portal: { x: number; y: number };
  /** How open it is, 0 shut to 1 open; whether it is opening or shutting. */
  open = 0;
  opening = false;
  closing = false;
  men: HeronMan[] = [];
  /** Dragging him off, beaten. */
  hauling = false;
  private every = 0;
  private outs = 0;
  onOpen: (() => void) | null = null;
  onOut: ((m: HeronMan, first: boolean) => void) | null = null;
  onGrab: ((m: HeronMan) => void) | null = null;
  onKnock: ((m: HeronMan) => void) | null = null;
  onHaul: (() => void) | null = null;
  onTaken: (() => void) | null = null;

  constructor(
    readonly room: Room,
    readonly skrill: Skrill,
  ) {
    this.portal = { x: room.x - room.r * 0.62 * D, y: room.y + room.r * 0.62 * D };
  }

  /** His spell: the portal tears open. */
  openNow(): void {
    if (this.open > 0 || this.opening) return;
    this.opening = true;
    this.closing = false;
    this.onOpen?.();
  }

  /** Shut and empty, as when the figure comes up his tower again. */
  reset(): void {
    this.open = 0;
    this.opening = false;
    this.closing = false;
    this.men = [];
    this.hauling = false;
    this.every = 0;
    this.outs = 0;
  }

  update(dt: number, _w: World): void {
    if (this.opening) {
      this.open = Math.min(1, this.open + dt / OPEN_T);
      if (this.open >= 1) this.opening = false;
    }
    if (this.closing) {
      this.open = Math.max(0, this.open - dt / OPEN_T);
      if (this.open <= 0) this.closing = false;
    }
    const s = this.skrill;
    if (this.open >= 1 && !this.closing) {
      if (s.state === 'down' && !this.hauling) {
        // Beaten: they have him. Enough of them out at once to drag him off.
        this.hauling = true;
        while (this.men.length < HAULERS) this.out();
        for (const m of this.men) this.job(m, 'run');
        this.onHaul?.();
      } else if (s.up && !this.hauling) {
        this.every -= dt;
        if (this.every <= 0 && this.men.length < PARTY_MAX) {
          this.every = PARTY_EVERY;
          this.out();
        }
      }
    }
    if (this.hauling) {
      this.haul(dt);
      return;
    }
    for (const m of this.men) {
      m.jt += dt;
      m.flash = Math.max(0, m.flash - dt);
      if (m.job === 'knocked') {
        if (m.jt >= KNOCK_T) this.job(m, 'run');
        continue;
      }
      // His blows knock them flat, whatever they are at.
      if (s.blow && (s.blow === 'swoop' ? s.sweeps(m.x, m.y, m) : s.catches(m.x, m.y))) {
        this.knock(m, s.x, s.y);
        continue;
      }
      if (m.job === 'grab') {
        if (m.jt >= GRAB_T || !s.low) this.knock(m, s.x, s.y);
        continue;
      }
      if (!s.up) continue;
      const high = s.z > LOW_Z;
      const d = Math.hypot(s.x - m.x, s.y - m.y);
      if (!high && s.low && d < GRAB_R && !this.men.some((o) => o.job === 'grab')) {
        this.job(m, 'grab');
        s.stun(GRAB_T);
        this.onGrab?.(m);
        continue;
      }
      // Up on his wings: wait under him, a little off; down: straight at him.
      const a = Math.atan2(m.y - s.y, m.x - s.x);
      const tx = high ? s.x + Math.cos(a) * UNDER_R : s.x;
      const ty = high ? s.y + Math.sin(a) * UNDER_R : s.y;
      this.toward(m, tx, ty, PARTY_SPEED, dt);
    }
  }

  /** Beaten, he is taken: they reach him, two take hold, and drag him to the portal and through it. */
  private haul(dt: number): void {
    const s = this.skrill;
    const near = this.men.filter((m) => Math.hypot(m.x - s.x, m.y - s.y) < GRAB_R + 4);
    if (s.state === 'gone') return;
    if (near.length < HAULERS) {
      for (const m of this.men) this.toward(m, s.x, s.y, PARTY_SPEED, dt);
      return;
    }
    const dx = this.portal.x - s.x;
    const dy = this.portal.y - s.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) {
      s.taken();
      this.men = [];
      this.closing = true;
      this.onTaken?.();
      return;
    }
    const step = Math.min(d, HAUL_SPEED * dt);
    s.haul(s.x + (dx / d) * step, s.y + (dy / d) * step);
    this.men.forEach((m, i) => {
      m.job = 'haul';
      m.state = 'chase';
      m.ph += dt * 8;
      const side = i % 2 ? 1 : -1;
      const a = Math.atan2(dy, dx) + side * 1.2;
      m.x = s.x + Math.cos(a) * 14;
      m.y = s.y + Math.sin(a) * 14;
      m.h = Math.atan2(dy, dx);
    });
  }

  private out(): void {
    const i = this.outs++;
    const m: HeronMan = {
      x: this.portal.x,
      y: this.portal.y,
      h: 0,
      hp: 1,
      state: 'chase',
      thrower: false,
      cd: 0,
      flash: 0,
      back: 0,
      rest: 0,
      tx: this.portal.x,
      ty: this.portal.y,
      ph: i,
      stun: 0,
      job: 'run',
      jt: 0,
    };
    this.men.push(m);
    this.onOut?.(m, i === 0);
  }

  private knock(m: HeronMan, fx: number, fy: number): void {
    const d = Math.hypot(m.x - fx, m.y - fy) || 1;
    this.toward(m, m.x + ((m.x - fx) / d) * 30, m.y + ((m.y - fy) / d) * 30, 1e6, 1);
    m.flash = 0.2;
    this.job(m, 'knocked');
    this.onKnock?.(m);
  }

  private job(m: HeronMan, j: ManJob): void {
    m.job = j;
    m.jt = 0;
    m.state = j === 'run' || j === 'haul' ? 'chase' : 'idle';
  }

  /** A step toward (x, y), kept on his floor. */
  private toward(m: HeronMan, x: number, y: number, speed: number, dt: number): void {
    const dx = x - m.x;
    const dy = y - m.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) return;
    const st = Math.min(d, speed * dt);
    m.x += (dx / d) * st;
    m.y += (dy / d) * st;
    m.h = Math.atan2(dy, dx);
    m.ph += dt * 10;
    const R = this.room;
    const rd = Math.hypot(m.x - R.x, m.y - R.y);
    if (rd > R.r - 12) {
      m.x = R.x + ((m.x - R.x) / rd) * (R.r - 12);
      m.y = R.y + ((m.y - R.y) / rd) * (R.r - 12);
    }
  }

  /** The game draws the portal and the men among his floor's solids (render/prisonparty.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}
