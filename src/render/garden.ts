/**
 * Drawing the Garden Isle (world/garden.ts): its shallows following the shore, a ring of sand and then grass, lush and
 * soft, with sandy paths from the pier's root to the plot and the stalls. The plot is edged with low planks; six beds are
 * dug, dark soil in rows, and the rest are staked out with string. The seed stall has a green-and-cream awning, the sell
 * stand a blue one with baskets, the gear shed a red roof; all three are shut for now, a cloth down over the counter.
 * A windmill turns at the back, fruit trees stand round it, and a scarecrow keeps watch over the staked-out corner.
 */

import type { DrawView } from '../entities/entity';
import {
  BED,
  BEDS,
  BEDS_START,
  CRATES14,
  fromGarden,
  GARDEN,
  GEAR_SHED,
  PIER14,
  PIER14_Z,
  PLOT14,
  SCARECROW,
  SEED_STALL,
  SELL_STAND,
  type Stall,
  shoreRG,
  TREES14,
  WINDMILL,
} from '../world/garden';
import type { Point } from '../world/island';
import type { Solid } from './layers';

const N = 96;
const SAND = '#F2D79B';
const GRASS = '#7CC36A';
const GRASS_LIGHT = '#95D47F';
const GRASS_DARK = '#5FA752';
const SOIL = '#7A5236';
const SOIL_DARK = '#5E3D27';
const PLANK = '#B48A5A';
const PLANK_DARK = '#7A5230';
const PATH = '#E8CF94';

/** Its outline, pushed out (or in) by off, as a path on the canvas. */
function outline(v: DrawView, off: number): void {
  const { ctx, px, py } = v;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = Math.max(10, shoreRG(a) + off);
    const [x, y] = fromGarden(Math.cos(a) * r, Math.sin(a) * r);
    if (i === 0) ctx.moveTo(px(x, y), py(x, y));
    else ctx.lineTo(px(x, y), py(x, y));
  }
  ctx.closePath();
}

/** A path round a box in the garden's own frame, at height z. */
function frameBox(v: DrawView, u0: number, v0: number, u1: number, v1: number, z = 0): void {
  framePoly(
    v,
    [
      [u0, v0],
      [u1, v0],
      [u1, v1],
      [u0, v1],
    ],
    z,
  );
}

/** A closed path through points in the garden's own frame, at height z. */
function framePoly(v: DrawView, pts: readonly (readonly [number, number])[], z = 0): void {
  const { ctx, px, py } = v;
  ctx.beginPath();
  pts.forEach(([u, w], i) => {
    const [x, y] = fromGarden(u, w);
    if (i === 0) ctx.moveTo(px(x, y), py(x, y, z));
    else ctx.lineTo(px(x, y), py(x, y, z));
  });
  ctx.closePath();
}

/** A box's footprint in the world, from its middle and half sizes in the frame. */
function footprint(u: number, w: number, hu: number, hv: number): Point[] {
  return [
    fromGarden(u - hu, w - hv),
    fromGarden(u + hu, w - hv),
    fromGarden(u + hu, w + hv),
    fromGarden(u - hu, w + hv),
  ];
}

const near = (v: DrawView, m: number) => v.onScreen(GARDEN.x, GARDEN.y, m * v.zoom);

/** Its shallows, in rings following the shore. */
export function drawGardenSea(v: DrawView): void {
  const { ctx } = v;
  if (!near(v, 1300)) return;
  outline(v, 260);
  ctx.fillStyle = '#1F7480';
  ctx.fill();
  outline(v, 130);
  ctx.fillStyle = '#33A0A5';
  ctx.fill();
  outline(v, 50);
  ctx.fillStyle = '#7ED0C0';
  ctx.fill();
}

/** Sandy paths: pier root to the plot's edge, and on to each stall's front. */
const PATHS: readonly (readonly [number, number])[][] = [
  [
    [PIER14.u0 + 10, PIER14.v],
    [PLOT14.u1, PIER14.v - 10],
  ],
  [
    [PIER14.u0 - 20, PIER14.v],
    [SEED_STALL.front.u, SEED_STALL.front.v],
  ],
  [
    [PIER14.u0 - 20, PIER14.v],
    [SELL_STAND.front.u, SELL_STAND.front.v],
  ],
  [
    [PLOT14.u0, PLOT14.v0 + 20],
    [GEAR_SHED.front.u, GEAR_SHED.front.v],
  ],
];

