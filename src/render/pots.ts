/**
 * A crab pot from above the water: a float in the boat's own paint with a white
 * band and a little pennant on a stick, its rope running down to the pot, and a
 * ring of bubbles at the waterline, one for each crab inside. Full, a spider crab
 * sits on top of the float and a ring pulses round it, so a full pot is easy to
 * spot from a distance.
 */
import type { DrawView } from '../entities/entity';
import { POT_MAX, type Pot } from '../fishing/pots';
import { CRAB_LEG, drawSpiderCrab } from './crab';

const POT_FLAG = CRAB_LEG;

/** Draw one pot's float, in the boat's hull paint. */
export function drawPot(v: DrawView, p: Pot, paint: string): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const full = p.crabs >= POT_MAX;
  // Heavier as it fills: it rides lower.
  const z = 4 - p.crabs * 0.35 + Math.sin(T * 2.2 + p.x) * 1.2;
  if (full) {
    const k = (T * 1.2 + p.y * 0.01) % 1;
    ctx.strokeStyle = `rgba(255,246,229,${(1 - k) * 0.85})`;
    ctx.lineWidth = 1.8 * Z;
    v.isoEllipse(p.x, p.y, 20 + k * 30);
    ctx.stroke();
  }
  v.isoEllipse(p.x, p.y, 7, 0);
  ctx.fillStyle = 'rgba(8,40,52,.25)';
  ctx.fill();
  // One bubble at the waterline for each crab in the pot.
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (let i = 0; i < p.crabs; i++) {
    const a = (i / POT_MAX) * Math.PI * 2 + T * 0.4;
    const bx = p.x + Math.cos(a) * 14;
    const by = p.y + Math.sin(a) * 14;
    ctx.beginPath();
    ctx.arc(px(bx, by), py(bx, by, 0.5), 2.2 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  const sx = px(p.x, p.y);
  const sy = py(p.x, p.y, z);
  // A tall stick with a crab-yellow pennant, so pots read apart from the buoys at a glance.
  ctx.strokeStyle = '#3B4A4F';
  ctx.lineWidth = 1.5 * Z;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - 22 * Z);
  ctx.stroke();
  ctx.fillStyle = POT_FLAG;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 22 * Z);
  ctx.lineTo(sx + 10 * Z, sy - 18.5 * Z);
  ctx.lineTo(sx, sy - 15 * Z);
  ctx.closePath();
  ctx.fill();
  // The float: a squat drum in the boat's paint, a white band and a yellow top.
  ctx.fillStyle = paint;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 7 * Z, 6.5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF6E5';
  ctx.fillRect(sx - 7 * Z, sy - 1.2 * Z, 14 * Z, 2.4 * Z);
  ctx.fillStyle = POT_FLAG;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 5 * Z, 4.5 * Z, 2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  if (full) drawSpiderCrab(ctx, sx, sy - 9 * Z, 4 * Z, 0, T * 6);
}
