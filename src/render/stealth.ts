/**
 * Stealth mission 1's tunnels (world/stealth.ts), drawn: sandstone floors and walls, each part's wall tops in the
 * colour the kid's map gives it (blue, black, green and red), his pillars, the rubble filling the far ends, the stairs
 * down the black hall, the way up and out at the top; and the guards, skeleton troops and demons, each throwing its
 * light on the floor ahead of it, warm while it sees nothing and red when it sees you, with a "!" over its head.
 */
import type { DrawView } from '../entities/entity';
import { Sorcerer } from '../entities/sorcerer';
import {
  CATCH_T,
  COVER,
  type Guard,
  HERON_AT,
  KICK_END,
  KICK_FALL,
  lightFan,
  type Part,
  PORTAL_AT,
  type Rect,
  ROOF_AT,
  ROOF_R,
  SOLIDS,
  SORC_AT,
  SORC_HALF,
  SORC_SIGHT,
  STAIRS,
  STEALTH_GOAL,
  type Stealth,
  TOWER_H,
  TUNNELS,
} from '../world/stealth';
import type { Solid } from './layers';
import { box, face } from './metalbridge';

const WALL_H = 40;
const LIP_H = 7;
const FLOOR = '#8C7A5C';
const STONE = '#7A6648';
const STONE_DARK = '#5E4E36';
const STONE_TOP = '#A08A64';
/** His colours, for the tops of each part's walls. */
const TRIM: Record<Part, string> = {
  blue: '#3E7BC4',
  black: '#2A2A2A',
  green: '#7FBF4D',
  red: '#D23A2E',
};

type Edge = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  side: 'n' | 'w' | 's' | 'e';
  part: Part;
};

const EPS = 0.5;
/** What is left of [a, b] once the intervals cut are taken out of it. */
function cut(a: number, b: number, cuts: [number, number][]): [number, number][] {
  let out: [number, number][] = [[a, b]];
  for (const [c0, c1] of cuts) {
    const next: [number, number][] = [];
    for (const [s0, s1] of out) {
      if (c1 <= s0 || c0 >= s1) next.push([s0, s1]);
      else {
        if (c0 > s0) next.push([s0, c0]);
        if (c1 < s1) next.push([c1, s1]);
      }
    }
    out = next;
  }
  return out.filter(([s0, s1]) => s1 - s0 > 1);
}

/** The bare edges of the floor, where it meets the rock: the far ones get walls, the near ones a low lip. */
export function tunnelEdges(): Edge[] {
  const edges: Edge[] = [];
  for (const r of TUNNELS) {
    const others = TUNNELS.filter((q) => q !== r);
    const along = (open: (q: Rect) => boolean) =>
      cut(
        r.x0,
        r.x1,
        others.filter(open).map((q) => [q.x0, q.x1]),
      );
    const across = (open: (q: Rect) => boolean) =>
      cut(
        r.y0,
        r.y1,
        others.filter(open).map((q) => [q.y0, q.y1]),
      );
    for (const [a, b] of along((q) => q.y0 < r.y0 - EPS && q.y1 >= r.y0 - EPS))
      edges.push({ x0: a, y0: r.y0, x1: b, y1: r.y0, side: 'n', part: r.part });
    for (const [a, b] of along((q) => q.y1 > r.y1 + EPS && q.y0 <= r.y1 + EPS))
      edges.push({ x0: a, y0: r.y1, x1: b, y1: r.y1, side: 's', part: r.part });
    for (const [a, b] of across((q) => q.x0 < r.x0 - EPS && q.x1 >= r.x0 - EPS))
      edges.push({ x0: r.x0, y0: a, x1: r.x0, y1: b, side: 'w', part: r.part });
    for (const [a, b] of across((q) => q.x1 > r.x1 + EPS && q.x0 <= r.x1 + EPS))
      edges.push({ x0: r.x1, y0: a, x1: r.x1, y1: b, side: 'e', part: r.part });
  }
  return edges;
}

