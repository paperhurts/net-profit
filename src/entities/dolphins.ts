/**
 * Two dolphin pods, moved verbatim from the prototype script as the first
 * entity on the contract. They roam between waypoints; pass one at speed and
 * it escorts the boat for up to thirty seconds, during which sharks keep
 * their distance. Three dolphins per pod porpoise in turn.
 */
import { angDiff, clamp } from '../core/math';
import { around, BEACH, IR, IX, IY, PIER_BUMPS, pushOut, WS } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

export type Dolphin = { ox: number; oy: number; p: number };

export type Pod = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  h: number;
  /** Unused by the pod itself; pushOut expects a body with speed. */
  v: number;
  state: 'roam' | 'escort';
  t: number;
  cool: number;
  side: number;
  d: Dolphin[];
};

/** Within this distance of the boat, an escorting pod keeps sharks off. */
export const ESCORT_RADIUS = 280;
/** A roaming pod this close to a boat moving faster than 60 joins it. */
export const JOIN_RADIUS = 400;
/** An escort lasts this long, or until the dock, or until the boat gets this far away. */
export const ESCORT_SECONDS = 30;
export const ESCORT_BREAK = 800;
/** Rest between escorts. */
export const ESCORT_COOLDOWN = 35;

export function createPods(): Pod[] {
  return [0, 1].map((i) => ({
    x: IX + (i ? -1 : 1) * 900,
    y: IY + (i ? 700 : -800),
    tx: IX,
    ty: IY,
    h: 0,
    v: 0,
    state: 'roam',
    t: 0,
    cool: 0,
    side: 1,
    d: [
      { ox: 0, oy: 0, p: 0 },
      { ox: -30, oy: 26, p: 2.1 },
      { ox: -36, oy: -24, p: 4.2 },
    ],
  }));
}

/** A fresh roaming target 700 to 2,300 units from the island, inside the world. */
export function podWaypoint(p: Pod, rng: () => number): void {
  const a = rng() * 6.28;
  const r = 700 + rng() * 1600;
  p.tx = clamp(IX + Math.cos(a) * r, 200, WS - 200);
  p.ty = clamp(IY + Math.sin(a) * r, 200, WS - 200);
}

export class Dolphins implements Entity {
  readonly pods: Pod[];
  /** True while some pod is escorting within ESCORT_RADIUS; sharks read it. */
  escorted = false;
  /** Called the moment a pod begins an escort. The game toasts and whistles. */
  onEscort: ((pod: Pod) => void) | null = null;

  constructor(rng: () => number) {
    this.pods = createPods();
    for (const p of this.pods) podWaypoint(p, rng);
  }

  update(dt: number, w: World): void {
    const boat = w.boat;
    const c = Math.cos(boat.h);
    const sn = Math.sin(boat.h);
    this.escorted = false;
    for (const p of this.pods) {
      p.cool -= dt;
      const db = Math.hypot(p.x - boat.x, p.y - boat.y);
      let tx: number;
      let ty: number;
      let sp: number;
      if (p.state === 'roam') {
        if (Math.hypot(p.tx - p.x, p.ty - p.y) < 100) podWaypoint(p, w.rng);
        tx = p.tx;
        ty = p.ty;
        sp = 120;
        if (w.started && !w.docked && p.cool <= 0 && db < JOIN_RADIUS && boat.v > 60) {
          p.state = 'escort';
          p.t = 0;
          p.side = w.rng() < 0.5 ? -1 : 1;
          this.onEscort?.(p);
        }
      } else {
        p.t += dt;
        tx = boat.x + c * 45 - sn * p.side * 75;
        ty = boat.y + sn * 45 + c * p.side * 75;
        sp = Math.max(150, boat.v * 1.15 + 50);
        if (db < ESCORT_RADIUS) this.escorted = true;
        if (p.t > ESCORT_SECONDS || w.docked || db > ESCORT_BREAK) {
          p.state = 'roam';
          p.cool = ESCORT_COOLDOWN;
          podWaypoint(p, w.rng);
        }
      }
      const ar = around(p.x, p.y, tx, ty, IR + 110);
      tx = ar[0];
      ty = ar[1];
      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        const st = Math.min(d, sp * dt);
        p.x += (dx / d) * st;
        p.y += (dy / d) * st;
        p.h += angDiff(Math.atan2(dy, dx), p.h) * Math.min(1, dt * 3);
      } else p.h += angDiff(boat.h, p.h) * Math.min(1, dt * 3);
      pushOut(p, IX, IY, IR + 95);
      pushOut(p, BEACH.x, BEACH.y, BEACH.r + 40);
      for (const b of PIER_BUMPS) pushOut(p, b[0], b[1], 85);
      for (const q of p.d) q.p += dt * (p.state === 'escort' ? 3.2 : 2.2);
    }
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'surface') return;
    const { ctx, px, py } = v;
    const Z = v.zoom;
    for (const p of this.pods) {
      if (!v.onScreen(p.x, p.y, 140)) continue;
      const c = Math.cos(p.h);
      const sn = Math.sin(p.h);
      const ang = Math.atan2((c + sn) * 0.5, c - sn);
      const dirS = Math.cos(ang) >= 0 ? 1 : -1;
      for (const q of p.d) {
        const wx = p.x + q.ox * c - q.oy * sn;
        const wy = p.y + q.ox * sn + q.oy * c;
        const sp = Math.sin(q.p);
        const up = sp > 0.3;
        const z = up ? ((sp - 0.3) / 0.7) * 26 : 0;
        const x = px(wx, wy);
        const y0 = py(wx, wy);
        const y = y0 - z * Z;
        const a = ang - (up ? Math.cos(q.p) * 0.65 * dirS : 0);
        const len = 23 * Z;
        if (up && z < 8) {
          ctx.strokeStyle = v.foam;
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = 2 * Z;
          ctx.beginPath();
          ctx.ellipse(x, y0, (10 + (8 - z)) * Z, (4.5 + (8 - z) * 0.4) * Z, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = up ? 1 : 0.42;
        ctx.fillStyle = up ? '#6E8FA8' : '#23465A';
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        ctx.beginPath();
        ctx.ellipse(x, y, len, len * 0.3, a, 0, Math.PI * 2);
        ctx.fill();
        const tx = x - ca * len * 0.9;
        const ty = y - sa * len * 0.9;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - Math.cos(a - 0.8) * len * 0.5, ty - Math.sin(a - 0.8) * len * 0.5);
        ctx.lineTo(tx - Math.cos(a + 0.8) * len * 0.5, ty - Math.sin(a + 0.8) * len * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + ca * 3 * Z, y + sa * 3 * Z - len * 0.25);
        ctx.lineTo(x - ca * 6 * Z, y - sa * 6 * Z - len * 0.75);
        ctx.lineTo(x - ca * 7 * Z, y - sa * 7 * Z - len * 0.2);
        ctx.closePath();
        ctx.fill();
        if (up) {
          ctx.fillStyle = '#C5D6E2';
          ctx.beginPath();
          ctx.ellipse(
            x + ca * 2 * Z,
            y + sa * 2 * Z + len * 0.1,
            len * 0.6,
            len * 0.12,
            a,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  }
}
