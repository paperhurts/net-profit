/**
 * The tar leader (entities/tarleader.ts): a tar man a head and a half taller than his tar humans, as black and glossy,
 * a pale rim round him, a crown of tar spikes, a cape dripping off his shoulders, burning orange eyes, and a long black
 * sword with a purple glint along its edge, drawn back to sweep and swung through. Crouched to leap, then up in an arc
 * through the air. On the ground the warnings: a red fan where the sword will sweep, a red ring where he will land.
 * Beaten, he melts down into the rock.
 */

import type { DrawView } from '../entities/entity';
import {
  CROUCH_T,
  LEADER_MELT,
  LEADER_RISE,
  LEAP_R,
  LEAP_T,
  SWEEP_REACH,
  SWEEP_WINDUP,
  type TarLeader,
} from '../entities/tarleader';
import { tarIsleZ } from '../world/tarisle';

const TAR = '#0B090E';
const RIM = 'rgba(200,180,230,.75)';
const EYE = '#FF9A3A';
/** How much bigger than a tar human he is drawn. */
const SCALE = 1.5;

/** The tar leader where he stands, or up in the air. */
export function drawTarLeader(v: DrawView, L: TarLeader): void {
  if (L.state === 'gone') return;
  const { ctx, px, py, T, zoom: Z } = v;
  const gz = tarIsleZ(L.x, L.y);
  const leap = L.state === 'leap' ? Math.min(1, L.t / LEAP_T) : 0;
  const lift = Math.sin(leap * Math.PI) * 60;
  const sx = px(L.x, L.y);
  const sy = py(L.x, L.y, gz);
  const face = px(L.x + Math.cos(L.h), L.y + Math.sin(L.h)) >= sx ? 1 : -1;
  const melt = L.state === 'melt' ? Math.min(1, L.t / LEADER_MELT) : 0;
  const rise = L.state === 'rise' ? Math.min(1, L.t / LEADER_RISE) : 1;
  const crouch = L.state === 'crouch' ? Math.min(1, L.t / CROUCH_T) : 0;
  // Shadow, or the puddle he melts into.
  ctx.fillStyle = melt > 0 ? 'rgba(10,8,14,.92)' : 'rgba(0,0,0,.32)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, (24 + melt * 22) * Z, (9 + melt * 8) * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  if (melt >= 1) return;
  const body = L.flash > 0 ? '#E6DCF0' : TAR;
  ctx.save();
  ctx.translate(sx, py(L.x, L.y, gz + lift));
  ctx.scale(face * Z * SCALE, Z * SCALE * (1 - melt) * (0.7 + 0.3 * rise) * (1 - crouch * 0.25));
  ctx.fillStyle = body;
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 1.1 / (Z * SCALE);
  // The cape behind him, dripping.
  ctx.beginPath();
  ctx.moveTo(-9, -38);
  ctx.quadraticCurveTo(-18, -20, -15, -2);
  for (let i = 0; i < 4; i++) ctx.lineTo(-13 + i * 3, -2 + ((i + Math.floor(T * 3)) % 2) * 3);
  ctx.lineTo(-4, -30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Legs.
  const walking = L.state === 'chase' || L.state === 'back';
  const sway = walking ? Math.sin(L.step * 6) * 3 : 0;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 5 + s * sway * 0.4, -6, 4.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // The body, broad at the shoulders.
  ctx.beginPath();
  ctx.moveTo(-7, -10);
  ctx.quadraticCurveTo(-12, -28, -10, -38);
  ctx.quadraticCurveTo(0, -44, 10, -38);
  ctx.quadraticCurveTo(12, -28, 7, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The head, and a crown of tar spikes on it.
  ctx.beginPath();
  ctx.arc(2, -46, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const x = -5 + i * 3.5;
    ctx.moveTo(x - 1.6, -51);
    ctx.lineTo(x, -58 - (i % 2) * 3);
    ctx.lineTo(x + 1.6, -51);
  }
  ctx.fill();
  // Burning eyes, brighter as he winds up.
  const flare =
    L.state === 'windup' || L.state === 'crouch' || L.state === 'rise' || L.state === 'call'
      ? 1.5
      : 1;
  ctx.fillStyle = 'rgba(255,154,58,.3)';
  ctx.beginPath();
  ctx.arc(5, -47, 6 * flare, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = EYE;
  for (const dx of [2.5, 7]) {
    ctx.beginPath();
    ctx.arc(dx, -47, 1.5 * flare, 0, Math.PI * 2);
    ctx.fill();
  }
  // The sword, in his hand at the shoulder: down at his side, drawn back, or swung through.
  const sw = L.swing;
  const a = sw < 0 ? -0.5 + sw * 2 : sw > 0 ? -2.5 + sw * 3.6 : L.state === 'call' ? -1.5 : 0.9;
  ctx.save();
  ctx.translate(8, -32);
  ctx.rotate(a);
  ctx.fillStyle = '#18141C';
  ctx.fillRect(-1.6, -2, 3.2, 6);
  ctx.fillRect(-5, 3, 10, 2);
  ctx.fillStyle = body === TAR ? '#100C14' : body;
  ctx.beginPath();
  ctx.moveTo(-2.2, 5);
  ctx.lineTo(2.2, 5);
  ctx.lineTo(1, 38);
  ctx.lineTo(0, 42);
  ctx.lineTo(-1, 38);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(181,124,255,.85)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(2.1, 6);
  ctx.lineTo(0.9, 38);
  ctx.stroke();
  ctx.restore();
  // His arm to the sword.
  ctx.strokeStyle = body;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(8, -36);
  ctx.lineTo(8, -32);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
}

/** The warnings on the ground: the fan his sword will sweep, the ring he will land in. */
export function drawLeaderMark(v: DrawView, L: TarLeader): void {
  const { ctx, px, py, zoom: Z } = v;
  if ((L.state === 'windup' || L.state === 'sweep') && L.fan) {
    const k = L.state === 'windup' ? Math.min(1, L.t / SWEEP_WINDUP) : 1;
    const f = L.fan;
    ctx.fillStyle = `rgba(220,60,50,${L.state === 'sweep' ? 0.55 : 0.12 + 0.3 * k})`;
    ctx.strokeStyle = `rgba(255,120,90,${0.4 + 0.5 * k})`;
    ctx.lineWidth = 2 * Z;
    ctx.beginPath();
    ctx.moveTo(px(f.x, f.y), py(f.x, f.y, tarIsleZ(f.x, f.y)));
    for (let i = 0; i <= 18; i++) {
      const a = f.a0 + ((f.a1 - f.a0) * i) / 18;
      const x = f.x + Math.cos(a) * SWEEP_REACH;
      const y = f.y + Math.sin(a) * SWEEP_REACH;
      ctx.lineTo(px(x, y), py(x, y, tarIsleZ(x, y)));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }
  if (L.state === 'crouch' || L.state === 'leap') {
    const k = L.state === 'crouch' ? Math.min(1, L.t / CROUCH_T) : 1;
    ctx.fillStyle = `rgba(220,60,50,${0.12 + 0.35 * k})`;
    ctx.strokeStyle = `rgba(255,120,90,${0.4 + 0.5 * k})`;
    ctx.lineWidth = 2 * Z;
    v.isoEllipse(L.to.x, L.to.y, LEAP_R, tarIsleZ(L.to.x, L.to.y));
    ctx.fill();
    ctx.stroke();
  }
}
