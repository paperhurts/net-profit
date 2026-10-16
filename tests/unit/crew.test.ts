import { describe, expect, it } from 'vitest';
import {
  CRAFTS,
  craftOfSeat,
  DEFAULT_CREW,
  parseCrew,
  RIDERS,
  SEATS,
  seatsOf,
} from '../../src/data/crew';

describe("the flotilla's crew, read back from a save", () => {
  it('is the starting crew when missing or broken', () => {
    expect(parseCrew(undefined)).toEqual(DEFAULT_CREW);
    expect(parseCrew('airboat')).toEqual(DEFAULT_CREW);
    expect(parseCrew(null)).toEqual(DEFAULT_CREW);
  });

  it('keeps a crew the kid chose, nobody included', () => {
    const c = {
      airboat: 'tarling',
      catamaran: null,
      windsurf: 'necro',
      banana: 'warrior',
      swan: null,
      swan2: 'caterman',
    };
    expect(parseCrew(JSON.parse(JSON.stringify(c)))).toEqual(c);
  });

  it('drops a stranger, and a rider on two seats stays on the first', () => {
    const c = parseCrew({
      airboat: 'pirate',
      catamaran: 'bones',
      windsurf: 'bones',
      banana: 7,
      swan: 'caterman',
      swan2: 'caterman',
    });
    expect(c).toEqual({
      airboat: null,
      catamaran: 'bones',
      windsurf: null,
      banana: null,
      swan: 'caterman',
      swan2: null,
    });
    for (const k of SEATS) expect(k in c).toBe(true);
    expect(RIDERS).toHaveLength(5);
  });

  it('gives a save from before the swan Caterman on it, the seat beside him empty', () => {
    const old = { airboat: 'tarling', catamaran: null, windsurf: 'necro', banana: 'warrior' };
    expect(parseCrew(old)).toEqual({ ...old, swan: 'caterman', swan2: null });
  });

  it('seats two on the swan and one on each of the others', () => {
    expect(CRAFTS).toContain('swan');
    expect(seatsOf('swan')).toEqual(['swan', 'swan2']);
    for (const k of CRAFTS) if (k !== 'swan') expect(seatsOf(k)).toEqual([k]);
    expect(SEATS.map(craftOfSeat)).toEqual([...CRAFTS, 'swan']);
    // Each rider starts on a seat of his own; Caterman pedals the swan.
    const on = Object.values(DEFAULT_CREW).filter((r) => r);
    expect(new Set(on).size).toBe(RIDERS.length);
    expect(DEFAULT_CREW.swan).toBe('caterman');
  });
});
