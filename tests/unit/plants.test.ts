import { describe, expect, it } from 'vitest';
import { blocked, LANDING } from '../../src/entities/walker';
import { bushSolids, drawGroundPlants, drawUnderwaterPlants } from '../../src/render/plants';
import { BEACH, IR, IX, IY } from '../../src/world/island';
import { CAMP, ISLE2, LANDING2 } from '../../src/world/isle2';
import { CLEAR, KEEP_OFF, PLANTS, type Plant, plantsOf } from '../../src/world/plants';
import { DOOR } from '../../src/world/tower';
import { fakeView } from './helpers/view';

const home = (p: Plant) => Math.hypot(p.x - IX, p.y - IY) < 1000;
const isle2 = (p: Plant) => Math.hypot(p.x - ISLE2.x, p.y - ISLE2.y) < 1000;
const onBeach = (p: Plant) => Math.hypot(p.x - BEACH.x, p.y - BEACH.y) < BEACH.r;

describe('the plants', () => {
  it('grow on both islands: bushes, flowers and grass on land, sea grass and kelp in the water', () => {
    for (const near of [home, isle2]) {
      const here = PLANTS.filter(near);
      const count = (k: Plant['kind']) => here.filter((p) => p.kind === k).length;
      expect(count('bush')).toBeGreaterThanOrEqual(5);
      expect(count('flowers')).toBeGreaterThanOrEqual(8);
      expect(count('tuft')).toBeGreaterThanOrEqual(10);
      expect(count('seagrass')).toBeGreaterThanOrEqual(15);
      expect(count('kelp')).toBeGreaterThanOrEqual(8);
    }
  });

  it('keep the land plants on dry land, clear of anything built, the landings, the tower door and the camp', () => {
    for (const p of PLANTS) {
      if (p.kind === 'seagrass' || p.kind === 'kelp') continue;
      const onHome = Math.hypot(p.x - IX, p.y - IY) <= IR - 14;
      const on2 = Math.hypot(p.x - ISLE2.x, p.y - ISLE2.y) <= ISLE2.r - 14;
      expect(onHome || on2 || onBeach(p), `${p.kind} in the water at ${p.x}, ${p.y}`).toBe(true);
      expect(blocked(p.x, p.y, 99), `${p.kind} inside a building`).toBe(false);
      for (let a = 0; a < 8; a++) {
        const q = (a / 8) * Math.PI * 2;
        expect(blocked(p.x + Math.cos(q) * CLEAR, p.y + Math.sin(q) * CLEAR, 99)).toBe(false);
      }
      for (const k of [LANDING, LANDING2, DOOR])
        expect(Math.hypot(p.x - k.x, p.y - k.y)).toBeGreaterThan(KEEP_OFF);
      expect(Math.hypot(p.x - CAMP.x, p.y - CAMP.y)).toBeGreaterThan(40);
    }
  });

  it('keep the sea grass and kelp in the water round each island, and out of each other', () => {
    for (const p of [...plantsOf('seagrass'), ...plantsOf('kelp')]) {
      const dHome = Math.hypot(p.x - IX, p.y - IY);
      const d2 = Math.hypot(p.x - ISLE2.x, p.y - ISLE2.y);
      const r = dHome < d2 ? IR : ISLE2.r;
      const d = Math.min(dHome, d2);
      expect(d).toBeGreaterThan(r + 30);
      expect(d).toBeLessThan(r + 560);
      expect(onBeach(p)).toBe(false);
    }
    const kelp = plantsOf('kelp');
    for (const a of kelp)
      for (const b of kelp)
        if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(60);
  });

  it('draw under the water, flat on the ground, and the bushes as solids sorted by x + y', () => {
    const under = fakeView();
    drawUnderwaterPlants(under.v);
    expect(under.calls.stroke ?? 0).toBeGreaterThan(50);
    const ground = fakeView();
    drawGroundPlants(ground.v);
    expect(ground.calls.fill ?? 0).toBeGreaterThan(50);
    expect(ground.calls.stroke ?? 0).toBeGreaterThan(20);
    const solids = fakeView();
    const items = bushSolids(solids.v);
    expect(items).toHaveLength(plantsOf('bush').length);
    for (const it of items) it.f();
    expect(solids.calls.fill ?? 0).toBeGreaterThan(items.length * 5);
    const bush = plantsOf('bush')[0] as Plant;
    expect(items.some((s) => s.d === bush.x + bush.y)).toBe(true);
    // Off screen, nothing is drawn.
    const away = fakeView();
    away.onScreen = false;
    drawUnderwaterPlants(away.v);
    drawGroundPlants(away.v);
    expect(bushSolids(away.v)).toHaveLength(0);
    expect((away.calls.fill ?? 0) + (away.calls.stroke ?? 0)).toBe(0);
  });
});
