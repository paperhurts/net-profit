/**
 * The sirens drawn (entities/sirens.ts): as the oldest Greek pictures have them, great dark birds with women's
 * heads. Perched on a rock, facing the boat: long tail feathers down behind, talons gripping the stone, the wings
 * folded close and lifting wide while she sings, a woman's face under long dark hair, a thin gold band at her brow,
 * and eyes that burn gold at night. Flying, the wings beat and the hair streams back. Each note of their song drifts
 * off toward the boat, the way the song pulls it.
 */
import { rgba } from '../core/color';
import { clamp } from '../core/math';
import type { DrawView, Layer } from '../entities/entity';
import type { Siren, SirenNote, Sirens } from '../entities/sirens';
import { ISLE2 } from '../world/isle2';
import type { Rock } from '../world/mermaids';

/** Their notes' colour, and how long one takes to drift to the boat (as the entity has it). */
const NOTE = '#B38BFF';
const DRIFT_T = 1.8;
const SIZE = 1.7;
const TALON = '#C9B37A';
const EYE = '#FFC94A';

/** A wing from the shoulder: folded down along the back at open 0, raised up and back at 1, its feathers fingered. */
function wing(
  v: DrawView,
  sx: number,
  sy: number,
  dir: number,
  open: number,
  s: Siren,
  Z: number,
  far: boolean,
): void {
  const { ctx } = v;
  const L = s.look;
  const tx = sx - dir * (7 + 6 * open) * Z;
  const ty = sy + (12 - 26 * open) * Z;
  const nx = -(ty - sy);
  const ny = tx - sx;
  const n = Math.hypot(nx, ny) || 1;
  const w = (4.5 + 3 * open) * Z;
  ctx.fillStyle = far ? rgba(L.feather, 0.85) : L.feather;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(
    (sx + tx) / 2 + (nx / n) * w * -dir,
    (sy + ty) / 2 + (ny / n) * w * -dir,
    tx,
    ty,
  );
  // The trailing edge, in three fingered feathers back to the shoulder.
  for (let i = 1; i <= 3; i++) {
    const k = i / 3.5;
    const fx = tx + (sx - tx) * k;
    const fy = ty + (sy - ty) * k;
    ctx.lineTo(fx + (nx / n) * w * 0.5 * dir, fy + (ny / n) * w * 0.5 * dir);
    ctx.lineTo(fx + (sx - tx) * 0.12, fy + (sy - ty) * 0.12);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(L.edge, far ? 0.4 : 0.7);
  ctx.lineWidth = 0.7 * Z;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(
    (sx + tx) / 2 + (nx / n) * w * -dir * 0.6,
    (sy + ty) / 2 + (ny / n) * w * -dir * 0.6,
    tx,
    ty,
  );
  ctx.stroke();
}

/** Her head: long hair down behind, the face toward the boat, the gold band, the eye, and her mouth open singing. */
function head(
  v: DrawView,
  hx: number,
  hy: number,
  dir: number,
  s: Siren,
  Z: number,
  stream: number,
): void {
  const { ctx } = v;
  const L = s.look;
  ctx.fillStyle = L.hair;
  ctx.beginPath();
  ctx.moveTo(hx + dir * 1.5 * Z, hy - 3.6 * Z);
  ctx.quadraticCurveTo(
    hx - dir * (6 + stream) * Z,
    hy - 2 * Z,
    hx - dir * (5 + stream * 1.6) * Z,
    hy + (7 - stream) * Z,
  );
  ctx.lineTo(hx - dir * 1 * Z, hy + 4 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = L.face;
  ctx.beginPath();
  ctx.arc(hx, hy, 3.4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = L.hair;
  ctx.beginPath();
  ctx.arc(hx - dir * 0.3 * Z, hy - 0.5 * Z, 3.7 * Z, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#E2B54A';
  ctx.lineWidth = 0.8 * Z;
  ctx.beginPath();
  ctx.arc(hx - dir * 0.3 * Z, hy - 0.4 * Z, 3.5 * Z, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.fillStyle = v.dark > 0.3 ? EYE : '#2A2230';
  ctx.beginPath();
  ctx.arc(hx + dir * 1.8 * Z, hy - 0.2 * Z, (v.dark > 0.3 ? 0.75 : 0.55) * Z, 0, Math.PI * 2);
  ctx.fill();
  if (s.sing > 0) {
    ctx.fillStyle = '#4A1E2E';
    ctx.beginPath();
    ctx.ellipse(hx + dir * 2.3 * Z, hy + 1.8 * Z, 0.8 * Z, 1.1 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A siren on her rock, at its top, facing the boat. */
export function drawSirenPerched(v: DrawView, s: Siren, rock: Rock): void {
  const { ctx } = v;
  const L = s.look;
  const Z = v.zoom * SIZE;
  const dir = s.face;
  const x = v.px(rock.x, rock.y);
  const y = v.py(rock.x, rock.y, rock.h) + 1 * Z;
  const open = s.sing > 0 ? 1 : 0.1 + 0.08 * Math.sin(s.ph * 0.8);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Long tail feathers, down behind her over the rock's edge.
  ctx.fillStyle = L.feather;
  ctx.beginPath();
  ctx.moveTo(x - dir * 2 * Z, y - 6 * Z);
  ctx.lineTo(x - dir * 12 * Z, y + 4 * Z);
  ctx.lineTo(x - dir * 9 * Z, y + 6 * Z);
  ctx.lineTo(x - dir * 7 * Z, y + 4.5 * Z);
  ctx.lineTo(x - dir * 5 * Z, y + 6.5 * Z);
  ctx.lineTo(x + dir * 1 * Z, y - 3 * Z);
  ctx.closePath();
  ctx.fill();
  wing(v, x - dir * 0.5 * Z, y - 13 * Z, dir, open, s, Z, true);
  // Her body, a bird's, leaning a little forward; the bronze edges of the feathers across her breast.
  ctx.fillStyle = L.feather;
  ctx.beginPath();
  ctx.ellipse(x, y - 8.5 * Z, 5.4 * Z, 8 * Z, dir * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(L.edge, 0.65);
  ctx.lineWidth = 0.7 * Z;
  for (const k of [0, 1, 2]) {
    ctx.beginPath();
    ctx.arc(x + dir * 1.6 * Z, y - (11 - k * 3) * Z, 2.4 * Z, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  // Legs and talons, gripping the stone.
  ctx.strokeStyle = TALON;
  ctx.lineWidth = 1.1 * Z;
  for (const side of [-1, 1]) {
    const lx = x + side * 1.8 * Z;
    ctx.beginPath();
    ctx.moveTo(lx, y - 2 * Z);
    ctx.lineTo(lx + dir * 0.6 * Z, y + 0.6 * Z);
    ctx.moveTo(lx + dir * 0.6 * Z, y + 0.6 * Z);
    ctx.lineTo(lx + dir * 2.4 * Z, y + 1.2 * Z);
    ctx.moveTo(lx + dir * 0.6 * Z, y + 0.6 * Z);
    ctx.lineTo(lx - dir * 1.2 * Z, y + 1.1 * Z);
    ctx.stroke();
  }
  wing(v, x + dir * 0.8 * Z, y - 12.5 * Z, dir, open, s, Z, false);
  // A neck, and her head.
  ctx.fillStyle = L.face;
  ctx.fillRect(x + dir * 0.4 * Z - 1.2 * Z, y - 18.5 * Z, 2.4 * Z, 3.5 * Z);
  head(v, x + dir * 1.4 * Z, y - 20.5 * Z, dir, s, Z, 0);
}

/** Where a siren is flying in or off: out over the sea and high up, to her rock. */
function flight(s: Siren): { x: number; y: number; z: number; k: number } {
  const ox = s.seat.x - ISLE2.x;
  const oy = s.seat.y - ISLE2.y;
  const od = Math.hypot(ox, oy) || 1;
  const k = s.state === 'come' ? clamp(s.t / 2.4, 0, 1) : 1 - clamp(s.t / 2, 0, 1);
  const e = k * k * (3 - 2 * k);
  const far = (1 - e) * 260;
  return {
    x: s.seat.x + (ox / od) * far,
    y: s.seat.y + (oy / od) * far,
    z: s.seat.h + 14 + (1 - e) * 170,
    k,
  };
}

/** In flight: the wings beating, the hair streaming back. */
function drawFlying(v: DrawView, s: Siren): void {
  const { ctx, T } = v;
  const L = s.look;
  const Z = v.zoom * SIZE;
  const f = flight(s);
  const x = v.px(f.x, f.y);
  const y = v.py(f.x, f.y, f.z);
  const dir = s.state === 'come' ? s.face : -s.face;
  const beat = Math.sin(T * 9 + s.ph);
  ctx.fillStyle = L.feather;
  for (const side of [-1, 1]) {
    ctx.globalAlpha = side < 0 ? 0.85 : 1;
    ctx.beginPath();
    ctx.moveTo(x - dir * 2 * Z, y - 1 * Z);
    ctx.quadraticCurveTo(
      x - dir * 5 * Z,
      y - (8 + 8 * beat) * Z,
      x - dir * (9 + side * 2) * Z,
      y - (4 + 12 * beat) * Z,
    );
    ctx.lineTo(x + dir * 2 * Z, y - 1 * Z);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, 7 * Z, 3.6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - dir * 6 * Z, y);
  ctx.lineTo(x - dir * 13 * Z, y - 2 * Z);
  ctx.lineTo(x - dir * 13 * Z, y + 2.5 * Z);
  ctx.closePath();
  ctx.fill();
  head(v, x + dir * 8 * Z, y - 2.5 * Z, dir, s, Z, 3);
}

/** A note of their song on its way to the boat, dark violet, fading as it nears. */
function drawNote(v: DrawView, n: SirenNote): void {
  const { ctx } = v;
  const k = clamp(n.t / DRIFT_T, 0, 1);
  const Z = v.zoom;
  const wx = n.x + (n.tx - n.x) * k;
  const wy = n.y + (n.ty - n.y) * k;
  const x = v.px(wx, wy) + Math.sin(n.t * 5 + n.note) * 5 * Z;
  const y = v.py(wx, wy, n.z + (30 - n.z) * k);
  ctx.globalAlpha = k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9;
  ctx.fillStyle = NOTE;
  ctx.strokeStyle = NOTE;
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  ctx.ellipse(x, y, 2.8 * Z, 2 * Z, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 2.5 * Z, y - 0.6 * Z);
  ctx.lineTo(x + 2.5 * Z, y - 9.5 * Z);
  ctx.lineTo(x + 6 * Z, y - 7.5 * Z);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** The entity's own layers: in the air, flying and notes; at night, their eyes. */
export function drawSirens(v: DrawView, layer: Layer, sirens: Sirens): void {
  if (layer === 'air') {
    for (const s of sirens.list) if (s.state === 'come' || s.state === 'go') drawFlying(v, s);
    for (const n of sirens.notes) drawNote(v, n);
  } else if (layer === 'mask') {
    for (const s of sirens.perched) v.light(s.seat.x, s.seat.y, s.seat.h + 30, 60, 0.6);
  } else if (layer === 'glow' && v.dark > 0.3) {
    v.ctx.globalCompositeOperation = 'screen';
    for (const s of sirens.perched)
      v.glow(s.seat.x, s.seat.y, s.seat.h + 34, 14, rgba(EYE, 0.55 * v.dark));
    v.ctx.globalCompositeOperation = 'source-over';
  }
}
