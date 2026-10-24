/**
 * The pet book's pictures (data/petsys.ts): each friend drawn small on its own card by the game's own renderer, so the
 * book shows them as they are in the sea and ashore. A card's canvas gets a view of its own, centred on the world's
 * origin, as the character card's preview does; the pets are drawn here, and the companions by the game, which holds
 * them (a companion's picture needs the companion).
 */

import { K as ISO_K } from '../core/iso';
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
