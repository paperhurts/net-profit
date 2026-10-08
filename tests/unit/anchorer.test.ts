import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { spearAt } from '../../src/data/spear';
import {
  AIM,
  ANCHOR_HIT,
  ANCHORER_HP,
  Anchorer,
  FLIGHT,
  LURK,
  MELT,
  OUT_R,
  onSand4,
  RISE,
  SHORE_R,
  SWEEP_R,
  SWEEP_UP,
  WHIRL,
  WHIRL_ANGRY,
} from '../../src/entities/anchorer';
import type { World } from '../../src/entities/entity';
import { Spears } from '../../src/entities/spears';
import { WALK_SPEED, walkable, walkStep } from '../../src/entities/walker';
import { CAST_EVERY, CAST_RANGE } from '../../src/entities/warlock';
import { ISLE4, MONSTER, SAND4 } from '../../src/world/isle4';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const figureAt = (x: number, y: number) => ({ x, y, vx: 0, vy: 0 });
/** On the sand on the side toward home, a little in from the shore. */
const SAND = { x: ISLE4.x - 120, y: ISLE4.y - 90 };
/** Out in the tar, off the shore toward home. */
const TAR = { x: ISLE4.x - 260, y: ISLE4.y - 200 };

const awake = (at = SAND) => {
  const a = new Anchorer();
  const w: World = baseWorld({ figure: figureAt(at.x, at.y) });
  for (let i = 0; i < (RISE + 0.1) / DT; i++) a.update(DT, w);
  return { a, w };
};

