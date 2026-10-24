/**
 * The pet book's pictures (data/petsys.ts): each friend drawn small on its own card by the game's own renderer, so the
 * book shows them as they are in the sea and ashore. A card's canvas gets a view of its own, centred on the world's
 * origin, as the character card's preview does; the pets are drawn here, and the companions by the game, which holds
 * them (a companion's picture needs the companion).
 */

import { K as ISO_K } from '../core/iso';
import { COLOURS, GRID, PEN, type Pt, type Rig, type Stroke } from '../data/doodle';
import type { PetKey } from '../data/petsys';
import type { DrawView } from '../entities/entity';
import { drawOtterSit } from '../entities/otter';
import { makeDog, Pets } from '../entities/pets';
import { drawSealLie, SEAL_DECK_SIZE } from '../entities/seal';
import { drawSitting } from './crows';
import { drawLeggy } from './leggy';

/** How near the book's pictures are: about the character card's. */
export const PORTRAIT_ZOOM = 2.6;
/** The long and the many, drawn further off so they fit their card. */
export const PIC_ZOOM: Readonly<Record<string, number>> = {
  neil: 2,
  crows: 2,
  muffins: 2.6,
  naga: 1.45,
  baby: 1.2,
};

/**
 * A view for one card's canvas, w by h CSS pixels, with the world's origin at its middle near the bottom. `base` is the
 * game's own view, for what the renderers borrow from it (fish, stars, the palette); nothing glows or lights here.
 */
export function portraitView(
  base: DrawView,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  zoom: number,
  T: number,
): DrawView {
  const cx = w / 2;
  const cy = h * 0.8;
  const px = (x: number, y: number) => (x - y) * ISO_K * zoom + cx;
  const py = (x: number, y: number, z = 0) => (x + y) * ISO_K * 0.5 * zoom - z * zoom + cy;
  return {
    ...base,
    ctx,
    zoom,
    T,
    dark: 0,
    px,
    py,
    onScreen: () => true,
    glow() {},
    light() {},
    isoEllipse(x: number, y: number, r: number, z = 0) {
      ctx.beginPath();
      ctx.ellipse(px(x, y), py(x, y, z), r * zoom, r * zoom * 0.5, 0, 0, Math.PI * 2);
    },
  };
}

/** A dog of its own for the book, sitting, so the one on the pier is never moved. */
const bookDog = new Pets(0);
// Turned to the right of the card, a little toward you: side on, as he is seen on the pier.
bookDog.pets.push({
  ...makeDog(),
  x: 0,
  y: 0,
  tx: 0,
  ty: 0,
  z: 0,
  h: -Math.PI / 4 + 0.5,
  sit: true,
});

/** The muffins' little legs, standing in a row. */
const MUFFINS = [-6, 0, 6].map((d) => ({ x: d, y: -d, h: Math.PI / 4, stride: 0, hop: 0 }));

/** One of the pets, as it looks in the sea or ashore, at the middle of the view. */
export function drawPetPortrait(v: DrawView, k: PetKey, crows: number, muffins: number): void {
  const { ctx, T } = v;
  const sx = v.px(0, 0);
  const sy = v.py(0, 0);
  if (k === 'dog') {
    const d = bookDog.pets[0];
    if (d) d.ph = T * 6;
    bookDog.draw(v, 'solids');
  } else if (k === 'otter') {
    drawOtterSit(v, sx, sy, Math.PI / 4, T * 2, false);
  } else if (k === 'neil') {
    drawSealLie(ctx, sx, sy, 1, T * 2, 0, v.zoom * SEAL_DECK_SIZE);
  } else if (k === 'crows') {
    const n = Math.max(1, Math.min(3, crows));
    const Z = v.zoom * 1.2;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 9 * v.zoom;
      const ph = (T * 0.6 + i * 2.3) % 7;
      drawSitting(
        ctx,
        sx + off,
        sy,
        i % 2 ? -1 : 1,
        ph > 4 && ph < 4.5 ? 0.5 : 0,
        ph > 5.5 ? 0.35 : 0,
        Z,
      );
    }
  } else {
    const n = Math.max(1, Math.min(3, muffins));
    for (let i = 0; i < n; i++) {
      const m = MUFFINS[i];
      if (!m) continue;
      m.stride = T * 5 + i;
      drawLeggy(v, m, 0, i);
    }
  }
}

/**
 * A drawn pet (data/doodle.ts) at screen x, y (its feet), `size` pixels across its longer side, facing right (1) or
 * left (-1): standing on the ground as a cut-out, it bobs, squashes and stretches a little, and its legs swing in turn.
 * `ph` is the step's phase; `walk` how much it is walking, 0 standing to 1. `hop` lifts it, in pixels.
 */