/** The ground, the paths, the plot and its beds, and the pier. */
export function drawGardenFlat(v: DrawView): void {
  const { ctx, T, px, py } = v;
  const Z = v.zoom;
  if (!near(v, 1000)) return;
  outline(v, 8 + Math.sin(T * 1.3) * 3);
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 4 * Z;
  ctx.stroke();
  outline(v, 0);
  ctx.fillStyle = SAND;
  ctx.fill();
  outline(v, -28);
  ctx.fillStyle = GRASS_DARK;
  ctx.fill();
  outline(v, -36);
  ctx.fillStyle = GRASS;
  ctx.fill();
  // Soft lighter patches in the grass, toward the light.
  ctx.fillStyle = GRASS_LIGHT;
  for (const [u, w, r] of PATCHES) {
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const [x, y] = fromGarden(u + Math.cos(a) * r, w + Math.sin(a) * r * 0.8);
      if (i === 0) ctx.moveTo(px(x, y), py(x, y));
      else ctx.lineTo(px(x, y), py(x, y));
    }
    ctx.fill();
  }
  // The paths.
  ctx.strokeStyle = PATH;
  ctx.lineCap = 'round';
  ctx.lineWidth = 22 * Z;
  for (const p of PATHS) {
    ctx.beginPath();
    p.forEach(([u, w], i) => {
      const [x, y] = fromGarden(u, w);
      if (i === 0) ctx.moveTo(px(x, y), py(x, y));
      else ctx.lineTo(px(x, y), py(x, y));
    });
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  drawPlot(v);
  drawPier14(v);
}

/** Lighter patches in the grass: where, and how big, in the frame. */
const PATCHES: readonly [number, number, number][] = [
  [-120, -60, 60],
  [-40, 150, 50],
  [-200, 40, 38],
  [150, 170, 40],
  [-90, -170, 36],
];

