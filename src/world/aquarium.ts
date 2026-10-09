/**
 * The aquarium, the kid's: "aquariums you can build ... and a way to play with
 * your fish". Once the tree platform is up, a plot is staked out on the sand
 * south of the palace tree with a sign on it; the shop sells the building for
 * driftwood and coins, and then a glass tank stands there on a wooden base,
 * with a fish of every kind you have caught swimming in it. Walk up to it and
 * look in: the game waits while you feed them and play.
 */
import { IX, IY } from './island';

/** The plot, and the tank's footprint on it: its +x and +y faces look at the viewer. */
export const AQUARIUM = { x0: IX - 106, y0: IY + 112, x1: IX - 64, y1: IY + 140 } as const;
/** How tall the glass stands, over its base. */
export const AQUARIUM_BASE = 6;
export const AQUARIUM_TOP = 28;
/** The palace stage that stakes out the plot: the tree platform, when the dog comes. */
export const AQUARIUM_FROM = 1;
export const AQUARIUM_COST = { wood: 25, coins: 1000 } as const;
/** How near the figure must stand to its glass to look in. */
export const AQUARIUM_REACH = 20;

/** The middle of the plot, for where the game says "built" and how it sorts. */
export const AQUARIUM_MID = {
  x: (AQUARIUM.x0 + AQUARIUM.x1) / 2,
  y: (AQUARIUM.y0 + AQUARIUM.y1) / 2,
} as const;

/** Whether a figure here is near enough the glass to look in. */
export function nearAquarium(x: number, y: number): boolean {
  const { x0, y0, x1, y1 } = AQUARIUM;
  return Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)) < AQUARIUM_REACH;
}
