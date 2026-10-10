/**
 * Companions keep a little apart. Each follows the figure along the way it
 * walked and stops a few steps behind, and with several of them along they all
 * stopped in the same few steps: one stack, the warlock in the cat in the
 * warrior. Once they have moved, this nudges any two that are too close apart,
 * and any that are on top of the figure off it, a little each frame, so they
 * settle round the figure in a loose bunch instead, none of them standing in
 * front of it where it would hide it. The figure itself never moves for them.
 * The game moves each one through its own walking, so nobody is nudged off the
 * sand or through a wall; and one that still cannot make its way back along the
 * figure's steps pops over beside it (STUCK_T, in the companions themselves).
 */

/** How far apart two companions keep, and how far off the figure. */
export const SPREAD_GAP = 20;
export const SPREAD_FIGURE = 15;
/** The most a companion is nudged in a second, so they drift apart rather than jump. */
export const SPREAD_SPEED = 70;
/**
 * Only those already this near the figure are nudged: one still walking up along the figure's steps is left
 * to follow them, since a nudge off that path can leave it with water or a wall between it and the next step.
 */
export const SPREAD_NEAR = 60;
/**
 * And none stands in front of the figure, between it and the viewer, where it would hide it: one within this
 * much of its depth in front, and closer than this across the screen, is nudged aside.
 */
export const FRONT_DEPTH = 80;
export const FRONT_WIDE = 24;

type Body = { x: number; y: number };

/**
 * One frame of nudging: each pair of bodies closer than the gap moves apart, half each, and each body too
 * near the figure moves off it; only bodies near the figure, when there is one. move does the moving, as
 * the game's walking would; two at the very same spot part along a direction that depends on their places
 * in the list, so it is the same every time.
 */
export function spreadOut(
  bodies: readonly Body[],
  figure: Body | null,
  dt: number,
  move: (b: Body, dx: number, dy: number) => void,
): void {
  const most = SPREAD_SPEED * dt;
  const near = (b: Body) => !figure || Math.hypot(b.x - figure.x, b.y - figure.y) <= SPREAD_NEAR;
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i] as Body;
    if (!near(a)) continue;
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j] as Body;
      if (!near(b)) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d = Math.hypot(dx, dy);
      if (d >= SPREAD_GAP) continue;
      if (d < 0.01) {
        const t = (i * 7 + j * 3) * 0.9;
        dx = Math.cos(t);
        dy = Math.sin(t);
        d = 1;
      }
      const push = Math.min((SPREAD_GAP - d) / 2, most);
      move(a, (-dx / d) * push, (-dy / d) * push);
      move(b, (dx / d) * push, (dy / d) * push);
    }
    if (!figure) continue;
    const fx = a.x - figure.x;
    const fy = a.y - figure.y;
    const fd = Math.hypot(fx, fy);
    if (fd < SPREAD_FIGURE && fd >= 0.01) {
      const push = Math.min(SPREAD_FIGURE - fd, most);
      move(a, (fx / fd) * push, (fy / fd) * push);
    }
    // In front of it and across it on the screen: aside, the way it is already leaning.
    const depth = fx + fy;
    const across = fx - fy;
    if (depth > 0 && depth < FRONT_DEPTH && Math.abs(across) < FRONT_WIDE) {
      const side = across >= 0 ? 1 : -1;
      const push = Math.min((FRONT_WIDE - Math.abs(across)) / 2, most) * Math.SQRT1_2;
      move(a, side * push, -side * push);
    }
  }
}
