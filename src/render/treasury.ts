/**
 * Your treasure heap in the middle of the trophy hall (data/treasury.ts): a round stone dais, a mound of gold coins on
 * it that grows with what you have found, and on and round it the treasures themselves, sparkling.
 */

import { HEAP_R, TREASURES } from '../data/treasury';
import type { DrawView } from '../entities/entity';
import type { LootKind } from '../world/loot';

type Pen = CanvasRenderingContext2D;

/** How much bigger than a world unit each treasure is drawn, to read on a phone. */
const ITEM_SCALE = 1.4;

/** Where each treasure lies on the heap, round it and up it, from the dais's middle, and how high. */
function slot(i: number): { dx: number; dy: number; z: number } {
  // The chests round the foot, the small things higher up and nearer the top.
  const ring = i < 6 ? 0 : i < 12 ? 1 : 2;
  const k = i < 6 ? i : i < 12 ? i - 6 : i - 12;
  const n = ring === 0 ? 6 : ring === 1 ? 6 : 5;
  const a = (k / n) * Math.PI * 2 + ring * 0.5 + 0.3;
  const r = [16, 10, 4][ring] ?? 0;
  return { dx: Math.cos(a) * r, dy: Math.sin(a) * r, z: [6, 12, 17][ring] ?? 0 };
}

/** Laid out on the heap by size: the chests at its foot, then the rest. */
function order(): number[] {
  const idx = TREASURES.map((_, i) => i);
  return [
    ...idx.filter((i) => TREASURES[i]?.kind === 'chest'),
    ...idx.filter((i) => TREASURES[i]?.kind !== 'chest'),
  ];
}
const ORDER = order();

/** The heap at (x, y), with these of TREASURES found. */
export function drawTreasureHeap(
  v: DrawView,
  x: number,
  y: number,
  found: readonly boolean[],
): void {
  const { ctx, px, py, zoom: Z, T } = v;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  v.isoEllipse(x, y, HEAP_R + 4);
  ctx.fill();
  v.box(x - HEAP_R * 0.8, y - HEAP_R * 0.8, HEAP_R * 1.6, HEAP_R * 1.6, 0, 4, '#6E776C', '#8A9488');
  const n = found.filter(Boolean).length;
  if (!n) return;
  const k = n / TREASURES.length;
  // The gold, in mounds, bigger the more there is.
  const r0 = 10 + 10 * k;
  for (const [r, z, c] of [
    [r0, 4, '#B8862A'],
    [r0 * 0.8, 4 + 3 + 5 * k, '#D9A93A'],
    [r0 * 0.5, 4 + 6 + 9 * k, '#F0C544'],
  ] as const) {
    ctx.fillStyle = c;
    v.isoEllipse(x, y, r, z);
    ctx.fill();
  }
  // The treasures, back ones first.
  const items = ORDER.map((i, j) => ({ i, s: slot(j) }))
    .filter((o) => found[o.i])
    .sort((a, b) => a.s.dx + a.s.dy - (b.s.dx + b.s.dy));
  for (const { i, s } of items) {
    const t = TREASURES[i];
    if (!t) continue;
    ctx.save();
    ctx.translate(px(x + s.dx, y + s.dy), py(x + s.dx, y + s.dy, s.z * (0.4 + 0.6 * k)));
    ctx.scale(Z * ITEM_SCALE, Z * ITEM_SCALE);
    DRAW[t.kind](ctx, T, i);
    ctx.restore();
  }
  // A sparkle or two, wandering over it.
  for (let j = 0; j < Math.min(3, 1 + Math.floor(n / 6)); j++) {
    const a = T * 0.7 + j * 2.1;
    const tw = 0.5 + 0.5 * Math.sin(T * 5 + j * 3);
    ctx.fillStyle = `rgba(255,248,210,${tw})`;
    v.star(
      px(x + Math.cos(a) * r0 * 0.6, y + Math.sin(a) * r0 * 0.6),
      py(x, y, 10 + 8 * k + j * 3),
      3.5 * Z * tw,
    );
  }
}

function box(c: Pen, x: number, y: number, w: number, h: number, fill: string): void {
  c.fillStyle = fill;
  c.fillRect(x, y, w, h);
}

const DRAW: Readonly<Record<LootKind, (c: Pen, T: number, i: number) => void>> = {
  chest: (c, _T, i) => {
    const wood = i % 2 ? '#7A4A26' : '#6A4020';
    box(c, -6, -8, 12, 8, wood);
    c.fillStyle = '#8A5A2E';
    c.beginPath();
    c.ellipse(0, -8, 6, 3, 0, Math.PI, 0);
    c.fill();
    box(c, -6, -6, 12, 1.4, '#C9A04A');
    box(c, -1.2, -7, 2.4, 3, '#E8C66A');
  },
  crown: (c) => {
    c.fillStyle = '#E8B83A';
    c.beginPath();
    c.moveTo(-5, 0);
    c.lineTo(5, 0);
    c.lineTo(5, -5);
    c.lineTo(3, -2.5);
    c.lineTo(0, -6);
    c.lineTo(-3, -2.5);
    c.lineTo(-5, -5);
    c.closePath();
    c.fill();
    c.fillStyle = '#C8343A';
    c.beginPath();
    c.arc(0, -1.6, 1, 0, Math.PI * 2);
    c.fill();
  },
  bell: (c) => {
    c.fillStyle = '#C08A3A';
    c.beginPath();
    c.moveTo(-4.5, 0);
    c.quadraticCurveTo(-4, -7, 0, -7.5);
    c.quadraticCurveTo(4, -7, 4.5, 0);
    c.closePath();
    c.fill();
    box(c, -0.8, -9, 1.6, 1.6, '#8A5E26');
  },
  gem: (c, T, i) => {
    const glow = 0.7 + 0.3 * Math.sin(T * 3 + i);
    c.fillStyle = i % 2 ? `rgba(90,170,255,${glow})` : `rgba(120,240,200,${glow})`;
    c.beginPath();
    c.moveTo(0, -7);
    c.lineTo(3.5, -3);
    c.lineTo(0, 0);
    c.lineTo(-3.5, -3);
    c.closePath();
    c.fill();
  },
  spyglass: (c) => {
    c.save();
    c.rotate(-0.4);
    box(c, -6, -3, 12, 2.6, '#B8862A');
    box(c, -6, -3.4, 3, 3.4, '#5A3A22');
    c.restore();
  },
  clam: (c) => {
    c.fillStyle = '#F2F0E8';
    c.beginPath();
    c.arc(0, -2, 2.4, 0, Math.PI * 2);
    c.fill();
  },
};
