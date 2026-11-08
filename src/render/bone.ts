/**
 * The bone look (Tomb Island, part eight): any beast drawn through boneView comes out as its own skeleton, in the
 * colours of old bone. Each colour it sets is turned by how light it is into bone, from dark sockets to white; warm,
 * strong colours (the red of a warning, fire, gold) are kept as they are, so every fight reads as it does at home; and
 * cold glows (the cyan and green of eyes and lights) turn the pale green of a ghost. The drawing code itself is the
 * beast's own, untouched: only the colours go through here.
 */
import type { DrawView } from '../entities/entity';

/** Bone, from its darkest (the hollows) to its lightest. */
const BONE_DARK = [42, 37, 32] as const;
const BONE_MID = [176, 166, 146] as const;
const BONE_LIGHT = [246, 240, 224] as const;
/** The glow a cold light turns into. */
const GHOST = [156, 255, 176] as const;

function parse(c: string): [number, number, number, number] | null {
  const s = c.trim();
  if (s[0] === '#') {
    const h = s.slice(1);
    if (h.length === 3 || h.length === 4) {
      const n = [...h].map((d) => Number.parseInt(d + d, 16));
      return [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0, h.length === 4 ? (n[3] ?? 255) / 255 : 1];
    }
    if (h.length === 6 || h.length === 8) {
      const n = [0, 2, 4, 6].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
      return [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0, h.length === 8 ? (n[3] ?? 255) / 255 : 1];
    }
    return null;
  }
  const m = /^rgba?\(([^)]*)\)$/i.exec(s);
  if (!m) return null;
  const p = (m[1] ?? '')
    .split(/[ ,/]+/)
    .filter(Boolean)
    .map(Number);
  if (p.length < 3 || p.some((x) => Number.isNaN(x))) return null;
  return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 1];
}

const mix = (a: readonly number[], b: readonly number[], t: number) =>
  a.map((x, i) => Math.round(x + ((b[i] ?? 0) - x) * t));

const cache = new Map<string, string>();
/** A colour as the bone look draws it: bone by its lightness, warm warnings kept, cold glows ghost green. */
export function boneColour(c: string): string {
  const hit = cache.get(c);
  if (hit !== undefined) return hit;
  const p = parse(c);
  let out = c;
  if (p) {
    const [r, g, b, a] = p;
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const sat = max === 0 ? 0 : (max - min) / max;
    // The hue, 0..360: warm is red through yellow, cold is green through blue.
    let hue = 0;
    if (max !== min) {
      const d = max - min;
      const R = r / 255;
      const G = g / 255;
      const B = b / 255;
      hue = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
      hue = (hue * 60 + 360) % 360;
    }
    const light = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const warm = hue < 62 || hue > 330;
    if (warm && sat > 0.55 && max > 0.55) out = c;
    else {
      const rgb =
        !warm && sat > 0.4 && max > 0.6
          ? mix(BONE_MID, GHOST, Math.min(1, light * 1.3))
          : light < 0.5
            ? mix(BONE_DARK, BONE_MID, Math.min(1, light * 2.2))
            : mix(BONE_MID, BONE_LIGHT, Math.min(1, (light - 0.5) * 2));
      // Hex when solid: the view's own shading helpers read colours as hex.
      out =
        a >= 1
          ? `#${rgb.map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('')}`
          : `rgba(${rgb.join(',')},${a})`;
    }
  }
  if (cache.size < 4000) cache.set(c, out);
  return out;
}

/** Whether a colour is drawn as it is, solid: a warning, fire or gold, or white (foam, teeth, a flash). */
export function keptColour(c: string): boolean {
  if (boneColour(c) === c) return true;
  const p = parse(c);
  return !!p && Math.min(p[0], p[1], p[2]) > 225;
}

