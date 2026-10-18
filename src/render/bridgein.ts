/**
 * Inside the metal bridge (world/bridgein.ts), drawn: metal walls with a light strip along them, the doors with their
 * signs over them, a plated floor; tall windows onto the night all round the observatory and square ones onto the tar
 * in the other rooms; the dock's back open onto the tar ocean behind a rail. Then the things in each room, each sorted
 * with the figure by its depth: the telescope, your bed and mirror, the science benches and the scientist, the round
 * table with the tar eel's hologram turning over it, the tank with the tentacle, and the tar animal out in the tar.
 */
import type { DrawView } from '../entities/entity';
import {
  BACK_A,
  BED_IN,
  CHEM_BOAT,
  HOLO,
  HUB_DOORS,
  MIRROR_IN,
  NEWS_SCREEN,
  onWall,
  type Pt,
  SCIENTIST,
  SCOPE_IN,
  TANK,
  TAR_ANIMAL,
  TAR_NEWS,
} from '../world/bridgein';
import {
  BRIDGE_MISSIONS,
  BRIDGE_NEWS,
  BRIDGE_OBS,
  BRIDGE_SCIENCE,
  BRIDGE_TARDOCK,
  BRIDGE_YOU,
  type Room,
} from '../world/tower';
import type { Solid } from './layers';
import { box } from './metalbridge';

/** How high the walls stand, and the doors in them; a door's half width along its wall. */
const WALL = 96;
const DOOR_H = 62;
const DOOR_W = 20;
const TAR = '#17121B';

/** What is going on in there now: the scientist talking, the tentacle slapping its glass, and which news is up. */
export type BridgeAnim = { talk: number; slap: number; news: number; boat?: boolean };

const hash = (i: number, k: number): number => {
  const h = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return h - Math.floor(h);
};

/** The path of a piece of room R's wall between two angles, from z0 to z1, r from its middle. */
function wallQuad(
  v: DrawView,
  R: Room,
  a0: number,
  a1: number,
  z0: number,
  z1: number,
  r = R.r,
): void {
  const { ctx, px, py } = v;
  const x0 = R.x + Math.cos(a0) * r;
  const y0 = R.y + Math.sin(a0) * r;
  const x1 = R.x + Math.cos(a1) * r;
  const y1 = R.y + Math.sin(a1) * r;
  ctx.beginPath();
  ctx.moveTo(px(x0, y0), py(x0, y0, z0));
  ctx.lineTo(px(x1, y1), py(x1, y1, z0));
  ctx.lineTo(px(x1, y1), py(x1, y1, z1));
  ctx.lineTo(px(x0, y0), py(x0, y0, z1));
  ctx.closePath();
}

/** The open back of the dock is open from here to here: the tar shows between. */
const OPEN0 = Math.PI * 0.95;
const OPEN1 = Math.PI * 1.55;

