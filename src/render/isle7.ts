/**
 * Drawing island 7: its shallows, the sand and the grass, the trading post by
 * the landing, the tower in the middle, palms, the monkey camp's huts round
 * their fire with the totem and the chest, and the alien portal: a ring of
 * strange grey metal on two feet over a scorched patch of grass, with lights
 * round it. Dead, the lights are dim and the ring is empty; awake, the lights
 * burn green and the ring fills with a turning green and violet light. Stand-in
 * shapes, in island 2's style, until the kid draws it.
 */
import { rgba } from '../core/color';
import type { DrawView } from '../entities/entity';
import type { Point } from '../world/island';
import {
  CHEST7,
  FIRE7,
  HUTS7,
  ISLE7,
  PALMS7,
  PORTAL_FEET,
  PORTAL7,
  POST7,
  SCORCH7,
  TOTEM7,
  TOWER7,
} from '../world/isle7';
import type { Solid } from './layers';

/** What changes on island 7: the camp's chest is open, the tower is beaten and flies a flag, the portal is this awake (0 to 1). */
export type Isle7Look = {
  cleared: boolean;
  /** Draws the player's flag at a screen point, or null while the sorcerer holds the tower. */
  flag: ((sx: number, sy: number) => void) | null;
  open: number;
};

/** Its shallows, in rings out from the sand. */
export function drawIsle7Sea(v: DrawView): void {
  const { ctx } = v;
  if (!v.onScreen(ISLE7.x, ISLE7.y, (ISLE7.r + 340) * v.zoom)) return;
  v.isoEllipse(ISLE7.x, ISLE7.y, ISLE7.r + 330);
  ctx.fillStyle = '#20808B';
  ctx.fill();
  v.isoEllipse(ISLE7.x, ISLE7.y, ISLE7.r + 180);
  ctx.fillStyle = '#35A0A6';
  ctx.fill();
  v.isoEllipse(ISLE7.x, ISLE7.y, ISLE7.r + 70);
  ctx.fillStyle = '#7DD2C8';
  ctx.fill();
}

/** Its sand, grass and the scorched ring round the portal, with a foam line at the water. */
export function drawIsle7Flat(v: DrawView): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  if (!v.onScreen(ISLE7.x, ISLE7.y, (ISLE7.r + 40) * Z)) return;
  v.isoEllipse(ISLE7.x, ISLE7.y, ISLE7.r + 9 + Math.sin(T * 1.3 + 2) * 3);
  ctx.strokeStyle = v.foam;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 4 * Z;
  ctx.stroke();
  ctx.globalAlpha = 1;
  v.isoEllipse(ISLE7.x, ISLE7.y, ISLE7.r);
  ctx.fillStyle = '#F2D9A0';
  ctx.fill();
  v.isoEllipse(ISLE7.x - 10, ISLE7.y + 30, ISLE7.r - 80);
  ctx.fillStyle = '#6FB062';
  ctx.fill();
  // Scorched grass round the portal, where it came down.
  ctx.fillStyle = '#7E8A55';
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = SCORCH7 * (0.86 + 0.14 * Math.sin(a * 5 + 1) * Math.cos(a * 3));
    const x = PORTAL7.x + Math.cos(a) * r;
    const y = PORTAL7.y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(v.px(x, y), v.py(x, y));
    else ctx.lineTo(v.px(x, y), v.py(x, y));
  }
  ctx.closePath();
  ctx.fill();
  v.isoEllipse(PORTAL7.x, PORTAL7.y, SCORCH7 * 0.55);
  ctx.fillStyle = '#5E6644';
  ctx.fill();
}

