/**
 * The tar eel (entities/tareel.ts) on the tar ocean: black and glossy as the tar, a pale rim round it, its back breaking
 * the tar in humps along the way it has swum, twice a leviathan's length; a long neck up out of the tar to a great
 * finned head with burning red eyes, rearing back to bite, jaws wide as it strikes. Coming up, its long shadow and the
 * tar bubbling over it; its coils going round the boat in humps when it wraps. On the tar the warnings: a red ring
 * where it will bite, a red ring of its coils closing round the boat.
 */

import type { DrawView } from '../entities/entity';
import { BITE_R, BITE_WINDUP, EEL_LEN, EEL_RISE_T, type TarEel, WRAP_T } from '../entities/tareel';

const TAR = '#0B090E';
const RIM = 'rgba(200,180,230,.7)';
const FIN = '#2E1838';
const EYE = '#FF4A3A';
/** Humps of its back: every so far along it, each so long and so high. */
const HUMP_EVERY = 180;
const HUMP_LEN = 110;
const HUMP_H = 26;

type Pt = { x: number; y: number };
type Solid = { d: number; f: () => void };

/** The point so far back along the way it has swum. */
function along(trail: readonly Pt[], dist: number): Pt | null {
  let left = dist;
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1] as Pt;
    const b = trail[i] as Pt;
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg >= left) {
      const k = seg ? left / seg : 0;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    left -= seg;
  }
  return null;
}

