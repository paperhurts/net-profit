import { describe, expect, it } from 'vitest';
import { GEAR, GEAR_IDS } from '../../src/data/gear';
import { AIR_LOW, AIR_MAX, Diver, DRIFT, TANK_AIR, TOP } from '../../src/entities/diver';
import { darkAt, diveCamera, drawDive, VIEW_W, waterAt } from '../../src/render/dive';
import { pastBuoys, pastFar } from '../../src/world/island';
import { ISLE2 } from '../../src/world/isle2';
import { ISLE3 } from '../../src/world/isle3';
import { ISLE4 } from '../../src/world/isle4';
import { createDeepSchools } from '../../src/world/schools';
import {
  ENTRY,
  floorAt,
  inWater,
  keepInWater,
  SUNLIT,
  shoalAt,
  TD,
  TRENCH,
  TW,
  TWILIGHT,
  trenchPlants,
  trenchShoals,
  wallIn,
  zoneAt,
} from '../../src/world/trench';
import { fakeView } from './helpers/view';

/** Run the diver for a while with the stick held at (ix, iy); every event it reports. */
function run(d: Diver, seconds: number, ix = 0, iy = 0) {
  const evs: string[] = [];
  for (let i = 0; i < seconds * 60; i++) {
    const ev = d.update(1 / 60, ix, iy);
    if (ev) evs.push(ev);
    if (ev === 'surfaced') break;
  }
  return evs;
}

describe('the trench', () => {
  it('lies in the deep, on its quiet north side, clear of the islands and the mahi-mahi', () => {
    expect(pastBuoys(TRENCH.x, TRENCH.y)).toBe(true);
    expect(pastFar(TRENCH.x, TRENCH.y)).toBe(false);
    for (const p of [ISLE2, ISLE3, ISLE4])
      expect(Math.hypot(TRENCH.x - p.x, TRENCH.y - p.y)).toBeGreaterThan(1200);
    for (const s of createDeepSchools())
      expect(Math.hypot(TRENCH.x - s.ax, TRENCH.y - s.ay)).toBeGreaterThan(TRENCH.r + s.r + 600);
  });

  it('goes from sunlit to twilight to midnight, its walls closing in as it goes down to a floor', () => {
    expect(zoneAt(10)).toBe('sunlit');
    expect(zoneAt(SUNLIT + 1)).toBe('twilight');
    expect(zoneAt(TWILIGHT + 1)).toBe('midnight');
    expect(wallIn(TD - 50, -1)).toBeGreaterThan(wallIn(100, -1) + 120);
    expect(wallIn(TD - 50, 1)).toBeGreaterThan(wallIn(100, 1) + 120);
    // Open water all the way down the middle under the boat.
    for (let y = 20; y < TD - 80; y += 25) expect(inWater(ENTRY, y, 12)).toBe(true);
    expect(inWater(ENTRY, TD + 10)).toBe(false);
    expect(inWater(5, 600)).toBe(false);
    expect(inWater(TW - 5, 600)).toBe(false);
    expect(floorAt(ENTRY)).toBeGreaterThan(TD - 80);
    const p = { x: 2, y: TD + 50 };
    keepInWater(p, 10);
    expect(inWater(p.x, p.y, 9)).toBe(true);
  });

  it('grows kelp up top and a glowing garden below, on its walls and its floor, the same every dive', () => {
    const a = trenchPlants();
    expect(trenchPlants()).toEqual(a);
    expect(a.filter((p) => p.y < SUNLIT).every((p) => p.kind === 'kelp' && !p.glow)).toBe(true);
    const deep = a.filter((p) => p.y > TWILIGHT);
    expect(deep.length).toBeGreaterThan(15);
    expect(deep.every((p) => p.glow)).toBe(true);
    expect(a.some((p) => p.from === 'floor')).toBe(true);
    for (const p of a) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(TW);
    }
  });

  it('has silver fish in the sunlit water, jellies in the twilight and glowing things in the midnight, all in the water', () => {
    const shoals = trenchShoals();
    expect(shoals.find((s) => s.kind === 'silver')?.glow).toBe(false);
    expect(zoneAt(shoals.find((s) => s.kind === 'jelly')?.cy ?? 0)).toBe('twilight');
    for (const k of ['lantern', 'squid']) {
      const s = shoals.find((x) => x.kind === k);
      expect(s?.glow).toBe(true);
      expect(zoneAt(s?.cy ?? 0)).toBe('midnight');
    }
    for (const s of shoals)
      for (let t = 0; t < 200; t += 7) {
        const c = shoalAt(s, t);
        expect(inWater(c.x, c.y)).toBe(true);
      }
  });
});

