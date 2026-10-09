/**
 * Lionfish, the kid's: little striped fish with a fan of long spines, in small
 * groups round the outer sea. They do not belong here, which is true of the
 * real ones too (they came to Florida's water from far away, and people there
 * are asked to catch them). Tow the net through a group and their spines cut
 * it: it catches nothing until it is mended, at a dock or with the
 * shipwright's mending kit, and a few fish fall out of it. The group scatters
 * and comes back. They turn up once the shipwright is open, so the kit is
 * there to buy by the time a net is first cut. The entity owns the groups and
 * says when the net is cut; the game cuts it and mends it.
 */
import { clamp } from '../core/math';
import { IX, IY } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

export type Lionfish = {
  /** Its place round the group's spot, and its phase as it hovers. */
  ox: number;
  oy: number;
  ph: number;
  h: number;
  /** Seconds until it is back, once caught; none while it is here. */
  away: number;
};

export type LionGroup = {
  x: number;
  y: number;
  fish: Lionfish[];
  /** Seconds left scattered, after cutting a net. */
  scatter: number;
};

/** Where the groups live: round the outer sea, a cutter's reach from home. */
export const LION_R = 1700;
export const LION_ANGLES = [0.8, 2.0, 3.2, 4.3, 5.4] as const;
/** Fish in a group, and how far round its spot they hover. */
export const GROUP_SIZE = 4;
export const GROUP_R = 46;
/** A moving net this far beyond half its width catches on a lionfish's spines. */
export const SPINE_REACH = 8;
/** Seconds a group stays scattered after cutting a net. */
export const SCATTER = 6;
/** The boat sees a group from this far, the first time. */
export const LION_SIGHT = 380;
/** How long a lionfish is, head to tail. */
export const LION_LEN = 18;
/** Seconds before a caught lionfish's place in its group is taken again. */
export const LION_BACK = 90;

export function lionGroups(): LionGroup[] {
  return LION_ANGLES.map((a, g) => ({
    x: IX + Math.cos(a) * LION_R,
    y: IY + Math.sin(a) * LION_R,
    scatter: 0,
    fish: Array.from({ length: GROUP_SIZE }, (_, i) => {
      const t = (i / GROUP_SIZE) * Math.PI * 2 + g;
      return {
        ox: Math.cos(t) * GROUP_R * 0.6,
        oy: Math.sin(t) * GROUP_R * 0.6,
        ph: i * 1.7 + g,
        h: t + Math.PI / 2,
        away: 0,
      };
    }),
  }));
}

/** Where a lionfish is right now: hovering round its spot, or fled outward while the group is scattered. */
export function lionAt(g: LionGroup, f: Lionfish): [number, number] {
  const out = 1 + (g.scatter / SCATTER) * 3;
  return [
    g.x + f.ox * out + Math.cos(f.ph * 0.5) * 8,
    g.y + f.oy * out + Math.sin(f.ph * 0.43) * 8,
  ];
}

export class Lionfishes implements Entity {
  readonly groups = lionGroups();
  /** Whether they are in the sea yet: the game says, once the shipwright is open. */
  here = false;
  /** The shipwright's lionfish net is fitted: it sweeps them up rather than being cut. */
  sweeps = false;
  private seen = false;
  /** Their spines cut the net here. The game cuts it. */
  onCut: ((x: number, y: number) => void) | null = null;
  /** The boat has come near a group for the first time. */
  onSight: (() => void) | null = null;
  /** The lionfish net has swept one up here. The game pays the bounty. */
  onSweep: ((x: number, y: number) => void) | null = null;

  /** The nearest group to a point, and how far it is. */
  nearest(x: number, y: number): { g: LionGroup; d: number } | null {
    let best: { g: LionGroup; d: number } | null = null;
    for (const g of this.groups) {
      const d = Math.hypot(g.x - x, g.y - y);
      if (!best || d < best.d) best = { g, d };
    }
    return best;
  }

  reset(): void {
    this.seen = false;
    for (const g of this.groups) {
      g.scatter = 0;
      for (const f of g.fish) f.away = 0;
    }
  }

  /** The nearest lionfish to a point within reach, and where it is, or null. */
  nearestFish(
    x: number,
    y: number,
    reach: number,
  ): { g: LionGroup; f: Lionfish; x: number; y: number } | null {
    let best: { g: LionGroup; f: Lionfish; x: number; y: number } | null = null;
    let bd = reach;
    for (const g of this.groups) {
      if (Math.hypot(g.x - x, g.y - y) > reach + GROUP_R * 4) continue;
      for (const f of g.fish) {
        if (f.away > 0) continue;
        const [fx, fy] = lionAt(g, f);
        const d = Math.hypot(fx - x, fy - y);
        if (d < bd) {
          bd = d;
          best = { g, f, x: fx, y: fy };
        }
      }
    }
    return best;
  }

  /** A lionfish caught: gone from its group for a while. */
  take(f: Lionfish): void {
    f.away = LION_BACK;
  }

