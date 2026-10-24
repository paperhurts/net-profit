/**
 * The Ninja Slalom (entities/slalom.ts), the whole screen, seen from just behind the skier as the run streams toward
 * you: the piste in stripes of snow between banks of pines, far snowy peaks under a cold blue sky, the gates, the
 * lanterns and all that stands in the way coming up out of the white haze ahead, and the skier, from behind, in your
 * jacket, a red headband's tails flying and a sword on the back. On the Doom Drop, the yeti after you: its face rising
 * from the bottom of the screen as it gains, all the way up once it is right behind you, its paws reaching.
 * Over it all: the clock, how far down, the medal times, the lanterns, and how far back the yeti is.
 */

import { clamp } from '../core/math';
import { clockOf, MEDAL_NAME, type Medal, medalOf } from '../data/slalom';
import {
  BEAT,
  type Feature,
  LANTERN_Y,
  RAMP_LEN,
  RAMP_Y,
  type Slalom,
  TRICK_T,
  TUMBLE_T,
} from '../entities/slalom';

/** Metres the camera sits behind the skier, and up; how far ahead the haze closes in. */
const CAM_BACK = 5;
const CAM_UP = 3.6;
const HAZE_FROM = 25;
const HAZE_TO = 85;
const SEE = 95;
/** The mountain's own colours. */
const SNOW_A = '#F6F9FC';
const SNOW_B = '#EAF1F8';
const BANK_A = '#DCE6F0';
const BANK_B = '#D2DEEA';
const PINE = '#2F5A3E';
const PINE_LIT = '#3D7050';
const ROCK = '#7E838C';
const ROCK_LIT = '#9CA1AA';
const INK = '#2A2D33';

/** Who skis: the figure's jacket (its shirt), hair and skin. */
export type SkierLook = { shirt: string; hair: string; skin: string };
/** A word over the run for a moment: a gate missed, a trick landed, a lantern cut. */
export type SkiPop = { text: string; colour: string; t: number };
export const SKI_POP_T = 1.2;

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

/** A point on the run on the screen, and how big a metre is there; null behind the camera. */
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

