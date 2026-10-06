/**
 * The anglerfish, out in the deep at night. It hangs a light in the water
 * with what look like glowing fish around it, and it fishes for boats. There
 * are no glowing fish in the deep, which is the whole tell; that and the
 * single bright bulb on its stalk, and something very large and dark beneath.
 * Make for the light at speed and its jaws open ahead of you, a ring of teeth
 * with the light flickering red, and they snap shut the moment the boat is
 * over them. Turn away and they shut on nothing. Caught, the net is torn and a quarter of the hold is gone;
 * never the boat, never coins. Either way it sinks back into the dark and
 * comes up somewhere else a while later. By day it is not there at all.
 */

import { rgba } from '../core/color';
import { clamp } from '../core/math';
import { SPECIES } from '../data/tuning';
import { DEEP, pastBuoys, WS } from '../world/island';
import { LAIR } from './cthuluviathan';
import type { DrawView, Entity, Layer, World } from './entity';

/** It comes up once it is this dark, and sinks once it is lighter than DAWN. */
export const DUSK = 0.5;
export const DAWN = 0.3;
/** How fast it drifts, and how close it lets its light come to a boat while it baits it. */
export const DRIFT = 22;
export const BAIT_NEAR = 300;
/** A boat within this of the light is near enough to bait. */
export const BAIT_RADIUS = 1000;
/** It opens for a boat making for the light, this many seconds' sailing away, clamped to these. */
export const OPEN_LEAD = 1.7;
export const OPEN_NEAR = 380;
export const OPEN_FAR = 600;
/** The boat must be this quick, and heading this squarely at the light. */
export const OPEN_SPEED = 60;
export const OPEN_SQUARE = 0.5;
/** Seconds for the jaws to open wide; the longest they wait open; their reach from the light. */
export const OPEN_TIME = 0.6;
export const SNAP_MAX = 3;
export const JAW_R = 140;
/** A boat this much further off than where they opened, turned away, and the jaws shut on nothing. */
export const GIVE_UP = 250;
/** Seconds to sink after a snap, and before it comes up again somewhere else. */
export const DIVE = 1.2;
export const COOL = 35;
/** It never lurks this close to the Cthuluviathan's city, nor this close to the buoys or the deep's end. */
export const LAIR_CLEAR = 1100;
export const EDGE = 220;

export type AnglerState = 'gone' | 'lurking' | 'opening' | 'diving';

/** How far ahead of a boat at this speed it opens. */
export function openAt(v: number): number {
  return clamp(v * OPEN_LEAD, OPEN_NEAR, OPEN_FAR);
}

/** How far into the deep a point is: past the buoys, and short of the deep's end. */
export function inDeep(x: number, y: number): boolean {
  if (!pastBuoys(x, y)) return false;
  const out = Math.max(-x, x - WS, -y, y - WS);
  const lo = -DEEP + EDGE;
  const hi = WS + DEEP - EDGE;
  return out > EDGE && x > lo && x < hi && y > lo && y < hi;
}

/** A place in the deep to lurk: past the buoys, short of the end, clear of the Cthuluviathan. */
export function lurkAt(
  rng: () => number,
  away?: { x: number; y: number },
  far = 0,
): [number, number] {
  for (let i = 0; i < 40; i++) {
    const side = Math.floor(rng() * 4);
    const along = rng() * (WS + DEEP * 2 - EDGE * 2) - DEEP + EDGE;
    const depth = EDGE + 40 + rng() * (DEEP - EDGE * 2 - 80);
    const x = side === 0 ? -depth : side === 1 ? WS + depth : along;
    const y = side === 2 ? -depth : side === 3 ? WS + depth : along;
    if (!inDeep(x, y) || Math.hypot(x - LAIR.x, y - LAIR.y) < LAIR_CLEAR) continue;
    if (away && Math.hypot(x - away.x, y - away.y) < far) continue;
    return [x, y];
  }
  return [WS / 2, WS + DEEP / 2];
}

export class Anglerfish implements Entity {
  state: AnglerState = 'gone';
  /** Where the light hangs; the body is beneath it. */
  x = WS / 2;
  y = WS + DEEP / 2;
  tx = this.x;
  ty = this.y;
  /** Seconds in the current state, and before it may come up again. */
  t = 0;
  cool = 0;
  /** How much of its light shows, 0..1. */
  glow = 0;
  /** How far off the boat was when the jaws opened. */
  openD = 0;
  /** The jaws have begun to open under a boat making for the light. */
  onOpen: (() => void) | null = null;
  /** The jaws closed on the boat. The game tears the net and takes fish. */
  onBite: (() => void) | null = null;
  /** The jaws closed on nothing. */
  onMiss: (() => void) | null = null;

