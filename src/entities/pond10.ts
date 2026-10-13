/**
 * The birds that sing by island 10's pond, for the kid's "peaceful with bird song": a cardinal, a bluebird and a
 * goldfinch, each perched on a reed at the water's edge round the pond. While the figure is near the pond by day,
 * every few seconds one of them sings: it lifts its head and bobs, a note rises over it, and the ambience plays its
 * song (audio/ambience.ts songbird), panned to where it sits. They fall quiet at night and when the figure is away.
 * The game draws them (render/pond10.ts), with the fishing line and float when one is out.
 */

import { POND } from '../world/isle10';
import type { DrawView, Entity, Layer, World } from './entity';

/** They sing while the figure is within this of the pond's middle, loudest within the near part of it. */
export const SONG_NEAR = 300;
export const SONG_FAR = 460;
/** Seconds between songs, at least and at most. */
export const SONG_GAP: readonly [number, number] = [2.5, 6];
/** A song shows over its singer this long. */
export const SING_FOR = 1.3;

export type PondBird = {
  /** 0 cardinal, 1 bluebird, 2 goldfinch: its looks and its song. */
  kind: number;
  x: number;
  y: number;
  /** Seconds of its song still to show. */
  sing: number;
  face: number;
};

/** Each bird's place round the pond's edge, as an angle round it. */
const PERCHES: readonly [number, number][] = [
  [-2.3, 0],
  [0.6, 1],
  [2.5, 2],
];

/** How loud the songs are with the figure here: 1 near the pond, fading to nothing further off. */
export function songLevel(x: number, y: number): number {
  const d = Math.hypot(x - POND.x, y - POND.y);
  return Math.max(0, Math.min(1, (SONG_FAR - d) / (SONG_FAR - SONG_NEAR)));
}

export class PondBirds implements Entity {
  readonly birds: PondBird[] = PERCHES.map(([a, kind], i) => ({
    kind,
    x: POND.x + Math.cos(a) * (POND.r + 6),
    y: POND.y + Math.sin(a) * (POND.r + 6),
    sing: 0,
    face: i % 2 ? 1 : -1,
  }));
  private wait = SONG_GAP[0];
  /** One sings: which, and how loud for where the figure is. */
  onSing: ((b: PondBird, level: number) => void) | null = null;

  update(dt: number, w: World): void {
    for (const b of this.birds) b.sing = Math.max(0, b.sing - dt);
    const f = w.figure;
    const level = f && w.dark < 0.5 ? songLevel(f.x, f.y) : 0;
    if (level <= 0) return;
    this.wait -= dt;
    if (this.wait > 0) return;
    this.wait = SONG_GAP[0] + w.rng() * (SONG_GAP[1] - SONG_GAP[0]);
    const b = this.birds[Math.floor(w.rng() * this.birds.length)];
    if (!b) return;
    b.sing = SING_FOR;
    this.onSing?.(b, level);
  }

  /** The game draws them (render/pond10.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}
