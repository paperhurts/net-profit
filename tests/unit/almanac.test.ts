import { describe, expect, it } from 'vitest';
import { KIND_NAMES } from '../../src/data/goatcave';
import { ALMANAC, almanacPagesHtml, kindsFound } from '../../src/ui/almanac';

describe('the Goat Almanac', () => {
  it('has a card for each of the eleven kinds, the G.O.A.T. last', () => {
    expect([...ALMANAC].sort()).toEqual(Object.keys(KIND_NAMES).sort());
    expect(ALMANAC.at(-1)).toBe('goat');
  });

  it('finds nothing before the island is seen, and the fainting goat as soon as it is', () => {
    expect(kindsFound(false, ['pygmy']).size).toBe(0);
    expect([...kindsFound(true, undefined)]).toEqual(['fainting']);
    expect(kindsFound(true, ['pygmy', 'ghost', 'dragon']).size).toBe(3);
  });

  it('counts what is found, tells what a found goat is, and hints where to look for the rest', () => {
    const html = almanacPagesHtml(kindsFound(true, ['pygmy']));
    expect(html).toContain('2 of 11 found');
    expect(html).toContain('Fits in a wheelbarrow');
    expect(html).toContain('Not found yet. Read the headstones on the Udder Side.');
    expect((html.match(/class="page unk"/g) ?? []).length).toBe(9);
    // Every card is there, by its kind.
    for (const k of ALMANAC) expect(html).toContain(`data-kind="${k}"`);
  });

  it("turns the G.O.A.T.'s card gold once it is found", () => {
    const html = almanacPagesHtml(kindsFound(true, ['goat']));
    expect(html).toContain('class="page gold" data-kind="goat"');
  });
});
