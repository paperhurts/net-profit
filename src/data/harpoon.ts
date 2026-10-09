/**
 * The harpoon: the spear's top level, mounted on the bow, and the kid's way to
 * beat a leviathan. Out past the buoys, when one of the four is up and near,
 * the throw button fires a harpoon on a line from the bow and it always lands.
 * Every leviathan has a resolve; harpoon it down to none and it is driven off
 * (never killed): it goes away for a good while and leaves a trophy behind.
 * Ashore the harpoon level throws as a spear, a touch better than the barbed one.
 */

/** The spear level the harpoon is. */
export const HARPOON_LEVEL = 4;
/** How far it reaches from the bow, seconds before the next, and how hard it hits. */
export const HARPOON_RANGE = 360;
export const HARPOON_RELOAD = 1.2;
export const HARPOON_POWER = 1;
/** Seconds a leviathan driven off stays away. */
export const AWAY = 120;
/** Coins the first time each is driven off, and every time after. */
export const DRIVE_PRIZE = 1000;
export const DRIVE_AGAIN = 200;

export const BEASTS = ['guard', 'cthulu', 'angler', 'gulper'] as const;
export type Beast = (typeof BEASTS)[number];

/** Harpoon hits to drive each one off. */
export const RESOLVE: Record<Beast, number> = { guard: 3, cthulu: 3, angler: 3, gulper: 4 };

/** What each leaves behind, and what the game says when it goes. */
export const TROPHY: Record<Beast, { name: string; told: string }> = {
  guard: {
    name: 'Leviathan spine',
    told: 'You drove the leviathan off! It sinks away from the buoys and leaves a spine behind.',
  },
  cthulu: {
    name: 'Jar of ink',
    told: 'You drove the Cthuluviathan off! It sinks into its city in a cloud of ink, and you scoop up a jar.',
  },
  angler: {
    name: 'Anglerfish lure',
    told: 'You drove the anglerfish off! Its light goes out, and its lure floats up.',
  },
  gulper: {
    name: 'Gulper tooth',
    told: 'You drove the gulper off! It dives for the dark and leaves a tooth in your harpoon.',
  },
};

/** How many times each has been driven off. */
export type Driven = Record<Beast, number>;

export function noDriven(): Driven {
  return { guard: 0, cthulu: 0, angler: 0, gulper: 0 };
}

/** The counts from a save, each missing or broken one read as none. */
export function parseDriven(o: unknown): Driven {
  const d = noDriven();
  if (!o || typeof o !== 'object') return d;
  const r = o as Record<string, unknown>;
  for (const k of BEASTS) {
    const v = r[k];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) d[k] = Math.floor(v);
  }
  return d;
}

/** What driving one off pays: the first time, and then less. */
export function drivePrize(times: number): number {
  return times > 0 ? DRIVE_AGAIN : DRIVE_PRIZE;
}
