/**
 * The wreck off island 5, side on, behind the diver: the island's pale rocks
 * rising on the left, the sand with ribs and skulls on it, and the fishing
 * boat sitting on the sand, drawn cut away so its hold shows: the far side's
 * planks dark behind, the stern and the bow, the keel, what is left of the deck
 * with its torn end, the wheelhouse with its dark windows, weed growing on it,
 * and its mast broken off and lying on the sand by the bow.
 */

import { DECK_END, HULL, reefIn, sandAt, WD, WRECK_BONES, WW } from '../world/wreck';

type Proj = (v: number) => number;

const ROCK = '#B9B39C';
const ROCK_DARK = '#8F8A76';
const SAND = '#E8DDBF';
const WOOD = '#7A5A3C';
const WOOD_DARK = '#3E2C1E';
const WOOD_LIGHT = '#9A7650';
const BONE = '#F2EBDD';
const WEED = '#4F8F4A';

/** Everything of the wreck's scene but the water, the fish and the diver. */
export function drawWreckScene(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  T: number,
): void {
  // The island's rocks on the left, a paler band along their face.
  ctx.fillStyle = ROCK_DARK;
  ctx.beginPath();
  ctx.moveTo(X(-200), Y(-40));
  for (let y = -40; y <= WD + 40; y += 12) ctx.lineTo(X(reefIn(Math.max(0, y))), Y(y));
  ctx.lineTo(X(-200), Y(WD + 40));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ROCK;
  ctx.lineWidth = 6 * s;
  ctx.beginPath();
  for (let y = 0; y <= WD; y += 12) {
    const x = reefIn(y) - 3;
    if (y === 0) ctx.moveTo(X(x), Y(y));
    else ctx.lineTo(X(x), Y(y));
  }
  ctx.stroke();
  // The sand.
  ctx.fillStyle = SAND;
  ctx.beginPath();
  ctx.moveTo(X(-200), Y(WD + 900));
  for (let x = -200; x <= WW + 200; x += 16)
    ctx.lineTo(X(x), Y(sandAt(Math.max(0, Math.min(WW, x)))));
  ctx.lineTo(X(WW + 200), Y(WD + 900));
  ctx.lineTo(X(-200), Y(WD + 900));
  ctx.closePath();
  ctx.fill();
  // Deeper down, the sand darkens into the sea bed.
  const bed = ctx.createLinearGradient(0, Y(WD + 10), 0, Y(WD + 240));
  bed.addColorStop(0, 'rgba(120,100,70,0)');
  bed.addColorStop(1, 'rgba(120,100,70,.55)');
  ctx.fillStyle = bed;
  ctx.fillRect(X(-200), Y(WD + 10), (WW + 400) * s, 900 * s);
  // Ribs and skulls on the sand.
  ctx.strokeStyle = BONE;
  ctx.fillStyle = BONE;
  ctx.lineWidth = 2 * s;
  for (const b of WRECK_BONES) {
    const y = sandAt(b.x);
    if (b.kind === 'ribs') {
      ctx.beginPath();
      ctx.moveTo(X(b.x - 16), Y(y - 2));
      ctx.lineTo(X(b.x + 16), Y(y - 2));
      for (let i = -2; i <= 2; i++) {
        ctx.moveTo(X(b.x + i * 6), Y(y - 2));
        ctx.quadraticCurveTo(X(b.x + i * 6 + 5), Y(y - 12), X(b.x + i * 6 + 2), Y(y - 16));
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(X(b.x), Y(y - 6), 6 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5C5446';
      ctx.beginPath();
      ctx.arc(X(b.x - 2), Y(y - 7), 1.5 * s, 0, Math.PI * 2);
      ctx.arc(X(b.x + 2.4), Y(y - 7), 1.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = BONE;
    }
  }
  drawHull(ctx, X, Y, s, T);
}

/** The boat on the sand, cut away to show its hold. */
function drawHull(ctx: CanvasRenderingContext2D, X: Proj, Y: Proj, s: number, T: number): void {
  const { x0, x1, top, keel } = HULL;
  const bottom = sandAt((x0 + x1) / 2) + 6;
  // The far side's planks, dark, behind the hold.
  ctx.fillStyle = WOOD_DARK;
  ctx.fillRect(X(x0), Y(top), (x1 - x0) * s, (bottom - top) * s);
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 1 * s;
  for (let y = top + 12; y < keel; y += 12) {
    ctx.beginPath();
    ctx.moveTo(X(x0), Y(y));
    ctx.lineTo(X(x1), Y(y));
    ctx.stroke();
  }
  // The keel along the bottom, the stern, and the bow coming to a point.
  ctx.fillStyle = WOOD;
  ctx.fillRect(X(x0), Y(keel), (x1 - x0) * s, (bottom - keel) * s);
  ctx.fillRect(X(x0), Y(top), 14 * s, (bottom - top) * s);
  ctx.beginPath();
  ctx.moveTo(X(x1 - 14), Y(top - 6));
  ctx.lineTo(X(x1 + 26), Y(top - 14));
  ctx.quadraticCurveTo(X(x1 + 14), Y(keel - 10), X(x1 - 14), Y(bottom));
  ctx.closePath();
  ctx.fill();
  // What is left of the deck, its end torn and jagged.
  ctx.fillStyle = WOOD_LIGHT;
  ctx.beginPath();
  ctx.moveTo(X(x0 - 4), Y(top));
  ctx.lineTo(X(DECK_END), Y(top));
  ctx.lineTo(X(DECK_END + 8), Y(top + 4));
  ctx.lineTo(X(DECK_END - 2), Y(top + 6));
  ctx.lineTo(X(DECK_END + 4), Y(top + 10));
  ctx.lineTo(X(x0 - 4), Y(top + 10));
  ctx.closePath();
  ctx.fill();
  // A broken plank hanging down off the torn end.
  ctx.save();
  ctx.translate(X(DECK_END + 2), Y(top + 6));
  ctx.rotate(1.1 + Math.sin(T * 0.8) * 0.04);
  ctx.fillRect(0, -2 * s, 30 * s, 4 * s);
  ctx.restore();
  // The wheelhouse on the deck, its windows dark.
  ctx.fillStyle = '#D9D2BE';
  ctx.fillRect(X(322), Y(190), 60 * s, 36 * s);
  ctx.fillStyle = '#B86B4B';
  ctx.fillRect(X(318), Y(184), 68 * s, 7 * s);
  ctx.fillStyle = '#26323A';
  ctx.fillRect(X(330), Y(198), 14 * s, 11 * s);
  ctx.fillRect(X(352), Y(198), 14 * s, 11 * s);
  // Weed growing on the stern and the bow.
  ctx.strokeStyle = WEED;
  ctx.lineWidth = 2.4 * s;
  for (const [x, y, h] of [
    [x0 + 6, top, 22],
    [x1 - 8, top - 6, 28],
    [x0 + 100, top, 14],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(X(x), Y(y));
    ctx.quadraticCurveTo(
      X(x + 6 + Math.sin(T + x) * 4),
      Y(y - h * 0.5),
      X(x + Math.sin(T * 1.2 + x) * 6),
      Y(y - h),
    );
    ctx.stroke();
  }
  // The mast, broken off and lying on the sand past the bow.
  const my = sandAt(650) - 4;
  ctx.fillStyle = WOOD;
  ctx.save();
  ctx.translate(X(590), Y(my));
  ctx.rotate(-0.08);
  ctx.fillRect(0, -3 * s, 120 * s, 6 * s);
  ctx.restore();
}

/** A bone shark side on: a skull with a grinning jaw, a spine with ribs hanging off it, bony fins and a tail. */
export function drawBoneShark(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  sh: { x: number; y: number; a: number; mouth: number; state: string; t: number },
  T: number,
  length: number,
): void {
  ctx.save();
  ctx.translate(X(sh.x), Y(sh.y));
  ctx.rotate(sh.a);
  const flip = Math.cos(sh.a) < 0 ? -1 : 1;
  const k = (length / 70) * s;
  ctx.scale(k, k * flip);
  if (sh.state === 'stung') ctx.globalAlpha = Math.max(0.3, Math.min(1, sh.t));
  const wave = Math.sin(T * 6) * 3;
  ctx.strokeStyle = BONE;
  ctx.fillStyle = BONE;
  ctx.lineCap = 'round';
  // The spine, waving, and the ribs off it.
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.quadraticCurveTo(-35, wave * 0.5, -62, wave);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    const x = -16 - i * 6;
    const w = wave * ((i + 2) / 10);
    ctx.beginPath();
    ctx.moveTo(x, w);
    ctx.quadraticCurveTo(x - 3, w + 7 - i * 0.6, x - 1, w + 11 - i);
    ctx.moveTo(x, w);
    ctx.lineTo(x - 2, w - 6 + i * 0.5);
    ctx.stroke();
  }
  // Fins: one up on its back, one under, and the tail.
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-22, -2);
  ctx.lineTo(-32, -16);
  ctx.lineTo(-36, -2);
  ctx.moveTo(-14, 4);
  ctx.lineTo(-24, 14);
  ctx.moveTo(-60, wave);
  ctx.lineTo(-72, wave - 14);
  ctx.moveTo(-60, wave);
  ctx.lineTo(-70, wave + 10);
  ctx.stroke();
  // The skull, and the jaw dropping open.
  ctx.beginPath();
  ctx.moveTo(4, -2);
  ctx.quadraticCurveTo(0, -9, -12, -6);
  ctx.lineTo(-12, 2);
  ctx.lineTo(2, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3A3428';
  ctx.beginPath();
  ctx.arc(-4, -4, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(-8, 2);
  ctx.rotate(sh.mouth * 0.6);
  ctx.fillStyle = BONE;
  ctx.fillRect(0, 0, 11, 2.4);
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(2 + i * 2.5, 0);
    ctx.lineTo(3 + i * 2.5, -2.4);
  }
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}
