import { describe, expect, it } from 'vitest';
import { basicPower, freshFury } from '../../src/data/warrior';
import {
  HEX_SPECS,
  HEXES,
  hex,
  keepMuds,
  MUD_MAX,
  MUD_TIME,
  mud,
  noHex,
  terriersAt,
  tickMud,
  zapPower,
} from '../../src/data/witchdoctor';
import { ALLY } from '../../src/entities/allies';

describe('the Witch Doctor', () => {
  it('four buttons: Bloodrot Terriers, Patches, frost spiders and Toad Rain', () => {
    expect(HEXES).toEqual(['terriers', 'patches', 'spiders', 'toads']);
  });
  it('her Skull Familiar zaps for the Warrior’s blow', () => {
    for (const lv of [1, 6, 11, 16]) expect(zapPower(lv)).toBe(basicPower(lv));
  });
  it('the pack: 2 terriers at level 1, 3 at 4, 4 at 8', () => {
    expect([1, 3, 4, 7, 8, 20].map(terriersAt)).toEqual([2, 2, 3, 3, 4, 4]);
  });
  it('Patches from level 5: all distraction, little bite, lots of hits', () => {
    const f = freshFury();
    expect(noHex(f, 'patches', 4)).toBe('level');
    expect(hex(f, 'patches', 5)).toBe(true);
    expect(ALLY.patches.hp).toBeGreaterThan(ALLY.terrier.hp);
    expect(ALLY.patches.hit ?? 1).toBe(1);
  });
  it('Toad Rain can be spammed: a short wait, six patches of mud at most, each slowing until it dries', () => {
    expect(HEX_SPECS.toads.every).toBeLessThanOrEqual(2);
    let ms = Array.from({ length: 9 }, (_, i) => mud(i, 0));
    ms = keepMuds(ms);
    expect(ms.length).toBe(MUD_MAX);
    const m = mud(0, 0);
    expect(tickMud(m, 0.01)).toBe(true);
    expect(tickMud(m, 0.5)).toBe(false);
    tickMud(m, MUD_TIME);
    expect(m.t).toBe(0);
    expect(keepMuds([m])).toEqual([]);
  });
});
