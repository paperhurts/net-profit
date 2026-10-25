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
/** The shapes the pad can draw: each fits the box dragged out from one corner to the other. */
export const SHAPES = ['line', 'circle', 'square', 'triangle', 'heart', 'star'] as const;
export type Shape = (typeof SHAPES)[number];
export const SHAPE_NAMES: Readonly<Record<Shape, string>> = {
  line: 'Line',
  circle: 'Circle',
  square: 'Square',
  triangle: 'Triangle',
  heart: 'Heart',
  star: 'Star',
};
/** What the finger does: draws, rubs out, or drags out a shape. */
export type Tool = 'pen' | 'eraser' | Shape;

/** How wide the eraser rubs, in grid cells either side of the finger. */
export const ERASER = 2.6;
/** How many changes Undo can step back through. */
export const UNDO_MAX = 40;

/**
 * A shape's outline as points in the box from a to b (grid cells), going round and back to its start: a line is just
 * its two ends, and a triangle points the way the drag began, so it can be flipped. Points next to each other that round to the same cell are kept once.
 */
export function shapePoints(shape: Shape, a: Pt, b: Pt): Pt[] {
  const x0 = Math.min(a[0], b[0]);
  const y0 = Math.min(a[1], b[1]);
  const w = Math.abs(b[0] - a[0]);
  const h = Math.abs(b[1] - a[1]);
  const at = (u: number, v: number): Pt => [x0 + u * w, y0 + v * h];
  let raw: Pt[];
  switch (shape) {
    case 'line':
      raw = [a, b];
      break;
    case 'square':
      raw = [at(0, 0), at(1, 0), at(1, 1), at(0, 1), at(0, 0)];
      break;
    case 'triangle': {
      // Its point is where the drag starts: dragged down it points up, dragged up it points down.
      const tip = b[1] >= a[1] ? 0 : 1;
      raw = [at(0.5, tip), at(1, 1 - tip), at(0, 1 - tip), at(0.5, tip)];
      break;
    }
    case 'circle':
      raw = Array.from({ length: 17 }, (_, i) => {
        const q = (i / 16) * Math.PI * 2;
        return at(0.5 + 0.5 * Math.cos(q), 0.5 + 0.5 * Math.sin(q));
      });
      break;
    case 'heart':
      // The classic heart curve, its dip at the top and its point at the bottom, fitted to the box.
      raw = Array.from({ length: 17 }, (_, i) => {
        const t = (i / 16) * Math.PI * 2;
        const hx = 16 * Math.sin(t) ** 3;
        const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        return at(0.5 + hx / 34, (12 - hy) / 29);
      });
      break;
    case 'star':
      raw = Array.from({ length: 11 }, (_, i) => {
        const q = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const r = i % 2 ? 0.2 : 0.5;
        return at(0.5 + r * Math.cos(q), 0.53 + r * Math.sin(q));
      });
      break;
  }
  const out: Pt[] = [];
  for (const [x, y] of raw) {
    const g: Pt = [
      Math.max(0, Math.min(GRID - 1, Math.round(x))),
      Math.max(0, Math.min(GRID - 1, Math.round(y))),
    ];
    const last = out[out.length - 1];
    if (!last || last[0] !== g[0] || last[1] !== g[1]) out.push(g);
  }
  return out;
}

