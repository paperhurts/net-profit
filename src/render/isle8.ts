/**
 * Drawing islands 8 and 9: their shallows, the sand and the sandbar between,
 * island 8's green and island 9's darker marsh grass, reeds at the shores,
 * island 8's trading post, palms and tower flying the Heron's banner, and
 * island 9's dead trees, rocks and the Heron's own tower: dark stone banded with
 * alien metal, crowned with a great nest of sticks under the orb of power's
 * light. Island 8's door is barred with planks until island 7's sorcerer has
 * failed, and island 9's until the Heron has fled there; each flies the
 * player's flag once he is beaten on it, and the orb goes dark at the last.
 * Stand-in shapes, in island 7's style, until the kid draws them.
 */
import { rgba } from '../core/color';
import type { DrawView } from '../entities/entity';
import {
  BAR,
  CAMP8,
  CAMP9,
  ISLE8,
  ISLE9,
  PALMS8,
  POST8,
  REEDS8,
  ROCKS9,
  SNAGS9,
  TENTS8,
  TOWER8,
  TOWER9,
} from '../world/isle8';
import { drawPalm7 } from './isle7';
import type { Solid } from './layers';

/** What changes on the twins: whether each tower is barred, and who flies a flag on island 8's. */
export type Isle8Look = {
  barred8: boolean;
  barred9: boolean;
  /** Draws the player's flag at a screen point, or null while the Heron holds island 8's tower. */
  flag8: ((sx: number, sy: number) => void) | null;
  /** The orb of power over island 9's nest is lit; dark once the Heron is beaten for good. */
  orbLit: boolean;
  /** Draws the player's flag in the nest, or null while the Heron holds it. */
  flag9: ((sx: number, sy: number) => void) | null;
};

const MID = { x: ISLE8.x, y: (ISLE8.y + ISLE9.y) / 2 } as const;
const SPAN = ISLE9.y - ISLE8.y + ISLE8.r * 2;

function near(v: DrawView, pad: number): boolean {
  return v.onScreen(MID.x, MID.y, (SPAN / 2 + pad) * v.zoom);
}

/** Their shallows, in rings out from the sand, and a pale band over the sandbar. */
export function drawIsle8Sea(v: DrawView): void {
  if (!near(v, 340)) return;
  const { ctx } = v;
  for (const [pad, col] of [
    [330, '#20808B'],
    [180, '#35A0A6'],
    [70, '#7DD2C8'],
  ] as const) {
    ctx.fillStyle = col;
    for (const isle of [ISLE8, ISLE9]) {
      v.isoEllipse(isle.x, isle.y, isle.r + pad);
      ctx.fill();
    }
  }
}

/** A strip of ground across the world, x0..x1 by y0..y1, at the waterline. */
function strip(v: DrawView, x0: number, x1: number, y0: number, y1: number): void {
  const { ctx, px, py } = v;
  ctx.beginPath();
  ctx.moveTo(px(x0, y0), py(x0, y0));
  ctx.lineTo(px(x1, y0), py(x1, y0));
  ctx.lineTo(px(x1, y1), py(x1, y1));
  ctx.lineTo(px(x0, y1), py(x0, y1));
  ctx.closePath();
}

/** Their sand and grass, the sandbar between with foam along it, and foam at the waterline. */
export function drawIsle8Flat(v: DrawView): void {
  if (!near(v, 40)) return;
  const { ctx, T } = v;
  const Z = v.zoom;
  ctx.strokeStyle = v.foam;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 4 * Z;
  for (const [i, isle] of [ISLE8, ISLE9].entries()) {
    v.isoEllipse(isle.x, isle.y, isle.r + 9 + Math.sin(T * 1.3 + i * 2) * 3);
    ctx.stroke();
  }
  strip(v, BAR.x0 - 7, BAR.x1 + 7, BAR.y0, BAR.y1);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#EED7A0';
  for (const isle of [ISLE8, ISLE9]) {
    v.isoEllipse(isle.x, isle.y, isle.r);
    ctx.fill();
  }
  strip(v, BAR.x0, BAR.x1, BAR.y0, BAR.y1);
  ctx.fill();
  // Wet sand down the middle of the bar, where the tide last was.
  ctx.fillStyle = '#D9BE86';
  strip(v, BAR.x0 + 12, BAR.x1 - 12, BAR.y0 + 20, BAR.y1 - 20);
  ctx.fill();
  v.isoEllipse(ISLE8.x + 10, ISLE8.y - 10, ISLE8.r - 70);
  ctx.fillStyle = '#6FB062';
  ctx.fill();
  v.isoEllipse(ISLE9.x - 10, ISLE9.y + 10, ISLE9.r - 66);
  ctx.fillStyle = '#5E7F55';
  ctx.fill();
  v.isoEllipse(TOWER9.x, TOWER9.y, TOWER9.r + 30);
  ctx.fillStyle = '#4E6247';
  ctx.fill();
}

