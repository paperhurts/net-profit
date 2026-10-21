import { describe, expect, it } from 'vitest';
import { DRONE_COLOURS } from '../../src/data/drone';
import {
  BATTERY,
  BUMP,
  CANOPY,
  COURSE,
  CRUISE,
  DRONE_R,
  DroneFlight,
  LANE_HALF,
  layCourse,
  type Obstacle,
  RUN_IN,
  strikes,
} from '../../src/entities/droneflight';
import { drawDrone, drawDroneFlight } from '../../src/render/droneflight';
import { fakeView } from './helpers/view';

/** Fly it for so long with the stick held at (sx, sy). */
const fly = (f: DroneFlight, secs: number, sx = 0, sy = 0) => {
  for (let t = 0; t < secs - 1e-9 && f.state === 'fly'; t += 1 / 60) f.step(1 / 60, sx, sy);
};

/** Where in a gate's cross-section a drone gets through: a few spots tried, the first clear one. */
function wayThrough(gate: Obstacle[]): { x: number; y: number } | null {
  for (let x = -LANE_HALF + DRONE_R; x <= LANE_HALF - DRONE_R; x += 0.25)
    for (let y = DRONE_R + 0.1; y <= CANOPY - DRONE_R - 0.1; y += 0.25)
      if (gate.every((o) => !strikes(o, x, y))) return { x, y };
  return null;
}

/** A pilot who sees what is coming and steers for a way through it, and for its ring. */
function pilot(f: DroneFlight): [number, number] {
  const ahead = f.gates.filter((o) => o.z > f.z && o.z < f.z + 16);
  const solid = ahead.filter((o) => o.kind !== 'ring');
  if (!solid.length && !ahead.length) return [0, 0];
  const z = Math.min(...ahead.map((o) => o.z));
  const gate = solid.filter((o) => Math.abs(o.z - z) < 1);
  const ring = ahead.find((o) => o.kind === 'ring' && Math.abs(o.z - z) < 1);
  const to =
    ring && ring.kind === 'ring' && gate.every((o) => !strikes(o, ring.x, ring.y)) ? ring : null;
  const way = to ? { x: to.x, y: to.y } : wayThrough(gate);
  if (!way) return [0, 0];
  return [
    Math.max(-1, Math.min(1, (way.x - f.x) * 1.5)),
    Math.max(-1, Math.min(1, (f.y - way.y) * 1.5)),
  ];
}

describe("the drone's flight through the jungle", () => {
  it('lays the same course every time from its seed, and none in the first stretch', () => {
    const a = layCourse(1101);
    const b = layCourse(1101);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(30);
    expect(Math.min(...a.map((o) => o.z))).toBeGreaterThanOrEqual(RUN_IN);
    expect(Math.max(...a.map((o) => o.z))).toBeLessThan(COURSE);
    expect(layCourse(2202)).not.toEqual(a);
  });

  it('leaves a way through every gate, on every course', () => {
    for (const seed of [1101, 2202, 3303, 4404, 5505]) {
      const gates = layCourse(seed).filter((o) => o.kind !== 'ring');
      const byZ = new Map<number, Obstacle[]>();
      for (const o of gates) byZ.set(o.z, [...(byZ.get(o.z) ?? []), o]);
      for (const g of byZ.values()) expect(wayThrough(g)).not.toBe(null);
    }
  });

  it('flies on by itself, and goes where the thumb says, inside the jungle', () => {
    const f = new DroneFlight();
    fly(f, 1);
    expect(f.z).toBeCloseTo(CRUISE, 0);
    expect(f.x).toBeCloseTo(0, 1);
    fly(f, 1.2, 1, 0);
    expect(f.x).toBeGreaterThan(3);
    fly(f, 2, 1, 0);
    expect(f.x).toBeLessThanOrEqual(LANE_HALF - DRONE_R);
    const y = f.y;
    fly(f, 0.4, 0, -1);
    expect(f.y).toBeGreaterThan(y);
    fly(f, 3, 0, 1);
    expect(f.y).toBeGreaterThan(0);
  });

  it('bumps gently: battery and a moment of speed, and it carries on past', () => {
    const f = new DroneFlight();
    f.gates.length = 0;
    f.gates.push({ kind: 'log', z: 10, top: 4 });
    let bumps = 0;
    f.onBump = () => bumps++;
    fly(f, 1.2);
    expect(bumps).toBe(1);
    expect(f.state).toBe('fly');
    expect(f.z).toBeGreaterThan(10);
    expect(f.battery).toBeLessThan(BATTERY - BUMP + 0.01);
    expect(f.battery).toBeGreaterThan(BATTERY - BUMP - 5);
  });

  it('counts a ring flown through its middle, and not one flown past', () => {
    const f = new DroneFlight();
    f.gates.length = 0;
    f.gates.push({ kind: 'ring', z: 8, x: f.x, y: f.y, got: false });
    f.gates.push({ kind: 'ring', z: 16, x: 4, y: 4, got: false });
    fly(f, 1.5);
    expect(f.rings).toBe(1);
  });

  it('turns for home when its battery runs out, and is made at the end of the course', () => {
    const empty = new DroneFlight(1101, COURSE, 3);
    let ended = '';
    empty.onEnd = (s) => {
      ended = s;
    };
    fly(empty, 5);
    expect([empty.state, ended]).toEqual(['home', 'home']);
    const f = new DroneFlight();
    f.gates.length = 0;
    fly(f, COURSE / CRUISE + 1);
    expect(f.state).toBe('done');
  });

  it('is flown through by a pilot who steers for the gaps, with battery to spare and most of the rings', () => {
    for (const seed of [1101, 2202, 3303]) {
      const f = new DroneFlight(seed);
      for (let t = 0; t < 120 && f.state === 'fly'; t += 1 / 60) {
        const [sx, sy] = pilot(f);
        f.step(1 / 60, sx, sy);
      }
      expect(f.state).toBe('done');
      expect(f.battery).toBeGreaterThan(20);
      expect(f.rings).toBeGreaterThan(f.ringsOut / 2);
    }
  });

  it('is drawn: the jungle, the gates, the drone in each colour, and the bars', () => {
    const { v, calls } = fakeView();
    const f = new DroneFlight();
    for (const [, c] of DRONE_COLOURS) drawDroneFlight(v.ctx, 390, 780, f, c, 1);
    fly(f, 20, 0.3, -0.2);
    f.flash = 0.2;
    drawDroneFlight(v.ctx, 390, 780, f, DRONE_COLOURS[0][1], 2);
    drawDrone(v.ctx, 100, 100, 50, '#E4572E', 1, -1, 3, 0.1);
    expect(calls.fill ?? 0).toBeGreaterThan(100);
    expect(calls.fillText ?? 0).toBeGreaterThan(0);
  });
});
