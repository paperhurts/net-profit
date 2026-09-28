import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { SPEED, TIER_NAME } from '../../src/data/tuning';
import { steerBoat } from '../../src/entities/boat';
import type { World } from '../../src/entities/entity';
import {
  across,
  BODY_HALF,
  BODY_R,
  bodyDistance,
  createLev,
  GUARD_COOL,
  GUARD_NEAR,
  guardAt,
  LEV_N,
  LEV_ORBIT,
  Leviathan,
  levPos,
  RISE,
  RUMBLE_EVERY,
  UP,
  UP_MAX,
} from '../../src/entities/leviathan';
import { IX, IY, WS } from '../../src/world/island';
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

const FLAGSHIP = TIER_NAME.length - 1;
const TOP = SPEED[SPEED.length - 1] as number;
const flagship = (boat: World['boat'], over: Partial<World> = {}) =>
  baseWorld({ tier: FLAGSHIP, hullScale: 1.6, boat, ...over });
/** The stick's screen vector that points the boat along a world direction: the inverse of dirToWorld. */
const stickFor = (wx: number, wy: number): [number, number] => {
  const ix = wx - wy;
  const iy = (wx + wy) / 2;
  const m = Math.hypot(ix, iy) || 1;
  return [ix / m, iy / m];
};
/** Sail straight on at a steady speed. */
const cruise = (w: World, dt: number) => {
  w.boat.x += Math.cos(w.boat.h) * w.boat.v * dt;
  w.boat.y += Math.sin(w.boat.h) * w.boat.v * dt;
};
/** Sail on until it rises, or give up after `seconds`. */
const untilRise = (e: Leviathan, w: World, seconds = 8) => {
  for (let i = 0; i < seconds * 30 && !e.lev.rise; i++) {
    cruise(w, 1 / 30);
    e.update(1 / 30, w);
  }
  return e.lev.rise;
};

describe('across', () => {
  it('lies square across a heading, the given distance ahead', () => {
    const a = across(100, 200, Math.PI / 2, 500);
    expect(a.x).toBeCloseTo(100, 6);
    expect(a.y).toBeCloseTo(700, 6);
    expect(a.nx).toBeCloseTo(0, 6);
    expect(a.ny).toBeCloseTo(1, 6);
    expect(a.ux * a.nx + a.uy * a.ny).toBeCloseTo(0, 6);
    expect(bodyDistance(a, 100 + BODY_HALF, 700)).toBeCloseTo(0, 6);
    expect(bodyDistance(a, 100 + BODY_HALF + 50, 700)).toBeCloseTo(50, 6);
    expect(bodyDistance(a, 100, 640)).toBeCloseTo(60, 6);
  });
});