describe('the Tar Anchorer', () => {
  it('lurks to its eyes where it was summoned, and wakes only when the figure stands on the sand', () => {
    const a = new Anchorer();
    expect([a.x, a.y]).toEqual([MONSTER.x, MONSTER.y]);
    expect(a.rise).toBe(LURK);
    expect(a.waiting).toBe(true);
    let woke = 0;
    a.onWake = () => woke++;
    const w: World = baseWorld({ figure: figureAt(TAR.x, TAR.y) });
    expect(onSand4(TAR.x, TAR.y)).toBe(false);
    for (let i = 0; i < 3 / DT; i++) a.update(DT, w);
    expect(a.state).toBe('lurk');
    expect(a.up).toBe(false);
    w.figure = figureAt(SAND.x, SAND.y);
    expect(onSand4(SAND.x, SAND.y)).toBe(true);
    a.update(DT, w);
    expect(woke).toBe(1);
    expect(a.up).toBe(true);
    for (let i = 0; i < RISE / DT + 2; i++) a.update(DT, w);
    expect(a.rise).toBe(1);
    expect(a.state).toBe('wade');
  });

  it('keeps to the tar, hugging the shore by the figure, and never comes onto the sand', () => {
    const { a, w } = awake();
    const f = w.figure as NonNullable<World['figure']>;
    // The figure walks round the island; the monster follows round the shore.
    for (let i = 0; i < 40 / DT; i++) {
      const t = i * DT * 0.12;
      f.x = ISLE4.x + Math.cos(t + 3.9) * 140;
      f.y = ISLE4.y + Math.sin(t + 3.9) * 140;
      a.update(DT, w);
      const r = Math.hypot(a.x - ISLE4.x, a.y - ISLE4.y);
      expect(r).toBeGreaterThanOrEqual(SHORE_R - 0.01);
      expect(r).toBeLessThanOrEqual(OUT_R + 0.01);
    }
    // Standing still, it comes to the shore nearest.
    for (let i = 0; i < 20 / DT; i++) a.update(DT, w);
    const fa = Math.atan2(f.y - ISLE4.y, f.x - ISLE4.x);
    const ma = Math.atan2(a.y - ISLE4.y, a.x - ISLE4.x);
    expect(Math.abs(fa - ma)).toBeLessThan(0.15);
  });

  it('shows where the anchor will land before it throws, and lands it on one who keeps going', () => {
    const { a, w } = awake();
    const f = w.figure as NonNullable<World['figure']>;
    let hits = 0;
    a.onHit = (by) => {
      expect(by).toBe('anchor');
      hits++;
    };
    // Walking steadily round the island, not minding the ring.
    let aimSeenAt = -1;
    let thrownAt = -1;
    for (let t = 0; t < 12 && hits === 0; t += DT) {
      f.vx = 0;
      f.vy = 40;
      f.y += f.vy * DT;
      if (f.y > ISLE4.y + 60) f.y = ISLE4.y - 120;
      a.update(DT, w);
      if (a.aim && aimSeenAt < 0) aimSeenAt = t;
      if (a.state === 'throw' && thrownAt < 0) thrownAt = t;
    }
    expect(hits).toBe(1);
    expect(thrownAt - aimSeenAt).toBeCloseTo(AIM, 1);
  });

  it('misses one who changes course a reaction time after the ring shows', () => {
    const r = rng(5);
    let hits = 0;
    for (let run = 0; run < 40; run++) {
      const { a, w } = awake();
      const f = w.figure as NonNullable<World['figure']>;
      a.onHit = (by) => {
        if (by === 'anchor') hits++;
      };
      let ringAt = -1;
      const dir = r() * Math.PI * 2;
      for (let t = 0; t < 5; t += DT) {
        let vx = Math.cos(dir) * WALK_SPEED * 0.6;
        let vy = Math.sin(dir) * WALK_SPEED * 0.6;
        if (a.aim && ringAt < 0) ringAt = t;
        if (ringAt >= 0 && t - ringAt >= 0.3 && a.aim) {
          // Out of the ring, the quickest way.
          const dx = f.x - a.aim.x;
          const dy = f.y - a.aim.y;
          const d = Math.hypot(dx, dy) || 1;
          vx = (dx / d) * WALK_SPEED;
          vy = (dy / d) * WALK_SPEED;
          if (d < 1) vx = WALK_SPEED;
        }
        const before = { x: f.x, y: f.y };
        walkStep(f, vx * DT, vy * DT, 0);
        f.vx = (f.x - before.x) / DT;
        f.vy = (f.y - before.y) / DT;
        a.update(DT, w);
        if (a.state === 'down') break;
      }
    }
    expect(hits).toBe(0);
  });

  it('swings round itself at one who comes close, after drawing back, and not at one further off', () => {
    const { a, w } = awake();
    const f = w.figure as NonNullable<World['figure']>;
    let sweeps = 0;
    let swings = 0;
    a.onHit = (by) => {
      if (by === 'sweep') sweeps++;
    };
    a.onSwing = () => swings++;
    // Right beside it.
    for (let i = 0; i < 0.5 / DT; i++) {
      f.x = a.x + (ISLE4.x - a.x) * 0.25;
      f.y = a.y + (ISLE4.y - a.y) * 0.25;
      a.update(DT, w);
    }
    expect(a.state).toBe('sweepUp');
    for (let i = 0; i < SWEEP_UP / DT + 2; i++) a.update(DT, w);
    expect(sweeps).toBe(1);
    expect(swings).toBe(1);
    // Stepping out of reach while it draws back is safe.
    const b = awake();
    let caught = 0;
    b.a.onHit = (by) => {
      if (by === 'sweep') caught++;
    };
    const g = b.w.figure as NonNullable<World['figure']>;
    g.x = b.a.x + (ISLE4.x - b.a.x) * 0.25;
    g.y = b.a.y + (ISLE4.y - b.a.y) * 0.25;
    for (let i = 0; i < 0.3 / DT; i++) b.a.update(DT, b.w);
    expect(b.a.state).toBe('sweepUp');
    const away = Math.atan2(g.y - b.a.y, g.x - b.a.x);
    g.x = b.a.x + Math.cos(away) * (SWEEP_R + 20);
    g.y = b.a.y + Math.sin(away) * (SWEEP_R + 20);
    for (let i = 0; i < SWEEP_UP / DT + 2; i++) b.a.update(DT, b.w);
    expect(caught).toBe(0);
  });

  it('takes its hits, melts when beaten, and stays gone', () => {
    const { a, w } = awake();
    let beaten = 0;
    a.onBeaten = () => beaten++;
    a.hit(ANCHORER_HP - 1);
    expect(a.hp).toBe(1);
    a.hit(5);
    expect(a.state).toBe('melt');
    expect(a.up).toBe(false);
    a.hit(5);
    for (let i = 0; i < MELT / DT + 2; i++) a.update(DT, w);
    expect(beaten).toBe(1);
    expect(a.state).toBe('gone');
    w.figure = null;
    a.update(DT, w);
    a.reset();
    expect(a.state).toBe('gone');
  });

  it('sinks back to its eyes, healed, when the figure leaves', () => {
    const { a, w } = awake();
    a.hit(10);
    w.figure = null;
    a.update(DT, w);
    expect(a.state).toBe('lurk');
    expect(a.hp).toBe(ANCHORER_HP);
    expect([a.x, a.y]).toEqual([MONSTER.x, MONSTER.y]);
  });

  it('draws in every state without a negative size', () => {
    const { a, w } = awake();
    const f = w.figure as NonNullable<World['figure']>;
    const v = fakeView();
    v.v.onScreen = () => true;
    for (let i = 0; i < 14 / DT; i++) {
      f.x = SAND.x + Math.sin(i * DT) * 60;
      f.y = SAND.y + Math.cos(i * DT * 0.7) * 50;
      if (i === Math.round(7 / DT)) {
        f.x = a.x + (ISLE4.x - a.x) * 0.3;
        f.y = a.y + (ISLE4.y - a.y) * 0.3;
      }
      a.update(DT, w);
      v.v.T = i * DT;
      a.drawBody(v.v);
      a.draw(v.v, 'surface');
      a.draw(v.v, 'air');
    }
    expect(v.calls.fill ?? 0).toBeGreaterThan(100);
    const lurk = new Anchorer();
    const l = fakeView();
    l.v.onScreen = () => true;
    lurk.drawBody(l.v);
    // Its eyes show over the tar while it lurks.
    expect(l.calls.ellipse ?? 0).toBeGreaterThanOrEqual(4);
  });
});

