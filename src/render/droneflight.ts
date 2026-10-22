/**
 * The drone's flight through island 11's jungle (entities/droneflight.ts), the whole screen, seen from just behind
 * the drone as it flies on into it: the jungle floor below and the canopy overhead running in stripes toward you, the
 * island's trees in rows either side, the gates coming out of the green haze ahead, and the drone itself, its body in
 * the colour you picked, its four rotors a blur. Over it all: the battery, how far through the course, and the rings.
 */

import { clamp } from '../core/math';
import { AROWANA } from '../data/tuning';
import {
  DROP_T,
  type DroneFishing,
  LAGOON_HALF,
  REEL_T,
  type Rise,
  STRIKE_T,
} from '../entities/dronefish';
import {
  CANOPY,
  type DroneFlight,
  LANE_HALF,
  type Obstacle,
  RING_R,
  type TrapState,
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

/** A number from 0 to 1 that is always the same for the same i and k. */
function hash(i: number, k: number): number {
  const h = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

/** What grows on the jungle floor: a fern, a big-leaved plant with a red flower, or a patch of sun come through. */
function drawPlant(v: View, x: number, z: number, kind: number, T: number): void {
  const c = v.ctx;
  const p = at(v, x, 0, z);
  if (!p || p.sx < -p.s * 1.5 || p.sx > v.W + p.s * 1.5 || p.sy > v.H + p.s) return;
  if (kind < 0.3) {
    // A patch of sun on the floor.
    c.fillStyle = 'rgba(214,240,150,.22)';
    c.beginPath();
    c.ellipse(p.sx, p.sy, 0.9 * p.s, 0.18 * p.s, 0, 0, Math.PI * 2);
    c.fill();
    return;
  }
  const sway = Math.sin(T * 2 + z) * 0.08;
  c.fillStyle = kind < 0.7 ? '#4C8A3E' : '#3A7436';
  const n = kind < 0.7 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.5 + sway;
    const len = (kind < 0.7 ? 0.5 : 0.65) * p.s;
    c.beginPath();
    c.ellipse(
      p.sx + Math.cos(a) * len * 0.5,
      p.sy + Math.sin(a) * len * 0.5,
      len * 0.5,
      len * (kind < 0.7 ? 0.12 : 0.22),
      a,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  if (kind > 0.85) {
    c.fillStyle = '#E4572E';
    c.beginPath();
    c.arc(p.sx, p.sy - 0.45 * p.s, 0.08 * p.s, 0, Math.PI * 2);
    c.fill();
  }
}

/** A bug trap: a little glass jar with a wooden lid, empty, or glowing with jewel beetles. */
function drawJar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  full: boolean,
  T: number,
): void {
  const w = 0.56 * s;
  const h = 0.68 * s;
  if (full) {
    ctx.fillStyle = `rgba(120,255,170,${0.35 + Math.sin(T * 4) * 0.1})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(205,232,240,.55)';
  ctx.strokeStyle = 'rgba(240,250,255,.85)';
  ctx.lineWidth = Math.max(1, 0.03 * s);
  ctx.beginPath();
  ctx.ellipse(x, y + h * 0.1, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7A5230';
  ctx.fillRect(x - w * 0.35, y - h * 0.5, w * 0.7, h * 0.16);
  if (full)
    for (let i = 0; i < 3; i++) {
      const a = T * 2 + i * 2.1;
      ctx.fillStyle = i === 1 ? '#3FE0C0' : '#5BE36A';
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(a) * w * 0.22,
        y + h * 0.12 + Math.sin(a * 1.3) * h * 0.18,
        0.09 * s,
        0.065 * s,
        a,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
}

/** A trap flower: big orange petals round a middle to fly through, and the trap hung in it, if one is. */
function drawTrapFlower(
  v: View,
  o: Obstacle & { kind: 'trap' },
  state: TrapState,
  T: number,
): void {
  const c = v.ctx;
  const p = at(v, o.x, o.y, o.z);
  if (!p) return;
  const r = RING_R * p.s;
  // The vine it hangs from, down from the canopy.
  const top = at(v, o.x, CANOPY + 0.5, o.z);
  if (top) {
    c.strokeStyle = '#2F6B33';
    c.lineWidth = Math.max(1, 0.1 * p.s);
    c.beginPath();
    c.moveTo(top.sx, top.sy);
    c.lineTo(p.sx, p.sy - r);
    c.stroke();
  }
  // Its petals, round the middle.
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.sin(T * 1.2 + o.z) * 0.05;
    c.fillStyle = i % 2 ? '#F28C28' : '#F2A23C';
    c.beginPath();
    c.ellipse(
      p.sx + Math.cos(a) * r * 1.12,
      p.sy + Math.sin(a) * r * 1.12,
      0.42 * p.s,
      0.2 * p.s,
      a,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  c.strokeStyle = state === 'empty' ? 'rgba(242,123,176,.9)' : 'rgba(242,123,176,.6)';
  c.lineWidth = Math.max(2, 0.1 * p.s);
  c.beginPath();
  c.arc(p.sx, p.sy, r * 0.86, 0, Math.PI * 2);
  c.stroke();
  // The trap, hanging in the middle on a string.
  if (state !== 'empty') {
    c.strokeStyle = 'rgba(240,230,200,.8)';
    c.lineWidth = Math.max(1, 0.02 * p.s);
    c.beginPath();
    c.moveTo(p.sx, p.sy - r * 0.86);
    c.lineTo(p.sx, p.sy - 0.34 * p.s);
    c.stroke();
    drawJar(c, p.sx, p.sy, p.s, state === 'full', T);
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
    y0: H * 0.36,
    cx: fl.x * 0.7,
    cy: 2.6 + fl.y * 0.6,
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
    if (o.z > v.cz + 0.4 && o.z < v.cz + SEE)
      list.push({
        z: o.z,
        f: () =>
          o.kind === 'trap'
            ? drawTrapFlower(v, o, fl.spots[o.spot] ?? 'empty', T)
            : drawGate(v, o, T),
      });
  // The island's trees in rows either side of the way.
  const tz0 = Math.floor(v.cz / 6) * 6;
  for (let z = tz0; z < v.cz + SEE; z += 6)
    for (const side of [-1, 1]) {
      const x = side * (LANE_HALF + 1 + (((z * 13) % 7) / 7) * 1.5);
      const r = 0.9 + (((z * 7) % 5) / 5) * 0.6;
      if (z > v.cz + 0.4) list.push({ z, f: () => drawTrunk(v, z, x, r, T) });
    }
  // Plants and sun on the floor, whipping past underneath.
  const pz0 = Math.floor(v.cz / 2.5);
  for (let i = pz0; i < pz0 + 18; i++)
    for (let k = 0; k < 4; k++) {
      const z = i * 2.5 + hash(i, k) * 2.5;
      if (z <= v.cz + 0.4) continue;
      // Half of them about the middle of the way, under the drone, the rest out to the trees.
      const x = (hash(i, k + 5) * 2 - 1) * (k < 2 ? 3 : LANE_HALF + 3);
      const kind = hash(i, k + 9);
      list.push({ z, f: () => drawPlant(v, x, z, kind, T) });
    }
  // The drone's shadow on the floor, smaller and fainter the higher it flies: for telling how high it is.
  const sh = at(v, fl.x, 0, fl.z);
  if (sh)
    list.push({
      z: fl.z + 0.001,
      f: () => {
        ctx.fillStyle = `rgba(10,24,10,${0.45 - fl.y * 0.05})`;
        ctx.beginPath();
        ctx.ellipse(sh.sx, sh.sy, (0.75 - fl.y * 0.06) * sh.s, 0.16 * sh.s, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    });
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
    const fr = hash(i, Math.floor(v.cz / 2));
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
  if (fl.state !== 'fly') drawFlightOver(ctx, W, H, fl);
}

/** The flight over: made, or its battery flat, and the rings it went through. */
function drawFlightOver(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  fl: DroneFlight,
): void {
  const w = Math.min(300, W - 40);
  const x = (W - w) / 2;
  const y = H * 0.3;
  ctx.fillStyle = 'rgba(10,20,12,.7)';
  box(ctx, x, y, w, 76);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fl.state === 'done' ? '#FFE066' : '#FFF7E6';
  ctx.font = '800 22px Grandstander, ui-rounded, system-ui, sans-serif';
  ctx.fillText(fl.state === 'done' ? 'Through the jungle!' : 'Battery flat!', W / 2, y + 26);
  ctx.fillStyle = '#E8F2E0';
  ctx.font = '800 15px Grandstander, ui-rounded, system-ui, sans-serif';
  ctx.fillText(`${fl.rings} of ${fl.ringsOut} rings`, W / 2, y + 54);
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
  // Under it, the traps aboard.
  ctx.fillStyle = 'rgba(10,20,12,.55)';
  box(ctx, W - pad - 74, top + 50, 74, 40);
  drawJar(ctx, W - pad - 52, top + 70, 28, false, 0);
  ctx.fillStyle = '#FFF7E6';
  ctx.fillText(`${fl.carry}`, W - pad - 36, top + 71);
}

/** The lagoon's own colours: black water, its sheen, the mud of its banks and its reeds. */
const WATER_A = '#0C1B1C';
const WATER_B = '#102326';
const BANK = '#2C3D22';
const REED = '#5E8A3A';

/** A lagoon fish, side on, at (x, y), so long, its nose turned to angle a. */
function drawLagoonFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  sp: number,
  a: number,
): void {
  const gold = sp === AROWANA;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = gold ? '#C2502E' : '#9AA4A8';
  ctx.beginPath();
  ctx.moveTo(-len * 0.42, 0);
  ctx.lineTo(-len * 0.62, -len * 0.16);
  ctx.lineTo(-len * 0.62, len * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = gold ? '#E0A93A' : '#D8DFE0';
  ctx.beginPath();
  ctx.ellipse(0, 0, len * 0.45, len * (gold ? 0.11 : 0.18), 0, 0, Math.PI * 2);
  ctx.fill();
  if (gold) {
    // Big scales catching the light, and its whiskers.
    ctx.fillStyle = 'rgba(255,240,180,.55)';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * len * 0.12, -len * 0.02, len * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#8A5A1E';
    ctx.lineWidth = Math.max(1, len * 0.02);
    ctx.beginPath();
    ctx.moveTo(len * 0.42, len * 0.03);
    ctx.lineTo(len * 0.56, len * 0.1);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#23252E';
    for (const u of [-0.2, 0, 0.2])
      ctx.fillRect(u * len - len * 0.03, -len * 0.15, len * 0.06, len * 0.3);
  }
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(len * 0.33, -len * 0.03, Math.max(1, len * 0.03), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A rise: rings spreading on the black water where a fish is feeding, and its shape just under. */
function drawRise(v: View, r: Rise, T: number): void {
  const c = v.ctx;
  const mid = at(v, r.x, 0, r.z);
  if (!mid) return;
  c.fillStyle = r.sp === AROWANA ? 'rgba(224,169,58,.28)' : 'rgba(200,210,214,.18)';
  c.beginPath();
  c.ellipse(mid.sx, mid.sy, 0.7 * mid.s, 0.12 * mid.s, 0, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 3; i++) {
    const ph = (T * 0.7 + i / 3 + r.z * 0.13) % 1;
    const rad = 0.3 + ph * 1.5;
    const near = at(v, r.x, 0, r.z - rad);
    const far = at(v, r.x, 0, r.z + rad);
    if (!near || !far) continue;
    c.strokeStyle = `rgba(200,235,230,${(1 - ph) * 0.75})`;
    c.lineWidth = Math.max(1, 0.05 * mid.s);
    c.beginPath();
    c.ellipse(
      mid.sx,
      (near.sy + far.sy) / 2,
      rad * mid.s,
      Math.max(0.5, (near.sy - far.sy) / 2),
      0,
      0,
      Math.PI * 2,
    );
    c.stroke();
  }
}

/** Reeds along a bank at x, at depth z. */
function drawReeds(v: View, x: number, z: number, T: number): void {
  const c = v.ctx;
  const p = at(v, x, 0, z);
  if (!p || p.sx < -p.s * 2 || p.sx > v.W + p.s * 2) return;
  c.strokeStyle = REED;
  c.lineWidth = Math.max(1, 0.06 * p.s);
  c.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    const h = (1 + ((i * 7 + Math.floor(z)) % 3) * 0.3) * p.s;
    const sway = Math.sin(T * 1.5 + z + i) * 0.08 * p.s;
    c.beginPath();
    c.moveTo(p.sx + i * 0.18 * p.s, p.sy);
    c.lineTo(p.sx + i * 0.22 * p.s + sway, p.sy - h);
    c.stroke();
  }
}

/** Fishing from the drone over island 11's black lagoon (entities/dronefish.ts), the whole screen: black water running
 * toward you between reedy banks under the jungle, rises spreading rings on it, the drone over them with a jewel
 * beetle on its line, and the fish that comes for it. Over it all: how far down the lagoon, the beetles and the catch. */
export function drawDroneLagoon(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  fs: DroneFishing,
  colour: string,
  T: number,
  top = 12,
): void {
  const v: View = {
    ctx,
    W,
    H,
    f: Math.min(W, H) * 0.9,
    y0: H * 0.36,
    cx: fs.x * 0.7,
    cy: 2.6 + fs.y * 0.6,
    cz: fs.z - CAM_BACK,
  };
  const sky = ctx.createLinearGradient(0, 0, 0, v.y0);
  sky.addColorStop(0, '#0F2216');
  sky.addColorStop(1, '#3B5A42');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, v.y0);
  ctx.fillStyle = '#16261A';
  ctx.fillRect(0, v.y0, W, H - v.y0);
  // The banks, then the water between them, and the leaves high over it all, far to near.
  const step = 3;
  const z0 = Math.floor(v.cz / step) * step;
  for (let z = z0 + SEE; z >= z0; z -= step) {
    const k = Math.floor(z / step) % 2 === 0;
    ctx.globalAlpha = 1 - fog(v, z) * 0.9;
    band(v, 0, z, z + step, LAGOON_HALF + 30, BANK);
    band(v, 0, z, z + step, LAGOON_HALF, k ? WATER_A : WATER_B);
    // A glint of the sky on it, here and there.
    const g = hash(Math.floor(z / step), 7);
    const gp = g > 0.55 ? at(v, (g * 2 - 1.55) * LAGOON_HALF * 2, 0, z + step / 2) : null;
    if (gp) {
      ctx.fillStyle = 'rgba(150,200,190,.12)';
      ctx.beginPath();
      ctx.ellipse(gp.sx, gp.sy, 1.4 * gp.s, 0.06 * gp.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    band(v, CANOPY + 3, z, z + step, LAGOON_HALF + 30, k ? LEAF_A : LEAF_B);
  }
  ctx.globalAlpha = 1;
  const list: { z: number; f: () => void }[] = [];
  for (const r of fs.rises)
    if (!r.taken && r.z > v.cz + 0.4 && r.z < v.cz + SEE)
      list.push({ z: r.z, f: () => drawRise(v, r, T) });
  // Reeds along both banks, and the jungle's trees behind them.
  const rz0 = Math.floor(v.cz / 2) * 2;
  for (let z = rz0; z < v.cz + SEE; z += 2)
    if (z > v.cz + 0.4)
      for (const side of [-1, 1]) {
        const x = side * (LAGOON_HALF + 0.3 + hash(z, side) * 0.6);
        list.push({ z, f: () => drawReeds(v, x, z, T) });
      }
  const tz0 = Math.floor(v.cz / 6) * 6;
  for (let z = tz0; z < v.cz + SEE; z += 6)
    for (const side of [-1, 1]) {
      const x = side * (LAGOON_HALF + 3 + hash(z, side + 3) * 2);
      if (z > v.cz + 0.4) list.push({ z, f: () => drawTrunk(v, z, x, 1.1, T) });
    }
  // The drone, its line and the beetle on it, and the fish that comes for it.
  const d = at(v, fs.x, fs.y, fs.z);
  if (d)
    list.push({
      z: fs.z,
      f: () => {
        if (fs.state === 'drop' || fs.state === 'strike' || fs.state === 'reel') {
          const down = fs.state === 'drop' ? fs.t / DROP_T : 1;
          const water = at(v, fs.x, 0.25, fs.z);
          const by = water ? d.sy + (water.sy - d.sy) * down : d.sy;
          ctx.strokeStyle = 'rgba(235,235,220,.85)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(d.sx, d.sy + 0.1 * d.s);
          ctx.lineTo(d.sx, by);
          ctx.stroke();
          const sp = fs.at?.sp ?? -1;
          if (fs.state === 'strike' && fs.at && water) {
            const u = fs.t / STRIKE_T;
            if (sp === AROWANA) {
              // Up out of the water in an arc, mouth first.
              const fy = water.sy - Math.sin(u * Math.PI * 0.5) * (water.sy - by + 0.4 * d.s);
              drawLagoonFish(
                ctx,
                d.sx - (1 - u) * 0.8 * d.s,
                fy + 0.3 * d.s,
                1.5 * d.s,
                sp,
                -1.2 + u * 0.5,
              );
            } else {
              // Its head up at the surface, and a jet of water spat up at the beetle, drops flying off it.
              const hx = d.sx + 0.5 * d.s;
              const hy = water.sy + 0.15 * d.s;
              drawLagoonFish(ctx, hx, hy, 0.8 * d.s, sp, -1.3);
              const reach = Math.min(1, u * 1.6);
              const jx = hx + (d.sx - hx) * reach;
              const jy = hy - 0.3 * d.s + (by - hy + 0.3 * d.s) * reach;
              ctx.strokeStyle = 'rgba(210,240,255,.9)';
              ctx.lineWidth = Math.max(3, 0.1 * d.s);
              ctx.beginPath();
              ctx.moveTo(hx, hy - 0.3 * d.s);
              ctx.lineTo(jx, jy);
              ctx.stroke();
              ctx.fillStyle = 'rgba(210,240,255,.85)';
              for (let i = 0; i < 4; i++) {
                const dx = Math.sin(i * 2.3 + u * 9) * 0.15 * d.s;
                ctx.beginPath();
                ctx.arc(jx + dx, jy + i * 0.08 * d.s, Math.max(1.5, 0.04 * d.s), 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
          if (fs.state === 'reel' && fs.at) {
            const wig = Math.sin(T * 18) * 0.25;
            // Hanging off the line by its mouth, nose up, tail flapping.
            const len = (sp === AROWANA ? 1.4 : 0.8) * d.s;
            drawLagoonFish(ctx, d.sx, by + len * 0.45, len, sp, -Math.PI / 2 + wig);
            // How long is left to reel it in: a ring closing round it.
            ctx.strokeStyle = '#FFE066';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(
              d.sx,
              by + 0.45 * d.s,
              0.9 * d.s,
              -Math.PI / 2,
              -Math.PI / 2 + (1 - fs.t / REEL_T) * Math.PI * 2,
            );
            ctx.stroke();
          } else {
            ctx.fillStyle = '#3FE0C0';
            ctx.beginPath();
            ctx.ellipse(d.sx, by, 0.1 * d.s, 0.07 * d.s, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        drawDrone(ctx, d.sx, d.sy, d.s, colour, fs.vx / 6, 0, T, 0);
      },
    });
  list.sort((p, q) => q.z - p.z);
  for (const it of list) {
    ctx.globalAlpha = 1 - fog(v, it.z) * 0.95;
    it.f();
  }
  ctx.globalAlpha = 1;
  drawLagoonBars(ctx, W, fs, top);
}

/** How far down the lagoon, and at the right the beetles aboard and the fish caught. */
function drawLagoonBars(
  ctx: CanvasRenderingContext2D,
  W: number,
  fs: DroneFishing,
  top: number,
): void {
  const pad = 14;
  const w = Math.min(220, W - pad * 2 - 90);
  ctx.fillStyle = 'rgba(10,20,12,.55)';
  box(ctx, pad, top, w + 16, 30);
  ctx.fillStyle = 'rgba(232,242,224,.35)';
  ctx.fillRect(pad + 8, top + 13, w - 2, 4);
  ctx.fillStyle = '#FFE066';
  ctx.fillRect(pad + 8, top + 13, (w - 2) * fs.progress, 4);
  ctx.font = '800 16px Grandstander, ui-rounded, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // The beetles, a green bug.
  ctx.fillStyle = 'rgba(10,20,12,.55)';
  box(ctx, W - pad - 74, top, 74, 40);
  ctx.fillStyle = '#3FE0C0';
  ctx.beginPath();
  ctx.ellipse(W - pad - 52, top + 20, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF7E6';
  ctx.fillText(`${fs.beetles}`, W - pad - 36, top + 21);
  // The catch.
  ctx.fillStyle = 'rgba(10,20,12,.55)';
  box(ctx, W - pad - 74, top + 46, 74, 40);
  drawLagoonFish(ctx, W - pad - 52, top + 66, 24, AROWANA, 0);
  ctx.fillStyle = '#FFF7E6';
  ctx.fillText(`${fs.caught.length}`, W - pad - 36, top + 67);
}
