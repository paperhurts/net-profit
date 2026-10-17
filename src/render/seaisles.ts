/**
 * The kid's islands in the Battle Barge's ring at sea (data/barge.ts SeaIsle): each a round island of sand with a
 * green middle, a foam line where it meets the water, shallows round it, and two or three palms, in island 7's style;
 * and the kid's tar.
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

/**
 * The kid's tar (data/barge.ts SeaTar): a round black patch on the water, its edge wobbling, an oily sheen sliding
 * round on it and bubbles coming up and popping, in island 4's tar's colours. Drawn on the water's surface, under
 * the islands and over whatever swims beneath.
 */
export function drawSeaTar(v: DrawView, tar: readonly SeaIsleAt[]): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  tar.forEach((t, k) => {
    if (!v.onScreen(t.x, t.y, (t.r + 40) * Z)) return;
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r = t.r * (1 + 0.05 * Math.sin(a * 3 + k + T * 0.4) + 0.03 * Math.sin(a * 7 - T * 0.3));
      const x = t.x + Math.cos(a) * r;
      const y = t.y + Math.sin(a) * r;
      if (i) ctx.lineTo(px(x, y), py(x, y));
      else ctx.moveTo(px(x, y), py(x, y));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(18,14,18,.93)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,52,56,.8)';
    ctx.lineWidth = 2 * Z;
    ctx.stroke();
    ctx.lineWidth = 3 * Z;
    for (let i = 0; i < 3; i++) {
      const rr = Math.max(1, t.r * (0.35 + i * 0.2) + Math.sin(T * 0.5 + i + k) * 6);
      ctx.strokeStyle = i % 2 ? 'rgba(120,80,160,.22)' : 'rgba(70,140,110,.18)';
      ctx.beginPath();
      ctx.ellipse(
        px(t.x, t.y),
        py(t.x, t.y),
        rr * Z,
        rr * 0.5 * Z,
        0,
        T * 0.2 + i + k,
        T * 0.2 + i + k + 1.6,
      );
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const a = i * 2.4 + k;
      const d = t.r * (0.2 + ((i * 37) % 60) / 100);
      const f = (T * 0.6 + i * 0.37 + k * 0.21) % 1;
      const bx = t.x + Math.cos(a) * d;
      const by = t.y + Math.sin(a) * d;
      ctx.fillStyle = `rgba(40,34,40,${1 - f})`;
      ctx.beginPath();
      ctx.arc(px(bx, by), py(bx, by), (1.5 + f * 4) * Z, 0, Math.PI * 2);
      ctx.fill();
    }
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
