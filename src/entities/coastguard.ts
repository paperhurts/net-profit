/**
 * The coast guard, from the grown-ups' list: a radio from the shipwright, and when the pirates are
 * about in home water, a call on it brings the coast guard's cutter racing out from the dock, its
 * light flashing blue, to sail beside the boat for a minute. While it is out the pirates turn tail
 * and keep away (the game holds the pirate off while `out` is true). One call a day: the radio is
 * ready again at dawn, which the game keeps. Like the pirates, it keeps to home water: it heads
 * home when its minute is up, when the boat ties up, or when the boat goes out past the buoys.
 */

import { around, BEACH, DOCK, IR, IX, IY, pastBuoys, pushOut } from '../world/island';
import type { Blipper, DrawView, Entity, Layer, World } from './entity';
import { type Ship, type ShipLook, steerShip } from './ship';

export type GuardState = 'home' | 'out' | 'escort' | 'back';

/** Its speed: faster than the pirate (188) and a flagship, so it always catches up. */
export const GUARD_SPEED = 340;
/** Seconds it sails beside the boat once it is there. */
export const ESCORT_T = 60;
/** How close to the boat counts as there. */
export const ARRIVE = 160;
/** How far to the side of the boat it keeps station. */
export const ALONGSIDE = 110;

export const GUARD_LOOK: ShipLook = {
  scale: 1.15,
  hull: '#F4F7F8',
  trim: '#E4572E',
  deck: '#D9E2E6',
  cabin: '#FFFFFF',
  roof: '#1F4E8C',
  mast: '#1F4E8C',
  flag: '#E4572E',
};

export class CoastGuard implements Entity {
  readonly ship: Ship & { state: GuardState; t: number } = {
    x: DOCK.x,
    y: DOCK.y,
    h: 0,
    v: 0,
    state: 'home',
    t: 0,
  };
  /** It has come alongside; the game says so. */
  onArrive: (() => void) | null = null;
  /** Its minute is up, or the boat has gone in or out past the buoys: it heads home. */
  onLeave: (() => void) | null = null;

  /** Out on the water and keeping the pirates off, from the call until it heads home. */
  get out(): boolean {
    return this.ship.state === 'out' || this.ship.state === 'escort';
  }

  /** Called out from the dock, if it is home; whether it came. */
  call(): boolean {
    const s = this.ship;
    if (s.state !== 'home') return false;
    s.x = DOCK.x + 60;
    s.y = DOCK.y;
    s.h = 0;
    s.v = 120;
    s.state = 'out';
    s.t = 0;
    return true;
  }

  /** Back at the dock at once, as when the game starts over. */
  reset(): void {
    this.ship.state = 'home';
    this.ship.v = 0;
  }

  update(dt: number, w: World): void {
    const s = this.ship;
    if (s.state === 'home') return;
    const b = w.boat;
    // Station: beside the boat, a little ahead of it at speed.
    const side = b.h + Math.PI / 2;
    const ahead = b.v * 0.35;
    const sx = b.x + Math.cos(side) * ALONGSIDE * w.hullScale + Math.cos(b.h) * ahead;
    const sy = b.y + Math.sin(side) * ALONGSIDE * w.hullScale + Math.sin(b.h) * ahead;
    const away = w.docked || pastBuoys(b.x, b.y);
    let tx = sx;
    let ty = sy;
    let speed = GUARD_SPEED;
    if (s.state === 'out') {
      if (away) this.leave();
      else if (Math.hypot(b.x - s.x, b.y - s.y) < ARRIVE * w.hullScale) {
        s.state = 'escort';
        s.t = ESCORT_T;
        this.onArrive?.();
      }
    } else if (s.state === 'escort') {
      s.t -= dt;
      if (s.t <= 0 || away) this.leave();
      // Close in fast, then hold station at the boat's own pace.
      const d = Math.hypot(sx - s.x, sy - s.y);
      speed = Math.min(GUARD_SPEED, Math.abs(b.v) + 40 + d * 1.2);
    }
    if (s.state === 'back') {
      tx = DOCK.x + 60;
      ty = DOCK.y;
      speed = GUARD_SPEED * 0.7;
      if (Math.hypot(tx - s.x, ty - s.y) < 40) {
        s.state = 'home';
        s.v = 0;
        return;
      }
    }
    const ar = around(s.x, s.y, tx, ty, IR + 90);
    steerShip(s, ar[0], ar[1], speed, 2.4, dt);
    pushOut(s, IX, IY, IR + 60);
    pushOut(s, BEACH.x, BEACH.y, BEACH.r + 50);
  }

  private leave(): void {
    this.ship.state = 'back';
    this.onLeave?.();
  }

  depth(): number {
    return this.ship.x + this.ship.y;
  }

  /** On the radar while it is out. */
  radar(blip: Blipper): void {
    if (this.ship.state !== 'home') blip(this.ship.x, this.ship.y, 'other');
  }

  draw(v: DrawView, layer: Layer): void {
    const s = this.ship;
    if (s.state === 'home') return;
    if (layer === 'solids') v.ship(s, GUARD_LOOK);
    else if (layer === 'mask') v.light(s.x, s.y, 14, 170, 0.75);
    else if (layer === 'glow' || layer === 'air') {
      // Its light on the cabin roof, flashing blue while it is out, steady going home.
      const on = s.state === 'back' || Math.sin(v.T * 9) > 0;
      if (!on) return;
      const x = v.px(s.x, s.y);
      const y = v.py(s.x, s.y, 34 * GUARD_LOOK.scale);
      if (layer === 'air') {
        v.ctx.fillStyle = '#5AB4FF';
        v.ctx.beginPath();
        v.ctx.arc(x, y, 3.2 * v.zoom, 0, Math.PI * 2);
        v.ctx.fill();
      } else {
        v.ctx.globalCompositeOperation = 'screen';
        v.glow(s.x, s.y, 34 * GUARD_LOOK.scale, 70, 'rgba(90,180,255,.45)');
        v.ctx.globalCompositeOperation = 'source-over';
      }
    }
  }
}
