/**
 * The old man's store on island 10's prairie, drawn: a little plank shack with a red tin roof, STORE painted over the
 * door, a window with jars in it, and a porch of boards out front; and the old man himself on the porch in his
 * rocking chair, rocking, in a red plaid shirt and jeans, with a long white beard and a big brown cowboy hat. He
 * waves when the figure comes up the path, and rocks harder, chuckling, at his own jokes.
 */

import type { DrawView } from '../entities/entity';
import type { OldMan } from '../entities/oldman';
import { OLDMAN10, SHACK10 } from '../world/isle10';

const INK = '#1D2B3A';
const PLANK = '#8A5A34';
const PLANK_TOP = '#A06A3E';
const ROOF = '#A33A2C';
const ROOF_TOP = '#C2493A';
/** The walls' height, and the roof's peak over them. */
const WALL = 30;
const PEAK = 14;

export function drawShack10(v: DrawView): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const { x0, x1, y0, y1 } = SHACK10;
  // The porch, a deck of boards out from the door.
  v.box(x1, y0 - 2, 30, y1 - y0 + 24, 0, 2, '#7A5230', '#B58553');
  ctx.strokeStyle = 'rgba(60,35,15,.35)';
  ctx.lineWidth = 0.8 * Z;
  for (let k = 1; k < 6; k++) {
    const x = x1 + k * 5;
    ctx.beginPath();
    ctx.moveTo(px(x, y0 - 2), py(x, y0 - 2, 2));
    ctx.lineTo(px(x, y1 + 22), py(x, y1 + 22, 2));
    ctx.stroke();
  }
  // The walls.
  v.box(x0, y0, x1 - x0, y1 - y0, 0, WALL, PLANK, PLANK_TOP);
  ctx.strokeStyle = 'rgba(40,22,10,.35)';
  for (let z = 6; z < WALL; z += 6) {
    ctx.beginPath();
    ctx.moveTo(px(x1, y0), py(x1, y0, z));
    ctx.lineTo(px(x1, y1), py(x1, y1, z));
    ctx.lineTo(px(x0, y1), py(x0, y1, z));
    ctx.stroke();
  }
  // The door on the porch side, and a window on the other with jars in it.
  const door = (y: number, z: number): [number, number] => [px(x1, y), py(x1, y, z)];
  const dy0 = (y0 + y1) / 2 - 6;
  const dy1 = dy0 + 12;
  ctx.fillStyle = '#4A2E1A';
  ctx.beginPath();
  for (const [i, p] of [door(dy0, 0), door(dy1, 0), door(dy1, 20), door(dy0, 20)].entries()) {
    if (i) ctx.lineTo(p[0], p[1]);
    else ctx.moveTo(p[0], p[1]);
  }
  ctx.fill();
  const win = (x: number, z: number): [number, number] => [px(x, y1), py(x, y1, z)];
  const wx0 = x0 + 8;
  const wx1 = x0 + 24;
  ctx.fillStyle = '#F2D98A';
  ctx.beginPath();
  for (const [i, p] of [win(wx0, 10), win(wx1, 10), win(wx1, 22), win(wx0, 22)].entries()) {
    if (i) ctx.lineTo(p[0], p[1]);
    else ctx.moveTo(p[0], p[1]);
  }
  ctx.fill();
  ctx.strokeStyle = '#5A3A22';
  ctx.lineWidth = 1.4 * Z;
  ctx.stroke();
  for (const [k, c] of [
    [0.25, '#D7262E'],
    [0.5, '#F28C28'],
    [0.75, '#F2C230'],
  ] as const) {
    const [jx, jy] = win(wx0 + (wx1 - wx0) * k, 11);
    ctx.fillStyle = c;
    ctx.fillRect(jx - 1.6 * Z, jy - 5 * Z, 3.2 * Z, 5 * Z);
  }
  // The roof: a ridge along x, eaves out over the walls.
  const ridgeY = (y0 + y1) / 2;
  const e = 4;
  const R = (x: number, y: number, z: number): [number, number] => [px(x, y), py(x, y, z)];
  const side = (pts: [number, number][], fill: string) => {
    ctx.beginPath();
    for (const [i, [a, b]] of pts.entries()) {
      if (i) ctx.lineTo(a, b);
      else ctx.moveTo(a, b);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,15,10,.5)';
    ctx.lineWidth = 0.8 * Z;
    ctx.stroke();
  };
  // The gable end over the porch, then the roof's near slope.
  side([R(x1, y0, WALL), R(x1, y1, WALL), R(x1, ridgeY, WALL + PEAK)], PLANK_TOP);
  side(
    [
      R(x0 - e, ridgeY, WALL + PEAK),
      R(x1 + e, ridgeY, WALL + PEAK),
      R(x1 + e, y1 + e, WALL - 3),
      R(x0 - e, y1 + e, WALL - 3),
    ],
    ROOF_TOP,
  );
  side(
    [
      R(x1 + e, ridgeY, WALL + PEAK),
      R(x1 + e, y0 - e, WALL - 3),
      R(x1 + e, y0 - e, WALL - 5),
      R(x1 + e, y1 + e, WALL - 5),
      R(x1 + e, y1 + e, WALL - 3),
    ],
    ROOF,
  );
  // STORE, painted over the door, along the porch side.
  const [sx, sy] = R(x1 + 0.5, (y0 + y1) / 2 - 6, 25);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.transform(1, -0.5, 0, 1, 0, 0);
  ctx.fillStyle = '#F4E3B5';
  ctx.fillRect(-15 * Z, -4 * Z, 30 * Z, 8 * Z);
  ctx.fillStyle = '#7A2A1E';
  ctx.font = `900 ${Math.round(7 * Z)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('STORE', 0, 0.4 * Z);
  ctx.restore();
}

export function drawOldMan(v: DrawView, m: OldMan): void {
  const { ctx } = v;
  // Big enough to read from the zoom a big island is seen at.
  const Z = v.zoom * 1.35;
  const x = v.px(OLDMAN10.x, OLDMAN10.y);
  const y = v.py(OLDMAN10.x, OLDMAN10.y, 2);
  const tilt = Math.sin(m.rock) * (m.chuckle > 0 ? 0.12 : 0.07);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 9 * Z, 3 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(tilt);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The rocking chair: rockers, seat, back.
  ctx.strokeStyle = '#5A3A22';
  ctx.lineWidth = 1.6 * Z;
  ctx.beginPath();
  ctx.arc(0, -16 * Z, 16 * Z, Math.PI * 0.32, Math.PI * 0.68);
  ctx.stroke();
  ctx.lineWidth = 1.3 * Z;
  ctx.beginPath();
  ctx.moveTo(-5 * Z, -1 * Z);
  ctx.lineTo(-5 * Z, -9 * Z);
  ctx.moveTo(5 * Z, -1 * Z);
  ctx.lineTo(5 * Z, -9 * Z);
  ctx.stroke();
  ctx.fillStyle = '#7A5230';
  ctx.fillRect(-7 * Z, -26 * Z, 14 * Z, 4 * Z);
  ctx.fillRect(-7 * Z, -26 * Z, 2 * Z, 17 * Z);
  ctx.fillRect(5 * Z, -26 * Z, 2 * Z, 17 * Z);
  ctx.fillRect(-7 * Z, -11 * Z, 14 * Z, 2.4 * Z);
  // Legs in jeans, boots.
  ctx.strokeStyle = '#3E5A8A';
  ctx.lineWidth = 2.6 * Z;
  ctx.beginPath();
  ctx.moveTo(-2.4 * Z, -10 * Z);
  ctx.lineTo(-3 * Z, -3 * Z);
  ctx.moveTo(2.4 * Z, -10 * Z);
  ctx.lineTo(3 * Z, -3 * Z);
  ctx.stroke();
  ctx.fillStyle = '#4A2E1A';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 3.4 * Z, -2 * Z, 2 * Z, 1.2 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // A red plaid shirt.
  ctx.fillStyle = '#C23A30';
  ctx.beginPath();
  ctx.ellipse(0, -16 * Z, 5.4 * Z, 6.4 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,10,10,.4)';
  ctx.lineWidth = 0.6 * Z;
  for (const k of [-2.4, 0, 2.4]) {
    ctx.beginPath();
    ctx.moveTo(k * Z, -22 * Z);
    ctx.lineTo(k * Z, -10 * Z);
    ctx.moveTo(-5 * Z, -16 * Z + k * Z);
    ctx.lineTo(5 * Z, -16 * Z + k * Z);
    ctx.stroke();
  }
  // Arms: one on the armrest, one up waving when the figure comes by.
  ctx.strokeStyle = '#C23A30';
  ctx.lineWidth = 2.2 * Z;
  ctx.beginPath();
  ctx.moveTo(-4.6 * Z, -19 * Z);
  ctx.lineTo(-6 * Z, -12 * Z);
  ctx.stroke();
  const waving = m.wave > 0;
  const wav = Math.sin(m.wave * 14) * 0.5;
  ctx.beginPath();
  ctx.moveTo(4.6 * Z, -19 * Z);
  if (waving) ctx.lineTo((8 + wav * 2) * Z, -27 * Z);
  else ctx.lineTo(6 * Z, -12 * Z);
  ctx.stroke();
  ctx.fillStyle = '#F0C9A0';
  ctx.beginPath();
  ctx.arc(
    waving ? (8 + wav * 2) * Z : 6 * Z,
    waving ? -28 * Z : -11.5 * Z,
    1.4 * Z,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  // His face, and a long white beard down his shirt.
  ctx.fillStyle = '#F0C9A0';
  ctx.beginPath();
  ctx.arc(0, -26 * Z, 3.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F4F1EA';
  ctx.beginPath();
  ctx.moveTo(-3.4 * Z, -25.5 * Z);
  ctx.quadraticCurveTo(0, -12 * Z, 3.4 * Z, -25.5 * Z);
  ctx.quadraticCurveTo(0, -23 * Z, -3.4 * Z, -25.5 * Z);
  ctx.fill();
  ctx.strokeStyle = '#D9D4C8';
  ctx.lineWidth = 0.5 * Z;
  ctx.stroke();
  // Eyes: shut tight while he laughs.
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 0.6 * Z;
  for (const s of [-1, 1]) {
    if (m.chuckle > 0) {
      ctx.beginPath();
      ctx.arc(s * 1.3 * Z, -27 * Z, 0.7 * Z, Math.PI, 0);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(s * 1.3 * Z, -27 * Z, 0.45 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#E8A27C';
  ctx.beginPath();
  ctx.arc(0, -25.6 * Z, 0.8 * Z, 0, Math.PI * 2);
  ctx.fill();
  // The cowboy hat: a wide curled brim and a dented crown with a band.
  ctx.fillStyle = '#8A5A2E';
  ctx.beginPath();
  ctx.ellipse(0, -29 * Z, 8 * Z, 2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-4 * Z, -29 * Z);
  ctx.quadraticCurveTo(-4.4 * Z, -35 * Z, -1.6 * Z, -34 * Z);
  ctx.quadraticCurveTo(0, -33 * Z, 1.6 * Z, -34 * Z);
  ctx.quadraticCurveTo(4.4 * Z, -35 * Z, 4 * Z, -29 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4A2E1A';
  ctx.fillRect(-4 * Z, -30.6 * Z, 8 * Z, 1.4 * Z);
  ctx.strokeStyle = '#6B4424';
  ctx.lineWidth = 0.6 * Z;
  ctx.beginPath();
  ctx.ellipse(0, -29 * Z, 8 * Z, 2 * Z, 0, Math.PI * 0.05, Math.PI * 0.95);
  ctx.stroke();
  ctx.restore();
  // His chuckle, over his hat.
  if (m.chuckle > 0) {
    const k = 1 - m.chuckle / 2.4;
    ctx.globalAlpha = Math.min(1, m.chuckle);
    ctx.font = `800 ${Math.round(6 * Z)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFF3C4';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.5 * Z;
    const ty = y - (40 + k * 8) * Z;
    ctx.strokeText('Heh heh heh!', x, ty);
    ctx.fillText('Heh heh heh!', x, ty);
    ctx.globalAlpha = 1;
  }
}
