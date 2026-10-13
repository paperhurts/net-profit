/**
 * The muffin man, the owner's (2026-10-13): "Cozy games live on NPCs like that, the ones that are completely useless
 * and that everyone remembers." A little bakery stall on the home pier, between its root and the crates, with a baker
 * behind the counter in a tall white hat, and a street sign at the pier's root that says Drury Lane. Tap him with the
 * figure near and he says the next line of his loop, which never resolves: "Do you know the muffin man?" "I AM the
 * muffin man." "Do you know him?" And round again, for ever. Walk up close and a little "..." over him says he would
 * talk. He sells nothing yet; that comes with the junk the net brings up.
 */

import { IY, PX0 } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

/** The stall, on the pier's far edge between its root and the crates: its counter's footprint. */
export const BAKERY = { x0: PX0 + 26, x1: PX0 + 60, y0: IY - 17, y1: IY - 9 } as const;
/** Where the baker stands, behind the counter. */
export const BAKER = { x: PX0 + 43, y: IY - 14.5 } as const;
/** The street sign's post, on the sand by the pier's root, along the beach from the stall so the awning never hides it. */
export const DRURY_LANE = { x: PX0 - 14, y: IY - 24 } as const;
/** The pier's deck height, which the stall stands on, and the height over him that his words come from. */
export const DECK_Z = 7;
export const WORDS_Z = DECK_Z + 45;

/** His loop, the owner's words. */
export const MUFFIN_LINES = [
  'Do you know the muffin man?',
  'I AM the muffin man.',
  'Do you know him?',
] as const;
/** Seconds a line stays up. */
export const SAY_FOR = 3.4;
/** How near the figure must be to talk to him; nearer than HAIL, a "..." says he would. */
export const TALK_REACH = 60;
export const HAIL_REACH = 110;

export class MuffinMan implements Entity {
  /** The line he said last, -1 before the first. */
  line = -1;
  /** Seconds since he said it. */
  t = Number.POSITIVE_INFINITY;
  /** The figure is near enough that he would talk. */
  near = false;
  /** Game seconds, for his idle sway. */
  private now = 0;

  /** The next line of the loop, said now. */
  say(): string {
    this.line = (this.line + 1) % MUFFIN_LINES.length;
    this.t = 0;
    return MUFFIN_LINES[this.line] ?? '';
  }

  /** What he is saying, while it is up. */
  saying(): string | null {
    return this.line >= 0 && this.t < SAY_FOR ? (MUFFIN_LINES[this.line] ?? null) : null;
  }

  /** Whether the figure, at x, y, can talk to him. */
  static reaches(x: number, y: number): boolean {
    return Math.hypot(x - BAKER.x, y - BAKER.y) <= TALK_REACH;
  }

  /** How much he bounces as he talks, 0..1: a hop as each line starts, settling. */
  bounce(): number {
    return this.t < 0.5 ? Math.sin((this.t / 0.5) * Math.PI) : 0;
  }

  /** His idle sway, a slow rock from foot to foot. */
  sway(): number {
    return Math.sin(this.now * 1.6) * 0.6;
  }

  update(dt: number, w: World): void {
    this.now = w.T;
    this.t += dt;
    const f = w.ashore;
    this.near = !!f && Math.hypot(f.x - BAKER.x, f.y - BAKER.y) <= HAIL_REACH;
  }

  /** The game draws him (render/bakery.ts): the stall with the pier, the sign with the island, his words over all. */
  draw(_v: DrawView, _layer: Layer): void {}
}
