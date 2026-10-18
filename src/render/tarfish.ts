/**
 * The tar fish (world/tarfish.ts), out on the tar: black and glossy, with pale yellow eyes, circling in their small
 * schools with a ring spreading behind each; now and then one leaps clear in an arc and drops back in with a splash of
 * tar. And the rod's line out from the chemistry boat to its float, as the flagship's rod does for lionfish.
 */

import type { DrawView } from '../entities/entity';
import { fishAt, isTaken, PER_SCHOOL, type TarSchool } from '../world/tarfish';

const BODY = '#07060A';
const SHEEN = 'rgba(190,160,220,.55)';
const EYE = '#F2E27A';
const RING = 'rgba(170,140,200,.7)';
/** A pale rim round each, so black on black still reads. */
const RIM = 'rgba(200,180,230,.75)';
/** A tar fish's half-length, in world units, made bigger than life so it reads on a phone. */
const LEN = 17;
/** How often each fish leaps, in seconds, and for how long. */
const LEAP_EVERY = 7;
const LEAP_T = 0.9;

function hash(s: number, k: number): number {
  const h = Math.sin(s * 91.7 + k * 37.3) * 43758.5453;
  return h - Math.floor(h);
}

/** How far through a leap fish k of school s is at time T: under 1 while it is out of the tar. */
function leapAt(T: number, s: number, k: number): number {
  return ((T + hash(s, k) * LEAP_EVERY) % LEAP_EVERY) / LEAP_T;
}

/** The schools' fish not yet taken, those on the screen, for the sorted solids. */
export function tarFishSolids(
  v: DrawView,
  schools: readonly TarSchool[],
  taken: number,
): { d: number; f: () => void }[] {
  const out: { d: number; f: () => void }[] = [];
  schools.forEach((sc, s) => {
    if (!v.onScreen(sc.x, sc.y, 140 * v.zoom)) return;
    for (let k = 0; k < PER_SCHOOL; k++) {
      if (isTaken(taken, s, k)) continue;
      const f = fishAt(sc, s, k, v.T);
      out.push({ d: f.x + f.y, f: () => drawTarFish(v, f.x, f.y, f.a, s, k) });
    }
  });
  return out;
}

/** One tar fish at (x, y), swimming toward a: along the top of the tar, or for a moment leaping out of it. */
function drawTarFish(v: DrawView, x: number, y: number, a: number, s: number, k: number): void {
  const { ctx, px, py, T, zoom: Z } = v;
  const sx = px(x, y);
  const sy = py(x, y, 0);
  // Which way is ahead, on the screen.
  const hx = px(x + Math.cos(a) * 10, y + Math.sin(a) * 10) - sx;
  const hy = py(x + Math.cos(a) * 10, y + Math.sin(a) * 10, 0) - sy;
  const ang = Math.atan2(hy, hx);
  const leap = leapAt(T, s, k);
  // The ring spreading in the tar behind it.
  const rk = (T * 0.8 + hash(k, s)) % 1;
  ctx.strokeStyle = RING;
  ctx.lineWidth = 1.8 * Z;
  ctx.globalAlpha = 1 - rk;
  v.isoEllipse(x, y, 12 + rk * 24);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (leap < 1) {
    // Up in an arc and down again, nose first, a splash where it went in and where it comes down.
    const z = Math.sin(leap * Math.PI) * 30;
    const tilt = (0.5 - leap) * 1.6 * (Math.cos(ang) >= 0 ? -1 : 1);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    v.isoEllipse(x, y, 8);
    ctx.fill();
    body(v, sx, py(x, y, z), ang + tilt, 1);
    if (leap < 0.2 || leap > 0.8) splash(v, x, y, leap < 0.2 ? leap / 0.2 : (1 - leap) / 0.2);
    return;
  }
  // At the top of the tar: only its back and fin out, glossy.
  body(v, sx, sy, ang, 0.7);
  ctx.fillStyle = BODY;
  ctx.beginPath();
  ctx.moveTo(sx - Math.cos(ang) * 2 * Z, sy - 1 * Z);
  ctx.lineTo(sx + Math.cos(ang) * 3 * Z, sy - 8 * Z);
  ctx.lineTo(sx + Math.cos(ang) * 6 * Z, sy - 1 * Z);
  ctx.closePath();
  ctx.fill();
}

