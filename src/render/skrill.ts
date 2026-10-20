/**
 * Skrill (entities/skrill.ts) and the top of his tower. He is drawn from the kid's first drawing: tall, two great
 * curling horns, bat wings, a black robe edged in purple, grey skin, yellow eyes and a wide grin; the orb in one
 * hand, glowing purple like island 9's, and a bone-white sword in the other. His wings fold on his back on foot and
 * beat up in the air. The warnings on his floor: a red fan where his sword will sweep, three red rings where his orb's
 * bolts will fall, a red lane he will swoop down. Beaten, he lies crashed on his floor, one horn snapped off beside
 * him.
 *
 * The top of the tower is open to a dark red sky: black stone, battlements with little bone skulls on them, and at
 * the back his throne of bones.
 */

import type { DrawView } from '../entities/entity';
import {
  AIM_T,
  BOLT_R,
  FALL_T,
  LAUGH_T,
  SKRILL_HIGH,
  type Skrill,
  SLASH_REACH,
  SLASH_WINDUP,
  SPELL_WINDUP,
  TAKEOFF_T,
} from '../entities/skrill';
import type { Room } from '../world/tower';

const ROBE = '#141018';
const TRIM = '#8A4FD8';
const SKIN = '#8C8796';
const HORN = '#E9DFC4';
const WING = '#2A1B3A';
const EYE = '#FFD23A';
const BONE = '#E4DCC6';
const SCALE = 1.4;
const D = Math.SQRT1_2;

const hash = (i: number, k: number): number => {
  const h = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return h - Math.floor(h);
};

