/**
 * Drawing island 6, the big island: its shallows following its bays and points,
 * the sand and the grass, the pier and the trading post toward home, the rocky
 * hill in the middle, palms and boulders, the leviathan's temple of green stone
 * half in the sea on the far side, and the treasure chests, shut or open.
 * Stand-in shapes until the kid draws it.
 */
import type { DrawView } from '../entities/entity';
import {
  BEACH_W,
  CHESTS6,
  HILL,
  ISLE6,
  PALMS6,
  PIER6,
  PIER6_Z,
  POST6,
  ROCKS6,
  shoreR,
  TEMPLE,
} from '../world/isle6';
import type { Solid } from './layers';

const N = 72;

/** Its outline, pushed out (or in) by off, as a path on the canvas. */
function outline(v: DrawView, off: number): void {
  const { ctx, px, py } = v;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = shoreR(a) + off;
    const x = ISLE6.x + Math.cos(a) * r;
    const y = ISLE6.y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px(x, y), py(x, y));
    else ctx.lineTo(px(x, y), py(x, y));
  }
  ctx.closePath();
}

/** Its shallows, following the shore. */
export function drawIsle6Sea(v: DrawView): void {
  const { ctx } = v;
  if (!v.onScreen(ISLE6.x, ISLE6.y, (ISLE6.r + 420) * v.zoom)) return;
  outline(v, 300);
  ctx.fillStyle = '#1D7480';
  ctx.fill();
  outline(v, 150);
  ctx.fillStyle = '#35A0A6';
  ctx.fill();
  outline(v, 55);
  ctx.fillStyle = '#7DD2C8';
  ctx.fill();
}

/** Its sand and grass, with a foam line at the water. */
export function drawIsle6Flat(v: DrawView): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  if (!v.onScreen(ISLE6.x, ISLE6.y, (ISLE6.r + 120) * Z)) return;
  outline(v, 8 + Math.sin(T * 1.3) * 3);
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 4 * Z;
  ctx.stroke();
  outline(v, 0);
  ctx.fillStyle = '#F2D9A0';
  ctx.fill();
  outline(v, -BEACH_W);
  ctx.fillStyle = '#6FB062';
  ctx.fill();
  outline(v, -BEACH_W - 120);
  ctx.fillStyle = '#62A456';
  ctx.fill();
}

function drawPalm6(v: DrawView, x: number, y: number, i: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const top = 44 + (i % 4) * 5;
  const lean = (i % 2 ? 1 : -1) * (4 + (i % 3) * 2);
  ctx.strokeStyle = '#8A6A43';
  ctx.lineWidth = 3.4 * Z;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, 0));
  ctx.quadraticCurveTo(
    px(x, y) + lean * 0.5 * Z,
    py(x, y, top * 0.5),
    px(x, y) + lean * Z,
    py(x, y, top),
  );
  ctx.stroke();
  const tx = px(x, y) + lean * Z;
  const ty = py(x, y, top);
  ctx.strokeStyle = '#3E9A4A';
  ctx.lineWidth = 3 * Z;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.sin(T * 0.8 + i) * 0.1;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * 11 * Z,
      ty - 4 * Z,
      tx + Math.cos(a) * 18 * Z,
      ty + 6 * Z,
    );
    ctx.stroke();
  }
}

/** The hill: stacked rock, darker below, a little green on top. */
function drawHill(v: DrawView): void {
  const { x, y, r } = HILL;
  const ring = (rr: number, n: number, rot: number): [number, number][] =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + rot;
      return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
    });
  v.extrude(ring(r, 9, 0.2), 0, 34, '#7A7468', '#948D80');
  v.extrude(ring(r * 0.72, 8, 0.5), 34, 66, '#857E71', '#9E9789');
  v.extrude(ring(r * 0.42, 7, 0.9), 66, 92, '#8E877A', '#6FA05E');
}

