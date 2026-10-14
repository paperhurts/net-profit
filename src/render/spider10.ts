/**
 * Drawing the swamp's giant spider and his web (entities/spider10.ts). The web is an orb hung upright between its two
 * cypresses: spokes out from the hub, a spiral round them, threads out to the trunks; once he is beaten it hangs torn.
 * He is drawn as a cartoon spider seen from the front, a great round black body with a red mark on it, a cluster of red
 * eyes over two little fangs, and eight jointed legs, four each side, that scuttle as he goes. He comes down and goes
 * back up on a thread from the hub. Sprayed, he flashes white; beaten, he lies on his back with his legs curled up.
 * Also here: the silk wrapped round the figure when he has it, and a puff of bug spray.
 */

import type { DrawView } from '../entities/entity';
import { SPIDER_FALL, type Spider10, WEB } from '../entities/spider10';

const SPIDER_K = 2.6;
const SILK = 'rgba(240,240,232,.75)';

/** A point in the web's upright plane: u along the strand from its middle, at height z. */
function webPt(v: DrawView, u: number, z: number): [number, number] {
  const [ax, ay] = WEB.a;
  const [bx, by] = WEB.b;
  const L = Math.hypot(bx - ax, by - ay) || 1;
  const x = WEB.x + ((bx - ax) / L) * u;
  const y = WEB.y + ((by - ay) / L) * u;
  return [v.px(x, y), v.py(x, y, z)];
}

const SPOKES = 10;
const RZ = 17;

