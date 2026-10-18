import { describe, expect, it } from 'vitest';
import { drawTarFishEyes, drawTarLine, tarFishSolids } from '../../src/render/tarfish';
import {
  fishAt,
  isTaken,
  leftIn,
  leftToday,
  NEAR_MAX,
  nearestSchool,
  nearestTarFish,
  PER_SCHOOL,
  SCHOOL_R,
  scientistBuys,
  TAR_FISH_PRICE,
  TAR_PER_DAY,
  TAR_SCHOOLS,
  take,
  takenToday,
  tarSchools,
} from '../../src/world/tarfish';
import { TAR_ISLE } from '../../src/world/tarisle';
import { onTar, TAR_BERTH } from '../../src/world/tarsea';
import { fakeView } from './helpers/view';

describe('the tar fish', () => {
  it('are a dozen a day, 250 coins each, as the kid has them', () => {
    expect(TAR_PER_DAY).toBe(12);
    expect(TAR_SCHOOLS * PER_SCHOOL).toBe(TAR_PER_DAY);
    expect(TAR_FISH_PRICE).toBe(250);
  });

  it("put the day's schools out on the tar, well apart, the first near the dock and none on it", () => {
    for (let day = 1; day < 60; day++) {
      const s = tarSchools(day);
      expect(s).toHaveLength(TAR_SCHOOLS);
      for (const sc of s) {
        expect(onTar(sc.x, sc.y)).toBe(true);
        expect(Math.hypot(sc.x - TAR_BERTH.x, sc.y - TAR_BERTH.y)).toBeGreaterThan(1000);
        expect(Math.hypot(sc.x - TAR_ISLE.x, sc.y - TAR_ISLE.y)).toBeGreaterThan(TAR_ISLE.r + 300);
      }
      const first = s[0];
      if (first)
        expect(Math.hypot(first.x - TAR_BERTH.x, first.y - TAR_BERTH.y)).toBeLessThanOrEqual(
          NEAR_MAX + 1,
        );
      for (let i = 0; i < s.length; i++)
        for (let j = i + 1; j < s.length; j++) {
          const a = s[i];
          const b = s[j];
          if (a && b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(1500);
        }
    }
  });

  it('are where they were for a day, after a reload, and somewhere new the next', () => {
    expect(tarSchools(5)).toEqual(tarSchools(5));
    expect(tarSchools(6)).not.toEqual(tarSchools(5));
  });

  it('forget what was taken once the day it was taken on is gone', () => {
    expect(takenToday(4, 0b111, 4)).toBe(0b111);
    expect(takenToday(4, 0b111, 5)).toBe(0);
  });

  it('are taken one at a time, and counted', () => {
    let t = 0;
    expect(leftToday(t)).toBe(TAR_PER_DAY);
    t = take(t, 1, 2);
    expect(isTaken(t, 1, 2)).toBe(true);
    expect(isTaken(t, 1, 1)).toBe(false);
    expect(leftIn(t, 1)).toBe(PER_SCHOOL - 1);
    expect(leftIn(t, 0)).toBe(PER_SCHOOL);
    expect(leftToday(t)).toBe(TAR_PER_DAY - 1);
    for (let s = 0; s < TAR_SCHOOLS; s++) for (let k = 0; k < PER_SCHOOL; k++) t = take(t, s, k);
    expect(leftToday(t)).toBe(0);
  });

  it('swim round their school, near its middle', () => {
    const sc = { x: 100, y: -200 };
    for (let T = 0; T < 20; T += 0.7)
      for (let k = 0; k < PER_SCHOOL; k++) {
        const f = fishAt(sc, 2, k, T);
        expect(Math.hypot(f.x - sc.x, f.y - sc.y)).toBeLessThanOrEqual(SCHOOL_R + 0.01);
      }
    const a = fishAt(sc, 0, 0, 1);
    const b = fishAt(sc, 0, 0, 2);
    expect(a).not.toEqual(b);
  });

  it('are cast for only near enough, and not once taken', () => {
    const s = [
      { x: 0, y: 0 },
      { x: 5000, y: 0 },
    ];
    const n = nearestTarFish(s, 0, 100, 0, 240, 0);
    expect(n?.s).toBe(0);
    expect(nearestTarFish(s, 0, 2000, 0, 240, 0)).toBeNull();
    let all = 0;
    for (let k = 0; k < PER_SCHOOL; k++) all = take(all, 0, k);
    expect(nearestTarFish(s, all, 100, 0, 240, 0)).toBeNull();
  });

  it('show the way to the nearest school with any left', () => {
    const s = [
      { x: 0, y: 0 },
      { x: 5000, y: 0 },
    ];
    expect(nearestSchool(s, 0, 4000, 0)).toBe(s[1]);
    let t = 0;
    for (let k = 0; k < PER_SCHOOL; k++) t = take(t, 1, k);
    expect(nearestSchool(s, t, 4000, 0)).toBe(s[0]);
    for (let k = 0; k < PER_SCHOOL; k++) t = take(t, 0, k);
    expect(nearestSchool(s, t, 4000, 0)).toBeNull();
  });

  it('are bought by the scientist, who says what is paid', () => {
    expect(scientistBuys(1, true)).toContain('a tar fish for 250 coins');
    expect(scientistBuys(3, false)).toContain('3 tar fish for 750 coins');
  });

  it('are drawn, those not taken, their eyes only after dark, and the line out to the float', () => {
    const sc = [{ x: 0, y: 0 }];
    const f = fakeView();
    const fish = tarFishSolids(f.v, sc, 0);
    expect(fish).toHaveLength(PER_SCHOOL);
    for (const o of fish) o.f();
    expect(f.calls.fill ?? 0).toBeGreaterThan(PER_SCHOOL * 2);
    expect(tarFishSolids(f.v, sc, take(take(0, 0, 0), 0, 2))).toHaveLength(1);
    f.onScreen = false;
    expect(tarFishSolids(f.v, sc, 0)).toEqual([]);
    const day = fakeView();
    drawTarFishEyes(day.v, sc, 0, 0);
    expect(day.calls.arc ?? 0).toBe(0);
    drawTarLine(day.v, { x: 200, y: 0 }, 0, 0, false);
    drawTarLine(day.v, { x: 200, y: 0 }, 0, 0, true);
    expect(day.calls.stroke ?? 0).toBeGreaterThan(1);
  });
});
