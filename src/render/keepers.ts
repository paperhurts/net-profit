/**
 * The Garden Isle's stall keepers (part thirteen), the owner's call: a capybara at the seed stall, a Tilcayo at the gear shed
 * and a platypus at the sell stand, with punny names (ui/garden.ts KEEPERS). Each is drawn at a screen point, the
 * middle of where it sits or stands, at the view's zoom, and bobs a little as it breathes. The Tilcayo is a stand-in
 * until the kid says what one looks like: small, grey and round-eared, with a ringed tail and a tool belt.
 */

import type { DrawView } from '../entities/entity';

/** Capy Barrow, behind the seed stall's counter: a round brown capybara in a straw hat, chin on the counter. */
export function drawCapybara(v: DrawView, sx: number, sy: number): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  const b = Math.sin(T * 1.8) * 0.6 * Z;
  // Body and the big square head, the snout blunt.
  ctx.fillStyle = '#9A6B3F';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 4 * Z + b, 9 * Z, 7 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(sx - 6 * Z, sy - 17 * Z + b, 13 * Z, 10 * Z, 4 * Z);
  ctx.fill();
  ctx.fillStyle = '#7E5530';
  ctx.beginPath();
  ctx.roundRect(sx + 2 * Z, sy - 13 * Z + b, 6 * Z, 6 * Z, 2.5 * Z);
  ctx.fill();
  ctx.fillStyle = '#3A2414';
  ctx.beginPath();
  ctx.arc(sx + 6.5 * Z, sy - 11.5 * Z + b, 0.9 * Z, 0, Math.PI * 2);
  ctx.arc(sx + 1 * Z, sy - 14 * Z + b, 0.9 * Z, 0, Math.PI * 2);
  ctx.fill();
  // Ears, and the straw hat over them.
  ctx.fillStyle = '#7E5530';
  ctx.beginPath();
  ctx.arc(sx - 4 * Z, sy - 17 * Z + b, 1.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E8C66A';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 18 * Z + b, 9 * Z, 2.4 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(sx, sy - 20.5 * Z + b, 5 * Z, 3.2 * Z, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#5BAF5A';
  ctx.fillRect(sx - 5 * Z, sy - 19.5 * Z + b, 10 * Z, 1.4 * Z);
}

/** Penny Platypus, behind the sell stand's counter: brown and sleek, a flat grey bill, a coin held up in a paw. */
export function drawPlatypus(v: DrawView, sx: number, sy: number): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  const b = Math.sin(T * 2.1 + 1) * 0.6 * Z;
  ctx.fillStyle = '#6B4A32';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 5 * Z + b, 7.5 * Z, 8 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx, sy - 15 * Z + b, 5.5 * Z, 0, Math.PI * 2);
  ctx.fill();
  // The bill, wide and flat, sticking out to the side.
  ctx.fillStyle = '#4A4E54';
  ctx.beginPath();
  ctx.ellipse(sx + 7 * Z, sy - 14 * Z + b, 5 * Z, 2.4 * Z, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1E1E22';
  ctx.beginPath();
  ctx.arc(sx + 2 * Z, sy - 16.5 * Z + b, 0.9 * Z, 0, Math.PI * 2);
  ctx.fill();
  // A lighter belly, and a gold coin held up.
  ctx.fillStyle = '#8E6A4C';
  ctx.beginPath();
  ctx.ellipse(sx + 1 * Z, sy - 3 * Z + b, 4 * Z, 5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFC53D';
  ctx.beginPath();
  ctx.arc(sx - 6 * Z, sy - 10 * Z + b * 2, 2.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E0A62A';
  ctx.fillRect(sx - 6.5 * Z, sy - 11.2 * Z + b * 2, 1 * Z, 2.4 * Z);
}

/**
 * Toolcayo, by the gear shed's door: a stand-in for the kid's Tilcayo. Small and grey with big round ears, a ringed
 * tail curling behind, and a tool belt with a spanner in it. sx, sy is where it stands.
 */
export function drawTilcayo(v: DrawView, sx: number, sy: number): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  const b = Math.sin(T * 2.4 + 2) * 0.5 * Z;
  // The ringed tail, curling up behind.
  ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    ctx.strokeStyle = k % 2 ? '#4E5560' : '#B8C0C8';
    ctx.lineWidth = 3.2 * Z;
    const a0 = Math.PI * 0.2 + k * 0.32;
    ctx.beginPath();
    ctx.arc(sx - 6 * Z, sy - 9 * Z, 6 * Z, a0, a0 + 0.32);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // Body, head and the big round ears.
  ctx.fillStyle = '#8C96A2';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 6 * Z + b, 6 * Z, 7 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx, sy - 16 * Z + b, 5 * Z, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#8C96A2';
    ctx.beginPath();
    ctx.arc(sx + side * 4.5 * Z, sy - 21 * Z + b, 3 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E6B3BE';
    ctx.beginPath();
    ctx.arc(sx + side * 4.5 * Z, sy - 21 * Z + b, 1.6 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1E1E22';
  ctx.beginPath();
  ctx.arc(sx - 1.8 * Z, sy - 16.5 * Z + b, 0.9 * Z, 0, Math.PI * 2);
  ctx.arc(sx + 1.8 * Z, sy - 16.5 * Z + b, 0.9 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E6B3BE';
  ctx.beginPath();
  ctx.arc(sx, sy - 14.5 * Z + b, 0.9 * Z, 0, Math.PI * 2);
  ctx.fill();
  // The tool belt, and a spanner in it.
  ctx.fillStyle = '#7A5230';
  ctx.fillRect(sx - 6 * Z, sy - 6 * Z + b, 12 * Z, 2 * Z);
  ctx.strokeStyle = '#C8D3D8';
  ctx.lineWidth = 1.2 * Z;
  ctx.beginPath();
  ctx.moveTo(sx + 3 * Z, sy - 5 * Z + b);
  ctx.lineTo(sx + 5 * Z, sy - 1 * Z + b);
  ctx.stroke();
}
