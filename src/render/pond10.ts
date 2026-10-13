/**
 * Island 10's pond, drawn: the songbirds on their reeds at its edge (entities/pond10.ts), a cardinal, a bluebird
 * and a goldfinch, each a little round bird that lifts its head and opens its beak when it sings, with a note
 * rising over it; and the figure's fishing line, from a rod held out over the water to a red and white float that
 * bobs on the still pond, twitches at a nibble, and goes under in a ring at a bite.
 */

import type { DrawView } from '../entities/entity';
import type { PondBird } from '../entities/pond10';
import { SING_FOR } from '../entities/pond10';

const INK = '#1D2B3A';
/** Body, wing, breast and cap, for the cardinal, the bluebird and the goldfinch. */
const LOOKS: readonly {
  body: string;
  wing: string;
  breast: string;
  cap: string;
  crest?: boolean;
}[] = [
  { body: '#D7262E', wing: '#A81E25', breast: '#E2443F', cap: '#1D1D1D', crest: true },
  { body: '#3E7CC9', wing: '#2C5E9E', breast: '#E8874A', cap: '#3E7CC9' },
  { body: '#F2C230', wing: '#2A2A2A', breast: '#F7D85A', cap: '#2A2A2A' },
];
/** Perch height, on the top of its reed. */
const PERCH_Z = 16;

export function drawPondBird(v: DrawView, b: PondBird): void {
  const { ctx } = v;
  // Big enough to read from the zoom a big island is seen at.
  const Z = v.zoom * 2.8;
  const L = LOOKS[b.kind % LOOKS.length] ?? LOOKS[0];
  if (!L) return;
  const gx = v.px(b.x, b.y);
  const gy = v.py(b.x, b.y, 0);
  const top = v.py(b.x, b.y, PERCH_Z);
  // The reed it sits on, with a brown head.
  ctx.strokeStyle = '#6E7F3A';
  ctx.lineWidth = 0.7 * Z;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.quadraticCurveTo(gx + 1.2 * Z, (gy + top) / 2, gx, top);
  ctx.stroke();
  ctx.fillStyle = '#7A5230';
  ctx.beginPath();
  ctx.ellipse(gx + 0.8 * Z, top + 2.4 * Z, 0.7 * Z, 1.6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  const singing = b.sing > 0;
  const bob = singing ? Math.sin((SING_FOR - b.sing) * 18) * 0.5 * Z : 0;
  ctx.save();
  ctx.translate(gx, top - bob);
  ctx.scale(b.face, 1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.35 * Z;
  // Tail, body, breast, wing.
  ctx.fillStyle = L.wing;
  ctx.beginPath();
  ctx.moveTo(-1.6 * Z, -1.2 * Z);
  ctx.lineTo(-3.4 * Z, 0.2 * Z);
  ctx.lineTo(-1.2 * Z, -0.2 * Z);
  ctx.fill();
  ctx.fillStyle = L.body;
  ctx.beginPath();
  ctx.ellipse(0, -1.8 * Z, 2 * Z, 1.6 * Z, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = L.breast;
  ctx.beginPath();
  ctx.ellipse(0.8 * Z, -1.4 * Z, 1.1 * Z, 1 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = L.wing;
  ctx.beginPath();
  ctx.ellipse(-0.6 * Z, -1.9 * Z, 1.2 * Z, 0.7 * Z, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Head, lifted to sing.
  const hy = singing ? -3.9 * Z : -3.4 * Z;
  ctx.fillStyle = L.body;
  ctx.beginPath();
  ctx.arc(1.3 * Z, hy, 1.15 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (L.crest) {
    ctx.beginPath();
    ctx.moveTo(0.6 * Z, hy - 0.6 * Z);
    ctx.lineTo(0.9 * Z, hy - 2.1 * Z);
    ctx.lineTo(1.6 * Z, hy - 0.8 * Z);
    ctx.fill();
  }
  ctx.fillStyle = L.cap;
  ctx.beginPath();
  ctx.arc(
    1.6 * Z,
    hy - (L.crest ? -0.1 : 0.4) * Z,
    0.6 * Z,
    L.crest ? 0 : Math.PI,
    L.crest ? Math.PI : 0,
  );
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(1.75 * Z, hy - 0.1 * Z, 0.24 * Z, 0, Math.PI * 2);
  ctx.fill();
  // Beak, open while it sings.
  ctx.fillStyle = '#F2A13A';
  const open = singing ? 0.35 * Z : 0;
  ctx.beginPath();
  ctx.moveTo(2.3 * Z, hy - 0.3 * Z - open);
  ctx.lineTo(3.3 * Z, hy - open * 0.5);
  ctx.lineTo(2.3 * Z, hy + 0.3 * Z);
  ctx.fill();
  ctx.restore();
  // A note rising over it, fading.
  if (singing) {
    const k = 1 - b.sing / SING_FOR;
    ctx.globalAlpha = Math.min(1, b.sing * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.4 * Z;
    ctx.font = `bold ${Math.round(6 * Z)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const nx = gx + b.face * (2 + k * 3) * Z;
    const ny = top - (6 + k * 8) * Z;
    ctx.strokeText('♪', nx, ny);
    ctx.fillText('♪', nx, ny);
    ctx.globalAlpha = 1;
  }
}

/**
 * The line out: a rod held up and out from (hx, hy) on the screen, over toward the float at world fx, fy, and the
 * float there: bobbing while it waits, twitching at a nibble, gone under in a ring at a bite.
 */
export function drawPondLine(
  v: DrawView,
  hx: number,
  hy: number,
  fx: number,
  fy: number,
  state: 'wait' | 'nibble' | 'bite',
  t: number,
): void {
  const { ctx } = v;
  const Z = v.zoom * 1.8;
  const sx = v.px(fx, fy);
  const sy = v.py(fx, fy, 0);
  // The rod: up and out a little toward the float.
  const dx = sx - hx;
  const dy = sy - hy;
  const n = Math.hypot(dx, dy) || 1;
  const tipX = hx + (dx / n) * 14 * Z;
  const tipY = hy + (dy / n) * 6 * Z - 16 * Z;
  ctx.strokeStyle = '#6B4A2A';
  ctx.lineWidth = 1.4 * Z;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  const bite = state === 'bite';
  const twitch = state === 'nibble' ? Math.sin(t * 40) * 1.4 * Z : 0;
  const bob = bite ? 0 : Math.sin(t * 3) * 0.8 * Z + twitch;
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 0.8 * Z;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.quadraticCurveTo((tipX + sx) / 2, (tipY + sy) / 2 + (bite ? 4 : 14) * Z, sx, sy + bob);
  ctx.stroke();
  if (bite) {
    for (const k of [0, 0.5]) {
      const r = (t * 1.6 + k) % 1;
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.globalAlpha = 1 - r;
      ctx.lineWidth = 1.6 * Z;
      ctx.beginPath();
      ctx.ellipse(sx, sy, (4 + 14 * r) * Z, (2 + 7 * r) * Z, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }
  // Rings spreading from a twitching float, and the float itself, red over white.
  if (state === 'nibble') {
    const r = (t * 2.2) % 1;
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.globalAlpha = 1 - r;
    ctx.lineWidth = 1 * Z;
    ctx.beginPath();
    ctx.ellipse(sx, sy, (3 + 8 * r) * Z, (1.5 + 4 * r) * Z, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(sx, sy + bob, 2.8 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#D7262E';
  ctx.beginPath();
  ctx.arc(sx, sy + bob - 1.2 * Z, 2.8 * Z, Math.PI, 0);
  ctx.fill();
}
