/**
 * Drawing Tomb Island (world/tombisle.ts): its dark shallows and grey beach, the jetty, the moss and the paving, and
 * the maze, every stretch of its stone walls with tombs set into the face toward the viewer (arched niches with a
 * skull looking out, sealed slabs with a cross, shelves of bones), its posts, the taller gate posts with skulls on
 * top either side of the way in and the way out, graves along its corridors, stone coffins in its dead ends, the rows
 * of tombstones round the castle, and the castle itself, dark, its door shut and green light in its windows. And the
 * fog bank it lies in, thinning round whoever is looking.
 */

import type { DrawView } from '../entities/entity';
import {
  CASTLE16,
  CASTLE16_BOX,
  COFFINS16,
  type Coffin16,
  FOG16,
  fromTomb,
  GATE_H,
  GATE_POSTS16,
  GRAVES16,
  type Grave16,
  JETTY16,
  JETTY16_Z,
  LEVER16,
  lineU,
  MERCHANT16,
  MID,
  PLAZA,
  POST_H,
  POSTS16,
  type Post16,
  STONES16,
  type Stone16,
  shoreR16,
  TOMB_ISLE,
  WALL_H,
  WALLS16,
  WAY_IN16,
  WAY_OUT16,
  type Wall16,
} from '../world/tombisle';
import type { Solid } from './layers';

const near = (v: DrawView, m: number) => v.onScreen(TOMB_ISLE.x, TOMB_ISLE.y, m * v.zoom);

const STONE = '#7D786F';
const STONE_TOP = '#9E998E';
const BONE = '#E8E1CF';
const MOSS = '#56664A';

/** Shade a hex colour by k (below 1 darker), as hex. */
function shade(hex: string, k: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0')}`;
}

