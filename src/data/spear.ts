/**
 * The spear: a fishing tool first, bought from the shipwright in levels. Ashore
 * on island 2, the parrotfish nose along the shore within a throw of the sand,
 * and a spear takes them straight into the hold. Later levels reach further,
 * throw faster and hit harder, which matters once the monkeys arrive. The last
 * is the harpoon, fired from the boat at the leviathans (data/harpoon.ts);
 * ashore it throws a touch further and faster than the barbed spear.
 */

export type SpearLevel = {
  name: string;
  /** What it does, for the shop card. */
  blurb: string;
  /** The toast when it is bought. */
  bought: string;
  cost: number;
  /** How far it is thrown, world units; seconds before the next throw; how hard it hits. */
  range: number;
  reload: number;
  power: number;
};

export const SPEARS: readonly SpearLevel[] = [
  {
    name: 'Fishing spear',
    blurb: 'Spear parrotfish from the sand of island 2.',
    bought: 'A fishing spear. Go ashore on island 2 and spear the parrotfish in the shallows.',
    cost: 500,
    range: 95,
    reload: 0.9,
    power: 1,
  },
  {
    name: 'Long spear',
    blurb: 'Throws further and faster.',
    bought: 'A long spear. It throws further and faster.',
    cost: 1500,
    range: 125,
    reload: 0.7,
    power: 1,
  },
  {
    name: 'Barbed spear',
    blurb: 'Hits twice as hard.',
    bought: 'A barbed spear. It hits twice as hard.',
    cost: 3500,
    range: 150,
    reload: 0.55,
    power: 2,
  },
  {
    name: 'Harpoon',
    blurb: 'Mounted on the bow: drive off a leviathan.',
    bought:
      'A harpoon on the bow. Past the buoys, when a leviathan comes up near you, fire it: hit one enough and it is driven off.',
    cost: 6000,
    range: 160,
    reload: 0.5,
    power: 2,
  },
];

/** The best spear there is, as a level: levels run 0 (none) to this. */
export const SPEAR_MAX = SPEARS.length;

/** The spear you have at a level, or null with none. */
export function spearAt(level: number): SpearLevel | null {
  return level > 0 ? (SPEARS[Math.min(level, SPEAR_MAX) - 1] ?? null) : null;
}

/** The next spear the shipwright sells, or null once you have the best. */
export function nextSpear(level: number): SpearLevel | null {
  return SPEARS[level] ?? null;
}
