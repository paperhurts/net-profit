import { describe, expect, it } from 'vitest';
import {
  GORILLA_HOMES,
  GORILLA_HP,
  GORILLA_LEASH,
  GORILLA_SLAM,
  GORILLA_SPEED,
  GORILLA_WAKE,
  GORILLA_WARN,
  GORILLA_WINDUP,
  type Gorilla,
  Gorillas,
  SLAM_R,
} from '../../src/entities/gorillas';
import { WALK_SPEED } from '../../src/entities/walker';
import { onIsle10Ground, regionAt } from '../../src/world/isle10';
import { baseWorld } from './helpers/world';

type At = { x: number; y: number } | null;
const step = (g: Gorillas, at: At) =>
  g.update(1 / 60, baseWorld({ figure: at ? { ...at, vx: 0, vy: 0 } : null }));
const run = (g: Gorillas, s: number, at: () => At) => {
  for (let t = 0; t < s; t += 1 / 60) step(g, at());
};
const until = (g: Gorillas, q: Gorilla, state: string, s: number, at: () => At) => {
  for (let t = 0; t < s && q.state !== state; t += 1 / 60) step(g, at());
};

describe("island 10's gorillas", () => {
  it('a troop of three sits in the forest, one of them a silverback', () => {
    expect(GORILLA_HOMES).toHaveLength(3);
    for (const [x, y] of GORILLA_HOMES) {
      expect(regionAt(x, y)).toBe('forest');
      expect(onIsle10Ground(x, y)).toBe(true);
    }
    const g = new Gorillas();
    expect(g.list.filter((q) => q.silver)).toHaveLength(1);
    expect(g.list.every((q) => q.state === 'sit' && q.hp === GORILLA_HP)).toBe(true);
    expect(GORILLA_SPEED).toBeLessThan(WALK_SPEED * 0.6);
  });

  it('one woken beats its chest, and so does the troop near it; then they come on', () => {
    const g = new Gorillas();
    const q = g.list[0] as Gorilla;
    let warns = 0;
    g.onWarn = () => warns++;
    const far = { x: q.x + GORILLA_WAKE + 40, y: q.y };
    run(g, 1, () => far);
    expect(q.state).toBe('sit');
    const near = { x: q.x + GORILLA_WAKE - 20, y: q.y };
    step(g, near);
    expect(q.state).toBe('warn');
    expect(warns).toBeGreaterThanOrEqual(2);
    run(g, GORILLA_WARN + 0.1, () => near);
    expect(q.state).toBe('chase');
  });

  it('rears up with a ring where its fists will land: three hearts in it, none for a figure that steps out', () => {
    const g = new Gorillas();
    const q = g.list[0] as Gorilla;
    let hearts = 0;
    g.onHit = (n) => (hearts += n);
    const spot = { x: q.x + 60, y: q.y };
    until(g, q, 'windup', 6, () => spot);
    expect(q.state).toBe('windup');
    expect(Math.hypot(spot.x - q.slamAt[0], spot.y - q.slamAt[1])).toBeLessThan(SLAM_R);
    run(g, GORILLA_WINDUP + 0.05, () => spot);
    expect(hearts).toBe(GORILLA_SLAM);
    // Again, stepping out of the ring while the fists are up.
    const h = new Gorillas();
    const r = h.list[0] as Gorilla;
    let hurt = 0;
    h.onHit = (n) => (hurt += n);
    until(h, r, 'windup', 6, () => spot);
    const out = { x: r.slamAt[0] + SLAM_R + 25, y: r.slamAt[1] + SLAM_R };
    run(h, GORILLA_WINDUP + 0.05, () => out);
    expect(hurt).toBe(0);
  });

  it('seven hits beat one, which tumbles off; tar spoils a slam; all back on a visit', () => {
    const g = new Gorillas();
    const q = g.list[1] as Gorilla;
    let beaten = 0;
    g.onBeaten = () => beaten++;
    expect(g.nearest(q.x + 50, q.y, 100)).toBe(null);
    expect(g.nearest(q.x + 50, q.y, 100, true)).toBe(q);
    g.hit(q, 1);
    expect(q.state).toBe('warn');
    for (let i = 1; i < GORILLA_HP; i++) g.hit(q, 1);
    expect(q.state).toBe('fall');
    expect(beaten).toBe(1);
    expect(g.hit(q, 1)).toBe(false);
    run(g, 2, () => null);
    expect(q.state).toBe('gone');
    const r = g.list[0] as Gorilla;
    const spot = { x: r.x + 50, y: r.y };
    until(g, r, 'windup', 8, () => spot);
    g.stun(r, 2);
    expect(r.state).toBe('chase');
    g.reset();
    expect(g.list.every((o) => o.state === 'sit' && o.hp === GORILLA_HP)).toBe(true);
  });

  it('gives up on a figure far from its patch, and goes back and sits down', () => {
    const g = new Gorillas();
    const q = g.list[0] as Gorilla;
    run(g, 1.2, () => ({ x: q.home[0] + 80, y: q.home[1] }));
    expect(Gorillas.up(q)).toBe(true);
    run(g, 12, () => ({ x: q.home[0] + GORILLA_LEASH + 200, y: q.home[1] }));
    expect(q.state).toBe('sit');
    expect(Math.hypot(q.x - q.home[0], q.y - q.home[1])).toBeLessThan(4);
  });
});
