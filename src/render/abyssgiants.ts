/**
 * The giants passing the abyss's cage (entities/abyssgiants.ts), side on, each as it looks at sea: the leviathan a
 * long dark serpent with spines down its back and cyan lights down its side; the Reaper his own drawing, blue and
 * yellow, legs paddling; the Cthuluviathan its green octopus dome leading, bat wings on top and tentacles streaming
 * behind; Cthulhu his own drawing, hanging in the water; and the gulpers black eels that are nearly all mouth, a pink
 * light on each tail. Their bodies go under the dark, so the lamp shows them only close; over the dark go a faint
 * edge of each, enough to see something huge go by, and their eyes and lights, flaring in a lunge's warning.
 */

import { K } from '../core/iso';
import {
  CTHULHU_FADE,
  CTHULHU_TALL,
  GIANT_LEN,
  type Giant,
  type Giants,
} from '../entities/abyssgiants';
import { drawCthulhu } from '../entities/cthulhu';
import type { DrawView } from '../entities/entity';
import { drawReaperBody } from './reaper';

type Proj = (v: number) => number;
type Mode = 'body' | 'glow';

const EDGE = 'rgba(160,196,218,.17)';
const FLARE = '#FF7A3D';

/** A view for the sea's own drawings, side on at a screen point, as the lagoon dive's friends are drawn. */
function sideView(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  zoom: number,
  T: number,
): DrawView {
  return {
    ctx,
    T,
    zoom,
    px: (x: number, y: number) => sx + (x - y) * K * zoom,
    py: (x: number, y: number, z = 0) => sy + (x + y) * K * 0.5 * zoom - z * zoom,
  } as unknown as DrawView;
}

/** Into its own frame: head at the origin facing +x, the right way up whichever way it swims. */
function frame(ctx: CanvasRenderingContext2D, X: Proj, Y: Proj, s: number, g: Giant): void {
  ctx.translate(X(g.x), Y(g.y));
  ctx.rotate(g.a);
  ctx.scale(s, Math.cos(g.a) < 0 ? -s : s);
}

const warns = (g: Giant): boolean => g.state === 'tell' || g.state === 'lunge';

/** An eye that glows through the dark: a halo and a bright middle. */
function glowEye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
  g.addColorStop(0, c);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A long waving body from the head back: its middle line, and the outline round it, w(k) thick at k of the way. */
function spine(L: number, n: number, x0: number, wave: number, ph: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pts.push([-(x0 + (L - x0) * k), Math.sin(ph * 2.4 - k * 6) * wave * k]);
  }
  return pts;
}
function outline(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  w: (k: number) => number,
  under = 1,
): void {
  const n = pts.length - 1;
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y - w(0));
    else ctx.lineTo(x, y - w(i / n));
  });
  for (let i = n; i >= 0; i--) {
    const [x, y] = pts[i] as [number, number];
    ctx.lineTo(x, y + w(i / n) * under);
  }
  ctx.closePath();
}

