/**
 * Skrill's displacer beasts (entities/displacers.ts): a great cat, longer than a man, in a blue-black coat with a violet
 * sheen, six legs, green eyes, and two long tentacles off its shoulders, each ending in a pad of bony spikes. The figure
 * sees its picture, a little to one side of it, drawn a shade see-through; where it really is there is only its shadow
 * and a shimmer in the air. While it shows where it really is, after a lash or a hit, the picture is drawn in onto it.
 * Rearing back, its tentacles go up over its head; lashing, they shoot out in front. On the ground, the warning: a red
 * wedge out from where it really is.
 */

import {
  DISP_FALL,
  DISP_WINDUP,
  type Displacer,
  LASH_ARC,
  LASH_REACH,
} from '../entities/displacers';
import type { DrawView } from '../entities/entity';

const COAT = '#262A48';
const SHEEN = '#4D5288';
const FAR = '#161830';
const SPIKE = '#E2DAC6';
const EYE = '#B9FF5C';

/** One of the displacer beasts: its shadow and shimmer where it really is, and its picture where it looks to be. */
export function drawDisplacer(v: DrawView, b: Displacer): void {
  if (b.state === 'gone') return;
  const { ctx, px, py, T, zoom: Z } = v;
  const fall = b.state === 'fall' ? Math.min(1, b.t / DISP_FALL) : 0;
  const sx = px(b.x, b.y);
  const sy = py(b.x, b.y);
  // Its shadow, where it really is: the one thing that gives it away.
  ctx.fillStyle = `rgba(0,0,0,${0.3 * (1 - fall)})`;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 22 * Z, 7 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // The shimmer in the air over it while its picture stands off to the side.
  if (b.k > 0.05) {
    ctx.strokeStyle = `rgba(190,200,255,${0.45 * b.k})`;
    ctx.lineWidth = 1.6 * Z;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const y = sy - (8 + i * 8) * Z;
      const w = Math.sin(T * 6 + i * 2 + b.ph) * 3 * Z;
      ctx.beginPath();
      ctx.moveTo(sx - 14 * Z, y);
      ctx.quadraticCurveTo(sx - 4 * Z, y - 3 * Z + w, sx + 4 * Z, y);
      ctx.quadraticCurveTo(sx + 10 * Z, y + 3 * Z - w, sx + 16 * Z, y);
      ctx.stroke();
    }
  }
  // Its picture: where it looks to be, a shade see-through and flickering, or on it once it shows itself.
  const ix = px(b.ix, b.iy);
  const iy = py(b.ix, b.iy);
  const ghost = b.k > 0.05 ? 0.8 + 0.12 * Math.sin(T * 9 + b.ph) : 1;
  ctx.save();
  ctx.globalAlpha = ghost * (1 - fall * 0.8);
  ctx.translate(ix, iy);
  const face = px(b.x + Math.cos(b.h), b.y + Math.sin(b.h)) >= sx ? 1 : -1;
  ctx.scale(face * Z * 1.15, Z * 1.15 * (1 - fall * 0.5));
  beast(ctx, b, T);
  ctx.restore();
}

