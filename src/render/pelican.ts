/**
 * Drawing island 10's tower and its giant pelican (entities/pelican.ts). Outside: a tall round tower of sandy stone
 * in the meadow, slit windows and a door, and on top the pelican's nest of sticks with the pelican sat in it, its great
 * bill over the edge, or, once beaten, the player's flag. Up on the roof: a bright sky with clouds going by, sandy stone
 * battlements, the nest at the back, and the pelican: big and white with black wingtips, a long orange bill and a pink
 * pouch that swells when it spits. It flies with its wings wide, its shadow on the floor; dives with them swept back,
 * bill first; sticks bill-down in the floor after, kicking; and flops over when beaten. The ring on the floor where it
 * will dive follows the figure (dashed, orange) and then stops (solid, red). Its spat fish spin through the air.
 */

import type { DrawView } from '../entities/entity';
import {
  CIRCLE_T,
  DIVE_T,
  LOCK_T,
  PELICAN_FALL,
  type Pelican,
  SCOOP_R,
  SPIT_T,
} from '../entities/pelican';
import { TOWER10 } from '../world/isle10';

const PELICAN_K = 3.4;
const WHITE = '#F4F1EA';
const SHADE = '#D9D4C8';
const TIP = '#2A2A30';
const BILL = '#F2A33A';
const POUCH = '#F08A7A';
const LEG = '#E8862E';
const INK = '#3A3030';

function blob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rot = 0,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
}

/* ---------- outside: the tower ---------- */

/** Island 10's tower in the meadow, with the pelican sat on top or, once beaten, the player's flag. */
export function drawTower10(v: DrawView, flag: ((x: number, y: number) => void) | null): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const t = TOWER10;
  if (!v.onScreen(t.x, t.y, (t.h + 80) * Z)) return;
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    pts.push([t.x + Math.cos(a) * t.r, t.y + Math.sin(a) * t.r]);
  }
  v.extrude(pts, 0, t.h, '#B89D6E', '#E2CDA0');
  // Courses of stone round it, a door at its foot, and slit windows up it.
  ctx.strokeStyle = 'rgba(90,70,40,.25)';
  ctx.lineWidth = 1 * Z;
  for (let z = 24; z < t.h; z += 24) {
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.05 + (i / 10) * Math.PI * 0.9;
      const x = t.x + Math.cos(a) * t.r;
      const y = t.y + Math.sin(a) * t.r;
      if (i === 0) ctx.moveTo(px(x, y), py(x, y, z));
      else ctx.lineTo(px(x, y), py(x, y, z));
    }
    ctx.stroke();
  }
  const fx = t.x + t.r * Math.SQRT1_2;
  const fy = t.y + t.r * Math.SQRT1_2;
  ctx.fillStyle = '#5A3A22';
  ctx.beginPath();
  ctx.moveTo(px(fx, fy) - 7 * Z, py(fx, fy, 0));
  ctx.lineTo(px(fx, fy) - 7 * Z, py(fx, fy, 18));
  ctx.quadraticCurveTo(px(fx, fy), py(fx, fy, 26), px(fx, fy) + 7 * Z, py(fx, fy, 18));
  ctx.lineTo(px(fx, fy) + 7 * Z, py(fx, fy, 0));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3A2A1A';
  for (const z of [70, 120, 160])
    ctx.fillRect(px(fx, fy) - 1.5 * Z, py(fx, fy, z + 10), 3 * Z, 10 * Z);
  const bx = px(t.x, t.y);
  const by = py(t.x, t.y, t.h);
  // The nest of sticks on top.
  ctx.strokeStyle = '#7A5A34';
  ctx.lineWidth = 2 * Z;
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7;
    ctx.beginPath();
    ctx.moveTo(bx + Math.cos(a) * 22 * Z, by + Math.sin(a) * 6 * Z - 2 * Z);
    ctx.lineTo(bx - Math.cos(a + 1.3) * 22 * Z, by - Math.sin(a + 1.3) * 6 * Z - 4 * Z);
    ctx.stroke();
  }
  if (flag) {
    ctx.strokeStyle = '#8A6A43';
    ctx.lineWidth = 2 * Z;
    ctx.beginPath();
    ctx.moveTo(bx, by - 4 * Z);
    ctx.lineTo(bx, by - 44 * Z);
    ctx.stroke();
    flag(bx, by - 44 * Z);
    return;
  }
  // The pelican, sat in its nest, its bill over the edge.
  drawSitting(ctx, bx, by - 4 * Z, Z * 2.6, -1, v.T);
}