let edgeCache: Edge[] | null = null;
const edges = () => {
  edgeCache ??= tunnelEdges();
  return edgeCache;
};

/** Under everything: the dark rock, the floors, the stairs, the way out, and the guards' light on the floor. */
export function drawTunnelBack(v: DrawView, W: number, H: number, st: Stealth): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  ctx.fillStyle = '#120E0B';
  ctx.fillRect(0, 0, W, H);
  for (const r of TUNNELS) {
    ctx.fillStyle = FLOOR;
    quad(v, r, 0);
    ctx.fill();
  }
  // Paving lines, every so often, over all the floor.
  ctx.save();
  ctx.beginPath();
  for (const r of TUNNELS) quadPath(v, r, 0);
  ctx.clip();
  ctx.strokeStyle = 'rgba(40,30,20,.18)';
  ctx.lineWidth = 1 * Z;
  ctx.beginPath();
  const b = TUNNELS.reduce(
    (m, r) => ({
      x0: Math.min(m.x0, r.x0),
      y0: Math.min(m.y0, r.y0),
      x1: Math.max(m.x1, r.x1),
      y1: Math.max(m.y1, r.y1),
    }),
    { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
  );
  for (let x = b.x0; x <= b.x1; x += 36) {
    ctx.moveTo(px(x, b.y0), py(x, b.y0));
    ctx.lineTo(px(x, b.y1), py(x, b.y1));
  }
  for (let y = b.y0; y <= b.y1; y += 36) {
    ctx.moveTo(px(b.x0, y), py(b.x0, y));
    ctx.lineTo(px(b.x1, y), py(b.x1, y));
  }
  ctx.stroke();
  ctx.restore();
  // The stairs, a step every so far.
  for (let y = STAIRS.y0, k = 0; y < STAIRS.y1; y += 12, k++) {
    ctx.fillStyle = k % 2 ? '#7A6A4E' : '#97856A';
    quad(v, { x0: STAIRS.x0, y0: y, x1: STAIRS.x1, y1: Math.min(STAIRS.y1, y + 12) }, 0);
    ctx.fill();
  }
  // The way up and out, glowing.
  const g = STEALTH_GOAL;
  v.isoEllipse(g.x, g.y, 16 + Math.sin(T * 3) * 2);
  ctx.fillStyle = 'rgba(255,226,140,.35)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,226,140,.8)';
  ctx.lineWidth = 2 * Z;
  ctx.stroke();
  // The guards' light, cut short by walls and pillars.
  for (const gd of st.guards) {
    const fan = lightFan(gd);
    const hot = gd.seen > 0;
    ctx.fillStyle = hot ? 'rgba(255,70,50,.32)' : 'rgba(255,214,120,.2)';
    ctx.beginPath();
    for (const p of fan) ctx.lineTo(px(p.x, p.y), py(p.x, p.y));
    ctx.closePath();
    ctx.fill();
  }
}

function quadPath(v: DrawView, r: Rect, z: number): void {
  const { ctx, px, py } = v;
  ctx.moveTo(px(r.x0, r.y0), py(r.x0, r.y0, z));
  ctx.lineTo(px(r.x1, r.y0), py(r.x1, r.y0, z));
  ctx.lineTo(px(r.x1, r.y1), py(r.x1, r.y1, z));
  ctx.lineTo(px(r.x0, r.y1), py(r.x0, r.y1, z));
  ctx.closePath();
}
function quad(v: DrawView, r: Rect, z: number): void {
  v.ctx.beginPath();
  quadPath(v, r, z);
}