export function drawWeb(v: DrawView, whole: boolean): void {
  const { ctx } = v;
  const R = WEB.r;
  ctx.strokeStyle = SILK;
  ctx.lineWidth = Math.max(0.6, 0.45 * v.zoom);
  ctx.lineCap = 'round';
  const rim = (k: number, i: number): [number, number] => {
    const a = (i / SPOKES) * Math.PI * 2;
    // A little sag in each ring between its spokes.
    return webPt(v, Math.cos(a) * R * k, WEB.z + Math.sin(a) * RZ * k - (k > 0 ? 0.6 : 0));
  };
  const line = (p: [number, number], q: [number, number]) => {
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    ctx.stroke();
  };
  const hub = webPt(v, 0, WEB.z);
  if (!whole) {
    // Torn: a few spokes left hanging, and a broken ring.
    for (const i of [1, 4, 7]) line(hub, rim(0.7, i));
    ctx.beginPath();
    for (let i = 2; i <= 5; i++) {
      const p = rim(0.55, i);
      if (i === 2) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1] + (i - 2) * 1.5 * v.zoom);
    }
    ctx.stroke();
    return;
  }
  // Anchor threads out to the trunks, and down to the mud.
  line(rim(1, 0), webPt(v, R + 4, WEB.z));
  line(rim(1, SPOKES / 2), webPt(v, -R - 4, WEB.z));
  line(rim(1, SPOKES * 0.25), webPt(v, R * 0.3, WEB.z + RZ + 8));
  line(rim(1, SPOKES * 0.75), webPt(v, -R * 0.2, 0));
  for (let i = 0; i < SPOKES; i++) line(hub, rim(1, i));
  for (const k of [0.25, 0.42, 0.59, 0.76, 0.93]) {
    ctx.beginPath();
    for (let i = 0; i <= SPOKES; i++) {
      const p = rim(k, i % SPOKES);
      if (i === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
  }
}

export function drawSpider(v: DrawView, s: Spider10): void {
  if (s.state === 'gone') return;
  const { ctx } = v;
  const Z = v.zoom * SPIDER_K;
  const sx = v.px(s.x, s.y);
  const sy = v.py(s.x, s.y, s.z);
  const fall = s.state === 'fall' ? Math.min(1, s.t / SPIDER_FALL) : 0;
  const W = (c: string) => (s.flash > 0 ? '#FFFFFF' : c);
  // His thread, from the hub down to him.
  if (s.state === 'drop' || s.state === 'climb' || s.state === 'web') {
    const [hx, hy] = webPt(v, 0, WEB.z + 3);
    ctx.strokeStyle = SILK;
    ctx.lineWidth = Math.max(0.6, 0.4 * v.zoom);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(sx, sy - 4 * Z);
    ctx.stroke();
  }
  if (s.z < 4) {
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath();
    ctx.ellipse(sx, v.py(s.x, s.y, 0), 7 * Z, 2.2 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(sx, sy);
  if (fall > 0) {
    ctx.globalAlpha = fall > 0.6 ? 1 - (fall - 0.6) / 0.4 : 1;
    // On his back.
    ctx.scale(1, -1);
    ctx.translate(0, 4 * Z);
  }
  const hurt = s.state === 'hurt';
  // Eight legs, four a side, each a knee up and a foot down; they scuttle in two sets as he runs.
  ctx.strokeStyle = W('#1E1A24');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1 * Z;
  const curl = fall > 0 ? 0.55 : hurt ? 0.25 : 0;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const phase = s.step + (i % 2 ? Math.PI : 0) + (side > 0 ? Math.PI / 2 : 0);
      const lift =
        s.state === 'chase' || s.state === 'drag' || s.state === 'back'
          ? Math.max(0, Math.sin(phase)) * 1.6
          : 0;
      const spread = (1 - curl) * (5.5 + i * 0.9);
      const kx = side * (3 + i * 0.7) * (1 - curl * 0.5);
      const ky = -(6.5 - i * 0.6) - lift;
      const fx = side * spread + side * 1.5;
      const fy = (s.z > 4 ? 1.5 : 2.5) - i * 0.9 - curl * 4 - lift * 0.5;
      ctx.beginPath();
      ctx.moveTo(side * 1.2 * Z, -3.2 * Z + i * 0.5 * Z);
      ctx.lineTo(kx * Z, ky * Z);
      ctx.lineTo(fx * Z, fy * Z);
      ctx.stroke();
    }
  }
  // His great round body behind, with a red mark; his head in front.
  ctx.fillStyle = W('#26202E');
  ctx.beginPath();
  ctx.ellipse(0, -6.4 * Z, 4.4 * Z, 3.9 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = W('#3A3046');
  ctx.beginPath();
  ctx.ellipse(-1.2 * Z, -7.8 * Z, 1.8 * Z, 1.1 * Z, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = W('#D63A3A');
  ctx.beginPath();
  ctx.moveTo(0, -9.2 * Z);
  ctx.lineTo(0.9 * Z, -8.2 * Z);
  ctx.lineTo(0, -7.6 * Z);
  ctx.lineTo(0.9 * Z, -6.9 * Z);
  ctx.lineTo(-0.9 * Z, -6.9 * Z);
  ctx.lineTo(0, -7.6 * Z);
  ctx.lineTo(-0.9 * Z, -8.2 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = W('#1E1A24');
  ctx.beginPath();
  ctx.ellipse(0, -2.9 * Z, 2.5 * Z, 2.1 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // A cluster of red eyes: two big, four small.
  ctx.fillStyle = hurt ? '#FFE27A' : '#FF4A3D';
  for (const [ex, ey, er] of [
    [-0.8, -3.4, 0.55],
    [0.8, -3.4, 0.55],
    [-1.7, -2.8, 0.3],
    [1.7, -2.8, 0.3],
    [-0.4, -4.4, 0.28],
    [0.4, -4.4, 0.28],
  ] as const) {
    ctx.beginPath();
    ctx.arc(ex * Z, ey * Z, er * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // Two little fangs.
  ctx.fillStyle = '#E8E0C8';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 0.3 * Z, -1.4 * Z);
    ctx.lineTo(side * 0.9 * Z, -1.4 * Z);
    ctx.lineTo(side * 0.55 * Z, -0.4 * Z);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Silk wrapped round the figure standing at x, y (height z), from its feet up to its shoulders. */
export function drawCocoon(v: DrawView, x: number, y: number, z: number, t: number): void {
  const { ctx } = v;
  const Z = v.zoom;
  const cx = v.px(x, y);
  const cy = v.py(x, y, z + 8.5);
  ctx.fillStyle = 'rgba(236,236,226,.9)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 5.2 * Z, 9.5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(170,170,160,.9)';
  ctx.lineWidth = 0.6 * Z;
  for (let i = -3; i <= 3; i++) {
    const yy = cy + i * 2.4 * Z;
    const w = 5.2 * Z * Math.sqrt(Math.max(0, 1 - ((i * 2.4) / 9.5) ** 2));
    ctx.beginPath();
    ctx.moveTo(cx - w, yy - 1.2 * Z);
    ctx.lineTo(cx + w, yy + 1.2 * Z + Math.sin(t * 9 + i) * 0.3 * Z);
    ctx.stroke();
  }
}

/** A puff of bug spray from (x0, y0) toward (x1, y1), this far through (0 to 1). */
export function drawSprayPuff(
  v: DrawView,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  k: number,
): void {
  const { ctx } = v;
  const Z = v.zoom;
  for (let i = 0; i < 7; i++) {
    const f = Math.min(1, k * 1.4 - i * 0.08);
    if (f <= 0) continue;
    const x = x0 + (x1 - x0) * f + Math.sin(i * 2.3) * 4 * f;
    const y = y0 + (y1 - y0) * f + Math.cos(i * 1.7) * 4 * f;
    ctx.fillStyle = `rgba(190,240,170,${0.55 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(v.px(x, y), v.py(x, y, 12 + i), (2 + f * 4) * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}
