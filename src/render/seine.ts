/**
 * The seine on the water: a rope from the buoy along the corks to the boat's
 * stern, a cork bobbing at every other point, and the buoy itself, orange with
 * a white band and a little flag on a stick. Once enough is out that coming
 * back closes the loop, a ring pulses round the buoy to say where to steer;
 * near the end of the seine the corks go red.
 */
import type { DrawView } from '../entities/entity';
import type { Seine } from '../fishing/seine';

const ROPE = 'rgba(255,246,229,.7)';
const CORK = '#F2C14E';
const CORK_LOW = '#E4572E';
const BUOY = '#E4572E';

/** Draw the seine paid out from its buoy to the stern at (sx, sy). */
export function drawSeine(v: DrawView, s: Seine, sx: number, sy: number): void {
  if (!s.out) return;
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  ctx.strokeStyle = ROPE;
  ctx.lineWidth = 1.3 * Z;
  ctx.beginPath();
  s.pts.forEach((p, i) => {
    const X = px(p.x, p.y);
    const Y = py(p.x, p.y, 1);
    if (i) ctx.lineTo(X, Y);
    else ctx.moveTo(X, Y);
  });
  ctx.lineTo(px(sx, sy), py(sx, sy, 4));
  ctx.stroke();
  const low = s.left < 0.2;
  ctx.fillStyle = low ? CORK_LOW : CORK;
  for (let i = 2; i < s.pts.length; i += 2) {
    const p = s.pts[i] as { x: number; y: number };
    ctx.beginPath();
    ctx.arc(px(p.x, p.y), py(p.x, p.y, 1.5 + Math.sin(T * 3 + i) * 0.8), 2.4 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  const { x, y } = s.buoy;
  if (s.armed) {
    const k = (T * 1.4) % 1;
    ctx.strokeStyle = `rgba(255,246,229,${(1 - k) * 0.9})`;
    ctx.lineWidth = 2 * Z;
    v.isoEllipse(x, y, 30 + k * 40);
    ctx.stroke();
  }
  const z = Math.sin(T * 2) * 1.5;
  v.isoEllipse(x, y, 8, 0);
  ctx.fillStyle = 'rgba(8,40,52,.25)';
  ctx.fill();
  const bx = px(x, y);
  const by = py(x, y, 5 + z);
  ctx.strokeStyle = '#3B4A4F';
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx, by - 16 * Z);
  ctx.stroke();
  ctx.fillStyle = '#FFF6E5';
  ctx.beginPath();
  ctx.moveTo(bx, by - 16 * Z);
  ctx.lineTo(bx + 8 * Z, by - 13 * Z);
  ctx.lineTo(bx, by - 10 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = BUOY;
  ctx.beginPath();
  ctx.arc(bx, by, 6.5 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF6E5';
  ctx.fillRect(bx - 6.5 * Z, by - 1.2 * Z, 13 * Z, 2.4 * Z);
}
