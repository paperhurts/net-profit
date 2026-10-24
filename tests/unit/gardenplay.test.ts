import { describe, expect, it } from 'vitest';
import {
  BASKET_MAX,
  basketCount,
  basketValue,
  bedAt,
  buySeeds,
  CROPS,
  type Garden,
  growBed,
  grownOf,
  noGarden,
  parseGarden,
  pick,
  plant,
  SEEDS_MAX,
  secondsLeft,
  seedsOf,
  sellBasket,
  untouchedGarden,
} from '../../src/data/garden';
import { gardenPlantSolids } from '../../src/render/garden';
import {
  bedOf,
  clockText,
  gardenAction,
  gardenLabel,
  howMany,
  seedShelfHtml,
  seedTrayHtml,
} from '../../src/ui/garden';
import { BEDS, BEDS_START, fromGarden, SEED_STALL, SELL_STAND } from '../../src/world/garden';
import { fakeView } from './helpers/view';

const T0 = 1_800_000_000_000;
const sec = (s: number) => T0 + s * 1000;

/** A garden with seeds of each kind. */
function stocked(): Garden {
  return { seen: true, seeds: { carrot: 5, strawberry: 3, blueberry: 2 } };
}

describe('the garden: buying seeds', () => {
  it('costs what the stall asks, needs the coins, and keeps at most 99 of a kind', () => {
    const g = noGarden();
    expect(buySeeds(g, 'carrot', 1, 5)).toBe(0);
    expect(seedsOf(g, 'carrot')).toBe(0);
    expect(buySeeds(g, 'carrot', 1, 100)).toBe(CROPS.carrot.seed);
    expect(seedsOf(g, 'carrot')).toBe(1);
    g.seeds = { carrot: SEEDS_MAX };
    expect(buySeeds(g, 'carrot', 1, 1e6)).toBe(0);
  });
});

describe('the garden: planting and growing, in real time', () => {
  it('plants a seed in an empty open bed, and not in a full one, a shut one, or without a seed', () => {
    const g = stocked();
    expect(plant(g, 0, 'carrot', T0)).toBe(true);
    expect(seedsOf(g, 'carrot')).toBe(4);
    expect(plant(g, 0, 'strawberry', T0)).toBe(false);
    expect(plant(g, BEDS_START, 'carrot', T0)).toBe(false);
    expect(plant(g, -1, 'carrot', T0)).toBe(false);
    g.seeds = {};
    expect(plant(g, 1, 'carrot', T0)).toBe(false);
  });

  it('a carrot is ripe after its growing time, picked once, and leaves the bed empty', () => {
    const g = stocked();
    plant(g, 0, 'carrot', T0);
    const b = bedAt(g, 0);
    if (!b) throw new Error('no bed');
    growBed(b, sec(59));
    expect(b.ripe).toBe(0);
    expect(secondsLeft(b, sec(59))).toBe(1);
    expect(grownOf(b, sec(30))).toBeCloseTo(0.5, 5);
    growBed(b, sec(60));
    expect(b.ripe).toBe(1);
    // Ripe, it waits: a week later there is still one carrot.
    growBed(b, sec(7 * 86400));
    expect(b.ripe).toBe(1);
    expect(pick(g, 0, sec(7 * 86400))).toBe(1);
    expect(bedAt(g, 0)).toBeNull();
    expect(g.basket).toEqual({ carrot: 1 });
  });

  it('a strawberry keeps fruiting: its first after two minutes, then one a minute, and holds four then waits', () => {
    const g = stocked();
    plant(g, 2, 'strawberry', T0);
    const at = (s: number) => {
      const b = bedAt(g, 2);
      if (!b) throw new Error('no bed');
      growBed(b, sec(s));
      return b.ripe;
    };
    expect(at(119)).toBe(0);
    expect(at(120)).toBe(1);
    expect(at(180)).toBe(2);
    expect(at(300)).toBe(4);
    // Closed for a night: still four, never more.
    expect(at(12 * 3600)).toBe(4);
    // Picked, the plant stays and starts its next one from now.
    expect(pick(g, 2, sec(12 * 3600))).toBe(4);
    expect(bedAt(g, 2)?.ripe).toBe(0);
    expect(at(12 * 3600 + 59)).toBe(0);
    expect(at(12 * 3600 + 60)).toBe(1);
  });

  it('picking part of a full plant, the rest stays and it goes on fruiting', () => {
    const g = stocked();
    plant(g, 0, 'strawberry', T0);
    g.basket = { carrot: BASKET_MAX - 1 };
    expect(pick(g, 0, sec(400))).toBe(1);
    expect(bedAt(g, 0)?.ripe).toBe(3);
    // A full basket picks nothing.
    expect(pick(g, 0, sec(400))).toBe(0);
    expect(basketCount(g)).toBe(BASKET_MAX);
  });

  it('a clock set backwards never makes a fruit wait longer than its full growing time', () => {
    const g = stocked();
    plant(g, 0, 'blueberry', sec(1000));
    const b = bedAt(g, 0);
    if (!b) throw new Error('no bed');
    // The phone's clock goes back a day.
    growBed(b, sec(1000 - 86400));
    expect(b.next - sec(1000 - 86400)).toBeLessThanOrEqual(CROPS.blueberry.grow * 1000);
    expect(b.planted).toBeLessThanOrEqual(sec(1000 - 86400));
  });
});

