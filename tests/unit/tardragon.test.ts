import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AIM_T,
  BALL_GAP,
  BALL_R,
  BALL_T,
  CLIMB_T,
  DRAGON_DMG,
  DRAGON_FLY,
  DRAGON_HIGH,
  DRAGON_HP,
  DRAGON_LEASH,
  DRAGON_MELT,
  DRAGON_ROOST,
  DRAGON_WAKE,
  HOLD_T,
  HOVER_MAX,
  HOVER_T,
  LANDED_T,
  LOW_Z,
  SHRIEK_T,
  SPIT_WINDUP,
  SWOOP_T,
  SWOOP_W,
  TarDragon,
} from '../../src/entities/tardragon';
import { LEADER_HOME, LEADER_WAKE } from '../../src/entities/tarleader';
import { setWalkLand, WALK_SPEED } from '../../src/entities/walker';
import {
  drawDragonBalls,
  drawDragonMark,
  drawDragonShadow,
  drawTarDragon,
} from '../../src/render/tardragon';
import { JETTY_END, onTarIsle, tarIsleZ } from '../../src/world/tarisle';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

type Pt = { x: number; y: number };
type At = Pt | null;
const step = (D: TarDragon, at: At) =>
  D.update(1 / 60, baseWorld({ figure: at ? { ...at, vx: 0, vy: 0 } : null }));
const run = (D: TarDragon, s: number, at: () => At) => {
  for (let t = 0; t < s; t += 1 / 60) step(D, at());
};
const until = (D: TarDragon, state: string, s: number, at: () => At) => {
  for (let t = 0; t < s && D.state !== state; t += 1 / 60) step(D, at());
};
const dragon = () => {
  const D = new TarDragon();
  D.here = true;
  return D;
};
/** Under it, near enough to wake it, on the rock. */
const UNDER = { x: DRAGON_ROOST.x - 40, y: DRAGON_ROOST.y - 30 };

beforeEach(() => setWalkLand({ on: onTarIsle, z: tarIsleZ }));
afterEach(() => setWalkLand(null));

