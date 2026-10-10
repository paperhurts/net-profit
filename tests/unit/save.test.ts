import { describe, expect, it } from 'vitest';
import { OLD_START_FLAG } from '../../src/data/flag';
import { SPEAR_MAX } from '../../src/data/spear';
import {
  type Bounds,
  DEFAULT_ORDER,
  defaultSave,
  HERON_STAGES,
  ISLE3_STAGES,
  ISLE4_STAGES,
  ISLE5_STAGES,
  ISLE6_STAGES,
  ISLE7_STAGES,
  OTTER_FEEDS,
  parseSave,
  SAVE_KEY,
  serializeSave,
} from '../../src/state/save';

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
    });
    s.gear.mesh = true;
    s.gear.suit = true;
    expect(parseSave(serializeSave(s), bounds).gear).toEqual({
      mesh: true,
      strongbox: false,
      suit: true,
      kit: false,
      rod: false,
      lionnet: false,
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
    });
    // A save from before the chemistry suit and the mending kit has neither.
    expect(parseSave(JSON.stringify({ gear: { mesh: 1, hat: true } }), bounds).gear).toEqual({
      mesh: true,
      strongbox: false,
      suit: false,
      kit: false,
      rod: false,
      lionnet: false,
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
    expect(s.driven).toEqual({ guard: 0, cthulu: 0, angler: 0, gulper: 0, meteor: 0 });
    expect(s.meteorSeen).toBe(false);
    s.driven.gulper = 2;
    s.driven.angler = 1;
    expect(parseSave(serializeSave(s), bounds).driven).toEqual({
      guard: 0,
      cthulu: 0,
      angler: 1,
      gulper: 2,
      meteor: 0,
    });
    const bad = JSON.parse(serializeSave(s));
    bad.driven = { gulper: 'lots', cthulu: -3, guard: 2.7, kraken: 9 };
    expect(parseSave(JSON.stringify(bad), bounds).driven).toEqual({
      guard: 2,
      cthulu: 0,
      angler: 0,
      gulper: 0,
      meteor: 0,
    });
    bad.driven = 'nope';
    expect(parseSave(JSON.stringify(bad), bounds).driven.gulper).toBe(0);
  });

  it('count the meteor serpent too, as none in a save from before it, and keep it sighted', () => {
    const old = JSON.parse(serializeSave(parseSave(legacy, bounds)));
    old.driven = { guard: 1, cthulu: 0, angler: 2, gulper: 0 };
    delete old.meteorSeen;
    const s = parseSave(JSON.stringify(old), bounds);
    expect(s.driven).toEqual({ guard: 1, cthulu: 0, angler: 2, gulper: 0, meteor: 0 });
    expect(s.meteorSeen).toBe(false);
    s.driven.meteor = 3;
    s.meteorSeen = true;
    const back = parseSave(serializeSave(s), bounds);
    expect(back.driven.meteor).toBe(3);
    expect(back.meteorSeen).toBe(true);
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
    expect(parseSave(JSON.stringify(bad), bounds).armour).toBe(4);
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

describe('bases', () => {
  it('have nothing built in a save from before them, and keep each stage once built', () => {
    const s = parseSave(legacy, bounds);
    expect(s.bases).toEqual({ isle2: 0, isle3: 0 });
    s.bases.isle2 = 1;
    expect(parseSave(serializeSave(s), bounds).bases).toEqual({ isle2: 1, isle3: 0 });
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
});
