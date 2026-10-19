import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CALL_T,
  CROUCH_T,
  LEADER_DMG,
  LEADER_HOME,
  LEADER_HP,
  LEADER_MELT,
  LEADER_RISE,
  LEADER_SPEED,
  LEADER_WAKE,
  LEAP_R,
  LEAP_T,
  SWEEP_WINDUP,
  TarLeader,
} from '../../src/entities/tarleader';
import { setWalkLand, WALK_SPEED } from '../../src/entities/walker';
import { drawLeaderMark, drawTarLeader } from '../../src/render/tarleader';
import { HILL_H, JETTY_END, onTarIsle, tarIsleZ } from '../../src/world/tarisle';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

type At = { x: number; y: number } | null;
const step = (L: TarLeader, at: At) =>
  L.update(1 / 60, baseWorld({ figure: at ? { ...at, vx: 0, vy: 0 } : null }));
const run = (L: TarLeader, s: number, at: () => At) => {
  for (let t = 0; t < s; t += 1 / 60) step(L, at());
};
const until = (L: TarLeader, state: string, s: number, at: () => At) => {
  for (let t = 0; t < s && L.state !== state; t += 1 / 60) step(L, at());
};
const leader = () => {
  const L = new TarLeader();
  L.here = true;
  return L;
};
/** Awake and after a figure here. */
const awake = (L: TarLeader, fig: { x: number; y: number }) => {
  step(L, fig);
  run(L, LEADER_RISE + 0.05, () => fig);
};

beforeEach(() => setWalkLand({ on: onTarIsle, z: tarIsleZ }));
afterEach(() => setWalkLand(null));

