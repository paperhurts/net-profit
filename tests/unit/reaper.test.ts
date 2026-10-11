import { describe, expect, it } from 'vitest';
import { angDiff, rng } from '../../src/core/math';
import {
  AWAY,
  HARPOON_POWER,
  HARPOON_RANGE,
  HARPOON_RELOAD,
  RESOLVE,
} from '../../src/data/harpoon';
import { SPEED } from '../../src/data/tuning';
import { steerBoat } from '../../src/entities/boat';
import type { World } from '../../src/entities/entity';
import {
  CALM,
  COIL_ANGRY,
  COIL_BACK,
  COIL_T,
  inSwept,
  LEASH,
  NOTICE,
  REACH,
  Reaper,
  ROUTE,
  SPAN,
  SWEEP_HIT,
  SWEEP_T,
} from '../../src/entities/reaper';
import { SPEAR_SPEED } from '../../src/entities/spears';
import { FLOE_MAX, ICE_FLOE } from '../../src/world/icefloe';
import { DEEP, FAR, IR, IX, IY, pastBuoys, pastFar, WS } from '../../src/world/island';
import { ISLE2 } from '../../src/world/isle2';
import { ISLE3 } from '../../src/world/isle3';
import { ISLE4 } from '../../src/world/isle4';
import { ISLE5 } from '../../src/world/isle5';
import { ISLE6 } from '../../src/world/isle6';
import { ISLE7 } from '../../src/world/isle7';
import { ISLE8, ISLE9 } from '../../src/world/isle8';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
/** The stick's screen vector for a world direction. */
const stick = (wx: number, wy: number): [number, number] => {
  const sx = wx - wy;
  const sy = (wx + wy) / 2;
  const n = Math.hypot(sx, sy) || 1;
  return [sx / n, sy / n];
};
const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
const START = ROUTE[0] as { x: number; y: number };

/** A flagship this far east of where he starts his loop, out in the deep. */
const near = (d = NOTICE - 100, v = 0): World =>
  baseWorld({ hullScale: 1.6, boat: { x: START.x + d, y: START.y, h: Math.PI, v } });

const run = (r: Reaper, w: World, seconds: number) => {
  for (let i = 0; i < seconds / DT; i++) r.update(DT, w);
};

