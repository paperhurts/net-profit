/**
 * Drawing the swamp's gators (entities/gators.ts), laid out along the ground in the world, so they foreshorten with
 * the island whichever way they face. In its pool a gator is a shadow under the black water with two yellow eyes and
 * its nostrils above it, a ring of ripples round them. Out of the water it is a long, low olive body with a ridged
 * back, four stubby splayed legs that paddle as it comes, and a tail that swings behind. Its jaws open wide in the
 * warning, pink inside and lined with teeth, and shut in the snap. Beaten, it lies belly up and fades.
 */

import type { DrawView } from '../entities/entity';
import {
  GATOR_FALL,
  GATOR_GAPE,
  GATOR_RISE,
  GATOR_SNAP,
  type Gator,
  Gators,
} from '../entities/gators';

/** World units to the gator's own: it is this much bigger than the numbers below. */
export const GATOR_K = 1.15;

/** One side of it, tail tip to snout tip: how far along from its middle, and how wide there. */
const SIDE: readonly (readonly [number, number])[] = [
  [-30, 0.6],
  [-22, 1.8],
  [-14, 3.4],
  [-7, 5.4],
  [0, 6.4],
  [6, 5.6],
  [9, 4.3],
  [12, 4.5],
  [17, 3.3],
  [20.5, 2.2],
  [21.5, 0],
];
/** Where the head starts, and the snout's end. */
const NECK = 8;
const SNOUT = 21.5;
const BACK_Z = 3.4;

const OLIVE = '#4E7036';
const DARK = '#2E4423';
const RIDGE = '#33502A';
const BELLY = '#D9CE98';
const EYE = '#EAD84A';
const MOUTH = '#D97C86';
const TOOTH = '#F4F1E6';

type Pt = readonly [number, number];

/** A point on it: along, across and up, with the tail's swing; to the screen. */
function pt(v: DrawView, g: Gator, s: number, w: number, z: number): Pt {
  const c = Math.cos(g.h);
  const n = Math.sin(g.h);
  const sway = s < -4 ? Math.sin(g.ph - s * 0.12) * ((-s - 4) / 26) * 3 : 0;
  const ww = (w + sway) * GATOR_K;
  const ss = s * GATOR_K;
  const x = g.x + c * ss - n * ww;
  const y = g.y + n * ss + c * ww;
  return [v.px(x, y), v.py(x, y, z * GATOR_K)];
}

