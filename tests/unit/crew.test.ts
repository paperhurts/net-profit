import { describe, expect, it } from 'vitest';
import { CRAFTS, DEFAULT_CREW, parseCrew, RIDERS } from '../../src/data/crew';

describe("the flotilla's crew, read back from a save", () => {
  it('is the starting crew when missing or broken', () => {
    expect(parseCrew(undefined)).toEqual(DEFAULT_CREW);
    expect(parseCrew('airboat')).toEqual(DEFAULT_CREW);
    expect(parseCrew(null)).toEqual(DEFAULT_CREW);
  });

  it('keeps a crew the kid chose, nobody included', () => {
    const c = { airboat: 'tarling', catamaran: null, windsurf: 'necro', banana: 'warrior' };
    expect(parseCrew(JSON.parse(JSON.stringify(c)))).toEqual(c);
  });

  it('drops a stranger, and a rider on two craft stays on the first', () => {
    const c = parseCrew({ airboat: 'pirate', catamaran: 'bones', windsurf: 'bones', banana: 7 });
    expect(c).toEqual({ airboat: null, catamaran: 'bones', windsurf: null, banana: null });
    for (const k of CRAFTS) expect(k in c).toBe(true);
    expect(RIDERS).toHaveLength(4);
  });
});
