/**
 * Drawing island 3, the sunken island, from world/isle3.ts. Under the water:
 * the drowned island's shelf, its old streets and houses (some with their
 * roofs still on, some fallen in, some only walls), coral, and the light
 * playing over all of it. On the water: the seaweed round the tower's foot and
 * the rafts' planks on their barrels. Standing up, sorted with the other
 * solids: the tower, the shacks and the lamps. At night the lamps are lit and
 * something purple glows at the top of the tower.
 */
import { rgba, shade } from '../core/color';
import { rng } from '../core/math';
import { GROUPER, SPECIES } from '../data/tuning';
import type { DrawView } from '../entities/entity';
import type { Point } from '../world/island';
import {
  type Box,
  DIVE3,
  ISLE3,
  JETTY,
  LAMPS,
  MAT,
  MAT_Z,
  PLANK_Z,
  RAFTS,
  RUINS,
  type Ruin,
  SHACKS,
  STREETS,
  TOWER3,
  WALKS,
} from '../world/isle3';
import type { Solid } from './layers';

const D = Math.SQRT1_2;

/** Through the water: the drowned land, the walls and the roofs, all washed toward the sea's colour. */
const SHELF = '#57AFA2';
const OLD_SHORE = '#79C3AF';
const WALL = '#4F8F87';
const WALL_TOP = '#6CA99F';
const ROOF = '#76705F';
const CORAL = ['#E38FA0', '#E9A35C', '#9C7CC9', '#F0C76A'] as const;

/** Coral clumps on the old shore and in the streets, placed once. */
const CORALS: readonly { x: number; y: number; c: number; n: number }[] = (() => {
  const r = rng(73);
  const out: { x: number; y: number; c: number; n: number }[] = [];
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = MAT.r + 40 + r() * (ISLE3.r - MAT.r - 30);
    out.push({
      x: ISLE3.x + Math.cos(a) * d,
      y: ISLE3.y + Math.sin(a) * d,
      c: Math.floor(r() * CORAL.length),
      n: 3 + Math.floor(r() * 4),
    });
  }
  return out;
})();

function corners(h: Ruin): Point[] {
  const c = Math.cos(h.a);
  const s = Math.sin(h.a);
  return (
    [
      [-h.w / 2, -h.d / 2],
      [h.w / 2, -h.d / 2],
      [h.w / 2, h.d / 2],
      [-h.w / 2, h.d / 2],
    ] as const
  ).map(([u, w]) => [h.x + u * c - w * s, h.y + u * s + w * c] as Point);
}

/** Fill a polygon of world points, each at its own height. */
function poly(
  v: DrawView,
  pts: readonly (readonly [number, number, number])[],
  fill: string,
): void {
  const { ctx, px, py } = v;
  ctx.fillStyle = fill;
  ctx.beginPath();
  pts.forEach(([x, y, z], i) => {
    if (i) ctx.lineTo(px(x, y), py(x, y, z));
    else ctx.moveTo(px(x, y), py(x, y, z));
  });
  ctx.closePath();
  ctx.fill();
}

