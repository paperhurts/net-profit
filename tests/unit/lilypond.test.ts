import { describe, expect, it } from 'vitest';
import { baitOf, fruitValue, type Garden, GUARD, takeBait } from '../../src/data/garden';
import { guidePage, LILY_SPS } from '../../src/data/guide';
import { CARP, MIRROR_CARP, SPECIES } from '../../src/data/tuning';
import {
  castSpot,
  LILY_FISH,
  lilyFish,
  NIBBLE_T,
  POND_REACH,
  POND_WAIT,
  PondLine,
  pondFish,
} from '../../src/fishing/pond';
import {
  fromGarden,
  LILY_POND,
  LILY14,
  onIsle14Ground,
  PLOT14,
  STALLS,
  TREES14,
  WINDMILL,
} from '../../src/world/garden';

describe('the lily pond: where it is', () => {
  it('lies on the grass, clear of the plot, the stalls, the windmill and the trees', () => {
    expect(LILY14.u + LILY14.r).toBeLessThan(PLOT14.u0);
    for (const s of STALLS)
      expect(Math.hypot(s.u - LILY14.u, s.v - LILY14.v)).toBeGreaterThan(LILY14.r + 30);
    expect(Math.hypot(WINDMILL.u - LILY14.u, WINDMILL.v - LILY14.v)).toBeGreaterThan(
      LILY14.r + WINDMILL.r + 20,
    );
    for (const t of TREES14)
      expect(Math.hypot(t.u - LILY14.u, t.v - LILY14.v)).toBeGreaterThan(LILY14.r + t.r);
    const [x, y] = fromGarden(LILY14.u, LILY14.v);
    expect(LILY_POND.x).toBeCloseTo(x, 6);
    expect(LILY_POND.y).toBeCloseTo(y, 6);
  });

  it('is water, not ground; its edge is ground and casts out onto it', () => {
    expect(onIsle14Ground(LILY_POND.x, LILY_POND.y)).toBe(false);
    const [ex, ey] = fromGarden(LILY14.u + LILY14.r + 10, LILY14.v);
    expect(onIsle14Ground(ex, ey)).toBe(true);
    const at = castSpot(LILY_POND, ex, ey);
    expect(at).not.toBeNull();
    if (!at) return;
    expect(Math.hypot(at.x - LILY_POND.x, at.y - LILY_POND.y)).toBeLessThan(LILY_POND.r);
    const [fx, fy] = fromGarden(LILY14.u + LILY14.r + POND_REACH + 20, LILY14.v);
    expect(castSpot(LILY_POND, fx, fy)).toBeNull();
  });
});

describe('the lily pond: its fish', () => {
  it('common carp three bites in four, mirror carp one', () => {
    expect(LILY_FISH.map((f) => f.sp)).toEqual([CARP, MIRROR_CARP]);
    let mirror = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) if (lilyFish((i + 0.5) / N) === MIRROR_CARP) mirror++;
    expect(mirror / N).toBeCloseTo(0.25, 2);
    expect(SPECIES[CARP]?.name).toBe('common carp');
    expect(SPECIES[MIRROR_CARP]?.name).toBe('mirror carp');
    expect(SPECIES[MIRROR_CARP]?.v ?? 0).toBeGreaterThan(SPECIES[CARP]?.v ?? 0);
  });

  it("a line on it bites carp; island 10's pond is unchanged", () => {
    const line = new PondLine(lilyFish);
    line.cast(0);
    line.update(POND_WAIT[0] + 0.01, 0.9, 0);
    expect(line.state).toBe('nibble');
    expect(line.sp).toBe(MIRROR_CARP);
    line.update(NIBBLE_T + 0.01, 0, 0);
    expect(line.reel()).toBe('caught');
    const old = new PondLine();
    old.cast(0);
    old.update(POND_WAIT[0] + 0.01, 0.99, 0);
    expect(old.sp).toBe(pondFish(0.99));
  });

  it('pays well under the boat a minute, even cast as fast as it bites', () => {
    const ev = LILY_FISH.reduce((s, f) => s + f.w * (SPECIES[f.sp]?.v ?? 0), 0) / 4;
    const perMin = (60 / (POND_WAIT[0] + NIBBLE_T)) * ev;
    expect(perMin).toBeLessThan(GUARD.perMinuteMax / 2);
  });

  it('has a guide page each, saying where and with what bait', () => {
    expect(LILY_SPS).toEqual([CARP, MIRROR_CARP]);
    for (const sp of LILY_SPS) {
      const p = guidePage(sp, 1, 3);
      expect(p.where).toMatch(/lily pond/);
      expect(p.when).toMatch(/fruit/);
      expect(p.blurb.length).toBeGreaterThan(20);
    }
  });
});

describe('the lily pond: bait', () => {
  it('takes the fruit in the basket worth least, one a cast, and none from an empty basket', () => {
    const g: Garden = {
      seen: true,
      bag: [
        { c: 'tomato', m: 1, v: 'gold' },
        { c: 'strawberry', m: 1.1 },
        { c: 'carrot', m: 1 },
        { c: 'strawberry', m: 0.9 },
      ],
    };
    const b = baitOf(g);
    expect(b).toEqual({ c: 'strawberry', m: 0.9 });
    expect(takeBait(g)).toEqual(b);
    expect(g.bag).toHaveLength(3);
    expect(takeBait(g)).toEqual({ c: 'strawberry', m: 1.1 });
    expect(takeBait(g)?.c).toBe('carrot');
    // The Gold tomato goes last.
    expect(fruitValue('tomato', 1, 'gold')).toBeGreaterThan(100);
    expect(takeBait(g)?.v).toBe('gold');
    expect(takeBait(g)).toBeNull();
    expect(baitOf({ seen: true })).toBeNull();
  });
});
