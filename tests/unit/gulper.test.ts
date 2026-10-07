import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { SPEED } from '../../src/data/tuning';
import { steerBoat } from '../../src/entities/boat';
import type { World } from '../../src/entities/entity';
import { Gulper, HUNT_MAX, inZone, REST, ZONE } from '../../src/entities/gulper';
import { WS } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
/** The stick's screen vector for a world direction. */
const stick = (wx: number, wy: number): [number, number] => {
  const sx = wx - wy;
  const sy = (wx + wy) / 2;
  const n = Math.hypot(sx, sy) || 1;
  return [sx / n, sy / n];
};

/** A gulper somewhere in its water and a flagship somewhere near it, sailing through. */
function encounter(r: () => number) {
  const g = new Gulper();
  g.x = ZONE.x0 + r() * (ZONE.x1 - ZONE.x0);
  g.y = ZONE.y0 + r() * (ZONE.y1 - ZONE.y0);
  for (const b of g.body) {
    b.x = g.x;
    b.y = g.y;
  }
  const a = r() * Math.PI * 2;
  const d = 500 + r() * 380;
  const w = baseWorld({
    hullScale: 1.6,
    boat: {
      x: Math.min(WS + 1150, Math.max(WS + 20, g.x + Math.cos(a) * d)),
      y: g.y + Math.sin(a) * d,
      h: r() * Math.PI * 2,
      v: 250,
    },
  });
  return { g, w };
}

/** Play one encounter with a person who reacts after `react` seconds by doing `plan`; how many bites. */
function play(g: Gulper, w: World, react: number, plan: 'away' | 'still'): number {
  let bites = 0;
  let hunted = -1;
  let t = 0;
  g.onBite = () => bites++;
  g.onHunt = () => {
    hunted = t;
  };
  for (; t < HUNT_MAX + 2 && bites < 3; t += DT) {
    g.update(DT, w);
    let ix = 0;
    let iy = 0;
    if (plan === 'away' && hunted >= 0 && t - hunted > react)
      [ix, iy] = stick(w.boat.x - g.x, w.boat.y - g.y);
    steerBoat(w.boat, ix, iy, SPEED[5], DT);
    w.boat.x = Math.min(WS + 1160, w.boat.x);
  }
  return bites;
}

describe('the gulper', () => {
  it('prowls its own stretch of the deep and nowhere else', () => {
    const g = new Gulper();
    const w = baseWorld({ rng: rng(4), boat: { x: 2400, y: 2400, h: 0, v: 0 } });
    for (let i = 0; i < 180 / DT; i++) {
      g.update(DT, w);
      expect(inZone(g.x, g.y, 120)).toBe(true);
    }
    expect(g.state).toBe('prowl');
  });

  it('never hunts a boat in the home water, however close', () => {
    const g = new Gulper();
    g.x = ZONE.x0;
    const w = baseWorld({ boat: { x: WS - 60, y: g.y, h: 0, v: 0 } });
    for (let i = 0; i < 5 / DT; i++) g.update(DT, w);
    expect(g.state).toBe('prowl');
  });

  it('eats a boat that sits still: three bites', () => {
    const r = rng(5);
    let eaten = 0;
    for (let e = 0; e < 60; e++) {
      const { g, w } = encounter(r);
      if (play(g, w, 0, 'still') >= 3) eaten++;
    }
    expect(eaten).toBeGreaterThan(40);
  });

  it('never eats a person who runs from it, a third or half a second late, and seldom bites one', () => {
    for (const react of [1 / 3, 1 / 2]) {
      const r = rng(5);
      let bites = 0;
      for (let e = 0; e < 120; e++) {
        const { g, w } = encounter(r);
        const n = play(g, w, react, 'away');
        expect(n, `eaten at ${react}`).toBeLessThan(3);
        bites += n;
      }
      expect(bites, `bites at ${react}`).toBeLessThan(12);
    }
  });

  it('gives up when the boat crosses home, and rests before it hunts again', () => {
    const g = new Gulper();
    const w = baseWorld({ boat: { x: g.x + 400, y: g.y, h: 0, v: 0 } });
    let gaveUp = 0;
    g.onGiveUp = () => gaveUp++;
    g.update(DT, w);
    expect(g.state).toBe('hunt');
    w.boat.x = WS - 100;
    g.update(DT, w);
    expect(g.state).toBe('rest');
    expect(gaveUp).toBe(1);
    w.boat.x = g.x + 300;
    for (let i = 0; i < (REST - 1) / DT; i++) g.update(DT, w);
    expect(g.state).not.toBe('hunt');
  });

  it('draws its body under the water, its mouth when it is up, its tail light, and marks itself when hunting off screen', () => {
    const g = new Gulper();
    const fake = fakeView();
    g.draw(fake.v, 'underwater');
    expect(fake.calls.isoEllipse).toBe(g.body.length);
    g.up = 1;
    g.draw(fake.v, 'afloat');
    expect(fake.calls.isoEllipse).toBe(g.body.length + 2);
    g.draw(fake.v, 'glow');
    expect(fake.calls.glow).toBe(1);
    fake.onScreen = false;
    g.state = 'hunt';
    g.draw(fake.v, 'overlay');
    expect(fake.calls.indicator).toBe(1);
  });
});
