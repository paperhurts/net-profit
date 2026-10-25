import { describe, expect, it } from 'vitest';
import {
  FIRST,
  GAP,
  JUMP,
  LEGGY_MAX,
  LEGS_AFTER,
  LeggyMuffins,
  sprouting,
} from '../../src/entities/leggy';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const onFoot = (x: number, y: number) => baseWorld({ figure: { x, y, vx: 0, vy: 0 } });

describe('muffins growing legs', () => {
  it('a muffin grows legs once it has been in the box a whole game day, oldest first', () => {
    expect(LEGS_AFTER).toBe(1);
    expect(sprouting([], 5)).toBe(0);
    expect(sprouting([4.2, 4.5], 5)).toBe(0);
    expect(sprouting([3.9, 4.0, 4.5], 5)).toBe(2);
    expect(sprouting([3, 3.5, 4, 4.5], 5)).toBe(3);
  });

  it('never more than an unholy half dozen: the seventh sends the oldest off into the sea', () => {
    const g = new LeggyMuffins();
    for (let i = 0; i < LEGGY_MAX; i++) expect(g.sprout(0, 0)).toBe(false);
    expect(g.count).toBe(6);
    expect(g.sprout(0, 0)).toBe(true);
    expect(g.count).toBe(6);
  });
});

describe('leggy muffins on foot', () => {
  it('tumble out round the figure as it steps off, and ride in the crate again aboard', () => {
    const g = new LeggyMuffins();
    g.count = 4;
    g.update(DT, baseWorld({ figure: null }));
    expect(g.list).toHaveLength(0);
    g.update(DT, onFoot(100, 100));
    expect(g.list).toHaveLength(4);
    for (const m of g.list) expect(Math.hypot(m.x - 100, m.y - 100)).toBeLessThan(15);
    g.update(DT, baseWorld({ figure: null }));
    expect(g.list).toHaveLength(0);
  });

  it('trot after the figure in a line, each along the way it walked', () => {
    const g = new LeggyMuffins();
    g.count = 6;
    let x = 0;
    g.update(DT, onFoot(x, 0));
    // Walk east for three seconds, then north for two.
    for (let i = 0; i < 180; i++) {
      x += 85 * DT;
      g.update(DT, onFoot(x, 0));
    }
    let y = 0;
    for (let i = 0; i < 120; i++) {
      y -= 85 * DT;
      g.update(DT, onFoot(x, y));
    }
    const d = g.list.map((m) => Math.hypot(m.x - x, m.y - y));
    // The first just behind, each further back by about a gap, in order.
    expect(d[0]).toBeGreaterThan(FIRST - 8);
    // (Walking, they lag their place a little: they close on it, they are not nailed to it.)
    expect(d[0]).toBeLessThan(FIRST + 12);
    for (let i = 1; i < d.length; i++)
      expect((d[i] ?? 0) - (d[i - 1] ?? 0)).toBeGreaterThan(GAP * 0.6);
    // Along the path: the line is still on the way north, all on its line (x), not cutting the corner.
    for (const m of g.list) expect(Math.abs(m.x - x)).toBeLessThan(3);
  });

  it('through a door, they come with the figure at once', () => {
    const g = new LeggyMuffins();
    g.count = 3;
    g.update(DT, onFoot(0, 0));
    g.update(DT, onFoot(JUMP + 500, 0));
    for (const m of g.list) expect(Math.hypot(m.x - (JUMP + 500), m.y)).toBeLessThan(15);
  });

  it('a new one hops out where the figure is, and a poke makes one hop', () => {
    const g = new LeggyMuffins();
    g.update(DT, onFoot(50, 50));
    g.sprout(50, 50);
    expect(g.list).toHaveLength(1);
    g.update(1, onFoot(50, 50));
    expect(g.list[0]?.hop).toBe(0);
    expect(g.nearest(51, 50, 10)).toBe(0);
    expect(g.nearest(90, 50, 10)).toBe(-1);
    g.poke(0);
    expect(g.list[0]?.hop).toBe(1);
  });
});

describe('muffins waiting somewhere (the Garden Isle lawn)', () => {
  it('with a lead they waddle off to huddle there, and back along the ground once it clears, never popping', () => {
    const g = new LeggyMuffins();
    g.count = 3;
    g.update(DT, onFoot(0, 0));
    expect(g.list).toHaveLength(3);
    g.lead = { x: 200, y: 0 };
    const maxStep = (fig: [number, number], frames: number) => {
      let most = 0;
      for (let f = 0; f < frames; f++) {
        const before = g.list.map((m) => [m.x, m.y] as const);
        g.update(DT, onFoot(...fig));
        g.list.forEach((m, i) => {
          const [bx, by] = before[i] ?? [m.x, m.y];
          most = Math.max(most, Math.hypot(m.x - bx, m.y - by));
        });
      }
      return most;
    };
    // Well past JUMP away, still a waddle, frame by frame.
    expect(maxStep([0, 0], 300)).toBeLessThan(2);
    for (const m of g.list) expect(Math.hypot(m.x - 200, m.y)).toBeLessThan(20);
    // The lead clears: they walk back to the figure the same way.
    g.lead = null;
    expect(maxStep([0, 0], 300)).toBeLessThan(2.5);
    for (const m of g.list) expect(Math.hypot(m.x, m.y)).toBeLessThan(FIRST + 3 * GAP + JUMP / 2);
  });
});
