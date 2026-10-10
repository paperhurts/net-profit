/**
 * The trench, side on, while the figure dives: the boat's hull at the surface
 * overhead, light coming down in shafts that fade with depth, the water going
 * from bright blue to black, rock walls closing in, kelp and fans and then a
 * garden of glowing things on the walls and the floor, shoals going by, and the
 * diver in the brass helmet with its tank and flippers, bubbles going up. Below
 * the sunlit water the dark closes in round the diver's lamp, and what glows is
 * drawn over the dark so it shines. The air left and the depth are shown at the
 * top. One view, drawn to the game's canvas in place of the sea while diving.
 */

import type { Diver } from '../entities/diver';
import { AIR_LOW, AIR_MAX } from '../entities/diver';
import {
  ENTRY,
  fishIn,
  floorAt,
  type Plant,
  type Shoal,
  SUNLIT,
  shoalAt,
  TD,
  TW,
  TWILIGHT,
  wallIn,
} from '../world/trench';

/** How much of the trench shows across the screen. */
export const VIEW_W = 420;
/** The diver drawn bigger than life, so a small player finds it on a phone. */
const DIVER_SIZE = 1.5;

/** The water's colour at the surface, the end of the sunlit water, the end of the twilight, and the floor. */
const WATER: readonly [number, string][] = [
  [0, '#5BBBD4'],
  [SUNLIT, '#1D6A90'],
  [TWILIGHT, '#0B2747'],
  [TD, '#030914'],
];