/** The fish's body on the screen at (sx, sy), pointing ang: black, a sheen along its back, a yellow eye, a tail. */
function body(v: DrawView, sx: number, sy: number, ang: number, squash: number): void {
  const { ctx, T, zoom: Z } = v;
  const L = LEN * Z;
  const wag = Math.sin(T * 9) * 0.35;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(ang);
  ctx.scale(1, squash);
  ctx.fillStyle = BODY;
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 1.3 * Z;
  ctx.save();
  ctx.translate(-L * 0.85, 0);
  ctx.rotate(wag);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-L * 0.6, -L * 0.45);
  ctx.lineTo(-L * 0.6, L * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(0, 0, L, L * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = SHEEN;
  ctx.lineWidth = 1.6 * Z;
  ctx.beginPath();
  ctx.ellipse(0, 0, L * 0.7, L * 0.22, 0, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.fillStyle = EYE;
  ctx.beginPath();
  ctx.arc(L * 0.58, -L * 0.1, 2 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Drops of tar thrown up where a fish goes in or comes out, k from 1 (just now) to 0 (gone). */
function splash(v: DrawView, x: number, y: number, k: number): void {
  const { ctx, px, py, zoom: Z } = v;
  const sx = px(x, y);
  const sy = py(x, y, 0);
  ctx.fillStyle = '#2A2030';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.5;
    const r = (1 - k) * 12 + 3;
    ctx.beginPath();
    ctx.arc(
      sx + Math.cos(a) * r * Z,
      sy + Math.sin(a) * r * 0.7 * Z,
      1.8 * Z * k + 0.6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

/** The rod's line from the chemistry boat to its float on the tar, and the float pulled under in a ring at a bite. */
export function drawTarLine(
  v: DrawView,
  b: { x: number; y: number },
  fx: number,
  fy: number,
  bite: boolean,
): void {
  const { ctx, px, py, T, zoom: Z } = v;
  const bx = px(b.x, b.y);
  const by = py(b.x, b.y, 34);
  const sx = px(fx, fy);
  const sy = py(fx, fy, 0);
  ctx.strokeStyle = 'rgba(230,240,230,.85)';
  ctx.lineWidth = 1.2 * Z;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo((bx + sx) / 2, (by + sy) / 2 + (bite ? 10 : 26) * Z, sx, sy);
  ctx.stroke();
  if (bite) {
    const t = (T * 2.4) % 1;
    ctx.strokeStyle = 'rgba(200,170,230,.9)';
    ctx.globalAlpha = 1 - t;
    ctx.lineWidth = 2.4 * Z;
    ctx.beginPath();
    ctx.ellipse(sx, sy, (6 + 22 * t) * Z, (3 + 10 * t) * Z, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }
  const bob = Math.sin(T * 4) * 1.5 * Z;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(sx, sy + bob, 3.4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3FA34D';
  ctx.beginPath();
  ctx.arc(sx, sy + bob - 1.6 * Z, 3.4 * Z, Math.PI, 0);
  ctx.fill();
}

/** After dark, over the night's shade: their yellow eyes glowing on the tar, so a school can be found by them. */
export function drawTarFishEyes(
  v: DrawView,
  schools: readonly TarSchool[],
  taken: number,
  dark: number,
): void {
  if (dark < 0.2) return;
  const { ctx, px, py, T, zoom: Z } = v;
  schools.forEach((sc, s) => {
    if (!v.onScreen(sc.x, sc.y, 140 * Z)) return;
    for (let k = 0; k < PER_SCHOOL; k++) {
      // One leaping is out of the tar and seen anyway.
      if (isTaken(taken, s, k) || leapAt(T, s, k) < 1) continue;
      const f = fishAt(sc, s, k, T);
      const ex = px(f.x, f.y);
      const ey = py(f.x, f.y, 0);
      const hx = px(f.x + Math.cos(f.a) * 10, f.y + Math.sin(f.a) * 10) - ex;
      const hy = py(f.x + Math.cos(f.a) * 10, f.y + Math.sin(f.a) * 10, 0) - ey;
      const h = Math.hypot(hx, hy) || 1;
      const x = ex + (hx / h) * LEN * 0.58 * Z;
      const y = ey + (hy / h) * LEN * 0.58 * Z - 2 * Z;
      ctx.fillStyle = `rgba(242,226,122,${0.25 * dark})`;
      ctx.beginPath();
      ctx.arc(x, y, 7 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(250,236,140,${0.6 + 0.4 * dark})`;
      ctx.beginPath();
      ctx.arc(x, y, 2 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
