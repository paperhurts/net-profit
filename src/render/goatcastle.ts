/**
 * Drawing Sir Bucksworth XIV's castle (world/goatcastle.ts): outside, a giant wheel of cheese on the hill, holes in its
 * rind, arched windows lit at night, a gate in its front with a wooden door, and his pennants flying on top; inside, the
 * Hall of Portraits, a floor and back wall of cheese hung with gilt frames, each a goat in a crown or not, and the
 * throne room, where the king himself stands on his cheese-wedge throne in his cape and monocle, his crown balanced
 * on one horn, and faints now and then.
 */
import { PORTRAITS } from '../data/bucksworth';
import type { DrawView } from '../entities/entity';
import { HALL_DOOR_A, onWall15, PORTRAIT_AT, PORTRAIT_Z, THRONE_AT } from '../world/goatcastle';
import { CASTLE15 } from '../world/goatisle';
import { GOAT_HALL, GOAT_THRONE, type Room } from '../world/tower';
import { drawGoat, type GoatLook, PLAIN_GOAT } from './goatisle';
import type { Solid } from './layers';

const CHEESE = '#F4C64E';
const CHEESE_SIDE = '#E3A92E';
const CHEESE_TOP = '#FAD86F';
const RIND = '#C98A1C';
const HOLE = 'rgba(150,95,20,.55)';
const PLUM = '#5B2A6E';
const GILT = '#D9A630';

/** A path round the front half (toward the viewer) of a circle at height z, from its left edge to its right. */
function frontArc(v: DrawView, x: number, y: number, r: number, z: number, back = false): void {
  const { ctx } = v;
  const a0 = (3 * Math.PI) / 4;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    // From the left edge (135 degrees) round through the front (45) to the right edge (-45); or back the other way.
    const a = back ? -Math.PI / 4 + t * Math.PI : a0 - t * Math.PI;
    const wx = x + Math.cos(a) * r;
    const wy = y + Math.sin(a) * r;
    ctx.lineTo(v.px(wx, wy), v.py(wx, wy, z));
  }
}

/** A point on the wheel's side at angle a (0 toward +x) and height z. */
function onSide(a: number, z: number, v: DrawView, out = 0): [number, number] {
  const wx = CASTLE15.x + Math.cos(a) * (CASTLE15.r + out);
  const wy = CASTLE15.y + Math.sin(a) * (CASTLE15.r + out);
  return [v.px(wx, wy), v.py(wx, wy, z)];
}

/** The castle on the hill, as a solid for the scene to sort. */
export function cheeseCastleSolid(v: DrawView): Solid | null {
  const { x, y, r } = CASTLE15;
  if (!v.onScreen(x, y, 160 * v.zoom)) return null;
  return { d: x + y + r * 0.7, f: () => drawCheeseCastle(v) };
}

