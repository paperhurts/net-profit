import { describe, expect, it } from 'vitest';
import { angDiff, rng } from '../../src/core/math';
import { PIRATE_SPEED, PIRATE_UNLOCK } from '../../src/data/tuning';
import { CHASE_RADIUS, Pirate, type PirateWorld, SAFE_RADIUS } from '../../src/entities/pirate';
import { steerShip } from '../../src/entities/ship';
import { DOCK, IX, IY, nearestEdgeExit, WS } from '../../src/world/island';
import { baseWorld } from './helpers/world';

const world = (over: Partial<PirateWorld> = {}): PirateWorld =>
  baseWorld({
    boat: { x: IX - 1200, y: IY + 300, h: 0, v: 0 },
    rng: rng(11),
    earned: PIRATE_UNLOCK,
    holdTotal: 8,
    ...over,
  });

const run = (p: Pirate, w: PirateWorld, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 30) p.update(1 / 30, w);
};

describe('steerShip', () => {
  it('turns no faster than the rate and moves along its heading', () => {
    const s = { x: 0, y: 0, h: 0, v: 100 };
    steerShip(s, 0, 1000, 150, 1.7, 0.1);
    expect(s.h).toBeCloseTo(0.17);
    expect(s.x).toBeGreaterThan(0);
    expect(s.y).toBeGreaterThan(0);
  });
  it('throttles down through a hard turn but never below thirty percent', () => {
    const s = { x: 0, y: 0, h: 0, v: 0 };
    for (let i = 0; i < 20; i++) steerShip(s, -1000, 0, 100, 0.001, 1 / 60);
    expect(s.v).toBeGreaterThan(0);
    expect(s.v).toBeLessThan(30);
  });
});

describe('nearestEdgeExit', () => {
  it('points just past the closest side of the world', () => {
    expect(nearestEdgeExit(100, 2000)).toEqual([-260, 2000]);
    expect(nearestEdgeExit(WS - 50, 2000)).toEqual([WS + 260, 2000]);
    expect(nearestEdgeExit(2000, 30)).toEqual([2000, -260]);
    expect(nearestEdgeExit(2000, WS - 10)).toEqual([2000, WS + 260]);
  });
});

describe('Pirate', () => {
  it('stays away until the player has earned enough', () => {
    const p = new Pirate();
    run(p, world({ earned: PIRATE_UNLOCK - 1 }), 20);
    expect(p.ship.state).toBe('away');
    expect(p.visible).toBe(false);
  });

  it('sails in from an edge, well away from the boat, when its timer runs out', () => {
    const p = new Pirate();
    const w = world();
    run(p, w, 6.1);
    expect(p.ship.state).toBe('prowl');
    const s = p.ship;
    const offEdge = s.x <= 0 || s.x >= WS || s.y <= 0 || s.y >= WS;
    // It may have moved a step already; the spawn was off an edge.
    expect(offEdge || s.age < 0.5).toBe(true);
    expect(Math.hypot(s.x - w.boat.x, s.y - w.boat.y)).toBeGreaterThan(700);
  });

  it('chases a laden boat away from the dock and calls the chase once', () => {
    const p = new Pirate();
    const w = world();
    run(p, w, 6.1);
    p.ship.x = w.boat.x + CHASE_RADIUS - 50;
    p.ship.y = w.boat.y;
    let chases = 0;
    p.onChase = () => chases++;
    run(p, w, 1);
    expect(p.ship.state).toBe('chase');
    expect(chases).toBe(1);
  });

  it('will not chase a near-empty hold or a boat sheltering by the dock', () => {
    for (const over of [
      { holdTotal: 3 },
      { boat: { x: DOCK.x + SAFE_RADIUS - 20, y: DOCK.y, h: 0, v: 0 } },
    ]) {
      const p = new Pirate();
      const w = world(over);
      run(p, w, 6.1);
      p.ship.x = w.boat.x + 300;
      p.ship.y = w.boat.y;
      run(p, w, 1);
      expect(p.ship.state).toBe('prowl');
    }
  });

  it('steals half the hold on contact and then leaves', () => {
    const p = new Pirate();
    const w = world({ holdTotal: 9 });
    run(p, w, 6.1);
    p.ship.x = w.boat.x + 300;
    p.ship.y = w.boat.y;
    run(p, w, 0.5);
    expect(p.ship.state).toBe('chase');
    let stolen = 0;
    p.onSteal = (n) => (stolen = n);
    p.ship.x = w.boat.x + 10;
    p.ship.y = w.boat.y;
    p.update(1 / 30, w);
    expect(stolen).toBe(5);
    expect(p.ship.state).toBe('leave');
  });

  it('breaks off a chase when the boat reaches the dock, and gives up prowling after fifty seconds', () => {
    const p = new Pirate();
    const w = world();
    run(p, w, 6.1);
    p.ship.x = w.boat.x + 300;
    p.ship.y = w.boat.y;
    run(p, w, 0.5);
    expect(p.ship.state).toBe('chase');
    w.boat.x = DOCK.x;
    w.boat.y = DOCK.y;
    p.update(1 / 30, w);
    expect(p.ship.state).toBe('prowl');
    run(p, world({ holdTotal: 0, boat: { x: 100, y: 100, h: 0, v: 0 } }), 55);
    expect(['leave', 'away']).toContain(p.ship.state);
  });

  it('leaves by the nearest edge and goes away for half a minute or more', () => {
    const p = new Pirate();
    const w = world({ holdTotal: 0 });
    run(p, w, 6.1);
    p.ship.state = 'leave';
    p.ship.x = 300;
    p.ship.y = IY;
    for (let t = 0; t < 8 && p.visible; t += 1 / 30) p.update(1 / 30, w);
    expect(p.ship.state).toBe('away');
    expect(p.ship.timer).toBeGreaterThanOrEqual(28);
    expect(p.ship.timer).toBeLessThan(48);
  });

  it('turns and moves like the prototype ship model', () => {
    const p = new Pirate();
    const w = world({ holdTotal: 0 });
    run(p, w, 6.1);
    const before = { ...p.ship };
    p.update(1 / 30, w);
    expect(Math.abs(angDiff(p.ship.h, before.h))).toBeLessThanOrEqual(1.7 / 30 + 1e-9);
    expect(p.ship.v).toBeLessThanOrEqual(PIRATE_SPEED);
  });
});
