/**
 * New Dimensions' arena (data/dimension.ts), a stand-in until the kid's drawing arrives: a round floor of pale stone
 * floating in a violet sky full of slow stars, a glowing ring of runes round its edge, a dark underside dropping away
 * into the void, and at its back the portal you came through, swirling. Drawn behind whoever is fighting on it, in
 * the same room as the Battle Barge's medium arena.
 */

import type { DrawView } from '../entities/entity';
import type { Room } from '../world/tower';

const STONE = '#CFC6E6';
const STONE_DARK = '#A79BCB';
const UNDER = '#3B2A63';
const RUNE = '#8FF5FF';

/** The void, the floor, its runes and the portal. */
export function drawDimBack(v: DrawView, R: Room, W: number, H: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1B1035');
  sky.addColorStop(0.55, '#3A1F66');
  sky.addColorStop(1, '#5B2F7E');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Stars, drifting slowly up, twinkling.
  for (let i = 0; i < 60; i++) {
    const sx = (i * 97.13) % W;
    const sy = (((i * 61.7 - T * (6 + (i % 5) * 3)) % H) + H) % H;
    const tw = 0.45 + 0.45 * Math.sin(T * 2 + i * 1.7);
    ctx.fillStyle = `rgba(255,240,255,${tw.toFixed(2)})`;
    ctx.fillRect(sx, sy, (1 + (i % 3)) * Z * 0.8, (1 + (i % 3)) * Z * 0.8);
  }
  // The floor's underside, dropping into the void.
  v.isoEllipse(R.x, R.y, R.r + 6, -40);
  ctx.fillStyle = 'rgba(20,8,40,.55)';
  ctx.fill();
  v.isoEllipse(R.x, R.y, R.r + 10, -14);
  ctx.fillStyle = UNDER;
  ctx.fill();
  // The floor, its stones in rings.
  v.isoEllipse(R.x, R.y, R.r + 8, 0);
  ctx.fillStyle = STONE;
  ctx.fill();
  ctx.strokeStyle = STONE_DARK;
  ctx.lineWidth = 1.2 * Z;
  for (let r = 40; r < R.r + 8; r += 46) {
    v.isoEllipse(R.x, R.y, r, 0);
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const ax = R.x + Math.cos(a) * 40;
    const ay = R.y + Math.sin(a) * 40;
    const bx = R.x + Math.cos(a) * (R.r + 8);
    const by = R.y + Math.sin(a) * (R.r + 8);
    ctx.beginPath();
    ctx.moveTo(px(ax, ay), py(ax, ay, 0));
    ctx.lineTo(px(bx, by), py(bx, by, 0));
    ctx.stroke();
  }
  // The ring of runes round the edge, glowing and pulsing.
  const glow = 0.55 + 0.35 * Math.sin(T * 2.4);
  ctx.strokeStyle = `rgba(143,245,255,${glow.toFixed(2)})`;
  ctx.lineWidth = 2.4 * Z;
  v.isoEllipse(R.x, R.y, R.r - 4, 0);
  ctx.stroke();
  ctx.fillStyle = RUNE;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + T * 0.1;
    const rx = R.x + Math.cos(a) * (R.r - 4);
    const ry = R.y + Math.sin(a) * (R.r - 4);
    ctx.globalAlpha = glow;
    ctx.fillRect(px(rx, ry) - 2 * Z, py(rx, ry, 0) - 2 * Z, 4 * Z, 4 * Z);
  }
  ctx.globalAlpha = 1;
  // The portal at the back, swirling: rings of violet and cyan round a bright middle.
  const back = Math.PI * 1.25;
  const gx = R.x + Math.cos(back) * (R.r - 10);
  const gy = R.y + Math.sin(back) * (R.r - 10);
  const cx = px(gx, gy);
  const cy = py(gx, gy, 44);
  for (let k = 5; k >= 0; k--) {
    const rr = (14 + k * 6) * Z;
    ctx.fillStyle = k % 2 ? 'rgba(156,92,255,.55)' : 'rgba(110,235,255,.45)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr * 0.7, rr, Math.sin(T * 1.5 + k) * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 1.6 * Z;
  for (let k = 0; k < 3; k++) {
    const a0 = T * 3 + (k * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 20 * Z, 30 * Z, 0, a0, a0 + 1.2);
    ctx.stroke();
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 6 * Z, 9 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
}
