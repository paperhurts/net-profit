/**
 * Drawing the Endless Isle (world/endless.ts): the shallows round it, the channel between its halves (the shallows a lighter
 * turquoise round the sandbar, the rest deeper), and the two halves, the same ground dressed two ways. The pirates'
 * is warm: gold sand and jungle green, sandy trails, palms, a log stockade with the Jolly Roger flying in it, a ship
 * beached by the fort, a cannon on its battery, and the great tree hung with treehouses. The ninjas' is cool: pale
 * stone and moss, stone paths, pines and blossom trees, a white-walled fort with dark tiled tops and their banner, a
 * red shrine gate with a gong, a bell tower, and the snow peak. Across the channel, two rope bridges and the wreck on
 * the sandbar; a pier off each half toward home.
 */

import type { DrawView } from '../entities/entity';
import {
  BASE,
  BRIDGE13,
  BRIDGES13,
  CHANNEL,
  CRATES13,
  ENDLESS,
  endlessEdge,
  FORT,
  fromEndless,
  GRAVE,
  HALF_C,
  halfShore,
  LIFT13,
  onHalf,
  PEAK,
  PIER13,
  PIER13_Z,
  SANDBAR,
  SHALLOWS13,
  SIDES,
  type Side,
  TREES13,
} from '../world/endless';
import { drawPalm7 } from './isle7';
import type { Solid } from './layers';

const N = 120;

/** Each half's dress: its ground from the waterline in, its trails, and its fort's walls. */
const LOOK = {
  pirate: {
    edge: '#EBD08C',
    mid: '#8DBB5E',
    inner: '#7DAF52',
    trail: '#E2C47E',
    wall: '#8A5E34',
    wallTop: '#A97A48',
  },
  ninja: {
    edge: '#D9D3C4',
    mid: '#93B48C',
    inner: '#86A981',
    trail: '#CDC6B4',
    wall: '#EDE8DC',
    wallTop: '#3A3F4A',
  },
} as const;

/** A point on a half, on the screen. */
function hp(v: DrawView, side: Side, u: number, w: number, z = 0): [number, number] {
  const [hu, hv] = onHalf(side, u, w);
  const [x, y] = fromEndless(hu, hv);
  return [v.px(x, y), v.py(x, y, z)];
}
/** A point on a half, in the world. */
function hw(side: Side, u: number, w: number): [number, number] {
  const [hu, hv] = onHalf(side, u, w);
  const [x, y] = fromEndless(hu, hv);
  return [x, y];
}

/** The island's outer edge, pushed out by off, as a path. */
function edgePath(v: DrawView, off: number): void {
  const { ctx, px, py } = v;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = Math.max(10, endlessEdge(a) + off);
    const [x, y] = fromEndless(Math.cos(a) * r, Math.sin(a) * r);
    if (i === 0) ctx.moveTo(px(x, y), py(x, y));
    else ctx.lineTo(px(x, y), py(x, y));
  }
  ctx.closePath();
}

/** A half's shore, pushed out (or in) by off, as a path. */
function halfPath(v: DrawView, side: Side, off: number): void {
  const { ctx } = v;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = Math.max(10, halfShore(a) + off);
    const [sx, sy] = hp(v, side, HALF_C.u + Math.cos(a) * r, HALF_C.w + Math.sin(a) * r);
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
}

/** An ellipse in the island's own frame, round (u, v), as a path at height z. */
function frameEllipse(v: DrawView, u: number, w: number, ru: number, rv: number, z = 0): void {
  const { ctx, px, py } = v;
  ctx.beginPath();
  for (let i = 0; i <= 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const [x, y] = fromEndless(u + Math.cos(a) * ru, w + Math.sin(a) * rv);
    if (i === 0) ctx.moveTo(px(x, y), py(x, y, z));
    else ctx.lineTo(px(x, y), py(x, y, z));
  }
  ctx.closePath();
}

const near = (v: DrawView, m: number) => v.onScreen(ENDLESS.x, ENDLESS.y, m * v.zoom);

/** The shallows round it, in rings following its edge, and the channel between the halves. */
export function drawEndlessSea(v: DrawView): void {
  const { ctx } = v;
  if (!near(v, 2600)) return;
  edgePath(v, 300);
  ctx.fillStyle = '#1B6E78';
  ctx.fill();
  edgePath(v, 150);
  ctx.fillStyle = '#2F989E';
  ctx.fill();
  edgePath(v, 55);
  ctx.fillStyle = '#73C9BD';
  ctx.fill();
  // The channel, deeper than the shallows round the sandbar, which are pale enough to see the bottom.
  const { px, py } = v;
  ctx.beginPath();
  for (const [u, w] of [
    [-700, -CHANNEL - 30],
    [700, -CHANNEL - 30],
    [700, CHANNEL + 30],
    [-700, CHANNEL + 30],
  ] as const) {
    const [x, y] = fromEndless(u, w);
    ctx.lineTo(px(x, y), py(x, y));
  }
  ctx.closePath();
  ctx.fillStyle = '#3FA6A6';
  ctx.fill();
  frameEllipse(v, 0, 0, SHALLOWS13.ru, SHALLOWS13.rv);
  ctx.fillStyle = '#9ADCCB';
  ctx.fill();
}

