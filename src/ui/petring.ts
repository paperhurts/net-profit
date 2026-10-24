/**
 * The pet house's ring card (entities/petfight.ts): who you will fight, and which of your pets fights. A drawn pet
 * that has never fought first picks how it fights, once: a build and a special (data/petfight.ts). Pure: the game puts
 * the HTML in the card and wires the taps. Names are the player's own text, so everything shown is escaped.
 */
import {
  BUILD_NAMES,
  BUILD_SAYS,
  BUILDS,
  type Build,
  SPECIAL_NAMES,
  SPECIAL_SAYS,
  SPECIALS,
  type Special,
  type Trainer,
} from '../data/petfight';
import { esc } from './petbook';

/** One of your pets, as the card lists it: how it fights, if it has picked. */
export type RingPet = {
  key: string;
  name: string;
  lv: number;
  fight: { build: Build; special: Special; name?: string } | null;
};

export type RingState = {
  trainer: Trainer;
  beaten: boolean;
  pets: readonly RingPet[];
  /** The pet picked to fight, and, for a drawn one picking how it fights, what is picked so far. */
  chosen: string | null;
  build: Build | null;
  special: Special | null;
};

/** Whether the fight can start: a pet chosen, and it knows how it fights. */
export function ringReady(st: RingState): boolean {
  const p = st.pets.find((q) => q.key === st.chosen);
  return !!p && (!!p.fight || (!!st.build && !!st.special));
}

export function ringHtml(st: RingState): string {
  const t = st.trainer;
  const head =
    `<div class="foe"><b>${esc(t.name)} and ${esc(t.pet)}</b>${st.beaten ? '<span class="won">Beaten</span>' : ''}` +
    `<small>${esc(t.says)}</small></div>`;
  if (!st.pets.length)
    return `${head}<p class="tnote">You have no pets of your own to fight with yet. Draw one, or hatch one from an egg.</p>`;
  const pets =
    '<h3 class="shelf">Who fights?</h3><div class="chips">' +
    st.pets
      .map(
        (p) =>
          `<button class="rchip${p.key === st.chosen ? ' on' : ''}" data-fpet="${esc(p.key)}">${esc(p.name)} <small>Lv ${p.lv}</small></button>`,
      )
      .join('') +
    '</div>';
  const p = st.pets.find((q) => q.key === st.chosen);
  let how = '';
  if (p?.fight) {
    const f = p.fight;
    how = `<p class="tnote">${esc(p.name)}: ${BUILD_NAMES[f.build]}, and its special is ${esc(f.name ?? SPECIAL_NAMES[f.special])}. ${SPECIAL_SAYS[f.special]}</p>`;
  } else if (p) {
    how =
      `<h3 class="shelf">How does ${esc(p.name)} fight?</h3><p class="tnote">You pick this once, for good.</p><div class="chips">` +
      BUILDS.map(
        (b) =>
          `<button class="rchip${st.build === b ? ' on' : ''}" data-fb="${b}">${BUILD_NAMES[b]} <small>${BUILD_SAYS[b]}</small></button>`,
      ).join('') +
      '</div><div class="chips">' +
      SPECIALS.map(
        (s) =>
          `<button class="rchip${st.special === s ? ' on' : ''}" data-fs="${s}">${SPECIAL_NAMES[s]} <small>${SPECIAL_SAYS[s]}</small></button>`,
      ).join('') +
      '</div>';
  }
  const ready = ringReady(st);
  return (
    head +
    pets +
    how +
    `<p class="tnote">Steer with the stick. Bite when you're close, use your special, and get out of the red before it lands.</p>` +
    `<button class="build" id="petFightGo" ${ready ? '' : 'aria-disabled="true"'}><span><b>Fight!</b><small>${ready ? 'Into the ring.' : p ? 'Pick how it fights first.' : 'Pick a pet first.'}</small></span><span class="buy">Go</span></button>`
  );
}