/** A clump of reeds at the shore, swaying, with brown heads. */
function drawReeds(v: DrawView, x: number, y: number, i: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const bx = px(x, y);
  const by = py(x, y);
  ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    const off = (k - 2) * 3 * Z;
    const tall = (16 + ((i * 7 + k * 5) % 9)) * Z;
    const sway = Math.sin(T * 1.4 + i + k * 0.7) * 2.5 * Z;
    ctx.strokeStyle = k % 2 ? '#7E9A4E' : '#6A8743';
    ctx.lineWidth = 1.4 * Z;
    ctx.beginPath();
    ctx.moveTo(bx + off, by);
    ctx.quadraticCurveTo(bx + off, by - tall * 0.6, bx + off + sway, by - tall);
    ctx.stroke();
    if (k % 2 === 0) {
      ctx.strokeStyle = '#6B4A2C';
      ctx.lineWidth = 2.6 * Z;
      ctx.beginPath();
      ctx.moveTo(bx + off + sway * 0.9, by - tall * 0.92);
      ctx.lineTo(bx + off + sway * 0.8, by - tall * 0.72);
      ctx.stroke();
    }
  }
}

/** A dead tree on island 9: a grey trunk and a few bare branches. */
function drawSnag(v: DrawView, x: number, y: number, i: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const bx = px(x, y);
  const by = py(x, y);
  const lean = (i % 2 ? 1 : -1) * 4 * Z;
  ctx.strokeStyle = '#6E6658';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4 * Z;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + lean, by - 44 * Z);
  ctx.stroke();
  ctx.lineWidth = 2 * Z;
  for (const [t, dx, dy] of [
    [0.55, -12, -10],
    [0.75, 11, -9],
    [0.9, -7, -8],
  ] as const) {
    const sx = bx + lean * t;
    const sy = by - 44 * Z * t;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + dx * Z, sy + dy * Z);
    ctx.stroke();
  }
}

/** A grey boulder on island 9. */
function drawRock(v: DrawView, x: number, y: number): void {
  v.extrude(
    [
      [x - 9, y - 3],
      [x - 3, y - 7],
      [x + 7, y - 6],
      [x + 9, y + 2],
      [x + 3, y + 7],
      [x - 7, y + 5],
    ],
    0,
    9,
    '#7A7F86',
    '#9AA0A7',
  );
}

/** The trading post: plank walls, a blue roof, a door on the near side. */
function drawPost8(v: DrawView): void {
  const { ctx, px, py } = v;
  const { x0, y0, x1, y1 } = POST8;
  v.box(x0 + 4, y0 + 4, x1 - x0 - 8, y1 - y0 - 8, 0, 30, '#E9D3A6', '#E9D3A6');
  ctx.fillStyle = '#6B4A2C';
  ctx.beginPath();
  ctx.moveTo(px(x0 + 16, y1 - 4), py(x0 + 16, y1 - 4, 0));
  ctx.lineTo(px(x0 + 28, y1 - 4), py(x0 + 28, y1 - 4, 0));
  ctx.lineTo(px(x0 + 28, y1 - 4), py(x0 + 28, y1 - 4, 20));
  ctx.lineTo(px(x0 + 16, y1 - 4), py(x0 + 16, y1 - 4, 20));
  ctx.closePath();
  ctx.fill();
  v.box(x0, y0, x1 - x0, y1 - y0, 30, 38, '#3E6FA8', '#5486C0');
}

