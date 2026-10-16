/**
 * Drawing island 11 (world/isle11.ts): its shallows following the shore, a ring of pale sand, and inside it the
 * jungle, its floor dark green under great broadleaf trees hung with vines, ferns and big-leaved plants between them,
 * and palms leaning out over the sand. The black lagoon on the right is still black water in a muddy rim of reeds.
 * The ruins on the far side are a plaza of old grey paving gone green with moss, broken columns round it, and at its
 * back the portal: a ring of carved stone with a skull at its top, standing on a round step, dark inside for now.
 * The pier comes in from home with crates and a barrel at its root, where the catch goes.
 */

import type { DrawView } from '../entities/entity';
import {
  BEACH_W11,
  COLUMNS11,
  CRATES11,
  FERNS11,
  ISLE11,
  LAGOON11,
  lagoonR11,
  PALMS11,
  PIER11,
  PIER11_Z,
  PORTAL11,
  RUINS11,
  shoreR11,
  TREES11,
} from '../world/isle11';
import { drawPalm7 } from './isle7';
import type { Solid } from './layers';

const N = 80;
const SAND = '#E8D29A';
const JUNGLE = '#3F6E36';
const JUNGLE_DEEP = '#355F2E';
const LAGOON_RIM = '#3B4A2E';
const LAGOON_WATER = '#111A1B';
const STONE = '#8C9286';
const STONE_DARK = '#6A7064';
const MOSS = '#5E7F45';

/** Its outline, pushed out (or in) by off, as a path on the canvas. */
function outline(v: DrawView, off: number): void {
  const { ctx, px, py } = v;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = shoreR11(a) + off;
    const x = ISLE11.x + Math.cos(a) * r;
    const y = ISLE11.y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px(x, y), py(x, y));
    else ctx.lineTo(px(x, y), py(x, y));
  }
  ctx.closePath();
}

/** The lagoon's outline, pushed out by off. */
function lagoonPath(v: DrawView, off: number): void {
  const { ctx, px, py } = v;
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r = lagoonR11(a) + off;
    const x = LAGOON11.x + Math.cos(a) * r;
    const y = LAGOON11.y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px(x, y), py(x, y));
    else ctx.lineTo(px(x, y), py(x, y));
  }
  ctx.closePath();
}

/** Its shallows, following the shore. */
export function drawIsle11Sea(v: DrawView): void {
  const { ctx } = v;
  if (!v.onScreen(ISLE11.x, ISLE11.y, (ISLE11.r + 420) * v.zoom)) return;
  outline(v, 300);
  ctx.fillStyle = '#1B6E78';
  ctx.fill();
  outline(v, 150);
  ctx.fillStyle = '#2F989E';
  ctx.fill();
  outline(v, 55);
  ctx.fillStyle = '#73C9BD';
  ctx.fill();
}

