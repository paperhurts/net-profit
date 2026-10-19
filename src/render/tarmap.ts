/**
 * The tar ocean's own map, for the map button while out on it in the chemistry boat (the kid sailed it round and never
 * found the tar island): the tar ocean, as big as the whole sea, turned the way the game is as the sea map is, black
 * from side to side. Along its bottom edge the bridge, with the tar dock where the chemistry boat goes back in; out on
 * the tar the tar island with the sorcerer's old tower on its hill, named from the first (the bridge's telescope shows
 * it); today's tar fish, where there are any left; and the boat. No fog: there is nothing on it to hide.
 */

import { METAL_BRIDGE, NORTH_EDGE } from '../world/metalbridge';
import { TAR_ISLE } from '../world/tarisle';
import { SEA_SPAN, TAR_BERTH, TAR_SEA } from '../world/tarsea';
import { drawMapBoat, drawMapBridge, labelX } from './seamap';

export type TarMapView = {
  boat: { x: number; y: number; h: number };
  /** Today's tar fish schools that still have fish in them. */
  schools: readonly { x: number; y: number }[];
  /** Seconds, for the boat's pulse and the island's. */
  T: number;
};

/** World to map, about the tar ocean's middle: a quarter turn of the iso view's diamond, unsquashed. */
export class TarProjection {
  readonly s: number;
  private readonly mx = (TAR_SEA.x0 + TAR_SEA.x1) / 2;
  private readonly my = (TAR_SEA.y0 + TAR_SEA.y1) / 2;
  constructor(
    readonly cx: number,
    readonly cy: number,
    size: number,
  ) {
    this.s = size / (2 * SEA_SPAN);
  }
  x(x: number, y: number): number {
    return this.cx + (x - this.mx - (y - this.my)) * this.s;
  }
  y(x: number, y: number): number {
    return this.cy + (x - this.mx + (y - this.my)) * this.s;
  }
}

/** Draw it all into a canvas of w by h device pixels. */
export function drawTarMap(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  v: TarMapView,
): void {
  const size = Math.min(w, h) * 0.96;
  const p = new TarProjection(w / 2, h / 2, size);
  const k = size / 400;
  ctx.clearRect(0, 0, w, h);
  // The tar, edge to edge.
  const { x0, y0, x1, y1 } = TAR_SEA;
  ctx.fillStyle = '#17121D';
  ctx.strokeStyle = '#4A3D57';
  ctx.lineWidth = 1.5 * k;
  ctx.beginPath();
  ctx.moveTo(p.x(x0, y0), p.y(x0, y0));
  ctx.lineTo(p.x(x1, y0), p.y(x1, y0));
  ctx.lineTo(p.x(x1, y1), p.y(x1, y1));
  ctx.lineTo(p.x(x0, y1), p.y(x0, y1));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The bridge's side, the white buoys' line, and the bridge on it.
  ctx.setLineDash([3 * k, 4 * k]);
  ctx.strokeStyle = '#D9D2BE';
  ctx.beginPath();
  ctx.moveTo(p.x(x0, y1), p.y(x0, y1));
  ctx.lineTo(p.x(x1, y1), p.y(x1, y1));
  ctx.stroke();
  ctx.setLineDash([]);
  drawMapBridge(ctx, p.x(METAL_BRIDGE.x, NORTH_EDGE), p.y(METAL_BRIDGE.x, NORTH_EDGE), k, '');
  // The tar dock: a green ring where the chemistry boat goes back in.
  const dx = p.x(TAR_BERTH.x, TAR_BERTH.y);
  const dy = p.y(TAR_BERTH.x, TAR_BERTH.y);
  ctx.strokeStyle = '#3FA34D';
  ctx.lineWidth = 2.5 * k;
  ctx.beginPath();
  ctx.arc(dx, dy, 6 * k, 0, Math.PI * 2);
  ctx.stroke();
  // Today's tar fish, little and pale on the black.
  ctx.fillStyle = '#B8A6CC';
  for (const f of v.schools) {
    ctx.beginPath();
    ctx.ellipse(p.x(f.x, f.y), p.y(f.x, f.y), 3 * k, 1.8 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The tar island: its black rock, its hill, the tower on top, and a slow pulse so the eye finds it.
  const ix = p.x(TAR_ISLE.x, TAR_ISLE.y);
  const iy = p.y(TAR_ISLE.x, TAR_ISLE.y);
  const r = Math.max(8 * k, TAR_ISLE.r * p.s * Math.SQRT2);
  const pulse = (v.T * 0.6) % 1;
  ctx.strokeStyle = `rgba(217,210,190,${0.7 * (1 - pulse)})`;
  ctx.lineWidth = 2 * k;
  ctx.beginPath();
  ctx.arc(ix, iy, r + (3 + pulse * 10) * k, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#4A3F38';
  ctx.beginPath();
  ctx.arc(ix, iy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2B2430';
  ctx.beginPath();
  ctx.arc(ix, iy - r * 0.08, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
  drawMapTower(ctx, ix, iy + r * 0.3, k * 0.9);
  // The names, over it all.
  ctx.font = `800 ${Math.round(11 * k)}px Grandstander, ui-rounded, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * k;
  const name = (text: string, x: number, y: number, base: CanvasTextBaseline) => {
    ctx.textBaseline = base;
    ctx.strokeStyle = 'rgba(8,8,14,.9)';
    const tx = labelX(ctx, text, x, k);
    ctx.strokeText(text, tx, y);
    ctx.fillStyle = '#FFF6E5';
    ctx.fillText(text, tx, y);
  };
  name('Tar island', ix, iy + r + 4 * k, 'top');
  name('Tar dock', dx, dy + 9 * k, 'top');
  drawMapBoat(ctx, p.x(v.boat.x, v.boat.y), p.y(v.boat.x, v.boat.y), v.boat.h, k, v.T);
}

/** The sorcerer's old tower, little, standing on the island's hill on the map. */
export function drawMapTower(ctx: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  ctx.fillStyle = '#9A958E';
  ctx.strokeStyle = 'rgba(8,8,14,.85)';
  ctx.lineWidth = 1 * k;
  // Its round body, a wider ring of battlements round its top, and three merlons on that.
  ctx.beginPath();
  ctx.rect(x - 3 * k, y - 10 * k, 6 * k, 10 * k);
  ctx.rect(x - 3.8 * k, y - 12 * k, 7.6 * k, 2.2 * k);
  for (const cx of [-3.8, -0.8, 2.2]) ctx.rect(x + cx * k, y - 13.8 * k, 1.6 * k, 1.8 * k);
  ctx.fill();
  ctx.stroke();
  // Its dark door at the foot, and a purple-lit window.
  ctx.fillStyle = '#2B2430';
  ctx.fillRect(x - 1.1 * k, y - 3.6 * k, 2.2 * k, 3.6 * k);
  ctx.fillStyle = '#B57CFF';
  ctx.fillRect(x - 0.6 * k, y - 8 * k, 1.2 * k, 1.8 * k);
}
