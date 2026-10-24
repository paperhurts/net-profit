/**
 * The pet house, the pet system's fifth piece and the owner's call for boarding (2026-10-24): a little house on the
 * home island where every pet of your own that is not walking with you lives, playing in its yard, where you can visit
 * them. Once the tree platform is up, a plot is staked out on the grass to the hut's left as you look at it, where
 * the hut does not hide it, with a sign on it, as the aquarium's is; the shop sells the house for driftwood and coins.
 * When it opens, its keeper gives you an egg. Nothing in it gets hungry or sad: pets here only ever get better while you are away (training, next).
 */
import { IX, IY } from './island';

/** The house's footprint on its plot: its +x and +y faces look at the viewer. */
export const PET_HOUSE = { x0: IX - 96, y0: IY - 106, x1: IX - 62, y1: IY - 80 } as const;
/** How tall its walls stand, and its roof's ridge. */
export const PET_HOUSE_WALL = 16;
export const PET_HOUSE_RIDGE = 30;
/** The palace stage that stakes out the plot: the tree platform, when the dog comes. */
export const PET_HOUSE_FROM = 1;
export const PET_HOUSE_COST = { wood: 30, coins: 1500 } as const;
/** How near the figure must stand to the house to visit. */
export const PET_HOUSE_REACH = 22;
/** The yard in front of it where the pets play: its middle, and how far they roam. */
export const PET_YARD = { x: IX - 44, y: IY - 48, r: 36 } as const;
/** The ring where pet battles are fought (entities/petfight.ts): its middle, on open grass clear of the house. */
export const PET_RING = { x: IX + 66, y: IY + 30 } as const;
/** How much closer the view comes for a pet battle. */
export const RING_ZOOM = 0.6;
/** How far up the screen the ring is lifted, as a share of its height, clear of the buttons below. */
export const RING_LIFT = 0.2;
/** The most pets drawn playing in the yard at once. */
export const YARD_MAX = 6;

/** The middle of the plot, for where the game says "built" and how it sorts. */
export const PET_HOUSE_MID = {
  x: (PET_HOUSE.x0 + PET_HOUSE.x1) / 2,
  y: (PET_HOUSE.y0 + PET_HOUSE.y1) / 2,
} as const;

/** Whether a figure here is near enough the house to visit. */
export function nearPetHouse(x: number, y: number): boolean {
  const { x0, y0, x1, y1 } = PET_HOUSE;
  return Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)) < PET_HOUSE_REACH;
}

/**
 * Where the i-th of n pets in the yard is at time t, and which way it is going: spaced evenly round the yard and going
 * slowly round it together, each drifting in and out on its own, so they never bunch up or need a mind of their own,
 * and the same time always finds them in the same places.
 */
export function yardSpot(
  i: number,
  n: number,
  t: number,
): { x: number; y: number; h: number; walk: number } {
  const a = t * 0.12 + (i * Math.PI * 2) / Math.max(1, n);
  const r = PET_YARD.r * (0.6 + 0.3 * Math.sin(t * 0.35 + i * 1.9));
  const x = PET_YARD.x + Math.cos(a) * r;
  const y = PET_YARD.y + Math.sin(a) * r;
  // Now and then one stops to look about.
  const walk = Math.sin(t * 0.4 + i * 3.1) > -0.6 ? 1 : 0;
  return { x, y, h: a + Math.PI / 2, walk };
}
