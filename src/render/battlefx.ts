/**
 * The Endless Isle's battle badges, drawn: what Badges II and III look like when they are used, each side in its own
 * look for the same thing (data/battle.ts). All in screen space at a zoom Z, so the battle and the badge ceremony's
 * little show draw them the same: a ring on the ground is given as its middle and its two radii, the iso ellipse.
 *
 * The tank's guard: the pirates' ship's wheel held up as a shield, the ninjas' skin gone grey as stone. Its stomp: a
 * red ring while it winds up, then the pirates' anchor slammed down, the ninjas' ground cracking, dust thrown up, and
 * stars round the heads of all it stunned. The damage's leap: the pirates' swing in on a rope, the ninjas' step out of
 * smoke behind. Its bomb: the pirates' fizzing powder keg, the ninjas' firework, in a red ring, then the burst. The
 * healer's heal over time: lime slices or cherry petals round whoever has it. Its group heal: notes rising from the
 * pirate singing a shanty, a glowing lotus ring on the ground for the ninjas.
 */

import type { Ability, Role } from '../data/battle';
import type { DrawView } from '../entities/entity';
import { rival, type Side } from '../world/endless';
import { drawCrew } from './crew';

type Ctx = CanvasRenderingContext2D;

/** The pirates' ship's wheel, or the ninjas' stone, round a fighter whose feet are at sx, sy; t its time so far. */
export function drawGuard(
  ctx: Ctx,
  sx: number,
  sy: number,
  Z: number,
  side: Side,
  t: number,
): void {
  const pulse = 0.75 + Math.sin(t * 6) * 0.1;
  ctx.save();
  if (side === 'pirate') {
    // A wheel of dark wood in front of it, spokes and all, a golden shimmer round.
    const cx = sx + 9 * Z;
    const cy = sy - 13 * Z;
    const r = 9 * Z;
    ctx.globalAlpha *= pulse;
    ctx.strokeStyle = 'rgba(255,214,120,.55)';
    ctx.lineWidth = 5 * Z;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2 * Z, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#6B4424';
    ctx.lineWidth = 2.4 * Z;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + t * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * (r + 3 * Z), cy + Math.sin(a) * (r + 3 * Z));
      ctx.stroke();
    }
    ctx.fillStyle = '#C9A46A';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.6 * Z, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // A shell of grey stone over it, with a crack or two.
    ctx.globalAlpha *= 0.55 * pulse;
    ctx.fillStyle = '#8E949C';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 12 * Z, 10 * Z, 15 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha /= 0.55;
    ctx.strokeStyle = 'rgba(60,64,70,.8)';
    ctx.lineWidth = 1.2 * Z;
    ctx.beginPath();
    ctx.moveTo(sx - 4 * Z, sy - 22 * Z);
    ctx.lineTo(sx - 1 * Z, sy - 16 * Z);
    ctx.lineTo(sx - 4 * Z, sy - 11 * Z);
    ctx.moveTo(sx + 5 * Z, sy - 8 * Z);
    ctx.lineTo(sx + 2 * Z, sy - 3 * Z);
    ctx.stroke();
  }
  ctx.restore();
}

