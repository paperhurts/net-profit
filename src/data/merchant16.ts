/**
 * Tomb Island's merchant (part three), the kid's "Mean but 1 merchant" and "A man in cloak sells skull stuff info and
 * torch": the one living soul on the island, a man in a black cloak under a tattered awning on the beach by the way up
 * to the maze. He is mean: he sneers, he overcharges, he takes your coins and says no refunds. But he sells what you
 * need there: a torch for the fog, skull stuff, and what he knows (for a price).
 *
 * The prices, the torch's reach and his lines are my picks, hers to change.
 */

/** The torch: carried ashore on Tomb Island, it pushes the fog back further round you. */
export const TORCH16 = {
  name: 'Torch',
  price: 300,
  blurb: 'Pushes the fog back: on Tomb Island you see about twice as far round you.',
} as const;
/** How far round the figure is clear in the fog with the torch, against SIGHT_LAND16 without it. */
export const TORCH_SIGHT16 = 140;

/** The skull stuff: a black cloak and a bone-white skull mask, worn from Your character as an outfit. */
export const SKULL_CLOAK = {
  name: 'Skull cloak',
  price: 800,
  blurb: 'A black cloak and a bone-white skull mask. Put it on in Your character.',
} as const;

/** What he knows, one thing at a time. */
export const HINT_PRICE = 40;
export const HINT_BLURB = 'He knows things about this island. He wants paying for them.';

/** His greetings, one picked each time you walk up. */
export const SNEERS: readonly string[] = [
  'What do YOU want?',
  'Oh. A customer. How lovely. Coins first.',
  'Touch nothing you cannot pay for.',
  'You look lost. Good. Lost people buy torches.',
  "Hmph. Another fish-smelling sailor. What'll it be?",
];
/** What he says when you buy, and when you cannot pay. */
export const PAID: readonly string[] = [
  'No refunds.',
  'Pleasure doing business. For me.',
  'Heh. Sucker.',
];
export const BROKE = 'No coins, no business. Off you go.';

/**
 * What he knows, in order: each costs HINT_PRICE, and once all are told he starts again from the first (and charges
 * again, because he is mean).
 */
export const HINTS16: readonly string[] = [
  "The fog? There's a lever in the maze that clears it. Follow the green light, if you can find your way to it.",
  'The lever is at the end of the longest dead end there is. Of course it is.',
  'Those coffins in the dead ends? Leave them shut. You will thank me later. Or you will not, and I will laugh.',
  'The castle door does not open for the likes of you. Not yet.',
  'Out at sea, in the fog round this island, there are bones that swim. Big ones. Sail careful. Or do not. Your boat.',
  'Someone lives in that castle. Someone who laughs a lot. I do not ask questions, and neither should you.',
];

/** The next hint after `told` hints have been bought, and the new count. */
export function nextHint16(told: number): { line: string; told: number } {
  const i = (((Math.floor(told) || 0) % HINTS16.length) + HINTS16.length) % HINTS16.length;
  return { line: HINTS16[i] as string, told: (Math.floor(told) || 0) + 1 };
}

/** A line from a list, picked by a number that turns over. */
export function pickLine(lines: readonly string[], n: number): string {
  return lines[((Math.floor(n) % lines.length) + lines.length) % lines.length] as string;
}
