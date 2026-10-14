/**
 * The treasure submarine's dive, side on (world/subsea.ts): a patch of the far deep's sea floor, rolling sand with
 * rocks half sunk in it; and the submarine itself, round and yellow, with a little tower on top and a periscope, three
 * round windows with the figure looking out of the middle one, a propeller spinning at the back, a claw folded
 * underneath, and a headlamp at the front that throws a beam ahead into the dark.
 */

import type { Diver } from '../entities/diver';

type Proj = (v: number) => number;

const HULL = '#F2C230';
const HULL_DARK = '#C9971C';
const TRIM = '#E0602E';
const GLASS = '#9FE3F5';
const STEEL = '#5A6268';

/** The sea floor across the scene, from its line down past the bottom of the screen; rocks half sunk in it. */
export function drawSeabed(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  w: number,
  bottom: number,
  floor: (x: number) => number,
): void {
  const g = ctx.createLinearGradient(0, Y(400), 0, Y(1250));
  g.addColorStop(0, '#B8A273');
  g.addColorStop(1, '#3A3424');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(X(-20), Y(bottom + 60));
  for (let x = -20; x <= w + 20; x += 12) ctx.lineTo(X(x), Y(floor(x)));
  ctx.lineTo(X(w + 20), Y(bottom + 60));
  ctx.closePath();
  ctx.fill();
  // Ripples in the sand, and its edge a little lighter.
  ctx.strokeStyle = 'rgba(255,240,200,.18)';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  for (let x = -20; x <= w + 20; x += 12) {
    const y = floor(x);
    if (x === -20) ctx.moveTo(X(x), Y(y));
    else ctx.lineTo(X(x), Y(y));
  }
  ctx.stroke();
  for (let x = 30; x < w; x += 70) {
    const y = floor(x) + 14 + ((x * 7) % 11);
    ctx.strokeStyle = 'rgba(40,30,15,.25)';
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(X(x - 14), Y(y));
    ctx.quadraticCurveTo(X(x), Y(y - 4), X(x + 14), Y(y));
    ctx.stroke();
  }
  for (let x = 90; x < w; x += 170 + ((x * 13) % 90)) {
    const r = 14 + ((x * 3) % 16);
    ctx.fillStyle = '#4A4E52';
    ctx.beginPath();
    ctx.ellipse(X(x), Y(floor(x) + r * 0.3), r * 1.3 * s, r * s, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.ellipse(
      X(x - r * 0.3),
      Y(floor(x) - r * 0.2),
      r * 0.5 * s,
      r * 0.3 * s,
      -0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

/** The submarine at screen (sx, sy), this big, facing and tilting as it drives; its beam is drawn by drawSubBeam. */
export function drawSub(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  k: number,
  d: Diver,
  T: number,
): void {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(d.face, 1);
  // Nose down a little going down, up going up.
  ctx.rotate(Math.max(-0.25, Math.min(0.25, d.vy / 400)) * d.face);
  // The propeller at the back, spinning: its blades flick round.
  const spin = d.kick * 3;
  ctx.fillStyle = STEEL;
  ctx.fillRect(-34 * k, -2 * k, 6 * k, 4 * k);
  for (let i = 0; i < 2; i++) {
    const a = spin + i * Math.PI;
    ctx.fillStyle = '#8A949A';
    ctx.beginPath();
    ctx.ellipse(
      -36 * k,
      Math.sin(a) * 6 * k,
      2.4 * k,
      Math.abs(Math.cos(a)) * 7 * k + 1.5 * k,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // The tail fins.
  ctx.fillStyle = TRIM;
  ctx.beginPath();
  ctx.moveTo(-26 * k, -6 * k);
  ctx.lineTo(-33 * k, -14 * k);
  ctx.lineTo(-30 * k, -4 * k);
  ctx.moveTo(-26 * k, 6 * k);
  ctx.lineTo(-33 * k, 14 * k);
  ctx.lineTo(-30 * k, 4 * k);
  ctx.fill();
  // The hull, round and yellow, a darker belly, a stripe.
  ctx.fillStyle = HULL;
  ctx.beginPath();
  ctx.ellipse(0, 0, 30 * k, 15 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = HULL_DARK;
  ctx.beginPath();
  ctx.ellipse(0, 6 * k, 26 * k, 8 * k, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = TRIM;
  ctx.lineWidth = 2.4 * k;
  ctx.beginPath();
  ctx.ellipse(0, 0, 30 * k, 15 * k, 0, -0.35, 0.35);
  ctx.stroke();
  // The tower on top and its periscope.
  ctx.fillStyle = HULL;
  ctx.beginPath();
  ctx.roundRect(-8 * k, -22 * k, 16 * k, 10 * k, 3 * k);
  ctx.fill();
  ctx.strokeStyle = STEEL;
  ctx.lineWidth = 1.8 * k;
  ctx.beginPath();
  ctx.moveTo(2 * k, -22 * k);
  ctx.lineTo(2 * k, -29 * k);
  ctx.lineTo(7 * k, -29 * k);
  ctx.stroke();
  // Three round windows, the figure in its straw hat looking out of the middle one.
  for (const wx of [-14, 0, 14]) {
    ctx.fillStyle = STEEL;
    ctx.beginPath();
    ctx.arc(wx * k, -2 * k, 5.2 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GLASS;
    ctx.beginPath();
    ctx.arc(wx * k, -2 * k, 3.8 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#F2C9A0';
  ctx.beginPath();
  ctx.arc(0.6 * k, -1.2 * k, 2 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E8C85A';
  ctx.fillRect(-2.6 * k, -4.4 * k, 6 * k, 1.6 * k);
  // The claw, folded under the nose.
  ctx.strokeStyle = STEEL;
  ctx.lineWidth = 2 * k;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(14 * k, 12 * k);
  ctx.lineTo(20 * k, 18 * k);
  ctx.lineTo(25 * k, 16 * k);
  ctx.moveTo(20 * k, 18 * k);
  ctx.lineTo(23 * k, 22 * k);
  ctx.stroke();
  // The headlamp on the nose, and the bubbles' glint on the hull.
  ctx.fillStyle = '#FFF6C8';
  ctx.beginPath();
  ctx.arc(29 * k, 3 * k, 3 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath();
  ctx.ellipse(-6 * k, -9 * k, 12 * k, 3 * k, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  void T;
}

/** The headlamp's beam ahead of the submarine, lit over the dark. */
export function drawSubBeam(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  k: number,
  face: number,
): void {
  const nx = sx + face * 30 * k;
  const ny = sy + 3 * k;
  const len = 220 * k;
  const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, len);
  g.addColorStop(0, 'rgba(255,246,200,.35)');
  g.addColorStop(1, 'rgba(255,246,200,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.lineTo(nx + face * len, ny - len * 0.36);
  ctx.lineTo(nx + face * len, ny + len * 0.36);
  ctx.closePath();
  ctx.fill();
}
