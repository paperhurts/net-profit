import { describe, expect, it } from 'vitest';
import { drawMapTower, drawTarMap, TarProjection } from '../../src/render/tarmap';
import { METAL_BRIDGE, NORTH_EDGE } from '../../src/world/metalbridge';
import { tarSchools } from '../../src/world/tarfish';
import { TAR_ISLE } from '../../src/world/tarisle';
import { TAR_BERTH, TAR_SEA } from '../../src/world/tarsea';

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

describe('the tar map', () => {
  it('fits the whole tar ocean in the square, the bridge along its bottom', () => {
    const p = new TarProjection(200, 200, 384);
    for (const [x, y] of [
      [TAR_SEA.x0, TAR_SEA.y0],
      [TAR_SEA.x1, TAR_SEA.y0],
      [TAR_SEA.x0, TAR_SEA.y1],
      [TAR_SEA.x1, TAR_SEA.y1],
    ] as const) {
      expect(p.x(x, y)).toBeGreaterThanOrEqual(7);
      expect(p.x(x, y)).toBeLessThanOrEqual(393);
      expect(p.y(x, y)).toBeGreaterThanOrEqual(7);
      expect(p.y(x, y)).toBeLessThanOrEqual(393);
    }
    // The bridge's side is the bottom of the map, as it is down the screen sailing out from it.
    expect(p.y(METAL_BRIDGE.x, NORTH_EDGE)).toBeGreaterThan(p.y(TAR_ISLE.x, TAR_ISLE.y));
    expect(p.y(TAR_BERTH.x, TAR_BERTH.y)).toBeGreaterThan(p.y(TAR_ISLE.x, TAR_ISLE.y));
  });

  it('names the tar island and the tar dock, and draws the boat, the fish and the tower', () => {
    const { ctx, calls, texts } = countingCtx(400);
    drawTarMap(ctx, 400, 400, {
      boat: { x: TAR_BERTH.x, y: TAR_BERTH.y - 20, h: -Math.PI / 2 },
      schools: tarSchools(3),
      T: 1.2,
    });
    expect(texts).toContain('Tar island');
    expect(texts).toContain('Tar dock');
    expect(calls.fill ?? 0).toBeGreaterThan(8);
    expect(calls.ellipse ?? 0).toBe(tarSchools(3).length);
  });

  it('draws the little tower for the arrow that points to the island', () => {
    const { ctx, calls } = countingCtx(100);
    drawMapTower(ctx, 50, 50, 1.4);
    expect(calls.rect ?? 0).toBe(5);
    expect(calls.fillRect ?? 0).toBe(2);
  });
});
