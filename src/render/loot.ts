/**
 * The trench's treasure, side on: an old spyglass, a gold crown, a ship's bell
 * and a glowing gem on little rock ledges out from the walls, and a treasure
 * chest and a giant clam on the floor. They are drawn under the dark, so the
 * lamp shows them up close; from further off each one not yet found glints
 * over the dark, a little gold star that twinkles, and the gem glows its own
 * pink. A found chest stays, its lid up and nothing inside; the clam opens on
 * its pearl when it has one and shuts when it does not.
 */

import type { Loot } from '../world/loot';

type Proj = (v: number) => number;

const GOLD = '#F2C14E';
const GOLD_DARK = '#B8862B';
const WOOD = '#6B4423';
const WOOD_DARK = '#4A2E17';
const BRASS = '#C9A24A';
const BRONZE = '#9C6B30';
const VERDIGRIS = '#5FA58C';
const LEDGE = '#0D1C26';
const GEM = '#FF6BD6';
const CLAM = '#7A6CC8';
const CLAM_DARK = '#4E4392';
const PEARL = '#F4F1FF';
/** Drawn bigger than life, as the diver is, so a small player spots it on a phone. */
const SIZE = 1.4;

/** One treasure, where it lies: gone once found, but for the chest (left open) and the clam (open or shut). */
export function drawLoot(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  l: Loot,
  T: number,
  found: boolean,
  pearl: boolean,
): void {
  const x = X(l.x);
  const y = Y(l.y);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * SIZE, s * SIZE);
  // A lip of rock out from the wall for it to lie on.
  if (l.on !== 'floor') {
    ctx.fillStyle = LEDGE;
    ctx.beginPath();
    ctx.ellipse(-l.on * 4, 7, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!found || l.kind === 'chest' || l.kind === 'clam') {
    switch (l.kind) {
      case 'chest':
        chest(ctx, found);
        break;
      case 'clam':
        clam(ctx, pearl, T);
        break;
      case 'crown':
        crown(ctx);
        break;
      case 'bell':
        bell(ctx);
        break;
      case 'gem':
        gem(ctx);
        break;
      case 'spyglass':
        spyglass(ctx);
        break;
    }
  }
  ctx.restore();
}

