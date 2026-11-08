import { describe, expect, it } from 'vitest';
import { BARGE_MAX, BOSS_FOES, bargeTotal } from '../../src/data/barge';
import {
  BOSS_PAY,
  bossAdds,
  bossRound,
  DIFF_BANDS,
  DIFFICULTIES,
  DIM_BOSSES,
  DIM_FOES,
  DIM_MAX,
  eliteRound,
  enemyLevel,
  GUN_COST,
  heartsAt,
  killsToNext,
  LEVEL_MAX,
  levelOf,
  mobAdds,
  parseDims,
  ROUND_PAY,
  roundBoss,
  roundPay,
  roundPick,
  roundSize,
  untouchedDims,
} from '../../src/data/dimension';
import { EXPERIMENTS, experimentsLine, tryOn } from '../../src/data/experimental';

describe('the Experimental switch', () => {
  it('shows New Dimensions only while it is on', () => {
    expect(EXPERIMENTS).toContain('dimensions');
    expect(tryOn(false, 'dimensions')).toBe(false);
    expect(tryOn(true, 'dimensions')).toBe(true);
    expect(experimentsLine()).toContain('New Dimensions');
  });
});

describe('New Dimensions: rounds', () => {
  it('the portal gun is 5,000 coins, and never more than the Battle Barge’s ten come at once', () => {
    expect(GUN_COST).toBe(5000);
    expect(DIM_MAX).toBe(BARGE_MAX);
    for (let n = 1; n <= 60; n++) {
      expect(bargeTotal(roundPick(n))).toBe(roundSize(n));
      expect(roundSize(n)).toBeLessThanOrEqual(DIM_MAX);
    }
  });
  it('each round brings more, three to start, until ten', () => {
    expect(roundSize(1)).toBe(3);
    for (let n = 2; n <= 8; n++) expect(roundSize(n)).toBe(roundSize(n - 1) + 1);
    expect(roundSize(8)).toBe(10);
    expect(roundSize(40)).toBe(10);
  });
  it('an elite every 5th round, a boss every 10th; either pays 100, the rest 10', () => {
    expect(ROUND_PAY).toBe(10);
    expect(BOSS_PAY).toBe(100);
    for (let n = 1; n <= 40; n++) {
      expect(bossRound(n)).toBe(n % 10 === 0);
      expect(eliteRound(n)).toBe(n % 5 === 0 && n % 10 !== 0);
      expect(roundPay(n)).toBe(n % 5 === 0 ? 100 : 10);
      const pick = roundPick(n);
      const bosses = BOSS_FOES.reduce((k, f) => k + pick[f], 0);
      const boss = roundBoss(n);
      expect(bosses).toBe(boss ? 1 : 0);
      if (boss) expect(pick[boss]).toBe(1);
    }
    expect(roundBoss(10)).toBe(DIM_BOSSES[0]);
    expect(roundBoss(5)).toBe(null);
  });
  it('only brings those come by that round, the newest among them, never the spider or the sea’s bosses', () => {
    for (let n = 1; n <= 80; n++) {
      const pick = roundPick(n);
      const open = DIM_FOES.filter(([, from]) => from <= n).map(([k]) => k);
      for (const [k, from] of DIM_FOES) if (from > n) expect(pick[k]).toBe(0);
      expect(pick[open[open.length - 1] ?? 'monkey']).toBeGreaterThan(0);
      for (const k of ['spider', 'oldone', 'cthulhu', 'anchorer', 'tardragon'] as const)
        expect(pick[k]).toBe(0);
    }
    expect(roundPick(1).monkey).toBe(3);
    expect(roundPick(12)).toEqual(roundPick(12));
  });
  it('spreads a round over the kinds come by then, not all one kind', () => {
    for (let n = 3; n <= 30; n++) {
      const kinds = Object.values(roundPick(n)).filter((v) => v > 0).length;
      expect(kinds).toBeGreaterThanOrEqual(Math.min(3, roundSize(n)));
    }
  });
});

