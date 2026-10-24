import { describe, expect, it } from 'vitest';
import {
  BASKET_MAX,
  BEDS_ALL,
  basketCount,
  basketValue,
  bedAt,
  buySeeds,
  CROP_IDS,
  CROPS,
  type Garden,
  GUARD,
  growBed,
  grownOf,
  inStock,
  noGarden,
  parseGarden,
  pick,
  plant,
  rollStock,
  SEEDS_MAX,
  secondsLeft,
  seedsOf,
  sellBasket,
  stockToday,
  TIERS,
  untouchedGarden,
} from '../../src/data/garden';
import { gardenLights, gardenPlantSolids } from '../../src/render/garden';
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
    // Nothing until the stall has stock.
    expect(buySeeds(g, 'carrot', 1, 100)).toBe(0);
    g.stock = { day: 1, n: { carrot: 3 } };
    expect(buySeeds(g, 'carrot', 1, 5)).toBe(0);
    expect(seedsOf(g, 'carrot')).toBe(0);
    expect(buySeeds(g, 'carrot', 1, 100)).toBe(CROPS.carrot.seed);
    expect(seedsOf(g, 'carrot')).toBe(1);
    expect(inStock(g, 'carrot')).toBe(2);
    g.seeds = { carrot: SEEDS_MAX };
    expect(buySeeds(g, 'carrot', 1, 1e6)).toBe(0);
  });

  it('sells only what is in today, and sells out', () => {
    const g = noGarden();
    g.stock = { day: 1, n: { tomato: 2 } };
    expect(buySeeds(g, 'pineapple', 1, 1e6)).toBe(0);
    expect(buySeeds(g, 'tomato', 5, 1e6)).toBe(2 * CROPS.tomato.seed);
    expect(inStock(g, 'tomato')).toBe(0);
    expect(buySeeds(g, 'tomato', 1, 1e6)).toBe(0);
    // Sold out survives the save, as sold out.
    expect(parseGarden(JSON.parse(JSON.stringify(g))).stock).toEqual({ day: 1, n: { tomato: 0 } });
  });
});

describe('the seed stall: the dawn restock', () => {
  it('rolls once a day and keeps it: asked again the same day it is the same stock', () => {
    const g = noGarden();
    let calls = 0;
    const rnd = () => {
      calls++;
      return 0.5;
    };
    const a = stockToday(g, 7, rnd);
    const used = calls;
    expect(stockToday(g, 7, rnd)).toBe(a);
    expect(calls).toBe(used);
    expect(stockToday(g, 8, rnd).day).toBe(8);
  });

  it('always has the commons, the blueberry and the tomato, and the rest as often as their odds say', () => {
    const days = 20000;
    const seen: Record<string, number> = {};
    let seed = 1;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let d = 0; d < days; d++) {
      const st = rollStock(d, rnd);
      for (const k of CROP_IDS) {
        const n = st.n[k] ?? 0;
        if (n) seen[k] = (seen[k] ?? 0) + 1;
        if (n) {
          expect(n).toBeGreaterThanOrEqual(CROPS[k].stock[0]);
          expect(n).toBeLessThanOrEqual(CROPS[k].stock[1]);
        }
      }
    }
    for (const k of CROP_IDS) {
      const want = days / CROPS[k].odds;
      expect(seen[k] ?? 0).toBeGreaterThan(want * 0.8);
      expect(seen[k] ?? 0).toBeLessThan(want * 1.2);
    }
    for (const k of ['carrot', 'strawberry', 'blueberry', 'tomato'] as const)
      expect(seen[k]).toBe(days);
  });

  it('climbs by tier: each tier dearer and rarer than the one before', () => {
    const byTier = TIERS.map((t) =>
      CROP_IDS.filter((k) => CROPS[k].tier === t).map((k) => CROPS[k]),
    );
    for (const list of byTier) expect(list.length).toBeGreaterThan(0);
    for (let i = 1; i < byTier.length; i++) {
      const lo = Math.max(...(byTier[i - 1] ?? []).map((c) => c.seed));
      const hi = Math.min(...(byTier[i] ?? []).map((c) => c.seed));
      expect(hi).toBeGreaterThan(lo);
      const rarest = Math.max(...(byTier[i - 1] ?? []).map((c) => c.odds));
      expect(Math.min(...(byTier[i] ?? []).map((c) => c.odds))).toBeGreaterThanOrEqual(
        i >= 3 ? rarest : 1,
      );
    }
  });
});

