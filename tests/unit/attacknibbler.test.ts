import { describe, expect, it } from 'vitest';
import { guidePage } from '../../src/data/guide';
import { ATTACK_NIBBLER, SPECIES } from '../../src/data/tuning';
import {
  AttackNibbler,
  CHASE_T,
  HUNTER_HITS,
  HUNTER_LEN,
  type HunterEvent,
  hunterHere,
  PROWL_T,
  type Prey,
} from '../../src/entities/attacknibbler';
import { drawHunter, drawHunterGlow } from '../../src/render/abyss';
import { DEEP_KINDS } from '../../src/render/deepfish';
import { drawSideFish, speciesLook } from '../../src/render/tank';
import { AD, AW, FLOOR_ROOM, inAbyssWater } from '../../src/world/abyss';
import { fakeView } from './helpers/view';

const DT = 1 / 60;
const FAR = { x: -1000, y: -1000 };

/** Run it so long against a diver and some prey: everything that happened. */
function run(h: AttackNibbler, secs: number, diver = FAR, prey: () => Prey[] = () => []) {
  const evs: HunterEvent[] = [];
  for (let t = 0; t < secs; t += DT) {
    const ev = h.update(DT, diver, prey());
    if (ev) evs.push(ev);
  }
  return evs;
}

describe('the attack nibbler', () => {
  it("is the kid's drawing, worth 150, drawn as itself in the guide and the aquarium", () => {
    const S = SPECIES[ATTACK_NIBBLER];
    expect([S?.name, S?.v]).toEqual(['attack nibbler', 150]);
    const p = guidePage(ATTACK_NIBBLER, 1, 2);
    expect(p.where).toContain('abyss');
    expect(p.where).toContain('three spears');
    expect(p.when).toContain('One a day');
    if (!S) throw new Error('no species');
    const look = speciesLook(S, ATTACK_NIBBLER);
    expect([look.shape, look.deep]).toEqual(['deep', DEEP_KINDS['attack nibbler']]);
    const v = fakeView();
    drawSideFish(v.v.ctx, 50, 50, look, 1, 1.3, 0, 0, 1, 2.5, 0);
    expect((v.calls.fill ?? 0) + (v.calls.stroke ?? 0)).toBeGreaterThan(10);
  });

  it('is there once a day', () => {
    expect(hunterHere(0, 1)).toBe(true);
    expect(hunterHere(6, 6)).toBe(false);
    const h = new AttackNibbler();
    h.reset(false);
    expect(run(h, 20, FAR, () => [{ si: 0, i: 0, x: h.x, y: h.y }])).toEqual([]);
    expect(h.hitBy(0, 0, AW, AD)).toBe(false);
  });

  it('prowls the floor, in the water and where the diver can reach it, with nothing to hunt', () => {
    const h = new AttackNibbler();
    h.reset(true);
    for (let t = 0; t < 60; t += DT) {
      expect(h.update(DT, FAR, [])).toBeNull();
      expect(h.y).toBeGreaterThan(AD - FLOOR_ROOM);
      expect(inAbyssWater(h.x, h.y, 10)).toBe(true);
    }
  });

  it('picks out a fish in sight, chases it down and snaps it up, then rests', () => {
    const h = new AttackNibbler();
    h.reset(true);
    const fish: Prey = { si: 3, i: 1, x: h.x - 200, y: h.y + 40 };
    const evs: HunterEvent[] = [];
    for (let t = 0; t < PROWL_T + CHASE_T && !evs.includes('snap'); t += DT) {
      const ev = h.update(DT, FAR, [fish]);
      if (ev) evs.push(ev);
    }
    expect(evs).toEqual(['chase', 'snap']);
    expect(h.ate).toEqual(fish);
    expect(h.state).toBe('rest');
  });

  it('gives up a chase on a fish that is gone, or too long', () => {
    const h = new AttackNibbler();
    h.reset(true);
    const fish: Prey = { si: 3, i: 1, x: h.x - 200, y: h.y };
    let there = true;
    run(h, PROWL_T + 0.1, FAR, () => (there ? [fish] : []));
    expect(h.state).toBe('chase');
    there = false;
    run(h, 0.1, FAR, () => []);
    expect(h.state).toBe('prowl');
  });

  it('leaves the diver alone, unless the diver is in its way as it charges', () => {
    const h = new AttackNibbler();
    h.reset(true);
    // Beside it while it prowls: nothing.
    expect(run(h, 3, { x: h.x, y: h.y + 30 })).toEqual([]);
    // Between it and the fish it is after: bitten. (It looks for prey at once.)
    h.reset(true);
    h.t = DT;
    const fish: Prey = { si: 3, i: 1, x: h.x - 300, y: h.y };
    const diver = { x: h.x - 150, y: h.y };
    const evs = run(h, PROWL_T + CHASE_T, diver, () => [fish]);
    expect(evs).toContain('bite');
    expect(evs).not.toContain('snap');
    expect(evs.indexOf('bite')).toBe(1);
  });

  it('darts off when speared, and the third spear lands it, the last only with room in the hold', () => {
    const h = new AttackNibbler();
    h.reset(true);
    expect(h.hitBy(h.x, h.y - 50, h.x, h.y + 50)).toBe(true);
    expect(h.hitBy(h.x + HUNTER_LEN, h.y - 50, h.x + HUNTER_LEN, h.y + 50)).toBe(false);
    expect(h.spear(h.x + 100, true)).toBe(false);
    expect([h.state, h.hits, h.flash]).toEqual(['dart', 1, 1]);
    const x0 = h.x;
    run(h, 0.5);
    expect(h.x).toBeLessThan(x0 - 50);
    h.spear(h.x, true);
    expect(h.hits).toBe(HUNTER_HITS - 1);
    expect(h.spear(h.x, false)).toBe(false);
    expect(h.hits).toBe(HUNTER_HITS - 1);
    expect(h.spear(h.x, true)).toBe(true);
    expect(h.here).toBe(false);
  });

  it('is aimed at where it is nearest, if in reach and not behind', () => {
    const h = new AttackNibbler();
    h.reset(true);
    expect(h.aim({ x: h.x, y: h.y + 100, face: 1 }, 200)).toEqual({ x: h.x, y: h.y });
    expect(h.aim({ x: h.x, y: h.y + 300, face: 1 }, 200)).toBeNull();
  });

  it('is drawn in the dive, its eye glinting over the dark, and not when gone', () => {
    const X = (v: number) => v;
    const h = new AttackNibbler();
    h.reset(true);
    const v = fakeView();
    drawHunter(v.v.ctx, X, X, 1, h, 1);
    drawHunterGlow(v.v.ctx, X, X, 1, h, 1);
    expect((v.calls.fill ?? 0) + (v.calls.stroke ?? 0)).toBeGreaterThan(10);
    h.reset(false);
    const g = fakeView();
    drawHunter(g.v.ctx, X, X, 1, h, 1);
    drawHunterGlow(g.v.ctx, X, X, 1, h, 1);
    expect((g.calls.fill ?? 0) + (g.calls.stroke ?? 0)).toBe(0);
  });
});
