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
import { POOL } from '../world/gigantis';
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

/**
 * The door behind the throne: shut, chained across, with a padlock as big as a head; or, once the bones have
 * given the key, thrown open, the chains and the padlock dropped at its foot.
 */
export function drawLockedDoor(v: DrawView, x: number, y: number, open = false): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  drawCastleDoor(v, x, y, open);
  const D = Math.SQRT1_2;
  if (open) {
    const fx = px(x + 14, y + 14);
    const fy = py(x + 14, y + 14, 0);
    ctx.strokeStyle = '#7C8287';
    ctx.lineWidth = 2 * Z;
    ctx.beginPath();
    ctx.moveTo(fx - 16 * Z, fy - 1 * Z);
    ctx.quadraticCurveTo(fx - 6 * Z, fy + 3 * Z, fx + 2 * Z, fy - 1 * Z);
    ctx.moveTo(fx + 4 * Z, fy + 2 * Z);
    ctx.quadraticCurveTo(fx + 10 * Z, fy + 5 * Z, fx + 18 * Z, fy + 1 * Z);
    ctx.stroke();
    ctx.fillStyle = '#C9A13A';
    ctx.fillRect(fx - 4 * Z, fy - 5 * Z, 9 * Z, 7 * Z);
    ctx.strokeStyle = '#B49A4A';
    ctx.beginPath();
    ctx.arc(fx + 5 * Z, fy - 6 * Z, 3 * Z, Math.PI * 0.9, Math.PI * 1.9);
    ctx.stroke();
    return;
  }
  const l = px(x - 20 * D, y + 20 * D);
  const r = px(x + 20 * D, y - 20 * D);
  const base = py(x, y, 0);
  ctx.strokeStyle = '#7C8287';
  ctx.lineWidth = 2.2 * Z;
  ctx.beginPath();
  ctx.moveTo(l, base - 50 * Z);
  ctx.lineTo(r, base - 10 * Z);
  ctx.moveTo(r, base - 50 * Z);
  ctx.lineTo(l, base - 10 * Z);
  ctx.stroke();
  const cx = (l + r) / 2;
  const cy = base - 30 * Z;
  ctx.strokeStyle = '#B49A4A';
  ctx.lineWidth = 2.4 * Z;
  ctx.beginPath();
  ctx.arc(cx, cy - 4 * Z, 4.5 * Z, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#C9A13A';
  ctx.fillRect(cx - 7 * Z, cy - 4 * Z, 14 * Z, 11 * Z);
  ctx.fillStyle = '#3A2E14';
  ctx.beginPath();
  ctx.arc(cx, cy + 0.5 * Z, 1.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 0.7 * Z, cy + 0.5 * Z, 1.4 * Z, 3.5 * Z);
}