/** Behind room R, before anything in it: the dark, the walls, the windows, the doors and the floor. */
export function drawBridgeBack(
  v: DrawView,
  R: Room,
  i: number,
  W: number,
  H: number,
  anim: BridgeAnim,
): void {
  const { ctx } = v;
  ctx.fillStyle = '#0B0F14';
  ctx.fillRect(0, 0, W, H);
  const dock = i === BRIDGE_TARDOCK;
  if (dock) drawTarBeyond(v, R);
  const n = 24;
  for (let k = 0; k < n; k++) {
    const a0 = Math.PI * 0.75 + (k * Math.PI) / n;
    const a1 = a0 + Math.PI / n;
    if (dock && a0 > OPEN0 - 0.05 && a1 < OPEN1 + 0.05) continue;
    ctx.fillStyle = k % 2 ? '#56636C' : '#4E5A63';
    wallQuad(v, R, a0, a1, 0, WALL);
    ctx.fill();
    ctx.fillStyle = '#343D44';
    wallQuad(v, R, a0, a1, 0, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(140,230,255,.55)';
    wallQuad(v, R, a0, a1, 80, 83);
    ctx.fill();
  }
  if (i === BRIDGE_OBS) {
    // Tall windows onto the night between the doors: it is an observatory.
    for (const a of [0.77, 0.95, 1.15, 1.35, 1.55, 1.73]) starWindow(v, R, Math.PI * a);
    for (const d of HUB_DOORS) drawDoor(v, R, d.a, d.sign);
  } else {
    const windows =
      i === BRIDGE_NEWS
        ? [1.6]
        : i === BRIDGE_YOU
          ? [1.15, 1.5]
          : dock
            ? [0.8, 1.66]
            : [1.12, 1.44, 1.62];
    for (const a of windows) tarWindow(v, R, Math.PI * a);
    drawDoor(v, R, BACK_A, 'OBSERVATORY');
  }
  if (i === BRIDGE_NEWS) drawNewsScreen(v, R, anim.news);
  drawFloor(v, R, i);
  if (dock) drawRail(v, R);
}

/** A tall window in the observatory's wall, onto the stars. */
function starWindow(v: DrawView, R: Room, a: number): void {
  const { ctx, px, py, T } = v;
  const w = 16 / R.r;
  const g = ctx.createLinearGradient(0, py(R.x, R.y, 90), 0, py(R.x, R.y, 10));
  g.addColorStop(0, '#0A1030');
  g.addColorStop(1, '#22306A');
  ctx.fillStyle = g;
  wallQuad(v, R, a - w, a + w, 14, 76, R.r - 0.5);
  ctx.fill();
  ctx.strokeStyle = '#8D9AA3';
  ctx.lineWidth = 2 * v.zoom;
  ctx.stroke();
  for (let s = 0; s < 4; s++) {
    const f = hash(s, a * 10);
    const aa = a - w + f * 2 * w;
    const z = 22 + hash(s, a * 7) * 48;
    const x = R.x + Math.cos(aa) * (R.r - 1);
    const y = R.y + Math.sin(aa) * (R.r - 1);
    ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.4 * Math.sin(T * 2 + s + a * 5)})`;
    ctx.fillRect(px(x, y) - v.zoom, py(x, y, z) - v.zoom, 2 * v.zoom, 2 * v.zoom);
  }
}

/** A square window in a room's wall, onto the black tar outside. */
function tarWindow(v: DrawView, R: Room, a: number): void {
  const { ctx } = v;
  const w = 11 / R.r;
  ctx.fillStyle = '#1C1622';
  wallQuad(v, R, a - w, a + w, 44, 66, R.r - 0.5);
  ctx.fill();
  ctx.strokeStyle = '#8D9AA3';
  ctx.lineWidth = 2 * v.zoom;
  ctx.stroke();
  ctx.fillStyle = 'rgba(181,124,255,.35)';
  wallQuad(v, R, a - w * 0.6, a - w * 0.2, 56, 62, R.r - 1);
  ctx.fill();
}

/** A sliding metal door in the wall at angle a, a green light over it, and its sign. */
function drawDoor(v: DrawView, R: Room, a: number, sign: string): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const w = DOOR_W / R.r;
  ctx.fillStyle = '#9AA7B0';
  wallQuad(v, R, a - w * 1.18, a + w * 1.18, 0, DOOR_H + 6, R.r - 0.6);
  ctx.fill();
  ctx.fillStyle = '#2B343B';
  wallQuad(v, R, a - w, a, 0, DOOR_H, R.r - 1);
  ctx.fill();
  ctx.fillStyle = '#333E46';
  wallQuad(v, R, a, a + w, 0, DOOR_H, R.r - 1);
  ctx.fill();
  const x = R.x + Math.cos(a) * (R.r - 1);
  const y = R.y + Math.sin(a) * (R.r - 1);
  ctx.strokeStyle = 'rgba(140,230,255,.6)';
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, 2));
  ctx.lineTo(px(x, y), py(x, y, DOOR_H - 2));
  ctx.stroke();
  ctx.fillStyle = `rgba(110,240,150,${0.7 + 0.3 * Math.sin(T * 3 + a)})`;
  ctx.beginPath();
  ctx.arc(px(x, y), py(x, y, DOOR_H + 12), 2.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `800 ${Math.round(8 * Z)}px Grandstander, ui-rounded, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * Z;
  ctx.strokeStyle = 'rgba(8,24,32,.85)';
  ctx.strokeText(sign, px(x, y), py(x, y, DOOR_H + 16));
  ctx.fillStyle = '#CFF4FA';
  ctx.fillText(sign, px(x, y), py(x, y, DOOR_H + 16));
}

