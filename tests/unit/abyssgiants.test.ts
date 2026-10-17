import { describe, expect, it } from 'vitest';
import {
  GIANT_KINDS,
  type GiantEvent,
  Giants,
  PASS_AT,
  RISE,
  SLAM_R,
} from '../../src/entities/abyssgiants';
import { drawGiantGlow, drawGiants } from '../../src/render/abyssgiants';
import { ABYSS_ENTRY, AD, CAGE_REST, holeHalf } from '../../src/world/abyss';
import { fakeView } from './helpers/view';

const DT = 1 / 60;

type Cage = { x: number; y: number; go: 'down' | 'wait' | 'up' };

/** Ride a cage down at speed, the giants coming past; every event, and each giant's lowest and highest on screen. */
function ride(g: Giants, sp = 210): { events: GiantEvent[]; cage: Cage } {
  const cage: Cage = { x: ABYSS_ENTRY, y: 40, go: 'down' };
  const events: GiantEvent[] = [];
  for (let t = 0; t < 40; t += DT) {
    cage.y = Math.min(CAGE_REST, cage.y + sp * DT);
    if (cage.y >= CAGE_REST) cage.go = 'wait';
    const ev = g.update(DT, cage);
    if (ev) events.push(ev);
  }
  return { events, cage };
}