/** Both halves' ground, their trails and base rings, the sandbar, the bridges and the piers. */
export function drawEndlessFlat(v: DrawView): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  if (!near(v, 2300)) return;
  for (const side of SIDES) {
    const L = LOOK[side];
    halfPath(v, side, 8 + Math.sin(T * 1.3) * 3);
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 4 * Z;
    ctx.stroke();
    halfPath(v, side, 0);
    ctx.fillStyle = L.edge;
    ctx.fill();
    halfPath(v, side, -45);
    ctx.fillStyle = L.mid;
    ctx.fill();
    halfPath(v, side, -130);
    ctx.fillStyle = L.inner;
    ctx.fill();
    // The ninjas' snow, lying round the foot of their peak.
    if (side === 'ninja') {
      const [x, y] = hw(side, PEAK.u, PEAK.w);
      v.isoEllipse(x, y, PEAK.r * 1.9);
      ctx.fillStyle = 'rgba(244,248,252,.55)';
      ctx.fill();
      v.isoEllipse(x, y, PEAK.r * 1.45);
      ctx.fillStyle = 'rgba(248,251,254,.85)';
      ctx.fill();
    }
    drawTrails(v, side);
    drawBaseRing(v, side);
    drawFortFloor(v, side);
    drawPier13(v, side);
  }
  // The sandbar, and the wreck's shadow on it.
  frameEllipse(v, 0, 0, SANDBAR.ru + 8, SANDBAR.rv + 6);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fill();
  frameEllipse(v, 0, 0, SANDBAR.ru, SANDBAR.rv);
  ctx.fillStyle = '#EAD7A2';
  ctx.fill();
  frameEllipse(v, 0, 0, BASE.r, BASE.r);
  ctx.setLineDash([6 * Z, 6 * Z]);
  ctx.strokeStyle = 'rgba(120,96,60,.6)';
  ctx.lineWidth = 2 * Z;
  ctx.stroke();
  ctx.setLineDash([]);
  for (const b of BRIDGES13) drawBridge13(v, b);
}

/** The trails across a half: from the pier to the fort's gate, and from the gate out to both bridges and the shallows. */
const TRAILS: readonly (readonly [number, number][])[] = [
  [
    [640, PIER13.w],
    [430, 420],
    [210, 480],
    [40, 640],
    [0, FORT.w - FORT.r - 10],
  ],
  [
    [0, FORT.w - FORT.r - 10],
    [-190, 600],
    [BASE.u, BASE.w],
    [-340, 240],
    [BRIDGES13[0] as number, CHANNEL],
  ],
  [
    [0, FORT.w - FORT.r - 10],
    [190, 600],
    [320, 330],
    [BRIDGES13[1] as number, CHANNEL],
  ],
  [
    [40, 640],
    [0, 380],
    [0, CHANNEL],
  ],
  [
    [GRAVE.u + 30, GRAVE.w - 40],
    [-190, 600],
  ],
];

