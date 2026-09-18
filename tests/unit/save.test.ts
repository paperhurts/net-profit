import { describe, expect, it } from 'vitest';
import {
  type Bounds,
  DEFAULT_ORDER,
  defaultSave,
  parseSave,
  SAVE_KEY,
  serializeSave,
} from '../../src/state/save';

const bounds: Bounds = {
  maxLevel: 5,
  paints: 10,
  stages: 5,
  species: 12,
  worldSize: 4800,
  holdCaps: [12, 20, 32, 50, 80, 120],
};

/** A save the prototype wrote before the trip existed. It must keep loading. */
const legacy = JSON.stringify({
  coins: 1756,
  earned: 4021,
  muted: true,
  lv: { net: 4, hold: 5, engine: 3 },
  paint: 9,
  log: [259, 106, 127, 67, 21, 26, 2, 0, 0, 0, 1, 0],
  order: { sp: 3, n: 8, have: 2, pay: 75 },
  wood: 22,
  build: 3,
  levSeen: true,
});

describe('the save key', () => {
  it('is still netprofit.v1', () => {
    expect(SAVE_KEY).toBe('netprofit.v1');
  });
});

describe('parseSave', () => {
  it('loads a legacy save unchanged', () => {
    const s = parseSave(legacy, bounds);
    expect(s.coins).toBe(1756);
    expect(s.earned).toBe(4021);
    expect(s.muted).toBe(true);
    expect(s.lv).toEqual({ net: 4, hold: 5, engine: 3 });
    expect(s.paint).toBe(9);
    expect(s.log).toEqual([259, 106, 127, 67, 21, 26, 2, 0, 0, 0, 1, 0]);
    expect(s.order).toEqual({ sp: 3, n: 8, have: 2, pay: 75 });
    expect(s.wood).toBe(22);
    expect(s.build).toBe(3);
    expect(s.levSeen).toBe(true);
    expect(s.trip).toBeNull();
    expect(s.keys).toBe('drive');
  });

  it('keeps the keyboard setting and falls back to drive for anything odd', () => {
    expect(parseSave(JSON.stringify({ keys: 'point' }), bounds).keys).toBe('point');
    expect(parseSave(JSON.stringify({ keys: 'drive' }), bounds).keys).toBe('drive');
    expect(parseSave(JSON.stringify({ keys: 'sideways' }), bounds).keys).toBe('drive');
  });

  it('gives the defaults for nothing, garbage and non-objects', () => {
    for (const raw of [null, '', 'not json', '42', '"str"', 'null']) {
      expect(parseSave(raw, bounds)).toEqual(defaultSave(bounds));
    }
    expect(defaultSave(bounds).order).toEqual(DEFAULT_ORDER);
  });

  it('clamps every number the way the prototype did', () => {
    const s = parseSave(
      JSON.stringify({
        lv: { net: 9, hold: -1, engine: 2.7 },
        paint: 99,
        build: 7,
        wood: -3,
        coins: '12',
      }),
      bounds,
    );
    expect(s.lv).toEqual({ net: 5, hold: 0, engine: 2 });
    expect(s.paint).toBe(9);
    expect(s.build).toBe(5);
    expect(s.wood).toBe(0);
    expect(s.coins).toBe(12);
  });

  it('keeps a log of the wrong length in step with the species', () => {
    expect(parseSave(JSON.stringify({ log: [1, 2] }), bounds).log).toEqual([
      1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(parseSave(JSON.stringify({ log: new Array(20).fill(7) }), bounds).log).toHaveLength(12);
  });

  it('falls back to the default order when the saved one makes no sense', () => {
    expect(parseSave(JSON.stringify({ order: { sp: 99, n: 8 } }), bounds).order).toEqual(
      DEFAULT_ORDER,
    );
    expect(parseSave(JSON.stringify({ order: { sp: 2, n: 0 } }), bounds).order).toEqual(
      DEFAULT_ORDER,
    );
    expect(
      parseSave(JSON.stringify({ order: { sp: 2, n: 5, have: 1, pay: 20 } }), bounds).order,
    ).toEqual({
      sp: 2,
      n: 5,
      have: 1,
      pay: 20,
    });
  });

  it('restores a trip, clamped to the world and trimmed to the hold', () => {
    const s = parseSave(
      JSON.stringify({
        lv: { hold: 0 },
        trip: { x: 9999, y: -5, h: 1.25, clock: 1.7, hold: [20, 3, -1] },
      }),
      bounds,
    );
    expect(s.trip).toEqual({
      x: 4640,
      y: 160,
      h: 1.25,
      clock: 0.999,
      // 23 in a hold of 12: the excess comes off the cheapest species first.
      hold: [9, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
  });

  it('applies only the trip fields that make sense', () => {
    const s = parseSave(
      JSON.stringify({ trip: { x: 'far', y: 100, h: 'nope', clock: 0.3 } }),
      bounds,
    );
    expect(s.trip).toEqual({ clock: 0.3 });
    expect(parseSave(JSON.stringify({ trip: 'nope' }), bounds).trip).toBeNull();
  });
});

describe('serializeSave', () => {
  it('round-trips a save and omits a missing trip', () => {
    const s = parseSave(legacy, bounds);
    const text = serializeSave(s);
    expect(text).not.toContain('trip');
    expect(parseSave(text, bounds)).toEqual(s);
  });

  it('keeps a trip through the round trip', () => {
    const s = parseSave(legacy, bounds);
    s.trip = { x: 2000, y: 2100, h: 0.5, clock: 0.42, hold: new Array(12).fill(1) };
    s.keys = 'point';
    expect(parseSave(serializeSave(s), bounds)).toEqual(s);
  });
});

describe('the fishmonger pick', () => {
  it('is none in a save from before the vendors, and survives a round trip', () => {
    const s = parseSave(legacy, bounds);
    expect(s.market).toBe(-1);
    s.market = 4;
    expect(parseSave(serializeSave(s), bounds).market).toBe(4);
  });

  it('is clamped to a species that exists', () => {
    expect(parseSave(JSON.stringify({ market: 99 }), bounds).market).toBe(bounds.species - 1);
    expect(parseSave(JSON.stringify({ market: -7 }), bounds).market).toBe(-1);
  });
});

describe('days and first catches', () => {
  it('start at day one with nothing caught in a save from before the guide, and round-trip', () => {
    const s = parseSave(legacy, bounds);
    expect(s.day).toBe(1);
    expect(s.first).toEqual(new Array(bounds.species).fill(0));
    s.day = 7;
    s.first[2] = 3;
    const back = parseSave(serializeSave(s), bounds);
    expect(back.day).toBe(7);
    expect(back.first[2]).toBe(3);
  });

  it('never go below day one or a first catch of never', () => {
    const s = parseSave(JSON.stringify({ day: -4, first: [-1, 2] }), bounds);
    expect(s.day).toBe(1);
    expect(s.first.slice(0, 2)).toEqual([0, 2]);
  });
});
