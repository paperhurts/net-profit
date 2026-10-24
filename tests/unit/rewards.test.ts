import { describe, expect, it } from 'vitest';
import { marked, noBattles } from '../../src/data/battle';
import {
  allGold,
  newOutfits,
  nextReward,
  OUTFIT_BADGES,
  outfitWon,
  sideBadges,
} from '../../src/data/rewards';
import { RUNS, skied } from '../../src/data/slalom';

describe("the Endless Isle's side rewards", () => {
  it("counts a side's badges across its three roles: Badge I once a role has been fought in, then each one after", () => {
    expect(sideBadges(undefined, 'pirate')).toBe(0);
    let b = marked(noBattles(), 'pirate', 'tank', 'loss');
    expect(sideBadges(b, 'pirate')).toBe(1);
    expect(sideBadges(b, 'ninja')).toBe(0);
    // Badge II at 3 marks.
    b = marked(b, 'pirate', 'tank', 'win');
    expect(sideBadges(b, 'pirate')).toBe(2);
    b = marked(b, 'pirate', 'healer', 'loss');
    expect(sideBadges(b, 'pirate')).toBe(OUTFIT_BADGES);
    // All three roles at Badge III, nine.
    const all = noBattles();
    all.marks.ninja = { tank: 8, damage: 20, healer: 9 };
    expect(sideBadges(all, 'ninja')).toBe(9);
  });

  it("wins the captain's coat and the ninja garb at three badges for the side, and never one for the other side", () => {
    let b = noBattles();
    for (const r of ['tank', 'damage'] as const) b = marked(b, 'pirate', r, 'win');
    expect(outfitWon('captain', { battles: b })).toBe(false);
    const was = { battles: b };
    b = marked(b, 'pirate', 'tank', 'loss');
    const now = { battles: b };
    expect(outfitWon('captain', now)).toBe(true);
    expect(outfitWon('ninja', now)).toBe(false);
    expect(newOutfits(was, now)).toEqual(['captain']);
    expect(newOutfits(now, now)).toEqual([]);
    expect(outfitWon('none', {})).toBe(true);
  });

  it("wins the snow ninja's whites for gold on all three ski runs, and not for silver on any", () => {
    const [bunny, fox, doom] = [RUNS.bunny, RUNS.fox, RUNS.doom].map((r) => r.medals[0]) as [
      number,
      number,
      number,
    ];
    let s = skied(skied(undefined, 'bunny', bunny), 'fox', fox);
    expect(allGold(s)).toBe(false);
    const was = { slalom: s };
    s = skied(s, 'doom', doom + 1);
    expect(allGold(s)).toBe(false);
    s = skied(s, 'doom', doom - 1);
    expect(allGold(s)).toBe(true);
    expect(newOutfits(was, { slalom: s })).toEqual(['snow']);
  });

  it('names the next reward for a side and how far off it is, until there are none left', () => {
    expect(nextReward(undefined, 'ninja')).toEqual({
      at: OUTFIT_BADGES,
      what: 'the ninja garb and mask',
      have: 0,
    });
    const b = noBattles();
    b.marks.pirate.damage = 8;
    expect(nextReward(b, 'pirate')).toBeNull();
    expect(nextReward(b, 'ninja')?.have).toBe(0);
  });
});