/** The ground: sand, the jungle floor, the black lagoon and the ruins' paving. */
export function drawIsle11Flat(v: DrawView): void {
  const { ctx, T, px, py } = v;
  const Z = v.zoom;
  if (!v.onScreen(ISLE11.x, ISLE11.y, (ISLE11.r + 120) * Z)) return;
  outline(v, 8 + Math.sin(T * 1.3) * 3);
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 4 * Z;
  ctx.stroke();
  outline(v, 0);
  ctx.fillStyle = SAND;
  ctx.fill();
  outline(v, -BEACH_W11);
  ctx.fillStyle = JUNGLE;
  ctx.fill();
  outline(v, -BEACH_W11 - 170);
  ctx.fillStyle = JUNGLE_DEEP;
  ctx.fill();
  // The black lagoon: a muddy rim, black water, a slow green glint across it.
  if (v.onScreen(LAGOON11.x, LAGOON11.y, (LAGOON11.r + 60) * Z)) {
    lagoonPath(v, 12);
    ctx.fillStyle = LAGOON_RIM;
    ctx.fill();
    lagoonPath(v, 0);
    ctx.fillStyle = LAGOON_WATER;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(120,190,140,.16)';
    ctx.lineWidth = 2 * Z;
    for (let k = 0; k < 5; k++) {
      const ph = (T * 0.08 + k / 5) % 1;
      const x = LAGOON11.x - LAGOON11.r + ph * LAGOON11.r * 2;
      const y = LAGOON11.y + (k - 2) * 46;
      ctx.beginPath();
      ctx.ellipse(px(x, y), py(x, y), 26 * Z, 5 * Z, 0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.restore();
  }
  // The ruins' plaza: old paving in squares, moss creeping over it, and the round step the portal stands on.
  const { x: rx, y: ry, half } = RUINS11;
  if (v.onScreen(rx, ry, (half + 80) * Z)) {
    const corner = (u: number, w: number): [number, number] => [
      px(rx + u, ry + w),
      py(rx + u, ry + w),
    ];
    const quad = (h: number) => {
      ctx.beginPath();
      for (const [u, w] of [
        [-h, -h],
        [h, -h],
        [h, h],
        [-h, h],
      ] as const) {
        const [sx, sy] = corner(u, w);
        if (u === -h && w === -h) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
    };
    quad(half + 6);
    ctx.fillStyle = STONE_DARK;
    ctx.fill();
    quad(half);
    ctx.fillStyle = STONE;
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,66,58,.45)';
    ctx.lineWidth = 1.2 * Z;
    const step = (half * 2) / 7;
    ctx.beginPath();
    for (let k = 1; k < 7; k++) {
      const o = -half + k * step;
      let [a, b] = corner(o, -half);
      ctx.moveTo(a, b);
      [a, b] = corner(o, half);
      ctx.lineTo(a, b);
      [a, b] = corner(-half, o);
      ctx.moveTo(a, b);
      [a, b] = corner(half, o);
      ctx.lineTo(a, b);
    }
    ctx.stroke();
    ctx.fillStyle = MOSS;
    for (const [u, w, r] of [
      [-70, 40, 26],
      [60, -64, 20],
      [30, 70, 18],
      [-20, -20, 12],
      [84, 30, 16],
    ] as const) {
      v.isoEllipse(rx + u, ry + w, r);
      ctx.globalAlpha = 0.55;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    v.isoEllipse(PORTAL11.x, PORTAL11.y, PORTAL11.r + 18);
    ctx.fillStyle = STONE_DARK;
    ctx.fill();
    v.isoEllipse(PORTAL11.x, PORTAL11.y, PORTAL11.r + 10);
    ctx.fillStyle = '#A2A79A';
    ctx.fill();
  }
}

/** A great jungle tree: a pale trunk on flared roots, a broad heaped crown, and a vine hanging from it. */
function drawJungleTree(v: DrawView, x: number, y: number, i: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const h = 62 + (i % 4) * 8;
  const sx = px(x, y);
  const sy = py(x, y, 0);
  ctx.fillStyle = '#5B4A33';
  ctx.beginPath();
  ctx.moveTo(sx - 9 * Z, sy + 1 * Z);
  ctx.lineTo(sx - 2.5 * Z, sy - 12 * Z);
  ctx.lineTo(sx + 2.5 * Z, sy - 12 * Z);
  ctx.lineTo(sx + 9 * Z, sy + 1 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7A6648';
  ctx.lineWidth = 5.5 * Z;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + (i % 2 ? 2 : -2) * Z, py(x, y, h * 0.8));
  ctx.stroke();
  const cx = sx + (i % 2 ? 2 : -2) * Z;
  const cy = py(x, y, h);
  const greens = ['#24592C', '#2E6B34', '#3A7D3C', '#2A6331'];
  const r = (17 + (i % 3) * 2) * Z;
  [
    [-0.75, 0.3, 0.8],
    [0.75, 0.3, 0.8],
    [-0.35, -0.3, 0.9],
    [0.4, -0.25, 0.85],
    [0, 0.1, 1],
  ].forEach(([ox, oy, k], j) => {
    ctx.fillStyle = greens[(j + i) % 4] as string;
    ctx.beginPath();
    ctx.arc(cx + (ox as number) * r, cy + (oy as number) * r, r * (k as number), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = 'rgba(140,200,110,.22)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.45, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  // A vine down from the crown, swaying a little, with a leaf or two on it.
  if (i % 3 !== 2) {
    const vx = cx + (i % 2 ? -0.6 : 0.6) * r;
    const sway = Math.sin(T * 0.8 + i) * 2 * Z;
    const top = cy + r * 0.5;
    const end = py(x, y, h * 0.35);
    ctx.strokeStyle = '#3E7A35';
    ctx.lineWidth = 1.4 * Z;
    ctx.beginPath();
    ctx.moveTo(vx, top);
    ctx.quadraticCurveTo(vx + sway, (top + end) / 2, vx + sway * 0.5, end);
    ctx.stroke();
    ctx.fillStyle = '#4C9142';
    for (const t of [0.45, 0.8]) {
      ctx.beginPath();
      ctx.ellipse(vx + sway * t, top + (end - top) * t, 2.6 * Z, 1.4 * Z, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A fern, or every third one a big-leaved plant; now and then a red flower in it. */
function drawFern(v: DrawView, x: number, y: number, i: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const sy = py(x, y, 2);
  const big = i % 3 === 0;
  const n = big ? 5 : 7;
  for (let k = 0; k < n; k++) {
    const a = Math.PI + (k / (n - 1)) * Math.PI + (i % 2 ? 0.1 : -0.1);
    const len = (big ? 13 : 10) * Z;
    ctx.fillStyle = k % 2 ? '#4C8F45' : '#3F7E3C';
    ctx.beginPath();
    ctx.ellipse(
      sx + Math.cos(a) * len * 0.6,
      sy + Math.sin(a) * len * 0.45,
      len * 0.65,
      (big ? 4.2 : 2.2) * Z,
      Math.atan2(Math.sin(a) * 0.75, Math.cos(a)),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  if (i % 4 === 1) {
    ctx.fillStyle = '#D9473C';
    ctx.beginPath();
    ctx.arc(sx + 3 * Z, sy - 6 * Z, 2.6 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F5C531';
    ctx.beginPath();
    ctx.arc(sx + 3 * Z, sy - 6 * Z, 0.9 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Reeds round the lagoon's rim. */
function drawReeds(v: DrawView, x: number, y: number, i: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const sy = py(x, y, 0);
  ctx.strokeStyle = i % 2 ? '#6E7F3E' : '#5D6E35';
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  for (let k = -2; k <= 2; k++) {
    const sway = Math.sin(T * 1.2 + i + k) * 1.5 * Z;
    ctx.moveTo(sx + k * 2 * Z, sy);
    ctx.lineTo(sx + k * 3 * Z + sway, sy - (13 + ((k + i) % 3) * 4) * Z);
  }
  ctx.stroke();
}

/** A broken column: a stone drum this high, its top snapped off at a slant, moss at its foot. */
function drawColumn(v: DrawView, x: number, y: number, h: number, i: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const w = 8 * Z;
  const base = py(x, y, 0);
  const top = py(x, y, h);
  const tilt = (i % 2 ? 1 : -1) * 3 * Z;
  ctx.fillStyle = STONE_DARK;
  ctx.beginPath();
  ctx.ellipse(sx, base, w + 2 * Z, (w + 2 * Z) * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#A0A598';
  ctx.beginPath();
  ctx.moveTo(sx - w, base);
  ctx.lineTo(sx - w, top + tilt);
  ctx.lineTo(sx + w, top - tilt);
  ctx.lineTo(sx + w, base);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,76,66,.5)';
  ctx.lineWidth = 1 * Z;
  ctx.beginPath();
  for (const k of [-0.45, 0, 0.45]) {
    ctx.moveTo(sx + k * w, base);
    ctx.lineTo(sx + k * w, top + 1 * Z - tilt * k);
  }
  ctx.stroke();
  ctx.fillStyle = MOSS;
  ctx.beginPath();
  ctx.ellipse(sx - 2 * Z, base - 1 * Z, w * 0.9, 3 * Z, 0, Math.PI, Math.PI * 2);
  ctx.fill();
}

/** A little carved skull, at screen (sx, sy), this big. */
function drawSkull(ctx: CanvasRenderingContext2D, sx: number, sy: number, s: number): void {
  ctx.fillStyle = '#E8E2CF';
  ctx.beginPath();
  ctx.arc(sx, sy, s, Math.PI, 0);
  ctx.lineTo(sx + s * 0.75, sy + s * 0.8);
  ctx.lineTo(sx - s * 0.75, sy + s * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2A2724';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx + d * s * 0.42, sy + s * 0.05, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillRect(sx - s * 0.08, sy + s * 0.35, s * 0.16, s * 0.25);
}

/** The portal: a ring of carved stone standing up on its step, facing the viewer, a skull at its top, dark inside. */
function drawPortal11(v: DrawView): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const { x, y, r } = PORTAL11;
  const sx = px(x, y);
  const cy = py(x, y, 10 + r);
  const R = r * Z;
  // Its feet, two blocks on the step.
  for (const d of [-1, 1]) {
    ctx.fillStyle = STONE_DARK;
    ctx.fillRect(sx + d * R * 0.72 - 6 * Z, py(x, y, 12) - 10 * Z, 12 * Z, 12 * Z);
  }
  // Dark inside, a faint stir in it.
  ctx.fillStyle = 'rgba(14,18,20,.88)';
  ctx.beginPath();
  ctx.arc(sx, cy, R - 4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,160,120,.18)';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.arc(sx, cy, (R - 10 * Z) * (0.5 + 0.2 * Math.sin(T * 0.7)), T * 0.3, T * 0.3 + Math.PI * 1.2);
  ctx.stroke();
  // The ring: thick grey stone, darker on its lower edge, notched with carvings all round.
  ctx.strokeStyle = '#7D8478';
  ctx.lineWidth = 9 * Z;
  ctx.beginPath();
  ctx.arc(sx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(50,56,50,.55)';
  ctx.lineWidth = 2.5 * Z;
  ctx.beginPath();
  ctx.arc(sx, cy, R + 3 * Z, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.strokeStyle = '#5E6459';
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    ctx.moveTo(sx + Math.cos(a) * (R - 3.5 * Z), cy + Math.sin(a) * (R - 3.5 * Z));
    ctx.lineTo(sx + Math.cos(a) * (R + 3.5 * Z), cy + Math.sin(a) * (R + 3.5 * Z));
  }
  ctx.stroke();
  ctx.fillStyle = MOSS;
  ctx.beginPath();
  ctx.ellipse(sx - R * 0.7, cy + R * 0.55, 6 * Z, 3 * Z, -0.6, 0, Math.PI * 2);
  ctx.fill();
  drawSkull(ctx, sx, cy - R - 1 * Z, 6 * Z);
}

/** The pier, out over the shallows toward home on posts. */
function drawPier11(v: DrawView): void {
  const { x0, y0, x1, y1 } = PIER11;
  for (let y = y0 + 20; y < y1; y += 34) v.box(x0 - 1, y, 3, 3, -6, PIER11_Z, '#5E3D1C', '#7A5230');
  v.box(x0, y0, x1 - x0, y1 - y0, PIER11_Z - 2, PIER11_Z, '#8A6A43', '#B48A5A');
}

/** Crates and a barrel at the pier's root, a vine creeping up the bottom crate. */
function drawCrates11(v: DrawView): void {
  const { x, y } = CRATES11;
  v.box(x - 10, y - 8, 16, 16, 0, 14, '#B97F45', '#DDAA66');
  v.box(x - 4, y - 2, 12, 12, 14, 24, '#C98B4E', '#E6B877');
  v.isoEllipse(x + 14, y + 10, 6, 0);
  v.ctx.fillStyle = '#7A5230';
  v.ctx.fill();
  v.box(x + 9, y + 5, 10, 10, 0, 13, '#7A5230', '#9A6A3E');
  const { ctx, px, py } = v;
  const Z = v.zoom;
  ctx.strokeStyle = '#3E7A35';
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  ctx.moveTo(px(x - 10, y + 8), py(x - 10, y + 8, 0));
  ctx.quadraticCurveTo(
    px(x - 7, y + 8) + 3 * Z,
    py(x - 7, y + 8, 7),
    px(x - 2, y + 8),
    py(x - 2, y + 8, 13),
  );
  ctx.stroke();
}

/** The reeds' places round the lagoon's rim. */
const REEDS11: readonly [number, number][] = Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2 + (i % 3) * 0.05;
  const r = lagoonR11(a) + 7 + (i % 2) * 5;
  return [LAGOON11.x + Math.cos(a) * r, LAGOON11.y + Math.sin(a) * r];
});

/** Everything on island 11 that stands up: trees, palms, ferns, reeds, the columns and the portal. */
export function isle11Solids(v: DrawView): Solid[] {
  if (!v.onScreen(ISLE11.x, ISLE11.y, (ISLE11.r + 260) * v.zoom)) return [];
  const out: Solid[] = [];
  const on = (x: number, y: number, m = 100) => v.onScreen(x, y, m * v.zoom);
  TREES11.forEach(([x, y], i) => {
    if (on(x, y)) out.push({ d: x + y, f: () => drawJungleTree(v, x, y, i) });
  });
  PALMS11.forEach(([x, y], i) => {
    if (on(x, y)) out.push({ d: x + y, f: () => drawPalm7(v, x, y, i) });
  });
  FERNS11.forEach(([x, y], i) => {
    if (on(x, y, 30)) out.push({ d: x + y, f: () => drawFern(v, x, y, i) });
  });
  REEDS11.forEach(([x, y], i) => {
    if (on(x, y, 30)) out.push({ d: x + y, f: () => drawReeds(v, x, y, i) });
  });
  COLUMNS11.forEach((c, i) => {
    if (on(c.x, c.y, 60)) out.push({ d: c.x + c.y, f: () => drawColumn(v, c.x, c.y, c.h, i) });
  });
  if (on(PORTAL11.x, PORTAL11.y, 90))
    out.push({ d: PORTAL11.x + PORTAL11.y, f: () => drawPortal11(v) });
  out.push({ d: PIER11.x0 + PIER11.y0, f: () => drawPier11(v) });
  if (on(CRATES11.x, CRATES11.y, 40))
    out.push({ d: CRATES11.x + CRATES11.y + 10, f: () => drawCrates11(v) });
  return out;
}
