/**
 * The fog sea's own map, for the map button while out in it (the owner, 2026-11-09: in the fog sea the sea map drew the
 * boat out in the black past the sea's edge, "the GPS vs location"). The fog sea is a pocket of the world far west of
 * everything else (world/fogsea.ts), so it gets a map of its own as the tar ocean does: the fog sea, turned the way the
 * game is as the sea map is, grey from side to side, for it is all fog; the wall of fog at its east end, the way back
 * out past the white buoys; Tomb Island in its middle once it has been sighted, and not before (the kid's "MORE fog");
 * and the boat.
 */

import { FOG_EXIT, FOG_SEA } from '../world/fogsea';
import { DOCK16, fromTomb, JETTY16, MAZE_R, shoreR16, TOMB_ISLE } from '../world/tombisle';
import { drawMapBoat, labelX } from './seamap';

export type FogMapView = {
  boat: { x: number; y: number; h: number };
  /** Tomb Island sighted: drawn and named. */
  seen: boolean;
  /** Seconds, for the boat's pulse and the fog's drift. */
  T: number;
};

/** The fog sea's longer side: the map's scale is set by it, so the whole of it fits. */
const SPAN = Math.max(FOG_SEA.x1 - FOG_SEA.x0, FOG_SEA.y1 - FOG_SEA.y0);

/** World to map, about the fog sea's middle: a quarter turn of the iso view's diamond, unsquashed, as the tar map. */
export class FogProjection {
  readonly s: number;
  private readonly mx = (FOG_SEA.x0 + FOG_SEA.x1) / 2;
  private readonly my = (FOG_SEA.y0 + FOG_SEA.y1) / 2;
  constructor(
    readonly cx: number,
    readonly cy: number,
    size: number,
  ) {
    this.s = size / (2 * SPAN);
  }
  x(x: number, y: number): number {
    return this.cx + (x - this.mx - (y - this.my)) * this.s;
  }
  y(x: number, y: number): number {
    return this.cy + (x - this.mx + (y - this.my)) * this.s;
  }
}

/** Where the fog's soft drifts sit, in the fog sea's own 0..1 square: fixed, so the map is the same every time. */
const DRIFTS: readonly [number, number, number][] = Array.from({ length: 44 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.678;
  return [a - Math.floor(a), b - Math.floor(b), 0.03 + 0.01 * ((i * 7) % 5)];
});

/** Draw it all into a canvas of w by h device pixels. */
export function drawFogMap(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  v: FogMapView,
): void {
  const size = Math.min(w, h) * 0.96;
  const p = new FogProjection(w / 2, h / 2, size);
  const k = size / 400;
  ctx.clearRect(0, 0, w, h);
  // The fog sea, edge to edge: grey water under grey fog, its edges fog for ever.
  const { x0, y0, x1, y1 } = FOG_SEA;
  const corners: [number, number][] = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  ctx.fillStyle = '#4F5B5E';
  ctx.strokeStyle = '#8C9698';
  ctx.lineWidth = 1.5 * k;
  ctx.beginPath();
  corners.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(p.x(x, y), p.y(x, y));
    else ctx.lineTo(p.x(x, y), p.y(x, y));
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Soft drifts of fog over it, slowly breathing.
  ctx.save();
  ctx.clip();
  for (const [i, [u, vv, r]] of DRIFTS.entries()) {
    const x = x0 + u * (x1 - x0);
    const y = y0 + vv * (y1 - y0);
    const breathe = 1 + 0.08 * Math.sin(v.T * 0.4 + i);
    ctx.fillStyle = 'rgba(214,220,221,.12)';
    ctx.beginPath();
    ctx.arc(p.x(x, y), p.y(x, y), r * size * breathe, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Tomb Island, once sighted: its grey sand in its own shape, the maze's dark stone, the castle in the middle and the
  // jetty out toward its dock.
  const ix = p.x(TOMB_ISLE.x, TOMB_ISLE.y);
  const iy = p.y(TOMB_ISLE.x, TOMB_ISLE.y);
  let below = iy;
  if (v.seen) {
    ctx.fillStyle = '#A59E8C';
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const r = shoreR16(a);
      const [x, y] = fromTomb(r * Math.cos(a), r * Math.sin(a));
      if (i === 0) ctx.moveTo(p.x(x, y), p.y(x, y));
      else ctx.lineTo(p.x(x, y), p.y(x, y));
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5E5B57';
    ctx.beginPath();
    ctx.arc(ix, iy, MAZE_R * p.s * Math.SQRT2, 0, Math.PI * 2);
    ctx.fill();
    const c = 4 * k;
    ctx.fillStyle = '#2C383D';
    ctx.fillRect(ix - c, iy - c, 2 * c, 2 * c);
    ctx.fillStyle = '#B6F5CB';
    ctx.fillRect(ix - c * 0.3, iy - c * 0.5, c * 0.6, c * 0.6);
    const [jx0, jy0] = fromTomb(0, JETTY16.v0);
    const [jx1, jy1] = fromTomb(0, JETTY16.v1);
    ctx.strokeStyle = '#7A5230';
    ctx.lineWidth = 2.2 * k;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x(jx0, jy0), p.y(jx0, jy0));
    ctx.lineTo(p.x(jx1, jy1), p.y(jx1, jy1));
    ctx.stroke();
    let lowest = iy;
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const r = shoreR16(a);
      const [x, y] = fromTomb(r * Math.cos(a), r * Math.sin(a));
      lowest = Math.max(lowest, p.y(x, y));
    }
    below = Math.max(lowest, p.y(DOCK16.x, DOCK16.y));
  }
  // The way back out: a white ring at the fog wall, as the white marker shows it at sea.
  const ex = p.x(FOG_EXIT.x, FOG_EXIT.y);
  const ey = p.y(FOG_EXIT.x, FOG_EXIT.y);
  ctx.strokeStyle = '#EEF1F2';
  ctx.lineWidth = 2.5 * k;
  ctx.beginPath();
  ctx.arc(ex, ey, 6 * k, 0, Math.PI * 2);
  ctx.stroke();
  // The names, over it all.
  ctx.font = `800 ${Math.round(11 * k)}px Grandstander, ui-rounded, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * k;
  const name = (text: string, x: number, y: number, base: CanvasTextBaseline) => {
    ctx.textBaseline = base;
    ctx.strokeStyle = 'rgba(20,26,28,.9)';
    const tx = labelX(ctx, text, x, k);
    ctx.strokeText(text, tx, y);
    ctx.fillStyle = '#FFF6E5';
    ctx.fillText(text, tx, y);
  };
  if (v.seen) name('Tomb Island', ix, below + 4 * k, 'top');
  name('Way out', ex, ey + 9 * k, 'top');
  drawMapBoat(ctx, p.x(v.boat.x, v.boat.y), p.y(v.boat.x, v.boat.y), v.boat.h, k, v.T);
}
