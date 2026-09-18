import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import {
  createPods,
  Dolphins,
  ESCORT_BREAK,
  ESCORT_RADIUS,
  ESCORT_SECONDS,
  type Pod,
  podWaypoint,
} from '../../src/entities/dolphins';
import type { World } from '../../src/entities/entity';
import { IR, IX, IY, WS } from '../../src/world/island';
import { baseWorld } from './helpers/world';

const world = (over: Partial<World> = {}): World =>
  baseWorld({ boat: { x: IX + 1500, y: IY, h: 0, v: 200 }, rng: rng(5), ...over });

const step = (d: Dolphins, w: World, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) d.update(1 / 60, w);
};

describe('pods', () => {
  it('start as two pods of three, off the island, with waypoints inside the world', () => {
    const pods = createPods();
    expect(pods).toHaveLength(2);
    for (const p of pods) {
      expect(p.d).toHaveLength(3);
      expect(Math.hypot(p.x - IX, p.y - IY)).toBeGreaterThan(IR);
      podWaypoint(p, rng(1));
      expect(p.tx).toBeGreaterThanOrEqual(200);
      expect(p.tx).toBeLessThanOrEqual(WS - 200);
      expect(p.ty).toBeGreaterThanOrEqual(200);
      expect(p.ty).toBeLessThanOrEqual(WS - 200);
    }
  });
});

describe('Dolphins', () => {
  it('roam toward their waypoints and never onto the island', () => {
    const d = new Dolphins(rng(2));
    const w = world({ boat: { x: 100, y: 100, h: 0, v: 0 } });
    step(d, w, 60);
    for (const p of d.pods)
      expect(Math.hypot(p.x - IX, p.y - IY)).toBeGreaterThanOrEqual(IR + 95 - 1);
  });

  it('join a fast boat that passes close, whistle once, and keep sharks off while near', () => {
    const d = new Dolphins(rng(3));
    const pod = d.pods[0] as Pod;
    const w = world();
    // Put a pod beside the moving boat and let it notice.
    pod.x = w.boat.x + 200;
    pod.y = w.boat.y;
    let escorts = 0;
    d.onEscort = () => escorts++;
    step(d, w, 1);
    expect(pod.state).toBe('escort');
    expect(escorts).toBe(1);
    expect(d.escorted).toBe(true);
  });

  it('do not join a slow or docked boat', () => {
    for (const over of [{ boat: { x: IX + 1500, y: IY, h: 0, v: 30 } }, { docked: true }]) {
      const d = new Dolphins(rng(4));
      const pod = d.pods[0] as Pod;
      const w = world(over);
      pod.x = w.boat.x + 100;
      pod.y = w.boat.y;
      step(d, w, 2);
      expect(pod.state).toBe('roam');
    }
  });

  it('give up the escort after thirty seconds, at the dock, or when left far behind', () => {
    const cases: [string, (w: World) => void][] = [
      ['time', () => {}],
      ['dock', (w) => (w.docked = true)],
      [
        'distance',
        (w) => {
          w.boat.x += ESCORT_BREAK + 500;
        },
      ],
    ];
    for (const [, tweak] of cases) {
      const d = new Dolphins(rng(6));
      const pod = d.pods[0] as Pod;
      const w = world();
      pod.x = w.boat.x + 200;
      pod.y = w.boat.y;
      step(d, w, 1);
      expect(pod.state).toBe('escort');
      tweak(w);
      step(d, w, ESCORT_SECONDS + 1);
      expect(pod.state).toBe('roam');
      expect(pod.cool).toBeGreaterThan(0);
    }
  });

  it('only counts as an escort while within reach of the boat', () => {
    const d = new Dolphins(rng(7));
    const pod = d.pods[0] as Pod;
    const w = world();
    pod.x = w.boat.x + 200;
    pod.y = w.boat.y;
    step(d, w, 1);
    expect(d.escorted).toBe(true);
    pod.x = w.boat.x + ESCORT_RADIUS + 100;
    d.update(1 / 60, w);
    expect(d.escorted).toBe(false);
  });
});
