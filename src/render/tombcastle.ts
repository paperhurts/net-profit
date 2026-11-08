/**
 * Drawing inside Tomb Island's castle (world/tombcastle.ts), over the game's stone room: upright coffins and piles of
 * skulls round its back wall, the trap floor's spike plates and their spikes, and at the top the necromancer's empty
 * throne and his great tomb, green fire in braziers either side.
 */
import type { DrawView } from '../entities/entity';
import { SPIKE_R, SPIKES, spikesUp, TOP_THRONE, TOP_TOMB, TRAP_FLOOR } from '../world/tombcastle';
import { type Room, TOMB_TOP } from '../world/tower';

function skullAt(v: DrawView, sx: number, sy: number, k: number): void {
  const { ctx } = v;
  const Z = v.zoom * k;
  ctx.fillStyle = '#E8E1CF';
  ctx.beginPath();
  ctx.arc(sx, sy - 1.2 * Z, 2.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(sx - 1.5 * Z, sy, 3 * Z, 2 * Z);
  ctx.fillStyle = '#211D1A';
  ctx.beginPath();
  ctx.arc(sx - 1 * Z, sy - 1.2 * Z, 0.7 * Z, 0, Math.PI * 2);
  ctx.arc(sx + 1 * Z, sy - 1.2 * Z, 0.7 * Z, 0, Math.PI * 2);
  ctx.fill();
}

/** The things that dress a floor, drawn on its floor before anyone stands on it. */
export function drawTombRoom16(v: DrawView, R: Room, i: number, lidOff = false): void {
  const { ctx } = v;
  const Z = v.zoom;
  // Upright coffins against the back wall, lids shut, and skulls heaped between them.
  for (const a of [Math.PI * 1.02, Math.PI * 1.25, Math.PI * 1.48]) {
    const x = R.x + Math.cos(a) * (R.r - 14);
    const y = R.y + Math.sin(a) * (R.r - 14);
    v.box(x - 7, y - 4, 14, 8, 0, 34, '#5E574E', '#6E675C');
    ctx.strokeStyle = '#3A352F';
    ctx.lineWidth = 1.2 * Z;
    ctx.beginPath();
    ctx.moveTo(v.px(x, y + 4), v.py(x, y + 4, 6));
    ctx.lineTo(v.px(x, y + 4), v.py(x, y + 4, 28));
    ctx.moveTo(v.px(x - 4, y + 4), v.py(x - 4, y + 4, 22));
    ctx.lineTo(v.px(x + 4, y + 4), v.py(x + 4, y + 4, 22));
    ctx.stroke();
  }
  for (const a of [Math.PI * 1.14, Math.PI * 1.37]) {
    const x = R.x + Math.cos(a) * (R.r - 16);
    const y = R.y + Math.sin(a) * (R.r - 16);
    for (const [dx, dz] of [
      [-4, 0],
      [4, 0],
      [0, 5],
    ] as const)
      skullAt(v, v.px(x + dx, y), v.py(x + dx, y, 3 + dz), 1.1);
  }
  if (i === TRAP_FLOOR) drawSpikes(v);
  if (i === TOMB_TOP) drawTop(v, lidOff);
}

/** The spike plates: iron grates in the floor, their spikes shooting up in turn, a red glint just before. */
function drawSpikes(v: DrawView): void {
  const { ctx } = v;
  const Z = v.zoom;
  for (const s of SPIKES) {
    const up = spikesUp(s.set, v.T);
    const soon = spikesUp(s.set, v.T + 0.35) > 0 && up === 0;
    const r = SPIKE_R - 1;
    ctx.beginPath();
    ctx.moveTo(v.px(s.x - r, s.y - r), v.py(s.x - r, s.y - r));
    ctx.lineTo(v.px(s.x + r, s.y - r), v.py(s.x + r, s.y - r));
    ctx.lineTo(v.px(s.x + r, s.y + r), v.py(s.x + r, s.y + r));
    ctx.lineTo(v.px(s.x - r, s.y + r), v.py(s.x - r, s.y + r));
    ctx.closePath();
    ctx.fillStyle = soon ? '#5A2424' : '#2A2628';
    ctx.fill();
    ctx.strokeStyle = '#4A4448';
    ctx.lineWidth = 1 * Z;
    ctx.stroke();
    // Its spikes, back to front.
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) {
        const x = s.x + a * 8;
        const y = s.y + b * 8;
        const h = 2 + up * 14;
        ctx.fillStyle = up > 0 ? '#C9CED6' : '#5C575A';
        ctx.beginPath();
        ctx.moveTo(v.px(x, y) - 1.6 * Z, v.py(x, y));
        ctx.lineTo(v.px(x, y), v.py(x, y, h));
        ctx.lineTo(v.px(x, y) + 1.6 * Z, v.py(x, y));
        ctx.closePath();
        ctx.fill();
      }
  }
}

/** The top: his throne of bones at the back, his great tomb, and green fire either side. */
function drawTop(v: DrawView, lidOff: boolean): void {
  const { ctx } = v;
  const Z = v.zoom;
  const t = TOP_THRONE;
  v.box(t.x - 16, t.y - 16, 32, 32, 0, 8, '#3E3644', '#4E4556');
  v.box(t.x - 14, t.y - 14, 10, 28, 8, 52, '#2E2834', '#3A3242');
  v.box(t.x - 14, t.y - 14, 28, 10, 8, 52, '#2E2834', '#3A3242');
  v.box(t.x - 4, t.y - 4, 18, 18, 8, 18, '#4A3E52', '#5A4C66');
  for (const dx of [-10, 0, 10])
    skullAt(v, v.px(t.x + dx - 10, t.y - 12), v.py(t.x + dx - 10, t.y - 12, 54), 1.3);
  const g = TOP_TOMB;
  // His fake tomb (part seven): once he has climbed out of it, its lid is shoved off askew and it is dark inside.
  v.box(g.x - 30, g.y - 16, 60, 32, 0, 14, '#6A6370', lidOff ? '#14111A' : '#7E7684');
  if (lidOff) v.box(g.x - 40, g.y + 6, 64, 36, 0, 4, '#7E7684', '#9890A0');
  else {
    v.box(g.x - 32, g.y - 18, 64, 36, 14, 18, '#7E7684', '#9890A0');
    ctx.strokeStyle = '#4A4452';
    ctx.lineWidth = 1.4 * Z;
    ctx.beginPath();
    ctx.moveTo(v.px(g.x - 24, g.y), v.py(g.x - 24, g.y, 18));
    ctx.lineTo(v.px(g.x + 24, g.y), v.py(g.x + 24, g.y, 18));
    ctx.moveTo(v.px(g.x - 10, g.y - 8), v.py(g.x - 10, g.y - 8, 18));
    ctx.lineTo(v.px(g.x - 10, g.y + 8), v.py(g.x - 10, g.y + 8, 18));
    ctx.stroke();
  }
  for (const [dx, dy] of [
    [-60, 30],
    [30, -60],
  ] as const) {
    const x = t.x + dx;
    const y = t.y + dy;
    v.box(x - 5, y - 5, 10, 10, 0, 20, '#3A3432', '#4A4440');
    const fl = Math.sin(v.T * 9 + dx) * 2;
    ctx.fillStyle = 'rgba(120,255,140,.35)';
    ctx.beginPath();
    ctx.arc(v.px(x, y), v.py(x, y, 28 + fl), 9 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#B8FFB0';
    ctx.beginPath();
    ctx.arc(v.px(x, y), v.py(x, y, 26 + fl), 3.6 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}
