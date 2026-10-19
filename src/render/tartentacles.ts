/**
 * The red tar tentacles (entities/tartentacles.ts): before one rises, the tar bubbles inside a red ring; then a red
 * tentacle comes up out of the black, tapering, its underside pale with suckers, swaying, a ring of tar ripples round its
 * foot. Drawing back, it rears up high; slapping, it whips down across the tar. On the tar, the warning: a red ring
 * where the slap will land. Harpooned or done, it sinks back under.
 */

import type { DrawView } from '../entities/entity';
import {
  SLAP_R,
  TarTentacles,
  TENT_BUBBLE,
  TENT_SINK,
  TENT_WINDUP,
  type Tentacle,
} from '../entities/tartentacles';

const RED = '#C0392B';
const PALE = '#F5B7B1';

/** How far up it is, 0 to 1: rising out of the bubbles, up, or sinking back. */
function height(t: Tentacle): number {
  if (t.state === 'bubble') return 0;
  if (t.state === 'sink') return Math.max(0, 1 - t.t / TENT_SINK);
  if (t.state === 'gone') return 0;
  return Math.min(1, t.life / 0.35);
}

/** One tentacle where it stands in the tar. */
export function drawTentacle(v: DrawView, t: Tentacle): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const bx = px(t.x, t.y);
  const by = py(t.x, t.y);
  // The ripples round its foot.
  ctx.strokeStyle = 'rgba(190,170,220,.35)';
  ctx.lineWidth = 1.5 * Z;
  for (let i = 0; i < 2; i++) {
    const k = (T * 0.8 + i * 0.5 + t.seed) % 1;
    v.isoEllipse(t.x, t.y, 10 + k * 22);
    ctx.globalAlpha = 1 - k;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const h = height(t);
  if (h <= 0) return;
  // Where its tip is: swaying up; reared up and back; or whipped down and out toward where it slaps.
  const len = 84 * h;
  const sway = Math.sin(T * 1.7 + t.seed) * 10;
  let tipX = bx + sway * Z;
  let tipY = by - len * Z;
  if (t.state === 'windup') {
    const k = Math.min(1, t.t / TENT_WINDUP);
    tipX = bx - (12 + 10 * k) * Z;
    tipY = by - (len + 18 * k) * Z;
  } else if (t.state === 'slap') {
    tipX = px(t.at.x, t.at.y);
    tipY = py(t.at.x, t.at.y) - 6 * Z;
  }
  const midX = (bx + tipX) / 2 + (t.state === 'slap' ? 0 : 14 * Z);
  const midY = Math.min(by, tipY) - (t.state === 'slap' ? 30 : 0) * Z;
  const at = (k: number) => ({
    x: (1 - k) * (1 - k) * bx + 2 * (1 - k) * k * midX + k * k * tipX,
    y: (1 - k) * (1 - k) * by + 2 * (1 - k) * k * midY + k * k * tipY,
  });
  ctx.lineCap = 'round';
  const red = t.flash > 0 ? '#FFFFFF' : RED;
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = at(i / n);
    const b = at((i + 1) / n);
    ctx.strokeStyle = red;
    ctx.lineWidth = (17 - (i / n) * 13) * Z;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Its suckers, pale, along one side.
  ctx.fillStyle = PALE;
  for (let i = 2; i < n - 2; i += 2) {
    const a = at(i / n);
    ctx.beginPath();
    ctx.arc(a.x + 3.5 * Z * (1 - i / n), a.y, (2.4 - (i / n) * 1.4) * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // A dark sheen of tar dripping off it.
  ctx.fillStyle = 'rgba(20,16,26,.8)';
  const d = at(0.12);
  const k = (T * 1.3 + t.seed) % 1;
  ctx.beginPath();
  ctx.arc(d.x - 4 * Z, d.y + k * 14 * Z, 1.8 * Z, 0, Math.PI * 2);
  ctx.fill();
}

/** The warnings on the tar: the bubbling ring before it rises, and the ring where its slap will land. */
export function drawTentacleMark(v: DrawView, t: Tentacle): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  if (t.state === 'bubble') {
    const k = Math.min(1, t.t / TENT_BUBBLE);
    ctx.strokeStyle = `rgba(230,70,60,${0.3 + 0.5 * k})`;
    ctx.lineWidth = 2 * Z;
    v.isoEllipse(t.x, t.y, 30);
    ctx.stroke();
    ctx.fillStyle = 'rgba(190,170,220,.55)';
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + t.seed;
      const q = (T * 1.6 + i * 0.37) % 1;
      const r = 6 + (i % 3) * 7;
      const x = v.px(t.x + Math.cos(a) * r, t.y + Math.sin(a) * r);
      const y = v.py(t.x + Math.cos(a) * r, t.y + Math.sin(a) * r) - q * 8 * Z;
      ctx.beginPath();
      ctx.arc(x, y, (1.4 + q * 1.6) * Z, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (t.state !== 'windup' && t.state !== 'slap') return;
  const k = t.state === 'windup' ? Math.min(1, t.t / TENT_WINDUP) : 1;
  ctx.fillStyle = `rgba(220,60,50,${t.state === 'slap' ? 0.55 : 0.12 + 0.3 * k})`;
  ctx.strokeStyle = `rgba(255,120,90,${0.4 + 0.5 * k})`;
  ctx.lineWidth = 2 * Z;
  v.isoEllipse(t.at.x, t.at.y, SLAP_R);
  ctx.fill();
  ctx.stroke();
}

/** Its hits left, over it while a harpoon reaches it. */
export function drawTentaclePips(v: DrawView, t: Tentacle, hp: number): void {
  if (!TarTentacles.up(t)) return;
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const sx = px(t.x, t.y);
  const sy = py(t.x, t.y, 90);
  for (let i = 0; i < hp; i++) {
    ctx.fillStyle = i < t.hp ? '#FF5A6A' : 'rgba(255,255,255,.4)';
    ctx.beginPath();
    ctx.arc(sx + (i - (hp - 1) / 2) * 11 * Z, sy, 4 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}
