import { describe, expect, it } from 'vitest';
import {
  BEDS_ALL,
  bedAt,
  buyGear,
  CROP_IDS,
  CROPS,
  canWater,
  dig,
  type Garden,
  GEAR,
  GEAR_IDS,
  GEAR_MAX,
  GUARD,
  gearInStock,
  gearOf,
  gearToday,
  growAll,
  grownOf,
  MUTATIONS,
  mutationsOn,
  noGarden,
  parseGarden,
  plant,
  rollGear,
  SIZE,
  SPRINKLERS,
  SPRINKLERS_MAX,
  secondsLeft,
  setSprinkler,
  sizeOf,
  untouchedGarden,
  VARIANTS,
  WATER,
  WEATHER_ODDS,
  water,
} from '../../src/data/garden';
import { drawGardenSplash, gardenPlantSolids } from '../../src/render/garden';
import { gardenAction, gardenLabel, gearShelfHtml, seedTrayHtml } from '../../src/ui/garden';
import {
  BEDS,
  BEDS_START,
  bedsInReach,
  fromGarden,
  GEAR_SHED,
  PLOT14,
} from '../../src/world/garden';
import { fakeView } from './helpers/view';

const T0 = 1_800_000_000_000;
const sec = (s: number) => T0 + s * 1000;
const MIN = 60 * 1000;

/** A garden with gear in the shed and seeds to plant. */
function shed(): Garden {
  return {
    seen: true,
    seeds: { carrot: 5, pineapple: 3 },
    gearStock: { day: 1, n: { can: 3, sprinkler: 3, goldsprinkler: 1, shovel: 1 } },
  };
}

describe('the gear shed: buying', () => {
  it('a can comes with ten waterings, the shovel is bought once, and sprinklers up to nine', () => {
    const g = shed();
    expect(buyGear(g, 'can', 10)).toBe(0);
    expect(buyGear(g, 'can', 1e6)).toBe(GEAR.can.price);
    expect(gearOf(g, 'can')).toBe(WATER.per);
    expect(gearInStock(g, 'can')).toBe(2);
    expect(buyGear(g, 'shovel', 1e6)).toBe(GEAR.shovel.price);
    g.gearStock = { day: 1, n: { ...g.gearStock?.n, shovel: 1 } };
    expect(buyGear(g, 'shovel', 1e6)).toBe(0);
    g.gear = { ...g.gear, sprinkler: GEAR_MAX };
    expect(buyGear(g, 'sprinkler', 1e6)).toBe(0);
    g.gear = { ...g.gear, can: WATER.max - 5 };
    expect(buyGear(g, 'can', 1e6)).toBe(0);
  });

  it('restocks at each dawn, once a day, the gold sprinkler rarely', () => {
    const g = noGarden();
    const first = gearToday(g, 4, () => 0);
    expect(first.n.goldsprinkler).toBe(1);
    expect(gearToday(g, 4, () => 0.99)).toBe(first);
    expect(gearToday(g, 5, () => 0.99).n.goldsprinkler).toBeUndefined();
    // The can and the shovel are always in.
    for (let d = 0; d < 50; d++) {
      const s = rollGear(d);
      expect(s.n.can).toBeGreaterThan(0);
      expect(s.n.shovel).toBe(1);
    }
  });

  it('the shelf says what each does and how many are left; the tray shows gear held, the one in hand ringed', () => {
    const g = shed();
    const html = gearShelfHtml(g, 1e6);
    for (const k of GEAR_IDS) expect(html).toContain(`data-gear="${k}"`);
    expect(html).toContain('3 left today');
    expect(html).toContain('twice as fast');
    g.gear = { can: 7, shovel: 1 };
    const tray = seedTrayHtml(g, 'carrot', 'can');
    expect(tray).toContain('data-tool="can"');
    expect(tray).toContain('data-tool="shovel"');
    expect(tray).not.toContain('data-tool="sprinkler"');
    expect(tray).toMatch(/class="seed gear on" data-tool="can"/);
    expect(tray).not.toMatch(/class="seed on" data-pick="carrot"/);
  });
});

