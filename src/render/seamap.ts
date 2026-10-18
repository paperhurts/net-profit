/**
 * The sea map, the kid's: the whole sea at once, turned the way the game is so
 * that up on the map is up on the screen, but square rather than squashed so a
 * phone held upright has room for it. The sea you know, the deep and the far
 * deep in their blues with their buoys; each island where it is; fog over
 * everywhere the boat has not sailed, soft at its edges; and the boat, pointing
 * the way it is going. Islands are named once they have been found. Places to
 * go back to that are not islands, the trench to dive, are marked over the fog
 * with their names, so they can be found again. Once your headquarters' tower is
 * built, every fish school in the sea is on it too, in its own colour, under the
 * fog like the rest.
 */

import { SPECIES } from '../data/tuning';
import {
  cellMiddle,
  isSailed,
  SAILED_CELL,
  SAILED_N,
  type Sailed,
  SEA_SPAN,
} from '../state/sailed';
import { DEEP, FAR, FARFAR, IX, IY, WS } from '../world/island';
import type { School } from '../world/schools';

export type MapIsle = {
  x: number;
  y: number;
  r: number;
  /** Its name on the map, once found; null before. */
  name: string | null;
  /** Its sand and what grows or stands on it. */
  sand: string;
  top: string;
  /** Its name goes over it, not under, where another island's name is under its neighbour. */
  nameAbove?: boolean;
};

/** A place to go back to that is not an island: where, its name on the map, and whether it is your castle's landing
 * (a little castle) or the kid's metal bridge (a little building on legs) rather than a place to dive (a ring of
 * bubbles). */
export type MapMark = { x: number; y: number; name: string; castle?: boolean; bridge?: boolean };

/** A fish school, as your tower shows it: where, its fish's colour, and how full it is, 0 to 1. */
export type MapFish = { x: number; y: number; c: string; full: number };

export type MapView = {
  sailed: Sailed;
  boat: { x: number; y: number; h: number };
  isles: readonly MapIsle[];
  /** Marked over the fog, with their names. */
  marks?: readonly MapMark[];
  /** Every leviathan, live, once Gigantis's observatory is yours. */
  beasts?: readonly MapMark[];
  /** Every fish school, once your headquarters' tower is built. */
  fish?: readonly MapFish[];
  /** Seconds, for the boat's pulse. */
  T: number;
  /**
   * The far far sea is open: the map shows it, out past the far far buoys. Until then it shows the sea out to the far
   * deep's edge, as it always has, so the islands are as big on it as they were.
   */
  farFar?: boolean;
};

const SEA = {
  farFar: '#0A3242',
  far: '#0E3B4B',
  deep: '#17596B',
  home: '#2C8EA1',
  fog: '#1A3440',
};

/** How far past the buoys the map runs, with the far far sea or without. */
export function mapReach(farFar: boolean): number {
  return DEEP + FAR + (farFar ? FARFAR : 0);
}

/** World to map: a quarter turn of the iso view's diamond, unsquashed. */
export class Projection {
  readonly s: number;
  constructor(
    readonly cx: number,
    readonly cy: number,
    size: number,
    span: number = SEA_SPAN,
  ) {
    this.s = size / (2 * span);
  }
  x(x: number, y: number): number {
    return this.cx + (x - IX - (y - IY)) * this.s;
  }
  y(x: number, y: number): number {
    return this.cy + (x - IX + (y - IY)) * this.s;
  }
}

/** A square of the sea, x0..x1 by y0..y1, as the diamond it is on the map. */
function square(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  ctx.beginPath();
  ctx.moveTo(p.x(x0, y0), p.y(x0, y0));
  ctx.lineTo(p.x(x1, y0), p.y(x1, y0));
  ctx.lineTo(p.x(x1, y1), p.y(x1, y1));
  ctx.lineTo(p.x(x0, y1), p.y(x0, y1));
  ctx.closePath();
}

