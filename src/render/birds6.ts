/**
 * Island 6's birds (entities/birds6.ts), drawn: parrots, round and bright, a curved beak and a long tail, sitting
 * up in the palm crowns or wheeling round them with their wings going; sandpipers, small and brown with white
 * bellies, on thin legs on the wet sand, bobbing to peck, or fluttering up; and the skein, a V of gulls high over.
 */

import type { Birds6, Parrot, Piper } from '../entities/birds6';
import { wetSand } from '../entities/birds6';
import type { DrawView } from '../entities/entity';
import { PALMS6 } from '../world/isle6';
import { palm6Crown } from './isle6';

const INK = '#1D2B3A';
/** Body, wing and tail, and a face patch, for scarlet macaw, blue-and-gold, green parrot and cockatoo. */
const LOOKS: readonly { body: string; wing: string; tail: string; face: string; crest?: string }[] =
  [
    { body: '#D7262E', wing: '#2E6FD0', tail: '#F2C230', face: '#FFF4E8' },
    { body: '#2E7FD6', wing: '#1F5FA8', tail: '#2E7FD6', face: '#F2C230' },
    { body: '#3FAE49', wing: '#2D8A3A', tail: '#E4572E', face: '#C6E86A' },
    { body: '#F7F5EE', wing: '#E6E1D3', tail: '#F7F5EE', face: '#F7F5EE', crest: '#F2C230' },
  ];

