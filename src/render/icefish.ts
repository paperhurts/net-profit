/**
 * Ice fishing, side on: a pale sky with snow drifting down, the ice across the
 * top with the hole cut in its middle, the fisher on a stool beside it with the
 * rod, the line down through the hole to the hook, the cold water darkening to
 * the sea floor, and what swims there: char, cod, the glassy icefish, snow crabs
 * walking the floor and pale jellies drifting. The view follows the hook down
 * and back up.
 */

import { HAT_COLOURS, type Look, SKINS, SKIPPER } from '../data/look';
import { SPECIES } from '../data/tuning';
import { drawSealDive, drawSealLie } from '../entities/seal';
import {
  HOLE_X,
  ICE_D,
  ICE_TOP,
  ICE_W,
  type IceFish,
  type IceRun,
  type IceSeal,
  LINE_MAX,
} from '../fishing/icefish';

const ICE = '#EEF8FC';
const ICE_EDGE = '#B7DCEA';
const ICE_SHADE = '#8FC3D6';

/** Where the camera wants to look: with the line up, the ice low on the screen, under the game's messages; with it
 * out, after the hook. Its top in the scene, and the scale, for a screen W by H. */
export function iceCamera(run: IceRun, W: number, H: number): { top: number; s: number } {
  const s = W / ICE_W;
  const view = H / s;
  const up = run.phase === 'ready' || run.phase === 'done';
  const top = up
    ? -view * 0.58
    : Math.max(-view * 0.58, Math.min(ICE_D + 60 - view, run.y - view * 0.45));
  return { top, s };
}

/** The camera eases to where it wants to be, so the drop does not jump. */
const eased = new WeakMap<IceRun, { top: number; T: number }>();

