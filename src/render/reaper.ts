/**
 * The Reaper, drawn after the kid's picture: a long blue fish's body with
 * lighter blue zigzags on it, a pointed snout with a jagged mouth, a big
 * yellow eye under an angry brow, a tall rounded fin on his back striped yellow
 * and black, a forked tail, and four legs with claws underneath. In the water
 * only his fin shows, over his dark shape. The same drawing does for him on
 * land, and smaller for a young one.
 */

import type { DrawView } from '../entities/entity';

const BLUE = '#4F86C6';
const BLUE_LIGHT = '#9CC7EE';
const INK = '#1D2B3A';
const YELLOW = '#F2C230';
const LEG = '#2C4A6E';

export type ReaperLook = {
  T: number;
  /** Of a hit's flash, 0 to 1. */
  flash?: number;
  angry?: boolean;
  /** Head to tail, in world units. */
  len?: number;
  /** How far his jaw drops, 0 shut to 1 wide. */
  mouth?: number;
  /** His legs: paddling in the water, clawing the air reared up, walking, or folded under him lying down. */
  legs?: 'swim' | 'rear' | 'walk' | 'lie';
  /** Walking, how fast his legs go round, 1 a stroll. */
  pace?: number;
  /** His eye shut, asleep. */
  asleep?: boolean;
};

/** His half-width along him, from -1 at the tail to 1 at the snout, in screen units at size 1. */
function width(k: number): number {
  if (k < -0.8) return 3 + (k + 1) * 10;
  if (k < 0) return 5 + ((k + 0.8) / 0.8) * 15;
  if (k < 0.55) return 20 - k * 2;
  return Math.max(0, 19 * ((1 - k) / 0.45) ** 0.8);
}

/**
 * The whole of him, out of the water: x, y his middle, z how high it is, h his heading, pitch how far his
 * nose is tipped up.
 */
