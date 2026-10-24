import { describe, expect, it } from 'vitest';
import {
  ALL_CROP_IDS,
  bedAt,
  binOf,
  CROP_IDS,
  CROPS,
  FRUIT_MAX,
  fillBin,
  fishClass,
  fruitValue,
  type Garden,
  GUARD,
  LEGEND_FISH,
  parseGarden,
  plant,
} from '../../src/data/garden';
import { ATTACK_NIBBLER, MOONKOI, REMORO, SPECIES } from '../../src/data/tuning';
import {
  binShelfHtml,
  gardenAction,
  gardenLabel,
  journalPagesHtml,
  seedTrayHtml,
} from '../../src/ui/garden';
import { BEDS, fromGarden } from '../../src/world/garden';

const T0 = 1_800_000_000_000;

describe('the starfall melon: the top crop, over a legendary fish', () => {
  it('the Remoro, the attack nibbler and the Moonkoi are the legendary fish, and the bin keeps them', () => {
    expect([...LEGEND_FISH].sort()).toEqual([REMORO, ATTACK_NIBBLER, MOONKOI].sort());
    for (const sp of LEGEND_FISH) expect(fishClass(sp)).toBe('legend');
    const hold = new Array(SPECIES.length).fill(0);
    hold[MOONKOI] = 1;
    hold[REMORO] = 1;
    const g: Garden = { seen: true, binKeep: { legend: true } };
    fillBin(g, hold);
    expect(binOf(g, 'legend')).toBe(2);
    expect(hold[MOONKOI]).toBe(0);
    expect(binShelfHtml(g)).toContain('data-keep="legend"');
  });

  it('will not sprout without a legendary fish, and takes one by itself, whatever is in hand', () => {
    const none: Garden = { seen: true, seeds: { starfall: 1 } };
    expect(plant(none, 0, 'starfall', T0)).toBe(false);
    expect(none.seeds?.starfall).toBe(1);
    const g: Garden = { seen: true, seeds: { starfall: 1 }, bin: { legend: 1, deep: 1 } };
    expect(plant(g, 0, 'starfall', T0, 'deep')).toBe(true);
    expect(bedAt(g, 0)?.fed).toBe('legend');
    expect(binOf(g, 'legend')).toBe(0);
    expect(binOf(g, 'deep')).toBe(1);
    // Nothing else takes a legendary fish, even one in hand.
    const c: Garden = { seen: true, seeds: { carrot: 1 }, bin: { legend: 1 } };
    expect(plant(c, 0, 'carrot', T0, 'legend')).toBe(true);
    expect(bedAt(c, 0)?.fed).toBeUndefined();
    expect(binOf(c, 'legend')).toBe(1);
  });

  it('says so on the button, and never puts a legendary fish in hand', () => {
    const b0 = BEDS[0] as { u: number; v: number };
    const [x, y] = fromGarden(b0.u, b0.v);
    const none: Garden = { seen: true, seeds: { starfall: 1 } };
    expect(gardenAction(none, x, y, 'starfall', T0)).toBe('g-nolegend');
    expect(gardenLabel(none, 'g-nolegend', 'starfall', T0)).toBe('It needs a legendary fish');
    const g: Garden = { seen: true, seeds: { starfall: 1 }, bin: { legend: 1 } };
    expect(gardenAction(g, x, y, 'starfall', T0)).toBe('g-plant-0');
    expect(gardenLabel(g, 'g-plant-0', 'starfall', T0)).toBe(
      'Plant a starfall melon over a legendary fish',
    );
    expect(seedTrayHtml(g, 'starfall')).not.toContain('fish-legend');
  });

  it('is the dearest at the stall, the rarest, and worth the fish it costs', () => {
    expect(CROP_IDS).toContain('starfall');
    expect(ALL_CROP_IDS.at(-1)).toBe('moonpetal');
    const c = CROPS.starfall;
    for (const k of CROP_IDS.filter((k) => k !== 'starfall')) {
      expect(c.seed).toBeGreaterThan(CROPS[k].seed);
      expect(c.sell).toBeGreaterThan(CROPS[k].sell);
      expect(c.odds).toBeGreaterThan(CROPS[k].odds);
    }
    expect(c.regrow).toBeUndefined();
    // Even over the Moonkoi, the dearest of the three to give up, it clears more than a kraken squash does.
    expect(c.sell - c.seed - (SPECIES[MOONKOI]?.v ?? 0)).toBeGreaterThan(
      CROPS.kraken.sell - CROPS.kraken.seed,
    );
    // A normal one sells under the cap, so its size counts.
    expect(fruitValue('starfall', 1)).toBeLessThan(FRUIT_MAX);
    // And at one seed in its odds' dawns, it stays inside the boat's rate a minute.
    expect((c.stock[1] * (c.sell - c.seed)) / c.odds / 5).toBeLessThanOrEqual(GUARD.perMinuteMax);
  });

  it('is kept in the save, and has a page in the journal saying where its seed is', () => {
    const g: Garden = { seen: true, seeds: { starfall: 1 }, bin: { legend: 2 } };
    plant(g, 0, 'starfall', T0);
    const back = parseGarden(JSON.parse(JSON.stringify(g)));
    expect(back.bin).toEqual({ legend: 1 });
    expect(back.beds?.[0]?.crop).toBe('starfall');
    expect(back.beds?.[0]?.fed).toBe('legend');
    expect(journalPagesHtml(g)).toContain('sprouts only over a legendary fish');
  });
});
