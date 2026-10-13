import { describe, expect, it } from 'vitest';
import {
  GATOR_BITE,
  GATOR_GAPE,
  GATOR_HP,
  GATOR_LEASH,
  GATOR_POOLS,
  GATOR_REACH,
  GATOR_RISE,
  GATOR_SPEED,
  GATOR_WAKE,
  type Gator,
  Gators,
} from '../../src/entities/gators';
import { WALK_SPEED, walkable } from '../../src/entities/walker';
import { ISLE10, inWater10, POOLS10, regionAt } from '../../src/world/isle10';
import { baseWorld } from './helpers/world';

const run = (g: Gators, s: number, at: () => { x: number; y: number } | null) => {
  for (let t = 0; t < s; t += 1 / 60) {
    const f = at();
    g.update(1 / 60, baseWorld({ figure: f ? { ...f, vx: 0, vy: 0 } : null }));
  }
};

/** Run until the gator opens its jaws, at most s seconds. */
const untilGape = (g: Gators, q: Gator, s: number, at: () => { x: number; y: number }) => {
  for (let t = 0; t < s && q.state !== 'gape'; t += 1 / 60)
    g.update(1 / 60, baseWorld({ figure: { ...at(), vx: 0, vy: 0 } }));
};

/** A point on the mud off a gator's pool, this far beyond the edge, on the side away from the island's middle. */
function bank(g: Gator, out: number): { x: number; y: number } {
  const p = g.pool;
  const a = Math.atan2(p.y - ISLE10.y, p.x - ISLE10.x);
  for (let k = 0; k < 64; k++) {
    const b = a + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.2;
    const x = p.x + Math.cos(b) * (p.r + out);
    const y = p.y + Math.sin(b) * (p.r + out);
    if (walkable(x, y, 99)) return { x, y };
  }
  throw new Error('no bank');
}

describe("island 10's gators", () => {
  it('lie in the swamp, one in each of its four bigger pools', () => {
    expect(GATOR_POOLS.length).toBe(4);
    expect(POOLS10.length).toBeGreaterThan(GATOR_POOLS.length);
    const g = new Gators();
    for (const q of g.list) {
      expect(regionAt(q.pool.x, q.pool.y)).toBe('swamp');
      expect(inWater10(q.x, q.y)).toBe(true);
      expect(q.state).toBe('lurk');
      expect(q.hp).toBe(GATOR_HP);
    }
  });

  it('stay low in the water and drift until the figure comes near the edge, then surge out at it', () => {
    const g = new Gators();
    const q = g.list[0] as Gator;
    let rose = 0;
    g.onRise = () => rose++;
    const far = bank(q, GATOR_WAKE + 30);
    const x0 = q.x;
    run(g, 2, () => far);
    expect(q.state).toBe('lurk');
    expect(q.x).not.toBe(x0);
    const near = bank(q, GATOR_WAKE - 20);
    run(g, 0.05, () => near);
    expect(q.state).toBe('rise');
    expect(rose).toBe(1);
    run(g, GATOR_RISE + 0.1, () => near);
    expect(['chase', 'gape']).toContain(q.state);
    expect(inWater10(q.x, q.y, 4)).toBe(false);
  });

  it('opens its jaws wide first, then snaps: a heart for a figure that stays, nothing for one that steps away', () => {
    const g = new Gators();
    const q = g.list[1] as Gator;
    let bites = 0;
    g.onBite = (n) => (bites += n);
    const spot = bank(q, 20);
    untilGape(g, q, 4, () => spot);
    expect(q.state).toBe('gape');
    run(g, GATOR_GAPE + 0.05, () => spot);
    expect(bites).toBe(GATOR_BITE);
    // Again, but this time the figure steps back out of reach while the jaws are open.
    const h = new Gators();
    const r = h.list[1] as Gator;
    let missed = 0;
    h.onBite = () => missed++;
    untilGape(h, r, 4, () => spot);
    expect(r.state).toBe('gape');
    const away = {
      x: r.x + Math.cos(r.h) * (GATOR_REACH + 30),
      y: r.y + Math.sin(r.h) * (GATOR_REACH + 30),
    };
    run(h, GATOR_GAPE + 0.05, () => away);
    expect(missed).toBe(0);
  });

  it('is slower than the figure, and gives up and slides back into its pool when the figure gets far enough away', () => {
    const g = new Gators();
    expect(GATOR_SPEED).toBeLessThan(WALK_SPEED * 0.6);
    const q = g.list[2] as Gator;
    const spot = bank(q, 20);
    run(g, 1, () => spot);
    expect(Gators.up(q)).toBe(true);
    run(g, 6, () => ({ x: q.pool.x + GATOR_LEASH + 200, y: q.pool.y }));
    expect(q.state).toBe('lurk');
    expect(inWater10(q.x, q.y)).toBe(true);
    expect(g.roused).toBe(false);
  });

  it('goes back to its pool when the figure leaves the island', () => {
    const g = new Gators();
    const q = g.list[3] as Gator;
    const spot = bank(q, 20);
    run(g, 1, () => spot);
    expect(Gators.up(q)).toBe(true);
    run(g, 6, () => null);
    expect(q.state).toBe('lurk');
  });

  it('takes ten hits to beat, a spear rousing it in its pool, and is gone after rolling over; all back on a visit', () => {
    const g = new Gators();
    const q = g.list[0] as Gator;
    let beaten = 0;
    g.onBeaten = () => beaten++;
    const from = bank(q, 120);
    expect(g.nearest(from.x, from.y, 200)).toBe(null);
    expect(g.nearest(from.x, from.y, 200, true)).toBe(q);
    expect(g.hit(q, 1, from.x, from.y)).toBe(true);
    expect(q.state).toBe('rise');
    for (let i = 1; i < GATOR_HP - 1; i++) g.hit(q, 1);
    expect(q.hp).toBe(1);
    expect(beaten).toBe(0);
    g.hit(q, 2);
    expect(q.state).toBe('fall');
    expect(beaten).toBe(1);
    expect(g.hit(q, 1)).toBe(false);
    run(g, 2, () => null);
    expect(q.state).toBe('gone');
    g.reset();
    expect(q.state).toBe('lurk');
    expect(q.hp).toBe(GATOR_HP);
    expect(inWater10(q.x, q.y)).toBe(true);
  });

  it('lies still with tar on its snout, and jaws it was opening come to nothing', () => {
    const g = new Gators();
    const q = g.list[1] as Gator;
    let bites = 0;
    g.onBite = () => bites++;
    const spot = bank(q, 20);
    untilGape(g, q, 4, () => spot);
    expect(q.state).toBe('gape');
    g.stun(q, 2);
    expect(q.state).toBe('chase');
    run(g, 1.5, () => spot);
    expect(bites).toBe(0);
  });
});
