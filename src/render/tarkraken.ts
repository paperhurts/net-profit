/**
 * The tar kraken (entities/tarkraken.ts). Its arms are not the red tar tentacles (the kid: "not red"): bigger, thicker,
 * and tar, his colour for them (asked in his doc): black and glossy as the tar folk, a pale rim and sheen along them so
 * they show against the tar, and pale suckers, rising out of a bubbling ring and
 * rearing back before they slam, a red ring on the tar where. Risen, the kraken is one giant eye in the tar: a great
 * glossy black dome heaving up out of it, its lid sliding open on a yellow eye with a slit pupil that follows the
 * boat. Beaten, the eye shuts and sinks, and one arm is left floating on the tar.
 */

import type { DrawView } from '../entities/entity';
import {
  ARM_BUBBLE,
  ARM_SINK,
  ARM_WINDUP,
  type Arm,
  EYE_BLINK,
  KRAKEN_HP,
  RISE_T,
  SINK_T,
  SLAM_R,
  type TarKraken,
} from '../entities/tarkraken';

/** The colour of its arms, tar, with the pale rim and sheen of the tar folk; and of their suckers. */
const ARM = '#0B090E';
const RIM = 'rgba(200,180,230,.7)';
const SHEEN = 'rgba(220,205,245,.38)';
const SUCKER = '#CFC4DA';
/** How much bigger than a red tar tentacle an arm is drawn. */
const BIG = 1.5;

function armHeight(a: Arm): number {
  if (a.state === 'bubble' || a.state === 'gone') return 0;
  if (a.state === 'sink') return Math.max(0, 1 - a.t / ARM_SINK);
  return Math.min(1, a.life / 0.35 + (a.ring ? 1 : 0));
}

