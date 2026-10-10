/**
 * The shipwright's shelf: one-off gear for the boat, bought with coins once
 * the boat is a cutter. Each piece is the buyable counter to something with
 * teeth, which is the only kind of teeth the game allows itself: the fine
 * mesh lets jellyfish slip through the net, and the strongbox keeps half of
 * what the pirate would have taken. It is also where late coins go; before
 * it, a finished palace and a flagship left nothing to spend on. The chemistry
 * suit is the one piece for the figure, not the boat: the kid's way into the
 * tar round island 4, kept back until the tar has been seen. The mending kit is
 * the answer to the kid's lionfish, whose spines cut the net: kept back until
 * a lionfish has been seen, it mends a cut net at sea; the fishing rod
 * catches them for a bounty; and the lionfish net, the kid's way to clear
 * them out, sweeps them up without being cut. The big air tank is for the
 * diver in the trench: kept back until the scuba gear has been found, it holds
 * more air, so a dive goes deeper and longer and takes more bites.
 */

export type GearId = 'mesh' | 'strongbox' | 'suit' | 'kit' | 'rod' | 'lionnet' | 'tank';

export type Gear = {
  name: string;
  /** What it does, for the card. */
  blurb: string;
  /** The toast when it is fitted. */
  fitted: string;
  cost: number;
};

export const GEAR: Readonly<Record<GearId, Gear>> = {
  mesh: {
    name: 'Fine mesh',
    blurb: 'Jellyfish slip through the net.',
    fitted: 'Fine mesh fitted. Jellyfish slip through your net now.',
    cost: 4000,
  },
  strongbox: {
    name: 'Strongbox',
    blurb: 'Pirates take a quarter of the hold, not half.',
    fitted: 'Strongbox fitted. Pirates will only get a quarter of the hold.',
    cost: 6000,
  },
  suit: {
    name: 'Chemistry suit',
    blurb: 'Walk and swim in tar.',
    fitted:
      'A chemistry suit. Sail up to the tar round island 4, stop at its edge, and tap Into the tar.',
    cost: 5000,
  },
  kit: {
    name: 'Mending kit',
    blurb: 'Mend a cut net at sea.',
    fitted: 'A mending kit. When lionfish cut your net, stop the boat and tap Mend the net.',
    cost: 1500,
  },
  rod: {
    name: 'Fishing rod',
    blurb: 'Catch lionfish on a line.',
    fitted:
      'A fishing rod. Stop near some lionfish and tap Cast for lionfish; reel in when the float goes under.',
    cost: 800,
  },
  lionnet: {
    name: 'Lionfish net',
    blurb: 'Their spines cannot cut it, and it sweeps them up for the bounty.',
    fitted:
      'A lionfish net, with a guard their spines cannot cut. Tow it through them and each one pays the bounty.',
    cost: 4500,
  },
  tank: {
    name: 'Big air tank',
    blurb: 'More air for diving: longer, deeper dives.',
    fitted:
      'A big air tank. Your dives last longer now: watch the air bubbles, there are more of them.',
    cost: 3500,
  },
};

/** The shelf, in the order it is shown. */
export const GEAR_IDS: readonly GearId[] = [
  'mesh',
  'strongbox',
  'kit',
  'rod',
  'lionnet',
  'suit',
  'tank',
];

/** The shipwright takes an interest once the boat is this tier: a cutter. */
export const SHIPWRIGHT_TIER = 2;

/** What the pirate takes of the hold, without and with the strongbox. */
export const STEAL_SHARE = 0.5;
export const STRONGBOX_SHARE = 0.25;

export type Owned = Record<GearId, boolean>;

export function noGear(): Owned {
  return {
    mesh: false,
    strongbox: false,
    suit: false,
    kit: false,
    rod: false,
    lionnet: false,
    tank: false,
  };
}

export function shipwrightOpen(tier: number): boolean {
  return tier >= SHIPWRIGHT_TIER;
}

/** Why a piece cannot be bought right now, or null if it can. */
export function refusal(id: GearId, owned: Owned, coins: number): 'fitted' | 'coins' | null {
  if (owned[id]) return 'fitted';
  return coins < GEAR[id].cost ? 'coins' : null;
}

export function stealShare(owned: Owned): number {
  return owned.strongbox ? STRONGBOX_SHARE : STEAL_SHARE;
}