/** A hump of its back from p to q, out of the tar by h. */
function hump(v: DrawView, p: Pt, q: Pt, h: number, flash: boolean): void {
  const { ctx, px, py, zoom: Z } = v;
  const x0 = px(p.x, p.y);
  const y0 = py(p.x, p.y, 0);
  const x1 = px(q.x, q.y);
  const y1 = py(q.x, q.y, 0);
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 - h * Z * 2;
  ctx.fillStyle = flash ? '#E6DCF0' : TAR;
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 1.2 * Z;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx, my, x1, y1);
  ctx.quadraticCurveTo(mx, (y0 + y1) / 2 - h * Z * 0.6, x0, y0);
  ctx.fill();
  ctx.stroke();
  // A fin along its top.
  ctx.fillStyle = FIN;
  ctx.beginPath();
  ctx.moveTo((x0 * 3 + x1) / 4, (y0 * 3 + y1) / 4 - h * Z * 0.9);
  ctx.lineTo(mx, my - 7 * Z);
  ctx.lineTo((x0 + x1 * 3) / 4, (y0 + y1 * 3) / 4 - h * Z * 0.9);
  ctx.closePath();
  ctx.fill();
  // The tar heaped where it goes in and comes out.
  ctx.fillStyle = 'rgba(40,30,50,.8)';
  for (const [x, y] of [
    [x0, y0],
    [x1, y1],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(x, y, 9 * Z, 3 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Its back, its neck and head, each a solid for the scene to sort, while any of it is out of the tar. */
export function eelSolids(v: DrawView, E: TarEel): Solid[] {
  if (E.state === 'away' || E.state === 'gone') return [];
  const out: Solid[] = [];
  const up = E.out;
  const flash = E.flash > 0;
  if (E.state === 'rise') {
    out.push({ d: -1e9 + 1, f: () => drawEelShadow(v, E) });
    return out;
  }
  if (E.state === 'wrap') {
    // Its coils round the boat, going round as they close.
    const r = E.wrapR;
    const spin = E.t * 1.6;
    for (let i = 0; i < 6; i++) {
      const a0 = spin + (i / 6) * Math.PI * 2;
      const a1 = a0 + 0.55;
      const p = { x: E.ring.x + Math.cos(a0) * r, y: E.ring.y + Math.sin(a0) * r };
      const q = { x: E.ring.x + Math.cos(a1) * r, y: E.ring.y + Math.sin(a1) * r };
      out.push({ d: (p.x + q.x + p.y + q.y) / 2, f: () => hump(v, p, q, HUMP_H * 0.8, flash) });
    }
  } else {
    for (let s = HUMP_EVERY * 0.7; s + HUMP_LEN < EEL_LEN; s += HUMP_EVERY) {
      const p = along(E.trail, s);
      const q = along(E.trail, s + HUMP_LEN);
      if (!p || !q) break;
      // Further back, lower: its back slopes away into the tar.
      const h = HUMP_H * up * (1 - (s / EEL_LEN) * 0.5);
      if (h < 2) continue;
      out.push({ d: (p.x + q.x + p.y + q.y) / 2, f: () => hump(v, p, q, h, flash) });
    }
  }
  out.push({ d: E.x + E.y, f: () => drawEelHead(v, E) });
  return out;
}

/** Its long shadow coming up under the tar, the tar bubbling over it. */
export function drawEelShadow(v: DrawView, E: TarEel): void {
  const { ctx, px, py, T, zoom: Z } = v;
  const k = Math.min(1, E.t / EEL_RISE_T);
  ctx.fillStyle = `rgba(0,0,0,${0.25 + 0.35 * k})`;
  // Back from its head the way it is going, long and dark, fading toward its tail.
  const cx = Math.cos(E.h);
  const cy = Math.sin(E.h);
  for (let i = 0; i < 10; i++) {
    const x = E.x - cx * i * 45;
    const y = E.y - cy * i * 45;
    ctx.beginPath();
    ctx.ellipse(px(x, y), py(x, y, 0), (28 - i * 1.6) * Z, (11 - i * 0.6) * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = `rgba(200,180,230,${0.25 + 0.3 * k})`;
  ctx.lineWidth = 1.2 * Z;
  for (let i = 0; i < 4; i++) {
    const r = ((T * 30 + i * 12) % 48) * Z;
    ctx.beginPath();
    ctx.ellipse(px(E.x, E.y), py(E.x, E.y, 0), r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Its neck up out of the tar and its head: rearing back to bite, jaws wide as it strikes. */
export function drawEelHead(v: DrawView, E: TarEel): void {
  const { ctx, px, py, zoom: Z } = v;
  const up = E.out;
  if (up <= 0.02) return;
  const rear = E.state === 'aim' ? Math.min(1, E.t / BITE_WINDUP) : 0;
  const gape = E.state === 'strike' ? 1 : rear * 0.6;
  const hz = (46 + rear * 30) * up;
  const sx = px(E.x, E.y);
  const sy = py(E.x, E.y, hz);
  const face = px(E.x + Math.cos(E.h), E.y + Math.sin(E.h)) >= sx ? 1 : -1;
  const body = E.flash > 0 ? '#E6DCF0' : TAR;
  // The neck, from the tar behind its head up to it.
  const back = { x: E.x - Math.cos(E.h) * 60, y: E.y - Math.sin(E.h) * 60 };
  const bx = px(back.x, back.y);
  const by = py(back.x, back.y, 0);
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 30 * Z * Math.max(0.4, up) + 2 * Z;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(bx, sy, sx - face * 14 * Z, sy + 6 * Z);
  ctx.stroke();
  ctx.strokeStyle = body;
  ctx.lineWidth = 30 * Z * Math.max(0.4, up);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = 'rgba(40,30,50,.8)';
  ctx.beginPath();
  ctx.ellipse(bx, by, 20 * Z, 7 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // The head: a long finned skull, its jaws opening.
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(face * Z, Z);
  ctx.rotate(-rear * 0.5);
  ctx.fillStyle = body;
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-16, -6);
  ctx.quadraticCurveTo(4, -20, 34, -8 - gape * 6);
  ctx.lineTo(36, -2 - gape * 4);
  ctx.quadraticCurveTo(10, 0, -16, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.quadraticCurveTo(8, 4 + gape * 6, 32, 4 + gape * 14);
  ctx.lineTo(30, 9 + gape * 14);
  ctx.quadraticCurveTo(6, 14, -14, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Teeth, when it opens up.
  if (gape > 0.2) {
    ctx.fillStyle = '#E8E0D0';
    for (let i = 0; i < 4; i++) {
      const tx = 6 + i * 7;
      ctx.beginPath();
      ctx.moveTo(tx, -2 - gape * 2);
      ctx.lineTo(tx + 2, 3);
      ctx.lineTo(tx + 4, -2 - gape * 2);
      ctx.fill();
    }
  }
  // Its frill of fins back off its head.
  ctx.fillStyle = FIN;
  ctx.beginPath();
  ctx.moveTo(-6, -12);
  ctx.lineTo(-30, -30);
  ctx.lineTo(-22, -12);
  ctx.lineTo(-34, -16);
  ctx.lineTo(-16, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Burning red eyes.
  ctx.fillStyle = 'rgba(255,74,58,.35)';
  ctx.beginPath();
  ctx.arc(14, -10, 6 + rear * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = EYE;
  ctx.beginPath();
  ctx.arc(14, -10, 2.2 + rear, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The warnings on the tar: the ring it will bite, the ring of its coils closing round the boat. */
export function drawEelMark(v: DrawView, E: TarEel): void {
  const { ctx, zoom: Z } = v;
  if (E.state === 'aim' || E.state === 'strike') {
    const k = E.state === 'aim' ? Math.min(1, E.t / BITE_WINDUP) : 1;
    ctx.fillStyle = `rgba(220,60,50,${E.state === 'strike' ? 0.55 : 0.12 + 0.35 * k})`;
    ctx.strokeStyle = `rgba(255,120,90,${0.4 + 0.5 * k})`;
    ctx.lineWidth = 2.5 * Z;
    v.isoEllipse(E.ring.x, E.ring.y, BITE_R, 0);
    ctx.fill();
    ctx.stroke();
    return;
  }
  if (E.state === 'wrap') {
    const k = Math.min(1, E.t / WRAP_T);
    ctx.fillStyle = `rgba(220,60,50,${0.1 + 0.25 * k})`;
    ctx.strokeStyle = `rgba(255,90,70,${0.6 + 0.4 * k})`;
    ctx.lineWidth = (3 + 3 * k) * Z;
    v.isoEllipse(E.ring.x, E.ring.y, E.wrapR, 0);
    ctx.fill();
    ctx.stroke();
  }
}