type Tower = { x: number; y: number; r: number; h: number };

/** A tower's face toward the viewer, as a quad from w either side of its middle, between two heights. */
function face(v: DrawView, t: Tower, w: number, z0: number, z1: number, col: string): void {
  const { ctx, px, py } = v;
  const c = t.r * 0.924 * Math.SQRT1_2;
  const fx = t.x + c;
  const fy = t.y + c;
  const tx = -Math.SQRT1_2;
  const ty = Math.SQRT1_2;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(px(fx - tx * w, fy - ty * w), py(fx - tx * w, fy - ty * w, z0));
  ctx.lineTo(px(fx + tx * w, fy + ty * w), py(fx + tx * w, fy + ty * w, z0));
  ctx.lineTo(px(fx + tx * w, fy + ty * w), py(fx + tx * w, fy + ty * w, z1));
  ctx.lineTo(px(fx - tx * w, fy - ty * w), py(fx - tx * w, fy - ty * w, z1));
  ctx.closePath();
  ctx.fill();
}

/** Planks nailed across a door, on a tower's near face. */
function bar(v: DrawView, t: Tower): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const c = t.r * 0.924 * Math.SQRT1_2;
  const fx = t.x + c;
  const fy = t.y + c;
  const s = Math.SQRT1_2 * 9;
  ctx.strokeStyle = '#9C7A3E';
  ctx.lineWidth = 2.6 * Z;
  ctx.lineCap = 'butt';
  for (const [z0, z1] of [
    [4, 18],
    [18, 4],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(px(fx + s, fy - s), py(fx + s, fy - s, z0));
    ctx.lineTo(px(fx - s, fy + s), py(fx - s, fy + s, z1));
    ctx.stroke();
  }
}

function octagon(t: Tower): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    pts.push([t.x + Math.cos(a) * t.r, t.y + Math.sin(a) * t.r]);
  }
  return pts;
}

/** Island 8's tower: blue-grey stone, slit windows, battlements, and the Heron's banner: a white heron on midnight blue. */
function drawTower8(v: DrawView, look: Isle8Look): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const t = TOWER8;
  const pts = octagon(t);
  v.extrude(pts, 0, t.h, '#7F8A92', '#A9B2B9');
  face(v, t, 7, 0, 24, '#3A2E28');
  if (look.barred8) bar(v, t);
  for (const z of [60, 100, 136])
    face(v, t, 2, z, z + 11, v.dark > 0.3 && !look.flag8 ? '#B98AFF' : '#2B2F31');
  const top = [...pts].sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const p of top) v.box(p[0] - 4, p[1] - 4, 8, 8, t.h, t.h + 9, '#7F8A92', '#B3BBC1');
  const bx = px(t.x, t.y);
  const by = py(t.x, t.y, t.h);
  if (look.flag8) {
    // Taken: the player's flag flies there now.
    ctx.strokeStyle = '#8A6A43';
    ctx.lineWidth = 2 * Z;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx, by - 40 * Z);
    ctx.stroke();
    look.flag8(bx, by - 40 * Z);
    return;
  }
  ctx.strokeStyle = '#8A6A43';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx, by - 40 * Z);
  ctx.stroke();
  const wave = Math.sin(T * 5) * 3 * Z;
  ctx.fillStyle = '#1F2A4A';
  ctx.beginPath();
  ctx.moveTo(bx, by - 40 * Z);
  ctx.lineTo(bx + 22 * Z, by - 37 * Z + wave);
  ctx.lineTo(bx + 22 * Z, by - 23 * Z + wave);
  ctx.lineTo(bx, by - 26 * Z);
  ctx.closePath();
  ctx.fill();
  // A heron on it: a long neck and a beak.
  ctx.strokeStyle = '#F4F1E6';
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  ctx.moveTo(bx + 8 * Z, by - 27 * Z + wave * 0.5);
  ctx.quadraticCurveTo(
    bx + 14 * Z,
    by - 31 * Z + wave * 0.6,
    bx + 10 * Z,
    by - 35 * Z + wave * 0.7,
  );
  ctx.lineTo(bx + 18 * Z, by - 35 * Z + wave * 0.8);
  ctx.stroke();
}

