import { describe, expect, it } from 'vitest';
import {
  BEDS_ALL,
  BIN_MAX,
  bedAt,
  binCount,
  binOf,
  CROPS,
  FED,
  fillBin,
  firstGrowMs,
  fishClass,
  type Garden,
  GUARD,
  growBed,
  grownOf,
  parseGarden,
  plant,
  SIZE,
  sizeOf,
  sizesOn,
  untouchedGarden,
  VARIANTS,
  variantsOn,
} from '../../src/data/garden';
import { DAWN_SP, DUSK_SP } from '../../src/data/guide';
import {
  ABYSS_FISH,
  CARP,
  CRAB,
  DEEP_RINGS,
  MOONKOI,
  REMORO,
  SPECIES,
} from '../../src/data/tuning';
import { binShelfHtml, gardenAction, gardenLabel, seedTrayHtml } from '../../src/ui/garden';
import { COMPOST_BIN, fromGarden } from '../../src/world/garden';

const T0 = 1_800_000_000_000;
const sec = (s: number) => T0 + s * 1000;
const DEEP = DEEP_RINGS[0]?.sp ?? 0;

describe('the compost bin: which fish it takes', () => {
  it('sorts fish into common, rare and deep, and takes no crab and none of the great fish', () => {
    expect(fishClass(0)).toBe('common');
    expect(fishClass(CARP)).toBe('common');
    expect(fishClass(DAWN_SP)).toBe('rare');
    expect(fishClass(DUSK_SP)).toBe('rare');
    expect(fishClass(DEEP)).toBe('deep');
    expect(fishClass(ABYSS_FISH[1] ?? 0)).toBe('deep');
    expect(fishClass(CRAB)).toBeNull();
    expect(fishClass(REMORO)).toBeNull();
    expect(fishClass(MOONKOI)).toBeNull();
  });

  it('keeps only the kinds it is set to, cheapest first, ten at most, out of the hold', () => {
    const hold = new Array(SPECIES.length).fill(0);
    hold[0] = 6;
    hold[1] = 6;
    hold[DAWN_SP] = 2;
    hold[DEEP] = 3;
    const g: Garden = { seen: true, binKeep: { common: true, deep: true } };
    const took = fillBin(g, hold);
    expect(binCount(g)).toBe(BIN_MAX);
    // The deep fish are dearer than any common one, so the commoners go in first and fill it.
    expect(binOf(g, 'common')).toBe(10);
    expect(hold[0]).toBe(0);
    expect(hold[1]).toBe(2);
    expect(hold[DAWN_SP]).toBe(2);
    expect(took[0]).toBe(6);
    // Full: nothing more.
    expect(fillBin(g, hold).length).toBe(0);
    // Set to keep nothing, it takes nothing.
    const none: Garden = { seen: true };
    expect(fillBin(none, [5, 5]).length).toBe(0);
  });
});