/** How solid a beast's own flesh is drawn: faint, so the skeleton drawn over it (render/skeleton.ts) is what shows. */
export const FLESH = 0.32;
let solidN = 0;
/** Draw something at full strength through the bone look: the skeleton itself. */
export function solid(f: () => void): void {
  solidN++;
  try {
    f();
  } finally {
    solidN--;
  }
}

const STYLES = new Set(['fillStyle', 'strokeStyle', 'shadowColor']);
const FILLS = new Set(['fill', 'fillRect', 'fillText']);
const STROKES = new Set(['stroke', 'strokeRect', 'strokeText']);
const views = new WeakMap<CanvasRenderingContext2D, CanvasRenderingContext2D>();

/** The context drawn through: every colour set on it goes into bone first, gradients' stops too. */
function boneCtx(ctx: CanvasRenderingContext2D): CanvasRenderingContext2D {
  const had = views.get(ctx);
  if (had) return had;
  const bound = new Map<PropertyKey, unknown>();
  // Whether what is about to be filled, or stroked, is drawn solid; anything else is the flesh, drawn faint.
  let fillKept = true;
  let strokeKept = true;
  const faint =
    (f: (...a: unknown[]) => unknown, kept: () => boolean) =>
    (...a: unknown[]) => {
      if (solidN > 0 || kept()) return f.apply(ctx, a);
      const was = ctx.globalAlpha;
      ctx.globalAlpha = was * FLESH;
      try {
        return f.apply(ctx, a);
      } finally {
        ctx.globalAlpha = was;
      }
    };
  const gradient = (g: CanvasGradient): CanvasGradient => {
    const add = g.addColorStop.bind(g);
    g.addColorStop = (o: number, c: string) => add(o, boneColour(c));
    return g;
  };
  const p = new Proxy(ctx, {
    get(t, k) {
      if (
        k === 'createLinearGradient' ||
        k === 'createRadialGradient' ||
        k === 'createConicGradient'
      ) {
        const f = (t as unknown as Record<string, (...a: number[]) => CanvasGradient>)[k as string];
        return (...a: number[]) => gradient((f as (...a: number[]) => CanvasGradient).apply(t, a));
      }
      const v = Reflect.get(t, k, t);
      if (typeof v !== 'function') return v;
      let f = bound.get(k);
      if (!f) {
        const raw = v as (...a: unknown[]) => unknown;
        f = FILLS.has(k as string)
          ? faint(raw, () => fillKept)
          : STROKES.has(k as string)
            ? faint(raw, () => strokeKept)
            : raw.bind(t);
        bound.set(k, f);
      }
      return f;
    },
    set(t, k, val) {
      if (k === 'fillStyle') fillKept = typeof val !== 'string' || keptColour(val);
      if (k === 'strokeStyle') strokeKept = typeof val !== 'string' || keptColour(val);
      const v = STYLES.has(k as string) && typeof val === 'string' ? boneColour(val) : val;
      return Reflect.set(t, k, v, t);
    },
  });
  views.set(ctx, p);
  return p;
}

const viewOf = new WeakMap<object, DrawView>();
/** The same view, drawing through the bone look. */
export function boneView(v: DrawView): DrawView {
  const had = viewOf.get(v);
  if (had && had.ctx === boneCtx(v.ctx)) return had;
  const out = Object.create(v) as DrawView;
  Object.defineProperty(out, 'ctx', { value: boneCtx(v.ctx) });
  // The view's own drawing helpers paint on the canvas themselves: their colours go into bone too.
  const w = v as unknown as Record<string, (...a: unknown[]) => unknown>;
  const recolour = (k: string, from: number) => {
    if (typeof w[k] !== 'function') return;
    Object.defineProperty(out, k, {
      value: (...a: unknown[]) =>
        w[k]?.(...a.map((x, i) => (i >= from && typeof x === 'string' ? boneColour(x) : x))),
    });
  };
  recolour('box', 6);
  recolour('extrude', 3);
  recolour('glow', 4);
  viewOf.set(v, out);
  return out;
}
