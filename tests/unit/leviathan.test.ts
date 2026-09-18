import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import type { World } from '../../src/entities/entity';
import {
  createLev,
  LEV_N,
  LEV_ORBIT,
  Leviathan,
  levPos,
  RUMBLE_EVERY,
} from '../../src/entities/leviathan';
import { IX, IY } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const step = (e: Leviathan, w: World, frames: number) => {
  for (let i = 0; i < frames; i++) e.update(1 / 30, w);
};

describe('levPos', () => {
  it('traces a rounded square 2,180 out from the island, bulging at the corners', () => {
    expect(levPos(0)).toEqual([IX + LEV_ORBIT, IY]);
    const [x, y] = levPos(Math.PI / 2);
    expect(x).toBeCloseTo(IX, 3);
    expect(y).toBeCloseTo(IY + LEV_ORBIT, 6);
    const [cx, cy] = levPos(Math.PI / 4);
    expect(cx - IX).toBeCloseTo(LEV_ORBIT * Math.sqrt(Math.SQRT1_2), 6);
    expect(cy - IY).toBeCloseTo(cx - IX, 6);
    expect(Math.hypot(cx - IX, cy - IY)).toBeGreaterThan(LEV_ORBIT);
  });
});

describe('Leviathan', () => {
  it('starts as a chain of 28 shadows trailing the head along the path', () => {
    const lev = createLev(rng(1));
    expect(lev.trail).toHaveLength(LEV_N);
    expect([lev.x, lev.y]).toEqual(lev.trail[0]);
    expect(lev.trail[0]).toEqual(levPos(lev.th));
    expect(lev.trail[LEV_N - 1]).toEqual(levPos(lev.th - (LEV_N - 1) * 0.016));
  });

  it('crawls along the path and lays a new shadow every thirty units', () => {
    const e = new Leviathan(rng(1));
    const lev = e.lev;
    const th0 = lev.th;
    const first = lev.trail[0];
    step(e, baseWorld({ started: false }), 300);
    expect(lev.th - th0).toBeCloseTo(0.3, 5);
    expect([lev.x, lev.y]).toEqual(levPos(lev.th));
    expect(lev.trail).toHaveLength(LEV_N);
    expect(lev.trail[0]).not.toEqual(first);
    const head = lev.trail[0] as [number, number];
    expect(Math.hypot(lev.x - head[0], lev.y - head[1])).toBeLessThanOrEqual(30);
  });

  it('tells the game once every fourteen seconds while the boat is over it, and only once started', () => {
    const e = new Leviathan(rng(1));
    const lev = e.lev;
    const w = baseWorld({ boat: { x: lev.x, y: lev.y, h: 0, v: 0 } });
    let passes = 0;
    e.onPass = () => passes++;
    step(e, w, 1);
    expect(passes).toBe(1);
    expect(lev.rumbleT).toBeCloseTo(RUMBLE_EVERY, 5);
    for (let i = 0; i < RUMBLE_EVERY * 30 + 5; i++) {
      w.boat.x = lev.x;
      w.boat.y = lev.y;
      e.update(1 / 30, w);
    }
    expect(passes).toBe(2);

    let quiet = 0;
    const unstarted = new Leviathan(rng(1));
    unstarted.onPass = () => quiet++;
    const at = { x: unstarted.lev.x, y: unstarted.lev.y, h: 0, v: 0 };
    step(unstarted, baseWorld({ started: false, boat: at }), 30);
    const far = new Leviathan(rng(1));
    far.onPass = () => quiet++;
    step(far, baseWorld({ boat: { x: IX, y: IY, h: 0, v: 0 } }), 900);
    expect(quiet).toBe(0);
  });

  it('draws 28 shadows underwater when on screen, and a chain of lights at night', () => {
    const fake = fakeView();
    const { v, calls } = fake;
    const e = new Leviathan(rng(1));
    e.draw(v, 'underwater');
    expect(calls.isoEllipse).toBe(LEV_N);
    expect(calls.fill).toBeGreaterThanOrEqual(LEV_N);
    e.draw(v, 'glow');
    expect(calls.arc).toBeUndefined();
    v.dark = 0.8;
    e.draw(v, 'glow');
    expect(calls.arc).toBe(LEV_N / 2);
    fake.onScreen = false;
    e.draw(v, 'underwater');
    e.draw(v, 'glow');
    expect(calls.isoEllipse).toBe(LEV_N);
    expect(calls.arc).toBe(LEV_N / 2);
  });
});