describe('the gear: watering, sprinklers, the shovel', () => {
  it('a watering takes half a minute off a bed, never past now, and grows the plant on', () => {
    const g = shed();
    g.gear = { can: 2 };
    plant(g, 0, 'pineapple', T0);
    const b = bedAt(g, 0);
    if (!b) throw new Error('no bed');
    expect(water(g, 0, sec(0))).toBe(true);
    expect(secondsLeft(b, sec(0))).toBe(CROPS.pineapple.grow - 30);
    expect(grownOf(b, sec(0))).toBeCloseTo(30 / CROPS.pineapple.grow, 5);
    expect(gearOf(g, 'can')).toBe(1);
    // Not an empty bed, and nothing left once the can is empty.
    expect(water(g, 1, sec(0))).toBe(false);
    expect(water(g, 0, sec(0))).toBe(true);
    expect(canWater(g, 0)).toBe(false);
    // Never earlier than now.
    g.gear = { can: 5 };
    expect(water(g, 0, sec(CROPS.pineapple.grow - 70))).toBe(true);
    expect(b.next).toBe(sec(CROPS.pineapple.grow - 70));
  });

  it('a sprinkler grows the beds in its reach half as fast again for five minutes, open or closed', () => {
    const run = (step: number) => {
      const g = shed();
      g.seeds = { pineapple: 3 };
      g.gear = { sprinkler: 1 };
      plant(g, 0, 'pineapple', T0);
      plant(g, 5, 'pineapple', T0);
      growAll(g, T0);
      const [u, v] = [BEDS[0]?.u ?? 0, BEDS[0]?.v ?? 0];
      const reach = bedsInReach(u, v);
      expect(reach).toContain(0);
      expect(reach).not.toContain(5);
      expect(setSprinkler(g, 'sprinkler', u, v, reach, T0)).toBe(true);
      for (let t = 0; t <= 10 * 60; t += step) growAll(g, sec(t));
      return g;
    };
    // Every frame or once on coming back, the same.
    for (const g of [run(1), run(10 * 60)]) {
      const half = SPRINKLERS.sprinkler.ms * (SPRINKLERS.sprinkler.speed - 1);
      expect(bedAt(g, 0)?.next).toBeCloseTo(T0 + CROPS.pineapple.grow * 1000 - half, -1);
      expect(bedAt(g, 5)?.next).toBe(T0 + CROPS.pineapple.grow * 1000);
      // Run out, it is taken up.
      expect(g.spr).toEqual([]);
      expect(g.at).toBeUndefined();
    }
  });

  it('a gold sprinkler grows them twice as fast, and about one fruit in four ripens Wet', () => {
    let wet = 0;
    let n = 0;
    for (let k = 0; k < 400; k++) {
      const t0 = T0 + k * 7919;
      const g: Garden = { seen: true, seeds: { carrot: 1 }, gear: { goldsprinkler: 1 } };
      plant(g, 0, 'carrot', t0);
      growAll(g, t0);
      setSprinkler(g, 'goldsprinkler', 0, 0, [0], t0);
      growAll(g, t0 + 30 * 1000);
      const b = bedAt(g, 0);
      if (!b) throw new Error('no bed');
      // A one-minute carrot, twice as fast: ripe in half a minute.
      expect(b.ripe).toBe(1);
      n++;
      if (mutationsOn(b)[0]?.includes('wet')) wet++;
    }
    expect(wet / n).toBeGreaterThan(0.18);
    expect(wet / n).toBeLessThan(0.32);
  });

  it('at most six sprinklers run at once, and each needs one held', () => {
    const g: Garden = { seen: true, gear: { sprinkler: GEAR_MAX } };
    for (let k = 0; k < SPRINKLERS_MAX; k++)
      expect(setSprinkler(g, 'sprinkler', 0, 0, [], T0)).toBe(true);
    expect(setSprinkler(g, 'sprinkler', 0, 0, [], T0)).toBe(false);
    expect(setSprinkler(noGarden(), 'goldsprinkler', 0, 0, [], T0)).toBe(false);
  });

  it('a sprinkler set between beds waters the four round it; set on a bed, that bed and the four next to it', () => {
    const a = BEDS[0];
    const b = BEDS[3];
    if (!a || !b) throw new Error('no beds');
    expect(bedsInReach((a.u + b.u) / 2, (a.v + b.v) / 2)).toHaveLength(4);
    expect(bedsInReach(BEDS[8]?.u ?? 0, BEDS[8]?.v ?? 0).length).toBeGreaterThanOrEqual(4);
    expect(bedsInReach(PLOT14.u0 - 200, 0)).toEqual([]);
  });

  it('the shovel digs a plant up, ripe fruit and all; without one it does nothing', () => {
    const g = shed();
    plant(g, 0, 'carrot', T0);
    expect(dig(g, 0)).toBe(false);
    g.gear = { shovel: 1 };
    expect(dig(g, 0)).toBe(true);
    expect(bedAt(g, 0)).toBeNull();
    expect(dig(g, 0)).toBe(false);
    expect(gearOf(g, 'shovel')).toBe(1);
  });
});

