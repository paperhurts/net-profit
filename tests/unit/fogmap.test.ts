import { describe, expect, it } from 'vitest';
import { drawFogMap, FogProjection } from '../../src/render/fogmap';
import { FOG_EXIT, FOG_IN, FOG_SEA } from '../../src/world/fogsea';
import { DOCK16, TOMB_ISLE } from '../../src/world/tombisle';

/** A context that counts its calls and keeps what it was asked to write, its letters each 6 wide. */
function countingCtx(w: number) {
  const calls: Record<string, number> = {};
  const texts: string[] = [];
  const props: Record<string, unknown> = { canvas: { width: w, height: w } };
  const ctx = new Proxy(props, {
    get(t, k: string) {
      if (k in t) return t[k];
      if (k === 'measureText') return (s: string) => ({ width: s.length * 6 });
      return (...a: unknown[]) => {
        calls[k] = (calls[k] ?? 0) + 1;
        if (k === 'arc' && (a[2] as number) < 0) throw new Error('arc with a negative radius');
        if (k === 'fillText') texts.push(a[0] as string);
      };
    },
    set(t, k: string, v) {
      t[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls, texts };
}

describe('the fog sea map', () => {
  it('fits the whole fog sea in the square, the island in its middle and the way out in it', () => {
    const p = new FogProjection(200, 200, 384);
    for (const [x, y] of [
      [FOG_SEA.x0, FOG_SEA.y0],
      [FOG_SEA.x1, FOG_SEA.y0],
      [FOG_SEA.x0, FOG_SEA.y1],
      [FOG_SEA.x1, FOG_SEA.y1],
      [FOG_EXIT.x, FOG_EXIT.y],
      [FOG_IN.x, FOG_IN.y],
      [DOCK16.x, DOCK16.y],
    ] as const) {
      expect(p.x(x, y)).toBeGreaterThanOrEqual(7);
      expect(p.x(x, y)).toBeLessThanOrEqual(393);
      expect(p.y(x, y)).toBeGreaterThanOrEqual(7);
      expect(p.y(x, y)).toBeLessThanOrEqual(393);
    }
    expect(p.x(TOMB_ISLE.x, TOMB_ISLE.y)).toBeCloseTo(200, 0);
    expect(p.y(TOMB_ISLE.x, TOMB_ISLE.y)).toBeCloseTo(200, 0);
  });

  it('keeps Tomb Island in the fog until it is sighted, and always shows the way out and the boat', () => {
    const boat = { x: FOG_IN.x, y: FOG_IN.y, h: Math.PI };
    const before = countingCtx(400);
    drawFogMap(before.ctx, 400, 400, { boat, seen: false, T: 0.7 });
    expect(before.texts).toEqual(['Way out']);
    const after = countingCtx(400);
    drawFogMap(after.ctx, 400, 400, { boat, seen: true, T: 0.7 });
    expect(after.texts).toContain('Tomb Island');
    expect(after.texts).toContain('Way out');
    // The island's sand, its maze and its castle are drawn only once it is sighted.
    expect(after.calls.fill ?? 0).toBeGreaterThan(before.calls.fill ?? 0);
    expect(after.calls.fillRect ?? 0).toBe(2);
    expect(before.calls.fillRect ?? 0).toBe(0);
  });
});
