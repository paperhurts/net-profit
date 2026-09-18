/**
 * The sharks, moved verbatim from the prototype script. Two each haunt the
 * schools of the three deepest species, circling 55 units outside the shoal.
 * A net towed at speed within 330 draws a charge: a net of level three or
 * better hauls the shark in if the hold has room, and a lesser net is torn.
 * A dolphin escort keeps them off. The game owns the consequences through
 * callbacks: the warning toast and cue, the shark going into the hold, the
 * tear and the spilled fish.
 */
import type { DrawView, Entity, Layer, World } from './entity';

/** What a shark needs from the school it circles; the school object itself is kept, live. */
export type SharkHome = { cx: number; cy: number; r: number };

/** A school a shark may call home. */
export type SharkSchool = SharkHome & { sp: number; ax: number; ay: number };

export type Shark = {
  home: SharkHome;
  /** Angle around the home school while circling. */
  a: number;
  x: number;
  y: number;
  /** Screen-space heading for the renderer. */
  ang: number;
  state: 'circle' | 'charge';
  /** Seconds into the current charge. */
  t: number;
  /** Seconds before it will charge again. */
  cool: number;
  alive: boolean;
  /** Game time at which a caught shark returns to its school. */
  resp: number;
};

/** How many sharks the schools of each species get. */
export const SHARK_HOMES: Record<number, number> = { 4: 2, 5: 2, 6: 2 };
/** A moving net this close to a rested shark starts a charge. */
export const CHARGE_RADIUS = 330;
/** A charge is abandoned beyond this distance from the net, or after CHARGE_SECONDS. */
export const CHARGE_BREAK = 560;
export const CHARGE_SECONDS = 7;
/** A net of this level or better holds a shark instead of tearing. */
export const SHARK_NET_LEVEL = 3;
/** A caught shark comes back after this long. */
export const RESPAWN_SECONDS = 45;
/** At most one warning this often, however many sharks charge. */
export const WARN_EVERY = 9;

export function createSharks(schools: SharkSchool[], rng: () => number = Math.random): Shark[] {
  const cnt: Record<number, number> = {};
  const sharks: Shark[] = [];
  for (const sc of schools) {
    const have = cnt[sc.sp] ?? 0;
    if (have < (SHARK_HOMES[sc.sp] ?? 0)) {
      cnt[sc.sp] = have + 1;
      sharks.push({
        home: sc,
        a: rng() * 6.28,
        x: sc.ax,
        y: sc.ay,
        ang: 0,
        state: 'circle',
        t: 0,
        cool: 0,
        alive: true,
        resp: 0,
      });
    }
  }
  return sharks;
}

export class Sharks implements Entity {
  readonly sharks: Shark[];
  /** Seconds until the next warning may go out; one throttle for all sharks. */
  warnT = 0;
  /** A shark has begun a charge and no warning has gone out lately. The game toasts and plays the cue. */
  onWarn: (() => void) | null = null;
  /** A strong enough net has closed on a shark with room in the hold. The game hauls it in. */
  onCatch: ((sh: Shark) => void) | null = null;
  /** A lesser net has met a shark. The game tears the net and spills fish. */
  onTear: ((sh: Shark) => void) | null = null;

  constructor(schools: SharkSchool[], rng: () => number = Math.random) {
    this.sharks = createSharks(schools, rng);
  }

  /** Everyone back to circling, as when the game starts over. */
  reset(): void {
    for (const sh of this.sharks) {
      sh.alive = true;
      sh.state = 'circle';
      sh.cool = 0;
    }
  }

  update(dt: number, w: World): void {
    const net = w.net;
    this.warnT -= dt;
    for (const sh of this.sharks) {
      if (!sh.alive) {
        if (w.T >= sh.resp) {
          sh.alive = true;
          sh.state = 'circle';
          sh.cool = 4;
          sh.x = sh.home.cx;
          sh.y = sh.home.cy;
        }
        continue;
      }
      sh.cool -= dt;
      const dn = Math.hypot(net.x - sh.x, net.y - sh.y);
      let tx: number;
      let ty: number;
      let sp: number;
      if (sh.state === 'circle') {
        sh.a += dt * 0.5;
        tx = sh.home.cx + Math.cos(sh.a) * (sh.home.r + 55);
        ty = sh.home.cy + Math.sin(sh.a) * (sh.home.r + 55);
        sp = 95;
        if (
          w.started &&
          !w.docked &&
          !w.escorted &&
          sh.cool <= 0 &&
          net.torn <= 0 &&
          net.speed > 22 &&
          dn < CHARGE_RADIUS
        ) {
          sh.state = 'charge';
          sh.t = 0;
          if (this.warnT <= 0) {
            this.warnT = WARN_EVERY;
            this.onWarn?.();
          }
        }
      } else {
        sh.t += dt;
        tx = net.x;
        ty = net.y;
        sp = 235;
        if (dn < w.netWidth * 0.5 + 12) {
          if (w.netLevel >= SHARK_NET_LEVEL && w.holdTotal < w.holdCap) {
            this.onCatch?.(sh);
            sh.alive = false;
            sh.resp = w.T + RESPAWN_SECONDS;
            continue;
          } else if (w.netLevel >= SHARK_NET_LEVEL) {
            sh.state = 'circle';
            sh.cool = 8;
          } else {
            this.onTear?.(sh);
            sh.state = 'circle';
            sh.cool = 14;
          }
        } else if (
          dn > CHARGE_BREAK ||
          sh.t > CHARGE_SECONDS ||
          w.docked ||
          w.escorted ||
          net.torn > 0
        ) {
          sh.state = 'circle';
          sh.cool = 6;
        }
      }
      const dx = tx - sh.x;
      const dy = ty - sh.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        const st = Math.min(d, sp * dt);
        sh.x += (dx / d) * st;
        sh.y += (dy / d) * st;
        sh.ang = Math.atan2((dx + dy) * 0.5, dx - dy);
      }
    }
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'surface') return;
    const { ctx, px, py } = v;
    const Z = v.zoom;
    for (const sh of this.sharks) {
      if (!sh.alive || !v.onScreen(sh.x, sh.y, 60)) continue;
      const x = px(sh.x, sh.y);
      const y = py(sh.x, sh.y);
      const len = 30 * Z;
      const ca = Math.cos(sh.ang);
      const sa = Math.sin(sh.ang);
      const hot = sh.state === 'charge';
      ctx.fillStyle = 'rgba(24,44,62,.72)';
      ctx.beginPath();
      ctx.ellipse(x, y, len, len * 0.3, sh.ang, 0, Math.PI * 2);
      ctx.fill();
      const tx = x - ca * len * 0.9;
      const ty = y - sa * len * 0.9;
      const ta = sh.ang + Math.sin(v.T * (hot ? 12 : 5)) * 0.4;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - Math.cos(ta - 0.7) * len * 0.6, ty - Math.sin(ta - 0.7) * len * 0.6);
      ctx.lineTo(tx - Math.cos(ta + 0.7) * len * 0.6, ty - Math.sin(ta + 0.7) * len * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = v.foam;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.5 * Z;
      ctx.beginPath();
      ctx.ellipse(x, y, 11 * Z, 4.5 * Z, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = hot ? '#D2493A' : '#5F7080';
      ctx.beginPath();
      ctx.moveTo(x + ca * 7 * Z, y + sa * 7 * Z);
      ctx.lineTo(x - ca * 5 * Z, y - sa * 5 * Z - 18 * Z);
      ctx.lineTo(x - ca * 9 * Z, y - sa * 9 * Z);
      ctx.closePath();
      ctx.fill();
    }
  }
}
