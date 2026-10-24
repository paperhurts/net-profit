import { describe, expect, it } from 'vitest';
import {
  COLOURS,
  decode,
  encode,
  GRID,
  INK,
  inkUsed,
  Pad,
  rig,
  type Stroke,
  thin,
  toGrid,
} from '../../src/data/doodle';

describe('the drawing pad', () => {
  it('snaps a finger to the grid, inside it', () => {
    expect(toGrid(0, 0)).toEqual([0, 0]);
    expect(toGrid(1, 1)).toEqual([GRID - 1, GRID - 1]);
    expect(toGrid(-1, 2)).toEqual([0, GRID - 1]);
  });

  it('thins a line to the points that hold its shape', () => {
    const straight = Array.from({ length: 30 }, (_, i) => [i, i] as const);
    expect(thin(straight)).toEqual([
      [0, 0],
      [29, 29],
    ]);
    const corner = [
      ...Array.from({ length: 10 }, (_, i) => [i, 0] as const),
      ...Array.from({ length: 10 }, (_, i) => [9, i + 1] as const),
    ];
    expect(thin(corner)).toEqual([
      [0, 0],
      [9, 0],
      [9, 10],
    ]);
  });

  it('draws, undoes and clears, and the ink runs out', () => {
    const pad = new Pad();
    expect(pad.empty).toBe(true);
    pad.colour = 2;
    pad.begin(0.1, 0.1);
    for (let i = 1; i <= 20; i++) pad.move(0.1 + i * 0.02, 0.1);
    pad.end();
    expect(pad.strokes).toEqual([
      {
        c: 2,
        p: [
          [6, 6],
          [32, 6],
        ],
      },
    ]);
    pad.undo();
    expect(pad.empty).toBe(true);
    // Zigzags until the pot is dry: never more than INK points, and then the pen will not go down.
    for (let k = 0; k < 40 && pad.begin(0, 0); k++) {
      for (let i = 0; i < 40; i++) pad.move(i / 40, i % 2 ? 0.2 : 0.8);
      pad.end();
    }
    expect(inkUsed(pad.strokes)).toBe(INK);
    expect(pad.inkLeft).toBe(0);
    expect(pad.begin(0.5, 0.5)).toBe(false);
    pad.clear();
    expect(pad.inkLeft).toBe(1);
  });

  it('keeps a drawing small, and reads it back as it was', () => {
    const full: Stroke[] = [];
    for (let s = 0; s < 20; s++)
      full.push({
        c: s % COLOURS.length,
        p: Array.from(
          { length: INK / 20 },
          (_, i) => [(s * 3 + i) % GRID, (i * 7) % GRID] as const,
        ),
      });
    const text = encode(full);
    expect(text.length).toBeLessThanOrEqual(INK * 2 + 20 * 2);
    expect(decode(text)).toEqual(full);
  });

  it('reads nothing odd back: wrong letters, no colour, too much ink', () => {
    expect(decode(42)).toEqual([]);
    expect(decode('')).toEqual([]);
    expect(decode('ZABCD')).toEqual([]); // no such colour
    // A bad point ends its stroke (here the first, before any point), and the next is read.
    expect(decode('AB$D.BCD')).toEqual([{ c: 1, p: [[2, 3]] }]);
    // A stroke past the pot is cut to it; text far longer than any drawing is not read at all.
    expect(inkUsed(decode(`A${'BC'.repeat(INK + 50)}`))).toBe(INK);
    expect(decode(`A${'BC'.repeat(INK * 2)}`)).toEqual([]);
    const many = Array.from({ length: 30 }, () => `A${'BC'.repeat(10)}`).join('.');
    expect(inkUsed(decode(many))).toBe(INK);
  });

  it('finds the legs: separate strokes low down, swinging in turn', () => {
    const body: Stroke = {
      c: 0,
      p: [
        [10, 10],
        [40, 10],
        [40, 30],
        [10, 30],
        [10, 10],
      ],
    };
    const leg = (x: number): Stroke => ({
      c: 0,
      p: [
        [x, 30],
        [x, 42],
      ],
    });
    const r = rig([body, leg(30), leg(15), leg(22)]);
    expect([r.x0, r.y0, r.x1, r.y1]).toEqual([10, 10, 40, 42]);
    expect([...r.legs.keys()].sort()).toEqual([1, 2, 3]);
    // Left to right they take turns.
    expect(r.legs.get(2)?.sign).toBe(1);
    expect(r.legs.get(3)?.sign).toBe(-1);
    expect(r.legs.get(1)?.sign).toBe(1);
    expect(r.legs.get(1)?.top).toEqual([30, 30]);
    // One stroke alone has no legs: it slides along like a slug.
    expect(rig([body]).legs.size).toBe(0);
  });
});
