import { describe, expect, it } from 'vitest';
import {
  around,
  CRATE,
  DOCK,
  IR,
  IX,
  IY,
  PIER,
  PIER_BUMPS,
  PX0,
  pushOut,
  WS,
} from '../../src/world/island';

describe('the island', () => {
  it('sits at the centre of the world with the pier off its east beach', () => {
    expect([IX, IY]).toEqual([WS / 2, WS / 2]);
    expect(PX0).toBe(IX + IR - 30);
    expect(DOCK.x).toBeGreaterThan(PX0 + 155);
    expect(CRATE.x).toBeLessThan(PX0 + 155);
    expect(PIER).toHaveLength(4);
    for (const [bx, by] of PIER_BUMPS) {
      expect(by).toBe(IY);
      expect(bx).toBeGreaterThan(PX0);
      expect(bx).toBeLessThan(PX0 + 155);
    }
  });
});

describe('around', () => {
  const R = IR + 90;

  it('leaves a target alone when the island is far away', () => {
    expect(around(IX + 2000, IY, IX + 2500, IY + 300, R)).toEqual([IX + 2500, IY + 300]);
  });

  it('leaves a target alone when it is behind, short of, or beside the island', () => {
    // Heading away from the island.
    expect(around(IX + 400, IY, IX + 900, IY, R)).toEqual([IX + 900, IY]);
    // Stopping before the island's edge.
    expect(around(IX + 500, IY, IX + 350, IY, R)).toEqual([IX + 350, IY]);
    // Passing well clear of it.
    expect(around(IX + 400, IY - 400, IX - 400, IY - 400, R)).toEqual([IX - 400, IY - 400]);
  });

  it('detours a line that would cross the island, to the nearer side, off the land', () => {
    const [wx, wy] = around(IX + 450, IY + 30, IX - 450, IY, R);
    expect([wx, wy]).not.toEqual([IX - 450, IY]);
    // Sidestep is 200 units, set back 40, along the line to the centre.
    expect(Math.hypot(wx - (IX + 450), wy - (IY + 30))).toBeCloseTo(Math.hypot(200, 40));
    // The waypoint keeps clear of the beach.
    expect(Math.hypot(wx - IX, wy - IY)).toBeGreaterThan(IR);
  });

  it('mirrors the side it picks when the approach is mirrored', () => {
    const [, y1] = around(IX + 450, IY + 30, IX - 450, IY, R);
    const [, y2] = around(IX + 450, IY - 30, IX - 450, IY, R);
    expect(y1 - IY).toBeCloseTo(-(y2 - IY));
  });

  it('matches the prototype for one recorded case', () => {
    // Pirate at (2850, 2430) chasing a boat at (1950, 2400).
    const [wx, wy] = around(2850, 2430, 1950, 2400, R);
    const cx = IX - 2850;
    const cy = IY - 2430;
    const dc = Math.hypot(cx, cy);
    expect(wx).toBeCloseTo(2850 + (cy / dc) * 200 - (cx / dc) * 40);
    expect(wy).toBeCloseTo(2430 - (cx / dc) * 200 - (cy / dc) * 40);
  });
});

describe('pushOut', () => {
  it('moves a body inside the circle to its rim along the same bearing and slows it', () => {
    const s = { x: IX + 30, y: IY + 40, v: 100 };
    pushOut(s, IX, IY, IR);
    expect(Math.hypot(s.x - IX, s.y - IY)).toBeCloseTo(IR);
    expect((s.x - IX) / (s.y - IY)).toBeCloseTo(30 / 40);
    expect(s.v).toBeCloseTo(94);
  });

  it('leaves a body outside the circle, or exactly at its centre, untouched', () => {
    const out = { x: IX + 500, y: IY, v: 100 };
    pushOut(out, IX, IY, IR);
    expect(out).toEqual({ x: IX + 500, y: IY, v: 100 });
    const centre = { x: IX, y: IY, v: 100 };
    pushOut(centre, IX, IY, IR);
    expect(centre).toEqual({ x: IX, y: IY, v: 100 });
  });
});
