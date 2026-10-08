import { describe, expect, it } from 'vitest';
import { LAIR } from '../../src/entities/cthuluviathan';
import { drawBoneFins, drawIsle5Flat, drawIsle5Sea, isle5Solids } from '../../src/render/isle5';
import { DEEP, FAR, pastFar, WS } from '../../src/world/island';
import { ISLE2 } from '../../src/world/isle2';
import { ISLE3 } from '../../src/world/isle3';
import { ISLE4 } from '../../src/world/isle4';
import {
  BAR_R,
  CIRCLE_R,
  ISLE5,
  JAW,
  nearIsle5,
  REEF,
  SIGHT5,
  THRONE,
  WRECK,
} from '../../src/world/isle5';
import { createFarSchools } from '../../src/world/schools';
import { fakeView } from './helpers/view';

describe("island 5, the Skeleton Shark King's reef", () => {
  it('sits out in the far deep, wholly past the far buoys and short of its end, far from the other islands', () => {
    expect(pastFar(ISLE5.x, ISLE5.y)).toBe(true);
    const out = Math.max(-ISLE5.x, ISLE5.x - WS, -ISLE5.y, ISLE5.y - WS);
    expect(out - CIRCLE_R - 60).toBeGreaterThan(DEEP);
    expect(out + CIRCLE_R + 60).toBeLessThan(DEEP + FAR);
    for (const o of [ISLE2, ISLE3, ISLE4, LAIR])
      expect(Math.hypot(ISLE5.x - o.x, ISLE5.y - o.y)).toBeGreaterThan(SIGHT5 + 1000);
    // The marlin keep to the far deep's corners, away from it.
    for (const sc of createFarSchools())
      expect(Math.hypot(sc.ax - ISLE5.x, sc.ay - ISLE5.y)).toBeGreaterThan(CIRCLE_R + 1000);
  });

  it('has its jaw and throne on the bar, a ring of rocks round it, and the wreck on the rocks', () => {
    for (const p of [JAW, THRONE])
      expect(Math.hypot(p.x - ISLE5.x, p.y - ISLE5.y)).toBeLessThan(BAR_R - 20);
    // The jaw faces home, toward +x.
    expect(JAW.x).toBeGreaterThan(ISLE5.x);
    for (const [x, y, r] of REEF) {
      const d = Math.hypot(x - ISLE5.x, y - ISLE5.y);
      expect(d).toBeGreaterThan(BAR_R);
      expect(d + r).toBeLessThan(ISLE5.r + 10);
    }
    const w = Math.hypot(WRECK.x - ISLE5.x, WRECK.y - ISLE5.y);
    expect(w).toBeGreaterThan(BAR_R);
    expect(w).toBeLessThan(ISLE5.r + 20);
    expect(WRECK.x).toBeLessThan(ISLE5.x);
    expect(nearIsle5(ISLE5.x + ISLE5.r - 1, ISLE5.y, 0)).toBe(true);
    expect(nearIsle5(ISLE5.x + ISLE5.r + 50, ISLE5.y, 40)).toBe(false);
  });

  it('draws its water, its bar, the fins and what stands on it, at any moment', () => {
    const f = fakeView();
    f.v.onScreen = () => true;
    for (let t = 0; t < 10; t += 0.7) {
      f.v.T = t;
      drawIsle5Sea(f.v);
      drawIsle5Flat(f.v);
      drawBoneFins(f.v);
    }
    const solids = isle5Solids(f.v, false);
    expect(solids).toHaveLength(REEF.length + 3);
    for (const s of solids) s.f();
    for (const s of isle5Solids(f.v, true)) s.f();
    expect(f.calls.fill ?? 0).toBeGreaterThan(50);
    // Off screen, nothing.
    const g = fakeView();
    g.onScreen = false;
    expect(isle5Solids(g.v, false)).toHaveLength(0);
  });
});
