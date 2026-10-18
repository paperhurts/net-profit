/**
 * Your armoury in the throne room of Gigantis (data/armoury.ts): wooden stands wearing the armour you have had, and
 * low racks holding the weapons, each on a stone foot; an empty one bare wood.
 */

import type { ArmourLook } from '../data/armour';
import type { WeaponRack } from '../data/armoury';
import type { DrawView } from '../entities/entity';

type Pen = CanvasRenderingContext2D;

function foot(v: DrawView, x: number, y: number): void {
  v.ctx.fillStyle = 'rgba(0,0,0,.25)';
  v.isoEllipse(x, y, 11);
  v.ctx.fill();
  v.box(x - 6, y - 6, 12, 12, 0, 4, '#6E776C', '#8A9488');
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

/** The soul armour: pale and see-through, a blue glow in it. */
const SOUL: ArmourLook = {
  plate: 'rgba(170,220,255,.55)',
  edge: 'rgba(90,150,220,.7)',
  shine: '#E8F6FF',
  helm: 'helm',
};

/** An armour stand at (x, y): a wooden post and shoulders, and on it this armour, or none. */
export function drawArmourStand(
  v: DrawView,
  x: number,
  y: number,
  look: ArmourLook | 'soul' | null,
): void {
  foot(v, x, y);
  const c = v.ctx;
  c.save();
  c.translate(v.px(x, y), v.py(x, y, 4));
  c.scale(v.zoom, v.zoom);
  const L = look === 'soul' ? SOUL : look;
  if (L?.cape)
    poly(c, L.cape, [
      [-8, -30],
      [8, -30],
      [10, -6],
      [-10, -6],
    ]);
  line(c, '#5A3A22', 2.4, [
    [0, 0],
    [0, -38],
  ]);
  line(c, '#5A3A22', 2, [
    [-9, -30],
    [9, -30],
  ]);
  c.fillStyle = '#7A5230';
  c.beginPath();
  c.arc(0, -40, 3.6, 0, Math.PI * 2);
  c.fill();
  if (!L) {
    c.restore();
    return;
  }
  // The plate, its edge and its shine.
  poly(c, L.edge, [
    [-9.5, -31],
    [9.5, -31],
    [7.5, -14],
    [-7.5, -14],
  ]);
  poly(c, L.plate, [
    [-8.5, -30],
    [8.5, -30],
    [6.5, -15],
    [-6.5, -15],
  ]);
  poly(c, L.shine, [
    [-5, -28],
    [-2, -28],
    [-3.5, -18],
    [-5.5, -18],
  ]);
  for (const s of [-1, 1]) {
    c.fillStyle = L.edge;
    c.beginPath();
    c.ellipse(s * 9.5, -30, 3.4, 2.4, 0, 0, Math.PI * 2);
    c.fill();
  }
  // The helmet, on the post's head.
  if (L.helm === 'space') {
    c.fillStyle = 'rgba(190,240,255,.45)';
    c.beginPath();
    c.arc(0, -40.5, 6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)';
    c.beginPath();
    c.ellipse(-2.4, -43, 1.2, 2.2, -0.5, 0, Math.PI * 2);
    c.fill();
  } else if (L.helm !== 'none') {
    c.fillStyle = L.plate;
    c.beginPath();
    c.arc(0, -40, 5, Math.PI, 0);
    c.lineTo(5, -36.5);
    c.lineTo(-5, -36.5);
    c.closePath();
    c.fill();
    line(c, L.edge, 1.2, [
      [-3.5, -38.5],
      [3.5, -38.5],
    ]);
    if (L.helm === 'plume') {
      c.fillStyle = '#C42F2A';
      c.beginPath();
      c.moveTo(0, -45);
      c.quadraticCurveTo(7, -50, 9, -42);
      c.quadraticCurveTo(5, -46, 0, -43);
      c.closePath();
      c.fill();
    }
  }
  c.restore();
  if (look === 'soul') v.glow(x, y, 26, 18, 'rgba(140,200,255,.45)');
}

/** A weapon rack at (x, y): two uprights and a bar, and on it this weapon, or nothing. */
export function drawWeaponRack(
  v: DrawView,
  x: number,
  y: number,
  kind: WeaponRack,
  has: boolean,
): void {
  foot(v, x, y);
  const c = v.ctx;
  c.save();
  c.translate(v.px(x, y), v.py(x, y, 4));
  c.scale(v.zoom, v.zoom);
  for (const s of [-1, 1])
    line(c, '#5A3A22', 2, [
      [s * 7, 0],
      [s * 7, -16],
    ]);
  line(c, '#5A3A22', 2, [
    [-8, -14],
    [8, -14],
  ]);
  if (has) WEAPON[kind](c);
  c.restore();
}

/** Each weapon, stood in its rack, its foot at the origin. */
const WEAPON: Readonly<Record<WeaponRack, (c: Pen) => void>> = {
  fishing: (c) => {
    line(c, '#8A5E36', 1.6, [
      [0, 0],
      [0, -30],
    ]);
    poly(c, '#C8D0D6', [
      [0, -36],
      [-1.6, -30],
      [1.6, -30],
    ]);
  },
  long: (c) => {
    line(c, '#7A5230', 1.6, [
      [0, 0],
      [0, -38],
    ]);
    poly(c, '#C8D0D6', [
      [0, -45],
      [-1.8, -38],
      [1.8, -38],
    ]);
    line(c, '#C9A04A', 1.4, [
      [-1.6, -37],
      [1.6, -37],
    ]);
  },
  barbed: (c) => {
    line(c, '#5A3A22', 1.8, [
      [0, 0],
      [0, -36],
    ]);
    poly(c, '#B8C2CA', [
      [0, -44],
      [-2, -36],
      [2, -36],
    ]);
    line(c, '#B8C2CA', 1.2, [
      [-1, -38],
      [-4, -34],
    ]);
    line(c, '#B8C2CA', 1.2, [
      [1, -38],
      [4, -34],
    ]);
  },
  harpoon: (c) => {
    line(c, '#4A3A2A', 2.6, [
      [0, 0],
      [0, -34],
    ]);
    poly(c, '#9AA4AC', [
      [0, -44],
      [-2.6, -34],
      [2.6, -34],
    ]);
    line(c, '#9AA4AC', 1.4, [
      [-1.5, -36],
      [-5, -31],
    ]);
    line(c, '#9AA4AC', 1.4, [
      [1.5, -36],
      [5, -31],
    ]);
    line(c, '#C83A30', 2.2, [
      [-2, -20],
      [2, -20],
    ]);
    c.strokeStyle = '#D8C8A0';
    c.lineWidth = 1.2;
    c.beginPath();
    c.ellipse(4, -10, 3, 4, 0, 0, Math.PI * 2);
    c.stroke();
  },
  knife: (c) => {
    // Stuck point down in a little block on the bar.
    poly(c, '#6A4426', [
      [-3, -14],
      [3, -14],
      [3, -17],
      [-3, -17],
    ]);
    poly(c, '#D8DEE2', [
      [0, -17],
      [-1.6, -22],
      [-1.6, -28],
      [1.6, -28],
      [1.6, -22],
    ]);
    line(c, '#2A2226', 2.2, [
      [0, -28.5],
      [0, -34],
    ]);
    line(c, '#8A929A', 1.6, [
      [-3.5, -28.5],
      [3.5, -28.5],
    ]);
  },
};