  update(dt: number, w: World): void {
    if (!this.here) return;
    for (const g of this.groups) {
      g.scatter = Math.max(0, g.scatter - dt);
      for (const f of g.fish) {
        f.ph += dt;
        f.h += Math.sin(f.ph * 0.6) * dt * 0.8;
        f.away = Math.max(0, f.away - dt);
      }
    }
    const b = w.boat;
    if (!this.seen && w.started) {
      const n = this.nearest(b.x, b.y);
      if (n && n.d < LION_SIGHT) {
        this.seen = true;
        this.onSight?.();
      }
    }
    const net = w.net;
    if (!w.started || net.speed <= 22 || net.torn > 0) return;
    const reach = w.netWidth * 0.5 + SPINE_REACH;
    for (const g of this.groups) {
      if (g.scatter > 0 || Math.hypot(net.x - g.x, net.y - g.y) > GROUP_R * 2 + reach) continue;
      for (const f of g.fish) {
        if (f.away > 0) continue;
        const [fx, fy] = lionAt(g, f);
        if (Math.hypot(fx - net.x, fy - net.y) >= reach) continue;
        // The lionfish net's guard turns the spines: it takes the fish instead.
        if (this.sweeps) {
          this.take(f);
          this.onSweep?.(fx, fy);
          continue;
        }
        g.scatter = SCATTER;
        this.onCut?.(fx, fy);
        return;
      }
    }
  }

  draw(v: DrawView, layer: Layer): void {
    if (!this.here || layer !== 'underwater') return;
    const { ctx, px, py } = v;
    const Z = v.zoom;
    for (const g of this.groups) {
      if (!v.onScreen(g.x, g.y, 200)) continue;
      for (const f of g.fish) {
        if (f.away > 0) continue;
        const [x, y] = lionAt(g, f);
        drawLionfish(ctx, px(x, y), py(x, y, -3), f.h, f.ph, Z);
      }
    }
  }
}

/** One lionfish at screen x, y: a striped body, a fan of spiny fins either side, and spines along its back. */
export function drawLionfish(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  h: number,
  ph: number,
  Z: number,
): void {
  // Its heading on screen: the iso view squashes up and down by half.
  const dx = Math.cos(h) - Math.sin(h);
  const dy = (Math.cos(h) + Math.sin(h)) / 2;
  const dl = Math.hypot(dx, dy) || 1;
  const ux = dx / dl;
  const uy = dy / dl;
  const nx = -uy;
  const ny = ux;
  const L = (LION_LEN / 2) * Z;
  const fan = 0.85 + Math.sin(ph * 3) * 0.12;
  ctx.lineCap = 'round';
  // The fins: a fan of long spines either side, with a pale web between.
  for (const s of [-1, 1]) {
    ctx.fillStyle = 'rgba(240,190,170,.35)';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    for (let k = 0; k <= 4; k++) {
      const a = -0.9 + k * 0.45;
      const r = L * 1.5 * fan;
      ctx.lineTo(
        sx + (nx * s * Math.cos(a) - ux * Math.sin(a) * 0.9) * r,
        sy + (ny * s * Math.cos(a) - uy * Math.sin(a) * 0.9) * r,
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,50,40,.85)';
    ctx.lineWidth = 0.7 * Z;
    for (let k = 0; k <= 4; k++) {
      const a = -0.9 + k * 0.45;
      const r = L * 1.6 * fan;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(
        sx + (nx * s * Math.cos(a) - ux * Math.sin(a) * 0.9) * r,
        sy + (ny * s * Math.cos(a) - uy * Math.sin(a) * 0.9) * r,
      );
      ctx.stroke();
    }
  }
  // The body, rust-red, with white stripes across it.
  ctx.fillStyle = '#B9472F';
  ctx.beginPath();
  ctx.ellipse(sx, sy, L, L * 0.42, Math.atan2(uy, ux), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,244,232,.9)';
  ctx.lineWidth = 0.9 * Z;
  for (const t of [-0.5, -0.1, 0.3, 0.65]) {
    const cx = sx + ux * L * t;
    const cy = sy + uy * L * t;
    const w = L * 0.4 * Math.sqrt(1 - t * t);
    ctx.beginPath();
    ctx.moveTo(cx + nx * w, cy + ny * w);
    ctx.lineTo(cx - nx * w, cy - ny * w);
    ctx.stroke();
  }
  // Spines along its back, and its tail.
  ctx.strokeStyle = 'rgba(150,50,40,.9)';
  ctx.lineWidth = 0.6 * Z;
  for (const t of [-0.3, 0, 0.3]) {
    const bx = sx + ux * L * t;
    const by = sy + uy * L * t;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - ux * L * 0.2, by - L * 0.9);
    ctx.stroke();
  }
  ctx.fillStyle = '#C9583E';
  const tx = sx - ux * L;
  const ty = sy - uy * L;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - ux * L * 0.5 + nx * L * 0.35, ty - uy * L * 0.5 + ny * L * 0.35);
  ctx.lineTo(tx - ux * L * 0.5 - nx * L * 0.35, ty - uy * L * 0.5 - ny * L * 0.35);
  ctx.closePath();
  ctx.fill();
  // An eye.
  ctx.fillStyle = '#1E1A18';
  ctx.beginPath();
  ctx.arc(sx + ux * L * 0.7, sy + uy * L * 0.7 - 0.6 * Z, clamp(0.9 * Z, 0.5, 3), 0, Math.PI * 2);
  ctx.fill();
}
