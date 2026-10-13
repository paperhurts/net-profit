import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import {
  CATCH_UP,
  CRAFTS,
  DEFAULT_CREW,
  Flotilla,
  RIDERS,
  type Rider,
  STATIONS,
} from '../../src/entities/flotilla';
import { drawCraft } from '../../src/render/flotilla';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const all = (f: Flotilla) => {
  f.free = () => true;
  return f;
};

describe('the flotilla', () => {
  it('starts with a rider on each craft, one craft each, and is on the water only for riders who are yours', () => {
    const f = new Flotilla();
    expect(new Set(Object.values(DEFAULT_CREW)).size).toBe(RIDERS.length);
    for (const r of RIDERS) expect(f.craftOf(r)).not.toBeNull();
    f.update(DT, baseWorld({ figure: null }));
    expect(f.crafts.filter((c) => c.placed)).toHaveLength(0);
    f.free = (r: Rider) => r === 'tarling' || r === 'bones';
    f.update(DT, baseWorld({ figure: null }));
    expect(f.crafts.filter((c) => c.placed).map((c) => c.kind)).toEqual(['windsurf', 'banana']);
  });

  it('keeps each rider to one craft when the kid moves them about', () => {
    const f = new Flotilla();
    f.assign('airboat', 'tarling');
    expect(f.crew.airboat).toBe('tarling');
    expect(f.crew.banana).toBeNull();
    expect(f.craftOf('tarling')?.kind).toBe('airboat');
    expect(f.craftOf('warrior')).toBeNull();
    f.assign('banana', 'warrior');
    expect(Object.values(f.crew).filter((r) => r === 'warrior')).toHaveLength(1);
    f.assign('airboat', null);
    expect(f.craftOf('tarling')).toBeNull();
  });

  it('keeps its stations ahead of the boat and out to the sides, never behind it where the net is', () => {
    for (const s of STATIONS) expect(s.along).toBeGreaterThanOrEqual(0);
    for (const h of [0, 1, 2.5, -2]) {
      const b = { x: 0, y: 0, h };
      for (let i = 0; i < STATIONS.length; i++) {
        const p = Flotilla.station(i, b, 1);
        expect(p.x * Math.cos(h) + p.y * Math.sin(h)).toBeGreaterThanOrEqual(-1e-9);
      }
    }
  });

  it('keeps up with the boat at full speed, each near its own station', () => {
    const f = all(new Flotilla());
    const w: World = baseWorld({ figure: null, hullScale: 1.6 });
    w.boat.v = 350;
    for (let i = 0; i < 8 / DT; i++) {
      w.boat.h += 0.15 * DT;
      w.boat.x += Math.cos(w.boat.h) * w.boat.v * DT;
      w.boat.y += Math.sin(w.boat.h) * w.boat.v * DT;
      f.update(DT, w);
    }
    f.crafts.forEach((c, i) => {
      const st = Flotilla.station(i, w.boat, w.hullScale);
      expect(c.placed).toBe(true);
      expect(Math.hypot(c.x - st.x, c.y - st.y)).toBeLessThan(60);
    });
  });

  it('holds where it is with the figure ashore, tied up, or with its station up on the land', () => {
    for (const over of [{ figure: { x: 0, y: 0, vx: 0, vy: 0 } }, { docked: true }]) {
      const f = all(new Flotilla());
      const w: World = baseWorld({ figure: null });
      f.update(DT, w);
      const at = f.crafts.map((c) => [c.x, c.y]);
      // The boat moves off a little; the craft stay.
      w.boat.x += 300;
      Object.assign(w, over);
      for (let i = 0; i < 2 / DT; i++) f.update(DT, w);
      f.crafts.forEach((c, i) => {
        expect(Math.hypot(c.x - (at[i]?.[0] ?? 0), c.y - (at[i]?.[1] ?? 0))).toBeLessThan(2);
      });
    }
    const f = all(new Flotilla());
    f.onLand = () => true;
    const w: World = baseWorld({ figure: null });
    f.update(DT, w);
    const x0 = f.crafts[0]?.x ?? 0;
    w.boat.x += 300;
    for (let i = 0; i < 2 / DT; i++) f.update(DT, w);
    expect(Math.abs((f.crafts[0]?.x ?? 0) - x0)).toBeLessThan(2);
    // But far off (spat out at home), they are over at once.
    w.boat.x += CATCH_UP + 500;
    f.onLand = () => false;
    f.update(DT, w);
    const st = Flotilla.station(0, w.boat, w.hullScale);
    expect(Math.hypot((f.crafts[0]?.x ?? 0) - st.x, (f.crafts[0]?.y ?? 0) - st.y)).toBeLessThan(1);
  });

  it('draws every craft, with its rider at the seat, and under way with a wake', () => {
    const f = all(new Flotilla());
    f.update(DT, baseWorld({ figure: null }));
    expect(CRAFTS).toHaveLength(4);
    for (const c of f.crafts) {
      const v = fakeView();
      const seats: number[] = [];
      c.v = 200;
      drawCraft(v.v, c, (_x, _y, z) => seats.push(z));
      expect(seats, c.kind).toHaveLength(1);
      // Its hull (solid, or the banana's run of rings), and lines: a sail, a mast, a fan, a wake.
      expect((v.calls.extrude ?? 0) + (v.calls.isoEllipse ?? 0), c.kind).toBeGreaterThan(0);
      expect(v.calls.stroke ?? 0, c.kind).toBeGreaterThan(1);
      drawCraft(v.v, c, null);
      expect(seats).toHaveLength(1);
    }
  });
});
