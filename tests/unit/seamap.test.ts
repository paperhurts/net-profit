import { describe, expect, it } from 'vitest';
import { SPECIES } from '../../src/data/tuning';
import {
  type Box,
  boxesMeet,
  drawMapCastle,
  drawMapFish,
  drawMapMark,
  freeSpot,
  labelX,
  mapFish,
  nameSpots,
  Projection,
  placeNames,
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

describe('a name on the sea map', () => {
  /** A map w wide whose letters are each 6 wide. */
  const ctxW = (w: number) =>
    ({
      canvas: { width: w },
      measureText: (s: string) => ({ width: s.length * 6 }),
    }) as unknown as CanvasRenderingContext2D;

  it('is kept whole inside the map at either side, and left where it is between', () => {
    const name = 'Abyss: 1,000 m down';
    const half = (name.length * 6) / 2 + 2;
    expect(labelX(ctxW(300), name, 150, 1)).toBe(150);
    expect(labelX(ctxW(300), name, 290, 1)).toBe(300 - half);
    expect(labelX(ctxW(300), name, 10, 1)).toBe(half);
  });

  it('stays put on a map too narrow for it, or a context that cannot measure', () => {
    expect(labelX(ctxW(40), 'Abyss: 1,000 m down', 30, 1)).toBe(30);
    expect(labelX(countingCtx().ctx, 'Abyss: 1,000 m down', 7, 1)).toBe(7);
  });
});

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

describe('names on a crowded sea map', () => {
  const thing = { x: 100, y: 100, up: 10, down: 10, side: 10 };

  it('tries under a thing first (over, for one whose name goes over), then the other, then each side', () => {
    const under = nameSpots(thing, 40, 10, false).map((q) => q.box);
    expect(under).toEqual([
      [80, 110, 120, 120],
      [80, 80, 120, 90],
      [50, 95, 90, 105],
      [110, 95, 150, 105],
    ]);
    expect(nameSpots(thing, 40, 10, true)[0]?.box).toEqual([80, 80, 120, 90]);
    expect(nameSpots(thing, 40, 10, false)[2]?.at).toMatchObject({
      x: 90,
      align: 'right',
      base: 'middle',
    });
  });

  it('keeps a name centred under a thing whole inside the map, as labelX does', () => {
    expect(nameSpots({ ...thing, x: 10 }, 40, 10, false, 300)[0]?.box[0]).toBe(2);
  });

  it('takes the first place that is on the map and covers nothing; failing that, the one covering least', () => {
    const spots: Box[] = [
      [0, 0, 10, 10],
      [20, 0, 30, 10],
      [40, 0, 50, 10],
    ];
    expect(boxesMeet([0, 0, 10, 10], [10, 0, 20, 10])).toBe(false);
    expect(boxesMeet([0, 0, 10, 10], [9, 9, 20, 20])).toBe(true);
    expect(freeSpot(spots, [[0, 0, 12, 10]])).toBe(1);
    expect(freeSpot(spots, [], 45)).toBe(0);
    expect(freeSpot([[-5, 0, 5, 10], ...spots.slice(1)], [])).toBe(1);
    // Everything covered: the one covering least.
    expect(
      freeSpot(spots, [
        [0, 0, 30, 10],
        [40, 0, 45, 10],
      ]),
    ).toBe(2);
  });

  it("places the most hemmed-in name first: island 11's under it, so island 10's goes over its island", () => {
    // Two islands side by side, a mark over the right one's top: the left one's name under it would take the only
    // free place the right one's had.
    const ten = { x: 100, y: 100, up: 10, down: 10, side: 10 };
    const eleven = { x: 150, y: 100, up: 10, down: 10, side: 10 };
    const mark: Box = [130, 70, 150, 90];
    const taken: Box[] = [[90, 90, 110, 110], [140, 90, 160, 110], mark];
    const W = 175;
    const at = placeNames(
      [{ spots: nameSpots(ten, 50, 10, false, W) }, { spots: nameSpots(eleven, 50, 10, true, W) }],
      taken,
      W,
    );
    expect(at[1]).toMatchObject({ base: 'top', y: 110 });
    expect(at[0]).toMatchObject({ base: 'bottom', y: 90 });
    // No two names, and no name and island or mark, overlap.
    const boxes = taken.slice(3);
    expect(boxes.length).toBe(2);
    for (const b of boxes) for (const t of taken) if (b !== t) expect(boxesMeet(b, t)).toBe(false);
  });
});
