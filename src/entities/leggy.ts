/**
 * Leggy muffins, the owner's (2026-10-13): fish muffins "which if uneaten, grow legs and start following you around,
 * like a bad sock with little cloud of stink above them like pigpen", and at most "an unholy half dozen". A muffin left
 * in the box a whole game day after it was baked (data/junk.ts keeps when) grows legs and hops out. On foot, anywhere
 * the figure walks, they trot after it in a line like ducklings, each along the way the figure actually went, so
 * nothing strands them, each under its own little cloud of stink. Aboard, they ride in a stink crate on the stern.
 * There are never more than six: when a seventh grows legs, the oldest wanders off into the sea. A tap on one makes
 * it squeak and hop, and puffs its stink; they cannot be eaten.
 */

import type { DrawView, Entity, Layer, World } from './entity';

/** The most that follow you. */
export const LEGGY_MAX = 6;
/** Game days in the box before a muffin grows legs. */
export const LEGS_AFTER = 1;
/** The trail is kept a point every STEP; the first muffin trots FIRST behind the figure, the rest GAP apart. */
export const STEP = 3;
export const FIRST = 26;
export const GAP = 13;
/** Further than this from where it should be, a muffin is simply there (the figure went through a door). */
export const JUMP = 60;
/** How fast they close on their place, as a share of the gap a second. */
const CATCH = 12;
/**
 * Waiting somewhere (the Garden Isle's lawn): how fast they waddle there, how fast they scurry back (faster than the
 * figure walks, so they catch up), how near their place in the line before they fall in, and how far apart they sit.
 */
export const WADDLE = 70;
export const SCURRY = 130;
const FALL_IN = 8;
const HUDDLE = 9;

/** One muffin on its legs: where, which way, how far its legs have gone, its hop. */
export type Leggy = { x: number; y: number; h: number; stride: number; hop: number };

/** How many at the front of the box (oldest first) have been there long enough to grow legs. */
export function sprouting(box: readonly number[], now: number): number {
  let n = 0;
  while (n < box.length && now - (box[n] ?? now) >= LEGS_AFTER) n++;
  return n;
}

export class LeggyMuffins implements Entity {
  /** How many follow you. */
  count = 0;
  /** Ashore, each on its legs, first behind the figure first. */
  readonly list: Leggy[] = [];
  /** Where the figure has walked, newest first, a point every STEP. */
  private trail: { x: number; y: number }[] = [];
  /** The figure on foot last frame. */
  private onFoot = false;
  /**
   * Somewhere to wait instead of at the figure's heels, while the game gives one (the Garden Isle's lawn while the
   * figure works the plot): they huddle there in a row, and waddle back along the ground, not popping, once it clears.
   */
  lead: { x: number; y: number } | null = null;
  /** Walking back from where they waited, until each is near its place in the line. */
  private returning = false;

  /**
   * One more grows legs, at x, y. True if that made seven, and the oldest wandered off into the sea; then it is gone
   * from the list and the count stays at six.
   */
  sprout(x: number, y: number): boolean {
    this.count++;
    if (this.onFoot) this.list.push({ x, y, h: 0, stride: 0, hop: 1 });
    if (this.count <= LEGGY_MAX) return false;
    this.count = LEGGY_MAX;
    // The oldest is at the front of the line.
    if (this.onFoot) this.list.shift();
    return true;
  }

  /** A tap on one: it squeaks and hops. */
  poke(i: number): void {
    const m = this.list[i];
    if (m) m.hop = 1;
  }

  /** The nearest on its legs to x, y within r, by index, or -1. */
  nearest(x: number, y: number, r: number): number {
    let best = -1;
    let bd = r;
    this.list.forEach((m, i) => {
      const d = Math.hypot(m.x - x, m.y - y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }

  /** Where the i-th should be, along the trail. */
  private place(i: number): { x: number; y: number } | null {
    const at = Math.round((FIRST + i * GAP) / STEP);
    return this.trail[Math.min(at, this.trail.length - 1)] ?? null;
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    for (const m of this.list) m.hop = Math.max(0, m.hop - dt * 2.5);
    if (!f) {
      // Aboard: into the crate.
      this.onFoot = false;
      this.returning = false;
      this.list.length = 0;
      this.trail.length = 0;
      return;
    }
    const head = this.trail[0];
    if (!this.onFoot || !head || Math.hypot(f.x - head.x, f.y - head.y) > JUMP) {
      // Just stepped off, or through a door: they tumble out round the figure, and the trail starts again.
      this.onFoot = true;
      this.returning = false;
      this.trail = [{ x: f.x, y: f.y }];
      this.list.length = 0;
      for (let i = 0; i < this.count; i++)
        this.list.push({ x: f.x - 4 + i * 2, y: f.y + 4, h: 0, stride: 0, hop: 1 });
    }
    // Lay the trail a point every STEP, back as far as the last of them needs.
    let last = this.trail[0];
    while (last && Math.hypot(f.x - last.x, f.y - last.y) >= STEP) {
      const d = Math.hypot(f.x - last.x, f.y - last.y);
      last = { x: last.x + ((f.x - last.x) / d) * STEP, y: last.y + ((f.y - last.y) / d) * STEP };
      this.trail.unshift(last);
    }
    const keep = Math.ceil((FIRST + LEGGY_MAX * GAP) / STEP) + 2;
    if (this.trail.length > keep) this.trail.length = keep;
    const lead = this.lead;
    if (lead) this.returning = true;
    let far = false;
    this.list.forEach((m, i) => {
      const p = lead
        ? { x: lead.x + (i - (this.list.length - 1) / 2) * HUDDLE, y: lead.y + HUDDLE }
        : this.place(i);
      if (!p) return;
      const dx = p.x - m.x;
      const dy = p.y - m.y;
      const d = Math.hypot(dx, dy);
      if (lead || (this.returning && d > FALL_IN)) {
        // On their way to the huddle, or back from it: on their legs, never a pop.
        if (!lead) far = true;
        const go = Math.min(d, (lead ? WADDLE : SCURRY) * dt);
        if (go > 0.05) {
          m.x += (dx / d) * go;
          m.y += (dy / d) * go;
          m.h = Math.atan2(dy, dx);
          m.stride += go * 0.6;
        }
        return;
      }
      if (d > JUMP) {
        m.x = p.x;
        m.y = p.y;
        return;
      }
      const k = Math.min(1, dt * CATCH);
      m.x += dx * k;
      m.y += dy * k;
      const moved = d * k;
      if (moved > 0.05) m.h = Math.atan2(dy, dx);
      m.stride += moved * 0.6;
    });
    if (!lead && !far) this.returning = false;
  }

  /** The game draws them (render/leggy.ts): sorted with the figure ashore, in their crate aboard. */
  draw(_v: DrawView, _layer: Layer): void {}
}
