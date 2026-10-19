/**
 * The tar island (world/tarisle.ts), out on the tar: black rock with a glossy wet rim where the tar laps it, a hill in
 * its middle in bands up to the top, a path of paler stones from the jetty up to the tower's door, dead black trees and
 * boulders; the jetty on posts out over the tar; and on the hilltop the sorcerer's old tower, round and of grey stone,
 * as it is from its roof in mission 1, with battlements, slit windows glowing faintly purple and a dark door.
 */

import type { DrawView } from '../entities/entity';
import {
  HILL_H,
  HILL_R,
  JETTY,
  shoreR,
  TAR_ISLE,
  TAR_ROCKS,
  TAR_TOWER,
  TAR_TREES,
  TOWER_DOOR,
  tarIsleZ,
} from '../world/tarisle';

const ROCK = '#2E2723';
const RIM = '#463B33';
const BANDS = ['#342C27', '#3A312B', '#40362F', '#463B34'] as const;
const PATH = '#5A4E44';

/** The island's rock, its hill, the path and the jetty: under everything that stands on it. */
export function drawTarIsleGround(v: DrawView): void {
  const { ctx, px, py, T, zoom: Z } = v;
  if (!v.onScreen(TAR_ISLE.x, TAR_ISLE.y, (TAR_ISLE.r + 160) * Z)) return;
  const shore = (grow: number) => {
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const r = shoreR(a) + grow;
      const x = TAR_ISLE.x + Math.cos(a) * r;
      const y = TAR_ISLE.y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px(x, y), py(x, y, 0));
      else ctx.lineTo(px(x, y), py(x, y, 0));
    }
    ctx.closePath();
  };
  // The wet rim where the tar laps it, shining as it moves.
  ctx.strokeStyle = `rgba(160,130,190,${0.3 + 0.12 * Math.sin(T * 1.3)})`;
  ctx.lineWidth = 3 * Z;
  shore(6);
  ctx.stroke();
  ctx.fillStyle = RIM;
  shore(0);
  ctx.fill();
  ctx.fillStyle = ROCK;
  shore(-14);
  ctx.fill();
  // The hill, in bands up to its top.
  BANDS.forEach((c, i) => {
    const r = HILL_R * (1 - i / BANDS.length) * 0.95;
    ctx.fillStyle = c;
    v.isoEllipse(TAR_ISLE.x, TAR_ISLE.y, r, tarIsleZ(TAR_ISLE.x + r, TAR_ISLE.y));
    ctx.fill();
  });
  // The path of paler stones, from the jetty up to the tower's door.
  ctx.fillStyle = PATH;
  const x0 = JETTY.x;
  const y0 = JETTY.y0 + 10;
  for (let k = 0; k <= 22; k++) {
    const t = k / 22;
    const x = x0 + (TOWER_DOOR.x - x0) * t + Math.sin(t * Math.PI * 2) * 30;
    const y = y0 + (TOWER_DOOR.y - y0) * t;
    v.isoEllipse(x, y, 7 + (k % 3), tarIsleZ(x, y));
    ctx.fill();
  }
  // The jetty, on posts out over the tar.
  for (let y = JETTY.y0 + 20; y < JETTY.y1; y += 30)
    for (const dx of [-JETTY.half + 2, JETTY.half - 4])
      v.box(JETTY.x + dx, y, 3, 3, -6, 4, '#3A2414', '#5A3A22');
  v.box(
    JETTY.x - JETTY.half,
    JETTY.y0,
    JETTY.half * 2,
    JETTY.y1 - JETTY.y0,
    2,
    5,
    '#6A4426',
    '#8A5E36',
  );
  ctx.strokeStyle = 'rgba(40,24,12,.5)';
  ctx.lineWidth = 1 * Z;
  for (let y = JETTY.y0 + 8; y < JETTY.y1; y += 8) {
    ctx.beginPath();
    ctx.moveTo(px(JETTY.x - JETTY.half, y), py(JETTY.x - JETTY.half, y, 5));
    ctx.lineTo(px(JETTY.x + JETTY.half, y), py(JETTY.x + JETTY.half, y, 5));
    ctx.stroke();
  }
}

/** The tower, the dead trees and the boulders, for the sorted solids. */
export function tarIsleSolids(v: DrawView): { d: number; f: () => void }[] {
  const out: { d: number; f: () => void }[] = [];
  if (!v.onScreen(TAR_ISLE.x, TAR_ISLE.y, (TAR_ISLE.r + 260) * v.zoom)) return out;
  out.push({ d: TAR_TOWER.x + TAR_TOWER.y + TAR_TOWER.r * 0.7, f: () => drawTarTower(v) });
  for (const t of TAR_TREES) out.push({ d: t.x + t.y, f: () => drawDeadTree(v, t.x, t.y, t.s) });
  for (const r of TAR_ROCKS) out.push({ d: r.x + r.y, f: () => drawBoulder(v, r.x, r.y, r.r) });
  return out;
}

