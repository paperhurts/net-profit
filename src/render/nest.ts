/**
 * The Heron's nest, the room on top of island 9's tower: night sky all round,
 * lit purple by the orb of power while it burns, and a great nest of sticks to
 * stand in: a woven floor, a rim of sticks heaped round its back, and two of his
 * grey feathers lying in it.
 */
import type { DrawView } from '../entities/entity';
import type { Room } from '../world/tower';

function hash(i: number, k: number): number {
  const h = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

/** A stick lying from one world point to another, at a height. */
function stick(
  v: DrawView,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z: number,
  c: string,
): void {
  const { ctx, px, py } = v;
  ctx.strokeStyle = c;
  ctx.beginPath();
  ctx.moveTo(px(x0, y0), py(x0, y0, z));
  ctx.lineTo(px(x1, y1), py(x1, y1, z));
  ctx.stroke();
}

/** Everything behind the actors: the sky, the woven floor, the back of the rim, and the feathers. */
export function drawNestBack(v: DrawView, R: Room, W: number, H: number, lit: boolean): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#140F33');
  g.addColorStop(1, lit ? '#5A2A7E' : '#33285C');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(T * 2 + i);
    ctx.fillRect(hash(i, 1) * W, hash(i, 2) * H * 0.6, 2, 2);
  }
  ctx.globalAlpha = 1;
  // The woven floor.
  v.isoEllipse(R.x, R.y, R.r + 6);
  ctx.fillStyle = '#5E4630';
  ctx.fill();
  v.isoEllipse(R.x, R.y, R.r - 4);
  ctx.fillStyle = '#7A5C3E';
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.lineWidth = 2 * Z;
  for (let i = 0; i < 70; i++) {
    const a = hash(i, 3) * Math.PI * 2;
    const r = Math.sqrt(hash(i, 4)) * (R.r - 14);
    const x = R.x + Math.cos(a) * r;
    const y = R.y + Math.sin(a) * r;
    const b = hash(i, 5) * Math.PI;
    const l = 10 + hash(i, 6) * 14;
    stick(
      v,
      x - Math.cos(b) * l,
      y - Math.sin(b) * l,
      x + Math.cos(b) * l,
      y + Math.sin(b) * l,
      0,
      i % 3 ? '#8C6A47' : '#5A4129',
    );
  }
  // The rim heaped round the back, sticks crossing.
  ctx.lineWidth = 2.6 * Z;
  for (let i = 0; i < 40; i++) {
    const a = Math.PI * 0.72 + (i / 40) * Math.PI * 1.06;
    const r = R.r + 2 + hash(i, 7) * 8;
    const x = R.x + Math.cos(a) * r;
    const y = R.y + Math.sin(a) * r;
    const t = a + Math.PI / 2 + (hash(i, 8) - 0.5);
    const l = 14 + hash(i, 9) * 10;
    const z = 4 + (i % 3) * 5;
    stick(
      v,
      x - Math.cos(t) * l,
      y - Math.sin(t) * l,
      x + Math.cos(t) * l,
      y + Math.sin(t) * l,
      z,
      i % 2 ? '#6E5236' : '#8C6A47',
    );
  }
  // Two of his grey feathers.
  for (const [dx, dy, a] of [
    [40, 30, 0.4],
    [-30, 55, -0.9],
  ] as const) {
    const x = R.x + dx;
    const y = R.y + dy;
    const sx = px(x, y);
    const sy = py(x, y, 1);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a);
    ctx.fillStyle = '#B9C0C9';
    ctx.beginPath();
    ctx.ellipse(0, 0, 11 * Z, 3 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7E8794';
    ctx.lineWidth = 0.8 * Z;
    ctx.beginPath();
    ctx.moveTo(-12 * Z, 0);
    ctx.lineTo(11 * Z, 0);
    ctx.stroke();
    ctx.restore();
  }
}

/** The front of the rim, drawn over the actors so the nest's lip is nearest the viewer. */
export function drawNestFront(v: DrawView, R: Room): void {
  const { ctx } = v;
  const Z = v.zoom;
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.6 * Z;
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI * 0.22 + (i / 26) * Math.PI * 0.94;
    const r = R.r + 6 + hash(i, 10) * 6;
    const x = R.x + Math.cos(a) * r;
    const y = R.y + Math.sin(a) * r;
    const t = a + Math.PI / 2 + (hash(i, 11) - 0.5);
    const l = 12 + hash(i, 12) * 8;
    stick(
      v,
      x - Math.cos(t) * l,
      y - Math.sin(t) * l,
      x + Math.cos(t) * l,
      y + Math.sin(t) * l,
      2 + (i % 2) * 3,
      i % 2 ? '#6E5236' : '#8C6A47',
    );
  }
}
