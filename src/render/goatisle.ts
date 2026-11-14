/**
 * Drawing Goat Isle (world/goatisle.ts): its shallows and beach, the grass and the path up from the landing, a village
 * of little houses with pitched roofs and goats on every one (walking the ridges, one on the weathervane turning with
 * it, one on the harbourmaster's looking out to sea at you), pun signs on posts, the Kid Zone's pen with its kids
 * bouncing about, and the fog bank it hides in until the boat comes close.
 *
 * The goat is drawn here once, in screen space, so the later pieces (fainting goats, the king, the cave) can use it:
 * standing, walking, or fainted stiff on its side with its legs straight out.
 */

import { HEADSTONES } from '../data/goatyard';
import type { DrawView } from '../entities/entity';
import type { Goat } from '../entities/goats';
import { CASTLE15_DOOR } from '../world/goatcastle';
import {
  at15,
  CAVE15,
  CRATES15,
  FOG15,
  GOAT_ISLE,
  type GoatHouse,
  GRAVES15,
  HOUSES15,
  KID_ZONE,
  LANDING15,
  SIGNS15,
} from '../world/goatisle';
import type { Solid } from './layers';

const near = (v: DrawView, m: number) => v.onScreen(GOAT_ISLE.x, GOAT_ISLE.y, m * v.zoom);

/** A goat's look. */
export type GoatLook = {
  coat: string;
  /** The darker shade, for its far legs, horns and beard. */
  dark: string;
  /** A kid: smaller, no beard, nubs for horns. */
  kid?: boolean;
};
export const PLAIN_GOAT: GoatLook = { coat: '#F4F0E6', dark: '#9C907E' };
/** The pygmy goat found in the goat cave, and the pet it becomes: little, round and brown. */
export const PYGMY_GOAT: GoatLook = { coat: '#9C7A55', dark: '#5A4126', kid: true };
const BROWN_GOAT: GoatLook = { coat: '#C79B6B', dark: '#6E4C2E' };
const PIED_GOAT: GoatLook = { coat: '#3A3532', dark: '#1E1B19' };
const COATS: readonly GoatLook[] = [PLAIN_GOAT, BROWN_GOAT, PIED_GOAT];

/**
 * A goat, at screen x, y (where its feet are), at this zoom, facing right (1) or left (-1). step is its walk's phase;
 * faint, from 0 to 1, tips it over onto its back, stiff, its legs straight up.
 */
