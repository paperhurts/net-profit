import { describe, expect, it } from 'vitest';
import legacy from '../../legacy/net-profit.html?raw';
import { dirToWorld } from '../../src/core/iso';
import { angDiff, clamp, rng } from '../../src/core/math';
import { SPEED } from '../../src/data/tuning';
import { type Boat, MIN_THROTTLE, steerBoat, steerBoatRelative } from '../../src/entities/boat';

const maxV = SPEED[0];
const dt = 1 / 60;

/** A heading that points exactly where the screen vector (1, 0) leads in the world. */
const headingOf = (ix: number, iy: number) => {
  const w = dirToWorld(ix, iy);
  return Math.atan2(w[1], w[0]);
};

describe('steerBoat', () => {
  it('coasts to a stop with no input', () => {
    const boat: Boat = { x: 0, y: 0, h: 0, v: 100 };
    steerBoat(boat, 0, 0, maxV, dt);
    expect(boat.v).toBeLessThan(100);
    expect(boat.h).toBe(0);
    expect(boat.x).toBeCloseTo(boat.v * dt);
    for (let i = 0; i < 600; i++) steerBoat(boat, 0, 0, maxV, dt);
    expect(boat.v).toBeLessThan(0.01);
  });

  it('opens the throttle fully when pointed straight ahead and eases toward top speed', () => {
    const boat: Boat = { x: 0, y: 0, h: headingOf(1, 0), v: 0 };
    const h0 = boat.h;
    for (let i = 0; i < 600; i++) steerBoat(boat, 1, 0, maxV, dt);
    expect(boat.h).toBeCloseTo(h0);
    expect(boat.v).toBeCloseTo(maxV, 0);
  });

  it('turns at most the turn rate per step and turns quicker when slow', () => {
    const target = headingOf(0, 1);
    const slow: Boat = { x: 0, y: 0, h: target + Math.PI / 2, v: 0 };
    const fast: Boat = { x: 0, y: 0, h: target + Math.PI / 2, v: maxV };
    steerBoat(slow, 0, 1, maxV, dt);
    steerBoat(fast, 0, 1, maxV, dt);
    const slowTurn = Math.abs(angDiff(slow.h, target + Math.PI / 2));
    const fastTurn = Math.abs(angDiff(fast.h, target + Math.PI / 2));
    expect(slowTurn).toBeCloseTo((2.6 + 1.2) * dt);
    expect(fastTurn).toBeCloseTo(2.6 * dt);
  });

  it('keeps a quarter throttle when the input points astern, so a U-turn does not stall', () => {
    const boat: Boat = { x: 0, y: 0, h: headingOf(1, 0) + Math.PI, v: 0 };
    steerBoat(boat, 1, 0, maxV, dt);
    // One step at ACCEL toward maxV * MIN_THROTTLE.
    expect(boat.v).toBeCloseTo(maxV * MIN_THROTTLE * Math.min(1, dt * 2.4));
  });

  it('matches the legacy code exactly, step for step, on five hundred random states', () => {
    const start = legacy.indexOf('  /* boat */');
    expect(start).toBeGreaterThan(0);
    const last = 'boat.x += Math.cos(boat.h)*boat.v*dt; boat.y += Math.sin(boat.h)*boat.v*dt;';
    const end = legacy.indexOf(last, start);
    expect(end).toBeGreaterThan(start);
    const block = legacy.slice(start, end + last.length);
    // The prototype's own block, run as a function of the same state. The body
    // is a slice of the repo's committed reference file, evaluated only inside
    // this test process; it is the reference, not an input.
    const legacySteer = new Function(
      'ix',
      'iy',
      'boat',
      'SPEED',
      'lv',
      'dt',
      'dirToWorld',
      'angDiff',
      'clamp',
      block,
    ) as (
      ix: number,
      iy: number,
      boat: Boat,
      speed: readonly number[],
      lv: { engine: number },
      dt: number,
      dirToWorld: typeof import('../../src/core/iso').dirToWorld,
      angDiff: typeof import('../../src/core/math').angDiff,
      clamp: typeof import('../../src/core/math').clamp,
    ) => void;

    const r = rng(9);
    for (let i = 0; i < 500; i++) {
      const engine = Math.floor(r() * 6);
      const top = SPEED[engine] ?? SPEED[0];
      const a: Boat = {
        x: r() * 4800,
        y: r() * 4800,
        h: r() * Math.PI * 2 - Math.PI,
        v: r() * top,
      };
      const b: Boat = { ...a };
      // Sometimes no input, sometimes a stick anywhere in the ring.
      const mag = r() < 0.2 ? 0 : r();
      const ang = r() * Math.PI * 2;
      const ix = Math.cos(ang) * mag;
      const iy = Math.sin(ang) * mag;
      const step = 0.008 + r() * 0.04;
      steerBoat(a, ix, iy, top, step);
      legacySteer(ix, iy, b, SPEED, { engine }, step, dirToWorld, angDiff, clamp);
      expect(a.h).toBe(b.h);
      expect(a.v).toBe(b.v);
      expect(a.x).toBe(b.x);
      expect(a.y).toBe(b.y);
    }
  });
});

describe('steerBoatRelative (relative candidate)', () => {
  it('spins the hull at the turn rate while a turn key is held', () => {
    const boat: Boat = { x: 0, y: 0, h: 1, v: 0 };
    steerBoatRelative(boat, 1, 0, false, maxV, dt);
    expect(boat.h).toBeCloseTo(1 + (2.6 + 1.2) * dt);
    steerBoatRelative(boat, -1, 0, false, maxV, dt);
    expect(boat.h).toBeCloseTo(1);
  });

  it('runs up to top speed on the throttle and holds its heading', () => {
    const boat: Boat = { x: 0, y: 0, h: 0.3, v: 0 };
    for (let i = 0; i < 600; i++) steerBoatRelative(boat, 0, 1, false, maxV, dt);
    expect(boat.v).toBeCloseTo(maxV, 0);
    expect(boat.h).toBe(0.3);
  });

  it('brakes harder than it coasts', () => {
    const coasting: Boat = { x: 0, y: 0, h: 0, v: maxV };
    const braking: Boat = { x: 0, y: 0, h: 0, v: maxV };
    for (let i = 0; i < 30; i++) {
      steerBoatRelative(coasting, 0, 0, false, maxV, dt);
      steerBoatRelative(braking, 0, 0, true, maxV, dt);
    }
    expect(braking.v).toBeLessThan(coasting.v);
    expect(braking.v).toBeGreaterThanOrEqual(0);
  });
});
