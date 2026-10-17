/**
 * The kid's islands in the Battle Barge's ring at sea (data/barge.ts SeaIsle): each a round island of sand with a
 * green middle, a foam line where it meets the water, shallows round it, and two or three palms, in island 7's style.
 */

import type { DrawView } from '../entities/entity';
import { drawPalm7 } from './isle7';
import type { Solid } from './layers';

/** One where it stands in the world, and how far its sand reaches. */
export type SeaIsleAt = { x: number; y: number; r: number };

/** Its palms, from its middle, as a share of its size. */
const PALMS: readonly (readonly [number, number])[] = [
  [-0.3, -0.18],
  [0.22, -0.32],
  [0.08, 0.26],
];

/** Their shallows, in rings out from the sand. */
export function drawSeaIslesSea(v: DrawView, isles: readonly SeaIsleAt[]): void {
  const { ctx } = v;
  for (const i of isles) {
    if (!v.onScreen(i.x, i.y, (i.r + 140) * v.zoom)) continue;
    v.isoEllipse(i.x, i.y, i.r + 130);
    ctx.fillStyle = '#1F7381';
    ctx.fill();
    v.isoEllipse(i.x, i.y, i.r + 60);
    ctx.fillStyle = '#35A0A6';
    ctx.fill();
    v.isoEllipse(i.x, i.y, i.r + 22);
    ctx.fillStyle = '#7DD2C8';
    ctx.fill();
  }
}

/** Their sand and grass, with a foam line at the water. */
export function drawSeaIslesFlat(v: DrawView, isles: readonly SeaIsleAt[]): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  isles.forEach((i, k) => {
    if (!v.onScreen(i.x, i.y, (i.r + 40) * Z)) return;
    v.isoEllipse(i.x, i.y, i.r + 8 + Math.sin(T * 1.3 + k) * 3);
    ctx.strokeStyle = v.foam;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 4 * Z;
    ctx.stroke();
    ctx.globalAlpha = 1;
    v.isoEllipse(i.x, i.y, i.r);
    ctx.fillStyle = '#F2D9A0';
    ctx.fill();
    v.isoEllipse(i.x - i.r * 0.08, i.y + i.r * 0.05, i.r * 0.62);
    ctx.fillStyle = '#6FB062';
    ctx.fill();
  });
}

/** Their palms, each in the depth sort. */
export function seaIslesSolids(v: DrawView, isles: readonly SeaIsleAt[]): Solid[] {
  const out: Solid[] = [];
  isles.forEach((i, k) => {
    if (!v.onScreen(i.x, i.y, (i.r + 120) * v.zoom)) return;
    PALMS.forEach(([fx, fy], n) => {
      // The smallest islands get two palms, the rest three.
      if (n === 2 && i.r < 140) return;
      const x = i.x + fx * i.r;
      const y = i.y + fy * i.r;
      out.push({ d: x + y, f: () => drawPalm7(v, x, y, k * 3 + n) });
    });
  });
  return out;
}