describe('the tar dragon', () => {
  it("is the kid's: 15 to 20 hits, blows in his 3 to 5, every blow wound up, slower than the figure", () => {
    expect(DRAGON_HP).toBeGreaterThanOrEqual(15);
    expect(DRAGON_HP).toBeLessThanOrEqual(20);
    expect(DRAGON_DMG).toBeGreaterThanOrEqual(3);
    expect(DRAGON_DMG).toBeLessThanOrEqual(5);
    expect(SPIT_WINDUP + BALL_T).toBeGreaterThanOrEqual(1.2);
    expect(AIM_T).toBeGreaterThanOrEqual(0.9);
    expect(DRAGON_FLY).toBeLessThan(WALK_SPEED);
    // Its three rings touch, so there is no gap to stand in between them.
    expect(BALL_GAP).toBeLessThan(BALL_R * 2);
  });

  it("circles over the island, well off the jetty, out of the tar leader's way", () => {
    expect(onTarIsle(UNDER.x, UNDER.y)).toBe(true);
    expect(Math.hypot(DRAGON_ROOST.x - JETTY_END.x, DRAGON_ROOST.y - JETTY_END.y)).toBeGreaterThan(
      DRAGON_WAKE + 150,
    );
    // Nowhere wakes the both of them at once.
    expect(
      Math.hypot(DRAGON_ROOST.x - LEADER_HOME.x, DRAGON_ROOST.y - LEADER_HOME.y),
    ).toBeGreaterThan(LEADER_WAKE + DRAGON_WAKE);
  });

  it('goes round and round up high, seen from the boat, and does nothing else while the figure is not ashore', () => {
    const D = new TarDragon();
    const x0 = D.x;
    const y0 = D.y;
    run(D, 2, () => UNDER);
    expect(D.state).toBe('circle');
    expect(D.up).toBe(false);
    expect(D.z).toBe(DRAGON_HIGH);
    expect(Math.hypot(D.x - x0, D.y - y0)).toBeGreaterThan(40);
  });

  it('shrieks and comes for the figure near under it, out of reach of a spear up there', () => {
    const D = dragon();
    let rose = 0;
    D.onRise = () => rose++;
    run(D, 0.5, () => ({ x: DRAGON_ROOST.x - DRAGON_WAKE - 30, y: DRAGON_ROOST.y }));
    expect(D.state).toBe('circle');
    run(D, SHRIEK_T + 0.1, () => UNDER);
    expect(rose).toBe(1);
    expect(D.up).toBe(true);
    expect(D.state).toBe('hover');
    expect(D.low).toBe(false);
    const hp = D.hp;
    expect(D.hit(1)).toBe(false);
    expect(D.hp).toBe(hp);
  });

  it('spits three balls of tar into three rings in a row: three hearts in one, none for a figure that gets out', () => {
    const D = dragon();
    const hits: number[] = [];
    D.onHit = (n) => hits.push(n);
    const fig = { ...UNDER };
    until(D, 'spit', 4, () => fig);
    expect(D.state).toBe('spit');
    expect(D.balls).toHaveLength(3);
    expect(D.catches(fig.x, fig.y)).toBe(true);
    // In a row across the dragon's line to the figure.
    const [b0, , b2] = D.balls as [Pt, Pt, Pt];
    const rx = b2.x - b0.x;
    const ry = b2.y - b0.y;
    expect(Math.abs(rx * (fig.x - D.x) + ry * (fig.y - D.y))).toBeLessThan(
      1e-6 * Math.hypot(rx, ry) * 400,
    );
    until(D, 'hover', SPIT_WINDUP + BALL_T + 0.2, () => fig);
    expect(hits).toEqual([DRAGON_DMG]);
    // Again, and this time out of the rings, toward the dragon, before they land.
    const E = dragon();
    E.onHit = (n) => hits.push(n);
    until(E, 'spit', 4, () => fig);
    const d = Math.hypot(E.x - fig.x, E.y - fig.y);
    const out = {
      x: fig.x + ((E.x - fig.x) / d) * (BALL_R + 10),
      y: fig.y + ((E.y - fig.y) / d) * (BALL_R + 10),
    };
    expect(E.catches(out.x, out.y)).toBe(false);
    until(E, 'hover', SPIT_WINDUP + BALL_T + 0.2, () => out);
    expect(hits).toHaveLength(1);
  });

  it('swoops down a lane through the figure: three hearts on it, none off it, and lands at its end', () => {
    const D = dragon();
    const hits: number[] = [];
    D.onHit = (n) => hits.push(n);
    const fig = { ...UNDER };
    until(D, 'aim', 8, () => fig);
    expect(D.state).toBe('aim');
    // Its spit came first, and caught the figure standing still; this is the swoop.
    hits.length = 0;
    expect(D.inLane(fig.x, fig.y)).toBe(true);
    expect(onTarIsle(D.to.x, D.to.y)).toBe(true);
    until(D, 'landed', AIM_T + SWOOP_T + 0.2, () => fig);
    expect(hits).toEqual([DRAGON_DMG]);
    expect(Math.hypot(D.x - D.to.x, D.y - D.to.y)).toBeLessThan(1);
    expect(D.low).toBe(true);
    // A fresh one, and off its lane before it comes.
    const E = dragon();
    E.onHit = (n) => hits.push(n);
    until(E, 'aim', 8, () => fig);
    hits.length = 1;
    const L = Math.hypot(E.to.x - E.from.x, E.to.y - E.from.y);
    const off = {
      x: fig.x - ((E.to.y - E.from.y) / L) * (SWOOP_W + 12),
      y: fig.y + ((E.to.x - E.from.x) / L) * (SWOOP_W + 12),
    };
    expect(E.inLane(off.x, off.y)).toBe(false);
    until(E, 'landed', AIM_T + SWOOP_T + 0.2, () => off);
    expect(hits).toHaveLength(1);
  });

  it('down on the ground it can be speared, then it climbs back out of reach', () => {
    const D = dragon();
    const fig = { ...UNDER };
    until(D, 'landed', 12, () => fig);
    expect(D.hit(1)).toBe(true);
    expect(D.hp).toBe(DRAGON_HP - 1);
    run(D, LANDED_T + CLIMB_T + 0.1, () => fig);
    expect(D.z).toBeGreaterThan(LOW_Z);
    expect(D.hit(1)).toBe(false);
  });

  it('a stun on the ground holds it down a moment longer, once a landing', () => {
    const D = dragon();
    const fig = { ...UNDER };
    until(D, 'landed', 12, () => fig);
    run(D, 1, () => fig);
    D.stun(1);
    D.stun(1);
    run(D, LANDED_T - 1 + HOLD_T - 0.1, () => fig);
    expect(D.state).toBe('landed');
    run(D, 0.2, () => fig);
    expect(D.state).toBe('climb');
  });

  it('goes back to circling when the figure goes off, and wakes again for it', () => {
    const D = dragon();
    run(D, SHRIEK_T + 0.1, () => UNDER);
    expect(D.up).toBe(true);
    const away = { x: DRAGON_ROOST.x - DRAGON_LEASH - 20, y: DRAGON_ROOST.y - 100 };
    until(D, 'circle', 20, () => away);
    expect(D.state).toBe('circle');
    expect(D.z).toBe(DRAGON_HIGH);
    run(D, 0.1, () => UNDER);
    expect(D.state).toBe('shriek');
  });

  it('beaten, falls and melts away, and is back whole the next landing', () => {
    const D = dragon();
    let beaten = 0;
    D.onBeaten = () => beaten++;
    const fig = { ...UNDER };
    until(D, 'landed', 12, () => fig);
    D.hit(DRAGON_HP);
    expect(D.state).toBe('melt');
    expect(beaten).toBe(1);
    expect(D.hit(1)).toBe(false);
    run(D, DRAGON_MELT + 0.1, () => fig);
    expect(D.state).toBe('gone');
    expect(D.up).toBe(false);
    D.reset();
    expect([D.state, D.hp, D.z]).toEqual(['circle', DRAGON_HP, DRAGON_HIGH]);
  });

  it('is beaten by a person with the second spear who dodges a third of a second late and throws when it is down', () => {
    let lost = 0;
    let won = 0;
    for (let trial = 0; trial < 6; trial++) {
      const D = dragon();
      D.onHit = (n) => {
        lost += n;
      };
      const me = { x: UNDER.x - trial * 12, y: UNDER.y + trial * 6 };
      expect(onTarIsle(me.x, me.y)).toBe(true);
      let reload = 0;
      let seen = -1;
      const walk = (dx: number, dy: number, dt: number) => {
        const a = Math.atan2(dy, dx);
        for (const da of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.2, -2.2, Math.PI]) {
          const nx = me.x + Math.cos(a + da) * WALK_SPEED * dt;
          const ny = me.y + Math.sin(a + da) * WALK_SPEED * dt;
          if (!onTarIsle(nx, ny)) continue;
          me.x = nx;
          me.y = ny;
          return;
        }
      };
      for (let t = 0; t < 180 && D.state !== 'melt' && D.state !== 'gone'; t += 1 / 60) {
        const dt = 1 / 60;
        step(D, me);
        reload -= dt;
        const warned =
          D.state === 'spit' || D.state === 'volley' || D.state === 'aim' || D.state === 'swoop';
        if (warned) {
          if (seen < 0) seen = t;
          if (t - seen > 0.33) {
            if (
              (D.state === 'spit' || D.state === 'volley') &&
              D.balls.some((b) => Math.hypot(me.x - b.x, me.y - b.y) < BALL_R + 8)
            ) {
              // Across the row of rings: they run side to side, so step out front or back.
              const [b0, b1, b2] = D.balls as [Pt, Pt, Pt];
              const ex = -(b2.y - b0.y);
              const ey = b2.x - b0.x;
              const s = (me.x - b1.x) * ex + (me.y - b1.y) * ey >= 0 ? 1 : -1;
              walk(ex * s, ey * s, dt);
              continue;
            }
            if ((D.state === 'aim' || D.state === 'swoop') && laneD(D, me) < SWOOP_W + 10) {
              const lx = D.to.x - D.from.x;
              const ly = D.to.y - D.from.y;
              const s = (me.x - D.from.x) * -ly + (me.y - D.from.y) * lx >= 0 ? 1 : -1;
              walk(-ly * s, lx * s, dt);
              continue;
            }
          }
        } else seen = -1;
        const d = Math.hypot(D.x - me.x, D.y - me.y);
        if (D.low) {
          if (d > 100) walk(D.x - me.x, D.y - me.y, dt);
          if (reload <= 0 && d <= 125) {
            D.hit(1);
            reload = 0.7;
          }
        } else if (Math.hypot(me.x - DRAGON_ROOST.x, me.y - DRAGON_ROOST.y) > 160)
          walk(DRAGON_ROOST.x - me.x, DRAGON_ROOST.y - me.y, dt);
      }
      if (D.state === 'melt' || D.state === 'gone') won++;
    }
    expect(won).toBe(6);
    expect(lost).toBeLessThanOrEqual(DRAGON_DMG);
  });

  it('is drawn, with its shadow, the rings, the lane and its balls of tar in the air', () => {
    const D = dragon();
    const f = fakeView();
    drawDragonShadow(f.v, D);
    drawTarDragon(f.v, D);
    expect(f.calls.fill ?? 0).toBeGreaterThan(8);
    const before = f.calls.fill ?? 0;
    drawDragonMark(f.v, D);
    drawDragonBalls(f.v, D);
    expect(f.calls.fill ?? 0).toBe(before);
    const fig = { ...UNDER };
    until(D, 'volley', 6, () => fig);
    drawDragonMark(f.v, D);
    drawDragonBalls(f.v, D);
    expect(f.calls.fill ?? 0).toBeGreaterThanOrEqual(before + 6);
    const mid = f.calls.fill ?? 0;
    until(D, 'aim', 6, () => fig);
    drawDragonMark(f.v, D);
    expect(f.calls.fill ?? 0).toBe(mid + 1);
    until(D, 'landed', 3, () => fig);
    drawTarDragon(f.v, D);
    expect(f.calls.fill ?? 0).toBeGreaterThan(mid + 8);
  });

  it('hovers between blows: at least as long as it says, and no longer than its most', () => {
    const D = dragon();
    const fig = { ...UNDER };
    run(D, SHRIEK_T + 0.05, () => fig);
    expect(D.state).toBe('hover');
    run(D, HOVER_T - 0.1, () => fig);
    expect(D.state).toBe('hover');
    until(D, 'spit', HOVER_MAX - HOVER_T + 0.2, () => fig);
    expect(D.state).toBe('spit');
  });

  it('hangs off the figure on its far side from the viewer, so it is seen beyond the figure, not over it', () => {
    const D = dragon();
    const fig = { ...UNDER };
    until(D, 'spit', 5, () => fig);
    expect(D.x + D.y).toBeLessThan(fig.x + fig.y - 60);
  });
});

/** How far (x, y) is from the swoop's lane. */
function laneD(D: TarDragon, p: { x: number; y: number }): number {
  const vx = D.to.x - D.from.x;
  const vy = D.to.y - D.from.y;
  const l2 = vx * vx + vy * vy || 1;
  const k = Math.max(0, Math.min(1, ((p.x - D.from.x) * vx + (p.y - D.from.y) * vy) / l2));
  return Math.hypot(p.x - D.from.x - vx * k, p.y - D.from.y - vy * k);
}