describe('the diver', () => {
  it('drifts gently up when let go, and swims where the stick points', () => {
    const d = new Diver();
    d.y = 500;
    run(d, 1);
    expect(d.y).toBeLessThan(500);
    expect(d.vy).toBeCloseTo(-DRIFT, 0);
    const y = d.y;
    run(d, 2, 0, 1);
    expect(d.y).toBeGreaterThan(y + 100);
    run(d, 1, -1, 0);
    expect(d.face).toBe(-1);
    expect(d.deepest).toBeGreaterThan(y + 100);
  });

  it('never leaves the water', () => {
    const d = new Diver();
    run(d, 20, 1, 1);
    expect(inWater(d.x, d.y)).toBe(true);
    run(d, 8, -1, 0);
    expect(inWater(d.x, d.y)).toBe(true);
  });

  it('breathes from its tank while under, warns when low, and floats back up when it runs out', () => {
    const d = new Diver();
    d.y = 600;
    const evs = run(d, AIR_MAX * (1 - AIR_LOW) + 1, 0, 0.12);
    expect(evs).toContain('low');
    expect(d.air).toBeLessThan(AIR_MAX * AIR_LOW);
    const rest = run(d, AIR_MAX, 0, 1);
    expect(rest).toContain('out');
    expect(rest[rest.length - 1]).toBe('surfaced');
    expect(d.y).toBeLessThanOrEqual(TOP);
  });

  it('fills its tank at the top, and swimming up there ends the dive; so does the Surface button', () => {
    const d = new Diver();
    d.air = 10;
    run(d, 2);
    expect(d.air).toBeGreaterThan(30);
    expect(run(d, 2, 0, -1)).toContain('surfaced');
    const e = new Diver();
    e.y = 900;
    e.surface();
    expect(run(e, 20)).toEqual(['surfaced']);
  });

  it("goes longer on the shipwright's big air tank, and warns and fills by that tank", () => {
    expect(GEAR_IDS).toContain('tank');
    expect(GEAR.tank.cost).toBeGreaterThan(0);
    expect(TANK_AIR).toBeGreaterThan(AIR_MAX * 1.4);
    const small = new Diver();
    const big = new Diver();
    big.reset(TANK_AIR);
    expect(big.air).toBe(TANK_AIR);
    for (const d of [small, big]) d.y = 600;
    // Past the small tank's last breath, the big tank still has air and has not warned.
    const a = run(small, AIR_MAX + 1, 0, 0.12);
    const b = run(big, AIR_MAX + 1, 0, 0.12);
    expect(a).toContain('out');
    expect(b).not.toContain('out');
    expect(b).not.toContain('low');
    expect(big.air).toBeGreaterThan(TANK_AIR - AIR_MAX - 2);
    // A plain reset is the scuba gear's own tank again.
    big.reset();
    expect(big.airMax).toBe(AIR_MAX);
  });
});

describe('drawing the dive', () => {
  it('gets darker the deeper it goes', () => {
    const lum = (c: string) => {
      const m = c.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
      return (m[0] ?? 0) + (m[1] ?? 0) + (m[2] ?? 0);
    };
    expect(lum(waterAt(SUNLIT))).toBeLessThan(lum(waterAt(10)));
    expect(lum(waterAt(TD))).toBeLessThan(lum(waterAt(TWILIGHT)));
    expect(darkAt(20)).toBe(0);
    expect(darkAt(TD)).toBeGreaterThan(0.6);
  });

  it('keeps the camera inside the trench and shows a little sky at the top', () => {
    const top = diveCamera({ x: ENTRY, y: 20 }, 390, 780);
    expect(top.s).toBeCloseTo(390 / VIEW_W, 6);
    const hh = 780 / 2 / top.s;
    expect(top.y - hh).toBeLessThan(0);
    expect(top.y - hh).toBeGreaterThan(-hh * 0.6);
    const bottom = diveCamera({ x: 0, y: TD }, 390, 780);
    expect(bottom.y + 780 / 2 / bottom.s).toBeLessThanOrEqual(TD + 41);
    expect(bottom.x - 390 / 2 / bottom.s).toBeGreaterThanOrEqual(0);
  });

  it('draws at the top and at the bottom without a fault', () => {
    for (const y of [20, 600, 1400]) {
      const v = fakeView();
      const d = new Diver();
      d.y = y;
      drawDive(v.v.ctx, 390, 780, 3, {
        diver: d,
        plants: trenchPlants(),
        shoals: trenchShoals(),
        hull: '#E4572E',
        trim: '#FFF6E5',
        bubbles: [{ x: ENTRY, y: y - 20, r: 2 }],
      });
      expect(v.calls.fill ?? 0).toBeGreaterThan(10);
    }
  });
});
