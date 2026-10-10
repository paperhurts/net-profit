/**
 * The spider crab, the owner's "crazy crabs with long spider legs and colorful
 * bodies": a round coral shell with purple spots, two eyes on stalks, two small
 * claws, and eight long gold legs, jointed high like a spider's. Drawn from
 * above where it is caught and hauled, side on walking the aquarium's sand, and
 * as a little picture for the catch log and the field guide. A stand-in until
 * the kid draws one.
 */

/** Its shell, its spots, its legs and the dark at their joints and tips. */
export const CRAB_SHELL = '#E8604C';
export const CRAB_SPOT = '#7A4FC9';
export const CRAB_LEG = '#F2B233';
export const CRAB_JOINT = '#9C5A1E';

/**
 * One from above at screen x, y, its shell r across, facing up the screen turned by ang, its legs
 * stepping with step (radians; 0 stands still).
 */
export function drawSpiderCrab(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  ang = 0,
  step = 0,
  shell = CRAB_SHELL,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Eight legs, four a side, each out and up to a high knee, then down and out to its tip.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const k = i - 1.5;
      const w = Math.sin(step + i * 1.7 + (s > 0 ? Math.PI : 0)) * r * 0.25;
      const rx = s * r * 0.75;
      const ry = k * r * 0.4;
      const kx = s * r * (2 + Math.abs(k) * 0.15);
      const ky = ry + k * r * 0.55 - r * 0.5 + w;
      const tx = s * r * (3.2 - Math.abs(k) * 0.2);
      const ty = ry + k * r * 1.5 + r * 0.4 + w;
      ctx.strokeStyle = CRAB_LEG;
      ctx.lineWidth = Math.max(1, r * 0.22);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(kx, ky);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.fillStyle = CRAB_JOINT;
      ctx.beginPath();
      ctx.arc(kx, ky, Math.max(0.8, r * 0.14), 0, Math.PI * 2);
      ctx.fill();
    }
    // A claw at the front: a short arm and a little pincer.
    ctx.strokeStyle = shell;
    ctx.lineWidth = Math.max(1, r * 0.28);
    ctx.beginPath();
    ctx.moveTo(s * r * 0.4, -r * 0.6);
    ctx.lineTo(s * r * 0.75, -r * 1.35);
    ctx.stroke();
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.ellipse(s * r * 0.8, -r * 1.55, r * 0.22, r * 0.34, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // The shell, its spots and its eyes.
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CRAB_SPOT;
  for (const [sx, sy, sr] of [
    [-0.35, -0.15, 0.2],
    [0.38, 0.05, 0.17],
    [-0.05, 0.4, 0.15],
  ] as const) {
    ctx.beginPath();
    ctx.arc(sx * r, sy * r, sr * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#14222A';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * r * 0.28, -r * 0.92, Math.max(0.8, r * 0.13), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * One side on, as the aquarium sees it: the shell L long and H tall, held up off the sand on four
 * near legs whose tips reach down to the sand at y = foot, stepping with ph.
 */
export function drawSideCrab(
  ctx: CanvasRenderingContext2D,
  L: number,
  H: number,
  foot: number,
  ph: number,
): void {
  const lift = -H * 0.35;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The far legs, paler, then the near ones over the shell.
  for (const near of [false, true]) {
    ctx.strokeStyle = near ? CRAB_LEG : '#C99A4A';
    ctx.lineWidth = Math.max(1, L * 0.06);
    for (let i = 0; i < 4; i++) {
      const k = i - 1.5;
      const w = Math.sin(ph + i * 1.6 + (near ? 0 : Math.PI)) * L * 0.06;
      const rx = k * L * 0.18 + (near ? 0 : L * 0.05);
      const kx = k * L * 0.42;
      const ky = lift - H * 0.75 - Math.abs(w);
      const tx = k * L * 0.78 + w;
      ctx.beginPath();
      ctx.moveTo(rx, lift);
      ctx.lineTo(kx, ky);
      ctx.lineTo(tx, foot);
      ctx.stroke();
      if (near) {
        ctx.fillStyle = CRAB_JOINT;
        ctx.beginPath();
        ctx.arc(kx, ky, Math.max(0.8, L * 0.035), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!near) {
      // The shell between them, with its spots, a claw at the front and an eye on its stalk.
      ctx.fillStyle = CRAB_SHELL;
      ctx.beginPath();
      ctx.ellipse(0, lift, L * 0.36, H * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = CRAB_SPOT;
      for (const [sx, sy] of [
        [-0.15, -0.1],
        [0.12, 0.08],
      ] as const) {
        ctx.beginPath();
        ctx.arc(sx * L, lift + sy * H, L * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = CRAB_SHELL;
      ctx.lineWidth = Math.max(1, L * 0.07);
      ctx.beginPath();
      ctx.moveTo(L * 0.3, lift + H * 0.1);
      ctx.lineTo(L * 0.5, lift + H * 0.35);
      ctx.stroke();
      ctx.fillStyle = CRAB_SHELL;
      ctx.beginPath();
      ctx.ellipse(L * 0.54, lift + H * 0.42, L * 0.08, L * 0.05, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#14222A';
      ctx.lineWidth = Math.max(0.8, L * 0.025);
      ctx.beginPath();
      ctx.moveTo(L * 0.26, lift - H * 0.3);
      ctx.lineTo(L * 0.3, lift - H * 0.5);
      ctx.stroke();
      ctx.fillStyle = '#14222A';
      ctx.beginPath();
      ctx.arc(L * 0.3, lift - H * 0.52, Math.max(0.8, L * 0.035), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A little one for the catch log and the field guide, in c (or the page's own colour, unknown). */
export function crabSvg(c: string): string {
  const leg = c === 'currentColor' ? 'currentColor' : CRAB_LEG;
  const legs = [-1, 1]
    .map((s) =>
      [0, 1, 2]
        .map((i) => {
          const y = 5 + i * 2.2;
          return `<path d="M${11 + s * 3} ${y} L${11 + s * 7} ${y - 3} L${11 + s * 10} ${y + 3.5}" fill="none" stroke="${leg}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`;
        })
        .join(''),
    )
    .join('');
  return `<svg width="18" height="11" viewBox="0 0 22 14" aria-hidden="true">${legs}<ellipse cx="11" cy="7" rx="4.2" ry="3.5" fill="${c}" stroke="currentColor" stroke-opacity=".35" stroke-width="1"/></svg>`;
}
