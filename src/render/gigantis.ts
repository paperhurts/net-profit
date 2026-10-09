/**
 * Drawing Gigantis, the castle on the sea through island 7's portal. Its
 * courtyard is open to a green sky with a pale moon, the sea far below beyond
 * battlements of grey-green stone, and the portal home turning at the front.
 * Its halls are dark stone lit by torches burning green, with tall arched
 * windows onto the green sky. Each room's door is at its back: a heavy wooden
 * door in a stone arch, shut while the undead stand, thrown open after.
 */
import { rgba } from '../core/color';
import type { DrawView } from '../entities/entity';
import type { Room } from '../world/tower';

const hash = (i: number, k: number): number => {
  const h = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return h - Math.floor(h);
};

/** A quad of the room's edge between two angles, from z0 to z1. */
function edgeQuad(
  v: DrawView,
  R: Room,
  a0: number,
  a1: number,
  z0: number,
  z1: number,
  r = R.r,
): void {
  const { ctx, px, py } = v;
  const x0 = R.x + Math.cos(a0) * r;
  const y0 = R.y + Math.sin(a0) * r;
  const x1 = R.x + Math.cos(a1) * r;
  const y1 = R.y + Math.sin(a1) * r;
  ctx.beginPath();
  ctx.moveTo(px(x0, y0), py(x0, y0, z0));
  ctx.lineTo(px(x1, y1), py(x1, y1, z0));
  ctx.lineTo(px(x1, y1), py(x1, y1, z1));
  ctx.lineTo(px(x0, y0), py(x0, y0, z1));
  ctx.closePath();
}

/** The green sky, a pale moon and stars: behind the courtyard, and through the halls' windows. */
function sky(v: DrawView, W: number, H: number): void {
  const { ctx, T } = v;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0B2A22');
  g.addColorStop(0.55, '#1F5A44');
  g.addColorStop(1, '#3E8A5E');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(230,255,235,.75)';
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(T * 1.5 + i * 2.3);
    ctx.fillRect(hash(i, 1) * W, hash(i, 2) * H * 0.5, 2, 2);
  }
  ctx.globalAlpha = 1;
  const mx = W * 0.78;
  const my = H * 0.13;
  const mr = Math.min(W, H) * 0.07;
  ctx.fillStyle = rgba('#E8FFE0', 0.18);
  ctx.beginPath();
  ctx.arc(mx, my, mr * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E2F5D8';
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,190,150,.45)';
  for (const [dx, dy, r] of [
    [-0.3, -0.2, 0.22],
    [0.25, 0.15, 0.16],
    [-0.05, 0.38, 0.12],
  ] as const) {
    ctx.beginPath();
    ctx.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A torch on the wall at an angle round the room: a bracket and a green flame, with its glow. */
function torch(v: DrawView, R: Room, a: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const x = R.x + Math.cos(a) * (R.r - 2);
  const y = R.y + Math.sin(a) * (R.r - 2);
  const fl = Math.sin(T * 11 + a * 3) * 1.5;
  ctx.globalCompositeOperation = 'lighter';
  v.glow(x, y, 46, 60, 'rgba(110,255,150,.28)');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#3A2A1C';
  ctx.fillRect(px(x, y) - 1.5 * Z, py(x, y, 38), 3 * Z, 8 * Z);
  ctx.fillStyle = '#8CFFA8';
  ctx.beginPath();
  ctx.arc(px(x, y), py(x, y, 48 + fl), 3.4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E4FFE8';
  ctx.beginPath();
  ctx.arc(px(x, y), py(x, y, 47 + fl), 1.5 * Z, 0, Math.PI * 2);
  ctx.fill();
}

/** The floor: big flagstones in rings, worn. */
function floor(v: DrawView, R: Room, court: boolean): void {
  const { ctx } = v;
  const Z = v.zoom;
  v.isoEllipse(R.x, R.y, R.r);
  ctx.fillStyle = court ? '#6E7A70' : '#4A524E';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.16)';
  ctx.lineWidth = 2 * Z;
  for (const k of [0.78, 0.54, 0.3]) {
    v.isoEllipse(R.x, R.y, R.r * k);
    ctx.stroke();
  }
  for (let i = 0; i < 18; i++) {
    const a = hash(i, 3) * Math.PI * 2;
    const d = (0.2 + hash(i, 4) * 0.7) * R.r;
    v.isoEllipse(R.x + Math.cos(a) * d, R.y + Math.sin(a) * d, 4 + hash(i, 5) * 6);
    ctx.fillStyle = court ? 'rgba(80,110,80,.35)' : 'rgba(30,36,34,.35)';
    ctx.fill();
  }
}

/**
 * The courtyard inside Gigantis's gate, behind whoever is in it: the green sky, the sea far below,
 * battlements round the back, and torches. W and H are the screen's size.
 */
export function drawCourtBack(v: DrawView, R: Room, W: number, H: number): void {
  const { ctx, py, T } = v;
  const Z = v.zoom;
  sky(v, W, H);
  // The sea, far below the walls: a band of dark water with the moon's path on it.
  const sea = py(R.x - R.r, R.y - R.r, -40);
  ctx.fillStyle = '#123A3C';
  ctx.fillRect(0, sea, W, H - sea);
  ctx.strokeStyle = 'rgba(200,255,220,.25)';
  ctx.lineWidth = 2 * Z;
  for (let i = 0; i < 10; i++) {
    const y = sea + (8 + i * 9) * Z;
    const x = W * 0.78 + Math.sin(T + i) * 10 * Z;
    ctx.beginPath();
    ctx.moveTo(x - (10 + i * 3) * Z, y);
    ctx.lineTo(x + (10 + i * 3) * Z, y);
    ctx.stroke();
  }
  // The wall round the back half, with merlons along its top.
  const n = 24;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * 0.75 + (i * Math.PI) / n;
    const a1 = a0 + Math.PI / n;
    ctx.fillStyle = (i + Math.floor(i / 3)) % 2 ? '#5C6B62' : '#66766C';
    edgeQuad(v, R, a0, a1, 0, 34);
    ctx.fill();
    if (i % 2 === 0) {
      ctx.fillStyle = '#6E7F74';
      edgeQuad(v, R, a0, a1, 34, 44);
      ctx.fill();
    }
  }
  for (const a of [Math.PI * 0.95, Math.PI * 1.25, Math.PI * 1.55]) torch(v, R, a);
  floor(v, R, true);
}