describe('the leviathan at the buoys', () => {
  it('rises when a flagship crosses them, going out or coming home, a second and a half ahead across its way', () => {
    for (const [x, h] of [
      [WS - 200, 0.3],
      [WS + 200, Math.PI],
    ] as const) {
      const e = new Leviathan(rng(1));
      const w = flagship({ x, y: IY, h, v: TOP });
      let rises = 0;
      e.onRise = () => rises++;
      const r = untilRise(e, w, 2);
      expect(rises).toBe(1);
      expect(r?.d).toBeCloseTo(guardAt(TOP), 6);
      expect((r?.d ?? 0) / TOP).toBeCloseTo(1.6, 6);
      expect(r?.x).toBeCloseTo(w.boat.x + Math.cos(h) * guardAt(TOP), 6);
      expect(r?.nx).toBeCloseTo(Math.cos(h), 6);
      // Just over the buoys when it happens.
      expect(Math.abs(w.boat.x - WS)).toBeLessThan(TOP / 30 + 1);
      step(e, w, 30);
      expect(e.lev.vis).toBe(0);
    }
  });

  it('never wakes for a flagship sweeping the lanternfish right by the buoys, however it points', () => {
    const e = new Leviathan(rng(1));
    let rises = 0;
    e.onRise = () => rises++;
    // Round and round a school in the corner, 280 in from both lines of buoys, never crossing them.
    const cx = WS - 280;
    const cy = WS - 280;
    const w = flagship({ x: cx + 200, y: cy, h: Math.PI / 2, v: TOP });
    for (let i = 0; i < 60 * 30; i++) {
      const a = (i / 30) * (TOP / 200);
      w.boat.x = cx + Math.cos(a) * 200;
      w.boat.y = cy + Math.sin(a) * 200;
      w.boat.h = a + Math.PI / 2;
      e.update(1 / 30, w);
    }
    expect(rises).toBe(0);
  });

  it('will not rise for a smaller boat, a drifting one, one running along the buoys, a docked or unstarted game, or before it is ready', () => {
    const boat = () => ({ x: WS - 200, y: IY, h: 0, v: TOP });
    const cases: [World, (e: Leviathan) => void][] = [
      [flagship(boat(), { tier: FLAGSHIP - 1 }), () => {}],
      [flagship({ x: WS - 5, y: IY, h: 0, v: 15 }), () => {}],
      [flagship({ ...boat(), x: WS - 100, h: Math.PI / 2 }), () => {}],
      [flagship(boat(), { docked: true }), () => {}],
      [flagship(boat(), { started: false }), () => {}],
      [flagship(boat()), (e) => (e.lev.cool = 5)],
    ];
    for (const [w, prep] of cases) {
      const e = new Leviathan(rng(1));
      prep(e);
      let rises = 0;
      e.onRise = () => rises++;
      untilRise(e, w, 2);
      expect(rises).toBe(0);
    }
  });

  it('stops a boat that holds its course: shoved back and stopped once, then held on its own side, going out or coming home', () => {
    for (const [x, h] of [
      [WS - 1300, 0],
      [WS + 1000, Math.PI],
    ] as const) {
      const e = new Leviathan(rng(1));
      const w = flagship({ x, y: IY, h, v: TOP });
      const stick = stickFor(Math.cos(h), Math.sin(h));
      let hits = 0;
      let shoved = { x: 0, v: -1 };
      let body = 0;
      e.onRise = (r) => (body = r.x);
      e.onHit = () => {
        hits++;
        shoved = { x: w.boat.x, v: w.boat.v };
      };
      for (let i = 0; i < 60 * 8; i++) {
        steerBoat(w.boat, stick[0], stick[1], TOP, 1 / 60);
        e.update(1 / 60, w);
      }
      expect(hits).toBe(1);
      expect(shoved.v).toBe(0);
      // Still pushing after eight seconds, it is still up, and the boat is still on the side it came from.
      expect(e.lev.rise?.up).toBeGreaterThan(0);
      const back = Math.cos(h) > 0 ? -1 : 1;
      expect((shoved.x - body) * back).toBeGreaterThan(BODY_R + 24 * 1.6);
      expect((w.boat.x - body) * back).toBeGreaterThan(BODY_R);
    }
  });

  it('never touches a person who turns away when the spines come up, a third or half a second late', () => {
    const own = rng(2026);
    let hits = 0;
    let misses = 0;
    for (let n = 0; n < 200; n++) {
      const base = n < 100 ? 1 / 3 : 1 / 2;
      const speed = [TOP, 200, 120][n % 3] as number;
      const off = (own() * 2 - 1) * 0.6;
      const alongLine = n % 2 === 1;
      const e = new Leviathan(rng(n + 1));
      const w = flagship({ x: WS - 900, y: 800 + own() * 3200, h: off, v: speed });
      e.onHit = () => hits++;
      e.onMiss = () => misses++;
      const late = base + (own() * 2 - 1) * 0.1;
      let seen = -1;
      let t = 0;
      for (let i = 0; i < 60 * 20; i++) {
        t += 1 / 60;
        if (seen < 0 && e.lev.rise) seen = t;
        let stick = stickFor(Math.cos(off), Math.sin(off));
        if (seen >= 0 && t >= seen + late) {
          // Back toward home, or a quarter turn off its way to run along the body: either is turning away.
          const side = off >= 0 ? 1 : -1;
          stick = alongLine
            ? stickFor(-Math.sin(off) * side, Math.cos(off) * side)
            : stickFor(-1, 0);
        }
        steerBoat(w.boat, stick[0] * (speed / TOP), stick[1] * (speed / TOP), TOP, 1 / 60);
        e.update(1 / 60, w);
      }
      expect(seen).toBeGreaterThan(0);
    }
    expect(hits).toBe(0);
    expect(misses).toBe(200);
  });

  it('waits for a boat that keeps coming, sinks once it backs off, and lets it cross both ways until it is ready again', () => {
    const e = new Leviathan(rng(1));
    const w = flagship({ x: WS - 400, y: IY, h: 0, v: TOP });
    let misses = 0;
    let rises = 0;
    e.onMiss = () => misses++;
    e.onRise = () => rises++;
    untilRise(e, w);
    // Creep on toward it: it stays up, past the least it would.
    w.boat.v = 40;
    for (let i = 0; i < 30 * (RISE + UP + 2); i++) {
      cruise(w, 1 / 30);
      e.update(1 / 30, w);
    }
    const r = e.lev.rise as NonNullable<typeof e.lev.rise>;
    expect(r.up).toBeGreaterThan(0);
    expect(bodyDistance(r, w.boat.x, w.boat.y)).toBeGreaterThan(BODY_R);
    // Turn for home: it sinks.
    w.boat.h = Math.PI;
    for (let i = 0; i < 30 * (UP + 2); i++) {
      cruise(w, 1 / 30);
      e.update(1 / 30, w);
    }
    expect(e.lev.rise).toBeNull();
    expect(misses).toBe(1);
    // Home across the buoys and straight back out again, while it is down: nothing.
    w.boat.v = TOP;
    for (const h of [Math.PI, 0]) {
      w.boat.h = h;
      for (let i = 0; i < 30 * 1.5; i++) {
        cruise(w, 1 / 30);
        e.update(1 / 30, w);
      }
    }
    expect(w.boat.x).toBeGreaterThan(WS);
    expect(rises).toBe(1);
    // Once it is ready, the next crossing wakes it.
    for (let i = 0; i < 30 * GUARD_COOL; i++) e.update(1 / 30, w);
    w.boat.h = Math.PI;
    untilRise(e, w, 3);
    expect(rises).toBe(2);
  });

  it('gives up waiting in the end, and goes back to its path once it has sunk', () => {
    const e = new Leviathan(rng(1));
    const w = flagship({ x: WS - 300, y: IY, h: 0, v: TOP });
    const r = untilRise(e, w) as NonNullable<ReturnType<typeof untilRise>>;
    // Hold still just short of it, pointed at it, forever.
    w.boat.x = r.x - GUARD_NEAR;
    for (let i = 0; i < 30 * (RISE + UP_MAX + 3); i++) {
      w.boat.v = 60;
      e.update(1 / 30, w);
    }
    expect(e.lev.rise).toBeNull();
    for (let i = 0; i < 30 * 3; i++) e.update(1 / 30, baseWorld({ started: false }));
    expect(e.lev.vis).toBe(1);
  });
});
