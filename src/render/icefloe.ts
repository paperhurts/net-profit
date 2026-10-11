/**
 * The ice floe on the sea: chunks of ice bobbing round it, its blue-white edge
 * standing a little out of the water, its snowy top with drifts and cracks,
 * the hole cut in it with a red flag beside it, and two grey seals hauled out.
 */

import type { DrawView } from '../entities/entity';
import { floeOutline, ICE_CHUNKS, ICE_FLOE, ICE_HOLE, SEALS } from '../world/icefloe';

const OUTLINE = floeOutline(48);
const HIGH = 7;

export function drawFloe(v: DrawView, T: number): void {
  if (!v.onScreen(ICE_FLOE.x, ICE_FLOE.y, ICE_FLOE.r * 3 * v.zoom)) return;
  const { ctx, px, py } = v;
  const Z = v.zoom;
  // Chunks bobbing round it.
  for (const c of ICE_CHUNKS) {
    const bob = Math.sin(T * 1.2 + c.a) * 1.5;
    ctx.fillStyle = '#A9D4E2';
    v.isoEllipse(c.x, c.y, c.r, 0);
    ctx.fill();
    ctx.fillStyle = '#F2FAFD';
    v.isoEllipse(c.x, c.y, c.r * 0.8, 3 + bob);
    ctx.fill();
  }
  const path = (z: number, k = 1) => {
    ctx.beginPath();
    OUTLINE.forEach((p, i) => {
      const x = ICE_FLOE.x + (p.x - ICE_FLOE.x) * k;
      const y = ICE_FLOE.y + (p.y - ICE_FLOE.y) * k;
      if (i === 0) ctx.moveTo(px(x, y), py(x, y, z));
      else ctx.lineTo(px(x, y), py(x, y, z));
    });
    ctx.closePath();
  };
  // Pale water round its edge, its blue side, and its snowy top.
  ctx.fillStyle = 'rgba(200,236,246,.35)';
  path(0, 1.08);
  ctx.fill();
  ctx.fillStyle = '#8FC3D6';
  path(0);
  ctx.fill();
  ctx.fillStyle = '#EEF8FC';
  path(HIGH);
  ctx.fill();
  ctx.strokeStyle = '#B7DCEA';
  ctx.lineWidth = 2 * Z;
  ctx.stroke();
  // Drifts of snow, and cracks.
  ctx.fillStyle = '#FFFFFF';
  for (const [dx, dy, r] of [
    [-0.4, 0.3, 60],
    [0.35, -0.3, 50],
    [-0.1, -0.55, 40],
  ] as const) {
    v.isoEllipse(ICE_FLOE.x + dx * ICE_FLOE.r, ICE_FLOE.y + dy * ICE_FLOE.r, r, HIGH + 1);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(120,170,190,.6)';
  ctx.lineWidth = 1.2 * Z;
  for (const [x0, y0, x1, y1] of [
    [-0.6, -0.2, -0.1, 0.1],
    [0.1, 0.5, 0.5, 0.1],
    [-0.2, -0.7, 0.2, -0.4],
  ] as const) {
    const ax = ICE_FLOE.x + x0 * ICE_FLOE.r;
    const ay = ICE_FLOE.y + y0 * ICE_FLOE.r;
    const bx = ICE_FLOE.x + x1 * ICE_FLOE.r;
    const by = ICE_FLOE.y + y1 * ICE_FLOE.r;
    ctx.beginPath();
    ctx.moveTo(px(ax, ay), py(ax, ay, HIGH));
    ctx.lineTo(
      px((ax + bx) / 2 + 12, (ay + by) / 2 - 8),
      py((ax + bx) / 2 + 12, (ay + by) / 2 - 8, HIGH),
    );
    ctx.lineTo(px(bx, by), py(bx, by, HIGH));
    ctx.stroke();
  }
  // The hole, dark water in a rim of ice, and a red flag by it.
  ctx.fillStyle = '#BFE1EE';
  v.isoEllipse(ICE_HOLE.x, ICE_HOLE.y, ICE_HOLE.r + 6, HIGH);
  ctx.fill();
  ctx.fillStyle = '#1D4E66';
  v.isoEllipse(ICE_HOLE.x, ICE_HOLE.y, ICE_HOLE.r, HIGH);
  ctx.fill();
  const fx = px(ICE_HOLE.x + 26, ICE_HOLE.y - 10);
  const fy = py(ICE_HOLE.x + 26, ICE_HOLE.y - 10, HIGH);
  ctx.strokeStyle = '#3B2A1E';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx, fy - 30 * Z);
  ctx.stroke();
  ctx.fillStyle = '#E4572E';
  ctx.beginPath();
  ctx.moveTo(fx, fy - 30 * Z);
  ctx.lineTo(fx + (14 + Math.sin(T * 4) * 2) * Z, fy - 25 * Z);
  ctx.lineTo(fx, fy - 20 * Z);
  ctx.closePath();
  ctx.fill();
  // Two seals, hauled out, one lifting its head now and then.
  for (const [i, s] of SEALS.entries()) {
    const c = Math.cos(s.a);
    const n = Math.sin(s.a);
    const at = (k: number, z: number) =>
      [px(s.x + c * k, s.y + n * k), py(s.x + c * k, s.y + n * k, z)] as const;
    ctx.fillStyle = 'rgba(80,110,125,.25)';
    v.isoEllipse(s.x, s.y, 22, HIGH);
    ctx.fill();
    ctx.fillStyle = '#7E8C94';
    for (let k = -18; k <= 12; k += 5) {
      const [sx, sy] = at(k, HIGH + 5);
      ctx.beginPath();
      ctx.arc(sx, sy, (9 - Math.abs(k + 3) * 0.25) * Z, 0, Math.PI * 2);
      ctx.fill();
    }
    const lift = Math.max(0, Math.sin(T * 0.5 + i * 2)) * 6;
    const [hx, hy] = at(18, HIGH + 8 + lift);
    ctx.beginPath();
    ctx.arc(hx, hy, 6.5 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1E2A30';
    ctx.beginPath();
    ctx.arc(hx + 2 * Z * Math.sign(c - n || 1), hy - 1.5 * Z, 1.4 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}