/** A leviathan, as the observatory spots it: a red eye in a pulsing ring, and its name under it. */
export function drawMapBeast(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  k: number,
  name: string,
  T: number,
  above = false,
): void {
  const pulse = (T * 0.9) % 1;
  ctx.strokeStyle = `rgba(255,110,80,${0.75 * (1 - pulse)})`;
  ctx.lineWidth = 2 * k;
  ctx.beginPath();
  ctx.arc(x, y, (6 + pulse * 9) * k, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#3A0E0A';
  ctx.strokeStyle = '#FF8A6A';
  ctx.beginPath();
  ctx.arc(x, y, 5.5 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFD27A';
  ctx.beginPath();
  ctx.ellipse(x, y, 3 * k, 1.8 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1A0604';
  ctx.beginPath();
  ctx.ellipse(x, y, 0.9 * k, 1.6 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `800 ${Math.round(9 * k)}px Grandstander, ui-rounded, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = above ? 'bottom' : 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * k;
  ctx.strokeStyle = 'rgba(8,24,32,.85)';
  const ty = above ? y - 8 * k : y + 8 * k;
  ctx.strokeText(name, x, ty);
  ctx.fillStyle = '#FFB3A0';
  ctx.fillText(name, x, ty);
}

/** A dive mark: dark water in a pale ring with bubbles coming up out of it, and its name under it. */
export function drawMapMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  k: number,
  name: string,
): void {
  ctx.fillStyle = '#071A22';
  ctx.strokeStyle = '#9FE3F0';
  ctx.lineWidth = 2 * k;
  ctx.beginPath();
  ctx.arc(x, y, 6 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#CFF4FA';
  for (const [dx, dy, r] of [
    [2, -9, 1.8],
    [5, -14, 1.4],
    [1, -18, 1.1],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x + dx * k, y + dy * k, r * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = `800 ${Math.round(10 * k)}px Grandstander, ui-rounded, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * k;
  ctx.strokeStyle = 'rgba(8,24,32,.85)';
  ctx.strokeText(name, x, y + 9 * k);
  ctx.fillStyle = '#9FE3F0';
  ctx.fillText(name, x, y + 9 * k);
}

/** Your castle's landing: a little gold castle, three merlons and a dark gate, and its name over it. */
export function drawMapCastle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  k: number,
  name: string,
): void {
  ctx.fillStyle = '#F2C230';
  ctx.strokeStyle = 'rgba(8,24,32,.85)';
  ctx.lineWidth = 1.4 * k;
  ctx.beginPath();
  ctx.moveTo(x - 7 * k, y + 5 * k);
  ctx.lineTo(x - 7 * k, y - 6 * k);
  for (const [a, b] of [
    [-4.5, -6],
    [-4.5, -3.5],
    [-1.5, -3.5],
    [-1.5, -6],
    [1.5, -6],
    [1.5, -3.5],
    [4.5, -3.5],
    [4.5, -6],
    [7, -6],
  ] as const)
    ctx.lineTo(x + a * k, y + b * k);
  ctx.lineTo(x + 7 * k, y + 5 * k);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2A1A08';
  ctx.beginPath();
  ctx.arc(x, y + 1.5 * k, 2.2 * k, Math.PI, 0);
  ctx.lineTo(x + 2.2 * k, y + 5 * k);
  ctx.lineTo(x - 2.2 * k, y + 5 * k);
  ctx.closePath();
  ctx.fill();
  ctx.font = `800 ${Math.round(10 * k)}px Grandstander, ui-rounded, system-ui, sans-serif`;
  // Its name over it: the island beside it has its own name under it.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * k;
  ctx.strokeStyle = 'rgba(8,24,32,.85)';
  ctx.strokeText(name, x, y - 8 * k);
  ctx.fillStyle = '#F2C230';
  ctx.fillText(name, x, y - 8 * k);
}

/** The metal bridge: a little grey building along the sea's edge, its purple orb on top, and its name over it. */
export function drawMapBridge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  k: number,
  name: string,
): void {
  // The building along the sea's edge, as the edge runs on the map, and its orb on top.
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = 'rgba(8,24,32,.85)';
  ctx.lineWidth = 1.2 * k;
  ctx.fillStyle = '#8B98A1';
  ctx.beginPath();
  ctx.rect(-12 * k, -2.5 * k, 24 * k, 5 * k);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#B57CFF';
  ctx.beginPath();
  ctx.arc(x, y - 4.5 * k, 2.4 * k, 0, Math.PI * 2);
  ctx.fill();
  // Its name over it, out on the tar side: island 11 and the abyss have theirs under them.
  ctx.font = `800 ${Math.round(10 * k)}px Grandstander, ui-rounded, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * k;
  ctx.strokeStyle = 'rgba(8,24,32,.85)';
  ctx.strokeText(name, x, y - 9 * k);
  ctx.fillStyle = '#D5DEE3';
  ctx.fillText(name, x, y - 9 * k);
}

/**
 * The schools your tower sees: those with fish in them now, and the ones that rise only at night only once it is
 * dark enough for them to be up (as the game has it: dark past 0.75).
 */
export function mapFish(schools: readonly School[], dark: number): MapFish[] {
  const out: MapFish[] = [];
  for (const sc of schools) {
    if (sc.alive <= 0 || (sc.night && dark < 0.75)) continue;
    out.push({
      x: sc.cx,
      y: sc.cy,
      c: SPECIES[sc.sp]?.c ?? '#DCEBEE',
      full: sc.n ? sc.alive / sc.n : 0,
    });
  }
  return out;
}

/** A school on the map: one to three little fish in its colour, outlined dark so pale ones show on the sea. */
export function drawMapFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  k: number,
  c: string,
  full: number,
): void {
  const n = 1 + Math.round(Math.max(0, Math.min(1, full)) * 2);
  ctx.fillStyle = c;
  ctx.strokeStyle = 'rgba(8,24,32,.75)';
  ctx.lineWidth = 1 * k;
  for (let i = 0; i < n; i++) {
    const fx = x + ([0, -4, 4][i] ?? 0) * k;
    const fy = y + ([0, 3.5, 3.5][i] ?? 0) * k;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 3 * k, 1.6 * k, 0, 0, Math.PI * 2);
    ctx.moveTo(fx - 2.4 * k, fy);
    ctx.lineTo(fx - 4.6 * k, fy - 1.7 * k);
    ctx.lineTo(fx - 4.6 * k, fy + 1.7 * k);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }
}

export class SeaMap {
  private fog: HTMLCanvasElement | null = null;
  private fogKey = '';

  /** Draw it all into a canvas of w by h device pixels. */
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, v: MapView): void {
    const size = Math.min(w, h) * 0.96;
    const reach = mapReach(!!v.farFar);
    const p = new Projection(w / 2, h / 2, size, WS + 2 * reach);
    ctx.clearRect(0, 0, w, h);
    // The waters, and the buoys between them.
    if (v.farFar) {
      ctx.fillStyle = SEA.farFar;
      square(ctx, p, -reach, -reach, WS + reach, WS + reach);
      ctx.fill();
    }
    ctx.fillStyle = SEA.far;
    square(ctx, p, -DEEP - FAR, -DEEP - FAR, WS + DEEP + FAR, WS + DEEP + FAR);
    ctx.fill();
    ctx.fillStyle = SEA.deep;
    square(ctx, p, -DEEP, -DEEP, WS + DEEP, WS + DEEP);
    ctx.fill();
    ctx.fillStyle = SEA.home;
    square(ctx, p, 0, 0, WS, WS);
    ctx.fill();
    const k = size / 400;
    ctx.setLineDash([3 * k, 4 * k]);
    ctx.lineWidth = 1.6 * k;
    if (v.farFar) {
      ctx.strokeStyle = '#D9D2BE';
      square(ctx, p, -DEEP - FAR, -DEEP - FAR, WS + DEEP + FAR, WS + DEEP + FAR);
      ctx.stroke();
    }
    ctx.strokeStyle = '#8A2A30';
    square(ctx, p, -DEEP, -DEEP, WS + DEEP, WS + DEEP);
    ctx.stroke();
    ctx.strokeStyle = '#E4572E';
    square(ctx, p, 0, 0, WS, WS);
    ctx.stroke();
    ctx.setLineDash([]);
    // The islands, those within the sea shown.
    const shown = (isle: MapIsle) =>
      Math.max(Math.abs(isle.x - WS / 2), Math.abs(isle.y - WS / 2)) < WS / 2 + reach;
    for (const isle of v.isles) {
      if (!shown(isle)) continue;
      const x = p.x(isle.x, isle.y);
      const y = p.y(isle.x, isle.y);
      const r = Math.max(3 * k, isle.r * p.s * Math.SQRT2);
      ctx.fillStyle = isle.sand;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isle.top;
      ctx.beginPath();
      ctx.arc(x, y - r * 0.08, r * 0.66, 0, Math.PI * 2);
      ctx.fill();
    }
    // The fish schools your tower sees, under the fog: the water you have not sailed keeps its fish to itself.
    for (const f of v.fish ?? []) {
      if (Math.max(Math.abs(f.x - WS / 2), Math.abs(f.y - WS / 2)) >= WS / 2 + reach) continue;
      drawMapFish(ctx, p.x(f.x, f.y), p.y(f.x, f.y), k, f.c, f.full);
    }
    // Fog over all of it the boat has not seen.
    ctx.drawImage(this.fogFor(v.sailed, w, h, p, reach), 0, 0);
    // Names, over the fog, for the islands found.
    ctx.font = `800 ${Math.round(11 * k)}px Grandstander, ui-rounded, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    for (const isle of v.isles) {
      if (!isle.name || !shown(isle)) continue;
      const x = p.x(isle.x, isle.y);
      const r = Math.max(3 * k, isle.r * p.s * Math.SQRT2) + 3 * k;
      const y = p.y(isle.x, isle.y) + (isle.nameAbove ? -r - 11 * k : r);
      ctx.lineWidth = 3 * k;
      ctx.strokeStyle = 'rgba(8,24,32,.85)';
      ctx.strokeText(isle.name, x, y);
      ctx.fillStyle = '#FFF6E5';
      ctx.fillText(isle.name, x, y);
    }
    for (const m of v.marks ?? [])
      (m.castle ? drawMapCastle : m.bridge ? drawMapBridge : drawMapMark)(
        ctx,
        p.x(m.x, m.y),
        p.y(m.x, m.y),
        k,
        m.name,
      );
    // Names that would sit on one already placed go over their mark instead.
    const placed: { x: number; y: number }[] = [];
    for (const m of v.beasts ?? []) {
      const x = p.x(m.x, m.y);
      const y = p.y(m.x, m.y);
      const above = placed.some((q) => Math.abs(q.x - x) < 60 * k && Math.abs(q.y - y) < 14 * k);
      drawMapBeast(ctx, x, y, k, m.name, v.T, above);
      placed.push({ x, y: above ? y - 20 * k : y });
    }
    // The boat: a pulse round it and an arrow the way it points.
    const bx = p.x(v.boat.x, v.boat.y);
    const by = p.y(v.boat.x, v.boat.y);
    const pulse = (v.T * 0.8) % 1;
    ctx.strokeStyle = `rgba(255,246,229,${0.8 * (1 - pulse)})`;
    ctx.lineWidth = 2 * k;
    ctx.beginPath();
    ctx.arc(bx, by, (5 + pulse * 12) * k, 0, Math.PI * 2);
    ctx.stroke();
    const dx = Math.cos(v.boat.h) - Math.sin(v.boat.h);
    const dy = Math.cos(v.boat.h) + Math.sin(v.boat.h);
    const dl = Math.hypot(dx, dy) || 1;
    const ux = dx / dl;
    const uy = dy / dl;
    ctx.fillStyle = '#E4572E';
    ctx.strokeStyle = '#FFF6E5';
    ctx.lineWidth = 1.5 * k;
    ctx.beginPath();
    ctx.moveTo(bx + ux * 8 * k, by + uy * 8 * k);
    ctx.lineTo(bx - ux * 5 * k - uy * 5 * k, by - uy * 5 * k + ux * 5 * k);
    ctx.lineTo(bx - ux * 2 * k, by - uy * 2 * k);
    ctx.lineTo(bx - ux * 5 * k + uy * 5 * k, by - uy * 5 * k - ux * 5 * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  /** The fog, drawn once for each new stretch of sea sailed. */
  private fogFor(s: Sailed, w: number, h: number, p: Projection, reach: number): HTMLCanvasElement {
    let n = 0;
    for (const b of s) n = (n * 31 + b) | 0;
    const key = `${w}x${h}:${reach}:${n}`;
    if (this.fog && this.fogKey === key) return this.fog;
    const c = this.fog ?? document.createElement('canvas');
    c.width = w;
    c.height = h;
    const f = c.getContext('2d') as CanvasRenderingContext2D;
    f.clearRect(0, 0, w, h);
    f.fillStyle = SEA.fog;
    square(f, p, -reach, -reach, WS + reach, WS + reach);
    f.fill();
    // Clear a soft round hole at each cell sailed; neighbours overlap into open water.
    f.globalCompositeOperation = 'destination-out';
    const r = SAILED_CELL * p.s * 1.9;
    for (let j = 0; j < SAILED_N; j++) {
      for (let i = 0; i < SAILED_N; i++) {
        if (!isSailed(s, i, j)) continue;
        const [mx, my] = cellMiddle(i, j);
        const x = p.x(mx, my);
        const y = p.y(mx, my);
        const g = f.createRadialGradient(x, y, r * 0.35, x, y, r);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        f.fillStyle = g;
        f.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    f.globalCompositeOperation = 'source-over';
    this.fog = c;
    this.fogKey = key;
    return c;
  }
}
