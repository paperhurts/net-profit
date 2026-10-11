import { describe, expect, it } from 'vitest';
import { drawMapMark, Projection } from '../../src/render/seamap';
import { SEA_MIN, SEA_SPAN } from '../../src/state/sailed';
import { DEEP, WS } from '../../src/world/island';
import { TRENCH } from '../../src/world/trench';

/** A context that counts its calls and keeps what it was asked to write. */
function countingCtx() {
  const calls: Record<string, number> = {};
  const texts: string[] = [];
  const props: Record<string, unknown> = {};
  const ctx = new Proxy(props, {
    get(t, k: string) {
      if (k in t) return t[k];
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

describe('a mark on the sea map', () => {
  it('is a dark ring with bubbles coming up out of it, and its name under it', () => {
    const { ctx, calls, texts } = countingCtx();
    drawMapMark(ctx, 100, 100, 1, 'Trench: dive here');
    expect(calls.arc).toBe(4);
    expect(calls.stroke).toBe(1);
    expect(calls.strokeText).toBe(1);
    expect(texts).toEqual(['Trench: dive here']);
  });

  it('puts the trench in the deep, inside the map', () => {
    const size = 372;
    const p = new Projection(size / 2, size / 2, size);
    const x = p.x(TRENCH.x, TRENCH.y);
    const y = p.y(TRENCH.x, TRENCH.y);
    for (const v of [x, y]) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(size);
    }
    // Past the home buoys, short of the deep's.
    expect(TRENCH.y).toBeLessThan(0);
    expect(TRENCH.y).toBeGreaterThan(-DEEP);
    expect(TRENCH.x).toBeLessThan(WS);
    expect(SEA_MIN + SEA_SPAN).toBeGreaterThan(WS + DEEP);
  });
});
