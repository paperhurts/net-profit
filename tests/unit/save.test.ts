import { describe, expect, it } from 'vitest';
import { ARMOUR_MAX } from '../../src/data/armour';
import { marked, noBattles } from '../../src/data/battle';
import { DEFAULT_CREW } from '../../src/data/crew';
import { OLD_START_FLAG } from '../../src/data/flag';
import { JUNK_MAX } from '../../src/data/junk';
import { SKIPPER } from '../../src/data/look';
import { skied } from '../../src/data/slalom';
import { HONEY_MAX } from '../../src/data/snacks';
import { SPEAR_MAX } from '../../src/data/spear';
import { climbed } from '../../src/data/treehouse';
import { LEGGY_MAX } from '../../src/entities/leggy';
import {
  type Bounds,
  DEFAULT_ORDER,
  defaultSave,
  EGG_STAGES,
  HERON_STAGES,
  ISLE3_STAGES,
  ISLE4_STAGES,
  ISLE5_STAGES,
  ISLE6_STAGES,
  ISLE7_STAGES,
  NEIL_FEEDS,
  OTTER_FEEDS,
  parseSave,
  SAVE_KEY,
  serializeSave,
} from '../../src/state/save';
import { TD } from '../../src/world/trench';

const bounds: Bounds = {
  maxLevel: 5,
  paints: 10,
  stages: 5,
  species: 12,
  worldSize: 4800,
  holdCaps: [12, 20, 32, 50, 80, 120],
};

/** A save the prototype wrote before the trip existed. It must keep loading. */
const legacy = JSON.stringify({
  coins: 1756,
  earned: 4021,
  muted: true,
  lv: { net: 4, hold: 5, engine: 3 },
  paint: 9,
  log: [259, 106, 127, 67, 21, 26, 2, 0, 0, 0, 1, 0],
  order: { sp: 3, n: 8, have: 2, pay: 75 },
  wood: 22,
  build: 3,
  levSeen: true,
});

describe('the save key', () => {
  it('is still netprofit.v1', () => {
    expect(SAVE_KEY).toBe('netprofit.v1');
  });
});

