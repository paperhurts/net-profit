/**
 * Leggy muffins (entities/leggy.ts): a fish muffin up on two thin legs with little round feet, stepping as it trots,
 * two dot eyes on its paper cup, and over it, like Pigpen's, a little cloud of stink: wavy green lines rising and
 * fading, and two flies buzzing round. Aboard they ride in a stink crate on the stern, their tops peeking out over the
 * slats and their legs dangling over the side, under one bigger cloud.
 */

import type { DrawView } from '../entities/entity';
import type { Leggy } from '../entities/leggy';
import { drawMuffin } from './bakery';

const INK = '#1D2B3A';
const TOPS = ['#9A6234', '#C98B4E', '#6E4426', '#B07440', '#8A5A3C', '#A86A3A'];

/** A cloud of stink over screen point x, y, about w across, at time T; seed keeps neighbours out of step. */
export function drawStink(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  T: number,
  seed: number,
  puff = 0,
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, w * 0.12);
  for (let k = 0; k < 3; k++) {
    const t = (T * 0.55 + k / 3 + seed * 0.37) % 1;
    const ox = (k - 1) * w * 0.32;
    const rise = t * w * (0.9 + puff);
    ctx.strokeStyle = `rgba(112,152,56,${(1 - t) * 0.9})`;
    ctx.beginPath();
    for (let j = 0; j <= 8; j++) {
      const u = j / 8;
      const px = x + ox + Math.sin(u * Math.PI * 2 + T * 3 + k) * w * 0.09;
      const py = y - rise - u * w * 0.45;
      if (j) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  // Two flies, buzzing round.
  ctx.fillStyle = INK;
  for (let k = 0; k < 2; k++) {
    const a = T * (5 + k * 1.7) + seed * 2 + k * Math.PI;
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(a) * w * 0.5,
      y - w * 0.55 + Math.sin(a * 1.3) * w * 0.22,
      Math.max(0.7, w * 0.05),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

/** One muffin on its legs, ashore, standing on height z, the i-th in the line. */
export function drawLeggy(v: DrawView, m: Leggy, z: number, i: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const sx = px(m.x, m.y);
  const base = py(m.x, m.y, z);
  // A shadow.
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.beginPath();
  ctx.ellipse(sx, base, 3.6 * Z, 1.6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  const hop = Math.sin(m.hop * Math.PI) * 4 * Z;
  const legs = 3.8 * Z;
  const foot = py(m.x, m.y, z) - hop;
  // The legs, stepping: each swings forward and back as it trots, the far one first.
  ctx.strokeStyle = '#3A2A20';
  ctx.lineWidth = 0.9 * Z;
  ctx.lineCap = 'round';
  const facing = Math.cos(m.h) - Math.sin(m.h) >= 0 ? 1 : -1;
  for (const s of [-1, 1]) {
    const swing = Math.sin(m.stride + (s > 0 ? Math.PI : 0)) * 1.6 * Z * facing;
    const hx = sx + s * 1.3 * Z;
    ctx.beginPath();
    ctx.moveTo(hx, foot - legs);
    ctx.lineTo(hx + swing, foot);
    ctx.stroke();
    ctx.fillStyle = '#3A2A20';
    ctx.beginPath();
    ctx.ellipse(hx + swing + facing * 0.5 * Z, foot, 0.9 * Z, 0.5 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const cupFoot = foot - legs;
  const r = 3.3 * Z;
  drawMuffin(ctx, sx, cupFoot, r, TOPS[i % TOPS.length] ?? '#9A6234', i % 2 === 0);
  // Two dot eyes on the cup, looking the way it goes.
  ctx.fillStyle = INK;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx + s * 0.9 * Z + facing * 0.5 * Z, cupFoot - r * 0.55, 0.45 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  drawStink(ctx, sx, cupFoot - r * 2.1, 11 * Z, v.T, i, m.hop);
}

/** The stink crate on the stern, at world x, y and deck height z, with n muffins in it. */
export function drawStinkCrate(v: DrawView, x: number, y: number, z: number, n: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const w = 9;
  v.box(x - w / 2, y - w / 2, w, w, z, z + 6, '#8A5A2E', '#B07A44');
  // The slats.
  ctx.strokeStyle = 'rgba(60,35,10,.55)';
  ctx.lineWidth = 0.7 * Z;
  for (const f of [1.5, 3.5]) {
    ctx.beginPath();
    ctx.moveTo(px(x - w / 2, y + w / 2), py(x - w / 2, y + w / 2, z + f));
    ctx.lineTo(px(x + w / 2, y + w / 2), py(x + w / 2, y + w / 2, z + f));
    ctx.lineTo(px(x + w / 2, y - w / 2), py(x + w / 2, y - w / 2, z + f));
    ctx.stroke();
  }
  // Their tops peeking out, two rows of three, and a leg or two over the side.
  for (let i = 0; i < n; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const mx = x - 2.6 + col * 2.6 + row * 1.2;
    const my = y + 1.6 - row * 3;
    const bob = Math.sin(v.T * 4 + i * 1.7) * 0.4 * Z;
    drawMuffin(
      ctx,
      px(mx, my),
      py(mx, my, z + 6) + bob,
      2.1 * Z,
      TOPS[i % TOPS.length] ?? '#9A6234',
      false,
    );
    if (i % 2 === 0) {
      const lx = px(x + w / 2, my);
      const ly = py(x + w / 2, my, z + 5);
      const kick = Math.sin(v.T * 6 + i) * 1.2 * Z;
      ctx.strokeStyle = '#3A2A20';
      ctx.lineWidth = 0.8 * Z;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 1.6 * Z + kick, ly + 3 * Z);
      ctx.stroke();
    }
  }
  if (n > 0) drawStink(ctx, px(x, y), py(x, y, z + 9), (9 + n) * Z, v.T, 0);
}