/** A pelican sat down at screen x, y: a white heap, a curled neck, and the bill resting on its chest. */
function drawSitting(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  Z: number,
  face: number,
  T: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.fillStyle = WHITE;
  blob(ctx, 0, -3 * Z, 6 * Z, 3.6 * Z);
  ctx.fill();
  ctx.fillStyle = SHADE;
  blob(ctx, -1.5 * Z, -3.6 * Z, 4 * Z, 2 * Z);
  ctx.fill();
  ctx.fillStyle = TIP;
  blob(ctx, -4.6 * Z, -3 * Z, 2 * Z, 1 * Z, 0.3);
  ctx.fill();
  const bob = Math.sin(T * 1.2) * 0.4 * Z;
  ctx.fillStyle = WHITE;
  blob(ctx, 3 * Z, -7.5 * Z + bob, 2.1 * Z, 2 * Z);
  ctx.fill();
  ctx.fillStyle = POUCH;
  blob(ctx, 6 * Z, -5.6 * Z + bob, 3.4 * Z, 1.4 * Z, 0.25);
  ctx.fill();
  ctx.fillStyle = BILL;
  ctx.beginPath();
  ctx.moveTo(4 * Z, -8 * Z + bob);
  ctx.lineTo(10.5 * Z, -5.4 * Z + bob);
  ctx.lineTo(4.2 * Z, -6.6 * Z + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(3.6 * Z, -8.1 * Z + bob, 0.45 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ---------- up on the roof ---------- */

/** The roof's sky: bright day, clouds going by. */
export function drawPerchSky(v: DrawView, W: number, H: number): void {
  const { ctx } = v;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#6FBDE6');
  g.addColorStop(1, '#D3EEF8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  for (let i = 0; i < 6; i++) {
    const x = ((((i * 173 + v.T * (8 + i * 2)) % (W + 240)) + W + 240) % (W + 240)) - 120;
    const y = H * (0.08 + (i % 3) * 0.14);
    for (const [dx, dy, r] of [
      [0, 0, 26],
      [24, 6, 20],
      [-22, 7, 18],
      [8, -10, 18],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The pelican's nest at the back of the roof: a great ring of sticks. */
export function drawPerchNest(v: DrawView, p: Pelican): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const { x, y } = p.nest;
  v.isoEllipse(x, y, 30);
  ctx.fillStyle = '#6E5030';
  ctx.fill();
  v.isoEllipse(x, y, 20);
  ctx.fillStyle = '#4E3820';
  ctx.fill();
  ctx.strokeStyle = '#8A6A40';
  ctx.lineWidth = 2.2 * Z;
  for (let i = 0; i < 16; i++) {
    const a = i * 0.41;
    const a2 = a + 1.1;
    ctx.beginPath();
    ctx.moveTo(
      px(x + Math.cos(a) * 32, y + Math.sin(a) * 32),
      py(x + Math.cos(a) * 32, y + Math.sin(a) * 32, 4),
    );
    ctx.lineTo(
      px(x + Math.cos(a2) * 22, y + Math.sin(a2) * 22),
      py(x + Math.cos(a2) * 22, y + Math.sin(a2) * 22, 8),
    );
    ctx.stroke();
  }
}

/** Where its dive will land: following the figure, dashed and orange, then stopped, solid and red. */
export function drawScoopRing(v: DrawView, p: Pelican): void {
  if (p.state !== 'circle' && p.state !== 'dive') return;
  const { ctx } = v;
  const locked = p.state === 'dive' || p.t >= CIRCLE_T - LOCK_T;
  v.isoEllipse(p.ringX, p.ringY, SCOOP_R);
  if (locked) {
    ctx.fillStyle = 'rgba(220,40,30,.3)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,50,40,.9)';
    ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = 'rgba(240,150,40,.85)';
    ctx.setLineDash([6 * v.zoom, 5 * v.zoom]);
  }
  ctx.lineWidth = 2 * v.zoom;
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Its spat fish, spinning through the air, and a shadow under each. */
export function drawSpatFish(v: DrawView, p: Pelican): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  for (const f of p.fish) {
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    blob(ctx, px(f.x, f.y), py(f.x, f.y, 0), 4 * Z, 1.4 * Z);
    ctx.fill();
    ctx.save();
    ctx.translate(px(f.x, f.y), py(f.x, f.y, 9));
    ctx.rotate(f.t * 12);
    ctx.fillStyle = '#B8C6D0';
    blob(ctx, 0, 0, 5 * Z, 2 * Z);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4.5 * Z, 0);
    ctx.lineTo(-7.5 * Z, -2.2 * Z);
    ctx.lineTo(-7.5 * Z, 2.2 * Z);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(3 * Z, -0.5 * Z, 0.6 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawPelican(v: DrawView, p: Pelican): void {
  if (p.state === 'gone') return;
  const { ctx, px, py } = v;
  const Z = v.zoom * PELICAN_K;
  const W = (c: string) => (p.flash > 0 ? '#FFFFFF' : c);
  // Its shadow, smaller and fainter the higher it flies.
  const hk = Math.max(0, 1 - p.z / 120);
  ctx.fillStyle = `rgba(0,0,0,${0.12 + 0.12 * hk})`;
  blob(ctx, px(p.x, p.y), py(p.x, p.y, 0), (5 + 4 * hk) * Z, (1.6 + 1 * hk) * Z);
  ctx.fill();
  ctx.save();
  ctx.translate(px(p.x, p.y), py(p.x, p.y, p.z));
  const fall = p.state === 'fall' ? Math.min(1, p.t / PELICAN_FALL) : 0;
  if (fall > 0) {
    ctx.globalAlpha = fall > 0.6 ? 1 - (fall - 0.6) / 0.4 : 1;
    ctx.rotate(p.face * Math.min(1, fall * 2.5) * 1.3);
  }
  ctx.scale(p.face, 1);
  ctx.lineCap = 'round';
  // Woken, it stands on its nest flapping, as though it were about to fly.
  const flying =
    p.state === 'rise' || p.state === 'circle' || (p.state === 'wake' && Math.sin(p.t * 4) > 0);
  if (flying) drawFlying(ctx, p, Z, W);
  else if (p.state === 'dive') drawDiving(ctx, p, Z, W);
  else drawStanding(ctx, p, Z, W);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function legs(
  ctx: CanvasRenderingContext2D,
  Z: number,
  kick: number,
  W: (c: string) => string,
): void {
  ctx.strokeStyle = W(LEG);
  ctx.lineWidth = 0.9 * Z;
  for (const [lx, s] of [
    [-1.2, 1],
    [1, -1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(lx * Z, -5 * Z);
    ctx.lineTo((lx + s * kick) * Z, 0);
    ctx.stroke();
    ctx.fillStyle = W(LEG);
    blob(ctx, (lx + s * kick + 0.8) * Z, -0.2 * Z, 1.3 * Z, 0.45 * Z);
    ctx.fill();
  }
}

function drawStanding(
  ctx: CanvasRenderingContext2D,
  p: Pelican,
  Z: number,
  W: (c: string) => string,
): void {
  const stuck = p.state === 'stuck';
  const spit = p.state === 'spit';
  const waddle = p.state === 'waddle' ? Math.sin(p.t * 9) * 0.8 : 0;
  const kick = stuck ? Math.sin(p.t * 16) * 1.4 : waddle;
  legs(ctx, Z, kick, W);
  ctx.save();
  // Stuck, it tips right over onto its bill.
  if (stuck) ctx.rotate(0.9);
  ctx.fillStyle = W(WHITE);
  blob(ctx, 0, -9 * Z, 6.4 * Z, 4.4 * Z, -0.1);
  ctx.fill();
  ctx.fillStyle = W(SHADE);
  blob(ctx, -1.6 * Z, -9.8 * Z, 4.6 * Z, 2.4 * Z, -0.1);
  ctx.fill();
  ctx.fillStyle = W(TIP);
  blob(ctx, -5.6 * Z, -9 * Z, 2.6 * Z, 1.1 * Z, 0.25);
  ctx.fill();
  // The neck up to the head; reared back to spit, the pouch swelling.
  const back = spit ? Math.min(1, p.t / SPIT_T) : 0;
  const hx = (3.6 - back * 2.4) * Z;
  const hy = (-17.5 - back * 1.5) * Z;
  ctx.strokeStyle = W(WHITE);
  ctx.lineWidth = 2.6 * Z;
  ctx.beginPath();
  ctx.moveTo(3.6 * Z, -11 * Z);
  ctx.quadraticCurveTo(6 * Z, -14 * Z, hx, hy);
  ctx.stroke();
  ctx.fillStyle = W(WHITE);
  blob(ctx, hx, hy, 2.2 * Z, 2 * Z);
  ctx.fill();
  const tilt = -back * 0.7;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);
  ctx.fillStyle = W(POUCH);
  blob(ctx, 5.6 * Z, 1.6 * Z, (4.6 + back * 1.8) * Z, (1.5 + back * 2.4) * Z, 0.1);
  ctx.fill();
  ctx.fillStyle = W(BILL);
  ctx.beginPath();
  ctx.moveTo(1 * Z, -0.8 * Z);
  ctx.lineTo(12 * Z, 0.6 * Z);
  ctx.lineTo(11.6 * Z, 1.4 * Z);
  ctx.lineTo(1 * Z, 0.6 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0.6 * Z, -0.6 * Z, 0.5 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawFlying(
  ctx: CanvasRenderingContext2D,
  p: Pelican,
  Z: number,
  W: (c: string) => string,
): void {
  const flap = Math.sin(p.t * (p.state === 'rise' ? 14 : 7));
  // Wings wide, the far one behind, flapping.
  for (const [far, dir] of [
    [true, -1],
    [false, 1],
  ] as const) {
    const tipY = (-10 - flap * 7 * dir) * Z;
    ctx.fillStyle = W(far ? SHADE : WHITE);
    ctx.beginPath();
    ctx.moveTo(-2 * Z, -9 * Z);
    ctx.quadraticCurveTo(-1 * Z, tipY - 4 * Z, (far ? -10 : 12) * Z, tipY);
    ctx.lineTo(2 * Z, -8 * Z);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = W(TIP);
    ctx.beginPath();
    ctx.arc((far ? -10 : 12) * Z, tipY, 1.6 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = W(WHITE);
  blob(ctx, 0, -8.5 * Z, 6 * Z, 3 * Z);
  ctx.fill();
  // The neck tucked back, the head and bill out in front.
  blob(ctx, 5.4 * Z, -10.5 * Z, 2 * Z, 1.8 * Z);
  ctx.fill();
  ctx.fillStyle = W(POUCH);
  blob(ctx, 10 * Z, -9.2 * Z, 4 * Z, 1.2 * Z);
  ctx.fill();
  ctx.fillStyle = W(BILL);
  ctx.beginPath();
  ctx.moveTo(6.5 * Z, -11 * Z);
  ctx.lineTo(16 * Z, -9.6 * Z);
  ctx.lineTo(6.5 * Z, -9.6 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(5.8 * Z, -11 * Z, 0.5 * Z, 0, Math.PI * 2);
  ctx.fill();
}

function drawDiving(
  ctx: CanvasRenderingContext2D,
  p: Pelican,
  Z: number,
  W: (c: string) => string,
): void {
  const k = Math.min(1, p.t / DIVE_T);
  ctx.rotate(0.6 + k * 0.6);
  // Wings swept right back, bill first, pouch open wide.
  ctx.fillStyle = W(SHADE);
  ctx.beginPath();
  ctx.moveTo(2 * Z, -9 * Z);
  ctx.lineTo(-12 * Z, -13 * Z);
  ctx.lineTo(-3 * Z, -7 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = W(WHITE);
  blob(ctx, 0, -8.5 * Z, 6 * Z, 2.8 * Z);
  ctx.fill();
  ctx.fillStyle = W(TIP);
  ctx.beginPath();
  ctx.arc(-11 * Z, -12.6 * Z, 1.5 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = W(POUCH);
  blob(ctx, 10.5 * Z, -7.6 * Z, 4.4 * Z, 2.6 * Z);
  ctx.fill();
  ctx.fillStyle = W(BILL);
  ctx.beginPath();
  ctx.moveTo(6 * Z, -10 * Z);
  ctx.lineTo(16 * Z, -9 * Z);
  ctx.lineTo(6 * Z, -8.4 * Z);
  ctx.closePath();
  ctx.fill();
}
