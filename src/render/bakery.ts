/**
 * The muffin man's bakery (entities/muffinman.ts): a little stall on the pier, a counter in pink with a cream top and
 * a row of muffins on it, a striped pink and cream awning on four posts, MUFFINS painted along the counter's front, and
 * the baker behind the counter, round, in a white coat, with a big curly moustache and a tall white hat. He rocks gently
 * from foot to foot, and as he speaks he hops and holds a muffin up. On the sand at the pier's root, a street sign on a
 * post: DRURY LANE, black on white with the district in red, as the street signs are in London. His words come up in a
 * speech bubble over his head, kept on the screen; with the figure near and nothing said, a "..." says he would talk.
 */

import type { DrawView } from '../entities/entity';
import {
  BAKER,
  BAKERY,
  DECK_Z,
  DRURY_LANE,
  type MuffinMan,
  SAY_FOR,
  WORDS_Z,
} from '../entities/muffinman';

const INK = '#1D2B3A';
const PINK = '#E58FAE';
const PINK_SIDE = '#C9708F';
const CREAM = '#FFF4E8';
const WOOD = '#7A5230';

type Pt = [number, number];

/** A muffin standing on screen point x, y (the foot of its paper cup), r across, with a top of this colour. */
export function drawMuffin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  top: string,
  tail: boolean,
): void {
  ctx.fillStyle = '#E8D3B2';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.75, y);
  ctx.lineTo(x + r * 0.75, y);
  ctx.lineTo(x + r, y - r);
  ctx.lineTo(x - r, y - r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,90,50,.45)';
  ctx.lineWidth = Math.max(0.5, r * 0.12);
  for (const k of [-0.4, 0, 0.4]) {
    ctx.beginPath();
    ctx.moveTo(x + k * r * 0.8, y);
    ctx.lineTo(x + k * r, y - r);
    ctx.stroke();
  }
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(x, y - r, r * 1.25, r * 0.95, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  // A fish's tail sticking up out of the top: they are fish muffins.
  if (tail) {
    ctx.fillStyle = '#9FB8C4';
    ctx.beginPath();
    ctx.moveTo(x + r * 0.15, y - r * 1.6);
    ctx.lineTo(x - r * 0.35, y - r * 2.45);
    ctx.lineTo(x + r * 0.2, y - r * 2.15);
    ctx.lineTo(x + r * 0.75, y - r * 2.4);
    ctx.closePath();
    ctx.fill();
  }
}