/** One drowned house: walls only, walls with the roof still on, or walls with the roof fallen in. */
function drawRuin(v: DrawView, h: Ruin): void {
  const c = corners(h);
  const walls = c.map((p, i) => {
    const q = c[(i + 1) % 4] as Point;
    // Outward from the middle of the house through the middle of this wall; the wall is three thick, inward.
    const mx = (p[0] + q[0]) / 2 - h.x;
    const my = (p[1] + q[1]) / 2 - h.y;
    const ml = Math.hypot(mx, my) || 1;
    const ox = (mx / ml) * 3;
    const oy = (my / ml) * 3;
    const pts: Point[] = [p, q, [q[0] - ox, q[1] - oy], [p[0] - ox, p[1] - oy]];
    // One wall of a roofless house has crumbled to half its height.
    const tall = h.roof === 0 && i === 2 ? h.h * 0.5 : h.h;
    return { pts, front: mx + my > 0, tall };
  });
  if (h.roof === 1) {
    v.extrude(c, 0, h.h, WALL, WALL_TOP);
    const [c0, c1, c2, c3] = c as [Point, Point, Point, Point];
    const ml: Point = [(c0[0] + c3[0]) / 2, (c0[1] + c3[1]) / 2];
    const mr: Point = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];
    const top = h.h + h.d * 0.42;
    const faces: { d: number; pts: [number, number, number][]; f: string }[] = [
      {
        d: c0[0] + c0[1] + c1[0] + c1[1],
        pts: [
          [...c0, h.h],
          [...c1, h.h],
          [...mr, top],
          [...ml, top],
        ],
        f: ROOF,
      },
      {
        d: c3[0] + c3[1] + c2[0] + c2[1],
        pts: [
          [...c3, h.h],
          [...c2, h.h],
          [...mr, top],
          [...ml, top],
        ],
        f: shade(ROOF, 1.12),
      },
      {
        d: c0[0] + c0[1] + c3[0] + c3[1],
        pts: [
          [...c0, h.h],
          [...c3, h.h],
          [...ml, top],
        ],
        f: shade(ROOF, 0.85),
      },
      {
        d: c1[0] + c1[1] + c2[0] + c2[1],
        pts: [
          [...c1, h.h],
          [...c2, h.h],
          [...mr, top],
        ],
        f: shade(ROOF, 0.85),
      },
    ];
    faces.sort((a, b) => a.d - b.d);
    for (const f of faces) poly(v, f.pts, f.f);
    return;
  }
  for (const w of walls) if (!w.front) v.extrude(w.pts, 0, w.tall, WALL, WALL_TOP);
  if (h.roof === 2) {
    // The roof slid in: one edge still on a wall top, the other on the floor.
    const [c0, c1, c2, c3] = c as [Point, Point, Point, Point];
    poly(
      v,
      [
        [...c0, h.h],
        [...c1, h.h],
        [c2[0] * 0.85 + c1[0] * 0.15, c2[1] * 0.85 + c1[1] * 0.15, 0],
        [c3[0] * 0.85 + c0[0] * 0.15, c3[1] * 0.85 + c0[1] * 0.15, 0],
      ],
      shade(ROOF, 0.95),
    );
  }
  for (const w of walls) if (w.front) v.extrude(w.pts, 0, w.tall, WALL, WALL_TOP);
}

