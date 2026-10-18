/**
 * Your headquarters' upgrades, the kid's (his answers, 2026-10-17: "a dock, a forge, a bigger tower, a garden: all of
 * them"), with the owner's calls (2026-10-18): 2,000 to 10,000 each, a full hold of abyss fish selling for about
 * 10,000, and what each does. The garden grows a free snack a day; the dock is a landing on the sea by island 7, to
 * sail straight to Gigantis; the forge sharpens the spear and the knife for good, each hitting one harder, and makes
 * the harpoon fire faster (the owner's call: +1 on the harpoon would halve every sea fight); the bigger tower shows
 * the fish schools on the sea map. Each is built from the castle's plans, on a table in the courtyard. An upgrade not
 * built into the game yet shows on the plans as coming.
 */

import { ISLE7 } from '../world/isle7';

export type HqKind = 'garden' | 'dock' | 'forge' | 'tower';
export const HQ_KINDS: readonly HqKind[] = ['garden', 'dock', 'forge', 'tower'];

export type HqSpec = {
  name: string;
  price: number;
  blurb: string;
  /** Whether it is in the game yet: one that is not shows on the plans as coming. */
  ready: boolean;
};

export const HQ: Readonly<Record<HqKind, HqSpec>> = {
  garden: {
    name: 'Garden',
    price: 2000,
    blurb:
      'An apple tree, carrots and bananas in the courtyard. Pick one snack free every day: an apple for speed, a carrot for power, a banana for hearts.',
    ready: true,
  },
  dock: {
    name: 'Dock',
    price: 4000,
    blurb:
      'A castle landing on the sea by island 7, on your map: sail straight up to it and go in through its gate, no portal needed.',
    ready: true,
  },
  forge: {
    name: 'Forge',
    price: 6000,
    blurb:
      'A smithy in the courtyard. Sharpen your weapons there once and for good: your spear and your knife each hit one harder, and your harpoon fires faster.',
    ready: true,
  },
  tower: {
    name: 'Bigger tower',
    price: 10000,
    blurb:
      'A tall lookout tower on the castle wall. Climb it and see the whole sea: from then on your map shows every fish school, each in its own colour.',
    ready: true,
  },
};

export type HqBuilt = Record<HqKind, boolean>;

export function noHq(): HqBuilt {
  return { garden: false, dock: false, forge: false, tower: false };
}

/** What has been built, from the save: anything not plainly true is not built. */
export function parseHq(o: unknown): HqBuilt {
  const out = noHq();
  if (o && typeof o === 'object')
    for (const k of HQ_KINDS) out[k] = (o as Record<string, unknown>)[k] === true;
  return out;
}

/** Where things stand in the courtyard, from its middle: the plans' table, near the way in, and the garden's three
 * plants in its front-left corner, clear of the flagpole, the telescope, the stairs and the portal. */
export const PLANS_AT = { dx: -10, dy: 100 } as const;
export const PLANS_REACH = 34;
export const GARDEN_AT = {
  apple: { dx: -112, dy: 50 },
  carrot: { dx: -74, dy: 106 },
  banana: { dx: -138, dy: -10 },
} as const;
export const PICK_REACH = 30;
/** The forge, in the courtyard's front-right corner, and how near to work at it. */
export const FORGE_AT = { dx: 115, dy: 75 } as const;
export const FORGE_REACH = 38;

/**
 * The bigger tower: on the courtyard's back wall, between the way up into the castle and the portal (clear of the
 * portal's ring on the screen), its foot just outside the floor; its door on the courtyard side, far enough from the
 * stairs that each is used on its own.
 */
export const BIG_TOWER_AT = { dx: -89, dy: -154 } as const;
export const BIG_TOWER_DOOR = { dx: -75, dy: -130 } as const;
export const BIG_TOWER_REACH = 22;

/**
 * The dock: Gigantis's landing on the sea, off island 7's north-east, clear of its sand and its dock, and on the sea
 * map beside the island rather than on its name. The quay it stands on is LANDING_R across, a hull is kept off it,
 * and a boat stopped within LANDING_REACH of its middle (all but still, slower than LANDING_STOP) can go in through
 * the gate.
 */
export const CASTLE_LANDING = { x: ISLE7.x + 560, y: ISLE7.y - 480 } as const;
export const LANDING_R = 62;
export const LANDING_REACH = 190;
export const LANDING_STOP = 25;

/** Sharpened at the forge: how much harder the spear and the knife hit, and the harpoon's reload, faster than its
 * own (data/harpoon.ts HARPOON_RELOAD, 1.2 s). */
export const SHARP_POWER = 1;
export const SHARP_RELOAD = 0.8;

/** A blow's power, sharpened or not. */
export function sharpened(power: number, sharp: boolean): number {
  return sharp ? power + SHARP_POWER : power;
}

/** Whether today's snack is still on the garden's plants, given the day one was last picked. */
export function gardenReady(gardenDay: number, day: number): boolean {
  return day > gardenDay;
}
