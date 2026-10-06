import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { SPEED } from '../../src/data/tuning';
import {
  Anglerfish,
  BAIT_NEAR,
  COOL,
  DIVE,
  inDeep,
  JAW_R,
  LAIR_CLEAR,
  lurkAt,
  openAt,
  SNAP_MAX,
} from '../../src/entities/anglerfish';
import { steerBoat } from '../../src/entities/boat';
import { LAIR } from '../../src/entities/cthuluviathan';
import type { World } from '../../src/entities/entity';
import { DEEP, pastBuoys, WS } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const TOP = SPEED[SPEED.length - 1] as number;
const run = (a: Anglerfish, w: World, seconds: number) => {
  for (let i = 0; i < seconds * 30; i++) a.update(1 / 30, w);
};
/** One already up, its light at x, y in the deep south of the island. */
const lurking = (x = WS / 2, y = WS + DEEP / 2) => {
  const a = new Anglerfish();
  a.state = 'lurking';
  a.glow = 1;
  a.x = x;
  a.y = y;
  a.tx = x;
  a.ty = y;
  return a;
};
/** A flagship at night, `d` from the light and heading at it `off` radians askew. */
const making = (a: Anglerfish, d: number, v: number, off = 0, over: Partial<World> = {}) => {
  const h = -Math.PI / 2 + off;
  return baseWorld({
    tier: 5,
    hullScale: 1.6,
    dark: 1,
    boat: { x: a.x - Math.cos(h) * d, y: a.y - Math.sin(h) * d, h, v },
    ...over,
  });
};
const stickFor = (wx: number, wy: number): [number, number] => {
  const ix = wx - wy;
  const iy = (wx + wy) / 2;
  const m = Math.hypot(ix, iy) || 1;
  return [ix / m, iy / m];
};

describe('where the anglerfish lurks', () => {
  it('is somewhere in the deep, short of its end, clear of the Cthuluviathan, and away from the boat when asked', () => {
    const r = rng(5);
    const boat = { x: WS + 600, y: WS / 2 };
    for (let i = 0; i < 300; i++) {
      const [x, y] = lurkAt(r, boat, 1300);
      expect(inDeep(x, y)).toBe(true);
      expect(pastBuoys(x, y)).toBe(true);
      expect(Math.hypot(x - LAIR.x, y - LAIR.y)).toBeGreaterThanOrEqual(LAIR_CLEAR);
      expect(Math.hypot(x - boat.x, y - boat.y)).toBeGreaterThanOrEqual(1300);
    }
    expect(inDeep(WS / 2, WS / 2)).toBe(false);
    expect(inDeep(WS / 2, WS + DEEP - 10)).toBe(false);
  });
});

