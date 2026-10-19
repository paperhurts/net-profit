/**
 * The orb on the metal bridge's roof, the kid's (his answers: it is island 9's orb, and "putting your hand in it shows
 * you knowledge, of the boats and the past and more"). Put your hand in and it shows three things, out of the save: the
 * boats that are yours; the past, every boss beaten in the order you met them, as its trophy tells it (data/trophies.ts);
 * and more, what is still to come: the next boss not yet beaten, and where.
 */

import { type Beaten, TROPHIES, TROPHY_KINDS } from './trophies';
import { TIER_NAME } from './tuning';

/** The boats a save has: its own (by tier), and any of the others. */
export type OrbBoats = {
  tier: number;
  /** The warlock's boat, his once he is free. */
  warlock: boolean;
  /** The flotilla's crafts that have a friend aboard: the craft's name and who sails it. */
  crafts: readonly { name: string; rider: string }[];
  /** Caterman's swan paddle boat; the chemistry boat; the treasure submarine. */
  swan: boolean;
  chem: boolean;
  sub: boolean;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The boats, one line each, your own first. */
export function orbBoats(b: OrbBoats): string[] {
  const tier = TIER_NAME[Math.max(0, Math.min(TIER_NAME.length - 1, b.tier))] ?? 'dinghy';
  const out = [
    tier === 'dinghy'
      ? 'Your dinghy, the little boat you fish from. It will grow.'
      : `Your ${tier}, the boat you fish from. It started out a little dinghy.`,
  ];
  if (b.warlock) out.push("The warlock's boat. He sails it beside yours and nets fish for you.");
  for (const c of b.crafts) out.push(`${cap(c.name)}, sailed by ${c.rider}.`);
  if (b.swan) out.push('The swan paddle boat. Caterman pedals it.');
  if (b.chem) out.push('The chemistry boat, won on your first mission. Only it can sail the tar.');
  if (b.sub)
    out.push(
      'The treasure submarine. It rides on your boat and dives for treasure in the far deep.',
    );
  return out;
}

/** The past: what each boss beaten left behind, in the order you met them; nothing yet, said so. */
export function orbPast(b: Beaten): string[] {
  const won = TROPHY_KINDS.filter((k) => TROPHIES[k].won(b)).map((k) => TROPHIES[k].story);
  return won.length ? won : ['Nothing yet. Your story is still to come.'];
}

/** And more: the next boss not yet beaten, and where; or, all of them beaten, what is still out there. */
export function orbNext(b: Beaten): string {
  const k = TROPHY_KINDS.find((t) => !TROPHIES[t].won(b));
  return k
    ? TROPHIES[k].hint
    : 'Every boss so far is beaten. Far past the white buoys, on Skull Island, someone is laughing in a tower.';
}
