import { describe, expect, it } from 'vitest';
import { noDriven } from '../../src/data/harpoon';
import {
  type Beaten,
  nearStand,
  STAND_REACH,
  STAND_RING,
  standAt,
  TROPHIES,
  TROPHY_KINDS,
  type TrophyKind,
  trophiesWon,
} from '../../src/data/trophies';
import { drawStand } from '../../src/render/trophies';
import { entry, HALL_B, ROOMS, STEP, stairs } from '../../src/world/tower';
import { fakeView } from './helpers/view';

const none = (): Beaten => ({
  towerTaken: false,
  isle3Stage: 0,
  isle4Stage: 0,
  isle5Stage: 0,
  isle6Stage: 0,
  isle7Stage: 0,
  heronStage: 0,
  pelicanBeaten: false,
  reaperEgg: 0,
  cryptWon: false,
  stealth1: false,
  tarLeader: false,
  skrill: false,
  driven: noDriven(),
});
const won = (b: Beaten): TrophyKind[] => TROPHY_KINDS.filter((k) => TROPHIES[k].won(b));

describe('the trophy hall', () => {
  it('has a trophy for each boss, named, with a story and where to win it', () => {
    expect(TROPHY_KINDS).toHaveLength(23);
    for (const k of TROPHY_KINDS) {
      const t = TROPHIES[k];
      expect(t.name.length).toBeGreaterThan(5);
      expect(t.story).toMatch(/[.!"]$/);
      expect(t.hint).toMatch(/\.$/);
    }
  });

  it('fills no stand in a new game, and every stand once every boss is beaten', () => {
    expect(trophiesWon(none())).toBe(0);
    const all: Beaten = {
      towerTaken: true,
      isle3Stage: 4,
      isle4Stage: 1,
      isle5Stage: 1,
      isle6Stage: 2,
      isle7Stage: 4,
      heronStage: 2,
      pelicanBeaten: true,
      reaperEgg: 3,
      cryptWon: true,
      stealth1: true,
      tarLeader: true,
      skrill: true,
      driven: { guard: 1, cthulu: 1, angler: 1, gulper: 1, meteor: 1, reaper: 1 },
    };
    expect(trophiesWon(all)).toBe(23);
  });

  it('fills each stand from its own boss', () => {
    expect(won({ ...none(), towerTaken: true })).toEqual(['staff']);
    expect(won({ ...none(), isle3Stage: 2 })).toEqual(['sword']);
    expect(won({ ...none(), isle3Stage: 3 })).toEqual(['sword', 'horns']);
    expect(won({ ...none(), isle4Stage: 1 })).toEqual(['anchor']);
    expect(won({ ...none(), isle5Stage: 1 })).toEqual(['jaws']);
    expect(won({ ...none(), isle6Stage: 1 })).toEqual(['eye']);
    expect(won({ ...none(), isle6Stage: 2 })).toEqual(['eye', 'idol']);
    expect(won({ ...none(), isle7Stage: 1 })).toEqual(['book']);
    expect(won({ ...none(), isle7Stage: 3 })).toEqual(['book', 'crown']);
    expect(won({ ...none(), isle7Stage: 4 })).toEqual(['book', 'crown', 'pearl']);
    // Beaten once on island 8, he only flew to his nest.
    expect(won({ ...none(), heronStage: 1 })).toEqual([]);
    expect(won({ ...none(), heronStage: 2 })).toEqual(['feather']);
    expect(won({ ...none(), pelicanBeaten: true })).toEqual(['egg']);
    expect(won({ ...none(), reaperEgg: 1 })).toEqual(['claw']);
    expect(won({ ...none(), cryptWon: true })).toEqual(['blade']);
    expect(won({ ...none(), stealth1: true })).toEqual(['hat']);
    expect(won({ ...none(), tarLeader: true })).toEqual(['tarsword']);
    expect(won({ ...none(), skrill: true })).toEqual(['skrillhorn']);
    const beasts = {
      guard: 'spine',
      cthulu: 'shard',
      angler: 'lure',
      gulper: 'light',
      meteor: 'meteor',
      reaper: 'tooth',
    };
    for (const [b, k] of Object.entries(beasts))
      expect(won({ ...none(), driven: { ...noDriven(), [b]: 2 } })).toEqual([k]);
  });

  it('stands round the wall on the floor, clear of the way up and the way in, each looked at on its own', () => {
    const hall = ROOMS[HALL_B];
    if (!hall) throw new Error('no hall');
    const st = stairs(HALL_B);
    const way = entry(HALL_B);
    for (let i = 0; i < TROPHY_KINDS.length; i++) {
      const s = standAt(i);
      expect(Math.hypot(s.dx, s.dy) + 8).toBeLessThan(hall.r - 12);
      // Not looked at from where the way up is used, nor stood in the way you come in.
      expect(Math.hypot(s.dx - (st.x - hall.x), s.dy - (st.y - hall.y))).toBeGreaterThan(
        STEP + 6 + STAND_REACH - 4,
      );
      expect(Math.hypot(s.dx - (way.x - hall.x), s.dy - (way.y - hall.y))).toBeGreaterThan(40);
      expect(nearStand(s.dx + 6, s.dy - 4)).toBe(i);
      for (let j = i + 1; j < TROPHY_KINDS.length; j++) {
        const o = standAt(j);
        expect(Math.hypot(s.dx - o.dx, s.dy - o.dy)).toBeGreaterThan(STAND_REACH);
      }
    }
    expect(Math.hypot(standAt(0).dx, standAt(0).dy)).toBeCloseTo(STAND_RING);
    expect(nearStand(0, 0)).toBe(-1);
  });

  it('draws each trophy on its stand, and a question mark on an empty one', () => {
    for (const k of TROPHY_KINDS) {
      const f = fakeView();
      drawStand(f.v, 0, 0, k);
      expect(f.calls.box).toBe(2);
      // The stand's shadow and its plate, and at least two marks of the trophy.
      expect((f.calls.fill ?? 0) + (f.calls.stroke ?? 0)).toBeGreaterThan(3);
      expect(f.calls.fillText ?? 0).toBe(0);
    }
    const empty = fakeView();
    drawStand(empty.v, 0, 0, null);
    expect(empty.calls.fillText).toBe(1);
  });
});