/** A piece of wall along an edge: a face up from the floor and its top, the top edged in its part's colour. */
function drawWall(v: DrawView, e: Edge): void {
  const { ctx, px, py } = v;
  const tall = e.side === 'n' || e.side === 'w';
  const h = tall ? WALL_H : LIP_H;
  face(v, e.x0, e.y0, e.x1, e.y1, 0, h, e.side === 'n' || e.side === 's' ? STONE : STONE_DARK);
  // Its top, a little thickness out into the rock.
  const t = 6;
  const ox = e.side === 'w' ? -t : e.side === 'e' ? t : 0;
  const oy = e.side === 'n' ? -t : e.side === 's' ? t : 0;
  ctx.fillStyle = STONE_TOP;
  ctx.beginPath();
  ctx.moveTo(px(e.x0, e.y0), py(e.x0, e.y0, h));
  ctx.lineTo(px(e.x1, e.y1), py(e.x1, e.y1, h));
  ctx.lineTo(px(e.x1 + ox, e.y1 + oy), py(e.x1 + ox, e.y1 + oy, h));
  ctx.lineTo(px(e.x0 + ox, e.y0 + oy), py(e.x0 + ox, e.y0 + oy, h));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = TRIM[e.part];
  ctx.lineWidth = 2.4 * v.zoom;
  ctx.beginPath();
  ctx.moveTo(px(e.x0, e.y0), py(e.x0, e.y0, h));
  ctx.lineTo(px(e.x1, e.y1), py(e.x1, e.y1, h));
  ctx.stroke();
}

/** Everything standing in the tunnels, each to be sorted with the figure by its depth. */
export function tunnelSolids(v: DrawView, st: Stealth): Solid[] {
  const out: Solid[] = [];
  for (const e of edges()) {
    // Long walls in short pieces, so each sorts where it stands.
    const len = Math.hypot(e.x1 - e.x0, e.y1 - e.y0);
    const n = Math.max(1, Math.ceil(len / 36));
    for (let k = 0; k < n; k++) {
      const a = k / n;
      const b = (k + 1) / n;
      const piece: Edge = {
        ...e,
        x0: e.x0 + (e.x1 - e.x0) * a,
        y0: e.y0 + (e.y1 - e.y0) * a,
        x1: e.x0 + (e.x1 - e.x0) * b,
        y1: e.y0 + (e.y1 - e.y0) * b,
      };
      out.push({
        d: (piece.x0 + piece.x1) / 2 + (piece.y0 + piece.y1) / 2,
        f: () => drawWall(v, piece),
      });
    }
  }
  for (const s of SOLIDS) {
    const d = s.x1 + s.y1;
    if (s.kind === 'rubble') out.push({ d, f: () => drawRubble(v, s) });
    else
      out.push({
        d,
        f: () =>
          box(
            v,
            s.x0,
            s.y0,
            s.x1 - s.x0,
            s.y1 - s.y0,
            0,
            s.h,
            STONE,
            STONE_DARK,
            s.kind === 'pillar' ? '#B49C72' : STONE_TOP,
          ),
      });
  }
  out.push({ d: STEALTH_GOAL.x + STEALTH_GOAL.y - 10, f: () => drawWayOut(v) });
  for (const g of st.guards) out.push({ d: g.x + g.y, f: () => drawGuard(v, g) });
  return out;
}