describe('the Reaper', () => {
  it('roams a loop through the deep and the far deep, clear of every island, past the buoys all the way', () => {
    const islands = [
      { x: IX, y: IY, r: IR },
      ISLE2,
      ISLE3,
      ISLE4,
      ISLE5,
      ISLE6,
      ISLE7,
      ISLE8,
      ISLE9,
      { x: ICE_FLOE.x, y: ICE_FLOE.y, r: FLOE_MAX },
    ];
    let far = 0;
    let all = 0;
    ROUTE.forEach((p, i) => {
      const q = ROUTE[(i + 1) % ROUTE.length] as { x: number; y: number };
      const l = Math.hypot(q.x - p.x, q.y - p.y);
      for (let s = 0; s < l; s += 50) {
        const x = p.x + ((q.x - p.x) * s) / l;
        const y = p.y + ((q.y - p.y) * s) / l;
        all++;
        if (pastFar(x, y)) far++;
        expect(pastBuoys(x, y), `${x}, ${y}`).toBe(true);
        expect(Math.min(x, y)).toBeGreaterThan(-DEEP - FAR + 200);
        expect(Math.max(x, y)).toBeLessThan(WS + DEEP + FAR - 200);
        for (const isle of islands)
          expect(Math.hypot(x - isle.x, y - isle.y), `${x}, ${y}`).toBeGreaterThan(isle.r + 200);
      }
    });
    // Out in the far deep about half the way round.
    expect(far / all).toBeGreaterThan(0.3);
    expect(far / all).toBeLessThan(0.7);
    // And he swims it, all the way round in a few minutes.
    const r = new Reaper();
    const w = baseWorld({ boat: { x: IX, y: IY, h: 0, v: 0 } });
    const legs = new Set<number>();
    for (let i = 0; i < 300 / DT; i++) {
      r.update(DT, w);
      legs.add(r.leg);
      for (const isle of islands)
        expect(Math.hypot(r.x - isle.x, r.y - isle.y)).toBeGreaterThan(isle.r + 80);
    }
    expect(legs.size).toBe(ROUTE.length);
    expect(r.state).toBe('roam');
  });

  it('hunts a boat that comes near him past the buoys, and only then', () => {
    const r = new Reaper();
    let hunts = 0;
    r.onHunt = () => hunts++;
    // Inside the buoys, however near, he lets it be.
    const w = baseWorld({ boat: { x: WS - 50, y: START.y, h: 0, v: 0 } });
    r.x = WS + 200;
    r.y = START.y;
    run(r, w, 0.5);
    expect(r.state).toBe('roam');
    // Past them, he comes.
    const r2 = new Reaper();
    r2.onHunt = () => hunts++;
    run(r2, near(NOTICE + 200), 0.2);
    expect(r2.state).toBe('roam');
    const w2 = near(NOTICE - 60);
    run(r2, w2, 0.2);
    expect(r2.state).toBe('stalk');
    expect(hunts).toBe(1);
    // Not while another beast is after the boat.
    const r3 = new Reaper();
    r3.holdOff = () => true;
    run(r3, near(), 1);
    expect(r3.state).toBe('roam');
  });

  it('gives up, whole, when the boat goes home, ties up or gets far from where he found it, and calms down a while', () => {
    for (const leave of ['home', 'dock', 'far'] as const) {
      const r = new Reaper();
      let gave = 0;
      r.onGiveUp = () => gave++;
      const w = near();
      run(r, w, 0.2);
      expect(r.hunting).toBe(true);
      r.resolve = 2;
      if (leave === 'home') w.boat.x = WS - 100;
      if (leave === 'dock') w.docked = true;
      if (leave === 'far') w.boat.x = START.x + LEASH + 100;
      run(r, w, 0.1);
      expect(r.state, leave).toBe('roam');
      expect(r.resolve).toBe(RESOLVE.reaper);
      expect(gave).toBe(1);
      // Calm: he does not come straight back for it.
      w.docked = false;
      w.boat.x = r.x + 200;
      w.boat.y = r.y;
      run(r, w, CALM - 2);
      expect(r.state).toBe('roam');
    }
  });

  it('shows a fan before he sweeps, and his tail hits a boat that stays in it', () => {
    const r = new Reaper();
    let warns = 0;
    let hits = 0;
    r.onWarn = () => warns++;
    r.onSweep = () => hits++;
    const w = near(300);
    // Sit still, right where he will sweep.
    for (let i = 0; i < 20 / DT && hits === 0; i++) {
      r.update(DT, w);
      if (r.state === 'coil') {
        expect(r.fan).not.toBeNull();
        expect(Math.abs(Math.abs((r.fan?.a1 ?? 0) - (r.fan?.a0 ?? 0)) - 2 * SPAN)).toBeLessThan(
          1e-6,
        );
      }
    }
    expect(warns).toBeGreaterThan(0);
    expect(hits).toBe(1);
    expect(SWEEP_HIT).toBeGreaterThan(0);
  });

  it('counts a boat swept only inside the fan, out to his reach', () => {
    const f = { x: 0, y: 0, a0: -SPAN, a1: SPAN };
    expect(inSwept(f, SPAN, REACH - 10, 0, 30)).toBe(true);
    expect(inSwept(f, SPAN, REACH + 50, 0, 30)).toBe(false);
    expect(inSwept(f, SPAN, -100, 0, 30)).toBe(false);
    // Only as far round as the tail has got.
    expect(inSwept(f, -SPAN + 0.2, 150, 0, 30)).toBe(false);
    expect(inSwept(f, 0.1, 150, 0, 30)).toBe(true);
    // Sweeping the other way round.
    const g = { x: 0, y: 0, a0: SPAN, a1: -SPAN };
    expect(inSwept(g, SPAN - 0.3, 0, -150, 30)).toBe(false);
    expect(inSwept(g, -SPAN, 0, -150, 30)).toBe(false);
    expect(inSwept(g, -SPAN, 150, 0, 30)).toBe(true);
  });

  it('can be harpooned only reared up, is driven off after his resolve, and comes back to roam whole', () => {
    const r = new Reaper();
    const w = near(300);
    let rears = 0;
    r.onRear = () => rears++;
    for (let i = 0; i < 30 / DT && rears === 0; i++) {
      r.update(DT, w);
      if (r.state !== 'rear') expect(r.mark()).toBeNull();
      expect(r.harpoon(1)).toBe(false);
    }
    expect(rears).toBe(1);
    run(r, w, 0.3);
    expect(r.mark()).not.toBeNull();
    for (let i = 1; i < RESOLVE.reaper; i++) expect(r.harpoon(1)).toBe(false);
    expect(r.angry).toBe(true);
    expect(r.harpoon(1)).toBe(true);
    expect(r.state).toBe('away');
    expect(r.hunting).toBe(false);
    run(r, w, AWAY + 1);
    expect(r.state).toBe('roam');
    expect(r.resolve).toBe(RESOLVE.reaper);
  });

  it('sweeps twice, there and back, when he is angry, with the warnings shorter', () => {
    const r = new Reaper();
    r.resolve = 2;
    const w = near(300);
    const states: string[] = [];
    for (let i = 0; i < 20 / DT && !states.includes('rear'); i++) {
      r.update(DT, w);
      if (states[states.length - 1] !== r.state) states.push(r.state);
    }
    const from = states.indexOf('coil');
    expect(states.slice(from, from + 6)).toEqual([
      'coil',
      'sweep',
      'coil',
      'sweep',
      'lunge',
      'rear',
    ]);
    expect(COIL_ANGRY).toBeLessThan(COIL_T);
    expect(COIL_BACK).toBeLessThan(COIL_ANGRY);
  });

  it('draws in every state without a fault', () => {
    const r = new Reaper();
    const w = near(300);
    const v = fakeView();
    v.v.onScreen = () => true;
    const seen = new Set<string>();
    for (let i = 0; i < 40 / DT; i++) {
      r.update(DT, w);
      seen.add(r.state);
      if (r.mark() && i % 40 === 0) r.harpoon(1);
      v.v.T = i * DT;
      for (const l of ['surface', 'air', 'overlay'] as const) r.draw(v.v, l);
    }
    expect([...seen]).toEqual(expect.arrayContaining(['stalk', 'coil', 'sweep', 'rear', 'sink']));
    expect(v.calls.fill ?? 0).toBeGreaterThan(300);
  });
});

