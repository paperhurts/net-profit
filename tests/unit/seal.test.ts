import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import {
  CALM_T,
  drawSealDive,
  drawSealLie,
  drawSealSwim,
  FLOP_T,
  NEIL_FEEDS,
  NEIL_HOME,
  NEIL_REACH,
  Neil,
  nearNeil,
  onFloe,
  REST_T,
} from '../../src/entities/seal';
import {
  HOLE_X,
  ICE_TOP,
  type IceFish,
  IceRun,
  IceSeal,
  icePool,
  SEAL_ICE,
  SEAL_X,
} from '../../src/fishing/icefish';
import { drawIceScene } from '../../src/render/icefish';
import { FLOE_BASE } from '../../src/world/bases';
import { FLOE_MAX, ICE_FLOE, ICE_HOLE, SEALS } from '../../src/world/icefloe';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;

function run(n: Neil, w: World, s: number): void {
  for (let i = 0; i < s / DT; i++) n.update(DT, w);
}

describe('Neil, wild on the ice floe', () => {
  it('lies on the floe by the hole, clear of the other seals and the igloo, and is reached from the boat alongside on his side', () => {
    expect(onFloe(NEIL_HOME.x, NEIL_HOME.y)).toBe(true);
    expect(Math.hypot(NEIL_HOME.x - ICE_HOLE.x, NEIL_HOME.y - ICE_HOLE.y)).toBeLessThan(140);
    for (const p of [...SEALS, ICE_HOLE, FLOE_BASE.hut])
      expect(Math.hypot(NEIL_HOME.x - p.x, NEIL_HOME.y - p.y)).toBeGreaterThan(50);
    // A boat alongside, just off the floe's widest edge, on his side; and one round the other side.
    const a = Math.atan2(NEIL_HOME.y - ICE_FLOE.y, NEIL_HOME.x - ICE_FLOE.x);
    const d = FLOE_MAX + 24 * 1.6 + 6;
    expect(nearNeil(ICE_FLOE.x + Math.cos(a) * d, ICE_FLOE.y + Math.sin(a) * d)).toBe(true);
    expect(nearNeil(ICE_FLOE.x - Math.cos(a) * d, ICE_FLOE.y - Math.sin(a) * d)).toBe(false);
    expect(NEIL_REACH).toBeLessThan(FLOE_MAX);
  });

  it('turns his head to a boat that comes near, and stays where he lies', () => {
    const n = new Neil();
    const w = baseWorld({ boat: { x: NEIL_HOME.x + 200, y: NEIL_HOME.y, h: 0, v: 0 } });
    run(n, w, 2);
    expect(n.state).toBe('wild');
    expect([n.x, n.y]).toEqual([NEIL_HOME.x, NEIL_HOME.y]);
    expect(Math.cos(n.h)).toBeGreaterThan(0.99);
  });

  it('is yours on the third ice fish, and not before', () => {
    const n = new Neil();
    for (let i = 1; i < NEIL_FEEDS; i++) {
      expect(n.feed()).toBe(false);
      expect(n.free).toBe(false);
    }
    expect(n.feed()).toBe(true);
    expect(n.free).toBe(true);
    expect(n.feed()).toBe(false);
    // From a save: clamped to what makes sense.
    n.set(99);
    expect(n.fed).toBe(NEIL_FEEDS);
    expect(n.state).toBe('swim');
    n.set(-1);
    expect(n.fed).toBe(0);
    expect(n.state).toBe('wild');
  });
});

