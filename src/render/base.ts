/**
 * A base's hut, on its island. Until it is built, its plot: four stakes, a rope
 * round them and a sign with a little hut on it. Then a plank hut with a pitched
 * roof in the boat's roof paint, a door and a lantern on the side toward the
 * viewer, a window on the other, and a pole beside it flying the player's flag.
 * The window and the lantern are lit at night. The gear shed stands beside it,
 * or its plot does.
 */
import { shade } from '../core/color';
import type { DrawView } from '../entities/entity';
import { type Base, polePoint } from '../world/bases';

const WALL = '#C89B6A';
const WALL_TOP = '#DDB585';
const STAKE = '#7A5634';
const DOOR = '#6B4A2C';
const CORK = '#F2C14E';
/** The shed's planks, a shade darker than the hut's; the box shades each face from it, so it must be hex. */
const SHED_WALL = '#AD845A';
/** How high the ridge stands over the walls, and how far the roof hangs over them. */
const RIDGE = 13;
const EAVE = 3;
/** The flagpole's height. */
export const POLE = 46;

/** The view raised by z: a base on a raft stands on its planks, not in the water. */
function lift(v: DrawView, z: number): DrawView {
  if (!z) return v;
  return {
    ...v,
    py: (x, y, h = 0) => v.py(x, y, h + z),
    isoEllipse: (x, y, r, h = 0) => v.isoEllipse(x, y, r, h + z),
    box: (x, y, w, d, z0, z1, side, top) => v.box(x, y, w, d, z0 + z, z1 + z, side, top),
    extrude: (pts, z0, z1, side, top) => v.extrude(pts, z0 + z, z1 + z, side, top),
  };
}

/** A flat quad on a vertical face, from a to b along the ground, between two heights. */
function face(
  v: DrawView,
  a: readonly [number, number],
  b: readonly [number, number],
  z0: number,
  z1: number,
): void {
  const { ctx, px, py } = v;
  ctx.beginPath();
  ctx.moveTo(px(a[0], a[1]), py(a[0], a[1], z0));
  ctx.lineTo(px(b[0], b[1]), py(b[0], b[1], z0));
  ctx.lineTo(px(b[0], b[1]), py(b[0], b[1], z1));
  ctx.lineTo(px(a[0], a[1]), py(a[0], a[1], z1));
  ctx.closePath();
}

/**
 * Draw a base's hut, or its plot until it is built. roof is the boat's roof paint; flag draws the
 * player's flag with its hoist at a screen point, or is null for none.
 */