/** Stars going round the head of one stunned, feet at sx, sy. */
export function drawStun(ctx: Ctx, sx: number, sy: number, Z: number, t: number): void {
  ctx.save();
  for (let k = 0; k < 3; k++) {
    const a = t * 6 + (k / 3) * Math.PI * 2;
    const x = sx + Math.cos(a) * 8 * Z;
    const y = sy - 30 * Z + Math.sin(a) * 3 * Z;
    ctx.fillStyle = k === 1 ? '#FFF3C4' : '#FFD84A';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = (i % 2 ? 1.2 : 3) * Z;
      const b = (i / 10) * Math.PI * 2 + a;
      ctx.lineTo(x + Math.cos(b) * r, y + Math.sin(b) * r);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** A red ring on the ground at cx, cy, radii rx and ry: a warning, its inside filling as k goes from 0 to 1. */
export function drawWarnRing(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  k: number,
): void {
  ctx.save();
  ctx.fillStyle = `rgba(228,60,46,${0.12 + 0.18 * k})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * Math.max(0.05, k), ry * Math.max(0.05, k), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(228,60,46,${0.6 + 0.4 * k})`;
  ctx.lineWidth = Math.max(2, rx * 0.04);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * A base's ring in Hold the Forts, at cx, cy, radii rx and ry: tinted the colour of whoever holds it (plain if nobody
 * does), a band round its edge filling with the colour of whoever is taking it as k goes from 0 to 1, and a flicker
 * of white dashes when both sides are in it.
 */
export function drawHoldRing(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  Z: number,
  owner: Side | null,
  by: Side | null,
  k: number,
  contested: boolean,
  t: number,
): void {
  const tint = (s: Side | null, a: number) =>
    s === 'pirate'
      ? `rgba(216,68,58,${a})`
      : s === 'ninja'
        ? `rgba(61,111,216,${a})`
        : `rgba(255,248,230,${a})`;
  ctx.save();
  ctx.fillStyle = tint(owner, owner ? 0.22 : 0.12);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3 * Z;
  ctx.strokeStyle = tint(owner, owner ? 0.85 : 0.55);
  ctx.stroke();
  if (by && k > 0) {
    // Round from the top, the way a clock goes.
    ctx.lineWidth = 6 * Z;
    ctx.strokeStyle = tint(by, 0.95);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, k));
    ctx.stroke();
  }
  if (contested) {
    ctx.setLineDash([8 * Z, 8 * Z]);
    ctx.lineDashOffset = -t * 40 * Z;
    ctx.lineWidth = 2.5 * Z;
    ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(t * 10)})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 1.06, ry * 1.06, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** A stomp landing at cx, cy, its ring radii rx and ry; k from 0 to 1 over the moment after. */
