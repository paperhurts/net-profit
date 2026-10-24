/**
 * The pet book's card (data/petsys.ts): its two shelves as HTML, a card for each friend with a picture the game draws
 * into its canvas, the name, where it came from and where it is now, and Rename. Pure: the game puts the HTML in the
 * card and wires the taps. A name is the player's own text, so everything shown is escaped.
 */

import { type BookEntry, type BookKey, NAME_MAX, nameable, type Shelf } from '../data/petsys';

const SHELVES: readonly { shelf: Shelf; title: string; note: string }[] = [
  { shelf: 'pets', title: 'Pets', note: 'They never fight beside you. They just like you.' },
  {
    shelf: 'companions',
    title: 'Companions',
    note: 'They fight beside you. The roll-call board at the castle says who comes.',
  },
];

export function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

function card(e: BookEntry, editing: BookKey | null): string {
  const named = e.was ? `<small class="was">Was ${esc(e.was)}</small>` : '';
  const act = !nameable(e.key)
    ? ''
    : editing === e.key
      ? `<div class="pname"><input id="petName" type="text" maxlength="${NAME_MAX * 2}" value="${esc(e.name)}" aria-label="A name for ${esc(e.name)}" autocomplete="off" enterkeyhint="done">` +
        `<button class="rchip on" data-save="${e.key}">Save</button><button class="rchip" data-cancel="">Cancel</button></div>`
      : `<button class="rchip" data-rename="${e.key}">Rename</button>`;
  return (
    `<div class="pet" data-pet="${e.key}"><canvas class="petpic" data-pic="${e.key}" aria-hidden="true"></canvas>` +
    `<div class="pmeta"><b>${esc(e.name)}</b>${named}<small>${esc(e.from)}</small><small class="now">${esc(e.where)}</small>${act}</div></div>`
  );
}

/** The book's list: each shelf that has anyone on it, with its cards; one card may be mid-rename. */
export function bookHtml(entries: readonly BookEntry[], editing: BookKey | null): string {
  if (!entries.length)
    return '<p class="tnote">Nobody yet. Build the tree platform, and a dog comes to live on your pier.</p>';
  return SHELVES.map(({ shelf, title, note }) => {
    const on = entries.filter((e) => e.shelf === shelf);
    if (!on.length) return '';
    return `<h3 class="shelf">${title} <small>${on.length}</small></h3><p class="tnote">${note}</p>${on.map((e) => card(e, editing)).join('')}`;
  }).join('');
}