/** Its outline from s0 to s1, this much narrower, at height z (or a height that changes along it). */
function outline(
  v: DrawView,
  g: Gator,
  s0: number,
  s1: number,
  kw: number,
  z: number | ((s: number) => number),
): void {
  const at = typeof z === 'number' ? () => z : z;
  const side = SIDE.filter(([s]) => s >= s0 && s <= s1);
  const { ctx } = v;
  ctx.beginPath();
  side.forEach(([s, w], i) => {
    const [x, y] = pt(v, g, s, w * kw, at(s));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  for (let i = side.length - 1; i >= 0; i--) {
    const [s, w] = side[i] as readonly [number, number];
    const [x, y] = pt(v, g, s, -w * kw, at(s));
    ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** How wide open its jaws are, 0 shut to 1 wide. */
export function jawOpen(g: Gator): number {
  if (g.state === 'gape') return Math.min(1, (g.t / GATOR_GAPE) * 1.3);
  if (g.state === 'snap') return Math.max(0, 1 - g.t / GATOR_SNAP);
  return 0;
}

export function drawGator(v: DrawView, g: Gator): void {
  if (g.state === 'gone') return;
  const { ctx } = v;
  const Z = v.zoom;
  const lurk = g.state === 'lurk';
  // Out of the water by this much: nothing while it lurks, all of it on land, between in a surge or a slide.
  let out = 1;
  if (lurk) out = 0;
  else if (g.state === 'rise') out = Math.min(1, g.t / GATOR_RISE);
  else if (g.state === 'sink') out = 1 - Math.min(1, g.t / GATOR_RISE);
  const wet = g.state === 'rise' || g.state === 'sink';
  const W = (c: string) => (g.flash > 0 ? '#FFFFFF' : c);

  // Under the water: a dark shape, and the eyes and nostrils above it.
  if (out < 1) {
    ctx.globalAlpha = 0.5 * (1 - out);
    outline(v, g, -30, SNOUT, 1, 0);
    ctx.fillStyle = '#121A14';
    ctx.fill();
    ctx.globalAlpha = 1 - out;
    // A slow ring of ripples round the head.
    const [hx, hy] = pt(v, g, 12, 0, 0);
    const r = ((v.T * 0.5 + g.a) % 1) * 9 + 4;
    ctx.strokeStyle = `rgba(200,220,200,${0.35 * (1 - (r - 4) / 9)})`;
    ctx.lineWidth = 1 * Z;
    ctx.beginPath();
    ctx.ellipse(hx, hy, r * Z * GATOR_K, r * Z * GATOR_K * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // The ridge of its snout breaks the surface, with the eyes up on it.
    ctx.globalAlpha = 0.9 * (1 - out);
    outline(v, g, NECK - 2, SNOUT, 0.75, 0.4);
    ctx.fillStyle = W('#3B5329');
    ctx.fill();
    ctx.globalAlpha = 1 - out;
    eyes(v, g, () => 0.8, W, 1.25);
    ctx.globalAlpha = 1;
  }
  if (out <= 0) return;

  const fall = g.state === 'fall' ? Math.min(1, g.t / GATOR_FALL) : 0;
  const sunk = wet ? -(1 - out) * 3 : 0;
  ctx.globalAlpha = (wet ? out : 1) * (fall > 0.4 ? 1 - (fall - 0.4) / 0.6 : 1);

  // A splash round it, coming out or going in.
  if (wet) {
    const [cx, cy] = pt(v, g, 4, 0, 0);
    const r = (10 + (g.state === 'rise' ? out : 1 - out) * 22) * Z * GATOR_K;
    ctx.strokeStyle = `rgba(230,240,230,${0.7 * (1 - out)})`;
    ctx.lineWidth = 1.6 * Z;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Its shadow.
  outline(v, g, -30, SNOUT, 1.15, 0);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.fill();

  if (fall > 0) {
    // Belly up: pale, with its legs in the air.
    legs(v, g, sunk, true, W);
    outline(v, g, -30, SNOUT, 1, 1.5 + sunk);
    ctx.fillStyle = W(DARK);
    ctx.fill();
    outline(v, g, -30, SNOUT, 0.8, BACK_Z + sunk);
    ctx.fillStyle = W(BELLY);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,110,70,.5)';
    ctx.lineWidth = 0.8 * Z;
    for (let s = -12; s <= 6; s += 3.5) {
      const [ax, ay] = pt(v, g, s, -4, BACK_Z + sunk);
      const [bx, by] = pt(v, g, s, 4, BACK_Z + sunk);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }

  const open = jawOpen(g);
  const upper = (s: number) => BACK_Z + sunk + (open * Math.max(0, s - NECK) * 13) / (SNOUT - NECK);
  legs(v, g, sunk, false, W);
  // The body: its dark flank, then its olive back over it.
  outline(v, g, -30, NECK + 1, 1, 1.2 + sunk);
  ctx.fillStyle = W(DARK);
  ctx.fill();
  outline(v, g, -30, NECK + 1, 0.85, BACK_Z + sunk);
  ctx.fillStyle = W(OLIVE);
  ctx.fill();
  // The ridges down its back: two rows, then one down the tail.
  ctx.fillStyle = W(RIDGE);
  for (let s = -27; s <= 6; s += 3.3) {
    const rows = s > -13 ? [-1.7, 1.7] : [0];
    for (const w of rows) {
      const [x, y] = pt(v, g, s, w, BACK_Z + 0.9 + sunk);
      ctx.beginPath();
      ctx.arc(x, y, (s > -13 ? 1 : 0.8) * Z * GATOR_K, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The head: the lower jaw, the mouth and its teeth when open, and the upper jaw lifted over them.
  outline(v, g, NECK, SNOUT, 1, 1 + sunk);
  ctx.fillStyle = W(DARK);
  ctx.fill();
  if (open > 0.02) {
    outline(v, g, NECK, SNOUT, 0.85, 2 + sunk);
    ctx.fillStyle = W(OLIVE);
    ctx.fill();
    // The pink inside, between the jaws.
    ctx.beginPath();
    const top = SIDE.filter(([s]) => s >= NECK);
    top.forEach(([s, w], i) => {
      const [x, y] = pt(v, g, s, w * 0.7, upper(s));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    for (let i = top.length - 1; i >= 0; i--) {
      const [s, w] = top[i] as readonly [number, number];
      const [x, y] = pt(v, g, s, w * 0.7, 2 + sunk);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = W(MOUTH);
    ctx.fill();
    // Teeth, down from the upper jaw and up from the lower.
    ctx.fillStyle = TOOTH;
    for (let s = NECK + 3; s < SNOUT - 0.5; s += 2.5) {
      for (const side of [-1, 1]) {
        const w = side * 2.6 * (1 - (s - NECK) / (SNOUT - NECK + 4));
        const [ux, uy] = pt(v, g, s, w, upper(s));
        const [lx, ly] = pt(v, g, s, w, 2 + sunk);
        tooth(ctx, ux, uy, 1.6 * Z * open);
        tooth(ctx, lx, ly, -1.4 * Z * open);
      }
    }
  }
  outline(v, g, NECK, SNOUT, 0.85, upper);
  ctx.fillStyle = W(OLIVE);
  ctx.fill();
  eyes(v, g, (s) => upper(s), W);
  ctx.globalAlpha = 1;
}

/** A little white triangle hanging down (or standing up, with h below 0) from x, y. */
function tooth(ctx: CanvasRenderingContext2D, x: number, y: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(x - 0.7 * Math.abs(h) * 0.6, y);
  ctx.lineTo(x + 0.7 * Math.abs(h) * 0.6, y);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
}

/** Its eyes on their bumps, yellow with a slit, and its nostrils at the snout's end. */
function eyes(
  v: DrawView,
  g: Gator,
  at: (s: number) => number,
  W: (c: string) => string,
  big = 1,
): void {
  const { ctx } = v;
  const Z = v.zoom * GATOR_K * big;
  for (const side of [-1, 1]) {
    const [x, y] = pt(v, g, 10.5, side * 2.6, at(10.5) + 1.4);
    ctx.fillStyle = W(OLIVE);
    ctx.beginPath();
    ctx.ellipse(x, y, 1.9 * Z, 1.4 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = Gators.up(g) ? '#F2C21E' : EYE;
    ctx.beginPath();
    ctx.ellipse(x, y - 0.3 * Z, 1.25 * Z, 0.95 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#16180E';
    ctx.beginPath();
    ctx.ellipse(x, y - 0.3 * Z, 0.32 * Z, 0.85 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#16180E';
  for (const side of [-1, 1]) {
    const [x, y] = pt(v, g, 19.6, side * 0.9, at(19.6) + 0.5);
    ctx.beginPath();
    ctx.arc(x, y, 0.45 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Four stubby legs, splayed out to the sides and paddling as it walks; belly up, they stick up in the air. */
function legs(v: DrawView, g: Gator, sunk: number, up: boolean, W: (c: string) => string): void {
  const { ctx } = v;
  ctx.strokeStyle = W(DARK);
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.4 * v.zoom * GATOR_K;
  const moving = g.state === 'chase' || g.state === 'back';
  for (const [s, phase] of [
    [5, 0],
    [-6, Math.PI],
  ] as const) {
    for (const side of [-1, 1]) {
      const step = moving ? Math.sin(g.ph + phase + (side > 0 ? 0 : Math.PI)) * 2.4 : 0;
      const [ax, ay] = pt(v, g, s, side * 4.5, 1.6 + sunk);
      const [bx, by] = up
        ? pt(v, g, s + 1, side * 7, 8 + sunk)
        : pt(v, g, s + step + 1.5, side * 10, sunk);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
  }
}
