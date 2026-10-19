/**
 * The tar creatures (entities/tarfolk.ts), as black and glossy as the tar they came out of, a pale sheen along them,
 * dripping, with yellow eyes: a tar human, man-shaped and slumped, long arms hanging, which raises them over its head
 * into one great glob to slam; and a tar beast, low on four legs with a ridge of spikes down its back, which crouches
 * and lunges. On the ground, the warning: a ring where a tar human's slam will land, a lane where a beast will lunge.
 * Beaten, each melts down into a puddle.
 */

import type { DrawView } from '../entities/entity';
import { TAR_MELT, TAR_RISE, TAR_SPEC, type TarFolk } from '../entities/tarfolk';
import { tarIsleZ } from '../world/tarisle';

const TAR = '#0B090E';
const RIM = 'rgba(200,180,230,.7)';
const EYE = '#F2E27A';

/** One tar creature where it stands. */
export function drawTarFolk(v: DrawView, f: TarFolk): void {
  if (f.state === 'gone') return;
  const { ctx, px, py, T, zoom: Z } = v;
  const sx = px(f.x, f.y);
  const sy = py(f.x, f.y, tarIsleZ(f.x, f.y));
  // Which way it faces on the screen.
  const face = px(f.x + Math.cos(f.h), f.y + Math.sin(f.h)) >= sx ? 1 : -1;
  const melt = f.state === 'melt' ? Math.min(1, f.t / TAR_MELT) : 0;
  const rise = f.state === 'rise' ? Math.min(1, f.t / TAR_RISE) : 1;
  // Its puddle, and its shadow.
  ctx.fillStyle = melt > 0 ? 'rgba(10,8,14,.9)' : 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, (16 + melt * 16) * Z, (6 + melt * 6) * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  if (melt >= 1) return;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(face * Z, Z * (1 - melt) * (0.6 + 0.4 * rise));
  // Struck, it shows pale for a moment.
  const body = f.flash > 0 ? '#E6DCF0' : TAR;
  ctx.fillStyle = body;
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 1.2 / Z;
  if (f.kind === 'human') human(ctx, f, T, body);
  else beast(ctx, f, T, body);
  ctx.restore();
  // Drips falling off it.
  ctx.fillStyle = TAR;
  for (let i = 0; i < 3; i++) {
    const k = (T * 0.9 + i / 3 + f.step * 0.1) % 1;
    const dx = (i - 1) * 8 * Z;
    ctx.beginPath();
    ctx.arc(sx + dx, sy - (24 - k * 22) * Z, (1.6 - k * 0.6) * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A tar human, drawn facing right at (0, 0) on the ground. */
function human(ctx: CanvasRenderingContext2D, f: TarFolk, T: number, body: string): void {
  const walking = f.state === 'chase' || f.state === 'back';
  const sway = walking ? Math.sin(f.step * 7) * 3 : Math.sin(T * 1.5 + f.step) * 1;
  const up = f.state === 'windup' ? Math.min(1, f.t / TAR_SPEC.human.windup) : 0;
  const slam = f.state === 'strike';
  // Legs, thick and stubby.
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 5 + (walking ? s * sway * 0.4 : 0), -6, 4, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // The body, slumped, wider at the shoulders.
  ctx.beginPath();
  ctx.moveTo(-7, -10);
  ctx.quadraticCurveTo(-11, -26, -9, -36);
  ctx.quadraticCurveTo(0, -42, 9, -36);
  ctx.quadraticCurveTo(11, -26, 7, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The head, hunched forward.
  ctx.beginPath();
  ctx.arc(3, -43, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Arms: hanging and swinging; raised over the head into one glob; slammed down in front.
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = body;
  if (up > 0) {
    ctx.beginPath();
    ctx.moveTo(-8, -34);
    ctx.lineTo(-2, -34 - 20 * up);
    ctx.moveTo(8, -34);
    ctx.lineTo(4, -34 - 20 * up);
    ctx.stroke();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(1, -38 - 22 * up, 6 + 4 * up, 0, Math.PI * 2);
    ctx.fill();
  } else if (slam) {
    ctx.beginPath();
    ctx.moveTo(8, -32);
    ctx.lineTo(20, -4);
    ctx.moveTo(-6, -32);
    ctx.lineTo(16, -4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(19, -3, 8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-9, -33);
    ctx.lineTo(-12 - sway * 0.5, -12);
    ctx.moveTo(9, -33);
    ctx.lineTo(12 + sway * 0.5, -12);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  eyes(ctx, f, 6, -44, 3.2);
}

/** A tar beast, drawn facing right at (0, 0) on the ground. */
function beast(ctx: CanvasRenderingContext2D, f: TarFolk, T: number, body: string): void {
  const walking = f.state === 'chase' || f.state === 'back' || f.state === 'flee';
  const crouch = f.state === 'windup' ? Math.min(1, f.t / TAR_SPEC.beast.windup) : 0;
  const stretch = f.state === 'strike' ? 1.25 : 1;
  const gait = walking ? f.step * (f.state === 'flee' ? 11 : 8) : 0;
  const low = -16 + crouch * 6;
  // Four legs, stepping.
  for (const [lx, ph] of [
    [-12, 0],
    [-6, Math.PI],
    [10, Math.PI],
    [16, 0],
  ] as const) {
    const swing = walking ? Math.sin(gait + ph) * 3 : 0;
    ctx.beginPath();
    ctx.moveTo((lx - 2) * stretch, low + 4);
    ctx.lineTo((lx + swing - 2) * stretch, 0);
    ctx.lineTo((lx + swing + 2) * stretch, 0);
    ctx.lineTo((lx + 2) * stretch, low + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // The body, long and low, a tail behind.
  ctx.beginPath();
  ctx.ellipse(0, low, 22 * stretch, 10 - crouch * 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-20 * stretch, low - 2);
  ctx.quadraticCurveTo(
    -32 * stretch,
    low - 6 + Math.sin(T * 4 + f.step) * 3,
    -36 * stretch,
    low + 4,
  );
  ctx.lineWidth = 3;
  ctx.strokeStyle = body;
  ctx.stroke();
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 1;
  // A ridge of spikes down its back.
  ctx.fillStyle = body;
  for (let i = 0; i < 5; i++) {
    const x = (-14 + i * 6) * stretch;
    ctx.beginPath();
    ctx.moveTo(x - 3, low - 8);
    ctx.lineTo(x, low - 16 - (i % 2) * 3);
    ctx.lineTo(x + 3, low - 8);
    ctx.closePath();
    ctx.fill();
  }
  // The head, low and forward, its jaws open while it lunges.
  const hx = 24 * stretch;
  const hy = low + 2 + crouch * 2;
  ctx.beginPath();
  ctx.ellipse(hx, hy, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (f.state === 'strike' || crouch > 0.6) {
    ctx.fillStyle = '#5A1E2A';
    ctx.beginPath();
    ctx.moveTo(hx + 2, hy + 1);
    ctx.lineTo(hx + 11, hy - 2);
    ctx.lineTo(hx + 11, hy + 5);
    ctx.closePath();
    ctx.fill();
  }
  eyes(ctx, f, hx + 3, hy - 3, 2.6);
}

/** Two yellow eyes, flaring as it rises and winds up. */
function eyes(ctx: CanvasRenderingContext2D, f: TarFolk, x: number, y: number, r: number): void {
  const flare = f.state === 'rise' || f.state === 'windup' ? 1.5 : 1;
  ctx.fillStyle = 'rgba(242,226,122,.25)';
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4 * flare, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = EYE;
  for (const dx of [-r * 1.1, r * 0.9]) {
    ctx.beginPath();
    ctx.arc(x + dx, y, r * 0.55 * flare, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The warning on the ground while one winds up, and the blow landing: a ring for a tar human, a lane for a beast. */
export function drawTarMark(v: DrawView, f: TarFolk): void {
  if (f.state !== 'windup' && f.state !== 'strike') return;
  const { ctx, px, py, zoom: Z } = v;
  const spec = TAR_SPEC[f.kind];
  const k = f.state === 'windup' ? Math.min(1, f.t / spec.windup) : 1;
  const a = f.state === 'strike' ? 0.55 : 0.12 + 0.3 * k;
  ctx.fillStyle = `rgba(220,60,50,${a})`;
  ctx.strokeStyle = `rgba(255,120,90,${0.4 + 0.5 * k})`;
  ctx.lineWidth = 2 * Z;
  if (f.kind === 'human') {
    v.isoEllipse(f.from[0], f.from[1], spec.wide, tarIsleZ(f.from[0], f.from[1]));
    ctx.fill();
    ctx.stroke();
    return;
  }
  const dx = f.to[0] - f.from[0];
  const dy = f.to[1] - f.from[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = (-dy / L) * spec.wide;
  const ny = (dx / L) * spec.wide;
  const at = (x: number, y: number): [number, number] => [px(x, y), py(x, y, tarIsleZ(x, y))];
  ctx.beginPath();
  ctx.moveTo(...at(f.from[0] + nx, f.from[1] + ny));
  ctx.lineTo(...at(f.to[0] + nx, f.to[1] + ny));
  ctx.lineTo(...at(f.to[0] - nx, f.to[1] - ny));
  ctx.lineTo(...at(f.from[0] - nx, f.from[1] - ny));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
