/**
 * The fighters in the Endless Isle's battles, drawn: pirates and ninjas, each in their side's colour (the pirates red,
 * the ninjas blue, as the score bar has them), a ring at their feet in it too so a side reads at a glance. By role: the
 * pirates' Swashbuckler in a striped shirt and bandana with a cutlass, the Quartermaster bigger, with a ship's-wheel
 * shield, the Ship's Cook in an apron and a chef's hat; the ninjas' Shadow in black with a headband and a katana, the
 * Stone Guard bigger, with a grey stone shield, the Blossom Monk in pale robes and a straw hat.
 */

import type { Role } from '../data/battle';
import type { DrawView } from '../entities/entity';
import type { Side } from '../world/endless';
import { drawBattleFlag } from './endless';

/** Each side's colour: the score bar's, the rings at their feet. */
export const SIDE_COLOUR: Readonly<Record<Side, string>> = { pirate: '#D8443A', ninja: '#3D6FD8' };

/** What drawing a fighter needs to know. */
export type CrewLook = {
  side: Side;
  role: Role;
  /** Whether it faces left on the screen. */
  left: boolean;
  moving: boolean;
  /** Since its last swing, and since it was last hit. */
  swingT: number;
  hurtT: number;
  /** Hearts left of its whole. */
  hp: number;
  max: number;
  /** Carrying the other side's flag. */
  carrying: boolean;
  /** You, ringed brighter. */
  you: boolean;
};

const SKIN = '#E6B38C';

