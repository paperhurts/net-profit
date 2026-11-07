/**
 * Drawing the goat cave (entities/goatcave.ts), side-on, filling the screen above the arrows like the treehouse climb:
 * the cave's dark back, stalactites hanging from its roof and glowing cheese crystals in its walls, rock ledges with
 * a lighter lip, the fondue pit bubbling, the door out at the left, the fainting goats (standing, ambling, frozen
 * with a "!", or over stiff), the goat to find with a sparkle on it, and the figure, in its own colours.
 */
import { type CaveRoom, KIND_NAMES } from '../data/goatcave';
import type { GoatCave } from '../entities/goatcave';
import { drawGoat, type GoatLook, PLAIN_GOAT } from './goatisle';
import type { SkierLook } from './slalom';

export type CaveFrame = {
  k: number;
  X: (x: number) => number;
  Y: (y: number) => number;
  top: number;
  bottom: number;
};

/** How much of the room is in view across a phone: about two jumps either side, so a goat is big enough to see. */
export const VIEW_W = 190;

/**
 * The room as big as the screen allows between the top's buttons and the arrows, riding across with the figure (cam,
 * the room's x the view centres on), never past its ends.
 */
export function caveFrame(
  W: number,
  H: number,
  top: number,
  room: CaveRoom,
  padRoom: number,
  cam: number,
): CaveFrame {
  const vTop = top + 40;
  const vBottom = Math.max(vTop + 120, H - padRoom);
  const k = Math.max(0.5, Math.min(W / VIEW_W, (vBottom - vTop) / (room.h + 30)));
  const seen = W / k;
  const mid = seen >= room.w ? room.w / 2 : Math.max(seen / 2, Math.min(room.w - seen / 2, cam));
  const ox = W / 2 - mid * k;
  const base = vBottom - 30 * k;
  return { k, X: (x) => ox + x * k, Y: (y) => base - y * k, top: vTop, bottom: vBottom };
}

const COATS: readonly GoatLook[] = [
  PLAIN_GOAT,
  { coat: '#C79B6B', dark: '#6E4C2E' },
  { coat: '#3A3532', dark: '#1E1B19' },
];
const PYGMY: GoatLook = { coat: '#9C7A55', dark: '#5A4126', kid: true };

/** A number from a seed, the same every frame. */
function hash(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function drawCave(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  c: GoatCave,
  look: SkierLook,
  T: number,
  f: CaveFrame,
): void {
  const room = c.room;
  const k = f.k;
  // The dark of the cave, all over, and its back wall a little lighter behind the room.
  ctx.fillStyle = '#1A1218';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, f.Y(room.h), 0, f.Y(0));
  g.addColorStop(0, '#2E2230');
  g.addColorStop(1, '#4A3438');
  ctx.fillStyle = g;
  ctx.fillRect(f.X(0), f.Y(room.h), room.w * k, room.h * k);
  // Glowing cheese crystals here and there in the back wall.
  for (let i = 0; i < 14; i++) {
    const x = f.X(hash(i) * room.w);
    const y = f.Y(30 + hash(i + 40) * (room.h - 50));
    const s = (1.4 + hash(i + 80) * 1.8) * k;
    const glow = 0.55 + 0.25 * Math.sin(T * 1.5 + i);
    ctx.fillStyle = `rgba(255,214,90,${glow * 0.18})`;
    ctx.beginPath();
    ctx.arc(x, y, s * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,220,110,${glow})`;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.6, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s * 0.6, y);
    ctx.closePath();
    ctx.fill();
  }
  // Stalactites from the roof.
  ctx.fillStyle = '#3A2C30';
  for (let i = 0; i < 16; i++) {
    const x = (i + 0.3 + hash(i + 7) * 0.4) * (room.w / 16);
    const len = 8 + hash(i + 3) * 18;
    ctx.beginPath();
    ctx.moveTo(f.X(x - 5), f.Y(room.h));
    ctx.lineTo(f.X(x + 5), f.Y(room.h));
    ctx.lineTo(f.X(x), f.Y(room.h - len));
    ctx.closePath();
    ctx.fill();
  }
  // The door out, at the left: an arch of daylight.
  const d = room.door;
  ctx.fillStyle = '#F2E2B0';
  ctx.beginPath();
  ctx.moveTo(f.X(d.x - 12), f.Y(0));
  ctx.lineTo(f.X(d.x - 12), f.Y(20));
  ctx.arc(f.X(d.x), f.Y(20), 12 * k, Math.PI, 0);
  ctx.lineTo(f.X(d.x + 12), f.Y(0));
  ctx.closePath();
  ctx.fill();
  // The fondue pit, bubbling.
  const p = room.pit;
  if (p) {
    ctx.fillStyle = '#E7A92C';
    ctx.fillRect(f.X(p.x0), f.Y(p.y1), (p.x1 - p.x0) * k, (p.y1 - p.y0) * k);
    ctx.fillStyle = '#FFD45E';
    ctx.beginPath();
    ctx.moveTo(f.X(p.x0), f.Y(p.y1));
    for (let x = p.x0; x <= p.x1; x += 2)
      ctx.lineTo(f.X(x), f.Y(p.y1 + Math.sin(T * 3 + x * 0.3) * 1.2));
    ctx.lineTo(f.X(p.x1), f.Y(p.y1 - 3));
    ctx.lineTo(f.X(p.x0), f.Y(p.y1 - 3));
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const t = (T * 0.6 + i * 0.27) % 1;
      const x = p.x0 + 6 + hash(i + 20) * (p.x1 - p.x0 - 12);
      ctx.strokeStyle = `rgba(255,236,160,${1 - t})`;
      ctx.lineWidth = 1.2 * k;
      ctx.beginPath();
      ctx.arc(f.X(x), f.Y(p.y1 + 1), (1 + t * 3) * k, Math.PI, 0);
      ctx.stroke();
    }
  }
  // The rock: dark faces, a lighter lip on top.
  for (const r of room.rock) {
    const x0 = Math.max(r.x0, -8);
    const x1 = Math.min(r.x1, room.w + 8);
    if (x1 <= x0) continue;
    ctx.fillStyle = '#5A4440';
    ctx.fillRect(f.X(x0), f.Y(r.y1), (x1 - x0) * k, (r.y1 - r.y0) * k);
    ctx.fillStyle = '#7C6258';
    ctx.fillRect(f.X(x0), f.Y(r.y1), (x1 - x0) * k, 3 * k);
  }
  // The goat to find, with a sparkle until it is found, and its name over it once it is.
  const fd = room.find;
  drawGoat(ctx, f.X(fd.x), f.Y(fd.y), k * 0.9, -1, PYGMY, c.found ? T * 6 : 0);
  if (!c.found) {
    const s = (3 + Math.sin(T * 5) * 1.2) * k;
    ctx.fillStyle = '#FFF2A8';
    ctx.beginPath();
    ctx.arc(f.X(fd.x + 6), f.Y(fd.y + 16), s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFF2A8';
    ctx.lineWidth = 1 * k;
    ctx.beginPath();
    ctx.moveTo(f.X(fd.x + 6) - s, f.Y(fd.y + 16));
    ctx.lineTo(f.X(fd.x + 6) + s, f.Y(fd.y + 16));
    ctx.moveTo(f.X(fd.x + 6), f.Y(fd.y + 16) - s);
    ctx.lineTo(f.X(fd.x + 6), f.Y(fd.y + 16) + s);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#FFF2A8';
    ctx.font = `800 ${7 * k}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(KIND_NAMES[fd.kind], f.X(fd.x - 8), f.Y(fd.y + 22));
  }
  // The fainting goats (the one held over the figure's head after the figure, in front of it).
  for (const gt of c.goats) {
    if (gt !== c.held) drawCaveGoat(ctx, f, gt, T);
  }
  drawCaver(ctx, f, c, look, T);
  if (c.held) drawCaveGoat(ctx, f, c.held, T);
}