function mix(a: string, b: string, t: number): string {
  const p = (h: string, i: number) => Number.parseInt(h.slice(i, i + 2), 16);
  const c = [1, 3, 5].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** The water's colour at a depth. */
export function waterAt(y: number): string {
  if (y <= 0) return WATER[0]?.[1] as string;
  for (let i = 1; i < WATER.length; i++) {
    const [y1, c1] = WATER[i] as [number, string];
    const [y0, c0] = WATER[i - 1] as [number, string];
    if (y <= y1) return mix(c0, c1, (y - y0) / (y1 - y0));
  }
  return WATER[WATER.length - 1]?.[1] as string;
}

/** How dark it is round the diver at a depth: none in the sunlit water, most of the way to black at the bottom. */
export function darkAt(y: number): number {
  return Math.max(0, Math.min(0.82, ((y - SUNLIT * 0.7) / (TWILIGHT - SUNLIT * 0.7)) * 0.82));
}

export type DiveScene = {
  diver: Diver;
  plants: readonly Plant[];
  shoals: readonly Shoal[];
  /** The boat's hull and trim paint, for its underside overhead. */
  hull: string;
  trim: string;
  /** Bubbles going up, in scene units. */
  bubbles: readonly { x: number; y: number; r: number }[];
  /** Whether fish i of shoal si is there; a speared one's place is empty a while. */
  here?: (si: number, i: number) => boolean;
  /** Spears in flight, the fish the next throw would go for, and words rising off a catch. */
  spears?: readonly { x: number; y: number; vx: number; vy: number }[];
  aim?: { x: number; y: number } | null;
  texts?: readonly { x: number; y: number; t: number; msg: string; c: string }[];
};

/** The camera: the scene point at the screen's middle, and the scale. */
export function diveCamera(d: { x: number; y: number }, W: number, H: number) {
  const s = W / VIEW_W;
  const hw = W / 2 / s;
  const hh = H / 2 / s;
  return {
    s,
    x: Math.max(hw, Math.min(TW - hw, d.x)),
    // At the top, the surface sits a quarter of the way down the screen: a little sky, the boat, then water.
    y: Math.max(hh * 0.5, Math.min(TD + 40 - hh, d.y)),
  };
}

/** Draw the whole dive view. */
export function drawDive(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  T: number,
  sc: DiveScene,
): void {
  const d = sc.diver;
  const cam = diveCamera(d, W, H);
  const { s } = cam;
  const X = (x: number) => (x - cam.x) * s + W / 2;
  const Y = (y: number) => (y - cam.y) * s + H / 2;
  const top = cam.y - H / 2 / s;
  const bottom = cam.y + H / 2 / s;
  // The water, the right colour for each depth on screen, and the sky over the surface.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  for (let i = 0; i <= 6; i++) {
    const yy = top + ((bottom - top) * i) / 6;
    g.addColorStop(i / 6, yy < 0 ? '#CDEBF3' : waterAt(yy));
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Light shafts down from the surface, gone by the end of the sunlit water.
  if (top < SUNLIT) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const x0 = (i / 6) * TW + Math.sin(T * 0.3 + i) * 20;
      const fade = ctx.createLinearGradient(0, Y(0), 0, Y(SUNLIT));
      fade.addColorStop(0, 'rgba(255,255,230,.16)');
      fade.addColorStop(1, 'rgba(255,255,230,0)');
      ctx.fillStyle = fade;
      ctx.beginPath();
      ctx.moveTo(X(x0), Y(0));
      ctx.lineTo(X(x0 + 50), Y(0));
      ctx.lineTo(X(x0 + 150), Y(SUNLIT));
      ctx.lineTo(X(x0 + 70), Y(SUNLIT));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  // Marine snow drifting down, all the way.
  ctx.fillStyle = 'rgba(220,240,255,.35)';
  for (let i = 0; i < 60; i++) {
    const sx = (i * 173.3) % TW;
    const sy = (((i * 97.1 + T * 6) % (TD + 100)) + TD + 100) % (TD + 100);
    if (sy < top - 5 || sy > bottom + 5) continue;
    ctx.fillRect(X(sx), Y(sy), 1.4 * s, 1.4 * s);
  }
  drawRock(ctx, X, Y, s, top, bottom);
  // What grows and swims: the plain ones now, the glowing ones over the dark.
  for (const p of sc.plants)
    if (!p.glow && p.y > top - 140 && p.y < bottom + 140) drawPlant(ctx, X, Y, s, p, T, false);
  const here = sc.here ?? (() => true);
  sc.shoals.forEach((sh, si) => {
    if (!sh.glow) drawShoal(ctx, X, Y, s, sh, T, top, bottom, (i) => here(si, i));
  });
  // The boat overhead, the diver, and the bubbles.
  if (top < 30) drawHullBelow(ctx, X, Y, s, sc.hull, sc.trim, T);
  drawDiver(ctx, X(d.x), Y(d.y), s * DIVER_SIZE, d, T);
  ctx.fillStyle = 'rgba(230,248,255,.7)';
  for (const b of sc.bubbles) {
    ctx.beginPath();
    ctx.arc(X(b.x), Y(b.y), b.r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // The dark round the diver's lamp, deeper the deeper it is.
  const k = darkAt(d.y);
  if (k > 0.01) {
    const lamp = ctx.createRadialGradient(X(d.x), Y(d.y), 40 * s, X(d.x), Y(d.y), 230 * s);
    lamp.addColorStop(0, 'rgba(1,4,10,0)');
    lamp.addColorStop(1, `rgba(1,4,10,${k})`);
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 0, W, H);
  }
  // What glows, over the dark.
  for (const p of sc.plants)
    if (p.glow && p.y > top - 140 && p.y < bottom + 140) drawPlant(ctx, X, Y, s, p, T, true);
  sc.shoals.forEach((sh, si) => {
    if (sh.glow) drawShoal(ctx, X, Y, s, sh, T, top, bottom, (i) => here(si, i));
  });
  // The spears in flight, a ring round what the next throw goes for, and what was caught.
  ctx.strokeStyle = '#E8E2D0';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2 * s;
  for (const sp of sc.spears ?? []) {
    const l = Math.hypot(sp.vx, sp.vy) || 1;
    const ux = sp.vx / l;
    const uy = sp.vy / l;
    ctx.beginPath();
    ctx.moveTo(X(sp.x - ux * 26), Y(sp.y - uy * 26));
    ctx.lineTo(X(sp.x), Y(sp.y));
    ctx.stroke();
  }
  if (sc.aim) {
    const k2 = (T * 2) % 1;
    ctx.strokeStyle = `rgba(255,246,229,${0.9 - k2 * 0.5})`;
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.arc(X(sc.aim.x), Y(sc.aim.y), (16 + k2 * 6) * s, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.font = `800 ${Math.round(15 * Math.min(1.2, s))}px Grandstander, system-ui, sans-serif`;
  for (const t of sc.texts ?? []) {
    ctx.globalAlpha = Math.max(0, 1 - t.t);
    ctx.fillStyle = t.c;
    ctx.fillText(t.msg, X(t.x), Y(t.y - t.t * 30));
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  drawGauge(ctx, d, W);
}

type Proj = (v: number) => number;

/** The trench's walls and floor: dark rock, darker with depth, ragged along their faces. */
function drawRock(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  top: number,
  bottom: number,
): void {
  const y0 = Math.max(0, top - 40);
  const y1 = Math.min(TD + 60, bottom + 40);
  const rock = ctx.createLinearGradient(0, Y(y0), 0, Y(y1));
  rock.addColorStop(0, y0 < SUNLIT ? '#2F5B66' : '#16303F');
  rock.addColorStop(1, y1 > TWILIGHT ? '#060E16' : '#1B3A4A');
  ctx.fillStyle = rock;
  for (const side of [-1, 1] as const) {
    ctx.beginPath();
    const edge = side < 0 ? -200 : TW + 200;
    ctx.moveTo(X(edge), Y(y0));
    for (let y = y0; y <= y1; y += 16) {
      const w = wallIn(y, side);
      ctx.lineTo(X(side < 0 ? w : TW - w), Y(y));
    }
    ctx.lineTo(X(edge), Y(y1));
    ctx.closePath();
    ctx.fill();
  }
  if (bottom > TD - 120) {
    ctx.beginPath();
    ctx.moveTo(X(-200), Y(TD + 100));
    for (let x = -200; x <= TW + 200; x += 16)
      ctx.lineTo(X(x), Y(floorAt(Math.max(0, Math.min(TW, x)))));
    ctx.lineTo(X(TW + 200), Y(TD + 100));
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineWidth = s;
}

/** One plant: kelp swaying up, a sea fan, a tube worm cluster, an anemone, a sea pen or a glowing strand. */
function drawPlant(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  p: Plant,
  T: number,
  glowing: boolean,
): void {
  // Out from its wall or up off the floor: the direction it grows, and across it.
  const ux = p.from === 'floor' ? 0 : p.from < 0 ? 0.6 : -0.6;
  const uy = p.from === 'floor' ? -1 : -0.8;
  const sway = Math.sin(T * 1.3 + p.ph) * 0.25;
  const bx = X(p.x);
  const by = Y(p.y);
  const tx = bx + (ux + sway) * p.h * s;
  const ty = by + uy * p.h * s;
  if (glowing) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.55 + 0.25 * Math.sin(T * 2 + p.ph);
    const halo = ctx.createRadialGradient(tx, ty, 0, tx, ty, p.h * 1.1 * s);
    halo.addColorStop(0, hex(p.c, 0.5 * pulse));
    halo.addColorStop(1, hex(p.c, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(tx, ty, p.h * 1.1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = p.c;
  ctx.fillStyle = p.c;
  ctx.lineCap = 'round';
  switch (p.kind) {
    case 'kelp':
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + ux * p.h * 0.5 * s, by + uy * p.h * 0.5 * s - 10 * s, tx, ty);
      ctx.stroke();
      for (let i = 1; i < 4; i++) {
        const t = i / 4;
        const lx = bx + (tx - bx) * t;
        const ly = by + (ty - by) * t;
        ctx.beginPath();
        ctx.ellipse(lx + 4 * s, ly, 6 * s, 2.2 * s, 0.5 + sway, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'fan':
      ctx.lineWidth = 1.2 * s;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(tx + i * 5 * s, ty + Math.abs(i) * 3 * s);
        ctx.stroke();
      }
      break;
    case 'tube':
      ctx.lineWidth = 2.4 * s;
      for (let i = -2; i <= 2; i++) {
        const ex = bx + i * 4 * s + (tx - bx) * (0.6 + 0.1 * i);
        const ey = by + (ty - by) * (0.7 + 0.08 * Math.abs(i));
        ctx.beginPath();
        ctx.moveTo(bx + i * 3 * s, by);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ex, ey, 2.2 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'anemone':
      ctx.beginPath();
      ctx.ellipse(bx, by - 4 * s, 7 * s, 5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.4 * s;
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI * 0.9 + (i / 8) * Math.PI * 0.8 + Math.sin(T * 2 + p.ph + i) * 0.12;
        ctx.beginPath();
        ctx.moveTo(bx, by - 6 * s);
        ctx.lineTo(bx + Math.cos(a) * p.h * 0.6 * s, by - 6 * s + Math.sin(a) * p.h * 0.6 * s);
        ctx.stroke();
      }
      break;
    case 'pen':
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      for (let i = 2; i < 8; i++) {
        const t = i / 8;
        ctx.beginPath();
        ctx.ellipse(
          bx + (tx - bx) * t,
          by + (ty - by) * t,
          4.5 * s * (1 - t * 0.5),
          1.3 * s,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      break;
    default:
      // A glowing strand: a trailing line of beads.
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        ctx.beginPath();
        ctx.arc(
          bx + (tx - bx) * t + Math.sin(T * 1.5 + p.ph + i) * 3 * s,
          by + (ty - by) * t,
          1.8 * s,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
  }
}

/** A colour #rrggbb at an alpha. */
function hex(c: string, a: number): string {
  const p = (i: number) => Number.parseInt(c.slice(i, i + 2), 16);
  return `rgba(${p(1)},${p(3)},${p(5)},${a})`;
}

/** Every fish in a shoal, each round the shoal's middle at its own place, heading the way the shoal goes. */
function drawShoal(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  sh: Shoal,
  T: number,
  top: number,
  bottom: number,
  here: (i: number) => boolean,
): void {
  const c = shoalAt(sh, T);
  if (c.y < top - 200 || c.y > bottom + 200) return;
  const ahead = shoalAt(sh, T + 0.2);
  const dir = ahead.x >= c.x ? 1 : -1;
  const glowC = sh.light ?? sh.c;
  for (let i = 0; i < sh.n; i++) {
    if (!here(i)) continue;
    const p = fishIn(sh, i, T);
    const fx = X(p.x);
    const fy = Y(p.y);
    const z = sh.size * s;
    if (sh.glow) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(fx, fy, 0, fx, fy, z * 2.6);
      halo.addColorStop(0, hex(glowC, 0.45));
      halo.addColorStop(1, hex(glowC, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(fx - z * 2.6, fy - z * 2.6, z * 5.2, z * 5.2);
      ctx.restore();
    }
    ctx.fillStyle = sh.c;
    ctx.strokeStyle = sh.c;
    if (sh.kind === 'jelly') {
      const beat = Math.sin(T * 2.4 + i);
      ctx.beginPath();
      ctx.ellipse(fx, fy, z * (1 + 0.1 * beat), z * 0.7, 0, Math.PI, 0);
      ctx.fill();
      ctx.lineWidth = 0.9 * s;
      for (let t = -2; t <= 2; t++) {
        ctx.beginPath();
        ctx.moveTo(fx + t * z * 0.35, fy);
        ctx.quadraticCurveTo(
          fx + t * z * 0.35 + beat * 3 * s,
          fy + z,
          fx + t * z * 0.3,
          fy + z * 1.9,
        );
        ctx.stroke();
      }
    } else if (sh.kind === 'dragon') {
      // Long and black, a row of blue lights, jaws, and a glowing lure on its chin.
      ctx.beginPath();
      ctx.ellipse(fx, fy, z, z * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx - dir * z * 0.9, fy);
      ctx.lineTo(fx - dir * z * 1.35, fy - z * 0.3);
      ctx.lineTo(fx - dir * z * 1.35, fy + z * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = glowC;
      for (let t = 0; t < 5; t++)
        ctx.fillRect(fx + dir * (z * 0.5 - t * z * 0.28), fy + z * 0.08, 1.5 * s, 1.5 * s);
      ctx.strokeStyle = glowC;
      ctx.lineWidth = 0.9 * s;
      ctx.beginPath();
      ctx.moveTo(fx + dir * z * 0.7, fy + z * 0.15);
      ctx.quadraticCurveTo(fx + dir * z * 0.8, fy + z * 0.9, fx + dir * z * 1.05, fy + z * 1.05);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(fx + dir * z * 1.05, fy + z * 1.05, (1.6 + Math.sin(T * 4 + i)) * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (sh.kind === 'squid') {
      ctx.beginPath();
      ctx.ellipse(fx, fy, z, z * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1 * s;
      for (let t = -1; t <= 1; t++) {
        ctx.beginPath();
        ctx.moveTo(fx - dir * z * 0.9, fy + t * z * 0.12);
        ctx.lineTo(fx - dir * z * 1.9, fy + t * z * 0.3 + Math.sin(T * 5 + i + t) * z * 0.15);
        ctx.stroke();
      }
    } else {
      // A fish: a body and a tail, with a light along its side if it is a lanternfish.
      ctx.beginPath();
      ctx.ellipse(fx, fy, z, z * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx - dir * z * 0.8, fy);
      ctx.lineTo(fx - dir * z * 1.45, fy - z * 0.38);
      ctx.lineTo(fx - dir * z * 1.45, fy + z * 0.38);
      ctx.closePath();
      ctx.fill();
      if (sh.kind === 'lantern') {
        ctx.fillStyle = '#FFFFFF';
        for (let t = -1; t <= 1; t++)
          ctx.fillRect(fx + t * z * 0.4, fy + z * 0.12, 1.2 * s, 1.2 * s);
      }
    }
  }
}

/** The diver side on: tank on the back, a suit, kicking flippers, arms out ahead, and the brass helmet. */
function drawDiver(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  d: Diver,
  T: number,
): void {
  const pitch = Math.max(-0.9, Math.min(0.9, Math.atan2(d.vy, Math.abs(d.vx) + 20)));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(d.face, 1);
  ctx.rotate(pitch);
  ctx.lineCap = 'round';
  const k = s;
  const kick = Math.sin(d.kick * 2);
  // Legs and flippers, behind.
  ctx.strokeStyle = '#2B3E58';
  ctx.lineWidth = 4 * k;
  for (const off of [kick, -kick]) {
    ctx.beginPath();
    ctx.moveTo(-6 * k, 1 * k);
    ctx.lineTo(-16 * k, (2 + off * 3) * k);
    ctx.stroke();
    ctx.fillStyle = '#F2B233';
    ctx.beginPath();
    ctx.moveTo(-16 * k, (2 + off * 3) * k);
    ctx.lineTo(-25 * k, (0 + off * 5) * k);
    ctx.lineTo(-24 * k, (5 + off * 5) * k);
    ctx.closePath();
    ctx.fill();
  }
  // The tank on the back.
  ctx.fillStyle = '#C9CED6';
  ctx.beginPath();
  ctx.ellipse(-3 * k, -6 * k, 8 * k, 3 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  // The body.
  ctx.fillStyle = '#3A5F86';
  ctx.beginPath();
  ctx.ellipse(-1 * k, 0, 9 * k, 4.6 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  // An arm out ahead.
  ctx.strokeStyle = '#3A5F86';
  ctx.lineWidth = 3 * k;
  ctx.beginPath();
  ctx.moveTo(4 * k, 1 * k);
  ctx.lineTo(13 * k, (3 + Math.sin(T * 3) * 1.5) * k);
  ctx.stroke();
  // The brass helmet with its glass port, looking ahead.
  ctx.fillStyle = '#C9A15A';
  ctx.beginPath();
  ctx.arc(10 * k, -2 * k, 6.5 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9FD8E8';
  ctx.beginPath();
  ctx.arc(12.5 * k, -2 * k, 3.4 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8A6A33';
  ctx.lineWidth = 1.2 * k;
  ctx.stroke();
  ctx.restore();
}

/** The boat's underside at the surface over where the diver went in, and a short rope down. */
function drawHullBelow(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  hull: string,
  trim: string,
  T: number,
): void {
  const bob = Math.sin(T * 2.1) * 1.5 * s;
  // The waterline, catching the light.
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  for (let x = 0; x <= TW; x += 20) {
    const yy = Y(Math.sin(x * 0.05 + T * 2) * 2);
    if (x === 0) ctx.moveTo(X(x), yy);
    else ctx.lineTo(X(x), yy);
  }
  ctx.stroke();
  const cx = X(ENTRY);
  const cy = Y(0) + bob;
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(cx - 60 * s, cy - 6 * s);
  ctx.lineTo(cx + 66 * s, cy - 6 * s);
  ctx.quadraticCurveTo(cx + 52 * s, cy + 16 * s, cx + 20 * s, cy + 18 * s);
  ctx.lineTo(cx - 48 * s, cy + 16 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = trim;
  ctx.fillRect(cx - 60 * s, cy - 9 * s, 126 * s, 3 * s);
  ctx.strokeStyle = 'rgba(230,220,190,.7)';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 20 * s, cy + 16 * s);
  ctx.lineTo(cx - 24 * s, cy + 90 * s);
  ctx.stroke();
}

/** The air bubbles' spacing. */
const GAP = 15;

/** Air left as a row of bubbles, and the depth, at the top left under the coins. */
function drawGauge(ctx: CanvasRenderingContext2D, d: Diver, W: number): void {
  const x = 16;
  const y = 92;
  const n = 10;
  const left = d.air / AIR_MAX;
  const low = left <= AIR_LOW;
  ctx.fillStyle = 'rgba(8,24,36,.55)';
  ctx.beginPath();
  ctx.roundRect(x - 8, y - 16, GAP * n + 150, 32, 16);
  ctx.fill();
  ctx.font = '800 14px Grandstander, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = low ? '#FF8A7A' : '#FFF6E5';
  ctx.fillText('Air', x, y + 1);
  for (let i = 0; i < n; i++) {
    const full = left * n > i + 0.5;
    ctx.beginPath();
    ctx.arc(x + 38 + i * GAP, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = full ? (low ? '#FF8A7A' : '#9FE3F5') : 'rgba(255,255,255,.12)';
    ctx.fill();
  }
  const depth = `${Math.round(Math.max(0, d.y))} deep`;
  ctx.fillStyle = '#FFF6E5';
  ctx.textAlign = 'right';
  ctx.fillText(depth, Math.min(W - 16, x + GAP * n + 134), y + 1);
  ctx.textAlign = 'left';
}
