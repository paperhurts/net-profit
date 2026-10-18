/**
 * The metal bridge and the tar ocean past it (world/metalbridge.ts), as the kid drew them: a long metal building
 * standing on legs in the sea, a row of square windows and one long window over them, a lattice along its roof, a flag
 * at each end and the orb glowing on top; a door in the middle of its sea face with a landing at the water. Past the
 * north edge the sea is tar: black and glossy, bubbling. The building is drawn in sections along its length, each
 * sorted with everything else by its own depth, so a boat beside one end sits in front of it and behind the other.
 */
import type { DrawView } from '../entities/entity';
import { DEEP, FAR, FARFAR, WS } from '../world/island';
import { BRIDGE_DOOR, METAL_BRIDGE, NORTH_EDGE, TAR_OCEAN } from '../world/metalbridge';
import type { Solid } from './layers';

const EDGE = DEEP + FAR + FARFAR;
/** Its sections along its length, and how high its legs, its body and its roof lattice stand. */
const SEG = 200;
const LEGS = 46;
const BODY = 132;
const ROOF = 162;
/** The steps from the door's landing up to its sill. */
const STEPS = 4;

const METAL = '#7A8892';
const METAL_DARK = '#5E6B74';
const METAL_TOP = '#98A6AF';
const GLASS = '#BFE6F2';
const FLAG = '#B5652F';

/** A flat face from (x0, y0) to (x1, y1) along the floor and z0 to z1 up it, filled. */
function face(
  v: DrawView,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  z1: number,
  c: string,
): void {
  const { ctx, px, py } = v;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(px(x0, y0), py(x0, y0, z0));
  ctx.lineTo(px(x1, y1), py(x1, y1, z0));
  ctx.lineTo(px(x1, y1), py(x1, y1, z1));
  ctx.lineTo(px(x0, y0), py(x0, y0, z1));
  ctx.closePath();
  ctx.fill();
}

/** A box from z0 to z1, w along x and d along y from (x, y): its sea face, its east end and its top. */
function box(
  v: DrawView,
  x: number,
  y: number,
  w: number,
  d: number,
  z0: number,
  z1: number,
  side: string,
  end: string,
  top: string,
): void {
  const { ctx, px, py } = v;
  face(v, x, y + d, x + w, y + d, z0, z1, side);
  face(v, x + w, y, x + w, y + d, z0, z1, end);
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, z1));
  ctx.lineTo(px(x + w, y), py(x + w, y, z1));
  ctx.lineTo(px(x + w, y + d), py(x + w, y + d, z1));
  ctx.lineTo(px(x, y + d), py(x, y + d, z1));
  ctx.closePath();
  ctx.fill();
}

/** Whether any of the tar ocean's edge is near the screen. */
function edgeOnScreen(v: DrawView): boolean {
  for (let x = -EDGE; x <= WS + EDGE; x += 800)
    if (v.onScreen(x, NORTH_EDGE, 1400 * v.zoom)) return true;
  return false;
}