/** The stall and the baker behind it, on the pier's deck. Drawn with the pier, which it stands on. */
export function drawBakery(v: DrawView, m: MuffinMan): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const z = DECK_Z;
  const { x0, x1, y0, y1 } = BAKERY;
  const P = (x: number, y: number, h: number): Pt => [px(x, y), py(x, y, h)];
  const line = (a: Pt, b: Pt, col: string, w: number) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w * Z;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  const quad = (pts: Pt[], fill: string) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const back = y0 + 1;
  const front = y1 - 1;
  // The awning stands high enough that the baker's hat shows under its front edge.
  const top = z + 42;
  const lip = z + 37;
  const edge = y1 + 1;
  // The back posts.
  for (const x of [x0 + 1, x1 - 1]) line(P(x, back, z), P(x, back, top), WOOD, 1.6);
  drawBaker(v, m);
  // The counter, MUFFINS painted along its front, and the muffins on it.
  v.box(x0, y1 - 4.5, x1 - x0, 4.5, z, z + 11, PINK_SIDE, CREAM);
  line(P(x0, y1, z + 9.6), P(x1, y1, z + 9.6), CREAM, 1);
  {
    const [cx, cy] = P((x0 + x1) / 2, y1, z + 4.6);
    ctx.save();
    ctx.translate(cx, cy);
    // Along the face: a step along x on the ground is one across and half down on the screen.
    ctx.transform(1, 0.5, 0, 1, 0, 0);
    ctx.fillStyle = CREAM;
    // As big as fits along the face, with a margin at each end.
    let size = 6 * Z;
    ctx.font = `800 ${size}px Grandstander, ui-rounded, system-ui, sans-serif`;
    const room = (x1 - x0 - 8) * Z;
    const tw = ctx.measureText('MUFFINS').width;
    if (tw > room) {
      size *= room / tw;
      ctx.font = `800 ${size}px Grandstander, ui-rounded, system-ui, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MUFFINS', 0, 0);
    ctx.restore();
  }
  const tops = ['#9A6234', '#C98B4E', '#6E4426', '#B07440', '#8A5A3C'];
  tops.forEach((c, i) => {
    const [sx, sy] = P(x0 + 5 + i * 6, y1 - 2.2, z + 11);
    drawMuffin(ctx, sx, sy, 1.9 * Z, c, i % 2 === 0);
  });
  // The front posts, up from the counter.
  for (const x of [x0 + 1, x1 - 1]) line(P(x, front, z + 11), P(x, front, lip), WOOD, 1.4);
  // The awning, striped, sloping down to the front and a little past it, with a scalloped edge.
  const N = 6;
  const ax0 = x0 - 2;
  const step = (x1 - x0 + 4) / N;
  for (let i = 0; i < N; i++) {
    const xa = ax0 + i * step;
    const xb = xa + step;
    const fill = i % 2 ? CREAM : PINK;
    quad([P(xa, y0 - 1, top), P(xb, y0 - 1, top), P(xb, edge, lip), P(xa, edge, lip)], fill);
    const [ex0, ey0] = P(xa, edge, lip);
    const [ex1, ey1] = P(xb, edge, lip);
    const mx = (ex0 + ex1) / 2;
    const my = (ey0 + ey1) / 2;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(
      mx,
      my,
      Math.hypot(ex1 - ex0, ey1 - ey0) / 2,
      2.2 * Z,
      Math.atan2(ey1 - ey0, ex1 - ex0),
      0,
      Math.PI,
    );
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(29,43,58,.35)';
  ctx.lineWidth = 0.8 * Z;
  ctx.beginPath();
  const corners = [
    P(ax0, y0 - 1, top),
    P(x1 + 2, y0 - 1, top),
    P(x1 + 2, edge, lip),
    P(ax0, edge, lip),
  ];
  corners.forEach(([x, y], i) => {
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();
}

/** The baker: round, in white, a big moustache and a tall hat; hops and holds up a muffin as he speaks. */
function drawBaker(v: DrawView, m: MuffinMan): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const hop = m.bounce();
  const x = BAKER.x + m.sway();
  const y = BAKER.y;
  const z = DECK_Z + hop * 3;
  const sx = px(x, y);
  const at = (h: number) => py(x, y, z + h);
  // The coat.
  ctx.fillStyle = '#FBF8F1';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1 * Z;
  ctx.beginPath();
  ctx.ellipse(sx, at(10.5), 6.2 * Z, 7.8 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#C9B9A4';
  for (const h of [13.5, 10]) {
    ctx.beginPath();
    ctx.arc(sx + 0.4 * Z, at(h), 0.7 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // Talking, the near arm comes up with a muffin in its hand.
  const talking = m.t < SAY_FOR;
  if (talking) {
    const hx = sx + 8.5 * Z;
    const hy = at(25);
    ctx.strokeStyle = '#FBF8F1';
    ctx.lineWidth = 2.6 * Z;
    ctx.beginPath();
    ctx.moveTo(sx + 4.5 * Z, at(15));
    ctx.lineTo(hx, hy);
    ctx.stroke();
    drawMuffin(ctx, hx, hy - 0.5 * Z, 2.2 * Z, '#9A6234', true);
  }
  // The head: rosy cheeks, two dots of eyes and a big curly moustache.
  const hy = at(20);
  ctx.fillStyle = '#F1C7A4';
  ctx.beginPath();
  ctx.arc(sx, hy, 4.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(229,110,120,.5)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx + s * 2.7 * Z, hy + 0.9 * Z, 1.1 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = INK;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx + s * 1.6 * Z, hy - 0.9 * Z, 0.65 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#3A2A20';
  ctx.lineWidth = 1.3 * Z;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx, hy + 1.2 * Z);
    ctx.quadraticCurveTo(sx + s * 2.6 * Z, hy + 2.6 * Z, sx + s * 4 * Z, hy + 0.6 * Z);
    ctx.quadraticCurveTo(sx + s * 4.6 * Z, hy - 0.2 * Z, sx + s * 4 * Z, hy - 0.5 * Z);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // The hat: a band and a puff over it.
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = 'rgba(29,43,58,.5)';
  ctx.lineWidth = 0.8 * Z;
  ctx.beginPath();
  ctx.arc(sx - 2.4 * Z, hy - 7.8 * Z, 2.5 * Z, 0, Math.PI * 2);
  ctx.moveTo(sx + 4.9 * Z, hy - 7.8 * Z);
  ctx.arc(sx + 2.4 * Z, hy - 7.8 * Z, 2.5 * Z, 0, Math.PI * 2);
  ctx.moveTo(sx + 3.1 * Z, hy - 9.8 * Z);
  ctx.arc(sx, hy - 9.8 * Z, 3.1 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(sx - 3.6 * Z, hy - 6.6 * Z, 7.2 * Z, 3 * Z);
  ctx.strokeRect(sx - 3.6 * Z, hy - 6.6 * Z, 7.2 * Z, 3 * Z);
}

/** The street sign on its post: DRURY LANE, black on white, the district in red. */
export function drawDruryLane(v: DrawView): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const { x, y } = DRURY_LANE;
  v.box(x - 1, y - 1, 2, 2, 0, 30, '#2F3A40', '#4A5860');
  const sx = px(x, y);
  const sy = py(x, y, 34);
  const w = 58 * Z;
  const h = 13 * Z;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(sx - w / 2, sy - h / 2, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9 * Z;
  ctx.strokeRect(sx - w / 2 + 1.4 * Z, sy - h / 2 + 1.4 * Z, w - 2.8 * Z, h - 2.8 * Z);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  let size = 6.4 * Z;
  ctx.font = `700 ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  const room = w - 17 * Z;
  const tw = ctx.measureText('DRURY LANE').width;
  if (tw > room) {
    size *= room / tw;
    ctx.font = `700 ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  }
  ctx.fillStyle = '#15181A';
  ctx.fillText('DRURY LANE', sx - 4 * Z, sy + 0.3 * Z);
  ctx.fillStyle = '#C8102E';
  ctx.font = `700 ${3.2 * Z}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.fillText('WC2', sx + w / 2 - 7 * Z, sy + 0.3 * Z);
  ctx.restore();
}

/** A rounded box path, for the bubble (roundRect is missing on older Safari). */
function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * His words in a speech bubble over his hat, in screen pixels, kept inside a screen W wide; or, with the figure near
 * and nothing said, a small "..." that bobs.
 */
export function drawMuffinWords(v: DrawView, m: MuffinMan, W: number): void {
  const { ctx } = v;
  const text = m.saying();
  if (!text && !m.near) return;
  const sx = v.px(BAKER.x, BAKER.y);
  const sy = v.py(BAKER.x, BAKER.y, WORDS_Z + m.bounce() * 3);
  ctx.save();
  ctx.font = '700 15px Grandstander, ui-rounded, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const say = text ?? '...';
  // Never wider than the screen, less a margin.
  let size = 15;
  const most = W - 28;
  if (ctx.measureText(say).width > most) {
    size = Math.max(10, (15 * most) / ctx.measureText(say).width);
    ctx.font = `700 ${size}px Grandstander, ui-rounded, system-ui, sans-serif`;
  }
  const tw = ctx.measureText(say).width;
  const bw = tw + (text ? 22 : 16);
  const bh = text ? size + 15 : 20;
  const bob = text ? 0 : Math.sin(v.T * 3) * 1.5;
  const bx = Math.min(W - 8 - bw, Math.max(8, sx - bw / 2));
  const by = sy - 10 - bh + bob;
  const a = text ? Math.min(1, (SAY_FOR - m.t) / 0.3) : 0.85;
  const pop = text && m.t < 0.15 ? 0.7 + (m.t / 0.15) * 0.3 : 1;
  ctx.globalAlpha = a;
  ctx.translate(sx, sy);
  ctx.scale(pop, pop);
  ctx.translate(-sx, -sy);
  const tx = Math.min(bx + bw - 14, Math.max(bx + 14, sx));
  rounded(ctx, bx, by, bw, bh, Math.min(12, bh / 2));
  ctx.fillStyle = '#FFFBEF';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // The tail, down to him.
  ctx.beginPath();
  ctx.moveTo(tx - 6, by + bh - 0.8);
  ctx.lineTo(sx, sy + bob);
  ctx.lineTo(tx + 6, by + bh - 0.8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tx - 6, by + bh);
  ctx.lineTo(sx, sy + bob);
  ctx.lineTo(tx + 6, by + bh);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.fillText(say, bx + bw / 2, by + bh / 2 + 1);
  ctx.restore();
}
