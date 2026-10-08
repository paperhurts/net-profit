import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { lurkAt } from '../../src/entities/anglerfish';
import { LAIR } from '../../src/entities/cthuluviathan';
import { inZone } from '../../src/entities/gulper';
import { drawIsle4Flat, drawIsle4Sea, isle4Solids, mix } from '../../src/render/isle4';
import { DEEP, pastBuoys, WS } from '../../src/world/island';
import { ISLE2 } from '../../src/world/isle2';
import { ISLE3 } from '../../src/world/isle3';
import { ISLE4, MONSTER, PALMS4, SUMMONER, TAR_R } from '../../src/world/isle4';
import { fakeView } from './helpers/view';

describe('island 4', () => {
  it('sits in the south corner of the deep, its black water inside the deep, far from the other islands', () => {
    expect(pastBuoys(ISLE4.x, ISLE4.y)).toBe(true);
    expect(Math.max(ISLE4.x, ISLE4.y) - WS + TAR_R).toBeLessThan(DEEP);
    for (const o of [ISLE2, ISLE3, LAIR])
      expect(Math.hypot(ISLE4.x - o.x, ISLE4.y - o.y)).toBeGreaterThan(4000);
    // Clear of the gulper's water.
    expect(inZone(ISLE4.x, ISLE4.y, TAR_R)).toBe(false);
  });

  it('has its monster in the water and the evil monkey on the beach, both on the side toward home', () => {
    const toHome = (p: { x: number; y: number }) => p.x - ISLE4.x + (p.y - ISLE4.y);
    expect(toHome(MONSTER)).toBeLessThan(0);
    expect(toHome(SUMMONER)).toBeLessThan(0);
    expect(Math.hypot(MONSTER.x - ISLE4.x, MONSTER.y - ISLE4.y)).toBeGreaterThan(ISLE4.r + 20);
    expect(Math.hypot(MONSTER.x - ISLE4.x, MONSTER.y - ISLE4.y)).toBeLessThan(TAR_R - 60);
    expect(Math.hypot(SUMMONER.x - ISLE4.x, SUMMONER.y - ISLE4.y)).toBeLessThan(ISLE4.r);
    for (const p of PALMS4)
      expect(Math.hypot(p[0] - ISLE4.x, p[1] - ISLE4.y)).toBeLessThan(ISLE4.r - 20);
  });

  it('keeps the anglerfish out of its water', () => {
    const r = rng(11);
    for (let i = 0; i < 2000; i++) {
      const [x, y] = lurkAt(r);
      expect(Math.hypot(x - ISLE4.x, y - ISLE4.y)).toBeGreaterThan(ISLE4.r + 400);
    }
  });

  it('draws every moment of the change without a negative size, the black water just starting too', () => {
    for (const k of [0.001, 0.01, 0.05, 0.2, 0.5, 0.9]) {
      const f = fakeView();
      f.v.onScreen = () => true;
      for (let t = 0; t < 7; t += 0.37) {
        f.v.T = t;
        const look = { tar: k, spread: k, rise: k, summon: k };
        drawIsle4Sea(f.v, look);
        drawIsle4Flat(f.v, look);
        for (const s of isle4Solids(f.v, look)) s.f();
      }
    }
  });

  it('draws plain before the tar, and black water, a dead island and the monster after', () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mix('#FF0000', '#0000FF', 1)).toBe('#0000ff');
    const none = { tar: 0, spread: 0, rise: 0, summon: 0 };
    const all = { tar: 1, spread: 1, rise: 1, summon: 1 };
    const view = () => {
      const f = fakeView();
      // Look at island 4 rather than wherever the helper looks.
      f.v.onScreen = () => true;
      return f;
    };
    const before = view();
    drawIsle4Sea(before.v, none);
    drawIsle4Flat(before.v, none);
    const plain = isle4Solids(before.v, none);
    expect(plain).toHaveLength(PALMS4.length + 3);
    const after = view();
    drawIsle4Sea(after.v, all);
    const tarred = isle4Solids(after.v, all);
    // The monster and the monkey join the palms and rocks.
    expect(tarred.length).toBe(PALMS4.length + 3 + 2);
    for (const s of tarred) s.f();
    expect((after.calls.fill ?? 0) + (after.calls.stroke ?? 0)).toBeGreaterThan(
      (before.calls.fill ?? 0) + (before.calls.stroke ?? 0),
    );
  });
});
