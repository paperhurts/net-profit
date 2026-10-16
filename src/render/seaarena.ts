/**
 * The Battle Barge at sea's ring (data/barge.ts): its buoys on the open water, in the barge's own red and yellow, each
 * bobbing with a pennant on a short pole, and a rope of floats sagging between them, so the ring reads as a fighting
 * ring and not the sea's own buoy lines.
 */

import { seaBuoys } from '../data/barge';
import type { DrawView } from '../entities/entity';

const RED = '#E4572E';
const YELLOW = '#F2C230';
const POLE = '#4A3420';

/** Its water: open sea lighter than the deep's darkest, in rings out from the middle, the lightest inside the buoys. */
const WATER: readonly [number, string][] = [
  [1400, '#0E4252'],
  [900, '#124D5E'],
  [450, '#16586A'],
  [80, '#1A6276'],
];
export function drawSeaWater(v: DrawView, c: { x: number; y: number }, r: number): void {
  const { ctx } = v;
  for (const [out, colour] of WATER) {
    v.isoEllipse(c.x, c.y, r + out, 0);
    ctx.fillStyle = colour;
    ctx.fill();
  }
}

/** Its buoys round a ring of radius r about c, those near the screen. */
export function drawSeaRing(v: DrawView, c: { x: number; y: number }, r: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const b = seaBuoys(r).map((p) => ({ x: c.x + p.x, y: c.y + p.y }));
  const bob = (i: number) => Math.sin(T * 1.7 + i * 0.9) * 1.8;
  // The floats between, first, under the buoys.
  for (let i = 0; i < b.length; i++) {
    const p = b[i] as { x: number; y: number };
    const n = b[(i + 1) % b.length] as { x: number; y: number };
    if (!v.onScreen(p.x, p.y, 200 * Z) && !v.onScreen(n.x, n.y, 200 * Z)) continue;
    for (let k = 1; k < 6; k++) {
      const f = k / 6;
      const x = p.x + (n.x - p.x) * f;
      const y = p.y + (n.y - p.y) * f;
      ctx.fillStyle = k % 2 ? YELLOW : RED;
      ctx.beginPath();
      ctx.ellipse(
        px(x, y),
        py(x, y, 1.5 + Math.sin(T * 2 + i + k) * 0.8),
        2.6 * Z,
        1.6 * Z,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  for (let i = 0; i < b.length; i++) {
    const p = b[i] as { x: number; y: number };
    if (!v.onScreen(p.x, p.y, 60 * Z)) continue;
    const z = bob(i);
    const x = px(p.x, p.y);
    const y = py(p.x, p.y, 4 + z);
    v.isoEllipse(p.x, p.y, 10, 0);
    ctx.fillStyle = 'rgba(4,24,32,.3)';
    ctx.fill();
    // A round float, red over yellow, and a pole with a pennant streaming in the wind.
    ctx.fillStyle = YELLOW;
    ctx.beginPath();
    ctx.ellipse(x, y, 8 * Z, 4.5 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.ellipse(x, y - 3 * Z, 6.5 * Z, 3.5 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = POLE;
    ctx.lineWidth = 1.6 * Z;
    ctx.beginPath();
    ctx.moveTo(x, y - 4 * Z);
    ctx.lineTo(x, y - 24 * Z);
    ctx.stroke();
    const flap = Math.sin(T * 6 + i) * 2 * Z;
    ctx.fillStyle = i % 2 ? RED : YELLOW;
    ctx.beginPath();
    ctx.moveTo(x, y - 24 * Z);
    ctx.lineTo(x + 11 * Z, y - 21 * Z + flap);
    ctx.lineTo(x, y - 17 * Z);
    ctx.closePath();
    ctx.fill();
  }
}