/** A heap of fallen stones. */
function drawRubble(v: DrawView, s: Rect & { h: number }): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  for (let k = 0; k < 9; k++) {
    const x = s.x0 + (((k * 37) % 100) / 100) * (s.x1 - s.x0);
    const y = s.y0 + (((k * 61) % 100) / 100) * (s.y1 - s.y0);
    ctx.fillStyle = k % 3 ? '#8E8170' : '#6E6253';
    ctx.beginPath();
    ctx.ellipse(
      px(x, y),
      py(x, y, 4 + (k % 3) * 3),
      (5 + (k % 4)) * Z,
      (3.4 + (k % 3)) * Z,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

/** A wooden ladder up at the way out, light coming down it. */
function drawWayOut(v: DrawView): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const g = STEALTH_GOAL;
  ctx.strokeStyle = '#6B4A2A';
  ctx.lineWidth = 2.2 * Z;
  ctx.beginPath();
  for (const s of [-6, 6]) {
    ctx.moveTo(px(g.x + s, g.y - s), py(g.x + s, g.y - s, 0));
    ctx.lineTo(px(g.x + s, g.y - s), py(g.x + s, g.y - s, 70));
  }
  for (let z = 8; z < 70; z += 10) {
    ctx.moveTo(px(g.x - 6, g.y + 6), py(g.x - 6, g.y + 6, z));
    ctx.lineTo(px(g.x + 6, g.y - 6), py(g.x + 6, g.y - 6, z));
  }
  ctx.stroke();
}

/** A skeleton troop with a spear and a lantern, or a demon with horns, a tail and burning eyes; "!" while it sees you. */
export function drawGuard(v: DrawView, g: Guard): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const x = px(g.x, g.y);
  const y = py(g.x, g.y, 0);
  if (g.down) {
    drawDown(v, g, x, y);
    return;
  }
  // Facing left or right on the screen, by where it is looking.
  const dir = Math.cos(g.look) - Math.sin(g.look) >= 0 ? 1 : -1;
  const step = Math.sin(T * 8 + g.x) * (g.speed > 0 ? 1 : 0);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 8 * Z, 3 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(dir, 1);
  ctx.lineCap = 'round';
  if (g.kind === 'skeleton') {
    ctx.strokeStyle = '#E8E2D0';
    ctx.lineWidth = 2 * Z;
    ctx.beginPath();
    ctx.moveTo(-2 * Z, -14 * Z);
    ctx.lineTo((-3 - step) * Z, -1 * Z);
    ctx.moveTo(2 * Z, -14 * Z);
    ctx.lineTo((3 + step) * Z, -1 * Z);
    ctx.moveTo(0, -14 * Z);
    ctx.lineTo(0, -27 * Z);
    ctx.stroke();
    ctx.lineWidth = 1.2 * Z;
    for (const r of [-24, -21, -18]) {
      ctx.beginPath();
      ctx.moveTo(-4 * Z, r * Z);
      ctx.lineTo(4 * Z, r * Z);
      ctx.stroke();
    }
    // The spear over the shoulder, the lantern out front.
    ctx.strokeStyle = '#6B4A2A';
    ctx.lineWidth = 1.4 * Z;
    ctx.beginPath();
    ctx.moveTo(-5 * Z, -6 * Z);
    ctx.lineTo(-2 * Z, -40 * Z);
    ctx.stroke();
    ctx.fillStyle = '#B9C4CB';
    ctx.beginPath();
    ctx.moveTo(-2 * Z, -44 * Z);
    ctx.lineTo(-3.4 * Z, -38 * Z);
    ctx.lineTo(-0.6 * Z, -38 * Z);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#E8E2D0';
    ctx.lineWidth = 1.6 * Z;
    ctx.beginPath();
    ctx.moveTo(1 * Z, -24 * Z);
    ctx.lineTo(7 * Z, -17 * Z);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,214,120,${0.85 + 0.15 * Math.sin(T * 9 + g.y)})`;
    ctx.beginPath();
    ctx.arc(8 * Z, -14 * Z, 2.6 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E8E2D0';
    ctx.beginPath();
    ctx.arc(0, -31 * Z, 4.4 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1A1612';
    ctx.beginPath();
    ctx.arc(1.8 * Z, -31.6 * Z, 1.1 * Z, 0, Math.PI * 2);
    ctx.arc(-0.8 * Z, -31.6 * Z, 1.1 * Z, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#8E1F1A';
    ctx.lineWidth = 3 * Z;
    ctx.beginPath();
    ctx.moveTo(-2.4 * Z, -12 * Z);
    ctx.lineTo((-3 - step) * Z, -1 * Z);
    ctx.moveTo(2.4 * Z, -12 * Z);
    ctx.lineTo((3 + step) * Z, -1 * Z);
    ctx.stroke();
    // The tail, flicking.
    ctx.lineWidth = 1.6 * Z;
    ctx.beginPath();
    ctx.moveTo(-3 * Z, -12 * Z);
    ctx.quadraticCurveTo(-12 * Z, -10 * Z + Math.sin(T * 4) * 3 * Z, -13 * Z, -18 * Z);
    ctx.stroke();
    ctx.fillStyle = '#C0392B';
    ctx.beginPath();
    ctx.ellipse(0, -21 * Z, 6.4 * Z, 9 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -33 * Z, 5 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2A1410';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 3 * Z, -36.5 * Z);
      ctx.lineTo(s * 6.5 * Z, -43 * Z);
      ctx.lineTo(s * 1.4 * Z, -37.5 * Z);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#FFD84A';
    ctx.beginPath();
    ctx.arc(2.2 * Z, -33.4 * Z, 1.2 * Z, 0, Math.PI * 2);
    ctx.arc(-0.8 * Z, -33.4 * Z, 1.2 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.lineCap = 'butt';
  if (g.seen > 0) {
    const k = Math.min(1, g.seen / CATCH_T);
    ctx.font = `900 ${Math.round(14 * Z)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 3 * Z;
    ctx.strokeStyle = 'rgba(20,10,8,.9)';
    ctx.strokeText('!', x, y - 48 * Z);
    ctx.fillStyle = `rgb(255,${Math.round(220 - 170 * k)},${Math.round(80 - 40 * k)})`;
    ctx.fillText('!', x, y - 48 * Z);
  }
}

