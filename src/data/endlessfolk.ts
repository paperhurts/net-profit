/**
 * The Endless Isle's folk, the kid's: the pirates' captain and the ninjas' master on their piers, and the minion each
 * side gives you for joining it. The kid named them all (2026-10-23, his tab "doom island for rowan"): the parrot is
 * Jacks Parrow, the ninja-bun Bun-San, the captain Captain Cappy and the master Master Sensei. Why do the two sides
 * fight? The kid: "to stimulate the economy".
 *
 * Jacks Parrow's lines are the owner's ("a parrot minion that yells expletive deleted!! and other funny censored
 * pirate puns"), passed by her as the plan listed them (2026-10-23). Every rude word is bleeped, and half the joke is
 * that ordinary words get bleeped too; none has real swear letters under the bleep. In a line, {B} is a word bleeped
 * (a black bar with BLEEP on it, and the bleep's tone) and {#} a word sworn (a red bar of symbols).
 */

import type { Side } from '../world/endless';

export const MINION_NAME: Readonly<Record<Side, string>> = {
  pirate: 'Jacks Parrow',
  ninja: 'Bun-San',
};

/** The leaders, the kid's names for them. */
export const LEADER_NAME: Readonly<Record<Side, string>> = {
  pirate: 'Captain Cappy',
  ninja: 'Master Sensei',
};

/** Jacks Parrow's lines. The first is what he squawks the moment he lands on your shoulder. */
export const PARROT_LINES: readonly string[] = [
  'EXPLETIVE DELETED!',
  'Pieces of {#}! Pieces of {#}!',
  'Shiver me {B}-ing timbers!',
  'Batten down the {B}es!',
  'Yo ho ho and a bottle of {B}!',
  'Polly wants a {#} cracker!',
  'Walk the {B}! The plank! Walk the plank!',
];
export type Squawk = string;

/** The symbols a sworn word is drawn with. */
export const GRAWLIX = '@#$%!';

export type SquawkPart = { kind: 'text' | 'bleep' | 'swear'; text: string };

/** A line in parts, to draw: plain words, bleeps and swears in order. */
export function squawkParts(line: Squawk): SquawkPart[] {
  const out: SquawkPart[] = [];
  const re = /\{([B#])\}/g;
  let at = 0;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (m.index > at) out.push({ kind: 'text', text: line.slice(at, m.index) });
    out.push(m[1] === 'B' ? { kind: 'bleep', text: 'BLEEP' } : { kind: 'swear', text: GRAWLIX });
    at = m.index + m[0].length;
  }
  if (at < line.length) out.push({ kind: 'text', text: line.slice(at) });
  return out;
}

/** How many bleeps and swears a line has: one bleep's tone for each. */
export function bleepsIn(line: Squawk): number {
  return squawkParts(line).filter((p) => p.kind !== 'text').length;
}

/** The next line, never the one just said, from a random number in 0..1. */
export function nextLine(last: number, r: number): number {
  const n = PARROT_LINES.length;
  const i = Math.floor(r * (n - 1));
  return i >= last ? i + 1 : i;
}

/** Seconds a line stays up over him, and how long he keeps quiet between lines of his own. */
export const SQUAWK_T = 3.2;
export const CHATTER = [70, 140] as const;

/**
 * What each leader says when you walk up: before you have joined anyone, when you have joined the other side (you can
 * fight for both, the kid's), and once you are one of theirs; and why they fight.
 */
export const LEADER_SAYS: Readonly<
  Record<Side, { hello: string; rival: string; joined: string; why: string }>
> = {
  pirate: {
    hello:
      "Arr! Ye've come to the Endless Isle. I'm Captain Cappy, and those sneaky ninjas over the water have been at war with us for a hundred years. Sign the articles and ye're a pirate! I'll even throw in me parrot.",
    rival:
      "A ninja, are ye? Arr, no matter: plenty fight for both sides. Gold is gold! Sign the articles and ye can be a pirate as well. I'll even throw in me parrot.",
    joined:
      "Ye're one of us now, matey. Ready for a battle? We steal their flag from their fort and carry it home to ours, and they try to do the same to us. First to three! Keep Jacks Parrow fed. And don't listen to his language.",
    why: 'Why are we fighting? To stimulate the economy, of course! War is expensive. Somebody has to buy all these cannonballs.',
  },
  ninja: {
    hello:
      'Welcome, traveller. I am Master Sensei. The pirates over the water have been at war with us for a hundred years. Bow, and you will be one of us. Bun-San will go with you. He is small, but he is very serious.',
    rival:
      'You are a pirate. It does not matter: many fight for both sides. Bow, and you will be a ninja as well. Bun-San will go with you.',
    joined:
      'You are a ninja now. Ready for battle? We take their flag from their fort and bring it home to ours, silently, while they try the same. First to three. Bun-San is with you. He does not talk. He does not need to.',
    why: 'Why do we fight? To stimulate the economy. Throwing stars do not buy themselves.',
  },
};

/** What each leader says as you pick your place in his crew for a battle. */
export const LEADER_PICK: Readonly<Record<Side, string>> = {
  pirate:
    'Pick yer post, matey. A crew needs a quartermaster to take the knocks, a cook to patch us up, and swashbucklers to grab that flag.',
  ninja: 'Choose your path. A stone guard stands firm, a monk mends, and a shadow strikes.',
};

/** What each leader says after a battle fought for his side: won, drawn or lost. */
export const LEADER_AFTER: Readonly<Record<Side, { win: string; draw: string; loss: string }>> = {
  pirate: {
    win: "Ha! Did ye see them run? That's how pirates do it. Here's yer share of the gold.",
    draw: "A draw! Nobody wins, nobody loses, and everybody buys more cannonballs. Here's yer share.",
    loss: "Blast those ninjas! We'll get 'em next time. Here's a bit for yer trouble.",
  },
  ninja: {
    win: 'A fine battle. The pirates will talk about it for a week, loudly. Your share.',
    draw: 'A draw. Balance. I am pleased, a little. Your share.',
    loss: 'We lost. A ninja learns more from losing than from winning. Here is something for your trouble.',
  },
};