export function drawBaseHut(
  view: DrawView,
  b: Base,
  built: boolean,
  roof: string,
  flag: ((sx: number, sy: number) => void) | null,
): void {
  const v = lift(view, b.z);
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const { x, y, half, wall } = b.hut;
  const x0 = x - half;
  const x1 = x + half;
  const y0 = y - half;
  const y1 = y + half;
  if (!built) {
    plot(v, x0, y0, x1, y1);
    sign(v, x, y1, hutIcon);
    return;
  }
  // The flagpole first, behind the hut.
  const p = polePoint(b);
  ctx.strokeStyle = STAKE;
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(px(p.x, p.y), py(p.x, p.y, 0));
  ctx.lineTo(px(p.x, p.y), py(p.x, p.y, POLE));
  ctx.stroke();
  if (flag) flag(px(p.x, p.y), py(p.x, p.y, POLE));
  // The walls, with a line of planks.
  v.box(x0, y0, x1 - x0, y1 - y0, 0, wall, WALL, WALL_TOP);
  ctx.strokeStyle = 'rgba(60,30,0,.2)';
  ctx.lineWidth = Z;
  for (const z of [wall * 0.35, wall * 0.7]) {
    ctx.beginPath();
    ctx.moveTo(px(x0, y1), py(x0, y1, z));
    ctx.lineTo(px(x1, y1), py(x1, y1, z));
    ctx.lineTo(px(x1, y0), py(x1, y0, z));
    ctx.stroke();
  }
  // The door on the near face, with the lantern beside it, and the window on the other.
  const lit = v.dark > 0.3;
  ctx.fillStyle = DOOR;
  face(v, [x - 4, y1], [x + 4, y1], 0, wall * 0.75);
  ctx.fill();
  ctx.fillStyle = lit ? '#FFD27A' : '#5C7F8A';
  face(v, [x1, y + 4], [x1, y - 5], wall * 0.4, wall * 0.75);
  ctx.fill();
  ctx.fillStyle = lit ? '#FFE9A8' : '#3B4A4F';
  ctx.beginPath();
  ctx.arc(px(x + 8, y1), py(x + 8, y1, wall * 0.62), 1.8 * Z, 0, Math.PI * 2);
  ctx.fill();
  // The roof: the far slope, the gable on the near end, then the near slope over them, ridge along x.
  const zr = wall + RIDGE;
  const ridge0: [number, number] = [x0 - EAVE, y];
  const ridge1: [number, number] = [x1 + EAVE, y];
  const slope = (ya: number, c: string) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(px(x0 - EAVE, ya), py(x0 - EAVE, ya, wall - 1));
    ctx.lineTo(px(x1 + EAVE, ya), py(x1 + EAVE, ya, wall - 1));
    ctx.lineTo(px(ridge1[0], ridge1[1]), py(ridge1[0], ridge1[1], zr));
    ctx.lineTo(px(ridge0[0], ridge0[1]), py(ridge0[0], ridge0[1], zr));
    ctx.closePath();
    ctx.fill();
  };
  slope(y0 - EAVE, shade(roof, 0.8));
  ctx.fillStyle = shade(WALL, 0.92);
  ctx.beginPath();
  ctx.moveTo(px(x1, y0), py(x1, y0, wall));
  ctx.lineTo(px(x1, y1), py(x1, y1, wall));
  ctx.lineTo(px(x1, y), py(x1, y, zr - 1));
  ctx.closePath();
  ctx.fill();
  slope(y1 + EAVE, roof);
  ctx.strokeStyle = shade(roof, 0.7);
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  ctx.moveTo(px(ridge0[0], ridge0[1]), py(ridge0[0], ridge0[1], zr));
  ctx.lineTo(px(ridge1[0], ridge1[1]), py(ridge1[0], ridge1[1], zr));
  ctx.stroke();
}