describe('the tar leader', () => {
  it("is the kid's: 25 hits, blows in his 3 to 5, slower than the figure walks", () => {
    expect(LEADER_HP).toBe(25);
    expect(LEADER_DMG).toBeGreaterThanOrEqual(3);
    expect(LEADER_DMG).toBeLessThanOrEqual(5);
    expect(LEADER_SPEED).toBeLessThan(WALK_SPEED * 0.6);
    expect(SWEEP_WINDUP).toBeGreaterThanOrEqual(0.9);
    expect(CROUCH_T).toBeGreaterThanOrEqual(0.9);
  });

  it('waits up on the high ground, on the island, well away from the jetty', () => {
    expect(onTarIsle(LEADER_HOME.x, LEADER_HOME.y)).toBe(true);
    expect(tarIsleZ(LEADER_HOME.x, LEADER_HOME.y)).toBeGreaterThan(HILL_H * 0.6);
    expect(Math.hypot(LEADER_HOME.x - JETTY_END.x, LEADER_HOME.y - JETTY_END.y)).toBeGreaterThan(
      LEADER_WAKE + 100,
    );
  });

  it('does nothing while the figure is not on the island', () => {
    const L = new TarLeader();
    run(L, 1, () => ({ x: LEADER_HOME.x + 20, y: LEADER_HOME.y }));
    expect(L.state).toBe('wait');
    expect(L.up).toBe(false);
  });

  it('roars and comes down for the figure near, a spear wakes him too', () => {
    const L = leader();
    let rose = 0;
    L.onRise = () => rose++;
    run(L, 0.5, () => ({ x: LEADER_HOME.x + LEADER_WAKE + 50, y: LEADER_HOME.y }));
    expect(L.state).toBe('wait');
    const near = { x: LEADER_HOME.x + LEADER_WAKE - 20, y: LEADER_HOME.y + 40 };
    awake(L, near);
    expect(rose).toBe(1);
    expect(L.up).toBe(true);
    expect(['chase', 'crouch']).toContain(L.state);
    const W = leader();
    W.onRise = () => rose++;
    W.hit(1);
    expect(W.state).toBe('rise');
    expect(rose).toBe(2);
  });

  it('sweeps a fan in front of him: four hearts in it, none for a figure that gets out', () => {
    const L = leader();
    const hits: number[] = [];
    L.onHit = (n) => hits.push(n);
    const fig = { x: LEADER_HOME.x + 30, y: LEADER_HOME.y + 30 };
    awake(L, fig);
    until(L, 'windup', 3, () => fig);
    expect(L.fan).not.toBeNull();
    until(L, 'sweep', 2, () => fig);
    expect(hits).toEqual([LEADER_DMG]);
    expect(L.catches(fig.x, fig.y)).toBe(true);
    // Again, and this time round behind him before it lands.
    until(L, 'windup', 5, () => fig);
    const behind = { x: L.x - (fig.x - L.x), y: L.y - (fig.y - L.y) };
    until(L, 'sweep', 2, () => behind);
    expect(hits).toHaveLength(1);
  });

  it('leaps into a ring where the figure stood: four hearts in it, none for a figure that gets out', () => {
    const L = leader();
    const hits: number[] = [];
    L.onHit = (n) => hits.push(n);
    const fig = { x: LEADER_HOME.x + 10, y: LEADER_HOME.y + 160 };
    awake(L, fig);
    until(L, 'crouch', 3, () => fig);
    expect(L.state).toBe('crouch');
    expect(Math.hypot(L.to.x - fig.x, L.to.y - fig.y)).toBeLessThan(1);
    until(L, 'recover', CROUCH_T + LEAP_T + 0.2, () => fig);
    expect(hits).toEqual([LEADER_DMG]);
    expect(Math.hypot(L.x - fig.x, L.y - fig.y)).toBeLessThan(1);
    // A fresh one, and this time out of the ring before he lands.
    const M = leader();
    M.onHit = (n) => hits.push(n);
    awake(M, fig);
    until(M, 'crouch', 3, () => fig);
    const out = { x: M.to.x + LEAP_R + 20, y: M.to.y };
    until(M, 'recover', CROUCH_T + LEAP_T + 0.2, () => out);
    expect(hits).toHaveLength(1);
  });

  it('roars for help once, at half his hits', () => {
    const L = leader();
    const calls: number[] = [];
    L.onCall = (x) => calls.push(x);
    awake(L, { x: LEADER_HOME.x + 120, y: LEADER_HOME.y });
    L.hit(LEADER_HP / 2 - 1);
    expect(calls).toHaveLength(0);
    L.hit(2);
    expect(L.state).toBe('call');
    expect(calls).toHaveLength(1);
    run(L, CALL_T + 0.1, () => ({ x: LEADER_HOME.x + 120, y: LEADER_HOME.y }));
    expect(L.state).not.toBe('call');
    L.hit(1);
    expect(calls).toHaveLength(1);
  });

  it('beaten, melts away, and stays beaten', () => {
    const L = leader();
    let beaten = 0;
    L.onBeaten = () => beaten++;
    awake(L, { x: LEADER_HOME.x + 120, y: LEADER_HOME.y });
    L.hit(LEADER_HP);
    expect(L.state).toBe('melt');
    expect(L.beaten).toBe(true);
    expect(beaten).toBe(1);
    expect(L.hit(1)).toBe(false);
    run(L, LEADER_MELT + 0.1, () => null);
    expect(L.state).toBe('gone');
    L.reset();
    expect(L.state).toBe('gone');
    expect(L.up).toBe(false);
    const fresh = leader();
    fresh.hit(3);
    fresh.reset();
    expect([fresh.state, fresh.hp]).toEqual(['wait', LEADER_HP]);
  });

  it('a stun stops a sweep being wound up', () => {
    const L = leader();
    const fig = { x: LEADER_HOME.x + 30, y: LEADER_HOME.y + 30 };
    awake(L, fig);
    until(L, 'windup', 3, () => fig);
    L.stun(1);
    expect(L.state).toBe('chase');
    expect(L.fan).toBeNull();
  });

  it('goes back up to the high ground when the figure leaves', () => {
    const L = leader();
    awake(L, { x: LEADER_HOME.x + 120, y: LEADER_HOME.y + 60 });
    run(L, 2, () => ({ x: LEADER_HOME.x + 120, y: LEADER_HOME.y + 60 }));
    run(L, 8, () => null);
    expect(L.state).toBe('wait');
    expect(Math.hypot(L.x - LEADER_HOME.x, L.y - LEADER_HOME.y)).toBeLessThan(4);
  });

  it('is beaten by a person with the second spear who keeps off, dodges a third of a second late, and throws', () => {
    let lost = 0;
    let won = 0;
    for (let trial = 0; trial < 6; trial++) {
      const L = leader();
      L.onHit = (n) => {
        lost += n;
      };
      const me = { x: LEADER_HOME.x + 60 + trial * 10, y: LEADER_HOME.y + 150 };
      expect(onTarIsle(me.x, me.y)).toBe(true);
      let reload = 0;
      let seen = -1;
      const walk = (dx: number, dy: number, dt: number) => {
        const a = Math.atan2(dy, dx);
        for (const da of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.2, -2.2]) {
          const nx = me.x + Math.cos(a + da) * WALK_SPEED * dt;
          const ny = me.y + Math.sin(a + da) * WALK_SPEED * dt;
          if (!onTarIsle(nx, ny)) continue;
          me.x = nx;
          me.y = ny;
          return;
        }
      };
      L.hit(1);
      for (let t = 0; t < 180 && L.state !== 'melt' && L.state !== 'gone'; t += 1 / 60) {
        const dt = 1 / 60;
        step(L, me);
        reload -= dt;
        const dx = L.x - me.x;
        const dy = L.y - me.y;
        const d = Math.hypot(dx, dy);
        const winding = L.state === 'windup' || L.state === 'crouch' || L.state === 'leap';
        if (winding) {
          if (seen < 0) seen = L.t;
          if (L.t - seen > 0.33) {
            if (L.state === 'windup' && L.fan && TarLeader.inFan(L.fan, me.x, me.y)) {
              walk(-dx, -dy, dt);
              continue;
            }
            if (
              (L.state === 'crouch' || L.state === 'leap') &&
              Math.hypot(me.x - L.to.x, me.y - L.to.y) < LEAP_R + 8
            ) {
              walk(me.x - L.to.x || 1, me.y - L.to.y, dt);
              continue;
            }
          }
        } else seen = -1;
        if (d < 90) walk(-dx, -dy, dt);
        else if (d > 120) walk(dx, dy, dt);
        if (reload <= 0 && d <= 125) {
          L.hit(1);
          reload = 0.7;
        }
      }
      if (L.beaten) won++;
    }
    expect(won).toBe(6);
    expect(lost).toBeLessThanOrEqual(LEADER_DMG);
  });

  it('is drawn, with the fan and the ring on the ground while he winds up', () => {
    const L = leader();
    const f = fakeView();
    drawTarLeader(f.v, L);
    expect(f.calls.fill ?? 0).toBeGreaterThan(6);
    const before = f.calls.fill ?? 0;
    drawLeaderMark(f.v, L);
    expect(f.calls.fill ?? 0).toBe(before);
    const fig = { x: LEADER_HOME.x + 30, y: LEADER_HOME.y + 30 };
    awake(L, fig);
    until(L, 'windup', 3, () => fig);
    drawLeaderMark(f.v, L);
    drawTarLeader(f.v, L);
    expect(f.calls.fill ?? 0).toBeGreaterThan(before + 6);
  });
});