/** The sky over the tower, its black floor and battlements, and his throne at the back. */
export function drawSkrillTop(v: DrawView, R: Room, W: number, H: number): void {
  const { ctx, px, py, T, zoom: Z } = v;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1A0710');
  g.addColorStop(1, '#4A1428');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 36; i++) {
    ctx.globalAlpha = 0.25 + 0.3 * Math.sin(T * 1.3 + i * 2.7);
    ctx.fillRect(hash(i, 1) * W, hash(i, 2) * H * 0.5, 2, 2);
  }
  ctx.globalAlpha = 1;
  // A red moon low behind the tower.
  ctx.fillStyle = 'rgba(255,90,90,.18)';
  ctx.beginPath();
  ctx.arc(W * 0.78, H * 0.16, 46 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#D9534F';
  ctx.beginPath();
  ctx.arc(W * 0.78, H * 0.16, 26 * Z, 0, Math.PI * 2);
  ctx.fill();
  // The tower's top: its side going down out of sight, then the floor.
  v.isoEllipse(R.x, R.y, R.r + 6, -40);
  ctx.fillStyle = '#0B080E';
  ctx.fill();
  v.isoEllipse(R.x, R.y, R.r + 6, -2);
  ctx.fillStyle = '#1B1620';
  ctx.fill();
  v.isoEllipse(R.x, R.y, R.r);
  ctx.fillStyle = '#2E2834';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 2 * Z;
  for (const k of [0.75, 0.5, 0.25]) {
    v.isoEllipse(R.x, R.y, R.r * k);
    ctx.stroke();
  }
  // A skull set into the floor's middle, in bone, its eyes lit purple.
  const sx = px(R.x, R.y);
  const sy = py(R.x, R.y);
  ctx.fillStyle = 'rgba(228,220,198,.5)';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 3 * Z, 22 * Z, 11 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(sx - 12 * Z, sy + 4 * Z, 24 * Z, 5 * Z);
  const k = 0.5 + 0.4 * Math.sin(T * 2);
  ctx.fillStyle = `rgba(170,90,255,${k})`;
  for (const dx of [-8, 8]) {
    ctx.beginPath();
    ctx.ellipse(sx + dx * Z, sy - 3 * Z, 4.5 * Z, 2.6 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The battlements round the back half, little bone skulls on them.
  battlements(v, R, Math.PI * 0.75, Math.PI * 1.75, 12);
  // His throne of bones at the back.
  const tx = R.x - R.r * 0.62 * D;
  const ty = R.y - R.r * 0.62 * D;
  const bx = px(tx, ty);
  const by = py(tx, ty);
  ctx.fillStyle = '#C9C0A8';
  ctx.fillRect(bx - 16 * Z, by - 52 * Z, 32 * Z, 44 * Z);
  ctx.fillStyle = '#2A1B3A';
  ctx.fillRect(bx - 11 * Z, by - 46 * Z, 22 * Z, 30 * Z);
  ctx.fillStyle = BONE;
  for (const dx of [-16, 16]) {
    ctx.beginPath();
    ctx.arc(bx + dx * Z, by - 54 * Z, 5 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#B7AE96';
  ctx.fillRect(bx - 20 * Z, by - 12 * Z, 40 * Z, 8 * Z);
}

/** The battlements round the near half of his floor, drawn over the figure. */
export function drawSkrillRail(v: DrawView, R: Room): void {
  battlements(v, R, -Math.PI * 0.25, Math.PI * 0.75, 12);
}

function battlements(v: DrawView, R: Room, a0: number, a1: number, n: number): void {
  const { ctx, px, py, zoom: Z } = v;
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / n;
    const x = R.x + Math.cos(a) * (R.r + 2);
    const y = R.y + Math.sin(a) * (R.r + 2);
    const sx = px(x, y);
    const sy = py(x, y);
    ctx.fillStyle = '#17121C';
    ctx.fillRect(sx - 7 * Z, sy - 16 * Z, 14 * Z, 16 * Z);
    ctx.fillStyle = '#231C2A';
    ctx.fillRect(sx - 7 * Z, sy - 16 * Z, 14 * Z, 3 * Z);
    if (i % 2 === 0) {
      ctx.fillStyle = BONE;
      ctx.beginPath();
      ctx.arc(sx, sy - 20 * Z, 3.6 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#120E16';
      for (const dx of [-1.3, 1.3])
        ctx.fillRect(sx + (dx - 0.6) * Z, sy - 21 * Z, 1.2 * Z, 1.4 * Z);
    }
  }
}

/** Skrill where he stands, up on his wings, or crashed on his floor. */
export function drawSkrill(v: DrawView, s: Skrill): void {
  if (s.state === 'gone') return;
  const { ctx, px, py, T, zoom: Z } = v;
  const sx = px(s.x, s.y);
  const sy = py(s.x, s.y);
  const face = px(s.x + Math.cos(s.h), s.y + Math.sin(s.h)) >= sx ? 1 : -1;
  const down = s.state === 'down';
  const fall = s.state === 'fall' ? Math.min(1, s.t / FALL_T) : down ? 1 : 0;
  const flying =
    s.state === 'rise' ||
    s.state === 'hover' ||
    s.state === 'spell' ||
    s.state === 'bolts' ||
    s.state === 'aim' ||
    s.state === 'swoop';
  // His shadow on the floor, smaller the higher he is.
  const sh = 1 - Math.min(1, s.z / SKRILL_HIGH) * 0.5;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 26 * Z * sh, 9 * Z * sh, 0, 0, Math.PI * 2);
  ctx.fill();
  const laugh = s.state === 'laugh' ? Math.sin(s.t * 30) * 1.5 : 0;
  ctx.save();
  ctx.translate(sx, py(s.x, s.y, s.z) + laugh * Z);
  ctx.rotate(fall * face * 1.35);
  ctx.scale(face * Z * SCALE, Z * SCALE);
  const flash = s.flash > 0;
  // Wings: folded behind him on foot, beating up in the air.
  const beat = flying ? Math.sin(T * 9) : 0;
  const spread = flying ? 1 : s.state === 'laugh' ? 0.6 + 0.2 * Math.sin(T * 6) : 0.25;
  ctx.fillStyle = flash ? '#E6DCF0' : WING;
  ctx.strokeStyle = 'rgba(160,110,220,.6)';
  ctx.lineWidth = 0.8;
  for (const side of [-1, 1]) {
    const tip = -60 - 18 * spread - beat * 10;
    ctx.beginPath();
    ctx.moveTo(side * 4, -38);
    ctx.lineTo(side * (14 + 30 * spread), tip);
    ctx.lineTo(side * (20 + 26 * spread), tip + 18);
    ctx.lineTo(side * (14 + 18 * spread), tip + 14);
    ctx.lineTo(side * (16 + 20 * spread), tip + 30);
    ctx.lineTo(side * (10 + 12 * spread), tip + 26);
    ctx.lineTo(side * 6, -24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Legs, then the robe, flaring down to the floor.
  ctx.fillStyle = flash ? '#E6DCF0' : ROBE;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 5, -5, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.quadraticCurveTo(-11, -30, -8, -40);
  ctx.quadraticCurveTo(0, -46, 8, -40);
  ctx.quadraticCurveTo(11, -30, 12, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = TRIM;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.lineTo(12, -6);
  ctx.moveTo(0, -42);
  ctx.lineTo(0, -6);
  ctx.stroke();
  // His head: grey, a wide grin, yellow eyes, and the horns.
  ctx.fillStyle = flash ? '#FFFFFF' : SKIN;
  ctx.beginPath();
  ctx.arc(1, -49, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = EYE;
  for (const dx of [2, 6]) {
    ctx.beginPath();
    ctx.arc(dx, -51, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#1A1020';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(3, -47, 3.6, 0.15, Math.PI - 0.4);
  ctx.stroke();
  ctx.save();
  ctx.translate(-3, -55);
  ctx.rotate(-0.4);
  horn(ctx, 1, -1);
  ctx.restore();
  if (!s.beaten || s.state === 'fall') {
    ctx.save();
    ctx.translate(5, -55);
    ctx.rotate(0.4);
    horn(ctx, 1, 1);
    ctx.restore();
  } else {
    // Snapped off: a jagged stump.
    ctx.fillStyle = HORN;
    ctx.fillRect(4, -58, 3, 3);
  }
  // The sword in his front hand: at his side, drawn back, swung through, or held out down the lane.
  const sw = s.swing;
  const a =
    sw < 0
      ? -0.5 + sw * 2
      : sw > 0
        ? -2.5 + sw * 3.6
        : s.state === 'swoop' || s.state === 'aim'
          ? -1.2
          : 0.8;
  ctx.save();
  ctx.translate(9, -32);
  ctx.rotate(a);
  ctx.fillStyle = '#2A1B3A';
  ctx.fillRect(-1.5, -2, 3, 6);
  ctx.fillRect(-5, 3, 10, 2);
  ctx.fillStyle = flash ? '#FFFFFF' : BONE;
  ctx.beginPath();
  ctx.moveTo(-2, 5);
  ctx.lineTo(2, 5);
  ctx.lineTo(1.2, 34);
  ctx.lineTo(0, 39);
  ctx.lineTo(-1.2, 34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // The orb in his back hand: low at his side, or raised high and blazing for a spell.
  const raised = s.state === 'spell' || s.state === 'bolts' || s.state === 'laugh';
  const ox = -9;
  const oy = raised ? -64 : -30;
  const glow =
    s.state === 'spell' ? 0.6 + 0.4 * Math.min(1, s.t / SPELL_WINDUP) : raised ? 0.7 : 0.35;
  const gr = ctx.createRadialGradient(ox, oy, 0, ox, oy, 16);
  gr.addColorStop(0, `rgba(210,170,255,${glow})`);
  gr.addColorStop(1, 'rgba(210,170,255,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.arc(ox, oy, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#B57CFF';
  ctx.beginPath();
  ctx.arc(ox, oy, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath();
  ctx.arc(ox - 1.4, oy - 1.4, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = flash ? '#FFFFFF' : SKIN;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-7, -38);
  ctx.lineTo(ox, oy + 4);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
  // A purple spark trailing off the orb as he wakes, laughing.
  if (s.state === 'laugh') {
    const k = Math.min(1, s.t / LAUGH_T);
    ctx.fillStyle = `rgba(200,150,255,${0.6 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(
      sx - 9 * face * Z * SCALE,
      py(s.x, s.y, s.z) - (64 + k * 30) * Z * SCALE,
      (4 + k * 10) * Z,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  if (s.state === 'rise') {
    // Dust off the floor as his wings take him up.
    const k = Math.min(1, s.t / TAKEOFF_T);
    ctx.strokeStyle = `rgba(200,190,210,${0.5 * (1 - k)})`;
    ctx.lineWidth = 2 * Z;
    v.isoEllipse(s.x, s.y, 20 + k * 30);
    ctx.stroke();
  }
}

/** His snapped horn on his floor where he fell, once he has crashed down; there after he is gone, too. */
export function drawSkrillHorn(v: DrawView, s: Skrill): void {
  if (!s.hornAt) return;
  const { ctx, px, py, zoom: Z } = v;
  ctx.save();
  ctx.translate(px(s.hornAt.x, s.hornAt.y), py(s.hornAt.x, s.hornAt.y));
  ctx.rotate(0.4);
  horn(ctx, Z * SCALE, 1);
  ctx.restore();
}

/** A horn, curling up and out: s its size, side which way it curls. */
function horn(ctx: CanvasRenderingContext2D, s: number, side: number): void {
  ctx.fillStyle = HORN;
  ctx.strokeStyle = 'rgba(120,100,70,.7)';
  ctx.lineWidth = 0.6 / s;
  ctx.beginPath();
  ctx.moveTo(-2.5 * s, 0);
  ctx.quadraticCurveTo(side * 6 * s, -6 * s, side * 4 * s, -14 * s);
  ctx.quadraticCurveTo(side * 9 * s, -8 * s, 2.5 * s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** The warnings on his floor: the sword's fan, the orb's three rings and its bolts falling, the swoop's lane. */
export function drawSkrillMark(v: DrawView, s: Skrill): void {
  const { ctx, px, py, zoom: Z } = v;
  if ((s.state === 'windup' || s.state === 'slash') && s.fan) {
    const k = s.state === 'windup' ? Math.min(1, s.t / SLASH_WINDUP) : 1;
    const f = s.fan;
    ctx.fillStyle = `rgba(220,60,50,${s.state === 'slash' ? 0.55 : 0.12 + 0.3 * k})`;
    ctx.strokeStyle = `rgba(255,120,90,${0.4 + 0.5 * k})`;
    ctx.lineWidth = 2 * Z;
    ctx.beginPath();
    ctx.moveTo(px(f.x, f.y), py(f.x, f.y));
    for (let i = 0; i <= 18; i++) {
      const a = f.a0 + ((f.a1 - f.a0) * i) / 18;
      const x = f.x + Math.cos(a) * SLASH_REACH;
      const y = f.y + Math.sin(a) * SLASH_REACH;
      ctx.lineTo(px(x, y), py(x, y));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }
  if ((s.state === 'spell' || s.state === 'bolts') && s.bolts.length) {
    const k = s.state === 'spell' ? Math.min(1, s.t / SPELL_WINDUP) : 1;
    for (const b of s.bolts) {
      ctx.fillStyle = `rgba(220,60,50,${0.12 + 0.35 * k})`;
      ctx.strokeStyle = `rgba(255,120,90,${0.4 + 0.5 * k})`;
      ctx.lineWidth = 2 * Z;
      v.isoEllipse(b.x, b.y, BOLT_R);
      ctx.fill();
      ctx.stroke();
      if (s.state === 'bolts') {
        // The bolt coming down into it.
        const z = SKRILL_HIGH * (1 - s.boltFall) + 10;
        ctx.fillStyle = 'rgba(200,150,255,.35)';
        ctx.beginPath();
        ctx.arc(px(b.x, b.y), py(b.x, b.y, z), 11 * Z, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#D9B8FF';
        ctx.beginPath();
        ctx.arc(px(b.x, b.y), py(b.x, b.y, z), 5 * Z, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }
  if (s.state === 'aim' || s.state === 'swoop') {
    const k = s.state === 'aim' ? Math.min(1, s.t / AIM_T) : 1;
    const ux = s.to.x - s.from.x;
    const uy = s.to.y - s.from.y;
    const l = Math.hypot(ux, uy) || 1;
    const nx = (-uy / l) * 24;
    const ny = (ux / l) * 24;
    ctx.fillStyle = `rgba(220,60,50,${0.1 + 0.3 * k})`;
    ctx.strokeStyle = `rgba(255,120,90,${0.35 + 0.5 * k})`;
    ctx.lineWidth = 2 * Z;
    ctx.beginPath();
    ctx.moveTo(px(s.from.x + nx, s.from.y + ny), py(s.from.x + nx, s.from.y + ny));
    ctx.lineTo(px(s.to.x + nx, s.to.y + ny), py(s.to.x + nx, s.to.y + ny));
    ctx.lineTo(px(s.to.x - nx, s.to.y - ny), py(s.to.x - nx, s.to.y - ny));
    ctx.lineTo(px(s.from.x - nx, s.from.y - ny), py(s.from.x - nx, s.from.y - ny));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
