import { describe, expect, it } from 'vitest';
import {
  ARC,
  assignSlots,
  FORM_SPEED,
  FRONT_DEPTH,
  FRONT_WIDE,
  formation,
  formUp,
  RING_STEP,
  RING0,
  SLOT_GAP,
  type Slot,
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

describe('the whole army, outside a fight', () => {
  it('has a place each, ring by ring behind the figure, never in front of it, none closer than the gap', () => {
    for (const n of [1, 3, 8, 12]) {
      const slots = formation(n);
      expect(slots).toHaveLength(n);
      // The near ring fills before the next.
      for (let i = 1; i < n; i++)
        expect((slots[i] as Slot).r).toBeGreaterThanOrEqual((slots[i - 1] as Slot).r);
      expect((slots[0] as Slot).r).toBe(RING0);
      for (const s of slots) {
        // Never where the old rule would call it in front of the figure, hiding it.
        const depth = s.dx + s.dy;
        const across = s.dx - s.dy;
        expect(depth > 0 && depth < FRONT_DEPTH && Math.abs(across) < FRONT_WIDE).toBe(false);
        // Within the arc either side of straight behind (up the screen).
        const a = Math.atan2(s.dy, s.dx) + (3 * Math.PI) / 4;
        expect(Math.abs(Math.atan2(Math.sin(a), Math.cos(a)))).toBeLessThanOrEqual(ARC + 1e-9);
      }
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const p = slots[i] as Slot;
          const q = slots[j] as Slot;
          expect(Math.hypot(p.dx - q.dx, p.dy - q.dy)).toBeGreaterThan(
            Math.min(SLOT_GAP, RING_STEP) - 1,
          );
        }
    }
  });

  it('passes over a place the figure could not walk to, such as the sea', () => {
    // The sea to the left of the screen: nothing with x below y.
    const slots = formation(6, (dx, dy) => dx >= dy);
    expect(slots).toHaveLength(6);
    for (const s of slots) expect(s.dx).toBeGreaterThanOrEqual(s.dy);
  });

  it('gives each the place on its own side, so none walks across another or in front of the figure', () => {
    const figure = { x: 0, y: 0 };
    // Two in the near ring: one off to the screen's left, one off to its right.
    const left = { x: -30, y: 10 };
    const right = { x: 10, y: -30 };
    const slots = formation(2);
    const [a, b] = assignSlots([right, left], slots, figure);
    expect(a && b).toBeTruthy();
    // Screen left is x below y.
    expect((b as Slot).dx - (b as Slot).dy).toBeLessThan(0);
    expect((a as Slot).dx - (a as Slot).dy).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });

  it('forms up: eight stacked behind the figure walk out to their places and stand apart', () => {
    const figure = { x: 0, y: 0 };
    const army = Array.from({ length: 8 }, (_, i) => ({ x: -20 - i, y: -18 - i }));
    const slots = assignSlots(army, formation(army.length), figure);
    for (let i = 0; i < 6 / DT; i++) formUp(army, slots, figure, DT, move);
    army.forEach((b, i) => {
      const s = slots[i] as Slot;
      expect(Math.hypot(b.x - s.dx, b.y - s.dy)).toBeLessThan(1.5);
    });
    for (let i = 0; i < army.length; i++)
      for (let j = i + 1; j < army.length; j++) {
        const p = army[i] as { x: number; y: number };
        const q = army[j] as { x: number; y: number };
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(Math.min(SLOT_GAP, RING_STEP) - 3);
      }
    expect(figure).toEqual({ x: 0, y: 0 });
  });

  it('walks in no faster than FORM_SPEED, leaves one far off to follow the steps, and never walks through a wall', () => {
    const figure = { x: 0, y: 0 };
    const near = { x: -10, y: -10 };
    const far = { x: -300, y: -300 };
    const slots = formation(2);
    formUp([near, far], slots, figure, DT, move);
    expect(Math.hypot(near.x + 10, near.y + 10)).toBeLessThanOrEqual(FORM_SPEED * DT + 1e-9);
    expect(far).toEqual({ x: -300, y: -300 });
    const walled = { x: -10, y: -10 };
    for (let i = 0; i < 60; i++) formUp([walled], slots, figure, DT, () => {});
    expect(walled).toEqual({ x: -10, y: -10 });
  });
});
