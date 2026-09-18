/**
 * The pirate, moved verbatim from the prototype script onto the entity
 * contract. Wakes once the player has earned enough, sails in from an edge,
 * prowls, chases a boat carrying four or more fish that is away from the
 * dock, steals half the hold on contact, and leaves. Never comes within 400
 * units of the dock. The game owns the consequences through callbacks: the
 * toast and cue on a chase, and the actual removal of fish on a steal.
 */

import { clamp } from '../core/math';
import { PIRATE_SPEED, PIRATE_UNLOCK } from '../data/tuning';
import { around, DOCK, IR, IX, IY, nearestEdgeExit, pushOut, WS } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';
import { type Ship, type ShipLook, steerShip } from './ship';

export type PirateState = 'away' | 'prowl' | 'chase' | 'leave';

export type PirateShip = Ship & {
  state: PirateState;
  timer: number;
  tx: number;
  ty: number;
  age: number;
  /** Set once the first "pirates are about" warning has gone out. */
  warned: number;
};

/** The pirate reads a little more of the world than most. */
export type PirateWorld = World & { earned: number; holdTotal: number; hullScale: number };

export const PIRATE_LOOK: ShipLook = {
  scale: 1.3,
  hull: '#2B2233',
  trim: '#B23A48',
  deck: '#6B5540',
  cabin: '#3A3145',
  roof: '#1D1926',
  mast: '#1D1926',
  flag: '#111',
  sail: '#1D1926',
  heap: 0,
};

/** A boat this close to the dock is safe from the chase. */
export const SAFE_RADIUS = 340;
/** A prowling pirate starts a chase from this far, if the hold has at least four fish. */
export const CHASE_RADIUS = 720;
/** The pirate keeps at least this far from the dock unless it is leaving. */
export const DOCK_BERTH = 400;

export function createPirateShip(): PirateShip {
  return { state: 'away', timer: 6, x: 0, y: 0, h: 0, v: 0, tx: 0, ty: 0, age: 0, warned: 0 };
}

export class Pirate implements Entity {
  readonly ship: PirateShip = createPirateShip();
  /** A chase has just begun; the game toasts and plays the cue. */
  onChase: (() => void) | null = null;
  /** Take this many fish from the hold, most valuable first; the game removes them and shows it. */
  onSteal: ((n: number) => void) | null = null;

  get visible(): boolean {
    return this.ship.state !== 'away';
  }

  depth(): number {
    return this.ship.x + this.ship.y;
  }

  /** Send the pirate away, as when the game starts over. */
  reset(): void {
    this.ship.state = 'away';
    this.ship.timer = 6;
  }

  update(dt: number, w: PirateWorld): void {
    const p = this.ship;
    const boat = w.boat;
    if (w.earned < PIRATE_UNLOCK) return;
    if (p.state === 'away') {
      p.timer -= dt;
      if (p.timer > 0) return;
      for (let i = 0; i < 12; i++) {
        const side = Math.floor(w.rng() * 4);
        const t = 200 + w.rng() * (WS - 400);
        const pt =
          side === 0
            ? [-200, t]
            : side === 1
              ? [WS + 200, t]
              : side === 2
                ? [t, -200]
                : [t, WS + 200];
        p.x = pt[0] as number;
        p.y = pt[1] as number;
        if (Math.hypot(p.x - boat.x, p.y - boat.y) > 800) break;
      }
      p.h = Math.atan2(IY - p.y, IX - p.x);
      p.v = 60;
      p.state = 'prowl';
      p.age = 0;
      p.tx = IX;
      p.ty = IY;
      return;
    }
    p.age += dt;
    const dBoat = Math.hypot(boat.x - p.x, boat.y - p.y);
    const boatSafe = Math.hypot(boat.x - DOCK.x, boat.y - DOCK.y) < SAFE_RADIUS;
    let tx = p.tx;
    let ty = p.ty;
    let speed = PIRATE_SPEED * 0.6;
    if (p.state === 'prowl') {
      if (Math.hypot(p.tx - p.x, p.ty - p.y) < 120 || p.age < 0.1) {
        const a = w.rng() * Math.PI * 2;
        const r = 800 + w.rng() * 1500;
        p.tx = clamp(IX + Math.cos(a) * r, 150, WS - 150);
        p.ty = clamp(IY + Math.sin(a) * r, 150, WS - 150);
      }
      tx = p.tx;
      ty = p.ty;
      if (w.holdTotal >= 4 && !boatSafe && dBoat < CHASE_RADIUS) {
        p.state = 'chase';
        this.onChase?.();
      } else if (p.age > 50) p.state = 'leave';
    } else if (p.state === 'chase') {
      tx = boat.x + Math.cos(boat.h) * boat.v * 0.4;
      ty = boat.y + Math.sin(boat.h) * boat.v * 0.4;
      speed = PIRATE_SPEED;
      if (boatSafe || w.holdTotal === 0) {
        p.state = 'prowl';
        p.age = Math.max(p.age, 25);
        p.tx = p.x;
        p.ty = p.y;
      } else if (dBoat < 30 + 18 * w.hullScale) {
        this.onSteal?.(Math.ceil(w.holdTotal / 2));
        p.state = 'leave';
      } else if (p.age > 70) p.state = 'leave';
    }
    if (p.state === 'leave') {
      const ex = nearestEdgeExit(p.x, p.y);
      tx = ex[0];
      ty = ex[1];
      speed = PIRATE_SPEED * 0.9;
      if (p.x < -180 || p.x > WS + 180 || p.y < -180 || p.y > WS + 180) {
        p.state = 'away';
        p.timer = 28 + w.rng() * 20;
        return;
      }
    }
    const dd = Math.hypot(p.x - DOCK.x, p.y - DOCK.y);
    if (dd < DOCK_BERTH && p.state !== 'leave') {
      tx = p.x + ((p.x - DOCK.x) / dd) * 300;
      ty = p.y + ((p.y - DOCK.y) / dd) * 300;
    }
    {
      const ar = around(p.x, p.y, tx, ty, IR + 90);
      tx = ar[0];
      ty = ar[1];
    }
    steerShip(p, tx, ty, speed, 1.7, dt);
    pushOut(p, IX, IY, IR + 60);
  }

  draw(v: DrawView, layer: Layer): void {
    const p = this.ship;
    if (p.state === 'away') return;
    if (layer === 'solids') v.ship(p, PIRATE_LOOK);
    else if (layer === 'mask') v.light(p.x, p.y, 14, 170, 0.75);
    else if (layer === 'glow') {
      if (v.dark > 0.3) {
        v.ctx.globalCompositeOperation = 'screen';
        v.glow(p.x, p.y, 20, 120, `rgba(255,60,60,${0.16 * v.dark})`);
        v.ctx.globalCompositeOperation = 'source-over';
      }
    } else if (layer === 'overlay') {
      if (p.state === 'prowl' || p.state === 'chase') {
        v.indicator(p.x, p.y, '#B23A48', 'pirate', p.state === 'chase');
      }
    }
  }
}