/** The tar ocean, past the sea's north edge: black and glossy, a dark seam where the sea meets it, bubbles. */
export function drawTarOcean(v: DrawView): void {
  if (!edgeOnScreen(v)) return;
  const { ctx, px, py, T, zoom: Z } = v;
  const x0 = -EDGE;
  const x1 = WS + EDGE;
  const y0 = NORTH_EDGE - TAR_OCEAN;
  const y1 = NORTH_EDGE;
  const quad = (a: number, b: number, c: string) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(px(x0, a), py(x0, a, 0));
    ctx.lineTo(px(x1, a), py(x1, a, 0));
    ctx.lineTo(px(x1, b), py(x1, b, 0));
    ctx.lineTo(px(x0, b), py(x0, b, 0));
    ctx.closePath();
    ctx.fill();
  };
  quad(y0, y1, '#17121B');
  // A slow sheen across it, and the seam where the sea runs into it.
  for (let i = 0; i < 4; i++) {
    const at = y1 - 120 - i * 300 - ((T * 18 + i * 70) % 300);
    quad(at - 18, at, 'rgba(120,96,140,.10)');
  }
  quad(y1 - 26, y1, '#2A1F24');
  quad(y1 - 8, y1, 'rgba(90,60,40,.55)');
  // Bubbles, rising and popping, along the stretch near the bridge.
  ctx.strokeStyle = 'rgba(150,120,170,.55)';
  ctx.lineWidth = 1.4 * Z;
  for (let i = 0; i < 40; i++) {
    const bx = METAL_BRIDGE.x - 1800 + ((i * 397) % 3600);
    const by = y1 - 60 - ((i * 211) % 900);
    if (!v.onScreen(bx, by, 40 * Z)) continue;
    const k = (T * 0.5 + i * 0.37) % 1;
    v.isoEllipse(bx, by, 3 + k * 9);
    ctx.globalAlpha = 1 - k;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** One section of the building, from x0 along SEG: its legs, its body, its windows and its roof lattice, and the door
 * if it is in this one (sections are an odd number, so the door is in the middle of one, not on a join). */
function drawSection(v: DrawView, x0: number, first: boolean, last: boolean): void {
  const { ctx, px, py, zoom: Z } = v;
  const y0 = METAL_BRIDGE.face - METAL_BRIDGE.depth;
  const yf = METAL_BRIDGE.face;
  // Legs down into the water, front and back, each with a ring of foam.
  for (const lx of [x0 + 20, x0 + 120])
    for (const ly of [y0 + 10, yf - 10]) {
      ctx.strokeStyle = 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.2 * Z;
      v.isoEllipse(lx, ly, 13);
      ctx.stroke();
      box(v, lx - 6, ly - 6, 12, 12, 0, LEGS, METAL_DARK, '#4C575E', METAL_DARK);
    }
  // The body.
  box(v, x0, y0, SEG, METAL_BRIDGE.depth, LEGS, BODY, METAL, METAL_DARK, METAL_TOP);
  // A row of square windows on the sea face, and the long window over them.
  const door = BRIDGE_DOOR.x > x0 && BRIDGE_DOOR.x < x0 + SEG;
  for (let i = 0; i < 4; i++) {
    const wx = x0 + 18 + i * 48;
    if (door && Math.abs(wx + 11 - BRIDGE_DOOR.x) < 40) continue;
    face(v, wx, yf, wx + 22, yf, LEGS + 18, LEGS + 38, GLASS);
  }
  face(
    v,
    x0 + (first ? 30 : 0),
    yf,
    x0 + SEG - (last ? 30 : 0),
    yf,
    LEGS + 52,
    LEGS + 70,
    '#9FD3E3',
  );
  // The roof lattice: two rails and struts, as he drew it along the top.
  ctx.strokeStyle = '#4C575E';
  ctx.lineWidth = 2.4 * Z;
  ctx.beginPath();
  for (const z of [BODY + 12, ROOF]) {
    ctx.moveTo(px(x0, yf), py(x0, yf, z));
    ctx.lineTo(px(x0 + SEG, yf), py(x0 + SEG, yf, z));
  }
  for (let i = 0; i <= 4; i++) {
    const sx = x0 + i * (SEG / 4);
    ctx.moveTo(px(sx, yf), py(sx, yf, BODY));
    ctx.lineTo(px(sx, yf), py(sx, yf, ROOF));
    if (i < 4) {
      ctx.moveTo(px(sx, yf), py(sx, yf, BODY + 12));
      ctx.lineTo(px(sx + SEG / 4, yf), py(sx + SEG / 4, yf, ROOF));
    }
  }
  ctx.stroke();
  if (door) drawDoor(v);
}

/** The door in the middle of the sea face, with a landing at the water for a boat to stop by. */
function drawDoor(v: DrawView): void {
  const { ctx, px, py, zoom: Z } = v;
  const { x, y } = BRIDGE_DOOR;
  box(v, x - 34, y, 68, 26, 0, 8, '#4C575E', '#3E474D', '#6E7B84');
  // Steps up from the landing to the sill, each one standing on the one below.
  for (let i = 0; i < STEPS; i++) {
    const z0 = 8 + ((LEGS - 8) * i) / STEPS;
    const z1 = 8 + ((LEGS - 8) * (i + 1)) / STEPS;
    box(v, x - 14, y, 28, 24 - i * 6, z0, z1, METAL_DARK, '#4C575E', METAL_TOP);
  }
  face(v, x - 18, y, x + 18, y, LEGS, LEGS + 44, '#2E383F');
  ctx.strokeStyle = '#C9D4DA';
  ctx.lineWidth = 1.6 * Z;
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, LEGS));
  ctx.lineTo(px(x, y), py(x, y, LEGS + 44));
  ctx.stroke();
  // A light over it.
  ctx.fillStyle = '#FFE39A';
  ctx.beginPath();
  ctx.arc(px(x, y), py(x, y, LEGS + 52), 3 * Z, 0, Math.PI * 2);
  ctx.fill();
}

