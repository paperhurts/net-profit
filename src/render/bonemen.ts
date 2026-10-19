/**
 * Skrill's men (entities/bonemen.ts): men in armour made of bones over dark leathers, a skull for a helmet with a red
 * glint in each eye, a rib cage over the chest, bone pads on the shoulders and shins; in the right hand a jawblade, a
 * great curved jawbone with its teeth along the edge. Drawing back, the jawblade goes up over the shoulder; sweeping,
 * it goes out across in front. On the ground, the warning: a red fan where the sweep will go. Beaten, the armour falls
 * apart into a heap of bones with the skull on top.
 */

import {
  BONE_FALL,
  BONE_RISE,
  BONE_WINDUP,
  type BoneMan,
  SWEEP_ARC,
  SWEEP_R,
} from '../entities/bonemen';
import type { DrawView } from '../entities/entity';

const BONE = '#EDE6D2';
const BONE_EDGE = 'rgba(70,58,44,.85)';
const LEATHER = '#3A2E2A';
const PIT = '#120E0C';

/** One of Skrill's men where he stands, or what is left of him. */
export function drawBoneMan(v: DrawView, m: BoneMan): void {
  const { ctx, px, py, T, zoom: Z } = v;
  const sx = px(m.x, m.y);
  const sy = py(m.x, m.y);
  const fall = m.state === 'gone' ? 1 : m.state === 'fall' ? Math.min(1, m.t / BONE_FALL) : 0;
  // His shadow; then, beaten, the heap of bones grows as he falls apart.
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 14 * Z, 5.5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  if (fall > 0) heap(ctx, sx, sy, Z, fall, m.step);
  if (fall >= 1) return;
  const face = px(m.x + Math.cos(m.h), m.y + Math.sin(m.h)) >= sx ? 1 : -1;
  const rise = m.state === 'rise' ? Math.min(1, m.t / BONE_RISE) : 1;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(face * Z, Z * (1 - fall));
  ctx.globalAlpha = 1 - fall * 0.6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const walking = m.state === 'chase' || m.state === 'back';
  const swing = walking ? Math.sin(m.step * 8) : 0;
  const flash = m.flash > 0;
  // Legs in dark leathers, bone pads on the shins.
  for (const s of [-1, 1]) {
    const lx = s * 4 + swing * s * 2.5;
    ctx.fillStyle = LEATHER;
    ctx.fillRect(lx - 2.5, -16, 5, 16);
    ctx.fillStyle = flash ? '#FFFFFF' : BONE;
    ctx.strokeStyle = BONE_EDGE;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(lx - 2.8, -10, 5.6, 7, 1.5);
    ctx.fill();
    ctx.stroke();
  }
  // The body in leathers, a rib cage of bone over the chest, a pelvis bone at the belt.
  ctx.fillStyle = LEATHER;
  ctx.beginPath();
  ctx.roundRect(-7, -36, 14, 21, 3);
  ctx.fill();
  ctx.strokeStyle = flash ? '#FFFFFF' : BONE;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(0, -19);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const y = -31 + i * 3.6;
    ctx.beginPath();
    ctx.moveTo(-6, y + 1.5);
    ctx.quadraticCurveTo(-3, y - 1, 0, y);
    ctx.quadraticCurveTo(3, y - 1, 6, y + 1.5);
    ctx.stroke();
  }
  ctx.fillStyle = flash ? '#FFFFFF' : BONE;
  ctx.strokeStyle = BONE_EDGE;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-6, -18);
  ctx.quadraticCurveTo(0, -12, 6, -18);
  ctx.lineTo(4, -15);
  ctx.quadraticCurveTo(0, -12.5, -4, -15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The back arm, hanging; the front one holds the jawblade.
  ctx.strokeStyle = LEATHER;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-6, -33);
  ctx.lineTo(-8 - swing * 2, -20);
  ctx.stroke();
  // Shoulder pads of bone.
  ctx.fillStyle = flash ? '#FFFFFF' : BONE;
  ctx.strokeStyle = BONE_EDGE;
  ctx.lineWidth = 0.8;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 7, -34, 4.2, 2.6, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // The skull helmet: a skull over his head, dark eye holes with a red glint in them.
  ctx.fillStyle = flash ? '#FFFFFF' : BONE;
  ctx.beginPath();
  ctx.arc(1, -44, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-2.5, -40, 7, 5, 1.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PIT;
  for (const ex of [0.5, 4.5]) {
    ctx.beginPath();
    ctx.arc(ex, -44.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  const glint = 0.55 + 0.45 * Math.sin(T * 5 + m.step);
  ctx.fillStyle = `rgba(255,70,50,${(m.state === 'guard' ? 0.4 : 1) * glint})`;
  for (const ex of [0.5, 4.5]) ctx.fillRect(ex - 0.6, -45, 1.2, 1.2);
  ctx.fillStyle = PIT;
  for (let i = 0; i < 3; i++) ctx.fillRect(-1 + i * 2, -38.5, 0.8, 2.5);
  // The front arm and the jawblade: low and ready, drawn back over the shoulder, or swept out in front.
  const k = m.state === 'windup' ? Math.min(1, m.t / BONE_WINDUP) : 0;
  const ang =
    m.state === 'windup'
      ? -0.4 - 1.9 * k
      : m.state === 'sweep'
        ? 0.55
        : m.state === 'rise'
          ? -0.2 - 0.6 * rise
          : m.state === 'recover'
            ? 0.4
            : 0.9 + swing * 0.15;
  const hx = 6 + Math.cos(ang) * 10;
  const hy = -32 + Math.sin(ang) * 10;
  ctx.strokeStyle = LEATHER;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(6, -33);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  jawblade(ctx, hx, hy, ang, flash);
  ctx.restore();
}

/** A jawblade in the hand at (x, y), pointing along a: a curved jawbone, its teeth along the inside of the curve. */
function jawblade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  a: number,
  flash: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = flash ? '#FFFFFF' : BONE;
  ctx.strokeStyle = BONE_EDGE;
  ctx.lineWidth = 0.9;
  // The bone: thick at the grip, curving round to a hooked end.
  ctx.beginPath();
  ctx.moveTo(-2, -2);
  ctx.quadraticCurveTo(10, -9, 20, -4);
  ctx.quadraticCurveTo(24, -1, 22, 3);
  ctx.quadraticCurveTo(14, -2, 2, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Its teeth, along the inner edge.
  ctx.fillStyle = '#F8F4E8';
  for (let i = 0; i < 4; i++) {
    const tx = 6 + i * 3.8;
    const ty = 0.6 - (i === 3 ? 0.6 : 0);
    ctx.beginPath();
    ctx.moveTo(tx - 1.3, ty);
    ctx.lineTo(tx, ty + 3);
    ctx.lineTo(tx + 1.3, ty);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // The grip, bound in leather.
  ctx.fillStyle = LEATHER;
  ctx.fillRect(-3, -2.2, 4, 4.4);
  ctx.restore();
}

/** A heap of bones, growing as k goes to 1, with the skull helmet rolled on top. */
function heap(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  Z: number,
  k: number,
  seed: number,
): void {
  ctx.strokeStyle = BONE;
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.2 * Z;
  const n = Math.round(2 + k * 6);
  for (let i = 0; i < n; i++) {
    const a = seed * 1.7 + i * 2.3;
    const r = (3 + (i % 3) * 3.5) * Z;
    const cx = sx + Math.cos(a) * r;
    const cy = sy - 2 * Z + Math.sin(a) * r * 0.4;
    const da = a * 1.3;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(da) * 5 * Z, cy - Math.sin(da) * 2 * Z);
    ctx.lineTo(cx + Math.cos(da) * 5 * Z, cy + Math.sin(da) * 2 * Z);
    ctx.stroke();
  }
  if (k < 0.5) return;
  ctx.fillStyle = BONE;
  ctx.strokeStyle = BONE_EDGE;
  ctx.lineWidth = 0.8 * Z;
  ctx.beginPath();
  ctx.arc(sx + 3 * Z, sy - 7 * Z, 5 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PIT;
  for (const ex of [1.5, 4.5]) {
    ctx.beginPath();
    ctx.arc(sx + ex * Z, sy - 7.5 * Z, 1.2 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The warning on the ground while he draws back, and the sweep itself: a red fan in front of him. */
export function drawBoneMark(v: DrawView, m: BoneMan): void {
  if (m.state !== 'windup' && m.state !== 'sweep') return;
  const { ctx, px, py, zoom: Z } = v;
  const k = m.state === 'windup' ? Math.min(1, m.t / BONE_WINDUP) : 1;
  ctx.fillStyle = `rgba(220,60,50,${m.state === 'sweep' ? 0.55 : 0.12 + 0.3 * k})`;
  ctx.strokeStyle = `rgba(255,120,90,${0.4 + 0.5 * k})`;
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(px(m.x, m.y), py(m.x, m.y));
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = m.h - SWEEP_ARC + (2 * SWEEP_ARC * i) / n;
    const x = m.x + Math.cos(a) * SWEEP_R;
    const y = m.y + Math.sin(a) * SWEEP_R;
    ctx.lineTo(px(x, y), py(x, y));
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
