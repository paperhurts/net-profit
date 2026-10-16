/**
 * The Battle Barge's arena (data/barge.ts): a round wooden barge out on the open sea under a wide sky, its deck of
 * planks running across it, a dark hull under the deck's edge, a rail of posts and rope round its back half, two tall
 * flagpoles at the back with red and yellow pennants snapping in the wind, and between them a sign: BATTLE BARGE.
 * Drawn behind whoever is fighting on it.
 */

import type { DrawView } from '../entities/entity';
import type { Room } from '../world/tower';

const PLANK = '#B48A5A';
const PLANK_DARK = '#9A7246';
const HULL = '#5E3D1C';
const ROPE = '#D8C49A';

/** The sky, the sea, and the barge's deck, rail, flags and sign. */
export function drawArenaBack(v: DrawView, R: Room, W: number, H: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  // A wide sky over the sea, the horizon high up the screen.
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.3);
  sky.addColorStop(0, '#7EC8E8');
  sky.addColorStop(1, '#CDEBF3');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.3);
  const sea = ctx.createLinearGradient(0, H * 0.3, 0, H);
  sea.addColorStop(0, '#3E9FC4');
  sea.addColorStop(1, '#1F6F96');
  ctx.fillStyle = sea;
  ctx.fillRect(0, H * 0.3, W, H * 0.7);
  // Glints on the water, drifting.
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1.5 * Z;
  for (let i = 0; i < 26; i++) {
    const gx = ((i * 157.3 + T * 14) % (W + 60)) - 30;
    const gy = H * 0.32 + ((i * 89.7) % (H * 0.68));
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 10 * Z, gy);
    ctx.stroke();
  }
  // The hull: the barge's dark side under the deck's edge, a ripple of foam round it.
  v.isoEllipse(R.x, R.y, R.r + 20, -12);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fill();
  v.isoEllipse(R.x, R.y, R.r + 10, -10);
  ctx.fillStyle = HULL;
  ctx.fill();
  // The deck, its planks running across it.
  v.isoEllipse(R.x, R.y, R.r + 8, 0);
  ctx.fillStyle = PLANK;
  ctx.fill();
  ctx.save();
  v.isoEllipse(R.x, R.y, R.r + 8, 0);
  ctx.clip();
  ctx.strokeStyle = PLANK_DARK;
  ctx.lineWidth = 1.2 * Z;
  const D = Math.SQRT1_2;
  for (let k = -R.r - 8; k <= R.r + 8; k += 18) {
    // Each plank's seam runs along (1, -1), k across it.
    const cx = R.x + k * D;
    const cy = R.y + k * D;
    const ax = cx - (R.r + 20) * D;
    const ay = cy + (R.r + 20) * D;
    const bx = cx + (R.r + 20) * D;
    const by = cy - (R.r + 20) * D;
    ctx.beginPath();
    ctx.moveTo(px(ax, ay), py(ax, ay, 0));
    ctx.lineTo(px(bx, by), py(bx, by, 0));
    ctx.stroke();
  }
  ctx.restore();
  // The rail round its back half: posts, and a rope between them.
  const posts: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * 0.75 + (i / 12) * Math.PI;
    posts.push([R.x + Math.cos(a) * (R.r + 2), R.y + Math.sin(a) * (R.r + 2)]);
  }
  ctx.strokeStyle = ROPE;
  ctx.lineWidth = 1.6 * Z;
  ctx.beginPath();
  posts.forEach(([x, y], i) => {
    if (i) ctx.lineTo(px(x, y), py(x, y, 16));
    else ctx.moveTo(px(x, y), py(x, y, 16));
  });
  ctx.stroke();
  for (const [x, y] of posts) v.box(x - 2, y - 2, 4, 4, 0, 20, HULL, '#7A5230');
  // Two flagpoles at the back, pennants snapping, and the sign between them.
  const back = Math.PI * 1.25;
  for (const s of [-1, 1]) {
    const a = back + s * 0.42;
    const fx = R.x + Math.cos(a) * (R.r - 6);
    const fy = R.y + Math.sin(a) * (R.r - 6);
    const sx = px(fx, fy);
    const top = py(fx, fy, 90);
    ctx.strokeStyle = '#4A3420';
    ctx.lineWidth = 2.4 * Z;
    ctx.beginPath();
    ctx.moveTo(sx, py(fx, fy, 0));
    ctx.lineTo(sx, top);
    ctx.stroke();
    const flap = Math.sin(T * 6 + s) * 3 * Z;
    ctx.fillStyle = s < 0 ? '#E4572E' : '#F2C230';
    ctx.beginPath();
    ctx.moveTo(sx, top);
    ctx.lineTo(sx + 26 * Z, top + 6 * Z + flap);
    ctx.lineTo(sx, top + 13 * Z);
    ctx.closePath();
    ctx.fill();
  }
  const bx = R.x + Math.cos(back) * (R.r - 4);
  const by = R.y + Math.sin(back) * (R.r - 4);
  const cx = px(bx, by);
  const cy = py(bx, by, 46);
  ctx.fillStyle = '#7A5230';
  ctx.fillRect(cx - 1.5 * Z - 28 * Z, cy, 3 * Z, 46 * Z);
  ctx.fillRect(cx - 1.5 * Z + 28 * Z, cy, 3 * Z, 46 * Z);
  ctx.fillStyle = '#5E3D1C';
  ctx.fillRect(cx - 44 * Z, cy - 14 * Z, 88 * Z, 24 * Z);
  ctx.fillStyle = '#F2C230';
  ctx.font = `800 ${Math.round(11 * Z)}px Grandstander, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BATTLE BARGE', cx, cy - 2 * Z);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
