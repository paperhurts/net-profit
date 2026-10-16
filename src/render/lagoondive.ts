/**
 * Island 11's black lagoon, side on (world/lagoondive.ts): over its still surface the jungle hanging close, dark leaves
 * and the odd lily pad; under it roots trailing down along both banks, swaying; a bowl of black mud with what fell in
 * from the ruins, broken columns and bones, and among them the skull key, an old key of bone with a grinning skull for
 * its bow, glinting pale green. Its creatures (entities/lagoonfolk.ts) swim side on: green and scaly, a fin for a
 * crest, webbed claws reaching ahead and frog legs kicking behind, their big pale eyes glowing in the dark over the
 * lamp's edge. And the friends who swim down with the diver: the naga, all of him, his tail streaming out behind, and
 * the baby Reaper, legs paddling.
 */

import { K } from '../core/iso';
import type { DrawView } from '../entities/entity';
import type { DivePal, LagoonCreature } from '../entities/lagoonfolk';
import { BABY_SEA_LEN, drawNaga } from '../entities/pals';
import {
  LAGOON_BONES,
  LAGOON_ROOTS,
  LAGOON_STONES,
  LW,
  lagoonFloor,
  SKULL_KEY,
} from '../world/lagoondive';
import { drawReaperBody } from './reaper';

type Proj = (v: number) => number;

const MUD = '#17150E';
const MUD_DEEP = '#080704';
const ROOT = '#3A2C1E';
const STONE = '#55605A';
const STONE_DARK = '#38423D';
const MOSS = '#3E6B3A';
const BONE = '#D9D2BC';

/** The bank's edge across the whole view: the mud, rising out of the water past both ends. */
function bankAt(x: number): number {
  if (x < 0) return lagoonFloor(0) + x * 2.2;
  if (x > LW) return lagoonFloor(LW) - (x - LW) * 2.2;
  return lagoonFloor(x);
}

