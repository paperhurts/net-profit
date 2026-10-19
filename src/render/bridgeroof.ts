/**
 * The metal bridge's roof (world/bridgein.ts BRIDGE_ROOF), up the observatory's ladder: open to the night sky, the sea
 * below on the near side and the tar on the far side, a plated round deck with a rail all round it and the hatch the
 * ladder comes up through, and in the middle, on its pedestal, the orb, island 9's, glowing purple, brighter while a hand
 * is in it. And the ladder itself, standing in the observatory.
 */

import type { DrawView } from '../entities/entity';
import type { Pt } from '../world/bridgein';
import type { Room } from '../world/tower';
import { box } from './metalbridge';

const SEA = '#1E5D6B';
const TAR = '#17121B';
const DECK = '#5D6873';
const RAIL = '#B9C4CB';

const hash = (i: number, k: number): number => {
  const h = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return h - Math.floor(h);
};

/** The sky, the sea and the tar far below, the deck, its rail, and the hatch at (hatch). */
export function drawRoofBack(v: DrawView, R: Room, hatch: Pt, W: number, H: number): void {
  const { ctx, px, py, T, zoom: Z } = v;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0B0A22');
  g.addColorStop(1, '#2A2150');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 46; i++) {
    ctx.globalAlpha = 0.35 + 0.4 * Math.sin(T * 1.7 + i * 3.1);
    ctx.fillRect(hash(i, 1) * W, hash(i, 2) * H * 0.55, 2, 2);
  }
  ctx.globalAlpha = 1;
  // Far below: the sea on the near side, the tar on the far side, the bridge between them.
  const below = (a0: number, a1: number, c: string) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(px(R.x, R.y), py(R.x, R.y, -60));
    for (let k = 0; k <= 16; k++) {
      const a = a0 + ((a1 - a0) * k) / 16;
      const x = R.x + Math.cos(a) * (R.r + 330);
      const y = R.y + Math.sin(a) * (R.r + 330);
      ctx.lineTo(px(x, y), py(x, y, -60));
    }
    ctx.closePath();
    ctx.fill();
  };
  below(-Math.PI * 0.75, Math.PI * 0.25, SEA);
  below(Math.PI * 0.25, Math.PI * 1.25, TAR);
  // The deck: plated, round, its edge.
  v.isoEllipse(R.x, R.y, R.r, -6);
  ctx.fillStyle = '#3C454C';
  ctx.fill();
  v.isoEllipse(R.x, R.y, R.r);
  ctx.fillStyle = DECK;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.14)';
  ctx.lineWidth = 1.5 * Z;
  for (const k of [0.33, 0.66]) {
    v.isoEllipse(R.x, R.y, R.r * k);
    ctx.stroke();
  }
  // The hatch, open, the top of the ladder showing.
  ctx.fillStyle = '#20262B';
  ctx.beginPath();
  const hs = 12;
  ctx.moveTo(px(hatch.x - hs, hatch.y - hs), py(hatch.x - hs, hatch.y - hs));
  ctx.lineTo(px(hatch.x + hs, hatch.y - hs), py(hatch.x + hs, hatch.y - hs));
  ctx.lineTo(px(hatch.x + hs, hatch.y + hs), py(hatch.x + hs, hatch.y + hs));
  ctx.lineTo(px(hatch.x - hs, hatch.y + hs), py(hatch.x - hs, hatch.y + hs));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8D9AA3';
  ctx.lineWidth = 1.6 * Z;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(px(hatch.x + s * 6, hatch.y - s * 6), py(hatch.x + s * 6, hatch.y - s * 6));
    ctx.lineTo(px(hatch.x + s * 6, hatch.y - s * 6), py(hatch.x + s * 6, hatch.y - s * 6, 10));
    ctx.stroke();
  }
  // The rail all round the back of the deck, so nobody steps off.
  rail(v, R, Math.PI * 0.75, Math.PI * 1.75);
}

