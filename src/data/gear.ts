/**
 * The shipwright's shelf: one-off gear for the boat, bought with coins once
 * the boat is a cutter. Each piece is the buyable counter to something with
 * teeth, which is the only kind of teeth the game allows itself: the fine
 * mesh lets jellyfish slip through the net, and the strongbox keeps half of
 * what the pirate would have taken. It is also where late coins go; before
 * it, a finished palace and a flagship left nothing to spend on.
 */

export type GearId = 'mesh' | 'strongbox';

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
};

/** The shelf, in the order it is shown. */
export const GEAR_IDS: readonly GearId[] = ['mesh', 'strongbox'];

/** The shipwright takes an interest once the boat is this tier: a cutter. */
export const SHIPWRIGHT_TIER = 2;

/** What the pirate takes of the hold, without and with the strongbox. */
export const STEAL_SHARE = 0.5;
export const STRONGBOX_SHARE = 0.25;

export type Owned = Record<GearId, boolean>;

export function noGear(): Owned {
  return { mesh: false, strongbox: false };
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