/** The jungle over the surface, the mud and the banks, the roots, and what lies on the bottom. */
export function drawLagoonScene(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  T: number,
  top: number,
  bottom: number,
): void {
  // The jungle leaning over the water: dark leafy masses, darker toward the banks.
  if (top < 0) {
    for (let i = 0; i < 14; i++) {
      const x = -60 + i * 52 + Math.sin(i * 2.3) * 18;
      const r = 40 + ((i * 37) % 30);
      ctx.fillStyle = i % 2 ? '#14301B' : '#183A20';
      ctx.beginPath();
      ctx.arc(X(x), Y(-r * 0.6 - 18), r * s, 0, Math.PI * 2);
      ctx.fill();
    }
    // The surface from below: a dull sheen, and lily pads floating on it.
    ctx.fillStyle = 'rgba(120,160,120,.18)';
    ctx.fillRect(X(-200), Y(-1.5), (LW + 400) * s, 3 * s);
    for (const lx of [150, 220, 420, 470, 520]) {
      ctx.fillStyle = '#2F5E2E';
      ctx.beginPath();
      ctx.ellipse(X(lx), Y(-0.5), 11 * s, 2.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The mud: the banks rising out of the water at both ends, the bowl between, darker down.
  const g = ctx.createLinearGradient(0, Y(40), 0, Y(300));
  g.addColorStop(0, MUD);
  g.addColorStop(1, MUD_DEEP);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(X(-220), Y(Math.max(bottom, 300) + 80));
  for (let x = -220; x <= LW + 220; x += 12) ctx.lineTo(X(x), Y(bankAt(x)));
  ctx.lineTo(X(LW + 220), Y(Math.max(bottom, 300) + 80));
  ctx.closePath();
  ctx.fill();
  // The roots, trailing down from the banks, swaying a little.
  ctx.lineCap = 'round';
  for (const r of LAGOON_ROOTS) {
    const sway = Math.sin(T * 0.7 + r.ph) * 4;
    ctx.strokeStyle = ROOT;
    ctx.lineWidth = 2.4 * s;
    ctx.beginPath();
    ctx.moveTo(X(r.x), Y(-8));
    ctx.quadraticCurveTo(X(r.x + sway * 0.5 + 6), Y(r.len * 0.5), X(r.x + sway), Y(r.len));
    ctx.stroke();
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(X(r.x + sway * 0.3 + 3), Y(r.len * 0.45));
    ctx.lineTo(X(r.x + sway * 0.6 + 10), Y(r.len * 0.65));
    ctx.stroke();
  }
  // What fell in from the ruins: broken columns lying in the mud, one standing, a block or two, mossy.
  for (const st of LAGOON_STONES) {
    const fy = lagoonFloor(st.x);
    ctx.save();
    ctx.translate(X(st.x), Y(fy));
    ctx.rotate(st.tilt);
    ctx.fillStyle = STONE;
    if (st.kind === 'drum') {
      ctx.fillRect((-st.w / 2) * s, -st.h * s, st.w * s, st.h * s);
      ctx.fillStyle = STONE_DARK;
      for (let i = 1; i < 4; i++)
        ctx.fillRect((-st.w / 2 + (st.w * i) / 4) * s, -st.h * s, 1.2 * s, st.h * s);
      ctx.fillStyle = '#6E7A72';
      ctx.beginPath();
      ctx.ellipse((st.w / 2) * s, (-st.h / 2) * s, 3 * s, (st.h / 2) * s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo((-st.w / 2) * s, 0);
      ctx.lineTo((-st.w / 2) * s, -st.h * s);
      ctx.lineTo((-st.w / 6) * s, (-st.h + 5) * s);
      ctx.lineTo((st.w / 6) * s, (-st.h - 3) * s);
      ctx.lineTo((st.w / 2) * s, (-st.h + 4) * s);
      ctx.lineTo((st.w / 2) * s, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = MOSS;
    ctx.fillRect((-st.w / 2) * s, (-st.h - 1) * s, st.w * s, 2.4 * s);
    ctx.restore();
  }
  // Old bones in the mud.
  for (const b of LAGOON_BONES) {
    const by = lagoonFloor(b.x);
    ctx.strokeStyle = BONE;
    ctx.fillStyle = BONE;
    if (b.kind === 'skull') {
      ctx.beginPath();
      ctx.arc(X(b.x), Y(by - 4), 5 * s, Math.PI, 0);
      ctx.lineTo(X(b.x + 4), Y(by));
      ctx.lineTo(X(b.x - 4), Y(by));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#141008';
      for (const e of [-1.8, 1.8]) {
        ctx.beginPath();
        ctx.arc(X(b.x + e), Y(by - 4), 1.3 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.lineWidth = 1.4 * s;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(X(b.x - 6 + i * 4), Y(by), 5 * s, Math.PI, Math.PI * 1.9);
        ctx.stroke();
      }
    }
  }
}

/** The skull key in the mud: an old key of bone, its bow a grinning skull, its bit two notched teeth. */
export function drawSkullKey(ctx: CanvasRenderingContext2D, X: Proj, Y: Proj, s: number): void {
  const x = X(SKULL_KEY.x);
  const y = Y(SKULL_KEY.y);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.22);
  ctx.fillStyle = BONE;
  ctx.strokeStyle = '#3A3428';
  ctx.lineWidth = 0.8 * s;
  // The shaft and its bit.
  ctx.fillRect(-2 * s, -1.4 * s, 16 * s, 2.8 * s);
  ctx.fillRect(10 * s, 1 * s, 2.4 * s, 4 * s);
  ctx.fillRect(13.6 * s, 1 * s, 2.4 * s, 3 * s);
  // The skull bow.
  ctx.beginPath();
  ctx.arc(-6 * s, -1 * s, 5.4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-9 * s, 2.5 * s, 6 * s, 3 * s);
  ctx.fillStyle = '#141008';
  for (const e of [-8, -4]) {
    ctx.beginPath();
    ctx.arc(e * s, -1.6 * s, 1.4 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillRect(-6.6 * s, 0.8 * s, 1.2 * s, 1.4 * s);
  for (const t of [-8.4, -6.6, -4.8]) ctx.fillRect(t * s, 3.4 * s, 0.6 * s, 1.6 * s);
  ctx.restore();
}

/** Its glint, over the dark: a pale green glow, breathing, and a twinkle now and then. */
export function drawKeyGlint(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  T: number,
): void {
  const x = X(SKULL_KEY.x - 4);
  const y = Y(SKULL_KEY.y - 1);
  const pulse = 0.55 + 0.35 * Math.sin(T * 2.2);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, 30 * s);
  g.addColorStop(0, `rgba(190,255,190,${0.45 * pulse})`);
  g.addColorStop(1, 'rgba(190,255,190,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 30 * s, 0, Math.PI * 2);
  ctx.fill();
  const tw = Math.max(0, Math.sin(T * 3.1)) ** 6;
  if (tw > 0.05) {
    ctx.strokeStyle = `rgba(240,255,240,${tw})`;
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(x - 7 * s * tw, y);
    ctx.lineTo(x + 7 * s * tw, y);
    ctx.moveTo(x, y - 7 * s * tw);
    ctx.lineTo(x, y + 7 * s * tw);
    ctx.stroke();
  }
  ctx.restore();
}

const SCALE = '#2F6B4A';
const BELLY = '#8FC49A';
const FIN = '#1E5A3C';
const LIMB = '#3E8A5E';
const TALON = '#D8E6C0';
const EYE = '#E8F0B0';

/**
 * A lagoon creature swimming, side on, nose toward its face: a long scaly body, a fin for a crest from its head down
 * its back, frog legs kicking behind, webbed hands reaching ahead (raised high when it is about to claw), and a big
 * pale eye. Beaten, it fades as it swims off down into the dark; hit, it flashes pale.
 */
export function drawLagoonCreature(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  c: LagoonCreature,
): void {
  if (c.state === 'gone') return;
  const x = X(c.x);
  const y = Y(c.y);
  const f = c.face;
  const Z = s * 1.25;
  const kick = Math.sin(c.ph);
  ctx.save();
  if (c.state === 'beaten') ctx.globalAlpha = Math.max(0, c.t / 1.4);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Its legs, kicking behind: thigh and shin, webbed feet.
  for (const k of [1, -1]) {
    const bend = kick * k;
    const hx = x - f * 9 * Z;
    const hy = y + 1.5 * Z;
    const kx = hx - f * 7 * Z;
    const ky = hy + (3 + bend * 3) * Z;
    const fx = kx - f * 7 * Z;
    const fy = ky - (1 + bend * 2) * Z;
    ctx.strokeStyle = k > 0 ? '#1F4A34' : LIMB;
    ctx.lineWidth = 2.6 * Z;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(kx, ky);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.fillStyle = FIN;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 2 * Z);
    ctx.lineTo(fx - f * 5 * Z, fy - 3 * Z);
    ctx.lineTo(fx - f * 5 * Z, fy + 3 * Z);
    ctx.lineTo(fx, fy + 2 * Z);
    ctx.closePath();
    ctx.fill();
  }
  // The body, long and low, the pale belly under, and the crest along its back.
  ctx.fillStyle = FIN;
  ctx.beginPath();
  ctx.moveTo(x + f * 9 * Z, y - 6 * Z);
  for (let i = 0; i <= 6; i++) {
    const u = i / 6;
    ctx.lineTo(x + f * (9 - u * 20) * Z, y - (6 + (i % 2 ? 4 : 1.5)) * Z + u * 2 * Z);
  }
  ctx.lineTo(x - f * 11 * Z, y - 3 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = SCALE;
  ctx.beginPath();
  ctx.ellipse(x, y, 12 * Z, 5.4 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BELLY;
  ctx.beginPath();
  ctx.ellipse(x + f * 1 * Z, y + 2.6 * Z, 8.5 * Z, 2.4 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // Its arms, out ahead: reaching as it swims, raised high with the claws spread when it is about to claw.
  const up = c.claws;
  for (const k of [1, -1]) {
    const sx = x + f * 6 * Z;
    const sy = y + (k > 0 ? 1 : -1) * Z;
    const reach = 9 - up * 3;
    const ex = sx + f * reach * Z;
    const ey = sy - (up * 10 + Math.sin(c.ph + k) * 1.5) * Z;
    ctx.strokeStyle = k > 0 ? LIMB : '#1F4A34';
    ctx.lineWidth = 2.2 * Z;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = TALON;
    ctx.lineWidth = 0.9 * Z;
    for (const t of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + f * 3.4 * Z, ey + (t * 1.6 - up * 1.2) * Z);
      ctx.stroke();
    }
  }
  // The head, at the front: a wide flat head, a gill slit or two, and the big pale eye with its slit.
  const hx = x + f * 12 * Z;
  const hy = y - 1.5 * Z;
  ctx.fillStyle = SCALE;
  ctx.beginPath();
  ctx.ellipse(hx, hy, 6 * Z, 4.6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = FIN;
  ctx.lineWidth = 0.8 * Z;
  for (const g of [0, 1.6]) {
    ctx.beginPath();
    ctx.moveTo(hx - f * (3.4 + g) * Z, hy - 1 * Z);
    ctx.lineTo(hx - f * (3.4 + g) * Z, hy + 2.4 * Z);
    ctx.stroke();
  }
  ctx.fillStyle = EYE;
  ctx.beginPath();
  ctx.arc(hx + f * 1.8 * Z, hy - 1.4 * Z, 2.3 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0A0F0C';
  ctx.fillRect(hx + f * 1.8 * Z - 0.4 * Z, hy - 3.2 * Z, 0.8 * Z, 3.6 * Z);
  if (c.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,255,255,${c.flash * 0.6})`;
    ctx.beginPath();
    ctx.ellipse(x + f * 3 * Z, y, 16 * Z, 7 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Its big pale eye, glowing over the dark, so a creature beyond the lamp shows as an eye watching. */
export function drawCreatureEye(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  c: LagoonCreature,
  T: number,
): void {
  if (!c.out) return;
  const Z = s * 1.25;
  const ex = X(c.x) + c.face * 13.8 * Z;
  const ey = Y(c.y) - 2.9 * Z;
  const blink = Math.sin(T * 0.9 + c.home.x) > 0.97 ? 0.2 : 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(232,240,176,${0.55 * blink})`;
  ctx.beginPath();
  ctx.arc(ex, ey, 2.2 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(232,240,176,${0.18 * blink})`;
  ctx.beginPath();
  ctx.arc(ex, ey, 5 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * A view that draws the game's companions, made for its tilted sea, side on in the dive: the naga's own drawing takes
 * a screen point, and the Reaper's body a world point turned to face the screen's side.
 */
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

/** A friend swimming down there: the naga, whole, tail out behind; or the baby Reaper, legs paddling, nipping. */
export function drawDivePal(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  p: DivePal,
  T: number,
): void {
  const v = sideView(ctx, X(p.x), Y(p.y), s, T);
  const h = p.face > 0 ? 0 : Math.PI;
  if (p.kind === 'naga') {
    drawNaga(v, X(p.x), Y(p.y) + 10 * s, h, p.ph, 1, p.swingT > 0, 1, 'under');
    return;
  }
  drawReaperBody(v, 0, 0, 0, p.face > 0 ? -Math.PI / 4 : (3 * Math.PI) / 4, Math.sin(p.ph) * 0.08, {
    T,
    len: BABY_SEA_LEN,
    legs: 'swim',
    mouth: p.swingT > 0 ? 0.8 : 0,
    young: true,
  });
}
