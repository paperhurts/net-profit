/**
 * The kid's islands in the Battle Barge's ring at sea (data/barge.ts SeaIsle): each a round island of sand with a
 * green middle, a foam line where it meets the water, shallows round it, and two or three palms, in island 7's style;
 * the kid's tar; and his bridges.
 */

import {
  BRIDGE_N,
  BRIDGE_U,
  BRIDGE_W,
  BRIDGE_Z,
  type BridgeAt,
  DOCK_HALF,
  DOCK_LEN,
  DOCK_Z,
  STAIR,
} from '../data/barge';
import type { DrawView } from '../entities/entity';
import { drawPalm7 } from './isle7';
import type { Solid } from './layers';

/** One where it stands in the world, and how far its sand reaches. */
export type SeaIsleAt = { x: number; y: number; r: number };

/** Its palms, from its middle, as a share of its size. */
const PALMS: readonly (readonly [number, number])[] = [
  [-0.3, -0.18],
  [0.22, -0.32],
  [0.08, 0.26],
];

/** Their shallows, in rings out from the sand. */
export function drawSeaIslesSea(v: DrawView, isles: readonly SeaIsleAt[]): void {
  const { ctx } = v;
  for (const i of isles) {
    if (!v.onScreen(i.x, i.y, (i.r + 140) * v.zoom)) continue;
    v.isoEllipse(i.x, i.y, i.r + 130);
    ctx.fillStyle = '#1F7381';
    ctx.fill();
    v.isoEllipse(i.x, i.y, i.r + 60);
    ctx.fillStyle = '#35A0A6';
    ctx.fill();
    v.isoEllipse(i.x, i.y, i.r + 22);
    ctx.fillStyle = '#7DD2C8';
    ctx.fill();
  }
}

/** Their sand and grass, with a foam line at the water. */
export function drawSeaIslesFlat(v: DrawView, isles: readonly SeaIsleAt[]): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  isles.forEach((i, k) => {
    if (!v.onScreen(i.x, i.y, (i.r + 40) * Z)) return;
    v.isoEllipse(i.x, i.y, i.r + 8 + Math.sin(T * 1.3 + k) * 3);
    ctx.strokeStyle = v.foam;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 4 * Z;
    ctx.stroke();
    ctx.globalAlpha = 1;
    v.isoEllipse(i.x, i.y, i.r);
    ctx.fillStyle = '#F2D9A0';
    ctx.fill();
    v.isoEllipse(i.x - i.r * 0.08, i.y + i.r * 0.05, i.r * 0.62);
    ctx.fillStyle = '#6FB062';
    ctx.fill();
  });
}

/**
 * The kid's tar (data/barge.ts SeaTar): a round black patch on the water, its edge wobbling, an oily sheen sliding
 * round on it and bubbles coming up and popping, in island 4's tar's colours. Drawn on the water's surface, under
 * the islands and over whatever swims beneath.
 */