function leviathan(ctx: CanvasRenderingContext2D, g: Giant, mode: Mode, T: number): void {
  const L = GIANT_LEN.leviathan;
  const pts = spine(L, 24, 0, 22, g.ph);
  const w = (k: number) => (k < 0.1 ? 18 + 220 * k : 40 * (1 - k) ** 0.7 + 4);
  const open = warns(g) ? 1 : 0.15;
  if (mode === 'body') {
    ctx.fillStyle = '#2E4558';
    for (let i = 3; i < 20; i += 2) {
      const [x, y] = pts[i] as [number, number];
      const k = i / 24;
      ctx.beginPath();
      ctx.moveTo(x - 9, y - w(k) + 2);
      ctx.lineTo(x - 2, y - w(k) - 18 * (1 - k) - 5);
      ctx.lineTo(x + 7, y - w(k) + 2);
      ctx.closePath();
      ctx.fill();
    }
    outline(ctx, pts, w, 0.85);
    ctx.fillStyle = '#1A2C3A';
    ctx.fill();
    ctx.strokeStyle = '#3E5868';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // The jaw, dropping open in the warning, teeth along it.
    ctx.fillStyle = '#0A1018';
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(-72, 14);
    ctx.lineTo(-6, 6 + 36 * open);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#E8F1F2';
    for (let i = 0; i < 6; i++) {
      const x = -8 - i * 10;
      ctx.beginPath();
      ctx.moveTo(x, 5 + i * 1.4);
      ctx.lineTo(x - 3, 13 + i * 1.4);
      ctx.lineTo(x - 6, 5 + i * 1.4);
      ctx.fill();
    }
    return;
  }
  outline(ctx, pts, w, 0.85);
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 3; i < 22; i += 2) {
    const [x, y] = pts[i] as [number, number];
    const p = 0.5 + 0.5 * Math.sin(T * 2 + i * 0.7);
    ctx.fillStyle = `rgba(124,245,230,${0.35 + p * 0.5})`;
    ctx.beginPath();
    ctx.arc(x, y + 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  glowEye(ctx, -40, -12, 4.5, warns(g) ? FLARE : '#7CF5E6');
}

function cthuluviathan(ctx: CanvasRenderingContext2D, g: Giant, mode: Mode): void {
  const L = GIANT_LEN.cthuluviathan;
  const flap = Math.sin(g.ph * 2.2) * 16;
  // Tentacles streaming back from the dome, waving.
  const arm = (y0: number, i: number): [number, number][] => {
    const pts: [number, number][] = [];
    for (let j = 0; j <= 10; j++) {
      const k = j / 10;
      pts.push([
        -150 - (L - 150) * k,
        y0 * (1 + k * 0.6) + Math.sin(g.ph * 3 - k * 5 + i) * 18 * k,
      ]);
    }
    return pts;
  };
  const ys = [-30, -15, 0, 14, 28, 42];
  if (mode === 'body') {
    ctx.strokeStyle = '#2F6E4E';
    ctx.lineCap = 'round';
    ys.forEach((y0, i) => {
      const pts = arm(y0, i);
      for (let j = 1; j < pts.length; j++) {
        const [ax, ay] = pts[j - 1] as [number, number];
        const [bx, by] = pts[j] as [number, number];
        ctx.lineWidth = 16 * (1 - j / pts.length) + 2;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    });
    // The beard, hanging under its face.
    ctx.lineWidth = 6;
    for (let i = 0; i < 5; i++) {
      const bx = -18 - i * 14;
      const sw = Math.sin(g.ph * 3 + i) * 10;
      ctx.beginPath();
      ctx.moveTo(bx, 44);
      ctx.quadraticCurveTo(bx - 10 + sw, 80, bx - 34 - sw, 110);
      ctx.stroke();
    }
    // A bat wing on top.
    ctx.fillStyle = '#1E5A3E';
    ctx.beginPath();
    ctx.moveTo(-70, -52);
    ctx.lineTo(-150, -150 - flap);
    ctx.lineTo(-172, -96 - flap * 0.4);
    ctx.lineTo(-214, -112 - flap);
    ctx.lineTo(-204, -62);
    ctx.lineTo(-132, -42);
    ctx.closePath();
    ctx.fill();
    // The dome, leading.
    ctx.fillStyle = '#2F7A52';
    ctx.beginPath();
    ctx.ellipse(-80, 0, 86, 62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4A9A6C';
    ctx.beginPath();
    ctx.ellipse(-62, -28, 40, 16, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C8F56A';
    ctx.beginPath();
    ctx.ellipse(-30, -8, 10, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0B1F18';
    ctx.fillRect(-31.5, -13, 3, 10);
    return;
  }
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-80, 0, 86, 62, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (const [i, y0] of [-30, 42].entries()) {
    const pts = arm(y0, i * 5);
    ctx.beginPath();
    pts.forEach(([x, y], j) => {
      if (j) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.stroke();
  }
  glowEye(ctx, -30, -8, 5, warns(g) ? FLARE : '#B6FF7A');
}

/** One gulper, head at (ox, oy) in the frame. */
function gulper(
  ctx: CanvasRenderingContext2D,
  g: Giant,
  mode: Mode,
  T: number,
  ox: number,
  oy: number,
  ph: number,
): void {
  const L = GIANT_LEN.gulper;
  // The jaws hinge just behind its little head, HINGE back from their tips, and gape forward: the upper jaw thin, the
  // lower a great baggy pouch.
  const HINGE = 50;
  const hx = ox - HINGE;
  const pts = spine(L, 16, HINGE, 14, ph).map(([x, y]) => [x + ox, y + oy] as [number, number]);
  const w = (k: number) => 11 * (1 - k) + 1.5;
  const open = warns(g) ? 1 : 0.45 + 0.2 * Math.sin(ph * 1.7);
  const up: [number, number] = [ox, oy - 14 - open * 12];
  const down: [number, number] = [ox - 4, oy + 18 + open * 26];
  if (mode === 'body') {
    outline(ctx, pts, w);
    ctx.fillStyle = '#18222C';
    ctx.fill();
    ctx.strokeStyle = '#3A4C5C';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Inside the mouth, dark red.
    ctx.fillStyle = '#5A1F2E';
    ctx.beginPath();
    ctx.moveTo(hx, oy - 2);
    ctx.lineTo(up[0], up[1] + 4);
    ctx.quadraticCurveTo(ox + 6, oy + open * 8, down[0], down[1] - 4);
    ctx.closePath();
    ctx.fill();
    // The jaws: the upper a thin rod, the lower a pouch slung under, both black.
    ctx.strokeStyle = '#18222C';
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(hx, oy - 4);
    ctx.lineTo(up[0], up[1]);
    ctx.stroke();
    ctx.fillStyle = '#18222C';
    ctx.beginPath();
    ctx.moveTo(hx, oy + 2);
    ctx.quadraticCurveTo(hx + 4, down[1] + 10, down[0], down[1]);
    ctx.quadraticCurveTo(hx + 20, down[1] - 8, hx + 4, oy + 4);
    ctx.closePath();
    ctx.fill();
    // Needle teeth along both jaws, pointing in.
    ctx.fillStyle = '#F4F1E6';
    for (let i = 1; i < 6; i++) {
      const k = i / 6;
      const ux = hx + (up[0] - hx) * k;
      const uy = oy - 4 + (up[1] - oy + 4) * k;
      ctx.beginPath();
      ctx.moveTo(ux - 1.5, uy);
      ctx.lineTo(ux, uy + 6);
      ctx.lineTo(ux + 1.5, uy);
      ctx.fill();
      const dx = hx + 4 + (down[0] - hx - 4) * k;
      const dy = oy + 4 + (down[1] - oy - 4) * k;
      ctx.beginPath();
      ctx.moveTo(dx - 1.5, dy);
      ctx.lineTo(dx, dy - 6);
      ctx.lineTo(dx + 1.5, dy);
      ctx.fill();
    }
    // Its little head behind the hinge.
    ctx.fillStyle = '#18222C';
    ctx.beginPath();
    ctx.ellipse(hx - 4, oy - 1, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  outline(ctx, pts, w);
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx, oy - 4);
  ctx.lineTo(up[0], up[1]);
  ctx.moveTo(hx, oy + 2);
  ctx.quadraticCurveTo(hx + 4, down[1] + 10, down[0], down[1]);
  ctx.stroke();
  const [tx, ty] = pts[pts.length - 1] as [number, number];
  glowEye(ctx, tx, ty, 3 + Math.sin(T * 3 + ph) * 0.8, '#FF6FB0');
  glowEye(ctx, hx - 2, oy - 4, 2, warns(g) ? FLARE : '#D8E6EE');
}

/** The Reaper's middle, from his head: his own drawing takes the middle of his spine. */
function reaperMid(g: Giant): [number, number] {
  const half = GIANT_LEN.reaper / 2;
  return [g.x - Math.cos(g.a) * half, g.y - Math.sin(g.a) * half];
}

/** How much bigger Cthulhu's own drawing is drawn, to stand this tall: it is 96 to the top of his wings at 1.5. */
const CTHULHU_ZOOM = CTHULHU_TALL / 96 / 1.5;

/** Their bodies, under the dark. */
export function drawGiants(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  giants: Giants,
  T: number,
): void {
  for (const g of giants.list) {
    if (g.state === 'wait' || g.state === 'gone') continue;
    if (g.kind === 'reaper') {
      const [mx, my] = reaperMid(g);
      const right = Math.cos(g.a) >= 0;
      const pitch = Math.max(-0.8, Math.min(0.8, Math.asin(-Math.sin(g.a))));
      drawReaperBody(
        sideView(ctx, X(mx), Y(my), s, T),
        0,
        0,
        0,
        right ? -Math.PI / 4 : (3 * Math.PI) / 4,
        pitch,
        {
          T: g.ph,
          len: GIANT_LEN.reaper,
          legs: 'swim',
          mouth: warns(g) ? 0.9 : 0.1,
          angry: warns(g),
        },
      );
      continue;
    }
    if (g.kind === 'cthulhu') {
      const sink = g.state === 'back' ? Math.min(1, g.t / CTHULHU_FADE) : 0;
      drawCthulhu(sideView(ctx, X(g.x), Y(g.y), s * CTHULHU_ZOOM, T), 0, 0, g.ph, 0, g.glare, sink);
      continue;
    }
    ctx.save();
    frame(ctx, X, Y, s, g);
    if (g.kind === 'leviathan') leviathan(ctx, g, 'body', T);
    else if (g.kind === 'cthuluviathan') cthuluviathan(ctx, g, 'body');
    else {
      gulper(ctx, g, 'body', T, 0, 0, g.ph);
      gulper(ctx, g, 'body', T, -150, 70, g.ph + 1.3);
    }
    ctx.restore();
  }
}

/** What shows of them over the dark: a faint edge, and their eyes and lights. */
export function drawGiantGlow(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  giants: Giants,
  T: number,
): void {
  for (const g of giants.list) {
    if (g.state === 'wait' || g.state === 'gone') continue;
    if (g.kind === 'reaper') {
      // His yellow eye, a third of the way back from his snout and up.
      const [mx, my] = reaperMid(g);
      const ex = mx + Math.cos(g.a) * GIANT_LEN.reaper * 0.15;
      const ey = my + Math.sin(g.a) * GIANT_LEN.reaper * 0.15 - 16;
      glowEye(ctx, X(ex), Y(ey), 5 * s, warns(g) ? '#FF8A2A' : '#F2C230');
      continue;
    }
    if (g.kind === 'cthulhu') {
      // As his drawing sinks him back into the dark, his eyes go down with him and dim.
      const Z = s * CTHULHU_ZOOM * 1.5;
      const sink = g.state === 'back' ? Math.min(1, g.t / CTHULHU_FADE) : 0;
      ctx.save();
      ctx.globalAlpha = 1 - sink;
      for (const side of [-1, 1])
        glowEye(
          ctx,
          X(g.x) + side * 8 * Z,
          Y(g.y) + (sink * 60 - 70) * Z,
          3.2 * Z,
          g.glare ? '#FF5A3C' : '#B8FF7A',
        );
      ctx.restore();
      continue;
    }
    ctx.save();
    frame(ctx, X, Y, s, g);
    if (g.kind === 'leviathan') leviathan(ctx, g, 'glow', T);
    else if (g.kind === 'cthuluviathan') cthuluviathan(ctx, g, 'glow');
    else {
      gulper(ctx, g, 'glow', T, 0, 0, g.ph);
      gulper(ctx, g, 'glow', T, -150, 70, g.ph + 1.3);
    }
    ctx.restore();
  }
}
