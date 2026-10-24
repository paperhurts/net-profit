/**
 * The pet book's card (data/petsys.ts): its two shelves as HTML, a card for each friend with a picture the game draws
 * into its canvas, the name, where it came from and where it is now, and Rename. The Pets shelf ends with Draw a pet
 * (data/doodle.ts), and a pet you drew can be let go, after a second tap, to make room for another. Pure: the game
 * puts the HTML in the card and wires the taps. A name is the player's own text, so everything shown is escaped.
 */

import {
  type BookEntry,
  DRAWN_MAX,
  type EntryKey,
  isDrawnKey,
  NAME_MAX,
  nameable,
  type Shelf,
} from '../data/petsys';

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

/** What is going on in the book: a name being typed, or a drawn pet about to be let go. */
export type BookState = { editing: EntryKey | null; letting: EntryKey | null; drawn: number };

function card(e: BookEntry, st: BookState): string {
  const named = e.was ? `<small class="was">Was ${esc(e.was)}</small>` : '';
  let act = '';
  if (st.editing === e.key)
    act =
      `<div class="pname"><input id="petName" type="text" maxlength="${NAME_MAX * 2}" value="${esc(e.name)}" aria-label="A name for ${esc(e.name)}" autocomplete="off" enterkeyhint="done">` +
      `<button class="rchip on" data-save="${e.key}">Save</button><button class="rchip" data-cancel="">Cancel</button></div>`;
  else if (st.letting === e.key)
    act =
      `<p class="ask">Let ${esc(e.name)} go to live on the island? You can't get this one back.</p>` +
      `<div class="pname"><button class="rchip warn" data-gone="${e.key}">Let go</button><button class="rchip" data-cancel="">Keep</button></div>`;
  else if (nameable(e.key))
    act =
      `<div class="pname"><button class="rchip" data-rename="${e.key}">Rename</button>` +
      (isDrawnKey(e.key)
        ? `<button class="rchip${e.walking ? ' on' : ''}" data-walk="${e.key}">${e.walking ? 'Walking with you' : 'Take it along'}</button>` +
          `<button class="rchip" data-letgo="${e.key}">Let go</button>`
        : '') +
      '</div>';
  return (
    `<div class="pet" data-pet="${e.key}"><canvas class="petpic" data-pic="${e.key}" aria-hidden="true"></canvas>` +
    `<div class="pmeta"><b>${esc(e.name)}</b>${named}<small>${esc(e.from)}</small><small class="now">${esc(e.where)}</small>${act}</div></div>`
  );
}

/** Draw a pet, or why not: four drawn is the most. */
function drawButton(drawn: number): string {
  const full = drawn >= DRAWN_MAX;
  return (
    `<div class="drawrow"><button class="build" id="petDraw" ${full ? 'aria-disabled="true"' : ''}>` +
    `<span><b>Draw a pet</b><small>${full ? `${DRAWN_MAX} drawn pets is the most. Let one go to draw another.` : `Draw it with your finger, and it's yours. ${drawn} of ${DRAWN_MAX} drawn.`}</small></span>` +
    `<span class="buy">${full ? 'Full' : 'Draw'}</span></button></div>`
  );
}

/** The book's list: each shelf that has anyone on it, with its cards; the Pets shelf always, for Draw a pet. */
export function bookHtml(entries: readonly BookEntry[], st: BookState): string {
  return SHELVES.map(({ shelf, title, note }) => {
    const on = entries.filter((e) => e.shelf === shelf);
    if (shelf === 'companions' && !on.length) return '';
    const head = `<h3 class="shelf">${title} <small>${on.length}</small></h3><p class="tnote">${note}</p>`;
    const cards = on.map((e) => card(e, st)).join('');
    return shelf === 'pets' ? head + cards + drawButton(st.drawn) : head + cards;
  }).join('');
}
