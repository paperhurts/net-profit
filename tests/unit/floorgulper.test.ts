import { describe, expect, it } from 'vitest';
import { Lurker, type LurkerEvent, TRENCH_LURK } from '../../src/entities/lurker';
import { drawFloorGulper, drawFloorGulperGlow } from '../../src/render/abyssgiants';
import {
  ABYSS_LURK,
  AD,
  CAGE_REST,
  FLOOR_ROOM,
  GULPER_WAKE,
  inAbyssWater,
} from '../../src/world/abyss';
import { TD } from '../../src/world/trench';
import { fakeView } from './helpers/view';

const DT = 1 / 60;

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Run it against a diver at d, in the cage or out of it, for so long: what happened. */
function run(
  l: Lurker,
  d: { x: number; y: number },
  inCage: boolean,
  secs: number,
  rnd = seeded(7),
) {
  const evs: LurkerEvent[] = [];
  for (let t = 0; t < secs; t += DT) {
    const ev = l.update(DT, d, inCage, rnd);
    if (ev) evs.push(ev);
  }
  return evs;
}

describe('the gulper over the abyss floor', () => {
  it('is the lurker as the trench always had it, there by default', () => {
    expect(new Lurker().place).toBe(TRENCH_LURK);
    expect(new Lurker().y).toBe(TD - 100);
  });

  it('never comes while the diver is in the cage, however long', () => {
    const l = new Lurker(ABYSS_LURK);
    expect(run(l, { x: 500, y: CAGE_REST }, true, 60)).toEqual([]);
    expect(l.state).toBe('hide');
  });

  it('comes for a diver a while out of the cage over the floor, and bites air if it stays put', () => {
    const l = new Lurker(ABYSS_LURK);
    const d = { x: 300, y: AD - 300 };
    expect(run(l, d, false, GULPER_WAKE - 1)).toEqual([]);
    const evs = run(l, d, false, 12);
    expect(evs[0]).toBe('eyes');
    expect(evs).toContain('tell');
    expect(evs).toContain('bite');
    expect(evs.indexOf('tell')).toBeLessThan(evs.indexOf('bite'));
  });

  it('stays over the floor, in the water, where the diver can swim, the whole hunt', () => {
    const l = new Lurker(ABYSS_LURK);
    const d = { x: 700, y: AD - 150 };
    const rnd = seeded(3);
    for (let t = 0; t < 40; t += DT) {
      l.update(DT, d, false, rnd);
      if (l.state !== 'hide') {
        expect(l.y).toBeGreaterThanOrEqual(AD - FLOOR_ROOM - 1);
        expect(inAbyssWater(l.x, l.y, 10)).toBe(true);
      }
    }
  });

  it('gives up the moment the diver is back in the cage', () => {
    const l = new Lurker(ABYSS_LURK);
    const d = { x: 300, y: AD - 300 };
    run(l, d, false, GULPER_WAKE + 1);
    expect(l.out).toBe(true);
    run(l, d, true, 0.1);
    expect(l.state).toBe('back');
    run(l, d, true, 4);
    expect(l.state).toBe('hide');
    expect(run(l, d, true, 30)).toEqual([]);
  });

  it('is stung off by a spear and stays away a good while', () => {
    const l = new Lurker(ABYSS_LURK);
    const d = { x: 300, y: AD - 300 };
    run(l, d, false, GULPER_WAKE + 1);
    expect(l.hitBy(l.x - 40, l.y, l.x + 40, l.y)).toBe(true);
    l.sting();
    expect(l.state).toBe('flee');
    expect(run(l, d, false, 20)).not.toContain('eyes');
  });

  it('is drawn as a gulper while out, its eye and tail light over the dark, and not while hiding', () => {
    const X = (v: number) => v;
    const l = new Lurker(ABYSS_LURK);
    const hid = fakeView();
    drawFloorGulper(hid.v.ctx, X, X, 1, l, 1);
    drawFloorGulperGlow(hid.v.ctx, X, X, 1, l, 1);
    expect((hid.calls.fill ?? 0) + (hid.calls.stroke ?? 0)).toBe(0);
    run(l, { x: 300, y: AD - 300 }, false, GULPER_WAKE + 1);
    const v = fakeView();
    drawFloorGulper(v.v.ctx, X, X, 1, l, 1);
    expect((v.calls.fill ?? 0) + (v.calls.stroke ?? 0)).toBeGreaterThan(8);
    const g = fakeView();
    drawFloorGulperGlow(g.v.ctx, X, X, 1, l, 1);
    expect(g.calls.fill ?? 0).toBeGreaterThan(1);
  });
});
