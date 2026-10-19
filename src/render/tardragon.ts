/**
 * The tar dragon (entities/tardragon.ts): black and glossy as the tar, a pale rim round it, two great bat wings, a row
 * of six legs under its long body, a horned head on a long neck with burning amber eyes, and a long tail dripping tar.
 * Up high it flaps slowly, its legs curled up; hanging to swoop its wings go up; swooping they sweep back; down on the
 * ground it stands on its legs, wings folded, and pants. Its shadow on the ground shows where it is and how high. On the
 * ground the warnings: three red rings where its tar will land, a red lane where it will swoop.
 */

import type { DrawView } from '../entities/entity';
import {
  AIM_T,
  BALL_R,
  BALL_T,
  DRAGON_MELT,
  SHRIEK_T,
  SPIT_WINDUP,
  SWOOP_W,
  type TarDragon,
} from '../entities/tardragon';
import { tarIsleZ } from '../world/tarisle';

const TAR = '#0B090E';
const WING = '#15111A';
const RIM = 'rgba(200,180,230,.75)';
const EYE = '#FFC23A';
/** How much bigger than its drawing's units it is drawn. */
const SCALE = 1.6;
/** How high its body stands off the ground on its legs. */
const STAND = 12;

/** Its shadow on the ground under it: small and faint up high, dark down low. */
export function drawDragonShadow(v: DrawView, D: TarDragon): void {
  if (D.state === 'gone') return;
  const { ctx, px, py, zoom: Z } = v;
  const up = Math.min(1, D.z / 120);
  ctx.fillStyle = `rgba(0,0,0,${0.42 - up * 0.16})`;
  ctx.beginPath();
  ctx.ellipse(
    px(D.x, D.y),
    py(D.x, D.y, tarIsleZ(D.x, D.y)),
    (40 - up * 10) * Z,
    (14 - up * 3) * Z,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

/** The tar dragon, up in the air or down on the ground. */
export function drawTarDragon(v: DrawView, D: TarDragon): void {
  if (D.state === 'gone') return;
  const { ctx, px, py, T, zoom: Z } = v;
  const gz = tarIsleZ(D.x, D.y);
  const melt = D.state === 'melt' && D.z <= 0 ? Math.min(1, D.t / DRAGON_MELT) : 0;
  if (melt >= 1) return;
  const sx = px(D.x, D.y);
  const face = px(D.x + Math.cos(D.h), D.y + Math.sin(D.h)) >= sx ? 1 : -1;
  const down = D.state === 'landed' || (D.state === 'melt' && D.z <= 0);
  const body = D.flash > 0 ? '#E6DCF0' : TAR;
  // The wings: flapping slowly up high, up over its back hanging to swoop, swept back swooping, folded on the ground.
  const flap =
    D.state === 'aim'
      ? 1.1
      : D.state === 'swoop'
        ? 0.25
        : down
          ? 0.15
          : D.state === 'shriek'
            ? 0.6 + 0.5 * Math.sin(T * 14)
            : 0.55 + 0.45 * Math.sin(T * 4.5);
  const spit = D.state === 'spit' ? Math.min(1, D.t / SPIT_WINDUP) : 0;
  ctx.save();
  ctx.translate(sx, py(D.x, D.y, gz + D.z + (down ? STAND : 0) * (1 - melt)));
  ctx.scale(face * Z * SCALE, Z * SCALE * (1 - melt));
  ctx.lineWidth = 1.1 / (Z * SCALE);
  ctx.strokeStyle = RIM;
  // The far wing, behind it.
  wing(ctx, flap, -3, '#0E0B12');
  // The tail, long and tapering, swinging, a drip of tar off its tip.
  const sway = Math.sin(T * 2.2) * 4;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-12, -3);
  ctx.quadraticCurveTo(-30, 2 + sway, -46, sway * 1.6 + 4);
  ctx.quadraticCurveTo(-30, 6 + sway, -12, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-46, sway * 1.6 + 6 + ((T * 2) % 1) * 4, 1.4, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Six legs: curled up under it flying, standing on them on the ground.
  ctx.strokeStyle = body;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const lx = -10 + (i >> 1) * 9 + (i & 1) * 2.5;
    const kick = down ? 0 : Math.sin(T * 5 + i) * 1.5;
    ctx.beginPath();
    ctx.moveTo(lx, 4);
    if (down) {
      ctx.lineTo(lx + 3, 8);
      ctx.lineTo(lx + 1, STAND + 2);
    } else {
      ctx.lineTo(lx - 2, 9 + kick);
      ctx.lineTo(lx - 6, 8 + kick);
    }
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 1.1 / (Z * SCALE);
  // The body, long and low, and the neck up to its head.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const nod = D.state === 'aim' ? 6 : spit > 0 ? -4 * spit : D.state === 'shriek' ? -5 : 0;
  ctx.beginPath();
  ctx.moveTo(10, -5);
  ctx.quadraticCurveTo(22, -12 + nod * 0.5, 26, -16 + nod);
  ctx.lineTo(30, -12 + nod);
  ctx.quadraticCurveTo(22, -4, 13, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The head: a long snout, two horns back off it.
  const hy = -16 + nod;
  ctx.beginPath();
  ctx.moveTo(23, hy - 3);
  ctx.quadraticCurveTo(30, hy - 7, 40, hy + 1);
  ctx.lineTo(39, hy + 3);
  ctx.quadraticCurveTo(30, hy + 5, 24, hy + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(25, hy - 3);
  ctx.lineTo(17, hy - 11);
  ctx.lineTo(27, hy - 5);
  ctx.moveTo(28, hy - 4);
  ctx.lineTo(22, hy - 13);
  ctx.lineTo(30, hy - 5);
  ctx.fill();
  // Its throat glowing as it rears back to spit; a gape as it shrieks.
  if (spit > 0) {
    ctx.fillStyle = `rgba(255,140,40,${0.25 + 0.5 * spit})`;
    ctx.beginPath();
    ctx.arc(18, -8 + nod * 0.5, 3 + 4 * spit, 0, Math.PI * 2);
    ctx.fill();
  }
  if (D.state === 'shriek' && D.t < SHRIEK_T) {
    ctx.fillStyle = '#3A0E14';
    ctx.beginPath();
    ctx.moveTo(31, hy + 1);
    ctx.lineTo(40, hy + 6);
    ctx.lineTo(38, hy + 2);
    ctx.closePath();
    ctx.fill();
  }
  // Burning eyes, brighter as it winds up.
  const flare = D.state === 'spit' || D.state === 'aim' || D.state === 'shriek' ? 1.5 : 1;
  ctx.fillStyle = 'rgba(255,194,58,.3)';
  ctx.beginPath();
  ctx.arc(31, hy - 1.5, 4 * flare, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = EYE;
  ctx.beginPath();
  ctx.arc(31, hy - 1.5, 1.4 * flare, 0, Math.PI * 2);
  ctx.fill();
  // The near wing, over its back.
  wing(ctx, flap, 3, body === TAR ? WING : body);
  // Panting, down on the ground.
  if (down && melt === 0 && Math.sin(T * 8) > 0.3) {
    ctx.fillStyle = 'rgba(200,190,220,.35)';
    ctx.beginPath();
    ctx.arc(43, hy + 1, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A bat wing off its shoulder, opened by `open` (0 folded to 1 up over its back), drawn `dx` along it. */
function wing(ctx: CanvasRenderingContext2D, open: number, dx: number, fill: string): void {
  const up = 14 + open * 36;
  const back = 10 + open * 20;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(dx + 4, -5);
  ctx.lineTo(dx - 2, -5 - up * 0.7);
  ctx.lineTo(dx - back, -5 - up);
  ctx.lineTo(dx - back - 8, -4 - up * 0.55);
  ctx.quadraticCurveTo(dx - back - 4, -4 - up * 0.4, dx - back - 12, -3 - up * 0.2);
  ctx.quadraticCurveTo(dx - back - 6, -3, dx - 10, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(dx - 2, -5 - up * 0.7);
  ctx.lineTo(dx - back - 8, -4 - up * 0.55);
  ctx.moveTo(dx - 2, -5 - up * 0.7);
  ctx.lineTo(dx - back - 12, -3 - up * 0.2);
  ctx.stroke();
}

/** The warnings on the ground: the rings its tar will land in, the lane it will swoop down. */
export function drawDragonMark(v: DrawView, D: TarDragon): void {
  const { ctx, px, py, zoom: Z } = v;
  if ((D.state === 'spit' || D.state === 'volley') && D.balls.length) {
    const k =
      D.state === 'spit'
        ? Math.min(1, D.t / SPIT_WINDUP) * 0.6
        : 0.6 + 0.4 * Math.min(1, D.t / BALL_T);
    ctx.fillStyle = `rgba(220,60,50,${0.12 + 0.35 * k})`;
    ctx.strokeStyle = `rgba(255,120,90,${0.4 + 0.5 * k})`;
    ctx.lineWidth = 2 * Z;
    for (const b of D.balls) {
      v.isoEllipse(b.x, b.y, BALL_R, tarIsleZ(b.x, b.y));
      ctx.fill();
      ctx.stroke();
    }
    return;
  }
  if (D.state !== 'aim' && D.state !== 'swoop') return;
  const k = D.state === 'aim' ? Math.min(1, D.t / AIM_T) : 1;
  ctx.fillStyle = `rgba(220,60,50,${D.state === 'swoop' ? 0.5 : 0.12 + 0.3 * k})`;
  ctx.strokeStyle = `rgba(255,120,90,${0.4 + 0.5 * k})`;
  ctx.lineWidth = 2 * Z;
  const dx = D.to.x - D.from.x;
  const dy = D.to.y - D.from.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = (-dy / L) * SWOOP_W;
  const ny = (dx / L) * SWOOP_W;
  // Along the ground, over the hill: each side in steps, so it lies on the slope.
  const N = 10;
  const at = (i: number, s: number): [number, number] => {
    const x = D.from.x + (dx * i) / N + nx * s;
    const y = D.from.y + (dy * i) / N + ny * s;
    return [px(x, y), py(x, y, tarIsleZ(x, y))];
  };
  ctx.beginPath();
  ctx.moveTo(...at(0, 1));
  for (let i = 1; i <= N; i++) ctx.lineTo(...at(i, 1));
  for (let i = N; i >= 0; i--) ctx.lineTo(...at(i, -1));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** Its three balls of tar, in the air on their way into their rings. */
export function drawDragonBalls(v: DrawView, D: TarDragon): void {
  if (D.state !== 'volley') return;
  const { ctx, px, py, zoom: Z } = v;
  const k = Math.min(1, D.t / BALL_T);
  for (const b of D.balls) {
    const p = D.ballAt(b, k);
    const sx = px(p.x, p.y);
    const sy = py(p.x, p.y, tarIsleZ(p.x, p.y) + p.z);
    ctx.fillStyle = TAR;
    ctx.strokeStyle = 'rgba(255,140,40,.8)';
    ctx.lineWidth = 1.4 * Z;
    ctx.beginPath();
    ctx.arc(sx, sy, 6 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
