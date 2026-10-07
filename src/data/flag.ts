/**
 * The flag you fly: designed in the shop from a colour, a pattern, a second
 * colour and an emblem, and flown from the boat's mast and the palace. Later
 * it goes up on every tower you take. A flag is four small numbers, so the
 * save stays tiny; this module turns them into shapes, which the canvas and
 * the designer's SVG previews both draw, so the two cannot disagree.
 */

export type Flag = { field: number; accent: number; pattern: number; emblem: number };

/** The colours a flag can be. */
export const FLAG_COLORS = [
  '#E4572E',
  '#FFC53D',
  '#FFF6E5',
  '#1F3B73',
  '#2B8A99',
  '#3E9E5C',
  '#7A4FB8',
  '#F07AA8',
  '#1E2227',
  '#F2913A',
] as const;
export const FLAG_COLOR_NAMES = [
  'red',
  'gold',
  'cream',
  'navy',
  'teal',
  'green',
  'purple',
  'pink',
  'black',
  'orange',
] as const;
export const PATTERNS = ['plain', 'stripe', 'cross', 'diagonal', 'halves', 'border'] as const;
export const EMBLEMS = ['none', 'star', 'fish', 'skull', 'anchor', 'heart', 'crown'] as const;

/** A first flag to start designing from: red with a gold star. */
export const START_FLAG: Flag = { field: 0, accent: 1, pattern: 0, emblem: 1 };

/** A flag from a save, or null if there is none or it does not make sense. */
export function parseFlag(o: unknown): Flag | null {
  if (!o || typeof o !== 'object') return null;
  const r = o as Record<string, unknown>;
  const ok = (v: unknown, n: number) =>
    Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;
  if (!ok(r.field, FLAG_COLORS.length) || !ok(r.accent, FLAG_COLORS.length)) return null;
  if (!ok(r.pattern, PATTERNS.length) || !ok(r.emblem, EMBLEMS.length)) return null;
  return {
    field: r.field as number,
    accent: r.accent as number,
    pattern: r.pattern as number,
    emblem: r.emblem as number,
  };
}

/** One thing to fill, in flag pixels with the hoist (the pole's edge) at x = 0. */
export type Shape =
  | { t: 'rect'; x: number; y: number; w: number; h: number; c: string }
  | { t: 'poly'; p: readonly number[]; c: string }
  | { t: 'circle'; x: number; y: number; r: number; c: string };

const col = (i: number): string => FLAG_COLORS[i] ?? FLAG_COLORS[0];
/** A light field wants a dark emblem, and the rest a cream one, when the emblem sits on a pattern. */
const LIGHT = new Set([1, 2, 9]);

/** The shapes of a flag w by h, back to front. */
export function flagShapes(f: Flag, w: number, h: number): Shape[] {
  const field = col(f.field);
  const accent = col(f.accent);
  const out: Shape[] = [{ t: 'rect', x: 0, y: 0, w, h, c: field }];
  const pattern = PATTERNS[f.pattern];
  if (pattern === 'stripe') out.push({ t: 'rect', x: 0, y: h / 3, w, h: h / 3, c: accent });
  else if (pattern === 'cross') {
    const b = h / 5;
    out.push({ t: 'rect', x: w * 0.36 - b / 2, y: 0, w: b, h, c: accent });
    out.push({ t: 'rect', x: 0, y: h / 2 - b / 2, w, h: b, c: accent });
  } else if (pattern === 'diagonal') out.push({ t: 'poly', p: [w, 0, w, h, 0, h], c: accent });
  else if (pattern === 'halves') out.push({ t: 'rect', x: w / 2, y: 0, w: w / 2, h, c: accent });
  else if (pattern === 'border') {
    const b = h / 8;
    out.push({ t: 'rect', x: 0, y: 0, w, h: b, c: accent });
    out.push({ t: 'rect', x: 0, y: h - b, w, h: b, c: accent });
    out.push({ t: 'rect', x: 0, y: 0, w: b, h, c: accent });
    out.push({ t: 'rect', x: w - b, y: 0, w: b, h, c: accent });
  }
  const plain = pattern === 'plain' || pattern === 'border';
  const ink = plain ? accent : LIGHT.has(f.field) ? '#1E2227' : '#FFF6E5';
  out.push(...emblemShapes(EMBLEMS[f.emblem] ?? 'none', w / 2, h / 2, h * 0.32, ink, field));
  return out;
}