/** A palm, leaning one way or the other by its number. */
export function drawPalm7(v: DrawView, x: number, y: number, i: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const lean = (i % 2 ? 1 : -1) * (6 + (i % 3) * 2);
  const bx = px(x, y);
  const by = py(x, y);
  const tx = px(x + lean, y) + Math.sin(T * 0.9 + x) * 3 * Z;
  const ty = py(x + lean, y, 58);
  ctx.strokeStyle = '#8A6A43';
  ctx.lineWidth = 5 * Z;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(bx + lean * 0.2 * Z, (by + ty) / 2, tx, ty);
  ctx.stroke();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    ctx.fillStyle = k % 2 ? '#4FA35B' : '#3E8E4E';
    ctx.beginPath();
    ctx.ellipse(
      tx + Math.cos(a) * 13 * Z,
      ty + Math.sin(a) * 6 * Z + 2 * Z,
      15 * Z,
      5.5 * Z,
      Math.atan2(Math.sin(a) * 0.5 + 0.25, Math.cos(a)),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

/** The trading post: plank walls, a purple roof, and a fish sign over the door on the near side. */
function drawPost7(v: DrawView): void {
  const { ctx, px, py } = v;
  const { x0, y0, x1, y1 } = POST7;
  v.box(x0 + 4, y0 + 4, x1 - x0 - 8, y1 - y0 - 8, 0, 30, '#E9D3A6', '#E9D3A6');
  ctx.fillStyle = '#6B4A2C';
  ctx.beginPath();
  ctx.moveTo(px(x0 + 16, y1 - 4), py(x0 + 16, y1 - 4, 0));
  ctx.lineTo(px(x0 + 28, y1 - 4), py(x0 + 28, y1 - 4, 0));
  ctx.lineTo(px(x0 + 28, y1 - 4), py(x0 + 28, y1 - 4, 20));
  ctx.lineTo(px(x0 + 16, y1 - 4), py(x0 + 16, y1 - 4, 20));
  ctx.closePath();
  ctx.fill();
  v.box(x0, y0, x1 - x0, y1 - y0, 30, 38, '#6E4F9A', '#8566B4');
}

/** The tower: eight sides of dark stone, a door, slit windows lit purple at night while the sorcerer holds it, battlements and a pole. */
function drawTower7(v: DrawView, look: Isle7Look): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const { x, y, r, h } = TOWER7;
  const pts: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  v.extrude(pts, 0, h, '#7D8582', '#A7AFAB');
  const c = r * 0.924 * Math.SQRT1_2;
  const fx = x + c;
  const fy = y + c;
  const tx = -Math.SQRT1_2;
  const ty = Math.SQRT1_2;
  const quad = (w: number, z0: number, z1: number, col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(px(fx - tx * w, fy - ty * w), py(fx - tx * w, fy - ty * w, z0));
    ctx.lineTo(px(fx + tx * w, fy + ty * w), py(fx + tx * w, fy + ty * w, z0));
    ctx.lineTo(px(fx + tx * w, fy + ty * w), py(fx + tx * w, fy + ty * w, z1));
    ctx.lineTo(px(fx - tx * w, fy - ty * w), py(fx - tx * w, fy - ty * w, z1));
    ctx.closePath();
    ctx.fill();
  };
  quad(7, 0, 24, '#3A2E28');
  for (const z of [64, 106, 140])
    quad(2, z, z + 11, v.dark > 0.3 && !look.flag ? '#B98AFF' : '#2B2F31');
  const top = [...pts].sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const p of top) v.box(p[0] - 4, p[1] - 4, 8, 8, h, h + 9, '#7D8582', '#B3BAB6');
  ctx.strokeStyle = '#8A6A43';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, h));
  ctx.lineTo(px(x, y), py(x, y, h + 40));
  ctx.stroke();
  look.flag?.(px(x, y), py(x, y, h + 40));
}

/** A hut of the monkey camp: plank walls, a door, and a thatched roof. */
function drawHut7(v: DrawView, x: number, y: number): void {
  const { ctx, px, py } = v;
  v.box(x - 9, y - 9, 18, 18, 0, 11, '#8A6A43', '#8A6A43');
  ctx.fillStyle = '#6B4A2C';
  ctx.beginPath();
  ctx.moveTo(px(x - 3, y + 9), py(x - 3, y + 9, 0));
  ctx.lineTo(px(x + 3, y + 9), py(x + 3, y + 9, 0));
  ctx.lineTo(px(x + 3, y + 9), py(x + 3, y + 9, 8));
  ctx.lineTo(px(x - 3, y + 9), py(x - 3, y + 9, 8));
  ctx.closePath();
  ctx.fill();
  const tx = px(x, y);
  const ty = py(x, y, 32);
  const r = 15;
  ctx.fillStyle = '#C9A15A';
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(px(x - r, y + r), py(x - r, y + r, 9));
  ctx.lineTo(px(x + r, y + r), py(x + r, y + r, 9));
  ctx.lineTo(px(x + r, y - r), py(x + r, y - r, 9));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#B08A47';
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(px(x + r, y + r), py(x + r, y + r, 9));
  ctx.lineTo(px(x + r, y - r), py(x + r, y - r, 9));
  ctx.closePath();
  ctx.fill();
}