/** The Forgotten One's throne: a great stone chair on a step, its high back toward the wall, a skull on top. */
export function drawThrone(v: DrawView, x: number, y: number, r: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  v.box(x - r - 4, y - r - 4, (r + 4) * 2, (r + 4) * 2, 0, 4, '#3A403D', '#4E5652');
  v.box(x - r, y - r, r * 2, r * 2, 4, 16, '#454D49', '#5A2A44');
  v.box(x - r, y - r, r * 2, 7, 16, 58, '#3E4642', '#565F5A');
  v.box(x - r, y - r + 7, 7, r * 2 - 7, 16, 58, '#3E4642', '#565F5A');
  // A skull on top of its back, at the corner nearest the wall.
  const sx = px(x - r + 4, y - r + 4);
  const sy = py(x - r + 4, y - r + 4, 64);
  ctx.fillStyle = '#EDE8DA';
  ctx.beginPath();
  ctx.arc(sx, sy, 5 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(sx - 2.6 * Z, sy + 3 * Z, 5.2 * Z, 2.6 * Z);
  ctx.fillStyle = '#C8322B';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx + e * 1.8 * Z, sy - 0.4 * Z, 1.2 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * The ruins behind the throne, behind whoever is in them: open to the green sky where the roof fell in, the
 * walls broken down to stumps in places, two green torches, a floor of cracked flagstones and rubble, and the
 * black pool in the middle.
 */
export function drawRuinsBack(v: DrawView, R: Room, W: number, H: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  sky(v, W, H);
  const n = 24;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * 0.75 + (i * Math.PI) / n;
    const a1 = a0 + Math.PI / n;
    // Broken down: tall here, a stump there, gone in a couple of places.
    const h = i === 7 || i === 15 ? 0 : 18 + hash(i, 7) * 76;
    if (h <= 0) continue;
    ctx.fillStyle = (i + Math.floor(i / 3)) % 2 ? '#2A322F' : '#313A36';
    edgeQuad(v, R, a0, a1, 0, h);
    ctx.fill();
    ctx.fillStyle = '#3E4844';
    edgeQuad(v, R, a0, a1, h - 3, h);
    ctx.fill();
  }
  for (const a of [Math.PI * 1.05, Math.PI * 1.45]) torch(v, R, a);
  floor(v, R, false);
  // Rubble: fallen blocks lying about.
  for (let i = 0; i < 14; i++) {
    const a = hash(i, 9) * Math.PI * 2;
    const d = (0.3 + hash(i, 10) * 0.6) * R.r;
    const x = R.x + Math.cos(a) * d;
    const y = R.y + Math.sin(a) * d;
    if (Math.hypot(x - POOL.x, y - POOL.y) < POOL.r + 14) continue;
    const s = 3 + hash(i, 11) * 5;
    v.box(x - s, y - s, s * 2, s * 2, 0, s * 1.2, '#3E4642', '#565F5A');
  }
  // The black pool, still, with a green sheen and slow rings on it.
  v.isoEllipse(POOL.x, POOL.y, POOL.r + 6);
  ctx.fillStyle = '#2E3632';
  ctx.fill();
  v.isoEllipse(POOL.x, POOL.y, POOL.r);
  ctx.fillStyle = '#05090A';
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,200,150,.18)';
  ctx.lineWidth = 1.4 * Z;
  for (let i = 0; i < 3; i++) {
    const k = (T * 0.15 + i / 3) % 1;
    ctx.globalAlpha = 1 - k;
    v.isoEllipse(POOL.x, POOL.y, POOL.r * (0.2 + 0.75 * k));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(140,255,170,.10)';
  ctx.beginPath();
  ctx.ellipse(
    px(POOL.x - 14, POOL.y - 14),
    py(POOL.x - 14, POOL.y - 14, 0),
    18 * Z,
    5 * Z,
    -0.1,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

/** A broken column in the ruins, at its feet: a stump of stone this tall, its top snapped off at a slant. */
export function drawColumn(v: DrawView, x: number, y: number, r: number, h: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  v.box(x - r - 3, y - r - 3, (r + 3) * 2, (r + 3) * 2, 0, 5, '#3A403D', '#4E5652');
  v.box(x - r, y - r, r * 2, r * 2, 5, h, '#4C5550', '#68716C');
  // The snapped top: a jagged lip on one side.
  ctx.fillStyle = '#68716C';
  ctx.beginPath();
  ctx.moveTo(px(x - r, y + r), py(x - r, y + r, h));
  ctx.lineTo(px(x - r * 0.3, y + r * 0.3), py(x - r * 0.3, y + r * 0.3, h + 9));
  ctx.lineTo(px(x, y), py(x, y, h + 4));
  ctx.lineTo(px(x + r * 0.4, y - r * 0.4), py(x + r * 0.4, y - r * 0.4, h + 12));
  ctx.lineTo(px(x + r, y - r), py(x + r, y - r, h));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.2)';
  ctx.lineWidth = 1 * Z;
  ctx.stroke();
}
