/**
 * Drawing the forest's gorillas (entities/gorillas.ts), side on and big, a head taller than the figure reared up:
 * sat munching, one hand to its mouth; up on its legs beating its chest; on its knuckles coming through the trees,
 * shoulders high; reared up with both fists over its head while a red ring on the ground shows where they will
 * land; fists down in the slam with a burst of dust; and tumbling off into the trees when beaten. The silverback has
 * a grey saddle down his back.
 */

import type { DrawView } from '../entities/entity';
import {
  GORILLA_FALL,
  GORILLA_POUND,
  GORILLA_WINDUP,
  type Gorilla,
  SLAM_R,
} from '../entities/gorillas';

const GORILLA_K = 3.2;
const FUR = '#2B2A30';
const DARK = '#1C1B20';
const SKIN = '#57525A';
const SILVER = '#A2A2AA';

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

/** The ring where its fists will come down, growing redder as they rise; and the dust as they land. */
export function drawSlamRing(v: DrawView, g: Gorilla): void {
  const { ctx } = v;
  if (g.state === 'windup') {
    const k = Math.min(1, g.t / GORILLA_WINDUP);
    v.isoEllipse(g.slamAt[0], g.slamAt[1], SLAM_R);
    ctx.fillStyle = `rgba(220,40,30,${0.12 + 0.18 * k})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(230,50,40,${0.5 + 0.4 * k})`;
    ctx.lineWidth = 1.6 * v.zoom;
    ctx.stroke();
  } else if (g.state === 'slam') {
    const k = Math.min(1, g.t / GORILLA_POUND);
    v.isoEllipse(g.slamAt[0], g.slamAt[1], SLAM_R * (0.8 + k * 0.6));
    ctx.strokeStyle = `rgba(200,180,140,${0.8 * (1 - k)})`;
    ctx.lineWidth = 3 * v.zoom;
    ctx.stroke();
  }
}

