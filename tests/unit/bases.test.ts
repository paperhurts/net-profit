import { describe, expect, it } from 'vitest';
import { walkable } from '../../src/entities/walker';
import { baseHutLight, drawBaseHut, drawBaseShed } from '../../src/render/base';
import {
  BASES,
  baseAtDock,
  hasSeine,
  homePort,
  nextStage,
  noBases,
  parseBases,
  polePoint,
  SPIT_OFF,
} from '../../src/world/bases';
import { DOCK, pastBuoys } from '../../src/world/island';
import { CAMP, DOCK2, ISLE2, LANDING2, PALMS2, POST, TOWER } from '../../src/world/isle2';
import { fakeView } from './helpers/view';

const isle2 = BASES.find((b) => b.id === 'isle2');
if (!isle2) throw new Error('no base on island 2');

describe('bases', () => {
  it('reads nothing built from an old save, a broken one, or one from the future', () => {
    expect(parseBases(undefined)).toEqual({ isle2: 0 });
    expect(parseBases('hut')).toEqual({ isle2: 0 });
    expect(parseBases({ isle2: -2, nowhere: 4 })).toEqual({ isle2: 0 });
    expect(parseBases({ isle2: Number.NaN })).toEqual({ isle2: 0 });
    expect(parseBases({ isle2: 1.7 })).toEqual({ isle2: 1 });
    expect(parseBases({ isle2: 99 })).toEqual({ isle2: isle2.stages.length });
  });

  it('builds island 2 a stage at a time, the hut first and then the gear shed, which brings the seine', () => {
    const b = noBases();
    expect(nextStage(isle2, b)?.name).toBe('hut');
    expect(hasSeine(b)).toBe(false);
    b.isle2 = 1;
    expect(nextStage(isle2, b)?.name).toBe('gear shed');
    expect(hasSeine(b)).toBe(false);
    b.isle2 = 2;
    expect(hasSeine(b)).toBe(true);
    b.isle2 = isle2.stages.length;
    expect(nextStage(isle2, b)).toBeNull();
    for (const s of isle2.stages) {
      expect(s.wood).toBeGreaterThan(0);
      expect(s.coins).toBeGreaterThan(0);
    }
  });

  it("shows its card only in its own dock's ring", () => {
    expect(baseAtDock(DOCK2.x, DOCK2.y)).toBe(isle2);
    expect(baseAtDock(DOCK2.x + DOCK2.r + 5, DOCK2.y)).toBeNull();
    expect(baseAtDock(DOCK.x, DOCK.y)).toBeNull();
  });

  it('brings the boat back at the nearest built base, or home when home is nearer or none is built', () => {
    const out = { x: ISLE2.x + 600, y: ISLE2.y - 600 };
    expect(homePort(noBases(), out.x, out.y, DOCK)).toBeNull();
    const built = { ...noBases(), isle2: 1 };
    expect(homePort(built, out.x, out.y, DOCK)).toBe(isle2);
    expect(homePort(built, DOCK.x + 900, DOCK.y + 900, DOCK)).toBeNull();
    // Halfway, a step nearer either one picks it.
    const mx = (DOCK.x + DOCK2.x) / 2;
    const my = (DOCK.y + DOCK2.y) / 2;
    const ux = (DOCK2.x - DOCK.x) / Math.hypot(DOCK2.x - DOCK.x, DOCK2.y - DOCK.y);
    const uy = (DOCK2.y - DOCK.y) / Math.hypot(DOCK2.x - DOCK.x, DOCK2.y - DOCK.y);
    expect(homePort(built, mx + ux * 10, my + uy * 10, DOCK)).toBe(isle2);
    expect(homePort(built, mx - ux * 10, my - uy * 10, DOCK)).toBeNull();
  });

  it("brings it back up in the water off island 2's dock, just outside its ring, facing in", () => {
    const { x, y, h } = isle2.spit;
    const d = Math.hypot(x - DOCK2.x, y - DOCK2.y);
    expect(d).toBeCloseTo(SPIT_OFF, 6);
    expect(d).toBeGreaterThan(DOCK2.r + 20);
    expect(baseAtDock(x, y)).toBeNull();
    expect(Math.hypot(x - ISLE2.x, y - ISLE2.y)).toBeGreaterThan(ISLE2.r + 200);
    expect(pastBuoys(x, y)).toBe(true);
    const toDock = Math.atan2(DOCK2.y - y, DOCK2.x - x);
    expect(Math.cos(h - toDock)).toBeGreaterThan(0.999);
  });

  it("puts island 2's hut on its sand, clear of what stands there and of the way up from the landing", () => {
    const { x, y, half } = isle2.hut;
    expect(Math.hypot(x - ISLE2.x, y - ISLE2.y) + half * Math.SQRT2).toBeLessThan(ISLE2.r - 30);
    expect(Math.hypot(x - TOWER.x, y - TOWER.y)).toBeGreaterThan(TOWER.r + half * 2 + 30);
    expect(Math.hypot(x - LANDING2.x, y - LANDING2.y)).toBeGreaterThan(half * 2 + 40);
    expect(Math.hypot(x - CAMP.x, y - CAMP.y)).toBeGreaterThan(200);
    expect(x + half < POST.x0 || y + half < POST.y0).toBe(true);
    for (const p of PALMS2) expect(Math.hypot(x - p[0], y - p[1])).toBeGreaterThan(half * 2 + 10);
    // It stands in the way, and so does its pole; the sand round it does not.
    expect(walkable(x, y, 0)).toBe(false);
    const p = polePoint(isle2);
    expect(walkable(p.x, p.y, 0)).toBe(false);
    expect(walkable(x, y + half + 10, 0)).toBe(true);
    expect(walkable(x - half - 10, y, 0)).toBe(true);
  });

  it("puts island 2's gear shed between the hut and the tower, clear of both and of the way round", () => {
    const sh = isle2.shed;
    const { hut } = isle2;
    expect(Math.hypot(sh.x - ISLE2.x, sh.y - ISLE2.y) + sh.half * Math.SQRT2).toBeLessThan(
      ISLE2.r - 30,
    );
    expect(Math.hypot(sh.x - TOWER.x, sh.y - TOWER.y)).toBeGreaterThan(TOWER.r + sh.half * 2 + 20);
    expect(Math.hypot(sh.x - hut.x, sh.y - hut.y)).toBeGreaterThan(hut.half + sh.half + 20);
    for (const p of PALMS2)
      expect(Math.hypot(sh.x - p[0], sh.y - p[1])).toBeGreaterThan(sh.half * 2 + 10);
    expect(walkable(sh.x, sh.y, 0)).toBe(false);
    // The sand between it and the hut, and between it and the tower, can still be walked.
    expect(walkable((sh.x + hut.x) / 2 + 4, (sh.y + hut.y) / 2 - 4, 0)).toBe(true);
    expect(walkable((sh.x + TOWER.x) / 2, (sh.y + TOWER.y) / 2, 0)).toBe(true);
  });

  it("draws the gear shed's plot until it is built, then the shed", () => {
    const plot = fakeView();
    drawBaseShed(plot.v, isle2, false, '#2C4A7C');
    expect(plot.calls.box).toBe(1); // the sign's board
    const shed = fakeView();
    drawBaseShed(shed.v, isle2, true, '#2C4A7C');
    expect(shed.calls.box).toBe(2); // the walls and the roof
  });

  it('draws its plot until it is built, then the hut, its flag and a light at night', () => {
    const plot = fakeView();
    drawBaseHut(plot.v, isle2, false, '#2C4A7C', null);
    expect(plot.calls.box).toBe(1); // the sign's board
    baseHutLight(plot.v, isle2, false);
    expect(plot.calls.light).toBeUndefined();
    const hut = fakeView();
    let flown = 0;
    drawBaseHut(hut.v, isle2, true, '#2C4A7C', () => {
      flown++;
    });
    expect(hut.calls.box).toBe(1); // the walls
    expect(flown).toBe(1);
    baseHutLight(hut.v, isle2, true);
    expect(hut.calls.light).toBe(1);
  });
});