/** The temple of green stone: three stepped tiers and a dark doorway toward the island. */
function drawTemple(v: DrawView): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const { x, y, w } = TEMPLE;
  v.box(x - w, y - w * 0.8, w * 2, w * 1.6, -10, 20, '#3F6B57', '#5B8E74');
  v.box(x - w * 0.72, y - w * 0.56, w * 1.44, w * 1.12, 20, 44, '#46745F', '#6A9E83');
  v.box(x - w * 0.42, y - w * 0.32, w * 0.84, w * 0.64, 44, 66, '#4E7D67', '#79AD91');
  // The doorway, on the side toward the middle of the island.
  const dx = x;
  const dy = y + w * 0.8;
  ctx.fillStyle = '#16251E';
  ctx.beginPath();
  ctx.moveTo(px(dx - 14, dy), py(dx - 14, dy, 0));
  ctx.lineTo(px(dx - 14, dy), py(dx - 14, dy, 16));
  ctx.quadraticCurveTo(px(dx, dy), py(dx, dy, 26), px(dx + 14, dy), py(dx + 14, dy, 16));
  ctx.lineTo(px(dx + 14, dy), py(dx + 14, dy, 0));
  ctx.closePath();
  ctx.fill();
  // A tentacle carved over it.
  ctx.strokeStyle = 'rgba(160,220,180,.55)';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(px(dx - 18, dy), py(dx - 18, dy, 22));
  ctx.bezierCurveTo(
    px(dx - 6, dy),
    py(dx - 6, dy, 34),
    px(dx + 6, dy),
    py(dx + 6, dy, 12),
    px(dx + 18, dy),
    py(dx + 18, dy, 24),
  );
  ctx.stroke();
}

/** A treasure chest: wood and gold bands, the lid up and empty once opened. */
function drawChest6(v: DrawView, x: number, y: number, open: boolean): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  v.box(x - 7, y - 5, 14, 10, 0, 8, '#7A4E24', '#9A6532');
  if (open) {
    ctx.fillStyle = '#6A421E';
    ctx.fillRect(px(x, y) - 8 * Z, py(x, y, 8) - 9 * Z, 16 * Z, 7 * Z);
    return;
  }
  v.box(x - 7, y - 5, 14, 10, 8, 12, '#8A5A2B', '#B07A3E');
  ctx.fillStyle = '#F0C544';
  ctx.fillRect(px(x, y) - 1.5 * Z, py(x, y, 9) - 2 * Z, 3 * Z, 4 * Z);
}

/** The pier: planks on posts, out from the beach toward home. */
function drawPier6(v: DrawView): void {
  const { x0, y0, x1, y1 } = PIER6;
  for (let y = y0 + 20; y < y1; y += 34) v.box(x0 - 1, y, 3, 3, -6, PIER6_Z, '#5E3D1C', '#7A5230');
  v.box(x0, y0, x1 - x0, y1 - y0, PIER6_Z - 2, PIER6_Z, '#8A6A43', '#B48A5A');
}

/** The trading post: a hut with a striped awning and a fish over the door. */
function drawPost6(v: DrawView): void {
  const { x0, y0, x1, y1 } = POST6;
  v.box(x0, y0, x1 - x0, y1 - y0, 0, 30, '#E2CFA4', '#E2CFA4');
  v.box(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8, 30, 40, '#3F7FA0', '#5C9CC0');
}

/** What stands on island 6, for the game's depth-sorted solids. opened says which chests are empty. */
export function isle6Solids(v: DrawView, opened: (i: number) => boolean): Solid[] {
  if (!v.onScreen(ISLE6.x, ISLE6.y, (ISLE6.r + 260) * v.zoom)) return [];
  const out: Solid[] = [];
  PALMS6.forEach(([x, y], i) => {
    if (v.onScreen(x, y, 80 * v.zoom)) out.push({ d: x + y, f: () => drawPalm6(v, x, y, i) });
  });
  for (const [x, y] of ROCKS6)
    if (v.onScreen(x, y, 60 * v.zoom))
      out.push({ d: x + y, f: () => v.box(x - 9, y - 7, 18, 14, 0, 11, '#8E989E', '#A9B2B7') });
  CHESTS6.forEach(([x, y], i) => {
    if (v.onScreen(x, y, 60 * v.zoom))
      out.push({ d: x + y, f: () => drawChest6(v, x, y, opened(i)) });
  });
  out.push({ d: HILL.x + HILL.y + HILL.r * 0.5, f: () => drawHill(v) });
  out.push({ d: TEMPLE.x + TEMPLE.y + TEMPLE.w * 0.8, f: () => drawTemple(v) });
  out.push({ d: PIER6.x0 + PIER6.y0, f: () => drawPier6(v) });
  out.push({ d: POST6.x1 + POST6.y1, f: () => drawPost6(v) });
  return out;
}
