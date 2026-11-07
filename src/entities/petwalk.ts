/**
 * Your walking pet, the pet system's third piece (data/petsys.ts): the one pet you take along, a pet you drew, for
 * now. On foot, anywhere the figure walks, it trots at its heel along the way the figure actually went, as the dog and
 * the leggy muffins do, so nothing on an island strands it, and through a door it is simply there. When the figure
 * stops it stops too, close by, and stands looking about. Aboard it rides the boat. A tap on it and it hops, with
 * hearts. The game draws it (render/petsys.ts drawDoodle): a drawing standing on the ground, walking on its legs.
 */

import type { DrawView, Entity, Layer, World } from './entity';

/** The trail is kept a point every STEP; the pet trots HEEL behind the figure along it, a step behind where the dog sits. */
export const STEP = 3;
export const HEEL = 34;
/** Further than this from where it should be, it is simply there (the figure went through a door). */
export const JUMP = 60;
/** How fast it closes on its place, as a share of the gap a second. */
const CATCH = 10;
/** Seconds of a hop and its hearts after a pat. */
export const LOVE_T = 1.4;
/** How fast it walks off to a lead and back, a second. */
export const STROLL = 42;

export class WalkingPet implements Entity {
  /** Whether a pet walks with you at all. */
  on = false;
  x = 0;
  y = 0;
  /** Facing, in world radians. */
  h = 0;
  /** The step's phase, and how much it is walking, 0 standing to 1. */
  ph = 0;
  walk = 0;
  /** Seconds of hearts left after a pat. */
  love = 0;
  /** On foot beside the figure, not aboard. */
  ashore = false;
  /**
   * Somewhere to go and wait instead of at the figure's heel, as the companions and the muffins do (the Garden Isle's
   * lawn while the figure works the beds; the black cat's, the owner's call). Cleared, it walks back to the heel.
   */
  lead: { x: number; y: number } | null = null;
  private returning = false;
  private trail: { x: number; y: number }[] = [];

  /** A pat: a hop and hearts. */
  pet(): void {
    this.love = LOVE_T;
  }

  update(dt: number, w: World): void {
    this.love = Math.max(0, this.love - dt);
    const f = w.figure;
    if (!this.on || !f) {
      this.ashore = false;
      this.trail.length = 0;
      this.walk = Math.max(0, this.walk - dt * 4);
      return;
    }
    // Off to wait at its lead, or walking back from it: at a stroll, not a hop.
    const to = this.lead ?? (this.returning && this.ashore ? f : null);
    if (to) {
      if (this.lead) this.returning = true;
      const dx = to.x - this.x;
      const dy = to.y - this.y;
      const d = Math.hypot(dx, dy);
      const near = this.lead ? 2 : HEEL * 0.6;
      if (d > near) {
        const s = Math.min(d, STROLL * dt);
        this.x += (dx / d) * s;
        this.y += (dy / d) * s;
        this.h = Math.atan2(dy, dx);
        this.walk += (1 - this.walk) * Math.min(1, dt * 8);
        this.ph += dt * (4 + 6 * this.walk);
        return;
      }
      this.walk = Math.max(0, this.walk - dt * 4);
      if (this.lead) return;
      // Back at the heel: the trail starts again from here.
      this.returning = false;
      this.trail = [{ x: f.x, y: f.y }];
    }
    const head = this.trail[0];
    if (!this.ashore || !head || Math.hypot(f.x - head.x, f.y - head.y) > JUMP) {
      // Just stepped off, or through a door: it hops out beside the figure, and the trail starts again.
      this.ashore = true;
      this.trail = [{ x: f.x, y: f.y }];
      this.x = f.x - 6;
      this.y = f.y + 6;
    }
    let last = this.trail[0];
    while (last && Math.hypot(f.x - last.x, f.y - last.y) >= STEP) {
      const d = Math.hypot(f.x - last.x, f.y - last.y);
      last = { x: last.x + ((f.x - last.x) / d) * STEP, y: last.y + ((f.y - last.y) / d) * STEP };
      this.trail.unshift(last);
    }
    const keep = Math.ceil(HEEL / STEP) + 2;
    if (this.trail.length > keep) this.trail.length = keep;
    const p = this.trail[Math.min(Math.round(HEEL / STEP), this.trail.length - 1)];
    if (!p) return;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d > JUMP) {
      this.x = p.x;
      this.y = p.y;
      return;
    }
    const k = Math.min(1, dt * CATCH);
    this.x += dx * k;
    this.y += dy * k;
    const speed = (d * k) / Math.max(dt, 1e-3);
    if (speed > 4) this.h = Math.atan2(dy, dx);
    const target = Math.min(1, speed / 40);
    this.walk += (target - this.walk) * Math.min(1, dt * 8);
    this.ph += dt * (4 + 6 * this.walk);
  }

  /** The game draws it, sorted with the figure ashore and on the boat aboard. */
  draw(_v: DrawView, _layer: Layer): void {}
}
