/**
 * The gulls, moved verbatim from the prototype script. Four trail the boat,
 * one more for each quarter of the hold that is full, and fade out as it
 * empties. By day, others circle any school still worth fishing, three over
 * a full one and two over a thinning one, which is how a player reads the
 * water from a distance. They draw in the air layer and ask nothing of the
 * game.
 */
import type { DrawView, Entity, Layer, World } from './entity';

export type Gull = {
  x: number;
  y: number;
  /** Presence, 0 to 1; eases in as the hold fills. */
  a: number;
};

/** What the gulls read of a school. */
export type GullSchool = { cx: number; cy: number; night: boolean; alive: number; n: number };

/** Gulls that follow the boat. */
export const BOAT_GULLS = 4;

export class Gulls implements Entity {
  readonly gulls: Gull[];

  constructor(
    readonly schools: GullSchool[],
    at: { x: number; y: number },
  ) {
    this.gulls = [0, 1, 2, 3].map(() => ({ x: at.x, y: at.y, a: 0 }));
  }

  update(dt: number, w: World): void {
    const boat = w.boat;
    const want = Math.ceil((w.holdTotal / w.holdCap) * BOAT_GULLS);
    const c = Math.cos(boat.h);
    const sn = Math.sin(boat.h);
    this.gulls.forEach((g, i) => {
      const tx = boat.x - c * (55 + i * 28) + Math.cos(w.T * 1.3 + i * 2.1) * 22;
      const ty = boat.y - sn * (55 + i * 28) + Math.sin(w.T * 1.1 + i * 1.7) * 22;
      g.x += (tx - g.x) * Math.min(1, dt * 1.8);
      g.y += (ty - g.y) * Math.min(1, dt * 1.8);
      g.a += ((i < want ? 1 : 0) - g.a) * Math.min(1, dt * 2);
    });
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'air') return;
    const { T } = v;
    const Z = v.zoom;
    for (let j = 0; j < this.schools.length; j++) {
      const sc = this.schools[j] as GullSchool;
      if (sc.night || v.dark > 0.8 || !v.onScreen(sc.cx, sc.cy, 220 * Z)) continue;
      const fr = sc.alive / sc.n;
      const n = fr > 0.7 ? 3 : fr > 0.35 ? 2 : 0;
      const dir = j % 2 ? 1 : -1;
      for (let i = 0; i < n; i++) {
        const a = T * 0.7 * dir + i * ((Math.PI * 2) / n) + j;
        const r = 50 + i * 9;
        v.bird(
          sc.cx + Math.cos(a) * r,
          sc.cy + Math.sin(a) * r,
          78 + Math.sin(T + i + j) * 8,
          T * 7 + i * 2 + j,
          1,
          1,
        );
      }
    }
    this.gulls.forEach((g, i) => {
      if (g.a > 0.03)
        v.bird(g.x, g.y, 50 + i * 7 + Math.sin(T * 1.5 + i) * 4, T * 8 + i * 1.7, 0.9, g.a);
    });
  }
}
