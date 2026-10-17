import { describe, expect, it } from 'vitest';
import { guidePage } from '../../src/data/guide';
import { REMORO, SPECIES } from '../../src/data/tuning';
import {
  CRUISE,
  DART,
  REMORO_HITS,
  REMORO_LEN,
  REMORO_UP,
  Remoro,
  remoroHere,
  TURN_IN,
} from '../../src/entities/remoro';
import { drawRemoro, drawRemoroGlint } from '../../src/render/abyss';
import { DEEP_KINDS } from '../../src/render/deepfish';
import { drawSideFish, speciesLook } from '../../src/render/tank';
import { AD, AW, FLOOR_ROOM, inAbyssWater } from '../../src/world/abyss';
import { fakeView } from './helpers/view';

const DT = 1 / 60;

function run(r: Remoro, secs: number): void {
  for (let t = 0; t < secs; t += DT) r.update(DT);
}

describe('the Remoro', () => {
  it("is the kid's great silver fish, worth 190, as long as Star", () => {
    const S = SPECIES[REMORO];
    expect(S?.name).toBe('remoro');
    expect(S?.v).toBe(190);
    expect(REMORO_LEN).toBeGreaterThanOrEqual(150);
  });

  it('is there once a day: landed today, it is back tomorrow', () => {
    expect(remoroHere(0, 1)).toBe(true);
    expect(remoroHere(4, 4)).toBe(false);
    expect(remoroHere(4, 5)).toBe(true);
    const r = new Remoro();
    r.reset(false);
    expect(r.here).toBe(false);
    r.update(1);
    expect(r.state).toBe('gone');
    expect(r.hitBy(0, 0, AW, AD)).toBe(false);
    expect(r.aim({ x: r.x, y: r.y, face: 1 }, 1000)).toBeNull();
  });

  it('cruises laps over the floor, in the water and where the diver out of the cage can reach it', () => {
    const r = new Remoro();
    r.reset(true);
    let lo = Infinity;
    let hi = -Infinity;
    let turns = 0;
    let dir = r.dir;
    for (let t = 0; t < 120; t += DT) {
      r.update(DT);
      lo = Math.min(lo, r.x);
      hi = Math.max(hi, r.x);
      if (r.dir !== dir) {
        turns++;
        dir = r.dir;
      }
      expect(inAbyssWater(r.x, r.y, 20)).toBe(true);
      expect(r.y).toBeGreaterThan(AD - FLOOR_ROOM);
      expect(Math.abs(r.y - (AD - REMORO_UP))).toBeLessThan(100);
    }
    expect(turns).toBeGreaterThanOrEqual(2);
    expect(lo).toBeLessThan(TURN_IN + 5);
    expect(hi).toBeGreaterThan(AW - TURN_IN - 5);
    // It comes round as it turns, rather than flipping.
    r.reset(true);
    r.dir = -1;
    r.update(DT);
    expect(r.face).toBeGreaterThan(0.9);
    run(r, 1);
    expect(r.face).toBe(-1);
  });

  it('is struck by a spear passing its body, nose to tail, and not by one that misses', () => {
    const r = new Remoro();
    r.reset(true);
    // Across its middle, across near its head, and along under it.
    expect(r.hitBy(r.x, r.y - 60, r.x, r.y + 60)).toBe(true);
    expect(r.hitBy(r.x + 80, r.y - 5, r.x + 80, r.y + 5)).toBe(true);
    expect(r.hitBy(r.x - 80, r.y + 60, r.x + 80, r.y + 60)).toBe(false);
    expect(r.hitBy(r.x + REMORO_LEN, r.y, r.x + REMORO_LEN + 20, r.y)).toBe(false);
  });

  it('is aimed at where it is nearest, if in reach and not behind the diver', () => {
    const r = new Remoro();
    r.reset(true);
    const a = r.aim({ x: r.x + 20, y: r.y + 120, face: 1 }, 200);
    expect(a).toEqual({ x: r.x + 20, y: r.y });
    expect(r.aim({ x: r.x + 20, y: r.y + 300, face: 1 }, 200)).toBeNull();
    expect(r.aim({ x: r.x + REMORO_LEN, y: r.y, face: 1 }, 200)).toBeNull();
  });

  it('darts off away from the diver when speared, then cruises on; the third spear lands it', () => {
    const r = new Remoro();
    r.reset(true);
    expect(r.dir).toBe(1);
    // The diver to its right: it darts off left.
    expect(r.spear(r.x + 100, true)).toBe(false);
    expect([r.state, r.hits, r.dir]).toEqual(['dart', 1, -1]);
    expect(r.flash).toBe(1);
    const x0 = r.x;
    r.update(0.5);
    expect(x0 - r.x).toBeCloseTo(DART * 0.5, 0);
    run(r, 1);
    expect(r.state).toBe('swim');
    const x1 = r.x;
    r.update(0.5);
    expect(Math.abs(r.x - x1)).toBeCloseTo(CRUISE * 0.5, 0);
    expect(r.spear(r.x - 100, true)).toBe(false);
    expect(r.dir).toBe(1);
    expect(r.hits).toBe(REMORO_HITS - 1);
    expect(r.spear(r.x, true)).toBe(true);
    expect(r.state).toBe('gone');
    expect(r.here).toBe(false);
  });

  it('shakes off the last spear if the hold is full', () => {
    const r = new Remoro();
    r.reset(true);
    r.spear(0, false);
    r.spear(0, false);
    expect(r.hits).toBe(2);
    expect(r.spear(0, false)).toBe(false);
    expect([r.hits, r.state]).toEqual([2, 'dart']);
    expect(r.spear(0, true)).toBe(true);
  });

  it('is drawn in the dive, its silver glinting over the dark, and not when it is gone', () => {
    const r = new Remoro();
    r.reset(true);
    const v = fakeView();
    const X = (x: number) => x;
    drawRemoro(v.v.ctx, X, X, 1, r, 1);
    drawRemoroGlint(v.v.ctx, X, X, 1, r, 1);
    expect((v.calls.fill ?? 0) + (v.calls.stroke ?? 0)).toBeGreaterThan(8);
    r.reset(false);
    const g = fakeView();
    drawRemoro(g.v.ctx, X, X, 1, r, 1);
    drawRemoroGlint(g.v.ctx, X, X, 1, r, 1);
    expect((g.calls.fill ?? 0) + (g.calls.stroke ?? 0)).toBe(0);
  });

  it('has a field guide page and lives in the aquarium, drawn as itself', () => {
    const p = guidePage(REMORO, 1, 3);
    expect(p.where).toContain('abyss');
    expect(p.where).toContain('three spears');
    expect(p.when).toContain('One a day');
    expect(p.worth).toBe('190 coins');
    const S = SPECIES[REMORO];
    if (!S) throw new Error('no species');
    const look = speciesLook(S, REMORO);
    expect([look.shape, look.deep]).toEqual(['deep', DEEP_KINDS.remoro]);
    const v = fakeView();
    drawSideFish(v.v.ctx, 50, 50, look, 1, 1.3, 0, 0, 1, 2.5, 0);
    expect((v.calls.fill ?? 0) + (v.calls.stroke ?? 0)).toBeGreaterThan(8);
  });
});
