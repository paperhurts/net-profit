import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import type { World } from '../../src/entities/entity';
import {
  FULL_EVERY,
  RARE_SECONDS,
  RARE_SPEED,
  Rare,
  rarePoint,
  WANDER,
} from '../../src/entities/rare';
import { IX, IY, WS } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const world = (over: Partial<World> = {}) => baseWorld({ rng: rng(3), range: 2400, ...over });
const step = (e: Rare, w: World, frames: number) => {
  for (let i = 0; i < frames; i++) e.update(1 / 30, w);
};
const run = (e: Rare, w: World, seconds: number) => step(e, w, Math.round(seconds * 30));
/** A fresh fish, with a fast net parked right on it. */
const netted = (over: Partial<World> = {}) => {
  const e = new Rare();
  const w = world(over);
  e.spawn(10, w);
  w.net = { x: e.rare.x, y: e.rare.y, speed: 60, torn: 0 };
  return { e, w };
};

describe('rarePoint', () => {
  it('without a spread, lands past the shallows, inside the range, off the rim and away from the boat', () => {
    const w = world();
    for (let i = 0; i < 50; i++) {
      const [x, y] = rarePoint(IX + 700, IY, 0, w);
      const d = Math.hypot(x - IX, y - IY);
      expect(d).toBeGreaterThan(480);
      expect(d).toBeLessThan(w.range - 140);
      expect(x).toBeGreaterThan(150);
      expect(x).toBeLessThan(WS - 150);
      expect(y).toBeGreaterThan(150);
      expect(y).toBeLessThan(WS - 150);
      expect(Math.hypot(x - w.boat.x, y - w.boat.y)).toBeGreaterThan(420);
    }
  });

  it('with a spread, stays within it of the given point', () => {
    const w = world();
    for (let i = 0; i < 50; i++) {
      const [x, y] = rarePoint(IX + 900, IY + 200, WANDER, w);
      expect(Math.hypot(x - (IX + 900), y - (IY + 200))).toBeLessThanOrEqual(WANDER);
      expect(Math.hypot(x - IX, y - IY)).toBeGreaterThan(480);
    }
  });

  it('never reaches past 2,250 however far the boat can sail, and settles for the clamped centre when nothing fits', () => {
    const w = world({ range: 1e9 });
    for (let i = 0; i < 50; i++) {
      const [x, y] = rarePoint(IX, IY, 0, w);
      expect(Math.hypot(x - IX, y - IY)).toBeLessThan(2250);
    }
    expect(rarePoint(-500, IY, 0, world({ range: 300 }))).toEqual([150, IY]);
  });
});

describe('Rare', () => {
  it('spawns a fish of the given species, still, for eighty seconds', () => {
    const e = new Rare();
    e.spawn(11, world());
    const r = e.rare;
    expect([r.on, r.sp, r.t]).toEqual([true, 11, RARE_SECONDS]);
    expect([r.tx, r.ty]).toEqual([r.x, r.y]);
  });

  it('wanders at fifty-eight a second, picking a new target nearby when it arrives', () => {
    const e = new Rare();
    const w = world();
    e.spawn(10, w);
    const r = e.rare;
    const x0 = r.x;
    const y0 = r.y;
    e.update(1 / 30, w);
    expect(Math.hypot(r.tx - x0, r.ty - y0)).toBeLessThanOrEqual(WANDER);
    expect(Math.hypot(r.x - x0, r.y - y0)).toBeCloseTo(RARE_SPEED / 30, 6);
    run(e, w, 10);
    expect(r.on).toBe(true);
    expect(r.t).toBeCloseTo(RARE_SECONDS - 10 - 1 / 30, 5);
  });

  it('slips away when its time runs out, and says so once', () => {
    const e = new Rare();
    const w = world();
    e.spawn(10, w);
    const slipped: number[] = [];
    e.onSlip = (sp) => slipped.push(sp);
    run(e, w, RARE_SECONDS + 1);
    expect(e.rare.on).toBe(false);
    expect(slipped).toEqual([10]);
  });

  it('is landed by a fast, whole net when the hold has room and no jellyfish', () => {
    const { e, w } = netted({ holdTotal: 3 });
    const caught: number[] = [];
    e.onCatch = (sp) => caught.push(sp);
    e.update(1 / 30, w);
    expect(caught).toEqual([10]);
    expect(e.rare.on).toBe(false);
    for (const over of [{ started: false }, { torn: 1 }, { speed: 10 }, { fouled: true }]) {
      const fresh = netted({ holdTotal: 3 });
      if ('started' in over) fresh.w.started = false;
      else if ('fouled' in over) fresh.w.netFouled = true;
      else Object.assign(fresh.w.net, over);
      let n = 0;
      fresh.e.onCatch = () => n++;
      fresh.e.update(1 / 30, fresh.w);
      expect([n, fresh.e.rare.on], JSON.stringify(over)).toEqual([0, true]);
    }
  });

  it('with a full hold, stays on the water and nudges once every five seconds', () => {
    const { e, w } = netted({ holdTotal: 12, holdCap: 12 });
    const nudges: number[] = [];
    let catches = 0;
    e.onFull = (sp) => nudges.push(sp);
    e.onCatch = () => catches++;
    for (let i = 0; i < FULL_EVERY * 30 + 5; i++) {
      w.net.x = e.rare.x;
      w.net.y = e.rare.y;
      e.update(1 / 30, w);
    }
    expect(nudges).toEqual([10, 10]);
    expect([catches, e.rare.on]).toEqual([0, true]);
  });

  it('reset takes it off the water', () => {
    const e = new Rare();
    e.spawn(10, world());
    e.reset();
    expect(e.rare.on).toBe(false);
  });

  it('draws the fish on the surface, a light in the mask, seven stars in the glow and an indicator', () => {
    const fake = fakeView();
    const { v, calls } = fake;
    const e = new Rare();
    for (const layer of ['surface', 'mask', 'glow', 'overlay'] as const) e.draw(v, layer);
    expect(calls).toEqual({});
    e.spawn(10, world());
    for (const layer of ['surface', 'mask', 'glow', 'overlay'] as const) e.draw(v, layer);
    expect(calls).toEqual({ fishShape: 1, light: 1, star: 7, indicator: 1 });
    fake.onScreen = false;
    for (const layer of ['surface', 'mask', 'glow', 'overlay'] as const) e.draw(v, layer);
    expect(calls).toEqual({ fishShape: 1, light: 2, star: 7, indicator: 2 });
  });
});