/** How long a person takes to see the ring or the drawing back, and move; and how much that varies, each way. */
const REACT = 0.3;
const SPREAD = 0.25;

/**
 * A person on the sand who stands and throws, as a child does: keeps just inside the spear's reach
 * of it and out of its swing, keeps in from the shore, and otherwise stands still. It steps out of
 * the ring a reaction time after it shows, quicker or slower each time (or never minds the rings,
 * with none), backs off a
 * reaction time after it draws back to swing, and throws whenever it is in reach, a third of a
 * second late. With the warlock, a bolt every so often while it is in his reach. Wins out of 30, the
 * hearts a fight costs on average, and how long a win takes.
 */
function fights(
  level: number,
  warlock: boolean,
  react: number | null = REACT,
): { wins: number; hearts: number; secs: number } {
  const sp = spearAt(level);
  if (!sp) throw new Error('spear');
  const r = rng(level * 7 + (warlock ? 1 : 0));
  const keep = Math.max(SWEEP_R + 10, Math.min(sp.range - 8, 110));
  let wins = 0;
  let lost = 0;
  let time = 0;
  for (let run = 0; run < 30; run++) {
    const a = new Anchorer();
    const spears = new Spears();
    const fig = figureAt(SAND.x + r() * 20, SAND.y + r() * 20);
    const w: World = baseWorld({ figure: fig });
    let hearts = 3;
    let invuln = 0;
    let ready = 0;
    let cast = CAST_EVERY;
    let ringAt = -1;
    let upAt = -1;
    let dodge: { x: number; y: number } | null = null;
    // Each time, the person is a little quicker or slower than they are on average.
    let late = 0;
    a.onHit = () => {
      if (invuln > 0) return;
      hearts--;
      invuln = 1.2;
    };
    let t = 0;
    for (; t < 300 && hearts > 0 && a.state !== 'gone'; t += DT) {
      invuln -= DT;
      if (a.aim && ringAt < 0) {
        ringAt = t;
        late = react === null ? 0 : react + (r() - 0.5) * 2 * SPREAD;
      }
      if (!a.aim) {
        ringAt = -1;
        dodge = null;
      }
      if (a.state === 'sweepUp' && upAt < 0) upAt = t;
      if (a.state !== 'sweepUp') upAt = -1;
      const dx = fig.x - a.x;
      const dy = fig.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      let vx = 0;
      let vy = 0;
      // Into reach, or back out of the swing, and otherwise stand.
      if (d > keep + 12 || d < keep - 12) {
        const k = d > keep ? -1 : 1;
        vx = (dx / d) * k;
        vy = (dy / d) * k;
      }
      if (upAt >= 0 && t - upAt >= REACT) {
        vx = dx / d;
        vy = dy / d;
      }
      if (react !== null && ringAt >= 0 && t - ringAt >= late && a.aim) {
        // Out of the ring, across the line to it, the way that keeps it on the sand.
        if (!dodge) {
          const s1 = { x: -dy / d, y: dx / d };
          const inward = s1.x * (ISLE4.x - fig.x) + s1.y * (ISLE4.y - fig.y) >= 0 ? 1 : -1;
          dodge = { x: s1.x * inward, y: s1.y * inward };
        }
        if (Math.hypot(fig.x - a.aim.x, fig.y - a.aim.y) < ANCHOR_HIT + 10) {
          vx = dodge.x;
          vy = dodge.y;
        }
      }
      // Keep in from the shore, on the sand.
      const ex = fig.x - ISLE4.x;
      const ey = fig.y - ISLE4.y;
      const e = Math.hypot(ex, ey);
      if (e > SAND4 - 30) {
        vx -= (ex / e) * 1.2;
        vy -= (ey / e) * 1.2;
      }
      const n = Math.hypot(vx, vy);
      const before = { x: fig.x, y: fig.y };
      if (n > 0.01) walkStep(fig, (vx / n) * WALK_SPEED * DT, (vy / n) * WALK_SPEED * DT, 0);
      fig.vx = (fig.x - before.x) / DT;
      fig.vy = (fig.y - before.y) / DT;
      if (!walkable(fig.x, fig.y, 0)) throw new Error('off the ground');
      if (t >= ready && a.up && d <= sp.range) {
        ready = t + sp.reload + 1 / 3;
        spears.launch(fig.x, fig.y, 20, a, 70, () => a.hit(sp.power));
      }
      if (warlock) {
        cast -= DT;
        if (cast <= 0 && a.up && d < CAST_RANGE + 20) {
          cast = CAST_EVERY;
          a.hit(1);
        }
      }
      a.update(DT, w);
      spears.update(DT, w);
    }
    if (a.state === 'gone' || a.state === 'melt') {
      wins++;
      time += t;
    }
    lost += 3 - Math.max(0, hearts);
  }
  return { wins, hearts: lost / 30, secs: wins ? time / wins : 0 };
}

