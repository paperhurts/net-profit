/**
 * Drawing island 5, the Skeleton Shark King's reef: pale shallows with bones
 * on the sea floor, a bleached sand bar ringed by rocks, a giant shark's jaw
 * standing over a throne of bones, and a wrecked fishing boat on the rocks.
 * Stand-in shapes until the kid draws it.
 */
import type { DrawView } from '../entities/entity';
import { BAR_R, BONES, CIRCLE_R, ISLE5, JAW, REEF, THRONE, WRECK } from '../world/isle5';
import type { Solid } from './layers';

const BONE = '#EDE6D3';
const BONE_DARK = '#B9AF97';

/** Its shallows and the bones on the sea floor. */
export function drawIsle5Sea(v: DrawView): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  if (!v.onScreen(ISLE5.x, ISLE5.y, (ISLE5.r + 360) * Z)) return;
  const { x, y, r } = ISLE5;
  v.isoEllipse(x, y, r + 300);
  ctx.fillStyle = '#1C6E78';
  ctx.fill();
  v.isoEllipse(x, y, r + 150);
  ctx.fillStyle = '#3FA3A3';
  ctx.fill();
  v.isoEllipse(x, y, r + 50);
  ctx.fillStyle = '#86CFC3';
  ctx.fill();
  // Ribs and a skull or two down on the bottom, washed toward the water's colour.
  ctx.strokeStyle = 'rgba(225,235,220,.35)';
  ctx.lineWidth = 2 * Z;
  ctx.lineCap = 'round';
  BONES.forEach(([bx, by], i) => {
    const sx = px(bx, by);
    const sy = py(bx, by);
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(sx + k * 5 * Z, sy - 2 * Z);
      ctx.quadraticCurveTo(
        sx + k * 6 * Z,
        sy + 6 * Z,
        sx + k * 4 * Z + (i % 2 ? 3 : -3) * Z,
        sy + 9 * Z,
      );
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(sx - 14 * Z, sy - 2 * Z);
    ctx.lineTo(sx + 14 * Z, sy - 2 * Z);
    ctx.stroke();
  });
}

/** The bone sharks' fins, three of them, circling the reef: grey-white, with the rays showing. */
export function drawBoneFins(v: DrawView): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  if (!v.onScreen(ISLE5.x, ISLE5.y, (CIRCLE_R + 120) * Z)) return;
  for (let k = 0; k < 3; k++) {
    const a = T * 0.22 + (k / 3) * Math.PI * 2;
    const r = CIRCLE_R + Math.sin(T * 0.5 + k * 2) * 30;
    const x = ISLE5.x + Math.cos(a) * r;
    const y = ISLE5.y + Math.sin(a) * r;
    const sx = px(x, y);
    const sy = py(x, y);
    // Its wake, behind it round the circle.
    const bx = ISLE5.x + Math.cos(a - 0.12) * r;
    const by = ISLE5.y + Math.sin(a - 0.12) * r;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2 * Z;
    ctx.beginPath();
    ctx.moveTo(px(bx, by), py(bx, by));
    ctx.lineTo(sx, sy);
    ctx.stroke();
    const dir = Math.sign(Math.cos(a + Math.PI / 2) - Math.sin(a + Math.PI / 2)) || 1;
    ctx.fillStyle = '#D9D3C2';
    ctx.beginPath();
    ctx.moveTo(sx - 7 * Z * dir, sy);
    ctx.quadraticCurveTo(sx - 2 * Z * dir, sy - 10 * Z, sx + 5 * Z * dir, sy - 16 * Z);
    ctx.lineTo(sx + 6 * Z * dir, sy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8F8878';
    ctx.lineWidth = 0.9 * Z;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(sx + (-3 + i * 3) * Z * dir, sy);
      ctx.lineTo(sx + (1 + i * 1.5) * Z * dir, sy - (8 + i * 2.5) * Z);
      ctx.stroke();
    }
  }
}

/** The sand bar, bone white with a bleached coral fringe. */
export function drawIsle5Flat(v: DrawView): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  if (!v.onScreen(ISLE5.x, ISLE5.y, (ISLE5.r + 60) * Z)) return;
  const { x, y } = ISLE5;
  v.isoEllipse(x, y, BAR_R + 10 + Math.sin(T * 1.2) * 3);
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 3 * Z;
  ctx.stroke();
  v.isoEllipse(x, y, BAR_R);
  ctx.fillStyle = '#E9DEC1';
  ctx.fill();
  v.isoEllipse(x - 12, y + 10, BAR_R * 0.6);
  ctx.fillStyle = '#DCCFAE';
  ctx.fill();
  // Bleached coral, little white branches round the bar's edge.
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 1.6 * Z;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.4;
    const cx = x + Math.cos(a) * (BAR_R - 6);
    const cy = y + Math.sin(a) * (BAR_R - 6);
    const sx = px(cx, cy);
    const sy = py(cx, cy);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx, sy - 6 * Z);
    ctx.moveTo(sx, sy - 3 * Z);
    ctx.lineTo(sx - 3 * Z, sy - 7 * Z);
    ctx.moveTo(sx, sy - 4 * Z);
    ctx.lineTo(sx + 3 * Z, sy - 8 * Z);
    ctx.stroke();
  }
}

/** A rock of the reef, pale and worn. */
function drawRock(v: DrawView, x: number, y: number, r: number): void {
  v.box(x - r, y - r * 0.8, r * 2, r * 1.6, 0, r * 0.9, '#8F9894', '#C8CCC4');
}

