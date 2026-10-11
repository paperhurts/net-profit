/**
 * Under the ice floe, side on, behind the diver: the floe overhead, white on
 * top and blue underneath, hanging down in two ridges, the left with its cave
 * and the right with its tunnel, both cut back into the ice and glowing faintly
 * blue; bubbles trapped in the ice and cracks through it; light pouring down
 * through the hole and glowing faintly through the thin ice; and the dark stony
 * floor below. Over it all, the game draws what lies frozen in the ice behind a
 * skin of ice of its own (drawFrozen), the rope from the hole to the diver, and
 * the seals going by.
 */

import { drawSealDive } from '../entities/seal';
import {
  CAVES,
  ICE_LOOT,
  ICE_TOPY,
  ID,
  IHOLE,
  IHOLE_R,
  IW,
  iceFloor,
  iceUnder,
  swimmingSeals,
} from '../world/icedive';

type Proj = (v: number) => number;

const ICE_TOP = '#F4FAFD';
const ICE_SIDE = '#BFE0EC';
const ICE_DEEP = '#7FB7CC';
const CAVE_WATER = '#3E8CAB';
const FLOOR = '#2F3B44';
const STONE = '#46545E';

/** Everything of the scene under the ice but the water, the fish and the diver. */
export function drawIceDiveScene(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  T: number,
): void {
  // Light pouring down through the hole.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const shaft = ctx.createLinearGradient(0, Y(0), 0, Y(ID * 0.8));
  shaft.addColorStop(0, 'rgba(255,255,240,.28)');
  shaft.addColorStop(1, 'rgba(255,255,240,0)');
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.moveTo(X(IHOLE - IHOLE_R), Y(0));
  ctx.lineTo(X(IHOLE + IHOLE_R), Y(0));
  ctx.lineTo(X(IHOLE + IHOLE_R + 90 + Math.sin(T * 0.4) * 8), Y(ID * 0.8));
  ctx.lineTo(X(IHOLE - IHOLE_R - 90 + Math.sin(T * 0.4) * 8), Y(ID * 0.8));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // The floor: dark stones and gravel.
  ctx.fillStyle = FLOOR;
  ctx.beginPath();
  ctx.moveTo(X(-200), Y(ID + 600));
  for (let x = -200; x <= IW + 200; x += 16)
    ctx.lineTo(X(x), Y(iceFloor(Math.max(0, Math.min(IW, x)))));
  ctx.lineTo(X(IW + 200), Y(ID + 600));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = STONE;
  for (let i = 0; i < 18; i++) {
    const x = (i * 53 + 17) % IW;
    ctx.beginPath();
    ctx.ellipse(X(x), Y(iceFloor(x) + 2), (5 + (i % 4) * 3) * s, (3 + (i % 3)) * s, 0, Math.PI, 0);
    ctx.fill();
  }
  // The ice: either side of the hole, from its snowy top down to its underside and its ridges.
  const body = ctx.createLinearGradient(0, Y(ICE_TOPY), 0, Y(240));
  body.addColorStop(0, ICE_SIDE);
  body.addColorStop(1, ICE_DEEP);
  for (const [a, b] of [
    [-200, IHOLE - IHOLE_R],
    [IHOLE + IHOLE_R, IW + 200],
  ] as const) {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(X(a), Y(ICE_TOPY));
    ctx.lineTo(X(b), Y(ICE_TOPY));
    for (let x = b; x >= a; x -= 6) ctx.lineTo(X(x), Y(iceUnder(Math.max(0, Math.min(IW, x)))));
    ctx.closePath();
    ctx.fill();
    // Snow on top, and the pale underside's edge.
    ctx.fillStyle = ICE_TOP;
    ctx.fillRect(X(a), Y(ICE_TOPY - 6), (b - a) * s, 7 * s);
    ctx.strokeStyle = 'rgba(230,248,255,.7)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    for (let x = a; x <= b; x += 6) {
      const y = Y(iceUnder(Math.max(0, Math.min(IW, x))));
      if (x === a) ctx.moveTo(X(x), y);
      else ctx.lineTo(X(x), y);
    }
    ctx.stroke();
  }
  // The hole's sides.
  ctx.fillStyle = ICE_TOP;
  ctx.fillRect(X(IHOLE - IHOLE_R - 4), Y(ICE_TOPY - 6), 4 * s, (iceUnder(IHOLE - IHOLE_R) + 6) * s);
  ctx.fillRect(X(IHOLE + IHOLE_R), Y(ICE_TOPY - 6), 4 * s, (iceUnder(IHOLE + IHOLE_R) + 6) * s);
  // The cave and the tunnel, cut back into the ice, a cold blue glow inside.
  for (const c of CAVES) {
    const g = ctx.createLinearGradient(X(c.x0), 0, X(c.x1), 0);
    g.addColorStop(0, CAVE_WATER);
    g.addColorStop(0.5, '#4E9DBB');
    g.addColorStop(1, CAVE_WATER);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(X(c.x0), Y(c.y0), (c.x1 - c.x0) * s, (c.y1 - c.y0) * s, 14 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,245,255,.55)';
    ctx.lineWidth = 2 * s;
    ctx.stroke();
    // Icicles hanging from its roof.
    ctx.fillStyle = 'rgba(235,250,255,.85)';
    for (let x = c.x0 + 14; x < c.x1 - 10; x += 22) {
      const h = 6 + ((x * 13) % 9);
      ctx.beginPath();
      ctx.moveTo(X(x - 3), Y(c.y0 + 2));
      ctx.lineTo(X(x + 3), Y(c.y0 + 2));
      ctx.lineTo(X(x), Y(c.y0 + 2 + h));
      ctx.closePath();
      ctx.fill();
    }
  }
  // Bubbles caught in the ice, and cracks through it.
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (let i = 0; i < 40; i++) {
    const x = (i * 97 + 31) % IW;
    if (Math.abs(x - IHOLE) < IHOLE_R + 6) continue;
    const y = ICE_TOPY + 6 + ((i * 37) % Math.max(8, iceUnder(x) - ICE_TOPY - 12));
    if (CAVES.some((c) => x > c.x0 && x < c.x1 && y > c.y0 && y < c.y1)) continue;
    ctx.beginPath();
    ctx.arc(X(x), Y(y), (1 + (i % 3) * 0.6) * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1 * s;
  for (const [x, y, dx, dy] of [
    [80, 6, 30, 22],
    [300, 4, -20, 18],
    [470, 6, 26, 14],
    [700, 4, -24, 20],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(X(x), Y(y));
    ctx.lineTo(X(x + dx * 0.5), Y(y + dy * 0.6));
    ctx.lineTo(X(x + dx), Y(y + dy));
    ctx.stroke();
  }
}

/** The things frozen in the ice, each behind a skin of ice until it is chipped out. */
export function drawFrozen(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  T: number,
  found: (i: number) => boolean,
): void {
  ICE_LOOT.forEach((l, i) => {
    if (found(i)) return;
    ctx.fillStyle = 'rgba(214,240,250,.42)';
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.roundRect(X(l.x - 17), Y(l.y - 17), 34 * s, 30 * s, 5 * s);
    ctx.fill();
    ctx.stroke();
    // A glint along its face, now and then.
    const k = (T * 0.6 + i * 0.37) % 1;
    if (k < 0.25) {
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k * 4)})`;
      ctx.beginPath();
      ctx.moveTo(X(l.x - 14 + k * 80), Y(l.y - 14));
      ctx.lineTo(X(l.x - 22 + k * 80), Y(l.y + 10));
      ctx.stroke();
    }
  });
}

/** The rope from the hole down to the diver, sagging a little. */
export function drawRope(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  d: { x: number; y: number },
): void {
  ctx.strokeStyle = 'rgba(242,194,48,.9)';
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(X(IHOLE), Y(ICE_TOPY));
  const mx = (IHOLE + d.x) / 2;
  const my = Math.max(ICE_TOPY, d.y) + 30;
  ctx.quadraticCurveTo(X(mx), Y(my), X(d.x), Y(d.y));
  ctx.stroke();
}

/** The seals swimming loops under the ice. */
export function drawIceSeals(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  T: number,
): void {
  for (const p of swimmingSeals(T)) drawSealDive(ctx, X(p.x), Y(p.y), p.dir, T, 1.2 * s);
}