/** One of its arms where it stands in the tar. */
export function drawKrakenArm(v: DrawView, a: Arm): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const bx = px(a.x, a.y);
  const by = py(a.x, a.y);
  ctx.strokeStyle = 'rgba(190,170,220,.35)';
  ctx.lineWidth = 2 * Z;
  for (let i = 0; i < 2; i++) {
    const k = (T * 0.7 + i * 0.5 + a.seed) % 1;
    v.isoEllipse(a.x, a.y, 14 + k * 30);
    ctx.globalAlpha = 1 - k;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const h = armHeight(a);
  if (h <= 0) return;
  const len = 84 * BIG * h;
  const sway = Math.sin(T * 1.4 + a.seed) * 12;
  let tipX = bx + sway * Z;
  let tipY = by - len * Z;
  if (a.state === 'windup') {
    const k = Math.min(1, a.t / ARM_WINDUP);
    tipX = bx - (16 + 14 * k) * Z;
    tipY = by - (len + 26 * k) * Z;
  } else if (a.state === 'slam') {
    tipX = px(a.at.x, a.at.y);
    tipY = py(a.at.x, a.at.y) - 6 * Z;
  }
  const midX = (bx + tipX) / 2 + (a.state === 'slam' ? 0 : 18 * Z);
  const midY = Math.min(by, tipY) - (a.state === 'slam' ? 40 : 0) * Z;
  const at = (k: number) => ({
    x: (1 - k) * (1 - k) * bx + 2 * (1 - k) * k * midX + k * k * tipX,
    y: (1 - k) * (1 - k) * by + 2 * (1 - k) * k * midY + k * k * tipY,
  });
  ctx.lineCap = 'round';
  const n = 16;
  const width = (i: number) => (17 - (i / n) * 13) * BIG * Z;
  // The pale rim first, a little wider, then the tar over it, then a sheen down one side.
  for (const pass of ['rim', 'tar', 'sheen'] as const) {
    for (let i = 0; i < n; i++) {
      if (pass === 'sheen' && (i < 2 || i > n - 3)) continue;
      const p = at(i / n);
      const q = at((i + 1) / n);
      const w = width(i);
      const off = pass === 'sheen' ? -w * 0.28 : 0;
      ctx.strokeStyle =
        pass === 'rim' ? RIM : pass === 'sheen' ? SHEEN : a.flash > 0 ? '#FFFFFF' : ARM;
      ctx.lineWidth = pass === 'rim' ? w + 2.4 * Z : pass === 'sheen' ? w * 0.18 : w;
      ctx.beginPath();
      ctx.moveTo(p.x + off, p.y);
      ctx.lineTo(q.x + off, q.y);
      ctx.stroke();
    }
  }
  ctx.fillStyle = SUCKER;
  for (let i = 2; i < n - 2; i += 2) {
    const p = at(i / n);
    ctx.beginPath();
    ctx.arc(p.x + 5 * Z * (1 - i / n), p.y, (3.2 - (i / n) * 2) * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tar running off it.
  ctx.fillStyle = 'rgba(20,16,26,.85)';
  const d = at(0.1);
  const k = (T * 1.2 + a.seed) % 1;
  ctx.beginPath();
  ctx.arc(d.x - 6 * Z, d.y + k * 16 * Z, 2.4 * Z, 0, Math.PI * 2);
  ctx.fill();
}

/** The warnings on the tar: the bubbling before an arm rises, and the red ring where it will slam. */
export function drawKrakenArmMark(v: DrawView, a: Arm): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  if (a.state === 'bubble') {
    const k = Math.min(1, a.t / ARM_BUBBLE);
    ctx.strokeStyle = `rgba(190,150,255,${0.3 + 0.5 * k})`;
    ctx.lineWidth = 2 * Z;
    v.isoEllipse(a.x, a.y, 36);
    ctx.stroke();
    ctx.fillStyle = 'rgba(190,170,220,.55)';
    for (let i = 0; i < 6; i++) {
      const ang = i * 1.1 + a.seed;
      const q = (T * 1.6 + i * 0.37) % 1;
      const r = 6 + (i % 3) * 9;
      const x = v.px(a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r);
      const y = v.py(a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r) - q * 9 * Z;
      ctx.beginPath();
      ctx.arc(x, y, (1.6 + q * 1.8) * Z, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (a.state !== 'windup' && a.state !== 'slam') return;
  const k = a.state === 'windup' ? Math.min(1, a.t / ARM_WINDUP) : 1;
  ctx.fillStyle = `rgba(220,60,50,${a.state === 'slam' ? 0.55 : 0.12 + 0.3 * k})`;
  ctx.strokeStyle = `rgba(255,120,90,${0.4 + 0.5 * k})`;
  ctx.lineWidth = 2 * Z;
  v.isoEllipse(a.at.x, a.at.y, SLAM_R);
  ctx.fill();
  ctx.stroke();
}

/** The kraken itself: the tar heaving as it rises, then its giant eye; sinking away beaten. */
export function drawKrakenEye(
  v: DrawView,
  k: TarKraken,
  boat: { x: number; y: number } | null,
): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const e = k.eye;
  const rising = k.state === 'rise';
  const up = rising
    ? Math.min(1, k.t / RISE_T)
    : k.state === 'eye'
      ? 1
      : k.state === 'down'
        ? Math.max(0, 1 - k.t / SINK_T)
        : 0;
  if (!rising && up <= 0) return;
  // The tar heaving round it.
  ctx.strokeStyle = 'rgba(190,170,220,.4)';
  ctx.lineWidth = 2.4 * Z;
  for (let i = 0; i < 3; i++) {
    const q = (T * 0.6 + i / 3) % 1;
    v.isoEllipse(e.x, e.y, 50 + q * 90);
    ctx.globalAlpha = (1 - q) * 0.9;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (up <= 0) return;
  const sx = px(e.x, e.y);
  const sy = py(e.x, e.y);
  const r = 46 * Z;
  const hgt = 38 * up * Z;
  // The dome of its head, glossy black, coming up out of the tar.
  ctx.fillStyle = '#120E18';
  ctx.beginPath();
  ctx.ellipse(sx, sy, r, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(sx, sy - hgt * 0.5, r * 0.92, hgt * 0.9 + r * 0.2, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,180,240,.22)';
  ctx.beginPath();
  ctx.ellipse(sx - r * 0.35, sy - hgt * 0.9, r * 0.25, r * 0.1, -0.3, 0, Math.PI * 2);
  ctx.fill();
  if (k.state !== 'eye') return;
  // The eye, its lid sliding open on yellow, a slit pupil turned toward the boat.
  const open =
    e.state === 'open'
      ? 1
      : e.state === 'opening'
        ? Math.min(1, e.t / EYE_BLINK)
        : e.state === 'shutting'
          ? Math.max(0, 1 - e.t / EYE_BLINK)
          : 0;
  const ex = sx;
  const ey = sy - hgt * 0.55;
  const ew = 26 * Z;
  const eh = 14 * Z;
  ctx.fillStyle = '#2A1F36';
  ctx.beginPath();
  ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2);
  ctx.fill();
  if (open > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ex, ey, ew, eh * open, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = e.flash > 0 ? '#FFFFFF' : '#F2C230';
    ctx.fillRect(ex - ew, ey - eh, ew * 2, eh * 2);
    const look = boat ? Math.max(-1, Math.min(1, (px(boat.x, boat.y) - ex) / (120 * Z))) : 0;
    ctx.fillStyle = '#100C14';
    ctx.beginPath();
    ctx.ellipse(ex + look * 10 * Z, ey, 3.5 * Z, eh * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = '#4A3A5E';
  ctx.lineWidth = 2.4 * Z;
  ctx.beginPath();
  ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/** Over the eye while it is open: its hits left as pips, and a ring on it. */
export function drawKrakenPips(v: DrawView, k: TarKraken, ready: boolean): void {
  if (!k.eyeOpen) return;
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const sx = px(k.eye.x, k.eye.y);
  const sy = py(k.eye.x, k.eye.y, 110);
  for (let i = 0; i < KRAKEN_HP; i++) {
    ctx.fillStyle = i < k.hp ? '#FF5A6A' : 'rgba(255,255,255,.4)';
    ctx.beginPath();
    ctx.arc(sx + (i - (KRAKEN_HP - 1) / 2) * 11 * Z, sy, 4 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = ready ? 'rgba(255,243,196,.95)' : 'rgba(255,243,196,.45)';
  ctx.lineWidth = 2.4 * Z;
  v.isoEllipse(k.eye.x, k.eye.y, 52 + Math.sin(T * 6) * 3, 30);
  ctx.stroke();
}

/** The arm it left floating on the tar, beaten: the prize. */
export function drawKrakenPrize(v: DrawView, k: TarKraken): void {
  if (!k.prize) return;
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const x = k.prize.x;
  const y = k.prize.y;
  const bob = Math.sin(T * 2) * 1.5 * Z;
  ctx.lineCap = 'round';
  for (const [colour, w] of [
    [RIM, 11.4],
    [ARM, 9],
  ] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w * Z;
    ctx.beginPath();
    ctx.moveTo(px(x - 30, y), py(x - 30, y) + bob);
    ctx.quadraticCurveTo(
      px(x, y - 20),
      py(x, y - 20) + bob - 6 * Z,
      px(x + 28, y + 6),
      py(x + 28, y + 6) + bob,
    );
    ctx.stroke();
  }
  ctx.fillStyle = SUCKER;
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    ctx.beginPath();
    ctx.arc(px(x - 24 + t * 48, y - 4), py(x - 24 + t * 48, y - 4) + bob, 2 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}