/** The camp fire: a ring of stones, flames and smoke. */
function drawFire7(v: DrawView): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const { x, y } = FIRE7;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    ctx.fillStyle = '#8E989E';
    v.isoEllipse(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 3, 1);
    ctx.fill();
  }
  for (let k = 0; k < 3; k++) {
    const h = 7 + Math.sin(T * 9 + k * 2) * 2.5;
    ctx.fillStyle = k === 1 ? '#FFD24A' : '#F2913A';
    const sx = px(x + (k - 1) * 3, y);
    const sy = py(x + (k - 1) * 3, y, 1);
    ctx.beginPath();
    ctx.moveTo(sx - 2.5 * Z, sy);
    ctx.quadraticCurveTo(sx, sy - h * 2 * Z, sx + 2.5 * Z, sy);
    ctx.closePath();
    ctx.fill();
  }
  for (let k = 0; k < 3; k++) {
    const t = (T * 0.4 + k / 3) % 1;
    ctx.fillStyle = `rgba(220,220,220,${(1 - t) * 0.3})`;
    ctx.beginPath();
    ctx.arc(px(x, y), py(x, y, 14 + t * 40), (3 + t * 7) * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A skull on a pole. */
function drawTotem7(v: DrawView): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const { x, y } = TOTEM7;
  ctx.strokeStyle = '#5E3D1C';
  ctx.lineWidth = 2.4 * Z;
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, 0));
  ctx.lineTo(px(x, y), py(x, y, 30));
  ctx.stroke();
  const sx = px(x, y);
  const sy = py(x, y, 33);
  ctx.fillStyle = '#F4F1E6';
  ctx.beginPath();
  ctx.arc(sx, sy, 5 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(sx - 2.6 * Z, sy + 3 * Z, 5.2 * Z, 3 * Z);
  ctx.fillStyle = '#1E2227';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx + e * 1.9 * Z, sy - 0.5 * Z, 1.3 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The camp's chest: shut, or open with coins showing once the camp is beaten. */
function drawChest7(v: DrawView, open: boolean): void {
  const { ctx, px, py } = v;
  const { x, y } = CHEST7;
  v.box(x - 7, y - 5, 14, 10, 0, 8, '#7A4E25', '#8F5E2E');
  v.box(x - 7, y - 1, 14, 2, 0, 8.2, '#D9A520', '#F0C544');
  if (!open) {
    v.box(x - 7, y - 5, 14, 10, 8, 11, '#7A4E25', '#9A6A36');
    return;
  }
  ctx.fillStyle = '#5E3D1C';
  ctx.beginPath();
  ctx.moveTo(px(x - 7, y - 5), py(x - 7, y - 5, 8));
  ctx.lineTo(px(x + 7, y - 5), py(x + 7, y - 5, 8));
  ctx.lineTo(px(x + 7, y - 5), py(x + 7, y - 5, 18));
  ctx.lineTo(px(x - 7, y - 5), py(x - 7, y - 5, 18));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = v.coin;
  v.isoEllipse(x, y, 4, 9);
  ctx.fill();
}

/** The portal's ring stands this high off the ground, on its feet. */
export const PORTAL_LIFT = 10;
/** Lights round the ring. */
const LIGHTS = 10;

/** Where a portal stands: island 7's, or the one home in Gigantis's courtyard. */
type At = { x: number; y: number };

/**
 * A point on a portal's ring at angle t round it, 0 at the right as the viewer sees it: world x, y and
 * height.
 */
export function ringAt(
  t: number,
  r: number = PORTAL7.r,
  at: At = PORTAL7,
): [number, number, number] {
  const s = Math.cos(t) * r * Math.SQRT1_2;
  return [at.x + s, at.y - s, PORTAL_LIFT + PORTAL7.r + Math.sin(t) * r];
}

/** The ring as a path on the canvas, at radius r. */
function ringPath(v: DrawView, r: number, at: At): void {
  const { ctx, px, py } = v;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const [x, y, z] = ringAt((i / 40) * Math.PI * 2, r, at);
    if (i === 0) ctx.moveTo(px(x, y), py(x, y, z));
    else ctx.lineTo(px(x, y), py(x, y, z));
  }
  ctx.closePath();
}

