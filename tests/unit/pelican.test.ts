import { describe, expect, it } from 'vitest';
import {
  CIRCLE_T,
  FISH_HIT,
  LOCK_T,
  PELICAN_HP,
  Pelican,
  RISE_T,
  SCOOP_HIT,
  SCOOP_R,
  SPIT_T,
  WADDLE_T,
  WAKE_T,
} from '../../src/entities/pelican';
import { DOOR10, ISLE10, regionAt, TOWER10 } from '../../src/world/isle10';
import { ROOF10, ROOMS, TOWERS } from '../../src/world/tower';
import { baseWorld } from './helpers/world';

const R = ROOMS[ROOF10] as (typeof ROOMS)[number];
type At = { x: number; y: number } | null;
const step = (p: Pelican, at: At, dt = 1 / 60) =>
  p.update(dt, baseWorld({ figure: at ? { ...at, vx: 0, vy: 0 } : null }));
const run = (p: Pelican, s: number, at: () => At) => {
  for (let t = 0; t < s; t += 1 / 60) step(p, at());
};
const until = (p: Pelican, state: string, s: number, at: () => At) => {
  for (let t = 0; t < s && p.state !== state; t += 1 / 60) step(p, at());
};
/** The figure up on the roof, at the front where it comes up. */
const FRONT = { x: R.x + 40, y: R.y + 40 };

describe("island 10's tower and its giant pelican", () => {
  it('the tower stands in the meadow, and its only room is the roof', () => {
    expect(regionAt(TOWER10.x, TOWER10.y)).toBe('prairie');
    expect(Math.hypot(TOWER10.x - ISLE10.x, TOWER10.y - ISLE10.y)).toBeLessThan(110);
    expect(Math.hypot(DOOR10.x - TOWER10.x, DOOR10.y - TOWER10.y)).toBeGreaterThan(TOWER10.r);
    expect(R.roof).toBe(true);
    expect(R.kind).toBe('perch');
    expect(TOWERS.find((t) => t.roof === ROOF10)).toEqual({ first: ROOF10, roof: ROOF10 });
  });

  it('sits on its nest until the figure comes up, stands flapping a moment, then comes for it', () => {
    const p = new Pelican(R);
    let woke = 0;
    p.onWake = () => woke++;
    run(p, 2, () => null);
    expect(p.state).toBe('wait');
    step(p, FRONT);
    expect(p.state).toBe('wake');
    expect(woke).toBe(1);
    run(p, WAKE_T, () => FRONT);
    expect(p.state).toBe('waddle');
  });

  it('spits a fan of three fish, a heart each for one that hits', () => {
    const p = new Pelican(R);
    let hurt = 0;
    p.onHit = (n, by) => {
      if (by === 'fish') hurt += n;
    };
    until(p, 'spit', WAKE_T + WADDLE_T + 1, () => FRONT);
    run(p, SPIT_T + 0.05, () => FRONT);
    expect(p.fish.length + hurt).toBeGreaterThanOrEqual(1);
    run(p, 3, () => FRONT);
    expect(hurt).toBeGreaterThanOrEqual(FISH_HIT);
    expect(p.fish).toHaveLength(0);
  });

  it('flies up, its ring follows the figure, stops, and the dive takes three hearts from a figure still in it', () => {
    const p = new Pelican(R);
    let scooped = 0;
    let locks = 0;
    p.onHit = (n, by) => {
      if (by === 'scoop') scooped += n;
    };
    p.onLock = () => locks++;
    until(p, 'rise', 10, () => FRONT);
    run(p, RISE_T + 0.05, () => FRONT);
    expect(p.state).toBe('circle');
    expect(p.low).toBe(false);
    expect(p.hit(5)).toBe(false);
    // The ring follows the figure as it moves...
    const moved = { x: FRONT.x - 30, y: FRONT.y };
    run(p, CIRCLE_T - LOCK_T - 0.1, () => moved);
    expect(Math.hypot(p.ringX - moved.x, p.ringY - moved.y)).toBeLessThan(8);
    // ...then stops, and the dive comes down there.
    until(p, 'stuck', 3, () => moved);
    expect(locks).toBe(1);
    expect(scooped).toBe(SCOOP_HIT);
    expect(p.low).toBe(true);
  });

  it('misses a figure that steps out of the ring once it has stopped following', () => {
    const p = new Pelican(R);
    let scooped = 0;
    p.onHit = (n, by) => {
      if (by === 'scoop') scooped += n;
    };
    until(p, 'circle', 10, () => FRONT);
    run(p, CIRCLE_T - LOCK_T + 0.05, () => FRONT);
    const out = { x: p.ringX + SCOOP_R + 30, y: p.ringY + 10 };
    until(p, 'stuck', 3, () => out);
    expect(scooped).toBe(0);
  });

  it('fifteen hits on the ground beat it; it is back on its nest, whole, the next climb', () => {
    const p = new Pelican(R);
    let beaten = 0;
    p.onBeaten = () => beaten++;
    until(p, 'waddle', 4, () => FRONT);
    for (let i = 0; i < PELICAN_HP - 1; i++) expect(p.hit(1)).toBe(true);
    expect(beaten).toBe(0);
    p.hit(1);
    expect(p.state).toBe('fall');
    expect(beaten).toBe(1);
    run(p, 2, () => FRONT);
    expect(p.state).toBe('gone');
    p.reset();
    expect(p.state).toBe('wait');
    expect(p.hp).toBe(PELICAN_HP);
    expect(Math.hypot(p.x - p.nest.x, p.y - p.nest.y)).toBeLessThan(1);
  });

  it('tar on its bill holds it still, and a spit it was winding up comes to nothing', () => {
    const p = new Pelican(R);
    until(p, 'spit', 10, () => FRONT);
    p.stun(2);
    expect(p.state).toBe('waddle');
    const x = p.x;
    run(p, 1.5, () => FRONT);
    expect(p.x).toBe(x);
    expect(p.fish).toHaveLength(0);
  });
});