export function drawGorilla(v: DrawView, g: Gorilla): void {
  if (g.state === 'gone') return;
  const { ctx } = v;
  const Z = v.zoom * GORILLA_K;
  const W = (c: string) => (g.flash > 0 ? '#FFFFFF' : c);
  const fall = g.state === 'fall' ? Math.min(1, g.t / GORILLA_FALL) : 0;
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  blob(ctx, v.px(g.x, g.y), v.py(g.x, g.y, 0), 6 * Z, 1.8 * Z);
  ctx.fill();
  ctx.save();
  ctx.translate(v.px(g.x, g.y), v.py(g.x, g.y, 0));
  if (fall > 0) {
    // A tumble, then off into the trees, fading.
    ctx.globalAlpha = fall > 0.5 ? 1 - (fall - 0.5) / 0.5 : 1;
    ctx.translate(g.face * fall * 14 * Z, 0);
    ctx.rotate(g.face * Math.min(1, fall * 2) * 1.2);
  }
  ctx.scale(g.face, 1);
  ctx.lineCap = 'round';
  const upright = g.state === 'sit' || g.state === 'warn' || g.state === 'windup';
  if (g.state === 'sit') drawSitting(ctx, g, Z, W);
  else if (upright) drawStanding(ctx, g, Z, W);
  else drawKnuckles(ctx, g, Z, W);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** The head, at hx, hy: a heavy brow, a bare grey face, small eyes, and the mouth open when it hoots or roars. */
function head(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  Z: number,
  open: number,
  W: (c: string) => string,
): void {
  ctx.fillStyle = W(FUR);
  blob(ctx, hx - 0.3 * Z, hy - 0.6 * Z, 2.2 * Z, 2.3 * Z);
  ctx.fill();
  ctx.fillStyle = W(SKIN);
  blob(ctx, hx + 0.8 * Z, hy + 0.2 * Z, 1.5 * Z, 1.6 * Z);
  ctx.fill();
  ctx.fillStyle = W(DARK);
  ctx.fillRect(hx - 0.4 * Z, hy - 1.3 * Z, 2.6 * Z, 0.6 * Z);
  ctx.fillStyle = '#E8C060';
  ctx.beginPath();
  ctx.arc(hx + 1.2 * Z, hy - 0.5 * Z, 0.28 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = DARK;
  blob(ctx, hx + 1.9 * Z, hy + 0.2 * Z, 0.35 * Z, 0.25 * Z);
  ctx.fill();
  if (open > 0) {
    ctx.fillStyle = '#7A2A2E';
    blob(ctx, hx + 1.4 * Z, hy + 1.2 * Z, 0.7 * Z, 0.55 * open * Z);
    ctx.fill();
  }
}

function drawSitting(
  ctx: CanvasRenderingContext2D,
  g: Gorilla,
  Z: number,
  W: (c: string) => string,
): void {
  // A heap of a body, legs out in front, one hand up to its mouth now and then.
  ctx.fillStyle = W(DARK);
  blob(ctx, 2 * Z, -0.8 * Z, 2.4 * Z, 1 * Z);
  ctx.fill();
  ctx.fillStyle = W(FUR);
  blob(ctx, 0, -5 * Z, 4.2 * Z, 4.8 * Z);
  ctx.fill();
  ctx.fillStyle = W(SKIN);
  blob(ctx, 1.4 * Z, -5 * Z, 1.9 * Z, 2.6 * Z);
  ctx.fill();
  if (g.silver) {
    ctx.fillStyle = W(SILVER);
    blob(ctx, -2.6 * Z, -5.2 * Z, 1.3 * Z, 2.6 * Z, 0.2);
    ctx.fill();
  }
  const munch = Math.sin(g.step * 1.6) > 0.2;
  ctx.strokeStyle = W(FUR);
  ctx.lineWidth = 1.7 * Z;
  ctx.beginPath();
  ctx.moveTo(2.4 * Z, -7 * Z);
  if (munch) ctx.quadraticCurveTo(4.6 * Z, -6 * Z, 3.2 * Z, -9 * Z);
  else ctx.lineTo(3.6 * Z, -1.2 * Z);
  ctx.stroke();
  head(ctx, 1.4 * Z, -10.4 * Z, Z, munch ? 0.4 : 0, W);
}

function drawStanding(
  ctx: CanvasRenderingContext2D,
  g: Gorilla,
  Z: number,
  W: (c: string) => string,
): void {
  const windup = g.state === 'windup';
  const k = windup ? Math.min(1, g.t / GORILLA_WINDUP) : 0;
  // Legs, short and bowed.
  ctx.strokeStyle = W(DARK);
  ctx.lineWidth = 1.9 * Z;
  for (const lx of [-1.4, 1.2]) {
    ctx.beginPath();
    ctx.moveTo(lx * Z, -5 * Z);
    ctx.lineTo((lx + 0.4) * Z, 0);
    ctx.stroke();
  }
  ctx.fillStyle = W(FUR);
  blob(ctx, 0, -9 * Z, 3.8 * Z, 5 * Z);
  ctx.fill();
  ctx.fillStyle = W(SKIN);
  blob(ctx, 1.3 * Z, -9.5 * Z, 2 * Z, 2.8 * Z);
  ctx.fill();
  if (g.silver) {
    ctx.fillStyle = W(SILVER);
    blob(ctx, -2.4 * Z, -9.5 * Z, 1.2 * Z, 3 * Z, 0.1);
    ctx.fill();
  }
  // Arms: beating its chest in turn, or both fists rising high over its head.
  ctx.strokeStyle = W(FUR);
  ctx.lineWidth = 1.9 * Z;
  ctx.fillStyle = W(DARK);
  for (const side of [-1, 1]) {
    const sx = side * 2.6 * Z;
    const sy = -12 * Z;
    let ex: number;
    let ey: number;
    if (windup) {
      // Up and out, a V over its head, higher as the slam comes.
      ex = side * (3 + k * 0.8) * Z + 0.6 * Z;
      ey = (-15 - k * 8) * Z;
    } else {
      const beat = Math.sin(g.t * 18 + (side > 0 ? 0 : Math.PI)) > 0;
      ex = (1.2 + (beat ? 1.4 : 2.6)) * Z;
      ey = (-10 + side * 0.8) * Z;
    }
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    blob(ctx, ex, ey, 1.1 * Z, 1 * Z);
    ctx.fill();
  }
  head(ctx, 1 * Z, -15.4 * Z, Z, windup ? 0.6 + k * 0.4 : Math.abs(Math.sin(g.t * 9)), W);
}

function drawKnuckles(
  ctx: CanvasRenderingContext2D,
  g: Gorilla,
  Z: number,
  W: (c: string) => string,
): void {
  const slam = g.state === 'slam';
  const walk = g.state === 'chase' || g.state === 'back';
  const s = walk ? Math.sin(g.step * 3) : 0;
  // Back legs, then the long front arms down to the knuckles, the far pair darker.
  for (const [far, sign] of [
    [true, -1],
    [false, 1],
  ] as const) {
    ctx.strokeStyle = W(far ? DARK : FUR);
    ctx.lineWidth = 1.8 * Z;
    ctx.beginPath();
    ctx.moveTo(-2.8 * Z, -4.2 * Z);
    ctx.lineTo((-3.2 + s * sign * 0.9) * Z, 0);
    ctx.stroke();
    ctx.lineWidth = 2 * Z;
    ctx.beginPath();
    ctx.moveTo(2.4 * Z, -6.6 * Z);
    const reach = slam ? 4.6 : 3.4 - s * sign * 0.9;
    ctx.lineTo(reach * Z, 0);
    ctx.stroke();
    ctx.fillStyle = W(DARK);
    blob(ctx, reach * Z, -0.4 * Z, 0.9 * Z, 0.7 * Z);
    ctx.fill();
  }
  // The body, shoulders high in front, sloping down to the rump.
  ctx.fillStyle = W(FUR);
  blob(ctx, 0, -5.4 * Z, 4.6 * Z, 2.9 * Z, -0.25);
  ctx.fill();
  if (g.silver) {
    ctx.fillStyle = W(SILVER);
    blob(ctx, -1.2 * Z, -7.2 * Z, 2.8 * Z, 0.9 * Z, -0.25);
    ctx.fill();
  }
  head(ctx, 4.2 * Z, -7.6 * Z, Z, slam ? 1 : 0, W);
}