describe('the gear: the action button', () => {
  const on = (i: number) => fromGarden(BEDS[i]?.u ?? 0, BEDS[i]?.v ?? 0);
  it('opens the shed at its door', () => {
    expect(
      gardenAction(shed(), ...fromGarden(GEAR_SHED.front.u, GEAR_SHED.front.v), null, T0),
    ).toBe('g-gear');
    expect(gardenLabel(shed(), 'g-gear', null, T0)).toBe('Look at the gear');
  });

  it('uses what is in hand on a bed, but ripe fruit is picked first and an empty bed planted', () => {
    const g = shed();
    g.gear = { can: 3, shovel: 1, sprinkler: 1 };
    plant(g, 0, 'pineapple', T0);
    expect(gardenAction(g, ...on(0), 'carrot', sec(10), 'can')).toBe('g-water-0');
    expect(gardenLabel(g, 'g-water-0', 'carrot', sec(10), 'can')).toMatch(/^Water the pineapple/);
    expect(gardenAction(g, ...on(0), 'carrot', sec(10), 'shovel')).toBe('g-dig-0');
    expect(gardenLabel(g, 'g-dig-0', 'carrot', sec(10), 'shovel')).toBe('Dig up the pineapple');
    expect(gardenAction(g, ...on(0), 'carrot', sec(10), 'sprinkler')).toBe('g-spr');
    expect(gardenAction(g, ...on(0), 'carrot', sec(10), null)).toBe('g-wait-0');
    expect(gardenAction(g, ...on(0), 'carrot', sec(CROPS.pineapple.grow), 'shovel')).toBe(
      'g-pick-0',
    );
    expect(gardenAction(g, ...on(1), 'carrot', sec(10), 'can')).toBe('g-plant-1');
    // Out of the beds but in the plot, a sprinkler can still go down; a staked-out bed offers to dig more.
    expect(gardenAction(g, ...on(BEDS_START), null, sec(10), 'sprinkler')).toBe('g-spr');
    expect(gardenAction(g, ...on(BEDS_START), null, sec(10), 'can')).toBe('g-dig-more');
    expect(gardenLabel(g, 'g-spr', null, T0, 'goldsprinkler')).toBe(
      'Set your gold sprinkler down here',
    );
  });
});

