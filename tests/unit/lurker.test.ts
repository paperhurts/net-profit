import { describe, expect, it } from 'vitest';
import { AIR_MAX, Diver, TANK_AIR } from '../../src/entities/diver';
import {
  BITE,
  FLEE,
  KEEP,
  LURK_TOP,
  Lurker,
  type LurkerEvent,
  TELL,
  WAKE,
} from '../../src/entities/lurker';
import { drawLurker, drawLurkerGlow } from '../../src/render/lurker';
import { inWater } from '../../src/world/trench';
import { fakeView } from './helpers/view';

const DT = 1 / 60;

/** A seeded random, so each run is the same. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** A diver held still deep in the dark (it drifts up a little when let go; this one holds its depth). */
function stillAt(x: number, y: number) {
  return { x, y };
}

/** Run the lurker against a still diver for a while; every event. */
function run(l: Lurker, d: { x: number; y: number }, seconds: number, up = false, rnd = seeded(3)) {
  const evs: LurkerEvent[] = [];
  for (let i = 0; i < seconds * 60; i++) {
    const ev = l.update(DT, d, up, rnd);
    if (ev) evs.push(ev);
  }
  return evs;
}

describe('the lurker', () => {
  it('leaves a diver in the sunlit and twilight water alone, and comes for one that stays in the dark', () => {
    const l = new Lurker();
    expect(run(l, stillAt(380, LURK_TOP - 100), 30)).toEqual([]);
    expect(l.state).toBe('hide');
    const d = stillAt(380, 1100);
    const evs = run(l, d, WAKE + 0.1);
    expect(evs).toEqual(['eyes']);
    // Out of the dark, off the screen, and in the water.
    expect(Math.hypot(l.x - d.x, l.y - d.y)).toBeGreaterThan(380);
    expect(inWater(l.x, l.y)).toBe(true);
    expect(l.out).toBe(true);
  });

  it("circles at arm's length, then warns before it lunges, and bites a diver who stays put", () => {
    const l = new Lurker();
    const d = stillAt(380, 1100);
    const evs: LurkerEvent[] = [];
    let near = Number.POSITIVE_INFINITY;
    let tellAt = -1;
    let biteAt = -1;
    for (let i = 0; i < 40 * 60 && biteAt < 0; i++) {
      const ev = l.update(DT, d, false, seeded(i + 1));
      if (l.state === 'stalk') near = Math.min(near, Math.hypot(l.x - d.x, l.y - d.y));
      if (ev === 'tell') tellAt = i;
      if (ev === 'bite') biteAt = i;
      if (ev) evs.push(ev);
    }
    expect(evs.slice(0, 3)).toEqual(['eyes', 'tell', 'bite']);
    // It kept its distance until the warning, and the warning gave time to move.
    expect(near).toBeGreaterThan(KEEP * 0.6);
    expect((biteAt - tellAt) / 60).toBeGreaterThan(TELL);
    // After a bite it goes back into the dark, and comes again only after the diver has waited again.
    expect(l.state).toBe('back');
    const later = run(l, d, WAKE * 2);
    expect(later[0]).toBe('eyes');
  });

  it('misses a diver who swims aside when it warns, a third of a second late, every time', () => {
    for (const late of [0.23, 0.33, 0.43, 0.5]) {
      const l = new Lurker();
      const d = new Diver();
      d.reset(AIR_MAX);
      d.x = 380;
      d.y = 1100;
      const rnd = seeded(Math.round(late * 100));
      let evs: LurkerEvent[] = [];
      let since = -1;
      let dir: [number, number] = [0, 0];
      for (let i = 0; i < 60 * 60; i++) {
        const ev = l.update(DT, d, false, rnd);
        if (ev) evs.push(ev);
        if (ev === 'tell') {
          since = 0;
          // Across its line of attack, toward the open water.
          const ax = d.x - l.x;
          const ay = d.y - l.y;
          const n = Math.hypot(ax, ay) || 1;
          const a: [number, number] = [-ay / n, ax / n];
          const b: [number, number] = [ay / n, -ax / n];
          const room = (v: [number, number]) => inWater(d.x + v[0] * 70, d.y + v[1] * 70, 12);
          dir = room(a) && !room(b) ? a : room(b) && !room(a) ? b : a[1] < b[1] ? a : b;
        }
        let ix = 0;
        let iy = 0;
        if (since >= 0) {
          since += DT;
          if (since >= late && since < late + 1.4) [ix, iy] = dir;
          if (since >= late + 1.4) since = -1;
        }
        // While it waits the diver holds its place, as a player spearfishing would.
        if (since < 0) {
          ix = Math.max(-1, Math.min(1, (380 - d.x) / 60));
          iy = Math.max(-1, Math.min(1, (1100 - d.y) / 60));
        }
        d.air = AIR_MAX;
        d.update(DT, ix, iy);
      }
      evs = evs.filter((e) => e !== 'eyes');
      expect(evs.filter((e) => e === 'tell').length, `${late} s late`).toBeGreaterThan(3);
      expect(evs, `${late} s late`).not.toContain('bite');
    }
  });

  it('flees a spear and stays away a good while, and is never stung while hidden', () => {
    const l = new Lurker();
    const d = stillAt(380, 1100);
    run(l, d, WAKE + 3);
    expect(l.out).toBe(true);
    // A spear past its head stings it.
    expect(l.hitBy(l.x - 40, l.y, l.x + 40, l.y)).toBe(true);
    expect(l.hitBy(l.x - 40, l.y - 200, l.x + 40, l.y - 200)).toBe(false);
    l.sting();
    expect(l.state).toBe('flee');
    expect(l.hitBy(l.x - 40, l.y, l.x + 40, l.y)).toBe(false);
    expect(run(l, d, FLEE - 1)).toEqual([]);
    expect(run(l, d, WAKE + 2)).toContain('eyes');
  });

  it('lets a diver go who swims up out of the dark, or is on the way back to the boat', () => {
    const l = new Lurker();
    const d = { x: 380, y: 1100 };
    run(l, d, WAKE + 2);
    expect(l.out).toBe(true);
    d.y = LURK_TOP - 100;
    run(l, d, 0.2);
    expect(l.state).toBe('back');
    run(l, d, 5);
    expect(l.state).toBe('hide');
    const m = new Lurker();
    run(m, { x: 380, y: 1100 }, WAKE + 2);
    run(m, { x: 380, y: 1100 }, 0.2, true);
    expect(m.state).toBe('back');
  });

  it("bites a third of the scuba gear's tank, so three bites empty it and the big tank takes four", () => {
    expect(BITE * 3).toBeGreaterThanOrEqual(AIR_MAX);
    expect(BITE * 2).toBeLessThan(AIR_MAX);
    expect(BITE * 4).toBeLessThan(TANK_AIR);
  });

  it('draws in every state without a fault', () => {
    const l = new Lurker();
    const d = stillAt(380, 1100);
    const X = (v: number) => v;
    for (let i = 0; i < 20 * 60; i++) {
      l.update(DT, d, false, seeded(i + 7));
      if (i % 30) continue;
      const v = fakeView();
      drawLurker(v.v.ctx, X, X, 1, l, i / 60);
      drawLurkerGlow(v.v.ctx, X, X, 1, l, i / 60);
      if (l.state !== 'hide') expect(v.calls.fill ?? 0).toBeGreaterThan(3);
    }
  });
});
