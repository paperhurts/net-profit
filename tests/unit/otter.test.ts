import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import {
  CALM_T,
  CLIMB_T,
  drawOtterBack,
  drawOtterSit,
  drawOtterSwim,
  FEED_REACH,
  nearOtterHome,
  OTTER_FEEDS,
  OTTER_HOME,
  Otter,
} from '../../src/entities/otter';
import { walkable } from '../../src/entities/walker';
import { IR, IX, IY, pastBuoys } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;

function run(o: Otter, w: World, s: number): void {
  for (let i = 0; i < s / DT; i++) o.update(DT, w);
}

describe('the otter', () => {
  it('lives wild in the water just off the home dock, inside the buoys', () => {
    expect(walkable(OTTER_HOME.x, OTTER_HOME.y, 99)).toBe(false);
    expect(pastBuoys(OTTER_HOME.x, OTTER_HOME.y)).toBe(false);
    expect(Math.hypot(OTTER_HOME.x - IX, OTTER_HOME.y - IY)).toBeGreaterThan(IR + 100);
    const o = new Otter();
    expect(o.state).toBe('wild');
    run(o, baseWorld(), 5);
    expect(nearOtterHome(o.x, o.y, 30)).toBe(true);
    expect(nearOtterHome(OTTER_HOME.x + FEED_REACH + 1, OTTER_HOME.y)).toBe(false);
  });

  it('is yours on the third fish, and not before', () => {
    const o = new Otter();
    for (let i = 1; i < OTTER_FEEDS; i++) {
      expect(o.feed()).toBe(false);
      expect(o.free).toBe(false);
    }
    expect(o.feed()).toBe(true);
    expect(o.free).toBe(true);
    expect(o.state).toBe('swim');
    expect(o.feed()).toBe(false);
    // From a save: clamped to what makes sense.
    o.set(99);
    expect(o.fed).toBe(OTTER_FEEDS);
    o.set(-2);
    expect(o.fed).toBe(0);
    expect(o.state).toBe('wild');
  });

  it('swims along beside the boat off the bow, keeping up at speed', () => {
    const o = new Otter();
    o.set(OTTER_FEEDS);
    const w = baseWorld({ boat: { x: IX + 900, y: IY, h: 0, v: 0 }, hullScale: 1 });
    run(o, w, 0.5);
    // Ahead of the boat and off to one side.
    expect(o.x).toBeGreaterThan(w.boat.x + 10);
    expect(Math.abs(o.y - w.boat.y)).toBeGreaterThan(8);
    for (let i = 0; i < 4 / DT; i++) {
      w.boat.v = 300;
      w.boat.x += 300 * DT;
      o.update(DT, w);
    }
    expect(Math.hypot(o.x - w.boat.x, o.y - w.boat.y)).toBeLessThan(60);
    expect(o.state).toBe('swim');
  });

  it('climbs aboard when the water is not safe, says why, and slips back in once it has been safe a while', () => {
    const o = new Otter();
    o.set(OTTER_FEEDS);
    const w = baseWorld();
    const why: string[] = [];
    o.onClimb = (r) => why.push(r);
    run(o, w, 0.5);
    o.reason = 'danger';
    run(o, w, CLIMB_T + 0.1);
    expect(o.state).toBe('aboard');
    expect(o.aboard).toBe(true);
    expect(why).toEqual(['danger']);
    // Safe again, but not for long enough yet.
    o.reason = null;
    run(o, w, CALM_T - 0.5);
    expect(o.state).toBe('aboard');
    run(o, w, 1 + CLIMB_T);
    expect(o.state).toBe('swim');
    // Out in the deep, up he goes again.
    o.reason = 'deep';
    run(o, w, CLIMB_T + 0.1);
    expect(o.state).toBe('aboard');
    expect(why).toEqual(['danger', 'deep']);
  });

  it('never leaves home while wild, whatever the water', () => {
    const o = new Otter();
    o.reason = 'danger';
    run(o, baseWorld(), 2);
    expect(o.state).toBe('wild');
    expect(nearOtterHome(o.x, o.y, 30)).toBe(true);
  });

  it('draws on his back, swimming, ducking under, and on the deck, with hearts when petted', () => {
    const f = fakeView();
    const o = new Otter();
    o.drawWater(f.v, 0);
    const back = f.calls.ellipse ?? 0;
    expect(back).toBeGreaterThan(5);
    o.set(OTTER_FEEDS);
    o.pet();
    o.drawWater(f.v, 200);
    expect(f.calls.ellipse ?? 0).toBeGreaterThan(back);
    // Not drawn aboard while he is in the water.
    const fills = f.calls.fill ?? 0;
    o.drawAboard(f.v, { x: 0, y: 0, h: 0 }, 1);
    expect(f.calls.fill ?? 0).toBe(fills);
    o.reason = 'danger';
    run(o, baseWorld(), CLIMB_T + 0.1);
    o.drawAboard(f.v, { x: 0, y: 0, h: 0 }, 1);
    expect(f.calls.fill ?? 0).toBeGreaterThan(fills + 5);
    expect(f.calls.fillText ?? 0).toBeGreaterThan(0);
    const seat = o.seat({ x: 0, y: 0, h: 0 }, 1);
    expect(seat.z).toBeGreaterThan(0);
    drawOtterBack(f.v, 0, 0, 0, 0);
    drawOtterSwim(f.v, 0, 0, Math.PI, 0);
    drawOtterSit(f.v, 0, 0, 0, 0, false);
    // Between breaths, swimming fast, he is sometimes under.
    o.state = 'swim';
    let under = 0;
    for (let i = 0; i < 300; i++) {
      o.ph = i * 0.05;
      if (o.under(200)) under++;
    }
    expect(under).toBeGreaterThan(0);
    expect(under).toBeLessThan(300);
    expect(o.under(0)).toBe(false);
  });
});