/** How long a person takes to see the fan and turn away. */
const REACT = 0.35;

/**
 * A person at the wheel of a flagship out in the deep where he found them: sails round there, and makes
 * for him whenever he is reared up; a reaction time after a fan shows, turns hard away from the middle of
 * it until the sweep is done (or minds nothing, with no reaction); taps the harpoon half a second after he
 * rears up in reach, and again each time it has reloaded and a third of a second more, the harpoon flying
 * its real time. Wins out of 30, the boat's health it costs on average, and how long a win takes. Sunk is
 * a loss.
 */
function fights(react: number | null): { wins: number; lost: number; secs: number } {
  const r0 = rng(71 + (react ?? 9) * 100);
  let wins = 0;
  let lost = 0;
  let time = 0;
  for (let n = 0; n < 30; n++) {
    const r = new Reaper();
    const a0 = r0() * Math.PI - Math.PI / 2;
    const w = baseWorld({
      hullScale: 1.6,
      boat: {
        x: START.x + 200 + Math.cos(a0) * 400,
        y: START.y + Math.sin(a0) * 400,
        h: a0 + Math.PI / 2,
        v: 200,
      },
    });
    const home = { x: START.x + 400, y: START.y };
    let hp = 100;
    let ready = 0;
    let upAt = -1;
    let fanAt = -1;
    const pending: { at: number }[] = [];
    r.onSweep = () => {
      hp -= SWEEP_HIT;
    };
    let t = 0;
    const way = n % 2 ? 1 : -1;
    for (; t < 240 && hp > 0 && r.state !== 'away'; t += DT) {
      w.T = t;
      const b = w.boat;
      if (r.fan && fanAt < 0) fanAt = t;
      if (!r.fan) fanAt = -1;
      // Round about where he found the boat, at about 350.
      const ra = Math.atan2(b.y - home.y, b.x - home.x);
      const rd = Math.hypot(b.x - home.x, b.y - home.y);
      let dx = -Math.sin(ra) * way + Math.cos(ra) * clamp1((350 - rd) / 150);
      let dy = Math.cos(ra) * way + Math.sin(ra) * clamp1((350 - rd) / 150);
      const m = r.mark();
      if (m) {
        const gx = m.x - b.x;
        const gy = m.y - b.y;
        const gl = Math.hypot(gx, gy) || 1;
        dx = gx / gl;
        dy = gy / gl;
      }
      if (react !== null && r.fan && t - fanAt >= react) {
        // Away from the middle of the fan.
        const f = r.fan;
        const mid = f.a0 + angDiff(f.a1, f.a0) / 2;
        const ax = b.x - (f.x + Math.cos(mid) * REACH * 0.5);
        const ay = b.y - (f.y + Math.sin(mid) * REACH * 0.5);
        const al = Math.hypot(ax, ay) || 1;
        dx = ax / al;
        dy = ay / al;
      }
      steerBoat(b, ...stick(dx, dy), SPEED[5], DT);
      if (m && upAt < 0) upAt = t;
      if (!m) upAt = -1;
      const bow = { x: b.x + Math.cos(b.h) * 38, y: b.y + Math.sin(b.h) * 38 };
      const reach = m ? Math.hypot(m.x - bow.x, m.y - bow.y) : Number.POSITIVE_INFINITY;
      if (m && t - upAt >= 0.5 && t >= ready && reach < HARPOON_RANGE) {
        ready = t + HARPOON_RELOAD + 1 / 3;
        pending.push({ at: t + Math.max(0.12, reach / SPEAR_SPEED) });
      }
      for (let i = pending.length - 1; i >= 0; i--) {
        if (t >= (pending[i] as { at: number }).at) {
          pending.splice(i, 1);
          r.harpoon(HARPOON_POWER, null, true);
        }
      }
      r.update(DT, w);
    }
    if (r.state === 'away') {
      wins++;
      time += t;
    }
    lost += 100 - Math.max(0, hp);
  }
  return { wins, lost: lost / 30, secs: wins ? time / wins : 0 };
}

describe('fighting the Reaper', () => {
  it('is won by sailing out of his fans and harpooning him reared up', () => {
    const f = fights(REACT);
    expect(f.wins).toBeGreaterThanOrEqual(27);
    expect(f.lost).toBeLessThan(25);
    expect(f.secs).toBeGreaterThan(20);
    expect(f.secs).toBeLessThan(90);
  });

  it('costs a slow hand more of the boat, and one who never minds the fans most of it', () => {
    const quick = fights(REACT).lost;
    expect(fights(0.8).lost).toBeGreaterThan(quick);
    expect(fights(null).lost).toBeGreaterThan(60);
  });

  it('warns longer than it takes to see the fan and turn away', () => {
    expect(COIL_BACK).toBeGreaterThan(REACT + 0.3);
    expect(SWEEP_T).toBeGreaterThan(0.3);
  });
});
