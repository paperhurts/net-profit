/**
 * Drawing island 10's birdfeeder and its crows (entities/crows.ts). The feeder: a wooden tray on a pole with a little
 * red roof over it on four posts, like the old man's shack's; once the bread is in it, crumbs and seeds on the tray
 * and spilled on the grass under it. The crows: glossy black with a blue sheen on the wing, a grey bill and a bright
 * eye; standing and pecking, hopping about, head cocked when one asks its question, wings wide flying in, and hearts
 * over one being petted. The ones that are the figure's ride on the boat's rail, bobbing and now and then flapping.
 */

import { type Crow, type GuideCrow, PETTED_T, TRAY_Z } from '../entities/crows';
import type { DrawView } from '../entities/entity';
import { FEEDER10 } from '../world/isle10';

const CROW_K = 1.7;
const BLACK = '#17171D';
const SHEEN = '#2C3A5C';
const GLOSS = 'rgba(120,150,210,.55)';
const BILL = '#55555E';
const LEG = '#3A3A40';
const WOOD = '#7A5230';
const WOOD_TOP = '#B58553';
const ROOF = '#A33A2C';
const ROOF_TOP = '#C2493A';
/** The tray's half width; its roof's posts, eaves and ridge over it. */
const TRAY = 8;
const POSTS = 15;
const RIDGE = 22;

function blob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rot = 0,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

/** The birdfeeder on its pole; with bread in it, crumbs on the tray and on the grass. */
export function drawFeeder(v: DrawView, full: boolean): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const { x, y } = FEEDER10;
  if (!v.onScreen(x, y, 80 * Z)) return;
  ctx.fillStyle = 'rgba(0,0,0,.14)';
  v.isoEllipse(x, y, 7);
  ctx.fill();
  if (full) {
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39;
      const r = 8 + ((i * 7) % 13);
      ctx.fillStyle = i % 3 ? '#D9B36A' : '#8A6A40';
      ctx.fillRect(
        px(x + Math.cos(a) * r, y + Math.sin(a) * r) - Z,
        py(x + Math.cos(a) * r, y + Math.sin(a) * r, 0) - Z * 0.6,
        2 * Z,
        1.2 * Z,
      );
    }
  }
  // The pole.
  ctx.strokeStyle = '#5A3A22';
  ctx.lineWidth = 2.6 * Z;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, 0));
  ctx.lineTo(px(x, y), py(x, y, TRAY_Z - 2));
  ctx.stroke();
  // The tray, its seed, and the posts and roof over it.
  v.box(x - TRAY, y - TRAY, TRAY * 2, TRAY * 2, TRAY_Z - 3, TRAY_Z, WOOD, WOOD_TOP);
  if (full) {
    for (let i = 0; i < 18; i++) {
      const sx = x - TRAY + 2 + ((i * 5) % 13);
      const sy = y - TRAY + 2 + ((i * 3 + (i >> 2)) % 13);
      ctx.fillStyle = i % 4 ? '#E3C27A' : '#9A7444';
      ctx.fillRect(px(sx, sy) - Z * 0.9, py(sx, sy, TRAY_Z) - Z * 0.6, 1.8 * Z, 1.2 * Z);
    }
  }
  ctx.strokeStyle = '#6A4628';
  ctx.lineWidth = 1.3 * Z;
  const k = TRAY - 1;
  for (const [cx, cy] of [
    [-k, -k],
    [k, -k],
    [-k, k],
    [k, k],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(px(x + cx, y + cy), py(x + cx, y + cy, TRAY_Z));
    ctx.lineTo(px(x + cx, y + cy), py(x + cx, y + cy, TRAY_Z + POSTS));
    ctx.stroke();
  }
  // Two roof planes off a ridge along x, the far one first; and the gable end toward the viewer.
  const E = TRAY + 2;
  const plane = (side: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(px(x - E, y), py(x - E, y, TRAY_Z + RIDGE));
    ctx.lineTo(px(x + E, y), py(x + E, y, TRAY_Z + RIDGE));
    ctx.lineTo(px(x + E, y + side * E), py(x + E, y + side * E, TRAY_Z + POSTS - 1));
    ctx.lineTo(px(x - E, y + side * E), py(x - E, y + side * E, TRAY_Z + POSTS - 1));
    ctx.closePath();
    ctx.fill();
  };
  plane(-1, ROOF);
  ctx.fillStyle = WOOD;
  ctx.beginPath();
  ctx.moveTo(px(x + k, y - k), py(x + k, y - k, TRAY_Z + POSTS));
  ctx.lineTo(px(x + k, y), py(x + k, y, TRAY_Z + RIDGE - 1));
  ctx.lineTo(px(x + k, y + k), py(x + k, y + k, TRAY_Z + POSTS));
  ctx.closePath();
  ctx.fill();
  plane(1, ROOF_TOP);
  ctx.strokeStyle = 'rgba(80,20,15,.5)';
  ctx.lineWidth = 0.9 * Z;
  for (let i = -2; i <= 2; i++) {
    const rx = x + (i * E) / 2.6;
    ctx.beginPath();
    ctx.moveTo(px(rx, y), py(rx, y, TRAY_Z + RIDGE));
    ctx.lineTo(px(rx, y + E), py(rx, y + E, TRAY_Z + POSTS - 1));
    ctx.stroke();
  }
}