/** A line's points every grid cell or so along it, so rubbing out its middle has points there to take away. */
function dense(p: readonly Pt[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i] as Pt;
    const b = p[i + 1];
    out.push([a[0], a[1]]);
    if (!b) break;
    const n = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (let k = 1; k < n; k++)
      out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

/** How far point p is from the segment a to b. */
function toSegment(p: readonly [number, number], a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * The strokes rubbed out along the eraser's way from a to b: whatever lies under it goes, and a stroke rubbed through
 * in the middle is left as two. What is left is thinned again, so rubbing out never costs more ink than it gives back
 * by much; a scrap of a single point is dropped.
 */
export function erase(strokes: readonly Stroke[], a: Pt, b: Pt, r = ERASER): Stroke[] {
  const out: Stroke[] = [];
  for (const s of strokes) {
    if (s.p.length === 1) {
      if (toSegment(s.p[0] as Pt, a, b) > r) out.push(s);
      continue;
    }
    const pts = dense(s.p);
    if (pts.every((q) => toSegment(q, a, b) > r)) {
      out.push(s);
      continue;
    }
    let run: Pt[] = [];
    const flush = () => {
      const kept = thin(run.map(([x, y]): Pt => [Math.round(x), Math.round(y)]));
      // Keep what is left only if it still goes somewhere: a scrap rubbed down to one cell goes too.
      const [first] = kept;
      if (first && kept.some((q) => q[0] !== first[0] || q[1] !== first[1]))
        out.push({ c: s.c, p: kept });
      run = [];
    };
    for (const q of pts) {
      if (toSegment(q, a, b) > r) run.push(q);
      else flush();
    }
    flush();
  }
  return out;
}

export class Pad {
  strokes: Stroke[] = [];
  /** The stroke the finger is drawing, unthinned, or the shape being dragged out. */
  cur: Stroke | null = null;
  colour = 0;
  tool: Tool = 'pen';
  /** The drawing as it was before each change, for Undo, newest last. */
  private history: Stroke[][] = [];
  /** Where the finger went down, for a shape; where it last was, for the eraser. */
  private anchor: Pt | null = null;

  /** The ink left, 0 to 1, counting the stroke being drawn as it will be once thinned (at least its two ends). */
  get inkLeft(): number {
    const now = this.cur
      ? Math.min(this.tool === 'pen' ? 2 : this.cur.p.length, this.cur.p.length)
      : 0;
    return Math.max(0, 1 - (inkUsed(this.strokes) + now) / INK);
  }

  get empty(): boolean {
    return !this.strokes.length && !this.cur;
  }

  /** Whether there is a change to step back from. */
  get canUndo(): boolean {
    return this.history.length > 0;
  }

  private remember(): void {
    this.history.push(this.strokes.map((s) => ({ c: s.c, p: s.p.slice() })));
    if (this.history.length > UNDO_MAX) this.history.shift();
  }

  /** Rubbed out from a to b; never left needing more ink than the pot holds, which the save could not keep. */
  private rub(a: Pt, b: Pt): void {
    const left = erase(this.strokes, a, b);
    if (inkUsed(left) <= INK) this.strokes = left;
  }

  /** A finger down. Says whether it does anything: drawing stops once the ink has run out; rubbing out never does. */
  begin(u: number, v: number): boolean {
    const g = toGrid(u, v);
    if (this.tool === 'eraser') {
      this.remember();
      this.anchor = g;
      this.rub(g, g);
      return true;
    }
    if (inkUsed(this.strokes) >= INK) return false;
    this.remember();
    if (this.tool === 'pen') this.cur = { c: this.colour, p: [g] };
    else {
      this.anchor = g;
      this.cur = { c: this.colour, p: shapePoints(this.tool, g, g) };
    }
    return true;
  }

  move(u: number, v: number): void {
    const g = toGrid(u, v);
    if (this.tool === 'eraser') {
      if (!this.anchor) return;
      this.rub(this.anchor, g);
      this.anchor = g;
      return;
    }
    const c = this.cur;
    if (!c) return;
    if (this.tool !== 'pen' && this.anchor) {
      c.p = shapePoints(this.tool, this.anchor, g);
      return;
    }
    const last = c.p[c.p.length - 1];
    if (!last || last[0] !== g[0] || last[1] !== g[1]) c.p.push(g);
  }

  end(): void {
    const was = this.history[this.history.length - 1];
    if (this.tool === 'eraser') {
      this.anchor = null;
      // Nothing rubbed out: nothing to undo.
      if (was && was.length === this.strokes.length && encode(was) === encode(this.strokes))
        this.history.pop();
      return;
    }
    const c = this.cur;
    this.anchor = null;
    if (!c) return;
    this.cur = null;
    const room = INK - inkUsed(this.strokes);
    // A shape too small to see, or one the ink will not stretch to, is not kept.
    if (this.tool !== 'pen' && (c.p.length < 2 || c.p.length > room)) {
      this.history.pop();
      return;
    }
    if (room <= 0) {
      this.history.pop();
      return;
    }
    let p = this.tool === 'pen' ? thin(c.p) : c.p;
    if (p.length > room) p = p.slice(0, room);
    this.strokes.push({ c: c.c, p });
  }

  /** Back one change: a line, a shape, some rubbing out, or Clear. */
  undo(): void {
    this.cur = null;
    this.anchor = null;
    const was = this.history.pop();
    if (was) this.strokes = was;
  }

  clear(): void {
    this.cur = null;
    this.anchor = null;
    if (this.strokes.length) this.remember();
    this.strokes = [];
  }

  /** A fresh pad, nothing to undo: once a drawing is kept, or the game starts over. */
  reset(): void {
    this.cur = null;
    this.anchor = null;
    this.strokes = [];
    this.history = [];
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
