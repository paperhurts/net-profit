/**
 * Your treasure at your headquarters, the last of the kid's "all" (what you keep there). In the middle of the trophy
 * hall, inside the ring of stands, a heap of gold on a round stone dais, and on it every treasure you have found that
 * is found once: the trench's spyglass, crown, bell, gem and chest, the five things chipped out of the ice under the
 * floe, the chest in the wreck off island 5, and island 6's six chests. The heap grows as they come; nothing is
 * spent, the coins they were worth are yours as ever. Too big to walk through.
 */

import { ICE_LOOT, iceTaken } from '../world/icedive';
import { CLAM, type LootKind, TRENCH_LOOT, taken } from '../world/loot';

export type TreasurePlace = 'trench' | 'ice' | 'wreck' | 'isle6';

export interface Treasure {
  kind: LootKind;
  where: TreasurePlace;
}

/** Island 6's chests, as many as stand on it. */
export const ISLE6_CHESTS = 6;

/** Every treasure found once, in the order they are laid on the heap: the chests first, at its foot. */
export const TREASURES: readonly Treasure[] = [
  ...TRENCH_LOOT.filter((_, i) => i !== CLAM).map((l) => ({
    kind: l.kind,
    where: 'trench' as const,
  })),
  ...ICE_LOOT.map((l) => ({ kind: l.kind, where: 'ice' as const })),
  { kind: 'chest', where: 'wreck' },
  ...Array.from({ length: ISLE6_CHESTS }, () => ({
    kind: 'chest' as const,
    where: 'isle6' as const,
  })),
];

/** What has been found, as the save has it. */
export interface Finds {
  trenchLoot: number;
  iceLoot: number;
  wreckChest: boolean;
  chests6: number;
}

/** Each treasure, found or not, in TREASURES' order. */
export function treasuresFound(f: Finds): boolean[] {
  const out: boolean[] = [];
  TRENCH_LOOT.forEach((_, i) => {
    if (i !== CLAM) out.push(taken(f.trenchLoot, i));
  });
  ICE_LOOT.forEach((_, i) => {
    out.push(iceTaken(f.iceLoot, i));
  });
  out.push(f.wreckChest);
  for (let i = 0; i < ISLE6_CHESTS; i++) out.push((f.chests6 & (1 << i)) !== 0);
  return out;
}

const PLACES: Readonly<Record<TreasurePlace, string>> = {
  trench: 'the trench',
  ice: 'under the ice',
  wreck: 'the wreck off island 5',
  isle6: 'the chests on island 6',
};

/** Looked at: how much there is, from where, and what is still out there. */
export function treasureStory(f: Finds): string {
  const got = treasuresFound(f);
  const n = got.filter(Boolean).length;
  if (!n)
    return 'A stone dais for your treasure, empty for now. Treasure is out there: in the trench, under the ice, in the wreck off island 5, and in chests on island 6.';
  const left = (Object.keys(PLACES) as TreasurePlace[])
    .map((p) => {
      const m = TREASURES.filter((t, i) => t.where === p && !got[i]).length;
      return m ? `${m} ${p === 'wreck' ? 'in' : 'from'} ${PLACES[p]}` : '';
    })
    .filter(Boolean);
  return n === TREASURES.length
    ? `All ${n} treasures, every one there is! Spyglasses, crowns, bells, gems and chests, piled up on your gold.`
    : `Your treasure: ${n} of ${TREASURES.length}, piled on your gold. Still out there: ${left.join(', ')}.`;
}

/** The heap, in the middle of the trophy hall: how wide its dais is (too big to walk through), how near to look. */
export const HEAP_R = 24;
export const HEAP_REACH = HEAP_R + 22;
