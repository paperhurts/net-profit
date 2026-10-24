/**
 * The pet book's card (data/petsys.ts): its two shelves as HTML, a card for each friend with a picture the game draws
 * into its canvas, the name, where it came from and where it is now, and Rename. The Pets shelf ends with Draw a pet
 * (data/doodle.ts), and a pet you drew can be let go, after a second tap, to make room for another. Pure: the game
 * puts the HTML in the card and wires the taps. A name is the player's own text, so everything shown is escaped.
 */

import type { EggKind } from '../data/eggs';
import {
  type BookEntry,
  DRAWN_MAX,
  type EntryKey,
  isOwnKey,
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

/** An egg in the nest crate, as the book shows it: its kind, and how long it has left (0 when it is ready). */
export type EggRow = { k: EggKind; left: number };

/** What is going on in the book: a name being typed, a pet about to be let go, how many drawn, and the eggs. */
export type BookState = {
  editing: EntryKey | null;
  letting: EntryKey | null;
  drawn: number;
  eggs?: readonly EggRow[];
};

const EGG_NAMES: Readonly<Record<EggKind, string>> = {
  common: 'A common egg',
  rare: 'A rare egg',
  mythic: 'A mythic egg',
};

/** Time left on an egg, in words: under a minute, minutes, or hours and minutes. */
export function eggWait(ms: number): string {
  const m = Math.ceil(ms / 60_000);
  if (m <= 1) return 'in under a minute';
  if (m < 60) return `in ${m} minutes`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `in ${h} hour${h > 1 ? 's' : ''}${r ? ` ${r} minutes` : ''}`;
}

/** The nest crate's eggs, each with its wait: hatching goes on with the game closed. */
function eggRows(eggs: readonly EggRow[]): string {
  if (!eggs.length) return '';
  return (
    `<div class="eggs"><b>In your nest crate</b>` +
    eggs
      .map(
        (e) =>
          `<div class="egg"><span class="eggpic e-${e.k}" aria-hidden="true"></span><span><b>${EGG_NAMES[e.k]}</b><small>${e.left > 0 ? `Hatches ${eggWait(e.left)}, even with the game closed.` : 'Ready. It hatches next time you are aboard and all is calm.'}</small></span></div>`,
      )
      .join('') +
    '</div>'
  );
}

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
      (isOwnKey(e.key)
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
    return shelf === 'pets'
      ? head + cards + eggRows(st.eggs ?? []) + drawButton(st.drawn)
      : head + cards;
  }).join('');
}