/** Over the dark: a twinkle on each treasure still there to find, and the gem's own glow. */
export function drawLootGlint(
  ctx: CanvasRenderingContext2D,
  X: Proj,
  Y: Proj,
  s: number,
  l: Loot,
  i: number,
  T: number,
  found: boolean,
  pearl: boolean,
): void {
  if (l.kind === 'clam' ? !pearl : found) return;
  const x = X(l.x);
  const y = Y(l.y - 4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (l.kind === 'gem') {
    const halo = ctx.createRadialGradient(x, y, 0, x, y, 30 * s);
    halo.addColorStop(0, 'rgba(255,107,214,.55)');
    halo.addColorStop(1, 'rgba(255,107,214,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, 30 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // A soft gold glow, and a star in it that swells and fades, each on its own beat.
  const k = 0.5 + 0.5 * Math.sin(T * 2.6 + i * 1.9);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 22 * s);
  glow.addColorStop(0, 'rgba(255,214,110,.35)');
  glow.addColorStop(1, 'rgba(255,214,110,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
  ctx.fill();
  const r = (6 + k * 7) * s;
  ctx.globalAlpha = 0.55 + 0.45 * k;
  ctx.fillStyle = '#FFE9A0';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.22, y - r * 0.22);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.22, y + r * 0.22);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.22, y + r * 0.22);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - r * 0.22, y - r * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A wooden chest with gold bands: shut and full, or its lid thrown back and nothing inside. */
function chest(ctx: CanvasRenderingContext2D, open: boolean): void {
  ctx.fillStyle = WOOD;
  ctx.fillRect(-11, -8, 22, 12);
  ctx.fillStyle = GOLD_DARK;
  ctx.fillRect(-11, -8, 22, 2);
  ctx.fillRect(-7, -8, 2.4, 12);
  ctx.fillRect(4.6, -8, 2.4, 12);
  if (open) {
    // Inside, dark and empty; the lid up behind.
    ctx.fillStyle = '#1A0F08';
    ctx.fillRect(-10, -9.5, 20, 2.5);
    ctx.fillStyle = WOOD_DARK;
    ctx.save();
    ctx.translate(-11, -9);
    ctx.rotate(-1.9);
    ctx.fillRect(0, -2, 22, 7);
    ctx.restore();
    return;
  }
  ctx.fillStyle = WOOD_DARK;
  ctx.beginPath();
  ctx.moveTo(-11, -8);
  ctx.quadraticCurveTo(0, -17, 11, -8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.fillRect(-1.6, -9.5, 3.2, 4);
  // Coins showing at the lid.
  ctx.beginPath();
  ctx.arc(-4, -9, 1.6, 0, Math.PI * 2);
  ctx.arc(3, -9.4, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

/** A giant clam, purple and frilled: open on a pearl, or shut tight. */
function clam(ctx: CanvasRenderingContext2D, pearl: boolean, T: number): void {
  ctx.fillStyle = CLAM_DARK;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 6, 0, 0, Math.PI);
  ctx.fill();
  const gape = pearl ? 0.45 + Math.sin(T * 0.8) * 0.05 : 0.04;
  ctx.save();
  ctx.translate(-15, 0);
  ctx.rotate(-gape);
  ctx.fillStyle = CLAM;
  ctx.beginPath();
  ctx.ellipse(15, 0, 16, 7, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // Frills along the lid's edge.
  ctx.strokeStyle = CLAM_DARK;
  ctx.lineWidth = 1;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(15 + i * 4, -6);
    ctx.lineTo(15 + i * 4.4, 0);
    ctx.stroke();
  }
  ctx.restore();
  if (pearl) {
    ctx.fillStyle = PEARL;
    ctx.beginPath();
    ctx.arc(3, -3, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A gold crown on its side, three points and two gems. */
function crown(ctx: CanvasRenderingContext2D): void {
  ctx.rotate(-0.25);
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(-10, 3);
  ctx.lineTo(-10, -6);
  ctx.lineTo(-5, -1);
  ctx.lineTo(0, -9);
  ctx.lineTo(5, -1);
  ctx.lineTo(10, -6);
  ctx.lineTo(10, 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = GOLD_DARK;
  ctx.fillRect(-10, 1, 20, 2.4);
  ctx.fillStyle = '#E4573E';
  ctx.beginPath();
  ctx.arc(0, -2, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4FA3E8';
  ctx.beginPath();
  ctx.arc(-6, 0, 1.4, 0, Math.PI * 2);
  ctx.arc(6, 0, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

/** A ship's bell lying on its side, bronze gone green in places. */
function bell(ctx: CanvasRenderingContext2D): void {
  ctx.rotate(1.25);
  ctx.fillStyle = BRONZE;
  ctx.beginPath();
  ctx.moveTo(-3, -9);
  ctx.quadraticCurveTo(-5, -2, -9, 6);
  ctx.lineTo(9, 6);
  ctx.quadraticCurveTo(5, -2, 3, -9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = VERDIGRIS;
  ctx.beginPath();
  ctx.ellipse(-3, 1, 2.6, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BRASS;
  ctx.fillRect(-2, -12, 4, 3);
  ctx.beginPath();
  ctx.arc(0, 8, 2, 0, Math.PI * 2);
  ctx.fill();
}

/** A cut gem stuck in the rock, pink, with a bright facet. */
function gem(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = GEM;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, -2);
  ctx.lineTo(0, 6);
  ctx.lineTo(-6, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFD1F2';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(2.5, -2);
  ctx.lineTo(-2.5, -2);
  ctx.closePath();
  ctx.fill();
}

/** An old brass spyglass, its tubes drawn out. */
function spyglass(ctx: CanvasRenderingContext2D): void {
  ctx.rotate(-0.15);
  ctx.fillStyle = BRASS;
  ctx.fillRect(-12, -2, 9, 4);
  ctx.fillRect(-4, -2.6, 8, 5.2);
  ctx.fillRect(4, -3.2, 8, 6.4);
  ctx.fillStyle = GOLD_DARK;
  ctx.fillRect(-4.5, -2.8, 1.2, 5.6);
  ctx.fillRect(3.5, -3.4, 1.2, 6.8);
  ctx.fillStyle = '#9FD3E8';
  ctx.beginPath();
  ctx.ellipse(12, 0, 1, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}
