/**
 * A pet battle, drawn (entities/petfight.ts): the sandy ring in the pet house's yard with its rope and posts, the two
 * pets, and what the fight shows: the trainer's pet's big moves in red on the ground first (a ring where it will slam,
 * a lane where it will charge), deepening as they come; spit flying; a curled pet's shell; stars round a dazed one;
 * a chomp in front of a biting one; a pet just hit blinking.
 */
import type { Rig } from '../data/doodle';
import type { DrawView } from '../entities/entity';
import {
  BITE_T,
  CHARGE_W,
  type Fighter,
  laneLen,
  type PetFight,
  POUNCE_T,
  RING_R,
} from '../entities/petfight';
import { drawStun } from './battlefx';
import { drawWalking, PET_SIZE } from './petsys';

/** The ring, at world x, y: sand, the rope, four posts. */
export function drawRing(v: DrawView, x: number, y: number): void {
  const { ctx } = v;
  v.isoEllipse(x, y, RING_R + 4);
  ctx.fillStyle = '#E9D3A1';
  ctx.fill();
  v.isoEllipse(x, y, RING_R - 6);
  ctx.strokeStyle = 'rgba(160,120,70,.25)';
  ctx.lineWidth = 1.2 * v.zoom;
  ctx.stroke();
  v.isoEllipse(x, y, RING_R + 4, 6);
  ctx.strokeStyle = '#B5543A';
  ctx.lineWidth = 1.6 * v.zoom;
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const px = x + Math.cos(a) * (RING_R + 4);
    const py = y + Math.sin(a) * (RING_R + 4);
    ctx.fillStyle = '#7A4E2D';
    ctx.fillRect(v.px(px, py) - 1.6 * v.zoom, v.py(px, py, 9), 3.2 * v.zoom, 9 * v.zoom);
  }
}

/** What is on the ground: the red of a big move being wound up, and spit in flight. Drawn before the pets. */
export function drawFightGround(v: DrawView, f: PetFight, x: number, y: number): void {
  const { ctx } = v;
  const k = f.windK;
  if (f.foeState === 'wind' && f.move === 'slam') {
    v.isoEllipse(x + f.at.x, y + f.at.y, f.trainer.slamR);
    ctx.fillStyle = `rgba(220,40,30,${0.14 + 0.22 * k})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(230,50,40,${0.55 + 0.4 * k})`;
    ctx.lineWidth = 1.8 * v.zoom;
    ctx.stroke();
  } else if (f.foeState === 'wind' && f.move === 'charge') {
    // The lane it will charge down: from where it stands, its body's width and then some.
    const nx = -f.dir.y * CHARGE_W;
    const ny = f.dir.x * CHARGE_W;
    const len = laneLen(f.at, f.dir);
    const ex = f.at.x + f.dir.x * len;
    const ey = f.at.y + f.dir.y * len;
    const pts: [number, number][] = [
      [f.at.x + nx, f.at.y + ny],
      [ex + nx, ey + ny],
      [ex - nx, ey - ny],
      [f.at.x - nx, f.at.y - ny],
    ];
    ctx.beginPath();
    for (const [px, py] of pts) ctx.lineTo(v.px(x + px, y + py), v.py(x + px, y + py, 0));
    ctx.closePath();
    ctx.fillStyle = `rgba(220,40,30,${0.14 + 0.22 * k})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(230,50,40,${0.55 + 0.4 * k})`;
    ctx.lineWidth = 1.8 * v.zoom;
    ctx.stroke();
  } else if (f.foeState === 'open' && f.foeT < 0.3 && f.trainer.moves.includes('slam')) {
    // The dust where it landed.
    const d = f.foeT / 0.3;
    v.isoEllipse(x + f.foe.x, y + f.foe.y, f.trainer.slamR * (0.8 + d * 0.6));
    ctx.strokeStyle = `rgba(200,170,120,${0.8 * (1 - d)})`;
    ctx.lineWidth = 3 * v.zoom;
    ctx.stroke();
  }
  for (const s of f.spits) {
    ctx.fillStyle = '#7FD36B';
    ctx.beginPath();
    ctx.arc(v.px(x + s.x, y + s.y), v.py(x + s.x, y + s.y, 10), 2.6 * v.zoom, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** One pet in the fight, at world x, y (its spot in the ring added): blinking if just hit, with what it is doing. */
export function drawFighter(
  v: DrawView,
  r: Rig,
  p: Fighter,
  x: number,
  y: number,
  z: number,
  T: number,
): void {
  const { ctx } = v;
  const wx = x + p.x;
  const wy = y + p.y;
  if (p.hurt > 0 && Math.floor(p.hurt * 16) % 2 === 0) return;
  // Leaping, it is in the air.
  const lift = p.pounce > 0 ? Math.sin((1 - p.pounce / POUNCE_T) * Math.PI) * 12 : 0;
  drawWalking(v, r, wx, wy, z + lift, p.h, T * 7, p.walk, 0, 1);
  const sx = v.px(wx, wy);
  const sy = v.py(wx, wy, z);
  const Z = v.zoom;
  if (p.curl > 0) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(122,86,52,.55)';
    ctx.strokeStyle = '#5A3B22';
    ctx.lineWidth = 1.6 * Z;
    ctx.beginPath();
    ctx.ellipse(
      sx,
      sy - PET_SIZE * 0.35 * Z,
      PET_SIZE * 0.45 * Z,
      PET_SIZE * 0.38 * Z,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  if (p.biteT > 0) {
    // A chomp in front of it, the way it faces.
    const face = Math.cos(p.h) - Math.sin(p.h) >= 0 ? 1 : -1;
    const k = p.biteT / BITE_T;
    const cx = sx + face * PET_SIZE * 0.45 * Z;
    const cy = sy - PET_SIZE * 0.45 * Z;
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2 * Z;
    ctx.globalAlpha = k;
    ctx.beginPath();
    ctx.arc(cx, cy, 5 * Z, -0.9, 0.9);
    ctx.moveTo(cx - 3 * Z * face, cy - 6 * Z);
    ctx.lineTo(cx + 3 * Z * face, cy - 2 * Z);
    ctx.stroke();
    ctx.restore();
  }
  if (p.daze > 0) drawStun(ctx, sx, sy - (PET_SIZE - 30) * Z, Z, T);
}