/** Backstabbed: a skeleton in a heap of bones with its spear across them; a demon gone, a scorch and a curl of smoke. */
function drawDown(v: DrawView, g: Guard, x: number, y: number): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  if (g.kind === 'skeleton') {
    ctx.strokeStyle = '#E8E2D0';
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.8 * Z;
    for (const [a, l] of [
      [0.3, 9],
      [1.9, 8],
      [2.8, 7],
      [4.2, 9],
      [5.3, 6],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 2 * Z, y + Math.sin(a) * Z);
      ctx.lineTo(x + Math.cos(a) * l * Z, y + Math.sin(a) * l * 0.5 * Z);
      ctx.stroke();
    }
    ctx.strokeStyle = '#6B4A2A';
    ctx.lineWidth = 1.4 * Z;
    ctx.beginPath();
    ctx.moveTo(x - 14 * Z, y + 2 * Z);
    ctx.lineTo(x + 14 * Z, y - 4 * Z);
    ctx.stroke();
    ctx.fillStyle = '#E8E2D0';
    ctx.beginPath();
    ctx.arc(x + 5 * Z, y - 3 * Z, 3.6 * Z, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'butt';
  } else {
    ctx.fillStyle = 'rgba(30,14,10,.55)';
    ctx.beginPath();
    ctx.ellipse(x, y, 11 * Z, 5 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,110,110,.35)';
    for (let k = 0; k < 3; k++) {
      const r = (T * 0.6 + k / 3) % 1;
      ctx.beginPath();
      ctx.arc(x + Math.sin(T + k) * 3 * Z, y - (6 + r * 26) * Z, (3 + r * 4) * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The portal in the tar below the tower: purple rings turning, the same as the Heron's; closing at the end. */
function drawRoofPortal(v: DrawView, open: number): void {
  if (open <= 0.01) return;
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const sx = px(PORTAL_AT.x, PORTAL_AT.y);
  const sy = py(PORTAL_AT.x, PORTAL_AT.y, -TOWER_H);
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 60 * Z * open);
  g.addColorStop(0, `rgba(40,10,70,${0.85 * open})`);
  g.addColorStop(1, 'rgba(120,60,200,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 60 * Z * open, 30 * Z * open, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const r = (18 + i * 12) * Z * open;
    ctx.strokeStyle = `rgba(185,138,255,${0.8 - i * 0.15})`;
    ctx.lineWidth = (4 - i * 0.7) * Z;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r, r * 0.5, 0, T * (4 - i * 0.6), T * (4 - i * 0.6) + Math.PI * 1.4);
    ctx.stroke();
  }
}

/** How open the portal is, from the kick: open all along, shut fast at the very end. */
function portalOpen(kickT: number): number {
  if (kickT < 0) return 1;
  return Math.max(0, Math.min(1, (KICK_END - kickT) / 0.6));
}

/**
 * Behind the tower's top: the tar all round far below, heaving and bubbling, the portal turning in it at the tower's
 * back, the tower's round stone side going down into the tar; then the roof, and the sorcerer's look across it.
 */
export function drawRoofBack(v: DrawView, W: number, H: number, st: Stealth): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  ctx.fillStyle = '#17121B';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(181,124,255,.12)';
  ctx.lineWidth = 2 * Z;
  for (let k = 1; k <= 6; k++) {
    v.isoEllipse(ROOF_AT.x, ROOF_AT.y, ROOF_R + k * 90 + Math.sin(T * 0.5 + k) * 10, -TOWER_H);
    ctx.stroke();
  }
  drawRoofPortal(v, portalOpen(st.kickT));
  // The tower's side, the half toward us, down into the tar.
  const g = ctx.createLinearGradient(
    0,
    py(ROOF_AT.x, ROOF_AT.y, 0),
    0,
    py(ROOF_AT.x, ROOF_AT.y, -TOWER_H),
  );
  g.addColorStop(0, '#5E5A52');
  g.addColorStop(1, '#2A2622');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let k = 0; k <= 24; k++) {
    const a = -Math.PI / 4 + (k / 24) * Math.PI;
    const x = ROOF_AT.x + Math.cos(a) * ROOF_R;
    const y = ROOF_AT.y + Math.sin(a) * ROOF_R;
    ctx.lineTo(px(x, y), py(x, y, 0));
  }
  for (let k = 24; k >= 0; k--) {
    const a = -Math.PI / 4 + (k / 24) * Math.PI;
    const x = ROOF_AT.x + Math.cos(a) * ROOF_R;
    const y = ROOF_AT.y + Math.sin(a) * ROOF_R;
    ctx.lineTo(px(x, y), py(x, y, -TOWER_H));
  }
  ctx.closePath();
  ctx.fill();
  // The roof: flagstones in rings.
  v.isoEllipse(ROOF_AT.x, ROOF_AT.y, ROOF_R);
  ctx.fillStyle = '#8C877A';
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,36,30,.25)';
  ctx.lineWidth = 1.6 * Z;
  for (const k of [0.75, 0.5, 0.25]) {
    v.isoEllipse(ROOF_AT.x, ROOF_AT.y, ROOF_R * k);
    ctx.stroke();
  }
  // The sorcerer's look across the roof, until he is kicked off.
  if (st.kickT < 0) {
    const fan = lightFan(
      { x: SORC_AT.x, y: SORC_AT.y, look: st.sorc.look },
      16,
      SORC_SIGHT,
      SORC_HALF,
    );
    ctx.fillStyle = st.sorcSeen > 0 ? 'rgba(255,70,50,.3)' : 'rgba(185,138,255,.2)';
    ctx.beginPath();
    for (const p of fan) ctx.lineTo(px(p.x, p.y), py(p.x, p.y));
    ctx.closePath();
    ctx.fill();
  }
}