/** A polygon on the canvas from world corners at their heights. */
function poly(v: DrawView, pts: readonly [number, number, number][], fill: string): void {
  const { ctx } = v;
  ctx.beginPath();
  pts.forEach(([x, y, z], i) => {
    if (i === 0) ctx.moveTo(v.px(x, y), v.py(x, y, z));
    else ctx.lineTo(v.px(x, y), v.py(x, y, z));
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** The island's outline at a height, in from its waterline by `inset`. */
function outline(v: DrawView, inset: number, wobble = 0): void {
  const { ctx } = v;
  ctx.beginPath();
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r = shoreR16(a) - inset + wobble * Math.sin(a * 7 + v.T * 1.3);
    const [x, y] = fromTomb(Math.cos(a) * r, Math.sin(a) * r);
    if (i === 0) ctx.moveTo(v.px(x, y), v.py(x, y));
    else ctx.lineTo(v.px(x, y), v.py(x, y));
  }
  ctx.closePath();
}

/** Its shallows, dark and cold, in rings round it. */
export function drawTombSea(v: DrawView): void {
  if (!near(v, TOMB_ISLE.r + 340)) return;
  const { ctx } = v;
  v.isoEllipse(TOMB_ISLE.x, TOMB_ISLE.y, TOMB_ISLE.r + 300);
  ctx.fillStyle = '#1D5E66';
  ctx.fill();
  v.isoEllipse(TOMB_ISLE.x, TOMB_ISLE.y, TOMB_ISLE.r + 140);
  ctx.fillStyle = '#2F7378';
  ctx.fill();
  v.isoEllipse(TOMB_ISLE.x, TOMB_ISLE.y, TOMB_ISLE.r + 40);
  ctx.fillStyle = '#5F7F7A';
  ctx.fill();
}

/** A flat square in the island's frame, on the ground. */
function square(
  v: DrawView,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  fill: string,
  z = 0,
): void {
  poly(
    v,
    [
      [...fromTomb(u0, v0), z],
      [...fromTomb(u1, v0), z],
      [...fromTomb(u1, v1), z],
      [...fromTomb(u0, v1), z],
    ],
    fill,
  );
}

/**
 * The flat of it: foam, the grey beach, the mossy ground inside the maze, the path from the jetty up to the way in,
 * the square's paving, the grave mounds, and the jetty on its posts.
 */
export function drawTombFlat(v: DrawView, foam: string): void {
  if (!near(v, TOMB_ISLE.r + 200)) return;
  const { ctx } = v;
  const Z = v.zoom;
  outline(v, -6, 3);
  ctx.strokeStyle = foam;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 4 * Z;
  ctx.stroke();
  ctx.globalAlpha = 1;
  outline(v, 0);
  ctx.fillStyle = '#A59E8C';
  ctx.fill();
  outline(v, 34);
  ctx.fillStyle = '#6E7360';
  ctx.fill();
  // Inside the outer wall: dark moss, and the square's flagstones round the castle.
  const p0 = lineU(MID - PLAZA);
  const p1 = lineU(MID + PLAZA + 1);
  square(v, p0, p0, p1, p1, '#77736A');
  ctx.strokeStyle = 'rgba(40,36,32,.28)';
  ctx.lineWidth = Math.max(0.5, 0.8 * Z);
  ctx.beginPath();
  for (let s = p0 + 20; s < p1; s += 20) {
    const [ax, ay] = fromTomb(s, p0);
    const [bx, by] = fromTomb(s, p1);
    const [cx, cy] = fromTomb(p0, s);
    const [dx, dy] = fromTomb(p1, s);
    ctx.moveTo(v.px(ax, ay), v.py(ax, ay));
    ctx.lineTo(v.px(bx, by), v.py(bx, by));
    ctx.moveTo(v.px(cx, cy), v.py(cx, cy));
    ctx.lineTo(v.px(dx, dy), v.py(dx, dy));
  }
  ctx.stroke();
  // The path up from the jetty to the way in, and from the way out down to the far beach.
  square(v, -14, WAY_IN16.v, 14, JETTY16.v0 + 6, '#8C8573');
  square(v, -14, WAY_OUT16.v - 40, 14, WAY_OUT16.v, '#8C8573');
  // The grave mounds, low and dark, before anything stands on them.
  for (const g of GRAVES16) {
    if (!v.onScreen(g.x, g.y, 30 * Z)) continue;
    const hu = g.along === 'y' ? 7 : 13;
    const hv = g.along === 'y' ? 13 : 7;
    ctx.beginPath();
    ctx.ellipse(
      v.px(g.x, g.y),
      v.py(g.x, g.y),
      (hu + hv) * 0.62 * Z,
      (hu + hv) * 0.3 * Z,
      g.along === 'y' ? -0.46 : 0.46,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = '#4F4A3E';
    ctx.fill();
  }
  drawJetty(v);
}

/** The jetty: weathered grey planks on posts, from the beach out to where the boat ties up. */
function drawJetty(v: DrawView): void {
  const [ax, ay] = fromTomb(0, JETTY16.v0);
  const [bx, by] = fromTomb(0, JETTY16.v1);
  if (!v.onScreen(ax, ay, 220 * v.zoom) && !v.onScreen(bx, by, 220 * v.zoom)) return;
  const { ctx } = v;
  const h = JETTY16.half;
  for (let s = JETTY16.v0 + 30; s <= JETTY16.v1; s += 30)
    for (const u of [-h + 2, h - 2]) {
      const [x, y] = fromTomb(u, s);
      v.box(x - 2, y - 2, 4, 4, -6, JETTY16_Z, '#4B4038', '#5E5148');
    }
  for (let s = JETTY16.v0; s < JETTY16.v1; s += 6) {
    const c =
      Math.floor(s / 6) % 3 === 0 ? '#8A7E6E' : Math.floor(s / 6) % 3 === 1 ? '#958A79' : '#837765';
    poly(
      v,
      [
        [...fromTomb(-h, s), JETTY16_Z],
        [...fromTomb(h, s), JETTY16_Z],
        [...fromTomb(h, s + 5.4), JETTY16_Z],
        [...fromTomb(-h, s + 5.4), JETTY16_Z],
      ],
      c,
    );
  }
  // A lantern post at the end, its light the colour of the fog.
  const [lx, ly] = fromTomb(h - 2, JETTY16.v1 - 4);
  v.box(lx - 1.5, ly - 1.5, 3, 3, JETTY16_Z, JETTY16_Z + 22, '#3A322C', '#3A322C');
  ctx.fillStyle = v.dark > 0.3 ? '#D8F2C8' : '#BFD9B6';
  ctx.beginPath();
  ctx.arc(v.px(lx, ly), v.py(lx, ly, JETTY16_Z + 24), 2.6 * v.zoom, 0, Math.PI * 2);
  ctx.fill();
}

/** A point on a wall's face toward the viewer, s along it (0..1) and z up. */
function facePoint(w: Wall16, s: number, z: number): [number, number, number] {
  return w.along === 'x'
    ? [w.x0 + (w.x1 - w.x0) * s, w.y1, z]
    : [w.x1, w.y0 + (w.y1 - w.y0) * s, z];
}
/** Screen point on a wall's face. */
function faceXY(v: DrawView, w: Wall16, s: number, z: number): [number, number] {
  const [x, y, zz] = facePoint(w, s, z);
  return [v.px(x, y), v.py(x, y, zz)];
}

/** A skull, in screen space, this big, looking at the viewer. */
function skull(v: DrawView, sx: number, sy: number, k: number): void {
  const { ctx } = v;
  const Z = v.zoom * k;
  ctx.fillStyle = BONE;
  ctx.beginPath();
  ctx.arc(sx, sy - 1.2 * Z, 2.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(sx - 1.5 * Z, sy, 3 * Z, 2 * Z);
  ctx.fillStyle = '#211D1A';
  ctx.beginPath();
  ctx.arc(sx - 1 * Z, sy - 1.2 * Z, 0.7 * Z, 0, Math.PI * 2);
  ctx.arc(sx + 1 * Z, sy - 1.2 * Z, 0.7 * Z, 0, Math.PI * 2);
  ctx.fill();
}

/** An arched niche in a wall's face, from s0 to s1 along it, its sill and its top. */
function niche(v: DrawView, w: Wall16, s0: number, s1: number, z0: number, z1: number): void {
  const { ctx } = v;
  const pts: [number, number][] = [faceXY(v, w, s0, z0), faceXY(v, w, s0, z1 - 3)];
  for (let t = 1; t < 8; t++) {
    const a = Math.PI - (t / 8) * Math.PI;
    const s = (s0 + s1) / 2 + Math.cos(a) * ((s1 - s0) / 2);
    pts.push(faceXY(v, w, s, z1 - 3 + Math.sin(a) * 3));
  }
  pts.push(faceXY(v, w, s1, z1 - 3), faceXY(v, w, s1, z0));
  ctx.beginPath();
  for (const [i, [x, y]] of pts.entries()) {
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#221E1B';
  ctx.fill();
}

/** A stretch of wall: stone, its courses, and the tomb on its face toward the viewer. */
function drawWall(v: DrawView, w: Wall16): void {
  const { ctx } = v;
  const Z = v.zoom;
  v.box(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0, 0, WALL_H, STONE, STONE_TOP);
  // The courses of stone along its face.
  ctx.strokeStyle = 'rgba(30,27,24,.3)';
  ctx.lineWidth = Math.max(0.5, 0.7 * Z);
  ctx.beginPath();
  for (const z of [6, 12]) {
    const [ax, ay] = faceXY(v, w, 0, z);
    const [bx, by] = faceXY(v, w, 1, z);
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.stroke();
  switch (w.look) {
    case 0:
    case 1: {
      // A tomb niche, a skull looking out of it.
      niche(v, w, 0.32, 0.68, 3, 15);
      const [sx, sy] = faceXY(v, w, 0.5, 6.5);
      skull(v, sx, sy, 1);
      break;
    }
    case 2: {
      // A sealed tomb: a pale slab, a cross cut in it.
      const s = [0.26, 0.74];
      poly(
        v,
        [
          facePoint(w, s[0] as number, 2),
          facePoint(w, s[1] as number, 2),
          facePoint(w, s[1] as number, 15),
          facePoint(w, s[0] as number, 15),
        ],
        '#B3AD9F',
      );
      const [cx, cy] = faceXY(v, w, 0.5, 8.5);
      ctx.strokeStyle = '#5B564D';
      ctx.lineWidth = 1.2 * Z;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4.5 * Z);
      ctx.lineTo(cx, cy + 4.5 * Z);
      const [lx, ly] = faceXY(v, w, 0.42, 10.5);
      const [rx, ry] = faceXY(v, w, 0.58, 10.5);
      ctx.moveTo(lx, ly);
      ctx.lineTo(rx, ry);
      ctx.stroke();
      break;
    }
    case 3: {
      // Two little niches, a shelf of bones in each.
      niche(v, w, 0.14, 0.42, 4, 13);
      niche(v, w, 0.58, 0.86, 4, 13);
      for (const s of [0.28, 0.72]) {
        const [sx, sy] = faceXY(v, w, s, 5.5);
        ctx.strokeStyle = BONE;
        ctx.lineWidth = 1.3 * Z;
        ctx.beginPath();
        ctx.moveTo(sx - 3 * Z, sy);
        ctx.lineTo(sx + 3 * Z, sy - 1 * Z);
        ctx.moveTo(sx - 2.5 * Z, sy - 1.6 * Z);
        ctx.lineTo(sx + 2.5 * Z, sy + 0.4 * Z);
        ctx.stroke();
        skull(v, sx, sy - 3.4 * Z, 0.65);
      }
      break;
    }
    case 4: {
      // A row of three burial slots, two sealed and one broken open, dark inside.
      for (let t = 0; t < 3; t++) {
        const s0 = 0.12 + t * 0.27;
        poly(
          v,
          [
            facePoint(w, s0, 9),
            facePoint(w, s0 + 0.22, 9),
            facePoint(w, s0 + 0.22, 14),
            facePoint(w, s0, 14),
          ],
          t === 1 ? '#221E1B' : '#A9A395',
        );
        poly(
          v,
          [
            facePoint(w, s0, 2.5),
            facePoint(w, s0 + 0.22, 2.5),
            facePoint(w, s0 + 0.22, 7.5),
            facePoint(w, s0, 7.5),
          ],
          t === 2 ? '#221E1B' : '#A9A395',
        );
      }
      break;
    }
    default: {
      // Plain old stone, moss creeping up from the foot.
      poly(
        v,
        [
          facePoint(w, 0, 0),
          facePoint(w, 1, 0),
          facePoint(w, 0.8, 4),
          facePoint(w, 0.45, 2.5),
          facePoint(w, 0.2, 5),
        ],
        MOSS,
      );
    }
  }
}

/** A stone post at a corner, capped; the gate posts taller, a skull on top. */
function drawPost(v: DrawView, p: Post16, gate: boolean): void {
  const h = gate ? GATE_H : POST_H;
  v.box(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0, 0, h - 2, STONE, STONE_TOP);
  v.box(
    p.x0 - 1,
    p.y0 - 1,
    p.x1 - p.x0 + 2,
    p.y1 - p.y0 + 2,
    h - 2,
    h,
    shade(STONE_TOP, 0.92),
    '#B2AC9F',
  );
  if (gate) {
    const cx = (p.x0 + p.x1) / 2;
    const cy = (p.y0 + p.y1) / 2;
    skull(v, v.px(cx, cy), v.py(cx, cy, h + 3), 1.5);
  }
}

/** A tombstone in screen space, leaning: round-topped, a cross, or a square slab. */
function drawStone(
  v: DrawView,
  s: Stone16 | { x: number; y: number; lean: number; kind: number },
): void {
  const { ctx } = v;
  const Z = v.zoom;
  v.isoEllipse(s.x + 2, s.y + 2, 5.5);
  ctx.fillStyle = 'rgba(30,28,24,.35)';
  ctx.fill();
  ctx.save();
  ctx.translate(v.px(s.x, s.y), v.py(s.x, s.y));
  ctx.rotate(s.lean);
  const w = 8 * Z;
  const h = 11 * Z;
  const face = '#9A9A92';
  const side = '#6E6E68';
  if (s.kind === 1) {
    ctx.fillStyle = side;
    ctx.fillRect(-1.2 * Z, -h - 1 * Z, 3.4 * Z, h + 1 * Z);
    ctx.fillRect(-w / 2 + 1 * Z, -h * 0.72, w + 0.4 * Z, 3 * Z);
    ctx.fillStyle = face;
    ctx.fillRect(-1.8 * Z, -h - 1 * Z, 3.2 * Z, h + 1 * Z);
    ctx.fillRect(-w / 2, -h * 0.72 - 0.2 * Z, w, 2.8 * Z);
  } else {
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 1.6 * Z, 0);
    if (s.kind === 0) {
      ctx.lineTo(-w / 2 + 1.6 * Z, -h + w / 2);
      ctx.arc(1.6 * Z, -h + w / 2 - 1 * Z, w / 2, Math.PI, 0);
    } else {
      ctx.lineTo(-w / 2 + 1.6 * Z, -h * 0.85 - 1 * Z);
      ctx.lineTo(w / 2 + 1.6 * Z, -h * 0.85 - 1 * Z);
    }
    ctx.lineTo(w / 2 + 1.6 * Z, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    if (s.kind === 0) {
      ctx.lineTo(-w / 2, -h + w / 2);
      ctx.arc(0, -h + w / 2, w / 2, Math.PI, 0);
    } else {
      ctx.lineTo(-w / 2, -h * 0.85);
      ctx.lineTo(w / 2, -h * 0.85);
    }
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5E5E58';
    ctx.font = `800 ${2.4 * Z}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RIP', 0, -h * 0.55);
  }
  ctx.restore();
}

/** A stone coffin, its heavy lid shut, a cross along the lid. */
function drawCoffin(v: DrawView, c: Coffin16): void {
  const { ctx } = v;
  const Z = v.zoom;
  v.box(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0, 0, 7, '#857F74', '#9C9689');
  v.box(c.x0 - 1, c.y0 - 1, c.x1 - c.x0 + 2, c.y1 - c.y0 + 2, 7, 10, '#938D80', '#ADA799');
  const mx = (c.x0 + c.x1) / 2;
  const my = (c.y0 + c.y1) / 2;
  const L = c.along === 'x' ? (c.x1 - c.x0) / 2 - 3 : (c.y1 - c.y0) / 2 - 3;
  const at = (a: number, b: number): [number, number] =>
    c.along === 'x'
      ? [v.px(mx + a, my + b), v.py(mx + a, my + b, 10)]
      : [v.px(mx + b, my + a), v.py(mx + b, my + a, 10)];
  ctx.strokeStyle = '#6A655B';
  ctx.lineWidth = 1.2 * Z;
  ctx.beginPath();
  const [a0, a1] = at(-L, 0);
  const [b0, b1] = at(L, 0);
  ctx.moveTo(a0, a1);
  ctx.lineTo(b0, b1);
  const [c0, c1] = at(-L * 0.4, -4);
  const [d0, d1] = at(-L * 0.4, 4);
  ctx.moveTo(c0, c1);
  ctx.lineTo(d0, d1);
  ctx.stroke();
}

/** A headstone at the head of a grave, against the wall. */
function drawGraveStone(v: DrawView, g: Grave16, i: number): void {
  drawStone(v, { x: g.hx, y: g.hy, lean: g.lean, kind: i % 3 === 1 ? 1 : 0 });
}

/** A square pyramid roof on a tower, its two faces toward the viewer. */
function roof(
  v: DrawView,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z: number,
  h: number,
): void {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  poly(
    v,
    [
      [x1 + 2, y0 - 2, z],
      [x1 + 2, y1 + 2, z],
      [cx, cy, z + h],
    ],
    '#3B2F45',
  );
  poly(
    v,
    [
      [x0 - 2, y1 + 2, z],
      [x1 + 2, y1 + 2, z],
      [cx, cy, z + h],
    ],
    '#4C3D59',
  );
}

/** The castle in the middle: dark stone, a tower at each corner with a pointed roof, battlements, its door shut. */
function drawCastle(v: DrawView): void {
  const { ctx } = v;
  const Z = v.zoom;
  const b = CASTLE16_BOX;
  const { h, tower: t, towerH } = CASTLE16;
  const wall = '#57525C';
  const top = '#6E6874';
  v.box(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, 0, h, wall, top);
  // Green light in its windows, two up each face toward the viewer.
  const glow = v.dark > 0.3 ? '#9CFF8A' : '#7FD36E';
  for (const s of [0.3, 0.7]) {
    poly(
      v,
      [
        [b.x0 + (b.x1 - b.x0) * s - 3, b.y1, 34],
        [b.x0 + (b.x1 - b.x0) * s + 3, b.y1, 34],
        [b.x0 + (b.x1 - b.x0) * s + 3, b.y1, 44],
        [b.x0 + (b.x1 - b.x0) * s - 3, b.y1, 44],
      ],
      glow,
    );
    poly(
      v,
      [
        [b.x1, b.y0 + (b.y1 - b.y0) * s - 3, 34],
        [b.x1, b.y0 + (b.y1 - b.y0) * s + 3, 34],
        [b.x1, b.y0 + (b.y1 - b.y0) * s + 3, 44],
        [b.x1, b.y0 + (b.y1 - b.y0) * s - 3, 44],
      ],
      glow,
    );
  }
  // The great door, shut: dark wood in an arch, banded with iron, a skull over it.
  const mx = (b.x0 + b.x1) / 2;
  const dw = 11;
  const pts: [number, number, number][] = [
    [mx - dw, b.y1, 0],
    [mx - dw, b.y1, 18],
  ];
  for (let i = 1; i < 8; i++) {
    const a = Math.PI - (i / 8) * Math.PI;
    pts.push([mx + Math.cos(a) * dw, b.y1, 18 + Math.sin(a) * 8]);
  }
  pts.push([mx + dw, b.y1, 18], [mx + dw, b.y1, 0]);
  poly(v, pts, '#3A2A20');
  ctx.strokeStyle = '#25201D';
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  for (const z of [6, 15]) {
    ctx.moveTo(v.px(mx - dw, b.y1), v.py(mx - dw, b.y1, z));
    ctx.lineTo(v.px(mx + dw, b.y1), v.py(mx + dw, b.y1, z));
  }
  ctx.moveTo(v.px(mx, b.y1), v.py(mx, b.y1, 0));
  ctx.lineTo(v.px(mx, b.y1), v.py(mx, b.y1, 26));
  ctx.stroke();
  skull(v, v.px(mx, b.y1), v.py(mx, b.y1, 31), 1.4);
  // Up top: the battlements and the towers, back to front.
  const parts: { d: number; f: () => void }[] = [];
  const merlon = (x: number, y: number) =>
    parts.push({ d: x + y, f: () => v.box(x - 3, y - 3, 6, 6, h, h + 6, wall, top) });
  for (let s = b.x0 + t * 2 + 4; s < b.x1 - t * 2; s += 12) {
    merlon(s, b.y0 + 3);
    merlon(s, b.y1 - 3);
  }
  for (let s = b.y0 + t * 2 + 4; s < b.y1 - t * 2; s += 12) {
    merlon(b.x0 + 3, s);
    merlon(b.x1 - 3, s);
  }
  for (const [cx, cy] of [
    [b.x0 + t, b.y0 + t],
    [b.x1 - t, b.y0 + t],
    [b.x0 + t, b.y1 - t],
    [b.x1 - t, b.y1 - t],
  ] as [number, number][])
    parts.push({
      d: cx + cy,
      f: () => {
        v.box(cx - t, cy - t, t * 2, t * 2, h, towerH, wall, top);
        poly(
          v,
          [
            [cx + t, cy - 2, towerH - 16],
            [cx + t, cy + 2, towerH - 16],
            [cx + t, cy + 2, towerH - 8],
            [cx + t, cy - 2, towerH - 8],
          ],
          glow,
        );
        roof(v, cx - t, cy - t, cx + t, cy + t, towerH, 30);
      },
    });
  parts.sort((a, b2) => a.d - b2.d);
  for (const p of parts) p.f();
}

/** A wooden sign on a post, its words on it. */
function drawSign(v: DrawView, x: number, y: number, text: string): void {
  const { ctx } = v;
  const Z = v.zoom;
  v.box(x - 1.2, y - 1.2, 2.4, 2.4, 0, 16, '#4A3D33', '#5A4A3E');
  const sx = v.px(x, y);
  const sy = v.py(x, y, 18);
  ctx.font = `800 ${7 * Z}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  const w = ctx.measureText(text).width + 6 * Z;
  ctx.fillStyle = '#5E4B3C';
  ctx.fillRect(sx - w / 2, sy - 6 * Z, w, 12 * Z);
  ctx.fillStyle = '#E9DCC4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, sx, sy);
}

/** Everything that stands on the island, each sorted by its own depth. */
export function tombSolids(v: DrawView): Solid[] {
  if (!near(v, TOMB_ISLE.r + 260)) return [];
  const out: Solid[] = [];
  const m = 60 * v.zoom;
  for (const w of WALLS16)
    if (v.onScreen((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, m))
      out.push({ d: w.d, f: () => drawWall(v, w) });
  for (const p of POSTS16) {
    if (!v.onScreen(p.x0, p.y0, m)) continue;
    const gate = GATE_POSTS16.includes(p);
    out.push({ d: p.d, f: () => drawPost(v, p, gate) });
  }
  for (const c of COFFINS16)
    if (v.onScreen(c.x0, c.y0, m)) out.push({ d: c.d, f: () => drawCoffin(v, c) });
  for (const s of STONES16)
    if (v.onScreen(s.x, s.y, m)) out.push({ d: s.x + s.y, f: () => drawStone(v, s) });
  GRAVES16.forEach((g, i) => {
    if (v.onScreen(g.hx, g.hy, m)) out.push({ d: g.hx + g.hy, f: () => drawGraveStone(v, g, i) });
  });
  if (v.onScreen(TOMB_ISLE.x, TOMB_ISLE.y, 200 * v.zoom))
    out.push({ d: CASTLE16_BOX.d, f: () => drawCastle(v) });
  // The signs at the way in and the way out, beside the gap, on the side away from the maze.
  const [ix, iy] = fromTomb(WAY_IN16.u + 38, WAY_IN16.v + 16);
  const [ox, oy] = fromTomb(WAY_OUT16.u + 38, WAY_OUT16.v - 16);
  out.push({ d: ix + iy, f: () => drawSign(v, ix, iy, 'Way in') });
  out.push({ d: ox + oy, f: () => drawSign(v, ox, oy, 'Way out') });
  return out;
}

/** One soft puff of fog, drawn once and stamped about. */
let puff: HTMLCanvasElement | null = null;
function fogPuff(): HTMLCanvasElement {
  if (puff) return puff;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(222,230,228,1)');
    r.addColorStop(0.55, 'rgba(214,223,221,.7)');
    r.addColorStop(1, 'rgba(210,220,218,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  }
  puff = c;
  return c;
}
/** Where the puffs sit, in the island's frame: a staggered grid over it and out to the fog bank's edge. */
const PUFFS: readonly { u: number; v: number; p: number }[] = (() => {
  const out: { u: number; v: number; p: number }[] = [];
  const R = TOMB_ISLE.r + FOG16;
  const g = 110;
  let n = 0;
  for (let j = -Math.ceil(R / g); j <= Math.ceil(R / g); j++)
    for (let i = -Math.ceil(R / g); i <= Math.ceil(R / g); i++) {
      const u = (i + (j % 2 ? 0.5 : 0)) * g;
      const v = j * g * 0.9;
      if (Math.hypot(u, v) < R) out.push({ u, v, p: (n++ * 2.39996) % (Math.PI * 2) });
    }
  return out;
})();

/**
 * The fog bank: soft grey-white drifts over the island and out round it, thickest in the middle, thinning to
 * nothing within `clear` of whoever is looking (at x, y). Over the island itself it is `isle` thick (1 until the
 * lever is pulled, then 0: a clearing in the bank). Drawn over everything near it.
 */
export function drawTombFog(v: DrawView, x: number, y: number, clear: number, isle = 1): void {
  const R = TOMB_ISLE.r + FOG16;
  if (!near(v, R + 200)) return;
  const { ctx } = v;
  const Z = v.zoom;
  const img = fogPuff();
  const size = 190 * Z;
  ctx.save();
  for (const q of PUFFS) {
    const wx = TOMB_ISLE.x + q.u + Math.sin(v.T * 0.13 + q.p) * 22;
    const wy = TOMB_ISLE.y + q.v + Math.cos(v.T * 0.11 + q.p * 1.3) * 22;
    const sx = v.px(wx, wy);
    const sy = v.py(wx, wy, 26);
    if (sx < -size || sy < -size || sx > ctx.canvas.width + size || sy > ctx.canvas.height + size)
      continue;
    const edge = Math.min(1, Math.max(0, (R - Math.hypot(q.u, q.v)) / (FOG16 * 0.7)));
    const seen = Math.min(
      1,
      Math.max(0, (Math.hypot(wx - x, wy - y) - clear * 0.45) / (clear * 0.55)),
    );
    // Over the island, the lever's doing: from its shore in, the fog is as thick as `isle` says.
    const d = Math.hypot(q.u, q.v);
    const over = isle + (1 - isle) * Math.min(1, Math.max(0, (d - TOMB_ISLE.r + 40) / 160));
    const a = edge * seen * over * 0.82;
    if (a < 0.02) continue;
    ctx.globalAlpha = a;
    ctx.drawImage(img, sx - size / 2, sy - size * 0.31, size, size * 0.62);
  }
  ctx.restore();
}

/**
 * Ashore in the fog (part two): past `r` round the figure at screen (sx, sy), the fog closes in to almost nothing seen,
 * a world circle squashed by the view like everything on the ground. k is how thick it is (0 gone, 1 full).
 */
export function drawTombSight(v: DrawView, sx: number, sy: number, r: number, k: number): void {
  if (k <= 0.01) return;
  const { ctx } = v;
  const R = r * v.zoom * Math.SQRT2;
  const far = Math.hypot(ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.translate(sx, sy);
  ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, R * 0.55, 0, 0, R * 1.5);
  g.addColorStop(0, 'rgba(206,214,212,0)');
  g.addColorStop(0.45, 'rgba(204,212,210,.78)');
  g.addColorStop(1, 'rgba(198,207,205,.96)');
  ctx.fillStyle = g;
  ctx.fillRect(-far, -far * 2, far * 2, far * 4);
  ctx.restore();
}

/** A stone base, an iron handle thrown up (or down, pulled), and a green lamp on a post beside it. */
function drawLever(v: DrawView, pulled: number): void {
  const { ctx } = v;
  const Z = v.zoom;
  const { x, y } = LEVER16;
  v.box(x - 5, y - 4, 10, 8, 0, 6, STONE, STONE_TOP);
  // The handle swings from up and back (-0.9) to down and forward (0.9) as it is pulled.
  const a = -0.9 + 1.8 * pulled;
  const bx = v.px(x, y);
  const by = v.py(x, y, 6);
  const ex = bx + Math.sin(a) * 13 * Z;
  const ey = by - Math.cos(a) * 13 * Z;
  ctx.strokeStyle = '#3B3A3C';
  ctx.lineWidth = 2.4 * Z;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.fillStyle = '#8E2E26';
  ctx.beginPath();
  ctx.arc(ex, ey, 2.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'butt';
  v.box(x + 6, y - 1, 2, 2, 0, 24, '#3A322C', '#3A322C');
}

/** The lever's lamp: a green glow over the fog, so it can be found from anywhere ashore. Dimmer once pulled. */
export function drawLeverLamp(v: DrawView, pulled: boolean): void {
  if (!v.onScreen(LEVER16.x, LEVER16.y, 400 * v.zoom)) return;
  const { ctx } = v;
  const Z = v.zoom;
  const sx = v.px(LEVER16.x + 7, LEVER16.y);
  const sy = v.py(LEVER16.x + 7, LEVER16.y, 27);
  const pulse = 0.75 + 0.25 * Math.sin(v.T * 3);
  ctx.save();
  if (!pulled) {
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26 * Z);
    g.addColorStop(0, `rgba(150,255,130,${0.7 * pulse})`);
    g.addColorStop(1, 'rgba(150,255,130,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - 26 * Z, sy - 26 * Z, 52 * Z, 52 * Z);
  }
  ctx.fillStyle = pulled ? '#5E7A58' : '#B8FF9E';
  ctx.beginPath();
  ctx.arc(sx, sy, 2.8 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The lever as a solid, sorted among the walls. pulled runs 0 (up) to 1 (thrown). */
export function leverSolid(v: DrawView, pulled: number): Solid | null {
  if (!v.onScreen(LEVER16.x, LEVER16.y, 60 * v.zoom)) return null;
  return { d: LEVER16.x + LEVER16.y, f: () => drawLever(v, pulled) };
}

/** The merchant's stall behind him: two poles, a torn dark-red awning, a crate of torches and a skull on a barrel. */
function drawStall16(v: DrawView): void {
  const { ctx } = v;
  const Z = v.zoom;
  const { x, y } = MERCHANT16;
  const poles: [number, number][] = [
    [x - 16, y - 10],
    [x + 16, y - 10],
  ];
  for (const [px, py] of poles) v.box(px - 1, py - 1, 2, 2, 0, 26, '#4A3D33', '#4A3D33');
  // The awning, sagging, its front edge torn into tatters that sway.
  const front: [number, number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    front.push([
      x - 18 + 36 * t,
      y - 2,
      21 - Math.sin(t * Math.PI) * 2 - (i % 2 ? 3 + Math.sin(v.T * 2 + i) : 0),
    ]);
  }
  ctx.beginPath();
  ctx.moveTo(v.px(x - 18, y - 12), v.py(x - 18, y - 12, 27));
  ctx.lineTo(v.px(x + 18, y - 12), v.py(x + 18, y - 12, 27));
  for (const [fx, fy, fz] of front.slice().reverse()) ctx.lineTo(v.px(fx, fy), v.py(fx, fy, fz));
  ctx.closePath();
  ctx.fillStyle = '#5E2228';
  ctx.fill();
  // A crate of torches to his left, a barrel with a skull on it to his right.
  v.box(x - 22, y - 2, 10, 8, 0, 7, '#6E5338', '#856544');
  for (let i = 0; i < 3; i++) {
    const tx = x - 20 + i * 3;
    const ty = y + 2;
    ctx.strokeStyle = '#5A3E22';
    ctx.lineWidth = 1.4 * Z;
    ctx.beginPath();
    ctx.moveTo(v.px(tx, ty), v.py(tx, ty, 6));
    ctx.lineTo(v.px(tx, ty), v.py(tx, ty, 13));
    ctx.stroke();
    ctx.fillStyle = '#3A2E26';
    ctx.beginPath();
    ctx.arc(v.px(tx, ty), v.py(tx, ty, 14), 1.3 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  v.box(x + 13, y - 1, 7, 7, 0, 9, '#5A4232', '#6E5340');
  skull(v, v.px(x + 16.5, y + 2.5), v.py(x + 16.5, y + 2.5, 12), 1.2);
}

/** The man in the cloak: a black cloak to the ground, his hood up, two mean little eyes glinting in it. */
function drawMerchant16(v: DrawView, talking: number): void {
  const { ctx } = v;
  const Z = v.zoom;
  const { x, y } = MERCHANT16;
  const sx = v.px(x, y);
  const sy = v.py(x, y);
  const sway = Math.sin(v.T * 1.4) * 0.4 * Z;
  v.isoEllipse(x, y, 6);
  ctx.fillStyle = 'rgba(20,18,16,.35)';
  ctx.fill();
  // The cloak, wide at the hem, narrow at the shoulders.
  ctx.fillStyle = '#211D26';
  ctx.beginPath();
  ctx.moveTo(sx - 6 * Z, sy);
  ctx.quadraticCurveTo(sx - 5 * Z + sway, sy - 10 * Z, sx - 3.2 * Z + sway, sy - 17 * Z);
  ctx.lineTo(sx + 3.2 * Z + sway, sy - 17 * Z);
  ctx.quadraticCurveTo(sx + 5 * Z + sway, sy - 10 * Z, sx + 6 * Z, sy);
  ctx.closePath();
  ctx.fill();
  // A bony hand out of the sleeve, beckoning while he talks.
  const beck = talking > 0 ? Math.sin(v.T * 8) * 1.2 * Z : 0;
  ctx.fillStyle = '#D9D0BC';
  ctx.beginPath();
  ctx.arc(sx + 4.6 * Z + sway, sy - 9 * Z + beck, 1.1 * Z, 0, Math.PI * 2);
  ctx.fill();
  // The hood, its opening dark, two eyes glinting yellow in it.
  const hx = sx + sway;
  const hy = sy - 19.5 * Z;
  ctx.fillStyle = '#2B2631';
  ctx.beginPath();
  ctx.arc(hx, hy, 4.4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx - 1.5 * Z, hy - 6.2 * Z);
  ctx.lineTo(hx + 1.2 * Z, hy - 3 * Z);
  ctx.lineTo(hx - 3 * Z, hy - 3 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0D0B10';
  ctx.beginPath();
  ctx.ellipse(hx, hy + 0.8 * Z, 2.7 * Z, 2.9 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  const blink = Math.sin(v.T * 0.9) > 0.97 ? 0.2 : 1;
  ctx.fillStyle = '#F2D45A';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(hx + e * 1.1 * Z, hy + 0.3 * Z, 0.6 * Z, 0.45 * Z * blink, e * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The merchant and his stall as solids, sorted with the rest. talking counts down while he speaks. */
export function merchantSolids16(v: DrawView, talking: number): Solid[] {
  if (!v.onScreen(MERCHANT16.x, MERCHANT16.y, 80 * v.zoom)) return [];
  return [
    { d: MERCHANT16.x + MERCHANT16.y - 10, f: () => drawStall16(v) },
    { d: MERCHANT16.x + MERCHANT16.y, f: () => drawMerchant16(v, talking) },
  ];
}