/** The drowned island under the water: shelf, old shore, streets, houses, coral, and light on it all. */
export function drawIsle3Sea(v: DrawView): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  if (!v.onScreen(ISLE3.x, ISLE3.y, (ISLE3.r + 360) * Z)) return;
  const { x, y, r } = ISLE3;
  v.isoEllipse(x, y, r + 320);
  ctx.fillStyle = '#20808B';
  ctx.fill();
  v.isoEllipse(x, y, r + 130);
  ctx.fillStyle = '#3B9EA0';
  ctx.fill();
  v.isoEllipse(x, y, r);
  ctx.fillStyle = SHELF;
  ctx.fill();
  // The old shore, a paler ring where the beach was.
  v.isoEllipse(x, y, r - 6);
  ctx.strokeStyle = OLD_SHORE;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 10 * Z;
  ctx.stroke();
  // The streets, out from the tower's foot to the old shore.
  ctx.lineCap = 'round';
  ctx.lineWidth = 13 * Z;
  ctx.strokeStyle = OLD_SHORE;
  ctx.globalAlpha = 0.5;
  for (const a of STREETS) {
    ctx.beginPath();
    ctx.moveTo(
      px(x + Math.cos(a) * 40, y + Math.sin(a) * 40),
      py(x + Math.cos(a) * 40, y + Math.sin(a) * 40),
    );
    ctx.lineTo(
      px(x + Math.cos(a) * (r - 20), y + Math.sin(a) * (r - 20)),
      py(x + Math.cos(a) * (r - 20), y + Math.sin(a) * (r - 20)),
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Coral, then the houses, the far ones first.
  for (const k of CORALS) {
    ctx.fillStyle = CORAL[k.c] ?? CORAL[0];
    for (let i = 0; i < k.n; i++) {
      const ox = Math.cos(i * 2.4 + k.c) * (3 + i * 1.6);
      const oy = Math.sin(i * 2.4 + k.c) * (3 + i * 1.6);
      ctx.beginPath();
      ctx.arc(px(k.x + ox, k.y + oy), py(k.x + ox, k.y + oy), (2.2 + (i % 3)) * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const houses = [...RUINS].sort((a, b) => a.x + a.y - (b.x + b.y));
  for (const h of houses) if (v.onScreen(h.x, h.y, 80 * Z)) drawRuin(v, h);
  // The water over all of it, so it reads as under the sea rather than on it.
  v.isoEllipse(x, y, r + 4);
  ctx.fillStyle = 'rgba(52,150,160,.32)';
  ctx.fill();
  // Light through the waves, playing on the sea floor.
  ctx.save();
  v.isoEllipse(x, y, r);
  ctx.clip();
  ctx.strokeStyle = 'rgba(230,255,250,.16)';
  ctx.lineWidth = 2.2 * Z;
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const wx = x - r + (i + 0.5) * ((2 * r) / 9) + Math.sin(T * 0.7 + j * 1.3) * 14;
      const wy = y - r + (j + 0.5) * ((2 * r) / 9) + Math.cos(T * 0.6 + i * 1.7) * 14;
      const sx = px(wx, wy);
      const sy = py(wx, wy);
      const k = 9 * Z * (0.8 + 0.3 * Math.sin(T * 1.1 + i + j * 2));
      ctx.beginPath();
      ctx.moveTo(sx - k, sy);
      ctx.quadraticCurveTo(sx, sy - k * 0.55, sx + k, sy);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** The seaweed's ragged rim at an angle, breathing a little with the swell. */
function matRadius(a: number, T: number): number {
  return (
    MAT.r *
    (1 +
      0.07 * Math.sin(3 * a + 1.3) +
      0.045 * Math.sin(7 * a + 0.4) +
      0.012 * Math.sin(T * 1.4 + a * 2))
  );
}

const PLANK = '#A9875C';
const PLANK_SIDE = '#6B4A2C';
const BARREL = '#4A3A2A';

function deck(v: DrawView, b: Box): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  // Barrels peeking out under the edges that face the viewer.
  ctx.fillStyle = BARREL;
  for (let t = 8; t < b.x1 - b.x0 - 4; t += 16) {
    v.isoEllipse(b.x0 + t, b.y1 + 1, 5, 0);
    ctx.fill();
  }
  for (let t = 8; t < b.y1 - b.y0 - 4; t += 16) {
    v.isoEllipse(b.x1 + 1, b.y0 + t, 5, 0);
    ctx.fill();
  }
  v.extrude(
    [
      [b.x0, b.y0],
      [b.x1, b.y0],
      [b.x1, b.y1],
      [b.x0, b.y1],
    ],
    0,
    PLANK_Z,
    PLANK_SIDE,
    PLANK,
  );
  // The gaps between the planks, across the longer way.
  ctx.strokeStyle = 'rgba(70,46,26,.45)';
  ctx.lineWidth = 1 * Z;
  ctx.beginPath();
  if (b.x1 - b.x0 >= b.y1 - b.y0) {
    for (let t = b.x0 + 7; t < b.x1; t += 7) {
      ctx.moveTo(px(t, b.y0), py(t, b.y0, PLANK_Z));
      ctx.lineTo(px(t, b.y1), py(t, b.y1, PLANK_Z));
    }
  } else {
    for (let t = b.y0 + 7; t < b.y1; t += 7) {
      ctx.moveTo(px(b.x0, t), py(b.x0, t, PLANK_Z));
      ctx.lineTo(px(b.x1, t), py(b.x1, t, PLANK_Z));
    }
  }
  ctx.stroke();
}

/** On the water: the seaweed round the tower and the rafts' planks. Drawn with the islands' flat parts. */
export function drawIsle3Flat(v: DrawView): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  if (!v.onScreen(ISLE3.x + 120, ISLE3.y + 120, (ISLE3.r + 120) * Z)) return;
  // The seaweed: a ragged raft of it, foam at its rim, darker strands and yellow floats.
  const rim = (k: number) => {
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const rr = matRadius(a, T) + k;
      const wx = MAT.x + Math.cos(a) * rr;
      const wy = MAT.y + Math.sin(a) * rr;
      if (i) ctx.lineTo(px(wx, wy), py(wx, wy, MAT_Z));
      else ctx.moveTo(px(wx, wy), py(wx, wy, MAT_Z));
    }
    ctx.closePath();
  };
  rim(6 + Math.sin(T * 1.3) * 2);
  ctx.strokeStyle = v.foam;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 3 * Z;
  ctx.stroke();
  ctx.globalAlpha = 1;
  rim(0);
  ctx.fillStyle = '#6E7A2E';
  ctx.fill();
  rim(-14);
  ctx.fillStyle = '#7C8935';
  ctx.fill();
  const r = rng(79);
  ctx.lineCap = 'round';
  ctx.lineWidth = 2 * Z;
  ctx.strokeStyle = '#4F5B1E';
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2;
    const d = TOWER3.r + 6 + r() * (MAT.r - TOWER3.r - 12);
    const wx = MAT.x + Math.cos(a) * d;
    const wy = MAT.y + Math.sin(a) * d;
    const sx = px(wx, wy);
    const sy = py(wx, wy, MAT_Z);
    const k = (5 + r() * 6) * Z;
    const q = r() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(sx - Math.cos(q) * k, sy - Math.sin(q) * k * 0.5);
    ctx.quadraticCurveTo(
      sx + Math.sin(q) * k * 0.4,
      sy,
      sx + Math.cos(q) * k,
      sy + Math.sin(q) * k * 0.5,
    );
    ctx.stroke();
  }
  ctx.fillStyle = '#C2AE4A';
  for (let i = 0; i < 30; i++) {
    const a = r() * Math.PI * 2;
    const d = TOWER3.r + 8 + r() * (MAT.r - TOWER3.r - 14);
    v.isoEllipse(MAT.x + Math.cos(a) * d, MAT.y + Math.sin(a) * d, 1.8 + r() * 1.2, MAT_Z);
    ctx.fill();
  }
  // The gap round the side, deep water showing through, rippling.
  v.isoEllipse(DIVE3.x, DIVE3.y, 13, MAT_Z);
  ctx.fillStyle = '#1D5B66';
  ctx.fill();
  v.isoEllipse(DIVE3.x, DIVE3.y, 9 + Math.sin(T * 2) * 2, MAT_Z);
  ctx.strokeStyle = 'rgba(200,240,240,.35)';
  ctx.lineWidth = 1.5 * Z;
  ctx.stroke();
  // The planks: walks and the jetty first, so the rafts they lap onto cover their ends.
  for (const b of [...WALKS, JETTY]) deck(v, b);
  // The jetty's posts, standing a little proud of its deck.
  for (let t = JETTY.x0 + 20; t <= JETTY.x1; t += 26) {
    for (const yy of [JETTY.y0, JETTY.y1])
      v.box(t - 2, yy - 2, 4, 4, 0, PLANK_Z + 5, PLANK_SIDE, '#8A6A43');
  }
  for (const b of [...RAFTS].sort((a, b2) => a.x1 + a.y1 - (b2.x1 + b2.y1))) deck(v, b);
}

/** A quad on a face square to the world: along x at a fixed y, or along y at a fixed x. */
function faceY(
  v: DrawView,
  x0: number,
  x1: number,
  y: number,
  z0: number,
  z1: number,
  c: string,
): void {
  poly(
    v,
    [
      [x0, y, z0],
      [x1, y, z0],
      [x1, y, z1],
      [x0, y, z1],
    ],
    c,
  );
}

function drawShack(v: DrawView, s: (typeof SHACKS)[number], i: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const z0 = PLANK_Z;
  const z1 = z0 + 22;
  v.box(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0, z0, z1, s.wall, s.wall);
  // A door on the face toward the planks in front, and a window beside it.
  const mid = (s.x0 + s.x1) / 2;
  faceY(v, mid - 8, mid + 1, s.y1, z0, z0 + 13, '#5A3E26');
  faceY(v, mid + 5, mid + 11, s.y1, z0 + 6, z0 + 12, v.dark > 0.3 ? '#FFD98A' : '#2E3B40');
  if (i === 1) {
    // The trader's: a grouper painted on a board over the door, under the eaves.
    faceY(v, mid - 11, mid + 11, s.y1, z0 + 14, z0 + 20, '#F1E3C0');
    const S = SPECIES[GROUPER];
    if (S) {
      ctx.fillStyle = S.c;
      v.fishShape(px(mid, s.y1), py(mid, s.y1, z0 + 17), 5.5 * Z, S, Math.PI, 0);
    }
  }
  // A tin roof, a little wider than the walls, with its ridges.
  v.box(
    s.x0 - 3,
    s.y0 - 3,
    s.x1 - s.x0 + 6,
    s.y1 - s.y0 + 6,
    z1,
    z1 + 4,
    shade(s.roof, 0.8),
    s.roof,
  );
  ctx.strokeStyle = shade(s.roof, 0.7);
  ctx.lineWidth = 1 * Z;
  ctx.beginPath();
  for (let t = s.x0; t <= s.x1 + 1; t += 5) {
    ctx.moveTo(px(t, s.y0 - 3), py(t, s.y0 - 3, z1 + 4));
    ctx.lineTo(px(t, s.y1 + 3), py(t, s.y1 + 3, z1 + 4));
  }
  ctx.stroke();
  if (i === 0) {
    // The net loft: a net hung to dry on its front wall, and a stovepipe smoking.
    ctx.strokeStyle = 'rgba(240,235,220,.6)';
    ctx.beginPath();
    for (let t = 0; t <= 4; t++) {
      const xx = s.x0 + 3 + t * 3;
      ctx.moveTo(px(xx, s.y1), py(xx, s.y1, z0 + 4));
      ctx.lineTo(px(xx + 6, s.y1), py(xx + 6, s.y1, z0 + 18));
      ctx.moveTo(px(xx + 6, s.y1), py(xx + 6, s.y1, z0 + 4));
      ctx.lineTo(px(xx, s.y1), py(xx, s.y1, z0 + 18));
    }
    ctx.stroke();
    v.box(s.x0 + 6, s.y0 + 6, 5, 5, z1 + 4, z1 + 14, '#3A2E28', '#3A2E28');
    for (let k = 0; k < 3; k++) {
      const t = (T * 0.35 + k / 3) % 1;
      ctx.fillStyle = `rgba(230,230,230,${(1 - t) * 0.32})`;
      ctx.beginPath();
      ctx.arc(
        px(s.x0 + 8.5, s.y0 + 8.5),
        py(s.x0 + 8.5, s.y0 + 8.5, z1 + 14 + t * 30),
        (3 + t * 6) * Z,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
}

function drawLamp(v: DrawView, p: Point): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  ctx.strokeStyle = '#5E3D1C';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(px(p[0], p[1]), py(p[0], p[1], PLANK_Z));
  ctx.lineTo(px(p[0], p[1]), py(p[0], p[1], PLANK_Z + 26));
  ctx.stroke();
  v.box(p[0] - 2.5, p[1] - 2.5, 5, 5, PLANK_Z + 24, PLANK_Z + 31, '#3A2E28', '#3A2E28');
  ctx.fillStyle = v.dark > 0.2 ? '#FFD98A' : '#C9B78A';
  ctx.beginPath();
  ctx.arc(px(p[0], p[1]), py(p[0], p[1], PLANK_Z + 27.5), 2 * Z, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The tower: round, of pale sea-worn stone, stained dark and crusted with
 * barnacles where the sea has been, with weed hanging off it, a door onto the
 * seaweed, slit windows, a ring of windows near the top and battlements.
 */
function drawTower3(v: DrawView, flagAt: FlagAt | null): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const { x, y, r, h } = TOWER3;
  const pts: Point[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  const STAIN = 30;
  v.extrude(pts, 0, STAIN, '#5A6340', '#5A6340');
  v.extrude(pts, STAIN, h, '#B9AF95', '#D2C9B1');
  // The face toward the viewer, and its tangent.
  const c = r * Math.cos(Math.PI / 12);
  const fx = x + c * D;
  const fy = y + c * D;
  const quad = (w: number, z0: number, z1: number, col: string, off = 0) =>
    poly(
      v,
      [
        [fx - D * (w - off), fy + D * (w - off), z0],
        [fx + D * (w + off), fy - D * (w + off), z0],
        [fx + D * (w + off), fy - D * (w + off), z1],
        [fx - D * (w - off), fy + D * (w - off), z1],
      ],
      col,
    );
  quad(10, MAT_Z, 32, '#8E8670');
  quad(7, MAT_Z, 28, '#2A2420');
  for (const z of [76, 122]) quad(2, z, z + 12, '#2B2F31');
  // Lit purple at night until it is taken.
  const lit = v.dark > 0.3 && !flagAt;
  for (const off of [-12, 0, 12]) quad(2.5, h - 32, h - 18, lit ? '#B98AFF' : '#2B2F31', off);
  // Barnacles and hanging weed along the stained band, on the faces the viewer sees.
  const r2 = rng(83);
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 4 + (r2() - 0.5) * Math.PI * 1.1 + Math.PI / 2;
    const z = 3 + r2() * (STAIN - 6);
    const wx = x + Math.cos(a) * (r + 0.5);
    const wy = y + Math.sin(a) * (r + 0.5);
    ctx.fillStyle = 'rgba(238,236,222,.8)';
    ctx.beginPath();
    ctx.arc(px(wx, wy), py(wx, wy, z), (0.9 + r2() * 0.9) * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#3F4A22';
  ctx.lineWidth = 2 * Z;
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const a = Math.PI / 4 + (i - 4) * 0.2;
    const wx = x + Math.cos(a) * (r + 0.5);
    const wy = y + Math.sin(a) * (r + 0.5);
    if (Math.abs(a - Math.PI / 4) < 0.15) continue; // not over the door
    const top = STAIN + 4 + ((i * 7) % 9);
    const sx = px(wx, wy);
    ctx.beginPath();
    ctx.moveTo(sx, py(wx, wy, top));
    ctx.quadraticCurveTo(
      sx + Math.sin(T * 1.6 + i) * 2 * Z,
      py(wx, wy, top - 10),
      sx,
      py(wx, wy, MAT_Z + 2),
    );
    ctx.stroke();
  }
  // Battlements on every other side, the far ones first.
  const tops = pts.filter((_, i) => i % 2 === 0).sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const p of tops) v.box(p[0] - 4, p[1] - 4, 8, 8, h, h + 10, '#B9AF95', '#D8D0BA');
  // A pole, waiting for a flag until the tower is taken.
  ctx.strokeStyle = '#7A5A33';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, h));
  ctx.lineTo(px(x, y), py(x, y, h + 40));
  ctx.stroke();
  flagAt?.(px(x, y), py(x, y, h + 40));
}

/** Draws your flag with its top at the pole's top, at these screen coordinates. */
export type FlagAt = (sx: number, sy: number) => void;

/** The washing line between the net loft and the trader's, with the town's washing on it. */
function drawWashing(v: DrawView): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const a = SHACKS[0];
  const b = SHACKS[1];
  if (!a || !b) return;
  const z = PLANK_Z + 24;
  const ax = a.x1;
  const ay = a.y1;
  const bx = b.x0;
  const by = b.y1;
  ctx.strokeStyle = 'rgba(60,50,40,.7)';
  ctx.lineWidth = 1 * Z;
  ctx.beginPath();
  ctx.moveTo(px(ax, ay), py(ax, ay, z));
  ctx.quadraticCurveTo(
    px((ax + bx) / 2, (ay + by) / 2),
    py((ax + bx) / 2, (ay + by) / 2, z - 8),
    px(bx, by),
    py(bx, by, z),
  );
  ctx.stroke();
  const cloth = ['#E86F5A', '#F2E8D0', '#6FA8DC', '#F5C23D'];
  for (let i = 0; i < 4; i++) {
    const t = (i + 1) / 5;
    const wx = ax + (bx - ax) * t;
    const wy = ay + (by - ay) * t;
    const sag = z - 8 * 4 * t * (1 - t);
    const sx = px(wx, wy);
    const sy = py(wx, wy, sag);
    const sw = Math.sin(T * 2 + i) * 1.2 * Z;
    ctx.fillStyle = cloth[i] ?? '#F2E8D0';
    ctx.beginPath();
    ctx.moveTo(sx - 3.5 * Z, sy);
    ctx.lineTo(sx + 3.5 * Z, sy);
    ctx.lineTo(sx + 3.5 * Z + sw, sy + 8 * Z);
    ctx.lineTo(sx - 3.5 * Z + sw, sy + 8 * Z);
    ctx.closePath();
    ctx.fill();
  }
}

/** What stands up on island 3, for the game's depth-sorted solids; flagAt once its tower is taken. */
export function isle3Solids(v: DrawView, flagAt: FlagAt | null = null): Solid[] {
  if (!v.onScreen(ISLE3.x + 120, ISLE3.y + 120, (ISLE3.r + 260) * v.zoom)) return [];
  const out: Solid[] = [{ d: TOWER3.x + TOWER3.y, f: () => drawTower3(v, flagAt) }];
  SHACKS.forEach((s, i) => {
    out.push({ d: s.x1 + s.y1, f: () => drawShack(v, s, i) });
  });
  for (const p of LAMPS) out.push({ d: p[0] + p[1], f: () => drawLamp(v, p) });
  const b = SHACKS[1];
  if (b) out.push({ d: b.x0 + b.y1 + 1, f: () => drawWashing(v) });
  return out;
}

/** The lamps and the trader's window, punched into the night. */
export function isle3Lights(v: DrawView): void {
  if (v.dark < 0.02 || !v.onScreen(ISLE3.x + 120, ISLE3.y + 120, (ISLE3.r + 300) * v.zoom)) return;
  for (const p of LAMPS) v.light(p[0], p[1], PLANK_Z + 28, 120, 0.9);
  v.light(TOWER3.x, TOWER3.y, TOWER3.h - 25, 90, 0.5);
}

/** Something purple at the top of the tower, at night. */
export function isle3Glow(v: DrawView): void {
  if (v.dark < 0.05 || !v.onScreen(TOWER3.x, TOWER3.y, 300)) return;
  const { ctx, T } = v;
  ctx.globalCompositeOperation = 'screen';
  v.glow(
    TOWER3.x,
    TOWER3.y,
    TOWER3.h - 25,
    70,
    rgba('#B98AFF', 0.45 * v.dark * (0.8 + 0.2 * Math.sin(T * 2))),
  );
  ctx.globalCompositeOperation = 'source-over';
}
