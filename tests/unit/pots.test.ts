import { describe, expect, it } from 'vitest';
import { CRAB, SPECIES } from '../../src/data/tuning';
import {
  canDrop,
  fillPots,
  POT_FAST,
  POT_GAP,
  POT_MAX,
  POT_SLOW,
  POTS,
  type Pot,
  parsePots,
  potEvery,
  potNear,
} from '../../src/fishing/pots';
import { crabSvg, drawSideCrab, drawSpiderCrab } from '../../src/render/crab';
import { drawPot } from '../../src/render/pots';
import { speciesLook } from '../../src/render/tank';
import { hasPots, noBases } from '../../src/world/bases';
import { BEACH, DOCK, IR, IX, IY, WS } from '../../src/world/island';
import { fakeView } from './helpers/view';

const pot = (x: number, y: number, crabs = 0): Pot => ({ x, y, crabs, t: 0 });

describe('crab pots', () => {
  it("come with island 3's crab shed: three of them", () => {
    expect(POTS).toBe(3);
    expect(hasPots(noBases())).toBe(false);
    expect(hasPots({ ...noBases(), isle3: 1 })).toBe(false);
    expect(hasPots({ ...noBases(), isle3: 2 })).toBe(true);
  });

  it('go only in home water: never past the buoys, never on the shore, the beach or the dock, never on top of another', () => {
    expect(canDrop([], IX + 1000, IY)).toBeNull();
    expect(canDrop([], WS + 100, IY)).toBe('deep');
    expect(canDrop([], -50, IY)).toBe('deep');
    expect(canDrop([], IX + IR + 40, IY + 40)).toBe('shore');
    expect(canDrop([], BEACH.x, BEACH.y)).toBe('shore');
    expect(canDrop([], DOCK.x + 20, DOCK.y + 60)).not.toBeNull();
    expect(canDrop([pot(IX + 1000, IY)], IX + 1000 + POT_GAP - 5, IY)).toBe('near');
    expect(canDrop([pot(IX + 1000, IY)], IX + 1000 + POT_GAP + 5, IY)).toBeNull();
  });

  it('fill a crab at a time, faster further out, and stop when full', () => {
    expect(potEvery(300)).toBe(POT_SLOW);
    expect(potEvery(3000)).toBe(POT_FAST);
    expect(potEvery(1400)).toBeLessThan(POT_SLOW);
    expect(potEvery(1400)).toBeGreaterThan(POT_FAST);
    const near = pot(IX + 500, IY);
    const far = pot(IX + 2300, IY);
    fillPots([near, far], POT_SLOW * 2 + 1);
    expect(near.crabs).toBe(2);
    expect(far.crabs).toBe(Math.min(POT_MAX, Math.floor((POT_SLOW * 2 + 1) / POT_FAST)));
    fillPots([near, far], 10000);
    expect(near.crabs).toBe(POT_MAX);
    expect(far.crabs).toBe(POT_MAX);
    expect(near.t).toBe(0);
  });

  it('are found by the boat within reach, the nearest first', () => {
    const a = pot(1000, 1000);
    const b = pot(1030, 1000);
    expect(potNear([a, b], 1020, 1000)).toBe(b);
    expect(potNear([a, b], 900, 1000)).toBeNull();
  });

  it('load from a save within bounds, and none past the buoys or beyond three', () => {
    expect(parsePots(undefined)).toEqual([]);
    expect(parsePots('pots')).toEqual([]);
    const got = parsePots([
      { x: 1000, y: 1000, crabs: 99, t: -4 },
      { x: WS + 400, y: 1000, crabs: 2 },
      { x: 'a', y: 3 },
      { x: 1200, y: 1000, crabs: 2.7, t: 12 },
      { x: 1400, y: 1000 },
      { x: 1600, y: 1000 },
    ]);
    expect(got).toEqual([
      { x: 1000, y: 1000, crabs: POT_MAX, t: 0 },
      { x: 1200, y: 1000, crabs: 2, t: 12 },
      { x: 1400, y: 1000, crabs: 0, t: 0 },
    ]);
  });
});

describe('the spider crab', () => {
  it('is a species of its own, a crab, worth more than a goldfin', () => {
    const S = SPECIES[CRAB];
    expect(S?.name).toBe('spider crab');
    expect(S?.crab).toBe(true);
    expect(S?.v).toBeGreaterThan(14);
  });

  it('walks the sand in the aquarium, slowly', () => {
    const S = SPECIES[CRAB];
    if (!S) throw new Error('no crab');
    const look = speciesLook(S, CRAB);
    expect(look.shape).toBe('crab');
    expect(look.band[0]).toBeGreaterThan(0.95);
  });

  it("draws from above with eight legs and two claws, side on, as a pot's float, and as a little picture", () => {
    const top = fakeView();
    drawSpiderCrab(top.v.ctx, 0, 0, 6, 0, 1);
    // Eight legs and two claw arms are strokes.
    expect(top.calls.stroke).toBe(10);
    const side = fakeView();
    drawSideCrab(side.v.ctx, 20, 16, 10, 0);
    expect(side.calls.stroke).toBeGreaterThanOrEqual(8);
    const empty = fakeView();
    drawPot(empty.v, pot(0, 0), '#E4572E');
    const full = fakeView();
    drawPot(full.v, pot(0, 0, POT_MAX), '#E4572E');
    expect(full.calls.arc ?? 0).toBeGreaterThan(empty.calls.arc ?? 0);
    expect(full.calls.isoEllipse).toBe((empty.calls.isoEllipse ?? 0) + 1);
    expect(crabSvg('#E8604C')).toContain('<svg');
    expect(crabSvg('currentColor')).toContain('currentColor');
  });
});
