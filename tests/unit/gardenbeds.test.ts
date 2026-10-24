import { describe, expect, it } from 'vitest';
import {
  BASKET_MAX,
  BEDS_ALL,
  BEDS_OPEN,
  BIG_BASKET,
  basketMax,
  bedsOpen,
  buyBasket,
  DIG,
  digBeds,
  type Garden,
  nextDig,
  parseGarden,
  pick,
  plant,
  untouchedGarden,
} from '../../src/data/garden';
import { drawGardenFlat } from '../../src/render/garden';
import { gardenAction, gardenLabel, gearShelfHtml, seedTrayHtml } from '../../src/ui/garden';
import { BEDS, bedSpot, bedUnder, fromGarden } from '../../src/world/garden';
import { fakeView } from './helpers/view';

const T0 = 1_800_000_000_000;
const on = (i: number) => fromGarden(BEDS[i]?.u ?? 0, BEDS[i]?.v ?? 0);

describe('more beds: dug six at a time', () => {
  it('six to begin with, then 12, 18 and the whole plot of 24, at the plan’s prices', () => {
    const g: Garden = { seen: true };
    expect(bedsOpen(g)).toBe(BEDS_OPEN);
    expect(DIG.map((d) => [d.to, d.price])).toEqual([
      [12, 2000],
      [18, 5000],
      [BEDS_ALL, 10000],
    ]);
    expect(digBeds(g, 1999)).toBe(0);
    expect(digBeds(g, 1e6)).toBe(2000);
    expect(bedsOpen(g)).toBe(12);
    expect(digBeds(g, 1e6)).toBe(5000);
    expect(digBeds(g, 1e6)).toBe(10000);
    expect(bedsOpen(g)).toBe(BEDS_ALL);
    expect(nextDig(g)).toBeNull();
    expect(digBeds(g, 1e6)).toBe(0);
  });

  it('a new bed can be planted once dug, not before', () => {
    const g: Garden = { seen: true, seeds: { carrot: 2 } };
    expect(plant(g, 7, 'carrot', T0)).toBe(false);
    digBeds(g, 1e6);
    expect(plant(g, 7, 'carrot', T0)).toBe(true);
    expect(g.beds).toHaveLength(12);
  });

  it('on a staked-out bed the button offers to dig the next six; once dug, it plants there', () => {
    const g: Garden = { seen: true, seeds: { carrot: 1 } };
    expect(bedSpot(...on(9))).toBe(9);
    expect(bedUnder(...on(9))).toBe(-1);
    expect(gardenAction(g, ...on(9), 'carrot', T0)).toBe('g-dig-more');
    expect(gardenLabel(g, 'g-dig-more', 'carrot', T0)).toBe('Dig 6 more beds for 2,000');
    digBeds(g, 1e6);
    expect(gardenAction(g, ...on(9), 'carrot', T0)).toBe('g-plant-9');
    expect(gardenLabel(g, 'g-dig-more', 'carrot', T0)).toBe('Dig 6 more beds for 5,000');
    g.dug = BEDS_ALL;
    expect(gardenAction(g, ...on(23), 'carrot', T0)).toBe('g-plant-23');
  });

  it('draws the dug beds as soil, the rest staked out', () => {
    const six = fakeView();
    drawGardenFlat(six.v);
    const all = fakeView();
    drawGardenFlat(all.v, BEDS_ALL);
    expect(all.calls.fill ?? 0).toBeGreaterThan((six.calls.fill ?? 0) + 18);
  });
});

describe('a bigger basket', () => {
  it('carries 100 once bought, bought once', () => {
    const g: Garden = { seen: true };
    expect(basketMax(g)).toBe(BASKET_MAX);
    expect(buyBasket(g, BIG_BASKET.price - 1)).toBe(0);
    expect(buyBasket(g, 1e6)).toBe(BIG_BASKET.price);
    expect(basketMax(g)).toBe(100);
    expect(buyBasket(g, 1e6)).toBe(0);
    expect(gearShelfHtml(g, 1e6)).toContain('You have it.');
    expect(gearShelfHtml({ seen: true }, 1e6)).toContain('data-basket');
    expect(seedTrayHtml(g, null)).toContain('0/100');
  });

  it('picks into it past 50', () => {
    const g: Garden = {
      seen: true,
      bigBasket: true,
      bag: Array.from({ length: 60 }, () => ({ c: 'carrot' as const, m: 1 })),
      beds: [{ crop: 'strawberry', planted: T0, ripe: 4, next: 0, born: 4 }],
    };
    expect(pick(g, 0, T0)).toHaveLength(4);
    expect(g.bag).toHaveLength(64);
  });
});

describe('the save: beds dug and the basket', () => {
  it('keeps them, and reads anything odd as the start', () => {
    const g: Garden = { seen: true, dug: 18, bigBasket: true, seeds: { carrot: 1 } };
    plant(g, 15, 'carrot', T0);
    const back = parseGarden(JSON.parse(JSON.stringify(g)));
    expect(back.dug).toBe(18);
    expect(back.bigBasket).toBe(true);
    expect(back.beds?.[15]?.crop).toBe('carrot');
    const odd = parseGarden({ dug: 13, bigBasket: 'yes', beds: Array(20).fill(null) });
    expect(odd.dug).toBeUndefined();
    expect(odd.bigBasket).toBeUndefined();
    // A save with more beds than it has dug keeps only the dug ones.
    const over = parseGarden({
      beds: [...Array(8).fill(null), { crop: 'carrot', planted: T0, ripe: 0, next: T0 + 1 }],
    });
    expect(over.beds).toBeUndefined();
    expect(untouchedGarden({ seen: false, dug: 12 })).toBe(false);
  });
});
