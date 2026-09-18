import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { SPECIES } from '../../src/data/tuning';
import {
  buyer,
  FISHMONGER_STAGE,
  NO_PICK,
  pickMarket,
  SMOKED,
  SMOKEHOUSE_STAGE,
  salePrice,
  vendorsOpen,
} from '../../src/data/vendors';

describe('vendorsOpen', () => {
  it('opens the fishmonger with the watchtower and the smokehouse with the dome', () => {
    expect(vendorsOpen(0)).toEqual({ fishmonger: false, smokehouse: false });
    expect(vendorsOpen(FISHMONGER_STAGE - 1)).toEqual({ fishmonger: false, smokehouse: false });
    expect(vendorsOpen(FISHMONGER_STAGE)).toEqual({ fishmonger: true, smokehouse: false });
    expect(vendorsOpen(SMOKEHOUSE_STAGE)).toEqual({ fishmonger: true, smokehouse: true });
  });

  it('smokes the oily fish: tuna, goldfin and shark', () => {
    expect(SMOKED.map((i) => SPECIES[i]?.name)).toEqual(['tuna', 'goldfin', 'shark']);
  });
});

describe('salePrice', () => {
  it('is the value plus fifteen percent a stage with nobody else buying', () => {
    expect(salePrice(10, 0, 0, NO_PICK)).toBe(10);
    expect(salePrice(10, 3, 4, NO_PICK)).toBeCloseTo(14.5, 9);
  });

  it('doubles the fishmonger pick once he is open, and only that species', () => {
    expect(salePrice(10, 3, 2, 2)).toBeCloseTo(14.5, 9);
    expect(salePrice(10, 4, 2, 2)).toBeCloseTo(32, 9);
    expect(salePrice(10, 4, 3, 2)).toBeCloseTo(16, 9);
    expect(salePrice(10, 4, 2, NO_PICK)).toBeCloseTo(16, 9);
  });

  it('pays half again for oily fish once the smokehouse is open, stacking with the pick', () => {
    expect(salePrice(10, 4, 4, NO_PICK)).toBeCloseTo(16, 9);
    expect(salePrice(10, 5, 4, NO_PICK)).toBeCloseTo(26.25, 9);
    expect(salePrice(10, 5, 7, NO_PICK)).toBeCloseTo(26.25, 9);
    expect(salePrice(10, 5, 0, NO_PICK)).toBeCloseTo(17.5, 9);
    expect(salePrice(10, 5, 4, 4)).toBeCloseTo(52.5, 9);
  });
});

describe('buyer', () => {
  it('sends the pick to the fishmonger, oily fish to the smokehouse, the rest to the dock', () => {
    expect(buyer(3, 4, 4)).toBe('dock');
    expect(buyer(4, 4, 4)).toBe('fishmonger');
    expect(buyer(4, 4, NO_PICK)).toBe('dock');
    expect(buyer(5, 4, NO_PICK)).toBe('smokehouse');
    expect(buyer(5, 4, 4)).toBe('fishmonger');
    expect(buyer(5, 0, 1)).toBe('dock');
  });
});

describe('pickMarket', () => {
  it('picks within reach, leaning deeper, and never repeats yesterday while it can', () => {
    const r = rng(12);
    let sum = 0;
    for (let i = 0; i < 400; i++) {
      const sp = pickMarket(4, NO_PICK, r);
      expect(sp).toBeGreaterThanOrEqual(0);
      expect(sp).toBeLessThanOrEqual(4);
      sum += sp;
    }
    expect(sum / 400).toBeGreaterThan(2.2);
    for (let i = 0; i < 100; i++) expect(pickMarket(4, 3, r)).not.toBe(3);
    expect(pickMarket(0, 0, r)).toBe(0);
  });
});
