/**
 * The abyss, side on, while the figure dives (world/abyss.ts): the reef shelf under the blue hole, pale and sunlit on
 * top, with the hole through it; the hole's walls going down into the dark and widening until there are none; and
 * the floor of black sand, 1,000 metres down. And the cage on the boat's rope, the diver in it, a lamp on its roof.
 * And the Remoro, cruising over the floor, its silver glinting through the dark; and the attack nibbler hunting
 * there, its amber eye glinting.
 * On the sea: the blue hole itself, a round patch of the brightest blue with its small dark middle.
 */

import { type AttackNibbler, HUNTER_H, HUNTER_LEN } from '../entities/attacknibbler';
import type { DrawView } from '../entities/entity';
import { REMORO_H, REMORO_LEN, type Remoro } from '../entities/remoro';
import {
  ABYSS,
  ABYSS_ENTRY,
  ABYSS_SHELF_R,
  AD,
  AW,
  abyssFloor,
  CAGE_H,
  CAGE_W,
  HOLE,
  holeHalf,
  SHELF_BOT,
  SHELF_TOP,
  WALL_END,
} from '../world/abyss';
import { drawDeepFish } from './deepfish';

type Proj = (v: number) => number;

/** The shelf, the hole's walls and the floor, for what is on screen between top and bottom. */
export function drawAbyssScene(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  T: number,
  top: number,
  bottom: number,
): void {
  // The hole's walls, from the shelf's top down until the dark is open from side to side, either side of it.
  if (top < WALL_END + 40 && bottom > SHELF_TOP - 40) {
    const y0 = Math.max(SHELF_TOP, top - 40);
    const y1 = Math.min(WALL_END, bottom + 40);
    const rock = ctx.createLinearGradient(0, Y(SHELF_TOP), 0, Y(WALL_END));
    rock.addColorStop(0, '#2C6C78');
    rock.addColorStop(0.25, '#1C4656');
    rock.addColorStop(1, '#06121C');
    ctx.fillStyle = rock;
    for (const side of [-1, 1] as const) {
      const edge = side < 0 ? -300 : AW + 300;
      ctx.beginPath();
      ctx.moveTo(X(edge), Y(y0));
      for (let y = y0; y <= y1 + 0.1; y += 14) {
        const ragged =
          y > SHELF_BOT ? Math.sin(y * 0.03 + side) * 10 + Math.sin(y * 0.011) * 16 : 0;
        ctx.lineTo(X(ABYSS_ENTRY + side * (holeHalf(y) + ragged)), Y(y));
      }
      ctx.lineTo(X(edge), Y(y1));
      ctx.closePath();
      ctx.fill();
    }
  }
  // The shelf's sunlit top: pale sand and reef, either side of the hole, with a rim of light.
  if (top < SHELF_TOP + 40 && bottom > SHELF_TOP - 60) {
    ctx.fillStyle = '#E3D2A2';
    for (const side of [-1, 1] as const) {
      const a = ABYSS_ENTRY + side * HOLE;
      const b = side < 0 ? -300 : AW + 300;
      ctx.beginPath();
      ctx.moveTo(X(a), Y(SHELF_TOP + 10));
      for (let x = a; side < 0 ? x >= b : x <= b; x += side * 20)
        ctx.lineTo(X(x), Y(SHELF_TOP - 4 - Math.sin(x * 0.05) * 3 - Math.sin(x * 0.13 + 2) * 2));
      ctx.lineTo(X(b), Y(SHELF_TOP + 18));
      ctx.lineTo(X(a), Y(SHELF_TOP + 18));
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2 * s;
    for (const side of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(X(ABYSS_ENTRY + side * HOLE), Y(SHELF_TOP + 8));
      ctx.lineTo(X(ABYSS_ENTRY + side * (HOLE + 6)), Y(SHELF_TOP - 3));
      ctx.stroke();
    }
  }
  // The floor: black sand, with dark stones half buried in it.
  if (bottom > AD - 200) {
    ctx.fillStyle = '#0A0E16';
    ctx.beginPath();
    ctx.moveTo(X(-300), Y(AD + 200));
    for (let x = -300; x <= AW + 300; x += 16)
      ctx.lineTo(X(x), Y(abyssFloor(Math.max(0, Math.min(AW, x)))));
    ctx.lineTo(X(AW + 300), Y(AD + 200));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#141B26';
    for (let i = 0; i < 9; i++) {
      const x = 60 + ((i * 263) % (AW - 120));
      const y = abyssFloor(x);
      ctx.beginPath();
      ctx.ellipse(X(x), Y(y + 2), (10 + (i % 3) * 7) * s, (5 + (i % 2) * 3) * s, 0, Math.PI, 0);
      ctx.fill();
    }
  }
  // Specks of light far off in the open dark, the deep's own stars.
  if (bottom > WALL_END && top < AD - 200) {
    for (let i = 0; i < 26; i++) {
      const x = (i * 211.7) % AW;
      const y = WALL_END + ((i * 389.3) % (AD - WALL_END - 300));
      if (y < top - 10 || y > bottom + 10) continue;
      const tw = 0.3 + 0.3 * Math.sin(T * 1.3 + i);
      ctx.fillStyle = `rgba(150,220,255,${tw})`;
      ctx.beginPath();
      ctx.arc(X(x), Y(y), 1.4 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The boat's rope down to the cage's roof. */
export function drawCageRope(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  cage: { x: number; y: number },
): void {
  ctx.strokeStyle = 'rgba(230,220,190,.75)';
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(X(cage.x), Y(16));
  ctx.lineTo(X(cage.x), Y(cage.y - CAGE_H / 2));
  ctx.stroke();
}

/** The cage behind the diver: its back bars, its roof and floor, and the lamp on its roof. */
export function drawCageBack(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  cage: { x: number; y: number },
): void {
  const l = X(cage.x - CAGE_W / 2);
  const r = X(cage.x + CAGE_W / 2);
  const t = Y(cage.y - CAGE_H / 2);
  const b = Y(cage.y + CAGE_H / 2);
  ctx.fillStyle = 'rgba(20,30,40,.25)';
  ctx.fillRect(l, t, r - l, b - t);
  ctx.strokeStyle = '#6E7A80';
  ctx.lineWidth = 1.2 * s;
  for (let i = 1; i < 6; i++) {
    const x = l + ((r - l) * i) / 6;
    ctx.beginPath();
    ctx.moveTo(x, t);
    ctx.lineTo(x, b);
    ctx.stroke();
  }
  ctx.fillStyle = '#A8B2B6';
  ctx.fillRect(l - 2 * s, t - 3 * s, r - l + 4 * s, 4 * s);
  ctx.fillRect(l - 2 * s, b - 1 * s, r - l + 4 * s, 4 * s);
  // The lamp on its roof.
  ctx.fillStyle = '#FFE9A8';
  ctx.beginPath();
  ctx.arc(X(cage.x), t - 4 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** The cage's front: its corner posts and bars over the diver, and its open door once it is down. */
export function drawCageFront(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  cage: { x: number; y: number; go: 'down' | 'wait' | 'up' },
): void {
  const l = X(cage.x - CAGE_W / 2);
  const r = X(cage.x + CAGE_W / 2);
  const t = Y(cage.y - CAGE_H / 2);
  const b = Y(cage.y + CAGE_H / 2);
  ctx.strokeStyle = '#C9D2D6';
  ctx.lineWidth = 2.2 * s;
  ctx.beginPath();
  ctx.moveTo(l, t);
  ctx.lineTo(l, b);
  ctx.moveTo(r, t);
  ctx.lineTo(r, b);
  ctx.stroke();
  ctx.lineWidth = 1.2 * s;
  // The door, on the right: shut riding, swung open on the floor.
  if (cage.go === 'wait') {
    ctx.strokeStyle = '#9AA6AC';
    ctx.beginPath();
    ctx.moveTo(r, t);
    ctx.lineTo(r + CAGE_W * 0.5 * s, t + 6 * s);
    ctx.lineTo(r + CAGE_W * 0.5 * s, b - 6 * s);
    ctx.lineTo(r, b);
    ctx.stroke();
  } else {
    for (let i = 1; i < 4; i++) {
      const x = l + ((r - l) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, t);
      ctx.lineTo(x, b);
      ctx.stroke();
    }
  }
}

/** The Remoro (entities/remoro.ts), under the dark: its silver body, beating faster as it darts, white a moment when
 * a spear strikes. */
export function drawRemoro(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  r: Remoro,
  T: number,
): void {
  if (!r.here) return;
  ctx.save();
  ctx.translate(X(r.x), Y(r.y));
  ctx.scale(r.face * s, s);
  drawDeepFish(ctx, 'remoro', REMORO_LEN, REMORO_H, r.t * (r.state === 'dart' ? 14 : 4), T);
  if (r.flash > 0) {
    ctx.globalAlpha = r.flash * 0.8;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(REMORO_LEN * 0.06, 0, REMORO_LEN * 0.4, REMORO_H * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** Its glint, over the dark: a faint silver line along its back and a gleam running along it, so that it shows far
 * off where the lamp does not reach; bright a moment when a spear strikes. */
export function drawRemoroGlint(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  r: Remoro,
  T: number,
): void {
  if (!r.here) return;
  const nx = r.x + r.face * REMORO_LEN * 0.42;
  const tx = r.x - r.face * REMORO_LEN * 0.3;
  const mx = (nx + tx) / 2;
  ctx.strokeStyle = `rgba(214,230,246,${0.22 + r.flash * 0.6})`;
  ctx.lineWidth = 2 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(X(tx), Y(r.y - REMORO_H * 0.18));
  ctx.quadraticCurveTo(X(mx), Y(r.y - REMORO_H * 0.5), X(nx), Y(r.y - REMORO_H * 0.14));
  ctx.stroke();
  // The gleam, nose to tail and again.
  const k = (T * 0.45) % 1;
  const gx = nx + (tx - nx) * k;
  const gy = r.y - REMORO_H * (0.16 + 0.24 * Math.sin(k * Math.PI));
  const g = ctx.createRadialGradient(X(gx), Y(gy), 0, X(gx), Y(gy), 12 * s);
  g.addColorStop(0, 'rgba(240,248,255,.7)');
  g.addColorStop(1, 'rgba(240,248,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(X(gx), Y(gy), 12 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** The attack nibbler (entities/attacknibbler.ts), under the dark: the kid's drawing, white a moment when speared. */
export function drawHunter(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  h: AttackNibbler,
  T: number,
): void {
  if (!h.here) return;
  ctx.save();
  ctx.translate(X(h.x), Y(h.y));
  ctx.scale(h.face * s, s);
  drawDeepFish(
    ctx,
    'attack',
    HUNTER_LEN,
    HUNTER_H,
    h.ph * (h.state === 'chase' || h.state === 'dart' ? 14 : 5),
    T,
  );
  if (h.flash > 0) {
    ctx.globalAlpha = h.flash * 0.8;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, 0, HUNTER_LEN * 0.4, HUNTER_H * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** Over the dark: its amber eye, and its teeth catching the light as it charges, so it can be seen coming. */
export function drawHunterGlow(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  h: AttackNibbler,
  T: number,
): void {
  if (!h.here) return;
  const ex = X(h.x + h.face * HUNTER_LEN * 0.22);
  const ey = Y(h.y - HUNTER_H * 0.22);
  const r = (h.state === 'chase' ? 10 : 7) * s;
  const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, r);
  g.addColorStop(0, `rgba(255,200,90,${0.75 + 0.2 * Math.sin(T * 4)})`);
  g.addColorStop(1, 'rgba(255,200,90,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ex, ey, r, 0, Math.PI * 2);
  ctx.fill();
  if (h.state === 'chase') {
    ctx.strokeStyle = 'rgba(255,251,239,.55)';
    ctx.lineWidth = 1.5 * s;
    const mx = X(h.x + h.face * HUNTER_LEN * 0.45);
    ctx.beginPath();
    ctx.moveTo(mx, Y(h.y - HUNTER_H * 0.24));
    ctx.lineTo(X(h.x + h.face * HUNTER_LEN * 0.2), Y(h.y));
    ctx.lineTo(mx, Y(h.y + HUNTER_H * 0.32));
    ctx.stroke();
  }
}

/** The blue hole on the sea: the bright reef shallows round it, its rim, and its small dark middle. */
export function drawAbyssMark(v: DrawView): void {
  const { ctx, T } = v;
  if (!v.onScreen(ABYSS.x, ABYSS.y, (ABYSS_SHELF_R + 60) * v.zoom)) return;
  v.isoEllipse(ABYSS.x, ABYSS.y, ABYSS_SHELF_R + 30);
  ctx.fillStyle = 'rgba(70,200,220,.35)';
  ctx.fill();
  v.isoEllipse(ABYSS.x, ABYSS.y, ABYSS_SHELF_R);
  ctx.fillStyle = '#58D3DE';
  ctx.fill();
  v.isoEllipse(ABYSS.x, ABYSS.y, ABYSS.r + 18 + Math.sin(T * 1.2) * 2);
  ctx.fillStyle = '#1E6FA8';
  ctx.fill();
  v.isoEllipse(ABYSS.x, ABYSS.y, ABYSS.r);
  ctx.fillStyle = '#0A1E40';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 2 * v.zoom;
  v.isoEllipse(ABYSS.x, ABYSS.y, ABYSS_SHELF_R + 4 + Math.sin(T * 0.8) * 3);
  ctx.stroke();
}