function drawTrails(v: DrawView, side: Side): void {
  const { ctx } = v;
  const Z = v.zoom;
  ctx.strokeStyle = LOOK[side].trail;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 26 * Z;
  for (const t of TRAILS) {
    ctx.beginPath();
    t.forEach(([u, w], i) => {
      const [sx, sy] = hp(v, side, u, w);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();
  }
  // The ninjas' trails are stepping stones laid along them.
  if (side === 'ninja') {
    ctx.fillStyle = '#B9B2A0';
    for (const t of TRAILS)
      for (let i = 0; i + 1 < t.length; i++) {
        const [u0, w0] = t[i] as [number, number];
        const [u1, w1] = t[i + 1] as [number, number];
        const n = Math.max(1, Math.floor(Math.hypot(u1 - u0, w1 - w0) / 34));
        for (let k = 0; k < n; k++) {
          const f = (k + 0.5) / n;
          const [x, y] = hw(side, u0 + (u1 - u0) * f, w0 + (w1 - w0) * f);
          v.isoEllipse(x, y, 8);
          ctx.fill();
        }
      }
  }
  ctx.lineCap = 'butt';
}

/** The ring round a half's base, fought over in Hold the Forts: planks on the pirates', flagstones on the ninjas'. */
function drawBaseRing(v: DrawView, side: Side): void {
  const { ctx } = v;
  const Z = v.zoom;
  const [x, y] = hw(side, BASE.u, BASE.w);
  v.isoEllipse(x, y, BASE.r);
  ctx.fillStyle = side === 'pirate' ? '#C49A62' : '#BDB7A6';
  ctx.fill();
  ctx.setLineDash([6 * Z, 6 * Z]);
  ctx.strokeStyle = side === 'pirate' ? 'rgba(90,60,30,.6)' : 'rgba(70,70,80,.5)';
  ctx.lineWidth = 2 * Z;
  ctx.stroke();
  ctx.setLineDash([]);
}

/** The ground inside a fort's walls: trodden earth, or swept stone. */
function drawFortFloor(v: DrawView, side: Side): void {
  const { ctx } = v;
  const [x, y] = hw(side, FORT.u, FORT.w);
  v.isoEllipse(x, y, FORT.r - 4);
  ctx.fillStyle = side === 'pirate' ? '#C9A56C' : '#CFCABD';
  ctx.fill();
}

/** A half's pier, out toward home, its planks across it. */
function drawPier13(v: DrawView, side: Side): void {
  const { ctx } = v;
  const Z = v.zoom;
  const h = PIER13.half;
  const w = PIER13.w;
  const corner = (u: number, d: number) => hp(v, side, u, w + d, PIER13_Z);
  ctx.beginPath();
  for (const [u, d] of [
    [PIER13.u0, -h],
    [PIER13.u1, -h],
    [PIER13.u1, h],
    [PIER13.u0, h],
  ] as const) {
    const [sx, sy] = corner(u, d);
    ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fillStyle = '#B48A5A';
  ctx.fill();
  ctx.strokeStyle = '#7A5230';
  ctx.lineWidth = 1.2 * Z;
  ctx.stroke();
  for (let u = PIER13.u0 + 14; u < PIER13.u1; u += 16) {
    const [ax, ay] = corner(u, -h);
    const [bx, by] = corner(u, h);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
}

/** A rope bridge over the channel at u: planks across, a rope rail either side on posts. */
function drawBridge13(v: DrawView, u: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const h = BRIDGE13.half;
  const L = BRIDGE13.w;
  const at = (du: number, t: number, lift = 0): [number, number] => {
    const vv = -L + 2 * L * t;
    const [x, y] = fromEndless(u + du, vv);
    const z = Math.min(1, (L - Math.abs(vv)) / BRIDGE13.ramp) * BRIDGE13.z + lift;
    return [px(x, y), py(x, y, z)];
  };
  // Its shadow on the water.
  ctx.fillStyle = 'rgba(0,40,50,.18)';
  ctx.beginPath();
  for (const [du, t] of [
    [-h, 0],
    [-h, 1],
    [h, 1],
    [h, 0],
  ] as const) {
    const vv = -L + 2 * L * t;
    const [x, y] = fromEndless(u + du + 6, vv + 6);
    ctx.lineTo(px(x, y), py(x, y));
  }
  ctx.closePath();
  ctx.fill();
  // The planks.
  const n = 22;
  for (let i = 0; i < n; i++) {
    const t0 = i / n + 0.004;
    const t1 = (i + 1) / n - 0.004;
    ctx.beginPath();
    for (const [du, t] of [
      [-h, t0],
      [h, t0],
      [h, t1],
      [-h, t1],
    ] as const) {
      const [sx, sy] = at(du, t);
      ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fillStyle = i % 2 ? '#B48A5A' : '#A57C4E';
    ctx.fill();
  }
  // The rails: rope swung between posts at each end, swaying a little.
  ctx.strokeStyle = '#D8C49A';
  ctx.lineWidth = 2 * Z;
  for (const du of [-h, h]) {
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const [sx, sy] = at(du, t, 14 - Math.sin(Math.PI * t) * 5 + Math.sin(T * 1.2 + u) * 0.6);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    for (const t of [0, 1]) {
      const [bx, by] = at(du, t);
      const [tx, ty] = at(du, t, 18);
      ctx.strokeStyle = '#6B4A2C';
      ctx.lineWidth = 3.4 * Z;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.strokeStyle = '#D8C49A';
      ctx.lineWidth = 2 * Z;
    }
  }
}

/* ---------- what stands up ---------- */

/** A fort's wall, in segments round it, each sorted on its own so a figure can walk in front of or behind it. */
function fortWall(v: DrawView, side: Side, out: Solid[], shut = false): void {
  const L = LOOK[side];
  const segs = 20;
  const gate0 = -Math.PI / 2 - FORT.gate;
  const gate1 = -Math.PI / 2 + FORT.gate;
  const H = side === 'pirate' ? 34 : 30;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2 - Math.PI;
    const a1 = ((i + 1) / segs) * Math.PI * 2 - Math.PI;
    // Leave the gate open: a segment across it keeps only its ends either side.
    const parts: [number, number][] = [];
    if (a1 <= gate0 || a0 >= gate1) parts.push([a0, a1]);
    else {
      if (a0 < gate0) parts.push([a0, gate0]);
      if (a1 > gate1) parts.push([gate1, a1]);
    }
    for (const [b0, b1] of parts) {
      const pts: [number, number][] = [];
      const rin = FORT.r - FORT.wall * 0.5;
      const rout = FORT.r + FORT.wall * 0.5;
      for (const [r, b] of [
        [rin, b0],
        [rin, b1],
        [rout, b1],
        [rout, b0],
      ] as const)
        pts.push(hw(side, FORT.u + Math.cos(b) * r, FORT.w + Math.sin(b) * r));
      const [mx, my] = hw(
        side,
        FORT.u + Math.cos((b0 + b1) / 2) * FORT.r,
        FORT.w + Math.sin((b0 + b1) / 2) * FORT.r,
      );
      out.push({
        d: mx + my,
        f: () => {
          v.extrude(pts, 0, H, L.wall, L.wallTop);
          if (side === 'pirate') logTops(v, pts, H);
        },
      });
    }
  }
  // The gateposts: tall, the pirates' with a skull on a board, the ninjas' under a little tiled roof.
  for (const g of [gate0, gate1]) {
    const [gx, gy] = hw(side, FORT.u + Math.cos(g) * FORT.r, FORT.w + Math.sin(g) * FORT.r);
    out.push({
      d: gx + gy + 1,
      f: () => {
        v.box(
          gx - 6,
          gy - 6,
          12,
          12,
          0,
          H + 14,
          side === 'pirate' ? '#6B4A2C' : '#7A2E2A',
          side === 'pirate' ? '#8A6A43' : '#3A3F4A',
        );
      },
    });
  }
  // Before a battle, its gate shut: a row of bars between the gateposts, dropped when the battle starts.
  if (shut) {
    const n = 7;
    for (let i = 1; i < n; i++) {
      const g = gate0 + ((gate1 - gate0) * i) / n;
      const [bx, by] = hw(side, FORT.u + Math.cos(g) * FORT.r, FORT.w + Math.sin(g) * FORT.r);
      out.push({
        d: bx + by,
        f: () =>
          v.box(
            bx - 2,
            by - 2,
            4,
            4,
            0,
            H - 4,
            side === 'pirate' ? '#5A3E24' : '#4A4E58',
            side === 'pirate' ? '#7A5A38' : '#6A6E78',
          ),
      });
    }
  }
}

/** The pointed tops of a log wall's logs. */
function logTops(v: DrawView, pts: readonly [number, number][], H: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const [a, b] = [pts[0] as [number, number], pts[1] as [number, number]];
  const [c, d] = [pts[3] as [number, number], pts[2] as [number, number]];
  const n = 3;
  ctx.fillStyle = '#A97A48';
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    const x = (a[0] + (b[0] - a[0]) * f + c[0] + (d[0] - c[0]) * f) / 2;
    const y = (a[1] + (b[1] - a[1]) * f + c[1] + (d[1] - c[1]) * f) / 2;
    const sx = px(x, y);
    const sy = py(x, y, H);
    ctx.beginPath();
    ctx.moveTo(sx - 4 * Z, sy);
    ctx.lineTo(sx, sy - 7 * Z);
    ctx.lineTo(sx + 4 * Z, sy);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * A flag on a pole: the Jolly Roger, or the ninjas' banner, a throwing star on an indigo field (both the kid's). In a
 * battle, while it is out of its fort, the pole stands bare.
 */
function drawFlag13(v: DrawView, side: Side, x: number, y: number, flying = true): void {
  const { ctx, px, py } = v;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  v.isoEllipse(x, y, 7);
  ctx.fill();
  flagOnPole(v, side, px(x, y), py(x, y), 1, flying);
}

/** A side's flag on a little pole at screen x, y, as a carrier has it on its back, or lying where it was dropped. */
export function drawBattleFlag(
  v: DrawView,
  side: Side,
  sx: number,
  sy: number,
  lying = false,
): void {
  const { ctx } = v;
  if (!lying) {
    flagOnPole(v, side, sx, sy, 0.42, true);
    return;
  }
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-1.2);
  flagOnPole(v, side, 0, 0, 0.42, true);
  ctx.restore();
}

/** The pole and the flag on it, at screen x, y, scaled. */
function flagOnPole(
  v: DrawView,
  side: Side,
  sx: number,
  sy: number,
  k: number,
  flying: boolean,
): void {
  const { ctx, T } = v;
  const Z = v.zoom * k;
  const top = sy - 92 * Z;
  ctx.strokeStyle = side === 'pirate' ? '#4A3220' : '#2A2A30';
  ctx.lineWidth = 3 * Z;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, top);
  ctx.stroke();
  ctx.fillStyle = '#D9B24A';
  ctx.beginPath();
  ctx.arc(sx, top, 3 * Z, 0, Math.PI * 2);
  ctx.fill();
  if (!flying) return;
  const W = 34 * Z;
  const Hh = 22 * Z;
  const wave = (k: number) => Math.sin(T * 5 + k * 3) * 3 * Z * k;
  ctx.beginPath();
  ctx.moveTo(sx, top + 3 * Z);
  for (let i = 1; i <= 6; i++) ctx.lineTo(sx + (W * i) / 6, top + 3 * Z + wave(i / 6));
  for (let i = 6; i >= 0; i--) ctx.lineTo(sx + (W * i) / 6, top + 3 * Z + Hh + wave(i / 6));
  ctx.closePath();
  ctx.fillStyle = side === 'pirate' ? '#15151A' : '#2C3B8F';
  ctx.fill();
  const cx = sx + W * 0.5;
  const cy = top + 3 * Z + Hh * 0.5 + wave(0.5);
  ctx.fillStyle = '#F4F1E8';
  ctx.strokeStyle = '#F4F1E8';
  if (side === 'pirate') {
    // A skull and crossbones.
    ctx.lineWidth = 2 * Z;
    ctx.beginPath();
    ctx.moveTo(cx - 8 * Z, cy - 5 * Z);
    ctx.lineTo(cx + 8 * Z, cy + 7 * Z);
    ctx.moveTo(cx + 8 * Z, cy - 5 * Z);
    ctx.lineTo(cx - 8 * Z, cy + 7 * Z);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - 2 * Z, 5 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15151A';
    for (const dx of [-2, 2]) {
      ctx.beginPath();
      ctx.arc(cx + dx * Z, cy - 2.5 * Z, 1.2 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // The kid's: a throwing star on the field, four blades round a hole, a little turned.
    const r = 9 * Z;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.3;
      const d = k % 2 ? r * 0.32 : r;
      ctx.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9);
    }
    ctx.closePath();
    ctx.fillStyle = '#E4E8F0';
    ctx.fill();
    ctx.fillStyle = '#2C3B8F';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The pirates' graveyard: a ship run up on the shore, heeled over, its mast broken. */
function drawBeached(v: DrawView, x: number, y: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const sy = py(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  v.isoEllipse(x, y, 40);
  ctx.fill();
  ctx.fillStyle = '#6B4A2C';
  ctx.beginPath();
  ctx.moveTo(sx - 46 * Z, sy - 16 * Z);
  ctx.quadraticCurveTo(sx - 30 * Z, sy + 8 * Z, sx + 4 * Z, sy + 8 * Z);
  ctx.quadraticCurveTo(sx + 36 * Z, sy + 6 * Z, sx + 48 * Z, sy - 12 * Z);
  ctx.lineTo(sx + 40 * Z, sy - 24 * Z);
  ctx.lineTo(sx - 38 * Z, sy - 28 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#4A3220';
  ctx.lineWidth = 1.2 * Z;
  for (const k of [0.35, 0.6]) {
    ctx.beginPath();
    ctx.moveTo(sx - 44 * Z + k * 6 * Z, sy - 16 * Z + k * 18 * Z);
    ctx.quadraticCurveTo(sx, sy + k * 18 * Z, sx + 45 * Z, sy - 12 * Z + k * 12 * Z);
    ctx.stroke();
  }
  ctx.fillStyle = '#8A6A43';
  ctx.beginPath();
  ctx.moveTo(sx - 38 * Z, sy - 28 * Z);
  ctx.lineTo(sx + 40 * Z, sy - 24 * Z);
  ctx.lineTo(sx + 34 * Z, sy - 30 * Z);
  ctx.lineTo(sx - 34 * Z, sy - 34 * Z);
  ctx.closePath();
  ctx.fill();
  // The broken mast, a scrap of sail on it, leaning.
  ctx.strokeStyle = '#5A3E24';
  ctx.lineWidth = 3.4 * Z;
  ctx.beginPath();
  ctx.moveTo(sx - 2 * Z, sy - 30 * Z);
  ctx.lineTo(sx + 12 * Z, sy - 88 * Z);
  ctx.stroke();
  ctx.fillStyle = 'rgba(236,228,206,.9)';
  ctx.beginPath();
  ctx.moveTo(sx + 9 * Z, sy - 78 * Z);
  ctx.lineTo(sx + 30 * Z, sy - 70 * Z);
  ctx.lineTo(sx + 22 * Z, sy - 52 * Z);
  ctx.lineTo(sx + 5 * Z, sy - 58 * Z);
  ctx.closePath();
  ctx.fill();
}

/** The ninjas' graveyard: a red shrine gate, and a gong hung in a frame beside it. */
function drawShrine(v: DrawView, x: number, y: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const sy = py(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  v.isoEllipse(x, y, 34);
  ctx.fill();
  const red = '#B8362E';
  ctx.fillStyle = red;
  for (const dx of [-22, 22]) ctx.fillRect(sx + (dx - 3) * Z, sy - 62 * Z, 6 * Z, 62 * Z);
  ctx.fillStyle = '#2A2A30';
  ctx.beginPath();
  ctx.moveTo(sx - 36 * Z, sy - 70 * Z);
  ctx.quadraticCurveTo(sx, sy - 64 * Z, sx + 36 * Z, sy - 70 * Z);
  ctx.lineTo(sx + 32 * Z, sy - 63 * Z);
  ctx.quadraticCurveTo(sx, sy - 58 * Z, sx - 32 * Z, sy - 63 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = red;
  ctx.fillRect(sx - 28 * Z, sy - 52 * Z, 56 * Z, 5 * Z);
  // The gong, swinging a little.
  const gx = sx + 34 * Z;
  const gy = sy - 4 * Z;
  ctx.strokeStyle = '#5A3E24';
  ctx.lineWidth = 2.6 * Z;
  ctx.beginPath();
  ctx.moveTo(gx - 10 * Z, gy);
  ctx.lineTo(gx - 10 * Z, gy - 34 * Z);
  ctx.lineTo(gx + 10 * Z, gy - 34 * Z);
  ctx.lineTo(gx + 10 * Z, gy);
  ctx.stroke();
  const swing = Math.sin(T * 1.5) * 1.2 * Z;
  ctx.fillStyle = '#C9973A';
  ctx.beginPath();
  ctx.arc(gx + swing, gy - 20 * Z, 7 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E7C66A';
  ctx.beginPath();
  ctx.arc(gx + swing - 1.5 * Z, gy - 21.5 * Z, 3 * Z, 0, Math.PI * 2);
  ctx.fill();
}

/** The pirates' base: a cannon on its carriage behind a low wall of barrels, pointing at the channel. */
function drawCannon(v: DrawView, x: number, y: number, toward: [number, number]): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const sy = py(x, y);
  // Which way it points on the screen, and how long a world unit that way looks: pointing away up the screen, its
  // barrel is foreshortened to half, so it reads as a cannon and not a post. It is cocked up a little, as cannons are.
  const wd = Math.hypot(toward[0] - x, toward[1] - y) || 1;
  const ux = (toward[0] - x) / wd;
  const uy = (toward[1] - y) / wd;
  const dx = px(x + ux, y + uy) - sx;
  const dy = py(x + ux, y + uy) - sy;
  const a = Math.atan2(dy - 0.25 * Z, dx);
  const len = Math.max(0.5, Math.hypot(dx, dy) / Z) * 26;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  v.isoEllipse(x, y, 16);
  ctx.fill();
  ctx.fillStyle = '#6B4A2C';
  ctx.fillRect(sx - 10 * Z, sy - 9 * Z, 20 * Z, 7 * Z);
  ctx.fillStyle = '#3A2A1A';
  for (const wx of [-7, 7]) {
    ctx.beginPath();
    ctx.arc(sx + wx * Z, sy - 2 * Z, 4 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(sx, sy - 12 * Z);
  ctx.rotate(a);
  ctx.fillStyle = '#26262C';
  ctx.beginPath();
  ctx.moveTo(-8 * Z, -5 * Z);
  ctx.lineTo((len - 8) * Z, -3.5 * Z);
  ctx.lineTo((len - 8) * Z, 3.5 * Z);
  ctx.lineTo(-8 * Z, 5 * Z);
  ctx.closePath();
  ctx.fill();
  // Its mouth, dark, at the end.
  ctx.fillStyle = '#0E0E12';
  ctx.beginPath();
  ctx.ellipse((len - 8) * Z, 0, 1.6 * Z, 3.4 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-8 * Z, 0, 5 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // A stack of cannonballs.
  ctx.fillStyle = '#26262C';
  for (const [bx, by] of [
    [-16, 2],
    [-11, 2],
    [-13.5, -2],
  ] as const) {
    ctx.beginPath();
    ctx.arc(sx + bx * Z, sy + by * Z, 2.6 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The ninjas' base: a little bell tower, four posts under a tiled roof, a bronze bell in it. */
function drawBellTower(v: DrawView, x: number, y: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const sy = py(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  v.isoEllipse(x, y, 16);
  ctx.fill();
  ctx.fillStyle = '#7A2E2A';
  for (const [dx, dy] of [
    [-11, -4],
    [11, -4],
    [-11, 4],
    [11, 4],
  ] as const)
    ctx.fillRect(sx + (dx - 1.6) * Z, sy + (dy - 46) * Z, 3.2 * Z, 46 * Z);
  ctx.fillStyle = '#3A3F4A';
  ctx.beginPath();
  ctx.moveTo(sx - 22 * Z, sy - 44 * Z);
  ctx.quadraticCurveTo(sx, sy - 52 * Z, sx + 22 * Z, sy - 44 * Z);
  ctx.lineTo(sx + 10 * Z, sy - 62 * Z);
  ctx.lineTo(sx - 10 * Z, sy - 62 * Z);
  ctx.closePath();
  ctx.fill();
  const swing = Math.sin(T * 1.1) * 0.08;
  ctx.save();
  ctx.translate(sx, sy - 42 * Z);
  ctx.rotate(swing);
  ctx.fillStyle = '#B07F3A';
  ctx.beginPath();
  ctx.moveTo(-6 * Z, 0);
  ctx.lineTo(6 * Z, 0);
  ctx.lineTo(8 * Z, 14 * Z);
  ctx.lineTo(-8 * Z, 14 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The wreck on the sandbar in the middle: a hull on its side, ribs showing, a stump of mast. */
function drawWreck(v: DrawView): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const sx = px(ENDLESS.x, ENDLESS.y);
  const sy = py(ENDLESS.x, ENDLESS.y);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  v.isoEllipse(ENDLESS.x, ENDLESS.y, 44);
  ctx.fill();
  ctx.fillStyle = '#5E4430';
  ctx.beginPath();
  ctx.moveTo(sx - 44 * Z, sy - 4 * Z);
  ctx.quadraticCurveTo(sx, sy + 12 * Z, sx + 44 * Z, sy - 6 * Z);
  ctx.lineTo(sx + 38 * Z, sy - 20 * Z);
  ctx.quadraticCurveTo(sx, sy - 6 * Z, sx - 40 * Z, sy - 18 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3E2C1E';
  ctx.lineWidth = 2.4 * Z;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(sx + i * 10 * Z, sy - 12 * Z + Math.abs(i) * Z);
    ctx.quadraticCurveTo(
      sx + i * 11 * Z,
      sy - 30 * Z,
      sx + i * 8 * Z,
      sy - 34 * Z + Math.abs(i) * 2 * Z,
    );
    ctx.stroke();
  }
  ctx.strokeStyle = '#4A3220';
  ctx.lineWidth = 4 * Z;
  ctx.beginPath();
  ctx.moveTo(sx + 4 * Z, sy - 8 * Z);
  ctx.lineTo(sx - 6 * Z, sy - 50 * Z);
  ctx.stroke();
}

/** The ninjas' snow peak: grey rock rising steep to a snowy top, pines round its foot. */
function drawPeak(v: DrawView, x: number, y: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const sy = py(x, y);
  const R = PEAK.r * 1.3 * Z;
  const H = 330 * Z;
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(sx + 10 * Z, sy + 6 * Z, R * 1.05, R * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // The rock: the lit face and the shaded face.
  ctx.fillStyle = '#7E838C';
  ctx.beginPath();
  ctx.moveTo(sx - R, sy);
  ctx.quadraticCurveTo(sx - R * 0.5, sy - H * 0.35, sx - 6 * Z, sy - H);
  ctx.lineTo(sx + 6 * Z, sy - H);
  ctx.quadraticCurveTo(sx + R * 0.45, sy - H * 0.4, sx + R, sy);
  ctx.quadraticCurveTo(sx, sy + R * 0.5, sx - R, sy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9CA1AA';
  ctx.beginPath();
  ctx.moveTo(sx - R, sy);
  ctx.quadraticCurveTo(sx - R * 0.5, sy - H * 0.35, sx - 6 * Z, sy - H);
  ctx.lineTo(sx - 2 * Z, sy - H * 0.55);
  ctx.quadraticCurveTo(sx - R * 0.2, sy - H * 0.1, sx - R * 0.15, sy + R * 0.42);
  ctx.quadraticCurveTo(sx - R * 0.6, sy + R * 0.3, sx - R, sy);
  ctx.closePath();
  ctx.fill();
  // The snow on its top third, running down in tongues.
  ctx.fillStyle = '#F6F9FC';
  ctx.beginPath();
  ctx.moveTo(sx - 6 * Z, sy - H);
  ctx.lineTo(sx + 6 * Z, sy - H);
  ctx.quadraticCurveTo(sx + R * 0.18, sy - H * 0.78, sx + R * 0.3, sy - H * 0.6);
  ctx.lineTo(sx + R * 0.16, sy - H * 0.64);
  ctx.lineTo(sx + R * 0.08, sy - H * 0.52);
  ctx.lineTo(sx - R * 0.04, sy - H * 0.62);
  ctx.lineTo(sx - R * 0.16, sy - H * 0.5);
  ctx.lineTo(sx - R * 0.24, sy - H * 0.62);
  ctx.quadraticCurveTo(sx - R * 0.16, sy - H * 0.8, sx - 6 * Z, sy - H);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(200,214,232,.8)';
  ctx.beginPath();
  ctx.moveTo(sx + 6 * Z, sy - H);
  ctx.quadraticCurveTo(sx + R * 0.18, sy - H * 0.78, sx + R * 0.3, sy - H * 0.6);
  ctx.lineTo(sx + R * 0.16, sy - H * 0.64);
  ctx.lineTo(sx + 2 * Z, sy - H * 0.8);
  ctx.closePath();
  ctx.fill();
}

/**
 * The ninjas' chairlift: a station of dark wood under a red roof at the peak's foot, its cable running up the face to
 * a hut on the snowy top, chairs going slowly up one side and down the other.
 */
function drawChairlift(v: DrawView, x: number, y: number, peakX: number, peakY: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  v.isoEllipse(x, y, 24);
  ctx.fill();
  v.box(x - 16, y - 16, 32, 32, 0, 3, '#5A3A22', '#8F6A44');
  // Its posts at the back, toward the peak, the red roof over them, and the big wheel the cable turns on.
  const back = Math.atan2(peakY - y, peakX - x);
  const bx = Math.cos(back) * 12;
  const by = Math.sin(back) * 12;
  for (const k of [-1, 1])
    v.box(x + bx - 2 + k * by * 0.9, y + by - 2 - k * bx * 0.9, 4, 4, 3, 34, '#3E2A1A', '#5A3A22');
  v.box(x + bx * 0.5 - 18, y + by * 0.5 - 18, 36, 36, 34, 38, '#8A2A22', '#A8322A');
  const sx = px(x + bx * 0.5, y + by * 0.5);
  const sy = py(x + bx * 0.5, y + by * 0.5, 40);
  ctx.strokeStyle = '#3A3F4A';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 9 * Z, 3.5 * Z, 0, 0, Math.PI * 2);
  ctx.stroke();
  // The cable, up and down, to the hut on top.
  const tx = px(peakX, peakY);
  const ty = py(peakX, peakY) - 300 * Z;
  ctx.fillStyle = '#5A3A22';
  ctx.fillRect(tx - 9 * Z, ty - 6 * Z, 18 * Z, 10 * Z);
  ctx.fillStyle = '#A8322A';
  ctx.beginPath();
  ctx.moveTo(tx - 12 * Z, ty - 6 * Z);
  ctx.lineTo(tx, ty - 14 * Z);
  ctx.lineTo(tx + 12 * Z, ty - 6 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(42,45,51,.85)';
  ctx.lineWidth = Math.max(1, 1.1 * Z);
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx + k * 8 * Z, sy);
    ctx.lineTo(tx + k * 6 * Z, ty);
    ctx.stroke();
  }
  // The chairs: up on one side, down the other, a few of them each.
  for (const k of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const f = ((((k > 0 ? T : -T) * 0.035 + i / 4) % 1) + 1) % 1;
      const cx = sx + k * 8 * Z + (tx + k * 6 * Z - sx - k * 8 * Z) * f;
      const cy = sy + (ty - sy) * f;
      ctx.strokeStyle = '#3A3F4A';
      ctx.lineWidth = Math.max(1, Z);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + 9 * Z);
      ctx.stroke();
      ctx.fillStyle = '#C23B30';
      ctx.fillRect(cx - 5 * Z, cy + 9 * Z, 10 * Z, 2.5 * Z);
      ctx.fillRect(cx - 5 * Z, cy + 4 * Z, 2 * Z, 6 * Z);
    }
}

/** The pirates' great tree: a huge trunk on spreading roots, a crown of green, treehouses and rope ladders in it. */
function drawGreatTree(v: DrawView, x: number, y: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const sy = py(x, y);
  const H = 250 * Z;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(sx + 12 * Z, sy + 6 * Z, PEAK.r * 1.3 * Z, PEAK.r * 0.6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // Roots spreading out over the ground.
  ctx.strokeStyle = '#6B4A2C';
  ctx.lineCap = 'round';
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.3;
    ctx.lineWidth = (10 - (k % 3) * 2) * Z;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 10 * Z);
    ctx.quadraticCurveTo(
      sx + Math.cos(a) * 40 * Z,
      sy + Math.sin(a) * 14 * Z - 8 * Z,
      sx + Math.cos(a) * PEAK.r * 0.9 * Z,
      sy + Math.sin(a) * PEAK.r * 0.42 * Z,
    );
    ctx.stroke();
  }
  // The trunk.
  ctx.fillStyle = '#7A5634';
  ctx.beginPath();
  ctx.moveTo(sx - 34 * Z, sy);
  ctx.quadraticCurveTo(sx - 18 * Z, sy - H * 0.5, sx - 22 * Z, sy - H);
  ctx.lineTo(sx + 22 * Z, sy - H);
  ctx.quadraticCurveTo(sx + 18 * Z, sy - H * 0.5, sx + 34 * Z, sy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8F6A44';
  ctx.fillRect(sx - 14 * Z, sy - H, 10 * Z, H - 6 * Z);
  // A rope ladder up the front, to the lowest house.
  ctx.strokeStyle = '#D8C49A';
  ctx.lineWidth = 1.6 * Z;
  for (const dx of [6, 16]) {
    ctx.beginPath();
    ctx.moveTo(sx + dx * Z, sy - 4 * Z);
    ctx.lineTo(sx + dx * Z, sy - H * 0.45);
    ctx.stroke();
  }
  for (let k = 1; k < 9; k++) {
    const yy = sy - 4 * Z - ((H * 0.45 - 4 * Z) * k) / 9;
    ctx.beginPath();
    ctx.moveTo(sx + 6 * Z, yy);
    ctx.lineTo(sx + 16 * Z, yy);
    ctx.stroke();
  }
  // The crown: great round clumps of leaves.
  const clumps: readonly [number, number, number, string][] = [
    [-70, -0.92, 62, '#3E8A45'],
    [70, -0.95, 60, '#3E8A45'],
    [0, -1.12, 74, '#4A9A4E'],
    [-40, -1.32, 56, '#57A85A'],
    [48, -1.3, 54, '#57A85A'],
    [0, -1.48, 46, '#64B465'],
  ];
  for (const [dx, k, r, c] of clumps) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(sx + dx * Z + Math.sin(T * 0.6 + dx) * 1.5 * Z, sy + k * H, r * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // Treehouses: plank huts with sloped roofs, at three heights, and a rope bridge between two of them.
  const houses: readonly [number, number, number][] = [
    [-8, -0.48, 1],
    [-74, -0.9, 0.9],
    [68, -0.98, 0.9],
    [6, -1.38, 0.8],
  ];
  const at = (dx: number, k: number): [number, number] => [sx + dx * Z, sy + k * H];
  const [ax, ay] = at(-74, -0.9);
  const [bx, by] = at(68, -0.98);
  ctx.strokeStyle = '#D8C49A';
  ctx.lineWidth = 1.6 * Z;
  ctx.beginPath();
  ctx.moveTo(ax + 16 * Z, ay + 2 * Z);
  ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 18 * Z, bx - 16 * Z, by + 2 * Z);
  ctx.stroke();
  for (const [dx, k, s] of houses) {
    const [hx, hy] = at(dx, k);
    const w = 30 * Z * s;
    const h = 20 * Z * s;
    ctx.fillStyle = '#A97A48';
    ctx.fillRect(hx - w / 2, hy - h, w, h);
    ctx.fillStyle = '#6B4A2C';
    ctx.fillRect(hx - w / 2 - 3 * Z, hy, w + 6 * Z, 3 * Z);
    ctx.fillStyle = '#3A2A1A';
    ctx.fillRect(hx - 4 * Z * s, hy - 12 * Z * s, 8 * Z * s, 12 * Z * s);
    ctx.fillStyle = '#7A3A2A';
    ctx.beginPath();
    ctx.moveTo(hx - w / 2 - 5 * Z, hy - h);
    ctx.lineTo(hx, hy - h - 14 * Z * s);
    ctx.lineTo(hx + w / 2 + 5 * Z, hy - h);
    ctx.closePath();
    ctx.fill();
  }
  // The crow's nest at the very top, flying the Jolly Roger.
  const [nx, ny] = at(0, -1.62);
  ctx.strokeStyle = '#5A3E24';
  ctx.lineWidth = 2.4 * Z;
  ctx.beginPath();
  ctx.moveTo(nx, ny + 10 * Z);
  ctx.lineTo(nx, ny - 34 * Z);
  ctx.stroke();
  ctx.fillStyle = '#8A6A43';
  ctx.fillRect(nx - 9 * Z, ny - 2 * Z, 18 * Z, 9 * Z);
  ctx.fillStyle = '#15151A';
  ctx.beginPath();
  ctx.moveTo(nx, ny - 34 * Z);
  ctx.lineTo(nx + 16 * Z, ny - 30 * Z + Math.sin(T * 5) * 1.5 * Z);
  ctx.lineTo(nx + 16 * Z, ny - 22 * Z + Math.sin(T * 5) * 1.5 * Z);
  ctx.lineTo(nx, ny - 24 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.lineCap = 'butt';
}

/** A pine on the ninjas' half: tiers of dark needles. */
function drawPine(v: DrawView, x: number, y: number, i: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const sy = py(x, y);
  const s = 0.9 + (i % 3) * 0.12;
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  v.isoEllipse(x, y, 14 * s);
  ctx.fill();
  ctx.fillStyle = '#5A3E24';
  ctx.fillRect(sx - 2.5 * Z, sy - 12 * Z, 5 * Z, 12 * Z);
  for (let k = 0; k < 3; k++) {
    const base = sy - (10 + k * 16) * Z * s;
    const half = (20 - k * 5) * Z * s;
    ctx.fillStyle = k % 2 ? '#2F6B45' : '#275C3B';
    ctx.beginPath();
    ctx.moveTo(sx - half, base);
    ctx.lineTo(sx, base - 26 * Z * s);
    ctx.lineTo(sx + half, base);
    ctx.closePath();
    ctx.fill();
  }
}

/** A blossom tree on the ninjas' half: a dark crooked trunk under a cloud of pink. */
function drawBlossom(v: DrawView, x: number, y: number, i: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const sy = py(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  v.isoEllipse(x, y, 16);
  ctx.fill();
  ctx.strokeStyle = '#4A3428';
  ctx.lineWidth = 4 * Z;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(sx - 6 * Z, sy - 18 * Z, sx + 2 * Z, sy - 34 * Z);
  ctx.stroke();
  ctx.lineCap = 'butt';
  const sway = Math.sin(T * 0.8 + i) * 1.2 * Z;
  for (const [dx, dy, r, c] of [
    [-10, -38, 13, '#F2B8CB'],
    [10, -40, 13, '#F5C5D4'],
    [0, -50, 14, '#F8D3DF'],
  ] as const) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(sx + dx * Z + sway, sy + dy * Z, r * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Crates at a pier's root, where the catch goes. */
function drawCrates13(v: DrawView, side: Side): void {
  const { x, y } = CRATES13[side];
  v.box(x - 10, y - 8, 16, 16, 0, 14, '#B97F45', '#DDAA66');
  v.box(x - 4, y - 2, 12, 12, 14, 24, '#C98B4E', '#E6B877');
  v.box(x + 9, y + 5, 10, 10, 0, 13, '#7A5230', '#9A6A3E');
}

/**
 * The great tree and the peak stand so tall that from behind them, up the screen, they would hide the figure, its
 * boat and in time the fighting: when what the camera follows is behind one and under it on the screen, it fades to a
 * ghost of itself, and back as it comes out. How see-through each is now, and when that was last worked out.
 */
const GHOST = 0.3;
const fade = { pirate: 1, ninja: 1, t: 0 };
/** How solid a half's landmark is drawn now: 1, or down toward GHOST while something is behind it. */
export function landmarkFade(side: Side): number {
  return fade[side];
}
function behind(
  v: DrawView,
  x: number,
  y: number,
  focus: { x: number; y: number },
  half: number,
  tall: number,
): boolean {
  if (focus.x + focus.y >= x + y) return false;
  const fx = v.px(focus.x, focus.y);
  const fy = v.py(focus.x, focus.y, 10);
  const sx = v.px(x, y);
  const sy = v.py(x, y);
  return Math.abs(fx - sx) < half * v.zoom && fy < sy && fy > sy - tall * v.zoom;
}

/**
 * All that stands up on both halves and in the channel, each a solid for the scene to sort. Focus is what the camera
 * follows, the figure or the boat, for fading the tall landmarks it goes behind.
 */
/** A battle on, what the island shows of it: whether each side's flag is home on its pole, and the gates shut. */
export type BattleShow = { readonly home: Readonly<Record<Side, boolean>>; readonly shut: boolean };

export function endlessSolids(
  v: DrawView,
  focus: { x: number; y: number } | null = null,
  battle: BattleShow | null = null,
): Solid[] {
  if (!near(v, 2300)) return [];
  const out: Solid[] = [];
  const dt = Math.min(0.1, Math.max(0, v.T - fade.t));
  fade.t = v.T;
  const on = (x: number, y: number, m = 140) => v.onScreen(x, y, m * v.zoom);
  for (const side of SIDES) {
    const [fx, fy] = hw(side, FORT.u, FORT.w);
    if (on(fx, fy, 260)) {
      fortWall(v, side, out, !!battle?.shut);
      out.push({ d: fx + fy, f: () => drawFlag13(v, side, fx, fy, battle?.home[side] ?? true) });
    }
    const [gx, gy] = hw(side, GRAVE.u, GRAVE.w);
    if (on(gx, gy))
      out.push({
        d: gx + gy,
        f: () => (side === 'pirate' ? drawBeached(v, gx, gy) : drawShrine(v, gx, gy)),
      });
    const [bx, by] = hw(side, BASE.u, BASE.w);
    if (on(bx, by)) {
      const toward = hw(side, BASE.u, 0);
      out.push({
        d: bx + by,
        f: () => (side === 'pirate' ? drawCannon(v, bx, by, toward) : drawBellTower(v, bx, by)),
      });
    }
    const [px0, py0] = hw(side, PEAK.u, PEAK.w);
    const ghost =
      focus !== null &&
      (side === 'pirate'
        ? behind(v, px0, py0, focus, 150, 470)
        : behind(v, px0, py0, focus, PEAK.r * 1.3, 330));
    fade[side] += ((ghost ? GHOST : 1) - fade[side]) * Math.min(1, dt * 6);
    if (on(px0, py0, 420)) {
      const a = fade[side];
      out.push({
        d: px0 + py0,
        f: () => {
          v.ctx.globalAlpha = a;
          if (side === 'pirate') drawGreatTree(v, px0, py0);
          else drawPeak(v, px0, py0);
          v.ctx.globalAlpha = 1;
        },
      });
    }
    if (side === 'ninja' && on(LIFT13.x, LIFT13.y, 200))
      out.push({ d: LIFT13.x + LIFT13.y, f: () => drawChairlift(v, LIFT13.x, LIFT13.y, px0, py0) });
    TREES13.forEach(([u, w], i) => {
      const [tx, ty] = hw(side, u, w);
      if (!on(tx, ty, 90)) return;
      out.push({
        d: tx + ty,
        f: () =>
          side === 'pirate'
            ? drawPalm7(v, tx, ty, i)
            : i % 3 === 1
              ? drawBlossom(v, tx, ty, i)
              : drawPine(v, tx, ty, i),
      });
    });
    const c = CRATES13[side];
    if (on(c.x, c.y, 40)) out.push({ d: c.x + c.y + 10, f: () => drawCrates13(v, side) });
  }
  if (on(ENDLESS.x, ENDLESS.y, 120)) out.push({ d: ENDLESS.x + ENDLESS.y, f: () => drawWreck(v) });
  return out;
}
