/**
 * The schools are held to the prototype twice over: the builder and the
 * per-frame sweep are sliced out of the legacy file and run beside the
 * module, and everything they produce must match bit for bit.
 */
import { describe, expect, it } from 'vitest';
import legacy from '../../legacy/net-profit.html?raw';
import { clamp, rng } from '../../src/core/math';
import { RINGS } from '../../src/data/tuning';
import { IX, IY, WS } from '../../src/world/island';
import {
  createSchools,
  type Fish,
  resetSchools,
  type School,
  type Sweep,
  updateSchools,
} from '../../src/world/schools';

function legacyBuild(): School[] {
  const start = legacy.indexOf('(function buildSchools(){');
  const end = legacy.indexOf('})();', start);
  expect(start).toBeGreaterThan(0);
  const body = legacy.slice(legacy.indexOf('{', start) + 1, end);
  const schools: School[] = [];
  new Function('rng', 'clamp', 'IX', 'IY', 'WS', 'schools', body)(rng, clamp, IX, IY, WS, schools);
  return schools;
}

const legacySweep = (() => {
  const start = legacy.indexOf(
    '  for (const sc of schools){\n    sc.cx = sc.ax + Math.sin(T*.05+sc.p)*60;',
  );
  const end = legacy.indexOf('\n  /* dock */', start);
  expect(start).toBeGreaterThan(0);
  const block = legacy.slice(start, end);
  return new Function(
    'schools',
    'T',
    'dt',
    'dark',
    'net',
    'nw',
    'rr',
    'cap',
    'holdTotal',
    'catching',
    'Z',
    'onScreen',
    'catchFish',
    block,
  ) as (...a: unknown[]) => void;
})();

const sweep = (over: Partial<Sweep> = {}): Sweep => ({
  T: 0,
  dt: 1 / 30,
  dark: 0,
  net: { x: -9999, y: -9999 },
  netWidth: 52,
  catching: true,
  zoom: 1,
  onScreen: () => true,
  hasRoom: () => true,
  ...over,
});

describe('createSchools', () => {
  it('builds the prototype world, bit for bit', () => {
    const old = legacyBuild();
    const now = createSchools();
    expect(now).toHaveLength(old.length);
    // The module adds vis from the start; the prototype left it unset until the first sweep.
    expect(now.map(({ vis: _vis, ...sc }) => sc)).toEqual(old);
  });

  it('rings the island as the tuning says, inside the world, with the night schools marked', () => {
    const schools = createSchools();
    expect(schools).toHaveLength(RINGS.reduce((n, r) => n + r.n, 0));
    for (const ring of RINGS) {
      const mine = schools.filter((sc) => sc.sp === ring.sp);
      expect(mine).toHaveLength(ring.n);
      for (const sc of mine) {
        expect(sc.fish).toHaveLength(ring.count);
        expect(sc.night).toBe(!!ring.night);
        expect([sc.n, sc.alive, sc.r]).toEqual([ring.count, ring.count, ring.rad]);
        expect(sc.ax).toBeGreaterThanOrEqual(220);
        expect(sc.ax).toBeLessThanOrEqual(WS - 220);
        for (const f of sc.fish) expect(Math.hypot(f.ox, f.oy)).toBeLessThanOrEqual(ring.rad);
      }
    }
  });
});

