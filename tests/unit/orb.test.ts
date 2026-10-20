import { describe, expect, it } from 'vitest';
import { noDriven } from '../../src/data/harpoon';
import { orbBoats, orbNext, orbPast } from '../../src/data/orb';
import { type Beaten, TROPHIES, TROPHY_KINDS } from '../../src/data/trophies';

const start: Beaten = {
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
};

describe('the orb on the bridge', () => {
  it('shows the boats that are yours, your own first', () => {
    const none = orbBoats({
      tier: 0,
      warlock: false,
      crafts: [],
      swan: false,
      chem: false,
      sub: false,
    });
    expect(none).toHaveLength(1);
    expect(none[0]).toContain('dinghy');
    const all = orbBoats({
      tier: 5,
      warlock: true,
      crafts: [{ name: 'the airboat', rider: 'the warrior' }],
      swan: true,
      chem: true,
      sub: true,
    });
    expect(all[0]).toContain('flagship');
    expect(all).toContain('The airboat, sailed by the warrior.');
    expect(all.join(' ')).toMatch(/warlock.*swan.*chemistry.*submarine/);
    expect(all).toHaveLength(6);
  });

  it('shows the past: nothing yet, then each boss beaten, as its trophy tells it, in order', () => {
    expect(orbPast(start)).toEqual(['Nothing yet. Your story is still to come.']);
    const some = { ...start, towerTaken: true, isle3Stage: 3 };
    expect(orbPast(some)).toEqual([
      TROPHIES.staff.story,
      TROPHIES.sword.story,
      TROPHIES.horns.story,
    ]);
  });

  it('and more: the next boss to beat, and where, until there are none left', () => {
    expect(orbNext(start)).toBe(TROPHIES.staff.hint);
    expect(orbNext({ ...start, towerTaken: true })).toBe(TROPHIES.sword.hint);
    // With every one of them won, Skrill too: nothing it has seen yet.
    const all: Beaten = {
      towerTaken: true,
      isle3Stage: 9,
      isle4Stage: 9,
      isle5Stage: 9,
      isle6Stage: 9,
      isle7Stage: 9,
      heronStage: 9,
      pelicanBeaten: true,
      reaperEgg: 9,
      cryptWon: true,
      stealth1: true,
      tarLeader: true,
      skrill: true,
      driven: { guard: 1, cthulu: 1, angler: 1, gulper: 1, meteor: 1, reaper: 1 },
    };
    expect(TROPHY_KINDS.every((k) => TROPHIES[k].won(all))).toBe(true);
    expect(orbPast(all)).toHaveLength(TROPHY_KINDS.length);
    expect(orbNext(all)).toContain('even Skrill');
    // Skrill the only one left: his hint, his tower.
    expect(orbNext({ ...all, skrill: false })).toBe(TROPHIES.skrillhorn.hint);
  });
});
