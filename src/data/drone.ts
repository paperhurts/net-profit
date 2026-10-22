/**
 * The drone, the owner's (2026-10-21, after a short of a man fishing with a drone): bought on island 11, flown through
 * its jungle (entities/droneflight.ts), in a colour of your own, and, to come, to hang bug traps along the way and to
 * fish with. Here: what it costs, and its colours to pick from, by name.
 */

/** Coins for the drone at island 11's shop. */
export const DRONE_PRICE = 3000;
/** Coins for each ring flown through. */
export const RING_COINS = 10;

/** Its colours, the save keeping the one picked as an index into these. */
export const DRONE_COLOURS = [
  ['Red', '#E4572E'],
  ['Orange', '#F28C28'],
  ['Yellow', '#F2C230'],
  ['Green', '#3FB37A'],
  ['Blue', '#3E7BC4'],
  ['Purple', '#8A5CC8'],
  ['Pink', '#F27BB0'],
  ['White', '#F2F4F5'],
  ['Black', '#2A2D33'],
] as const;

/** Bug traps, part two: the spots along the course where they hang, how many the drone carries, and what one fills
 * with by the next day. Jewel beetles are what the big jungle fish love. */
export const TRAP_SPOTS = 5;
export const DRONE_TRAPS = 3;
export const BEETLES_PER_TRAP = 3;
export const BEETLES_MAX = 99;

/** Its upgrades, part four, at Caterman's: four of them, each two levels up from what the drone comes with, the
 * first level 1,500 and the second 3,000. */
export type DroneUpgrade = 'battery' | 'handling' | 'traps' | 'line';
export const UPGRADE_KINDS: readonly DroneUpgrade[] = ['battery', 'handling', 'traps', 'line'];
export const UPGRADE_MAX = 2;
export const UPGRADE_PRICE: readonly number[] = [1500, 3000];
export const DRONE_UPGRADES: Readonly<
  Record<DroneUpgrade, { name: string; blurbs: readonly string[] }>
> = {
  battery: {
    name: 'Bigger battery',
    blurbs: [
      '130 charge: further before it has to fly home.',
      '160 charge: right through the jungle with plenty to spare.',
    ],
  },
  handling: {
    name: 'Faster rotors',
    blurbs: ['It turns, climbs and dives quicker.', 'Quickest of all: it darts round the trees.'],
  },
  traps: {
    name: 'Another trap',
    blurbs: ['4 bug traps aboard.', '5 bug traps: one for every flower.'],
  },
  line: {
    name: 'Longer line',
    blurbs: [
      'The beetle swings wider, to reach a fish further off.',
      'Longest of all: hard to miss a rise.',
    ],
  },
};
/** What each level gives: the battery's charge, how it handles, the traps it carries, how far its beetle reaches. */
export const BATTERY_LV: readonly number[] = [100, 130, 160];
export const HANDLING_LV: readonly { agility: number; side: number; climb: number }[] = [
  { agility: 6, side: 7, climb: 5 },
  { agility: 8, side: 8.5, climb: 6 },
  { agility: 10, side: 10, climb: 7 },
];
export const TRAPS_LV: readonly number[] = [DRONE_TRAPS, 4, TRAP_SPOTS];
export const LINE_LV: readonly number[] = [2, 2.6, 3.2];