/** A plot: a stake at each corner and a rope round them. */
function plot(v: DrawView, x0: number, y0: number, x1: number, y1: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const corners: [number, number][] = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  ctx.strokeStyle = 'rgba(255,246,229,.8)';
  ctx.lineWidth = Z;
  ctx.beginPath();
  corners.forEach((c, i) => {
    const X = px(c[0], c[1]);
    const Y = py(c[0], c[1], 5);
    if (i) ctx.lineTo(X, Y);
    else ctx.moveTo(X, Y);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = STAKE;
  ctx.lineWidth = 2 * Z;
  for (const c of corners) {
    ctx.beginPath();
    ctx.moveTo(px(c[0], c[1]), py(c[0], c[1], 0));
    ctx.lineTo(px(c[0], c[1]), py(c[0], c[1], 8));
    ctx.stroke();
  }
}

/** A little hut, for the hut's sign, at a screen point. */
function hutIcon(ctx: CanvasRenderingContext2D, sx: number, sy: number, Z: number): void {
  ctx.fillStyle = '#6B4A2C';
  ctx.fillRect(sx - 3 * Z, sy - 1 * Z, 6 * Z, 4 * Z);
  ctx.beginPath();
  ctx.moveTo(sx - 4.5 * Z, sy - 0.6 * Z);
  ctx.lineTo(sx, sy - 4.5 * Z);
  ctx.lineTo(sx + 4.5 * Z, sy - 0.6 * Z);
  ctx.closePath();
  ctx.fill();
}

/** A float on a scrap of net, for the gear shed's sign. */
function netIcon(ctx: CanvasRenderingContext2D, sx: number, sy: number, Z: number): void {
  ctx.strokeStyle = '#2C4A7C';
  ctx.lineWidth = 0.8 * Z;
  for (const o of [-3, 0, 3]) {
    ctx.beginPath();
    ctx.moveTo(sx + o * Z - 2 * Z, sy - 3 * Z);
    ctx.lineTo(sx + o * Z + 2 * Z, sy + 3 * Z);
    ctx.moveTo(sx + o * Z + 2 * Z, sy - 3 * Z);
    ctx.lineTo(sx + o * Z - 2 * Z, sy + 3 * Z);
    ctx.stroke();
  }
  ctx.fillStyle = CORK;
  ctx.beginPath();
  ctx.arc(sx, sy - 3 * Z, 1.8 * Z, 0, Math.PI * 2);
  ctx.fill();
}

/** The plot's sign, on two legs at the near edge: a board with what goes there on it. */
function sign(
  v: DrawView,
  x: number,
  y: number,
  icon: (ctx: CanvasRenderingContext2D, sx: number, sy: number, Z: number) => void,
): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  ctx.strokeStyle = STAKE;
  ctx.lineWidth = 1.6 * Z;
  for (const ox of [-7, 7]) {
    ctx.beginPath();
    ctx.moveTo(px(x + ox, y), py(x + ox, y, 0));
    ctx.lineTo(px(x + ox, y), py(x + ox, y, 14));
    ctx.stroke();
  }
  v.box(x - 10, y - 1, 20, 2, 5, 14, '#C98B4E', '#E6B877');
  icon(ctx, px(x, y + 1), py(x, y + 1, 9.5), Z);
}

/**
 * The gear shed, or its plot until it is built: open on the side toward the viewer, a seine hung up
 * inside to dry with its corks along the bottom, a flat roof in the boat's roof paint, and a spare
 * buoy by the door.
 */
export function drawBaseShed(view: DrawView, b: Base, built: boolean, roof: string): void {
  if (!b.shed) return;
  const v = lift(view, b.z);
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const { x, y, half, wall } = b.shed;
  const x0 = x - half;
  const x1 = x + half;
  const y0 = y - half;
  const y1 = y + half;
  if (!built) {
    plot(v, x0, y0, x1, y1);
    sign(v, x, y1, netIcon);
    return;
  }
  v.box(x0, y0, x1 - x0, y1 - y0, 0, wall, SHED_WALL, WALL_TOP);
  // The open front: dark inside, the net hung across it, the corks along its foot.
  ctx.fillStyle = '#4A3828';
  face(v, [x0 + 2, y1], [x1 - 2, y1], 0, wall - 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(214,228,230,.75)';
  ctx.lineWidth = 0.8 * Z;
  for (let i = 0; i <= 6; i++) {
    const a = x0 + 3 + ((x1 - x0 - 6) * i) / 6;
    ctx.beginPath();
    ctx.moveTo(px(a, y1), py(a, y1, wall - 3));
    ctx.lineTo(px(a + 4, y1), py(a + 4, y1, 3));
    ctx.moveTo(px(a + 4, y1), py(a + 4, y1, wall - 3));
    ctx.lineTo(px(a, y1), py(a, y1, 3));
    ctx.stroke();
  }
  ctx.fillStyle = CORK;
  for (let i = 0; i < 5; i++) {
    const a = x0 + 4 + ((x1 - x0 - 8) * i) / 4;
    ctx.beginPath();
    ctx.arc(px(a, y1), py(a, y1, 3), 1.6 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  v.box(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4, wall, wall + 3, roof, roof);
  // The spare buoy, by the front corner.
  const bx = px(x1 + 4, y1 + 2);
  const by = py(x1 + 4, y1 + 2, 5);
  ctx.fillStyle = '#E4572E';
  ctx.beginPath();
  ctx.arc(bx, by, 4.5 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF6E5';
  ctx.fillRect(bx - 4.5 * Z, by - 0.8 * Z, 9 * Z, 1.6 * Z);
}

/** The hut's lantern and window, punched into the night. */
export function baseHutLight(v: DrawView, b: Base, built: boolean): void {
  if (!built) return;
  v.light(b.hut.x, b.hut.y + b.hut.half, b.z + 12, 150, 0.9);
}
