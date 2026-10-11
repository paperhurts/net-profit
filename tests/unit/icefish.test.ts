import { describe, expect, it } from 'vitest';
import { ICE_CHAR, ICEFISH, POLAR_COD, SNOW_CRAB, SPECIES } from '../../src/data/tuning';
import { ROUTE } from '../../src/entities/reaper';
import {
  DROP,
  HOLE_X,
  ICE_D,
  ICE_TOP,
  ICE_W,
  type IceFish,
  IceRun,
  icePool,
  LINE_MAX,
  leftToCatch,
} from '../../src/fishing/icefish';
import { drawIceScene } from '../../src/render/icefish';
import { drawFloe } from '../../src/render/icefloe';
import {
  alongsideFloe,
  FLOE_MAX,
  floeR,
  ICE_CHUNKS,
  ICE_FLOE,
  ICE_HOLE,
  SEALS,
} from '../../src/world/icefloe';
import { IR, IX, IY, pastFar } from '../../src/world/island';
import { ISLE2 } from '../../src/world/isle2';
import { ISLE3 } from '../../src/world/isle3';
import { ISLE5 } from '../../src/world/isle5';
import { ISLE6 } from '../../src/world/isle6';
import { fakeView } from './helpers/view';

const DT = 1 / 60;

/** Run a drop to the end, steering by a hand that is given the run each step. */
function play(run: IceRun, hand: (r: IceRun) => number = () => 0, seconds = 30) {
  const evs: string[] = [];
  run.drop();
  for (let i = 0; i < seconds / DT && run.phase !== 'done'; i++) {
    const ev = run.update(DT, hand(run));
    if (ev) evs.push(ev);
  }
  return evs;
}

/** A hand on the way up: steers for the nearest fish (not a jelly) ahead of the hook. */
const greedy = (r: IceRun) => {
  if (r.phase !== 'reel') return 0;
  let best: IceFish | null = null;
  let bd = Number.POSITIVE_INFINITY;
  for (const f of r.pool) {
    if (f.caught || f.on || f.kind === 'jelly' || f.y > r.y || r.y - f.y > 220) continue;
    const d = Math.abs(f.x - r.x) + (r.y - f.y) * 0.3;
    if (d < bd) {
      bd = d;
      best = f;
    }
  }
  return best ? Math.max(-1, Math.min(1, (best.x - r.x) / 30)) : 0;
};

describe('the fish under the ice', () => {
  it("are a day's worth, the same all day, in their bands: char up top, cod below, icefish deep, crabs on the floor", () => {
    const a = icePool(3);
    expect(icePool(3)).toEqual(a);
    expect(icePool(4)).not.toEqual(a);
    const n = (sp: number) => a.filter((f) => f.sp === sp).length;
    expect([n(ICE_CHAR), n(POLAR_COD), n(ICEFISH), n(SNOW_CRAB)]).toEqual([5, 4, 3, 3]);
    expect(a.filter((f) => f.kind === 'jelly').length).toBe(4);
    const deepest = (sp: number) => Math.max(...a.filter((f) => f.sp === sp).map((f) => f.y));
    const shallowest = (sp: number) => Math.min(...a.filter((f) => f.sp === sp).map((f) => f.y));
    expect(deepest(ICE_CHAR)).toBeLessThan(shallowest(POLAR_COD));
    expect(deepest(POLAR_COD)).toBeLessThan(shallowest(ICEFISH));
    for (const f of a.filter((f) => f.sp === SNOW_CRAB)) expect(f.y).toBeGreaterThan(ICE_D - 40);
    // Worth more the deeper they are.
    const v = [ICE_CHAR, POLAR_COD, ICEFISH, SNOW_CRAB].map((sp) => SPECIES[sp]?.v ?? 0);
    expect([...v].sort((x, y) => x - y)).toEqual(v);
    expect(SPECIES[SNOW_CRAB]?.crab).toBe(true);
  });
});

