/**
 * The old man on island 10's prairie, the kid's: "a little old man with a beard and cowboy hat in a rocking chair who
 * tells dad jokes". He rocks on the porch of his store (world/isle10.ts STORE10), and when the figure comes up the
 * path he gives it a wave. Tap him from close by and he tells the next of his jokes (data/snacks.ts), chuckling at it
 * himself, and his store opens; the game draws him (render/oldman.ts) and keeps his shelf.
 */

import { DAD_JOKES } from '../data/snacks';
import { OLDMAN10 } from '../world/isle10';
import type { DrawView, Entity, Layer, World } from './entity';

/** Tap him from this near and he talks; he waves once the figure is this near. */
export const OLDMAN_REACH = 70;
export const WAVE_REACH = 160;
/** Seconds his chuckle and his rocking-harder last after a joke. */
export const CHUCKLE_FOR = 2.4;

export class OldMan implements Entity {
  /** How far through his rocking, and how far along a wave. */
  rock = 0;
  wave = 0;
  /** Seconds of chuckle left. */
  chuckle = 0;
  /** The next joke he tells. */
  joke = 0;
  private waved = false;

  /** The joke he tells now, and on to the next for the time after; he laughs at it. */
  tell(): string {
    const line = DAD_JOKES[this.joke % DAD_JOKES.length] ?? '';
    this.joke = (this.joke + 1) % DAD_JOKES.length;
    this.chuckle = CHUCKLE_FOR;
    return line;
  }

  /** Whether the figure at x, y is near enough to talk to him. */
  static reaches(x: number, y: number): boolean {
    return Math.hypot(x - OLDMAN10.x, y - OLDMAN10.y) <= OLDMAN_REACH;
  }

  update(dt: number, w: World): void {
    // A slow rock, quicker while he laughs.
    this.rock += dt * (this.chuckle > 0 ? 4.5 : 1.6);
    this.chuckle = Math.max(0, this.chuckle - dt);
    this.wave = Math.max(0, this.wave - dt);
    const f = w.figure;
    const near = !!f && Math.hypot(f.x - OLDMAN10.x, f.y - OLDMAN10.y) < WAVE_REACH;
    if (near && !this.waved) this.wave = 1.6;
    this.waved = near;
  }

  /** The game draws him on his porch (render/oldman.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}