/** The plated metal floor, and in the observatory a ring under the telescope. */
function drawFloor(v: DrawView, R: Room, i: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  v.isoEllipse(R.x, R.y, R.r);
  ctx.fillStyle = i === BRIDGE_OBS ? '#5D6873' : i === BRIDGE_TARDOCK ? '#545D64' : '#66717A';
  ctx.fill();
  ctx.save();
  v.isoEllipse(R.x, R.y, R.r);
  ctx.clip();
  ctx.strokeStyle = 'rgba(20,28,34,.28)';
  ctx.lineWidth = 1.2 * Z;
  ctx.beginPath();
  for (let g = -R.r; g <= R.r; g += 40) {
    ctx.moveTo(px(R.x + g, R.y - R.r), py(R.x + g, R.y - R.r));
    ctx.lineTo(px(R.x + g, R.y + R.r), py(R.x + g, R.y + R.r));
    ctx.moveTo(px(R.x - R.r, R.y + g), py(R.x - R.r, R.y + g));
    ctx.lineTo(px(R.x + R.r, R.y + g), py(R.x + R.r, R.y + g));
  }
  ctx.stroke();
  ctx.restore();
  if (i === BRIDGE_OBS) {
    for (const [k, c] of [
      [0.62, 'rgba(140,230,255,.35)'],
      [0.3, 'rgba(181,124,255,.35)'],
    ] as const) {
      v.isoEllipse(R.x, R.y, R.r * k);
      ctx.strokeStyle = c;
      ctx.lineWidth = 2.4 * Z;
      ctx.stroke();
    }
  }
  if (i === BRIDGE_TARDOCK) {
    // Yellow and black along the open edge: mind the tar.
    const n = 16;
    for (let k = 0; k < n; k++) {
      const a0 = OPEN0 + ((OPEN1 - OPEN0) * k) / n;
      const a1 = a0 + (OPEN1 - OPEN0) / n;
      ctx.fillStyle = k % 2 ? '#1E1E1E' : '#E8C547';
      ctx.beginPath();
      for (const [a, r] of [
        [a0, R.r],
        [a1, R.r],
        [a1, R.r - 10],
        [a0, R.r - 10],
      ] as const) {
        const x = R.x + Math.cos(a) * r;
        const y = R.y + Math.sin(a) * r;
        ctx.lineTo(px(x, y), py(x, y));
      }
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** The tar ocean behind the dock, as far as can be seen: black, glossy, slowly heaving, bubbling. */
function drawTarBeyond(v: DrawView, R: Room): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  v.isoEllipse(R.x, R.y, R.r + 520);
  ctx.fillStyle = TAR;
  ctx.fill();
  ctx.strokeStyle = 'rgba(181,124,255,.14)';
  ctx.lineWidth = 2 * Z;
  for (let k = 1; k <= 4; k++) {
    v.isoEllipse(R.x, R.y, R.r + 40 + k * 70 + Math.sin(T * 0.6 + k) * 8);
    ctx.stroke();
  }
  for (let b = 0; b < 7; b++) {
    const ph = (T * 0.5 + hash(b, 2)) % 1;
    const a = Math.PI * (1 + hash(b, 3) * 0.5);
    const d = R.r + 30 + hash(b, 4) * 220;
    const x = R.x + Math.cos(a) * d;
    const y = R.y + Math.sin(a) * d;
    ctx.strokeStyle = `rgba(200,170,230,${0.5 * (1 - ph)})`;
    ctx.lineWidth = 1.4 * Z;
    ctx.beginPath();
    ctx.arc(px(x, y), py(x, y), (2 + ph * 5) * Z, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** A rail along the dock's open edge, so nobody walks off into the tar. */
function drawRail(v: DrawView, R: Room): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const pts: Pt[] = [];
  for (let k = 0; k <= 12; k++) {
    const a = OPEN0 + ((OPEN1 - OPEN0) * k) / 12;
    pts.push({ x: R.x + Math.cos(a) * (R.r - 3), y: R.y + Math.sin(a) * (R.r - 3) });
  }
  ctx.strokeStyle = '#8D9AA3';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  for (const p of pts) {
    ctx.moveTo(px(p.x, p.y), py(p.x, p.y, 0));
    ctx.lineTo(px(p.x, p.y), py(p.x, p.y, 24));
  }
  ctx.stroke();
  ctx.lineWidth = 2.6 * Z;
  ctx.strokeStyle = '#B9C4CB';
  ctx.beginPath();
  for (const p of pts) ctx.lineTo(px(p.x, p.y), py(p.x, p.y, 24));
  ctx.stroke();
}

/** The news screen on the news room's wall: TAR NEWS over the tar beast's picture, and the news running under it. */
function drawNewsScreen(v: DrawView, R: Room, news: number): void {
  const { ctx, px, py, T } = v;
  const a = Math.atan2(NEWS_SCREEN.y - R.y, NEWS_SCREEN.x - R.x);
  const w = 0.095 * Math.PI;
  const r = R.r - 0.5;
  const at = (aa: number, z: number) => {
    const x = R.x + Math.cos(aa) * r;
    const y = R.y + Math.sin(aa) * r;
    return { x: px(x, y), y: py(x, y, z) };
  };
  const tl = at(a - w, 84);
  const tr = at(a + w, 84);
  const bl = at(a - w, 28);
  ctx.save();
  ctx.transform(
    (tr.x - tl.x) / 200,
    (tr.y - tl.y) / 200,
    (bl.x - tl.x) / 100,
    (bl.y - tl.y) / 100,
    tl.x,
    tl.y,
  );
  ctx.fillStyle = '#20272D';
  ctx.fillRect(-6, -6, 212, 112);
  ctx.fillStyle = '#0E2436';
  ctx.fillRect(0, 0, 200, 100);
  ctx.beginPath();
  ctx.rect(0, 0, 200, 100);
  ctx.clip();
  ctx.fillStyle = '#C0392B';
  ctx.fillRect(0, 0, 200, 22);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 16px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('TAR NEWS', 8, 12);
  ctx.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(T * 6)})`;
  ctx.beginPath();
  ctx.arc(188, 11, 4, 0, Math.PI * 2);
  ctx.fill();
  // A tar beast in the picture, its eyes glowing.
  ctx.fillStyle = '#05070A';
  ctx.beginPath();
  ctx.ellipse(46, 60, 30, 22 + Math.sin(T * 2) * 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFD84A';
  for (const ex of [36, 54]) {
    ctx.beginPath();
    ctx.ellipse(ex, 54, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#D8E4EA';
  ctx.font = '800 11px system-ui, sans-serif';
  ctx.fillText('LIVE FROM', 90, 40);
  ctx.fillText('THE TAR SIDE', 90, 54);
  // The news, running along the bottom.
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 80, 200, 20);
  const line = (TAR_NEWS[news % TAR_NEWS.length] ?? '').replace('TAR NEWS: ', '');
  ctx.font = '700 12px system-ui, sans-serif';
  const tw = ctx.measureText(line).width;
  ctx.fillStyle = '#FFE39A';
  ctx.fillText(line, 200 - ((T * 40) % (tw + 220)), 90);
  ctx.restore();
}

/** The things in room i, each to be sorted with the figure by its depth. */
export function bridgeSolids(v: DrawView, i: number, anim: BridgeAnim): Solid[] {
  const out: Solid[] = [];
  const at = (p: Pt, f: () => void, back = 0) => out.push({ d: p.x + p.y + back, f });
  if (i === BRIDGE_OBS) at(SCOPE_IN, () => drawTelescope(v, SCOPE_IN));
  if (i === BRIDGE_YOU) {
    at(BED_IN, () => drawBed(v, BED_IN), 12);
    at(MIRROR_IN, () => drawMirror(v, MIRROR_IN));
  }
  if (i === BRIDGE_SCIENCE) {
    for (const a of [1.12, 1.5]) {
      const b = onWall(i, Math.PI * a, 26);
      at(b, () => drawBench(v, b, a), 10);
    }
    at(SCIENTIST, () => drawScientist(v, SCIENTIST, anim.talk));
  }
  if (i === BRIDGE_MISSIONS) at(HOLO, () => drawHolo(v, HOLO));
  if (i === BRIDGE_NEWS) at(TANK, () => drawTank(v, TANK, anim.slap), 13);
  if (i === BRIDGE_TARDOCK) at(TAR_ANIMAL, () => drawTarAnimal(v, TAR_ANIMAL));
  if (i === BRIDGE_TARDOCK && anim.boat) at(CHEM_BOAT, () => drawChemBoat(v, CHEM_BOAT));
  return out;
}

/** The big telescope on its stand, its long tube up toward the open roof. */
function drawTelescope(v: DrawView, p: Pt): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  v.isoEllipse(p.x, p.y, 24);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.fill();
  box(v, p.x - 13, p.y - 13, 26, 26, 0, 10, '#3E474F', '#353D44', '#59646D');
  box(v, p.x - 4, p.y - 4, 8, 8, 10, 40, '#4A545C', '#40494F', '#66717A');
  const sway = Math.sin(T * 0.3) * 4;
  const lo = { x: px(p.x + 16, p.y + 16), y: py(p.x + 16, p.y + 16, 30) };
  const hi = {
    x: px(p.x - 34 + sway, p.y - 34 - sway),
    y: py(p.x - 34 + sway, p.y - 34 - sway, 92),
  };
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#8A6A2A';
  ctx.lineWidth = 11 * Z;
  ctx.beginPath();
  ctx.moveTo(lo.x, lo.y);
  ctx.lineTo(hi.x, hi.y);
  ctx.stroke();
  ctx.strokeStyle = '#C9A24A';
  ctx.lineWidth = 7 * Z;
  ctx.stroke();
  for (const t of [0.25, 0.55, 0.85]) {
    ctx.fillStyle = '#6E5420';
    ctx.beginPath();
    ctx.arc(lo.x + (hi.x - lo.x) * t, lo.y + (hi.y - lo.y) * t, 5.6 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#BFE6F2';
  ctx.beginPath();
  ctx.arc(hi.x, hi.y, 5 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2B2F33';
  ctx.beginPath();
  ctx.arc(lo.x, lo.y, 3.4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'butt';
}

/** Your bed, a metal bunk with a blue blanket. */
function drawBed(v: DrawView, p: Pt): void {
  const { ctx } = v;
  v.isoEllipse(p.x, p.y, 30);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.fill();
  box(v, p.x - 24, p.y - 13, 48, 28, 0, 9, '#4A5560', '#3E4851', '#5E6B76');
  box(v, p.x - 22, p.y - 12, 44, 26, 9, 13, '#D9D0BA', '#CFC6B0', '#F4EEDD');
  box(v, p.x - 21, p.y - 10, 10, 22, 13, 17, '#D6CDB8', '#CBC2AD', '#FFFDF5');
  box(v, p.x - 7, p.y - 13, 30, 28, 12, 15, '#2F5E9E', '#285089', '#3E6FB0');
}

/** A tall mirror on a stand, a shine sliding across it. */
function drawMirror(v: DrawView, p: Pt): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  box(v, p.x - 8, p.y - 4, 16, 8, 0, 3, '#5A3A22', '#4A2E1A', '#7A5230');
  const x = px(p.x, p.y);
  const y = py(p.x, p.y, 34);
  ctx.strokeStyle = '#7A5230';
  ctx.lineWidth = 2.4 * Z;
  ctx.beginPath();
  ctx.moveTo(x, py(p.x, p.y, 3));
  ctx.lineTo(x, y);
  ctx.stroke();
  const g = ctx.createLinearGradient(x - 8 * Z, y - 14 * Z, x + 8 * Z, y + 14 * Z);
  g.addColorStop(0, '#E8F4FA');
  g.addColorStop(1, '#8FB4C8');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#C9A24A';
  ctx.lineWidth = 2.2 * Z;
  ctx.beginPath();
  ctx.ellipse(x, y, 9 * Z, 15 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, 9 * Z, 15 * Z, 0, 0, Math.PI * 2);
  ctx.clip();
  const s = ((T * 0.4) % 1) * 40 - 20;
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 3 * Z;
  ctx.beginPath();
  ctx.moveTo(x + (s - 8) * Z, y + 16 * Z);
  ctx.lineTo(x + (s + 8) * Z, y - 16 * Z);
  ctx.stroke();
  ctx.restore();
}

/** A lab bench along the wall, flasks bubbling on it. */
function drawBench(v: DrawView, p: Pt, a: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  box(v, p.x - 16, p.y - 16, 32, 32, 0, 22, '#C9D1D6', '#B5BEC4', '#EEF2F4');
  const colours = ['#7CFC9A', '#B57CFF', '#FFB347'];
  for (let k = 0; k < 3; k++) {
    const x = px(p.x - 8 + k * 8, p.y - 8 + k * 8);
    const y = py(p.x - 8 + k * 8, p.y - 8 + k * 8, 22);
    const c = colours[(k + Math.round(a * 3)) % 3] ?? '#7CFC9A';
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.fillRect(x - 1.2 * Z, y - 12 * Z, 2.4 * Z, 6 * Z);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y - 4 * Z, 4 * Z, 0, Math.PI * 2);
    ctx.fill();
    const ph = (T * 0.8 + k * 0.33) % 1;
    ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - ph)})`;
    ctx.beginPath();
    ctx.arc(x + Math.sin(T * 3 + k) * Z, y - (8 + ph * 14) * Z, 1.4 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The scientist: white coat, wild white hair, goggles up on the forehead, a green flask; waving while talking. */
function drawScientist(v: DrawView, p: Pt, talk: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom * 1.1;
  const x = px(p.x, p.y);
  const y = py(p.x, p.y, 0);
  const bob = Math.sin(T * 2) * 0.6 * Z;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 9 * Z, 3.4 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2E3440';
  ctx.lineWidth = 2.6 * Z;
  ctx.beginPath();
  ctx.moveTo(-2.4 * Z, -12 * Z);
  ctx.lineTo(-2.8 * Z, -1 * Z);
  ctx.moveTo(2.4 * Z, -12 * Z);
  ctx.lineTo(2.8 * Z, -1 * Z);
  ctx.stroke();
  ctx.translate(0, bob);
  // The coat, flaring at the bottom.
  ctx.fillStyle = '#F4F7F8';
  ctx.strokeStyle = '#B8C2C8';
  ctx.lineWidth = 0.8 * Z;
  ctx.beginPath();
  ctx.moveTo(-5 * Z, -26 * Z);
  ctx.lineTo(5 * Z, -26 * Z);
  ctx.lineTo(7 * Z, -9 * Z);
  ctx.lineTo(-7 * Z, -9 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -25 * Z);
  ctx.lineTo(0, -10 * Z);
  ctx.stroke();
  // One arm holds the flask out; the other waves while talking.
  ctx.strokeStyle = '#F4F7F8';
  ctx.lineWidth = 2.6 * Z;
  ctx.beginPath();
  ctx.moveTo(-4.6 * Z, -23 * Z);
  ctx.lineTo(-9 * Z, -17 * Z);
  ctx.stroke();
  ctx.fillStyle = '#7CFC9A';
  ctx.beginPath();
  ctx.arc(-10 * Z, -16 * Z, 2.8 * Z, 0, Math.PI * 2);
  ctx.fill();
  const wave = talk > 0 ? Math.sin(T * 14) * 2 : 0;
  ctx.beginPath();
  ctx.moveTo(4.6 * Z, -23 * Z);
  if (talk > 0) ctx.lineTo((9 + wave) * Z, -31 * Z);
  else ctx.lineTo(7 * Z, -14 * Z);
  ctx.stroke();
  // The head, the hair and the goggles.
  ctx.fillStyle = '#F0C9A0';
  ctx.beginPath();
  ctx.arc(0, -30.5 * Z, 4.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#EDEFF2';
  for (const [hx, hy, r] of [
    [-4.6, -33, 2.4],
    [4.6, -33, 2.4],
    [-2.6, -35.6, 2.2],
    [2.6, -35.6, 2.2],
    [0, -36.4, 2.2],
  ] as const) {
    ctx.beginPath();
    ctx.arc(hx * Z, hy * Z, r * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#BFE6F2';
  ctx.strokeStyle = '#2E3440';
  ctx.lineWidth = 0.9 * Z;
  for (const gx of [-1.8, 1.8]) {
    ctx.beginPath();
    ctx.arc(gx * Z, -33.2 * Z, 1.6 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#2E3440';
  ctx.beginPath();
  ctx.arc(-1.5 * Z, -30 * Z, 0.6 * Z, 0, Math.PI * 2);
  ctx.arc(1.5 * Z, -30 * Z, 0.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8A4B3A';
  ctx.lineWidth = 0.8 * Z;
  ctx.beginPath();
  ctx.arc(0, -28.6 * Z, talk > 0 ? 1.4 * Z : 1.1 * Z, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
  ctx.lineCap = 'butt';
}

/** The round table, the light coming up out of it, and the tar eel's hologram swimming round over it. */
function drawHolo(v: DrawView, p: Pt): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  v.isoEllipse(p.x, p.y, 26);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fill();
  box(v, p.x - 6, p.y - 6, 12, 12, 0, 20, '#3E474F', '#353D44', '#59646D');
  v.isoEllipse(p.x, p.y, 24, 20);
  ctx.fillStyle = '#2B343B';
  ctx.fill();
  ctx.strokeStyle = '#8D9AA3';
  ctx.lineWidth = 2 * Z;
  ctx.stroke();
  v.isoEllipse(p.x, p.y, 16, 21);
  ctx.fillStyle = 'rgba(120,240,255,.55)';
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const flick = 0.75 + 0.25 * Math.sin(T * 13) * Math.sin(T * 7);
  ctx.fillStyle = `rgba(80,200,255,${0.12 * flick})`;
  ctx.beginPath();
  ctx.moveTo(px(p.x - 11, p.y + 11), py(p.x - 11, p.y + 11, 21));
  ctx.lineTo(px(p.x + 11, p.y - 11), py(p.x + 11, p.y - 11, 21));
  ctx.lineTo(px(p.x + 30, p.y - 30), py(p.x + 30, p.y - 30, 84));
  ctx.lineTo(px(p.x - 30, p.y + 30), py(p.x - 30, p.y + 30, 84));
  ctx.closePath();
  ctx.fill();
  // The eel, a long body going round, its head leading.
  const pts: { x: number; y: number }[] = [];
  for (let k = 0; k < 22; k++) {
    const a = T * 0.9 - k * 0.2;
    const x = p.x + Math.cos(a) * 22;
    const y = p.y + Math.sin(a) * 22;
    pts.push({ x: px(x, y), y: py(x, y, 58 + Math.sin(a * 3 + T * 2) * 7) });
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1];
    const b = pts[k];
    if (!a || !b) continue;
    ctx.strokeStyle = `rgba(120,240,255,${0.75 * flick * (1 - k / pts.length) + 0.15})`;
    ctx.lineWidth = (6 - (k / pts.length) * 4.5) * Z;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  const h = pts[0];
  if (h) {
    ctx.fillStyle = `rgba(255,255,255,${flick})`;
    ctx.beginPath();
    ctx.arc(h.x - 1.6 * Z, h.y - 1 * Z, 1.2 * Z, 0, Math.PI * 2);
    ctx.arc(h.x + 1.6 * Z, h.y - 1 * Z, 1.2 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'butt';
}

/** The tank with the tentacle in it, kept for testing; tap the glass and it slaps back. */
function drawTank(v: DrawView, p: Pt, slap: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  box(v, p.x - 15, p.y - 15, 30, 30, 0, 10, '#3E474F', '#353D44', '#59646D');
  box(
    v,
    p.x - 13,
    p.y - 13,
    26,
    26,
    10,
    50,
    'rgba(40,8,16,.85)',
    'rgba(30,6,12,.85)',
    'rgba(70,20,30,.8)',
  );
  // The tentacle, from the bottom up, curling; slapping the front glass when tapped.
  const s = Math.max(0, slap);
  const base = { x: px(p.x, p.y), y: py(p.x, p.y, 12) };
  const sw = Math.sin(T * 1.6) * 6;
  const tipX = base.x + (sw + s * 10) * Z;
  const tipY = base.y - (32 - s * 8) * Z;
  ctx.lineCap = 'round';
  for (let k = 0; k < 10; k++) {
    const t0 = k / 10;
    const t1 = (k + 1) / 10;
    const pt = (t: number) => ({
      x: base.x + (tipX - base.x) * t + Math.sin(t * 5 + T * 2) * 4 * Z * t,
      y: base.y + (tipY - base.y) * t,
    });
    const a = pt(t0);
    const b = pt(t1);
    ctx.strokeStyle = '#C0392B';
    ctx.lineWidth = (6 - t0 * 4.6) * Z;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.fillStyle = '#F5B7B1';
  for (let k = 1; k < 5; k++) {
    const t = k / 6;
    ctx.beginPath();
    ctx.arc(
      base.x + (tipX - base.x) * t - 2 * Z,
      base.y + (tipY - base.y) * t,
      0.9 * Z,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.lineCap = 'butt';
  // The glass over it all, flashing when slapped.
  box(
    v,
    p.x - 13,
    p.y - 13,
    26,
    26,
    10,
    50,
    `rgba(200,235,255,${0.12 + s * 0.4})`,
    `rgba(200,235,255,${0.08 + s * 0.4})`,
    'rgba(200,235,255,.1)',
  );
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.lineWidth = 1.2 * Z;
  ctx.beginPath();
  ctx.moveTo(px(p.x - 8, p.y + 13), py(p.x - 8, p.y + 13, 44));
  ctx.lineTo(px(p.x - 2, p.y + 13), py(p.x - 2, p.y + 13, 22));
  ctx.stroke();
}

/** The tar animal out in the tar past the dock's rail: a glossy black head, glowing eyes, its tentacles waving. */
function drawTarAnimal(v: DrawView, p: Pt): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const rise = Math.sin(T * 0.8) * 3;
  for (let k = 0; k < 2; k++) {
    const ph = (T * 0.4 + k * 0.5) % 1;
    v.isoEllipse(p.x, p.y, 30 + ph * 50);
    ctx.strokeStyle = `rgba(181,124,255,${0.3 * (1 - ph)})`;
    ctx.lineWidth = 1.6 * Z;
    ctx.stroke();
  }
  ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    const bx = p.x + Math.cos(a) * 26;
    const by = p.y + Math.sin(a) * 26;
    const sway = Math.sin(T * 1.7 + k * 1.3);
    const h = 30 + 14 * Math.sin(T * 0.9 + k * 2.1);
    const x0 = px(bx, by);
    const y0 = py(bx, by, 0);
    ctx.strokeStyle = '#120D16';
    ctx.lineWidth = 5.4 * Z;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + sway * 10 * Z, y0 - h * 0.6 * Z, x0 + sway * 4 * Z, y0 - h * Z);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(181,124,255,.35)';
    ctx.lineWidth = 1.2 * Z;
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  const x = px(p.x, p.y);
  const y = py(p.x, p.y, 4 + rise);
  ctx.fillStyle = '#120D16';
  ctx.beginPath();
  ctx.ellipse(x, y, 26 * Z, 16 * Z, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath();
  ctx.ellipse(x - 8 * Z, y - 10 * Z, 8 * Z, 3 * Z, -0.3, 0, Math.PI * 2);
  ctx.fill();
  const blink = Math.sin(T * 0.7) > 0.97 ? 0.2 : 1;
  ctx.fillStyle = '#FFD84A';
  for (const ex of [-8, 8]) {
    ctx.beginPath();
    ctx.ellipse(x + ex * Z, y - 6 * Z, 3.4 * Z, 2.6 * Z * blink, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#120D16';
  for (const ex of [-8, 8]) {
    ctx.beginPath();
    ctx.ellipse(x + ex * Z, y - 6 * Z, 1 * Z, 2 * Z * blink, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The chemistry boat, won in stealth mission 1: a white hull with a green stripe and a flask on its side, a little
 * cabin, and a chimney puffing green bubbles; riding the tar, made to sail on it. */
function drawChemBoat(v: DrawView, p: Pt): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const bob = Math.sin(T * 1.4) * 1.5;
  const at = (dx: number, dy: number, z: number) => ({
    x: px(p.x + dx, p.y + dy),
    y: py(p.x + dx, p.y + dy, z + bob),
  });
  v.isoEllipse(p.x, p.y, 34);
  ctx.strokeStyle = 'rgba(181,124,255,.35)';
  ctx.lineWidth = 1.6 * Z;
  ctx.stroke();
  // The hull, long along the dock's rail.
  const hull = (z: number) => [
    at(-30, 30, z),
    at(30, -30, z),
    at(38, -24, z + 2),
    at(34, -14, z),
    at(-22, 34, z),
  ];
  ctx.fillStyle = '#EEF3F0';
  ctx.beginPath();
  for (const q of hull(0)) ctx.lineTo(q.x, q.y);
  for (const q of hull(14).reverse()) ctx.lineTo(q.x, q.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3FB37A';
  ctx.lineWidth = 3 * Z;
  ctx.beginPath();
  for (const q of hull(8)) ctx.lineTo(q.x, q.y);
  ctx.stroke();
  // The deck, and the cabin.
  ctx.fillStyle = '#C9D4CF';
  ctx.beginPath();
  for (const q of hull(14)) ctx.lineTo(q.x, q.y);
  ctx.closePath();
  ctx.fill();
  box(v, p.x - 8, p.y - 8, 18, 18, 14 + bob, 32 + bob, '#E8EEF0', '#C9D4CF', '#3FB37A');
  // The flask on its side: a round bottom, a neck, green inside.
  const f = at(-10, 22, 7);
  ctx.fillStyle = '#7CFC9A';
  ctx.strokeStyle = '#1E5E3A';
  ctx.lineWidth = 1 * Z;
  ctx.beginPath();
  ctx.arc(f.x, f.y, 4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(f.x - 1.2 * Z, f.y - 8 * Z, 2.4 * Z, 4.5 * Z);
  // The chimney, bubbling.
  const c = at(6, -6, 32);
  ctx.fillStyle = '#5E6B74';
  ctx.fillRect(c.x - 2 * Z, c.y - 10 * Z, 4 * Z, 10 * Z);
  for (let k = 0; k < 3; k++) {
    const r = (T * 0.7 + k / 3) % 1;
    ctx.fillStyle = `rgba(124,252,154,${0.7 * (1 - r)})`;
    ctx.beginPath();
    ctx.arc(
      c.x + Math.sin(T * 2 + k) * 2 * Z,
      c.y - (12 + r * 20) * Z,
      (1.6 + r * 2) * Z,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}
