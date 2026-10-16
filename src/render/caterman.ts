/**
 * Caterman, the kid's "technology cat-human" (his sixth list's answers, 2026-10-16): a ginger tabby who stands and
 * walks like a person, in a silver-blue suit he built himself, a light glowing in its chest, goggles pushed up on his
 * forehead, a backpack with an aerial whose tip blinks, his striped tail out the back, and a little blaster he made in
 * his workshop. Zapping, a bright blue beam leaves the blaster's tip. About the warrior's size; drawn at a screen
 * point, as the other companions are, facing left or right on the screen by his heading.
 */

import type { DrawView } from '../entities/entity';

const FUR = '#E8933A';
const FUR_DARK = '#B8641E';
const SUIT = '#8FB0CF';
const SUIT_DARK = '#5C7C9C';
const METAL = '#C9D2DA';
const GLOW = '#7FF3FF';

export function drawCaterman(
  v: DrawView,
  x: number,
  y: number,
  h: number,
  ph: number,
  gait: number,
  zap: boolean,
  size: number,
): void {
  const { ctx, T } = v;
  const Z = v.zoom * size;
  const dir = Math.cos(h) - Math.sin(h) >= 0 ? 1 : -1;
  const step = Math.sin(ph) * 2.5 * gait;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // His tail, striped, curling up behind him out of the suit.
  ctx.strokeStyle = FUR;
  ctx.lineWidth = 2.4 * Z;
  ctx.beginPath();
  ctx.moveTo(x - 3 * Z * dir, y - 10 * Z);
  ctx.quadraticCurveTo(
    x - 11 * Z * dir,
    y - 9 * Z,
    x - 10 * Z * dir,
    y - 18 * Z + Math.sin(T * 2.4) * 1.5 * Z,
  );
  ctx.stroke();
  ctx.strokeStyle = FUR_DARK;
  ctx.lineWidth = 2.6 * Z;
  for (const k of [0.45, 0.75]) {
    const tx = x - (3 + 7.5 * k) * Z * dir;
    const ty = y - (10 + 5 * k) * Z;
    ctx.beginPath();
    ctx.moveTo(tx - 0.6 * Z, ty);
    ctx.lineTo(tx + 0.6 * Z, ty);
    ctx.stroke();
  }
  // The backpack on his far side, and its aerial with a blinking tip.
  ctx.fillStyle = SUIT_DARK;
  ctx.fillRect(x - 6.5 * Z * dir - 2.5 * Z, y - 21 * Z, 5 * Z, 8 * Z);
  ctx.strokeStyle = METAL;
  ctx.lineWidth = 0.9 * Z;
  ctx.beginPath();
  ctx.moveTo(x - 7 * Z * dir, y - 21 * Z);
  ctx.lineTo(x - 9 * Z * dir, y - 31 * Z);
  ctx.stroke();
  ctx.fillStyle = Math.sin(T * 5 + ph) > 0.3 ? '#FF5A4A' : '#7A2A24';
  ctx.beginPath();
  ctx.arc(x - 9 * Z * dir, y - 31.5 * Z, 1.1 * Z, 0, Math.PI * 2);
  ctx.fill();
  // Legs in the suit, and silver boots.
  for (const s of [-1, 1]) {
    ctx.strokeStyle = SUIT_DARK;
    ctx.lineWidth = 2.6 * Z;
    ctx.beginPath();
    ctx.moveTo(x + s * 2 * Z, y - 9 * Z);
    ctx.lineTo(x + (s * 2 + step * s) * Z, y - 1.5 * Z);
    ctx.stroke();
    ctx.fillStyle = METAL;
    ctx.beginPath();
    ctx.ellipse(
      x + (s * 2 + step * s + dir * 0.8) * Z,
      y - 0.8 * Z,
      2 * Z,
      1.2 * Z,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // The suit: a rounded body, a belt, and the light in his chest, pulsing.
  ctx.fillStyle = SUIT;
  ctx.beginPath();
  ctx.ellipse(x, y - 14 * Z, 5.2 * Z, 6.6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SUIT_DARK;
  ctx.fillRect(x - 5 * Z, y - 10.5 * Z, 10 * Z, 1.4 * Z);
  const pulse = 0.6 + 0.4 * Math.sin(T * 3 + ph);
  ctx.fillStyle = `rgba(127,243,255,${0.35 * pulse})`;
  ctx.beginPath();
  ctx.arc(x + 1.2 * Z * dir, y - 15 * Z, 3.2 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = GLOW;
  ctx.beginPath();
  ctx.arc(x + 1.2 * Z * dir, y - 15 * Z, 1.4 * Z, 0, Math.PI * 2);
  ctx.fill();
  // The near arm out in front with his blaster: a little boxy gun with an orange tip.
  const hx = x + 5 * Z * dir;
  const hy = y - 15 * Z;
  ctx.strokeStyle = SUIT;
  ctx.lineWidth = 2.2 * Z;
  ctx.beginPath();
  ctx.moveTo(x + 3 * Z * dir, y - 17 * Z);
  ctx.lineTo(hx + 2 * Z * dir, hy);
  ctx.stroke();
  ctx.fillStyle = '#6E7A86';
  ctx.fillRect(hx + (dir > 0 ? 1 : -7) * Z, hy - 1.8 * Z, 6 * Z, 3 * Z);
  ctx.fillRect(hx + (dir > 0 ? 1.5 : -3) * Z, hy, 1.5 * Z, 3 * Z);
  ctx.fillStyle = '#F2A33A';
  ctx.beginPath();
  ctx.arc(hx + 7.2 * Z * dir, hy - 0.3 * Z, 1 * Z, 0, Math.PI * 2);
  ctx.fill();
  if (zap) {
    // The beam: bright blue, out from the tip, with a flash where it leaves.
    const bx = hx + 7.5 * Z * dir;
    const by = hy - 0.3 * Z;
    ctx.strokeStyle = 'rgba(127,243,255,.45)';
    ctx.lineWidth = 4 * Z;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 34 * Z * dir, by + 4 * Z);
    ctx.stroke();
    ctx.strokeStyle = '#E8FDFF';
    ctx.lineWidth = 1.4 * Z;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 34 * Z * dir, by + 4 * Z);
    ctx.stroke();
    ctx.fillStyle = 'rgba(232,253,255,.9)';
    ctx.beginPath();
    ctx.arc(bx, by, 2.4 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // His head: a ginger tabby's, round, with stripes on his forehead, ears up, pink inside.
  const gx = x + 0.5 * Z * dir;
  const gy = y - 25 * Z;
  ctx.fillStyle = FUR;
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(gx + e * 4.6 * Z, gy - 1.6 * Z);
    ctx.lineTo(gx + e * 4.2 * Z, gy - 8.4 * Z);
    ctx.lineTo(gx + e * 0.8 * Z, gy - 4.6 * Z);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#F2A7B4';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(gx + e * 3.8 * Z, gy - 3 * Z);
    ctx.lineTo(gx + e * 3.7 * Z, gy - 6.6 * Z);
    ctx.lineTo(gx + e * 1.8 * Z, gy - 4.4 * Z);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.ellipse(gx, gy, 5.6 * Z, 5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = FUR_DARK;
  ctx.lineWidth = 1 * Z;
  for (const s of [-1.6, 0, 1.6]) {
    ctx.beginPath();
    ctx.moveTo(gx + s * Z, gy - 4.6 * Z);
    ctx.lineTo(gx + s * 0.8 * Z, gy - 2.6 * Z);
    ctx.stroke();
  }
  // A pale muzzle, a pink nose, green eyes, whiskers.
  ctx.fillStyle = '#F7E3C8';
  ctx.beginPath();
  ctx.ellipse(gx + 1.6 * Z * dir, gy + 1.8 * Z, 2.8 * Z, 2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E86A86';
  ctx.beginPath();
  ctx.arc(gx + 1.8 * Z * dir, gy + 0.8 * Z, 0.8 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4CB86A';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(gx + (e * 2 + dir * 0.9) * Z, gy - 1.2 * Z, 0.9 * Z, 1.2 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1C2620';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(gx + (e * 2 + dir * 1.1) * Z, gy - 1.2 * Z, 0.35 * Z, 1 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 0.6 * Z;
  for (const w of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(gx + 3 * Z * dir, gy + 1.8 * Z);
    ctx.lineTo(gx + 7.5 * Z * dir, gy + (1.4 + w * 1.2) * Z);
    ctx.stroke();
  }
  // His goggles, pushed up on his forehead: brass rims, blue lenses with a glint.
  for (const e of [-1, 1]) {
    const ex = gx + (e * 2.2 + dir * 0.6) * Z;
    const ey = gy - 4.2 * Z;
    ctx.fillStyle = '#B98A3A';
    ctx.beginPath();
    ctx.arc(ex, ey, 1.9 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4FA8D8';
    ctx.beginPath();
    ctx.arc(ex, ey, 1.2 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath();
    ctx.arc(ex - 0.4 * Z, ey - 0.4 * Z, 0.4 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}
