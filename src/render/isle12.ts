/**
 * Drawing Skull Island (world/isle12.ts): its shallows following the shore, and the skull itself, bone-white rock gone
 * grey and cracked with age, shadowed toward its edges so its cranium looks round. Its eye sockets and the hole of its
 * nose are deep black pits with a red glow far down in each eye; across its face the mouth, a dark line with the huge
 * teeth standing up along it; the pier out off its chin with crates at its root, and old bones lying about. Skrill's
 * tower stands on the crown: black stone with a bone-white skull over its door and purple light in its windows.
 */

import type { DrawView } from '../entities/entity';
import {
  CRANIUM,
  CRATES12,
  EYES,
  fromSkull,
  NOSE,
  PIER12,
  PIER12_Z,
  SHORE_C,
  SKULL,
  shoreR12,
  TEETH,
  TOWER12,
} from '../world/isle12';
import type { Solid } from './layers';

const N = 120;
const BONE = '#F1EEE6';
const BONE_SHADE = '#D9D4C8';
const BONE_DEEP = '#B7B1A4';
const CRACK = 'rgba(90,78,60,.55)';
const PIT = '#120E0C';
const PIT_RIM = '#8C8068';

/** Its outline, pushed out (or in) by off, as a path on the canvas. */
function outline(v: DrawView, off: number): void {
  const { ctx, px, py } = v;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = Math.max(10, shoreR12(a) + off);
    const [x, y] = fromSkull(SHORE_C.u + Math.cos(a) * r, SHORE_C.v + Math.sin(a) * r);
    if (i === 0) ctx.moveTo(px(x, y), py(x, y));
    else ctx.lineTo(px(x, y), py(x, y));
  }
  ctx.closePath();
}

/** A path round an ellipse in the skull's own frame. */
function frameEllipse(v: DrawView, u: number, w: number, ru: number, rv: number, z = 0): void {
  const { ctx, px, py } = v;
  ctx.beginPath();
  for (let i = 0; i <= 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const [x, y] = fromSkull(u + Math.cos(a) * ru, w + Math.sin(a) * rv);
    if (i === 0) ctx.moveTo(px(x, y), py(x, y, z));
    else ctx.lineTo(px(x, y), py(x, y, z));
  }
  ctx.closePath();
}

/** A path through points in the skull's own frame. */
function framePath(v: DrawView, pts: readonly [number, number][], z = 0): void {
  const { ctx, px, py } = v;
  ctx.beginPath();
  pts.forEach(([u, w], i) => {
    const [x, y] = fromSkull(u, w);
    if (i === 0) ctx.moveTo(px(x, y), py(x, y, z));
    else ctx.lineTo(px(x, y), py(x, y, z));
  });
}

const near = (v: DrawView, m: number) => v.onScreen(SKULL.x, SKULL.y, m * v.zoom);

/** Its shallows, in rings following the shore. */
export function drawIsle12Sea(v: DrawView): void {
  const { ctx } = v;
  if (!near(v, 2400)) return;
  outline(v, 300);
  ctx.fillStyle = '#1B6E78';
  ctx.fill();
  outline(v, 150);
  ctx.fillStyle = '#2F989E';
  ctx.fill();
  outline(v, 55);
  ctx.fillStyle = '#73C9BD';
  ctx.fill();
}