export function drawSeaTar(v: DrawView, tar: readonly SeaIsleAt[]): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  tar.forEach((t, k) => {
    if (!v.onScreen(t.x, t.y, (t.r + 40) * Z)) return;
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const r = t.r * (1 + 0.05 * Math.sin(a * 3 + k + T * 0.4) + 0.03 * Math.sin(a * 7 - T * 0.3));
      const x = t.x + Math.cos(a) * r;
      const y = t.y + Math.sin(a) * r;
      if (i) ctx.lineTo(px(x, y), py(x, y));
      else ctx.moveTo(px(x, y), py(x, y));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(18,14,18,.93)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,52,56,.8)';
    ctx.lineWidth = 2 * Z;
    ctx.stroke();
    ctx.lineWidth = 3 * Z;
    for (let i = 0; i < 3; i++) {
      const rr = Math.max(1, t.r * (0.35 + i * 0.2) + Math.sin(T * 0.5 + i + k) * 6);
      ctx.strokeStyle = i % 2 ? 'rgba(120,80,160,.22)' : 'rgba(70,140,110,.18)';
      ctx.beginPath();
      ctx.ellipse(
        px(t.x, t.y),
        py(t.x, t.y),
        rr * Z,
        rr * 0.5 * Z,
        0,
        T * 0.2 + i + k,
        T * 0.2 + i + k + 1.6,
      );
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const a = i * 2.4 + k;
      const d = t.r * (0.2 + ((i * 37) % 60) / 100);
      const f = (T * 0.6 + i * 0.37 + k * 0.21) % 1;
      const bx = t.x + Math.cos(a) * d;
      const by = t.y + Math.sin(a) * d;
      ctx.fillStyle = `rgba(40,34,40,${1 - f})`;
      ctx.beginPath();
      ctx.arc(px(bx, by), py(bx, by), (1.5 + f * 4) * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Their palms, each in the depth sort. */
export function seaIslesSolids(v: DrawView, isles: readonly SeaIsleAt[]): Solid[] {
  const out: Solid[] = [];
  isles.forEach((i, k) => {
    if (!v.onScreen(i.x, i.y, (i.r + 120) * v.zoom)) return;
    PALMS.forEach(([fx, fy], n) => {
      // The smallest islands get two palms, the rest three.
      if (n === 2 && i.r < 140) return;
      const x = i.x + fx * i.r;
      const y = i.y + fy * i.r;
      out.push({ d: x + y, f: () => drawPalm7(v, x, y, k * 3 + n) });
    });
  });
  return out;
}

/** The bridges' stone, pale, its shade, and its glass. */
const STONE = '#E9EFF2';
const STONE_SIDE = '#C9D6DD';
const STONE_DARK = '#A9BAC4';
const GLASS = 'rgba(196,236,246,.38)';
const PLANK = '#A9845A';
const PLANK_SIDE = '#7E5E3C';
const POST = '#5E4329';

/** Their shadows and the foam at their feet, on the water. */
export function drawSeaBridgesWater(v: DrawView, bridges: readonly BridgeAt[]): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  for (const b of bridges) {
    if (!v.onScreen(b.x, b.y, (b.half + 120) * Z)) continue;
    const at = (t: number, o: number): [number, number] => {
      const x = b.x + BRIDGE_U.x * t + BRIDGE_N.x * o;
      const y = b.y + BRIDGE_U.y * t + BRIDGE_N.y * o;
      return [v.px(x, y), v.py(x, y)];
    };
    ctx.fillStyle = 'rgba(4,24,32,.22)';
    ctx.beginPath();
    for (const [t, o] of [
      [-b.half, -BRIDGE_W + 10],
      [b.half, -BRIDGE_W + 10],
      [b.half, BRIDGE_W + 14],
      [DOCK_HALF, BRIDGE_W + 14],
      [DOCK_HALF, BRIDGE_W + DOCK_LEN + 8],
      [-DOCK_HALF, BRIDGE_W + DOCK_LEN + 8],
      [-DOCK_HALF, BRIDGE_W + 14],
      [-b.half, BRIDGE_W + 14],
    ] as const) {
      const [x, y] = at(t, o);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    // Foam where its piers stand in the water.
    ctx.strokeStyle = v.foam;
    ctx.lineWidth = 2 * Z;
    ctx.globalAlpha = 0.6;
    for (const t of piers(b)) {
      const [x, y] = at(t, BRIDGE_W);
      ctx.beginPath();
      ctx.ellipse(x, y, (11 + Math.sin(T * 2 + t) * 2) * Z, 4 * Z, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

/** Where its piers stand along it: its ends, and about every 110 between. */
function piers(b: BridgeAt): number[] {
  const n = Math.max(2, Math.round((b.half * 2) / 110));
  return Array.from({ length: n + 1 }, (_, k) => -b.half + (k / n) * b.half * 2);
}

/**
 * Each bridge, in the depth sort from its far edge, so what stands on it or in front of it is drawn after: a pale
 * span on piers with arches between, its deck, glass rails along both sides, a lamp at each end glowing like the
 * orb, and, on its near side, a wooden dock with steps down from the deck and posts at its end.
 */
export function seaBridgeSolids(v: DrawView, bridges: readonly BridgeAt[]): Solid[] {
  return bridges
    .filter((b) => v.onScreen(b.x, b.y, (b.half + 160) * v.zoom))
    .map((b) => ({ d: b.x + b.y - BRIDGE_W * Math.SQRT2 - 1, f: () => drawBridge(v, b) }));
}

function drawBridge(v: DrawView, b: BridgeAt): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  const at = (t: number, o: number, z: number): [number, number] => {
    const x = b.x + BRIDGE_U.x * t + BRIDGE_N.x * o;
    const y = b.y + BRIDGE_U.y * t + BRIDGE_N.y * o;
    return [v.px(x, y), v.py(x, y, z)];
  };
  const quad = (pts: readonly (readonly [number, number, number])[], fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (const [t, o, z] of pts) {
      const [x, y] = at(t, o, z);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  };
  const h = b.half;
  const W = BRIDGE_W;
  const top = BRIDGE_Z;
  const under = top - 6;
  // The near face, piers and arches: the water shows through under each arch.
  const ps = piers(b);
  const pw = 8;
  ctx.fillStyle = STONE_SIDE;
  ctx.beginPath();
  let [x, y] = at(-h, W, 0);
  ctx.moveTo(x, y);
  for (const [t, z] of [
    [-h, under],
    [h, under],
    [h, 0],
  ] as const) {
    [x, y] = at(t, W, z);
    ctx.lineTo(x, y);
  }
  for (let k = ps.length - 1; k > 0; k--) {
    const a = ps[k] as number;
    const c = ps[k - 1] as number;
    [x, y] = at(a - pw, W, 0);
    ctx.lineTo(x, y);
    const [cx, cy] = at((a + c) / 2, W, under * 1.1);
    const [ex, ey] = at(c + pw, W, 0);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
  }
  ctx.closePath();
  ctx.fill();
  // The deck's near edge and its top.
  quad(
    [
      [-h, W, under],
      [h, W, under],
      [h, W, top],
      [-h, W, top],
    ],
    STONE_DARK,
  );
  quad(
    [
      [-h, -W, top],
      [h, -W, top],
      [h, W, top],
      [-h, W, top],
    ],
    STONE,
  );
  // The far rail, glass, then the lamps at its ends.
  const rail = (o: number, t0: number, t1: number) => {
    quad(
      [
        [t0, o, top],
        [t1, o, top],
        [t1, o, top + 10],
        [t0, o, top + 10],
      ],
      GLASS,
    );
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 1.6 * Z;
    ctx.beginPath();
    [x, y] = at(t0, o, top + 10);
    ctx.moveTo(x, y);
    [x, y] = at(t1, o, top + 10);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  rail(-W + 2, -h, h);
  for (const t of [-h + 6, h - 6]) {
    const [bx, by] = at(t, 0, top);
    const [lx, ly] = at(t, 0, top + 30);
    ctx.strokeStyle = STONE_DARK;
    ctx.lineWidth = 3 * Z;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.fillStyle = `rgba(214,246,255,${0.85 + Math.sin(T * 2 + t) * 0.1})`;
    ctx.beginPath();
    ctx.arc(lx, ly - 3 * Z, 4.5 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // The dock: steps down from the deck, then its planks, its near edge, and posts at its end.
  const steps = 4;
  for (let k = 0; k < steps; k++) {
    const o0 = W + (k / steps) * STAIR;
    const o1 = W + ((k + 1) / steps) * STAIR;
    const z = top + ((k + 1) / steps) * (DOCK_Z - top);
    quad(
      [
        [-DOCK_HALF, o0, z],
        [DOCK_HALF, o0, z],
        [DOCK_HALF, o1, z],
        [-DOCK_HALF, o1, z],
      ],
      k % 2 ? PLANK : '#B48E62',
    );
    quad(
      [
        [-DOCK_HALF, o1, z],
        [DOCK_HALF, o1, z],
        [DOCK_HALF, o1, z - (top - DOCK_Z) / steps],
        [-DOCK_HALF, o1, z - (top - DOCK_Z) / steps],
      ],
      PLANK_SIDE,
    );
  }
  const o0 = W + STAIR;
  const o1 = W + DOCK_LEN;
  quad(
    [
      [-DOCK_HALF, o0, DOCK_Z],
      [DOCK_HALF, o0, DOCK_Z],
      [DOCK_HALF, o1, DOCK_Z],
      [-DOCK_HALF, o1, DOCK_Z],
    ],
    PLANK,
  );
  ctx.strokeStyle = PLANK_SIDE;
  ctx.lineWidth = 1 * Z;
  for (let o = o0 + 8; o < o1; o += 8) {
    ctx.beginPath();
    [x, y] = at(-DOCK_HALF, o, DOCK_Z);
    ctx.moveTo(x, y);
    [x, y] = at(DOCK_HALF, o, DOCK_Z);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  quad(
    [
      [-DOCK_HALF, o1, DOCK_Z],
      [DOCK_HALF, o1, DOCK_Z],
      [DOCK_HALF, o1, 0],
      [-DOCK_HALF, o1, 0],
    ],
    PLANK_SIDE,
  );
  for (const t of [-DOCK_HALF + 3, DOCK_HALF - 3]) {
    const [bx, by] = at(t, o1 - 2, -2);
    const [tx, ty] = at(t, o1 - 2, DOCK_Z + 9);
    ctx.strokeStyle = POST;
    ctx.lineWidth = 4 * Z;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }
  // The near rail last, open where the dock's steps come up.
  rail(W - 1, -h, -DOCK_HALF);
  rail(W - 1, DOCK_HALF, h);
}