describe('the giants passing the cage', () => {
  it('are the five the kid named, in an order of each ride, past the hole and well above the floor', () => {
    expect([...GIANT_KINDS].sort()).toEqual(
      ['cthulhu', 'cthuluviathan', 'gulper', 'leviathan', 'reaper'].sort(),
    );
    // The first comes where the hole is already wider than the screen, the last passes well over the floor.
    expect(holeHalf(PASS_AT[0] as number)).toBeGreaterThan(260);
    expect((PASS_AT.at(-1) as number) + RISE).toBeLessThan(AD - 100);
    const orders = new Set<string>();
    for (let seed = 1; seed < 30; seed++) {
      const g = new Giants();
      g.reset(seed);
      expect(g.list.map((x) => x.kind).sort()).toEqual([...GIANT_KINDS].sort());
      // One of the swimmers lunges; Cthulhu only hangs there.
      const lungers = g.list.filter((x) => x.lunges);
      expect(lungers).toHaveLength(1);
      expect(lungers[0]?.kind).not.toBe('cthulhu');
      expect(g.list.at(-1)?.lunges).toBe(false);
      expect(g.list.at(-1)?.kind).not.toBe('cthulhu');
      orders.add(g.list.map((x) => x.kind).join());
    }
    expect(orders.size).toBeGreaterThan(5);
  });

  it('each come past on the way down, near enough to see, and are gone by the floor; one slams the cage', () => {
    for (let seed = 1; seed < 12; seed++) {
      const g = new Giants();
      g.reset(seed);
      const cage: Cage = { x: ABYSS_ENTRY, y: 40, go: 'down' };
      const seen = new Set<string>();
      const events: GiantEvent[] = [];
      for (let t = 0; t < 40; t += DT) {
        cage.y = Math.min(CAGE_REST, cage.y + 210 * DT);
        if (cage.y >= CAGE_REST) cage.go = 'wait';
        const ev = g.update(DT, cage);
        if (ev) events.push(ev);
        // On screen with the cage: the view is 440 across and more than 800 high.
        for (const x of g.list)
          if (
            x.state !== 'wait' &&
            x.state !== 'gone' &&
            Math.abs(x.x - cage.x) < 220 &&
            Math.abs(x.y - cage.y) < 400
          )
            seen.add(x.kind);
      }
      expect([...seen].sort()).toEqual([...GIANT_KINDS].sort());
      expect(events.filter((e) => e === 'pass')).toHaveLength(5);
      expect(events.filter((e) => e === 'tell')).toHaveLength(1);
      expect(events.filter((e) => e === 'slam')).toHaveLength(1);
      expect(events.indexOf('tell')).toBeLessThan(events.indexOf('slam'));
      expect(g.list.every((x) => x.state === 'gone')).toBe(true);
      expect(g.shake).toBe(0);
    }
  });

  it('swimmers rise past the cage as it goes down, from below it to above it', () => {
    const g = new Giants();
    g.reset(3);
    const cage: Cage = { x: ABYSS_ENTRY, y: 40, go: 'down' };
    const swimmer = g.list.find((x) => x.kind !== 'cthulhu' && !x.lunges);
    if (!swimmer) throw new Error('no swimmer');
    let below = false;
    let above = false;
    for (let t = 0; t < 40 && swimmer.state !== 'gone'; t += DT) {
      cage.y = Math.min(CAGE_REST, cage.y + 210 * DT);
      g.update(DT, cage);
      if (swimmer.state === 'pass') {
        if (swimmer.y - cage.y > RISE * 0.8) below = true;
        if (cage.y - swimmer.y > RISE * 0.8) above = true;
      }
    }
    expect([below, above]).toEqual([true, true]);
  });

  it('the lunger warns, comes at the cage, slams into it and shakes it, and turns away', () => {
    const g = new Giants();
    g.reset(5);
    const cage: Cage = { x: ABYSS_ENTRY, y: 40, go: 'down' };
    const lunger = g.list.find((x) => x.lunges);
    if (!lunger) throw new Error('no lunger');
    let slammedAt = -1;
    let nearest = Infinity;
    for (let t = 0; t < 40; t += DT) {
      cage.y = Math.min(CAGE_REST, cage.y + 210 * DT);
      const ev = g.update(DT, cage);
      if (lunger.state === 'lunge')
        nearest = Math.min(nearest, Math.hypot(lunger.x - cage.x, lunger.y - cage.y));
      if (ev === 'slam') {
        slammedAt = t;
        expect(g.shake).toBe(1);
        expect(lunger.state).toBe('back');
      }
      if (slammedAt >= 0 && t > slammedAt + 0.2) break;
    }
    expect(slammedAt).toBeGreaterThan(0);
    expect(nearest).toBeLessThan(SLAM_R + 12);
    expect(g.shake).toBeLessThan(1);
    expect(g.lunging).toBeNull();
  });

  it('do not come once the cage is ridden back up, and there is nothing to pass with no cage', () => {
    const g = new Giants();
    g.reset(2);
    const cage: Cage = { x: ABYSS_ENTRY, y: 900, go: 'up' };
    for (let t = 0; t < 5; t += DT) expect(g.update(DT, cage)).toBeNull();
    expect(g.list.every((x) => x.state === 'wait')).toBe(true);
    expect(g.update(DT, null)).toBeNull();
    const { events } = ride(new Giants());
    expect(events).toEqual([]);
  });

  it('each is drawn, its body under the dark and its eyes over it, in every state, and nothing once gone', () => {
    const X = (v: number) => v;
    for (const state of ['pass', 'tell', 'lunge', 'back'] as const) {
      const g = new Giants();
      g.reset(1);
      for (const x of g.list) {
        x.state = state;
        x.x = 500;
        x.y = 1500;
        x.a = state === 'lunge' ? -2.5 : 0;
      }
      for (const x of g.list) {
        const one = new Giants();
        one.list = [x];
        const body = fakeView();
        drawGiants(body.v.ctx, X, X, 0.9, one, 1);
        const glow = fakeView();
        drawGiantGlow(glow.v.ctx, X, X, 0.9, one, 1);
        const n = (v: ReturnType<typeof fakeView>) => (v.calls.fill ?? 0) + (v.calls.stroke ?? 0);
        expect(n(body), `${x.kind} ${state} body`).toBeGreaterThan(3);
        expect(n(glow), `${x.kind} ${state} glow`).toBeGreaterThan(0);
      }
    }
    const g = new Giants();
    g.reset(1);
    for (const x of g.list) x.state = 'gone';
    const v = fakeView();
    drawGiants(v.v.ctx, X, X, 1, g, 1);
    drawGiantGlow(v.v.ctx, X, X, 1, g, 1);
    expect((v.calls.fill ?? 0) + (v.calls.stroke ?? 0)).toBe(0);
  });
});
