/**
 * The diver in the trench, side on: the figure in the brass helmet from island
 * 3's dive, with a tank on its back and flippers. The stick swims it, easing
 * toward where it points; let go and it drifts gently up, as a diver does. It
 * breathes from the tank while under, and the tank fills again at the surface.
 * Cosy, as the owner chose: when the air runs out nothing bad happens, the
 * diver just floats back up to the boat and the dive ends; the Surface button
 * does the same on purpose. The shipwright's big air tank holds more.
 */

import { type DiveSite, TRENCH_SITE } from '../world/divesite';

/** Seconds of air in the tank, and the share left when the game warns. */
export const AIR_MAX = 75;
export const AIR_LOW = 0.25;
/** Seconds of air in the shipwright's big air tank. */
export const TANK_AIR = 120;
/** Top swimming speed, how quickly it eases to the stick, and how fast it drifts up when let go. */
export const SWIM = 115;
export const EASE = 3.5;
export const DRIFT = 12;
/** How fast it rises on its way back up, out of air or surfacing. */
export const ASCEND = 190;
/** Within this of the surface it is at the top: air fills, and swimming up from here ends the dive. */
export const TOP = 14;
/** How much room the diver takes against the rock. */
export const BODY = 12;

export type DiverEvent = 'surfaced' | 'low' | 'out' | null;

export class Diver {
  /** Where it is diving: the trench, or the wreck. */
  site: DiveSite = TRENCH_SITE;
  x = TRENCH_SITE.entry;
  y = TOP + 6;
  vx = 0;
  vy = 0;
  /** Which way it faces: -1 left, 1 right. */
  face: -1 | 1 = 1;
  /** The flippers' beat, faster as it swims harder. */
  kick = 0;
  air = AIR_MAX;
  /** What the tank on its back holds: the scuba gear's, or the big air tank's. */
  airMax = AIR_MAX;
  state: 'swim' | 'up' = 'swim';
  /** The deepest it has been this dive. */
  deepest = 0;
  private warned = false;

  /** Back in at the top under the boat, at a site, with a full tank of the size given. */
  reset(airMax = AIR_MAX, site: DiveSite = TRENCH_SITE): void {
    this.site = site;
    this.airMax = airMax;
    this.x = site.entry;
    this.y = TOP + 6;
    this.vx = 0;
    this.vy = 0;
    this.air = airMax;
    this.state = 'swim';
    this.deepest = 0;
    this.warned = false;
  }

  /** Head back up to the boat, as when the air runs out. */
  surface(): void {
    this.state = 'up';
  }

  /** One step, the stick at (ix, iy) on the screen; what happened, if anything worth saying. */
  update(dt: number, ix: number, iy: number): DiverEvent {
    let ev: DiverEvent = null;
    if (this.state === 'up') {
      this.vx += (0 - this.vx) * Math.min(1, dt * 3);
      this.vy = -ASCEND;
    } else {
      const m = Math.hypot(ix, iy);
      const tx = m > 0.05 ? ix * SWIM : 0;
      const ty = m > 0.05 ? iy * SWIM : -DRIFT;
      const k = Math.min(1, dt * EASE);
      this.vx += (tx - this.vx) * k;
      this.vy += (ty - this.vy) * k;
      if (Math.abs(ix) > 0.15) this.face = ix > 0 ? 1 : -1;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.site.keep(this, BODY);
    this.kick += dt * (3 + Math.hypot(this.vx, this.vy) / 14);
    this.deepest = Math.max(this.deepest, this.y);
    if (this.y <= TOP) {
      this.air = Math.min(this.airMax, this.air + dt * 25);
      this.warned = false;
      // Up at the top and still heading up: back aboard.
      if (this.state === 'up' || this.vy < -SWIM * 0.4) return 'surfaced';
    } else if (this.state === 'swim') {
      this.air = Math.max(0, this.air - dt);
      if (!this.warned && this.air <= this.airMax * AIR_LOW) {
        this.warned = true;
        ev = 'low';
      }
      if (this.air <= 0) {
        this.state = 'up';
        ev = 'out';
      }
    }
    return ev;
  }
}
