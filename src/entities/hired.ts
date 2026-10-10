/**
 * The Heron's hired boats, the kid's "hires humans to come after you": once
 * island 7's sorcerer has failed him, the Heron pays men to keep his water, the
 * far deep round islands 8 and 9. Two boats in his midnight blue patrol a ring
 * round the twins, and a boat that comes into their water and within sight of
 * one is chased. They are a little slower than the flagship, so the way out is
 * to run; caught, they ram, and each ram costs hull. The harpoon sinks one in
 * three hits, and its crew swim off; the Heron hires another a while later.
 * They leave a boat tied up at a dock alone. The game owns the consequences
 * through callbacks: the toast on a chase, the hull on a ram, the bounty on a
 * sinking.
 */

import type { Solid } from '../render/layers';
import { ISLE8, ISLE9, pushOffTwins } from '../world/isle8';
import type { DrawView, Entity, Layer, World } from './entity';
import { type Ship, type ShipLook, steerShip } from './ship';

/** How many boats keep the Heron's water, and how fast they go: the flagship tops out at 350. */
export const HIRED_BOATS = 2;
export const HIRED_SPEED = 300;
/** A boat this near one of them, inside their water, is chased. */
export const HIRED_SIGHT = 650;
/** Their water: round the twins, out to this far; a chase gives up this far past it. */
export const PATROL_R = 1400;
export const GIVE_UP = 400;
/** The ring they patrol round the twins. */
export const RING = 760;
/** Hull lost to a ram, and how often they can ram. */
export const HIRED_RAM = 14;
export const RAM_EVERY = 2.4;
/** Harpoon hits to sink one, seconds before the Heron hires another, and coins for each sunk. */
export const HIRED_HP = 3;
export const HIRED_BACK = 45;
export const HIRED_BOUNTY = 60;
/** How long a sinking shows: debris and swimmers on the water. */
export const SINKING = 2.2;

/** The middle of the twins: the hired boats' water is round it. */
export const TWINS = { x: ISLE8.x, y: (ISLE8.y + ISLE9.y) / 2 } as const;

export const HIRED_LOOK: ShipLook = {
  scale: 1.2,
  hull: '#1F2A4A',
  trim: '#F4F1E6',
  deck: '#6B5540',
  cabin: '#2E3B5E',
  roof: '#1A2238',
  mast: '#1A2238',
  flag: '#F4F1E6',
  heap: 0,
};

/** A boat the harpoon has just hit, white for a moment. */
const FLASH_LOOK: ShipLook = { ...HIRED_LOOK, hull: '#FFFFFF', cabin: '#FFFFFF' };

/** The hired men ashore: hits to beat one, his pay when he is beaten, and the purse when a camp is. */
export const HIRED_MAN_HP = 3;
export const HIRED_PAY = 25;
export const HIRED_CAMP_PRIZE = 300;

export type HiredBoat = Ship & {
  state: 'patrol' | 'chase' | 'sunk';
  hp: number;
  tx: number;
  ty: number;
  /** Seconds until it can ram again, of the hit flash, and since it sank. */
  cd: number;
  flash: number;
  t: number;
};

/** A point on their ring, at an angle. */
export function ringPoint(a: number): [number, number] {
  return [TWINS.x + Math.cos(a) * RING, TWINS.y + Math.sin(a) * RING];
}

export class HiredBoats implements Entity {
  readonly boats: HiredBoat[] = [];
  /** Whether they keep the water yet: the game says, once island 7's sorcerer is beaten. */
  here = false;
  /** The one the harpoon would aim at, from the last mark. */
  private marked: HiredBoat | null = null;
  /** A chase has begun. */
  onChase: (() => void) | null = null;
  /** One has rammed the boat; the game takes the hull. */
  onRam: (() => void) | null = null;
  /** One has sunk, here; the game pays the bounty. */
  onSink: ((x: number, y: number) => void) | null = null;

  constructor(private readonly rnd: () => number = Math.random) {
    for (let i = 0; i < HIRED_BOATS; i++)
      this.boats.push(this.fresh((i / HIRED_BOATS) * Math.PI * 2));
  }

  private fresh(a: number): HiredBoat {
    const [x, y] = ringPoint(a);
    const [tx, ty] = ringPoint(a + 0.8);
    return {
      x,
      y,
      h: a + Math.PI / 2,
      v: 0,
      state: 'patrol',
      hp: HIRED_HP,
      tx,
      ty,
      cd: 0,
      flash: 0,
      t: 0,
    };
  }

  /** All back on patrol and whole, as when the game starts over. */
  reset(): void {
    this.boats.length = 0;
    for (let i = 0; i < HIRED_BOATS; i++)
      this.boats.push(this.fresh((i / HIRED_BOATS) * Math.PI * 2));
    this.marked = null;
  }

  /** The nearest boat still afloat, for the harpoon, or null. */
  mark(boat: { x: number; y: number }): HiredBoat | null {
    this.marked = null;
    if (!this.here) return null;
    let bd = Infinity;
    for (const s of this.boats) {
      if (s.state === 'sunk') continue;
      const d = Math.hypot(s.x - boat.x, s.y - boat.y);
      if (d < bd) {
        bd = d;
        this.marked = s;
      }
    }
    return this.marked;
  }

