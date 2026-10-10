/**
 * The lurker, side on: a long black fish with a big underslung jaw full of
 * needle teeth, a row of faint lights down its side and two pale eyes. Its body
 * is drawn under the dark, so only the diver's lamp shows its shape when it is
 * close; its eyes and lights are drawn over the dark, so they are what is seen
 * coming out of it. In its warning the eyes flare orange and the teeth catch
 * the light as the jaw drops.
 */

import type { Lurker } from '../entities/lurker';
import { LENGTH } from '../entities/lurker';

type Proj = (v: number) => number;

/** Just lighter than the deep water, so the lamp picks out its shape and the dark hides it. */
const BODY = '#24333F';
const EDGE = '#3E5868';
const FIN = '#1B2A36';
const TOOTH = '#E8F1F2';
const EYE = '#C8FF6A';
const FLARE = '#FF7A3D';

/** Into its own frame: head at the origin, facing +x, kept the right way up whichever way it swims. */
function frame(ctx: CanvasRenderingContext2D, X: Proj, Y: Proj, s: number, l: Lurker): void {
  ctx.translate(X(l.x), Y(l.y));
  ctx.rotate(l.a);
  const flip = Math.cos(l.a) < 0 ? -1 : 1;
  // Its shape is drawn 150 long, scaled to its length.
  const k = (LENGTH / 150) * s;
  ctx.scale(k, k * flip);
}

/** Its body and jaw, under the dark. */
export function drawLurker(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  l: Lurker,
  T: number,
): void {
  if (l.state === 'hide') return;
  ctx.save();
  frame(ctx, X, Y, s, l);
  const L = 150;
  const wave = Math.sin(T * 3) * 6;
  ctx.fillStyle = BODY;
  // A long body, deep behind the head and tapering to the tail, waving as it swims.
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.quadraticCurveTo(-18, -20, -45, -18);
  ctx.quadraticCurveTo(-L * 0.7, -12 + wave * 0.5, -L, -3 + wave);
  ctx.lineTo(-L, 3 + wave);
  ctx.quadraticCurveTo(-L * 0.7, 12 + wave * 0.5, -45, 16);
  ctx.quadraticCurveTo(-20, 14, -8, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Tail fin and a fin on its back.
  ctx.fillStyle = FIN;
  ctx.beginPath();
  ctx.moveTo(-L + 4, wave);
  ctx.lineTo(-L - 18, -14 + wave);
  ctx.lineTo(-L - 12, wave);
  ctx.lineTo(-L - 18, 14 + wave);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-70, -16);
  ctx.lineTo(-92, -30);
  ctx.lineTo(-100, -12);
  ctx.closePath();
  ctx.fill();
  // The lower jaw, hinged under the eye, dropping open.
  const open = l.mouth * 0.75;
  ctx.save();
  ctx.translate(-14, 4);
  ctx.rotate(open);
  ctx.fillStyle = BODY;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(18, 2);
  ctx.lineTo(16, 7);
  ctx.lineTo(0, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

/** Its eyes, side lights and, with the jaw down, its teeth: over the dark. */
export function drawLurkerGlow(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  l: Lurker,
  T: number,
): void {
  if (l.state === 'hide') return;
  ctx.save();
  frame(ctx, X, Y, s, l);
  ctx.globalCompositeOperation = 'lighter';
  const warn = l.state === 'tell' || l.state === 'lunge';
  // Fading as it goes back into the dark.
  ctx.globalAlpha = l.state === 'back' || l.state === 'flee' ? Math.max(0, Math.min(1, l.t)) : 1;
  // A row of lights down its side, pulsing one after another.
  for (let i = 0; i < 8; i++) {
    const k = 0.4 + 0.4 * Math.sin(T * 3 - i * 0.7);
    ctx.fillStyle = `rgba(95,243,255,${k * 0.7})`;
    ctx.beginPath();
    ctx.arc(-30 - i * 13, 6 - i * 0.3, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Two eyes, the near one big and the far one peeking over its head.
  const c = warn ? FLARE : EYE;
  const r = warn ? 6.5 : 5;
  for (const [ex, ey, er] of [
    [-10, -6, r],
    [-4, -11, r * 0.7],
  ] as const) {
    const halo = ctx.createRadialGradient(ex, ey, 0, ex, ey, er * 4);
    halo.addColorStop(0, warn ? 'rgba(255,122,61,.6)' : 'rgba(200,255,106,.45)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(ex, ey, er * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
  }
  // Needle teeth along both jaws, catching the light as the jaw drops.
  if (l.mouth > 0.2) {
    ctx.strokeStyle = TOOTH;
    ctx.globalAlpha *= Math.min(1, l.mouth);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.moveTo(-2 - i * 3, 2);
      ctx.lineTo(-1 - i * 3, 7);
    }
    ctx.stroke();
    ctx.save();
    ctx.translate(-14, 4);
    ctx.rotate(l.mouth * 0.75);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.moveTo(4 + i * 3, 2);
      ctx.lineTo(4.5 + i * 3, -4);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