export function drawReaperBody(
  v: DrawView,
  x: number,
  y: number,
  z: number,
  h: number,
  pitch: number,
  o: ReaperLook,
): void {
  const { ctx, px, py } = v;
  const len = o.len ?? 240;
  const size = len / 240;
  const Z = v.zoom * 1.5 * size;
  const c = Math.cos(h);
  const s = Math.sin(h);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const T = o.T;
  // Down his spine, tail to snout, with a swimmer's wave in it.
  const N = 14;
  const spine: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const k = -1 + (2 * i) / N;
    const l = (k * len) / 2;
    const wave = Math.sin(T * 5 - k * 3) * 7 * size * ((1 - k) / 2);
    const wx = x + c * l * cp - s * wave;
    const wy = y + s * l * cp + c * wave;
    spine.push([px(wx, wy), py(wx, wy, Math.max(-4, z + l * sp))]);
  }
  const at = (i: number) => spine[Math.max(0, Math.min(N, i))] as [number, number];
  // Which way is up off his back, on the screen: the same side all along him.
  const [mx0, my0] = at(N / 2 - 1);
  const [mx1, my1] = at(N / 2 + 1);
  let nx = -(my1 - my0);
  let ny = mx1 - mx0;
  const nl = Math.hypot(nx, ny) || 1;
  nx /= nl;
  ny /= nl;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const kOf = (i: number) => -1 + (2 * i) / N;
  const edge = (i: number, f: number): [number, number] => {
    const [sx, sy] = at(i);
    const w = width(kOf(i)) * Z * f;
    return [sx + nx * w, sy + ny * w];
  };
  const flash = (o.flash ?? 0) > 0;
  const fill = (col: string) => (flash ? '#FFFFFF' : col);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Legs, behind him: two pairs, with three claws each.
  const legs = o.legs ?? 'swim';
  for (const [i, ph, front] of [
    [10, 0, true],
    [9, 2, true],
    [4, 1, false],
    [3, 3, false],
  ] as const) {
    const [bx, by] = edge(i, -0.85);
    const dir = mx1 >= mx0 ? 1 : -1;
    let fx: number;
    let fy: number;
    let kx: number;
    let ky: number;
    if (legs === 'lie') {
      // Folded under him, claws tucked.
      kx = bx - 7 * Z * dir;
      ky = by + 4 * Z;
      fx = kx + 3 * Z * dir;
      fy = ky + 3 * Z;
    } else if (legs === 'rear' && front) {
      // Clawing the air.
      const a = Math.sin(T * 7 + ph) * 0.5;
      kx = bx + (10 + a * 6) * Z * dir;
      ky = by + 4 * Z;
      fx = kx + (8 + a * 4) * Z * dir;
      fy = ky - (6 - a * 8) * Z;
    } else {
      const sw =
        legs === 'walk' ? Math.sin(T * 6 * (o.pace ?? 1) + ph * 1.6) : Math.sin(T * 8 + ph);
      kx = bx + sw * 6 * Z * dir;
      ky = by + 10 * Z;
      fx = kx + (2 + sw * 4) * Z * dir;
      fy = ky + 9 * Z;
    }
    ctx.strokeStyle = fill(LEG);
    ctx.lineWidth = 4.2 * Z;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(kx, ky);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.strokeStyle = '#E8E2D0';
    ctx.lineWidth = 1.2 * Z;
    ctx.beginPath();
    for (const cl of [-1, 0, 1]) {
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + (cl * 2.6 + dir * 2) * Z, fy + 3.4 * Z);
    }
    ctx.stroke();
  }
  // The forked tail.
  const [tx, ty] = at(0);
  const [t1x, t1y] = at(1);
  const bx = tx - t1x;
  const by = ty - t1y;
  const bl = Math.hypot(bx, by) || 1;
  const ux = bx / bl;
  const uy = by / bl;
  ctx.fillStyle = fill(BLUE);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * Z;
  for (const side of [1, -1]) {
    // Each lobe broad at the root and swept back to a point.
    ctx.beginPath();
    ctx.moveTo(t1x + nx * side * 2 * Z, t1y + ny * side * 2 * Z);
    ctx.quadraticCurveTo(
      tx + ux * 6 * Z + nx * side * 16 * Z,
      ty + uy * 6 * Z + ny * side * 16 * Z,
      tx + ux * 22 * Z + nx * side * 24 * Z,
      ty + uy * 22 * Z + ny * side * 24 * Z,
    );
    ctx.quadraticCurveTo(
      tx + ux * 12 * Z + nx * side * 10 * Z,
      ty + uy * 12 * Z + ny * side * 10 * Z,
      tx + ux * 6 * Z,
      ty + uy * 6 * Z,
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // The fin on his back, tall and rounded, striped yellow and black.
  const [f0x, f0y] = edge(5, 0.95);
  const [f1x, f1y] = edge(9, 0.95);
  const [fmx, fmy] = edge(7, 1);
  const fh = 30 * Z;
  ctx.fillStyle = fill(YELLOW);
  ctx.beginPath();
  ctx.moveTo(f0x, f0y);
  ctx.bezierCurveTo(
    f0x + nx * fh * 0.9,
    f0y + ny * fh * 0.9,
    fmx + nx * fh * 1.3,
    fmy + ny * fh * 1.3,
    f1x,
    f1y,
  );
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2 * Z;
  for (let i = 0; i < 5; i++) {
    const k = 0.1 + i * 0.2;
    const sx = f0x + (f1x - f0x) * k;
    const sy = f0y + (f1y - f0y) * k;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + nx * fh * 1.2 + (f1x - f0x) * 0.08, sy + ny * fh * 1.2 + (f1y - f0y) * 0.08);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(f0x, f0y);
  ctx.bezierCurveTo(
    f0x + nx * fh * 0.9,
    f0y + ny * fh * 0.9,
    fmx + nx * fh * 1.3,
    fmy + ny * fh * 1.3,
    f1x,
    f1y,
  );
  ctx.stroke();
  // The body: blue, outlined, round over the back and along the belly to the point of his snout.
  ctx.fillStyle = fill(BLUE);
  ctx.beginPath();
  for (let i = 1; i <= N; i++) {
    const [ex, ey] = edge(i, 1);
    if (i === 1) ctx.moveTo(ex, ey);
    else ctx.lineTo(ex, ey);
  }
  for (let i = N; i >= 1; i--) {
    const [ex, ey] = edge(i, -0.9);
    ctx.lineTo(ex, ey);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2 * Z;
  ctx.stroke();
  // The kid's zigzags, lighter blue, across his head and down his side.
  ctx.strokeStyle = fill(BLUE_LIGHT);
  ctx.lineWidth = 1.8 * Z;
  ctx.beginPath();
  for (let i = 5; i <= 12; i++) {
    const [ex, ey] = edge(i, i % 2 ? 0.6 : -0.5);
    if (i === 5) ctx.moveTo(ex, ey);
    else ctx.lineTo(ex, ey);
  }
  ctx.stroke();
  // The mouth at the snout: a jagged line shut, a wedge full of teeth open.
  const mouth = Math.max(0, Math.min(1, o.mouth ?? 0));
  const [sx, sy] = at(N);
  const [jx, jy] = edge(N - 3, -0.15);
  const drop = mouth * 14 * Z;
  const lowX = jx + (sx - jx) * 0.15 - nx * drop;
  const lowY = jy + (sy - jy) * 0.15 - ny * drop;
  if (mouth > 0.05) {
    ctx.fillStyle = '#2A0F12';
    ctx.beginPath();
    ctx.moveTo(jx, jy);
    ctx.lineTo(sx, sy);
    ctx.lineTo(lowX + (sx - jx) * 0.85, lowY + (sy - jy) * 0.85);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#FFFBEF';
  for (let i = 0; i < 4; i++) {
    const k0 = 0.12 + i * 0.22;
    const ax = jx + (sx - jx) * k0;
    const ay = jy + (sy - jy) * k0;
    const bx2 = jx + (sx - jx) * (k0 + 0.11);
    const by2 = jy + (sy - jy) * (k0 + 0.11);
    // Down from the top jaw, and up from the bottom one.
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo((ax + bx2) / 2 - nx * 4 * Z, (ay + by2) / 2 - ny * 4 * Z);
    ctx.lineTo(bx2, by2);
    ctx.fill();
    if (mouth > 0.05) {
      const lx = ax - nx * drop * (1 - k0);
      const ly = ay - ny * drop * (1 - k0);
      const l2x = bx2 - nx * drop * (1 - k0 - 0.11);
      const l2y = by2 - ny * drop * (1 - k0 - 0.11);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo((lx + l2x) / 2 + nx * 4 * Z, (ly + l2y) / 2 + ny * 4 * Z);
      ctx.lineTo(l2x, l2y);
      ctx.fill();
    }
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6 * Z;
  ctx.beginPath();
  ctx.moveTo(jx, jy);
  ctx.lineTo(sx, sy);
  ctx.stroke();
  // His big yellow eye, and the angry brow over it; asleep, a shut lid.
  const [ex, ey] = edge(N - 5, 0.35);
  const [e2x, e2y] = edge(N - 3, 0.75);
  if (o.asleep) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8 * Z;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 5 * Z, 2.4 * Z, Math.atan2(my1 - my0, mx1 - mx0), 0.15, Math.PI - 0.15);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = o.angry ? '#FF8A2A' : YELLOW;
  ctx.beginPath();
  ctx.ellipse(ex, ey, 5.6 * Z, 4 * Z, Math.atan2(my1 - my0, mx1 - mx0), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4 * Z;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(ex + (sx - ex) * 0.04, ey, 1.4 * Z, 3.2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.6 * Z;
  ctx.beginPath();
  ctx.moveTo(ex - (sx - ex) * 0.25 + nx * 9 * Z, ey - (sy - ey) * 0.25 + ny * 9 * Z);
  ctx.lineTo(e2x, e2y);
  ctx.stroke();
}

/** In the water: his dark shape under the surface, deep as k (0 none to 1 full). */
export function drawReaperShadow(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  k: number,
  len = 240,
): void {
  const { ctx } = v;
  const c = Math.cos(h);
  const s = Math.sin(h);
  ctx.fillStyle = `rgba(10,30,52,${0.3 * Math.max(0, Math.min(1, k))})`;
  for (let i = 0; i <= 8; i++) {
    const kk = -1 + i / 4;
    const l = (kk * len) / 2;
    const w = (width(kk) / 20) * len * 0.09;
    v.isoEllipse(x + c * l, y + s * l, Math.max(4, w));
    ctx.fill();
  }
}

/** In the water: his fin up out of it, striped yellow and black, and its wake; up 0 gone to 1 full. */
export function drawReaperFin(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  up: number,
  angry: boolean,
  T: number,
  len = 240,
): void {
  const u = Math.max(0, Math.min(1, up));
  if (u <= 0.02) return;
  const { ctx, px, py } = v;
  const size = len / 240;
  const Z = v.zoom * 1.5 * size * u;
  // The fin stands a little behind his middle.
  const fx = x - Math.cos(h) * len * 0.08;
  const fy = y - Math.sin(h) * len * 0.08;
  const sx = px(fx, fy);
  const sy = py(fx, fy);
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  // The wake off it.
  for (const side of [-1, 1]) {
    const bx = fx - Math.cos(h + side * 0.3) * 70 * size;
    const by = fy - Math.sin(h + side * 0.3) * 70 * size;
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 2 * v.zoom;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(px(bx, by), py(bx, by));
    ctx.stroke();
  }
  const wob = Math.sin(T * 3) * 1.5 * Z;
  const fin = () => {
    ctx.beginPath();
    ctx.moveTo(sx - 18 * Z * dir, sy);
    ctx.bezierCurveTo(
      sx - 16 * Z * dir,
      sy - 26 * Z,
      sx + 8 * Z * dir + wob,
      sy - 34 * Z,
      sx + 16 * Z * dir,
      sy,
    );
    ctx.closePath();
  };
  fin();
  ctx.fillStyle = angry ? '#FFB340' : YELLOW;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4 * Z;
  for (let i = 0; i < 4; i++) {
    const bx = sx + (-14 + i * 9) * Z * dir;
    ctx.beginPath();
    ctx.moveTo(bx, sy);
    ctx.lineTo(bx + 5 * Z * dir, sy - 34 * Z);
    ctx.stroke();
  }
  ctx.restore();
  fin();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * Z;
  ctx.stroke();
}

/**
 * His egg, at a screen point, s pixels to a world unit: pale blue, a zigzag band of his blue round it and yellow
 * speckles, as the kid's Reaper is; tipped by wob (radians) when it wobbles.
 */
export function drawReaperEgg(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  wob = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wob);
  const w = 6.2 * s;
  const h = 8.4 * s;
  // It stands on its broad end: the middle is a little above the point it rests on.
  const egg = () => {
    ctx.beginPath();
    ctx.moveTo(0, -2 * h);
    ctx.bezierCurveTo(w * 0.85, -2 * h, w * 1.05, -h * 0.55, w, -h * 0.5);
    ctx.bezierCurveTo(w * 0.95, -h * 0.05, w * 0.55, 0, 0, 0);
    ctx.bezierCurveTo(-w * 0.55, 0, -w * 0.95, -h * 0.05, -w, -h * 0.5);
    ctx.bezierCurveTo(-w * 1.05, -h * 0.55, -w * 0.85, -2 * h, 0, -2 * h);
    ctx.closePath();
  };
  egg();
  ctx.fillStyle = '#DCEEFB';
  ctx.fill();
  ctx.save();
  ctx.clip();
  // The zigzag band of his blue round its middle.
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 2.2 * s;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const zx = -w + (i / 6) * 2 * w;
    const zy = -h * 0.95 + (i % 2 ? -0.22 : 0.22) * h;
    if (i === 0) ctx.moveTo(zx, zy);
    else ctx.lineTo(zx, zy);
  }
  ctx.stroke();
  ctx.fillStyle = YELLOW;
  for (const [sx, sy] of [
    [-0.45, -1.55],
    [0.3, -1.7],
    [0.5, -0.5],
    [-0.35, -0.35],
    [0.05, -1.25],
  ] as const) {
    ctx.beginPath();
    ctx.arc(sx * w, sy * h, 0.9 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // Light on its shoulder.
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.4, -h * 1.45, w * 0.22, h * 0.3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  egg();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1 * s;
  ctx.stroke();
  ctx.restore();
}

/** His nest on the sand: a hollow ringed with seaweed and driftwood, at world x, y, this wide. */
export function drawReaperNest(v: DrawView, x: number, y: number, r: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  v.isoEllipse(x, y, r + 3);
  ctx.fillStyle = 'rgba(120,96,58,.35)';
  ctx.fill();
  v.isoEllipse(x, y, r * 0.7);
  ctx.fillStyle = '#B99A63';
  ctx.fill();
  // Seaweed heaped round the rim, darker at the back.
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const ax = x + Math.cos(a) * r;
    const ay = y + Math.sin(a) * r;
    const bx = x + Math.cos(a + 0.5) * r;
    const by = y + Math.sin(a + 0.5) * r;
    ctx.strokeStyle = i % 3 === 0 ? '#5B4A33' : i % 2 ? '#3E6B3A' : '#4F7D3F';
    ctx.lineWidth = (i % 3 === 0 ? 2.2 : 3.2) * Z;
    ctx.beginPath();
    ctx.moveTo(px(ax, ay), py(ax, ay, 2));
    ctx.quadraticCurveTo(
      px((ax + bx) / 2, (ay + by) / 2),
      py((ax + bx) / 2, (ay + by) / 2, 5),
      px(bx, by),
      py(bx, by, 2),
    );
    ctx.stroke();
  }
}
