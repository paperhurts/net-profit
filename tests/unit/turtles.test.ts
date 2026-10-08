import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import type { World } from '../../src/entities/entity';
import {
  BREATHE_EVERY,
  DIVE,
  FRIENDLY,
  GENTLE,
  REST,
  SPOOK,
  TURTLE_BAND,
  TURTLES,
  type Turtle,
  Turtles,
  WITH_MAX,
} from '../../src/entities/turtles';
import { IR, IX, IY } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 30;
const run = (e: Turtles, w: World, seconds: number, each?: () => void) => {
  for (let i = 0; i < seconds / DT; i++) {
    each?.();
    e.update(DT, w);
  }
};
const fromIsland = (t: Turtle) => Math.hypot(t.x - IX, t.y - IY);
/** One turtle in a world of its own, with the boat put where the test wants it. */
const one = (over: Partial<World> = {}) => {
  const e = new Turtles(rng(3), 1);
  const t = e.turtles[0] as Turtle;
  // Out of the boat's way until the test brings it near.
  const w = baseWorld({ hullScale: 1.6, boat: { x: IX - 2000, y: IY, h: 0, v: 0 }, ...over });
  return { e, t, w };
};
/** The boat sailing straight at speed v. */
const sail = (w: World) => () => {
  w.boat.x += Math.cos(w.boat.h) * w.boat.v * DT;
  w.boat.y += Math.sin(w.boat.h) * w.boat.v * DT;
};

describe('the turtles', () => {
  it('paddle the inner rings, never up onto the island, and come up to breathe', () => {
    const e = new Turtles(rng(1));
    expect(e.turtles).toHaveLength(TURTLES);
    const w = baseWorld({ boat: { x: IX + 3000, y: IY, h: 0, v: 0 } });
    const highest = new Map<Turtle, number>();
    let lo = Infinity;
    let hi = 0;
    run(e, w, 240, () => {
      for (const t of e.turtles) {
        highest.set(t, Math.max(highest.get(t) ?? 0, t.up));
        lo = Math.min(lo, fromIsland(t));
        hi = Math.max(hi, fromIsland(t));
      }
    });
    expect(lo).toBeGreaterThan(IR + 40);
    expect(hi).toBeLessThan(TURTLE_BAND[1] + 120);
    // Every one of them came up for air at least once in four minutes.
    for (const t of e.turtles) expect(highest.get(t)).toBeGreaterThan(0.9);
    expect(BREATHE_EVERY[0] + BREATHE_EVERY[1]).toBeLessThan(60);
  });

  it('swims alongside a boat that comes up slowly, and keeps beside it as it sails on', () => {
    const { e, t, w } = one();
    let joined = 0;
    e.onJoin = () => joined++;
    w.boat.x = t.x - FRIENDLY * 0.6;
    w.boat.y = t.y;
    w.boat.h = 0;
    w.boat.v = GENTLE * 0.8;
    run(e, w, 0.2, sail(w));
    expect(joined).toBe(1);
    expect(t.state).toBe('with');
    expect(e.companion).toBe(t);
    let far = 0;
    run(e, w, 12, () => {
      sail(w)();
      if (Math.hypot(t.x - w.boat.x, t.y - w.boat.y) > 120) far++;
    });
    // After a moment to catch up, it stays on the beam.
    expect(far).toBeLessThan(30 * 3);
    expect(Math.hypot(t.x - w.boat.x, t.y - w.boat.y)).toBeLessThan(100);
    expect(t.up).toBeGreaterThan(0.5);
  });

  it('swims off when the boat speeds up, or after a while, and keeps to itself a time after', () => {
    const { e, t, w } = one();
    const left: boolean[] = [];
    e.onLeave = (_t, spooked) => left.push(spooked);
    w.boat.x = t.x - 60;
    w.boat.y = t.y;
    w.boat.v = 60;
    run(e, w, 1, sail(w));
    expect(t.state).toBe('with');
    w.boat.v = SPOOK + 40;
    run(e, w, 0.2, sail(w));
    expect(left).toEqual([true]);
    expect(t.state).toBe('dive');
    expect(t.cool).toBeGreaterThan(REST - 1);
    // Slow again right beside it once it has surfaced from the dive: not yet.
    w.boat.v = 0;
    run(e, w, DIVE);
    expect(t.state).toBe('cruise');
    w.boat.v = 40;
    w.boat.x = t.x - 40;
    w.boat.y = t.y;
    run(e, w, 1);
    expect(t.state).toBe('cruise');
    // A long slow sail together ends on its own.
    const b = one();
    let gone = 0;
    b.e.onLeave = () => gone++;
    b.w.boat.x = b.t.x - 60;
    b.w.boat.y = b.t.y;
    b.w.boat.v = 40;
    run(b.e, b.w, WITH_MAX + 2, sail(b.w));
    expect(gone).toBe(1);
  });

  it('ducks away from a boat that comes at it fast, and never swims with one that is docked or before the start', () => {
    const { e, t, w } = one();
    let spooked = 0;
    let joined = 0;
    e.onSpook = () => spooked++;
    e.onJoin = () => joined++;
    w.boat.x = t.x - 200;
    w.boat.y = t.y;
    w.boat.h = 0;
    w.boat.v = SPOOK + 60;
    run(e, w, 1, sail(w));
    expect(spooked).toBe(1);
    expect(joined).toBe(0);
    expect(t.state).toBe('dive');
    expect(t.up).toBeLessThan(0.4);
    w.boat.v = 0;
    run(e, w, DIVE);
    expect(t.state).toBe('cruise');
    for (const over of [{ docked: true }, { started: false }]) {
      const o = one(over);
      let n = 0;
      o.e.onJoin = () => n++;
      o.w.boat.x = o.t.x - 50;
      o.w.boat.y = o.t.y;
      o.w.boat.v = 20;
      run(o.e, o.w, 2);
      expect(n).toBe(0);
    }
  });

  it('is sighted once, when the boat is near one at the surface', () => {
    const { e, t, w } = one();
    let seen = 0;
    e.onSight = () => seen++;
    w.boat.x = t.x - 250;
    w.boat.y = t.y;
    w.boat.v = 0;
    run(e, w, BREATHE_EVERY[0] + BREATHE_EVERY[1] + 4, () => {
      w.boat.x = t.x - 250;
      w.boat.y = t.y;
    });
    expect(seen).toBe(1);
  });

  it('draws a shadow when deep, and the turtle and its breath at the surface', () => {
    const e = new Turtles(rng(2), 1);
    const t = e.turtles[0] as Turtle;
    t.up = 0.1;
    const deep = fakeView();
    e.draw(deep.v, 'underwater');
    e.draw(deep.v, 'afloat');
    expect(deep.calls.fill ?? 0).toBeGreaterThan(4);
    const top = fakeView();
    t.up = 1;
    t.air = 2.3;
    e.draw(top.v, 'underwater');
    const before = top.calls.fill ?? 0;
    e.draw(top.v, 'afloat');
    expect((top.calls.fill ?? 0) - before).toBeGreaterThan(8);
    expect(top.calls.stroke ?? 0).toBeGreaterThan(0);
    const away = fakeView();
    away.onScreen = false;
    e.draw(away.v, 'underwater');
    e.draw(away.v, 'afloat');
    expect(away.calls.fill ?? 0).toBe(0);
  });
});