/** An emblem of radius r at (x, y), in colour c, with holes in the field's colour. */
function emblemShapes(
  e: string,
  x: number,
  y: number,
  r: number,
  c: string,
  hole: string,
): Shape[] {
  if (e === 'star') {
    const p: number[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const q = i % 2 ? r * 0.42 : r;
      p.push(x + Math.cos(a) * q, y + Math.sin(a) * q);
    }
    return [{ t: 'poly', p, c }];
  }
  if (e === 'fish') {
    const p: number[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      p.push(x - r * 0.15 + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.42);
    }
    return [
      { t: 'poly', p, c },
      { t: 'poly', p: [x + r * 0.45, y, x + r, y - r * 0.45, x + r, y + r * 0.45], c },
      { t: 'circle', x: x - r * 0.55, y: y - r * 0.08, r: r * 0.1, c: hole },
    ];
  }
  if (e === 'skull') {
    return [
      { t: 'circle', x, y: y - r * 0.12, r: r * 0.7, c },
      { t: 'rect', x: x - r * 0.38, y: y + r * 0.3, w: r * 0.76, h: r * 0.45, c },
      { t: 'circle', x: x - r * 0.28, y: y - r * 0.1, r: r * 0.2, c: hole },
      { t: 'circle', x: x + r * 0.28, y: y - r * 0.1, r: r * 0.2, c: hole },
      { t: 'rect', x: x - r * 0.04, y: y + r * 0.35, w: r * 0.08, h: r * 0.4, c: hole },
    ];
  }
  if (e === 'anchor') {
    const arc: number[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI;
      arc.push(x + Math.cos(a) * r * 0.75, y + r * 0.2 + Math.sin(a) * r * 0.65);
    }
    for (let i = 12; i >= 0; i--) {
      const a = (i / 12) * Math.PI;
      arc.push(x + Math.cos(a) * r * 0.55, y + r * 0.2 + Math.sin(a) * r * 0.47);
    }
    return [
      { t: 'rect', x: x - r * 0.1, y: y - r * 0.75, w: r * 0.2, h: r * 1.55, c },
      { t: 'rect', x: x - r * 0.45, y: y - r * 0.45, w: r * 0.9, h: r * 0.18, c },
      { t: 'circle', x, y: y - r * 0.85, r: r * 0.18, c },
      { t: 'poly', p: arc, c },
    ];
  }
  if (e === 'heart') {
    const p: number[] = [];
    for (let i = 0; i < 24; i++) {
      const t = (i / 24) * Math.PI * 2;
      const hx = 16 * Math.sin(t) ** 3;
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      p.push(x + (hx / 17) * r, y - (hy / 17) * r);
    }
    return [{ t: 'poly', p, c }];
  }
  if (e === 'crown') {
    return [
      {
        t: 'poly',
        p: [
          x - r,
          y + r * 0.55,
          x - r,
          y - r * 0.5,
          x - r * 0.5,
          y,
          x,
          y - r * 0.7,
          x + r * 0.5,
          y,
          x + r,
          y - r * 0.5,
          x + r,
          y + r * 0.55,
        ],
        c,
      },
    ];
  }
  return [];
}

/** The flag as an SVG, hoist on the left, for the designer and the shop. */
export function flagSvg(f: Flag, w = 60, h = 40): string {
  const body = flagShapes(f, w, h)
    .map((s) => {
      if (s.t === 'rect')
        return `<rect x="${n(s.x)}" y="${n(s.y)}" width="${n(s.w)}" height="${n(s.h)}" fill="${s.c}"/>`;
      if (s.t === 'circle')
        return `<circle cx="${n(s.x)}" cy="${n(s.y)}" r="${n(s.r)}" fill="${s.c}"/>`;
      return `<polygon points="${s.p.map(n).join(' ')}" fill="${s.c}"/>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${body}</svg>`;
}

const n = (v: number): string => String(Math.round(v * 100) / 100);