describe('updateSchools', () => {
  it('sweeps like the prototype for ten seconds of a net through the sardines, bit for bit', () => {
    const old = legacyBuild();
    const now = createSchools();
    const target = now[0] as School;
    const caughtOld: number[] = [];
    const caughtNow: number[] = [];
    const take = (list: number[], T: number) => (f: Fish, sc: School) => {
      f.alive = false;
      f.resp = T + 3;
      sc.alive--;
      list.push(sc.fish.indexOf(f));
    };
    const onScreen = (x: number) => x < 3400;
    for (let i = 0; i < 300; i++) {
      const T = 5 + i / 30;
      const dark = i < 150 ? 0 : 0.9;
      const net = { x: target.ax - 140 + i, y: target.ay + Math.sin(i / 9) * 30 };
      const nw = 88;
      legacySweep(
        old,
        T,
        1 / 30,
        dark,
        net,
        nw,
        (nw * 0.5 + 5) * (nw * 0.5 + 5),
        999,
        0,
        true,
        1.1,
        onScreen,
        take(caughtOld, T),
      );
      updateSchools(
        now,
        sweep({ T, dark, net, netWidth: nw, zoom: 1.1, onScreen }),
        take(caughtNow, T),
      );
    }
    expect(caughtNow.length).toBeGreaterThan(5);
    expect(caughtNow).toEqual(caughtOld);
    expect(now).toEqual(old);
  });

  it('drifts each school within sixty of its anchor', () => {
    const schools = createSchools();
    for (let i = 0; i < 200; i++) {
      updateSchools(schools, sweep({ T: i * 3 }), () => {});
      for (const sc of schools) {
        expect(Math.abs(sc.cx - sc.ax)).toBeLessThanOrEqual(60);
        expect(Math.abs(sc.cy - sc.ay)).toBeLessThanOrEqual(60);
      }
    }
  });

  it('hides the night schools by day, and will not give them up until it is properly dark', () => {
    const schools = createSchools();
    const night = schools.find((sc) => sc.night) as School;
    const caught: School[] = [];
    const over = { net: { x: night.ax, y: night.ay }, netWidth: 170 };
    updateSchools(schools, sweep({ ...over, dark: 0.2 }), (_f, sc) => caught.push(sc));
    expect(night.vis).toBe(false);
    expect(caught.filter((sc) => sc === night)).toHaveLength(0);
    for (let i = 0; i < 5; i++) {
      updateSchools(schools, sweep({ ...over, dark: 0.6, T: i }), (_f, sc) => caught.push(sc));
    }
    expect(night.vis).toBe(true);
    expect(caught.filter((sc) => sc === night)).toHaveLength(0);
    for (let i = 0; i < 5; i++) {
      updateSchools(schools, sweep({ ...over, dark: 0.9, T: 5 + i }), (_f, sc) => caught.push(sc));
    }
    expect(caught.filter((sc) => sc === night).length).toBeGreaterThan(0);
  });

  it('catches nothing with a net that cannot catch, or a hold with no room', () => {
    for (const over of [{ catching: false }, { hasRoom: () => false }]) {
      const schools = createSchools();
      const sc = schools[0] as School;
      let n = 0;
      for (let i = 0; i < 10; i++) {
        updateSchools(
          schools,
          sweep({ net: { x: sc.ax, y: sc.ay }, netWidth: 170, T: i, ...over }),
          () => n++,
        );
      }
      expect(n).toBe(0);
    }
  });

  it('brings a caught fish back when its time comes, and lets it grow before it can be caught again', () => {
    const schools = createSchools();
    const sc = schools[0] as School;
    const f = sc.fish[0] as Fish;
    f.alive = false;
    f.resp = 10;
    sc.alive--;
    updateSchools(schools, sweep({ T: 9.9 }), () => {});
    expect(f.alive).toBe(false);
    updateSchools(schools, sweep({ T: 10 }), () => {});
    expect([f.alive, sc.alive]).toEqual([true, sc.n]);
    expect(f.grow).toBeCloseTo(1.3 / 30, 9);
    for (let i = 0; i < 30; i++) updateSchools(schools, sweep({ T: 10 + i / 30 }), () => {});
    expect(f.grow).toBe(1);
  });

  it('leaves the fish of a school that is off screen and away from the net where they were', () => {
    const schools = createSchools();
    const sc = schools[0] as School;
    updateSchools(schools, sweep({ T: 1 }), () => {});
    const was = sc.fish.map((f) => [f.x, f.y]);
    updateSchools(schools, sweep({ T: 2, onScreen: () => false }), () => {});
    expect(sc.vis).toBe(false);
    expect(sc.fish.map((f) => [f.x, f.y])).toEqual(was);
  });
});

describe('resetSchools', () => {
  it('puts every fish back in the water, grown', () => {
    const schools = createSchools();
    const sc = schools[3] as School;
    for (const f of sc.fish.slice(0, 5)) {
      f.alive = false;
      f.grow = 0.2;
    }
    sc.alive -= 5;
    resetSchools(schools);
    expect(sc.alive).toBe(sc.n);
    expect(sc.fish.every((f) => f.alive && f.grow === 1)).toBe(true);
  });
});
