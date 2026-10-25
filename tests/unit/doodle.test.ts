import { describe, expect, it } from 'vitest';
import {
  COLOURS,
  decode,
  ERASER,
  encode,
  erase,
  GRID,
  INK,
  inkUsed,
  Pad,
  rig,
  SHAPES,
  type Stroke,
  shapePoints,
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

describe('shapes on the pad', () => {
  it('fit the box dragged out, go back to where they start, and cost little ink', () => {
    for (const sh of SHAPES) {
      const p = shapePoints(sh, [10, 12], [40, 50]);
      for (const [x, y] of p) {
        expect(x).toBeGreaterThanOrEqual(10);
        expect(x).toBeLessThanOrEqual(40);
        expect(y).toBeGreaterThanOrEqual(12);
        expect(y).toBeLessThanOrEqual(50);
      }
      expect(p.length).toBeLessThanOrEqual(17);
      if (sh === 'line')
        expect(p).toEqual([
          [10, 12],
          [40, 50],
        ]);
      else expect(p[p.length - 1]).toEqual(p[0]);
    }
    // A triangle points where the drag began: up when dragged down, down when dragged up.
    const up = shapePoints('triangle', [10, 12], [40, 50]);
    const down = shapePoints('triangle', [10, 50], [40, 12]);
    expect(up[0]).toEqual([25, 12]);
    expect(down[0]).toEqual([25, 50]);
    expect(down.slice(1, 3).every(([, y]) => y === 12)).toBe(true);
    // So do the heart and the star: dragged upwards, each is the other way up.
    for (const sh of ['heart', 'star'] as const) {
      const down = shapePoints(sh, [10, 12], [40, 50]);
      const flipped = shapePoints(sh, [10, 50], [40, 12]);
      expect(flipped.map(([x, y]) => [x, 62 - y])).toEqual(down);
    }
    // Dragged backwards, the same shape.
    expect(shapePoints('square', [40, 50], [10, 12])).toEqual(
      shapePoints('square', [10, 12], [40, 50]),
    );
    // Off the pad's edge, it stays on the pad.
    for (const [x, y] of shapePoints('circle', [0, 0], [GRID - 1, GRID - 1])) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(GRID - 1);
    }
  });

  it('are dragged out on the pad, shown as they go, and kept on letting go', () => {
    const pad = new Pad();
    pad.tool = 'circle';
    pad.colour = 4;
    expect(pad.begin(0.2, 0.2)).toBe(true);
    pad.move(0.5, 0.4);
    expect(pad.cur?.p.length).toBeGreaterThan(8);
    pad.move(0.8, 0.8);
    pad.end();
    expect(pad.strokes).toHaveLength(1);
    expect(pad.strokes[0]?.c).toBe(4);
    // A tap is not a shape.
    pad.begin(0.5, 0.5);
    pad.end();
    expect(pad.strokes).toHaveLength(1);
    // It round-trips in the save.
    expect(decode(encode(pad.strokes))).toEqual(pad.strokes);
  });
});

describe('the eraser', () => {
  it('rubs out the middle of a line and leaves its two ends', () => {
    const left = erase(
      [
        {
          c: 1,
          p: [
            [10, 30],
            [50, 30],
          ],
        },
      ],
      [30, 20],
      [30, 40],
    );
    expect(left).toHaveLength(2);
    for (const s of left) {
      expect(s.c).toBe(1);
      for (const [x] of s.p) expect(Math.abs(x - 30)).toBeGreaterThan(ERASER - 1);
    }
  });

  it('leaves alone what it does not touch, and takes away dots and scraps under it', () => {
    const line = {
      c: 0,
      p: [
        [5, 5],
        [5, 40],
      ] as [number, number][],
    };
    const dot = { c: 2, p: [[30, 30]] as [number, number][] };
    expect(erase([line, dot], [50, 50], [60, 60])).toEqual([line, dot]);
    expect(erase([line, dot], [30, 30], [30, 30])).toEqual([line]);
    expect(
      erase(
        [
          {
            c: 0,
            p: [
              [30, 30],
              [31, 30],
            ],
          },
        ],
        [30, 30],
        [31, 30],
      ),
    ).toEqual([]);
  });

  it('is undone in one step, and Undo also brings back a cleared drawing', () => {
    const pad = new Pad();
    pad.begin(0.1, 0.5);
    pad.move(0.9, 0.5);
    pad.end();
    const drawn = encode(pad.strokes);
    pad.tool = 'eraser';
    pad.begin(0.5, 0.3);
    pad.move(0.5, 0.7);
    pad.end();
    expect(pad.strokes).toHaveLength(2);
    pad.undo();
    expect(encode(pad.strokes)).toBe(drawn);
    // Rubbing out nothing leaves nothing to undo.
    pad.begin(0.1, 0.1);
    pad.end();
    pad.clear();
    expect(pad.strokes).toHaveLength(0);
    pad.undo();
    expect(encode(pad.strokes)).toBe(drawn);
    pad.undo();
    expect(pad.strokes).toHaveLength(0);
    expect(pad.canUndo).toBe(false);
  });

  it('never makes a drawing too big for the save', () => {
    const pad = new Pad();
    for (let k = 0; k < 60 && inkUsed(pad.strokes) < INK - 4; k++) {
      pad.tool = 'star';
      pad.begin((k % 8) / 8, Math.floor(k / 8) / 8);
      pad.move((k % 8) / 8 + 0.12, Math.floor(k / 8) / 8 + 0.12);
      pad.end();
    }
    pad.tool = 'eraser';
    for (let y = 0.05; y < 1; y += 0.1) {
      pad.begin(0, y);
      pad.move(1, y + 0.03);
      pad.end();
    }
    expect(inkUsed(pad.strokes)).toBeLessThanOrEqual(INK);
    expect(decode(encode(pad.strokes))).toEqual(pad.strokes);
  });
});
