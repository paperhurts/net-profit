/**
 * Your fish board in the first hall of Gigantis (data/fishwall.ts): a tall board of dark wood standing on two legs,
 * facing the hall, a little framed place on it for each kind of fish, the fish in its colours once caught.
 */

import { FISH_ROW, FISH_WALL_HALF, FISH_Z0, fishRows, fishSlot } from '../data/fishwall';
import type { Species } from '../data/tuning';
import type { DrawView } from '../entities/entity';

const D = Math.SQRT1_2;

/** The board at (x, y), each kind of fish in the sea in order, caught or not. */
export function drawFishWall(
  v: DrawView,
  x: number,
  y: number,
  species: readonly Species[],
  caught: readonly boolean[],
): void {
  const { ctx, px, py, zoom: Z } = v;
  const W = FISH_WALL_HALF;
  const rows = fishRows(species.length);
  const top = FISH_Z0 + (rows - 1) * FISH_ROW + FISH_ROW * 0.7;
  // A point on its face: u across it from -1 to 1, z up it.
  const at = (u: number, z: number): [number, number] => [
    px(x + u * W * D, y - u * W * D),
    py(x + u * W * D, y - u * W * D, z),
  ];
  const quad = (u0: number, u1: number, z0: number, z1: number, c: string) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(...at(u0, z0));
    ctx.lineTo(...at(u1, z0));
    ctx.lineTo(...at(u1, z1));
    ctx.lineTo(...at(u0, z1));
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  v.isoEllipse(x, y, W * 0.7);
  ctx.fill();
  for (const u of [-0.8, 0.8]) quad(u - 0.04, u + 0.04, 0, FISH_Z0 - 6, '#3A2414');
  quad(-1.06, 1.06, FISH_Z0 - 8, top + 10, '#3A2414');
  quad(-1, 1, FISH_Z0 - 6, top, '#6A4426');
  // The name plank along its top, a gold fish on it.
  quad(-0.5, 0.5, top + 1.5, top + 8.5, '#C9A04A');
  const [gx, gy] = at(0, top + 5);
  ctx.fillStyle = '#6A4426';
  v.fishShape(gx, gy, 5 * Z, { fat: 0.32, tail: 0.5 } as Species, 0, 0);
  species.forEach((S, i) => {
    const s = fishSlot(i, rows);
    const du = 0.85 / 6;
    quad(s.u - du, s.u + du, s.z - FISH_ROW * 0.4, s.z + FISH_ROW * 0.4, '#2A1A10');
    const [fx, fy] = at(s.u, s.z);
    ctx.fillStyle = caught[i] ? S.c : 'rgba(255,255,255,.08)';
    if (S.crab) {
      ctx.beginPath();
      ctx.ellipse(fx, fy, 3 * Z, 2 * Z, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const e of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(fx + e * 3.6 * Z, fy - 1.6 * Z, 1.2 * Z, 0, Math.PI * 2);
        ctx.fill();
      }
    } else v.fishShape(fx, fy, 4.4 * Z, S, 0, 0);
    if (caught[i] && S.mark) {
      ctx.fillStyle = S.mark;
      ctx.fillRect(fx - 0.5 * Z, fy - 2 * Z, 1.2 * Z, 4 * Z);
    }
  });
}
