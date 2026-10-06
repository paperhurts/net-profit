import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { SPEED } from '../../src/data/tuning';
import { steerBoat } from '../../src/entities/boat';
import {
  AWAKE_MAX,
  CALM,
  Cthuluviathan,
  DROWSY,
  GRACE,
  LAIR,
  MARK_RADIUS,
  REACH,
  SIGHT_RADIUS,
  SNORE_EVERY,
  strikeAt,
  type Tentacle,
  TOO_CLOSE,
  tentaclePhase,
  UP,
  WAKE_RADIUS,
  WAKE_SPEED,
  WARN,
} from '../../src/entities/cthuluviathan';
import type { World } from '../../src/entities/entity';
import { pastBuoys } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const TOP = SPEED[SPEED.length - 1] as number;
const at = (d: number, v: number, h = Math.PI) =>
  baseWorld({ tier: 5, hullScale: 1.6, boat: { x: LAIR.x + d, y: LAIR.y, h, v } });
const run = (c: Cthuluviathan, w: World, seconds: number, move = false) => {
  for (let i = 0; i < seconds * 30; i++) {
    if (move) {
      w.boat.x += Math.cos(w.boat.h) * w.boat.v * (1 / 30);
      w.boat.y += Math.sin(w.boat.h) * w.boat.v * (1 / 30);
    }
    c.update(1 / 30, w);
  }
};
/** The stick's screen vector that points the boat along a world direction: the inverse of dirToWorld. */
const stickFor = (wx: number, wy: number): [number, number] => {
  const ix = wx - wy;
  const iy = (wx + wy) / 2;
  const m = Math.hypot(ix, iy) || 1;
  return [ix / m, iy / m];
};

describe('the Cthuluviathan asleep', () => {
  it('sleeps in a sunken city out in the deep', () => {
    expect(pastBuoys(LAIR.x, LAIR.y)).toBe(true);
    expect(new Cthuluviathan().state).toBe('asleep');
  });

  it('dreams on while a boat goes by slowly, snoring, and is sighted once', () => {
    const c = new Cthuluviathan();
    let snores = 0;
    let sights = 0;
    let stirs = 0;
    c.onSnore = () => snores++;
    c.onSight = () => sights++;
    c.onStir = () => stirs++;
    const w = at(WAKE_RADIUS - 100, 90);
    run(c, w, SNORE_EVERY * 3 + 0.3);
    expect(c.state).toBe('asleep');
    expect(sights).toBe(1);
    expect(snores).toBe(4);
    expect(stirs).toBe(0);
  });

  it('stirs as a warning when a boat nearby gets quick, and wakes when it is quicker still', () => {
    const c = new Cthuluviathan();
    let stirs = 0;
    let wakes = 0;
    c.onStir = () => stirs++;
    c.onWake = () => wakes++;
    const w = at(WAKE_RADIUS - 100, WAKE_SPEED - 20);
    run(c, w, 1);
    expect([stirs, wakes, c.state]).toEqual([1, 0, 'asleep']);
    w.boat.v = WAKE_SPEED + 20;
    run(c, w, 0.1);
    expect([wakes, c.state]).toEqual([1, 'awake']);
  });

  it('wakes for any boat that comes too close, and never before the trip has started', () => {
    const c = new Cthuluviathan();
    run(c, at(TOO_CLOSE - 20, 10), 0.1);
    expect(c.state).toBe('awake');
    const d = new Cthuluviathan();
    run(d, baseWorld({ started: false, boat: { x: LAIR.x, y: LAIR.y, h: 0, v: TOP } }), 2);
    expect(d.state).toBe('asleep');
    expect(d.sighted).toBe(false);
  });
});