/** The alien portal: its feet, the ring, its lights, and what fills it once it is awake. at moves it. */
export function drawPortal7(v: DrawView, open: number, at: At = PORTAL7): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const feet: readonly Point[] =
    at === PORTAL7
      ? PORTAL_FEET
      : PORTAL_FEET.map(([x, y]): Point => [x - PORTAL7.x + at.x, y - PORTAL7.y + at.y]);
  // The feet: struts from the ring's lower sides down to pads on the ground.
  for (const [fx, fy] of feet) {
    ctx.fillStyle = '#353A46';
    v.isoEllipse(fx, fy, 6);
    ctx.fill();
  }
  ctx.strokeStyle = '#353A46';
  ctx.lineWidth = 5 * Z;
  ctx.lineCap = 'round';
  feet.forEach(([fx, fy], i) => {
    const [rx, ry, rz] = ringAt(i === 0 ? Math.PI + 0.5 : -0.5, PORTAL7.r, at);
    ctx.beginPath();
    ctx.moveTo(px(fx, fy), py(fx, fy, 0));
    ctx.lineTo(px(rx, ry), py(rx, ry, rz));
    ctx.stroke();
  });
  // What fills the ring, once it is awake: a turning green and violet light.
  if (open > 0) {
    ringPath(v, PORTAL7.r - 4, at);
    ctx.save();
    ctx.clip();
    const [cx, cy, cz] = ringAt(0, 0, at);
    const sx = px(cx, cy);
    const sy = py(cx, cy, cz);
    // A little see-through, so whoever walks behind it is not lost.
    ctx.globalAlpha = open * 0.8;
    ctx.fillStyle = '#2A1446';
    ctx.fillRect(sx - 60 * Z, sy - 60 * Z, 120 * Z, 120 * Z);
    ctx.globalAlpha = open;
    for (let k = 0; k < 5; k++) {
      const a = T * (1.4 + k * 0.3) + k * 1.3;
      ctx.strokeStyle = k % 2 ? 'rgba(124,255,176,.7)' : 'rgba(190,130,255,.7)';
      ctx.lineWidth = (5 - k * 0.6) * Z;
      ctx.beginPath();
      const r = (PORTAL7.r - 4 - k * 7) * Z;
      ctx.ellipse(sx, sy, r * 1.2, r, 0, a, a + 2.2);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(200,255,220,${0.5 + 0.2 * Math.sin(T * 3)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 6 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  // Fins standing out from its top: a tall one in the middle and a short one either side.
  ctx.fillStyle = '#353A46';
  for (const [t, out] of [
    [Math.PI / 2, 20],
    [Math.PI / 2 + 0.9, 12],
    [Math.PI / 2 - 0.9, 12],
  ] as const) {
    const [ax, ay, az] = ringAt(t - 0.14, PORTAL7.r + 3, at);
    const [bx, by, bz] = ringAt(t + 0.14, PORTAL7.r + 3, at);
    const [tx, ty, tz] = ringAt(t, PORTAL7.r + out, at);
    ctx.beginPath();
    ctx.moveTo(px(ax, ay), py(ax, ay, az));
    ctx.lineTo(px(tx, ty), py(tx, ty, tz));
    ctx.lineTo(px(bx, by), py(bx, by, bz));
    ctx.closePath();
    ctx.fill();
  }
  // The ring itself: a heavy band of dark metal in plates, lit along its top edge.
  ringPath(v, PORTAL7.r, at);
  ctx.strokeStyle = '#353A46';
  ctx.lineWidth = 12 * Z;
  ctx.stroke();
  ringPath(v, PORTAL7.r, at);
  ctx.strokeStyle = '#5D6577';
  ctx.lineWidth = 6 * Z;
  ctx.stroke();
  ctx.strokeStyle = '#C9D3DE';
  ctx.lineWidth = 1.5 * Z;
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const [x, y, z] = ringAt(0.35 + (i / 16) * (Math.PI - 0.7), PORTAL7.r + 5, at);
    if (i === 0) ctx.moveTo(px(x, y), py(x, y, z));
    else ctx.lineTo(px(x, y), py(x, y, z));
  }
  ctx.stroke();
  ctx.strokeStyle = '#262A33';
  ctx.lineWidth = 1.2 * Z;
  for (let i = 0; i < LIGHTS; i++) {
    const t = ((i + 0.5) / LIGHTS) * Math.PI * 2;
    const [ax, ay, az] = ringAt(t, PORTAL7.r - 5, at);
    const [bx, by, bz] = ringAt(t, PORTAL7.r + 5, at);
    ctx.beginPath();
    ctx.moveTo(px(ax, ay), py(ax, ay, az));
    ctx.lineTo(px(bx, by), py(bx, by, bz));
    ctx.stroke();
  }
  // Lights set in the plates: dim, with the odd flicker, until it wakes; then green, chasing round.
  for (let i = 0; i < LIGHTS; i++) {
    const [x, y, z] = ringAt((i / LIGHTS) * Math.PI * 2, PORTAL7.r, at);
    const flick = Math.sin(T * 7 + i * 2.1) > 0.93 ? 0.6 : 0;
    const chase = 0.5 + 0.5 * Math.sin(T * 6 - i * 0.9);
    ctx.fillStyle =
      open > 0 ? rgba('#7CFFB0', 0.4 + 0.6 * chase * open) : rgba('#7FA394', 0.4 + flick);
    const sx = px(x, y);
    const sy = py(x, y, z);
    ctx.beginPath();
    ctx.moveTo(sx, sy - 3 * Z);
    ctx.lineTo(sx + 2.4 * Z, sy);
    ctx.lineTo(sx, sy + 3 * Z);
    ctx.lineTo(sx - 2.4 * Z, sy);
    ctx.closePath();
    ctx.fill();
  }
}

/** At night, the tower's top glows purple while the sorcerer holds it; and an awake portal glows green, night or day. */
export function isle7Glow(v: DrawView, look: Isle7Look): void {
  if (!v.onScreen(ISLE7.x, ISLE7.y, (ISLE7.r + 200) * v.zoom)) return;
  const { ctx, T } = v;
  ctx.globalCompositeOperation = 'screen';
  if (!look.flag && v.dark > 0.05)
    v.glow(
      TOWER7.x,
      TOWER7.y,
      TOWER7.h - 25,
      70,
      rgba('#B98AFF', 0.45 * v.dark * (0.8 + 0.2 * Math.sin(T * 2))),
    );
  if (look.open > 0)
    v.glow(
      PORTAL7.x,
      PORTAL7.y,
      PORTAL_LIFT + PORTAL7.r,
      90,
      rgba('#7CFFB0', look.open * (0.25 + 0.35 * v.dark) * (0.85 + 0.15 * Math.sin(T * 3))),
    );
  ctx.globalCompositeOperation = 'source-over';
}

/** What stands on island 7, for the game's depth-sorted solids. */
export function isle7Solids(v: DrawView, look: Isle7Look): Solid[] {
  if (!v.onScreen(ISLE7.x, ISLE7.y, (ISLE7.r + 260) * v.zoom)) return [];
  const out: Solid[] = [
    { d: POST7.x1 + POST7.y1, f: () => drawPost7(v) },
    { d: TOWER7.x + TOWER7.y, f: () => drawTower7(v, look) },
    { d: FIRE7.x + FIRE7.y, f: () => drawFire7(v) },
    { d: TOTEM7.x + TOTEM7.y, f: () => drawTotem7(v) },
    { d: CHEST7.x + CHEST7.y + 5, f: () => drawChest7(v, look.cleared) },
    { d: PORTAL7.x + PORTAL7.y, f: () => drawPortal7(v, look.open) },
  ];
  PALMS7.forEach(([x, y], i) => {
    out.push({ d: x + y, f: () => drawPalm7(v, x, y, i) });
  });
  for (const [x, y] of HUTS7) out.push({ d: x + y + 11, f: () => drawHut7(v, x, y) });
  return out;
}
