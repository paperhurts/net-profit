/**
 * Drawing the Heron's escape (world/heronescape.ts) out on the water by island 9: the purple portal turning on the
 * sea, the splash where he comes down, the Reaper's dark shape and striped fin coming for him, and the Heron himself,
 * flapping, falling, floundering with his staff up, and sinking into the portal.
 */

import type { DrawView } from '../entities/entity';
import { drawHeron, HERON_SIZE } from '../entities/heron';
import { ESCAPE_AT, type EscapeFrame } from '../world/heronescape';
import type { Solid } from './layers';
import { drawReaperFin, drawReaperShadow } from './reaper';

/** He faces the way he flew in, toward where the Reaper comes from. */
const FACING = Math.atan2(60, 160);
/** How far down he sits in the water, so his legs are under it and his body at its surface. */
const IN_WATER = 28 * HERON_SIZE;

/** The portal on the water: purple rings turning, wider as it opens. */
function drawEscapePortal(v: DrawView, open: number): void {
  if (open <= 0.01) return;
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const { x, y } = ESCAPE_AT;
  const sx = px(x, y);
  const sy = py(x, y);
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 60 * Z * open);
  g.addColorStop(0, `rgba(40,10,70,${0.85 * open})`);
  g.addColorStop(1, 'rgba(120,60,200,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 60 * Z * open, 30 * Z * open, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const r = (18 + i * 12) * Z * open;
    ctx.strokeStyle = `rgba(185,138,255,${0.8 - i * 0.15})`;
    ctx.lineWidth = (4 - i * 0.7) * Z;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r, r * 0.5, 0, T * (4 - i * 0.6), T * (4 - i * 0.6) + Math.PI * 1.4);
    ctx.stroke();
  }
}

/** Where he hit the water: a ring spreading and a burst of drops. */
function drawSplash(v: DrawView, k: number): void {
  if (k <= 0) return;
  const { ctx, px, py } = v;
  const Z = v.zoom;
  const { x, y } = ESCAPE_AT;
  const sx = px(x, y);
  const sy = py(x, y);
  ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
  ctx.lineWidth = 2.5 * Z;
  ctx.beginPath();
  ctx.ellipse(sx, sy, (20 + 50 * k) * Z, (10 + 25 * k) * Z, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(235,248,255,${0.9 * (1 - k)})`;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = 30 * k * Z;
    const up = Math.sin(Math.PI * k) * 26 * Z * (0.6 + (i % 3) * 0.2);
    ctx.beginPath();
    ctx.arc(sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.5 - up, 2.2 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The scene's pieces, for the game's depth-sorted solids. */
export function escapeSolids(v: DrawView, f: EscapeFrame): Solid[] {
  const out: Solid[] = [];
  const { x, y } = ESCAPE_AT;
  if (!v.onScreen(x, y, 600 * v.zoom)) return out;
  out.push({
    d: -1e9,
    f: () => {
      drawEscapePortal(v, f.portal);
      drawSplash(v, f.splash);
      drawReaperShadow(v, f.reaper.x, f.reaper.y, f.reaper.h, f.reaper.up);
    },
  });
  out.push({
    d: f.reaper.x + f.reaper.y,
    f: () => drawReaperFin(v, f.reaper.x, f.reaper.y, f.reaper.h, f.reaper.up, true, v.T),
  });
  const h = f.heron;
  if (h.shown)
    out.push({
      d: h.z > 0 ? 1e9 : h.x + h.y + 1,
      f: () => {
        const { ctx } = v;
        ctx.save();
        if (h.fly) {
          drawHeron(v, h.x, h.y, FACING, v.T * 6, { fly: true, lift: h.z });
        } else {
          // In the water: sunk to his chest, what is under the surface hidden. He flaps, struggling, until he raises
          // his staff; then he goes down, through the surface and into the portal.
          const surface = v.py(h.x, h.y);
          ctx.beginPath();
          ctx.rect(-1e5, -1e5, 2e5, surface + 1e5);
          ctx.clip();
          const bob = Math.sin(v.T * 7) * 2 - h.sink * 70;
          drawHeron(v, h.x, h.y, FACING, v.T * 6, {
            fly: h.cast < 0.15,
            lift: -IN_WATER + bob,
            cast: h.cast,
          });
        }
        ctx.restore();
        ctx.save();
        if (!h.fly && h.sink < 0.5) {
          // Water churning round him as he flounders.
          ctx.strokeStyle = 'rgba(255,255,255,.6)';
          ctx.lineWidth = 1.6 * v.zoom;
          const k = (v.T * 1.6) % 1;
          ctx.beginPath();
          ctx.ellipse(
            v.px(h.x, h.y),
            v.py(h.x, h.y),
            (16 + 14 * k) * v.zoom,
            (8 + 7 * k) * v.zoom,
            0,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
        ctx.restore();
      },
    });
  return out;
}