function drawCheeseCastle(v: DrawView): void {
  const { ctx } = v;
  const Z = v.zoom;
  const { x, y, r, h } = CASTLE15;
  v.isoEllipse(x, y, r + 6);
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.fill();
  // The side: down the front of the wheel from its top rim to its bottom rim.
  ctx.beginPath();
  frontArc(v, x, y, r, 0);
  frontArc(v, x, y, r, h, true);
  ctx.closePath();
  const g = ctx.createLinearGradient(v.px(x - r, y + r), 0, v.px(x + r, y - r), 0);
  g.addColorStop(0, CHEESE_SIDE);
  g.addColorStop(0.45, CHEESE);
  g.addColorStop(1, RIND);
  ctx.fillStyle = g;
  ctx.fill();
  // Its rind, a darker band round the bottom.
  ctx.beginPath();
  frontArc(v, x, y, r, 0);
  frontArc(v, x, y, r, 4, true);
  ctx.closePath();
  ctx.fillStyle = RIND;
  ctx.fill();
  // The top.
  v.isoEllipse(x, y, r, h);
  ctx.fillStyle = CHEESE_TOP;
  ctx.fill();
  ctx.strokeStyle = RIND;
  ctx.lineWidth = 1.4 * Z;
  ctx.stroke();
  // Holes in the cheese, on the side toward the viewer.
  const holes: [number, number, number][] = [
    [-0.55, 30, 3.2],
    [0.05, 12, 2.4],
    [0.35, 32, 2.8],
    [1.6, 28, 3.4],
    [2.0, 10, 2.2],
    [1.2, 8, 2.6],
  ];
  ctx.fillStyle = HOLE;
  for (const [a, z, s] of holes) {
    const [sx, sy] = onSide(a, z, v);
    ctx.beginPath();
    ctx.ellipse(sx, sy, s * Z, s * 0.8 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Holes on the top too.
  for (const [dx, dy, s] of [
    [-14, -10, 4],
    [10, -20, 3],
    [18, 8, 3.5],
    [-22, 14, 2.6],
  ] as const) {
    v.isoEllipse(x + dx, y + dy, s, h);
    ctx.fill();
  }
  // Arched windows, warm at night.
  const lit = v.dark > 0.3 ? '#FFD98A' : '#5B3A1E';
  for (const a of [-0.3, 1.4]) {
    const [sx, sy] = onSide(a, 24, v);
    ctx.fillStyle = lit;
    ctx.beginPath();
    ctx.moveTo(sx - 3 * Z, sy + 4 * Z);
    ctx.lineTo(sx - 3 * Z, sy - 2 * Z);
    ctx.arc(sx, sy - 2 * Z, 3 * Z, Math.PI, 0);
    ctx.lineTo(sx + 3 * Z, sy + 4 * Z);
    ctx.closePath();
    ctx.fill();
  }
  // The gate, straight toward the viewer: an arch with a wooden door, and a gilt crown over it.
  const [gx, gy] = onSide(Math.PI / 4, 0, v);
  ctx.fillStyle = '#4A2E17';
  ctx.beginPath();
  ctx.moveTo(gx - 7 * Z, gy);
  ctx.lineTo(gx - 7 * Z, gy - 12 * Z);
  ctx.arc(gx, gy - 12 * Z, 7 * Z, Math.PI, 0);
  ctx.lineTo(gx + 7 * Z, gy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7A4E2D';
  ctx.fillRect(gx - 5.5 * Z, gy - 14 * Z, 11 * Z, 14 * Z);
  ctx.strokeStyle = '#4A2E17';
  ctx.lineWidth = 1 * Z;
  ctx.beginPath();
  ctx.moveTo(gx, gy - 14 * Z);
  ctx.lineTo(gx, gy);
  ctx.stroke();
  drawCrown(ctx, gx, gy - 25 * Z, 4 * Z, 0);
  // His pennants on top, purple, flapping.
  for (const [dx, dy, hh] of [
    [-16, -16, 22],
    [16, 16, 18],
  ] as const) {
    const px = v.px(x + dx, y + dy);
    const base = v.py(x + dx, y + dy, h);
    const top = base - hh * Z;
    ctx.strokeStyle = '#5B4636';
    ctx.lineWidth = 1.4 * Z;
    ctx.beginPath();
    ctx.moveTo(px, base);
    ctx.lineTo(px, top);
    ctx.stroke();
    const flap = Math.sin(v.T * 5 + dx) * 1.6 * Z;
    ctx.fillStyle = PLUM;
    ctx.beginPath();
    ctx.moveTo(px, top);
    ctx.lineTo(px + 11 * Z, top + 3 * Z + flap);
    ctx.lineTo(px, top + 6 * Z);
    ctx.closePath();
    ctx.fill();
  }
}

/** A little gilt crown at screen x, y, this big, tilted. */
export function drawCrown(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  tilt: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = GILT;
  ctx.strokeStyle = '#8A6414';
  ctx.lineWidth = s * 0.15;
  ctx.beginPath();
  ctx.moveTo(-s, s * 0.5);
  ctx.lineTo(-s, -s * 0.4);
  ctx.lineTo(-s * 0.5, s * 0.05);
  ctx.lineTo(0, -s * 0.7);
  ctx.lineTo(s * 0.5, s * 0.05);
  ctx.lineTo(s, -s * 0.4);
  ctx.lineTo(s, s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#C8323A';
  ctx.beginPath();
  ctx.arc(0, s * 0.15, s * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The goat's own frame, as drawGoat sets it up: so the king's cape, beard, crown and monocle sit right on him. */
function goatFrame(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  k: number,
  face: number,
  faint: number,
): void {
  ctx.translate(sx, sy);
  ctx.scale(face < 0 ? -k : k, k);
  if (faint > 0) {
    ctx.translate(0, 1.6 * faint - 6.2);
    ctx.rotate(-Math.PI * faint);
    ctx.translate(0, 6.2);
  }
}

const KING: GoatLook = { coat: '#F7F3EA', dark: '#A39A88' };

/**
 * Sir Bucksworth XIV at screen x, y (his hooves), this big: a cape behind him, the goat, a curly white beard to his
 * knees, a monocle on a chain, and his crown, too small for him, balanced on one horn. faint tips him over like any
 * goat on the island.
 */
export function drawKing(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  Z: number,
  face: number,
  faint: number,
  T: number,
): void {
  const k = 2.1 * Z;
  ctx.save();
  goatFrame(ctx, sx, sy, k, face, faint);
  // The cape, from his shoulders over his back.
  ctx.fillStyle = PLUM;
  ctx.beginPath();
  ctx.moveTo(4.6, -9);
  ctx.quadraticCurveTo(-1, -11.4, -6.8, -8);
  ctx.quadraticCurveTo(-7.8, -3, -6.2, 0.5);
  ctx.lineTo(-3.4, -2.6);
  ctx.quadraticCurveTo(0, -4, 3.8, -5.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#F2EEE4';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();
  drawGoat(ctx, sx, sy, Z * 2.1, face, KING, 0, faint);
  ctx.save();
  goatFrame(ctx, sx, sy, k, face, faint);
  // His beard, long and curly, to his knees.
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = 'rgba(120,110,95,.6)';
  ctx.lineWidth = 0.35;
  for (let i = 0; i < 5; i++) {
    const bx = 8.7 - i * 0.15;
    const by = -10.2 + i * 1.5;
    ctx.beginPath();
    ctx.arc(bx, by, 1.15 - i * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // The monocle, and its chain.
  ctx.strokeStyle = GILT;
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.arc(7.9, -12.1, 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(7.6, -11.2);
  ctx.quadraticCurveTo(6.6, -8.4, 5.2, -8.6);
  ctx.stroke();
  // His crown, balanced on one horn, wobbling.
  ctx.restore();
  ctx.save();
  goatFrame(ctx, sx, sy, k, face, faint);
  drawCrown(ctx, 4.2, -16.4, 1.9, -0.45 + Math.sin(T * 2.2) * 0.12);
  ctx.restore();
}

/** A path round the back half of a room's wall at height z, from its left edge round the back to its right. */
function backArc(v: DrawView, R: Room, z: number, reverse = false): void {
  const { ctx } = v;
  for (let i = 0; i <= 32; i++) {
    const t = reverse ? 1 - i / 32 : i / 32;
    const a = (3 * Math.PI) / 4 + t * Math.PI;
    const wx = R.x + Math.cos(a) * R.r;
    const wy = R.y + Math.sin(a) * R.r;
    ctx.lineTo(v.px(wx, wy), v.py(wx, wy, z));
  }
}

const WALL_H = 70;

/** A room inside the castle: the dark round it, a cheese floor, its back wall of cheese with holes, and what hangs on it. */
export function drawCheeseRoomBack(v: DrawView, R: Room, i: number, W: number, H: number): void {
  const { ctx } = v;
  const Z = v.zoom;
  ctx.fillStyle = '#2B1A0E';
  ctx.fillRect(0, 0, W, H);
  // The back wall.
  ctx.beginPath();
  backArc(v, R, 0);
  backArc(v, R, WALL_H, true);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, v.py(R.x, R.y, WALL_H) - R.r * Z, 0, v.py(R.x, R.y, 0));
  g.addColorStop(0, CHEESE_SIDE);
  g.addColorStop(1, CHEESE);
  ctx.fillStyle = g;
  ctx.fill();
  // The floor.
  v.isoEllipse(R.x, R.y, R.r);
  ctx.fillStyle = i === GOAT_THRONE ? '#E8B640' : CHEESE_TOP;
  ctx.fill();
  ctx.strokeStyle = RIND;
  ctx.lineWidth = 2 * Z;
  ctx.stroke();
  // A carpet: down the middle of the hall to the throne room's door, or to the throne.
  const toA = i === GOAT_HALL ? HALL_DOOR_A : (5 * Math.PI) / 4;
  const far = onWall15(i, toA, 20);
  const near = onWall15(i, toA + Math.PI, 20);
  ctx.strokeStyle = '#8E2B3A';
  ctx.lineWidth = 22 * Z;
  ctx.beginPath();
  ctx.moveTo(v.px(far.x, far.y), v.py(far.x, far.y));
  ctx.lineTo(v.px(near.x, near.y), v.py(near.x, near.y));
  ctx.stroke();
  // Holes in the wall and the floor.
  ctx.fillStyle = HOLE;
  for (let k = 0; k < 9; k++) {
    const a = (3 * Math.PI) / 4 + ((k * 0.37) % 1) * Math.PI;
    const z = 8 + ((k * 23) % 50);
    const wx = R.x + Math.cos(a) * R.r;
    const wy = R.y + Math.sin(a) * R.r;
    ctx.beginPath();
    ctx.ellipse(v.px(wx, wy), v.py(wx, wy, z), 3.4 * Z, 2.8 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (i === GOAT_HALL) {
    PORTRAIT_AT.forEach((a, k) => {
      drawPortrait(v, a, k);
    });
    drawWallDoor(v, HALL_DOOR_A);
  } else {
    // Behind the throne, a royal banner: his crown on purple.
    const b = onWall15(GOAT_THRONE, (5 * Math.PI) / 4, 0);
    const sx = v.px(b.x, b.y);
    const top = v.py(b.x, b.y, WALL_H - 6);
    ctx.fillStyle = PLUM;
    ctx.beginPath();
    ctx.moveTo(sx - 18 * Z, top);
    ctx.lineTo(sx + 18 * Z, top);
    ctx.lineTo(sx + 18 * Z, top + 44 * Z);
    ctx.lineTo(sx, top + 52 * Z);
    ctx.lineTo(sx - 18 * Z, top + 44 * Z);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = GILT;
    ctx.lineWidth = 1.6 * Z;
    ctx.stroke();
    drawCrown(ctx, sx, top + 20 * Z, 8 * Z, 0);
  }
}

/** A gilt frame on the hall's back wall at angle a, its goat inside, crowned or not, and a little plaque under it. */
function drawPortrait(v: DrawView, a: number, k: number): void {
  const { ctx } = v;
  const Z = v.zoom;
  const p = PORTRAITS[k];
  if (!p) return;
  const at = onWall15(GOAT_HALL, a, 0);
  const sx = v.px(at.x, at.y);
  const mid = v.py(at.x, at.y, PORTRAIT_Z[k] ?? 40);
  const w = 13 * Z;
  const h = 17 * Z;
  ctx.fillStyle = GILT;
  ctx.fillRect(sx - w / 2 - 2 * Z, mid - h / 2 - 2 * Z, w + 4 * Z, h + 4 * Z);
  ctx.fillStyle = ['#3E5A7A', '#6E3A4A', '#3E6A4A', '#5A4A7A'][k % 4] as string;
  ctx.fillRect(sx - w / 2, mid - h / 2, w, h);
  // The goat in it, head and shoulders, facing in toward the middle of the hall.
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx - w / 2, mid - h / 2, w, h);
  ctx.clip();
  const face = Math.cos(a) - Math.sin(a) < 0 ? 1 : -1;
  const look: GoatLook = p.who === 'Dog' ? { coat: '#7A5A3A', dark: '#4A3424' } : PLAIN_GOAT;
  drawGoat(ctx, sx - face * 6 * Z, mid + 15 * Z, Z * 1.25, face, look);
  if (p.crown) drawCrown(ctx, sx + face * 1.5 * Z, mid - 6.5 * Z, 2.6 * Z, face * 0.2);
  ctx.restore();
  // Its plaque, a gilt strip with its number.
  ctx.fillStyle = '#B88A2A';
  ctx.fillRect(sx - 7 * Z, mid + h / 2 + 4 * Z, 14 * Z, 5 * Z);
  ctx.fillStyle = '#2B1A0E';
  ctx.font = `700 ${3.6 * Z}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.who, sx, mid + h / 2 + 6.6 * Z);
}

/** The arched door at the back of the hall, into the throne room. */
function drawWallDoor(v: DrawView, a: number): void {
  const { ctx } = v;
  const Z = v.zoom;
  const at = onWall15(GOAT_HALL, a, 0);
  const sx = v.px(at.x, at.y);
  const sy = v.py(at.x, at.y, 0);
  ctx.fillStyle = '#4A2E17';
  ctx.beginPath();
  ctx.moveTo(sx - 13 * Z, sy);
  ctx.lineTo(sx - 13 * Z, sy - 28 * Z);
  ctx.arc(sx, sy - 28 * Z, 13 * Z, Math.PI, 0);
  ctx.lineTo(sx + 13 * Z, sy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7A4E2D';
  ctx.fillRect(sx - 10 * Z, sy - 30 * Z, 20 * Z, 30 * Z);
  drawCrown(ctx, sx, sy - 48 * Z, 6 * Z, 0);
}

/** In the throne room: the cheese-wedge throne, and the king on it. */
export function throneSolids(v: DrawView, faint: number, talk: number): Solid[] {
  const t = THRONE_AT();
  return [
    {
      d: t.x + t.y,
      f: () => {
        const { ctx } = v;
        const Z = v.zoom;
        // The throne: a big wedge of cheese, its high back behind him.
        v.box(t.x - 16, t.y - 16, 32, 32, 0, 10, CHEESE_SIDE, CHEESE_TOP);
        v.box(t.x - 16, t.y - 16, 8, 32, 10, 44, CHEESE_SIDE, CHEESE_TOP);
        const bob = talk > 0 ? Math.abs(Math.sin(v.T * 14)) * 1.5 * Z : 0;
        drawKing(ctx, v.px(t.x + 2, t.y + 2), v.py(t.x + 2, t.y + 2, 10) - bob, Z, 1, faint, v.T);
      },
    },
  ];
}