describe('the Cthuluviathan awake', () => {
  it('boils the water where the boat will be in a second, then a tentacle comes up there', () => {
    const c = new Cthuluviathan();
    const w = at(600, TOP);
    let ups = 0;
    c.onTentacle = () => ups++;
    run(c, w, 0.7);
    const t = c.tentacles[0] as Tentacle;
    expect(t).toBeDefined();
    expect(tentaclePhase(t.t)).toBe('warn');
    // Aimed a second's sailing ahead of the boat when it struck.
    expect(Math.hypot(t.x - LAIR.x, t.y - LAIR.y)).toBeLessThan(600);
    run(c, w, WARN);
    expect(ups).toBeGreaterThanOrEqual(1);
    expect(strikeAt({ x: LAIR.x + REACH * 3, y: LAIR.y, h: 0, v: TOP })).toEqual([
      LAIR.x + REACH,
      LAIR.y,
    ]);
  });

  it('grabs a boat that holds its course into the bubbles, slows it, and lets go for a moment after', () => {
    const c = new Cthuluviathan();
    const w = at(900, TOP);
    let grabs = 0;
    let slowed = TOP;
    c.onGrab = () => {
      grabs++;
      slowed = w.boat.v;
    };
    run(c, w, 1.5, true);
    expect(c.state).toBe('awake');
    // Straight on through it all.
    for (let i = 0; i < 30 * 4; i++) {
      w.boat.v = TOP;
      w.boat.x += Math.cos(w.boat.h) * TOP * (1 / 30);
      c.update(1 / 30, w);
      if (w.boat.x < LAIR.x - 700) w.boat.x = LAIR.x + 700;
    }
    expect(grabs).toBeGreaterThan(0);
    expect(grabs).toBeLessThanOrEqual(Math.ceil(4 / GRACE));
    expect(slowed).toBeLessThan(TOP * 0.31);
  });

  it('lets a person get away who steers off the bubbles a third of a second late, and nearly always half a second late', () => {
    const counts: number[] = [];
    for (const [mode, base] of [
      ['dodge', 1 / 3],
      ['dodge', 1 / 2],
      ['straight', 1 / 3],
    ] as const) {
      const own = rng(9);
      let grabs = 0;
      for (let n = 0; n < 120; n++) {
        const a0 = own() * Math.PI * 2;
        const w = baseWorld({
          tier: 5,
          hullScale: 1.6,
          boat: {
            x: LAIR.x + Math.cos(a0) * 1300,
            y: LAIR.y + Math.sin(a0) * 1300,
            h: a0 + Math.PI,
            v: TOP,
          },
        });
        const c = new Cthuluviathan();
        c.onGrab = () => grabs++;
        const late = base + (own() * 2 - 1) * 0.1;
        let woke = -1;
        let t = 0;
        const seen = new Map<Tentacle, number>();
        let swerve: { until: number; dir: [number, number] } | null = null;
        for (let i = 0; i < 60 * 25; i++) {
          t += 1 / 60;
          if (woke < 0 && c.state === 'awake') woke = t;
          for (const tt of c.tentacles) if (!seen.has(tt)) seen.set(tt, t);
          const b = w.boat;
          const fx = b.x - LAIR.x;
          const fy = b.y - LAIR.y;
          const fl = Math.hypot(fx, fy) || 1;
          // Charge in until it wakes, then run for open water.
          let dir: [number, number] = [-fx / fl, -fy / fl];
          if (woke >= 0 && t >= woke + late) {
            dir = [fx / fl, fy / fl];
            if (mode === 'dodge') {
              for (const [tt, seenAt] of seen) {
                if (t < seenAt + late || seenAt + late <= t - 1 / 60) continue;
                // Square off from the bubbles, to the side that is still away from it.
                let px = -(tt.y - b.y);
                let py = tt.x - b.x;
                const pl = Math.hypot(px, py) || 1;
                px /= pl;
                py /= pl;
                if (px * fx + py * fy < 0) {
                  px = -px;
                  py = -py;
                }
                swerve = { until: t + 0.8, dir: [px, py] };
              }
              if (swerve && t < swerve.until) dir = swerve.dir;
            }
          }
          const st = stickFor(dir[0], dir[1]);
          steerBoat(w.boat, st[0], st[1], TOP, 1 / 60);
          c.update(1 / 60, w);
        }
      }
      counts.push(grabs);
    }
    const [quick, slow, straight] = counts as [number, number, number];
    expect(quick).toBe(0);
    expect(slow).toBeLessThanOrEqual(120 * 0.15);
    // Running straight for it without minding the bubbles is what gets you caught.
    expect(straight).toBeGreaterThanOrEqual(120 * 0.8);
  });

  it('goes back to sleep once the boat is out of reach, sleeps soundly for a while, and never stays up forever', () => {
    const c = new Cthuluviathan();
    let sleeps = 0;
    c.onSleep = () => sleeps++;
    const w = at(TOO_CLOSE - 50, 0);
    run(c, w, 0.1);
    expect(c.state).toBe('awake');
    w.boat.x = LAIR.x + REACH * 1.2;
    run(c, w, CALM - 0.5);
    expect(c.state).toBe('awake');
    run(c, w, 1);
    expect([c.state, sleeps]).toEqual(['asleep', 1]);
    // Soundly: right on top of it, it does not wake until it has slept a while.
    w.boat.x = LAIR.x;
    run(c, w, DROWSY - 1);
    expect(c.state).toBe('asleep');
    run(c, w, 1.5);
    expect(c.state).toBe('awake');
    // Hang about inside its reach and it still tires in the end.
    run(c, w, AWAKE_MAX + 0.5);
    expect(c.state).toBe('asleep');
  });
});

describe('drawing the Cthuluviathan', () => {
  it('draws its city, its head and its Zs asleep, and boiling water then a tentacle awake', () => {
    const fake = fakeView();
    const c = new Cthuluviathan();
    for (const layer of ['underwater', 'surface', 'afloat', 'mask', 'glow'] as const)
      c.draw(fake.v, layer);
    expect(fake.calls.box).toBeGreaterThan(8);
    expect(fake.calls.fillText).toBe(3);
    run(c, at(TOO_CLOSE - 50, 0), 0.8);
    c.update(0.1, at(TOO_CLOSE - 50, 0));
    const before = fake.calls.isoEllipse ?? 0;
    c.draw(fake.v, 'afloat');
    expect(fake.calls.isoEllipse).toBeGreaterThan(before);
    run(c, at(TOO_CLOSE - 50, 0), WARN);
    expect(c.tentacles.some((t) => tentaclePhase(t.t) === 'up')).toBe(true);
    const fills = fake.calls.fill ?? 0;
    c.draw(fake.v, 'afloat');
    expect(fake.calls.fill).toBeGreaterThan(fills);
    fake.v.dark = 1;
    c.eyes = 1;
    c.draw(fake.v, 'glow');
    expect(fake.calls.glow).toBe(2);
    // Marked at the edge of the screen while the boat is near, and not when it is far.
    c.draw(fake.v, 'overlay');
    expect(fake.calls.indicator).toBe(1);
    run(c, at(MARK_RADIUS + 100, 0), 0.1);
    c.draw(fake.v, 'overlay');
    expect(fake.calls.indicator).toBe(1);
    expect(SIGHT_RADIUS).toBeGreaterThan(WAKE_RADIUS);
    expect(UP).toBeGreaterThan(0.5);
  });
});
