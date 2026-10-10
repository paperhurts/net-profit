import { describe, expect, it } from 'vitest';
import {
  FRONT_DEPTH,
  FRONT_WIDE,
  SPREAD_FIGURE,
  SPREAD_GAP,
  SPREAD_NEAR,
  SPREAD_SPEED,
  spreadOut,
} from '../../src/entities/spread';

const DT = 1 / 60;
const move = (b: { x: number; y: number }, dx: number, dy: number) => {
  b.x += dx;
  b.y += dy;
};

describe('companions keep a little apart', () => {
  it('turns one stack behind the figure into a bunch round it, the figure never moving', () => {
    const figure = { x: 0, y: 0 };
    // Seven in a line a few steps behind, as they used to stop.
    const pals = [17, 23, 27, 28, 32, 34, 40].map((d) => ({ x: d, y: -d / 3 }));
    for (let i = 0; i < 6 / DT; i++) {
      // Each follows the figure back in from further than its heel, as the game's companions do.
      for (const p of pals) {
        const d = Math.hypot(p.x, p.y);
        if (d > 40) move(p, (-p.x / d) * 100 * DT, (-p.y / d) * 100 * DT);
      }
      spreadOut(pals, figure, DT, move);
    }
    for (let i = 0; i < pals.length; i++) {
      const a = pals[i] as { x: number; y: number };
      expect(Math.hypot(a.x, a.y)).toBeGreaterThanOrEqual(SPREAD_FIGURE - 0.5);
      for (let j = i + 1; j < pals.length; j++) {
        const b = pals[j] as { x: number; y: number };
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(SPREAD_GAP - 1.5);
      }
    }
    expect(figure).toEqual({ x: 0, y: 0 });
  });

  it('keeps the figure in view: none ends up standing in front of it', () => {
    const figure = { x: 0, y: 0 };
    // Two just in front, one a touch to the left on the screen, one dead ahead.
    const pals = [
      { x: 14, y: 12 },
      { x: 18, y: 18 },
    ];
    for (let i = 0; i < 3 / DT; i++) spreadOut(pals, figure, DT, move);
    for (const p of pals) {
      const depth = p.x + p.y;
      const across = p.x - p.y;
      expect(depth <= 0 || depth >= FRONT_DEPTH || Math.abs(across) >= FRONT_WIDE - 1).toBe(true);
    }
  });

  it('parts two on the very same spot, and drifts rather than jumps', () => {
    const a = { x: 50, y: 50 };
    const b = { x: 50, y: 50 };
    spreadOut([a, b], null, DT, move);
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThanOrEqual(SPREAD_SPEED * DT * 2 + 1e-9);
  });

  it('leaves one still walking up from far off to follow the steps', () => {
    const far = { x: SPREAD_NEAR + 30, y: 0 };
    const other = { x: SPREAD_NEAR + 32, y: 0 };
    spreadOut([far, other], { x: 0, y: 0 }, DT, move);
    expect(far).toEqual({ x: SPREAD_NEAR + 30, y: 0 });
  });

  it('leaves alone those already apart, and moves them only as the game allows', () => {
    const a = { x: 0, y: 0 };
    const b = { x: SPREAD_GAP + 1, y: 0 };
    spreadOut([a, b], null, DT, move);
    expect(a).toEqual({ x: 0, y: 0 });
    // A wall: nothing moves, and nothing breaks.
    const c = { x: 5, y: 5 };
    const d = { x: 6, y: 5 };
    spreadOut([c, d], { x: 5, y: 6 }, DT, () => {});
    expect(c).toEqual({ x: 5, y: 5 });
  });
});
