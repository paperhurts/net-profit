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
  type CropId,
  FRUIT_MAX,
  type Fruit,
  fruitKg,
  fruitValue,
  type Garden,
  GUARD,
  growBed,
  grownOf,
  inStock,
  isGiant,
  LIVE_MS,
  MUTATIONS,
  mutationsOn,
  mutationTimes,
  noGarden,
  parseGarden,
  pick,
  plant,
  rollStock,
  SEEDS_MAX,
  SIZE,
  secondsLeft,
  seedsOf,
  sellBasket,
  shockGarden,
  sizeOf,
  sizesOn,
  stockToday,
  TIERS,
  untouchedGarden,
  VARIANTS,
  variantOf,
  variantsOn,
  variantTimes,
  WEATHER_ODDS,
  wetGarden,
} from '../../src/data/garden';
import { drawGardenBolt, gardenLights, gardenPlantSolids } from '../../src/render/garden';
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

/** Normal-sized fruit, so many of each crop, for a basket. */
function bagOf(n: Partial<Record<CropId, number>>): Fruit[] {
  return Object.entries(n).flatMap(([c, k]) =>
    Array.from({ length: k ?? 0 }, () => ({ c: c as CropId, m: 1 })),
  );
}

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
  // What size adds, on average, to what a fruit sells for: sampled over many plants and fruit.
  let total = 0;
  const N = 40000;
  for (let i = 0; i < N; i++) total += Math.max(SIZE.floor, sizeOf(T0 + i * 7919, i % 9)) ** 2;
  // And Gold and Rainbow, at their odds.
  // Tended by hand the game is open, so what ripens may be Moonlit (night, a third of the day) or Twilight (dawn and
  // dusk, about a quarter of it). Wet and Shocked need the boat out in a storm, not tending the beds.
  const LIVE =
    1 +
    (0.33 * (MUTATIONS.moonlit.times - 1)) / WEATHER_ODDS.moonlit +
    (0.24 * (MUTATIONS.twilight.times - 1)) / WEATHER_ODDS.twilight;
  const EV =
    (total / N) *
    (1 +
      (VARIANTS.gold.times - 1) / VARIANTS.gold.odds +
      (VARIANTS.rainbow.times - 1) / VARIANTS.rainbow.odds);
  it('a full plot of the best crop that keeps fruiting, left overnight, pays three to five abyss holds', () => {
    const best = Math.max(...keeps.map((c) => BEDS_ALL * c.holds * c.sell * EV));
    expect(EV).toBeGreaterThan(1);
    expect(EV).toBeLessThan(1.45);
    expect(best).toBeGreaterThanOrEqual(GUARD.overnightMin);
    expect(best).toBeLessThanOrEqual(GUARD.overnightMax);
  });

  it('tended by hand, no crop pays more a minute than the boat', () => {
    for (const c of keeps)
      expect((BEDS_ALL * c.sell * EV * LIVE) / ((c.regrow ?? 1) / 60)).toBeLessThanOrEqual(
        GUARD.perMinuteMax,
      );
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
    expect(pick(g, 0, sec(7 * 86400))).toHaveLength(1);
    expect(bedAt(g, 0)).toBeNull();
    expect(g.bag).toEqual([{ c: 'carrot', m: expect.any(Number) }]);
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
    expect(pick(g, 2, sec(12 * 3600))).toHaveLength(4);
    expect(bedAt(g, 2)?.ripe).toBe(0);
    expect(at(12 * 3600 + 59)).toBe(0);
    expect(at(12 * 3600 + 60)).toBe(1);
  });

  it('picking part of a full plant, the rest stays and it goes on fruiting', () => {
    const g = stocked();
    plant(g, 0, 'strawberry', T0);
    g.bag = bagOf({ carrot: BASKET_MAX - 1 });
    expect(pick(g, 0, sec(400))).toHaveLength(1);
    expect(bedAt(g, 0)?.ripe).toBe(3);
    // A full basket picks nothing.
    expect(pick(g, 0, sec(400))).toHaveLength(0);
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
    g.bag = bagOf({ carrot: 3, strawberry: 4 });
    expect(basketValue(g)).toBe(3 * CROPS.carrot.sell + 4 * CROPS.strawberry.sell);
    expect(sellBasket(g)).toEqual({ coins: 3 * 16 + 4 * 5, n: 7 });
    expect(basketCount(g)).toBe(0);
  });
});