describe("the gear: the owner's guardrails still hold", () => {
  it('tended by hand with all the gear the shed has in a day, no crop pays more a minute than the boat', () => {
    // As in gardenplay.test.ts: what size, Gold and Rainbow, and the time of day add, on average.
    let total = 0;
    const N = 40000;
    for (let i = 0; i < N; i++) total += Math.max(SIZE.floor, sizeOf(T0 + i * 7919, i % 9)) ** 2;
    const EV =
      (total / N) *
      (1 +
        (VARIANTS.gold.times - 1) / VARIANTS.gold.odds +
        (VARIANTS.rainbow.times - 1) / VARIANTS.rainbow.odds);
    const LIVE =
      1 +
      (0.33 * (MUTATIONS.moonlit.times - 1)) / WEATHER_ODDS.moonlit +
      (0.24 * (MUTATIONS.twilight.times - 1)) / WEATHER_ODDS.twilight;
    // What the shed has on an average day (five minutes of play), each used on the best beds: bed-minutes of extra
    // growing a minute, and what it costs a minute.
    const DAY_MIN = 5;
    const perDay = (k: keyof typeof GEAR) =>
      ((GEAR[k].stock[0] + GEAR[k].stock[1]) / 2) * (1 / GEAR[k].odds);
    const REACH = 5;
    const can = (perDay('can') * WATER.per * (WATER.ms / MIN)) / DAY_MIN;
    const spr = (k: 'sprinkler' | 'goldsprinkler') =>
      (perDay(k) * REACH * (SPRINKLERS[k].ms / MIN) * (SPRINKLERS[k].speed - 1)) / DAY_MIN;
    // The gold one's Wet, on what grows in its spray.
    const goldWet = 1 + (MUTATIONS.wet.times - 1) / SPRINKLERS.goldsprinkler.wet;
    const cost =
      (perDay('can') * GEAR.can.price +
        perDay('sprinkler') * GEAR.sprinkler.price +
        perDay('goldsprinkler') * GEAR.goldsprinkler.price) /
      DAY_MIN;
    for (const c of CROP_IDS.map((k) => CROPS[k]).filter((c) => c.regrow)) {
      const perBedMin = (c.sell * EV * LIVE) / ((c.regrow ?? 60) / 60);
      const plain = BEDS_ALL * perBedMin;
      const gold =
        (perDay('goldsprinkler') * REACH * (SPRINKLERS.goldsprinkler.ms / MIN)) / DAY_MIN;
      const extra =
        perBedMin * (can + spr('sprinkler') + spr('goldsprinkler')) +
        perBedMin * gold * SPRINKLERS.goldsprinkler.speed * (goldWet - 1);
      expect(plain + extra - cost).toBeLessThanOrEqual(GUARD.perMinuteMax);
    }
  });
});

describe('the gear: the save and the drawing', () => {
  it('keeps gear, the shed stock, running sprinklers and when the beds were grown; drops odd ones', () => {
    const g = shed();
    g.gear = { can: 7, shovel: 1, sprinkler: 2 };
    setSprinkler(g, 'sprinkler', 100, -20, [0, 1], T0);
    const back = parseGarden(JSON.parse(JSON.stringify(g)));
    expect(back.gear).toEqual({ can: 7, shovel: 1, sprinkler: 1 });
    expect(back.gearStock).toEqual(g.gearStock);
    expect(back.spr).toEqual(g.spr);
    expect(back.at).toBe(T0);
    const odd = parseGarden({
      gear: { can: 500, shovel: 4, rake: 2 },
      spr: [
        { k: 'sprinkler', u: 0, v: 0, beds: [0, 99, -1, 'x'], from: T0, to: T0 + 60000 },
        { k: 'sprinkler', u: 0, v: 0, beds: [], from: T0, to: T0 + 3 * 3600 * 1000 },
        { k: 'hose', u: 0, v: 0, beds: [], from: T0, to: T0 + 1 },
      ],
    });
    expect(odd.gear).toEqual({ can: WATER.max, shovel: 1 });
    expect(odd.spr).toEqual([{ k: 'sprinkler', u: 0, v: 0, beds: [0], from: T0, to: T0 + 60000 }]);
    expect(untouchedGarden(noGarden())).toBe(true);
    expect(untouchedGarden({ seen: false, gear: { shovel: 1 } })).toBe(false);
  });

  it('draws a running sprinkler with a dial of its time left ashore, and a watering splash', () => {
    const g: Garden = { seen: true, gear: { sprinkler: 1 } };
    setSprinkler(g, 'sprinkler', 100, -20, [0], T0);
    const f = fakeView();
    const solids = gardenPlantSolids(f.v, g, sec(10), true);
    expect(solids).toHaveLength(1);
    for (const s of solids) s.f();
    expect(f.calls.arc ?? 0).toBeGreaterThan(10);
    expect(f.calls.fillText ?? 0).toBe(0);
    expect(gardenPlantSolids(fakeView().v, g, T0 + SPRINKLERS.sprinkler.ms + 1, true)).toHaveLength(
      0,
    );
    const s = fakeView();
    drawGardenSplash(s.v, 0, 0.5);
    expect(s.calls.arc ?? 0).toBe(10);
  });
});