/** The plot: its plank edging, the six dug beds and the rest staked out with string. */
function drawPlot(v: DrawView): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  // Inside the edging the grass is worn a little shorter.
  frameBox(v, PLOT14.u0, PLOT14.v0, PLOT14.u1, PLOT14.v1);
  ctx.fillStyle = '#86BF6C';
  ctx.fill();
  // The edging: low planks all round, with a gap on the pier's side to step through.
  ctx.strokeStyle = PLANK_DARK;
  ctx.lineWidth = 5 * Z;
  frameBox(v, PLOT14.u0, PLOT14.v0, PLOT14.u1, PLOT14.v1, 3);
  ctx.stroke();
  ctx.strokeStyle = PLANK;
  ctx.lineWidth = 3 * Z;
  ctx.stroke();
  const h = BED / 2;
  BEDS.forEach((b, i) => {
    if (i < BEDS_START) {
      // Dug: dark soil, raised a little, its furrows across it.
      frameBox(v, b.u - h, b.v - h, b.u + h, b.v + h);
      ctx.fillStyle = SOIL_DARK;
      ctx.fill();
      frameBox(v, b.u - h + 2, b.v - h + 2, b.u + h - 2, b.v + h - 2, 2);
      ctx.fillStyle = SOIL;
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,36,20,.55)';
      ctx.lineWidth = 1.4 * Z;
      for (let k = -h + 8; k < h - 4; k += 8) {
        framePoly(
          v,
          [
            [b.u + k, b.v - h + 4],
            [b.u + k, b.v + h - 4],
          ],
          2,
        );
        ctx.stroke();
      }
    } else {
      // Staked out: a peg at each corner and string between.
      ctx.strokeStyle = 'rgba(255,246,229,.75)';
      ctx.lineWidth = 1 * Z;
      frameBox(v, b.u - h, b.v - h, b.u + h, b.v + h, 2);
      ctx.stroke();
      ctx.fillStyle = PLANK_DARK;
      for (const [du, dv] of [
        [-h, -h],
        [h, -h],
        [h, h],
        [-h, h],
      ] as const) {
        const [x, y] = fromGarden(b.u + du, b.v + dv);
        ctx.fillRect(v.px(x, y) - 1.2 * Z, v.py(x, y, 5) - 1 * Z, 2.4 * Z, 6 * Z);
      }
    }
  });
  // A few butterflies over the dug beds.
  ctx.fillStyle = '#FFF6E5';
  for (let i = 0; i < 3; i++) {
    const b = BEDS[i * 2] as { u: number; v: number };
    const [x, y] = fromGarden(
      b.u + Math.sin(T * 0.7 + i) * 20,
      b.v + Math.cos(T * 0.5 + i * 2) * 16,
    );
    const flap = Math.abs(Math.sin(T * 9 + i)) * 3 * Z;
    const sx = v.px(x, y);
    const sy = v.py(x, y, 18 + Math.sin(T * 2 + i) * 4);
    ctx.beginPath();
    ctx.ellipse(sx - flap * 0.7, sy, flap + 0.6 * Z, 2.2 * Z, 0, 0, Math.PI * 2);
    ctx.ellipse(sx + flap * 0.7, sy, flap + 0.6 * Z, 2.2 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The pier out toward home, its planks across it. */
function drawPier14(v: DrawView): void {
  const { ctx } = v;
  const Z = v.zoom;
  const h = PIER14.half;
  frameBox(v, PIER14.u0, PIER14.v - h, PIER14.u1, PIER14.v + h, PIER14_Z);
  ctx.fillStyle = PLANK;
  ctx.fill();
  ctx.strokeStyle = PLANK_DARK;
  ctx.lineWidth = 1.2 * Z;
  ctx.stroke();
  for (let u = PIER14.u0 + 14; u < PIER14.u1; u += 16) {
    framePoly(
      v,
      [
        [u, PIER14.v - h],
        [u, PIER14.v + h],
      ],
      PIER14_Z,
    );
    ctx.stroke();
  }
}

/** The colours of a stall: its walls, its counter's top, and its awning's two stripes. */
type StallLook = { wall: string; top: string; a: string; b: string };
const SEED_LOOK: StallLook = { wall: '#B9874F', top: '#D9A86A', a: '#5BAF5A', b: '#FFF6E5' };
const SELL_LOOK: StallLook = { wall: '#A87B48', top: '#D2A266', a: '#3E8FD0', b: '#FFF6E5' };

/** A stall: a wooden counter, an awning in stripes over it on poles, and a cloth down over the front, shut for now. */
function drawStall(v: DrawView, s: Stall, look: StallLook): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  v.extrude(footprint(s.u, s.v, s.hu, s.hv), 0, 16, look.wall, look.top);
  // Poles at the front corners, and the awning on them, sloping down toward the front.
  const fv = s.v + s.hv;
  const bv = s.v - s.hv;
  ctx.strokeStyle = '#7A5230';
  ctx.lineWidth = 2 * Z;
  for (const du of [-s.hu, s.hu]) {
    const [x, y] = fromGarden(s.u + du, fv);
    ctx.beginPath();
    ctx.moveTo(px(x, y), py(x, y, 0));
    ctx.lineTo(px(x, y), py(x, y, 38));
    ctx.stroke();
  }
  const stripes = 6;
  for (let i = 0; i < stripes; i++) {
    const u0 = s.u - s.hu - 4 + ((2 * s.hu + 8) * i) / stripes;
    const u1 = s.u - s.hu - 4 + ((2 * s.hu + 8) * (i + 1)) / stripes;
    const pts: [number, number, number][] = [
      [u0, bv - 2, 46],
      [u1, bv - 2, 46],
      [u1, fv + 6, 36],
      [u0, fv + 6, 36],
    ];
    ctx.beginPath();
    pts.forEach(([u, w, z], k) => {
      const [x, y] = fromGarden(u, w);
      if (k === 0) ctx.moveTo(px(x, y), py(x, y, z));
      else ctx.lineTo(px(x, y), py(x, y, z));
    });
    ctx.closePath();
    ctx.fillStyle = i % 2 ? look.b : look.a;
    ctx.fill();
  }
  // The scalloped front edge of the awning.
  ctx.fillStyle = look.a;
  for (let i = 0; i < stripes; i++) {
    const u = s.u - s.hu - 4 + ((2 * s.hu + 8) * (i + 0.5)) / stripes;
    const [x, y] = fromGarden(u, fv + 6);
    ctx.beginPath();
    ctx.arc(px(x, y), py(x, y, 36), 3.2 * Z, 0, Math.PI);
    ctx.fill();
  }
  // The cloth down over the counter's front: shut.
  framePoly(
    v,
    [
      [s.u - s.hu + 2, fv + 1],
      [s.u + s.hu - 2, fv + 1],
    ],
    0,
  );
  const [ax, ay] = fromGarden(s.u - s.hu + 2, fv + 1);
  const [bx, by] = fromGarden(s.u + s.hu - 2, fv + 1);
  ctx.beginPath();
  ctx.moveTo(px(ax, ay), py(ax, ay, 15));
  ctx.lineTo(px(bx, by), py(bx, by, 15));
  ctx.lineTo(px(bx, by), py(bx, by, 3));
  ctx.lineTo(px(ax, ay), py(ax, ay, 3));
  ctx.closePath();
  ctx.fillStyle = 'rgba(232,214,180,.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(122,82,48,.6)';
  ctx.lineWidth = 1 * Z;
  ctx.stroke();
}

/** The seed stall, with seed packets pinned along its awning's poles. */
function drawSeedStall(v: DrawView): void {
  drawStall(v, SEED_STALL, SEED_LOOK);
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const s = SEED_STALL;
  const colours = ['#E4572E', '#FFC53D', '#9B59D0', '#3E8FD0'];
  colours.forEach((c, i) => {
    const [x, y] = fromGarden(s.u - s.hu + 6 + i * ((2 * s.hu - 12) / 3), s.v);
    ctx.fillStyle = c;
    ctx.fillRect(px(x, y) - 2.5 * Z, py(x, y, 24), 5 * Z, 7 * Z);
  });
}

/** The sell stand, with empty baskets on its counter, waiting. */
function drawSellStand(v: DrawView): void {
  drawStall(v, SELL_STAND, SELL_LOOK);
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const s = SELL_STAND;
  for (const du of [-9, 9]) {
    const [x, y] = fromGarden(s.u + du, s.v);
    ctx.fillStyle = '#C79A5B';
    ctx.beginPath();
    ctx.ellipse(px(x, y), py(x, y, 18), 6 * Z, 3 * Z, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#8A6234';
    ctx.lineWidth = 1 * Z;
    ctx.beginPath();
    ctx.ellipse(px(x, y), py(x, y, 18), 6 * Z, 3 * Z, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** The gear shed: plank walls, a red roof, its door shut, a watering can by it. */
function drawGearShed(v: DrawView): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const s = GEAR_SHED;
  v.extrude(footprint(s.u, s.v, s.hu, s.hv), 0, 30, '#A87B48', '#C99A63');
  // The roof: a ridge along u, sloping down front and back.
  const ridge = 46;
  const eave = 28;
  for (const side of [-1, 1]) {
    const pts: [number, number, number][] = [
      [s.u - s.hu - 4, s.v, ridge],
      [s.u + s.hu + 4, s.v, ridge],
      [s.u + s.hu + 4, s.v + side * (s.hv + 5), eave],
      [s.u - s.hu - 4, s.v + side * (s.hv + 5), eave],
    ];
    ctx.beginPath();
    pts.forEach(([u, w, z], k) => {
      const [x, y] = fromGarden(u, w);
      if (k === 0) ctx.moveTo(px(x, y), py(x, y, z));
      else ctx.lineTo(px(x, y), py(x, y, z));
    });
    ctx.closePath();
    ctx.fillStyle = side > 0 ? '#C8483A' : '#A9362B';
    ctx.fill();
  }
  // The door, shut.
  const [dx, dy] = fromGarden(s.u, s.v + s.hv);
  ctx.fillStyle = '#6B4628';
  ctx.fillRect(px(dx, dy) - 6 * Z, py(dx, dy, 22), 12 * Z, 22 * Z * 0.9);
  ctx.fillStyle = '#FFC53D';
  ctx.fillRect(px(dx, dy) + 3 * Z, py(dx, dy, 11), 1.6 * Z, 1.6 * Z);
  // A watering can by the door.
  const [wx, wy] = fromGarden(s.u + s.hu - 4, s.v + s.hv + 9);
  ctx.fillStyle = '#9AA9B0';
  ctx.fillRect(px(wx, wy) - 4 * Z, py(wx, wy, 8), 8 * Z, 8 * Z);
  ctx.strokeStyle = '#9AA9B0';
  ctx.lineWidth = 1.6 * Z;
  ctx.beginPath();
  ctx.moveTo(px(wx, wy) + 4 * Z, py(wx, wy, 4));
  ctx.lineTo(px(wx, wy) + 9 * Z, py(wx, wy, 10));
  ctx.stroke();
}

/** The windmill: a round white tower, a cap, and four sails turning slowly. */
function drawWindmill(v: DrawView): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const [x, y] = fromGarden(WINDMILL.u, WINDMILL.v);
  const sx = px(x, y);
  const sy = py(x, y);
  const r = WINDMILL.r * Z * 1.2;
  const h = WINDMILL.h * Z;
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 3 * Z, r * 1.2, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  // The tower, narrowing as it goes up, lit from the left.
  ctx.fillStyle = '#E9E2D2';
  ctx.beginPath();
  ctx.moveTo(sx - r, sy);
  ctx.lineTo(sx - r * 0.62, sy - h);
  ctx.lineTo(sx + r * 0.62, sy - h);
  ctx.lineTo(sx + r, sy);
  ctx.ellipse(sx, sy, r, r * 0.5, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#D3CBB8';
  ctx.beginPath();
  ctx.moveTo(sx + r * 0.15, sy + r * 0.48);
  ctx.lineTo(sx + r * 0.1, sy - h);
  ctx.lineTo(sx + r * 0.62, sy - h);
  ctx.lineTo(sx + r, sy);
  ctx.closePath();
  ctx.fill();
  // Its door and a window.
  ctx.fillStyle = '#6B4628';
  ctx.fillRect(sx - 6 * Z, sy - 20 * Z, 12 * Z, 20 * Z);
  ctx.fillStyle = '#5F7F8A';
  ctx.fillRect(sx - 4 * Z, sy - h * 0.55, 8 * Z, 10 * Z);
  // The cap.
  ctx.fillStyle = '#C8483A';
  ctx.beginPath();
  ctx.ellipse(sx, sy - h, r * 0.7, r * 0.32, 0, Math.PI, 0);
  ctx.quadraticCurveTo(sx + r * 0.5, sy - h - r * 0.9, sx, sy - h - r * 0.95);
  ctx.quadraticCurveTo(sx - r * 0.5, sy - h - r * 0.9, sx - r * 0.7, sy - h);
  ctx.fill();
  // The sails, turning, from a hub on the cap's front.
  const hx = sx;
  const hy = sy - h - r * 0.25;
  const len = h * 0.62;
  for (let i = 0; i < 4; i++) {
    const a = T * 0.6 + (i * Math.PI) / 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const ex = hx + c * len;
    const ey = hy + s * len;
    ctx.strokeStyle = '#7A5230';
    ctx.lineWidth = 2.2 * Z;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // The sail cloth along the outer part of each arm.
    const nx = -s * 7 * Z;
    const ny = c * 7 * Z;
    ctx.fillStyle = 'rgba(255,246,229,.92)';
    ctx.beginPath();
    ctx.moveTo(hx + c * len * 0.25, hy + s * len * 0.25);
    ctx.lineTo(ex, ey);
    ctx.lineTo(ex + nx, ey + ny);
    ctx.lineTo(hx + c * len * 0.25 + nx, hy + s * len * 0.25 + ny);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#5B3A22';
  ctx.beginPath();
  ctx.arc(hx, hy, 3 * Z, 0, Math.PI * 2);
  ctx.fill();
}

/** A fruit tree: a trunk, a round crown lit from the left, and fruit in it. */
function drawTree14(v: DrawView, u: number, w: number, r: number, i: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const [x, y] = fromGarden(u, w);
  const sx = px(x, y);
  const sy = py(x, y);
  const k = r * Z;
  const sway = Math.sin(T * 0.9 + i) * 1.5 * Z;
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2 * Z, k * 1.1, k * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7A5230';
  ctx.fillRect(sx - 2.5 * Z, sy - k * 1.6, 5 * Z, k * 1.6);
  ctx.fillStyle = '#4E9A46';
  ctx.beginPath();
  ctx.arc(sx + sway, sy - k * 2.1, k * 1.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#67B85A';
  ctx.beginPath();
  ctx.arc(sx + sway - k * 0.25, sy - k * 2.3, k * 0.75, 0, Math.PI * 2);
  ctx.fill();
  // Fruit: apples on some, oranges on others.
  ctx.fillStyle = i % 2 ? '#F28C28' : '#E4572E';
  for (let j = 0; j < 5; j++) {
    const a = j * 1.3 + i;
    ctx.beginPath();
    ctx.arc(
      sx + sway + Math.cos(a) * k * 0.65,
      sy - k * 2.1 + Math.sin(a) * k * 0.6,
      2.2 * Z,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

/** The scarecrow: a post, a straw hat, a patched shirt, arms out. */
function drawScarecrow(v: DrawView): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const [x, y] = fromGarden(SCARECROW.u, SCARECROW.v);
  const sx = px(x, y);
  const sy = py(x, y);
  const lean = Math.sin(T * 0.8) * 0.6 * Z;
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 1 * Z, 7 * Z, 3 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7A5230';
  ctx.fillRect(sx - 1.5 * Z, sy - 34 * Z, 3 * Z, 34 * Z);
  ctx.fillRect(sx - 14 * Z + lean, sy - 28 * Z, 28 * Z, 2.5 * Z);
  // The shirt, blue with a red patch.
  ctx.fillStyle = '#4F7FB8';
  ctx.fillRect(sx - 8 * Z + lean, sy - 30 * Z, 16 * Z, 14 * Z);
  ctx.fillStyle = '#E4572E';
  ctx.fillRect(sx + 1 * Z + lean, sy - 24 * Z, 4 * Z, 4 * Z);
  // Straw at the cuffs, the head, the hat.
  ctx.fillStyle = '#F2D07A';
  ctx.fillRect(sx - 17 * Z + lean, sy - 29 * Z, 4 * Z, 4 * Z);
  ctx.fillRect(sx + 13 * Z + lean, sy - 29 * Z, 4 * Z, 4 * Z);
  ctx.fillStyle = '#F4E3B5';
  ctx.beginPath();
  ctx.arc(sx + lean, sy - 36 * Z, 5.5 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#D9B45A';
  ctx.beginPath();
  ctx.ellipse(sx + lean, sy - 40 * Z, 10 * Z, 3 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(sx - 5 * Z + lean, sy - 46 * Z, 10 * Z, 6 * Z);
}

/** Crates beside the pier's root, where the catch goes. */
function drawCrates14(v: DrawView): void {
  const { x, y } = CRATES14;
  v.box(x - 10, y - 8, 16, 16, 0, 14, '#B97F45', '#DDAA66');
  v.box(x - 4, y - 2, 12, 12, 14, 24, '#C98B4E', '#E6B877');
  v.box(x + 9, y + 5, 10, 10, 0, 13, '#7A5230', '#9A6A3E');
}

/** Depth for something at u, w in the frame: world x + y. */
function depth(u: number, w: number): number {
  const [x, y] = fromGarden(u, w);
  return x + y;
}

/** The stalls, the windmill, the trees, the scarecrow and the crates, each a solid for the scene to sort. */
export function gardenSolids(v: DrawView): Solid[] {
  if (!near(v, 1000)) return [];
  const out: Solid[] = [];
  const on = (u: number, w: number, m = 120) => {
    const [x, y] = fromGarden(u, w);
    return v.onScreen(x, y, m * v.zoom);
  };
  if (on(SEED_STALL.u, SEED_STALL.v))
    out.push({ d: depth(SEED_STALL.u, SEED_STALL.v + SEED_STALL.hv), f: () => drawSeedStall(v) });
  if (on(SELL_STAND.u, SELL_STAND.v))
    out.push({ d: depth(SELL_STAND.u, SELL_STAND.v + SELL_STAND.hv), f: () => drawSellStand(v) });
  if (on(GEAR_SHED.u, GEAR_SHED.v))
    out.push({ d: depth(GEAR_SHED.u, GEAR_SHED.v + GEAR_SHED.hv), f: () => drawGearShed(v) });
  if (on(WINDMILL.u, WINDMILL.v, 260))
    out.push({ d: depth(WINDMILL.u, WINDMILL.v), f: () => drawWindmill(v) });
  TREES14.forEach((t, i) => {
    if (on(t.u, t.v)) out.push({ d: depth(t.u, t.v), f: () => drawTree14(v, t.u, t.v, t.r, i) });
  });
  if (on(SCARECROW.u, SCARECROW.v))
    out.push({ d: depth(SCARECROW.u, SCARECROW.v), f: () => drawScarecrow(v) });
  if (v.onScreen(CRATES14.x, CRATES14.y, 40 * v.zoom))
    out.push({ d: CRATES14.x + CRATES14.y + 10, f: () => drawCrates14(v) });
  return out;
}
