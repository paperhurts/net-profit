import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import type { World } from '../../src/entities/entity';
import {
  AUDIENCE,
  LEAP_HEIGHT,
  LEAP_SECONDS,
  MANTA_BAND,
  type Manta,
  Mantas,
  orbitHeading,
  SIGHT_EVERY,
  SPRAY_SECONDS,
  SQUADRON,
  slot,
} from '../../src/entities/mantas';
import { IX, IY } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const world = (over: Partial<World> = {}) => baseWorld({ rng: rng(13), ...over });
const out = (p: { x: number; y: number }) => Math.hypot(p.x - IX, p.y - IY);
const farAway = { x: IX, y: IY, h: 0, v: 0 };

describe('orbitHeading and slot', () => {
  it('circles either way round, and leans back into the band', () => {
    expect(orbitHeading(1, 0, 0, 1)).toBeCloseTo(Math.PI / 2, 9);
    expect(orbitHeading(1, 0, 0, -1)).toBeCloseTo(-Math.PI / 2, 9);
    expect(Math.cos(orbitHeading(1, 0, 1, -1))).toBeGreaterThan(0.5);
    expect(Math.cos(orbitHeading(1, 0, -1, -1))).toBeLessThan(-0.5);
  });

  it('flies the followers in a V, a row at a time, alternating sides', () => {
    expect(slot(1)).toEqual({ behind: 62, beside: 54 });
    expect(slot(2)).toEqual({ behind: 62, beside: -54 });
    expect(slot(3)).toEqual({ behind: 124, beside: 108 });
    expect(slot(4)).toEqual({ behind: 124, beside: -108 });
  });
});

describe('Mantas', () => {
  it('is a squadron of three to five with the biggest in front, in the middle rings', () => {
    const sizes = new Set<number>();
    for (let seed = 1; seed < 40; seed++) {
      const e = new Mantas(rng(seed));
      sizes.add(e.mantas.length);
      expect(e.mantas.length).toBeGreaterThanOrEqual(SQUADRON[0]);
      expect(e.mantas.length).toBeLessThanOrEqual(SQUADRON[1]);
      expect(out(e.leader)).toBeCloseTo((MANTA_BAND[0] + MANTA_BAND[1]) / 2, 6);
      expect(e.mantas.every((m) => m.span <= e.leader.span && m.leap === -1)).toBe(true);
    }
    expect([...sizes].sort()).toEqual([3, 4, 5]);
  });

  it('glides clockwise round the island inside its band for five minutes, the V holding together', () => {
    const e = new Mantas(rng(2));
    const w = world({ started: false, boat: farAway });
    let turned = 0;
    let last = Math.atan2(e.leader.y - IY, e.leader.x - IX);
    for (let i = 0; i < 300 * 30; i++) {
      e.update(1 / 30, w);
      const d = out(e.leader);
      expect(d).toBeGreaterThan(MANTA_BAND[0] - 60);
      expect(d).toBeLessThan(MANTA_BAND[1] + 60);
      const a = Math.atan2(e.leader.y - IY, e.leader.x - IX);
      let da = a - last;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      turned += da;
      last = a;
      for (const m of e.mantas) {
        expect(Math.hypot(m.x - e.leader.x, m.y - e.leader.y)).toBeLessThan(250);
      }
    }
    expect(turned).toBeLessThan(-4);
  });

  it('leaps only for an audience, one at a time, and comes down with a whump', () => {
    const alone = new Mantas(rng(3));
    const far = world({ boat: farAway });
    for (let i = 0; i < 120 * 30; i++) alone.update(1 / 30, far);
    expect(alone.mantas.every((m) => m.leap < 0)).toBe(true);

    const e = new Mantas(rng(3));
    const w = world();
    const whumps: Manta[] = [];
    e.onWhump = (m) => whumps.push(m);
    let peak = 0;
    let mostInAir = 0;
    for (let i = 0; i < 90 * 30; i++) {
      w.boat.x = e.leader.x + AUDIENCE - 100;
      w.boat.y = e.leader.y;
      e.update(1 / 30, w);
      peak = Math.max(peak, ...e.mantas.map((m) => Mantas.height(m)));
      mostInAir = Math.max(mostInAir, e.mantas.filter((m) => m.leap >= 0).length);
    }
    expect(whumps.length).toBeGreaterThanOrEqual(2);
    expect(mostInAir).toBe(1);
    expect(peak).toBeGreaterThan(LEAP_HEIGHT * 0.98);
    expect(peak).toBeLessThanOrEqual(LEAP_HEIGHT);
    const landed = whumps[0] as Manta;
    expect(landed.leap).toBe(-1);
    expect(Mantas.height(landed)).toBe(0);
  });

  it('starts the spray the moment one lands', () => {
    const e = new Mantas(rng(4));
    const m = e.leader;
    m.leap = LEAP_SECONDS - 0.01;
    let heard = 0;
    e.onWhump = () => heard++;
    e.update(1 / 30, world({ boat: farAway }));
    expect([heard, m.leap, m.splash]).toEqual([1, -1, 0]);
  });

  it('tells the game of a sighting when the boat is close, once every minute and a half, only once started', () => {
    const e = new Mantas(rng(5));
    const w = world();
    let sightings = 0;
    e.onSight = () => sightings++;
    const follow = (seconds: number) => {
      for (let i = 0; i < seconds * 30; i++) {
        w.boat.x = e.leader.x + 100;
        w.boat.y = e.leader.y;
        e.update(1 / 30, w);
      }
    };
    follow(1);
    expect(sightings).toBe(1);
    follow(SIGHT_EVERY - 5);
    expect(sightings).toBe(1);
    follow(10);
    expect(sightings).toBe(2);
    const quiet = new Mantas(rng(5));
    let n = 0;
    quiet.onSight = () => n++;
    quiet.update(
      1 / 30,
      world({ started: false, boat: { x: quiet.leader.x, y: quiet.leader.y, h: 0, v: 0 } }),
    );
    expect(n).toBe(0);
  });

  it('draws a shadow for every ray, a body in the air only for one that is leaping, and spray where it landed', () => {
    const e = new Mantas(rng(6));
    const n = e.mantas.length;
    const fake = fakeView();
    e.draw(fake.v, 'solids');
    expect(fake.calls).toEqual({});
    e.draw(fake.v, 'underwater');
    expect([fake.calls.fill, fake.calls.stroke]).toEqual([n, 3 * n]);
    e.draw(fake.v, 'air');
    e.draw(fake.v, 'surface');
    expect([fake.calls.fill, fake.calls.stroke]).toEqual([n, 3 * n]);
    e.leader.leap = LEAP_SECONDS / 2;
    e.draw(fake.v, 'air');
    expect([fake.calls.fill, fake.calls.stroke]).toEqual([n + 2, 3 * n + 3]);
    e.leader.leap = -1;
    e.leader.splash = SPRAY_SECONDS / 2;
    e.draw(fake.v, 'surface');
    expect(fake.calls.ellipse).toBe(1);
    expect(fake.calls.arc).toBe(7);
    fake.onScreen = false;
    e.draw(fake.v, 'underwater');
    expect(fake.calls.fill).toBe(n + 2 + 7);
  });
});
