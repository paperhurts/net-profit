/**
 * Skrill's spell (entities/prisonparty.ts): the portal it tears open on his floor, standing on its edge, a ring of
 * purple fire round a turning dark middle, growing as it opens and shrinking away as it shuts. The Heron's men who
 * come through it are drawn as his hired men are (entities/monkeys.ts).
 */

import type { DrawView } from '../entities/entity';
import type { PrisonParty } from '../entities/prisonparty';

/** How tall it stands, and how wide, fully open; how high its middle is off the floor. */
const TALL = 44;
const WIDE = 26;
const MID_Z = 40;

export function drawSpellPortal(v: DrawView, p: PrisonParty): void {
  if (p.open <= 0) return;
  const { ctx, px, py, T, zoom: Z } = v;
  const k = p.open;
  const sx = px(p.portal.x, p.portal.y);
  const sy = py(p.portal.x, p.portal.y, MID_Z);
  const h = TALL * k * Z;
  const w = WIDE * k * Z;
  // Its light on the floor under it.
  ctx.fillStyle = `rgba(170,90,255,${0.3 * k})`;
  v.isoEllipse(p.portal.x, p.portal.y, 34 * k);
  ctx.fill();
  // The glow round it.
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 1.4);
  g.addColorStop(0, `rgba(190,120,255,${0.45 * k})`);
  g.addColorStop(1, 'rgba(190,120,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, sy, h * 1.4, 0, Math.PI * 2);
  ctx.fill();
  // The dark middle, turning.
  ctx.fillStyle = '#1A0C2E';
  ctx.beginPath();
  ctx.ellipse(sx, sy, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(sx, sy, w, h, 0, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 4; i++) {
    const a = T * (1.6 + i * 0.4) + i * 1.7;
    ctx.strokeStyle = i % 2 ? 'rgba(124,180,255,.6)' : 'rgba(200,140,255,.7)';
    ctx.lineWidth = (4 - i * 0.6) * Z;
    ctx.beginPath();
    ctx.ellipse(sx, sy, w * (0.3 + i * 0.18), h * (0.3 + i * 0.18), 0, a, a + 2.4);
    ctx.stroke();
  }
  ctx.restore();
  // The ring of purple fire round it.
  ctx.strokeStyle = `rgba(214,170,255,${0.6 + 0.4 * Math.sin(T * 7)})`;
  ctx.lineWidth = 3 * Z;
  ctx.beginPath();
  ctx.ellipse(sx, sy, w, h, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#E6CCFF';
  for (let i = 0; i < 6; i++) {
    const a = T * 2 + (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.arc(sx + Math.cos(a) * w, sy + Math.sin(a) * h, 1.8 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}