/**
 * The Heron's tower on island 9: dark stone banded with alien metal and its lights, battlements, and on
 * top a great nest of sticks under a purple light.
 */
function drawTower9(v: DrawView, look: Isle8Look): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const t = TOWER9;
  const pts = octagon(t);
  // Built up in courses, with a band of alien metal between them, each course drawn over the band
  // below so only the band's rim shows.
  const band = pts.map(([x, y]): [number, number] => [
    t.x + (x - t.x) * 1.07,
    t.y + (y - t.y) * 1.07,
  ]);
  const BANDS = [70, 150];
  let z0 = 0;
  for (const z of [...BANDS, t.h]) {
    v.extrude(pts, z0, z, '#5C5866', '#7E7A88');
    if (z === t.h) break;
    v.extrude(band, z, z + 7, '#9AA3AD', '#B9C1C9');
    // Its lights, along the face toward the viewer.
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i - 1.5) * 0.45;
      const lx = t.x + Math.cos(a) * t.r * 1.07;
      const ly = t.y + Math.sin(a) * t.r * 1.07;
      ctx.fillStyle = Math.sin(T * 3 + i + z) > 0 ? '#7CFFB0' : '#3F8F68';
      ctx.beginPath();
      ctx.arc(px(lx, ly), py(lx, ly, z + 3.5), 1.6 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
    z0 = z + 7;
  }
  face(v, t, 8, 0, 28, '#2A2430');
  if (look.barred9) bar(v, t);
  for (const z of [110, 182]) face(v, t, 2.4, z, z + 12, '#B98AFF');
  const top = [...pts].sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const p of top) v.box(p[0] - 4.5, p[1] - 4.5, 9, 9, t.h, t.h + 10, '#5C5866', '#86829A');
  // The nest: a wide heap of sticks over the battlements.
  const nz = t.h + 12;
  v.isoEllipse(t.x, t.y, t.r + 12, nz);
  ctx.fillStyle = '#6E5236';
  ctx.fill();
  ctx.lineCap = 'round';
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const r0 = t.r + 6 + (i % 3) * 3;
    const x0 = t.x + Math.cos(a) * r0;
    const y0 = t.y + Math.sin(a) * r0;
    const x1 = t.x + Math.cos(a + 0.5) * (r0 + 6);
    const y1 = t.y + Math.sin(a + 0.5) * (r0 + 6);
    ctx.strokeStyle = i % 2 ? '#5A4128' : '#957149';
    ctx.lineWidth = 2 * Z;
    ctx.beginPath();
    ctx.moveTo(px(x0, y0), py(x0, y0, nz + (i % 4)));
    ctx.lineTo(px(x1, y1), py(x1, y1, nz + 2 + (i % 3)));
    ctx.stroke();
  }
  // Two great grey feathers stuck in it.
  for (const [dx, lean] of [
    [-14, -0.35],
    [12, 0.3],
  ] as const) {
    const fx = px(t.x + dx, t.y);
    const fy = py(t.x + dx, t.y, nz + 4);
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(lean);
    ctx.fillStyle = '#C9CED6';
    ctx.beginPath();
    ctx.ellipse(0, -9 * Z, 3 * Z, 10 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8F96A1';
    ctx.lineWidth = 0.8 * Z;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -18 * Z);
    ctx.stroke();
    ctx.restore();
  }
  // The orb of power over it: the purple light, bobbing while it is lit, still and dark after.
  const ox = px(t.x, t.y);
  const oy = py(t.x, t.y, nz + 30 + (look.orbLit ? Math.sin(T * 1.5) * 3 : 0));
  ctx.fillStyle = look.orbLit ? '#C21E9E' : '#4A3550';
  ctx.beginPath();
  ctx.arc(ox, oy, 6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.orbLit ? 'rgba(255,220,250,.75)' : 'rgba(200,180,210,.3)';
  ctx.beginPath();
  ctx.arc(ox - 2 * Z, oy - 2 * Z, 2 * Z, 0, Math.PI * 2);
  ctx.fill();
  if (look.flag9) {
    // Taken: the player's flag stands in the nest.
    const fx = px(t.x + 6, t.y + 6);
    const fy = py(t.x + 6, t.y + 6, nz);
    ctx.strokeStyle = '#8A6A43';
    ctx.lineWidth = 2 * Z;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx, fy - 40 * Z);
    ctx.stroke();
    look.flag9(fx, fy - 40 * Z);
  }
}

