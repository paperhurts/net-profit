import { describe, expect, it } from 'vitest';
import {
  ALL_CROP_IDS,
  type Garden,
  journalOf,
  noteInJournal,
  parseGarden,
  pick,
  untouchedGarden,
} from '../../src/data/garden';
import { CROP_LINES, journalPagesHtml } from '../../src/ui/garden';

const T0 = 1_800_000_000_000;

describe('the garden journal', () => {
  it('fills in a crop’s page as its fruit are picked: how many, the biggest, Gold and Rainbow, the first day', () => {
    const g: Garden = { seen: true };
    expect(journalOf(g, 'tomato')).toBeNull();
    noteInJournal(
      g,
      'tomato',
      [
        { c: 'tomato', m: 1.1 },
        { c: 'tomato', m: 0.9, v: 'gold' },
      ],
      4,
    );
    noteInJournal(g, 'tomato', [{ c: 'tomato', m: 3.2, v: 'rainbow' }], 9);
    expect(journalOf(g, 'tomato')).toEqual({ n: 3, best: 3.2, gold: 1, rainbow: 1, first: 4 });
    noteInJournal(g, 'carrot', []);
    expect(journalOf(g, 'carrot')).toBeNull();
  });

  it('is written as fruit are picked', () => {
    const g: Garden = {
      seen: true,
      beds: [{ crop: 'strawberry', planted: T0, ripe: 2, next: 0, w: [1, 1.2], born: 2 }],
    };
    pick(g, 0, T0, 7);
    expect(journalOf(g, 'strawberry')).toEqual({ n: 2, best: 1.2, first: 7 });
  });

  it('has a page and a line for every crop, the ones not yet picked saying where the seed is', () => {
    expect(Object.keys(CROP_LINES).sort()).toEqual([...ALL_CROP_IDS].sort());
    const g: Garden = { seen: true, journal: { kraken: { n: 1, best: 1.05, first: 2 } } };
    const html = journalPagesHtml(g);
    expect(html).toContain(`1 of ${ALL_CROP_IDS.length} picked`);
    expect(html.match(/<article/g)).toHaveLength(ALL_CROP_IDS.length);
    expect(html).toContain('Picked once');
    expect(html).toContain('First on day 2');
    expect(html).toContain('The seed stall always has it.');
    expect(html).toContain('about one day in 80');
    expect(html).toContain('only comes from the Moonkoi');
  });

  it('keeps through the save; odd entries dropped', () => {
    const g: Garden = { seen: true };
    noteInJournal(g, 'lantern', [{ c: 'lantern', m: 1.15, v: 'gold' }], 3);
    expect(parseGarden(JSON.parse(JSON.stringify(g))).journal).toEqual(g.journal);
    const odd = parseGarden({
      journal: { carrot: { n: 2, best: 99, gold: 5 }, beans: { n: 3 }, tomato: { n: 0 } },
    });
    expect(odd.journal).toEqual({ carrot: { n: 2, best: 5, gold: 2 } });
    expect(untouchedGarden({ seen: false, journal: g.journal })).toBe(false);
  });
});