/** The giant jaw, an arch of jawbone set with teeth, standing on the bar. */
function drawJaw(v: DrawView): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const { x, y, w } = JAW;
  const sx = px(x, y);
  const sy = py(x, y);
  const h = 78 * Z;
  const hw = w * Z;
  ctx.lineCap = 'round';
  // The jawbone, thick, in two curves meeting at the top.
  for (const [lw, c] of [
    [11, BONE_DARK],
    [8, BONE],
  ] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw * Z;
    ctx.beginPath();
    ctx.moveTo(sx - hw, sy);
    ctx.bezierCurveTo(sx - hw * 1.1, sy - h * 0.8, sx - hw * 0.4, sy - h, sx, sy - h);
    ctx.bezierCurveTo(sx + hw * 0.4, sy - h, sx + hw * 1.1, sy - h * 0.8, sx + hw, sy);
    ctx.stroke();
  }
  // Teeth all round the inside, pointing in.
  ctx.fillStyle = '#FFFBEF';
  for (let i = 1; i < 14; i++) {
    const t = i / 14;
    const a = Math.PI * (1 - t);
    const tx = sx + Math.cos(a) * hw * 0.92;
    const ty = sy - Math.sin(a) * h * 0.92;
    const ix = sx + Math.cos(a) * hw * 0.72;
    const iy = sy - Math.sin(a) * h * 0.72;
    ctx.beginPath();
    ctx.moveTo(tx - Math.sin(a) * 3 * Z, ty - Math.cos(a) * 3 * Z);
    ctx.lineTo(ix, iy);
    ctx.lineTo(tx + Math.sin(a) * 3 * Z, ty + Math.cos(a) * 3 * Z);
    ctx.closePath();
    ctx.fill();
  }
}

/** The throne: a seat of bones with a shark's skull for its back. */
function drawThrone(v: DrawView, empty: boolean): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const { x, y } = THRONE;
  v.box(x - 10, y - 8, 20, 16, 0, 10, BONE_DARK, BONE);
  const sx = px(x, y);
  const sy = py(x, y, 10);
  // The back: ribs fanning up.
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 2.4 * Z;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(sx + k * 4 * Z, sy - 4 * Z);
    ctx.quadraticCurveTo(sx + k * 6 * Z, sy - 22 * Z, sx + k * 3 * Z, sy - 30 * Z);
    ctx.stroke();
  }
  // The skull on top, a long snout with two dark eyes.
  ctx.fillStyle = BONE;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 34 * Z, 9 * Z, 6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2B2A26';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx + e * 3.6 * Z, sy - 35 * Z, 1.6 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!empty) return;
  // Gone, the king left his crown on the seat.
  ctx.fillStyle = '#F0C544';
  ctx.beginPath();
  ctx.moveTo(sx - 6 * Z, sy - 2 * Z);
  ctx.lineTo(sx - 6 * Z, sy - 8 * Z);
  ctx.lineTo(sx - 3 * Z, sy - 5 * Z);
  ctx.lineTo(sx, sy - 10 * Z);
  ctx.lineTo(sx + 3 * Z, sy - 5 * Z);
  ctx.lineTo(sx + 6 * Z, sy - 8 * Z);
  ctx.lineTo(sx + 6 * Z, sy - 2 * Z);
  ctx.closePath();
  ctx.fill();
}

/** The wreck on the rocks: a broken hull heeled over, its mast snapped. */
function drawWreck(v: DrawView): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const { x, y, h } = WRECK;
  const c = Math.cos(h);
  const s = Math.sin(h);
  const pts: [number, number][] = [
    [x + c * 34, y + s * 34],
    [x + c * 8 - s * 13, y + s * 8 + c * 13],
    [x - c * 30 - s * 11, y - s * 30 + c * 11],
    [x - c * 30 + s * 11, y - s * 30 - c * 11],
    [x + c * 8 + s * 13, y + s * 8 - c * 13],
  ];
  v.extrude(pts, -4, 9, '#6E5A44', '#8C7458');
  // A gash in its side, and the stump of the mast.
  const mx = x - c * 4;
  const my = y - s * 4;
  ctx.strokeStyle = '#5A4632';
  ctx.lineWidth = 3 * Z;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px(mx, my), py(mx, my, 9));
  ctx.lineTo(px(mx, my) + 10 * Z, py(mx, my, 34));
  ctx.stroke();
  ctx.strokeStyle = '#2B2A26';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(px(x, y) - 8 * Z, py(x, y, 5));
  ctx.lineTo(px(x, y) + 4 * Z, py(x, y, 2));
  ctx.stroke();
}

/** What stands up on island 5, for the game's depth-sorted solids. */
export function isle5Solids(v: DrawView, kingGone: boolean): Solid[] {
  if (!v.onScreen(ISLE5.x, ISLE5.y, (ISLE5.r + 200) * v.zoom)) return [];
  const out: Solid[] = [];
  for (const [x, y, r] of REEF) out.push({ d: x + y, f: () => drawRock(v, x, y, r) });
  out.push({ d: THRONE.x + THRONE.y, f: () => drawThrone(v, kingGone) });
  out.push({ d: JAW.x + JAW.y, f: () => drawJaw(v) });
  out.push({ d: WRECK.x + WRECK.y, f: () => drawWreck(v) });
  return out;
}
