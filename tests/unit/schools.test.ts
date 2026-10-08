/**
 * The schools are held to the prototype twice over: the builder and the
 * per-frame sweep are sliced out of the legacy file and run beside the
 * module, and everything they produce must match bit for bit.
 */
import { describe, expect, it } from 'vitest';
import legacy from '../../legacy/net-profit.html?raw';
import { clamp, rng } from '../../src/core/math';
import { DEEP_RINGS, FAR_RINGS, MAHI, MARLIN, RINGS } from '../../src/data/tuning';
import { LAIR } from '../../src/entities/cthuluviathan';
import { DEEP, FAR, IX, IY, pastBuoys, pastFar, WS } from '../../src/world/island';
import { ISLE2 } from '../../src/world/isle2';
import { ISLE3 } from '../../src/world/isle3';
import { ISLE4, TAR_R } from '../../src/world/isle4';
import {
  createDeepSchools,
  createFarSchools,
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

describe('createDeepSchools', () => {
  it('puts a school of mahi-mahi past each side of the buoys, wholly in the deep and short of its end', () => {
    const deep = createDeepSchools();
    expect(deep).toHaveLength(DEEP_RINGS.reduce((n, r) => n + r.n, 0));
    const sides = new Set<string>();
    for (const sc of deep) {
      expect(sc.sp).toBe(MAHI);
      expect(sc.night).toBe(false);
      // The whole shoal, drift included, stays past the buoys and inside the deep.
      const reach = sc.r + 60;
      const out = Math.max(-sc.ax, sc.ax - WS, -sc.ay, sc.ay - WS);
      expect(out).toBeGreaterThan(reach);
      expect(out).toBeLessThan(DEEP - reach);
      for (const f of sc.fish) expect(pastBuoys(sc.ax + f.ox, sc.ay + f.oy)).toBe(true);
      sides.add(sc.ax > WS ? 'e' : sc.ax < 0 ? 'w' : sc.ay > WS ? 's' : 'n');
    }
    expect(sides.size).toBe(4);
  });

  it('puts a school of marlin at each corner of the far deep, past the far buoys, clear of the islands', () => {
    const far = createFarSchools();
    expect(far).toHaveLength(FAR_RINGS.reduce((n, r) => n + r.n, 0));
    for (const sc of far) {
      expect(sc.sp).toBe(MARLIN);
      const reach = sc.r + 60;
      for (const f of sc.fish) expect(pastFar(sc.ax + f.ox, sc.ay + f.oy)).toBe(true);
      // Short of the far deep's end.
      const out = Math.max(-sc.ax, sc.ax - WS, -sc.ay, sc.ay - WS);
      expect(out).toBeLessThan(DEEP + FAR - reach);
      for (const o of [ISLE2, ISLE3])
        expect(Math.hypot(sc.ax - o.x, sc.ay - o.y)).toBeGreaterThan(o.r + 900);
      expect(Math.hypot(sc.ax - ISLE4.x, sc.ay - ISLE4.y)).toBeGreaterThan(TAR_R + 700);
      // Out of the Cthuluviathan's reach.
      expect(Math.hypot(sc.ax - LAIR.x, sc.ay - LAIR.y)).toBeGreaterThan(1000 + reach);
    }
  });

  it('leaves the home water exactly as the prototype built it', () => {
    const home = createSchools();
    expect(home.every((sc) => !pastBuoys(sc.ax, sc.ay))).toBe(true);
    expect(home.some((sc) => sc.sp === MAHI)).toBe(false);
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