/** The skull's rock, its holes and its mouth, and the pier off its chin. */
export function drawIsle12Flat(v: DrawView): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  if (!near(v, 2000)) return;
  outline(v, 8 + Math.sin(T * 1.3) * 3);
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 4 * Z;
  ctx.stroke();
  // The rock, darker toward its edges, so the cranium reads round.
  outline(v, 0);
  ctx.fillStyle = BONE_DEEP;
  ctx.fill();
  outline(v, -40);
  ctx.fillStyle = BONE_SHADE;
  ctx.fill();
  outline(v, -110);
  ctx.fillStyle = BONE;
  ctx.fill();
  // A sheen on the dome of the cranium, toward the top left.
  frameEllipse(v, -225, -405, CRANIUM.ru * 0.45, CRANIUM.rv * 0.35);
  ctx.fillStyle = 'rgba(255,252,240,.45)';
  ctx.fill();
  // Cracks across it, old and dark.
  ctx.strokeStyle = CRACK;
  ctx.lineWidth = 2.2 * Z;
  ctx.lineJoin = 'round';
  for (const crack of CRACKS) {
    framePath(v, crack);
    ctx.stroke();
  }
  // The eye sockets: deep pits, a rim of shadow, and a red glow far down in each.
  for (const e of EYES) {
    frameEllipse(v, e.u, e.v, e.ru + 14, e.rv + 12);
    ctx.fillStyle = PIT_RIM;
    ctx.fill();
    frameEllipse(v, e.u, e.v, e.ru, e.rv);
    ctx.fillStyle = PIT;
    ctx.fill();
    const glow = 0.35 + 0.2 * Math.sin(T * 1.7 + e.u);
    frameEllipse(v, e.u, e.v + 20, e.ru * 0.25, e.rv * 0.22);
    ctx.fillStyle = `rgba(255,60,40,${glow})`;
    ctx.fill();
  }
  // The nose: a dark hole pointing down.
  framePath(v, [
    [-NOSE.half - 10, NOSE.v0 - 8],
    [NOSE.half + 10, NOSE.v0 - 8],
    [8, NOSE.v1 + 10],
    [-8, NOSE.v1 + 10],
  ]);
  ctx.closePath();
  ctx.fillStyle = PIT_RIM;
  ctx.fill();
  framePath(v, [
    [-NOSE.half, NOSE.v0],
    [NOSE.half, NOSE.v0],
    [0, NOSE.v1],
  ]);
  ctx.closePath();
  ctx.fillStyle = PIT;
  ctx.fill();
  // The mouth: a dark line across the face where the teeth stand.
  framePath(v, [
    [-425, 946],
    [425, 946],
    [425, 974],
    [-425, 974],
  ]);
  ctx.closePath();
  ctx.fillStyle = 'rgba(40,30,24,.8)';
  ctx.fill();
  // Old bones lying about.
  ctx.strokeStyle = '#F4EEDD';
  ctx.lineCap = 'round';
  for (const [u, w, a] of BONES) {
    const [x0, y0] = fromSkull(u - Math.cos(a) * 22, w - Math.sin(a) * 22);
    const [x1, y1] = fromSkull(u + Math.cos(a) * 22, w + Math.sin(a) * 22);
    ctx.lineWidth = 4 * Z;
    ctx.beginPath();
    ctx.moveTo(v.px(x0, y0), v.py(x0, y0));
    ctx.lineTo(v.px(x1, y1), v.py(x1, y1));
    ctx.stroke();
    ctx.fillStyle = '#F4EEDD';
    for (const [x, y] of [
      [x0, y0],
      [x1, y1],
    ] as const) {
      ctx.beginPath();
      ctx.arc(v.px(x, y), v.py(x, y), 3.4 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.lineCap = 'butt';
  drawPier12(v);
}

/** The pier out off its chin, its planks across it. */
function drawPier12(v: DrawView): void {
  const { ctx } = v;
  const Z = v.zoom;
  const h = PIER12.half;
  framePath(
    v,
    [
      [-h, PIER12.v0],
      [h, PIER12.v0],
      [h, PIER12.v1],
      [-h, PIER12.v1],
    ],
    PIER12_Z,
  );
  ctx.closePath();
  ctx.fillStyle = '#B48A5A';
  ctx.fill();
  ctx.strokeStyle = '#7A5230';
  ctx.lineWidth = 1.2 * Z;
  ctx.stroke();
  for (let w = PIER12.v0 + 14; w < PIER12.v1; w += 16) {
    framePath(
      v,
      [
        [-h, w],
        [h, w],
      ],
      PIER12_Z,
    );
    ctx.stroke();
  }
}

/** The cracks across it, in its own frame. */
const CRACKS: readonly (readonly [number, number][])[] = [
  [
    [-150, -735],
    [-115, -630],
    [-185, -550],
    [-140, -455],
  ],
  [
    [470, -625],
    [405, -540],
    [450, -425],
    [370, -335],
  ],
  [
    [-625, -135],
    [-540, -65],
    [-580, 45],
  ],
  [
    [695, 135],
    [605, 200],
    [650, 335],
  ],
  [
    [-290, 1100],
    [-225, 1165],
    [-270, 1230],
  ],
];

/** Bones lying about: where, and which way. */
const BONES: readonly [number, number, number][] = [
  [-580, -335, 0.4],
  [540, -280, 2.1],
  [-225, 695, 1.2],
  [290, 715, 2.7],
  [-715, 450, 0.9],
  [670, 515, 1.8],
  [135, 1120, 0.3],
  [-370, 1210, 2.4],
];

/** A tooth: a huge block of bone standing up out of the mouth, rounded on top. */
function drawTooth(v: DrawView, u: number, w: number, width: number, lower: boolean): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const [x, y] = fromSkull(u, w);
  const sx = px(x, y);
  const sy = py(x, y);
  const half = (width / 2) * Z * 0.9;
  const tall = (lower ? 34 : 46) * Z;
  ctx.fillStyle = '#F2ECDA';
  ctx.strokeStyle = 'rgba(90,78,60,.8)';
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  ctx.moveTo(sx - half, sy);
  ctx.lineTo(sx - half, sy - tall + half * 0.6);
  ctx.quadraticCurveTo(sx - half, sy - tall - half * 0.2, sx, sy - tall - half * 0.2);
  ctx.quadraticCurveTo(sx + half, sy - tall - half * 0.2, sx + half, sy - tall + half * 0.6);
  ctx.lineTo(sx + half, sy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(180,168,140,.6)';
  ctx.fillRect(sx + half * 0.35, sy - tall + half * 0.4, half * 0.45, tall - half * 0.4);
}

/** Skrill's tower on the crown: black stone, a bone-white skull over its door, purple light in its windows. */
function drawTower12(v: DrawView, T: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const [x, y] = fromSkull(TOWER12.u, TOWER12.v);
  const sx = px(x, y);
  const sy = py(x, y);
  const r = TOWER12.r * Z * 1.2;
  const h = TOWER12.h * Z;
  // Its shadow, its body, its top.
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 4 * Z, r * 1.15, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2A2430';
  ctx.fillRect(sx - r, sy - h, r * 2, h);
  ctx.beginPath();
  ctx.ellipse(sx, sy, r, r * 0.5, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#3A3242';
  ctx.fillRect(sx - r * 0.2, sy - h, r * 0.5, h);
  ctx.fillStyle = '#463C50';
  ctx.beginPath();
  ctx.ellipse(sx, sy - h, r, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Battlements.
  ctx.fillStyle = '#2A2430';
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.1 + (i / 5) * 0.8);
    ctx.fillRect(
      sx - Math.cos(a) * r * 0.9 - 6 * Z,
      sy - h - Math.sin(a) * r * 0.45 - 16 * Z,
      12 * Z,
      16 * Z,
    );
  }
  // Windows up it, five floors, purple light flickering.
  for (let f = 0; f < 5; f++) {
    const wy = sy - h * (0.18 + f * 0.17);
    const k = 0.6 + 0.4 * Math.sin(T * 2 + f * 1.7);
    ctx.fillStyle = `rgba(181,124,255,${k})`;
    ctx.fillRect(sx + (f % 2 ? -r * 0.55 : r * 0.25), wy, 8 * Z, 14 * Z);
  }
  // The door, and the skull over it.
  ctx.fillStyle = '#120E0C';
  ctx.beginPath();
  ctx.moveTo(sx - 14 * Z, sy + r * 0.45);
  ctx.lineTo(sx - 14 * Z, sy + r * 0.45 - 34 * Z);
  ctx.quadraticCurveTo(sx, sy + r * 0.45 - 48 * Z, sx + 14 * Z, sy + r * 0.45 - 34 * Z);
  ctx.lineTo(sx + 14 * Z, sy + r * 0.45);
  ctx.closePath();
  ctx.fill();
  const kx = sx;
  const ky = sy + r * 0.45 - 62 * Z;
  ctx.fillStyle = '#EDE6D2';
  ctx.beginPath();
  ctx.arc(kx, ky, 11 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(kx - 7 * Z, ky + 6 * Z, 14 * Z, 7 * Z);
  ctx.fillStyle = '#120E0C';
  for (const dx of [-4.5, 4.5]) {
    ctx.beginPath();
    ctx.arc(kx + dx * Z, ky - 1 * Z, 3.2 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Crates at the pier's root, where the catch goes. */
function drawCrates12(v: DrawView): void {
  const { x, y } = CRATES12;
  v.box(x - 10, y - 8, 16, 16, 0, 14, '#B97F45', '#DDAA66');
  v.box(x - 4, y - 2, 12, 12, 14, 24, '#C98B4E', '#E6B877');
  v.box(x + 9, y + 5, 10, 10, 0, 13, '#7A5230', '#9A6A3E');
}

/** Its teeth, the tower and the crates, each a solid for the scene to sort. */
export function isle12Solids(v: DrawView): Solid[] {
  if (!near(v, 2000)) return [];
  const out: Solid[] = [];
  const on = (x: number, y: number, m = 120) => v.onScreen(x, y, m * v.zoom);
  for (const t of TEETH) {
    const [x, y] = fromSkull(t.u, t.v);
    if (on(x, y)) out.push({ d: x + y, f: () => drawTooth(v, t.u, t.v, t.w, t.lower) });
  }
  const [tx, ty] = fromSkull(TOWER12.u, TOWER12.v);
  if (on(tx, ty, 400)) out.push({ d: tx + ty, f: () => drawTower12(v, v.T) });
  if (on(CRATES12.x, CRATES12.y, 40))
    out.push({ d: CRATES12.x + CRATES12.y + 10, f: () => drawCrates12(v) });
  return out;
}