const SORC_VIEW = new Sorcerer(SORC_AT);

/** On the tower's top: the battlements round its rim, the crates, the sorcerer, and after the kick, the Heron. */
export function roofSolids(v: DrawView, st: Stealth): Solid[] {
  const out: Solid[] = [];
  const n = 28;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    // A gap on the portal's side: the way off.
    const off = Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI));
    if (Math.abs(off) < 0.32) continue;
    const x = ROOF_AT.x + Math.cos(a) * (ROOF_R - 6);
    const y = ROOF_AT.y + Math.sin(a) * (ROOF_R - 6);
    if (k % 2) continue;
    out.push({
      d: x + y,
      f: () => box(v, x - 7, y - 7, 14, 14, 0, 16, '#7A7468', '#666053', '#A49D8C'),
    });
  }
  for (const c of COVER)
    out.push({
      d: c.x1 + c.y1,
      f: () => box(v, c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0, 0, 26, '#8A5E34', '#6E4A28', '#A87642'),
    });
  out.push({ d: SORC_AT.x + SORC_AT.y, f: () => drawSorc(v, st) });
  if (st.kickT >= HERON_AT)
    out.push({ d: PORTAL_AT.x + PORTAL_AT.y - 1, f: () => drawHeronCall(v, st.kickT) });
  return out;
}