export function drawStomp(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  Z: number,
  side: Side,
  k: number,
): void {
  ctx.save();
  ctx.globalAlpha *= 1 - k;
  // Dust thrown up, spreading.
  ctx.strokeStyle = 'rgba(214,196,160,.9)';
  ctx.lineWidth = 6 * Z * (1 - k);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * (0.3 + 0.8 * k), ry * (0.3 + 0.8 * k), 0, 0, Math.PI * 2);
  ctx.stroke();
  if (side === 'pirate') {
    // The anchor, down hard in front of it.
    const ax = cx + 10 * Z;
    const ay = cy - 4 * Z - (1 - Math.min(1, k * 4)) * 20 * Z;
    ctx.strokeStyle = '#3A3F4A';
    ctx.lineWidth = 3 * Z;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ax, ay - 18 * Z);
    ctx.lineTo(ax, ay);
    ctx.moveTo(ax - 6 * Z, ay - 13 * Z);
    ctx.lineTo(ax + 6 * Z, ay - 13 * Z);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ax, ay - 6 * Z, 7 * Z, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ax, ay - 21 * Z, 2.6 * Z, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Cracks running out across the ground.
    ctx.strokeStyle = 'rgba(70,58,44,.9)';
    ctx.lineWidth = 2 * Z;
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      const reach = Math.min(1, k * 3);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(a) * rx * 0.45 * reach,
        cy + Math.sin(a) * ry * 0.45 * reach + 2 * Z,
      );
      ctx.lineTo(
        cx + Math.cos(a + 0.2) * rx * 0.85 * reach,
        cy + Math.sin(a + 0.2) * ry * 0.85 * reach,
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A leap from a to b: the pirates' rope, swung down from above, the ninjas' puffs of smoke at both ends; k 0 to 1. */
export function drawLeap(
  ctx: Ctx,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  Z: number,
  side: Side,
  k: number,
): void {
  ctx.save();
  ctx.globalAlpha *= 1 - k;
  if (side === 'pirate') {
    // Hung from a point high over halfway, the rope swings the figure over in an arc.
    const hx = (ax + bx) / 2;
    const hy = Math.min(ay, by) - 70 * Z;
    ctx.strokeStyle = '#B98F55';
    ctx.lineWidth = 1.6 * Z;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(bx, by - 18 * Z);
    ctx.stroke();
    ctx.setLineDash([3 * Z, 4 * Z]);
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.moveTo(ax, ay - 12 * Z);
    ctx.quadraticCurveTo(hx, (ay + by) / 2 + 26 * Z, bx, by - 12 * Z);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    for (const [x, y, s] of [
      [ax, ay, 1],
      [bx, by, 0.8],
    ] as const) {
      ctx.fillStyle = 'rgba(200,204,214,.85)';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = (5 + k * 10) * Z * s;
        ctx.beginPath();
        ctx.arc(
          x + Math.cos(a) * r,
          y - 10 * Z + Math.sin(a) * r * 0.6,
          (4 + k * 3) * Z * s,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** A bomb at sx, sy: the pirates' powder keg with its fuse fizzing, the ninjas' firework in its paper; t for the fizz. */
export function drawBomb(ctx: Ctx, sx: number, sy: number, Z: number, side: Side, t: number): void {
  ctx.save();
  if (side === 'pirate') {
    ctx.fillStyle = '#7A5230';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 5 * Z, 5.5 * Z, 6.5 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3A3F4A';
    ctx.lineWidth = 1.2 * Z;
    for (const dy of [-9, -1]) {
      ctx.beginPath();
      ctx.moveTo(sx - 5 * Z, sy + dy * Z);
      ctx.lineTo(sx + 5 * Z, sy + dy * Z);
      ctx.stroke();
    }
    ctx.strokeStyle = '#E8E0C8';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 11 * Z);
    ctx.quadraticCurveTo(sx + 4 * Z, sy - 15 * Z, sx + 2 * Z, sy - 18 * Z);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#D8352E';
    ctx.fillRect(sx - 3 * Z, sy - 16 * Z, 6 * Z, 14 * Z);
    ctx.fillStyle = '#F2C230';
    ctx.fillRect(sx - 3 * Z, sy - 11 * Z, 6 * Z, 2.5 * Z);
    ctx.beginPath();
    ctx.moveTo(sx - 4 * Z, sy - 16 * Z);
    ctx.lineTo(sx, sy - 22 * Z);
    ctx.lineTo(sx + 4 * Z, sy - 16 * Z);
    ctx.fillStyle = '#3D6FD8';
    ctx.fill();
  }
  // The fizz: sparks flicking off the fuse.
  const fx = side === 'pirate' ? sx + 2 * Z : sx;
  const fy = sy - (side === 'pirate' ? 18 : 22) * Z;
  for (let i = 0; i < 4; i++) {
    const a = t * 17 + i * 1.7;
    ctx.fillStyle = i % 2 ? '#FFE066' : '#FF8A3D';
    ctx.beginPath();
    ctx.arc(fx + Math.cos(a) * 3 * Z, fy + Math.sin(a) * 3 * Z - 1 * Z, 1 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A bomb's burst at cx, cy, its ring radii rx and ry; k from 0 to 1. */
export function drawBurst(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  Z: number,
  side: Side,
  k: number,
): void {
  ctx.save();
  ctx.globalAlpha *= 1 - k * k;
  const colours =
    side === 'pirate'
      ? ['#FF8A3D', '#FFD84A', '#E4572E']
      : ['#F27BB0', '#7FD3F5', '#FFE066', '#9BE7A0'];
  // A flash, a ring of smoke or of coloured stars, and bits flying out.
  ctx.fillStyle = side === 'pirate' ? 'rgba(255,220,140,.8)' : 'rgba(255,255,255,.8)';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 8 * Z, rx * (0.4 + k * 0.6), ry * (0.6 + k * 0.8), 0, 0, Math.PI * 2);
  ctx.fill();
  if (side === 'pirate') {
    ctx.fillStyle = `rgba(60,58,56,${0.6 * (1 - k)})`;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(a) * rx * 0.7 * k,
        cy - 10 * Z - k * 14 * Z + Math.sin(a) * ry * 0.7 * k,
        7 * Z,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ctx.fillStyle = colours[i % colours.length] as string;
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(a) * rx * 1.1 * k,
      cy - 10 * Z + Math.sin(a) * ry * 1.4 * k - k * 10 * Z,
      (side === 'pirate' ? 2 : 2.4) * Z,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

/** A heal over time on one whose feet are at sx, sy: lime slices going round it, or cherry petals drifting down. */
export function drawHot(ctx: Ctx, sx: number, sy: number, Z: number, side: Side, t: number): void {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const a = t * 2.2 + (i / 4) * Math.PI * 2;
    if (side === 'pirate') {
      const x = sx + Math.cos(a) * 11 * Z;
      const y = sy - 12 * Z + Math.sin(a) * 4 * Z;
      ctx.fillStyle = '#9BD45A';
      ctx.beginPath();
      ctx.arc(x, y, 2.6 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#E8F6C8';
      ctx.lineWidth = 0.8 * Z;
      ctx.beginPath();
      ctx.moveTo(x - 2 * Z, y);
      ctx.lineTo(x + 2 * Z, y);
      ctx.moveTo(x, y - 2 * Z);
      ctx.lineTo(x, y + 2 * Z);
      ctx.stroke();
    } else {
      const fall = (t * 0.6 + i / 4) % 1;
      const x = sx + Math.sin(a) * 10 * Z;
      const y = sy - 30 * Z + fall * 28 * Z;
      ctx.globalAlpha = 1 - fall * 0.6;
      ctx.fillStyle = i % 2 ? '#F7B6CC' : '#F28CB1';
      ctx.beginPath();
      ctx.ellipse(x, y, 2.6 * Z, 1.5 * Z, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A pirate singing, feet at sx, sy: notes rising off it. */
export function drawShanty(ctx: Ctx, sx: number, sy: number, Z: number, t: number): void {
  ctx.save();
  ctx.fillStyle = '#FFF3C4';
  ctx.strokeStyle = '#FFF3C4';
  ctx.lineWidth = 1.2 * Z;
  for (let i = 0; i < 3; i++) {
    const up = (t * 0.7 + i / 3) % 1;
    const x = sx + Math.sin(t * 3 + i * 2) * 8 * Z + (i - 1) * 6 * Z;
    const y = sy - 28 * Z - up * 26 * Z;
    ctx.globalAlpha = 1 - up;
    ctx.beginPath();
    ctx.ellipse(x, y, 2.4 * Z, 1.8 * Z, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 2.2 * Z, y);
    ctx.lineTo(x + 2.2 * Z, y - 8 * Z);
    ctx.lineTo(x + 5 * Z, y - 6 * Z);
    ctx.stroke();
  }
  ctx.restore();
}

/** A group heal's reach on the ground at cx, cy, radii rx and ry: a dashed golden ring for the shanty, a glowing lotus
 * circle with petals round it for the ninjas; t its time so far, left how much of it is still to come (0 to 1). */
export function drawHealRing(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  Z: number,
  side: Side,
  t: number,
  left: number,
): void {
  ctx.save();
  const fade = Math.min(1, left * 4);
  if (side === 'pirate') {
    ctx.globalAlpha *= 0.7 * fade;
    ctx.strokeStyle = '#FFD84A';
    ctx.lineWidth = 2 * Z;
    ctx.setLineDash([6 * Z, 6 * Z]);
    ctx.lineDashOffset = -t * 20 * Z;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.globalAlpha *= fade;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    g.addColorStop(0, 'rgba(255,214,234,.05)');
    g.addColorStop(0.8, 'rgba(255,190,220,.22)');
    g.addColorStop(1, 'rgba(255,170,210,.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,214,120,${0.6 + Math.sin(t * 4) * 0.2})`;
    ctx.lineWidth = 2.4 * Z;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Lotus petals round its edge.
    ctx.fillStyle = '#F7B6CC';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 0.2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 5 * Z, 2.6 * Z, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** How long the badge ceremony's little show of a new ability runs. */
export const SHOW_T = 2.8;

/**
 * The badge ceremony's little show, on a canvas W by H: you, in your place, and whoever a new ability is for, and the
 * ability played once over SHOW_T seconds; t its time so far.
 */
export function drawBadgeShow(
  ctx: Ctx,
  W: number,
  H: number,
  side: Side,
  role: Role,
  ab: Ability,
  t: number,
): void {
  ctx.clearRect(0, 0, W, H);
  const Z = H / 62;
  const gy = H * 0.74;
  ctx.fillStyle = side === 'pirate' ? '#E9D6A6' : '#D5E2CC';
  ctx.beginPath();
  ctx.ellipse(W / 2, gy, W * 0.47, H * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  const v = { ctx, zoom: Z } as unknown as DrawView;
  const foe = rival(side);
  const crew = (x: number, s: Side, r: Role, left: boolean, hurtT = 9, swingT = 9) =>
    drawCrew(
      v,
      x,
      gy,
      {
        side: s,
        role: r,
        left,
        moving: false,
        swingT,
        hurtT,
        hp: 1,
        max: 1,
        carrying: false,
        you: s === side && r === role,
      },
      t,
    );
  const word = (text: string, x: number, y: number, colour: string, a: number) => {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, a);
    ctx.font = `800 ${Math.round(6 * Z)}px Grandstander, ui-rounded, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(20,24,30,.6)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = colour;
    ctx.fillText(text, x, y);
    ctx.restore();
  };
  /** A number rising off someone every so often. */
  const ticks = (x: number, every: number, from: number, text: string, colour: string) => {
    for (let k = from; k <= t; k += every) {
      const age = t - k;
      if (age < 0.8) word(text, x, gy - 34 * Z - age * 14 * Z, colour, 1 - age / 0.8);
    }
  };
  const ring = (cx: number, r: number) => [cx, gy, r * Z, r * Z * 0.5] as const;
  switch (ab) {
    case 'guard': {
      // You, guarded; a foe hitting you, and each hit only half.
      crew(W * 0.36, side, role, false);
      drawGuard(ctx, W * 0.36, gy, Z, side, t);
      crew(W * 0.6, foe, 'damage', true, 9, t % 0.7);
      ticks(W * 0.36, 0.7, 0.05, '\u00BD', '#FFF3C4');
      break;
    }
    case 'stomp': {
      const [cx, cy, rx, ry] = ring(W / 2, 30);
      const hit = t - 0.6;
      if (hit < 0) drawWarnRing(ctx, cx, cy, rx, ry, t / 0.6);
      else if (hit < 0.6) drawStomp(ctx, cx, cy, rx, ry, Z, side, hit / 0.6);
      crew(W * 0.28, foe, 'damage', false, hit >= 0 ? hit : 9);
      crew(W * 0.72, foe, 'damage', true, hit >= 0 ? hit : 9);
      crew(W / 2, side, role, false, 9, hit >= 0 ? hit : 9);
      if (hit >= 0 && hit < 1.6) {
        drawStun(ctx, W * 0.28, gy, Z, t);
        drawStun(ctx, W * 0.72, gy, Z, t);
      }
      break;
    }
    case 'leap': {
      const k = Math.max(0, Math.min(1, (t - 0.5) / 0.35));
      const x0 = W * 0.16;
      const x1 = W * 0.62;
      const x = x0 + (x1 - x0) * k;
      const lift = Math.sin(k * Math.PI) * 20 * Z;
      if (t > 0.5 && t < 1.4) drawLeap(ctx, x0, gy, x1, gy, Z, side, Math.max(0, (t - 0.5) / 0.9));
      crew(W * 0.8, foe, 'damage', true, k >= 1 ? t - 0.85 : 9);
      ctx.save();
      ctx.translate(0, -lift);
      crew(x, side, role, false, 9, k >= 1 ? t - 0.85 : 9);
      ctx.restore();
      if (k >= 1)
        word('-3', W * 0.8, gy - 36 * Z - (t - 0.85) * 10 * Z, '#FFF3C4', 1.6 - (t - 0.85));
      break;
    }
    case 'bomb': {
      const from = W * 0.18;
      const at = W * 0.72;
      const k = (t - 0.2) / 0.35;
      const burst = t - 1.75;
      if (k > 0 && k < 1)
        drawBomb(ctx, from + (at - from) * k, gy - Math.sin(k * Math.PI) * 30 * Z, Z, side, t);
      if (k >= 1 && burst < 0) {
        const [cx, cy, rx, ry] = ring(at, 20);
        drawWarnRing(ctx, cx, cy, rx, ry, (t - 0.55) / 1.2);
      }
      crew(from, side, role, false, 9, t - 0.2);
      crew(at - 9 * Z, foe, 'damage', true, burst >= 0 ? burst : 9);
      crew(at + 9 * Z, foe, 'damage', true, burst >= 0 ? burst : 9);
      if (k >= 1 && burst < 0) drawBomb(ctx, at, gy + 4 * Z, Z, side, t);
      if (burst >= 0 && burst < 0.6) {
        const [cx, cy, rx, ry] = ring(at, 20);
        drawBurst(ctx, cx, cy, rx, ry, Z, side, burst / 0.6);
      }
      break;
    }
    case 'hot': {
      crew(W * 0.3, side, role, false, 9, t < 0.3 ? t : 9);
      crew(W * 0.66, side, 'tank', true);
      if (t > 0.3) drawHot(ctx, W * 0.66, gy, Z, side, t);
      ticks(W * 0.66, 0.45, 0.5, '+1', '#7CE38B');
      break;
    }
    case 'group': {
      const [cx, cy, rx, ry] = ring(W / 2, 40);
      if (t > 0.2) drawHealRing(ctx, cx, cy, rx, ry, Z, side, t, 1);
      crew(W * 0.25, side, 'tank', false);
      crew(W * 0.75, side, 'damage', true);
      crew(W / 2, side, role, false);
      if (side === 'pirate' && t > 0.2) drawShanty(ctx, W / 2, gy, Z, t);
      ticks(W * 0.25, 0.5, 0.5, '+1', '#7CE38B');
      ticks(W * 0.75, 0.5, 0.6, '+1', '#7CE38B');
      break;
    }
    default:
      crew(W / 2, side, role, false);
  }
}