describe('a drop of the line', () => {
  it('goes down to the floor taking nothing, turns, and comes back up under the hole', () => {
    const run = new IceRun(icePool(1));
    run.drop();
    let deepest = 0;
    const evs: string[] = [];
    for (let i = 0; i < 30 / DT && run.phase !== 'done'; i++) {
      const ev = run.update(DT, 0);
      if (ev) evs.push(ev);
      deepest = Math.max(deepest, run.y);
      if (run.phase === 'drop') expect(run.line).toEqual([]);
    }
    expect(deepest).toBeGreaterThan(ICE_D - 30);
    expect(evs[0]).toBe('bottom');
    expect(evs[evs.length - 1]).toBe('done');
    expect(run.x).toBeCloseTo(HOLE_X, 0);
    expect(run.y).toBeLessThan(ICE_TOP);
    // Down in about ICE_D / DROP seconds: down, down, down.
    expect(ICE_D / DROP).toBeGreaterThan(3);
  });

  it('hooks what it is steered into on the way up, up to a full line, and those are caught for the day', () => {
    const pool = icePool(2);
    const run = new IceRun(pool);
    const before = leftToCatch(pool);
    const evs = play(run, greedy);
    const hooked = evs.filter((e) => e === 'hook').length;
    expect(hooked).toBeGreaterThanOrEqual(3);
    expect(run.line.length).toBeLessThanOrEqual(LINE_MAX);
    expect(leftToCatch(pool)).toBe(before - run.line.length);
    for (const f of run.line) expect(f.caught).toBe(true);
    // Not steering, the line mostly comes up light.
    const lazy = new IceRun(icePool(2));
    play(lazy);
    expect(lazy.line.length).toBeLessThan(run.line.length);
  });

  it('can bring the hook down onto a snow crab, which takes it as the line turns at the bottom', () => {
    const pool = icePool(5);
    const crab = pool.find((f) => f.sp === SNOW_CRAB) as IceFish;
    crab.vx = 0;
    const run = new IceRun(pool);
    const evs = play(run, (r) =>
      r.phase === 'drop' ? Math.max(-1, Math.min(1, (crab.x - r.x) / 20)) : 0,
    );
    expect(evs.slice(0, 2)).toEqual(['bottom', 'hook']);
    expect(run.line[0]).toBe(crab);
  });

  it('loses the last fish on the line to a jelly that stings, which swims away still uncaught', () => {
    const fish: IceFish = {
      kind: 'cod',
      sp: POLAR_COD,
      x: HOLE_X,
      y: 600,
      vx: 0,
      size: 24,
      caught: false,
      on: false,
      calm: 0,
      ph: 0,
    };
    const jelly: IceFish = { ...fish, kind: 'jelly', sp: -1, y: 400 };
    const run = new IceRun([fish, jelly]);
    const evs = play(run);
    expect(evs).toEqual(['bottom', 'hook', 'sting', 'done']);
    expect(run.line).toEqual([]);
    expect(fish.caught).toBe(false);
    expect(leftToCatch([fish, jelly])).toBe(1);
  });

  it("lets a steady hand fish out the day's hole in a handful of drops", () => {
    const pool = icePool(7);
    let drops = 0;
    while (leftToCatch(pool) > 0 && drops < 20) {
      play(new IceRun(pool), greedy);
      drops++;
    }
    expect(leftToCatch(pool)).toBe(0);
    expect(drops).toBeLessThanOrEqual(8);
    expect(drops).toBeGreaterThanOrEqual(3);
  });

  it('draws the scene at every depth without a fault', () => {
    const v = fakeView();
    const run = new IceRun(icePool(1));
    run.drop();
    for (let i = 0; i < 20 / DT && run.phase !== 'done'; i++) {
      run.update(DT, Math.sin(i / 30));
      if (i % 20 === 0) drawIceScene(v.v.ctx, 390, 780, run, i * DT, leftToCatch(run.pool));
    }
    expect(v.calls.fill ?? 0).toBeGreaterThan(200);
  });
});

describe('the ice floe', () => {
  it("lies in the far deep's north-west corner, clear of the islands and of the Reaper's loop", () => {
    expect(pastFar(ICE_FLOE.x, ICE_FLOE.y)).toBe(true);
    expect(ICE_FLOE.x).toBeLessThan(0);
    expect(ICE_FLOE.y).toBeLessThan(0);
    for (const i of [{ x: IX, y: IY, r: IR }, ISLE2, ISLE3, ISLE5, ISLE6])
      expect(Math.hypot(i.x - ICE_FLOE.x, i.y - ICE_FLOE.y)).toBeGreaterThan(i.r + FLOE_MAX + 600);
    for (const p of ROUTE)
      expect(Math.hypot(p.x - ICE_FLOE.x, p.y - ICE_FLOE.y)).toBeGreaterThan(FLOE_MAX + 300);
  });

  it('is fished from alongside, outside what keeps a hull off it, all the way round', () => {
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      expect(floeR(a)).toBeLessThanOrEqual(FLOE_MAX + 0.01);
      const d = FLOE_MAX + 24 * 1.6 + 10;
      expect(alongsideFloe(ICE_FLOE.x + Math.cos(a) * d, ICE_FLOE.y + Math.sin(a) * d)).toBe(true);
      expect(alongsideFloe(ICE_FLOE.x + Math.cos(a) * 700, ICE_FLOE.y + Math.sin(a) * 700)).toBe(
        false,
      );
    }
    // The hole and the seals are on it, the chunks off it.
    for (const p of [ICE_HOLE, ...SEALS])
      expect(Math.hypot(p.x - ICE_FLOE.x, p.y - ICE_FLOE.y)).toBeLessThan(ICE_FLOE.r * 0.85);
    for (const c of ICE_CHUNKS)
      expect(Math.hypot(c.x - ICE_FLOE.x, c.y - ICE_FLOE.y)).toBeGreaterThan(FLOE_MAX);
    expect(ICE_W).toBeGreaterThan(300);
  });

  it('draws on the sea without a fault', () => {
    const v = fakeView();
    v.v.onScreen = () => true;
    drawFloe(v.v, 2);
    expect(v.calls.fill ?? 0).toBeGreaterThan(30);
  });
});
