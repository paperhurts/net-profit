/**
 * The drone's flight through island 11's jungle (entities/droneflight.ts), the whole screen, seen from just behind
 * the drone as it flies on into it: the jungle floor below and the canopy overhead running in stripes toward you, the
 * island's trees in rows either side, the gates coming out of the green haze ahead, and the drone itself, its body in
 * the colour you picked, its four rotors a blur. Over it all: the battery, how far through the course, and the rings.
 */

import { clamp } from '../core/math';
import {
  CANOPY,
  type DroneFlight,
  LANE_HALF,
  type Obstacle,
  RING_R,
} from '../entities/droneflight';

/** Metres the camera sits behind the drone; how far ahead the haze closes in. */
const CAM_BACK = 5;
const HAZE_FROM = 22;
const HAZE_TO = 75;
const SEE = 90;
/** The jungle's own colours. */
const HAZE = '#4E7A52';
const FLOOR_A = '#3D5A2E';
const FLOOR_B = '#46663A';
const LEAF_A = '#1F3B24';
const LEAF_B = '#27472B';
const BARK = '#6B4A30';
const BARK_DARK = '#4E3522';

type View = {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  f: number;
  y0: number;
  cx: number;
  cy: number;
  cz: number;
};

/** A point in the course on the screen, and how big a metre is there; null behind the camera. */
function at(
  v: View,
  x: number,
  y: number,
  z: number,
): { sx: number; sy: number; s: number } | null {
  const dz = z - v.cz;
  if (dz < 0.4) return null;
  const s = v.f / dz;
  return { sx: v.W / 2 + (x - v.cx) * s, sy: v.y0 - (y - v.cy) * s, s };
}

const fog = (v: View, z: number) => clamp((z - v.cz - HAZE_FROM) / (HAZE_TO - HAZE_FROM), 0, 1);

/** A box across the corridor's cross-section at depth z, from (x0, y0) to (x1, y1). */
function slab(
  v: View,
  z: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  fill: string,
): void {
  const a = at(v, x0, y1, z);
  const b = at(v, x1, y0, z);
  if (!a || !b) return;
  v.ctx.fillStyle = fill;
  v.ctx.fillRect(a.sx, a.sy, b.sx - a.sx, b.sy - a.sy);
}

/** The floor or the canopy between depths z0 and z1, at height y, across a width either side. */
function band(v: View, y: number, z0: number, z1: number, half: number, fill: string): void {
  const p = at(v, -half, y, z0);
  const q = at(v, half, y, z0);
  const r = at(v, half, y, z1);
  const s = at(v, -half, y, z1);
  if (!p || !q || !r || !s) return;
  const c = v.ctx;
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(p.sx, p.sy);
  c.lineTo(q.sx, q.sy);
  c.lineTo(r.sx, r.sy);
  c.lineTo(s.sx, s.sy);
  c.closePath();
  c.fill();
}

