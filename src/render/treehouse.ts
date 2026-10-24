/**
 * The Treehouse Climb (entities/treehouse.ts), the whole screen, side on: inside the pirates' great tree, its huge trunk
 * up the middle and clumps of leaves round the edges, sky between them. The planks are beams lashed across it, the
 * ladders rope ones, the gorilla up top with its stack of barrels beside it, and the hut with the door on the ledge at
 * the very top. At the very top of the tree (the Crow's Nest), out in the open over the crown, the sea far below: the
 * decks held by their pegs, the monkeys, and the gorilla up in the crow's nest with the pirates' chest, until it gives
 * way. The climber, in your shirt, hair and skin. Over it all: the tries left, the clock and the coins.
 *
 * The stage is scaled to the screen's width, or less, and, where it is too tall for what is left of the screen above
 * the arrows, the view rides up and down with the climber.
 */

import { clamp } from '../core/math';
import { TRICORN } from '../data/look';
import { clockOf } from '../data/slalom';
import { BUCKET_W, HOLE, type Plank, plankY } from '../data/treehouse';
import {
  BARREL_R,
  type Barrel,
  type Climb,
  DOWN_T,
  HANDS,
  type Monkey,
  NUT_R,
  PIN_T,
  PIN_Y,
} from '../entities/treehouse';
import type { SkierLook } from './slalom';

/** A word over the climb for a moment: a barrel jumped, one smashed, a try lost. */
export type ClimbPop = { text: string; colour: string; t: number };
export const CLIMB_POP_T = 1.2;
/** The room kept clear at the bottom of the screen for the arrows and the jump button. */
export const PAD_ROOM = 172;
/** How far below the bottom plank, and above the ledge, the view goes. */
const UNDER = 16;
const OVER = 40;

const FONT = 'Grandstander, ui-rounded, system-ui, sans-serif';
const INK = '#2A1E12';
const BARK = '#7A5634';
const BARK_DARK = '#6B4A2C';
const BARK_LIT = '#8F6A44';
const PLANK = '#A97A48';
const PLANK_LIT = '#C29257';
const PLANK_DARK = '#6B4A2C';
const ROPE = '#D8C49A';
const RUNG = '#B08A55';
const WOOD = '#9A6534';
const HOOP = '#4A2E16';
const LEAVES = ['#3E8A45', '#4A9A4E', '#57A85A', '#64B465'] as const;

/** Where the stage is on the screen: how big a unit is, and the screen point for a point on the stage. */
export type ClimbFrame = {
  k: number;
  X: (x: number) => number;
  Y: (y: number) => number;
  /** The screen's band the stage is shown in. */
  top: number;
  bottom: number;
};
/** The frame for a stage on a screen this size, the view centred near this height up it (where it scrolls). */
export function climbFrame(
  W: number,
  H: number,
  top: number,
  c: Climb,
  cam: number,
  room = PAD_ROOM,
): ClimbFrame {
  const s = c.stage;
  const vTop = top + 54;
  const vBottom = Math.max(vTop + 120, H - room);
  const V = vBottom - vTop;
  const tall = s.h + UNDER + OVER;
  // As big as the width allows, so long as half the stage and more is in view at once.
  const k = Math.max(0.5, Math.min((W - 16) / s.w, (V / tall) * 1.5));
  const ox = (W - s.w * k) / 2;
  // The lowest stage height in view: all of it, centred, if it fits; else riding with the climber.
  const seen = V / k;
  const lo =
    seen >= tall ? -UNDER - (seen - tall) / 2 : clamp(cam - seen * 0.38, -UNDER, s.h + OVER - seen);
  return { k, X: (x) => ox + x * k, Y: (y) => vBottom - (y - lo) * k, top: vTop, bottom: vBottom };
}