/** A hall of Gigantis, behind whoever is in it: dark stone, tall windows onto the green sky, torches. */
export function drawCastleBack(v: DrawView, R: Room, W: number, H: number): void {
  const { ctx } = v;
  ctx.fillStyle = '#0E1412';
  ctx.fillRect(0, 0, W, H);
  const n = 24;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * 0.75 + (i * Math.PI) / n;
    const a1 = a0 + Math.PI / n;
    ctx.fillStyle = (i + Math.floor(i / 3)) % 2 ? '#2E3633' : '#343D39';
    edgeQuad(v, R, a0, a1, 0, 96);
    ctx.fill();
  }
  // Tall windows onto the green sky, between the torches.
  for (const a of [Math.PI * 1.1, Math.PI * 1.4]) {
    const { px, py } = v;
    const x0 = R.x + Math.cos(a - 0.07) * (R.r - 0.5);
    const y0 = R.y + Math.sin(a - 0.07) * (R.r - 0.5);
    const x1 = R.x + Math.cos(a + 0.07) * (R.r - 0.5);
    const y1 = R.y + Math.sin(a + 0.07) * (R.r - 0.5);
    const xm = (x0 + x1) / 2;
    const ym = (y0 + y1) / 2;
    const g = ctx.createLinearGradient(0, py(xm, ym, 80), 0, py(xm, ym, 30));
    g.addColorStop(0, '#1F5A44');
    g.addColorStop(1, '#3E8A5E');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(px(x0, y0), py(x0, y0, 30));
    ctx.lineTo(px(x0, y0), py(x0, y0, 70));
    ctx.quadraticCurveTo(px(xm, ym), py(xm, ym, 86), px(x1, y1), py(x1, y1, 70));
    ctx.lineTo(px(x1, y1), py(x1, y1, 30));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4A544F';
    ctx.lineWidth = 2 * v.zoom;
    ctx.stroke();
  }
  for (const a of [Math.PI * 0.95, Math.PI * 1.25, Math.PI * 1.55]) torch(v, R, a);
  floor(v, R, false);
}

/** A room's door at its back, at (x, y): a heavy door in a stone arch, shut, or thrown open onto green light. */
export function drawCastleDoor(v: DrawView, x: number, y: number, open: boolean): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  // Across the screen: along (1, -1) in the world.
  const D = Math.SQRT1_2;
  const w = 20;
  const ax = x - w * D;
  const ay = y + w * D;
  const bx = x + w * D;
  const by = y - w * D;
  const arch = (h: number, inset: number) => {
    const cx = px(x, y);
    const l = px(ax, ay) + inset * Z;
    const r = px(bx, by) - inset * Z;
    const base = py(x, y, 0);
    ctx.beginPath();
    ctx.moveTo(l, base);
    ctx.lineTo(l, base - h * 0.6 * Z);
    ctx.quadraticCurveTo(cx, base - h * 1.15 * Z, r, base - h * 0.6 * Z);
    ctx.lineTo(r, base);
    ctx.closePath();
  };
  arch(62, -6);
  ctx.fillStyle = '#5E6A63';
  ctx.fill();
  arch(56, 0);
  if (open) {
    ctx.fillStyle = rgba('#8CFFA8', 0.55 + 0.15 * Math.sin(T * 3));
    ctx.fill();
    v.isoEllipse(x, y, 22 + Math.sin(T * 4) * 2);
    ctx.strokeStyle = 'rgba(156,240,192,.7)';
    ctx.lineWidth = 2.5 * Z;
    ctx.stroke();
    return;
  }
  ctx.fillStyle = '#4A3420';
  ctx.fill();
  ctx.strokeStyle = '#2E2014';
  ctx.lineWidth = 1.5 * Z;
  for (let i = 1; i < 4; i++) {
    const sx = px(ax, ay) + ((px(bx, by) - px(ax, ay)) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(sx, py(x, y, 0));
    ctx.lineTo(sx, py(x, y, 0) - 48 * Z);
    ctx.stroke();
  }
  ctx.fillStyle = '#8A8F92';
  for (const k of [0.3, 0.7]) {
    ctx.fillRect(px(ax, ay), py(x, y, 0) - 56 * k * Z, px(bx, by) - px(ax, ay), 2.2 * Z);
  }
}
