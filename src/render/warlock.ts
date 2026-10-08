/**
 * The warlock, the kid's companion: part man, part bird, with a bird's head.
 * A hooked orange beak and round yellow eyes on a head of dark feathers, a
 * long robe the green of deep water with a gold hem, a cloak of folded wings
 * over his shoulders, and a staff with a green flame at its tip. Stand-in
 * shapes until the kid draws him, like the sorcerer's.
 */
import type { DrawView } from '../entities/entity';

export type WarlockPose = {
  /** Which way he faces, in world radians. */
  h: number;
  /** Walking: the phase of his stride, and how much of one he is taking, 0..1. */
  ph: number;
  gait: number;
  /** Seconds since his last cast: the staff lifts and the flame flares. */
  cast: number;
  /** Hit just now: he flashes white. */
  hurt: boolean;
};

/** The warlock standing at world (x, y), z up. */
export function drawWarlock(v: DrawView, x: number, y: number, z: number, p: WarlockPose): void {
  const { ctx, px, py, T } = v;
  const k = v.zoom * 1.1;
  const W = (c: string) => (p.hurt ? '#FFFFFF' : c);
  const c = Math.cos(p.h);
  const s = Math.sin(p.h);
  const face = c - s >= 0 ? 1 : -1;
  const toward = (c + s) / 2 > -0.1;
  const sx = px(x, y);
  const sy = py(x, y, z);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  v.isoEllipse(x, y, 7, z);
  ctx.fill();
  const bob = Math.abs(Math.sin(p.ph)) * p.gait * 1.2 * k;
  const base = sy - bob;
  // The wing-cloak behind him.
  ctx.fillStyle = W('#3B3550');
  ctx.beginPath();
  ctx.moveTo(sx - 5 * k, base - 20 * k);
  ctx.lineTo(sx + 5 * k, base - 20 * k);
  ctx.lineTo(sx + 9 * k - face * 3 * k, base - 4 * k);
  ctx.lineTo(sx + 4 * k - face * 4 * k, base - 6 * k);
  ctx.lineTo(sx - face * 4 * k, base - 2 * k);
  ctx.lineTo(sx - 4 * k - face * 4 * k, base - 6 * k);
  ctx.lineTo(sx - 9 * k - face * 3 * k, base - 4 * k);
  ctx.closePath();
  ctx.fill();
  // The robe, to the ground, with a gold hem.
  ctx.fillStyle = W('#2E6E64');
  ctx.beginPath();
  ctx.moveTo(sx - 4 * k, base - 20 * k);
  ctx.lineTo(sx + 4 * k, base - 20 * k);
  ctx.lineTo(sx + 6.5 * k, base);
  ctx.lineTo(sx - 6.5 * k, base);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = W('#E3B341');
  ctx.fillRect(sx - 6.5 * k, base - 1.6 * k, 13 * k, 1.6 * k);
  // The staff, lifted as he casts, with its flame.
  const lift = p.cast < 0.4 ? (0.4 - p.cast) * 12 * k : 0;
  const tx = sx + face * 7 * k;
  ctx.strokeStyle = W('#6B4A2C');
  ctx.lineWidth = 1.7 * k;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tx, base - lift * 0.3);
  ctx.lineTo(tx, base - 28 * k - lift);
  ctx.stroke();
  const flare = p.cast < 0.4 ? 1.6 : 1;
  ctx.fillStyle = `rgba(120,255,150,${0.35 + 0.15 * Math.sin(T * 9)})`;
  ctx.beginPath();
  ctx.arc(tx, base - 30 * k - lift, 4.5 * k * flare, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#C8FFB0';
  ctx.beginPath();
  ctx.arc(tx, base - 30 * k - lift, 1.8 * k * flare, 0, Math.PI * 2);
  ctx.fill();
  // The bird's head: dark feathers, a little crest, a hooked orange beak, round yellow eyes.
  const hy = base - 24 * k;
  ctx.fillStyle = W('#3B3550');
  ctx.beginPath();
  ctx.arc(sx, hy, 4.8 * k, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(sx - face * (1 + i * 1.6) * k, hy - 3.5 * k);
    ctx.lineTo(sx - face * (3 + i * 1.8) * k, hy - 9 * k + i * 1.2 * k);
    ctx.lineTo(sx - face * (i * 1.6) * k, hy - 4 * k);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = W('#F08A2A');
  ctx.beginPath();
  ctx.moveTo(sx + face * 3.6 * k, hy - 1.2 * k);
  ctx.quadraticCurveTo(sx + face * 9.5 * k, hy - 0.6 * k, sx + face * 7.4 * k, hy + 3.4 * k);
  ctx.lineTo(sx + face * 3.6 * k, hy + 1.6 * k);
  ctx.closePath();
  ctx.fill();
  if (toward) {
    ctx.fillStyle = '#FFE14A';
    ctx.beginPath();
    ctx.arc(sx + face * 1.8 * k, hy - 1 * k, 1.5 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(sx + face * 2.1 * k, hy - 1 * k, 0.7 * k, 0, Math.PI * 2);
    ctx.fill();
  }
}
