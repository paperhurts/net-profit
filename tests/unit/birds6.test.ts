import { describe, expect, it } from 'vitest';
import {
  Birds6,
  FLY_FOR,
  PARROT_PALMS,
  PIPER_GROUPS,
  PIPERS_EACH,
  SHY,
  SKEIN_EVERY,
  STARTLE,
  wetSand,
} from '../../src/entities/birds6';
import { ISLE6, onIsle6Ground, PALMS6, shoreR } from '../../src/world/isle6';
import { baseWorld } from './helpers/world';

const DT = 1 / 30;
const at = (x: number, y: number) => baseWorld({ figure: { x, y, vx: 0, vy: 0 } });
const away = baseWorld({ figure: null });

describe("island 6's birds", () => {
  it('lots of them: two parrots in every other palm, and the sandpipers in groups', () => {
    const b = new Birds6();
    expect(PARROT_PALMS.length).toBe(Math.ceil(PALMS6.length / 2));
    expect(b.parrots).toHaveLength(PARROT_PALMS.length * 2);
    expect(b.pipers).toHaveLength(PIPER_GROUPS.length * PIPERS_EACH);
    // All four kinds of parrot.
    expect(new Set(b.parrots.map((p) => p.kind)).size).toBe(4);
  });

  it('parrots go up as the figure walks under their tree, and settle once it has gone', () => {
    const b = new Birds6();
    let squawks = 0;
    b.onStartle = () => squawks++;
    const p = b.parrots[0];
    if (!p) throw new Error('no parrot');
    const [x, y] = PALMS6[p.palm] ?? [0, 0];
    b.update(DT, at(x + STARTLE + 30, y));
    expect(p.flying).toBe(false);
    b.update(DT, at(x + STARTLE - 10, y));
    expect(p.flying).toBe(true);
    expect(squawks).toBe(1);
    // Up and wheeling while it stays, and a little after.
    for (let t = 0; t < FLY_FOR + 1; t += DT) b.update(DT, at(x + STARTLE - 10, y));
    expect(p.flying).toBe(true);
    expect(p.up).toBe(1);
    for (let t = 0; t < 2; t += DT) b.update(DT, away);
    expect(p.flying).toBe(false);
    expect(p.up).toBe(0);
    // The others in the trees never stirred.
    expect(b.parrots.filter((q) => q.palm !== p.palm).every((q) => !q.flying)).toBe(true);
  });

  it('sandpipers keep to the wet sand, run from the figure, and drift back home', () => {
    const b = new Birds6();
    for (const s of b.pipers) {
      const w = wetSand(s.a);
      expect(onIsle6Ground(w.x, w.y)).toBe(true);
      const d = Math.hypot(w.x - ISLE6.x, w.y - ISLE6.y);
      expect(shoreR(s.a) - d).toBeLessThan(40);
    }
    const s = b.pipers[0];
    if (!s) throw new Error('no piper');
    const home = s.a;
    const w = wetSand(s.a);
    // Right on it, it flutters up; then it runs.
    b.update(DT, at(w.x + 5, w.y + 5));
    expect(s.hop).toBeGreaterThan(0.9);
    for (let t = 0; t < 1; t += DT) b.update(DT, at(w.x + 5, w.y + 5));
    const fled = wetSand(s.a);
    expect(Math.hypot(fled.x - w.x, fled.y - w.y)).toBeGreaterThan(SHY / 2);
    for (let t = 0; t < 30; t += DT) b.update(DT, away);
    expect(s.a).toBeCloseTo(home, 2);
  });

  it('a skein crosses overhead every so often', () => {
    const b = new Birds6();
    let seen = 0;
    let was = false;
    for (let t = 0; t < SKEIN_EVERY * 4; t += DT) {
      b.update(DT, away);
      const on = !!b.skeinHead();
      if (on && !was) seen++;
      was = on;
    }
    expect(seen).toBeGreaterThanOrEqual(2);
  });
});
