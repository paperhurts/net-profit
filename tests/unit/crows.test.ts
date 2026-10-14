import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { answers, SCIENCE } from '../../src/data/science';
import {
  ARRIVE_GAP,
  CROW_SPOTS,
  CROWS,
  Crows,
  FLY_FROM,
  FLY_HIGH,
  PETTED_T,
  TRAY_Z,
} from '../../src/entities/crows';
import { onPrairie } from '../../src/entities/prairie10';
import { blocked } from '../../src/entities/walker';
import { FEEDER10, OLDMAN10, regionAt, STORE10 } from '../../src/world/isle10';
import { baseWorld } from './helpers/world';

const FIG = { x: FEEDER10.x + 30, y: FEEDER10.y + 30 };
const BOAT = { x: FEEDER10.x + 150, y: FEEDER10.y + 260, h: -Math.PI / 2, v: 0 };
const world = () => baseWorld({ figure: { ...FIG, vx: 0, vy: 0 }, ashore: FIG, boat: BOAT });
const run = (c: Crows, s: number) => {
  for (let t = 0; t < s; t += 1 / 60) c.update(1 / 60, world());
};

describe("the crows' science questions", () => {
  it('has a good few, each with a right answer, two different wrong ones and a fact', () => {
    expect(SCIENCE.length).toBeGreaterThanOrEqual(25);
    for (const q of SCIENCE) {
      expect(q.q.length).toBeGreaterThan(8);
      expect(q.right.length).toBeGreaterThan(0);
      expect(q.fact.length).toBeGreaterThan(10);
      expect(new Set([q.right, ...q.wrong]).size).toBe(3);
      for (const w of q.wrong) expect(w.length).toBeGreaterThan(0);
    }
    expect(new Set(SCIENCE.map((q) => q.q)).size).toBe(SCIENCE.length);
  });

  it('answers come shuffled: all three, the right one among them, and in more than one order', () => {
    const r = rng(7);
    const orders = new Set<string>();
    for (const q of SCIENCE) {
      const a = answers(q, r);
      expect(a).toHaveLength(3);
      expect(new Set(a)).toEqual(new Set([q.right, ...q.wrong]));
      orders.add(String(a.indexOf(q.right)));
    }
    expect(orders.size).toBe(3);
  });
});