/** A goat in the cave: standing, ambling, frozen with a "!", or stiff on its back (quivering), in its coat. */
function drawCaveGoat(
  ctx: CanvasRenderingContext2D,
  f: CaveFrame,
  gt: GoatCave['goats'][number],
  T: number,
): void {
  const k = f.k;
  const look = COATS[gt.look % COATS.length] ?? PLAIN_GOAT;
  const quiver = gt.state === 'faint' && gt.k >= 1 ? Math.sin(T * 40 + gt.look) * 0.4 * k : 0;
  drawGoat(
    ctx,
    f.X(gt.x) + quiver,
    f.Y(gt.y),
    k * 0.85,
    gt.dir,
    look,
    gt.state === 'amble' ? gt.step : 0,
    gt.state === 'faint' ? gt.k : 0,
  );
  if (gt.state === 'startled') {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#3A2614';
    ctx.lineWidth = 2 * k;
    ctx.font = `900 ${10 * k}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeText('!', f.X(gt.x), f.Y(gt.y + 22));
    ctx.fillText('!', f.X(gt.x), f.Y(gt.y + 22));
  }
}

/** The figure, side-on: legs walking, its shirt, its head, and the yellow hat. */
function drawCaver(
  ctx: CanvasRenderingContext2D,
  f: CaveFrame,
  c: GoatCave,
  look: SkierLook,
  T: number,
): void {
  const k = f.k;
  ctx.save();
  ctx.translate(f.X(c.x), f.Y(c.y));
  ctx.scale(c.face * k, k);
  const walking = c.ground && Math.abs(c.vx) > 0;
  const swing = c.ground ? Math.sin(T * 14) * 2.4 : 1.6;
  ctx.strokeStyle = '#2B3442';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-1, -7);
  ctx.lineTo(-1 - swing * (walking ? 1 : 0.4), 0);
  ctx.moveTo(1, -7);
  ctx.lineTo(1 + swing * (walking ? 1 : 0.4), 0);
  ctx.stroke();
  ctx.fillStyle = look.shirt;
  ctx.fillRect(-3, -14, 6, 8);
  // Arms up, holding a goat over its head.
  if (c.held) {
    ctx.strokeStyle = look.skin;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2.6, -12.5);
    ctx.lineTo(-4, -16.8);
    ctx.moveTo(2.6, -12.5);
    ctx.lineTo(4, -16.8);
    ctx.stroke();
  }
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(0, -16.5, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F2C230';
  ctx.beginPath();
  ctx.ellipse(0.4, -18.6, 4.4, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-2.2, -21, 4.6, 2.6);
  ctx.restore();
}