/** A crow at the feeder, flying in, or flying off to the boat. */
export function drawCrow(v: DrawView, c: Crow): void {
  if (c.state === 'gone' || c.state === 'wait') return;
  const { ctx, px, py } = v;
  const Z = v.zoom * CROW_K;
  const flying = c.state === 'fly' || c.state === 'leave';
  if (flying || c.z < TRAY_Z - 2) {
    const hk = Math.max(0, 1 - c.z / 140);
    ctx.fillStyle = `rgba(0,0,0,${0.1 + 0.12 * hk})`;
    blob(ctx, px(c.x, c.y), py(c.x, c.y, 0), (3 + 2 * hk) * Z, (1 + 0.6 * hk) * Z);
    ctx.fill();
  }
  const sx = px(c.x, c.y);
  const sy = py(c.x, c.y, c.z);
  if (flying || (c.state === 'hop' && c.z > 3)) drawFlying(ctx, sx, sy, c.face, c.flap, Z);
  else {
    const bob = c.state === 'peck' ? Math.max(0, Math.sin(c.peck * 1.3)) ** 3 : 0;
    drawSitting(ctx, sx, sy, c.face, bob, c.state === 'ask' ? 0.4 : 0, Z);
  }
  if (c.state === 'petted') drawHearts(ctx, sx, sy - 14 * Z, c.t, Z);
}