  /** Hits left on the boat the harpoon is aimed at. */
  get resolve(): number {
    return this.marked ? this.marked.hp : 0;
  }

  /** A harpoon lands on one. Returns whether it sank. */
  harpoon(power: number, s: HiredBoat): boolean {
    if (s.state === 'sunk') return false;
    s.hp = Math.max(0, s.hp - power);
    s.flash = 0.2;
    if (s.hp > 0) return false;
    s.state = 'sunk';
    s.t = 0;
    s.v = 0;
    this.onSink?.(s.x, s.y);
    return true;
  }

  /** Any boat chasing now. */
  get chasing(): boolean {
    return this.boats.some((s) => s.state === 'chase');
  }

  update(dt: number, w: World): void {
    if (!this.here) return;
    const b = w.boat;
    const k = w.hullScale;
    const inWater = Math.hypot(b.x - TWINS.x, b.y - TWINS.y) < PATROL_R;
    for (const [i, s] of this.boats.entries()) {
      s.cd = Math.max(0, s.cd - dt);
      s.flash = Math.max(0, s.flash - dt);
      if (s.state === 'sunk') {
        s.t += dt;
        if (s.t >= HIRED_BACK) {
          // Another, hired in, on the far side of the twins from the boat.
          const a = Math.atan2(b.y - TWINS.y, b.x - TWINS.x) + Math.PI + (this.rnd() - 0.5);
          Object.assign(s, this.fresh(a));
        }
        continue;
      }
      const dBoat = Math.hypot(b.x - s.x, b.y - s.y);
      if (s.state === 'patrol') {
        if (Math.hypot(s.tx - s.x, s.ty - s.y) < 90) {
          const a = Math.atan2(s.y - TWINS.y, s.x - TWINS.x) + 0.6 + this.rnd() * 0.5;
          [s.tx, s.ty] = ringPoint(a);
        }
        steerShip(s, s.tx, s.ty, HIRED_SPEED * 0.45, 1.6, dt);
        if (inWater && !w.docked && dBoat < HIRED_SIGHT) {
          const was = this.chasing;
          s.state = 'chase';
          if (!was) this.onChase?.();
        }
      } else {
        const far = Math.hypot(b.x - TWINS.x, b.y - TWINS.y) > PATROL_R + GIVE_UP;
        if (w.docked || far) {
          s.state = 'patrol';
          [s.tx, s.ty] = ringPoint(Math.atan2(s.y - TWINS.y, s.x - TWINS.x) + 0.6);
        } else {
          // Each from its own side, so two do not stack.
          const off = (i - (this.boats.length - 1) / 2) * 30;
          steerShip(s, b.x - Math.sin(b.h) * off, b.y + Math.cos(b.h) * off, HIRED_SPEED, 2.2, dt);
          if (dBoat < 30 * k + 24 && s.cd <= 0) {
            s.cd = RAM_EVERY;
            // Bounce off.
            s.h = Math.atan2(s.y - b.y, s.x - b.x);
            s.v = 140;
            this.onRam?.();
          }
        }
      }
      pushOffTwins(s, 26 * HIRED_LOOK.scale);
    }
  }

  /** Each boat afloat, for the game's depth-sorted solids. */
  solids(v: DrawView): Solid[] {
    if (!this.here) return [];
    return this.boats
      .filter((s) => s.state !== 'sunk' && v.onScreen(s.x, s.y, 120))
      .map((s) => ({ d: s.x + s.y, f: () => v.ship(s, s.flash > 0 ? FLASH_LOOK : HIRED_LOOK) }));
  }

  draw(v: DrawView, layer: Layer): void {
    if (!this.here) return;
    if (layer === 'mask') {
      // Their lanterns, at night.
      for (const s of this.boats) if (s.state !== 'sunk') v.light(s.x, s.y, 14, 140, 0.7);
      return;
    }
    if (layer !== 'surface') return;
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    // A sinking: foam, planks and the crew swimming off.
    for (const s of this.boats) {
      if (s.state !== 'sunk' || s.t > SINKING || !v.onScreen(s.x, s.y, 80)) continue;
      const k = s.t / SINKING;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = v.foam;
      ctx.lineWidth = 2 * Z;
      v.isoEllipse(s.x, s.y, 14 + k * 30);
      ctx.stroke();
      ctx.fillStyle = '#7A5A36';
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + s.x;
        const x = s.x + Math.cos(a) * (10 + k * 18);
        const y = s.y + Math.sin(a) * (10 + k * 18);
        ctx.save();
        ctx.translate(px(x, y), py(x, y, Math.sin(T * 3 + i)));
        ctx.rotate(a);
        ctx.fillRect(-5 * Z, -1.2 * Z, 10 * Z, 2.4 * Z);
        ctx.restore();
      }
      for (let i = 0; i < 2; i++) {
        const a = Math.atan2(s.y - TWINS.y, s.x - TWINS.x) + (i ? 0.5 : -0.5);
        const x = s.x - Math.cos(a) * k * 50;
        const y = s.y - Math.sin(a) * k * 50;
        ctx.fillStyle = '#E8C4A0';
        ctx.beginPath();
        ctx.arc(px(x, y), py(x, y, 2), 2.4 * Z, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8A9098';
        ctx.beginPath();
        ctx.arc(px(x, y), py(x, y, 3.4), 2.4 * Z, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}
