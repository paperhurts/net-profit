import { describe, expect, it } from 'vitest';
import {
  BLURBS,
  boatFor,
  guidePage,
  HABITAT,
  SHARK_SP,
  whenText,
  whereText,
} from '../../src/data/guide';
import {
  DEEP_RINGS,
  FAR_RINGS,
  GROUPER,
  ISLE2_RINGS,
  MAHI,
  MARLIN,
  PARROT,
  RINGS,
  SHARK,
  SPECIES,
} from '../../src/data/tuning';

describe('the field guide', () => {
  it('has a line for every species, and the shark is where the tuning says', () => {
    expect(BLURBS).toHaveLength(SPECIES.length);
    for (const b of BLURBS) expect(b.length).toBeGreaterThan(20);
    expect(SHARK_SP).toBe(SHARK);
  });

  it('places every school where the tuning rings it', () => {
    expect(Object.keys(HABITAT)).toHaveLength(
      // Island 3's two rings are both grouper, so one page; the far deep's one ring is the marlin.
      RINGS.length + DEEP_RINGS.length + ISLE2_RINGS.length + 1 + FAR_RINGS.length,
    );
    expect(HABITAT[MARLIN]).toEqual({ r0: 5600, r1: 5900, deep: true, far: true });
    expect(whereText(MARLIN)).toContain('far deep');
    expect(HABITAT[PARROT]).toEqual({ r0: 400, r1: 460, deep: true, isle2: true });
    expect(HABITAT[GROUPER]).toEqual({ r0: 360, r1: 430, deep: true, isle3: true });
    expect(HABITAT[0]).toEqual({ r0: 560, r1: 700 });
    expect(HABITAT[MAHI]).toEqual({ r0: 2750, r1: 3100, deep: true });
    expect(HABITAT[8]).toEqual({ r0: 950, r1: 1450, night: true });
    expect(HABITAT[7]).toBeUndefined();
  });

  it('names the smallest boat that reaches a ring, by the orders rule', () => {
    expect(boatFor(560)).toBe('dinghy');
    expect(boatFor(1260)).toBe('skiff');
    expect(boatFor(2280)).toBe('trawler');
    expect(boatFor(2850)).toBe('flagship');
  });

  it('tells you where and when to look, caught or not', () => {
    expect(whereText(0)).toBe('Schools 560 to 700 out. Dinghy range.');
    expect(whenText(0)).toBe('By day.');
    expect(whenText(6)).toBe('By day; glows after dark.');
    expect(whenText(8)).toBe('At night. Glows.');
    expect(whereText(7)).toContain('goldfin');
    expect(whenText(10)).toBe('Dawn, for eighty seconds.');
    expect(whereText(11)).toContain('inside your range');
    expect(whereText(MAHI)).toBe('Past the buoys, 2750 to 3100 out. Flagship only.');
    expect(whenText(MAHI)).toBe('By day.');
    expect(whereText(PARROT)).toBe('Round island 2, in the far corner of the deep. Flagship only.');
    expect(whereText(GROUPER)).toBe(
      'Over the drowned shore of island 3, in the north corner of the deep. Flagship only.',
    );
  });

  it('keeps an uncaught species to itself but still points the way', () => {
    const p = guidePage(2, 0, 0);
    expect(p).toEqual({
      name: '?',
      known: false,
      blurb: 'Not caught yet.',
      where: 'Schools 1260 to 1440 out. Skiff range.',
      when: 'By day.',
      worth: '4 coins',
      caught: 'None yet',
    });
  });

  it('fills in a caught species: name, line, count and the day of the first', () => {
    const p = guidePage(2, 1, 3);
    expect(p.name).toBe('Snapper');
    expect(p.known).toBe(true);
    expect(p.blurb).toBe(BLURBS[2]);
    expect(p.caught).toBe('Caught once, first on day 3');
    expect(guidePage(2, 12, 0).caught).toBe('Caught 12 times');
    expect(() => guidePage(99, 1, 1)).toThrow();
  });
});
