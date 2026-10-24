/**
 * A pet drawn on the phone, the owner's (2026-10-24): "let kids draw their own pet". A finger draws on a square pad in a
 * few colours, with undo; the drawing becomes the pet. It is kept as strokes, not a picture, so it stays small: the
 * save travels in the copy-my-game link (state/share.ts) and online.
 *
 * Each stroke is thinned as it is drawn (Ramer-Douglas-Peucker: points that do not change the line's shape are
 * dropped) and snapped to a 64 by 64 grid, so one coordinate is one character and a point is two. A stroke is a
 * colour letter and its points; strokes are joined by dots. The ink pot is the cap on size: 200 points, about 420
 * characters at most for a whole drawing. When it runs out the pen stops; Undo gives ink back.
 *
 * And ready to walk (render/petsys.ts draws it): its box, and which strokes are legs, any separate stroke low down in
 * the drawing, each swinging in turn with its neighbours.
 */

/** The pad's grid, each way. */
export const GRID = 64;
/** Points of ink in the pot. */
export const INK = 200;
/** How far a point may sit off the line between its neighbours, in grid cells, before it is kept. */
export const THIN = 0.9;
/** The pen's width, in grid cells: chunky, so small fingers draw bold lines. */
export const PEN = 2.2;
/** The pad's colours: ink, red, yellow, green, blue and pink, the game's palette. */
export const COLOURS = ['#12303A', '#E4572E', '#FFC53D', '#4C9A45', '#2B8A99', '#F28DB2'] as const;
export const COLOUR_NAMES = ['Ink', 'Red', 'Yellow', 'Green', 'Blue', 'Pink'] as const;

const ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export type Pt = readonly [number, number];
export type Stroke = { c: number; p: Pt[] };

/** A point on the pad (0 to 1 each way) as a grid point. */
export function toGrid(u: number, v: number): Pt {
  const g = (t: number) => Math.max(0, Math.min(GRID - 1, Math.round(t * (GRID - 1))));
  return [g(u), g(v)];
}

function offLine(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

/** A line thinned: only the points that hold its shape. */
export function thin(pts: readonly Pt[], eps = THIN): Pt[] {
  if (pts.length < 3) return pts.slice();
  const a = pts[0] as Pt;
  const b = pts[pts.length - 1] as Pt;
  let far = 0;
  let at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = offLine(pts[i] as Pt, a, b);
    if (d > far) {
      far = d;
      at = i;
    }
  }
  if (far <= eps) return [a, b];
  return thin(pts.slice(0, at + 1), eps)
    .slice(0, -1)
    .concat(thin(pts.slice(at), eps));
}

export function inkUsed(strokes: readonly Stroke[]): number {
  return strokes.reduce((n, s) => n + s.p.length, 0);
}

/** A drawing as text, for the save. */
export function encode(strokes: readonly Stroke[]): string {
  return strokes
    .map(
      (s) => (ALPH[s.c] ?? 'A') + s.p.map(([x, y]) => (ALPH[x] ?? 'A') + (ALPH[y] ?? 'A')).join(''),
    )
    .join('.');
}

/** Text back to a drawing: anything that is not a stroke is dropped, and nothing past the ink pot is kept. */
export function decode(s: unknown): Stroke[] {
  // The longest a drawing can be is two hundred strokes of one point each, a colour, a point and a dot apiece.
  if (typeof s !== 'string' || s.length > INK * 4) return [];
  const out: Stroke[] = [];
  let left = INK;
  for (const part of s.split('.')) {
    const c = ALPH.indexOf(part[0] ?? '');
    if (c < 0 || c >= COLOURS.length) continue;
    const p: Pt[] = [];
    for (let i = 1; i + 1 < part.length && p.length < left; i += 2) {
      const x = ALPH.indexOf(part[i] ?? '');
      const y = ALPH.indexOf(part[i + 1] ?? '');
      if (x < 0 || y < 0) break;
      p.push([x, y]);
    }
    if (!p.length) continue;
    out.push({ c, p });
    left -= p.length;
    if (left <= 0) break;
  }
  return out;
}

/**
 * The pad, as a finger uses it: a stroke begun, drawn on, and ended (thinned, and cut to the ink left), undone or all
 * cleared. Pure: the game feeds it points on the pad, 0 to 1 each way, and draws what it holds.
 */
export class Pad {
  strokes: Stroke[] = [];
  /** The stroke the finger is drawing, unthinned. */
  cur: Stroke | null = null;
  colour = 0;

  /** The ink left, 0 to 1, counting the stroke being drawn as it will be once thinned (at least its two ends). */
  get inkLeft(): number {
    const now = this.cur ? Math.min(2, this.cur.p.length) : 0;
    return Math.max(0, 1 - (inkUsed(this.strokes) + now) / INK);
  }

  get empty(): boolean {
    return !this.strokes.length && !this.cur;
  }

  /** A finger down. Says whether it draws: not once the ink has run out. */
  begin(u: number, v: number): boolean {
    if (inkUsed(this.strokes) >= INK) return false;
    this.cur = { c: this.colour, p: [toGrid(u, v)] };
    return true;
  }

  move(u: number, v: number): void {
    const c = this.cur;
    if (!c) return;
    const g = toGrid(u, v);
    const last = c.p[c.p.length - 1];
    if (!last || last[0] !== g[0] || last[1] !== g[1]) c.p.push(g);
  }

  end(): void {
    const c = this.cur;
    if (!c) return;
    this.cur = null;
    const room = INK - inkUsed(this.strokes);
    if (room <= 0) return;
    let p = thin(c.p);
    if (p.length > room) p = p.slice(0, room);
    this.strokes.push({ c: c.c, p });
  }

  undo(): void {
    this.cur = null;
    this.strokes.pop();
  }

  clear(): void {
    this.cur = null;
    this.strokes = [];
  }
}

/** A drawing made ready to walk: its box, and which strokes are legs (each swinging from its top, one way or the other). */
export type Rig = {
  strokes: readonly Stroke[];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  legs: ReadonlyMap<number, { sign: 1 | -1; top: Pt }>;
};

export function rig(strokes: readonly Stroke[]): Rig {
  let x0 = GRID;
  let y0 = GRID;
  let x1 = 0;
  let y1 = 0;
  for (const s of strokes)
    for (const [x, y] of s.p) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  const h = Math.max(1, y1 - y0);
  const low = y1 - h / 3;
  const found: { i: number; cx: number; top: Pt }[] = [];
  if (strokes.length > 1)
    strokes.forEach((s, i) => {
      let top = s.p[0] as Pt;
      let bot = 0;
      let cx = 0;
      for (const q of s.p) {
        if (q[1] < top[1]) top = q;
        bot = Math.max(bot, q[1]);
        cx += q[0];
      }
      cx /= s.p.length;
      if ((top[1] + bot) / 2 > low && bot - top[1] < h * 0.6) found.push({ i, cx, top });
    });
  found.sort((a, b) => a.cx - b.cx);
  const legs = new Map<number, { sign: 1 | -1; top: Pt }>();
  found.forEach((l, j) => {
    legs.set(l.i, { sign: j % 2 ? -1 : 1, top: l.top });
  });
  return { strokes, x0, y0, x1, y1, legs };
}