/** The sorcerer, hanging in the air at the roof's back; kicked, he tumbles out over the portal and down into it. */
function drawSorc(v: DrawView, st: Stealth): void {
  const s = SORC_VIEW;
  if (st.kickT < 0) {
    s.state = 'wait';
    s.t = 0;
    s.x = SORC_AT.x;
    s.y = SORC_AT.y;
    s.draw(v, 'air');
    return;
  }
  const k = Math.min(1, st.kickT / KICK_FALL);
  if (k >= 1) return;
  s.state = 'fall';
  s.t = st.kickT;
  s.x = SORC_AT.x + (PORTAL_AT.x - SORC_AT.x) * k;
  s.y = SORC_AT.y + (PORTAL_AT.y - SORC_AT.y) * k;
  // Down past the roof's edge toward the tar, faster as he goes.
  const drop = k * k * TOWER_H;
  // No shadow on the roof once he is off it.
  s.draw(
    {
      ...v,
      py: (x: number, y: number, z = 0) => v.py(x, y, z - drop),
      isoEllipse: () => v.ctx.beginPath(),
    },
    'air',
  );
}

/** The Heron, up out of the portal: his long neck and beak, a wing waving him on. "Come on!" */
function drawHeronCall(v: DrawView, kickT: number): void {
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const up = Math.max(0, Math.min(1, (kickT - HERON_AT) / 0.5)) * portalOpen(kickT);
  if (up <= 0) return;
  const x = px(PORTAL_AT.x, PORTAL_AT.y);
  const y = py(PORTAL_AT.x, PORTAL_AT.y, -TOWER_H) - 6 * Z;
  const h = 46 * up;
  ctx.strokeStyle = '#7F93A8';
  ctx.lineCap = 'round';
  ctx.lineWidth = 5 * Z;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 10 * Z, y - h * 0.5 * Z, x + 2 * Z, y - h * Z);
  ctx.stroke();
  ctx.fillStyle = '#E8EEF2';
  ctx.beginPath();
  ctx.arc(x + 2 * Z, y - h * Z, 5 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E8C547';
  ctx.beginPath();
  ctx.moveTo(x + 6 * Z, y - (h + 1) * Z);
  ctx.lineTo(x + 22 * Z, y - (h - 2) * Z);
  ctx.lineTo(x + 6 * Z, y - (h - 3) * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath();
  ctx.arc(x + 3.4 * Z, y - (h + 1.4) * Z, 1.1 * Z, 0, Math.PI * 2);
  ctx.fill();
  // A wing, waving.
  const wv = Math.sin(kickT * 12) * 6;
  ctx.fillStyle = '#7F93A8';
  ctx.beginPath();
  ctx.moveTo(x - 4 * Z, y - 4 * Z);
  ctx.quadraticCurveTo(x - 22 * Z, y - (16 + wv) * Z, x - 18 * Z, y - (30 + wv) * Z);
  ctx.quadraticCurveTo(x - 10 * Z, y - 16 * Z, x - 2 * Z, y - 10 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.lineCap = 'butt';
  ctx.font = `900 ${Math.round(13 * Z)}px Grandstander, ui-rounded, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.4 * Z;
  ctx.strokeStyle = 'rgba(20,10,30,.9)';
  ctx.strokeText('"Come on!"', x + 8 * Z, y - (h + 10) * Z);
  ctx.fillStyle = '#E8D9FF';
  ctx.fillText('"Come on!"', x + 8 * Z, y - (h + 10) * Z);
}
