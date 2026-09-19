import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import type { World } from '../../src/entities/entity';
import {
  CALF_BEHIND,
  CALF_BESIDE,
  CALF_BREATH,
  DIVE_SECONDS,
  SIGHT_EVERY,
  SPOUT_SECONDS,
  SURFACE_SECONDS,
  WHALE_BAND,
  Whales,
  wantHeading,
} from '../../src/entities/whales';
import { IX, IY } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const world = (over: Partial<World> = {}) => baseWorld({ rng: rng(8), ...over });
const out = (p: { x: number; y: number }) => Math.hypot(p.x - IX, p.y - IY);

describe('wantHeading', () => {
  it('follows the tangent in the middle of the band, and leans back toward it from either side', () => {
    expect(wantHeading(1, 0, 0)).toBeCloseTo(Math.PI / 2, 9);
    expect(Math.cos(wantHeading(1, 0, 1))).toBeGreaterThan(0.5);
    expect(Math.cos(wantHeading(1, 0, -1))).toBeLessThan(-0.5);
  });
});

describe('Whales', () => {
  it('start in the middle of the far water with the calf on station', () => {
    const e = new Whales(rng(1));
    expect(out(e.mother)).toBeCloseTo((WHALE_BAND[0] + WHALE_BAND[1]) / 2, 6);
    expect(Math.hypot(e.calf.x - e.mother.x, e.calf.y - e.mother.y)).toBeCloseTo(
      Math.hypot(CALF_BEHIND, CALF_BESIDE),
      6,
    );
    expect(e.all).toEqual([e.mother, e.calf]);
    expect(e.mother.len).toBeGreaterThan(e.calf.len);
  });

  it('go round the island inside their band for ten minutes, the calf never far from its mother', () => {
    const e = new Whales(rng(2));
    const w = world({ started: false });
    const a0 = Math.atan2(e.mother.y - IY, e.mother.x - IX);
    let turned = 0;
    let last = a0;
    for (let i = 0; i < 600 * 30; i++) {
      e.update(1 / 30, w);
      const d = out(e.mother);
      expect(d).toBeGreaterThan(WHALE_BAND[0] - 60);
      expect(d).toBeLessThan(WHALE_BAND[1] + 60);
      const a = Math.atan2(e.mother.y - IY, e.mother.x - IX);
      let da = a - last;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      turned += da;
      last = a;
      expect(Math.hypot(e.calf.x - e.mother.x, e.calf.y - e.mother.y)).toBeLessThan(120);
    }
    expect(turned).toBeGreaterThan(4);
  });

  it('come up to breathe with a spout, then dive for a while, the calf more often', () => {
    const e = new Whales(rng(3));
    const w = world({ started: false });
    const ups = { mother: 0, calf: 0 };
    let wasUp = [false, false];
    for (let i = 0; i < 120 * 30; i++) {
      e.update(1 / 30, w);
      e.all.forEach((wh, k) => {
        const up = wh.up > 0;
        if (up && !wasUp[k]) {
          ups[k === 0 ? 'mother' : 'calf']++;
          expect(wh.spout).toBeLessThan(0.1);
          expect(wh.up).toBeLessThanOrEqual(SURFACE_SECONDS);
        }
        if (!up && wasUp[k]) {
          const scale = k === 0 ? 1 : CALF_BREATH;
          expect(wh.dive).toBeGreaterThanOrEqual(DIVE_SECONDS[0] * scale - 1e-9);
          expect(wh.dive).toBeLessThanOrEqual((DIVE_SECONDS[0] + DIVE_SECONDS[1]) * scale);
        }
      });
      wasUp = [e.mother.up > 0, e.calf.up > 0];
    }
    expect(ups.mother).toBeGreaterThanOrEqual(5);
    expect(ups.calf).toBeGreaterThan(ups.mother);
  });

  it('tells the game of a sighting when the boat is close, once every minute and a half, only once started', () => {
    const e = new Whales(rng(4));
    const w = world();
    let sightings = 0;
    e.onSight = () => sightings++;
    const follow = (seconds: number) => {
      for (let i = 0; i < seconds * 30; i++) {
        w.boat.x = e.mother.x + 100;
        w.boat.y = e.mother.y;
        e.update(1 / 30, w);
      }
    };
    follow(1);
    expect(sightings).toBe(1);
    follow(SIGHT_EVERY - 5);
    expect(sightings).toBe(1);
    follow(10);
    expect(sightings).toBe(2);

    const quiet = new Whales(rng(4));
    let n = 0;
    quiet.onSight = () => n++;
    const far = world({ boat: { x: IX, y: IY, h: 0, v: 0 } });
    for (let i = 0; i < 300; i++) quiet.update(1 / 30, far);
    const unstarted = world({
      started: false,
      boat: { x: quiet.mother.x, y: quiet.mother.y, h: 0, v: 0 },
    });
    quiet.update(1 / 30, unstarted);
    expect(n).toBe(0);
  });

  it('draws two shadows under water always, and a back, foam and spout only for a whale that is up', () => {
    const e = new Whales(rng(5));
    const fake = fakeView();
    e.draw(fake.v, 'solids');
    expect(fake.calls).toEqual({});
    e.draw(fake.v, 'underwater');
    expect(fake.calls.ellipse).toBe(2);
    expect(fake.calls.fill).toBe(4);
    e.draw(fake.v, 'surface');
    expect(fake.calls.ellipse).toBe(2);
    e.mother.up = 2;
    e.mother.spout = SPOUT_SECONDS / 2;
    e.draw(fake.v, 'surface');
    expect(fake.calls.ellipse).toBe(5);
    expect(fake.calls.stroke).toBe(6);
    expect(fake.calls.arc).toBe(3);
    e.mother.spout = SPOUT_SECONDS + 1;
    e.draw(fake.v, 'surface');
    expect(fake.calls.stroke).toBe(7);
    fake.onScreen = false;
    e.draw(fake.v, 'underwater');
    expect(fake.calls.ellipse).toBe(8);
  });
});
