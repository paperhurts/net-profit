/**
 * Goat Isle's fainting goats (part two of the owner's plan): herds that graze and amble about their meadows, and go
 * stiff as a board and topple over when startled, by the figure running at one, bumping into one, or a "Boo!" from the
 * action button. A goat going over startles the goats standing right by it a moment later, so a tight herd goes down
 * like dominoes. A few seconds later each gets back up as if nothing happened, and stays calm a little while before
 * it can be startled again. Real fainting goats do just this (a muscle reflex, not a hurt), and nothing here ever hurts
 * one: they always get up.
 *
 * Plain state, stepped by the game; the drawing is render/goatisle.ts goatHerdSolids.
 */

/** Seconds it takes to tip over, how long it lies stiff, and how long getting back up takes. */
export const TIP_T = 0.28;
export const FAINT_T = 3.2;
export const RISE_T = 0.5;
/** After getting up, seconds before it can be startled again. */
export const CALM_T = 2;
/** A goat going over startles standing goats this close, this long after. */
export const CHAIN_R = 17;
export const CHAIN_DELAY = 0.16;
/** How far a "Boo!" reaches; how close the figure must be to bump one; how close, and how fast, to run at one. */
export const BOO_R = 40;
export const BUMP_R = 10;
export const RUN_R = 28;
export const RUN_V = 55;
/** How fast a goat ambles, world units a second. */
export const WALK_V = 9;

export type GoatState = 'graze' | 'walk' | 'startled' | 'faint';

export type Goat = {
  x: number;
  y: number;
  /** Which way it faces, radians. */
  h: number;
  /** Its herd's meadow, and how far from its middle it wanders. */
  hx: number;
  hy: number;
  hr: number;
  state: GoatState;
  /** Seconds left in this state: grazing, the moment before it goes over, or the whole faint. */
  t: number;
  /** Where it is ambling to. */
  tx: number;
  ty: number;
  /** How far over it is, 0 standing to 1 flat on its side. */
  k: number;
  /** Seconds before it can be startled again. */
  calm: number;
  /** Its coat, an index, and its walk's phase. */
  look: number;
  step: number;
};

type Figure = { x: number; y: number; vx: number; vy: number };

export class GoatHerds {
  readonly goats: Goat[] = [];

  constructor(
    herds: readonly { x: number; y: number; r: number; n: number }[],
    private readonly rand: () => number,
    private readonly land: (x: number, y: number) => boolean,
  ) {
    let look = 0;
    for (const hd of herds)
      for (let i = 0; i < hd.n; i++) {
        // Spread round the meadow's middle on a sunflower spiral, so no two start on top of each other.
        const a = i * 2.39996;
        const d = Math.sqrt((i + 0.5) / hd.n) * hd.r * 0.8;
        const x = hd.x + Math.cos(a) * d;
        const y = hd.y + Math.sin(a) * d;
        this.goats.push({
          x,
          y,
          h: rand() * Math.PI * 2,
          hx: hd.x,
          hy: hd.y,
          hr: hd.r,
          state: 'graze',
          t: 1 + rand() * 4,
          tx: x,
          ty: y,
          k: 0,
          calm: 0,
          look: look++,
          step: 0,
        });
      }
  }

  /** How many are down, or going down. */
  get down(): number {
    return this.goats.filter((g) => g.state === 'startled' || g.state === 'faint').length;
  }

  /** Whether a goat that could be startled is within r. */
  near(x: number, y: number, r: number): boolean {
    return this.goats.some((g) => standing(g) && Math.hypot(g.x - x, g.y - y) < r);
  }

  /** Startle every goat standing within r of a point, after a beat; how many. */
  startle(x: number, y: number, r: number, after = 0.22): number {
    let n = 0;
    for (const g of this.goats)
      if (standing(g) && Math.hypot(g.x - x, g.y - y) < r) {
        scare(g, after + Math.hypot(g.x - x, g.y - y) * 0.002);
        n++;
      }
    return n;
  }

  /** Step them all; the figure, if it is on the island. Returns how many went over this step, for the sound. */
  update(dt: number, fig: Figure | null): number {
    let fell = 0;
    for (const g of this.goats) {
      g.calm = Math.max(0, g.calm - dt);
      if (fig && standing(g)) {
        const dx = g.x - fig.x;
        const dy = g.y - fig.y;
        const d = Math.hypot(dx, dy);
        const v = Math.hypot(fig.vx, fig.vy);
        // Bumped, or run at: coming fast, and coming its way.
        const at = d > 0 && v > 0 ? (dx * fig.vx + dy * fig.vy) / (d * v) : 0;
        if (d < BUMP_R || (d < RUN_R && v > RUN_V && at > 0.6)) scare(g, 0.2);
      }
      switch (g.state) {
        case 'graze':
          g.t -= dt;
          if (g.t <= 0) this.wander(g);
          break;
        case 'walk': {
          const dx = g.tx - g.x;
          const dy = g.ty - g.y;
          const d = Math.hypot(dx, dy);
          const s = Math.min(d, WALK_V * dt);
          const nx = g.x + (dx / (d || 1)) * s;
          const ny = g.y + (dy / (d || 1)) * s;
          g.step += dt * 9;
          if (d < 1 || !this.land(nx, ny)) {
            g.state = 'graze';
            g.t = 2 + this.rand() * 5;
          } else {
            g.x = nx;
            g.y = ny;
            g.h = Math.atan2(dy, dx);
          }
          break;
        }
        case 'startled':
          g.t -= dt;
          if (g.t <= 0) {
            g.state = 'faint';
            g.t = TIP_T + FAINT_T + RISE_T;
            fell++;
            // Going over, it startles whoever is standing right by it.
            for (const o of this.goats)
              if (o !== g && standing(o) && Math.hypot(o.x - g.x, o.y - g.y) < CHAIN_R)
                scare(o, CHAIN_DELAY);
          }
          break;
        case 'faint': {
          g.t -= dt;
          const gone = TIP_T + FAINT_T + RISE_T - g.t;
          g.k = gone < TIP_T ? gone / TIP_T : g.t > RISE_T ? 1 : Math.max(0, g.t / RISE_T);
          if (g.t <= 0) {
            g.state = 'graze';
            g.k = 0;
            g.t = 1 + this.rand() * 3;
            g.calm = CALM_T;
          }
          break;
        }
      }
    }
    return fell;
  }

  /** Pick somewhere on its meadow, on dry land, to amble to. */
  private wander(g: Goat): void {
    for (let i = 0; i < 6; i++) {
      const a = this.rand() * Math.PI * 2;
      const d = Math.sqrt(this.rand()) * g.hr;
      const tx = g.hx + Math.cos(a) * d;
      const ty = g.hy + Math.sin(a) * d;
      if (this.land(tx, ty)) {
        g.state = 'walk';
        g.tx = tx;
        g.ty = ty;
        return;
      }
    }
    g.t = 1 + this.rand() * 2;
  }
}

/** On its feet, and calm enough to be startled. */
function standing(g: Goat): boolean {
  return (g.state === 'graze' || g.state === 'walk') && g.calm <= 0;
}

/** Startled: it freezes, and goes over in a moment. */
function scare(g: Goat, after: number): void {
  g.state = 'startled';
  g.t = after;
}