describe("island 10's birdfeeder and its crows", () => {
  it('the feeder stands on the prairie past the porch, its pole in the way, the animals kept off it', () => {
    expect(regionAt(FEEDER10.x, FEEDER10.y)).toBe('prairie');
    const d = Math.hypot(FEEDER10.x - STORE10.x, FEEDER10.y - STORE10.y);
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(90);
    expect(Math.hypot(FEEDER10.x - OLDMAN10.x, FEEDER10.y - OLDMAN10.y)).toBeGreaterThan(50);
    expect(blocked(FEEDER10.x, FEEDER10.y, 0)).toBe(true);
    expect(blocked(FIG.x, FIG.y, 0)).toBe(false);
    expect(onPrairie(FEEDER10.x + 10, FEEDER10.y + 10)).toBe(false);
  });

  it('has a spot on the tray and more on the grass round the pole, clear of it', () => {
    expect(CROW_SPOTS.length).toBeGreaterThan(CROWS);
    expect(CROW_SPOTS[0]?.z).toBe(TRAY_Z);
    for (const s of CROW_SPOTS.slice(1)) {
      expect(s.z).toBe(0);
      const d = Math.hypot(s.x - FEEDER10.x, s.y - FEEDER10.y);
      expect(d).toBeGreaterThan(10);
      expect(d).toBeLessThan(30);
      expect(blocked(s.x, s.y, 0)).toBe(false);
    }
  });

  it('flies in from out over the forest, one after another, and settles at the feeder', () => {
    const c = new Crows(rng(3));
    let caws = 0;
    c.onCaw = () => caws++;
    c.come(CROWS, true);
    expect(c.list).toHaveLength(CROWS);
    for (const k of c.list) {
      expect(k.state).toBe('wait');
      expect(k.z).toBe(FLY_HIGH);
      expect(FEEDER10.y - k.y).toBeGreaterThan(FLY_FROM - 60);
    }
    run(c, ARRIVE_GAP * 0.5);
    expect(c.list.map((k) => k.state)).toEqual(['fly', 'wait', 'wait']);
    run(c, 9);
    for (const k of c.list) expect(['peck', 'hop']).toContain(k.state);
    expect(caws).toBeGreaterThanOrEqual(CROWS);
    expect(c.wild).toHaveLength(CROWS);
  });

  it('at the feeder already on a later visit: only the ones not yet won', () => {
    const c = new Crows(rng(3));
    c.come(1, false);
    expect(c.list).toHaveLength(1);
    expect(c.list[0]?.state).toBe('peck');
    expect(c.list[0]?.z).toBe(TRAY_Z);
    c.clear();
    expect(c.list).toHaveLength(0);
  });

  it('hops about between the spots, never two on one, and lands right on them', () => {
    const c = new Crows(rng(9));
    c.come(CROWS, false);
    let hops = 0;
    for (let t = 0; t < 40; t += 1 / 60) {
      const was = c.list.map((k) => k.state);
      c.update(1 / 60, world());
      c.list.forEach((k, i) => {
        if (k.state === 'hop' && was[i] !== 'hop') hops++;
      });
      const at = c.list.map((k) => k.spot);
      expect(new Set(at).size).toBe(at.length);
    }
    expect(hops).toBeGreaterThan(6);
    for (const k of c.list) {
      if (k.state !== 'peck') continue;
      const s = CROW_SPOTS[k.spot];
      expect(k.x).toBeCloseTo(s?.x ?? 0, 5);
      expect(k.z).toBeCloseTo(s?.z ?? 0, 5);
    }
  });

  it('asked, it turns to the figure and waits; calmed, it goes back to pecking', () => {
    const c = new Crows(rng(4));
    c.come(CROWS, false);
    expect(c.nearest(FIG.x, FIG.y, 90)).toBeGreaterThanOrEqual(0);
    expect(c.nearest(FIG.x + 500, FIG.y, 90)).toBe(-1);
    expect(c.ask(1)).toBe(true);
    run(c, 20);
    const k = c.list[1];
    expect(k?.state).toBe('ask');
    // The figure is to the right of it on the screen (dx - dy > 0).
    expect(k?.face).toBe(Math.sign(FIG.x - (k?.x ?? 0) - (FIG.y - (k?.y ?? 0))));
    c.calm();
    expect(k?.state).toBe('peck');
  });

  it('petted: hearts a moment, then it flies off to the boat and is gone from the feeder', () => {
    const c = new Crows(rng(5));
    c.come(CROWS, false);
    expect(c.pet(2)).toBe(true);
    expect(c.pet(2)).toBe(false);
    expect(c.flying).toBe(1);
    expect(c.wild).toHaveLength(CROWS - 1);
    expect(c.nearest(c.list[2]?.x ?? 0, c.list[2]?.y ?? 0, 1)).not.toBe(2);
    run(c, PETTED_T * 0.9);
    expect(c.list[2]?.state).toBe('petted');
    run(c, 0.3);
    expect(c.list[2]?.state).toBe('leave');
    run(c, 6);
    expect(c.list[2]?.state).toBe('gone');
    expect(c.flying).toBe(0);
    expect(c.wild).toHaveLength(CROWS - 1);
  });

  it('flying in, it can be neither asked nor petted', () => {
    const c = new Crows(rng(6));
    c.come(CROWS, true);
    run(c, 0.2);
    expect(c.ask(0)).toBe(false);
    expect(c.pet(0)).toBe(false);
    expect(c.nearest(FEEDER10.x, FEEDER10.y, 2000)).toBe(-1);
  });
});
