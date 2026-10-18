/**
 * Your trophy hall (data/trophies.ts): a stone stand for each boss round the second hall of Gigantis, a brass plate
 * on its front, and on top, once the boss is beaten, what it left behind; until then a pale question mark.
 */

import type { TrophyKind } from '../data/trophies';
import type { DrawView } from '../entities/entity';

/** How much bigger than a world unit each trophy is drawn, to read beside the figure. */
export const TROPHY_SCALE = 1.25;

/** How tall a stand is, to the top its trophy sits on. */
export const STAND_TALL = 16;

/** A stand at (x, y) in the hall, its trophy on it, or an empty stand for null. */
export function drawStand(v: DrawView, x: number, y: number, kind: TrophyKind | null): void {
  const { ctx, px, py, zoom: Z } = v;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  v.isoEllipse(x, y, 11);
  ctx.fill();
  v.box(x - 7, y - 7, 14, 14, 0, STAND_TALL - 2, '#6E776C', '#8A9488');
  v.box(x - 8, y - 8, 16, 16, STAND_TALL - 2, STAND_TALL, '#7C867A', '#A3AC9F');
  // The brass plate on its front.
  ctx.fillStyle = kind ? '#C9A04A' : '#7E7A6A';
  ctx.beginPath();
  ctx.moveTo(px(x + 7, y - 3), py(x + 7, y - 3, 9));
  ctx.lineTo(px(x + 3, y + 7), py(x + 3, y + 7, 9));
  ctx.lineTo(px(x + 3, y + 7), py(x + 3, y + 7, 5));
  ctx.lineTo(px(x + 7, y - 3), py(x + 7, y - 3, 5));
  ctx.closePath();
  ctx.fill();
  const sx = px(x, y);
  const sy = py(x, y, STAND_TALL);
  if (!kind) {
    ctx.fillStyle = 'rgba(235,240,230,.4)';
    ctx.font = `800 ${Math.round(13 * Z)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('?', sx, sy - 3 * Z);
    return;
  }
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(Z * TROPHY_SCALE, Z * TROPHY_SCALE);
  DRAW[kind](ctx, v.T);
  ctx.restore();
  if (GLOW[kind]) v.glow(x, y, STAND_TALL + 10, 16, GLOW[kind]);
}

/** Those that glow in the dark of the hall. */
const GLOW: Partial<Record<TrophyKind, string>> = {
  spine: 'rgba(90,230,255,.5)',
  shard: 'rgba(90,240,140,.45)',
  lure: 'rgba(255,230,120,.55)',
  light: 'rgba(255,120,200,.5)',
  meteor: 'rgba(255,150,60,.5)',
};

type Pen = CanvasRenderingContext2D;

function poly(c: Pen, fill: string, pts: readonly (readonly [number, number])[]): void {
  c.fillStyle = fill;
  c.beginPath();
  pts.forEach(([a, b], i) => {
    if (i) c.lineTo(a, b);
    else c.moveTo(a, b);
  });
  c.closePath();
  c.fill();
}

function dot(c: Pen, fill: string, x: number, y: number, r: number): void {
  c.fillStyle = fill;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function oval(c: Pen, fill: string, x: number, y: number, rx: number, ry: number, rot = 0): void {
  c.fillStyle = fill;
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  c.fill();
}

function line(
  c: Pen,
  stroke: string,
  w: number,
  pts: readonly (readonly [number, number])[],
): void {
  c.strokeStyle = stroke;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  pts.forEach(([a, b], i) => {
    if (i) c.lineTo(a, b);
    else c.moveTo(a, b);
  });
  c.stroke();
}

/** Each trophy, standing on the stand's top at the origin, up the screen, a unit a world unit. */
const DRAW: Readonly<Record<TrophyKind, (c: Pen, T: number) => void>> = {
  // A crooked wooden staff, its orb gone dark.
  staff: (c) => {
    line(c, '#6A4426', 2.2, [
      [-3, 0],
      [-1, -10],
      [1, -20],
    ]);
    dot(c, '#3A3446', 1.5, -23, 4);
    dot(c, 'rgba(255,255,255,.35)', 0, -24.5, 1.2);
  },
  // A great sword stood on its point.
  sword: (c) => {
    poly(c, '#C8D0D6', [
      [0, 0],
      [-2, -4],
      [-2, -17],
      [2, -17],
      [2, -4],
    ]);
    line(c, '#9AA4AC', 0.8, [
      [0, -2],
      [0, -16],
    ]);
    line(c, '#C9A04A', 2.4, [
      [-6, -17.5],
      [6, -17.5],
    ]);
    line(c, '#5A3A22', 2.2, [
      [0, -18],
      [0, -23],
    ]);
    dot(c, '#C9A04A', 0, -24.5, 1.8);
  },
  // Two curling red horns on a black stump.
  horns: (c) => {
    oval(c, '#2A2226', 0, -2, 6, 2.6);
    for (const s of [-1, 1]) {
      c.fillStyle = '#9E2A22';
      c.beginPath();
      c.moveTo(s * 2, -3);
      c.quadraticCurveTo(s * 9, -8, s * 6, -18);
      c.quadraticCurveTo(s * 5, -10, s * 0.5, -5);
      c.closePath();
      c.fill();
    }
  },
  // A black anchor, dripping tar.
  anchor: (c, T) => {
    line(c, '#1E1C20', 2.6, [
      [0, -2],
      [0, -20],
    ]);
    c.strokeStyle = '#1E1C20';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, -22.5, 2.6, 0, Math.PI * 2);
    c.stroke();
    line(c, '#1E1C20', 2.4, [
      [-5, -15],
      [5, -15],
    ]);
    c.lineWidth = 2.6;
    c.beginPath();
    c.arc(0, -8, 7, Math.PI * 0.15, Math.PI * 0.85);
    c.stroke();
    poly(c, '#1E1C20', [
      [-8, -7],
      [-5, -3],
      [-9.5, -3],
    ]);
    poly(c, '#1E1C20', [
      [8, -7],
      [5, -3],
      [9.5, -3],
    ]);
    const d = (T * 0.7) % 1;
    oval(c, '#1E1C20', 4, -2 + d * 3, 0.9, 1.3 + d);
  },
  // A shark's jaws, open, all teeth, on a little board.
  jaws: (c) => {
    poly(c, '#6A4426', [
      [-9, 0],
      [9, 0],
      [9, -2],
      [-9, -2],
    ]);
    c.strokeStyle = '#E8DFC8';
    c.lineWidth = 2.8;
    c.beginPath();
    c.ellipse(0, -11, 7.5, 8, 0, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = Math.cos(a) * 6.2;
      const y = -11 + Math.sin(a) * 6.6;
      const ix = Math.cos(a) * 3.4;
      const iy = -11 + Math.sin(a) * 3.8;
      const nx = -Math.sin(a) * 1.1;
      const ny = Math.cos(a) * 1.1;
      poly(c, '#FFFFFF', [
        [x + nx, y + ny],
        [x - nx, y - ny],
        [ix, iy],
      ]);
    }
  },
  // A glass jar, an eye in it.
  eye: (c, T) => {
    poly(c, 'rgba(170,220,235,.55)', [
      [-6, 0],
      [6, 0],
      [6.5, -15],
      [-6.5, -15],
    ]);
    poly(c, '#6A4426', [
      [-6.8, -15],
      [6.8, -15],
      [6.8, -18],
      [-6.8, -18],
    ]);
    dot(c, '#F2EEDC', 0, -7.5, 4.6);
    const look = Math.sin(T * 0.6) * 1.4;
    oval(c, '#C9B53A', look, -7.5, 2.8, 3.2);
    oval(c, '#111', look, -7.5, 0.8, 2.6);
    oval(c, 'rgba(255,255,255,.45)', -4, -10, 0.8, 3.5);
  },
  // A little green Cthulhu in stone, wings and all.
  idol: (c) => {
    poly(c, '#3F6A48', [
      [-5, 0],
      [5, 0],
      [4, -9],
      [-4, -9],
    ]);
    for (const s of [-1, 1])
      poly(c, '#35603F', [
        [s * 3, -9],
        [s * 9, -16],
        [s * 7, -8],
      ]);
    dot(c, '#4E8A5A', 0, -14, 5);
    for (const x of [-2.4, -0.8, 0.8, 2.4])
      line(c, '#3F7A4C', 1.2, [
        [x, -11],
        [x * 1.3, -6],
      ]);
    dot(c, '#E8F06A', -1.8, -15, 0.8);
    dot(c, '#E8F06A', 1.8, -15, 0.8);
  },
  // A purple spellbook, a gold star on its cover.
  book: (c) => {
    poly(c, '#E8E0C8', [
      [-7, -1],
      [7, -1],
      [7, -4],
      [-7, -4],
    ]);
    poly(c, '#5A2E7A', [
      [-8, 0],
      [8, 0],
      [8, -1.5],
      [-8, -1.5],
    ]);
    poly(c, '#6E3A94', [
      [-8, -4],
      [8, -4],
      [8, -5.5],
      [-8, -5.5],
    ]);
    c.fillStyle = '#E8C66A';
    c.save();
    c.translate(0, -8.5);
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 1.4 : 3.2;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
    c.restore();
  },
  // A gold crown, red stones round it.
  crown: (c) => {
    poly(c, '#D9A93A', [
      [-8, 0],
      [8, 0],
      [8, -7],
      [6, -13],
      [4, -7],
      [2, -14],
      [0, -7],
      [-2, -14],
      [-4, -7],
      [-6, -13],
      [-8, -7],
    ]);
    poly(c, '#B88A26', [
      [-8, 0],
      [8, 0],
      [8, -2.5],
      [-8, -2.5],
    ]);
    for (const x of [-5, 0, 5]) dot(c, '#C8343A', x, -5, 1.4);
    for (const x of [-6, -2, 2, 6]) dot(c, '#F2D27A', x, x === -6 || x === 6 ? -13 : -14, 1);
  },
  // A black pearl, in a pink shell.
  pearl: (c) => {
    oval(c, '#E8B4B0', 0, -2, 8, 3);
    c.fillStyle = '#E0A6A2';
    c.beginPath();
    c.moveTo(-8, -3);
    c.quadraticCurveTo(-6, -15, 0, -16);
    c.quadraticCurveTo(6, -15, 8, -3);
    c.closePath();
    c.fill();
    for (const x of [-4, 0, 4])
      line(c, '#C98E8A', 0.7, [
        [x * 0.8, -4],
        [x, -14],
      ]);
    dot(c, '#141418', 0, -5, 3.6);
    dot(c, 'rgba(200,230,255,.6)', -1.2, -6.3, 1.1);
  },
  // A long white feather, curling.
  feather: (c) => {
    c.fillStyle = '#F4F2EC';
    c.beginPath();
    c.moveTo(0, -1);
    c.quadraticCurveTo(-8, -12, -2, -26);
    c.quadraticCurveTo(4, -16, 0, -1);
    c.closePath();
    c.fill();
    line(c, '#C8C2B4', 0.8, [
      [0, 0],
      [-1.5, -12],
      [-2, -25],
    ]);
    oval(c, '#6A4426', 0, -0.5, 3.5, 1.4);
  },
  // A golden egg, in a ring of twigs.
  egg: (c) => {
    oval(c, '#8A6A3A', 0, -1.5, 7, 2.6);
    oval(c, '#E8B83A', 0, -8, 5, 6.8);
    oval(c, 'rgba(255,245,200,.7)', -1.8, -10.5, 1.3, 2.4, -0.3);
  },
  // A great curved claw, black.
  claw: (c) => {
    oval(c, '#3A3236', 0, -2, 5, 2.2);
    c.fillStyle = '#26202A';
    c.beginPath();
    c.moveTo(-4, -2);
    c.quadraticCurveTo(-4, -16, 7, -20);
    c.quadraticCurveTo(1, -14, 3, -2);
    c.closePath();
    c.fill();
    line(c, 'rgba(255,255,255,.2)', 0.8, [
      [-2, -6],
      [0, -14],
      [5, -18.5],
    ]);
  },
  // A dark great sword, laid across two pegs.
  blade: (c) => {
    for (const x of [-6, 6])
      line(c, '#5A3A22', 1.6, [
        [x, 0],
        [x, -5],
      ]);
    poly(c, '#8A929A', [
      [-12, -5],
      [6, -6.4],
      [6, -3.6],
    ]);
    line(c, '#3A2A1E', 2.2, [
      [6, -2],
      [6, -8],
    ]);
    line(c, '#3A2A1E', 1.8, [
      [6, -5],
      [11, -5],
    ]);
    dot(c, '#8E7A4A', 12, -5, 1.4);
  },
  // A purple pointy hat, its brim, gold stars on it.
  hat: (c) => {
    oval(c, '#4A2A66', 0, -2, 9, 2.6);
    c.fillStyle = '#5A3480';
    c.beginPath();
    c.moveTo(-6, -2.5);
    c.quadraticCurveTo(-2, -12, 4, -22);
    c.quadraticCurveTo(2, -10, 6, -2.5);
    c.closePath();
    c.fill();
    for (const [x, y] of [
      [-1, -7],
      [2, -13],
    ] as const)
      dot(c, '#E8C66A', x, y, 1.1);
  },
  // A bony spine, cyan lights in it.
  spine: (c, T) => {
    c.fillStyle = '#B8B2A0';
    c.beginPath();
    c.moveTo(-3, 0);
    c.quadraticCurveTo(-4, -14, 3, -26);
    c.quadraticCurveTo(1, -12, 3, 0);
    c.closePath();
    c.fill();
    const k = 0.6 + 0.4 * Math.sin(T * 2);
    for (const [x, y] of [
      [-0.5, -6],
      [0, -13],
      [1.5, -20],
    ] as const)
      dot(c, `rgba(110,240,255,${k})`, x, y, 1.2);
  },
  // A shard of green dome, glowing.
  shard: (c) => {
    poly(c, '#2E8A4E', [
      [-5, 0],
      [5, 0],
      [3, -16],
      [-1, -20],
      [-4, -11],
    ]);
    poly(c, '#5AD07E', [
      [-1, -20],
      [3, -16],
      [1, -2],
      [-1, -4],
    ]);
  },
  // The anglerfish's lure: a stalk, curling over to a glowing bulb.
  lure: (c, T) => {
    oval(c, '#3A3236', 0, -1, 4, 1.6);
    c.strokeStyle = '#4A3E44';
    c.lineWidth = 1.8;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0, -1);
    c.quadraticCurveTo(-3, -20, 6, -20);
    c.stroke();
    const k = 0.7 + 0.3 * Math.sin(T * 3);
    dot(c, `rgba(255,236,140,${k})`, 7, -17.5, 3);
  },
  // A gulper's tail light, blinking pink.
  light: (c, T) => {
    line(c, '#2A2430', 1.6, [
      [0, 0],
      [0, -8],
      [2, -12],
    ]);
    const on = Math.sin(T * 2.4) > -0.2;
    dot(c, on ? '#FF7AC8' : '#7A3A5E', 2.5, -14.5, 3.6);
    if (on) dot(c, 'rgba(255,255,255,.7)', 1.5, -15.5, 1);
  },
  // A lump of meteor, cracks glowing.
  meteor: (c, T) => {
    poly(c, '#4A3E3A', [
      [-7, 0],
      [7, 0],
      [8, -6],
      [4, -12],
      [-3, -12],
      [-8, -6],
    ]);
    const k = 0.6 + 0.4 * Math.sin(T * 1.7);
    line(c, `rgba(255,150,60,${k})`, 1, [
      [-5, -3],
      [-1, -7],
      [3, -5],
      [5, -9],
    ]);
    line(c, `rgba(255,150,60,${k})`, 1, [
      [-1, -7],
      [-2, -11],
    ]);
  },
  // A long white tooth.
  tooth: (c) => {
    oval(c, '#3A3236', 0, -1, 4, 1.6);
    c.fillStyle = '#F2EEE2';
    c.beginPath();
    c.moveTo(-3.5, -1);
    c.quadraticCurveTo(-3, -16, 3, -25);
    c.quadraticCurveTo(1, -12, 3.5, -1);
    c.closePath();
    c.fill();
    line(c, '#D8D0BC', 0.8, [
      [-1, -3],
      [0, -14],
    ]);
  },
};
