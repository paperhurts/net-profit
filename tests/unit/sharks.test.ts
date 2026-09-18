import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import type { DrawView, World } from '../../src/entities/entity';
import {
  CHARGE_BREAK,
  CHARGE_SECONDS,
  createSharks,
  RESPAWN_SECONDS,
  SHARK_NET_LEVEL,
  type Shark,
  Sharks,
  WARN_EVERY,
} from '../../src/entities/sharks';
import { IX, IY } from '../../src/world/island';
import { baseWorld } from './helpers/world';

const school = (sp: number, x: number, y: number) => ({ sp, ax: x, ay: y, cx: x, cy: y, r: 90 });
const HX = IX + 1500;
const HY = IY;
/** One shark at home, alone, so a test can reason about it. */
const one = () => new Sharks([school(4, HX, HY)], rng(1));
/** A net being towed at speed, this far east of the home school. */
const fastNet = (ahead: number) => ({ x: HX + ahead, y: HY, speed: 60, torn: 0 });
const world = (over: Partial<World> = {}) => baseWorld({ rng: rng(2), ...over });

const step = (e: Sharks, w: World, frames: number) => {
  for (let i = 0; i < frames; i++) {
    e.update(1 / 30, w);
    w.T += 1 / 30;
  }
};
const run = (e: Sharks, w: World, seconds: number) => step(e, w, Math.round(seconds * 30));
const until = (e: Sharks, w: World, done: () => boolean, seconds: number) => {
  for (let i = 0; i < seconds * 30 && !done(); i++) step(e, w, 1);
};

describe('createSharks', () => {
  it('gives the schools of the three deepest species two sharks each, and the rest none', () => {
    const schools = [
      school(0, 1000, 1000),
      school(4, HX, HY),
      school(4, IX - 1500, IY),
      school(4, IX, IY + 1500),
      school(5, IX, IY - 1500),
      school(5, IX + 1200, IY + 1200),
      school(6, IX - 1200, IY - 1200),
      school(3, 500, 500),
    ];
    const s = createSharks(schools, rng(1));
    expect(s.map((sh) => sh.home)).toEqual([1, 2, 4, 5, 6].map((i) => schools[i]));
    expect(s.every((sh) => sh.alive && sh.state === 'circle' && sh.cool === 0)).toBe(true);
    expect([s[0]?.x, s[0]?.y]).toEqual([HX, HY]);
  });
});