describe('the garden: selling', () => {
  it('sells the whole basket at the stand for what each fruit is worth', () => {
    const g = stocked();
    g.basket = { carrot: 3, strawberry: 4 };
    expect(basketValue(g)).toBe(3 * CROPS.carrot.sell + 4 * CROPS.strawberry.sell);
    expect(sellBasket(g)).toEqual({ coins: 3 * 16 + 4 * 5, n: 7 });
    expect(basketCount(g)).toBe(0);
  });

  it('every crop pays: a carrot more than its seed, and a fruiting crop its seed back in under a dozen picks', () => {
    const c = CROPS.carrot;
    expect(c.sell).toBeGreaterThan(c.seed);
    for (const k of ['strawberry', 'blueberry'] as const) {
      const x = CROPS[k];
      expect(x.seed / x.sell).toBeLessThan(12);
    }
  });
});

describe('the garden save', () => {
  it('keeps the beds, the seeds and the basket, and reads anything odd as nothing', () => {
    const g = stocked();
    plant(g, 1, 'strawberry', T0);
    g.basket = { blueberry: 4 };
    const back = parseGarden(JSON.parse(JSON.stringify(g)));
    expect(back).toEqual(g);
    expect(untouchedGarden(back)).toBe(false);
    const odd = parseGarden({
      seen: true,
      beds: [{ crop: 'kale', planted: T0, ripe: 1, next: 0 }, { crop: 'carrot', planted: -5 }, 7],
      seeds: { carrot: 'lots', blueberry: 1e9 },
      basket: { carrot: 40, strawberry: 40 },
    });
    expect(odd.beds).toBeUndefined();
    expect(odd.seeds).toEqual({ blueberry: SEEDS_MAX });
    expect(basketCount(odd)).toBe(BASKET_MAX);
    // More ripe than the plant can hold reads as what it holds.
    const over = parseGarden({ beds: [{ crop: 'strawberry', planted: T0, ripe: 50, next: 0 }] });
    expect(over.beds?.[0]?.ripe).toBe(CROPS.strawberry.holds);
    expect(untouchedGarden(noGarden())).toBe(true);
  });
});

describe('the garden: what the action button does', () => {
  const on = (i: number) => fromGarden((BEDS[i] as { u: number }).u, (BEDS[i] as { v: number }).v);
  it('plants on an empty bed with a seed chosen, picks a ripe one, says the time on a growing one', () => {
    const g = stocked();
    expect(gardenAction(g, ...on(0), 'carrot', T0)).toBe('g-plant-0');
    expect(gardenLabel(g, 'g-plant-0', 'carrot', T0)).toBe('Plant a carrot');
    plant(g, 0, 'carrot', T0);
    expect(gardenAction(g, ...on(0), 'carrot', sec(10))).toBe('g-wait-0');
    expect(gardenLabel(g, 'g-wait-0', 'carrot', sec(10))).toBe('Carrot: ripe in 50 s');
    expect(gardenAction(g, ...on(0), 'carrot', sec(60))).toBe('g-pick-0');
    expect(gardenLabel(g, 'g-pick-0', 'carrot', sec(60))).toBe('Pick a carrot');
    expect(bedOf('g-pick-0')).toBe(0);
    expect(bedOf('g-seeds')).toBe(-1);
    // No seeds: it says where they are. A staked-out bed does nothing yet.
    expect(gardenAction(noGarden(), ...on(1), null, T0)).toBe('g-noseed');
    expect(gardenAction(g, ...on(BEDS_START), 'carrot', T0)).toBeNull();
  });

  it('opens the seed stall at its front, and sells the basket at the stand', () => {
    const g = stocked();
    expect(gardenAction(g, ...fromGarden(SEED_STALL.front.u, SEED_STALL.front.v), null, T0)).toBe(
      'g-seeds',
    );
    expect(gardenAction(g, ...fromGarden(SELL_STAND.front.u, SELL_STAND.front.v), null, T0)).toBe(
      'g-sell',
    );
    expect(gardenLabel(g, 'g-sell', null, T0)).toBe('Your basket is empty');
    g.basket = { strawberry: 3 };
    expect(gardenLabel(g, 'g-sell', null, T0)).toBe('Sell your basket for 15');
  });

  it('writes times and counts as a person would', () => {
    expect(clockText(5)).toBe('5 s');
    expect(clockText(125)).toBe('2:05');
    expect(clockText(3 * 3600 + 120)).toBe('3 h 2 min');
    expect(howMany('strawberry', 1)).toBe('a strawberry');
    expect(howMany('blueberry', 3)).toBe('3 blueberries');
  });

  it('lists every seed on the shelf, greyed when it cannot be bought, and only seeds held in the tray', () => {
    const g = noGarden();
    const shelf = seedShelfHtml(g, 50);
    expect(shelf.match(/data-seed=/g)).toHaveLength(3);
    expect(shelf).toContain('data-seed="blueberry" aria-disabled="true"');
    expect(shelf).toContain('data-seed="carrot" aria-disabled="false"');
    g.seeds = { strawberry: 2 };
    const tray = seedTrayHtml(g, 'strawberry');
    expect(tray.match(/data-pick=/g)).toHaveLength(1);
    expect(tray).toContain('class="seed on"');
    expect(tray).toContain(`0/${BASKET_MAX}`);
  });
});

describe('drawing what grows', () => {
  it('draws a plant in each planted bed, with its timer or its twinkle ashore', () => {
    const g = stocked();
    plant(g, 0, 'carrot', T0);
    plant(g, 1, 'strawberry', T0);
    plant(g, 2, 'blueberry', T0);
    const f = fakeView();
    const solids = gardenPlantSolids(f.v, g, sec(130), true);
    expect(solids).toHaveLength(3);
    for (const s of solids) s.f();
    // The blueberry is still growing: one timer.
    expect(f.calls.fillText ?? 0).toBe(1);
    expect(f.calls.star ?? 0).toBe(2);
    const off = fakeView();
    off.onScreen = false;
    expect(gardenPlantSolids(off.v, g, sec(130), true)).toHaveLength(0);
  });
});
