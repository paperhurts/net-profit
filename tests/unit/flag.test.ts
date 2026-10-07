import { describe, expect, it } from 'vitest';
import {
  EMBLEMS,
  FLAG_COLORS,
  type Flag,
  flagShapes,
  flagSvg,
  PATTERNS,
  parseFlag,
  START_FLAG,
} from '../../src/data/flag';

/** Every flag there is. */
function* every(): Generator<Flag> {
  for (let field = 0; field < FLAG_COLORS.length; field++)
    for (let accent = 0; accent < FLAG_COLORS.length; accent += 3)
      for (let pattern = 0; pattern < PATTERNS.length; pattern++)
        for (let emblem = 0; emblem < EMBLEMS.length; emblem++)
          yield { field, accent, pattern, emblem };
}

describe('flags', () => {
  it('are read back only when they make sense', () => {
    expect(parseFlag(START_FLAG)).toEqual(START_FLAG);
    expect(parseFlag({ field: 9, accent: 0, pattern: 5, emblem: 6 })).toEqual({
      field: 9,
      accent: 0,
      pattern: 5,
      emblem: 6,
    });
    expect(parseFlag(null)).toBeNull();
    expect(parseFlag('red')).toBeNull();
    expect(parseFlag({ field: 10, accent: 0, pattern: 0, emblem: 0 })).toBeNull();
    expect(parseFlag({ field: 0, accent: 0, pattern: 6, emblem: 0 })).toBeNull();
    expect(parseFlag({ field: 0, accent: 0, pattern: 0, emblem: 1.5 })).toBeNull();
    expect(parseFlag({ field: 0, accent: 0, pattern: 0 })).toBeNull();
  });

  it('draw inside their own edges, field first, whatever the design', () => {
    const w = 60;
    const h = 40;
    for (const f of every()) {
      const sh = flagShapes(f, w, h);
      expect(sh[0]).toEqual({ t: 'rect', x: 0, y: 0, w, h, c: FLAG_COLORS[f.field] });
      for (const s of sh) {
        if (s.t === 'rect') {
          expect(s.x).toBeGreaterThanOrEqual(-1e-9);
          expect(s.y).toBeGreaterThanOrEqual(-1e-9);
          expect(s.x + s.w).toBeLessThanOrEqual(w + 1e-9);
          expect(s.y + s.h).toBeLessThanOrEqual(h + 1e-9);
        } else if (s.t === 'circle') {
          expect(s.x - s.r).toBeGreaterThanOrEqual(0);
          expect(s.y - s.r).toBeGreaterThanOrEqual(0);
          expect(s.x + s.r).toBeLessThanOrEqual(w);
          expect(s.y + s.r).toBeLessThanOrEqual(h);
        } else {
          for (let i = 0; i < s.p.length; i += 2) {
            expect(s.p[i]).toBeGreaterThanOrEqual(-1e-9);
            expect(s.p[i]).toBeLessThanOrEqual(w + 1e-9);
            expect(s.p[i + 1]).toBeGreaterThanOrEqual(-1e-9);
            expect(s.p[i + 1]).toBeLessThanOrEqual(h + 1e-9);
          }
        }
      }
    }
  });

  it('only add an emblem when there is one, and a pattern when there is one', () => {
    expect(flagShapes({ field: 0, accent: 1, pattern: 0, emblem: 0 }, 60, 40)).toHaveLength(1);
    expect(flagShapes({ field: 0, accent: 1, pattern: 1, emblem: 0 }, 60, 40)).toHaveLength(2);
    expect(
      flagShapes({ field: 0, accent: 1, pattern: 0, emblem: 3 }, 60, 40).length,
    ).toBeGreaterThan(3);
  });

  it('make a clean SVG for the designer', () => {
    for (const f of every()) {
      const svg = flagSvg(f, 42, 28);
      expect(svg.startsWith('<svg viewBox="0 0 42 28"')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).not.toContain('NaN');
      expect(svg).not.toContain('undefined');
    }
  });
});
