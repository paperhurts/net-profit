/**
 * Drawing the plants in world/plants.ts: sea grass and kelp under the water,
 * flowers and tufts of grass flat on the ground, and the bushes as solids so
 * the figure and the monkeys sort in front of them or behind. Everything sways
 * a little, the kelp slowest.
 */
import type { DrawView } from '../entities/entity';
import { FLOWER_COLORS, PLANTS, type Plant } from '../world/plants';
import type { Solid } from './layers';

const GRASS = ['rgba(52,128,84,.5)', 'rgba(70,142,92,.45)', 'rgba(40,112,90,.5)'] as const;
const KELP = ['rgba(118,104,44,.42)', 'rgba(96,110,52,.42)', 'rgba(134,112,50,.38)'] as const;
const TUFT = ['#8DB35A', '#A8C46A', '#7FA650'] as const;

const flower = (i: number): string => FLOWER_COLORS[i % FLOWER_COLORS.length] ?? '#FFF1D6';

/** Sea grass and kelp, swaying under the water. Drawn before the waves and the fish. */
export function drawUnderwaterPlants(v: DrawView): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  ctx.lineCap = 'round';
  for (const p of PLANTS) {
    if ((p.kind !== 'seagrass' && p.kind !== 'kelp') || !v.onScreen(p.x, p.y, 60)) continue;
    const bx = px(p.x, p.y);
    const by = py(p.x, p.y);
    if (p.kind === 'seagrass') {
      ctx.strokeStyle = GRASS[p.tint % GRASS.length] ?? GRASS[0];
      ctx.lineWidth = 1.8 * Z;
      for (let i = 0; i < 6; i++) {
        const off = (i - 2.5) * 2.4 * Z;
        const h = p.r * (0.7 + ((i * 37 + p.tint * 11) % 10) / 20) * Z;
        const sway = Math.sin(T * 1.2 + p.ph + i * 0.6) * 3 * Z;
        ctx.beginPath();
        ctx.moveTo(bx + off, by);
        ctx.quadraticCurveTo(bx + off + sway * 0.5, by - h * 0.6, bx + off + sway, by - h);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = KELP[p.tint % KELP.length] ?? KELP[0];
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 2.6 * Z;
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * 6 * Z;
        const h = p.r * (0.85 + 0.15 * i) * Z;
        const w1 = Math.sin(T * 0.6 + p.ph + i) * 6 * Z;
        const w2 = Math.sin(T * 0.6 + p.ph + i + 1.4) * 8 * Z;
        ctx.beginPath();
        ctx.moveTo(bx + off, by);
        ctx.bezierCurveTo(
          bx + off + w1,
          by - h * 0.35,
          bx + off - w1,
          by - h * 0.7,
          bx + off + w2,
          by - h,
        );
        ctx.stroke();
        // A float or two along each strand.
        ctx.beginPath();
        ctx.arc(bx + off + w2, by - h, 2.2 * Z, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** Flowers and tufts of grass, flat on the ground. Drawn with the island's flat parts. */
export function drawGroundPlants(v: DrawView): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  ctx.lineCap = 'round';
  for (const p of PLANTS) {
    if ((p.kind !== 'flowers' && p.kind !== 'tuft') || !v.onScreen(p.x, p.y, 40)) continue;
    if (p.kind === 'tuft') {
      const bx = px(p.x, p.y);
      const by = py(p.x, p.y);
      ctx.strokeStyle = TUFT[p.tint % TUFT.length] ?? TUFT[0];
      ctx.lineWidth = 1.6 * Z;
      for (let i = 0; i < 5; i++) {
        const lean = (i - 2) * 0.35;
        const h = p.r * (1.1 + 0.25 * Math.cos(i * 1.7)) * Z;
        const sway = Math.sin(T * 1.6 + p.ph + i * 0.4) * 2 * Z;
        ctx.beginPath();
        ctx.moveTo(bx + (i - 2) * 1.2 * Z, by);
        ctx.quadraticCurveTo(bx + lean * h * 0.4, by - h * 0.6, bx + lean * h * 0.8 + sway, by - h);
        ctx.stroke();
      }
      continue;
    }
    // A patch of flowers: a few leaves, then small five-petalled flowers with gold middles.
    ctx.fillStyle = '#3E8E4E';
    for (let i = 0; i < 4; i++) {
      const a = p.ph + i * 1.6;
      v.isoEllipse(p.x + Math.cos(a) * p.r * 0.5, p.y + Math.sin(a) * p.r * 0.5, p.r * 0.32);
      ctx.fill();
    }
    for (let i = 0; i < 6; i++) {
      const a = p.ph * 2 + i * 2.4;
      const d = p.r * (0.2 + ((i * 7) % 5) / 6);
      const fx = px(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
      const fy = py(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 2);
      ctx.fillStyle = flower(p.tint + (i % 2));
      for (let k = 0; k < 5; k++) {
        const q = (k / 5) * Math.PI * 2 + p.ph;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(q) * 1.9 * Z, fy + Math.sin(q) * 1.1 * Z, 1.5 * Z, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#F2B33A';
      ctx.beginPath();
      ctx.arc(fx, fy, 0.9 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A flowering bush: a mound of leaves, darker below, with blooms on top, nodding a little. */
function drawBush(v: DrawView, p: Plant): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const sway = Math.sin(T * 1.1 + p.ph) * 0.8 * Z;
  const x = px(p.x, p.y);
  const y = py(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,.14)';
  v.isoEllipse(p.x, p.y, p.r * 1.1);
  ctx.fill();
  const lobes: readonly [number, number, number, string][] = [
    [-0.55, -0.45, 0.62, '#3E8E4E'],
    [0.55, -0.45, 0.62, '#3E8E4E'],
    [0, -0.75, 0.72, '#4FA35B'],
    [-0.3, -1.15, 0.55, '#5BB066'],
    [0.32, -1.1, 0.55, '#5BB066'],
  ];
  for (const [dx, dy, s, c] of lobes) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(
      x + dx * p.r * Z + sway * -dy,
      y + dy * p.r * Z,
      s * p.r * Z,
      s * p.r * 0.8 * Z,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = flower(p.tint);
  for (let i = 0; i < 6; i++) {
    const a = p.ph + i * 2.1;
    const fx = x + Math.cos(a) * p.r * 0.75 * Z + sway;
    const fy = y - p.r * (0.95 + Math.sin(a) * 0.35) * Z;
    ctx.beginPath();
    ctx.arc(fx, fy, 1.9 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The bushes in view, for the depth-sorted solids: world x + y, like everything else there. */
export function bushSolids(v: DrawView): Solid[] {
  const out: Solid[] = [];
  for (const p of PLANTS) {
    if (p.kind !== 'bush' || !v.onScreen(p.x, p.y, 40)) continue;
    out.push({ d: p.x + p.y, f: () => drawBush(v, p) });
  }
  return out;
}