describe('fish for the beds: what a buried fish does, for the first harvest only', () => {
  it('a common fish: a quarter faster to its first fruit, then as ever', () => {
    const g: Garden = { seen: true, seeds: { tomato: 2 }, bin: { common: 1 } };
    expect(plant(g, 0, 'tomato', T0, 'common')).toBe(true);
    const b = bedAt(g, 0);
    if (!b) throw new Error('no bed');
    expect(b.fed).toBe('common');
    expect(binOf(g, 'common')).toBe(0);
    expect(firstGrowMs(b)).toBe(CROPS.tomato.grow * 1000 * FED.common.grow);
    expect(b.next).toBe(T0 + firstGrowMs(b));
    expect(grownOf(b, T0 + firstGrowMs(b) / 2)).toBeCloseTo(0.5, 5);
    growBed(b, T0 + firstGrowMs(b));
    expect(b.ripe).toBe(1);
    expect(b.next - (T0 + firstGrowMs(b))).toBe((CROPS.tomato.regrow ?? 0) * 1000);
    // With the bin empty, the next is planted plain.
    expect(plant(g, 1, 'tomato', T0, 'common')).toBe(true);
    expect(bedAt(g, 1)?.fed).toBeUndefined();
  });

  it('a deep fish: its first harvest a tenth bigger, the fruit after as ever', () => {
    const g: Garden = { seen: true, seeds: { strawberry: 1 }, bin: { deep: 1 } };
    plant(g, 0, 'strawberry', T0, 'deep');
    const b = bedAt(g, 0);
    if (!b) throw new Error('no bed');
    growBed(b, sec(6 * 60));
    const holds = CROPS.strawberry.holds;
    expect(sizesOn(b)).toHaveLength(holds);
    sizesOn(b).forEach((m, n) => {
      expect(m).toBeCloseTo(sizeOf(T0, n) * FED.deep.size, 9);
    });
  });

  it('a rare fish: its first harvest Gold one time in 50, about twice as often', () => {
    let gold = 0;
    let plain = 0;
    const N = 6000;
    for (let i = 0; i < N; i++) {
      const t = T0 + i * 104729;
      const fed: Garden = { seen: true, seeds: { carrot: 1 }, bin: { rare: 1 } };
      plant(fed, 0, 'carrot', t, 'rare');
      const a = bedAt(fed, 0);
      if (a) growBed(a, t + 61000);
      if (a && variantsOn(a)[0] === 'gold') gold++;
      const no: Garden = { seen: true, seeds: { carrot: 1 } };
      plant(no, 0, 'carrot', t);
      const b = bedAt(no, 0);
      if (b) growBed(b, t + 61000);
      if (b && variantsOn(b)[0] === 'gold') plain++;
    }
    expect(gold / N).toBeGreaterThan(0.7 / FED.rare.goldOdds);
    expect(gold / N).toBeLessThan(1.3 / FED.rare.goldOdds);
    expect(plain / N).toBeLessThan(1.4 / VARIANTS.gold.odds);
    expect(gold).toBeGreaterThan(plain * 1.5);
  });

  it("keeps to the owner's call: a full plot over deep fish pays at most a quarter over the overnight cap, once", () => {
    let total = 0;
    const N = 40000;
    for (let i = 0; i < N; i++) total += Math.max(SIZE.floor, sizeOf(T0 + i * 7919, i % 9)) ** 2;
    const ev =
      (total / N) *
      (1 +
        (VARIANTS.gold.times - 1) / VARIANTS.gold.odds +
        (VARIANTS.rainbow.times - 1) / VARIANTS.rainbow.odds);
    const best = Math.max(
      ...Object.values(CROPS)
        .filter((c) => c.regrow && c.odds > 0)
        .map((c) => BEDS_ALL * c.holds * c.sell * ev),
    );
    expect(best * FED.deep.size ** 2).toBeLessThanOrEqual(GUARD.overnightMax * 1.25);
    // The rare fish's Gold, at its odds, adds less than the deep fish's size does.
    const rareEv = 1 + (VARIANTS.gold.times - 1) / FED.rare.goldOdds;
    const plainEv = 1 + (VARIANTS.gold.times - 1) / VARIANTS.gold.odds;
    expect(rareEv / plainEv).toBeLessThan(FED.deep.size ** 2);
  });
});

describe('the compost bin: the card, the tray, the action button and the save', () => {
  it('opens at its front, and plants over a fish in hand', () => {
    const g: Garden = { seen: true, seeds: { carrot: 1 }, bin: { deep: 2 } };
    const [fx, fy] = fromGarden(COMPOST_BIN.front.u, COMPOST_BIN.front.v);
    expect(gardenAction(g, fx, fy, null, T0)).toBe('g-bin');
    expect(gardenLabel(g, 'g-bin', null, T0)).toBe('Look in the compost bin');
    expect(gardenLabel(g, 'g-plant-0', 'carrot', T0, 'fish-deep')).toBe(
      'Plant a carrot over a deep fish',
    );
    expect(gardenLabel(g, 'g-plant-0', 'carrot', T0, 'fish-rare')).toBe('Plant a carrot');
    const tray = seedTrayHtml(g, 'carrot', 'fish-deep');
    expect(tray).toContain('data-tool="fish-deep"');
    expect(tray).not.toContain('data-tool="fish-common"');
    const shelf = binShelfHtml({ ...g, binKeep: { deep: true } });
    expect(shelf.match(/data-keep=/g)).toHaveLength(3);
    expect(shelf).toContain('Keeping');
    expect(shelf).toContain('Not keeping');
  });

  it('keeps the bin, what it keeps and the fish under each bed; odd ones dropped', () => {
    const g: Garden = {
      seen: true,
      seeds: { carrot: 1 },
      bin: { common: 3, deep: 1 },
      binKeep: { deep: true },
    };
    plant(g, 0, 'carrot', T0, 'deep');
    const back = parseGarden(JSON.parse(JSON.stringify(g)));
    expect(back.bin).toEqual({ common: 3 });
    expect(back.binKeep).toEqual({ deep: true });
    expect(back.beds?.[0]?.fed).toBe('deep');
    const odd = parseGarden({
      bin: { common: 8, rare: 8, eel: 3 },
      binKeep: { common: 'yes', rare: true },
      beds: [{ crop: 'carrot', planted: T0, ripe: 0, next: T0 + 1, fed: 'whale' }],
    });
    expect(odd.bin).toEqual({ common: 8, rare: 2 });
    expect(odd.binKeep).toEqual({ rare: true });
    expect(odd.beds?.[0]?.fed).toBeUndefined();
    expect(untouchedGarden({ seen: false, binKeep: { common: true } })).toBe(false);
  });
});