/** The rail round the front of the deck, drawn over the figure: the near half. */
export function drawRoofRail(v: DrawView, R: Room): void {
  rail(v, R, -Math.PI * 0.25, Math.PI * 0.75);
}

function rail(v: DrawView, R: Room, a0: number, a1: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const pts: Pt[] = [];
  for (let k = 0; k <= 16; k++) {
    const a = a0 + ((a1 - a0) * k) / 16;
    pts.push({ x: R.x + Math.cos(a) * (R.r - 3), y: R.y + Math.sin(a) * (R.r - 3) });
  }
  ctx.strokeStyle = '#8D9AA3';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  for (const p of pts) {
    ctx.moveTo(px(p.x, p.y), py(p.x, p.y, 0));
    ctx.lineTo(px(p.x, p.y), py(p.x, p.y, 22));
  }
  ctx.stroke();
  ctx.lineWidth = 2.6 * Z;
  ctx.strokeStyle = RAIL;
  ctx.beginPath();
  for (const p of pts) ctx.lineTo(px(p.x, p.y), py(p.x, p.y, 22));
  ctx.stroke();
}

/** The orb on its pedestal at p, glowing; brighter, and swirling with light, while glow is up (0 to 1). */
export function drawOrbStand(v: DrawView, p: Pt, glow: number): void {
  const { ctx, px, py, T, zoom: Z } = v;
  box(v, p.x - 14, p.y - 14, 28, 28, 0, 34, '#3E474E', '#4C575E', '#6A767F');
  box(v, p.x - 18, p.y - 18, 36, 36, 30, 36, '#3E474E', '#4C575E', '#7C8891');
  const sx = px(p.x, p.y);
  const sy = py(p.x, p.y, 52);
  const k = 0.75 + 0.25 * Math.sin(T * 2.2) + glow * 0.6;
  const r = (38 + glow * 30) * Z;
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
  g.addColorStop(0, `rgba(210,170,255,${Math.min(1, 0.6 * k)})`);
  g.addColorStop(1, 'rgba(210,170,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = glow > 0.05 ? '#CFA6FF' : '#B57CFF';
  ctx.beginPath();
  ctx.arc(sx, sy, 15 * Z, 0, Math.PI * 2);
  ctx.fill();
  // Light swirling inside it.
  ctx.strokeStyle = `rgba(255,255,255,${0.35 + glow * 0.5})`;
  ctx.lineWidth = 1.4 * Z;
  for (let i = 0; i < 3; i++) {
    const a = T * (1.2 + glow * 3) + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(sx, sy, (6 + i * 2.5) * Z, a, a + 1.4);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath();
  ctx.arc(sx - 4.5 * Z, sy - 5 * Z, 3.6 * Z, 0, Math.PI * 2);
  ctx.fill();
}

/** The ladder up to the roof, standing at p in the observatory, going up out of sight. */
export function drawLadder(v: DrawView, p: Pt): void {
  const { ctx, px, py, zoom: Z } = v;
  ctx.strokeStyle = '#9AA6AE';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.4 * Z;
  const top = 150;
  for (const s of [-1, 1]) {
    const x = p.x + s * 7;
    const y = p.y - s * 7;
    ctx.beginPath();
    ctx.moveTo(px(x, y), py(x, y, 0));
    ctx.lineTo(px(x, y), py(x, y, top));
    ctx.stroke();
  }
  ctx.lineWidth = 1.8 * Z;
  for (let h = 10; h < top; h += 14) {
    ctx.beginPath();
    ctx.moveTo(px(p.x - 7, p.y + 7), py(p.x - 7, p.y + 7, h));
    ctx.lineTo(px(p.x + 7, p.y - 7), py(p.x + 7, p.y - 7, h));
    ctx.stroke();
  }
  // Light falling down it from the open hatch above.
  ctx.fillStyle = 'rgba(181,124,255,.12)';
  ctx.beginPath();
  ctx.ellipse(px(p.x, p.y), py(p.x, p.y), 16 * Z, 6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
}