/** A fighter at screen x, y. */
export function drawCrew(v: DrawView, sx: number, sy: number, f: CrewLook, T: number): void {
  const { ctx } = v;
  const big = f.role === 'tank' ? 1.18 : 1;
  const Z = v.zoom * big;
  const dir = f.left ? -1 : 1;
  const bob = f.moving ? Math.abs(Math.sin(T * 11)) * 1.6 * Z : 0;
  const step = f.moving ? Math.sin(T * 11) * 2.4 * Z : 0;
  // The ring at its feet in its side's colour, brighter for you.
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 9 * Z, 3.6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = SIDE_COLOUR[f.side];
  ctx.globalAlpha = f.you ? 1 : 0.7;
  ctx.lineWidth = (f.you ? 2.2 : 1.4) * v.zoom;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 11 * Z, 4.4 * Z, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // A carrier has the flag on its back, behind it.
  if (f.carrying)
    drawBattleFlag(
      v,
      f.side === 'pirate' ? 'ninja' : 'pirate',
      sx - dir * 6 * Z,
      sy - 14 * Z - bob,
    );
  const y0 = sy - bob;
  const pirate = f.side === 'pirate';
  // Legs.
  ctx.fillStyle = pirate ? '#3A2A1E' : '#1C1C24';
  ctx.fillRect(sx - 4 * Z + step * 0.4, y0 - 8 * Z, 3 * Z, 8 * Z);
  ctx.fillRect(sx + 1 * Z - step * 0.4, y0 - 8 * Z, 3 * Z, 8 * Z);
  // Body, by side and role.
  const body = bodyColours(f.side, f.role);
  ctx.fillStyle = body.main;
  ctx.beginPath();
  ctx.moveTo(sx - 6 * Z, y0 - 7 * Z);
  ctx.lineTo(sx - 5 * Z, y0 - 20 * Z);
  ctx.lineTo(sx + 5 * Z, y0 - 20 * Z);
  ctx.lineTo(sx + 6 * Z, y0 - 7 * Z);
  ctx.closePath();
  ctx.fill();
  if (body.stripe) {
    ctx.fillStyle = body.stripe;
    for (const k of [0, 1, 2]) ctx.fillRect(sx - 5.6 * Z, y0 - (17 - k * 4) * Z, 11.2 * Z, 1.6 * Z);
  }
  if (body.sash) {
    ctx.fillStyle = body.sash;
    ctx.fillRect(sx - 6 * Z, y0 - 10 * Z, 12 * Z, 2 * Z);
  }
  // Head and what is on it.
  const hy = y0 - 24 * Z;
  ctx.fillStyle = pirate || f.role === 'healer' ? SKIN : '#1C1C24';
  ctx.beginPath();
  ctx.arc(sx, hy, 4.4 * Z, 0, Math.PI * 2);
  ctx.fill();
  if (!pirate && f.role !== 'healer') {
    // A ninja's hood leaves a slot for the eyes.
    ctx.fillStyle = SKIN;
    ctx.fillRect(sx - 3.2 * Z + dir * 0.8 * Z, hy - 1.6 * Z, 6.4 * Z, 2.2 * Z);
  }
  ctx.fillStyle = '#1A1410';
  ctx.fillRect(sx + dir * 1.2 * Z - 0.6 * Z, hy - 1 * Z, 1.2 * Z, 1.2 * Z);
  hat(v, sx, hy, Z, f);
  // The shield a tank carries, on the side toward the screen.
  if (f.role === 'tank') shield(v, sx - dir * 7 * Z, y0 - 13 * Z, Z, pirate);
  // The weapon in its hand, swung when it strikes; the healer throws.
  const swing = f.swingT < 0.25 ? 1 - f.swingT / 0.25 : 0;
  weapon(v, sx + dir * 6 * Z, y0 - 14 * Z, Z, dir, swing, f);
  // Hit, it flashes white.
  if (f.hurtT < 0.15) {
    ctx.globalAlpha = 0.55 * (1 - f.hurtT / 0.15);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(sx, y0 - 15 * Z, 8 * Z, 13 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Its hearts, as a bar over it, once it has lost any.
  if (f.hp < f.max) {
    const w = 18 * v.zoom;
    const by = hy - 12 * Z;
    ctx.fillStyle = 'rgba(10,20,30,.7)';
    ctx.fillRect(sx - w / 2 - 1, by - 1, w + 2, 4 * v.zoom + 2);
    ctx.fillStyle = SIDE_COLOUR[f.side];
    ctx.fillRect(sx - w / 2, by, (w * Math.max(0, f.hp)) / f.max, 4 * v.zoom);
  }
}

function bodyColours(side: Side, role: Role): { main: string; stripe?: string; sash?: string } {
  if (side === 'pirate') {
    if (role === 'tank') return { main: '#7A4A2A', sash: '#D8443A' };
    if (role === 'healer') return { main: '#F2EDE0', sash: '#D8443A' };
    return { main: '#F2EDE0', stripe: '#D8443A' };
  }
  if (role === 'tank') return { main: '#7C8088', sash: '#3D6FD8' };
  if (role === 'healer') return { main: '#F4D9E2', sash: '#3D6FD8' };
  return { main: '#22222C', sash: '#3D6FD8' };
}

function hat(v: DrawView, sx: number, hy: number, Z: number, f: CrewLook): void {
  const { ctx } = v;
  if (f.side === 'pirate') {
    if (f.role === 'healer') {
      // The cook's tall white hat.
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sx - 3.4 * Z, hy - 11 * Z, 6.8 * Z, 7 * Z);
      ctx.beginPath();
      ctx.arc(sx, hy - 11 * Z, 4 * Z, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (f.role === 'tank') {
      // The quartermaster's black tricorn.
      ctx.fillStyle = '#1E1A18';
      ctx.beginPath();
      ctx.moveTo(sx - 7 * Z, hy - 2.5 * Z);
      ctx.lineTo(sx, hy - 9 * Z);
      ctx.lineTo(sx + 7 * Z, hy - 2.5 * Z);
      ctx.closePath();
      ctx.fill();
      return;
    }
    // A red bandana, knotted.
    ctx.fillStyle = '#D8443A';
    ctx.beginPath();
    ctx.arc(sx, hy - 1.2 * Z, 4.6 * Z, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(sx + (f.left ? 3.6 : -5.6) * Z, hy - 1.6 * Z, 2 * Z, 4 * Z);
    return;
  }
  if (f.role === 'healer') {
    // The monk's wide straw hat.
    ctx.fillStyle = '#D9B866';
    ctx.beginPath();
    ctx.moveTo(sx - 9 * Z, hy - 2 * Z);
    ctx.lineTo(sx, hy - 8 * Z);
    ctx.lineTo(sx + 9 * Z, hy - 2 * Z);
    ctx.closePath();
    ctx.fill();
    return;
  }
  // A headband in the ninjas' blue, its tails flying.
  ctx.fillStyle = '#3D6FD8';
  ctx.fillRect(sx - 4.6 * Z, hy - 3.2 * Z, 9.2 * Z, 1.8 * Z);
  ctx.fillRect(sx + (f.left ? 4 : -7) * Z, hy - 3 * Z, 3 * Z, 1.4 * Z);
}

function shield(v: DrawView, x: number, y: number, Z: number, pirate: boolean): void {
  const { ctx } = v;
  ctx.fillStyle = pirate ? '#8A5A2E' : '#9A9EA6';
  ctx.strokeStyle = pirate ? '#4A3220' : '#5A5E66';
  ctx.lineWidth = 1.2 * Z;
  ctx.beginPath();
  ctx.arc(x, y, 5.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (pirate) {
    // A ship's wheel: spokes round a hub.
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI;
      ctx.moveTo(x - Math.cos(a) * 5.6 * Z, y - Math.sin(a) * 5.6 * Z);
      ctx.lineTo(x + Math.cos(a) * 5.6 * Z, y + Math.sin(a) * 5.6 * Z);
    }
    ctx.stroke();
  }
}

function weapon(
  v: DrawView,
  x: number,
  y: number,
  Z: number,
  dir: number,
  swing: number,
  f: CrewLook,
): void {
  const { ctx } = v;
  if (f.role === 'healer') {
    // The cook's fish or the monk's blossom, raised to throw.
    const up = swing * 6 * Z;
    ctx.fillStyle = f.side === 'pirate' ? '#9AB8C8' : '#F2A6C0';
    ctx.beginPath();
    ctx.ellipse(x, y - up, 3.4 * Z, 1.8 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // A cutlass or a katana, sweeping forward as it strikes.
  const a = -1.2 + swing * 1.9;
  const len = (f.role === 'tank' ? 9 : 12) * Z;
  ctx.strokeStyle = '#E3E8EC';
  ctx.lineWidth = 1.8 * Z;
  ctx.beginPath();
  ctx.moveTo(x, y);
  if (f.side === 'pirate')
    ctx.quadraticCurveTo(
      x + dir * Math.cos(a) * len * 0.6,
      y + Math.sin(a) * len * 0.4,
      x + dir * Math.cos(a) * len,
      y + Math.sin(a) * len,
    );
  else ctx.lineTo(x + dir * Math.cos(a) * len, y + Math.sin(a) * len);
  ctx.stroke();
  if (swing > 0.2) {
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * swing})`;
    ctx.lineWidth = 3 * Z;
    ctx.beginPath();
    ctx.arc(x, y, len, a - 0.9, a, false);
    ctx.stroke();
  }
}