export function drawIceScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  run: IceRun,
  T: number,
  left: number,
  seal: IceSeal | null = null,
  look: Look = SKIPPER,
): void {
  const want = iceCamera(run, W, H);
  const s = want.s;
  const was = eased.get(run);
  const top = was
    ? was.top + (want.top - was.top) * Math.min(1, Math.max(0, T - was.T) * 5)
    : want.top;
  eased.set(run, { top, T });
  const X = (x: number) => x * s;
  const Y = (y: number) => (y - top) * s;
  // The sky over the ice, and the water under it darkening down to the floor.
  const sky = ctx.createLinearGradient(0, Y(-300), 0, Y(0));
  sky.addColorStop(0, '#BFD9E6');
  sky.addColorStop(1, '#EAF4F8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, Math.max(0, Y(0)));
  // From the ice's top, so the water in the hole is painted afresh each frame too.
  const sea = ctx.createLinearGradient(0, Y(0), 0, Y(ICE_D));
  sea.addColorStop(0, '#6DB9CF');
  sea.addColorStop(0.35, '#2F7C98');
  sea.addColorStop(1, '#0C2436');
  ctx.fillStyle = sea;
  ctx.fillRect(0, Math.max(0, Y(0)), W, H);
  // Light down through the hole.
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#FFFFFF';
  for (const [w, k] of [
    [26, -0.18],
    [16, 0.1],
    [22, 0.32],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(X(HOLE_X - w / 2), Y(ICE_TOP));
    ctx.lineTo(X(HOLE_X + w / 2), Y(ICE_TOP));
    ctx.lineTo(X(HOLE_X + w * 2 + k * 600), Y(ICE_TOP + 700));
    ctx.lineTo(X(HOLE_X - w * 2 + k * 600), Y(ICE_TOP + 700));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // The sea floor: dark sand and stones.
  ctx.fillStyle = '#2B3A44';
  ctx.beginPath();
  ctx.moveTo(0, Y(ICE_D + 200));
  for (let x = 0; x <= ICE_W; x += 20) ctx.lineTo(X(x), Y(ICE_D - 6 + Math.sin(x * 0.05) * 5));
  ctx.lineTo(W, Y(ICE_D + 200));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3E505C';
  for (let i = 0; i < 9; i++) {
    const x = (i * 47 + 13) % ICE_W;
    ctx.beginPath();
    ctx.ellipse(X(x), Y(ICE_D - 4), (6 + (i % 3) * 3) * s, 4 * s, 0, Math.PI, 0);
    ctx.fill();
  }
  // What swims there, and what is on the line.
  for (const f of run.pool) if (!f.caught && !f.on) drawIceFish(ctx, X(f.x), Y(f.y), s, f, T);
  // The line from the rod tip, down through the hole to the hook, and what hangs under it.
  const tipX = X(HOLE_X - 16);
  const tipY = Y(-34);
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(X(HOLE_X), Y(ICE_TOP * 0.5));
  ctx.lineTo(X(run.x), Y(run.y));
  ctx.stroke();
  for (const f of run.line) drawIceFish(ctx, X(f.x), Y(f.y), s, f, T, true);
  // Neil, if he is with you, swimming down there, with a fish in his mouth on the way back.
  const neilIn = seal && seal.y > 0;
  if (seal?.has && seal.prey)
    drawIceFish(ctx, X(seal.prey.x), Y(seal.prey.y), s, seal.prey, T, true);
  if (seal && neilIn) drawSealDive(ctx, X(seal.x), Y(seal.y), seal.dir, T, 1.15 * s);
  ctx.strokeStyle = '#C9D3DA';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(X(run.x), Y(run.y));
  ctx.lineTo(X(run.x), Y(run.y + 8));
  ctx.arc(X(run.x - 4), Y(run.y + 8), 4 * s, 0, Math.PI);
  ctx.stroke();
  // The ice, with its hole, and icicles under it.
  ctx.fillStyle = ICE_EDGE;
  ctx.beginPath();
  ctx.moveTo(0, Y(0));
  ctx.lineTo(X(HOLE_X - 18), Y(0));
  ctx.lineTo(X(HOLE_X - 16), Y(ICE_TOP));
  for (let x = HOLE_X - 16; x >= 0; x -= 12)
    ctx.lineTo(X(x - 6), Y(ICE_TOP + (x % 36 === 0 ? 10 : 3)));
  ctx.lineTo(0, Y(ICE_TOP));
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W, Y(0));
  ctx.lineTo(X(HOLE_X + 18), Y(0));
  ctx.lineTo(X(HOLE_X + 16), Y(ICE_TOP));
  for (let x = HOLE_X + 16; x <= ICE_W; x += 12)
    ctx.lineTo(X(x + 6), Y(ICE_TOP + (x % 36 === 0 ? 10 : 3)));
  ctx.lineTo(W, Y(ICE_TOP));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = ICE;
  ctx.fillRect(0, Y(-6), X(HOLE_X - 18), 12 * s);
  ctx.fillRect(X(HOLE_X + 18), Y(-6), W - X(HOLE_X + 18), 12 * s);
  ctx.strokeStyle = ICE_SHADE;
  ctx.lineWidth = 1 * s;
  for (const x of [40, 95, 250, 310]) {
    ctx.beginPath();
    ctx.moveTo(X(x), Y(6));
    ctx.lineTo(X(x + 12), Y(18));
    ctx.lineTo(X(x + 6), Y(30));
    ctx.stroke();
  }
  drawFisher(ctx, X(HOLE_X - 44), Y(-6), s, run, T, look);
  // A bucket on the other side, for the catch.
  ctx.fillStyle = '#B9472F';
  ctx.beginPath();
  ctx.moveTo(X(HOLE_X + 40), Y(-6));
  ctx.lineTo(X(HOLE_X + 60), Y(-6));
  ctx.lineTo(X(HOLE_X + 62), Y(-26));
  ctx.lineTo(X(HOLE_X + 38), Y(-26));
  ctx.closePath();
  ctx.fill();
  // Neil on the ice, by the bucket, or climbing out of the hole.
  if (seal && !neilIn) {
    if (seal.has && seal.prey)
      drawIceFish(ctx, X(seal.prey.x), Y(seal.prey.y), s, seal.prey, T, true);
    drawSealLie(
      ctx,
      X(seal.x),
      Y(seal.y),
      seal.dir,
      T,
      seal.phase === 'sit' ? Math.max(0, Math.sin(T * 0.9)) * 3 : 0,
      1.2 * s,
    );
  }
  // Snow, drifting down past the ice.
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 26; i++) {
    const x = (i * 71 + Math.sin(T * 0.7 + i) * 18 + 400) % ICE_W;
    const y = -280 + ((i * 37 + T * 26) % 280);
    ctx.beginPath();
    ctx.arc(X(x), Y(y), 1.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // How many on the line, and how many still under the hole today.
  ctx.font = `bold ${Math.round(13 * Math.max(1, s * 0.9))}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const label = `On the line ${run.line.length}/${LINE_MAX}  ·  ${left} left today`;
  const tw = ctx.measureText?.(label).width ?? label.length * 7;
  ctx.fillStyle = 'rgba(10,30,44,.55)';
  ctx.beginPath();
  // Bottom right: Back to the boat has the bottom left.
  const lx = W - tw - 30;
  ctx.roundRect?.(lx, H - 46, tw + 20, 28, 14);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(label, lx + 10, H - 32);
}

/** The fisher on a stool by the hole, in a warm hat in the colour of their own, the rod out over the hole, bending as
 * something bites. */
function drawFisher(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  run: IceRun,
  T: number,
  look: Look,
): void {
  // The stool.
  ctx.strokeStyle = '#7A5A3C';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, y);
  ctx.lineTo(x, y - 12 * s);
  ctx.lineTo(x + 6 * s, y);
  ctx.stroke();
  // Coat, head and the hat, the fisher's own skin and hat colour; out on the ice there is always a hat.
  ctx.fillStyle = '#2F5E8C';
  ctx.beginPath();
  ctx.ellipse(x, y - 22 * s, 8 * s, 11 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SKINS[look.skin] ?? '#F2C9A0';
  ctx.beginPath();
  ctx.arc(x + 1 * s, y - 36 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = HAT_COLOURS[look.hatColour]?.[0] ?? '#F2C230';
  ctx.beginPath();
  ctx.ellipse(x + 1 * s, y - 40 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 1 * s, y - 41 * s, 4.5 * s, Math.PI, 0);
  ctx.fill();
  // The rod, out over the hole; it bends while the line comes up loaded.
  const bend = run.phase === 'reel' ? 4 + run.line.length * 2 + Math.sin(T * 8) : 2;
  ctx.strokeStyle = '#3B2A1E';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(x + 5 * s, y - 24 * s);
  ctx.quadraticCurveTo(x + 18 * s, y - 34 * s, x + 28 * s, y - (28 - bend) * s);
  ctx.stroke();
}

/** One of them side on: a fish with its marks (the icefish clear as glass), a crab walking, or a jelly drifting. */
export function drawIceFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  f: IceFish,
  T: number,
  hooked = false,
): void {
  const z = (f.size / 2) * s;
  if (f.kind === 'jelly') {
    const beat = Math.sin(T * 2.4 + f.ph);
    ctx.fillStyle = 'rgba(230,240,255,.55)';
    ctx.strokeStyle = 'rgba(230,240,255,.55)';
    ctx.beginPath();
    ctx.ellipse(x, y, z * (1 + 0.1 * beat), z * 0.7, 0, Math.PI, 0);
    ctx.fill();
    ctx.lineWidth = 1 * s;
    for (let t = -2; t <= 2; t++) {
      ctx.beginPath();
      ctx.moveTo(x + t * z * 0.35, y);
      ctx.quadraticCurveTo(x + t * z * 0.35 + beat * 3 * s, y + z, x + t * z * 0.3, y + z * 1.9);
      ctx.stroke();
    }
    return;
  }
  const S = SPECIES[f.sp];
  if (!S) return;
  if (f.kind === 'crab') {
    const step = hooked ? 0 : Math.sin(T * 8 + f.ph);
    ctx.strokeStyle = S.c;
    ctx.lineWidth = 1.6 * s;
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const lx = x + side * (z * 0.5 + i * z * 0.18);
        ctx.beginPath();
        ctx.moveTo(x + side * z * 0.3, y);
        ctx.lineTo(lx + side * z * 0.4, y - z * 0.4 + (i % 2 ? step : -step) * 2 * s);
        ctx.lineTo(lx + side * z * 0.8, y + z * 0.5);
        ctx.stroke();
      }
    ctx.fillStyle = S.c;
    ctx.beginPath();
    ctx.ellipse(x, y, z * 0.6, z * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = S.mark ?? '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x - z * 0.15, y - z * 0.1, z * 0.12, 0, Math.PI * 2);
    ctx.arc(x + z * 0.15, y - z * 0.1, z * 0.12, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const dir = hooked ? 1 : f.vx >= 0 ? 1 : -1;
  const wag = Math.sin(T * 9 + f.ph) * 0.25;
  ctx.save();
  ctx.translate(x, y);
  if (hooked) ctx.rotate(-Math.PI / 2 + wag * 0.4);
  ctx.scale(dir, 1);
  if (f.kind === 'icefish') ctx.globalAlpha = 0.6;
  ctx.fillStyle = S.c;
  ctx.beginPath();
  ctx.ellipse(0, 0, z, z * S.fat * 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-z * 0.85, 0);
  ctx.lineTo(-z * (1.4 + wag * 0.2), -z * S.tail * 0.45);
  ctx.lineTo(-z * (1.4 - wag * 0.2), z * S.tail * 0.45);
  ctx.closePath();
  ctx.fill();
  if (S.mark) {
    ctx.strokeStyle = S.mark;
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    if (f.kind === 'icefish') {
      // You can see its spine through it.
      ctx.moveTo(-z * 0.8, 0);
      ctx.lineTo(z * 0.7, 0);
      for (let i = -3; i <= 3; i++) {
        ctx.moveTo(i * z * 0.2, -z * 0.2);
        ctx.lineTo(i * z * 0.2, z * 0.2);
      }
    } else {
      ctx.moveTo(-z * 0.6, -z * S.fat * 0.6);
      ctx.lineTo(z * 0.6, -z * S.fat * 0.6);
    }
    ctx.stroke();
  }
  if (S.dot) {
    ctx.fillStyle = 'rgba(255,240,220,.9)';
    for (const [dx, dy] of [
      [-0.3, -0.15],
      [0, 0.1],
      [0.3, -0.2],
    ] as const) {
      ctx.beginPath();
      ctx.arc(dx * z, dy * z, z * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#16232B';
  ctx.beginPath();
  ctx.arc(z * 0.6, -z * 0.08, z * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
