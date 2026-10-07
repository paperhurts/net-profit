import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { nextSpear, SPEAR_MAX, SPEARS, spearAt } from '../../src/data/spear';
import { COME_BACK, SHORE_IN, SHORE_OUT, Shallows } from '../../src/entities/shallows';
import { SPEAR_SPEED, Spears } from '../../src/entities/spears';
import { onLand } from '../../src/entities/walker';
import { ISLE2 } from '../../src/world/isle2';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

describe('the spear', () => {
  it('gets further, faster and harder with each level, and dearer', () => {
    for (let i = 1; i < SPEARS.length; i++) {
      const a = SPEARS[i - 1];
      const b = SPEARS[i];
      if (!a || !b) throw new Error('levels');
      expect(b.cost).toBeGreaterThan(a.cost);
      expect(b.range).toBeGreaterThan(a.range);
      expect(b.reload).toBeLessThan(a.reload);
      expect(b.power).toBeGreaterThanOrEqual(a.power);
    }
    expect(spearAt(0)).toBeNull();
    expect(spearAt(1)).toBe(SPEARS[0]);
    expect(nextSpear(0)).toBe(SPEARS[0]);
    expect(nextSpear(SPEAR_MAX)).toBeNull();
  });
});

describe('the shallows of island 2', () => {
  it('keep their fish in the water, within a throw of the sand, all the way round', () => {
    const s = new Shallows(rng(3));
    const w = baseWorld();
    const first = spearAt(1);
    if (!first) throw new Error('spear');
    for (let i = 0; i < 4000; i++) {
      w.T += 1 / 20;
      s.update(1 / 20, w);
      for (const f of s.fish) {
        const out = Math.hypot(f.x - ISLE2.x, f.y - ISLE2.y) - ISLE2.r;
        expect(out).toBeGreaterThan(SHORE_IN - 7);
        expect(out).toBeLessThan(SHORE_OUT + 7);
        expect(onLand(f.x, f.y)).toBe(false);
        // From the edge of the sand straight in from it, the first spear reaches.
        expect(out + 12).toBeLessThan(first.range);
      }
    }
  });

  it('give up the nearest fish in reach, and have it back a while after it is taken', () => {
    const s = new Shallows(rng(3));
    const w = baseWorld();
    s.update(0.01, w);
    const f = s.fish[0];
    if (!f) throw new Error('fish');
    expect(s.nearest(f.x + 3, f.y, 10)).toBe(f);
    expect(s.nearest(ISLE2.x, ISLE2.y, 50)).toBeNull();
    s.take(f);
    expect(s.nearest(f.x, f.y, 5)).toBeNull();
    w.T += COME_BACK + 1;
    s.update(0.01, w);
    expect(f.alive).toBe(true);
  });

  it('draw their fish near the island and nothing elsewhere', () => {
    const s = new Shallows(rng(3));
    const fake = fakeView();
    s.draw(fake.v, 'surface');
    expect(fake.calls.fishShape).toBe(s.fish.length);
    s.draw(fake.v, 'air');
    expect(fake.calls.fishShape).toBe(s.fish.length);
  });
});

describe('spears in flight', () => {
  it('land on a moving target at a spear’s pace, and say so once', () => {
    const sp = new Spears();
    const target = { x: 100, y: 0 };
    let hits = 0;
    sp.launch(0, 0, 20, target, 0, () => hits++);
    const w = baseWorld();
    let t = 0;
    while (sp.flying.length && t < 2) {
      target.y += 20 / 60;
      sp.update(1 / 60, w);
      t += 1 / 60;
    }
    expect(hits).toBe(1);
    expect(t).toBeCloseTo(100 / SPEAR_SPEED, 1);
    expect(sp.splashes).toHaveLength(1);
    expect(sp.splashes[0]?.y).toBeCloseTo(target.y, 6);
  });

  it('draw in the air', () => {
    const sp = new Spears();
    sp.launch(0, 0, 20, { x: 100, y: 0 }, 0, () => {});
    const fake = fakeView();
    sp.draw(fake.v, 'air');
    expect(fake.calls.arc).toBe(1);
    sp.draw(fake.v, 'surface');
    expect(fake.calls.arc).toBe(1);
  });
});