/** A flag on a pole at one end of the roof. */
function drawFlag(v: DrawView, x: number, y: number, dir: number): void {
  const { ctx, px, py, zoom: Z, T } = v;
  ctx.strokeStyle = '#3A3F44';
  ctx.lineWidth = 2 * Z;
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, ROOF));
  ctx.lineTo(px(x, y), py(x, y, ROOF + 52));
  ctx.stroke();
  const wave = Math.sin(T * 3 + x) * 3 * Z;
  ctx.fillStyle = FLAG;
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, ROOF + 52));
  ctx.quadraticCurveTo(
    px(x, y) + dir * 14 * Z,
    py(x, y, ROOF + 48) + wave,
    px(x, y) + dir * 28 * Z,
    py(x, y, ROOF + 46) + wave,
  );
  ctx.lineTo(px(x, y), py(x, y, ROOF + 36));
  ctx.closePath();
  ctx.fill();
}

/** The orb on top, glowing, as on island 9. */
function drawOrb(v: DrawView): void {
  const { ctx, px, py, zoom: Z, T } = v;
  const x = METAL_BRIDGE.x;
  const y = METAL_BRIDGE.face - METAL_BRIDGE.depth / 2;
  box(v, x - 12, y - 12, 24, 24, ROOF - 30, ROOF + 6, METAL_DARK, '#4C575E', METAL_TOP);
  const k = 0.75 + 0.25 * Math.sin(T * 2.2);
  const g = ctx.createRadialGradient(
    px(x, y),
    py(x, y, ROOF + 24),
    0,
    px(x, y),
    py(x, y, ROOF + 24),
    30 * Z,
  );
  g.addColorStop(0, `rgba(210,170,255,${0.6 * k})`);
  g.addColorStop(1, 'rgba(210,170,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(px(x, y), py(x, y, ROOF + 24), 30 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#B57CFF';
  ctx.beginPath();
  ctx.arc(px(x, y), py(x, y, ROOF + 24), 11 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.arc(px(x, y) - 3 * Z, py(x, y, ROOF + 28), 3 * Z, 0, Math.PI * 2);
  ctx.fill();
}

/** The building, section by section, each at its own depth, its door, its flags and its orb. */
export function metalBridgeSolids(v: DrawView): Solid[] {
  const half = METAL_BRIDGE.len / 2;
  if (!v.onScreen(METAL_BRIDGE.x, METAL_BRIDGE.face, (half + 400) * v.zoom)) return [];
  const out: Solid[] = [];
  const mid = METAL_BRIDGE.face - METAL_BRIDGE.depth / 2;
  const n = Math.round(METAL_BRIDGE.len / SEG);
  for (let i = 0; i < n; i++) {
    const x0 = METAL_BRIDGE.x - half + i * SEG;
    out.push({ d: x0 + SEG / 2 + mid, f: () => drawSection(v, x0, i === 0, i === n - 1) });
  }
  out.push({ d: METAL_BRIDGE.x + mid + 0.5, f: () => drawOrb(v) });
  out.push({
    d: METAL_BRIDGE.x - half + mid,
    f: () => drawFlag(v, METAL_BRIDGE.x - half + 10, mid, -1),
  });
  out.push({
    d: METAL_BRIDGE.x + half + mid,
    f: () => drawFlag(v, METAL_BRIDGE.x + half - 10, mid, 1),
  });
  return out;
}
