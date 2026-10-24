/**
 * Drawing the Garden Isle (world/garden.ts): its shallows following the shore, a ring of sand and then grass, lush and
 * soft, with sandy paths from the pier's root to the plot and the stalls. The plot is edged with low planks; six beds are
 * dug, dark soil in rows, and the rest are staked out with string. The seed stall has a green-and-cream awning, the sell
 * stand a blue one with baskets, the gear shed a red roof and its door open (part seven). Planted beds grow
 * their plants (gardenPlantSolids), from a sprout to a full plant with its fruit on it, and sprinklers set down in the
 * plot spray the beds round them. A windmill turns at the back, fruit trees stand round it, and a scarecrow keeps watch over the staked-out corner.
 */

import {
  type CropId,
  type Garden,
  growBed,
  grownOf,
  type Mutation,
  mutationsOn,
  type Sprinkler,
  secondsLeft,
  sizesOn,
  type Variant,
  variantsOn,
} from '../data/garden';
import type { DrawView } from '../entities/entity';
import { clockText } from '../ui/garden';
import {
  BED,
  BEDS,
  BEDS_START,
  CRATES14,
  fromGarden,
  GARDEN,
  GEAR_SHED,
  LILY_POND,
  LILY14,
  PIER14,
  PIER14_Z,
  PLOT14,
  SCARECROW,
  SEED_STALL,
  SELL_STAND,
  SPRINKLER_REACH,
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
  [
    [PLOT14.u0, LILY14.v - 20],
    [LILY14.u + LILY14.r, LILY14.v - 10],
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
  drawLilyPond(v);
  drawPlot(v);
  drawPier14(v);
}

/** The lily pond (part eight): a reedy rim, still green-blue water with a glint, lily pads drifting, flowers on some. */
function drawLilyPond(v: DrawView): void {
  const { ctx, T, px, py } = v;
  const Z = v.zoom;
  const p = LILY_POND;
  if (!v.onScreen(p.x, p.y, (p.r + 40) * Z)) return;
  v.isoEllipse(p.x, p.y, p.r + 8);
  ctx.fillStyle = '#6E9A48';
  ctx.fill();
  v.isoEllipse(p.x, p.y, p.r);
  ctx.fillStyle = '#4C9AA8';
  ctx.fill();
  v.isoEllipse(p.x - 12, p.y - 14, p.r * 0.45);
  ctx.fillStyle = 'rgba(255,255,255,.13)';
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    const a = i * 0.95 + 0.3;
    const d = p.r * (0.3 + (i % 3) * 0.2);
    const lx = p.x + Math.cos(a) * d;
    const ly = p.y + Math.sin(a) * d + Math.sin(T * 0.5 + i) * 1.2;
    ctx.fillStyle = i % 2 ? '#4E9A4A' : '#5DAA52';
    v.isoEllipse(lx, ly, 6.5);
    ctx.fill();
    if (i % 3 === 0) {
      ctx.fillStyle = i % 2 ? '#FFFFFF' : '#F7B6CF';
      ctx.beginPath();
      ctx.arc(px(lx, ly), py(lx, ly, 1.5), 2.2 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFE07A';
      ctx.beginPath();
      ctx.arc(px(lx, ly), py(lx, ly, 2), 0.9 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Reeds in clumps round the rim, swaying.
  ctx.strokeStyle = '#4F7A34';
  ctx.lineWidth = 1.3 * Z;
  for (let i = 0; i < 14; i++) {
    const a = i * 0.45 + (i % 2) * 0.2;
    const rx = p.x + Math.cos(a) * (p.r + 4);
    const ry = p.y + Math.sin(a) * (p.r + 4);
    const sx = px(rx, ry);
    const sy = py(rx, ry);
    const sway = Math.sin(T * 1.1 + i) * 1.2 * Z;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + sway, sy - 11 * Z);
    ctx.moveTo(sx + 2 * Z, sy);
    ctx.lineTo(sx + 3 * Z + sway, sy - 8 * Z);
    ctx.stroke();
  }
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

/** A stall: a wooden counter, and an awning in stripes over it on poles. */
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

/** The sell stand, with baskets on its counter. */
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

/** The gear shed: plank walls, a red roof, its door open on the dark inside, a watering can by it. */
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
  // The door, open: the dark inside, a rake against the wall, and the door swung back.
  const [dx, dy] = fromGarden(s.u, s.v + s.hv);
  ctx.fillStyle = '#3B2A1C';
  ctx.fillRect(px(dx, dy) - 6 * Z, py(dx, dy, 22), 12 * Z, 22 * Z * 0.9);
  ctx.strokeStyle = '#B98B57';
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  ctx.moveTo(px(dx, dy) - 2 * Z, py(dx, dy, 2));
  ctx.lineTo(px(dx, dy) + 2 * Z, py(dx, dy, 19));
  ctx.stroke();
  ctx.fillStyle = '#6B4628';
  ctx.beginPath();
  ctx.moveTo(px(dx, dy) - 6 * Z, py(dx, dy, 22));
  ctx.lineTo(px(dx, dy) - 13 * Z, py(dx, dy, 22) + 4 * Z);
  ctx.lineTo(px(dx, dy) - 13 * Z, py(dx, dy, 0) + 4 * Z);
  ctx.lineTo(px(dx, dy) - 6 * Z, py(dx, dy, 0));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFC53D';
  ctx.fillRect(px(dx, dy) - 12 * Z, py(dx, dy, 11) + 3 * Z, 1.6 * Z, 1.6 * Z);
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

const TALL: ReadonlySet<CropId> = new Set([
  'tomato',
  'sweetcorn',
  'papaya',
  'coconut',
  'dragonfruit',
]);

/** A plant in a bed, at screen x, y: grown this far (0 to 1), with this many ripe fruit on it, swaying a little. */
function drawPlant(
  v: DrawView,
  k: CropId,
  sx: number,
  sy: number,
  f: number,
  ripe: number,
  w: readonly number[],
  vs: readonly Variant[],
  T: number,
  i: number,
): void {
  const { ctx } = v;
  const Z = v.zoom;
  const sway = Math.sin(T * 1.6 + i * 1.3) * 1.2 * Z;
  // Each ripe fruit drawn at its own size; a giant bigger, but kept to its bed.
  const sz = (j: number) => Math.min(2.2, w[j] ?? 1);
  // A Gold fruit is gold, a Rainbow one runs through every colour.
  const tint = (j: number, base: string) =>
    vs[j] === 'gold'
      ? '#F5C542'
      : vs[j] === 'rainbow'
        ? `hsl(${Math.round((T * 140 + j * 70) % 360)}, 85%, 60%)`
        : base;
  // The low crops a little larger than life, so they read on a phone; the tall ones as they are, so they keep to their beds.
  const s = (0.35 + 0.65 * f) * (TALL.has(k) ? 1 : 1.4) * Z;
  const leaf = (dx: number, dy: number, rx: number, ry: number, a: number, c: string) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(sx + dx * s + sway * (-dy / 20), sy + dy * s, rx * s, ry * s, a, 0, Math.PI * 2);
    ctx.fill();
  };
  if (k === 'carrot') {
    // Feathery tops; once ripe, the orange shoulder shows at the soil.
    if (ripe) {
      ctx.fillStyle = tint(0, '#F28C28');
      ctx.beginPath();
      ctx.ellipse(sx, sy - 1 * Z, 5 * Z * sz(0), 3 * Z * sz(0), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#4E9A3E';
    ctx.lineWidth = 2 * Z;
    ctx.lineCap = 'round';
    for (const a of [-0.7, -0.3, 0, 0.35, 0.7]) {
      ctx.beginPath();
      ctx.moveTo(sx, sy - 2 * Z);
      ctx.quadraticCurveTo(
        sx + Math.sin(a) * 6 * s + sway,
        sy - 10 * s,
        sx + Math.sin(a) * 9 * s + sway * 1.6,
        sy - 18 * s,
      );
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    return;
  }
  if (k === 'strawberry') {
    // A low clump of leaves, its berries round the edge: green while growing, red when ripe.
    for (const [dx, dy, a] of [
      [-6, -4, -0.5],
      [6, -4, 0.5],
      [0, -8, 0],
      [-3, -1, -0.2],
      [4, -1, 0.3],
    ] as const)
      leaf(dx, dy, 5, 3.4, a, dy < -6 ? '#5FAE4E' : '#4E9A3E');
    if (f >= 1) {
      const spots: [number, number][] = [
        [-9, 1],
        [9, 1],
        [-3, 3],
        [4, 3],
      ];
      spots.forEach(([dx, dy], j) => {
        ctx.fillStyle = j < ripe ? tint(j, '#E4413A') : '#CFE7A5';
        ctx.beginPath();
        ctx.arc(sx + dx * s, sy + dy * s, (j < ripe ? 2.8 * sz(j) : 1.8) * s, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    return;
  }
  const ball = (dx: number, dy: number, r: number, c: string) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(sx + dx * s + sway * (-dy / 30), sy + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  };
  const line = (pts: readonly (readonly [number, number])[], w: number, c: string) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = w * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach(([dx, dy], j) => {
      const x = sx + dx * s + sway * (-dy / 30);
      const y = sy + dy * s;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.lineCap = 'butt';
  };
  /** The fruit at these spots: ripe in its colour, still growing small and pale, none until the plant is grown. */
  const fruit = (
    spots: readonly (readonly [number, number])[],
    r: number,
    on: string,
    off: string,
  ) => {
    if (f < 1) return;
    spots.forEach(([dx, dy], j) => {
      ball(dx, dy, j < ripe ? r * sz(j) : r * 0.6, j < ripe ? tint(j, on) : off);
    });
  };
  if (k === 'sweetpotato') {
    // A low spreading vine, heart-shaped leaves; ripe, a purple tuber shows at the soil.
    if (ripe) ball(0, 0, 5 * sz(0), tint(0, '#B4566B'));
    for (const [dx, dy, a] of [
      [-8, -3, -0.6],
      [8, -3, 0.6],
      [-3, -7, -0.2],
      [4, -8, 0.3],
      [0, -2, 0],
    ] as const)
      leaf(dx, dy, 4.5, 3.6, a, dy < -6 ? '#6DB55A' : '#4E9A3E');
    return;
  }
  if (k === 'tomato') {
    line(
      [
        [4, 0],
        [4, -28],
      ],
      1.4,
      '#8A6234',
    );
    for (const [dx, dy, a] of [
      [-4, -8, -0.4],
      [2, -14, 0.3],
      [-3, -20, -0.3],
      [3, -25, 0.2],
    ] as const)
      leaf(dx, dy, 5, 3, a, '#4E9A3E');
    fruit(
      [
        [-6, -11],
        [6, -16],
        [-4, -23],
      ],
      3.2,
      '#E4413A',
      '#9CCB6B',
    );
    return;
  }
  if (k === 'sweetcorn') {
    line(
      [
        [0, 0],
        [0, -36],
      ],
      2.4,
      '#6DA544',
    );
    for (const [x1, y1] of [
      [-10, -16],
      [10, -20],
      [-9, -28],
      [9, -32],
    ] as const)
      line(
        [
          [0, y1 + 8],
          [x1, y1],
        ],
        1.8,
        '#4E9A3E',
      );
    if (f >= 1)
      [
        [3, -18],
        [-3, -24],
        [3, -29],
      ].forEach(([dx, dy], j) => {
        leaf(
          dx as number,
          dy as number,
          2.4 * (j < ripe ? sz(j) : 1),
          5 * (j < ripe ? sz(j) : 1),
          0.2,
          j < ripe ? tint(j, '#F2C94C') : '#B7D98A',
        );
      });
    return;
  }
  if (k === 'pineapple') {
    // A rosette of spiky leaves, the fruit up in its middle.
    for (const a of [-1.2, -0.7, -0.25, 0.25, 0.7, 1.2])
      line(
        [
          [0, -2],
          [Math.sin(a) * 13, -2 - Math.cos(a) * 9],
        ],
        1.8,
        '#4E8F4A',
      );
    if (f >= 1) {
      leaf(
        0,
        -9,
        5 * (ripe ? sz(0) : 1),
        7 * (ripe ? sz(0) : 1),
        0,
        ripe ? tint(0, '#F2B33D') : '#8DBE5A',
      );
      line(
        [
          [0, -16],
          [-2, -21],
        ],
        1.4,
        '#4E9A3E',
      );
      line(
        [
          [0, -16],
          [2, -21],
        ],
        1.4,
        '#4E9A3E',
      );
    }
    return;
  }
  if (k === 'papaya' || k === 'coconut') {
    // A little tree: a trunk, a crown of long leaves, the fruit hanging under it.
    const palm = k === 'coconut';
    const h = palm ? 40 : 30;
    line(
      [
        [0, 0],
        [palm ? 3 : 0, -h / 2],
        [palm ? 2 : 0, -h],
      ],
      palm ? 3 : 2.4,
      palm ? '#8A6234' : '#9C8A6A',
    );
    for (const a of [-2.4, -1.6, -0.8, 0.8, 1.6, 2.4])
      line(
        [
          [palm ? 2 : 0, -h],
          [Math.sin(a) * 14, -h - Math.cos(a) * 6 + 4],
        ],
        1.8,
        '#4E9A3E',
      );
    fruit(
      [
        [-3, -h + 4],
        [4, -h + 5],
        [0, -h + 8],
      ],
      palm ? 3.2 : 3,
      palm ? '#7A5230' : '#F28C28',
      '#8DBE5A',
    );
    return;
  }
  if (k === 'dragonfruit') {
    // A climbing cactus, its flat arms, the pink fruit at their ends.
    for (const pts of [
      [
        [0, 0],
        [0, -22],
      ],
      [
        [0, -10],
        [-9, -16],
        [-9, -24],
      ],
      [
        [0, -14],
        [9, -19],
        [9, -27],
      ],
    ] as const)
      line(pts, 3, '#5DAA55');
    fruit(
      [
        [0, -24],
        [-9, -26],
        [9, -29],
      ],
      3.2,
      '#E8508F',
      '#A9D47F',
    );
    return;
  }
  if (k === 'lantern') {
    // A curling vine and its gourds, glowing warm at night like the lanternfish.
    line(
      [
        [-10, -2],
        [-4, -10],
        [4, -8],
        [10, -16],
      ],
      1.6,
      '#4E9A3E',
    );
    leaf(-6, -8, 4, 3, -0.4, '#5FAE4E');
    leaf(7, -12, 4, 3, 0.4, '#5FAE4E');
    if (f >= 1)
      [
        [-6, -4],
        [3, -6],
        [9, -12],
      ].forEach(([dx, dy], j) => {
        const on = j < ripe;
        if (on && v.dark > 0.05)
          ball(dx as number, dy as number, 8, `rgba(255,214,120,${0.35 * v.dark})`);
        leaf(
          dx as number,
          dy as number,
          on ? 4 * sz(j) : 2.4,
          on ? 4.6 * sz(j) : 2.8,
          0,
          on ? tint(j, '#F7A93B') : '#B7D98A',
        );
      });
    return;
  }
  if (k === 'moonpetal') {
    // The Moonkoi's gift: a silvery vine climbing a little hoop, its fruit pale crescent moons that glow blue at night.
    ctx.strokeStyle = '#8A9AA8';
    ctx.lineWidth = 1.4 * Z;
    ctx.beginPath();
    ctx.ellipse(sx, sy - 10 * s, 9 * s, 10 * s, 0, Math.PI, 0);
    ctx.stroke();
    line(
      [
        [-9, -2],
        [-8, -12],
        [0, -20],
        [8, -12],
        [9, -2],
      ],
      1.6,
      '#5E8C6A',
    );
    leaf(-8, -10, 3.4, 2.4, -0.6, '#7FB08A');
    leaf(7, -14, 3.4, 2.4, 0.6, '#7FB08A');
    leaf(0, -20, 3, 2.2, 0, '#9CC6A4');
    if (f >= 1)
      [
        [-8, -14],
        [2, -19],
        [8, -9],
      ].forEach(([dx, dy], j) => {
        const on = j < ripe;
        if (on && v.dark > 0.05)
          ball(dx as number, dy as number, 7, `rgba(175,192,255,${0.45 * v.dark})`);
        const r = (on ? 3.6 * sz(j) : 2) * s;
        const x = sx + (dx as number) * s + sway;
        const y = sy + (dy as number) * s;
        ctx.fillStyle = on ? tint(j, '#EEF2FA') : '#C8D8C4';
        ctx.beginPath();
        ctx.arc(x, y, r, 0.6, Math.PI * 2 - 0.6);
        ctx.arc(x + r * 0.55, y, r * 0.8, Math.PI * 2 - 0.9, 0.9, true);
        ctx.closePath();
        ctx.fill();
      });
    return;
  }
  if (k === 'kraken') {
    // A great purple squash, swelling as it grows, its vines curling like tentacles.
    for (let j = 0; j < 4; j++) {
      const a = (j / 4) * Math.PI * 2 + 0.4;
      const w = Math.sin(T * 1.2 + j) * 3;
      line(
        [
          [Math.cos(a) * 6, -2 + Math.sin(a) * 3],
          [Math.cos(a) * 13 + w, -2 + Math.sin(a) * 6],
          [Math.cos(a) * 17, -6 + Math.sin(a) * 7 - w],
        ],
        1.6,
        j % 2 ? '#4E9A3E' : '#6A3A9A',
      );
    }
    leaf(
      0,
      -6,
      (6 + 5 * f) * (ripe ? sz(0) : 1),
      (5 + 4 * f) * (ripe ? sz(0) : 1),
      0,
      ripe ? tint(0, '#7E4FB0') : '#8E6FB8',
    );
    leaf(-2, -8 - 2 * f, 3 * f, 2 * f, 0, 'rgba(255,255,255,.25)');
    return;
  }
  // Blueberry: a little round bush, berries in clusters, pale until ripe.
  ctx.fillStyle = '#7A5230';
  ctx.fillRect(sx - 1.2 * s, sy - 8 * s, 2.4 * s, 8 * s);
  leaf(0, -16, 11, 9, 0, '#3F8A44');
  leaf(-4, -19, 7, 6, 0, '#4E9A4E');
  if (f >= 1) {
    const spots: [number, number][] = [
      [-6, -14],
      [5, -12],
      [1, -20],
      [7, -19],
    ];
    spots.forEach(([dx, dy], j) => {
      const on = j < ripe;
      ctx.fillStyle = on ? tint(j, '#3E5FB8') : '#C9D7A0';
      for (const [ox, oy] of [
        [0, 0],
        [2.2, 1],
        [-1.6, 1.6],
      ] as const) {
        ctx.beginPath();
        ctx.arc(
          sx + (dx + ox) * s + sway,
          sy + (dy + oy) * s,
          (on ? 1.9 * sz(j) : 1.3) * s,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    });
  }
}

/** A small pill over a growing bed saying how long it has to go. */
function drawTimer(v: DrawView, sx: number, sy: number, text: string): void {
  const { ctx } = v;
  ctx.font = '800 11px Grandstander, system-ui, sans-serif';
  const w = ctx.measureText(text).width + 12;
  const h = 16;
  const x = sx - w / 2;
  const y = sy - h;
  ctx.fillStyle = 'rgba(18,48,58,.78)';
  ctx.beginPath();
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + w - 8, y);
  ctx.arc(x + w - 8, y + 8, 8, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + 8, y + h);
  ctx.arc(x + 8, y + 8, 8, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.fill();
  ctx.fillStyle = '#FFF6E5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, sx, y + h / 2 + 1);
}

/**
 * The plants in the beds, each a solid for the scene to sort, at the time now. With timers on (ashore on the isle), a
 * growing bed says how long it has to go and a ripe one twinkles.
 */
export function gardenPlantSolids(v: DrawView, g: Garden, now: number, timers: boolean): Solid[] {
  if (!near(v, 1000)) return [];
  const out: Solid[] = [];
  (g.beds ?? []).forEach((b, i) => {
    const at = BEDS[i];
    if (!b || !at) return;
    const [x, y] = fromGarden(at.u, at.v);
    if (!v.onScreen(x, y, 60 * v.zoom)) return;
    growBed(b, now);
    out.push({
      d: x + y + 1,
      f: () => {
        const sx = v.px(x, y);
        const sy = v.py(x, y, 2);
        drawPlant(v, b.crop, sx, sy, grownOf(b, now), b.ripe, sizesOn(b), variantsOn(b), v.T, i);
        // Gold and Rainbow fruit sparkle, ashore or not.
        variantsOn(b).forEach((vt, j) => {
          if (!vt) return;
          const k = 0.5 + 0.5 * Math.sin(v.T * 6 + j * 2 + i);
          v.ctx.fillStyle =
            vt === 'gold'
              ? `rgba(255,236,150,${0.5 + 0.5 * k})`
              : `rgba(255,255,255,${0.5 + 0.5 * k})`;
          v.star(sx + (j - 1) * 8 * v.zoom, sy - (18 + 6 * k) * v.zoom, (3 + 2 * k) * v.zoom);
        });
        // The weather's marks, each fruit's in a row under its sparkle.
        mutationsOn(b).forEach((mu, j) => {
          mu.forEach((m, q) => {
            drawMark(v, m, sx + (j - 1) * 8 * v.zoom + q * 6 * v.zoom, sy - 10 * v.zoom);
          });
        });
        if (!timers) return;
        if (b.ripe > 0) {
          const k = 0.5 + 0.5 * Math.sin(v.T * 4 + i);
          v.ctx.fillStyle = `rgba(255,236,150,${0.45 + 0.5 * k})`;
          v.star(sx + 10 * v.zoom, sy - 26 * v.zoom - k * 3 * v.zoom, (4.5 + 2.5 * k) * v.zoom);
        } else {
          const left = secondsLeft(b, now);
          if (left > 0) drawTimer(v, sx, sy - 26 * v.zoom, clockText(left));
        }
      },
    });
  });
  // The Moonkoi's mount on the gear shed's front wall, once one has been landed.
  if ((g.koi?.n ?? 0) > 0) {
    const [mx, my] = fromGarden(GEAR_SHED.u + 14, GEAR_SHED.v + GEAR_SHED.hv + 1);
    if (v.onScreen(mx, my, 60 * v.zoom))
      out.push({ d: mx + my + 2, f: () => drawKoiMount(v, mx, my, g.koi?.n ?? 0) });
  }
  for (const s of g.spr ?? []) {
    if (s.to <= now) continue;
    const [x, y] = fromGarden(s.u, s.v);
    if (!v.onScreen(x, y, 80 * v.zoom)) continue;
    out.push({ d: x + y + 1.5, f: () => drawSprinkler(v, s, now, timers) });
  }
  return out;
}

/** A sprinkler in the plot: its reach a faint ring of wet on the ground, a post and a turning head throwing drops round
 * it, gold for a gold one, and, ashore, a dial of the time it has left. */
function drawSprinkler(v: DrawView, s: Sprinkler, now: number, timers: boolean): void {
  const { ctx } = v;
  const Z = v.zoom;
  const [x, y] = fromGarden(s.u, s.v);
  const sx = v.px(x, y);
  const sy = v.py(x, y, 0);
  const gold = s.k === 'goldsprinkler';
  // Its reach on the ground: the isometric ellipse of a circle of SPRINKLER_REACH.
  const rx = SPRINKLER_REACH * Z * Math.SQRT2;
  ctx.fillStyle = 'rgba(120,190,230,.16)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, rx, rx / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // The drops, flung out round the turning head and falling.
  const spin = v.T * 2.4;
  ctx.fillStyle = 'rgba(170,220,250,.85)';
  for (let k = 0; k < 14; k++) {
    const f = (v.T * 0.9 + k / 14) % 1;
    const a = spin + k * 2.4;
    const r = f * rx;
    ctx.beginPath();
    ctx.arc(
      sx + Math.cos(a) * r,
      sy + (Math.sin(a) * r) / 2 - (14 + 22 * f * (1 - f) * 2) * Z,
      1.6 * Z,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = gold ? '#C9962B' : '#6E7F86';
  ctx.fillRect(sx - 1.2 * Z, sy - 12 * Z, 2.4 * Z, 12 * Z);
  ctx.fillStyle = gold ? '#FFC53D' : '#4FA3D9';
  ctx.beginPath();
  ctx.arc(sx, sy - 13 * Z, 3.4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.fillRect(sx + Math.cos(spin) * 3 * Z - Z, sy - 13 * Z - Z, 2 * Z, 2 * Z);
  if (!timers) return;
  // Ashore, a little dial over it emptying as it runs: words would crowd the beds' own times.
  const left = Math.max(0, Math.min(1, (s.to - now) / (s.to - s.from)));
  const cy = sy - 26 * Z;
  ctx.fillStyle = 'rgba(255,246,229,.92)';
  ctx.beginPath();
  ctx.arc(sx, cy, 6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = gold ? '#E0A82E' : '#4FA3D9';
  ctx.beginPath();
  ctx.moveTo(sx, cy);
  ctx.arc(sx, cy, 4.6 * Z, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}

/**
 * The Moonkoi (part nine), drawn at screen x, y: a long moon-pale koi with pale blue patches and trailing fins, facing
 * ang, its tail swung by wag, and glowing softly in the dark (glow 0 to 1).
 */
export function drawMoonkoi(
  v: DrawView,
  x: number,
  y: number,
  len: number,
  ang: number,
  wag: number,
  glow: number,
  alpha = 1,
): void {
  const { ctx } = v;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  ctx.globalAlpha = alpha;
  if (glow > 0) {
    ctx.fillStyle = `rgba(175,192,255,${0.3 * glow})`;
    ctx.beginPath();
    ctx.ellipse(x, y, len * 1.5, len * 0.8, ang, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tail, then fins, then the body over them.
  const tx = x - ca * len * 0.85;
  const ty = y - sa * len * 0.85;
  const ta = ang + wag;
  ctx.fillStyle = 'rgba(230,238,255,.85)';
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.quadraticCurveTo(
    tx - Math.cos(ta - 0.5) * len * 0.5,
    ty - Math.sin(ta - 0.5) * len * 0.5,
    tx - Math.cos(ta - 0.8) * len * 0.9,
    ty - Math.sin(ta - 0.8) * len * 0.9,
  );
  ctx.lineTo(tx - Math.cos(ta + 0.8) * len * 0.9, ty - Math.sin(ta + 0.8) * len * 0.9);
  ctx.quadraticCurveTo(
    tx - Math.cos(ta + 0.5) * len * 0.5,
    ty - Math.sin(ta + 0.5) * len * 0.5,
    tx,
    ty,
  );
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(
      x + ca * len * 0.2 - sa * side * len * 0.32,
      y + sa * len * 0.2 + ca * side * len * 0.32,
      len * 0.28,
      len * 0.12,
      ang + side * 0.9,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = '#EEF2FA';
  ctx.beginPath();
  ctx.ellipse(x, y, len, len * 0.34, ang, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8FB2F0';
  for (const [k, r] of [
    [0.45, 0.16],
    [-0.1, 0.2],
    [-0.55, 0.12],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(x + ca * len * k, y + sa * len * k, len * r, len * r * 0.7, ang, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1E2E4A';
  ctx.beginPath();
  ctx.arc(
    x + ca * len * 0.78 - sa * len * 0.1,
    y + sa * len * 0.78 + ca * len * 0.1,
    Math.max(1, len * 0.05),
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Under the lily pads after dark, until it has risen tonight: a long pale shape circling slowly, to say it is there. */
export function drawKoiShadow(v: DrawView): void {
  const p = LILY_POND;
  if (!v.onScreen(p.x, p.y, (p.r + 20) * v.zoom)) return;
  const a = v.T * 0.35;
  const r = p.r * 0.5;
  const x = p.x + Math.cos(a) * r;
  const y = p.y + Math.sin(a) * r;
  const sx = v.px(x, y);
  const sy = v.py(x, y, 0);
  // Facing along its circle, on the screen.
  const ax = v.px(x - Math.sin(a), y + Math.cos(a)) - sx;
  const ay = v.py(x - Math.sin(a), y + Math.cos(a), 0) - sy;
  drawMoonkoi(v, sx, sy, 16 * v.zoom, Math.atan2(ay, ax), Math.sin(v.T * 2) * 0.3, 0.6, 0.45);
}

/** The Moonkoi's mount on the shed: a plank board with the fish on it, and how many have been landed. */
function drawKoiMount(v: DrawView, x: number, y: number, n: number): void {
  const { ctx } = v;
  const Z = v.zoom;
  const sx = v.px(x, y);
  const sy = v.py(x, y, 15);
  ctx.fillStyle = '#5E3E26';
  ctx.beginPath();
  ctx.roundRect(sx - 14 * Z, sy - 6 * Z, 28 * Z, 12 * Z, 3 * Z);
  ctx.fill();
  ctx.fillStyle = '#7A5236';
  ctx.beginPath();
  ctx.roundRect(sx - 12.5 * Z, sy - 4.5 * Z, 25 * Z, 9 * Z, 2 * Z);
  ctx.fill();
  drawMoonkoi(v, sx + 1.5 * Z, sy, 7.5 * Z, 0, 0.2, 0);
  if (n > 1) {
    ctx.font = `800 ${Math.round(8 * Z)}px Grandstander, system-ui, sans-serif`;
    ctx.fillStyle = '#FFE07A';
    ctx.textAlign = 'center';
    ctx.fillText(`\u00d7${n}`, sx + 12 * Z, sy - 9 * Z);
  }
}

/** A watering: a can's spout of drops onto a bed, for the moment after (t from 1 down to 0). */
export function drawGardenSplash(v: DrawView, i: number, t: number): void {
  const at = BEDS[i];
  if (!at) return;
  const [x, y] = fromGarden(at.u, at.v);
  if (!v.onScreen(x, y, 80 * v.zoom)) return;
  const { ctx } = v;
  const Z = v.zoom;
  const sx = v.px(x, y);
  const sy = v.py(x, y, 2);
  ctx.fillStyle = `rgba(170,220,250,${Math.min(1, t * 2)})`;
  for (let k = 0; k < 10; k++) {
    const f = (1 - t + k / 10) % 1;
    ctx.beginPath();
    ctx.arc(sx + (k - 4.5) * 2.4 * Z, sy - (30 - 30 * f) * Z, 1.7 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = `rgba(60,40,25,${0.35 * t})`;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 16 * Z, 8 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The garden's lights in the night mask: the open stalls, a small light on each ripe bed so a player can find what to
 * pick in the dark, and a wide warm one on each ripe lantern gourd, which glows like the lanternfish.
 */
export function gardenLights(v: DrawView, g: Garden, now: number): void {
  if (!near(v, 1000)) return;
  for (const s of [SEED_STALL, SELL_STAND]) {
    const [x, y] = fromGarden(s.u, s.v);
    v.light(x, y, 30, 120, 0.8);
  }
  g.beds?.forEach((b, i) => {
    const at = BEDS[i];
    if (!b || !at) return;
    growBed(b, now);
    if (b.ripe <= 0) return;
    const [x, y] = fromGarden(at.u, at.v);
    v.light(x, y, 10, b.crop === 'lantern' ? 110 : 50, b.crop === 'lantern' ? 0.9 : 0.5);
  });
}

/** A weather mark by a fruit: drops for Wet, a spark for Shocked, a pale blue glow for Moonlit, a pink one for Twilight. */
function drawMark(v: DrawView, m: Mutation, x: number, y: number): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  if (m === 'wet') {
    ctx.fillStyle = '#7FC8F0';
    for (const [dx, dy] of [
      [0, 0],
      [3, 3],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x + dx * Z, y + dy * Z + ((T * 6 + dx) % 3) * Z, 1.4 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (m === 'shocked') {
    ctx.strokeStyle = Math.sin(T * 20) > 0 ? '#BFF4FF' : '#5FD3FF';
    ctx.lineWidth = 1.4 * Z;
    ctx.beginPath();
    ctx.moveTo(x, y - 4 * Z);
    ctx.lineTo(x + 2 * Z, y);
    ctx.lineTo(x - 1 * Z, y + 1 * Z);
    ctx.lineTo(x + 1.5 * Z, y + 5 * Z);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = m === 'moonlit' ? 'rgba(170,200,255,.55)' : 'rgba(255,150,190,.55)';
  ctx.beginPath();
  ctx.arc(x, y, (2.6 + Math.sin(T * 2) * 0.5) * Z, 0, Math.PI * 2);
  ctx.fill();
}

/** A bolt of lightning down onto a bed, for a moment after it strikes (t counts down from 0.6). */
export function drawGardenBolt(v: DrawView, i: number, t: number): void {
  const at = BEDS[i];
  if (!at) return;
  const [x, y] = fromGarden(at.u, at.v);
  if (!v.onScreen(x, y, 400 * v.zoom)) return;
  const { ctx } = v;
  const sx = v.px(x, y);
  const sy = v.py(x, y, 6);
  ctx.strokeStyle = `rgba(230,250,255,${Math.min(1, t * 2.5)})`;
  ctx.lineWidth = 3 * v.zoom;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(sx + 30 * v.zoom, sy - 320 * v.zoom);
  for (let k = 1; k <= 6; k++)
    ctx.lineTo(sx + (k % 2 ? -14 : 12) * v.zoom * (1 - k / 7), sy - 320 * v.zoom * (1 - k / 6));
  ctx.stroke();
  ctx.fillStyle = `rgba(200,240,255,${Math.min(0.6, t)})`;
  ctx.beginPath();
  ctx.arc(sx, sy, 18 * v.zoom, 0, Math.PI * 2);
  ctx.fill();
}
