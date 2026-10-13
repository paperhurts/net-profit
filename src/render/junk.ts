/**
 * The junk the net brings up (data/junk.ts), drawn small as it flies aboard: an old brown boot with a dark sole, a
 * tin can with a red label, a clump of green seaweed, and a soggy striped sock. Screen space, turning as it flies.
 */

import type { JunkKind } from '../data/junk';

/** A piece of junk centred on screen point x, y, about r across, turned by spin. */
export function drawJunk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  kind: JunkKind,
  spin: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (kind === 'boot') {
    ctx.fillStyle = '#7A4E2A';
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r);
    ctx.lineTo(r * 0.1, -r);
    ctx.lineTo(r * 0.15, r * 0.15);
    ctx.lineTo(r * 0.95, r * 0.3);
    ctx.lineTo(r * 0.95, r * 0.7);
    ctx.lineTo(-r * 0.55, r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2E2219';
    ctx.fillRect(-r * 0.6, r * 0.62, r * 1.6, r * 0.3);
    ctx.strokeStyle = '#C9A06A';
    ctx.lineWidth = Math.max(0.6, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, -r * 0.55);
    ctx.lineTo(-r * 0.05, -r * 0.4);
    ctx.moveTo(-r * 0.25, -r * 0.2);
    ctx.lineTo(-r * 0.05, -r * 0.05);
    ctx.stroke();
  } else if (kind === 'can') {
    ctx.fillStyle = '#AEB8BD';
    ctx.fillRect(-r * 0.55, -r * 0.8, r * 1.1, r * 1.6);
    ctx.fillStyle = '#D23B3B';
    ctx.fillRect(-r * 0.55, -r * 0.35, r * 1.1, r * 0.7);
    ctx.fillStyle = '#DCE3E6';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.8, r * 0.55, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F2C230';
    ctx.fillRect(-r * 0.2, -r * 0.12, r * 0.4, r * 0.24);
  } else if (kind === 'weed') {
    ctx.strokeStyle = '#3E8A4A';
    ctx.lineWidth = Math.max(1, r * 0.32);
    for (const k of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(k * r * 0.3, r * 0.8);
      ctx.quadraticCurveTo(k * r * 0.3 + r * 0.6, 0, k * r * 0.45 - r * 0.2, -r * 0.4);
      ctx.quadraticCurveTo(k * r * 0.5 - r * 0.6, -r * 0.8, k * r * 0.55, -r);
      ctx.stroke();
    }
    ctx.fillStyle = '#6FBF5E';
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.2, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // The sock: white, with a red band at the top and the toe, slumped into an L.
    ctx.strokeStyle = '#F4F1E8';
    ctx.lineWidth = r * 0.62;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.8);
    ctx.lineTo(-r * 0.3, r * 0.35);
    ctx.lineTo(r * 0.6, r * 0.45);
    ctx.stroke();
    ctx.strokeStyle = '#D23B3B';
    ctx.lineWidth = r * 0.64;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.85);
    ctx.lineTo(-r * 0.3, -r * 0.55);
    ctx.moveTo(r * 0.45, r * 0.43);
    ctx.lineTo(r * 0.65, r * 0.46);
    ctx.stroke();
  }
  ctx.restore();
}