describe('the anglerfish', () => {
  it('comes up only at night, and sinks at dawn', () => {
    const a = new Anglerfish();
    const w = baseWorld({ dark: 0, rng: rng(2), boat: { x: WS / 2, y: WS / 2, h: 0, v: 0 } });
    run(a, w, 5);
    expect(a.state).toBe('gone');
    w.dark = 1;
    run(a, w, 0.1);
    expect(a.state).toBe('lurking');
    expect(inDeep(a.x, a.y)).toBe(true);
    run(a, w, 3);
    expect(a.glow).toBeGreaterThan(0.9);
    w.dark = 0.1;
    run(a, w, DIVE + 0.2);
    expect(a.state).toBe('gone');
  });

  it('edges its light toward a boat nearby, no nearer than it means to, and stays in the deep', () => {
    const a = lurking();
    const w = making(a, 800, 0);
    run(a, w, 40);
    const d = Math.hypot(w.boat.x - a.x, w.boat.y - a.y);
    expect(d).toBeLessThan(800);
    expect(d).toBeGreaterThan(BAIT_NEAR - 5);
    expect(inDeep(a.x, a.y)).toBe(true);
  });

  it('opens its jaws ahead of a boat making for the light, but not for one going by or drifting', () => {
    for (const [d, v, by, opens] of [
      [openAt(TOP) + 30, TOP, false, 1],
      [openAt(TOP) + 30, TOP, true, 0],
      [openAt(30) + 10, 30, false, 0],
    ] as const) {
      const a = lurking();
      let n = 0;
      a.onOpen = () => n++;
      const w = making(a, d, v);
      // Going by: square across the line to the light, not along it.
      if (by) w.boat.h = 0;
      for (let i = 0; i < 6; i++) {
        w.boat.x += Math.cos(w.boat.h) * v * (1 / 30);
        w.boat.y += Math.sin(w.boat.h) * v * (1 / 30);
        a.update(1 / 30, w);
      }
      expect(n).toBe(opens);
    }
    expect(openAt(TOP)).toBeGreaterThan(openAt(120));
    expect(openAt(0)).toBeGreaterThan(JAW_R + 2 * 24 * 1.6);
  });

  it('bites a boat that holds its course, and shuts on nothing for a person who turns away up to two thirds of a second late', () => {
    const own = rng(4);
    let held = 0;
    let dodged = 0;
    for (let n = 0; n < 150; n++) {
      const speed = [TOP, 250, 200, 160, 120][n % 5] as number;
      const base = [1 / 3, 1 / 2, 2 / 3][n % 3] as number;
      const off = (own() * 2 - 1) * 0.45;
      const back = n % 2 === 0;
      for (const hold of [true, false]) {
        const a = lurking(WS / 2 + (own() - 0.5) * 1500);
        const w = making(a, 900, speed, off, { rng: rng(n + 3) });
        const h = w.boat.h;
        let bitten = 0;
        let opened = -1;
        let t = 0;
        a.onBite = () => bitten++;
        a.onOpen = () => (opened = t);
        const late = base + (own() * 2 - 1) * 0.1;
        for (let i = 0; i < 60 * 8; i++) {
          t += 1 / 60;
          let st = stickFor(Math.cos(h), Math.sin(h));
          if (!hold && opened >= 0 && t >= opened + late) {
            const side = off >= 0 ? 1 : -1;
            st = back
              ? stickFor(w.boat.x - a.x, w.boat.y - a.y)
              : stickFor(-Math.sin(h) * side, Math.cos(h) * side);
          }
          steerBoat(w.boat, (st[0] * speed) / TOP, (st[1] * speed) / TOP, TOP, 1 / 60);
          a.update(1 / 60, w);
        }
        if (hold) held += bitten;
        else dodged += bitten;
      }
    }
    expect(held).toBe(150);
    expect(dodged).toBe(0);
  });

  it('shuts on nothing for a boat that stops short, then sinks and stays down a while before coming up somewhere else', () => {
    const a = lurking();
    let misses = 0;
    a.onMiss = () => misses++;
    const w = making(a, openAt(TOP) - 5, TOP);
    a.update(1 / 30, w);
    expect(a.state).toBe('opening');
    w.boat.v = 0;
    run(a, w, SNAP_MAX + 0.1);
    expect([misses, a.state]).toEqual([1, 'diving']);
    const at = [a.x, a.y];
    run(a, w, DIVE + COOL - 1);
    expect(a.state).toBe('gone');
    run(a, w, 1.5);
    expect(a.state).toBe('lurking');
    expect([a.x, a.y]).not.toEqual(at);
    expect(Math.hypot(a.x - w.boat.x, a.y - w.boat.y)).toBeGreaterThanOrEqual(1300);
  });
});

describe('drawing the anglerfish', () => {
  it('draws a school that is not there, a bulb, a light in the dark, and teeth when it opens; nothing when gone', () => {
    const fake = fakeView();
    const a = lurking();
    for (const layer of ['underwater', 'afloat', 'mask', 'glow'] as const) a.draw(fake.v, layer);
    expect(fake.calls.fishShape).toBe(10);
    expect(fake.calls.light).toBe(1);
    const fills = fake.calls.fill ?? 0;
    const w = making(a, openAt(TOP) - 5, TOP);
    a.update(1 / 30, w);
    run(a, { ...w, boat: { ...w.boat, v: 0 } }, 0.5);
    a.draw(fake.v, 'afloat');
    expect((fake.calls.fill ?? 0) - fills).toBeGreaterThan(18);
    const gone = new Anglerfish();
    const before = { ...fake.calls };
    for (const layer of ['underwater', 'afloat', 'mask', 'glow'] as const) gone.draw(fake.v, layer);
    expect(fake.calls).toEqual(before);
  });
});