describe('parseSave', () => {
  it('loads a legacy save unchanged', () => {
    const s = parseSave(legacy, bounds);
    expect(s.coins).toBe(1756);
    expect(s.earned).toBe(4021);
    expect(s.muted).toBe(true);
    expect(s.lv).toEqual({ net: 4, hold: 5, engine: 3 });
    expect(s.paint).toBe(9);
    expect(s.log).toEqual([259, 106, 127, 67, 21, 26, 2, 0, 0, 0, 1, 0]);
    expect(s.order).toEqual({ sp: 3, n: 8, have: 2, pay: 75 });
    expect(s.wood).toBe(22);
    expect(s.build).toBe(3);
    expect(s.levSeen).toBe(true);
    expect(s.trip).toBeNull();
    expect(s.keys).toBe('drive');
  });

  it('keeps the keyboard setting and falls back to drive for anything odd', () => {
    expect(parseSave(JSON.stringify({ keys: 'point' }), bounds).keys).toBe('point');
    expect(parseSave(JSON.stringify({ keys: 'drive' }), bounds).keys).toBe('drive');
    expect(parseSave(JSON.stringify({ keys: 'sideways' }), bounds).keys).toBe('drive');
  });

  it('gives the defaults for nothing, garbage and non-objects', () => {
    for (const raw of [null, '', 'not json', '42', '"str"', 'null']) {
      expect(parseSave(raw, bounds)).toEqual(defaultSave(bounds));
    }
    expect(defaultSave(bounds).order).toEqual(DEFAULT_ORDER);
  });

  it('clamps every number the way the prototype did', () => {
    const s = parseSave(
      JSON.stringify({
        lv: { net: 9, hold: -1, engine: 2.7 },
        paint: 99,
        build: 7,
        wood: -3,
        coins: '12',
      }),
      bounds,
    );
    expect(s.lv).toEqual({ net: 5, hold: 0, engine: 2 });
    expect(s.paint).toBe(9);
    expect(s.build).toBe(5);
    expect(s.wood).toBe(0);
    expect(s.coins).toBe(12);
  });

  it('keeps a log of the wrong length in step with the species', () => {
    expect(parseSave(JSON.stringify({ log: [1, 2] }), bounds).log).toEqual([
      1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(parseSave(JSON.stringify({ log: new Array(20).fill(7) }), bounds).log).toHaveLength(12);
  });

  it('falls back to the default order when the saved one makes no sense', () => {
    expect(parseSave(JSON.stringify({ order: { sp: 99, n: 8 } }), bounds).order).toEqual(
      DEFAULT_ORDER,
    );
    expect(parseSave(JSON.stringify({ order: { sp: 2, n: 0 } }), bounds).order).toEqual(
      DEFAULT_ORDER,
    );
    expect(
      parseSave(JSON.stringify({ order: { sp: 2, n: 5, have: 1, pay: 20 } }), bounds).order,
    ).toEqual({
      sp: 2,
      n: 5,
      have: 1,
      pay: 20,
    });
  });

  it('restores a trip, clamped to the world and trimmed to the hold', () => {
    const s = parseSave(
      JSON.stringify({
        lv: { hold: 0 },
        trip: { x: 9999, y: -5, h: 1.25, clock: 1.7, hold: [20, 3, -1] },
      }),
      bounds,
    );
    expect(s.trip).toEqual({
      x: 4640,
      y: 160,
      h: 1.25,
      clock: 0.999,
      // 23 in a hold of 12: the excess comes off the cheapest species first.
      hold: [9, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
  });

  it('keeps a flagship out in the deep where it was, and no further than the deep runs', () => {
    const trip = JSON.stringify({ trip: { x: -700, y: 5300 } });
    expect(parseSave(trip, { ...bounds, deep: 1200 }).trip).toEqual({ x: -700, y: 5300 });
    expect(
      parseSave(JSON.stringify({ trip: { x: -9000, y: 9000 } }), { ...bounds, deep: 1200 }).trip,
    ).toEqual({
      x: -1040,
      y: 5840,
    });
    // Without the deep in the bounds, a trip is held inside the buoys as it always was.
    expect(parseSave(trip, bounds).trip).toEqual({ x: 160, y: 4640 });
  });

  it('applies only the trip fields that make sense', () => {
    const s = parseSave(
      JSON.stringify({ trip: { x: 'far', y: 100, h: 'nope', clock: 0.3 } }),
      bounds,
    );
    expect(s.trip).toEqual({ clock: 0.3 });
    expect(parseSave(JSON.stringify({ trip: 'nope' }), bounds).trip).toBeNull();
  });
});

describe('serializeSave', () => {
  it('round-trips a save and omits a missing trip', () => {
    const s = parseSave(legacy, bounds);
    const text = serializeSave(s);
    expect(text).not.toContain('trip');
    expect(parseSave(text, bounds)).toEqual(s);
  });

  it('keeps a trip through the round trip', () => {
    const s = parseSave(legacy, bounds);
    s.trip = { x: 2000, y: 2100, h: 0.5, clock: 0.42, hold: new Array(12).fill(1) };
    s.keys = 'point';
    expect(parseSave(serializeSave(s), bounds)).toEqual(s);
  });
});

describe('the fishmonger pick', () => {
  it('is none in a save from before the vendors, and survives a round trip', () => {
    const s = parseSave(legacy, bounds);
    expect(s.market).toBe(-1);
    s.market = 4;
    expect(parseSave(serializeSave(s), bounds).market).toBe(4);
  });

  it('is clamped to a species that exists', () => {
    expect(parseSave(JSON.stringify({ market: 99 }), bounds).market).toBe(bounds.species - 1);
    expect(parseSave(JSON.stringify({ market: -7 }), bounds).market).toBe(-1);
  });
});

describe('days and first catches', () => {
  it('start at day one with nothing caught in a save from before the guide, and round-trip', () => {
    const s = parseSave(legacy, bounds);
    expect(s.day).toBe(1);
    expect(s.first).toEqual(new Array(bounds.species).fill(0));
    s.day = 7;
    s.first[2] = 3;
    const back = parseSave(serializeSave(s), bounds);
    expect(back.day).toBe(7);
    expect(back.first[2]).toBe(3);
  });

  it('never go below day one or a first catch of never', () => {
    const s = parseSave(JSON.stringify({ day: -4, first: [-1, 2] }), bounds);
    expect(s.day).toBe(1);
    expect(s.first.slice(0, 2)).toEqual([0, 2]);
  });
});

describe('the whale sighting', () => {
  it('is unseen in a save from before the whales, and survives a round trip', () => {
    const s = parseSave(legacy, bounds);
    expect(s.whaleSeen).toBe(false);
    s.whaleSeen = true;
    expect(parseSave(serializeSave(s), bounds).whaleSeen).toBe(true);
  });
});

describe('the shipwright gear', () => {
  it('is unfitted in a save from before the shipwright, and survives a round trip', () => {
    const s = parseSave(legacy, bounds);
    expect(s.gear).toEqual({
      mesh: false,
      strongbox: false,
      suit: false,
      kit: false,
      rod: false,
      lionnet: false,
      tank: false,
      ballast: false,
      white: false,
      radar: false,
      radio: false,
    });
    s.gear.mesh = true;
    s.gear.suit = true;
    s.gear.tank = true;
    s.gear.white = true;
    s.gear.radar = true;
    expect(parseSave(serializeSave(s), bounds).gear).toEqual({
      mesh: true,
      strongbox: false,
      suit: true,
      kit: false,
      rod: false,
      lionnet: false,
      tank: true,
      ballast: false,
      white: true,
      radar: true,
      radio: false,
    });
  });

  it('reads anything odd as unfitted', () => {
    expect(parseSave(JSON.stringify({ gear: 'all of it' }), bounds).gear).toEqual({
      mesh: false,
      strongbox: false,
      suit: false,
      kit: false,
      rod: false,
      lionnet: false,
      tank: false,
      ballast: false,
      white: false,
      radar: false,
      radio: false,
    });
    // A save from before the chemistry suit and the mending kit has neither.
    expect(parseSave(JSON.stringify({ gear: { mesh: 1, hat: true } }), bounds).gear).toEqual({
      mesh: true,
      strongbox: false,
      suit: false,
      kit: false,
      rod: false,
      lionnet: false,
      tank: false,
      ballast: false,
      white: false,
      radar: false,
      radio: false,
    });
  });
});

describe('the manta sighting', () => {
  it('is unseen in a save from before the mantas, and survives a round trip', () => {
    const s = parseSave(legacy, bounds);
    expect(s.mantaSeen).toBe(false);
    s.mantaSeen = true;
    expect(parseSave(serializeSave(s), bounds).mantaSeen).toBe(true);
  });
});

describe('the Cthuluviathan sighting', () => {
  it('is unseen in a save from before it, and survives a round trip', () => {
    const s = parseSave(legacy, bounds);
    expect(s.cthuluSeen).toBe(false);
    s.cthuluSeen = true;
    expect(parseSave(serializeSave(s), bounds).cthuluSeen).toBe(true);
  });
});

describe('the anglerfish sighting', () => {
  it('is unseen in a save from before it, and survives a round trip', () => {
    const s = parseSave(legacy, bounds);
    expect(s.anglerSeen).toBe(false);
    s.anglerSeen = true;
    expect(parseSave(serializeSave(s), bounds).anglerSeen).toBe(true);
  });
});

describe('the dog', () => {
  it('is unpatted in a save from before you could pat it, and survives a round trip', () => {
    const s = parseSave(legacy, bounds);
    expect(s.petted).toBe(false);
    s.petted = true;
    expect(parseSave(serializeSave(s), bounds).petted).toBe(true);
  });
});

describe('island 2', () => {
  it('is unseen in a save from before it, and survives a round trip', () => {
    const s = parseSave(legacy, bounds);
    expect(s.isle2Seen).toBe(false);
    s.isle2Seen = true;
    expect(parseSave(serializeSave(s), bounds).isle2Seen).toBe(true);
  });
});

describe('island 3', () => {
  it('is unseen in a save from before it, and survives a round trip', () => {
    const s = parseSave(legacy, bounds);
    expect(s.isle3Seen).toBe(false);
    s.isle3Seen = true;
    expect(parseSave(serializeSave(s), bounds).isle3Seen).toBe(true);
  });

  it('has its story not begun in an old save, keeps each stage, and clamps nonsense', () => {
    const s = parseSave(legacy, bounds);
    expect(s.isle3Stage).toBe(0);
    s.isle3Stage = 2;
    expect(parseSave(serializeSave(s), bounds).isle3Stage).toBe(2);
    const o = JSON.parse(serializeSave(s));
    o.isle3Stage = 99;
    expect(parseSave(JSON.stringify(o), bounds).isle3Stage).toBe(ISLE3_STAGES);
    o.isle3Stage = -3;
    expect(parseSave(JSON.stringify(o), bounds).isle3Stage).toBe(0);
  });
});

describe('island 5', () => {
  it('is unseen in a save from before it, and survives a round trip', () => {
    const s = parseSave(legacy, bounds);
    expect(s.isle5Seen).toBe(false);
    s.isle5Seen = true;
    expect(parseSave(serializeSave(s), bounds).isle5Seen).toBe(true);
  });

  it('has the King alive in an old save, keeps him dead, and clamps nonsense', () => {
    const s = parseSave(legacy, bounds);
    expect(s.isle5Stage).toBe(0);
    s.isle5Stage = 1;
    expect(parseSave(serializeSave(s), bounds).isle5Stage).toBe(1);
    const o = JSON.parse(serializeSave(s));
    o.isle5Stage = 5;
    expect(parseSave(JSON.stringify(o), bounds).isle5Stage).toBe(ISLE5_STAGES);
  });
});

describe('island 6', () => {
  it('is unseen with no chests opened in an old save, keeps both, and clamps nonsense', () => {
    const s = parseSave(legacy, bounds);
    expect(s.isle6Seen).toBe(false);
    expect(s.chests6).toBe(0);
    s.isle6Seen = true;
    s.chests6 = 0b101101;
    const back = parseSave(serializeSave(s), bounds);
    expect(back.isle6Seen).toBe(true);
    expect(back.chests6).toBe(0b101101);
    expect(parseSave(JSON.stringify({ chests6: -4 }), bounds).chests6).toBe(0);
    expect(parseSave(JSON.stringify({ chests6: 'all' }), bounds).chests6).toBe(0);
  });

  it('has the Deep One at the surface in an old save, keeps each stage, and clamps nonsense', () => {
    const s = parseSave(legacy, bounds);
    expect(s.isle6Stage).toBe(0);
    s.isle6Stage = 1;
    expect(parseSave(serializeSave(s), bounds).isle6Stage).toBe(1);
    expect(parseSave(JSON.stringify({ isle6Stage: 9 }), bounds).isle6Stage).toBe(ISLE6_STAGES);
  });
});

describe('island 7', () => {
  it('is unseen in an old save and stays seen once sighted', () => {
    const s = parseSave(legacy, bounds);
    expect(s.isle7Seen).toBe(false);
    s.isle7Seen = true;
    expect(parseSave(serializeSave(s), bounds).isle7Seen).toBe(true);
    expect(parseSave(JSON.stringify({ isle7Seen: 'yes' }), bounds).isle7Seen).toBe(true);
    expect(parseSave(JSON.stringify({}), bounds).isle7Seen).toBe(false);
  });

  it('has the portal dead in an old save, keeps it awake, and clamps nonsense', () => {
    const s = parseSave(legacy, bounds);
    expect(s.isle7Stage).toBe(0);
    s.isle7Stage = 1;
    expect(parseSave(serializeSave(s), bounds).isle7Stage).toBe(1);
    expect(parseSave(JSON.stringify({ isle7Stage: 9 }), bounds).isle7Stage).toBe(ISLE7_STAGES);
    expect(parseSave(JSON.stringify({ isle7Stage: -2 }), bounds).isle7Stage).toBe(0);
  });
});

describe('island 4', () => {
  it('has its story not begun in an old save, keeps the Anchorer beaten, and clamps nonsense', () => {
    const s = parseSave(legacy, bounds);
    expect(s.isle4Stage).toBe(0);
    s.isle4Stage = 1;
    expect(parseSave(serializeSave(s), bounds).isle4Stage).toBe(1);
    const o = JSON.parse(serializeSave(s));
    o.isle4Stage = 7;
    expect(parseSave(JSON.stringify(o), bounds).isle4Stage).toBe(ISLE4_STAGES);
    o.isle4Stage = 'yes';
    expect(parseSave(JSON.stringify(o), bounds).isle4Stage).toBe(0);
  });
});

describe('the fishing log', () => {
  it('is empty in a save from before the snook, and survives a round trip', () => {
    const s = parseSave(legacy, bounds);
    expect(s.snook).toEqual({ casts: 0, landed: 0, kept: 0, giant: 0, best: 0, firstDay: 0 });
    s.snook = { casts: 61, landed: 5, kept: 1, giant: 0, best: 31, firstDay: 4 };
    expect(parseSave(serializeSave(s), bounds).snook).toEqual(s.snook);
  });

  it('never goes negative', () => {
    const s = parseSave(
      JSON.stringify({ snook: { casts: -3, landed: 'two', best: 29.7 } }),
      bounds,
    );
    expect(s.snook).toEqual({ casts: 0, landed: 0, kept: 0, giant: 0, best: 29, firstDay: 0 });
  });
});

describe('the flag', () => {
  it('is the old pennant in a save from before flags, survives a round trip, and drops nonsense', () => {
    const s = parseSave(legacy, bounds);
    expect(s.flag).toBeNull();
    s.flag = { field: 8, accent: 2, pattern: 3, emblem: 3 };
    expect(parseSave(serializeSave(s), bounds).flag).toEqual(s.flag);
    const bad = JSON.parse(serializeSave(s));
    bad.flag = { field: 99, accent: 2, pattern: 3, emblem: 3 };
    expect(parseSave(JSON.stringify(bad), bounds).flag).toBeNull();
  });

  it('lets go of the old first flag, red with a gold star, so the new one shows; any other design is kept', () => {
    const s = parseSave(legacy, bounds);
    s.flag = { ...OLD_START_FLAG };
    expect(parseSave(serializeSave(s), bounds).flag).toBeNull();
    s.flag = { ...OLD_START_FLAG, emblem: 2 };
    expect(parseSave(serializeSave(s), bounds).flag).toEqual(s.flag);
  });
});

describe('the turtles', () => {
  it('are unseen in a save from before them, survive a round trip, and never count below none', () => {
    const s = parseSave(legacy, bounds);
    expect(s.turtleSeen).toBe(false);
    expect(s.turtleSwims).toBe(0);
    s.turtleSeen = true;
    s.turtleSwims = 4;
    const back = parseSave(serializeSave(s), bounds);
    expect(back.turtleSeen).toBe(true);
    expect(back.turtleSwims).toBe(4);
    const bad = JSON.parse(serializeSave(s));
    bad.turtleSwims = -7;
    expect(parseSave(JSON.stringify(bad), bounds).turtleSwims).toBe(0);
  });
});

describe('the leviathans driven off', () => {
  it('are none in a save from before the harpoon, survive a round trip, and shrug off junk', () => {
    const s = parseSave(legacy, bounds);
    expect(s.driven).toEqual({ guard: 0, cthulu: 0, angler: 0, gulper: 0, meteor: 0, reaper: 0 });
    expect(s.meteorSeen).toBe(false);
    s.driven.gulper = 2;
    s.driven.angler = 1;
    expect(parseSave(serializeSave(s), bounds).driven).toEqual({
      guard: 0,
      cthulu: 0,
      angler: 1,
      gulper: 2,
      meteor: 0,
      reaper: 0,
    });
    const bad = JSON.parse(serializeSave(s));
    bad.driven = { gulper: 'lots', cthulu: -3, guard: 2.7, kraken: 9 };
    expect(parseSave(JSON.stringify(bad), bounds).driven).toEqual({
      guard: 2,
      cthulu: 0,
      angler: 0,
      gulper: 0,
      meteor: 0,
      reaper: 0,
    });
    bad.driven = 'nope';
    expect(parseSave(JSON.stringify(bad), bounds).driven.gulper).toBe(0);
  });

  it('count the meteor serpent too, as none in a save from before it, and keep it sighted', () => {
    const old = JSON.parse(serializeSave(parseSave(legacy, bounds)));
    old.driven = { guard: 1, cthulu: 0, angler: 2, gulper: 0 };
    delete old.meteorSeen;
    const s = parseSave(JSON.stringify(old), bounds);
    expect(s.driven).toEqual({ guard: 1, cthulu: 0, angler: 2, gulper: 0, meteor: 0, reaper: 0 });
    expect(s.meteorSeen).toBe(false);
    s.driven.meteor = 3;
    s.meteorSeen = true;
    const back = parseSave(serializeSave(s), bounds);
    expect(back.driven.meteor).toBe(3);
    expect(back.meteorSeen).toBe(true);
  });

  it('count the Reaper too, as none in a save from before him, and keep him sighted', () => {
    const old = JSON.parse(serializeSave(parseSave(legacy, bounds)));
    old.driven = { guard: 1, cthulu: 0, angler: 0, gulper: 0, meteor: 2 };
    delete old.reaperSeen;
    const s = parseSave(JSON.stringify(old), bounds);
    expect(s.driven.reaper).toBe(0);
    expect(s.driven.meteor).toBe(2);
    expect(s.reaperSeen).toBe(false);
    s.driven.reaper = 1;
    s.reaperSeen = true;
    const back = parseSave(serializeSave(s), bounds);
    expect(back.driven.reaper).toBe(1);
    expect(back.reaperSeen).toBe(true);
  });

  it('keep the Reaper on land sighted and his egg, as neither in a save from before him', () => {
    const old = JSON.parse(serializeSave(parseSave(legacy, bounds)));
    delete old.reaperLandSeen;
    delete old.reaperEgg;
    const s = parseSave(JSON.stringify(old), bounds);
    expect(s.reaperLandSeen).toBe(false);
    expect(s.reaperEgg).toBe(0);
    s.reaperLandSeen = true;
    s.reaperEgg = 2;
    const back = parseSave(serializeSave(s), bounds);
    expect(back.reaperLandSeen).toBe(true);
    expect(back.reaperEgg).toBe(2);
    expect(parseSave(JSON.stringify({ ...s, reaperEgg: 7 }), bounds).reaperEgg).toBe(EGG_STAGES);
    expect(parseSave(JSON.stringify({ ...s, reaperEgg: -1 }), bounds).reaperEgg).toBe(0);
  });

  it("keep the flotilla's crew, as the starting crew in a save from before the Boats card", () => {
    const old = JSON.parse(serializeSave(parseSave(legacy, bounds)));
    delete old.crew;
    const s = parseSave(JSON.stringify(old), bounds);
    expect(s.crew).toEqual(DEFAULT_CREW);
    s.crew = {
      airboat: 'tarling',
      catamaran: null,
      windsurf: 'necro',
      banana: 'warrior',
      swan: 'caterman',
      swan2: 'bones',
    };
    expect(parseSave(serializeSave(s), bounds).crew).toEqual(s.crew);
  });

  it('keep the leggy muffins, as none in a save from before they grew legs, and never more than six', () => {
    const old = JSON.parse(serializeSave(parseSave(legacy, bounds)));
    delete old.leggy;
    const s = parseSave(JSON.stringify(old), bounds);
    expect(s.leggy).toBe(0);
    s.leggy = 4;
    expect(parseSave(serializeSave(s), bounds).leggy).toBe(4);
    expect(parseSave(JSON.stringify({ ...old, leggy: 40 }), bounds).leggy).toBe(LEGGY_MAX);
  });

  it('keep the junk in the bucket and the muffin box, as none in a save from before the muffin man baked', () => {
    const old = JSON.parse(serializeSave(parseSave(legacy, bounds)));
    delete old.junk;
    delete old.muffins;
    const s = parseSave(JSON.stringify(old), bounds);
    expect(s.junk).toBe(0);
    expect(s.muffins).toEqual([]);
    s.junk = 5;
    s.muffins = [3.25, 4.5];
    const back = parseSave(serializeSave(s), bounds);
    expect(back.junk).toBe(5);
    expect(back.muffins).toEqual([3.25, 4.5]);
    // Never more than the bucket and the box hold, and nothing that is not a time.
    const big = parseSave(
      JSON.stringify({ ...old, junk: 99, muffins: [1, 'x', -2, 2, 3, 4, 5, 6, 7, 8] }),
      bounds,
    );
    expect(big.junk).toBe(JUNK_MAX);
    expect(big.muffins).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('keep the day the egg came aboard, and the baby Reaper hatched, as day 0 in a save from before', () => {
    const old = JSON.parse(serializeSave(parseSave(legacy, bounds)));
    delete old.eggDay;
    old.reaperEgg = 2;
    const s = parseSave(JSON.stringify(old), bounds);
    expect(s.eggDay).toBe(0);
    s.eggDay = 12;
    expect(parseSave(serializeSave(s), bounds).eggDay).toBe(12);
    s.reaperEgg = 3;
    expect(EGG_STAGES).toBe(3);
    expect(parseSave(serializeSave(s), bounds).reaperEgg).toBe(3);
    expect(parseSave(JSON.stringify({ ...s, eggDay: -4 }), bounds).eggDay).toBe(0);
    expect(parseSave(JSON.stringify({ ...s, eggDay: 'x' }), bounds).eggDay).toBe(0);
  });

  it('keep the ice floe found and the drops through its hole, as nothing in a save from before them', () => {
    const old = JSON.parse(serializeSave(parseSave(legacy, bounds)));
    delete old.iceSeen;
    delete old.iceRuns;
    const s = parseSave(JSON.stringify(old), bounds);
    expect([s.iceSeen, s.iceRuns]).toEqual([false, 0]);
    s.iceSeen = true;
    s.iceRuns = 7;
    const back = parseSave(serializeSave(s), bounds);
    expect([back.iceSeen, back.iceRuns]).toEqual([true, 7]);
    const bad = JSON.parse(serializeSave(s));
    bad.iceRuns = 'lots';
    expect(parseSave(JSON.stringify(bad), bounds).iceRuns).toBe(0);
  });
});

describe('armour', () => {
  it('is none in a save from before it, survives a round trip, and keeps to its levels', () => {
    const s = parseSave(legacy, bounds);
    expect(s.armour).toBe(0);
    s.armour = 3;
    expect(parseSave(serializeSave(s), bounds).armour).toBe(3);
    const bad = JSON.parse(serializeSave(s));
    bad.armour = 99;
    expect(parseSave(JSON.stringify(bad), bounds).armour).toBe(ARMOUR_MAX);
    bad.armour = 'gold';
    expect(parseSave(JSON.stringify(bad), bounds).armour).toBe(0);
  });
});

describe('the sea map', () => {
  it('is empty in a save from before it, keeps a short string, and drops a long one', () => {
    const s = parseSave(legacy, bounds);
    expect(s.sailed).toBe('');
    s.sailed = 'AAAA';
    expect(parseSave(serializeSave(s), bounds).sailed).toBe('AAAA');
    const bad = JSON.parse(serializeSave(s));
    bad.sailed = 'x'.repeat(5000);
    expect(parseSave(JSON.stringify(bad), bounds).sailed).toBe('');
    bad.sailed = 7;
    expect(parseSave(JSON.stringify(bad), bounds).sailed).toBe('');
  });
});

describe('the spear', () => {
  it('is none in a save from before it, survives a round trip, and is kept to the levels there are', () => {
    const s = parseSave(legacy, bounds);
    expect(s.spear).toBe(0);
    s.spear = 2;
    expect(parseSave(serializeSave(s), bounds).spear).toBe(2);
    const bad = JSON.parse(serializeSave(s));
    bad.spear = 99;
    expect(parseSave(JSON.stringify(bad), bounds).spear).toBe(SPEAR_MAX);
  });
});

describe('the aquarium', () => {
  it('is not built in a save from before it, and stays built once it is', () => {
    const s = parseSave(legacy, bounds);
    expect(s.aquarium).toBe(false);
    s.aquarium = true;
    expect(parseSave(serializeSave(s), bounds).aquarium).toBe(true);
    const bad = JSON.parse(serializeSave(s));
    bad.aquarium = 0;
    expect(parseSave(JSON.stringify(bad), bounds).aquarium).toBe(false);
  });
});

describe('the naga', () => {
  it('is still in his cage in a save from before him, and stays free once freed', () => {
    const s = parseSave(legacy, bounds);
    expect(s.nagaFree).toBe(false);
    s.nagaFree = true;
    expect(parseSave(serializeSave(s), bounds).nagaFree).toBe(true);
  });
});

describe('the otter', () => {
  it('is wild in a save from before him, and keeps how many fish he has had, within reason', () => {
    const s = parseSave(legacy, bounds);
    expect(s.otterFed).toBe(0);
    s.otterFed = 2;
    expect(parseSave(serializeSave(s), bounds).otterFed).toBe(2);
    expect(parseSave(JSON.stringify({ ...s, otterFed: 50 }), bounds).otterFed).toBe(OTTER_FEEDS);
  });
});

describe('the things frozen in the ice', () => {
  it('are all still there in a save from before them, and stay found once chipped out', () => {
    const s = parseSave(legacy, bounds);
    expect(s.iceLoot).toBe(0);
    s.iceLoot = 0b10011;
    expect(parseSave(serializeSave(s), bounds).iceLoot).toBe(0b10011);
    // Bits past the last one mean nothing.
    expect(parseSave(JSON.stringify({ ...s, iceLoot: 0xff }), bounds).iceLoot).toBe(0b11111);
  });
});

describe('Neil the seal', () => {
  it('is wild in a save from before him, and keeps how many ice fish he has had, within reason', () => {
    const s = parseSave(legacy, bounds);
    expect(s.neilFed).toBe(0);
    s.neilFed = 2;
    expect(parseSave(serializeSave(s), bounds).neilFed).toBe(2);
    expect(parseSave(JSON.stringify({ ...s, neilFed: 9 }), bounds).neilFed).toBe(NEIL_FEEDS);
    expect(parseSave(JSON.stringify({ ...s, neilFed: -3 }), bounds).neilFed).toBe(0);
  });
});

describe('bases', () => {
  it('have nothing built in a save from before them, and keep each stage once built', () => {
    const s = parseSave(legacy, bounds);
    expect(s.bases).toEqual({ isle2: 0, isle3: 0, isle6: 0, floe: 0 });
    s.bases.isle2 = 1;
    expect(parseSave(serializeSave(s), bounds).bases).toEqual({
      isle2: 1,
      isle3: 0,
      isle6: 0,
      floe: 0,
    });
  });
});

describe('crab pots', () => {
  it('are none in a save from before them, and keep where they are and their crabs', () => {
    const s = parseSave(legacy, bounds);
    expect(s.pots).toEqual([]);
    s.pots = [{ x: 3000, y: 2000, crabs: 4, t: 12.5 }];
    expect(parseSave(serializeSave(s), bounds).pots).toEqual([
      { x: 3000, y: 2000, crabs: 4, t: 12.5 },
    ]);
  });
});

describe('the trench', () => {
  it('is unfound in a save from before it, and keeps the deepest dive within the trench', () => {
    const s = parseSave(legacy, bounds);
    expect(s.trenchSeen).toBe(false);
    expect(s.trenchDeep).toBe(0);
    s.trenchSeen = true;
    s.trenchDeep = 1234;
    const back = parseSave(serializeSave(s), bounds);
    expect([back.trenchSeen, back.trenchDeep]).toEqual([true, 1234]);
    expect(parseSave(JSON.stringify({ ...s, trenchDeep: 99999 }), bounds).trenchDeep).toBe(TD);
  });
});

describe('the metal bridge', () => {
  it('is unseen in a save from before it, and stays seen once it is', () => {
    const s = parseSave(legacy, bounds);
    expect(s.bridgeSeen).toBe(false);
    s.bridgeSeen = true;
    expect(parseSave(serializeSave(s), bounds).bridgeSeen).toBe(true);
  });

  it('has stealth mission 1 not won and no potion in a save from before it, and keeps both once had', () => {
    const s = parseSave(legacy, bounds);
    expect([s.stealth1, s.invis]).toEqual([false, false]);
    s.stealth1 = true;
    s.invis = true;
    const back = parseSave(serializeSave(s), bounds);
    expect([back.stealth1, back.invis]).toEqual([true, true]);
  });

  it('has not been inside in a save from before it, and remembers having been', () => {
    const s = parseSave(legacy, bounds);
    expect(s.bridgeIn).toBe(false);
    s.bridgeIn = true;
    expect(parseSave(serializeSave(s), bounds).bridgeIn).toBe(true);
  });
});

describe('who stays at the castle', () => {
  it('is nobody in a save from before the roll-call board, and keeps who was left there', () => {
    const s = parseSave(legacy, bounds);
    expect(s.stay).toEqual([]);
    s.stay = ['warlock', 'cat'];
    expect(parseSave(serializeSave(s), bounds).stay).toEqual(['warlock', 'cat']);
  });

  it('reads nobody it does not know, and each friend once', () => {
    const s = parseSave(legacy, bounds);
    const odd = { ...JSON.parse(serializeSave(s)), stay: ['naga', 'dragon', 'naga', 3, null] };
    expect(parseSave(JSON.stringify(odd), bounds).stay).toEqual(['naga']);
    expect(parseSave(JSON.stringify({ ...odd, stay: 'naga' }), bounds).stay).toEqual([]);
  });
});

describe("the tar ocean's fish", () => {
  it('has none caught in a save from before them, and keeps the day, the dozen taken and the bucket', () => {
    const s = parseSave(legacy, bounds);
    expect([s.tarDay, s.tarTaken, s.tarBucket, s.tarCaught]).toEqual([0, 0, 0, 0]);
    s.tarDay = 9;
    s.tarTaken = 0b101000000011;
    s.tarBucket = 4;
    s.tarCaught = 7;
    const r = parseSave(serializeSave(s), bounds);
    expect([r.tarDay, r.tarTaken, r.tarBucket, r.tarCaught]).toEqual([9, 0b101000000011, 4, 7]);
  });

  it('has the tar leader unbeaten in a save from before him, and keeps him beaten', () => {
    const s = parseSave(legacy, bounds);
    expect(s.tarLeaderBeaten).toBe(false);
    s.tarLeaderBeaten = true;
    expect(parseSave(serializeSave(s), bounds).tarLeaderBeaten).toBe(true);
  });

  it('has mission 2 not taken in a save from before the tar eel, and keeps where it got to', () => {
    const s = parseSave(legacy, bounds);
    expect(s.eelStage).toBe(0);
    for (const n of [1, 2]) {
      s.eelStage = n;
      expect(parseSave(serializeSave(s), bounds).eelStage).toBe(n);
    }
    expect(
      parseSave(JSON.stringify({ ...JSON.parse(serializeSave(s)), eelStage: 9 }), bounds).eelStage,
    ).toBe(2);
  });

  it('has the tar island unvisited in a save from before it, and keeps it visited', () => {
    const s = parseSave(legacy, bounds);
    expect(s.tarIsleSeen).toBe(false);
    s.tarIsleSeen = true;
    expect(parseSave(serializeSave(s), bounds).tarIsleSeen).toBe(true);
  });

  it('keeps only the dozen bits, and never fewer caught than are in the bucket', () => {
    const s = parseSave(legacy, bounds);
    const odd = {
      ...JSON.parse(serializeSave(s)),
      tarTaken: 0xffff,
      tarBucket: 5,
      tarCaught: 2,
      tarDay: -3,
    };
    const r = parseSave(JSON.stringify(odd), bounds);
    expect([r.tarDay, r.tarTaken, r.tarBucket, r.tarCaught]).toEqual([0, 0xfff, 5, 5]);
  });
});

describe('the abyss', () => {
  it('is unseen and undived in a save from before it, and stays seen and dived once it is', () => {
    const s = parseSave(legacy, bounds);
    expect([s.abyssSeen, s.abyssDown]).toEqual([false, false]);
    s.abyssSeen = true;
    s.abyssDown = true;
    const back = parseSave(serializeSave(s), bounds);
    expect([back.abyssSeen, back.abyssDown]).toEqual([true, true]);
  });

  it('has the Remoro on its floor in a save from before it, and keeps the day it was landed', () => {
    const s = parseSave(legacy, bounds);
    expect(s.remoroDay).toBe(0);
    s.remoroDay = 7;
    expect(parseSave(serializeSave(s), bounds).remoroDay).toBe(7);
    expect(parseSave(JSON.stringify({ ...s, remoroDay: -3 }), bounds).remoroDay).toBe(0);
  });

  it('has nothing built at your headquarters in a save from before its upgrades, and keeps what is', () => {
    const s = parseSave(legacy, bounds);
    expect([s.hq.garden, s.hq.dock, s.hq.forge, s.hq.tower, s.gardenDay]).toEqual([
      false,
      false,
      false,
      false,
      0,
    ]);
    s.hq.garden = true;
    s.gardenDay = 3;
    const back = parseSave(serializeSave(s), bounds);
    expect([back.hq.garden, back.hq.forge, back.gardenDay]).toEqual([true, false, 3]);
    expect([s.sharp, parseSave(serializeSave({ ...s, sharp: true }), bounds).sharp]).toEqual([
      false,
      true,
    ]);
  });

  it('has the attack nibbler hunting in a save from before it, and keeps the day it was landed', () => {
    const s = parseSave(legacy, bounds);
    expect(s.hunterDay).toBe(0);
    s.hunterDay = 4;
    expect(parseSave(serializeSave(s), bounds).hunterDay).toBe(4);
  });
});

describe('islands 8 and 9', () => {
  it('are unseen in a save from before them, and stay seen once sighted', () => {
    const s = parseSave(legacy, bounds);
    expect(s.isle8Seen).toBe(false);
    s.isle8Seen = true;
    expect(parseSave(serializeSave(s), bounds).isle8Seen).toBe(true);
  });

  it('keep where the Heron is: unmet in an old save, and his stage kept, within its range', () => {
    const s = parseSave(legacy, bounds);
    expect(s.heronStage).toBe(0);
    s.heronStage = 1;
    expect(parseSave(serializeSave(s), bounds).heronStage).toBe(1);
    expect(parseSave(JSON.stringify({ ...s, heronStage: 9 }), bounds).heronStage).toBe(
      HERON_STAGES,
    );
    expect(parseSave(JSON.stringify({ ...s, heronStage: -3 }), bounds).heronStage).toBe(0);
  });

  it('keep who the figure is: Skipper in an old save, and a picked look kept', () => {
    const s = parseSave(legacy, bounds);
    expect(s.look).toEqual(SKIPPER);
    s.look = { ...SKIPPER, hat: 'cowboy', hair: 'spiky', honorGuard: true };
    expect(parseSave(serializeSave(s), bounds).look).toEqual(s.look);
  });

  it("owe the Heron's escape to a save that beat him before it existed, and keep it played once it has", () => {
    const s = parseSave(
      JSON.stringify({ ...JSON.parse(legacy), heronStage: HERON_STAGES }),
      bounds,
    );
    expect(s.heronFled).toBe(false);
    s.heronFled = true;
    expect(parseSave(serializeSave(s), bounds).heronFled).toBe(true);
    // He cannot have got away from a fight that has not been won.
    expect(parseSave(JSON.stringify({ ...s, heronStage: 1 }), bounds).heronFled).toBe(false);
  });

  it('read island 11 as not found in an old save, and keep it found once it is', () => {
    const s = parseSave(legacy, bounds);
    expect(s.isle11Seen).toBe(false);
    s.isle11Seen = true;
    expect(parseSave(serializeSave(s), bounds).isle11Seen).toBe(true);
  });

  it('read Skull Island as not found in an old save, and keep it found once it is', () => {
    const s = parseSave(legacy, bounds);
    expect(s.isle12Seen).toBe(false);
    s.isle12Seen = true;
    expect(parseSave(serializeSave(s), bounds).isle12Seen).toBe(true);
  });

  it('read Caterman as not yet with you in an old save, and keep him once he is', () => {
    const s = parseSave(legacy, bounds);
    expect(s.catermanFree).toBe(false);
    s.catermanFree = true;
    expect(parseSave(serializeSave(s), bounds).catermanFree).toBe(true);
  });

  it('read the skull key as still in the lagoon in an old save, and keep it once fetched', () => {
    const s = parseSave(legacy, bounds);
    expect(s.skullKey).toBe(false);
    s.skullKey = true;
    expect(parseSave(serializeSave(s), bounds).skullKey).toBe(true);
  });

  it("read the Battle Barge as its start in an old save, and keep the kid's setup and wins", () => {
    const s = parseSave(legacy, bounds);
    expect(s.barge.size).toBe('medium');
    expect(s.bargeWins).toBe(0);
    s.barge = { ...s.barge, size: 'large', pick: { ...s.barge.pick, zombie: 4 } };
    s.bargeWins = 3;
    const t = parseSave(serializeSave(s), bounds);
    expect(t.barge.size).toBe('large');
    expect(t.barge.pick.zombie).toBe(4);
    expect(t.bargeWins).toBe(3);
  });

  it('read the crypt as not won in an old save, and keep it won once it is', () => {
    const s = parseSave(legacy, bounds);
    expect(s.cryptWon).toBe(false);
    s.cryptWon = true;
    expect(parseSave(serializeSave(s), bounds).cryptWon).toBe(true);
  });

  it('read Gigantis as not yet yours, and no scanner, in an old save, and keep both once given', () => {
    const s = parseSave(legacy, bounds);
    expect(s.castleHQ).toBe(false);
    expect(s.scanner).toBe(0);
    s.castleHQ = true;
    s.scanner = 1;
    const t = parseSave(serializeSave(s), bounds);
    expect(t.castleHQ).toBe(true);
    expect(t.scanner).toBe(1);
    expect(
      parseSave(JSON.stringify({ ...JSON.parse(serializeSave(s)), scanner: -2 }), bounds).scanner,
    ).toBe(0);
  });
});

describe("island 10's spider and pelican", () => {
  it('an old save has no bug spray, no pelican beaten and no bread; they keep, within their ranges', () => {
    const s = parseSave(legacy, bounds);
    expect([s.bugSpray, s.pelicanBeaten, s.bread]).toEqual([0, false, 0]);
    s.bugSpray = 12;
    s.pelicanBeaten = true;
    s.bread = 1;
    const back = parseSave(serializeSave(s), bounds);
    expect([back.bugSpray, back.pelicanBeaten, back.bread]).toEqual([12, true, 1]);
    const silly = parseSave(JSON.stringify({ ...s, bugSpray: 500, bread: -2 }), bounds);
    expect([silly.bugSpray, silly.bread]).toEqual([30, 0]);
  });
});

describe('honey for the Reapers', () => {
  it('an old save has none and the hive never visited; they keep, the jars within the bag', () => {
    const s = parseSave(legacy, bounds);
    expect([s.honey, s.hiveDay]).toEqual([0, 0]);
    s.honey = 3;
    s.hiveDay = 12;
    const back = parseSave(serializeSave(s), bounds);
    expect([back.honey, back.hiveDay]).toEqual([3, 12]);
    const silly = parseSave(JSON.stringify({ ...s, honey: 99, hiveDay: -4 }), bounds);
    expect([silly.honey, silly.hiveDay]).toEqual([HONEY_MAX, 0]);
    expect(parseSave(JSON.stringify({ ...s, honey: 'lots' }), bounds).honey).toBe(0);
  });
});

describe("island 10's birdfeeder and crows", () => {
  it('an old save has an empty feeder and no crows; they keep, the crows no more than there are', () => {
    const s = parseSave(legacy, bounds);
    expect([s.feederFull, s.crows]).toEqual([false, 0]);
    s.feederFull = true;
    s.crows = 2;
    const back = parseSave(serializeSave(s), bounds);
    expect([back.feederFull, back.crows]).toEqual([true, 2]);
    expect(parseSave(JSON.stringify({ ...s, crows: 40 }), bounds).crows).toBe(3);
    expect(parseSave(JSON.stringify({ ...s, crows: -1 }), bounds).crows).toBe(0);
  });
});

describe('the treasure finder and the sunken treasure', () => {
  it('an old save has no finder and no treasure found; they keep, within range', () => {
    const s = parseSave(legacy, bounds);
    expect([s.finder, s.sunkenDay, s.sunkenFound]).toEqual([false, 0, 0]);
    s.finder = true;
    s.sunkenDay = 12;
    s.sunkenFound = 0b1010;
    const back = parseSave(serializeSave(s), bounds);
    expect([back.finder, back.sunkenDay, back.sunkenFound]).toEqual([true, 12, 0b1010]);
    expect(parseSave(JSON.stringify({ ...s, sunkenFound: 1e9 }), bounds).sunkenFound).toBe(255);
    expect(parseSave(JSON.stringify({ ...s, sunkenDay: -4 }), bounds).sunkenDay).toBe(0);
  });
});

describe("the companions' badges", () => {
  it('an old save has no badges; they keep, pinned where they were', () => {
    const s = parseSave(legacy, bounds);
    expect(s.badges).toEqual({
      shield: 0,
      damage: false,
      heal: false,
      on: { shield: null, damage: null, heal: null },
    });
    s.badges = {
      shield: 2,
      damage: true,
      heal: false,
      on: { shield: 'cat', damage: 'warlock', heal: null },
    };
    expect(parseSave(serializeSave(s), bounds).badges).toEqual(s.badges);
  });
});

describe('the treasure submarine', () => {
  it('an old save has no submarine and nothing found by it; they keep', () => {
    const s = parseSave(legacy, bounds);
    expect([s.sub, s.subFound]).toEqual([false, { day: 0, patches: {} }]);
    s.sub = true;
    s.subFound = { day: 9, patches: { '7,-2': 3 } };
    const back = parseSave(serializeSave(s), bounds);
    expect([back.sub, back.subFound]).toEqual([true, { day: 9, patches: { '7,-2': 3 } }]);
  });
});

describe("the Shark King's last words, owed to a skipped game", () => {
  it('an old save owes nothing; owed, it keeps until they are seen', () => {
    const s = parseSave(legacy, bounds);
    expect(s.kingOwed).toBe(false);
    s.kingOwed = true;
    expect(parseSave(serializeSave(s), bounds).kingOwed).toBe(true);
  });
});

describe('the drone', () => {
  it('an old save has none; bought, its colour, flights and best keep, the colour one of its own', () => {
    const s = parseSave(legacy, bounds);
    const none = [-1, -1, -1, -1, -1];
    const up = { battery: 0, handling: 0, traps: 0, line: 0 };
    expect(s.drone).toEqual({
      owned: false,
      colour: 0,
      flights: 0,
      bestRings: 0,
      traps: none,
      beetles: 0,
      up,
    });
    s.drone = { owned: true, colour: 4, flights: 3, bestRings: 17, traps: none, beetles: 0, up };
    expect(parseSave(serializeSave(s), bounds).drone).toEqual(s.drone);
    const odd = parseSave(
      JSON.stringify({ ...s, drone: { owned: 1, colour: 99, flights: -4 } }),
      bounds,
    );
    expect(odd.drone).toEqual({
      owned: true,
      colour: 8,
      flights: 0,
      bestRings: 0,
      traps: none,
      beetles: 0,
      up,
    });
  });

  it('keeps the day each trap was hung and the beetles, never more hung than there are flowers', () => {
    const s = parseSave(legacy, bounds);
    s.drone = { ...s.drone, owned: true, traps: [4, -1, 6, -1, -1], beetles: 9 };
    const back = parseSave(serializeSave(s), bounds).drone;
    expect([back.traps, back.beetles]).toEqual([[4, -1, 6, -1, -1], 9]);
    const odd = parseSave(
      JSON.stringify({ ...s, drone: { owned: true, traps: [1, 2, 3, 4, 'x', 7], beetles: 1e6 } }),
      bounds,
    ).drone;
    expect([odd.traps, odd.beetles]).toEqual([[1, 2, 3, 4, -1], 99]);
  });

  it('is left out of the save until touched, keeping the copy-my-game link short', () => {
    const s = parseSave(legacy, bounds);
    expect(JSON.parse(serializeSave(s))).not.toHaveProperty('drone');
    s.drone = { ...s.drone, colour: 2 };
    expect(JSON.parse(serializeSave(s)).drone.colour).toBe(2);
  });
});

describe("the drone's upgrades", () => {
  it('keeps each one at its level, 0 to 2; an older drone has none', () => {
    const s = parseSave(legacy, bounds);
    s.drone = { ...s.drone, owned: true, up: { battery: 2, handling: 1, traps: 0, line: 2 } };
    expect(parseSave(serializeSave(s), bounds).drone.up).toEqual({
      battery: 2,
      handling: 1,
      traps: 0,
      line: 2,
    });
    const odd = parseSave(
      JSON.stringify({ ...s, drone: { owned: true, up: { battery: 9, handling: -3, line: 'x' } } }),
      bounds,
    ).drone.up;
    expect(odd).toEqual({ battery: 2, handling: 0, traps: 0, line: 0 });
  });
});

describe('the mermaids', () => {
  it('an old save has not seen them; seen, it keeps it, and an unseen one is left out of the save', () => {
    const s = parseSave(legacy, bounds);
    const none = { seen: false, pearls: 0, given: 0, night: -1, charm: false, sirens: false };
    expect(s.mer).toEqual(none);
    expect(JSON.parse(serializeSave(s))).not.toHaveProperty('mer');
    s.mer = { ...none, seen: true };
    expect(parseSave(serializeSave(s), bounds).mer).toEqual({ ...none, seen: true });
    expect(parseSave(JSON.stringify({ ...s, mer: 'yes' }), bounds).mer).toEqual(none);
  });

  it('keeps their pearls, never more held than given, and the night of the last; seen only, it had none', () => {
    const s = parseSave(legacy, bounds);
    s.mer = { seen: true, pearls: 2, given: 3, night: 14, charm: false, sirens: false };
    expect(parseSave(serializeSave(s), bounds).mer).toEqual(s.mer);
    const odd = parseSave(
      JSON.stringify({ ...s, mer: { pearls: 9, given: 4, night: -7 } }),
      bounds,
    ).mer;
    expect(odd).toEqual({
      seen: true,
      pearls: 4,
      given: 4,
      night: -1,
      charm: false,
      sirens: false,
    });
    expect(parseSave(JSON.stringify({ ...s, mer: { seen: true } }), bounds).mer).toEqual({
      seen: true,
      pearls: 0,
      given: 0,
      night: -1,
      charm: false,
      sirens: false,
    });
  });

  it('keeps the charm strung from five of their pearls', () => {
    const s = parseSave(legacy, bounds);
    s.mer = { seen: true, pearls: 1, given: 6, night: 20, charm: true, sirens: true };
    expect(parseSave(serializeSave(s), bounds).mer).toEqual(s.mer);
  });
});

describe('the Endless Isle', () => {
  it('an old save has not sighted it; sighted, it keeps it, and an unsighted one is left out of the save', () => {
    const s = parseSave(legacy, bounds);
    const none = { seen: false, pirate: false, ninja: false };
    expect(s.endless).toEqual(none);
    expect(JSON.parse(serializeSave(s))).not.toHaveProperty('endless');
    s.endless = { ...none, seen: true };
    expect(parseSave(serializeSave(s), bounds).endless).toEqual({ ...none, seen: true });
    expect(parseSave(JSON.stringify({ ...s, endless: 'yes' }), bounds).endless).toEqual(none);
    // A save from part one has only whether it was seen.
    expect(parseSave(JSON.stringify({ ...s, endless: { seen: 1 } }), bounds).endless).toEqual({
      ...none,
      seen: true,
    });
  });

  it('keeps the sides joined, either or both, and nothing that is not a yes', () => {
    const s = parseSave(legacy, bounds);
    s.endless = { seen: true, pirate: true, ninja: false };
    expect(parseSave(serializeSave(s), bounds).endless).toEqual(s.endless);
    s.endless = { seen: true, pirate: true, ninja: true };
    expect(parseSave(serializeSave(s), bounds).endless).toEqual(s.endless);
    // A save from the day it was still Doom Island, under the old key.
    const old = {
      ...JSON.parse(serializeSave(s)),
      endless: undefined,
      doom: { seen: true, pirate: true },
    };
    expect(parseSave(JSON.stringify(old), bounds).endless).toEqual({
      seen: true,
      pirate: true,
      ninja: false,
    });
    expect(JSON.parse(serializeSave(parseSave(JSON.stringify(old), bounds)))).not.toHaveProperty(
      'doom',
    );
    const odd = { ...s, endless: { seen: true, pirate: 'yes', ninja: 1 } };
    expect(parseSave(JSON.stringify(odd), bounds).endless).toEqual({
      seen: true,
      pirate: false,
      ninja: false,
    });
  });

  it('keeps the battles fought, won and marked, a save from before them reading as none, and nothing but counts', () => {
    const s = parseSave(legacy, bounds);
    s.endless = { seen: true, pirate: true, ninja: false };
    expect(parseSave(serializeSave(s), bounds).endless.battles).toBeUndefined();
    const won = marked(noBattles(), 'pirate', 'damage', 'win');
    s.endless = { ...s.endless, battles: marked(won, 'pirate', 'damage', 'loss') };
    const back = parseSave(serializeSave(s), bounds).endless.battles;
    expect(back).toEqual({
      fought: 2,
      won: 1,
      marks: {
        pirate: { tank: 0, damage: 3, healer: 0 },
        ninja: { tank: 0, damage: 0, healer: 0 },
      },
    });
    const odd = {
      ...JSON.parse(serializeSave(s)),
      endless: {
        seen: true,
        pirate: true,
        battles: { fought: 3, won: 9, marks: { ninja: { tank: 'lots', healer: -4, damage: 2.7 } } },
      },
    };
    expect(parseSave(JSON.stringify(odd), bounds).endless.battles).toEqual({
      fought: 3,
      won: 3,
      marks: {
        pirate: { tank: 0, damage: 0, healer: 0 },
        ninja: { tank: 0, damage: 2, healer: 0 },
      },
    });
    const junk = { ...JSON.parse(serializeSave(s)), endless: { seen: true, battles: 'many' } };
    expect(parseSave(JSON.stringify(junk), bounds).endless.battles).toBeUndefined();
  });

  it('keeps the Ninja Slalom runs and best times, a save from before them reading as none skied', () => {
    const s = parseSave(legacy, bounds);
    s.endless = { seen: true, pirate: false, ninja: true };
    expect(parseSave(serializeSave(s), bounds).endless.slalom).toBeUndefined();
    s.endless = { ...s.endless, slalom: skied(skied(undefined, 'bunny', 51.26), 'bunny', 49.9) };
    expect(parseSave(serializeSave(s), bounds).endless.slalom).toEqual({
      runs: 2,
      best: { bunny: 49.9 },
    });
    const junk = {
      ...JSON.parse(serializeSave(s)),
      endless: { seen: true, slalom: { runs: 2, best: { bunny: 'fast' } } },
    };
    expect(parseSave(JSON.stringify(junk), bounds).endless.slalom).toEqual({ runs: 2, best: {} });
    const none = { ...JSON.parse(serializeSave(s)), endless: { seen: true, slalom: 'lots' } };
    expect(parseSave(JSON.stringify(none), bounds).endless.slalom).toBeUndefined();
  });

  it('keeps the Treehouse Climb climbs and best times, a save from before them reading as none climbed', () => {
    const s = parseSave(legacy, bounds);
    s.endless = { seen: true, pirate: true, ninja: false };
    expect(parseSave(serializeSave(s), bounds).endless.climbs).toBeUndefined();
    s.endless = { ...s.endless, climbs: climbed(climbed(undefined, 1, null), 1, 44.44) };
    expect(parseSave(serializeSave(s), bounds).endless.climbs).toEqual({
      climbs: 2,
      top: 1,
      best: { 1: 44.4 },
    });
    const junk = {
      ...JSON.parse(serializeSave(s)),
      endless: { seen: true, climbs: { climbs: 2, top: 'high', best: { 1: 'quick' } } },
    };
    expect(parseSave(JSON.stringify(junk), bounds).endless.climbs).toEqual({
      climbs: 2,
      top: 0,
      best: {},
    });
    const none = { ...JSON.parse(serializeSave(s)), endless: { seen: true, climbs: 'lots' } };
    expect(parseSave(JSON.stringify(none), bounds).endless.climbs).toBeUndefined();
  });
});

describe('the tar kraken, round two', () => {
  it('an old save has not beaten it on foot; beaten, it stays beaten', () => {
    const s = parseSave(legacy, bounds);
    expect(s.krakenFoot).toBe(false);
    s.krakenFoot = true;
    expect(parseSave(serializeSave(s), bounds).krakenFoot).toBe(true);
  });
});

describe('the pet system', () => {
  it('an old save has nothing named and stays without it; names round-trip, and odd ones are dropped', () => {
    const s = parseSave(legacy, bounds);
    expect(s.pets).toEqual({ nm: {}, drawn: [], walk: null, eggs: [], hatched: [], house: false });
    expect(JSON.parse(serializeSave(s))).not.toHaveProperty('pets');
    s.pets = {
      nm: { baby: 'Chomp', dog: 'Biscuit' },
      drawn: [],
      walk: null,
      eggs: [],
      hatched: [],
      house: false,
    };
    expect(parseSave(serializeSave(s), bounds).pets).toEqual(s.pets);
    const odd = {
      ...JSON.parse(serializeSave(s)),
      pets: { nm: { baby: 7, crows: 'Flock', nobody: 'X' } },
    };
    expect(parseSave(JSON.stringify(odd), bounds).pets).toEqual({
      nm: {},
      drawn: [],
      walk: null,
      eggs: [],
      hatched: [],
      house: false,
    });
    expect(parseSave(JSON.stringify({ ...odd, pets: 'yes' }), bounds).pets).toEqual({
      nm: {},
      drawn: [],
      walk: null,
      eggs: [],
      hatched: [],
      house: false,
    });
    // A drawn pet travels as its strokes.
    s.pets = {
      nm: {},
      drawn: [{ id: 1, nm: 'Wiggles', d: 'ECDEFGH.AQRST', got: 5 }],
      walk: 'd1',
      eggs: [],
      hatched: [],
      house: false,
    };
    expect(JSON.parse(serializeSave(s)).pets).toEqual({ drawn: s.pets.drawn, walk: 'd1' });
    expect(parseSave(serializeSave(s), bounds).pets).toEqual(s.pets);
    // Walking a pet that is not there is walking nobody.
    const gone = { ...JSON.parse(serializeSave(s)), pets: { drawn: s.pets.drawn, walk: 'd9' } };
    expect(parseSave(JSON.stringify(gone), bounds).pets.walk).toBeNull();
  });
});

describe('the Garden Isle', () => {
  it('an old save has not sighted it; sighted, it keeps it, and an unsighted one is left out of the save', () => {
    const s = parseSave(legacy, bounds);
    expect(s.garden).toEqual({ seen: false });
    expect(JSON.parse(serializeSave(s))).not.toHaveProperty('garden');
    s.garden = { seen: true };
    expect(parseSave(serializeSave(s), bounds).garden).toEqual({ seen: true });
    // Anything odd under its key reads as not seen, and the rest of the save loads as before.
    for (const odd of ['yes', 1, null, [], { seen: 'yes' }, { seen: 1 }]) {
      const got = parseSave(JSON.stringify({ ...s, garden: odd }), bounds);
      expect(got.garden).toEqual({ seen: false });
      expect(got.coins).toBe(s.coins);
    }
  });
});
