/**
 * The diver in the trench, side on: the figure in the brass helmet from island
 * 3's dive, with a tank on its back and flippers. The stick swims it, easing
 * toward where it points; let go and it drifts gently up, as a diver does. It
 * breathes from the tank while under, and the tank fills again at the surface.
 * Cosy, as the owner chose: when the air runs out nothing bad happens, the
 * diver just floats back up to the boat and the dive ends; the Surface button
 * does the same on purpose. The shipwright's big air tank holds more.
 *
 * Under the ice the roof is solid but for the hole, so a rope ties the diver
 * to it: going up, out of air or on purpose, the rope pulls the diver straight
 * back to the hole and up through it. And the water there is freezing: the
 * diver gets cold, the game says how fast (not at all in the white scuba suit),
 * warms again at the hole, and when too cold is pulled up as when out of air.
 *
 * The same drives the treasure submarine, side on, in the far deep: heavier, hovering, and with no air to run out.
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

/**
 * The treasure submarine (world/subsea.ts) drives as the diver swims, but heavier and slower to answer, hovers where
 * it is let go rather than drifting up, needs no air, and takes this much room.
 */
export const SUB_SPEED = 100;
export const SUB_EASE = 2.2;
export const SUB_BODY = 20;

/** The share of too cold at which the game warns. */
export const CHILLY = 0.6;
/** How fast the diver warms again at the top, a share a second. */
export const WARM = 0.5;

export type DiverEvent = 'surfaced' | 'low' | 'out' | 'chilly' | 'frozen' | null;

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
  /** How cold it is, 0 to 1 (too cold); and how fast it gets colder, a share a second, while under. */
  cold = 0;
  chill = 0;
  /** It is the treasure submarine, not the diver. */
  sub = false;
  private warned = false;
  private shivered = false;

  /** Back in at the top under the boat, at a site, with a full tank of the size given. */
  reset(airMax = AIR_MAX, site: DiveSite = TRENCH_SITE, chill = 0, sub = false): void {
    this.site = site;
    this.sub = sub;
    this.chill = chill;
    this.cold = 0;
    this.shivered = false;
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
    if (this.state === 'up' && this.site.ceiling) {
      // The rope: straight back to the hole, under it, and up through it, whatever ice is in the way.
      const tx = this.site.entry;
      const ty = Math.abs(this.x - tx) > 4 ? Math.max(TOP + 30, Math.min(this.y, 60)) : -10;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const st = Math.min(d, ASCEND * dt);
      this.vx = (dx / d) * ASCEND;
      this.vy = (dy / d) * ASCEND;
      this.x += (dx / d) * st;
      this.y += (dy / d) * st;
      if (Math.abs(dx) > 1) this.face = dx > 0 ? 1 : -1;
      this.kick += dt * 6;
      if (this.y <= TOP) return 'surfaced';
      return null;
    }
    if (this.state === 'up') {
      this.vx += (0 - this.vx) * Math.min(1, dt * 3);
      this.vy = -ASCEND;
    } else {
      const m = Math.hypot(ix, iy);
      const top = this.sub ? SUB_SPEED : SWIM;
      const tx = m > 0.05 ? ix * top : 0;
      const ty = m > 0.05 ? iy * top : this.sub ? 0 : -DRIFT;
      const k = Math.min(1, dt * (this.sub ? SUB_EASE : EASE));
      this.vx += (tx - this.vx) * k;
      this.vy += (ty - this.vy) * k;
      if (Math.abs(ix) > 0.15) this.face = ix > 0 ? 1 : -1;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.site.keep(this, this.sub ? SUB_BODY : BODY);
    this.kick += dt * (3 + Math.hypot(this.vx, this.vy) / 14);
    this.deepest = Math.max(this.deepest, this.y);
    if (this.y <= TOP) {
      this.air = Math.min(this.airMax, this.air + dt * 25);
      this.cold = Math.max(0, this.cold - dt * WARM);
      this.warned = false;
      if (this.cold < CHILLY) this.shivered = false;
      // Up at the top and still heading up: back aboard.
      if (this.state === 'up' || this.vy < -SWIM * 0.4) return 'surfaced';
    } else if (this.state === 'swim' && !this.sub) {
      this.air = Math.max(0, this.air - dt);
      if (!this.warned && this.air <= this.airMax * AIR_LOW) {
        this.warned = true;
        ev = 'low';
      }
      if (this.air <= 0) {
        this.state = 'up';
        ev = 'out';
      }
      if (this.chill > 0 && this.state === 'swim') {
        this.cold = Math.min(1, this.cold + this.chill * dt);
        if (!this.shivered && this.cold >= CHILLY) {
          this.shivered = true;
          ev = 'chilly';
        }
        if (this.cold >= 1) {
          this.state = 'up';
          ev = 'frozen';
        }
      }
    }
    return ev;
  }
}
