import { describe, expect, it } from 'vitest';
import { GEAR, GEAR_IDS, noGear } from '../../src/data/gear';
import { RANGE } from '../../src/data/tuning';
import {
  GROUP_R,
  LION_R,
  Lionfishes,
  lionAt,
  lionGroups,
  SCATTER,
} from '../../src/entities/lionfish';
import { IX, IY } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;

describe('lionfish', () => {
  it("live in small groups round the outer sea, within a cutter's reach", () => {
    const groups = lionGroups();
    expect(groups.length).toBeGreaterThanOrEqual(4);
    for (const g of groups) {
      expect(Math.hypot(g.x - IX, g.y - IY)).toBeCloseTo(LION_R, 0);
      expect(LION_R + GROUP_R * 4).toBeLessThan(RANGE[2]);
      for (const f of g.fish) {
        const [x, y] = lionAt(g, f);
        expect(Math.hypot(x - g.x, y - g.y)).toBeLessThan(GROUP_R + 10);
      }
    }
  });

  it('are not in the sea, and cut nothing, until the game says they are', () => {
    const l = new Lionfishes();
    const g = l.groups[0];
    if (!g) throw new Error('group');
    let cuts = 0;
    l.onCut = () => cuts++;
    const w = baseWorld({ net: { x: g.x, y: g.y, speed: 120, torn: 0 }, netWidth: 88 });
    for (let i = 0; i < 60; i++) l.update(DT, w);
    expect(cuts).toBe(0);
    l.here = true;
    l.update(DT, w);
    expect(cuts).toBe(1);
  });

  it('cut a net towed through them, once, and scatter a while before they come back', () => {
    const l = new Lionfishes();
    l.here = true;
    const g = l.groups[1];
    if (!g) throw new Error('group');
    let cuts = 0;
    l.onCut = () => cuts++;
    const w = baseWorld({ net: { x: g.x - 200, y: g.y, speed: 120, torn: 0 }, netWidth: 68 });
    for (let i = 0; i < 4 / DT; i++) {
      w.net.x += 120 * DT;
      l.update(DT, w);
      if (cuts) w.net.torn = 1e9;
    }
    expect(cuts).toBe(1);
    expect(g.scatter).toBeGreaterThan(0);
    // Mended and sailing straight back through while they are scattered: nothing; once they are back, cut again.
    w.net.torn = 0;
    w.net.x = g.x;
    w.net.y = g.y;
    for (let i = 0; i < (SCATTER + 1) / DT && cuts < 2; i++) l.update(DT, w);
    expect(cuts).toBe(2);
  });

  it('leave a still net, a torn one and one far off alone', () => {
    const l = new Lionfishes();
    l.here = true;
    const g = l.groups[2];
    if (!g) throw new Error('group');
    let cuts = 0;
    l.onCut = () => cuts++;
    const w = baseWorld({ net: { x: g.x, y: g.y, speed: 10, torn: 0 }, netWidth: 88 });
    for (let i = 0; i < 60; i++) l.update(DT, w);
    w.net.speed = 120;
    w.net.torn = 1e9;
    for (let i = 0; i < 60; i++) l.update(DT, w);
    w.net.torn = 0;
    w.net.x = g.x + 400;
    for (let i = 0; i < 60; i++) l.update(DT, w);
    expect(cuts).toBe(0);
  });

  it('are sighted once, when the boat comes near', () => {
    const l = new Lionfishes();
    l.here = true;
    const g = l.groups[3];
    if (!g) throw new Error('group');
    let seen = 0;
    l.onSight = () => seen++;
    const w = baseWorld({ boat: { x: g.x + 300, y: g.y, h: 0, v: 0 } });
    for (let i = 0; i < 60; i++) l.update(DT, w);
    expect(seen).toBe(1);
  });

  it('draw underwater only, and only while here', () => {
    const l = new Lionfishes();
    const { v, calls } = fakeView();
    l.draw(v, 'underwater');
    expect(calls.fill ?? 0).toBe(0);
    l.here = true;
    l.draw(v, 'surface');
    expect(calls.fill ?? 0).toBe(0);
    l.draw(v, 'underwater');
    expect(calls.fill).toBeGreaterThan(0);
  });

  it("are answered by the shipwright's mending kit", () => {
    expect(GEAR_IDS).toContain('kit');
    expect(noGear().kit).toBe(false);
    expect(GEAR.kit.cost).toBeGreaterThan(0);
  });
});
