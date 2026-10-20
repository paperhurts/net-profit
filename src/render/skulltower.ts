/**
 * Inside Skrill's tower (world/skulltower.ts): its floors are the towers' stone rooms (drawn in the game), but black,
 * lit purple. This adds what only his has: a skull carved into the back wall with purple light in its eyes, old bones
 * about the floor, and, at the back of the last floor where the stairs would be, Skrill's own door, black iron with a
 * bone skull on it, shut fast, purple light under it; once the floor is beaten, standing open on stairs going up into
 * the night.
 */

import type { DrawView } from '../entities/entity';
import type { Room } from '../world/tower';

const BONE = '#E4DCC6';
const PIT = '#120E16';

/** The skull on the back wall, and the bones on the floor. */
export function drawSkullRoom(v: DrawView, R: Room): void {
  const { ctx, px, py, T, zoom: Z } = v;
  // Bones about the floor, the same for each visit.
  ctx.strokeStyle = 'rgba(228,220,198,.75)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.4 * Z;
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39 + R.y * 0.001;
    const d = R.r * (0.3 + ((i * 37) % 50) / 100);
    const x = R.x + Math.cos(a) * d;
    const y = R.y + Math.sin(a) * d;
    const t = a * 1.7;
    ctx.beginPath();
    ctx.moveTo(px(x, y) - Math.cos(t) * 6 * Z, py(x, y) - Math.sin(t) * 2.5 * Z);
    ctx.lineTo(px(x, y) + Math.cos(t) * 6 * Z, py(x, y) + Math.sin(t) * 2.5 * Z);
    ctx.stroke();
  }
  // The skull, carved high on the back wall, looking down the room.
  const a = Math.PI * 1.25;
  const wx = R.x + Math.cos(a) * (R.r - 1);
  const wy = R.y + Math.sin(a) * (R.r - 1);
  const sx = px(wx, wy);
  const sy = py(wx, wy, 52);
  ctx.fillStyle = BONE;
  ctx.beginPath();
  ctx.arc(sx, sy, 12 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(sx - 7 * Z, sy + 7 * Z, 14 * Z, 8 * Z);
  ctx.fillStyle = PIT;
  for (const dx of [-5, 5]) {
    ctx.beginPath();
    ctx.arc(sx + dx * Z, sy - 1 * Z, 3.6 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 3; i++) ctx.fillRect(sx + (-4 + i * 3) * Z, sy + 9 * Z, 1.2 * Z, 5 * Z);
  // Purple light in its eyes.
  const k = 0.55 + 0.45 * Math.sin(T * 2.4);
  ctx.fillStyle = `rgba(190,120,255,${k})`;
  for (const dx of [-5, 5]) {
    ctx.beginPath();
    ctx.arc(sx + dx * Z, sy - 1 * Z, 1.6 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Skrill's own door at (x, y), at the back of the last floor: black iron, a bone skull on it, shut fast, or open. */
export function drawSkrillDoor(v: DrawView, x: number, y: number, open = false): void {
  const { ctx, px, py, T, zoom: Z } = v;
  const sx = px(x, y);
  const sy = py(x, y);
  // The purple light under it, spilling onto the floor.
  const k = 0.5 + 0.3 * Math.sin(T * 3);
  ctx.fillStyle = `rgba(170,90,255,${0.35 * k})`;
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2 * Z, 26 * Z, 8 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // The door: an arch of black iron, bands across it and studs.
  ctx.fillStyle = '#1C1822';
  ctx.beginPath();
  ctx.moveTo(sx - 18 * Z, sy);
  ctx.lineTo(sx - 18 * Z, sy - 40 * Z);
  ctx.quadraticCurveTo(sx, sy - 60 * Z, sx + 18 * Z, sy - 40 * Z);
  ctx.lineTo(sx + 18 * Z, sy);
  ctx.closePath();
  ctx.fill();
  if (open) {
    // Open: the doorway full of red night, steps going up into it, the door swung back against the wall.
    ctx.fillStyle = '#3A0F1E';
    ctx.beginPath();
    ctx.moveTo(sx - 14 * Z, sy);
    ctx.lineTo(sx - 14 * Z, sy - 38 * Z);
    ctx.quadraticCurveTo(sx, sy - 54 * Z, sx + 14 * Z, sy - 38 * Z);
    ctx.lineTo(sx + 14 * Z, sy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2A2430';
    for (let i = 0; i < 5; i++)
      ctx.fillRect(sx - (12 - i) * Z, sy - (4 + i * 7) * Z, (24 - i * 2) * Z, 3 * Z);
    ctx.fillStyle = '#1C1822';
    ctx.fillRect(sx + 14 * Z, sy - 44 * Z, 6 * Z, 44 * Z);
    ctx.fillStyle = `rgba(200,140,255,${k})`;
    ctx.fillRect(sx - 16 * Z, sy - 2 * Z, 32 * Z, 2 * Z);
    return;
  }
  ctx.strokeStyle = '#3A3344';
  ctx.lineWidth = 2.2 * Z;
  for (const h of [10, 26]) {
    ctx.beginPath();
    ctx.moveTo(sx - 18 * Z, sy - h * Z);
    ctx.lineTo(sx + 18 * Z, sy - h * Z);
    ctx.stroke();
  }
  ctx.fillStyle = '#5A5266';
  for (const dx of [-13, 13])
    for (const h of [10, 26]) {
      ctx.beginPath();
      ctx.arc(sx + dx * Z, sy - h * Z, 1.4 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  // The light under it.
  ctx.fillStyle = `rgba(200,140,255,${k})`;
  ctx.fillRect(sx - 16 * Z, sy - 2 * Z, 32 * Z, 2 * Z);
  // The skull on it.
  const ky = sy - 40 * Z;
  ctx.fillStyle = BONE;
  ctx.beginPath();
  ctx.arc(sx, ky, 7 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(sx - 4.5 * Z, ky + 4 * Z, 9 * Z, 5 * Z);
  ctx.fillStyle = PIT;
  for (const dx of [-2.8, 2.8]) {
    ctx.beginPath();
    ctx.arc(sx + dx * Z, ky - 0.5 * Z, 2.1 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}