function drawTrunk(v: View, z: number, x: number, r: number, T: number): void {
  const c = v.ctx;
  slab(v, z, x - r, 0, x + r, CANOPY + 1, BARK);
  slab(v, z, x - r, 0, x - r * 0.35, CANOPY + 1, BARK_DARK);
  // Moss and a knot.
  const m = at(v, x + r * 0.2, 1.2 + (Math.sin(z) + 1) * 0.6, z);
  if (m) {
    c.fillStyle = '#5E8A3A';
    c.beginPath();
    c.ellipse(m.sx, m.sy, r * 0.5 * m.s, 0.25 * m.s, 0, 0, Math.PI * 2);
    c.fill();
  }
  // Leaves where it meets the canopy.
  const top = at(v, x, CANOPY, z);
  if (top) {
    c.fillStyle = LEAF_B;
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.ellipse(
        top.sx + i * r * 0.9 * top.s,
        top.sy + Math.sin(T * 1.3 + i + z) * 2,
        r * 0.9 * top.s,
        0.6 * top.s,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  }
}

function drawGate(v: View, o: Obstacle, T: number): void {
  const c = v.ctx;
  if (o.kind === 'trunk') drawTrunk(v, o.z, o.x, o.r, T);
  else if (o.kind === 'branch') {
    slab(v, o.z, o.x0, o.y - 0.35, o.x1, o.y + 0.35, BARK);
    slab(v, o.z, o.x0, o.y - 0.35, o.x1, o.y - 0.15, BARK_DARK);
    // Leafy tufts along it.
    for (let x = o.x0 + 0.8; x < o.x1; x += 1.6) {
      const p = at(v, x, o.y + 0.45, o.z);
      if (!p) continue;
      c.fillStyle = '#3F7A3A';
      c.beginPath();
      c.ellipse(p.sx, p.sy, 0.5 * p.s, 0.28 * p.s, Math.sin(x + T) * 0.3, 0, Math.PI * 2);
      c.fill();
    }
  } else if (o.kind === 'vines') {
    c.lineCap = 'round';
    for (let x = o.x0 + 0.3; x < o.x1; x += 0.55) {
      const sway = Math.sin(T * 1.6 + x * 1.7) * 0.12;
      const top = at(v, x, CANOPY + 0.5, o.z);
      const end = at(v, x + sway, o.bottom + ((x * 7) % 1) * 0.5, o.z);
      if (!top || !end) continue;
      c.strokeStyle = '#2F6B33';
      c.lineWidth = Math.max(1, 0.12 * top.s);
      c.beginPath();
      c.moveTo(top.sx, top.sy);
      c.lineTo(end.sx, end.sy);
      c.stroke();
      c.fillStyle = '#4C9A45';
      for (let k = 0.2; k < 1; k += 0.25) {
        c.beginPath();
        c.ellipse(
          top.sx + (end.sx - top.sx) * k + 0.1 * top.s,
          top.sy + (end.sy - top.sy) * k,
          0.14 * top.s,
          0.08 * top.s,
          0.6,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
    }
  } else if (o.kind === 'log') {
    slab(v, o.z, -LANE_HALF - 2, 0, LANE_HALF + 2, o.top, BARK);
    slab(v, o.z, -LANE_HALF - 2, o.top * 0.7, LANE_HALF + 2, o.top, '#7D5A3C');
    // Moss along its top.
    for (let x = -LANE_HALF; x <= LANE_HALF; x += 1.3) {
      const p = at(v, x, o.top, o.z);
      if (!p) continue;
      c.fillStyle = '#5E8A3A';
      c.beginPath();
      c.ellipse(p.sx, p.sy, 0.45 * p.s, 0.14 * p.s, 0, 0, Math.PI * 2);
      c.fill();
    }
  } else if (o.kind === 'ring') {
    if (o.got) return;
    const p = at(v, o.x, o.y, o.z);
    if (!p) return;
    const pulse = 1 + Math.sin(T * 5 + o.z) * 0.05;
    c.strokeStyle = 'rgba(255,224,102,.95)';
    c.lineWidth = Math.max(2, 0.14 * p.s);
    c.beginPath();
    c.arc(p.sx, p.sy, RING_R * p.s * pulse, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = 'rgba(255,248,214,.5)';
    c.lineWidth = Math.max(1, 0.05 * p.s);
    c.beginPath();
    c.arc(p.sx, p.sy, RING_R * p.s * pulse * 0.82, 0, Math.PI * 2);
    c.stroke();
  }
}

/** The drone from behind: its body in its colour, its arms, its four rotors a blur, banking as it turns. */
export function drawDrone(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  m: number,
  colour: string,
  bank: number,
  pitch: number,
  T: number,
  flash = 0,
): void {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(bank * 0.35);
  // Its shadow of a glow underneath, and the arms out to the rotors.
  const arm = 0.62 * m;
  const lift = pitch * 0.08 * m;
  ctx.strokeStyle = '#2A2D33';
  ctx.lineWidth = Math.max(2, 0.07 * m);
  ctx.lineCap = 'round';
  for (const [dx, dy] of [
    [-1, -0.35],
    [1, -0.35],
    [-1, 0.3],
    [1, 0.3],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dx * arm, dy * arm * 0.5 - lift * (dy < 0 ? 1 : -1));
    ctx.stroke();
  }
  // The rotors: a blur, and a blade's glint going round.
  for (const [dx, dy] of [
    [-1, -0.35],
    [1, -0.35],
    [-1, 0.3],
    [1, 0.3],
  ] as const) {
    const rx = dx * arm;
    const ry = dy * arm * 0.5 - lift * (dy < 0 ? 1 : -1) - 0.06 * m;
    ctx.fillStyle = 'rgba(220,230,235,.35)';
    ctx.beginPath();
    ctx.ellipse(rx, ry, 0.3 * m, 0.07 * m, 0, 0, Math.PI * 2);
    ctx.fill();
    const a = T * 40 + dx * 2 + dy;
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = Math.max(1, 0.02 * m);
    ctx.beginPath();
    ctx.moveTo(rx - Math.cos(a) * 0.28 * m, ry - Math.sin(a) * 0.05 * m);
    ctx.lineTo(rx + Math.cos(a) * 0.28 * m, ry + Math.sin(a) * 0.05 * m);
    ctx.stroke();
  }
  // Its body, in its colour, a little lid on top, and the camera under it.
  ctx.fillStyle = flash > 0 ? '#FFFFFF' : colour;
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.3 * m, 0.17 * m, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath();
  ctx.ellipse(-0.06 * m, -0.06 * m, 0.16 * m, 0.06 * m, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1C1E22';
  ctx.beginPath();
  ctx.arc(0, 0.17 * m, 0.07 * m, 0, Math.PI * 2);
  ctx.fill();
  // Its lights at the back: red and green, blinking.
  const on = Math.sin(T * 6) > 0;
  ctx.fillStyle = on ? '#FF5A5A' : '#7A2A2A';
  ctx.beginPath();
  ctx.arc(-0.2 * m, 0.04 * m, 0.035 * m, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = on ? '#5AFF8A' : '#2A6A3A';
  ctx.beginPath();
  ctx.arc(0.2 * m, 0.04 * m, 0.035 * m, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The whole flight on the screen; top is where the bars sit, clear of the phone's notch. */
export function drawDroneFlight(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  fl: DroneFlight,
  colour: string,
  T: number,
  top = 12,
): void {
  const v: View = {
    ctx,
    W,
    H,
    f: Math.min(W, H) * 0.9,
    y0: H * 0.42,
    cx: fl.x * 0.7,
    cy: 1.3 + fl.y * 0.6,
    cz: fl.z - CAM_BACK,
  };
  // The haze ahead, the canopy over it and the floor under it.
  const sky = ctx.createLinearGradient(0, 0, 0, v.y0);
  sky.addColorStop(0, '#16301B');
  sky.addColorStop(1, HAZE);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, v.y0);
  const ground = ctx.createLinearGradient(0, v.y0, 0, H);
  ground.addColorStop(0, HAZE);
  ground.addColorStop(1, '#2E4A24');
  ctx.fillStyle = ground;
  ctx.fillRect(0, v.y0, W, H - v.y0);
  // Stripes of floor and canopy running toward you, far to near.
  const step = 3;
  const z0 = Math.floor(v.cz / step) * step;
  for (let z = z0 + SEE; z >= z0; z -= step) {
    const k = Math.floor(z / step) % 2 === 0;
    ctx.globalAlpha = 1 - fog(v, z) * 0.9;
    band(v, 0, z, z + step, LANE_HALF + 30, k ? FLOOR_A : FLOOR_B);
    band(v, CANOPY + 1, z, z + step, LANE_HALF + 30, k ? LEAF_A : LEAF_B);
  }
  ctx.globalAlpha = 1;
  // Everything standing in it, far to near, the drone among it.
  const list: { z: number; f: () => void }[] = [];
  for (const o of fl.gates)
    if (o.z > v.cz + 0.4 && o.z < v.cz + SEE) list.push({ z: o.z, f: () => drawGate(v, o, T) });
  // The island's trees in rows either side of the way.
  const tz0 = Math.floor(v.cz / 6) * 6;
  for (let z = tz0; z < v.cz + SEE; z += 6)
    for (const side of [-1, 1]) {
      const x = side * (LANE_HALF + 1 + (((z * 13) % 7) / 7) * 1.5);
      const r = 0.9 + (((z * 7) % 5) / 5) * 0.6;
      if (z > v.cz + 0.4) list.push({ z, f: () => drawTrunk(v, z, x, r, T) });
    }
  const d = at(v, fl.x, fl.y, fl.z);
  if (d)
    list.push({
      z: fl.z,
      f: () => drawDrone(ctx, d.sx, d.sy, d.s, colour, fl.vx / 7, fl.vy / 5, T, fl.flash),
    });
  list.sort((p, q) => q.z - p.z);
  for (const it of list) {
    ctx.globalAlpha = 1 - fog(v, it.z) * 0.95;
    it.f();
  }
  ctx.globalAlpha = 1;
  // Leaves whipping past, for the speed of it.
  ctx.fillStyle = 'rgba(120,180,90,.6)';
  for (let i = 0; i < 18; i++) {
    const z = Math.floor(v.cz / 2) * 2 + (i % 9) * 2 + 1;
    const h = Math.sin(i * 12.9898 + Math.floor(v.cz / 2) * 78.233) * 43758.5453;
    const fr = h - Math.floor(h);
    const p = at(v, (fr * 2 - 1) * (LANE_HALF + 2), 0.3 + ((fr * 7) % 1) * CANOPY, z);
    if (!p) continue;
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, 0.1 * p.s, 0.05 * p.s, fr * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // A bump: the screen flushes red a moment.
  if (fl.flash > 0) {
    ctx.fillStyle = `rgba(255,80,60,${fl.flash * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
  drawFlightBars(ctx, W, fl, top);
}

/** A rounded box, or a plain one where the browser cannot round it. */
function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 12);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

/** The battery, how far through the course, and the rings: along the top. */
function drawFlightBars(
  ctx: CanvasRenderingContext2D,
  W: number,
  fl: DroneFlight,
  top: number,
): void {
  const pad = 14;
  const w = Math.min(220, W - pad * 2 - 90);
  ctx.fillStyle = 'rgba(10,20,12,.55)';
  box(ctx, pad, top, w + 16, 44);
  // The battery: green, then amber, then red.
  const b = fl.battery / 100;
  ctx.strokeStyle = '#E8F2E0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(pad + 8, top + 8, w - 6, 12);
  ctx.stroke();
  ctx.fillStyle = '#E8F2E0';
  ctx.fillRect(pad + 8 + w - 6, top + 11, 4, 6);
  ctx.fillStyle = b > 0.5 ? '#5BBF6A' : b > 0.25 ? '#F2C230' : '#E4572E';
  ctx.fillRect(pad + 10, top + 10, Math.max(0, (w - 10) * b), 8);
  // How far: a thin line with the drone along it.
  ctx.fillStyle = 'rgba(232,242,224,.35)';
  ctx.fillRect(pad + 8, top + 30, w - 2, 4);
  ctx.fillStyle = '#FFE066';
  ctx.fillRect(pad + 8, top + 30, (w - 2) * fl.progress, 4);
  // The rings, at the right.
  ctx.fillStyle = 'rgba(10,20,12,.55)';
  box(ctx, W - pad - 74, top, 74, 44);
  ctx.strokeStyle = '#FFE066';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W - pad - 52, top + 22, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#FFF7E6';
  ctx.font = '800 16px Grandstander, ui-rounded, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${fl.rings}`, W - pad - 36, top + 23);
}