describe('fighting the Tar Anchorer', () => {
  it('is won by stepping out of the rings: a long fight with the barbed spear and the warlock', () => {
    const f = fights(3, true);
    expect(f.wins).toBeGreaterThanOrEqual(28);
    expect(f.hearts).toBeLessThan(0.5);
    expect(f.secs).toBeGreaterThan(25);
    expect(f.secs).toBeLessThan(60);
  });

  it('costs a slower one a heart or so and the odd fight, and beats one who never minds the rings', () => {
    const slow = fights(3, true, 0.55);
    expect(slow.wins).toBeGreaterThanOrEqual(18);
    expect(slow.hearts).toBeGreaterThan(0.5);
    expect(slow.hearts).toBeLessThan(2.2);
    expect(fights(3, true, null).wins).toBeLessThanOrEqual(3);
  });

  it('can be beaten with the long spear, or alone, by one who minds the rings', () => {
    expect(fights(2, true).wins).toBeGreaterThanOrEqual(24);
    expect(fights(3, false).wins).toBeGreaterThanOrEqual(24);
  });

  it('times its throw and its swing so the warning comes first', () => {
    expect(WHIRL).toBeGreaterThan(AIM);
    expect(WHIRL_ANGRY).toBeGreaterThan(AIM);
    expect(AIM + FLIGHT).toBeGreaterThan(REACT + ANCHOR_HIT / WALK_SPEED + 0.2);
    expect(SWEEP_UP).toBeGreaterThan(REACT + 0.25);
  });
});
