/**
 * The Garden Isle's rules and its part of the save (world/garden.ts lays the island out). Its first piece is only the
 * place, so all it keeps is whether the island has been sighted. Later pieces add the beds, the basket, the seed stall's
 * stock and the gear here, each an optional field, so every save made before them still loads.
 */

/** The garden's part of the save. */
export type Garden = {
  /** The Garden Isle has been sighted, in the far deep's left corner. */
  seen: boolean;
};

/** A game that has never been near it. */
export function noGarden(): Garden {
  return { seen: false };
}

/** Whatever was found under the save's garden key, made sensible: anything missing or odd reads as not yet. */
export function parseGarden(raw: unknown): Garden {
  const g = noGarden();
  if (!raw || typeof raw !== 'object') return g;
  const k = raw as Record<string, unknown>;
  g.seen = k.seen === true;
  return g;
}

/** Nothing about it worth keeping yet, so the save can leave it out and the copy-my-game link stays short. */
export function untouchedGarden(g: Garden): boolean {
  return !g.seen;
}
