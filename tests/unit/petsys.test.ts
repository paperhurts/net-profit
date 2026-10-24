import { describe, expect, it } from 'vitest';
import {
  addDrawn,
  BOOK_KEYS,
  type BookFacts,
  type BookKey,
  bookEntries,
  canDraw,
  cleanName,
  DRAWN_MAX,
  DRAWN_NAME,
  defaultName,
  drawnKey,
  letGo,
  NAME_MAX,
  nameOf,
  noPets,
  parsePets,
  petsForSave,
  rename,
  shelfOf,
  toggleWalk,
} from '../../src/data/petsys';
import { COMPANIONS } from '../../src/data/stay';
import { bookHtml, esc } from '../../src/ui/petbook';

const facts = (have: readonly BookKey[], castle: readonly string[] = []): BookFacts => ({
  has: (k) => have.includes(k),
  atCastle: (k) => castle.includes(k),
  crows: 2,
  muffins: 4,
});

describe('the pet book', () => {
  it('has every pet and every companion, each once, on its own shelf', () => {
    expect(new Set(BOOK_KEYS).size).toBe(BOOK_KEYS.length);
    for (const k of COMPANIONS) {
      expect(BOOK_KEYS).toContain(k);
      expect(shelfOf(k)).toBe('companions');
    }
    for (const k of ['dog', 'otter', 'neil', 'crows', 'muffins'] as const)
      expect(shelfOf(k)).toBe('pets');
  });

  it('shows only who is yours, pets first, and where each is', () => {
    const e = bookEntries(noPets(), facts(['baby', 'dog', 'crows', 'muffins', 'cat'], ['cat']));
    expect(e.map((x) => x.key)).toEqual(['dog', 'crows', 'muffins', 'cat', 'baby']);
    expect(e.find((x) => x.key === 'crows')?.where).toContain('2 of 3');
    expect(e.find((x) => x.key === 'muffins')?.where).toContain('4 of 6');
    expect(e.find((x) => x.key === 'cat')?.where).toContain('castle');
    expect(e.find((x) => x.key === 'baby')?.where).toBe('Comes with you.');
    expect(bookEntries(noPets(), facts([]))).toEqual([]);
  });

  it('gives a name, and an empty one or the old one gives the old name back', () => {
    const p = noPets();
    expect(rename(p, 'baby', '  Chomp  ')).toBe(true);
    expect(nameOf(p, 'baby')).toBe('Chomp');
    const [e] = bookEntries(p, facts(['baby']));
    expect(e?.name).toBe('Chomp');
    expect(e?.was).toBe(defaultName('baby'));
    expect(rename(p, 'baby', 'Chomp')).toBe(false);
    expect(rename(p, 'baby', '')).toBe(true);
    expect(nameOf(p, 'baby')).toBe('Baby Reaper');
    rename(p, 'dog', 'The dog');
    expect(p.nm).toEqual({});
    // Several of them, so no one name.
    expect(rename(p, 'crows', 'Flock')).toBe(false);
    expect(rename(p, 'muffins', 'Stinky')).toBe(false);
  });

  it('keeps a name tidy and short, and never cuts an emoji in half', () => {
    expect(cleanName('a\u0007b<script>\n  c')).toBe('abscript c');
    expect(cleanName('x'.repeat(40))).toHaveLength(NAME_MAX);
    const fish = '\u{1F41F}'.repeat(20);
    expect([...cleanName(fish)]).toHaveLength(NAME_MAX);
    expect(cleanName(42)).toBe('');
  });

  it('is left out of the save while nothing is named', () => {
    const p = noPets();
    expect(petsForSave(p)).toBeUndefined();
    rename(p, 'naga', 'Finn');
    expect(parsePets(JSON.parse(JSON.stringify(petsForSave(p))))).toEqual(p);
    expect(parsePets({ nm: { naga: '   ' } })).toEqual(noPets());
    expect(parsePets(null)).toEqual(noPets());
    expect(parsePets([])).toEqual(noPets());
  });

  it("escapes a player's name on the card, and offers Rename only where a name can go", () => {
    const p = noPets();
    p.nm.dog = 'Rex & "Co"';
    const idle = { editing: null, letting: null, drawn: 0 };
    const html = bookHtml(bookEntries(p, facts(['dog', 'crows'])), idle);
    expect(html).toContain('Rex &amp; &quot;Co&quot;');
    expect(html).toContain('data-rename="dog"');
    expect(html).not.toContain('data-rename="crows"');
    expect(bookHtml(bookEntries(p, facts(['dog'])), { ...idle, editing: 'dog' })).toContain(
      'id="petName"',
    );
    expect(esc('<b>')).toBe('&lt;b&gt;');
    // An empty book still offers Draw a pet; a full one says why not.
    expect(bookHtml([], idle)).toContain('id="petDraw"');
    expect(bookHtml([], { ...idle, drawn: DRAWN_MAX })).toContain('aria-disabled="true"');
  });

  it('keeps a drawing as a pet on the Pets shelf, four at most, and lets one go', () => {
    const p = noPets();
    const line = [
      {
        c: 1,
        p: [
          [3, 4],
          [20, 30],
        ] as [number, number][],
      },
    ];
    expect(addDrawn(p, [], 'Nothing', 0)).toBeNull();
    const a = addDrawn(p, line, '  Wiggles ', 100);
    expect(a).toMatchObject({ id: 1, nm: 'Wiggles', d: 'BDEUe', got: 100 });
    expect(addDrawn(p, line, '', 101)?.nm).toBe(DRAWN_NAME);
    addDrawn(p, line, 'C', 102);
    addDrawn(p, line, 'D', 103);
    expect(canDraw(p)).toBe(false);
    expect(addDrawn(p, line, 'E', 104)).toBeNull();
    // On the Pets shelf after the others, before the companions.
    const e = bookEntries(p, facts(['dog', 'cat']));
    expect(e.map((x) => x.key)).toEqual(['dog', 'd1', 'd2', 'd3', 'd4', 'cat']);
    expect(e[1]?.doodle).toBe('BDEUe');
    // Renamed: an empty name keeps the one it has.
    expect(rename(p, drawnKey(1), 'Sir Wiggles')).toBe(true);
    expect(nameOf(p, 'd1')).toBe('Sir Wiggles');
    expect(rename(p, 'd1', '')).toBe(false);
    // One walks with you; another taken along takes its place, and a pet let go walks no more.
    expect(toggleWalk(p, 'd2')).toBe(true);
    expect(toggleWalk(p, 'd3')).toBe(true);
    expect(p.walk).toBe('d3');
    expect(bookEntries(p, facts([])).find((x) => x.key === 'd3')?.walking).toBe(true);
    expect(toggleWalk(p, 'd3')).toBe(false);
    expect(p.walk).toBeNull();
    expect(toggleWalk(p, 'dog')).toBe(false);
    toggleWalk(p, 'd2');
    expect(letGo(p, 'd2')).toBe(true);
    expect(letGo(p, 'd2')).toBe(false);
    expect(p.walk).toBeNull();
    expect(canDraw(p)).toBe(true);
    // The next one gets a number of its own.
    expect(addDrawn(p, line, 'F', 105)?.id).toBe(5);
    // Through the save and back.
    expect(parsePets(JSON.parse(JSON.stringify(petsForSave(p))))).toEqual(p);
  });

  it('drops a drawn pet that is not a drawing, a twin, or one past four', () => {
    const d = (id: number, s = 'BDEUe') => ({ id, nm: 'X', d: s, got: 1 });
    const got = parsePets({ drawn: [d(1), d(1), d(2, '!!'), d(3, ''), d(4), d(5), d(6), d(7)] });
    expect(got.drawn.map((x) => x.id)).toEqual([1, 4, 5, 6]);
    expect(parsePets({ drawn: [{ id: 2, d: 'BDEUe' }] }).drawn[0]?.nm).toBe(DRAWN_NAME);
  });
});
