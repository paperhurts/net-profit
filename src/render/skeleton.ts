/**
 * Skeletons (Tomb Island, part eight, the kid's "skeletons of the leviathan they are repersenting"): the bones drawn
 * over a beast's own faint flesh in the fog sea, along its own body. A spine of knobbly bones down its length, ribs
 * curving out from it, and a skull at its head with dark sockets and teeth. Each beast says where its body runs; these
 * draw the bones there, solid through the bone look (render/bone.ts solid).
 */
import { solid } from './bone';

/** Bone, and the dark round it that makes it read on the water. */
const BONE = '#F1EADA';
const EDGE = '#2C2620';
const SOCKET = '#16120F';

type Pt = readonly [number, number];

/**
 * A spine down a chain of screen points, head first, with ribs either side as wide as the body is there (widths, in
 * pixels, one a point; 0 for none). Ribs bow down the screen a little, as a ribcage seen from above and to the side.
 */
export function drawSpine(
  ctx: CanvasRenderingContext2D,
  pts: readonly Pt[],
  widths: readonly number[],
  Z: number,
  alpha = 1,
): void {
  if (pts.length < 2) return;
  solid(() => {
    const was = ctx.globalAlpha;
    ctx.globalAlpha = was * alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Ribs first, under the spine.
    for (let i = 1; i < pts.length - 1; i++) {
      const w = widths[i] ?? 0;
      if (w < 3 * Z) continue;
      const [x0, y0] = pts[i - 1] as Pt;
      const [x1, y1] = pts[i + 1] as Pt;
      const [x, y] = pts[i] as Pt;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l;
      const ny = dx / l;
      // Back toward the tail a little, as ribs sweep.
      const bx = (-dx / l) * w * 0.35;
      const by = (-dy / l) * w * 0.35;
      for (const side of [-1, 1]) {
        const ex = x + nx * w * side + bx;
        const ey = y + ny * w * side + by;
        const cx = x + nx * w * side * 0.7;
        const cy = y + ny * w * side * 0.7 + w * 0.35;
        for (const [c, lw] of [
          [EDGE, 3.6],
          [BONE, 2],
        ] as const) {
          ctx.strokeStyle = c;
          ctx.lineWidth = lw * Z;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(cx, cy, ex, ey);
          ctx.stroke();
        }
      }
    }
    // The spine: a line of bones, each a knob.
    for (const [c, lw] of [
      [EDGE, 5],
      [BONE, 3],
    ] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = lw * Z;
      ctx.beginPath();
      for (const [i, [x, y]] of pts.entries()) {
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = BONE;
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = 1.2 * Z;
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = pts[i] as Pt;
      const r = Math.max(1.6, Math.min(4, (widths[i] ?? 0) * 0.12)) * Z;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = was;
  });
}

/**
 * A skull at screen x, y, this many pixels across, looking along screen angle a: a round dome, two dark sockets, a
 * nose hole, and a jaw of teeth, open as wide as gape (0..1).
 */
export function drawSkull(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  a: number,
  gape = 0,
  eyes?: string,
): void {
  solid(() => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    // Along the look, and across it.
    const at = (f: number, g: number): [number, number] => [
      x + (c * f - s * g) * size,
      y + (s * f + c * g) * size,
    ];
    ctx.lineJoin = 'round';
    // The jaw, below and ahead, dropping as it opens.
    const j = 0.18 + gape * 0.3;
    ctx.fillStyle = BONE;
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.beginPath();
    ctx.moveTo(...at(-0.05, -0.3));
    ctx.lineTo(...at(0.55, -0.22 - j));
    ctx.lineTo(...at(0.55, 0.22 + j));
    ctx.lineTo(...at(-0.05, 0.3));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // The dome.
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.5, size * 0.42, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Teeth along the jaw's edge.
    ctx.fillStyle = EDGE;
    for (let i = 0; i < 4; i++) {
      const f = 0.2 + i * 0.1;
      for (const side of [-1, 1]) {
        const [tx, ty] = at(f, side * (0.18 + j * 0.8));
        ctx.fillRect(tx - size * 0.012, ty - size * 0.04, size * 0.024, size * 0.08);
      }
    }
    // Sockets, and the nose.
    ctx.fillStyle = SOCKET;
    for (const side of [-1, 1]) {
      const [ex, ey] = at(0.08, side * 0.19);
      ctx.beginPath();
      ctx.ellipse(ex, ey, size * 0.13, size * 0.11, a, 0, Math.PI * 2);
      ctx.fill();
      if (eyes) {
        ctx.fillStyle = eyes;
        ctx.beginPath();
        ctx.arc(ex, ey, size * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = SOCKET;
      }
    }
    const [nx, ny] = at(0.3, 0);
    ctx.beginPath();
    ctx.moveTo(nx - s * size * 0.05, ny + c * size * 0.05);
    ctx.lineTo(nx + c * size * 0.08, ny + s * size * 0.08);
    ctx.lineTo(nx + s * size * 0.05, ny - c * size * 0.05);
    ctx.closePath();
    ctx.fill();
  });
}

/** A column of bones standing up out of the water from screen x, y, this tall: a bony tentacle or a neck. */
export function drawBoneColumn(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tall: number,
  Z: number,
  sway = 0,
): void {
  const pts: Pt[] = [];
  const widths: number[] = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    pts.push([x + Math.sin(f * Math.PI) * sway, y - tall * f]);
    widths.push(0);
  }
  drawSpine(ctx, pts, widths, Z * (1.4 - 0.4), 1);
}
