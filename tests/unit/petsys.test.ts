import { describe, expect, it } from 'vitest';
import {
  BOOK_KEYS,
  type BookFacts,
  type BookKey,
  bookEntries,
  cleanName,
  defaultName,
  NAME_MAX,
  nameOf,
  noPets,
  parsePets,
  petsForSave,
  rename,
  shelfOf,
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
    const html = bookHtml(bookEntries(p, facts(['dog', 'crows'])), null);
    expect(html).toContain('Rex &amp; &quot;Co&quot;');
    expect(html).toContain('data-rename="dog"');
    expect(html).not.toContain('data-rename="crows"');
    expect(bookHtml(bookEntries(p, facts(['dog'])), 'dog')).toContain('id="petName"');
    expect(esc('<b>')).toBe('&lt;b&gt;');
    expect(bookHtml([], null)).toContain('tree platform');
  });
});