describe("the garden's pay: the owner's 'rival the boat'", () => {
  const keeps = CROP_IDS.map((k) => CROPS[k]).filter((c) => c.regrow);
  it('a full plot of the best crop that keeps fruiting, left overnight, pays three to five abyss holds', () => {
    const best = Math.max(...keeps.map((c) => BEDS_ALL * c.holds * c.sell));
    expect(best).toBeGreaterThanOrEqual(GUARD.overnightMin);
    expect(best).toBeLessThanOrEqual(GUARD.overnightMax);
  });

  it('tended by hand, no crop pays more a minute than the boat', () => {
    for (const c of keeps)
      expect((BEDS_ALL * c.sell) / ((c.regrow ?? 1) / 60)).toBeLessThanOrEqual(GUARD.perMinuteMax);
    // A crop picked once, bought as often as the stall has it: a day's stock grown in a day of play.
    for (const c of CROP_IDS.map((k) => CROPS[k]).filter((c) => !c.regrow)) {
      const perDay = (c.stock[1] * (c.sell - c.seed)) / c.odds;
      expect(perDay / 5).toBeLessThanOrEqual(GUARD.perMinuteMax);
    }
  });

  it('every crop pays its seed back: once picked, or in at most five dozen picks', () => {
    for (const c of CROP_IDS.map((k) => CROPS[k])) {
      if (c.regrow) expect(c.seed / c.sell).toBeLessThanOrEqual(60);
      else expect(c.sell).toBeGreaterThan(c.seed);
    }
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
    g.stock = { day: 1, n: { carrot: 5, blueberry: 2, tomato: 0 } };
    const shelf = seedShelfHtml(g, 50);
    expect(shelf.match(/data-seed=/g)).toHaveLength(CROP_IDS.length);
    expect(shelf).toContain('data-seed="blueberry" aria-disabled="true"');
    expect(shelf).toContain('data-seed="carrot" aria-disabled="false"');
    expect(shelf).toContain('5 left today.');
    expect(shelf).toContain('Sold out today.');
    expect(shelf).toContain('Not in today.');
    g.seeds = { strawberry: 2 };
    const tray = seedTrayHtml(g, 'strawberry');
    expect(tray.match(/data-pick=/g)).toHaveLength(1);
    expect(tray).toContain('class="seed on"');
    expect(tray).toContain(`0/${BASKET_MAX}`);
  });
});

describe('drawing what grows', () => {
  it('draws every crop, growing and grown, by day and at night', () => {
    for (const k of CROP_IDS) {
      const g: Garden = { seen: true, seeds: { [k]: 2 } };
      plant(g, 0, k, T0);
      for (const t of [CROPS[k].grow / 2, CROPS[k].grow + 1])
        for (const dark of [0, 1]) {
          const f = fakeView();
          f.v.dark = dark;
          const solids = gardenPlantSolids(f.v, g, sec(t), true);
          expect(solids).toHaveLength(1);
          for (const x of solids) x.f();
          expect((f.calls.fill ?? 0) + (f.calls.stroke ?? 0)).toBeGreaterThan(2);
        }
    }
  });

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

describe('the garden at night', () => {
  it('lights the open stalls, each ripe bed a little, and a ripe lantern gourd wide', () => {
    const g: Garden = { seen: true, seeds: { carrot: 1, lantern: 1, strawberry: 1 } };
    plant(g, 0, 'carrot', T0);
    plant(g, 1, 'lantern', T0);
    plant(g, 2, 'strawberry', T0);
    const lit: number[] = [];
    const f = fakeView();
    f.v.light = (_x, _y, _z, r) => {
      lit.push(r);
    };
    gardenLights(f.v, g, sec(CROPS.lantern.grow + 1));
    // Two stalls, then the ripe carrot, the lantern gourd and the strawberry.
    expect(lit).toEqual([120, 120, 50, 110, 50]);
  });
});
