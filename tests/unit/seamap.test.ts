import { describe, expect, it } from 'vitest';
import { SPECIES } from '../../src/data/tuning';
import {
  drawMapCastle,
  drawMapFish,
  drawMapMark,
  mapFish,
  Projection,
} from '../../src/render/seamap';
import { SEA_MIN, SEA_SPAN } from '../../src/state/sailed';
import { DEEP, WS } from '../../src/world/island';
import { createSchools } from '../../src/world/schools';
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

describe("the fish schools on the sea map, from your headquarters' tower", () => {
  it('shows each school with fish in it, in its fish colour, and the night ones only once they are up', () => {
    const schools = createSchools();
    const night = schools.filter((sc) => sc.night).length;
    expect(night).toBeGreaterThan(0);
    const day = mapFish(schools, 0);
    expect(day.length).toBe(schools.length - night);
    expect(mapFish(schools, 1).length).toBe(schools.length);
    const first = schools.find((sc) => !sc.night);
    if (!first) throw new Error('no day school');
    expect(day[0]).toEqual({ x: first.cx, y: first.cy, c: SPECIES[first.sp]?.c, full: 1 });
    // A school fished out is not on it until its fish come back.
    first.alive = 0;
    expect(mapFish(schools, 0).length).toBe(schools.length - night - 1);
  });

  it('draws a school as one to three little fish, more for a fuller school', () => {
    for (const [full, n] of [
      [0, 1],
      [0.5, 2],
      [1, 3],
    ] as const) {
      const { ctx, calls } = countingCtx();
      drawMapFish(ctx, 100, 100, 1, '#6FC3D6', full);
      expect(calls.ellipse).toBe(n);
      expect(calls.fill).toBe(n);
    }
  });
});

describe('your castle on the sea map, once the dock is built', () => {
  it('is a little castle with a gate, and its name over it', () => {
    const { ctx, calls, texts } = countingCtx();
    drawMapCastle(ctx, 100, 100, 1, 'Your castle');
    expect(calls.fill).toBe(2);
    expect(calls.lineTo).toBeGreaterThan(8);
    expect(texts).toEqual(['Your castle']);
  });
});