describe('Sharks', () => {
  it('circles its school 55 outside the shoal at half a radian a second', () => {
    const e = one();
    const sh = e.sharks[0] as Shark;
    const a0 = sh.a;
    run(e, world(), 10);
    expect(sh.a - a0).toBeCloseTo(5, 5);
    const d = Math.hypot(sh.x - HX, sh.y - HY);
    expect(d).toBeCloseTo(145, 3);
    expect(sh.state).toBe('circle');
  });

  it('charges a fast net within reach, and warns once in nine seconds however many charge', () => {
    const e = new Sharks([school(4, HX, HY), school(4, HX, HY + 40)], rng(1));
    const w = world({ net: fastNet(200) });
    let warns = 0;
    e.onWarn = () => warns++;
    step(e, w, 1);
    expect(e.sharks.map((sh) => sh.state)).toEqual(['charge', 'charge']);
    expect(warns).toBe(1);
    expect(e.warnT).toBe(WARN_EVERY);
  });

  it('will not charge when escorted, docked, the net is torn or slow, or it is still cooling', () => {
    const cases: Partial<World>[] = [
      { escorted: true },
      { docked: true },
      { started: false },
      { net: { ...fastNet(200), torn: 2 } },
      { net: { ...fastNet(200), speed: 10 } },
      { net: fastNet(340) },
    ];
    for (const over of cases) {
      const e = one();
      step(e, world({ net: fastNet(200), ...over }), 1);
      expect(e.sharks[0]?.state, JSON.stringify(over)).toBe('circle');
    }
    const e = one();
    (e.sharks[0] as Shark).cool = 5;
    step(e, world({ net: fastNet(200) }), 1);
    expect(e.sharks[0]?.state).toBe('circle');
  });

  it('is hauled in by a strong net with room, and comes back to its school after forty-five seconds', () => {
    const e = one();
    const sh = e.sharks[0] as Shark;
    const w = world({ net: fastNet(100), netLevel: SHARK_NET_LEVEL, netWidth: 112, holdTotal: 3 });
    const caught: Shark[] = [];
    e.onCatch = (s) => caught.push(s);
    until(e, w, () => !sh.alive, 2);
    expect(caught).toEqual([sh]);
    expect(sh.alive).toBe(false);
    expect(sh.resp).toBeCloseTo(w.T - 1 / 30 + RESPAWN_SECONDS, 5);
    sh.x = 0;
    sh.y = 0;
    until(e, w, () => sh.alive, RESPAWN_SECONDS + 1);
    expect(sh.alive).toBe(true);
    expect([sh.x, sh.y, sh.state, sh.cool]).toEqual([HX, HY, 'circle', 4]);
    expect(caught).toHaveLength(1);
  });

  it('turns away from a strong net whose hold is full, without a catch or a tear', () => {
    const e = one();
    const sh = e.sharks[0] as Shark;
    const w = world({ net: fastNet(100), netLevel: SHARK_NET_LEVEL, netWidth: 112, holdTotal: 12 });
    let catches = 0;
    let tears = 0;
    e.onCatch = () => catches++;
    e.onTear = () => tears++;
    step(e, w, 1);
    expect(sh.state).toBe('charge');
    until(e, w, () => sh.state === 'circle', 2);
    expect([catches, tears, sh.alive, sh.cool]).toEqual([0, 0, true, 8]);
  });

  it('tears a lesser net on contact and backs off for fourteen seconds', () => {
    const e = one();
    const sh = e.sharks[0] as Shark;
    const w = world({ net: fastNet(100), netLevel: SHARK_NET_LEVEL - 1, netWidth: 88 });
    const torn: Shark[] = [];
    e.onTear = (s) => torn.push(s);
    step(e, w, 1);
    until(e, w, () => sh.state === 'circle', 2);
    expect(torn).toEqual([sh]);
    expect([sh.alive, sh.cool]).toEqual([true, 14]);
  });

  it('gives up a charge that runs long or whose net gets away', () => {
    const e = one();
    const sh = e.sharks[0] as Shark;
    const w = world({ net: fastNet(200) });
    step(e, w, 1);
    expect(sh.state).toBe('charge');
    for (let i = 0; i < (CHARGE_SECONDS + 0.5) * 30 && sh.state === 'charge'; i++) {
      w.net.x = sh.x + 300;
      w.net.y = sh.y;
      step(e, w, 1);
    }
    expect([sh.state, sh.cool]).toEqual(['circle', 6]);
    expect(sh.t).toBeGreaterThan(CHARGE_SECONDS);

    const e2 = one();
    const sh2 = e2.sharks[0] as Shark;
    const w2 = world({ net: fastNet(200) });
    step(e2, w2, 1);
    w2.net.x = sh2.x + CHARGE_BREAK + 10;
    step(e2, w2, 1);
    expect([sh2.state, sh2.cool]).toEqual(['circle', 6]);
  });

  it('breaks off for an escort, the dock, or a torn net', () => {
    for (const over of [{ escorted: true }, { docked: true }, { torn: true }]) {
      const e = one();
      const sh = e.sharks[0] as Shark;
      const w = world({ net: fastNet(200) });
      step(e, w, 1);
      expect(sh.state).toBe('charge');
      if ('torn' in over) w.net.torn = 6;
      else Object.assign(w, over);
      step(e, w, 1);
      expect([sh.state, sh.cool], JSON.stringify(over)).toEqual(['circle', 6]);
    }
  });

  it('reset sends everyone back to circling', () => {
    const e = new Sharks([school(4, HX, HY), school(4, HX, HY + 40)], rng(1));
    const [a, b] = e.sharks as [Shark, Shark];
    a.alive = false;
    b.state = 'charge';
    b.cool = 9;
    e.reset();
    expect([a.alive, a.state, b.state, b.cool]).toEqual([true, 'circle', 'circle', 0]);
  });

  it('draws a body, a tail, a ripple and a fin for each live shark, on the surface layer only', () => {
    const calls: Record<string, number> = {};
    const count = (name: string) => () => {
      calls[name] = (calls[name] ?? 0) + 1;
    };
    const ctx = {
      fillStyle: '',
      strokeStyle: '',
      globalAlpha: 1,
      lineWidth: 1,
      beginPath: count('beginPath'),
      ellipse: count('ellipse'),
      fill: count('fill'),
      stroke: count('stroke'),
      moveTo: count('moveTo'),
      lineTo: count('lineTo'),
      closePath: count('closePath'),
    } as unknown as CanvasRenderingContext2D;
    const v: DrawView = {
      ctx,
      px: (x, y) => x - y,
      py: (x, y, z = 0) => (x + y) * 0.5 - z,
      onScreen: () => true,
      zoom: 1,
      dark: 0,
      T: 0,
      foam: '#fff',
      ship: () => {},
      light: () => {},
      glow: () => {},
      indicator: () => {},
    };
    const e = new Sharks([school(4, HX, HY), school(4, HX, HY + 40)], rng(1));
    (e.sharks[1] as Shark).alive = false;
    e.draw(v, 'solids');
    expect(calls).toEqual({});
    e.draw(v, 'surface');
    expect(calls).toEqual({
      beginPath: 4,
      ellipse: 2,
      fill: 3,
      stroke: 1,
      moveTo: 2,
      lineTo: 4,
      closePath: 2,
    });
  });
});
