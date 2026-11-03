import { describe, expect, it } from 'vitest';
import {
  BOO_R,
  CALM_T,
  CHAIN_R,
  FAINT_T,
  GoatHerds,
  RISE_T,
  RUN_R,
  TIP_T,
} from '../../src/entities/goats';
import { HERDS15, onIsle15 } from '../../src/world/goatisle';

/** A seeded random, so a run is the same every time. */
function seeded(n = 7): () => number {
  let s = n;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
const run = (h: GoatHerds, secs: number, fig: Parameters<GoatHerds['update']>[1] = null) => {
  let fell = 0;
  for (let t = 0; t < secs; t += 1 / 60) fell += h.update(1 / 60, fig);
  return fell;
};
/** A row of n goats, gap apart, standing still. */
const field = (n: number, gap: number): GoatHerds => {
  const h = new GoatHerds(
    Array.from({ length: n }, (_, i) => ({ x: i * gap, y: 0, r: 0.001, n: 1 })),
    seeded(),
    () => true,
  );
  for (const g of h.goats) g.t = 999;
  return h;
};

describe('the fainting goats', () => {
  it('start on their meadows on dry land, and wander about without ever leaving it', () => {
    const h = new GoatHerds(HERDS15, seeded(), onIsle15);
    expect(h.goats).toHaveLength(HERDS15.reduce((a, m) => a + m.n, 0));
    for (let i = 0; i < 60 * 120; i++) {
      h.update(1 / 60, null);
      for (const g of h.goats) expect(onIsle15(g.x, g.y)).toBe(true);
    }
    for (const g of h.goats)
      expect(Math.hypot(g.x - g.hx, g.y - g.hy)).toBeLessThanOrEqual(g.hr + 1);
  });

  it('go over at a "Boo!", lie stiff, and get back up as if nothing happened', () => {
    const h = field(1, 0);
    const g = h.goats[0];
    expect(h.startle(g?.x ?? 0, g?.y ?? 0, BOO_R)).toBe(1);
    expect(g?.state).toBe('startled');
    expect(run(h, 0.5)).toBe(1);
    expect(g?.k).toBe(1);
    run(h, FAINT_T - 0.4);
    expect(g?.state).toBe('faint');
    run(h, RISE_T + TIP_T + 0.2);
    expect(g?.state).toBe('graze');
    expect(g?.k).toBe(0);
    // Just up, it is calm a moment: no going straight back over.
    expect(h.startle(g?.x ?? 0, g?.y ?? 0, BOO_R)).toBe(0);
    run(h, CALM_T);
    expect(h.startle(g?.x ?? 0, g?.y ?? 0, BOO_R)).toBe(1);
  });

  it('go down like dominoes: one going over startles the one standing right by it, and so on down the row', () => {
    const h = field(6, CHAIN_R - 3);
    h.startle(0, 0, 1);
    run(h, 2.5);
    expect(h.goats.every((g) => g.state === 'faint')).toBe(true);
    // Too far apart, it stops at the first.
    const apart = field(3, CHAIN_R + 6);
    apart.startle(0, 0, 1);
    run(apart, 2.5);
    expect(apart.down).toBe(1);
  });

  it('faint when the figure runs at one or bumps it, not when it strolls past or walks away', () => {
    const at = field(1, 0);
    run(at, 0.5, { x: -RUN_R + 4, y: 0, vx: 85, vy: 0 });
    expect(at.down).toBe(1);
    const away = field(1, 0);
    run(away, 0.5, { x: -RUN_R + 4, y: 0, vx: -85, vy: 0 });
    expect(away.down).toBe(0);
    const slow = field(1, 0);
    run(slow, 0.5, { x: -RUN_R + 4, y: 0, vx: 20, vy: 0 });
    expect(slow.down).toBe(0);
    const bump = field(1, 0);
    run(bump, 0.5, { x: 4, y: 0, vx: 0, vy: 0 });
    expect(bump.down).toBe(1);
  });

  it('say whether one is near enough to say boo to, and a fainted one is not', () => {
    const h = field(1, 0);
    expect(h.near(BOO_R - 2, 0, BOO_R)).toBe(true);
    expect(h.near(BOO_R + 2, 0, BOO_R)).toBe(false);
    h.startle(0, 0, 1);
    expect(h.near(0, 0, BOO_R)).toBe(false);
  });
});
