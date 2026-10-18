/**
 * Your headquarters' courtyard (data/hq.ts): the castle's plans on a table near the way in, where its upgrades are
 * built, and the garden, once it is: an apple tree, a row of carrots and a banana plant, a little star twinkling over
 * each while today's snack is still to be picked.
 */

import type { DrawView } from '../entities/entity';

/** A box standing on the floor from z0 to z1, w along x and d along y from (x, y): its two near faces and its top. */
function box(
  v: DrawView,
  x: number,
  y: number,
  w: number,
  d: number,
  z0: number,
  z1: number,
  side: string,
  top: string,
): void {
  const { ctx, px, py } = v;
  const face = (pts: [number, number, number][], c: string) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    pts.forEach(([a, b, z], i) => {
      if (i) ctx.lineTo(px(a, b), py(a, b, z));
      else ctx.moveTo(px(a, b), py(a, b, z));
    });
    ctx.closePath();
    ctx.fill();
  };
  face(
    [
      [x, y + d, z0],
      [x + w, y + d, z0],
      [x + w, y + d, z1],
      [x, y + d, z1],
    ],
    side,
  );
  face(
    [
      [x + w, y, z0],
      [x + w, y + d, z0],
      [x + w, y + d, z1],
      [x + w, y, z1],
    ],
    side,
  );
  face(
    [
      [x, y, z1],
      [x + w, y, z1],
      [x + w, y + d, z1],
      [x, y + d, z1],
    ],
    top,
  );
}

function shadow(v: DrawView, x: number, y: number, r: number): void {
  v.ctx.fillStyle = 'rgba(0,0,0,.22)';
  v.isoEllipse(x, y, r);
  v.ctx.fill();
}

/** A star twinkling over (x, y) at height z, for something there to be had. */
function twinkle(v: DrawView, x: number, y: number, z: number, ph: number): void {
  const k = 0.6 + 0.4 * Math.sin(v.T * 4 + ph);
  v.ctx.fillStyle = v.coin;
  v.ctx.globalAlpha = k;
  v.star(v.px(x, y), v.py(x, y, z + Math.sin(v.T * 2 + ph) * 2), 4.5 * v.zoom * k);
  v.ctx.globalAlpha = 1;
}

/** The castle's plans: a heavy table, a big sheet unrolled on it with the castle drawn in brown ink, an ink pot and
 * a quill. */
export function drawPlans(v: DrawView, x: number, y: number): void {
  const { ctx, px, py, zoom: Z } = v;
  shadow(v, x, y, 26);
  for (const [dx, dy] of [
    [-18, -10],
    [14, -10],
    [-18, 8],
    [14, 8],
  ] as const)
    box(v, x + dx, y + dy, 3, 3, 0, 18, '#4A2E18', '#6A4426');
  box(v, x - 20, y - 12, 40, 24, 18, 22, '#5A3A22', '#8A5E36');
  // The sheet, curling at either end.
  const sheet: [number, number][] = [
    [-16, -9],
    [14, -9],
    [14, 9],
    [-16, 9],
  ];
  ctx.fillStyle = '#F2E6C4';
  ctx.beginPath();
  sheet.forEach(([a, b], i) => {
    if (i) ctx.lineTo(px(x + a, y + b), py(x + a, y + b, 22.4));
    else ctx.moveTo(px(x + a, y + b), py(x + a, y + b, 22.4));
  });
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#E2D2A6';
  for (const a of [-16, 14]) {
    ctx.beginPath();
    ctx.ellipse(px(x + a, y), py(x + a, y, 23.5), 2.4 * Z, 9 * Z, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // The castle on it: walls, two towers, a gate.
  ctx.strokeStyle = '#6A4A2A';
  ctx.lineWidth = 1 * Z;
  const ink = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([a, b], i) => {
      if (i) ctx.lineTo(px(x + a, y + b), py(x + a, y + b, 22.6));
      else ctx.moveTo(px(x + a, y + b), py(x + a, y + b, 22.6));
    });
    ctx.stroke();
  };
  ink([
    [-10, -5],
    [8, -5],
    [8, 5],
    [-10, 5],
    [-10, -5],
  ]);
  ink([
    [-10, -5],
    [-12, -7],
  ]);
  ink([
    [8, 5],
    [10, 7],
  ]);
  ink([
    [-1, 5],
    [-1, 2],
    [1, 2],
    [1, 5],
  ]);
  // The ink pot and the quill.
  box(v, x + 8, y + 3, 4, 4, 22, 26, '#1E2A3A', '#2E3E54');
  ctx.strokeStyle = '#F4F1E6';
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  ctx.moveTo(px(x + 10, y + 5), py(x + 10, y + 5, 26));
  ctx.lineTo(px(x + 4, y + 9), py(x + 4, y + 9, 38));
  ctx.stroke();
}

