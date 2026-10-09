/**
 * The sea map, the kid's: the whole sea at once, turned the way the game is so
 * that up on the map is up on the screen, but square rather than squashed so a
 * phone held upright has room for it. The sea you know, the deep and the far
 * deep in their blues with their buoys; each island where it is; fog over
 * everywhere the boat has not sailed, soft at its edges; and the boat, pointing
 * the way it is going. Islands are named once they have been found.
 */

import {
  cellMiddle,
  isSailed,
  SAILED_CELL,
  SAILED_N,
  type Sailed,
  SEA_MIN,
  SEA_SPAN,
} from '../state/sailed';
import { DEEP, IX, IY, WS } from '../world/island';

export type MapIsle = {
  x: number;
  y: number;
  r: number;
  /** Its name on the map, once found; null before. */
  name: string | null;
  /** Its sand and what grows or stands on it. */
  sand: string;
  top: string;
};

export type MapView = {
  sailed: Sailed;
  boat: { x: number; y: number; h: number };
  isles: readonly MapIsle[];
  /** Seconds, for the boat's pulse. */
  T: number;
};

const SEA = { far: '#0E3B4B', deep: '#17596B', home: '#2C8EA1', fog: '#1A3440' };

/** World to map: a quarter turn of the iso view's diamond, unsquashed. */
export class Projection {
  readonly s: number;
  constructor(
    readonly cx: number,
    readonly cy: number,
    size: number,
  ) {
    this.s = size / (2 * SEA_SPAN);
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

export class SeaMap {
  private fog: HTMLCanvasElement | null = null;
  private fogKey = '';

  /** Draw it all into a canvas of w by h device pixels. */
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, v: MapView): void {
    const size = Math.min(w, h) * 0.96;
    const p = new Projection(w / 2, h / 2, size);
    ctx.clearRect(0, 0, w, h);
    // The three waters, and the buoys between them.
    const far = SEA_MIN + SEA_SPAN;
    ctx.fillStyle = SEA.far;
    square(ctx, p, SEA_MIN, SEA_MIN, far, far);
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
    ctx.strokeStyle = '#8A2A30';
    square(ctx, p, -DEEP, -DEEP, WS + DEEP, WS + DEEP);
    ctx.stroke();
    ctx.strokeStyle = '#E4572E';
    square(ctx, p, 0, 0, WS, WS);
    ctx.stroke();
    ctx.setLineDash([]);
    // The islands.
    for (const isle of v.isles) {
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
    // Fog over all of it the boat has not seen.
    ctx.drawImage(this.fogFor(v.sailed, w, h, p), 0, 0);
    // Names, over the fog, for the islands found.
    ctx.font = `800 ${Math.round(11 * k)}px Grandstander, ui-rounded, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    for (const isle of v.isles) {
      if (!isle.name) continue;
      const x = p.x(isle.x, isle.y);
      const y = p.y(isle.x, isle.y) + Math.max(3 * k, isle.r * p.s * Math.SQRT2) + 3 * k;
      ctx.lineWidth = 3 * k;
      ctx.strokeStyle = 'rgba(8,24,32,.85)';
      ctx.strokeText(isle.name, x, y);
      ctx.fillStyle = '#FFF6E5';
      ctx.fillText(isle.name, x, y);
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
  private fogFor(s: Sailed, w: number, h: number, p: Projection): HTMLCanvasElement {
    let n = 0;
    for (const b of s) n = (n * 31 + b) | 0;
    const key = `${w}x${h}:${n}`;
    if (this.fog && this.fogKey === key) return this.fog;
    const c = this.fog ?? document.createElement('canvas');
    c.width = w;
    c.height = h;
    const f = c.getContext('2d') as CanvasRenderingContext2D;
    f.clearRect(0, 0, w, h);
    f.fillStyle = SEA.fog;
    const far = SEA_MIN + SEA_SPAN;
    square(f, p, SEA_MIN, SEA_MIN, far, far);
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
