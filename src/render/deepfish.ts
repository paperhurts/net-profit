/**
 * The deep fish of the abyss's floor, the kid's nine besides the giant glow squid (his sixth list's answers: glow squid,
 * gloomers, clown fish, nibblers, stoplight loosejaws, viper fish, owl fish, chimaeras, coelacanths and frilled sharks),
 * each drawn side on at the origin, nose toward +x, L long from tail tip to nose and H high: the dive draws them in
 * the dark over the floor, the aquarium in its tank. The nibbler is his drawing (2026-10-17): a little brown fish
 * with a forked tail and a big open mouth; the gloomer is his "flower mouth on a naga's body", the long one with the
 * frilled flower of a head in the same drawing. And the Remoro, his great silver fish (entities/remoro.ts), and the
 * attack nibbler, the big toothy one in the same drawing biting a gloomer's tail (entities/attacknibbler.ts).
 */

import type { DeepKind } from '../world/trench';

/** Which deep fish a species is, by its name. */
export const DEEP_KINDS: Readonly<Record<string, DeepKind>> = {
  gloomer: 'gloomer',
  'clown fish': 'clown',
  nibbler: 'nibbler',
  'stoplight loosejaw': 'loosejaw',
  'viper fish': 'viper',
  'owl fish': 'owl',
  chimaera: 'chimaera',
  coelacanth: 'coelacanth',
  'frilled shark': 'frilled',
  remoro: 'remoro',
  'attack nibbler': 'attack',
};

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c = '#FFFFFF'): void {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#10141A';
  ctx.beginPath();
  ctx.arc(x + r * 0.2, y, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function oval(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  c: string,
): void {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A tail at x, beating: forked, fanned, or a point. */
function tail(
  ctx: CanvasRenderingContext2D,
  x: number,
  h: number,
  len: number,
  beat: number,
  c: string,
  kind: 'fork' | 'fan' | 'point',
): void {
  const b = beat * h * 0.25;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  if (kind === 'fork') {
    ctx.lineTo(x - len, -h + b);
    ctx.lineTo(x - len * 0.6, b * 0.5);
    ctx.lineTo(x - len, h + b);
  } else if (kind === 'fan') {
    ctx.lineTo(x - len, -h + b);
    ctx.quadraticCurveTo(x - len * 1.25, b, x - len, h + b);
  } else {
    ctx.lineTo(x - len, b);
    ctx.lineTo(x, h * 0.3);
  }
  ctx.closePath();
  ctx.fill();
}

/** One deep fish of a kind, side on at the origin, nose toward +x; ph beats its tail, T times its lights. */
export function drawDeepFish(
  ctx: CanvasRenderingContext2D,
  kind: DeepKind,
  L: number,
  H: number,
  ph: number,
  T: number,
): void {
  const beat = Math.sin(ph);
  const glowPulse = 0.75 + 0.25 * Math.sin(T * 3);
  ctx.lineCap = 'round';
  switch (kind) {
    case 'clown': {
      // Orange, three white bands edged in black, and rounded fins.
      tail(ctx, -L * 0.3, H * 0.45, L * 0.22, beat, '#F2762E', 'fan');
      oval(ctx, 0, 0, L * 0.36, H * 0.5, '#F2762E');
      for (const bx of [0.2, -0.02, -0.24]) {
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(L * bx - L * 0.045, -H * 0.46, L * 0.09, H * 0.92);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(L * bx - L * 0.03, -H * 0.44, L * 0.06, H * 0.88);
      }
      eye(ctx, L * 0.25, -H * 0.1, Math.max(1, H * 0.13));
      break;
    }
    case 'nibbler': {
      // The kid's: brown, a forked tail, and a big open mouth.
      tail(ctx, -L * 0.28, H * 0.5, L * 0.24, beat, '#8A5A34', 'fork');
      oval(ctx, 0, 0, L * 0.34, H * 0.5, '#8A5A34');
      // The mouth, wide open at the nose: dark inside, with little teeth.
      ctx.fillStyle = '#2A160C';
      ctx.beginPath();
      ctx.moveTo(L * 0.36, -H * 0.28);
      ctx.lineTo(L * 0.16, 0);
      ctx.lineTo(L * 0.36, H * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#F4EEDC';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(
          L * (0.22 + i * 0.045),
          -H * (0.18 - i * 0.05),
          Math.max(0.6, L * 0.02),
          H * 0.08,
        );
        ctx.fillRect(
          L * (0.22 + i * 0.045),
          H * (0.1 + i * 0.05),
          Math.max(0.6, L * 0.02),
          H * 0.08,
        );
      }
      eye(ctx, L * 0.12, -H * 0.24, Math.max(1, H * 0.12));
      break;
    }
    case 'loosejaw': {
      // Long and black, its lower jaw hanging open, and a red light under its eye: the stoplight.
      tail(ctx, -L * 0.38, H * 0.4, L * 0.14, beat, '#1A1418', 'fork');
      oval(ctx, -L * 0.02, 0, L * 0.4, H * 0.42, '#1A1418');
      ctx.strokeStyle = '#2E262C';
      ctx.lineWidth = Math.max(0.8, H * 0.12);
      ctx.beginPath();
      ctx.moveTo(L * 0.28, H * 0.1);
      ctx.lineTo(L * 0.48, H * 0.55);
      ctx.stroke();
      oval(ctx, L * 0.22, H * 0.12, L * 0.05 * glowPulse, H * 0.16 * glowPulse, '#FF3B3B');
      oval(ctx, L * 0.12, H * 0.08, L * 0.02, H * 0.07, '#7FD8FF');
      eye(ctx, L * 0.3, -H * 0.12, Math.max(1, H * 0.12));
      break;
    }
    case 'viper': {
      // Dark, a tall fin ray, a row of lights along its belly, and fangs too long to close its mouth over.
      tail(ctx, -L * 0.38, H * 0.4, L * 0.14, beat, '#23303A', 'fork');
      oval(ctx, -L * 0.02, 0, L * 0.4, H * 0.45, '#23303A');
      ctx.strokeStyle = '#3E4E5A';
      ctx.lineWidth = Math.max(0.6, H * 0.06);
      ctx.beginPath();
      ctx.moveTo(L * 0.2, -H * 0.4);
      ctx.quadraticCurveTo(L * 0.1, -H * 1.3, -L * 0.05, -H * 1.1);
      ctx.stroke();
      ctx.fillStyle = '#9FE8FF';
      for (let i = 0; i < 6; i++)
        ctx.fillRect(
          L * (0.22 - i * 0.09),
          H * 0.22,
          Math.max(0.7, L * 0.018),
          Math.max(0.7, L * 0.018),
        );
      ctx.strokeStyle = '#F2F6FA';
      ctx.lineWidth = Math.max(0.5, H * 0.06);
      ctx.beginPath();
      ctx.moveTo(L * 0.38, -H * 0.05);
      ctx.lineTo(L * 0.44, H * 0.5);
      ctx.moveTo(L * 0.42, H * 0.05);
      ctx.lineTo(L * 0.48, -H * 0.45);
      ctx.stroke();
      eye(ctx, L * 0.28, -H * 0.15, Math.max(1, H * 0.14));
      break;
    }
    case 'owl': {
      // Pale, with a pair of huge tube eyes looking up, like an owl's.
      tail(ctx, -L * 0.32, H * 0.42, L * 0.18, beat, '#C9C0B4', 'fan');
      oval(ctx, 0, 0, L * 0.36, H * 0.48, '#C9C0B4');
      ctx.fillStyle = '#B0A698';
      ctx.fillRect(L * 0.1, -H * 0.62, L * 0.16, H * 0.3);
      eye(ctx, L * 0.18, -H * 0.62, Math.max(1.4, H * 0.26), '#F6F2E6');
      break;
    }
    case 'chimaera': {
      // A ghost shark: silver, a great wing of a fin, a spine on its back, and a body that tapers to a whip.
      ctx.strokeStyle = '#B8C2CC';
      ctx.lineWidth = Math.max(0.6, H * 0.12);
      ctx.beginPath();
      ctx.moveTo(-L * 0.15, 0);
      ctx.quadraticCurveTo(-L * 0.35, beat * H * 0.3, -L * 0.5, beat * H * 0.1);
      ctx.stroke();
      oval(ctx, L * 0.1, 0, L * 0.3, H * 0.5, '#B8C2CC');
      ctx.fillStyle = '#9AA6B2';
      ctx.beginPath();
      ctx.moveTo(L * 0.18, H * 0.2);
      ctx.lineTo(-L * 0.1, H * (0.9 + beat * 0.15));
      ctx.lineTo(L * 0.02, H * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#E2E8EE';
      ctx.lineWidth = Math.max(0.5, H * 0.06);
      ctx.beginPath();
      ctx.moveTo(L * 0.2, -H * 0.45);
      ctx.lineTo(L * 0.12, -H * 0.95);
      ctx.stroke();
      eye(ctx, L * 0.3, -H * 0.12, Math.max(1.2, H * 0.2), '#BFF2C8');
      break;
    }
    case 'coelacanth': {
      // Big and deep blue, spotted white, with fins on fleshy lobes like little legs, and a tail with a third lobe.
      tail(ctx, -L * 0.32, H * 0.45, L * 0.18, beat, '#2E4E7A', 'fan');
      oval(ctx, -L * 0.36, 0, L * 0.08, H * 0.12, '#2E4E7A');
      oval(ctx, 0, 0, L * 0.36, H * 0.5, '#2E4E7A');
      for (const [fx, fy, d] of [
        [0.1, 0.5, 1],
        [-0.12, 0.5, 1],
        [0.02, -0.5, -1],
      ] as const) {
        oval(ctx, L * fx, H * fy, L * 0.05, H * 0.16, '#3A5E8E');
        oval(
          ctx,
          L * (fx - 0.03),
          H * (fy + d * 0.22 + beat * 0.04),
          L * 0.06,
          H * 0.12,
          '#557AA8',
        );
      }
      ctx.fillStyle = '#F4F4F0';
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.arc(
          L * (0.22 - i * 0.07),
          H * (((i * 37) % 7) / 10 - 0.3),
          Math.max(0.6, H * 0.06),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      eye(ctx, L * 0.26, -H * 0.12, Math.max(1.2, H * 0.12), '#E8D27A');
      break;
    }
    case 'frilled': {
      // A shark like an eel, brown, with frilly gills behind its head and a mouth full of little teeth.
      ctx.strokeStyle = '#5A4636';
      ctx.lineWidth = H;
      ctx.beginPath();
      ctx.moveTo(L * 0.3, 0);
      ctx.quadraticCurveTo(0, beat * H * 0.5, -L * 0.42, -beat * H * 0.3);
      ctx.stroke();
      oval(ctx, L * 0.36, 0, L * 0.12, H * 0.55, '#5A4636');
      ctx.strokeStyle = '#C46A5A';
      ctx.lineWidth = Math.max(0.6, H * 0.18);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(L * (0.24 - i * 0.03), -H * 0.45);
        ctx.lineTo(L * (0.22 - i * 0.03), H * 0.45);
        ctx.stroke();
      }
      ctx.fillStyle = '#F2EAD8';
      for (let i = 0; i < 3; i++)
        ctx.fillRect(L * (0.38 + i * 0.03), H * 0.12, Math.max(0.5, L * 0.012), H * 0.18);
      eye(ctx, L * 0.38, -H * 0.15, Math.max(0.8, H * 0.18), '#D8E86A');
      break;
    }
    case 'attack': {
      // The kid's drawing: shark-shaped and brown as the nibblers it is named for, a fin on its back, two clawed fins
      // under it, and a big mouth full of teeth, wide open.
      tail(ctx, -L * 0.36, H * 0.55, L * 0.18, beat, '#5E3E26', 'fork');
      ctx.fillStyle = '#5E3E26';
      ctx.beginPath();
      ctx.moveTo(-L * 0.06, -H * 0.36);
      ctx.lineTo(-L * 0.17, -H * 0.98);
      ctx.lineTo(L * 0.1, -H * 0.38);
      ctx.closePath();
      ctx.fill();
      oval(ctx, 0, 0, L * 0.4, H * 0.46, '#7A5234');
      oval(ctx, L * 0.02, H * 0.2, L * 0.32, H * 0.2, '#B08A64');
      // The two clawed fins under it, three claws on each.
      for (const fx of [0.1, -0.14]) {
        ctx.fillStyle = '#5E3E26';
        ctx.beginPath();
        ctx.moveTo(L * fx, H * 0.3);
        ctx.lineTo(L * (fx - 0.08), H * (0.86 + beat * 0.06));
        ctx.lineTo(L * (fx + 0.05), H * 0.36);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#F2EAD8';
        ctx.lineWidth = Math.max(0.5, H * 0.04);
        for (let c = -1; c <= 1; c++) {
          ctx.beginPath();
          ctx.moveTo(L * (fx - 0.08), H * (0.86 + beat * 0.06));
          ctx.lineTo(L * (fx - 0.1 + c * 0.02), H * (0.98 + beat * 0.06));
          ctx.stroke();
        }
      }
      // The mouth, wide open, dark inside, a row of teeth along each jaw.
      ctx.fillStyle = '#2A140C';
      ctx.beginPath();
      ctx.moveTo(L * 0.45, -H * 0.24);
      ctx.lineTo(L * 0.2, H * 0.02);
      ctx.lineTo(L * 0.45, H * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFBEF';
      for (let i = 0; i < 5; i++) {
        const k = (i + 0.5) / 5;
        const jx = L * (0.45 - 0.25 * k);
        const uy = -H * 0.24 + H * 0.26 * k;
        const ly = H * 0.32 - H * 0.3 * k;
        ctx.beginPath();
        ctx.moveTo(jx - L * 0.02, uy);
        ctx.lineTo(jx, uy + H * 0.12);
        ctx.lineTo(jx + L * 0.02, uy);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(jx - L * 0.02, ly);
        ctx.lineTo(jx, ly - H * 0.12);
        ctx.lineTo(jx + L * 0.02, ly);
        ctx.fill();
      }
      eye(ctx, L * 0.22, -H * 0.22, Math.max(1, H * 0.1), '#FFD86A');
      break;
    }
    case 'remoro': {
      // The kid's great silver fish: silver all over, darker along its back; long low fins either side of its back
      // half, a dark stripe down its side, a jutting lower jaw, and the striped sucker plate on top of its flat head.
      tail(ctx, -L * 0.34, H * 0.5, L * 0.16, beat, '#9AA8B6', 'fork');
      ctx.fillStyle = '#A9B6C3';
      for (const sy of [-1, 1] as const) {
        ctx.beginPath();
        ctx.moveTo(-L * 0.3, sy * H * 0.14);
        ctx.lineTo(-L * 0.26, sy * H * (0.54 + beat * 0.04));
        ctx.lineTo(-L * 0.02, sy * H * 0.46);
        ctx.lineTo(L * 0.06, sy * H * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      const silver = ctx.createLinearGradient(0, -H * 0.42, 0, H * 0.42);
      silver.addColorStop(0, '#8E9CAC');
      silver.addColorStop(0.45, '#C8D4DE');
      silver.addColorStop(1, '#EEF3F7');
      ctx.fillStyle = silver;
      ctx.beginPath();
      ctx.ellipse(L * 0.06, 0, L * 0.4, H * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4E5E70';
      ctx.lineWidth = Math.max(0.6, H * 0.09);
      ctx.beginPath();
      ctx.moveTo(L * 0.36, -H * 0.02);
      ctx.quadraticCurveTo(L * 0.02, H * 0.05, -L * 0.32, 0);
      ctx.stroke();
      // The lower jaw, jutting past the upper.
      ctx.fillStyle = '#7E8C9C';
      ctx.beginPath();
      ctx.moveTo(L * 0.4, H * 0.04);
      ctx.lineTo(L * 0.5, H * 0.1);
      ctx.lineTo(L * 0.38, H * 0.22);
      ctx.closePath();
      ctx.fill();
      // The sucker plate, ridged across, that a remora holds on with.
      oval(ctx, L * 0.24, -H * 0.36, L * 0.13, H * 0.12, '#5E6C7C');
      ctx.strokeStyle = '#C8D4DE';
      ctx.lineWidth = Math.max(0.5, L * 0.006);
      for (let i = 0; i < 7; i++) {
        const x = L * (0.14 + i * 0.033);
        ctx.beginPath();
        ctx.moveTo(x, -H * 0.43);
        ctx.lineTo(x, -H * 0.29);
        ctx.stroke();
      }
      // A fin at its side.
      ctx.fillStyle = '#A9B6C3';
      ctx.beginPath();
      ctx.moveTo(L * 0.22, H * 0.1);
      ctx.lineTo(L * 0.06, H * (0.32 + beat * 0.06));
      ctx.lineTo(L * 0.13, H * 0.08);
      ctx.closePath();
      ctx.fill();
      eye(ctx, L * 0.36, -H * 0.1, Math.max(1, H * 0.11), '#F6E7A8');
      break;
    }
    default: {
      // The gloomer, the kid's: a long naga's body with little fins along its underside, and a flower for a head.
      ctx.strokeStyle = '#6B4A7A';
      ctx.lineWidth = H;
      ctx.beginPath();
      ctx.moveTo(L * 0.3, 0);
      ctx.bezierCurveTo(
        L * 0.05,
        beat * H * 0.8,
        -L * 0.2,
        -beat * H * 0.8,
        -L * 0.45,
        beat * H * 0.4,
      );
      ctx.stroke();
      ctx.strokeStyle = '#4E3460';
      ctx.lineWidth = Math.max(0.5, H * 0.3);
      for (let i = 0; i < 4; i++) {
        const x = L * (0.15 - i * 0.13);
        ctx.beginPath();
        ctx.arc(x, H * 0.55, H * 0.35, 0, Math.PI);
        ctx.stroke();
      }
      // The flower: petals round its mouth, glowing pink.
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + Math.sin(T * 1.5) * 0.1;
        oval(
          ctx,
          L * 0.38 + Math.cos(a) * H * 1.1,
          Math.sin(a) * H * 1.1,
          H * 0.75 * glowPulse,
          H * 0.75 * glowPulse,
          '#FF7AB8',
        );
      }
      oval(ctx, L * 0.38, 0, H * 0.8, H * 0.8, '#FFD1E6');
      oval(ctx, L * 0.38, 0, H * 0.4, H * 0.4, '#5A1A3A');
      eye(ctx, L * 0.3, -H * 0.85, Math.max(0.8, H * 0.32));
    }
  }
}