describe('New Dimensions: his levels and hearts', () => {
  it('10 enemies for level 2, 35 more for 3, 50 each to 6, 195 each to 20', () => {
    expect(killsToNext(1)).toBe(10);
    expect(killsToNext(2)).toBe(35);
    for (const lv of [3, 4, 5]) expect(killsToNext(lv)).toBe(50);
    for (let lv = 6; lv < 20; lv++) expect(killsToNext(lv)).toBe(195);
    expect(levelOf(0)).toEqual({ lv: 1, into: 0, need: 10 });
    expect(levelOf(9).lv).toBe(1);
    expect(levelOf(10).lv).toBe(2);
    expect(levelOf(44).lv).toBe(2);
    expect(levelOf(45).lv).toBe(3);
    expect(levelOf(195).lv).toBe(6);
    expect(levelOf(195 + 195).lv).toBe(7);
    expect(levelOf(195 + 14 * 195).lv).toBe(LEVEL_MAX);
    expect(levelOf(1e9)).toEqual({ lv: 20, into: 0, need: 0 });
  });
  it('3 hearts at 1 to 2, 4 at 3 to 5, 7 at 6 to 8, 10 from 9', () => {
    expect([1, 2].map(heartsAt)).toEqual([3, 3]);
    expect([3, 4, 5].map(heartsAt)).toEqual([4, 4, 4]);
    expect([6, 7, 8].map(heartsAt)).toEqual([7, 7, 7]);
    for (let lv = 9; lv <= 20; lv++) expect(heartsAt(lv)).toBe(10);
  });
});

describe('New Dimensions: difficulty and stronger enemies', () => {
  it('his bands: Easy 1–3, Tolerable 3–4, Medium 5–9, Hard 10–20', () => {
    expect(DIFFICULTIES).toEqual(['easy', 'tolerable', 'medium', 'hard']);
    expect(DIFF_BANDS).toEqual({ easy: [1, 3], tolerable: [3, 4], medium: [5, 9], hard: [10, 20] });
  });
  it('the enemies’ level starts at the bottom of the band and rises one every 5 rounds to its top', () => {
    expect(enemyLevel('easy', 1)).toBe(1);
    expect(enemyLevel('easy', 5)).toBe(1);
    expect(enemyLevel('easy', 6)).toBe(2);
    expect(enemyLevel('easy', 11)).toBe(3);
    expect(enemyLevel('easy', 99)).toBe(3);
    expect(enemyLevel('tolerable', 1)).toBe(3);
    expect(enemyLevel('tolerable', 30)).toBe(4);
    expect(enemyLevel('medium', 1)).toBe(5);
    expect(enemyLevel('hard', 1)).toBe(10);
    expect(enemyLevel('hard', 51)).toBe(20);
    expect(enemyLevel('hard', 500)).toBe(20);
  });
  it('his table, as hits added on top: mobs 6, 8, 11, 25; bosses and elites 8, 11, 16, 40, 100', () => {
    expect([1, 2, 3, 5, 6, 10, 11, 20].map(mobAdds)).toEqual([6, 6, 8, 8, 11, 11, 25, 25]);
    expect([1, 2, 3, 5, 6, 10, 11, 18, 19, 20].map(bossAdds)).toEqual([
      8, 8, 11, 11, 16, 16, 40, 40, 100, 100,
    ]);
  });
});

describe('New Dimensions: the saved block', () => {
  it('reads back, odd values as nothing on Easy', () => {
    const none = { gun: false, best: 0, kills: 0, diff: 'easy' };
    expect(parseDims(undefined)).toEqual(none);
    expect(parseDims({ gun: true, best: 4.7, kills: 33.2, diff: 'hard' })).toEqual({
      gun: true,
      best: 4,
      kills: 33,
      diff: 'hard',
    });
    expect(parseDims({ gun: 'yes', best: -3, kills: 'lots', diff: 'doom' })).toEqual(none);
    expect(untouchedDims(parseDims(undefined))).toBe(true);
    expect(untouchedDims({ ...parseDims(undefined), gun: true })).toBe(false);
    expect(untouchedDims({ ...parseDims(undefined), diff: 'medium' })).toBe(false);
  });
});