export function drawGoat(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  Z: number,
  face: number,
  look: GoatLook,
  step = 0,
  faint = 0,
): void {
  const k = (look.kid ? 0.62 : 1) * Z;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(face < 0 ? -k : k, k);
  // Fainted, it tips over backwards about its feet, all four legs go straight, and it lies on its side.
  if (faint > 0) {
    // Over onto its back, turning about the middle of its body, and down so its back rests on the ground: its legs
    // stick straight up.
    ctx.translate(0, 1.6 * faint - 6.2);
    ctx.rotate(-Math.PI * faint);
    ctx.translate(0, 6.2);
  }
  const swing = faint > 0 ? 0 : Math.sin(step) * 1.6;
  ctx.lineCap = 'round';
  // Its far legs first, darker.
  ctx.strokeStyle = look.dark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-3.6, -4.4);
  ctx.lineTo(-3.6 - swing, 0);
  ctx.moveTo(3.4, -4.4);
  ctx.lineTo(3.4 + swing, 0);
  ctx.stroke();
  // Its body and tail.
  ctx.fillStyle = look.coat;
  ctx.strokeStyle = 'rgba(40,30,20,.55)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.ellipse(0, -6.2, 5.6, 3.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-5.2, -7.6);
  ctx.lineTo(-6.8, -9.6);
  ctx.lineTo(-5.6, -6.6);
  ctx.closePath();
  ctx.fill();
  // Its near legs.
  ctx.strokeStyle = look.coat === PLAIN_GOAT.coat ? '#D9D2C2' : look.coat;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-2.6, -4.2);
  ctx.lineTo(-2.6 + swing, 0);
  ctx.moveTo(2.6, -4.2);
  ctx.lineTo(2.6 - swing, 0);
  ctx.stroke();
  // Hooves.
  ctx.fillStyle = '#2B2420';
  for (const [x, s] of [
    [-3.6, -swing],
    [3.4, swing],
    [-2.6, swing],
    [2.6, -swing],
  ] as const)
    ctx.fillRect(x + s - 0.8, -0.8, 1.6, 0.9);
  // The neck and head, up and forward.
  ctx.fillStyle = look.coat;
  ctx.strokeStyle = 'rgba(40,30,20,.55)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(3.4, -8.2);
  ctx.lineTo(6.4, -11.6);
  ctx.lineTo(8.4, -10.8);
  ctx.lineTo(5.2, -6.4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(7.6, -11.6, 2.6, 1.7, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // An ear sticking out sideways, and the horns curling back.
  ctx.beginPath();
  ctx.ellipse(5.6, -12.4, 1.6, 0.7, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = look.kid ? '#B9A88C' : '#8A7A62';
  ctx.lineWidth = look.kid ? 0.9 : 1.1;
  ctx.beginPath();
  ctx.moveTo(6.6, -12.8);
  if (look.kid) ctx.lineTo(6.2, -14);
  else ctx.quadraticCurveTo(5.4, -16.6, 3.6, -15.4);
  ctx.stroke();
  // The eye: open, or a cross when it has fainted.
  ctx.strokeStyle = '#1A1512';
  ctx.fillStyle = '#1A1512';
  if (faint > 0.6) {
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(7.2, -12.6);
    ctx.lineTo(8.2, -11.6);
    ctx.moveTo(8.2, -12.6);
    ctx.lineTo(7.2, -11.6);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(7.8, -12.1, 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  // The beard.
  if (!look.kid) {
    ctx.fillStyle = look.dark;
    ctx.beginPath();
    ctx.moveTo(8.6, -10.6);
    ctx.lineTo(9.2, -8.2);
    ctx.lineTo(7.8, -10.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Its shallows, in rings round it. */
export function drawGoatSea(v: DrawView, shallow: string, shore: string): void {
  if (!near(v, GOAT_ISLE.r + 340)) return;
  const { ctx } = v;
  v.isoEllipse(GOAT_ISLE.x, GOAT_ISLE.y, GOAT_ISLE.r + 320);
  ctx.fillStyle = '#20808B';
  ctx.fill();
  v.isoEllipse(GOAT_ISLE.x, GOAT_ISLE.y, GOAT_ISLE.r + 170);
  ctx.fillStyle = shallow;
  ctx.fill();
  v.isoEllipse(GOAT_ISLE.x, GOAT_ISLE.y, GOAT_ISLE.r + 65);
  ctx.fillStyle = shore;
  ctx.fill();
}

/** A path round an ellipse in the world, flat on the ground, rx along x and ry along y. */
function flatEllipse(v: DrawView, x: number, y: number, rx: number, ry: number): void {
  const { ctx } = v;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const wx = x + Math.cos(a) * rx;
    const wy = y + Math.sin(a) * ry;
    if (i === 0) ctx.moveTo(v.px(wx, wy), v.py(wx, wy));
    else ctx.lineTo(v.px(wx, wy), v.py(wx, wy));
  }
  ctx.closePath();
}

/** The beach, the grass, and the path up from the landing into the village. */
export function drawGoatFlat(v: DrawView, foam: string, sand: string): void {
  if (!near(v, GOAT_ISLE.r + 40)) return;
  const { ctx } = v;
  const Z = v.zoom;
  const { x, y, r } = GOAT_ISLE;
  v.isoEllipse(x, y, r + 9 + Math.sin(v.T * 1.3 + 2) * 3);
  ctx.strokeStyle = foam;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 4 * Z;
  ctx.stroke();
  ctx.globalAlpha = 1;
  v.isoEllipse(x, y, r);
  ctx.fillStyle = sand;
  ctx.fill();
  // The grass, set back up the island from the beach the boat runs up onto.
  v.isoEllipse(...at15(22, -22), r - 44);
  ctx.fillStyle = '#7DBB6B';
  ctx.fill();
  v.isoEllipse(...at15(50, -50), r - 110);
  ctx.fillStyle = '#86C474';
  ctx.fill();
  // The path, from the landing past the harbourmaster's and up between the houses.
  ctx.strokeStyle = '#D9BE86';
  ctx.lineCap = 'round';
  ctx.lineWidth = 14 * Z;
  ctx.beginPath();
  const pts: [number, number][] = [
    [LANDING15.x, LANDING15.y],
    at15(-120, 110),
    at15(-50, 30),
    at15(20, 10),
    at15(70, -20),
  ];
  pts.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(v.px(px, py), v.py(px, py));
    else ctx.lineTo(v.px(px, py), v.py(px, py));
  });
  ctx.stroke();
  // And up the hill to the castle's gate.
  ctx.lineWidth = 11 * Z;
  ctx.beginPath();
  const [bx, by] = at15(-50, 30);
  ctx.moveTo(v.px(bx, by), v.py(bx, by));
  ctx.lineTo(v.px(CASTLE15_DOOR.x, CASTLE15_DOOR.y), v.py(CASTLE15_DOOR.x, CASTLE15_DOOR.y));
  ctx.stroke();
  ctx.lineCap = 'butt';
  // The Kid Zone's patch, trodden to dirt.
  flatEllipse(v, KID_ZONE.x, KID_ZONE.y, KID_ZONE.r, KID_ZONE.r);
  ctx.fillStyle = '#C9B07A';
  ctx.fill();
}

/** A quad on the canvas, from world corners at their heights. */
function quad(v: DrawView, pts: readonly [number, number, number][], fill: string): void {
  const { ctx } = v;
  ctx.beginPath();
  pts.forEach(([x, y, z], i) => {
    if (i === 0) ctx.moveTo(v.px(x, y), v.py(x, y, z));
    else ctx.lineTo(v.px(x, y), v.py(x, y, z));
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Its roof's ridge, end to end, and how high it stands. */
export function ridgeOf(h: GoatHouse): {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  z: number;
} {
  const alongX = h.x1 - h.x0 >= h.y1 - h.y0;
  const rise = Math.min(h.x1 - h.x0, h.y1 - h.y0) * 0.42;
  const mx = (h.x0 + h.x1) / 2;
  const my = (h.y0 + h.y1) / 2;
  return alongX
    ? { ax: h.x0, ay: my, bx: h.x1, by: my, z: h.wall + rise }
    : { ax: mx, ay: h.y0, bx: mx, by: h.y1, z: h.wall + rise };
}

/** Shade a hex colour by k (below 1 darker), as hex: the box drawer shades its sides from it. */
function shade(hex: string, k: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0')}`;
}

/** A house: its walls, a door and windows on its two faces toward the viewer, and its pitched roof. */
function drawHouse(v: DrawView, h: GoatHouse): void {
  const { ctx } = v;
  const Z = v.zoom;
  v.box(h.x0, h.y0, h.x1 - h.x0, h.y1 - h.y0, 0, h.wall, shade(h.walls, 0.84), h.walls);
  // The door, on the face toward the bottom of the screen (y1), and windows either side of it and on the x1 face.
  const mx = (h.x0 + h.x1) / 2;
  const my = (h.y0 + h.y1) / 2;
  quad(
    v,
    [
      [mx - 3, h.y1, 0],
      [mx + 3, h.y1, 0],
      [mx + 3, h.y1, 9],
      [mx - 3, h.y1, 9],
    ],
    '#6B4A2C',
  );
  const lit = v.dark > 0.3 ? '#FFD98A' : '#9CC7D6';
  for (const wx of [h.x0 + 6, h.x1 - 6])
    if (Math.abs(wx - mx) > 7)
      quad(
        v,
        [
          [wx - 2.5, h.y1, 5],
          [wx + 2.5, h.y1, 5],
          [wx + 2.5, h.y1, 10],
          [wx - 2.5, h.y1, 10],
        ],
        lit,
      );
  quad(
    v,
    [
      [h.x1, my - 3, 5],
      [h.x1, my + 3, 5],
      [h.x1, my + 3, 10],
      [h.x1, my - 3, 10],
    ],
    lit,
  );
  // The roof, its eaves a little out over the walls: the far slope, the gable end toward the viewer, the near slope.
  const e = 3;
  const r = ridgeOf(h);
  const x0 = h.x0 - e;
  const x1 = h.x1 + e;
  const y0 = h.y0 - e;
  const y1 = h.y1 + e;
  const z = h.wall - 1;
  const dark = shade(h.roof, 0.78);
  if (r.ay === r.by) {
    quad(
      v,
      [
        [x0, y0, z],
        [x1, y0, z],
        [x1, r.ay, r.z],
        [x0, r.ay, r.z],
      ],
      dark,
    );
    quad(
      v,
      [
        [h.x1, h.y0, h.wall],
        [h.x1, h.y1, h.wall],
        [h.x1, r.ay, r.z - 1],
      ],
      shade(h.walls, 0.84),
    );
    quad(
      v,
      [
        [x0, y1, z],
        [x1, y1, z],
        [x1, r.ay, r.z],
        [x0, r.ay, r.z],
      ],
      h.roof,
    );
  } else {
    quad(
      v,
      [
        [x0, y0, z],
        [x0, y1, z],
        [r.ax, y1, r.z],
        [r.ax, y0, r.z],
      ],
      dark,
    );
    quad(
      v,
      [
        [h.x0, h.y1, h.wall],
        [h.x1, h.y1, h.wall],
        [r.ax, h.y1, r.z - 1],
      ],
      h.walls,
    );
    quad(
      v,
      [
        [x1, y0, z],
        [x1, y1, z],
        [r.ax, y1, r.z],
        [r.ax, y0, r.z],
      ],
      h.roof,
    );
  }
  ctx.strokeStyle = shade(h.roof, 0.6);
  ctx.lineWidth = 1.2 * Z;
  ctx.beginPath();
  ctx.moveTo(v.px(r.ax, r.ay), v.py(r.ax, r.ay, r.z));
  ctx.lineTo(v.px(r.bx, r.by), v.py(r.bx, r.by, r.z));
  ctx.stroke();
}

/** Which way a goat moving by dx, dy in the world faces on screen. */
const faceOf = (dx: number, dy: number) => (dx - dy >= 0 ? 1 : -1);

/** Where each goat on a roof is now: walking up and down its ridge, turning at the ends. */
/** A goat on a roof: where it stands, which way it faces, its stride, whether it stands still, and its coat (fixed). */
export type RoofGoat = {
  x: number;
  y: number;
  z: number;
  face: number;
  step: number;
  still: boolean;
  coat: number;
};

export function roofGoats(h: GoatHouse, i: number, T: number): RoofGoat[] {
  const r = ridgeOf(h);
  const out: RoofGoat[] = [];
  // The harbourmaster's goat stands at the end toward the sea and looks out at whoever is coming.
  if (i === 0) {
    const t = 0.82;
    out.push({
      x: r.ax + (r.bx - r.ax) * t,
      y: r.ay + (r.by - r.ay) * t,
      z: r.z,
      face: -1,
      step: 0,
      still: true,
      coat: 0,
    });
    return out;
  }
  for (let g = 0; g < h.goats; g++) {
    const p = T * (0.18 + 0.05 * g) + i * 1.7 + g * 2.3;
    const t =
      0.5 +
      0.38 * Math.sin(p) * (h.goats > 1 ? 0.5 : 1) +
      (h.goats > 1 ? (g / (h.goats - 1) - 0.5) * 0.5 : 0);
    const dir = Math.cos(p);
    out.push({
      x: r.ax + (r.bx - r.ax) * t,
      y: r.ay + (r.by - r.ay) * t,
      z: r.z,
      face: faceOf((r.bx - r.ax) * dir, (r.by - r.ay) * dir),
      step: T * 8 + g,
      still: false,
      coat: i + g,
    });
  }
  return out;
}

/** A sign on a post: a wooden board with its words, facing the screen. */
function drawSign(v: DrawView, x: number, y: number, text: string, z = 18): void {
  v.box(x - 1, y - 1, 2, 2, 0, z, '#6B4A2C', '#7E5834');
  drawBoard(v, v.px(x, y), v.py(x, y, z + 5), text);
}

/** A board with words on it, at screen x, y (its middle). */
function drawBoard(v: DrawView, sx: number, sy: number, text: string): void {
  const { ctx } = v;
  const Z = v.zoom;
  ctx.save();
  const font = (s: number) => `700 ${s}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  const size = 5.6 * Z;
  ctx.font = font(size);
  const w = ctx.measureText(text).width + 7 * Z;
  const h = 9.5 * Z;
  ctx.fillStyle = '#B98A55';
  ctx.strokeStyle = '#6B4A2C';
  ctx.lineWidth = 1 * Z;
  ctx.fillRect(sx - w / 2, sy - h / 2, w, h);
  ctx.strokeRect(sx - w / 2, sy - h / 2, w, h);
  ctx.fillStyle = '#3A2614';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, sx, sy + 0.4 * Z);
  ctx.restore();
}

/** Billy's weathervane: a goat on a pole at the ridge's middle, swinging round with the wind. */
function drawWeathervane(v: DrawView, h: GoatHouse): void {
  const { ctx } = v;
  const Z = v.zoom;
  const r = ridgeOf(h);
  const x = (r.ax + r.bx) / 2;
  const y = (r.ay + r.by) / 2;
  const sx = v.px(x, y);
  const top = v.py(x, y, r.z + 14);
  ctx.strokeStyle = '#3A3A3A';
  ctx.lineWidth = 1.2 * Z;
  ctx.beginPath();
  ctx.moveTo(sx, v.py(x, y, r.z));
  ctx.lineTo(sx, top);
  ctx.stroke();
  const a = Math.sin(v.T * 0.35) * 2.2;
  const sq = Math.cos(a);
  ctx.save();
  ctx.translate(sx, top);
  ctx.scale(Math.max(0.15, Math.abs(sq)), 1);
  drawGoat(ctx, 0, 0, Z * 0.8, sq >= 0 ? 1 : -1, { coat: '#3A3A3A', dark: '#222222' });
  ctx.restore();
}

/** The Kid Zone's fence, its posts and rail, and its kids bouncing about inside. */
function drawKidZone(v: DrawView): Solid[] {
  const out: Solid[] = [];
  const { x, y, r } = KID_ZONE;
  const N = 14;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const b = ((i + 1) / N) * Math.PI * 2;
    const ax = x + Math.cos(a) * r;
    const ay = y + Math.sin(a) * r;
    const bx = x + Math.cos(b) * r;
    const by = y + Math.sin(b) * r;
    // A gap in the fence toward the path, for a gate.
    if (i === 3) continue;
    out.push({
      d: (ax + bx + ay + by) / 2,
      f: () => {
        const { ctx } = v;
        const Z = v.zoom;
        ctx.strokeStyle = '#8A6A43';
        ctx.lineWidth = 1.6 * Z;
        ctx.beginPath();
        ctx.moveTo(v.px(ax, ay), v.py(ax, ay, 0));
        ctx.lineTo(v.px(ax, ay), v.py(ax, ay, 7));
        ctx.moveTo(v.px(ax, ay), v.py(ax, ay, 6));
        ctx.lineTo(v.px(bx, by), v.py(bx, by, 6));
        ctx.moveTo(v.px(ax, ay), v.py(ax, ay, 3));
        ctx.lineTo(v.px(bx, by), v.py(bx, by, 3));
        ctx.stroke();
      },
    });
  }
  const kids = 4;
  for (let k = 0; k < kids; k++) {
    const p = v.T * (0.5 + k * 0.13) + k * 1.9;
    const kx = x + Math.cos(p) * r * 0.55 * (k % 2 ? 1 : -0.8);
    const ky = y + Math.sin(p * 1.3) * r * 0.5;
    const hop = Math.abs(Math.sin(v.T * (5 + k))) * 5;
    const dx = -Math.sin(p) * (k % 2 ? 1 : -0.8);
    const dy = Math.cos(p * 1.3) * 1.3;
    const look = COATS[k % COATS.length] ?? PLAIN_GOAT;
    out.push({
      d: kx + ky,
      f: () => {
        const { ctx } = v;
        const Z = v.zoom;
        v.isoEllipse(kx, ky, 3);
        ctx.fillStyle = 'rgba(0,0,0,.14)';
        ctx.fill();
        drawGoat(
          ctx,
          v.px(kx, ky),
          v.py(kx, ky, hop),
          Z,
          faceOf(dx, dy),
          { ...look, kid: true },
          v.T * 9,
        );
      },
    });
  }
  return out;
}

/** The harbourmaster's crates by the landing, where the catch is sold. */
function drawCrates15(v: DrawView): void {
  const { x, y } = CRATES15;
  v.box(x - 6, y - 6, 12, 12, 0, 10, '#8A6238', '#A87C4A');
  v.box(x + 7, y - 4, 9, 9, 0, 8, '#8A6238', '#A87C4A');
}

/** The houses, the goats on them, the signs, the pen and its kids, the crates, each sorted on its own. */
export function goatSolids(v: DrawView): Solid[] {
  if (!near(v, GOAT_ISLE.r + 260)) return [];
  const out: Solid[] = [];
  HOUSES15.forEach((h, i) => {
    out.push({
      d: h.x1 + h.y1,
      f: () => {
        drawHouse(v, h);
        if (h.name)
          drawBoard(
            v,
            v.px((h.x0 + h.x1) / 2, h.y1),
            v.py((h.x0 + h.x1) / 2, h.y1, h.wall + 1),
            h.name,
          );
        if (i === 2) drawWeathervane(v, h);
        for (const g of roofGoats(h, i, v.T)) {
          const look = COATS[g.coat % COATS.length] ?? PLAIN_GOAT;
          drawGoat(
            v.ctx,
            v.px(g.x, g.y),
            v.py(g.x, g.y, g.z),
            v.zoom,
            g.face,
            look,
            g.still ? 0 : g.step,
          );
        }
      },
    });
  });
  for (const s of SIGNS15) out.push({ d: s.x + s.y, f: () => drawSign(v, s.x, s.y, s.text) });
  out.push({ d: CAVE15.x + CAVE15.y + CAVE15.r * 0.7, f: () => drawCaveMouth(v) });
  out.push(...drawKidZone(v));
  out.push({ d: CRATES15.x + CRATES15.y + 8, f: () => drawCrates15(v) });
  return out;
}

/**
 * The fog bank round the island, k from 1 (thick, hiding it) to 0 (gone): soft white drifts over the water, thickest
 * over the island. Drawn over everything at sea.
 */
export function drawGoatFog(v: DrawView, k: number): void {
  if (k <= 0 || !near(v, GOAT_ISLE.r + FOG15 + 200)) return;
  const { ctx } = v;
  const Z = v.zoom;
  const R = GOAT_ISLE.r + FOG15;
  const N = 46;
  ctx.save();
  for (let i = 0; i < N; i++) {
    const a = i * 2.39996 + v.T * 0.02;
    const d = Math.sqrt((i + 0.5) / N) * R;
    const x = GOAT_ISLE.x + Math.cos(a) * d + Math.sin(v.T * 0.15 + i) * 18;
    const y = GOAT_ISLE.y + Math.sin(a) * d + Math.cos(v.T * 0.12 + i * 1.3) * 18;
    const sx = v.px(x, y);
    const sy = v.py(x, y, 30);
    const rr = (150 - (d / R) * 40) * Z;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr);
    const a0 = Math.min(1, k * (0.75 - (d / R) * 0.3));
    g.addColorStop(0, `rgba(238,242,243,${a0})`);
    g.addColorStop(0.6, `rgba(232,237,239,${a0 * 0.7})`);
    g.addColorStop(1, 'rgba(232,237,239,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rr, rr * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * The fainting goats (entities/goats.ts), each sorted on its own: a shadow, the goat standing, ambling, or over on its
 * side with its legs stiff, and a "!" over one in the moment it is startled. A goat lying stiff quivers a little.
 */
export function goatHerdSolids(v: DrawView, goats: readonly Goat[]): Solid[] {
  if (!near(v, GOAT_ISLE.r + 120)) return [];
  const out: Solid[] = [];
  for (const g of goats) {
    if (!v.onScreen(g.x, g.y, 40 * v.zoom)) continue;
    out.push({
      d: g.x + g.y,
      f: () => {
        const { ctx } = v;
        const Z = v.zoom;
        v.isoEllipse(g.x, g.y, 5 + g.k * 3);
        ctx.fillStyle = 'rgba(0,0,0,.15)';
        ctx.fill();
        const face = faceOf(Math.cos(g.h), Math.sin(g.h));
        const quiver = g.k >= 1 ? Math.sin(v.T * 40 + g.look) * 0.4 * Z : 0;
        const look = COATS[g.look % COATS.length] ?? PLAIN_GOAT;
        const sx = v.px(g.x, g.y) + quiver;
        const sy = v.py(g.x, g.y);
        drawGoat(ctx, sx, sy, Z, face, look, g.state === 'walk' ? g.step : 0, g.k);
        if (g.state === 'startled') {
          ctx.save();
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#3A2614';
          ctx.lineWidth = 2.2 * Z;
          ctx.font = `900 ${11 * Z}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
          ctx.textAlign = 'center';
          ctx.strokeText('!', sx, sy - 18 * Z);
          ctx.fillText('!', sx, sy - 18 * Z);
          ctx.restore();
        }
      },
    });
  }
  return out;
}

/** A ghost goat: pale, see-through, a wisp for legs. */
const GHOST: GoatLook = { coat: '#EAF4FF', dark: '#B7C8DC' };

/**
 * The Goat-yard (data/goatyard.ts): crooked grey headstones in two rows along the far shore, Tiny's the biggest, a
 * little mound of grass before each. A friendly ghost goat bobs over three of them, waving, brighter at night; the
 * jester's ghost pops up out of his for a few seconds after his stone is read (gotcha from 1 down to 0).
 */
export function goatyardSolids(v: DrawView, gotcha: number): Solid[] {
  if (!near(v, GOAT_ISLE.r + 120)) return [];
  const out: Solid[] = [];
  GRAVES15.forEach((g, i) => {
    if (!v.onScreen(g.x, g.y, 50 * v.zoom)) return;
    const h = HEADSTONES[i];
    if (!h) return;
    out.push({
      d: g.x + g.y,
      f: () => {
        const { ctx } = v;
        const Z = v.zoom;
        const k = h.big ? 1.7 : 1;
        v.isoEllipse(g.x + 3, g.y + 3, 6 * k);
        ctx.fillStyle = '#6FAE5E';
        ctx.fill();
        const sx = v.px(g.x, g.y);
        const sy = v.py(g.x, g.y);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(g.lean);
        const w = 9 * k * Z;
        const hh = 12 * k * Z;
        // Its side, a little darker, then its face with a rounded top.
        ctx.fillStyle = '#7E878B';
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 2 * Z, 0);
        ctx.lineTo(-w / 2 + 2 * Z, -hh + w / 2);
        ctx.arc(2 * Z, -hh + w / 2 - 1.5 * Z, w / 2, Math.PI, 0);
        ctx.lineTo(w / 2 + 2 * Z, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#A4ADB1';
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        ctx.lineTo(-w / 2, -hh + w / 2);
        ctx.arc(0, -hh + w / 2, w / 2, Math.PI, 0);
        ctx.lineTo(w / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5E676B';
        ctx.font = `800 ${2.6 * k * Z}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RIP', 0, -hh + w / 2 + 1 * Z);
        ctx.restore();
        // A ghost on it, or the jester's popping up.
        const pop = h.gotcha ? gotcha : 0;
        if (h.ghost || pop > 0) {
          const bob = Math.sin(v.T * 2 + i) * 2.5 * Z;
          const rise = h.gotcha ? (1 - (1 - Math.min(1, (1 - pop) * 4)) ** 2) * 10 * Z : 0;
          ctx.save();
          ctx.globalAlpha = (h.gotcha ? Math.min(1, pop * 3) : 1) * (0.5 + 0.3 * v.dark);
          const gx = sx + 3 * Z;
          const gy = sy - hh - 4 * Z + bob - rise;
          // A wavy wisp under it instead of legs, then the goat, and a hoof up, waving.
          ctx.fillStyle = GHOST.coat;
          ctx.beginPath();
          ctx.moveTo(gx - 6 * Z, gy - 4 * Z);
          for (let t = 0; t <= 6; t++) ctx.lineTo(gx - 6 * Z + t * 2 * Z, gy + (t % 2 ? 3 : 0) * Z);
          ctx.lineTo(gx + 6 * Z, gy - 4 * Z);
          ctx.closePath();
          ctx.fill();
          drawGoat(ctx, gx, gy, Z, i % 2 ? 1 : -1, GHOST);
          ctx.strokeStyle = GHOST.coat;
          ctx.lineWidth = 1.6 * Z;
          ctx.lineCap = 'round';
          const wave = Math.sin(v.T * 6 + i) * 0.5;
          const dir = i % 2 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(gx + dir * 3 * Z, gy - 7 * Z);
          ctx.lineTo(gx + dir * (6 + wave * 2) * Z, gy - 12 * Z);
          ctx.stroke();
          ctx.restore();
        }
      },
    });
  });
  return out;
}

/** The goat cave's mouth: a mound of grey rock with moss on top, and a dark arched doorway in its front. */
function drawCaveMouth(v: DrawView): void {
  const { ctx } = v;
  const Z = v.zoom;
  const { x, y, r } = CAVE15;
  v.isoEllipse(x, y, r + 4);
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.fill();
  // The mound, in rings of rock getting smaller as they go up.
  const rings: [number, number, string][] = [
    [r, 0, '#7E7670'],
    [r * 0.82, 10, '#8C847D'],
    [r * 0.6, 19, '#9A928A'],
    [r * 0.34, 26, '#7FA35E'],
  ];
  for (const [rr, z, c] of rings) {
    v.isoEllipse(x, y, rr, z);
    ctx.fillStyle = c;
    ctx.fill();
  }
  // The doorway, toward the viewer.
  const dx = x + r * Math.SQRT1_2;
  const dy = y + r * Math.SQRT1_2;
  const sx = v.px(dx, dy);
  const sy = v.py(dx, dy, 0);
  ctx.fillStyle = '#1A1218';
  ctx.beginPath();
  ctx.moveTo(sx - 7 * Z, sy);
  ctx.lineTo(sx - 7 * Z, sy - 9 * Z);
  ctx.arc(sx, sy - 9 * Z, 7 * Z, Math.PI, 0);
  ctx.lineTo(sx + 7 * Z, sy);
  ctx.closePath();
  ctx.fill();
  // A glint of cheese crystal inside.
  ctx.fillStyle = 'rgba(255,214,90,.8)';
  ctx.fillRect(sx - 1 * Z, sy - 10 * Z, 2 * Z, 2 * Z);
}