describe('Neil with the boat', () => {
  it('slips in off the ice and swims beside the boat, keeping up at speed', () => {
    const n = new Neil();
    for (let i = 0; i < NEIL_FEEDS; i++) n.feed();
    const w = baseWorld({
      boat: { x: NEIL_HOME.x + 260, y: NEIL_HOME.y, h: 0, v: 200 },
      hullScale: 1,
    });
    for (let i = 0; i < 4 / DT; i++) {
      w.boat.x += 200 * DT;
      n.update(DT, w);
    }
    expect(n.state).toBe('swim');
    expect(Math.hypot(n.x - w.boat.x, n.y - w.boat.y)).toBeLessThan(45);
    expect(Math.abs(n.y - w.boat.y)).toBeGreaterThan(10);
  });

  it('flops up on deck to rest when the boat stops a while, and slips back in once it is under way', () => {
    const n = new Neil();
    n.set(NEIL_FEEDS);
    const why: string[] = [];
    n.onFlop = (r) => why.push(r);
    const w = baseWorld({ boat: { x: 0, y: 0, h: 0, v: 0 }, hullScale: 1 });
    run(n, w, REST_T - 0.3);
    expect(n.aboard).toBe(false);
    run(n, w, 0.4 + FLOP_T);
    expect(n.state).toBe('deck');
    expect(why).toEqual(['rest']);
    // Under way: a moment on deck, then back in the water.
    w.boat.v = 150;
    run(n, w, CALM_T - 0.3);
    expect(n.aboard).toBe(true);
    run(n, w, 0.4 + FLOP_T);
    expect(n.state).toBe('swim');
  });

  it('flops aboard at once when something is in the water, and stays while it is', () => {
    const n = new Neil();
    n.set(NEIL_FEEDS);
    const why: string[] = [];
    n.onFlop = (r) => why.push(r);
    const w = baseWorld({ boat: { x: 0, y: 0, h: 0, v: 200 }, hullScale: 1 });
    run(n, w, 0.5);
    n.danger = true;
    run(n, w, FLOP_T + 0.2);
    expect(n.state).toBe('deck');
    expect(why).toEqual(['danger']);
    run(n, w, CALM_T * 3);
    expect(n.state).toBe('deck');
    n.danger = false;
    run(n, w, CALM_T + FLOP_T + 0.2);
    expect(n.state).toBe('swim');
  });

  it('is drawn on the ice, in the water and on the deck without a fault', () => {
    const v = fakeView();
    const n = new Neil();
    n.drawOut(v.v, 0);
    n.set(NEIL_FEEDS);
    n.drawOut(v.v, 0);
    n.drawOut(v.v, 200);
    n.pet();
    const w = baseWorld({ boat: { x: 0, y: 0, h: 0, v: 0 }, hullScale: 1 });
    run(n, w, REST_T + FLOP_T + 0.5);
    n.drawAboard(v.v, w.boat, 1);
    drawSealLie(v.v.ctx, 10, 10, -1, 0, 3, 1);
    drawSealSwim(v.v.ctx, 10, 10, 1, 0, true, 1);
    drawSealDive(v.v.ctx, 10, 10, 1, 0, 1);
    expect(v.calls.fill ?? 0).toBeGreaterThan(60);
  });
});

/** A fish of the pool, still, where it is put. */
function fishAt(x: number, y: number, kind: IceFish['kind'] = 'cod'): IceFish {
  return { kind, sp: 20, x, y, vx: 0, size: 24, caught: false, on: false, calm: 0, ph: 0 };
}

function step(s: IceSeal, seconds: number): IceFish | null {
  let got: IceFish | null = null;
  for (let i = 0; i < seconds / DT && !got; i++) got = s.update(DT);
  return got;
}

describe('Neil ice fishing', () => {
  it('sits by the hole, goes in after the nearest fish, and brings it up onto the ice for the hold', () => {
    const near = fishAt(HOLE_X + 40, 200);
    const far = fishAt(HOLE_X - 100, 700);
    const jelly = fishAt(HOLE_X, 120, 'jelly');
    const s = new IceSeal();
    expect([s.x, s.y]).toEqual([SEAL_X, SEAL_ICE]);
    expect(s.dive([far, jelly, near])).toBe(true);
    expect(s.prey).toBe(near);
    // Not again while he is out.
    expect(s.dive([far])).toBe(false);
    let wet = false;
    let got: IceFish | null = null;
    for (let i = 0; i < 12 / DT && !got; i++) {
      got = s.update(DT);
      if (s.y > ICE_TOP) wet = true;
    }
    expect(wet).toBe(true);
    expect(got).toBe(near);
    expect(near.caught).toBe(true);
    expect(near.on).toBe(false);
    expect(far.caught).toBe(false);
    expect(s.phase).toBe('sit');
    expect([s.x, s.y]).toEqual([SEAL_X, SEAL_ICE]);
  });

  it('gives up on a fish the hook takes first, and comes back up empty-mouthed', () => {
    const f = fishAt(HOLE_X + 60, 600);
    const s = new IceSeal();
    s.dive([f]);
    step(s, 0.6);
    f.on = true;
    expect(step(s, 10)).toBeNull();
    expect(s.phase).toBe('sit');
    expect(f.caught).toBe(false);
  });

  it('will not go for a crab on the floor or a jelly, and gives what is in his mouth when the fisher leaves', () => {
    const s = new IceSeal();
    expect(s.dive([fishAt(HOLE_X, 1080, 'crab'), fishAt(HOLE_X, 300, 'jelly')])).toBe(false);
    const f = fishAt(HOLE_X + 10, 120);
    s.dive([f]);
    for (let i = 0; i < 10 / DT && !s.has; i++) s.update(DT);
    expect(s.has).toBe(true);
    expect(s.finish()).toBe(f);
    expect(f.caught).toBe(true);
    expect(s.phase).toBe('sit');
    expect(s.finish()).toBeNull();
  });

  it('is drawn in the scene, on the ice and under it, without a fault', () => {
    const v = fakeView();
    const r = new IceRun(icePool(3));
    const s = new IceSeal();
    s.dive(r.pool);
    r.drop();
    for (let i = 0; i < 10 / DT; i++) {
      r.update(DT, 0);
      s.update(DT);
      if (i % 30 === 0) drawIceScene(v.v.ctx, 390, 780, r, i * DT, 10, s);
    }
    expect(v.calls.fill ?? 0).toBeGreaterThan(300);
  });
});
