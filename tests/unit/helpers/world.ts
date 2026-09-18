import { rng } from '../../../src/core/math';
import type { World } from '../../../src/entities/entity';
import { IX, IY } from '../../../src/world/island';

/**
 * A game world at rest for entity tests: under way, well east of the island,
 * empty hold, the lowest net trailing still behind the boat. Override what a
 * test cares about.
 */
export const baseWorld = (over: Partial<World> = {}): World => ({
  T: 0,
  started: true,
  docked: false,
  boat: { x: IX + 1500, y: IY, h: 0, v: 0 },
  rng: rng(1),
  earned: 0,
  holdTotal: 0,
  hullScale: 1,
  net: { x: IX + 1450, y: IY, speed: 0, torn: 0 },
  netWidth: 52,
  netLevel: 0,
  holdCap: 12,
  escorted: false,
  range: 1150,
  tier: 0,
  netFouled: false,
  ...over,
});