export type GardenPlant = 'apple' | 'carrot' | 'banana';

/** One of the garden's plants, in its patch of dark earth, a star over it while today's snack is to be picked. */
export function drawGardenPlant(
  v: DrawView,
  kind: GardenPlant,
  x: number,
  y: number,
  ready: boolean,
): void {
  const { ctx, px, py, zoom: Z, T } = v;
  ctx.fillStyle = '#5A3E26';
  v.isoEllipse(x, y, kind === 'carrot' ? 24 : 18);
  ctx.fill();
  ctx.fillStyle = '#6E4C2E';
  v.isoEllipse(x, y, kind === 'carrot' ? 18 : 12);
  ctx.fill();
  if (kind === 'apple') {
    // A little tree: a trunk, a round green crown and red apples in it.
    ctx.strokeStyle = '#6A4426';
    ctx.lineWidth = 4 * Z;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px(x, y), py(x, y, 0));
    ctx.lineTo(px(x, y), py(x, y, 30));
    ctx.stroke();
    const sway = Math.sin(T * 0.8) * 0.6 * Z;
    for (const [dx, dz, r, c] of [
      [-8, 34, 11, '#3E7A3A'],
      [8, 34, 11, '#3E7A3A'],
      [0, 42, 13, '#4E9446'],
      [-4, 48, 8, '#5EA352'],
    ] as const) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(px(x, y) + dx * Z + sway, py(x, y, dz), r * Z, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#E0453A';
    for (const [dx, dz] of [
      [-9, 32],
      [6, 38],
      [-2, 44],
      [10, 30],
    ] as const) {
      ctx.beginPath();
      ctx.arc(px(x, y) + dx * Z + sway, py(x, y, dz), 2.6 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
    if (ready) twinkle(v, x, y, 62, 0);
    return;
  }
  if (kind === 'carrot') {
    // A row of carrots: orange shoulders out of the earth, feathery green tops.
    for (let i = 0; i < 4; i++) {
      const cx = x - 12 + i * 8;
      const cy = y + 4 - i * 3;
      ctx.fillStyle = '#F07A2A';
      ctx.beginPath();
      ctx.ellipse(px(cx, cy), py(cx, cy, 1.5), 2.6 * Z, 1.8 * Z, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4E9A3E';
      ctx.lineWidth = 1.6 * Z;
      for (const a of [-0.5, 0, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(px(cx, cy), py(cx, cy, 2));
        ctx.quadraticCurveTo(
          px(cx, cy) + a * 6 * Z,
          py(cx, cy, 8),
          px(cx, cy) + (a * 10 + Math.sin(T * 1.5 + i) * 1.2) * Z,
          py(cx, cy, 13),
        );
        ctx.stroke();
      }
    }
    if (ready) twinkle(v, x, y, 26, 2);
    return;
  }
  // A banana plant: big arching leaves, and a bunch of yellow bananas under them.
  ctx.strokeStyle = '#4E7A34';
  ctx.lineWidth = 4 * Z;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, 0));
  ctx.lineTo(px(x, y), py(x, y, 26));
  ctx.stroke();
  ctx.fillStyle = '#5E9E3E';
  for (const a of [-2.4, -1.6, -0.8, 0.2, 1]) {
    const tip = a + Math.sin(T * 0.9 + a) * 0.05;
    ctx.beginPath();
    ctx.ellipse(
      px(x, y) + Math.cos(tip) * 12 * Z,
      py(x, y, 30) + Math.sin(tip) * 6 * Z,
      14 * Z,
      4 * Z,
      tip,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = '#F2C230';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(
      px(x, y) + (4 + i * 2) * Z,
      py(x, y, 22 - i * 2),
      4 * Z,
      1.6 * Z,
      -0.6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  if (ready) twinkle(v, x, y, 46, 4);
}

/** The forge: a stone hearth under a hood with its chimney, coals glowing in it (brighter while it is worked), an
 * anvil beside it and a pair of bellows; and a star over it until your weapons have been sharpened there. */
export function drawForge(v: DrawView, x: number, y: number, sharp: boolean, work: number): void {
  const { ctx, px, py, zoom: Z, T } = v;
  shadow(v, x, y, 34);
  // The hearth, and its coals.
  box(v, x - 18, y - 16, 30, 26, 0, 20, '#6A6A66', '#8C8C86');
  const glow = 0.55 + 0.25 * Math.sin(T * 5) + work * 0.4;
  const g = ctx.createRadialGradient(
    px(x - 3, y - 3),
    py(x - 3, y - 3, 21),
    0,
    px(x - 3, y - 3),
    py(x - 3, y - 3, 21),
    16 * Z,
  );
  g.addColorStop(0, `rgba(255,214,120,${Math.min(1, glow)})`);
  g.addColorStop(0.5, `rgba(242,122,42,${Math.min(1, glow * 0.8)})`);
  g.addColorStop(1, 'rgba(242,122,42,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(px(x - 3, y - 3), py(x - 3, y - 3, 21), 16 * Z, 0, Math.PI * 2);
  ctx.fill();
  // The hood and its chimney, behind.
  box(v, x - 18, y - 16, 30, 6, 20, 34, '#5A5A56', '#7A7A74');
  box(v, x - 10, y - 14, 12, 6, 34, 58, '#5A5A56', '#7A7A74');
  // Smoke curling up from the chimney.
  ctx.fillStyle = 'rgba(200,200,196,.35)';
  for (let i = 0; i < 3; i++) {
    const k = (T * 0.4 + i / 3) % 1;
    ctx.beginPath();
    ctx.arc(
      px(x - 4, y - 11) + Math.sin(k * 6 + i) * 4 * Z,
      py(x - 4, y - 11, 60 + k * 40),
      (3 + k * 6) * Z,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // The anvil, on its block.
  box(v, x + 18, y + 10, 8, 8, 0, 10, '#5A3A22', '#7A5230');
  box(v, x + 14, y + 11, 16, 6, 10, 15, '#3A3E42', '#5A6066');
  ctx.fillStyle = '#5A6066';
  ctx.beginPath();
  ctx.moveTo(px(x + 30, y + 11), py(x + 30, y + 11, 15));
  ctx.lineTo(px(x + 37, y + 14), py(x + 37, y + 14, 14));
  ctx.lineTo(px(x + 30, y + 17), py(x + 30, y + 17, 15));
  ctx.closePath();
  ctx.fill();
  // The bellows, by the hearth.
  ctx.fillStyle = '#7A5230';
  ctx.beginPath();
  ctx.ellipse(px(x - 26, y + 8), py(x - 26, y + 8, 6), 7 * Z, 4 * Z, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Sparks off the anvil while it is worked.
  if (work > 0) {
    ctx.fillStyle = '#FFD86A';
    for (let i = 0; i < 8; i++) {
      const a = i * 0.8 + T * 9;
      const r = (1 - work) * 18 + 4;
      ctx.fillRect(
        px(x + 24, y + 14) + Math.cos(a) * r * Z,
        py(x + 24, y + 14, 18) - Math.abs(Math.sin(a)) * r * Z,
        2 * Z,
        2 * Z,
      );
    }
  }
  if (!sharp) twinkle(v, x + 22, y + 14, 34, 1);
}

/** A flat face of a wall, from (x0, y0) to (x1, y1) along the floor and z0 to z1 up it, filled. */
function face(
  v: DrawView,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  z1: number,
  c: string,
): void {
  const { ctx, px, py } = v;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(px(x0, y0), py(x0, y0, z0));
  ctx.lineTo(px(x1, y1), py(x1, y1, z0));
  ctx.lineTo(px(x1, y1), py(x1, y1, z1));
  ctx.lineTo(px(x0, y0), py(x0, y0, z1));
  ctx.closePath();
  ctx.fill();
}

/** The tower's height, to the top of its walk. */
export const TOWER_TALL = 170;

/**
 * The bigger tower: a tall square lookout of the castle's grey-green stone standing on its wall, arrow slits up it,
 * a wooden door at its foot on the courtyard's side, merlons round its top and a pennant flying over them.
 */
export function drawHqTower(v: DrawView, x: number, y: number): void {
  const { ctx, px, py, zoom: Z, T } = v;
  const h = 20;
  const top = TOWER_TALL;
  shadow(v, x, y, 30);
  box(v, x - h, y - h, h * 2, h * 2, 0, top, '#5C6B62', '#7A8A7E');
  // The right-hand face a shade darker, and courses of stone round it.
  face(v, x + h, y - h, x + h, y + h, 0, top, 'rgba(0,0,0,.14)');
  ctx.strokeStyle = 'rgba(30,40,34,.35)';
  ctx.lineWidth = 1 * Z;
  for (let z = 24; z < top; z += 24) {
    ctx.beginPath();
    ctx.moveTo(px(x - h, y + h), py(x - h, y + h, z));
    ctx.lineTo(px(x + h, y + h), py(x + h, y + h, z));
    ctx.lineTo(px(x + h, y - h), py(x + h, y - h, z));
    ctx.stroke();
  }
  // Arrow slits up both faces.
  for (const z of [62, 104, 146]) {
    face(v, x - 2, y + h, x + 2, y + h, z - 10, z + 10, '#1E2622');
    face(v, x + h, y - 2, x + h, y + 2, z - 10, z + 10, '#1E2622');
  }
  // The door at its foot, toward the courtyard, under a round arch.
  face(v, x + 4, y + h, x + 18, y + h, 0, 24, '#5A3A22');
  ctx.fillStyle = '#5A3A22';
  ctx.beginPath();
  ctx.arc(px(x + 11, y + h), py(x + 11, y + h, 24), 7 * Z, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#C9A24A';
  ctx.beginPath();
  ctx.arc(px(x + 15, y + h), py(x + 15, y + h, 12), 1.2 * Z, 0, Math.PI * 2);
  ctx.fill();
  // Merlons round the top, the far ones first, then the pennant's pole, then the near ones over its foot.
  const merlons: [number, number][] = [
    [-h, -h],
    [-4, -h],
    [h - 8, -h],
    [-h, -4],
    [-h, h - 8],
    [-4, h - 8],
    [h - 8, h - 8],
    [h - 8, -4],
  ];
  merlons.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [dx, dy] of merlons)
    if (dx + dy < 0) box(v, x + dx, y + dy, 8, 8, top, top + 12, '#5C6B62', '#7A8A7E');
  ctx.strokeStyle = '#3A2A1A';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, top));
  ctx.lineTo(px(x, y), py(x, y, top + 46));
  ctx.stroke();
  for (const [dx, dy] of merlons)
    if (dx + dy >= 0) box(v, x + dx, y + dy, 8, 8, top, top + 12, '#5C6B62', '#7A8A7E');
  // The pennant, flying over it.
  const wave = Math.sin(T * 3) * 3 * Z;
  ctx.fillStyle = v.coin;
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, top + 46));
  ctx.quadraticCurveTo(
    px(x, y) + 12 * Z,
    py(x, y, top + 42) + wave,
    px(x, y) + 24 * Z,
    py(x, y, top + 40) + wave,
  );
  ctx.lineTo(px(x, y), py(x, y, top + 34));
  ctx.closePath();
  ctx.fill();
}