/** A hired men's tent: midnight-blue canvas over a ridge pole, its flap open toward the viewer. */
function drawTent(v: DrawView, x: number, y: number): void {
  const { ctx, px, py } = v;
  const p = (dx: number, dy: number, z: number): [number, number] => [
    px(x + dx, y + dy),
    py(x + dx, y + dy, z),
  ];
  const ridge = [p(-9, 0, 15), p(9, 0, 15)] as const;
  const fill = (pts: [number, number][], col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    for (const [i, [sx, sy]] of pts.entries()) {
      if (i) ctx.lineTo(sx, sy);
      else ctx.moveTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
  };
  fill([p(-9, -7, 0), p(9, -7, 0), ridge[1], ridge[0]], '#2A3758');
  fill([p(-9, 7, 0), p(9, 7, 0), ridge[1], ridge[0]], '#1F2A4A');
  fill([p(9, -7, 0), p(9, 7, 0), ridge[1]], '#34446B');
  fill([p(9, -3, 0), p(9, 3, 0), p(9, 0, 10)], '#141B30');
}

/** The camp's fire: a ring of stones and flickering flames. */
function drawCampfire(v: DrawView, x: number, y: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  ctx.fillStyle = '#8A8F96';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(
      px(x + Math.cos(a) * 7, y + Math.sin(a) * 7),
      py(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 1),
      1.8 * Z,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  for (const [col, h, w] of [
    ['#F2894A', 11, 4],
    ['#FFD24A', 7, 2.4],
  ] as const) {
    const sx = px(x, y);
    const sy = py(x, y, 1);
    const f = (h + Math.sin(T * 9 + x) * 2) * Z;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(sx - w * Z, sy);
    ctx.quadraticCurveTo(sx - w * 0.4 * Z, sy - f * 0.6, sx, sy - f);
    ctx.quadraticCurveTo(sx + w * 0.4 * Z, sy - f * 0.6, sx + w * Z, sy);
    ctx.closePath();
    ctx.fill();
  }
}

/** The orb of power's light over the Heron's nest, while it is lit, brighter at night. */
export function isle8Glow(v: DrawView, orbLit = true): void {
  if (!orbLit || !near(v, 200)) return;
  const { ctx, T } = v;
  const t = TOWER9;
  ctx.globalCompositeOperation = 'screen';
  v.glow(
    t.x,
    t.y,
    t.h + 42,
    80,
    rgba('#E05BC4', (0.25 + 0.45 * v.dark) * (0.8 + 0.2 * Math.sin(T * 2))),
  );
  ctx.globalCompositeOperation = 'source-over';
}

/** What stands on the twins, for the game's depth-sorted solids. */
export function isle8Solids(v: DrawView, look: Isle8Look): Solid[] {
  if (!near(v, 260)) return [];
  const out: Solid[] = [
    { d: POST8.x1 + POST8.y1, f: () => drawPost8(v) },
    { d: TOWER8.x + TOWER8.y, f: () => drawTower8(v, look) },
    { d: TOWER9.x + TOWER9.y, f: () => drawTower9(v, look) },
  ];
  PALMS8.forEach(([x, y], i) => {
    out.push({ d: x + y, f: () => drawPalm7(v, x, y, i) });
  });
  SNAGS9.forEach(([x, y], i) => {
    out.push({ d: x + y, f: () => drawSnag(v, x, y, i) });
  });
  for (const [x, y] of ROCKS9) out.push({ d: x + y, f: () => drawRock(v, x, y) });
  for (const [x, y] of TENTS8) out.push({ d: x + y + 7, f: () => drawTent(v, x, y) });
  for (const c of [CAMP8, CAMP9]) out.push({ d: c.x + c.y, f: () => drawCampfire(v, c.x, c.y) });
  REEDS8.forEach(([x, y], i) => {
    out.push({ d: x + y, f: () => drawReeds(v, x, y, i) });
  });
  return out;
}