/** A crow at screen (sx, sy) standing, its head down `bob` of the way in a peck, cocked by `cock`. */
export function drawSitting(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  face: number,
  bob: number,
  cock: number,
  Z: number,
): void {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(face, 1);
  ctx.lineCap = 'round';
  ctx.strokeStyle = LEG;
  ctx.lineWidth = 0.7 * Z;
  ctx.beginPath();
  ctx.moveTo(-0.8 * Z, -3 * Z);
  ctx.lineTo(-1 * Z, 0);
  ctx.moveTo(0.8 * Z, -3 * Z);
  ctx.lineTo(1.2 * Z, 0);
  ctx.stroke();
  // The tail, the body, and the wing folded on it with its sheen.
  ctx.fillStyle = BLACK;
  ctx.beginPath();
  ctx.moveTo(-3 * Z, -5.6 * Z);
  ctx.lineTo(-8.4 * Z, -2.6 * Z);
  ctx.lineTo(-7.6 * Z, -1.4 * Z);
  ctx.lineTo(-2.4 * Z, -3.6 * Z);
  ctx.closePath();
  ctx.fill();
  blob(ctx, -0.4 * Z, -5.4 * Z, 4.6 * Z, 3 * Z, -0.3 - bob * 0.35);
  ctx.fill();
  ctx.fillStyle = SHEEN;
  blob(ctx, -1.4 * Z, -5.6 * Z, 3.4 * Z, 1.8 * Z, -0.3 - bob * 0.35);
  ctx.fill();
  ctx.strokeStyle = GLOSS;
  ctx.lineWidth = 0.6 * Z;
  ctx.beginPath();
  ctx.moveTo(-3.6 * Z, -5 * Z);
  ctx.quadraticCurveTo(-1.4 * Z, -7 * Z, 1.4 * Z, -6.6 * Z);
  ctx.stroke();
  // The head: up, or down at the ground in a peck; cocked to one side, asking.
  const hx = (3.4 + bob * 1.6) * Z;
  const hy = (-8.6 + bob * 4.4) * Z;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(-cock + bob * 0.9);
  ctx.fillStyle = BLACK;
  blob(ctx, 0, 0, 2.6 * Z, 2.4 * Z);
  ctx.fill();
  ctx.fillStyle = BILL;
  ctx.beginPath();
  ctx.moveTo(1.8 * Z, -0.9 * Z);
  ctx.lineTo(5.2 * Z, 0.1 * Z);
  ctx.lineTo(1.8 * Z, 0.9 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  blob(ctx, 0.9 * Z, -0.7 * Z, 0.75 * Z, 0.75 * Z);
  ctx.fill();
  ctx.fillStyle = '#000000';
  blob(ctx, 1.1 * Z, -0.7 * Z, 0.4 * Z, 0.4 * Z);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/** A crow at screen (sx, sy) in flight, its wings at this beat. */
export function drawFlying(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  face: number,
  flap: number,
  Z: number,
): void {
  ctx.save();
  ctx.translate(sx, sy - 5 * Z);
  ctx.scale(face, 1);
  const s = Math.sin(flap);
  const wing = (far: boolean) => {
    ctx.fillStyle = far ? SHEEN : BLACK;
    const tip = (far ? -8 : -10) * s;
    ctx.beginPath();
    ctx.moveTo(1.6 * Z, -0.6 * Z);
    ctx.quadraticCurveTo(0, (tip - 2) * Z, -2.6 * Z, tip * Z);
    ctx.lineTo(-4.2 * Z, tip * 0.8 * Z);
    ctx.quadraticCurveTo(-3.6 * Z, tip * 0.3 * Z, -2.6 * Z, 0);
    ctx.closePath();
    ctx.fill();
  };
  wing(true);
  ctx.fillStyle = BLACK;
  ctx.beginPath();
  ctx.moveTo(-3.4 * Z, -0.4 * Z);
  ctx.lineTo(-8.4 * Z, -1.2 * Z);
  ctx.lineTo(-8.4 * Z, 1.4 * Z);
  ctx.lineTo(-3.4 * Z, 0.8 * Z);
  ctx.closePath();
  ctx.fill();
  blob(ctx, 0, 0, 4.6 * Z, 2.2 * Z);
  ctx.fill();
  blob(ctx, 4.4 * Z, -0.8 * Z, 2.2 * Z, 2 * Z);
  ctx.fill();
  ctx.fillStyle = BILL;
  ctx.beginPath();
  ctx.moveTo(6 * Z, -1.5 * Z);
  ctx.lineTo(8.8 * Z, -0.6 * Z);
  ctx.lineTo(6 * Z, 0 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  blob(ctx, 5.2 * Z, -1.4 * Z, 0.6 * Z, 0.6 * Z);
  ctx.fill();
  wing(false);
  ctx.restore();
}

/** Little pink hearts rising over a crow being petted. */
function drawHearts(
  ctx: CanvasRenderingContext2D,
  sx: number,
  top: number,
  t: number,
  Z: number,
): void {
  for (let i = 0; i < 3; i++) {
    const k = (t / PETTED_T + i / 3) % 1;
    const a = 1 - k;
    const hx = sx + Math.sin(k * 6 + i * 2) * 3 * Z;
    const hy = top - k * 12 * Z;
    const r = 1.1 * Z;
    ctx.fillStyle = `rgba(255,105,140,${a})`;
    ctx.beginPath();
    ctx.arc(hx - r, hy, r * 1.05, 0, Math.PI * 2);
    ctx.arc(hx + r, hy, r * 1.05, 0, Math.PI * 2);
    ctx.moveTo(hx - 2.1 * r, hy + 0.3 * r);
    ctx.lineTo(hx, hy + 2.4 * r);
    ctx.lineTo(hx + 2.1 * r, hy + 0.3 * r);
    ctx.fill();
  }
}

/**
 * Where the figure's crows sit on the gunwale of a boat of this hull scale, one to n from the bow back, along whichever
 * side is toward the viewer.
 */
export function crowSeat(
  b: { x: number; y: number; h: number },
  k: number,
  i: number,
): { x: number; y: number; z: number } {
  const c = Math.cos(b.h);
  const s = Math.sin(b.h);
  const along = (14 - i * 12) * k;
  const side = (c - s >= 0 ? 10.5 : -10.5) * k;
  return { x: b.x + c * along - s * side, y: b.y + s * along + c * side, z: 9 * k };
}

/** The figure's crows, this many, riding on the boat's rail. */
export function drawCrowsAboard(
  v: DrawView,
  b: { x: number; y: number; h: number },
  k: number,
  n: number,
): void {
  const Z = v.zoom * CROW_K * 0.85;
  const face = Math.cos(b.h) - Math.sin(b.h) >= 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const p = crowSeat(b, k, i);
    const sx = v.px(p.x, p.y);
    const sy = v.py(p.x, p.y, p.z);
    // Each sits facing ahead, bobs now and then, and every so often stretches its wings.
    const ph = (v.T * 0.6 + i * 2.3) % 7;
    if (ph < 0.6) drawFlying(v.ctx, sx, sy + 4 * Z, face, ph * 18, Z);
    else drawSitting(v.ctx, sx, sy, face, ph > 4 && ph < 4.5 ? 0.5 : 0, ph > 5.5 ? 0.35 : 0, Z);
  }
}

/** The crow let go in the far far sea: flying for land, waiting on its sand, or flying back to the boat. */
export function drawGuide(v: DrawView, g: GuideCrow): void {
  if (g.state === 'aboard') return;
  const { ctx, px, py } = v;
  const Z = v.zoom * CROW_K;
  const hk = Math.max(0, 1 - g.z / 140);
  ctx.fillStyle = `rgba(0,0,0,${0.08 + 0.12 * hk})`;
  blob(ctx, px(g.x, g.y), py(g.x, g.y, 0), (3 + 2 * hk) * Z, (1 + 0.6 * hk) * Z);
  ctx.fill();
  const sx = px(g.x, g.y);
  const sy = py(g.x, g.y, g.z);
  if (g.state === 'perch') {
    const bob = Math.max(0, Math.sin(g.peck * 1.3)) ** 3;
    drawSitting(ctx, sx, sy, g.face, bob, 0, Z);
  } else drawFlying(ctx, sx, sy, g.face, g.flap, Z);
}