/** The sorcerer's old tower on the hilltop. */
function drawTarTower(v: DrawView): void {
  const { ctx, px, py, T, zoom: Z } = v;
  const t = TAR_TOWER;
  const z0 = HILL_H - 2;
  const z1 = z0 + t.h;
  const pts: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pts.push([t.x + Math.cos(a) * t.r, t.y + Math.sin(a) * t.r]);
  }
  v.extrude(pts, z0, z1, '#4A4640', '#5E5A52');
  // Courses of stone round its front.
  ctx.strokeStyle = 'rgba(20,18,16,.3)';
  ctx.lineWidth = 1 * Z;
  for (let z = z0 + 22; z < z1; z += 22) {
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = -Math.PI / 4 + (i / 12) * Math.PI;
      const x = t.x + Math.cos(a) * t.r;
      const y = t.y + Math.sin(a) * t.r;
      if (i === 0) ctx.moveTo(px(x, y), py(x, y, z));
      else ctx.lineTo(px(x, y), py(x, y, z));
    }
    ctx.stroke();
  }
  // Battlements round its top.
  for (let i = 0; i < 12; i++) {
    if (i % 2) continue;
    const a = (i / 12) * Math.PI * 2;
    const x = t.x + Math.cos(a) * (t.r - 5);
    const y = t.y + Math.sin(a) * (t.r - 5);
    v.box(x - 5, y - 5, 10, 10, z1, z1 + 12, '#4A4640', '#66625A');
  }
  // The door at its foot and slit windows up its front, a faint purple light in them.
  const fx = t.x + t.r * Math.SQRT1_2;
  const fy = t.y + t.r * Math.SQRT1_2;
  const sx = px(fx, fy);
  ctx.fillStyle = '#1C1714';
  ctx.beginPath();
  ctx.moveTo(sx - 8 * Z, py(fx, fy, z0));
  ctx.lineTo(sx - 8 * Z, py(fx, fy, z0 + 20));
  ctx.quadraticCurveTo(sx, py(fx, fy, z0 + 30), sx + 8 * Z, py(fx, fy, z0 + 20));
  ctx.lineTo(sx + 8 * Z, py(fx, fy, z0));
  ctx.closePath();
  ctx.fill();
  const glow = 0.45 + 0.2 * Math.sin(T * 1.7);
  ctx.fillStyle = `rgba(181,124,255,${glow})`;
  for (const z of [70, 115, 160])
    ctx.fillRect(sx - 1.6 * Z, py(fx, fy, z0 + z + 12), 3.2 * Z, 12 * Z);
}

/** A dead tree: a black trunk, bare branches reaching up. */
function drawDeadTree(v: DrawView, x: number, y: number, s: number): void {
  const { ctx, px, py, zoom: Z } = v;
  const z0 = tarIsleZ(x, y);
  const sx = px(x, y);
  const sy = py(x, y, z0);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  v.isoEllipse(x, y, 12 * s, z0);
  ctx.fill();
  ctx.strokeStyle = '#17110E';
  ctx.lineCap = 'round';
  const h = 46 * s * Z;
  ctx.lineWidth = 4.5 * s * Z;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + 2 * Z, sy - h);
  ctx.stroke();
  ctx.lineWidth = 2.2 * s * Z;
  for (const [k, dx, dy] of [
    [0.55, -14, -14],
    [0.7, 13, -12],
    [0.85, -9, -12],
    [0.95, 8, -10],
  ] as const) {
    const bx = sx + 2 * Z * k;
    const by = sy - h * k;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + dx * s * Z, by + dy * s * Z);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

/** A boulder of the black rock, a dull shine on top. */
function drawBoulder(v: DrawView, x: number, y: number, r: number): void {
  const { ctx, px, py, zoom: Z } = v;
  const z0 = tarIsleZ(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  v.isoEllipse(x, y, r + 4, z0);
  ctx.fill();
  const sx = px(x, y);
  const sy = py(x, y, z0);
  ctx.fillStyle = '#26201C';
  ctx.beginPath();
  ctx.ellipse(sx, sy - r * 0.5 * Z, r * Z, r * 0.75 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,130,120,.25)';
  ctx.beginPath();
  ctx.ellipse(
    sx - r * 0.3 * Z,
    sy - r * 0.85 * Z,
    r * 0.45 * Z,
    r * 0.22 * Z,
    -0.3,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}
