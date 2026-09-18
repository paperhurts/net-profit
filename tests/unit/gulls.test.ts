import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import { BOAT_GULLS, type Gull, type GullSchool, Gulls } from '../../src/entities/gulls';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const school = (alive: number, n = 10, night = false): GullSchool => ({
  cx: 1000,
  cy: 1000,
  night,
  alive,
  n,
});
const run = (e: Gulls, w: World, seconds: number) => {
  for (let i = 0; i < seconds * 30; i++) {
    e.update(1 / 30, w);
    w.T += 1 / 30;
  }
};

describe('Gulls', () => {
  it('starts as four absent gulls at the boat', () => {
    const e = new Gulls([], { x: 500, y: 600 });
    expect(e.gulls).toHaveLength(BOAT_GULLS);
    expect(e.gulls.every((g) => g.x === 500 && g.y === 600 && g.a === 0)).toBe(true);
  });

  it('one gull comes for each quarter of the hold, and they leave as it empties', () => {
    const w = baseWorld({ holdTotal: 0, holdCap: 12 });
    const e = new Gulls([], w.boat);
    run(e, w, 4);
    expect(e.gulls.map((g) => g.a)).toEqual([0, 0, 0, 0]);
    w.holdTotal = 6;
    run(e, w, 4);
    const half = e.gulls.map((g) => Math.round(g.a));
    expect(half).toEqual([1, 1, 0, 0]);
    w.holdTotal = 1;
    run(e, w, 4);
    expect(e.gulls.map((g) => Math.round(g.a))).toEqual([1, 0, 0, 0]);
    w.holdTotal = 12;
    run(e, w, 4);
    expect(e.gulls.map((g) => Math.round(g.a))).toEqual([1, 1, 1, 1]);
    w.holdTotal = 0;
    run(e, w, 4);
    expect(e.gulls.every((g) => g.a < 0.03)).toBe(true);
  });

  it('trails the boat astern, each a little further back, wobbling a wingspan or so', () => {
    const w = baseWorld({ boat: { x: 2000, y: 2000, h: 0, v: 0 } });
    const e = new Gulls([], w.boat);
    run(e, w, 6);
    e.gulls.forEach((g, i) => {
      expect(Math.abs(g.x - (2000 - (55 + i * 28)))).toBeLessThanOrEqual(22.5);
      expect(Math.abs(g.y - 2000)).toBeLessThanOrEqual(22.5);
    });
  });

  it('draws only the gulls that are present, in the air layer', () => {
    const e = new Gulls([], { x: 0, y: 0 });
    const fake = fakeView();
    e.draw(fake.v, 'air');
    expect(fake.calls).toEqual({});
    (e.gulls[0] as Gull).a = 1;
    (e.gulls[1] as Gull).a = 0.02;
    e.draw(fake.v, 'surface');
    expect(fake.calls).toEqual({});
    e.draw(fake.v, 'air');
    expect(fake.calls).toEqual({ bird: 1 });
  });

  it('circles a full school with three birds by day, a thinning one with two, an empty one with none', () => {
    const e = new Gulls([school(10), school(5), school(2), school(10, 10, true)], { x: 0, y: 0 });
    const fake = fakeView();
    e.draw(fake.v, 'air');
    expect(fake.calls).toEqual({ bird: 5 });
    fake.v.dark = 0.9;
    e.draw(fake.v, 'air');
    expect(fake.calls).toEqual({ bird: 5 });
    fake.v.dark = 0;
    fake.onScreen = false;
    e.draw(fake.v, 'air');
    expect(fake.calls).toEqual({ bird: 5 });
  });
});
