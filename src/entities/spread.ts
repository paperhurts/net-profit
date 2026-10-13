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

/**
 * The army, once the kid has them all: with eight or nine along, keeping a little apart still left a pile on the
 * figure, since they are bigger than the gap (the baby Reaper is 54 long) and only those near it were nudged. So
 * outside a fight each has a place of its own round the figure, in rings behind it on the screen and out to either
 * side, never in front of it: the first ring this far out, each further ring this much further, places this far
 * apart round a ring, out to this far either side of straight behind. The game gives the small ones the near places
 * and the big ones the far ones, lets each stop following only once it is out at its own ring (`heelAt`), and draws
 * each in to its place here, so the army stands round the figure in rows when it stops and strings out behind it on
 * the move. In a fight they go for whatever it fights, as before. A place the figure could not walk to is passed over.
 */
export const RING0 = 34;
export const RING_STEP = 38;
export const SLOT_GAP = 42;
export const ARC = (110 * Math.PI) / 180;
/** How fast one walks in to its place, and from how far beyond its ring it is still drawn in. */
export const FORM_SPEED = 60;
export const FORM_NEAR = 40;

export type Slot = { dx: number; dy: number; r: number };

/** Straight behind the figure on the screen: up it, toward the smaller x + y. */
const BEHIND = (-3 * Math.PI) / 4;

/**
 * The places for n, nearest first: ring by ring, and round each ring from straight behind out to either side.
 * ok says whether the figure could walk to a place (as an offset from it); one it could not is passed over.
 */
export function formation(n: number, ok?: (dx: number, dy: number) => boolean): Slot[] {
  const out: Slot[] = [];
  for (let ring = 0; out.length < n && ring < 6; ring++) {
    const r = RING0 + ring * RING_STEP;
    const per = Math.max(1, Math.floor((2 * ARC * r) / SLOT_GAP) + 1);
    const step = per > 1 ? (2 * ARC) / (per - 1) : 0;
    const mid = (per - 1) / 2;
    const order = Array.from({ length: per }, (_, i) => i).sort(
      (a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b,
    );
    for (const i of order) {
      if (out.length >= n) break;
      const a = BEHIND - ARC + i * step;
      const dx = Math.cos(a) * r;
      const dy = Math.sin(a) * r;
      if (ok && !ok(dx, dy)) continue;
      out.push({ dx, dy, r });
    }
  }
  return out;
}

/**
 * One frame of forming up: each body with a place, and near enough the figure, walks in to it at FORM_SPEED. move
 * does the walking, as the game's own would, so none is walked through a wall or into the sea.
 */
export function formUp(
  bodies: readonly Body[],
  slots: readonly (Slot | null)[],
  figure: Body,
  dt: number,
  move: (b: Body, dx: number, dy: number) => void,
): void {
  const most = FORM_SPEED * dt;
  bodies.forEach((b, i) => {
    const s = slots[i];
    if (!s) return;
    if (Math.hypot(b.x - figure.x, b.y - figure.y) > s.r + FORM_NEAR) return;
    const dx = figure.x + s.dx - b.x;
    const dy = figure.y + s.dy - b.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    const k = Math.min(d, most) / d;
    move(b, dx * k, dy * k);
  });
}

/**
 * Who takes which place: the places go ring by ring in the order given (small ones near), and within a ring each
 * takes the place on its own side, matched by angle round the figure, so none of them walks across another, or
 * across the front of the figure, to get to its place. Returns the place for each body, in the bodies' order.
 */
export function assignSlots(
  bodies: readonly Body[],
  slots: readonly Slot[],
  figure: Body,
): (Slot | null)[] {
  const out: (Slot | null)[] = bodies.map(() => null);
  const turn = (x: number, y: number) => {
    const a = Math.atan2(y, x) - BEHIND;
    return Math.atan2(Math.sin(a), Math.cos(a));
  };
  let i = 0;
  while (i < Math.min(bodies.length, slots.length)) {
    const r = (slots[i] as Slot).r;
    let j = i;
    while (j < Math.min(bodies.length, slots.length) && (slots[j] as Slot).r === r) j++;
    const ring = slots.slice(i, j).sort((a, b) => turn(a.dx, a.dy) - turn(b.dx, b.dy));
    const who = Array.from({ length: j - i }, (_, k) => i + k).sort((a, b) => {
      const p = bodies[a] as Body;
      const q = bodies[b] as Body;
      return turn(p.x - figure.x, p.y - figure.y) - turn(q.x - figure.x, q.y - figure.y);
    });
    who.forEach((bi, k) => {
      out[bi] = ring[k] ?? null;
    });
    i = j;
  }
  return out;
}
