/**
 * Doom Island's two minions (entities/pals.ts, kinds 'parrot' and 'bun'), the kid's, and the two who give them
 * (world/doom.ts LEADER13). Jacks Parrow, the pirates' parrot: red and green with blue in his wings, a hooked
 * beak, and an eyepatch over his right eye; he rides the figure's shoulder and flaps off to peck, and when he talks
 * a bubble comes up over him with the rude words bleeped. Bun-San, the ninjas' ninja-bun: a little blue bunny in a
 * black ninja suit, a red headband with its tails flying, and a tiny katana; he hops at the figure's heel, spins with
 * his sword, and goes up in a puff of smoke when something hits him. The Captain, big, in a red coat and a black
 * tricorn with a feather; the Master, small and old in grey robes, a white beard, a hood and a staff.
 */

import { type Squawk, squawkParts } from '../data/doomfolk';
import type { DrawView } from '../entities/entity';

/** Which way something faces on the screen, from its heading in the world: 1 to the right, -1 to the left. */
function facing(h: number): number {
  return Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
}

/**
 * Jacks Parrow at screen x, y (his feet), this big: perched, wings folded, or flying, wings beating with flap, a peck
 * when pecking is near 1.
 */
export function drawParrot(
  v: DrawView,
  sx: number,
  sy: number,
  h: number,
  flap: number,
  flying: boolean,
  peck: number,
  size = 1,
): void {
  const { ctx } = v;
  const Z = v.zoom * size;
  const f = facing(h);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(f, 1);
  // His tail, long, red and blue, hanging down behind.
  ctx.fillStyle = '#2E6FD8';
  ctx.beginPath();
  ctx.moveTo(-2 * Z, -4 * Z);
  ctx.lineTo(-9 * Z, 4 * Z);
  ctx.lineTo(-6 * Z, 5 * Z);
  ctx.lineTo(1 * Z, -2 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#D8352E';
  ctx.beginPath();
  ctx.moveTo(-1 * Z, -4 * Z);
  ctx.lineTo(-7 * Z, 6 * Z);
  ctx.lineTo(-4.5 * Z, 6.5 * Z);
  ctx.lineTo(1.5 * Z, -2.5 * Z);
  ctx.closePath();
  ctx.fill();
  // His body, green, leaning forward to peck.
  const lean = peck * 0.5;
  ctx.rotate(lean);
  ctx.fillStyle = '#3FA34D';
  ctx.beginPath();
  ctx.ellipse(0, -7 * Z, 3.6 * Z, 5.4 * Z, -0.25, 0, Math.PI * 2);
  ctx.fill();
  // His head, red, with the hooked beak and the eyepatch.
  ctx.fillStyle = '#D8352E';
  ctx.beginPath();
  ctx.arc(1.6 * Z, -12.4 * Z, 3.2 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F4EBD0';
  ctx.beginPath();
  ctx.moveTo(4.2 * Z, -13.4 * Z);
  ctx.quadraticCurveTo(7.6 * Z, -13 * Z, 6 * Z, -9.6 * Z);
  ctx.lineTo(4.4 * Z, -11.2 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1A1A1E';
  ctx.beginPath();
  ctx.arc(2.6 * Z, -13 * Z, 1.2 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1A1A1E';
  ctx.lineWidth = 0.7 * Z;
  ctx.beginPath();
  ctx.moveTo(-1.4 * Z, -15 * Z);
  ctx.lineTo(3.6 * Z, -12 * Z);
  ctx.stroke();
  // His wing: folded at his side, or beating.
  ctx.fillStyle = '#2E9A55';
  if (flying) {
    const up = Math.sin(flap);
    ctx.beginPath();
    ctx.moveTo(-1 * Z, -8 * Z);
    ctx.quadraticCurveTo(-7 * Z, -8 * Z - up * 9 * Z, -11 * Z, -6 * Z - up * 12 * Z);
    ctx.lineTo(-3 * Z, -5 * Z);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2E6FD8';
    ctx.beginPath();
    ctx.moveTo(-6 * Z, -7.5 * Z - up * 5 * Z);
    ctx.lineTo(-11 * Z, -6 * Z - up * 12 * Z);
    ctx.lineTo(-8 * Z, -5.5 * Z - up * 6 * Z);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(-1 * Z, -6.5 * Z, 2.4 * Z, 4.4 * Z, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2E6FD8';
    ctx.beginPath();
    ctx.ellipse(-2 * Z, -3.5 * Z, 1.4 * Z, 2.2 * Z, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Bun-San at screen x, y (his feet): hopping with gait, his sword out and spinning while slashing is near 1. Facing
 * the viewer or away by his heading.
 */
export function drawBun(
  v: DrawView,
  sx: number,
  sy: number,
  h: number,
  ph: number,
  gait: number,
  slash: number,
  size = 1,
): void {
  const { ctx, T } = v;
  const Z = v.zoom * size;
  const f = facing(h);
  const hop = Math.abs(Math.sin(ph * 0.9)) * 5 * Z * gait;
  const y = sy - hop;
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 6 * Z, 2.6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(sx, y);
  ctx.scale(f, 1);
  // His sword: on his back, its hilt over his shoulder, or out in a spinning slash.
  if (slash > 0) {
    const a = -Math.PI / 2 + slash * Math.PI * 2;
    ctx.strokeStyle = 'rgba(220,235,255,.55)';
    ctx.lineWidth = 2 * Z;
    ctx.beginPath();
    ctx.arc(0, -8 * Z, 12 * Z, a - 1.6, a);
    ctx.stroke();
    ctx.strokeStyle = '#DDE6F0';
    ctx.lineWidth = 1.6 * Z;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 3 * Z, -8 * Z + Math.sin(a) * 3 * Z);
    ctx.lineTo(Math.cos(a) * 12 * Z, -8 * Z + Math.sin(a) * 12 * Z);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#2A2A30';
    ctx.lineWidth = 1.6 * Z;
    ctx.beginPath();
    ctx.moveTo(-5 * Z, -3 * Z);
    ctx.lineTo(4 * Z, -15 * Z);
    ctx.stroke();
    ctx.strokeStyle = '#C9A03E';
    ctx.lineWidth = 1.8 * Z;
    ctx.beginPath();
    ctx.moveTo(2.6 * Z, -13 * Z);
    ctx.lineTo(5 * Z, -16.4 * Z);
    ctx.stroke();
  }
  // His feet, his body in the black suit.
  ctx.fillStyle = '#7FA8E8';
  ctx.beginPath();
  ctx.ellipse(-2.4 * Z, -0.8 * Z, 2.2 * Z, 1.2 * Z, 0, 0, Math.PI * 2);
  ctx.ellipse(2.6 * Z, -0.8 * Z, 2.2 * Z, 1.2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#26262E';
  ctx.beginPath();
  ctx.ellipse(0, -5.6 * Z, 4.4 * Z, 5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3A3A44';
  ctx.fillRect(-4 * Z, -5.4 * Z, 8 * Z, 1.4 * Z);
  // His head, blue; his ears up, pink inside, one bent.
  ctx.fillStyle = '#7FA8E8';
  ctx.beginPath();
  ctx.ellipse(-2 * Z, -19 * Z, 1.6 * Z, 4.6 * Z, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1.4 * Z, -14.6 * Z);
  ctx.quadraticCurveTo(3 * Z, -22 * Z, 6.6 * Z, -21 * Z);
  ctx.quadraticCurveTo(4.6 * Z, -17.4 * Z, 3 * Z, -14 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#F2B5C8';
  ctx.beginPath();
  ctx.ellipse(-2 * Z, -19 * Z, 0.7 * Z, 3.4 * Z, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7FA8E8';
  ctx.beginPath();
  ctx.arc(0.4 * Z, -12.6 * Z, 4.2 * Z, 0, Math.PI * 2);
  ctx.fill();
  // The ninja mask across his face, his eyes showing, and the red headband, its tails flying.
  ctx.fillStyle = '#26262E';
  ctx.fillRect(-3.8 * Z, -12.4 * Z, 8.4 * Z, 3.6 * Z);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(1.4 * Z, -13.4 * Z, 1.1 * Z, 0, Math.PI * 2);
  ctx.arc(3.8 * Z, -13.4 * Z, 0.9 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1A1A1E';
  ctx.beginPath();
  ctx.arc(1.7 * Z, -13.4 * Z, 0.5 * Z, 0, Math.PI * 2);
  ctx.arc(4 * Z, -13.4 * Z, 0.45 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#D23A33';
  ctx.fillRect(-4 * Z, -16 * Z, 8.6 * Z, 1.6 * Z);
  const wave = Math.sin(T * 9 + ph) * 1.4 * Z;
  ctx.beginPath();
  ctx.moveTo(-4 * Z, -15.4 * Z);
  ctx.lineTo(-9 * Z, -14 * Z + wave);
  ctx.lineTo(-8.6 * Z, -12.6 * Z + wave);
  ctx.lineTo(-4 * Z, -14.4 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A puff of smoke, k from 0 (just now) to 1 (gone), where Bun-San was. */
export function drawPoof(v: DrawView, sx: number, sy: number, k: number): void {
  const { ctx } = v;
  const Z = v.zoom;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = (4 + k * 10) * Z;
    ctx.fillStyle = `rgba(210,214,224,${0.75 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(
      sx + Math.cos(a) * r,
      sy - 8 * Z + Math.sin(a) * r * 0.6,
      (5 - k * 2) * Z,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

/**
 * What Jacks Parrow says, in a bubble over him at screen x, y: the words, with each bleeped word a black bar with
 * BLEEP on it and each sworn one a run of symbols, fading out as alpha falls.
 */
export function drawSquawk(v: DrawView, sx: number, sy: number, line: Squawk, alpha: number): void {
  const { ctx } = v;
  const parts = squawkParts(line);
  const fs = 12;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.font = `800 ${fs}px Grandstander, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  const widths = parts.map(
    (p) =>
      ctx.measureText(p.kind === 'bleep' ? 'BLEEP' : p.text).width + (p.kind === 'text' ? 0 : 8),
  );
  const w = widths.reduce((a, b) => a + b, 0) + 16;
  const h = fs + 12;
  const x0 = sx - w / 2;
  const y0 = sy - h - 10;
  ctx.fillStyle = '#FFF8E8';
  ctx.strokeStyle = '#1A2630';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x0, y0, w, h, 9);
  else ctx.rect(x0, y0, w, h);
  ctx.moveTo(sx - 5, y0 + h);
  ctx.lineTo(sx, y0 + h + 8);
  ctx.lineTo(sx + 5, y0 + h);
  ctx.fill();
  ctx.stroke();
  let x = x0 + 8;
  ctx.textBaseline = 'middle';
  const mid = y0 + h / 2 + 1;
  parts.forEach((p, i) => {
    const pw = widths[i] as number;
    if (p.kind === 'text') {
      ctx.fillStyle = '#1A2630';
      ctx.fillText(p.text, x, mid);
    } else {
      ctx.fillStyle = p.kind === 'bleep' ? '#1A2630' : '#D8352E';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, mid - fs / 2 - 1, pw, fs + 2, 4);
      else ctx.rect(x, mid - fs / 2 - 1, pw, fs + 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(p.kind === 'bleep' ? 'BLEEP' : p.text, x + 4, mid);
    }
    x += pw;
  });
  ctx.restore();
}

/** The pirates' Captain at screen x, y: big, in a red coat, a black tricorn with a white feather, a cutlass. */
export function drawCaptain(v: DrawView, sx: number, sy: number, T: number): void {
  const { ctx } = v;
  const Z = v.zoom;
  const sway = Math.sin(T * 1.6) * 0.6 * Z;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 10 * Z, 4 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // Boots and a peg leg.
  ctx.fillStyle = '#2A1E16';
  ctx.fillRect(sx - 6 * Z, sy - 9 * Z, 4 * Z, 9 * Z);
  ctx.fillStyle = '#8A6A43';
  ctx.fillRect(sx + 2.4 * Z, sy - 9 * Z, 2.2 * Z, 9 * Z);
  // The coat, long and red with gold trim, over a white shirt.
  ctx.fillStyle = '#B42F2A';
  ctx.beginPath();
  ctx.moveTo(sx - 9 * Z, sy - 8 * Z);
  ctx.lineTo(sx - 7 * Z + sway, sy - 30 * Z);
  ctx.lineTo(sx + 7 * Z + sway, sy - 30 * Z);
  ctx.lineTo(sx + 9 * Z, sy - 8 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#F2EDE0';
  ctx.fillRect(sx - 2.4 * Z + sway, sy - 30 * Z, 4.8 * Z, 14 * Z);
  ctx.fillStyle = '#E2B651';
  ctx.fillRect(sx - 9 * Z, sy - 10 * Z, 18 * Z, 1.6 * Z);
  // A cutlass at his hip.
  ctx.strokeStyle = '#D8DEE2';
  ctx.lineWidth = 1.6 * Z;
  ctx.beginPath();
  ctx.moveTo(sx + 8 * Z, sy - 16 * Z);
  ctx.quadraticCurveTo(sx + 14 * Z, sy - 10 * Z, sx + 12 * Z, sy - 4 * Z);
  ctx.stroke();
  // His head, a black beard, and the tricorn with its feather.
  ctx.fillStyle = '#E8B48C';
  ctx.beginPath();
  ctx.arc(sx + sway, sy - 34 * Z, 4.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1E1A18';
  ctx.beginPath();
  ctx.moveTo(sx - 4 * Z + sway, sy - 33 * Z);
  ctx.quadraticCurveTo(sx + sway, sy - 25 * Z, sx + 4 * Z + sway, sy - 33 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx - 9 * Z + sway, sy - 37 * Z);
  ctx.lineTo(sx + sway, sy - 44 * Z);
  ctx.lineTo(sx + 9 * Z + sway, sy - 37 * Z);
  ctx.quadraticCurveTo(sx + sway, sy - 39 * Z, sx - 9 * Z + sway, sy - 37 * Z);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  ctx.moveTo(sx + 2 * Z + sway, sy - 42 * Z);
  ctx.quadraticCurveTo(sx + 7 * Z + sway, sy - 48 * Z, sx + 11 * Z + sway, sy - 45 * Z);
  ctx.stroke();
}

/** The ninjas' Master at screen x, y: small and old, grey robes, a hood, a long white beard, leaning on a staff. */
export function drawMaster(v: DrawView, sx: number, sy: number, T: number): void {
  const { ctx } = v;
  const Z = v.zoom;
  const nod = Math.sin(T * 0.9) * 0.5 * Z;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 9 * Z, 3.6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // His staff.
  ctx.strokeStyle = '#6B4A2C';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(sx + 8 * Z, sy);
  ctx.lineTo(sx + 9 * Z, sy - 34 * Z);
  ctx.stroke();
  // His robe, grey, with a dark sash.
  ctx.fillStyle = '#7A7E88';
  ctx.beginPath();
  ctx.moveTo(sx - 8 * Z, sy);
  ctx.lineTo(sx - 5 * Z, sy - 22 * Z);
  ctx.lineTo(sx + 5 * Z, sy - 22 * Z);
  ctx.lineTo(sx + 8 * Z, sy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2C3B8F';
  ctx.fillRect(sx - 6 * Z, sy - 13 * Z, 12 * Z, 2.4 * Z);
  // His hand on the staff.
  ctx.fillStyle = '#E8C8A4';
  ctx.beginPath();
  ctx.arc(sx + 8.6 * Z, sy - 18 * Z, 1.8 * Z, 0, Math.PI * 2);
  ctx.fill();
  // His head in its hood, the beard long and white.
  ctx.fillStyle = '#5E626C';
  ctx.beginPath();
  ctx.arc(sx, sy - 26 * Z + nod, 5.4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E8C8A4';
  ctx.beginPath();
  ctx.arc(sx + 0.6 * Z, sy - 25.4 * Z + nod, 3.4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F4F4F2';
  ctx.beginPath();
  ctx.moveTo(sx - 2.4 * Z, sy - 24 * Z + nod);
  ctx.quadraticCurveTo(sx + 0.6 * Z, sy - 12 * Z + nod, sx + 3.4 * Z, sy - 24 * Z + nod);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1A1A1E';
  ctx.lineWidth = 0.8 * Z;
  ctx.beginPath();
  ctx.moveTo(sx - 1 * Z, sy - 26.4 * Z + nod);
  ctx.lineTo(sx + 0.4 * Z, sy - 26.2 * Z + nod);
  ctx.moveTo(sx + 1.6 * Z, sy - 26.2 * Z + nod);
  ctx.lineTo(sx + 3 * Z, sy - 26.4 * Z + nod);
  ctx.stroke();
}
