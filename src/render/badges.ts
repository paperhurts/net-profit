/**
 * Drawing a companion's badge (data/badges.ts): a little round pin over its head in the badge's colour, with its
 * mark (a shield, a sword, a cross); and with the shield badge, a bubble of blue light round it that fades as it
 * takes hits and flashes bright when it takes one.
 */

import type { BadgeKind, Worn } from '../data/badges';
import type { DrawView } from '../entities/entity';

export const BADGE_COLOUR: Readonly<Record<BadgeKind, string>> = {
  shield: '#4FA8FF',
  damage: '#E5483B',
  heal: '#3FB37A',
};

/** A companion's badge, over a companion standing at world (x, y) this tall. */
export function drawWorn(v: DrawView, x: number, y: number, tall: number, w: Worn): void {
  if (!w.badge) return;
  const { ctx } = v;
  const Z = v.zoom;
  const sx = v.px(x, y);
  const mid = v.py(x, y, tall * 0.5);
  if (w.badge === 'shield' && (w.shield > 0 || w.flash > 0)) {
    const left = w.shieldMax ? w.shield / w.shieldMax : 0;
    const r = (tall * 0.62 + 6) * Z;
    const glow = w.flash > 0 ? w.flash / 0.35 : 0;
    const g = ctx.createRadialGradient(sx, mid, r * 0.55, sx, mid, r);
    g.addColorStop(0, 'rgba(120,190,255,0)');
    g.addColorStop(1, `rgba(120,190,255,${0.18 + 0.22 * left + 0.4 * glow})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(sx, mid, r * 0.85, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(170,220,255,${0.35 + 0.35 * left + 0.3 * glow})`;
    ctx.lineWidth = (1.2 + glow) * Z;
    ctx.stroke();
  }
  drawPin(ctx, sx, v.py(x, y, tall + 7), 3.6 * Z, w.badge);
}

/** A badge's round pin at screen (sx, sy), this big: its colour, a white rim, and its mark. */
export function drawPin(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  r: number,
  k: BadgeKind,
): void {
  ctx.fillStyle = BADGE_COLOUR[k];
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = r * 0.28;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (k === 'shield') {
    ctx.moveTo(sx - r * 0.5, sy - r * 0.5);
    ctx.lineTo(sx + r * 0.5, sy - r * 0.5);
    ctx.lineTo(sx + r * 0.45, sy + r * 0.05);
    ctx.quadraticCurveTo(sx + r * 0.3, sy + r * 0.45, sx, sy + r * 0.62);
    ctx.quadraticCurveTo(sx - r * 0.3, sy + r * 0.45, sx - r * 0.45, sy + r * 0.05);
    ctx.closePath();
    ctx.fill();
  } else if (k === 'damage') {
    ctx.lineWidth = r * 0.26;
    ctx.moveTo(sx - r * 0.45, sy + r * 0.45);
    ctx.lineTo(sx + r * 0.5, sy - r * 0.5);
    ctx.moveTo(sx - r * 0.5, sy + r * 0.05);
    ctx.lineTo(sx - r * 0.05, sy + r * 0.5);
    ctx.stroke();
  } else {
    ctx.lineWidth = r * 0.32;
    ctx.moveTo(sx, sy - r * 0.5);
    ctx.lineTo(sx, sy + r * 0.5);
    ctx.moveTo(sx - r * 0.5, sy);
    ctx.lineTo(sx + r * 0.5, sy);
    ctx.stroke();
  }
}
