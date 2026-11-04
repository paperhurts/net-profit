/**
 * The Goat-yard on Goat Isle's far shore (the owner's, 2026-11-04: "a comedic cemetery ... where goats who died in
 * creative goat deaths have funny headstones", and of the draft, "I loved what I read"): its headstones, in order
 * along the shore, each with its epitaph, word for word as she approved them. Kept cartoony, like a haunted house
 * ride: a friendly ghost goat sits on some of them and waves, and the jester's is a prank.
 */

export type Headstone = {
  text: string;
  /** A ghost goat sits on it. */
  ghost?: boolean;
  /** The biggest stone in the yard. */
  big?: boolean;
  /** Read, it says Gotcha! and its ghost pops out. */
  gotcha?: boolean;
};

export const HEADSTONES: readonly Headstone[] = [
  { text: 'Here lies Nibbles. Ate a whole wheel of cheese. It was the castle. Rest in Brie.' },
  { text: 'Here lies Barnaby. Fainted into the cheese vat. Went out a Gouda goat.' },
  { text: 'I TOLD YOU I WAS FEELING BAAAD.', ghost: true },
  {
    text: 'Here lies Clover. Fainted on a trampoline. Then again. And again. Still bouncing, somewhere.',
  },
  { text: 'Here lies Pepper, whose last words were "Watch this."' },
  { text: 'Here lies Biscuit the Second. Challenged a shark to a staring contest. Blinked.' },
  { text: 'Here lies Daisy. Stood on the weathervane in a storm. Pointed north. Briefly.' },
  {
    text: 'Here lies Baxter. Headbutted the cheese castle. The castle won. It was a very old cheddar.',
  },
  { text: 'Here lies Hamish. Ate a ghost pepper. Became a ghost. Is fine about it.', ghost: true },
  { text: 'Here lies Clementine. Tried to eat the moon. It looked like cheese.' },
  { text: 'Here lies Waffles. Last words: "I wonder what this button does."' },
  { text: "Here lies the goat who ate the map. We don't know where he is either." },
  { text: 'Here lies Pip. Got his head stuck in a fence. Lived there happily for eleven years.' },
  {
    text: 'Here lies Old Greybeard, aged 31. Ate everything on the island except his vegetables.',
    ghost: true,
  },
  { text: 'Here lies Bartholomew. Here also lies his tin can collection. He insisted.' },
  { text: 'Here lies Tiny. He was not tiny.', big: true },
  { text: 'Here lies Fluffy. Hugged by a kraken. It meant well.' },
  { text: "Here lies Sir Chuckles, the Royal Jester. This one isn't a joke.", gotcha: true },
];

/** What the jester's stone says a moment after it is read. */
export const GOTCHA = '...Gotcha!';
