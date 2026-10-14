/**
 * Drawing island 10 (world/isle10.ts): its shallows following the shore, a ring of sand, and inside it three parts.
 * The prairie is long golden grass speckled with wildflowers, the pond in it blue and still with lily pads and reeds
 * round its edge. The forest across the far side is dark green floor under oaks and pines. The swamp on the right is
 * olive mud with pools of black water, reeds, and cypresses with grey moss hanging off them. The pier comes in from
 * home with crates and a barrel at its root, where the catch goes.
 */

import type { DrawView } from '../entities/entity';
import {
  BEACH_W10,
  border,
  CRATES10,
  CYPRESS10,
  FOREST_A,
  ISLE10,
  MEADOW_R,
  OAKS10,
  PIER10,
  PIER10_Z,
  POND,
  POOLS10,
  PRAIRIE_A,
  padsOf,
  ROCKS10,
  regionAt,
  SWAMP_A,
  shoreR10,
  TOWER10,
  TREES10,
} from '../world/isle10';
import type { Solid } from './layers';
import { drawTower10 } from './pelican';

const N = 80;
const PRAIRIE = '#B5C46A';
const PRAIRIE_DEEP = '#A6B85E';
const FOREST = '#4C7A43';
const SWAMP = '#6C7148';
const SWAMP_WATER = '#2F4038';
const POND_WATER = '#4F9FC0';

/** Its outline, pushed out (or in) by off, as a path on the canvas. */
function outline(v: DrawView, off: number): void {
  const { ctx, px, py } = v;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = shoreR10(a) + off;
    const x = ISLE10.x + Math.cos(a) * r;
    const y = ISLE10.y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px(x, y), py(x, y));
    else ctx.lineTo(px(x, y), py(x, y));
  }
  ctx.closePath();
}

/** Its shallows, following the shore. */
export function drawIsle10Sea(v: DrawView): void {
  const { ctx } = v;
  if (!v.onScreen(ISLE10.x, ISLE10.y, (ISLE10.r + 420) * v.zoom)) return;
  outline(v, 300);
  ctx.fillStyle = '#1D7480';
  ctx.fill();
  outline(v, 150);
  ctx.fillStyle = '#35A0A6';
  ctx.fill();
  outline(v, 55);
  ctx.fillStyle = '#7DD2C8';
  ctx.fill();
}

/** One part of the island, between two wandering borders, out to the sand. */
function sector(v: DrawView, a0: number, k0: number, a1: number, k1: number): void {
  const { ctx, px, py } = v;
  const at = (a: number, d: number): [number, number] => {
    const x = ISLE10.x + Math.cos(a) * d;
    const y = ISLE10.y + Math.sin(a) * d;
    return [px(x, y), py(x, y)];
  };
  const edge = (a: number) => shoreR10(a) - BEACH_W10 + 2;
  ctx.beginPath();
  let first = true;
  const to = (p: [number, number]) => {
    if (first) ctx.moveTo(p[0], p[1]);
    else ctx.lineTo(p[0], p[1]);
    first = false;
  };
  // Out along the first border, round the shore, and back in along the second; then round the meadow's edge.
  for (let d = MEADOW_R; d < ISLE10.r + 60; d += 14) {
    const a = border(a0, d, k0);
    if (d > edge(a)) break;
    to(at(a, d));
  }
  const s0 = border(a0, edge(a0), k0);
  const s1 = border(a1, edge(a1), k1);
  for (let i = 0; i <= 40; i++) {
    const a = s0 + ((s1 - s0) * i) / 40;
    to(at(a, edge(a)));
  }
  const back: [number, number][] = [];
  for (let d = MEADOW_R; d < ISLE10.r + 60; d += 14) {
    const a = border(a1, d, k1);
    if (d > edge(a)) break;
    back.push(at(a, d));
  }
  for (let i = back.length - 1; i >= 0; i--) to(back[i] as [number, number]);
  const m0 = border(a1, MEADOW_R, k1);
  const m1 = border(a0, MEADOW_R, k0);
  for (let i = 0; i <= 12; i++) to(at(m0 + ((m1 - m0) * i) / 12, MEADOW_R));
  ctx.closePath();
}