describe('the garden save', () => {
  it('keeps the beds, the seeds and the basket, and reads anything odd as nothing', () => {
    const g = stocked();
    plant(g, 1, 'strawberry', T0);
    g.bag = bagOf({ blueberry: 4 });
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
    // No seeds: it says where they are. A staked-out bed offers to dig more.
    expect(gardenAction(noGarden(), ...on(1), null, T0)).toBe('g-noseed');
    // A staked-out bed offers to dig the next six (part eleven).
    expect(gardenAction(g, ...on(BEDS_START), 'carrot', T0)).toBe('g-dig-more');
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
    g.bag = bagOf({ strawberry: 3 });
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
      const g: Garden = { seen: true, seeds: { [k]: 2 }, bin: { legend: 1 } };
      expect(plant(g, 0, k, T0)).toBe(true);
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

describe('fruit size and giants', () => {
  it('sizes each fruit from 0.8 to 1.2 of normal, one in 200 a giant of three to four, and the same every time', () => {
    let giants = 0;
    const N = 100000;
    for (let i = 0; i < N; i++) {
      const m = sizeOf(T0 + i * 104729, i % 7);
      expect(sizeOf(T0 + i * 104729, i % 7)).toBe(m);
      if (isGiant(m)) {
        giants++;
        expect(m).toBeGreaterThanOrEqual(SIZE.giantMin * SIZE.min);
        expect(m).toBeLessThanOrEqual(SIZE.giantMax * SIZE.max);
      } else {
        expect(m).toBeGreaterThanOrEqual(SIZE.min);
        expect(m).toBeLessThanOrEqual(SIZE.max);
      }
    }
    expect(giants).toBeGreaterThan((N / SIZE.giant) * 0.8);
    expect(giants).toBeLessThan((N / SIZE.giant) * 1.2);
  });

  it('sells by the square of its size, never under 0.9 squared, and weighs its crop times its size', () => {
    expect(fruitValue('tomato', 1)).toBe(60);
    expect(fruitValue('tomato', 1.2)).toBe(Math.round(60 * 1.44));
    expect(fruitValue('tomato', 0.8)).toBe(Math.round(60 * 0.81));
    expect(fruitValue('pineapple', 4)).toBe(4200 * 16);
    // A giant kraken squash would be more than a million: no one fruit sells for more than FRUIT_MAX.
    expect(fruitValue('kraken', 4.8)).toBe(FRUIT_MAX);
    expect(fruitKg('pineapple', 1)).toBe('1.50');
    expect(fruitKg('strawberry', 1)).toBe('0.030');
  });

  it('gives each ripe fruit its size on the plant, and carries it into the basket and the save', () => {
    const g: Garden = { seen: true, seeds: { strawberry: 1 } };
    plant(g, 0, 'strawberry', T0);
    const b = bedAt(g, 0);
    if (!b) throw new Error('no bed');
    growBed(b, sec(300));
    expect(b.ripe).toBe(4);
    const sizes = sizesOn(b);
    expect(sizes).toEqual([0, 1, 2, 3].map((n) => sizeOf(T0, n)));
    // Through a save and back, the same sizes, and the plant's count of fruit ripened.
    const back = parseGarden(JSON.parse(JSON.stringify(g)));
    expect(back.beds?.[0]?.w).toEqual(sizes);
    expect(back.beds?.[0]?.born).toBe(4);
    const got = pick(g, 0, sec(300));
    expect(got.map((f) => f.m)).toEqual(sizes);
    expect(basketValue(g)).toBe(sizes.reduce((n, m) => n + fruitValue('strawberry', m), 0));
    // The next fruit is the plant's fifth, not its first again.
    growBed(b, sec(360));
    expect(sizesOn(b)).toEqual([sizeOf(T0, 4)]);
  });

  it('reads a basket and ripe fruit saved before sizes as normal-sized', () => {
    const old = parseGarden({
      seen: true,
      beds: [{ crop: 'tomato', planted: T0, ripe: 2, next: 0 }],
      basket: { carrot: 2, tomato: 1 },
    });
    expect(old.bag).toEqual([
      { c: 'carrot', m: 1 },
      { c: 'carrot', m: 1 },
      { c: 'tomato', m: 1 },
    ]);
    const b = old.beds?.[0];
    if (!b) throw new Error('no bed');
    expect(sizesOn(b)).toEqual([1, 1]);
    // Odd sizes are clamped; odd fruit are dropped.
    const odd = parseGarden({
      bag: [{ c: 'carrot', m: 99 }, { c: 'kale', m: 1 }, 'x', { c: 'tomato' }],
    });
    expect(odd.bag).toEqual([
      { c: 'carrot', m: 5 },
      { c: 'tomato', m: 1 },
    ]);
  });
});

describe('Gold and Rainbow', () => {
  it('one fruit in 100 is Gold and one in 1,000 Rainbow, never both, the same every time', () => {
    let gold = 0;
    let rainbow = 0;
    const N = 200000;
    for (let i = 0; i < N; i++) {
      const v = variantOf(T0 + i * 7919, i % 11);
      expect(variantOf(T0 + i * 7919, i % 11)).toBe(v);
      if (v === 'gold') gold++;
      if (v === 'rainbow') rainbow++;
    }
    expect(gold).toBeGreaterThan((N / VARIANTS.gold.odds) * 0.85);
    expect(gold).toBeLessThan((N / VARIANTS.gold.odds) * 1.15);
    expect(rainbow).toBeGreaterThan((N / VARIANTS.rainbow.odds) * 0.7);
    expect(rainbow).toBeLessThan((N / VARIANTS.rainbow.odds) * 1.3);
  });

  it('a Gold fruit sells for 20 times as much and a Rainbow one 50, size and all, never past the most one fruit pays', () => {
    expect(variantTimes('')).toBe(1);
    expect(fruitValue('tomato', 1, 'gold')).toBe(60 * 20);
    expect(fruitValue('tomato', 1, 'rainbow')).toBe(60 * 50);
    expect(fruitValue('tomato', 1.2, 'gold')).toBe(Math.round(60 * 1.44 * 20));
    expect(fruitValue('lantern', 1, 'rainbow')).toBe(FRUIT_MAX / 4);
    expect(fruitValue('kraken', 1, 'gold')).toBe(FRUIT_MAX);
  });

  it("carries each fruit's Gold or Rainbow from the plant into the basket and the save", () => {
    // Find a plant whose first four fruit hold a Gold one.
    let t = T0;
    while (![0, 1, 2, 3].some((n) => variantOf(t, n))) t += 1000;
    const g: Garden = { seen: true, seeds: { strawberry: 1 } };
    plant(g, 0, 'strawberry', t);
    const b = bedAt(g, 0);
    if (!b) throw new Error('no bed');
    growBed(b, t + 300000);
    const vs = variantsOn(b);
    expect(vs).toEqual([0, 1, 2, 3].map((n) => variantOf(t, n)));
    const back = parseGarden(JSON.parse(JSON.stringify(g)));
    expect(back.beds?.[0]?.v).toEqual(vs);
    const got = pick(g, 0, t + 300000);
    expect(got.map((f) => f.v ?? '')).toEqual(vs);
    expect(parseGarden(JSON.parse(JSON.stringify(g))).bag).toEqual(g.bag);
    // Odd values read as neither.
    expect(parseGarden({ bag: [{ c: 'carrot', m: 1, v: 'platinum' }] }).bag).toEqual([
      { c: 'carrot', m: 1 },
    ]);
  });

  it('draws a Gold and a Rainbow fruit, with their sparkle', () => {
    const g: Garden = {
      seen: true,
      beds: [
        {
          crop: 'tomato',
          planted: T0,
          ripe: 3,
          next: 0,
          w: [1, 1, 1],
          v: ['gold', 'rainbow', ''],
          born: 3,
        },
      ],
    };
    const f = fakeView();
    const solids = gardenPlantSolids(f.v, g, sec(4000), false);
    for (const x of solids) x.f();
    expect(f.calls.star ?? 0).toBe(2);
  });
});

describe('the weather on the garden', () => {
  /** A strawberry plant whose fruit ripen at 120 s and then each minute. */
  function berries(): Garden {
    const g: Garden = { seen: true, seeds: { strawberry: 1 } };
    plant(g, 0, 'strawberry', T0);
    return g;
  }

  it('marks only fruit that ripen while the game is played: Moonlit at night, Twilight at dawn and dusk', () => {
    let moon = 0;
    let dusk = 0;
    const N = 3000;
    for (let i = 0; i < N; i++) {
      const t = T0 + i * 104729;
      for (const [phase, want] of [
        ['Night', 'moonlit'],
        ['Dusk', 'twilight'],
      ] as const) {
        const g: Garden = { seen: true, seeds: { carrot: 1 } };
        plant(g, 0, 'carrot', t);
        const b = bedAt(g, 0);
        if (!b) throw new Error('no bed');
        growBed(b, t + 60000 + 100, { phase });
        if (mutationsOn(b)[0]?.includes(want)) {
          if (phase === 'Night') moon++;
          else dusk++;
        }
      }
    }
    expect(moon / N).toBeGreaterThan(0.85 / WEATHER_ODDS.moonlit);
    expect(moon / N).toBeLessThan(1.15 / WEATHER_ODDS.moonlit);
    expect(dusk / N).toBeGreaterThan(0.8 / WEATHER_ODDS.twilight);
    expect(dusk / N).toBeLessThan(1.2 / WEATHER_ODDS.twilight);
    // By day, nothing; and a fruit that ripened while the game was closed, nothing, whatever the time is now.
    for (const [phase, late] of [
      ['Day', 0],
      ['Night', LIVE_MS + 1000],
    ] as const) {
      for (let i = 0; i < 300; i++) {
        const g: Garden = { seen: true, seeds: { carrot: 1 } };
        plant(g, 0, 'carrot', T0 + i * 7919);
        const b = bedAt(g, 0);
        if (!b) throw new Error('no bed');
        growBed(b, T0 + i * 7919 + 60000 + late, { phase });
        expect(mutationsOn(b)[0]).toEqual([]);
      }
    }
  });

  it("a storm's rain makes ripe fruit Wet, one in four, and never twice", () => {
    const g = berries();
    const b = bedAt(g, 0);
    if (!b) throw new Error('no bed');
    growBed(b, sec(300));
    let k = 0;
    const rnd = () => [0.1, 0.9, 0.2, 0.5][k++ % 4] as number;
    expect(wetGarden(g, rnd)).toBe(2);
    expect(mutationsOn(b).map((m) => m.includes('wet'))).toEqual([true, false, true, false]);
    // Again: only the two dry ones can get Wet, and the Wet ones stay Wet once.
    expect(wetGarden(g, () => 0)).toBe(2);
    expect(mutationsOn(b).every((m) => m.filter((x) => x === 'wet').length === 1)).toBe(true);
  });

  it('a bolt Shocks one ripe fruit, never one already Shocked, and nothing when nothing is ripe', () => {
    const g = berries();
    expect(shockGarden(g, () => 0)).toBe(-1);
    const b = bedAt(g, 0);
    if (!b) throw new Error('no bed');
    growBed(b, sec(130));
    expect(b.ripe).toBe(1);
    expect(shockGarden(g, () => 0)).toBe(0);
    expect(mutationsOn(b)[0]).toEqual(['shocked']);
    expect(shockGarden(g, () => 0)).toBe(-1);
  });

  it('the marks add, as in Grow a Garden, and multiply with size and Gold', () => {
    expect(mutationTimes(['wet', 'moonlit', 'shocked'])).toBe(12);
    expect(mutationTimes([])).toBe(1);
    expect(fruitValue('tomato', 1, '', ['twilight'])).toBe(180);
    expect(fruitValue('tomato', 1, 'gold', ['wet'])).toBe(60 * 20 * 2);
    expect(fruitValue('kraken', 1, '', ['shocked'])).toBe(FRUIT_MAX);
  });

  it('carries the marks from the plant to the basket and through the save; odd ones are dropped', () => {
    const g = berries();
    const b = bedAt(g, 0);
    if (!b) throw new Error('no bed');
    growBed(b, sec(130));
    shockGarden(g, () => 0);
    wetGarden(g, () => 0);
    const back = parseGarden(JSON.parse(JSON.stringify(g)));
    expect(back.beds?.[0]?.mu).toEqual([['wet', 'shocked']]);
    const got = pick(g, 0, sec(130));
    expect(got[0]?.mu).toEqual(['shocked', 'wet']);
    expect(basketValue(g)).toBe(
      fruitValue('strawberry', got[0]?.m ?? 1, got[0]?.v, ['shocked', 'wet']),
    );
    expect(parseGarden(JSON.parse(JSON.stringify(g))).bag?.[0]?.mu).toEqual(['wet', 'shocked']);
    const odd = parseGarden({ bag: [{ c: 'carrot', m: 1, mu: ['wet', 'wet', 'frozen', 3] }] });
    expect(odd.bag).toEqual([{ c: 'carrot', m: 1, mu: ['wet'] }]);
  });

  it('draws each mark by its fruit, and the bolt on its bed', () => {
    const g: Garden = {
      seen: true,
      beds: [
        {
          crop: 'tomato',
          planted: T0,
          ripe: 3,
          next: 0,
          w: [1, 1, 1],
          mu: [['wet', 'shocked'], ['moonlit'], ['twilight']],
          born: 3,
        },
      ],
    };
    const f = fakeView();
    for (const x of gardenPlantSolids(f.v, g, sec(4000), false)) x.f();
    expect(f.calls.arc ?? 0).toBeGreaterThan(4);
    const f2 = fakeView();
    drawGardenBolt(f2.v, 0, 0.5);
    expect(f2.calls.stroke ?? 0).toBe(1);
    const off = fakeView();
    off.onScreen = false;
    drawGardenBolt(off.v, 0, 0.5);
    expect(off.calls.stroke ?? 0).toBe(0);
  });
});