export function drawDoodle(
  ctx: CanvasRenderingContext2D,
  r: Rig,
  x: number,
  y: number,
  size: number,
  face: number,
  ph: number,
  walk: number,
  hop = 0,
): void {
  if (!r.strokes.length) return;
  const s = size / Math.max(r.x1 - r.x0, r.y1 - r.y0, 16);
  const bob = Math.abs(Math.sin(ph)) * size * 0.04 * walk;
  const sq = 1 + Math.cos(ph * 2) * 0.035 * walk;
  ctx.save();
  ctx.translate(x, y - bob - hop);
  ctx.scale(face * (2 - sq), sq);
  ctx.rotate(face * 0.05 * walk);
  ctx.translate(-((r.x0 + r.x1) / 2) * s, -r.y1 * s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = PEN * s;
  r.strokes.forEach((st, i) => {
    const leg = r.legs.get(i);
    ctx.save();
    if (leg && walk > 0) {
      const [tx, ty] = leg.top;
      ctx.translate(tx * s, ty * s);
      ctx.rotate(leg.sign * Math.sin(ph) * 0.38 * walk);
      ctx.translate(-tx * s, -ty * s);
    }
    ctx.strokeStyle = COLOURS[st.c] ?? COLOURS[0];
    ctx.beginPath();
    st.p.forEach(([px, py], j) => {
      if (j) ctx.lineTo(px * s, py * s);
      else ctx.moveTo(px * s, py * s);
    });
    if (st.p.length === 1) {
      const [px, py] = st.p[0] as Pt;
      ctx.lineTo(px * s + 0.1, py * s);
    }
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

/** The pad as the finger sees it: a square `w` pixels across, faint guide dots, the strokes and the one being drawn. */
export function drawPad(
  ctx: CanvasRenderingContext2D,
  w: number,
  strokes: readonly Stroke[],
  cur: Stroke | null,
): void {
  const k = w / (GRID - 1);
  ctx.clearRect(0, 0, w, w);
  ctx.fillStyle = 'rgba(18,48,58,.08)';
  for (let gx = 8; gx < GRID; gx += 8)
    for (let gy = 8; gy < GRID; gy += 8) {
      ctx.beginPath();
      ctx.arc(gx * k, gy * k, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = PEN * k;
  for (const s of cur ? [...strokes, cur] : strokes) {
    ctx.strokeStyle = COLOURS[s.c] ?? COLOURS[0];
    ctx.beginPath();
    s.p.forEach(([x, y], i) => {
      if (i) ctx.lineTo(x * k, y * k);
      else ctx.moveTo(x * k, y * k);
    });
    if (s.p.length === 1) {
      const [x, y] = s.p[0] as Pt;
      ctx.lineTo(x * k + 0.1, y * k);
    }
    ctx.stroke();
  }
}

/** A walking pet's longer side, in world units: a little bigger than the dog, so a drawing reads on a phone. */
export const PET_SIZE = 34;

/**
 * Your walking pet (entities/petwalk.ts) at world x, y, standing at height z: its shadow, the drawing walking, facing
 * the way it goes, a hop and hearts after a pat (`love`, seconds left of `loveT`). Aboard it is drawn a little smaller.
 */
export function drawWalking(
  v: DrawView,
  r: Rig,
  x: number,
  y: number,
  z: number,
  h: number,
  ph: number,
  walk: number,
  love: number,
  loveT: number,
  scale = 1,
): void {
  const { ctx } = v;
  const Z = v.zoom * scale;
  const sx = v.px(x, y);
  const sy = v.py(x, y, z);
  const face = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  const hop = love > 0 ? Math.sin(Math.min(1, (loveT - love) / 0.45) * Math.PI) * 7 * Z : 0;
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 8 * Z, 3.2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  drawDoodle(ctx, r, sx, sy, PET_SIZE * Z, face, ph, walk, hop);
  if (love <= 0) return;
  // Hearts rising over it.
  ctx.save();
  ctx.fillStyle = '#FF698C';
  for (let i = 0; i < 3; i++) {
    const t = Math.max(0, Math.min(1, (loveT - love) / loveT - i * 0.15));
    if (t <= 0) continue;
    ctx.globalAlpha = 1 - t;
    const hx = sx + (i - 1) * 7 * Z;
    const hy = sy - PET_SIZE * Z - 4 * Z - t * 14 * Z;
    const k = 1.6 * Z;
    ctx.beginPath();
    ctx.arc(hx - k, hy, k * 1.1, 0, Math.PI * 2);
    ctx.arc(hx + k, hy, k * 1.1, 0, Math.PI * 2);
    ctx.moveTo(hx - k * 2.1, hy + k * 0.3);
    ctx.lineTo(hx, hy + k * 2.4);
    ctx.lineTo(hx + k * 2.1, hy + k * 0.3);
    ctx.fill();
  }
  ctx.restore();
}