/** A seeded scatter of small things over the land, by part. */
function speckle(seed: number, n: number): { x: number; y: number; k: number }[] {
  const out: { x: number; y: number; k: number }[] = [];
  let s = seed;
  const R = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2;
    const d = Math.sqrt(R()) * (shoreR10(a) - BEACH_W10 - 6);
    out.push({ x: ISLE10.x + Math.cos(a) * d, y: ISLE10.y + Math.sin(a) * d, k: R() });
  }
  return out;
}
const SPECKS = speckle(77, 520);

/** Its sand, the three parts, the water, and the little things on the ground. */
export function drawIsle10Flat(v: DrawView): void {
  const { ctx, T, px, py } = v;
  const Z = v.zoom;
  if (!v.onScreen(ISLE10.x, ISLE10.y, (ISLE10.r + 120) * Z)) return;
  outline(v, 8 + Math.sin(T * 1.3) * 3);
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 4 * Z;
  ctx.stroke();
  outline(v, 0);
  ctx.fillStyle = '#EED9A4';
  ctx.fill();
  outline(v, -BEACH_W10);
  ctx.fillStyle = PRAIRIE;
  ctx.fill();
  outline(v, -BEACH_W10 - 140);
  ctx.fillStyle = PRAIRIE_DEEP;
  ctx.fill();
  sector(v, FOREST_A, 0.3, SWAMP_A, 1.7);
  ctx.fillStyle = FOREST;
  ctx.fill();
  sector(v, SWAMP_A, 1.7, PRAIRIE_A, 2.9);
  ctx.fillStyle = SWAMP;
  ctx.fill();
  // The swamp's pools: black water with a muddy rim, and a lily pad or two.
  for (const p of POOLS10) {
    if (!v.onScreen(p.x, p.y, (p.r + 30) * Z)) continue;
    v.isoEllipse(p.x, p.y, p.r + 6);
    ctx.fillStyle = '#4F5434';
    ctx.fill();
    v.isoEllipse(p.x, p.y, p.r);
    ctx.fillStyle = SWAMP_WATER;
    ctx.fill();
    ctx.fillStyle = '#5C8A45';
    for (const [lx, ly] of padsOf(p)) {
      v.isoEllipse(lx, ly, 4.5);
      ctx.fill();
    }
  }
  // The pond: a reedy rim, blue water, a glint, lily pads with a flower on one.
  if (v.onScreen(POND.x, POND.y, (POND.r + 40) * Z)) {
    v.isoEllipse(POND.x, POND.y, POND.r + 7);
    ctx.fillStyle = '#7E9A4E';
    ctx.fill();
    v.isoEllipse(POND.x, POND.y, POND.r);
    ctx.fillStyle = POND_WATER;
    ctx.fill();
    v.isoEllipse(POND.x - 14, POND.y - 18, POND.r * 0.45);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1 + 0.4;
      const d = POND.r * (0.35 + (i % 3) * 0.2);
      const lx = POND.x + Math.cos(a) * d;
      const ly = POND.y + Math.sin(a) * d + Math.sin(T * 0.6 + i) * 1.2;
      ctx.fillStyle = '#4E9A4A';
      v.isoEllipse(lx, ly, 6);
      ctx.fill();
      if (i % 3 === 0) {
        ctx.fillStyle = '#F7B6CF';
        ctx.beginPath();
        ctx.arc(px(lx, ly), py(lx, ly, 1.5), 2 * Z, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Grass tufts and wildflowers on the prairie, ferns and leaves in the forest, reeds in the swamp and round the pond.
  for (const s of SPECKS) {
    if (!v.onScreen(s.x, s.y, 20 * Z)) continue;
    const r = regionAt(s.x, s.y);
    const sx = px(s.x, s.y);
    const sy = py(s.x, s.y);
    if (r === 'pond') continue;
    if (r === 'prairie') {
      if (s.k < 0.3) {
        ctx.fillStyle = ['#F2C230', '#FFFFFF', '#C98BE0', '#E4572E'][
          Math.floor(s.k * 13) % 4
        ] as string;
        ctx.beginPath();
        ctx.arc(sx, sy - 2 * Z, 1.6 * Z, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = s.k < 0.6 ? '#8FA24E' : '#C9C27A';
      ctx.lineWidth = 1 * Z;
      ctx.beginPath();
      ctx.moveTo(sx - 2 * Z, sy);
      ctx.lineTo(sx - 3 * Z, sy - 6 * Z);
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.sin(T + s.k * 6) * 1.2 * Z, sy - 8 * Z);
      ctx.moveTo(sx + 2 * Z, sy);
      ctx.lineTo(sx + 3 * Z, sy - 5 * Z);
      ctx.stroke();
    } else if (r === 'forest') {
      ctx.fillStyle = s.k < 0.5 ? '#3E6838' : '#6B8B3C';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 3 * Z, 1.5 * Z, s.k, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = s.k < 0.5 ? '#7A8A44' : '#5A6A34';
      ctx.lineWidth = 1.1 * Z;
      ctx.beginPath();
      for (const o of [-2, 0, 2]) {
        ctx.moveTo(sx + o * Z, sy);
        ctx.lineTo(sx + o * 1.4 * Z, sy - (8 + s.k * 5) * Z);
      }
      ctx.stroke();
    }
  }
}

/** A round-topped oak: a short trunk under three clumps of leaves. */
function drawOak(v: DrawView, x: number, y: number, i: number, big = 1): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const h = (34 + (i % 4) * 4) * big;
  ctx.strokeStyle = '#6B4A2A';
  ctx.lineWidth = 4 * Z * big;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, 0));
  ctx.lineTo(px(x, y), py(x, y, h * 0.6));
  ctx.stroke();
  const cx = px(x, y);
  const cy = py(x, y, h);
  const greens = ['#3F7D3A', '#4F9244', '#5FA350'];
  const r = 13 * Z * big;
  [
    [-0.55, 0.2],
    [0.55, 0.2],
    [0, -0.35],
  ].forEach(([ox, oy], k) => {
    ctx.fillStyle = greens[(k + i) % 3] as string;
    ctx.beginPath();
    ctx.arc(cx + (ox as number) * r, cy + (oy as number) * r, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** A pine: a thin trunk under three stacked tiers. */
function drawPine(v: DrawView, x: number, y: number, i: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const h = 52 + (i % 3) * 6;
  ctx.strokeStyle = '#5E3F22';
  ctx.lineWidth = 3 * Z;
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, 0));
  ctx.lineTo(px(x, y), py(x, y, 10));
  ctx.stroke();
  const sx = px(x, y);
  for (let k = 0; k < 3; k++) {
    const base = py(x, y, 8 + k * 14);
    const top = py(x, y, 8 + k * 14 + 22);
    const w = (14 - k * 3.5) * Z;
    ctx.fillStyle = k % 2 ? '#2F6B3E' : '#285E36';
    ctx.beginPath();
    ctx.moveTo(sx - w, base);
    ctx.lineTo(sx, k === 2 ? py(x, y, h) : top);
    ctx.lineTo(sx + w, base);
    ctx.closePath();
    ctx.fill();
  }
}

/** A cypress: a flared foot, a tall narrow crown, and grey moss hanging in strands. */
function drawCypress(v: DrawView, x: number, y: number, i: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  ctx.fillStyle = '#5A4632';
  ctx.beginPath();
  ctx.moveTo(sx - 7 * Z, py(x, y, 0));
  ctx.quadraticCurveTo(sx - 2 * Z, py(x, y, 6), sx - 2 * Z, py(x, y, 40));
  ctx.lineTo(sx + 2 * Z, py(x, y, 40));
  ctx.quadraticCurveTo(sx + 2 * Z, py(x, y, 6), sx + 7 * Z, py(x, y, 0));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = i % 2 ? '#4A6B3A' : '#557A40';
  ctx.beginPath();
  ctx.ellipse(sx, py(x, y, 50), 11 * Z, 16 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(170,180,150,.85)';
  ctx.lineWidth = 1.2 * Z;
  for (let k = 0; k < 5; k++) {
    const mx = sx + (k - 2) * 4.5 * Z;
    const top = py(x, y, 42 - Math.abs(k - 2) * 2);
    const sway = Math.sin(T * 0.9 + k + i) * 1.2 * Z;
    ctx.beginPath();
    ctx.moveTo(mx, top);
    ctx.quadraticCurveTo(mx + sway, top + 6 * Z, mx + sway * 1.5, top + (10 + (k % 2) * 5) * Z);
    ctx.stroke();
  }
}

/** The pier: planks on posts, out from the beach toward home. */
function drawPier10(v: DrawView): void {
  const { x0, y0, x1, y1 } = PIER10;
  for (let y = y0 + 20; y < y1; y += 34) v.box(x0 - 1, y, 3, 3, -6, PIER10_Z, '#5E3D1C', '#7A5230');
  v.box(x0, y0, x1 - x0, y1 - y0, PIER10_Z - 2, PIER10_Z, '#8A6A43', '#B48A5A');
}

/** Crates and a barrel at the pier's root. */
function drawCrates10(v: DrawView): void {
  const { x, y } = CRATES10;
  v.box(x - 10, y - 8, 16, 16, 0, 14, '#B97F45', '#DDAA66');
  v.box(x - 4, y - 2, 12, 12, 14, 24, '#C98B4E', '#E6B877');
  v.isoEllipse(x + 14, y + 10, 6, 0);
  v.ctx.fillStyle = '#7A5230';
  v.ctx.fill();
  v.box(x + 9, y + 5, 10, 10, 0, 13, '#7A5230', '#9A6A3E');
}

/** What stands on island 10, for the game's depth-sorted solids. */
/** flag10, once the pelican is beaten: the player's flag on top of the tower, drawn at a point. */
export function isle10Solids(
  v: DrawView,
  flag10: ((x: number, y: number) => void) | null = null,
): Solid[] {
  if (!v.onScreen(ISLE10.x, ISLE10.y, (ISLE10.r + 260) * v.zoom)) return [];
  const out: Solid[] = [];
  const on = (x: number, y: number) => v.onScreen(x, y, 90 * v.zoom);
  TREES10.forEach(([x, y], i) => {
    if (on(x, y))
      out.push({ d: x + y, f: () => (i % 3 === 1 ? drawPine(v, x, y, i) : drawOak(v, x, y, i)) });
  });
  CYPRESS10.forEach(([x, y], i) => {
    if (on(x, y)) out.push({ d: x + y, f: () => drawCypress(v, x, y, i) });
  });
  OAKS10.forEach(([x, y], i) => {
    if (on(x, y)) out.push({ d: x + y, f: () => drawOak(v, x, y, i, 1.25) });
  });
  for (const [x, y] of ROCKS10)
    if (on(x, y))
      out.push({ d: x + y, f: () => v.box(x - 8, y - 6, 16, 12, 0, 9, '#9A9486', '#B4AE9F') });
  out.push({ d: TOWER10.x + TOWER10.y, f: () => drawTower10(v, flag10) });
  out.push({ d: PIER10.x0 + PIER10.y0, f: () => drawPier10(v) });
  out.push({ d: CRATES10.x + CRATES10.y + 10, f: () => drawCrates10(v) });
  return out;
}