/** A number from a seed, the same every frame: for where the leaves and the bark's grooves go. */
function hash(i: number, j: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** What goes round the climb: the screen's top under the way out, the words over it, the stage's best time, the height
 * the view rides at (eased, so it does not bob with each jump), and the room kept for the arrows at the bottom. */
export type ClimbScreen = {
  top: number;
  pops: readonly ClimbPop[];
  best: number | undefined;
  cam: number;
  room: number;
  /** The last line of the card at the top: on up to the next stage, or that it is still being built. */
  after: string;
};

export function drawClimb(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  c: Climb,
  look: SkierLook,
  T: number,
  o: Partial<ClimbScreen> = {},
): void {
  const top = o.top ?? 64;
  const f = climbFrame(W, H, top, c, o.cam ?? c.y, o.room);
  const { k, X, Y } = f;
  const s = c.stage;
  // The sky through the leaves.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#8CC8EE');
  sky.addColorStop(1, '#E4F2D6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, f.top - 6, W, f.bottom - f.top + 6);
  ctx.clip();
  if (s.nest) drawCrown(ctx, W, f, s.w, s.h, T);
  else drawTree(ctx, W, f, s.w, s.h, T);
  for (const L of s.ladders)
    drawLadder(ctx, f, L.x, c.surfaceY(L.lo, L.x), c.surfaceY(L.lo + 1, L.x));
  drawLifts(ctx, f, c);
  s.planks.forEach((p, i) => {
    if (i === s.nest?.plank) return;
    if (p.sag) drawBridge(ctx, f, c, i);
    else if (p.lever !== undefined) drawDrawbridge(ctx, f, c, i);
    else if (c.pegs.length) drawPegged(ctx, f, c, i, T);
    else drawPlank(ctx, f, p);
  });
  drawLevers(ctx, f, c);
  const ledge = plankOf(c, s.planks.length - 1);
  if (s.door !== undefined) drawHut(ctx, f, s.door, ledge.y0, c.phase === 'clear', T);
  if (s.nest) drawNest(ctx, f, c, T);
  if (s.gorilla) {
    drawStack(ctx, f, s.gorilla.x - 18, plankY(plankOf(c, s.gorilla.plank), s.gorilla.x - 18));
    drawGorilla(ctx, f, c, T);
  }
  drawRopes(ctx, f, c);
  drawNuts(ctx, f, c, T);
  for (const p of c.pins) {
    if (p.taken) continue;
    const y = plankY(plankOf(c, p.plank), p.x) + PIN_Y + Math.sin(T * 3 + p.x) * 1.5;
    // A soft light round it, to pick it out against the bark.
    ctx.fillStyle = 'rgba(255,240,180,.35)';
    ctx.beginPath();
    ctx.arc(X(p.x), Y(y + 1), 10 * k, 0, Math.PI * 2);
    ctx.fill();
    drawPin(ctx, X(p.x), Y(y), k * 1.5, -0.5, T, true);
  }
  for (const b of c.barrels) drawBarrel(ctx, f, b);
  for (const m of c.monkeys) drawMonkey(ctx, f, m, T);
  drawClimber(ctx, f, c, look, T);
  if (s.nest) drawGivenWay(ctx, f, c, T);
  ctx.restore();
  drawBars(ctx, W, c, top);
  drawPops(ctx, W, f, o.pops ?? []);
  if (c.howTo) drawHowTo(ctx, W, H, c);
  else if (c.phase === 'ready' || (c.phase === 'climb' && c.t < 0.8)) drawReady(ctx, W, f, c);
  if (c.phase === 'clear' && c.clearT > (s.nest ? NEST_CARD_T : 1.1))
    drawClear(ctx, W, H, c, o.best, o.after ?? '');
}

const plankOf = (c: Climb, i: number): Plank => c.stage.planks[i] as Plank;

/** The trunk up the middle, its roots over the grass at the bottom, and the leaves round the edges. */
function drawTree(
  ctx: CanvasRenderingContext2D,
  W: number,
  f: ClimbFrame,
  w: number,
  h: number,
  T: number,
): void {
  const { k, X, Y } = f;
  // Leaves far behind, all down both sides and over the top, swaying a little.
  for (let i = 0; i < 30; i++) {
    const side = i % 2 ? 1 : -1;
    const y = -40 + Math.floor(i / 2) * 36 + hash(i, 1) * 20;
    const edge = side < 0 ? -10 - hash(i, 2) * 30 : w + 10 + hash(i, 2) * 30;
    const r = 34 + hash(i, 3) * 22;
    ctx.fillStyle = LEAVES[Math.floor(hash(i, 4) * 3)] as string;
    ctx.beginPath();
    ctx.arc(X(edge) + Math.sin(T * 0.6 + i) * 1.2 * k, Y(y), r * k, 0, Math.PI * 2);
    ctx.fill();
  }
  // Out past the stage's sides on a wide screen, the rest of the crown.
  if (X(0) > 30) {
    for (let col = 0; X(-40 - col * 44) > -60 || X(w + 40 + col * 44) < W + 60; col++)
      for (let y = -40; y < h + 80; y += 40)
        for (const x of [-40 - col * 44, w + 40 + col * 44]) {
          const n = hash(col * 31 + y, x);
          ctx.fillStyle = LEAVES[Math.floor(n * 3)] as string;
          ctx.beginPath();
          ctx.arc(
            X(x + (n - 0.5) * 16),
            Y(y + hash(y, col) * 20),
            (30 + n * 14) * k,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
  }
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = LEAVES[1 + (i % 3)] as string;
    ctx.beginPath();
    ctx.arc(
      X(-20 + i * 46),
      Y(h + 34 + hash(i, 5) * 16),
      (40 + hash(i, 6) * 16) * k,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // The trunk, wider at its foot.
  const mid = w / 2;
  ctx.fillStyle = BARK;
  ctx.beginPath();
  ctx.moveTo(X(mid - 76), Y(-UNDER));
  ctx.quadraticCurveTo(X(mid - 50), Y(30), X(mid - 50), Y(80));
  ctx.lineTo(X(mid - 44), Y(h + OVER));
  ctx.lineTo(X(mid + 44), Y(h + OVER));
  ctx.lineTo(X(mid + 50), Y(80));
  ctx.quadraticCurveTo(X(mid + 50), Y(30), X(mid + 76), Y(-UNDER));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = BARK_LIT;
  ctx.fillRect(X(mid - 30), Y(h + OVER), 12 * k, (h + OVER + UNDER) * k);
  // Grooves in the bark.
  ctx.strokeStyle = BARK_DARK;
  ctx.lineWidth = Math.max(1, 1.6 * k);
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x = mid - 40 + i * 10 + hash(i, 7) * 4;
    ctx.beginPath();
    ctx.moveTo(X(x), Y(-UNDER));
    for (let y = 0; y <= h + OVER; y += 30) ctx.lineTo(X(x + Math.sin(y * 0.05 + i) * 2.5), Y(y));
    ctx.stroke();
  }
  // A knot hole, with something's eyes in it.
  ctx.fillStyle = '#3A2A1A';
  ctx.beginPath();
  ctx.ellipse(X(mid + 18), Y(236), 7 * k, 9 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  if (Math.sin(T * 0.7) > -0.6) {
    ctx.fillStyle = '#F4E27A';
    for (const dx of [-2.4, 2.4]) {
      ctx.beginPath();
      ctx.arc(X(mid + 18 + dx), Y(237), 1.1 * k, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The grass at the foot, and the roots over it.
  ctx.fillStyle = '#5E9E4A';
  ctx.fillRect(0, Y(0), W, Math.max(0, f.bottom - Y(0)));
  ctx.fillStyle = '#4E8A3C';
  ctx.fillRect(0, Y(-6), W, Math.max(0, f.bottom - Y(-6)));
  ctx.strokeStyle = BARK_DARK;
  for (const [dx, reach] of [
    [-1, 60],
    [-1, 100],
    [1, 70],
    [1, 112],
  ] as const) {
    ctx.lineWidth = 6 * k;
    ctx.beginPath();
    ctx.moveTo(X(mid + dx * 40), Y(20));
    ctx.quadraticCurveTo(X(mid + dx * (reach - 20)), Y(4), X(mid + dx * reach), Y(-8));
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

/**
 * The very top of the great tree, out in the open: the sea far below to the horizon, the ninjas' isle out on it with
 * its snow peak, the crown's leaves under the bottom deck and a little way up the sides, and the trunk thinning to a
 * mast up through the decks to the crow's nest.
 */
function drawCrown(
  ctx: CanvasRenderingContext2D,
  W: number,
  f: ClimbFrame,
  w: number,
  h: number,
  T: number,
): void {
  const { k, X, Y } = f;
  const hz = f.top + (f.bottom - f.top) * 0.42;
  const sea = ctx.createLinearGradient(0, hz, 0, f.bottom);
  sea.addColorStop(0, '#7DBFDC');
  sea.addColorStop(1, '#3F8EB9');
  ctx.fillStyle = sea;
  ctx.fillRect(0, hz, W, f.bottom - hz + 6);
  // The ninjas' isle, far off.
  const ix = W * 0.74;
  ctx.fillStyle = '#8FA9B8';
  ctx.beginPath();
  ctx.moveTo(ix - 46, hz);
  ctx.quadraticCurveTo(ix - 20, hz - 6, ix - 8, hz - 18);
  ctx.lineTo(ix, hz - 24);
  ctx.lineTo(ix + 9, hz - 16);
  ctx.quadraticCurveTo(ix + 24, hz - 5, ix + 50, hz);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#F4F8FB';
  ctx.beginPath();
  ctx.moveTo(ix - 5, hz - 20);
  ctx.lineTo(ix, hz - 24);
  ctx.lineTo(ix + 5, hz - 20);
  ctx.lineTo(ix + 2, hz - 21);
  ctx.lineTo(ix - 1, hz - 19);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.fillRect(0, hz - 0.5, W, 1.5);
  // Glints on the water.
  for (let i = 0; i < 16; i++) {
    const gx = ((hash(i, 8) * W + T * 5 * (0.5 + hash(i, 9))) % (W + 20)) - 10;
    const gy = hz + 6 + hash(i, 10) * (f.bottom - hz - 8);
    ctx.fillStyle = `rgba(255,255,255,${0.2 + 0.2 * Math.sin(T * 2 + i * 1.7)})`;
    ctx.fillRect(gx, gy, 5 + hash(i, 11) * 9, 1.3);
  }
  // The trunk, thinning to a mast.
  const mid = w / 2;
  ctx.fillStyle = BARK;
  ctx.beginPath();
  ctx.moveTo(X(mid - 30), Y(-UNDER));
  ctx.lineTo(X(mid - 5), Y(h + OVER));
  ctx.lineTo(X(mid + 5), Y(h + OVER));
  ctx.lineTo(X(mid + 30), Y(-UNDER));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = BARK_DARK;
  ctx.lineWidth = Math.max(1, 1.4 * k);
  ctx.lineCap = 'round';
  for (const t of [-0.55, -0.1, 0.4]) {
    ctx.beginPath();
    ctx.moveTo(X(mid + t * 30), Y(-UNDER));
    ctx.lineTo(X(mid + t * 5), Y(h + OVER));
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // The crown's leaves: a bed of them under the bottom deck, and clumps a little way up each side.
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = LEAVES[i % 4] as string;
    ctx.beginPath();
    ctx.arc(
      X(-30 + i * 27 + hash(i, 12) * 10),
      Y(-14 + hash(i, 13) * 12),
      (24 + hash(i, 14) * 14) * k,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1;
    const y = 14 + Math.floor(i / 2) * 30 + hash(i, 15) * 12;
    ctx.fillStyle = LEAVES[Math.floor(hash(i, 16) * 3)] as string;
    ctx.beginPath();
    ctx.arc(
      X(side < 0 ? -18 - hash(i, 17) * 16 : w + 18 + hash(i, 17) * 16) + Math.sin(T * 0.6 + i) * k,
      Y(y),
      (26 - i * 2) * k,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

/** A deck held by pegs: the beam, broken where a peg has been knocked out; each peg still in with a glow round it to
 * pick it out; one just knocked out, flying. */
function drawPegged(
  ctx: CanvasRenderingContext2D,
  f: ClimbFrame,
  c: Climb,
  i: number,
  T: number,
): void {
  const p = plankOf(c, i);
  const holes = c.pegs
    .filter((g) => g.plank === i && g.out >= 0)
    .map((g) => g.x)
    .sort((a, b) => a - b);
  let x0 = p.x0;
  for (const hx of [...holes, Number.POSITIVE_INFINITY]) {
    const x1 = Math.min(p.x1, hx - HOLE / 2);
    if (x1 > x0) drawPlank(ctx, f, { x0, x1, y0: plankY(p, x0), y1: plankY(p, x1) });
    x0 = hx + HOLE / 2;
  }
  for (const g of c.pegs) {
    if (g.plank !== i) continue;
    const y = plankY(p, g.x);
    if (g.out < 0) {
      ctx.fillStyle = `rgba(255,224,102,${0.28 + 0.16 * Math.sin(T * 4 + g.x)})`;
      ctx.beginPath();
      ctx.arc(f.X(g.x), f.Y(y), 7 * f.k, 0, Math.PI * 2);
      ctx.fill();
      drawPeg(ctx, f.X(g.x), f.Y(y), f.k, 0);
      continue;
    }
    const u = c.clock - g.out;
    if (u > 1.4) continue;
    const side = g.x < c.stage.w / 2 ? -1 : 1;
    drawPeg(ctx, f.X(g.x + side * 22 * u), f.Y(y + 40 * u - 240 * u * u), f.k, side * 9 * u);
  }
}

/** A peg: a wooden dowel through the beam, its round head proud of the top. */
function drawPeg(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  k: number,
  a: number,
): void {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(a);
  ctx.fillStyle = '#7A4E22';
  ctx.fillRect(-1.6 * k, -1 * k, 3.2 * k, 8 * k);
  ctx.fillStyle = '#E2B062';
  ctx.strokeStyle = '#6B4A2C';
  ctx.lineWidth = Math.max(1, 0.8 * k);
  ctx.beginPath();
  ctx.ellipse(0, -1.4 * k, 4 * k, 2.6 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** After the last peg: how long before the card comes up; and when the gorilla and the chest come down. */
const NEST_CARD_T = 2.8;
const GORILLA_FALL_T = 0.9;
const CHEST_FALL_T = 1.15;
/** How the crow's nest gives way: shaking, then tipping over. */
function nestShake(c: Climb): { dx: number; tip: number } {
  const t = c.phase === 'clear' ? c.clearT : 0;
  return {
    dx: t > 0 && t < 0.9 ? Math.sin(t * 70) * 1.4 * (1 - t / 0.9) : 0,
    tip: clamp((t - 0.6) / 0.5, 0, 1) * 0.55,
  };
}

/** The crow's nest on top of the mast: a round tub with the gorilla in it and the pirates' chest beside it, the Jolly
 * Roger flying over; tossing the monkeys down; shaking and tipping over once the last peg is out. */
function drawNest(ctx: CanvasRenderingContext2D, f: ClimbFrame, c: Climb, T: number): void {
  const n = c.stage.nest;
  if (!n) return;
  const { k } = f;
  const p = plankOf(c, n.plank);
  const mid = (p.x0 + p.x1) / 2;
  const half = (p.x1 - p.x0) / 2 + 4;
  const { dx, tip } = nestShake(c);
  const t = c.phase === 'clear' ? c.clearT : -1;
  ctx.save();
  ctx.translate(f.X(mid + dx), f.Y(p.y0));
  ctx.rotate(tip);
  // The mast on up through it, and the flag.
  ctx.fillStyle = BARK;
  ctx.fillRect(-2.5 * k, -46 * k, 5 * k, 50 * k);
  const wave = Math.sin(T * 5) * 1.2;
  ctx.fillStyle = '#15151A';
  ctx.beginPath();
  ctx.moveTo(2.5 * k, -46 * k);
  ctx.lineTo(20 * k, (-43 - wave) * k);
  ctx.lineTo(20 * k, (-33 - wave) * k);
  ctx.lineTo(2.5 * k, -36 * k);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#F2EEE4';
  ctx.beginPath();
  ctx.arc(10.5 * k, (-40 - wave / 2) * k, 2 * k, 0, Math.PI * 2);
  ctx.fill();
  // The back of the tub.
  ctx.fillStyle = PLANK_DARK;
  ctx.fillRect(-half * k, -11 * k, half * 2 * k, 11 * k);
  // The gorilla and the chest, till they go over.
  if (t < GORILLA_FALL_T) {
    const pose: GorillaPose =
      t >= 0 ? 'whoa' : c.tossedT < 0.4 ? 'push' : Math.sin(T * 0.9) > 0.55 ? 'beat' : 'idle';
    const face = c.x < n.x ? -1 : 1;
    gorillaAt(ctx, (n.x - mid) * k, 0, face, k, pose, T, 0);
  }
  if (t < CHEST_FALL_T) drawChest(ctx, 18 * k, -8 * k, k, false, T);
  // The front of the tub: slats, and a rim round the top.
  ctx.fillStyle = PLANK;
  ctx.beginPath();
  ctx.moveTo(-half * k, -9 * k);
  ctx.lineTo(half * k, -9 * k);
  ctx.lineTo((half - 4) * k, 6 * k);
  ctx.lineTo((-half + 4) * k, 6 * k);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PLANK_DARK;
  ctx.lineWidth = Math.max(1, 0.9 * k);
  for (let x = -half + 8; x < half - 4; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x * k, -9 * k);
    ctx.lineTo(x * 0.92 * k, 6 * k);
    ctx.stroke();
  }
  ctx.fillStyle = HOOP;
  ctx.fillRect((-half - 1) * k, -11 * k, (half * 2 + 2) * k, 2.4 * k);
  ctx.fillRect((-half + 2) * k, 0.5 * k, (half * 2 - 4) * k, 1.6 * k);
  ctx.restore();
}

/** Once the crow's nest has gone over: the gorilla tumbling down out of the tree to the sea, and the chest dropping to
 * land beside you, and opening. */
function drawGivenWay(ctx: CanvasRenderingContext2D, f: ClimbFrame, c: Climb, T: number): void {
  const n = c.stage.nest;
  if (!n || c.phase !== 'clear') return;
  const { k } = f;
  const p = plankOf(c, n.plank);
  const g = c.clearT - GORILLA_FALL_T;
  if (g >= 0) {
    const y = p.y0 - 240 * g * g;
    if (y > -60) gorillaAt(ctx, f.X(n.x + 34 * g), f.Y(y), 1, k, 'whoa', T, 5 * g);
  }
  const u = c.clearT - CHEST_FALL_T;
  if (u < 0) return;
  const from = n.x + 18;
  const to = c.x + (c.x < c.stage.w / 2 ? 16 : -16);
  const drop = Math.max(1, p.y0 + 8 - c.y);
  const dur = Math.sqrt(drop / 240);
  const a = Math.min(1, u / dur);
  const y = u < dur ? p.y0 + 8 - 240 * u * u : c.y;
  drawChest(ctx, f.X(from + (to - from) * a), f.Y(y), k, u >= dur, T);
}

/** The pirates' chest: banded in gold; open, heaped with coins and sparkling. */
function drawChest(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  k: number,
  open: boolean,
  T: number,
): void {
  const w = 16 * k;
  const h = 9 * k;
  ctx.fillStyle = '#8A4E22';
  ctx.fillRect(sx - w / 2, sy - h, w, h);
  ctx.fillStyle = '#E8B83A';
  ctx.fillRect(sx - w / 2, sy - h, 1.6 * k, h);
  ctx.fillRect(sx + w / 2 - 1.6 * k, sy - h, 1.6 * k, h);
  if (open) {
    ctx.fillStyle = '#F6D04D';
    ctx.beginPath();
    ctx.ellipse(sx, sy - h, w * 0.46, 3.4 * k, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#6E3A18';
    ctx.fillRect(sx - w / 2, sy - h - 9 * k, w, 3 * k);
    for (let i = 0; i < 5; i++) {
      const a = T * 3 + i * 1.3;
      const r = (1 + Math.max(0, Math.sin(a)) * 1.6) * k;
      ctx.fillStyle = '#FFF4C0';
      ctx.fillRect(sx + Math.cos(i * 2.1) * w * 0.5 - r / 2, sy - h - (6 + (i % 3) * 4) * k, r, r);
    }
  } else {
    ctx.fillStyle = '#A0602A';
    ctx.beginPath();
    ctx.ellipse(sx, sy - h, w / 2, 4 * k, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#E8B83A';
    ctx.fillRect(sx - 1.4 * k, sy - h - 1 * k, 2.8 * k, 4 * k);
  }
  ctx.fillStyle = '#E8B83A';
  ctx.fillRect(sx - w / 2, sy - h - 0.6 * k, w, 1.2 * k);
}

/** A monkey, side on: knuckle-walking along a deck, its tail curled up behind; climbing a ladder, from behind; arms up
 * as it falls; spinning off the tree, bonked. */
function drawMonkey(ctx: CanvasRenderingContext2D, f: ClimbFrame, m: Monkey, T: number): void {
  const u = f.k;
  const fur = '#8A5A32';
  const dark = '#6A4224';
  const face = '#E8C9A0';
  ctx.save();
  ctx.translate(f.X(m.x), f.Y(m.y));
  ctx.lineCap = 'round';
  if (m.mode === 'climb') {
    const s = Math.sin(m.y * 0.35);
    ctx.strokeStyle = fur;
    ctx.lineWidth = 1.8 * u;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 2 * u, -8 * u);
      ctx.lineTo(side * 4.5 * u, (-12 - side * s * 2) * u);
      ctx.moveTo(side * 1.5 * u, -4 * u);
      ctx.lineTo(side * 4 * u, (-1 + side * s * 2) * u);
      ctx.stroke();
    }
    ctx.strokeStyle = dark;
    ctx.beginPath();
    ctx.moveTo(0, -3 * u);
    ctx.quadraticCurveTo(3 * u, 2 * u, 1 * u, 4 * u);
    ctx.stroke();
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(0, -6 * u, 3.4 * u, 4 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -11 * u, 3 * u, 0, Math.PI * 2);
    ctx.fill();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 3 * u, -11.5 * u, 1.2 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  const dir = m.mode === 'walk' ? m.dir || 1 : Math.sign(m.vx) || 1;
  if (m.mode === 'fly') {
    ctx.translate(0, -6 * u);
    ctx.rotate(T * 9 * dir);
    ctx.translate(0, 6 * u);
  }
  ctx.scale(dir, 1);
  const air = m.mode !== 'walk';
  const s = air ? 0 : Math.sin(m.x * 0.45);
  // The tail, curled up behind.
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.4 * u;
  ctx.beginPath();
  ctx.moveTo(-3 * u, -5 * u);
  ctx.bezierCurveTo(-8 * u, -5 * u, -8 * u, -12 * u, -5 * u, -12 * u);
  ctx.quadraticCurveTo(-3.5 * u, -12 * u, -4 * u, -10.5 * u);
  ctx.stroke();
  // Legs and arms, swinging as it goes; up over its head as it falls.
  ctx.strokeStyle = fur;
  ctx.lineWidth = 1.8 * u;
  ctx.beginPath();
  ctx.moveTo(-1.5 * u, -4 * u);
  ctx.lineTo((-1.5 + s * 2) * u, 0);
  ctx.moveTo(-1.5 * u, -4 * u);
  ctx.lineTo((-1.5 - s * 2) * u, 0);
  if (air) {
    ctx.moveTo(2 * u, -7 * u);
    ctx.lineTo(1 * u, -14 * u);
    ctx.moveTo(2 * u, -7 * u);
    ctx.lineTo(5 * u, -13 * u);
  } else {
    ctx.moveTo(2 * u, -6.5 * u);
    ctx.lineTo((4 - s * 2) * u, 0);
    ctx.moveTo(2 * u, -6.5 * u);
    ctx.lineTo((4 + s * 2) * u, 0);
  }
  ctx.stroke();
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -6 * u, 4.2 * u, 3.4 * u, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3.8 * u, -9.6 * u, 3.2 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(1.6 * u, -11.6 * u, 1.3 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.ellipse(5.2 * u, -9.2 * u, 2 * u, 2 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1A1412';
  ctx.beginPath();
  ctx.arc(5.4 * u, -10 * u, 0.6 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'butt';
  ctx.restore();
}

/** A rope ladder between two planks' tops. */
function drawLadder(
  ctx: CanvasRenderingContext2D,
  f: ClimbFrame,
  x: number,
  lo: number,
  hi: number,
): void {
  const { k, X, Y } = f;
  ctx.strokeStyle = ROPE;
  ctx.lineWidth = Math.max(1, 1.4 * k);
  for (const dx of [-5, 5]) {
    ctx.beginPath();
    ctx.moveTo(X(x + dx), Y(lo));
    ctx.lineTo(X(x + dx), Y(hi + 4));
    ctx.stroke();
  }
  ctx.strokeStyle = RUNG;
  ctx.lineWidth = Math.max(1.2, 2 * k);
  for (let y = lo + 6; y < hi - 2; y += 8) {
    ctx.beginPath();
    ctx.moveTo(X(x - 5), Y(y));
    ctx.lineTo(X(x + 5), Y(y));
    ctx.stroke();
  }
}

/** A plank: a beam, its top the walking line, seams along it and rope lashed round each end. */
function drawPlank(ctx: CanvasRenderingContext2D, f: ClimbFrame, p: Plank): void {
  const { k, X, Y } = f;
  const t = 6;
  ctx.fillStyle = PLANK;
  ctx.beginPath();
  ctx.moveTo(X(p.x0), Y(p.y0));
  ctx.lineTo(X(p.x1), Y(p.y1));
  ctx.lineTo(X(p.x1), Y(p.y1 - t));
  ctx.lineTo(X(p.x0), Y(p.y0 - t));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PLANK_DARK;
  ctx.beginPath();
  ctx.moveTo(X(p.x0), Y(p.y0 - t + 1.6));
  ctx.lineTo(X(p.x1), Y(p.y1 - t + 1.6));
  ctx.lineTo(X(p.x1), Y(p.y1 - t));
  ctx.lineTo(X(p.x0), Y(p.y0 - t));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PLANK_LIT;
  ctx.lineWidth = Math.max(1, 1.2 * k);
  ctx.beginPath();
  ctx.moveTo(X(p.x0), Y(p.y0) + 0.6 * k);
  ctx.lineTo(X(p.x1), Y(p.y1) + 0.6 * k);
  ctx.stroke();
  ctx.strokeStyle = PLANK_DARK;
  ctx.lineWidth = Math.max(1, 0.9 * k);
  for (let x = p.x0 + 24; x < p.x1 - 6; x += 24) {
    const y = plankY(p, x);
    ctx.beginPath();
    ctx.moveTo(X(x), Y(y) + 1.2 * k);
    ctx.lineTo(X(x - 1), Y(y - t) - 0.4 * k);
    ctx.stroke();
  }
  ctx.strokeStyle = ROPE;
  ctx.lineWidth = Math.max(1, 1.3 * k);
  for (const x of [p.x0 + 5, p.x1 - 5]) {
    const y = plankY(p, x);
    for (const dx of [-1.6, 1.6]) {
      ctx.beginPath();
      ctx.moveTo(X(x + dx), Y(y + 0.5));
      ctx.lineTo(X(x + dx + 0.6), Y(y - t - 0.5));
      ctx.stroke();
    }
  }
}

/** A rope bridge: slats on a rope, sagging, and dipping where you stand on it, a hand rope above on posts at its ends. */
function drawBridge(ctx: CanvasRenderingContext2D, f: ClimbFrame, c: Climb, i: number): void {
  const { k, X, Y } = f;
  const p = plankOf(c, i);
  const pts: [number, number][] = [];
  for (let x = p.x0; x <= p.x1 + 0.01; x += 5) pts.push([x, c.surfaceY(i, Math.min(x, p.x1))]);
  // The posts at the ends.
  ctx.fillStyle = PLANK_DARK;
  for (const x of [p.x0, p.x1])
    ctx.fillRect(X(x) - 1.6 * k, Y(c.surfaceY(i, x) + 16), 3.2 * k, 22 * k);
  // The rope under the slats and the hand rope, with stringers between.
  const hand = (x: number, y: number) => y + 14 + (plankY(p, x) - y) * 0.5;
  ctx.strokeStyle = ROPE;
  ctx.lineWidth = Math.max(1, 1.2 * k);
  for (const up of [false, true]) {
    ctx.beginPath();
    pts.forEach(([x, y], j) => {
      const yy = up ? hand(x, y) : y - 1.5;
      if (j) ctx.lineTo(X(x), Y(yy));
      else ctx.moveTo(X(x), Y(yy));
    });
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(1, 0.8 * k);
  for (let j = 2; j < pts.length - 1; j += 3) {
    const [x, y] = pts[j] as [number, number];
    ctx.beginPath();
    ctx.moveTo(X(x), Y(y));
    ctx.lineTo(X(x), Y(hand(x, y)));
    ctx.stroke();
  }
  // The slats, each along the rope's slope.
  for (let j = 0; j < pts.length - 1; j++) {
    const [x0, y0] = pts[j] as [number, number];
    const [x1, y1] = pts[j + 1] as [number, number];
    ctx.fillStyle = j % 2 ? PLANK : PLANK_LIT;
    ctx.beginPath();
    ctx.moveTo(X(x0 + 0.4), Y(y0));
    ctx.lineTo(X(x1 - 0.4), Y(y1));
    ctx.lineTo(X(x1 - 0.4), Y(y1 - 3));
    ctx.lineTo(X(x0 + 0.4), Y(y0 - 3));
    ctx.closePath();
    ctx.fill();
  }
}

/** The pulley lifts: a wheel at the top on a beam and one at the bottom, the rope round them going by, and the buckets
 * on it, each open-topped to stand in. */
function drawLifts(ctx: CanvasRenderingContext2D, f: ClimbFrame, c: Climb): void {
  const { k, X, Y } = f;
  (c.stage.lifts ?? []).forEach((L, i) => {
    const back = L.x + (L.up ? 12 : -12);
    // The rope: up the front where the buckets hang, down the back, with knots going round.
    ctx.strokeStyle = ROPE;
    ctx.lineWidth = Math.max(1, 1.6 * k);
    for (const x of [L.x, back]) {
      ctx.beginPath();
      ctx.moveTo(X(x), Y(L.y0));
      ctx.lineTo(X(x), Y(L.y1 + 14));
      ctx.stroke();
    }
    ctx.fillStyle = RUNG;
    const run = (c.clock * L.speed) % 18;
    for (let y = L.y0 + (L.up ? run : 18 - run); y < L.y1 + 14; y += 18) {
      ctx.fillRect(X(L.x) - 1.4 * k, Y(y) - 1 * k, 2.8 * k, 2 * k);
      ctx.fillRect(X(back) - 1.4 * k, Y(L.y1 + 14 - (y - L.y0)) - 1 * k, 2.8 * k, 2 * k);
    }
    // The wheels, the top one on a beam into the trunk.
    ctx.strokeStyle = BARK_DARK;
    ctx.lineWidth = 5 * k;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(X((L.x + back) / 2), Y(L.y1 + 14));
    ctx.lineTo(X(L.x < c.stage.w / 2 ? L.x + 50 : L.x - 50), Y(L.y1 + 24));
    ctx.stroke();
    ctx.lineCap = 'butt';
    for (const y of [L.y1 + 14, L.y0 + 2]) {
      ctx.fillStyle = PLANK_DARK;
      ctx.beginPath();
      ctx.arc(X((L.x + back) / 2), Y(y), 8 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PLANK_LIT;
      ctx.beginPath();
      ctx.arc(X((L.x + back) / 2), Y(y), 3 * k, 0, Math.PI * 2);
      ctx.fill();
    }
    // The buckets.
    for (let b = 0; b < c.buckets(L); b++) {
      const rim = c.rimY(i, b);
      if (rim === null) continue;
      const w = BUCKET_W / 2;
      ctx.strokeStyle = HOOP;
      ctx.lineWidth = Math.max(1, 1.2 * k);
      ctx.beginPath();
      ctx.moveTo(X(L.x - w + 2), Y(rim));
      ctx.quadraticCurveTo(X(L.x), Y(rim + 16), X(L.x + w - 2), Y(rim));
      ctx.stroke();
      ctx.fillStyle = WOOD;
      ctx.beginPath();
      ctx.moveTo(X(L.x - w), Y(rim));
      ctx.lineTo(X(L.x + w), Y(rim));
      ctx.lineTo(X(L.x + w - 3), Y(rim - 18));
      ctx.lineTo(X(L.x - w + 3), Y(rim - 18));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = HOOP;
      for (const d of [2, 13])
        ctx.fillRect(X(L.x - w + d * 0.2), Y(rim - d), (BUCKET_W - d * 0.4) * k, 1.6 * k);
      ctx.fillStyle = PLANK_LIT;
      ctx.fillRect(X(L.x - w), Y(rim) - 1 * k, BUCKET_W * k, 1.6 * k);
    }
  });
}

/** A drawbridge: up on its hinge until its lever is pulled, then swinging down across, a chain from a post to its end. */
function drawDrawbridge(ctx: CanvasRenderingContext2D, f: ClimbFrame, c: Climb, i: number): void {
  const { k, X, Y } = f;
  const p = plankOf(c, i);
  const down = c.lowered[p.lever ?? 0] ?? 0;
  const left = p.hinge !== 'right';
  const hx = left ? p.x0 : p.x1;
  const len = (p.x1 - p.x0) * k;
  const a = (1 - down) * (Math.PI / 2);
  ctx.save();
  ctx.translate(X(hx), Y(p.y0));
  ctx.scale(left ? 1 : -1, 1);
  ctx.rotate(-a);
  ctx.fillStyle = PLANK;
  ctx.fillRect(0, 0, len, 6 * k);
  ctx.fillStyle = PLANK_DARK;
  ctx.fillRect(0, 4.4 * k, len, 1.6 * k);
  for (let x = 12 * k; x < len; x += 12 * k) ctx.fillRect(x, 0, 0.9 * k, 6 * k);
  ctx.restore();
  // The post at the hinge and the chain to the far end.
  const end = [X(hx) + (left ? 1 : -1) * Math.cos(a) * len, Y(p.y0) - Math.sin(a) * len];
  ctx.fillStyle = PLANK_DARK;
  ctx.fillRect(X(hx) - 2 * k, Y(p.y0 + 34), 4 * k, 34 * k);
  ctx.strokeStyle = '#6E7480';
  ctx.lineWidth = Math.max(1, 1.2 * k);
  ctx.setLineDash([2 * k, 1.5 * k]);
  ctx.beginPath();
  ctx.moveTo(X(hx), Y(p.y0 + 32));
  ctx.lineTo(end[0] as number, end[1] as number);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** The levers: a post with a handle leaning back, thrown forward once pulled. */
function drawLevers(ctx: CanvasRenderingContext2D, f: ClimbFrame, c: Climb): void {
  const { k, X, Y } = f;
  (c.stage.levers ?? []).forEach((v, i) => {
    const y = plankY(plankOf(c, v.plank), v.x);
    const a = c.pulled[i] ? 0.7 : -0.7;
    ctx.fillStyle = PLANK_DARK;
    ctx.fillRect(X(v.x) - 4 * k, Y(y + 5), 8 * k, 5 * k);
    ctx.strokeStyle = '#5A5F68';
    ctx.lineWidth = 2 * k;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(X(v.x), Y(y + 4));
    ctx.lineTo(X(v.x + Math.sin(a) * 14), Y(y + 4 + Math.cos(a) * 14));
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = c.pulled[i] ? '#3FB37A' : '#D8392B';
    ctx.beginPath();
    ctx.arc(X(v.x + Math.sin(a) * 14), Y(y + 4 + Math.cos(a) * 14), 3 * k, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** The ropes, each hanging from a stub of branch, swinging. */
function drawRopes(ctx: CanvasRenderingContext2D, f: ClimbFrame, c: Climb): void {
  const { k, X, Y } = f;
  (c.stage.ropes ?? []).forEach((r, i) => {
    ctx.strokeStyle = BARK_DARK;
    ctx.lineCap = 'round';
    ctx.lineWidth = 6 * k;
    ctx.beginPath();
    ctx.moveTo(X(r.x - 16), Y(r.y + 5));
    ctx.lineTo(X(r.x + 12), Y(r.y + 3));
    ctx.stroke();
    const [ex, ey] = c.ropeAt(i, r.len);
    ctx.strokeStyle = ROPE;
    ctx.lineWidth = Math.max(1.4, 2.2 * k);
    ctx.beginPath();
    ctx.moveTo(X(r.x), Y(r.y));
    ctx.lineTo(X(ex), Y(ey));
    ctx.stroke();
    ctx.fillStyle = RUNG;
    ctx.beginPath();
    ctx.arc(X(ex), Y(ey), 2.2 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'butt';
  });
}

/** The coconut bunches, under their fronds; one wobbling where it hangs, about to drop; and those falling. */
function drawNuts(ctx: CanvasRenderingContext2D, f: ClimbFrame, c: Climb, T: number): void {
  const { k, X, Y } = f;
  const nut = (x: number, y: number) => {
    ctx.fillStyle = '#7A4E26';
    ctx.beginPath();
    ctx.arc(X(x), Y(y), NUT_R * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.beginPath();
    ctx.arc(X(x - 1.6), Y(y + 1.6), 1.6 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3A2410';
    for (const dx of [-1.2, 0, 1.2]) {
      ctx.beginPath();
      ctx.arc(X(x + dx), Y(y - 1.8), 0.5 * k, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  for (const n of c.stage.nuts ?? []) {
    ctx.strokeStyle = LEAVES[1];
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.2 * k;
    for (const a of [-0.9, -0.3, 0.4, 1]) {
      ctx.beginPath();
      ctx.moveTo(X(n.x), Y(n.y + 2));
      ctx.quadraticCurveTo(
        X(n.x + Math.sin(a) * 8),
        Y(n.y + 6),
        X(n.x + Math.sin(a) * 14),
        Y(n.y - 2),
      );
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    nut(n.x - 4, n.y - 4);
    nut(n.x + 4, n.y - 5);
  }
  for (const n of c.nuts) {
    const shake = n.wobble > 0 ? Math.sin(T * 50) * 1.4 : 0;
    nut(n.x + shake, n.y);
  }
}

/** The hut on the ledge at the top: plank walls, a red roof, the Jolly Roger, and the door, open once you are up. */
function drawHut(
  ctx: CanvasRenderingContext2D,
  f: ClimbFrame,
  x: number,
  y: number,
  open: boolean,
  T: number,
): void {
  const { k, X, Y } = f;
  const w = 40;
  const h = 28;
  ctx.fillStyle = PLANK;
  ctx.fillRect(X(x - w / 2), Y(y + h), w * k, h * k);
  ctx.strokeStyle = PLANK_DARK;
  ctx.lineWidth = Math.max(1, 0.8 * k);
  for (let yy = y + 7; yy < y + h; yy += 7) {
    ctx.beginPath();
    ctx.moveTo(X(x - w / 2), Y(yy));
    ctx.lineTo(X(x + w / 2), Y(yy));
    ctx.stroke();
  }
  ctx.fillStyle = '#7A3A2A';
  ctx.beginPath();
  ctx.moveTo(X(x - w / 2 - 6), Y(y + h));
  ctx.lineTo(X(x), Y(y + h + 16));
  ctx.lineTo(X(x + w / 2 + 6), Y(y + h));
  ctx.closePath();
  ctx.fill();
  // The flag.
  ctx.strokeStyle = '#5A3E24';
  ctx.lineWidth = Math.max(1, 1.6 * k);
  ctx.beginPath();
  ctx.moveTo(X(x + 12), Y(y + h + 8));
  ctx.lineTo(X(x + 12), Y(y + h + 34));
  ctx.stroke();
  const wave = Math.sin(T * 5) * 1.2;
  ctx.fillStyle = '#15151A';
  ctx.beginPath();
  ctx.moveTo(X(x + 12), Y(y + h + 34));
  ctx.lineTo(X(x + 28), Y(y + h + 31 + wave));
  ctx.lineTo(X(x + 28), Y(y + h + 22 + wave));
  ctx.lineTo(X(x + 12), Y(y + h + 24));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#F2EEE4';
  ctx.beginPath();
  ctx.arc(X(x + 19.5), Y(y + h + 28.5 + wave / 2), 2 * k, 0, Math.PI * 2);
  ctx.fill();
  // The door, and a window with a light in it.
  ctx.fillStyle = open ? '#FFD98A' : '#3A2A1A';
  ctx.fillRect(X(x - 6), Y(y + 17), 12 * k, 17 * k);
  if (open) {
    ctx.fillStyle = '#3A2A1A';
    ctx.fillRect(X(x - 9), Y(y + 17), 3 * k, 17 * k);
  }
  ctx.fillStyle = '#FFE9A8';
  ctx.fillRect(X(x + 10), Y(y + 20), 6 * k, 6 * k);
}

/** The barrels the gorilla has yet to roll, stood up beside it. */
function drawStack(ctx: CanvasRenderingContext2D, f: ClimbFrame, x: number, y: number): void {
  for (const [dx, dy] of [
    [-5, 0],
    [5, 0],
    [0, 12],
  ] as const)
    drawUpright(ctx, f.X(x + dx), f.Y(y + dy), f.k);
}
function drawUpright(ctx: CanvasRenderingContext2D, sx: number, sy: number, k: number): void {
  const w = 9 * k;
  const h = 12 * k;
  ctx.fillStyle = WOOD;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(sx - w / 2, sy - h, w, h, 2.5 * k);
  else ctx.rect(sx - w / 2, sy - h, w, h);
  ctx.fill();
  ctx.fillStyle = HOOP;
  for (const t of [0.22, 0.72]) ctx.fillRect(sx - w / 2, sy - h * (1 - t) - 0.7 * k, w, 1.4 * k);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.fillRect(sx - w / 2 + 1.5 * k, sy - h + 2 * k, 1.6 * k, h - 4 * k);
}

/** A barrel: rolling, an end on with its staves turning; coming down a ladder, side on. */
function drawBarrel(ctx: CanvasRenderingContext2D, f: ClimbFrame, b: Barrel): void {
  const { k } = f;
  const sx = f.X(b.x);
  const sy = f.Y(b.y);
  const r = BARREL_R * k;
  if (b.mode === 'ladder') {
    ctx.fillStyle = WOOD;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * 1.25, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = HOOP;
    for (const dx of [-0.55, 0.55])
      ctx.fillRect(sx + dx * r - 0.7 * k, sy - r * 0.8, 1.4 * k, r * 1.6);
    return;
  }
  ctx.fillStyle = WOOD;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = HOOP;
  ctx.lineWidth = Math.max(1, 1.3 * k);
  ctx.beginPath();
  ctx.arc(sx, sy, r - 0.6 * k, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx, sy, r * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  // The staves across its end, turning as it rolls.
  ctx.lineWidth = Math.max(1, 0.9 * k);
  for (const a of [-b.turn, -b.turn + Math.PI / 2]) {
    ctx.beginPath();
    ctx.moveTo(sx - Math.cos(a) * r * 0.9, sy - Math.sin(a) * r * 0.9);
    ctx.lineTo(sx + Math.cos(a) * r * 0.9, sy + Math.sin(a) * r * 0.9);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.2)';
  ctx.beginPath();
  ctx.arc(sx - r * 0.35, sy - r * 0.35, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

/** A belaying pin: a wooden club, its fat end up, glinting where it floats. */
function drawPin(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  k: number,
  a: number,
  T: number,
  glint: boolean,
): void {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(a);
  ctx.fillStyle = '#8A6234';
  ctx.fillRect(-1 * k, 0, 2 * k, 6 * k);
  ctx.fillStyle = '#C9A06A';
  ctx.beginPath();
  ctx.ellipse(0, -3 * k, 2.6 * k, 5 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6E4A24';
  ctx.fillRect(-1.6 * k, 1.6 * k, 3.2 * k, 1.2 * k);
  ctx.restore();
  if (!glint) return;
  const g = (Math.sin(T * 4) + 1) / 2;
  ctx.fillStyle = `rgba(255,250,210,${0.4 + g * 0.6})`;
  const gx = sx + 3 * k;
  const gy = sy - 7 * k;
  const r = (1.5 + g * 1.5) * k;
  ctx.beginPath();
  ctx.moveTo(gx, gy - r * 2);
  ctx.lineTo(gx + r * 0.5, gy);
  ctx.lineTo(gx, gy + r * 2);
  ctx.lineTo(gx - r * 0.5, gy);
  ctx.closePath();
  ctx.moveTo(gx - r * 2, gy);
  ctx.lineTo(gx, gy + r * 0.5);
  ctx.lineTo(gx + r * 2, gy);
  ctx.lineTo(gx, gy - r * 0.5);
  ctx.closePath();
  ctx.fill();
}

/** The gorilla at the top: beating its chest now and then, then reaching for a barrel and rolling it off. */
function drawGorilla(ctx: CanvasRenderingContext2D, f: ClimbFrame, c: Climb, T: number): void {
  const g = c.stage.gorilla;
  if (!g) return;
  const p = plankOf(c, g.plank);
  const holding = c.phase === 'climb' && c.nextRoll < 0.55;
  const pushing = c.rolledT < 0.35;
  const beat = !holding && !pushing && Math.sin(T * 0.9) > 0.55;
  const pose: GorillaPose = holding ? 'hold' : pushing ? 'push' : beat ? 'beat' : 'idle';
  gorillaAt(ctx, f.X(g.x), f.Y(plankY(p, g.x)), p.y1 < p.y0 ? 1 : -1, f.k, pose, T, 0);
}

/** Holding a barrel ready, pushing one off (or tossing a monkey), beating its chest, at ease, or arms up, falling. */
type GorillaPose = 'hold' | 'push' | 'beat' | 'idle' | 'whoa';
/** The gorilla, its feet at (sx, sy) on the screen, facing dir, u a unit; turned by a, tumbling, round its middle. */
function gorillaAt(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  dir: number,
  u: number,
  pose: GorillaPose,
  T: number,
  a: number,
): void {
  const beat = pose === 'beat';
  ctx.save();
  ctx.translate(sx, sy - 16 * u);
  ctx.rotate(a);
  ctx.translate(0, 16 * u);
  ctx.scale(dir, 1);
  const fur = '#3B3330';
  const face = '#9A8070';
  // Legs, short and bowed.
  ctx.fillStyle = fur;
  for (const dx of [-5, 5]) {
    ctx.beginPath();
    ctx.ellipse(dx * u, -4 * u, 4 * u, 4.5 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The body, leaning on, and the head.
  const bob = beat ? Math.abs(Math.sin(T * 14)) * 1 * u : 0;
  ctx.beginPath();
  ctx.ellipse(0, -15 * u - bob, 12 * u, 11 * u, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5A4A44';
  ctx.beginPath();
  ctx.ellipse(4 * u, -15 * u - bob, 6 * u, 7 * u, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.arc(5 * u, -28 * u - bob, 7 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.ellipse(9 * u, -26 * u - bob, 4 * u, 3.4 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1A1412';
  ctx.fillRect(7 * u, -32 * u - bob, 6 * u, 1.6 * u);
  ctx.fillStyle = '#F2EEE4';
  ctx.beginPath();
  ctx.arc(9.5 * u, -29.6 * u - bob, 1.2 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1A1412';
  ctx.beginPath();
  ctx.arc(10 * u, -29.6 * u - bob, 0.6 * u, 0, Math.PI * 2);
  ctx.fill();
  if (pose === 'whoa') {
    // Mouth open in an O.
    ctx.beginPath();
    ctx.ellipse(10.5 * u, -24.6 * u, 1.3 * u, 1.6 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  } else ctx.fillRect(9 * u, -25 * u - bob, 3.5 * u, 0.8 * u);
  // The arms: fists on the chest in turn, out to a barrel, pushing one off, or flung up.
  ctx.strokeStyle = fur;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5 * u;
  const arm = (fx: number, fy: number, hx: number, hy: number) => {
    ctx.beginPath();
    ctx.moveTo(fx * u, fy * u - bob);
    ctx.quadraticCurveTo(
      ((fx + hx) / 2 + 2) * u,
      ((fy + hy) / 2 + 3) * u - bob,
      hx * u,
      hy * u - bob,
    );
    ctx.stroke();
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(hx * u, hy * u - bob, 2.6 * u, 0, Math.PI * 2);
    ctx.fill();
  };
  if (pose === 'hold') {
    drawUpright(ctx, 15 * u, -6 * u, u);
    arm(-2, -20, 11, -12);
    arm(6, -20, 19, -12);
  } else if (pose === 'push') {
    arm(-2, -20, 14, -8);
    arm(6, -20, 20, -6);
  } else if (beat) {
    const s = Math.sin(T * 14) > 0;
    arm(-4, -20, s ? 6 : 2, s ? -17 : -14);
    arm(6, -20, s ? 4 : 9, s ? -13 : -17);
  } else if (pose === 'whoa') {
    arm(-4, -20, -10, -36);
    arm(6, -20, 14, -38);
  } else {
    arm(-6, -20, -9, -3);
    arm(6, -20, 11, -3);
  }
  ctx.lineCap = 'butt';
  ctx.restore();
}

/** The climber, side on, in your colours: walking, up a ladder, in the air, dazed, or swinging a belaying pin. */
function drawClimber(
  ctx: CanvasRenderingContext2D,
  f: ClimbFrame,
  c: Climb,
  look: SkierLook,
  T: number,
): void {
  const { k } = f;
  const u = k;
  const pose = c.pose;
  // In at the door, at the end: fading into it.
  let alpha = 1;
  if (c.phase === 'clear') alpha = clamp(1.6 - c.clearT, 0, 1);
  else if (c.safeT > 0 && c.stunT <= 0 && Math.floor(c.safeT * 10) % 2 === 0) alpha = 0.35;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(f.X(c.x), f.Y(c.y));
  if (c.phase === 'down') {
    const e = DOWN_T - c.downT;
    ctx.translate(0, -8 * u);
    ctx.rotate(e * 7);
    ctx.translate(0, 8 * u);
  }
  // On a rope, hanging from your hands along it as it swings.
  if (pose === 'rope') {
    ctx.translate(0, -HANDS * u);
    ctx.rotate(-c.ropeAngle(c.rope));
    ctx.translate(0, HANDS * u);
  }
  ctx.scale(c.face, 1);
  const out = look.out ?? null;
  const trousers = out?.legs ?? '#3A3F4A';
  const sw = Math.sin(c.stride * 0.32);
  const sat = pose === 'stun' && c.phase !== 'down';
  const hip = sat ? -4 : -7;
  const sh = hip - 5.4;
  // Each pose's legs (hip, knee, foot) and arms (where the hand is), the far one first.
  type Leg = readonly [number, number, number, number, number, number];
  type Hand = readonly [number, number];
  let legs: readonly [Leg, Leg];
  let hands: readonly [Hand, Hand];
  if (sat) {
    legs = [
      [0, -4, 3, -3, 6, -1],
      [0, -4, 4, -2.4, 7, -0.6],
    ];
    hands = [
      [2.4, sh + 3.4],
      [3, sh + 3],
    ];
  } else if (pose === 'jump') {
    legs = [
      [0, -7, -2, -4.4, -3.4, -2],
      [0, -7, 3, -5, 1.6, -1.4],
    ];
    hands = [
      [-2.6, sh - 3.6],
      [3, sh - 4.5],
    ];
  } else if (pose === 'rope') {
    // Hands up together on the rope, legs hanging, a little kick as it swings.
    const kick = Math.sin(T * 3) * 0.8;
    legs = [
      [0, -7, -0.6, -3.8, -0.8 + kick, -0.4],
      [0, -7, 1, -3.6, 1.4 + kick, -0.6],
    ];
    hands = [
      [-0.4, -HANDS + 1.4],
      [0.6, -HANDS],
    ];
  } else if (pose === 'ladder') {
    // Up a ladder, seen from behind: hands up at the rungs in turn, and the feet with them.
    legs = [
      [-1, -7, -1.8, -4 + sw * 1.4, -1.6, -0.6 + sw * 1.4],
      [1, -7, 1.8, -4 - sw * 1.4, 1.6, -0.6 - sw * 1.4],
    ];
    hands = [
      [-3.6, sh - 4 + sw * 2],
      [3.6, sh - 4 - sw * 2],
    ];
  } else {
    const a = pose === 'walk' ? sw * 0.55 : 0.08;
    const leg = (a: number): Leg => [
      0,
      -7,
      Math.sin(a) * 3.5,
      -7 + Math.cos(a) * 3.5,
      Math.sin(a) * 6.6,
      -0.6,
    ];
    const hand = (a: number): Hand => [Math.sin(a) * 4.6, sh + Math.cos(a) * 4.6];
    legs = [leg(-a), leg(a)];
    hands = [hand(a * 1.1), hand(-a * 1.1)];
  }
  // With the pin, the near hand swings it up over the head and down in front, again and again.
  const swing = -1.9 + (Math.sin(T * 16) + 1) * 1.05;
  if (c.pinT > 0)
    hands = [
      [-1.5, sh + 4],
      [Math.cos(swing) * 4.5, sh + Math.sin(swing) * 4.5],
    ];
  ctx.lineCap = 'round';
  const drawLeg = (l: Leg, far: boolean) => {
    ctx.strokeStyle = far ? shade(trousers, 0.75) : trousers;
    ctx.lineWidth = 2.6 * u;
    ctx.beginPath();
    ctx.moveTo(l[0] * u, l[1] * u);
    ctx.lineTo(l[2] * u, l[3] * u);
    ctx.lineTo(l[4] * u, l[5] * u);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse((l[4] + 0.8) * u, l[5] * u, 1.8 * u, 1 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  // An arm: skin, with the shirt's sleeve over its top.
  const drawArm = (h: Hand, far: boolean) => {
    ctx.lineWidth = 2 * u;
    ctx.strokeStyle = far ? shade(look.skin, 0.8) : look.skin;
    ctx.beginPath();
    ctx.moveTo(0, sh * u);
    ctx.lineTo(h[0] * u, h[1] * u);
    ctx.stroke();
    ctx.lineWidth = 2.4 * u;
    ctx.strokeStyle = far ? shade(look.shirt, 0.8) : look.shirt;
    ctx.beginPath();
    ctx.moveTo(0, sh * u);
    ctx.lineTo(h[0] * 0.4 * u, (sh + (h[1] - sh) * 0.4) * u);
    ctx.stroke();
  };
  const back = pose === 'ladder';
  if (!back) drawArm(hands[0], true);
  drawLeg(legs[0], !back);
  drawLeg(legs[1], false);
  // The body, the head, the hair, an eye.
  ctx.fillStyle = look.shirt;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-3 * u, (hip - 6.4) * u, 6 * u, 7 * u, 2 * u);
  else ctx.rect(-3 * u, (hip - 6.4) * u, 6 * u, 7 * u);
  ctx.fill();
  if (out) {
    ctx.fillStyle = out.trim;
    ctx.fillRect(-3 * u, (hip - 1.4) * u, 6 * u, 1.1 * u);
  }
  const hy = hip - 9.4;
  ctx.fillStyle = out?.hood ?? look.skin;
  ctx.beginPath();
  ctx.arc(0.4 * u, hy * u, 3 * u, 0, Math.PI * 2);
  ctx.fill();
  if (out?.hood) {
    // A ninja's hood: all hood, a slit for the eye toward where it looks, a headband with its tails behind.
    ctx.strokeStyle = 'rgba(70,95,130,.45)';
    ctx.lineWidth = 0.4 * u;
    ctx.stroke();
    if (!back) {
      ctx.fillStyle = look.skin;
      ctx.fillRect(0.6 * u, (hy - 0.3) * u, 2.8 * u, 1.4 * u);
    }
    ctx.fillStyle = out.trim;
    ctx.fillRect(-2.6 * u, (hy - 1.8) * u, 6 * u, 1 * u);
    ctx.beginPath();
    ctx.moveTo(-2.4 * u, (hy - 1.6) * u);
    ctx.lineTo(-5.2 * u, (hy - 0.6 + Math.sin(T * 9) * 0.6) * u);
    ctx.lineTo(-4.8 * u, (hy + 0.4 + Math.sin(T * 9) * 0.6) * u);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = look.hair;
    ctx.beginPath();
    if (back) ctx.arc(0.4 * u, (hy - 0.2) * u, 3 * u, Math.PI * 0.8, Math.PI * 2.2);
    else ctx.arc(0.2 * u, (hy - 0.4) * u, 3.1 * u, Math.PI * 0.88, Math.PI * 1.97);
    ctx.closePath();
    ctx.fill();
  }
  if (!back) {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(1.8 * u, (hy + 0.4) * u, 0.5 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  // The captain's tricorn, side on: black felt turned up front and back, edged gold.
  if (out && !out.hood) {
    ctx.fillStyle = TRICORN[0];
    ctx.strokeStyle = TRICORN[1];
    ctx.lineWidth = 0.4 * u;
    ctx.beginPath();
    ctx.moveTo(-3.8 * u, (hy - 2.8) * u);
    ctx.quadraticCurveTo(0.4 * u, (hy - 1) * u, 4.6 * u, (hy - 2.8) * u);
    ctx.quadraticCurveTo(2.6 * u, (hy - 6) * u, 0.4 * u, (hy - 5.6) * u);
    ctx.quadraticCurveTo(-1.8 * u, (hy - 6) * u, -3.8 * u, (hy - 2.8) * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (back) drawArm(hands[0], false);
  drawArm(hands[1], false);
  if (c.pinT > 0)
    drawPin(ctx, hands[1][0] * u, hands[1][1] * u, k * 0.9, swing + Math.PI / 2, T, false);
  ctx.lineCap = 'butt';
  // Dazed: stars round the head.
  if (pose === 'stun') {
    ctx.fillStyle = '#FFE066';
    for (let i = 0; i < 3; i++) {
      const a = T * 6 + (i * Math.PI * 2) / 3;
      star(ctx, Math.cos(a) * 4.6 * u, (hy - 4.4 + Math.sin(a) * 1.4) * u, 1.6 * u);
    }
  }
  ctx.restore();
  // How long the pin has left, over the head.
  if (c.pinT > 0) {
    const bx = f.X(c.x) - 8 * k;
    const by = f.Y(c.y + 24);
    ctx.fillStyle = 'rgba(42,30,18,.55)';
    ctx.fillRect(bx, by, 16 * k, 2.4 * k);
    ctx.fillStyle = '#FFE066';
    ctx.fillRect(bx, by, 16 * k * (c.pinT / PIN_T), 2.4 * k);
  }
}

/** A colour, darker: the far arm and leg, a step back from the near ones. */
function shade(hex: string, f: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v * f);
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** A rounded box, or a plain one where the browser cannot round it. */
function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 12);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.1, x, y - r * 0.35);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  ctx.fill();
}

/** Along the top: the clock and the stage, the tries left in hearts; at the right, the coins this climb has made. */
function drawBars(ctx: CanvasRenderingContext2D, W: number, c: Climb, top: number): void {
  const pad = 14;
  const w = Math.min(220, W - pad * 2 - 96);
  ctx.fillStyle = 'rgba(42,30,18,.6)';
  box(ctx, pad, top, w + 16, 50);
  ctx.fillStyle = '#FFF7E6';
  ctx.font = `800 22px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(clockOf(c.t), pad + 10, top + 17);
  ctx.font = `800 13px ${FONT}`;
  ctx.fillStyle = '#F2DDB4';
  ctx.textAlign = 'right';
  ctx.fillText(c.stage.name, pad + w + 8, top + 17);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < c.tries ? '#E8483A' : 'rgba(255,247,230,.25)';
    heart(ctx, pad + 18 + i * 20, top + 37, 7);
  }
  // At the very top, the pegs still in.
  if (c.pegs.length) {
    ctx.font = `800 11px ${FONT}`;
    ctx.fillStyle = '#F2DDB4';
    ctx.textAlign = 'left';
    ctx.fillText('Pegs', pad + 78, top + 37);
    c.pegs.forEach((g, i) => {
      ctx.fillStyle = g.out < 0 ? '#E2B062' : 'rgba(255,247,230,.22)';
      ctx.beginPath();
      ctx.arc(pad + 122 + i * 13, top + 37, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.fillStyle = 'rgba(42,30,18,.6)';
  box(ctx, W - pad - 82, top, 82, 44);
  ctx.fillStyle = '#F0C544';
  ctx.beginPath();
  ctx.arc(W - pad - 62, top + 22, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#C99A1E';
  ctx.beginPath();
  ctx.arc(W - pad - 62, top + 22, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF7E6';
  ctx.font = `800 16px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`+${c.coins}`, W - pad - 46, top + 23);
}

/** The words over the climb: each rises and fades. */
function drawPops(
  ctx: CanvasRenderingContext2D,
  W: number,
  f: ClimbFrame,
  pops: readonly ClimbPop[],
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 22px ${FONT}`;
  pops.forEach((p, i) => {
    const u = clamp(p.t / CLIMB_POP_T, 0, 1);
    ctx.globalAlpha = 1 - u * u;
    const y = f.top + 30 - u * 22 + i * 28;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(42,30,18,.65)';
    ctx.strokeText(p.text, W / 2, y);
    ctx.fillStyle = p.colour;
    ctx.fillText(p.text, W / 2, y);
  });
  ctx.globalAlpha = 1;
}

function drawHowTo(ctx: CanvasRenderingContext2D, W: number, H: number, c: Climb): void {
  const w = Math.min(320, W - 32);
  const x = (W - w) / 2;
  const y = H * 0.3;
  ctx.fillStyle = 'rgba(42,30,18,.8)';
  box(ctx, x, y, w, 172);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFE066';
  ctx.font = `800 20px ${FONT}`;
  ctx.fillText(`The ${c.stage.name}`, W / 2, y + 26);
  ctx.font = `800 15px ${FONT}`;
  ctx.fillStyle = '#FFF7E6';
  c.stage.howTo.forEach((t, i) => {
    ctx.fillText(t, W / 2, y + 58 + i * 24);
  });
  ctx.fillStyle = '#F2DDB4';
  ctx.font = `800 12px ${FONT}`;
  ctx.fillText('Tap Jump to start now', W / 2, y + 156);
}

/** Ready, then Climb! as it goes. */
function drawReady(ctx: CanvasRenderingContext2D, W: number, f: ClimbFrame, c: Climb): void {
  const go = c.phase === 'climb';
  const text = go ? 'Climb!' : c.restarts ? 'Again! Ready...' : 'Ready...';
  const size = Math.min(W / 7, 48);
  ctx.globalAlpha = go ? 1 - c.t / 0.8 : 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(size)}px ${FONT}`;
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(42,30,18,.7)';
  const y = (f.top + f.bottom) / 2;
  ctx.strokeText(text, W / 2, y);
  ctx.fillStyle = go ? '#FFE066' : '#FFF7E6';
  ctx.fillText(text, W / 2, y);
  ctx.globalAlpha = 1;
}

/** Up at the top: the time, and how it went. */
function drawClear(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  c: Climb,
  best: number | undefined,
  after: string,
): void {
  const w = Math.min(300, W - 40);
  const x = (W - w) / 2;
  const y = H * 0.3;
  ctx.fillStyle = 'rgba(42,30,18,.78)';
  box(ctx, x, y, w, 140);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F2DDB4';
  ctx.font = `800 15px ${FONT}`;
  ctx.fillText(`Up the ${c.stage.name}!`, W / 2, y + 20);
  ctx.fillStyle = '#FFE066';
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText(clockOf(c.t), W / 2, y + 52);
  const rounded = Math.round(c.t * 10) / 10;
  ctx.font = `800 14px ${FONT}`;
  ctx.fillStyle = '#FFF7E6';
  ctx.fillText(
    best === undefined
      ? 'Your first time up!'
      : rounded < best
        ? `Your best yet! (was ${clockOf(best)})`
        : `Your best: ${clockOf(best)}`,
    W / 2,
    y + 80,
  );
  ctx.fillStyle = '#F2DDB4';
  ctx.font = `800 13px ${FONT}`;
  const did = c.stage.gorilla
    ? `Jumped ${c.jumped} · Smashed ${c.smashed}`
    : c.pegs.length
      ? `Pegs ${c.knocked} · Jumped ${c.jumped}`
      : c.stage.levers?.length
        ? `Levers pulled ${c.pulled.filter(Boolean).length}`
        : `Ropes swung ${c.swung}`;
  ctx.fillText(`${did} · ${c.coins} coins`, W / 2, y + 102);
  ctx.fillText(after, W / 2, y + 124);
}
