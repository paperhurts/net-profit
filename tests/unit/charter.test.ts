import { describe, expect, it } from 'vitest';
import {
  allSeen,
  BASE_FARE,
  fare,
  newCharter,
  parseCharter,
  SHIRTS,
  SIGHT_IDS,
  SIGHTS,
  see,
  TIP,
  wishList,
} from '../../src/fishing/charter';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('charters', () => {
  it('bring two or three passengers, each wanting something different to see', () => {
    const counts = new Set<number>();
    for (let i = 1; i < 60; i++) {
      const c = newCharter(seeded(i * 99991));
      counts.add(c.wants.length);
      expect(new Set(c.wants).size).toBe(c.wants.length);
      expect(c.shirts.length).toBe(c.wants.length);
      for (const s of c.shirts) expect(s).toBeLessThan(SHIRTS.length);
      expect(c.seen).toEqual([]);
      expect(c.left).toBe(false);
    }
    expect([...counts].sort()).toEqual([2, 3]);
    expect(SIGHT_IDS).toContain('whales');
    expect(SIGHT_IDS).toContain('cthulu');
  });

  it('pay nothing for a trip that showed them nothing, so a hop out of the dock and back earns nothing', () => {
    const c = newCharter(seeded(5));
    expect(fare(c)).toBe(0);
  });

  it('pay for each wish seen, a tip when every one is, and half after a fright', () => {
    const c = {
      wants: ['whales', 'manta'] as const,
      seen: [],
      shirts: [0, 1],
      scared: false,
      left: true,
    };
    const ch = { ...c, wants: [...c.wants], seen: [...c.seen] } as Parameters<typeof fare>[0];
    // Something they did not want is not counted.
    expect(see(ch, 'turtle')).toBe(false);
    expect(see(ch, 'whales')).toBe(true);
    expect(see(ch, 'whales')).toBe(false);
    expect(fare(ch)).toBe(BASE_FARE + SIGHTS.whales.fare);
    expect(allSeen(ch)).toBe(false);
    see(ch, 'manta');
    expect(allSeen(ch)).toBe(true);
    const full = (BASE_FARE + SIGHTS.whales.fare + SIGHTS.manta.fare) * (1 + TIP);
    expect(fare(ch)).toBe(Math.round(full / 5) * 5);
    ch.scared = true;
    expect(fare(ch)).toBe(Math.round(full / 2 / 5) * 5);
  });

  it('say what the passengers want, in a list', () => {
    const c = parseCharter({ wants: ['whales', 'manta', 'cthulu'] });
    if (!c) throw new Error('no charter');
    expect(wishList(c)).toBe(
      'see the whales, see a manta leap and see the Cthuluviathan asleep, from a safe distance',
    );
  });

  it('keep aboard through a save, and read anything odd as no charter', () => {
    const c = newCharter(seeded(9));
    see(c, c.wants[0] as never);
    c.left = true;
    expect(parseCharter(JSON.parse(JSON.stringify(c)))).toEqual(c);
    expect(parseCharter(null)).toBeNull();
    expect(parseCharter({ wants: ['krakens'] })).toBeNull();
    expect(parseCharter({ wants: ['whales', 'whales'], seen: ['manta'], shirts: [99] })).toEqual({
      wants: ['whales'],
      seen: [],
      shirts: [0],
      scared: false,
      left: false,
    });
  });
});
