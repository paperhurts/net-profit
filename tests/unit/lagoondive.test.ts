import { describe, expect, it } from 'vitest';
import { Diver, SWIM, TOP } from '../../src/entities/diver';
import {
  CLAW_R,
  COME_SPEED,
  CREATURE_HP,
  DivePal,
  GONE_T,
  LagoonCreature,
  LagoonFolk,
  NOTICE,
  OFF_T,
  TELL,
} from '../../src/entities/lagoonfolk';
import { POWER } from '../../src/entities/pals';
import { drawDive } from '../../src/render/dive';
import {
  drawCreatureEye,
  drawDivePal,
  drawKeyGlint,
  drawLagoonCreature,
  drawSkullKey,
} from '../../src/render/lagoondive';
import {
  CREATURE_HOMES,
  inLagoonWater,
  KEY_REACH,
  LAGOON_ENTRY,
  LAGOON_SITE,
  LD,
  LW,
  lagoonDark,
  lagoonFloor,
  lagoonPlants,
  lagoonWater,
  SKULL_KEY,
} from '../../src/world/lagoondive';
import { fakeView } from './helpers/view';

const DT = 1 / 60;

describe("island 11's black lagoon, dived from its bank", () => {
  it('is a bowl, shallow at its banks and deep in the middle, with the diver going in off the bank', () => {
    expect(lagoonFloor(0)).toBeLessThan(80);
    expect(lagoonFloor(LW)).toBeLessThan(80);
    expect(lagoonFloor(LW / 2)).toBeGreaterThan(LD - 60);
    expect(inLagoonWater(LAGOON_ENTRY, TOP + 6, 12)).toBe(true);
    expect(LAGOON_SITE.bank).toBe(true);
    expect(LAGOON_SITE.ceiling).toBeUndefined();
  });

  it('is dark from the very top and black at the bottom, in murky green water', () => {
    expect(lagoonDark(0)).toBeGreaterThan(0.4);
    expect(lagoonDark(LD)).toBeGreaterThan(lagoonDark(0));
    expect(lagoonWater(0)).toMatch(/^rgb\(/);
    expect(lagoonWater(LD)).toBe('rgb(4,12,9)');
  });

  it('has the skull key on the mud in its deepest part, where a diver can reach it', () => {
    expect(SKULL_KEY.y).toBeGreaterThan(LD * 0.75);
    expect(SKULL_KEY.y).toBeLessThan(lagoonFloor(SKULL_KEY.x));
    // A diver kept off the mud still comes within reach.
    const d = new Diver();
    d.reset(75, LAGOON_SITE);
    d.x = SKULL_KEY.x;
    d.y = SKULL_KEY.y + 30;
    LAGOON_SITE.keep(d, 12);
    expect(Math.hypot(d.x - SKULL_KEY.x, d.y - SKULL_KEY.y)).toBeLessThan(KEY_REACH);
  });

  it('keeps ten creatures, each at home in the water, and grows weed and glowing fungus', () => {
    expect(CREATURE_HOMES).toHaveLength(10);
    for (const h of CREATURE_HOMES) expect(inLagoonWater(h.x, h.y, 10)).toBe(true);
    const p = lagoonPlants();
    expect(p.some((x) => x.glow)).toBe(true);
    expect(p.some((x) => !x.glow)).toBe(true);
  });
});

describe('the lagoon creatures', () => {
  it('are slower than a diver, so a diver can always get away', () => {
    expect(COME_SPEED).toBeLessThan(SWIM * 0.8);
  });

  it('notice a diver who comes near, swim at it, raise their claws, and claw the tank if it stays', () => {
    const c = new LagoonCreature({ x: 300, y: 150 }, 0);
    const d = { x: 300 + NOTICE + 40, y: 150 };
    for (let i = 0; i < 30; i++) expect(c.update(DT, d, false)).toBeNull();
    d.x = c.x + NOTICE - 10;
    const evs: string[] = [];
    for (let i = 0; i < 6 / DT && !evs.includes('claw'); i++) {
      const ev = c.update(DT, d, false);
      if (ev) evs.push(ev);
    }
    expect(evs).toEqual(['notice', 'tell', 'claw']);
    expect(c.state).toBe('off');
  });

  it('miss a diver who swims off while their claws are up', () => {
    const c = new LagoonCreature({ x: 300, y: 150 }, 0);
    const d = { x: 310, y: 150 };
    let ev = null;
    for (let i = 0; i < 2 / DT && c.state !== 'tell'; i++) c.update(DT, d, false);
    expect(c.state).toBe('tell');
    d.x = c.x + CLAW_R + 60;
    for (let i = 0; i <= TELL / DT + 2 && !ev; i++) ev = c.update(DT, d, false);
    expect(ev).toBe('miss');
  });

  it('leave a diver on the way back up, and go home', () => {
    const c = new LagoonCreature({ x: 300, y: 150 }, 0);
    const d = { x: 360, y: 150 };
    c.update(DT, d, false);
    expect(c.state).toBe('come');
    c.update(DT, d, true);
    expect(c.state).toBe('home');
    for (let i = 0; i < 2 / DT; i++) expect(c.update(DT, d, true)).toBeNull();
  });

  it('take two hits from a spear, give up and swim off into the dark, and are all back next dive', () => {
    const folk = new LagoonFolk();
    const c = folk.list[0] as LagoonCreature;
    expect(c.hp).toBe(CREATURE_HP);
    // A spear passing through its middle hits it; one well wide does not.
    expect(folk.hitBy(c.x - 40, c.y, c.x + 40, c.y)).toBe(c);
    expect(c.hitBy(c.x - 40, c.y + 60, c.x + 40, c.y + 60)).toBe(false);
    expect(c.hit(1)).toBe(false);
    expect(c.state).toBe('off');
    expect(c.hit(1)).toBe(true);
    expect(c.out).toBe(false);
    expect(folk.left).toBe(9);
    for (let i = 0; i <= GONE_T / DT + 2; i++) c.update(DT, { x: 0, y: 0 }, false);
    expect(c.state).toBe('gone');
    expect(c.hit(1)).toBe(false);
    folk.reset();
    expect(folk.left).toBe(10);
    expect(c.hp).toBe(CREATURE_HP);
  });

  it('back off a moment after a claw before coming again', () => {
    const c = new LagoonCreature({ x: 300, y: 150 }, 0);
    const d = { x: 305, y: 150 };
    let ev = null;
    for (let i = 0; i < 4 / DT && ev !== 'claw'; i++) ev = c.update(DT, d, false);
    expect(ev).toBe('claw');
    for (let i = 0; i < (OFF_T * 0.9) / DT; i++) expect(c.update(DT, d, false)).toBeNull();
  });

  it('are aimed at in front of the diver, the nearest first, never behind it', () => {
    const folk = new LagoonFolk();
    const near = folk.list[0] as LagoonCreature;
    const d = { x: near.x - 40, y: near.y, face: 1 };
    expect(folk.aim(d, 100)).toBe(near);
    expect(folk.aim({ ...d, face: -1 }, 100)).not.toBe(near);
  });
});

describe('friends who swim down too', () => {
  it('follow the diver, the naga up behind and the baby Reaper down behind', () => {
    const folk = new LagoonFolk();
    for (const c of folk.list) c.hit(9);
    const d = { x: 200, y: 100, face: 1 };
    const naga = new DivePal('naga', 100, 100);
    const baby = new DivePal('baby', 100, 100);
    for (let i = 0; i < 3 / DT; i++) {
      naga.update(DT, d, folk);
      baby.update(DT, d, folk);
    }
    expect(naga.x).toBeLessThan(d.x);
    expect(naga.y).toBeLessThan(d.y);
    expect(baby.y).toBeGreaterThan(d.y);
    expect(Math.hypot(naga.x - d.x, naga.y - d.y)).toBeLessThan(70);
    // Keeping their places, they face the way the diver does.
    expect(naga.face).toBe(1);
    expect(baby.face).toBe(1);
  });

  it("go for a creature near the diver: the naga's trident beats one in a blow, the baby's nip takes two", () => {
    for (const [kind, blows] of [
      ['naga', 1],
      ['baby', 2],
    ] as const) {
      const folk = new LagoonFolk();
      const target = folk.list[3] as LagoonCreature;
      for (const c of folk.list) if (c !== target) c.hit(9);
      const d = { x: target.x - 50, y: target.y, face: 1 };
      const p = new DivePal(kind, d.x - 30, d.y);
      let hits = 0;
      for (let i = 0; i < 8 / DT && target.out; i++) {
        target.update(DT, { x: 9999, y: 0 }, true);
        if (p.update(DT, d, folk)) hits++;
      }
      expect(target.out, kind).toBe(false);
      expect(hits, kind).toBe(blows);
      expect(POWER[kind] * blows).toBeGreaterThanOrEqual(CREATURE_HP);
    }
  });
});

describe('the lagoon, drawn', () => {
  it('draws its scene, the key, its creatures and the friends, at every depth, without a fault', () => {
    const v = fakeView();
    const d = new Diver();
    d.reset(75, LAGOON_SITE);
    const folk = new LagoonFolk();
    const pals = [new DivePal('naga', 80, 60), new DivePal('baby', 90, 80)];
    (folk.list[1] as LagoonCreature).hit(1);
    (folk.list[2] as LagoonCreature).hit(9);
    for (const y of [20, 140, 260]) {
      d.y = y;
      drawDive(v.v.ctx, 390, 780, 3, {
        diver: d,
        plants: lagoonPlants(),
        shoals: [],
        hull: '#C0392B',
        trim: '#FFFFFF',
        bubbles: [],
        site: LAGOON_SITE,
        under: (c, X, Y, s) => {
          drawSkullKey(c, X, Y, s);
          for (const k of folk.list) drawLagoonCreature(c, X, Y, s, k);
          for (const p of pals) drawDivePal(c, X, Y, s, p, 3);
        },
        over: (c, X, Y, s) => {
          drawKeyGlint(c, X, Y, s, 3);
          for (const k of folk.list) drawCreatureEye(c, X, Y, s, k, 3);
        },
      });
    }
    expect(v.calls.fill ?? 0).toBeGreaterThan(300);
  });
});
