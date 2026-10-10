import { describe, expect, it } from 'vitest';
import {
  CLOSE_R,
  CORK_GAP,
  KEEP_MIN,
  keepShare,
  LOOSE,
  SEINE_LEN,
  SEINE_MIN,
  Seine,
} from '../../src/fishing/seine';
import { drawSeine } from '../../src/render/seine';
import { fakeView } from './helpers/view';

/** Drive the stern round a circle from angle 0, a step at a time, until the seine says something. */
function circle(s: Seine, cx: number, cy: number, r: number, turns = 1.2, steps = 400) {
  for (let i = 1; i <= steps * turns; i++) {
    const a = (i / steps) * Math.PI * 2;
    const ev = s.follow(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    if (ev) return { ev, a };
  }
  return { ev: null, a: Math.PI * 2 * turns };
}

describe('the seine', () => {
  it('drops its buoy at the stern and pays out a cork every so often after it', () => {
    const s = new Seine();
    expect(s.out).toBe(false);
    expect(s.left).toBe(1);
    s.drop(100, 0);
    expect(s.out).toBe(true);
    expect(s.pts).toEqual([{ x: 100, y: 0 }]);
    for (let x = 101; x <= 200; x++) s.follow(x, 0);
    expect(s.pts.length).toBe(1 + Math.floor(100 / CORK_GAP));
    expect(s.paid).toBeGreaterThan(100 - CORK_GAP);
    expect(s.left).toBeLessThan(1);
  });

  it('closes when the stern comes back round to the buoy, and not before enough is out', () => {
    const s = new Seine();
    // Turning straight back to the buoy at once does not close it.
    s.drop(0, 0);
    expect(s.follow(20, 0)).toBeNull();
    expect(s.follow(5, 0)).toBeNull();
    expect(s.armed).toBe(false);
    // A loop round a point does.
    s.drop(150, 0);
    const { ev, a } = circle(s, 0, 0, 150);
    expect(ev).toBe('closed');
    expect(a).toBeGreaterThan(Math.PI * 2 - CLOSE_R / 150 - 0.05);
    expect(s.paid).toBeGreaterThan(SEINE_MIN);
    expect(s.armed).toBe(true);
  });

  it('runs out on a loop that wanders too far', () => {
    const s = new Seine();
    s.drop(0, 0);
    let ev = null;
    let x = 0;
    while (!ev && x < SEINE_LEN * 2) {
      x += 5;
      ev = s.follow(x, 0);
    }
    expect(ev).toBe('spent');
    expect(x).toBeGreaterThanOrEqual(SEINE_LEN);
    expect(x).toBeLessThan(SEINE_LEN + CORK_GAP + 5);
    // And so does a circle too wide to close inside its length.
    s.drop(400, 0);
    expect(circle(s, 0, 0, 400).ev).toBe('spent');
  });

  it('knows what is inside the loop, and its area', () => {
    const s = new Seine();
    s.drop(150, 0);
    circle(s, 0, 0, 150);
    expect(s.inside(0, 0)).toBe(true);
    expect(s.inside(100, 40)).toBe(true);
    expect(s.inside(200, 0)).toBe(false);
    expect(s.inside(0, -170)).toBe(false);
    expect(s.area()).toBeGreaterThan(Math.PI * 150 * 150 * 0.95);
    expect(s.area()).toBeLessThan(Math.PI * 150 * 150 * 1.01);
  });

  it('keeps every fish in a tight loop, fewer in a wide one, and never none', () => {
    const school = Math.PI * 100 * 100;
    expect(keepShare(school * 1.5, school)).toBe(1);
    expect(keepShare(school * LOOSE, school)).toBe(1);
    expect(keepShare(school * LOOSE * 2, school)).toBeCloseTo(0.5, 6);
    expect(keepShare(school * 100, school)).toBe(KEEP_MIN);
    expect(keepShare(0, school)).toBe(1);
  });

  it('stows empty', () => {
    const s = new Seine();
    s.drop(0, 0);
    s.follow(40, 0);
    s.stow();
    expect(s.out).toBe(false);
    expect(s.pts).toEqual([]);
    expect(s.follow(80, 0)).toBeNull();
  });

  it('draws nothing stowed; out, its rope, corks and buoy, and a ring once it will close', () => {
    const s = new Seine();
    const none = fakeView();
    drawSeine(none.v, s, 0, 0);
    expect(none.calls.stroke).toBeUndefined();
    s.drop(150, 0);
    circle(s, 0, 0, 150, 0.5);
    const out = fakeView();
    drawSeine(out.v, s, 0, 150);
    expect(out.calls.arc).toBeGreaterThan(5);
    expect(out.calls.isoEllipse).toBe(2);
    const early = new Seine();
    early.drop(0, 0);
    early.follow(40, 0);
    const v = fakeView();
    drawSeine(v.v, early, 40, 0);
    expect(v.calls.isoEllipse).toBe(1);
  });
});
