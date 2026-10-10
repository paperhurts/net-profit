import { describe, expect, it } from 'vitest';
import { GEAR, GEAR_IDS } from '../../src/data/gear';
import { type Boat, steerBoat, steerBoatRelative } from '../../src/entities/boat';
import { createDeepSchools, updateSchools } from '../../src/world/schools';
import {
  BALLAST_SPEED_K,
  BALLAST_TURN_K,
  BOIL,
  EVERY_MAX,
  EVERY_MIN,
  SPEED_K,
  STORM_MAX,
  Storm,
  stormHandling,
  TURN_K,
  WARN,
} from '../../src/world/storm';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Run a storm for a while; every event. */
function run(s: Storm, seconds: number, out = true, rnd = seeded(7)) {
  const evs: string[] = [];
  for (let i = 0; i < seconds * 10; i++) {
    const ev = s.update(0.1, out, rnd);
    if (ev) evs.push(ev);
  }
  return evs;
}

describe('storms', () => {
  it('come only out past the buoys: the wait for one runs down only there', () => {
    const s = new Storm(seeded(3));
    expect(s.t).toBeGreaterThanOrEqual(EVERY_MIN);
    expect(s.t).toBeLessThanOrEqual(EVERY_MAX);
    expect(run(s, EVERY_MAX + 10, false)).toEqual([]);
    expect(s.phase).toBe('calm');
    expect(run(s, EVERY_MAX + 1)[0]).toBe('warn');
  });

  it('warn, storm with lightning, boil, and go calm again', () => {
    const s = new Storm(seeded(5));
    s.bring();
    expect(s.update(0.1, false)).toBeNull();
    expect(s.update(0.1, true)).toBe('warn');
    expect(s.k).toBeLessThan(0.1);
    const evs = run(s, WARN + STORM_MAX + BOIL + 2);
    const phases = evs.filter((e) => e !== 'flash');
    expect(phases).toEqual(['storm', 'boil', 'calm']);
    expect(evs.filter((e) => e === 'flash').length).toBeGreaterThan(3);
    expect(s.phase).toBe('calm');
  });

  it('is strongest in the storm itself, building through the warning and gone soon into the boil', () => {
    const s = new Storm(seeded(5));
    s.bring();
    s.update(0.1, true);
    run(s, WARN / 2);
    expect(s.k).toBeGreaterThan(0.1);
    expect(s.k).toBeLessThan(0.5);
    run(s, WARN / 2 + 1);
    expect(s.phase).toBe('storm');
    expect(s.k).toBe(1);
    s.phase = 'boil';
    s.t = BOIL;
    expect(s.k).toBe(1);
    s.t = BOIL - 6;
    expect(s.k).toBe(0);
  });

  it('slows the boat and widens its turns, less with ballast, and not at all when calm', () => {
    expect(stormHandling(0, false)).toEqual({ speed: 1, turn: 1 });
    expect(stormHandling(1, false)).toEqual({ speed: SPEED_K, turn: TURN_K });
    expect(stormHandling(1, true)).toEqual({ speed: BALLAST_SPEED_K, turn: BALLAST_TURN_K });
    expect(BALLAST_SPEED_K).toBeGreaterThan(SPEED_K);
    expect(BALLAST_TURN_K).toBeGreaterThan(TURN_K);
    expect(GEAR_IDS).toContain('ballast');
    expect(GEAR.ballast.cost).toBeGreaterThan(0);
  });

  it('leaves the boat exactly as it was with no storm, and turns it slower in one', () => {
    const a: Boat = { x: 0, y: 0, h: 0, v: 200 };
    const b: Boat = { x: 0, y: 0, h: 0, v: 200 };
    const c: Boat = { x: 0, y: 0, h: 0, v: 200 };
    // A few frames into a turn, short of the heading asked for.
    for (let i = 0; i < 5; i++) {
      steerBoat(a, 0, 1, 300, 1 / 60);
      steerBoat(b, 0, 1, 300, 1 / 60, 1);
      steerBoat(c, 0, 1, 300, 1 / 60, TURN_K);
    }
    expect(b).toEqual(a);
    expect(Math.abs(c.h)).toBeLessThan(Math.abs(a.h));
    const d: Boat = { x: 0, y: 0, h: 0, v: 200 };
    const e: Boat = { x: 0, y: 0, h: 0, v: 200 };
    steerBoatRelative(d, 1, 1, false, 300, 0.5);
    steerBoatRelative(e, 1, 1, false, 300, 0.5, TURN_K);
    expect(e.h).toBeLessThan(d.h);
  });

  it('sends the schools that are sunk out of sight and out of the net', () => {
    const schools = createDeepSchools();
    const sc = schools[0];
    if (!sc) throw new Error('no deep school');
    let caught = 0;
    const sweep = {
      T: 100,
      dt: 1 / 60,
      dark: 0,
      net: { x: sc.cx, y: sc.cy },
      netWidth: 200,
      catching: true,
      zoom: 1,
      onScreen: () => true,
      hasRoom: () => true,
      sunk: () => true,
    };
    for (let i = 0; i < 60; i++) updateSchools(schools, sweep as never, () => caught++);
    expect(caught).toBe(0);
    expect(sc.vis).toBe(false);
  });
});
