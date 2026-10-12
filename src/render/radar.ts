/**
 * The radar's scope, drawn into its own little canvas in the corner: dark water, two rings, the
 * islands as grey shapes and the lines of buoys dotted in red, the line sweeping round with a
 * fading wake, the blips (bright where the line has just passed, dimming until it comes round
 * again), and the boat in the middle pointing the way it is heading.
 */

import { BLIP_COLOUR, type Blip, blipGlow, RADAR_RANGE, scopeAt, sweepAngle } from '../world/radar';

export type RadarView = {
  boat: { x: number; y: number; h: number };
  blips: readonly Blip[];
  isles: readonly { x: number; y: number; r: number }[];
  /** Lines of buoys: each a square from lo to hi on both axes, and its colour. */
  lines: readonly { lo: number; hi: number; colour: string }[];
  /** Game seconds, for the sweep. */
  T: number;
};

const WAKE = 14;
const WAKE_STEP = 0.07;

/** The scope, filling a square of side S (CSS pixels; the caller scales for the screen). */
export function drawRadar(ctx: CanvasRenderingContext2D, S: number, v: RadarView): void {
  const c = S / 2;
  const R = c - 3;
  const at = (x: number, y: number): [number, number] => {
    const [sx, sy] = scopeAt(x - v.boat.x, y - v.boat.y);
    return [c + sx * R, c + sy * R];
  };
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.clip();
  const bg = ctx.createRadialGradient(c, c, 0, c, c, R);
  bg.addColorStop(0, '#0E4250');
  bg.addColorStop(1, '#072A34');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);
  // The islands, grey, and the lines of buoys.
  ctx.fillStyle = 'rgba(183,196,199,.32)';
  for (const i of v.isles) {
    const [x, y] = at(i.x, i.y);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, (i.r / RADAR_RANGE) * R), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 1.6;
  ctx.setLineDash([2, 3]);
  for (const l of v.lines) {
    ctx.strokeStyle = l.colour;
    ctx.beginPath();
    for (const [k, [x, y]] of [
      [l.lo, l.lo],
      [l.hi, l.lo],
      [l.hi, l.hi],
      [l.lo, l.hi],
    ].entries()) {
      const [px, py] = at(x as number, y as number);
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Two rings and a cross.
  ctx.strokeStyle = 'rgba(207,232,236,.18)';
  ctx.lineWidth = 1;
  for (const k of [1 / 3, 2 / 3]) {
    ctx.beginPath();
    ctx.arc(c, c, R * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(c - R, c);
  ctx.lineTo(c + R, c);
  ctx.moveTo(c, c - R);
  ctx.lineTo(c, c + R);
  ctx.stroke();
  // The line sweeping round, its wake fading behind it.
  const a = sweepAngle(v.T);
  const up = -Math.PI / 2;
  for (let i = 0; i < WAKE; i++) {
    ctx.fillStyle = `rgba(150,240,225,${0.2 * (1 - i / WAKE)})`;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.arc(c, c, R, up + a - (i + 1) * WAKE_STEP, up + a - i * WAKE_STEP);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(170,250,235,.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(c, c);
  ctx.lineTo(c + Math.cos(up + a) * R, c + Math.sin(up + a) * R);
  ctx.stroke();
  // The blips: the grey ones small and quiet, so the fish and the threats stand out; threats last, on top.
  for (const kind of ['other', 'fish', 'threat'] as const) {
    ctx.fillStyle = BLIP_COLOUR[kind];
    const r = kind === 'threat' ? 3.6 : kind === 'fish' ? 3 : 2;
    const k = kind === 'other' ? 0.55 : 1;
    for (const b of v.blips) {
      if (b.kind !== kind) continue;
      const [sx, sy] = scopeAt(b.x - v.boat.x, b.y - v.boat.y);
      ctx.globalAlpha = k * blipGlow(sx, sy, a);
      ctx.beginPath();
      ctx.arc(c + sx * R, c + sy * R, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // The boat, in the middle, pointing the way it heads.
  const [hx, hy] = scopeAt(Math.cos(v.boat.h), Math.sin(v.boat.h), 1);
  const hl = Math.hypot(hx, hy) || 1;
  const fx = hx / hl;
  const fy = hy / hl;
  ctx.fillStyle = '#FFF6E5';
  ctx.beginPath();
  ctx.moveTo(c + fx * 7, c + fy * 7);
  ctx.lineTo(c - fx * 5 - fy * 4.5, c - fy * 5 + fx * 4.5);
  ctx.lineTo(c - fx * 5 + fy * 4.5, c - fy * 5 - fx * 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // The rim.
  ctx.strokeStyle = 'rgba(255,246,229,.7)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.stroke();
}