/** A parrot at screen x, y (its feet), s across; wings out and beating at flap if flying, else sitting up. */
function parrot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  kind: number,
  facing: number,
  flap: number | null,
): void {
  const L = LOOKS[kind % LOOKS.length] ?? LOOKS[0];
  if (!L) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  // The tail, long and hanging, or streaming behind in flight.
  ctx.fillStyle = L.tail;
  ctx.beginPath();
  if (flap === null) {
    ctx.moveTo(-s * 0.15, -s * 0.5);
    ctx.lineTo(-s * 0.55, s * 0.9);
    ctx.lineTo(-s * 0.1, s * 0.2);
  } else {
    ctx.moveTo(-s * 0.3, -s * 0.9);
    ctx.lineTo(-s * 1.6, -s * 0.6);
    ctx.lineTo(-s * 0.4, -s * 0.6);
  }
  ctx.fill();
  // Wings: folded at its side, or out and beating.
  ctx.fillStyle = L.wing;
  if (flap === null) {
    ctx.beginPath();
    ctx.ellipse(-s * 0.1, -s * 0.75, s * 0.32, s * 0.55, 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const w = Math.sin(flap) * s * 1.1;
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.85);
      ctx.quadraticCurveTo(s * 0.2 * k, -s * 0.85 - w * k, s * 0.5, -s * 0.85 - w * 1.2 * k);
      ctx.lineTo(s * 0.3, -s * 0.8);
      ctx.fill();
    }
  }
  // The body and the head.
  ctx.fillStyle = L.body;
  ctx.beginPath();
  if (flap === null) ctx.ellipse(0, -s * 0.8, s * 0.38, s * 0.62, 0.15, 0, Math.PI * 2);
  else ctx.ellipse(0, -s * 0.85, s * 0.7, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  const hx = flap === null ? s * 0.12 : s * 0.7;
  const hy = flap === null ? -s * 1.45 : -s * 0.95;
  ctx.beginPath();
  ctx.arc(hx, hy, s * 0.32, 0, Math.PI * 2);
  ctx.fill();
  if (L.crest) {
    ctx.fillStyle = L.crest;
    ctx.beginPath();
    ctx.moveTo(hx - s * 0.1, hy - s * 0.25);
    ctx.lineTo(hx - s * 0.35, hy - s * 0.85);
    ctx.lineTo(hx + s * 0.1, hy - s * 0.3);
    ctx.fill();
  }
  ctx.fillStyle = L.face;
  ctx.beginPath();
  ctx.arc(hx + s * 0.1, hy, s * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hx + s * 0.12, hy - s * 0.02, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
  // The curved beak.
  ctx.fillStyle = '#2A2F33';
  ctx.beginPath();
  ctx.moveTo(hx + s * 0.26, hy - s * 0.1);
  ctx.quadraticCurveTo(hx + s * 0.6, hy - s * 0.05, hx + s * 0.38, hy + s * 0.22);
  ctx.lineTo(hx + s * 0.24, hy + s * 0.08);
  ctx.fill();
  ctx.restore();
}

/** The parrots sitting in palm i's crown, at the crown's screen point. */
export function drawPerched(v: DrawView, b: Birds6, i: number, sx: number, sy: number): void {
  const Z = v.zoom;
  for (const p of b.parrots) {
    if (p.palm !== i || p.up > 0.02) continue;
    const bob = Math.sin(v.T * 1.7 + p.a) * 0.4 * Z;
    parrot(v.ctx, sx + p.side * 8 * Z, sy - 1.5 * Z + bob, 6.5 * Z, p.kind, p.side, null);
  }
}

/** A parrot up off its perch, wheeling round its palm. */
function drawFlying(v: DrawView, p: Parrot): void {
  const [x, y] = PALMS6[p.palm] ?? [0, 0];
  const { top, lean } = palm6Crown(p.palm);
  const r = 34 * p.up;
  const wx = x + Math.cos(p.a) * r;
  const wy = y + Math.sin(p.a) * r;
  const z = top + 2 + p.up * (22 + p.kind * 3) + Math.sin(v.T * 2 + p.a) * 3 * p.up;
  // The way round it is flying, on screen, so it faces forward.
  const facing =
    Math.cos(p.a + (p.side * Math.PI) / 2) - Math.sin(p.a + (p.side * Math.PI) / 2) >= 0 ? 1 : -1;
  const sx = v.px(wx, wy) + lean * v.zoom * (1 - p.up);
  parrot(v.ctx, sx, v.py(wx, wy, z), 7 * v.zoom, p.kind, facing, v.T * 14 + p.a * 3);
}

/** A sandpiper on the wet sand, at the height of its flutter. */
export function drawPiper(v: DrawView, s: Piper): void {
  const { ctx } = v;
  // Drawn big enough to read from the zoom a big island is seen at.
  const Z = v.zoom * 1.8;
  const { x, y } = wetSand(s.a);
  const lift = Math.sin(s.hop * Math.PI) * 8;
  const sx = v.px(x, y);
  const foot = v.py(x, y, lift);
  ctx.fillStyle = 'rgba(0,0,0,.14)';
  ctx.beginPath();
  ctx.ellipse(sx, v.py(x, y, 0), 2.6 * Z, 1.1 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(sx, foot);
  ctx.scale(s.face >= 0 ? 1 : -1, 1);
  if (s.hop > 0.05) {
    // Wings up in a flutter.
    ctx.strokeStyle = '#7A6A55';
    ctx.lineWidth = 1 * Z;
    const w = Math.sin(v.T * 30) * 2.5 * Z;
    ctx.beginPath();
    ctx.moveTo(-2.5 * Z, -3 * Z - w);
    ctx.lineTo(0, -3.2 * Z);
    ctx.lineTo(2.5 * Z, -3 * Z - w);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#3A2E22';
    ctx.lineWidth = 0.6 * Z;
    ctx.beginPath();
    ctx.moveTo(-0.5 * Z, -2 * Z);
    ctx.lineTo(-0.8 * Z, 0);
    ctx.moveTo(0.6 * Z, -2 * Z);
    ctx.lineTo(0.8 * Z, 0);
    ctx.stroke();
  }
  ctx.fillStyle = '#9C8A70';
  ctx.beginPath();
  ctx.ellipse(0, -3 * Z, 2.4 * Z, 1.3 * Z, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F4F1E8';
  ctx.beginPath();
  ctx.ellipse(0.3 * Z, -2.5 * Z, 1.5 * Z, 0.7 * Z, 0, 0, Math.PI);
  ctx.fill();
  // The head, bobbing down to peck.
  const peck = s.hop > 0.05 ? 0 : Math.max(0, Math.sin(s.peck * 3)) * 1.6 * Z;
  ctx.fillStyle = '#9C8A70';
  ctx.beginPath();
  ctx.arc(2 * Z, -4 * Z + peck, 0.95 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2A2F33';
  ctx.lineWidth = 0.5 * Z;
  ctx.beginPath();
  ctx.moveTo(2.8 * Z, -4 * Z + peck);
  ctx.lineTo(4.4 * Z, -3.4 * Z + peck * 1.3);
  ctx.stroke();
  ctx.restore();
}

/** In the air: parrots off their perches, and the skein. */
export function drawBirds6Air(v: DrawView, b: Birds6): void {
  for (const p of b.parrots) {
    if (p.up <= 0.02) continue;
    const [x, y] = PALMS6[p.palm] ?? [0, 0];
    if (v.onScreen(x, y, 120 * v.zoom)) drawFlying(v, p);
  }
  const head = b.skeinHead();
  const s = b.skein;
  if (!head || !s) return;
  // A V of seven behind the leader, high up.
  for (let i = 0; i < 7; i++) {
    const rank = Math.ceil(i / 2);
    const side = i % 2 ? 1 : -1;
    const bx = head.x - s.dx * rank * 34 - s.dy * side * rank * 26;
    const by = head.y - s.dy * rank * 34 + s.dx * side * rank * 26;
    if (v.onScreen(bx, by, 200 * v.zoom)) v.bird(bx, by, 150, v.T * 6 + i, 1.9, 0.9);
  }
}