/** A strip of the snow at height y between depths z0 and z1, from x0 to x1. */
function patch(
  v: View,
  y: number,
  z0: number,
  z1: number,
  x0: number,
  x1: number,
  fill: string,
): void {
  const p = at(v, x0, y, z0);
  const q = at(v, x1, y, z0);
  const r = at(v, x1, y, z1);
  const s = at(v, x0, y, z1);
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

/** A number from 0 to 1 that is always the same for the same i and k. */
function hash(i: number, k: number): number {
  const h = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

/** A pine standing in the snow at (x, z), so tall, snow on its boughs. */
function drawPine(v: View, x: number, z: number, tall: number): void {
  const c = v.ctx;
  const p = at(v, x, 0, z);
  if (!p || p.sx < -tall * p.s || p.sx > v.W + tall * p.s) return;
  const m = p.s;
  c.fillStyle = '#5A4030';
  c.fillRect(p.sx - 0.1 * m, p.sy - 0.6 * m, 0.2 * m, 0.6 * m);
  for (let k = 0; k < 3; k++) {
    const base = p.sy - (0.45 + k * tall * 0.24) * m;
    const w = (1 - k * 0.24) * tall * 0.26 * m;
    const h = tall * 0.42 * m;
    c.fillStyle = k % 2 ? PINE_LIT : PINE;
    c.beginPath();
    c.moveTo(p.sx - w, base);
    c.lineTo(p.sx, base - h);
    c.lineTo(p.sx + w, base);
    c.closePath();
    c.fill();
    // Snow along the bough's lower edge.
    c.fillStyle = SNOW_A;
    c.beginPath();
    c.moveTo(p.sx - w, base);
    c.quadraticCurveTo(p.sx, base - h * 0.22, p.sx + w, base);
    c.quadraticCurveTo(p.sx, base - h * 0.08, p.sx - w, base);
    c.fill();
  }
  c.fillStyle = SNOW_A;
  c.beginPath();
  c.moveTo(p.sx - 0.12 * tall * m, p.sy - (0.45 + 2 * tall * 0.24 + tall * 0.3) * m);
  c.lineTo(p.sx, p.sy - (0.45 + 2 * tall * 0.24 + tall * 0.42) * m);
  c.lineTo(p.sx + 0.12 * tall * m, p.sy - (0.45 + 2 * tall * 0.24 + tall * 0.3) * m);
  c.fill();
}

/** A grey rock with a cap of snow. */
function drawRock(v: View, x: number, z: number, r: number): void {
  const c = v.ctx;
  const p = at(v, x, 0, z);
  if (!p) return;
  const m = p.s;
  c.fillStyle = ROCK;
  c.beginPath();
  c.moveTo(p.sx - r * m, p.sy);
  c.quadraticCurveTo(p.sx - r * 0.9 * m, p.sy - 0.75 * m, p.sx - 0.1 * m, p.sy - 0.8 * m);
  c.quadraticCurveTo(p.sx + r * 0.9 * m, p.sy - 0.7 * m, p.sx + r * m, p.sy);
  c.closePath();
  c.fill();
  c.fillStyle = ROCK_LIT;
  c.beginPath();
  c.moveTo(p.sx - r * m, p.sy);
  c.quadraticCurveTo(p.sx - r * 0.9 * m, p.sy - 0.75 * m, p.sx - 0.1 * m, p.sy - 0.8 * m);
  c.lineTo(p.sx - 0.2 * m, p.sy);
  c.closePath();
  c.fill();
  c.fillStyle = SNOW_A;
  c.beginPath();
  c.ellipse(p.sx - 0.1 * m, p.sy - 0.74 * m, r * 0.6 * m, 0.12 * m, 0, 0, Math.PI * 2);
  c.fill();
}

/** A snowman, facing up the run at you: three balls of snow, coal eyes, a carrot, stick arms and a ninja headband. */
function drawSnowman(v: View, x: number, z: number, T: number): void {
  const c = v.ctx;
  const p = at(v, x, 0, z);
  if (!p) return;
  const m = p.s;
  const balls: readonly [number, number][] = [
    [0.5, 0.5],
    [1.18, 0.37],
    [1.68, 0.27],
  ];
  c.fillStyle = 'rgba(120,150,190,.25)';
  c.beginPath();
  c.ellipse(p.sx, p.sy, 0.6 * m, 0.12 * m, 0, 0, Math.PI * 2);
  c.fill();
  // Stick arms.
  c.strokeStyle = '#6B4A30';
  c.lineWidth = Math.max(1, 0.05 * m);
  c.lineCap = 'round';
  const wave = Math.sin(T * 3 + z) * 0.08;
  c.beginPath();
  c.moveTo(p.sx - 0.3 * m, p.sy - 1.22 * m);
  c.lineTo(p.sx - 0.75 * m, p.sy - (1.5 + wave) * m);
  c.moveTo(p.sx + 0.3 * m, p.sy - 1.22 * m);
  c.lineTo(p.sx + 0.75 * m, p.sy - (1.45 - wave) * m);
  c.stroke();
  for (const [y, r] of balls) {
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.arc(p.sx, p.sy - y * m, r * m, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(150,175,210,.35)';
    c.beginPath();
    c.arc(p.sx + r * 0.25 * m, p.sy - (y - r * 0.2) * m, r * 0.85 * m, 0.1, Math.PI * 0.9);
    c.fill();
  }
  // The headband, its tails out to one side.
  c.fillStyle = '#D23B2E';
  c.fillRect(p.sx - 0.26 * m, p.sy - 1.82 * m, 0.52 * m, 0.08 * m);
  c.beginPath();
  c.moveTo(p.sx + 0.24 * m, p.sy - 1.8 * m);
  c.lineTo(p.sx + 0.5 * m, p.sy - (1.72 + wave) * m);
  c.lineTo(p.sx + 0.46 * m, p.sy - (1.66 + wave) * m);
  c.closePath();
  c.fill();
  c.fillStyle = INK;
  for (const dx of [-0.09, 0.09]) {
    c.beginPath();
    c.arc(p.sx + dx * m, p.sy - 1.7 * m, Math.max(1, 0.035 * m), 0, Math.PI * 2);
    c.fill();
  }
  for (const dy of [1.08, 1.2, 1.32]) {
    c.beginPath();
    c.arc(p.sx, p.sy - dy * m, Math.max(1, 0.03 * m), 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#F28C28';
  c.beginPath();
  c.arc(p.sx, p.sy - 1.63 * m, Math.max(1.5, 0.055 * m), 0, Math.PI * 2);
  c.fill();
}

/**
 * A gate: on each side a panel in its colour between two poles, the way through between the inner poles, and a line
 * of dye across the snow there, so it can be seen from far up the run.
 */
function drawGate(v: View, g: Feature & { kind: 'gate' }, T: number): void {
  const c = v.ctx;
  const col = g.red ? '#D8392B' : '#2F6FC4';
  const a = at(v, g.x - g.w / 2, 0, g.z);
  const b = at(v, g.x + g.w / 2, 0, g.z);
  if (a && b && g.z - v.cz > 4) {
    c.strokeStyle = g.red ? 'rgba(216,57,43,.4)' : 'rgba(47,111,196,.4)';
    c.lineWidth = Math.max(1.5, 0.12 * a.s);
    c.setLineDash([0.4 * a.s, 0.3 * a.s]);
    c.beginPath();
    c.moveTo(a.sx, a.sy);
    c.lineTo(b.sx, b.sy);
    c.stroke();
    c.setLineDash([]);
  }
  for (const side of [-1, 1]) {
    const inner = g.x + (side * g.w) / 2;
    const outer = inner + side * 0.9;
    const flap = Math.sin(T * 5 + g.z + side) * 0.05;
    const p = at(v, inner, 0, g.z);
    const q = at(v, outer, 0, g.z);
    const pt = at(v, inner, 1.9, g.z);
    const qt = at(v, outer, 1.9, g.z);
    if (!p || !q || !pt || !qt) continue;
    const m = p.s;
    c.strokeStyle = '#E8ECEF';
    c.lineWidth = Math.max(1.5, 0.06 * m);
    c.beginPath();
    c.moveTo(p.sx, p.sy);
    c.lineTo(pt.sx, pt.sy);
    c.moveTo(q.sx, q.sy);
    c.lineTo(qt.sx, qt.sy);
    c.stroke();
    // The panel, a little loose in the wind, a white band across it.
    const top = pt.sy + 0.1 * m;
    const h = 0.75 * m;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(pt.sx, top);
    c.lineTo(qt.sx, top + flap * m);
    c.lineTo(qt.sx, top + h + flap * m);
    c.lineTo(pt.sx, top + h);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.75)';
    c.fillRect(
      Math.min(pt.sx, qt.sx),
      top + h * 0.42 + flap * m * 0.5,
      Math.abs(qt.sx - pt.sx),
      h * 0.14,
    );
  }
}

/** A paper lantern floating over the run, glowing and bobbing; once sliced, its two halves falling away. */
function drawLantern(v: View, l: Feature & { kind: 'lantern' }, clock: number, T: number): void {
  const c = v.ctx;
  const since = l.cut < 0 ? -1 : clock - l.cut;
  if (since > 0.6) return;
  const bob = Math.sin(T * 1.8 + l.z) * 0.08;
  const mid = at(v, l.x, LANTERN_Y + bob, l.z);
  const foot = at(v, l.x, 0, l.z);
  if (!mid || !foot) return;
  const r = 0.3 * mid.s;
  if (since < 0) {
    // Its glow on the snow under it, and on the air round it.
    c.fillStyle = 'rgba(255,170,80,.18)';
    c.beginPath();
    c.ellipse(foot.sx, foot.sy, 0.6 * foot.s, 0.14 * foot.s, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,190,90,.3)';
    c.beginPath();
    c.arc(mid.sx, mid.sy, r * 1.8, 0, Math.PI * 2);
    c.fill();
    paperLantern(c, mid.sx, mid.sy, r, Math.sin(T * 1.3 + l.z) * 0.08, 1);
    return;
  }
  // Sliced: the two halves fly apart and drop, a puff of sparks between them.
  const u = since / 0.6;
  const fall = u * u * 1.2 * mid.s;
  const apart = u * 0.7 * mid.s;
  c.globalAlpha *= 1 - u;
  paperLantern(c, mid.sx - apart, mid.sy + fall, r, -u * 2, 0);
  paperLantern(c, mid.sx + apart, mid.sy + fall * 0.8, r, u * 2, 2);
  c.fillStyle = '#FFE066';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    c.beginPath();
    c.arc(
      mid.sx + Math.cos(a) * u * 0.8 * mid.s,
      mid.sy + Math.sin(a) * u * 0.8 * mid.s,
      Math.max(1, 0.04 * mid.s),
      0,
      Math.PI * 2,
    );
    c.fill();
  }
}

/** A round red paper lantern, whole (part 1), or one half of it (0 the left, 2 the right). */
function paperLantern(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  turn: number,
  part: number,
): void {
  c.save();
  c.translate(x, y);
  c.rotate(turn);
  c.beginPath();
  if (part === 1) c.ellipse(0, 0, r, r * 0.9, 0, 0, Math.PI * 2);
  else if (part === 0) c.ellipse(0, 0, r, r * 0.9, 0, Math.PI / 2, Math.PI * 1.5);
  else c.ellipse(0, 0, r, r * 0.9, 0, -Math.PI / 2, Math.PI / 2);
  c.closePath();
  c.fillStyle = '#E4572E';
  c.fill();
  c.strokeStyle = 'rgba(120,30,20,.55)';
  c.lineWidth = Math.max(1, r * 0.06);
  for (const k of [-0.5, 0, 0.5]) {
    if ((part === 0 && k > 0) || (part === 2 && k < 0)) continue;
    c.beginPath();
    c.ellipse(0, 0, r * Math.abs(k) + 0.5, r * 0.9, 0, 0, Math.PI * 2);
    c.stroke();
  }
  c.fillStyle = '#2A2D33';
  c.fillRect(-r * 0.45, -r * 1.0, r * 0.9, r * 0.18);
  c.fillRect(-r * 0.45, r * 0.82, r * 0.9, r * 0.18);
  if (part === 1) {
    c.fillStyle = '#F2C230';
    c.fillRect(-r * 0.06, r * 1.0, r * 0.12, r * 0.45);
  }
  c.restore();
}

/** A ramp of packed snow, its lip dyed blue. */
function drawJump(v: View, j: Feature & { kind: 'jump' }): void {
  const c = v.ctx;
  const a = at(v, j.x0, 0, j.z - RAMP_LEN);
  const b = at(v, j.x1, 0, j.z - RAMP_LEN);
  const p = at(v, j.x1, RAMP_Y, j.z);
  const q = at(v, j.x0, RAMP_Y, j.z);
  const pl = at(v, j.x1, 0, j.z);
  const ql = at(v, j.x0, 0, j.z);
  if (!a || !b || !p || !q || !pl || !ql) return;
  // Its sides, then its slope up.
  c.fillStyle = '#C9D9E8';
  for (const [x, top, low] of [
    [a, q, ql],
    [b, p, pl],
  ] as const) {
    c.beginPath();
    c.moveTo(x.sx, x.sy);
    c.lineTo(top.sx, top.sy);
    c.lineTo(low.sx, low.sy);
    c.closePath();
    c.fill();
  }
  c.fillStyle = '#E3EEF8';
  c.beginPath();
  c.moveTo(a.sx, a.sy);
  c.lineTo(b.sx, b.sy);
  c.lineTo(p.sx, p.sy);
  c.lineTo(q.sx, q.sy);
  c.closePath();
  c.fill();
  c.strokeStyle = '#5A9BD5';
  c.lineWidth = Math.max(2, 0.08 * p.s);
  c.beginPath();
  c.moveTo(q.sx, q.sy);
  c.lineTo(p.sx, p.sy);
  c.stroke();
}

/** Where a patch of ice or moguls lies on the snow. */
type Patch = { z: number; len: number; x0: number; x1: number };

/** A patch of ice: blue and glassy, a glint across it. */
function drawIce(v: View, f: Patch, T: number): void {
  patch(v, 0.01, f.z, f.z + f.len, f.x0, f.x1, 'rgba(150,200,235,.6)');
  const g = (T * 0.4 + f.z * 0.1) % 1;
  const z = f.z + f.len * g;
  patch(v, 0.02, z, z + 0.6, f.x0 + 0.5, f.x1 - 0.5, 'rgba(255,255,255,.55)');
}

/** A field of moguls: rows of round bumps, shaded on their far side. */
function drawMoguls(v: View, f: Patch, cz: number): void {
  const c = v.ctx;
  for (let z = f.z + 1; z < f.z + f.len; z += 2) {
    if (z <= cz + 0.6) continue;
    const row = Math.round((z - f.z) / 2);
    for (let x = f.x0 + (row % 2 ? 0.9 : 0.2); x < f.x1; x += 1.75) {
      const p = at(v, x, 0, z);
      if (!p) continue;
      c.fillStyle = 'rgba(140,170,205,.45)';
      c.beginPath();
      c.ellipse(p.sx, p.sy, 0.7 * p.s, 0.22 * p.s, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#FBFDFF';
      c.beginPath();
      c.ellipse(p.sx, p.sy - 0.06 * p.s, 0.6 * p.s, 0.2 * p.s, 0, Math.PI, Math.PI * 2);
      c.fill();
    }
  }
}

/** The finish: two posts and a chequered banner high across the run, gone over the camera once it is passed. */
function drawFinish(v: View, z: number, half: number): void {
  if (z - v.cz < 2.5) return;
  const c = v.ctx;
  const l = at(v, -half + 0.4, 0, z);
  const r = at(v, half - 0.4, 0, z);
  const lt = at(v, -half + 0.4, 5.6, z);
  const rt = at(v, half - 0.4, 5.6, z);
  if (!l || !r || !lt || !rt) return;
  c.strokeStyle = '#6B4A30';
  c.lineWidth = Math.max(2, 0.18 * l.s);
  c.beginPath();
  c.moveTo(l.sx, l.sy);
  c.lineTo(lt.sx, lt.sy);
  c.moveTo(r.sx, r.sy);
  c.lineTo(rt.sx, rt.sy);
  c.stroke();
  const h = 0.8 * l.s;
  const n = 16;
  const w = (rt.sx - lt.sx) / n;
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 2; k++) {
      c.fillStyle = (i + k) % 2 ? '#2A2D33' : '#FFFFFF';
      c.fillRect(lt.sx + i * w, lt.sy + (k * h) / 2, w + 0.5, h / 2 + 0.5);
    }
}

/** Whatever stands on the run, by its kind. */
function drawFeature(v: View, o: Feature, clock: number, T: number): void {
  switch (o.kind) {
    case 'gate':
      drawGate(v, o, T);
      break;
    case 'pine':
      drawPine(v, o.x, o.z, 4.5);
      break;
    case 'rock':
      drawRock(v, o.x, o.z, o.r);
      break;
    case 'snowman':
      drawSnowman(v, o.x, o.z, T);
      break;
    case 'lantern':
      drawLantern(v, o, clock, T);
      break;
    case 'jump':
      drawJump(v, o);
      break;
    default:
      break;
  }
}

/** The skier from behind, at the feet (sx, sy), m pixels a metre: banking into the turn, tucked, turning a trick. */
export function drawSkier(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  m: number,
  look: SkierLook,
  o: {
    bank: number;
    tuck: number;
    trick: 'flip' | 'spin' | null;
    turn: number;
    slash: number;
    T: number;
  },
): void {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(o.bank * 0.3);
  const hip = (0.85 - o.tuck * 0.25) * m;
  const neck = hip + (0.62 - o.tuck * 0.22) * m;
  // A trick turns the whole skier about the middle: head over heels for a flip, round and round for a spin.
  const mid = (hip + neck) / 2;
  let front = false;
  if (o.trick) {
    const a = Math.cos(o.turn * Math.PI * 2);
    ctx.translate(0, -mid);
    if (o.trick === 'flip') ctx.scale(1, a);
    else {
      ctx.scale(a, 1);
      front = a < 0;
    }
    ctx.translate(0, mid);
  }
  // The skis, running on ahead into the snow.
  ctx.fillStyle = '#D8392B';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 0.1 * m - 0.045 * m, 0.1 * m);
    ctx.lineTo(side * 0.1 * m + 0.045 * m, 0.1 * m);
    ctx.lineTo(side * 0.085 * m + 0.03 * m, -0.32 * m);
    ctx.lineTo(side * 0.085 * m - 0.03 * m, -0.32 * m);
    ctx.closePath();
    ctx.fill();
  }
  // Legs, knees bent the more for a tuck.
  ctx.strokeStyle = '#2B3346';
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.13 * m;
  const knee = hip * 0.5;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 0.1 * m, 0);
    ctx.lineTo(side * (0.13 + o.tuck * 0.06) * m, -knee);
    ctx.lineTo(side * 0.09 * m, -hip);
    ctx.stroke();
  }
  // The sword across the back, its hilt up over the left shoulder.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.06 * m;
  ctx.beginPath();
  ctx.moveTo(0.2 * m, -hip + 0.05 * m);
  ctx.lineTo(-0.2 * m, -neck - 0.1 * m);
  ctx.stroke();
  // The jacket, and the arms out for balance.
  ctx.fillStyle = look.shirt;
  ctx.beginPath();
  ctx.moveTo(-0.19 * m, -hip);
  ctx.lineTo(0.19 * m, -hip);
  ctx.lineTo(0.22 * m, -neck);
  ctx.lineTo(-0.22 * m, -neck);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = look.shirt;
  ctx.lineWidth = 0.1 * m;
  for (const side of [-1, 1]) {
    const reach = o.slash > 0 && side === 1 ? 0.55 : 0.36;
    ctx.beginPath();
    ctx.moveTo(side * 0.2 * m, -neck + 0.05 * m);
    ctx.lineTo(side * reach * m, -mid + (o.slash > 0 && side === 1 ? -0.1 : 0.12) * m);
    ctx.stroke();
  }
  ctx.fillStyle = look.skin;
  for (const side of [-1, 1]) {
    const reach = o.slash > 0 && side === 1 ? 0.55 : 0.36;
    ctx.beginPath();
    ctx.arc(
      side * reach * m,
      -mid + (o.slash > 0 && side === 1 ? -0.1 : 0.12) * m,
      0.05 * m,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // The sword's hilt, wrapped, over the shoulder; out of its sheath in a sweep, for a lantern.
  if (o.slash > 0) {
    const k = 1 - o.slash / 0.3;
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 0.05 * m;
    ctx.beginPath();
    ctx.arc(0.55 * m, -mid - 0.1 * m, 0.7 * m, -Math.PI * 0.9 + k * 1.2, -Math.PI * 0.2 + k * 1.2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#5A4632';
    ctx.lineWidth = 0.05 * m;
    ctx.beginPath();
    ctx.moveTo(-0.2 * m, -neck - 0.1 * m);
    ctx.lineTo(-0.27 * m, -neck - 0.28 * m);
    ctx.stroke();
  }
  // The head: the back of it, hair and all, or the face, turned round in a spin.
  const hy = -neck - 0.15 * m;
  ctx.fillStyle = front ? look.skin : look.hair;
  ctx.beginPath();
  ctx.arc(0, hy, 0.14 * m, 0, Math.PI * 2);
  ctx.fill();
  if (front) {
    ctx.fillStyle = INK;
    for (const dx of [-0.05, 0.05]) {
      ctx.beginPath();
      ctx.arc(dx * m, hy + 0.01 * m, 0.018 * m, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The red headband, its tails flying out behind.
  ctx.fillStyle = '#D23B2E';
  ctx.fillRect(-0.145 * m, hy - 0.06 * m, 0.29 * m, 0.06 * m);
  const flap = Math.sin(o.T * 14) * 0.05;
  ctx.beginPath();
  ctx.moveTo(0.02 * m, hy - 0.03 * m);
  ctx.quadraticCurveTo(0.14 * m, hy + (0.05 + flap) * m, 0.3 * m, hy + (0.02 - flap) * m);
  ctx.lineTo(0.28 * m, hy + (0.08 - flap) * m);
  ctx.quadraticCurveTo(0.12 * m, hy + (0.1 + flap) * m, 0.0 * m, hy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The whole run on the screen; top is where the bars sit, clear of the phone's notch; best, the best time before. */
export function drawSlalom(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  sl: Slalom,
  look: SkierLook,
  T: number,
  top = 12,
  pops: readonly SkiPop[] = [],
  best: number | undefined = undefined,
): void {
  const bob = sl.inMoguls ? Math.abs(Math.sin(sl.z * 1.6)) * 0.18 : 0;
  const v: View = {
    ctx,
    W,
    H,
    f: Math.min(W, H),
    y0: H * 0.27,
    cx: sl.x * 0.8,
    cy: CAM_UP + sl.y * 0.5,
    cz: sl.z - CAM_BACK,
  };
  const half = sl.run.half;
  // The sky, the far peaks along the horizon, and the snow.
  const [zenith, haze] = sl.run.sky;
  const sky = ctx.createLinearGradient(0, 0, 0, v.y0);
  sky.addColorStop(0, zenith);
  sky.addColorStop(1, haze);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, v.y0 + 1);
  drawFarPeaks(ctx, W, v.y0, sl.x);
  // The ground: the haze far off, snow near, so the far run fades into the haze.
  const ground = ctx.createLinearGradient(0, v.y0, 0, v.y0 + (H - v.y0) * 0.4);
  ground.addColorStop(0, haze);
  ground.addColorStop(1, SNOW_B);
  ctx.fillStyle = ground;
  ctx.fillRect(0, v.y0, W, H - v.y0);
  // Stripes of snow running toward you, far to near: the piste, and the deep banks either side of it.
  const step = 3;
  const z0 = Math.floor(v.cz / step) * step;
  for (let z = z0 + SEE; z >= z0; z -= step) {
    const k = Math.floor(z / step) % 2 === 0;
    ctx.globalAlpha = 1 - fog(v, z) * 0.9;
    patch(v, 0, z, z + step, -half - 40, half + 40, k ? BANK_A : BANK_B);
    patch(v, 0, z, z + step, -half, half, k ? SNOW_A : SNOW_B);
    patch(v, 0, z, z + step, -half - 0.12, -half, '#B9CADC');
    patch(v, 0, z, z + step, half, half + 0.12, '#B9CADC');
  }
  ctx.globalAlpha = 1;
  // Flat things on the snow, far to near, under all that stands: ice and moguls.
  for (const o of sl.course) {
    if (o.kind !== 'ice' && o.kind !== 'moguls') continue;
    if (o.z + o.len < v.cz || o.z > v.cz + SEE) continue;
    ctx.globalAlpha = 1 - fog(v, o.z) * 0.9;
    if (o.kind === 'ice') drawIce(v, o, T);
    else drawMoguls(v, o, v.cz);
  }
  ctx.globalAlpha = 1;
  // Everything standing on it, far to near, the skier among it.
  const list: { z: number; f: () => void }[] = [];
  for (const o of sl.course)
    if (o.kind !== 'ice' && o.kind !== 'moguls' && o.z > v.cz + 0.4 && o.z < v.cz + SEE)
      list.push({ z: o.z, f: () => drawFeature(v, o, sl.t, T) });
  if (sl.run.len > v.cz + 0.4 && sl.run.len < v.cz + SEE)
    list.push({ z: sl.run.len, f: () => drawFinish(v, sl.run.len, half) });
  // Pines in rows either side of the piste.
  const tz0 = Math.floor(v.cz / 7) * 7;
  for (let z = tz0; z < v.cz + SEE; z += 7)
    for (const side of [-1, 1])
      for (const row of [0, 1]) {
        const x = side * (half + 1.6 + row * 4.5 + hash(z, side + row * 3) * 1.5);
        const tall = 4 + hash(z, side + 7 + row) * 2.5;
        const zz = z + row * 3.5;
        if (zz > v.cz + 0.4) list.push({ z: zz, f: () => drawPine(v, x, zz, tall) });
      }
  // The skier's shadow, smaller and fainter the higher it is: for telling how high.
  const sh = at(v, sl.x, 0, sl.z);
  if (sh)
    list.push({
      z: sl.z + 0.001,
      f: () => {
        ctx.fillStyle = `rgba(90,120,160,${Math.max(0.1, 0.35 - sl.y * 0.06)})`;
        ctx.beginPath();
        ctx.ellipse(sh.sx, sh.sy, (0.45 - sl.y * 0.04) * sh.s, 0.12 * sh.s, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    });
  const d = at(v, sl.x, sl.y + bob, sl.z);
  if (d)
    list.push({
      z: sl.z,
      f: () => {
        // Snow thrown up off the skis, the harder the carve the more; and over the finish, a spray as it stops.
        const spray = sl.state === 'done' ? Math.min(1, sl.v / 6) : Math.abs(sl.vx) / 7.5;
        if (!sl.air && sl.state !== 'tumble' && spray > 0.15) {
          ctx.fillStyle = 'rgba(255,255,255,.85)';
          const side = sl.state === 'done' ? 1 : -Math.sign(sl.vx);
          for (let i = 0; i < 8; i++) {
            const u = hash(i, Math.floor(T * 20));
            ctx.beginPath();
            ctx.arc(
              d.sx + side * (0.15 + u * 0.5) * d.s * spray,
              d.sy - u * 0.4 * d.s * spray,
              Math.max(1, (0.04 + u * 0.05) * d.s),
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
        // A tumble: rolled up in a ball of snow, then out of it and up again for its last moment.
        const e = TUMBLE_T - sl.tumbleT;
        if (sl.state === 'tumble' && sl.tumbleT > 0.3) drawSnowball(ctx, d.sx, d.sy, d.s, look, e);
        else
          drawSkier(ctx, d.sx, d.sy, d.s, look, {
            bank: sl.vx / 7.5,
            tuck: sl.tuck,
            trick: sl.trick,
            turn: Math.min(1, sl.trickT / TRICK_T),
            slash: sl.slashT,
            T,
          });
        if (sl.state === 'tumble') drawPuff(ctx, d.sx, d.sy, d.s, e);
      },
    });
  list.sort((p, q) => q.z - p.z);
  for (const it of list) {
    ctx.globalAlpha = 1 - fog(v, it.z) * 0.95;
    it.f();
  }
  ctx.globalAlpha = 1;
  // Flakes whipping past, the more the faster.
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  const flakes = Math.round(6 + (sl.v / 16.5) * 16);
  for (let i = 0; i < flakes; i++) {
    const z = Math.floor(v.cz / 2) * 2 + (i % 11) * 2 + 1;
    const fr = hash(i, Math.floor(v.cz / 2));
    const p = at(v, (fr * 2 - 1) * (half + 3), 0.3 + ((fr * 7) % 1) * 4, z);
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, Math.max(1, 0.04 * p.s), 0, Math.PI * 2);
    ctx.fill();
  }
  if (sl.run.yeti) yetiPeek(ctx, W, H, sl, T);
  drawSkiBars(ctx, W, sl, top);
  drawPops(ctx, W, top + (sl.run.yeti ? 122 : 104), pops);
  if (sl.howTo) drawHowTo(ctx, W, H);
  else if (sl.state === 'ready' || (sl.state === 'ski' && sl.t < 0.7)) drawCount(ctx, W, H, sl);
  if (sl.state === 'done') drawSkiOver(ctx, W, H, sl, best);
}

/** The far peaks along the horizon, white-topped, drifting a little as you carve. */
function drawFarPeaks(ctx: CanvasRenderingContext2D, W: number, y0: number, x: number): void {
  const shift = -x * 2;
  for (const [h, col, cap, k] of [
    [0.16, '#B8CCE0', '#EEF4FA', 1],
    [0.1, '#A7BFD8', '#E4EDF6', 2],
  ] as const) {
    const n = 7;
    const span = W / (n - 1);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-span, y0 + 1);
    const tops: [number, number][] = [];
    for (let i = -1; i <= n; i++) {
      const px = i * span + ((shift * k) % span) + hash(i, k) * span * 0.4;
      const py = y0 - (0.4 + hash(i, k + 3) * 0.6) * h * W;
      tops.push([px, py]);
      ctx.lineTo(px, py);
      ctx.lineTo(px + span * 0.5, y0 - hash(i, k + 5) * h * W * 0.3);
    }
    ctx.lineTo(W + span, y0 + 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = cap;
    for (const [px, py] of tops) {
      const d = (y0 - py) * 0.3;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + d * 0.9, py + d);
      ctx.lineTo(px + d * 0.3, py + d * 0.8);
      ctx.lineTo(px - d * 0.2, py + d);
      ctx.lineTo(px - d * 0.7, py + d * 0.85);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** A tumble's puff of snow round the skier. */
function drawPuff(ctx: CanvasRenderingContext2D, x: number, y: number, m: number, e: number): void {
  const a = Math.max(0, 1 - e / 1.2);
  if (a <= 0) return;
  ctx.fillStyle = `rgba(255,255,255,${0.85 * a})`;
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2;
    const r = (0.4 + e * 0.9) * m;
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(ang) * r,
      y - 0.4 * m + Math.sin(ang) * r * 0.5,
      (0.22 + hash(i, 3) * 0.15) * m,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

/** Mid-tumble, the skier as a rolling ball of snow, skis and an arm and the headband's tail poking out of it. */
function drawSnowball(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  m: number,
  look: SkierLook,
  e: number,
): void {
  const r = 0.55 * m;
  const cy = y - r;
  const turn = e * 9;
  ctx.save();
  ctx.translate(x, cy);
  ctx.rotate(turn);
  ctx.fillStyle = '#D8392B';
  ctx.fillRect(-0.06 * m, -r - 0.3 * m, 0.08 * m, 0.5 * m);
  ctx.fillRect(r * 0.5, -0.05 * m, 0.55 * m, 0.08 * m);
  ctx.strokeStyle = look.shirt;
  ctx.lineWidth = 0.1 * m;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, r * 0.5);
  ctx.lineTo(-r * 1.05, r * 0.95);
  ctx.stroke();
  ctx.fillStyle = '#D23B2E';
  ctx.beginPath();
  ctx.moveTo(r * 0.3, r * 0.7);
  ctx.lineTo(r * 0.6, r * 1.25);
  ctx.lineTo(r * 0.75, r * 1.15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,185,215,.45)';
  ctx.beginPath();
  ctx.arc(r * 0.15, r * 0.15, r * 0.8, 0.2, Math.PI * 1.1);
  ctx.fill();
  ctx.restore();
}

/** How it goes, on a first run, before the countdown: three lines, and how to skip them. */
function drawHowTo(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const w = Math.min(320, W - 32);
  const x = (W - w) / 2;
  const y = H * 0.36;
  ctx.fillStyle = 'rgba(20,40,70,.75)';
  box(ctx, x, y, w, 168);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFE066';
  ctx.font = `800 20px ${FONT}`;
  ctx.fillText('The Bunny Slope', W / 2, y + 26);
  ctx.font = `800 15px ${FONT}`;
  ctx.fillStyle = '#FFF7E6';
  const lines = [
    'Steer through the gates',
    'Push up to tuck for speed',
    'Off a jump, tap Trick!',
    'Pass close to slice the lanterns',
  ];
  lines.forEach((t, i) => {
    ctx.fillText(t, W / 2, y + 58 + i * 24);
  });
  ctx.fillStyle = '#CFE2F5';
  ctx.font = `800 12px ${FONT}`;
  ctx.fillText('Tap Trick! to start now', W / 2, y + 152);
}

/** A rounded box, or a plain one where the browser cannot round it. */
function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 12);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

const FONT = 'Grandstander, ui-rounded, system-ui, sans-serif';

/** The clock and how far down, along the top; at the right, the lanterns sliced. */
function drawSkiBars(ctx: CanvasRenderingContext2D, W: number, sl: Slalom, top: number): void {
  const pad = 14;
  const w = Math.min(220, W - pad * 2 - 90);
  ctx.fillStyle = 'rgba(20,40,70,.55)';
  box(ctx, pad, top, w + 16, 66);
  ctx.fillStyle = '#FFF7E6';
  ctx.font = `800 22px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(clockOf(sl.time), pad + 10, top + 19);
  ctx.font = `800 13px ${FONT}`;
  ctx.fillStyle = '#CFE2F5';
  ctx.textAlign = 'right';
  ctx.fillText(sl.run.name, pad + w + 8, top + 19);
  ctx.fillStyle = 'rgba(232,242,250,.35)';
  ctx.fillRect(pad + 8, top + 36, w - 2, 4);
  ctx.fillStyle = '#FFE066';
  ctx.fillRect(pad + 8, top + 36, (w - 2) * sl.progress, 4);
  // The medal times: each dims once the clock is past it.
  ctx.font = `800 12px ${FONT}`;
  ctx.textAlign = 'left';
  sl.run.medals.forEach((m, i) => {
    const x = pad + 10 + i * Math.min(72, (w - 2) / 3);
    const lost = sl.time > m + 0.05;
    ctx.globalAlpha = lost ? 0.35 : 1;
    medalDisc(ctx, x + 6, top + 53, 6, MEDALS[i] as Medal);
    ctx.fillStyle = '#FFF7E6';
    ctx.fillText(clockOf(m), x + 15, top + 54);
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(20,40,70,.55)';
  box(ctx, W - pad - 74, top, 74, 44);
  paperLantern(ctx, W - pad - 52, top + 22, 10, 0, 1);
  ctx.fillStyle = '#FFF7E6';
  ctx.font = `800 16px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`${sl.lanterns}`, W - pad - 36, top + 23);
  // How far back the yeti is: red once it is close.
  if (sl.run.yeti && sl.state !== 'done') {
    const gap = Math.max(0, sl.yetiGap);
    const near = gap < YETI_CLOSE;
    ctx.fillStyle = near ? 'rgba(170,40,40,.75)' : 'rgba(20,40,70,.55)';
    box(ctx, W - pad - 74, top + 50, 74, 36);
    yetiFace(ctx, W - pad - 55, top + 68, 11, near && sl.yetiRoar > 0, 0);
    ctx.fillStyle = '#FFF7E6';
    ctx.font = `800 14px ${FONT}`;
    ctx.fillText(`${Math.round(gap)} m`, W - pad - 39, top + 69);
  }
}

/** Closer than this, the yeti's chip in the bar goes red. */
const YETI_CLOSE = 15;
/** The yeti peeks up from the bottom of the screen from this far back, and is all the way up as near as the camera. */
const PEEK_FROM = 26;

/** The edge of the yeti's white fur, so it shows against the snow. */
const FUR_EDGE = 'rgba(70,95,130,.6)';

/** The yeti's face, front on: white shaggy fur round a blue-grey face, angry brows, and its mouth shut on two fangs,
 * or wide open, roaring. */
function yetiFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  roar: boolean,
  T: number,
): void {
  // The fur, shaggy round the edge.
  ctx.fillStyle = '#F4F7FB';
  ctx.beginPath();
  for (let i = 0; i <= 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const rr = r * (1 + (i % 2 ? 0.1 : -0.02) + Math.sin(T * 6 + i) * 0.015);
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = FUR_EDGE;
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.stroke();
  ctx.fillStyle = '#DCE5EF';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.08, r * 0.82, 0, Math.PI);
  ctx.fill();
  // The face.
  ctx.fillStyle = '#7F9AB8';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.18, r * 0.6, r * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();
  // Brows and eyes.
  ctx.strokeStyle = '#2A3446';
  ctx.lineWidth = Math.max(1.5, r * 0.11);
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * r * 0.42, y - r * 0.12);
    ctx.lineTo(x + side * r * 0.1, y + r * 0.02);
    ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.ellipse(x + side * r * 0.24, y + r * 0.1, r * 0.11, r * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x + side * r * 0.22, y + r * 0.11, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = 'butt';
  // The mouth.
  if (roar) {
    ctx.fillStyle = '#5A1620';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.44, r * 0.3, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    for (const dx of [-0.17, 0.17]) {
      ctx.beginPath();
      ctx.moveTo(x + (dx - 0.06) * r, y + r * 0.27);
      ctx.lineTo(x + (dx + 0.06) * r, y + r * 0.27);
      ctx.lineTo(x + dx * r, y + r * 0.4);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.strokeStyle = '#2A3446';
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.22, y + r * 0.42);
    ctx.lineTo(x + r * 0.22, y + r * 0.42);
    ctx.stroke();
    ctx.fillStyle = '#FFF';
    for (const dx of [-0.14, 0.14]) {
      ctx.beginPath();
      ctx.moveTo(x + (dx - 0.05) * r, y + r * 0.42);
      ctx.lineTo(x + (dx + 0.05) * r, y + r * 0.42);
      ctx.lineTo(x + dx * r, y + r * 0.53);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** The yeti behind you: its face rising from the bottom of the screen the nearer it comes, all the way up once it is
 * as near as the camera, its paws reaching up either side once it is close. */
function yetiPeek(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  sl: Slalom,
  T: number,
): void {
  if (sl.state === 'done') return;
  const gap = sl.yetiGap;
  const u = clamp((PEEK_FROM - gap) / (PEEK_FROM - CAM_BACK), 0, 1);
  if (u <= 0) return;
  const r = Math.min(W, H) * 0.17;
  const bobY = Math.sin(T * 9) * r * 0.04;
  const y = H + r * 1.15 - u * r * 1.75 + bobY;
  const roar = sl.yetiRoar > 0;
  if (u > 0.55) {
    // Paws, reaching up.
    for (const side of [-1, 1]) {
      const px = W / 2 + side * r * 1.35;
      const py = y + r * 0.3 - Math.sin(T * 7 + side) * r * 0.1;
      ctx.fillStyle = '#EEF2F8';
      ctx.strokeStyle = FUR_EDGE;
      ctx.lineWidth = Math.max(1.5, r * 0.05);
      ctx.beginPath();
      ctx.ellipse(px, py, r * 0.32, r * 0.42, side * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#7F9AB8';
      for (const k of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.arc(px + k * r * 0.12, py - r * 0.36, r * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  yetiFace(ctx, W / 2, y, r, roar, T);
}

/** The words over the run, from just under the bars: each rises and fades. */
function drawPops(
  ctx: CanvasRenderingContext2D,
  W: number,
  y0: number,
  pops: readonly SkiPop[],
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 24px ${FONT}`;
  pops.forEach((p, i) => {
    const u = clamp(p.t / SKI_POP_T, 0, 1);
    ctx.globalAlpha = 1 - u * u;
    const y = y0 - u * 26 + i * 30;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(20,40,70,.6)';
    ctx.strokeText(p.text, W / 2, y);
    ctx.fillStyle = p.colour;
    ctx.fillText(p.text, W / 2, y);
  });
  ctx.globalAlpha = 1;
}

/** The countdown at the top of the run: 3, 2, 1, Go! */
function drawCount(ctx: CanvasRenderingContext2D, W: number, H: number, sl: Slalom): void {
  const n = sl.count;
  const text = n ? `${n}` : 'Go!';
  const into = n ? 1 - (sl.readyT - (n - 1) * BEAT) / BEAT : sl.t / 0.7;
  const size = Math.min(W / 4, 96) * (1 + (1 - Math.min(1, into * 4)) * 0.4);
  ctx.globalAlpha = n ? 1 : 1 - into;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(size)}px ${FONT}`;
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(20,40,70,.65)';
  ctx.strokeText(text, W / 2, H * 0.4);
  ctx.fillStyle = n ? '#FFF7E6' : '#FFE066';
  ctx.fillText(text, W / 2, H * 0.4);
  ctx.globalAlpha = 1;
}

/** Over the finish: the time, and how it went. */
function drawSkiOver(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  sl: Slalom,
  best: number | undefined,
): void {
  const w = Math.min(300, W - 40);
  const x = (W - w) / 2;
  const y = H * 0.3;
  const medal = medalOf(sl.run, sl.time);
  ctx.fillStyle = 'rgba(20,40,70,.72)';
  box(ctx, x, y, w, 150);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#CFE2F5';
  ctx.font = `800 15px ${FONT}`;
  ctx.fillText(`${sl.run.name}, down!`, W / 2, y + 20);
  ctx.fillStyle = '#FFE066';
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText(clockOf(sl.time), W / 2, y + 52);
  // The medal won, or how far off bronze.
  ctx.font = `800 17px ${FONT}`;
  if (medal) {
    const text = `${MEDAL_NAME[medal]} medal!`;
    const tw = ctx.measureText(text).width;
    medalDisc(ctx, W / 2 - tw / 2 - 4, y + 84, 10, medal);
    ctx.fillStyle = MEDAL_COLOUR[medal];
    ctx.fillText(text, W / 2 + 12, y + 84);
  } else {
    ctx.fillStyle = '#CFE2F5';
    ctx.fillText(`Bronze is ${clockOf(sl.run.medals[2])}: so close!`, W / 2, y + 84);
  }
  const rounded = Math.round(sl.time * 10) / 10;
  ctx.font = `800 14px ${FONT}`;
  ctx.fillStyle = '#FFF7E6';
  ctx.fillText(
    best === undefined
      ? 'Your first run!'
      : rounded < best
        ? `Your best yet! (was ${clockOf(best)})`
        : `Your best: ${clockOf(best)}`,
    W / 2,
    y + 110,
  );
  ctx.fillStyle = '#CFE2F5';
  ctx.font = `800 13px ${FONT}`;
  ctx.fillText(
    `Gates ${sl.gatesMade}/${sl.gatesOut} · Lanterns ${sl.lanterns} · Tricks ${sl.tricks}`,
    W / 2,
    y + 132,
  );
}

/** The medals' names and colours, gold first. */
const MEDALS: readonly Medal[] = ['gold', 'silver', 'bronze'];
const MEDAL_COLOUR: Readonly<Record<Medal, string>> = {
  gold: '#F5C84B',
  silver: '#D5DEE7',
  bronze: '#D69355',
};
/** A medal: a disc on its ribbon's knot, a shine across it. */
function medalDisc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, m: Medal): void {
  ctx.fillStyle = '#C4433A';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y - r * 1.5);
  ctx.lineTo(x - r * 0.15, y - r * 0.4);
  ctx.lineTo(x + r * 0.15, y - r * 0.4);
  ctx.lineTo(x + r * 0.7, y - r * 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = MEDAL_COLOUR[m];
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,40,10,.35)';
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
}
