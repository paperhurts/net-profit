import { describe, expect, it } from 'vitest';
import {
  CHIME_RANGE,
  chimeLevel,
  DUCK_DEPTH,
  DUCK_TIME,
  duckGain,
  nextChirp,
  nextGullCry,
  padNotes,
  panFor,
  swellPhase,
  waveMix,
} from '../../src/audio/ambience';
import { rng } from '../../src/core/math';

describe('duckGain', () => {
  it('drops by the depth the moment a cue plays and recovers over the duck time', () => {
    expect(duckGain(0)).toBeCloseTo(1 - DUCK_DEPTH);
    expect(duckGain(DUCK_TIME / 2)).toBeCloseTo(1 - DUCK_DEPTH / 2);
    expect(duckGain(DUCK_TIME)).toBe(1);
    expect(duckGain(10)).toBe(1);
  });
});

describe('waveMix', () => {
  it('is fullest out at sea by day and softest in the dock at night', () => {
    const sea = waveMix(0, 0, 0);
    const dockNight = waveMix(0, 1, 1);
    expect(sea.swell).toBe(1);
    expect(dockNight.swell).toBeLessThan(sea.swell * 0.4);
    expect(dockNight.cutoff).toBeLessThan(sea.cutoff);
  });
  it('hisses with speed but not in the dock', () => {
    expect(waveMix(0, 0, 0).hiss).toBe(0);
    expect(waveMix(1, 0, 0).hiss).toBeGreaterThan(waveMix(0.5, 0, 0).hiss);
    expect(waveMix(1, 1, 0).hiss).toBe(0);
  });
  it('keeps a surf going even at rest, a little less in the dock and at night', () => {
    expect(waveMix(0, 0, 0).surf).toBe(1);
    expect(waveMix(0, 1, 0).surf).toBeCloseTo(0.5);
    expect(waveMix(0, 0, 1).surf).toBeCloseTo(0.75);
    expect(waveMix(0, 1, 1).surf).toBeGreaterThan(0.3);
  });
  it('breathes slower and deeper out at sea than at the dock', () => {
    expect(waveMix(0, 0, 0).period).toBeGreaterThan(waveMix(0, 1, 0).period);
    expect(waveMix(0, 0, 0).depth).toBeGreaterThan(waveMix(0, 1, 0).depth);
  });
  it('clamps silly inputs', () => {
    expect(waveMix(5, -1, 2).hiss).toBeCloseTo(0.8);
    expect(waveMix(5, -1, 2).swell).toBeCloseTo(0.6);
  });
});

describe('swellPhase', () => {
  it('cycles once per period between 0 and 1', () => {
    expect(swellPhase(0, 7)).toBeCloseTo(0.5);
    expect(swellPhase(7 / 4, 7)).toBeCloseTo(1);
    expect(swellPhase((3 * 7) / 4, 7)).toBeCloseTo(0);
    expect(swellPhase(7, 7)).toBeCloseTo(0.5);
  });
});

describe('chimeLevel', () => {
  it('fades in over the last stretch to the shore', () => {
    expect(chimeLevel(0)).toBe(1);
    expect(chimeLevel(CHIME_RANGE / 2)).toBeCloseTo(0.5);
    expect(chimeLevel(CHIME_RANGE)).toBe(0);
    expect(chimeLevel(5000)).toBe(0);
  });
});

describe('padNotes', () => {
  it('is rooted on F, warmer at dawn and dusk, thinner at night', () => {
    expect(padNotes('Day')).toHaveLength(3);
    expect(padNotes('Dawn')).toHaveLength(4);
    expect(padNotes('Dusk')).toHaveLength(4);
    expect(padNotes('Night')).toHaveLength(2);
    for (const phase of ['Dawn', 'Day', 'Dusk', 'Night'] as const) {
      const notes = padNotes(phase);
      expect(notes[0]).toBeCloseTo(174.61);
      // Everything stays well under the dolphin whistle's band.
      for (const f of notes) expect(f).toBeLessThan(500);
    }
  });
});

describe('panFor', () => {
  it('leans toward screen x and clamps to the stereo field', () => {
    expect(panFor(0, 0)).toBe(0);
    expect(panFor(200, 0)).toBeCloseTo(0.5);
    expect(panFor(0, 200)).toBeCloseTo(-0.5);
    expect(panFor(9999, 0)).toBe(1);
    expect(panFor(0, 9999)).toBe(-1);
  });
});

describe('timers', () => {
  it('space gull cries five to twelve seconds apart and chirps four to ten', () => {
    const r = rng(3);
    for (let i = 0; i < 200; i++) {
      const g = nextGullCry(r);
      expect(g).toBeGreaterThanOrEqual(5);
      expect(g).toBeLessThan(12);
      const c = nextChirp(r);
      expect(c).toBeGreaterThanOrEqual(4);
      expect(c).toBeLessThan(10);
    }
  });
});
