import { describe, expect, it } from 'vitest';
import { ARCHERFISH, AROWANA } from '../../src/data/tuning';
import {
  DROP_T,
  DroneFishing,
  FISH_CRUISE,
  type FishEvent,
  LAGOON_HALF,
  LAGOON_LEN,
  layRises,
  REEL_T,
  RISE_FROM,
  STRIKE_T,
} from '../../src/entities/dronefish';
import { drawDroneLagoon } from '../../src/render/droneflight';
import { fakeView } from './helpers/view';

/** Run it for so long with the stick held at sx. */
const run = (f: DroneFishing, secs: number, sx = 0) => {
  for (let t = 0; t < secs - 1e-9; t += 1 / 60) f.step(1 / 60, sx);
};

/** A pass with the drone just short of its first rise, right over it, and what it says. */
function overARise(beetles = 2) {
  const f = new DroneFishing(beetles);
  const r = f.rises[0];
  if (!r) throw new Error('no rises');
  f.x = r.x;
  f.z = r.z - 1;
  const said: [FishEvent, number][] = [];
  f.onEvent = (what, sp) => said.push([what, sp]);
  return { f, r, said };
}

describe('fishing from the drone over the black lagoon', () => {
  it('lays the same rises every pass, across the lagoon, arowanas and archerfish both', () => {
    const a = layRises(1171);
    expect(layRises(1171)).toEqual(a);
    expect(a.length).toBeGreaterThan(6);
    expect(Math.min(...a.map((r) => r.z))).toBeGreaterThanOrEqual(RISE_FROM);
    expect(Math.max(...a.map((r) => r.z))).toBeLessThan(LAGOON_LEN);
    expect(a.every((r) => Math.abs(r.x) < LAGOON_HALF)).toBe(true);
    const kinds = new Set(a.map((r) => r.sp));
    expect(kinds).toEqual(new Set([AROWANA, ARCHERFISH]));
  });

  it('flies on down the lagoon by itself, steered across it but never off it', () => {
    const f = new DroneFishing(1);
    run(f, 1);
    expect(f.z).toBeCloseTo(FISH_CRUISE, 0);
    run(f, 3, 1);
    expect(f.x).toBeGreaterThan(LAGOON_HALF - 1.5);
    expect(f.x).toBeLessThan(LAGOON_HALF);
  });

  it('drops the beetle on a rise, the fish strikes, and reeled in it is caught and the beetle gone', () => {
    const { f, r, said } = overARise();
    f.press();
    expect(f.state).toBe('drop');
    const z = f.z;
    run(f, DROP_T + STRIKE_T + 0.1);
    expect(f.state).toBe('reel');
    expect(f.z).toBeCloseTo(z, 5);
    f.press();
    expect(said).toEqual([
      ['strike', r.sp],
      ['caught', r.sp],
    ]);
    expect([f.state, f.beetles, f.caught, r.taken]).toEqual(['fly', 1, [r.sp], true]);
  });

  it('lets a fish go that is not reeled in, and keeps the beetle', () => {
    const { f, r, said } = overARise();
    f.press();
    run(f, DROP_T + STRIKE_T + REEL_T + 0.2);
    expect(said).toEqual([
      ['strike', r.sp],
      ['letgo', r.sp],
    ]);
    expect([f.state, f.beetles, f.caught.length, r.taken]).toEqual(['fly', 2, 0, true]);
  });

  it('winds a beetle dropped on empty water back up; with none aboard, there is nothing to drop', () => {
    const { f, said } = overARise();
    f.x = f.x > 0 ? f.x - 5 : f.x + 5;
    f.press();
    run(f, DROP_T + 0.1);
    expect(said).toEqual([['empty', -1]]);
    expect([f.state, f.beetles]).toEqual(['fly', 2]);
    const none = overARise(0);
    none.f.press();
    expect(none.f.state).toBe('fly');
  });

  it('reaches a rise further off on a longer line', () => {
    const near = overARise();
    near.f.x = near.r.x + 2.5;
    expect(near.f.riseUnder()).toBe(null);
    near.f.reach = 3.2;
    expect(near.f.riseUnder()).toBe(near.r);
  });

  it('is over at the far end of the lagoon', () => {
    const f = new DroneFishing(0);
    let ended = 0;
    f.onEnd = () => ended++;
    run(f, LAGOON_LEN / FISH_CRUISE + 1);
    expect([f.state, ended]).toEqual(['done', 1]);
  });

  it('is drawn: the lagoon, its rises, the line going down, the fish striking and on the line', () => {
    const { v, calls } = fakeView();
    for (const sp of [AROWANA, ARCHERFISH]) {
      const { f, r } = overARise();
      r.sp = sp;
      drawDroneLagoon(v.ctx, 390, 780, f, '#3E7BC4', 1);
      f.press();
      for (const secs of [DROP_T / 2, DROP_T, STRIKE_T]) {
        run(f, secs);
        drawDroneLagoon(v.ctx, 390, 780, f, '#3E7BC4', 2);
      }
    }
    expect(calls.fill ?? 0).toBeGreaterThan(100);
    expect(calls.stroke ?? 0).toBeGreaterThan(20);
  });
});