  update(dt: number, w: World): void {
    const b = w.boat;
    const shown = this.state === 'lurking' || this.state === 'opening';
    this.glow += ((shown ? 1 : 0) - this.glow) * Math.min(1, dt * (shown ? 1.2 : 2.5));
    this.t += dt;
    if (this.state === 'gone') {
      this.cool -= dt;
      if (w.dark >= DUSK && this.cool <= 0) {
        [this.x, this.y] = lurkAt(w.rng, b, 1300);
        [this.tx, this.ty] = lurkAt(w.rng);
        this.state = 'lurking';
        this.t = 0;
      }
      return;
    }
    if (this.state === 'diving') {
      if (this.t > DIVE) {
        this.state = 'gone';
        this.cool = COOL;
        this.t = 0;
      }
      return;
    }
    if (this.state === 'opening') {
      const d = Math.hypot(b.x - this.x, b.y - this.y);
      const caught = d < JAW_R + 24 * w.hullScale;
      if (caught || this.t >= SNAP_MAX || d > this.openD + GIVE_UP) {
        this.state = 'diving';
        this.t = 0;
        if (caught) this.onBite?.();
        else this.onMiss?.();
      }
      return;
    }
    // Lurking.
    if (w.dark < DAWN) {
      this.state = 'diving';
      this.t = 0;
      return;
    }
    const d = Math.hypot(b.x - this.x, b.y - this.y);
    if (w.started && d < BAIT_RADIUS) {
      // Edge the light toward the boat, but no nearer than BAIT_NEAR.
      this.tx = b.x + ((this.x - b.x) / (d || 1)) * BAIT_NEAR;
      this.ty = b.y + ((this.y - b.y) / (d || 1)) * BAIT_NEAR;
    } else if (Math.hypot(this.tx - this.x, this.ty - this.y) < 40) {
      [this.tx, this.ty] = lurkAt(w.rng);
    }
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const dl = Math.hypot(dx, dy);
    if (dl > 1) {
      const step = Math.min(dl, DRIFT * dt);
      const nx = this.x + (dx / dl) * step;
      const ny = this.y + (dy / dl) * step;
      if (inDeep(nx, ny) && Math.hypot(nx - LAIR.x, ny - LAIR.y) >= LAIR_CLEAR) {
        this.x = nx;
        this.y = ny;
      } else {
        [this.tx, this.ty] = lurkAt(w.rng);
      }
    }
    if (!w.started || w.docked || b.v < OPEN_SPEED || d > openAt(b.v)) return;
    const toward = (Math.cos(b.h) * (this.x - b.x) + Math.sin(b.h) * (this.y - b.y)) / (d || 1);
    if (toward < OPEN_SQUARE) return;
    this.state = 'opening';
    this.t = 0;
    this.openD = d;
    this.onOpen?.();
  }

  draw(v: DrawView, layer: Layer): void {
    if (this.glow < 0.02 || !v.onScreen(this.x, this.y, 260)) return;
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    const g = this.glow;
    const opening = this.state === 'opening';
    const k = opening ? Math.min(1, this.t / OPEN_TIME) : 0;
    const shut = this.state === 'diving' && this.t < 0.25;
    if (layer === 'underwater') {
      // Something very large and dark beneath the light.
      ctx.fillStyle = `rgba(4,12,18,${(0.22 + 0.4 * k) * g})`;
      v.isoEllipse(this.x - 40, this.y - 40, 150 + 30 * k);
      ctx.fill();
      if (opening || shut) {
        // The mouth opening under the boat: dark inside, a ring of teeth.
        const r = shut ? JAW_R * 0.15 : JAW_R * (0.3 + 0.7 * k);
        ctx.fillStyle = `rgba(2,6,10,${0.55 * g})`;
        v.isoEllipse(this.x, this.y, r);
        ctx.fill();
      }
    } else if (layer === 'afloat') {
      if (opening) {
        const r = JAW_R * (0.3 + 0.7 * k);
        ctx.fillStyle = '#F4F1E6';
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          const x = this.x + Math.cos(a) * r;
          const y = this.y + Math.sin(a) * r;
          const sx = px(x, y);
          const sy = py(x, y);
          const inX = px(this.x, this.y) - sx;
          const inY = py(this.x, this.y) - sy;
          const il = Math.hypot(inX, inY) || 1;
          const tooth = (9 + (i % 3) * 3) * Z * (0.5 + 0.5 * k);
          ctx.beginPath();
          ctx.moveTo(sx - (inY / il) * 4 * Z, sy + (inX / il) * 4 * Z);
          ctx.lineTo(sx + (inX / il) * tooth, sy + (inY / il) * tooth);
          ctx.lineTo(sx + (inY / il) * 4 * Z, sy - (inX / il) * 4 * Z);
          ctx.closePath();
          ctx.fill();
        }
      }
      // The fake school: lanternfish to the life, circling the bulb.
      const lantern = SPECIES[6];
      if (lantern) {
        for (let i = 0; i < 10; i++) {
          const a = T * 0.8 + i * 0.63;
          const r = 30 + ((i * 13) % 24);
          const x = this.x + Math.cos(a) * r;
          const y = this.y + Math.sin(a) * r;
          ctx.globalAlpha = g;
          ctx.fillStyle = lantern.c;
          v.fishShape(
            px(x, y),
            py(x, y),
            lantern.s * Z,
            lantern,
            a + Math.PI / 2,
            Math.sin(T * 6 + i) * 0.4,
          );
        }
      }
      // The bulb on its stalk, bobbing; it flickers red as the jaws open.
      const bx = px(this.x, this.y);
      const by = py(this.x, this.y, 18 + Math.sin(T * 1.7) * 4);
      ctx.globalAlpha = g * 0.7;
      ctx.strokeStyle = '#1C2E33';
      ctx.lineWidth = 2 * Z;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(
        bx + 18 * Z,
        by - 6 * Z,
        px(this.x - 40, this.y - 40),
        py(this.x - 40, this.y - 40),
      );
      ctx.stroke();
      const flick = opening ? 0.5 + 0.5 * Math.sin(T * 40) : 1;
      ctx.globalAlpha = g * flick;
      ctx.fillStyle = opening ? '#FF9A6A' : '#FFF3B0';
      ctx.beginPath();
      ctx.arc(bx, by, 6 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (layer === 'mask') {
      v.light(this.x, this.y, 12, 190, 0.85 * g);
    } else if (layer === 'glow') {
      if (v.dark <= 0.05) return;
      ctx.globalCompositeOperation = 'screen';
      v.glow(this.x, this.y, 18, 90, rgba(opening ? '#FF9A6A' : '#FFF3B0', 0.5 * g * v.dark));
      v.glow(this.x, this.y, 2, 70, rgba('#7CF5E6', 0.3 * g * v.dark));
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
