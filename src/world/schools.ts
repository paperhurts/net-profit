/**
 * The schools: where the fish are, how they mill about, and the sweep that
 * catches them. Moved verbatim from the prototype script; tests hold both
 * the builder and the sweep to the prototype bit for bit. The rings come
 * from data/tuning.ts, which the field guide reads too. The game keeps what
 * a catch means (the hold, the log, the cue) as a callback, and the drawing
 * until render/fish.ts.
 */
import { clamp, rng } from '../core/math';
import { RINGS } from '../data/tuning';
import { IX, IY, WS } from './island';

export type Fish = {
  /** Offset from the school's centre before the school's slow spin. */
  ox: number;
  oy: number;
  /** Wobble phase, rate and reach. */
  ph: number;
  w: number;
  a: number;
  alive: boolean;
  /** 0..1 as a returning fish fades back in; only a grown fish can be caught. */
  grow: number;
  /** Game time at which a caught fish returns. */
  resp: number;
  x: number;
  y: number;
  /** Screen-space heading for the renderer. */
  ang: number;
};

export type School = {
  /** The anchor the centre drifts around. */
  ax: number;
  ay: number;
  cx: number;
  cy: number;
  r: number;
  /** Species index. */
  sp: number;
  /** Fish in the school, and how many are in the water now. */
  n: number;
  alive: number;
  /** Drift phases and spin rate. */
  p: number;
  q: number;
  spin: number;
  fish: Fish[];
  /** Rises only at night. */
  night: boolean;
  /** On screen this frame; the renderer and the indicators read it. */
  vis: boolean;
};

/** The seed the world is built from, so every player fishes the same water. */
export const SCHOOL_SEED = 11;

export function createSchools(R: () => number = rng(SCHOOL_SEED)): School[] {
  const schools: School[] = [];
  for (const ring of RINGS) {
    const { n, r0, r1, sp, count, rad, base } = ring;
    for (let i = 0; i < n; i++) {
      const ang = base + i * ((Math.PI * 2) / n) + (i ? (R() - 0.5) * 0.5 : 0);
      const r = r0 + R() * (r1 - r0);
      const sc: School = {
        ax: clamp(IX + Math.cos(ang) * r, 220, WS - 220),
        ay: clamp(IY + Math.sin(ang) * r, 220, WS - 220),
        cx: 0,
        cy: 0,
        r: rad,
        sp,
        n: count,
        alive: count,
        p: R() * 9,
        q: R() * 9,
        spin: (R() < 0.5 ? -1 : 1) * (0.05 + R() * 0.05),
        fish: [],
        night: !!ring.night,
        vis: false,
      };
      sc.cx = sc.ax;
      sc.cy = sc.ay;
      for (let j = 0; j < count; j++) {
        const a = R() * Math.PI * 2;
        const d = Math.sqrt(R()) * rad;
        sc.fish.push({
          ox: Math.cos(a) * d,
          oy: Math.sin(a) * d,
          ph: R() * 9,
          w: 0.8 + R() * 0.9,
          a: 9 + R() * 14,
          alive: true,
          grow: 1,
          resp: 0,
          x: sc.ax,
          y: sc.ay,
          ang: 0,
        });
      }
      schools.push(sc);
    }
  }
  return schools;
}

/** What one frame of the sweep needs to know. */
export type Sweep = {
  /** Game seconds, and this frame's share of them. */
  T: number;
  dt: number;
  /** Night strength, 0..1. */
  dark: number;
  net: { x: number; y: number };
  netWidth: number;
  /** The net can take fish right now: under way, moving, whole, and not full of jellyfish. */
  catching: boolean;
  zoom: number;
  onScreen(x: number, y: number, margin: number): boolean;
  /** Room in the hold; asked per fish, because each catch changes the answer. */
  hasRoom(): boolean;
};

/**
 * Drift every school, bring caught fish back when their time comes, move the
 * fish of schools that are on screen or near the net, and hand any grown fish
 * inside the net's reach to onCatch. Night schools are gone by day, and cannot
 * be caught until it is properly dark.
 */
export function updateSchools(
  schools: readonly School[],
  s: Sweep,
  onCatch: (f: Fish, sc: School) => void,
): void {
  const { T, dt, dark, net } = s;
  const nw = s.netWidth;
  const rr = (nw * 0.5 + 5) * (nw * 0.5 + 5);
  for (const sc of schools) {
    sc.cx = sc.ax + Math.sin(T * 0.05 + sc.p) * 60;
    sc.cy = sc.ay + Math.cos(T * 0.04 + sc.q) * 60;
    if (sc.night && dark < 0.5) {
      sc.vis = false;
      continue;
    }
    const near = Math.hypot(net.x - sc.cx, net.y - sc.cy) < sc.r + nw + 80;
    sc.vis = s.onScreen(sc.cx, sc.cy, (sc.r + 80) * s.zoom);
    const rot = T * sc.spin;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    for (const f of sc.fish) {
      if (!f.alive) {
        if (T >= f.resp) {
          f.alive = true;
          f.grow = 0;
          sc.alive++;
        } else continue;
      }
      if (!near && !sc.vis) continue;
      if (f.grow < 1) f.grow = Math.min(1, f.grow + dt * 1.3);
      const hx = f.ox * cr - f.oy * sr;
      const hy = f.ox * sr + f.oy * cr;
      const x = sc.cx + hx + Math.cos(f.ph + T * f.w) * f.a;
      const y = sc.cy + hy + Math.sin(f.ph * 1.7 + T * f.w * 1.3) * f.a * 0.7;
      const dx = x - f.x;
      const dy = y - f.y;
      if (dx * dx + dy * dy > 0.0004 && dx * dx + dy * dy < 400) {
        f.ang = Math.atan2((dx + dy) * 0.5, dx - dy);
      }
      f.x = x;
      f.y = y;
      if (s.catching && near && f.grow >= 1 && s.hasRoom() && !(sc.night && dark < 0.75)) {
        const ex = x - net.x;
        const ey = y - net.y;
        if (ex * ex + ey * ey < rr) onCatch(f, sc);
      }
    }
  }
}

/** Every fish back in the water, as when the game starts over. */
export function resetSchools(schools: readonly School[]): void {
  for (const sc of schools) {
    sc.alive = sc.n;
    for (const f of sc.fish) {
      f.alive = true;
      f.grow = 1;
    }
  }
}
