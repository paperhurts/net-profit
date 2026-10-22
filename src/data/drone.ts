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
