/**
 * The Goat Almanac (part five of the owner's Goat Isle plan): a card in the field guide for every kind of goat, the
 * plan's eleven (her call), filled in as each is found. It shows only once Goat Isle has been found, so the field guide
 * gives nothing of the surprise away. The fainting goat is found the moment you meet the island's herds; the others in
 * the cave and about the island (data/goatcave.ts KIND_NAMES; the kinds found are kept in the save as goat.kinds).
 */
import { type GoatKind, KIND_NAMES } from '../data/goatcave';

/** The kinds, in the Almanac's order: the commonest first, the G.O.A.T. last. */
export const ALMANAC: readonly GoatKind[] = [
  'fainting',
  'pygmy',
  'ghost',
  'angora',
  'mountain',
  'nubian',
  'boer',
  'alpine',
  'roof',
  'cheese',
  'goat',
];

/** What its card says once it is found. */
const FACTS: Readonly<Record<GoatKind, string>> = {
  fainting:
    'Goes stiff as a board when it gets a fright, and gets straight back up. Real ones do this too!',
  pygmy: 'Tiny, round and very pleased with itself. Fits in a wheelbarrow. Refuses to get in one.',
  ghost: 'Waves at visitors from the Goat-yard. Ate a ghost pepper once, and is fine about it.',
  angora: 'So fluffy it is mostly hair. Its wool is called mohair, and it is very soft.',
  mountain: 'Climbs cliffs that would scare a squirrel, and naps on the edge of them.',
  nubian: 'Long floppy ears, and the loudest baa on the island.',
  boer: 'Big, strong and brown-headed. Likes a good shove.',
  alpine: 'Pointy ears and a yodel. Probably a yodel.',
  roof: 'Lives on roofs. Nobody knows how it gets up there, and it will not say.',
  cheese: 'Smells of cheddar. Lives in the cheese mine and is never hungry.',
  goat: 'The Greatest Of All Time. Golden all over, and very modest about it. Not really.',
};

/** Where to look, on a card not found yet. */
const HINTS: Readonly<Record<GoatKind, string>> = {
  fainting: 'Out on the meadows of Goat Isle.',
  pygmy: 'Somewhere in the goat cave, across the fondue.',
  ghost: 'Read the headstones on the Udder Side.',
  angora: 'Deeper in the goat cave, somewhere soft.',
  mountain: 'Deeper in the goat cave, somewhere high.',
  nubian: 'Deeper in the goat cave: listen for the loudest baa.',
  boer: 'Deeper in the goat cave.',
  alpine: 'Deeper in the goat cave, where it is cold.',
  roof: 'Look up.',
  cheese: 'In the cheese mine, deep in the goat cave.',
  goat: 'Nobody has ever seen it. Yet.',
};

/** Each kind's coat and its darker shade, for its picture. */
const COATS: Readonly<Record<GoatKind, [string, string]>> = {
  fainting: ['#F4F0E6', '#9C907E'],
  pygmy: ['#9C7A55', '#5A4126'],
  ghost: ['#EAF4FF', '#B7C8DC'],
  angora: ['#FFFFFF', '#D8D2C6'],
  mountain: ['#F7F7F2', '#2E2E2E'],
  nubian: ['#B5784A', '#5E3A20'],
  boer: ['#F2EDE4', '#8A4A2A'],
  alpine: ['#C8A070', '#2B231C'],
  roof: ['#D9CBB4', '#7A6A55'],
  cheese: ['#F4C64E', '#C98A1C'],
  goat: ['#F2C230', '#B8860B'],
};

/** A little goat, side-on, in a kind's colours; grey and see-through while it is still to find. */
function goatSvg(k: GoatKind, found: boolean): string {
  const [coat, dark] = found ? COATS[k] : ['#C9C4BA', '#9A958C'];
  const ghost = found && k === 'ghost' ? ' opacity=".7"' : '';
  return `<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"${ghost}><path d="M8 18v8M11 18v8M19 18v8M22 18v8" stroke="${dark}" stroke-width="2" stroke-linecap="round"/><ellipse cx="15" cy="16" rx="9" ry="5.5" fill="${coat}" stroke="${dark}" stroke-width=".8"/><path d="M21 13l4-5 3 1-4 6z" fill="${coat}"/><ellipse cx="25.5" cy="8.5" rx="3.2" ry="2.2" fill="${coat}" stroke="${dark}" stroke-width=".8"/><path d="M24 7q-1-4-4-3" fill="none" stroke="${dark}" stroke-width="1.3"/><circle cx="26.2" cy="8" r=".7" fill="#1A1512"/><path d="M6 13l-2-3" stroke="${dark}" stroke-width="1.4"/>${k === 'goat' && found ? '<path d="M20 3l1.5 2 1.5-2 1.5 2 1.5-2v3h-6z" fill="#E2B33C"/>' : ''}</svg>`;
}

/** The kinds found, from the save: the fainting goat as soon as the island has been, and whatever else is kept. */
export function kindsFound(seen: boolean, kinds: readonly string[] | undefined): Set<GoatKind> {
  const out = new Set<GoatKind>();
  if (!seen) return out;
  out.add('fainting');
  for (const k of kinds ?? []) if (k in KIND_NAMES) out.add(k as GoatKind);
  return out;
}

/** The Almanac's pages for the field guide: a heading with how many are found, and a card for every kind. */
export function almanacPagesHtml(found: Set<GoatKind>): string {
  const n = ALMANAC.filter((k) => found.has(k)).length;
  const head = `<h3 class="jhead">The Goat Almanac <small>${n} of ${ALMANAC.length} found</small></h3>`;
  return (
    head +
    ALMANAC.map((k) => {
      const got = found.has(k);
      const cls = got ? (k === 'goat' ? ' gold' : '') : ' unk';
      const text = got ? FACTS[k] : `Not found yet. ${HINTS[k]}`;
      return `<article class="page${cls}" data-kind="${k}">${goatSvg(k, got)}<b>${KIND_NAMES[k]}</b><small>${text}</small></article>`;
    }).join('')
  );
}
