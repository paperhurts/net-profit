import { describe, expect, it } from 'vitest';
import {
  blowMore,
  DISAGREE_BLOWS,
  HEAL,
  holySwordPower,
  lightPower,
  macePower,
  noBlessings,
  noPrayer,
  PRAYER_SPECS,
  PRAYERS,
  pray,
  protectHearts,
  tickBlessings,
} from '../../src/data/paladin';
import { eatPepper, freshFury, tickFury } from '../../src/data/warrior';

describe('the Paladin', () => {
  it('five buttons: holy sword, holy light, healing light, and his two blessings', () => {
    expect(PRAYERS).toEqual(['sword', 'light', 'heal', 'protect', 'disagree']);
  });
  it('his holy sword: 3 at level 1, 8 at 10, every 4 s', () => {
    expect([1, 4, 5, 9, 10, 15, 16].map(holySwordPower)).toEqual([3, 3, 5, 5, 8, 8, 10]);
    expect(PRAYER_SPECS.sword.every).toBe(4);
  });
  it('his mace and holy light do 1 more against the dead', () => {
    expect(macePower(1, false)).toBe(1);
    expect(macePower(1, true)).toBe(2);
    expect(macePower(6, true)).toBe(3);
    expect(lightPower(false)).toBe(1);
    expect(lightPower(true)).toBe(2);
  });
  it('the owner’s healing light: 2, every 20 s', () => {
    expect(HEAL).toBe(2);
    expect(PRAYER_SPECS.heal.every).toBe(20);
  });
  it('Disagreements: his next 3 blows 1 harder, within 8 s', () => {
    const b = noBlessings();
    b.disagree = DISAGREE_BLOWS;
    b.disagreeT = 8;
    expect([blowMore(b), blowMore(b), blowMore(b), blowMore(b)]).toEqual([1, 1, 1, 0]);
    b.disagree = 2;
    tickBlessings(b, 8.1);
    expect(blowMore(b)).toBe(0);
  });
  it('Protection: 2 more hearts while it lasts', () => {
    const b = noBlessings();
    b.protectT = 10;
    expect(protectHearts(b)).toBe(2);
    tickBlessings(b, 10.1);
    expect(protectHearts(b)).toBe(0);
  });
  it('each waits after it is used, and a hot pepper skips the waits', () => {
    const f = freshFury();
    expect(pray(f, 'light')).toBe(true);
    expect(noPrayer(f, 'light')).toBe('wait');
    tickFury(f, 8);
    expect(noPrayer(f, 'light')).toBe(null);
    pray(f, 'heal');
    eatPepper(f);
    expect(pray(f, 'heal')).toBe(true);
    expect(f.cd.heal).toBe(0);
  });
});
