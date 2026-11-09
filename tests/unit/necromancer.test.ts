import { describe, expect, it } from 'vitest';
import {
  ballPower,
  bonesAt,
  bonesFor,
  burstPower,
  noRite,
  RITE_SPECS,
  RITES,
  rite,
  SOULS_PER_HEART,
  scythePower,
  soulIn,
} from '../../src/data/necromancer';
import { freshFury, slamPower } from '../../src/data/warrior';
import { ALLY } from '../../src/entities/allies';

describe('the Necromancer', () => {
  it('four buttons: the scythe, Raise Dead, Grave Burst and the Gorebeast', () => {
    expect(RITES).toEqual(['scythe', 'raise', 'burst', 'gorebeast']);
  });
  it('his death ball: 1 at level 1, 4 at 6', () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(ballPower)).toEqual([1, 1, 2, 2, 3, 4, 4]);
  });
  it('the owner’s life steal: a heart back every 4 death ball hits', () => {
    expect(SOULS_PER_HEART).toBe(4);
    let s = 0;
    const hearts: boolean[] = [];
    for (let i = 0; i < 8; i++) {
      const r = soulIn(s);
      s = r.souls;
      hearts.push(r.heart);
    }
    expect(hearts).toEqual([false, false, false, true, false, false, false, true]);
  });
  it('the scythe in line with the others: the Warrior’s Slam', () => {
    for (const lv of [1, 6, 11, 16]) expect(scythePower(lv)).toBe(slamPower(lv));
    expect(burstPower(1)).toBe(3);
  });
  it('his skeletons: 1 at level 1, 2 at 3, 4 at 7; sword, archer, then mage and the giant hamster', () => {
    expect([1, 2, 3, 6, 7, 20].map(bonesAt)).toEqual([1, 1, 2, 2, 4, 4]);
    expect(bonesFor(1)).toEqual(['skeleton']);
    expect(bonesFor(3)).toEqual(['skeleton', 'archer']);
    expect(bonesFor(7)).toEqual(['skeleton', 'archer', 'mage', 'bighamster']);
    expect(ALLY.bighamster.hp).toBeGreaterThan(ALLY.hamster.hp);
    expect(ALLY.gorebeast.hit).toBe(2);
  });
  it('the Gorebeast waits for level 5', () => {
    const f = freshFury();
    expect(noRite(f, 'gorebeast', 4)).toBe('level');
    expect(rite(f, 'gorebeast', 5)).toBe(true);
    expect(f.cd.gorebeast).toBe(RITE_SPECS.gorebeast.every);
  });
});
