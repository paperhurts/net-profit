import { describe, expect, it } from 'vitest';
import { BARGE_MAX, BOSS_FOES, bargeTotal } from '../../src/data/barge';
import {
  BOSS_PAY,
  bossRound,
  DIM_BOSSES,
  DIM_FOES,
  DIM_MAX,
  GUN_COST,
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

describe('New Dimensions, the first piece', () => {
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
  it('a round pays 10, and every 5th brings a boss and pays 100', () => {
    expect(roundPay(1)).toBe(ROUND_PAY);
    expect(ROUND_PAY).toBe(10);
    expect(BOSS_PAY).toBe(100);
    for (let n = 1; n <= 30; n++) {
      const boss = roundBoss(n);
      expect(bossRound(n)).toBe(n % 5 === 0);
      expect(roundPay(n)).toBe(n % 5 === 0 ? 100 : 10);
      const pick = roundPick(n);
      const bosses = BOSS_FOES.reduce((k, f) => k + pick[f], 0);
      expect(bosses).toBe(boss ? 1 : 0);
      if (boss) expect(pick[boss]).toBe(1);
    }
    expect(roundBoss(5)).toBe(DIM_BOSSES[0]);
  });
  it('only brings those come by that round, the newest among them, and none that call up more', () => {
    for (let n = 1; n <= 30; n++) {
      const pick = roundPick(n);
      const open = DIM_FOES.filter(([, from]) => from <= n).map(([k]) => k);
      for (const [k, from] of DIM_FOES) if (from > n) expect(pick[k]).toBe(0);
      expect(pick[open[open.length - 1] ?? 'monkey']).toBeGreaterThan(0);
      for (const k of [
        'blue',
        'green',
        'necro',
        'oldone',
        'tarleader',
        'skrill',
        'spider',
      ] as const)
        expect(pick[k]).toBe(0);
    }
    expect(roundPick(1).monkey).toBe(3);
    // The same every time.
    expect(roundPick(12)).toEqual(roundPick(12));
  });
  it('reads its save block back, odd values as nothing', () => {
    expect(parseDims(undefined)).toEqual({ gun: false, best: 0 });
    expect(parseDims({ gun: true, best: 4.7 })).toEqual({ gun: true, best: 4 });
    expect(parseDims({ gun: 'yes', best: -3 })).toEqual({ gun: false, best: 0 });
    expect(untouchedDims({ gun: false, best: 0 })).toBe(true);
    expect(untouchedDims({ gun: true, best: 0 })).toBe(false);
  });
});

describe('New Dimensions, a round’s mix', () => {
  it('spreads a round over the kinds come by then, not all one kind', () => {
    for (let n = 3; n <= 30; n++) {
      const pick = roundPick(n);
      const kinds = Object.values(pick).filter((v) => v > 0).length;
      expect(kinds).toBeGreaterThanOrEqual(Math.min(3, roundSize(n)));
    }
  });
});
