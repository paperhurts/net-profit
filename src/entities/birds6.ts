/**
 * Island 6's birds, the kid's (2026-10-13: "he wants island six to have lots of birds"). Parrots perch in the palm
 * crowns, two to a tree in every other palm: scarlet macaws, blue-and-gold ones, green parrots and white cockatoos.
 * Walk up under a tree and its parrots burst out squawking and wheel round it, then settle back once the figure has
 * moved on. Little sandpipers work the wet sand along the waterline in six groups, pecking and shuffling, and run
 * from the figure's feet, fluttering up a moment if it comes right on them. And now and then a skein of birds
 * crosses high over the island. The game draws the perched ones with their palms and the sandpipers among the
 * island's solids (render/birds6.ts); the ones in the air draw themselves.
 */

import { ISLE6, PALMS6, SHORE_IN, shoreR } from '../world/isle6';
import type { DrawView, Entity, Layer, World } from './entity';

/** Every other palm has two parrots. */
export const PARROT_PALMS: readonly number[] = PALMS6.map((_, i) => i).filter((i) => i % 2 === 0);
/** The figure this near a tree puts its parrots up; they wheel round for at least FLY_FOR seconds. */
export const STARTLE = 70;
export const FLY_FOR = 5;
/** The sandpipers: groups round the beach (clear of the pier, which is at a quarter turn), so many in each. */
export const PIPER_GROUPS: readonly number[] = [-2.5, -1.6, -0.7, 0.3, 2.2, 3.0];
export const PIPERS_EACH = 5;
/** They run from the figure this near, and flutter up from it this near. */
export const SHY = 48;
export const SKITTISH = 22;
/** How far in from the waterline they work. */
export const WET = SHORE_IN + 10;
/** A skein crosses the island every so often. */
export const SKEIN_EVERY = 22;
const SKEIN_SPAN = 2200;
const SKEIN_SPEED = 120;

export type Parrot = {
  palm: number;
  /** Which side of the crown it sits. */
  side: -1 | 1;
  /** 0 scarlet macaw, 1 blue-and-gold, 2 green, 3 cockatoo. */
  kind: number;
  flying: boolean;
  /** Seconds up. */
  t: number;
  /** How far round its circle. */
  a: number;
  /** How far up, 0 perched to 1 at the height of its circle. */
  up: number;
};

export type Piper = {
  /** Its angle round the island; its group's middle. */
  a: number;
  home: number;
  /** Which way it faces along the shore, and how far through a peck. */
  face: number;
  peck: number;
  /** A flutter up, 1 to 0. */
  hop: number;
};

/** A world point on the wet sand at angle a round island 6. */
export function wetSand(a: number): { x: number; y: number } {
  const r = shoreR(a) - WET;
  return { x: ISLE6.x + Math.cos(a) * r, y: ISLE6.y + Math.sin(a) * r };
}

export class Birds6 implements Entity {
  readonly parrots: Parrot[] = PARROT_PALMS.flatMap((palm, i) => [
    { palm, side: -1 as const, kind: i % 4, flying: false, t: 0, a: i, up: 0 },
    { palm, side: 1 as const, kind: (i + 2) % 4, flying: false, t: 0, a: i + Math.PI, up: 0 },
  ]);
  readonly pipers: Piper[] = PIPER_GROUPS.flatMap((g) =>
    Array.from({ length: PIPERS_EACH }, (_, k) => ({
      a: g + (k - (PIPERS_EACH - 1) / 2) * 0.025,
      home: g + (k - (PIPERS_EACH - 1) / 2) * 0.025,
      face: k % 2 ? 1 : -1,
      peck: k * 0.4,
      hop: 0,
    })),
  );
  /** The skein overhead: where it started and which way it flies, and how long it has flown; null between. */
  skein: { x: number; y: number; dx: number; dy: number; t: number } | null = null;
  private skeinWait = SKEIN_EVERY / 2;
  /** Parrots have just gone up: the game squawks. */
  onStartle: (() => void) | null = null;

  update(dt: number, w: World): void {
    const f = w.figure;
    let startled = false;
    for (const p of this.parrots) {
      const [px, py] = PALMS6[p.palm] ?? [0, 0];
      const near = !!f && Math.hypot(f.x - px, f.y - py) < STARTLE;
      if (!p.flying && near) {
        p.flying = true;
        p.t = 0;
        startled = true;
      }
      if (p.flying) {
        p.t += dt;
        p.a += dt * (1.6 + p.kind * 0.15) * p.side;
        p.up = Math.min(1, p.up + dt * 2.5);
        if (p.t > FLY_FOR && !near) p.flying = false;
      } else p.up = Math.max(0, p.up - dt * 1.5);
    }
    if (startled) this.onStartle?.();
    for (const s of this.pipers) {
      s.peck += dt * 2.2;
      s.hop = Math.max(0, s.hop - dt * 1.6);
      const at = wetSand(s.a);
      const d = f ? Math.hypot(f.x - at.x, f.y - at.y) : Number.POSITIVE_INFINITY;
      if (f && d < SHY) {
        // Away along the shore from the figure, quick little steps; right on them, up they go.
        const ahead = wetSand(s.a + 0.01);
        const away =
          (ahead.x - at.x) * (at.x - f.x) + (ahead.y - at.y) * (at.y - f.y) >= 0 ? 1 : -1;
        s.face = away;
        s.a += away * dt * 0.16;
        if (d < SKITTISH && s.hop <= 0) s.hop = 1;
      } else {
        // Back toward home, a shuffle at a time, pecking.
        const back = s.home - s.a;
        if (Math.abs(back) > 0.004) {
          s.face = back > 0 ? 1 : -1;
          s.a += Math.sign(back) * Math.min(Math.abs(back), dt * 0.03);
        }
      }
    }
    // The skein: off one side of the island and across to the other, high up, every so often.
    if (this.skein) {
      this.skein.t += dt;
      if (this.skein.t * SKEIN_SPEED > SKEIN_SPAN) {
        this.skein = null;
        this.skeinWait = SKEIN_EVERY;
      }
    } else {
      this.skeinWait -= dt;
    }
    if (!this.skein && this.skeinWait <= 0) {
      const a = w.rng() * Math.PI * 2;
      this.skein = {
        x: ISLE6.x - Math.cos(a) * (SKEIN_SPAN / 2),
        y: ISLE6.y - Math.sin(a) * (SKEIN_SPAN / 2),
        dx: Math.cos(a),
        dy: Math.sin(a),
        t: 0,
      };
    }
  }

  /** Where the skein's leader is now, or null. */
  skeinHead(): { x: number; y: number } | null {
    const s = this.skein;
    if (!s) return null;
    return { x: s.x + s.dx * s.t * SKEIN_SPEED, y: s.y + s.dy * s.t * SKEIN_SPEED };
  }

  /** The game draws them (render/birds6.ts): perched with their palms, sandpipers among the solids, the rest in the air. */
  draw(_v: DrawView, _layer: Layer): void {}
}
