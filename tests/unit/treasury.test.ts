import { describe, expect, it } from 'vitest';
import {
  type Finds,
  HEAP_R,
  HEAP_REACH,
  ISLE6_CHESTS,
  TREASURES,
  treasureStory,
  treasuresFound,
} from '../../src/data/treasury';
import { STAND_REACH, STAND_RING } from '../../src/data/trophies';
import { drawTreasureHeap } from '../../src/render/treasury';
import { ICE_LOOT_ALL } from '../../src/world/icedive';
import { CHESTS6 } from '../../src/world/isle6';
import { LOOT_ALL, LOOT_ONCE } from '../../src/world/loot';
import { entry, HALL_B, STEP, stairs } from '../../src/world/tower';
import { fakeView } from './helpers/view';

const none: Finds = { trenchLoot: 0, iceLoot: 0, wreckChest: false, chests6: 0 };
const all: Finds = {
  trenchLoot: LOOT_ALL,
  iceLoot: ICE_LOOT_ALL,
  wreckChest: true,
  chests6: (1 << ISLE6_CHESTS) - 1,
};

describe('your treasure', () => {
  it('counts every treasure found once: the trench, the ice, the wreck and island 6', () => {
    expect(ISLE6_CHESTS).toBe(CHESTS6.length);
    expect(TREASURES).toHaveLength(LOOT_ONCE + 5 + 1 + ISLE6_CHESTS);
    expect(treasuresFound(none).filter(Boolean)).toHaveLength(0);
    expect(treasuresFound(all).every(Boolean)).toBe(true);
    // The giant clam's pearl comes back every day: it is not on the heap.
    expect(TREASURES.some((t) => t.kind === 'clam')).toBe(false);
    const wreck = treasuresFound({ ...none, wreckChest: true });
    expect(wreck.filter(Boolean)).toHaveLength(1);
    expect(TREASURES[wreck.indexOf(true)]?.where).toBe('wreck');
  });

  it("says what's on the heap and what is still out there", () => {
    expect(treasureStory(none)).toMatch(/^A stone dais for your treasure, empty/);
    expect(treasureStory(all)).toMatch(/^All 17 treasures/);
    const some = treasureStory({ ...none, wreckChest: true, chests6: 0b111 });
    expect(some).toContain('4 of 17');
    expect(some).toContain('3 from the chests on island 6');
    expect(some).toContain('5 from the trench');
    expect(some).not.toContain('wreck');
  });

  it('stands in the middle of the trophy hall, inside its stands, out of the way in and the way up', () => {
    const st = stairs(HALL_B);
    const way = entry(HALL_B);
    const hall = { x: (st.x + way.x) / 2, y: (st.y + way.y) / 2 };
    expect(Math.hypot(st.x - hall.x, st.y - hall.y)).toBeGreaterThan(HEAP_REACH + STEP + 6 - 20);
    expect(Math.hypot(way.x - hall.x, way.y - hall.y)).toBeGreaterThan(HEAP_REACH);
    expect(STAND_RING - STAND_REACH).toBeGreaterThan(HEAP_REACH);
    expect(HEAP_REACH).toBeGreaterThan(HEAP_R);
  });

  it('draws a bare dais with nothing found, and gold and treasures piling up as they are', () => {
    const bare = fakeView();
    drawTreasureHeap(bare.v, 0, 0, treasuresFound(none));
    expect(bare.calls.box).toBe(1);
    expect(bare.calls.star ?? 0).toBe(0);
    const few = fakeView();
    drawTreasureHeap(few.v, 0, 0, treasuresFound({ ...none, wreckChest: true }));
    const full = fakeView();
    drawTreasureHeap(full.v, 0, 0, treasuresFound(all));
    expect(few.calls.star).toBe(1);
    expect(full.calls.star).toBe(3);
    expect((full.calls.fill ?? 0) + (full.calls.fillRect ?? 0)).toBeGreaterThan(
      (few.calls.fill ?? 0) + (few.calls.fillRect ?? 0) + 20,
    );
  });
});
