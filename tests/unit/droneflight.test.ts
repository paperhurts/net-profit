import { describe, expect, it } from 'vitest';
import { BEETLES_PER_TRAP, DRONE_COLOURS, TRAP_SPOTS } from '../../src/data/drone';
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
  type TrapEvent,
  type TrapState,
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

  it('drifts on after the flight: made, on and up; flat, slowing to a hover; flying, not at all', () => {
    const made = new DroneFlight();
    made.gates.length = 0;
    fly(made, COURSE / CRUISE + 1);
    const [z, y] = [made.z, made.y];
    made.drift(1);
    expect(made.z).toBeGreaterThan(z + CRUISE * 0.5);
    expect(made.y).toBeGreaterThan(y);
    expect(made.y).toBeLessThan(CANOPY);
    const flat = new DroneFlight(1101, COURSE, 1);
    fly(flat, 2);
    const fz = flat.z;
    flat.drift(1);
    expect(flat.z - fz).toBeGreaterThan(0);
    expect(flat.z - fz).toBeLessThan(CRUISE * 0.3);
    const flying = new DroneFlight();
    flying.drift(1);
    expect(flying.z).toBe(0);
  });

  it('has its trap flowers along the way, each with a way through to it', () => {
    const course = layCourse(1101);
    const traps = course.filter((o) => o.kind === 'trap');
    expect(traps.map((o) => (o.kind === 'trap' ? o.spot : -1))).toEqual([0, 1, 2, 3, 4]);
    expect(traps.length).toBe(TRAP_SPOTS);
    for (const t of traps) {
      if (t.kind !== 'trap') continue;
      expect(Math.abs(t.x)).toBeLessThan(LANE_HALF - DRONE_R);
      expect(t.y).toBeGreaterThan(DRONE_R);
      expect(t.y).toBeLessThan(CANOPY - DRONE_R);
      const gate = course.filter(
        (o) => o.kind !== 'ring' && o.kind !== 'trap' && Math.abs(o.z - t.z) < 1,
      );
      expect(gate.every((o) => !strikes(o, t.x, t.y))).toBe(true);
    }
  });

  /** A flight with only the given trap flower in it, the drone lined up just short of its middle. */
  function atFlower(spot: number, states: TrapState[], carry: number) {
    const f = new DroneFlight();
    const t = f.gates.find((o) => o.kind === 'trap' && o.spot === spot);
    if (t?.kind !== 'trap') throw new Error('no such flower');
    f.gates.length = 0;
    f.gates.push(t);
    f.setTraps(states, carry);
    f.x = t.x;
    f.y = t.y;
    f.z = t.z - 2;
    const said: [number, TrapEvent][] = [];
    f.onTrap = (s, what) => said.push([s, what]);
    fly(f, 0.5);
    return { f, said };
  }

  it('hangs a trap in a flower flown through, and brings a full one home with its beetles', () => {
    const empty: TrapState[] = ['empty', 'empty', 'empty', 'empty', 'empty'];
    const hang = atFlower(1, empty, 2);
    expect(hang.said).toEqual([[1, 'hung']]);
    expect([hang.f.spots[1], hang.f.carry, hang.f.beetles]).toEqual(['hung', 1, 0]);
    const full: TrapState[] = ['empty', 'empty', 'full', 'empty', 'empty'];
    const got = atFlower(2, full, 0);
    expect(got.said).toEqual([[2, 'got']]);
    expect([got.f.spots[2], got.f.carry, got.f.beetles]).toEqual(['empty', 1, BEETLES_PER_TRAP]);
  });

  it('leaves a filling trap be, and says so when it has none to hang; a flower flown past is nothing', () => {
    const filling = atFlower(0, ['hung', 'empty', 'empty', 'empty', 'empty'], 2);
    expect(filling.said).toEqual([[0, 'filling']]);
    expect([filling.f.spots[0], filling.f.carry]).toEqual(['hung', 2]);
    const none = atFlower(3, ['empty', 'empty', 'empty', 'empty', 'empty'], 0);
    expect(none.said).toEqual([[3, 'none']]);
    expect(none.f.spots[3]).toBe('empty');
    const f = new DroneFlight();
    const t = f.gates.find((o) => o.kind === 'trap');
    if (t?.kind !== 'trap') throw new Error('no flower');
    f.gates.length = 0;
    f.gates.push(t);
    f.setTraps(['empty', 'empty', 'empty', 'empty', 'empty'], 3);
    f.x = t.x > 0 ? t.x - 3 : t.x + 3;
    f.y = t.y;
    f.z = t.z - 2;
    fly(f, 0.5);
    expect([f.spots[0], f.carry]).toEqual(['empty', 3]);
  });

  it('is drawn: the jungle, the gates, the drone in each colour, and the bars', () => {
    const { v, calls } = fakeView();
    const f = new DroneFlight();
    for (const [, c] of DRONE_COLOURS) drawDroneFlight(v.ctx, 390, 780, f, c, 1);
    fly(f, 20, 0.3, -0.2);
    f.flash = 0.2;
    drawDroneFlight(v.ctx, 390, 780, f, DRONE_COLOURS[0][1], 2);
    drawDrone(v.ctx, 100, 100, 50, '#E4572E', 1, -1, 3, 0.1);
    // The trap flowers, empty, filling and full, close up.
    for (const st of ['empty', 'hung', 'full'] as const) {
      const g = new DroneFlight();
      const t = g.gates.find((o) => o.kind === 'trap');
      if (!t) throw new Error('no flower');
      g.setTraps([st, st, st, st, st], 1);
      g.z = t.z - 8;
      drawDroneFlight(v.ctx, 390, 780, g, DRONE_COLOURS[2][1], 4);
    }
    expect(calls.fill ?? 0).toBeGreaterThan(100);
    expect(calls.fillText ?? 0).toBeGreaterThan(0);
  });

  it('says so over the jungle when the flight is over, made or flat', () => {
    for (const battery of [BATTERY, 1]) {
      const { v, calls } = fakeView();
      const f = new DroneFlight(1101, COURSE, battery);
      f.gates.length = 0;
      drawDroneFlight(v.ctx, 390, 780, f, DRONE_COLOURS[0][1], 1);
      const flying = calls.fillText ?? 0;
      fly(f, COURSE / CRUISE + 1);
      expect(f.state).toBe(battery === 1 ? 'home' : 'done');
      drawDroneFlight(v.ctx, 390, 780, f, DRONE_COLOURS[0][1], 1);
      expect((calls.fillText ?? 0) - flying).toBe(flying + 2);
    }
  });
});
