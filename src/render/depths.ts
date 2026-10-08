/**
 * Drawing the rooms under island 3's tower. The hall: under the sea at the
 * tower's foot, blue and dim, light coming down in shafts, the tower's great
 * foundation stones behind with barnacles and weed, kelp swaying round the
 * edge, fish going by and bubbles going up. Once the swordsman is beaten a red
 * portal turns at the back of it. The demon dimension: a red-black sky full of
 * rising embers, a floor of black rock cracked with glowing lines, and at its
 * back the cage where the warlock is kept, its bars lifting once he is free.
 */
import { rgba } from '../core/color';
import type { DrawView } from '../entities/entity';
import type { Room } from '../world/tower';
import { CAGE } from '../world/tower';
import { drawWarlock } from './warlock';

const hash = (i: number, k: number): number => {
  const h = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return h - Math.floor(h);
};

/** The back wall of a room: a ring of quads round its far half, from the floor up to h. */
function backWall(v: DrawView, R: Room, h: number, colour: (i: number) => string, n = 24): void {
  const { ctx, px, py } = v;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * 0.75 + (i * Math.PI) / n;
    const a1 = a0 + Math.PI / n;
    const x0 = R.x + Math.cos(a0) * R.r;
    const y0 = R.y + Math.sin(a0) * R.r;
    const x1 = R.x + Math.cos(a1) * R.r;
    const y1 = R.y + Math.sin(a1) * R.r;
    ctx.fillStyle = colour(i);
    ctx.beginPath();
    ctx.moveTo(px(x0, y0), py(x0, y0, 0));
    ctx.lineTo(px(x1, y1), py(x1, y1, 0));
    ctx.lineTo(px(x1, y1), py(x1, y1, h));
    ctx.lineTo(px(x0, y0), py(x0, y0, h));
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * The hall under the tower, behind whoever is in it. W and H are the screen's size. As the drowned
 * temple under island 6 it is greener, its stones are the temple's, and tentacles are carved in them.
 */
export function drawHallBack(v: DrawView, R: Room, W: number, H: number, temple = false): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, temple ? '#0E5A4A' : '#0E4E66');
  g.addColorStop(1, temple ? '#05241C' : '#06202E');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Light coming down in slow shafts.
  for (let i = 0; i < 5; i++) {
    const x = ((hash(i, 1) * 1.4 - 0.2) * W + Math.sin(T * 0.3 + i) * 30) | 0;
    const w = (40 + hash(i, 2) * 70) * Z;
    const sg = ctx.createLinearGradient(0, 0, 0, H * 0.8);
    sg.addColorStop(0, `rgba(170,230,240,${0.12 + 0.05 * Math.sin(T * 0.8 + i)})`);
    sg.addColorStop(1, 'rgba(170,230,240,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + w, 0);
    ctx.lineTo(x + w * 0.4 + 120 * Z, H * 0.8);
    ctx.lineTo(x - w * 0.3 + 120 * Z, H * 0.8);
    ctx.closePath();
    ctx.fill();
  }
  // Fish going by, far off.
  ctx.fillStyle = 'rgba(10,40,55,.6)';
  for (let i = 0; i < 6; i++) {
    const t = (T * (0.03 + hash(i, 3) * 0.03) + hash(i, 4)) % 1;
    const x = (t * 1.4 - 0.2) * W;
    const y = H * (0.12 + hash(i, 5) * 0.3);
    const l = (6 + hash(i, 6) * 6) * Z;
    ctx.beginPath();
    ctx.ellipse(x, y, l, l * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - l * 0.8, y);
    ctx.lineTo(x - l * 1.5, y - l * 0.5);
    ctx.lineTo(x - l * 1.5, y + l * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  // The tower's foundation stones behind, crusted and weedy, and an arch where the stairs go up.
  backWall(v, R, 90, (i) =>
    temple
      ? (i + Math.floor(i / 3)) % 2
        ? '#3F6B57'
        : '#4B7A64'
      : (i + Math.floor(i / 3)) % 2
        ? '#3C5A5C'
        : '#456668',
  );
  if (temple) {
    // Tentacles carved in the stones, curling up the wall.
    ctx.strokeStyle = 'rgba(160,220,180,.35)';
    ctx.lineWidth = 3 * Z;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * 0.9 + (i / 4) * Math.PI * 0.7;
      const x = R.x + Math.cos(a) * (R.r - 1);
      const y = R.y + Math.sin(a) * (R.r - 1);
      const sx = px(x, y);
      const sy = py(x, y, 10);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(
        sx + 14 * Z,
        sy - 20 * Z,
        sx - 14 * Z,
        sy - 40 * Z,
        sx + 6 * Z,
        sy - 64 * Z,
      );
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(230,236,226,.55)';
  for (let i = 0; i < 40; i++) {
    const a = Math.PI * 0.8 + hash(i, 7) * Math.PI * 0.9;
    const x = R.x + Math.cos(a) * (R.r - 0.5);
    const y = R.y + Math.sin(a) * (R.r - 0.5);
    ctx.beginPath();
    ctx.arc(px(x, y), py(x, y, 4 + hash(i, 8) * 40), (0.8 + hash(i, 9)) * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // The floor: sand, a few stones.
  v.isoEllipse(R.x, R.y, R.r);
  ctx.fillStyle = '#5E8478';
  ctx.fill();
  for (let i = 0; i < 14; i++) {
    const a = hash(i, 10) * Math.PI * 2;
    const d = hash(i, 11) * R.r * 0.85;
    v.isoEllipse(R.x + Math.cos(a) * d, R.y + Math.sin(a) * d, 3 + hash(i, 12) * 5);
    ctx.fillStyle = '#4C6E64';
    ctx.fill();
  }
  // Ripples of light on the floor.
  ctx.strokeStyle = 'rgba(200,250,240,.14)';
  ctx.lineWidth = 2 * Z;
  for (let i = 0; i < 18; i++) {
    const a = hash(i, 13) * Math.PI * 2;
    const d = hash(i, 14) * R.r * 0.85;
    const x = R.x + Math.cos(a) * d + Math.sin(T * 0.8 + i) * 8;
    const y = R.y + Math.sin(a) * d + Math.cos(T * 0.7 + i) * 8;
    const sx = px(x, y);
    const sy = py(x, y);
    ctx.beginPath();
    ctx.moveTo(sx - 9 * Z, sy);
    ctx.quadraticCurveTo(sx, sy - 4 * Z, sx + 9 * Z, sy);
    ctx.stroke();
  }
  // Kelp along the back.
  ctx.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const a = Math.PI * 0.82 + (i / 9) * Math.PI * 0.86;
    const x = R.x + Math.cos(a) * (R.r - 8);
    const y = R.y + Math.sin(a) * (R.r - 8);
    const sx = px(x, y);
    const sy = py(x, y);
    const h = (40 + hash(i, 15) * 40) * Z;
    ctx.strokeStyle = hash(i, 16) > 0.5 ? 'rgba(96,130,52,.85)' : 'rgba(120,112,44,.85)';
    ctx.lineWidth = 3 * Z;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(
      sx + Math.sin(T * 0.9 + i) * 6 * Z,
      sy - h * 0.4,
      sx - Math.sin(T * 0.9 + i) * 6 * Z,
      sy - h * 0.7,
      sx + Math.sin(T * 0.9 + i + 1) * 8 * Z,
      sy - h,
    );
    ctx.stroke();
  }
}

/** The portal the swordsman leaves at the back of the hall: red, turning. */
export function drawPortal(v: DrawView, x: number, y: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const sy = py(x, y, 2);
  for (let i = 0; i < 4; i++) {
    const r = (26 - i * 5) * Z;
    ctx.strokeStyle = rgba(i % 2 ? '#FF6A3D' : '#B3122E', 0.85 - i * 0.12);
    ctx.lineWidth = (5 - i) * Z;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r, r * 0.5, 0, T * (2 + i) + i, T * (2 + i) + i + Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(40,0,10,.75)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 10 * Z, 5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** The demon dimension, behind whoever is in it. */
export function drawDemonBack(v: DrawView, R: Room, W: number, H: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1A0306');
  g.addColorStop(0.55, '#5C0B12');
  g.addColorStop(1, '#250307');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Jagged far-off rocks against the glow.
  ctx.fillStyle = '#120204';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.42);
  for (let i = 0; i <= 12; i++) ctx.lineTo((i / 12) * W, H * (0.34 + hash(i, 20) * 0.1));
  ctx.lineTo(W, H * 0.42);
  ctx.closePath();
  ctx.fill();
  // Embers going up.
  for (let i = 0; i < 40; i++) {
    const t = (T * (0.05 + hash(i, 21) * 0.08) + hash(i, 22)) % 1;
    const x = hash(i, 23) * W + Math.sin(T + i) * 8;
    const y = H * (1 - t);
    ctx.fillStyle = `rgba(255,${120 + ((hash(i, 24) * 100) | 0)},60,${0.7 * (1 - t)})`;
    ctx.fillRect(x, y, 2 * Z, 2 * Z);
  }
  // The floor: black rock, cracked with glowing lines.
  v.isoEllipse(R.x, R.y, R.r + 10, -8);
  ctx.fillStyle = '#0C0A0B';
  ctx.fill();
  v.isoEllipse(R.x, R.y, R.r);
  ctx.fillStyle = '#2A2224';
  ctx.fill();
  ctx.strokeStyle = `rgba(255,96,40,${0.55 + 0.25 * Math.sin(T * 2)})`;
  ctx.lineWidth = 2 * Z;
  for (let i = 0; i < 9; i++) {
    let a = hash(i, 25) * Math.PI * 2;
    let d = R.r * 0.15;
    ctx.beginPath();
    ctx.moveTo(
      px(R.x + Math.cos(a) * d, R.y + Math.sin(a) * d),
      py(R.x + Math.cos(a) * d, R.y + Math.sin(a) * d),
    );
    for (let j = 0; j < 4; j++) {
      a += (hash(i, 26 + j) - 0.5) * 0.6;
      d += R.r * 0.2;
      const x = R.x + Math.cos(a) * d;
      const y = R.y + Math.sin(a) * d;
      ctx.lineTo(px(x, y), py(x, y));
    }
    ctx.stroke();
  }
}

/** The cage at the back of the demon dimension, with the warlock in it, or open and empty once he is out. */
export function drawCage(v: DrawView, open: number, warlockIn: boolean): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const { x, y, r } = CAGE;
  const H = 46;
  // The floor of the cage, and the warlock on it.
  v.box(x - r, y - r, r * 2, r * 2, 0, 3, '#3A3436', '#4A4246');
  const bars = (front: boolean) => {
    ctx.strokeStyle = '#8A8F96';
    ctx.lineWidth = 1.8 * Z;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const bx = x + Math.cos(a) * r;
      const by = y + Math.sin(a) * r;
      if (Math.cos(a) + Math.sin(a) > 0 !== front) continue;
      const lift = open * (H - 4);
      ctx.beginPath();
      ctx.moveTo(px(bx, by), py(bx, by, 3 + lift));
      ctx.lineTo(px(bx, by), py(bx, by, H));
      ctx.stroke();
    }
  };
  bars(false);
  if (warlockIn) drawWarlock(v, x, y, 3, { h: Math.PI / 4, ph: 0, gait: 0, cast: 1, hurt: false });
  bars(true);
  // The top, a ring with a chain going up.
  ctx.strokeStyle = '#6E737A';
  ctx.lineWidth = 3 * Z;
  v.isoEllipse(x, y, r, H);
  ctx.stroke();
  ctx.lineWidth = 1.6 * Z;
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, H));
  ctx.lineTo(px(x, y), py(x, y, H + 60));
  ctx.stroke();
  if (open > 0 && open < 1) {
    ctx.fillStyle = `rgba(200,255,180,${0.5 * Math.sin(open * Math.PI)})`;
    ctx.beginPath();
    ctx.arc(px(x, y), py(x, y, 20), (30 + Math.sin(T * 8) * 3) * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}
