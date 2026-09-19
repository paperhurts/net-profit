import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import type { World } from '../../src/entities/entity';
import {
  BLOOM_RADIUS,
  BLOOM_SIZE,
  BLOOM_START,
  createBloom,
  ISLAND_BERTH,
  Jellies,
  jellyAt,
  REGROW_SECONDS,
  RIM,
} from '../../src/entities/jellies';
import { IX, IY, WS } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const world = (over: Partial<World> = {}) => baseWorld({ rng: rng(9), ...over });
const run = (e: Jellies, w: World, seconds: number) => {
  for (let i = 0; i < seconds * 30; i++) {
    e.update(1 / 30, w);
    w.T += 1 / 30;
  }
};
/** A fresh bloom with a fast, whole net parked on its first jelly. */
const netted = (over: Partial<World> = {}) => {
  const e = new Jellies(rng(1));
  const w = world(over);
  const [x, y] = jellyAt(e.bloom, e.bloom.jellies[0] as never);
  w.net = { x, y, speed: 60, torn: 0 };
  return { e, w };
};

describe('createBloom', () => {
  it('has twenty to forty jellies inside its radius, about a thousand out from the island', () => {
    for (let seed = 1; seed < 30; seed++) {
      const b = createBloom(rng(seed));
      expect(b.jellies.length).toBeGreaterThanOrEqual(BLOOM_SIZE[0]);
      expect(b.jellies.length).toBeLessThanOrEqual(BLOOM_SIZE[1]);
      for (const j of b.jellies) expect(Math.hypot(j.ox, j.oy)).toBeLessThanOrEqual(BLOOM_RADIUS);
      const d = Math.hypot(b.x - IX, b.y - IY);
      expect(d).toBeGreaterThanOrEqual(BLOOM_START - 200 - 1e-6);
      expect(d).toBeLessThanOrEqual(BLOOM_START + 200 + 1e-6);
      expect(b.r).toBe(BLOOM_RADIUS);
    }
  });
});

describe('Jellies', () => {
  it('drifts, keeping off the island and inside the world', () => {
    const e = new Jellies(rng(2));
    const b = e.bloom;
    const x0 = b.x;
    const y0 = b.y;
    let minIsland = 1e9;
    let inside = true;
    let path = 0;
    const w = world({ started: false });
    for (let i = 0; i < 120 * 30; i++) {
      const px = b.x;
      const py = b.y;
      e.update(1 / 30, w);
      path += Math.hypot(b.x - px, b.y - py);
      minIsland = Math.min(minIsland, Math.hypot(b.x - IX, b.y - IY));
      if (b.x < RIM - 1 || b.x > WS - RIM + 1 || b.y < RIM - 1 || b.y > WS - RIM + 1)
        inside = false;
    }
    expect(path).toBeGreaterThan(1500);
    expect(Math.hypot(b.x - x0, b.y - y0)).toBeGreaterThan(300);
    expect(minIsland).toBeGreaterThanOrEqual(ISLAND_BERTH - 1);
    expect(inside).toBe(true);
  });

  it('pulses: every jelly keeps its own phase moving', () => {
    const e = new Jellies(rng(3));
    const before = e.bloom.jellies.map((j) => j.ph);
    run(e, world({ started: false }), 1);
    for (const [i, j] of e.bloom.jellies.entries()) {
      expect(j.ph - (before[i] as number)).toBeCloseTo(1.6, 5);
    }
  });

  it('a moving, whole net scoops the jellies it passes over, and the game hears of the first', () => {
    const { e, w } = netted();
    let fouls = 0;
    e.onFoul = () => fouls++;
    e.update(1 / 30, w);
    expect(e.inNet).toBeGreaterThanOrEqual(1);
    expect(fouls).toBe(1);
    expect(e.bloom.jellies[0]?.alive).toBe(false);
    const first = e.inNet;
    const other = e.bloom.jellies.find((j) => j.alive) as NonNullable<(typeof e.bloom.jellies)[0]>;
    const [x, y] = jellyAt(e.bloom, other);
    w.net = { x, y, speed: 60, torn: 0 };
    e.update(1 / 30, w);
    expect(e.inNet).toBeGreaterThan(first);
    expect(fouls).toBe(1);
  });

  it('scoops nothing with a slow or torn net, or before the game starts', () => {
    for (const over of [{ speed: 10 }, { torn: 2 }, { started: false }]) {
      const { e, w } = netted('started' in over ? over : {});
      if (!('started' in over)) Object.assign(w.net, over);
      e.update(1 / 30, w);
      expect(e.inNet, JSON.stringify(over)).toBe(0);
    }
  });

  it('lets a fine mesh pass clean through', () => {
    const { e, w } = netted({ fineMesh: true });
    let fouls = 0;
    e.onFoul = () => fouls++;
    e.update(1 / 30, w);
    expect([e.inNet, fouls]).toEqual([0, 0]);
    expect(e.bloom.jellies.every((j) => j.alive)).toBe(true);
  });

  it('a scooped jelly is back in the bloom after a minute', () => {
    const { e, w } = netted();
    e.update(1 / 30, w);
    const j = e.bloom.jellies[0] as NonNullable<(typeof e.bloom.jellies)[0]>;
    expect(j.alive).toBe(false);
    w.net = { x: -9999, y: -9999, speed: 0, torn: 0 };
    w.T = j.resp - 0.01;
    e.update(1 / 30, w);
    expect(j.alive).toBe(false);
    w.T = j.resp;
    e.update(1 / 30, w);
    expect(j.alive).toBe(true);
    expect(j.resp - REGROW_SECONDS).toBeCloseTo(0, 5);
  });

  it('shakes out at the dock, saying how many, and reset makes everything whole', () => {
    const { e, w } = netted();
    e.update(1 / 30, w);
    const n = e.inNet;
    expect(n).toBeGreaterThan(0);
    expect(e.shakeOut()).toBe(n);
    expect(e.inNet).toBe(0);
    expect(e.shakeOut()).toBe(0);
    e.update(1 / 30, w);
    e.reset();
    expect(e.inNet).toBe(0);
    expect(e.bloom.jellies.every((j) => j.alive)).toBe(true);
  });

  it('draws a bell for every live jelly, one light in the mask, and lights at night in the glow', () => {
    const e = new Jellies(rng(4));
    const alive = e.bloom.jellies.length;
    (e.bloom.jellies[0] as NonNullable<(typeof e.bloom.jellies)[0]>).alive = false;
    const fake = fakeView();
    e.draw(fake.v, 'surface');
    expect(fake.calls.isoEllipse).toBe(alive - 1);
    expect(fake.calls.fill).toBe(alive - 1);
    e.draw(fake.v, 'mask');
    expect(fake.calls.light).toBe(1);
    e.draw(fake.v, 'glow');
    expect(fake.calls.arc).toBeUndefined();
    fake.v.dark = 0.9;
    e.draw(fake.v, 'glow');
    expect(fake.calls.arc).toBe(alive - 1);
    expect(fake.calls.glow).toBe(1);
    fake.onScreen = false;
    e.draw(fake.v, 'surface');
    e.draw(fake.v, 'mask');
    e.draw(fake.v, 'glow');
    expect(fake.calls.isoEllipse).toBe(alive - 1);
    expect(fake.calls.light).toBe(1);
    expect(fake.calls.glow).toBe(1);
  });
});