/** The beast itself, side on, facing +x, its feet at the origin. */
function beast(ctx: CanvasRenderingContext2D, b: Displacer, T: number): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const walking = b.state === 'stalk' || b.state === 'back' || b.state === 'prowl';
  const stride = walking ? Math.sin(b.step * 9) : 0;
  const crouch = b.state === 'windup' ? Math.min(1, b.t / DISP_WINDUP) * 4 : 0;
  const flash = b.flash > 0;
  const coat = flash ? '#FFFFFF' : COAT;
  // The tail, long and swishing.
  const swish = Math.sin(T * 2.2 + b.ph) * 3;
  ctx.strokeStyle = coat;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-16, -18 + crouch);
  ctx.bezierCurveTo(-26, -14, -30, -24 - swish, -26, -32 - swish);
  ctx.stroke();
  // The far tentacle, behind the body.
  tentacle(ctx, b, T, -1, flash);
  // Six legs, in three pairs: the far ones darker.
  for (const far of [true, false]) {
    ctx.strokeStyle = far ? FAR : coat;
    ctx.lineWidth = 3.4;
    for (const [i, lx] of [-13, -1, 11].entries()) {
      const s = stride * (i % 2 ? 1 : -1) * (far ? -1 : 1) * 3;
      ctx.beginPath();
      ctx.moveTo(lx + (far ? 4 : 0), -14 + crouch);
      ctx.lineTo(lx + s + (far ? 4 : 0), far ? -1.5 : 0);
      ctx.stroke();
    }
  }
  // The body: long and low, with its violet sheen along the back.
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(-1, -18 + crouch, 18, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flash ? '#FFFFFF' : SHEEN;
  ctx.beginPath();
  ctx.ellipse(-2, -23 + crouch, 12, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // The head, low and forward, with pointed ears, green eyes and a snarl.
  const hx = 18;
  const hy = -21 + crouch * 1.2;
  ctx.fillStyle = coat;
  for (const ex of [-3, 1.5]) {
    ctx.beginPath();
    ctx.moveTo(hx + ex - 2, hy - 4);
    ctx.lineTo(hx + ex, hy - 10);
    ctx.lineTo(hx + ex + 2.5, hy - 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(hx, hy, 6.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx + 5, hy + 1.6, 3.6, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  const a0 = ctx.globalAlpha;
  ctx.fillStyle = EYE;
  ctx.globalAlpha = a0 * (b.state === 'prowl' ? 0.6 : 1);
  for (const ex of [1.2, 4.4]) {
    ctx.beginPath();
    ctx.ellipse(hx + ex, hy - 1.6, 1.3, 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = a0;
  if (b.state !== 'prowl') {
    ctx.fillStyle = '#F4F0E6';
    for (const tx of [5.2, 7.2]) {
      ctx.beginPath();
      ctx.moveTo(tx, hy + 3);
      ctx.lineTo(tx + 0.7, hy + 5.4);
      ctx.lineTo(tx + 1.4, hy + 3);
      ctx.closePath();
      ctx.fill();
    }
  }
  // The near tentacle, in front of it all.
  tentacle(ctx, b, T, 1, flash);
}

/**
 * A tentacle from its shoulder: swaying up over its back, reared right back over its head, shot straight out in front,
 * or lying out on the ground after; at its end a pad with bony spikes.
 */
function tentacle(
  ctx: CanvasRenderingContext2D,
  b: Displacer,
  T: number,
  side: number,
  flash: boolean,
): void {
  const x0 = 8;
  const y0 = -24;
  const sway = Math.sin(T * 2.6 + b.ph + side) * 4;
  let ex: number;
  let ey: number;
  let cx: number;
  let cy: number;
  if (b.state === 'windup') {
    const k = Math.min(1, b.t / DISP_WINDUP);
    ex = -4 - 12 * k + side * 3;
    ey = -50 - 6 * k;
    cx = 16;
    cy = -48;
  } else if (b.state === 'lash') {
    ex = 64;
    ey = -14 + side * 3;
    cx = 34;
    cy = -30;
  } else if (b.state === 'recover') {
    ex = 40 + side * 4;
    ey = -2;
    cx = 26;
    cy = -20;
  } else {
    ex = -6 + sway + side * 5;
    ey = -44 - sway * 0.5;
    cx = 14;
    cy = -46;
  }
  ctx.strokeStyle = flash ? '#FFFFFF' : side < 0 ? FAR : COAT;
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  ctx.stroke();
  // The pad at its end, a little diamond, and its spikes.
  const a = Math.atan2(ey - cy, ex - cx);
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(a);
  ctx.scale(1.3, 1.3);
  ctx.fillStyle = flash ? '#FFFFFF' : side < 0 ? FAR : COAT;
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.lineTo(1.5, -3.6);
  ctx.lineTo(6, 0);
  ctx.lineTo(1.5, 3.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = SPIKE;
  for (const [x, y, dx, dy] of [
    [1.5, -3.6, 0, -3],
    [1.5, 3.6, 0, 3],
    [6, 0, 3, 0],
    [3.8, -2, 2, -2.4],
    [3.8, 2, 2, 2.4],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x - 1, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.lineTo(x + 1, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The warning on the ground while it rears back, and the lash itself: a red wedge out from where it really is. */
export function drawDisplacerMark(v: DrawView, b: Displacer): void {
  if (b.state !== 'windup' && b.state !== 'lash') return;
  const { ctx, px, py, zoom: Z } = v;
  const k = b.state === 'windup' ? Math.min(1, b.t / DISP_WINDUP) : 1;
  ctx.fillStyle = `rgba(220,60,50,${b.state === 'lash' ? 0.55 : 0.12 + 0.3 * k})`;
  ctx.strokeStyle = `rgba(255,120,90,${0.4 + 0.5 * k})`;
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(px(b.x, b.y), py(b.x, b.y));
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const a = b.h - LASH_ARC + (2 * LASH_ARC * i) / n;
    const x = b.x + Math.cos(a) * LASH_REACH;
    const y = b.y + Math.sin(a) * LASH_REACH;
    ctx.lineTo(px(x, y), py(x, y));
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
